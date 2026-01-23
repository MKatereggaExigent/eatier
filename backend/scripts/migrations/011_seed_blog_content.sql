-- Seed Blog Content Migration
-- Populates the blog with extensive industry-relevant content

-- ============================================
-- FEATURED BLOG POSTS
-- ============================================

-- 1. AI in Restaurants
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT 
    t.id,
    u.id,
    'How AI is Revolutionizing the Restaurant Industry in 2026',
    'ai-revolutionizing-restaurant-industry-2026',
    'From AI-powered ordering systems to predictive analytics, discover how artificial intelligence is transforming every aspect of the restaurant business.',
    '<h2>The AI Revolution in Hospitality</h2>
<p>The restaurant industry is experiencing an unprecedented transformation driven by artificial intelligence. According to recent industry reports, over 65% of restaurants are now using some form of AI technology, up from just 25% in 2023.</p>

<h3>Key AI Applications in Restaurants</h3>

<h4>1. AI-Powered Ordering Systems</h4>
<p>Chatbots and voice assistants are handling customer orders with remarkable accuracy. These systems can:</p>
<ul>
<li>Process orders in multiple languages</li>
<li>Remember customer preferences</li>
<li>Upsell intelligently based on order history</li>
<li>Handle peak hours without additional staffing costs</li>
</ul>

<h4>2. Predictive Analytics</h4>
<p>AI is helping restaurants forecast demand with 92% accuracy, enabling better inventory management and reducing food waste by up to 35%.</p>

<h4>3. Kitchen Automation</h4>
<p>Robotic kitchen assistants are now common in quick-service restaurants, handling repetitive tasks like:</p>
<ul>
<li>Flipping burgers</li>
<li>Preparing salads</li>
<li>Plating dishes</li>
<li>Managing fryers</li>
</ul>

<h4>4. Personalized Customer Experiences</h4>
<p>AI analyzes customer data to create personalized menu recommendations, special offers, and dining experiences that increase customer satisfaction by 40%.</p>

<h3>Implementation Challenges</h3>
<p>While AI adoption is accelerating, restaurants face challenges including:</p>
<ul>
<li>Initial investment costs</li>
<li>Staff training requirements</li>
<li>Integration with existing systems</li>
<li>Customer acceptance of automated service</li>
</ul>

<h3>The Future Outlook</h3>
<p>By 2028, industry analysts predict that AI will be managing 70% of routine restaurant operations, freeing staff to focus on creating exceptional customer experiences.</p>',
    'Technology',
    ARRAY['AI', 'automation', 'restaurant technology', 'innovation', 'chatbots'],
    'published',
    true,
    NOW() - INTERVAL '1 day'
FROM tenants t
JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 2. Ghost Kitchens
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT 
    t.id,
    u.id,
    'The Rise of Ghost Kitchens: Why Delivery-Only Models Are Dominating 2026',
    'ghost-kitchens-delivery-only-dominating-2026',
    'Ghost kitchens have evolved from a pandemic necessity to a $80 billion global industry. Learn why this model is reshaping the food landscape.',
    '<h2>Ghost Kitchens: From Trend to Industry Standard</h2>
<p>The global ghost kitchen market is projected to reach $80 billion by the end of 2026, representing a compound annual growth rate of 12.4%. What started as a response to pandemic restrictions has become a permanent fixture in the food service industry.</p>

<h3>Why Ghost Kitchens Are Thriving</h3>

<h4>Lower Operating Costs</h4>
<p>Without the need for front-of-house staff, expensive real estate, or dining room decor, ghost kitchens can operate with 60% lower overhead costs compared to traditional restaurants.</p>

<h4>Flexible Business Models</h4>
<ul>
<li><strong>Multi-brand operations:</strong> A single kitchen can run 5-10 different restaurant concepts</li>
<li><strong>Rapid market testing:</strong> New menu concepts can launch in weeks, not months</li>
<li><strong>Geographic expansion:</strong> Enter new markets without massive capital investment</li>
</ul>

<h4>Meeting Consumer Demand</h4>
<p>Food delivery orders increased by 45% between 2022 and 2025, with 78% of millennials ordering delivery at least once a week.</p>

