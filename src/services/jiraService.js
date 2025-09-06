import axios from 'axios';
import { authService } from './authService';

class JiraService {
  constructor() {
    // Use secure backend proxy instead of direct Jira API calls
    this.backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    
    // Create axios instance for backend API calls
    this.api = axios.create({
      baseURL: `${this.backendURL}/api/jira`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true, // Important for session cookies
      timeout: 30000 // 30 second timeout
    });

    // Add response interceptor to handle authentication errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (authService.isAuthError(error)) {
          // Clear cached user data
          localStorage.removeItem('user');
          // Let the calling component handle the auth error
          const authError = new Error('Authentication required');
          authError.requiresLogin = true;
          authError.originalError = error;
          throw authError;
        }
        throw error;
      }
    );
  }

  /**
   * Get current user information
   */
  async getCurrentUser() {
    try {
      const response = await this.api.get('/user');
      return response.data;
    } catch (error) {
      console.error('Failed to get user info:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get tickets assigned to the user
   */
  async getAssignedTickets(userEmail) {
    try {
      const response = await this.api.get('/tickets/assigned', {
        params: {
          maxResults: 100
        }
      });
      
      return response.data.issues.map(this.transformIssue);
    } catch (error) {
      console.error('Failed to get assigned tickets:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get tickets created by the user
   */
  async getCreatedTickets(userEmail) {
    try {
      const response = await this.api.get('/tickets/created', {
        params: {
          maxResults: 100
        }
      });
      
      return response.data.issues.map(this.transformIssue);
    } catch (error) {
      console.error('Failed to get created tickets:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get all projects accessible to the user
   */
  async getProjects() {
    try {
      const response = await this.api.get('/projects');
      return response.data;
    } catch (error) {
      console.error('Failed to get projects:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Transform raw Jira issue data into a more usable format
   */
  transformIssue = (issue) => {
    return {
      key: issue.key,
      id: issue.id,
      summary: issue.summary,
      description: issue.description,
      status: {
        name: issue.status.name,
        category: issue.status.category,
        color: issue.status.color
      },
      priority: {
        name: issue.priority.name,
        level: issue.priority.level
      },
      issueType: {
        name: issue.issueType.name,
        icon: issue.issueType.icon
      },
      assignee: issue.assignee,
      reporter: issue.reporter,
      project: {
        key: issue.project.key,
        name: issue.project.name,
        avatar: issue.project.avatar
      },
      created: new Date(issue.created),
      updated: new Date(issue.updated),
      url: issue.url
    };
  };

  /**
   * Get priority level for styling
   */
  getPriorityLevel = (priorityName) => {
    if (!priorityName) return 'low';
    
    const priority = priorityName.toLowerCase();
    if (priority.includes('highest') || priority.includes('critical')) return 'highest';
    if (priority.includes('high')) return 'high';
    if (priority.includes('medium')) return 'medium';
    if (priority.includes('low')) return 'low';
    if (priority.includes('lowest')) return 'lowest';
    return 'medium';
  };

  /**
   * Update ticket status
   */
  async updateTicketStatus(issueKey, transitionId) {
    try {
      const response = await this.api.post(`/tickets/${issueKey}/transition`, {
        transitionId: transitionId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get available transitions for a ticket
   */
  async getAvailableTransitions(issueKey) {
    try {
      const response = await this.api.get(`/tickets/${issueKey}/transitions`);
      return response.data.transitions;
    } catch (error) {
      console.error('Failed to get transitions:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Add comment to ticket (with validation)
   */
  async addComment(issueKey, comment) {
    try {
      // Basic client-side validation
      if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
        throw new Error('Comment cannot be empty');
      }
      
      if (comment.length > 2000) {
        throw new Error('Comment too long (max 2000 characters)');
      }
      
      const response = await this.api.post(`/tickets/${issueKey}/comment`, {
        comment: comment.trim()
      });
      return response.data;
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }
  
  /**
   * Extract user-friendly error messages from API responses
   */
  getErrorMessage(error) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again later.';
  }
}

// Create and export a singleton instance
export const jiraService = new JiraService();
