import { Type } from "@sinclair/typebox";
import {
  SensorType,
  DayNightPeriod,
  RuleCondition,
  DeviceAction,
} from "../../../generated/client/enums.js";

const SensorTypeEnum = Type.Union(
  Object.values(SensorType).map((v) => Type.Literal(v)),
);
const PeriodEnum = Type.Union(
  Object.values(DayNightPeriod).map((v) => Type.Literal(v)),
);
const RuleConditionEnum = Type.Union(
  Object.values(RuleCondition).map((v) => Type.Literal(v)),
);
const DeviceActionEnum = Type.Union(
  Object.values(DeviceAction).map((v) => Type.Literal(v)),
);

export const AutomationRuleIdParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export const AutomationRuleGrowCycleParamsSchema = Type.Object({
  growCycleId: Type.String({ format: "uuid" }),
});

export const AutomationRuleGrowPhaseParamsSchema = Type.Object({
  growPhaseId: Type.String({ format: "uuid" }),
});

export const AutomationRuleDeviceParamsSchema = Type.Object({
  deviceId: Type.String({ format: "uuid" }),
});

export const CreateAutomationRuleSchema = Type.Object({
  growCycleId: Type.Optional(Type.String({ format: "uuid" })),
  growPhaseId: Type.Optional(Type.String({ format: "uuid" })),
  deviceId: Type.String({ format: "uuid" }),
  watchedSensorType: SensorTypeEnum,
  period: Type.Optional(Type.Union([PeriodEnum, Type.Null()])),
  condition: RuleConditionEnum,
  action: DeviceActionEnum,
  cooldownSeconds: Type.Optional(
    Type.Integer({ minimum: 0, default: 180 }),
  ),
  enabled: Type.Optional(Type.Boolean({ default: true })),
});

export const UpdateAutomationRuleSchema = Type.Object({
  deviceId: Type.Optional(Type.String({ format: "uuid" })),
  watchedSensorType: Type.Optional(SensorTypeEnum),
  period: Type.Optional(Type.Union([PeriodEnum, Type.Null()])),
  condition: Type.Optional(RuleConditionEnum),
  action: Type.Optional(DeviceActionEnum),
  cooldownSeconds: Type.Optional(Type.Integer({ minimum: 0 })),
  enabled: Type.Optional(Type.Boolean()),
});
