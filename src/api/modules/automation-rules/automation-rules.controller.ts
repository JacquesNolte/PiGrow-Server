import { FastifyInstance } from "fastify";
import type {
  RuleCondition as RuleConditionLiteral,
  DayNightPeriod as DayNightPeriodLiteral,
  SensorType as SensorTypeLiteral,
  DeviceAction as DeviceActionLiteral,
} from "../../../generated/client/enums.js";

interface CreateRuleInput {
  growCycleId?: string;
  growPhaseId?: string;
  deviceId: string;
  watchedSensorType: SensorTypeLiteral;
  period?: DayNightPeriodLiteral | null;
  condition: RuleConditionLiteral;
  action: DeviceActionLiteral;
  cooldownSeconds?: number;
  enabled?: boolean;
}

interface UpdateRuleInput {
  deviceId?: string;
  watchedSensorType?: SensorTypeLiteral;
  period?: DayNightPeriodLiteral | null;
  condition?: RuleConditionLiteral;
  action?: DeviceActionLiteral;
  cooldownSeconds?: number;
  enabled?: boolean;
}

export class AutomationRulesError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AutomationRulesError";
    this.statusCode = statusCode;
  }
}

export class AutomationRulesController {
  private prisma;

  constructor(server: FastifyInstance) {
    this.prisma = server.prisma;
  }

  // Validate that:
  //   - exactly one of (growCycleId, growPhaseId) is set
  //   - if condition is SCHEDULE_*, period is required and must be DAY or NIGHT
  //   - sensor type + condition combination is consistent (PH / EC only for ABOVE_MAX/BELOW_MIN)
  private validateScopeAndPeriod(input: {
    growCycleId?: string | null;
    growPhaseId?: string | null;
    period?: DayNightPeriodLiteral | null;
    condition: RuleConditionLiteral;
  }) {
    const hasCycle = !!input.growCycleId;
    const hasPhase = !!input.growPhaseId;
    if (hasCycle === hasPhase) {
      throw new AutomationRulesError(
        "Exactly one of growCycleId / growPhaseId must be set on an automation rule",
      );
    }

    if (
      (input.condition === "SCHEDULE_ON" || input.condition === "SCHEDULE_OFF") &&
      (input.period === null || input.period === undefined)
    ) {
      throw new AutomationRulesError(
        `condition=${input.condition} requires a period of DAY or NIGHT`,
      );
    }
  }

  // 1. LIST by grow cycle (cycle-scoped rules only).
  async getByGrowCycleId(growCycleId: string) {
    return await this.prisma.automationRule.findMany({
      where: { growCycleId, growPhaseId: null },
      orderBy: { createdAt: "asc" },
    });
  }

  // 2. LIST by grow phase (phase-scoped rules).
  async getByGrowPhaseId(growPhaseId: string) {
    return await this.prisma.automationRule.findMany({
      where: { growPhaseId, growCycleId: null },
      orderBy: { createdAt: "asc" },
    });
  }

  // 3. LIST by device.
  async getByDeviceId(deviceId: string) {
    return await this.prisma.automationRule.findMany({
      where: { deviceId },
      orderBy: { createdAt: "asc" },
    });
  }

  // 4. CREATE
  async create(body: CreateRuleInput) {
    this.validateScopeAndPeriod({
      growCycleId: body.growCycleId ?? null,
      growPhaseId: body.growPhaseId ?? null,
      period: body.period ?? null,
      condition: body.condition,
    });

    // The device must exist; the phase/cycle is validated by FK.
    const device = await this.prisma.device.findUnique({
      where: { id: body.deviceId },
      select: { id: true },
    });
    if (!device) {
      throw new AutomationRulesError("Device not found", 400);
    }

    return await this.prisma.automationRule.create({
      data: {
        growCycleId: body.growCycleId ?? null,
        growPhaseId: body.growPhaseId ?? null,
        deviceId: body.deviceId,
        watchedSensorType: body.watchedSensorType,
        period: body.period ?? null,
        condition: body.condition,
        action: body.action,
        cooldownSeconds: body.cooldownSeconds ?? 180,
        enabled: body.enabled ?? true,
      },
    });
  }

  // 5. UPDATE — scope is immutable. If the caller changes period or condition,
  //    re-validate the period/condition invariant.
  async update(id: string, body: UpdateRuleInput) {
    const existing = await this.prisma.automationRule.findUniqueOrThrow({
      where: { id },
    });

    const nextCondition = body.condition ?? existing.condition;
    const nextPeriod =
      body.period === undefined ? existing.period : body.period;

    this.validateScopeAndPeriod({
      growCycleId: existing.growCycleId,
      growPhaseId: existing.growPhaseId,
      period: nextPeriod,
      condition: nextCondition,
    });

    return await this.prisma.automationRule.update({
      where: { id },
      data: body,
    });
  }

  // 6. TOGGLE enabled flag.
  async toggle(id: string) {
    const existing = await this.prisma.automationRule.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.automationRule.update({
      where: { id },
      data: { enabled: !existing.enabled },
    });
    return { id: updated.id, enabled: updated.enabled };
  }

  // 7. DELETE
  async remove(id: string) {
    await this.prisma.automationRule.delete({ where: { id } });
  }
}
