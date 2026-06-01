# Build Frontend
FROM node:26-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install
COPY frontend/ ./
RUN npm run build

# Build Backend
FROM golang:1.26-bookworm AS backend-builder
ENV GOPROXY=https://goproxy.cn,direct
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o cfst .

# Final Image
FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=backend-builder /app/cfst /app/cfst
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
COPY ip.txt /app/ip.txt
COPY ipv6.txt /app/ipv6.txt

EXPOSE 8080
ENTRYPOINT ["/app/cfst", "-web"]
