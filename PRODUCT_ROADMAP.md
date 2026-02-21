# Permit Management System - Product Roadmap
**Version 1.0** | Last Updated: February 20, 2026

---

## 🎯 Vision Statement

Build a **unified workforce operations platform** for construction/industrial sites that manages:
- **Permits**: Work approvals, handovers, expiry tracking
- **Inductions**: Site-specific contractor training tracking
- **Accreditations**: Contractor credentials, training docs, annual reviews
- **Site Access**: Kiosk sign-in/out, real-time contractor presence

**Scope:** 100 sites, 3 business units, multi-tenant platform
**Target Users:** Site managers, inspectors, contractors, administrators
**Distribution:** Web app (Vercel) + mobile apps (iOS/Android app stores)

---

## 📊 Release Timeline Overview

```
NOW (Feb 2026)          MVP Complete ✓
      ↓
Week 1-2 (Feb)          Phase 1: Permit System Polish
Week 3-4 (Mar)          Phase 2: Auth & Multi-tenant Setup
Week 5-6 (Mar-Apr)      Phase 3: Induction System
Week 7-8 (Apr)          Phase 4: Accreditation System
Week 9-10 (May)         Phase 5: Site Kiosk & Analytics
      ↓
Late May 2026           App Store Release
      ↓
June 2026 onwards       Maintenance & Scale
```

---

## Phase 0: MVP - Permit System (CURRENT - Week of Feb 17)

### Status: 90% Complete
- ✅ Core permit creation & workflow
- ✅ Attachment uploads
- ✅ Attachment preview modal (just added)
- ⏳ **BLOCKED:** Several features needed before release

### Remaining Work (Est: 2-3 weeks)

#### A. Risk-Based Inspection Routing
**Why:** Only permits marked as High/Very High risk should require inspection

**Implementation:**
- JSEA: Auto-mark as "needs inspection" if risk is High/Very High
- Hot Work, Lifting, Confined Space, Excavation, Working at Height: Always require inspection
- Medium/Low risk: Skip inspection, go straight to Active

**Changes:**
1. Add `requires_high_risk_inspection` boolean flag to permits
2. Assess risk level when permit is created/modified
3. Route to "Pending Inspection" only if flag = true
4. Auto-approve Low/Medium risk permits (set status = active directly)

**Files to modify:**
- `App.js` - Risk assessment logic, routing logic
- `src/api/permits.js` - Add assessment function

**Time Est:** 4-5 hours

---

#### B. 24-Hour Auto-Review Process
**Why:** Any permit valid >1 day that's NOT signed off in 24hrs needs re-validation

**Implementation:**
1. **Setup automated job** (use Supabase cron or cloud function):
   - Run daily at 00:00 UTC
   - Find permits where: `created_date < 24h ago` AND `status = pending_inspection OR active` AND `NOT signed_off`
   - Update: `status = needs_review`, `review_triggered_at = now`

2. **Review Screen:**
   - Shows permit details
   - Single checkbox: "Scope of work still valid?"
   - Optional text field: "Notes or issues"
   - Two buttons: "Approve & Continue" or "Reject & Reassess"

3. **"Needs Review" Section on Dashboard:**
   - New card showing count of permits needing review
   - Tappable to filter/view list
   - Color: Orange/warning

**Database Schema Changes:**
```sql
ALTER TABLE permits ADD COLUMN (
  requires_high_risk_inspection BOOLEAN DEFAULT false,
  review_triggered_at TIMESTAMP,
  review_valid_scope BOOLEAN,
  review_notes TEXT,
  reviewed_by_user_id UUID
);
```

**Components to Create:**
- `ReviewPermitScreen` - Simple review workflow
- `ReviewSummary` - Dashboard card

**Time Est:** 6-8 hours

---

#### C. Permit Handover Workflow
**Why:** If permit issuer leaves site, work continues under new issuer

**Implementation:**

*On Active Permit Screen, add "Handover" button next to Sign-Off:*

1. **Handover Modal:**
   - Search/select new permit issuer from dropdown
   - Reason field (optional): "Previous issuer left site", etc.
   - Confirmation dialog

2. **Database:**
   - Update `current_issuer_id` on permit
   - Log in new `handover_log` array:
     ```json
     {
       "from_user_id": "uuid1",
       "to_user_id": "uuid2",
       "date": "2026-02-20",
       "reason": "Previous issuer departed"
     }
     ```

3. **Notification:**
   - Alert: "Handover successful. New issuer is [name]"
   - New issuer notified (if auth system ready) that they inherited a permit

