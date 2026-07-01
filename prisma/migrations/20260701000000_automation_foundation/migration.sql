-- =============================================================
-- Automation foundation migration
-- Wipes per-grow devices, scopes Device to Controller, adds:
--   - AutomationMode enum + Device.automationMode
--   - DayNightPeriod enum + GrowPhase.{dayStartMinutes,dayDurationMinutes}
--   - PhaseEnvironment (per-phase, per-period threshold set)
--   - RuleCondition / DeviceAction enums + AutomationRule table
-- Existing grow-cycle / phase / sensor / telemetry data is preserved.
-- Existing Device rows (scoped to GrowCycle) are dropped — Device FK moves
-- from GrowCycle -> Controller. Caller confirmed wipe of device data is OK.
-- =============================================================

-- 1. Enums
CREATE TYPE "AutomationMode" AS ENUM ('MANUAL', 'SCHEDULED', 'THRESHOLD', 'ALWAYS_ON', 'ALWAYS_OFF');
CREATE TYPE "DayNightPeriod" AS ENUM ('DAY', 'NIGHT');
CREATE TYPE "RuleCondition"  AS ENUM ('ABOVE_MAX', 'BELOW_MIN', 'SCHEDULE_ON', 'SCHEDULE_OFF');
CREATE TYPE "DeviceAction"   AS ENUM ('ON', 'OFF');

-- 2. Drop existing per-grow devices. State logs cascade with them.
DROP TABLE IF EXISTS "DeviceStateLog" CASCADE;
DROP TABLE IF EXISTS "Device" CASCADE;

-- 3. Recreate Device scoped to Controller, with automationMode.
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "controllerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "pinNumber" INTEGER NOT NULL,
    "mqttTopic" TEXT NOT NULL,
    "automationMode" "AutomationMode" NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Device"
    ADD CONSTRAINT "Device_controllerId_fkey"
    FOREIGN KEY ("controllerId") REFERENCES "Controller"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Re-create DeviceStateLog (DeviceStateLog.source accepts MANUAL | AUTO | UI).
CREATE TABLE "DeviceStateLog" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceStateLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeviceStateLog_deviceId_idx" ON "DeviceStateLog"("deviceId");
CREATE INDEX "DeviceStateLog_createdAt_idx" ON "DeviceStateLog"("createdAt");

ALTER TABLE "DeviceStateLog"
    ADD CONSTRAINT "DeviceStateLog_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. GrowPhase: add day/night clock schedule columns.
ALTER TABLE "GrowPhase"
    ADD COLUMN IF NOT EXISTS "dayStartMinutes"    INTEGER NOT NULL DEFAULT 360,  -- 06:00
    ADD COLUMN IF NOT EXISTS "dayDurationMinutes" INTEGER NOT NULL DEFAULT 1080; -- 18h

-- 6. PhaseEnvironment: per-phase, per-period threshold set.
CREATE TABLE "PhaseEnvironment" (
    "id" TEXT NOT NULL,
    "growPhaseId" TEXT NOT NULL,
    "period" "DayNightPeriod" NOT NULL,
    "tempMin" DOUBLE PRECISION,
    "tempMax" DOUBLE PRECISION,
    "tempTarget" DOUBLE PRECISION,
    "humidityMin" DOUBLE PRECISION,
    "humidityMax" DOUBLE PRECISION,
    "humidityTarget" DOUBLE PRECISION,
    "co2Min" DOUBLE PRECISION,
    "co2Max" DOUBLE PRECISION,
    "co2Target" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhaseEnvironment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "one_env_per_phase_period"
    ON "PhaseEnvironment"("growPhaseId", "period");

ALTER TABLE "PhaseEnvironment"
    ADD CONSTRAINT "PhaseEnvironment_growPhaseId_fkey"
    FOREIGN KEY ("growPhaseId") REFERENCES "GrowPhase"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. AutomationRule: explicit per-device trigger.
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "growCycleId" TEXT,
    "growPhaseId" TEXT,
    "deviceId" TEXT NOT NULL,
    "watchedSensorType" "SensorType" NOT NULL,
    "period" "DayNightPeriod",
    "condition" "RuleCondition" NOT NULL,
    "action" "DeviceAction" NOT NULL,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 180,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationRule_growCycleId_idx" ON "AutomationRule"("growCycleId");
CREATE INDEX "AutomationRule_growPhaseId_idx" ON "AutomationRule"("growPhaseId");
CREATE INDEX "AutomationRule_deviceId_idx"    ON "AutomationRule"("deviceId");
CREATE INDEX "AutomationRule_enabled_idx"     ON "AutomationRule"("enabled");

-- 8. Foreign keys
ALTER TABLE "AutomationRule"
    ADD CONSTRAINT "AutomationRule_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationRule"
    ADD CONSTRAINT "AutomationRule_growCycleId_fkey"
    FOREIGN KEY ("growCycleId") REFERENCES "GrowCycle"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationRule"
    ADD CONSTRAINT "AutomationRule_growPhaseId_fkey"
    FOREIGN KEY ("growPhaseId") REFERENCES "GrowPhase"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
