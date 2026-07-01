import { Type } from "@sinclair/typebox";

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
