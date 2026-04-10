import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for a route handler.
 * Usage: @RequirePermissions(PERMISSIONS.STUDENT_VIEW, PERMISSIONS.STUDENT_EDIT)
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
