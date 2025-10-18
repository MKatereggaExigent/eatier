const OpenAI = require('openai');
const pool = require('../config/database');
const ragService = require('./ragService');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class ChatService {
  /**
   * Get context-aware data based on the current page and user permissions
   */
  async getPageContext(userId, tenantId, pageContext) {
    const { pageName, pageUrl, pageData } = pageContext;
    let contextData = {};

    try {
      // Get user information and role
      const userResult = await pool.query(`
        SELECT u.id, u.first_name, u.last_name, u.email, r.name as role_name
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1 AND u.tenant_id = $2
        LIMIT 1
      `, [userId, tenantId]);

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        contextData.user = {
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
          role: user.role_name || 'user'
        };
      }

      // Get context based on page
      switch (pageName) {
        case 'admin-overview':
        case 'admin-dashboard':
          if (contextData.user?.role === 'itiyum') {
            contextData.stats = await this.getAdminStats(tenantId);
          }
          break;

        case 'admin-users':
          if (contextData.user?.role === 'itiyum') {
            contextData.recentUsers = await this.getRecentUsers(tenantId);
          }
          break;

        case 'admin-businesses':
          if (contextData.user?.role === 'itiyum') {
            contextData.businesses = await this.getBusinessesSummary(tenantId);
          }
          break;

        case 'admin-bookings':
          if (contextData.user?.role === 'itiyum') {
            contextData.bookings = await this.getBookingsSummary(tenantId);
          }
          break;

        case 'admin-ads':
          if (contextData.user?.role === 'itiyum') {
            contextData.ads = await this.getAdsSummary(tenantId);
          }
          break;

        case 'business-dashboard':
        case 'business-overview':
          if (contextData.user?.role === 'business') {
            contextData.businessStats = await this.getBusinessStats(userId, tenantId);
          }
          break;

        case 'bookings':
          contextData.userBookings = await this.getUserBookings(userId, tenantId);
          break;

        default:
          // Include any page-specific data passed from frontend
          if (pageData) {
            contextData.pageData = pageData;
          }
      }

      return contextData;
    } catch (error) {
      console.error('Error getting page context:', error);
      return contextData;
    }
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(tenantId) {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as total_users,
        (SELECT COUNT(*) FROM businesses WHERE tenant_id = $1) as total_businesses,
        (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1) as total_bookings,
        (SELECT COUNT(*) FROM ads WHERE tenant_id = $1) as total_ads
    `, [tenantId]);

    return stats.rows[0];
  }

  /**
   * Get recent users
   */
  async getRecentUsers(tenantId) {
    const users = await pool.query(`
      SELECT id, name, email, created_at
      FROM users
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [tenantId]);

    return users.rows;
  }

  /**
   * Get businesses summary
   */
  async getBusinessesSummary(tenantId) {
    const businesses = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN verified = true THEN 1 END) as verified,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active
      FROM businesses
      WHERE tenant_id = $1
    `, [tenantId]);

    return businesses.rows[0];
  }

  /**
   * Get bookings summary
   */
  async getBookingsSummary(tenantId) {
    const bookings = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM bookings
      WHERE tenant_id = $1
    `, [tenantId]);

    return bookings.rows[0];
  }

  /**
   * Get ads summary
   */
  async getAdsSummary(tenantId) {
    const ads = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        SUM(budget) as total_budget,
        SUM(spent) as total_spent
      FROM ads
      WHERE tenant_id = $1
    `, [tenantId]);

    return ads.rows[0];
  }

  /**
   * Get business stats for business owner
   */
  async getBusinessStats(userId, tenantId) {
    const stats = await pool.query(`
      SELECT
        b.id,
        b.name,
        b.business_type,
        (SELECT COUNT(*) FROM bookings WHERE business_id = b.id) as total_bookings
      FROM businesses b
      WHERE b.owner_id = $1 AND b.tenant_id = $2
      LIMIT 1
    `, [userId, tenantId]);

    return stats.rows[0];
  }

  /**
   * Get user bookings
   */
  async getUserBookings(userId, tenantId) {
    const bookings = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM bookings
      WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    return bookings.rows[0];
  }

  /**
   * Generate AI response using OpenAI with RAG
   */
  async generateResponse(userMessage, pageContext, contextData, userId, tenantId) {
    try {
      // Step 1: Get user permissions
      const permissions = await ragService.getUserPermissions(userId, tenantId);

      // Step 2: Analyze the user's question to determine relevant resources
      const analysis = await ragService.analyzeQuestion(userMessage);
      console.log('📊 Question Analysis:', JSON.stringify(analysis, null, 2));

      // Step 3: Retrieve relevant data from database based on analysis and permissions
      const relevantData = await ragService.retrieveRelevantData(userId, tenantId, analysis, permissions);
      console.log('📦 Retrieved Data:', Object.keys(relevantData).length > 0 ? Object.keys(relevantData) : 'No data retrieved');

      // Step 4: Format the retrieved data for context
      const databaseContext = ragService.formatDataForContext(relevantData);
      console.log('📝 Database Context Length:', databaseContext.length, 'characters');

      // Step 5: Build system message with page context
      const systemMessage = this.buildSystemMessage(pageContext, contextData, databaseContext);

      // Step 6: Get recent conversation history for context
      const conversationHistory = await this.getChatHistory(userId, tenantId, 10);

      // Step 7: Build messages array with conversation history
      const messages = [
        { role: 'system', content: systemMessage }
      ];

      // Add recent conversation history (last 10 messages)
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.is_ai ? 'assistant' : 'user',
          content: msg.message
        });
      });

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      // Step 8: Call OpenAI API with enhanced context and conversation history
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 800 // Increased to handle more detailed responses
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Build system message with context
   */
  buildSystemMessage(pageContext, contextData, databaseContext) {
    const { pageName, pageUrl } = pageContext;
    const userRole = contextData.user?.role || 'user';
    const userName = contextData.user?.name || 'User';

    let systemMessage = `You are a helpful AI assistant for the Itiyum platform, a global multi-tenant booking and business management system.

IMPORTANT: You have DIRECT ACCESS to the platform's database through the context provided below. When users ask questions about data (users, bookings, businesses, etc.), you MUST use the database information provided in the "RELEVANT DATA FROM DATABASE" section to answer accurately. DO NOT say you don't have access to data - you DO have access through the database context.

Current Context:
- User: ${userName}
- Role: ${userRole}
- Current Page: ${pageName}
- Page URL: ${pageUrl}

Your Capabilities:
- You can see and analyze real-time data from the database
- You can answer questions about users, businesses, bookings, menus, ads, and analytics
- You have access to the user's conversation history for follow-up questions
- You respect user permissions and only show data they have access to

${databaseContext || ''}

`;

    // Add role-specific context
    if (userRole === 'itiyum') {
      systemMessage += `You are assisting an Itiyum Admin who has full access to platform management.\n\n`;

      if (contextData.stats) {
        systemMessage += `Platform Statistics:
- Total Users: ${contextData.stats.total_users}
- Total Businesses: ${contextData.stats.total_businesses}
- Total Bookings: ${contextData.stats.total_bookings}
- Total Ads: ${contextData.stats.total_ads}

`;
      }

      if (contextData.businesses) {
        systemMessage += `Business Summary:
- Total: ${contextData.businesses.total}
- Verified: ${contextData.businesses.verified}
- Active: ${contextData.businesses.active}

`;
      }

      if (contextData.bookings) {
        systemMessage += `Bookings Summary:
- Total: ${contextData.bookings.total}
- Confirmed: ${contextData.bookings.confirmed}
- Pending: ${contextData.bookings.pending}
- Cancelled: ${contextData.bookings.cancelled}

`;
      }

      if (contextData.ads) {
        systemMessage += `Ads Summary:
- Total: ${contextData.ads.total}
- Active: ${contextData.ads.active}
- Total Budget: $${contextData.ads.total_budget || 0}
- Total Spent: $${contextData.ads.total_spent || 0}

`;
      }
    } else if (userRole === 'business') {
      systemMessage += `You are assisting a Business Owner.\n\n`;

      if (contextData.businessStats) {
        systemMessage += `Business Information:
- Business Name: ${contextData.businessStats.name}
- Business Type: ${contextData.businessStats.business_type}
- Total Bookings: ${contextData.businessStats.total_bookings}

`;
      }
    } else {
      if (contextData.userBookings) {
        systemMessage += `User Bookings:
- Total: ${contextData.userBookings.total}
- Confirmed: ${contextData.userBookings.confirmed}
- Pending: ${contextData.userBookings.pending}

`;
      }
    }

    systemMessage += `Instructions:
- Provide helpful, accurate answers based on the context provided
- If you don't have enough information, ask clarifying questions
- Be concise but informative
- Use a friendly, professional tone
- Never share sensitive information like passwords or API keys
- Respect the user's role and only discuss data they have access to
- If asked about features not in the context, explain what you know about the Itiyum platform in general

CRITICAL INSTRUCTIONS:
1. When answering questions about data (counts, lists, statistics), ALWAYS check the "RELEVANT DATA FROM DATABASE" section first
2. If database data is provided, use it to give specific, accurate answers with actual numbers and details
3. You can reference previous messages in the conversation to handle follow-up questions
4. If the user asks a follow-up question (like "what about bookings?" after asking about users), use the conversation history to understand the context
5. Be conversational and helpful - you're here to assist the user with real platform data

Answer the user's question based on the database context and conversation history provided above.`;

    return systemMessage;
  }

  /**
   * Save chat message to database
   */
  async saveChatMessage(userId, tenantId, message, isAI = false) {
    try {
      await pool.query(`
        INSERT INTO chat_history (tenant_id, user_id, message, is_ai, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [tenantId, userId, message, isAI]);
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  /**
   * Get chat history for user
   */
  async getChatHistory(userId, tenantId, limit = 20) {
    try {
      const result = await pool.query(`
        SELECT message, is_ai, created_at
        FROM chat_history
        WHERE user_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC
        LIMIT $3
      `, [userId, tenantId, limit]);

      return result.rows.reverse();
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }
}

module.exports = new ChatService();

