import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MicrosoftSsoService } from './microsoft-sso.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
    private notifications: NotificationsService,
    private microsoftSso: MicrosoftSsoService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user exists
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Create session
    await this.createSession(user.id, tokens.refreshToken);

    // Send verification email (async, non-blocking)
    this.sendVerificationEmail(user.email, user.firstName);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { phone: dto.identifier },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Create session
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Login (or auto-register) via Azure Entra ID. The frontend exchanges the
   * OAuth code for an ID token; we verify it against Microsoft's JWKS and
   * issue our own platform tokens.
   */
  async loginWithMicrosoft(idToken: string) {
    const identity = await this.microsoftSso.verifyIdToken(idToken);

    let user = await this.prisma.user.findUnique({ where: { email: identity.email } });

    if (user) {
      if (!user.isActive) {
        throw new UnauthorizedException('Account has been deactivated');
      }
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          // Link the Microsoft identity to an existing account; e-mail
          // ownership is proven by the verified ID token.
          providerId: user.providerId ?? identity.providerId,
          isVerified: true,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email: identity.email,
          firstName: identity.firstName,
          lastName: identity.lastName,
          authProvider: 'MICROSOFT',
          providerId: identity.providerId,
          isVerified: true,
          lastLoginAt: new Date(),
        },
      });
      this.sendVerificationEmail(user.email, user.firstName);
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    // Verify the refresh token exists and is valid
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
    );

    // Store new refresh token in the same family
    await this.prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        token: tokens.refreshToken,
        family: storedToken.family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return tokens;
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke specific token
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { isRevoked: true },
      });
    } else {
      // Revoke all tokens for user
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }

    // Invalidate cache
    await this.redis.del(`user:${userId}`);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether user exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP
    await this.prisma.otpVerification.create({
      data: {
        identifier: email,
        otp,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      },
    });

    // Send email (async)
    this.sendPasswordResetEmail(email, otp, user.firstName);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const verification = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: email,
        otp,
        type: 'password_reset',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (verification.attempts >= 5) {
      throw new BadRequestException('Too many attempts. Please request a new OTP');
    }

    // Mark OTP as used
    await this.prisma.otpVerification.update({
      where: { id: verification.id },
      data: { isUsed: true },
    });

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { user: { email } },
      data: { isRevoked: true },
    });

    return { message: 'Password reset successfully' };
  }

  async verifyEmail(email: string, otp: string) {
    const verification = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: email,
        otp,
        type: 'email_verification',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.otpVerification.update({
      where: { id: verification.id },
      data: { isUsed: true },
    });

    await this.prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    return { message: 'Email verified successfully' };
  }

  async sendOtp(identifier: string, type: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.prisma.otpVerification.create({
      data: {
        identifier,
        otp,
        type,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    // Send OTP via SMS or email based on identifier
    if (identifier.includes('@')) {
      this.sendOtpEmail(identifier, otp);
    } else {
      this.sendOtpSms(identifier, otp);
    }

    return { message: 'OTP sent successfully' };
  }

  // ─── Private Methods ─────────────────────────────

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    // A unique jti guarantees every issued token is a distinct string. Without
    // it, two tokens minted for the same user within the same clock second are
    // byte-identical (same payload + second-precision `iat`), which collides on
    // the `refresh_tokens.token` unique index — breaking login-right-after-
    // register and refresh-token rotation intermittently.
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, jti: uuidv4() },
        { expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m') },
      ),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh', jti: uuidv4() },
        { expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d') },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async createSession(userId: string, refreshToken: string) {
    const family = uuidv4();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  // Notification delivery — wired to NotificationsService. All calls degrade
  // gracefully (the service catches transport failures internally) so auth
  // flows never fail because email/SMS is unavailable.
  private async sendVerificationEmail(email: string, name: string) {
    await this.notifications.sendWelcomeEmail(email, name);
  }

  private async sendPasswordResetEmail(email: string, otp: string, name: string) {
    await this.notifications.sendPasswordResetOtp(email, otp, name);
  }

  private async sendOtpEmail(email: string, otp: string) {
    await this.notifications.sendEmail(
      email,
      'Your Ikonnic verification code',
      `<p>Your one-time code is <strong style="font-size:20px;letter-spacing:4px">${otp}</strong>. It expires in 10 minutes.</p>`,
    );
  }

  private async sendOtpSms(phone: string, otp: string) {
    await this.notifications.sendSms(phone, `Ikonnic: your one-time code is ${otp}. It expires in 10 minutes.`);
  }
}
