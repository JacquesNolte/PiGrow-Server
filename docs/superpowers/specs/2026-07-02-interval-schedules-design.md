# Interval Schedules for Automation Rules

**Date:** 2026-07-02
**Status:** Approved — implementation in progress
**Scope:** Extend the existing `AutomationRule` system to support time-based duty-cycle schedules (e.g. "fan ON 30s every 5 min") alongside the existing telemetry-triggered threshold rules and the clock-driven `ALWAYS_ON`/`ALWAYS_OFF` rules.

## Motivation

The current automation engine reacts to two kinds of triggers — telemetry readings crossing phase-environment thresholds (src/automation/evaluator.ts) and the day/night clock (src/automation/scheduler.ts). It has no representation of a *time-based rhythm* like "run the circulation fan for 30 seconds every 5 minutes" or "pulse the water pump for 5 seconds every 30 minutes." These are common grow-tent patterns (air movement baseline, irrigation pulses, CO2 injection bursts) and are typically independent of telemetry.

The design must coexist with the existing rules (especially threshold rules on the same device) and reuse as much of the current infrastructure as possible — the `AutomationRule` model, its phase/cycle scoping, its `period` filter, the device-eligibility rules, the `DeviceStateLog` audit trail, and the hysteresis-aware `issueAutoCommand` command path.

## Decisions

1. **Coexist with threshold rules; threshold overrides interval.** The interval runs as the baseline rhythm. When a threshold rule fires on the same device, the interval suspends until the threshold release expires. This matches the typical "baseline air movement + temp override" grow-tent pattern.

2. **5-second dedicated tick for interval rules.** The existing 60-second scheduler tick cannot hit a 30-second ON window. A separate timer (5s) runs only the interval logic. The light/always scheduler stays on 60s.

3. **Extend `AutomationRule` rather than introduce a new model.** An interval is another reason a device gets driven within the same phase/cycle scope, so it belongs on the existing rule table alongside the threshold and always conditions.

4. **Stateless alignment from `rule.createdAt`.** Duty-cycle position is computed as `(now - createdAt) mod cycleSeconds`. No per-tick DB writes for alignment, no anchor field, no clock-drift correction. On restart, the scheduler recomputes and self-heals.

5. **`action: ON` is the only INTERVAL action.** An "ON for onSeconds" pulse is sufficient to express both "ON briefly, OFF the rest" and "ON most of the time, OFF briefly." A user wanting the latter sets `intervalOnSeconds = cycle - small`.

## Data model

### `RuleCondition` enum

Add `INTERVAL` (alongside the existing threshold/always conditions). The legacy `SCHEDULE_ON` / `SCHEDULE_OFF` values stay in the enum for backward compatibility but are still rejected at the API layer.

### `AutomationRule` — two new nullable columns

| Column | Type | Notes |
|---|---|---|
| `intervalOnSeconds` | `Int?` | ON pulse duration within the cycle. Required & `> 0` for `INTERVAL`; `null` otherwise. |
| `intervalCycleSeconds` | `Int?` | Total cycle length (`ON + OFF`). Required & `> intervalOnSeconds` for `INTERVAL`; `null` otherwise. |

Example: `intervalOnSeconds=30, intervalCycleSeconds=300` → 30s ON, 270s OFF, repeating.

### New table: `DeviceThresholdHold`

| Column | Type | Notes |
|---|---|---|
| `deviceId` | `String @id` | One hold per device. |
| `heldUntil` | `DateTime` | Expiry: `now + firing rule's cooldownSeconds`. |
| `ruleId` | `String?` | Which threshold rule asserted the hold (audit). |
| `updatedAt` | `DateTime @updatedAt` | |

`DeviceThresholdHold.device` relation cascades on Device delete.

**Semantics:** while a device has a non-expired hold, the interval scheduler **fully suspends** for that device. Because `issueAutoCommand`'s hysteresis (src/automation/command-publisher.ts:26-35) no-ops commands that match the device's current state, full suspension is observably identical to "yield on conflict" while requiring no `heldAction` column and no conflict-detection logic.

**Clearing:** holds expire naturally when `heldUntil` passes. The interval scheduler opportunistically deletes stale rows. There is no explicit "clear on recovery" logic — the recovery fire itself refreshes the hold for that rule's cooldown, producing a brief "settle" window where the interval stays suspended. Settle length is tunable via the recovery rule's `cooldownSeconds` (default 180s; lower for faster resumption). This avoids the unreliable assert-vs-recover classification problem (`action` is user-configurable, so `BELOW_MAX` could be wired ON or OFF depending on intent).

