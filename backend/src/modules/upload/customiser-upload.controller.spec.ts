import { CustomiserUploadController } from "./customiser-upload.controller";
import type { UploadService } from "./upload.service";

describe("CustomiserUploadController", () => {
  const createCustomiserUploadSession = jest.fn();
  const finalizeCustomiserUploadSession = jest.fn();
  const controller = new CustomiserUploadController({
    createCustomiserUploadSession,
    finalizeCustomiserUploadSession,
  } as unknown as UploadService);

  beforeEach(() => {
    createCustomiserUploadSession.mockReset();
    finalizeCustomiserUploadSession.mockReset();
  });

  it("passes only normalized session input to the upload service", async () => {
    const files = [
      {
        name: "memory.jpg",
        contentType: "image/jpeg" as const,
        size: 1024,
        role: "original" as const,
      },
      {
        name: "preview.webp",
        contentType: "image/webp" as const,
        size: 512,
        role: "preview" as const,
      },
    ];
    createCustomiserUploadSession.mockResolvedValue({ sessionToken: "signed" });

    await expect(
      controller.createSession({ productId: "product-1", files }),
    ).resolves.toEqual({ sessionToken: "signed" });
    expect(createCustomiserUploadSession).toHaveBeenCalledWith(
      "product-1",
      files,
    );
  });

  it("finalizes only the signed session token", async () => {
    finalizeCustomiserUploadSession.mockResolvedValue([{ key: "photo.jpg" }]);

    await expect(
      controller.finalizeSession({ sessionToken: "signed-session" }),
    ).resolves.toEqual([{ key: "photo.jpg" }]);
    expect(finalizeCustomiserUploadSession).toHaveBeenCalledWith(
      "signed-session",
    );
  });
});
