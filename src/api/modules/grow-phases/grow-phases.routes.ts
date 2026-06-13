import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { GrowPhasesController } from "./grow-phases.controller.js";
import {
  CreateGrowPhaseSchema,
  UpdateGrowPhaseSchema,
  GrowPhaseParamsIdSchema,
  GrowPhaseParamsCycleIdSchema,
} from "./grow-phases.schema.js";

export default async function growPhaseRoutes(server: FastifyInstance) {
  const router = server.withTypeProvider<TypeBoxTypeProvider>();

  // Instantiate the controller exactly once for this group of routes
  const controller = new GrowPhasesController(server);

  // 1. READ ALL PHASES FOR A SPECIFIC GROW CYCLE
  router.get(
    "/grow-phases/cycle/:growCycleId",
    { schema: { params: GrowPhaseParamsCycleIdSchema } },
    async (request, reply) => {
      try {
        return await controller.getPhasesByCycleId(request.params.growCycleId);
      } catch (error) {
        router.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to retrieve phases for this cycle" });
      }
    },
  );

  // 2. READ ONE INDIVIDUAL PHASE
  router.get(
    "/grow-phase/:id",
    { schema: { params: GrowPhaseParamsIdSchema } },
    async (request, reply) => {
      try {
        return await controller.getGrowPhaseById(request.params.id);
      } catch (error) {
        return reply.code(404).send({ error: "Grow phase record not found" });
      }
    },
  );

  // 3. CREATE A CUSTOM PHASE MANUALLY
  router.post(
    "/grow-phase",
    { schema: { body: CreateGrowPhaseSchema } },
    async (request, reply) => {
      try {
        const newPhase = await controller.createGrowPhase(request.body);
        return reply.code(201).send(newPhase);
      } catch (error) {
        router.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to create grow phase record" });
      }
    },
  );

  // 4. UPDATE A PHASE'S TARGET PARAMETERS
  router.put(
    "/grow-phase/:id",
    {
      schema: { params: GrowPhaseParamsIdSchema, body: UpdateGrowPhaseSchema },
    },
    async (request, reply) => {
      try {
        return await controller.updateGrowPhase(
          request.params.id,
          request.body,
        );
      } catch (error) {
        router.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to update grow phase record" });
      }
    },
  );

  // 5. DELETE A PHASE
  router.delete(
    "/grow-phase/:id",
    { schema: { params: GrowPhaseParamsIdSchema } },
    async (request, reply) => {
      try {
        await controller.deleteGrowPhase(request.params.id);
        return reply.code(204).send();
      } catch (error) {
        return reply.code(404).send({ error: "Record could not be deleted" });
      }
    },
  );
}
