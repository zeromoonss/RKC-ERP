import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { AuditAction, ProgramType, Gender, GuardianRelation, StudentStatus } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // Auto-generate student code: RKC-YYYY-NNNN
  private async generateStudentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RKC-${year}-`;

    const lastStudent = await this.prisma.student.findFirst({
      where: { studentCode: { startsWith: prefix } },
      orderBy: { studentCode: 'desc' },
    });

    let nextNum = 1;
    if (lastStudent) {
      const lastNum = parseInt(lastStudent.studentCode.split('-').pop() || '0', 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  async create(dto: CreateStudentDto, userId: string) {
    const studentCode = await this.generateStudentCode();

    const student = await this.prisma.$transaction(async (tx) => {
      // Create student
      const student = await tx.student.create({
        data: {
          studentCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          gender: dto.gender as Gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          programType: dto.programType as ProgramType,
          enrollDate: dto.enrollDate ? new Date(dto.enrollDate) : null,
          note: dto.note,
          status: 'PENDING',
        },
      });

      // Create guardians if provided
      if (dto.guardians && dto.guardians.length > 0) {
        for (const g of dto.guardians) {
          const guardian = await tx.guardian.create({
            data: {
              name: g.name,
              phone: g.phone,
              email: g.email,
              address: g.address,
            },
          });

          await tx.studentGuardian.create({
            data: {
              studentId: student.id,
              guardianId: guardian.id,
              relation: g.relation as GuardianRelation,
              isPrimary: g.isPrimary ?? false,
            },
          });
        }
      }

      // Create initial status history
      await tx.studentStatusHistory.create({
        data: {
          studentId: student.id,
          fromStatus: 'PENDING',
          toStatus: 'PENDING',
          reason: 'Student created',
          changedBy: userId,
        },
      });

      return student;
    });

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      entity: 'student',
      entityId: student.id,
      details: { studentCode, name: `${dto.firstName} ${dto.lastName}` },
    });

    return this.findOne(student.id);
  }

  async findAll(query: QueryStudentDto) {
    const { search, status, programType, classId, includeWithdrawn = false, page = 1, limit = 20 } = query;

    const where: any = {};

    // ── 소프트 삭제 정책: 기본적으로 WITHDRAWN(퇴원) 원생 제외 ──
    // status 필터가 명시적으로 WITHDRAWN인 경우, 또는 includeWithdrawn=true인 경우만 포함
    if (status) {
      where.status = status;
    } else if (!includeWithdrawn) {
      where.status = { not: 'WITHDRAWN' };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { studentCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (programType) {
      where.programType = programType;
    }

    if (classId) {
      where.classStudents = {
        some: {
          classId,
          isActive: true,
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          guardians: {
            include: {
              guardian: true,
            },
          },
          classStudents: {
            where: { isActive: true },
            include: {
              class: { select: { id: true, name: true, classType: true } },
            },
          },
          _count: {
            select: { promotions: true, billings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        guardians: {
          include: { guardian: true },
        },
        classStudents: {
          where: { isActive: true },
          include: {
            class: { select: { id: true, name: true, classType: true } },
          },
        },
        statusHistories: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
        promotions: {
          where: { isActive: true },
          orderBy: { startMonth: 'desc' },
        },
        _count: {
          select: { billings: true, receivables: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(id: string, dto: UpdateStudentDto, userId: string) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Student not found');
    }

    // ── 소프트 삭제 정책: 퇴원(WITHDRAWN) 원생은 수정 불가 ──
    if (existing.status === 'WITHDRAWN') {
      throw new BadRequestException(
        'Cannot modify a withdrawn student. Use reactivation to re-enroll.',
      );
    }

    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.gender && { gender: dto.gender as Gender }),
        ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.programType && { programType: dto.programType as ProgramType }),
        ...(dto.enrollDate && { enrollDate: new Date(dto.enrollDate) }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.hasAllergy !== undefined && { hasAllergy: dto.hasAllergy }),
        ...(dto.allergyDescription !== undefined && { allergyDescription: dto.allergyDescription }),
        ...(dto.lastDentalCheckDate && { lastDentalCheckDate: new Date(dto.lastDentalCheckDate) }),
        ...(dto.nextDentalCheckDate && { nextDentalCheckDate: new Date(dto.nextDentalCheckDate) }),
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'student',
      entityId: id,
      details: { changes: dto },
    });

    return this.findOne(id);
  }

  async changeStatus(id: string, newStatus: StudentStatus, reason: string, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.status === newStatus) {
      throw new BadRequestException(`Student is already ${newStatus}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === 'WITHDRAWN' && { withdrawDate: new Date() }),
        },
      });

      // ── 소프트 삭제 정책: 퇴원 시 모든 반(class) 배정 자동 비활성화 ──
      if (newStatus === 'WITHDRAWN') {
        await tx.classStudent.updateMany({
          where: { studentId: id, isActive: true },
          data: { isActive: false, removedAt: new Date() },
        });

        // 활성 프로모션도 비활성화
        await tx.studentPromotion.updateMany({
          where: { studentId: id, isActive: true },
          data: { isActive: false },
        });
      }

      await tx.studentStatusHistory.create({
        data: {
          studentId: id,
          fromStatus: student.status,
          toStatus: newStatus,
          reason,
          changedBy: userId,
        },
      });
    });

    await this.auditService.log({
      userId,
      action: AuditAction.STATUS_CHANGE,
      entity: 'student',
      entityId: id,
      details: { from: student.status, to: newStatus, reason },
    });

    return this.findOne(id);
  }

  /**
   * 퇴원생 재등록 (Reactivation).
   * WITHDRAWN → PENDING 으로 전환, withdrawDate 초기화.
   * 기존 데이터(청구내역, 보호자, 이력 등)는 모두 보존됨.
   */
  async reactivate(id: string, reason: string, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.status !== 'WITHDRAWN') {
      throw new BadRequestException('Only withdrawn students can be reactivated');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: {
          status: 'PENDING',
          withdrawDate: null,
        },
      });

      await tx.studentStatusHistory.create({
        data: {
          studentId: id,
          fromStatus: 'WITHDRAWN',
          toStatus: 'PENDING',
          reason: `Reactivated: ${reason}`,
          changedBy: userId,
        },
      });
    });

    await this.auditService.log({
      userId,
      action: AuditAction.STATUS_CHANGE,
      entity: 'student',
      entityId: id,
      details: { from: 'WITHDRAWN', to: 'PENDING', reason: `Reactivated: ${reason}` },
    });

    return this.findOne(id);
  }

  async getStats() {
    const [total, totalActive, byStatus, byProgram] = await Promise.all([
      // 전체 (WITHDRAWN 포함)
      this.prisma.student.count(),
      // 활성 원생 (WITHDRAWN 제외)
      this.prisma.student.count({ where: { status: { not: 'WITHDRAWN' } } }),
      this.prisma.student.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.student.groupBy({
        by: ['programType'],
        where: { status: 'ACTIVE' },
        _count: true,
      }),
    ]);

    return {
      total,
      totalActive,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byProgram: byProgram.reduce((acc, item) => {
        acc[item.programType] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // ─── DELETE (오너 전용, 청구 이력 있으면 불가) ───
  async delete(id: string, userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { _count: { select: { billings: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (student._count.billings > 0) {
      throw new BadRequestException(
        '청구/결제 이력이 있는 원생은 삭제할 수 없습니다. 퇴원 처리를 사용해주세요.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.classStudent.deleteMany({ where: { studentId: id } });
      await tx.studentGuardian.deleteMany({ where: { studentId: id } });
      await tx.studentStatusHistory.deleteMany({ where: { studentId: id } });
      await tx.studentPromotion.deleteMany({ where: { studentId: id } });
      await tx.dentalCheckup.deleteMany({ where: { studentId: id } });
      await tx.healthCheckup.deleteMany({ where: { studentId: id } });
      await tx.student.delete({ where: { id } });
    });

    await this.auditService.log({
      userId,
      action: AuditAction.DELETE,
      entity: 'student',
      entityId: id,
      details: { studentCode: student.studentCode, name: `${student.firstName} ${student.lastName}` },
    });

    return { message: 'Student deleted successfully' };
  }

  // ─── Dental Checkup (구강검사 - 연 2회 고정) ───
  async getDentalCheckups(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.dentalCheckup.findMany({
      where: { studentId },
      orderBy: [{ year: 'desc' }, { round: 'asc' }],
    });
  }

  async addDentalCheckup(
    studentId: string,
    body: { year: number; round: number; checkDate: string; result?: string; findings?: string; dentist?: string },
    userId: string,
  ) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    if (body.round < 1 || body.round > 2) {
      throw new BadRequestException('구강검사 회차는 1 또는 2만 가능합니다.');
    }

    const checkup = await this.prisma.dentalCheckup.upsert({
      where: {
        studentId_year_round: { studentId, year: body.year, round: body.round },
      },
      update: {
        checkDate: new Date(body.checkDate),
        result: body.result,
        findings: body.findings,
        dentist: body.dentist,
      },
      create: {
        studentId,
        year: body.year,
        round: body.round,
        checkDate: new Date(body.checkDate),
        result: body.result,
        findings: body.findings,
        dentist: body.dentist,
        createdBy: userId,
      },
    });

    // 마지막 검진일 & 다음 예정일 업데이트
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        lastDentalCheckDate: new Date(body.checkDate),
        nextDentalCheckDate: body.round === 1
          ? new Date(body.year, 5, 1) // 1차 후 → 하반기 예정
          : new Date(body.year + 1, 0, 1), // 2차 후 → 다음해 상반기
      },
    });

    return checkup;
  }

  // ─── Health Checkup (건강검진) ───
  async getHealthCheckups(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.healthCheckup.findMany({
      where: { studentId },
      orderBy: { checkDate: 'desc' },
    });
  }

  async addHealthCheckup(
    studentId: string,
    body: { checkDate: string; heightCm?: number; weightKg?: number; visionLeft?: string; visionRight?: string; bloodType?: string; findings?: string; note?: string },
    userId: string,
  ) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.healthCheckup.create({
      data: {
        studentId,
        checkDate: new Date(body.checkDate),
        heightCm: body.heightCm,
        weightKg: body.weightKg,
        visionLeft: body.visionLeft,
        visionRight: body.visionRight,
        bloodType: body.bloodType,
        findings: body.findings,
        note: body.note,
        createdBy: userId,
      },
    });
  }
}
