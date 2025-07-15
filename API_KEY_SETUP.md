# Briefly AI - API Key Setup

## Overview

Briefly AI now requires a Gemini API key for generating personalized news briefings. This ensures your API usage is secure and only accessible to you.

## Getting Your API Key

1. **Get a free Gemini API key**: Visit [Google AI Studio](https://ai.google.dev/tutorials/setup)
2. **Create a new project** or use an existing one
3. **Generate an API key** from the API section
4. **Copy your API key** (it should start with `AIza`)

## Using Your API Key

### In the Web Interface

1. Open the Briefly AI website
2. Select your topics and proceed to the headlines section
3. In the **Briefing Configuration** section, enter your API key
4. The interface will validate your key format automatically
5. Generate your briefing as usual

### Security Features

- ✅ **Local Storage Only**: Your API key is stored locally in your browser
- ✅ **Never Saved on Servers**: We never store your API key on our servers
- ✅ **Secure Transmission**: API key is sent securely with each request
- ✅ **Format Validation**: Automatic validation of API key format
- ✅ **Clear Error Messages**: Helpful messages if your key is invalid

### API Key Format

- Valid Gemini API keys start with `AIza`
- They are typically 39 characters long
- Example format: `AIzaSyABCDEFGH1234567890ABCDEFGHIJK`

## Troubleshooting

### "API key is required" Error
- Make sure you've entered your API key in the configuration section
- Check that the key format is correct (starts with `AIza`)

### "Invalid API key format" Error
- Verify you copied the complete API key
- Make sure there are no extra spaces or characters

### "API key validation failed" Error
- Your API key may be invalid or expired
- Generate a new API key from Google AI Studio

### "Request failed" Errors
- Check your internet connection
- Verify your API key has sufficient quota
- Try again in a few minutes

## Development Mode

For developers, you can enable developer mode to use cached headlines:
- Add `?dev=true` to the URL
- Or run `yourBrieflyApp.toggleDeveloperMode()` in the browser console

## Support

If you continue to have issues:
1. Verify your API key works with Google AI Studio directly
2. Check the browser console for detailed error messages
3. Ensure the Flask server is running on port 5001

## Privacy & Security

- Your API key never leaves your device except for secure API calls to Gemini
- We recommend keeping your API key private and not sharing it
- The API key is only used for generating content and embeddings
- No user data or API keys are logged or stored on our servers
