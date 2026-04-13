import { Resend } from 'resend';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[email] RESEND_API_KEY is not set — email sending will fail');
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'noreply@its-country.com';
}

export async function sendNewAccountRequestEmail(opts: {
  toEmail: string;
  username: string;
  email: string;
  userType: string;
  reviewUrl: string;
}) {
  const client = getResendClient();
  const from = getFromAddress();
  const result = await client.emails.send({
    from,
    to: opts.toEmail,
    subject: `New Account Request — ${opts.username}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #ede8df; font-family: 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ede8df; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                <!-- Header -->
                <tr>
                  <td style="background-color: #1c1612; padding: 28px 40px; border-radius: 10px 10px 0 0; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #e8c97a; letter-spacing: 1px;">It's Country</p>
                    <p style="margin: 0; font-size: 12px; color: #a89070; letter-spacing: 2px; text-transform: uppercase;">Record Label · Texas</p>
                  </td>
                </tr>

                <!-- Body card -->
                <tr>
                  <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 10px 10px;">

                    <!-- Title -->
                    <p style="margin: 0 0 6px 0; font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #1c1612;">New Access Request</p>
                    <p style="margin: 0 0 28px 0; font-size: 14px; color: #9a8a78;">Someone has applied for member access to It's Country.</p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr><td style="border-top: 1px solid #e8e0d4;"></td></tr>
                    </table>

                    <!-- Details -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0; width: 130px; font-size: 13px; color: #9a8a78; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Username</td>
                        <td style="padding: 10px 0; font-size: 15px; color: #1c1612; font-weight: 600;">${opts.username}</td>
                      </tr>
                      <tr style="border-top: 1px solid #f0e8de;">
                        <td style="padding: 10px 0; font-size: 13px; color: #9a8a78; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Email</td>
                        <td style="padding: 10px 0; font-size: 15px; color: #1c1612;">${opts.email}</td>
                      </tr>
                      <tr style="border-top: 1px solid #f0e8de;">
                        <td style="padding: 10px 0; font-size: 13px; color: #9a8a78; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Account Type</td>
                        <td style="padding: 10px 0; font-size: 15px; color: #1c1612;">${opts.userType}</td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                      <tr><td style="border-top: 1px solid #e8e0d4;"></td></tr>
                    </table>

                    <!-- CTA -->
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b5a4a;">Review this request and choose to approve or reject access.</p>
                    <a href="${opts.reviewUrl}" style="display: inline-block; background-color: #c3282e; color: #ffffff; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none; letter-spacing: 0.3px;">
                      Review This Request →
                    </a>
                    <p style="margin: 16px 0 0 0; font-size: 12px; color: #b0a090;">This link is single-use and will expire once you approve or reject the request.</p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 0; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #a09080;">It's Country Record Label &nbsp;·&nbsp; Texas &nbsp;·&nbsp; its-country.com</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
  console.log(`[email] Resend result:`, JSON.stringify(result));
}

export async function sendRequestReceivedEmail(opts: {
  toEmail: string;
  username: string;
  userType: string;
}) {
  const client = getResendClient();
  const from = getFromAddress();
  const result = await client.emails.send({
    from,
    to: opts.toEmail,
    subject: `Request Received — It's Country`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #ede8df; font-family: 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ede8df; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                <!-- Header -->
                <tr>
                  <td style="background-color: #1c1612; padding: 28px 40px; border-radius: 10px 10px 0 0; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #e8c97a; letter-spacing: 1px;">It's Country</p>
                    <p style="margin: 0; font-size: 12px; color: #a89070; letter-spacing: 2px; text-transform: uppercase;">Record Label · Texas</p>
                  </td>
                </tr>

                <!-- Body card -->
                <tr>
                  <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 10px 10px;">

                    <p style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #1c1612;">Request Received</p>
                    <p style="margin: 0 0 28px 0; font-size: 15px; color: #4a3f35; line-height: 1.6;">
                      Your account request has been submitted and is currently under review. Once approved, you'll receive access based on your account type.
                    </p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr><td style="border-top: 1px solid #e8e0d4;"></td></tr>
                    </table>

                    <!-- Details -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0; width: 130px; font-size: 13px; color: #9a8a78; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Account Type</td>
                        <td style="padding: 10px 0; font-size: 15px; color: #1c1612;">${opts.userType}</td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                      <tr><td style="border-top: 1px solid #e8e0d4;"></td></tr>
                    </table>

                    <p style="margin: 0; font-size: 13px; color: #9a8a78;">
                      Questions? Reach us at <a href="mailto:Info@Its-Country.com" style="color: #c3282e; text-decoration: none;">Info@Its-Country.com</a>
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 0; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #a09080;">It's Country Record Label &nbsp;·&nbsp; Texas &nbsp;·&nbsp; its-country.com</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
  console.log(`[email] Request-received result:`, JSON.stringify(result));
}

export async function sendPasswordResetEmail(opts: {
  toEmail: string;
  username: string;
  resetUrl: string;
}) {
  const client = getResendClient();
  const from = getFromAddress();
  const result = await client.emails.send({
    from,
    to: opts.toEmail,
    subject: `Reset Your Password — It's Country`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #ede8df; font-family: 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ede8df; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                <!-- Header -->
                <tr>
                  <td style="background-color: #1c1612; padding: 28px 40px; border-radius: 10px 10px 0 0; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #e8c97a; letter-spacing: 1px;">It's Country</p>
                    <p style="margin: 0; font-size: 12px; color: #a89070; letter-spacing: 2px; text-transform: uppercase;">Record Label · Texas</p>
                  </td>
                </tr>

                <!-- Body card -->
                <tr>
                  <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 10px 10px;">

                    <p style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #1c1612;">Password Reset Request</p>
                    <p style="margin: 0 0 28px 0; font-size: 15px; color: #4a3f35; line-height: 1.6;">
                      We received a request to reset your It's Country password. Click the button below to choose a new one.
                    </p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr><td style="border-top: 1px solid #e8e0d4;"></td></tr>
                    </table>

                    <!-- CTA -->
                    <a href="${opts.resetUrl}" style="display: inline-block; background-color: #c3282e; color: #ffffff; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none; letter-spacing: 0.3px;">
                      Reset My Password →
                    </a>

                    <p style="margin: 24px 0 0 0; font-size: 13px; color: #9a8a78; line-height: 1.6;">
                      This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't change.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                      <tr><td style="border-top: 1px solid #e8e0d4;"></td></tr>
                    </table>

                    <p style="margin: 0; font-size: 13px; color: #9a8a78;">
                      Questions? Reach us at <a href="mailto:Info@Its-Country.com" style="color: #c3282e; text-decoration: none;">Info@Its-Country.com</a>
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 0; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #a09080;">It's Country Record Label &nbsp;·&nbsp; Texas &nbsp;·&nbsp; its-country.com</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
  console.log(`[email] Password-reset result:`, JSON.stringify(result));
}

export async function sendAccountRejectedEmail(opts: {
  toEmail: string;
  username: string;
}) {
  const client = getResendClient();
  const from = getFromAddress();
  const result = await client.emails.send({
    from,
    to: opts.toEmail,
    subject: `Your It's Country Request — Update`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #ede8df; font-family: 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ede8df; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                <!-- Header -->
                <tr>
                  <td style="background-color: #1c1612; padding: 28px 40px; border-radius: 10px 10px 0 0; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #e8c97a; letter-spacing: 1px;">It's Country</p>
                    <p style="margin: 0; font-size: 12px; color: #a89070; letter-spacing: 2px; text-transform: uppercase;">Record Label · Texas</p>
                  </td>
                </tr>

                <!-- Body card -->
                <tr>
                  <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 10px 10px;">

                    <p style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #1c1612;">Request Not Approved</p>
                    <p style="margin: 0 0 28px 0; font-size: 15px; color: #4a3f35; line-height: 1.6;">
                      Thank you for your interest in It's Country. After reviewing your request, we're unable to approve access at this time.
                    </p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr><td style="border-top: 1px solid #e8e0d4;"></td></tr>
                    </table>

                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b5a4a; line-height: 1.6;">
                      If you believe this was a mistake or have questions about your request, please don't hesitate to reach out to us directly.
                    </p>

                    <p style="margin: 0; font-size: 13px; color: #9a8a78;">
                      Contact us at <a href="mailto:Info@Its-Country.com" style="color: #c3282e; text-decoration: none;">Info@Its-Country.com</a>
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 0; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #a09080;">It's Country Record Label &nbsp;·&nbsp; Texas &nbsp;·&nbsp; its-country.com</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
  console.log(`[email] Account-rejected result:`, JSON.stringify(result));
}

export async function sendAccountApprovedEmail(opts: {
  toEmail: string;
  username: string;
  userType: string;
  loginUrl: string;
}) {
  const client = getResendClient();
  const from = getFromAddress();
  const result = await client.emails.send({
    from,
    to: opts.toEmail,
    subject: `You're In — It's Country`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #ede8df; font-family: 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ede8df; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                <!-- Header -->
                <tr>
                  <td style="background-color: #1c1612; padding: 28px 40px; border-radius: 10px 10px 0 0; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #e8c97a; letter-spacing: 1px;">It's Country</p>
                    <p style="margin: 0; font-size: 12px; color: #a89070; letter-spacing: 2px; text-transform: uppercase;">Record Label · Texas</p>
                  </td>
                </tr>

                <!-- Body card -->
                <tr>
                  <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 10px 10px;">

                    <p style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #1c1612;">You're Approved</p>
                    <p style="margin: 0 0 28px 0; font-size: 15px; color: #4a3f35; line-height: 1.6;">
                      Welcome to It's Country. Your account has been approved and you now have access based on your account type.
                    </p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr><td style="border-top: 1px solid #e8e0d4;"></td></tr>
                    </table>

                    <!-- Details -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0; width: 130px; font-size: 13px; color: #9a8a78; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Account Type</td>
                        <td style="padding: 10px 0; font-size: 15px; color: #1c1612;">${opts.userType}</td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                      <tr><td style="border-top: 1px solid #e8e0d4;"></td></tr>
                    </table>

                    <!-- CTA -->
                    <a href="${opts.loginUrl}" style="display: inline-block; background-color: #c3282e; color: #ffffff; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none; letter-spacing: 0.3px;">
                      Sign In Now →
                    </a>

                    <p style="margin: 28px 0 0 0; font-size: 13px; color: #9a8a78;">
                      Questions? Reach us at <a href="mailto:Info@Its-Country.com" style="color: #c3282e; text-decoration: none;">Info@Its-Country.com</a>
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 0; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #a09080;">It's Country Record Label &nbsp;·&nbsp; Texas &nbsp;·&nbsp; its-country.com</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
  console.log(`[email] Account-approved result:`, JSON.stringify(result));
}
