# Spark

Bulk Calendar Invitations. Personalized for each recipient. Privacy-first.

## Features

✅ **Privacy-First**: All processing happens in your browser. No backend, no data storage.  
✅ **Open Source**: Full transparency. Audit the code yourself.  
✅ **Bulk Invites**: Send to 50+ recipients simultaneously (unlimited, in theory).
✅ **Personalization**: Template with `{firstName}`, `{lastName}`, custom fields.   
✅ **Real-time Preview**: See how each invitation looks.  
✅ **Google Calendar Native**: Integrates directly with Google Calendar API and Google Workspace Directory API.
✅ **No Setup Required**: Works immediately after authentication.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Google account with Calendar access

### Installation

```bash
# Clone or download the project
git clone <repository-url>
cd spark

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
4. Enable the Google People API
5. Enable the Google Sheets API
6. Create an OAuth 2.0 Client ID (Web application)
7. Add authorized redirect URIs:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
8. Copy your Client ID
9. Create a `.env.local` file in the project root:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
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

- [ ] Team management (optional backend)
- [ ] Recurring invitations
- [ ] Available time slots checking

## Support

- Issues: [GitHub Issues](https://github.com/hrhv/spark/issues)
- Discussions: [GitHub Discussions](https://github.com/hrhv/spark/discussions)

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

Made with ❤️ for users who value privacy.
