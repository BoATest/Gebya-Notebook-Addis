# GEBYA 3-DAY LAUNCH SPRINT
## From Code-Ready to User-Ready

**Sprint Goal**: Address real gaps, launch to 5-10 beta users by Day 4  
**Based On**: Honest code review (not outdated docs)  
**Sprint Dates**: [Insert your dates]

---

## 🎯 SPRINT OBJECTIVES

1. **Day 1**: Add event analytics (measure what matters)
2. **Day 2**: Improve onboarding + verify admin dashboard
3. **Day 3**: QA critical flows + deploy to staging
4. **Day 4**: Beta launch to 5 real users

---

## 📅 DAY 1: EVENT ANALYTICS (3-4 hours)

### **Goal**: Know if users return, which features they use

### **Task 1.1: Create Analytics Utility** (30 min)

**File**: `artifacts/gebya/src/utils/eventTracking.js`

```javascript
import { db } from '../db';

let sessionId = null;
let sessionStartTime = null;

// Initialize session on app load
export function initSession() {
  sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessionStartTime = Date.now();
  trackEvent('session_start', {
    session_id: sessionId
  });
}

// Track any event
export async function trackEvent(eventType, properties = {}) {
  const deviceId = await db.settings.get('device_id');
  
  const eventData = {
    device_id: deviceId || 'unknown',
    key: `event:${eventType}`,
    value: JSON.stringify({
      ...properties,
      timestamp: Date.now(),
      session_id: sessionId
    }),
    count: 1,
    last_seen_at: Date.now(),
    created_at: Date.now(),
    business_id: 1 // Get from auth context
  };

  try {
    await db.analytics.add(eventData);
  } catch (err) {
    console.warn('Analytics tracking failed:', err);
  }
}

// Track session end (on app close/minimize)
export function endSession() {
  if (sessionStartTime) {
    const duration = Date.now() - sessionStartTime;
    trackEvent('session_end', {
      session_id: sessionId,
      duration_ms: duration
    });
  }
}
```

---

### **Task 1.2: Instrument Key Events** (2 hours)

#### **A. Transaction Creation** 
**File**: `artifacts/gebya/src/components/TransactionForm.jsx`

```javascript
import { trackEvent } from '../utils/eventTracking';

// After successful transaction save:
trackEvent('transaction_created', {
  type: transaction.type, // 'sale', 'expense', 'credit'
  source: transaction.source, // 'voice', 'manual'
  amount: transaction.amount,
  has_photo: !!transaction.photo_proof_id,
  has_cost_price: !!transaction.cost_price,
  duration_ms: Date.now() - formStartTime
});
```

#### **B. Voice Recording**
**File**: Find your voice recording component

```javascript
// On voice attempt start:
const attemptStartTime = Date.now();

// On voice success:
trackEvent('voice_success', {
  duration_ms: Date.now() - attemptStartTime,
  transcript_length: transcript.length,
  confidence: parsingConfidence
});

// On voice failure:
trackEvent('voice_failure', {
  duration_ms: Date.now() - attemptStartTime,
  error: errorMessage
});
```

#### **C. Customer Actions**
**File**: Customer management component

```javascript
// On customer added:
trackEvent('customer_added', {
  has_phone: !!customer.phone_number,
  has_telegram: !!customer.telegram_username
});

// On credit added:
trackEvent('credit_added', {
  amount: amount,
  has_due_date: !!due_date
});

// On payment recorded:
trackEvent('payment_recorded', {
  amount: amount,
  payment_type: 'full' | 'partial'
});
```

#### **D. Feature Adoption**
**File**: Various feature components

```javascript
// Staff invited:
trackEvent('staff_invited', {
  role: 'cashier' | 'viewer'
});

// Telegram linked:
trackEvent('telegram_linked', {
  link_method: 'qr' | 'manual'
});

// Report shared:
trackEvent('report_shared', {
  share_method: 'whatsapp' | 'telegram'
});
```

---

### **Task 1.3: Add Session Tracking** (30 min)

**File**: `artifacts/gebya/src/components/AppShell.jsx` or main app entry

