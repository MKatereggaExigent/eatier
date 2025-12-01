const OpenAI = require('openai');
const pool = require('../config/database');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AnalyticsAIService {
  /**
   * Generate AI-powered insights from analytics data
   */
  async generateInsights(analyticsData) {
    try {
      const prompt = `You are an expert business analyst for Itiyum, a hospitality subscription platform with 3 revenue streams:
1. Subscription Revenue (businesses pay monthly: $0 free, $29.99 starter, $79.99 professional, $199.99 enterprise)
2. Commission Revenue ($5 per completed booking)
3. Ad Revenue (future feature)

Analyze the following comprehensive data and provide 8-12 actionable insights covering different aspects:

PLATFORM STATISTICS:
- Total Users: ${analyticsData.statistics.total_users}
- Business Owners: ${analyticsData.statistics.business_owners}
- Food Enthusiasts: ${analyticsData.statistics.food_enthusiasts}
- Active Businesses: ${analyticsData.statistics.active_businesses}
- Pending Businesses: ${analyticsData.statistics.pending_businesses}
- Active Subscriptions: ${analyticsData.statistics.active_subscriptions}
- Total Bookings: ${analyticsData.statistics.total_bookings}
- Completed Bookings: ${analyticsData.statistics.completed_bookings}
- Cancelled Bookings: ${analyticsData.statistics.cancelled_bookings}

REVENUE BREAKDOWN:
- Total Revenue: $${analyticsData.statistics.total_revenue}
- Subscription Revenue: $${analyticsData.statistics.subscription_revenue}
- Commission Revenue: $${analyticsData.statistics.commission_revenue}
- MRR (Monthly Recurring Revenue): $${analyticsData.statistics.subscription_revenue}

SUBSCRIPTION DISTRIBUTION:
- Free Plan: ${analyticsData.subscriptionPlans.find(p => p.plan === 'free')?.count || 0}
- Starter Plan ($29.99): ${analyticsData.subscriptionPlans.find(p => p.plan === 'starter')?.count || 0}
- Professional Plan ($79.99): ${analyticsData.subscriptionPlans.find(p => p.plan === 'professional')?.count || 0}
- Enterprise Plan ($199.99): ${analyticsData.subscriptionPlans.find(p => p.plan === 'enterprise')?.count || 0}

CONVERSION METRICS:
- Business Owner Conversion: ${(analyticsData.conversionMetrics.business_owner_conversion * 100).toFixed(1)}%
- Booking Conversion: ${(analyticsData.conversionMetrics.booking_conversion * 100).toFixed(1)}%
- Subscription Rate: ${(analyticsData.conversionMetrics.subscription_rate * 100).toFixed(1)}%

TOP BUSINESSES:
${JSON.stringify(analyticsData.topBusinesses.slice(0, 5), null, 2)}

Provide 8-12 diverse insights covering:
- Revenue optimization opportunities
- Subscription plan performance and upsell opportunities
- Booking conversion and completion rates
- User engagement and growth patterns
- Business activation and retention
- Competitive positioning
- Operational efficiency
- Risk factors and warnings

Return ONLY valid JSON (no markdown, no code blocks):
{
  "insights": [
    {
      "title": "Brief, compelling title",
      "description": "Detailed 2-3 sentence insight with specific numbers",
      "type": "positive|warning|critical|neutral",
      "priority": "high|medium|low",
      "recommendation": "Specific, actionable recommendation with expected impact"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2500
      });

      const content = response.choices[0].message.content.trim();
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Error generating insights:', error);
      return { insights: [] };
    }
  }

  /**
   * Generate revenue forecast for next 3 months
   */
  async generateRevenueForecast(revenueTrends) {
    try {
      const revenueData = revenueTrends.map(r => ({
        month: r.month,
        total: parseFloat(r.total_revenue || 0),
        subscription: parseFloat(r.subscription_revenue || 0),
        commission: parseFloat(r.commission_revenue || 0)
      }));

      const prompt = `You are a financial forecasting expert for Itiyum, a hospitality subscription platform.

REVENUE STREAMS:
1. Subscription Revenue: Businesses pay monthly ($0, $29.99, $79.99, $199.99)
2. Commission Revenue: $5 per completed booking
3. Ad Revenue: Not yet implemented

HISTORICAL DATA (Last 12 months):
${JSON.stringify(revenueData, null, 2)}

Analyze trends, seasonality, and growth patterns to predict the next 3 months. Consider:
- Month-over-month growth rates
- Seasonal patterns in hospitality industry
- Subscription vs commission revenue balance
- Potential growth drivers and risks

Return ONLY valid JSON (no markdown, no code blocks):
{
  "forecast": [
    {
      "month": "Month name (e.g., December 2025)",
      "predicted_total": number,
      "predicted_subscription": number,
      "predicted_commission": number,
      "confidence": "high|medium|low",
      "reasoning": "Detailed 2-3 sentence explanation of prediction factors"
    }
  ],
  "trend": "growing|stable|declining",
  "growth_rate": number (percentage, e.g., 15.5 for 15.5% growth)
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 1500
      });

      const content = response.choices[0].message.content.trim();
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Error generating forecast:', error);
      return { forecast: [], trend: 'stable', growth_rate: 0 };
    }
  }

  /**
   * Detect anomalies in platform metrics
   */
  async detectAnomalies(analyticsData) {
    try {
      const prompt = `You are a data anomaly detection expert for Itiyum, a hospitality subscription platform.

Analyze these comprehensive metrics and identify 3-6 unusual patterns, anomalies, or concerning trends:

USER GROWTH TRENDS:
${JSON.stringify(analyticsData.userGrowth, null, 2)}

BOOKING TRENDS:
${JSON.stringify(analyticsData.bookingTrends, null, 2)}

REVENUE TRENDS:
${JSON.stringify(analyticsData.revenueTrends, null, 2)}

SUBSCRIPTION DISTRIBUTION:
${JSON.stringify(analyticsData.subscriptionPlans, null, 2)}

CURRENT STATISTICS:
- Total Users: ${analyticsData.statistics.total_users}
- Active Businesses: ${analyticsData.statistics.active_businesses}
- Pending Businesses: ${analyticsData.statistics.pending_businesses}
- Total Bookings: ${analyticsData.statistics.total_bookings}
- Cancelled Bookings: ${analyticsData.statistics.cancelled_bookings}
- Booking Conversion: ${(analyticsData.conversionMetrics.booking_conversion * 100).toFixed(1)}%

Look for:
- Sudden drops or spikes in any metric
- Unusual month-over-month changes (>30%)
- Declining trends that need attention
- Imbalances between metrics (e.g., users growing but bookings declining)
- High cancellation rates
- Low conversion rates
- Revenue not matching user/booking growth

Return ONLY valid JSON (no markdown, no code blocks):
{
  "anomalies": [
    {
      "metric": "Specific metric name",
      "description": "Detailed 2-3 sentence description of what's unusual with specific numbers",
      "severity": "high|medium|low",
      "impact": "Detailed explanation of business impact and potential revenue/user loss",
      "suggested_action": "Specific, actionable steps to investigate and resolve"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content.trim();
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return { anomalies: [] };
    }
  }
}

module.exports = new AnalyticsAIService();

