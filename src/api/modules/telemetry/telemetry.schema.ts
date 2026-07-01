import { Type } from "@sinclair/typebox";
import { ErrorSchema } from "../../shared/schemas.js";

export const TelemetrySensorTypeSchema = Type.Union([
  Type.Literal("HUMIDITY"),
  Type.Literal("TEMPERATURE"),
  Type.Literal("TEMP_HUMIDITY"),
  Type.Literal("CO2"),
  Type.Literal("PH"),
  Type.Literal("EC"),
]);

export const TelemetryResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  growCycleId: Type.String({ format: "uuid" }),
  sensorId: Type.String({ format: "uuid" }),
  sensorType: TelemetrySensorTypeSchema,
  value: Type.Number(),
  createdAt: Type.String({ format: "date-time" }),
  sensor: Type.Object({
    id: Type.String({ format: "uuid" }),
    name: Type.String(),
    type: TelemetrySensorTypeSchema,
    protocol: Type.Union([
      Type.Literal("I2C"),
      Type.Literal("SPI"),
      Type.Literal("UART"),
      Type.Literal("RS485"),
    ]),
  }),
});

export const TelemetryArrayResponseSchema = Type.Array(
  TelemetryResponseSchema,
);

export const CreateTelemetrySchema = Type.Object({
  growCycleId: Type.String({
    format: "uuid",
    description: "The grow cycle this telemetry reading belongs to",
  }),
  sensorId: Type.String({
    format: "uuid",
    description: "The physical sensor that produced this reading",
  }),
  sensorType: TelemetrySensorTypeSchema,
  value: Type.Number({
    description: "The sensor reading value",
  }),
});

export const TelemetryParamsGrowCycleIdSchema = Type.Object({
  growCycleId: Type.String({ format: "uuid" }),
});

export const TelemetryRangeQuerySchema = Type.Object({
  from: Type.String({
    format: "date-time",
    description: "ISO 8601 start timestamp (inclusive)",
  }),
  to: Type.String({
    format: "date-time",
    description: "ISO 8601 end timestamp (inclusive)",
  }),
});

export { ErrorSchema };
