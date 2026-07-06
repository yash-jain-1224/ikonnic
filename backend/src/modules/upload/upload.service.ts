import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, ContainerClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import sharp from 'sharp';
import * as crypto from 'crypto';
import * as path from 'path';

export type UploadResult = {
  key: string;
  url: string;
  cdnUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private blobServiceClient: BlobServiceClient;
  private containerName: string;
  private accountName: string;
  private accountKey: string;
  private cdnUrl: string;
  /**
   * Whether the storage account/container allows anonymous ("blob") public read.
   * When false (the safe default for Azure accounts with public access disabled),
   * uploaded URLs are stamped with a long-lived read SAS token so browsers can
   * render them without the account-level public-access flag.
   */
  private publicRead: boolean;
  private readSasTtlDays: number;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING', '');
    this.containerName = this.configService.get('AZURE_STORAGE_CONTAINER', 'uploads');
    this.accountName = this.configService.get('AZURE_STORAGE_ACCOUNT_NAME', '');
    this.accountKey = this.configService.get('AZURE_STORAGE_ACCOUNT_KEY', '');
    this.publicRead = this.configService.get('AZURE_BLOB_PUBLIC_READ', 'false') === 'true';
    this.readSasTtlDays = parseInt(this.configService.get('AZURE_BLOB_READ_SAS_TTL_DAYS', '3650'), 10) || 3650;

    // When only a connection string is provided, derive the account name/key
    // from it so SAS generation (read + write) works without duplicate env vars.
    if (connectionString) {
      const parsed = this.parseConnectionString(connectionString);
      if (!this.accountName && parsed.accountName) this.accountName = parsed.accountName;
      if (!this.accountKey && parsed.accountKey) this.accountKey = parsed.accountKey;
    }

    this.cdnUrl = this.configService.get('CDN_URL', `https://${this.accountName}.blob.core.windows.net/${this.containerName}`);

    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else {
      // Fallback: construct from account name/key
      const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.accountName}.blob.core.windows.net`,
        sharedKeyCredential,
      );
    }

    // Ensure container exists (runs once on startup)
    this.ensureContainer();
  }

  private parseConnectionString(cs: string): { accountName?: string; accountKey?: string } {
    const out: { accountName?: string; accountKey?: string } = {};
    for (const part of cs.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key === 'AccountName') out.accountName = value;
      if (key === 'AccountKey') out.accountKey = value;
    }
    return out;
  }

  /**
   * Return a browser-fetchable URL for a blob. If the account allows public
   * blob read we return the bare URL; otherwise we stamp a long-lived read SAS
   * so uploaded product/customiser images render on the storefront regardless
   * of the account's public-access setting.
   */
  private toPublicUrl(blobUrl: string, blobName: string): string {
    if (this.publicRead || !this.accountName || !this.accountKey) return blobUrl;
    try {
      const startsOn = new Date(Date.now() - 5 * 60 * 1000); // small backdate for clock skew
      const expiresOn = new Date(Date.now() + this.readSasTtlDays * 24 * 60 * 60 * 1000);
      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: this.containerName,
          blobName,
          permissions: BlobSASPermissions.parse('r'),
          startsOn,
          expiresOn,
        },
        new StorageSharedKeyCredential(this.accountName, this.accountKey),
      ).toString();
      return `${blobUrl}?${sasToken}`;
    } catch (error) {
      this.logger.warn(`Could not stamp read SAS for ${blobName}: ${(error as Error).message}`);
      return blobUrl;
    }
  }

  private async ensureContainer(): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      // 'blob' = anonymous read of individual blobs (no container listing).
      // Product/customiser images are public web assets and must be fetchable
      // by unauthenticated browsers, so the returned blob URLs render. Requires
      // the storage account to allow blob public access.
      await containerClient.createIfNotExists({ access: 'blob' });
      this.logger.log(`Azure Blob container "${this.containerName}" ready`);
    } catch (error) {
      this.logger.warn(`Could not ensure container: ${(error as Error).message}`);
    }
  }

  private getContainerClient(): ContainerClient {
    return this.blobServiceClient.getContainerClient(this.containerName);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'misc',
    options?: { maxWidth?: number; quality?: number },
  ): Promise<UploadResult> {
    this.validateFile(file);

    // Generate unique filename
    const hash = crypto.randomBytes(8).toString('hex');
    const ext = this.isImage(file.mimetype) ? '.webp' : (path.extname(file.originalname).toLowerCase() || '.bin');
    const blobName = `${folder}/${hash}${ext}`;

    // Process image with sharp (resize + convert to WebP)
    let buffer = file.buffer;
    let contentType = file.mimetype;
    if (this.isImage(file.mimetype)) {
      buffer = await sharp(file.buffer)
        .resize({ width: options?.maxWidth || 1200, withoutEnlargement: true })
        .webp({ quality: options?.quality || 82 })
        .toBuffer();
      contentType = 'image/webp';
    }

    // Upload to Azure Blob Storage
    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: 'public, max-age=31536000, immutable',
      },
    });

    const url = this.toPublicUrl(blockBlobClient.url, blobName);
    const cdnUrl = this.publicRead ? `${this.cdnUrl}/${blobName}` : url;

    this.logger.log(`Uploaded: ${blobName} (${(buffer.length / 1024).toFixed(1)}KB)`);

    return {
      key: blobName,
      url,
      cdnUrl,
      originalName: file.originalname,
      mimeType: contentType,
      size: buffer.length,
    };
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    folder: string = 'misc',
  ): Promise<UploadResult[]> {
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }

  async deleteFile(key: string): Promise<void> {
    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    await blockBlobClient.deleteIfExists();
    this.logger.log(`Deleted: ${key}`);
  }

  async getPresignedUrl(key: string, expiresInMinutes = 60): Promise<string> {
    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    // Generate SAS token
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

    const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: key,
        permissions: BlobSASPermissions.parse('r'), // read-only
        startsOn,
        expiresOn,
      },
      sharedKeyCredential,
    ).toString();

    return `${blockBlobClient.url}?${sasToken}`;
  }

  /**
   * Generate a SAS URL for direct browser upload (used for large files / customiser uploads)
   */
  async getUploadSasUrl(blobName: string, contentType: string, expiresInMinutes = 30): Promise<{ uploadUrl: string; blobUrl: string; cdnUrl: string }> {
    const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName,
        permissions: BlobSASPermissions.parse('cw'), // create + write
        startsOn,
        expiresOn,
        contentType,
      },
      sharedKeyCredential,
    ).toString();

    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const publicUrl = this.toPublicUrl(blockBlobClient.url, blobName);
    return {
      uploadUrl: `${blockBlobClient.url}?${sasToken}`,
      blobUrl: publicUrl,
      cdnUrl: this.publicRead ? `${this.cdnUrl}/${blobName}` : publicUrl,
    };
  }

  private validateFile(file: Express.Multer.File): void {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];

    if (file.size > maxSize) {
      throw new BadRequestException(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds limit of 5MB`);
    }

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed. Accepted: jpg, png, webp, gif, pdf`);
    }
  }

  private isImage(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }
}
