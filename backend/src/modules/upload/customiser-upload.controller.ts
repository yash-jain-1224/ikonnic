import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { UploadService } from "./upload.service";
import {
  CreateCustomiserUploadSessionDto,
  FinalizeCustomiserUploadSessionDto,
} from "./dto/customiser-upload.dto";

/**
 * Small, rate-limited guest control plane for direct-to-blob uploads.
 * Image bytes never pass through the serverless API request body.
 */
@ApiTags("upload")
@Controller("upload/customiser")
export class CustomiserUploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("session")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: "Create a scoped multi-photo customiser upload session",
  })
  createSession(@Body() body: CreateCustomiserUploadSessionDto) {
    return this.uploadService.createCustomiserUploadSession(
      body.productId,
      body.files,
    );
  }

  @Post("finalize")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: "Validate and finalize a customiser upload session",
  })
  finalizeSession(@Body() body: FinalizeCustomiserUploadSessionDto) {
    return this.uploadService.finalizeCustomiserUploadSession(body.sessionToken);
  }
}
