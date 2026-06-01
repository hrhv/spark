/**
 * Template Engine Tests
 * Run with: npm test
 */

import { describe, it, expect } from "vitest";
import {
  extractVariables,
  renderTemplate,
  validateTemplate,
  getAvailableVariables,
  suggestVariables,
} from "@utils/templateEngine";
import { Invitee } from "@/types";

describe("templateEngine", () => {
  const mockInvitee: Invitee = {
    email: "john@example.com",
    firstName: "John",
    lastName: "Doe",
    customFields: { department: "Engineering", team: "Platform" },
  };

  describe("extractVariables", () => {
    it("should extract variables from template", () => {
      const template = "Hello {firstName} {lastName}, your email is {email}";
      const variables = extractVariables(template);

      expect(variables).toHaveLength(3);
      expect(variables.map((v) => v.name)).toEqual([
        "firstName",
        "lastName",
        "email",
      ]);
    });

    it("should not extract duplicate variables", () => {
      const template = "Hello {firstName}, welcome {firstName}!";
      const variables = extractVariables(template);

      expect(variables).toHaveLength(1);
    });

    it("should mark standard variables as required", () => {
      const template = "Hello {firstName} {email}";
      const variables = extractVariables(template);

      expect(variables.find((v) => v.name === "firstName")?.isRequired).toBe(
        true
      );
      expect(variables.find((v) => v.name === "email")?.isRequired).toBe(true);
    });

    it("should return empty array for template without variables", () => {
      const template = "Hello there!";
      const variables = extractVariables(template);

      expect(variables).toHaveLength(0);
    });

    it("should handle malformed variable names", () => {
      const template = "Hello {123invalid} {valid_name}";
      const variables = extractVariables(template);

      expect(variables.some((v) => v.name === "valid_name")).toBe(true);
      expect(variables.some((v) => v.name === "123invalid")).toBe(false);
    });
  });

  describe("renderTemplate", () => {
    it("should replace variables with invitee data", () => {
      const template = "Hello {firstName} {lastName}";
      const { rendered } = renderTemplate(template, mockInvitee);

      expect(rendered).toBe("Hello John Doe");
    });

    it("should handle custom fields", () => {
      const template =
        "Hi {firstName}, you are in the {department} {team}.";
      const { rendered } = renderTemplate(template, mockInvitee);

      expect(rendered).toBe(
        "Hi John, you are in the Engineering Platform."
      );
    });

    it("should report missing variables", () => {
      const template = "Hello {firstName} {nonexistent}";
      const { rendered, missingVariables } = renderTemplate(
        template,
        mockInvitee
      );

      expect(missingVariables).toContain("nonexistent");
      expect(rendered).toContain("{nonexistent}");
    });

    it("should handle empty custom field values", () => {
      const invitee: Invitee = {
        ...mockInvitee,
        customFields: { department: "" },
      };

      const template = "You are in: {department}";
      const { rendered, missingVariables } = renderTemplate(template, invitee);

      expect(missingVariables).toContain("department");
    });

    it("should preserve non-variable braces", () => {
      const template = "Meeting at {10:00 AM} with {firstName}";
      const { rendered } = renderTemplate(template, mockInvitee);

      expect(rendered).toBe("Meeting at {10:00 AM} with John");
    });
  });

  describe("validateTemplate", () => {
    it("should validate correct template", () => {
      const template = "Hello {firstName}";
      const invitees = [mockInvitee];

      const result = validateTemplate(template, invitees);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.coverage).toBe(100);
    });

    it("should reject empty template", () => {
      const result = validateTemplate("", [mockInvitee]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Template is empty");
    });

    it("should detect missing variables", () => {
      const template = "Hello {nonexistent}";
      const invitees = [mockInvitee];

      const result = validateTemplate(template, invitees);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should calculate coverage percentage", () => {
      const template = "Meet {firstName} {unknown} at {time}";
      const invitees = [
        {
          ...mockInvitee,
          customFields: { ...mockInvitee.customFields, time: "3 PM" },
        },
      ];

      const result = validateTemplate(template, invitees);

      // 2 out of 3 variables found
      expect(result.coverage).toBe(expect.any(Number));
    });

    it("should handle template with no variables", () => {
      const template = "Static meeting invitation";
      const invitees = [mockInvitee];

      const result = validateTemplate(template, invitees);

      expect(result.isValid).toBe(true);
      expect(result.coverage).toBe(100);
    });
  });

  describe("getAvailableVariables", () => {
    it("should return all available variables for invitee", () => {
      const variables = getAvailableVariables(mockInvitee);

      expect(variables.firstName).toBe("John");
      expect(variables.lastName).toBe("Doe");
      expect(variables.email).toBe("john@example.com");
      expect(variables.department).toBe("Engineering");
      expect(variables.team).toBe("Platform");
    });

    it("should return custom fields", () => {
      const variables = getAvailableVariables(mockInvitee);

      expect(Object.keys(variables)).toContain("department");
      expect(Object.keys(variables)).toContain("team");
    });
  });

  describe("suggestVariables", () => {
    it("should suggest standard variables for empty invitees", () => {
      const suggestions = suggestVariables([]);

      expect(suggestions).toContain("firstName");
      expect(suggestions).toContain("lastName");
      expect(suggestions).toContain("email");
    });

    it("should suggest custom fields from first invitee", () => {
      const invitees = [mockInvitee];
      const suggestions = suggestVariables(invitees);

      expect(suggestions).toContain("department");
      expect(suggestions).toContain("team");
    });

    it("should not duplicate suggestions", () => {
      const invitees = [mockInvitee, mockInvitee];
      const suggestions = suggestVariables(invitees);

      const uniqueSuggestions = new Set(suggestions);
      expect(uniqueSuggestions.size).toBe(suggestions.length);
    });
  });
});
