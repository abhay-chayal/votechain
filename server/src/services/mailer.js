import nodemailer from 'nodemailer'
import { config } from '../config.js'

let transport = null
if (config.mail.host) {
  transport = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
  })
}

export const mailEnabled = () => !!transport

const layout = (title, body, cta) => `
<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
  <div style="font-weight:700;font-size:18px;margin-bottom:24px">VoteChain</div>
  <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
  <div style="font-size:15px;line-height:1.6;color:#334155">${body}</div>
  ${cta ? `<p style="margin:28px 0"><a href="${cta.url}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${cta.label}</a></p>` : ''}
  <p style="font-size:12px;color:#64748b;margin-top:32px">Every vote on VoteChain is recorded on a public blockchain. You can check your receipt at ${config.publicAppUrl}/receipt</p>
</div>`

export async function sendMail(to, subject, html, text) {
  if (!transport) {
    if (!config.isTest) console.log(`[mail] (no SMTP configured) to=${to} subject="${subject}"${text ? `\n        ${text}` : ''}`)
    return { skipped: true }
  }
  try {
    await transport.sendMail({ from: config.mail.from, to, subject, html, text })
    return { sent: true }
  } catch (err) {
    console.error('[mail] send failed:', err.message)
    return { error: err.message }
  }
}

/** Sends to many recipients without failing the request if a few bounce. */
export async function sendBulk(recipients, build) {
  let sent = 0
  for (const r of recipients) {
    const { subject, html, text } = build(r)
    const res = await sendMail(r.email, subject, html, text)
    if (!res.error) sent += 1
  }
  return sent
}

export const templates = {
  otp: (code) => ({
    subject: `${code} is your VoteChain sign-in code`,
    html: layout('Your sign-in code', `Enter this code to sign in. It expires in 10 minutes.<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:20px 0">${code}</p>If you didn't ask for it, you can ignore this email.`),
    text: `Your VoteChain sign-in code is ${code}. It expires in 10 minutes.`,
  }),
  invite: (election, org) => ({
    subject: `You're invited to vote: ${election.title}`,
    html: layout(`${org.name} invited you to vote`, `<strong>${election.title}</strong><br>Voting opens ${new Date(election.startAt).toUTCString()} and closes ${new Date(election.endAt).toUTCString()}.<br><br>Sign in with this email address to vote. No password needed.`, { url: `${config.publicAppUrl}/login`, label: 'Go to VoteChain' }),
    text: `${org.name} invited you to vote in "${election.title}". Sign in at ${config.publicAppUrl}/login with this email.`,
  }),
  reminder: (election) => ({
    subject: `Reminder: voting closes soon for ${election.title}`,
    html: layout('You haven\'t voted yet', `Voting for <strong>${election.title}</strong> closes ${new Date(election.endAt).toUTCString()}.`, { url: `${config.publicAppUrl}/login`, label: 'Vote now' }),
    text: `Voting for "${election.title}" closes ${new Date(election.endAt).toUTCString()}.`,
  }),
  results: (election) => ({
    subject: `Results published: ${election.title}`,
    html: layout('Results are out', `The results for <strong>${election.title}</strong> are published and can be checked against the blockchain.`, { url: `${config.publicAppUrl}/verify/${election._id}`, label: 'See results' }),
    text: `Results for "${election.title}": ${config.publicAppUrl}/verify/${election._id}`,
  }),
}
