import { FastifyInstance } from "fastify";
import { mqttClient } from "../../../mqtt/client.js";
import {
  DeviceType,
  AutomationMode,
} from "../../../generated/client/enums.js";

type DeviceTypeLiteral = (typeof DeviceType)[keyof typeof DeviceType];
type AutomationModeLiteral =
  (typeof AutomationMode)[keyof typeof AutomationMode];

interface CreateDeviceInput {
  controllerId: string;
  name: string;
  type: DeviceTypeLiteral;
  pinNumber: number;
  mqttTopic: string;
  automationMode?: AutomationModeLiteral;
  isActive?: boolean;
}

interface UpdateDeviceInput {
  name?: string;
  type?: DeviceTypeLiteral;
  pinNumber?: number;
  mqttTopic?: string;
  automationMode?: AutomationModeLiteral;
  isActive?: boolean;
}

interface BatchDeviceInput {
  name: string;
  type: DeviceTypeLiteral;
  pinNumber: number;
  mqttTopic: string;
  automationMode?: AutomationModeLiteral;
  isActive?: boolean;
}

interface BatchCreateInput {
  controllerId: string;
  devices: BatchDeviceInput[];
}

export class DevicesController {
  private prisma;

  constructor(server: FastifyInstance) {
    this.prisma = server.prisma;
  }

  // 1. READ ALL — persistent hardware inventory for a controller.
  async getDevicesByControllerId(controllerId: string) {
    return await this.prisma.device.findMany({
      where: { controllerId },
      orderBy: { pinNumber: "asc" },
    });
  }

  // 2. READ ONE
  async getDeviceById(id: string) {
    return await this.prisma.device.findUniqueOrThrow({
      where: { id },
      include: {
        controller: {
          select: { id: true, name: true, status: true },
        },
      },
    });
  }

  // 3. CREATE
  async createDevice(body: CreateDeviceInput) {
    return await this.prisma.device.create({
      data: {
        controllerId: body.controllerId,
        name: body.name,
        type: body.type,
        pinNumber: body.pinNumber,
        mqttTopic: body.mqttTopic,
        automationMode: body.automationMode ?? "MANUAL",
        isActive: body.isActive ?? true,
      },
    });
  }

  // 4. UPDATE — controllerId is immutable
  async updateDevice(id: string, body: UpdateDeviceInput) {
    return await this.prisma.device.update({
      where: { id },
      data: body,
    });
  }

  // 5. DELETE
  async deleteDevice(id: string) {
    await this.prisma.device.delete({
      where: { id },
    });
  }

  // 6. BATCH CREATE
  async createDevicesBatch(body: BatchCreateInput) {
    return await this.prisma.$transaction(
      body.devices.map((device) =>
        this.prisma.device.create({
          data: {
            controllerId: body.controllerId,
            name: device.name,
            type: device.type,
            pinNumber: device.pinNumber,
            mqttTopic: device.mqttTopic,
            automationMode: device.automationMode ?? "MANUAL",
            isActive: device.isActive ?? true,
          },
        }),
      ),
    );
  }

  // 7. DEVICE COMMAND (immediate ON/OFF, source = MANUAL)
  async sendCommand(id: string, action: "ON" | "OFF") {
    const device = await this.prisma.device.findUniqueOrThrow({
      where: { id },
    });

    // Persist the state change and write an audit log row in a single transaction.
    await this.prisma.$transaction([
      this.prisma.device.update({
        where: { id },
        data: { isActive: action === "ON" },
      }),
      this.prisma.deviceStateLog.create({
        data: {
          deviceId: id,
          action,
          source: "MANUAL",
        },
      }),
    ]);

    mqttClient.publish(
      `devices/${id}/commands`,
      JSON.stringify({
        action,
        pin: device.pinNumber,
        timestamp: Date.now(),
      }),
    );

    return {
      deviceId: id,
      action,
      timestamp: new Date().toISOString(),
    };
  }
}
