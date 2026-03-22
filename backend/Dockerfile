# ── Stage 1: Install dependencies ────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ── Stage 2: Build TypeScript ────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build
RUN cp -r src/database/migrations dist/database/migrations
RUN cp src/docs/openapi.yaml dist/docs/openapi.yaml

# ── Stage 3: Production image ───────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 sahovat && \
    adduser --system --uid 1001 sahovat

# Copy production deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Create storage directories
RUN mkdir -p storage/public storage/private && \
    chown -R sahovat:sahovat storage

USER sahovat

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
