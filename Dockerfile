# syntax=docker/dockerfile:1

FROM oven/bun:1.4.2-alpine AS web-build

WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY apps/web/package.json ./apps/web/package.json
RUN bun install --frozen-lockfile
COPY apps/web ./apps/web
RUN bun run --cwd apps/web build

FROM alpine:3.20

ARG PB_VERSION=0.40.6
ARG PB_ARCH=linux_amd64

RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    unzip

WORKDIR /pb

ADD "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/checksums.txt" /tmp/checksums.txt
ADD "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${PB_ARCH}.zip" /tmp/pb.zip

RUN cd /tmp \
    && grep "pocketbase_${PB_VERSION}_${PB_ARCH}.zip" checksums.txt | awk '{ print $1 "  pb.zip" }' | sha256sum -c - \
    && unzip pb.zip -d /pb \
    && rm -f pb.zip checksums.txt \
    && chmod +x /pb/pocketbase

COPY apps/pocketbase/pb_migrations /pb/pb_migrations
COPY apps/pocketbase/pb_hooks /pb/pb_hooks
COPY --from=web-build /app/apps/web/build /pb/pb_public
COPY docker-entrypoint.sh /pb/docker-entrypoint.sh
RUN chmod 0755 /pb/docker-entrypoint.sh

ENV PB_DATA_DIR=/pb/pb_data
EXPOSE 8090
VOLUME /pb/pb_data

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider "http://127.0.0.1:8090/api/health" || exit 1

ENTRYPOINT ["/pb/docker-entrypoint.sh"]
