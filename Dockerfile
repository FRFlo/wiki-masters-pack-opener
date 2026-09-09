FROM oven/bun:1.3-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile --production
COPY src ./src
RUN mkdir -p /data && chown -R bun:bun /app /data

USER bun
CMD ["bun", "run", "start"]
