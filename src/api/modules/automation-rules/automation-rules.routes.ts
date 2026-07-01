import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  AutomationRulesController,
  AutomationRulesError,
} from "./automation-rules.controller.js";
import {
  AutomationRuleIdParamsSchema,
  AutomationRuleGrowCycleParamsSchema,
  AutomationRuleGrowPhaseParamsSchema,
  AutomationRuleDeviceParamsSchema,
  CreateAutomationRuleSchema,
  UpdateAutomationRuleSchema,
} from "./automation-rules.schema.js";

export default async function automationRuleRoutes(server: FastifyInstance) {
  const router = server.withTypeProvider<TypeBoxTypeProvider>();
  const controller = new AutomationRulesController(server);

  // 1. LIST by grow cycle
  router.get(
    "/api/automation-rules/grow-cycle/:growCycleId",
    { schema: { params: AutomationRuleGrowCycleParamsSchema } },
    async (request, reply) => {
      try {
        return await controller.getByGrowCycleId(request.params.growCycleId);
      } catch (error) {
        return reply.code(400).send({ error: "Failed to load automation rules" });
      }
    },
  );

  // 2. LIST by grow phase
  router.get(
    "/api/automation-rules/grow-phase/:growPhaseId",
    { schema: { params: AutomationRuleGrowPhaseParamsSchema } },
    async (request, reply) => {
      try {
        return await controller.getByGrowPhaseId(request.params.growPhaseId);
      } catch (error) {
        return reply.code(400).send({ error: "Failed to load automation rules" });
      }
    },
  );

  // 3. LIST by device
  router.get(
    "/api/automation-rules/device/:deviceId",
    { schema: { params: AutomationRuleDeviceParamsSchema } },
    async (request, reply) => {
      try {
        return await controller.getByDeviceId(request.params.deviceId);
      } catch (error) {
        return reply.code(400).send({ error: "Failed to load automation rules" });
      }
    },
  );

  // 4. CREATE
  router.post(
    "/api/automation-rules",
    { schema: { body: CreateAutomationRuleSchema } },
    async (request, reply) => {
      try {
        const rule = await controller.create(request.body);
        return reply.code(201).send(rule);
      } catch (error) {
        if (error instanceof AutomationRulesError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: string }).code === "P2003"
        ) {
          return reply
            .code(400)
            .send({ error: "growCycleId, growPhaseId, or deviceId does not exist" });
        }
        server.log.error(error);
        return reply.code(400).send({ error: "Failed to create automation rule" });
      }
    },
  );

  // 5. UPDATE
  router.put(
    "/api/automation-rules/:id",
    {
      schema: {
        params: AutomationRuleIdParamsSchema,
        body: UpdateAutomationRuleSchema,
      },
    },
    async (request, reply) => {
      try {
        return await controller.update(request.params.id, request.body);
      } catch (error) {
        if (error instanceof AutomationRulesError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: string }).code === "P2025"
        ) {
          return reply.code(404).send({ error: "Automation rule not found" });
        }
        server.log.error(error);
        return reply.code(400).send({ error: "Failed to update automation rule" });
      }
    },
  );

  // 6. TOGGLE enabled
  router.patch(
    "/api/automation-rules/:id/toggle",
    { schema: { params: AutomationRuleIdParamsSchema } },
    async (request, reply) => {
      try {
        return await controller.toggle(request.params.id);
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: string }).code === "P2025"
        ) {
          return reply.code(404).send({ error: "Automation rule not found" });
        }
        return reply.code(400).send({ error: "Failed to toggle automation rule" });
      }
    },
  );

  // 7. DELETE
  router.delete(
    "/api/automation-rules/:id",
    { schema: { params: AutomationRuleIdParamsSchema } },
    async (request, reply) => {
      try {
        await controller.remove(request.params.id);
        return reply.code(204).send();
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: string }).code === "P2025"
        ) {
          return reply.code(404).send({ error: "Automation rule not found" });
        }
        return reply.code(400).send({ error: "Failed to delete automation rule" });
      }
    },
  );
}
