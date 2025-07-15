#pip install requests beautifulsoup4 newspaper3k lxml_html_clean googlenewsdecoder gnews selenium==4.15.2 google
from IPython import get_ipython
from IPython.display import display
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from googlenewsdecoder import gnewsdecoder
import sys
import argparse

from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import requests
from newspaper import Article
import re
from gnews import GNews
import pandas as pd
from google import genai
from google.genai import types
import time
import random

def retry_api_call(func, max_retries=3, base_delay=1):
    """Execute an API call with exponential backoff retry logic"""
    for attempt in range(max_retries + 1):
        try:
            return func()
        except Exception as e:
            error_str = str(e).lower()
            
            # Check if it's a retryable error
            retryable_conditions = ['500', '502', '503', '504', 'internal error', 'timeout']
            is_retryable = any(condition in error_str for condition in retryable_conditions)
            
            if not is_retryable or attempt == max_retries:
                print(f"API call failed after {attempt + 1} attempts: {str(e)}")
                raise e
            
            # Calculate delay with exponential backoff and jitter
            delay = base_delay * (2 ** attempt) + random.uniform(0.1, 0.3)
            print(f"⚠️ API attempt {attempt + 1} failed: {str(e)}")
            print(f"⏳ Retrying in {delay:.1f} seconds...")
            time.sleep(delay)
    
    raise Exception("All API retry attempts failed")

def set_up_selenium():
  chrome_options = Options()
  chrome_options.add_argument("--blink-settings=imagesEnabled=false") # disable images
  # chrome_options.experimental_options["prefs"] = {
  #   "profile.managed_default_content_settings.javascript": 2 # disable javascript
  # }
  chrome_options.add_argument("--headless")  # Run Chrome in headless mode
  chrome_options.add_argument("--no-sandbox")
  chrome_options.add_argument("--disable-dev-shm-usage")
  chrome_options.add_argument(f'user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36') # Set User-Agent

  driver = webdriver.Chrome(options=chrome_options) # Assuming chromedriver is in PATH
  return driver

def decode_google_rss_url(url):
    interval_time = 1  # interval is optional, default is None

    source_url = url

    try:
        decoded_url = gnewsdecoder(source_url, interval=interval_time)

        if decoded_url.get("status"):
            #print("Decoded URL:", decoded_url["decoded_url"])
            return decoded_url["decoded_url"]
        else:
            print("Error:", decoded_url["message"])
    except Exception as e:
        print(f"Error occurred: {e}")

def extract_text(driver, url):

    try:
        driver.get(url)

        # Get the page source after potential dynamic loading
        page_source = driver.page_source

        # Parse the page source with BeautifulSoup
        soup = BeautifulSoup(page_source, 'html.parser')
        paragraphs = soup.find_all('p')

        article_text = ""
        for p in paragraphs:
            article_text += p.get_text(strip=True) + "\n" # Add a newline between paragraphs

        return article_text.strip() # Remove leading/trailing whitespace

    except Exception as e:
        print(f"Error fetching the URL with Selenium: {e}")
        return []


def extract_article_text_method1(url):
    """
    Extract article text using newspaper3k library (recommended for articles)
    """
    try:
        article = Article(url)
        article.download()
        article.parse()

        # return {
        #     'title': article.title,
        #     'text': article.text,
        #     'authors': article.authors,
        #     'publish_date': article.publish_date,
        #     'summary': article.summary if hasattr(article, 'summary') else None
        # }
        return article.text
    except Exception as e:
        print(f"Error with newspaper method: {e}")
        return None

def extract_article_text(driver, url, method='newspaper'):
    """
    Main function to extract article text with fallback methods
    """
    if method == 'newspaper':
        result = extract_article_text_method1(url)
        if result:
            return result
        print("Newspaper method failed...")
        #return extract_text(driver, url)
        return None
    else:
        #return extract_text(driver, url)
        return None

def mmr_filter(embeddings, query_embedding, k, lambda_param=0.5):
    """
    Filters items using Maximal Marginal Relevance (MMR).

    Args:
        embeddings: A list or array of embeddings for the items.
        query_embedding: The embedding for the query.
        k: The number of items to select.
        lambda_param: The balance parameter between relevance and diversity (0 to 1).
                      Higher values favor relevance, lower values favor diversity.

    Returns:
        A list of indices of the selected items.
    """
    selected_indices = []
    remaining_indices = list(range(len(embeddings)))

    # Calculate initial relevance scores
    relevance_scores = cosine_similarity([query_embedding], embeddings)[0]

    for _ in range(k):
        if not remaining_indices:
            break

        mmr_scores = []
        for i in remaining_indices:
            # Calculate diversity score (similarity to already selected items)
            diversity_score = 0
            if selected_indices:
                diversity_score = max(cosine_similarity([embeddings[i]], [embeddings[j] for j in selected_indices])[0])

            # Calculate MMR score
            mmr_score = lambda_param * relevance_scores[i] - (1 - lambda_param) * diversity_score
            mmr_scores.append((mmr_score, i))

        # Select the item with the highest MMR score
        best_item_index = max(mmr_scores, key=lambda x: x[0])[1]

        selected_indices.append(best_item_index)
        remaining_indices.remove(best_item_index)

    return selected_indices


driver = set_up_selenium()

