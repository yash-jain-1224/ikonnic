import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateCustomiserUploadSessionDto,
  FinalizeCustomiserUploadSessionDto,
} from "./customiser-upload.dto";

describe("customiser upload DTOs", () => {
  it("accepts a bounded image session", async () => {
    const dto = plainToInstance(CreateCustomiserUploadSessionDto, {
      productId: "product-1",
      files: [
        {
          name: "photo.jpg",
          contentType: "image/jpeg",
          size: 1024,
          role: "original",
        },
        {
          name: "preview.webp",
          contentType: "image/webp",
          size: 512,
          role: "preview",
        },
      ],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    {},
    { productId: "product-1", files: null },
    {
      productId: "product-1",
      files: [
        { name: "photo.gif", contentType: "image/gif", size: 10, role: "original" },
        { name: "preview.webp", contentType: "image/webp", size: 10, role: "preview" },
      ],
    },
  ])("rejects malformed session bodies", async (body) => {
    const dto = plainToInstance(CreateCustomiserUploadSessionDto, body);
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it("requires a plausibly sized signed finalization token", async () => {
    const dto = plainToInstance(FinalizeCustomiserUploadSessionDto, {
      sessionToken: "short",
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
