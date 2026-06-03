import { describe, it, expect } from "vitest";
import { buildRecipientValues } from "./campaignUtils";
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

type Mappings = Record<number, Record<string, string>>;

// ─── buildRecipientValues ─────────────────────────────────────────────────────

describe("buildRecipientValues", () => {
  it("returns empty object when template has no variables and no flags", () => {
    const result = buildRecipientValues(makeTemplate(), 0, {});
    expect(result).toEqual({});
  });

  it("uses the mapping value when present", () => {
    const template = makeTemplate({ variables: [{ name: "firstName", default: "" }] });
    const mappings: Mappings = { 0: { firstName: "Alice" } };
    expect(buildRecipientValues(template, 0, mappings)).toEqual({ firstName: "Alice" });
  });

  it("falls back to variable default when mapping is absent for that var", () => {
    const template = makeTemplate({
      variables: [{ name: "role", default: "Guest" }],
    });
    const result = buildRecipientValues(template, 0, {});
    expect(result.role).toBe("Guest");
  });

  it("falls back to empty string when mapping and default are both absent", () => {
    const template = makeTemplate({ variables: [{ name: "topic", default: "" }] });
    const result = buildRecipientValues(template, 0, {});
    expect(result.topic).toBe("");
  });

  it("mapping value overrides the default", () => {
    const template = makeTemplate({ variables: [{ name: "role", default: "Guest" }] });
    const mappings: Mappings = { 2: { role: "VIP" } };
    expect(buildRecipientValues(template, 2, mappings).role).toBe("VIP");
  });

  it("uses the correct recipient index", () => {
    const template = makeTemplate({ variables: [{ name: "firstName", default: "" }] });
    const mappings: Mappings = {
      0: { firstName: "Alice" },
      1: { firstName: "Bob" },
    };
    expect(buildRecipientValues(template, 0, mappings).firstName).toBe("Alice");
    expect(buildRecipientValues(template, 1, mappings).firstName).toBe("Bob");
  });

  it("returns empty string for a recipient index with no mapping row", () => {
    const template = makeTemplate({ variables: [{ name: "firstName", default: "" }] });
    const mappings: Mappings = { 0: { firstName: "Alice" } };
    // Recipient 5 has no row
    expect(buildRecipientValues(template, 5, mappings).firstName).toBe("");
  });

  it("includes reserved eventDate variable when dateIsVariable is true", () => {
    const template = makeTemplate({ dateIsVariable: true });
    const mappings: Mappings = { 0: { eventDate: "2026-07-01" } };
    const result = buildRecipientValues(template, 0, mappings);
    expect(result.eventDate).toBe("2026-07-01");
  });

  it("includes reserved startTime variable when startTimeIsVariable is true", () => {
    const template = makeTemplate({ startTimeIsVariable: true });
    const mappings: Mappings = { 0: { startTime: "09:00" } };
    const result = buildRecipientValues(template, 0, mappings);
    expect(result.startTime).toBe("09:00");
  });

  it("includes reserved endTime variable when endTimeIsVariable is true", () => {
    const template = makeTemplate({ endTimeIsVariable: true });
    const mappings: Mappings = { 0: { endTime: "10:00" } };
    const result = buildRecipientValues(template, 0, mappings);
    expect(result.endTime).toBe("10:00");
  });

  it("handles all three reserved variables simultaneously", () => {
    const template = makeTemplate({
      dateIsVariable:      true,
      startTimeIsVariable: true,
      endTimeIsVariable:   true,
    });
    const mappings: Mappings = {
      0: { eventDate: "2026-08-15", startTime: "14:00", endTime: "15:00" },
    };
    const result = buildRecipientValues(template, 0, mappings);
    expect(result).toEqual({ eventDate: "2026-08-15", startTime: "14:00", endTime: "15:00" });
  });

  it("combines user-defined and reserved variables", () => {
    const template = makeTemplate({
      variables: [{ name: "firstName", default: "Friend" }],
      dateIsVariable: true,
    });
    const mappings: Mappings = {
      0: { firstName: "Carol", eventDate: "2026-09-01" },
    };
    const result = buildRecipientValues(template, 0, mappings);
    expect(result.firstName).toBe("Carol");
    expect(result.eventDate).toBe("2026-09-01");
  });

  it("handles multiple user-defined variables correctly", () => {
    const template = makeTemplate({
      variables: [
        { name: "firstName", default: "" },
        { name: "company", default: "Acme" },
        { name: "role", default: "Guest" },
      ],
    });
    const mappings: Mappings = {
      1: { firstName: "Dave", company: "FAANG" },
    };
    const result = buildRecipientValues(template, 1, mappings);
    expect(result.firstName).toBe("Dave");
    expect(result.company).toBe("FAANG");
    expect(result.role).toBe("Guest"); // default used
  });

  it("falls back to empty string when both mapping and default are absent at runtime", () => {
    // `default` is typed as string but can be undefined in malformed/legacy data
    const template = makeTemplate({
      variables: [{ name: "field", default: undefined as unknown as string }],
    });
    expect(buildRecipientValues(template, 0, {}).field).toBe("");
  });

  it("treats undefined variables property as empty", () => {
    const template = makeTemplate({ variables: undefined as unknown as [] });
    expect(buildRecipientValues(template, 0, {})).toEqual({});
  });
});
