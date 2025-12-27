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

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 3001

# Use entrypoint script for initialization (use bash explicitly)
ENTRYPOINT ["/bin/bash", "docker-entrypoint.sh"]

