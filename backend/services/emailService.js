/**
 * Email Service for Itiyum
 * Professional transactional email system using nodemailer with Gmail SMTP
 *
 * Features:
 * - Modern, responsive email templates
 * - Consistent branding across all emails
 * - Professional headers, footers, and signatures
 */

const nodemailer = require('nodemailer');

// Brand Configuration
const BRAND = {
  name: 'Itiyum',
  tagline: 'Discover. Book. Enjoy.',
  website: 'https://itiyum.com',
  supportEmail: 'support@itiyum.com',
  phone: '+27 11 000 0000',
  address: 'Johannesburg, South Africa',
  socialLinks: {
    facebook: 'https://facebook.com/itiyum',
    instagram: 'https://instagram.com/itiyum',
    twitter: 'https://twitter.com/itiyum',
    linkedin: 'https://linkedin.com/company/itiyum'
  },
  colors: {
    primary: '#ff8c00',
    primaryDark: '#e67e00',
    secondary: '#1a1a1a',
    accent: '#ff6b35',
    text: '#333333',
    textLight: '#666666',
    textMuted: '#999999',
    background: '#f8f9fa',
    white: '#ffffff',
    border: '#e5e7eb',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }
};

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Generate the email header with logo and branding
 */
const generateHeader = (subtitle = '') => `
  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${subtitle} - ${BRAND.tagline}
  </div>

  <!-- Header -->
  <tr>
    <td style="padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.accent} 100%);">
        <tr>
          <td style="padding: 40px 40px 35px; text-align: center;">
            <!-- Logo -->
            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="background: ${BRAND.colors.white}; border-radius: 12px; padding: 12px 20px;">
                  <span style="font-family: 'Georgia', serif; font-size: 28px; font-weight: 700; color: ${BRAND.colors.primary}; letter-spacing: -0.5px;">🍽️ ${BRAND.name}</span>
                </td>
              </tr>
            </table>
            ${subtitle ? `<p style="margin: 20px 0 0; color: rgba(255,255,255,0.95); font-size: 16px; font-weight: 500; letter-spacing: 0.5px;">${subtitle}</p>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>
`;

/**
 * Generate the email footer with signature, social links, and legal info
 */
const generateFooter = () => `
  <!-- Signature Section -->
  <tr>
    <td style="padding: 30px 40px; background: ${BRAND.colors.background}; border-top: 1px solid ${BRAND.colors.border};">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin: 0 0 5px; font-size: 14px; color: ${BRAND.colors.text}; font-weight: 600;">Warm regards,</p>
            <p style="margin: 0 0 15px; font-size: 16px; color: ${BRAND.colors.primary}; font-weight: 700;">The ${BRAND.name} Team</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right: 15px; border-right: 1px solid ${BRAND.colors.border};">
                  <p style="margin: 0; font-size: 12px; color: ${BRAND.colors.textMuted};">
                    <span style="color: ${BRAND.colors.primary};">📧</span> ${BRAND.supportEmail}
                  </p>
                </td>
                <td style="padding-left: 15px;">
                  <p style="margin: 0; font-size: 12px; color: ${BRAND.colors.textMuted};">
                    <span style="color: ${BRAND.colors.primary};">🌐</span> ${BRAND.website}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Social Links -->
  <tr>
    <td style="padding: 25px 40px; background: ${BRAND.colors.secondary}; text-align: center;">
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="padding: 0 8px;">
            <a href="${BRAND.socialLinks.facebook}" style="display: inline-block; width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 50%; text-align: center; line-height: 36px; text-decoration: none; font-size: 16px;">📘</a>
          </td>
          <td style="padding: 0 8px;">
            <a href="${BRAND.socialLinks.instagram}" style="display: inline-block; width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 50%; text-align: center; line-height: 36px; text-decoration: none; font-size: 16px;">📸</a>
          </td>
          <td style="padding: 0 8px;">
            <a href="${BRAND.socialLinks.twitter}" style="display: inline-block; width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 50%; text-align: center; line-height: 36px; text-decoration: none; font-size: 16px;">🐦</a>
          </td>
          <td style="padding: 0 8px;">
            <a href="${BRAND.socialLinks.linkedin}" style="display: inline-block; width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 50%; text-align: center; line-height: 36px; text-decoration: none; font-size: 16px;">💼</a>
          </td>
        </tr>
      </table>

      <p style="margin: 20px 0 0; color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 500;">
        ${BRAND.tagline}
      </p>
    </td>
  </tr>

  <!-- Legal Footer -->
  <tr>
    <td style="padding: 20px 40px; background: #111111; text-align: center;">
      <p style="margin: 0 0 10px; color: rgba(255,255,255,0.5); font-size: 11px; line-height: 1.6;">
        © ${new Date().getFullYear()} ${BRAND.name} (Pty) Ltd. All rights reserved.<br>
        ${BRAND.address}
      </p>
      <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 10px;">
        <a href="${BRAND.website}/legal/privacy" style="color: rgba(255,255,255,0.5); text-decoration: underline;">Privacy Policy</a>
        &nbsp;•&nbsp;
        <a href="${BRAND.website}/legal/terms" style="color: rgba(255,255,255,0.5); text-decoration: underline;">Terms of Service</a>
        &nbsp;•&nbsp;
        <a href="${BRAND.website}/help" style="color: rgba(255,255,255,0.5); text-decoration: underline;">Help Center</a>
      </p>
    </td>
  </tr>
