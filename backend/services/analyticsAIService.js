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
      const prompt = `You are an expert business analyst for Itiyum, a hospitality subscription platform. Analyze the following data and provide 5-7 actionable insights:

Platform Statistics:
- Total Users: ${analyticsData.statistics.total_users}
- Business Owners: ${analyticsData.statistics.business_owners}
- Active Businesses: ${analyticsData.statistics.active_businesses}
- Active Subscriptions: ${analyticsData.statistics.active_subscriptions}
- Total Bookings: ${analyticsData.statistics.total_bookings}
- Completed Bookings: ${analyticsData.statistics.completed_bookings}
- Total Revenue: $${analyticsData.statistics.total_revenue}
- Subscription Revenue: $${analyticsData.statistics.subscription_revenue}
- Commission Revenue: $${analyticsData.statistics.commission_revenue}

Conversion Metrics:
- Business Owner Conversion: ${(analyticsData.conversionMetrics.business_owner_conversion * 100).toFixed(1)}%
- Booking Conversion: ${(analyticsData.conversionMetrics.booking_conversion * 100).toFixed(1)}%
- Subscription Rate: ${(analyticsData.conversionMetrics.subscription_rate * 100).toFixed(1)}%

Provide insights in JSON format:
{
  "insights": [
    {
      "title": "Brief title",
      "description": "Detailed insight",
      "type": "positive|warning|critical|neutral",
      "priority": "high|medium|low",
      "recommendation": "Actionable recommendation"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
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

      const prompt = `You are a financial forecasting expert. Based on the following 12-month revenue data, predict the next 3 months:

${JSON.stringify(revenueData, null, 2)}

Provide forecast in JSON format:
{
  "forecast": [
    {
      "month": "Month name",
      "predicted_total": number,
      "predicted_subscription": number,
      "predicted_commission": number,
      "confidence": "high|medium|low",
      "reasoning": "Brief explanation"
    }
  ],
  "trend": "growing|stable|declining",
  "growth_rate": number (percentage)
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 1000
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
      const prompt = `You are a data anomaly detection expert. Analyze these metrics and identify any unusual patterns or anomalies:

User Growth: ${JSON.stringify(analyticsData.userGrowth)}
Booking Trends: ${JSON.stringify(analyticsData.bookingTrends)}
Revenue Trends: ${JSON.stringify(analyticsData.revenueTrends)}

Provide anomalies in JSON format:
{
  "anomalies": [
    {
      "metric": "Metric name",
      "description": "What's unusual",
      "severity": "high|medium|low",
      "impact": "Potential impact",
      "suggested_action": "What to do"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
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

