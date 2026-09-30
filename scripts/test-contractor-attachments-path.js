const assert = require('assert');
const { buildContractorAttachmentStoragePath } = require('../src/utils/storagePaths');

const path = buildContractorAttachmentStoragePath({
  companyName: 'Acme Contractors Ltd',
  contractorName: 'Jane Smith',
  fileExt: 'pdf',
});

assert.match(path, /^acme_contractors_ltd\/jane_smith\/other_attachments\/\d+\.pdf$/);

const { countCompanyContractorAttachments } = require('../src/utils/contractorAttachmentsUtils');
assert.strictEqual(countCompanyContractorAttachments([]), 0);
assert.strictEqual(
  countCompanyContractorAttachments([
    { attachments: [{ path: 'a' }, { path: 'b' }] },
    { attachments: [{ path: 'c' }] },
  ]),
  3,
);

console.log('contractor attachments path helper: ok');
