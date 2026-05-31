FROM rust:1.95-slim AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/omniboard-backend /usr/local/bin/omniboard-backend
COPY --from=builder /app/migrations ./migrations

ENV PORT=3000
EXPOSE 3000

CMD ["omniboard-backend"]
