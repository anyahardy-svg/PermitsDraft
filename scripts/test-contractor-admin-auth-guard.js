const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '../src/utils/contractorRouteAuth.js'),
  'utf8'
).replace(/^export /gm, '');

const context = {};
vm.createContext(context);
vm.runInContext(source, context);

const { shouldShowContractorAuthGuard } = context;

const base = {
  pathname: '/contractor-admin/',
  selectedCompanyId: null,
  currentScreen: 'contractor_admin',
  contractorHubAuthChecked: true,
};

assert.strictEqual(shouldShowContractorAuthGuard(base), true);

assert.strictEqual(
  shouldShowContractorAuthGuard({ ...base, contractorHubAuthChecked: false }),
  false
);

assert.strictEqual(
  shouldShowContractorAuthGuard({ ...base, selectedCompanyId: 'company-1' }),
  false
);

assert.strictEqual(
  shouldShowContractorAuthGuard({ ...base, currentScreen: 'contractorAuth' }),
  false
);

assert.strictEqual(
  shouldShowContractorAuthGuard({ ...base, pathname: '/sign-in-contractor/' }),
  false
);

console.log('contractor admin auth guard tests passed');
