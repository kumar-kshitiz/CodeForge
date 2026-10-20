FROM node:20 AS base

FROM base AS deps
WORKDIR /app
COPY package.json turbo.json ./
COPY apps/team-competition-service/package.json ./apps/team-competition-service/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo run build --filter=team-competition-service...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 teamgame
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/team-competition-service/dist ./apps/team-competition-service/dist
USER teamgame
EXPOSE 3002
ENV PORT=3002
CMD ["node", "apps/team-competition-service/dist/index.js"]
