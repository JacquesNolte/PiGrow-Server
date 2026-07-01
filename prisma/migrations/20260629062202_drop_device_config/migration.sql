/*
  Warnings:

  - You are about to drop the `DeviceConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DeviceConfig" DROP CONSTRAINT "DeviceConfig_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "DeviceConfig" DROP CONSTRAINT "DeviceConfig_growPhaseId_fkey";

-- DropTable
DROP TABLE "DeviceConfig";

-- DropEnum
DROP TYPE "TriggerType";
