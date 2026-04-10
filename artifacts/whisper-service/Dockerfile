FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV WHISPER_HOST=0.0.0.0
ENV WHISPER_PORT=8100
ENV WHISPER_CACHE_DIR=/app/models

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

RUN mkdir -p /app/models

EXPOSE 8100

CMD ["sh", "-c", "uvicorn main:app --host ${WHISPER_HOST} --port ${WHISPER_PORT}"]
