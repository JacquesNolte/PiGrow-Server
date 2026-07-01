import { Type } from "@sinclair/typebox";
import { ErrorSchema } from "../../shared/schemas.js";

const PeriodParam = Type.Union([
  Type.Literal("DAY"),
  Type.Literal("NIGHT"),
]);

const NullableNumber = Type.Optional(Type.Union([Type.Number(), Type.Null()]));

export const PhaseEnvironmentResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  growPhaseId: Type.String({ format: "uuid" }),
  period: PeriodParam,
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

export const PhaseEnvironmentPairResponseSchema = Type.Object({
  growPhaseId: Type.String({ format: "uuid" }),
  day: Type.Union([PhaseEnvironmentResponseSchema, Type.Null()]),
  night: Type.Union([PhaseEnvironmentResponseSchema, Type.Null()]),
});

export const PhaseEnvironmentPeriodParamsSchema = Type.Object({
  growPhaseId: Type.String({ format: "uuid" }),
  period: PeriodParam,
});

export const PhaseEnvironmentPhaseParamsSchema = Type.Object({
  growPhaseId: Type.String({ format: "uuid" }),
});

export const UpsertPhaseEnvironmentSchema = Type.Object({
  tempMin: NullableNumber,
  tempMax: NullableNumber,
  tempTarget: NullableNumber,
  humidityMin: NullableNumber,
  humidityMax: NullableNumber,
  humidityTarget: NullableNumber,
  co2Min: NullableNumber,
  co2Max: NullableNumber,
  co2Target: NullableNumber,
});

export { ErrorSchema };
