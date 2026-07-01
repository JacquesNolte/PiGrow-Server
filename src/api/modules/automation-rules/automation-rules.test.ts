import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createTestApp, teardownTestApp } from "../test-helper.js";

describe("Automation Rules API Feature Module", () => {
  let app: any;
  let prismaClient: any;
  let controllerId: string;
  let growCycleId: string;
  let growPhaseId: string;
  let lightId: string;
  let fanId: string;
  let heaterId: string;

  const mac = `66:77:88:99:aa:${Date.now().toString(16).slice(-2)}`;

  before(async () => {
    const { server, prisma } = await createTestApp();
    app = server;
    prismaClient = prisma;

    const controller = await prismaClient.controller.create({
      data: {
        macAddress: mac,
        name: "Automation Test Pi",
        ipAddress: "192.168.1.120",
        growCycles: {
          create: {
            name: "Auto Cycle",
            isActive: true,
            phases: {
              create: {
                name: "Veg",
                order: 1,
                durationDays: 30,
                isActive: true,
                dayStartMinutes: 360,
                dayDurationMinutes: 1080,
              },
            },
          },
        },
      },
      include: { growCycles: { include: { phases: true } } },
    });

    controllerId = controller.id;
    growCycleId = controller.growCycles[0].id;
    growPhaseId = controller.growCycles[0].phases[0].id;

    const light = await prismaClient.device.create({
      data: {
        controllerId,
        name: "Light",
        type: "LIGHT",
        pinNumber: 4,
        mqttTopic: "tent1/light",
        automationMode: "SCHEDULED",
      },
    });
    const fan = await prismaClient.device.create({
      data: {
        controllerId,
        name: "Exhaust Fan",
        type: "EXHAUST_FAN",
        pinNumber: 17,
        mqttTopic: "tent1/fan",
        automationMode: "THRESHOLD",
      },
    });
    const heater = await prismaClient.device.create({
      data: {
        controllerId,
        name: "Heater",
        type: "HEATER",
        pinNumber: 27,
        mqttTopic: "tent1/heater",
        automationMode: "THRESHOLD",
      },
    });
    lightId = light.id;
    fanId = fan.id;
    heaterId = heater.id;
  });

  after(async () => {
    await prismaClient.automationRule.deleteMany({});
    await prismaClient.deviceStateLog.deleteMany({});
    await prismaClient.device.deleteMany({ where: { controllerId } });
    await prismaClient.growCycle.deleteMany({
      where: { controller: { macAddress: mac } },
    });
    await prismaClient.controller.deleteMany({ where: { macAddress: mac } });
    await teardownTestApp(app);
  });

  test("POST /api/automation-rules - Should create a phase-scoped light-schedule rule", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/automation-rules",
      payload: {
        growPhaseId,
        deviceId: lightId,
        watchedSensorType: "TEMPERATURE",
        period: "DAY",
        condition: "SCHEDULE_ON",
        action: "ON",
      },
    });

    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 201);
    assert.equal(body.growPhaseId, growPhaseId);
    assert.equal(body.growCycleId, null);
    assert.equal(body.condition, "SCHEDULE_ON");
    assert.equal(body.action, "ON");
    assert.equal(body.cooldownSeconds, 180);
    assert.equal(body.enabled, true);
  });

  test("POST /api/automation-rules - Should reject when both growCycleId and growPhaseId are set", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/automation-rules",
      payload: {
        growPhaseId,
        growCycleId,
        deviceId: fanId,
        watchedSensorType: "TEMPERATURE",
        condition: "ABOVE_MAX",
        action: "ON",
      },
    });

    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 400);
    assert.match(body.error, /Exactly one/);
  });

  test("POST /api/automation-rules - Should reject when neither scope is set", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/automation-rules",
      payload: {
        deviceId: fanId,
        watchedSensorType: "TEMPERATURE",
        condition: "ABOVE_MAX",
        action: "ON",
      },
    });

    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 400);
    assert.match(body.error, /Exactly one/);
  });

  test("POST /api/automation-rules - Should reject SCHEDULE_ON with a null period", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/automation-rules",
      payload: {
        growPhaseId,
        deviceId: lightId,
        watchedSensorType: "TEMPERATURE",
        period: null,
        condition: "SCHEDULE_ON",
        action: "ON",
      },
    });

    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 400);
    assert.match(body.error, /requires a period/);
  });

  test("POST /api/automation-rules - Should create a phase-scoped threshold rule (fan ABOVE_MAX on temp)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/automation-rules",
      payload: {
        growPhaseId,
        deviceId: fanId,
        watchedSensorType: "TEMPERATURE",
        period: "DAY",
        condition: "ABOVE_MAX",
        action: "ON",
      },
    });

    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 201);
    assert.equal(body.condition, "ABOVE_MAX");
  });

  test("POST /api/automation-rules - Should create a phase-scoped threshold rule (heater BELOW_MIN on temp)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/automation-rules",
      payload: {
        growPhaseId,
        deviceId: heaterId,
        watchedSensorType: "TEMPERATURE",
        period: "NIGHT",
        condition: "BELOW_MIN",
        action: "ON",
      },
    });

    assert.equal(response.statusCode, 201);
  });

  test("GET /api/automation-rules/grow-phase/:id - Should list rules for a phase", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/automation-rules/grow-phase/${growPhaseId}`,
    });
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 200);
    assert.equal(body.length, 3);
  });

  test("GET /api/automation-rules/grow-cycle/:id - Should list cycle-scoped rules (none in this suite)", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/automation-rules/grow-cycle/${growCycleId}`,
    });
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 200);
    assert.equal(body.length, 0);
  });

  test("GET /api/automation-rules/device/:id - Should list rules for a device", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/automation-rules/device/${fanId}`,
    });
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 200);
    assert.equal(body.length, 1);
    assert.equal(body[0].deviceId, fanId);
  });

  test("PATCH /api/automation-rules/:id/toggle - Should flip the enabled flag", async () => {
    const list = await prismaClient.automationRule.findFirst({
      where: { deviceId: fanId },
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/automation-rules/${list.id}/toggle`,
    });
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 200);
    assert.equal(body.id, list.id);
    assert.equal(body.enabled, false);

    // Toggle back
    const response2 = await app.inject({
      method: "PATCH",
      url: `/api/automation-rules/${list.id}/toggle`,
    });
    const body2 = JSON.parse(response2.body);
    assert.equal(body2.enabled, true);
  });

  test("PUT /api/automation-rules/:id - Should update a rule's cooldown", async () => {
    const list = await prismaClient.automationRule.findFirst({
      where: { deviceId: heaterId },
    });

    const response = await app.inject({
      method: "PUT",
      url: `/api/automation-rules/${list.id}`,
      payload: { cooldownSeconds: 600 },
    });
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 200);
    assert.equal(body.cooldownSeconds, 600);
  });

  test("PUT /api/automation-rules/:id - Should reject when changing period to null on a SCHEDULE_ON rule", async () => {
    const list = await prismaClient.automationRule.findFirst({
      where: { condition: "SCHEDULE_ON" },
    });

    const response = await app.inject({
      method: "PUT",
      url: `/api/automation-rules/${list.id}`,
      payload: { period: null },
    });
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 400);
    assert.match(body.error, /requires a period/);
  });

  test("DELETE /api/automation-rules/:id - Should remove a rule", async () => {
    const list = await prismaClient.automationRule.findFirst({
      where: { deviceId: heaterId },
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/automation-rules/${list.id}`,
    });
    assert.equal(response.statusCode, 204);
  });
});
