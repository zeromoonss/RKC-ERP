import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get effective permissions for a user.
   * Combines role permissions with user-specific overrides.
   */
  async getEffectivePermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!user) return [];

    // Role permissions (base)
    const rolePermissions =
      user.role?.permissions.map((rp) => rp.permission.code) || [];

    // User-specific grants
    const userGranted = user.permissions
      .filter((up) => up.granted)
      .map((up) => up.permission.code);

    // User-specific denies
    const userDenied = user.permissions
      .filter((up) => !up.granted)
      .map((up) => up.permission.code);

    // Combine: role + grants - denies
    const effective = [...new Set([...rolePermissions, ...userGranted])].filter(
      (p) => !userDenied.includes(p),
    );

    return effective;
  }

  /**
   * Check if a user has all the specified permissions.
   */
  async userHasPermissions(
    userId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const effectivePermissions = await this.getEffectivePermissions(userId);
    return requiredPermissions.every((p) => effectivePermissions.includes(p));
  }

  /**
   * Get all defined permissions from the database.
   */
  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ group: 'asc' }, { code: 'asc' }],
    });
  }

  /**
   * Get all roles with their permissions.
   */
  async getAllRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Set user-specific permission overrides.
   */
  async setUserPermissions(
    userId: string,
    permissions: { permissionId: string; granted: boolean }[],
  ) {
    // Delete existing user permissions
    await this.prisma.userPermission.deleteMany({
      where: { userId },
    });

    // Create new ones
    if (permissions.length > 0) {
      await this.prisma.userPermission.createMany({
        data: permissions.map((p) => ({
          userId,
          permissionId: p.permissionId,
          granted: p.granted,
        })),
      });
    }

    return this.getEffectivePermissions(userId);
  }
}
