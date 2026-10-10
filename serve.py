"""
Simple local development web server for Chemsha Bongo.
Starts a local HTTP server and automatically opens your default web browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

HOST = "127.0.0.1"
PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable caching-free local development
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"==================================================")
    print(f"🧠 Chemsha Bongo Game Server running on {HOST}:{PORT}")
    print(f"👉 Opening http://{HOST}:{PORT} in your browser...")
    print(f"Press Ctrl+C to stop the server.")
    print(f"==================================================")
    
    webbrowser.open(f"http://{HOST}:{PORT}")
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Goodbye!")
            sys.exit(0)

if __name__ == '__main__':
    main()
