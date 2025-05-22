
FROM python:3.11-slim-bullseye

  WORKDIR /app

  # install build deps
  RUN apt-get update && \
      apt-get install -y --no-install-recommends \
        gcc libpq-dev python3-dev build-essential \
      && rm -rf /var/lib/apt/lists/*

  COPY requirements.txt .
  RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
      pip install --no-cache-dir -r requirements.txt && \
      apt-get purge -y --auto-remove build-essential gcc python3-dev && \
      rm -rf /var/lib/apt/lists/*

  COPY app/ ./app/

  EXPOSE 8001
  CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
