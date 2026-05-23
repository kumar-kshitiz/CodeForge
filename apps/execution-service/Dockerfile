FROM node:20 AS base

FROM base AS deps
WORKDIR /app
COPY package.json turbo.json ./
COPY apps/execution-service/package.json ./apps/execution-service/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo run build --filter=execution-service...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/execution-service/dist ./apps/execution-service/dist

USER worker

CMD ["node", "apps/execution-service/dist/index.js"]
