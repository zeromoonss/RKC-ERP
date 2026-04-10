import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto, AssignStudentDto, AssignTeacherDto } from './dto/class.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../shared';

@Controller('classes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CLASS_CREATE)
  async create(
    @Body() dto: CreateClassDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.classesService.create(dto, userId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CLASS_VIEW)
  async findAll(@Query('classType') classType?: string) {
    return this.classesService.findAll(classType);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CLASS_VIEW)
  async findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.CLASS_CREATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.classesService.update(id, dto, userId);
  }

  @Post(':id/students')
  @RequirePermissions(PERMISSIONS.CLASS_ASSIGN_STUDENT)
  async assignStudent(
    @Param('id') classId: string,
    @Body() dto: AssignStudentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.classesService.assignStudent(classId, dto.studentId, userId);
  }

  @Delete(':id/students/:studentId')
  @RequirePermissions(PERMISSIONS.CLASS_ASSIGN_STUDENT)
  async removeStudent(
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.classesService.removeStudent(classId, studentId, userId);
  }

  @Post(':id/teachers')
  @RequirePermissions(PERMISSIONS.CLASS_ASSIGN_TEACHER)
  async assignTeacher(
    @Param('id') classId: string,
    @Body() dto: AssignTeacherDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.classesService.assignTeacher(classId, dto.userId, dto.isPrimary ?? false, userId);
  }

  @Delete(':id/teachers/:userId')
  @RequirePermissions(PERMISSIONS.CLASS_ASSIGN_TEACHER)
  async removeTeacher(
    @Param('id') classId: string,
    @Param('userId') teacherUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.classesService.removeTeacher(classId, teacherUserId, userId);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CLASS_DELETE)
  async delete(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.classesService.delete(id, userId);
  }
}
