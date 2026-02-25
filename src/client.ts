import type {
	TreeVizAuthMessage,
	TreeVizAuthResult,
	TreeVizOAuthConfig,
} from "./types";
import { generateCodeVerifier, generateCodeChallenge } from "./pkce";
import {
	TREEVIZ_OAUTH_URLS,
	TREEVIZ_OAUTH_CALLBACK_PATH,
	DEFAULT_OAUTH_SCOPES,
} from "./constants";
import { exchangeCodeWithBackend } from "./api";

/**
 * TreeViz OAuth 2.0 Client
 *
 * Provides federated authentication with TreeViz accounts using OAuth 2.0 popup flow.
 * This client is framework-agnostic and doesn't depend on Firebase or any other library.
 *
 * Supports both PKCE (recommended for public clients) and client secret authentication.
 *
 * @example
 * ```typescript
 * // PKCE flow (recommended for SPAs)
 * const oauth = new TreeVizOAuth({
 *   environment: "production", // or "development"
 *   appId: "your-app-id",
 *   scopes: ["email", "profile"],
 *   exchangeTokenUrl: "https://your-api-url.com/api/exchangeTreeVizCode"
 * });
 *
 * const result = await oauth.signIn();
 * console.log("Authenticated:", result.uid);
 * ```
 */
export class TreeVizOAuth {
	private readonly appId: string;
	private readonly appSecret?: string;
	private readonly scopes: string[];
	private readonly popupWidth: number;
	private readonly popupHeight: number;
	private readonly usePKCE: boolean;
	private readonly exchangeTokenUrl?: string;
	private readonly environment: "production" | "development";

	constructor(config: TreeVizOAuthConfig) {
		// Validate required fields
		if (!config.appId) {
			throw new Error("TreeViz OAuth: appId is required");
		}

		// Default to PKCE for security
		const usePKCE = config.usePKCE !== false;

		// Validate appSecret if not using PKCE
		if (!usePKCE && !config.appSecret) {
			throw new Error(
				"TreeViz OAuth: appSecret is required when usePKCE is false"
			);
		}

		// Validate exchangeTokenUrl if using PKCE
		if (usePKCE && !config.exchangeTokenUrl) {
			throw new Error(
				"TreeViz OAuth: exchangeTokenUrl is required when using PKCE flow"
			);
		}

		// Set properties
		this.appId = config.appId;
		this.appSecret = config.appSecret;
		this.scopes = config.scopes || [...DEFAULT_OAUTH_SCOPES];
		this.popupWidth = config.popupWidth || 600;
		this.popupHeight = config.popupHeight || 700;
		this.usePKCE = usePKCE;
		this.exchangeTokenUrl = config.exchangeTokenUrl;
		this.environment = config.environment || "production";
	}

	/**
	 * Get the TreeViz auth URL based on environment
	 */
	private getAuthUrl(): string {
		return TREEVIZ_OAUTH_URLS[this.environment];
	}

