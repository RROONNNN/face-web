import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-req.type';
import { AccountRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
@AccountRoles([AccountRole.Admin])
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @AccountRoles([AccountRole.Admin, AccountRole.Employee])
    findAll(
        @Query() query: QueryUsersDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.usersService.findAll(query, request.user!);
    }

    @Get(':id')
    @AccountRoles([AccountRole.Admin])
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @AccountRoles([AccountRole.Admin])
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserDto,
    ) {
        return this.usersService.update(id, dto);
    }

    @Patch(':id/deactivate')
    @AccountRoles([AccountRole.Admin])
    deactivate(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.deactivate(id);
    }
}
