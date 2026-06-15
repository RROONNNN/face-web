// src/modules/auth/dto/login.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsNotEmpty()
    employeeCode!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;
}