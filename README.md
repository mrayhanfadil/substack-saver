# Substack Saver

Save Substack posts as PDF, EPUB, or Markdown. Paste any Substack URL, pick a format, download.

![Screenshot](https://substack.server-fadil.my.id/og-image.png?v=2)

## Features

- **Single post conversion** — paste any Substack post URL
- **Publication browsing** — paste a publication URL, browse all posts, download individually
- **3 output formats** — PDF (styled, print-ready), EPUB (e-reader), Markdown
- **Images embedded** — PDF/EPUB include downloaded images, fully self-contained
- **Dark UI** — Bloomberg terminal aesthetic, monospace typography

## Quick Start

### Docker (recommended)

```bash
docker run -d --name substack-saver --restart always \
  -p 8999:8999 \
  ghcr.io/mrayhanfadil/substack-saver:latest
```

### From source

```bash
git clone https://github.com/mrayhanfadil/substack-saver.git
cd substack-saver

# Backend
python -m venv .venv && source .venv/bin/activate
pip install -r server/requirements.txt

# Frontend
npm install && npm run build
cp -r dist server/static

# Run
cd server && python -m uvicorn main:app --port 8999
```

Open `http://localhost:8999`.

### Deploy

```bash
./deploy.sh  # builds frontend + Docker + restarts
```

## API

| Endpoint | Method | Body | Returns |
|----------|--------|------|---------|
| `/api/health` | GET | — | `{"status": "ok"}` |
| `/api/publication/{subdomain}` | GET | — | `{posts: [...]}` |
| `/api/download` | POST | `{url, format}` | File bytes |
| `/api/convert` | POST | `{url, format}` | File metadata JSON |

Format: `pdf` | `epub` | `markdown`

## Tech Stack

- **Backend**: Python 3.11, FastAPI, WeasyPrint, ebooklib, feedparser
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Scraping**: httpx + BeautifulSoup (4-layer: NextData → JSON-LD → DOM → RSS)
- **Deploy**: Docker, Cloudflare Tunnel

## License

MIT
