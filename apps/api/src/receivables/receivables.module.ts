import { Module } from '@nestjs/common';
import { ReceivablesController } from './receivables.controller';
@Module({ controllers: [ReceivablesController] })
export class ReceivablesModule {}
