const {
  CONTRACTOR_HQ_CONTACT,
  getPartnerLogoUrls,
} = require('./emailBrandAssets');

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildPartnerLogosHtml() {
  const logos = getPartnerLogoUrls();
  if (logos.length === 0) {
    return '';
  }

  const rows = chunkArray(logos, 3)
    .map((row) => {
      const cells = row
        .map(
          (logo) => `
        <td style="padding: 8px 10px; text-align: center; vertical-align: middle;">
          <img
            src="${logo.url}"
            alt="${logo.name}"
            width="100"
            style="display: block; max-width: 100px; height: auto; margin: 0 auto; border: 0;"
          />
        </td>`
        )
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto 24px;">
      ${rows}
    </table>
  `;
}

function buildContactFooterHtml() {
  const { addressLine1, addressLine2, email, contactName, phone, phoneTel } = CONTRACTOR_HQ_CONTACT;

  return `
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-bottom: 16px; text-align: center;">
      <p style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #1F2937;">Contact Us</p>
      <p style="margin: 0 0 4px; font-size: 14px; color: #4B5563; line-height: 22px;">${addressLine1}</p>
      <p style="margin: 0 0 12px; font-size: 14px; color: #4B5563; line-height: 22px;">${addressLine2}</p>
      <p style="margin: 0 0 4px; font-size: 14px; line-height: 22px;">
        <a href="mailto:${email}" style="color: #2563EB; text-decoration: none;">${email}</a>
      </p>
      <p style="margin: 0 0 4px; font-size: 14px; color: #4B5563; line-height: 22px;">${contactName}</p>
      <p style="margin: 0; font-size: 14px; line-height: 22px;">
        <a href="tel:${phoneTel}" style="color: #2563EB; text-decoration: none;">${phone}</a>
      </p>
    </div>
  `;
}

function buildEmailFooterHtml() {
  return `
    ${buildPartnerLogosHtml()}
    ${buildContactFooterHtml()}
    <p style="margin: 0; font-size: 11px; color: #9CA3AF; text-align: center;">
      © 2026 Contractor HQ Limited. All rights reserved.
    </p>
    <p style="margin: 10px 0 0; font-size: 11px; color: #9CA3AF; text-align: center;">
      <a href="https://contractorhq.co.nz" style="color: #2563EB; text-decoration: none;">Visit Website</a>
      &nbsp;|&nbsp;
      <a href="mailto:${CONTRACTOR_HQ_CONTACT.email}" style="color: #2563EB; text-decoration: none;">Support</a>
    </p>
    <p style="margin: 10px 0 0; font-size: 11px; color: #9CA3AF; text-align: center;">
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
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    a { color: #3B82F6; text-decoration: none; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #ddd; }
    .content { padding: 20px; }
    .footer { background-color: #f8f9fa; padding: 24px 20px; text-align: center; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #1F2937; font-size: 24px;">Contractor HQ</h1>
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
