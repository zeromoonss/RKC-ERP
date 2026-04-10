import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
import { AuditAction, ClassType } from '@prisma/client';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateClassDto, userId: string) {
    const cls = await this.prisma.class.create({
      data: {
        name: dto.name,
        classType: dto.classType as ClassType,
        description: dto.description,
        capacity: dto.capacity ?? 20,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      entity: 'class',
      entityId: cls.id,
      details: { name: dto.name, classType: dto.classType },
    });

    return this.findOne(cls.id);
  }

  async findAll(classType?: string) {
    const where: any = {};
    if (classType) {
      where.classType = classType;
    }

    return this.prisma.class.findMany({
      where,
      include: {
        students: {
          where: { isActive: true },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, studentCode: true, status: true },
            },
          },
        },
        teachers: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: {
            students: { where: { isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        students: {
          where: { isActive: true },
          include: {
            student: {
              select: {
                id: true, firstName: true, lastName: true,
                studentCode: true, status: true, programType: true,
              },
            },
          },
        },
        teachers: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!cls) {
      throw new NotFoundException('Class not found');
    }

    return cls;
  }

  async update(id: string, dto: UpdateClassDto, userId: string) {
    const existing = await this.prisma.class.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Class not found');

    await this.prisma.class.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.classType && { classType: dto.classType as ClassType }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.capacity && { capacity: dto.capacity }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'class',
      entityId: id,
      details: { changes: dto },
    });

    return this.findOne(id);
  }

  async assignStudent(classId: string, studentId: string, userId: string) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');

    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    // Check capacity
    const currentCount = await this.prisma.classStudent.count({
      where: { classId, isActive: true },
    });
    if (currentCount >= cls.capacity) {
      throw new BadRequestException('Class is at full capacity');
    }

    // Check if already assigned
    const existing = await this.prisma.classStudent.findUnique({
      where: { classId_studentId: { classId, studentId } },
    });

    if (existing && existing.isActive) {
      throw new BadRequestException('Student is already assigned to this class');
    }

    if (existing) {
      // Reactivate
      await this.prisma.classStudent.update({
        where: { id: existing.id },
        data: { isActive: true, removedAt: null },
      });
    } else {
      await this.prisma.classStudent.create({
        data: { classId, studentId },
      });
    }

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'class',
      entityId: classId,
      details: { action: 'assign_student', studentId },
    });

    return this.findOne(classId);
  }

  async removeStudent(classId: string, studentId: string, userId: string) {
    const assignment = await this.prisma.classStudent.findUnique({
      where: { classId_studentId: { classId, studentId } },
    });

    if (!assignment || !assignment.isActive) {
      throw new NotFoundException('Student assignment not found');
    }

    await this.prisma.classStudent.update({
      where: { id: assignment.id },
      data: { isActive: false, removedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'class',
      entityId: classId,
      details: { action: 'remove_student', studentId },
    });

    return this.findOne(classId);
  }

  async assignTeacher(classId: string, teacherUserId: string, isPrimary: boolean, userId: string) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');

    const user = await this.prisma.user.findUnique({ where: { id: teacherUserId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.teacherAssignment.findUnique({
      where: { classId_userId: { classId, userId: teacherUserId } },
    });

    if (existing && existing.isActive) {
      throw new BadRequestException('Teacher is already assigned to this class');
    }

    if (existing) {
      await this.prisma.teacherAssignment.update({
        where: { id: existing.id },
        data: { isActive: true, isPrimary, removedAt: null },
      });
    } else {
      await this.prisma.teacherAssignment.create({
        data: { classId, userId: teacherUserId, isPrimary },
      });
    }

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'class',
      entityId: classId,
      details: { action: 'assign_teacher', teacherUserId, isPrimary },
    });

    return this.findOne(classId);
  }

  async removeTeacher(classId: string, teacherUserId: string, userId: string) {
    const assignment = await this.prisma.teacherAssignment.findUnique({
      where: { classId_userId: { classId, userId: teacherUserId } },
    });

    if (!assignment || !assignment.isActive) {
      throw new NotFoundException('Teacher assignment not found');
    }

    await this.prisma.teacherAssignment.update({
      where: { id: assignment.id },
      data: { isActive: false, removedAt: new Date() },
    });

    return this.findOne(classId);
  }

  async delete(id: string, userId: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: { _count: { select: { students: { where: { isActive: true } } } } },
    });
    if (!cls) throw new NotFoundException('Class not found');

    if (cls._count.students > 0) {
      throw new BadRequestException(
        '학생이 배정된 반은 삭제할 수 없습니다. 먼저 학생을 모두 해제해주세요.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.teacherAssignment.deleteMany({ where: { classId: id } });
      await tx.classStudent.deleteMany({ where: { classId: id } });
      await tx.class.delete({ where: { id } });
    });

    await this.auditService.log({
      userId,
      action: AuditAction.DELETE,
      entity: 'class',
      entityId: id,
      details: { name: cls.name, classType: cls.classType },
    });

    return { message: 'Class deleted successfully' };
  }
}