## Interval scheduler

New file `src/automation/interval-scheduler.ts`, class `IntervalScheduler`, singleton `intervalScheduler`, **5s tick** (`INTERVAL_TICK_MS = 5_000`). Started in `server.ts` next to `automationScheduler.start()`; stopped on `onClose`. Exposes `tick(now)` for tests (mirrors `AutomationScheduler.tick` at src/automation/scheduler.ts:52).

### Tick algorithm

1. Fetch active grow cycles with their active phase (same query shape as `AutomationScheduler.tick` at src/automation/scheduler.ts:53-64).
2. For each cycle, resolve the current day/night period from the active phase clock.
3. Query enabled `INTERVAL` rules scoped to (active phase OR cycle) with `period` matching or null, `device.type != LIGHT`. Include the device.
4. Query non-expired `DeviceThresholdHold` rows for the involved device IDs. Build a `Set<heldDeviceIds>`.
5. For each rule:
   - Skip if `device.automationMode === MANUAL`.
   - Skip if `ALWAYS_ON` device and the desired action is OFF (or `ALWAYS_OFF` device and desired is ON). Device-level mode always wins, consistent with `AutomationScheduler` (src/automation/scheduler.ts:80-83, 116-120).
   - Skip if `deviceId ∈ heldDeviceIds` (threshold override).
   - Compute alignment: `epoch = rule.createdAt`; `elapsedMs = now - epoch`; `position = elapsedMs mod (cycleSeconds * 1000)`; `desiredAction = position < onSeconds * 1000 ? ON : OFF`.
   - Call `issueAutoCommand(deviceId, desiredAction, "INTERVAL rule (ruleId)")`.
6. Delete `DeviceThresholdHold` rows where `heldUntil < now` (stale cleanup).

### Why `createdAt` alignment

It is **stable** (never changes), **stateless** (no per-tick writes), and **self-healing** (after a restart the scheduler recomputes the current pulse phase and issues the correct action; hysteresis prevents redundant writes). The tradeoff is that the cycle phase is not "human-meaningful" (it does not align to rule-creation minute boundaries), but for a duty cycle the position within the cycle is all that matters.

## Threshold-hold writes in the evaluator

After a successful threshold fire in `evaluateThresholds` (src/automation/evaluator.ts:239, the `result.issued` branch), upsert the device's hold:

```ts
heldUntil = now + rule.cooldownSeconds
ruleId    = rule.id
```

Refreshed on every re-fire, so the hold stays alive for as long as the condition persists. Holds are not cleared on recovery fires; the recovery fire's cooldown is the settle window.

## API layer

### `automation-rules.schema.ts`

- Add `Type.Literal("INTERVAL")` to `AcceptedRuleConditionEnum`.
- Add `intervalOnSeconds: Type.Optional(Type.Integer({ minimum: 1 }))` and `intervalCycleSeconds: Type.Optional(Type.Integer({ minimum: 2 }))` to `CreateAutomationRuleSchema`, `UpdateAutomationRuleSchema`, and `AutomationRuleResponseSchema` (the response fields are nullable).

### `automation-rules.controller.ts` — `validateScopeAndPeriod` extension

For `INTERVAL`:
- `watchedSensorType` must be null.
- `action` must be `ON`.
- `intervalOnSeconds` and `intervalCycleSeconds` must both be set on create; on update, both must be set together.
- `intervalCycleSeconds > intervalOnSeconds`.

For non-`INTERVAL` conditions: `intervalOnSeconds` and `intervalCycleSeconds` must be null (rejected if set on a threshold or always rule).

`assertDeviceEligibleForRule` already rejects LIGHT devices, so the interval eligibility is inherited.

## Edge cases & interaction matrix

- **Device `automationMode`** (always wins):
  - `MANUAL` → interval skips the device.
  - `ALWAYS_ON` → interval's OFF is suppressed; ON proceeds (subject to hold).
  - `ALWAYS_OFF` → interval's ON is suppressed; OFF proceeds.
  - `THRESHOLD` / `SCHEDULED` → interval proceeds.
