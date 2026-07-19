FROM node:24-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY landing-src/package.json landing-src/package-lock.json ./landing-src/
RUN npm --prefix landing-src ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    STORAGE_DIR=/var/lib/dms \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium dumb-init fonts-liberation fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public
COPY --from=builder /app/templates ./templates

RUN mkdir -p /var/lib/dms/data /var/lib/dms/sessions /var/lib/dms/uploads \
    && chown -R node:node /app /var/lib/dms

USER node
EXPOSE 3000
VOLUME ["/var/lib/dms"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]
