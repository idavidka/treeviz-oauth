/**
 * Configuration for TreeViz OAuth client
 */
export interface TreeVizOAuthConfig {
	/**
	 * Environment: "production" or "development"
	 * Production: https://treeviz.app
	 * Development: https://dev.treeviz.com
	 * Default: "production"
	 */
	environment?: "production" | "development";

	/** OAuth App ID from TreeViz Admin Panel */
	appId: string;

	/**
	 * OAuth App Secret from TreeViz Admin Panel
	 * @deprecated Use PKCE flow instead (secret not required for public clients)
	 */
	appSecret?: string;

	/** Requested OAuth scopes (default: ["email", "profile"]) */
	scopes?: string[];

	/** Popup window width in pixels (default: 600) */
	popupWidth?: number;

	/** Popup window height in pixels (default: 700) */
	popupHeight?: number;

	/**
	 * Use PKCE (Proof Key for Code Exchange) flow
	 * Recommended for public clients (SPAs, mobile apps)
	 * Default: true
	 */
	usePKCE?: boolean;

	/**
	 * Token exchange Cloud Function URL
	 * This function will exchange the authorization code for a Firebase token
	 * Required when using PKCE flow
	 * Example: https://europe-west1-your-project.cloudfunctions.net/exchangeTreeVizCode
	 */
	exchangeTokenUrl?: string;
}

/**
 * Result of successful TreeViz authentication
 */
export interface TreeVizAuthResult {
	/** Custom Firebase token for signing in */
	token: string;

	/** User ID */
	uid: string;

	/** User email address (if "email" scope granted) */
	email: string | null;

	/** User display name (if "profile" scope granted) */
	displayName: string | null;

	/** User profile photo URL (if "profile" scope granted) */
	photoURL: string | null;
}

/**
 * Message types for popup communication
 * @internal
 */
export type TreeVizAuthMessageType =
	| "TREEVIZ_AUTH_SUCCESS"
	| "TREEVIZ_AUTH_ERROR";

/**
 * Success message from TreeViz popup (Authorization Code Flow)
 * @internal
 */
export interface TreeVizAuthSuccessMessage {
	type: "TREEVIZ_AUTH_SUCCESS";
	code: string; // Authorization code (for PKCE flow)
	expiresIn: number; // Code expiration time in seconds
	token?: string; // Deprecated: Direct token (for non-PKCE flow)
	uid?: string; // Deprecated: User ID (for non-PKCE flow)
	email?: string | null; // Deprecated
	displayName?: string | null; // Deprecated
	photoURL?: string | null; // Deprecated
}

/**
 * Error message from TreeViz popup
 * @internal
 */
export interface TreeVizAuthErrorMessage {
	type: "TREEVIZ_AUTH_ERROR";
	error: string;
}

/**
 * Union of all TreeViz auth messages
 * @internal
 */
export type TreeVizAuthMessage =
	| TreeVizAuthSuccessMessage
	| TreeVizAuthErrorMessage;
