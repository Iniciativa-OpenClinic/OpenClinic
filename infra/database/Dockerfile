FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/backend-api/package.json packages/backend-api/
COPY packages/backend-cli/package.json packages/backend-cli/
COPY packages/frontend-webapp/package.json packages/frontend-webapp/
COPY packages/terminology/package.json packages/terminology/
RUN npm ci
COPY packages/core packages/core
COPY packages/backend-cli packages/backend-cli
COPY packages/terminology packages/terminology
COPY infra/database infra/database
COPY infra/secrets infra/secrets
RUN npm run build -w packages/core && npm run build -w packages/terminology
CMD ["npm", "run", "db:migrate"]
