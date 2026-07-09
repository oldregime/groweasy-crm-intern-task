FROM node:22-alpine AS builder

WORKDIR /app

# Copy configuration and package files
COPY package*.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs .npmrc ./

# Install dependencies (skipping bin-links for mount safety if any)
RUN npm install

# Copy source and static assets
COPY src ./src
COPY public ./public

# Build Next.js application
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy build output and dependencies from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose Next.js port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
