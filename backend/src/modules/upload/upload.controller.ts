import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Query,
  Body,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetSasUrlDto } from './dto/upload.dto';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload a single image (max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploadService.uploadFile(file, folder || 'products');
  }

  @Post('images')
  @ApiOperation({ summary: 'Upload multiple images (max 10 files, 5MB each)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) throw new BadRequestException('No files provided');
    return this.uploadService.uploadMultiple(files, folder || 'products');
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload user avatar (max 2MB, resized to 400px)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploadService.uploadFile(file, 'avatars', { maxWidth: 400, quality: 85 });
  }

  @Post('sas-url')
  @ApiOperation({ summary: 'Get a pre-signed SAS URL for direct browser upload (large files / customiser)' })
  async getSasUrl(@Body() body: GetSasUrlDto) {
    const blobName = `${body.folder}/${Date.now()}-${body.filename}`;
    return this.uploadService.getUploadSasUrl(blobName, body.contentType);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete an uploaded file by key' })
  async deleteFile(@Param('key') key: string) {
    await this.uploadService.deleteFile(decodeURIComponent(key));
    return { message: 'File deleted successfully' };
  }
}
