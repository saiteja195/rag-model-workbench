# ============================================
# Frontend Dockerfile — RAG Model Workbench
# Multi-stage: node:20-alpine → nginx:1.27-alpine
# ============================================

# ── Stage 1: Build React app ─────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first (layer caching for npm ci)
COPY package.json package-lock.json ./

# Install dependencies (clean install, no dev surprises)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build the production bundle
RUN npm run build


# ── Stage 2: Serve with Nginx ────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Ensure nginx user owns the files
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    # Nginx needs to write to these dirs
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

# Run as nginx user (non-root)
USER nginx

CMD ["nginx", "-g", "daemon off;"]