**Files to modify:**
- `App.js` - Add handover button & modal on EditActivePermitScreen
- `src/api/permits.js` - Add handover function

**Time Est:** 3-4 hours

---

#### D. Signature Capture (Proper Implementation)
**Why:** Current implementation just stores text. Need actual drawing/signature.

**Implementation Option 1: Drawing Canvas (Recommended for mobile)**
- Use `react-native-signature-canvas` or `react-native-svg`
- Signature pad appears when user taps sign-off section
- Signature saved as image (PNG/JPEG) and uploaded to Supabase Storage
- Display signature thumbnail in permit

**Implementation Option 2: Photo Upload**
- Use existing camera/gallery upload
- Take clear photo of physical signature

**Recommendation:** Option 1 - more professional, legally recognized

**NPM Package:**
```bash
npm install react-native-signature-canvas
```

**Files to modify:**
- `App.js` - Add signature pad to completion modal
- `src/api/attachments.js` - Add signature upload function

**Time Est:** 4-6 hours

---

#### E. Rejected Permits Section
**Why:** Currently rejected permits disappear - need audit trail

**Implementation:**

1. **Dashboard Addition:**
   - Add new card: "Rejected" (count)
   - Color: Red/error

2. **New Screen:**
   - List all permits with status = "rejected"
   - Show: Permit #, submission date, rejection date, reason
   - Allow filtering by date range
   - View details (read-only) of the rejected permit

3. **Rejection Modal Enhancement:**
   - When rejecting, show text field: "Reason for rejection"
   - Save reason to `rejection_reason` field
   - Add `rejected_date` and `rejected_by_user_id`

**Database Schema:**
```sql
ALTER TABLE permits ADD COLUMN (
  rejection_reason TEXT,
  rejected_date DATE,
  rejected_by_user_id UUID
);
```

**Time Est:** 3-4 hours

---

#### F. Combine Sign-Off Buttons
**Why:** No reason for "Save Sign-Off" AND "Save Changes" - confusing

**Implementation:**

*On Active Permit Screen ("Sign-Off" tab):*
- Single button: "Complete & Sign Off"
- Logic:
  - If 2 signatures present → set status = "completed" → navigate to dashboard
  - If 1 signature → save it, show confirmation, stay on screen for 2nd signature
  - Show progress: "Signature 1 of 2" or "Signature 2 of 2"

**Files to modify:**
- `App.js` - EditActivePermitScreen button logic

**Time Est:** 2 hours

---

#### G. Dashboard - Last 7 Days Completed
**Why:** Dashboard should show relevant recent completions, not just count

**Implementation:**
- Change "7 Days" card to show 7-day completed permits in a list/preview
- Filter: permits where `status = "completed"` AND `completed_date >= now() - 7 days`
- Show small table: Permit #, Site, Completion Date, Duration

**Time Est:** 2 hours

---

#### H. Admin - Historical Permit Lookup
**Why:** Need to search/view old permits for compliance/audits

**Implementation:**

1. **New Admin Screen: "Search Permits"**
   - Filter by: Date range, site, status, contractor, permit issuer
   - Display results in table
   - Click to view full details (read-only)

2. **Export Feature:**
   - Download as CSV: permit data for selected period
   - Useful for audits

**Time Est:** 4-5 hours

---

### Phase 0 Summary

| Task | Hours | Priority | Dependencies |
|------|-------|----------|---|
| Risk-based inspection routing | 5 | Critical | Core logic |
| 24-hour auto-review process | 8 | Critical | Database setup |
| Permit handover workflow | 4 | High | User management |
| Signature capture (proper) | 5 | High | Mobile testing |
| Rejected permits section | 4 | High | Dashboard changes |
| Combine sign-off buttons | 2 | Medium | UI fix |
| Dashboard last 7 days | 2 | Low | Display tweak |
| Admin historical lookup | 5 | Medium | Search/filter |

**Total: ~35 hours (~1 week intensive work)**

### Blockers Before Release
- ⚠️ **Authentication needed** (currently no user login) - blocks multi-user tracking
- ⚠️ **24-hour automation** - need scheduled job (Supabase cron, AWS Lambda, etc)
- ⚠️ **Signature capture library** - requires testing on mobile

---

## Phase 1: Authentication & Multi-Tenant Setup (Week 3-4, Est 2 weeks)

### Goals
- Implement proper user login system
- Support multi-tenant architecture (100 sites, 3 business units)
- Role-based access control

