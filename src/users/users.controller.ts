import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // Saat ini tidak ada endpoint langsung ke /users
  // Semua manajemen user (Register, Me) di-handle oleh AuthController
}