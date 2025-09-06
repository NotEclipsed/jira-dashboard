/**
 * User Management Service
 * Handles local user authentication and Azure AD/Entra ID integration
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class UserService {
  constructor() {
    this.usersFile = path.join(__dirname, '..', 'data', 'users.json');
    this.users = new Map();
    this.initializeUsers();
  }

  /**
   * Initialize users from file or create default admin
   */
  async initializeUsers() {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.usersFile), { recursive: true });
      
      // Try to load existing users
      try {
        const userData = await fs.readFile(this.usersFile, 'utf-8');
        const usersArray = JSON.parse(userData);
        
        for (const user of usersArray) {
          this.users.set(user.id, user);
        }
        
        console.log(`Loaded ${usersArray.length} users from storage`);
      } catch (error) {
        // File doesn't exist, create default admin
        await this.createDefaultAdmin();
      }
    } catch (error) {
      console.error('Failed to initialize users:', error);
      await this.createDefaultAdmin();
    }
  }

  /**
   * Create default admin user
   */
  async createDefaultAdmin() {
    const defaultUser = {
      id: crypto.randomUUID(),
      username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@localhost',
      password: await this.hashPassword(process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!'),
      role: 'admin',
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null,
      preferences: {
        sessionTimeout: 900000, // 15 minutes
        theme: 'light'
      }
    };

    this.users.set(defaultUser.id, defaultUser);
    await this.saveUsers();
    
    console.log('✅ Default admin user created');
    console.log(`   Username: ${defaultUser.username}`);
    console.log(`   Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!'}`);
    console.log('   ⚠️  Please change the password on first login!');
  }

  /**
   * Authenticate user with username/password
   */
  async authenticateUser(username, password) {
    try {
      // Find user by username or email
      const user = Array.from(this.users.values()).find(u => 
        u.username === username || u.email === username
      );

      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        return { success: false, error: 'Account temporarily locked' };
      }

      // Check if account is active
      if (!user.isActive) {
        return { success: false, error: 'Account is disabled' };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        await this.handleFailedLogin(user.id);
        return { success: false, error: 'Invalid credentials' };
      }

      // Successful login - reset failed attempts and update last login
      await this.handleSuccessfulLogin(user.id);
      
      // Return user info (without password)
      const { password: _, ...userInfo } = user;
      return { 
        success: true, 
        user: userInfo,
        mustChangePassword: user.mustChangePassword
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.error };
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);
      
      // Update user
      user.password = hashedPassword;
      user.mustChangePassword = false;
      user.updatedAt = new Date().toISOString();
      
      await this.saveUsers();
      
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updates) {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Validate and apply updates
      const allowedUpdates = ['email', 'preferences'];
      const validUpdates = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          if (key === 'email' && !this.isValidEmail(value)) {
            return { success: false, error: 'Invalid email format' };
          }
          validUpdates[key] = value;
        }
      }

      Object.assign(user, validUpdates);
      user.updatedAt = new Date().toISOString();
      
      await this.saveUsers();
      
      const { password: _, ...userInfo } = user;
      return { success: true, user: userInfo };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  /**
   * Get user by ID
   */
  getUserById(userId) {
    const user = this.users.get(userId);
    if (user) {
      const { password: _, ...userInfo } = user;
      return userInfo;
    }
    return null;
  }

  /**
   * Create new user (admin only)
   */
  async createUser(userData) {
    try {
      // Validate required fields
      const { username, email, password, role = 'user' } = userData;
      
      if (!username || !email || !password) {
        return { success: false, error: 'Username, email, and password are required' };
      }

      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(u => 
        u.username === username || u.email === email
      );

      if (existingUser) {
        return { success: false, error: 'Username or email already exists' };
      }

      // Validate password
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.error };
      }

      // Create user
      const newUser = {
        id: crypto.randomUUID(),
        username,
        email,
        password: await this.hashPassword(password),
        role,
        isActive: true,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        loginAttempts: 0,
        lockedUntil: null,
        preferences: {
          sessionTimeout: 900000,
          theme: 'light'
        }
      };

      this.users.set(newUser.id, newUser);
      await this.saveUsers();
      
      const { password: _, ...userInfo } = newUser;
      return { success: true, user: userInfo };
    } catch (error) {
      console.error('User creation error:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts for 15 minutes
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      
      await this.saveUsers();
    }
  }

  /**
   * Handle successful login
   */
  async handleSuccessfulLogin(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.loginAttempts = 0;
      user.lockedUntil = null;
      user.lastLogin = new Date().toISOString();
      await this.saveUsers();
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    return bcrypt.hash(password, 12); // High cost factor for security
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }

    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one special character (!@#$%^&*)' };
    }

    return { isValid: true };
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Save users to file
   */
  async saveUsers() {
    try {
      const usersArray = Array.from(this.users.values());
      await fs.writeFile(this.usersFile, JSON.stringify(usersArray, null, 2));
    } catch (error) {
      console.error('Failed to save users:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin only, without passwords)
   */
  getAllUsers() {
    return Array.from(this.users.values()).map(user => {
      const { password: _, ...userInfo } = user;
      return userInfo;
    });
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId) {
    const user = this.users.get(userId);
    if (user && user.role !== 'admin') { // Prevent deactivating admin
      user.isActive = false;
      user.updatedAt = new Date().toISOString();
      await this.saveUsers();
      return true;
    }
    return false;
  }

  /**
   * Activate user
   */
  async activateUser(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.isActive = true;
      user.loginAttempts = 0;
      user.lockedUntil = null;
      user.updatedAt = new Date().toISOString();
      await this.saveUsers();
      return true;
    }
    return false;
  }
}

// Export singleton instance
module.exports = new UserService();
