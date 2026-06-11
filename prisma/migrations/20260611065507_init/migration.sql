-- CreateEnum
CREATE TYPE "cycle_types" AS ENUM ('GROW');

-- CreateEnum
CREATE TYPE "phase_types" AS ENUM ('PROPOGATION', 'VEG', 'FLOWER', 'CURING');

-- CreateTable
CREATE TABLE "cycles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "type" "cycle_types" NOT NULL,
    "start_date" TIMESTAMP(6) NOT NULL,
    "end_date" TIMESTAMP(6) NOT NULL,
    "plant_type" VARCHAR(100) NOT NULL,

    CONSTRAINT "cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "type" "phase_types" NOT NULL,
    "start_date" TIMESTAMP(6) NOT NULL,
    "end_date" TIMESTAMP(6) NOT NULL,
    "cycle_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL,

    CONSTRAINT "phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "cycle_id" UUID NOT NULL,

    CONSTRAINT "lights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "cycle_id" UUID NOT NULL,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phase_light_schedules" (
    "phase_id" UUID NOT NULL,
    "light_id" UUID NOT NULL,
    "trigger_on_time" TIMESTAMP(6) NOT NULL,
    "trigger_off_time" TIMESTAMP(6) NOT NULL
);

-- CreateTable
CREATE TABLE "Temperature" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sensor_id" UUID NOT NULL,
    "phase_id" UUID NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Temperature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phase_light_schedules_phase_id_light_id_key" ON "phase_light_schedules"("phase_id", "light_id");

-- AddForeignKey
ALTER TABLE "phases" ADD CONSTRAINT "phases_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lights" ADD CONSTRAINT "lights_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_light_schedules" ADD CONSTRAINT "phase_light_schedules_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_light_schedules" ADD CONSTRAINT "phase_light_schedules_light_id_fkey" FOREIGN KEY ("light_id") REFERENCES "lights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
