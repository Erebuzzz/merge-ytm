#!/bin/bash

# Start Celery worker in the background (restricted to 1 to preserve 512MB memory limits)
celery -A app.tasks worker --loglevel=info --concurrency=1 &

# Start FastAPI on the foreground port
uvicorn app.main:app --host 0.0.0.0 --port $PORT
