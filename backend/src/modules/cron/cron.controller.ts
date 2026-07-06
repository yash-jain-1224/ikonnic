import { Controller, Post, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { CronService } from './cron.service';

/**
 * Secured cron endpoints invoked by external schedulers (Vercel Cron, GitHub Actions, etc.).
 * Protected by a shared CRON_SECRET header — not by JWT (no user context).
 */
@ApiTags('cron')
@SkipThrottle()
@Controller('cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly cronService: CronService,
    private readonly configService: ConfigService,
  ) {}

  private assertCronSecret(authorization: string | undefined) {
    const secret = this.configService.get<string>('CRON_SECRET');
    if (!secret) {
      throw new UnauthorizedException('CRON_SECRET not configured');
    }
    if (authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
  }

  @Post('cleanup-carts')
  @ApiOperation({ summary: 'Remove abandoned guest carts older than 7 days' })
  async cleanupCarts(@Headers('authorization') auth: string) {
    this.assertCronSecret(auth);
    const result = await this.cronService.cleanupAbandonedCarts();
    this.logger.log(`Cron: cleaned up ${result.count} abandoned carts`);
    return result;
  }

  @Post('cleanup-expired-otps')
  @ApiOperation({ summary: 'Remove expired OTP records' })
  async cleanupExpiredOtps(@Headers('authorization') auth: string) {
    this.assertCronSecret(auth);
    const result = await this.cronService.cleanupExpiredOtps();
    this.logger.log(`Cron: cleaned up ${result.count} expired OTPs`);
    return result;
  }

  @Post('send-review-requests')
  @ApiOperation({ summary: 'Send review request emails for delivered orders (7 days post-delivery)' })
  async sendReviewRequests(@Headers('authorization') auth: string) {
    this.assertCronSecret(auth);
    const result = await this.cronService.sendReviewRequests();
    this.logger.log(`Cron: sent ${result.count} review request emails`);
    return result;
  }

  @Post('revoke-expired-tokens')
  @ApiOperation({ summary: 'Revoke expired refresh tokens' })
  async revokeExpiredTokens(@Headers('authorization') auth: string) {
    this.assertCronSecret(auth);
    const result = await this.cronService.revokeExpiredTokens();
    this.logger.log(`Cron: revoked ${result.count} expired refresh tokens`);
    return result;
  }
}
