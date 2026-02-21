# Phase 0.5 Implementation Guide
## Multi-Business-Unit & Kiosk Sign-In System

**Created:** February 20, 2026  
**Target:** Kiosk sign-in system ready for Phase 1 auth integration  
**Duration:** 1-2 weeks  

---

## 📋 Overview

This Phase 0.5 bridges the current MVP permit system with the multi-business-unit architecture needed for scaling. It establishes:

1. **Multi-Business-Unit Foundation** → Support 3+ business units (Winstone Aggregates + 2 TBD)
2. **Kiosk Sign-In System** → Contractor/visitor check-in/out with induction validation
3. **Permit Templates** → Save & reuse completed permits
4. **Auto Sign-Out** → 16-hour automatic logout for forgotten sign-outs
5. **Audit Trail** → Compliance-ready logging

---

## 🗂️ Files & Structure

### Migration SQL
- **File:** `migrations/phase-0.5-multi-unit-kiosk.sql`
- **Size:** ~350 lines
- **Execution:** Copy entire file → paste in Supabase SQL Editor → run

### API Functions
New API modules created in `src/api/`:

1. **signIns.js** (285 lines)
   - `checkInContractor()` - Check in contractor at site
   - `checkInVisitor()` - Check in third-party visitor
   - `checkOut()` - Sign out (works for both)
   - `getSignedInPeople()` - Current on-site list
   - `getSignInHistory()` - Date range report
   - `getContractorHours()` - Hours worked per site

2. **inductions.js** (380 lines)
   - `startInduction()` - Begin induction workflow
   - `completeInduction()` - Mark inducted with signature
   - `getInductionStatus()` - Check if inducted/expired
   - `getContractorInductionStatus()` - Site-wide induction list
   - Admin functions for induction modules (CRUD)

3. **templates.js** (320 lines)
   - `savePermitAsTemplate()` - Save completed permit as template
   - `createPermitFromTemplate()` - Copy template to new permit
   - `getTemplates()` - List templates for business unit
   - `getTemplatesByType()` - Filter by permit type
   - Usage stats & analytics functions

---

## 🚀 Execution Steps

### Step 1: Run Database Migration
**Time: 5 minutes**

1. Go to **Supabase Dashboard** → SQL Editor
2. Create new query
3. Copy everything from `migrations/phase-0.5-multi-unit-kiosk.sql`
4. Click "Run"
5. Verify success (no errors)

**Verification queries** (from bottom of migration file):
```sql
SELECT * FROM business_units;
SELECT id, name, business_unit_id FROM sites LIMIT 5;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sign_ins';
```

### Step 2: Add Business Unit IDs to Existing Data
**Time: 10 minutes**

```sql
-- Assign "Winstone Aggregates" business unit to all existing sites
UPDATE sites 
SET business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
WHERE business_unit_id IS NULL;

-- Do the same for permit_issuers (users table)
UPDATE users 
SET business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
WHERE business_unit_id IS NULL AND is_admin = FALSE;

-- For admin users, you may want to leave NULL or assign manually
```

### Step 3: Copy API Functions to Project
**Time: 5 minutes**

- Copy `src/api/signIns.js` ✓ (already created)
- Copy `src/api/inductions.js` ✓ (already created)
- Copy `src/api/templates.js` ✓ (already created)

No additional imports needed - they all follow the same pattern as existing API files.

### Step 4: Create Kiosk Sign-In Screen Component
**Time: 3-4 hours** (estimate)

**File to create:** `PermitToWorkScreen.js` (or update if exists)

**Key features:**
- URL: `https://tablet.yourdomain.com/?site={siteId}`
- Large button interface (tablet-friendly)
- Two workflows:
  1. **Contractor Sign In** → Search list → Check inducted? → Sign in + warn if not inducted
  2. **Visitor Sign In** → Name + Company → Sign in
- **Sign Out** → List signed-in people → Tap to sign out

**Pseudo-code structure:**
```jsx
export function KioskScreen() {
  const [site, setSite] = useState(null);
  const [mode, setMode] = useState('select'); // 'select' | 'contractor' | 'visitor' | 'signout'
  const [signedInPeople, setSignedInPeople] = useState([]);

  useEffect(() => {
    // Get site from URL params
    // Load contractors for this site
    // Load currently signed-in people
  }, []);

  if (mode === 'contractor') return <ContractorSignIn site={site} onSuccess={handleCheckIn} />;
  if (mode === 'visitor') return <VisitorSignIn site={site} onSuccess={handleCheckIn} />;
  if (mode === 'signout') return <SignOutList people={signedInPeople} onSignOut={handleSignOut} />;
  
  return <ModeSelector onSelect={setMode} />;
}
```

