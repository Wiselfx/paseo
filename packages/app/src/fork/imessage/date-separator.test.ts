import { describe, expect, it } from "vitest";

import { dayKey, formatClockTime, formatDateLabel } from "./date-separator";

const reference = new Date(2026, 8, 10, 9, 5); // Sep 10 2026, 09:05 local

describe("formatClockTime", () => {
  it("formats a 12-hour clock with Apple's narrow no-break space", () => {
    expect(formatClockTime(new Date(2026, 8, 10, 13, 25))).toBe("1:25\u202FPM");
    expect(formatClockTime(new Date(2026, 8, 10, 0, 7))).toBe("12:07\u202FAM");
  });
});

describe("formatDateLabel", () => {
  it("says Today and Yesterday relative to the reference time", () => {
    expect(formatDateLabel(reference, reference).day).toBe("Today");
    expect(formatDateLabel(new Date(2026, 8, 9, 23, 0), reference).day).toBe("Yesterday");
  });

  it("uses the weekday inside a week", () => {
    // Sep 6 2026 is a Sunday.
    expect(formatDateLabel(new Date(2026, 8, 6, 12, 0), reference).day).toBe("Sunday");
  });

  it("falls back to the absolute date, joined with ' at '", () => {
    const label = formatDateLabel(new Date(2026, 0, 2, 8, 0), reference);
    expect(label.day).toBe("Jan 2, 2026");
    expect(label.joiner).toBe(" at ");
    expect(label.text).toBe("Jan 2, 2026 at 8:00\u202FAM");
  });
});

describe("dayKey", () => {
  it("groups by local calendar day, not by elapsed hours", () => {
    expect(dayKey(new Date(2026, 8, 10, 0, 1))).toBe(dayKey(new Date(2026, 8, 10, 23, 59)));
    expect(dayKey(new Date(2026, 8, 10, 23, 59))).not.toBe(dayKey(new Date(2026, 8, 11, 0, 1)));
  });
});
