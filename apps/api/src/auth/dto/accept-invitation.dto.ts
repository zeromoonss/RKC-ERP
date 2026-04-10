import { IsString, MinLength, IsOptional } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
