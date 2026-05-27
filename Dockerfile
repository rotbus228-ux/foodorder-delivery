FROM node:18-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --production=false

# Copy backend source
COPY backend/ ./

# Expose port (Railway injects PORT env var)
EXPOSE 5000

CMD ["node", "server.js"]
