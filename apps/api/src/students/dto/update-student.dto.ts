import { IsString, IsEnum, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(['KINDERGARTEN', 'ACADEMY', 'BOTH'])
  programType?: string;

  @IsOptional()
  @IsDateString()
  enrollDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  hasAllergy?: boolean;

  @IsOptional()
  @IsString()
  allergyDescription?: string;

  @IsOptional()
  @IsDateString()
  lastDentalCheckDate?: string;

  @IsOptional()
  @IsDateString()
  nextDentalCheckDate?: string;
}
