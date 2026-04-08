FROM node:20-alpine AS builder

WORKDIR /app

# NXH_API_URL reçu en build-arg, mappé vers NEXT_PUBLIC_API_URL
ARG NXH_API_URL
ENV NEXT_PUBLIC_API_URL=$NXH_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Image de production ───────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NXH_PORT=80

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 80
CMD ["node", "server.js"]