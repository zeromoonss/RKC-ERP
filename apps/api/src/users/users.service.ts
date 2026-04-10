import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        profile: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async updateLocale(userId: string, locale: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { locale },
    });
  }

  async getStaffList() {
    return this.prisma.user.findMany({
      include: {
        role: true,
        profile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
