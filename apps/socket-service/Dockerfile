FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json turbo.json ./
COPY apps/socket-service/package.json ./apps/socket-service/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo run build --filter=socket-service...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 socketjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/socket-service/dist ./apps/socket-service/dist

USER socketjs
EXPOSE 3002
ENV PORT 3002

CMD ["node", "apps/socket-service/dist/index.js"]
