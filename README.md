# PiGrow-Server

Indoor growing automation software — a TypeScript backend that manages Raspberry Pi-based greenhouse/grow-tent controllers.

## Tech Stack

| Layer | |
|-------|--|
| Runtime | Node.js 22 |
| Language | TypeScript 6 |
| Web framework | Fastify 5 |
| Validation | TypeBox |
| Database | PostgreSQL 16 via Prisma 7 |
| Real-time | Socket.IO |
| Device comms | MQTT (mosquitto broker) |

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start dev server (hot-reload)
npm run dev

# Run tests
npm test

# Production build
npm run build && npm start
```

Requires a running PostgreSQL instance and MQTT broker. See `.env` for `DATABASE_URL` and `docker-compose.yaml` for the full stack.

## Architecture

```
[Raspberry Pi Sensors] ──MQTT──> [Mosquitto] ──MQTT──> [PiGrow Server]
   [Raspberry Pi Relays] <──MQTT──       ──>        [Automation Engine]
                                                            │
                                                      [Socket.IO]
                                                            │
                                                    [Frontend Dashboard]
```

- **`src/server.ts`** — entrypoint: Fastify → Socket.IO → MQTT → plugins → routes → automation scheduler → listen
- **`src/api/modules/<name>/`** — each domain has routes, controller, schema, and test
- **`src/mqtt-handlers/`** — MQTT topic handlers for telemetry and device state feedback
- **`src/automation/`** — `period.ts` (day/night resolver), `scheduler.ts` (60s light-schedule tick), `evaluator.ts` (threshold-driven reactions)
- **`src/plugins/prisma.ts`** — Fastify plugin that decorates the server with Prisma client

## API

Full REST API reference in [`API.md`](./API.md). All routes under `/api`:

- `/api/controllers` — Raspberry Pi controller management
- `/api/devices` — GPIO device management (devices owned by Controller)
- `/api/sensors` — sensor inventory per Controller
- `/api/grow-cycles` — grow cycle scheduling
- `/api/grow-phases` — phase management with day/night clock schedule
- `/api/grow-phases/:id/environment` — per-phase DAY/NIGHT environmental thresholds
- `/api/automation-rules` — explicit per-device trigger rules (lights on day/night schedule, fans/heaters on thresholds, etc.)
- `/api/telemetry` — sensor telemetry ingestion and queries

Day/night cycles, per-phase thresholds, and rule-based device control (lights, fans, heater, humidifier, CO2 injector) are described in [`API.md`](./API.md).

## Docker

```bash
docker compose up
```

Runs MQTT broker, the server, and PostgreSQL. Note: server listens on port **4000** (the Dockerfile `EXPOSE 3000` is outdated).
