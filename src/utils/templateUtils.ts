/**
 * Pure utility functions for template and directory operations.
 * No side effects, no DOM access — fully unit-testable.
 */

import type { Template, Variable, DirectoryPerson } from "@/types";
export { RESERVED_VARIABLE_NAMES } from "@/types";
export type { ReservedVariableName } from "@/types";

// ─── Directory field resolution ───────────────────────────────────────────────

export type DirectoryField = "fullName" | "firstName" | "lastName" | "email";

export const DIRECTORY_FIELD_LABELS: Record<DirectoryField, string> = {
  fullName:  "Full name",
  firstName: "First name",
  lastName:  "Last name",
  email:     "Email",
};

export function resolveDirectoryField(person: DirectoryPerson, field: DirectoryField): string {
  switch (field) {
    case "fullName":  return person.name;
    case "firstName": return person.name.split(" ")[0];
    case "lastName":  return person.name.split(" ").slice(1).join(" ");
    case "email":     return person.email;
  }
}

// ─── Template variable helpers ────────────────────────────────────────────────

/**
 * Returns all effective variables for a template, including the implicit
 * reserved ones ({eventDate}, {startTime}, {endTime}) when the corresponding
 * "isVariable" flag is set on the template.
 */
export function getEffectiveVariables(template: Template): Variable[] {
  const vars = [...(template.variables ?? [])];
  if (template.dateIsVariable)      vars.push({ name: "eventDate",  default: "" });
  if (template.startTimeIsVariable) vars.push({ name: "startTime",  default: "" });
  if (template.endTimeIsVariable)   vars.push({ name: "endTime",    default: "" });
  return vars;
}

/**
 * Extracts every {varName} token that appears in the template's text fields
 * (eventTitle, location, and the HTML-stripped content body).
 * Returns a de-duplicated array.
 */
export function extractTemplateTokens(template: Template): string[] {
  const plain = (template.content ?? "").replace(/<[^>]*>/g, " ");
  const sources = [template.eventTitle ?? "", template.location ?? "", plain];
  const tokens = new Set<string>();
  sources.forEach(s => {
    (s.match(/\{([^}]+)\}/g) ?? []).forEach(m => tokens.add(m.slice(1, -1)));
  });
  return Array.from(tokens);
}
