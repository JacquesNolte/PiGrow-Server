import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { CyclesController } from "./cycles.controller.js";
import {
  CreateCycleSchema,
  UpdateCycleSchema,
  ParamsIdSchema,
} from "./cycles.schema.js";

export default async function cycleRoutes(server: FastifyInstance) {
  const router = server.withTypeProvider<TypeBoxTypeProvider>();

  // Instantiate the controller exactly once for this group of routes
  const controller = new CyclesController(server);

  // READ ALL
  router.get("/cycles", async (request, reply) => {
    return await controller.getAllCycles();
  });

  // READ ONE
  router.get(
    "/cycle/:id",
    { schema: { params: ParamsIdSchema } },
    async (request, reply) => {
      try {
        return await controller.getCycleById(request.params.id);
      } catch (error) {
        return reply.code(404).send({ error: "Cycle record not found" });
      }
    },
  );

  // CREATE
  router.post(
    "/cycle",
    { schema: { body: CreateCycleSchema } },
    async (request, reply) => {
      try {
        const newCycle = await controller.createCycle(request.body);
        return reply.code(201).send(newCycle);
      } catch (error) {
        router.log.error(error);
        return reply.code(400).send({ error: "Failed to create cycle record" });
      }
    },
  );

  // UPDATE
  router.put(
    "/cycle/:id",
    { schema: { params: ParamsIdSchema, body: UpdateCycleSchema } },
    async (request, reply) => {
      try {
        return await controller.updateCycle(request.params.id, request.body);
      } catch (error) {
        router.log.error(error);
        return reply.code(400).send({ error: "Failed to update cycle record" });
      }
    },
  );

  // DELETE
  router.delete(
    "/cycle/:id",
    { schema: { params: ParamsIdSchema } },
    async (request, reply) => {
      try {
        await controller.deleteCycle(request.params.id);
        return reply.code(204).send();
      } catch (error) {
        return reply.code(404).send({ error: "Record could not be deleted" });
      }
    },
  );
}
