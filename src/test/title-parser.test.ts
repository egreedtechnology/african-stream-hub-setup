import { describe, it, expect } from "vitest";
import { parseTitle } from "@/lib/title-parser";

describe("parseTitle", () => {
  it("extracts title, interpreter, part, year and quality", () => {
    const r = parseTitle("Extraction.2.2023.HD.Rocky.Kirabiranya.Part.1.of.4.720p.mp4");
    expect(r.title).toBe("Extraction 2");
    expect(r.interpreter).toBe("Rocky Kirabiranya");
    expect(r.partNumber).toBe(1);
    expect(r.totalParts).toBe(4);
    expect(r.releaseYear).toBe(2023);
    expect(r.quality).toBe("720p");
  });
  it("groups parts of the same film together", () => {
    expect(parseTitle("Avatar Junior Part 1.mp4").seriesSlug).toBe(parseTitle("Avatar.Junior.Part.2.mp4").seriesSlug);
  });
  it("leaves interpreter empty when none found", () => {
    expect(parseTitle("Avatar.Part1.mp4").interpreter).toBeUndefined();
  });
});
