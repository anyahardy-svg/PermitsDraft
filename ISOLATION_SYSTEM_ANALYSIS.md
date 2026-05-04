# Current Isolation System Analysis

## Executive Summary
The permit system currently handles isolations (lockouts) through a **flexible multi-entry model** that supports multiple people. Isolations can be sourced from a site-specific "Isolation Register" or entered manually as custom isolations.

---

## 1. Database Schema

### Isolation Register Table (`isolation_register`)
**Location:** [isolation-register-schema.sql](isolation-register-schema.sql)

**Structure:**
```sql
CREATE TABLE isolation_register (
  id UUID PRIMARY KEY
  site_id UUID NOT NULL (REFERENCES sites)
  main_lockout_item VARCHAR(255) NOT NULL
  linked_item_1 through linked_item_10 VARCHAR(255)  -- up to 10 linked items
  key_procedure TEXT
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

**Key Characteristics:**
- One main lockout item per register entry
- Up to 10 linked items (individual fields for each)
- Associated with a specific site
- Read-only template data for reference

### Permits Table Integration
**Location:** [supabase-schema.sql](supabase-schema.sql)

**Current schema (before isolation enhancement):**
```sql
CREATE TABLE permits (
  id UUID PRIMARY KEY
  -- ... other fields
  specialized_permits JSONB DEFAULT '{}'
  single_hazards JSONB DEFAULT '{}'
  jsea JSONB DEFAULT '{}'
  sign_ons JSONB DEFAULT '{}'
  -- Note: No isolation column in base schema
)
```

**Isolation migration added:**
```sql
ALTER TABLE permits ADD COLUMN IF NOT EXISTS isolations JSONB DEFAULT '[]';
CREATE INDEX idx_permits_isolations ON permits(isolations);
```

---

## 2. Current Data Structure for Isolations

### Isolation Entry Object (JavaScript/JSONB)
Each isolation in the `permits.isolations` array contains:

```javascript
{
  // REGISTER SOURCE
  main_lockout_item: string,        // What was isolated (from register)
  linked_items: [string, ...],      // Array of up to 10 linked items
  key_procedure: string,            // Procedure to follow
  source: 'register',               // Indicates sourced from register
  
  // MANUAL SOURCE
  what: string,                     // Manual description of what was isolated
  source: 'manual',                 // Indicates manually entered
  
  // COMMON TO ALL
  isolatedBy: string,               // Name of person who isolated (SINGLE PERSON)
  isolatedByCompany: string,        // Company of the person who isolated
  date: string,                     // ISO date format (yyyy-mm-dd)
  
  // For display formatting
  source: 'register' | 'manual'
}
```

### Example Data:
```javascript
[
  {
    main_lockout_item: "Main power isolator - Panel A",
    linked_items: ["Emergency stop button", "Circuit breaker CB-2"],
    key_procedure: "Test with test kit before and after isolation",
    isolatedBy: "John Smith",
    isolatedByCompany: "ABC Contractors",
    date: "2026-05-04",
    source: "register"
  },
  {
    what: "Hydraulic pressure line to boom",
    isolatedBy: "Jane Doe",
    date: "2026-05-04",
    source: "manual"
  }
]
```

---

## 3. UI Collection Method

### Isolations Section in PermitScreen
**Location:** [App.js](App.js#L4134-L4450)

#### Current UI Supports Multiple Isolations:
✅ **Multiple entries allowed** - Users can add multiple isolations
- Each isolation is an array element in `formData.isolations`
- `addIsolation()` function adds a new empty isolation entry
- `updateIsolation(idx, field, value)` updates specific isolation by index
- `removeIsolation(idx)` removes an isolation from the list

#### Current UI for Single Person Per Isolation:
⚠️ **LIMITATION: ONE PERSON PER ISOLATION**
- `isolatedBy` is a single TEXT field (not an array)
- Only stores one person's name per isolation entry
- Autocomplete dropdown for contractors by site

#### Data Entry Flow:

1. **Select from Isolation Register (Preferred)**
   - Dropdown shows main lockout items from site's isolation register
   - Auto-populates: main_lockout_item, linked_items, key_procedure
   - Source automatically set to 'register'

2. **Manual Entry Option**
   - "Add Custom Isolation" button for manual entries
   - User enters: what (what was isolated)
   - Source automatically set to 'manual'

3. **Person Collection**
   - Single text field: "Isolated by (name)"
   - Autocomplete filters contractors by:
     - Site (if site selected)
     - Name prefix matching
     - Shows contractor name and company
   - Can also be free text (not required to match contractor)

4. **Date Collection**
   - Single date field per isolation
   - Format: dd/mm/yyyy (display), yyyy-mm-dd (storage)
   - Converted automatically on input

#### Visual Indicators:
- **Green border** (register source): Indicates from isolation register template
- **Yellow border** (manual source): Indicates manually entered
- Displays linked items and key procedure for register-sourced isolations

---

## 4. Current Limitations & Considerations

### Multi-Person Support:
❌ **NOT CURRENTLY SUPPORTED**
- Each isolation entry allows only ONE person (`isolatedBy`)
- No array/list of people per isolation
- If multiple people isolated the same item, separate isolation entries would be needed

### Workarounds if Multiple People Needed:
1. Create duplicate isolation entries (one per person)
2. Enter multiple names in the `isolatedBy` field as text (but not structured)
3. Would need code changes to support array of people

### Data Integrity:
- Isolations stored as JSONB in permits table
- Index on `isolations` column for query performance
- No foreign key constraint to isolation_register (allows flexibility)
- Linked items stored as array in the JSONB object

---

## 5. API Functions

**Location:** [src/api/isolationRegisters.js](src/api/isolationRegisters.js)

Available operations:
- `listIsolationRegisters()` - Get all isolation registers
- `listIsolationRegistersBySite(siteId)` - Get registers for specific site
- `createIsolationRegister(data)` - Create new register entry
- `updateIsolationRegister(id, data)` - Update existing register
- `deleteIsolationRegister(id)` - Delete register entry

---

## 6. Template Files

**Location:** [Checklists/](Checklists/)

Documented templates include:
- PTW-All-Permitted-Work.docx
- Hot Work, Confined Space, Excavation templates
- Various work-type specific checklists

These templates reference isolation requirements but are document-based, not directly linked to the data structure.

---

## 7. Current Questionnaire References

**Location:** [App.js](App.js#L646-L901)

Isolation-related questions in permit questionnaires:
- `isolations`: "Are all isolations necessary completed?" (yes/no)
- `isolation_requirements`: "Isolation requirements completed? Test and prove all isolations..."
- `lockout_recorded`: "All people working have applied a lockout and these are recorded in Isolations section"

These are separate from the actual isolation data collection.

---

## 8. Migration Status

**File:** [add-isolations-to-permits.sql](add-isolations-to-permits.sql)

Migration adds:
```sql
ALTER TABLE permits ADD COLUMN IF NOT EXISTS isolations JSONB DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_permits_isolations ON permits(isolations);
```

Status: Applied during database setup.

---

## Key Findings Summary

| Aspect | Current Status |
|--------|----------------|
| **Multiple Isolations** | ✅ YES - Array of isolation objects |
| **Multiple People Per Isolation** | ❌ NO - Single person field only |
| **Data Storage** | ✅ JSONB in permits table |
| **Register Integration** | ✅ YES - Template-based selection |
| **Manual Entry** | ✅ YES - Custom isolation support |
| **Site-Scoped** | ✅ YES - Filters by site |
| **Structured Data** | ✅ YES - Object with typed fields |
| **API Support** | ✅ YES - Full CRUD operations |

---

## Recommendations for Enhancement

If multiple people need to be tracked per isolation:

1. **Option A: Separate Isolation Entries** (No code change)
   - Create one isolation entry per person
   - Duplicate isolation details, different person
   - Simple but verbose

2. **Option B: Array of People** (Code change required)
   - Change `isolatedBy` to `isolatedByList: [{name, company, date}, ...]`
   - Update UI to support multi-select/multi-entry for people
   - More complex but cleaner data model
   - Requires:
     - DB schema change: Convert JSONB structure
     - UI changes: Multi-person input in isolation form
     - API validation updates

3. **Option C: Linking Table** (Larger refactor)
   - Create `permit_isolations_people` junction table
   - Separate concerns: isolation definition vs. who isolated it
   - Most normalized approach

---

## Related Documentation
- [ATTACHMENTS_SESSION_SUMMARY.md](ATTACHMENTS_SESSION_SUMMARY.md)
- [ACCREDITATION_IMPLEMENTATION_SUMMARY.md](ACCREDITATION_IMPLEMENTATION_SUMMARY.md)
- [SESSION_PROGRESS_REPORT.md](SESSION_PROGRESS_REPORT.md)
