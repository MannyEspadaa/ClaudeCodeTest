import type { MailMessage } from "./mailer";

export function verificationEmail(to: string, name: string, link: string): MailMessage {
  return {
    to,
    subject: "Verify your Esports Hub email",
    text: `Hi ${name},\n\nConfirm your email address to finish creating your account:\n${link}\n\nThis link expires in 24 hours. If you didn't sign up, ignore this email.`,
  };
}

export function passwordResetEmail(to: string, name: string, link: string): MailMessage {
  return {
    to,
    subject: "Reset your Esports Hub password",
    text: `Hi ${name},\n\nUse this link to choose a new password:\n${link}\n\nThis link expires in 1 hour. If you didn't ask for a reset, ignore this email.`,
  };
}