<h3>Technology Infrastructure</h3>
<p>Successful ghost kitchens rely on sophisticated technology:</p>
<ul>
<li>Multi-platform order aggregation</li>
<li>Real-time kitchen display systems</li>
<li>AI-powered demand forecasting</li>
<li>Automated inventory management</li>
</ul>

<h3>Challenges and Solutions</h3>

<h4>Quality Control</h4>
<p>Without face-to-face customer interaction, maintaining quality is crucial. Leading operators use temperature monitoring, packaging innovations, and delivery time optimization.</p>

<h4>Brand Building</h4>
<p>Creating brand loyalty without a physical presence requires strong social media presence, consistent food quality, and memorable packaging.</p>

<h3>Starting Your Ghost Kitchen</h3>
<p>For entrepreneurs interested in this model, key considerations include:</p>
<ol>
<li>Location selection near high-density residential areas</li>
<li>Menu optimization for delivery</li>
<li>Strategic platform partnerships</li>
<li>Efficient kitchen design for multiple brands</li>
</ol>',
    'Industry Trends',
    ARRAY['ghost kitchens', 'cloud kitchens', 'food delivery', 'restaurant trends', 'startup'],
    'published',
    true,
    NOW() - INTERVAL '2 days'
FROM tenants t
JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 3. Sustainable Restaurant Practices
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT
    t.id,
    u.id,
    'Sustainable Restaurant Practices: The Green Revolution in Dining',
    'sustainable-restaurant-practices-green-revolution',
    'Eco-conscious consumers are driving restaurants to adopt sustainable practices. Learn how to reduce your environmental footprint while boosting profits.',
    '<h2>Sustainability: Good for the Planet, Great for Business</h2>
<p>A recent survey found that 73% of diners prefer restaurants with strong sustainability practices, and 62% are willing to pay more for eco-friendly dining options.</p>

<h3>Key Sustainability Initiatives</h3>
<h4>1. Food Waste Reduction</h4>
<p>The average restaurant wastes 4-10% of purchased food. Smart operators implement AI-powered inventory management, root-to-stem cooking techniques, and composting programs.</p>

<h4>2. Sustainable Sourcing</h4>
<p>Local farm partnerships reduce transportation emissions by 70%. Seasonal menu planning and sustainable seafood certifications are becoming standard.</p>

<h4>3. Energy Efficiency</h4>
<p>Kitchen operations account for 80% of a restaurants energy use. Solutions include Energy Star certified equipment, LED lighting retrofits, and smart HVAC systems.</p>

<h4>4. Eco-Friendly Packaging</h4>
<p>With takeout representing 40% of restaurant sales, compostable containers and biodegradable cutlery are essential investments.</p>

<h3>ROI of Sustainability</h3>
<p>Beyond environmental benefits, sustainable practices deliver 15-25% reduction in utility costs, 20% lower food costs through waste reduction, and increased customer loyalty.</p>',
    'Sustainability',
    ARRAY['sustainability', 'eco-friendly', 'green dining', 'food waste', 'environment'],
    'published',
    true,
    NOW() - INTERVAL '3 days'
FROM tenants t
JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 4. Digital Marketing for Restaurants
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT
    t.id,
    u.id,
    '2026 Restaurant Digital Marketing: Social Media Strategies That Actually Work',
    'restaurant-digital-marketing-social-media-2026',
    'Master the art of restaurant marketing in the digital age. From TikTok virality to AI-personalized campaigns, discover strategies driving real results.',
    '<h2>The Digital Marketing Landscape for Restaurants</h2>
<p>In 2026, restaurants spend an average of 4.5% of revenue on marketing, with 78% of that budget going to digital channels.</p>

<h3>Platform-Specific Strategies</h3>
<h4>TikTok: The Discovery Engine</h4>
<p>65% of Gen Z discovers new restaurants through TikTok. Behind-the-scenes kitchen content and food preparation ASMR videos drive the most engagement.</p>

<h4>Instagram: The Visual Menu</h4>
<p>Instagram Reels outperform static posts by 4x. Location tags drive 79% more engagement.</p>

