import { IChangeEmailAddress, ICreateAccount, IResetPassword } from '../types/emailTemplate';

const APP_NAME = process.env.APP_NAME || 'NestJS App';
const PRIMARY_COLOR = '#009A54';

const baseTemplate = (content: string) => `
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f8;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellspacing="0" cellpadding="0" border="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:30px 20px;border-bottom:1px solid #eee;background:${PRIMARY_COLOR};">
              <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">${APP_NAME}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:30px 25px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px;color:#999;font-size:12px;border-top:1px solid #eee;">
              &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.<br/>
              If you did not request this email, please ignore it.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
`;

const otpBox = (otp: string) => `
<div style="
  background:${PRIMARY_COLOR};
  color:#fff;
  font-size:32px;
  letter-spacing:6px;
  padding:16px 28px;
  border-radius:8px;
  display:inline-block;
  margin:20px 0;
  font-weight:bold;
">
${otp}
</div>
`;

const createAccount = (values: ICreateAccount) => {
  const content = `
    <h2 style="margin:0 0 10px;color:#111;">Verify your account</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      Hi ${values.name},<br/><br/>
      Welcome to <b>${APP_NAME}</b>. Please use the verification code below to activate your account.
    </p>
    <div style="text-align:center;">
      ${otpBox(String(values.otp))}
    </div>
    <p style="color:#666;font-size:14px;">This code expires in <b>3 minutes</b>.</p>
  `;

  return {
    to: values.email,
    subject: `Verify your ${APP_NAME} account`,
    html: baseTemplate(content),
  };
};

const resetPassword = (values: IResetPassword) => {
  const content = `
    <h2 style="margin:0 0 10px;color:#111;">Reset your password</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      We received a request to reset your ${APP_NAME} password. Use the code below to continue.
    </p>
    <div style="text-align:center;">
      ${otpBox(String(values.otp))}
    </div>
    <p style="color:#666;font-size:14px;">This code expires in <b>3 minutes</b>.</p>
  `;

  return {
    to: values.email,
    subject: `Reset your ${APP_NAME} password`,
    html: baseTemplate(content),
  };
};

const changeEmailAddress = (values: IChangeEmailAddress) => {
  const content = `
    <h2 style="margin:0 0 10px;color:#111;">Change your email address</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      Hi ${values.name},<br/><br/>
      We received a request to change your ${APP_NAME} email address. Use the code below to continue.
    </p>
    <div style="text-align:center;">
      ${otpBox(String(values.otp))}
    </div>
    <p style="color:#666;font-size:14px;">This code expires in <b>3 minutes</b>.</p>
  `;

  return {
    to: values.email,
    subject: `Change your ${APP_NAME} email address`,
    html: baseTemplate(content),
  };
};

export const emailTemplate = { createAccount, resetPassword, changeEmailAddress };
