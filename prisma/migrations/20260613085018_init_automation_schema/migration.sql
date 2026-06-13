/*
  Warnings:

  - You are about to drop the `Temperature` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cycles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lights` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `phase_light_schedules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `phases` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sensors` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('LIGHT', 'EXHAUST_FAN', 'INTAKE_FAN', 'CIRCULATION_FAN', 'WATER_PUMP', 'AIR_CONDITIONER', 'HEATER', 'HUMIDIFIER', 'DEHUMIDIFIER', 'CO2_INJECTOR');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('SCHEDULE', 'THRESHOLD', 'ALWAYS_ON', 'ALWAYS_OFF');

-- DropForeignKey
ALTER TABLE "lights" DROP CONSTRAINT "lights_cycle_id_fkey";

-- DropForeignKey
ALTER TABLE "phase_light_schedules" DROP CONSTRAINT "phase_light_schedules_light_id_fkey";

-- DropForeignKey
ALTER TABLE "phase_light_schedules" DROP CONSTRAINT "phase_light_schedules_phase_id_fkey";

-- DropForeignKey
ALTER TABLE "phases" DROP CONSTRAINT "phases_cycle_id_fkey";

-- DropForeignKey
ALTER TABLE "sensors" DROP CONSTRAINT "sensors_cycle_id_fkey";

-- DropTable
DROP TABLE "Temperature";

-- DropTable
DROP TABLE "cycles";

-- DropTable
DROP TABLE "lights";

-- DropTable
DROP TABLE "phase_light_schedules";

-- DropTable
DROP TABLE "phases";

-- DropTable
DROP TABLE "sensors";

-- DropEnum
DROP TYPE "cycle_types";

-- DropEnum
DROP TYPE "phase_types";

-- CreateTable
CREATE TABLE "Controller" (
    "id" TEXT NOT NULL,
    "macAddress" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Controller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "controllerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "pinNumber" INTEGER NOT NULL,
    "mqttTopic" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowCycle" (
    "id" TEXT NOT NULL,
    "controllerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowPhase" (
    "id" TEXT NOT NULL,
    "growCycleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceConfig" (
    "id" TEXT NOT NULL,
    "growPhaseId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "triggerType" "TriggerType" NOT NULL,
    "configData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Telemetry" (
    "id" TEXT NOT NULL,
    "growCycleId" TEXT NOT NULL,
    "sensorType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Controller_macAddress_key" ON "Controller"("macAddress");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "Controller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowCycle" ADD CONSTRAINT "GrowCycle_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "Controller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowPhase" ADD CONSTRAINT "GrowPhase_growCycleId_fkey" FOREIGN KEY ("growCycleId") REFERENCES "GrowCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceConfig" ADD CONSTRAINT "DeviceConfig_growPhaseId_fkey" FOREIGN KEY ("growPhaseId") REFERENCES "GrowPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceConfig" ADD CONSTRAINT "DeviceConfig_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Telemetry" ADD CONSTRAINT "Telemetry_growCycleId_fkey" FOREIGN KEY ("growCycleId") REFERENCES "GrowCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
