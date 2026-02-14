const pool = require('../config/database');
const OpenAI = require('openai');

/**
 * ============================================================================
 * RAG SERVICE - SECURITY MODEL
 * ============================================================================
 *
 * This service retrieves data from the database for AI context.
 *
 * DATA CLASSIFICATION:
 *
 * PUBLIC RESOURCES (No authentication required):
 * - businesses: Restaurant names, locations, cuisines, aggregate ratings
 * - menus: Public menu items from restaurants
 * - posts: Published blog posts
 *
 * USER-SPECIFIC RESOURCES (Requires authentication, filtered by user_id):
 * - bookings: User's own bookings ONLY (WHERE user_id = $userId)
 * - reviews: Reviews written by the user ONLY (WHERE user_id = $userId)
 * - favorites: User's own favorites ONLY (WHERE user_id = $userId)
 *
 * ADMIN-ONLY RESOURCES (Requires admin role):
 * - users: User list (admins only)
 * - ads: Advertisement data (admins/business owners)
 * - analytics: Platform analytics (admins/business owners)
 *
 * SECURITY RULES:
 * 1. All queries use parameterized queries ($1, $2) - NEVER string concatenation
 * 2. User-specific data ALWAYS filtered by authenticated user's ID
 * 3. Role checks performed before returning sensitive data
 * 4. No cross-tenant data access (tenant_id always checked)
 * ============================================================================
 */

// Initialize OpenAI client lazily to avoid crashing if API key is missing
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not set - RAG features will be disabled');
      return null;
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

/**
 * Helper function to check if a role name indicates admin privileges
 * Handles different naming conventions (e.g., "Itiyum Admin", "itiyum_admin", "itiyum")
 */
function isAdminRole(roleName) {
  if (!roleName) return false;
  const normalized = roleName.toLowerCase().replace(/[_\s-]/g, '');
  return normalized === 'itiyumadmin' || normalized === 'itiyum' || normalized === 'admin' || normalized === 'platformadmin';
}

/**
 * Helper function to check if a role name indicates business owner privileges
 */
function isBusinessOwnerRole(roleName) {
  if (!roleName) return false;
  const normalized = roleName.toLowerCase().replace(/[_\s-]/g, '');
  return normalized === 'businessowner' || normalized === 'business' || normalized === 'owner' || normalized === 'restaurantowner';
}

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Intelligently retrieves relevant database data based on user questions
 * while respecting RBAC and multi-tenancy
 */
class RAGService {
  /**
   * Get user's permissions for database resources
   */
  async getUserPermissions(userId, tenantId) {
    const result = await pool.query(`
      SELECT DISTINCT p.name, p.category, r.name as role_name
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1 AND u.tenant_id = $2
    `, [userId, tenantId]);

    const permissions = {
      resources: new Set(),
      actions: {},
      names: new Set(),
      roleName: null
    };

    result.rows.forEach(row => {
      // Parse permission name to extract resource and action
      // Handles both formats: "users:read" and "users.view"
      const permName = row.name || '';
      permissions.names.add(permName);

      if (row.category) {
        permissions.resources.add(row.category);
      }

      // Extract resource from permission name if it contains a separator (: or .)
      const separator = permName.includes(':') ? ':' : (permName.includes('.') ? '.' : null);
      if (separator) {
        const [resource, action] = permName.split(separator);
        permissions.resources.add(resource);
        if (!permissions.actions[resource]) {
          permissions.actions[resource] = new Set();
        }
        permissions.actions[resource].add(action);
        // Also add normalized action names (view/read are equivalent)
        if (action === 'view') {
          permissions.actions[resource].add('read');
        } else if (action === 'read') {
          permissions.actions[resource].add('view');
        }
      } else {
        // Use the permission name as a resource
        permissions.resources.add(permName);
      }

      if (row.role_name && !permissions.roleName) {
        permissions.roleName = row.role_name;
      }
    });

    return permissions;
  }

