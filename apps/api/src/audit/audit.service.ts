import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

interface AuditLogInput {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details as any,
        ipAddress: input.ipAddress,
      },
    });
  }

  async getAuditLogs(params: {
    entity?: string;
    entityId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const { entity, entityId, userId, page = 1, limit = 50 } = params;

    const where: any = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
