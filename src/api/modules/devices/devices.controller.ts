import { FastifyInstance } from "fastify";

// Strict structural typings matching your schema models
interface CreateDeviceInput {
  controllerId: string;
  name: string;
  type:
    | "LIGHT"
    | "EXHAUST_FAN"
    | "INTAKE_FAN"
    | "CIRCULATION_FAN"
    | "WATER_PUMP"
    | "AIR_CONDITIONER"
    | "HEATER"
    | "HUMIDIFIER"
    | "DEHUMIDIFIER"
    | "CO2_INJECTOR";
  pinNumber: number;
  mqttTopic: string;
  isActive?: boolean;
}

interface UpdateDeviceInput {
  name?: string;
  type?:
    | "LIGHT"
    | "EXHAUST_FAN"
    | "INTAKE_FAN"
    | "CIRCULATION_FAN"
    | "WATER_PUMP"
    | "AIR_CONDITIONER"
    | "HEATER"
    | "HUMIDIFIER"
    | "DEHUMIDIFIER"
    | "CO2_INJECTOR";
  pinNumber?: number;
  mqttTopic?: string;
  isActive?: boolean;
}

export class DevicesController {
  private prisma;

  constructor(server: FastifyInstance) {
    this.prisma = server.prisma;
  }

  // 1. READ ALL (Fetch inventory assigned to a specific Raspberry Pi)
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
        controller: true, // Tells your UI which physical hub hosts this switch
        deviceConfigs: true, // Pulls configurations mapped to this hardware
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
        isActive: body.isActive ?? true,
      },
    });
  }

  // 4. UPDATE
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
}
