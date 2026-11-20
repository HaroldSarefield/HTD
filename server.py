#!/usr/bin/env python3
"""HTD local server (free — standard library only).

Serves the site and adds one helper endpoint, /api/ics?url=..., that fetches a
calendar feed (Canvas, Outlook, Jobber) on the page's behalf. Browsers block
pages from reading other sites' calendar feeds directly.

Run:  python3 server.py   then open http://localhost:8765
"""
import http.server
import os
import socketserver
import urllib.parse
import urllib.request

PORT = int(os.environ.get("PORT", "8765"))
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path):
        p = urllib.parse.urlparse(path).path
        if p.startswith("/.env") or p.startswith("/.venv"):
            return os.path.join(ROOT, "__nope__")
        return super().translate_path(path)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/ics":
            return self.proxy_ics(parsed)
        return super().do_GET()

    def proxy_ics(self, parsed):
        qs = urllib.parse.parse_qs(parsed.query)
        url = (qs.get("url") or [""])[0].strip()
        if url.startswith("webcal://"):
            url = "https://" + url[len("webcal://"):]
        if not url.startswith(("https://", "http://")):
            self.send_error(400, "url must be http(s) or webcal")
            return
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "HTD-planner/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                body = resp.read(5_000_000)
        except Exception as e:  # noqa: BLE001
            self.send_error(502, f"Could not fetch feed: {e}")
            return
        if b"BEGIN:VCALENDAR" not in body[:2000]:
            self.send_error(422, "That link did not return a calendar (.ics) feed")
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/calendar; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass


class Server(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), Handler) as httpd:
        print(f"HTD running at http://localhost:{PORT}")
        httpd.serve_forever()
