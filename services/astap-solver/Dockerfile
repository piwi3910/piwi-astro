# Multi-architecture Dockerfile for ASTAP Plate Solver
# Supports both amd64 and arm64 architectures
#
# Build for both architectures:
#   docker buildx build --platform linux/amd64,linux/arm64 -t astap-solver:latest .
#
# Build for current architecture only:
#   docker build -t astap-solver:latest .

FROM python:3.12-slim

# Build argument for target architecture (set automatically by buildx)
ARG TARGETARCH

LABEL maintainer="AstroPlanner"
LABEL description="ASTAP Plate Solver with Flask API"

# Install system dependencies
# ASTAP CLI requires minimal dependencies since it's statically linked
RUN apt-get update && apt-get install -y --no-install-recommends \
    unzip \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /opt/astap/data /app

WORKDIR /app

# Copy the ASTAP zip files and star database
COPY astap_command-line_version_Linux_amd64.zip /tmp/astap_amd64.zip
COPY astap_command-line_version_Linux_aarch64.zip /tmp/astap_arm64.zip
COPY d80_star_database.zip /tmp/d80_database.zip

# Extract the correct ASTAP binary based on architecture
RUN if [ "$TARGETARCH" = "arm64" ]; then \
        echo "Installing ARM64 version of ASTAP..." && \
        unzip /tmp/astap_arm64.zip -d /tmp/astap_extract && \
        cp /tmp/astap_extract/astap_cli /opt/astap/astap_cli; \
    else \
        echo "Installing AMD64 version of ASTAP..." && \
        unzip /tmp/astap_amd64.zip -d /tmp/astap_extract && \
        cp /tmp/astap_extract/astap_cli /opt/astap/astap_cli; \
    fi && \
    chmod +x /opt/astap/astap_cli && \
    rm -rf /tmp/astap_extract /tmp/astap_amd64.zip /tmp/astap_arm64.zip

# Extract star database
RUN echo "Extracting D80 star database..." && \
    unzip /tmp/d80_database.zip -d /opt/astap/data && \
    rm /tmp/d80_database.zip && \
    echo "Star database files:" && \
    ls -la /opt/astap/data/

# Copy Python application
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Environment variables
ENV ASTAP_CLI=/opt/astap/astap_cli
ENV STAR_DATABASE=/opt/astap/data
ENV PORT=5000
ENV FLASK_DEBUG=false

# Expose the API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "600", "app:app"]