<h4>Google Business Profile</h4>
<p>88% of consumers trust online reviews. Regular photo updates, quick response to reviews, and updated hours drive conversions.</p>

<h3>AI-Powered Personalization</h3>
<p>Leading restaurants use AI to segment customers, send personalized offers, retarget website visitors, and optimize ad spend in real-time.</p>',
    'Marketing',
    ARRAY['digital marketing', 'social media', 'restaurant marketing', 'TikTok', 'Instagram'],
    'published',
    false,
    NOW() - INTERVAL '4 days'
FROM tenants t
JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 5. Restaurant Labor Trends
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT
    t.id,
    u.id,
    'Solving the Restaurant Labor Crisis: Innovative Staffing Solutions for 2026',
    'restaurant-labor-crisis-staffing-solutions-2026',
    'With unemployment at historic lows and turnover rates exceeding 70%, restaurants are reimagining how they attract, train, and retain talent.',
    '<h2>The State of Restaurant Labor</h2>
<p>The restaurant industry faces its most challenging labor market in decades. Average hourly wages have increased 22% since 2022, yet positions remain unfilled.</p>

<h3>Innovative Solutions</h3>
<h4>Flexible Scheduling</h4>
<p>Apps allowing employees to swap shifts and set availability preferences have reduced turnover by 35% at early adopters.</p>

<h4>Career Development Programs</h4>
<p>Restaurants offering clear advancement paths and training certifications report 50% higher retention rates.</p>

<h4>Technology-Assisted Operations</h4>
<p>Automation of repetitive tasks allows staff to focus on customer-facing roles, increasing job satisfaction and tips.</p>

<h4>Competitive Benefits</h4>
<p>Forward-thinking operators now offer healthcare, mental health support, and earned wage access to attract top talent.</p>',
    'Industry Trends',
    ARRAY['labor', 'staffing', 'employee retention', 'HR', 'workplace'],
    'published',
    false,
    NOW() - INTERVAL '5 days'
FROM tenants t
JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 6. Menu Engineering
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT
    t.id,
    u.id,
    'Menu Engineering: The Science of Profitable Menu Design',
    'menu-engineering-profitable-menu-design',
    'Learn how strategic menu design can increase average check size by 15% and boost your most profitable items.',
    '<h2>The Art and Science of Menu Design</h2>
<p>Menu engineering combines psychology, data analysis, and design principles to maximize profitability while enhancing customer experience.</p>

<h3>The Menu Matrix</h3>
<p>Classify items into four categories based on popularity and profitability:</p>
<ul>
<li><strong>Stars:</strong> High profit, high popularity - feature prominently</li>
<li><strong>Plowhorses:</strong> Low profit, high popularity - consider price increases</li>
<li><strong>Puzzles:</strong> High profit, low popularity - improve visibility</li>
<li><strong>Dogs:</strong> Low profit, low popularity - remove or reimagine</li>
</ul>

<h3>Design Psychology</h3>
<p>Strategic placement increases sales of target items by 25%. The golden triangle (top-right, center, top-left) captures 86% of initial attention.</p>

<h3>Pricing Strategies</h3>
<p>Remove dollar signs, use charm pricing (.95/.99), and position premium items first to anchor customer expectations higher.</p>',
    'Tips & Guides',
    ARRAY['menu engineering', 'profitability', 'restaurant management', 'design', 'pricing'],
    'published',
    false,
    NOW() - INTERVAL '6 days'
FROM tenants t
JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 7. Food Delivery Optimization
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT
    t.id,
    u.id,
    'Mastering Food Delivery: Optimizing for the Off-Premise Revolution',
    'mastering-food-delivery-optimization-2026',
    'With 35% of restaurant revenue now coming from delivery, optimizing your off-premise operations is essential for survival.',
    '<h2>The Delivery Economy</h2>
<p>Food delivery has grown from a convenience to an expectation. Restaurants excelling at delivery see 40% higher overall revenue than those focused solely on dine-in.</p>

<h3>Platform Strategy</h3>
<p>Multi-platform presence increases order volume but requires careful margin management. Commission rates typically range from 15-30%.</p>

