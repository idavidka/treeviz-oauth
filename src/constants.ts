/**
 * TreeViz OAuth Constants
 * Fixed URLs for TreeViz OAuth endpoints
 */

/**
 * TreeViz OAuth Authorization Endpoints
 * Where users authenticate with TreeViz
 */
export const TREEVIZ_OAUTH_URLS = {
	production: "https://treeviz.com",
	development: "http://localhost:5555",
} as const;

/**
 * TreeViz OAuth callback path
 * Standard path for OAuth authorization
 */
export const TREEVIZ_OAUTH_CALLBACK_PATH = "/oauth/callback" as const;

/**
 * Default OAuth scopes
 */
export const DEFAULT_OAUTH_SCOPES = ["email", "profile"] as const;
