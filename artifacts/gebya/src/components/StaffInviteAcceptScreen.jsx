import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { usePermissionsStore } from '../stores/permissionsStore';
import { fireToast } from './Toast';
import { getAuthToken } from '../utils/syncEngine';

const API_BASE = import.meta.env.VITE_SYNC_API_URL || '/api';

async function apiFetch(path, options = {}) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function StaffInviteAcceptScreen({ onJoined, onDismiss }) {
  const { lang } = useLang();

  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [invites, setInvites] = useState([]);
  const [activeInvite, setActiveInvite] = useState(null);
  const [saving, setSaving] = useState(false);

  const checkPending = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) { setLoading(false); return; }
      const data = await apiFetch('/business/invites/pending-for-me');
      const pending = Array.isArray(data.pending) ? data.pending : [];
      setInvites(pending);
      if (pending.length > 0) {
        setActiveInvite(pending[0]);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkPending(); }, [checkPending]);

  const handleAccept = async () => {
    if (!activeInvite) return;
    setSaving(true);
    try {
      await apiFetch(`/business/invites/${activeInvite.id}/accept`, { method: 'POST' });
      setAccepted(true);
      fireToast(lang === 'am' ? '✓ ተቀላቅለዋል' : '✓ Joined successfully', 2500);
      setTimeout(() => {
        // Force UI re-render with new permissions by reloading auth
        window.location.reload();
        onJoined?.();
      }, 1800);
    } catch (err) {
      fireToast(err.message || 'Failed to accept', 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = async () => {
    if (!activeInvite) return;
    setSaving(true);
    try {
      await apiFetch(`/business/invites/${activeInvite.id}/decline`, { method: 'POST' });
      setDeclined(true);
      fireToast(lang === 'am' ? 'ተቀባይነት አላገኘም' : 'Declined', 1800);
      setTimeout(() => {
        const remaining = invites.filter(inv => inv.id !== activeInvite.id);
        if (remaining.length > 0) {
          setActiveInvite(remaining[0]);
          setDeclined(false);
        } else {
          onDismiss?.();
        }
      }, 1500);
    } catch (err) {
      fireToast(err.message || 'Failed', 2400);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;
  if (!activeInvite) return null;

  const ROLE_LABELS = {
    manager: lang === 'am' ? 'ማኔጀር' : 'Manager',
    trusted_staff: lang === 'am' ? 'የታመነ ሰራተኛ' : 'Trusted Staff',
    cashier: lang === 'am' ? 'የሽያጭ ሠራተኛ' : 'Sales Staff',
    viewer: lang === 'am' ? 'ኦዲተር' : 'Auditor',
  };
  const roleLabel = ROLE_LABELS[activeInvite.role] || activeInvite.role;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6" style={{ background: 'rgba(27, 67, 50, 0.85)' }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
        {accepted ? (
          <div className="py-6 space-y-3 animate-elastic">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: '#d1fae5' }}>
              <Check className="w-8 h-8 text-green-700" />
            </div>
            <h2 className="text-xl font-black text-gray-900">
              {lang === 'am' ? 'እንኳን ደህና መጡ!' : 'Welcome!'}
            </h2>
            <p className="text-sm text-gray-600">
              {activeInvite.business_name} {lang === 'am' ? `እንኳን ደህና መጡ። ሽያጭ መመዝገብ ይችላሉ።` : `Welcome! You can now record sales.`}
            </p>
          </div>
        ) : declined ? (
          <div className="py-6 space-y-3">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: '#fef2f2' }}>
              <X className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-gray-600">
              {lang === 'am' ? 'ጥሪው ውድቅ ሆኗል' : 'Invite declined'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: '#1B4332' }}>
              <span className="text-2xl font-black text-white">ው</span>
            </div>
            <h2 className="text-xl font-black text-gray-900">
              {activeInvite.business_name}
            </h2>
            <p className="text-sm text-gray-500">
              {lang === 'am'
                ? `የ${activeInvite.business_name} ባለቤት እርስዎን እንደ ${roleLabel} ጋብዘዋል። መቀላቀል ይፈልጋሉ?`
                : `The owner of ${activeInvite.business_name} has invited you to join as ${roleLabel}. Do you want to join?`}
            </p>

            <div className="w-full rounded-xl px-4 py-3" style={{ background: '#f5f0e8' }}>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                {lang === 'am' ? 'ሚና' : 'Role'}
              </div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">{roleLabel}</div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDecline}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold min-h-[48px]"
                style={{ background: '#f5f5f5', color: '#6b7280', border: '1px solid #e5e7eb' }}
              >
                {lang === 'am' ? 'አልቀላቀልም' : 'Decline'}
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold min-h-[48px]"
                style={{ background: saving ? '#e5e7eb' : '#1B4332', color: saving ? '#9ca3af' : '#fff' }}
              >
                {saving ? '...' : (lang === 'am' ? 'ተቀላቀል' : 'Accept & Join')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}