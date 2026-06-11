import { Type } from "@sinclair/typebox";

// Schema for creating a Cycle (Strict JSON primitives)
export const CreateCycleSchema = Type.Object({
  name: Type.String({ maxLength: 100 }),
  description: Type.String({ maxLength: 255 }),
  // Use explicit string literals matching your Prisma CycleType enum values
  type: Type.Union([
    Type.Literal("VEGETATIVE"),
    Type.Literal("FLOWERING"),
    Type.Literal("SEEDLING"),
  ]),
  start_date: Type.String({ format: "date-time" }), // Standard string validation
  end_date: Type.String({ format: "date-time" }),
  plant_type: Type.String({ maxLength: 100 }),
});

// Schema for updating a Cycle (All fields optional)
export const UpdateCycleSchema = Type.Object({
  name: Type.Optional(Type.String({ maxLength: 100 })),
  description: Type.Optional(Type.String({ maxLength: 255 })),
  type: Type.Optional(
    Type.Union([
      Type.Literal("VEGETATIVE"),
      Type.Literal("FLOWERING"),
      Type.Literal("SEEDLING"),
    ]),
  ),
  start_date: Type.Optional(Type.String({ format: "date-time" })),
  end_date: Type.Optional(Type.String({ format: "date-time" })),
  plant_type: Type.Optional(Type.String({ maxLength: 100 })),
});

export const ParamsIdSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});
