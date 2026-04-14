import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// All permission definitions
const PERMISSION_DEFINITIONS = [
  { code: 'student.view', name: 'View Students', group: 'student' },
  { code: 'student.create', name: 'Create Student', group: 'student' },
  { code: 'student.edit', name: 'Edit Student', group: 'student' },
  { code: 'class.view', name: 'View Classes', group: 'class' },
  { code: 'class.create', name: 'Create Class', group: 'class' },
  { code: 'class.assign_student', name: 'Assign Student to Class', group: 'class' },
  { code: 'class.assign_teacher', name: 'Assign Teacher to Class', group: 'class' },
  { code: 'billing.view', name: 'View Billing', group: 'billing' },
  { code: 'billing.create', name: 'Create Billing', group: 'billing' },
  { code: 'billing.issue', name: 'Issue Billing', group: 'billing' },
  { code: 'invoice.view', name: 'View Invoices', group: 'invoice' },
  { code: 'invoice.generate', name: 'Generate Invoice', group: 'invoice' },
  { code: 'payment.view', name: 'View Payments', group: 'payment' },
  { code: 'payment.collect', name: 'Collect Payment', group: 'payment' },
  { code: 'receivable.view', name: 'View Receivables', group: 'receivable' },
  { code: 'receivable.manage', name: 'Manage Receivables', group: 'receivable' },
  { code: 'expense.view', name: 'View Expenses', group: 'expense' },
  { code: 'expense.create', name: 'Create Expense', group: 'expense' },
  { code: 'expense.approve', name: 'Approve Expense', group: 'expense' },
  { code: 'expense.pay', name: 'Pay Expense', group: 'expense' },
  { code: 'dashboard.view', name: 'View Dashboard', group: 'dashboard' },
  { code: 'report.export', name: 'Export Reports', group: 'dashboard' },
  { code: 'staff.invite', name: 'Invite Staff', group: 'staff' },
  { code: 'role.manage', name: 'Manage Roles', group: 'staff' },
  { code: 'permission.manage', name: 'Manage Permissions', group: 'staff' },
  // CRUD 확장
  { code: 'student.delete', name: 'Delete Student', group: 'student' },
  { code: 'billing.edit', name: 'Edit Billing', group: 'billing' },
  { code: 'billing.delete', name: 'Delete Billing', group: 'billing' },
  { code: 'class.delete', name: 'Delete Class', group: 'class' },
  // Owner-only
  { code: 'owner.transfer', name: 'Transfer Ownership', group: 'staff' },
];

