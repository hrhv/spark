import { describe, it, expect } from "vitest";
import {
  getEffectiveVariables,
  extractTemplateTokens,
  resolveDirectoryField,
  DIRECTORY_FIELD_LABELS,
} from "./templateUtils";
import type { Template, Variable, DirectoryPerson } from "@/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<Template> = {}): Template {
  return {
    name: "Test",
    variables: [],
    content: "",
    ...overrides,
  };
}

const ALICE: DirectoryPerson = { name: "Alice Wong", email: "alice@example.com", photo: "https://example.com/photo.jpg" };
const BOB:   DirectoryPerson = { name: "Bob", email: "bob@example.com" };
const MULTI: DirectoryPerson = { name: "John Michael Doe", email: "john@example.com" };

// ─── getEffectiveVariables ────────────────────────────────────────────────────

describe("getEffectiveVariables", () => {
  it("returns only declared variables when no flags are set", () => {
    const vars: Variable[] = [{ name: "firstName", default: "" }, { name: "role", default: "Guest" }];
    const result = getEffectiveVariables(makeTemplate({ variables: vars }));
    expect(result).toEqual(vars);
  });

  it("appends eventDate when dateIsVariable is true", () => {
    const result = getEffectiveVariables(makeTemplate({ dateIsVariable: true }));
    expect(result).toContainEqual({ name: "eventDate", default: "" });
    expect(result).toHaveLength(1);
  });

  it("appends startTime when startTimeIsVariable is true", () => {
    const result = getEffectiveVariables(makeTemplate({ startTimeIsVariable: true }));
    expect(result).toContainEqual({ name: "startTime", default: "" });
  });

  it("appends endTime when endTimeIsVariable is true", () => {
    const result = getEffectiveVariables(makeTemplate({ endTimeIsVariable: true }));
    expect(result).toContainEqual({ name: "endTime", default: "" });
  });

  it("appends all three reserved vars when all flags are set", () => {
    const result = getEffectiveVariables(
      makeTemplate({ dateIsVariable: true, startTimeIsVariable: true, endTimeIsVariable: true })
    );
    expect(result).toHaveLength(3);
    expect(result.map(v => v.name)).toEqual(["eventDate", "startTime", "endTime"]);
  });

  it("combines user-declared vars with reserved vars", () => {
    const vars: Variable[] = [{ name: "firstName", default: "Guest" }];
    const result = getEffectiveVariables(
      makeTemplate({ variables: vars, dateIsVariable: true, startTimeIsVariable: true })
    );
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("firstName");
    expect(result[1].name).toBe("eventDate");
    expect(result[2].name).toBe("startTime");
  });

  it("returns empty array for a bare template with no variables and no flags", () => {
    expect(getEffectiveVariables(makeTemplate())).toEqual([]);
  });

  it("treats undefined variables property as empty array", () => {
    // Guards against malformed/legacy data where variables is absent
    const template = makeTemplate({ variables: undefined as unknown as [] });
    expect(getEffectiveVariables(template)).toEqual([]);
  });
});

// ─── extractTemplateTokens ────────────────────────────────────────────────────

describe("extractTemplateTokens", () => {
  it("returns empty array when template has no tokens", () => {
    const result = extractTemplateTokens(makeTemplate({ eventTitle: "Team Sync", content: "No variables here." }));
    expect(result).toEqual([]);
  });

  it("extracts token from eventTitle", () => {
    const result = extractTemplateTokens(makeTemplate({ eventTitle: "Meeting with {firstName}" }));
    expect(result).toContain("firstName");
  });

  it("extracts token from location", () => {
    const result = extractTemplateTokens(makeTemplate({ location: "Room {room}" }));
    expect(result).toContain("room");
  });

  it("extracts token from content body", () => {
    const result = extractTemplateTokens(makeTemplate({ content: "Hi {firstName}, see you at {time}." }));
    expect(result).toContain("firstName");
    expect(result).toContain("time");
  });

  it("strips HTML tags from content before extracting tokens", () => {
    const result = extractTemplateTokens(
      makeTemplate({ content: "<div>Hello <strong>{firstName}</strong></div>" })
    );
    expect(result).toContain("firstName");
  });

  it("de-duplicates tokens that appear more than once", () => {
    const result = extractTemplateTokens(
      makeTemplate({ eventTitle: "{firstName}", content: "Dear {firstName}, …" })
    );
    expect(result.filter(t => t === "firstName")).toHaveLength(1);
  });

  it("combines tokens from all three fields without duplicates", () => {
    const result = extractTemplateTokens(
      makeTemplate({
        eventTitle: "{firstName}",
        location: "{room}",
        content: "{firstName} in {room}",
      })
    );
    expect(result).toHaveLength(2);
    expect(result).toContain("firstName");
    expect(result).toContain("room");
  });

  it("handles undefined optional fields gracefully", () => {
    // Only content set, no eventTitle or location
    const result = extractTemplateTokens(makeTemplate({ content: "{topic}" }));
    expect(result).toEqual(["topic"]);
  });

  it("treats undefined content as empty string", () => {
    const template = makeTemplate({ content: undefined as unknown as string });
    expect(extractTemplateTokens(template)).toEqual([]);
  });
});

// ─── resolveDirectoryField ────────────────────────────────────────────────────

describe("resolveDirectoryField", () => {
  it("fullName returns the full name string", () => {
    expect(resolveDirectoryField(ALICE, "fullName")).toBe("Alice Wong");
  });

  it("firstName returns the first word of the name", () => {
    expect(resolveDirectoryField(ALICE, "firstName")).toBe("Alice");
  });

  it("lastName returns everything after the first word", () => {
    expect(resolveDirectoryField(ALICE, "lastName")).toBe("Wong");
  });

  it("email returns the email address", () => {
    expect(resolveDirectoryField(ALICE, "email")).toBe("alice@example.com");
  });

  it("firstName returns the only word when name has no space", () => {
    expect(resolveDirectoryField(BOB, "firstName")).toBe("Bob");
  });

  it("lastName returns empty string when name has no space", () => {
    expect(resolveDirectoryField(BOB, "lastName")).toBe("");
  });

  it("lastName handles multi-part last names", () => {
    expect(resolveDirectoryField(MULTI, "lastName")).toBe("Michael Doe");
  });

  it("fullName and firstName both work with multi-part names", () => {
    expect(resolveDirectoryField(MULTI, "fullName")).toBe("John Michael Doe");
    expect(resolveDirectoryField(MULTI, "firstName")).toBe("John");
  });

  it("firstName returns empty string when person name is an empty string", () => {
    const empty: DirectoryPerson = { name: "", email: "x@example.com" };
    expect(resolveDirectoryField(empty, "firstName")).toBe("");
  });

});

// ─── DIRECTORY_FIELD_LABELS ───────────────────────────────────────────────────

describe("DIRECTORY_FIELD_LABELS", () => {
  it("has a label for every DirectoryField", () => {
    const fields = ["fullName", "firstName", "lastName", "email"] as const;
    fields.forEach(f => {
      expect(DIRECTORY_FIELD_LABELS[f]).toBeTruthy();
    });
  });

  it("has human-readable labels", () => {
    expect(DIRECTORY_FIELD_LABELS.fullName).toBe("Full name");
    expect(DIRECTORY_FIELD_LABELS.firstName).toBe("First name");
    expect(DIRECTORY_FIELD_LABELS.lastName).toBe("Last name");
    expect(DIRECTORY_FIELD_LABELS.email).toBe("Email");
  });
});
