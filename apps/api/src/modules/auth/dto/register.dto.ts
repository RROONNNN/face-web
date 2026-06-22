import { CreateUserDto } from '../../users/dto/create-user.dto';

/**
 * RegisterDto is an alias for CreateUserDto.
 * It lives in the auth module because POST /auth/register is the employee
 * onboarding entry point, but all validation/creation logic is in UsersService.
 */
export class RegisterDto extends CreateUserDto {}
