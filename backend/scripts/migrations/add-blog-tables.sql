-- Blog Feature Migration
-- Adds tables for blog posts management

-- ============================================
-- BLOG_POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Content fields
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    
    -- SEO fields
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT[],
    
    -- Categorization
    category VARCHAR(100),
    tags TEXT[],
    
    -- Status and visibility
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    is_featured BOOLEAN DEFAULT false,
    
    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- Publishing info
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(tenant_id, slug)
);

-- ============================================
-- BLOG_CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, slug)
);

-- ============================================
-- BLOG_POST_LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blog_post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant ON blog_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_blog_categories_tenant ON blog_categories(tenant_id);

-- ============================================
-- SEED DEFAULT CATEGORIES
-- ============================================
INSERT INTO blog_categories (tenant_id, name, slug, description, icon, sort_order)
SELECT t.id, 'Food & Recipes', 'food-recipes', 'Delicious recipes and food inspiration', '🍳', 1
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO blog_categories (tenant_id, name, slug, description, icon, sort_order)
SELECT t.id, 'Restaurant News', 'restaurant-news', 'Latest news from the restaurant industry', '📰', 2
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO blog_categories (tenant_id, name, slug, description, icon, sort_order)
SELECT t.id, 'Tips & Guides', 'tips-guides', 'Helpful tips for food lovers and businesses', '💡', 3
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO blog_categories (tenant_id, name, slug, description, icon, sort_order)
SELECT t.id, 'Success Stories', 'success-stories', 'Inspiring stories from our community', '⭐', 4
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO blog_categories (tenant_id, name, slug, description, icon, sort_order)
SELECT t.id, 'Platform Updates', 'platform-updates', 'New features and improvements on Itiyum', '🚀', 5
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- ============================================
-- SEED SAMPLE BLOG POSTS
-- ============================================
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT 
    t.id,
    u.id,
    'Welcome to Itiyum Blog',
    'welcome-to-itiyum-blog',
    'Discover the latest food trends, restaurant tips, and culinary inspiration on the Itiyum blog.',
    '<h2>Welcome to Our Blog!</h2>
<p>We are thrilled to launch the Itiyum blog, your go-to destination for all things food and dining. Whether you are a food enthusiast looking for new restaurants to try, a business owner seeking tips to grow your establishment, or a culinary specialist wanting to share your expertise, this blog is for you.</p>
<h3>What to Expect</h3>
<ul>
<li><strong>Food & Recipes:</strong> Delicious recipes from top chefs and home cooks</li>
<li><strong>Restaurant News:</strong> The latest happenings in the food industry</li>
<li><strong>Tips & Guides:</strong> Expert advice for diners and business owners</li>
<li><strong>Success Stories:</strong> Inspiring journeys from our community</li>
</ul>
<p>Stay tuned for weekly updates and subscribe to never miss a post!</p>',
    'Platform Updates',
    ARRAY['welcome', 'announcement', 'itiyum'],
    'published',
    true,
    NOW()
FROM tenants t
JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

