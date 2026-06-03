import { describe, it, expect } from "vitest";
import {
  htmlToPlainText,
  substituteVariables,
  toGoogleCalendarEvent,
} from "./templateToCalendarEvent";
import type { Template } from "@/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<Template> = {}): Template {
  return {
    name: "Test",
    variables: [],
    content: "",
    ...overrides,
  };
}

// ─── htmlToPlainText ──────────────────────────────────────────────────────────

describe("htmlToPlainText", () => {
  it("returns empty string for empty input", () => {
    expect(htmlToPlainText("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(htmlToPlainText("Hello world")).toBe("Hello world");
  });

  it("converts <br> to newline", () => {
    expect(htmlToPlainText("line1<br>line2")).toBe("line1\nline2");
  });

  it("converts <br /> to newline", () => {
    expect(htmlToPlainText("a<br />b")).toBe("a\nb");
  });

  it("converts closing </div> to newline", () => {
    const result = htmlToPlainText("<div>para1</div><div>para2</div>");
    expect(result).toContain("para1");
    expect(result).toContain("para2");
  });

  it("converts </p> to newline", () => {
    const result = htmlToPlainText("<p>first</p><p>second</p>");
    expect(result).toContain("first");
    expect(result).toContain("second");
  });

  it("strips remaining HTML tags", () => {
    expect(htmlToPlainText("<strong>bold</strong> text")).toBe("bold text");
  });

  it("replaces &nbsp; with space", () => {
    expect(htmlToPlainText("hello&nbsp;world")).toBe("hello world");
  });

  it("replaces &amp; with &", () => {
    expect(htmlToPlainText("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("replaces &lt; and &gt;", () => {
    expect(htmlToPlainText("x &lt; y &gt; z")).toBe("x < y > z");
  });

  it("replaces &quot; with double quote", () => {
    expect(htmlToPlainText("say &quot;hello&quot;")).toBe('say "hello"');
  });

  it("replaces &#39; with single quote", () => {
    expect(htmlToPlainText("it&#39;s fine")).toBe("it's fine");
  });

  it("collapses 3+ consecutive newlines to at most 2", () => {
    const result = htmlToPlainText("a<br><br><br><br>b");
    expect(result).not.toMatch(/\n{3,}/);
    expect(result).toContain("a");
    expect(result).toContain("b");
  });

  it("trims leading and trailing whitespace", () => {
    expect(htmlToPlainText("  hello  ")).toBe("hello");
  });

  it("handles nested tags", () => {
    expect(htmlToPlainText("<div><strong>bold</strong> text</div>")).toContain("bold text");
  });
});

// ─── substituteVariables ──────────────────────────────────────────────────────

describe("substituteVariables", () => {
  it("returns the original string when values is empty", () => {
    expect(substituteVariables("Hello {name}", {})).toBe("Hello {name}");
  });

  it("replaces a single token", () => {
    expect(substituteVariables("Hello {name}", { name: "Alice" })).toBe("Hello Alice");
  });

  it("replaces multiple different tokens", () => {
    expect(
      substituteVariables("{greeting} {name}, see you at {time}.", {
        greeting: "Hi",
        name: "Bob",
        time: "3 PM",
      })
    ).toBe("Hi Bob, see you at 3 PM.");
  });

  it("replaces all occurrences of the same token", () => {
    expect(
      substituteVariables("{name} and {name}", { name: "Alice" })
    ).toBe("Alice and Alice");
  });

  it("leaves unmatched tokens in place", () => {
    const result = substituteVariables("{name} from {company}", { name: "Eve" });
    expect(result).toBe("Eve from {company}");
  });

  it("handles empty string replacement", () => {
    expect(substituteVariables("Dear {title}", { title: "" })).toBe("Dear ");
  });

  it("handles special regex characters in values without throwing", () => {
    expect(
      substituteVariables("Location: {place}", { place: "Room 101 (B)" })
    ).toBe("Location: Room 101 (B)");
  });

  it("does not modify text when no tokens are present", () => {
    expect(substituteVariables("Static text.", { name: "Alice" })).toBe("Static text.");
  });
});

// ─── toGoogleCalendarEvent ────────────────────────────────────────────────────

describe("toGoogleCalendarEvent", () => {
  // ── Basic field mapping ──

  it("maps eventTitle to summary with variable substitution", () => {
    const template = makeTemplate({
      eventTitle: "Meeting with {name}",
      variables: [{ name: "name", default: "" }],
    });
    const event = toGoogleCalendarEvent(template, { name: "Alice" });
    expect(event.summary).toBe("Meeting with Alice");
  });

  it("maps location with variable substitution", () => {
    const template = makeTemplate({
      location: "Room {room}",
      variables: [{ name: "room", default: "" }],
    });
    const event = toGoogleCalendarEvent(template, { room: "42" });
    expect(event.location).toBe("Room 42");
  });

  it("converts HTML content to plain text for description", () => {
    const template = makeTemplate({ content: "<p>Hello <strong>world</strong></p>" });
    const event = toGoogleCalendarEvent(template);
    expect(event.description).toBe("Hello world");
  });

  it("substitutes variables in description content", () => {
    const template = makeTemplate({
      content: "Hi {firstName}!",
      variables: [{ name: "firstName", default: "" }],
    });
    const event = toGoogleCalendarEvent(template, { firstName: "Bob" });
    expect(event.description).toBe("Hi Bob!");
  });

  it("falls back to variable default when value not supplied", () => {
    const template = makeTemplate({
      eventTitle: "Hi {name}",
      variables: [{ name: "name", default: "Friend" }],
    });
    const event = toGoogleCalendarEvent(template, {});
    expect(event.summary).toBe("Hi Friend");
  });

  // ── Fixed date/time ──

  it("builds dateTime when both date and startTime are present", () => {
    const template = makeTemplate({ date: "2026-07-15", startTime: "09:00", timezone: "America/New_York" });
    const event = toGoogleCalendarEvent(template);
    expect(event.start.dateTime).toBe("2026-07-15T09:00:00");
    expect(event.start.timeZone).toBe("America/New_York");
  });

  it("builds end dateTime from endTime", () => {
    const template = makeTemplate({ date: "2026-07-15", startTime: "09:00", endTime: "10:00", timezone: "UTC" });
    const event = toGoogleCalendarEvent(template);
    expect(event.end.dateTime).toBe("2026-07-15T10:00:00");
  });

  it("mirrors start to end when no endTime is given but startTime is", () => {
    const template = makeTemplate({ date: "2026-07-15", startTime: "14:00", timezone: "UTC" });
    const event = toGoogleCalendarEvent(template);
    expect(event.end.dateTime).toBe("2026-07-15T14:00:00");
  });

  it("builds date-only event when date is present but no startTime", () => {
    const template = makeTemplate({ date: "2026-07-15" });
    const event = toGoogleCalendarEvent(template);
    expect(event.start.date).toBe("2026-07-15");
    expect(event.start.dateTime).toBeUndefined();
    expect(event.end.date).toBe("2026-07-15");
    expect(event.end.dateTime).toBeUndefined();
  });

  it("produces empty start/end when no date is set", () => {
    const template = makeTemplate({ startTime: "09:00" }); // no date
    const event = toGoogleCalendarEvent(template);
    expect(event.start).toEqual({});
    expect(event.end).toEqual({});
  });

  it("defaults timezone to UTC when template has none", () => {
    const template = makeTemplate({ date: "2026-01-01", startTime: "08:00" });
    const event = toGoogleCalendarEvent(template);
    expect(event.start.timeZone).toBe("UTC");
  });

  // ── Variable date/time flags ──

  it("uses values.eventDate when dateIsVariable is true", () => {
    const template = makeTemplate({ dateIsVariable: true, startTime: "10:00", timezone: "UTC" });
    const event = toGoogleCalendarEvent(template, { eventDate: "2026-09-20" });
    expect(event.start.dateTime).toBe("2026-09-20T10:00:00");
  });

  it("uses values.startTime when startTimeIsVariable is true", () => {
    const template = makeTemplate({ date: "2026-09-20", startTimeIsVariable: true, timezone: "UTC" });
    const event = toGoogleCalendarEvent(template, { startTime: "11:30" });
    expect(event.start.dateTime).toBe("2026-09-20T11:30:00");
  });

  it("uses values.endTime when endTimeIsVariable is true", () => {
    const template = makeTemplate({
      date: "2026-09-20",
      startTime: "11:00",
      endTimeIsVariable: true,
      timezone: "UTC",
    });
    const event = toGoogleCalendarEvent(template, { endTime: "12:00" });
    expect(event.end.dateTime).toBe("2026-09-20T12:00:00");
  });

  it("all three date/time fields can be variable simultaneously", () => {
    const template = makeTemplate({
      dateIsVariable: true,
      startTimeIsVariable: true,
      endTimeIsVariable: true,
      timezone: "Europe/London",
    });
    const event = toGoogleCalendarEvent(template, {
      eventDate: "2026-10-01",
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(event.start.dateTime).toBe("2026-10-01T09:00:00");
    expect(event.start.timeZone).toBe("Europe/London");
    expect(event.end.dateTime).toBe("2026-10-01T10:00:00");
  });

  it("produces empty start/end when dateIsVariable is true but eventDate value is empty", () => {
    const template = makeTemplate({ dateIsVariable: true });
    const event = toGoogleCalendarEvent(template, { eventDate: "" });
    expect(event.start).toEqual({});
    expect(event.end).toEqual({});
  });

  // ── Google Meet ──

  it("does not include conferenceData when addMeet is false", () => {
    const event = toGoogleCalendarEvent(makeTemplate({ addMeet: false }));
    expect(event.conferenceData).toBeUndefined();
  });

  it("includes conferenceData with the given requestId when addMeet is true", () => {
    const template = makeTemplate({ addMeet: true });
    const event = toGoogleCalendarEvent(template, {}, "campaign-1-0");
    expect(event.conferenceData).toBeDefined();
    expect(event.conferenceData!.createRequest.requestId).toBe("campaign-1-0");
    expect(event.conferenceData!.createRequest.conferenceSolutionKey.type).toBe("hangoutsMeet");
  });

  it("uses empty string as requestId when none provided and addMeet is true", () => {
    const template = makeTemplate({ addMeet: true });
    const event = toGoogleCalendarEvent(template);
    expect(event.conferenceData!.createRequest.requestId).toBe("");
  });

  // ── Edge cases ──

  it("handles a fully empty template without throwing", () => {
    expect(() => toGoogleCalendarEvent(makeTemplate())).not.toThrow();
  });

  it("returns an object with summary, description, location, start, end", () => {
    const event = toGoogleCalendarEvent(makeTemplate());
    expect(event).toHaveProperty("summary");
    expect(event).toHaveProperty("description");
    expect(event).toHaveProperty("location");
    expect(event).toHaveProperty("start");
    expect(event).toHaveProperty("end");
  });

  it("caller-supplied value wins over variable default", () => {
    const template = makeTemplate({
      eventTitle: "{name}",
      variables: [{ name: "name", default: "Default" }],
    });
    const event = toGoogleCalendarEvent(template, { name: "Override" });
    expect(event.summary).toBe("Override");
  });

  // ── Null-safety branches ──

  it("treats undefined template.variables as empty array", () => {
    const template = makeTemplate({ variables: undefined as unknown as [] });
    expect(() => toGoogleCalendarEvent(template)).not.toThrow();
  });

  it("uses variable default when value key is absent from values object", () => {
    const template = makeTemplate({
      eventTitle: "{greeting}",
      variables: [{ name: "greeting", default: "Hello" }],
    });
    // No "greeting" key in values — should fall back to default
    const event = toGoogleCalendarEvent(template, {});
    expect(event.summary).toBe("Hello");
  });

  it("falls back to empty string when both value and default are absent at runtime", () => {
    const template = makeTemplate({
      eventTitle: "{x}",
      variables: [{ name: "x", default: undefined as unknown as string }],
    });
    // resolved["x"] = undefined ?? undefined ?? "" = "" → substitution replaces {x} with ""
    const event = toGoogleCalendarEvent(template, {});
    expect(event.summary).toBe("");
  });

  it("uses empty string for eventDate when key is absent in values (dateIsVariable path)", () => {
    // values has no eventDate key → effectiveDate becomes "" → no start/end built
    const template = makeTemplate({ dateIsVariable: true, startTime: "10:00" });
    const event = toGoogleCalendarEvent(template, {}); // no eventDate key
    expect(event.start).toEqual({});
    expect(event.end).toEqual({});
  });

  it("uses empty string for startTime when key is absent in values (startTimeIsVariable path)", () => {
    // effectiveStartTime → "" → falls through to all-day path
    const template = makeTemplate({ date: "2026-11-01", startTimeIsVariable: true });
    const event = toGoogleCalendarEvent(template, {}); // no startTime key
    expect(event.start.date).toBe("2026-11-01");
    expect(event.start.dateTime).toBeUndefined();
  });

  it("uses empty string for endTime when key is absent in values (endTimeIsVariable path)", () => {
    const template = makeTemplate({
      date: "2026-11-01",
      startTime: "09:00",
      endTimeIsVariable: true,
      timezone: "UTC",
    });
    // No endTime key → effectiveEndTime "" → mirrors startTime
    const event = toGoogleCalendarEvent(template, {});
    expect(event.end.dateTime).toBe("2026-11-01T09:00:00");
  });
});
