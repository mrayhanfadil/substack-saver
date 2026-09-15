"""Substack Saver — FastAPI monolith.

Serves the React frontend from static/ and exposes conversion API.
"""

from __future__ import annotations

import hashlib
import re
import time
from collections import defaultdict
from html import escape
from pathlib import Path
from urllib.parse import parse_qs

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from converter import extension_for, media_type_for, to_epub_bytes, to_markdown, to_pdf_bytes
from scraper import fetch_post, fetch_publication_posts


def _safe_filename(title: str, url: str, ext: str) -> str:
    """Build an ASCII-safe filename from a post title."""
    slug = hashlib.md5(url.encode()).hexdigest()[:8]
    # Strip non-ASCII, lowercase, replace whitespace/punctuation with hyphens
    safe = title[:50].lower()
    safe = re.sub(r"[^a-z0-9]+", "-", safe)
    safe = "-".join(filter(None, safe.split("-")))[:50]
    return f"{safe}-{slug}.{ext}"

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Substack Saver", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "static"

# ---------------------------------------------------------------------------
# Rate limiter (in-memory, per-IP, sliding window)
# ---------------------------------------------------------------------------

RATE_LIMIT = 10  # requests
RATE_WINDOW = 60  # seconds
_rate_store: dict[str, list[float]] = defaultdict(list)


def _check_rate(ip: str) -> None:
    now = time.time()
    hits = _rate_store[ip]
    # Prune old entries
    _rate_store[ip] = hits = [t for t in hits if now - t < RATE_WINDOW]
    if len(hits) >= RATE_LIMIT:
        retry = int(RATE_WINDOW - (now - hits[0])) + 1
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Try again shortly.",
            headers={"Retry-After": str(retry)},
        )
    hits.append(now)


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------


class ConvertRequest(BaseModel):
    url: str
    format: str  # pdf | epub | markdown


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/publication/{subdomain:path}")
async def publication(subdomain: str, request: Request):
    _check_rate(request.client.host if request.client else "unknown")
    try:
        name, feed_url, posts = await fetch_publication_posts(subdomain)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {
        "name": name,
        "feed_url": feed_url,
        "posts": [
            {
                "title": p.title,
                "url": p.url,
                "date": p.published,
                "author": p.author,
                "excerpt": p.excerpt,
            }
            for p in posts
        ],
    }