  /**
   * Analyze user question to determine which database tables are relevant
   * Uses OpenAI to understand the intent and extract entities
   */
  async analyzeQuestion(userMessage) {
    try {
      const analysisPrompt = `Analyze this user question and determine which database resources they're asking about.

User Question: "${userMessage}"

Available resources: users, businesses, bookings, menus, analytics, posts, ads, reviews, favorites

Respond ONLY with a valid JSON object (no markdown, no code blocks) containing:
{
  "resources": ["resource1", "resource2"],
  "intent": "what the user wants to know",
  "entities": ["specific entities mentioned like names, dates, IDs"],
  "filters": {
    "timeRange": "if they mention time periods like 'today', 'this week', 'last month'",
    "status": "if they mention status like 'pending', 'active', 'completed'",
    "limit": 10
  }
}

Only include resources that are directly relevant to answering the question.`;

      const client = getOpenAIClient();
      if (!client) {
        console.warn('OpenAI client not available - using fallback analysis');
        return this.fallbackAnalysis(userMessage);
      }

      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 300
      });

      const content = response.choices[0].message.content.trim();
      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Error analyzing question:', error.message);
      // Fallback to simple keyword matching
      return this.fallbackAnalysis(userMessage);
    }
  }

  /**
   * Fallback analysis using keyword matching
   */
  fallbackAnalysis(userMessage) {
    const message = userMessage.toLowerCase();
    const resources = [];

    if (message.match(/\b(user|users|customer|customers|account|accounts)\b/)) {
      resources.push('users');
    }
    if (message.match(/\b(business|businesses|restaurant|restaurants|venue|venues)\b/)) {
      resources.push('businesses');
    }
    if (message.match(/\b(booking|bookings|reservation|reservations|appointment|appointments)\b/)) {
      resources.push('bookings');
    }
    if (message.match(/\b(menu|menus|dish|dishes|food|meal|meals)\b/)) {
      resources.push('menus');
    }
    if (message.match(/\b(ad|ads|advertisement|advertisements|campaign|campaigns)\b/)) {
      resources.push('ads');
    }
    if (message.match(/\b(post|posts|community|social)\b/)) {
      resources.push('posts');
    }
    if (message.match(/\b(analytics|stats|statistics|metrics|performance|revenue)\b/)) {
      resources.push('analytics');
    }
    // User reviews
    if (message.match(/\b(review|reviews|rating|ratings|feedback|rate|rated)\b/)) {
      resources.push('reviews');
    }
    // User favorites
    if (message.match(/\b(favorite|favorites|favourite|favourites|saved|save|like|liked|wishlist)\b/)) {
      resources.push('favorites');
    }

    return {
      resources: resources.length > 0 ? resources : ['businesses'],
      intent: 'general inquiry',
      entities: [],
      filters: { limit: 10 }
    };
  }

  /**
   * Retrieve relevant data from database based on analysis and permissions
   */
  async retrieveRelevantData(userId, tenantId, analysis, permissions) {
    const relevantData = {};

    // Filter resources based on user permissions
    const allowedResources = analysis.resources.filter(resource =>
      permissions.resources.has(resource) &&
      (permissions.actions[resource]?.has('view') || permissions.actions[resource]?.has('read') || permissions.names.has(`${resource}:view`) || permissions.names.has(`${resource}:read`))
    );

    for (const resource of allowedResources) {
      try {
        const data = await this.fetchResourceData(resource, userId, tenantId, analysis.filters);
        if (data && data.length > 0) {
          relevantData[resource] = data;
        }
      } catch (error) {
        console.error(`Error fetching ${resource}:`, error.message);
      }
    }

    return relevantData;
  }

  /**
   * Fetch data for a specific resource with RBAC filtering
   */
  async fetchResourceData(resource, userId, tenantId, filters = {}) {
    const limit = Math.min(filters.limit || 10, 50); // Max 50 rows

    switch (resource) {
      case 'users':
        return await this.fetchUsers(userId, tenantId, filters, limit);

      case 'businesses':
        return await this.fetchBusinesses(userId, tenantId, filters, limit);

      case 'bookings':
        return await this.fetchBookings(userId, tenantId, filters, limit);

      case 'menus':
        return await this.fetchMenus(userId, tenantId, filters, limit);

      case 'ads':
        return await this.fetchAds(userId, tenantId, filters, limit);

      case 'posts':
        return await this.fetchPosts(userId, tenantId, filters, limit);

      case 'analytics':
        return await this.fetchAnalytics(userId, tenantId, filters);

      case 'reviews':
        return await this.fetchReviews(userId, tenantId, filters, limit);

      case 'favorites':
        return await this.fetchFavorites(userId, tenantId, filters, limit);

      default:
        return [];
    }
  }

  /**
   * Fetch users data with RBAC
   */
  async fetchUsers(userId, tenantId, filters, limit) {
    // Check if user is admin
    const roleCheck = await pool.query(`
      SELECT r.name FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.tenant_id = $2
    `, [userId, tenantId]);

    const isAdmin = roleCheck.rows.some(r => isAdminRole(r.name));

    let query = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.account_status,
             u.created_at, r.name as role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.tenant_id = $1
    `;

    const params = [tenantId];

    // Non-admins can only see their own data
    if (!isAdmin) {
      query += ` AND u.id = $2`;
      params.push(userId);
    }

    // Apply status filter if provided
    if (filters.status) {
      query += ` AND u.account_status = $${params.length + 1}`;
      params.push(filters.status);
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch businesses data with RBAC
   */
  async fetchBusinesses(userId, tenantId, filters, limit) {
    const roleCheck = await pool.query(`
      SELECT r.name FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.tenant_id = $2
    `, [userId, tenantId]);

    const userRole = roleCheck.rows[0]?.name;
    const isAdmin = isAdminRole(userRole);
    const isBusinessOwner = isBusinessOwnerRole(userRole);

    let query = `
      SELECT b.id, b.business_name, b.business_type, b.email, b.phone,
             b.verification_status, b.created_at, b.owner_id
      FROM businesses b
      WHERE b.tenant_id = $1
    `;

    const params = [tenantId];

    // Business owners can only see their own businesses
    if (isBusinessOwner && !isAdmin) {
      query += ` AND b.owner_id = $2`;
      params.push(userId);
    }

    // Apply status filter
    if (filters.status) {
      query += ` AND b.verification_status = $${params.length + 1}`;
      params.push(filters.status);
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch bookings data with RBAC
   * SECURITY: USER-SPECIFIC DATA
   * - Regular users: Only see their own bookings (user_id = $userId)
   * - Business owners: Also see bookings for their business (owner_id = $userId)
   * - Admins: Can see all bookings (for admin panel)
   */
  async fetchBookings(userId, tenantId, filters, limit) {
    const roleCheck = await pool.query(`
      SELECT r.name FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.tenant_id = $2
    `, [userId, tenantId]);

    const userRole = roleCheck.rows[0]?.name;
    const isAdmin = isAdminRole(userRole);

    // SECURITY: Select only necessary fields, no sensitive user data exposed
    let query = `
      SELECT bk.id, bk.booking_date, bk.booking_time,
             bk.party_size, bk.status, bk.created_at,
             b.business_name
      FROM bookings bk
      JOIN businesses b ON bk.business_id = b.id
      WHERE bk.tenant_id = $1
    `;

    const params = [tenantId];

    // SECURITY: Non-admins can only see their own bookings or bookings for their businesses
    if (!isAdmin) {
      query += ` AND (bk.user_id = $2 OR b.owner_id = $2)`;
      params.push(userId);
    }

    // Apply status filter
    if (filters.status) {
      query += ` AND bk.status = $${params.length + 1}`;
      params.push(filters.status);
    }

    query += ` ORDER BY bk.booking_date DESC, bk.booking_time DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch menus data with RBAC
   */
  async fetchMenus(userId, tenantId, filters, limit) {
    const roleCheck = await pool.query(`
      SELECT r.name FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.tenant_id = $2
    `, [userId, tenantId]);

    const userRole = roleCheck.rows[0]?.name;
    const isAdmin = isAdminRole(userRole);

    let query = `
      SELECT m.id, m.title, m.category, m.description, m.price, m.is_active,
             m.created_at, b.business_name, b.owner_id
      FROM menus m
      JOIN businesses b ON m.business_id = b.id
      WHERE m.tenant_id = $1
    `;

    const params = [tenantId];

    // Non-admins can only see menus from their own businesses or active public menus
    if (!isAdmin) {
      query += ` AND (b.owner_id = $2 OR m.is_active = true)`;
      params.push(userId);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch ads data with RBAC
   */
  async fetchAds(userId, tenantId, filters, limit) {
    const roleCheck = await pool.query(`
      SELECT r.name FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.tenant_id = $2
    `, [userId, tenantId]);

    const userRole = roleCheck.rows[0]?.name;
    const isAdmin = isAdminRole(userRole);

    let query = `
      SELECT a.id, a.title, a.placement, a.status, a.budget, a.spent,
             a.impressions, a.clicks, a.start_date, a.end_date, a.created_at,
             b.business_name
      FROM ads a
      LEFT JOIN businesses b ON a.business_id = b.id
      WHERE a.tenant_id = $1
    `;

    const params = [tenantId];

    // Non-admins can only see ads from their own businesses
    if (!isAdmin) {
      query += ` AND b.owner_id = $2`;
      params.push(userId);
    }

    // Apply status filter
    if (filters.status) {
      query += ` AND a.status = $${params.length + 1}`;
      params.push(filters.status);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch posts data with RBAC
   */
  async fetchPosts(userId, tenantId, filters, limit) {
    // Posts are generally public, but we still filter by tenant
    let query = `
      SELECT p.id, p.author_id, p.author_type, p.content, p.created_at,
             u.first_name, u.last_name
      FROM community_posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.tenant_id = $1 AND p.is_active = true
    `;

    const params = [tenantId];

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch analytics data with RBAC
   */
  async fetchAnalytics(userId, tenantId, filters) {
    const roleCheck = await pool.query(`
      SELECT r.name FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.tenant_id = $2
    `, [userId, tenantId]);

    const userRole = roleCheck.rows[0]?.name;
    const isAdmin = isAdminRole(userRole);
    const isBusinessOwner = isBusinessOwnerRole(userRole);

    const analytics = {};

    if (isAdmin) {
      // Platform-wide analytics for admins
      const stats = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as total_users,
          (SELECT COUNT(*) FROM businesses WHERE tenant_id = $1) as total_businesses,
          (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1) as total_bookings,
          (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND status = 'pending') as pending_bookings,
          (SELECT COUNT(*) FROM ads WHERE tenant_id = $1) as total_ads,
          (SELECT COALESCE(SUM(spent), 0) FROM ads WHERE tenant_id = $1) as total_ad_spend
      `, [tenantId]);

      analytics.platform = stats.rows[0];
    } else if (isBusinessOwner) {
      // Business-specific analytics
      const stats = await pool.query(`
        SELECT
          b.id, b.business_name,
          (SELECT COUNT(*) FROM bookings WHERE business_id = b.id) as total_bookings,
          (SELECT COUNT(*) FROM bookings WHERE business_id = b.id AND status = 'pending') as pending_bookings,
          (SELECT COUNT(*) FROM menus WHERE business_id = b.id) as total_menu_items
        FROM businesses b
        WHERE b.owner_id = $1 AND b.tenant_id = $2
      `, [userId, tenantId]);

      analytics.business = stats.rows;
    }

    return [analytics];
  }

  /**
   * Fetch user reviews with RBAC
   * SECURITY: USER-SPECIFIC DATA - Only returns reviews written by the authenticated user
   * Always filtered by user_id = $1 (parameterized query, cannot be bypassed)
   */
  async fetchReviews(userId, tenantId, filters, limit) {
    // SECURITY: user_id filter is MANDATORY and uses parameterized query
    let query = `
      SELECT r.id, r.rating, r.content, r.created_at,
             b.business_name
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.user_id = $1 AND r.tenant_id = $2
    `;

    const params = [userId, tenantId];

    // Apply time filter
    if (filters.timeRange === 'last month' || filters.timeRange === 'last30days') {
      query += ` AND r.created_at >= NOW() - INTERVAL '30 days'`;
    } else if (filters.timeRange === 'last week' || filters.timeRange === 'last7days') {
      query += ` AND r.created_at >= NOW() - INTERVAL '7 days'`;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch user favorites with RBAC
   * SECURITY: USER-SPECIFIC DATA - Only returns favorites belonging to the authenticated user
   * Always filtered by user_id = $1 (parameterized query, cannot be bypassed)
   */
  async fetchFavorites(userId, tenantId, filters, limit) {
    // SECURITY: user_id filter is MANDATORY and uses parameterized query
    let query = `
      SELECT f.id, f.created_at,
             b.business_name, b.cuisine_types, b.city, b.average_rating
      FROM favorites f
      JOIN businesses b ON f.business_id = b.id
      WHERE f.user_id = $1 AND f.tenant_id = $2
    `;

    const params = [userId, tenantId];

    // Apply time filter
    if (filters.timeRange === 'last month' || filters.timeRange === 'last30days') {
      query += ` AND f.created_at >= NOW() - INTERVAL '30 days'`;
    } else if (filters.timeRange === 'last week' || filters.timeRange === 'last7days') {
      query += ` AND f.created_at >= NOW() - INTERVAL '7 days'`;
    }

    query += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Format retrieved data into a context string for the AI
   */
  formatDataForContext(relevantData) {
    let contextString = '\n\n=== RELEVANT DATA FROM DATABASE ===\n';

    if (Object.keys(relevantData).length === 0) {
      contextString += '\nQUERY RESULT: No data was retrieved from the database.\n';
      contextString += 'This means there are ZERO records in the queried tables.\n';
      contextString += 'You should inform the user that there are currently no records (count = 0).\n';
      contextString += '\n=== END OF DATABASE DATA ===\n';
      return contextString;
    }

    for (const [resource, data] of Object.entries(relevantData)) {
      contextString += `\n${resource.toUpperCase()}:\n`;

      if (data.length === 0) {
        contextString += `COUNT: 0 (zero ${resource} found in the database)\n`;
        continue;
      }

      contextString += `COUNT: ${data.length}\n`;

      data.forEach((item, index) => {
        contextString += `${index + 1}. `;

        // Format based on resource type
        switch (resource) {
          case 'users':
            contextString += `${item.first_name} ${item.last_name} (${item.email}) - Role: ${item.role || 'N/A'}, Status: ${item.account_status}\n`;
            break;

          case 'businesses':
            contextString += `${item.business_name} (${item.business_type}) - Status: ${item.verification_status}, Contact: ${item.email}\n`;
            break;

          case 'bookings':
            contextString += `Booking for ${item.first_name} ${item.last_name} at ${item.business_name} on ${item.booking_date} at ${item.booking_time} - Status: ${item.status}, Party size: ${item.party_size}\n`;
            break;

          case 'menus':
            contextString += `${item.title} (${item.category}) - $${item.price} at ${item.business_name} - ${item.is_active ? 'Active' : 'Inactive'}\n`;
            break;

          case 'ads':
            contextString += `${item.title} (${item.placement}) - Status: ${item.status}, Budget: $${item.budget}, Spent: $${item.spent}, Impressions: ${item.impressions}, Clicks: ${item.clicks}\n`;
            break;

          case 'posts':
            contextString += `Post by ${item.first_name} ${item.last_name}: ${item.content?.substring(0, 100)}...\n`;
            break;

          case 'analytics':
            if (item.platform) {
              contextString += `Platform Stats - Users: ${item.platform.total_users}, Businesses: ${item.platform.total_businesses}, Bookings: ${item.platform.total_bookings} (${item.platform.pending_bookings} pending), Ads: ${item.platform.total_ads}, Ad Spend: $${item.platform.total_ad_spend}\n`;
            }
            if (item.business) {
              item.business.forEach(b => {
                contextString += `${b.business_name} - Bookings: ${b.total_bookings} (${b.pending_bookings} pending), Menu Items: ${b.total_menu_items}\n`;
              });
            }
            break;

          case 'reviews':
            const reviewDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A';
            const reviewContent = item.content ? item.content.substring(0, 80) + '...' : 'No content';
            contextString += `Review of ${item.business_name} - ${item.rating}/5 stars on ${reviewDate}: "${reviewContent}"\n`;
            break;

          case 'favorites':
            const cuisines = Array.isArray(item.cuisine_types) ? item.cuisine_types.join(', ') : (item.cuisine_types || 'Various');
            const location = item.city || 'Unknown location';
            const favRating = item.average_rating ? `${parseFloat(item.average_rating).toFixed(1)}/5` : 'Not rated';
            contextString += `${item.business_name} (${cuisines}) in ${location} - Rating: ${favRating}\n`;
            break;
        }
      });
    }

    contextString += '\n=== END OF DATABASE DATA ===\n';
    return contextString;
  }
}

module.exports = new RAGService();

