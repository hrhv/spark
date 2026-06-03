/**
 * Pure utility functions for campaign send operations.
 */

import type { Template } from "@/types";
import { getEffectiveVariables } from "./templateUtils";

/**
 * Builds the resolved variable-value map for a single recipient.
 *
 * Resolution order (highest to lowest priority):
 *   1. The cell value from the campaign's mapping grid (per-recipient override)
 *   2. The variable's declared default on the template
 *   3. Empty string
 *
 * The returned object includes both user-defined variables AND the reserved
 * date/time variables (eventDate, startTime, endTime) when the template has
 * the corresponding `*IsVariable` flag set.
 */
export function buildRecipientValues(
  template: Template,
  recipientIndex: number,
  mappings: Record<number, Record<string, string>>
): Record<string, string> {
  const values: Record<string, string> = {};
  getEffectiveVariables(template).forEach(v => {
    values[v.name] = mappings[recipientIndex]?.[v.name] ?? v.default ?? "";
  });
  return values;
}
