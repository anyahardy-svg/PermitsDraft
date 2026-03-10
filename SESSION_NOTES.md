# Session Notes - JSEA Template Site Filtering Implementation

**Date Started**: March 5-6, 2026  
**Status**: Complete and Pushed to GitHub  
**Main Goal**: Add site filtering to JSEA templates in ContractorAdminScreen

---

## Summary of Changes

Implemented site filtering for JSEA templates with searchable dropdown filters. Users can now:
- Filter templates by Company (single-select)
- Filter templates by Business Unit (multi-select)
- Filter templates by Site (multi-select)
- Templates saved without site restriction apply to all sites
- Templates with specific sites only show when those sites are filtered

---

## Commits Made

### 1. **Commit: 67ffcdab** - "feat: add site filtering to JSEA templates"
**Files Changed:**
- `src/api/templates.js` - Updated API functions to handle site IDs
- `src/screens/ContractorAdminScreen.js` - Added site filter UI and logic

**Changes:**
- Added optional `site_ids` parameter to `saveJseaTemplate()`
- Updated `getJseaTemplates()` to return `site_ids` from template data
- Updated `updateJseaTemplate()` to preserve `site_ids` when updating  
- Updated `getJseaTemplate()` and `getJseaTemplatesByCompany()` to include `site_ids`
- Added site filter UI section showing available sites
- Added site selection in the "Save JSEA Template" modal

### 2. **Commit: b03e6908** - "refactor: convert JSEA template filters to searchable dropdowns"
**Files Changed:**
- `src/screens/ContractorAdminScreen.js` - Converted button filters to searchable dropdowns

**Changes:**
- Replaced button-based filters with dropdown menus
- Added searchable/filterable text inputs for Company, Business Units, and Sites
- Support multi-select for Business Units and Sites
- Single-select for Company filter
- Dropdowns show selection count in closed state
- Search boxes reset when opening/closing dropdowns

### 3. **Commit: a6da80e5** - "fix: increase z-index for JSEA filter dropdowns"
**Files Changed:**
- `src/screens/ContractorAdminScreen.js` - Fixed z-index layering

**Changes:**
- Filter section: z-index 1000
- Company dropdown container: z-index 1050
- Business Units dropdown container: z-index 1045
- Site dropdown container: z-index 1040
- All dropdown content: z-index 1100
- Fixed issue where dropdowns were hidden behind template list

---

## Implementation Details

### API Changes (`src/api/templates.js`)

**saveJseaTemplate()** - Updated signature:
```javascript
export async function saveJseaTemplate(jseaName, jseaSteps, businessUnitIds, companyId = null, siteIds = [])
```
Now accepts optional `siteIds` array and stores in template data

**Template data structure:**
```javascript
data: {
  steps: jseaSteps,
  business_unit_ids: businessUnitIds || [],
  site_ids: siteIds || [],  // NEW
}
```

### UI Components (`src/screens/ContractorAdminScreen.js`)

**New State Variables:**
```javascript
const [jseaFilterSiteIds, setJseaFilterSiteIds] = useState([]);
const [selectedSiteIds, setSelectedSiteIds] = useState([]);
const [sites, setSites] = useState([]);
const [loadingSites, setLoadingSites] = useState(false);
const [jseaCompanySearch, setJseaCompanySearch] = useState('');
const [jseaBusinessUnitSearch, setJseaBusinessUnitSearch] = useState('');
const [jseaSiteSearch, setJseaSiteSearch] = useState('');
const [openDropdown, setOpenDropdown] = useState(null); // null, 'company', 'businessunit', or 'site'
```

**Filter Logic:**
- If no site filter selected: show all templates (including those without site restrictions)
- If site filter selected:
  - Show templates with NO site restriction (apply to all sites)
  - OR show templates with at least one matching site

**Dropdown UI:**
- Searchable/filterable text inputs for each filter
- Company: single-select dropdown
- Business Units & Sites: multi-select with checkboxes
- Dropdowns display selection count when closed
- All dropdowns use z-index 1100 to appear on top

---

## Key Design Decisions

1. **Optional Site Restriction**: Templates can be created without specifying sites (applies to all sites). This provides flexibility.

2. **Searchable Dropdowns**: Converted from button toggles to dropdowns for better UX with many items.

3. **Multi-select for Business Units & Sites**: Allows filtering by multiple values at once.

4. **Search Resets**: Search boxes clear when opening/closing dropdowns to keep UI clean.

5. **High Z-index Values**: Essential to prevent dropdowns from being hidden behind template list.

---

## Files Modified

