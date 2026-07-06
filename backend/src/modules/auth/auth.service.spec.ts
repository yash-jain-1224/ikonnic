import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    otpVerification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtMock = { signAsync: jest.fn().mockResolvedValue('signed-token') };
  const configMock = { get: jest.fn((_key: string, def?: string) => def) };
  const redisMock = { del: jest.fn() };
  const notificationsMock = {
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetOtp: jest.fn(),
    sendEmail: jest.fn(),
    sendSms: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
        { provide: RedisService, useValue: redisMock },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    const dto = {
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      password: 'Str0ng@Pass',
    };

    it('throws ConflictException when a user with the email already exists', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 'u1', email: dto.email });

      await expect(service.register(dto as any)).rejects.toThrow(ConflictException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('hashes the password and returns tokens with a sanitized user', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockImplementation(async ({ data }: any) => ({
        id: 'u1',
        role: 'CUSTOMER',
        ...data,
      }));
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.register(dto as any);

      const createdWith = prismaMock.user.create.mock.calls[0][0].data;
      expect(createdWith.passwordHash).toBeDefined();
      expect(createdWith.passwordHash).not.toEqual(dto.password);
      await expect(bcrypt.compare(dto.password, createdWith.passwordHash)).resolves.toBe(true);

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(prismaMock.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const passwordHashPromise = bcrypt.hash('Correct@123', 4);

    it('throws UnauthorizedException for an unknown user', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ identifier: 'ghost@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for a wrong password', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        role: 'CUSTOMER',
        isActive: true,
        passwordHash: await passwordHashPromise,
      });

      await expect(
        service.login({ identifier: 'user@example.com', password: 'Wrong@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for a deactivated account', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        role: 'CUSTOMER',
        isActive: false,
        passwordHash: await passwordHashPromise,
      });

      await expect(
        service.login({ identifier: 'user@example.com', password: 'Correct@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens and sanitized user on valid credentials', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        role: 'CUSTOMER',
        isActive: true,
        passwordHash: await passwordHashPromise,
      });
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ identifier: 'user@example.com', password: 'Correct@123' });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } }),
      );
    });
  });

  describe('refreshTokens', () => {
    it('throws UnauthorizedException for an unknown token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('missing')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for a revoked token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 1000),
        user: { id: 'u1', email: 'user@example.com', role: 'CUSTOMER' },
      });

      await expect(service.refreshTokens('revoked')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for an expired token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'u1', email: 'user@example.com', role: 'CUSTOMER' },
      });

      await expect(service.refreshTokens('expired')).rejects.toThrow(UnauthorizedException);
    });

    it('rotates the token: revokes the old one and issues a new one in the same family', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        family: 'fam-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 1000 * 60),
        user: { id: 'u1', email: 'user@example.com', role: 'CUSTOMER' },
      });
      prismaMock.refreshToken.update.mockResolvedValue({});
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('valid');

      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { isRevoked: true },
      });
      expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ family: 'fam-1', userId: 'u1' }),
      });
      expect(result.accessToken).toBe('signed-token');
    });
  });

  describe('resetPassword', () => {
    it('throws BadRequestException for an invalid or expired OTP', async () => {
      prismaMock.otpVerification.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('user@example.com', '000000', 'New@Pass1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('marks the OTP used, updates the password, and revokes all refresh tokens', async () => {
      prismaMock.otpVerification.findFirst.mockResolvedValue({ id: 'otp1', attempts: 0 });
      prismaMock.otpVerification.update.mockResolvedValue({});
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.refreshToken.updateMany.mockResolvedValue({});

      const result = await service.resetPassword('user@example.com', '123456', 'New@Pass1');

      expect(prismaMock.otpVerification.update).toHaveBeenCalledWith({
        where: { id: 'otp1' },
        data: { isUsed: true },
      });
      const updatedWith = prismaMock.user.update.mock.calls[0][0].data;
      await expect(bcrypt.compare('New@Pass1', updatedWith.passwordHash)).resolves.toBe(true);
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { user: { email: 'user@example.com' } },
        data: { isRevoked: true },
      });
      expect(result.message).toMatch(/reset/i);
    });
  });
});