**Components to create:**
- `<ContractorSignIn />` - Search/select contractor, check induction status
- `<VisitorSignIn />` - Name/company form
- `<SignOutList />` - List of signed-in people, tap to sign out
- `<InductionWarning />` - Alert if contractor not inducted

### Step 5: Add Admin Panel - Induction Management
**Time: 2-3 hours** (estimate)

Create new admin screen:
- **List inductions by site** - Show all contractors, induction status, expiry date
- **Add induction module** - Admin can add YouTube links, documents, etc.
- **Send induction link** - Generate shareable link for contractor to complete

**File to create:** `AdminInductionsScreen.js`

---

## 🧪 Testing Checklist

### Database Tests
- [ ] Business units table has 3 rows
- [ ] Sites have business_unit_id populated
- [ ] sign_ins table has all new fields
- [ ] Trigger auto_signout_at is set correctly
- [ ] induction_modules can be inserted
- [ ] permits table has is_template + template_name fields

### API Tests (Use Supabase Functions or test in browser console)

**Sign-In Functions:**
```javascript
import { checkInContractor, checkOut } from './src/api/signIns';

// Test contractor check-in
const result = await checkInContractor(contractorId, siteId, businessUnitId);
console.log(result);  // Should have success: true

// Test check-out
const signedIn = await getSignedInPeople(siteId);
const outResult = await checkOut(signedIn.data[0].id);
console.log(outResult);  // Should show duration_minutes
```

**Induction Functions:**
```javascript
import { startInduction, completeInduction } from './src/api/inductions';

// Test induction start
const modules = await startInduction(contractorId, siteId, businessUnitId);
console.log(modules.data);  // Should show induction modules

// Test induction complete
const complete = await completeInduction(contractorId, siteId, businessUnitId, null);
console.log(complete.data);  // Should show inducted_at, expires_at
```

**Template Functions:**
```javascript
import { savePermitAsTemplate, createPermitFromTemplate } from './src/api/templates';

// Save a permit as template
const saved = await savePermitAsTemplate(permitId, 'My Template Name');
console.log(saved);  // Should have is_template: true

// Create permit from template
const newPermit = await createPermitFromTemplate(templateId, siteId, businessUnitId);
console.log(newPermit.data);  // Should have status: 'pending-approval'
```

### UI Tests
- [ ] Kiosk screen loads with tablet layout
- [ ] Contractor check-in shows induction status
- [ ] "Not inducted" warning appears if contractor not inducted
- [ ] Sign-out list shows only people with check_out_time = NULL
- [ ] Templates appear in permit creation form
- [ ] Copying template pre-fills permit fields

---

## 📊 Database Schema Changes Summary

### New Tables
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `business_units` | Organization structure (3 business units) | id, name, description |
| `induction_modules` | Training content per site | site_id, title, content_type, duration_minutes |
| `contractor_inductions` | Per-site induction tracking | contractor_id, site_id, inducted_at, expires_at |

### Altered Tables
| Table | Changes | Reason |
|-------|---------|--------|
| `sites` | + business_unit_id FK | Multi-tenant filtering |
| `users` | + business_unit_id FK | Multi-tenant filtering |
| `sign_ins` | Complete redesign | Support contractor + visitor tracked separately |
| `permits` | + is_template, template_name, business_unit_id | Template feature + multi-unit support |
| `isolation_register` | + business_unit_id FK | Multi-tenant filtering |
| `audit_logs` | + business_unit_id, site_id | Better audit trail |

### Preserved Tables
| Table | Status | Reason |
|-------|--------|--------|
| `permit_issuer_site_id` | ✓ No changes | Valid junction table (issuer → site mapping) |
| `contractors` | ✓ No structural changes | Existing induction_expiry field still used; contractor_inductions table now tracks per-site |

---

## 🔐 Security (Phase 1 follows)

**Note:** RLS policies currently allow all (FOR ALL USING true).  
**Phase 1 will implement:**
- User authentication (Supabase Auth)
- Role-based access control
- Row-level security filters by business_unit_id + site_id

**For now:** Deploy with public policies in staging environment.

---

## 📝 Configuration

### Environment Variables
Add to `.env` (if not already present):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key  # For admin operations
```

### Auto-Sign-Out Trigger

The migration creates a trigger that runs on INSERT/UPDATE:
```sql
SET auto_signout_at := check_in_time + INTERVAL '16 hours'
```

To actually sign people out after 16 hours, you need a scheduled job:

**Option A: Supabase Cron Extension**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'auto-signout-daily',
  '0 0 * * *', -- Daily at midnight UTC
  'SELECT auto_signout_inactive_workers()'
);
```

