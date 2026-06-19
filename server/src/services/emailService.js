// server/src/services/emailService.js
//
// ─── SERVICIO CENTRALIZADO DE CORREO (GMAIL API SOBRE HTTPS) ─────────────────
// Por qué existe este archivo:
//   Railway (y la mayoría de proveedores cloud) bloquea los puertos SMTP
//   salientes (25, 465, 587) a nivel de firewall de red. Nodemailer con
//   `service: 'gmail'` o `smtp.gmail.com` jamás funcionará ahí, sin importar
//   cuántos parámetros (IPv4, timeouts, puertos) se ajusten.
//
//   La Gmail API, en cambio, viaja por HTTPS (puerto 443) — el mismo puerto
//   que usa cualquier llamada a una API REST normal — por lo que nunca es
//   bloqueada.
//
// Variables de entorno requeridas:
//   GMAIL_CLIENT_ID
//   GMAIL_CLIENT_SECRET
//   GMAIL_REFRESH_TOKEN
//   EMAIL_USER     (la cuenta de Gmail que envía los correos)
//   EMAIL_FROM     (opcional, por defecto "MELIKA Salud <EMAIL_USER>")

const { google } = require('googleapis');

const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground' // redirect URI usado al generar el refresh token
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

/**
 * Codifica un correo en formato RFC 2822 y lo convierte a base64url,
 * que es el formato que exige la Gmail API en el campo `raw`.
 */
function construirMensaje({ to, from, subject, html }) {
  // Subject codificado en base64 (RFC 2047) para soportar tildes/ñ sin corromperse.
  const subjectCodificado = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;

  const mensaje = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subjectCodificado}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\n');

  return Buffer.from(mensaje)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Envía un correo a través de la Gmail API (HTTPS).
 * Lanza un error si Google rechaza el envío (token vencido, scope incorrecto,
 * cuota excedida, etc.) para que el controlador decida cómo informarlo.
 *
 * @param {{ to: string, subject: string, html: string }} params
 */
async function enviarCorreo({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || `MELIKA Salud <${process.env.EMAIL_USER}>`;
  const raw = construirMensaje({ to, from, subject, html });

  return gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
}

module.exports = { enviarCorreo };