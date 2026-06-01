/**
 * CSV Parser Tests
 * Run with: npm test
 */

import { describe, it, expect } from "vitest";
import {
  parseCSV,
  parseCSVLine,
  csvToInvitees,
  validateInvitees,
  inviteesToCSV,
} from "@utils/csvParser";
import { Invitee, ValidationResult } from "@/types";

describe("csvParser", () => {
  describe("parseCSVLine", () => {
    it("should parse simple comma-separated values", () => {
      const result = parseCSVLine("John,Doe,john@example.com");
      expect(result).toEqual(["John", "Doe", "john@example.com"]);
    });

    it("should handle quoted values with commas", () => {
      const result = parseCSVLine('"Doe, Jr.",John,john@example.com');
      expect(result).toEqual(["Doe, Jr.", "John", "john@example.com"]);
    });

    it("should handle escaped quotes", () => {
      const result = parseCSVLine('"She said ""hello""",John,john@example.com');
      expect(result).toEqual(['She said "hello"', "John", "john@example.com"]);
    });

    it("should trim whitespace", () => {
      const result = parseCSVLine(" John , Doe , john@example.com ");
      expect(result).toEqual(["John", "Doe", "john@example.com"]);
    });

    it("should handle empty values", () => {
      const result = parseCSVLine("John,,john@example.com");
      expect(result).toEqual(["John", "", "john@example.com"]);
    });
  });

  describe("parseCSV", () => {
    it("should parse complete CSV data", () => {
      const csv = `email,firstName,lastName
john@example.com,John,Doe
jane@example.com,Jane,Smith`;

      const result = parseCSV(csv);

      expect(result.headers).toEqual(["email", "firstName", "lastName"]);
      expect(result.rowCount).toBe(2);
      expect(result.rows).toEqual([
        { email: "john@example.com", firstName: "John", lastName: "Doe" },
        { email: "jane@example.com", firstName: "Jane", lastName: "Smith" },
      ]);
    });

    it("should handle custom fields", () => {
      const csv = `email,firstName,lastName,department
john@example.com,John,Doe,Engineering`;

      const result = parseCSV(csv);

      expect(result.headers).toEqual([
        "email",
        "firstName",
        "lastName",
        "department",
      ]);
      expect(result.rows[0]).toEqual({
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        department: "Engineering",
      });
    });

    it("should skip empty lines", () => {
      const csv = `email,firstName,lastName
john@example.com,John,Doe

jane@example.com,Jane,Smith`;

      const result = parseCSV(csv);

      expect(result.rowCount).toBe(2);
    });

    it("should throw on empty CSV", () => {
      expect(() => parseCSV("")).toThrow("CSV file is empty");
    });

    it("should throw on invalid headers", () => {
      expect(() => parseCSV(",,,")).toThrow("CSV headers are invalid");
    });
  });

  describe("csvToInvitees", () => {
    it("should convert CSV rows to Invitee objects", () => {
      const csv = `email,firstName,lastName
john@example.com,John,Doe`;

      const parsed = parseCSV(csv);
      const invitees = csvToInvitees(parsed);

      expect(invitees).toHaveLength(1);
      expect(invitees[0]).toEqual({
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        customFields: {},
      });
    });

    it("should include custom fields", () => {
      const csv = `email,firstName,lastName,department,team
john@example.com,John,Doe,Engineering,Platform`;

      const parsed = parseCSV(csv);
      const invitees = csvToInvitees(parsed);

      expect(invitees[0].customFields).toEqual({
        department: "Engineering",
        team: "Platform",
      });
    });

    it("should throw if required columns are missing", () => {
      const csv = `firstName,lastName
John,Doe`;

      const parsed = parseCSV(csv);

      expect(() => csvToInvitees(parsed)).toThrow(
        'CSV must contain "email", "firstName", and "lastName" columns'
      );
    });

    it("should be case-insensitive for column headers", () => {
      const csv = `Email,FirstName,LastName
john@example.com,John,Doe`;

      const parsed = parseCSV(csv);
      const invitees = csvToInvitees(parsed);

      expect(invitees[0].email).toBe("john@example.com");
    });
  });

  describe("validateInvitees", () => {
    it("should validate correct invitees", () => {
      const invitees: Invitee[] = [
        {
          email: "john@example.com",
          firstName: "John",
          lastName: "Doe",
          customFields: {},
        },
      ];

      const result = validateInvitees(invitees);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid emails", () => {
      const invitees: Invitee[] = [
        {
          email: "not-an-email",
          firstName: "John",
          lastName: "Doe",
          customFields: {},
        },
      ];

      const result = validateInvitees(invitees);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringMatching(/Invalid email/));
    });

    it("should warn on empty names", () => {
      const invitees: Invitee[] = [
        {
          email: "john@example.com",
          firstName: "",
          lastName: "Doe",
          customFields: {},
        },
      ];

      const result = validateInvitees(invitees);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should detect duplicate emails", () => {
      const invitees: Invitee[] = [
        {
          email: "john@example.com",
          firstName: "John",
          lastName: "Doe",
          customFields: {},
        },
        {
          email: "john@example.com",
          firstName: "John",
          lastName: "Smith",
          customFields: {},
        },
      ];

      const result = validateInvitees(invitees);

      expect(result.warnings).toContain(
        expect.stringMatching(/Duplicate email/)
      );
    });
  });

  describe("inviteesToCSV", () => {
    it("should export invitees to CSV format", () => {
      const invitees: Invitee[] = [
        {
          email: "john@example.com",
          firstName: "John",
          lastName: "Doe",
          customFields: { department: "Engineering" },
        },
      ];

      const csv = inviteesToCSV(invitees);

      expect(csv).toContain("email,firstName,lastName,department");
      expect(csv).toContain("john@example.com,John,Doe,Engineering");
    });

    it("should escape special characters", () => {
      const invitees: Invitee[] = [
        {
          email: "john@example.com",
          firstName: "John",
          lastName: "O'Reilly, Jr.",
          customFields: {},
        },
      ];

      const csv = inviteesToCSV(invitees);

      expect(csv).toContain('"O\'Reilly, Jr."');
    });

    it("should return empty string for empty invitees", () => {
      const csv = inviteesToCSV([]);
      expect(csv).toBe("");
    });
  });
});
