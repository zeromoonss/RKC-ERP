import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        locale: true,
        createdAt: true,
        roleId: true,
        role: {
          select: {
            name: true,
            code: true,
            permissions: {
              select: { permission: { select: { code: true, name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Patch('me/locale')
  async updateLocale(
    @CurrentUser('sub') userId: string,
    @Body('locale') locale: string,
  ) {
    return this.usersService.updateLocale(userId, locale);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('sub') currentUserId: string,
  ) {
    // Check caller is OWNER or ADMIN
    const caller = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      include: { role: true },
    });
    if (!caller || !['OWNER', 'ADMIN'].includes(caller.role?.code || '')) {
      throw new ForbiddenException('Only Owner or Admin can delete staff');
    }

    // Cannot delete yourself
    if (id === currentUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // Cannot delete OWNER accounts
    const target = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!target) {
      throw new BadRequestException('User not found');
    }
    if (target.role?.code === 'OWNER') {
      throw new ForbiddenException('Cannot delete an Owner account');
    }

    // Delete user (cascade will handle related records)
    await this.prisma.user.delete({ where: { id } });

    return { message: `User ${target.email} deleted successfully` };
  }
}
