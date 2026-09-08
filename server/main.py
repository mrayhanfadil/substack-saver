"""Substack Saver — FastAPI monolith.

Serves the React frontend from static/ and exposes conversion API.
"""

from __future__ import annotations

import hashlib
import re
import time
from collections import defaultdict
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
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


class DownloadRequest(BaseModel):
    url: str
    format: str  # pdf | epub | markdown


@app.post("/api/download")
async def download(req: DownloadRequest, request: Request):
    """Return the actual file bytes for download."""
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

    filename = _safe_filename(post.title, req.url, ext)

    from fastapi.responses import Response

    return Response(
        content=body,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
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
