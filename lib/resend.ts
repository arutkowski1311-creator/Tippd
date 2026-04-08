import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
}: SendEmailParams) {
  return getResend().emails.send({
    from: from || process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    html,
    replyTo,
  });
}
