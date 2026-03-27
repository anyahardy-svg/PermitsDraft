# INDUCTIONS SYSTEM - PDF UPLOAD & VIEWER ANALYSIS

**Date:** March 27, 2026  
**Purpose:** Understanding inductions system to implement PDF upload and viewer functionality

---

## 1. CURRENT VISITOR INDUCTIONS SYSTEM STRUCTURE

### 1.1 Database Schema
**Table:** `visitor_inductions`

```sql
CREATE TABLE visitor_inductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL (references sites.id),
  business_unit_id UUID NOT NULL (references business_units.id),
  content TEXT NOT NULL,                              -- HTML/plaintext visitor induction content
  last_updated_by UUID,                               -- User who edited
  last_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_visitor_induction_per_site UNIQUE(site_id)
);

CREATE INDEX idx_visitor_inductions_site_id ON visitor_inductions(site_id);
CREATE INDEX idx_visitor_inductions_business_unit_id ON visitor_inductions(business_unit_id);
```

**Key Points:**
- One induction per site (unique constraint on `site_id`)
- Stores HTML/plaintext content as TEXT field
- Currently **no file/URL field** for PDFs or attachments
- Tracks who updated it and when

---

### 1.2 Contractor Inductions System

**Main Table:** `inductions` (simplified single-table schema, Feb 28 2026)

```sql
CREATE TABLE inductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  induction_name TEXT NOT NULL,
  description TEXT,
  subsection_name TEXT,                              -- e.g., "MEWP", "Ladder", "Telehandler"
  is_compulsory BOOLEAN DEFAULT TRUE,
  order_number INT DEFAULT 0,
  
  -- Scope
  business_unit_ids UUID[] NOT NULL DEFAULT '{}',   -- Array of BU IDs
  site_id UUID REFERENCES sites(id),                -- NULL = applies to all sites
  service_id UUID,                                   -- Optional: links to specific service
  
  -- Video Content (currently supported)
  video_url TEXT,                                    -- YouTube URL
  video_duration INT,                                -- in minutes
  
  -- Assessment Questions (3 available)
  question_1_text TEXT,
  question_1_options JSONB,                          -- Array of 4 answer strings
  question_1_correct_answer INT,                     -- 0-3 index
  question_1_type TEXT,                              -- 'single-select' or 'multi-select'
  
  question_2_text TEXT,
  question_2_options JSONB,
  question_2_correct_answer INT,
  question_2_type TEXT,
  
  question_3_text TEXT,
  question_3_options JSONB,
  question_3_correct_answer INT,
  
  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(induction_name, subsection_name)
);

-- Progress Tracking
CREATE TABLE contractor_induction_progress (
  id UUID PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  induction_id UUID NOT NULL REFERENCES inductions(id),
  status TEXT DEFAULT 'in_progress',                 -- 'in_progress' or 'completed'
  answers JSONB DEFAULT '{}',                        -- { question_1: 0, question_2: 2 }
  signature_text TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(contractor_id, induction_id)
);
```

**Current Induction Flow for Contractors:**
1. Info collection (name, email, phone, company, business unit, sites)
2. Inductions list with compulsory/optional selection
3. Video viewing (YouTube embedded via WebView)
4. Assessment questions (up to 3 questions per induction)
5. Signature capture
6. Completion tracking

**Currently NO file/PDF field in inductions table**

---

### 1.3 API Endpoints

**File:** `/src/api/visitorInductions.js`
- `getVisitorInduction(siteId)` → Retrieves visitor induction content for a site
- `updateVisitorInduction(siteId, content, userId)` → Updates/creates visitor induction

**File:** `/src/api/inductions.js`
- `getAllInductions()` → Get all inductions
- `getInductionsByBusinessUnit(businessUnitId)` → Get inductions for BU
- `getInductionsBySite(siteId)` → Get site-specific or global inductions
- `getInductionsForContractor(contractorId, businessUnitId)` → Get applicable inductions
- `getCompulsoryInductions(businessUnitId)` → Get mandatory inductions
- `createInduction(inductionData)` → Create new induction
- `updateInduction(inductionId, updates)` → Update induction
- `deleteInduction(inductionId)` → Delete induction
- **Progress Tracking:**
  - `startInduction(contractorId, inductionId)` → Start tracking progress
  - `saveInductionAnswers(contractorId, inductionId, answers)` → Save Q&A responses
  - `saveInductionProgress(contractorId, inductionId, answers)` → Save for later
  - `completeInduction(contractorId, inductionId, signatureText)` → Mark as complete

---

### 1.4 UI Components/Screens

