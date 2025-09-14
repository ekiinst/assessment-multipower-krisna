# System Design Document

## 1. Overview and Goals
- What problem are you solving?
- Primary goals and success criteria
- Non-goals (what you are intentionally not addressing)

## 2. Architecture Overview
- High-level diagram of services and message broker
- Brief description of data flow and control flow

## 3. Components
- **Order Service:** responsibilities, key endpoints, data validation
- **Notification Service:** responsibilities, consumption logic, idempotency
- **Message Broker:** choice, topics/queues, retention/ack behavior

## 4. Interfaces and Contracts
- **REST API:** endpoints, request/response shapes, error codes
- **Event schema:** fields, versions, delivery semantics

## 5. Sequence and Data Flow
- Sequence diagram(s) for order creation → notification
- Example logs for success and error paths

## 6. Reliability and Fault Tolerance
- Idempotency strategy
- Retry/back-off, dead-letter queue, handling broker outages

## 7. Scalability and Performance
- Throughput assumptions and bottlenecks
- Horizontal scaling strategy, partitioning, consumer concurrency

## 8. Security and Compliance
- Handling secrets and configs
- AuthN/AuthZ assumptions (if any)

## 9. Observability
- Logging, metrics, and tracing approach
- What you would alert on in production

## 10. Deployment and Operations
- Local dev setup (Docker Compose or alternatives)
- Production deployment strategy and configs

## 11. Trade-offs and Alternatives
- Alternatives considered and why they were not chosen
- Key trade-offs in your implementation

## 12. Risks and Mitigations
- Top risks and how you would mitigate them

## 13. Future Work
- Next features or improvements and their expected impact
