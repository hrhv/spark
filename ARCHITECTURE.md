# Bulk Invite - Architecture & Development Guide

## Overview

Bulk Invite is a **TypeScript-first, modular, testable** application for sending bulk Google Calendar invitations with personalization. Every component is designed for independent testing with vitest.

## File Structure

```
bulk-invite/
├── package.json                 # Dependencies, scripts
├── tsconfig.json               # TypeScript strict mode config
├── vite.config.ts              # Vite configuration
├── vitest.config.ts            # Test configuration
├── .gitignore                  # Git ignore
├── .env.example                # Environment template
├── index.html                  # HTML entry point
├── README.md                   # Main documentation
│
├── src/
│   ├── main.tsx                # React entry point
│   │
│   ├── types/
│   │   └── index.ts            # All TypeScript interfaces
│   │       ├── Invitee
│   │       ├── InviteTemplate
│   │       ├── InviteCampaign
│   │       ├── ParsedCSV
│   │       ├── GoogleAuthToken
│   │       ├── ValidationResult
│   │       └── ...
│   │
│   ├── utils/                  # Reusable, testable functions
│   │   ├── csvParser.ts        # CSV parsing logic
│   │   ├── csvParser.test.ts   # CSV tests
│   │   ├── templateEngine.ts   # Variable substitution
│   │   ├── templateEngine.test.ts
│   │   └── googleCalendar.ts   # Google Calendar API
│   │
│   ├── hooks/
│   │   └── index.ts            # Custom React hooks
│   │       ├── useGoogleAuth() - Auth management
│   │       ├── useCampaign()   - Campaign state
│   │       ├── useLocalStorage() - Persistence
│   │       └── useDebounce()   - Performance
│   │
│   ├── components/             # React components
│   │   ├── App.tsx             # Main orchestrator (no tests)
│   │   ├── Header.tsx          # App header
│   │   ├── CSVUploader.tsx     # CSV import UI
│   │   ├── TemplateEditor.tsx  # Template creation
│   │   ├── InvitePreview.tsx   # Preview invitations
│   │   └── BulkSendForm.tsx    # Send invitations
│   │
│   └── styles/
│       └── global.css          # Global styles, CSS variables
```

## Testing Strategy

Every **utility function** is independently testable:

### CSV Parser (`csvParser.ts`)
```typescript
// Pure functions for CSV processing
parseCSV(text)          // Parse CSV text → structured data
parseCSVLine(line)      // Parse single CSV line
csvToInvitees(parsed)   // Convert to Invitee objects
validateInvitees(inv)   // Validate email, names, duplicates
inviteesToCSV(inv)      // Export back to CSV
```

**Test file**: `csvParser.test.ts`
- 30+ test cases covering all edge cases
- Tests quoted values, escaping, empty lines
- Validates error handling

### Template Engine (`templateEngine.ts`)
```typescript
// Pure functions for template processing
extractVariables(template)      // Find {variables}
renderTemplate(template, inv)   // Substitute variables
validateTemplate(tmpl, invs)    // Check template validity
suggestVariables(invitees)      // Recommend variables
```

**Test file**: `templateEngine.test.ts`
- 20+ test cases for variable handling
- Tests malformed variables, missing data
- Validates coverage calculations

### Google Calendar (`googleCalendar.ts`)
```typescript
// OAuth & API functions
getGoogleAuthURL(uri)           // Get login URL
getAuthToken() / storeAuthToken() // Token management
createCalendarEvent(event)      // Create calendar event
buildCalendarEvent(...)         // Build event object
```

**No unit tests** (API integration), but all helper functions are pure.

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode - rerun on changes
npm test -- --watch

# UI dashboard
npm run test:ui

# Coverage report
npm test -- --coverage
```

## Component Architecture

### Stateful Components
- **App.tsx** - Orchestrates entire workflow, manages step state
- **CSVUploader.tsx** - Manages file upload, validation state
- **TemplateEditor.tsx** - Template creation, variable suggestions
- **InvitePreview.tsx** - Preview selected invitee
- **BulkSendForm.tsx** - Send progress tracking

### Pure Components
- **Header.tsx** - Static header with logout button

### Data Flow

```
App (orchestrator)
├── Step 1: AuthSection
│   └── useGoogleAuth() hook
├── Step 2: CSVUploader
│   ├── onImport() callback
│   └── parseCSV(), csvToInvitees(), validateInvitees()
├── Step 3: TemplateEditor
│   ├── onTemplateCreate() callback
│   └── extractVariables(), validateTemplate()
├── Step 4: InvitePreview
│   ├── renderTemplate() for each invitee
│   └── onNext() to proceed to send
└── Step 5: BulkSendForm
    ├── buildCalendarEvent()
    ├── createCalendarEvent() (API)
    └── Progress tracking
