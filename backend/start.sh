#!/bin/bash

# Ensure CA certificates are present for TLS verification (e.g. Upstash Redis)
if command -v apt-get &> /dev/null && [ ! -f /etc/ssl/certs/ca-certificates.crt ]; then
    apt-get update -qq && apt-get install -y -qq ca-certificates
fi

# Start Celery worker in the background (restricted to 1 to preserve 512MB memory limits)
celery -A app.tasks worker --loglevel=info --concurrency=1 &

# Start FastAPI on the foreground port
uvicorn app.main:app --host 0.0.0.0 --port $PORT
