FROM node:20.19.5-alpine

WORKDIR /app

# Install netcat for health checks
RUN apk add --no-cache netcat-openbsd bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Make scripts executable
RUN chmod +x docker-entrypoint.sh
RUN chmod +x scripts/setup-database.sh 2>/dev/null || true

# Expose port
EXPOSE 3001

# Use entrypoint script for initialization (use bash explicitly)
ENTRYPOINT ["/bin/bash", "docker-entrypoint.sh"]

