const assert = require('assert');
const {
  isCompleteHtmlDocument,
  prepareEmailHtml,
  wrapEmailHtml,
} = require('../api/lib/emailWrapper');

function run() {
  const fragment = '<p>Dear {{contactName}},</p><p>Reminder text</p>';
  const fullDocument = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Reminder</title></head>
<body style="margin:0; background-color:#f4f6f8;">
  <table width="600"><tr><td>Winstone Aggregates</td></tr></table>
</body>
</html>`;

  assert.strictEqual(isCompleteHtmlDocument(fragment), false);
  assert.strictEqual(isCompleteHtmlDocument(fullDocument), true);
  assert.strictEqual(isCompleteHtmlDocument('  <!DOCTYPE html><html><body></body></html>  '), true);
  assert.strictEqual(isCompleteHtmlDocument('<html lang="en"><body>Hello</body></html>'), true);

  const wrappedFragment = prepareEmailHtml(fragment);
  assert.ok(wrappedFragment.includes('Contractor HQ'));
  assert.ok(wrappedFragment.includes(fragment));
  assert.strictEqual(wrappedFragment.match(/<!DOCTYPE html>/gi).length, 1);

  const preparedFullDocument = prepareEmailHtml(fullDocument);
  assert.strictEqual(preparedFullDocument, fullDocument.trim());
  assert.ok(!preparedFullDocument.includes('<div class="header">'));
  assert.strictEqual(preparedFullDocument.match(/<!DOCTYPE html>/gi).length, 1);

  const directWrap = wrapEmailHtml(fragment);
  assert.ok(directWrap.includes('<div class="content">'));

  console.log('Email wrapper tests passed');
}

run();
