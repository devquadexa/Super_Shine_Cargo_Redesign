const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.host = process.env.SMTP_HOST || 'smtp.gmail.com';
    this.port = parseInt(process.env.SMTP_PORT, 10) || 587;
    this.secure = process.env.SMTP_SECURE === 'true' || this.port === 465;
    this.user = process.env.SMTP_USER || '';
    this.pass = process.env.SMTP_PASS || '';
    this.from = process.env.EMAIL_FROM || '"Super Shine Cargo Services" <info@supershinecargo.com>';
  }

  isConfigured() {
    return Boolean(this.user && this.pass && this.user.trim() !== '' && this.pass.trim() !== '');
  }

  getTransporter() {
    if (!this.isConfigured()) return null;

    return nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: {
        user: this.user,
        pass: this.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  formatCurrency(amount) {
    return 'LKR ' + parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  async sendAdvancePaymentRequestEmail({
    to,
    customerName,
    jobId,
    blNumber,
    cusdecNumber,
    requestedAmount,
    notes,
    requesterName
  }) {
    const formattedAmount = this.formatCurrency(requestedAmount);
    const subject = `Advance Payment Request - Job #${jobId} | Super Shine Cargo Services`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fb; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1E3F63 0%, #2f6bd6 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 0; font-size: 13px; opacity: 0.85; letter-spacing: 1px; text-transform: uppercase; }
    .content { padding: 30px 24px; }
    .badge { display: inline-block; background-color: #ecfdf5; color: #047857; font-weight: 600; font-size: 12px; padding: 4px 12px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 16px; text-transform: uppercase; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
    .intro { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .highlight-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .details-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .details-table td { padding: 8px 0; }
    .details-table .label { color: #64748b; width: 40%; font-weight: 500; }
    .details-table .value { color: #0f172a; font-weight: 600; }
    .amount-row td { padding-top: 14px; border-top: 1px dashed #cbd5e1; }
    .amount-row .label { font-size: 15px; font-weight: 700; color: #1e3f63; }
    .amount-row .value { font-size: 18px; font-weight: 800; color: #059669; }
    .bank-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 13px; line-height: 1.5; color: #1e40af; }
    .bank-box strong { color: #1e3a8a; }
    .notes-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 13px; color: #92400e; }
    .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SUPER SHINE CARGO SERVICES</h1>
      <p>Clearing & Forwarding Agents</p>
    </div>
    
    <div class="content">
      <div class="badge">Payment Request</div>
      <div class="greeting">Dear ${customerName || 'Valued Customer'},</div>
      <p class="intro">
        We would like to request an advance payment for the clearance and handling of your shipment. Please find the job and payment details outlined below:
      </p>

      <div class="highlight-card">
        <table class="details-table">
          <tr>
            <td class="label">Job ID:</td>
            <td class="value">${jobId}</td>
          </tr>
          ${blNumber ? `<tr><td class="label">B/L Number:</td><td class="value">${blNumber}</td></tr>` : ''}
          ${cusdecNumber ? `<tr><td class="label">Cusdec Number:</td><td class="value">${cusdecNumber}</td></tr>` : ''}
          <tr class="amount-row">
            <td class="label">Advance Requested:</td>
            <td class="value">${formattedAmount}</td>
          </tr>
        </table>
      </div>

      ${notes ? `
      <div class="notes-box">
        <strong>Notes / Reason:</strong><br>
        ${notes}
      </div>` : ''}

      <div class="bank-box">
        <strong>Bank Account Details for Payment:</strong><br><br>
        <strong>Bank:</strong> Commercial Bank of Ceylon<br>
        <strong>Account Name:</strong> Super Shine Cargo Services (Pvt) Ltd<br>
        <strong>Account Number:</strong> 100012345678<br>
        <strong>Branch:</strong> Colombo Main Branch<br>
        <strong>Reference / Narration:</strong> ${jobId}
      </div>

      <p class="intro" style="margin-bottom: 0;">
        Once the transfer or deposit is made, please share the payment confirmation or slip with us so we can verify and update your job records immediately.
      </p>
    </div>

    <div class="footer">
      <p><strong>Super Shine Cargo Services</strong></p>
      <p>No 04, Marine Drive, Colombo 01, Sri Lanka</p>
      <p>Tel: +94 11 244 5566 | Email: info@supershinecargo.com</p>
      <p style="margin-top: 8px; color: #94a3b8; font-size: 11px;">This is an automated notification. If you have any questions, please contact our accounts department.</p>
    </div>
  </div>
</body>
</html>
`;

    const textContent = `
SUPER SHINE CARGO SERVICES
Clearing & Forwarding Agents

ADVANCE PAYMENT REQUEST
Job ID: ${jobId}
Customer: ${customerName || 'Customer'}
${blNumber ? `B/L Number: ${blNumber}\n` : ''}${cusdecNumber ? `Cusdec Number: ${cusdecNumber}\n` : ''}
Requested Advance Amount: ${formattedAmount}
${notes ? `Notes: ${notes}\n` : ''}

Bank Details:
Bank: Commercial Bank of Ceylon
Account Name: Super Shine Cargo Services (Pvt) Ltd
Account Number: 100012345678
Branch: Colombo Main Branch
Reference: ${jobId}

Once paid, please reply with payment receipt or confirmation.
Super Shine Cargo Services
Tel: +94 11 244 5566 | Email: info@supershinecargo.com
`;

    if (!this.isConfigured()) {
      console.log(`\n==================================================`);
      console.log(`📨 [EmailService] SMTP credentials not set. Simulated Email Send:`);
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Amount: ${formattedAmount}`);
      console.log(`   JobId: ${jobId}`);
      console.log(`==================================================\n`);
      return {
        sent: false,
        simulated: true,
        message: 'SMTP credentials are not configured in .env. Request was created and email was simulated in console.'
      };
    }

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: this.from,
        to,
        subject,
        text: textContent,
        html: htmlContent
      });

      console.log('✅ [EmailService] Advance payment request email sent:', info.messageId);
      return {
        sent: true,
        simulated: false,
        messageId: info.messageId,
        message: 'Email sent successfully to customer.'
      };
    } catch (err) {
      console.error('⚠️ [EmailService] Failed to send email via SMTP:', err.message);
      return {
        sent: false,
        simulated: false,
        error: err.message,
        message: `Failed to deliver email: ${err.message}. Request recorded in system.`
      };
    }
  }
}

module.exports = new EmailService();
