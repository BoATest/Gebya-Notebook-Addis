import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Shield } from 'lucide-react';
import { useStaffStore } from '../../stores/staffStore';
import { formatEthiopianPhone, isValidEthiopianPhone } from '../../utils/phoneNumber';
import { ROLE_BADGE, RoleBadge } from '../../utils/shared-ui.jsx';
import PermissionToggle from './PermissionToggle';
import { fireToast } from '../Toast';

export default function StaffAllMembers({
  canManageTeam,
  lang, t
}) {
  const store = useStaffStore();
  const cloudMembers = store.cloudMembers || [];

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-alt)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {t('All Staff', 'ሁሉም ሰራተኞች')}
          </span>
          {store.membersLoading && <span className="text-xs text-gray-400">...</span>}
        </div>

        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-white" style={{ borderColor: 'var(--color-border)' }}>
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={store.searchQuery}
            onChange={e => store.setSearchQuery(e.target.value)}
            placeholder={t('Search staff...', 'ሰራተኞችን ፈልግ...')}
            className="flex-1 text-sm focus:outline-none bg-transparent"
            style={{ border: 'none', outline: 'none' }}
          />
          {store.searchQuery && (
            <button onClick={() => store.setSearchQuery('')} className="text-gray-400 hover:text-gray-600 text-sm font-bold px-1">✕</button>
          )}
        </div>
      </div>

      {/* Filter and render cloud members */}
      {(() => {
        const searchQ = store.searchQuery?.toLowerCase().trim() || '';
        const filtered = cloudMembers.filter(m => {
          if (!searchQ) return true;
          const name = (m.display_name || m.displayName || m.name || '').toLowerCase();
          const phone = (m.phone_snapshot || m.phoneNumber || m.phone || '').toLowerCase();
          return name.includes(searchQ) || phone.includes(searchQ);
        });

        if (filtered.length === 0) {
          return (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              {store.searchQuery ? t('No matches', 'አልተገኘም') : t('No staff yet', 'እስካሁን ሰራተኞች የሉም')}
            </div>
          );
        }

        return (
          <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
            {filtered.map(m => {
              const isExpanded = store.expandedMember === m.id || store.expandedMember === m.userId;
              const perms = m.resolved_permissions || {};
              const isOwnerRole = m.role === 'owner';
              const mid = m.id || m.userId;
              const memberKey = mid;
              const displayName = m.display_name || m.displayName || m.name || 'Staff';
              const phoneStr = m.phone_snapshot || m.phoneNumber || m.phone || '';
              return (
                <div key={memberKey}>
                  <button
                    onClick={() => {
                      store.setExpandedMember(isExpanded ? null : memberKey);
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                    style={{ background: m.active === false ? 'var(--color-bg-active)' : 'var(--color-bg-white)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-gray-900 truncate flex items-center gap-2">
                        {displayName}
                        <RoleBadge role={m.role || 'staff'} />
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {phoneStr && <span className="text-xs text-gray-500">{formatEthiopianPhone(phoneStr)}</span>}
                        {store.getEffectiveRoleLabel(m, store.localPermOverrides, lang) !== (ROLE_BADGE[m.role]?.label || m.role) && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                            {t('Custom', 'የተበጀ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{
                        background: m.active !== false ? 'var(--color-bg-accent-green)' : 'var(--color-bg-hover)',
                        color: m.active !== false ? 'var(--color-success-text)' : 'var(--color-text-muted)'
                      }}>
                        {m.active !== false ? t('Active', 'ንቁ') : t('Inactive', 'ተሰናብቷል')}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4" style={{ background: 'var(--color-surface-subtle)' }}>
                      {!isOwnerRole && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 mb-1.5 mt-1">
                            <Shield className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                              {t('Role', 'ሚና')}
                            </span>
                            {store.getEffectiveRoleLabel(m, store.localPermOverrides, lang) !== (ROLE_BADGE[m.role]?.label || m.role) && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                                {t('Custom', 'የተበጀ')}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {store.ROLE_OPTIONS.map(opt => {
                              const label = lang === 'am' ? opt.label.am : opt.label.en;
                              const isActive = m.role === opt.value && store.getEffectiveRoleLabel(m, store.localPermOverrides, lang) === label;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={async () => {
                                    if (m.role === opt.value) return;
                                    store.setPendingRoleChange({ member: m, newRole: opt.value, label });
                                  }}
                                  disabled={store.savingPerms}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                  style={{
                                    background: isActive ? 'var(--color-primary)' : 'var(--color-bg-hover)',
                                    color: isActive ? 'var(--color-bg-white)' : 'var(--color-text)',
                                    opacity: store.savingPerms ? 0.5 : 1,
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 mb-2">
                        <Shield className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                          {t('Permissions', 'ፍቃዶች')}
                        </span>
                      </div>
                      {(isOwnerRole ? ['can_manage_team'] : [...new Set([...Object.keys(perms), ...Object.keys(store.localPermOverrides[mid] || {})])]).map(key => {
                        const overrideVal = store.localPermOverrides[mid]?.[key];
                        const effectiveVal = overrideVal !== undefined ? overrideVal : (perms[key] ?? false);
                        return (
                          <PermissionToggle
                            key={key}
                            keyName={key}
                            value={isOwnerRole ? true : effectiveVal}
                            onChange={isOwnerRole ? () => {} : (key, val) => store.handleTogglePermission(m, key, val, lang)}
                            lang={lang}
                          />
                        );
                      })}
                      {isOwnerRole && (
                        <div className="text-[10px] text-gray-400 mt-1">
                          {t('Owner permissions are full and cannot be edited', 'የባለቤት ፍቃዶች ሁሉም ሲሆኑ አይቀየሩም')}
                        </div>
                      )}
                      {!isOwnerRole && m.active !== false && (
                        <button
                          onClick={() => store.setPendingDeactivation({ member: m, isLocal: false, id: m.userId, name: displayName })}
                          className="mt-3 w-full py-2 rounded-xl text-xs font-bold"
                          style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                        >
                          {t('Deactivate', 'አቁም')}
                        </button>
                      )}
                      {!isOwnerRole && m.active === false && (
                        <button
                          onClick={() => store.handleReactivateStaffMember?.(m.userId)}
                          className="mt-3 w-full py-2 rounded-xl text-xs font-bold"
                          style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}
                        >
                          {t('Reactivate', 'ንቁ አድርግ')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
