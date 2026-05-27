FROM node:18-alpine

WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm install --production=false

# Copy all backend source
COPY . ./

# Expose port (Railway injects PORT env var)
EXPOSE 5000

CMD ["node", "server.js"]
