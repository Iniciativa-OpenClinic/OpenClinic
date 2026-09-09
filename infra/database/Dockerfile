FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/backend-api/package.json packages/backend-api/
COPY packages/backend-cli/package.json packages/backend-cli/
COPY packages/frontend-webapp/package.json packages/frontend-webapp/
RUN npm ci
COPY packages/core packages/core
COPY packages/backend-cli packages/backend-cli
COPY infra/database infra/database
RUN npm run build -w packages/core
CMD ["npm", "run", "db:migrate"]
