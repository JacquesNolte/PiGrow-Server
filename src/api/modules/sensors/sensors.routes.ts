import { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { SensorsController } from "./sensors.controller.js";
import {
  CreateSensorSchema,
  SensorParamsControllerIdSchema,
  SensorParamsIdSchema,
  UpdateSensorSchema,
  SensorArrayResponseSchema,
  SensorResponseSchema,
  SensorDetailResponseSchema,
  ErrorSchema,
} from "./sensors.schema.js";
import { cast } from "../../shared/cast.js";

export default async function sensorRoutes(server: FastifyInstance) {
  const router = server.withTypeProvider<TypeBoxTypeProvider>();
  const controller = new SensorsController(server);

  // 1. LIST SENSORS FOR A CONTROLLER
  router.get(
    "/api/sensors/controller/:controllerId",
    {
      schema: {
        tags: ["Sensors"],
        summary: "List sensors on a controller",
        description: "Returns every sensor probe attached to the given controller, ordered by `createdAt` ascending.",
        params: SensorParamsControllerIdSchema,
        response: { 200: SensorArrayResponseSchema, 400: ErrorSchema },
      },
    },
    async (request, reply) => {
      try {
        return cast<typeof SensorArrayResponseSchema.static>(
          await controller.getSensorsByControllerId(request.params.controllerId),
        );
      } catch (error) {
        return reply
          .code(400)
          .send({ error: "Failed to load sensor inventory" });
      }
    },
  );

  // 2. GET A SINGLE SENSOR
  router.get(
    "/api/sensors/:id",
    {
      schema: {
        tags: ["Sensors"],
        summary: "Get one sensor with its parent controller summary",
        params: SensorParamsIdSchema,
        response: {
          200: SensorDetailResponseSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return cast<typeof SensorDetailResponseSchema.static>(
          await controller.getSensorById(request.params.id),
        );
      } catch (error) {
        return reply.code(404).send({ error: "Sensor not found" });
      }
    },
  );

  // 3. PROVISION A NEW SENSOR
  router.post(
    "/api/sensors",
    {
      schema: {
        tags: ["Sensors"],
        summary: "Provision a new sensor on a controller",
        body: CreateSensorSchema,
        response: {
          201: SensorResponseSchema,
          400: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const sensor = await controller.createSensor(request.body);
        return reply.code(201).send(
          cast<typeof SensorResponseSchema.static>(sensor),
        );
      } catch (error) {
        server.log.error(error);
        return reply.code(400).send({ error: "Failed to register sensor" });
      }
    },
  );

  // 4. UPDATE SENSOR CONFIGURATION
  router.put(
    "/api/sensors/:id",
    {
      schema: {
        tags: ["Sensors"],
        summary: "Update sensor configuration",
        params: SensorParamsIdSchema,
        body: UpdateSensorSchema,
        response: {
          200: SensorResponseSchema,
          400: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return cast<typeof SensorResponseSchema.static>(
          await controller.updateSensor(request.params.id, request.body),
        );
      } catch (error) {
        server.log.error(error);
        return reply
          .code(400)
          .send({ error: "Failed to update sensor configuration" });
      }
    },
  );

  // 5. REMOVE A SENSOR
  router.delete(
    "/api/sensors/:id",
    {
      schema: {
        tags: ["Sensors"],
        summary: "Delete a sensor (cascades to telemetry)",
        params: SensorParamsIdSchema,
        response: {
          204: Type.Null({ description: "Sensor deleted (no content)" }),
          404: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        await controller.deleteSensor(request.params.id);
        return reply.code(204).send(null);
      } catch (error) {
        return reply.code(404).send({ error: "Sensor deletion failed" });
      }
    },
  );
}
