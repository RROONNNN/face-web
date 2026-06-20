// src/modules/auth/dto/login.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
    @IsString()
    refreshToken?: string;

    @IsString()
    @IsNotEmpty()
    userId!: string;
}