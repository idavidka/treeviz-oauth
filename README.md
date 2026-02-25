# @treeviz/oauth

> Part of the [@treeviz](https://www.npmjs.com/org/treeviz) organization - A collection of tools for genealogy data processing and visualization.

TreeViz OAuth 2.0 client for federated authentication. This package lets any third-party application authenticate users with their existing TreeViz account, using a secure OAuth 2.0 + PKCE popup flow.

## Features

- 🔐 OAuth 2.0 with PKCE (no client secret needed in the browser)
- �� Popup-based authentication (non-intrusive)
- 🔄 Authorization code exchange via your own backend
- 🎯 Framework-agnostic (works with any frontend framework)
- 🚀 TypeScript support
- 🧪 Fully tested

---

## Getting Access

> **Your application must be registered with TreeViz before you can use this package.**

To register your application, visit **[treeviz.com](https://treeviz.com)** and request access.

Once approved, you will receive an **App ID** to use in your integration. Registration is required for security — TreeViz validates origin and callback URI on every request.

---

## How It Works

TreeViz OAuth uses a **PKCE-secured Authorization Code Flow** with a popup window:

```
Your App (frontend)                            TreeViz
  │                                               │
  ├─1─► Opens TreeViz popup ────────────────────► │
  │      (appId, PKCE challenge, callbackUri)      │
  │                                               │
  │     User logs in and authorizes your app      │
  │                                               │
  │  ◄── /api/oauth/authorize (internal) ────────  │
  │       TreeViz generates authorization code    │
  │       [handled internally by the package]     │
  │                                               │
  ◄─2─┘ Popup posts { code } back via postMessage │
  │                                               │
  ├─3─► Your backend: POST /api/oauth/token ────► │
  │      { appId, code, codeVerifier }            │
  │                                               │
  ◄─4─┘ { accessToken, user } ◄─────────────────  │
  │                                               │
  ├─5─► Your backend creates/updates user         │
  │     and returns session token to frontend     │
  │                                               │
  └─6─► Frontend signs the user in
```

**Endpoints:**
- `POST https://treeviz.com/api/oauth/token` — the only endpoint your backend needs to call
- `POST https://treeviz.com/api/oauth/authorize` — called **internally** by TreeViz after the user logs in; you never call this directly

**Why PKCE?** Because the authorization code exchange happens in the browser where a client secret cannot be kept safe. PKCE replaces the secret with a cryptographic challenge that only your app can solve.

---

## Installation

```bash
npm install @treeviz/oauth
```

---

## Frontend Integration

### 1. Initialize the client

```typescript
import { TreeVizOAuth } from "@treeviz/oauth";

const oauth = new TreeVizOAuth({
  environment: "production",    // "production" | "development"
  appId: "your-app-id",         // Provided by TreeViz after registration
  scopes: ["email", "profile"],
  usePKCE: true,
  // URL of YOUR backend endpoint that will exchange the auth code
  exchangeTokenUrl: "https://your-backend.example.com/auth/treeviz/exchange",
});
```

> **Development mode**: Set `environment: "development"` to point the OAuth flow at `https://dev.treeviz.com` instead of production.

### 2. Trigger sign-in

```typescript
async function handleSignIn() {
  try {
    const result = await oauth.signIn();
    // result.token        — your backend's session/auth token
    // result.uid          — user UID (as set by your backend)
    // result.email
    // result.displayName
    // result.photoURL

    // Use the token however your app needs:
    localStorage.setItem("session_token", result.token);
    // or with Firebase: signInWithCustomToken(firebaseAuth, result.token);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Sign-in failed:", error.message);
    }
  }
}
```

### 3. Add the OAuth callback page

TreeViz redirects back to your `callbackUri` after the user authenticates. You need a dedicated page at that path. Its only job is to receive the authorization code from the URL and pass it back to the opener via `postMessage`.

**Callback URI to register with TreeViz:**
```
https://your-app.example.com/auth/callback
```

**Example: plain HTML/JS**

```html
<!DOCTYPE html>
<html>
  <head><title>Authenticating…</title></head>
  <body>
    <p>Authenticating, please wait…</p>
    <script>
      const params = new URLSearchParams(window.location.search);
      const code  = params.get("code");
      const error = params.get("error");

      if (error) {
        window.opener?.postMessage(
          { type: "TREEVIZ_AUTH_ERROR", error },
          window.location.origin
        );
      } else if (code) {
        window.opener?.postMessage(
          { type: "TREEVIZ_AUTH_SUCCESS", code },
          window.location.origin
        );
      }

      window.close();
    </script>
  </body>
</html>
```

**Example: React Router route**

```tsx
// src/pages/auth-callback.tsx
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function AuthCallback() {
  const [params] = useSearchParams();

  useEffect(() => {
    const code  = params.get("code");
    const error = params.get("error");

    if (error) {
      window.opener?.postMessage(
        { type: "TREEVIZ_AUTH_ERROR", error },
        window.location.origin
      );
    } else if (code) {
      window.opener?.postMessage(
        { type: "TREEVIZ_AUTH_SUCCESS", code },
        window.location.origin
      );
    }

    window.close();
  }, [params]);

  return <p>Authenticating…</p>;
}
```

Register this route in your router:

```tsx
<Route path="/auth/callback" element={<AuthCallback />} />
```

---

## Backend Integration

The `@treeviz/oauth` client will call your `exchangeTokenUrl` with a `POST` request carrying `{ code, codeVerifier }` in the body. Your backend must:

1. Receive `code` and `codeVerifier`
2. Call the **TreeViz token endpoint** to exchange the code for user info
3. Create or update the user in your own auth/database
4. Return a session token to the frontend

### Using the Built-in Backend SDK (recommended)

The package exports `TreeVizOAuthAPI` — a thin backend SDK that wraps the token endpoint call so you don't have to write the fetch manually:

```typescript
import { TreeVizOAuthAPI } from "@treeviz/oauth";

const treeviz = new TreeVizOAuthAPI({
  appId: process.env.TREEVIZ_APP_ID!,
  environment: "production", // "production" | "development"
});

// In your exchange endpoint handler:
const tokenData = await treeviz.exchangeCode(code, codeVerifier);
// tokenData.user.uid, tokenData.user.email, tokenData.accessToken, …
```

Or use the standalone function directly:

```typescript
import { exchangeAuthorizationCode } from "@treeviz/oauth";

const tokenData = await exchangeAuthorizationCode(
  { appId: "your-app-id", code, codeVerifier },
  "production"
);
```

### TreeViz Token Endpoint (raw REST)

```
POST https://treeviz.com/api/oauth/token
Content-Type: application/json

{
  "data": {
    "appId": "your-app-id",
    "code": "<authorization_code>",
    "codeVerifier": "<pkce_code_verifier>"
  }
}
```

**Successful response:**

```json
{
  "result": {
    "accessToken": "<treeviz_access_token>",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "uid": "treeviz-user-uid",
      "email": "user@example.com",
      "displayName": "Jane Doe",
      "photoURL": "https://..."
    }
  }
}
```

---

### Backend Examples

#### Node.js / Express (REST)

```javascript
// POST /auth/treeviz/exchange
app.post("/auth/treeviz/exchange", async (req, res) => {
  const { code, codeVerifier } = req.body;

  if (!code || !codeVerifier) {
    return res.status(400).json({ error: "Missing code or codeVerifier" });
  }

  // 1. Exchange code with TreeViz
  const tokenRes = await fetch(
    "https://treeviz.com/api/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          appId: process.env.TREEVIZ_APP_ID,
          code,
          codeVerifier,
        },
      }),
    }
  );

  if (!tokenRes.ok) {
    return res.status(502).json({ error: "TreeViz token exchange failed" });
  }

  const { result } = await tokenRes.json();
  const treevizUser = result.user;

  // 2. Create or update the user in your own database
  // Prefix the UID to avoid collisions with your own users
  const yourUserId = `treeviz_${treevizUser.uid}`;
  await upsertUser({
    id: yourUserId,
    email: treevizUser.email,
    displayName: treevizUser.displayName,
    photoURL: treevizUser.photoURL,
  });

  // 3. Issue a session token for your app (JWT, session cookie, etc.)
  const sessionToken = issueSessionToken(yourUserId);

  res.json({
    token: sessionToken,
    uid: yourUserId,
    email: treevizUser.email,
    displayName: treevizUser.displayName,
    photoURL: treevizUser.photoURL,
  });
});
```

#### Firebase Cloud Functions (2nd gen) + Firebase Auth

Recommended if your backend uses Firebase. The function returns a Firebase custom token; the frontend calls `signInWithCustomToken()` with it.

```typescript
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

const TREEVIZ_TOKEN_ENDPOINT =
  "https://treeviz.com/api/oauth/token";

export const exchangeTreeVizCode = onCall(async (request) => {
  const { code, codeVerifier } = request.data;

  if (!code || !codeVerifier) {
    throw new HttpsError("invalid-argument", "Missing required parameters");
  }

  // 1. Exchange code with TreeViz
  const tokenResponse = await fetch(TREEVIZ_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        appId: process.env.TREEVIZ_APP_ID,
        code,
        codeVerifier,
      },
    }),
  });

  if (!tokenResponse.ok) {
    throw new HttpsError("internal", "TreeViz token exchange failed");
  }

  const { result } = await tokenResponse.json();
  const treevizUser = result.user;
  const uid = `treeviz_${treevizUser.uid}`;

  // 2. Create or update user in Firebase Auth
  try {
    await admin.auth().getUser(uid);
    await admin.auth().updateUser(uid, {
      email: treevizUser.email ?? undefined,
      displayName: treevizUser.displayName ?? undefined,
      photoURL: treevizUser.photoURL ?? undefined,
    });
  } catch (e: any) {
    if (e.code === "auth/user-not-found") {
      await admin.auth().createUser({
        uid,
        email: treevizUser.email ?? undefined,
        displayName: treevizUser.displayName ?? undefined,
        photoURL: treevizUser.photoURL ?? undefined,
      });
    } else {
      throw e;
    }
  }

  // 3. Return a Firebase custom token
  const firebaseToken = await admin.auth().createCustomToken(uid, {
    provider: "treeviz",
    treevizUid: treevizUser.uid,
  });

  return {
    token: firebaseToken,
    uid,
    email: treevizUser.email,
    displayName: treevizUser.displayName,
    photoURL: treevizUser.photoURL,
  };
});
```

Then on the frontend with Firebase:

```typescript
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./firebase-config";

const result = await oauth.signIn();               // calls your Cloud Function
await signInWithCustomToken(auth, result.token);    // signs into Firebase
```

#### Python / Flask (REST)

```python
import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

TREEVIZ_TOKEN_ENDPOINT = (
    "https://treeviz.com/api/oauth/token"
)

@app.post("/auth/treeviz/exchange")
def exchange():
    body = request.get_json()
    code = body.get("code")
    code_verifier = body.get("codeVerifier")

    if not code or not code_verifier:
        return jsonify(error="Missing code or codeVerifier"), 400

    # 1. Exchange with TreeViz
    resp = requests.post(
        TREEVIZ_TOKEN_ENDPOINT,
        json={"data": {
            "appId": os.environ["TREEVIZ_APP_ID"],
            "code": code,
            "codeVerifier": code_verifier,
        }},
    )
    if not resp.ok:
        return jsonify(error="TreeViz token exchange failed"), 502

    treeviz_user = resp.json()["result"]["user"]
    your_user_id = f"treeviz_{treeviz_user['uid']}"

    # 2. Upsert user in your database
    upsert_user(your_user_id, treeviz_user)

    # 3. Issue your own session token
    session_token = issue_session_token(your_user_id)

    return jsonify(
        token=session_token,
        uid=your_user_id,
        email=treeviz_user.get("email"),
        displayName=treeviz_user.get("displayName"),
        photoURL=treeviz_user.get("photoURL"),
    )
```

---

## Configuration Reference

### `TreeVizOAuthConfig`

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `environment` | `"production"` \| `"development"` | No | `"production"` | Switches between prod and local TreeViz server |
| `appId` | `string` | **Yes** | — | App ID provided by TreeViz after registration |
| `appSecret` | `string` | No | — | Deprecated — not needed for PKCE flow |
| `scopes` | `string[]` | No | `["email","profile"]` | Requested OAuth scopes |
| `usePKCE` | `boolean` | No | `true` | Enable PKCE flow (recommended for all public clients) |
| `exchangeTokenUrl` | `string` | Yes (PKCE) | — | Your backend endpoint that exchanges the authorization code |
| `popupWidth` | `number` | No | `600` | Popup window width in pixels |
| `popupHeight` | `number` | No | `700` | Popup window height in pixels |

### `TreeVizAuthResult` (returned by `oauth.signIn()`)

```typescript
interface TreeVizAuthResult {
  token: string;          // Token returned by your exchangeTokenUrl endpoint
  uid: string;            // User UID (as returned by your backend)
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
```

---

## Error Handling

```typescript
try {
  const result = await oauth.signIn();
} catch (error) {
  if (error instanceof Error) {
    switch (error.message) {
      case "Popup blocked. Please allow popups for this site.":
        alert("Please allow popups for this site and try again.");
        break;
      case "Authentication cancelled":
        // User closed the popup — no action needed
        break;
      default:
        console.error("Auth error:", error.message);
    }
  }
}
```

---

## Security Notes

- **PKCE** ensures the authorization code is useless without the `codeVerifier` generated in the same browser session — no client secret needed in the browser.
- **Origin validation**: TreeViz checks that the opener's origin is in your registered allowed origins list. Any unlisted origin is rejected.
- **Callback URI validation**: TreeViz validates `callbackUri` against your registered list. Mismatches are rejected server-side.
- **Never forward `codeVerifier` to third parties** — it must only travel from the browser to your own backend.
- **UID prefixing** (`treeviz_<uid>`): Prefix TreeViz UIDs in your own user store to avoid collisions with natively registered users.

---

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

---

## License

MIT
