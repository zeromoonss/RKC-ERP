import { IsOptional, IsEnum, IsString, IsInt, IsBoolean, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryStudentDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by name or code

  @IsOptional()
  @IsEnum(['PENDING', 'ACTIVE', 'ON_LEAVE', 'WITHDRAWN'])
  status?: string;

  @IsOptional()
  @IsEnum(['KINDERGARTEN', 'ACADEMY', 'BOTH'])
  programType?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  /**
   * 퇴원생(WITHDRAWN) 포함 여부.
   * 기본값 false → 일반 목록에서 퇴원생 자동 제외.
   * true → 퇴원생 포함 (관리자 이력 조회용).
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeWithdrawn?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
