# Revised Roadmap - Induction & Kiosk First
**Updated: February 20, 2026**

## Decision: Pivot to Induction-First Approach

Instead of completing all permit polish (Phase 0), we're jumping to:
1. **Database expansion** (business units) - 2-3 hours
2. **Sign-In/Out Kiosk** (Phase 4 early) - 1.5-2 weeks
3. **Induction System** (Phase 2) - 2-2.5 weeks
4. **Return to permit polish** (Phase 0) - later

**Why:** One business unit needs this NOW. Provides quick ROI and showcases value.

---

## Phase 0.5: Business Unit Infrastructure (This Week)

### Goal
Restructure database to track which "business unit" (Winstone, Firth, etc.) each site belongs to.

### A. Database Migration
**Time: 2-3 hours**

```sql
-- Step 1: Create business_units table
CREATE TABLE business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  color TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  created_by_user_id UUID
);

-- Step 2: Add business_unit_id to sites table
ALTER TABLE sites ADD COLUMN business_unit_id UUID;
ALTER TABLE sites ADD CONSTRAINT fk_sites_business_unit 
  FOREIGN KEY (business_unit_id) REFERENCES business_units(id);

-- Step 3: Add index
CREATE INDEX idx_sites_business_unit ON sites(business_unit_id);

-- Step 4: Insert your business units
INSERT INTO business_units (name, code, color) VALUES
  ('Winstone Aggregates', 'WA', '#1E40AF'),
  ('Firth', 'FI', '#059669'),
  ('[Third Unit Name]', 'TU', '#DC2626');

-- Step 5: Update existing sites with their business units
UPDATE sites SET business_unit_id = (SELECT id FROM business_units WHERE code = 'WA')
WHERE name IN ('Hunua Quarry', 'Amisfield Quarry', 'Belmont Quarry', 'Flat Top Quarry');
-- ... etc for each site

UPDATE sites SET business_unit_id = (SELECT id FROM business_units WHERE code = 'FI')
WHERE name IN ('Simms Road', /* other Firth sites */);
```

### B. Test Data Script
**Time: 1 hour**

Create a SQL file `migrations/add-business-units.sql` that users can run to set up their data:

```sql
-- This file should be version controlled and run once
-- Created: 2026-02-20
-- Purpose: Add multi-business-unit support

-- 1. Create business_units table
CREATE TABLE IF NOT EXISTS business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  color TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 2. Add column to sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS business_unit_id UUID;

-- 3. Insert business units (USER MUST CUSTOMIZE)
INSERT INTO business_units (name, code, color) VALUES
  ('Winstone Aggregates', 'WA', '#1E40AF'),
  ('Firth', 'FI', '#059669'),
  ('[Third Unit]', 'TU', '#DC2626')
ON CONFLICT (name) DO NOTHING;

-- 4. Associate sites with business units (USER MUST UPDATE)
-- Update these after inspecting your sites table
UPDATE sites SET business_unit_id = (SELECT id FROM business_units WHERE code = 'WA')
WHERE name IN ('Hunua Quarry', 'Amisfield Quarry', 'Belmont Quarry', 'Flat Top Quarry', 'Otaki Quarry', 'Otaika Quarry', 'Pukekawa Quarry');

UPDATE sites SET business_unit_id = (SELECT id FROM business_units WHERE code = 'FI')
WHERE name IN ('Simms Road', 'Wheatsheaf Quarry', 'Whitehall Quarry');

-- 5. Verify
SELECT s.name, bu.name as business_unit FROM sites s
LEFT JOIN business_units bu ON s.business_unit_id = bu.id
ORDER BY bu.name, s.name;
```

### C. Update App.js Constants
**Time: 30 mins**

Add business units mapping to `App.js`:

```javascript
const ALL_BUSINESS_UNITS = [
  { id: 'bu1', name: 'Winstone Aggregates', code: 'WA', color: '#1E40AF' },
  { id: 'bu2', name: 'Firth', code: 'FI', color: '#059669' },
  { id: 'bu3', name: '[Third Unit]', code: 'TU', color: '#DC2626' }
];

// Map sites to business units
const SITE_TO_BUSINESS_UNIT = {
  'Hunua Quarry': 'WA',
  'Amisfield Quarry': 'WA',
  // ... etc
  'Simms Road': 'FI',
  // ... etc
};
```

### Deliverables
- ✅ `business_units` table created
- ✅ Sites associated with business units
- ✅ Migration script saved in version control
- ✅ App.js updated with mappings

---

## Phase 2.5: Sign-In/Out Kiosk (PRIORITY NOW)

### Goal
Tablet at site entrance. Contractors tap to sign in/out. Real-time "who's on site" dashboard.

