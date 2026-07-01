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
  environments: Type.Array(PhaseEnvironmentSchema),
});

const ControllerSummarySchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  macAddress: Type.String(),
  ipAddress: Type.String(),
  name: Type.String(),
  status: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export const GrowCycleResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  controllerId: Type.String({ format: "uuid" }),
  name: Type.String(),
  isActive: Type.Boolean(),
  startAt: Type.Union([Type.String({ format: "date" }), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
  controller: Type.Object({
    name: Type.String(),
    status: Type.String(),
  }),
});

export const GrowCycleDetailResponseSchema = Type.Object({
  ...GrowCycleResponseSchema.properties,
  phases: Type.Array(GrowPhaseSchema),
});

export const GrowCycleArrayResponseSchema = Type.Array(
  GrowCycleResponseSchema,
);

export const CreateGrowCycleSchema = Type.Object({
  name: Type.String({
    maxLength: 100,
    description: "The name of the specific grow run or harvest batch",
  }),
  controllerId: Type.String({
    format: "uuid",
    description: "The UUID of the physical Raspberry Pi running this cycle",
  }),
  isActive: Type.Optional(
    Type.Boolean({
      default: false,
      description: "Whether this grow cycle is actively running right now",
    }),
  ),
});

export const UpdateGrowCycleSchema = Type.Object({
  name: Type.Optional(Type.String({ maxLength: 100 })),
  isActive: Type.Optional(Type.Boolean()),
  startAt: Type.Optional(
    Type.String({
      format: "date",
      description: "Date (YYYY-MM-DD) marking when this grow cycle started",
    }),
  ),
});

export const GrowCycleParamsIdSchema = Type.Object({
  id: Type.String({
    format: "uuid",
    description: "The unique UUID identifier of the grow cycle",
  }),
});

export const SkipPhaseQuerySchema = Type.Object({
  today: Type.Optional(
    Type.String({
      format: "date",
      description:
        "Optional override for today's date (YYYY-MM-DD). Useful for timezone-correct skip operations; defaults to server UTC today.",
    }),
  ),
});

export const GrowCycleUpdateResponseSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  controllerId: Type.String({ format: "uuid" }),
  name: Type.String(),
  isActive: Type.Boolean(),
  startAt: Type.Union([Type.String({ format: "date" }), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export { ErrorSchema };

export { ControllerSummarySchema };
