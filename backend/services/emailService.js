/**
 * Email Service for Itiyum
 * Handles sending transactional emails using nodemailer with Gmail SMTP
 */

const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send booking confirmation email to customer
 */
async function sendBookingConfirmation(booking, businessName) {
  const transporter = createTransporter();
  
  const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedTime = booking.booking_time;
  
  const mailOptions = {
    from: `"Itiyum" <${process.env.SMTP_USER}>`,
    to: booking.contact_email,
    subject: `Booking Confirmed - ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ff8c00 0%, #ff6b35 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Itiyum</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Your Table is Reserved</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px;">Booking Confirmed! ✅</h2>
                    <p style="margin: 0 0 25px; color: #666666; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${booking.contact_name}</strong>,<br><br>
                      Your reservation at <strong>${businessName}</strong> has been confirmed. Here are your booking details:
                    </p>
                    
                    <!-- Booking Details Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf5f0; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                      <tr>
                        <td>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e8e0d8;">
                                <span style="color: #888888; font-size: 13px;">Booking Reference</span><br>
                                <strong style="color: #ff8c00; font-size: 18px;">${booking.booking_reference}</strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e8e0d8;">
                                <span style="color: #888888; font-size: 13px;">Date & Time</span><br>
                                <strong style="color: #1a1a1a; font-size: 16px;">${formattedDate} at ${formattedTime}</strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e8e0d8;">
                                <span style="color: #888888; font-size: 13px;">Party Size</span><br>
                                <strong style="color: #1a1a1a; font-size: 16px;">${booking.party_size} ${booking.party_size === 1 ? 'Guest' : 'Guests'}</strong>
                              </td>
                            </tr>
                            ${booking.occasion ? `
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e8e0d8;">
                                <span style="color: #888888; font-size: 13px;">Occasion</span><br>
                                <strong style="color: #1a1a1a; font-size: 16px;">${booking.occasion}</strong>
                              </td>
                            </tr>
                            ` : ''}
                            ${booking.special_requests ? `
                            <tr>
                              <td style="padding: 12px 0;">
                                <span style="color: #888888; font-size: 13px;">Special Requests</span><br>
                                <span style="color: #1a1a1a; font-size: 14px;">${booking.special_requests}</span>
                              </td>
                            </tr>
                            ` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 0 0 15px; color: #666666; font-size: 14px; line-height: 1.6;">
                      The restaurant may contact you to confirm additional details. Please arrive on time to ensure your table is ready.
                    </p>
                    
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      Need to make changes? You can manage your booking through your Itiyum account or contact the restaurant directly.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1a1a1a; padding: 25px 30px; text-align: center;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; font-weight: 600;">Itiyum</p>
                    <p style="margin: 0; color: #888888; font-size: 12px;">Discover. Book. Enjoy.</p>
                    <p style="margin: 15px 0 0; color: #666666; font-size: 11px;">
                      © ${new Date().getFullYear()} Itiyum (Pty) Ltd. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Booking confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending booking confirmation email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendBookingConfirmation
};

