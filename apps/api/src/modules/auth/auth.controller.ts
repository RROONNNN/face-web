import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthGuard } from './auth.guard';
import { LogoutDto } from './dto/logout.dto';
import { RegisterDto } from './dto/register.dto';
import { AccountRoles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { AccountRole } from './account-role.enum';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    /**
     * Register a new employee account.
     * Admin-only: only authenticated admins can create new users.
     */
    @Post('register')
    @UseGuards(AuthGuard, RolesGuard)
    @AccountRoles([AccountRole.Admin])
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('refresh')
    refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refresh(dto.refreshToken);
    }
    @Post('logout')
    @UseGuards(AuthGuard)
    logout(@Body() dto: LogoutDto) {
        return this.authService.logout({ userId: dto.userId, rawRefreshToken: dto.refreshToken });
    }
}
