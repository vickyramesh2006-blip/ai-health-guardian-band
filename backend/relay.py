import http.server
import json
import os
import requests
from urllib.parse import urlparse

# Try to use python-dotenv, fallback to manual loader if missing
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded environment via python-dotenv")
except ImportError:
    # Manual fallback for zero-dependency environments
    def load_env():
        env_path = os.path.join(os.path.dirname(__file__), '.env')
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.split('=', 1)
                            key, value = key.strip(), value.strip().strip('"').strip("'")
                            os.environ[key] = value
    load_env()
    print("⚠️  python-dotenv not found, using manual fallback loader")

class TwilioRelayHandler(http.server.BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        # Enable CORS for the dashboard
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        if self.path == '/health':
            self._set_headers()
            self.wfile.write(json.dumps({'status': 'ok', 'relay': 'python'}).encode())
        else:
            self._set_headers(404)

    def do_POST(self):
        if self.path == '/send-sms':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            to_number = data.get('to')
            message = data.get('message')

            if not to_number or not message:
                self._set_headers(400)
                self.wfile.write(json.dumps({'success': False, 'message': 'Missing fields'}).encode())
                return

            # Twilio API Call
            account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
            auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
            from_number = os.environ.get('TWILIO_PHONE_NUMBER')

            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            
            payload = {
                'To': to_number,
                'From': from_number,
                'Body': message
            }

            try:
                response = requests.post(url, data=payload, auth=(account_sid, auth_token))
                res_data = response.json()

                if response.status_code == 201:
                    self._set_headers(200)
                    self.wfile.write(json.dumps({'success': True, 'sid': res_data.get('sid')}).encode())
                else:
                    self._set_headers(response.status_code)
                    self.wfile.write(json.dumps({'success': False, 'message': res_data.get('message')}).encode())

            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({'success': False, 'message': str(e)}).encode())
        else:
            self._set_headers(404)

def run():
    port = int(os.environ.get('PORT', 5001))
    server_address = ('', port)
    httpd = http.server.HTTPServer(server_address, TwilioRelayHandler)
    print(f"🚀 Python SMS Relay running at http://localhost:{port}")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
