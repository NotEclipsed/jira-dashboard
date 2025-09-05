import axios from 'axios';

class JiraService {
  constructor() {
    this.baseURL = process.env.REACT_APP_JIRA_BASE_URL;
    this.email = process.env.REACT_APP_JIRA_EMAIL;
    this.apiToken = process.env.REACT_APP_JIRA_API_TOKEN;
    
    // Create axios instance with auth
    this.api = axios.create({
      baseURL: `${this.baseURL}/rest/api/3`,
      auth: {
        username: this.email,
        password: this.apiToken
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Get current user information
   */
  async getCurrentUser() {
    try {
      const response = await this.api.get('/myself');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Get tickets assigned to the user
   */
  async getAssignedTickets(userEmail) {
    try {
      const jql = `assignee = "${userEmail}" ORDER BY updated DESC`;
      const response = await this.api.get('/search', {
        params: {
          jql,
          maxResults: 100,
          fields: 'key,summary,description,status,priority,issuetype,assignee,reporter,created,updated,project'
        }
      });
      
      return response.data.issues.map(this.transformIssue);
    } catch (error) {
      throw new Error(`Failed to get assigned tickets: ${error.message}`);
    }
  }

  /**
   * Get tickets created by the user
   */
  async getCreatedTickets(userEmail) {
    try {
      const jql = `reporter = "${userEmail}" ORDER BY created DESC`;
      const response = await this.api.get('/search', {
        params: {
          jql,
          maxResults: 100,
          fields: 'key,summary,description,status,priority,issuetype,assignee,reporter,created,updated,project'
        }
      });
      
      return response.data.issues.map(this.transformIssue);
    } catch (error) {
      throw new Error(`Failed to get created tickets: ${error.message}`);
    }
  }

  /**
   * Get all projects accessible to the user
   */
  async getProjects() {
    try {
      const response = await this.api.get('/project');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get projects: ${error.message}`);
    }
  }

  /**
   * Transform raw Jira issue data into a more usable format
   */
  transformIssue = (issue) => {
    return {
      key: issue.key,
      id: issue.id,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: {
        name: issue.fields.status.name,
        category: issue.fields.status.statusCategory.name,
        color: issue.fields.status.statusCategory.colorName
      },
      priority: {
        name: issue.fields.priority?.name || 'None',
        level: this.getPriorityLevel(issue.fields.priority?.name)
      },
      issueType: {
        name: issue.fields.issuetype.name,
        icon: issue.fields.issuetype.iconUrl
      },
      assignee: issue.fields.assignee ? {
        displayName: issue.fields.assignee.displayName,
        emailAddress: issue.fields.assignee.emailAddress,
        avatar: issue.fields.assignee.avatarUrls['32x32']
      } : null,
      reporter: {
        displayName: issue.fields.reporter.displayName,
        emailAddress: issue.fields.reporter.emailAddress,
        avatar: issue.fields.reporter.avatarUrls['32x32']
      },
      project: {
        key: issue.fields.project.key,
        name: issue.fields.project.name,
        avatar: issue.fields.project.avatarUrls['32x32']
      },
      created: new Date(issue.fields.created),
      updated: new Date(issue.fields.updated),
      url: `${this.baseURL}/browse/${issue.key}`
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
      const response = await this.api.post(`/issue/${issueKey}/transitions`, {
        transition: { id: transitionId }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update ticket status: ${error.message}`);
    }
  }

  /**
   * Get available transitions for a ticket
   */
  async getAvailableTransitions(issueKey) {
    try {
      const response = await this.api.get(`/issue/${issueKey}/transitions`);
      return response.data.transitions;
    } catch (error) {
      throw new Error(`Failed to get transitions: ${error.message}`);
    }
  }

  /**
   * Add comment to ticket
   */
  async addComment(issueKey, comment) {
    try {
      const response = await this.api.post(`/issue/${issueKey}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment
                }
              ]
            }
          ]
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }
}

// Create and export a singleton instance
export const jiraService = new JiraService();
