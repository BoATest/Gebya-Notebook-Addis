export type PermissionKey =
  | "can_manage_team"
  | "can_delete_records"
  | "can_edit_settings"
  | "can_add_records"
  | "can_view_reports";

export type PermissionMap = Record<PermissionKey, boolean>;

export type BusinessRole = "owner" | "manager" | "trusted_staff" | "cashier" | "viewer";

const ROLE_PERMISSION_DEFAULTS: Record<BusinessRole, PermissionMap> = {
  owner: {
    can_manage_team: true,
    can_delete_records: true,
    can_edit_settings: true,
    can_add_records: true,
    can_view_reports: true,
  },
  manager: {
    can_manage_team: true,
    can_delete_records: true,
    can_edit_settings: true,
    can_add_records: true,
    can_view_reports: true,
  },
  trusted_staff: {
    can_manage_team: false,
    can_delete_records: false,
    can_edit_settings: false,
    can_add_records: true,
    can_view_reports: true,
  },
  cashier: {
    can_manage_team: false,
    can_delete_records: false,
    can_edit_settings: false,
    can_add_records: true,
    can_view_reports: true,
  },
  viewer: {
    can_manage_team: false,
    can_delete_records: false,
    can_edit_settings: false,
    can_add_records: false,
    can_view_reports: true,
  },
};

export function getRoleDefault(role: string): PermissionMap {
  return ROLE_PERMISSION_DEFAULTS[role as BusinessRole] ?? ROLE_PERMISSION_DEFAULTS.viewer;
}

export function resolvePermissions(
  role: string,
  storedPermissions: unknown
): PermissionMap {
  const base = getRoleDefault(role);
  if (!storedPermissions || typeof storedPermissions !== "object" || Array.isArray(storedPermissions)) return base;
  const merged = { ...base };
  for (const key of Object.keys(base)) {
    const v = (storedPermissions as Record<string, unknown>)[key];
    if (typeof v === "boolean") merged[key as PermissionKey] = v;
  }
  return merged;
}
