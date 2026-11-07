/**
 * Peak-rate judge, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/peakrate/schedule.ts` and
 * `match.ts`, plus `packages/contracts/src/peakrate.ts`.
 *
 * The billing clock is judged locally against the real wall clock in the
 * schedule's own IANA time zone (`Intl.DateTimeFormat`). Wall-clock minutes
 * are converted to real instants so a daylight-saving boundary and a window
 * crossing midnight come out right; day arithmetic runs on the zone's own
 * calendar. Precedence, highest first: a dated promotional window, a public
 * holiday (off-peak in full), then the weekday filter and the peak windows.
 * A window crossing midnight belongs to the day it starts, so the small
 * hours are judged against the previous day's weekday and holiday.
 */

export type RatePeriod = "peak" | "offPeak" | "campaign";

export interface RateWindow {
  start: string;
  end: string;
}

export interface RateOverride {
  period: "campaign";
  periodName: string;
  badge?: string;
  name?: string;
  detail?: string;
  startDate?: string;
  endDate?: string;
  startAt?: string;
  endAt?: string;
  days: number[];
  windows: RateWindow[];
}

export interface RateSchedule {
  timeZone: string;
  peakDays: number[];
  peakWindows: RateWindow[];
  offDayName?: string;
  publicHolidayDates?: string[];
  publicHolidayName?: string;
  publicHolidayTimeZone?: string;
  overrides?: RateOverride[];
}

export interface RateProfile {
  id: string;
  provider: string;
  model: string;
  schedule: RateSchedule;
  peakBadge: string;
  offPeakBadge: string;
  campaignBadge?: string;
  campaignName?: string;
  source?: string;
}

export interface RateState {
  period: RatePeriod;
  badge: string;
  minutesUntilSwitch: number;
  nextPeriod?: RatePeriod;
  nextBadge?: string;
  overrideName?: string;
  nextOverrideName?: string;
}

/** Host provider id → the data source's provider name. */
export const PROVIDER_ALIASES: Record<string, string> = {
  "deepseek-official": "DeepSeek",
  "deepseek-account": "DeepSeek",
  ocg: "DeepSeek",
  "ocg-1": "DeepSeek",
  "opencode-go": "DeepSeek",
  ollama: "Ollama",
  zai: "Z.ai",
  qoder: "Qoder",
  "qoder-cn": "Qoder CN",
  bai: "B.AI",
  "baidu-qianfan": "Baidu Qianfan",
  "tencent-cloud": "Tencent Cloud",
  "alibaba-cloud": "Alibaba Cloud",
  siliconflow: "SiliconFlow",
  "xiaomi-token-plan-cn": "Xiaomi MiMo",
  swarms: "Swarms",
} as const;

/** One profile's model pattern, keyed by the catalog's provider name. */
export const MODEL_MAPPINGS: readonly { provider: string; match: string; profile: string }[] = [
  { provider: "DeepSeek", match: "deepseek-v4-pro", profile: "deepseek-v4" },
  { provider: "DeepSeek", match: "deepseek-v4-flash", profile: "deepseek-v4" },
  { provider: "DeepSeek", match: "deepseek-v4", profile: "deepseek-v4" },
  { provider: "Z.ai", match: "glm-5.3", profile: "glm-5.3" },
  { provider: "Z.ai", match: "glm-5.3-flash", profile: "glm-5.3-flash" },
] as const;

/** Normalises a model id for prefix matching. */
export function normalizePeakModelId(modelId: string): string {
  return modelId.toLowerCase().trim();
}

/**
 * Which billing profile applies to one provider and model. A model that
 * matches nothing carries no rate at all — decorating it with a clock it
 * does not bill by is worse than showing nothing.
 */
export function matchProfile(provider: string, modelId: string, profiles: readonly RateProfile[]): RateProfile | undefined {
  const vendor = PROVIDER_ALIASES[provider] ?? provider;
  const folded = normalizePeakModelId(modelId);
  for (const mapping of MODEL_MAPPINGS) {
    if (mapping.provider !== vendor) continue;
    if (!folded.startsWith(mapping.match)) continue;
    const profile = profiles.find((entry) => entry.provider === vendor && entry.id === mapping.profile);
    if (profile !== undefined) return profile;
  }
  return profiles.find((entry) => entry.provider === vendor && folded.includes(normalizePeakModelId(entry.model)));
}

