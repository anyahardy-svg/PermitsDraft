const assert = require('assert');
const { buildContractorAttachmentStoragePath } = require('../src/utils/storagePaths');

const path = buildContractorAttachmentStoragePath({
  companyName: 'Acme Contractors Ltd',
  contractorName: 'Jane Smith',
  fileExt: 'pdf',
});

assert.match(path, /^acme_contractors_ltd\/jane_smith\/other_attachments\/\d+\.pdf$/);

console.log('contractor attachments path helper: ok');
