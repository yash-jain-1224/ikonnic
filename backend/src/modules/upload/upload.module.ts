import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";
import { CustomiserUploadController } from "./customiser-upload.controller";

@Module({
  imports: [
    MulterModule.register({
      storage: require("multer").memoryStorage(),
    }),
  ],
  controllers: [UploadController, CustomiserUploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