### Why This First?
- Immediate operational value
- Simpler than inductions alone
- Shows what's possible
- Drives adoption

---

## A. Database Schema

```sql
-- Track sign-ins/outs
CREATE TABLE site_sign_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  signed_in_at TIMESTAMP NOT NULL DEFAULT now(),
  signed_out_at TIMESTAMP,
  duration_minutes INT GENERATED ALWAYS AS 
    (EXTRACT(EPOCH FROM (signed_out_at - signed_in_at)) / 60)::INT STORED,
  notes TEXT,
  device_id TEXT, -- which tablet/kiosk
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_sign_ins_site ON site_sign_ins(site_id);
CREATE INDEX idx_sign_ins_business_unit ON site_sign_ins(business_unit_id);
CREATE INDEX idx_sign_ins_contractor ON site_sign_ins(contractor_id);
```

**Time: 1 hour (schema design)**

---

## B. Kiosk Sign-In Screen Component

**Location:** New screen in App.js or separate component
**Time: 8-10 hours**

### Features:
1. **URL-based site selection:**
   ```
   https://tablet.yourdomain.com/?site=hunua
   OR
   https://tablet.yourdomain.com/?businessUnit=WA&site=hunua
   ```

2. **UI Layout (Tablet-Optimized):**
   ```
   ┌─────────────────────────────────┐
   │  📍 Hunua Quarry                │
   │  Winstone Aggregates            │
   ├─────────────────────────────────┤
   │                                 │
   │  CURRENTLY ON SITE: 5           │
   │  ┌───────────────────────────┐  │
   │  │ Who's signing in/out?     │  │
   │  ├───────────────────────────┤  │
   │  │ Search: [SEARCH BOX.....] │  │
   │  ├───────────────────────────┤  │
   │  │ 🔹 John Smith       [IN]  │  │
   │  │ 🔹 Sarah Jones      [IN]  │  │
   │  │ 🔹 Mike Brown       [IN]  │  │
   │  └───────────────────────────┘  │
   │                                 │
   │ [LIVE DASHBOARD]   [ADMIN MENU] │
   └─────────────────────────────────┘
   ```

3. **Workflow Rules:**
   - Display list of all contractors for that site
   - Tap contractor → Toggle sign-in/out
   - Visual indicator: [IN] = currently on site, [OUT] = not on site
   - Induction check: If not inducted, show warning + link to start induction
   - Confirmation: "John Smith signed in at 14:32"

4. **API Endpoints Needed:**
   ```javascript
   // New functions in src/api/
   
   // Get all contractors for a site
   getContractorsForSite(siteId)
   
   // Get live sign-ins for a site
   getLiveSignIns(siteId) // returns current on-site contractors
   
   // Create sign-in
   createSignIn(contractorId, siteId)
   
   // Create sign-out (close current open sign-in)
   createSignOut(contractorId, siteId)
   
   // Get contractor's induction status for site
   getInductionStatus(contractorId, siteId)
   ```

### Component Structure:
```
KioskSignInScreen
├── Header (Site name, business unit color)
├── StatsSummary (Currently on site: X)
├── SearchBar
├── ContractorList
│   └── ContractorItem
│       ├── Name
│       ├── Status (IN/OUT)
│       ├── SignInButton
│       └── InductionWarningBanner (if needed)
└── BottomNav
    ├── LiveDashboard button
    └── AdminMenu button
```

**Time: 8-10 hours**

---

## C. Live Dashboard (Manager View)

**Location:** New screen accessible from kiosk
**Time: 6-8 hours**

### Features:
1. **Real-time presence:**
   - Table: Contractor | Sign In Time | Duration | Status
   - Auto-refresh every 10 seconds
   - Color coding: Green (normal), Orange (4+ hours), Red (8+ hours)

2. **Filter options:**
   - Show all / Show only on-site / Show only off-site
   - Filter by contractor name

3. **Export:**
   - Download daily attendance as CSV
   - For payroll integration

### Component:
```
LiveDashboardScreen
├── Header (Site, time, refresh indicator)
├── StatsSummary
│   ├── Currently on site: X
│   ├── Total today: X
│   └── Avg duration: X hours
├── FilterButtons
├── ContractorTable
│   └── ContractorRow (name, sign-in time, duration, out button)
└── ExportButton
```

**Time: 6-8 hours**

---

## D. API Layer

**File:** `src/api/signIns.js` (new)
**Time: 3-4 hours**

