#!/usr/bin/env python3

"""
Robust Google AI API wrapper with retry logic and better error handling
"""

import time
import random
from google import genai
from google.genai import types
import traceback

class RobustGenAIClient:
    def __init__(self, api_key, max_retries=3, base_delay=1):
        """
        Initialize the robust GenAI client
        
        Args:
            api_key: Your Google AI API key
            max_retries: Maximum number of retry attempts
            base_delay: Base delay between retries (seconds)
        """
        self.client = genai.Client(api_key=api_key)
        self.max_retries = max_retries
        self.base_delay = base_delay
    
    def _exponential_backoff_delay(self, attempt):
        """Calculate delay with exponential backoff and jitter"""
        delay = self.base_delay * (2 ** attempt)
        jitter = random.uniform(0.1, 0.3) * delay
        return delay + jitter
    
    def _is_retryable_error(self, error):
        """Check if an error is worth retrying"""
        error_str = str(error).lower()
        
        # Retryable server errors
        retryable_conditions = [
            '500',  # Internal server error
            '502',  # Bad gateway
            '503',  # Service unavailable  
            '504',  # Gateway timeout
            'internal error',
            'temporarily unavailable',
            'service unavailable',
            'timeout'
        ]
        
        return any(condition in error_str for condition in retryable_conditions)
    
    def generate_content_with_retry(self, model, contents, config=None):
        """
        Generate content with automatic retry logic
        """
        last_error = None
        
        for attempt in range(self.max_retries + 1):
            try:
                print(f"🔄 Attempt {attempt + 1}/{self.max_retries + 1} for content generation...")
                
                response = self.client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config
                )
                
                print(f"✅ Content generation successful on attempt {attempt + 1}")
                return response
                
            except Exception as e:
                last_error = e
                error_msg = str(e)
                
                print(f"❌ Attempt {attempt + 1} failed: {error_msg}")
                
                # Don't retry if it's not a retryable error
                if not self._is_retryable_error(e):
                    print(f"🚫 Error is not retryable, aborting: {error_msg}")
                    break
                
                # Don't delay after the last attempt
                if attempt < self.max_retries:
                    delay = self._exponential_backoff_delay(attempt)
                    print(f"⏳ Waiting {delay:.1f} seconds before retry...")
                    time.sleep(delay)
        
        print(f"💥 All retry attempts failed. Last error: {last_error}")
        raise last_error
    
    def embed_content_with_retry(self, model, contents, config=None):
        """
        Generate embeddings with automatic retry logic
        """
        last_error = None
        
        for attempt in range(self.max_retries + 1):
            try:
                print(f"🔄 Attempt {attempt + 1}/{self.max_retries + 1} for embedding generation...")
                
                response = self.client.models.embed_content(
                    model=model,
                    contents=contents,
                    config=config
                )
                
                print(f"✅ Embedding generation successful on attempt {attempt + 1}")
                return response
                
            except Exception as e:
                last_error = e
                error_msg = str(e)
                
                print(f"❌ Attempt {attempt + 1} failed: {error_msg}")
                
                # Don't retry if it's not a retryable error
                if not self._is_retryable_error(e):
                    print(f"🚫 Error is not retryable, aborting: {error_msg}")
                    break
                
                # Don't delay after the last attempt
                if attempt < self.max_retries:
                    delay = self._exponential_backoff_delay(attempt)
                    print(f"⏳ Waiting {delay:.1f} seconds before retry...")
                    time.sleep(delay)
        
        print(f"💥 All retry attempts failed. Last error: {last_error}")
        raise last_error

# Example usage and test
if __name__ == "__main__":
    print("🧪 Testing Robust GenAI Client...")
    
    # Initialize the robust client
    robust_client = RobustGenAIClient(
        api_key="AIzaSyAoeUzpq0iUI6wmCA8pYaMYCk-tcr6eZv8",
        max_retries=3,
        base_delay=1
    )
    
    try:
        # Test text generation
        print("\n📝 Testing text generation with retry logic...")
        response = robust_client.generate_content_with_retry(
            model="gemini-2.5-flash-preview-05-20",
            contents="Say hello in one sentence.",
            config=types.GenerateContentConfig(max_output_tokens=50)
        )
        print(f"Generated text: {response.text}")
        
        # Test embedding generation
        print("\n🔢 Testing embedding generation with retry logic...")
        embed_response = robust_client.embed_content_with_retry(
            model="text-embedding-004",
            contents=["This is a test sentence"],
            config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
        )
        print(f"Embedding dimensions: {len(embed_response.embeddings[0].values)}")
        
        print("\n🎉 All tests passed with robust client!")
        
    except Exception as e:
        print(f"\n💥 Test failed even with retry logic: {str(e)}")
        traceback.print_exc()
