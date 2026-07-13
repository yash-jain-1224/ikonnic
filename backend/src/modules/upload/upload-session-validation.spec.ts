import { isValidCustomiserSessionFileSet } from "./upload.service";

const original = { role: "original" as const };
const preview = { role: "preview" as const };

describe("customiser upload session validation", () => {
  it.each([1, 2, 3, 4])(
    "accepts %i original photo(s) and one preview",
    (originalCount) => {
      expect(
        isValidCustomiserSessionFileSet([
          ...Array.from({ length: originalCount }, () => original),
          preview,
        ]),
      ).toBe(true);
    },
  );

  it.each([
    undefined,
    [],
    [preview],
    [original],
    [original, preview, preview],
    [original, { role: "other" }],
    [...Array.from({ length: 5 }, () => original), preview],
  ])("rejects malformed or out-of-range file sets", (files) => {
    expect(isValidCustomiserSessionFileSet(files)).toBe(false);
  });
});
