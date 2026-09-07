const assert = require('assert');
const {
  buildResendPayload,
  formatEmailAddress,
} = require('../api/lib/resend');

function run() {
  assert.strictEqual(
    formatEmailAddress('user@example.com', 'Jane Doe'),
    '"Jane Doe" <user@example.com>'
  );
  assert.strictEqual(
    formatEmailAddress('user@example.com'),
    'user@example.com'
  );

  const payload = buildResendPayload({
    toEmail: 'recipient@example.com',
    toName: 'Recipient',
    subject: 'Test',
    htmlContent: '<p>Hello</p>',
    textContent: 'Hello',
    replyTo: 'support@contractorhq.co.nz',
    headers: {
      'X-Mailer': 'Contractor HQ',
    },
  });

  assert.strictEqual(payload.from, '"Contractor HQ" <noreply@contractorhq.co.nz>');
  assert.deepStrictEqual(payload.to, ['"Recipient" <recipient@example.com>']);
  assert.strictEqual(payload.subject, 'Test');
  assert.strictEqual(payload.html, '<p>Hello</p>');
  assert.strictEqual(payload.text, 'Hello');
  assert.strictEqual(payload.reply_to, 'support@contractorhq.co.nz');
  assert.strictEqual(payload.headers['X-Mailer'], 'Contractor HQ');

  console.log('Resend payload helper tests passed');
}

run();
