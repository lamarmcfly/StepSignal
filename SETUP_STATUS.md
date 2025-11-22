# Setup Status - StepSignal Phase 6

## Completed ✅

### Phase 6 Implementation: Configurability & Multi-Tenancy
All code changes for Phase 6 have been successfully implemented:

1. **Database Schema** (`packages/database/prisma/schema.prisma`)
   - Added `InstitutionSettings` model with:
     - Risk thresholds (low/medium/high/critical)
     - Study plan defaults (weekly hours, daily cap)
     - Accommodations multiplier
     - Disclaimer text
     - Feature flags (auto alerts, study plan engine)
     - Custom settings JSON field

2. **Backend Services**
   - `packages/backend/src/services/institutionSettings.ts` - CRUD operations for settings
   - `packages/backend/src/middleware/rbac.ts` - Role-based access control (admin/advisor/student)
   - `packages/backend/src/services/riskAssessment.ts` - Updated to use institution-specific thresholds

3. **Backend API Routes** (`packages/backend/src/routes/settings.ts`)
   - GET /api/settings - Fetch institution settings (all users)
   - PUT /api/settings - Update settings (admin only)
   - POST /api/settings/reset - Reset to defaults (admin only)
   - CRUD endpoints for exam types management

4. **Frontend**
   - `packages/frontend/src/pages/SettingsPage.tsx` - Comprehensive admin settings UI
   - `packages/frontend/src/components/RiskDisclaimer.tsx` - Institution disclaimer component
   - Added /settings route to App.tsx

5. **Prisma Client**
   - Generated successfully with new InstitutionSettings model

## Current Blocker ⚠️

### Database Connection Issue

**Problem:**
- PostgreSQL is running on localhost:5432 (PID 6760)
- The configured password "password" in .env files doesn't work
- Prisma cannot connect to push schema changes
- Backend crashes on startup due to database connection failure

**Root Cause:**
- Application is designed for Docker (see README.md)
- Docker Desktop is not running
- Local PostgreSQL installation has different password than .env configuration

## Required Manual Steps

### Option 1: Use Docker (Recommended)

This matches the setup described in README.md:

1. **Start Docker Desktop**
   - Open Docker Desktop application

2. **Stop Local PostgreSQL Service**
   - Press Win+R, type `services.msc`, press Enter
   - Find "postgresql-x64-15" (or similar PostgreSQL service)
   - Right-click → Stop

3. **Start PostgreSQL Container**
   ```bash
   docker-compose up -d postgres
   ```

4. **Push Database Schema**
   ```bash
   cd packages/database
   npm run db:push
   ```

5. **Seed Initial Institution**
   ```bash
   docker exec stepsignal-postgres psql -U postgres -d stepsignal_dev -c "
     INSERT INTO institutions (id, name)
     VALUES ('00000000-0000-0000-0000-000000000001', 'Test Medical School')
     ON CONFLICT DO NOTHING;
   "
   ```

6. **Start Development Servers**
   ```bash
   # Backend
   cd packages/backend
   npm run dev

   # Frontend (in new terminal)
   cd packages/frontend
   npm run dev
   ```

### Option 2: Use Local PostgreSQL

If you prefer to use the existing local PostgreSQL:

1. **Find or Reset PostgreSQL Password**
   - Option A: Check Windows Credential Manager for saved postgres password
   - Option B: Reset password via pgAdmin or psql
   - Option C: Reinstall PostgreSQL with known password

2. **Update Environment Files**
   Update both files with the correct password:

   `packages/backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/stepsignal_dev"
   ```

   `packages/database/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/stepsignal_dev"
   ```

3. **Ensure Database Exists**
   ```bash
   createdb stepsignal_dev -U postgres
   ```

4. **Push Database Schema**
   ```bash
   cd packages/database
   npm run db:push
   ```

5. **Seed Initial Institution**
   ```bash
   psql -U postgres -d stepsignal_dev -c "
     INSERT INTO institutions (id, name)
     VALUES ('00000000-0000-0000-0000-000000000001', 'Test Medical School')
     ON CONFLICT DO NOTHING;
   "
   ```

6. **Start Development Servers**
   ```bash
   # Backend
   cd packages/backend
   npm run dev

   # Frontend (in new terminal)
   cd packages/frontend
   npm run dev
   ```

## Testing After Setup

Once database is connected and servers are running:

1. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

2. **Test Registration**
   - Navigate to registration page
   - Create test account:
     - Email: admin@test.com
     - Password: password123
     - Role: admin
     - Institution ID: 00000000-0000-0000-0000-000000000001

3. **Test Settings Page**
   - Login with admin account
   - Navigate to /settings
   - Verify all settings forms load
   - Test updating risk thresholds
   - Test adding/editing exam types

4. **Test Disclaimer**
   - In settings, add disclaimer text
   - Navigate to student detail page
   - Verify disclaimer appears in info alert

## Phase 6 Features Summary

### Epic G - Governance & Config ✅

- ✅ Institution settings UI for risk thresholds
- ✅ Exam catalog with custom exam types and default weights
- ✅ Default weekly hours and max daily hours settings
- ✅ Accommodations-aware logic (flag + adjusted volume expectations)
- ✅ Role-based access control (student/advisor/admin scopes)
- ✅ Disclaimer text on risk pages
- ✅ Platform is multi-institution ready

### Key Files Modified

**Database:**
- `packages/database/prisma/schema.prisma` - Added InstitutionSettings model

**Backend:**
- `packages/backend/src/services/institutionSettings.ts` - New service
- `packages/backend/src/middleware/rbac.ts` - New middleware
- `packages/backend/src/routes/settings.ts` - New routes
- `packages/backend/src/services/riskAssessment.ts` - Updated
- `packages/backend/src/index.ts` - Added settings routes

**Frontend:**
- `packages/frontend/src/pages/SettingsPage.tsx` - New page (~430 lines)
- `packages/frontend/src/components/RiskDisclaimer.tsx` - New component
- `packages/frontend/src/App.tsx` - Added route

## Next Steps After Database Fix

1. ✅ Generate Prisma Client (DONE)
2. ⏳ Push database schema (WAITING FOR DB CONNECTION)
3. ⏳ Start backend server
4. ⏳ Start frontend server
5. ⏳ Test registration endpoint
6. ⏳ Test all Phase 6 features
7. ⏳ Verify RBAC permissions work correctly
8. ⏳ Test accommodations multiplier calculation

## Support

If you encounter issues:

1. Check backend logs: Look for database connection errors
2. Check frontend console: Look for network errors or CORS issues
3. Verify PostgreSQL is running: `netstat -ano | findstr :5432`
4. Verify Docker containers: `docker ps`
5. Check Prisma connection: `cd packages/database && npx prisma db pull`