### Why This Matters
Without auth, you can't track who did what (critical for compliance). Multi-tenant is required to scale to 100 sites.

### Key Features

#### A. User Authentication
- **Option 1:** Supabase Auth (recommended - integrates with your DB)
- **Option 2:** Firebase Auth
- **Option 3:** Custom JWT (not recommended - more work)

**Recommended:** Supabase Auth
- Sign up / Sign in page
- Email verification
- Password reset
- Session management
- Already connected to your database

**Database Schema:**
```sql
users (
  id UUID (from Supabase Auth),
  email,
  name,
  phone,
  avatar_url,
  created_at,
  updated_at
);

user_roles (
  id UUID,
  user_id UUID,
  site_id UUID,
  business_unit_id UUID,
  role: ['site_manager', 'inspector', 'worker', 'admin'],
  created_at
);

user_site_access (
  id UUID,
  user_id UUID,
  site_id UUID,
  inducted_at TIMESTAMP,
  inducted_by_user_id UUID
);
```

**Time Est:** 6-8 hours

---

#### B. Multi-Tenant Filtering
Every query should filter by user's sites

**Implementation:**
- Store current user context in app state
- Modify all API calls to include site_id filter
- Example:
  ```javascript
  // OLD
  const permits = await listPermits();
  
  // NEW
  const permits = await listPermits(userSites);
  // WHERE site_id IN (userSites)
  ```

**Files to modify:**
- All `src/api/*.js` files - add site_id filtering
- `App.js` - add user context

**Time Est:** 8-10 hours

---

#### C. Role-Based Permissions
Control what each user can do

**Roles:**
- **Admin:** All permissions across all sites
- **Site Manager:** Full control of assigned site(s)
- **Inspector:** View/inspect permits, sign off
- **Worker/Contractor:** View own permits, sign on/off

**Implementation:**
- Check `user_roles` before rendering/allowing actions
- Hide buttons/screens from unauthorized users
- Example:
  ```javascript
  {userRole === 'admin' && <AdminPanel />}
  {['site_manager', 'admin'].includes(userRole) && <ApprovalButton />}
  ```

**Time Est:** 4-6 hours

---

