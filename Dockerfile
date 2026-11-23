# Production image: Next.js 15 + SQLite (better-sqlite3) + Satori/resvg + FFmpeg + in-app 5-min scheduler.
# Works on Render / Northflank / Koyeb / Fly / HF Spaces / any Docker host. Listens on $PORT (default 3000).
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends python3 make g++ ca-certificates >/dev/null && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN rm -rf data logs .next && NEXT_TELEMETRY_DISABLED=1 npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends ffmpeg ca-certificates tini >/dev/null && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 DATA_DIR=/app/data \
    FETCH_INTERVAL_MINUTES=5 MAX_ITEMS_PER_RUN=8 IMAGE_BACKFILL_PER_RUN=12 AI_PROVIDER=auto \
    NODE_OPTIONS=--max-old-space-size=384
COPY --from=build /app/package.json /app/next.config.mjs ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=60s --timeout=10s --start-period=60s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "exec node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