`;

/**
 * Generate base email wrapper
 */
const generateEmailWrapper = (content, previewText = '') => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${BRAND.name}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }

    /* Responsive styles */
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; margin-left: auto !important; margin-right: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
      .padding-mobile { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.colors.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Preview text -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${previewText}
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.colors.background};">
    <tr>
      <td style="padding: 40px 20px;">
        <center style="width: 100%;">

          <!-- Email container -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin: 0 auto; background-color: ${BRAND.colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            ${content}
          </table>

        </center>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Generate a styled button
 */
const generateButton = (text, url, style = 'primary') => {
  const bgColor = style === 'primary' ? BRAND.colors.primary : BRAND.colors.secondary;
  const hoverColor = style === 'primary' ? BRAND.colors.primaryDark : '#333333';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 25px auto;">
      <tr>
        <td style="border-radius: 8px; background: ${bgColor};">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.colors.white}; text-decoration: none; border-radius: 8px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Generate an info card row
 */
const generateInfoRow = (label, value, isLast = false) => `
  <tr>
    <td style="padding: 14px 20px; border-bottom: ${isLast ? 'none' : `1px solid ${BRAND.colors.border}`};">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="width: 40%; vertical-align: top;">
            <span style="font-size: 13px; color: ${BRAND.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">${label}</span>
          </td>
          <td style="width: 60%; vertical-align: top; text-align: right;">
            <span style="font-size: 15px; color: ${BRAND.colors.text}; font-weight: 600;">${value}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
