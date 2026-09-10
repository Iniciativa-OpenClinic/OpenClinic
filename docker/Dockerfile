# ==============================================================
# OpenClinic API  -  Multi-stage Docker Build
# ==============================================================

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/core/package.json packages/core/
COPY packages/backend-api/package.json packages/backend-api/
COPY packages/backend-cli/package.json packages/backend-cli/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/core/ packages/core/
COPY packages/backend-api/ packages/backend-api/
COPY packages/backend-cli/ packages/backend-cli/
RUN npm run build -w packages/core && npm run build -w packages/backend-api

# Stage 2: Runtime
FROM node:20-alpine AS runtime
LABEL maintainer="Iniciativa OpenClinic"
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/packages/core/package.json packages/core/
COPY --from=builder /app/packages/core/dist packages/core/dist/
COPY --from=builder /app/packages/backend-api/package.json packages/backend-api/
COPY --from=builder /app/packages/backend-api/dist packages/backend-api/dist/
RUN npm ci --omit=dev
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget --spider -q http://127.0.0.1:3000/health || exit 1
CMD ["node", "packages/backend-api/dist/server.js"]
