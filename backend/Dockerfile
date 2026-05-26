FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -o backend .

FROM alpine:3.19

RUN apk add --no-cache ffmpeg ca-certificates

WORKDIR /app
COPY --from=builder /app/backend .

EXPOSE 8081

CMD ["./backend"]
