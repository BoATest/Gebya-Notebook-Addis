import { useEffect, useState } from 'react';
import db from '../../db';
import { useLang } from '../../context/LangContext';

export default function SimpleAnalytics() {
  const { lang, t } = useLang();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadStats() {
      try {
        const events = await db.analytics
          .where('key')
          .startsWith('event:')
          .toArray();
        
        // Group by event type
        const grouped = {};
        for (const event of events) {
          const eventType = event.key.replace('event:', '');
          const count = event.count || 1;
          grouped[eventType] = (grouped[eventType] || 0) + count;
        }
        
        // Calculate sessions in last 7 days
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentSessions = events.filter(e => 
          e.key === 'event:session_start' && 
          e.created_at > sevenDaysAgo
        );
        
        // Calculate average session duration
        const sessionEnds = events.filter(e => e.key === 'event:session_end');
        let avgDuration = 0;
        if (sessionEnds.length > 0) {
          const totalDuration = sessionEnds.reduce((sum, event) => {
            try {
              const data = JSON.parse(event.value);
              return sum + (data.duration_ms || 0);
            } catch {
              return sum;
            }
          }, 0);
          avgDuration = Math.floor(totalDuration / sessionEnds.length / 1000); // Convert to seconds
        }
        
        setStats({
          totalEvents: events.length,
          eventCounts: grouped,
          sessions7d: recentSessions.length,
          totalSessions: grouped.session_start || 0,
          avgSessionDuration: avgDuration,
          lastSessionAt: events.length > 0 ? Math.max(...events.map(e => e.created_at)) : null
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadStats();
  }, []);
  
  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="p-4 text-center text-gray-500">
        {lang === 'am' ? 'ምንም መረጃ አልተገኘም' : 'No analytics data found'}
      </div>
    );
  }
  
  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };
  
  // Categorize events for better display
  const eventCategories = {
    sessions: ['session_start', 'session_end'],
    transactions: ['transaction_created'],
    customers: ['customer_added', 'credit_added', 'payment_recorded'],
    features: ['staff_invited', 'telegram_linked', 'report_shared', 'voice_success', 'voice_failure']
  };
  
  const categorizedEvents = {};
  Object.entries(stats.eventCounts).forEach(([event, count]) => {
    let category = 'other';
    for (const [cat, events] of Object.entries(eventCategories)) {
      if (events.includes(event)) {
        category = cat;
        break;
      }
    }
    if (!categorizedEvents[category]) categorizedEvents[category] = {};
    categorizedEvents[category][event] = count;
  });
  
  const categoryLabels = {
    sessions: lang === 'am' ? 'ክፍለ ጊዜዎች' : 'Sessions',
    transactions: lang === 'am' ? 'ግብይቶች' : 'Transactions',
    customers: lang === 'am' ? 'ደንበኞች' : 'Customers',
    features: lang === 'am' ? 'ባህሪያት' : 'Features',
    other: lang === 'am' ? 'ሌላ' : 'Other'
  };
  
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-primary)' }}>
        {lang === 'am' ? 'የትንተና ሰሌዳ' : 'Analytics Dashboard'}
      </h2>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-gray-600 text-sm mb-1">
            {lang === 'am' ? 'አጠቃላይ ክፍለ ጊዜዎች' : 'Total Sessions'}
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
            {stats.totalSessions}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-gray-600 text-sm mb-1">
            {lang === 'am' ? 'የቅርብ 7 ቀናት' : 'Last 7 Days'}
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--color-accent-amber)' }}>
            {stats.sessions7d}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-gray-600 text-sm mb-1">
            {lang === 'am' ? 'አማካይ ጊዜ' : 'Avg Duration'}
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-coral)' }}>
            {formatDuration(stats.avgSessionDuration)}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-gray-600 text-sm mb-1">
            {lang === 'am' ? 'የመጨረሻ እንቅስቃሴ' : 'Last Active'}
          </div>
          <div className="text-sm font-semibold text-gray-700">
            {formatDate(stats.lastSessionAt)}
          </div>
        </div>
      </div>
      
      {/* Event Categories */}
      {Object.entries(categorizedEvents).map(([category, events]) => (
        <div key={category} className="mb-6">
          <h3 className="text-lg font-bold mb-3 text-gray-700">
            {categoryLabels[category] || category}
          </h3>
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {Object.entries(events).map(([event, count], idx) => (
              <div 
                key={event} 
                className={`flex justify-between items-center py-3 px-4 ${
                  idx !== Object.keys(events).length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <span className="text-gray-700">
                  {event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-xs text-gray-500">
        <div className="font-semibold mb-1">
          {lang === 'am' ? 'የቴክኒክ መረጃ' : 'Technical Info'}
        </div>
        <div>Total events tracked: {stats.totalEvents}</div>
        <div>Unique event types: {Object.keys(stats.eventCounts).length}</div>
      </div>
    </div>
  );
}
