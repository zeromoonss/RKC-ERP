// ================================
// RKC ERP - Shared Enums
// ================================

// Student
export enum ProgramType {
  KINDERGARTEN = 'KINDERGARTEN',
  ACADEMY = 'ACADEMY',
  BOTH = 'BOTH',
}

export enum StudentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  WITHDRAWN = 'WITHDRAWN',
}

// Class
export enum ClassType {
  KINDERGARTEN = 'KINDERGARTEN',
  ACADEMY = 'ACADEMY',
}

// Billing
export enum BillingStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

// Invoice
export enum InvoiceStatus {
  GENERATED = 'GENERATED',
  SENT_INTERNAL = 'SENT_INTERNAL',
  DOWNLOADED = 'DOWNLOADED',
  VOIDED = 'VOIDED',
}

// Expense
export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
}

// Invitation
export enum InvitationStatus {
  INVITED = 'INVITED',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

// Discount
export enum DiscountType {
  FIXED = 'FIXED',
  PERCENT = 'PERCENT',
}

// Guardian
export enum GuardianRelation {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  GRANDFATHER = 'GRANDFATHER',
  GRANDMOTHER = 'GRANDMOTHER',
  OTHER = 'OTHER',
}

// Gender
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

// Payment Method
export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  OTHER = 'OTHER',
}

// Audit Action
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  INVITATION_SENT = 'INVITATION_SENT',
  BILLING_GENERATED = 'BILLING_GENERATED',
  INVOICE_GENERATED = 'INVOICE_GENERATED',
  PAYMENT_COLLECTED = 'PAYMENT_COLLECTED',
  EXPENSE_APPROVED = 'EXPENSE_APPROVED',
  EXPENSE_REJECTED = 'EXPENSE_REJECTED',
}
