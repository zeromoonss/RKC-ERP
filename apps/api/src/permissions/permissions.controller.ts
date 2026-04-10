import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../shared';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PERMISSION_MANAGE)
  async getAllPermissions() {
    return this.permissionsService.getAllPermissions();
  }

  @Get('roles')
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  async getAllRoles() {
    return this.permissionsService.getAllRoles();
  }
}