/** `"HH:mm"` in minutes, or NaN. */
export function parseMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (match === null) return Number.NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return Number.NaN;
  return hour * 60 + minute;
}

/** `"YYYY-MM-DD"` shifted by whole days, on the UTC calendar. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const at = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  at.setUTCDate(at.getUTCDate() + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
}

const clockFormatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string, withWeekday: boolean): Intl.DateTimeFormat {
  const key = `${timeZone}|${withWeekday ? "day" : "time"}`;
  let cached = clockFormatters.get(key);
  if (cached === undefined) {
    cached = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour12: false,
      ...(withWeekday
        ? { weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" }
        : { year: "numeric", month: "2-digit", day: "2-digit" }),
      hour: "2-digit",
      minute: "2-digit",
      ...(withWeekday ? {} : { second: "2-digit" }),
    });
    clockFormatters.set(key, cached);
  }
  return cached;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface Moment {
  weekday: number;
  minutes: number;
  date: string;
  instant: number;
}

function partMap(timeZone: string, at: Date, withWeekday: boolean): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const part of formatter(timeZone, withWeekday).formatToParts(at)) out[part.type] = part.value;
  return out;
}

function momentAt(schedule: RateSchedule, at: Date): Moment {
  const parts = partMap(schedule.timeZone, at, true);
  const weekdayName = parts.weekday ?? "Sun";
  const weekday = WEEKDAYS.indexOf(weekdayName as (typeof WEEKDAYS)[number]);
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute ?? 0);
  return {
    weekday: weekday < 0 ? 0 : weekday,
    minutes: hour * 60 + minute,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    instant: at.getTime(),
  };
}

function withinWindows(windows: readonly RateWindow[], moment: Moment): boolean {
  for (const window of windows) {
    const start = parseMinutes(window.start);
    const end = parseMinutes(window.end);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    if (start === end) return true;
    if (start < end) {
      if (moment.minutes >= start && moment.minutes < end) return true;
    } else {
      if (moment.minutes >= start || moment.minutes < end) return true;
    }
  }
  return false;
}

function isHoliday(schedule: RateSchedule, date: string): boolean {
  if (schedule.publicHolidayDates === undefined) return false;
  return schedule.publicHolidayDates.includes(date);
}

/**
 * Which rate is in force at `at`, judging through the schedule's own zone.
 * Precedence: dated promotion, public holiday, weekday filter, peak windows.
 */
export function currentRate(profile: RateProfile, at: Date): RateState {
  const schedule = profile.schedule;
  const moment = momentAt(schedule, at);
  const holiday = isHoliday(schedule, moment.date);
  const isPeakDay = schedule.peakDays.includes(moment.weekday);

  for (const override of schedule.overrides ?? []) {
    if (override.days.length > 0 && !override.days.includes(moment.weekday)) continue;
    if (override.startDate !== undefined && moment.date < override.startDate) continue;
    if (override.endDate !== undefined && moment.date > override.endDate) continue;
    if (override.startAt !== undefined && at.getTime() < Date.parse(override.startAt)) continue;
    if (override.endAt !== undefined && at.getTime() >= Date.parse(override.endAt)) continue;
    if (override.windows.length > 0 && !withinWindows(override.windows, moment)) continue;
    return {
      period: "campaign",
      badge: override.badge ?? override.periodName,
      minutesUntilSwitch: Number.POSITIVE_INFINITY,
      overrideName: override.name,
    };
  }

  const inPeak = isPeakDay && !holiday && withinWindows(schedule.peakWindows, moment);
  return {
    period: inPeak ? "peak" : "offPeak",
    badge: inPeak ? profile.peakBadge : profile.offPeakBadge,
    minutesUntilSwitch: Number.POSITIVE_INFINITY,
  };
}