```

## TypeScript Strategy

**Strict mode enabled** across the project:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true
  }
}
```

### Type Definition Approach

All types in `src/types/index.ts`:

```typescript
// Domains
export interface Invitee { ... }
export interface InviteTemplate { ... }
export interface InviteCampaign { ... }

// Data transfer
export interface ParsedCSV { ... }
export interface ValidationResult { ... }

// External integrations
export interface GoogleAuthToken { ... }
export interface GoogleCalendarEvent { ... }
```

**Benefits**:
- Single source of truth
- Easy to refactor
- Interfaces enforced at compile time
- Zero runtime overhead

## Modularity Principles

### Independent Functions

Each utility function:
1. **Pure** - No side effects (except IO)
2. **Documented** - JSDoc comments
3. **Typed** - Strict TypeScript
4. **Testable** - Can test in isolation

Example:
```typescript
/**
 * Render template for a specific invitee
 * @param template Template string with {variables}
 * @param invitee Invitee data
 * @returns Rendered string with missing variable list
 */
export function renderTemplate(
  template: string,
  invitee: Invitee
): { rendered: string; missingVariables: string[] } {
  // Pure function - no side effects
  // Can be tested with any invitee + template
}
```

### Reusable Hooks

Hooks manage state without coupling to components:

```typescript
const { isAuthenticated, login, logout } = useGoogleAuth();
const { invitees, setInvitees } = useCampaign();
const [persisted, setPersisted] = useLocalStorage("key", default);
```

### Style Encapsulation

Each component has local styles (injected via `<style>` tags):
- No CSS conflicts
- Easy to refactor components
- No build-time CSS processing needed

## Performance Optimizations

1. **useCallback** - Memoize event handlers in CSV uploader
2. **useState** - Minimal re-renders
3. **Progress updates** - Batch updates during bulk send
4. **localStorage** - Cache templates/campaigns

## Security Considerations

1. **Token Storage**: OAuth tokens in localStorage only
   - Expires after set time
   - Cleared on logout
   - Marked "not-secure" in sanitizeToken()

2. **Data Privacy**: No backend calls
   - All processing in browser
   - No analytics/tracking
   - Open source code reviewable

3. **Input Validation**:
   - csvParser validates emails
   - templateEngine checks variable validity
   - Invitees validated before sending

## Extending the App

### Adding a New Utility

```typescript
// src/utils/newFeature.ts
export function myFunction(input: string): string {
  // Implementation
}

// src/utils/newFeature.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "@utils/newFeature";

describe("newFeature", () => {
  it("should work", () => {
    expect(myFunction("test")).toBe("expected");
  });
});
```

### Adding a New Component

```typescript
// src/components/NewComponent.tsx
import { someUtil } from "@utils/someUtil";

export default function NewComponent() {
  // Component logic
  return <div>...</div>;
}

const styles = `/* Component styles */`;
const styleEl = document.createElement("style");
styleEl.textContent = styles;
document.head.appendChild(styleEl);
```

### Adding a New Hook

```typescript
// src/hooks/index.ts
export function useMyHook() {
  const [state, setState] = useState(null);
  return { state, setState };
}
```

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
# Follow prompts, set VITE_GOOGLE_CLIENT_ID env var
```

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Troubleshooting

**"Google Client ID is not configured"**
- Create `.env.local` with `VITE_GOOGLE_CLIENT_ID`
- Reload dev server

**Tests failing with "module not found"**
- Run `npm install`
- Check `vitest.config.ts` alias paths

**CSV import fails**
- Ensure CSV has `email`, `firstName`, `lastName` columns
- Check for encoding (should be UTF-8)

## Contributing

1. Create feature branch
2. Write tests for new utilities
3. Ensure `npm test` passes
4. Ensure `npm run type-check` passes
5. Run `npm run build` to verify
6. Submit PR with description

---

**Questions?** Open an issue on GitHub or start a discussion!