def findArticles(topic):
  google_news = GNews(language='en',
      country='US',
      period='3d',
                      )
  json_resp = google_news.get_news(topic)
  df = pd.DataFrame(json_resp)

  for i in range(len(df)):
    df.loc[i, "url"] = decode_google_rss_url(df.loc[i, "url"])

  print("done decoding urls")

  article_texts = []
  for i in range(len(df)):
    article_texts.append(extract_article_text(driver, df.loc[i, "url"]))
    #print(f"Extracted content from: {df.loc[i, 'url']}")
  df["text"] = article_texts
    
  print("done extracting article text")

  df.dropna(subset=['text'], inplace=True)
  df.reset_index(level=None, drop=True, inplace=True, allow_duplicates=False)


  client = genai.Client(api_key=api_key)
  
  def generate_embeddings():
      return client.models.embed_content(
          model="text-embedding-004",
          contents=df["title"].tolist(),
          config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
      )
  
  result = retry_api_call(generate_embeddings, max_retries=3)
  embeddings = [embed.values for embed in result.embeddings]
  df["Embedding"] = embeddings

  print("done making title embeddings")



  all_embeddings = df['Embedding'].tolist()

  k = 15

  lambda_param = 0.3

  predefined_topics = ['technology', 'business', 'science', 'health', 'politics', 'sports']

  if topic.lower() not in predefined_topics:
      # For custom topics, use a more flexible search approach
      search_query = f"{topic} news OR  {topic} latest OR {topic} update OR {topic} breaking"
  else:
      #use existing logic for predefined topics
      search_query = topic

  def generate_query_embedding():
      return client.models.embed_content(
          model="text-embedding-004",
          contents=search_query,
          config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
      )

  query_response = retry_api_call(generate_query_embedding, max_retries=3)
  query_embedding = query_response.embeddings[0].values

  # Get the indices of the top k titles using MMR
  mmr_selected_indices = mmr_filter(all_embeddings, query_embedding, k, lambda_param)


  # You can then create a new DataFrame with the selected titles
  mmr_filtered_df = df.loc[mmr_selected_indices]
  df = mmr_filtered_df
  df.reset_index(level=None, drop=True, inplace=True, allow_duplicates=False)

  print("done filtering titles with MMR")

  input_string = "Given the following article/blog headlines, find the most interesting stories/news. Don't use ones that obviously aren't even close to news/blogs/stories. ONLY output the line numbers (starting from 1) of the best 5. DON'T use special characters like * unless they are in the headline." + "\n\n"

  for i in range(len(mmr_filtered_df)):
    input_string += '\nHeadline: "' + mmr_filtered_df.iloc[i]["title"] + '"'
    input_string += "\n"

  def generate_content_filter():
      return client.models.generate_content(
          model="gemini-2.5-flash-preview-05-20", 
          contents=input_string
      )

  response = retry_api_call(generate_content_filter, max_retries=3)

  good_titles = response.text.split("\n")
  good_titles = [int(s) - 1 for s in good_titles]
  filtered_df = df.loc[good_titles]
  df = filtered_df
  df.reset_index(level=None, drop=True, inplace=True, allow_duplicates=False)

  print("done filtering titles with Gemini")

  return df

# Initialize selenium driver
print("Script Started")
driver = set_up_selenium()


try:
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Find articles for specified topics')
    parser.add_argument('--api-key', required=True, help='Gemini API key')
    parser.add_argument('topics', nargs='*', help='Topics to search for')
    
    args = parser.parse_args()
    
    api_key = args.api_key
    topics = args.topics if args.topics else ["Technology", "Business", "Science"]
    
    print(f"Using topics: {topics}")
    print("API key provided (hidden for security)")
    
    # Process each topic
    total_df = pd.DataFrame()
    
    for topic in topics:
        print(f"Processing topic: {topic}")
        try:
            # Call your findArticles function
            df = findArticles(topic)
            
            if df is not None and not df.empty:
                # Add topic column to identify which topic each article belongs to
                df['topic'] = topic
                
                # Concatenate to the total DataFrame
                total_df = pd.concat([total_df, df], ignore_index=True)
                
                print(f"Found {len(df)} articles for topic: {topic}")
            else:
                print(f"No articles found for topic: {topic}")
                
        except Exception as e:
            print(f"Error processing topic '{topic}': {str(e)}")
            continue
    
    # Save results to CSV
    if not total_df.empty:
        # Ensure we have the required columns
        required_columns = ['title', 'url', 'publisher', 'published date', 'text', 'topic']
        
        # Add missing columns if they don't exist
        for col in required_columns:
            if col not in total_df.columns:
                total_df[col] = ''
        
        # Save to CSV
        total_df.to_csv("articles.csv", index=False)
        print(f"Successfully saved {len(total_df)} articles to articles.csv")
        
            
    else:
        print("No articles found for any topic")
        # Create an empty CSV with the required columns
        empty_df = pd.DataFrame(columns=['title', 'url', 'publisher', 'published date', 'text', 'topic'])
        empty_df.to_csv("articles.csv", index=False)
        print("Created empty articles.csv file")
        
except Exception as e:
    print(f"Fatal error: {str(e)}")
    # Create an empty CSV in case of error
    empty_df = pd.DataFrame(columns=['title', 'url', 'publisher', 'published date', 'text', 'topic'])
    empty_df.to_csv("articles.csv", index=False)
    sys.exit(1)
    
finally:
    # Clean up: close the selenium driver
    if 'driver' in locals():
        driver.quit()
        print("Selenium driver closed")