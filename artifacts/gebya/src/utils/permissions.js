export const ROLE_DEFAULTS = {
  owner:          { can_manage_team: true, can_delete_records: true, can_edit_settings: true, can_add_records: true, can_view_reports: true },
  manager:        { can_manage_team: true, can_delete_records: true, can_edit_settings: true, can_add_records: true, can_view_reports: true },
  trusted_staff:  { can_manage_team: false, can_delete_records: false, can_edit_settings: false, can_add_records: true, can_view_reports: true },
  cashier:        { can_manage_team: false, can_delete_records: false, can_edit_settings: false, can_add_records: true, can_view_reports: true },
  viewer:         { can_manage_team: false, can_delete_records: false, can_edit_settings: false, can_add_records: false, can_view_reports: true },
};

export function resolvePermissions(role, storedPermissions) {
  const base = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.viewer;
  if (!storedPermissions || typeof storedPermissions !== 'object') return base;
  return { ...base, ...storedPermissions };
}