### Phase 1 Deliverables
- ✅ Login/signup screen
- ✅ User context (who's logged in)
- ✅ Role-based UI rendering
- ✅ Multi-site filtering
- ✅ User management (add/remove users per site)

**Total: ~20-25 hours (1.5 weeks)**

---

## Phase 2: Induction System (Week 5-6, Est 2 weeks)

### Goals
- Track contractor inductions per site
- Manage induction expiry
- Send induction links to contractors
- Restrict work if not inducted

### Why This Matters
Safety/compliance - contractors must be inducted before working on site. Automation saves manual tracking.

### Key Features

#### A. Induction Tracking Database
```sql
inductions (
  id UUID,
  contractor_id UUID,
  site_id UUID,
  inducted_by_user_id UUID,
  inducted_at TIMESTAMP,
  expires_at TIMESTAMP (usually 1 year),
  induction_type: ['manual', 'online', 'refresher'],
  acknowledgment_signature_url,
  status: ['pending', 'completed', 'expiring_soon', 'expired']
);

induction_modules (
  id UUID,
  site_id UUID,
  title TEXT (e.g., "Site Safety Overview"),
  content TEXT/HTML,
  duration_minutes INT,
  order_number INT
);
```

**Time Est:** 3 hours (DB + schema design)

---

#### B. Induction Content Management (Admin Screen)
- Admin can create/edit induction modules per site
- Set expiry duration (e.g., "expires after 1 year")
- Add documents, HTML content
- Embed YouTube videos via URL or iframe (videos already hosted on YouTube)
- Link to existing YouTube induction videos for each site

**Time Est:** 4-5 hours (reduced - no video upload/encoding needed)

---

#### C. Contractor Induction Workflow
1. **Contractor receives link:** `https://app.yourdomain.com/induction?site=site123&contractor=abc`
2. **Anonymous access:** No login required for initial induction
3. **Content shown:** Site-specific modules
4. **Signature:** Contractor draws signature acknowledging completion
5. **Database updated:** induction status = "completed"
6. **Notification:** Site manager notified

**Time Est:** 8-10 hours

---

#### D. Audit & Expiry Tracking
- List all contractors, their induction status per site
- Auto-mark as "expiring_soon" (14 days before expiry)
- Send notifications to contractor and site manager
- Generate links to refresh induction

**Time Est:** 5-6 hours

---

#### E. Induction Link Generation
- Admin generates shareable link to send to contractor
- Link expires after 30 days (or completion)
- Can regenerate if needed
- Works on mobile without app install

**Time Est:** 3-4 hours

---

### Phase 2 Deliverables
- ✅ Induction content per site
- ✅ Contractor induction completion tracking
- ✅ Expiry management & notifications
- ✅ Link generation & sharing
- ✅ Audit reports

**Total: ~30-35 hours (2.5 weeks)**

---

## Phase 3: Accreditation System (Week 7-8, Est 2 weeks)

### Goals
- Contractors upload training certs, licenses, etc.
- Schedule annual reviews
- Track expiry dates
- Send reminders

### Why This Matters
Compliance - proof contractors have required qualifications. Automated reminders prevent lapses.

### Key Features

#### A. Accreditation Types & Database
```sql
accreditations (
  id UUID,
  contractor_id UUID,
  accreditation_type: ['training', 'certification', 'license', 'insurance'],
  title TEXT (e.g., "CSCS Card", "Manual Handling"),
  document_url TEXT,
  issued_date DATE,
  expires_date DATE,
  issuing_body TEXT,
  document_file_id UUID (reference to storage)
);

accreditation_reviews (
  id UUID,
  accreditation_id UUID,
  scheduled_date DATE,
  reviewer_user_id UUID,
  status: ['pending', 'approved', 'rejected', 'renewal_required'],
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP
);
```

**Time Est:** 3 hours

---

#### B. Contractor Portal - Upload Accreditations
- Contractor logs in or uses link
- Upload documents (PDF, JPG, etc)
- Add title, expiry date
- System extracts & stores info

**Time Est:** 6-8 hours

---

#### C. Accreditation Dashboard (Admin)
- List all contractors
- Show accreditation status (valid, expiring, expired)
- Filter by type, expiry date, contractor
- Schedule annual reviews
- Export lists for audit

**Time Est:** 6-8 hours

---

#### D. Automated Expiry Notifications
- 90 days before expiry: email contractor
- 30 days before expiry: reminder
- On expiry: flag as expired, prevent work
- Scheduled job runs daily

**Time Est:** 4-5 hours

---

#### E. Review Scheduling
- Annual review trigger: set scheduled_date 1 year from upload
- Admin reviews docs: approve/reject/renewal required
- Contractor notified of review result
- Historic records kept for audit

**Time Est:** 4-5 hours

---

### Phase 3 Deliverables
- ✅ Contractor accreditation uploads
- ✅ Expiry tracking & notifications
- ✅ Admin review workflow
- ✅ Audit trail & historical records
- ✅ Export reports

**Total: ~30-35 hours (2.5 weeks)**

---

## Phase 4: Site Kiosk & Analytics (Week 9-10, Est 2 weeks)

### Goals
- Tablet kiosk at site entrance for sign-in/out
- Real-time contractor presence tracking
- Analytics dashboard

### Why This Matters
Site safety - know who's on site at all times. Quick sign-in/out for daily operations.

### Key Features

#### A. Kiosk Sign-In Screen
- **URL:** `https://tablet.yourdomain.com/?site=site123` (auto-filters to one site)
- **UI:** Large buttons for mobile/tablet
- **Workflow:**
  1. Site displays "SELECT CONTRACTOR"
  2. Search/list of pre-loaded contractors for that site
  3. Tap to sign in
  4. If inducted: Success, show time-in
  5. If not inducted: "Not inducted. Click to start induction"
  6. Sign out button visible (toggle in/out)

**Time Est:** 8-10 hours

---

#### B. Presence Tracking
```sql
site_sign_ins (
  id UUID,
  contractor_id UUID,
  site_id UUID,
  signed_in_at TIMESTAMP,
  signed_out_at TIMESTAMP,
  duration_minutes INT (calculated),
  location_lat/lng (optional GPS),
  device_id TEXT (which kiosk/device)
);
```

**Time Est:** 3-4 hours

---

#### C. Real-Time Dashboard (Manager View)
- "Who's on site right now?" dashboard
- Shows: Contractor name, sign-in time, current duration
- Induction status indicator
- Accreditation status indicator
- Manual override: add/remove contractor from list

**Time Est:** 6-8 hours

---

#### D. Analytics & Reporting
- Daily attendance reports
- Hours worked per contractor per site
- Induction/accreditation compliance rate
- Export for payroll integration

**Time Est:** 6-8 hours

---

### Phase 4 Deliverables
- ✅ Kiosk sign-in/out interface
- ✅ Live presence tracking
- ✅ Real-time dashboard
- ✅ Analytics & reports
- ✅ Export for payroll

**Total: ~25-30 hours (2 weeks)**

---

## Phase 5: App Store Release & Distribution (Week 11-12, Est 1-2 weeks)

### Goals
- Build native iOS/Android apps
- Submit to App Store & Google Play
- Set up app signing & certificates

### Key Features

#### A. EAS Build Setup (Expo)
- Configure `app.json`:
  ```json
  {
    "name": "Permit Manager",
    "slug": "permit-manager",
    "owner": "yourcompany",
    "version": "1.0.0",
    "ios": {"bundleIdentifier": "com.yourcompany.permitmanager"},
    "android": {"package": "com.yourcompany.permitmanager"}
  }
  ```
- Create iOS certificates
- Create Android signing key
- Run: `eas build --platform all`

**Time Est:** 4-6 hours

---

#### B. App Store Submission
- Create Apple Developer account ($99/year)
- Create App Store Connect listing
- Add screenshots, description, privacy policy
- Submit for review (~48 hours)

**Time Est:** 3-4 hours

---

#### C. Google Play Submission
- Create Google Play Developer account ($25 one-time)
- Create Google Play Console listing
- Add screenshots, description, privacy policy
- Submit for review (~2-4 hours usually)

**Time Est:** 3-4 hours

---

#### D. Deep Linking
- Enable links to work in-app:
  - `app://induction?site=123&contractor=456`
  - `app://accreditation/upload`
  - `app://permit/123`
- Allows contractors to click email links → opens app

**Time Est:** 3-4 hours

---

#### E. App Signing & Certificates
- iOS: Create provisioning profiles (done via EAS)
- Android: Create keystore for signing
- Automatic code signing in EAS

**Time Est:** 2-3 hours

---

### Phase 5 Deliverables
- ✅ iOS app in App Store
- ✅ Android app in Google Play Store
- ✅ Deep linking functional
- ✅ OTA updates configured (Expo)
- ✅ App analytics

**Total: ~15-20 hours (1.5 weeks)**

---

## Phase 6: Post-Launch (Ongoing)

### Maintenance & Scale
- Monitor app store reviews & ratings
- Bug fixes & patches
- Server optimization for 100+ sites
- Customer support system
- Feature requests & iterations

### Future Enhancements (Not in MVP)
- Offline permit viewing
- Geofencing (notify when contractor leaves site)
- Custom video hosting (instead of YouTube)
- Integration with payroll systems
- Integration with insurance systems
- Mobile biometric signing (fingerprint)
- SMS notifications

---

## 🏗️ Architecture Decisions

### Domain & Routing
```
Primary Domain: yourdomain.com (DECIDE THIS SOON)

Web URLs:
- https://app.yourdomain.com/         → Main app (all users)
- https://tablet.yourdomain.com/      → Kiosk mode (one site)

API:
- https://api.yourdomain.com/         → REST endpoints

Database:
- Supabase (hosted PostgreSQL)
- Single database, multi-tenant filtering
- Auto-scales with Postgres
- Built-in auth, storage

Authentication:
- Supabase Auth (email/password)
- Future: SSO, 2FA

File Storage:
- Supabase Storage (S3-like)
- Organize by: /permits/{id}, /inductions/{id}, /accreditations/{id}
- Public/private bucket rules via RLS
```

### Technology Stack (No Changes to Current)
```
Frontend:
- React Native (Expo) - same as current ✓
- React Native Web - supports web & mobile from same code ✓
- Native C API: Signature canvas, camera (native module if needed)

Backend:
- Supabase (PostgreSQL + Functions)
- Or AWS Lambda for scheduled jobs

Hosting:
- Web: Vercel (current) ✓
- APIs: Supabase Functions or Vercel Functions
- Mobile: App Store & Google Play (no hosting)

Database:
- PostgreSQL (Supabase) ✓
```

---

## 📋 Implementation Order

### Strict Sequence (Can't parallelize these)

1. **Phase 0** → **Phase 1** (must have auth for Phase 1+)
2. **Phase 1** → **Phase 2+** (must have multi-tenant for scaling)
3. **Phases 2 & 3** → Can do in parallel (both need Phase 1)
4. **Phase 4** → Can start after Phase 1
5. **Phase 5** → Must wait until Phases 1-4 stable

### Critical Path
```
Phase 0 (1 week)
  ↓
Phase 1 (1.5 weeks)  ← BLOCKS everything else
  ↓
├─ Phase 2 (2.5 weeks)  ┐
├─ Phase 3 (2.5 weeks)  ├─ Parallel OK
├─ Phase 4 (2 weeks)    ┘
  ↓
Phase 5 (1.5 weeks)  ← Only when 1-4 ready

Total: ~12-13 weeks = 3 months
```

---

## 💰 Resource Requirements

### Team
- **1 Full-Stack Dev** (that's you) can do this
- **Designer** helpful for Phase 1+ (auth UI, mobile UX)
- **QA Tester** helpful for Phase 5 (app store testing)

### Infrastructure
- **Supabase:** ~$25-50/month (videos hosted on YouTube, minimal storage/bandwidth needed)
- **Vercel:** ~$20/month (for custom domain, if not already paying)
- **Domain:** ~$12/year + SSL (included with Vercel)
- **App Developer Accounts:** $99 (Apple) + $25 (Google) = one-time
- **Certificates/Signing:** Free (handled by EAS/Expo)
- **YouTube:** Free (induction videos already hosted there)

### Estimated MVP Cost
- Dev time: 13 weeks × £80/hour = ~£30k (your labor)
- Infrastructure: ~$55-90/month (significantly lower than initially estimated)
- App store fees: $124 one-time

---

## 🚀 Recommended Next Steps

### Immediate (This Week)
1. **Get a domain name** (critical dependency)
   - Check availability: GitHub, productivity, safety, site names?
   - Register on Domains.com, Namecheap, GoDaddy, etc.
   - Configure DNS pointing to Vercel

2. **Make Phase 0 priority list** (25-35 hours of work)
   - Decide which of 8 tasks are non-negotiable before launch
   - My recommendation: All 8 are important for compliance/safety

3. **Plan Phase 1 database schema** (gets complex with multi-tenant)
   - Design user_roles, site_access tables
   - Plan audit logging structure

### Week 1-2
- Execute Phase 0 tasks (you have ~1 week of intensive work)
- Set up Supabase Auth
- Test multi-site filtering logic

### Weeks 3-4
- Build Phase 1 (authentication)
- Deploy test instance with login
- Manual testing with real users

---

## ⚠️ Key Assumptions & Decisions Needed

### From You:

1. **Domain name?** → Needed ASAP
2. **Business name/branding?** → For app store listing
3. **Logo/colors?** → For mobile apps
4. **Which Phase 0 features are critical?** → Prioritize if needed
5. **Timeline realistic?** → 3 months @ ~25 hrs/week
6. **Offline support needed?** → Impacts architecture
7. **Real-time notifications?** → Impacts cost (Firebase/Pusher)
8. **Multi-language support?** → Future Phase 6

### Technical Decisions:

1. **Authentication:** Supabase Auth ✓ (recommended)
2. **File storage:** Supabase Storage ✓ (recommended)
3. **Scheduled jobs:** Supabase Cron + PostgreSQL Functions (for Phase 0's 24hr review)
4. **Deep linking:** Expo-managed (built-in) ✓
5. **App store accounts:** Create now (takes 1-2 days approval)

---

## 📊 Phase Summary Table

| Phase | Focus | Duration | Complexity | Blockers |
|-------|-------|----------|-----------|----------|
| 0 | Permit polish | 1 week | Medium | None |
| 1 | Auth & Multi-tenant | 1.5 weeks | High | Domain, design |
| 2 | Inductions | 2.5 weeks | Medium | Phase 1 done |
| 3 | Accreditations | 2.5 weeks | Medium | Phase 1 done |
| 4 | Kiosk & Analytics | 2 weeks | Medium | Phase 1 done |
| 5 | App Store Release | 1.5 weeks | Low | Phases 1-4 stable |

**Total: ~13 weeks (~3 months)**

---

## 📞 Next Steps

1. **Review this roadmap** - does timeline feel realistic?
2. **Prioritize Phase 0 tasks** - which are must-have vs nice-to-have?
3. **Register domain** - can't proceed without this
4. **Start Phase 0 tasks** - begin implementation this week

Once Phase 0 is done, we move to Phase 1 and iterate.

Would you like me to:
- [ ] Create detailed technical spec for Phase 0 tasks?
- [ ] Start implementing Phase 0 tasks?
- [ ] Create database schema files for Phase 1?
- [ ] Help you choose a domain name?

---

**Questions?** Let's discuss priorities and timeline.
