import express from 'express';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { requireAuth } from '../middleware/auth.js';
import { getAuth, getDatabase } from '../services/firebase.js';
import { decodeImage, imageType } from '../utils/tempFile.js';
import { identifier, text } from '../utils/validation.js';
import { HttpError } from '../utils/errors.js';
function getTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new HttpError(503, 'Email is not configured.');
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }, disableFileAccess: true, disableUrlAccess: true,
    connectionTimeout: 10000, socketTimeout: 15000 });
}
async function sellerEmail(listingId) {
  const listing = await (await getDatabase()).collection('market_listings').doc(identifier(listingId, 'listingId')).get();
  if (!listing.exists) throw new HttpError(404, 'Listing not found.');
  const seller = await (await getAuth()).getUser(identifier(listing.data().farmer_id, 'seller id'));
  if (!seller.email || seller.disabled) throw new HttpError(409, 'Seller contact is unavailable.');
  return seller.email;
}
export function createEmailRouter(deps = {}) {
  const router = express.Router();
  router.use(deps.authenticate || requireAuth);
  router.post('/send', async (req, res) => {
    const body = req.body || {};
    const subject = text(body.subject, 'subject', 200);
    if (/[\r\n]/.test(subject)) throw new HttpError(400, 'Invalid subject.');
    const message = text(body.text, 'message', 10000);
    const supportEmail = deps.supportEmail || process.env.SUPPORT_EMAIL || 'prithvis3804@gmail.com';
    let to = supportEmail;
    if (body.listingId) to = await (deps.sellerEmail || sellerEmail)(body.listingId);
    else if (body.to && body.to !== supportEmail) throw new HttpError(400, 'Invalid recipient.');
    const attachments = body.attachments ?? [];
    if (!Array.isArray(attachments) || attachments.length > 1) throw new HttpError(400, 'At most one image attachment is allowed.');
    const safeAttachments = attachments.map(attachment => {
      if (!attachment || typeof attachment !== 'object' || Object.keys(attachment).some(key => !['filename', 'content', 'encoding'].includes(key)) || attachment.encoding !== 'base64') throw new HttpError(400, 'Only inline base64 image attachments are allowed.');
      const content = decodeImage(attachment.content);
      return { filename: path.posix.basename(path.win32.basename(text(attachment.filename, 'filename', 200))), content, contentType: `image/${imageType(content)}` };
    });
    const info = await (deps.getTransport || getTransport)().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@farmhelp.app',
      to, subject, text: message, replyTo: req.user.email || undefined,
      attachments: safeAttachments, disableFileAccess: true, disableUrlAccess: true,
    });
    res.json({ success: true, message: 'Email sent successfully.', messageId: info.messageId });
  });
  return router;
}
export default createEmailRouter();
