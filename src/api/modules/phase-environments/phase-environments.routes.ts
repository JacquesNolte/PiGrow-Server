import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { PhaseEnvironmentsController } from "./phase-environments.controller.js";
import {
  PhaseEnvironmentPeriodParamsSchema,
  PhaseEnvironmentPhaseParamsSchema,
  UpsertPhaseEnvironmentSchema,
} from "./phase-environments.schema.js";

export default async function phaseEnvironmentRoutes(server: FastifyInstance) {
  const router = server.withTypeProvider<TypeBoxTypeProvider>();
  const controller = new PhaseEnvironmentsController(server);

  // 1. GET both DAY + NIGHT environment rows for a phase
  router.get(
    "/api/grow-phases/:growPhaseId/environment",
    { schema: { params: PhaseEnvironmentPhaseParamsSchema } },
    async (request, reply) => {
      try {
        return await controller.getByPhaseId(request.params.growPhaseId);
      } catch (error) {
        const status =
          (error as { statusCode?: number })?.statusCode ?? 400;
        const msg =
          status === 404
            ? "Grow phase record not found"
            : "Failed to load phase environment";
        return reply.code(status).send({ error: msg });
      }
    },
  );

  // 2. UPSERT a single period (DAY or NIGHT)
  router.put(
    "/api/grow-phases/:growPhaseId/environment/:period",
    {
      schema: {
        params: PhaseEnvironmentPeriodParamsSchema,
        body: UpsertPhaseEnvironmentSchema,
      },
    },
    async (request, reply) => {
      try {
        return await controller.upsert(
          request.params.growPhaseId,
          request.params.period,
          request.body,
        );
      } catch (error) {
        const status =
          (error as { statusCode?: number })?.statusCode ?? 400;
        const msg =
          status === 404
            ? "Grow phase record not found"
            : "Failed to upsert phase environment";
        return reply.code(status).send({ error: msg });
      }
    },
  );

  // 3. DELETE a period row
  router.delete(
    "/api/grow-phases/:growPhaseId/environment/:period",
    { schema: { params: PhaseEnvironmentPeriodParamsSchema } },
    async (request, reply) => {
      try {
        await controller.remove(
          request.params.growPhaseId,
          request.params.period,
        );
        return reply.code(204).send();
      } catch (error) {
        const status =
          (error as { statusCode?: number })?.statusCode ?? 400;
        const msg =
          status === 404
            ? "Phase environment row not found"
            : "Failed to delete phase environment";
        return reply.code(status).send({ error: msg });
      }
    },
  );
}
