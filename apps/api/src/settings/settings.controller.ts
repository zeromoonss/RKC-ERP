import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAll() {
    return this.settingsService.getAll();
  }

  @Put()
  async updateMany(@Body() settings: Record<string, string>) {
    return this.settingsService.updateMany(settings);
  }
}
