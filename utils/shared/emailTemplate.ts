
import {
  IChangeEmailAddress,
  ICreateAccount,
  IResetPassword,
} from '../types/emailTemplate';

const APP_NAME = process.env.APP_NAME || 'Sendit';
const PRIMARY_COLOR = '#0F87FF';
const SECONDARY_COLOR = '#000000';
const LOGO_URL =
  'https://res.cloudinary.com/dkbcx9amc/image/upload/v1793084127/Group_1171283506_q5hv0z.png';

const baseTemplate = (content: string, previewText = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${APP_NAME}</title>
</head>

<body style="margin:0;padding:0;background:#f3f7fc;font-family:Arial,Helvetica,sans-serif;color:${SECONDARY_COLOR};">

  <div style="display:none;font-size:1px;color:#f3f7fc;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${previewText}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
    style="background:#f3f7fc;padding:36px 12px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e7edf5;">

          <!-- Brand header -->
          <tr>
            <td align="center" style="padding:30px 24px 24px;background:#ffffff;">
              <img
                src="${LOGO_URL}"
                alt="${APP_NAME}"
                width="150"
                style="display:block;width:150px;max-width:100%;height:auto;border:0;"
              />
              <p style="margin:13px 0 0;color:#718096;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">
                Delivering trust, every step
              </p>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background:${PRIMARY_COLOR};font-size:0;line-height:0;">
              &nbsp;
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:36px 32px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Brand statement -->
          <tr>
            <td style="padding:24px 32px;background:#f8faff;border-top:1px solid #eaf0f8;text-align:center;">
              <p style="margin:0 0 8px;color:${SECONDARY_COLOR};font-size:14px;font-weight:bold;">
                Every parcel has a destination.
              </p>
              <p style="margin:0;color:#718096;font-size:12px;line-height:1.7;">
                Sendit connects people, parcels, and delivery partners
                to make deliveries simpler and more reliable.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 20px;text-align:center;background:#ffffff;">
              <p style="margin:0 0 8px;color:#718096;font-size:12px;line-height:1.7;">
                Need help? Contact our support team if you need assistance.
              </p>
              <p style="margin:0;color:#9aa6b5;font-size:11px;line-height:1.8;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
              <p style="margin:8px 0 0;color:#9aa6b5;font-size:11px;">
                This is an automated email. Please do not reply directly.
              </p>
            </td>
          </tr>

        </table>

        <p style="margin:18px 0 0;color:#a0aec0;font-size:11px;text-align:center;">
          Moving parcels forward, together.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>
`;

const otpBox = (otp: string) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
  style="margin:26px 0;">
  <tr>
    <td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0"
        style="background:#edf6ff;border:1px solid #cfe6ff;border-radius:14px;">
        <tr>
          <td align="center" style="padding:20px 30px;">
            <p style="margin:0 0 10px;color:#52708e;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
              Your verification code
            </p>
            <p style="margin:0;color:${PRIMARY_COLOR};font-size:34px;font-weight:bold;letter-spacing:8px;line-height:1.4;">
              ${otp}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;

const messageText = (text: string) => `
<p style="margin:0;color:#526174;font-size:14px;line-height:1.9;">
  ${text}
</p>
`;

const noticeBox = (text: string) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
  style="margin-top:22px;background:#f8faff;border-left:3px solid ${PRIMARY_COLOR};">
  <tr>
    <td style="padding:14px 16px;color:#64748b;font-size:12px;line-height:1.8;">
      ${text}
    </td>
  </tr>
</table>
`;

const createAccount = (values: ICreateAccount) => {
  const content = `
    <p style="margin:0 0 12px;color:${PRIMARY_COLOR};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
      Welcome to Sendit
    </p>

    <h1 style="margin:0 0 18px;color:${SECONDARY_COLOR};font-size:27px;line-height:1.35;">
      Let's get you moving.
    </h1>

    ${messageText(`
      Hi ${values.name},<br/><br/>
      Welcome to <strong>${APP_NAME}</strong>! Whether you're sending a
      parcel or delivering one, you're now part of a smarter way to move
      things from one place to another.
      <br/><br/>
      Verify your email address with the code below to activate your account
      and get started.
    `)}

    ${otpBox(String(values.otp))}

    <p style="margin:0;text-align:center;color:#526174;font-size:13px;line-height:1.8;">
      This verification code expires in
      <strong style="color:${SECONDARY_COLOR};">3 minutes</strong>.
    </p>

    ${noticeBox(`
      For your security, never share this code with anyone.
      If you didn't create a Sendit account, you can safely ignore this email.
    `)}
  `;

  return {
    to: values.email,
    subject: `Welcome to ${APP_NAME} — Verify your email`,
    html: baseTemplate(
      content,
      'Verify your Sendit account and start sending or delivering parcels.',
    ),
  };
};

const resetPassword = (values: IResetPassword) => {
  const content = `
    <p style="margin:0 0 12px;color:${PRIMARY_COLOR};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
      Account Security
    </p>

    <h1 style="margin:0 0 18px;color:${SECONDARY_COLOR};font-size:27px;line-height:1.35;">
      Let's secure your account.
    </h1>

    ${messageText(`
      We received a request to reset your <strong>${APP_NAME}</strong>
      password. Use the verification code below to continue.
      <br/><br/>
      If you requested this change, enter the code in the app to proceed.
    `)}

    ${otpBox(String(values.otp))}

    <p style="margin:0;text-align:center;color:#526174;font-size:13px;line-height:1.8;">
      This code expires in
      <strong style="color:${SECONDARY_COLOR};">3 minutes</strong>.
    </p>

    ${noticeBox(`
      Didn't request a password reset? Ignore this email and do not share
      the verification code. Consider securing your account if you suspect
      someone else has attempted to access it.
    `)}
  `;

  return {
    to: values.email,
    subject: `${APP_NAME} — Password Reset Verification`,
    html: baseTemplate(
      content,
      'Use your secure verification code to reset your Sendit password.',
    ),
  };
};

const changeEmailAddress = (values: IChangeEmailAddress) => {
  const content = `
    <p style="margin:0 0 12px;color:${PRIMARY_COLOR};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
      Account Update
    </p>

    <h1 style="margin:0 0 18px;color:${SECONDARY_COLOR};font-size:27px;line-height:1.35;">
      A new email, securely verified.
    </h1>

    ${messageText(`
      Hi ${values.name},<br/><br/>
      We received a request to change the email address associated with
      your <strong>${APP_NAME}</strong> account.
      <br/><br/>
      Enter the verification code below to confirm this change.
    `)}

    ${otpBox(String(values.otp))}

    <p style="margin:0;text-align:center;color:#526174;font-size:13px;line-height:1.8;">
      This code expires in
      <strong style="color:${SECONDARY_COLOR};">3 minutes</strong>.
    </p>

    ${noticeBox(`
      If you didn't request an email address change, do not use or share
      this code. Contact Sendit support if you are concerned about your account.
    `)}
  `;

  return {
    to: values.email,
    subject: `${APP_NAME} — Verify Your New Email Address`,
    html: baseTemplate(
      content,
      'Confirm your Sendit email address change with a secure verification code.',
    ),
  };
};

export const emailTemplate = {
  createAccount,
  resetPassword,
  changeEmailAddress,
};
