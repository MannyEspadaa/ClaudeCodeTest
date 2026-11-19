import { describe, expect, it } from "vitest";
import { buildCalendar } from "@/lib/ics";

describe("ics", () => {
  const cal = buildCalendar(
    "Hub",
    [
      {
        uid: "event-1@hub",
        start: new Date("2026-11-20T23:00:00Z"),
        end: new Date("2026-11-21T01:00:00Z"),
        summary: "Match vs State, Week 3; finals",
        location: "Union 101",
        description: "Line one\nline two " + "x".repeat(100),
      },
    ],
    new Date("2026-11-19T00:00:00Z"),
  );

  it("produces a valid calendar with CRLF line endings and UTC times", () => {
    expect(cal.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(cal.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(cal).toContain("DTSTART:20261120T230000Z");
    expect(cal).toContain("DTSTAMP:20261119T000000Z");
  });

  it("escapes text and folds long lines to 75 octets", () => {
    expect(cal).toContain("SUMMARY:Match vs State\\, Week 3\; finals");
    expect(cal).toContain("Line one\\nline two");
    for (const line of cal.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
