import nodemailer from 'nodemailer';

// Create reusable transporter
export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify transporter configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email server verification failed:', error);
    return false;
  }
}

// Send verification email
export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Resume Builder'}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: bold;">Verify Your Email</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 20px 40px;">
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        Thank you for signing up! Please verify your email address by clicking the button below.
                      </p>
                      <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        This link will expire in 24 hours.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Button -->
                  <tr>
                    <td align="center" style="padding: 0 40px 40px 40px;">
                      <table role="presentation" style="border-collapse: collapse;">
                        <tr>
                          <td style="border-radius: 6px; background-color: #000000;">
                            <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                              Verify Email
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Alternative Link -->
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px; line-height: 1.6;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="margin: 0; color: #666666; font-size: 14px; word-break: break-all;">
                        ${verificationUrl}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f8f8f8; border-top: 1px solid #eeeeee; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                        If you didn't create an account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `
      Verify Your Email
      
      Thank you for signing up! Please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, you can safely ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Resume Builder'}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 20px 40px;">
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to create a new password.
                      </p>
                      <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        This link will expire in 1 hour.
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td align="center" style="padding: 0 40px 40px 40px;">
                      <table role="presentation" style="border-collapse: collapse;">
                        <tr>
                          <td style="border-radius: 6px; background-color: #000000;">
                            <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px; line-height: 1.6;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="margin: 0; color: #666666; font-size: 14px; word-break: break-all;">
                        ${resetUrl}
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f8f8f8; border-top: 1px solid #eeeeee; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                        If you didn't request a password reset, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `
      Reset Your Password
      
      We received a request to reset your password. Click the link below to create a new password:
      
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, you can safely ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}
