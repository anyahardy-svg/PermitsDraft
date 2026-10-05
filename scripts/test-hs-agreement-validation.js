const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '../src/utils/hsAgreementValidation.js'),
  'utf8',
).replace(/^export /gm, '');

const context = {};
vm.createContext(context);
vm.runInContext(source, context);

const { validateHSAgreementComplete, isHSAgreementAcknowledged } = context;

assert.strictEqual(
  validateHSAgreementComplete({
    hs_agreement_signature: 'data:image/png;base64,abc',
    hs_agreement_accepted_by: 'Anna Barragan',
    hs_agreement_acknowledged: true,
  }),
  null,
);

assert.strictEqual(
  validateHSAgreementComplete({
    hs_agreement_signature: 'data:image/png;base64,abc',
    hs_agreement_accepted_by: 'Anna Barragan',
    hs_agreement_accepted: true,
  }),
  null,
  'legacy hs_agreement_accepted without acknowledged should count as complete',
);

assert.ok(
  validateHSAgreementComplete({
    hs_agreement_signature: 'data:image/png;base64,abc',
    hs_agreement_accepted_by: 'Anna Barragan',
  }),
  'missing acknowledgement should fail when neither flag is set',
);

assert.strictEqual(isHSAgreementAcknowledged({ hs_agreement_accepted: true }), true);

console.log('test-hs-agreement-validation: ok');
