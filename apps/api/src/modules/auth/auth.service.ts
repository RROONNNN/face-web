import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from './entities/refresh-token.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

type AccessTokenPayload = {
    sub: string;
    employeeCode: string;
    role: string;
};

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,

        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,
    ) { }
    async login(input: { employeeCode: string; password: string }) {
        const user = await this.usersService.findByEmployeeCode(input.employeeCode);
        if (!user) {
            throw new Error('Invalid employee code or password');
        }
        const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid employee code or password');
        }
        const accessToken = await this.signAccessToken({
            sub: user.id,
            employeeCode: user.employeeCode,
            role: user.accountRole,
        });
        const refreshToken = await this.createRefreshToken(user.id);
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                employeeCode: user.employeeCode,
                name: user.name,
                accountRole: user.accountRole,
            },
        };
    }
    private signAccessToken(payload: AccessTokenPayload): Promise<string> {
        return this.jwtService.signAsync(payload);
    }
    private async createRefreshToken(userId: string): Promise<string> {
        const rawToken = randomBytes(64).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 10);

        const expiresInDays = this.configService.getOrThrow<number>(
            'jwt.refreshExpiresInDays',
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const refreshToken = this.refreshTokenRepository.create({
            userId,
            tokenHash,
            expiresAt,
            revokedAt: null,
        });

        await this.refreshTokenRepository.save(refreshToken);

        return rawToken;
    }
}
