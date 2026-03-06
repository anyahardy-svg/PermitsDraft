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

**Last Updated**: March 6, 2026