| Screen | File | Purpose |
|--------|------|---------|
| **InductionAdminScreen** | `src/screens/InductionAdminScreen.js` | Create/edit/delete inductions (admin portal) |
| **ContractorInductionScreen** | `src/screens/ContractorInductionScreen.js` | Contractor's induction workflow |
| **KioskVisitorInduction** | `src/screens/kiosk/KioskVisitorInduction.jsx` | Kiosk mode for visitor inductions |

---

## 2. FILE ATTACHMENT HANDLING - EXISTING PATTERNS

### 2.1 Storage Infrastructure

**Buckets in Supabase Storage:**
1. **`permit-attachments`** - For permit files (public bucket)
2. **`accreditations`** - For company accreditation certificates
3. **`training-records`** - For contractor training record PDFs and images

**RLS Policy Example (permit-attachments):**
```sql
CREATE POLICY "Allow unauthenticated uploads" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'permit-attachments');
```

---

### 2.2 Permit Attachment Implementation

**API File:** `/src/api/attachments.js`

```javascript
export const uploadAttachment = async (permitId, fileData, fileName) => {
  // 1. Convert file to Blob if needed
  // 2. Create unique path: ${permitId}/${timestamp}_${fileName}
  // 3. Upload to 'permit-attachments' bucket
  // 4. Return: { url, name, uploadedAt, path }
}

export const uploadMultipleAttachments = async (permitId, files) => {
  // Upload array of files, return array of metadata
}

export const deleteAttachment = async (filePath) => {
  // Delete from storage using filePath
}
```

**Database Storage:**
- Column: `attachments` (JSONB array type)
- Schema: `[{ url, name, uploadedAt, path }]`
- Example:
```json
[
  {
    "url": "https://...supabase.co/storage/v1/object/public/permit-attachments/permit-123/1708274642000_photo.jpg",
    "name": "photo.jpg",
    "uploadedAt": "2026-02-18T10:30:42.000Z",
    "path": "permit-123/1708274642000_photo.jpg"
  }
]
```

**Implementation in Permits (App.js):**
- `handlePickImage()` → Opens image library
- `handleTakePhoto()` → Opens camera
- Both convert file to Blob → call `uploadAttachment()` → store URL in `editData.attachments[]`
- Show attachment list with filename, timestamp, delete button
- Save button persists attachments to database: `updatePermit()`

**File Size Limits:**
- Permits: No explicit limit in code
- Training Records: 5MB max per file
- Accreditations: Checked but no explicit limit

---

### 2.3 Training Records File Upload

**API File:** `/src/api/trainingRecords.js`

```javascript
export async function uploadTrainingRecord(
  contractorId, 
  trainingType, 
  file, 
  expiryDate = null, 
  notes = ''
) {
  // 1. Validate file type: PDF | JPEG | PNG | GIF | WebP
  // 2. Check file size (max 5MB)
  // 3. Upload to 'training-records' bucket
  // 4. Create database record with: training_type, file_name, file_url, file_size, file_type, expiry_date, status, notes
  // 5. Update company training records counters
}
```

**Database Table:** `training_records`
```
- contractor_id UUID
- training_type TEXT
- file_name TEXT
- file_url TEXT
- file_size INTEGER
- file_type TEXT (MIME type)
- expiry_date DATE (optional)
- notes TEXT
- status TEXT ('pending', 'approved')
- uploaded_at TIMESTAMP
```

**Allowed File Types:**
- `application/pdf`
- `image/jpeg`, `image/png`, `image/gif`, `image/webp`

---

### 2.4 Accreditations File Upload

**API File:** `/src/api/accreditations.js`

```javascript
export const uploadAccreditationCertificate = async (companyId, certificationType, file) => {
  // 1. Upload to 'accreditations' bucket
  // 2. Path: accreditations/${companyId}/${certificationType}/${timestamp}_${filename}
  // 3. Return: { url, path }
}

export const deleteAccreditationCertificate = async (filePath) => {
  // Delete from 'accreditations' bucket using filePath
}
```

---

## 3. FILE VIEWING - CURRENT IMPLEMENTATIONS

### 3.1 PDF Generation (Export)
- **Library:** `jspdf` (v4.1.0)
- **Used in:** 
  - `App.js` - Generate permit PDFs
  - `src/screens/PermitScreen.js` - Permit export to PDF
- **Example:**
```javascript
import { jsPDF } from 'jspdf';

const doc = new jsPDF('p', 'mm', 'a4');
doc.text('Permit Content', 10, 10);
doc.save(`Permit_${permit.permitNumber}.pdf`);
```

### 3.2 File Viewing
**Current Pattern:** Use `Linking.openURL(url)` to open in browser/external viewer

**Example (CompanyAccreditationScreen.js):**
```javascript
<TouchableOpacity onPress={() => Linking.openURL(evidence_url)}>
  <Text>View Certificate</Text>
</TouchableOpacity>
```

