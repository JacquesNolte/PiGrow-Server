import { FastifyInstance } from "fastify";
import type { DayNightPeriod as DayNightPeriodLiteral } from "../../../generated/client/enums.js";

interface UpsertPhaseEnvironmentInput {
  tempMin?: number | null;
  tempMax?: number | null;
  tempTarget?: number | null;
  humidityMin?: number | null;
  humidityMax?: number | null;
  humidityTarget?: number | null;
  co2Min?: number | null;
  co2Max?: number | null;
  co2Target?: number | null;
}

export class PhaseEnvironmentsController {
  private prisma;

  constructor(server: FastifyInstance) {
    this.prisma = server.prisma;
  }

  // 1. GET both DAY + NIGHT rows for a phase. Missing periods come back as null
  //    so the FE can tell DAY exists and NIGHT doesn't.
  async getByPhaseId(growPhaseId: string) {
    const phase = await this.prisma.growPhase.findUnique({
      where: { id: growPhaseId },
      select: { id: true },
    });
    if (!phase) {
      const err = new Error("Grow phase record not found");
      (err as { statusCode?: number }).statusCode = 404;
      throw err;
    }

    const rows = await this.prisma.phaseEnvironment.findMany({
      where: { growPhaseId },
      orderBy: { period: "asc" },
    });

    const day = rows.find((r) => r.period === "DAY") ?? null;
    const night = rows.find((r) => r.period === "NIGHT") ?? null;

    return { growPhaseId, day, night };
  }

  // 2. UPSERT a single period. Omitted fields are cleared (set to null).
  async upsert(
    growPhaseId: string,
    period: DayNightPeriodLiteral,
    body: UpsertPhaseEnvironmentInput,
  ) {
    const phase = await this.prisma.growPhase.findUnique({
      where: { id: growPhaseId },
      select: { id: true },
    });
    if (!phase) {
      const err = new Error("Grow phase record not found");
      (err as { statusCode?: number }).statusCode = 404;
      throw err;
    }

    return await this.prisma.phaseEnvironment.upsert({
      where: { growPhaseId_period: { growPhaseId, period } },
      create: {
        growPhaseId,
        period,
        tempMin: body.tempMin ?? null,
        tempMax: body.tempMax ?? null,
        tempTarget: body.tempTarget ?? null,
        humidityMin: body.humidityMin ?? null,
        humidityMax: body.humidityMax ?? null,
        humidityTarget: body.humidityTarget ?? null,
        co2Min: body.co2Min ?? null,
        co2Max: body.co2Max ?? null,
        co2Target: body.co2Target ?? null,
      },
      update: {
        tempMin: body.tempMin ?? null,
        tempMax: body.tempMax ?? null,
        tempTarget: body.tempTarget ?? null,
        humidityMin: body.humidityMin ?? null,
        humidityMax: body.humidityMax ?? null,
        humidityTarget: body.humidityTarget ?? null,
        co2Min: body.co2Min ?? null,
        co2Max: body.co2Max ?? null,
        co2Target: body.co2Target ?? null,
      },
    });
  }

  // 3. DELETE a period row.
  async remove(growPhaseId: string, period: DayNightPeriodLiteral) {
    const existing = await this.prisma.phaseEnvironment.findUnique({
      where: { growPhaseId_period: { growPhaseId, period } },
    });
    if (!existing) {
      const err = new Error("Phase environment row not found");
      (err as { statusCode?: number }).statusCode = 404;
      throw err;
    }
    await this.prisma.phaseEnvironment.delete({
      where: { growPhaseId_period: { growPhaseId, period } },
    });
  }
}
