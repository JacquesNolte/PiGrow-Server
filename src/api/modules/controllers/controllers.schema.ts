import { Type } from "@sinclair/typebox";
import { ErrorSchema } from "../../shared/schemas.js";

const SensorTypeSchema = Type.Union([
  Type.Literal("HUMIDITY"),
  Type.Literal("TEMPERATURE"),
  Type.Literal("TEMP_HUMIDITY"),
  Type.Literal("CO2"),
  Type.Literal("PH"),
  Type.Literal("EC"),
]);

const SensorProtocolSchema = Type.Union([
  Type.Literal("I2C"),
  Type.Literal("SPI"),
  Type.Literal("UART"),
  Type.Literal("RS485"),
]);

const PeriodSchema = Type.Union([Type.Literal("DAY"), Type.Literal("NIGHT")]);

const NullableNumber = Type.Optional(Type.Union([Type.Number(), Type.Null()]));

const PhaseEnvironmentSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  growPhaseId: Type.String({ format: "uuid" }),
  period: PeriodSchema,
  tempMin: NullableNumber,
  tempMax: NullableNumber,
  tempTarget: NullableNumber,
  humidityMin: NullableNumber,
  humidityMax: NullableNumber,
  humidityTarget: NullableNumber,
  co2Min: NullableNumber,
  co2Max: NullableNumber,
  co2Target: NullableNumber,
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

const GrowPhaseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  growCycleId: Type.String({ format: "uuid" }),
  name: Type.String(),
  order: Type.Integer(),
  durationDays: Type.Integer(),
  isActive: Type.Boolean(),
  startAt: Type.Union([Type.String({ format: "date" }), Type.Null()]),
  endAt: Type.Union([Type.String({ format: "date" }), Type.Null()]),
  dayStartMinutes: Type.Integer(),
  dayDurationMinutes: Type.Integer(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
  environments: Type.Optional(Type.Array(PhaseEnvironmentSchema)),
});

const GrowCycleSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  controllerId: Type.String({ format: "uuid" }),
  name: Type.String(),
  isActive: Type.Boolean(),
  startAt: Type.Union([Type.String({ format: "date" }), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

const DeviceSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  controllerId: Type.String({ format: "uuid" }),
  name: Type.String(),
  type: Type.Union([
    Type.Literal("LIGHT"),
    Type.Literal("EXHAUST_FAN"),
    Type.Literal("INTAKE_FAN"),
    Type.Literal("CIRCULATION_FAN"),
    Type.Literal("WATER_PUMP"),
    Type.Literal("AIR_CONDITIONER"),
    Type.Literal("HEATER"),
    Type.Literal("HUMIDIFIER"),
    Type.Literal("DEHUMIDIFIER"),
    Type.Literal("CO2_INJECTOR"),
  ]),
  pinNumber: Type.Integer(),
  mqttTopic: Type.String(),
  automationMode: Type.Union([
    Type.Literal("MANUAL"),
    Type.Literal("SCHEDULED"),
    Type.Literal("THRESHOLD"),
    Type.Literal("ALWAYS_ON"),
    Type.Literal("ALWAYS_OFF"),
  ]),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

const SensorSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  controllerId: Type.String({ format: "uuid" }),
  name: Type.String(),
  type: SensorTypeSchema,
  mqttTopic: Type.String(),
  pinNumbers: Type.Array(Type.Integer()),
  protocol: SensorProtocolSchema,
  lastActive: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export const ControllerResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  macAddress: Type.String(),
  ipAddress: Type.String(),
  name: Type.String(),
  status: Type.String({
    description: 'Controller reachability. One of "ONLINE" | "OFFLINE" | "ERROR".',
  }),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export const ControllerDetailResponseSchema = Type.Object({
  ...ControllerResponseSchema.properties,
  growCycles: Type.Optional(
    Type.Array(
      Type.Object({
        ...GrowCycleSchema.properties,
        phases: Type.Optional(Type.Array(GrowPhaseSchema)),
      }),
    ),
  ),
  devices: Type.Optional(Type.Array(DeviceSchema)),
  sensors: Type.Optional(Type.Array(SensorSchema)),
});

export const ControllersArrayResponseSchema = Type.Array(
  ControllerResponseSchema,
);

export const ControllerCreateResponseSchema = Type.Object({
  ...ControllerResponseSchema.properties,
  sensors: Type.Optional(Type.Array(SensorSchema)),
});

export const SeedSensorSchema = Type.Object({
  name: Type.String({ maxLength: 100 }),
  type: SensorTypeSchema,
  mqttTopic: Type.String({ maxLength: 200 }),
  pinNumbers: Type.Array(Type.Integer({ minimum: 0, maximum: 40 })),
  protocol: SensorProtocolSchema,
});

// Schema for registering a new physical Raspberry Pi hub
export const CreateControllerSchema = Type.Object({
  macAddress: Type.String({
    pattern: "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$",
    description:
      "Valid standard network MAC Address string (e.g., b8:27:eb:bf:d3:42)",
  }),
  name: Type.String({
    maxLength: 100,
    description:
      "Descriptive label for identifying the tent deployment location",
  }),
  ipAddress: Type.String({
    format: "ipv4",
    description: "The local network IP of the active Raspberry Pi client node",
  }),
  sensors: Type.Optional(
    Type.Array(SeedSensorSchema, {
      description:
        "Optional list of physical sensors to seed on the controller at registration time. Sensors can be added, updated, or removed later via the /api/sensors endpoints.",
    }),
  ),
});

// Schema for updating basic server-side hub parameters
export const UpdateControllerSchema = Type.Object({
  name: Type.Optional(Type.String({ maxLength: 100 })),
  status: Type.Optional(
    Type.Union([
      Type.Literal("ONLINE"),
      Type.Literal("OFFLINE"),
      Type.Literal("ERROR"),
    ]),
  ),
});

export const ControllerParamsIdSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

// Schema for Pi status heartbeat reporting
export const HeartbeatSchema = Type.Object({
  status: Type.Union([Type.Literal("ONLINE"), Type.Literal("OFFLINE")]),
});

export { ErrorSchema };
