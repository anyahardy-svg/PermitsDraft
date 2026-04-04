# Admin Users Setup Guide

## Installation Steps

### 1. Run Migration
Execute the SQL migration to create the `admin_users` table:
```bash
# In your Supabase SQL editor, run:
migrations/create_admin_users_table.sql
```

### 2. Add Initial Super Admin Users
Use the Supabase SQL editor to insert initial super_admin accounts:

```sql
-- Example: Add first super_admin (hash password with bcrypt first)
-- Password should be hashed using bcryptjs before inserting
-- For testing, you can manually hash a password

-- Insert initial super admins
INSERT INTO admin_users (email, name, password_hash, role)
VALUES 
  ('admin1@company.com', 'Admin One', '[bcrypt_hash_of_password]', 'super_admin'),
  ('admin2@company.com', 'Admin Two', '[bcrypt_hash_of_password]', 'super_admin');
```

**To generate bcrypt hash for a password:**
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your_password_here', 10);
console.log(hash);
```

### 3. Install bcryptjs Dependency
If not already installed, add to package.json:
```bash
npm install bcryptjs
```

## Features

### Admin Login
- Email + password authentication
- Separate from contractor login
- Session-based access

### Role-Based Access
- **Super Admin**: Full access to all admin features
  - Manage inductions
  - Manage permit issuers
  - Manage admin users
  - Manage companies
  - Manage contractors
  - Manage business units
  - Manage sites
  - Manage services
  - View isolation registers

- **Manager**: Limited access
  - View/edit contractors
  - View/edit companies
  - View/edit visitor inductions
  - View isolation registers

### Admin User Management (Super Admin Only)
- Create new admin users
- Edit existing users (name, role, password)
- Delete admin users
- Change own password

## API Functions

All functions in `src/api/adminAuth.js`:

- `loginAdminUser(email, password)` - Login
- `getAllAdminUsers()` - Get all admin users
- `createAdminUser(email, name, password, role)` - Create user
- `updateAdminUser(userId, updates)` - Update user
- `deleteAdminUser(userId)` - Delete user
- `changeAdminPassword(userId, currentPassword, newPassword)` - Change password

## Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- RLS (Row Level Security) enabled on admin_users table
- Each admin user has unique email
- Password verification on login
- Current password required to change password