// Role definitions with their permission codes
const ROLE_DEFINITIONS = [
  {
    name: 'Owner',
    code: 'OWNER',
    description: 'Full system access',
    isSystem: true,
    permissions: PERMISSION_DEFINITIONS.map((p) => p.code), // ALL permissions
  },
  {
    name: 'Admin',
    code: 'ADMIN',
    description: 'Administrative operations (all except owner transfer)',
    isSystem: true,
    permissions: PERMISSION_DEFINITIONS.map(p => p.code).filter(c => c !== 'owner.transfer'),
  },
  {
    name: 'Finance',
    code: 'FINANCE',
    description: 'Financial operations',
    isSystem: true,
    permissions: [
      'billing.view', 'billing.create', 'billing.issue',
      'invoice.view', 'invoice.generate',
      'payment.view', 'payment.collect',
      'receivable.view', 'receivable.manage',
      'expense.view', 'expense.create', 'expense.approve', 'expense.pay',
      'dashboard.view', 'report.export',
    ],
  },
  {
    name: 'Academic Manager',
    code: 'ACADEMIC_MANAGER',
    description: 'Academic operations',
    isSystem: true,
    permissions: [
      'student.view', 'student.edit',
      'class.view', 'class.create', 'class.assign_student', 'class.assign_teacher',
      'dashboard.view',
    ],
  },
  {
    name: 'Teacher',
    code: 'TEACHER',
    description: 'Teacher - full access except financial modules',
    isSystem: true,
    permissions: [
      'student.view', 'student.create', 'student.edit',
      'class.view', 'class.create', 'class.assign_student', 'class.assign_teacher',
      'expense.view', 'expense.create',
      'dashboard.view',
      'class.delete', 'student.delete',
    ],
  },
  {
    name: 'Partner',
    code: 'PARTNER',
    description: 'External partner - students (view only) and royalty',
    isSystem: true,
    permissions: [
      'student.view', 'dashboard.view',
    ],
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create permissions
  console.log('📋 Creating permissions...');
  for (const perm of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, group: perm.group },
      create: perm,
    });
  }
  console.log(`   ✅ ${PERMISSION_DEFINITIONS.length} permissions created`);

  // 2. Create roles with permissions
  console.log('👥 Creating roles...');
  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { code: roleDef.code },
      update: {
        name: roleDef.name,
        description: roleDef.description,
      },
      create: {
        name: roleDef.name,
        code: roleDef.code,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
    });

    // Assign permissions to role
    for (const permCode of roleDef.permissions) {
      const permission = await prisma.permission.findUnique({
        where: { code: permCode },
      });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
    console.log(`   ✅ Role "${roleDef.name}" with ${roleDef.permissions.length} permissions`);
  }

  // 3. Create Owner user
  console.log('👤 Creating owner account...');
  const ownerEmail = process.env.OWNER_EMAIL || 'sunny@i-tudy.com';
  const ownerPassword = process.env.OWNER_PASSWORD || 'owner123456';
  const ownerName = process.env.OWNER_NAME || 'RKC Owner';

  const ownerRole = await prisma.role.findUnique({
    where: { code: 'OWNER' },
  });

  if (ownerRole) {
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    await prisma.user.upsert({
      where: { email: ownerEmail },
      update: {
        name: ownerName,
        passwordHash,
        roleId: ownerRole.id,
      },
      create: {
        email: ownerEmail,
        passwordHash,
        name: ownerName,
        roleId: ownerRole.id,
        locale: 'en',
      },
    });
    console.log(`   ✅ Owner account: ${ownerEmail}`);
  }

  // 3-b. Create test staff & partner accounts
  console.log('👥 Creating test accounts...');
  const testAccounts = [
    { email: 'admin@rkc.test', name: 'Admin Manager', roleCode: 'ADMIN' },
    { email: 'finance@rkc.test', name: 'Finance Team', roleCode: 'FINANCE' },
    { email: 'academic@rkc.test', name: 'Academic Manager', roleCode: 'ACADEMIC_MANAGER' },
    { email: 'teacher@rkc.test', name: 'Ms. Teacher', roleCode: 'TEACHER' },
    { email: 'partner@rkc.test', name: 'Partner Corp', roleCode: 'PARTNER' },
  ];

  const testPassword = await bcrypt.hash('test1234', 12);
  for (const acct of testAccounts) {
    const role = await prisma.role.findUnique({ where: { code: acct.roleCode } });
    if (role) {
      await prisma.user.upsert({
        where: { email: acct.email },
        update: { name: acct.name, passwordHash: testPassword, roleId: role.id },
        create: {
          email: acct.email,
          passwordHash: testPassword,
          name: acct.name,
          roleId: role.id,
          locale: 'en',
        },
      });
      console.log(`   ✅ ${acct.roleCode}: ${acct.email}`);
    }
  }

  // 4. Create default organization settings
  console.log('⚙️  Creating default settings...');
  const defaultSettings = [
    { key: 'billing_day', value: '1' }, // 매월 1일
    { key: 'due_days', value: '15' }, // 청구 후 15일 이내 납부
    { key: 'organization_name', value: 'Royal Kids College' },
    { key: 'default_locale', value: 'ko' },
    { key: 'email_recipients', value: JSON.stringify([ownerEmail]) },
    { key: 'currency', value: 'VND' },
  ];

  for (const setting of defaultSettings) {
    await prisma.organizationSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`   ✅ ${defaultSettings.length} default settings created`);

  // 5. Create dummy classes
  console.log('🏫 Creating classes...');
  const classData = [
    { name: 'Sunshine', classType: 'KINDERGARTEN' as const, description: '유치원 3세반', capacity: 15 },
    { name: 'Rainbow', classType: 'KINDERGARTEN' as const, description: '유치원 4세반', capacity: 15 },
    { name: 'Star', classType: 'KINDERGARTEN' as const, description: '유치원 5세반', capacity: 20 },
    { name: 'English A', classType: 'ACADEMY' as const, description: '영어 초급반', capacity: 12 },
  ];
  const classes: any[] = [];
  for (const cls of classData) {
    const created = await prisma.class.upsert({
      where: { id: cls.name.toLowerCase().replace(/\s/g, '-') },
      update: {},
      create: {
        id: cls.name.toLowerCase().replace(/\s/g, '-'),
        name: cls.name,
        classType: cls.classType,
        description: cls.description,
        capacity: cls.capacity,
      },
    });
    classes.push(created);
  }
  console.log(`   ✅ ${classes.length} classes created`);

  // 6. Create dummy students
  console.log('👧 Creating students...');
  const studentData = [
    { firstName: 'Minh', lastName: 'Nguyen', gender: 'MALE' as const, programType: 'KINDERGARTEN' as const, status: 'ACTIVE' as const, studentCode: 'STU-001' },
    { firstName: 'Linh', lastName: 'Tran', gender: 'FEMALE' as const, programType: 'KINDERGARTEN' as const, status: 'ACTIVE' as const, studentCode: 'STU-002' },
    { firstName: 'Hoa', lastName: 'Le', gender: 'FEMALE' as const, programType: 'KINDERGARTEN' as const, status: 'ACTIVE' as const, studentCode: 'STU-003' },
    { firstName: 'Duc', lastName: 'Pham', gender: 'MALE' as const, programType: 'BOTH' as const, status: 'ACTIVE' as const, studentCode: 'STU-004' },
    { firstName: 'An', lastName: 'Vo', gender: 'FEMALE' as const, programType: 'ACADEMY' as const, status: 'ACTIVE' as const, studentCode: 'STU-005' },
    { firstName: 'Tuan', lastName: 'Hoang', gender: 'MALE' as const, programType: 'KINDERGARTEN' as const, status: 'WITHDRAWN' as const, studentCode: 'STU-006' },
  ];
  const students: any[] = [];
  for (const s of studentData) {
    const created = await prisma.student.upsert({
      where: { studentCode: s.studentCode },
      update: {},
      create: {
        studentCode: s.studentCode,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        programType: s.programType,
        status: s.status,
        enrollDate: new Date('2026-01-10'),
        ...(s.status === 'WITHDRAWN' ? { withdrawDate: new Date('2026-03-15') } : {}),
      },
    });
    students.push(created);
  }
  console.log(`   ✅ ${students.length} students created`);

  // 7. Assign students to classes
  console.log('📝 Assigning students to classes...');
  const assignments = [
    { studentIdx: 0, classIdx: 0 }, // Minh → Sunshine
    { studentIdx: 1, classIdx: 1 }, // Linh → Rainbow
    { studentIdx: 2, classIdx: 2 }, // Hoa → Star
    { studentIdx: 3, classIdx: 2 }, // Duc → Star
    { studentIdx: 3, classIdx: 3 }, // Duc → English A (BOTH)
    { studentIdx: 4, classIdx: 3 }, // An → English A
  ];
  for (const a of assignments) {
    const student = students[a.studentIdx];
    const cls = classes[a.classIdx];
    if (student && cls) {
      await prisma.classStudent.upsert({
        where: { classId_studentId: { classId: cls.id, studentId: student.id } },
        update: {},
        create: { classId: cls.id, studentId: student.id },
      });
    }
  }
  console.log(`   ✅ ${assignments.length} class assignments created`);

  // 8. Create billing templates
  console.log('💰 Creating billing templates...');
  const templateData = [
    { name: 'Tuition - Kindergarten', amount: 4_000_000, programType: 'KINDERGARTEN' as const, sortOrder: 1 },
    { name: 'Shuttle Fee', amount: 600_000, programType: 'BOTH' as const, sortOrder: 2 },
    { name: 'Textbook Fee', amount: 300_000, programType: 'BOTH' as const, sortOrder: 3 },
    { name: 'Snack Fee', amount: 200_000, programType: 'BOTH' as const, sortOrder: 4 },
    { name: 'Tuition - Academy', amount: 2_000_000, programType: 'ACADEMY' as const, sortOrder: 5 },
  ];
  for (const tmpl of templateData) {
    await prisma.billingTemplate.create({ data: tmpl }).catch(() => {});
  }
  console.log(`   ✅ ${templateData.length} billing templates created`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n════════════════════════════════════════');
  console.log('  📋 TEST ACCOUNT CREDENTIALS');
  console.log('════════════════════════════════════════');
  console.log(`  👑 Owner:     ${ownerEmail} / ${ownerPassword}`);
  console.log('  ─────────────────────────────────────');
  console.log('  🧑‍💼 Admin:     admin@rkc.test / test1234');
  console.log('  💰 Finance:   finance@rkc.test / test1234');
  console.log('  🎓 Academic:  academic@rkc.test / test1234');
  console.log('  🧑‍🏫 Teacher:   teacher@rkc.test / test1234');
  console.log('  🤝 Partner:   partner@rkc.test / test1234');
  console.log('════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
