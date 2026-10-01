const assert = require('assert');
const {
  buildCompanyAttachmentStoragePath,
  buildContractorAttachmentStoragePath,
} = require('../src/utils/storagePaths');

const path = buildContractorAttachmentStoragePath({
  companyName: 'Acme Contractors Ltd',
  contractorName: 'Jane Smith',
  fileExt: 'pdf',
});

assert.match(path, /^acme_contractors_ltd\/jane_smith\/other_attachments\/\d+\.pdf$/);

const companyPath = buildCompanyAttachmentStoragePath({
  companyName: 'Hi Tech Auto Electrical',
  fileExt: 'pdf',
});
assert.match(companyPath, /^hi_tech_auto_electrical\/company_other_attachments\/\d+\.pdf$/);

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
