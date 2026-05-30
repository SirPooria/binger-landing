import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/** Sends magic-link email. In dev without SMTP, logs the link to stdout. */
export async function sendMagicLinkEmail(email: string, verifyUrl: string): Promise<void> {
  const subject = 'ورود به بینجر';
  const html = `
    <div dir="rtl" style="font-family: Tahoma, sans-serif;">
      <h2>ورود به بینجر</h2>
      <p>برای ورود روی دکمه زیر کلیک کنید. این لینک ۱۵ دقیقه معتبر است.</p>
      <p><a href="${verifyUrl}" style="background:#ccff00;color:#000;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">ورود به بینجر</a></p>
      <p style="color:#666;font-size:12px;">اگر درخواست ورود نداده‌اید، این ایمیل را نادیده بگیرید.</p>
    </div>
  `;

  const tx = getTransporter();
  if (!tx) {
    console.log('\n[magic-link] SMTP not configured — login link for', email, ':\n', verifyUrl, '\n');
    return;
  }
  await tx.sendMail({ from: config.smtp.from, to: email, subject, html });
}
