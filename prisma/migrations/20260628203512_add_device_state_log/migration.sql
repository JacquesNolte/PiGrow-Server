-- CreateTable
CREATE TABLE "DeviceStateLog" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceStateLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceStateLog_deviceId_idx" ON "DeviceStateLog"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceStateLog_createdAt_idx" ON "DeviceStateLog"("createdAt");

-- AddForeignKey
ALTER TABLE "DeviceStateLog" ADD CONSTRAINT "DeviceStateLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
