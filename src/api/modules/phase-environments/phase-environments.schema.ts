import { Type } from "@sinclair/typebox";
import { DayNightPeriod } from "../../../generated/client/enums.js";

const PeriodParam = Type.Union(
  Object.values(DayNightPeriod).map((v) => Type.Literal(v)),
);

const NullableNumber = Type.Optional(Type.Union([Type.Number(), Type.Null()]));

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