<h3>Packaging Innovation</h3>
<p>Invest in packaging that maintains food quality. Vented containers, insulated bags, and compartmentalized packaging reduce complaints by 45%.</p>

<h3>Menu Optimization</h3>
<p>Not all dishes travel well. Create a delivery-specific menu featuring items that maintain quality for 30-45 minutes.</p>

<h3>Direct Ordering</h3>
<p>Building your own ordering channel reduces fees and captures customer data. Offer exclusive deals for direct orders.</p>',
    'Tips & Guides',
    ARRAY['food delivery', 'off-premise', 'third-party platforms', 'packaging', 'optimization'],
    'published',
    false,
    NOW() - INTERVAL '7 days'
FROM tenants t
JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 8. Restaurant Technology Stack
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT
    t.id, u.id,
    'The Essential Restaurant Technology Stack for 2026',
    'essential-restaurant-technology-stack-2026',
    'From POS systems to kitchen display screens, discover the must-have technologies powering successful restaurants.',
    '<h2>Building Your Technology Foundation</h2>
<p>The modern restaurant runs on integrated technology. Operators report 23% efficiency gains when using connected systems.</p>

<h3>Core Systems</h3>
<h4>Cloud-Based POS</h4>
<p>Cloud POS systems offer real-time reporting, automatic updates, and multi-location management. Leaders include Toast, Square, and Lightspeed.</p>

<h4>Kitchen Display Systems (KDS)</h4>
<p>Digital ticket management reduces errors by 40% and improves kitchen communication significantly.</p>

<h4>Inventory Management</h4>
<p>Automated inventory tracking with vendor integration cuts food costs by 2-5% and eliminates manual counting.</p>

<h4>Reservation & Waitlist</h4>
<p>Online reservation systems reduce no-shows by 36% when paired with automated confirmations and reminders.</p>

<h3>Integration is Key</h3>
<p>Choose platforms that integrate seamlessly. Disconnected systems create data silos and operational inefficiencies.</p>',
    'Technology',
    ARRAY['restaurant technology', 'POS', 'software', 'integration', 'operations'],
    'published', false, NOW() - INTERVAL '8 days'
FROM tenants t JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 9. Customer Experience
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT
    t.id, u.id,
    'Creating Memorable Dining Experiences in the Age of Social Media',
    'memorable-dining-experiences-social-media-age',
    'Learn how to design Instagram-worthy moments that turn first-time visitors into loyal advocates.',
    '<h2>Experience is the New Marketing</h2>
<p>92% of diners share positive experiences on social media. Creating shareable moments is now a marketing strategy.</p>

<h3>The Photo-Worthy Philosophy</h3>
<p>Design every touchpoint for visual appeal: signature presentations, unique tableware, striking decor elements, and creative plating.</p>

<h3>Personalization at Scale</h3>
<p>Technology enables personal touches: remembering preferences, celebrating occasions, and tailoring recommendations to individual tastes.</p>

<h3>Staff Empowerment</h3>
<p>Give staff authority to create special moments. Small gestures like complimentary desserts for anniversaries generate outsized loyalty.</p>

<h3>Feedback Loops</h3>
<p>Real-time feedback collection identifies issues before they become reviews. Respond to concerns within 24 hours.</p>',
    'Tips & Guides',
    ARRAY['customer experience', 'hospitality', 'social media', 'loyalty', 'service'],
    'published', false, NOW() - INTERVAL '9 days'
FROM tenants t JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 10. Restaurant Finance
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT
    t.id, u.id,
    'Restaurant Financial Health: Key Metrics Every Owner Must Track',
    'restaurant-financial-health-key-metrics',
    'Understand the numbers that matter most for your restaurants profitability and long-term success.',
    '<h2>Know Your Numbers</h2>
<p>The difference between thriving and struggling restaurants often comes down to financial literacy and real-time monitoring.</p>

<h3>Critical Metrics</h3>
<h4>Prime Cost</h4>
<p>Food cost plus labor should stay below 65% of revenue. Track weekly and adjust accordingly.</p>

<h4>Average Check Size</h4>
<p>Monitor by daypart and server. Upselling training can increase average check by 12-18%.</p>

