# Build Frontend
FROM node:24-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build Backend
FROM golang:1.24-bullseye AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o cfst .

# Final Image
FROM debian:bullseye-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=backend-builder /app/cfst /app/cfst
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
COPY ip.txt /app/ip.txt
COPY ipv6.txt /app/ipv6.txt

EXPOSE 8080
ENTRYPOINT ["/app/cfst", "-web"]
