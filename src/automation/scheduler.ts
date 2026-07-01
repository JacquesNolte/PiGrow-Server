import { prisma } from "../prisma.js";
import { resolvePeriod } from "./period.js";
import { issueAutoCommand } from "./command-publisher.js";

const TICK_MS = 60_000;

/**
 * Light scheduler. Runs every TICK_MS. For each controller with an active grow
 * cycle, resolves the current day/night period from the active phase's clock
 * schedule, finds SCHEDULE_ON / SCHEDULE_OFF rules whose `period` matches the
 * desired command, and issues the command (with hysteresis).
 *
 * No-op when there is no active grow cycle, no active phase, or no schedule
 * rules — historical cycle data is preserved but never re-driven.
 */
export class LightScheduler {
  private timer: NodeJS.Timeout | null = null;

  start() {
    if (this.timer) return;
    // Run once immediately so behavior is observable on dev startup, then on tick.
    void this.tick();
    this.timer = setInterval(() => void this.tick(), TICK_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Exposed for tests and manual invocation.
  async tick(now: Date = new Date()) {
    const activeCycles = await prisma.growCycle.findMany({
      where: { isActive: true },
      include: {
        phases: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    for (const cycle of activeCycles) {
      const activePhase = cycle.phases[0];
      if (!activePhase) continue;

      const period = resolvePeriod(
        activePhase.dayStartMinutes,
        activePhase.dayDurationMinutes,
        now,
      );

      // Look at the device's most recent state to decide which schedule rule
      // is satisfied RIGHT NOW. SCHEDULE_ON fires at the start of DAY -> action ON.
      // SCHEDULE_OFF fires at the start of NIGHT -> action OFF.
      const desiredAction: "ON" | "OFF" | null =
        period === "DAY" ? "ON" : "OFF";

      const rules = await prisma.automationRule.findMany({
        where: {
          growPhaseId: activePhase.id,
          enabled: true,
          condition:
            desiredAction === "ON" ? "SCHEDULE_ON" : "SCHEDULE_OFF",
          period: { in: [period] },
        },
        include: { device: true },
      });

      for (const rule of rules) {
        if (!rule.device) continue;
        if (rule.device.automationMode === "MANUAL") continue;
        if (rule.device.automationMode === "ALWAYS_ON" && desiredAction === "OFF") continue;
        if (rule.device.automationMode === "ALWAYS_OFF" && desiredAction === "ON") continue;

        const result = await issueAutoCommand(
          rule.device.id,
          desiredAction,
          `${period === "DAY" ? "day cycle start" : "night cycle start"} (rule ${rule.id})`,
        );
        if (result.issued) {
          console.log(
            `[scheduler] cycle=${cycle.id} phase=${activePhase.id} device=${rule.device.id} action=${desiredAction} (${period})`,
          );
        }
      }
    }
  }
}

export const lightScheduler = new LightScheduler();