<h4>Table Turn Time</h4>
<p>Balance efficiency with guest experience. Optimal times vary by concept but visibility drives revenue.</p>

<h4>Customer Acquisition Cost</h4>
<p>Know what you spend to bring in each new customer. Compare against lifetime value for marketing ROI.</p>

<h3>Cash Flow Management</h3>
<p>Maintain 2-3 months of operating expenses in reserve. Negotiate vendor terms and manage accounts receivable actively.</p>',
    'Business Growth',
    ARRAY['finance', 'profitability', 'metrics', 'accounting', 'management'],
    'published', false, NOW() - INTERVAL '10 days'
FROM tenants t JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 11. Food Trends
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT t.id, u.id,
    'Top Food Trends Dominating Menus in 2026',
    'top-food-trends-dominating-menus-2026',
    'From functional ingredients to global fusion, discover the culinary trends shaping consumer preferences this year.',
    '<h2>What Diners Want in 2026</h2>
<p>Consumer tastes evolve rapidly. Staying ahead of trends can differentiate your restaurant and attract adventurous diners.</p>

<h3>Trending Flavors</h3>
<h4>Global Fusion</h4>
<p>Korean-Mexican, Indian-Italian, and Japanese-Peruvian mashups continue to captivate diners seeking new experiences.</p>

<h4>Functional Foods</h4>
<p>Adaptogens, probiotics, and nootropics appear in everything from lattes to desserts as health-conscious dining grows.</p>

<h4>Fermented Everything</h4>
<p>Kimchi, kombucha, miso, and housemade pickles add depth, complexity, and perceived health benefits.</p>

<h4>Plant-Forward</h4>
<p>Not just vegetarian - featuring vegetables as the star with meat as an accent appeals to flexitarian diners.</p>

<h3>Presentation Trends</h3>
<p>Theatrical tableside service, interactive elements, and surprise courses create memorable and shareable moments.</p>',
    'Food & Recipes',
    ARRAY['food trends', 'culinary', 'menu', 'innovation', 'consumer trends'],
    'published', false, NOW() - INTERVAL '11 days'
FROM tenants t JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 12. Restaurant Security
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT t.id, u.id,
    'Cybersecurity for Restaurants: Protecting Your Digital Assets',
    'cybersecurity-restaurants-protecting-digital-assets',
    'As restaurants digitize operations, they become targets. Learn how to protect customer data and payment systems.',
    '<h2>The Growing Threat Landscape</h2>
<p>Restaurants process millions in card transactions and store valuable customer data, making them attractive targets for cybercriminals.</p>

<h3>Key Vulnerabilities</h3>
<h4>Point of Sale Systems</h4>
<p>Keep POS software updated, use strong passwords, and implement network segmentation to isolate payment systems.</p>

<h4>WiFi Networks</h4>
<p>Separate guest WiFi from operations. Use enterprise-grade security and change passwords regularly.</p>

<h4>Employee Training</h4>
<p>Phishing attacks target staff. Regular security awareness training reduces successful attacks by 70%.</p>

<h3>Compliance Requirements</h3>
<p>PCI DSS compliance is mandatory for card processing. Non-compliance can result in fines up to $100,000 monthly.</p>

<h3>Incident Response</h3>
<p>Have a plan before you need it. Know who to contact, how to contain breaches, and customer notification procedures.</p>',
    'Technology',
    ARRAY['cybersecurity', 'data protection', 'PCI compliance', 'security', 'technology'],
    'published', false, NOW() - INTERVAL '12 days'
FROM tenants t JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 13. Restaurant Design
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT t.id, u.id,
    'Restaurant Design Trends: Creating Spaces That Tell Stories',
    'restaurant-design-trends-spaces-tell-stories',
    'Interior design influences dining behavior. Discover how the right atmosphere drives revenue.',
    '<h2>Design as Competitive Advantage</h2>
<p>Diners spend 35% longer in well-designed spaces and tip 20% more in aesthetically pleasing environments.</p>

<h3>2026 Design Trends</h3>
<h4>Biophilic Design</h4>
<p>Living walls, natural materials, and abundant plants create calming environments that reduce stress hormones.</p>

