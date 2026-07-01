import { Type } from "@sinclair/typebox";
import { ErrorSchema } from "../../shared/schemas.js";

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

export const GrowPhaseResponseSchema = Type.Object({
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

export const GrowPhaseArrayResponseSchema = Type.Array(
  GrowPhaseResponseSchema,
);

export const CreateGrowPhaseSchema = Type.Object({
  growCycleId: Type.String({
    format: "uuid",
    description: "The unique ID of the grow cycle this phase belongs to",
  }),
  name: Type.String({
    maxLength: 100,
    description: "e.g., Early Veg, Late Bloom, Flush",
  }),
  order: Type.Integer({
    minimum: 1,
    description: "The sequential execution order index (e.g., 1, 2, 3)",
  }),
  durationDays: Type.Integer({
    minimum: 1,
    description: "Target runtime duration in days for this phase",
  }),
  isActive: Type.Optional(
    Type.Boolean({
      default: false,
      description: "Flags whether this phase is currently running",
    }),
  ),
  startAt: Type.Optional(
    Type.String({
      format: "date",
      description: "Date (YYYY-MM-DD) when this phase actively started execution",
    }),
  ),
  endAt: Type.Optional(
    Type.String({
      format: "date",
      description: "Date (YYYY-MM-DD) when this phase concluded",
    }),
  ),
  dayStartMinutes: Type.Optional(
    Type.Integer({
      minimum: 0,
      maximum: 1440,
      default: 360,
      description:
        "Minutes from midnight (0..1440) when the photoperiod DAY begins. Default 360 = 06:00.",
    }),
  ),
  dayDurationMinutes: Type.Optional(
    Type.Integer({
      minimum: 0,
      maximum: 1440,
      default: 1080,
      description:
        "Duration in minutes (0..1440) of the photoperiod DAY. NIGHT = 1440 - this. Default 1080 = 18h.",
    }),
  ),
});

export const UpdateGrowPhaseSchema = Type.Object({
  name: Type.Optional(Type.String({ maxLength: 100 })),
  order: Type.Optional(Type.Integer({ minimum: 1 })),
  durationDays: Type.Optional(Type.Integer({ minimum: 1 })),
  isActive: Type.Optional(Type.Boolean()),
  startAt: Type.Optional(Type.String({ format: "date" })),
  endAt: Type.Optional(Type.String({ format: "date" })),
  dayStartMinutes: Type.Optional(Type.Integer({ minimum: 0, maximum: 1440 })),
  dayDurationMinutes: Type.Optional(Type.Integer({ minimum: 0, maximum: 1440 })),
});

export const GrowPhaseParamsIdSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export const GrowPhaseParamsCycleIdSchema = Type.Object({
  growCycleId: Type.String({ format: "uuid" }),
});

export { ErrorSchema };
