import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const sesClient = new SESv2Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

interface EmailParams {
    to: string;
    subject: string;
    htmlBody: string;
}

export async function sendTransactionalEmail({ to, subject, htmlBody }: EmailParams) {
    const command = new SendEmailCommand({
        FromEmailAddress: process.env.EMAIL_FROM,
        Destination: {
            ToAddresses: [to],
            BccAddresses: process.env.EMAIL_BCC_TRACKING ? [process.env.EMAIL_BCC_TRACKING] : [],
        },
        ReplyToAddresses: process.env.EMAIL_REPLY_TO ? [process.env.EMAIL_REPLY_TO] : [],
        Content: {
            Simple: {
                Subject: { Data: subject },
                Body: { Html: { Data: htmlBody } },
            },
        },
    });

    try {
        const response = await sesClient.send(command);
        console.log("Email sent successfully:", response.MessageId);
        return { success: true, messageId: response.MessageId };
    } catch (error) {
        console.error("Error sending email via SES:", error);
        throw error;
    }
}

export async function sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

    const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #333333; margin-bottom: 20px;">Verify Your Email</h1>
          <p style="color: #666666; line-height: 1.6;">Thank you for signing up! Please verify your email address by clicking the button below.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
          </div>
          <p style="color: #999999; font-size: 14px;">Or copy this link: ${verificationUrl}</p>
          <p style="color: #999999; font-size: 12px; margin-top: 30px;">This link expires in 24 hours.</p>
        </div>
      </body>
    </html>
  `;

    return sendTransactionalEmail({
        to: email,
        subject: "Verify Your Email Address",
        htmlBody,
    });
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #333333; margin-bottom: 20px;">Reset Your Password</h1>
          <p style="color: #666666; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #999999; font-size: 14px;">Or copy this link: ${resetUrl}</p>
          <p style="color: #999999; font-size: 12px; margin-top: 30px;">This link expires in 1 hour.</p>
        </div>
      </body>
    </html>
  `;

    return sendTransactionalEmail({
        to: email,
        subject: "Reset Your Password",
        htmlBody,
    });
}

export async function sendContactFormEmail(name: string, email: string, subject: string, message: string) {
    // This email goes to the admin (EMAIL_USER or hello@shortlistai.xyz)
    // But based on requirements, "Reply handling goes to hello@shortlistai.xyz"
    // And "From" is noreply.
    // So we send TO hello@shortlistai.xyz (or whatever is configured as admin email)
    // And Reply-To is the user's email.

    // Wait, the requirement says "Reply handling goes to hello@shortlistai.xyz". 
    // This usually means if the USER replies to a system email, it goes there.
    // For the contact form, the ADMIN receives the email. If the admin replies, it should go to the USER.

    // Let's follow the previous logic but use SES.
    // The previous logic sent email TO process.env.EMAIL_USER.
    // Let's assume EMAIL_REPLY_TO (hello@shortlistai.xyz) is the admin email for now, or we use a specific env var.
    // The user said: "Reply handling goes to hello@shortlistai.xyz".
    // And "EMAIL_REPLY_TO=hello@shortlistai.xyz".

    // For contact form:
    // To: hello@shortlistai.xyz (The business)
    // From: noreply@mail.shortlistai.xyz (The system)
    // Reply-To: user@example.com (The user who filled the form)

    const adminEmail = process.env.EMAIL_REPLY_TO || "hello@shortlistai.xyz";

    const command = new SendEmailCommand({
        FromEmailAddress: process.env.EMAIL_FROM,
        Destination: {
            ToAddresses: [adminEmail],
            BccAddresses: process.env.EMAIL_BCC_TRACKING ? [process.env.EMAIL_BCC_TRACKING] : [],
        },
        ReplyToAddresses: [email], // User's email so admin can reply directly
        Content: {
            Simple: {
                Subject: { Data: `Contact Form: ${subject}` },
                Body: {
                    Html: {
                        Data: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                  New Contact Form Submission
                </h2>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Name:</strong> ${name}</p>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Subject:</strong> ${subject}</p>
                </div>
                
                <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h3 style="color: #333; margin-top: 0;">Message:</h3>
                  <p style="line-height: 1.6; color: #555;">${message.replace(/\n/g, '<br>')}</p>
                </div>
              </div>
            `
                    }
                },
            },
        },
    });

    try {
        const response = await sesClient.send(command);
        console.log("Contact email sent successfully:", response.MessageId);
        return { success: true, messageId: response.MessageId };
    } catch (error) {
        console.error("Error sending contact email via SES:", error);
        throw error;
    }
}
