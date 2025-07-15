# Gunicorn configuration
bind = "127.0.0.1:5001"
workers = 1
timeout = 1500  # 25 minutes
keepalive = 300  # 5 minutes
max_requests = 1000
max_requests_jitter = 100
preload_app = True

# Logging configuration for real-time output
loglevel = 'info'
accesslog = '-'  # Log to stdout
errorlog = '-'   # Log to stderr
capture_output = True
enable_stdio_inheritance = True