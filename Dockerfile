ARG NODE_IMAGE=node:20-alpine

# --- Base stage: shared setup ---
FROM ${NODE_IMAGE} AS base
WORKDIR /app

# Install dumb-init (and ffmpeg if you need it)
RUN apk add --no-cache dumb-init

# Prepare non-root app directory
RUN mkdir -p /app && chown node:node /app
USER node

# --- Dependencies stage: install all deps ---
FROM base AS dependencies
WORKDIR /app

# Copy manifests and install prod+dev deps
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

# Copy source for build
COPY --chown=node:node . .

# --- Build stage: compile TypeScript ---
FROM dependencies AS build
WORKDIR /app
RUN npm run build

# --- Production stage: install only production deps + copy build output ---
FROM base AS production
WORKDIR /app

# Set production environment vars
ENV NODE_ENV=production
ENV PORT=3333

# Install only prod dependencies
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled JS and any runtime assets
COPY --chown=node:node --from=build /app/build ./build
COPY --chown=node:node --from=build /app/bin   ./bin

# Expose port and use dumb-init to launch your server.js
EXPOSE 3333
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build/bin/server.js"]
