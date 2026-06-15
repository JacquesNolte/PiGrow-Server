import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { GrowCyclesController } from "./grow-cycles.controller.js";
import {
  CreateGrowCycleSchema,
  UpdateGrowCycleSchema,
  GrowCycleParamsIdSchema,
} from "./grow-cycles.schema.js";

export default async function growCycleRoutes(server: FastifyInstance) {
  const router = server.withTypeProvider<TypeBoxTypeProvider>();

  // Instantiate the controller exactly once for this group of routes
  const controller = new GrowCyclesController(server);

  // 1. READ ALL
  router.get("/api/grow-cycles", async (request, reply) => {
    return await controller.getAllGrowCycles();
  });

  // 2. READ ONE
  router.get(
    "/api/grow-cycles/:id",
    { schema: { params: GrowCycleParamsIdSchema } },
    async (request, reply) => {
      try {
        return await controller.getGrowCycleById(request.params.id);
      } catch (error) {
        return reply.code(404).send({ error: "Grow cycle record not found" });
      }
    },
  );

  // 3. CREATE
  router.post(
    "/api/grow-cycles",
    { schema: { body: CreateGrowCycleSchema } },
    async (request, reply) => {
      try {
        const newGrowCycle = await controller.createGrowCycle(request.body);
        return reply.code(201).send(newGrowCycle);
      } catch (error) {
        router.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to create grow cycle record" });
      }
    },
  );

  // 4. UPDATE
  router.put(
    "/api/grow-cycles/:id",
    {
      schema: { params: GrowCycleParamsIdSchema, body: UpdateGrowCycleSchema },
    },
    async (request, reply) => {
      try {
        return await controller.updateGrowCycle(
          request.params.id,
          request.body,
        );
      } catch (error) {
        router.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to update grow cycle record" });
      }
    },
  );

  // 5. DELETE
  router.delete(
    "/api/grow-cycles/:id",
    { schema: { params: GrowCycleParamsIdSchema } },
    async (request, reply) => {
      try {
        await controller.deleteGrowCycle(request.params.id);
        return reply.code(204).send();
      } catch (error) {
        return reply.code(404).send({ error: "Record could not be deleted" });
      }
    },
  );
}
