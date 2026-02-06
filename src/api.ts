/**
 * TreeViz OAuth API Client
 * Helper functions and SDK for calling TreeViz OAuth endpoints
 */

import {
	TREEVIZ_TOKEN_ENDPOINTS,
	TREEVIZ_AUTHORIZE_ENDPOINTS,
} from "./constants";

/**
 * Token request parameters (from 3rd party app backend)
 */
export interface TokenExchangeRequest {
	appId: string;
	appSecret?: string; // Required for confidential clients
	code: string; // Authorization code from TreeViz
	codeVerifier: string; // PKCE code verifier
}

/**
 * Token response from TreeViz
 */
export interface TokenExchangeResponse {
	accessToken: string;
	tokenType: "Bearer";
	expiresIn: number; // Seconds
	user: {
		uid: string;
		email: string | null;
		displayName: string | null;
		photoURL: string | null;
	};
}

/**
 * Authorization request parameters
 */
export interface AuthorizationRequest {
	appId: string;
	uid: string;
	codeChallenge: string;
	codeChallengeMethod: "S256" | "plain";
}

/**
 * Authorization response from TreeViz
 */
export interface AuthorizationResponse {
	code: string; // Authorization code
	expiresIn: number; // Seconds until code expires
}

/**
 * TreeViz OAuth API SDK Configuration
 */
export interface TreeVizOAuthAPIConfig {
	/** Your TreeViz OAuth app ID */
	appId: string;
	/** Optional app secret for confidential clients */
	appSecret?: string;
	/** Environment (production or development) */
	environment?: "production" | "development";
}

/**
 * TreeViz OAuth API SDK
 * Simplified API for calling TreeViz OAuth endpoints from backend
 *
 * @example
 * ```typescript
 * const api = new TreeVizOAuthAPI({
 *   appId: "my-app-id",
 *   environment: "production"
 * });
 *
 * const result = await api.exchangeCode(code, codeVerifier);
 * ```
 */
export class TreeVizOAuthAPI {
	private appId: string;
	private appSecret?: string;
	private environment: "production" | "development";

	constructor(config: TreeVizOAuthAPIConfig) {
		this.appId = config.appId;
		this.appSecret = config.appSecret;
		this.environment = config.environment || "production";
	}

	/**
	 * Exchange authorization code for access token and user info
	 *
	 * @param code - Authorization code from TreeViz
	 * @param codeVerifier - PKCE code verifier
	 * @returns Token and user information
	 */
	async exchangeCode(
		code: string,
		codeVerifier: string
	): Promise<TokenExchangeResponse> {
		return exchangeAuthorizationCode(
			{
				appId: this.appId,
				appSecret: this.appSecret,
				code,
				codeVerifier,
			},
			this.environment
		);
	}

	/**
	 * Generate authorization code (typically called internally by TreeViz)
	 *
	 * @param uid - User ID
	 * @param codeChallenge - PKCE code challenge
	 * @param codeChallengeMethod - PKCE method (S256 or plain)
	 * @returns Authorization code
	 */
	async generateAuthCode(
		uid: string,
		codeChallenge: string,
		codeChallengeMethod: "S256" | "plain" = "S256"
	): Promise<AuthorizationResponse> {
		return generateAuthorizationCode(
			{
				appId: this.appId,
				uid,
				codeChallenge,
				codeChallengeMethod,
			},
			this.environment
		);
	}
}

/**
 * Exchange authorization code for access token
 * This should be called from your backend server
 *
 * @param params - Token exchange parameters
 * @param environment - Environment (production or development)
 * @returns Token and user information
 */
export async function exchangeAuthorizationCode(
	params: TokenExchangeRequest,
	environment: "production" | "development" = "production"
): Promise<TokenExchangeResponse> {
	const endpoint = TREEVIZ_TOKEN_ENDPOINTS[environment];

	// Cloud Functions v2 expects { data: {...} } wrapper
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			data: params,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`TreeViz token exchange failed (${response.status}): ${errorText}`
		);
	}

	const result = await response.json();

	// Cloud Functions v2 returns { result: {...} } wrapper
	if (!result.result) {
		throw new Error("Invalid response from TreeViz token endpoint");
	}

	return result.result;
}

/**
 * Generate authorization code (called by TreeViz frontend after user login)
 * This is typically called internally by TreeViz, not by 3rd party apps
 *
 * @param params - Authorization parameters
 * @param environment - Environment (production or development)
 * @returns Authorization code
 */
export async function generateAuthorizationCode(
	params: AuthorizationRequest,
	environment: "production" | "development" = "production"
): Promise<AuthorizationResponse> {
	const endpoint = TREEVIZ_AUTHORIZE_ENDPOINTS[environment];

	// Cloud Functions v2 expects { data: {...} } wrapper
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			data: params,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`TreeViz authorization failed (${response.status}): ${errorText}`
		);
	}

	const result = await response.json();

	// Cloud Functions v2 returns { result: {...} } wrapper
	if (!result.result) {
		throw new Error("Invalid response from TreeViz authorize endpoint");
	}

	return result.result;
}

/**
 * Exchange authorization code with your app's backend
 * This is called from the frontend after receiving authorization code from TreeViz
 * Your backend should call TreeViz OAuth API to validate the code
 *
 * @param exchangeUrl - Your backend token exchange endpoint URL
 * @param code - Authorization code from TreeViz
 * @param codeVerifier - PKCE code verifier
 * @returns Your app's authentication result (typically a Firebase custom token)
 */
export async function exchangeCodeWithBackend<T = any>(
	exchangeUrl: string,
	code: string,
	codeVerifier: string
): Promise<T> {
	// Call your backend function (Cloud Functions v2 format)
	const response = await fetch(exchangeUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			data: {
				code,
				codeVerifier,
			},
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`Backend token exchange failed (${response.status}): ${errorText}`
		);
	}

	const result = await response.json();

	// Cloud Functions v2 returns { result: {...} } wrapper
	if (!result.result) {
		throw new Error("Invalid response from backend exchange endpoint");
	}

	return result.result;
}
