import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export class CustomiserUploadFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsIn(["image/jpeg", "image/png", "image/webp"])
  contentType!: "image/jpeg" | "image/png" | "image/webp";

  @IsInt()
  @Min(1)
  @Max(MAX_IMAGE_BYTES)
  size!: number;

  @IsIn(["original", "preview"])
  role!: "original" | "preview";
}

export class CreateCustomiserUploadSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  productId!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CustomiserUploadFileDto)
  files!: CustomiserUploadFileDto[];
}

export class FinalizeCustomiserUploadSessionDto {
  @IsString()
  @MinLength(32)
  @MaxLength(12_000)
  sessionToken!: string;
}
