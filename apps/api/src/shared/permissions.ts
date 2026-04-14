// ================================
// RKC ERP - Permission Constants
// ================================

export const PERMISSIONS = {
  // Student
  STUDENT_VIEW: 'student.view',
  STUDENT_CREATE: 'student.create',
  STUDENT_EDIT: 'student.edit',
  STUDENT_DELETE: 'student.delete',

  // Class
  CLASS_VIEW: 'class.view',
  CLASS_CREATE: 'class.create',
  CLASS_ASSIGN_STUDENT: 'class.assign_student',
  CLASS_ASSIGN_TEACHER: 'class.assign_teacher',
  CLASS_DELETE: 'class.delete',

  // Billing
  BILLING_VIEW: 'billing.view',
  BILLING_CREATE: 'billing.create',
  BILLING_ISSUE: 'billing.issue',
  BILLING_EDIT: 'billing.edit',
  BILLING_DELETE: 'billing.delete',

  // Invoice
  INVOICE_VIEW: 'invoice.view',
  INVOICE_GENERATE: 'invoice.generate',

  // Payment
  PAYMENT_VIEW: 'payment.view',
  PAYMENT_COLLECT: 'payment.collect',

  // Receivable
  RECEIVABLE_VIEW: 'receivable.view',
  RECEIVABLE_MANAGE: 'receivable.manage',

  // Expense
  EXPENSE_VIEW: 'expense.view',
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_APPROVE: 'expense.approve',
  EXPENSE_PAY: 'expense.pay',

  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Report
  REPORT_EXPORT: 'report.export',

  // Staff
  STAFF_INVITE: 'staff.invite',

  // Role & Permission Management
  ROLE_MANAGE: 'role.manage',
  PERMISSION_MANAGE: 'permission.manage',

  // Owner-only
  OWNER_TRANSFER: 'owner.transfer',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// All permission codes as an array
export const ALL_PERMISSION_CODES = Object.values(PERMISSIONS);

// Permission groups for UI display
export const PERMISSION_GROUPS = {
  student: {
    labelKey: 'permissions.groups.student',
    permissions: [
      PERMISSIONS.STUDENT_VIEW,
      PERMISSIONS.STUDENT_CREATE,
      PERMISSIONS.STUDENT_EDIT,
    ],
  },
  class: {
    labelKey: 'permissions.groups.class',
    permissions: [
      PERMISSIONS.CLASS_VIEW,
      PERMISSIONS.CLASS_CREATE,
      PERMISSIONS.CLASS_ASSIGN_STUDENT,
      PERMISSIONS.CLASS_ASSIGN_TEACHER,
    ],
  },
  billing: {
    labelKey: 'permissions.groups.billing',
    permissions: [
      PERMISSIONS.BILLING_VIEW,
      PERMISSIONS.BILLING_CREATE,
      PERMISSIONS.BILLING_ISSUE,
    ],
  },
  invoice: {
    labelKey: 'permissions.groups.invoice',
    permissions: [
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.INVOICE_GENERATE,
    ],
  },
  payment: {
    labelKey: 'permissions.groups.payment',
    permissions: [
      PERMISSIONS.PAYMENT_VIEW,
      PERMISSIONS.PAYMENT_COLLECT,
    ],
  },
  receivable: {
    labelKey: 'permissions.groups.receivable',
    permissions: [
      PERMISSIONS.RECEIVABLE_VIEW,
      PERMISSIONS.RECEIVABLE_MANAGE,
    ],
  },
  expense: {
    labelKey: 'permissions.groups.expense',
    permissions: [
      PERMISSIONS.EXPENSE_VIEW,
      PERMISSIONS.EXPENSE_CREATE,
      PERMISSIONS.EXPENSE_APPROVE,
      PERMISSIONS.EXPENSE_PAY,
    ],
  },
  dashboard: {
    labelKey: 'permissions.groups.dashboard',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.REPORT_EXPORT,
    ],
  },
  staff: {
    labelKey: 'permissions.groups.staff',
    permissions: [
      PERMISSIONS.STAFF_INVITE,
      PERMISSIONS.ROLE_MANAGE,
      PERMISSIONS.PERMISSION_MANAGE,
    ],
  },
} as const;

// Default role permission presets
export const ROLE_PRESETS = {
  OWNER: ALL_PERMISSION_CODES,
  ADMIN: ALL_PERMISSION_CODES.filter(p => p !== PERMISSIONS.OWNER_TRANSFER),
  FINANCE: [
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.BILLING_ISSUE,
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.INVOICE_GENERATE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_COLLECT,
    PERMISSIONS.RECEIVABLE_VIEW,
    PERMISSIONS.RECEIVABLE_MANAGE,
    PERMISSIONS.EXPENSE_VIEW,
    PERMISSIONS.EXPENSE_CREATE,
    PERMISSIONS.EXPENSE_APPROVE,
    PERMISSIONS.EXPENSE_PAY,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.REPORT_EXPORT,
  ],
  ACADEMIC_MANAGER: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.CLASS_CREATE,
    PERMISSIONS.CLASS_ASSIGN_STUDENT,
    PERMISSIONS.CLASS_ASSIGN_TEACHER,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  VIEWER: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.RECEIVABLE_VIEW,
    PERMISSIONS.EXPENSE_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
} as const;