- **No active grow cycle or no active phase** → interval is a no-op for that controller (same as the light scheduler).
- **LIGHT devices** → ineligible for `INTERVAL` rules (`assertDeviceEligibleForRule` rejects them; defensive `device.type != LIGHT` filter in the query).
- **Period `null` (both)** → the rule applies in both DAY and NIGHT.
- **Period transitions** (DAY↔NIGHT) → the duty cycle continues uninterrupted from `createdAt`; no reset.
- **Restart** → the interval scheduler recomputes the current pulse phase from `createdAt` and self-heals; holds are DB-backed and survive restarts; expired holds are ignored.
- **Manual UI command** → next interval edge reasserts the duty-cycle state. This is the expected "automation overrides manual" behavior, consistent with how the scheduler re-drives lights.
- **Multiple interval rules on the same device** → undefined behavior; hysteresis makes the resulting state mostly arbitrary. Recommended: configure one interval rule per device. (Not enforced at the API layer in this iteration.)
- **`lastTriggeredAt`** is not used by interval rules. The interval scheduler does not write it; cooldown and trigger tracking remain exclusive to threshold rules.

## Testing

Integration tests via `createTestApp()` (real DB, per-test cleanup), calling `intervalScheduler.tick(now)` directly with a fakeable `now` (no real timers). All existing automation-rules tests must continue to pass.

New test coverage:

### API validation (in `src/api/modules/automation-rules/automation-rules.test.ts`)

- `INTERVAL` requires `intervalOnSeconds` and `intervalCycleSeconds`.
- `INTERVAL` requires `cycleSeconds > onSeconds`.
- `INTERVAL` requires `action: ON` (rejects `action: OFF`).
- `INTERVAL` requires `watchedSensorType` null.
- `INTERVAL` rejects LIGHT device.
- Non-`INTERVAL` rules reject `intervalOnSeconds` / `intervalCycleSeconds` when set.
- Create + list + update + delete an `INTERVAL` rule end-to-end; the response includes the two new fields.

### Scheduler behavior (new `src/automation/interval-scheduler.test.ts`)

- **Pulse across `createdAt` offsets.** Create an `INTERVAL` rule with fast values (`onSeconds=1, cycleSeconds=4`). Read back `createdAt`, then call `tick(createdAt + 0)` → device goes ON. Call `tick(createdAt + 1500)` → device goes OFF. Call `tick(createdAt + 4000)` → device goes ON (cycle wraps). Assert via `DeviceStateLog` order.
- **Hysteresis.** Two consecutive ticks in the same window produce a single `DeviceStateLog` row for the transition.
- **Device `automationMode = MANUAL`.** The interval rule creates no `DeviceStateLog` rows.
- **Device `automationMode = ALWAYS_ON`.** Interval's OFF is suppressed (no OFF log) but ON proceeds.
- **Threshold override.** Push telemetry that triggers a threshold rule on the same device. Assert the device stays ON (no interval OFF) while the hold is fresh. Wait past the hold's `cooldownSeconds` and push telemetry that recovers; assert the interval resumes pulsing.
- **Hold lifecycle.** Evaluator fire creates/refreshes a `DeviceThresholdHold` row; expired rows are deleted by the interval scheduler's cleanup.
- **No active cycle.** The scheduler is a no-op.
- **Inactive grow phase.** The scheduler is a no-op.
- **`period: null` rule** fires in both DAY and NIGHT. `period: DAY` rule does not fire at night.

## Migration

New Prisma migration `prisma/migrations/20260702200000_add_interval_schedules/migration.sql`:

1. `ALTER TYPE "RuleCondition" ADD VALUE 'INTERVAL';` (own statement; Postgres cannot combine `ADD VALUE` with other catalog mutations).
2. `ALTER TABLE "AutomationRule" ADD COLUMN "intervalOnSeconds" INTEGER, ADD COLUMN "intervalCycleSeconds" INTEGER;` (both nullable, no default — required only for `INTERVAL`).
3. `CREATE TABLE "DeviceThresholdHold"` with `deviceId @id`, `heldUntil DateTime`, `ruleId String?`, `updatedAt DateTime`; `updatedAt` default `CURRENT_TIMESTAMP`; FK to `Device` with `ON DELETE CASCADE`.

After running the migration locally, regenerate the Prisma client (`npx prisma generate`).

## Boot order (`src/server.ts`)

Register and start `intervalScheduler` immediately after `automationScheduler.start()`. Add a `stopInterval` hook to `onClose`.

## Risks & open questions

- **Post-recovery "settle" window.** A recovery threshold fire refreshes the hold for that rule's cooldown, so the interval does not resume until the cooldown elapses even though the condition has recovered. Tunable per-rule via `cooldownSeconds`; default 180s may feel long for a fast-cycling fan. Acceptable in this iteration; can revisit if a finer "release on recovery" mechanism becomes important.
- **Multiple interval rules on the same device** are not validated against each other. Hysteresis makes the resulting state mostly arbitrary. Not enforced in this iteration; documented as unsupported.