<h4>Flexible Spaces</h4>
<p>Modular furniture and movable partitions allow quick reconfiguration for private events or different service styles.</p>

<h4>Open Kitchens</h4>
<p>Transparency builds trust. Visible cooking becomes entertainment and validates quality perceptions.</p>

<h4>Local Art Integration</h4>
<p>Supporting local artists creates unique spaces while strengthening community connections.</p>

<h3>Lighting Psychology</h3>
<p>Dimmer lighting in evenings extends dwell time while brighter settings at lunch encourage turnover.</p>',
    'Tips & Guides',
    ARRAY['restaurant design', 'interior design', 'atmosphere', 'branding', 'customer experience'],
    'published', false, NOW() - INTERVAL '13 days'
FROM tenants t JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 14. Loyalty Programs
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT t.id, u.id,
    'Building Loyalty Programs That Actually Drive Repeat Business',
    'loyalty-programs-drive-repeat-business',
    'The right loyalty program increases visit frequency by 35%. Learn what works and what to avoid.',
    '<h2>The Loyalty Imperative</h2>
<p>Acquiring new customers costs 5x more than retaining existing ones. Effective loyalty programs are profit multipliers.</p>

<h3>Program Design</h3>
<h4>Simplicity Wins</h4>
<p>Complex point systems confuse customers. Clear, achievable rewards drive participation.</p>

<h4>Tiered Benefits</h4>
<p>VIP tiers create aspiration and reward your best customers with exclusive perks.</p>

<h4>Surprise and Delight</h4>
<p>Unexpected rewards generate 4x more engagement than expected ones.</p>

<h3>Digital Integration</h3>
<p>Mobile apps with integrated loyalty drive 62% higher participation than punch cards.</p>

<h3>Data Utilization</h3>
<p>Use loyalty data for personalized offers, birthday rewards, and win-back campaigns for lapsed customers.</p>',
    'Marketing',
    ARRAY['loyalty programs', 'customer retention', 'marketing', 'CRM', 'engagement'],
    'published', false, NOW() - INTERVAL '14 days'
FROM tenants t JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 15. Health and Safety
INSERT INTO blog_posts (tenant_id, author_id, title, slug, excerpt, content, category, tags, status, is_featured, published_at)
SELECT t.id, u.id,
    'Food Safety Excellence: Beyond Compliance to Competitive Advantage',
    'food-safety-excellence-competitive-advantage',
    'Exceptional food safety builds trust and protects your brand. Learn best practices for 2026.',
    '<h2>Safety as Strategy</h2>
<p>One foodborne illness outbreak can destroy years of brand building. Proactive safety is risk management.</p>

<h3>Technology-Enhanced Safety</h3>
<h4>IoT Temperature Monitoring</h4>
<p>Continuous monitoring with alerts prevents spoilage and provides documentation for inspections.</p>

<h4>Digital Checklists</h4>
<p>Replace paper logs with digital systems that enforce completion and enable real-time oversight.</p>

<h4>Staff Training Platforms</h4>
<p>Online training ensures consistency and provides certification documentation.</p>

<h3>Transparency Trends</h3>
<p>Consumers expect allergen information, sourcing details, and preparation methods to be readily available.</p>

<h3>Crisis Preparedness</h3>
<p>Have protocols for recalls, contamination events, and customer complaints before you need them.</p>',
    'Tips & Guides',
    ARRAY['food safety', 'compliance', 'health', 'regulations', 'risk management'],
    'published', false, NOW() - INTERVAL '15 days'
FROM tenants t JOIN users u ON u.email = 'admin@itiyum.com' AND u.tenant_id = t.id
WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, slug) DO NOTHING;

-- ============================================
-- SEED INDUSTRY NEWS FEED
-- ============================================
INSERT INTO industry_news_feed (tenant_id, title, summary, source_name, source_url, category, tags, priority, is_breaking, published_at)
SELECT t.id,
    'Restaurant Industry Sees 8% Growth in Q4 2025',
    'The National Restaurant Association reports strong holiday season performance with total industry sales reaching $1.2 trillion.',
    'National Restaurant Association',
    'https://restaurant.org/research',
    'Industry News',
    ARRAY['growth', 'industry', 'sales'],
    10, true, NOW() - INTERVAL '1 hour'
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT DO NOTHING;

