import { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { DevicesController } from "./devices.controller.js";
import {
  DeviceParamsControllerIdSchema,
  DeviceParamsIdSchema,
  CreateDeviceSchema,
  BatchCreateDeviceSchema,
  UpdateDeviceSchema,
  DeviceCommandSchema,
  DeviceArrayResponseSchema,
  DeviceResponseSchema,
  DeviceDetailResponseSchema,
  DeviceCommandResponseSchema,
  ErrorSchema,
} from "./devices.schema.js";
import { cast } from "../../shared/cast.js";

export default async function deviceRoutes(server: FastifyInstance) {
  const router = server.withTypeProvider<TypeBoxTypeProvider>();
  const controller = new DevicesController(server);

  // 1. LIST persistent hardware for a controller
  router.get(
    "/api/devices/controller/:controllerId",
    {
      schema: {
        tags: ["Devices"],
        summary: "List devices on a controller",
        description:
          "Returns every device (relay / actuator) attached to the given controller, ordered by `pinNumber` ascending.",
        params: DeviceParamsControllerIdSchema,
        response: { 200: DeviceArrayResponseSchema, 400: ErrorSchema },
      },
    },
    async (request, reply) => {
      try {
        return cast<typeof DeviceArrayResponseSchema.static>(
          await controller.getDevicesByControllerId(
            request.params.controllerId,
          ),
        );
      } catch (error) {
        return reply
          .code(400)
          .send({ error: "Failed to load hardware profiles" });
      }
    },
  );

  // 2. GET a single device
  router.get(
    "/api/devices/:id",
    {
      schema: {
        tags: ["Devices"],
        summary: "Get one device with its controller summary",
        params: DeviceParamsIdSchema,
        response: {
          200: DeviceDetailResponseSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return cast<typeof DeviceDetailResponseSchema.static>(
          await controller.getDeviceById(request.params.id),
        );
      } catch (error) {
        return reply
          .code(404)
          .send({ error: "Physical hardware device not found" });
      }
    },
  );

  // 3. PROVISION a device on a controller
  router.post(
    "/api/devices",
    {
      schema: {
        tags: ["Devices"],
        summary: "Provision a new device",
        body: CreateDeviceSchema,
        response: {
          201: DeviceResponseSchema,
          400: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const newDevice = await controller.createDevice(request.body);
        return reply.code(201).send(
          cast<typeof DeviceResponseSchema.static>(newDevice),
        );
      } catch (error) {
        server.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to map new hardware device" });
      }
    },
  );

  // 4. BULK PROVISION
  router.post(
    "/api/devices/batch",
    {
      schema: {
        tags: ["Devices"],
        summary: "Bulk-provision several devices on a controller",
        body: BatchCreateDeviceSchema,
        response: {
          201: DeviceArrayResponseSchema,
          400: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const newDevices = await controller.createDevicesBatch(request.body);
        return reply.code(201).send(
          cast<typeof DeviceArrayResponseSchema.static>(newDevices),
        );
      } catch (error) {
        server.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to map batch hardware devices" });
      }
    },
  );

  // 5. UPDATE device configuration
  router.put(
    "/api/devices/:id",
    {
      schema: {
        tags: ["Devices"],
        summary: "Update device configuration",
        params: DeviceParamsIdSchema,
        body: UpdateDeviceSchema,
        response: {
          200: DeviceResponseSchema,
          400: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return cast<typeof DeviceResponseSchema.static>(
          await controller.updateDevice(request.params.id, request.body),
        );
      } catch (error) {
        server.log.error(error);
        return reply
          .code(400)
          .send({ error: "Hardware parameter update rejected" });
      }
    },
  );

  // 6. DELETE
  router.delete(
    "/api/devices/:id",
    {
      schema: {
        tags: ["Devices"],
        summary: "Delete a device",
        params: DeviceParamsIdSchema,
        response: {
          204: Type.Null({ description: "Device deleted (no content)" }),
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        await controller.deleteDevice(request.params.id);
        return reply.code(204).send(null);
      } catch (error) {
        return reply.code(404).send({ error: "Hardware profile deletion failed" });
      }
    },
  );

  // 7. SEND ON/OFF COMMAND (source = MANUAL)
  router.post(
    "/api/devices/:id/command",
    {
      schema: {
        tags: ["Devices"],
        summary: "Send an immediate ON/OFF command",
        description:
          "Persists a MANUAL DeviceStateLog row, updates the device's `isActive`, and publishes the MQTT command to the Pi.",
        params: DeviceParamsIdSchema,
        body: DeviceCommandSchema,
        response: {
          200: DeviceCommandResponseSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return cast<typeof DeviceCommandResponseSchema.static>(
          await controller.sendCommand(
            request.params.id,
            request.body.action,
          ),
        );
      } catch (error) {
        return reply
          .code(404)
          .send({ error: "Device command dispatch failed" });
      }
    },
  );
}
