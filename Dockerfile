FROM python:3.11-slim AS base

# System deps for weasyprint + lxml (cached layer)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 libgdk-pixbuf-xlib-2.0-0 \
    libffi-dev libcairo2 libgobject-2.0-0 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (cached unless requirements.txt changes)
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server/ .

# Copy pre-built frontend (build outside Docker for speed)
COPY server/static/ ./static/

EXPOSE 8999

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8999"]
