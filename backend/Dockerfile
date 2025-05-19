FROM python:3.11-slim-bookworm AS builder
WORKDIR /app
COPY requirements.txt .
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
       build-essential git libpq-dev python3-dev \
       libopenblas-dev liblapack-dev cmake pkg-config \
       zlib1g-dev libffi-dev libssl-dev gfortran libblas-dev \
 && pip install --upgrade pip setuptools wheel \
 && pip wheel --wheel-dir /wheels -r requirements.txt \
 && apt-get purge -y build-essential git libpq-dev python3-dev \
       libopenblas-dev liblapack-dev cmake pkg-config \
       zlib1g-dev libffi-dev libssl-dev gfortran libblas-dev \
 && rm -rf /var/lib/apt/lists/*

FROM python:3.11-slim-bookworm
WORKDIR /app

COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --pre \
    --no-cache-dir --no-index --find-links=/wheels \
    -r requirements.txt \
  && rm -rf /wheels

# ← **ADD THIS** right after your deps are in place:
RUN python -m spacy download en_core_web_sm

COPY app/ ./app
EXPOSE 8000
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]