**For embedded viewing:**
- **WebView Component** (React Native WebView v13.15.0)
- Used in `ContractorInductionScreen.js` for:
  - Embedding YouTube videos (induction videos)
  - Example: `<WebView source={{ uri: embedUrl }} />`
- Could theoretically embed PDFs using: `https://docs.google.com/gview?url=${pdfUrl}`

---

## 4. PDF VIEWING OPTIONS

### Option 1: External Browser/App
```javascript
// Simplest - opens in default app (browser, Adobe, etc)
import { Linking } from 'react-native';

Linking.openURL(pdfUrl);
```
**Pros:** No dependencies, works on all platforms  
**Cons:** No control over viewer, leaves app

---

### Option 2: WebView + Google Docs Viewer
```javascript
const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;

<WebView source={{ uri: googleViewerUrl }} />
```
**Pros:** Embedded viewer, no new dependencies  
**Cons:** Requires internet, Google Docs viewer deprecated for PDFs, limited control

---

### Option 3: Dedicated PDF Library
Would need to add a library like:
- **`react-native-pdf`** - Native PDF rendering
- **`expo-pdf`** (if available in Expo 54)
- **`pdf-lib`** - PDF manipulation (for creating/editing)

---

## 5. PACKAGE.JSON - RELEVANT DEPENDENCIES

```json
{
  "dependencies": {
    "expo": "~54.0.6",
    "expo-document-picker": "^55.0.8",     // Pick files from device
    "expo-image-picker": "^17.0.10",       // Pick/capture images
    "jspdf": "^4.1.0",                     // Generate PDFs
    "react-native-signature-canvas": "^5.0.1",  // Signature capture
    "react-native-webview": "13.15.0",     // Embed web content (YouTube, etc)
    "@supabase/supabase-js": "^2.91.1"     // Database & Storage
  }
}
```

**Available for PDF handling:**
- ✅ `expo-document-picker` - Select PDF files
- ✅ `react-native-webview` - Embed PDFs via Google Viewer or online viewer
- ✅ `jspdf` - Generate/return PDFs
- ❌ No native PDF viewer library currently installed

---

## 6. RECOMMENDED IMPLEMENTATION PLAN FOR INDUCTION PDF SUPPORT

### Phase 1: Database Schema Updates
1. Add `pdf_url` field to `inductions` table:
   ```sql
   ALTER TABLE inductions ADD COLUMN pdf_url TEXT;
   ALTER TABLE inductions ADD COLUMN pdf_file_path TEXT;
   ```

2. Add optional attachments to `visitor_inductions`:
   ```sql
   ALTER TABLE visitor_inductions ADD COLUMN pdf_url TEXT;
   ALTER TABLE visitor_inductions ADD COLUMN attachments JSONB;
   ```

3. Add `pdf_url` to `contractor_induction_progress` (for collected induction PDFs):
   ```sql
   ALTER TABLE contractor_induction_progress ADD COLUMN induction_pdf_url TEXT;
   ALTER TABLE contractor_induction_progress ADD COLUMN attachments JSONB;
   ```

---

### Phase 2: API Implementation
1. Create `/src/api/inductionAttachments.js` following the pattern from `attachments.js`
   - `uploadInductionPdf(inductionId, file)`
   - `deleteInductionPdf(filePath)`
   - `uploadVisitorInductionPdf(siteId, file)`
   - `uploadInductionProgressAttachment(progressId, file)`

2. Update inductions API endpoints to handle PDF uploads/downloads

3. Create new Supabase Storage bucket: `induction-attachments` (or reuse `permit-attachments`)

---

### Phase 3: UI Updates
1. **InductionAdminScreen:**
   - Add file picker for PDF upload when creating/editing induction
   - Show current PDF (if exists) with delete option
   - Display PDF in WebView modal

2. **ContractorInductionScreen:**
   - Add PDF viewing step before/after video
   - Allow file attachments during induction completion
   - Display induction PDF in modal/WebView

3. **KioskVisitorInduction:**
   - Display visitor induction PDF
   - Maybe show signature collection after PDF viewing

---

### Phase 4: File Viewing
Option A (Recommended - No new dependencies):
```javascript
// Use WebView + Google Docs Viewer
const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
<WebView source={{ uri: googleDocsUrl }} />
```

Option B (Better UX, requires new library):
```javascript
// Install: npx expo install react-native-pdf
// Provides native PDF rendering with search, zoom, etc.
```

---

## 7. STORAGE BUCKETS SUMMARY