	/**
	 * Sign in with TreeViz account
	 * Opens a popup window for user authentication
	 *
	 * @returns Promise resolving to authentication result with token and user info
	 * @throws Error if popup is blocked, authentication fails, or user cancels
	 */
	async signIn(): Promise<TreeVizAuthResult> {
		// Generate PKCE verifier/challenge before opening popup
		let codeVerifier: string | null = null;
		const authParams: Record<string, string> = {
			appId: this.appId,
			origin: window.location.origin,
			callbackUri: `${window.location.origin}/auth/callback`,
			scope: this.scopes.join(" "),
		};

		if (this.usePKCE) {
			codeVerifier = generateCodeVerifier();
			const codeChallenge = await generateCodeChallenge(codeVerifier);
			authParams.code_challenge = codeChallenge;
			authParams.code_challenge_method = "S256";

			// Store code verifier in sessionStorage (popup flow)
			sessionStorage.setItem("pkce_code_verifier", codeVerifier);
			sessionStorage.setItem("pkce_code_challenge", codeChallenge);

			// TODO: Implement redirect flow support
			// For redirect flow, we would need:
			// 1. Generate unique session ID: const sessionId = crypto.randomUUID();
			// 2. Store verifier: authParams.state = sessionId;
			// 3. Backend storage on TreeViz to store verifier with state
			// 4. Retrieve verifier from TreeViz backend in callback
			// Currently disabled - popup flow only

			console.log("[TreeViz OAuth] Using PKCE flow (popup only)");
		} else {
			authParams.appSecret = this.appSecret!;
			console.warn(
				"[TreeViz OAuth] Using client secret (not recommended for public clients)"
			);
		}

		return new Promise((resolve, reject) => {
			console.log("[TreeViz OAuth] Starting authentication flow");
			console.log("[TreeViz OAuth] Auth URL:", this.getAuthUrl());
			console.log(
				"[TreeViz OAuth] Callback Path:",
				TREEVIZ_OAUTH_CALLBACK_PATH
			);
			console.log("[TreeViz OAuth] App ID:", this.appId);
			console.log("[TreeViz OAuth] Scopes:", this.scopes.join(" "));

			const popupUrl = `${this.getAuthUrl()}${TREEVIZ_OAUTH_CALLBACK_PATH}?${new URLSearchParams(authParams).toString()}`;

			console.log("[TreeViz OAuth] Popup URL:", popupUrl);

			// Calculate popup position (centered on screen)
			const left = window.screen.width / 2 - this.popupWidth / 2;
			const top = window.screen.height / 2 - this.popupHeight / 2;

			// Open authentication popup
			const popup = window.open(
				popupUrl,
				"TreeViz Authentication",
				`width=${this.popupWidth},height=${this.popupHeight},left=${left},top=${top}`
			);

			if (!popup) {
				reject(
					new Error(
						"Popup blocked. Please allow popups for this site."
					)
				);
				return;
			}

			// Listen for messages from popup
			const messageHandler = async (
				event: MessageEvent<TreeVizAuthMessage>
			) => {
				// Ignore messages that don't have our expected structure
				if (!event.data || !event.data.type) {
					return;
				}

				// Only process TreeViz auth messages
				if (
					event.data.type !== "TREEVIZ_AUTH_SUCCESS" &&
					event.data.type !== "TREEVIZ_AUTH_ERROR"
				) {
					return;
				}

				console.log(
					"[TreeViz OAuth] Received message:",
					event.data.type
				);

				if (event.data.type === "TREEVIZ_AUTH_SUCCESS") {
					console.log("[TreeViz OAuth] Authentication successful");
					window.removeEventListener("message", messageHandler);
					clearInterval(checkClosed);
					popup.close();

					try {
						// PKCE flow: exchange code for token
						if (this.usePKCE && event.data.code && codeVerifier) {
							console.log(
								"[TreeViz OAuth] Exchanging authorization code for token"
							);

							// Call backend function to exchange code using helper
							const result = await exchangeCodeWithBackend<{
								firebaseToken: string;
								user: {
									uid: string;
									treevizUid: string;
									email: string | null;
									displayName: string | null;
									photoURL: string | null;
								};
							}>(
								this.exchangeTokenUrl!,
								event.data.code,
								codeVerifier
							);

							console.log(
								"[TreeViz OAuth] Token exchange successful:",
								result.user.uid
							);

							resolve({
								token: result.firebaseToken,
								uid: result.user.uid,
								email: result.user.email,
								displayName: result.user.displayName,
								photoURL: result.user.photoURL,
							});
						} else if (
							!this.usePKCE &&
							event.data.token &&
							event.data.uid
						) {
							// Legacy flow: direct token (deprecated)
							console.warn(
								"[TreeViz OAuth] Using deprecated direct token flow"
							);
							resolve({
								token: event.data.token,
								uid: event.data.uid,
								email: event.data.email || null,
								displayName: event.data.displayName || null,
								photoURL: event.data.photoURL || null,
							});
						} else {
							throw new Error("Invalid authentication response");
						}
					} catch (error) {
						console.error(
							"[TreeViz OAuth] Token exchange error:",
							error
						);
						reject(
							error instanceof Error
								? error
								: new Error("Token exchange failed")
						);
					}
				} else if (event.data.type === "TREEVIZ_AUTH_ERROR") {
					console.error(
						"[TreeViz OAuth] Authentication failed:",
						event.data.error
					);
					window.removeEventListener("message", messageHandler);
					clearInterval(checkClosed);
					popup.close();
					reject(
						new Error(
							event.data.error || "TreeViz authentication failed"
						)
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
					reject(new Error("authError.authenticationCancelled"));
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
			environment: this.environment,
			appId: this.appId,
			scopes: this.scopes,
			popupWidth: this.popupWidth,
			popupHeight: this.popupHeight,
			usePKCE: this.usePKCE,
			exchangeTokenUrl: this.exchangeTokenUrl || "",
		};
	}
}
