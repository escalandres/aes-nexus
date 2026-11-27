# Multi-stage production Dockerfile for AES Nexus ERP/CRM
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Generate Prisma Client for backend models and build frontend Vite bundle
RUN npx prisma generate --schema=backend/prisma/schema.prisma \
  && npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN mkdir -p /app/backend/.data && chown -R node:node /app/backend/.data

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1 || exit 1

CMD ["npx", "tsx", "server.ts"]
