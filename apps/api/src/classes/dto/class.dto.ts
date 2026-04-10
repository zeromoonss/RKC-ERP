import { IsString, IsEnum, IsOptional, IsInt, Min, IsDateString, IsBoolean } from 'class-validator';

export class CreateClassDto {
  @IsString()
  name: string;

  @IsEnum(['KINDERGARTEN', 'ACADEMY'])
  classType: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['KINDERGARTEN', 'ACADEMY'])
  classType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AssignStudentDto {
  @IsString()
  studentId: string;
}

export class AssignTeacherDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
