import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PermissionsModule } from './permissions/permissions.module';
import { StudentsModule } from './students/students.module';
import { GuardiansModule } from './guardians/guardians.module';
import { ClassesModule } from './classes/classes.module';
import { PromotionsModule } from './promotions/promotions.module';
import { BillingModule } from './billing/billing.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { ReceivablesModule } from './receivables/receivables.module';
import { ExpensesModule } from './expenses/expenses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Schedule for cron jobs
    ScheduleModule.forRoot(),

    // Core modules
    SharedModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    PermissionsModule,

    // Business modules
    StudentsModule,
    GuardiansModule,
    ClassesModule,
    PromotionsModule,
    BillingModule,
    InvoicesModule,
    PaymentsModule,
    ReceivablesModule,
    ExpensesModule,
    DashboardModule,
    AuditModule,
    SettingsModule,
  ],
})
export class AppModule {}
