/**
 * Fork (imessage): the centred timestamp that separates conversation history.
 *
 * Measured from `date-separator.tsx` in the reference kit:
 *
 * - iOS: two lines when it opens the conversation — the service name ("iMessage") then
 *   "Today 1:25 AM" — 11pt on a 14pt pitch in #8a8a8e, with the service line and the day at
 *   weight 500 and the time at 400. The first bubble sits 7.6 below the second line box.
 * - A header inserted mid-list after an hour-long gap is one line and gets its own spacing:
 *   13.33 above, 6.67 below (measured on `dateheader-mid-light.png`).
 * - Apple's relative style: Today / Yesterday / weekday within a week / "Sep 8, 2026 at
 *   1:25 AM", and a narrow no-break space before AM/PM.
 */
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { MESSAGES_PALETTE } from "./palette";

export const dateSeparatorMetrics = {
  // Reference date-separator.tsx L39-40 iOS row: font 11/14, weight 400, dayWeight 500,
  // gapAbove 0, gapBelow 7.6, midGapAbove 13.33, midGapBelow 6.67.
  fontSize: 11,
  lineHeight: 14,
  weight: "400",
  dayWeight: "500",
  gapAbove: 0,
  gapBelow: 7.6,
  midGapAbove: 13.33,
  midGapBelow: 6.67,
} as const;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** U+202F NARROW NO-BREAK SPACE, which is what Apple renders before AM/PM. */
const NNBSP = "\u202F";

export type DateSeparatorVariant = "first" | "mid";

export interface DateLabel {
  day: string;
  time: string;
  joiner: " " | " at ";
  text: string;
  iso: string;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatClockTime(value: Date | number): string {
  const date = new Date(value);
  const hours = date.getHours();
  const hour12 = hours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hour12}:${minutes}${NNBSP}${hours < 12 ? "AM" : "PM"}`;
}

/** Apple's relative date style: Today / Yesterday / weekday / "Sep 8, 2026 at 1:25 AM". */
export function formatDateLabel(value: Date | number, now: Date | number = Date.now()): DateLabel {
  const date = new Date(value);
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(date)) / 86_400_000);
  const time = formatClockTime(date);
  let day: string;
  let joiner: DateLabel["joiner"] = " ";
  if (days === 0) day = "Today";
  else if (days === 1) day = "Yesterday";
  else if (days > 1 && days < 7) day = WEEKDAYS[date.getDay()] ?? "Today";
  else {
    day = `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    joiner = " at ";
  }
  return { day, time, joiner, text: `${day}${joiner}${time}`, iso: date.toISOString() };
}

/** Days since the epoch for the message's local day; the identity a header is keyed on. */
export function dayKey(value: Date | number): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

interface TextProps {
  color: string;
}

function DateSeparatorText({
  color,
  date,
  now,
  service,
  variant = "first",
}: TextProps & DateSeparatorProps) {
  const mid = variant === "mid";
  const label = formatDateLabel(date ?? Date.now(), now);
  const rootStyle = mid ? styles.mid : styles.first;
  const textStyle = [styles.text, { color }];
  const strongStyle = [styles.text, styles.strong, { color }];
  return (
    <View style={rootStyle} accessibilityRole="header">
      {!mid && service ? <Text style={strongStyle}>{service}</Text> : null}
      <Text style={textStyle}>
        <Text style={strongStyle}>{label.day}</Text>
        {label.joiner}
        {label.time}
      </Text>
    </View>
  );
}

const ThemedDateSeparator = withUnistyles(DateSeparatorText);

const separatorTheme = (theme: Theme) => ({
  color: MESSAGES_PALETTE[theme.colorScheme].secondaryLabel,
});

export interface DateSeparatorProps {
  /** The moment the header describes; defaults to now. */
  date?: Date | number;
  /** Reference time for "Today"/"Yesterday"; defaults to the current time. */
  now?: Date | number;
  /** iOS shows the conversation's service above the date when it opens one. */
  service?: string;
  /** "first" opens the conversation; "mid" is inserted after a gap and gets its own spacing. */
  variant?: DateSeparatorVariant;
}

export const DateSeparator = memo(function DateSeparator(props: DateSeparatorProps) {
  return <ThemedDateSeparator {...props} uniProps={separatorTheme} />;
});

const styles = StyleSheet.create({
  first: {
    alignItems: "center",
    paddingTop: dateSeparatorMetrics.gapAbove,
    paddingBottom: dateSeparatorMetrics.gapBelow,
  },
  mid: {
    alignItems: "center",
    paddingTop: dateSeparatorMetrics.midGapAbove,
    paddingBottom: dateSeparatorMetrics.midGapBelow,
  },
  text: {
    fontSize: dateSeparatorMetrics.fontSize,
    lineHeight: dateSeparatorMetrics.lineHeight,
    fontWeight: dateSeparatorMetrics.weight,
    letterSpacing: 0,
    textAlign: "center",
  },
  strong: {
    fontWeight: dateSeparatorMetrics.dayWeight,
  },
});
