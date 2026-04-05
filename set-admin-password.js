#!/usr/bin/env node

const bcryptjs = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the password you want to use: ', async (password) => {
  try {
    const hash = await bcryptjs.hash(password, 10);
    rl.question('Enter your admin email (e.g., anya.hardy@winstoneaggregates.co.nz): ', (email) => {
      console.log('\n✅ Password hash generated!\n');
      console.log('Run this SQL in Supabase SQL Editor:\n');
      console.log(`UPDATE admin_users SET password_hash = '${hash}' WHERE email = '${email}';`);
      console.log('\nThen try logging in with your password.\n');
      rl.close();
    });
  } catch (err) {
    console.error('❌ Error generating hash:', err);
    rl.close();
  }
});
