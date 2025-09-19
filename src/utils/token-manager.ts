// Use built-in fetch (Node 18+) or fallback to node-fetch
const fetch = globalThis.fetch || require('node-fetch');

export interface TokenInfo {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  token_type: string;
  expires_in?: number;
  issued_at: number;
  expires_at?: number;
  scope?: string;
}

export interface TokenIdentifier {
  instanceUrl: string;
  userId?: string;
  orgId?: string;
}

export class TokenManager {
  private tokens: Map<string, TokenInfo> = new Map();
  private refreshPromises: Map<string, Promise<TokenInfo | null>> = new Map();

  constructor() {
    // Optional: Load tokens from persistent storage on startup
    this.loadTokensFromStorage();
  }

  /**
   * Generate a unique key for token storage
   */
  private generateKey(identifier: TokenIdentifier): string {
    const { instanceUrl, userId, orgId } = identifier;
    
    // Normalize Lightning URLs to My Salesforce URLs for consistent keying
    let normalizedUrl = instanceUrl.replace(/\/+$/, '').toLowerCase();
    if (normalizedUrl.includes('lightning.force.com')) {
      normalizedUrl = normalizedUrl
        .replace('develop.lightning.force.com', 'develop.my.salesforce.com')
        .replace('lightning.force.com', 'my.salesforce.com');
    }
    
    return `${normalizedUrl}:${userId || orgId || 'default'}`;
  }

  /**
   * Store a new token
   */
  storeToken(identifier: TokenIdentifier, tokenInfo: TokenInfo): void {
    const key = this.generateKey(identifier);
    
    // Calculate expiration time
    const expiresAt = tokenInfo.expires_in 
      ? tokenInfo.issued_at + (tokenInfo.expires_in * 1000)
      : tokenInfo.issued_at + (2 * 60 * 60 * 1000); // Default 2 hours

    const enrichedToken: TokenInfo = {
      ...tokenInfo,
      expires_at: expiresAt
    };

    this.tokens.set(key, enrichedToken);
    console.log(`🔐 Token stored for ${key} (expires: ${new Date(expiresAt).toISOString()})`);
    
    // Optional: Persist to storage
    this.saveTokensToStorage();
  }

  /**
   * Get a valid access token (refresh if needed)
   */
  async getValidToken(identifier: TokenIdentifier): Promise<TokenInfo | null> {
    const key = this.generateKey(identifier);
    const token = this.tokens.get(key);

    if (!token) {
      console.log(`❌ No token found for ${key}`);
      return null;
    }

    // Check if token is still valid (with 5-minute buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    const expiresAt = token.expires_at || now + 3600000; // Default 1 hour if no expiry

    if (now < expiresAt - bufferTime) {
      console.log(`✅ Using cached token for ${key}`);
      return token;
    }

    // Token is expired or about to expire, try to refresh
    if (token.refresh_token) {
      console.log(`🔄 Token expired/expiring for ${key}, attempting refresh...`);
      return await this.refreshToken(identifier, token);
    } else {
      console.log(`❌ Token expired for ${key} and no refresh token available`);
      this.tokens.delete(key);
      return null;
    }
  }

  /**
   * Refresh an expired token using refresh token
   */
  private async refreshToken(identifier: TokenIdentifier, currentToken: TokenInfo): Promise<TokenInfo | null> {
    const key = this.generateKey(identifier);
    
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromises.has(key)) {
      console.log(`⏳ Refresh already in progress for ${key}, waiting...`);
      return await this.refreshPromises.get(key)!;
    }

    const refreshPromise = this.performTokenRefresh(identifier, currentToken);
    this.refreshPromises.set(key, refreshPromise);

