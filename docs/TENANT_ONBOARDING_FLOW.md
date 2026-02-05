# Tenant Onboarding Flow (Superadmin)

Goal: create and launch tenants without terminal access, using the superadmin panel and backend automation.

## Current UI Touchpoints
- Tenants page: create tenant (name + industry), configure DB URL, assign apps, launch.
- Launch is blocked when inactive, missing users, or DB not configured.

## Proposed Flow
1. Create tenant in superadmin panel.
2. Configure database URL.
   - Validate connection.
   - Run schema setup migrations for core services.
3. Assign apps (industry + core + add-ons).
4. Create or assign the first tenant admin user.
5. Launch tenant workspace.

## Backend Actions (when DB is configured)
- Test DB connectivity and store a status flag (hasDatabase).
- Run idempotent migrations:
  - `vidhione/backend/services/accounts/db/001_masters.sql`
  - `vidhione/backend/services/inventory/db/001_init.sql`
- If legacy data was migrated, run:
  - `vidhione/backend/services/inventory/db/002_legacy_inventory_transform.sql`

## Launch Checks
- Tenant is active.
- DB configured and migrations completed.
- At least one user assigned to the tenant.

## Notes
- Keep migrations idempotent; allow re-run safely from the panel.
- Consider storing a schema version per tenant for future upgrades.
