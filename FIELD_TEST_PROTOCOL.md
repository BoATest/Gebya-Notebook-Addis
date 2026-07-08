# Gebya Field Test Protocol

## Purpose

Test whether Gebya replaces a paper notebook for Ethiopian shop owners. This is not a feature test — it's a product-market fit test. We're answering: **Will they use it, will they come back, and would they pay for it?**

---

## Who To Pick (5-10 Shops)

### Selection Criteria

| Type | Count | Why |
|------|-------|-----|
| Solo owner (no staff) | 2-3 | Tests basic usability without team features |
| Owner + 1-2 staff | 2-3 | Tests staff attribution and multi-user flow |
| Owner + 3+ staff | 1-2 | Tests scalability and permission model |
| Gives credit (Dubie) | At least 2 | Tests the credit tracking feature |
| Currently uses paper | At least 3 | Tests the core replacement hypothesis |
| Already digital (maybe Excel) | 1-2 | Tests switching cost |

### Where To Find Them

- Shops you already know (personal network)
- Merkato area shops (high transaction volume, tech-comfortable)
- Neighborhood shops near your office (easy to visit weekly)
- Avoid: shops that already use a POS system (different competitive landscape)

### Inclusion Rules

- Has a smartphone (Android preferred — larger user base in Ethiopia)
- Can read Amharic (the app supports Amharic UI)
- Willing to try for 2 weeks
- Within your visit radius (you need to see them in person at least twice)

---

## Week 0: Setup (Before Handing Over)

### What To Prepare

1. **Pre-install Gebya** on their phone (or guide them through install)
2. **Complete onboarding** together — shop name, owner name
3. **Add 3-5 of their common items** to the catalog (ask them what they sell most)
4. **Add 1-2 test customers** if they give credit
5. **Show them the sale entry screen** — one time, briefly

### What To Say (Script)

> "This is a new app that replaces your notebook. You record sales, expenses, and credit here instead of writing. Try it for two weeks. I'll come back next [day of week] to see how it went. If you have questions, call me."

### What NOT To Say

- Don't explain the learning features ("the app learns your habits")
- Don't explain trust scores or sync
- Don't explain the admin dashboard
- Don't mention it's a beta or test version
- Don't promise it will always be free

### What To Leave With Them

- A one-page cheat sheet (Amharic) showing: Sale button → Enter amount → Save
- Your phone number for questions
- A reminder of when you'll visit next

---

## Week 1: Observation (Days 1-7)

### Daily Log (One Line Per Shop Per Day)

```
Shop: [name] | Day: [1-7] | Sales entered: [N] | Expenses entered: [N] | Credits tracked: [N] | Opened without reminder: [Y/N] | Notes: [one sentence]
```

### What To Watch For

| Day | Signal | What It Tells You |
|-----|--------|-------------------|
| 1 | Did they complete 1 sale? | Basic usability — can they figure out the flow? |
| 2 | Did they open it without being told? | Initial habit formation |
| 3 | Are they still using it? | Whether it replaces notebook or sits unused |
| 5 | Are they entering expenses too? | Feature adoption breadth |
| 7 | What's their tone when you visit? | Emotional response — frustration, indifference, enthusiasm? |

### Red Flags (Intervene If You See These)

- They completed 0 sales in 3 days → onboarding wasn't clear enough
- They completed 1 sale then stopped → something frustrated them
- They're using both notebook AND app → the app isn't replacing the notebook yet
- They ask "is this free?" repeatedly → pricing anxiety

### Green Flags (Good Signs)

