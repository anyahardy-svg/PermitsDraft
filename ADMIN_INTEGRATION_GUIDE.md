# Admin Interface Integration Guide

## What's Been Created

You now have three admin screens ready to use:

1. **AdminLoginScreen** - Email/password login form
2. **AdminDashboard** - Role-based menu (different for Super Admins vs Managers)
3. **AdminUsersManagement** - Super Admins can create, edit, delete other admins

## How to Integrate

You have two options:

### **Option 1: Quick Integration (Recommended for now)**

Add an "Admin" button to your main app that opens a modal with the login screen. Here's the template to add to your App.js:

```javascript
// 1. Import the components at the top of App.js
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import AdminUsersManagement from './src/screens/AdminUsersManagement';

// 2. Add this state to PermitManagementApp function (around line 1130-1150 where other state variables are)
const [adminSessionActive, setAdminSessionActive] = React.useState(false);
const [loggedInAdmin, setLoggedInAdmin] = React.useState(null);
const [adminCurrentView, setAdminCurrentView] = React.useState('dashboard'); // 'dashboard' or 'admin-users'
const [showAdminLoginModal, setShowAdminLoginModal] = React.useState(false);

// 3. Add these handler functions
const handleAdminLogout = () => {
  setAdminSessionActive(false);
  setLoggedInAdmin(null);
  setAdminCurrentView('dashboard');
  setShowAdminLoginModal(false);
};

const handleAdminLoginSuccess = (adminData) => {
  setLoggedInAdmin(adminData);
  setAdminSessionActive(true);
  setShowAdminLoginModal(false);
};

const handleAdminNavigate = (menuId) => {
  if (menuId === 'admin-users' && loggedInAdmin?.role === 'super_admin') {
    setAdminCurrentView('admin-users');
  } else {
    // For other menu items, you can add navigation later
    alert(`${menuId} coming soon`);
  }
};

// 4. Add Admin button to your main UI (find where other buttons are rendered)
// Look for existing buttons and add near them:
<TouchableOpacity
  style={{
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 8,
  }}
  onPress={() => setShowAdminLoginModal(true)}
>
  <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Admin</Text>
</TouchableOpacity>

// 5. Add this Modal to render the admin screens (add at the end of return statement, before </View>)
<Modal visible={adminSessionActive} animationType="slide">
  {adminCurrentView === 'dashboard' ? (
    <AdminDashboard
      adminUser={loggedInAdmin}
      onLogout={handleAdminLogout}
      onNavigate={handleAdminNavigate}
      styles={styles}
    />
  ) : adminCurrentView === 'admin-users' ? (
    <AdminUsersManagement
      onBack={() => setAdminCurrentView('dashboard')}
      styles={styles}
    />
  ) : null}
</Modal>

<Modal visible={showAdminLoginModal} animationType="slide">
  <AdminLoginScreen
    onLoginSuccess={handleAdminLoginSuccess}
    onCancel={() => setShowAdminLoginModal(false)}
    styles={styles}
  />
</Modal>
```

### **Option 2: Full Refactor (Later)**

Eventually, refactor your routing to be more modular by:
- Moving all view state into a context or state management system
- Creating a proper navigation stack for admin features
- Separating contractor flow from admin flow 

But that can wait until you have the basic functionality working.

## What Happens When User Logs In

1. Admin enters email + password
2. System looks up the email in `admin_users` table
3. Compares password using bcrypt
4. If match: Shows admin dashboard with role-appropriate menu
5. Super_admin sees: Inductions, Permit Issuers, Business Units, Sites, Services, Admin Users + all Manager options
6. Manager sees: Contractors, Companies, Visitor Inductions, Isolation Registers

## Next Steps

1. **Add the integration code above** to your App.js
2. **Try logging in** with the email/password you added to the database
3. **Test Super Admin menu** - Should see all options including "Admin Users"
4. **Test creating a new admin** - Super Admin can create new admin users from UI
5. **Change role** - Super Admin can change Manager to Super Admin and vice versa

## Database Check

To verify your admin account is set up:

```sql
SELECT id, email, name, role FROM admin_users;
```

You should see your admin account(s) with `role` = 'super_admin'.

## Troubleshooting

**Login fails with "Invalid email or password":**
- Check email matches exactly what's in database (case-sensitive)
- Verify password hash was created correctly
- Try creating a new admin user from Admin Users screen once logged in

**Can't find Admin button:**
- Make sure import statements are at top
- Check that Modal and TouchableOpacity components are imported from react-native
- Button may be off-screen - adjust padding/positioning

**Getting bcrypt errors:**
- Verify bcryptjs is installed: `npm list bcryptjs`
- Check `adminAuth.js` imports are correct

## File Structure

```
src/
  screens/
    AdminLoginScreen.js          (NEW)
    AdminDashboard.js            (NEW)
    AdminUsersManagement.js      (NEW)
    ...existing files
  api/
    adminAuth.js                 (NEW - database operations)
    ...existing files
```

## Security Notes

- Passwords are hashed with bcrypt (never stored as plain text)
- Role is stored in database and cannot be escalated in UI (only Super Admin can change)
- Session is stored in React state (clears on refresh - add localStorage later if needed)
- Each admin email is unique
