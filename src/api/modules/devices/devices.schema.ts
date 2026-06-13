import { Type } from "@sinclair/typebox";

// Explicit string literals matching your Prisma DeviceType enum
const DeviceTypeEnum = Type.Union([
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
]);

// Schema for provisioning a new physical device on a Pi
export const CreateDeviceSchema = Type.Object({
  controllerId: Type.String({ format: "uuid" }),
  name: Type.String({ maxLength: 100 }),
  type: DeviceTypeEnum,
  pinNumber: Type.Integer({ minimum: 0, maximum: 40 }), // Valid Raspberry Pi GPIO map
  mqttTopic: Type.String({ maxLength: 150 }),
  isActive: Type.Optional(Type.Boolean({ default: true })),
});

// Schema for modifying hardware parameters
export const UpdateDeviceSchema = Type.Object({
  name: Type.Optional(Type.String({ maxLength: 100 })),
  type: Type.Optional(DeviceTypeEnum),
  pinNumber: Type.Optional(Type.Integer({ minimum: 0, maximum: 40 })),
  mqttTopic: Type.Optional(Type.String({ maxLength: 150 })),
  isActive: Type.Optional(Type.Boolean()),
});

export const DeviceParamsIdSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export const DeviceParamsControllerIdSchema = Type.Object({
  controllerId: Type.String({ format: "uuid" }),
});
