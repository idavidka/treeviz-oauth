/**
 * Configuration for TreeViz OAuth client
 */
export interface TreeVizOAuthConfig {
	/** Base URL of TreeViz instance (e.g., "https://family-tree-a31ba.web.app") */
	authUrl: string;

	/** OAuth App ID from TreeViz Admin Panel */
	appId: string;

	/**
	 * OAuth App Secret from TreeViz Admin Panel
	 * @deprecated Use PKCE flow instead (secret not required for public clients)
	 */
	appSecret?: string;

	/** Requested OAuth scopes (default: ["email", "profile"]) */
	scopes?: string[];

	/** OAuth callback path (default: "/oauth/callback") */
	callbackPath?: string;

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
 * Success message from TreeViz popup
 * @internal
 */
export interface TreeVizAuthSuccessMessage {
	type: "TREEVIZ_AUTH_SUCCESS";
	token: string;
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
	pkceSessionId?: string; // PKCE session ID for token exchange
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
