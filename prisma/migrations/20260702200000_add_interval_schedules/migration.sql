-- =============================================================
-- Interval schedules for automation rules
-- Adds the INTERVAL condition to RuleCondition, two nullable
-- duration fields on AutomationRule, and a new
-- DeviceThresholdHold table that lets the interval scheduler
-- yield to active threshold rules ("threshold overrides interval").
-- =============================================================

-- 1. Extend the RuleCondition enum with INTERVAL.
--    Own statement (Postgres cannot combine ADD VALUE with other
--    catalog mutations in one transaction).
ALTER TYPE "RuleCondition" ADD VALUE 'INTERVAL';

-- 2. Add the duty-cycle duration columns. Both nullable, no default —
--    required & valid only for INTERVAL rules (enforced at the API
--    layer in automation-rules.controller.ts).
ALTER TABLE "AutomationRule"
    ADD COLUMN "intervalOnSeconds"    INTEGER,
    ADD COLUMN "intervalCycleSeconds" INTEGER;

-- 3. Create the threshold-hold table. One row per device; the interval
--    scheduler fully suspends a device while a non-expired row exists.
--    Cascade on device delete; ruleId is an audit field with no FK.
CREATE TABLE "DeviceThresholdHold" (
    "deviceId"  TEXT NOT NULL,
    "heldUntil" TIMESTAMP(3) NOT NULL,
    "ruleId"    TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceThresholdHold_pkey" PRIMARY KEY ("deviceId")
);

ALTER TABLE "DeviceThresholdHold"
    ADD CONSTRAINT "DeviceThresholdHold_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
