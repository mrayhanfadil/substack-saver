"""Substack content fetcher: RSS/Atom feeds + post HTML parsing.

Strategy (in order of preference for a single post):
1. Fetch the post page HTML and extract the ``__NEXT_DATA__`` JSON blob
   (Substack is a Next.js app) -> full ``bodyHtml``.
2. Fall back to JSON-LD schema (headline / articleBody / datePublished).
3. Fall back to DOM selectors (div.post-content, article, .available-content).
4. As a last resort, use the RSS feed entry content for that URL.

All HTTP uses a real browser User-Agent to avoid 403s.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

import feedparser
import httpx
from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
REQUEST_TIMEOUT = 25.0


@dataclass
class Post:
    url: str
    title: str = "Untitled"
    subtitle: str = ""
    author: str = ""
    published: str = ""
    body_html: str = ""
    image_urls: list[str] = field(default_factory=list)


@dataclass
class FeedPost:
    title: str
    url: str
    published: str = ""
    author: str = ""
    excerpt: str = ""


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xml,*/*"},
        timeout=REQUEST_TIMEOUT,
        follow_redirects=True,
    )


def _clean_subdomain(subdomain: str) -> str:
    sub = subdomain.strip().lower()
    sub = re.sub(r"^https?://", "", sub)
    sub = sub.split("/")[0]
    if not re.fullmatch(r"[a-z0-9][a-z0-9.\-]*[a-z0-9]", sub):
        raise ValueError(f"Invalid subdomain: {subdomain!r}")
    return sub


def feed_url_for(subdomain: str) -> str:
    """Return the RSS feed URL. Dotted values are treated as custom domains."""
    sub = _clean_subdomain(subdomain)
    if "." in sub and not sub.endswith(".substack.com"):
        return f"https://{sub}/feed"
    if sub.endswith(".substack.com"):
        return f"https://{sub}/feed"
    return f"https://{sub}.substack.com/feed"


async def fetch_publication_posts(subdomain: str) -> tuple[str, str, list[FeedPost]]:
    """Fetch and parse a publication feed. Returns (name, feed_url, posts)."""
    feed_url = feed_url_for(subdomain)
    async with _client() as client:
        try:
            resp = await client.get(feed_url)
        except httpx.RequestError as exc:
            raise RuntimeError(f"Could not reach Substack feed: {exc}") from exc
    if resp.status_code == 404:
        raise LookupError(f"No Substack publication found at {feed_url}")
    if resp.status_code == 429:
        raise RuntimeError("Substack rate-limited this server (HTTP 429). Try again shortly.")
    if resp.status_code >= 400:
        raise RuntimeError(f"Feed request failed with HTTP {resp.status_code}")

    parsed = feedparser.parse(resp.content)
    if parsed.bozo and not parsed.entries:
        raise RuntimeError("Could not parse the Substack feed (invalid XML).")

    pub_name = parsed.feed.get("title", subdomain) if hasattr(parsed, "feed") else subdomain
    posts: list[FeedPost] = []
    for entry in parsed.entries:
        link = getattr(entry, "link", "")
        if not link:
            continue
        excerpt = ""
        if getattr(entry, "summary", ""):
            soup = BeautifulSoup(entry.summary, "lxml")
            excerpt = soup.get_text(" ", strip=True)[:300]
        posts.append(
            FeedPost(
                title=getattr(entry, "title", "Untitled"),
                url=link,
                published=getattr(entry, "published", ""),
                author=getattr(entry, "author", ""),
                excerpt=excerpt,
            )
        )
    return pub_name, feed_url, posts


def _walk(obj, path: list[str]):
    cur = obj
    for key in path:
        if isinstance(cur, dict) and key in cur:
            cur = cur[key]
        else:
            return None
    return cur


def _extract_next_data(soup: BeautifulSoup) -> dict | None:
    tag = soup.find("script", id="__NEXT_DATA__")
    if not tag or not tag.string:
        return None
    try:
        return json.loads(tag.string)
    except (json.JSONDecodeError, TypeError):
        return None


def _post_from_next_data(data: dict, url: str) -> Post | None:
    props = _walk(data, ["props", "pageProps"]) or {}
    # Substack nests the post under various keys across redesigns; try them all.
    candidates = [
        props.get("post"),
        props.get("postDetail"),
        _walk(props, ["postDetail", "post"]),
        _walk(props, ["initialState", "post"]),
    ]
    post_obj = next((c for c in candidates if isinstance(c, dict) and c.get("bodyHtml")), None)
    if not post_obj:
        # Deep search for any dict with bodyHtml as a last resort.
        post_obj = _deep_find_body_html(props)
    if not post_obj:
        return None

    author = ""
    bylines = post_obj.get("bylines") or []
    if bylines and isinstance(bylines, list):
        first = bylines[0]
        if isinstance(first, dict):
            author = first.get("name", "") or first.get("display_name", "")
    author = author or post_obj.get("author_name", "") or props.get("authorName", "")

    body = post_obj.get("bodyHtml") or post_obj.get("body_html") or ""
    if not body:
        return None
    return Post(
        url=url,
        title=post_obj.get("title", "Untitled") or "Untitled",
        subtitle=post_obj.get("subtitle", "") or "",
        author=author,
        published=post_obj.get("post_date") or post_obj.get("publishedAt") or "",
        body_html=body,
    )


def _deep_find_body_html(obj, depth: int = 0) -> dict | None:
    if depth > 6 or not isinstance(obj, (dict, list)):
        return None
    if isinstance(obj, dict):
        if isinstance(obj.get("bodyHtml"), str) and len(obj["bodyHtml"]) > 200:
            return obj
        for value in obj.values():
            found = _deep_find_body_html(value, depth + 1)
            if found:
                return found
    else:
        for item in obj:
            found = _deep_find_body_html(item, depth + 1)
            if found:
                return found
    return None


def _post_from_json_ld(soup: BeautifulSoup, url: str) -> Post | None:
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            if item.get("@type") not in ("Article", "NewsArticle", "BlogPosting"):
                continue
            body = item.get("articleBody", "")
            title = item.get("headline", "Untitled") or "Untitled"
            author = item.get("author")
            if isinstance(author, dict):
                author = author.get("name", "")
            elif isinstance(author, list) and author:
                author = author[0].get("name", "") if isinstance(author[0], dict) else str(author[0])
            date = item.get("datePublished", "")
            if body and len(body) > 200:
                # articleBody is plain text; wrap in paragraphs.
                paras = "".join(f"<p>{p}</p>" for p in body.split("\n\n") if p.strip())
                return Post(url=url, title=title, author=author or "",
                            published=date, body_html=paras)
    return None


def _post_from_dom(soup: BeautifulSoup, url: str) -> Post | None:
    # Strip noise before extracting.
    for tag in soup(["script", "style", "noscript", "template"]):
        tag.decompose()

    title = ""
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title["content"]
    elif soup.title and soup.title.string:
        title = soup.title.string.strip()

    subtitle = ""
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        subtitle = og_desc["content"]

    author = ""
    author_meta = soup.find("meta", attrs={"name": "author"})
    if author_meta and author_meta.get("content"):
        author = author_meta["content"]

    published = ""
    time_tag = soup.find("time")
    if time_tag and time_tag.get("datetime"):
        published = time_tag["datetime"]

    body_el = None
    for selector in ("div.post-content", "div.available-content",
                     "article .body", "article", ".post-body"):
        body_el = soup.select_one(selector)
        if body_el and len(body_el.get_text(strip=True)) > 200:
            break
        body_el = None
    if body_el is None:
        return None
    return Post(url=url, title=title or "Untitled", subtitle=subtitle,
                author=author, published=published, body_html=str(body_el))


async def _post_from_feed(url: str) -> Post | None:
    """Last resort: find this post's content inside its publication feed."""
    parsed_url = urlparse(url)
    host = parsed_url.netloc
    if not host:
        return None
    candidates = [f"https://{host}/feed"]
    m = re.match(r"([a-z0-9\-]+)\.substack\.com", host)
    if m:
        candidates.append(feed_url_for(m.group(1)))
    async with _client() as client:
        for feed_url in candidates:
            try:
                resp = await client.get(feed_url)
            except httpx.RequestError:
                continue
            if resp.status_code != 200:
                continue
            parsed = feedparser.parse(resp.content)
            for entry in parsed.entries:
                if getattr(entry, "link", "").rstrip("/") == url.rstrip("/"):
                    content = ""
                    if getattr(entry, "content", None):
                        content = entry.content[0].get("value", "")
                    body = content or getattr(entry, "summary", "") or getattr(entry, "description", "")
                    if body and len(body) > 200:
                        return Post(
                            url=url,
                            title=getattr(entry, "title", "Untitled"),
                            author=getattr(entry, "author", ""),
                            published=getattr(entry, "published", ""),
                            body_html=body,
                        )
    return None


