import { describe, expect, it } from "vitest";
import { addDaysKey, localDayKey, parseLocalDateTime, toLocalInput } from "@/lib/time";

const NY = "America/New_York";

describe("time zone helpers", () => {
  it("parses wall-clock time in the program zone (standard and daylight time)", () => {
    expect(parseLocalDateTime("2026-01-15T18:30", NY)?.toISOString()).toBe("2026-01-15T23:30:00.000Z");
    expect(parseLocalDateTime("2026-07-15T18:30", NY)?.toISOString()).toBe("2026-07-15T22:30:00.000Z");
  });

  it("round-trips through datetime-local format", () => {
    for (const v of ["2026-03-08T03:30", "2026-11-01T01:15", "2026-12-31T23:59"]) {
      expect(toLocalInput(parseLocalDateTime(v, NY)!, NY)).toBe(v);
    }
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseLocalDateTime("2026-02-31T10:00", NY)).toBeNull();
    expect(parseLocalDateTime("tomorrow", NY)).toBeNull();
    expect(parseLocalDateTime("2026-13-01T10:00", NY)).toBeNull();
  });

  it("computes local day keys", () => {
    // 03:00 UTC on Jan 16 is still Jan 15 in New York
    expect(localDayKey(new Date("2026-01-16T03:00:00Z"), NY)).toBe("2026-01-15");
    expect(addDaysKey("2026-02-28", 1)).toBe("2026-03-01");
  });
});
