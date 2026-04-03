#!/bin/bash

# Start Celery worker in the background
celery -A app.tasks worker --loglevel=info &

# Start FastAPI on the foreground port
uvicorn app.main:app --host 0.0.0.0 --port $PORT
