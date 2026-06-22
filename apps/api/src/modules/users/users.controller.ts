import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AuthGuard } from '../auth/auth.guard';
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
    findAll(@Query() query: QueryUsersDto) {
        return this.usersService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserDto,
    ) {
        return this.usersService.update(id, dto);
    }

    @Patch(':id/deactivate')
    deactivate(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.deactivate(id);
    }
}