**Option B: External Scheduler (Vercel Cron)**
Create `api/cron/auto-signout.js`:
```javascript
import { signIns } from '../../../src/api/signIns';

export default async function handler(req, res) {
  // Only allow Vercel cron calls
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await auto_signout_inactive_workers();
  return res.status(200).json(result);
}
```

Then in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/auto-signout",
    "schedule": "0 0 * * *"
  }]
}
```

---

## 🎯 Next Steps (Phase 1)

After Phase 0.5 is complete:

1. **Add User Authentication** (Supabase Auth)
   - Login screen
   - User context (who's logged in?)
   - Role assignment per business unit

2. **Implement RLS Policies**
   - Filter by business_unit_id + is_admin status
   - Site managers see only their sites
   - Contractors see only their permits

3. **Multi-Tenant Filtering**
   - All API calls include business_unit_id filter
   - Dashboard shows only user's sites/business unit

4. **Kiosk URL Protection**
   - Tablet.yourdomain.com requires site ID param
   - Auto-signs into specific site (no login needed)

---

## 📚 API Documentation

### signIns.js

```javascript
// Sign in contractor
checkInContractor(contractorId, siteId, businessUnitId)
→ { success, data, inducted, message }

// Sign in visitor
checkInVisitor(visitorName, company, siteId, businessUnitId)
→ { success, data }

// Sign out
checkOut(signInId)
→ { success, data: { ...signIn, duration_minutes } }

// Get current on-site people
getSignedInPeople(siteId)
→ { success, data: [{id, name, check_in_time, ..}] }

// Get sign-in history
getSignInHistory(siteId, startDate, endDate)
→ { success, data: [{...signed in/out records with duration}] }

// Get contractor hours by site
getContractorHours(contractorId)
→ { success, data: { siteId: hoursWorked, ... } }
```

### inductions.js

```javascript
// Start induction flow (returns modules to display)
startInduction(contractorId, siteId, businessUnitId)
→ { success, data: { modules, totalModules } }

// Complete induction with signature
completeInduction(contractorId, siteId, businessUnitId, signatureUrl, userId)
→ { success, data: {...inductionRecord}, message }

// Check induction status (inducted/expired/expiring_soon)
getInductionStatus(contractorId, siteId)
→ { success, data: { status, message, daysUntilExpiry } }

// Get all inductions at site (for admin)
getContractorInductionStatus(siteId)
→ { success, data: [{...induction with contractor_name, status}] }

// Admin: List induction modules for site
getInductionModules(siteId)
→ { success, data: [{ id, title, content, duration_minutes, order_number }] }

// Admin: Create induction module
createInductionModule(siteId, businessUnitId, { title, content, ... })
→ { success, data: {...moduleRecord} }
```

### templates.js

```javascript
// Save completed permit as template
savePermitAsTemplate(permitId, templateName)
→ { success, data: {...permitAsTemplate}, message }

// Get templates for business unit
getTemplates(businessUnitId)
→ { success, data: [{id, template_name, permit_type, ...}] }

// Create new permit from template
createPermitFromTemplate(templateId, siteId, businessUnitId, overrides)
→ { success, data: {...newPermit with status: 'pending-approval'}, message }

// Get templates by type (e.g., 'Hot Work')
getTemplatesByType(permitType)
→ { success, data: [{...templates matching type}] }

// Get most-used permit types (for templating suggestions)
getMostUsedPermitTypes(businessUnitId, limit)
→ { success, data: [{permit_type, usage_count}, ...] }
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `contractor_inductions` table won't insert | Check contractor exists in contractors table + foreign key |
| `auto_signout_at` isn't being set | Verify trigger exists: `SELECT * FROM pg_triggers WHERE tgname='sign_ins_auto_signout_trigger'` |
| Induction modules not showing | Check site_id and business_unit_id match |
| Template copy fails | Verify permit_id is actually a template (`is_template = true`) |
| Sign-in check return inducted=false but contractor is inducted | Check contractor_inductions.expires_at is in future |

---

## 📞 Questions?

Next items:

1. **Kiosk Screen UI** - Want to start building PermitToWorkScreen.js?
2. **Admin Induction Panel** - Different priority?
3. **Scheduled Job** - Should we use Supabase cron or Vercel cron?
4. **Test Data** - Need sample contractors/sites to test?

