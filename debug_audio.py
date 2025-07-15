#!/usr/bin/env python3

import base64
import wave
import struct
import sys
from google import genai
from google.genai import types

def debug_audio_data(data, filename="debug_output.wav"):
    """Debug function to analyze the audio data format"""
    
    print(f"Raw data type: {type(data)}")
    print(f"Raw data length: {len(data)} bytes")
    
    # Try to decode if it's base64
    try:
        if isinstance(data, str):
            decoded_data = base64.b64decode(data)
            print(f"Base64 decoded length: {len(decoded_data)} bytes")
            data = decoded_data
        elif hasattr(data, 'decode'):
            decoded_data = base64.b64decode(data)
            print(f"Base64 decoded length: {len(decoded_data)} bytes")
            data = decoded_data
    except Exception as e:
        print(f"Base64 decode failed: {e}")
    
    # Check first few bytes
    if len(data) > 20:
        print(f"First 20 bytes: {data[:20]}")
        print(f"First 20 bytes as hex: {data[:20].hex()}")
    
    # Try different wave file configurations
    configs = [
        {'channels': 1, 'rate': 24000, 'width': 2},  # Current config
        {'channels': 1, 'rate': 22050, 'width': 2},  # Standard
        {'channels': 1, 'rate': 16000, 'width': 2},  # Common TTS
        {'channels': 2, 'rate': 24000, 'width': 2},  # Stereo
        {'channels': 1, 'rate': 24000, 'width': 1},  # 8-bit
        {'channels': 1, 'rate': 48000, 'width': 2},  # High quality
    ]
    
    for i, config in enumerate(configs):
        try:
            test_filename = f"test_{i}_{config['rate']}_{config['channels']}ch_{config['width']}byte.wav"
            
            with wave.open(test_filename, "wb") as wf:
                wf.setnchannels(config['channels'])
                wf.setsampwidth(config['width'])
                wf.setframerate(config['rate'])
                wf.writeframes(data)
            
            print(f"Created test file: {test_filename}")
            
            # Read back and verify
            with wave.open(test_filename, "rb") as wf:
                params = wf.getparams()
                print(f"  Params: {params}")
                
        except Exception as e:
            print(f"Failed config {config}: {e}")

def generate_test_audio():
    """Generate a short test audio to analyze the format"""
    
    client = genai.Client(api_key="AIzaSyAoeUzpq0iUI6wmCA8pYaMYCk-tcr6eZv8")
    
    # Generate a very short test script
    prompt = "This is a short test broadcast between Sarah and John:\nSarah: Hello, this is a test.\nJohn: Yes, this is just a quick audio test."

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

    data = response.candidates[0].content.parts[0].inline_data.data
    debug_audio_data(data)

if __name__ == "__main__":
    generate_test_audio()
