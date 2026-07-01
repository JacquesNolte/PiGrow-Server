import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { ControllersController } from "../controllers/controllers.controller.js";
import {
  ControllerParamsIdSchema,
  CreateControllerSchema,
  UpdateControllerSchema,
  HeartbeatSchema,
  ControllersArrayResponseSchema,
  ControllerDetailResponseSchema,
  ControllerResponseSchema,
  ControllerCreateResponseSchema,
  ErrorSchema,
} from "./controllers.schema.js";
import { cast } from "../../shared/cast.js";

export default async function controllerRoutes(server: FastifyInstance) {
  const router = server.withTypeProvider<TypeBoxTypeProvider>();
  const controller = new ControllersController(server);

  // 1. GET ALL REGISTERED RASPBERRY PIS
  router.get(
    "/api/controllers",
    {
      schema: {
        tags: ["Controllers"],
        summary: "List all registered controllers",
        description:
          "Returns every Raspberry Pi hub known to the server, ordered newest-first by `createdAt`.",
        response: {
          200: ControllersArrayResponseSchema,
        },
      },
    },
    async () => {
      return cast<typeof ControllersArrayResponseSchema.static>(
        await controller.getAllControllers(),
      );
    },
  );

  // 2. GET SINGLE HUBS SYSTEM TOPOLOGY
  router.get(
    "/api/controllers/:id",
    {
      schema: {
        tags: ["Controllers"],
        summary: "Get one controller with its topology",
        description:
          "Returns the controller plus its active grow cycle (with the active phase and its DAY/NIGHT environments), its persistent device inventory, and its sensor inventory.",
        params: ControllerParamsIdSchema,
        response: {
          200: ControllerDetailResponseSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return cast<typeof ControllerDetailResponseSchema.static>(
          await controller.getControllerById(request.params.id),
        );
      } catch (error) {
        return reply
          .code(404)
          .send({ error: "Raspberry Pi configuration profile not found" });
      }
    },
  );

  // 3. REGISTER / HEARTBEAT PROVISION APPARATUS
  router.post(
    "/api/controllers",
    {
      schema: {
        tags: ["Controllers"],
        summary: "Register or upsert a controller",
        description:
          "Creates a new controller record, or — if a controller with the same `macAddress` already exists — returns the existing record (sensors are only seeded on the first create).",
        body: CreateControllerSchema,
        response: {
          201: ControllerCreateResponseSchema,
          400: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const hardwareHub = await controller.createController(request.body);
        return reply.code(201).send(
          cast<typeof ControllerCreateResponseSchema.static>(hardwareHub),
        );
      } catch (error) {
        server.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to map controller network identity" });
      }
    },
  );

  // 4. ALTER METADATA OR STATUS SIGNAL
  router.put(
    "/api/controllers/:id",
    {
      schema: {
        tags: ["Controllers"],
        summary: "Update controller metadata or status",
        params: ControllerParamsIdSchema,
        body: UpdateControllerSchema,
        response: {
          200: ControllerResponseSchema,
          400: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return cast<typeof ControllerResponseSchema.static>(
          await controller.updateController(request.params.id, request.body),
        );
      } catch (error) {
        server.log.error(error);
        return reply
          .code(400)
          .send({ error: "Unable to reconcile device parameters" });
      }
    },
  );

  // 5. UNREGISTER HUB APPARATUS
  router.delete(
    "/api/controllers/:id",
    {
      schema: {
        tags: ["Controllers"],
        summary: "Unregister a controller",
        params: ControllerParamsIdSchema,
        response: {
          204: Type.Null({ description: "Controller deleted (no content)" }),
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        await controller.deleteController(request.params.id);
        return reply.code(204).send(null);
      } catch (error) {
        return reply.code(404).send({ error: "Profile unlinking rejected" });
      }
    },
  );

  // 6. PI HEARTBEAT STATUS REPORTING
  router.patch(
    "/api/controllers/:id/heartbeat",
    {
      schema: {
        tags: ["Controllers"],
        summary: "Receive a Pi heartbeat status update",
        description:
          "Lightweight endpoint the Pi client calls periodically to announce ONLINE / OFFLINE status.",
        params: ControllerParamsIdSchema,
        body: HeartbeatSchema,
        response: {
          200: ControllerResponseSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return cast<typeof ControllerResponseSchema.static>(
          await controller.heartbeat(request.params.id, request.body.status),
        );
      } catch (error) {
        return reply
          .code(404)
          .send({ error: "Controller not found for heartbeat update" });
      }
    },
  );
}
