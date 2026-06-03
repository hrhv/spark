# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies in a separate layer so changes to source don't bust the cache
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# VITE_GOOGLE_CLIENT_ID is baked into the JS bundle at build time by Vite.
# Pass it with: docker build --build-arg VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
ARG  VITE_GOOGLE_CLIENT_ID
ENV  VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
