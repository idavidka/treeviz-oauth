import type {
	TreeVizAuthMessage,
	TreeVizAuthResult,
	TreeVizOAuthConfig,
} from "./types";

/**
 * TreeViz OAuth 2.0 Client
 *
 * Provides federated authentication with TreeViz accounts using OAuth 2.0 popup flow.
 * This client is framework-agnostic and doesn't depend on Firebase or any other library.
 *
 * @example
 * ```typescript
 * const oauth = new TreeVizOAuth({
 *   authUrl: "https://family-tree-a31ba.web.app",
 *   appId: "your-app-id",
 *   appSecret: "your-app-secret",
 *   scopes: ["email", "profile"]
 * });
 *
 * const result = await oauth.signIn();
 * console.log("Authenticated:", result.uid);
 * ```
 */
export class TreeVizOAuth {
	private readonly config: Required<TreeVizOAuthConfig>;

	constructor(config: TreeVizOAuthConfig) {
		// Validate required fields
		if (!config.authUrl) {
			throw new Error("TreeViz OAuth: authUrl is required");
		}
		if (!config.appId) {
			throw new Error("TreeViz OAuth: appId is required");
		}
		if (!config.appSecret) {
			throw new Error("TreeViz OAuth: appSecret is required");
		}

		// Set defaults
		this.config = {
			authUrl: config.authUrl.replace(/\/$/, ""), // Remove trailing slash
			appId: config.appId,
			appSecret: config.appSecret,
			scopes: config.scopes || ["email", "profile"],
			callbackPath: config.callbackPath || "/oauth/callback",
			popupWidth: config.popupWidth || 600,
			popupHeight: config.popupHeight || 700,
		};
	}

	/**
	 * Sign in with TreeViz account
	 * Opens a popup window for user authentication
	 *
	 * @returns Promise resolving to authentication result with token and user info
	 * @throws Error if popup is blocked, authentication fails, or user cancels
	 */
	async signIn(): Promise<TreeVizAuthResult> {
		return new Promise((resolve, reject) => {
			console.log("[TreeViz OAuth] Starting authentication flow");
			console.log("[TreeViz OAuth] Auth URL:", this.config.authUrl);
			console.log("[TreeViz OAuth] App ID:", this.config.appId);
			console.log("[TreeViz OAuth] Scopes:", this.config.scopes.join(" "));

			// Build callback URL - the popup will redirect here after auth
			const currentOrigin = window.location.origin;
			const callbackUrl = `${currentOrigin}/auth/callback`;

			// Build OAuth authorization URL with required parameters
			const authParams = new URLSearchParams({
				appId: this.config.appId,
				appSecret: this.config.appSecret,
				callbackUri: callbackUrl,
				scope: this.config.scopes.join(" "),
			});

			const popupUrl = `${this.config.authUrl}${this.config.callbackPath}?${authParams.toString()}`;

			console.log("[TreeViz OAuth] Popup URL:", popupUrl);
			console.log("[TreeViz OAuth] Callback URL:", callbackUrl);

			// Calculate popup position (centered on screen)
			const left = window.screen.width / 2 - this.config.popupWidth / 2;
			const top = window.screen.height / 2 - this.config.popupHeight / 2;

			// Open authentication popup
			const popup = window.open(
				popupUrl,
				"TreeViz Authentication",
				`width=${this.config.popupWidth},height=${this.config.popupHeight},left=${left},top=${top}`
			);

			if (!popup) {
				reject(new Error("Popup blocked. Please allow popups for this site."));
				return;
			}

			// Listen for messages from popup
			const messageHandler = (event: MessageEvent<TreeVizAuthMessage>) => {
				console.log("[TreeViz OAuth] Received message:", event.data.type);

				if (event.data.type === "TREEVIZ_AUTH_SUCCESS") {
					console.log("[TreeViz OAuth] Authentication successful");
					window.removeEventListener("message", messageHandler);
					popup.close();
					resolve({
						token: event.data.token,
						uid: event.data.uid,
						email: event.data.email,
						displayName: event.data.displayName,
						photoURL: event.data.photoURL,
					});
				} else if (event.data.type === "TREEVIZ_AUTH_ERROR") {
					console.error(
						"[TreeViz OAuth] Authentication failed:",
						event.data.error
					);
					window.removeEventListener("message", messageHandler);
					popup.close();
					reject(
						new Error(event.data.error || "TreeViz authentication failed")
					);
				}
			};

			window.addEventListener("message", messageHandler);

			// Check if popup was closed manually
			const checkClosed = setInterval(() => {
				if (popup.closed) {
					clearInterval(checkClosed);
					window.removeEventListener("message", messageHandler);
					console.log("[TreeViz OAuth] Popup closed by user");
					reject(new Error("Authentication cancelled"));
				}
			}, 1000);
		});
	}

	/**
	 * Get current configuration
	 * @returns Current OAuth configuration (without appSecret for security)
	 */
	getConfig(): Omit<Required<TreeVizOAuthConfig>, "appSecret"> {
		return {
			authUrl: this.config.authUrl,
			appId: this.config.appId,
			scopes: this.config.scopes,
			callbackPath: this.config.callbackPath,
			popupWidth: this.config.popupWidth,
			popupHeight: this.config.popupHeight,
		};
	}
}
