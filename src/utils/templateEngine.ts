/**
 * Template Engine
 * Handles variable substitution in invite templates
 */

import { Invitee, TemplateVariable } from "@/types";

const VARIABLE_REGEX = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

/**
 * Extract all variables from a template string
 * Variables are in the format {variableName}
 */
export function extractVariables(template: string): TemplateVariable[] {
  const variables = new Map<string, TemplateVariable>();
  const standardVars = new Set(["firstName", "lastName", "email"]);

  let match;
  while ((match = VARIABLE_REGEX.exec(template)) !== null) {
    const varName = match[1];

    if (!variables.has(varName)) {
      variables.set(varName, {
        name: varName,
        placeholder: `{${varName}}`,
        isRequired: standardVars.has(varName),
      });
    }
  }

  return Array.from(variables.values());
}

/**
 * Render a template for a specific invitee
 * Replaces all {variables} with invitee data
 */
export function renderTemplate(
  template: string,
  invitee: Invitee
): { rendered: string; missingVariables: string[] } {
  const missingVariables: string[] = [];
  const context = {
    firstName: invitee.firstName,
    lastName: invitee.lastName,
    email: invitee.email,
    ...invitee.customFields,
  };

  const rendered = template.replace(VARIABLE_REGEX, (match, varName) => {
    const value = context[varName as keyof typeof context];

    if (value === undefined || value === "") {
      missingVariables.push(varName);
      return match; // Keep original placeholder
    }

    return String(value);
  });

  return { rendered, missingVariables };
}

/**
 * Check if a template is valid (can be rendered for all invitees)
 */
export function validateTemplate(
  template: string,
  invitees: Invitee[]
): {
  isValid: boolean;
  errors: string[];
  coverage: number;
} {
  const errors: string[] = [];
  const allMissingVars = new Set<string>();

  if (!template.trim()) {
    errors.push("Template is empty");
    return { isValid: false, errors, coverage: 0 };
  }

  const variables = extractVariables(template);

  invitees.forEach((invitee, index) => {
    const { missingVariables } = renderTemplate(template, invitee);
    missingVariables.forEach((v) => allMissingVars.add(v));

    if (index === 0 && missingVariables.length > 0) {
      // Show errors for first invitee only to avoid spam
      errors.push(
        `Missing variables for first row: ${missingVariables.join(", ")}`
      );
    }
  });

  const totalVariableInstances = (template.match(VARIABLE_REGEX) || []).length;
  const replacedInstances = totalVariableInstances - allMissingVars.size;
  const coverage =
    totalVariableInstances === 0
      ? 100
      : Math.round((replacedInstances / totalVariableInstances) * 100);

  return {
    isValid: errors.length === 0 && coverage === 100,
    errors,
    coverage,
  };
}

/**
 * Get a list of available variables for an invitee
 */
export function getAvailableVariables(invitee: Invitee): Record<string, string> {
  return {
    firstName: invitee.firstName,
    lastName: invitee.lastName,
    email: invitee.email,
    ...invitee.customFields,
  };
}

/**
 * Suggest variables that could be used in a template
 * Based on the data available in the invitees
 */
export function suggestVariables(invitees: Invitee[]): string[] {
  const suggestedVars = new Set<string>();

  if (invitees.length === 0) {
    return ["firstName", "lastName", "email"];
  }

  // Standard variables
  suggestedVars.add("firstName");
  suggestedVars.add("lastName");
  suggestedVars.add("email");

  // Custom fields from first invitee
  const firstInvitee = invitees[0];
  Object.keys(firstInvitee.customFields).forEach((key) => {
    suggestedVars.add(key);
  });

  return Array.from(suggestedVars);
}
