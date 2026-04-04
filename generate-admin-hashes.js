#!/usr/bin/env node
/**
 * Quick utility to generate bcrypt password hashes for admin users
 * 
 * Usage:
 *   node generate-admin-hashes.js "password1" "password2"
 * 
 * Or run with no args to get a default example:
 *   node generate-admin-hashes.js
 */

const bcrypt = require('bcryptjs');

async function main() {
  console.log('\n🔐 Admin Password Hash Generator\n');

  let password1 = process.argv[2];
  let password2 = process.argv[3];
  let useDefaults = false;

  // Use defaults if no arguments provided
  if (!password1) {
    useDefaults = true;
    password1 = 'AdminPassword123!';
    password2 = 'AdminPassword456!';
    console.log('No passwords provided. Using example passwords:\n');
    console.log(`  Password 1: ${password1}`);
    console.log(`  Password 2: ${password2}`);
    console.log('\n⚠️  Use your own passwords in production!\n');
  }

  if (!password2) {
    console.error('❌ Error: Please provide two passwords');
    console.log('\nUsage: node generate-admin-hashes.js "password1" "password2"\n');
    process.exit(1);
  }

  try {
    console.log('Generating hashes...\n');
    
    const hash1 = await bcrypt.hash(password1, 10);
    const hash2 = await bcrypt.hash(password2, 10);

    console.log('✅ Hash 1 (for Admin One):');
    console.log(hash1);
    console.log('\n✅ Hash 2 (for Admin Two):');
    console.log(hash2);

    // Display SQL template
    console.log('\n\n📋 Copy-paste this SQL into your Supabase SQL editor:\n');
    console.log(`INSERT INTO admin_users (email, name, password_hash, role) VALUES`);
    console.log(`  ('admin1@yourcompany.com', 'Admin One', '${hash1}', 'super_admin'),`);
    console.log(`  ('admin2@yourcompany.com', 'Admin Two', '${hash2}', 'super_admin');`);
    console.log('\n⚠️  IMPORTANT: Update the email addresses before running the SQL!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