- They completed 3+ sales without help
- They called you with a question (means they're trying)
- They showed it to a friend or another shopkeeper
- They said something like "this is easier than writing"

### How To Check In (Without Biasing)

Don't ask "how's it going?" — that invites polite lies.

Instead ask:
> "Show me how you recorded your last sale."

Watch what they do. The action tells you more than their words.

---

## Week 2: Deeper Adoption + Willingness-to-Pay

### Days 8-10: Feature Probe

If they're using the app regularly, casually mention:

> "Did you know you can track who owes you money? Try adding a credit sale next time someone buys on tab."

This tests whether they discover features naturally or need hand-holding.

### Days 11-12: Willingness-to-Pay Test

This is the most important moment of the field test.

**What to say (end of week 2, in person):**

> "This app costs 50 birr per month. Would you pay for it?"

**What to watch:**

| Reaction | What It Means |
|----------|---------------|
| Immediate "yes" | Strong value — they see it as worth 50 birr |
| "Let me think about it" | They see value but aren't sure it replaces the notebook enough |
| "50 birr is too much" | Either price sensitivity or the value isn't clear yet |
| "What do I get for 50 birr?" | They want to understand the value proposition |
| Confused face | They didn't realize it would cost money — pricing surprise |

**Follow-up questions (if they hesitate):**

- "What would make it worth 50 birr to you?" — tells you what feature is missing
- "What do you currently spend on notebooks and pens each month?" — anchors the value
- "If I could show you how much you're owed at any time, would that be worth 50 birr?" — tests a specific value prop

### Days 13-14: Final Check-In

Ask them to show you:
1. Their last 3 sales in the app
2. Any credits they've tracked
3. The profit summary (if they've entered expenses)

Observe: Do they navigate the app easily, or do they struggle?

---

## Data Collection

### Simple Observation Log (Per Shop)

Create a spreadsheet or note with these columns:

| Field | What To Record |
|-------|----------------|
| Shop name | |
| Owner name | |
| Shop type | Solo / 1-2 staff / 3+ staff |
| Gives credit? | Yes / No |
| Day 1 | Sales: [N] / Opened without help: [Y/N] / Notes: |
| Day 2 | Sales: [N] / Opened without help: [Y/N] / Notes: |
| Day 3 | Sales: [N] / Opened without help: [Y/N] / Notes: |
| Day 5 | Sales: [N] / Expenses: [N] / Notes: |
| Day 7 | Visit notes: |
| Day 14 | Would they pay? [Y/N/Hesitate] / Price they'd pay: / Missing feature: |

### Success Metrics (After 2 Weeks)

| Metric | Target | What It Means |
|--------|--------|---------------|
| Completed 7+ sales | 60% of shops | Basic usability proven |
| Opened without reminder 5+ days | 50% of shops | Habit forming |
| Would pay 50 birr/month | 40% of shops | Willingness to pay |
| Credits tracked without help | 30% of shops | Feature adoption |
| Showed it to someone else | 1+ shops | Organic word-of-mouth |

---

## What You're Looking For (The Five Questions)

After 2 weeks with 5-10 shops, you should be able to answer:

1. **Does it replace the notebook?** — Are they recording sales IN the app, not in both?
2. **Can they use it unaided?** — After day 1, did they need help?
3. **Do they come back without being reminded?** — Is it forming a habit?
4. **Would they pay?** — 50 birr/month, yes or no?
5. **Does the data produce one sentence for a funder?** — "X shop increased collection rate by Y%" or "Z shop tracked N birr in credit that was previously unrecorded"

If you can answer yes to 3 of these 5, you have something worth building further.

---

## Common Failure Modes (And What To Do)

| Failure | Likely Cause | Fix |
|---------|--------------|-----|
| 0 sales in 3 days | Onboarding too complex | Simplify the first-sale flow |
| Sales but no expenses | They don't see the point | Show them profit = sales - expenses |
| Credits not tracked | Feature is buried | Make credit entry more prominent after a sale |
| "It's too slow" | Phone performance | Check if phone is old/low-RAM |
| "I forgot" | Habit not formed | Send SMS reminder (if Twilio is set up) |
| "My notebook is faster" | App adds friction | Identify where the friction is — data entry? navigation? |

---

## After The Field Test

### If It Works (3+ of 5 questions = yes):
- Write the one funder sentence
- Plan the next 10 shops
- Consider the 50 birr/month pricing strategy

### If It Doesn't Work:
- Which question failed? That tells you what to fix
- Do 5 more shops with the fix
- Don't pivot — iterate

---

## Appendix: Amharic Cheat Sheet

Leave this with each shop owner:

```
ሽያጭ ለመመዝገብ:
1. "+" ጠቅ ያድርጉ
2. "ሽያጭ" ይምረጡ
3. መጠን ያስገቡ
4. "አስቀምጥ" ይጫኑ

ዱቤ ለመመዝገብ:
1. "+" ጠቅ ያድርጉ
2. "ዱቤ" ይምረጡ
3. የደንበኛ ስም ያስገቡ
4. መጠን ያስገቡ
5. "አስቀምጥ" ይጫኑ

ክፍያ ለመመዝገብ:
1. የደንበኛ ስም ይምረጡ
2. "ክፍያ" ይምረጡ
3. መጠን ያስገቡ
4. "አስቀምጥ" ይጫኑ

ጥያቄ ካለዎት: [ phone number ]
```
