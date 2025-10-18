# RAG (Retrieval-Augmented Generation) System Documentation

## Overview

The Itiyum AI Chatbot uses a sophisticated RAG system to provide intelligent, context-aware responses based on actual database data while respecting user permissions and multi-tenancy.

## How It Works

### 1. **Question Analysis**
When a user asks a question, the system uses OpenAI GPT-3.5-turbo to analyze the question and determine:
- Which database resources are relevant (users, businesses, bookings, menus, ads, posts, analytics)
- The user's intent
- Any specific entities mentioned (names, dates, IDs)
- Filters to apply (status, time range, limits)

### 2. **Permission Checking**
The system retrieves the user's permissions from the RBAC system:
- Queries the `user_roles`, `roles`, `role_permissions`, and `permissions` tables
- Builds a permission map showing which resources the user can access
- Only allows data retrieval for resources the user has `view` permission for

### 3. **Data Retrieval**
Based on the analysis and permissions, the system:
- Fetches only relevant data from the database
- Applies RBAC filtering (users only see data they have permission to see)
- Respects multi-tenancy (only data from the user's tenant)
- Limits results to prevent overwhelming the AI (max 50 rows per resource)

### 4. **Context Formatting**
Retrieved data is formatted into a structured context string that includes:
- Clear section headers for each resource type
- Numbered lists of data items
- Key information formatted for easy AI comprehension

### 5. **AI Response Generation**
The formatted context is combined with the system message and sent to OpenAI GPT-4:
- The AI has access to real, current database data
- Responses are based on actual platform state
- The AI can provide specific, accurate answers

## Supported Resources

### 1. **Users**
- **Admin Access**: Can see all users in the tenant
- **Non-Admin Access**: Can only see their own user data
- **Data Included**: Name, email, role, account status, creation date

### 2. **Businesses**
- **Admin Access**: Can see all businesses
- **Business Owner Access**: Can only see their own businesses
- **Other Users**: Can see all businesses (public data)
- **Data Included**: Business name, type, email, phone, verification status

### 3. **Bookings**
- **Admin Access**: Can see all bookings
- **Business Owner Access**: Can see bookings for their businesses
- **Regular Users**: Can only see their own bookings
- **Data Included**: Booking date/time, party size, status, business name, customer name

### 4. **Menus**
- **Admin Access**: Can see all menus
- **Business Owner Access**: Can see menus from their businesses
- **Other Users**: Can only see active/public menus
- **Data Included**: Title, category, description, price, business name, active status

### 5. **Ads**
- **Admin Access**: Can see all ads
- **Business Owner Access**: Can only see ads from their businesses
- **Other Users**: No access
- **Data Included**: Title, placement, status, budget, spent, impressions, clicks, dates

### 6. **Posts**
- **All Users**: Can see community posts (public data)
- **Data Included**: Post content, author name, creation date

### 7. **Analytics**
- **Admin Access**: Platform-wide analytics (total users, businesses, bookings, ads, ad spend)
- **Business Owner Access**: Business-specific analytics (bookings, menu items)
- **Other Users**: No access

## Query Optimization

### Limits
- Maximum 50 rows per resource to prevent token overflow
- Default limit of 10 rows for most queries
- Analytics queries return aggregated counts, not individual rows

### Indexing
All queries use indexed columns for performance:
- `tenant_id` (multi-tenancy filtering)
- `user_id` (user-specific data)
- `owner_id` (business owner filtering)
- `created_at` (sorting by recency)

### Filtering
Queries support dynamic filtering based on user questions:
- **Status filters**: `pending`, `active`, `completed`, `confirmed`, etc.
- **Time range filters**: `today`, `this week`, `last month` (future enhancement)
- **Entity filters**: Specific IDs, names, or other identifiers

## Security Features

### 1. **RBAC Enforcement**
- Every query checks user permissions before retrieving data
- Users can only access resources they have `view` permission for
- Permission checks happen at the database level

### 2. **Multi-Tenancy**
- All queries filter by `tenant_id`
- Users can never see data from other tenants
- Tenant isolation is enforced at the database level

### 3. **Row-Level Security**
- Business owners only see their own businesses
- Users only see their own bookings (unless they're admins or business owners)
- Sensitive data is never exposed to unauthorized users

### 4. **Data Minimization**
- Only necessary columns are retrieved
- Sensitive fields (passwords, API keys, payment details) are never included
- Results are limited to prevent data leakage

## Example Queries

### Admin Asking About Users
**Question**: "How many users are registered?"

**Analysis**:
```json
{
  "resources": ["users", "analytics"],
  "intent": "count total users",
  "filters": { "limit": 10 }
}
```

**Data Retrieved**:
- List of recent users (up to 10)
- Platform analytics with total user count

**Response**: "Based on the data, there are currently 1 registered user on the platform..."

### Business Owner Asking About Bookings
**Question**: "Show me my pending bookings"

**Analysis**:
```json
{
  "resources": ["bookings"],
  "intent": "list pending bookings",
  "filters": { "status": "pending", "limit": 10 }
}
```

**Data Retrieved**:
- Bookings for businesses owned by the user
- Filtered to only show `status = 'pending'`

**Response**: "You have 3 pending bookings: [details]..."

### Regular User Asking About Businesses
**Question**: "What restaurants are available?"

**Analysis**:
```json
{
  "resources": ["businesses"],
  "intent": "list available restaurants",
  "filters": { "limit": 10 }
}
```

**Data Retrieved**:
- List of businesses (public data)
- Limited to 10 results

**Response**: "Here are some available restaurants: [list]..."

## Fallback Mechanism

If the OpenAI analysis fails, the system uses keyword matching:
- Scans the question for resource-related keywords
- Maps keywords to database resources
- Uses default filters (limit: 10)

**Keywords**:
- `user`, `users`, `customer`, `account` → `users`
- `business`, `restaurant`, `venue` → `businesses`
- `booking`, `reservation`, `appointment` → `bookings`
- `menu`, `dish`, `food`, `meal` → `menus`
- `ad`, `advertisement`, `campaign` → `ads`
- `post`, `community`, `social` → `posts`
- `analytics`, `stats`, `metrics`, `performance` → `analytics`

## Performance Considerations

### Token Usage
- Question analysis: ~100-300 tokens
- Data retrieval: 0 tokens (database query)
- Context formatting: ~200-1000 tokens (depends on data volume)
- AI response generation: ~500-800 tokens

**Total per request**: ~800-2100 tokens

### Response Time
- Question analysis: ~1-2 seconds
- Permission check: ~50-100ms
- Data retrieval: ~100-500ms (depends on query complexity)
- AI response: ~2-5 seconds

**Total per request**: ~3-8 seconds

### Cost Optimization
- Uses GPT-3.5-turbo for question analysis (cheaper, faster)
- Uses GPT-4 for final response (better quality)
- Limits data retrieval to prevent excessive token usage
- Caches user permissions (future enhancement)

## Future Enhancements

### 1. **Vector Embeddings**
- Store embeddings of menu items, business descriptions
- Enable semantic search for better matching
- Find similar items based on user preferences

### 2. **Caching**
- Cache user permissions for faster lookups
- Cache frequently asked questions and answers
- Implement Redis for distributed caching

### 3. **Advanced Filtering**
- Time range parsing (today, this week, last month)
- Location-based filtering (nearby businesses)
- Price range filtering for menus

### 4. **Conversation Memory**
- Remember previous questions in the conversation
- Use context from earlier messages
- Provide more coherent multi-turn conversations

### 5. **Proactive Suggestions**
- Suggest relevant questions based on current page
- Recommend actions based on user role
- Provide insights from analytics data

## Troubleshooting

### Issue: "No data returned"
- **Cause**: User doesn't have permission to access the resource
- **Solution**: Check user's role and permissions in the database

### Issue: "Slow responses"
- **Cause**: Large dataset or complex queries
- **Solution**: Reduce limit, add more indexes, optimize queries

### Issue: "Incorrect data"
- **Cause**: Question analysis misidentified resources
- **Solution**: Improve analysis prompt or use fallback keywords

### Issue: "Permission denied"
- **Cause**: RBAC filtering is working correctly
- **Solution**: This is expected behavior - users should only see authorized data

