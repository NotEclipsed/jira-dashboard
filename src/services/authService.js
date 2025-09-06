import axios from 'axios';

class AuthService {
  constructor() {
    this.backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    this.api = axios.create({
      baseURL: `${this.backendURL}/auth`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true, // Important for session cookies
      timeout: 10000
    });
  }

  /**
   * Login with username and password
   */
  async login(username, password) {
    try {
      const response = await this.api.post('/login', {
        username,
        password
      });

      if (response.data.success) {
        // Store user info in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return {
          success: true,
          user: response.data.user,
          mustChangePassword: response.data.user.mustChangePassword
        };
      }

      return {
        success: false,
        error: response.data.error || 'Login failed'
      };
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }

      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      await this.api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with cleanup even if server call fails
    } finally {
      // Always clear local storage
      localStorage.removeItem('user');
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async checkAuthStatus() {
    try {
      const response = await this.api.get('/session-status');
      return {
        authenticated: true,
        user: response.data.user
      };
    } catch (error) {
      // Clear stale user data if session is invalid
      localStorage.removeItem('user');
      return {
        authenticated: false,
        user: null
      };
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    try {
      const response = await this.api.get('/me');
      const user = response.data.user;
      
      // Update localStorage with fresh user data
      localStorage.setItem('user', JSON.stringify(user));
      
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Get current user error:', error);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('user');
        return {
          success: false,
          error: 'Authentication required',
          requiresLogin: true
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get user information'
      };
    }
  }

  /**
   * Get user from localStorage (for initial state)
   */
  getCachedUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error reading cached user:', error);
      localStorage.removeItem('user');
      return null;
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await this.api.post('/change-password', {
        currentPassword,
        newPassword
      });

      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Password change error:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to change password'
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    try {
      const response = await this.api.post('/update-profile', updates);

      if (response.data.success) {
        // Update cached user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      console.error('Profile update error:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update profile'
      };
    }
  }

  /**
   * Check if response indicates authentication failure
   */
  isAuthError(error) {
    return error.response?.status === 401 || 
           error.response?.data?.requiresLogin === true;
  }
}

// Create and export singleton instance
export const authService = new AuthService();
