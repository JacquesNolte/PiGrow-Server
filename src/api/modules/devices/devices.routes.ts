import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { DevicesController } from "./devices.controller.js";
import {
  DeviceParamsControllerIdSchema,
  DeviceParamsIdSchema,
  CreateDeviceSchema,
  UpdateDeviceSchema,
} from "./devices.schema.js";

export default async function deviceRoutes(server: FastifyInstance) {
  const router = server.withTypeProvider<TypeBoxTypeProvider>();
  const controller = new DevicesController(server);

  // 1. GET ALL HARDWARE ASSIGNED TO A SPECIFIC PI
  router.get(
    "/devices/controller/:controllerId",
    { schema: { params: DeviceParamsControllerIdSchema } },
    async (request, reply) => {
      try {
        return await controller.getDevicesByControllerId(
          request.params.controllerId,
        );
      } catch (error) {
        return reply
          .code(400)
          .send({ error: "Failed to load hardware profiles" });
      }
    },
  );

  // 2. GET SINGLE DEVICE SPECIFICATIONS
  router.get(
    "/device/:id",
    { schema: { params: DeviceParamsIdSchema } },
    async (request, reply) => {
      try {
        return await controller.getDeviceById(request.params.id);
      } catch (error) {
        return reply
          .code(404)
          .send({ error: "Physical hardware device not found" });
      }
    },
  );

  // 3. PROVISION A NEW DEVICE ONTO A PI
  router.post(
    "/device",
    { schema: { body: CreateDeviceSchema } },
    async (request, reply) => {
      try {
        const newDevice = await controller.createDevice(request.body);
        return reply.code(201).send(newDevice);
      } catch (error) {
        server.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to map new hardware device" });
      }
    },
  );

  // 4. CHANGE DEVICE CONFIGURATION OR GPIO PIN
  router.put(
    "/device/:id",
    { schema: { params: DeviceParamsIdSchema, body: UpdateDeviceSchema } },
    async (request, reply) => {
      try {
        return await controller.updateDevice(request.params.id, request.body);
      } catch (error) {
        server.log.error(error);
        return reply
          .code(400)
          .send({ error: "Hardware parameter update rejected" });
      }
    },
  );

  // 5. UNMAP / REMOVE A DEVICE
  router.delete(
    "/device/:id",
    { schema: { params: DeviceParamsIdSchema } },
    async (request, reply) => {
      try {
        await controller.deleteDevice(request.params.id);
        return reply.code(204).send();
      } catch (error) {
        return reply
          .code(404)
          .send({ error: "Hardware profile deletion failed" });
      }
    },
  );
}
