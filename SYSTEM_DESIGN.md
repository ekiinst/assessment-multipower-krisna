# System Design Document

## 1. Overview and Goals
- What problem are you solving?
    - To build a small event-driven order processing system where new orders trigger notifications asynchronously.
    - When an order is created, it should be validated, published to a broker, and then consumed by a notification service.
- Primary goals and success criteria
    - Orders must be validated before sending.
    - Messages must not be lost, even if services restart.
    - Notifications should not be duplicated.
- Non-goals (what you are intentionally not addressing)

## 2. Architecture Overview
- High-level diagram of services and message broker
    - flowchart LR
        Client -->|POST /orders| OrderService
        OrderService -->|publish event| RabbitMQ
        RabbitMQ -->|consume| NotificationService
        NotificationService -->|write| LogFile
- Brief description of data flow and control flow
    - Client sends order to Order Service (order-service/src/index.js).
    - Order Service validates, saves idempotency, then publishes event to RabbitMQ.
    - RabbitMQ delivers the message to Notification Service (notification-service/src/index.js).
    - Logs are written to notification-service/data/notifications.log.

## 3. Components
- Order Service: responsibilities, key endpoints, data validation
    - Exposes POST /orders endpoint.
    - Validates input (e.g., itemId must be a non‑empty array).
    - Ensures duplicate orderId is rejected.
    - Publishes order events to RabbitMQ (order-service/src/rabbit.js).
- Notification Service: responsibilities, consumption logic, idempotency
    - Listens to RabbitMQ queue via notification-service/src/rabbit.js.
    - Writes notification logs to a file in notification-service/data/notifications.log.
    - Uses persistence (orderId+itemId) to avoid duplicate logs.
- Message Broker: choice, topics/queues, retention/ack behavior
    - This project uses RabbitMQ.
    - The queue/topic is order.created.
    - Handles communication between services.
    - RabbitMQ requires “ack” so if a service fails before ack, it will retry the message.

## 4. Interfaces and Contracts
- REST API: endpoints, request/response shapes, error codes
    - Endpoints:
        - POST /orders → Create a new order
    - Request body:
        {
            "orderId": "string",
            "items": ["string"]
        }
        - orderId: unique string, required
        - items: non-empty array of strings, required
    - Responses:
        - 201 Created → order accepted
        - 400 Bad Request → invalid input (e.g., empty items, missing orderId)
        - 409 Conflict → duplicate orderId
        - 503 Service Unavailable → RabbitMQ is temporary unavailable
- Event schema: fields, versions, delivery semantics
    - Event name: order.created
    - Fields:
        {
            "type": "order.created",
            "version": 1,
            "orderId": "string",
            "itemId": ["string", "string"],
            "createdAt": "2025-09-08T12:34:56.789Z"
        }
    - Versions: starts with v1, can evolve if schema changes
    - Delivery: at-least-once (RabbitMQ may retry until acknowledged)

## 5. Sequence and Data Flow
- Sequence diagram(s) for order creation → notification
    - Client sends POST /orders to Order Service
    - Order Service validates input and saves order (in memory or DB)
    - Order Service publishes an order.created event to RabbitMQ
    - RabbitMQ stores the message in the order.created queue
    - Notification Service listens to the queue and consumes the event
    - Notification Service writes a log entry to notifications.log
    - Acknowledgment is sent back to RabbitMQ

- Example logs for success and error paths

## 6. Reliability and Fault Tolerance
- Idempotency strategy
    - Each (orderId + itemId) is saved in processed_notification.json.
    - If RabbitMQ sends the same event again, the service will skip it, so no duplicate logs.
- Retry/back-off, dead-letter queue, handling broker outages
    - Retry: RabbitMQ re-queues if Notification Service crashes before ack.
    - Dead-letter queue (future): failed messages can be moved to a separate queue.
    - Broker outages: services reconnect automatically on restart.

## 7. Scalability and Performance
- Throughput assumptions and bottlenecks
    - Assumption: JSON payloads are lightweight.
- Horizontal scaling strategy, partitioning, consumer concurrency
    - RabbitMQ can handle thousands per second.
    - Can run multiple Notification Service instances to scale horizontally.
    - Use queue partitioning and consumer groups/partition if traffic grows.

## 8. Security and Compliance
- Handling secrets and configs
    - Secrets (like RabbitMQ password) are stored in environment variables, not in code.
- AuthN/AuthZ assumptions (if any)
    - No authentication is added yet (non-goal).
    - If deployed to production, it would be recommended to add TLS for broker and HTTPS for APIs.

## 9. Observability
- Logging, metrics, and tracing approach
    - Logging: structured JSON logs for both services.
    - Metrics: message publish/consume counts, duplicate rejection counts, queue size.
    - Tracing: simple correlation using orderId.
- What you would alert on in production
    - No messages consumed in last N minutes.
    - Too many duplicate rejections.
    - Queue backlog too large.

## 10. Deployment and Operations
- Local dev setup (Docker Compose or alternatives)
    - Local: docker compose up --build (runs broker + services).
    - Tests:
        - Unit tests: order-service/tests/order.test.js.
        - Integration tests: tests/integration.test.js.
- Production deployment strategy and configs
    - Deploy each service in containers.
    - RabbitMQ as managed service.
    - Use CI/CD to build and deploy.

## 11. Trade-offs and Alternatives
- Alternatives considered and why they were not chosen
    - Chose RabbitMQ for simplicity; Kafka could be used for very high throughput.
    - Chose JSON logs for notifications instead of real DB (faster for assignment).
- Key trade-offs in your implementation
    - File logging is simple and quick for demo, but not scalable for large systems.

## 12. Risks and Mitigations
- Top risks and how you would mitigate them
    - Risk: Notification Service crash → messages stuck.
        - Mitigation: auto-restart container, RabbitMQ re-queues unacked messages.
    - Risk: Duplicate events.
        - Mitigation: store seen orderId+itemId.
    - Risk: Disk fills up from logs.
        - Mitigation: rotate log files (future work).

## 13. Future Work
- Next features or improvements and their expected impact
    - Add real database for orders and notifications.
    - Add authentication and authorization.
    - Add retry/backoff and dead-letter queues.
    - Add monitoring dashboards.

## Extra Design Questions:
- How would you scale the system to 1 M orders per day?
    - Run multiple Order Services behind a load balancer.
    - RabbitMQ cluster with multiple nodes.
    - Multiple Notification Service workers reading from queue.
- What failure modes are you protecting against, and how?
    - Broker down → queue recovers on restart.
    - Duplicate events → handled by idempotency.
    - Service crash → container auto-restarts.
- Which metrics and traces would you emit to detect problems early?
    - Orders published vs consumed (should match).
    - Notification log write failures.
    - Queue length (if growing too large, consumer is too slow).
    - Error rate in Order Service (bad input or duplicate rejections).