`;

/**
 * Send booking confirmation email to customer
 */
async function sendBookingConfirmation(booking, businessName) {
  const transporter = createTransporter();

  const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = booking.booking_time;
  const previewText = `Your reservation at ${businessName} is confirmed for ${formattedDate} at ${formattedTime}`;

  const emailContent = `
    ${generateHeader('Reservation Confirmed')}

    <!-- Main Content -->
    <tr>
      <td style="padding: 45px 40px;" class="padding-mobile">

        <!-- Success Icon -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 25px;">
          <tr>
            <td style="width: 70px; height: 70px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; text-align: center; vertical-align: middle;">
              <span style="font-size: 32px; line-height: 70px;">✓</span>
            </td>
          </tr>
        </table>

        <!-- Greeting -->
        <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: ${BRAND.colors.secondary}; text-align: center; font-family: 'Georgia', serif;">
          You're All Set!
        </h1>
        <p style="margin: 0 0 30px; font-size: 16px; color: ${BRAND.colors.textLight}; text-align: center; line-height: 1.6;">
          Hi <strong style="color: ${BRAND.colors.text};">${booking.contact_name}</strong>, your table at <strong style="color: ${BRAND.colors.primary};">${businessName}</strong> has been confirmed.
        </p>

        <!-- Booking Details Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #fefefe 0%, #f9fafb 100%); border: 1px solid ${BRAND.colors.border}; border-radius: 12px; overflow: hidden; margin-bottom: 30px;">

          <!-- Card Header -->
          <tr>
            <td style="padding: 20px; background: ${BRAND.colors.secondary}; text-align: center;">
              <span style="font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px;">Booking Reference</span>
              <p style="margin: 8px 0 0; font-size: 24px; font-weight: 700; color: ${BRAND.colors.primary}; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                ${booking.booking_reference}
              </p>
            </td>
          </tr>

          <!-- Card Body -->
          ${generateInfoRow('📅 Date', formattedDate)}
          ${generateInfoRow('🕐 Time', formattedTime)}
          ${generateInfoRow('👥 Party Size', `${booking.party_size} ${booking.party_size === 1 ? 'Guest' : 'Guests'}`)}
          ${booking.occasion ? generateInfoRow('🎉 Occasion', booking.occasion) : ''}
          ${booking.special_requests ? generateInfoRow('📝 Special Requests', booking.special_requests, true) : generateInfoRow('📍 Restaurant', businessName, true)}
        </table>

        <!-- CTA Button -->
        ${generateButton('View My Booking', `${BRAND.website}/booking/${booking.booking_reference}`)}

        <!-- Tips Section -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #fffbeb; border-radius: 12px; border-left: 4px solid ${BRAND.colors.warning}; margin-top: 30px;">
          <tr>
            <td style="padding: 20px 25px;">
              <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: ${BRAND.colors.text};">
                💡 Helpful Tips
              </p>
              <ul style="margin: 0; padding-left: 20px; color: ${BRAND.colors.textLight}; font-size: 14px; line-height: 1.8;">
                <li>Please arrive 5-10 minutes before your reservation time</li>
                <li>The restaurant will hold your table for 15 minutes</li>
                <li>Need to cancel? Please do so at least 2 hours in advance</li>
              </ul>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    ${generateFooter()}
  `;

  const mailOptions = {
    from: `"${BRAND.name}" <${process.env.SMTP_USER}>`,
    to: booking.contact_email,
    subject: `✅ Booking Confirmed at ${businessName} - ${formattedDate}`,
    html: generateEmailWrapper(emailContent, previewText)
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

/**
 * Send welcome email to new users
 */
async function sendWelcomeEmail(user) {
  const transporter = createTransporter();
  const previewText = `Welcome to ${BRAND.name}! Your culinary journey begins now.`;

  const emailContent = `
    ${generateHeader('Welcome to Itiyum')}

    <!-- Main Content -->
    <tr>
      <td style="padding: 45px 40px;" class="padding-mobile">

        <!-- Welcome Icon -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 25px;">
          <tr>
            <td style="width: 80px; height: 80px; background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.accent} 100%); border-radius: 50%; text-align: center; vertical-align: middle;">
              <span style="font-size: 40px; line-height: 80px;">🎉</span>
            </td>
          </tr>
        </table>

        <!-- Greeting -->
        <h1 style="margin: 0 0 10px; font-size: 32px; font-weight: 700; color: ${BRAND.colors.secondary}; text-align: center; font-family: 'Georgia', serif;">
          Welcome, ${user.firstName}!
        </h1>
        <p style="margin: 0 0 30px; font-size: 17px; color: ${BRAND.colors.textLight}; text-align: center; line-height: 1.7;">
          We're thrilled to have you join the ${BRAND.name} community. Get ready to discover amazing restaurants, book unforgettable dining experiences, and connect with culinary experts.
        </p>

        <!-- Features Grid -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
          <tr>
            <td style="padding: 20px; background: ${BRAND.colors.background}; border-radius: 12px; text-align: center; width: 33%;">
              <span style="font-size: 36px; display: block; margin-bottom: 10px;">🍽️</span>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${BRAND.colors.text};">Discover</p>
              <p style="margin: 5px 0 0; font-size: 12px; color: ${BRAND.colors.textMuted};">Find top restaurants</p>
            </td>
            <td style="width: 15px;"></td>
            <td style="padding: 20px; background: ${BRAND.colors.background}; border-radius: 12px; text-align: center; width: 33%;">
              <span style="font-size: 36px; display: block; margin-bottom: 10px;">📅</span>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${BRAND.colors.text};">Book</p>
              <p style="margin: 5px 0 0; font-size: 12px; color: ${BRAND.colors.textMuted};">Reserve your table</p>
            </td>
            <td style="width: 15px;"></td>
            <td style="padding: 20px; background: ${BRAND.colors.background}; border-radius: 12px; text-align: center; width: 33%;">
              <span style="font-size: 36px; display: block; margin-bottom: 10px;">⭐</span>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${BRAND.colors.text};">Enjoy</p>
              <p style="margin: 5px 0 0; font-size: 12px; color: ${BRAND.colors.textMuted};">Share your experience</p>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        ${generateButton('Start Exploring', `${BRAND.website}/restaurants`)}

      </td>
    </tr>

    ${generateFooter()}
  `;

  const mailOptions = {
    from: `"${BRAND.name}" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `🎉 Welcome to ${BRAND.name}, ${user.firstName}!`,
    html: generateEmailWrapper(emailContent, previewText)
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmation(payment) {
  const transporter = createTransporter();
  const previewText = `Payment of R${payment.amount.toFixed(2)} confirmed - ${BRAND.name}`;

  const emailContent = `
    ${generateHeader('Payment Confirmed')}

    <!-- Main Content -->
    <tr>
      <td style="padding: 45px 40px;" class="padding-mobile">

        <!-- Success Icon -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 25px;">
          <tr>
            <td style="width: 70px; height: 70px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; text-align: center; vertical-align: middle;">
              <span style="font-size: 32px; line-height: 70px;">💳</span>
            </td>
          </tr>
        </table>

        <!-- Greeting -->
        <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: ${BRAND.colors.secondary}; text-align: center; font-family: 'Georgia', serif;">
          Payment Successful!
        </h1>
        <p style="margin: 0 0 30px; font-size: 16px; color: ${BRAND.colors.textLight}; text-align: center; line-height: 1.6;">
          Thank you for your payment. Here are your transaction details:
        </p>

        <!-- Payment Details Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #fefefe 0%, #f9fafb 100%); border: 1px solid ${BRAND.colors.border}; border-radius: 12px; overflow: hidden; margin-bottom: 30px;">

          <!-- Amount Header -->
          <tr>
            <td style="padding: 30px; background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.accent} 100%); text-align: center;">
              <span style="font-size: 12px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Amount Paid</span>
              <p style="margin: 8px 0 0; font-size: 42px; font-weight: 700; color: ${BRAND.colors.white}; font-family: 'Georgia', serif;">
                R${payment.amount.toFixed(2)}
              </p>
            </td>
          </tr>

          <!-- Details -->
          ${generateInfoRow('Reference', payment.reference)}
          ${generateInfoRow('Description', payment.description || 'Itiyum Payment')}
          ${generateInfoRow('Date', new Date().toLocaleDateString('en-ZA', { dateStyle: 'long' }))}
          ${generateInfoRow('Status', '<span style="color: #10b981; font-weight: 700;">✓ Confirmed</span>', true)}
        </table>

        <!-- CTA Button -->
        ${generateButton('View Receipt', `${BRAND.website}/dashboard/user/payments`)}

      </td>
    </tr>

    ${generateFooter()}
  `;

  const mailOptions = {
    from: `"${BRAND.name}" <${process.env.SMTP_USER}>`,
    to: payment.email,
    subject: `💳 Payment Confirmed - R${payment.amount.toFixed(2)}`,
    html: generateEmailWrapper(emailContent, previewText)
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Payment confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending payment confirmation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send subscription activation email
 */
async function sendSubscriptionEmail(subscription) {
  const transporter = createTransporter();
  const previewText = `Your ${subscription.planName} subscription is now active!`;

  const emailContent = `
    ${generateHeader('Subscription Activated')}

    <!-- Main Content -->
    <tr>
      <td style="padding: 45px 40px;" class="padding-mobile">

        <!-- Success Icon -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 25px;">
          <tr>
            <td style="width: 80px; height: 80px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 50%; text-align: center; vertical-align: middle;">
              <span style="font-size: 40px; line-height: 80px;">👑</span>
            </td>
          </tr>
        </table>

        <!-- Greeting -->
        <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: ${BRAND.colors.secondary}; text-align: center; font-family: 'Georgia', serif;">
          You're Now a ${subscription.planName} Member!
        </h1>
        <p style="margin: 0 0 30px; font-size: 16px; color: ${BRAND.colors.textLight}; text-align: center; line-height: 1.6;">
          Congratulations! Your subscription has been activated. Here's what you get:
        </p>

        <!-- Subscription Details Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #fefefe 0%, #f9fafb 100%); border: 1px solid ${BRAND.colors.border}; border-radius: 12px; overflow: hidden; margin-bottom: 30px;">

          <!-- Plan Header -->
          <tr>
            <td style="padding: 25px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); text-align: center;">
              <span style="font-size: 24px; font-weight: 700; color: ${BRAND.colors.white};">${subscription.planName}</span>
              <p style="margin: 5px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">${subscription.billingCycle} Plan</p>
            </td>
          </tr>

          <!-- Details -->
          ${generateInfoRow('Amount', `R${subscription.amount.toFixed(2)}/${subscription.billingCycle === 'yearly' ? 'year' : 'month'}`)}
          ${generateInfoRow('Start Date', new Date().toLocaleDateString('en-ZA', { dateStyle: 'long' }))}
          ${generateInfoRow('Next Billing', subscription.nextBillingDate || 'N/A', true)}
        </table>

        <!-- CTA Button -->
        ${generateButton('Manage Subscription', `${BRAND.website}/dashboard/user/subscription`)}

      </td>
    </tr>

    ${generateFooter()}
  `;

  const mailOptions = {
    from: `"${BRAND.name}" <${process.env.SMTP_USER}>`,
    to: subscription.email,
    subject: `👑 Welcome to ${subscription.planName} - Subscription Activated`,
    html: generateEmailWrapper(emailContent, previewText)
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Subscription email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending subscription email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendBookingConfirmation,
  sendWelcomeEmail,
  sendPaymentConfirmation,
  sendSubscriptionEmail,
  // Export utilities for custom emails
  generateEmailWrapper,
  generateHeader,
  generateFooter,
  generateButton,
  generateInfoRow,
  BRAND
};
