const {
  CONTRACTOR_HQ_CONTACT,
  getPartnerLogoUrls,
} = require('./emailBrandAssets');

function buildPartnerLogosHtml() {
  const logos = getPartnerLogoUrls();
  if (logos.length === 0) {
    return '';
  }

  const cells = logos
    .map((logo) => {
      const width = logo.width || 100;
      const height = logo.height || 48;

      return `
        <td align="center" valign="middle" style="padding: 8px 6px;">
          <img
            src="${logo.url}"
            alt="${logo.name}"
            width="${width}"
            height="${height}"
            border="0"
            norescale="norescale"
            style="display: block; width: ${width}px; height: ${height}px; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;"
          />
        </td>`;
    })
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 24px;">
      <tr>
        ${cells}
      </tr>
    </table>
  `;
}

function buildContactFooterHtml() {
  const { addressLine1, addressLine2, email, contactName, phone, phoneTel } = CONTRACTOR_HQ_CONTACT;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 16px;">
      <tr>
        <td align="center" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px;">
          <p style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #1F2937; font-family: Arial, sans-serif;">Contact Us</p>
          <p style="margin: 0 0 4px; font-size: 14px; color: #4B5563; line-height: 22px; font-family: Arial, sans-serif;">${addressLine1}</p>
          <p style="margin: 0 0 12px; font-size: 14px; color: #4B5563; line-height: 22px; font-family: Arial, sans-serif;">${addressLine2}</p>
          <p style="margin: 0 0 4px; font-size: 14px; line-height: 22px; font-family: Arial, sans-serif;">
            <a href="mailto:${email}" style="color: #2563EB; text-decoration: none;">${email}</a>
          </p>
          <p style="margin: 0 0 4px; font-size: 14px; color: #4B5563; line-height: 22px; font-family: Arial, sans-serif;">${contactName}</p>
          <p style="margin: 0; font-size: 14px; line-height: 22px; font-family: Arial, sans-serif;">
            <a href="tel:${phoneTel}" style="color: #2563EB; text-decoration: none;">${phone}</a>
          </p>
        </td>
      </tr>
    </table>
  `;
}

function buildEmailFooterHtml() {
  return `
    ${buildPartnerLogosHtml()}
    ${buildContactFooterHtml()}
    <p style="margin: 0; font-size: 11px; color: #9CA3AF; text-align: center; font-family: Arial, sans-serif;">
      © 2026 Contractor HQ Limited. All rights reserved.
    </p>
    <p style="margin: 10px 0 0; font-size: 11px; color: #9CA3AF; text-align: center; font-family: Arial, sans-serif;">
      <a href="https://contractorhq.co.nz" style="color: #2563EB; text-decoration: none;">Visit Website</a>
      &nbsp;|&nbsp;
      <a href="mailto:${CONTRACTOR_HQ_CONTACT.email}" style="color: #2563EB; text-decoration: none;">Support</a>
    </p>
    <p style="margin: 10px 0 0; font-size: 11px; color: #9CA3AF; text-align: center; font-family: Arial, sans-serif;">
      This is an automated email. Please do not reply directly to this address.
    </p>
  `;
}

function buildEmailFooterText() {
  const { addressLine1, addressLine2, email, contactName, phone } = CONTRACTOR_HQ_CONTACT;

  return [
    'Contact Us',
    addressLine1,
    addressLine2,
    email,
    contactName,
    phone,
    '',
    '© 2026 Contractor HQ Limited. All rights reserved.',
    'https://contractorhq.co.nz',
  ].join('\n');
}

function wrapEmailHtml(contentHtml) {
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Contractor HQ</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; display: block; }
    a { color: #3B82F6; text-decoration: none; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #ddd; }
    .content { padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .footer { background-color: #f8f9fa; padding: 24px 20px; text-align: center; border-top: 1px solid #ddd; font-size: 12px; color: #666; font-family: Arial, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #1F2937; font-size: 24px; font-family: Arial, sans-serif;">Contractor HQ</h1>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      ${buildEmailFooterHtml()}
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = {
  buildContactFooterHtml,
  buildEmailFooterHtml,
  buildEmailFooterText,
  buildPartnerLogosHtml,
  wrapEmailHtml,
};
