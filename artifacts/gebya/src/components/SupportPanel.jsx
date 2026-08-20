import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../context/LangContext';
import { listTickets, getTicket, createTicket, replyToTicket, setTicketStatus } from '../api/support';
import { ChevronLeft, Plus, Send, MessageSquare } from 'lucide-react';

const STATUS_META = {
  open: { label: 'Open', color: '#b45309', bg: '#fef3c7' },
  replied: { label: 'Replied', color: '#1d4ed8', bg: '#dbeafe' },
  resolved: { label: 'Resolved', color: '#15803d', bg: '#dcfce7' },
  closed: { label: 'Closed', color: '#6b7280', bg: '#f3f4f6' },
};

export default function SupportPanel({ isAdmin, businessId, lang: propLang }) {
  const { lang } = useLang();
  const l = lang || propLang || 'en';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [saving, setSaving] = useState(false);

  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTickets(businessId ? { businessId } : {});
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openThread = async (ticket) => {
    setThread(ticket);
    try {
      const data = await getTicket(ticket.id);
      setMessages((data.messages || []).slice().reverse());
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createTicket({ subject: subject.trim(), description: description.trim(), priority });
      setSubject('');
      setDescription('');
      setPriority('normal');
      setShowForm(false);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !thread) return;
    setReplying(true);
    setError(null);
    try {
      await replyToTicket(thread.id, replyText.trim());
      setReplyText('');
      await openThread(thread);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setReplying(false);
    }
  };

  const handleStatus = async (status) => {
    if (!thread) return;
    try {
      await setTicketStatus(thread.id, status);
      const updated = { ...thread, status };
      setThread(updated);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    }
  };

  const T = (am, en) => (l === 'am' ? am : en);

  if (thread) {
    const meta = STATUS_META[thread.status] || STATUS_META.open;
    return (
      <div className="space-y-3">
        <button
          onClick={() => setThread(null)}
          className="flex items-center gap-1 text-xs font-bold"
          style={{ color: 'var(--color-primary)' }}
        >
          <ChevronLeft size={14} /> {T('ወደ ዝርዝር ተመለስ', 'Back to list')}
        </button>

        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-black">{thread.subject}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: meta.bg, color: meta.color }}>
              {T(thread.status, meta.label)}
            </span>
          </div>
          {isAdmin && (
            <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {thread.businessName || `#${thread.businessId}`}
              {thread.ownerPhone ? ` · ${thread.ownerPhone}` : ''}
            </div>
          )}
          <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(thread.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
              {T('ምንም መልእክት የለም', 'No messages yet')}
            </div>
          )}
          {messages.map((m) => {
            const fromAdmin = m.senderRole === 'admin';
            return (
              <div key={m.id} className="flex" style={{ justifyContent: fromAdmin ? 'flex-end' : 'flex-start' }}>
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-xs"
                  style={
                    fromAdmin
                      ? { background: 'var(--color-primary)', color: '#fff' }
                      : { background: 'var(--color-bg-hover)', color: 'var(--color-text)' }
                  }
                >
                  <div className="font-bold opacity-80">
                    {fromAdmin ? 'Gebya Support' : T('እርስዎ', 'You')}
                  </div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className="mt-1 opacity-60">{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder={T('መልስዎን ይጻፉ...', 'Type your reply...')}
            className="flex-1 rounded-lg border px-3 py-2 text-xs resize-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
          />
          <button
            onClick={handleReply}
            disabled={replying || !replyText.trim()}
            className="px-3 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Send size={14} />
          </button>
        </div>

        <div className="flex gap-2">
          {(thread.status === 'open' || thread.status === 'replied') && (
            <button
              onClick={() => handleStatus('resolved')}
              className="flex-1 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
            >
              {T('እንደተፈታ ምልክት አድርግ', 'Mark resolved')}
            </button>
          )}
          {thread.status !== 'closed' && (
            <button
              onClick={() => handleStatus('closed')}
              className="flex-1 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}
            >
              {T('ዝጋ', 'Close')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: '#fee2e2', color: '#b91c1c' }}>{error}</div>}

      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {businessId
            ? (T('የዚህ ሱቅ ትኬቶች', "This shop's tickets"))
            : (T('የድጋፍ ትኬቶች', 'Support tickets'))}
        </span>
        {!businessId && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={14} /> {T('አዲስ ትኬት', 'New ticket')}
          </button>
        )}
      </div>

      {!businessId && showForm && (
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={T('ርዕስ', 'Subject')}
            className="w-full rounded-lg border px-3 py-2 text-xs"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={T('ችግሩን ይግለጹ...', 'Describe the issue...')}
            className="w-full rounded-lg border px-3 py-2 text-xs resize-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
          />
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            >
              <option value="low">{T('ዝቅተኛ', 'Low')}</option>
              <option value="normal">{T('መደበኛ', 'Normal')}</option>
              <option value="high">{T('ከፍተኛ', 'High')}</option>
              <option value="urgent">{T('አስቸኳይ', 'Urgent')}</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={saving || !subject.trim() || !description.trim()}
              className="flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              {saving ? T('በመላክ ላይ...', 'Sending...') : T('አስገባ', 'Submit')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
          {T('በመጫን ላይ...', 'Loading...')}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-xs py-4 text-center rounded-xl border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          {T('ምንም ትኬት የለም', 'No tickets yet')}
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => {
            const meta = STATUS_META[t.status] || STATUS_META.open;
            return (
              <button
                key={t.id}
                onClick={() => openThread(t)}
                className="w-full text-left rounded-xl border p-3 hover:opacity-90 transition-opacity"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <MessageSquare size={12} style={{ color: 'var(--color-primary)' }} />
                    {t.subject}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: meta.bg, color: meta.color }}>
                    {T(meta.label.toLowerCase(), meta.label)}
                  </span>
                </div>
                {isAdmin && (
                  <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {t.businessName || `#${t.businessId}`}
                    {t.ownerPhone ? ` · ${t.ownerPhone}` : ''}
                  </div>
                )}
                <div className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(t.createdAt).toLocaleString()} · {t.priority}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}