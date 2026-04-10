import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../shared';
import { StudentStatus } from '@prisma/client';

@Controller('students')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENT_CREATE)
  async create(
    @Body() dto: CreateStudentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.studentsService.create(dto, userId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENT_VIEW)
  async findAll(@Query() query: QueryStudentDto) {
    return this.studentsService.findAll(query);
  }

  @Get('stats')
  @RequirePermissions(PERMISSIONS.STUDENT_VIEW)
  async getStats() {
    return this.studentsService.getStats();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STUDENT_VIEW)
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.STUDENT_EDIT)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.studentsService.update(id, dto, userId);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.STUDENT_EDIT)
  async changeStatus(
    @Param('id') id: string,
    @Body() body: { status: StudentStatus; reason: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.studentsService.changeStatus(id, body.status, body.reason, userId);
  }

  @Patch(':id/reactivate')
  @RequirePermissions(PERMISSIONS.STUDENT_EDIT)
  async reactivate(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.studentsService.reactivate(id, body.reason, userId);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.STUDENT_DELETE)
  async delete(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.studentsService.delete(id, userId);
  }

  // ─── Health Checkups ───

  @Get(':id/dental')
  @RequirePermissions(PERMISSIONS.STUDENT_VIEW)
  async getDentalCheckups(@Param('id') id: string) {
    return this.studentsService.getDentalCheckups(id);
  }

  @Post(':id/dental')
  @RequirePermissions(PERMISSIONS.STUDENT_EDIT)
  async addDentalCheckup(
    @Param('id') id: string,
    @Body() body: { year: number; round: number; checkDate: string; result?: string; findings?: string; dentist?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.studentsService.addDentalCheckup(id, body, userId);
  }

  @Get(':id/health')
  @RequirePermissions(PERMISSIONS.STUDENT_VIEW)
  async getHealthCheckups(@Param('id') id: string) {
    return this.studentsService.getHealthCheckups(id);
  }

  @Post(':id/health')
  @RequirePermissions(PERMISSIONS.STUDENT_EDIT)
  async addHealthCheckup(
    @Param('id') id: string,
    @Body() body: { checkDate: string; heightCm?: number; weightKg?: number; visionLeft?: string; visionRight?: string; bloodType?: string; findings?: string; note?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.studentsService.addHealthCheckup(id, body, userId);
  }
}

