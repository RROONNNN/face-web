import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class RejectLeaveRequestDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 2000)
  reason!: string;
}
