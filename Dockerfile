FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CIVIC_DATA_CACHE_TTL_MS=300000

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY next.config.mjs ./
COPY postcss.config.mjs ./
COPY next-env.d.ts ./
COPY prisma ./prisma
COPY src ./src
COPY etl ./etl
COPY docs ./docs
COPY data ./data
COPY public ./public

RUN npx prisma generate && npm run build

EXPOSE 3000

CMD ["sh", "-c", "if [ \"${CIVIC_REFRESH_ON_START:-false}\" = \"true\" ]; then npm run etl:live || echo 'Live refresh failed; using bundled or mounted cached dataset.'; fi; npm run start"]
