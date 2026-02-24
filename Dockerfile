# Use official Node.js LTS image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code (including vendor/)
COPY . .

# Use non-root user
USER node

# Expose port (Fly.io uses 8080 internally)
EXPOSE 8080

# Start the server directly with tsx (no build step needed)
CMD ["npm", "run", "start"]
