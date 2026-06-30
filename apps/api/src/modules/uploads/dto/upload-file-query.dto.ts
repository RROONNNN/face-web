import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class UploadFileQueryDto {
  @IsOptional()
  @IsIn(['image', 'video', 'raw', 'auto'])
  resourceType?: 'image' | 'video' | 'raw' | 'auto';

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9/_-]+$/)
  folder?: string;
}
