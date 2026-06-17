import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './authenticated-req.type';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('refresh')
    refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refresh(dto.refreshToken);
    }

    @Post('logout')
    @UseGuards(AuthGuard)
    logout(@Body() dto: LogoutDto, @Req() request: AuthenticatedRequest) {
        return this.authService.logout(request.user!.id, dto.refreshToken);
    }
}
