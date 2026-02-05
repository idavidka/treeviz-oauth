# @treeviz/oauth

TreeViz OAuth 2.0 client for federated authentication. This package provides a simple way to authenticate users with their TreeViz account using OAuth 2.0 popup flow.

## Features

- 🔐 OAuth 2.0 authentication flow
- 🪟 Popup-based authentication (non-intrusive)
- 🔄 Automatic token handling
- 🎯 Framework-agnostic (works with any frontend framework)
- 🚀 TypeScript support
- 🧪 Fully tested

## Installation

```bash
npm install @treeviz/oauth
```

## Usage

### Basic Setup

```typescript
import { TreeVizOAuth } from "@treeviz/oauth";

// Initialize OAuth client
const oauth = new TreeVizOAuth({
	authUrl: "https://family-tree-a31ba.web.app", // TreeViz URL
	appId: "your-app-id", // Get from TreeViz Admin Panel
	appSecret: "your-app-secret", // Get from TreeViz Admin Panel
	scopes: ["email", "profile"], // Requested scopes
});

// Sign in with TreeViz
try {
	const result = await oauth.signIn();
	console.log("Authentication successful:", result);
	// result contains: { token, uid, email, displayName, photoURL }
} catch (error) {
	console.error("Authentication failed:", error);
}
```

### With Firebase

```typescript
import { signInWithCustomToken } from "firebase/auth";
import { TreeVizOAuth } from "@treeviz/oauth";
import { auth } from "./firebase-config";

const oauth = new TreeVizOAuth({
	authUrl: process.env.VITE_TREEVIZ_AUTH_URL,
	appId: process.env.VITE_OAUTH_APP_ID,
	appSecret: process.env.VITE_OAUTH_APP_SECRET,
	scopes: ["email", "profile"],
});

async function signInWithTreeViz() {
	const result = await oauth.signIn();
	await signInWithCustomToken(auth, result.token);
}
```

### Development vs Production

```typescript
const isDev = import.meta.env.DEV;

const oauth = new TreeVizOAuth({
	authUrl: isDev 
		? "http://localhost:5555" 
		: "https://family-tree-a31ba.web.app",
	appId: process.env.VITE_OAUTH_APP_ID!,
	appSecret: process.env.VITE_OAUTH_APP_SECRET!,
	scopes: ["email", "profile"],
});
```

## Configuration

### TreeVizOAuthConfig

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `authUrl` | `string` | Yes | Base URL of TreeViz instance |
| `appId` | `string` | Yes | OAuth App ID from TreeViz Admin Panel |
| `appSecret` | `string` | Yes | OAuth App Secret from TreeViz Admin Panel |
| `scopes` | `string[]` | No | Requested scopes (default: `["email", "profile"]`) |
| `callbackPath` | `string` | No | Callback path (default: `"/auth/callback"`) |
| `popupWidth` | `number` | No | Popup window width (default: `600`) |
| `popupHeight` | `number` | No | Popup window height (default: `700`) |

### Authentication Result

The `signIn()` method returns a promise that resolves to:

```typescript
interface TreeVizAuthResult {
	token: string; // Custom Firebase token
	uid: string; // User ID
	email: string | null; // User email
	displayName: string | null; // User display name
	photoURL: string | null; // User profile photo URL
}
```

## Creating OAuth App in TreeViz

1. Go to TreeViz Admin Panel: `https://your-treeviz-url.web.app/admin/oauth-apps`
2. Click "Create New App"
3. Fill in the form:
   - **App Name**: Your application name
   - **Allowed Origins**: `http://localhost:5557`, `https://your-app.web.app`
   - **Callback URIs**: `http://localhost:5557/auth/callback`, `https://your-app.web.app/auth/callback`
   - **Allowed Scopes**: Select `email` and `profile`
4. Save and copy the **App ID** and **App Secret**

## Error Handling

```typescript
try {
	const result = await oauth.signIn();
} catch (error) {
	if (error instanceof Error) {
		switch (error.message) {
			case "Popup blocked. Please allow popups for this site.":
				// Handle popup blocker
				break;
			case "Authentication cancelled":
				// User closed popup
				break;
			default:
				// Other errors
				console.error("Auth error:", error.message);
		}
	}
}
```

## Development

```bash
# Install dependencies
npm install

# Build package
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck
```

## License

MIT