INSERT INTO industry_news_feed (tenant_id, title, summary, source_name, source_url, category, tags, priority, published_at)
SELECT t.id,
    'AI Ordering Systems Reduce Wait Times by 40%',
    'New study shows restaurants using AI chatbots for ordering see significant improvements in service speed and accuracy.',
    'Restaurant Technology News',
    'https://restauranttechnologynews.com',
    'Technology',
    ARRAY['AI', 'automation', 'efficiency'],
    8, NOW() - INTERVAL '3 hours'
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT DO NOTHING;

INSERT INTO industry_news_feed (tenant_id, title, summary, source_name, source_url, category, tags, priority, published_at)
SELECT t.id,
    'Sustainable Packaging Mandates Expand to 12 States',
    'New legislation requires compostable takeout containers, affecting thousands of restaurants nationwide.',
    'Food Service Insights',
    'https://foodserviceinsights.com',
    'Sustainability',
    ARRAY['sustainability', 'packaging', 'regulations'],
    9, NOW() - INTERVAL '5 hours'
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT DO NOTHING;

INSERT INTO industry_news_feed (tenant_id, title, summary, source_name, source_url, category, tags, priority, published_at)
SELECT t.id,
    'Ghost Kitchen Market Reaches $80 Billion Valuation',
    'Delivery-only restaurant concepts continue explosive growth as consumer habits permanently shift toward off-premise dining.',
    'Market Research Today',
    'https://marketresearchtoday.com',
    'Industry News',
    ARRAY['ghost kitchens', 'delivery', 'growth'],
    7, NOW() - INTERVAL '8 hours'
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT DO NOTHING;

INSERT INTO industry_news_feed (tenant_id, title, summary, source_name, source_url, category, tags, priority, published_at)
SELECT t.id,
    'Minimum Wage Increases Take Effect in 23 States',
    'Restaurant operators prepare for higher labor costs as new minimum wage laws begin January 1, 2026.',
    'Restaurant Business Online',
    'https://restaurantbusinessonline.com',
    'Industry News',
    ARRAY['labor', 'wages', 'regulations'],
    9, NOW() - INTERVAL '12 hours'
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT DO NOTHING;

-- ============================================
-- SEED INDUSTRY TRENDS
-- ============================================
INSERT INTO industry_trends (tenant_id, trend_name, trend_type, description, current_value, previous_value, percentage_change, unit, icon, sort_order)
SELECT t.id, 'Food Delivery Growth', 'growth', 'Year-over-year increase in food delivery orders', 45, 32, 40.6, 'percent', '📦', 1
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT DO NOTHING;

INSERT INTO industry_trends (tenant_id, trend_name, trend_type, description, current_value, previous_value, percentage_change, unit, icon, sort_order)
SELECT t.id, 'AI Adoption Rate', 'growth', 'Restaurants using AI-powered systems', 65, 25, 160, 'percent', '🤖', 2
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT DO NOTHING;

INSERT INTO industry_trends (tenant_id, trend_name, trend_type, description, current_value, previous_value, percentage_change, unit, icon, sort_order)
SELECT t.id, 'Sustainability Investment', 'growth', 'Restaurant spending on eco-friendly initiatives', 4.2, 2.8, 50, 'billion USD', '🌱', 3
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT DO NOTHING;

INSERT INTO industry_trends (tenant_id, trend_name, trend_type, description, current_value, previous_value, percentage_change, unit, icon, sort_order)
SELECT t.id, 'Average Check Size', 'statistic', 'Average transaction value at full-service restaurants', 48.50, 45.20, 7.3, 'USD', '💵', 4
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT DO NOTHING;

INSERT INTO industry_trends (tenant_id, trend_name, trend_type, description, current_value, previous_value, percentage_change, unit, icon, sort_order)
SELECT t.id, 'Staff Turnover Rate', 'decline', 'Annual employee turnover in restaurant industry', 68, 75, -9.3, 'percent', '👥', 5
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT DO NOTHING;