| Bucket | Purpose | Access | File Types | Path Pattern |
|--------|---------|--------|-----------|--------------|
| `permit-attachments` | Permit files | Public (INSERT allowed) | Any | `{permitId}/{timestamp}_{filename}` |
| `accreditations` | Company certificates | Auth required | PDF, Images | `{companyId}/{type}/{timestamp}_{filename}` |
| `training-records` | Training PDFs | Auth required | PDF, Images | `{contractorId}/{timestamp}.{ext}` |
| `induction-attachments` (NEW) | Induction PDFs | TBD | PDF, Images | `{inductionId}/{timestamp}_{filename}` |

---

## 8. SECURITY CONSIDERATIONS

### Current Implementation
- **Permits:** Public bucket (unauthenticated uploads allowed)
- **Training Records:** Private bucket (authentication required)
- **Accreditations:** Private bucket (authentication required)

### For Induction PDFs
- **Visitor Inductions:** Could be public (same as permits)
- **Contractor Inductions:** Should be private (authentication required)
- **Induction Progress Attachments:** Private (contractor-specific)

---

## 9. EXISTING COMPLETED FEATURES

✅ **Permit Attachment System (Feb 18, 2026)**
- File upload to Supabase Storage
- Multiple file support
- Delete individual attachments
- Persistent storage in database (JSONB array)
- Works on all permit screens (Draft, Pending, Inspection, Active)

✅ **Training Record PDF Upload**
- File type validation (PDF, images)
- File size checking (5MB limit)
- Database record with metadata
- Company training record counters

✅ **Accreditation Certificate Upload**
- PDF and image support
- Organized storage by company and type

---

## 10. KEY FILES TO MODIFY

For PDF support in inductions:

1. **Database Migrations:**
   - New migration file: `add-pdf-fields-to-inductions.sql`

2. **API Files:**
   - New: `/src/api/inductionAttachments.js`
   - Update: `/src/api/inductions.js` (add PDF endpoints)
   - Update: `/src/api/visitorInductions.js` (add PDF support)

3. **Screen Components:**
   - Update: `/src/screens/InductionAdminScreen.js` (add PDF upload/view)
   - Update: `/src/screens/ContractorInductionScreen.js` (add PDF viewing step)
   - Update: `/src/screens/kiosk/KioskVisitorInduction.jsx` (add PDF display)

4. **Storage Setup:**
   - Update: `setup-storage-policies.js` (add RLS for `induction-attachments`)

---

## 11. TESTING CHECKLIST

- [ ] Create migration and run against database
- [ ] Test PDF upload from InductionAdminScreen
- [ ] Test PDF display in modal/WebView
- [ ] Test PDF deletion
- [ ] Test multiple PDFs (if supporting)
- [ ] Test on mobile (iOS/Android) via Expo
- [ ] Test on web version
- [ ] Test PDF viewing with various PDF sizes
- [ ] Test contractor induction flow with PDF
- [ ] Test visitor induction PDF display

---

## 12. NEXT STEPS

1. **Clarify requirements:**
   - Should inductions have multiple PDFs or just one main PDF?
   - Should visitors see PDF before/after/instead of text content?
   - Should contractors be able to upload evidence PDFs during induction?

2. **Design database schema changes** (confirm with team)

3. **Implement migration** and test with staging database

4. **Build API endpoints** for PDF upload/download (following existing patterns)

5. **Update UI components** with PDF viewing

6. **Choose PDF viewer** (Google Docs embedded vs. native library)

7. **Set up Supabase Storage bucket** and RLS policies

8. **Test end-to-end** workflows

---

## Appendix: Code Examples

### Example 1: Simple PDF Upload (following existing pattern)
```javascript
// inductionAttachments.js
export const uploadInductionPdf = async (inductionId, file) => {
  try {
    const blob = file instanceof Blob ? file : await fetch(file.uri).then(r => r.blob());
    const fileName = `${inductionId}/${Date.now()}_${file.name || 'induction.pdf'}`;
    
    const { data, error } = await supabase.storage
      .from('induction-attachments')
      .upload(fileName, blob, { contentType: 'application/pdf' });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('induction-attachments')
      .getPublicUrl(fileName);
    
    return {
      url: publicUrl,
      name: file.name,
      uploadedAt: new Date().toISOString(),
      path: fileName
    };
  } catch (error) {
    console.error('Error uploading induction PDF:', error);
    throw error;
  }
};
```

### Example 2: PDF Viewing in Modal
```javascript
// InductionAdminScreen.js
<Modal visible={showPdfModal} transparent={true}>
  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
    <TouchableOpacity 
      onPress={() => setShowPdfModal(false)}
      style={{ padding: 10 }}
    >
      <Text>✕ Close</Text>
    </TouchableOpacity>
    <WebView 
      source={{ 
        uri: `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true` 
      }}
      style={{ flex: 1 }}
    />
  </View>
</Modal>
```

---

