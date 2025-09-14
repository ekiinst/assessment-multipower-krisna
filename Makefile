.PHONY: run up down logs test-integration

run:
	docker compose up --build

up:
	docker compose up -d --build

down:
	docker compose down --volumes --remove-orphans

logs:
	docker compose logs --tail=200 -f

test-integration:
	bash ./scripts/integration_test.sh
