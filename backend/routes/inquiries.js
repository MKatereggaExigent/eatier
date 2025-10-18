const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all inquiries for a recipient (user/business)
router.get('/:recipientId', async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { status, type, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM contact_inquiries
      WHERE recipient_id = $1
    `;
    
    const params = [recipientId];
    
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    
    if (type) {
      query += ` AND inquiry_type = $${params.length + 1}`;
      params.push(type);
    }
    
    if (priority) {
      query += ` AND priority = $${params.length + 1}`;
      params.push(priority);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM contact_inquiries WHERE recipient_id = $1
    `, [recipientId]);
    
    res.json({
      inquiries: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
    
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

// Get single inquiry
router.get('/:recipientId/:inquiryId', async (req, res) => {
  try {
    const { recipientId, inquiryId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM contact_inquiries
      WHERE id = $1 AND recipient_id = $2
    `, [inquiryId, recipientId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    
    // Mark as read if it's pending
    if (result.rows[0].status === 'pending') {
      await pool.query(`
        UPDATE contact_inquiries
        SET status = 'read', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [inquiryId]);
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    res.status(500).json({ error: 'Failed to fetch inquiry' });
  }
});

// Create new inquiry
router.post('/', async (req, res) => {
  try {
    const {
      recipientId,
      inquirerName,
      inquirerEmail,
      inquirerPhone,
      subject,
      message,
      inquiryType,
      priority,
      tags
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO contact_inquiries (
        recipient_id, inquirer_name, inquirer_email, inquirer_phone,
        subject, message, inquiry_type, priority, tags, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      recipientId, inquirerName, inquirerEmail, inquirerPhone,
      subject, message, inquiryType || 'general', priority || 'normal',
      tags || [], 'pending'
    ]);
    
    // Check for auto-response
    const autoResponseResult = await pool.query(`
      SELECT * FROM auto_response_templates
      WHERE user_id = $1 AND is_active = true
    `, [recipientId]);
    
    if (autoResponseResult.rows.length > 0) {
      // TODO: Send auto-response email
      console.log('Auto-response would be sent here');
    }
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({ error: 'Failed to create inquiry' });
  }
});

// Update inquiry status
router.patch('/:inquiryId/status', async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { status } = req.body;
    
    let query = `
      UPDATE contact_inquiries
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    
    const params = [status];
    
    if (status === 'replied') {
      query += `, replied_at = CURRENT_TIMESTAMP`;
    } else if (status === 'resolved') {
      query += `, resolved_at = CURRENT_TIMESTAMP`;
    } else if (status === 'archived') {
      query += `, archived_at = CURRENT_TIMESTAMP`;
    }
    
    query += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(inquiryId);
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    res.status(500).json({ error: 'Failed to update inquiry status' });
  }
});

// Update inquiry priority
router.patch('/:inquiryId/priority', async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { priority } = req.body;
    
    const result = await pool.query(`
      UPDATE contact_inquiries
      SET priority = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [priority, inquiryId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error updating inquiry priority:', error);
    res.status(500).json({ error: 'Failed to update inquiry priority' });
  }
});

// Reply to inquiry
router.post('/:inquiryId/reply', async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { replyMessage } = req.body;
    
    const result = await pool.query(`
      UPDATE contact_inquiries
      SET 
        reply_message = $1,
        status = 'replied',
        replied_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [replyMessage, inquiryId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    
    // TODO: Send email notification to inquirer
    console.log('Reply email would be sent here');
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error replying to inquiry:', error);
    res.status(500).json({ error: 'Failed to reply to inquiry' });
  }
});

// Delete inquiry
router.delete('/:inquiryId', async (req, res) => {
  try {
    const { inquiryId } = req.params;
    
    const result = await pool.query(`
      DELETE FROM contact_inquiries
      WHERE id = $1
      RETURNING id
    `, [inquiryId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    
    res.json({ message: 'Inquiry deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({ error: 'Failed to delete inquiry' });
  }
});

// Get auto-response templates for a user
router.get('/auto-response/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM auto_response_templates
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching auto-response templates:', error);
    res.status(500).json({ error: 'Failed to fetch auto-response templates' });
  }
});

// Create or update auto-response template
router.post('/auto-response', async (req, res) => {
  try {
    const {
      userId,
      templateName,
      templateText,
      isActive,
      triggerInquiryTypes,
      triggerKeywords,
      triggerTimeStart,
      triggerTimeEnd,
      triggerDaysOfWeek
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO auto_response_templates (
        user_id, template_name, template_text, is_active,
        trigger_inquiry_types, trigger_keywords, trigger_time_start,
        trigger_time_end, trigger_days_of_week
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      userId, templateName, templateText, isActive,
      triggerInquiryTypes, triggerKeywords, triggerTimeStart,
      triggerTimeEnd, triggerDaysOfWeek
    ]);
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Error creating auto-response template:', error);
    res.status(500).json({ error: 'Failed to create auto-response template' });
  }
});

// Get inquiry statistics
router.get('/stats/:recipientId', async (req, res) => {
  try {
    const { recipientId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'read') as read,
        COUNT(*) FILTER (WHERE status = 'replied') as replied,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent,
        COUNT(*) FILTER (WHERE priority = 'high') as high,
        COUNT(*) FILTER (WHERE follow_up_required = true) as follow_up_required
      FROM contact_inquiries
      WHERE recipient_id = $1
    `, [recipientId]);
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error fetching inquiry statistics:', error);
    res.status(500).json({ error: 'Failed to fetch inquiry statistics' });
  }
});

module.exports = router;

