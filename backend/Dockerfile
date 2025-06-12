FROM python:3.11-slim-bookworm AS builder
WORKDIR /app
COPY requirements.txt .

# Install system dependencies
RUN apt-get update \
      && apt-get install -y --no-install-recommends \
      build-essential git libpq-dev python3-dev \
      libopenblas-dev liblapack-dev cmake pkg-config \
      zlib1g-dev libffi-dev libssl-dev gfortran libblas-dev

# Upgrade pip with retries and build wheels with robust network handling
RUN pip install --upgrade pip setuptools wheel --retries 5 --timeout 300

# Build wheels with multiple retry strategies
RUN pip wheel --wheel-dir /wheels -r requirements.txt \
      --retries 5 --timeout 300 --trusted-host pypi.org --trusted-host pypi.python.org || \
      (echo "First attempt failed, retrying after 30 seconds..." && sleep 30 && \
      pip wheel --wheel-dir /wheels -r requirements.txt \
      --retries 10 --timeout 600 --trusted-host pypi.org --trusted-host pypi.python.org) || \
      (echo "Second attempt failed, trying with different index..." && sleep 60 && \
      pip wheel --wheel-dir /wheels -r requirements.txt \
      --retries 10 --timeout 900 -i https://pypi.org/simple/ --trusted-host pypi.org)

# Clean up build dependencies
RUN apt-get purge -y build-essential git libpq-dev python3-dev \
      libopenblas-dev liblapack-dev cmake pkg-config \
      zlib1g-dev libffi-dev libssl-dev gfortran libblas-dev \
      && rm -rf /var/lib/apt/lists/*

FROM python:3.11-slim-bookworm
WORKDIR /app

# Copy wheels and requirements
COPY --from=builder /wheels /wheels
COPY requirements.txt .

# Install packages from local wheels
RUN pip install --pre \
      --no-cache-dir --no-index --find-links=/wheels \
      -r requirements.txt \
      && rm -rf /wheels

# Download spaCy model with retries
RUN python -m spacy download en_core_web_sm --retries 5 || \
      (echo "spaCy download failed, retrying..." && sleep 10 && \
      python -m spacy download en_core_web_sm --retries 10)

COPY app/ ./app
EXPOSE 8000
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]