from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import subprocess
import os
import sys
import threading
import time
import queue

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'service': 'Briefly AI API Server'}), 200

@app.route('/api/fetch-articles', methods=['POST'])
def fetch_articles():
    try:
        data = request.json
        topics = data.get('topics', [])
        api_key = data.get('api_key', '')
        
            
        if not api_key:
            return jsonify({'error': 'API key is required'}), 400
        
        print(f"Received topics: {topics}", flush=True)
        print("API key provided (hidden for security)", flush=True)
        
        # Execute the Python script with topics and API key
        cmd = ['python3', '-u', 'find-articles.py', '--api-key', api_key] + topics  # -u for unbuffered output
        
        print(f"Executing command: {' '.join(cmd)}", flush=True)
        print("Starting script execution - this may take up to 25 minutes...", flush=True)
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,  # Line buffered
            universal_newlines=True,
            cwd=os.path.dirname(os.path.abspath(__file__)),
            env={**os.environ, 'PYTHONUNBUFFERED': '1'}  # Force unbuffered output
        )
        
        # Queue to collect output lines
        output_queue = queue.Queue()
        output_lines = []
        
        def read_stdout():
            """Read stdout in a separate thread"""
            try:
                for line in iter(process.stdout.readline, ''):
                    if line:
                        line = line.strip()
                        print(f"[SCRIPT] {line}", flush=True)
                        output_queue.put(('stdout', line))
            except Exception as e:
                print(f"Error reading stdout: {e}", flush=True)
            finally:
                process.stdout.close()
        
        def read_stderr():
            """Read stderr in a separate thread"""
            try:
                for line in iter(process.stderr.readline, ''):
                    if line:
                        line = line.strip()
                        print(f"[SCRIPT-ERR] {line}", flush=True)
                        output_queue.put(('stderr', line))
            except Exception as e:
                print(f"Error reading stderr: {e}", flush=True)
            finally:
                process.stderr.close()
        
        # Start threads to read output
        stdout_thread = threading.Thread(target=read_stdout)
        stderr_thread = threading.Thread(target=read_stderr)
        stdout_thread.daemon = True
        stderr_thread.daemon = True
        stdout_thread.start()
        stderr_thread.start()
        
        start_time = time.time()
        
        try:
            # Wait for process to complete or timeout
            while process.poll() is None:
                # Collect any queued output
                try:
                    while True:
                        stream_type, line = output_queue.get_nowait()
                        output_lines.append(line)
                except queue.Empty:
                    pass
                
                # Check for timeout (25 minutes = 1500 seconds)
                if time.time() - start_time > 1500:
                    print("Script execution timed out after 25 minutes", flush=True)
                    process.kill()
                    process.wait()
                    return jsonify({
                        'error': 'Script execution timed out after 25 minutes. The article fetching process is taking longer than expected.',
                        'timeout': 1500
                    }), 504
                
                time.sleep(0.1)  # Small delay to prevent busy waiting
            
            # Wait for threads to finish reading remaining output
            stdout_thread.join(timeout=5)
            stderr_thread.join(timeout=5)
            
            # Collect any remaining output from queue
            try:
                while True:
                    stream_type, line = output_queue.get_nowait()
                    output_lines.append(line)
            except queue.Empty:
                pass
            
            return_code = process.returncode
            
        except Exception as e:
            print(f"Error during script execution: {str(e)}", flush=True)
            if process.poll() is None:
                process.kill()
                process.wait()
            raise e
        
        full_output = '\n'.join(output_lines)
        print(f"Script completed with return code: {return_code}", flush=True)
        
        if return_code != 0:
            return jsonify({
                'error': f'Script failed with return code {return_code}',
                'output': full_output
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Articles fetched successfully',
            'output': full_output
        })
        
    except Exception as e:
        print(f"Unexpected error: {str(e)}", flush=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-broadcast', methods=['POST'])
def generate_broadcast():
    try:
        data = request.json
        urls = data.get('urls', [])
        api_key = data.get('api_key', '')
        duration = data.get('duration', 5)  # Default duration is 5 minutes
        
        if not urls:
            return jsonify({'error': 'No URLs provided'}), 400
            
        if not api_key:
            return jsonify({'error': 'API key is required'}), 400
        
        print(f"Received URLs for broadcast generation: {urls}", flush=True)
        print("API key provided (hidden for security)", flush=True)
        
        # Execute the generateBroadcast.py script with URLs and API key as arguments
        cmd = ['python3', '-u', 'generateBroadcast.py', '--api-key', api_key, '--duration', str(duration)] + urls
        
        print(f"Executing command: {' '.join(cmd)}", flush=True)
        print("Starting broadcast generation...", flush=True)
        
        # Run the script
        import subprocess
        import threading
        import time
        import queue
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,  # Line buffered
            universal_newlines=True,
            cwd=os.path.dirname(os.path.abspath(__file__)),
            env={**os.environ, 'PYTHONUNBUFFERED': '1'}  # Force unbuffered output
        )
        
        # Queue to collect output lines
        output_queue = queue.Queue()
        output_lines = []
        
        def read_stdout():
            """Read stdout in a separate thread"""
            try:
                for line in iter(process.stdout.readline, ''):
                    if line:
                        line = line.strip()
                        print(f"[BROADCAST] {line}", flush=True)
                        output_queue.put(('stdout', line))
            except Exception as e:
                print(f"Error reading stdout: {e}", flush=True)
            finally:
                process.stdout.close()
        
        def read_stderr():
            """Read stderr in a separate thread"""
            try:
                for line in iter(process.stderr.readline, ''):
                    if line:
                        line = line.strip()
                        print(f"[BROADCAST-ERR] {line}", flush=True)
                        output_queue.put(('stderr', line))
            except Exception as e:
                print(f"Error reading stderr: {e}", flush=True)
            finally:
                process.stderr.close()
        
        # Start threads to read output
        stdout_thread = threading.Thread(target=read_stdout)
        stderr_thread = threading.Thread(target=read_stderr)
        stdout_thread.daemon = True
        stderr_thread.daemon = True
        stdout_thread.start()
        stderr_thread.start()
        
        start_time = time.time()
        
        try:
            # Wait for process to complete with timeout (10 minutes for broadcast generation)
            while process.poll() is None:
                # Collect any queued output
                try:
                    while True:
                        stream_type, line = output_queue.get_nowait()
                        output_lines.append(line)
                except queue.Empty:
                    pass
                
                # Check for timeout (10 minutes = 600 seconds)
                if time.time() - start_time > 600:
                    print("Broadcast generation timed out after 10 minutes", flush=True)
                    process.kill()
                    process.wait()
                    return jsonify({
                        'error': 'Broadcast generation timed out after 10 minutes.',
                        'timeout': 600
                    }), 504
                
                time.sleep(0.1)  # Small delay to prevent busy waiting
            
            # Wait for threads to finish reading remaining output
            stdout_thread.join(timeout=5)
            stderr_thread.join(timeout=5)
            
            # Collect any remaining output from queue
            try:
                while True:
                    stream_type, line = output_queue.get_nowait()
                    output_lines.append(line)
            except queue.Empty:
                pass
            
            return_code = process.returncode
            
        except Exception as e:
            print(f"Error during broadcast generation: {str(e)}", flush=True)
            # Kill the process if it's still running
            if process.poll() is None:
                process.kill()
                process.wait()
            raise e
        
        full_output = '\n'.join(output_lines)
        print(f"Broadcast generation completed with return code: {return_code}", flush=True)
        
        if return_code != 0:
            return jsonify({
                'error': f'Broadcast generation failed with return code {return_code}',
                'output': full_output
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Broadcast generated successfully',
            'output': full_output
        })
        
    except Exception as e:
        print(f"Unexpected error in broadcast generation: {str(e)}", flush=True)
        return jsonify({'error': str(e)}), 500

@app.route('/articles.csv')
def serve_csv():
    try:
        csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'articles.csv')
        if os.path.exists(csv_path):
            return send_file(csv_path, mimetype='text/csv')
        else:
            return jsonify({'error': 'CSV file not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/Broadcast.wav')
def serve_broadcast():
    try:
        wav_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Broadcast.wav')
        if os.path.exists(wav_path):
            return send_file(wav_path, mimetype='audio/wav')
        else:
            return jsonify({'error': 'Broadcast file not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)