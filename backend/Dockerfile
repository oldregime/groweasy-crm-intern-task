FROM node:22-alpine

WORKDIR /app

# Copy configuration and package files
COPY package*.json tsconfig.json prisma.config.ts .npmrc ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source files
COPY src ./src

# Generate Prisma Client
RUN node node_modules/prisma/build/index.js generate

# Build TypeScript code
RUN npm run build

# Expose backend port
EXPOSE 8000

# Set environment defaults
ENV PORT=8000
ENV DATABASE_URL="file:/app/data/groweasy_crm.db"

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

# Run application
CMD ["npm", "start"]
