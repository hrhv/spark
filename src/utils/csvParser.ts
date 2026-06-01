/**
 * CSV Parser Utility
 * Handles CSV file parsing and validation
 */

import { ParsedCSV, Invitee, ValidationResult } from "@/types";

/**
 * Parse CSV text into structured data
 * @param csvText Raw CSV text content
 * @returns Parsed CSV with headers and rows
 * @throws Error if CSV is invalid
 */
export function parseCSV(csvText: string): ParsedCSV {
  const lines = csvText.trim().split("\n");

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  const headers = parseCSVLine(lines[0]);

  if (headers.length === 0) {
    throw new Error("CSV headers are invalid");
  }

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length === 0) continue; // Skip empty lines

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }

    rows.push(row);
  }

  return {
    headers,
    rows,
    rowCount: rows.length,
  };
}

/**
 * Parse a single CSV line, handling quoted values
 * @param line Single CSV line
 * @returns Array of values
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Convert parsed CSV to Invitee objects
 * Requires email, firstName, lastName columns
 */
export function csvToInvitees(parsed: ParsedCSV): Invitee[] {
  const emailIndex = parsed.headers.findIndex(
    (h) => h.toLowerCase() === "email"
  );
  const firstNameIndex = parsed.headers.findIndex(
    (h) => h.toLowerCase() === "firstname"
  );
  const lastNameIndex = parsed.headers.findIndex(
    (h) => h.toLowerCase() === "lastname"
  );

  if (emailIndex === -1 || firstNameIndex === -1 || lastNameIndex === -1) {
    throw new Error(
      'CSV must contain "email", "firstName", and "lastName" columns'
    );
  }

  return parsed.rows.map((row) => {
    const customFields: Record<string, string> = {};

    // Collect all columns except the standard ones
    parsed.headers.forEach((header, index) => {
      if (
        header.toLowerCase() !== "email" &&
        header.toLowerCase() !== "firstname" &&
        header.toLowerCase() !== "lastname"
      ) {
        customFields[header] = row[header] ?? "";
      }
    });

    return {
      email: row[parsed.headers[emailIndex]] ?? "",
      firstName: row[parsed.headers[firstNameIndex]] ?? "",
      lastName: row[parsed.headers[lastNameIndex]] ?? "",
      customFields,
    };
  });
}

/**
 * Validate an array of invitees
 */
export function validateInvitees(invitees: Invitee[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  invitees.forEach((invitee, index) => {
    if (!invitee.email) {
      errors.push(`Row ${index + 1}: Email is required`);
    } else if (!emailRegex.test(invitee.email)) {
      errors.push(`Row ${index + 1}: Invalid email format: ${invitee.email}`);
    }

    if (!invitee.firstName?.trim()) {
      warnings.push(`Row ${index + 1}: First name is empty`);
    }

    if (!invitee.lastName?.trim()) {
      warnings.push(`Row ${index + 1}: Last name is empty`);
    }
  });

  // Check for duplicates
  const emailSet = new Set<string>();
  invitees.forEach((invitee) => {
    if (emailSet.has(invitee.email)) {
      warnings.push(`Duplicate email: ${invitee.email}`);
    }
    emailSet.add(invitee.email);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Export invitees to CSV format
 */
export function inviteesToCSV(invitees: Invitee[]): string {
  if (invitees.length === 0) {
    return "";
  }

  // Collect all custom field keys
  const customFieldKeys = new Set<string>();
  invitees.forEach((inv) => {
    Object.keys(inv.customFields).forEach((key) => {
      customFieldKeys.add(key);
    });
  });

  const headers = ["email", "firstName", "lastName", ...customFieldKeys];
  const headerRow = headers.map(escapeCSVValue).join(",");

  const dataRows = invitees.map((inv) => {
    const values = [
      inv.email,
      inv.firstName,
      inv.lastName,
      ...headers.slice(3).map((key) => inv.customFields[key] ?? ""),
    ];
    return values.map(escapeCSVValue).join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Escape CSV values that contain special characters
 */
function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
