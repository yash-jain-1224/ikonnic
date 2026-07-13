import {
  Injectable,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import sharp from "sharp";
import * as crypto from "crypto";
import * as path from "path";

export type UploadResult = {
  key: string;
  url: string;
  cdnUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export type CustomiserUploadRole = "original" | "preview";

export type CustomiserUploadDescriptor = {
  name: string;
  contentType: string;
  size: number;
  role: CustomiserUploadRole;
};

type CustomiserUploadSessionFile = CustomiserUploadDescriptor & {
  pendingKey: string;
  finalKey: string;
};

type CustomiserUploadSessionPayload = {
  version: 1;
  productId: string;
  sessionId: string;
  expiresAt: number;
  files: CustomiserUploadSessionFile[];
};

export type CustomiserUploadSession = {
  sessionToken: string;
  expiresAt: number;
  uploads: Array<{
    key: string;
    uploadUrl: string;
    contentType: string;
    role: CustomiserUploadRole;
  }>;
};

const CUSTOMISER_SESSION_TTL_MINUTES = 10;
const MAX_CUSTOMISER_FILE_SIZE = 15 * 1024 * 1024;
const MAX_CUSTOMISER_SESSION_FILES = 5;
const MAX_CUSTOMISER_SESSION_BYTES = 64 * 1024 * 1024;
const CUSTOMISER_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function isValidCustomiserSessionFileSet(
  files: unknown,
): files is Array<{ role: CustomiserUploadRole }> {
  if (
    !Array.isArray(files) ||
    files.length < 2 ||
    files.length > MAX_CUSTOMISER_SESSION_FILES
  ) {
    return false;
  }

  let originals = 0;
  let previews = 0;
  for (const file of files) {
    if (!file || typeof file !== "object" || !("role" in file)) return false;
    if (file.role === "original") originals += 1;
    else if (file.role === "preview") previews += 1;
    else return false;
  }
  return (
    originals >= 1 && previews === 1 && originals + previews === files.length
  );
}

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
  private customiserSigningSecret: string;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>(
      "AZURE_STORAGE_CONNECTION_STRING",
      "",
    );
    this.containerName = this.configService.get(
      "AZURE_STORAGE_CONTAINER",
      "customisation-uploads",
    );
    this.accountName = this.configService.get("AZURE_STORAGE_ACCOUNT_NAME", "");
    this.accountKey = this.configService.get("AZURE_STORAGE_ACCOUNT_KEY", "");
    this.publicRead =
      this.configService.get("AZURE_BLOB_PUBLIC_READ", "false") === "true";
    this.readSasTtlDays =
      parseInt(
        this.configService.get("AZURE_BLOB_READ_SAS_TTL_DAYS", "3650"),
        10,
      ) || 3650;

    // When only a connection string is provided, derive the account name/key
    // from it so SAS generation (read + write) works without duplicate env vars.
    if (connectionString) {
      const parsed = this.parseConnectionString(connectionString);
      if (!this.accountName && parsed.accountName)
        this.accountName = parsed.accountName;
      if (!this.accountKey && parsed.accountKey)
        this.accountKey = parsed.accountKey;
    }

    this.customiserSigningSecret =
      this.configService.get("CUSTOMISER_UPLOAD_SECRET", "") ||
      this.configService.get("JWT_SECRET", "") ||
      this.accountKey;

    this.cdnUrl = this.configService.get(
      "CDN_URL",
      `https://${this.accountName}.blob.core.windows.net/${this.containerName}`,
    );

    if (connectionString) {
      this.blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
    } else {
      // Fallback: construct from account name/key
      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountName,
        this.accountKey,
      );
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.accountName}.blob.core.windows.net`,
        sharedKeyCredential,
      );
    }

    // Ensure container exists (runs once on startup)
    this.ensureContainer();
  }

  private parseConnectionString(cs: string): {
    accountName?: string;
    accountKey?: string;
  } {
    const out: { accountName?: string; accountKey?: string } = {};
    for (const part of cs.split(";")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key === "AccountName") out.accountName = value;
      if (key === "AccountKey") out.accountKey = value;
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
    if (this.publicRead || !this.accountName || !this.accountKey)
      return blobUrl;
    try {
      const startsOn = new Date(Date.now() - 5 * 60 * 1000); // small backdate for clock skew
      const expiresOn = new Date(
        Date.now() + this.readSasTtlDays * 24 * 60 * 60 * 1000,
      );
      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: this.containerName,
          blobName,
          permissions: BlobSASPermissions.parse("r"),
          startsOn,
          expiresOn,
        },
        new StorageSharedKeyCredential(this.accountName, this.accountKey),
      ).toString();
      return `${blobUrl}?${sasToken}`;
    } catch (error) {
      this.logger.warn(
        `Could not stamp read SAS for ${blobName}: ${(error as Error).message}`,
      );
      return blobUrl;
    }
  }

  private async ensureContainer(): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(
        this.containerName,
      );
      // Keep customer originals private. Renderable URLs are issued with a
      // read-only SAS when anonymous blob access is disabled.
      await containerClient.createIfNotExists();
      this.logger.log(`Azure Blob container "${this.containerName}" ready`);
    } catch (error) {
      this.logger.warn(
        `Could not ensure container: ${(error as Error).message}`,
      );
    }
  }

  private getContainerClient(): ContainerClient {
    return this.blobServiceClient.getContainerClient(this.containerName);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = "misc",
    options?: { maxWidth?: number; quality?: number },
  ): Promise<UploadResult> {
    this.validateFile(file);

    // Generate unique filename
    const hash = crypto.randomBytes(8).toString("hex");
    const ext = this.isImage(file.mimetype)
      ? ".webp"
      : path.extname(file.originalname).toLowerCase() || ".bin";
    const blobName = `${folder}/${hash}${ext}`;

    // Process image with sharp (resize + convert to WebP)
    let buffer = file.buffer;
    let contentType = file.mimetype;
    if (this.isImage(file.mimetype)) {
      buffer = await sharp(file.buffer)
        .resize({ width: options?.maxWidth || 1200, withoutEnlargement: true })
        .webp({ quality: options?.quality || 82 })
        .toBuffer();
      contentType = "image/webp";
    }

    // Upload to Azure Blob Storage
    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: "public, max-age=31536000, immutable",
      },
    });

    const url = this.toPublicUrl(blockBlobClient.url, blobName);
    const cdnUrl = this.publicRead ? `${this.cdnUrl}/${blobName}` : url;

    this.logger.log(
      `Uploaded: ${blobName} (${(buffer.length / 1024).toFixed(1)}KB)`,
    );

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
    folder: string = "misc",
  ): Promise<UploadResult[]> {
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }

  async createCustomiserUploadSession(
    productId: string,
    files: CustomiserUploadDescriptor[],
  ): Promise<CustomiserUploadSession> {
    if (!this.customiserSigningSecret) {
      throw new ServiceUnavailableException(
        "Customiser uploads are not configured",
      );
    }
    if (
      typeof productId !== "string" ||
      !productId.trim() ||
      productId.length > 160 ||
      files.length < 2 ||
      files.length > MAX_CUSTOMISER_SESSION_FILES
    ) {
      throw new BadRequestException(
        `A product, at least one photo, and one preview are required (maximum ${MAX_CUSTOMISER_SESSION_FILES - 1} photos)`,
      );
    }
    if (!isValidCustomiserSessionFileSet(files)) {
      throw new BadRequestException(
        "The customiser upload must contain one or more originals and exactly one preview",
      );
    }

    const sessionId = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + CUSTOMISER_SESSION_TTL_MINUTES * 60 * 1000;
    const sessionFiles: CustomiserUploadSessionFile[] = files.map(
      (file, index) => {
        const extension = CUSTOMISER_IMAGE_EXTENSIONS[file.contentType];
        if (
          !extension ||
          !Number.isSafeInteger(file.size) ||
          file.size <= 0 ||
          file.size > MAX_CUSTOMISER_FILE_SIZE
        ) {
          throw new BadRequestException(
            "Each upload must be a supported image no larger than 15MB",
          );
        }
        const safeName = path
          .basename(file.name || `photo-${index + 1}${extension}`)
          .slice(0, 120);
        const baseName =
          file.role === "preview" ? "preview" : `photo-${index + 1}`;
        return {
          ...file,
          name: safeName,
          pendingKey: `pending-customisations/${sessionId}/${baseName}${extension}`,
          finalKey: `customisations/${sessionId}/${baseName}${extension}`,
        };
      },
    );
    if (
      sessionFiles.reduce((total, file) => total + file.size, 0) >
      MAX_CUSTOMISER_SESSION_BYTES
    ) {
      throw new BadRequestException(
        "A customiser session cannot exceed 64MB in total",
      );
    }
    const payload: CustomiserUploadSessionPayload = {
      version: 1,
      productId: productId.trim(),
      sessionId,
      expiresAt,
      files: sessionFiles,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );
    const signature = this.signCustomiserPayload(encodedPayload);
    const uploads = await Promise.all(
      sessionFiles.map(async (file) => {
        const { uploadUrl } = await this.getUploadSasUrl(
          file.pendingKey,
          file.contentType,
          CUSTOMISER_SESSION_TTL_MINUTES,
        );
        return {
          key: file.pendingKey,
          uploadUrl,
          contentType: file.contentType,
          role: file.role,
        };
      }),
    );

    return {
      sessionToken: `${encodedPayload}.${signature}`,
      expiresAt,
      uploads,
    };
  }

  async finalizeCustomiserUploadSession(
    sessionToken: string,
  ): Promise<UploadResult[]> {
    const payload = this.verifyCustomiserSessionToken(sessionToken);
    const containerClient = this.getContainerClient();
    const transfers = payload.files.map((file) => ({
      file,
      sourceClient: containerClient.getBlockBlobClient(file.pendingKey),
      destinationClient: containerClient.getBlockBlobClient(file.finalKey),
    }));
    const buildResults = () =>
      transfers.map(({ file, destinationClient }) => {
        const url = this.toPublicUrl(destinationClient.url, file.finalKey);
        return {
          key: file.finalKey,
          url,
          cdnUrl: this.publicRead ? `${this.cdnUrl}/${file.finalKey}` : url,
          originalName: file.name,
          mimeType: file.contentType,
          size: file.size,
        };
      });
    const completionClient = containerClient.getBlockBlobClient(
      `customisations/${payload.sessionId}/.complete`,
    );

    try {
      if (await completionClient.exists()) {
        await Promise.allSettled(
          transfers.map(({ sourceClient }) => sourceClient.deleteIfExists()),
        );
        return buildResults();
      }

      const validatedSources = await Promise.all(
        transfers.map(async ({ file, sourceClient }) => {
          const properties = await sourceClient.getProperties();
          if (
            properties.contentLength !== file.size ||
            properties.contentLength > MAX_CUSTOMISER_FILE_SIZE
          ) {
            throw new BadRequestException(
              "An uploaded image did not match its declared size",
            );
          }
          if (properties.contentType !== file.contentType) {
            throw new BadRequestException(
              "An uploaded image did not match its declared type",
            );
          }
          const header = await this.downloadBlobHeader(sourceClient, 16);
          if (!this.isSupportedImageHeader(header, file.contentType)) {
            throw new BadRequestException(
              "An uploaded file is not a valid supported image",
            );
          }
          if (!properties.etag) {
            throw new BadRequestException(
              "An uploaded image could not be version-locked",
            );
          }
          return { etag: properties.etag };
        }),
      );

      const copyResults = await Promise.allSettled(
        transfers.map(async ({ file, destinationClient }, index) => {
          const sourceReadUrl = await this.getPresignedUrl(file.pendingKey, 10);
          await destinationClient.syncCopyFromURL(sourceReadUrl, {
            sourceConditions: { ifMatch: validatedSources[index].etag },
          });
          await destinationClient.setHTTPHeaders({
            blobContentType: file.contentType,
            blobCacheControl: "public, max-age=31536000, immutable",
          });
          const copiedProperties = await destinationClient.getProperties();
          if (
            copiedProperties.contentLength !== file.size ||
            copiedProperties.contentType !== file.contentType
          ) {
            throw new BadRequestException(
              "A finalized image did not match its validated source",
            );
          }
        }),
      );
      const failedCopy = copyResults.find(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failedCopy) throw failedCopy.reason;

      await completionClient.uploadData(
        Buffer.from(JSON.stringify({ version: 1, completedAt: Date.now() })),
        {
          blobHTTPHeaders: {
            blobContentType: "application/json",
            blobCacheControl: "no-store",
          },
        },
      );
      await Promise.allSettled(
        transfers.map(({ sourceClient }) => sourceClient.deleteIfExists()),
      );

      return buildResults();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(
        `Could not finalize customiser session ${payload.sessionId}: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        "One or more customiser images could not be finalized",
      );
    }
  }

  private signCustomiserPayload(encodedPayload: string): string {
    return crypto
      .createHmac("sha256", this.customiserSigningSecret)
      .update(encodedPayload)
      .digest("base64url");
  }

  private verifyCustomiserSessionToken(
    sessionToken: string,
  ): CustomiserUploadSessionPayload {
    if (!this.customiserSigningSecret) {
      throw new ServiceUnavailableException(
        "Customiser uploads are not configured",
      );
    }
    const [encodedPayload, signature, ...rest] = String(
      sessionToken || "",
    ).split(".");
    if (!encodedPayload || !signature || rest.length) {
      throw new UnauthorizedException("Invalid customiser upload session");
    }
    const expected = Buffer.from(this.signCustomiserPayload(encodedPayload));
    const received = Buffer.from(signature);
    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException("Invalid customiser upload session");
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      ) as CustomiserUploadSessionPayload;
      if (
        payload.version !== 1 ||
        payload.expiresAt < Date.now() ||
        !payload.sessionId ||
        !isValidCustomiserSessionFileSet(payload.files)
      ) {
        throw new Error("Expired or malformed upload session");
      }
      if (
        payload.files.some(
          (file) =>
            !file.pendingKey.startsWith(
              `pending-customisations/${payload.sessionId}/`,
            ) ||
            !file.finalKey.startsWith(`customisations/${payload.sessionId}/`),
        )
      ) {
        throw new Error("Upload paths do not match the signed session");
      }
      return payload;
    } catch {
      throw new UnauthorizedException(
        "Expired or invalid customiser upload session",
      );
    }
  }

  private async downloadBlobHeader(
    blobClient: ReturnType<ContainerClient["getBlockBlobClient"]>,
    length: number,
  ) {
    const response = await blobClient.download(0, length);
    if (!response.readableStreamBody)
      throw new BadRequestException("Could not inspect uploaded image");
    const chunks: Buffer[] = [];
    for await (const chunk of response.readableStreamBody as NodeJS.ReadableStream &
      AsyncIterable<Buffer | Uint8Array | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).subarray(0, length);
  }

  private isSupportedImageHeader(header: Buffer, contentType: string): boolean {
    if (contentType === "image/jpeg")
      return (
        header.length >= 3 &&
        header[0] === 0xff &&
        header[1] === 0xd8 &&
        header[2] === 0xff
      );
    if (contentType === "image/png")
      return header
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (contentType === "image/webp")
      return (
        header.subarray(0, 4).toString("ascii") === "RIFF" &&
        header.subarray(8, 12).toString("ascii") === "WEBP"
      );
    return false;
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
    const expiresOn = new Date(
      startsOn.getTime() + expiresInMinutes * 60 * 1000,
    );

    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey,
    );
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: key,
        permissions: BlobSASPermissions.parse("r"), // read-only
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
  async getUploadSasUrl(
    blobName: string,
    contentType: string,
    expiresInMinutes = 30,
  ): Promise<{ uploadUrl: string; blobUrl: string; cdnUrl: string }> {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey,
    );

    const startsOn = new Date();
    const expiresOn = new Date(
      startsOn.getTime() + expiresInMinutes * 60 * 1000,
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName,
        permissions: BlobSASPermissions.parse("cw"), // create + write
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
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds limit of 5MB`,
      );
    }

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Accepted: jpg, png, webp, gif, pdf`,
      );
    }
  }

  private isImage(mimetype: string): boolean {
    return mimetype.startsWith("image/");
  }
}
