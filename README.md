# Multi Power Group - Event‑Driven Order Processing System (Assessment - Krisna Ajie)

# Quick Start

## Requirements:
- Docker installed (to run broker and services)
- Node.js v14+ installed (for running services locally and tests)

## 1. Install dependencies

From the repo root, run:
```
npm run install:all
```

This will installs dependencies in three locations:
- Root folder (`package.json` at repo root)
- `package.json` inside `order-service/` folder
- `package.json` inside `notification-service/` folder

## 2. Build and start broker + services

To start all services, use one of the following commands:

Default build and run:
```
docker compose up --build
```

Run with reduced logs (detached mode):
```
docker compose up --build --quiet-pull -d
```
> The `--quiet-pull -d` options reduce logs and run services in the background.

This will start:
- RabbitMQ broker
- Order Service
- Notification Service

You should see logs from all services. The system is ready to accept orders.

---

# Design Highlights

## Event-driven architecture:
  The Order Service publishes `order.created` events to RabbitMQ.
  Notification Service consumes events and logs notifications.

## Idempotency:
  Duplicate `orderId`s are ignored in Order Service.
  Notification Service avoids duplicate notifications per `orderId+itemId`.

## Lightweight persistence:
  Processed orders tracked in `processed_notifications.json`.
  Notification logs stored in `data/notifications.log`.

---

# API Examples

## Endpoints: POST /orders

## Request body:

```
{
  "orderId": "string",
  "items": ["string"]
}
```
  - `orderId`: unique string, required
  - `items`: non-empty array of strings, required

## Responses:

| Code                     | Meaning                               | Body                                                |
| ------------------------ | ------------------------------------- | --------------------------------------------------- |
| 202 Accepted             | Order accepted for async processing   | `{ "orderId": "string" }`                           |
| 400 Bad Request          | Validation error (e.g., empty itemId) | `{ "error": "description" }`                        |
| 409 Conflict             | orderId already processed (duplicate) | `{ "error": "duplicate orderId" }`                  |
| 503 Service Unavailable  | RabbitMQ service is not available.    | `{ "error": "RabbitMQ not ready, try again later" }`|


---

# Event Example

## Event published to RabbitMQ (order.created):

```
{
  "type": "order.created",
  "version": 1,
  "orderId": "string",
  "itemId": ["itemA","itemB"],
  "createdAt": "2025-09-08T12:34:56.789Z"
}
```

## Notification log lines:

```
notification.sent orderId=... itemId=itemA
notification.sent orderId=... itemId=itemB
```

## **Assumptions**
  - Integration tests assume only `itemA` and `itemB` are used.
  - The system accepts any non-empty array of `itemId`, but auto-tests only cover `itemA` and `itemB`.
  - Order processing is asynchronous; clients get 202 immediately.
  - RabbitMQ runs locally in Docker, no extra broker setup needed.
  - Logs and processed order data are stored on local filesystem (`data/`).
  - The system is designed to be simple, fast to run for a new developer (<5 minutes).


---

# Running Tests

## Direct single order test:
```
curl -X POST <http://localhost:8080/orders> \
     -H "Content-Type: application/json" \
     -d '{"itemId":["itemA","itemB"]}'
```

## Unit tests:
```
npm run test:unit
```

## Integration tests:
```
npm run test:integration
```

## Combined tests:
```
npm run test
```
---
> Note: Make sure services are running via Docker (`docker compose up --build`) before running integration tests.
