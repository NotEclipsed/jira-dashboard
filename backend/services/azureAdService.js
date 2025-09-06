/**
 * Azure AD/Entra ID Integration Service
 * Handles SSO authentication and user provisioning
 */

const passport = require('passport');
const { BearerStrategy } = require('passport-azure-ad');
const userService = require('./userService');
const AuditLogger = require('../middleware/auditLogger');

class AzureAdService {
  constructor() {
    this.auditLogger = new AuditLogger();
    this.isEnabled = process.env.AZURE_AD_ENABLED === 'true';
    
    if (this.isEnabled) {
      this.initializePassport();
    }
  }

  /**
   * Initialize Passport with Azure AD strategy
   */
  initializePassport() {
    const options = {
      identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid_configuration`,
      clientID: process.env.AZURE_AD_CLIENT_ID,
      validateIssuer: true,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      passReqToCallback: true,
      scope: ['profile', 'email', 'openid'],
      loggingLevel: 'info'
    };

    passport.use('azure-ad', new BearerStrategy(options, async (req, token, done) => {
      try {
        // Extract user information from Azure AD token
        const azureUser = {
          azureId: token.oid,
          email: token.preferred_username || token.email,
          displayName: token.name,
          givenName: token.given_name,
          familyName: token.family_name,
          tenantId: token.tid
        };

        // Find or create local user
        const localUser = await this.findOrCreateUser(azureUser, req);
        
        if (!localUser) {
          return done(new Error('User provisioning failed'), null);
        }

        return done(null, localUser);
      } catch (error) {
        console.error('Azure AD authentication error:', error);
        return done(error, null);
      }
    }));

    console.log('✅ Azure AD/Entra ID authentication configured');
  }

  /**
   * Find existing user or create new one from Azure AD info
   */
  async findOrCreateUser(azureUser, req) {
    try {
      // Try to find existing user by email
      const existingUsers = userService.getAllUsers();
      let localUser = existingUsers.find(user => 
        user.email.toLowerCase() === azureUser.email.toLowerCase() ||
        user.azureId === azureUser.azureId
      );

      if (localUser) {
        // Update Azure ID if not set
        if (!localUser.azureId) {
          await this.updateUserAzureId(localUser.id, azureUser.azureId);
        }
        
        // Update last login
        await userService.handleSuccessfulLogin(localUser.id);
        
        this.auditLogger.logAuthentication(req, 'AZURE_AD_LOGIN', 'SUCCESS', localUser.id, {
          azureId: azureUser.azureId,
          email: azureUser.email,
          displayName: azureUser.displayName
        });

        return localUser;
      }

      // Auto-provision new user if enabled
      if (this.shouldAutoProvision(azureUser)) {
        localUser = await this.createUserFromAzureAd(azureUser);
        
        if (localUser) {
          this.auditLogger.logAuthentication(req, 'AZURE_AD_USER_PROVISIONED', 'SUCCESS', localUser.id, {
            azureId: azureUser.azureId,
            email: azureUser.email,
            displayName: azureUser.displayName
          });
        }
        
        return localUser;
      }

      // User not found and auto-provisioning not enabled
      this.auditLogger.logAuthentication(req, 'AZURE_AD_LOGIN', 'USER_NOT_PROVISIONED', null, {
        azureId: azureUser.azureId,
        email: azureUser.email
      });

      return null;
    } catch (error) {
      console.error('Find or create user error:', error);
      throw error;
    }
  }

  /**
   * Create local user from Azure AD information
   */
  async createUserFromAzureAd(azureUser) {
    try {
      // Generate username from email
      const username = azureUser.email.split('@')[0];
      
      const userData = {
        username,
        email: azureUser.email,
        password: this.generateSecurePassword(), // Random password for Azure AD users
        role: this.determineUserRole(azureUser),
        azureId: azureUser.azureId,
        displayName: azureUser.displayName,
        authProvider: 'azure-ad',
        mustChangePassword: false // Azure AD users don't need to change password
      };

      const result = await userService.createUser(userData);
      return result.success ? result.user : null;
    } catch (error) {
      console.error('Azure AD user creation error:', error);
      return null;
    }
  }

  /**
   * Determine if user should be auto-provisioned
   */
  shouldAutoProvision(azureUser) {
    // Check if auto-provisioning is enabled
    const autoProvision = process.env.AZURE_AD_AUTO_PROVISION === 'true';
    
    if (!autoProvision) {
      return false;
    }

    // Check domain whitelist if configured
    const allowedDomains = process.env.AZURE_AD_ALLOWED_DOMAINS;
    if (allowedDomains) {
      const domains = allowedDomains.split(',').map(d => d.trim().toLowerCase());
      const userDomain = azureUser.email.split('@')[1].toLowerCase();
      
      if (!domains.includes(userDomain)) {
        console.log(`User domain ${userDomain} not in allowed domains: ${domains.join(', ')}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Determine user role based on Azure AD information
   */
  determineUserRole(azureUser) {
    // Check if user is in admin groups (if configured)
    const adminGroups = process.env.AZURE_AD_ADMIN_GROUPS;
    if (adminGroups && azureUser.groups) {
      const adminGroupIds = adminGroups.split(',').map(g => g.trim());
      const hasAdminGroup = azureUser.groups.some(group => 
        adminGroupIds.includes(group)
      );
      
      if (hasAdminGroup) {
        return 'admin';
      }
    }

    // Check admin emails
    const adminEmails = process.env.AZURE_AD_ADMIN_EMAILS;
    if (adminEmails) {
      const adminEmailList = adminEmails.split(',').map(e => e.trim().toLowerCase());
      if (adminEmailList.includes(azureUser.email.toLowerCase())) {
        return 'admin';
      }
    }

    return 'user';
  }

  /**
   * Generate secure random password for Azure AD users
   */
  generateSecurePassword() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Update user's Azure ID
   */
  async updateUserAzureId(userId, azureId) {
    // This would need to be implemented in userService
    // For now, just log the update
    console.log(`TODO: Update user ${userId} with Azure ID ${azureId}`);
  }

  /**
   * Get Azure AD authentication URL
   */
  getAuthUrl() {
    if (!this.isEnabled) {
      throw new Error('Azure AD not enabled');
    }

    const tenantId = process.env.AZURE_AD_TENANT_ID;
    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.AZURE_AD_REDIRECT_URL);
    const scope = encodeURIComponent('openid profile email');
    
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
           `client_id=${clientId}&` +
           `response_type=code&` +
           `redirect_uri=${redirectUri}&` +
           `scope=${scope}&` +
           `response_mode=query`;
  }

  /**
   * Handle Azure AD callback
   */
  async handleCallback(code, req) {
    if (!this.isEnabled) {
      throw new Error('Azure AD not enabled');
    }

    try {
      // Exchange code for token
      const tokenResponse = await this.exchangeCodeForToken(code);
      
      if (!tokenResponse.access_token) {
        throw new Error('No access token received');
      }

      // Get user info from token
      const userInfo = await this.getUserInfoFromToken(tokenResponse.access_token);
      
      // Find or create local user
      const localUser = await this.findOrCreateUser(userInfo, req);
      
      return localUser;
    } catch (error) {
      console.error('Azure AD callback error:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    const axios = require('axios');
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.AZURE_AD_CLIENT_ID,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.AZURE_AD_REDIRECT_URL,
      scope: 'openid profile email'
    });

    const response = await axios.post(
      `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  }

  /**
   * Get user information from access token
   */
  async getUserInfoFromToken(accessToken) {
    const axios = require('axios');
    
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const userData = response.data;
    
    return {
      azureId: userData.id,
      email: userData.mail || userData.userPrincipalName,
      displayName: userData.displayName,
      givenName: userData.givenName,
      familyName: userData.surname
    };
  }

  /**
   * Check if Azure AD is configured
   */
  isConfigured() {
    return this.isEnabled && 
           process.env.AZURE_AD_TENANT_ID && 
           process.env.AZURE_AD_CLIENT_ID && 
           process.env.AZURE_AD_CLIENT_SECRET;
  }

  /**
   * Get configuration status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      configured: this.isConfigured(),
      tenantId: process.env.AZURE_AD_TENANT_ID ? 'Set' : 'Not set',
      clientId: process.env.AZURE_AD_CLIENT_ID ? 'Set' : 'Not set',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ? 'Set' : 'Not set',
      redirectUrl: process.env.AZURE_AD_REDIRECT_URL,
      autoProvision: process.env.AZURE_AD_AUTO_PROVISION === 'true'
    };
  }
}

module.exports = new AzureAdService();
