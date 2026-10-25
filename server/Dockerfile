# Multi-stage: build with the full Go toolchain, ship only the static binary.
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates && adduser -D -H app
USER app
COPY --from=build /app /app
# PORT is injected by the host platform (Render/Koyeb); the app already reads it via os.Getenv.
EXPOSE 8000
ENTRYPOINT ["/app"]
