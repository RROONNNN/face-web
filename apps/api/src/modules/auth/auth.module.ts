import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Module({
    imports: [
        UsersModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                global: true,
                secret: configService.getOrThrow<string>('jwt.accessSecret'),
                signOptions: { expiresIn: '24h' },
            }),
        }),
        TypeOrmModule.forFeature([RefreshToken]),
    ],
    controllers: [AuthController],
    providers: [AuthService],

})
export class AuthModule {

}
