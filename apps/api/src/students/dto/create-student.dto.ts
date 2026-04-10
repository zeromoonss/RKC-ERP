import { IsString, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGuardianDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(['FATHER', 'MOTHER', 'GRANDFATHER', 'GRANDMOTHER', 'OTHER'])
  relation: string;

  @IsOptional()
  isPrimary?: boolean;
}

export class CreateStudentDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsEnum(['KINDERGARTEN', 'ACADEMY', 'BOTH'])
  programType: string;

  @IsOptional()
  @IsDateString()
  enrollDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGuardianDto)
  guardians?: CreateGuardianDto[];
}
