"""Convert an extracted Substack Post to Markdown / PDF / EPUB.

Images are downloaded and embedded (base64 data-URIs for PDF,
bundled image items for EPUB) so output files are self-contained.
"""

from __future__ import annotations

import asyncio
import base64
import imghdr
import uuid
from datetime import datetime

from bs4 import BeautifulSoup
from markdownify import markdownify as mdify

from scraper import Post, download_image

PDF_CSS = """
@page {
  size: A4;
  margin: 2.2cm 2cm 2.5cm 2cm;
  @bottom-center {
    content: counter(page);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 9pt;
    color: #888;
  }
}
body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12pt;
  line-height: 1.7;
  color: #1a1a1a;
}
header.meta { margin-bottom: 2em; border-bottom: 1px solid #ddd; padding-bottom: 1em; }
header.meta h1 { font-size: 24pt; line-height: 1.25; margin: 0 0 0.3em 0; color: #111; }
header.meta .subtitle { font-size: 13pt; font-style: italic; color: #555; margin: 0 0 0.8em 0; }
header.meta .byline { font-size: 10pt; color: #777; }
h2 { font-size: 16pt; margin-top: 1.6em; color: #222; }
h3 { font-size: 13pt; margin-top: 1.4em; color: #333; }
p { margin: 0 0 1em 0; text-align: justify; }
blockquote {
  margin: 1.2em 0; padding: 0.6em 1.2em;
  border-left: 3px solid #999; color: #444; font-style: italic;
  background: #f8f8f6;
}
pre, code { font-family: 'Courier New', monospace; font-size: 10pt; }
pre { background: #f4f4f2; padding: 1em; white-space: pre-wrap; page-break-inside: avoid; }
img { max-width: 100%; height: auto; display: block; margin: 1.2em auto; }
figure { margin: 1.5em 0; text-align: center; page-break-inside: avoid; }
figcaption { font-size: 9.5pt; color: #777; font-style: italic; margin-top: 0.4em; }
a { color: #1a5fb4; text-decoration: none; }
hr { border: none; border-top: 1px solid #ccc; margin: 2em auto; width: 30%; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 10.5pt; }
th, td { border: 1px solid #ccc; padding: 0.4em 0.6em; text-align: left; }
"""

EPUB_CSS = (
    "body{font-family:Georgia,serif;font-size:1em;line-height:1.7;color:#1a1a1a}"
    "h1{font-size:1.6em;line-height:1.25}h2{font-size:1.3em}h3{font-size:1.1em}"
    "blockquote{margin:1em 0;padding:.5em 1em;border-left:3px solid #999;"
    "color:#444;font-style:italic;background:#f8f8f6}"
    "img{max-width:100%}figure{text-align:center}"
    "figcaption{font-size:.85em;color:#777;font-style:italic}"
    "pre{white-space:pre-wrap;background:#f4f4f2;padding:1em;font-size:.85em}"
)


def _clean_body(post: Post) -> BeautifulSoup:
    soup = BeautifulSoup(post.body_html, "lxml")
    for tag in soup(["script", "style", "noscript", "template", "button", "form"]):
        tag.decompose()
    # Drop Substack chrome that leaks into extracts (share/subscribe widgets).
    for el in soup.select(".subscribe-widget, .share-widget, .subscription-widget"):
        el.decompose()
    # Normalize lazy images: prefer real src, drop srcset (breaks offline render).
    for img in soup.find_all("img"):
        for attr in ("srcset", "data-srcset", "sizes"):
            img.attrs.pop(attr, None)
        if not img.get("src") and img.get("data-src"):
            img["src"] = img["data-src"]
    for a in soup.find_all("a", href=True):
        if a["href"].startswith("#"):
            a.unwrap()
    return soup


async def _fetch_images(urls: list[str]) -> dict[str, tuple[bytes, str]]:
    results: dict[str, tuple[bytes, str]] = {}

    async def one(url: str):
        try:
            got = await download_image(url)
        except Exception:
            got = None
        if got:
            results[url] = got

    await asyncio.gather(*(one(u) for u in urls[:20]))
    return results


def _embed_base64(soup: BeautifulSoup, images: dict[str, tuple[bytes, str]]) -> None:
    for img in soup.find_all("img"):
        src = img.get("src")
        if src and src in images:
            data, ctype = images[src]
            b64 = base64.b64encode(data).decode("ascii")
            img["src"] = f"data:{ctype};base64,{b64}"


