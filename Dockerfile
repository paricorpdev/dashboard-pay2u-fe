# syntax=docker/dockerfile:1

##############################################################################
# PayGate Dashboard — Next.js 16 production image
#
# Multi-stage build producing a small image based on Next.js "standalone"
# output. NO environment variables are baked into the image — everything
# (e.g. BACKEND_URL) is injected at RUNTIME by the CI/CD (Komodo), so the
# same image is reused across environments without a rebuild.
##############################################################################

# ---------- Stage 1: dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app
# libc6-compat is required by some Node native modules on Alpine.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
# Use npm ci when a lockfile exists for reproducible installs, else npm install.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ---------- Stage 2: build ----------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------- Stage 3: runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

# Runtime defaults come from Next.js standalone server.js:
#   PORT     -> 3000
#   HOSTNAME -> 0.0.0.0  (reachable from outside the container)
#   NODE_ENV -> production
# Override any of these (and BACKEND_URL) at runtime via Komodo CI/CD.

RUN apk add --no-cache libc6-compat \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy the standalone server, its pruned node_modules, static assets & public.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Lightweight healthcheck against the app itself (login page is always 200).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

