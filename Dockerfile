# =============================================================================
# BRATS — Multi-stage Dockerfile
#
# Stage 1 (deps):    Install production dependencies
# Stage 2 (builder): Build the Next.js application
# Stage 3 (runner):  Minimal runtime image
# =============================================================================

ARG NODE_VERSION=22

# =============================================================================
# Stage 1 — Dependencies
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files for cache-efficient dependency install
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/

RUN npm ci && \
    npx prisma generate

# =============================================================================
# Stage 2 — Builder
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install ALL deps (including devDeps for the build)
COPY package.json package-lock.json ./
COPY prisma/ ./prisma/

RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output for minimal image)
ENV NEXT_TELEMETRY_DISABLED=1
# NextAuth validates its secret while Next.js evaluates the auth route at build
# time. The runtime container must still receive the real secret via its env.
ARG NEXTAUTH_SECRET=brats-build-only-secret
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
RUN npm run build

# =============================================================================
# Stage 3 — Runner
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what's needed for production
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
