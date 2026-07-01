import { Type } from "@sinclair/typebox";
import {
  DeviceType,
  AutomationMode,
} from "../../../generated/client/enums.js";

const DeviceTypeEnum = Type.Union(
  Object.values(DeviceType).map((v) => Type.Literal(v)),
);

const AutomationModeEnum = Type.Union(
  Object.values(AutomationMode).map((v) => Type.Literal(v)),
);

const DeviceBody = Type.Object({
  name: Type.String({ maxLength: 100 }),
  type: DeviceTypeEnum,
  pinNumber: Type.Integer({ minimum: 0, maximum: 40 }),
  mqttTopic: Type.String({ maxLength: 150 }),
  automationMode: Type.Optional(
    Type.Union([AutomationModeEnum], { default: "MANUAL" }),
  ),
  isActive: Type.Optional(Type.Boolean({ default: true })),
});

export const CreateDeviceSchema = Type.Object({
  controllerId: Type.String({
    format: "uuid",
    description: "UUID of the parent Controller that owns this device",
  }),
  name: Type.String({ maxLength: 100 }),
  type: DeviceTypeEnum,
  pinNumber: Type.Integer({ minimum: 0, maximum: 40 }),
  mqttTopic: Type.String({ maxLength: 150 }),
  automationMode: Type.Optional(AutomationModeEnum),
  isActive: Type.Optional(Type.Boolean({ default: true })),
});

export const BatchCreateDeviceSchema = Type.Object({
  controllerId: Type.String({ format: "uuid" }),
  devices: Type.Array(DeviceBody, { minItems: 1 }),
});

export const UpdateDeviceSchema = Type.Object({
  name: Type.Optional(Type.String({ maxLength: 100 })),
  type: Type.Optional(DeviceTypeEnum),
  pinNumber: Type.Optional(Type.Integer({ minimum: 0, maximum: 40 })),
  mqttTopic: Type.Optional(Type.String({ maxLength: 150 })),
  automationMode: Type.Optional(AutomationModeEnum),
  isActive: Type.Optional(Type.Boolean()),
});

export const DeviceCommandSchema = Type.Object({
  action: Type.Union([Type.Literal("ON"), Type.Literal("OFF")]),
});

export const DeviceParamsIdSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export const DeviceParamsControllerIdSchema = Type.Object({
  controllerId: Type.String({ format: "uuid" }),
});