@app.post("/api/convert")
async def convert(req: ConvertRequest, request: Request):
    _check_rate(request.client.host if request.client else "unknown")

    fmt = req.format.lower()
    if fmt not in ("pdf", "epub", "markdown"):
        raise HTTPException(status_code=400, detail=f"Invalid format: {fmt}")

    try:
        post = await fetch_post(req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    try:
        if fmt == "markdown":
            content = to_markdown(post)
            ext = "md"
            media = "text/markdown; charset=utf-8"
            body = content.encode("utf-8")
        elif fmt == "pdf":
            body = await to_pdf_bytes(post)
            ext = "pdf"
            media = "application/pdf"
        else:
            body = await to_epub_bytes(post)
            ext = "epub"
            media = "application/epub+zip"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")

    # Build a nice filename from the slug
    filename = _safe_filename(post.title, req.url, ext)

    return JSONResponse(
        content={
            "filename": filename,
            "media_type": media,
            "size": len(body),
            "title": post.title,
            "author": post.author,
        },
        headers={
            "X-Download-Filename": filename,
            "Content-Type": "application/json",
        },
    )


URLENCODED = "application/x-www-form-urlencoded"


def _content_type(request: Request) -> str:
    return request.headers.get("content-type", "").split(";")[0].strip().lower()


def _is_browser_form(request: Request) -> bool:
    """True when a plain browser form POST (the iOS-safe path) sent this."""
    return _content_type(request) == URLENCODED


def _is_ios(user_agent: str) -> bool:
    """True when the request comes from iOS / iPadOS Safari.

    Those browsers preview `application/pdf` inline (replacing the page)
    even with `Content-Disposition: attachment`, so PDFs must be served as
    `application/octet-stream` to get the same download prompt EPUB gets.
    iPadOS desktop-mode reports `Macintosh`, which we cannot tell apart
    server-side — that case keeps the old behaviour.
    """
    ua = user_agent.lower()
    return "iphone" in ua or "ipad" in ua or "ipod" in ua


def _error_page(status: int, message: str) -> str:
    """Minimal dark error page so a failed browser download has a way back."""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Download failed — Substack Saver</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ margin: 0; min-height: 100vh; display: flex; align-items: center;
         justify-content: center; background: #020617; color: #f1f5f9;
         padding: 24px; padding-bottom: max(24px, env(safe-area-inset-bottom));
         font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }}
  .card {{ width: 100%; max-width: 30rem; border: 1px solid #1e293b;
          border-radius: 12px; background: #0f172a; padding: 24px; }}
  .badge {{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
           font-size: 20px; font-weight: 700; color: #f59e0b; letter-spacing: -0.02em; }}
  h1 {{ font-size: 16px; margin: 16px 0 8px; }}
  p {{ font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px;
      overflow-wrap: anywhere; }}
  a {{ display: flex; align-items: center; justify-content: center; min-height: 44px;
      width: 100%; border-radius: 8px; background: #f59e0b; color: #020617;
      text-decoration: none; font-weight: 700; font-size: 14px;
      letter-spacing: 0.06em; text-transform: uppercase; }}
</style>
</head>
<body>
  <div class="card">
    <span class="badge">SUBSTACK_SAVER</span>
    <h1>Download failed ({status})</h1>
    <p>{escape(message)}</p>
    <a href="/">Back to Substack Saver</a>
  </div>
</body>
</html>"""


def _download_error(request: Request, status: int, message: str):
    """HTML for browser form POSTs (they navigate), JSON for API clients."""
    if _is_browser_form(request):
        return HTMLResponse(_error_page(status, message), status_code=status)
    return JSONResponse({"detail": message}, status_code=status)


async def _read_download_body(request: Request) -> tuple[str, str]:
    """Read (url, format) from a form-encoded or JSON body.

    The urlencoded body is parsed with the stdlib rather than `request.form()`
    so the image needs no `python-multipart` dependency for what is, in
    practice, one form POST from the frontend.
    """
    if _is_browser_form(request):
        raw = (await request.body()).decode("utf-8", errors="replace")
        data: object = {k: v[0] for k, v in parse_qs(raw, keep_blank_values=True).items()}
    else:
        try:
            data = await request.json()
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail="Send a JSON or form-encoded body with 'url' and 'format'.",
            ) from exc

    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Body must be an object with 'url' and 'format'.")

    url = str(data.get("url") or "").strip()
    fmt = str(data.get("format") or "").strip().lower()
    if not url:
        raise HTTPException(status_code=400, detail="Missing 'url'.")
    if fmt not in ("pdf", "epub", "markdown"):
        raise HTTPException(status_code=400, detail=f"Invalid format: {fmt or '(missing)'}")
    return url, fmt


@app.post("/api/download")
async def download(request: Request):
    """Return the file bytes with `Content-Disposition: attachment`.

    Accepts JSON *and* form-encoded bodies. iOS Safari cannot save blob URLs or
    honour `a[download]`, so the frontend posts a hidden <form> straight here.
    A browser form POST navigates on failure, hence the HTML error page.
    """
    try:
        url, fmt = await _read_download_body(request)
        _check_rate(request.client.host if request.client else "unknown")
        post = await fetch_post(url)

        if fmt == "markdown":
            body = to_markdown(post).encode("utf-8")
            ext, media = "md", "text/markdown; charset=utf-8"
        elif fmt == "pdf":
            body = await to_pdf_bytes(post)
            ext = "pdf"
            # iOS Safari previews application/pdf inline even with
            # `Content-Disposition: attachment` (page replaced, nothing
            # saved). octet-stream forces the same download prompt EPUB gets.
            if _is_ios(request.headers.get("user-agent", "")):
                media = "application/octet-stream"
            else:
                media = "application/pdf"
        else:
            body = await to_epub_bytes(post)
            ext, media = "epub", "application/epub+zip"
    except HTTPException as exc:
        # Rate limits and validation errors: keep native JSON semantics for API
        # clients, but give browsers a page they can recover from.
        if _is_browser_form(request):
            return _download_error(request, exc.status_code, str(exc.detail))
        raise
    except ValueError as exc:
        return _download_error(request, 400, str(exc))
    except LookupError as exc:
        return _download_error(request, 404, str(exc))
    except RuntimeError as exc:
        return _download_error(request, 502, str(exc))
    except Exception as exc:
        return _download_error(request, 500, f"Conversion failed: {exc}")

    filename = _safe_filename(post.title, url, ext)

    return Response(
        content=body,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


# ---------------------------------------------------------------------------
# SPA fallback — serve React build from static/
# ---------------------------------------------------------------------------

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve React frontend — SPA fallback."""
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8888)
