// Vercel Serverless Function: nimmt Bewerbungen (Agentur / einzelne Dame) entgegen
// und schickt sie per SMTP an kontakt@globalescort.de.
// Benötigte Umgebungsvariablen in Vercel: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// Optional: MAIL_TO (Standard: kontakt@globalescort.de), MAIL_FROM (Standard: SMTP_USER)
const nodemailer = require('nodemailer');

const LABELS = {
  agentur: {
    firma: 'Firma / Agentur', ansprechpartner: 'Ansprechpartner', ust_hr: 'USt-ID / Handelsregister',
    anschrift: 'Anschrift', email: 'E-Mail', telefon: 'Telefon / WhatsApp', website: 'Website',
    anzahl_damen: 'Anzahl Damen', staedte: 'Städte', nachricht: 'Nachricht'
  },
  dame: {
    name: 'Name', stadt: 'Stadt', email: 'E-Mail', telefon: 'Telefon / WhatsApp', alter: 'Alter',
    haarfarbe: 'Haarfarbe', groesse: 'Größe (cm)', konfektion: 'Konfektion', sprachen: 'Sprachen',
    umkreis_km: 'Umkreis (km)', ueber_mich: 'Über mich'
  }
};
const REQUIRED = {
  agentur: ['firma', 'ansprechpartner', 'anschrift', 'email', 'telefon', 'anzahl_damen', 'staedte', 'zustimmung'],
  dame: ['name', 'stadt', 'email', 'telefon', 'volljaehrig', 'zustimmung']
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Nur POST erlaubt.' }); }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ error: 'Ungültige Anfrage.' });

  // Spam-Falle: echte Nutzer füllen dieses Feld nicht aus
  if (b.website_url) return res.status(200).json({ ok: true });

  const typ = b.typ === 'dame' ? 'dame' : (b.typ === 'agentur' ? 'agentur' : null);
  if (!typ) return res.status(400).json({ error: 'Unbekannter Bewerbungstyp.' });

  for (const k of REQUIRED[typ]) {
    if (!b[k] || !String(b[k]).trim()) return res.status(400).json({ error: 'Bitte alle Pflichtfelder ausfüllen.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email))) return res.status(400).json({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' });
  if (typ === 'agentur' && !(parseInt(b.anzahl_damen, 10) >= 10)) return res.status(400).json({ error: 'Für Agenturen gilt: mindestens 10 Damen.' });
  if (typ === 'dame' && b.alter && parseInt(b.alter, 10) < 18) return res.status(400).json({ error: 'Bewerbungen nur ab 18 Jahren.' });

  // Bilder (nur Dame, max. 5, je max. ~1,5 MB)
  const attachments = [];
  if (typ === 'dame' && Array.isArray(b.bilder)) {
    for (const [i, img] of b.bilder.slice(0, 5).entries()) {
      const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(img && img.data || ''));
      if (!m) continue;
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 1.5 * 1024 * 1024) continue;
      attachments.push({ filename: `bild-${i + 1}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`, content: buf, contentType: `image/${m[1]}` });
    }
  }

  const labels = LABELS[typ];
  const rows = Object.keys(labels).filter((k) => b[k] && String(b[k]).trim())
    .map((k) => [labels[k], clip(b[k], 4000)]);
  const titel = typ === 'agentur'
    ? `Neue Agentur-Bewerbung: ${clip(b.firma, 120)}`
    : `Neue Bewerbung einzelne Dame: ${clip(b.name, 120)} (${clip(b.stadt, 80)})`;
  const tarif = typ === 'agentur' ? '99 € pro Dame / Monat, ab 10 Damen, Laufzeit ab 6 Monate' : '169 € / Monat, Laufzeit ab 6 Monate';

  const text = `${titel}\nTarif: ${tarif}\n\n` + rows.map(([l, v]) => `${l}: ${v}`).join('\n') +
    `\n\nBilder: ${attachments.length}\nZustimmung Datenschutz: ja` + (typ === 'dame' ? '\nVolljährig & Bildrechte bestätigt: ja' : '');
  const html = `<h2 style="font-family:Arial,sans-serif">${esc(titel)}</h2><p style="font-family:Arial,sans-serif"><b>Tarif:</b> ${esc(tarif)}</p>` +
    `<table cellpadding="6" style="font-family:Arial,sans-serif;border-collapse:collapse">` +
    rows.map(([l, v]) => `<tr><td style="border-bottom:1px solid #ddd;color:#666;vertical-align:top">${esc(l)}</td><td style="border-bottom:1px solid #ddd;white-space:pre-wrap">${esc(v)}</td></tr>`).join('') +
    `</table><p style="font-family:Arial,sans-serif;color:#666">Bilder im Anhang: ${attachments.length} · Datenschutz-Zustimmung: ja` +
    (typ === 'dame' ? ' · Volljährigkeit &amp; Bildrechte bestätigt: ja' : '') + `</p>`;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('SMTP nicht konfiguriert');
    return res.status(503).json({ error: 'Das Formular ist noch nicht eingerichtet.' });
  }
  const port = parseInt(SMTP_PORT || '587', 10);
  const transporter = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });

  try {
    await transporter.sendMail({
      from: `"globalescort.de" <${process.env.MAIL_FROM || SMTP_USER}>`,
      to: process.env.MAIL_TO || 'kontakt@globalescort.de',
      replyTo: String(b.email),
      subject: titel,
      text, html, attachments
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Mailversand fehlgeschlagen', e && e.message);
    return res.status(502).json({ error: 'Senden fehlgeschlagen.' });
  }
};