    try {
      const newToken = await refreshPromise;
      return newToken;
    } finally {
      this.refreshPromises.delete(key);
    }
  }

  /**
   * Perform the actual token refresh operation
   */
  private async performTokenRefresh(identifier: TokenIdentifier, currentToken: TokenInfo): Promise<TokenInfo | null> {
    const key = this.generateKey(identifier);

    if (!currentToken.refresh_token) {
      console.log(`❌ No refresh token available for ${key}`);
      return null;
    }

    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.log(`❌ Missing client credentials for token refresh`);
      return null;
    }

    // Convert Lightning domain if needed
    let oauthInstanceUrl = identifier.instanceUrl;
    if (identifier.instanceUrl.includes('lightning.force.com')) {
      oauthInstanceUrl = identifier.instanceUrl
        .replace('develop.lightning.force.com', 'develop.my.salesforce.com')
        .replace('lightning.force.com', 'my.salesforce.com');
    }

    const tokenEndpoint = `${oauthInstanceUrl}/services/oauth2/token`;
    
    const refreshPayload = {
      grant_type: 'refresh_token',
      refresh_token: currentToken.refresh_token,
      client_id: clientId,
      client_secret: clientSecret
    };

    try {
      console.log(`🔄 Refreshing token at ${tokenEndpoint}`);
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Salesforce-MCP-TokenManager/1.0'
        },
        body: new URLSearchParams(refreshPayload)
      });

      if (!response.ok) {
        const error = await response.text();
        console.log(`❌ Token refresh failed for ${key}: ${response.status} - ${error}`);
        // Remove invalid token
        this.tokens.delete(key);
        return null;
      }

      const newTokenData = await response.json();
      
      // Create new token info
      const newToken: TokenInfo = {
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token || currentToken.refresh_token, // Keep old refresh token if not provided
        instance_url: newTokenData.instance_url || currentToken.instance_url,
        token_type: newTokenData.token_type || currentToken.token_type,
        expires_in: newTokenData.expires_in,
        issued_at: Date.now(),
        scope: newTokenData.scope || currentToken.scope
      };

      // Store the refreshed token
      this.storeToken(identifier, newToken);
      
      console.log(`✅ Token refreshed successfully for ${key}`);
      return newToken;

    } catch (error) {
      console.log(`❌ Error refreshing token for ${key}:`, error);
      // Remove problematic token
      this.tokens.delete(key);
      return null;
    }
  }

  /**
   * Exchange an auth code for tokens and store them
   */
  async exchangeAndStoreAuthCode(
    identifier: TokenIdentifier, 
    authCode: string, 
    redirectUri: string
  ): Promise<TokenInfo | null> {
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET are required');
    }

    // Convert Lightning domain if needed
    let oauthInstanceUrl = identifier.instanceUrl;
    if (identifier.instanceUrl.includes('lightning.force.com')) {
      oauthInstanceUrl = identifier.instanceUrl
        .replace('develop.lightning.force.com', 'develop.my.salesforce.com')
        .replace('lightning.force.com', 'my.salesforce.com');
    }

    const tokenEndpoint = `${oauthInstanceUrl}/services/oauth2/token`;
    
    const tokenPayload = {
      grant_type: 'authorization_code',
      code: authCode,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    };

    try {
      console.log(`🔄 Exchanging auth code for ${this.generateKey(identifier)}`);
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Salesforce-MCP-TokenManager/1.0'
        },
        body: new URLSearchParams(tokenPayload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OAuth token exchange failed: ${response.status} - ${error}`);
      }

      const tokenData = await response.json();
      
      const tokenInfo: TokenInfo = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        instance_url: tokenData.instance_url,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        issued_at: Date.now(),
        scope: tokenData.scope
      };

      // Update identifier with actual instance URL from response
      const updatedIdentifier = {
        ...identifier,
        instanceUrl: tokenData.instance_url
      };

      this.storeToken(updatedIdentifier, tokenInfo);
      
      console.log(`✅ Auth code exchanged and token stored for ${this.generateKey(updatedIdentifier)}`);
      return tokenInfo;

    } catch (error) {
      console.error(`❌ Error exchanging auth code:`, error);
      throw error;
    }
  }

  /**
   * Remove a token from storage
   */
  removeToken(identifier: TokenIdentifier): void {
    const key = this.generateKey(identifier);
    this.tokens.delete(key);
    console.log(`🗑️ Token removed for ${key}`);
    this.saveTokensToStorage();
  }

  /**
   * List all stored tokens (for debugging)
   */
  listTokens(): Array<{ key: string; expires_at?: number; has_refresh: boolean }> {
    const result: Array<{ key: string; expires_at?: number; has_refresh: boolean }> = [];
    
    for (const [key, token] of this.tokens.entries()) {
      result.push({
        key,
        expires_at: token.expires_at,
        has_refresh: !!token.refresh_token
      });
    }
    
    return result;
  }

  /**
   * Load tokens from persistent storage (implement as needed)
   */
  private loadTokensFromStorage(): void {
    // TODO: Implement persistent storage (Redis, file system, database, etc.)
    console.log('📂 Token storage loading (not implemented yet)');
  }

  /**
   * Save tokens to persistent storage (implement as needed)
   */
  private saveTokensToStorage(): void {
    // TODO: Implement persistent storage (Redis, file system, database, etc.)
    // console.log('💾 Token storage saving (not implemented yet)');
  }

  /**
   * Clear all tokens (useful for testing)
   */
  clearAll(): void {
    this.tokens.clear();
    this.refreshPromises.clear();
    console.log('🧹 All tokens cleared');
  }
}

// Global token manager instance
export const tokenManager = new TokenManager();
