const assert = require('assert');
const {
  buildInvitationTemplateVariables,
  buildSignupUrl,
  buildSignupUrlButtonHtml,
  renderTemplate,
} = require('../api/lib/emailTemplateHelpers');

function run() {
  const signupUrl = buildSignupUrl('test@example.com', 'company-123');
  assert.ok(signupUrl.includes('type=invited'));
  assert.ok(signupUrl.includes('email=test%40example.com'));
  assert.ok(signupUrl.includes('companyId=company-123'));

  const buttonHtml = buildSignupUrlButtonHtml(signupUrl, 'Access Contractor HQ');
  assert.ok(buttonHtml.startsWith('<a href="'));
  assert.ok(buttonHtml.includes('Access Contractor HQ'));
  assert.ok(buttonHtml.endsWith('</a>'));

  const template = {
    subject: '{{companyName}} invite',
    html_content: `<table><tr><td>{{signupUrlButton}}</td></tr></table>`,
    variables: ['companyName', 'signupUrlButton'],
  };

  const rendered = renderTemplate(template, {
    companyName: 'Example Ltd',
    signupUrlButton: buttonHtml,
  });

  assert.strictEqual(rendered.subject, 'Example Ltd invite');
  assert.ok(rendered.content.includes(buttonHtml));
  assert.ok(!rendered.content.includes('{{signupUrlButton}}'));

  const brokenTemplate = {
    subject: 'Invite',
    html_content: `<td>{{signupUrl}}\nAccess Contractor HQ\n</a></td>`,
    variables: ['signupUrl'],
  };

  const fixedVariables = buildInvitationTemplateVariables({
    toEmail: 'test@example.com',
    companyId: 'company-123',
    companyName: 'Example Ltd',
    contactName: 'Alex',
    deadline: 'Monday',
    supportEmail: 'support@contractorhq.co.nz',
  });

  const correctedTemplate = {
    subject: 'Invite',
    html_content: `<td><a href="{{signupUrl}}">Access Contractor HQ</a></td>`,
    variables: ['signupUrl'],
  };

  const corrected = renderTemplate(correctedTemplate, fixedVariables);
  assert.ok(corrected.content.includes('href="https://contractorhq.co.nz/sign-in-contractor'));
  assert.ok(corrected.content.includes('Access Contractor HQ'));
  assert.ok(!corrected.content.includes('{{signupUrl}}'));

  const brokenRendered = renderTemplate(brokenTemplate, fixedVariables);
  assert.ok(brokenRendered.content.includes('https://contractorhq.co.nz/sign-in-contractor'));
  assert.ok(brokenRendered.content.includes('</a>'));

  console.log('Email template helper tests passed');
}

run();
