const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get community posts with pagination
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 10, author_type } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        cp.*,
        u.first_name || ' ' || u.last_name as author_name,
        u.profile_photo as author_avatar,
        CASE 
          WHEN u.is_chef THEN 'chef'
          WHEN b.id IS NOT NULL THEN 'business'
          ELSE 'user'
        END as author_type_actual
      FROM community_posts cp
      JOIN users u ON cp.author_id = u.id
      LEFT JOIN businesses b ON u.id = b.owner_id
      WHERE cp.is_active = true
    `;
    
    const params = [];
    
    if (author_type) {
      if (author_type === 'chef') {
        query += ` AND u.is_chef = true`;
      } else if (author_type === 'business') {
        query += ` AND b.id IS NOT NULL`;
      } else if (author_type === 'user') {
        query += ` AND u.is_chef = false AND b.id IS NULL`;
      }
    }
    
    query += ` ORDER BY cp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Transform the data to match frontend expectations
    const posts = result.rows.map(post => ({
      id: post.id,
      authorId: post.author_id,
      authorName: post.author_name,
      authorAvatar: post.author_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      authorType: post.author_type_actual,
      content: post.content,
      images: post.images || [],
      likes: post.likes_count,
      comments: post.comments_count,
      shares: post.shares_count,
      createdAt: post.created_at,
      isLiked: false, // TODO: Check if current user liked this post
      tags: post.tags || []
    }));
    
    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: posts.length === parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching community posts:', error);
    res.status(500).json({ error: 'Failed to fetch community posts' });
  }
});

// Create a new community post
router.post('/posts', async (req, res) => {
  try {
    const { content, images = [], tags = [], authorId } = req.body;
    
    if (!content || !authorId) {
      return res.status(400).json({ error: 'Content and author ID are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO community_posts (author_id, content, images, tags)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [authorId, content, images, tags]);
    
    const post = result.rows[0];
    
    // Get author details
    const authorResult = await pool.query(`
      SELECT 
        u.first_name || ' ' || u.last_name as author_name,
        u.profile_photo as author_avatar,
        u.is_chef,
        CASE WHEN b.id IS NOT NULL THEN true ELSE false END as is_business_owner
      FROM users u
      LEFT JOIN businesses b ON u.id = b.owner_id
      WHERE u.id = $1
    `, [authorId]);
    
    const author = authorResult.rows[0];
    
    const responsePost = {
      id: post.id,
      authorId: post.author_id,
      authorName: author.author_name,
      authorAvatar: author.author_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      authorType: author.is_chef ? 'chef' : (author.is_business_owner ? 'business' : 'user'),
      content: post.content,
      images: post.images || [],
      likes: post.likes_count,
      comments: post.comments_count,
      shares: post.shares_count,
      createdAt: post.created_at,
      isLiked: false,
      tags: post.tags || []
    };
    
    res.status(201).json(responsePost);
    
  } catch (error) {
    console.error('Error creating community post:', error);
    res.status(500).json({ error: 'Failed to create community post' });
  }
});

// Toggle like on a post
router.post('/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user already liked this post
    const existingLike = await pool.query(`
      SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2
    `, [postId, userId]);
    
    let isLiked;
    let likesChange;
    
    if (existingLike.rows.length > 0) {
      // Unlike the post
      await pool.query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
      await pool.query(`UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = $1`, [postId]);
      isLiked = false;
      likesChange = -1;
    } else {
      // Like the post
      await pool.query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`, [postId, userId]);
      await pool.query(`UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = $1`, [postId]);
      isLiked = true;
      likesChange = 1;
    }
    
    // Get updated likes count
    const postResult = await pool.query(`SELECT likes_count FROM community_posts WHERE id = $1`, [postId]);
    const likesCount = postResult.rows[0]?.likes_count || 0;
    
    res.json({
      isLiked,
      likesCount,
      change: likesChange
    });
    
  } catch (error) {
    console.error('Error toggling post like:', error);
    res.status(500).json({ error: 'Failed to toggle post like' });
  }
});

// Get trending topics
router.get('/trending', async (req, res) => {
  try {
    // Mock trending topics for now - in a real app, this would be calculated from post tags
    const trendingTopics = [
      { name: '#SustainableCooking', count: 1247 },
      { name: '#LocalIngredients', count: 892 },
      { name: '#PlantBased', count: 756 },
      { name: '#FoodWaste', count: 634 },
      { name: '#CookingTips', count: 589 },
      { name: '#SeasonalMenu', count: 445 },
      { name: '#FarmToTable', count: 398 },
      { name: '#VeganRecipes', count: 367 }
    ];
    
    res.json(trendingTopics);
    
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    res.status(500).json({ error: 'Failed to fetch trending topics' });
  }
});

// Get featured chefs
router.get('/featured-chefs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as name,
        u.profile_photo as avatar,
        u.bio,
        u.specialty_dishes[1] as specialty,
        COALESCE(cf.followers_count, 0) as followers
      FROM users u
      LEFT JOIN (
        SELECT chef_id, COUNT(*) as followers_count
        FROM chef_follows
        GROUP BY chef_id
      ) cf ON u.id = cf.chef_id
      WHERE u.is_chef = true
      ORDER BY cf.followers_count DESC NULLS LAST, u.created_at DESC
      LIMIT 10
    `);
    
    const featuredChefs = result.rows.map(chef => ({
      id: chef.id,
      name: chef.name,
      avatar: chef.avatar || 'https://images.unsplash.com/photo-1583394293214-28a5b0a8e8b8?w=100&h=100&fit=crop&crop=face',
      specialty: chef.specialty || 'Culinary Arts',
      followers: chef.followers,
      isFollowing: false // TODO: Check if current user is following
    }));
    
    res.json(featuredChefs);
    
  } catch (error) {
    console.error('Error fetching featured chefs:', error);
    res.status(500).json({ error: 'Failed to fetch featured chefs' });
  }
});

// Follow/unfollow a chef
router.post('/chefs/:chefId/follow', async (req, res) => {
  try {
    const { chefId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user already follows this chef
    const existingFollow = await pool.query(`
      SELECT id FROM chef_follows WHERE follower_id = $1 AND chef_id = $2
    `, [userId, chefId]);
    
    let isFollowing;
    let followersChange;
    
    if (existingFollow.rows.length > 0) {
      // Unfollow the chef
      await pool.query(`DELETE FROM chef_follows WHERE follower_id = $1 AND chef_id = $2`, [userId, chefId]);
      isFollowing = false;
      followersChange = -1;
    } else {
      // Follow the chef
      await pool.query(`INSERT INTO chef_follows (follower_id, chef_id) VALUES ($1, $2)`, [userId, chefId]);
      isFollowing = true;
      followersChange = 1;
    }
    
    // Get updated followers count
    const followersResult = await pool.query(`
      SELECT COUNT(*) as followers_count FROM chef_follows WHERE chef_id = $1
    `, [chefId]);
    const followersCount = parseInt(followersResult.rows[0]?.followers_count || 0);
    
    res.json({
      isFollowing,
      followersCount,
      change: followersChange
    });
    
  } catch (error) {
    console.error('Error toggling chef follow:', error);
    res.status(500).json({ error: 'Failed to toggle chef follow' });
  }
});

module.exports = router;