### src/api/templates.js
- `saveJseaTemplate()` - Added siteIds parameter and storage
- `getJseaTemplates()` - Returns site_ids in response
- `updateJseaTemplate()` - Preserves site_ids
- `getJseaTemplate()` - Includes site_ids in response
- `getJseaTemplatesByCompany()` - Includes site_ids in response

### src/screens/ContractorAdminScreen.js
- Added import: `import { getSitesByBusinessUnits } from '../api/sites';`
- Added state variables for site filtering and dropdown search
- Added `loadSites()` function to fetch sites by business units
- Updated `resetJseaForm()` to clear site selections and search states
- Updated `handleSaveJseaTemplate()` to pass `selectedSiteIds` to API
- Updated filter logic in `renderJseaTemplates()` to include site filtering
- Replaced button-based filters with searchable dropdown menus
- Updated save modal to include optional site selection for templates

---

## Testing Checklist

- [x] Site filter dropdowns appear and are clickable
- [x] Search functionality works in all dropdowns
- [x] Multi-select works for Business Units and Sites
- [x] Dropdowns close properly and show selection count
- [x] Filter logic correctly shows/hides templates based on:
  - [x] Business unit selection
  - [x] Site selection  
  - [x] Company selection
- [x] Templates without site restriction show for all sites
- [x] Save modal allows selecting sites when creating templates
- [x] API correctly stores and retrieves site_ids

---

## Important Notes for Future Work

### CRITICAL - Maintain Consistency
When starting a new chat or working on related features:
1. **Site IDs are stored in template.data.site_ids** - Not in a separate table
2. **Empty site_ids array means the template applies to ALL sites** - This is intentional
3. **Site filter dropdowns use z-index 1100** - Keep this high to prevent overlap issues
4. **Always include site_ids when calling saveJseaTemplate()** - Pass empty array if not restricting to specific sites

### API Contract
```javascript
// Correct way to save a template
await saveJseaTemplate(
  templateName,
  steps,
  businessUnitIds,  // Required
  companyId,        // Optional (null = all companies)
  siteIds           // Optional ([] = all sites, [id1, id2] = specific sites)
);
```

### Future Enhancement Ideas
1. Add site selection UI to edit/update templates
2. Show which sites each template is restricted to in the template list
3. Add "Copy to sites" feature to duplicate templates across sites
4. Add bulk site assignment for multiple templates

---

## Related Files (Not Modified But Important)

- `src/api/sites.js` - Contains `getSitesByBusinessUnits()` function used to load available sites
- `supabase-schema.sql` - Schema definitions (no changes needed)
- Database migrations - Templates table has JSONB `data` field that stores site_ids

---

## Quick Reference for Next Session

**To continue development:**
1. Pull latest code: `git pull origin main`
2. Check the three commits above for exact changes made
3. Remember: templates store site restrictions in `data.site_ids`
4. All dropdown content needs z-index 1100 or higher
5. Use `getSitesByBusinessUnits()` to fetch available sites

**If things break:**
- Check z-index values in filter section
- Verify site_ids are being saved/loaded correctly from API
- Check that filter logic includes the site restriction check
- Make sure `loadSites()` is being called when business units change

---

---

# UPDATE: March 7-8 Features (From Other Machine)

**Status**: Pushed to GitHub, integrated into main  
**New Features**: Permit verification, risk matrix, auto-redirect, location improvements

---

## Today's Fixes to Verification Workflow (March 8 - Current Session)

### **FIXED: Permit Verification Workflow**

**Commits made today:**
- `0e33235c` - Restored verification dashboard card with proper function definitions
- `e3a25c30` - Added missing `needsVerification` and `handleVerifyPermit` functions
- `f4a4d68e` - Added verification name modal for systems without login

**What was fixed:**
1. ✅ Added missing `supabaseClient` import
2. ✅ Added `last_verified_at` and `verified_by` to permits API transform
3. ✅ Fixed blank screen by defining missing functions
4. ✅ **NEW**: Added verification modal that asks for verifier's name (since no login yet)

**How it works now:**
1. Dashboard shows "Needs Verification" card with red warning badge if any active permits need daily verification
2. Click card to view Active Permits
3. In active permit details, if permit needs verification (>24 hours):
   - Red warning box appears: "⚠️ Daily Verification Required"
   - Shows when last verified and by whom
   - Button: "✓ Verify Permit Now"
4. **NEW**: Clicking verify opens a bottom-sheet modal:
   - Text field asking for "Verifier's Name"
   - Name is mandatory - can't verify without entering one
   - Green "✓ Confirm Verification" button
   - Cancel button to close
5. After verification:
   - Updates `last_verified_at` with current timestamp
   - Updates `verified_by` with entered name
   - Shows green confirmation: "✓ Verified by [Name]"
   - Resets 24-hour verification timer

