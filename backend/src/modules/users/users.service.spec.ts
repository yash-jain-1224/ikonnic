import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    address: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const mockUser = { id: 'u1', email: 'test@test.com', firstName: 'John' };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('u1');
      expect(result).toEqual(mockUser);
    });

    it('throws NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('updates user profile fields', async () => {
      const updated = { id: 'u1', firstName: 'Jane', lastName: 'Doe' };
      prismaMock.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile('u1', { firstName: 'Jane' });
      expect(result.firstName).toBe('Jane');
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { firstName: 'Jane' },
      });
    });
  });

  describe('getAddresses', () => {
    it('returns addresses ordered by default first', async () => {
      const addresses = [
        { id: 'a1', isDefault: true },
        { id: 'a2', isDefault: false },
      ];
      prismaMock.address.findMany.mockResolvedValue(addresses);

      const result = await service.getAddresses('u1');
      expect(result).toEqual(addresses);
      expect(prismaMock.address.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { isDefault: 'desc' },
      });
    });
  });

  describe('addAddress', () => {
    it('creates an address', async () => {
      const newAddress = { id: 'a3', fullName: 'Test', city: 'Mumbai' };
      prismaMock.address.create.mockResolvedValue(newAddress);

      const result = await service.addAddress('u1', { fullName: 'Test', city: 'Mumbai' });
      expect(result).toEqual(newAddress);
    });

    it('unsets other defaults when setting isDefault', async () => {
      prismaMock.address.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.address.create.mockResolvedValue({ id: 'a4', isDefault: true });

      await service.addAddress('u1', { fullName: 'Test', isDefault: true });
      expect(prismaMock.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { isDefault: false },
      });
    });
  });

  describe('updateAddress', () => {
    it('updates an address when it belongs to user', async () => {
      prismaMock.address.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1' });
      prismaMock.address.update.mockResolvedValue({ id: 'a1', city: 'Delhi' });

      const result = await service.updateAddress('a1', 'u1', { city: 'Delhi' });
      expect(result.city).toBe('Delhi');
    });

    it('throws NotFoundException when address not found', async () => {
      prismaMock.address.findFirst.mockResolvedValue(null);

      await expect(service.updateAddress('a999', 'u1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAddress', () => {
    it('deletes an address when it belongs to user', async () => {
      prismaMock.address.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1' });
      prismaMock.address.delete.mockResolvedValue({});

      const result = await service.deleteAddress('a1', 'u1');
      expect(result.message).toBe('Address deleted');
    });

    it('throws NotFoundException when address not owned by user', async () => {
      prismaMock.address.findFirst.mockResolvedValue(null);

      await expect(service.deleteAddress('a1', 'u2')).rejects.toThrow(NotFoundException);
    });
  });
});
