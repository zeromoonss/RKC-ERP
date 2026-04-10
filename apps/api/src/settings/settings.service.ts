import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all settings as a key-value map.
   */
  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.organizationSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  }

  /**
   * Get a single setting by key.
   */
  async get(key: string): Promise<string | null> {
    const setting = await this.prisma.organizationSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  }

  /**
   * Upsert multiple settings at once.
   */
  async updateMany(settings: Record<string, string>): Promise<Record<string, string>> {
    const entries = Object.entries(settings);

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.organizationSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );

    return this.getAll();
  }

  /**
   * Upsert a single setting.
   */
  async set(key: string, value: string): Promise<void> {
    await this.prisma.organizationSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
