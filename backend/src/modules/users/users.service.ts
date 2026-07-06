import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        avatar: true, role: true, isVerified: true, createdAt: true,
        addresses: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateProfile(
    userId: string,
    data: { name?: string; firstName?: string; lastName?: string; phone?: string; avatar?: string },
  ) {
    const { name, ...rest } = data;
    const update: { firstName?: string; lastName?: string; phone?: string; avatar?: string } = { ...rest };

    // Accept a combined display name and split it onto the stored columns
    if (name && !update.firstName) {
      const parts = name.trim().split(/\s+/);
      update.firstName = parts[0];
      update.lastName = parts.slice(1).join(' ') || undefined;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: update,
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        avatar: true, role: true, isVerified: true, createdAt: true,
      },
    });
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  async addAddress(userId: string, data: any) {
    // If setting as default, unset others
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.create({ data: { ...data, userId } });
  }

  async updateAddress(addressId: string, userId: string, data: any) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.update({ where: { id: addressId }, data });
  }

  async deleteAddress(addressId: string, userId: string) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id: addressId } });
    return { message: 'Address deleted' };
  }
}
