#!/usr/bin/env bash
set -euo pipefail

echo "Bringing up services..."
docker compose up -d --build

echo "Waiting 6 seconds for RabbitMQ and services to start..."
sleep 6

# make an order
ORDER_ID=$(node -e "console.log(require('crypto').randomBytes(8).toString('hex'))")
echo "Using orderId=$ORDER_ID"

curl -s -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d "{\"itemId\":[\"itemA\",\"itemB\"],\"orderId\":\"${ORDER_ID}\"}" | jq || true

echo "Waiting for notification log to appear..."
for i in {1..20}; do
  if [ -f notification-service/data/notifications.log ]; then
    if grep -q "${ORDER_ID}" notification-service/data/notifications.log; then
      echo "SUCCESS: notifications found for ${ORDER_ID}"
      exit 0
    fi
  fi
  sleep 1
done

echo "Integration test FAILED: notifications not found."
docker compose logs --tail=200
exit 1
