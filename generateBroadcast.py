from google import genai
from google.genai import types
import pandas as pd
import wave
import sys
import base64
import time
import math
import random
import argparse

def split_script(script, duration=5):
    parts = []
    partsCount = max(1, int(math.ceil(duration / 5)))
    script_lines = script.split("\n")
    linesAmount = int(math.ceil(len(script_lines) / partsCount))
    shiftLines = False
    for i in range(partsCount):

        if i == partsCount - 1:
            # Last part gets all remaining lines
            start = i * linesAmount
            end = len(script_lines)
            if (shiftLines):
                # If the last part was shifted, we need to adjust the beginning
                start -= 1
                shiftLines = False
            part = script_lines[start:end]
        else:
            start = i * linesAmount
            if (shiftLines):
                # If the last part was shifted, we need to adjust the beginning
                start -= 1
                shiftLines = False
            end = (i + 1) * linesAmount
            part = script_lines[start:end]
        if end - 1 < len(script_lines) and "Sarah:" in script_lines[end - 1]:
            shiftLines = True
            end -= 1
            part = script_lines[start:end]


        parts.append("\n".join(part))
    return parts

def wave_file(filename, pcm, channels=1, rate=24000, sample_width=2):
   with wave.open(filename, "wb") as wf:
      wf.setnchannels(channels)
      wf.setsampwidth(sample_width)
      wf.setframerate(rate)
      wf.writeframes(pcm)

def retry_with_backoff(func, max_retries=3, base_delay=1):
    """Execute a function with exponential backoff retry logic"""
    for attempt in range(max_retries + 1):
        try:
            return func()
        except Exception as e:
            error_str = str(e).lower()
            
            # Check if it's a retryable error
            retryable_conditions = ['500', '502', '503', '504', 'internal error', 'timeout']
            is_retryable = any(condition in error_str for condition in retryable_conditions)
            
            if not is_retryable or attempt == max_retries:
                raise e
            
            # Calculate delay with exponential backoff and jitter
            delay = base_delay * (2 ** attempt) + random.uniform(0.1, 0.3)
            print(f"⚠️ Attempt {attempt + 1} failed with retryable error: {str(e)}")
            print(f"⏳ Retrying in {delay:.1f} seconds...")
            time.sleep(delay)
    
    raise Exception("All retry attempts failed")

def generate_broadcast(urls, api_key, duration=5):
    try:
        # Initialize the GenAI client with the provided API key
        client = genai.Client(api_key=api_key)
        words = 145 * duration  # Average 145 words per minute
        input_string = f"Generate an around-{words} word script between anchors Sarah and John about various topics. Base the script on the following articles, quickly going through each news and transitioning smoothly. Note that the content was retreived through web scraping, so extraneous metadata may also be there. ONLY output the verbal script, nothing else. Don't use special characters like **. First line starts with Sarah. Make sure to cite the source for each article. The articles are below:"

        print("Loading articles from CSV...")
        df = pd.read_csv("articles.csv")
        print(f"Loaded {len(df)} total articles from CSV")

        print("Filtering articles based on provided URLs...")
        original_count = len(df)
        df = df[df['url'].isin(urls)].reset_index(drop=True)
        print(f"Found {len(df)} matching articles out of {original_count} total articles")
        
        if len(df) == 0:
            print("Warning: No articles found matching the provided URLs")
            print("Provided URLs:")
            for url in urls:
                print(f"  - {url}")
            print("Available URLs in CSV:")
            available_urls = pd.read_csv("articles.csv")['url'].tolist()
            for url in available_urls[:10]:  # Show first 10
                print(f"  - {url}")
            if len(available_urls) > 10:
                print(f"  ... and {len(available_urls) - 10} more")
            return
        
        for i in range(len(df)):
            input_string += "\nHeadline: " + df.iloc[i]["title"]
            input_string += "\nContent: " + df.iloc[i]["text"]

        print("Generating script content...")

        def generate_script():
            return client.models.generate_content(
                model="gemini-2.5-flash-preview-05-20", 
                contents=input_string, 
                config=types.GenerateContentConfig(max_output_tokens=10000)
        )

        response = retry_with_backoff(generate_script, max_retries=3)

        if not response.text:
            print("Error: No script content generated")
            return

        print("Script generated successfully, splitting into parts...")
        script_parts = split_script(response.text, duration)
        print(f"Script split into {len(script_parts)} parts for {duration}-minute broadcast")
        if len(script_parts) == 0:
            print("Error: No script parts generated")
            return 
        

        #prompt = "This is a news broadcast between Sarah and John:\n" + response.text

        print("Generating audio content...")

        def generate_audio():

            audio_datas = []
            
            for i, part in enumerate(script_parts):
                print(f"Part {i + 1}/{len(script_parts)}: {part[:50]}...")
                prompt = "This is a news broadcast between Sarah and John:\n" + part
                
                response = client.models.generate_content(
                    model="gemini-2.5-flash-preview-tts",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=types.SpeechConfig(
                            multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                                speaker_voice_configs=[
                                    types.SpeakerVoiceConfig(
                                        speaker='John',
                                        voice_config=types.VoiceConfig(
                                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                                voice_name='Kore',
                                            )
                                        )
                                    ),
                                    types.SpeakerVoiceConfig(
                                        speaker='Sarah',
                                        voice_config=types.VoiceConfig(
                                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                                voice_name='Puck',
                                            )
                                        )
                                    ),
                                ]
                            )
                        )
                    )
                )
                audio_datas.append(response.candidates[0].content.parts[0].inline_data.data)
            return audio_datas


        audio_datas = retry_with_backoff(generate_audio, max_retries=3)

        if not audio_datas or not any(audio_datas):
            print("Error: No audio content generated")
            return

        pcm_parts = []

        for i, data in enumerate(audio_datas):
            print(f"Processing audio part {i + 1}/{len(audio_datas)}")
            
            if isinstance(data, str):
                pcm = base64.b64decode(data)
            elif isinstance(data, bytes):
                try:
                    # Try to decode as base64 first
                    pcm = base64.b64decode(data)
                except:
                    # If that fails, assume it's already raw audio data
                    pcm = data
            else:
                pcm = data
            
            pcm_parts.append(pcm)
        
        full_audio_data = b''.join(pcm_parts)


        print("Writing audio to file...")

        wave_file('Broadcast.wav', full_audio_data)
        print(f"Audio file saved as Broadcast.wav ({len(full_audio_data)} bytes)")

    except Exception as e:
        print(f"Error in generate_broadcast: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Generate broadcast from article URLs')
    parser.add_argument('--api-key', required=True, help='Gemini API key')
    parser.add_argument('--duration', type=int, default=5, help='Duration of the broadcast script (default: 5 minutes)')

    parser.add_argument('urls', nargs='*', help='URLs of articles to include in broadcast')
    
    args = parser.parse_args()
    
    api_key = args.api_key
    urls = args.urls
    duration = args.duration
    
    print("API key provided (hidden for security)")
    print(f"Processing {len(urls)} URLs...")
    
    try:
        if not urls:
            print("Error: No URLs provided")
            print("Usage: python generateBroadcast.py --api-key <key> <url1> <url2> ...")
            sys.exit(1)
            
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        sys.exit(1)

    print(f"\nStarting broadcast generation with {len(urls)} articles...")
    generate_broadcast(urls, api_key, duration)
    print("Broadcast generation completed successfully!")