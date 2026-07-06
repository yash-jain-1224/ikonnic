import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

export type MicrosoftIdentity = {
  providerId: string;
  email: string;
  firstName: string;
  lastName?: string;
};

/**
 * Validates Azure Entra ID (Microsoft identity platform v2.0) ID tokens.
 *
 * The app registration uses signInAudience=AzureADandPersonalMicrosoftAccount,
 * so tokens may be issued by any tenant (work/school) or the consumer tenant
 * (personal Microsoft accounts). Issuer is therefore validated by pattern
 * (https://login.microsoftonline.com/{tid}/v2.0) with tid cross-checked
 * against the token's tid claim; audience must be our client id.
 */
@Injectable()
export class MicrosoftSsoService {
  private readonly logger = new Logger(MicrosoftSsoService.name);
  private readonly clientId: string;
  private readonly jwksClient: JwksClient;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get('AZURE_AD_CLIENT_ID', '');
    this.jwksClient = new JwksClient({
      jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
      cache: true,
      cacheMaxAge: 60 * 60 * 1000,
      rateLimit: true,
    });
  }

  isConfigured(): boolean {
    return Boolean(this.clientId);
  }

  async verifyIdToken(idToken: string): Promise<MicrosoftIdentity> {
    if (!this.isConfigured()) {
      throw new UnauthorizedException('Microsoft sign-in is not configured');
    }

    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      throw new UnauthorizedException('Invalid Microsoft token');
    }

    let signingKey: string;
    try {
      const key = await this.jwksClient.getSigningKey(decoded.header.kid);
      signingKey = key.getPublicKey();
    } catch (err) {
      this.logger.warn(`JWKS key lookup failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Unable to validate Microsoft token');
    }

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(idToken, signingKey, {
        algorithms: ['RS256'],
        audience: this.clientId,
      }) as jwt.JwtPayload;
    } catch (err) {
      this.logger.warn(`Microsoft token verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid Microsoft token');
    }

    // Issuer must be the Microsoft identity platform v2.0 endpoint for the
    // token's own tenant (multi-tenant + personal accounts app).
    const tid = payload.tid as string | undefined;
    const issuerOk =
      typeof payload.iss === 'string' &&
      tid &&
      payload.iss === `https://login.microsoftonline.com/${tid}/v2.0`;
    if (!issuerOk) {
      throw new UnauthorizedException('Invalid Microsoft token issuer');
    }

    const email: string | undefined =
      (payload.email as string | undefined) ||
      (typeof payload.preferred_username === 'string' && payload.preferred_username.includes('@')
        ? payload.preferred_username
        : undefined);
    if (!email) {
      throw new UnauthorizedException('Microsoft account has no email address');
    }

    const providerId = (payload.oid as string | undefined) || (payload.sub as string);
    const givenName = payload.given_name as string | undefined;
    const familyName = payload.family_name as string | undefined;
    const displayName = (payload.name as string | undefined) || email.split('@')[0];
    const firstName = givenName || displayName.split(' ')[0];
    const lastName = familyName || displayName.split(' ').slice(1).join(' ') || undefined;

    return { providerId, email: email.toLowerCase(), firstName, lastName };
  }
}
