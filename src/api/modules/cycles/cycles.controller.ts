import { FastifyInstance } from "fastify";
import { CycleType } from "../../../generated/client/enums.js";

export class CyclesController {
  private prisma;

  constructor(server: FastifyInstance) {
    this.prisma = server.prisma;
  }

  // 1. READ ALL
  async getAllCycles() {
    return await this.prisma.cycles.findMany();
  }

  // 2. READ ONE
  async getCycleById(id: string) {
    return await this.prisma.cycles.findUniqueOrThrow({
      where: { id },
    });
  }

  // 3. CREATE (Handles mutations and date formatting)
  async createCycle(body: any) {
    const { start_date, end_date, type, ...rest } = body;

    return await this.prisma.cycles.create({
      data: {
        ...rest,
        type: type as CycleType,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      },
    });
  }

  // 4. UPDATE (Handles clean transformations)
  async updateCycle(id: string, body: any) {
    const { start_date, end_date, type, ...rest } = body;

    return await this.prisma.cycles.update({
      where: { id },
      data: {
        ...rest,
        type: type ? (type as CycleType) : undefined,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
      },
    });
  }

  // 5. DELETE
  async deleteCycle(id: string) {
    await this.prisma.cycles.delete({
      where: { id },
    });
  }
}
