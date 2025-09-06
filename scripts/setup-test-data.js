#!/usr/bin/env node

/**
 * Automated Test Data Setup Script
 * Creates sample projects and tickets in your Jira Cloud instance
 */

const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

// Create axios instance for Jira API
const jiraApi = axios.create({
  baseURL: `${JIRA_BASE_URL}/rest/api/3`,
  auth: {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

async function main() {
  console.log('🚀 Starting Jira Test Data Setup...\n');

  try {
    // Test connection first
    console.log('🔗 Testing connection...');
    const userResponse = await jiraApi.get('/myself');
    console.log(`✅ Connected as: ${userResponse.data.displayName} (${userResponse.data.emailAddress})\n`);

    // Get available projects
    console.log('📋 Checking existing projects...');
    const projectsResponse = await jiraApi.get('/project');
    const projects = projectsResponse.data;
    
    console.log(`Found ${projects.length} existing projects:`);
    projects.forEach(project => {
      console.log(`  - ${project.name} (${project.key})`);
    });
    console.log('');

    // Use existing project or guide to create one
    if (projects.length === 0) {
      console.log('❌ No projects found!');
      console.log('Please create a project in Jira first:');
      console.log('1. Go to your Jira Cloud instance');
      console.log('2. Create a new project (Scrum or Kanban template)');
      console.log('3. Then run this script again');
      return;
    }

    const projectKey = projects[0].key;
    console.log(`🎯 Using project: ${projects[0].name} (${projectKey})\n`);

    // Create sample issues
    console.log('🎫 Creating sample tickets...\n');

    // Get project issue types first to avoid errors
    console.log('🔍 Checking available issue types...');
    const projectResponse = await jiraApi.get(`/project/${projectKey}`);
    const availableIssueTypes = projectResponse.data.issueTypes.map(type => type.name);
    
    console.log('Available issue types:', availableIssueTypes.join(', '));
    
    // Determine which issue types to use (prefer Task and Story)
    const useTaskType = availableIssueTypes.includes('Task');
    const useStoryType = availableIssueTypes.includes('Story');
    
    if (!useTaskType && !useStoryType) {
      console.log('⚠️  Neither Task nor Story issue types found. Using first available type:', availableIssueTypes[0]);
    }
    
    const defaultIssueType = useTaskType ? 'Task' : (useStoryType ? 'Story' : availableIssueTypes[0]);
    
    const sampleIssues = [
      {
        summary: 'User can view assigned tickets',
        description: 'As a user, I want to see all tickets assigned to me so that I can prioritize my work.',
        issueType: useStoryType ? 'Story' : defaultIssueType,
        assignee: userResponse.data.accountId
      },
      {
        summary: 'User can filter tickets by status',
        description: 'As a user, I want to filter tickets by status to focus on specific work states.',
        issueType: useStoryType ? 'Story' : defaultIssueType,
        assignee: userResponse.data.accountId
      },
      {
        summary: 'Dashboard loading performance improvement',
        description: 'Optimize the dashboard loading time to improve user experience.',
        issueType: useTaskType ? 'Task' : defaultIssueType,
        assignee: userResponse.data.accountId
      },
      {
        summary: 'Create user documentation',
        description: 'Write comprehensive user documentation for the dashboard features.',
        issueType: useTaskType ? 'Task' : defaultIssueType
        // No assignee - will be unassigned
      },
      {
        summary: 'Set up automated testing',
        description: 'Implement automated tests for critical dashboard functionality.',
        issueType: useTaskType ? 'Task' : defaultIssueType,
        assignee: userResponse.data.accountId
      },
      {
        summary: 'Dashboard mobile responsiveness',
        description: 'Ensure the dashboard works well on mobile devices and tablets.',
        issueType: useStoryType ? 'Story' : defaultIssueType,
        assignee: userResponse.data.accountId
      },
      {
        summary: 'Add search functionality',
        description: 'Allow users to search tickets by summary, description, or key.',
        issueType: useStoryType ? 'Story' : defaultIssueType,
        assignee: userResponse.data.accountId
      },
      {
        summary: 'Improve dashboard layout',
        description: 'Make the dashboard more intuitive and user-friendly.',
        issueType: useTaskType ? 'Task' : defaultIssueType
        // No assignee - will be unassigned  
      }
    ];

    const createdIssues = [];

    // Get available priorities to avoid errors
    console.log('🔍 Checking available priorities...');
    const prioritiesResponse = await jiraApi.get('/priority');
    const availablePriorities = prioritiesResponse.data.map(p => p.name);
    console.log('Available priorities:', availablePriorities.join(', '));
    
    // Use default priority if standard ones aren't available
    const getValidPriority = (preferredPriority) => {
      const standardPriorities = ['High', 'Medium', 'Low'];
      for (const priority of standardPriorities) {
        if (availablePriorities.includes(priority)) {
          return priority;
        }
      }
      return availablePriorities[0] || 'Medium'; // fallback
    };

    for (const issue of sampleIssues) {
      try {
        // Start with simplified approach since it works reliably
        const issueData = {
          fields: {
            project: { key: projectKey },
            summary: issue.summary,
            issuetype: { name: issue.issueType }
          }
        };
        
        // Add assignee if specified
        if (issue.assignee) {
          issueData.fields.assignee = { accountId: issue.assignee };
        }
        
        const response = await jiraApi.post('/issue', issueData);
        const createdIssue = response.data;
        createdIssues.push(createdIssue);
        
        console.log(`✅ Created: ${createdIssue.key} - ${issue.summary}`);
        
        // Try to add description as a comment after creation
        try {
          await jiraApi.post(`/issue/${createdIssue.key}/comment`, {
            body: {
              type: 'doc',
              version: 1,
              content: [{
                type: 'paragraph',
                content: [{
                  type: 'text',
                  text: issue.description
                }]
              }]
            }
          });
          console.log(`   💬 Added description as comment`);
        } catch (commentError) {
          // Ignore comment failures - not critical
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 700));
      } catch (error) {
        console.log(`❌ Failed to create: ${issue.summary}`);
        if (error.response?.data?.errors) {
          const errors = error.response.data.errors;
          Object.keys(errors).forEach(field => {
            console.log(`   ${field}: ${errors[field]}`);
          });
        } else {
          console.log(`   Error: ${error.message}`);
        }
      }
    }

    console.log(`\n🎉 Created ${createdIssues.length} out of ${sampleIssues.length} issues!\n`);

    // Move some issues to different statuses
    console.log('🔄 Updating some ticket statuses...\n');

    for (let i = 0; i < Math.min(3, createdIssues.length); i++) {
      try {
        const issueKey = createdIssues[i].key;
        
        // Get available transitions
        const transitionsResponse = await jiraApi.get(`/issue/${issueKey}/transitions`);
        const transitions = transitionsResponse.data.transitions;
        
        // Try to move to "In Progress" if available
        const inProgressTransition = transitions.find(t => 
          t.name.toLowerCase().includes('progress') || t.to.name.toLowerCase().includes('progress')
        );
        
        if (inProgressTransition) {
          await jiraApi.post(`/issue/${issueKey}/transitions`, {
            transition: { id: inProgressTransition.id }
          });
          console.log(`✅ Moved ${issueKey} to In Progress`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.log(`⚠️  Could not update status for ${createdIssues[i].key}`);
      }
    }

    // Add comments to some issues
    console.log('\n💬 Adding sample comments...\n');

    const sampleComments = [
      'This is a high priority item that needs attention.',
      'Blocked by external dependencies, investigating alternatives.',
      'Initial investigation completed, ready for development.',
      'Customer has requested this feature multiple times.',
      'Need to coordinate with the QA team before proceeding.'
    ];

    for (let i = 0; i < Math.min(3, createdIssues.length); i++) {
      try {
        const issueKey = createdIssues[i].key;
        const comment = sampleComments[i % sampleComments.length];
        
        await jiraApi.post(`/issue/${issueKey}/comment`, {
          body: {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text: comment
              }]
            }]
          }
        });
        
        console.log(`✅ Added comment to ${issueKey}`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.log(`⚠️  Could not add comment to ${createdIssues[i].key}`);
      }
    }

    console.log('\n🎉 Test data setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Project: ${projects[0].name} (${projectKey})`);
    console.log(`   • Issues created: ${createdIssues.length}`);
    console.log(`   • Issues assigned to you: ${createdIssues.length - 2}`);
    console.log(`   • Comments added: 3`);
    console.log(`   • Status updates: 3`);
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Start your backend: npm run dev (in backend folder)');
    console.log('   2. Start your frontend: npm start');
    console.log('   3. Open your browser to test the dashboard');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Authentication failed. Please check:');
      console.log('   • JIRA_BASE_URL is correct (no trailing slash)');
      console.log('   • JIRA_EMAIL matches your Atlassian account');
      console.log('   • JIRA_API_TOKEN is valid and not expired');
    } else if (error.response?.status === 403) {
      console.log('\n🚫 Permission denied. Please ensure:');
      console.log('   • Your user has permission to create issues');
      console.log('   • The project allows issue creation');
    }
  }
}

// Check if environment variables are set
if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ Missing required environment variables!');
  console.log('Please ensure the following are set in backend/.env:');
  console.log('   • JIRA_BASE_URL');
  console.log('   • JIRA_EMAIL');
  console.log('   • JIRA_API_TOKEN');
  process.exit(1);
}

main().catch(console.error);
