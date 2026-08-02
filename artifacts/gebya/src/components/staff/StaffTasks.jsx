import { useState, useEffect } from 'react';
import { useStaffStore } from '../../stores/staffStore';
import { apiFetch } from '../../utils/shared-ui.jsx';
import { fireToast } from '../Toast';

export default function StaffTasks({ staff, lang, canManageTeam }) {
  const t = (en, am) => lang === 'am' ? am : en;
  const store = useStaffStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');

  const loadTasks = async () => {
    if (!staff?.id) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/tasks?staff_id=${staff.id}`);
      setTasks(data.tasks || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadTasks(); }, [staff?.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          staffId: staff.id,
          title: newTitle.trim(),
          priority: newPriority,
          dueDate: newDueDate || null,
        }),
      });
      fireToast(t('Task created', 'ተግባር ተፈጥሯል'), 1800);
      setNewTitle('');
      setNewPriority('medium');
      setNewDueDate('');
      setShowForm(false);
      loadTasks();
    } catch (err) {
      fireToast(err.message || 'Failed', 2400);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadTasks();
    } catch (err) {
      fireToast(err.message || 'Failed', 2400);
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm(t('Delete task?', 'ተግባሩን ማጥፋት ይፈልጋሉ?'))) return;
    try {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
      fireToast(t('Deleted', 'ጥፋታል'), 1800);
      loadTasks();
    } catch (err) {
      fireToast(err.message || 'Failed', 2400);
    }
  };

  const priorityColor = (p) => {
    if (p === 'urgent') return 'background: var(--color-danger-bg); color: var(--color-danger-text)';
    if (p === 'high') return 'background: var(--color-warning-bg); color: var(--color-warning)';
    if (p === 'low') return 'background: var(--color-success-bg); color: var(--color-success-text)';
    return 'background: var(--color-bg-hover); color: var(--color-text-muted)';
  };

  if (!canManageTeam) return null;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-alt)' }}>
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {t('Tasks', 'ተግባሮች')}
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}
        >
          {showForm ? t('Cancel', 'ሰርዝ') : t('Add Task', 'ተግባር ጨምር')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="px-4 py-3 border-b space-y-2" style={{ borderColor: 'var(--color-border-light)' }}>
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder={t('Task title', 'የተግባር ርዕስ')}
            className="w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
            style={{ borderColor: 'var(--color-border)' }}
            required
          />
          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
              className="flex-1 px-3 py-2.5 border-2 rounded-xl text-sm bg-white"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <option value="low">{t('Low', 'ዝቅተኛ')}</option>
              <option value="medium">{t('Medium', 'መካከለኛ')}</option>
              <option value="high">{t('High', 'ከፍተኛ')}</option>
              <option value="urgent">{t('Urgent', 'አጡ')}</option>
            </select>
            <input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="flex-1 px-3 py-2.5 border-2 rounded-xl text-sm"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}>
            {t('Create Task', 'ተግባር ፍጠር')}
          </button>
        </form>
      )}

      <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
        {loading ? (
          <div className="px-4 py-3 text-xs text-gray-400">...</div>
        ) : tasks.length === 0 ? (
          <div className="px-4 py-3 text-xs text-gray-400">{t('No tasks yet', 'እስካሁን ተግባሮች የሉም')}</div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-gray-900 truncate">{task.title}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={priorityColor(task.priority)}>
                    {task.priority}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500">
                  {task.dueDate ? t('Due', 'የሚጠበቅበት') + ': ' + new Date(task.dueDate).toLocaleDateString() : ''}
                  {' · '}
                  <span style={{ color: task.status === 'completed' ? 'var(--color-success-text)' : 'var(--color-warning)' }}>
                    {task.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {task.status !== 'completed' ? (
                  <button onClick={() => handleStatusChange(task.id, 'completed')} className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
                    {t('Done', 'ተጠናቀቀ')}
                  </button>
                ) : (
                  <button onClick={() => handleStatusChange(task.id, 'pending')} className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>
                    {t('Reopen', 'ክፈት')}
                  </button>
                )}
                <button onClick={() => handleDelete(task.id)} className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                  {t('Delete', 'ሰርዝ')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}