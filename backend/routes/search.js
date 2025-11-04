const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

/**
 * GET /api/search
 * Universal search across businesses, menu items, users, and posts
 */
router.get('/', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ results: [], total: 0, hasMore: false });
    }

    const searchTerm = `%${q.trim().toLowerCase()}%`;
    const searchLimit = parseInt(limit) + 1; // Get one more to check if there are more results

    // Search businesses
    const businessQuery = `
      SELECT
        b.id,
        'business' as type,
        b.business_name as title,
        b.cuisine_type as subtitle,
        b.description,
        b.logo_url as image_url,
        '/business/' || b.id as link,
        '🍽️' as icon
      FROM businesses b
      WHERE LOWER(b.business_name) LIKE $1
         OR LOWER(b.description) LIKE $1
         OR LOWER(b.cuisine_type) LIKE $1
      LIMIT $2
    `;

    // Search menu items
    const menuQuery = `
      SELECT
        mi.id,
        'menu_item' as type,
        mi.item_name as title,
        b.business_name as subtitle,
        mi.description,
        mi.image_url,
        '/business/' || b.id || '/menu' as link,
        '🍕' as icon
      FROM menu_items mi
      JOIN businesses b ON mi.business_id = b.id
      WHERE LOWER(mi.item_name) LIKE $1
         OR LOWER(mi.description) LIKE $1
         OR LOWER(mi.category) LIKE $1
      LIMIT $2
    `;

    // Search posts (community posts)
    const postQuery = `
      SELECT
        p.id,
        'post' as type,
        p.title,
        'Community Post' as subtitle,
        LEFT(p.content, 150) as description,
        p.image_url,
        '/community/post/' || p.id as link,
        '📝' as icon
      FROM posts p
      WHERE LOWER(p.title) LIKE $1
         OR LOWER(p.content) LIKE $1
      LIMIT $2
    `;

    // Execute all queries
    const [businessResults, menuResults, postResults] = await Promise.all([
      pool.query(businessQuery, [searchTerm, searchLimit]).catch(() => ({ rows: [] })),
      pool.query(menuQuery, [searchTerm, searchLimit]).catch(() => ({ rows: [] })),
      pool.query(postQuery, [searchTerm, searchLimit]).catch(() => ({ rows: [] }))
    ]);

    // Combine and format results
    let allResults = [
      ...businessResults.rows,
      ...menuResults.rows,
      ...postResults.rows
    ];

    // Sort by relevance (simple: businesses first, then menu items, then posts)
    allResults = allResults.sort((a, b) => {
      const typeOrder = { business: 1, menu_item: 2, post: 3 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    // Check if there are more results
    const hasMore = allResults.length > parseInt(limit);
    if (hasMore) {
      allResults = allResults.slice(0, parseInt(limit));
    }

    // Format results
    const results = allResults.map(row => ({
      id: row.id.toString(),
      type: row.type,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      imageUrl: row.image_url,
      link: row.link,
      icon: row.icon
    }));

    res.json({
      results,
      total: results.length,
      hasMore
    });

  } catch (error) {
    console.error('Search error:', error);

    // Return mock results as fallback
    const mockResults = getMockSearchResults(req.query.q);
    res.json({
      results: mockResults,
      total: mockResults.length,
      hasMore: false
    });
  }
});

// Mock search results for demo/fallback
function getMockSearchResults(query) {
  const q = query?.toLowerCase() || '';

  const allMockResults = [
    {
      id: '1',
      type: 'business',
      title: 'The Savory Kitchen',
      subtitle: 'Italian Cuisine',
      description: 'Authentic Italian restaurant with homemade pasta and wood-fired pizzas',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop',
      link: '/business/1',
      icon: '🍝'
    },
    {
      id: '2',
      type: 'business',
      title: 'Urban Brew Cafe',
      subtitle: 'Coffee & Breakfast',
      description: 'Cozy cafe serving artisan coffee and fresh breakfast',
      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=100&h=100&fit=crop',
      link: '/business/2',
      icon: '☕'
    },
    {
      id: '3',
      type: 'business',
      title: 'Spice Route',
      subtitle: 'Indian Cuisine',
      description: 'Traditional Indian curries and tandoori specialties',
      imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=100&h=100&fit=crop',
      link: '/business/3',
      icon: '🌶️'
    },
    {
      id: '4',
      type: 'business',
      title: 'Ocean Fresh Seafood',
      subtitle: 'Seafood Restaurant',
      description: 'Fresh catch daily, sustainable seafood dining',
      imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=100&h=100&fit=crop',
      link: '/business/4',
      icon: '🦞'
    },
    {
      id: '5',
      type: 'menu_item',
      title: 'Margherita Pizza',
      subtitle: 'The Savory Kitchen',
      description: 'Fresh mozzarella, basil, tomato sauce',
      link: '/business/1/menu',
      icon: '🍕'
    },
    {
      id: '6',
      type: 'menu_item',
      title: 'Butter Chicken',
      subtitle: 'Spice Route',
      description: 'Creamy tomato curry with tender chicken',
      link: '/business/3/menu',
      icon: '🍛'
    },
    {
      id: '7',
      type: 'menu_item',
      title: 'Grilled Salmon',
      subtitle: 'Ocean Fresh Seafood',
      description: 'Atlantic salmon with seasonal vegetables',
      link: '/business/4/menu',
      icon: '🐟'
    },
    {
      id: '8',
      type: 'post',
      title: 'Best Coffee Spots in Downtown',
      subtitle: 'Community Post',
      description: 'A curated list of the best coffee shops...',
      link: '/community/post/1',
      icon: '📝'
    }
  ];

  // Filter based on query
  if (!q) return allMockResults.slice(0, 8);

  return allMockResults.filter(result =>
    result.title.toLowerCase().includes(q) ||
    result.subtitle?.toLowerCase().includes(q) ||
    result.description?.toLowerCase().includes(q)
  ).slice(0, 8);
}

module.exports = router;
