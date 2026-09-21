# syntax=docker/dockerfile:1
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Run as the unprivileged user that the base image already provides.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

USER node

# Cloud Run injects PORT; the default matches its convention.
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/index.js"]