**Database columns used:**
- `last_verified_at` (timestamp) - When last verified
- `verified_by` (text) - Who verified it (now accepts manual entry)
- `business_unit_id` (uuid)

---

## Recent Commits Summary

### Verification & Dashboard Features (Earlier)
- **84f2bae1** - `feat: auto-redirect to verification and update dashboard`
- **787cc443** - `feat: add permit verification indicator to dashboard`
- **c40b3e70** - `feat: add 24-hour permit verification tracking`

### Risk Matrix & UI Improvements
- **45ccf1b6** - `feat: add interactive risk matrix modal for JSEA risk rating`
- **16cbe41f** - `fix: add risk matrix modal to approval and inspection screens`
- **59b25655** - `feat: move Location to top of all permit forms`

### Other Improvements
- **c26b8f18** - Renamed 'Completion Notes' to 'Comments'
- **337e2f42** - Added descriptive text to risk matrix options
- **a9457bc8** - Colored Controls Summary and contractor services
- **c582682d** - Dynamic z-index for filter dropdowns
- **62447cdc** - Merge all changes

### Latest Docs
- **c99f4d06** - Note columns already exist in permits table
- **325d7d41** - Removed problematic auto-redirect from dashboard

---

## What's Working Now

✅ **Permit Verification Workflow** - Dashboard card with verification modal  
✅ **Name Entry Modal** - Works without login system  
✅ **24-Hour Tracking** - Automatic verification requirement after 24 hours  
✅ **Risk Matrix Modal** - Interactive risk rating during approval
✅ **Form Organization** - Location field at top of all forms  
✅ **Dashboard Updates** - Verification indicators on permit cards

---

# UPDATE: March 10, 2026 - Company Accreditation Screen Refactoring

**Status**: Complete and Pushed to GitHub  
**Main Goal**: Fix ReferenceError bugs and add Section 22 (Environmental Management)

---

## Summary of Changes

### **FIXED: ReferenceError: section21 not defined**

**Problem**: After splitting Section 2 into Business Units and Accreditation Systems, a commit accidentally removed the `section21` state declaration, causing ReferenceError in browser console.

**Commits Made**:
1. **48903a55** - "Fix: Restore Section 21 state and update expandedSections initialization"
   - Restored `section21` state with all 10 Quality Management fields
   - Added Section 1-3 state documentation comments
   - Updated `expandedSections` initialization to include `'2.5': false` and `21: false`
   - Fixed ReferenceError blocking entire app

### **NEW SECTION: Section 22 - Environmental Management**

**Commits Made**:
1. **0c396856** - "Add Section 22: Environmental Management"
   - Created Section 22 with 5 environmental assessment items
   - Shows when ISO 14001 is NOT certified (independent conditional logic)
   - Added to buildUpdateData() function for data persistence
   - Updated API to query section 22 fields
   - Added section22 loading in loadCompanyData()

2. **98cadc42** - "Add database migration for Section 22: Environmental Management"
   - Created migration: `add-section22-environmental-management.sql`
   - Adds 15 columns to companies table (each of 5 items has _exists, _score, _evidence_url)
   - Uses IF NOT EXISTS for idempotency

---

## Section 18 - Injury Management (Completed Earlier)

**Previously completed**:
- Renamed fields: `incident_investigation_process` → `injury_management`
- Renamed fields: `corrective_actions` → `early_intervention`
- Created migration to rename database columns
- Updated API to query new field names

---

## Section 21 - Quality Management

**Status**: Functional (conditionally shows when ISO 9001 NOT certified)

**5 Assessment Items**:
1. Quality Manager and Plan
2. Roles and Responsibilities
3. Purchasing Procedures
4. Subcontractor Evaluation
5. Process Control Plan
6. Nonconformance Procedure
7. Product Rejection
8. Personnel Induction
9. Internal Audits
10. Continuous Improvement

---

## Section 22 - Environmental Management

**Status**: Newly Added

**5 Assessment Items**:
1. Has your company formally assessed the significant environmental aspects of its activities?
2. Does your company have a documented Environmental System and/or Environmental Plans?
3. Does the company have a specific policy or action plan relating to managing waste?
4. Has your company set targets for environmental improvements (sustainable purchasing, carbon footprint, etc.)?
5. Has your company set up a programme for training workers on environmental issues?

**Conditional Logic**:
- **Shows when**: ISO 14001 is **NOT** certified
- **Independent of**: Section 21 (Quality Management) and safety accreditations
- **Both can display simultaneously** if their respective ISO certifications are unchecked

---

## Database Schema Updates

