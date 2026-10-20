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

import json
import random
import hashlib
from datetime import date

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable caching-free local development
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/api/v1/quotes/random'):
            try:
                import inspirational_quotes
                q = inspirational_quotes.quote()
                quote_text = q.get("quote", "The only people who never fail are those who never try.")
                author_text = q.get("author", "Ilka Chase")
            except Exception:
                quote_text = "The only people who never fail are those who never try."
                author_text = "Ilka Chase"

            body = json.dumps({
                "quote": quote_text,
                "author": author_text,
                "primary_text": f"“{quote_text}”",
                "secondary_text": None,
                "category": "COGNITIVE ANCHOR • RESILIENCE & GROWTH",
                "collection": "Inspirational Quotes Library",
                "aphorism_number": f"#{random.randint(1, 326)}"
            }).encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store, must-revalidate')
            super().end_headers()
            self.wfile.write(body)
            return

        elif self.path.startswith('/api/v1/quotes/daily'):
            today_str = date.today().isoformat()
            try:
                import inspirational_quotes
                q = inspirational_quotes.quote()
                quote_text = q.get("quote", "The only people who never fail are those who never try.")
                author_text = q.get("author", "Ilka Chase")
            except Exception:
                quote_text = "The only people who never fail are those who never try."
                author_text = "Ilka Chase"

            body = json.dumps({
                "quote": quote_text,
                "author": author_text,
                "primary_text": f"“{quote_text}”",
                "secondary_text": None,
                "category": "COGNITIVE ANCHOR • RESILIENCE & GROWTH",
                "collection": "Inspirational Quotes Library",
                "aphorism_number": "#1",
                "date": today_str
            }).encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store, must-revalidate')
            super().end_headers()
            self.wfile.write(body)
            return

        super().do_GET()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"==================================================")
    print(f"🧠 Chemsha Bongo Game Server running on {HOST}:{PORT}")
    print(f"👉 Opening http://{HOST}:{PORT} in your browser...")
    print(f"Press Ctrl+C to stop the server.")
    print(f"==================================================")
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
        webbrowser.open(f"http://{HOST}:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Goodbye!")
            sys.exit(0)

if __name__ == '__main__':
    main()
