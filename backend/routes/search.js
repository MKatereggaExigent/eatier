const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

/**
 * GET /api/search
 * Universal search across the entire website - businesses, menu items, users, posts, reviews, FAQs, bookings, ads, etc.
 */
router.get('/', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ results: [], total: 0, hasMore: false });
    }

    const searchTerm = `%${q.trim().toLowerCase()}%`;
    const searchLimit = parseInt(limit) + 1; // Get one more to check if there are more results

    // Search businesses (restaurants, cafes, etc.)
    const businessQuery = `
      SELECT
        b.id,
        'business' as type,
        b.business_name as title,
        b.cuisine_type as subtitle,
        b.description,
        b.logo_url as image_url,
        '/restaurants/' || b.id as link,
        '🍽️' as icon,
        1 as priority
      FROM businesses b
      WHERE (LOWER(b.business_name) LIKE $1
         OR LOWER(b.description) LIKE $1
         OR LOWER(b.cuisine_type) LIKE $1)
         AND b.status = 'active'
      LIMIT $2
    `;

    // Search menu items (dishes, drinks, etc.)
    const menuQuery = `
      SELECT
        mi.id,
        'menu_item' as type,
        mi.item_name as title,
        b.business_name as subtitle,
        mi.description,
        mi.image_url,
        '/restaurants/' || b.id as link,
        '🍕' as icon,
        2 as priority
      FROM menu_items mi
      JOIN businesses b ON mi.business_id = b.id
      WHERE (LOWER(mi.item_name) LIKE $1
         OR LOWER(mi.description) LIKE $1
         OR LOWER(mi.category) LIKE $1)
         AND mi.is_available = true
      LIMIT $2
    `;

    // Search community posts
    const postQuery = `
      SELECT
        cp.id,
        'post' as type,
        LEFT(cp.content, 100) as title,
        u.full_name || '''s post' as subtitle,
        LEFT(cp.content, 150) as description,
        CASE WHEN cp.images IS NOT NULL AND array_length(cp.images, 1) > 0
             THEN cp.images[1]
             ELSE NULL
        END as image_url,
        '/community' as link,
        '📝' as icon,
        3 as priority
      FROM community_posts cp
      JOIN users u ON cp.author_id = u.id
      WHERE LOWER(cp.content) LIKE $1
         AND cp.is_active = true
      LIMIT $2
    `;

    // Search reviews
    const reviewQuery = `
      SELECT
        r.id,
        'review' as type,
        b.business_name || ' Review' as title,
        u.full_name || ' - ' || r.overall_rating || '⭐' as subtitle,
        LEFT(r.review_text, 150) as description,
        NULL as image_url,
        '/restaurants/' || b.id as link,
        '⭐' as icon,
        4 as priority
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      JOIN users u ON r.user_id = u.id
      WHERE LOWER(r.review_text) LIKE $1
         AND r.status = 'published'
      LIMIT $2
    `;

    // Search FAQs
    const faqQuery = `
      SELECT
        f.id,
        'faq' as type,
        f.question as title,
        fc.name as subtitle,
        LEFT(f.answer, 150) as description,
        NULL as image_url,
        '/faqs' as link,
        '❓' as icon,
        5 as priority
      FROM faqs f
      JOIN faq_categories fc ON f.category_id = fc.id
      WHERE (LOWER(f.question) LIKE $1
         OR LOWER(f.answer) LIKE $1)
         AND f.is_active = true
      LIMIT $2
    `;

    // Search users (food enthusiasts, chefs, specialists)
    const userQuery = `
      SELECT
        u.id,
        'user' as type,
        u.full_name as title,
        CASE
          WHEN u.role = 'food_enthusiast' THEN 'Food Enthusiast'
          WHEN u.role = 'specialist' THEN 'Chef/Specialist'
          WHEN u.role = 'business_owner' THEN 'Business Owner'
          ELSE 'User'
        END as subtitle,
        up.bio as description,
        u.profile_picture_url as image_url,
        '/community' as link,
        '👤' as icon,
        6 as priority
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE (LOWER(u.full_name) LIKE $1
         OR LOWER(up.bio) LIKE $1)
         AND u.role IN ('food_enthusiast', 'specialist', 'business_owner')
      LIMIT $2
    `;

    // Search bookings (for logged-in users - will be filtered by user_id in future)
    const bookingQuery = `
      SELECT
        bk.id,
        'booking' as type,
        'Booking at ' || b.business_name as title,
        'Party of ' || bk.party_size || ' - ' || TO_CHAR(bk.booking_date, 'Mon DD, YYYY') as subtitle,
        bk.special_requests as description,
        b.logo_url as image_url,
        '/dashboard/user/bookings' as link,
        '📅' as icon,
        7 as priority
      FROM bookings bk
      JOIN businesses b ON bk.business_id = b.id
      WHERE (LOWER(b.business_name) LIKE $1
         OR LOWER(bk.special_requests) LIKE $1)
         AND bk.status IN ('confirmed', 'pending')
      LIMIT $2
    `;

    // Execute all queries in parallel
    const [businessResults, menuResults, postResults, reviewResults, faqResults, userResults, bookingResults] = await Promise.all([
      pool.query(businessQuery, [searchTerm, searchLimit]).catch(() => ({ rows: [] })),
      pool.query(menuQuery, [searchTerm, searchLimit]).catch(() => ({ rows: [] })),
      pool.query(postQuery, [searchTerm, searchLimit]).catch(() => ({ rows: [] })),
      pool.query(reviewQuery, [searchTerm, searchLimit]).catch(() => ({ rows: [] })),
      pool.query(faqQuery, [searchTerm, searchLimit]).catch(() => ({ rows: [] })),
      pool.query(userQuery, [searchTerm, searchLimit]).catch(() => ({ rows: [] })),
      pool.query(bookingQuery, [searchTerm, searchLimit]).catch(() => ({ rows: [] }))
    ]);

    // Combine and format results
    let allResults = [
      ...businessResults.rows,
      ...menuResults.rows,
      ...postResults.rows,
      ...reviewResults.rows,
      ...faqResults.rows,
      ...userResults.rows,
      ...bookingResults.rows
    ];

    // Sort by priority (businesses first, then menu items, posts, reviews, FAQs, users, bookings)
    allResults = allResults.sort((a, b) => {
      return a.priority - b.priority;
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
      link: '/restaurants/1',
      icon: '🍝'
    },
    {
      id: '2',
      type: 'business',
      title: 'Urban Brew Cafe',
      subtitle: 'Coffee & Breakfast',
      description: 'Cozy cafe serving artisan coffee and fresh breakfast',
      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=100&h=100&fit=crop',
      link: '/restaurants/2',
      icon: '☕'
    },
    {
      id: '3',
      type: 'business',
      title: 'Spice Route',
      subtitle: 'Indian Cuisine',
      description: 'Traditional Indian curries and tandoori specialties',
      imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=100&h=100&fit=crop',
      link: '/restaurants/3',
      icon: '🌶️'
    },
    {
      id: '4',
      type: 'menu_item',
      title: 'Margherita Pizza',
      subtitle: 'The Savory Kitchen',
      description: 'Fresh mozzarella, basil, tomato sauce',
      link: '/restaurants/1',
      icon: '🍕'
    },
    {
      id: '5',
      type: 'menu_item',
      title: 'Butter Chicken',
      subtitle: 'Spice Route',
      description: 'Creamy tomato curry with tender chicken',
      link: '/restaurants/3',
      icon: '🍛'
    },
    {
      id: '6',
      type: 'post',
      title: 'Best Coffee Spots in Downtown',
      subtitle: 'Community Post',
      description: 'A curated list of the best coffee shops in the city...',
      link: '/community',
      icon: '📝'
    },
    {
      id: '7',
      type: 'review',
      title: 'The Savory Kitchen Review',
      subtitle: 'John Doe - 5⭐',
      description: 'Amazing Italian food! The pasta was perfectly cooked and the service was excellent.',
      link: '/restaurants/1',
      icon: '⭐'
    },
    {
      id: '8',
      type: 'faq',
      title: 'How do I make a reservation?',
      subtitle: 'Bookings & Reservations',
      description: 'You can make a reservation by visiting the restaurant page and clicking the "Book Now" button...',
      link: '/faqs',
      icon: '❓'
    },
    {
      id: '9',
      type: 'user',
      title: 'Chef Maria Rodriguez',
      subtitle: 'Chef/Specialist',
      description: 'Award-winning chef specializing in Mediterranean cuisine with 15 years of experience',
      link: '/community',
      icon: '👤'
    },
    {
      id: '10',
      type: 'booking',
      title: 'Booking at The Savory Kitchen',
      subtitle: 'Party of 4 - Dec 25, 2024',
      description: 'Anniversary dinner, window seat preferred',
      link: '/dashboard/user/bookings',
      icon: '📅'
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
