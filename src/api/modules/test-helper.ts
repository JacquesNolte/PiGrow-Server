import Fastify from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

// Import your modules directly from their structural folders
import controllerRoutes from "./controllers/controllers.route.js";
import deviceRoutes from "./devices/devices.routes.js";
import growPhaseRoutes from "./grow-phases/grow-phases.routes.js";
import phaseEnvironmentRoutes from "./phase-environments/phase-environments.routes.js";
import automationRuleRoutes from "./automation-rules/automation-rules.routes.js";
import growCycleRoutes from "./grow-cycles/grow-cycles.routes.js";
import sensorRoutes from "./sensors/sensors.routes.js";
import telemetryRoutes from "./telemetry/telemetry.routes.js";
import { prisma, closeDatabase } from "../../prisma.js";
import { endMqtt } from "../../mqtt/client.js";

export async function createTestApp() {
  const server = Fastify({
    ajv: {
      customOptions: {
        coerceTypes: false,
        removeAdditional: false,
        useDefaults: true,
      },
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Attach a clean instance of your database client
  server.decorate("prisma", prisma);

  // Unify all route clusters under the test execution context
  await server.register(controllerRoutes);
  await server.register(deviceRoutes);
  await server.register(growCycleRoutes);
  await server.register(growPhaseRoutes);
  await server.register(phaseEnvironmentRoutes);
  await server.register(automationRuleRoutes);
  await server.register(sensorRoutes);
  await server.register(telemetryRoutes);

  await server.ready();

  return { server, prisma };
}

// Tear down both the Fastify instance and the underlying pg pool so the
// Node test process can exit cleanly. Without `closeDatabase()` the pg
// pool keeps an idle connection alive, which makes `node --test` log
// "Promise resolution is still pending" and wait 30-60s per file.
export async function teardownTestApp(server: any): Promise<void> {
  if (server && typeof server.close === "function") {
    try {
      // Fastify's close is idempotent and resolves immediately when the
      // server is already closed, so this is safe to call from any `after`.
      await Promise.race([
        server.close(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // ignore — best effort
    }
  }
  await Promise.all([closeDatabase(), endMqtt()]);
}
