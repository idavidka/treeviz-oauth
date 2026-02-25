/**
 * TreeViz OAuth Constants
 * Public OAuth endpoints for 3rd party applications
 *
 * This package contains ONLY the public OAuth API:
 * - oauth_authorize: Generate authorization code
 * - oauth_token: Exchange code for access token
 *
 */

/**
 * TreeViz OAuth Authorization Endpoints
 * Where users authenticate with TreeViz
 */
export const TREEVIZ_OAUTH_URLS = {
	production: "https://treeviz.com",
	development: "https://dev.treeviz.com",
} as const;

/**
 * TreeViz OAuth callback path
 * Standard path for OAuth authorization
 */
export const TREEVIZ_OAUTH_CALLBACK_PATH = "/oauth/callback" as const;

/**
 * TreeViz OAuth Token Exchange Endpoints (Cloud Functions)
 * PUBLIC API: Backend-to-backend token exchange with PKCE verification
 * Called by 3rd party application backends to exchange authorization code for access token
 */
export const TREEVIZ_TOKEN_ENDPOINTS = {
	production: "https://treeviz.com/api/oauth/token",
	development:
		"https://europe-west1-family-tree-a31ba.cloudfunctions.net/oauth_token",
} as const;

/**
 * TreeViz OAuth Authorization Endpoints (Cloud Functions)
 * PUBLIC API: Generate authorization code after user authentication
 * Called by TreeViz frontend after user login to generate authorization code for 3rd party app
 */
export const TREEVIZ_AUTHORIZE_ENDPOINTS = {
	production: "https://treeviz.com/api/oauth/authorize",
	development:
		"https://europe-west1-family-tree-a31ba.cloudfunctions.net/oauth_authorize",
} as const;

/**
 * Default OAuth scopes
 */
export const DEFAULT_OAUTH_SCOPES = ["email", "profile"] as const;