### Section 18 Column Renames (Previously Done)
- `incident_investigation_process_exists` → `injury_management_exists`
- `incident_investigation_process_score` → `injury_management_score`
- `incident_investigation_process_evidence_url` → `injury_management_evidence_url`
- `corrective_actions_exists` → `early_intervention_exists`
- `corrective_actions_score` → `early_intervention_score`
- `corrective_actions_evidence_url` → `early_intervention_evidence_url`

### Section 22 New Columns (Just Added)
```sql
-- Each item has 3 columns (_exists, _score, _evidence_url)
environmental_aspects_assessment_*
environmental_system_and_plans_*
waste_management_policy_*
environmental_improvement_targets_*
environmental_training_programme_*
```

---

## Code Structure Overview

### State Declarations (CompanyAccreditationScreen.js)
- Lines 52: `expandedSections` - Includes all 22 sections + Section 2.5
- Lines 193-227: section20-22 state declarations
- Lines 208-223: section21 state (Quality Management - 10 items)
- Lines 225-231: section22 state (Environmental Management - 5 items)

### Conditional Section Logic
```javascript
isConditional: true,
conditionalKey: 'iso_9001_certified',  // Section 21
conditionalShowWhen: false,            // Show when NOT certified

isConditional: true,
conditionalKey: 'iso_14001_certified', // Section 22
conditionalShowWhen: false,            // Show when NOT certified
```

### Data Loading & Saving
- **loadCompanyData()**: Lines 627-671 load section22 from database
- **buildUpdateData()**: Lines 1357-1406 save section22 to database
- **useEffect dependencies**: Includes section22
- **API**: accreditations.js includes all section22 select fields

---

## Testing Checklist

- [x] Section 21 renders correctly when ISO 9001 NOT checked
- [x] Section 22 renders correctly when ISO 14001 NOT checked
- [x] Both sections can display simultaneously (independent logic)
- [x] Section 22 data loads from database
- [x] Section 22 data saves to database
- [x] Assessment scoring (1-4 scale) works for both sections
- [x] Evidence upload/delete functional for both sections
- [x] Database migration creates all 15 columns
- [x] API queries include all section22 fields
- [x] No errors in code compilation

---

## How It Works Now

### Accreditation Logic (Updated)
1. **User selects accreditations** in Section 2.5
2. **Safety Accreditation** (e.g., AEP, ISO 45001) → Skip safety questions (Sections 4-20)
3. **ISO 9001 (Quality)** → Skip Section 21 (Quality Management)
4. **ISO 14001 (Environmental)** → Skip Section 22 (Environmental Management)
5. Each section **independently conditional** - user must answer questions for any ISO they DON'T have

### User Experience
- Company without ANY ISO certifications: Must answer all questions (Sections 4-22)
- Company with ISO 9001 only: Must answer Sections 4-20 and 22 (skip 21)
- Company with ISO 14001 only: Must answer Sections 4-21 (skip 22)
- Company with both ISO 9001 and 14001: Must answer Sections 4-20 only (skip 21 & 22)
- Company with safety accreditation: Safety questions skipped (Sections 4-20)

---

## Files Modified

### src/screens/CompanyAccreditationScreen.js
- Added section22 state (line 225)
- Updated expandedSections initialization to include '2.5' and 22 (line 52)
- Updated useEffect dependencies to include section22 (line 1501)
- Added section22 data handling in buildUpdateData() (lines 1357-1406)
- Added section22 loading in loadCompanyData() (lines 627-671)
- Added Section 22 to renderSections__719() array with conditional logic (after Section 21)

### src/api/accreditations.js
- Added 15 section22 fields to getCompanyAccreditation() select statement (lines 245-260)

### migrations/add-section22-environmental-management.sql (NEW FILE)
- Adds all 15 columns for Section 22 to companies table
- Uses IF NOT EXISTS for safe migration execution

---

## Important Notes for Future Work

### Critical Information
1. **Section 21 Show Logic**: ISO 9001 NOT certified (conditionalShowWhen: false)
2. **Section 22 Show Logic**: ISO 14001 NOT certified (conditionalShowWhen: false)
3. **Database columns all added**: Ready to store section22 data
4. **API fully updated**: Can query and save section22 fields

### If Issues Occur
- Check expandedSections initialization includes '2.5' and 22
- Verify section22 is in useEffect dependencies
- Confirm section22 state fields match database column names
- Ensure API getCompanyAccreditation() includes all section22 fields

### Next Steps (If Needed)
- Create Section 23+ if required
- Add more accreditation-specific conditional rules
- Modify conditional logic if requirements change

---

## Still To Do

The following still need attention:
1. **Mandatory Fields Not Visually Marked** - No red border/highlighting on required fields
   - Need to add: Red borders to empty required fields on form submission attempts
   - Show validation error list specifying which fields are required when blocking submission

---

**Last Updated**: March 8, 2026 (Afternoon - Verification Modal Added)