```javascript
export const createSignIn = async (contractorId, siteId) => {
  // Insert new record into site_sign_ins
  // Return: { id, contractorId, siteId, signed_in_at }
};

export const createSignOut = async (contractorId, siteId) => {
  // Find latest sign-in for contractor at site
  // Update signed_out_at = now()
  // Return: { duration_minutes, signed_out_at }
};

export const getLiveSignIns = async (siteId) => {
  // SELECT * FROM site_sign_ins
  // WHERE site_id = siteId AND signed_out_at IS NULL
  // ORDER BY signed_in_at DESC
};

export const getDailyAttendance = async (siteId, date) => {
  // Get all sign-ins for a specific date
  // For CSV export
};
```

---

## E. Induction Check Integration

**Time: 2-3 hours**

When contractor tries to sign in:
1. **Check induction status:**
   ```javascript
   const inductionStatus = await getInductionStatus(contractorId, siteId);
   if (inductionStatus === 'not_inducted') {
     showWarning("Not inducted. Click to start induction");
     // Button links to: /induction?site={siteId}&contractor={contractorId}
   }
   ```

2. **Show banner:**
   ```
   ⚠️ [Contractor Name] is NOT inducted on this site
   [Start Induction] [Sign In Anyway]
   ```

3. **Still allow sign-in** (manager's choice)

---

### Phase 2.5 Deliverables
- ✅ Kiosk sign-in/out screen (tablet-optimized)
- ✅ Live dashboard for managers
- ✅ Real-time sign-in tracking database
- ✅ API layer for sign-in operations
- ✅ Induction status checks
- ✅ Export to CSV
- ✅ Mobile responsive (phone fallback)

**Total: ~30-35 hours (approximately 2 weeks)**

---

## Phase 3: Induction System (NEXT)

Once kiosk is working, build inductions on top of it.

### Goals:
- Site-specific induction modules
- Contractor acknowledgment/signature
- Expiry tracking
- Links to share with contractors

### Database:
```sql
CREATE TABLE inductions (
  id UUID PRIMARY KEY,
  site_id UUID NOT NULL,
  business_unit_id UUID NOT NULL,
  contractor_id UUID,
  inducted_at TIMESTAMP,
  expires_at TIMESTAMP (1 year from inducted_at),
  signature_url TEXT,
  status: ['pending', 'completed', 'expiring_soon', 'expired'],
  created_at TIMESTAMP
);

CREATE TABLE induction_modules (
  id UUID PRIMARY KEY,
  site_id UUID NOT NULL,
  title TEXT,
  content TEXT/HTML,
  order_number INT
);
```

**This will integrate with kiosk:** Kiosk will check if contractor is inducted before allowing sign-in.

**Time: 30-35 hours (2.5 weeks)**

---

## Timeline: Induction-First Approach

```
THIS WEEK (Feb 20-24):
  └─ Phase 0.5: Business units setup (3-4 hours) ✓

WEEK 1 (Feb 24 - Mar 3):
  └─ Phase 2.5: Sign-in/out kiosk (10-15 hours)

WEEK 2-3 (Mar 3 - Mar 17):
  └─ Phase 2.5: Kiosk finish + live dashboard (20 hours)

WEEK 4-5 (Mar 17 - Mar 31):
  └─ Phase 3: Induction system (30+ hours)

WEEK 6 (Apr onwards):
  └─ Return to Phase 0 (permit polish)
     OR Phase 1 (authentication) if ready
```

---

## What Needs Domain/Auth?

**Can start WITHOUT login/auth:**
- ✅ Kiosk sign-in (no login needed, just contractor selection)
- ✅ Inductions (shareable link, no login needed)
- ✅ Live dashboard (internal only, can add auth later)

**Needs auth/multi-tenant:**
- ❌ Induction modules admin (need to manage per site)
- ❌ Analytics/reporting
- ❌ Contractor management

### Bootstrap Plan:
1. **Build kiosk without auth** (works now)
2. **Build inductions without auth** (link-based)
3. **Hardcode induction content** (or upload manually)
4. **Add auth later** when you're ready for Phase 1

This lets your unit start using sign-in/inductions within 3-4 weeks.

---

## Next Steps

1. **Run the business units migration** (send you the SQL script)
2. **Start Phase 0.5 today** (2-3 hours)
3. **Begin kiosk design** (mockups/wireframes)
4. **Confirm contractor list** (who needs to sign in?)
5. **Plan induction content** (what should contractors learn?)

Ready to start?

---

## Questions for You

1. **Who should have access to the live dashboard?** (just site managers, or everyone?)
2. **Should sign-in be anonymous** (just tap contractor name) **or require confirmation?**
3. **Induction content:** Who writes it? (you, contractors, safety officer?)
4. **Kiosk hardware:** Which tablets? Android or iPad? Speed/resolution needed?
5. **Does sign-in need GPS location tracking** or just time?
6. **Notification preferences:** Email when contractors arrive? SMS reminders?

---

**Let's build this. First step: Business units setup. When can you run that migration?**
