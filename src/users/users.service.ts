import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private exclude(user: User): SafeUser {
    const { password: _pw, ...safe } = user;
    return safe;
  }

  async findByEmail(email: string, includePassword = false): Promise<User | SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || includePassword) return user;
    return this.exclude(user);
  }

  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.exclude(user);
  }

  async create(data: Prisma.UserCreateInput): Promise<SafeUser> {
    const user = await this.prisma.user.create({ data });
    return this.exclude(user);
  }
}