async def fetch_post(url: str) -> Post:
    """Fetch a single Substack post and return its structured content."""
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("URL must be a full http(s) URL, e.g. https://example.substack.com/p/slug")
    if "substack.com" not in parsed.netloc and "." not in parsed.netloc:
        raise ValueError("URL does not look like a Substack post URL.")

    async with _client() as client:
        try:
            resp = await client.get(url)
        except httpx.RequestError as exc:
            raise RuntimeError(f"Could not reach Substack: {exc}") from exc
    if resp.status_code == 404:
        raise LookupError("Post not found (HTTP 404). Check the URL.")
    if resp.status_code == 429:
        raise RuntimeError("Substack rate-limited this server (HTTP 429). Try again shortly.")
    if resp.status_code >= 400:
        raise RuntimeError(f"Substack returned HTTP {resp.status_code}")

    soup = BeautifulSoup(resp.text, "lxml")

    # Paywalled / truncated pages still expose metadata; try richest source first.
    next_data = _extract_next_data(soup)
    if next_data:
        post = _post_from_next_data(next_data, url)
        if post:
            post.image_urls = _collect_images(post.body_html, url)
            return post

    post = _post_from_json_ld(soup, url)
    if post:
        post.image_urls = _collect_images(post.body_html, url)
        return post

    post = _post_from_dom(soup, url)
    if post:
        post.image_urls = _collect_images(post.body_html, url)
        return post

    post = await _post_from_feed(url)
    if post:
        post.image_urls = _collect_images(post.body_html, url)
        return post

    raise RuntimeError(
        "Could not extract article content (page may be paywalled or JS-only)."
    )


def _collect_images(body_html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(body_html, "lxml")
    urls: list[str] = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src")
        if not src:
            continue
        full = httpx.URL(src)
        if not full.is_absolute_url:
            full = httpx.URL(base_url).join(src)
        if str(full) not in urls:
            urls.append(str(full))
    return urls[:20]  # cap to keep conversions fast


async def download_image(url: str) -> tuple[bytes, str] | None:
    """Download one image. Returns (bytes, content_type) or None on failure."""
    async with _client() as client:
        try:
            resp = await client.get(url)
        except httpx.RequestError:
            return None
    if resp.status_code != 200 or not resp.content:
        return None
    ctype = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
    if not ctype.startswith("image/"):
        return None
    return resp.content, ctype


def slugify(text: str, max_len: int = 60) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return (slug or "post")[:max_len]
