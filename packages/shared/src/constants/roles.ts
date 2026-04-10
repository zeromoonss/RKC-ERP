export const DEFAULT_ROLES = [
  { name: 'Owner', code: 'OWNER', description: 'Full system access', isSystem: true },
  { name: 'Admin', code: 'ADMIN', description: 'Administrative operations', isSystem: true },
  { name: 'Finance', code: 'FINANCE', description: 'Financial operations', isSystem: true },
  { name: 'Academic Manager', code: 'ACADEMIC_MANAGER', description: 'Academic operations', isSystem: true },
  { name: 'Viewer', code: 'VIEWER', description: 'Read-only access', isSystem: true },
] as const;

export type RoleCode = (typeof DEFAULT_ROLES)[number]['code'];
