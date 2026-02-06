/**
 * @treeviz/oauth - TreeViz OAuth 2.0 Client
 *
 * Framework-agnostic OAuth 2.0 client for authenticating users with TreeViz accounts.
 *
 * @packageDocumentation
 */

export { TreeVizOAuth } from "./client";
export type { TreeVizAuthResult, TreeVizOAuthConfig } from "./types";
export { generateCodeVerifier, generateCodeChallenge } from "./pkce";
export {
	TREEVIZ_OAUTH_URLS,
	TREEVIZ_OAUTH_CALLBACK_PATH,
	TREEVIZ_TOKEN_ENDPOINTS,
	TREEVIZ_AUTHORIZE_ENDPOINTS,
	DEFAULT_OAUTH_SCOPES,
} from "./constants";
export {
	TreeVizOAuthAPI,
	exchangeAuthorizationCode,
	generateAuthorizationCode,
	exchangeCodeWithBackend,
} from "./api";
export type {
	TreeVizOAuthAPIConfig,
	TokenExchangeRequest,
	TokenExchangeResponse,
	AuthorizationRequest,
	AuthorizationResponse,
} from "./api";