def build_styled_html(post: Post, images: dict[str, tuple[bytes, str]] | None = None) -> str:
    soup = _clean_body(post)
    if images:
        _embed_base64(soup, images)
    body = soup.body.decode_contents() if soup.body else str(soup)
    meta = f"<h1>{post.title}</h1>"
    if post.subtitle:
        meta += f"<p class='subtitle'>{post.subtitle}</p>"
    byline = " · ".join(p for p in (post.author, post.published, post.url) if p)
    if byline:
        meta += f"<p class='byline'>{byline}</p>"
    return (
        "<!DOCTYPE html><html><head><meta charset='utf-8'>"
        f"<style>{PDF_CSS}</style></head><body>"
        f"<header class='meta'>{meta}</header><main>{body}</main>"
        "</body></html>"
    )


def to_markdown(post: Post) -> str:
    soup = _clean_body(post)
    body_md = mdify(str(soup), heading_style="ATX", strip=["img"] if False else [])
    lines = [f"# {post.title}", ""]
    if post.subtitle:
        lines += [f"*{post.subtitle}*", ""]
    byline = " · ".join(p for p in (post.author, post.published) if p)
    if byline:
        lines += [byline, ""]
    lines += [f"Source: {post.url}", "", "---", "", body_md.strip(), ""]
    return "\n".join(lines)


async def to_pdf_bytes(post: Post) -> bytes:
    from weasyprint import HTML  # lazy: heavy import + system libs

    images = await _fetch_images(post.image_urls)
    html = build_styled_html(post, images)
    return HTML(string=html, base_url=post.url).write_pdf()


def _guess_ext(data: bytes, ctype: str) -> str:
    kind = imghdr.what(None, h=data)
    if kind in ("jpeg", "png", "gif", "webp"):
        return "jpg" if kind == "jpeg" else kind
    return {"image/jpeg": "jpg", "image/png": "png",
            "image/gif": "gif", "image/webp": "webp"}.get(ctype, "jpg")


async def to_epub_bytes(post: Post) -> bytes:
    from ebooklib import epub  # lazy import

    images = await _fetch_images(post.image_urls)

    book = epub.EpubBook()
    book.set_identifier(f"substack-{uuid.uuid4().hex[:12]}")
    book.set_title(post.title)
    book.set_language("en")
    if post.author:
        book.add_author(post.author)

    # Embed images as book items and rewrite <img src> to local refs.
    soup = _clean_body(post)
    img_items = []
    for i, img in enumerate(soup.find_all("img")):
        src = img.get("src")
        if src and src in images:
            data, ctype = images[src]
            ext = _guess_ext(data, ctype)
            fname = f"images/img{i}.{ext}"
            item = epub.EpubImage(uid=f"img{i}", file_name=fname,
                                  media_type=ctype, content=data)
            book.add_item(item)
            img["src"] = fname
            for attr in ("srcset", "data-srcset", "sizes", "loading"):
                img.attrs.pop(attr, None)
            img_items.append(item)

    # Cover: first image, else skip (ebooklib requires an image for set_cover).
    if img_items:
        first = img_items[0]
        book.set_cover(first.file_name, first.content, create_page=False)

    body = soup.body.decode_contents() if soup.body else str(soup)
    header = f"<h1>{post.title}</h1>"
    if post.subtitle:
        header += f"<p><i>{post.subtitle}</i></p>"
    byline = " · ".join(p for p in (post.author, post.published) if p)
    if byline:
        header += f"<p><small>{byline}</small></p>"
    chapter = epub.EpubHtml(title=post.title, file_name="post.xhtml", lang="en")
    chapter.content = f"<html><body>{header}<hr/>{body}</body></html>"
    book.add_item(chapter)

    style = epub.EpubItem(uid="style", file_name="styles/main.css",
                          media_type="text/css", content=EPUB_CSS)
    book.add_item(style)
    chapter.add_item(style)

    book.toc = [epub.Link("post.xhtml", post.title, "post")]
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = ["nav", chapter]

    import io
    buf = io.BytesIO()
    epub.write_epub(buf, book, {})
    return buf.getvalue()


def media_type_for(fmt: str) -> str:
    return {
        "pdf": "application/pdf",
        "epub": "application/epub+zip",
        "markdown": "text/markdown; charset=utf-8",
    }[fmt]


def extension_for(fmt: str) -> str:
    return {"pdf": "pdf", "epub": "epub", "markdown": "md"}[fmt]


def converted_at() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"
