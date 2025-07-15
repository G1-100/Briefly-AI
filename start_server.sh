#!/bin/bash
# Start the Briefly AI server with gunicorn

# Add Python bin to PATH
export PATH="$HOME/Library/Python/3.9/bin:$PATH"

# Change to the project directory
cd "/Users/genami133/Projects/Briefly AI/Website"

# Start gunicorn with configuration
echo "Starting Briefly AI server with extended timeout (25 minutes) on port 5001..."
echo "Real-time Python script output will be displayed below:"
echo "======================================================="
gunicorn -c gunicorn.conf.py api_server:app
