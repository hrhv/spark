# Bulk Invite 📅

Privacy-first, open-source bulk Google Calendar invite tool. Send personalized meeting invitations to hundreds of people with variable substitution, all without your data ever leaving your device.

## Features

✅ **Privacy-First**: All processing happens in your browser. No backend, no data storage.  
✅ **Open Source**: Full transparency. Audit the code yourself.  
✅ **Bulk Invites**: Send to 100+ recipients simultaneously.  
✅ **Personalization**: Template with `{firstName}`, `{lastName}`, custom fields.  
✅ **CSV Import**: Easily import recipient lists.  
✅ **Real-time Preview**: See how each invitation looks.  
✅ **Google Calendar Native**: Integrates directly with Google Calendar API.  
✅ **No Setup Required**: Works immediately after authentication.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Google account with Calendar access

### Installation

```bash
# Clone or download the project
git clone <repository-url>
cd bulk-invite

# Install dependencies
npm install

# Set up Google OAuth credentials
# See "Google OAuth Setup" section below

# Start development server
npm run dev
```

The app opens at `http://localhost:3000`

### Building for Production

```bash
npm run build
npm run preview
```

## Setup & Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the Google Calendar API
4. Create an OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
6. Copy your Client ID
7. Create a `.env.local` file in the project root:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

## Project Structure

```
src/
├── components/           # React components
│   ├── App.tsx          # Main orchestrator
│   ├── Header.tsx       # App header
│   ├── CSVUploader.tsx  # CSV import
│   ├── TemplateEditor.tsx
│   ├── InvitePreview.tsx
│   └── BulkSendForm.tsx
├── hooks/               # Custom React hooks
│   └── index.ts
├── utils/               # Reusable, testable utilities
│   ├── csvParser.ts
│   ├── csvParser.test.ts
│   ├── templateEngine.ts
│   ├── templateEngine.test.ts
│   └── googleCalendar.ts
├── types/               # TypeScript interfaces
│   └── index.ts
├── styles/              # Global CSS
│   └── global.css
└── main.tsx             # Entry point
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Check test coverage
npm test -- --coverage
```

### Type Checking

```bash
npm run type-check
npm run lint
```

### Code Organization for Testing

Each utility is designed to be **independently testable**:

- **`csvParser.ts`**: Pure functions for CSV parsing
  - `parseCSV()` - Parse CSV text
  - `csvToInvitees()` - Convert to Invitee objects
  - `validateInvitees()` - Validate data

- **`templateEngine.ts`**: Pure functions for template processing
  - `extractVariables()` - Find {variables}
  - `renderTemplate()` - Substitute variables
  - `validateTemplate()` - Check template validity

- **`googleCalendar.ts`**: API integration
  - `getAuthToken()` / `storeAuthToken()` - Auth management
  - `createCalendarEvent()` - Create events
  - `buildCalendarEvent()` - Event builder

All functions are:
- Pure (no side effects except noted)
- Well-typed with TypeScript
- Documented with JSDoc
- Covered by tests

## Example Test

```typescript
import { describe, it, expect } from "vitest";
import { renderTemplate } from "@utils/templateEngine";

describe("templateEngine", () => {
  it("should replace variables in template", () => {
    const invitee = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      customFields: {},
    };

    const { rendered } = renderTemplate(
      "Hello {firstName}",
      invitee
    );

    expect(rendered).toBe("Hello John");
  });
});
```

## How It Works

1. **Authentication**: Sign in with Google (OAuth)
2. **Import**: Upload CSV with email, firstName, lastName
3. **Template**: Create invitation with {variables}
4. **Preview**: See how invitations look
5. **Send**: Create events directly in Google Calendar

## Security & Privacy

- **No Backend**: Everything happens in the browser
- **No Data Storage**: Invitee data never leaves your device
- **No Third Parties**: Direct Google Calendar API only
- **Open Source**: Full code transparency
- **Local Auth**: OAuth tokens stored securely in localStorage

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Contributing

Contributions welcome! This is an open-source project.

```bash
# Fork, make changes, and submit a PR
npm test           # Ensure tests pass
npm run type-check # Ensure types are correct
npm run build      # Ensure build succeeds
```

## Roadmap

- [ ] Outlook/Microsoft 365 support
- [ ] Apple Calendar support
- [ ] RSVP tracking (optional backend)
- [ ] Team management (optional backend)
- [ ] Email templates (rich text)
- [ ] Recurring invitations
- [ ] Timezone handling
- [ ] Undo/history

## License

MIT - Open source and free forever

## Support

- Issues: [GitHub Issues](https://github.com/yourusername/bulk-invite/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/bulk-invite/discussions)

## FAQs

**Q: Where is my data stored?**  
A: Nowhere. Everything stays in your browser. No backend servers.

**Q: Can I use this offline?**  
A: Template creation works offline. Sending requires Google Calendar access.

**Q: How many invitations can I send?**  
A: As many as you want. Rate-limited by Google's API (reasonable limits).

**Q: Can I undo sent invitations?**  
A: They're created as calendar events. Delete them directly in Google Calendar.

**Q: Is this officially affiliated with Google?**  
A: No. It uses the public Google Calendar API.

---

Made with ❤️ for developers who value privacy.
