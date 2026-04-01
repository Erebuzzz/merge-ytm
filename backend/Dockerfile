FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
COPY . .

RUN pip install -e ".[dev]"

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
