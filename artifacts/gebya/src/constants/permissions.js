/**
 * Role-based permission definitions for the Gebya multi-tenant platform.
 *
 * Each role maps to a set of boolean permissions that determine what
 * features/actions are available to a user.
 *
 * Roles are hierarchical:
 *   Staff ⊂ Manager ⊂ Owner ⊂ PlatformAdmin ⊂ SystemAdmin
 *
 * Usage:
 *   import { PERMISSIONS, ROLE_HIERARCHY } from '../constants/permissions';
 *   if (hasPermission('can_manage_team')) { ... }
 */

export const ROLES = {
  STAFF: 'staff',
  MANAGER: 'manager',
  OWNER: 'owner',
  PLATFORM_ADMIN: 'platform_admin',
  SYSTEM_ADMIN: 'system_admin',
};

export const PERMISSIONS = {
  staff: {
    can_add_records: true,
    can_view_own_customers: true,
    can_view_reports: false,
    can_edit_settings: false,
    can_manage_team: false,
    can_delete_records: false,
    dev_mode_access: false,
    owner_activity_view: false,
    support_view: false,
    platform_admin_access: false,
    cross_shop_view: false,
    command_center: false,
    infrastructure_edit: false,
    token_revocation: false,
    sync_debug: false,
    audit_log_access: false,
  },
  manager: {
    can_add_records: true,
    can_view_own_customers: true,
    can_view_reports: false,
    can_edit_settings: true,
    can_manage_team: false,
    can_delete_records: false,
    dev_mode_access: false,
    owner_activity_view: false,
    support_view: false,
    platform_admin_access: false,
    cross_shop_view: false,
    command_center: false,
    infrastructure_edit: false,
    token_revocation: false,
    sync_debug: false,
    audit_log_access: false,
  },
  owner: {
    can_add_records: true,
    can_view_own_customers: true,
    can_view_reports: true,
    can_edit_settings: true,
    can_manage_team: true,
    can_delete_records: true,
    dev_mode_access: true,
    owner_activity_view: true,
    support_view: true,
    platform_admin_access: false,
    cross_shop_view: false,
    command_center: false,
    infrastructure_edit: false,
    token_revocation: false,
    sync_debug: false,
    audit_log_access: false,
  },
  platform_admin: {
    can_add_records: true,
    can_view_own_customers: true,
    can_view_reports: true,
    can_edit_settings: true,
    can_manage_team: true,
    can_delete_records: true,
    dev_mode_access: false,
    owner_activity_view: true,
    support_view: true,
    platform_admin_access: true,
    cross_shop_view: true,
    command_center: true,
    infrastructure_edit: false,
    token_revocation: false,
    sync_debug: false,
    audit_log_access: true,
  },
  system_admin: {
    can_add_records: true,
    can_view_own_customers: true,
    can_view_reports: true,
    can_edit_settings: true,
    can_manage_team: true,
    can_delete_records: true,
    dev_mode_access: true,
    owner_activity_view: true,
    support_view: true,
    platform_admin_access: true,
    cross_shop_view: true,
    command_center: true,
    infrastructure_edit: true,
    token_revocation: true,
    sync_debug: true,
    audit_log_access: true,
  },
};

/**
 * Role hierarchy for permission inheritance.
 * Higher roles inherit all lower role permissions.
 */
export const ROLE_HIERARCHY = [
  ROLES.STAFF,
  ROLES.MANAGER,
  ROLES.OWNER,
  ROLES.PLATFORM_ADMIN,
  ROLES.SYSTEM_ADMIN,
];

/**
 * Get all permissions for a given role, including inherited ones.
 */
export function getPermissionsForRole(role) {
  const roleIndex = ROLE_HIERARCHY.indexOf(role);
  if (roleIndex === -1) return PERMISSIONS.staff;

  return ROLE_HIERARCHY.slice(0, roleIndex + 1).reduce((acc, r) => {
    const perms = PERMISSIONS[r];
    Object.keys(perms).forEach((key) => {
      acc[key] = perms[key] || acc[key] || false;
    });
    return acc;
  }, {});
}

/**
 * Check if a role can see dev mode.
 * Owners get it by default (for self-service troubleshooting).
 * Platform admins get access to cross-shop diagnostics.
 */
export function canAccessDevMode(role) {
  return role === ROLES.OWNER || role === ROLES.SYSTEM_ADMIN;
}