```javascript
import { initSession, endSession } from '../utils/eventTracking';

useEffect(() => {
  // Initialize session on mount
  initSession();
  
  // Track session end on page hide/unload
  const handleVisibilityChange = () => {
    if (document.hidden) {
      endSession();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', endSession);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', endSession);
    endSession();
  };
}, []);
```

---

### **Task 1.4: Build Simple Analytics View** (1 hour)

**File**: `artifacts/gebya/src/components/analytics/SimpleAnalytics.jsx`

```javascript
import { useEffect, useState } from 'react';
import { db } from '../../db';

export default function SimpleAnalytics() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    async function loadStats() {
      const events = await db.analytics
        .where('key')
        .startsWith('event:')
        .toArray();
      
      // Group by event type
      const grouped = {};
      for (const event of events) {
        const eventType = event.key.replace('event:', '');
        grouped[eventType] = (grouped[eventType] || 0) + event.count;
      }
      
      // Calculate retention (sessions in last 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentSessions = events.filter(e => 
        e.key === 'event:session_start' && 
        e.created_at > sevenDaysAgo
      );
      
      setStats({
        totalEvents: events.length,
        eventCounts: grouped,
        sessions7d: recentSessions.length
      });
    }
    
    loadStats();
  }, []);
  
  if (!stats) return <div>Loading analytics...</div>;
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Analytics Dashboard</h2>
      
      <div className="mb-4">
        <h3 className="font-bold">Sessions (Last 7 Days)</h3>
        <p className="text-2xl">{stats.sessions7d}</p>
      </div>
      
      <div>
        <h3 className="font-bold">Event Counts</h3>
        {Object.entries(stats.eventCounts).map(([event, count]) => (
          <div key={event} className="flex justify-between py-1">
            <span>{event}</span>
            <span className="font-bold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ Day 1 Checklist

- [ ] Create `eventTracking.js` utility
- [ ] Add session tracking to AppShell
- [ ] Instrument transaction creation
- [ ] Instrument voice recording
- [ ] Instrument customer/credit actions
- [ ] Build simple analytics view
- [ ] Test: Create transaction, check if event appears in IndexedDB
- [ ] Commit: "feat: add event analytics tracking"

**End of Day 1**: You can now measure user behavior!

---

## 📅 DAY 2: ONBOARDING + VERIFICATION (4-5 hours)

### **Goal**: Clear value proposition + verify admin tools exist

### **Task 2.1: Create Onboarding Overlay** (2 hours)

**File**: `artifacts/gebya/src/components/OnboardingOverlay.jsx`

```javascript
import { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';

export default function OnboardingOverlay({ onComplete }) {
  const { lang, t } = useLang();
  const [step, setStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  
  useEffect(() => {
    // Check if user has seen onboarding
    const seen = localStorage.getItem('onboarding_completed');
    setHasSeenOnboarding(!!seen);
  }, []);
  
  if (hasSeenOnboarding) return null;
  
  const screens = [
    {
      icon: '📒',
      title: lang === 'am' ? 'የወረቀት ማስታወሻ ደብተርዎን ይተኩ' : 'Replace Your Paper Notebook',
      description: lang === 'am' 
        ? 'የእለት ተእለት ሽያጮችን እና ወጪዎችን በፍጥነት ይከታተሉ። ቀላል። ፈጣን። የታመነ።'
        : 'Track daily sales and expenses faster. Simple. Fast. Reliable.'
    },
    {
      icon: '🎤',
      title: lang === 'am' ? 'በድምጽዎ ይመዝግቡ' : 'Record with Your Voice',
      description: lang === 'am'
        ? 'ከመጻፍ ይልቅ ይናገሩ። ገብያ በምስማት ከዚያም በራስ-ሰር ያስላል።'
        : 'Speak instead of typing. Gebya listens, then calculates automatically.'
    },
    {
      icon: '📱',
      title: lang === 'am' ? 'ዱቤ (ክሬዲት) ይከታተሉ' : 'Track Credit (Merro)',
      description: lang === 'am'
        ? 'ማን ምን እንዳዘዙ እና መቼ እንደሚከፍሉ ፈጽሞ አይርሱ። የቴሌግራም ማሳወቂያዎች።'
        : 'Never forget who owes what and when they'll pay. With Telegram reminders.'
    }
  ];
  
  const currentScreen = screens[step];
  
  const handleNext = () => {
    if (step < screens.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('onboarding_completed', 'true');
      onComplete();
    }
  };
  
  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="text-6xl mb-4">{currentScreen.icon}</div>
        <h2 className="text-2xl font-bold mb-3">{currentScreen.title}</h2>
        <p className="text-gray-600 mb-6">{currentScreen.description}</p>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {screens.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 w-2 rounded-full ${i === step ? 'bg-green-600' : 'bg-gray-300'}`}
            />
          ))}
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleSkip}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg"
          >
            {lang === 'am' ? 'ዝለል' : 'Skip'}
          </button>
          <button 
            onClick={handleNext}
            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-bold"
          >
            {step < screens.length - 1 
              ? (lang === 'am' ? 'ቀጣይ' : 'Next')
              : (lang === 'am' ? 'ጀምር' : 'Start')
            }
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Integration**: Add to `AppShell.jsx`:
```javascript
const [showOnboarding, setShowOnboarding] = useState(true);

return (
  <>
    {showOnboarding && <OnboardingOverlay onComplete={() => setShowOnboarding(false)} />}
    {/* Rest of app */}
  </>
);
```

---

### **Task 2.2: Add Empty State Guidance** (1 hour)

**File**: Update empty states in Today/Credit tabs

**Today Tab** (when no transactions):
```javascript
<div className="text-center py-12">
  <div className="text-5xl mb-3">🎤</div>
  <h3 className="text-lg font-bold mb-2">
    {lang === 'am' ? 'የመጀመሪያ ሽያጭ መዝግብ' : 'Record Your First Sale'}
  </h3>
  <p className="text-gray-600 mb-4">
    {lang === 'am' 
      ? 'በቀላሉ ሽያጭ ለመመዝገብ የማይክሮፎኑን ቁልፍ ይንኩ'
      : 'Tap the microphone button to easily record a sale'
    }
  </p>
  <button className="bg-green-600 text-white px-6 py-2 rounded-lg">
    {lang === 'am' ? 'ሽያጭ መዝግብ' : 'Record Sale'}
  </button>
</div>
```

**Credit Tab** (when no customers):
```javascript
<div className="text-center py-12">
  <div className="text-5xl mb-3">📒</div>
  <h3 className="text-lg font-bold mb-2">
    {lang === 'am' ? 'የመጀመሪያ ደንበኛ ያክሉ' : 'Add Your First Customer'}
  </h3>
  <p className="text-gray-600 mb-4">
    {lang === 'am'
      ? 'በዱቤ የሚገዙ ደንበኞችን ይከታተሉ'
      : 'Track customers who buy on credit (Merro)'
    }
  </p>
  <button className="bg-green-600 text-white px-6 py-2 rounded-lg">
    {lang === 'am' ? 'ደንበኛ ያክሉ' : 'Add Customer'}
  </button>
</div>
```

---

### **Task 2.3: Verify Admin Dashboard** (1 hour)

**Check if exists**: `artifacts/gebya/src/components/AdminDashboard.jsx`

**Verify it has**:
- [ ] User/shop search
- [ ] Transaction quality metrics
- [ ] Recent activity log
- [ ] Basic stats (total users, transactions, revenue)

**If missing critical features**, add to backlog for Week 2.

---

### **Task 2.4: Verify Backup/Export** (30 min)

**Check**:
- [ ] Does Settings have "Export Data" button?
- [ ] Can user export transactions as CSV?
- [ ] Is there a backup indicator?

**Test**:
1. Create 5 test transactions
2. Click "Export Data"
3. Verify CSV downloads with correct data

---

## ✅ Day 2 Checklist

- [ ] Create onboarding overlay component
- [ ] Integrate onboarding into app flow
- [ ] Add empty state guidance (Today + Credit tabs)
- [ ] Verify admin dashboard exists and has key features
- [ ] Test backup/export functionality
- [ ] Commit: "feat: add onboarding + improve empty states"

**End of Day 2**: Users understand value, you have support tools!

---

## 📅 DAY 3: QA + STAGING DEPLOY (5-6 hours)

### **Goal**: Verify critical flows work, deploy to staging

### **Task 3.1: Manual QA Checklist** (3 hours)

**Test on real device (Android phone if possible)**

#### **A. First-Time User Flow** (30 min)
- [ ] Open app (fresh install or clear data)
- [ ] See onboarding screens
- [ ] Skip/complete onboarding
- [ ] Land on Today screen
- [ ] Empty state shows guidance
- [ ] Can navigate between tabs

#### **B. Transaction Recording** (1 hour)
- [ ] **Voice Sale**: 
  - [ ] Tap mic, speak sale
  - [ ] Transcript appears
  - [ ] Amount detected
  - [ ] Can edit before saving
  - [ ] Transaction appears in list
  - [ ] Check analytics: `transaction_created` event logged
  
- [ ] **Manual Sale**:
  - [ ] Enter item name
  - [ ] Product suggestions appear (fuzzy matching works!)
  - [ ] Select suggestion or type new
  - [ ] Enter amount
  - [ ] Save
  - [ ] Transaction appears

- [ ] **With Photo**:
  - [ ] Add photo proof
  - [ ] Photo saves with transaction
  
- [ ] **Expense**:
  - [ ] Record expense
  - [ ] Shows in list with negative amount

#### **C. Credit Management** (1 hour)
- [ ] **Add Customer**:
  - [ ] Create new customer
  - [ ] Add phone number
  - [ ] Link Telegram (optional)
  
- [ ] **Add Credit**:
  - [ ] Add credit to customer
  - [ ] Balance updates
  - [ ] Check analytics: `credit_added` event
  
- [ ] **Record Payment**:
  - [ ] Full payment
  - [ ] Balance goes to zero
  - [ ] Partial payment
  - [ ] Balance updates correctly
  - [ ] Check analytics: `payment_recorded` event

#### **D. Multi-Staff** (30 min)
- [ ] Invite staff member (if owner)
- [ ] Accept invite on second device/browser
- [ ] Record transaction as staff
- [ ] Check actor attribution in audit log
- [ ] Check analytics: `staff_invited` event

#### **E. Offline Mode** (30 min)
- [ ] Turn off internet
- [ ] Record transaction
- [ ] Transaction saves locally
- [ ] Turn on internet
- [ ] Transaction syncs to cloud
- [ ] No data loss

#### **F. Report Sharing** (15 min)
- [ ] Generate report
- [ ] Share via WhatsApp/Telegram
- [ ] Verify format looks good
- [ ] Check analytics: `report_shared` event

---

### **Task 3.2: Check Analytics Dashboard** (30 min)

- [ ] View analytics dashboard
- [ ] See session count
- [ ] See event counts
- [ ] Events from QA testing appear

---

### **Task 3.3: Performance Check** (30 min)

**Test on low-end device if possible**:
- [ ] App loads in < 3 seconds
- [ ] Voice recording latency < 500ms
- [ ] Transaction list scrolls smoothly with 100+ items
- [ ] Search is responsive
- [ ] No console errors

---

### **Task 3.4: Deploy to Staging** (1 hour)

```bash
# Build production bundle
cd artifacts/gebya
pnpm build

# Check build size
# Should be < 1MB gzipped

# Deploy to Vercel staging
vercel --prod=false

# Test staging URL
# Run through critical flows again
```

---

## ✅ Day 3 Checklist

- [ ] Complete manual QA checklist
- [ ] Fix any critical bugs found
- [ ] Verify analytics tracking works
- [ ] Check performance on low-end device
- [ ] Deploy to staging
- [ ] Test staging deployment
- [ ] Document known issues (if any)
- [ ] Commit: "chore: QA fixes + staging deploy"

**End of Day 3**: App is tested and deployed to staging!

---

## 📅 DAY 4: BETA LAUNCH (2-3 hours)

### **Goal**: Get app into hands of 5-10 real users

### **Task 4.1: Recruit Beta Users** (1 hour)

**Ideal Beta Users**:
- 2-3 friends/family with shops
- 2-3 shop owners you know personally
- 1-2 people who are tech-comfortable (can report bugs)

**Recruitment Script** (WhatsApp/Telegram):
```
Hey [Name]! 👋

I built an app called Gebya to help shop owners track sales 
faster than paper notebooks — with voice recording in Amharic.

Would you be willing to test it for a week and give me feedback? 
It's free, and I'll personally help you set it up.

If yes, I'll send you the link + walk you through it tomorrow!
```

---

### **Task 4.2: Personal Onboarding Sessions** (2 hours)

**For each beta user**:
1. **Send staging URL** (or production if deployed)
2. **Schedule 15-min video call** or in-person visit
3. **Walk through**:
   - Install as PWA (add to home screen)
   - Complete onboarding
   - Record first sale (voice + manual)
   - Add first customer
   - Add credit transaction
4. **Answer questions**
5. **Exchange phone numbers** for quick support

---

### **Task 4.3: Set Up Monitoring** (30 min)

**Create WhatsApp/Telegram group**:
- Name: "Gebya Beta Testers"
- Add all beta users
- Pin message with support phone number

**Daily Check-ins** (next 3 days):
- Day 1: "How's it going? Any issues?"
- Day 2: "Did you use it today? Feedback?"
- Day 3: "What do you like? What's confusing?"

---

## ✅ Day 4 Checklist

- [ ] Recruit 5-10 beta users
- [ ] Deploy to production (or continue with staging)
- [ ] Personal onboarding with each user
- [ ] Create beta tester support group
- [ ] Monitor analytics dashboard
- [ ] Be available for quick support

**End of Day 4**: App is live with real users!

---

## 📊 SUCCESS METRICS (Week 1)

**Track Daily**:
- [ ] Sessions per user per day (target: 1+)
- [ ] Transactions created per day (target: 5+ per active user)
- [ ] Voice vs manual ratio (target: 30%+ voice)
- [ ] Day 1, 3, 7 retention (target: 60%, 40%, 20%)

**Track Weekly**:
- [ ] Feature adoption:
  - Credit management used (target: 3+ users)
  - Photo proof added (target: 2+ users)
  - Staff invited (target: 1+ shop)
- [ ] Top user complaints (target: identify top 3)
- [ ] Critical bugs (target: < 3 per week)

---

## 🔄 WEEK 2 PLAN (RAPID ITERATION)

### **Monday: Feedback Analysis**
- Review analytics data
- Read all user feedback
- Identify top 3 pain points

### **Tuesday-Thursday: Fix Top Issues**
- Fix #1 complaint
- Fix #2 complaint
- Fix #3 complaint

### **Friday: Deploy Updates**
- Deploy fixes
- Notify beta users
- Ask for confirmation issues are fixed

---

## 🚨 ESCALATION TRIGGERS

**Stop and fix immediately if**:
- More than 2 users report data loss
- App crashes on launch for any user
- Sync fails permanently for any user
- Critical security issue discovered

**Can wait until next iteration**:
- UI polish requests
- Nice-to-have features
- Edge case bugs (<5% of users affected)

---

## 🎉 LAUNCH CELEBRATION

After Day 4, **celebrate!** You've:
- ✅ Built a production-grade app
- ✅ Added essential analytics
- ✅ Clarified value proposition
- ✅ Tested thoroughly
- ✅ Launched to real users

**Most startups take 6-12 months to get here. You did it!**

---

## 📋 APPENDIX: TOOLS YOU'LL NEED

### **Development**:
- Code editor (VS Code)
- Terminal
- Git

### **Testing**:
- Android phone (for real device testing)
- Multiple browser profiles (test multi-user scenarios)

### **Communication**:
- WhatsApp/Telegram (for user support)
- Calendar app (schedule onboarding calls)

### **Monitoring**:
- Sentry dashboard (errors)
- Analytics dashboard you built (usage)
- Vercel dashboard (deployment status)

---

**Ready to start? Pick Day 1, Task 1.1 and let's build!** 🚀
