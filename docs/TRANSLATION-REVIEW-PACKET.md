# Translation Review Packet — Gebya Notebook

**Scope:** every Amharic (Ge'ez) user-facing string in `artifacts/gebya/src`, with its English anchor and a `file:line` reference.

**What this is:** an audit sheet for owner + Merkato shopkeeper sign-off. It changes nothing.

- No source file was modified to produce this document.
- No Amharic was composed, machine-translated, or "improved" — strings are reproduced byte-exactly as they exist in the tree.
- Where a string is broken, the packet says so and stops. The reviewer re-derives it from the English anchor.

**How to regenerate:** `node scripts/audit/build.cjs`

## 1. Summary

Total catalogued entries: **2548**

| Review status | Entries | Meaning |
| --- | --- | --- |
| `[NEVER-REVIEWED]` | 1418 | Live in the UI with no dictionary backing and no documented review record. |
| `[VERIFIED]` | 932 | Amharic matches a reviewed context-dictionary value verbatim. |
| `[DRAFT-REVIEWED-PENDING]` | 175 | Composed during R1/R2 and already on a shortlist in `NEW_AMHARIC_STRINGS.md` / `R2-LABELS-DRAFT.md`. |
| `[NEEDS-FIX]` | 23 | Objectively broken bytes. Re-derive the Amharic from the English anchor — **do not guess a reading**. |

### By source shape

| Shape | Entries |
| --- | --- |
| `inline-ternary` | 986 |
| `dictionary-key` | 558 |
| `amharic-only` | 448 |
| `t-helper` | 311 |
| `locale-object` | 145 |
| `label-object` | 95 |
| `data-row` | 5 |

### By screen

| Screen | Entries |
| --- | --- |
| Context dictionaries (global) | 558 |
| Other | 431 |
| Staff | 241 |
| Settings | 237 |
| Admin | 154 |
| Customers | 139 |
| Auth & onboarding | 136 |
| Reports & story | 131 |
| Settlements | 89 |
| Transactions — form | 81 |
| Settings — grouped draft | 66 |
| Suppliers | 64 |
| Utils & stores | 61 |
| Settings — labels | 56 |
| Onboarding — labels | 38 |
| App shell | 31 |
| Transactions — labels | 31 |
| Shared labels | 4 |

## 2. Context dictionary (`src/context/dictionaries.js`)

| Map | Keys | Source lines |
| --- | --- | --- |
| `EN` | 416 | 1–431 |
| `AM` | 406 | 443–863 |
| `EN_OVERRIDES` | 174 | 865–1072 |
| `AM_OVERRIDES` | 528 | 1074–1674 |

- **152** keys exist only in `AM_OVERRIDES` (not in base `AM`) — these are the newest additions and have had the least review time.
- **142** keys exist only in `EN_OVERRIDES`.
- **8** keys have an `AM_OVERRIDES` value that *differs* from the base `AM` value. These are deliberate revisions; each one is a term decision someone already made.

### 2.1 Keys revised by `AM_OVERRIDES` (base value → override)

| Key | Base AM | Override AM | AM line |
| --- | --- | --- | --- |
| `about` | ስለ መተግበሪያው | ስለ ፕሮግራሙ | 1380 |
| `costPriceLabel` | የግዢ ዋጋ | የዋጋ | 1240 |
| `due` | የሚከፈልበት ቀን | መክፍያ | 1267 |
| `dueLabelShort` | የመክፈያ ቀን | መክፍያ | 1270 |
| `exportCSV` | CSV Export ያድርጉ | CSV ወደ ውጭ ላክ | 1375 |
| `iSoldLabel` | ሽያጭ ይመዝግቡ | ሸጥ | 1175 |
| `sessions` | የመተግበሪያ አጠቃቀም | ክፍለ ጊዜ | 1400 |
| `tue` | ማክሰኞ | ማክሰ | 1315 |

### 2.2 Keys added only by `AM_OVERRIDES`

| Key | EN | AM | AM line |
| --- | --- | --- | --- |
| `addAsNewCustomer` | Add as new customer | እንደ አዲስ ደንበኛ አክል | 1614 |
| `addDetailsLabel` | Add details (qty, price, more items) | ዝርዝር ጨምር (ብዛት፣ ዋጋ፣ ተጨማሪ እቃ) | 1650 |
| `addDiscountBtn` | + Add discount | + ቅናሽ ጨምር | 1672 |
| `addItem` | Add Item | አክል | 1565 |
| `addPhoto` | Add photo | ፎቶ ይጨምሩ | 1558 |
| `addRowsBtn` | Add 3 Rows | 3 ተጨማሪ ረድፎች | 1645 |
| `addShortBtn` | Add | አክል | 1646 |
| `addSupplier` | Add Supplier | አቅራቢ ለመመዝገብ | 1553 |
| `amountAria` | Amount | መጠን | 1656 |
| `amountReceivedLabel` | Amount Received | የተቀበሉት መጠን | 1606 |
| `appearance` | Appearance | መልክ | 1077 |
| `appearanceHint` | Choose the look that feels easiest on your eyes. | ለዓይንዎ ቀላል የሚሆነውን መልክ ይምረጡ። | 1078 |
| `archiveBalanceWarning` | This customer has {balance} birr outstanding. Archived records are preserved for history. | ይህ ደንበኛ {balance} ብር ዕዳ አለበት። የአርክስ መዝገቦች ለታሪክ ይቀመጣሉ። | 1572 |
| `archiveConfirm` | Archive {name}? | {name} አርክስ? | 1571 |
| `archiveCustomer` | Archive Customer | ደንበኛን አርክስ | 1569 |
| `backAria` | Back | ተመለስ | 1592 |
| `balanceShort` | BAL | ዱቤ | 1615 |
| `chaseCount` | {count} need attention | {count} ትኩረት ይፈልጋሉ | 1585 |
| `clearFormBtn` | Clear form | ቅጽበት አጽዳ | 1668 |
| `clearFormConfirm` | Clear this sale? | ይህን ሽያጭ ይጽዳ? | 1669 |
| `clearFormDone` | Form cleared | ተጽዯል | 1670 |
| `clearFormHasRows` | Delete each row first (X button on the row) | መስመሮችን ቅድሚያ ሰርዝ (X የመስመር ቁልፕ) | 1671 |
| `clearPromise` | Clear promise | አስወግድ | 1581 |
| `closeReceiptBtn` | Close | ዝጋ | 1627 |
| `colItem` | Item | ንጥል | 1598 |
| `colPrice` | Price | ዋጋ | 1600 |
| `colQty` | Qty | ብዛት | 1599 |
| `colTotal` | Total | ጠቅላላ | 1601 |
| `completeSaleBtn` | Complete Sale | ሽያጩን አጠናቅ | 1621 |
| `completeShareBtn` | Complete & Share | አጠናቅ እና አጋራ | 1622 |
| `continueBtn` | Continue | ቀጥል | 1625 |
| `creditButton` | Credit | ዱቤ | 1550 |
| `creditGave` | YOU GAVE (Dubie) | እቃ በዱቤ ሰጠሁ (-) | 1554 |
| `creditGot` | YOU GOT (Paid) | ክፍያ ተቀበልኩ (+) | 1555 |
| `creditOwedLabel` | Credit owed | ቀሪ ዱቤ | 1608 |
| `currencyShort` | ETB | ብር | 1607 |
| `customerNamePlaceholder` | Customer name... | ደንበኛ ፈልግ... | 1612 |
| `customerPhoneLabel` | Customer phone (optional) | የደንበኛ ስልክ (አማራጭ) | 1654 |
| `customersLabel` | Customers | ደንበኞች | 1543 |
| `darkMode` | Dark | ጨለማ | 1080 |
| `daysOverdue` | {days} days overdue | {days} ቀን ያለፈው | 1583 |
| `deleteRowBtn` | Delete | ሰርዝ | 1635 |
| `discardConfirmBtn` | Discard | ተው | 1626 |
| `discardDraft` | Discard | አስወግድ | 1597 |
| `discardSaleBody` | Unsaved data will be lost | ያልተቀመጠ ሁሉ ይጠፋል | 1624 |
| `discardSaleTitle` | Discard Sale? | ሽያጩን ይተው? | 1623 |
| `discountLabel` | Discount | ቅናሽ | 1604 |
| `doneBtn` | Done | ተቀጥል | 1619 |
| `draftBannerTitle` | Unfinished sale | ያልተጠናቀቀ ሽያጭ ተገኝቷል | 1595 |
| `entriesEmpty` | No entries yet | ገና ምንም ምዝገባ የለም | 1539 |
| `entriesEmptyHint` | Tap above to start | ለመጀመር ከላይ ይጫኑ | 1540 |
| `entriesHeader` | ENTRIES | ምዝገባዎች | 1537 |
| `entriesShare` | Share | አጋራ | 1538 |
| `expenseButton` | Expense | ወጪ | 1549 |
| `exportFailed` | Export failed | ኤክስፖርት አልተሳካም | 1377 |
| `fullAmountUseCash` | Amount received is the full sale — use Cash instead. | የተቀበሉት ሙሉ ነው — "ጥሬ" ይምረጡ። | 1610 |
| `grandTotalLabel` | Grand Total | ጠቅላላ | 1629 |
| `greetingAfternoon` | Keep going — record your sales as you sell | 📌 ቀጥል — ሽያጮን በሚሸጡበት ጊዜ ይመዝገቡ | 1531 |
| `greetingEvening` | Don't forget today's last sales | 🌙 የዛሬ የመጨረሻ ሽያጮን ያል⟿ | 1532 |
| `greetingMorning` | Good morning — start tracking today's sales | 👋 ዛሬ ዕለት — የዛሬ ሽያጮን ይመዝገቡ | 1530 |
| `invalidPhone` | Invalid phone number | ትክክለኛ ስልክ ቁጥር አይደለም | 1655 |
| `itemPlaceholder` | Item... | ንጥል... | 1634 |
| `itemsButton` | Simple | በቀላሉ | 1548 |
| `itemsCountLabel` | Items | እቃዎች | 1602 |
| `itemsSuffix` | items | ንጥሎች | 1641 |
| `lastSaleSection` | LAST SALE | የመጨረሻ ሽያጭ | 1636 |
| `lightMode` | Light | ብርሃን | 1079 |
| `liveSummaryItems` | Items | ንጥሎች | 1665 |
| `liveSummaryQty` | Qty | ብዛት | 1666 |
| `liveSummaryTotal` | Total | ጠቅላላ | 1667 |
| `missedPromise` | Missed promise — was due {date} | የጠበቀው ቀን አልፏል — {date} ነበር | 1577 |
| `needAttention` | Need attention | ትኩረት የሚሹ | 1584 |
| `newSaleBtn` | New Sale | አዲስ ሽያጭ | 1649 |
| `newSaleTitle` | New Sale | አዲስ ሽያጭ | 1591 |
| `noCustomerMatch` | No customer found | ደንበኛ አልተገኘም | 1613 |
| `noMatchingSales` | No matching sales | ለፍለጋው ምንም ውጤት የለም | 1639 |
| `noSalesToday` | No sales today | ዛሬ ሽያጭ የለም | 1640 |
| `offlineDetail` | saves on this phone | በዚህ ስልክ ይቀመጣል | 1501 |
| `offlineLabel` | Offline | ኔትወርክ የለም | 1500 |
| `offlineReadyDetail` | works without internet | ያለ ኢንተርኔት ይሰራል | 1508 |
| `offlineReadyStatus` | Offline ready | ከመስመር ውጭ ዝግጁ | 1507 |
| `partialPayment` | Partial | ከፊል ክፍያ | 1609 |
| `paymentLabel` | Payment | ክፍያ | 1628 |
| `paymentSaved` | Payment recorded | ክፍያ ተመዝግቧል | 1186 |
| `phoneShortLabel` | Phone: | ስልክ: | 1618 |
| `photoAddAria` | Take or choose photo | ፎቶ አክል | 1593 |
| `photoCaptureError` | Photo failed | ፎቶ አልተሳካም | 1659 |
| `photoMaxError` | You can attach up to 3 photos | 3 ፎቶዎች ሙሉ በሙሉ ተያዝዋል | 1658 |
| `pickShort` | Pick | ምረጥ | 1616 |
| `previewBtn` | Preview | ቅድመ-እይታ | 1620 |
| `promiseCleared` | Promise cleared | የተስፋፉበት ተወግዷል | 1580 |
| `promisedPayDate` | Promised to pay by {date} | እስከ {date} ይከፍላል ብሏል | 1576 |
| `promiseNote` | Note (optional) | ማስታወሻ (አማራጭ) | 1578 |
| `promisePayToday` | Promised to pay today | ዛሬ ይከፍላል ብሏል | 1582 |
| `promiseSaved` | Promise recorded | የተስፋፉበት ተመዝግቧል | 1579 |
| `proofHelper` | Proof of payment — bank transfer, telebirr, or other | የክፍያ ማረጋገጫ — ባንክ ወይም ቴሌብር | 1653 |
| `recordPromise` | Record Promise | የተስፋፉበትን ቀን ይመዝግቡ | 1575 |
| `rememberPrefix` | Remember | አስታውስ | 1637 |
| `reminders` | Reminders | ማስታወሻ | 1087 |
| `removeDiscountAria` | Remove discount | ቅናሽ አስወግድ | 1673 |
| `restoreCustomer` | Restore Customer | ደንበኛን መልስ | 1570 |
| `restoreDraft` | Restore | ወደነበረበት መልስ | 1596 |
| `saleButton` | Itemized | በእቃ ዝርዝር | 1547 |
| `saleFallback` | Sale | ሽያጭ | 1643 |
| `savedUndoLabel` | Saved ✓ | ተቀምጧል ✓ | 1652 |
| `saveFailed` | Could not save. Please try again. | ማስቀመጥ አልተሳካም — እንደገና ይሞክሩ | 1563 |
| `saveNextBtn` | Save & Next | አስቀምጥ · ቀጥል | 1651 |
| `searchShortPlaceholder` | Search... | ፈልግ... | 1638 |
| `seeAllHistory` | See All History | ሁሉንም ታሪክ ይመልከቱ | 1642 |
| `shareFooter` | via Gebya | በገበያ | 1661 |
| `shareToggle` | Share | አጋራ | 1617 |
| `shopFallback` | Shop | መደብር | 1660 |
| `subtotalLabel` | Subtotal | ድምር | 1603 |
| `suppliersLabel` | Suppliers | አቅራቢዎች | 1544 |
| `syncConflict` | Sync conflict | ሁከት ተፈጠረ | 1509 |
| `tapAddItemToConfirm` | Tap Add Item to confirm | ለማስቀመጥ አክል ይጫኑ | 1566 |
| `telegramRetry` | Retry | እንደገና | 1503 |
| `telegramWaiting` | Telegram waiting | ቴሌግራም ይጠብቃል | 1502 |
| `toastCompleted` | Completed | ተጠናቋል | 1630 |
| `toastCompletedShared` | Completed · Shared | ተጠናቋል · ተጋሯል | 1631 |
| `toastCustomerUpdated` | Customer updated | ተስተካክሏል | 1523 |
| `toastDeletedUndo` | Deleted · UNDO | ተሰርዟል · UNDO | 1632 |
| `toastDraftRestored` | Unfinished sale restored | ያልተጠናቀቀ ሽያጭ ተመልሷል | 1633 |
| `toastEntryReversed` | Entry reversed | ተሰርዟል | 1527 |
| `toastEntryUpdated` | Entry updated | ተስተካክሏል | 1524 |
| `toastEntryUpdateFailed` | Could not update entry | ማስተካከል አልተሳካም | 1525 |
| `toastReverseFailed` | Could not reverse entry | ሰርዝ አልተሳካም | 1526 |
| `todaySalesTitle` | Today's Sales | የዛሬ ሽያጭ | 1594 |
| `totalLabel` | TOTAL | ጠቅላላ | 1605 |
| `trustCardAction` | Record your first sale | የመጀመሪያ ሽያጭዎን ይመዝግቡ | 1469 |
| `trustCardBody` | Save your sales, close the app, and open again later. Your records stay here on this phone. | ሽያጭዎን ይመዝግቡ፣ መተግበሪያውን ይዝጉ፣ በኋላ እንደገና ይክፈቱት። መዝገቦችዎ በዚህ ስልክ ላይ ይቆያሉ። | 1468 |
| `trustCardTitle` | Your notebook stays on this phone | የሱቅ ደብተርዎ በዚህ ስልክ ላይ ይቆያል | 1467 |
| `trustLastSaved` | Last saved | መጨረሻ የተመዘገበው | 1470 |
| `trustReopenHint` | Close and reopen anytime. Your records stay here. | በማንኛውም ጊዜ ይዝጉት እና ይክፈቱት - መዝገብዎ እዚሁ ይቆያል። | 1472 |
| `trustTodayCount` | saved today | ዛሬ የተመዘገቡ | 1471 |
| `txCredit` | credit | ዱቤ | 1512 |
| `txDelete` | Delete | ሰርዝ | 1514 |
| `txEdit` | Edit | አርትዕ | 1513 |
| `txExcess` | Excess | በላይ | 1519 |
| `txMore` | More | ተጨማሪ | 1517 |
| `txReversal` | Reversal | ሰርዝ | 1520 |
| `txShowItems` | Show items | እቃዎችን አሳይ | 1516 |
| `txUnaccounted` | Unaccounted | ቀሪ | 1518 |
| `txViewPhoto` | View transaction photo | የግብይት ፎቶ ይመልከቱ | 1515 |
| `updateButton` | Update | አድስ | 1506 |
| `updateFailed` | Could not update. Please try again. | ማስተካከል አልተሳካም — እንደገና ይሞክሩ | 1564 |
| `updateReady` | Update ready | አዲስ ስሪት ዝግጁ ነው | 1504 |
| `updateTapRefresh` | tap to refresh | ለማደስ ይጫኑ | 1505 |
| `viaShort` | via | በ | 1611 |
| `yesterday` | Yesterday | ትናንት | 1644 |
| `youGave` | You gave | ለእኔ ሰጠ | 1559 |
| `youGot` | You got | ከእኔ ያገኘ | 1560 |

### 2.3 Dictionary entries with no Amharic value

_No dictionary key lacks an Amharic value._

## 3. `[NEEDS-FIX]` — broken Amharic (highest priority)

These strings are live in the shipped UI and are **not valid Amharic**. Each row gives the English anchor so the reviewer can re-derive the whole sentence — patching the broken word in place will not produce correct copy.

> Owner instruction on record: *do NOT guess readings.* The intent is unrecoverable without a reviewer.

### `src/components/TransactionDetailSheet.jsx` — 1 occurrence

| Anchor | Current Amharic (broken) | English anchor | Defect |
| --- | --- | --- | --- |
| `src/components/TransactionDetailSheet.jsx:217` | ቀሪ ቀሪ | — | «ቀሪ» repeated — The same word repeats back-to-back — byte corruption. |

### `src/components/settings/PasswordSettings.jsx` — 14 occurrences

| Anchor | Current Amharic (broken) | English anchor | Defect |
| --- | --- | --- | --- |
| `src/components/settings/PasswordSettings.jsx:16` | የሚስጥር ቃል መዲዛ መስከቨሪ ነው 6 በላይ ከአይነት | Password must be at least 6 characters | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:31` | የሚስጥር ቃል መዲዛ በተሳካ ሁኔታ ተለዋዋጭ ይሆናል | Password saved successfully | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:37` | የሚስጥር ቃል መዲዛ አልተሳካም | Failed to save password | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:44` | እንደገና OTP መረጃ ለማጠቃቀል ይሁኑ፣ የሚስጥር ቃል መዲዛ ነው ለማስወገድ? | You will use OTP again. Remove password? | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:57` | የሚስጥር ቃል መዲዛ በተሳካ ሁኔታ ተለዋዋጭ ይሆናል | Password removed successfully | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:62` | የሚስጥር ቃል መዲዛ አልተለወደደም | Failed to remove password | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:75` | የሚስጥር ቃል መዲዛ | PASSWORD LOGIN | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:81` | የሚስጥር ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ በማለድም OTP ይጠቀሙ | — | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:91` | የሚስጥር ቃል መዲዛ አስudya | Remove Password | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:93` | የሚስጥር ቃል መዲዛ አስudya | Remove Password | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:100` | የሚስጥር ቃል መዲዛ | New Password | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:110` | የሚስጥር ቃል መዲዛ | New Password | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:130` | የሚስጥር ቃል መዲዛ ያስገቡ | Set Password | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/settings/PasswordSettings.jsx:134` | የሚስጥር ቃል መዲዛ ያስገቡ | Set Password | መዲዛ — Not an Amharic word. Appears in the password surface. |

### `src/components/shell/AuthRequiredPrompt.jsx` — 8 occurrences

| Anchor | Current Amharic (broken) | English anchor | Defect |
| --- | --- | --- | --- |
| `src/components/shell/AuthRequiredPrompt.jsx:34` | በቀየሩ ከፍተኛ ሙያዊ ሙያዊ ሙያዊ | — | «ሙያዊ» repeated — The same word repeats back-to-back — byte corruption. |
| `src/components/shell/AuthRequiredPrompt.jsx:41` | የሚስጥር ቃል መዲወ | — | መዲወ — Not an Amharic word. Appears in the login prompt. |
| `src/components/shell/AuthRequiredPrompt.jsx:42` | ከይምት ቃል መዲዛ ይግቡ | — | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/shell/AuthRequiredPrompt.jsx:44` | ትክክለኛ ወይም ችግኛ ይምት ቃል መዲዛ | — | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/shell/AuthRequiredPrompt.jsx:45` | የሚስጥር ቃል መዲዛ ቢሆን 6 በላይ ከአይነት ነው | — | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/shell/AuthRequiredPrompt.jsx:46` | ትክክለኛ ይምት ቃል መዲዛ | — | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/shell/AuthRequiredPrompt.jsx:47` | የሚስጥር ቃል መዲዛ ያስገብ | — | መዲዛ — Not an Amharic word. Appears in the password surface. |
| `src/components/shell/AuthRequiredPrompt.jsx:359` | OTP በተሳካ ሁኔታ ገብተዋል። የሚስጥር ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ? | — | መዲዛ — Not an Amharic word. Appears in the password surface. |

## 4. Label modules (`src/labels/*`, `groupedLabels.js`)

These modules are the extraction programme's controlled surface. `src/labels/*` entries are **byte-locked** by unit tests against the inline strings they replaced, so their wording is frozen but unratified. `groupedLabels.js` is a draft holding composed strings that are explicitly **not** approved.

| Module | Entries | Status |
| --- | --- | --- |
| `src/components/settings/groupedLabels.js` | 33 | [DRAFT-REVIEWED-PENDING] |
| `src/labels/onboarding.js` | 18 | [DRAFT-REVIEWED-PENDING] |
| `src/labels/settings.js` | 28 | [DRAFT-REVIEWED-PENDING] |
| `src/labels/shared.js` | 1 | [DRAFT-REVIEWED-PENDING] |
| `src/labels/transactions.js` | 15 | [DRAFT-REVIEWED-PENDING] |

### 4.1 Every label entry

| Anchor | Status | English | Amharic | Raw source |
| --- | --- | --- | --- | --- |
| `src/components/settings/groupedLabels.js:17` | [DRAFT-REVIEWED-PENDING] | SHOP | ሱቅ | shop: { en: 'SHOP', am: 'ሱቅ' },                                   // ✅ dictionary shop |
| `src/components/settings/groupedLabels.js:18` | [DRAFT-REVIEWED-PENDING] | MONEY & CREDIT | ገንዘብ እና ዱቤ | money: { en: 'MONEY & CREDIT', am: 'ገንዘብ እና ዱቤ' },              // ⚠ composed |
| `src/components/settings/groupedLabels.js:19` | [DRAFT-REVIEWED-PENDING] | MY APP | የእርስዎ መተግበሪያ | myApp: { en: 'MY APP', am: 'የእርስዎ መተግበሪያ' },                    // ⚠ composed |
| `src/components/settings/groupedLabels.js:22` | [DRAFT-REVIEWED-PENDING] | MY ACCOUNT | የእርስዎ መለያ | myAccount: { en: 'MY ACCOUNT', am: 'የእርስዎ መለያ' },                // ⚠ composed |
| `src/components/settings/groupedLabels.js:26` | [DRAFT-REVIEWED-PENDING] | Shop Profile | የሱቅ መገለጫ | profile: { en: 'Shop Profile', am: 'የሱቅ መገለጫ' },                 // ✅ ShopTab |
| `src/components/settings/groupedLabels.js:27` | [DRAFT-REVIEWED-PENDING] | Items | እቃዎች | items: { en: 'Items', am: 'እቃዎች' },                              // ✅ ShopTab |
| `src/components/settings/groupedLabels.js:30` | [DRAFT-REVIEWED-PENDING] | Recurring Expenses | ወርሃዊ ወጪ | recurring: { en: 'Recurring Expenses', am: 'ወርሃዊ ወጪ' },          // ✅ ShopTab |
| `src/components/settings/groupedLabels.js:31` | [DRAFT-REVIEWED-PENDING] | Dubie (Credit) Rules | የዱቤ ህጎች | dubieRules: { en: 'Dubie (Credit) Rules', am: 'የዱቤ ህጎች' },      // ✅ MoneyTab |
| `src/components/settings/groupedLabels.js:32` | [DRAFT-REVIEWED-PENDING] | Payment Channels | የክፍያ መንገዶች | paymentChannels: { en: 'Payment Channels', am: 'የክፍያ መንገዶች' }, // ✅ MoneyTab |
| `src/components/settings/groupedLabels.js:33` | [DRAFT-REVIEWED-PENDING] | Plan | እቅድ | plan: { en: 'Plan', am: 'እቅድ' },                                 // ⚠ new |
| `src/components/settings/groupedLabels.js:34` | [DRAFT-REVIEWED-PENDING] | Alerts & reminders | ማስታወቂያዎች | alerts: { en: 'Alerts & reminders', am: 'ማስታወቂያዎች' },           // ⚠ EN new / AM existing token |
| `src/components/settings/groupedLabels.js:35` | [DRAFT-REVIEWED-PENDING] | Remind customers | ለደንበኞች ማስታወቂያ | remindCustomers: { en: 'Remind customers', am: 'ለደንበኞች ማስታወቂያ' }, // ⚠ composed |
| `src/components/settings/groupedLabels.js:36` | [DRAFT-REVIEWED-PENDING] | Backup & sync | መጠባበቂያ እና ማመሳሰል | backupSync: { en: 'Backup & sync', am: 'መጠባበቂያ እና ማመሳሰል' },     // ⚠ composed |
| `src/components/settings/groupedLabels.js:37` | [DRAFT-REVIEWED-PENDING] | Password & devices | የሚስጥር ቃል እና መሣሪያዎች | passwordDevices: { en: 'Password & devices', am: 'የሚስጥር ቃል እና መሣሪያዎች' }, // ⚠ MUST-FIX applied (የሚስጥር) |
| `src/components/settings/groupedLabels.js:38` | [DRAFT-REVIEWED-PENDING] | Appearance | መልክ | appearance: { en: 'Appearance', am: 'መልክ' },                     // ✅ dictionary appearance |
| `src/components/settings/groupedLabels.js:39` | [DRAFT-REVIEWED-PENDING] | Language | ቋንቋ | language: { en: 'Language', am: 'ቋንቋ' },                         // ✅ dictionary |
| `src/components/settings/groupedLabels.js:40` | [DRAFT-REVIEWED-PENDING] | Help & Support | እርዳታ እና ድጋፍ | help: { en: 'Help & Support', am: 'እርዳታ እና ድጋፍ' },              // ✅ DataTab |
| `src/components/settings/groupedLabels.js:41` | [DRAFT-REVIEWED-PENDING] | About Gebya | ስለ ገበያ | about: { en: 'About Gebya', am: 'ስለ ገበያ' },                      // ✅ DataTab (ገበያ spelling) |
| `src/components/settings/groupedLabels.js:42` | [DRAFT-REVIEWED-PENDING] | Sign out | ውጣ | signOut: { en: 'Sign out', am: 'ውጣ' },                            // ⚠ user-review shortlist |
| `src/components/settings/groupedLabels.js:44` | [DRAFT-REVIEWED-PENDING] | My alerts | የእኔ ማስታወቂያዎች | myAlerts: { en: 'My alerts', am: 'የእኔ ማስታወቂያዎች' },          // ⚠ composed |
| `src/components/settings/groupedLabels.js:45` | [DRAFT-REVIEWED-PENDING] | My phone | የእኔ ስልክ | myPhone: { en: 'My phone', am: 'የእኔ ስልክ' },                    // ⚠ composed (`ስልክ` ✅) |
| `src/components/settings/groupedLabels.js:46` | [DRAFT-REVIEWED-PENDING] | My password | የእኔ የሚስጥር ቃል | myPassword: { en: 'My password', am: 'የእኔ የሚስጥር ቃል' },          // ⚠ MUST-FIX applied (was `የይምት` = insult) |
| `src/components/settings/groupedLabels.js:51` | [DRAFT-REVIEWED-PENDING] | configured | ተዋቅሯል | configured: { en: 'configured', am: 'ተዋቅሯል' }, |
| `src/components/settings/groupedLabels.js:53` | [DRAFT-REVIEWED-PENDING] | more taps | ተጨማሪ መታ | moreTaps: { en: 'more taps', am: 'ተጨማሪ መታ' }, |
| `src/components/settings/groupedLabels.js:56` | [DRAFT-REVIEWED-PENDING] | Sign out? | መውጣት? | signOutTitle: { en: 'Sign out?', am: 'መውጣት?' }, |
| `src/components/settings/groupedLabels.js:58` | [DRAFT-REVIEWED-PENDING] | You will need your phone number to sign in again. | እንደገና ለመግባት የስልክ ቁጥርዎ ያስፈልጋል። | en: 'You will need your phone number to sign in again.', |
| `src/components/settings/groupedLabels.js:67` | [DRAFT-REVIEWED-PENDING] | Records not yet synced | ያልተመሳሰሉ መዝገቦች | unsyncedTitle: { en: 'Records not yet synced', am: 'ያልተመሳሰሉ መዝገቦች' }, |
| `src/components/settings/groupedLabels.js:69` | [DRAFT-REVIEWED-PENDING] | ‹fn› (n) | ‹fn› (n) | en: (n) => `${n} ${n === 1 ? 'record has' : 'records have'} not yet synced.`, |
| `src/components/settings/groupedLabels.js:73` | [DRAFT-REVIEWED-PENDING] | They stay on this phone and upload next time you are online. | በዚህ ስልክ ላይ ይቀራሉ፤ እርስ ጊዜ በመስመር ላይ ሲሆን ይላካሉ። | en: 'They stay on this phone and upload next time you are online.', |
| `src/components/settings/groupedLabels.js:76` | [DRAFT-REVIEWED-PENDING] | Sync now | አሁን አማሳይ። | syncNow: { en: 'Sync now', am: 'አሁን አማሳይ።' }, |
| `src/components/settings/groupedLabels.js:77` | [DRAFT-REVIEWED-PENDING] | Sign out anyway | ምንም አልተከለከለም ውጣ | signOutAnyway: { en: 'Sign out anyway', am: 'ምንም አልተከለከለም ውጣ' }, |
| `src/components/settings/groupedLabels.js:79` | [DRAFT-REVIEWED-PENDING] | Set | ተዋቅሯል | set: { en: 'Set', am: 'ተዋቅሯል' }, |
| `src/components/settings/groupedLabels.js:80` | [DRAFT-REVIEWED-PENDING] | Not set | አልተዋቀረም | notSet: { en: 'Not set', am: 'አልተዋቀረም' }, |
| `src/labels/onboarding.js:25` | [DRAFT-REVIEWED-PENDING] | Two ways to use Gebya | ገበያን ለመጠቀም ሁለት መንገዶች | kicker: { en: 'Two ways to use Gebya', am: 'ገበያን ለመጠቀም ሁለት መንገዶች' }, |
| `src/labels/onboarding.js:26` | [DRAFT-REVIEWED-PENDING] | Select Account Type | የአጠቃቀም አይነት ይምረጡ | chooseType: { en: 'Select Account Type', am: 'የአጠቃቀም አይነት ይምረጡ' }, |
| `src/labels/onboarding.js:27` | [DRAFT-REVIEWED-PENDING] | Shop Owner | የሱቅ ባለቤት | ownerTitle: { en: 'Shop Owner', am: 'የሱቅ ባለቤት' }, |
| `src/labels/onboarding.js:28` | [DRAFT-REVIEWED-PENDING] | Create your own notebook | የራስዎን ማስታወሻ ይፍጠሩ | ownerSub: { en: 'Create your own notebook', am: 'የራስዎን ማስታወሻ ይፍጠሩ' }, |
| `src/labels/onboarding.js:29` | [DRAFT-REVIEWED-PENDING] | Join a Shop | ሱቅ ይቀላቀሉ | joinTitle: { en: 'Join a Shop', am: 'ሱቅ ይቀላቀሉ' }, |
| `src/labels/onboarding.js:30` | [DRAFT-REVIEWED-PENDING] | Connect as a staff member | እንደ ሰራተኛ ይገናኙ | joinSub: { en: 'Connect as a staff member', am: 'እንደ ሰራተኛ ይገናኙ' }, |
| `src/labels/onboarding.js:31` | [DRAFT-REVIEWED-PENDING] | ወደ አማርኛ ቀይር | Switch to English | langToggleLabel: { en: 'ወደ አማርኛ ቀይር', am: 'Switch to English' }, |
| `src/labels/onboarding.js:32` | [DRAFT-REVIEWED-PENDING] | አማርኛ | English | langToggleText: { en: 'አማርኛ', am: 'English' }, |
| `src/labels/onboarding.js:33` | [DRAFT-REVIEWED-PENDING] | Back | ተመለስ | back: { en: 'Back', am: 'ተመለስ' }, |
| `src/labels/onboarding.js:34` | [DRAFT-REVIEWED-PENDING] | Set up your notebook | የሱቅዎን ማስታወሻ ደብተር ያዘጋጁ | formTitle: { en: 'Set up your notebook', am: 'የሱቅዎን ማስታወሻ ደብተር ያዘጋጁ' }, |
| `src/labels/onboarding.js:35` | [DRAFT-REVIEWED-PENDING] | Your Name | ስም | nameLabel: { en: 'Your Name', am: 'ስም' }, |
| `src/labels/onboarding.js:36` | [DRAFT-REVIEWED-PENDING] | Enter your name | ስምዎን ያስገቡ | namePlaceholder: { en: 'Enter your name', am: 'ስምዎን ያስገቡ' }, |
| `src/labels/onboarding.js:37` | [DRAFT-REVIEWED-PENDING] | Please enter your name | እባክዎ ስም ያስገቡ | nameError: { en: 'Please enter your name', am: 'እባክዎ ስም ያስገቡ' }, |
| `src/labels/onboarding.js:38` | [DRAFT-REVIEWED-PENDING] | Phone Number | ስልክ ቁጥር | phoneLabel: { en: 'Phone Number', am: 'ስልክ ቁጥር' }, |
| `src/labels/onboarding.js:39` | [DRAFT-REVIEWED-PENDING] | Enter a valid phone number | እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ | phoneError: { en: 'Enter a valid phone number', am: 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ' }, |
| `src/labels/onboarding.js:40` | [DRAFT-REVIEWED-PENDING] | Saving... | በማስቀመጥ ላይ... | saving: { en: 'Saving...', am: 'በማስቀመጥ ላይ...' }, |
| `src/labels/onboarding.js:41` | [DRAFT-REVIEWED-PENDING] | Start | ጀምር | startCta: { en: 'Start', am: 'ጀምር' }, |
| `src/labels/onboarding.js:43` | [DRAFT-REVIEWED-PENDING] | Saved on this phone — connect to internet to enable sync | በዚህ ስልክ ብቻ ተቀምጧል — ኢንተርኔት ሲገኝ ማገናኘት ይችላሉ | en: 'Saved on this phone — connect to internet to enable sync', |
| `src/labels/settings.js:9` | [DRAFT-REVIEWED-PENDING] | Set shop name | የሱቅ ስም ያስገቡ | setName: { en: 'Set shop name', am: 'የሱቅ ስም ያስገቡ' }, |
| `src/labels/settings.js:10` | [DRAFT-REVIEWED-PENDING] | Add shop phone number | የስልክ ቁጥር ያስገቡ | setPhone: { en: 'Add shop phone number', am: 'የስልክ ቁጥር ያስገቡ' }, |
| `src/labels/settings.js:11` | [DRAFT-REVIEWED-PENDING] | Set up a payment channel | የክፍያ መንገድ ያዋቅሩ | setUpChannel: { en: 'Set up a payment channel', am: 'የክፍያ መንገድ ያዋቅሩ' }, |
| `src/labels/settings.js:12` | [DRAFT-REVIEWED-PENDING] | Add items to catalog | እቃዎች ያስገቡ | addItems: { en: 'Add items to catalog', am: 'እቃዎች ያስገቡ' }, |
| `src/labels/settings.js:13` | [DRAFT-REVIEWED-PENDING] | Add recurring expenses | ወርሃዊ ወጪ ይመዝግቡ | addRecurring: { en: 'Add recurring expenses', am: 'ወርሃዊ ወጪ ይመዝግቡ' }, |
| `src/labels/settings.js:14` | [DRAFT-REVIEWED-PENDING] | Add › | ያስገቡ › | ctaAdd: { en: 'Add ›', am: 'ያስገቡ ›' }, |
| `src/labels/settings.js:15` | [DRAFT-REVIEWED-PENDING] | Setup › | ያዋቅሩ › | ctaSetup: { en: 'Setup ›', am: 'ያዋቅሩ ›' }, |
| `src/labels/settings.js:18` | [DRAFT-REVIEWED-PENDING] | ይመዝግቡ › | ይመዝግቡ › | ctaRecord: { en: 'ይመዝግቡ ›', am: 'ይመዝግቡ ›' }, |
| `src/labels/settings.js:19` | [DRAFT-REVIEWED-PENDING] | All set up | ሁሉም ተዋቅሯል | allSetUp: { en: 'All set up', am: 'ሁሉም ተዋቅሯል' }, |
| `src/labels/settings.js:20` | [DRAFT-REVIEWED-PENDING] | Details | ተጨማሪ | details: { en: 'Details', am: 'ተጨማሪ' }, |
| `src/labels/settings.js:21` | [DRAFT-REVIEWED-PENDING] | Shop | ሱቅ | shopFallback: { en: 'Shop', am: 'ሱቅ' }, |
| `src/labels/settings.js:27` | [DRAFT-REVIEWED-PENDING] | ‹fn› ({ done, total }) | ‹fn› ({ done, total }) | en: ({ done, total }) => `${done} of ${total} set up`, |
| `src/labels/settings.js:32` | [DRAFT-REVIEWED-PENDING] | Unlimited staff members | ያልተገደበ ሰራተኞች | plusStaff: { en: 'Unlimited staff members', am: 'ያልተገደበ ሰራተኞች' }, |
| `src/labels/settings.js:33` | [DRAFT-REVIEWED-PENDING] | Unlimited monthly transactions | ያልተገደበ ወርሃዊ ግብይቶች | plusTx: { en: 'Unlimited monthly transactions', am: 'ያልተገደበ ወርሃዊ ግብይቶች' }, |
| `src/labels/settings.js:34` | [DRAFT-REVIEWED-PENDING] | Advanced reports & analytics | የላቀ ሪፖርቶች እና ትንታኔ | plusReports: { en: 'Advanced reports & analytics', am: 'የላቀ ሪፖርቶች እና ትንታኔ' }, |
| `src/labels/settings.js:35` | [DRAFT-REVIEWED-PENDING] | Multi-shop management | ባለብዙ ሱቅ አስተዳደር | plusMulti: { en: 'Multi-shop management', am: 'ባለብዙ ሱቅ አስተዳደር' }, |
| `src/labels/settings.js:36` | [DRAFT-REVIEWED-PENDING] | Priority support | ቅድሚያ ድጋፍ | plusSupport: { en: 'Priority support', am: 'ቅድሚያ ድጋፍ' }, |
| `src/labels/settings.js:37` | [DRAFT-REVIEWED-PENDING] | Free Plan | ነፃ ፕላን | freeTitle: { en: 'Free Plan', am: 'ነፃ ፕላን' }, |
| `src/labels/settings.js:38` | [DRAFT-REVIEWED-PENDING] | Limited staff and reports | የሰራተኞች እና የሪፖርት ገደቦች አሉ | freeSubtitle: { en: 'Limited staff and reports', am: 'የሰራተኞች እና የሪፖርት ገደቦች አሉ' }, |
| `src/labels/settings.js:39` | [DRAFT-REVIEWED-PENDING] | Staff | ሰራተኞች | staffLabel: { en: 'Staff', am: 'ሰራተኞች' }, |
| `src/labels/settings.js:40` | [DRAFT-REVIEWED-PENDING] | Monthly tx | ወርሃዊ ግብይቶች | txLabel: { en: 'Monthly tx', am: 'ወርሃዊ ግብይቶች' }, |
| `src/labels/settings.js:41` | [DRAFT-REVIEWED-PENDING] | Upgrade to Plus | ወደ Plus አሻሽል | upgradeCta: { en: 'Upgrade to Plus', am: 'ወደ Plus አሻሽል' }, |
| `src/labels/settings.js:43` | [DRAFT-REVIEWED-PENDING] | Upgrade Now | ወደ Plus አሻሽል | upgradeNow: { en: 'Upgrade Now', am: 'ወደ Plus አሻሽል' }, |
| `src/labels/settings.js:44` | [DRAFT-REVIEWED-PENDING] | Upgrading... | በመስራት ላይ... | upgrading: { en: 'Upgrading...', am: 'በመስራት ላይ...' }, |
| `src/labels/settings.js:45` | [DRAFT-REVIEWED-PENDING] | Upgraded to Gebya Plus! 🎉 | ወደ Gebya Plus ተሻሽሏል! 🎉 | upgradedToast: { en: 'Upgraded to Gebya Plus! 🎉', am: 'ወደ Gebya Plus ተሻሽሏል! 🎉' }, |
| `src/labels/settings.js:46` | [DRAFT-REVIEWED-PENDING] | Something went wrong | እባክዎ እንደገና ይሞክሩ | upgradeFailedToast: { en: 'Something went wrong', am: 'እባክዎ እንደገና ይሞክሩ' }, |
| `src/labels/settings.js:47` | [DRAFT-REVIEWED-PENDING] | Unlock everything and scale your business | ሁሉንም ገደቦች ይክፈቱ እና የንግድዎን አቅም ይጨምሩ | modalTagline: { en: 'Unlock everything and scale your business', am: 'ሁሉንም ገደቦች ይክፈቱ እና የንግድዎን አቅም ይጨምሩ' }, |
| `src/labels/settings.js:48` | [DRAFT-REVIEWED-PENDING] | Tied to this device. No payment is taken. | ከዚህ ስልክ ጋር የተያያዘ ነው። ምንም ክፍያ አይጠየቅም። | deviceNote: { en: 'Tied to this device. No payment is taken.', am: 'ከዚህ ስልክ ጋር የተያያዘ ነው። ምንም ክፍያ አይጠየቅም።' }, |
| `src/labels/shared.js:16` | [DRAFT-REVIEWED-PENDING] | birr | ብር | sign: { en: 'birr', am: 'ብር' }, |
| `src/labels/transactions.js:12` | [DRAFT-REVIEWED-PENDING] | + Sale | + ሽያጭ | sale: { en: '+ Sale', am: '+ ሽያጭ' },            // L69, L72 (fallback) |
| `src/labels/transactions.js:13` | [DRAFT-REVIEWED-PENDING] | − Expense | − ወጪ | expense: { en: '− Expense', am: '− ወጪ' },       // L71 (Unicode minus U+2212) |
| `src/labels/transactions.js:14` | [DRAFT-REVIEWED-PENDING] | ↻ Credit | ↻ ዱቤ | credit: { en: '↻ Credit', am: '↻ ዱቤ' },        // L70 (Unicode arrow U+21BB) |
| `src/labels/transactions.js:19` | [DRAFT-REVIEWED-PENDING] | Save Credit | ዱቤ አስቀምጥ | credit: { en: 'Save Credit', am: 'ዱቤ አስቀምጥ' },   // L94 |
| `src/labels/transactions.js:20` | [DRAFT-REVIEWED-PENDING] | Save Expense | ወጪ አስቀምጥ | expense: { en: 'Save Expense', am: 'ወጪ አስቀምጥ' },  // L96 |
| `src/labels/transactions.js:21` | [DRAFT-REVIEWED-PENDING] | Save Sale | ሽያጭ አስቀምጥ | sale: { en: 'Save Sale', am: 'ሽያጭ አስቀምጥ' },      // L97 |
| `src/labels/transactions.js:25` | [DRAFT-REVIEWED-PENDING] | Save | አስቀምጥ | saveButtonDefault: { en: 'Save', am: 'አስቀምጥ' },  // L97 default branch (photos.length===0, not credit/expense) |
| `src/labels/transactions.js:29` | [DRAFT-REVIEWED-PENDING] | e.g. Abebe... | ለምሳሌ አበበ… | credit: { en: 'e.g. Abebe...', am: 'ለምሳሌ አበበ…' },  // L84 |
| `src/labels/transactions.js:30` | [DRAFT-REVIEWED-PENDING] | Add details... | ዝርዝሩን ይመዝቡ... | expense: { en: 'Add details...', am: 'ዝርዝሩን ይመዝቡ...' },  // L86 |
| `src/labels/transactions.js:31` | [DRAFT-REVIEWED-PENDING] | Add details... | ዝርዝሩን ይመዝቡ... | sale: { en: 'Add details...', am: 'ዝርዝሩን ይመዝቡ...' },    // L87 (same bytes as expense) |
| `src/labels/transactions.js:34` | [DRAFT-REVIEWED-PENDING] | NAME | ስም | credit: { en: 'NAME', am: 'ስም' },                                  // L90 |
| `src/labels/transactions.js:35` | [DRAFT-REVIEWED-PENDING] | Item / Service (Optional) | ዕቃ / አገልግሎት (አማራጭ) | sale: { en: 'Item / Service (Optional)', am: 'ዕቃ / አገልግሎት (አማራጭ)' },  // L91 |
| `src/labels/transactions.js:39` | [DRAFT-REVIEWED-PENDING] | You can attach up to 3 photos | 3 ፎቶዎች ሙሉ በሙሉ ተያዝዋል | photoLimit: { en: 'You can attach up to 3 photos', am: '3 ፎቶዎች ሙሉ በሙሉ ተያዝዋል' },  // L183 |
| `src/labels/transactions.js:43` | [DRAFT-REVIEWED-PENDING] | Cash | ጥሬ | cash: { en: 'Cash', am: 'ጥሬ' },          // L161 |
| `src/labels/transactions.js:44` | [DRAFT-REVIEWED-PENDING] | Credit | ዱቤ | credit: { en: 'Credit', am: 'ዱቤ' },       // L163 |

## 5. Inline component strings

Every Amharic string rendered directly from a component, store or util — not from the dictionary. These are the bulk of the app's user-facing copy.

| Shape | Entries | Note |
| --- | --- | --- |
| `inline-ternary` | 986 | `lang === 'am' ? '…' : '…'` — both halves live at the call site. |
| `t-helper` | 311 | `t('EN', 'AM')` — the newer local helper; same problem, different syntax. |
| `locale-object` | 145 | `{ en, am }` object literal at the call site. |
| `data-row` | 5 | Static data rows such as the bank list. |
| `amharic-only` | 448 | **No English sibling on the line** — Amharic-only literal, or a template/interpolated string. |

### 5.1 Amharic-only strings (no English anchor on the line)

These carry the most review risk: without an English sibling the reviewer must work from the surrounding code to know what the string is supposed to say.

| Anchor | Status | Screen | Amharic | Raw source |
| --- | --- | --- | --- | --- |
| `src/components/AdminPortal.jsx:30` | [NEVER-REVIEWED] | Admin | አጠቃላይ | { id: 'overview', label: 'Overview', am: 'አጠቃላይ' }, |
| `src/components/AdminPortal.jsx:31` | [NEVER-REVIEWED] | Admin | ሱቃች | { id: 'shops', label: 'Shops', am: 'ሱቃች' }, |
| `src/components/AdminPortal.jsx:32` | [NEVER-REVIEWED] | Admin | ጥርጣሬዎች | { id: 'frictions', label: 'Frictions', am: 'ጥርጣሬዎች' }, |
| `src/components/AdminPortal.jsx:33` | [NEVER-REVIEWED] | Admin | ባህሪያት | { id: 'features', label: 'Features', am: 'ባህሪያት' }, |
| `src/components/AdminPortal.jsx:34` | [NEVER-REVIEWED] | Admin | እርምጃዎች | { id: 'actions', label: 'Actions', am: 'እርምጃዎች' }, |
| `src/components/AdminPortal.jsx:35` | [NEVER-REVIEWED] | Admin | እንቅስቃሴ | { id: 'activity', label: 'Activity', am: 'እንቅስቃሴ' }, |
| `src/components/AdminPortal.jsx:36` | [NEVER-REVIEWED] | Admin | ቡድን | { id: 'team', label: 'Team', am: 'ቡድን' }, |
| `src/components/AdminShopDetail.jsx:282` | [NEVER-REVIEWED] | Admin | ${rate}% ${l === 'am' ? 'በወቅቱ' : 'on time'} | {rate == null ? '—' : `${rate}% ${l === 'am' ? 'በወቅቱ' : 'on time'}`} |
| `src/components/AdminShopDetail.jsx:445` | [NEVER-REVIEWED] | Admin | ${l === 'am' ? 'ይሰራል' : 'Enabled'} · ${shop.comms.smsUsed}/${shop.comms.smsLimit} ${l === 'am' ? 'የተጠቀመ' : 'used'} | <CommsRow label={l === 'am' ? 'SMS (Ethio Telecom)' : 'SMS (Ethio Telecom)'} value={shop.comms.smsEnabled ? `${l === 'am' ? 'ይሰራል' : 'Enabled'} · ${shop.comms.smsUsed}/${shop.comms.smsLimit} ${l === 'am' ? 'የተጠቀመ' : 'used'}` : (l === 'am' ? 'ዝጋውነት' : 'Disabled')} tone={shop.comms.smsEnabled ? 'green' : 'amber'} /> |
| `src/components/AppHeader.jsx:64` | [NEVER-REVIEWED] | App shell | እየመዘገቡ ያሉት | {T('Recording as', 'እየመዘገቡ ያሉት')} {currentActorLabel \|\| 'Owner'} |
| `src/components/AppHeader.jsx:81` | [NEVER-REVIEWED] | App shell | ተጠቃሚ ቀይር | {T('Switch actor', 'ተጠቃሚ ቀይር')} |
| `src/components/AppHeader.jsx:93` | [NEVER-REVIEWED] | App shell | ባለቤት | <div className="text-[11px] text-gray-500">{T('Owner', 'ባለቤት')}</div> |
| `src/components/AppShell.jsx:893` | [NEVER-REVIEWED] | Other | የዚህ ወር ${entitlements.max_transactions_per_month} ግብይቶች ተደርሰዋል። Plus ለማግኘት ቅንብሮች → ገንዘብ ይመልከቱ። | ? `የዚህ ወር ${entitlements.max_transactions_per_month} ግብይቶች ተደርሰዋል። Plus ለማግኘት ቅንብሮች → ገንዘብ ይመልከቱ።` |
| `src/components/AppShell.jsx:2117` | [NEVER-REVIEWED] | Other | —— Gebya ገበያ | '—— Gebya ገበያ', |
| `src/components/AuthGate.jsx:58` | [NEVER-REVIEWED] | Auth & onboarding | ወደ ጌባያ ይግቡ | title: 'ወደ ጌባያ ይግቡ', |
| `src/components/AuthGate.jsx:59` | [NEVER-REVIEWED] | Auth & onboarding | መረጃዎን በሁሉም መሳሪያዎች ላይ ለማቀነስ የሱቅዎን ስልክ ቁጥር ያስገቡ | subtitle: 'መረጃዎን በሁሉም መሳሪያዎች ላይ ለማቀነስ የሱቅዎን ስልክ ቁጥር ያስገቡ', |
| `src/components/AuthGate.jsx:60` | [VERIFIED] | Auth & onboarding | ስልክ ቁጥር | phoneLabel: 'ስልክ ቁጥር', |
| `src/components/AuthGate.jsx:62` | [VERIFIED] | Auth & onboarding | ቀጥል | continue: 'ቀጥል', |
| `src/components/AuthGate.jsx:63` | [NEVER-REVIEWED] | Auth & onboarding | የተላከውን ኮድ ያስገቡ | otpLabel: 'የተላከውን ኮድ ያስገቡ', |
| `src/components/AuthGate.jsx:64` | [NEVER-REVIEWED] | Auth & onboarding | 6 አኃዝ ኮድ | otpPlaceholder: '6 አኃዝ ኮድ', |
| `src/components/AuthGate.jsx:65` | [NEVER-REVIEWED] | Auth & onboarding | ያረጋግጡ | verify: 'ያረጋግጡ', |
| `src/components/AuthGate.jsx:66` | [NEVER-REVIEWED] | Auth & onboarding | ኮድ እንደገና ይላኩ | resend: 'ኮድ እንደገና ይላኩ', |
| `src/components/AuthGate.jsx:67` | [VERIFIED] | Auth & onboarding | ተመለስ | back: 'ተመለስ', |
| `src/components/AuthGate.jsx:68` | [NEVER-REVIEWED] | Auth & onboarding | በደመና ሳይሆን ይጠቀሙ | skip: 'በደመና ሳይሆን ይጠቀሙ', |
| `src/components/AuthGate.jsx:69` | [NEVER-REVIEWED] | Auth & onboarding | መረጃዎ በዚህ ስልክ ላይ ብቻ ይቀመጣል | skipHint: 'መረጃዎ በዚህ ስልክ ላይ ብቻ ይቀመጣል', |
| `src/components/AuthGate.jsx:70` | [NEVER-REVIEWED] | Auth & onboarding | የሚሰራ የኢትዮጵያ ስልክ ቁጥር ያስገቡ | invalidPhone: 'የሚሰራ የኢትዮጵያ ስልክ ቁጥር ያስገቡ', |
| `src/components/AuthGate.jsx:71` | [NEVER-REVIEWED] | Auth & onboarding | ኮድ ተላክ! ቴሌግራም ያረጋግጡ | otpSent: 'ኮድ ተላክ! ቴሌግራም ያረጋግጡ', |
| `src/components/AuthGate.jsx:72` | [NEVER-REVIEWED] | Auth & onboarding | ቴሌግራም የለዎትም? ከዚህ በታች ያለውን ይጠቀሙ | noTelegram: 'ቴሌግራም የለዎትም? ከዚህ በታች ያለውን ይጠቀሙ', |
| `src/components/AuthGate.jsx:73` | [NEVER-REVIEWED] | Auth & onboarding | በተሳካ ሁኔታ ገብተዋል | loginSuccess: 'በተሳካ ሁኔታ ገብተዋል', |
| `src/components/AuthGate.jsx:74` | [NEVER-REVIEWED] | Auth & onboarding | ችግር ተፈጥሯል። እባክዎ ይደጉሙ። | genericError: 'ችግር ተፈጥሯል። እባክዎ ይደጉሙ።', |
| `src/components/AuthGate.jsx:75` | [NEVER-REVIEWED] | Auth & onboarding | የጋበዛ ኮድ አለዎት? | inviteTitle: 'የጋበዛ ኮድ አለዎት?', |
| `src/components/AuthGate.jsx:76` | [NEVER-REVIEWED] | Auth & onboarding | የሱቅ ባለቤት የሰጠዎትን ኮድ ያስገቡ | inviteSubtitle: 'የሱቅ ባለቤት የሰጠዎትን ኮድ ያስገቡ', |
| `src/components/AuthGate.jsx:77` | [NEVER-REVIEWED] | Auth & onboarding | ኮዱን እዚህ ያስገቡ | invitePlaceholder: 'ኮዱን እዚህ ያስገቡ', |
| `src/components/AuthGate.jsx:78` | [NEVER-REVIEWED] | Auth & onboarding | ሱቁን ይቀላቀሉ | joinShop: 'ሱቁን ይቀላቀሉ', |
| `src/components/AuthGate.jsx:79` | [NEVER-REVIEWED] | Auth & onboarding | ኮዱ ልክ አይደለም ወይም ጊዜው አልፏል | invalidInvite: 'ኮዱ ልክ አይደለም ወይም ጊዜው አልፏል', |
| `src/components/AuthGate.jsx:80` | [NEVER-REVIEWED] | Auth & onboarding | ሱቁን ተቀላቅለዋል! እያስገባንዎት ነው... | inviteJoined: 'ሱቁን ተቀላቅለዋል! እያስገባንዎት ነው...', |
| `src/components/BankDataSharing.jsx:71` | [NEVER-REVIEWED] | Other | ንግድ መረጃዎን ከባንኮች ጋር ያጋሩ | ? 'ንግድ መረጃዎን ከባንኮች ጋር ያጋሩ' |
| `src/components/BankDataSharing.jsx:74` | [NEVER-REVIEWED] | Other | ምንም ባንክ አልተጋራም | ? 'ምንም ባንክ አልተጋራም' |
| `src/components/CameraCapture.jsx:175` | [NEVER-REVIEWED] | Other | ከማከማቻ ፎቶ ይምረጡ ወይም በቅንብሮች ውስጥ የካሜራ ፍቃድ ይፍቀዱ። | ? 'ከማከማቻ ፎቶ ይምረጡ ወይም በቅንብሮች ውስጥ የካሜራ ፍቃድ ይፍቀዱ።' |
| `src/components/CreditTab.jsx:61` | [NEVER-REVIEWED] | Other | ${remindable.length} እያስታወስን · ${skipped} ተዘለለ (ስልክ የለም) | ? `${remindable.length} እያስታወስን · ${skipped} ተዘለለ (ስልክ የለም)` |
| `src/components/CustomerDetail.jsx:612` | [NEVER-REVIEWED] | Customers | ራስ-ሰር ማስታወሻ የ Plus ምርቅ ነው — ከፈለጉ በኩል ማስታወሻ ይሠራል። | ? 'ራስ-ሰር ማስታወሻ የ Plus ምርቅ ነው — ከፈለጉ በኩል ማስታወሻ ይሠራል።' |
| `src/components/CustomerDetail.jsx:864` | [NEVER-REVIEWED] | Customers | የጠበቀው ቀን አልፏል — ${formatEthiopian(promiseDateVal)} | ? `የጠበቀው ቀን አልፏል — ${formatEthiopian(promiseDateVal)}` |
| `src/components/CustomerDetail.jsx:869` | [NEVER-REVIEWED] | Customers | እስከ ${formatEthiopian(promiseDateVal)} ይከፍላል ብሏል | ? `እስከ ${formatEthiopian(promiseDateVal)} ይከፍላል ብሏል` |
| `src/components/CustomerDetail.jsx:1272` | [NEVER-REVIEWED] | Customers | በደህንነት ይቀመጣል። መጠኖች በራስ ሰር ይደብቃሉ። | ? 'በደህንነት ይቀመጣል። መጠኖች በራስ ሰር ይደብቃሉ።' |
| `src/components/CustomerDetail.jsx:1293` | [NEVER-REVIEWED] | Customers | "${customer.display_name}" አርክስ?${hasBalance ? | ? `"${customer.display_name}" አርክስ?${hasBalance ? ` ይህ ደንበኛ ${fmt(balance)} ብር ዕዳ አለበት።` : ''}` |
| `src/components/CustomerDetail.jsx:1298` | [NEVER-REVIEWED] | Customers | የአርክስ መዝገቦች ለታሪክ ይቀመጣሉ። | ? 'የአርክስ መዝገቦች ለታሪክ ይቀመጣሉ።' |
| `src/components/CustomerForm.jsx:110` | [NEVER-REVIEWED] | Customers | ስም ብቻ ግዴታ ነው። ሌላው ሁሉ አማራጭ። | ? 'ስም ብቻ ግዴታ ነው። ሌላው ሁሉ አማራጭ።' |
| `src/components/CustomerForm.jsx:322` | [NEVER-REVIEWED] | Customers | ስልክ 9 ወይም 7 ይጀምር — 9 አኃዝ መሆን አለበት | ? 'ስልክ 9 ወይም 7 ይጀምር — 9 አኃዝ መሆን አለበት' |
| `src/components/CustomerForm.jsx:329` | [NEVER-REVIEWED] | Customers | በዘጠኝ ወይም ሰባት የሚጀምር 9 አኃዝ | ? 'በዘጠኝ ወይም ሰባት የሚጀምር 9 አኃዝ' |
| `src/components/CustomerReminderHistory.jsx:81` | [NEVER-REVIEWED] | Other | ${total} ማስታወሻ ተልኳል${lastSentLabel ? | ? `${total} ማስታወሻ ተልኳል${lastSentLabel ? ` · መጨረሻ: ${lastSentLabel}` : ''}` |
| `src/components/CustomerTelegramConnectSheet.jsx:212` | [NEVER-REVIEWED] | Other | ኮዱን ለ @ | ? ('ኮዱን ለ @' + (botUsername \|\| 'bot') + ' ይላኩ') |
| `src/components/CustomerTelegramConnectSheet.jsx:212` | [NEVER-REVIEWED] | Other | ይላኩ | ? ('ኮዱን ለ @' + (botUsername \|\| 'bot') + ' ይላኩ') |
| `src/components/CustomerTelegramConnectSheet.jsx:292` | [NEVER-REVIEWED] | Other | ደንበኛው በStart በኋላ በራስ ይታያል | ? 'ደንበኛው በStart በኋላ በራስ ይታያል' |
| `src/components/CustomerTransactionSheet.jsx:191` | [NEVER-REVIEWED] | Customers | ✏️ ክፍያ ማስተካከያ | ? (isPayment ? '✏️ ክፍያ ማስተካከያ' : '✏️ ዱቤ ማስተካከያ') |
| `src/components/CustomerTransactionSheet.jsx:191` | [NEVER-REVIEWED] | Customers | ✏️ ዱቤ ማስተካከያ | ? (isPayment ? '✏️ ክፍያ ማስተካከያ' : '✏️ ዱቤ ማስተካከያ') |
| `src/components/CustomerTransactionSheet.jsx:831` | [NEVER-REVIEWED] | Customers | እርስዎ ክፍያ ከዚህ በላይ ይኸውና የሚከፈለው መጠን ከ${fmt(currentBalance)} ዱቤ በላይ ነው። | ? `እርስዎ ክፍያ ከዚህ በላይ ይኸውና የሚከፈለው መጠን ከ${fmt(currentBalance)} ዱቤ በላይ ነው።` |
| `src/components/DailySuggestions.jsx:27` | [NEVER-REVIEWED] | Other | ዛሬ ሽያጭ አልተመዘገበም — ይጨምሩ? | message: () => "ዛሬ ሽያጭ አልተመዘገበም — ይጨምሩ?", |
| `src/components/DailySuggestions.jsx:29` | [NEVER-REVIEWED] | Other | ሽያጭ ምዝግብ | actionLabel: 'ሽያጭ ምዝግብ', |
| `src/components/DailySuggestions.jsx:35` | [NEVER-REVIEWED] | Other | ዛሬ ወጪ አልተመዘገበም — ይጨምሩ? | message: () => "ዛሬ ወጪ አልተመዘገበም — ይጨምሩ?", |
| `src/components/DailySuggestions.jsx:37` | [NEVER-REVIEWED] | Other | ወጪ ምዝግብ | actionLabel: 'ወጪ ምዝግብ', |
| `src/components/HandoverStatus.jsx:124` | [NEVER-REVIEWED] | Other | ሰራተኞች ገና አላስረከቡም — ይጠብቁ ወይም እራሳቸውን ይጠይቁ | ? 'ሰራተኞች ገና አላስረከቡም — ይጠብቁ ወይም እራሳቸውን ይጠይቁ' |
| `src/components/HeroStatus.jsx:22` | [NEVER-REVIEWED] | Other | ይህ ቀን ገና አልተዘጋም | ? 'ይህ ቀን ገና አልተዘጋም' |
| `src/components/InlineDatePicker.jsx:8` | [NEVER-REVIEWED] | Other | መስከረም | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/components/InlineDatePicker.jsx:8` | [NEVER-REVIEWED] | Other | ጥቅምት | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/components/InlineDatePicker.jsx:8` | [NEVER-REVIEWED] | Other | ኅዳር | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/components/InlineDatePicker.jsx:8` | [NEVER-REVIEWED] | Other | ታህሳስ | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/components/InlineDatePicker.jsx:8` | [NEVER-REVIEWED] | Other | ጥር | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/components/InlineDatePicker.jsx:8` | [NEVER-REVIEWED] | Other | የካቲት | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/components/InlineDatePicker.jsx:9` | [NEVER-REVIEWED] | Other | መጋቢት | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ', |
| `src/components/InlineDatePicker.jsx:9` | [NEVER-REVIEWED] | Other | ሚያዝያ | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ', |
| `src/components/InlineDatePicker.jsx:9` | [NEVER-REVIEWED] | Other | ግንቦት | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ', |
| `src/components/InlineDatePicker.jsx:9` | [NEVER-REVIEWED] | Other | ሰኔ | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ', |
| `src/components/InlineDatePicker.jsx:9` | [NEVER-REVIEWED] | Other | ሐምሌ | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ', |
| `src/components/InlineDatePicker.jsx:9` | [NEVER-REVIEWED] | Other | ነሐሴ | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ', |
| `src/components/InlineDatePicker.jsx:9` | [NEVER-REVIEWED] | Other | ጳጉሜ | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ', |
| `src/components/InlineDatePicker.jsx:15` | [NEVER-REVIEWED] | Other | እሑድ | const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ']; |
| `src/components/InlineDatePicker.jsx:15` | [VERIFIED] | Other | ሰኞ | const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ']; |
| `src/components/InlineDatePicker.jsx:15` | [NEVER-REVIEWED] | Other | ማክሰኞ | const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ']; |
| `src/components/InlineDatePicker.jsx:15` | [VERIFIED] | Other | ረቡዕ | const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ']; |
| `src/components/InlineDatePicker.jsx:15` | [VERIFIED] | Other | ሐሙስ | const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ']; |
| `src/components/InlineDatePicker.jsx:15` | [VERIFIED] | Other | አርብ | const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ']; |
| `src/components/InlineDatePicker.jsx:15` | [VERIFIED] | Other | ቅዳሜ | const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ']; |
| `src/components/InlineDatePicker.jsx:18` | [NEVER-REVIEWED] | Other | እሑድ | am: ['እሑድ', 'ኞ', 'ማክሰ', 'ረቡዕ', 'ሐስ', 'ዓርብ', 'ቅ'], |
| `src/components/InlineDatePicker.jsx:18` | [NEVER-REVIEWED] | Other | ኞ | am: ['እሑድ', 'ኞ', 'ማክሰ', 'ረቡዕ', 'ሐስ', 'ዓርብ', 'ቅ'], |
| `src/components/InlineDatePicker.jsx:18` | [VERIFIED] | Other | ማክሰ | am: ['እሑድ', 'ኞ', 'ማክሰ', 'ረቡዕ', 'ሐስ', 'ዓርብ', 'ቅ'], |
| `src/components/InlineDatePicker.jsx:18` | [VERIFIED] | Other | ረቡዕ | am: ['እሑድ', 'ኞ', 'ማክሰ', 'ረቡዕ', 'ሐስ', 'ዓርብ', 'ቅ'], |
| `src/components/InlineDatePicker.jsx:18` | [NEVER-REVIEWED] | Other | ሐስ | am: ['እሑድ', 'ኞ', 'ማክሰ', 'ረቡዕ', 'ሐስ', 'ዓርብ', 'ቅ'], |
| `src/components/InlineDatePicker.jsx:18` | [NEVER-REVIEWED] | Other | ዓርብ | am: ['እሑድ', 'ኞ', 'ማክሰ', 'ረቡዕ', 'ሐስ', 'ዓርብ', 'ቅ'], |
| `src/components/InlineDatePicker.jsx:18` | [NEVER-REVIEWED] | Other | ቅ | am: ['እሑድ', 'ኞ', 'ማክሰ', 'ረቡዕ', 'ሐስ', 'ዓርብ', 'ቅ'], |
| `src/components/JoinPage.jsx:41` | [NEVER-REVIEWED] | Auth & onboarding | ${name} ይቀላቀሉ? | joinTitle: (name) => `${name} ይቀላቀሉ?`, |
| `src/components/JoinPage.jsx:42` | [NEVER-REVIEWED] | Auth & onboarding | በጌባያ ይህን ሱቅ ለማስተዳደር ተጋብዘዋል። | joinSubtitle: 'በጌባያ ይህን ሱቅ ለማስተዳደር ተጋብዘዋል።', |
| `src/components/JoinPage.jsx:43` | [VERIFIED] | Auth & onboarding | ስልክ ቁጥር | phoneLabel: 'ስልክ ቁጥር', |
| `src/components/JoinPage.jsx:45` | [VERIFIED] | Auth & onboarding | ቀጥል | continue: 'ቀጥል', |
| `src/components/JoinPage.jsx:46` | [NEVER-REVIEWED] | Auth & onboarding | ወደ ቴሌግራም የተላከውን ኮድ ያስገቡ | otpLabel: 'ወደ ቴሌግራም የተላከውን ኮድ ያስገቡ', |
| `src/components/JoinPage.jsx:47` | [NEVER-REVIEWED] | Auth & onboarding | 6 አኃዝ ኮድ | otpPlaceholder: '6 አኃዝ ኮድ', |
| `src/components/JoinPage.jsx:48` | [NEVER-REVIEWED] | Auth & onboarding | ያረጋግጡ | verify: 'ያረጋግጡ', |
| `src/components/JoinPage.jsx:49` | [NEVER-REVIEWED] | Auth & onboarding | ኮድ እንደገና ይላኩ | resend: 'ኮድ እንደገና ይላኩ', |
| `src/components/JoinPage.jsx:50` | [VERIFIED] | Auth & onboarding | ተመለስ | back: 'ተመለስ', |
| `src/components/JoinPage.jsx:51` | [NEVER-REVIEWED] | Auth & onboarding | በተሳካ ሁኔታ ተቀላቅለዋል! | joined: 'በተሳካ ሁኔታ ተቀላቅለዋል!', |
| `src/components/JoinPage.jsx:52` | [NEVER-REVIEWED] | Auth & onboarding | አስቀድመው አባል ናችሁ። | alreadyMember: 'አስቀድመው አባል ናችሁ።', |
| `src/components/JoinPage.jsx:53` | [NEVER-REVIEWED] | Auth & onboarding | የሚሰራ የኢትዮጵያ ስልክ ቁጥር ያስገቡ | invalidPhone: 'የሚሰራ የኢትዮጵያ ስልክ ቁጥር ያስገቡ', |
| `src/components/JoinPage.jsx:54` | [NEVER-REVIEWED] | Auth & onboarding | ኮድ ተላከ! ቴሌግራም ያረጋግጡ | otpSent: 'ኮድ ተላከ! ቴሌግራም ያረጋግጡ', |
| `src/components/JoinPage.jsx:55` | [NEVER-REVIEWED] | Auth & onboarding | ችግር ተፈጥሯል። እባክዎ ይደጉሙ። | genericError: 'ችግር ተፈጥሯል። እባክዎ ይደጉሙ።', |
| `src/components/JoinPage.jsx:56` | [NEVER-REVIEWED] | Auth & onboarding | ይህ ጥሪ ጊዜው አልፎበታል። አዲስ ለመጠየቅ የባለቤቱን ይጠይቁ። | expired: 'ይህ ጥሪ ጊዜው አልፎበታል። አዲስ ለመጠየቅ የባለቤቱን ይጠይቁ።', |
| `src/components/JoinPage.jsx:57` | [NEVER-REVIEWED] | Auth & onboarding | ይህ ጥሪ ተሰርዟል። | revoked: 'ይህ ጥሪ ተሰርዟል።', |
| `src/components/JoinPage.jsx:58` | [NEVER-REVIEWED] | Auth & onboarding | ይህ ጥሪ ቀድሞውኑ ጥቅም ላይ ውሏል። | alreadyUsed: 'ይህ ጥሪ ቀድሞውኑ ጥቅም ላይ ውሏል።', |
| `src/components/JoinPage.jsx:59` | [NEVER-REVIEWED] | Auth & onboarding | አስቀድሞ ለሌላ ቢዝነስ ተመዝግበዋል። | differentBusiness: 'አስቀድሞ ለሌላ ቢዝነስ ተመዝግበዋል።', |
| `src/components/JoinPage.jsx:60` | [NEVER-REVIEWED] | Auth & onboarding | ጥሪ አልተገኘም። | notFound: 'ጥሪ አልተገኘም።', |
| `src/components/JoinPage.jsx:61` | [NEVER-REVIEWED] | Auth & onboarding | እየዞሩ ነው... | redirecting: 'እየዞሩ ነው...', |
| `src/components/MembersPanel.jsx:105` | [NEVER-REVIEWED] | Other | ስህተት | <p className="text-[11px] mt-2 font-bold" style={{ color: feedback.startsWith('Error') \|\| feedback.startsWith('ስህተት') ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}> |
| `src/components/MoneyFlowBar.jsx:37` | [NEVER-REVIEWED] | Other | ጥሬ ${fmt(cash)}፣ ዲጂታል ${fmt(digital)}፣ ዱቤ ${fmt(owed)} ETB | ? `ጥሬ ${fmt(cash)}፣ ዲጂታል ${fmt(digital)}፣ ዱቤ ${fmt(owed)} ETB` |
| `src/components/NotificationPanel.jsx:240` | [NEVER-REVIEWED] | Other | ሰራተኞች ሲያመለኩ በስልክዎ ላይ ይታያቸዋል | ? 'ሰራተኞች ሲያመለኩ በስልክዎ ላይ ይታያቸዋል' |
| `src/components/NotificationPanel.jsx:277` | [NEVER-REVIEWED] | Other | ሰራተኞች ስለ ሽያጭ እና ክፍያ ሲያመለኩ እዚህ ይታያቸዋል | ? 'ሰራተኞች ስለ ሽያጭ እና ክፍያ ሲያመለኩ እዚህ ይታያቸዋል' |
| `src/components/OfflineStatusStrip.jsx:28` | [NEVER-REVIEWED] | App shell | ${pendingCount} ${lang === 'am' ? 'ሪከርድ' : 'record'}${pendingCount !== 1 ? 's' : ''} | detail = `${pendingCount} ${lang === 'am' ? 'ሪከርድ' : 'record'}${pendingCount !== 1 ? 's' : ''}`; |
| `src/components/PayPage.jsx:118` | [NEVER-REVIEWED] | Auth & onboarding | Powered by Gebya · የንግድ ማስታወሻ | poweredBy: 'Powered by Gebya · የንግድ ማስታወሻ', |
| `src/components/PayPage.jsx:131` | [NEVER-REVIEWED] | Auth & onboarding | ይክፈሉ ለ | title: 'ይክፈሉ ለ', |
| `src/components/PayPage.jsx:132` | [NEVER-REVIEWED] | Auth & onboarding | መክፈል ያለቦት | youOwe: 'መክፈል ያለቦት', |
| `src/components/PayPage.jsx:133` | [VERIFIED] | Auth & onboarding | ብር | birr: 'ብር', |
| `src/components/PayPage.jsx:134` | [NEVER-REVIEWED] | Auth & onboarding | ከ | from: 'ከ', |
| `src/components/PayPage.jsx:135` | [NEVER-REVIEWED] | Auth & onboarding | ለዱቤ | forCredit: 'ለዱቤ', |
| `src/components/PayPage.jsx:136` | [NEVER-REVIEWED] | Auth & onboarding | በኢትዮጵያ በብዛት ጥቅም ላይ | popular: 'በኢትዮጵያ በብዛት ጥቅም ላይ', |
| `src/components/PayPage.jsx:137` | [VERIFIED] | Auth & onboarding | ባንክ ዝውውር | bankTransfer: 'ባንክ ዝውውር', |
| `src/components/PayPage.jsx:139` | [NEVER-REVIEWED] | Auth & onboarding | telebirr ይክፈቱ · ወይም *127# ይደውሉ | telebirrSubGeneric: 'telebirr ይክፈቱ · ወይም *127# ይደውሉ', |
| `src/components/PayPage.jsx:140` | [NEVER-REVIEWED] | Auth & onboarding | ለዚህ ስልክ በ telebirr ይላኩ · ወይም *127# | telebirrSubWithPhone: 'ለዚህ ስልክ በ telebirr ይላኩ · ወይም *127#', |
| `src/components/PayPage.jsx:141` | [NEVER-REVIEWED] | Auth & onboarding | ⭐ በብዛት | telebirrTag: '⭐ በብዛት', |
| `src/components/PayPage.jsx:143` | [NEVER-REVIEWED] | Auth & onboarding | CBE Mobile ይክፈቱ · ወይም *847# ይደውሉ | cbeSubGeneric: 'CBE Mobile ይክፈቱ · ወይም *847# ይደውሉ', |
| `src/components/PayPage.jsx:144` | [NEVER-REVIEWED] | Auth & onboarding | ለዚህ CBE Birr ስልክ ይላኩ · ወይም *847# | cbeSubWithPhone: 'ለዚህ CBE Birr ስልክ ይላኩ · ወይም *847#', |
| `src/components/PayPage.jsx:145` | [NEVER-REVIEWED] | Auth & onboarding | CBE ባንክ መለያ | cbeAccountLabel: 'CBE ባንክ መለያ', |
| `src/components/PayPage.jsx:147` | [NEVER-REVIEWED] | Auth & onboarding | Awash ይክፈቱ · ወይም *901# ይደውሉ | awashSubGeneric: 'Awash ይክፈቱ · ወይም *901# ይደውሉ', |
| `src/components/PayPage.jsx:148` | [NEVER-REVIEWED] | Auth & onboarding | ለዚህ Awash ስልክ ይላኩ · ወይም *901# | awashSubWithPhone: 'ለዚህ Awash ስልክ ይላኩ · ወይም *901#', |
| `src/components/PayPage.jsx:149` | [NEVER-REVIEWED] | Auth & onboarding | ሌላ ባንክ | bankName: 'ሌላ ባንክ', |
| `src/components/PayPage.jsx:150` | [NEVER-REVIEWED] | Auth & onboarding | ለመገናኘት | bankSubWithPhone: 'ለመገናኘት', |
| `src/components/PayPage.jsx:151` | [NEVER-REVIEWED] | Auth & onboarding | በአካል ይክፈሉ ወይም ሱቅ ቤት ይገናኙ | bankSubNoContact: 'በአካል ይክፈሉ ወይም ሱቅ ቤት ይገናኙ', |
| `src/components/PayPage.jsx:152` | [NEVER-REVIEWED] | Auth & onboarding | የመለያ ቁጥር | accountNumberLabel: 'የመለያ ቁጥር', |
| `src/components/PayPage.jsx:153` | [NEVER-REVIEWED] | Auth & onboarding | ቅዳ | copy: 'ቅዳ', |
| `src/components/PayPage.jsx:154` | [NEVER-REVIEWED] | Auth & onboarding | ተቀዳ! | copied: 'ተቀዳ!', |
| `src/components/PayPage.jsx:155` | [NEVER-REVIEWED] | Auth & onboarding | ለመደወል ይንኩ | tapToDial: 'ለመደወል ይንኩ', |
| `src/components/PayPage.jsx:156` | [NEVER-REVIEWED] | Auth & onboarding | 🔒 Gebya ገንዘብዎን አያይም። ለሱቁ በቀጥታ ይክፈሉ። | privacy: '🔒 Gebya ገንዘብዎን አያይም። ለሱቁ በቀጥታ ይክፈሉ።', |
| `src/components/PayPage.jsx:157` | [NEVER-REVIEWED] | Auth & onboarding | በ Gebya የተደገፈ · የንግድ ማስታወሻ | poweredBy: 'በ Gebya የተደገፈ · የንግድ ማስታወሻ', |
| `src/components/PayPage.jsx:158` | [NEVER-REVIEWED] | Auth & onboarding | ከፍያለሁ | iPaidTitle: 'ከፍያለሁ', |
| `src/components/PayPage.jsx:159` | [NEVER-REVIEWED] | Auth & onboarding | ክፍያ መላክዎን ለሱቅ ይንገሩ | iPaidSub: 'ክፍያ መላክዎን ለሱቅ ይንገሩ', |
| `src/components/PayPage.jsx:160` | [NEVER-REVIEWED] | Auth & onboarding | ሰላም፣ አሁን | iPaidMsgPrefix: 'ሰላም፣ አሁን', |
| `src/components/PayPage.jsx:161` | [NEVER-REVIEWED] | Auth & onboarding | ብር ለዱቤ ከፍያለሁ። እባክዎ ያረጋግጡ። | iPaidMsgSuffix: 'ብር ለዱቤ ከፍያለሁ። እባክዎ ያረጋግጡ።', |
| `src/components/PayPage.jsx:162` | [NEVER-REVIEWED] | Auth & onboarding | በቴሌግራም ላክ | iPaidViaTelegram: 'በቴሌግራም ላክ', |
| `src/components/PayPage.jsx:163` | [NEVER-REVIEWED] | Auth & onboarding | በSMS ላክ | iPaidViaSMS: 'በSMS ላክ', |
| `src/components/PayPage.jsx:164` | [NEVER-REVIEWED] | Auth & onboarding | ክፍያውን ጨርሰዋል? | iPaidConfirmTitle: 'ክፍያውን ጨርሰዋል?', |
| `src/components/PayPage.jsx:165` | [NEVER-REVIEWED] | Auth & onboarding | በትክክል ክፍያ ከላኩ ብቻ ይንኩ። ሱቁ ይነገራል። | iPaidConfirmBody: 'በትክክል ክፍያ ከላኩ ብቻ ይንኩ። ሱቁ ይነገራል።', |
| `src/components/PayPage.jsx:166` | [NEVER-REVIEWED] | Auth & onboarding | አዎ፣ ሱቁን አሳውቅ | iPaidConfirmYes: 'አዎ፣ ሱቁን አሳውቅ', |
| `src/components/PayPage.jsx:167` | [VERIFIED] | Auth & onboarding | ገና አይደለም | iPaidConfirmCancel: 'ገና አይደለም', |
| `src/components/PayPage.jsx:474` | [NEVER-REVIEWED] | Auth & onboarding | ሱቁ ተነገረ። ቀሪ ሂሳብዎ ሲረጋገጥ ይዘምናል። | ? 'ሱቁ ተነገረ። ቀሪ ሂሳብዎ ሲረጋገጥ ይዘምናል።' |
| `src/components/ProfitCard.jsx:198` | [NEVER-REVIEWED] | Other | በዚህ ስልክ ብቻ ይቀመጣል። ለማንም አንልክም። | ? 'በዚህ ስልክ ብቻ ይቀመጣል። ለማንም አንልክም።' |
| `src/components/RecoveryNudgeModal.jsx:21` | [NEVER-REVIEWED] | Other | ዳታዎ በዚህ ስልክ ላይ ብቻ ነው | const title = am ? 'ዳታዎ በዚህ ስልክ ላይ ብቻ ነው' : 'Your notebook lives on this phone'; |
| `src/components/RecoveryNudgeModal.jsx:23` | [NEVER-REVIEWED] | Other | ስልኩን ካጡት ወይም ከተጠገነ፣ ሁሉም መዝገቦችዎ ሊጠፉ ይችላሉ። የስልክ ቁጥርዎን በማከል ደህንነትዎን ያረጋግጡ። | ? 'ስልኩን ካጡት ወይም ከተጠገነ፣ ሁሉም መዝገቦችዎ ሊጠፉ ይችላሉ። የስልክ ቁጥርዎን በማከል ደህንነትዎን ያረጋግጡ።' |
| `src/components/RecoveryNudgeModal.jsx:26` | [NEVER-REVIEWED] | Other | ቁጥርዎን ሲጨምሩ ውሂብዎ ወደ ክላውድ ይቀመጣል፣ በማንኛውም ስልክ ማግኘት ይችላሉ። | ? 'ቁጥርዎን ሲጨምሩ ውሂብዎ ወደ ክላውድ ይቀመጣል፣ በማንኛውም ስልክ ማግኘት ይችላሉ።' |
| `src/components/RecoveryNudgeModal.jsx:28` | [NEVER-REVIEWED] | Other | ዳታዬን ደህንነቱን አረጋግጥ | const protectLabel = am ? 'ዳታዬን ደህንነቱን አረጋግጥ' : 'Keep my data safe'; |
| `src/components/RecoveryNudgeModal.jsx:29` | [NEVER-REVIEWED] | Other | በኋላ አስታውሰኝ | const snoozeLabel = am ? 'በኋላ አስታውሰኝ' : 'Remind me later'; |
| `src/components/RecoveryNudgeModal.jsx:31` | [NEVER-REVIEWED] | Other | ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ | const invalidMsg = am ? 'ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ' : 'Enter a valid Ethiopian phone number'; |
| `src/components/RecoveryNudgeModal.jsx:52` | [VERIFIED] | Other | ዝጋ | aria-label={am ? 'ዝጋ' : 'Close'} |
| `src/components/RecoveryNudgeModal.jsx:70` | [NEVER-REVIEWED] | Other | የስልክ ቁጥር | {am ? 'የስልክ ቁጥር' : 'Phone number'} |
| `src/components/ReminderSheet.jsx:227` | [NEVER-REVIEWED] | Other | መልዕክቱን ማርትዕ ይችላሉ። | ? 'መልዕክቱን ማርትዕ ይችላሉ።' |
| `src/components/ReminderSheet.jsx:296` | [NEVER-REVIEWED] | Other | ስልክ ወይም ቴሌግራም አልተመዘገበም። የደንበኛውን ገጽ ላይ መረጃ ይጨምሩ። | ? 'ስልክ ወይም ቴሌግራም አልተመዘገበም። የደንበኛውን ገጽ ላይ መረጃ ይጨምሩ።' |
| `src/components/ReminderSheet.jsx:303` | [NEVER-REVIEWED] | Other | መልዕክት በራስ ይላካል። | ? 'መልዕክት በራስ ይላካል።' |
| `src/components/report/SettlementSheet.jsx:381` | [NEVER-REVIEWED] | Settlements | · ${itemBreakdown.simpleSales} ${t('simple sale(s) without item details', 'ሽያጭ ያለ ዝርዝር')} | {itemBreakdown.simpleSales > 0 && ` · ${itemBreakdown.simpleSales} ${t('simple sale(s) without item details', 'ሽያጭ ያለ ዝርዝር')}`} |
| `src/components/report/SettlementSheet.jsx:421` | [NEVER-REVIEWED] | Settlements | ${t('Matched', 'ተመጣጣኚ')} ✓ | ? `${t('Matched', 'ተመጣጣኚ')} ✓` |
| `src/components/ReportView.jsx:415` | [NEVER-REVIEWED] | Reports & story | ልዩነት: ${fmt(variance)} ${variance > 0 ? 'ከፍተው' : 'ታመከ'} ✓ | ? `ልዩነት: ${fmt(variance)} ${variance > 0 ? 'ከፍተው' : 'ታመከ'} ✓` |
| `src/components/ReportView.jsx:482` | [NEVER-REVIEWED] | Reports & story | 🛒 ጠቅላላ ሽያጭ: ${H(metrics.totalSold)} ETB | `🛒 ጠቅላላ ሽያጭ: ${H(metrics.totalSold)} ETB`, |
| `src/components/ReportView.jsx:483` | [NEVER-REVIEWED] | Reports & story | 📤 ወጪ: ${H(metrics.spentToday)} ETB | `📤 ወጪ: ${H(metrics.spentToday)} ETB`, |
| `src/components/ReportView.jsx:484` | [NEVER-REVIEWED] | Reports & story | 💰 የዕዳ መሰብሰብ: ${H(metrics.creditCollected)} ETB | `💰 የዕዳ መሰብሰብ: ${H(metrics.creditCollected)} ETB`, |
| `src/components/ReportView.jsx:485` | [NEVER-REVIEWED] | Reports & story | 📝 አዲስ ዱቤ: ${H(metrics.newDubie)} ETB | `📝 አዲስ ዱቤ: ${H(metrics.newDubie)} ETB`, |
| `src/components/ReportView.jsx:486` | [NEVER-REVIEWED] | Reports & story | 💵 የሚጠበቅ ጥሬ ገንዘብ: ${H(metrics.cashExpected)} ETB | `💵 የሚጠበቅ ጥሬ ገንዘብ: ${H(metrics.cashExpected)} ETB`, |
| `src/components/ReportView.jsx:499` | [NEVER-REVIEWED] | Reports & story | 🏅 ብዙ የተሸጠ: ${top.name} · ${H(top.revenue)} ETB | ? `🏅 ብዙ የተሸጠ: ${top.name} · ${H(top.revenue)} ETB` |
| `src/components/ReportView.jsx:503` | [NEVER-REVIEWED] | Reports & story | —— Gebya ገበያ | lines.push('', '—— Gebya ገበያ'); |
| `src/components/ReportView.jsx:607` | [NEVER-REVIEWED] | Reports & story | 🌅 ${lang === 'am' ? 'ዛሬ' : 'Today'} | ['today', `🌅 ${lang === 'am' ? 'ዛሬ' : 'Today'}`], |
| `src/components/ReportView.jsx:608` | [NEVER-REVIEWED] | Reports & story | 📅 ${lang === 'am' ? 'ሳምንት' : 'Week'} | ['week', `📅 ${lang === 'am' ? 'ሳምንት' : 'Week'}`], |
| `src/components/ReportView.jsx:609` | [NEVER-REVIEWED] | Reports & story | 🗓 ${lang === 'am' ? 'ወር' : 'Month'} | ['month', `🗓 ${lang === 'am' ? 'ወር' : 'Month'}`], |
| `src/components/ReportView.jsx:610` | [NEVER-REVIEWED] | Reports & story | ✏️ ${lang === 'am' ? 'ብጁ' : 'Custom'} | ['custom', `✏️ ${lang === 'am' ? 'ብጁ' : 'Custom'}`], |
| `src/components/ReportView.jsx:636` | [NEVER-REVIEWED] | Reports & story | 👥 ${lang === 'am' ? 'ሁሉም' : 'Everyone'} | ['all', `👥 ${lang === 'am' ? 'ሁሉም' : 'Everyone'}`], |
| `src/components/ReportView.jsx:637` | [NEVER-REVIEWED] | Reports & story | 🧑 ${lang === 'am' ? 'ባለቤት' : 'Owner'} | [OWNER_SCOPE, `🧑 ${lang === 'am' ? 'ባለቤት' : 'Owner'}`], |
| `src/components/ReportView.jsx:709` | [NEVER-REVIEWED] | Reports & story | መሣሪያዎን ከሰራተኛ መገለጫዎ ጋር እንዲገናኝ ባለቤቱን ይጠይቁ። | ? 'መሣሪያዎን ከሰራተኛ መገለጫዎ ጋር እንዲገናኝ ባለቤቱን ይጠይቁ።' |
| `src/components/ReportView.jsx:713` | [NEVER-REVIEWED] | Reports & story | በመረጡት ቀናት ውስጥ መዝገብ የለም። ሌላ ጊዜ ይምረጡ ወይም አዲስ እንቅስቃሴ ይመዝግብ። | ? 'በመረጡት ቀናት ውስጥ መዝገብ የለም። ሌላ ጊዜ ይምረጡ ወይም አዲስ እንቅስቃሴ ይመዝግብ።' |
| `src/components/ReportView.jsx:716` | [NEVER-REVIEWED] | Reports & story | ዛሬውን ሽያጭ ይመዝግቡ — ሱቅዎ ሁኔታ በፈጣን ይዘርጋል። | ? 'ዛሬውን ሽያጭ ይመዝግቡ — ሱቅዎ ሁኔታ በፈጣን ይዘርጋል።' |
| `src/components/ReportView.jsx:746` | [NEVER-REVIEWED] | Reports & story | ${activePersonName} · ${lang === 'am' ? 'የእኔ ቀን' : 'MY DAY'} | ? `${activePersonName} · ${lang === 'am' ? 'የእኔ ቀን' : 'MY DAY'}` |
| `src/components/ReportView.jsx:765` | [NEVER-REVIEWED] | Reports & story | የሚጠበቅ: 💵 ${hidden ? '••••' : fmt(metrics.cashExpected)} · 📱 ${hidden ? '••••' : fmt(metrics.transferRecorded)} ETB | ? `የሚጠበቅ: 💵 ${hidden ? '••••' : fmt(metrics.cashExpected)} · 📱 ${hidden ? '••••' : fmt(metrics.transferRecorded)} ETB` |
| `src/components/RunningTotalPill.jsx:41` | [VERIFIED] | Other | ሽያጭ | · {count} {t(count === 1 ? 'sale' : 'sales', count === 1 ? 'ሽያጭ' : 'ሽያጮች')} |
| `src/components/RunningTotalPill.jsx:41` | [NEVER-REVIEWED] | Other | ሽያጮች | · {count} {t(count === 1 ? 'sale' : 'sales', count === 1 ? 'ሽያጭ' : 'ሽያጮች')} |
| `src/components/settings/backup/DangerZoneSection.jsx:96` | [NEVER-REVIEWED] | Settings | ይህ ${totalEntries} መዝገብ፣ ${totalCustomers} ደንበኞች ይሰረዛሉ። መልሶ ማግኘት አይቻልም። | ? `ይህ ${totalEntries} መዝገብ፣ ${totalCustomers} ደንበኞች ይሰረዛሉ። መልሶ ማግኘት አይቻልም።` |
| `src/components/settings/backup/DangerZoneSection.jsx:124` | [NEVER-REVIEWED] | Settings | ይህ ምትኬ ይዟል: ${restoreTarget?.counts?.transactions \|\| 0} ሽያጭ+ወጪ, ${restoreTarget?.counts?.customers \|\| 0} ደንበኞች, ${restoreTarget?.counts?.suppliers \|\| 0} አቅራቢዎች | ? `ይህ ምትኬ ይዟል: ${restoreTarget?.counts?.transactions \|\| 0} ሽያጭ+ወጪ, ${restoreTarget?.counts?.customers \|\| 0} ደንበኞች, ${restoreTarget?.counts?.suppliers \|\| 0} አቅራቢዎች` |
| `src/components/settings/CatalogPanel.jsx:49` | [NEVER-REVIEWED] | Settings | በተደጋጋሚ የሚሸጡትን ዕቃዎች ከነ ዋጋቸው ያስቀምጡ — ሽያጭ ሲመዘግቡ በፍጥነት ይመጣሉ። | ? 'በተደጋጋሚ የሚሸጡትን ዕቃዎች ከነ ዋጋቸው ያስቀምጡ — ሽያጭ ሲመዘግቡ በፍጥነት ይመጣሉ።' |
| `src/components/settings/DubieRulesPanel.jsx:47` | [NEVER-REVIEWED] | Settings | ${d} ${lang === 'am' ? 'ቀን' : 'days'} | {d === 0 ? (lang === 'am' ? 'ምንም' : 'None') : `${d} ${lang === 'am' ? 'ቀን' : 'days'}`} |
| `src/components/settings/DubieRulesPanel.jsx:71` | [NEVER-REVIEWED] | Settings | ራስ-ሰር ማስታወቂያ በቅንብሮች → ውሂብ ይተዳደራል። | ? 'ራስ-ሰር ማስታወቂያ በቅንብሮች → ውሂብ ይተዳደራል።' |
| `src/components/settings/grouped/AboutPanel.jsx:83` | [NEVER-REVIEWED] | Settings | መተግበሪያው ሲታገድ ለማስተካከል እና ለማሻሻል ይረዳል። ምንም የግል መረጃ አይላክም። | ? 'መተግበሪያው ሲታገድ ለማስተካከል እና ለማሻሻል ይረዳል። ምንም የግል መረጃ አይላክም።' |
| `src/components/settings/grouped/HelpSupportPanel.jsx:22` | [NEVER-REVIEWED] | Settings | ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ → ቴሌግራም፣ ዋትስአፕ ወይም SMS ይምረጡ | ? 'ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ → ቴሌግራም፣ ዋትስአፕ ወይም SMS ይምረጡ' |
| `src/components/settings/grouped/HelpSupportPanel.jsx:30` | [NEVER-REVIEWED] | Settings | ሽያጭ ሲመዘገብ → "+ Add discount" ይጫኑ → መጠኑን ያስገቡ (ከሽያጭ ድምር በላይ መሆን አይችልም) | ? 'ሽያጭ ሲመዘገብ → "+ Add discount" ይጫኑ → መጠኑን ያስገቡ (ከሽያጭ ድምር በላይ መሆን አይችልም)' |
| `src/components/settings/grouped/HelpSupportPanel.jsx:38` | [NEVER-REVIEWED] | Settings | ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል። ምንም ወደ ውጭ አይላክም። | ? 'ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል። ምንም ወደ ውጭ አይላክም።' |
| `src/components/settings/groupedLabels.js:59` | [DRAFT-REVIEWED-PENDING] | Settings — grouped draft | እንደገና ለመግባት የስልክ ቁጥርዎ ያስፈልጋል። | am: 'እንደገና ለመግባት የስልክ ቁጥርዎ ያስፈልጋል።', |
| `src/components/settings/groupedLabels.js:70` | [DRAFT-REVIEWED-PENDING] | Settings — grouped draft | ${n} ${n === 1 ? 'መዝገብ' : 'መዝገቦች'} አልተመሳሰሉም። | am: (n) => `${n} ${n === 1 ? 'መዝገብ' : 'መዝገቦች'} አልተመሳሰሉም።`, |
| `src/components/settings/groupedLabels.js:74` | [DRAFT-REVIEWED-PENDING] | Settings — grouped draft | በዚህ ስልክ ላይ ይቀራሉ፤ እርስ ጊዜ በመስመር ላይ ሲሆን ይላካሉ። | am: 'በዚህ ስልክ ላይ ይቀራሉ፤ እርስ ጊዜ በመስመር ላይ ሲሆን ይላካሉ።', |
| `src/components/settings/MyAccountPanel.jsx:197` | [NEVER-REVIEWED] | Settings | ${totalEntries} መዝገብ · ምትኬ እና ውጤት | ? `${totalEntries} መዝገብ · ምትኬ እና ውጤት` |
| `src/components/settings/NotificationPreferences.jsx:152` | [NEVER-REVIEWED] | Settings | በዚህ ጊዜ ውስጥ push ማስጠንቂያ አይልክም | ? 'በዚህ ጊዜ ውስጥ push ማስጠንቂያ አይልክም' |
| `src/components/settings/PasswordSettings.jsx:81` | [NEEDS-FIX] | Auth & onboarding | የሚስጥር ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ በማለድም OTP ይጠቀሙ | ? 'የሚስጥር ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ በማለድም OTP ይጠቀሙ' |
| `src/components/settings/PaymentChannelsSection.jsx:76` | [NEVER-REVIEWED] | Settings | ${configuredCount} ${lang === 'am' ? 'ተዋቅሯል' : 'configured'} | {`${configuredCount} ${lang === 'am' ? 'ተዋቅሯል' : 'configured'}`} |
| `src/components/settings/PaymentChannelsSection.jsx:81` | [NEVER-REVIEWED] | Settings | መንገድ ይምረጡ — በሽያጭ መመዝገብ ጊዜ ይታያል። | ? 'መንገድ ይምረጡ — በሽያጭ መመዝገብ ጊዜ ይታያል።' |
| `src/components/settings/PaymentChannelsSection.jsx:164` | [NEVER-REVIEWED] | Settings | መረጃው በዚህ ስልክ ላይ ብቻ ይቀመጣል። Gebya ገንዘቡን አያይም — እርስዎ በቀጥታ ይቀበላሉ። | ? 'መረጃው በዚህ ስልክ ላይ ብቻ ይቀመጣል። Gebya ገንዘቡን አያይም — እርስዎ በቀጥታ ይቀበላሉ።' |
| `src/components/settings/PaymentChannelsSection.jsx:311` | [NEVER-REVIEWED] | Settings | የመለያ ቁጥር | ? (channel.kind === 'bank' ? 'የመለያ ቁጥር' : 'CBE ባንክ መለያ (አማራጭ)') |
| `src/components/settings/PaymentChannelsSection.jsx:311` | [NEVER-REVIEWED] | Settings | CBE ባንክ መለያ (አማራጭ) | ? (channel.kind === 'bank' ? 'የመለያ ቁጥር' : 'CBE ባንክ መለያ (አማራጭ)') |
| `src/components/settings/ReminderSettings.jsx:113` | [NEVER-REVIEWED] | Settings | በየሳምንቱ ማስታወቂያ ይላካል | ? (frequency === 'weekly' ? 'በየሳምንቱ ማስታወቂያ ይላካል' : 'በየቀኑ ማስታወቂያ ይላካል') |
| `src/components/settings/ReminderSettings.jsx:113` | [NEVER-REVIEWED] | Settings | በየቀኑ ማስታወቂያ ይላካል | ? (frequency === 'weekly' ? 'በየሳምንቱ ማስታወቂያ ይላካል' : 'በየቀኑ ማስታወቂያ ይላካል') |
| `src/components/settings/ReminderSettings.jsx:172` | [NEVER-REVIEWED] | Settings | ከዘገዬ ቀን በ1-7 ቀን ውስጥ ይላካል | ? 'ከዘገዬ ቀን በ1-7 ቀን ውስጥ ይላካል' |
| `src/components/settings/ReminderSettings.jsx:181` | [NEVER-REVIEWED] | Settings | ራስ-ሰር ማስታወቂያ ተዘግቷል። ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ። | ? 'ራስ-ሰር ማስታወቂያ ተዘግቷል። ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ።' |
| `src/components/settings/SettingsGroupedPage.jsx:167` | [NEVER-REVIEWED] | Settings | ${shopProfile?.name \|\| (lang === 'am' ? 'ስም የለም' : 'No name')}${shopProfile?.phone ? | subtitle={`${shopProfile?.name \|\| (lang === 'am' ? 'ስም የለም' : 'No name')}${shopProfile?.phone ? ` · ${shopProfile.phone}` : ''}`} |
| `src/components/settings/SettingsGroupedPage.jsx:281` | [NEVER-REVIEWED] | Settings | ${totalEntries} መዝገብ · ምትኬ እና ውጤት | ? `${totalEntries} መዝገብ · ምትኬ እና ውጤት` |
| `src/components/settings/ShopProfilePanel.jsx:56` | [NEVER-REVIEWED] | Settings | ይህ የዚህ ስልክ ዋና ባለቤት መለያ ነው። እዚህ የሚደረጉ ለውጦች መላውን ሱቅ ማስታወሻ ይነካሉ። | ? 'ይህ የዚህ ስልክ ዋና ባለቤት መለያ ነው። እዚህ የሚደረጉ ለውጦች መላውን ሱቅ ማስታወሻ ይነካሉ።' |
| `src/components/settings/tabs/DataTab.jsx:60` | [NEVER-REVIEWED] | Settings | ${totalEntries} መዝገብ · ምትኬ እና ውጤት | ? `${totalEntries} መዝገብ · ምትኬ እና ውጤት` |
| `src/components/settings/tabs/DataTab.jsx:92` | [NEVER-REVIEWED] | Settings | መተግበሪያው ሲታገድ ለማስተካከል እና ለማሻሻል ይረዳል። ምንም የግል መረጃ አይላክም። | ? 'መተግበሪያው ሲታገድ ለማስተካከል እና ለማሻሻል ይረዳል። ምንም የግል መረጃ አይላክም።' |
| `src/components/settings/tabs/DataTab.jsx:151` | [NEVER-REVIEWED] | Settings | ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ → ቴሌግራም፣ ዋትስአፕ ወይም SMS ይምረጡ | ? 'ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ → ቴሌግራም፣ ዋትስአፕ ወይም SMS ይምረጡ' |
| `src/components/settings/tabs/DataTab.jsx:159` | [NEVER-REVIEWED] | Settings | ሽያጭ ሲመዘገብ → "+ Add discount" ይጫኑ → መጠኑን ያስገቡ (ከሽያጭ ድምር በላይ መሆን አይችልም) | ? 'ሽያጭ ሲመዘገብ → "+ Add discount" ይጫኑ → መጠኑን ያስገቡ (ከሽያጭ ድምር በላይ መሆን አይችልም)' |
| `src/components/settings/tabs/DataTab.jsx:167` | [NEVER-REVIEWED] | Settings | ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል። ምንም ወደ ውጭ አይላክም። | ? 'ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል። ምንም ወደ ውጭ አይላክም።' |
| `src/components/settings/tabs/MoneyTab.jsx:27` | [NEVER-REVIEWED] | Settings | ${chOnConfigured} ${lang === 'am' ? 'መንገድ ዝግጁ' : 'configured'} | ? `${chOnConfigured} ${lang === 'am' ? 'መንገድ ዝግጁ' : 'configured'}` |
| `src/components/settings/tabs/ShopTab.jsx:59` | [NEVER-REVIEWED] | Settings | ${shopProfile?.name \|\| (lang === 'am' ? 'ስም የለም' : 'No name')}${shopProfile?.phone ? | subtitle={`${shopProfile?.name \|\| (lang === 'am' ? 'ስም የለም' : 'No name')}${shopProfile?.phone ? ` · ${shopProfile.phone}` : ''}`} |
| `src/components/SettingsPage.jsx:22` | [NEVER-REVIEWED] | Settings | ሱቅ | { id: 'shop', labelEn: 'Shop', labelAm: 'ሱቅ' }, |
| `src/components/SettingsPage.jsx:23` | [NEVER-REVIEWED] | Settings | ገንዘብ | { id: 'money', labelEn: 'Money', labelAm: 'ገንዘብ' }, |
| `src/components/SettingsPage.jsx:24` | [NEVER-REVIEWED] | Settings | ውሂብ | { id: 'data', labelEn: 'Data', labelAm: 'ውሂብ' }, |
| `src/components/SettingsPage.jsx:129` | [NEVER-REVIEWED] | Settings | የልማት ሁነታ እንደገና ያንብት? ይህ ለመጠበቅ ይፈልጋል | ? 'የልማት ሁነታ እንደገና ያንብት? ይህ ለመጠበቅ ይፈልጋል' |
| `src/components/SettingsPage.jsx:161` | [NEVER-REVIEWED] | Settings | 🛠 የልማት ሁነታ ተከፍቷል (ለዚህ ክፍለ ጊዜ ብቻ) | ? '🛠 የልማት ሁነታ ተከፍቷል (ለዚህ ክፍለ ጊዜ ብቻ)' |
| `src/components/shell/AuthRequiredPrompt.jsx:19` | [NEVER-REVIEWED] | Auth & onboarding | እባክዎ ይግቡ | title: 'እባክዎ ይግቡ', |
| `src/components/shell/AuthRequiredPrompt.jsx:20` | [NEVER-REVIEWED] | Auth & onboarding | መረጃዎን ለማቀነስ የስልክ ቁጥርዎን ያስገቡ | subtitle: 'መረጃዎን ለማቀነስ የስልክ ቁጥርዎን ያስገቡ', |
| `src/components/shell/AuthRequiredPrompt.jsx:21` | [VERIFIED] | Auth & onboarding | ስልክ ቁጥር | phoneLabel: 'ስልክ ቁጥር', |
| `src/components/shell/AuthRequiredPrompt.jsx:22` | [VERIFIED] | Auth & onboarding | ቀጥል | continue: 'ቀጥል', |
| `src/components/shell/AuthRequiredPrompt.jsx:23` | [NEVER-REVIEWED] | Auth & onboarding | የተላከውን ኮድ ያስገቡ | otpLabel: 'የተላከውን ኮድ ያስገቡ', |
| `src/components/shell/AuthRequiredPrompt.jsx:24` | [NEVER-REVIEWED] | Auth & onboarding | ያረጋግጡ | verify: 'ያረጋግጡ', |
| `src/components/shell/AuthRequiredPrompt.jsx:25` | [NEVER-REVIEWED] | Auth & onboarding | ኮድ እንደገና ይላኩ | resend: 'ኮድ እንደገና ይላኩ', |
| `src/components/shell/AuthRequiredPrompt.jsx:26` | [VERIFIED] | Auth & onboarding | ተመለስ | back: 'ተመለስ', |
| `src/components/shell/AuthRequiredPrompt.jsx:27` | [VERIFIED] | Auth & onboarding | ዝጋ | skip: 'ዝጋ', |
| `src/components/shell/AuthRequiredPrompt.jsx:28` | [NEVER-REVIEWED] | Auth & onboarding | ትክክለኛ ስልክ ቁጥር ያስገቡ | invalidPhone: 'ትክክለኛ ስልክ ቁጥር ያስገቡ', |
| `src/components/shell/AuthRequiredPrompt.jsx:29` | [NEVER-REVIEWED] | Auth & onboarding | ኮድ ተላክ! | otpSent: 'ኮድ ተላክ!', |
| `src/components/shell/AuthRequiredPrompt.jsx:30` | [NEVER-REVIEWED] | Auth & onboarding | በተሳካ ሁኔታ ገብተዋል | success: 'በተሳካ ሁኔታ ገብተዋል', |
| `src/components/shell/AuthRequiredPrompt.jsx:31` | [NEVER-REVIEWED] | Auth & onboarding | ችግር ተፈጥሮ | error: 'ችግር ተፈጥሮ', |
| `src/components/shell/AuthRequiredPrompt.jsx:32` | [NEVER-REVIEWED] | Auth & onboarding | የኮድ ጊዜው አልፎበታል። እንደገና ይሰራው | codeExpired: 'የኮድ ጊዜው አልፎበታል። እንደገና ይሰራው', |
| `src/components/shell/AuthRequiredPrompt.jsx:33` | [NEVER-REVIEWED] | Auth & onboarding | ትክክለኛ ኮድ። እባክዎ ይህልዑት ኮድ ያስገቡ | codeInvalid: 'ትክክለኛ ኮድ። እባክዎ ይህልዑት ኮድ ያስገቡ', |
| `src/components/shell/AuthRequiredPrompt.jsx:34` | [NEEDS-FIX] | Auth & onboarding | በቀየሩ ከፍተኛ ሙያዊ ሙያዊ ሙያዊ | tooManyAttempts: 'በቀየሩ ከፍተኛ ሙያዊ ሙያዊ ሙያዊ', |
| `src/components/shell/AuthRequiredPrompt.jsx:35` | [NEVER-REVIEWED] | Auth & onboarding | ማስታወቂያ በSMS ነው የተላከ | sendingViaSMS: 'ማስታወቂያ በSMS ነው የተላከ', |
| `src/components/shell/AuthRequiredPrompt.jsx:36` | [NEVER-REVIEWED] | Auth & onboarding | ማስታወቂያ በTelegram ነው የተላከ | sendingViaTelegram: 'ማስታወቂያ በTelegram ነው የተላከ', |
| `src/components/shell/AuthRequiredPrompt.jsx:37` | [NEVER-REVIEWED] | Auth & onboarding | አይደለም? | notOnTeam: 'አይደለም?', |
| `src/components/shell/AuthRequiredPrompt.jsx:38` | [NEVER-REVIEWED] | Auth & onboarding | ሱቩን ይቀላቀሉ | joinShop: 'ሱቩን ይቀላቀሉ', |
| `src/components/shell/AuthRequiredPrompt.jsx:39` | [NEVER-REVIEWED] | Auth & onboarding | በመላኪያ ነው... | resending: 'በመላኪያ ነው...', |
| `src/components/shell/AuthRequiredPrompt.jsx:40` | [NEVER-REVIEWED] | Auth & onboarding | በማረጋገጣ ነው... | verifying: 'በማረጋገጣ ነው...', |
| `src/components/shell/AuthRequiredPrompt.jsx:41` | [NEEDS-FIX] | Auth & onboarding | የሚስጥር ቃል መዲወ | passwordLabel: 'የሚስጥር ቃል መዲወ', |
| `src/components/shell/AuthRequiredPrompt.jsx:42` | [NEEDS-FIX] | Auth & onboarding | ከይምት ቃል መዲዛ ይግቡ | passwordLogin: 'ከይምት ቃል መዲዛ ይግቡ', |
| `src/components/shell/AuthRequiredPrompt.jsx:43` | [NEVER-REVIEWED] | Auth & onboarding | ከOTP ኮድ ይግቡ | otpLogin: 'ከOTP ኮድ ይግቡ', |
| `src/components/shell/AuthRequiredPrompt.jsx:44` | [NEEDS-FIX] | Auth & onboarding | ትክክለኛ ወይም ችግኛ ይምት ቃል መዲዛ | passwordInvalid: 'ትክክለኛ ወይም ችግኛ ይምት ቃል መዲዛ', |
| `src/components/shell/AuthRequiredPrompt.jsx:45` | [NEEDS-FIX] | Auth & onboarding | የሚስጥር ቃል መዲዛ ቢሆን 6 በላይ ከአይነት ነው | passwordTooShort: 'የሚስጥር ቃል መዲዛ ቢሆን 6 በላይ ከአይነት ነው', |
| `src/components/shell/AuthRequiredPrompt.jsx:46` | [NEEDS-FIX] | Auth & onboarding | ትክክለኛ ይምት ቃል መዲዛ | wrongPassword: 'ትክክለኛ ይምት ቃል መዲዛ', |
| `src/components/shell/AuthRequiredPrompt.jsx:47` | [NEEDS-FIX] | Auth & onboarding | የሚስጥር ቃል መዲዛ ያስገብ | passwordSetup: 'የሚስጥር ቃል መዲዛ ያስገብ', |
| `src/components/shell/AuthRequiredPrompt.jsx:48` | [NEVER-REVIEWED] | Auth & onboarding | አልጨማምትም — ከOTP ጋር ይጠቀሙ | skipPasswordSetup: 'አልጨማምትም — ከOTP ጋር ይጠቀሙ', |
| `src/components/shell/AuthRequiredPrompt.jsx:359` | [NEEDS-FIX] | Auth & onboarding | OTP በተሳካ ሁኔታ ገብተዋል። የሚስጥር ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ? | ? 'OTP በተሳካ ሁኔታ ገብተዋል። የሚስጥር ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ?' |
| `src/components/staff/StaffActivityFeed.jsx:116` | [NEVER-REVIEWED] | Staff | · ${fmt(totalAmount)} ${t('birr', 'ብር')} | {totalAmount > 0 && ` · ${fmt(totalAmount)} ${t('birr', 'ብር')}`} |
| `src/components/staff/StaffActivityFeed.jsx:161` | [NEVER-REVIEWED] | Staff | የሰራተኞች እንቅስቃሴ እዚህ ይታያል | 'የሰራተኞች እንቅስቃሴ እዚህ ይታያል')} |
| `src/components/staff/StaffJoinCode.jsx:18` | [NEVER-REVIEWED] | Staff | ${t('Failed to reset join code', 'ኮድ አልተሻከረም')}: ${result.error} | fireToast(`${t('Failed to reset join code', 'ኮድ አልተሻከረም')}: ${result.error}`, 4500); |
| `src/components/staff/StaffJoinCode.jsx:23` | [NEVER-REVIEWED] | Staff | ${t('Failed to reset join code', 'ኮድ አልተሻከረም')}: ${err?.message \|\| ''} | fireToast(`${t('Failed to reset join code', 'ኮድ አልተሻከረም')}: ${err?.message \|\| ''}`, 4500); |
| `src/components/staff/StaffJoinCode.jsx:88` | [NEVER-REVIEWED] | Staff | ሰራተኞች ኮዱን አስገብተው ይቀላቀላሉ። ሚናቸውን ከዚህ በታች መቀየር ይችላሉ። | 'ሰራተኞች ኮዱን አስገብተው ይቀላቀላሉ። ሚናቸውን ከዚህ በታች መቀየር ይችላሉ።')} |
| `src/components/staff/StaffJoinCode.jsx:104` | [NEVER-REVIEWED] | Staff | ${t('Failed to generate join code', 'ኮድ አልተፈጠረም')}: ${result.error} | fireToast(`${t('Failed to generate join code', 'ኮድ አልተፈጠረም')}: ${result.error}`, 4500); |
| `src/components/staff/StaffJoinCode.jsx:109` | [NEVER-REVIEWED] | Staff | ${t('Failed to generate join code', 'ኮድ አልተፈጠረም')}: ${err?.message \|\| ''} | fireToast(`${t('Failed to generate join code', 'ኮድ አልተፈጠረም')}: ${err?.message \|\| ''}`, 4500); |
| `src/components/staff/StaffTodayTeam.jsx:137` | [NEVER-REVIEWED] | Staff | · ${fmt(lastS.actual_total \|\| 0)} ${t('birr', 'ብር')} | {isFinalized ? ` · ${fmt(lastS.actual_total \|\| 0)} ${t('birr', 'ብር')}` : ''} |
| `src/components/SupplierDetail.jsx:309` | [NEVER-REVIEWED] | Suppliers | ከዚህ አቅራቢ ግዢዎችን ይመዝግቡ። | ? 'ከዚህ አቅራቢ ግዢዎችን ይመዝግቡ።' |
| `src/components/SupplierForm.jsx:151` | [NEVER-REVIEWED] | Suppliers | ፎቶ ተጨምሯል · ~${photoKb} KB · በዚህ ስልክ ብቻ | ? `ፎቶ ተጨምሯል · ~${photoKb} KB · በዚህ ስልክ ብቻ` |
| `src/components/SupplierForm.jsx:262` | [NEVER-REVIEWED] | Suppliers | ስልክ 9 ወይም 7 ይጀምር — 9 አኃዝ መሆን አለበት | ? 'ስልክ 9 ወይም 7 ይጀምር — 9 አኃዝ መሆን አለበት' |
| `src/components/SupportPanel.jsx:116` | [NEVER-REVIEWED] | Other | ወደ ዝርዝር ተመለስ | <ChevronLeft size={14} /> {T('ወደ ዝርዝር ተመለስ', 'Back to list')} |
| `src/components/SupportPanel.jsx:140` | [NEVER-REVIEWED] | Other | ምንም መልእክት የለም | {T('ምንም መልእክት የለም', 'No messages yet')} |
| `src/components/SupportPanel.jsx:156` | [NEVER-REVIEWED] | Other | እርስዎ | {fromAdmin ? 'Gebya Support' : T('እርስዎ', 'You')} |
| `src/components/SupportPanel.jsx:171` | [NEVER-REVIEWED] | Other | መልስዎን ይጻፉ... | placeholder={T('መልስዎን ይጻፉ...', 'Type your reply...')} |
| `src/components/SupportPanel.jsx:192` | [NEVER-REVIEWED] | Other | እንደተፈታ ምልክት አድርግ | {T('እንደተፈታ ምልክት አድርግ', 'Mark resolved')} |
| `src/components/SupportPanel.jsx:201` | [VERIFIED] | Other | ዝጋ | {T('ዝጋ', 'Close')} |
| `src/components/SupportPanel.jsx:216` | [NEVER-REVIEWED] | Other | የዚህ ሱቅ ትኬቶች | ? (T('የዚህ ሱቅ ትኬቶች', "This shop's tickets")) |
| `src/components/SupportPanel.jsx:217` | [NEVER-REVIEWED] | Other | የድጋፍ ትኬቶች | : (T('የድጋፍ ትኬቶች', 'Support tickets'))} |
| `src/components/SupportPanel.jsx:225` | [NEVER-REVIEWED] | Other | አዲስ ትኬት | <Plus size={14} /> {T('አዲስ ትኬት', 'New ticket')} |
| `src/components/SupportPanel.jsx:235` | [NEVER-REVIEWED] | Other | ርዕስ | placeholder={T('ርዕስ', 'Subject')} |
| `src/components/SupportPanel.jsx:243` | [NEVER-REVIEWED] | Other | ችግሩን ይግለጹ... | placeholder={T('ችግሩን ይግለጹ...', 'Describe the issue...')} |
| `src/components/SupportPanel.jsx:254` | [NEVER-REVIEWED] | Other | ዝቅተኛ | <option value="low">{T('ዝቅተኛ', 'Low')}</option> |
| `src/components/SupportPanel.jsx:255` | [NEVER-REVIEWED] | Other | መደበኛ | <option value="normal">{T('መደበኛ', 'Normal')}</option> |
| `src/components/SupportPanel.jsx:256` | [NEVER-REVIEWED] | Other | ከፍተኛ | <option value="high">{T('ከፍተኛ', 'High')}</option> |
| `src/components/SupportPanel.jsx:257` | [NEVER-REVIEWED] | Other | አስቸኳይ | <option value="urgent">{T('አስቸኳይ', 'Urgent')}</option> |
| `src/components/SupportPanel.jsx:265` | [NEVER-REVIEWED] | Other | በመላክ ላይ... | {saving ? T('በመላክ ላይ...', 'Sending...') : T('አስገባ', 'Submit')} |
| `src/components/SupportPanel.jsx:265` | [NEVER-REVIEWED] | Other | አስገባ | {saving ? T('በመላክ ላይ...', 'Sending...') : T('አስገባ', 'Submit')} |
| `src/components/SupportPanel.jsx:273` | [NEVER-REVIEWED] | Other | በመጫን ላይ... | {T('በመጫን ላይ...', 'Loading...')} |
| `src/components/SupportPanel.jsx:277` | [NEVER-REVIEWED] | Other | ምንም ትኬት የለም | {T('ምንም ትኬት የለም', 'No tickets yet')} |
| `src/components/SyncDiagnosticSheet.jsx:42` | [NEVER-REVIEWED] | Other | ሁኔታ | { k: am ? 'ሁኔታ' : 'Status', v: status }, |
| `src/components/SyncDiagnosticSheet.jsx:43` | [NEVER-REVIEWED] | Other | የኤንጂን ኔትወርክ | { k: am ? 'የኤንጂን ኔትወርክ' : 'Engine online', v: online ? (am ? 'አዎ' : 'yes') : (am ? 'አልሆነም' : 'no') }, |
| `src/components/SyncDiagnosticSheet.jsx:43` | [NEVER-REVIEWED] | Other | አዎ | { k: am ? 'የኤንጂን ኔትወርክ' : 'Engine online', v: online ? (am ? 'አዎ' : 'yes') : (am ? 'አልሆነም' : 'no') }, |
| `src/components/SyncDiagnosticSheet.jsx:43` | [NEVER-REVIEWED] | Other | አልሆነም | { k: am ? 'የኤንጂን ኔትወርክ' : 'Engine online', v: online ? (am ? 'አዎ' : 'yes') : (am ? 'አልሆነም' : 'no') }, |
| `src/components/SyncDiagnosticSheet.jsx:44` | [NEVER-REVIEWED] | Other | የመተግበሪያ ኔትወርክ | { k: am ? 'የመተግበሪያ ኔትወርክ' : 'App online', v: pwaOnline ? (am ? 'አዎ' : 'yes') : (am ? 'አልሆነም' : 'no') }, |
| `src/components/SyncDiagnosticSheet.jsx:44` | [NEVER-REVIEWED] | Other | አዎ | { k: am ? 'የመተግበሪያ ኔትወርክ' : 'App online', v: pwaOnline ? (am ? 'አዎ' : 'yes') : (am ? 'አልሆነም' : 'no') }, |
| `src/components/SyncDiagnosticSheet.jsx:44` | [NEVER-REVIEWED] | Other | አልሆነም | { k: am ? 'የመተግበሪያ ኔትወርክ' : 'App online', v: pwaOnline ? (am ? 'አዎ' : 'yes') : (am ? 'አልሆነም' : 'no') }, |
| `src/components/SyncDiagnosticSheet.jsx:45` | [NEVER-REVIEWED] | Other | የማጠቃለያ ምልክት | { k: am ? 'የማጠቃለያ ምልክት' : 'Auth token', v: hasToken == null ? '…' : hasToken ? (am ? 'አለ' : 'present') : (am ? 'የለም' : 'missing') }, |
| `src/components/SyncDiagnosticSheet.jsx:45` | [NEVER-REVIEWED] | Other | አለ | { k: am ? 'የማጠቃለያ ምልክት' : 'Auth token', v: hasToken == null ? '…' : hasToken ? (am ? 'አለ' : 'present') : (am ? 'የለም' : 'missing') }, |
| `src/components/SyncDiagnosticSheet.jsx:45` | [NEVER-REVIEWED] | Other | የለም | { k: am ? 'የማጠቃለያ ምልክት' : 'Auth token', v: hasToken == null ? '…' : hasToken ? (am ? 'አለ' : 'present') : (am ? 'የለም' : 'missing') }, |
| `src/components/SyncDiagnosticSheet.jsx:46` | [NEVER-REVIEWED] | Other | ለማመሳሰል ያሉ ሪከርዶች | { k: am ? 'ለማመሳሰል ያሉ ሪከርዶች' : 'Pending records', v: String(pendingCount) }, |
| `src/components/SyncDiagnosticSheet.jsx:47` | [NEVER-REVIEWED] | Other | የመጨረሻ ማመሳሰል | { k: am ? 'የመጨረሻ ማመሳሰል' : 'Last sync', v: timeAgo(lastSyncAt) }, |
| `src/components/SyncDiagnosticSheet.jsx:48` | [NEVER-REVIEWED] | Other | የንግድ መለያ | { k: am ? 'የንግድ መለያ' : 'Business ID', v: businessId ? String(businessId) : (am ? 'የለም' : 'none') }, |
| `src/components/SyncDiagnosticSheet.jsx:48` | [NEVER-REVIEWED] | Other | የለም | { k: am ? 'የንግድ መለያ' : 'Business ID', v: businessId ? String(businessId) : (am ? 'የለም' : 'none') }, |
| `src/components/SyncDiagnosticSheet.jsx:57` | [NEVER-REVIEWED] | Other | የማመሳሰል ሁኔታ | aria-label={am ? 'የማመሳሰል ሁኔታ' : 'Sync status'} |
| `src/components/SyncDiagnosticSheet.jsx:66` | [NEVER-REVIEWED] | Other | የማመሳሰል ሁኔታ | {am ? 'የማመሳሰል ሁኔታ' : 'Sync status'} |
| `src/components/SyncDiagnosticSheet.jsx:75` | [NEVER-REVIEWED] | Other | ማመሳሰል ራስ-በራሱ ነው። ሰብሳቢዎት ውሂብ ይመለሳል፣ እርስዎ ምንም መጫን የለበትም። ካልሆነ፣ ስህተቱ ከታች ነው። | ? 'ማመሳሰል ራስ-በራሱ ነው። ሰብሳቢዎት ውሂብ ይመለሳል፣ እርስዎ ምንም መጫን የለበትም። ካልሆነ፣ ስህተቱ ከታች ነው።' |
| `src/components/SyncDiagnosticSheet.jsx:93` | [NEVER-REVIEWED] | Other | ስህተት: | {(am ? 'ስህተት: ' : 'Error: ') + String(error)} |
| `src/components/SyncDiagnosticSheet.jsx:105` | [VERIFIED] | Other | እንደገና ሞክር | <RefreshCw size={16} /> {retrying ? '…' : (am ? 'እንደገና ሞክር' : 'Retry now')} |
| `src/components/SyncDiagnosticSheet.jsx:114` | [NEVER-REVIEWED] | Other | ለመግቢያ | {am ? 'ለመግቢያ' : 'Sign in'} |
| `src/components/SyncStatusIndicator.jsx:124` | [NEVER-REVIEWED] | Other | ${diffMins} ${lang === 'am' ? 'ደቂቃ' : 'min'} ${lang === 'am' ? 'በፊት' : 'ago'} | if (diffMins < 60) return `${diffMins} ${lang === 'am' ? 'ደቂቃ' : 'min'} ${lang === 'am' ? 'በፊት' : 'ago'}`; |
| `src/components/SyncStatusIndicator.jsx:127` | [NEVER-REVIEWED] | Other | ${hours} ${lang === 'am' ? 'ሰዓት' : 'hr'} ${lang === 'am' ? 'በፊት' : 'ago'} | if (hours < 24) return `${hours} ${lang === 'am' ? 'ሰዓት' : 'hr'} ${lang === 'am' ? 'በፊት' : 'ago'}`; |
| `src/components/SyncStatusIndicator.jsx:130` | [NEVER-REVIEWED] | Other | ${days} ${lang === 'am' ? 'ቀን' : 'day'} ${lang === 'am' ? 'በፊት' : 'ago'} | return `${days} ${lang === 'am' ? 'ቀን' : 'day'} ${lang === 'am' ? 'በፊት' : 'ago'}`; |
| `src/components/SyncStatusIndicator.jsx:157` | [NEVER-REVIEWED] | Other | (${syncState.pendingCount}) ${lang === 'am' ? 'የተመለከተው' : 'Pending'} | text: `(${syncState.pendingCount}) ${lang === 'am' ? 'የተመለከተው' : 'Pending'}`, |
| `src/components/TimelineView.jsx:39` | [NEVER-REVIEWED] | Other | ${lang === 'am' ? '½ ከፊል' : '½ Partial'}${row.payment_provider ? | if (method === 'partial') return `${lang === 'am' ? '½ ከፊል' : '½ Partial'}${row.payment_provider ? ` · ${row.payment_provider}` : ''}`; |
| `src/components/TodayBusiness.jsx:62` | [NEVER-REVIEWED] | Other | ${personName}${lang === 'am' ? ' · የዛሬ ሽያጭ' : " · today's sales"} | ? `${personName}${lang === 'am' ? ' · የዛሬ ሽያጭ' : " · today's sales"}` |
| `src/components/TodayBusiness.jsx:64` | [NEVER-REVIEWED] | Other | ዛሬ ጠቅላላ ሽያጭ${staffCount > 0 ? | ? `ዛሬ ጠቅላላ ሽያጭ${staffCount > 0 ? ` (${staffCount + 1} ሰው)` : ''}` |
| `src/components/TransactionDetailSheet.jsx:48` | [VERIFIED] | Other | ክፍያ | ? (currentLang === 'am' ? 'ክፍያ' : 'PAYMENT') |
| `src/components/TransactionDetailSheet.jsx:49` | [VERIFIED] | Other | ዱቤ | : (currentLang === 'am' ? 'ዱቤ' : 'CREDIT'); |
| `src/components/TransactionDetailSheet.jsx:86` | [NEVER-REVIEWED] | Other | የግብይት ዝርዝር | {currentLang === 'am' ? 'የግብይት ዝርዝር' : 'Transaction Detail'} |
| `src/components/TransactionDetailSheet.jsx:128` | [VERIFIED] | Other | ብር | {currentLang === 'am' ? 'ብር' : 'birr'} |
| `src/components/TransactionDetailSheet.jsx:153` | [NEVER-REVIEWED] | Other | ማስታወሻ / ዝርዝር | {currentLang === 'am' ? 'ማስታወሻ / ዝርዝር' : 'Description / Note'} |
| `src/components/TransactionDetailSheet.jsx:165` | [NEVER-REVIEWED] | Other | የመጨረሻ ቀን | label={currentLang === 'am' ? 'የመጨረሻ ቀን' : 'Due Date'} |
| `src/components/TransactionDetailSheet.jsx:175` | [NEVER-REVIEWED] | Other | የመፈetrize ዘይቤ | label={currentLang === 'am' ? 'የመፈetrize ዘይቤ' : 'Settlement Mode'} |
| `src/components/TransactionDetailSheet.jsx:178` | [NEVER-REVIEWED] | Other | ከሽያጭ | ? (currentLang === 'am' ? 'ከሽያጭ' : 'from sale') |
| `src/components/TransactionDetailSheet.jsx:180` | [NEVER-REVIEWED] | Other | ኋላ ይከፍላል | ? (currentLang === 'am' ? 'ኋላ ይከፍላል' : 'pay-later') |
| `src/components/TransactionDetailSheet.jsx:191` | [VERIFIED] | Other | ብዛት | label={currentLang === 'am' ? 'ብዛት' : 'Quantity'} |
| `src/components/TransactionDetailSheet.jsx:192` | [NEVER-REVIEWED] | Other | ${tx.quantity} ${currentLang === 'am' ? 'ዕቃ' : 'pcs'} | value={`${tx.quantity} ${currentLang === 'am' ? 'ዕቃ' : 'pcs'}`} |
| `src/components/TransactionDetailSheet.jsx:201` | [NEVER-REVIEWED] | Other | የተመዘገበው | label={currentLang === 'am' ? 'የተመዘገበው' : 'Recorded by'} |
| `src/components/TransactionDetailSheet.jsx:217` | [NEEDS-FIX] | Other | ቀሪ ቀሪ | {currentLang === 'am' ? 'ቀሪ ቀሪ' : 'Balance After'} |
| `src/components/TransactionDetailSheet.jsx:246` | [NEVER-REVIEWED] | Other | ዕቃዎች | {items.length} {currentLang === 'am' ? 'ዕቃዎች' : 'items'} |
| `src/components/TransactionDetailSheet.jsx:289` | [NEVER-REVIEWED] | Other | የዕቃ ፎቶ | {currentLang === 'am' ? 'የዕቃ ፎቶ' : 'Photo proof'} |
| `src/components/TransactionDetailSheet.jsx:292` | [NEVER-REVIEWED] | Other | ፎቶ | {photoList.length} {currentLang === 'am' ? 'ፎቶ' : 'photo(s)'} |
| `src/components/TransactionDetailSheet.jsx:378` | [NEVER-REVIEWED] | Other | አስተካክል | {currentLang === 'am' ? 'አስተካክል' : 'Edit Transaction'} |
| `src/components/TransactionDetailSheet.jsx:395` | [VERIFIED] | Other | ሰርዝ | {currentLang === 'am' ? 'ሰርዝ' : 'Delete'} |
| `src/components/TransactionDetailSheet.jsx:422` | [NEVER-REVIEWED] | Other | ይህን ግብይት ሰርዝ? | {currentLang === 'am' ? 'ይህን ግብይት ሰርዝ?' : 'Delete this transaction?'} |
| `src/components/TransactionDetailSheet.jsx:427` | [NEVER-REVIEWED] | Other | ይህ ደንበኛ ${fmt(customerBalance)} ብር ዕዳ አለበት። ይህን ማስወገድ ቀሪ ሂሳባቸውን ይቀንሳል። | ? `ይህ ደንበኛ ${fmt(customerBalance)} ብር ዕዳ አለበት። ይህን ማስወገድ ቀሪ ሂሳባቸውን ይቀንሳል።` |
| `src/components/TransactionDetailSheet.jsx:428` | [NEVER-REVIEWED] | Other | ይህ ተግባር ሊቀለብት አይችልም። የደንበኛው ቀሪ ተጽዕኖ ያደርጋል። | : 'ይህ ተግባር ሊቀለብት አይችልም። የደንበኛው ቀሪ ተጽዕኖ ያደርጋል።') |
| `src/components/TransactionDetailSheet.jsx:448` | [NEVER-REVIEWED] | Other | አጥፋ | {currentLang === 'am' ? 'አጥፋ' : 'Delete Forever'} |
| `src/components/TransactionDetailSheet.jsx:462` | [NEVER-REVIEWED] | Other | አይስረዝም | {currentLang === 'am' ? 'አይስረዝም' : 'No, Keep It'} |
| `src/components/TransactionRow.jsx:71` | [NEVER-REVIEWED] | Other | ${settlement.settledCount} ተከፍሏል | ? `${settlement.settledCount} ተከፍሏል` |
| `src/constants/settings.js:2` | [VERIFIED] | Other | ዕለታዊ | export const FREQ_LABELS_AM = { daily: 'ዕለታዊ', weekly: 'ሳምንታዊ', monthly: 'ወርሃዊ' }; |
| `src/constants/settings.js:2` | [VERIFIED] | Other | ሳምንታዊ | export const FREQ_LABELS_AM = { daily: 'ዕለታዊ', weekly: 'ሳምንታዊ', monthly: 'ወርሃዊ' }; |
| `src/constants/settings.js:2` | [VERIFIED] | Other | ወርሃዊ | export const FREQ_LABELS_AM = { daily: 'ዕለታዊ', weekly: 'ሳምንታዊ', monthly: 'ወርሃዊ' }; |
| `src/hooks/useShopOps.js:72` | [NEVER-REVIEWED] | Other | የመቀላቀል ኮድ ለማመንጨት መለያ መግባት ያስፈልጋል። እባክዎ እንደገና ይግቡ። | ? 'የመቀላቀል ኮድ ለማመንጨት መለያ መግባት ያስፈልጋል። እባክዎ እንደገና ይግቡ።' |
| `src/hooks/useStaffOps.js:11` | [NEVER-REVIEWED] | Staff | መለያ ያስፈልጋል። እባክዎ ይግቡ ከዚያ ይሞክሩ። | const AUTH_ERROR_MSG_AM = 'መለያ ያስፈልጋል። እባክዎ ይግቡ ከዚያ ይሞክሩ።'; |
| `src/hooks/useTimeOfDay.js:25` | [NEVER-REVIEWED] | Other | እንደምን አመሸህ | greetingAm = 'እንደምን አመሸህ'; |
| `src/hooks/useTimeOfDay.js:29` | [NEVER-REVIEWED] | Other | እንደምን አደርክ | greetingAm = 'እንደምን አደርክ'; |
| `src/hooks/useTimeOfDay.js:33` | [NEVER-REVIEWED] | Other | እንደምን ዋልክ | greetingAm = 'እንደምን ዋልክ'; |
| `src/hooks/useTimeOfDay.js:37` | [NEVER-REVIEWED] | Other | እንደምን አመሸህ | greetingAm = 'እንደምን አመሸህ'; |
| `src/hooks/useTimeOfDay.js:41` | [NEVER-REVIEWED] | Other | እንደምን አመሸህ | greetingAm = 'እንደምን አመሸህ'; |
| `src/labels/onboarding.js:8` | [DRAFT-REVIEWED-PENDING] | Onboarding — labels | ስምዎን ያስገቡ | *  - namePlaceholder: the AM side is the INLINE literal ('ስምዎን ያስገቡ'); the |
| `src/labels/onboarding.js:11` | [VERIFIED] | Onboarding — labels | ለምሳሌ ትግስት | *    ('ለምሳሌ ትግስት') was dead in this slot; the now-unused dict key is |
| `src/labels/onboarding.js:44` | [DRAFT-REVIEWED-PENDING] | Onboarding — labels | በዚህ ስልክ ብቻ ተቀምጧል — ኢንተርኔት ሲገኝ ማገናኘት ይችላሉ | am: 'በዚህ ስልክ ብቻ ተቀምጧል — ኢንተርኔት ሲገኝ ማገናኘት ይችላሉ', |
| `src/labels/settings.js:28` | [DRAFT-REVIEWED-PENDING] | Settings — labels | ${done} ከ ${total} ተዋቅሯል | am: ({ done, total }) => `${done} ከ ${total} ተዋቅሯል`, |
| `src/labels/shared.js:4` | [VERIFIED] | Shared labels | ብር | * Extracted because TransactionForm uses 'ብር'/'birr' in 6 places and other |
| `src/labels/shared.js:10` | [VERIFIED] | Shared labels | ብር | * NOTE (zero term decisions): 'ብር' (AM) vs 'birr' (EN) inconsistency preserved |
| `src/labels/transactions.js:7` | [VERIFIED] | Transactions — labels | ብር | * the 'ብር'/'birr' inconsistency note (shared.currency.sign). |
| `src/stores/staffStore.js:40` | [NEVER-REVIEWED] | Staff | ቡድን ማስተዳደር ይችላል | can_manage_team: 'ቡድን ማስተዳደር ይችላል', |
| `src/stores/staffStore.js:41` | [NEVER-REVIEWED] | Staff | ሽያጭ መመዝገብ ይችላል | can_add_records: 'ሽያጭ መመዝገብ ይችላል', |
| `src/stores/staffStore.js:42` | [NEVER-REVIEWED] | Staff | መዝገቦችን መሰረዝ ይችላል | can_delete_records: 'መዝገቦችን መሰረዝ ይችላል', |
| `src/stores/staffStore.js:43` | [NEVER-REVIEWED] | Staff | ቅንብሮችን ማርትዕ ይችላል | can_edit_settings: 'ቅንብሮችን ማርትዕ ይችላል', |
| `src/stores/staffStore.js:44` | [NEVER-REVIEWED] | Staff | ሪፖርቶችን ማየት ይችላል | can_view_reports: 'ሪፖርቶችን ማየት ይችላል', |
| `src/stores/staffStore.js:251` | [NEVER-REVIEWED] | Staff | ✓ ሚና ወደ ${ROLE_BADGE[newRole]?.label \|\| newRole} ተቀይሯል | `✓ ሚና ወደ ${ROLE_BADGE[newRole]?.label \|\| newRole} ተቀይሯል`), |
| `src/utils/customerMetrics.js:469` | [NEVER-REVIEWED] | Utils & stores | በጣም ጥሩ | if (totalOwed === 0) return { grade: 'A', label: 'Excellent', labelAm: 'በጣም ጥሩ', color: '#16a34a' }; |
| `src/utils/customerMetrics.js:483` | [NEVER-REVIEWED] | Utils & stores | በጣም ጥሩ | if (score >= 85) return { grade: 'A', label: 'Excellent', labelAm: 'በጣም ጥሩ', color: '#16a34a' }; |
| `src/utils/customerMetrics.js:484` | [VERIFIED] | Utils & stores | ጥሩ | if (score >= 65) return { grade: 'B', label: 'Good', labelAm: 'ጥሩ', color: '#2563eb' }; |
| `src/utils/customerMetrics.js:485` | [NEVER-REVIEWED] | Utils & stores | መካከለኛ | if (score >= 40) return { grade: 'C', label: 'Fair', labelAm: 'መካከለኛ', color: '#d97706' }; |
| `src/utils/customerMetrics.js:486` | [NEVER-REVIEWED] | Utils & stores | እንከስ | return { grade: 'D', label: 'Poor', labelAm: 'እንከስ', color: '#dc2626' }; |
| `src/utils/customerMetrics.js:507` | [NEVER-REVIEWED] | Utils & stores | የክፍያ ሪፖርት | <title>${isAm ? 'የክፍያ ሪፖርት' : 'Credit Report'} - ${shop.name \|\| ''}</title> |
| `src/utils/customerMetrics.js:540` | [NEVER-REVIEWED] | Utils & stores | የተዘረዘረበት ቀን | <div class="report-date">${isAm ? 'የተዘረዘረበት ቀን' : 'Generated'}: ${ts}</div> |
| `src/utils/customerMetrics.js:546` | [NEVER-REVIEWED] | Utils & stores | የክፍያ ሪፖርት | <div class="title">${isAm ? 'የክፍያ ሪፖርት' : 'Credit Report'}</div> |
| `src/utils/customerMetrics.js:549` | [NEVER-REVIEWED] | Utils & stores | ጠቅላላ የተገዛ | <div class="label">${isAm ? 'ጠቅላላ የተገዛ' : 'Total Owed'}</div> |
| `src/utils/customerMetrics.js:553` | [NEVER-REVIEWED] | Utils & stores | የሚታገዝ | <div class="label">${isAm ? 'የሚታገዝ' : 'Collected'}</div> |
| `src/utils/customerMetrics.js:557` | [NEVER-REVIEWED] | Utils & stores | የጊዜ ተeming | <div class="label">${isAm ? 'የጊዜ ተeming' : 'On-Time Rate'}</div> |
| `src/utils/customerMetrics.js:561` | [NEVER-REVIEWED] | Utils & stores | የዘገወ ክፍያ | <div class="label">${isAm ? 'የዘገወ ክፍያ' : 'Overdue'}</div> |
| `src/utils/customerMetrics.js:566` | [NEVER-REVIEWED] | Utils & stores | የደንበኛ መረጃ | <div class="section-title">${isAm ? 'የደንበኛ መረጃ' : 'Customer Details'} (${customers.length})</div> |
| `src/utils/customerMetrics.js:569` | [VERIFIED] | Utils & stores | ስም | <th>${isAm ? 'ስም' : 'Name'}</th> |
| `src/utils/customerMetrics.js:570` | [NEVER-REVIEWED] | Utils & stores | የተገዛ | <th class="text-right">${isAm ? 'የተገዛ' : 'Outstanding'}</th> |
| `src/utils/customerMetrics.js:571` | [NEVER-REVIEWED] | Utils & stores | ጊዜ ተeming | <th class="text-right">${isAm ? 'ጊዜ ተeming' : 'On-Time'}</th> |
| `src/utils/customerMetrics.js:572` | [NEVER-REVIEWED] | Utils & stores | የዘገወ ቀን | <th class="text-right">${isAm ? 'የዘገወ ቀን' : 'Overdue Days'}</th> |
| `src/utils/customerMetrics.js:582` | [NEVER-REVIEWED] | Utils & stores | ምንም የክፍያ መረጃ የለም | </table>` : `<p style="text-align:center;color:#9ca3af;margin-top:24px;">${isAm ? 'ምንም የክፍያ መረጃ የለም' : 'No credit data'}</p>`} |
| `src/utils/customerMetrics.js:584` | [NEVER-REVIEWED] | Utils & stores | የንግድ ታሪክ | <div>Gebya - ${isAm ? 'የንግድ ታሪክ' : 'Business Notebook'}</div> |
| `src/utils/customerTelegram.js:101` | [NEVER-REVIEWED] | Utils & stores | via Gebya ገበያ | 'via Gebya ገበያ', |
| `src/utils/durationFormat.js:22` | [NEVER-REVIEWED] | Utils & stores | 1 ቀን | if (lang === 'am') return n === 1 ? '1 ቀን' : `${n} ቀናት`; |
| `src/utils/durationFormat.js:22` | [NEVER-REVIEWED] | Utils & stores | ${n} ቀናት | if (lang === 'am') return n === 1 ? '1 ቀን' : `${n} ቀናት`; |
| `src/utils/durationFormat.js:29` | [NEVER-REVIEWED] | Utils & stores | ከ1 ቀን በፊት | if (lang === 'am') return n === 1 ? 'ከ1 ቀን በፊት' : `ከ${n} ቀን በፊት`; |
| `src/utils/durationFormat.js:29` | [NEVER-REVIEWED] | Utils & stores | ከ${n} ቀን በፊት | if (lang === 'am') return n === 1 ? 'ከ1 ቀን በፊት' : `ከ${n} ቀን በፊት`; |
| `src/utils/durationFormat.js:36` | [NEVER-REVIEWED] | Utils & stores | ${n} ቀን ያለፈው | if (lang === 'am') return `${n} ቀን ያለፈው`; |
| `src/utils/ethiopianCalendar.js:4` | [NEVER-REVIEWED] | Utils & stores | መስከረም | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/utils/ethiopianCalendar.js:4` | [NEVER-REVIEWED] | Utils & stores | ጥቅምት | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/utils/ethiopianCalendar.js:4` | [NEVER-REVIEWED] | Utils & stores | ኅዳር | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/utils/ethiopianCalendar.js:4` | [NEVER-REVIEWED] | Utils & stores | ታህሳስ | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/utils/ethiopianCalendar.js:4` | [NEVER-REVIEWED] | Utils & stores | ጥር | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/utils/ethiopianCalendar.js:4` | [NEVER-REVIEWED] | Utils & stores | የካቲት | 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', |
| `src/utils/ethiopianCalendar.js:5` | [NEVER-REVIEWED] | Utils & stores | መጋቢት | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ' |
| `src/utils/ethiopianCalendar.js:5` | [NEVER-REVIEWED] | Utils & stores | ሚያዝያ | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ' |
| `src/utils/ethiopianCalendar.js:5` | [NEVER-REVIEWED] | Utils & stores | ግንቦት | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ' |
| `src/utils/ethiopianCalendar.js:5` | [NEVER-REVIEWED] | Utils & stores | ሰኔ | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ' |
| `src/utils/ethiopianCalendar.js:5` | [NEVER-REVIEWED] | Utils & stores | ሐምሌ | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ' |
| `src/utils/ethiopianCalendar.js:5` | [NEVER-REVIEWED] | Utils & stores | ነሐሴ | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ' |
| `src/utils/ethiopianCalendar.js:5` | [NEVER-REVIEWED] | Utils & stores | ጳጉሜ | 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ' |
| `src/utils/ethiopianCalendar.js:15` | [NEVER-REVIEWED] | Utils & stores | ጳጉሜ | const monthName = ETHIOPIAN_MONTHS[ethMonthIdx - 1] \|\| 'ጳጉሜ'; |
| `src/utils/ethiopianCalendar.js:25` | [NEVER-REVIEWED] | Utils & stores | ጠዋት | MORNING: 'ጠዋት',   // 6AM–11:59AM (Western) |
| `src/utils/ethiopianCalendar.js:26` | [VERIFIED] | Utils & stores | ቀን | DAY: 'ቀን',         // 12PM–5:59PM |
| `src/utils/ethiopianCalendar.js:27` | [NEVER-REVIEWED] | Utils & stores | ማታ | EVENING: 'ማታ',     // 6PM–11:59PM |
| `src/utils/ethiopianCalendar.js:28` | [NEVER-REVIEWED] | Utils & stores | ሌሊት | NIGHT: 'ሌሊት',     // 12AM–5:59AM |
| `src/utils/ethiopianCalendar.js:76` | [NEVER-REVIEWED] | Utils & stores | ዛሬ ${todayParts.day} | { label: `ዛሬ ${todayParts.day}`, value: today.getTime(), day: todayParts.day, display: formatEthiopianShort(today) }, |
| `src/utils/ethiopianCalendar.js:77` | [NEVER-REVIEWED] | Utils & stores | ነገ ${tomorrowParts.day} | { label: `ነገ ${tomorrowParts.day}`, value: tomorrow.getTime(), day: tomorrowParts.day, display: formatEthiopianShort(tomorrow) }, |
| `src/utils/ethiopianCalendar.js:78` | [NEVER-REVIEWED] | Utils & stores | ሳም ${nextWeekParts.day} | { label: `ሳም ${nextWeekParts.day}`, value: nextWeek.getTime(), day: nextWeekParts.day, display: formatEthiopianShort(nextWeek) }, |
| `src/utils/payPageLink.js:56` | [NEVER-REVIEWED] | Utils & stores | ሰላም! ለ${who} የካቶርን ክፈያ በዚህ ማገናኛ መክፈል ይችላሉ። የሚከፈል መጠን: ${amt} ብር። | return `ሰላም! ለ${who} የካቶርን ክፈያ በዚህ ማገናኛ መክፈል ይችላሉ። የሚከፈል መጠን: ${amt} ብር።`; |
| `src/utils/photoProof.js:65` | [NEVER-REVIEWED] | Utils & stores | ${count} ፎቶ${count === 1 ? '' : 'ዎች'} | if (lang === 'am') return `${count} ፎቶ${count === 1 ? '' : 'ዎች'}`; |
| `src/utils/reminderData.js:56` | [NEVER-REVIEWED] | Utils & stores | No activity yet today. Record your first sale! ዛሬውን ሽያጭ ይመዝግቡ። | body: "No activity yet today. Record your first sale! ዛሬውን ሽያጭ ይመዝግቡ።", |
| `src/utils/reminderData.js:72` | [NEVER-REVIEWED] | Utils & stores | Don't forget to record today's sales. ዛሬውን ሽያጭ ይመዝግቡ። | body: "Don't forget to record today's sales. ዛሬውን ሽያጭ ይመዝግቡ።", |
| `src/utils/reminders.js:18` | [NEVER-REVIEWED] | Utils & stores | ሰላም {name}፣ ለ{shop} {amount} ብር ዱቤ አለዎት። ሲቻልዎ ያስታውሱ። እናመሰግናለን። | am: 'ሰላም {name}፣ ለ{shop} {amount} ብር ዱቤ አለዎት። ሲቻልዎ ያስታውሱ። እናመሰግናለን።', |
| `src/utils/reminders.js:24` | [NEVER-REVIEWED] | Utils & stores | ሰላም {name}፣ ለ{shop} {amount} ብር ዱቤ ይከፍሉ። እባክዎ በቅርብ ይምጡ። | am: 'ሰላም {name}፣ ለ{shop} {amount} ብር ዱቤ ይከፍሉ። እባክዎ በቅርብ ይምጡ።', |
| `src/utils/reminders.js:30` | [NEVER-REVIEWED] | Utils & stores | ሰላም {name}፣ የ{amount} ብር ዱቤ ለ{shop} አልተከፈለም። እባክዎ ዛሬ ያስተናግዱ። | am: 'ሰላም {name}፣ የ{amount} ብር ዱቤ ለ{shop} አልተከፈለም። እባክዎ ዛሬ ያስተናግዱ።', |
| `src/utils/shopStory.js:143` | [NEVER-REVIEWED] | Reports & story | የሚጠበቅ: ${fmt(cashExpected)} ETB | ? `የሚጠበቅ: ${fmt(cashExpected)} ETB` |
| `src/utils/shopStory.js:169` | [NEVER-REVIEWED] | Reports & story | ${overdueCount} ደንበኛ ይሄዳቸዋል | ? `${overdueCount} ደንበኛ ይሄዳቸዋል` |
| `src/utils/shopStory.js:172` | [NEVER-REVIEWED] | Reports & story | ጠቅላላ: ${fmt(overdueAmount)} ETB | ? `ጠቅላላ: ${fmt(overdueAmount)} ETB` |
| `src/utils/shopStory.js:186` | [NEVER-REVIEWED] | Reports & story | በአጠቃላይ ${avgSalesCount} ሽያጭ ይሆናል · ${salesCount} ብቻ | ? `በአጠቃላይ ${avgSalesCount} ሽያጭ ይሆናል · ${salesCount} ብቻ` |
| `src/utils/shopStory.js:200` | [NEVER-REVIEWED] | Reports & story | በአጠቃላይ ${fmt(avgExpenses)} ETB · ዛሬ ${fmt(expenses)} ETB | ? `በአጠቃላይ ${fmt(avgExpenses)} ETB · ዛሬ ${fmt(expenses)} ETB` |
| `src/utils/shopStory.js:233` | [NEVER-REVIEWED] | Reports & story | ${fmt(cur)} ETB ሽያጭ — ከቀዳሚ ጊዜ ጋር ለማነጻጸር አዲስ ነው | ? `${fmt(cur)} ETB ሽያጭ — ከቀዳሚ ጊዜ ጋር ለማነጻጸር አዲስ ነው` |
| `src/utils/shopStory.js:243` | [NEVER-REVIEWED] | Reports & story | ${fmt(cur)} ETB — ከቀዳሚ ጊዜ ${pct}% ጨምሯል 📈 | ? `${fmt(cur)} ETB — ከቀዳሚ ጊዜ ${pct}% ጨምሯል 📈` |
| `src/utils/shopStory.js:251` | [NEVER-REVIEWED] | Reports & story | ${fmt(cur)} ETB — ከቀዳሚ ጊዜ ${Math.abs(pct)}% ቀንሷል 📉 | ? `${fmt(cur)} ETB — ከቀዳሚ ጊዜ ${Math.abs(pct)}% ቀንሷል 📉` |
| `src/utils/shopStory.js:258` | [NEVER-REVIEWED] | Reports & story | ${fmt(cur)} ETB — ከቀዳሚ ጊዜ ጋር ተመሳሳይ ነው | ? `${fmt(cur)} ETB — ከቀዳሚ ጊዜ ጋር ተመሳሳይ ነው` |
| `src/utils/shopStory.js:284` | [NEVER-REVIEWED] | Reports & story | አንድ ቀሪ ሥራ፦ ገንዘብህን ቆጥር | ? 'አንድ ቀሪ ሥራ፦ ገንዘብህን ቆጥር' |
| `src/utils/shopStory.js:293` | [NEVER-REVIEWED] | Reports & story | ዛሬ የሱቅህ ቀን አሁንም አልተዘጋም | ? 'ዛሬ የሱቅህ ቀን አሁንም አልተዘጋም' |
| `src/utils/shopStory.js:302` | [NEVER-REVIEWED] | Reports & story | ገንዘብ አይዛመድም፦ ልዩነቱ ${fmt(Math.abs(cashVariance))} ETB | ? `ገንዘብ አይዛመድም፦ ልዩነቱ ${fmt(Math.abs(cashVariance))} ETB` |
| `src/utils/shopStory.js:311` | [NEVER-REVIEWED] | Reports & story | ${unconfirmedStaff.length} ሰራተኛ ገንዘብ አላስረከበም | ? `${unconfirmedStaff.length} ሰራተኛ ገንዘብ አላስረከበም` |
| `src/utils/shopStory.js:320` | [NEVER-REVIEWED] | Reports & story | ${overdueCount} ደንበኛ ዕዳ አለባቸው | ? `${overdueCount} ደንበኛ ዕዳ አለባቸው` |
| `src/utils/shopStory.js:329` | [NEVER-REVIEWED] | Reports & story | ዛሬ ገና ምንም ሽያጭ የለም | ? 'ዛሬ ገና ምንም ሽያጭ የለም' |
| `src/utils/shopStory.js:337` | [NEVER-REVIEWED] | Reports & story | ሁሉም ደህና ነው፦ ${salesCount} ሽያጮች፣ ${fmt(cashExpected)} ETB ጥሬ ገንዘብ | ? `ሁሉም ደህና ነው፦ ${salesCount} ሽያጮች፣ ${fmt(cashExpected)} ETB ጥሬ ገንዘብ` |
| `src/utils/shopStory.js:367` | [NEVER-REVIEWED] | Reports & story | ዛሬ ምንም ሽያጭ አልተከናወነም | parts.push('ዛሬ ምንም ሽያጭ አልተከናወነም'); |
| `src/utils/shopStory.js:369` | [NEVER-REVIEWED] | Reports & story | ዛሬ ${salesCount} ሽያጮች ተመዝግበዋል፣ ${fmt(totalSold)} ETB | parts.push(`ዛሬ ${salesCount} ሽያጮች ተመዝግበዋል፣ ${fmt(totalSold)} ETB`); |
| `src/utils/shopStory.js:371` | [NEVER-REVIEWED] | Reports & story | ዛሬ ${salesCount} ሽያጮች፣ ${fmt(totalSold)} ETB | parts.push(`ዛሬ ${salesCount} ሽያጮች፣ ${fmt(totalSold)} ETB`); |
| `src/utils/shopStory.js:375` | [NEVER-REVIEWED] | Reports & story | ፣ | const names = staffSummary.staff.map(s => s.name).join('፣ '); |
| `src/utils/shopStory.js:376` | [NEVER-REVIEWED] | Reports & story | ${names} ሸጠዋል | parts.push(`${names} ሸጠዋል`); |
| `src/utils/shopStory.js:380` | [NEVER-REVIEWED] | Reports & story | ${fmt(creditCollected)} ETB ዕዳ ተሰብስቧል | parts.push(`${fmt(creditCollected)} ETB ዕዳ ተሰብስቧል`); |
| `src/utils/shopStory.js:384` | [NEVER-REVIEWED] | Reports & story | ገንዘብ በትክክል ተጣጥሟል | parts.push('ገንዘብ በትክክል ተጣጥሟል'); |
| `src/utils/shopStory.js:386` | [NEVER-REVIEWED] | Reports & story | ገንዘብ አልተጣጣመም፦ ልዩነቱ ${fmt(Math.abs(cashVariance))} ETB | parts.push(`ገንዘብ አልተጣጣመም፦ ልዩነቱ ${fmt(Math.abs(cashVariance))} ETB`); |
| `src/utils/shopStory.js:390` | [NEVER-REVIEWED] | Reports & story | ${fmt(metrics.spentToday \|\| 0)} ETB ወጪ ተደርጓል | parts.push(`${fmt(metrics.spentToday \|\| 0)} ETB ወጪ ተደርጓል`); |
| `src/utils/shopStory.js:393` | [NEVER-REVIEWED] | Reports & story | ። | return parts.join('። ') + '።'; |
| `src/utils/shopStory.js:393` | [NEVER-REVIEWED] | Reports & story | ። | return parts.join('። ') + '።'; |
| `src/utils/shopStory.js:457` | [NEVER-REVIEWED] | Reports & story | ሽያጭ ከትናንት ${pct}% ጨምሯል | ? `ሽያጭ ከትናንት ${pct}% ጨምሯል` |
| `src/utils/shopStory.js:464` | [NEVER-REVIEWED] | Reports & story | ሽያጭ ከትናንት ${Math.abs(pct)}% ቀንሷል | ? `ሽያጭ ከትናንት ${Math.abs(pct)}% ቀንሷል` |
| `src/utils/shopStory.js:471` | [NEVER-REVIEWED] | Reports & story | ሽያጭ ከትናንት ጋር ሲነጻጸር የተረጋጋ ነው | ? `ሽያጭ ከትናንት ጋር ሲነጻጸር የተረጋጋ ነው` |
| `src/utils/shopStory.js:490` | [NEVER-REVIEWED] | Reports & story | ${topName} በብዛት ተሽጧል፦ ${fmt(topAmount)} ETB | ? `${topName} በብዛት ተሽጧል፦ ${fmt(topAmount)} ETB` |
| `src/utils/shopStory.js:501` | [NEVER-REVIEWED] | Reports & story | ${top.name} ${top.sold} ETB ሸጠዋል — ከፍተኛ ሻጭ | ? `${top.name} ${top.sold} ETB ሸጠዋል — ከፍተኛ ሻጭ` |
| `src/utils/shopStory.js:511` | [NEVER-REVIEWED] | Reports & story | ${fmt(creditCollected)} ETB ዕዳ ሰብስበሃል | ? `${fmt(creditCollected)} ETB ዕዳ ሰብስበሃል` |
| `src/utils/shopStory.js:518` | [NEVER-REVIEWED] | Reports & story | ${overdueCount} ደንበኛ ዕዳ አለባቸው — ማስታወስ ያስፈልጋል | ? `${overdueCount} ደንበኛ ዕዳ አለባቸው — ማስታወስ ያስፈልጋል` |
| `src/utils/shopStory.js:528` | [NEVER-REVIEWED] | Reports & story | ዛሬ ምንም ልዩ ነገር አልተስተዋለም | ? 'ዛሬ ምንም ልዩ ነገር አልተስተዋለም' |
| `src/utils/useAutoBackup.js:105` | [NEVER-REVIEWED] | Utils & stores | ✓ በሂሳብ ቤት መደቃቀፋ ተሳክቷል | ? '✓ በሂሳብ ቤት መደቃቀፋ ተሳክቷል' |

### 5.2 Paired inline strings

| Anchor | Status | Shape | Screen | English | Amharic |
| --- | --- | --- | --- | --- | --- |
| `src/components/ActivityPanel.jsx:56` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Loading activity... | በመጫን ላይ... |
| `src/components/ActivityPanel.jsx:65` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Could not load activity | ስህተት |
| `src/components/ActivityPanel.jsx:76` | [NEVER-REVIEWED] | `inline-ternary` | Customers | No admin actions yet | ምንም እርምጃ የለም |
| `src/components/ActivityPanel.jsx:79` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Team actions across all shops will appear here. | የቡድን እርምጃዎች እዚህ ይታያሉ። |
| `src/components/ActivityPanel.jsx:88` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Team activity (admin shop logs) | የቡድን እርምጃ (አድሚን ሾፕ ሎግ) |
| `src/components/AddProviderButton.jsx:102` | [NEVER-REVIEWED] | `inline-ternary` | Other | Add payment method | መክፈያ ዘዴ ጨምር |
| `src/components/AddProviderButton.jsx:142` | [VERIFIED] | `inline-ternary` | Other | Bank | ባንክ |
| `src/components/AddProviderButton.jsx:156` | [VERIFIED] | `inline-ternary` | Other | Wallet | ዋሌት |
| `src/components/AddProviderButton.jsx:166` | [NEVER-REVIEWED] | `inline-ternary` | Other | e.g. Zemen Bank | ስም ያስገቡ... |
| `src/components/AddProviderButton.jsx:223` | [NEVER-REVIEWED] | `inline-ternary` | Other | Add | ጨምር |
| `src/components/AdminDashboard.jsx:93` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Couldn’t load | ስህተት |
| `src/components/AdminDashboard.jsx:96` | [VERIFIED] | `inline-ternary` | Admin | Retry | እንደገና ሞክር |
| `src/components/AdminDashboard.jsx:193` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Updated ${relTime(lastUpdated, nowTick)} | የተዘመነው ${relTime(lastUpdated, nowTick)} |
| `src/components/AdminDashboard.jsx:194` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Refresh | አዘምን |
| `src/components/AdminDashboard.jsx:200` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Platform Numbers | አጠቃላይ |
| `src/components/AdminDashboard.jsx:236` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Shop Health Table | የሱቅ ጤና |
| `src/components/AdminDashboard.jsx:251` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Search shops... | መፈላገት ሱቅ... |
| `src/components/AdminDashboard.jsx:272` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Open | ክፈት |
| `src/components/AdminDashboard.jsx:278` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No shops found | ምንም ሱቅ አልተገኘም |
| `src/components/AdminDashboard.jsx:289` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Load more | ተጨማሪ ጫን |
| `src/components/AdminDashboard.jsx:296` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Feature Adoption | ባህሪያት |
| `src/components/AdminDashboard.jsx:311` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Friction Summary | ጥርጣሬዎች |
| `src/components/AdminPortal.jsx:48` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Platform admin · shops · frictions · comms | የመሣሪያ ስርዓት አስተዳደር |
| `src/components/AdminPortal.jsx:53` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Open app | ወደ መተግበሪያው |
| `src/components/AdminPortal.jsx:113` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Google sign-in not configured | የ Google መግቢያ አይተዋወቅም |
| `src/components/AdminPortal.jsx:126` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Sign in with Google | በ Google ይግቡ |
| `src/components/AdminPortal.jsx:170` | [NEVER-REVIEWED] | `inline-ternary` | Admin | or | ወይም |
| `src/components/AdminPortal.jsx:177` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Admin access required | የአስተዳደሪ መዳረሻ የለም |
| `src/components/AdminShopDetail.jsx:175` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Loading shop details... | ሱፍ በመ ይሄዳል... |
| `src/components/AdminShopDetail.jsx:190` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Back to Dashboard | ወደ ድርጅት ውብህ |
| `src/components/AdminShopDetail.jsx:195` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Actions | ሥሮች |
| `src/components/AdminShopDetail.jsx:195` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Activity | እንቅስቃሴ |
| `src/components/AdminShopDetail.jsx:195` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Comms | መገናኛ |
| `src/components/AdminShopDetail.jsx:195` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Details | ዝርዝር |
| `src/components/AdminShopDetail.jsx:195` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Tickets | ድጋፍ |
| `src/components/AdminShopDetail.jsx:208` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Shop | ሱቅ |
| `src/components/AdminShopDetail.jsx:210` | [NEVER-REVIEWED] | `inline-ternary` | Admin | new | አዲስ |
| `src/components/AdminShopDetail.jsx:214` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No Telegram | ቴሌግራም አይደለም |
| `src/components/AdminShopDetail.jsx:214` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Telegram linked | ቴሌግራም ተዣረ |
| `src/components/AdminShopDetail.jsx:223` | [VERIFIED] | `inline-ternary` | Admin | Sales | ሽያጭ |
| `src/components/AdminShopDetail.jsx:224` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Expenses | በሬደር |
| `src/components/AdminShopDetail.jsx:225` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Credit Outstanding | የበለራ ብዬት |
| `src/components/AdminShopDetail.jsx:226` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Transactions | ሁኔታ የሆነ |
| `src/components/AdminShopDetail.jsx:227` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Customers | ደንበሮች |
| `src/components/AdminShopDetail.jsx:228` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Staff | ሰራተኞች |
| `src/components/AdminShopDetail.jsx:242` | [NEVER-REVIEWED] | `inline-ternary` | Admin | ${st.overdueCustomers} customers overdue — ${fmt(st.totalOverdueExposure)} ETB exposure | ${st.overdueCustomers} የቆየ ደንበር ይሁዳል ${fmt(st.totalOverdueExposure)} ብር |
| `src/components/AdminShopDetail.jsx:254` | [NEVER-REVIEWED] | `inline-ternary` | Admin | PAYMENT BEHAVIOR | የክፍያ ባህሪ |
| `src/components/AdminShopDetail.jsx:275` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Avg pay: ${formatDays(c.avg_pay_days, 'en')} | አማካይ ክፍያ: ${formatDays(c.avg_pay_days, 'am')} |
| `src/components/AdminShopDetail.jsx:276` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Nothing settled yet | ገና አልተከፈለም |
| `src/components/AdminShopDetail.jsx:282` | [NEVER-REVIEWED] | `inline-ternary` | Admin | on time | በወቅቱ |
| `src/components/AdminShopDetail.jsx:302` | [NEVER-REVIEWED] | `inline-ternary` | Admin | TEAM MEMBERS | ቡድን ዳታ |
| `src/components/AdminShopDetail.jsx:321` | [NEVER-REVIEWED] | `inline-ternary` | Admin | BANK AGREEMENTS | ቦክር ዝሃመ |
| `src/components/AdminShopDetail.jsx:330` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No | አይደለም |
| `src/components/AdminShopDetail.jsx:330` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Sales: | ስales: |
| `src/components/AdminShopDetail.jsx:330` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Yes | አዎን |
| `src/components/AdminShopDetail.jsx:331` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Credit: | ቪያስ: |
| `src/components/AdminShopDetail.jsx:331` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No | አይደለም |
| `src/components/AdminShopDetail.jsx:331` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Yes | አዎን |
| `src/components/AdminShopDetail.jsx:348` | [NEVER-REVIEWED] | `inline-ternary` | Admin | SEND TARGETED MESSAGE | መልዥ መላስ |
| `src/components/AdminShopDetail.jsx:354` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Title | ርዕስ |
| `src/components/AdminShopDetail.jsx:360` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Message body | መልእክት መረጃ |
| `src/components/AdminShopDetail.jsx:371` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Sent to ${msgResult.sent}/${msgResult.total} shop | ተላክ {msgResult.sent}/${msgResult.total} ሱቍን |
| `src/components/AdminShopDetail.jsx:372` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Failed: ${msgResult.error} | አልተሳከም: ${msgResult.error} |
| `src/components/AdminShopDetail.jsx:384` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Send to This Shop | ላውድድር መላክ |
| `src/components/AdminShopDetail.jsx:393` | [NEVER-REVIEWED] | `inline-ternary` | Admin | ACTIVITY LOG | የእንቅስቃሴ መዝለያ |
| `src/components/AdminShopDetail.jsx:398` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Loading... | በመጫን ላይ... |
| `src/components/AdminShopDetail.jsx:403` | [NEVER-REVIEWED] | `inline-ternary` | Admin | ${violations.length} blocked attempts | የተከለከሉ ሙከራዎች: ${violations.length} |
| `src/components/AdminShopDetail.jsx:404` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Permission probes detected but blocked by local policy. | የፍተና ሙከራዎች ተገኝተዋል ነገር ግን ተከልክለዋል |
| `src/components/AdminShopDetail.jsx:408` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No activity recorded | ምንም እንቅስቃሴ የለም |
| `src/components/AdminShopDetail.jsx:429` | [NEVER-REVIEWED] | `inline-ternary` | Admin | THIS SHOP’S SUPPORT | የዚህ ሱቅ ድጋፍ |
| `src/components/AdminShopDetail.jsx:442` | [NEVER-REVIEWED] | `inline-ternary` | Admin | COMMUNICATION HEALTH | የመገናኛ ጤና |
| `src/components/AdminShopDetail.jsx:445` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Disabled | ዝጋውነት |
| `src/components/AdminShopDetail.jsx:445` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Enabled | ይሰራል |
| `src/components/AdminShopDetail.jsx:445` | [NEVER-REVIEWED] | `inline-ternary` | Admin | SMS (Ethio Telecom) | SMS (Ethio Telecom) |
| `src/components/AdminShopDetail.jsx:445` | [NEVER-REVIEWED] | `inline-ternary` | Admin | used | የተጠቀመ |
| `src/components/AdminShopDetail.jsx:446` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Linked | ተያይዟል |
| `src/components/AdminShopDetail.jsx:446` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Not linked | አይያይዝም |
| `src/components/AdminShopDetail.jsx:446` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Owner Telegram | የባለቤት ቴሌግራም |
| `src/components/AdminShopDetail.jsx:447` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Customer Telegram | የሰራተኛ ቴሌግራም |
| `src/components/AdminShopDetail.jsx:448` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Reminder delivery failures | የማስታወቂያ አልተሳካም |
| `src/components/AdminShopDetail.jsx:449` | [NEVER-REVIEWED] | `inline-ternary` | Admin | SMS & Telegram reminders are sent to this shop’s customers. | SMS እና ቴሌግራም ማስታወሻዎች ለዚህ ሱቅ ይላካሉ። |
| `src/components/AdminShopDetail.jsx:457` | [NEVER-REVIEWED] | `inline-ternary` | Admin | ADMIN ACTIONS | የአስተዳዳሪ ሥራዎች |
| `src/components/AdminShopDetail.jsx:462` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Reset SMS quota | የSMS ኛዎታ ዳግም ጀምር |
| `src/components/AdminShopDetail.jsx:463` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Resets this shop’s monthly SMS usage to zero. | የወር የSMS ኛዎታ ወደ ዜሮ ይመለሳል። |
| `src/components/AdminShopDetail.jsx:465` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Reset quota | ኛዎታ ዳግም ጀምር |
| `src/components/AdminShopDetail.jsx:472` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Reach owner | ወደ ባለቤት ማስታወቂያ |
| `src/components/AdminShopDetail.jsx:473` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Sends via linked Telegram, SMS fallback, or returns a manual link. | በተያያዘ ቴሌግራም፣ ወይም SMS ወይም በእጅጉ ማጋሪያ ሊላክ ይችላል። |
| `src/components/AdminShopDetail.jsx:474` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Optional message (leave blank for default) | አማራጭ መልእክት (ባዶ ልቀ) |
| `src/components/AdminShopDetail.jsx:476` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Send to owner | ላባለቤት ላክ |
| `src/components/AdminShopDetail.jsx:480` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Channel: ${nudgeResult.channel} · ${nudgeResult.status} | ቻናል: ${nudgeResult.channel} · ${nudgeResult.status} |
| `src/components/AdminShopDetail.jsx:489` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Resend failed reminders | የእላቂ ማስታወሻዎችን እንደገና ላክ |
| `src/components/AdminShopDetail.jsx:490` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Re-sends Telegram/SMS to this shop’s customers whose last reminder failed. | ለዚህ ሱቅ የተከለከሉ የመልእክት ማስታወሻዎችን እንደገና ይላካል። |
| `src/components/AdminShopDetail.jsx:492` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Resend failed | እንደገና ላክ |
| `src/components/AdminShopDetail.jsx:497` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Scanned: ${resendResult.scanned} · Sent: ${resendResult.sent} · Failed: ${resendResult.failed} | ተራው: ${resendResult.scanned} · ተላከ: ${resendResult.sent} · አልተሳካም: ${resendResult.failed} |
| `src/components/AdminShopDetail.jsx:505` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Admin notes | የአስተዳዳሪ ማስታወሻዎች |
| `src/components/AdminShopDetail.jsx:506` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Write a private note... | ማስታወሻ ይጻፉ... |
| `src/components/AdminShopDetail.jsx:508` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Add note | ማስታወሻ ጨምር |
| `src/components/AdminShopDetail.jsx:518` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No notes yet | ምንም ማስታወሻ የለም |
| `src/components/AdminShopDetail.jsx:524` | [NEVER-REVIEWED] | `inline-ternary` | Admin | OUTREACH LOG | የክኢያ መዝለያ |
| `src/components/AdminShopDetail.jsx:533` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No outreach yet | ምንም ክኢያ የለም |
| `src/components/analytics/SimpleAnalytics.jsx:111` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Loading... | በመጫን ላይ... |
| `src/components/analytics/SimpleAnalytics.jsx:123` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | No analytics data available | ምንም መረጃ የለም |
| `src/components/analytics/SimpleAnalytics.jsx:144` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Usage Analytics | የአጠቃቀም ትንተና |
| `src/components/analytics/SimpleAnalytics.jsx:153` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Sessions | ክፍለ ጊዜዎች |
| `src/components/analytics/SimpleAnalytics.jsx:158` | [VERIFIED] | `inline-ternary` | Reports & story | Today | ዛሬ |
| `src/components/analytics/SimpleAnalytics.jsx:162` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Last 7 Days | ባለፉት 7 ቀናት |
| `src/components/analytics/SimpleAnalytics.jsx:166` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Last 30 Days | ባለፉት 30 ቀናት |
| `src/components/analytics/SimpleAnalytics.jsx:175` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Transactions | ግብይቶች |
| `src/components/analytics/SimpleAnalytics.jsx:180` | [VERIFIED] | `inline-ternary` | Reports & story | Today | ዛሬ |
| `src/components/analytics/SimpleAnalytics.jsx:184` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Last 7 Days | ባለፉት 7 ቀናት |
| `src/components/analytics/SimpleAnalytics.jsx:193` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Voice Usage | የድምጽ አጠቃቀም |
| `src/components/analytics/SimpleAnalytics.jsx:200` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | of | ከ |
| `src/components/analytics/SimpleAnalytics.jsx:200` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | transactions | ግብይቶች |
| `src/components/analytics/SimpleAnalytics.jsx:210` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | All Events | ሁሉም ክስተቶች |
| `src/components/AppBottomNav.jsx:5` | [NEVER-REVIEWED] | `locale-object` | App shell | Today | የዛሬ |
| `src/components/AppBottomNav.jsx:6` | [VERIFIED] | `locale-object` | App shell | Credit | ዱቤ |
| `src/components/AppBottomNav.jsx:7` | [VERIFIED] | `locale-object` | App shell | Report | ሪፖርት |
| `src/components/AppBottomNav.jsx:8` | [NEVER-REVIEWED] | `locale-object` | App shell | Staff | ሰራተኞች |
| `src/components/AppBottomNav.jsx:9` | [VERIFIED] | `locale-object` | App shell | More | ተጨማሪ |
| `src/components/AppHeader.jsx:141` | [NEVER-REVIEWED] | `inline-ternary` | App shell | Notifications | ማስጠንቂቾች |
| `src/components/AppShell.jsx:1164` | [VERIFIED] | `inline-ternary` | Other | Entry deleted | ተሰርዟል |
| `src/components/AppShell.jsx:1172` | [NEVER-REVIEWED] | `inline-ternary` | Other | Restored ✓ | ተመልሷል ✓ |
| `src/components/AppShell.jsx:1446` | [NEVER-REVIEWED] | `inline-ternary` | Other | All reminders sent | ሁሉም ማሳሰቢያዎች ተልከዋል |
| `src/components/AskNotebookFAB.jsx:10` | [NEVER-REVIEWED] | `inline-ternary` | Other | Ask my notebook | ማስታወሻ ደብተርዎን ይጠይቁ |
| `src/components/AskNotebookFAB.jsx:49` | [NEVER-REVIEWED] | `inline-ternary` | Other | Ask | ጠይቅ |
| `src/components/AuthGate.jsx:127` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Please sign in first, then enter the code | በመጀመሪያ ይግቡ ከዚያ ኮዱን ይጠቀሙ |
| `src/components/BankDataSharing.jsx:9` | [NEVER-REVIEWED] | `data-row` | Other | Commercial Bank of Ethiopia | የኢትዮጵያ ንግድ ባንክ |
| `src/components/BankDataSharing.jsx:10` | [NEVER-REVIEWED] | `data-row` | Other | Dashen Bank | ዳሸን ባንክ |
| `src/components/BankDataSharing.jsx:11` | [NEVER-REVIEWED] | `data-row` | Other | Awash Bank | አዋሽ ባንክ |
| `src/components/BankDataSharing.jsx:12` | [NEVER-REVIEWED] | `data-row` | Other | Wegagen Bank | ወጋገን ባንክ |
| `src/components/BankDataSharing.jsx:13` | [NEVER-REVIEWED] | `data-row` | Other | National Bank of Ethiopia (NBE) | የኢትዮጵያ ብሔራዊ ባንክ |
| `src/components/BankDataSharing.jsx:59` | [NEVER-REVIEWED] | `inline-ternary` | Other | Revoke access for this bank? | ይህን ባንክ ይቀሩ? |
| `src/components/BankDataSharing.jsx:69` | [NEVER-REVIEWED] | `inline-ternary` | Other | Bank Data Sharing | የባንክ ውሂብ ማጋራት |
| `src/components/BankDataSharing.jsx:76` | [NEVER-REVIEWED] | `inline-ternary` | Other | Grant Access | ባንክ ያክሉ |
| `src/components/BankDataSharing.jsx:77` | [NEVER-REVIEWED] | `inline-ternary` | Other | Revoke | ይቀሩ |
| `src/components/BankDataSharing.jsx:78` | [VERIFIED] | `inline-ternary` | Other | Active | ንቁ |
| `src/components/BankDataSharing.jsx:79` | [NEVER-REVIEWED] | `inline-ternary` | Other | Select a bank | ባንክ ይምረጡ |
| `src/components/BankDataSharing.jsx:80` | [NEVER-REVIEWED] | `inline-ternary` | Other | What to share | የማጋራት ምርጫዎች |
| `src/components/BankDataSharing.jsx:81` | [NEVER-REVIEWED] | `inline-ternary` | Other | Sales data | የሽያጭ መረጃ |
| `src/components/BankDataSharing.jsx:82` | [NEVER-REVIEWED] | `inline-ternary` | Other | Credit (dubie) data | የዱቤ መረጃ |
| `src/components/BankDataSharing.jsx:83` | [NEVER-REVIEWED] | `inline-ternary` | Other | Customer info (name, phone) | የደንበኛ መረጃ (ስም፣ ስልክ) |
| `src/components/BankDataSharing.jsx:84` | [NEVER-REVIEWED] | `inline-ternary` | Other | ⚠️ Includes PII — opt-in only | ⚠️ ስም እና ስልክ ብቻ |
| `src/components/BankDataSharing.jsx:85` | [NEVER-REVIEWED] | `inline-ternary` | Other | Confirm | ያረጋግጡ |
| `src/components/BankDataSharing.jsx:86` | [VERIFIED] | `inline-ternary` | Other | Cancel | ሰርዝ |
| `src/components/BusinessSelector.jsx:68` | [NEVER-REVIEWED] | `t-helper` | Other | Switch shop | ሱቅ ቀይር |
| `src/components/CameraCapture.jsx:133` | [NEVER-REVIEWED] | `inline-ternary` | Other | Take a photo | ፎቶ ያንሱ |
| `src/components/CameraCapture.jsx:138` | [VERIFIED] | `inline-ternary` | Other | Close | ዝጋ |
| `src/components/CameraCapture.jsx:161` | [NEVER-REVIEWED] | `inline-ternary` | Other | Opening camera… | ካሜራ እየተከፈተ… |
| `src/components/CameraCapture.jsx:170` | [NEVER-REVIEWED] | `inline-ternary` | Other | Camera permission denied | የካሜራ ፍቃድ አልተሰጠም |
| `src/components/CameraCapture.jsx:171` | [NEVER-REVIEWED] | `inline-ternary` | Other | Camera unavailable | ካሜራ መክፈት አልተቻለም |
| `src/components/CameraCapture.jsx:188` | [NEVER-REVIEWED] | `inline-ternary` | Other | Choose from gallery | ከማከማቻ ይምረጡ |
| `src/components/CameraCapture.jsx:207` | [NEVER-REVIEWED] | `inline-ternary` | Other | Gallery | ጋለሪ |
| `src/components/CameraCapture.jsx:218` | [NEVER-REVIEWED] | `inline-ternary` | Other | Capture | ፎቶ አንሳ |
| `src/components/CameraCapture.jsx:236` | [NEVER-REVIEWED] | `inline-ternary` | Other | Flip camera | ካሜራ ቀይር |
| `src/components/ConfirmDialog.jsx:53` | [VERIFIED] | `inline-ternary` | Other | Cancel | ሰርዝ |
| `src/components/ConfirmDialog.jsx:60` | [NEVER-REVIEWED] | `inline-ternary` | Other | Confirm | አረጋግጥ |
| `src/components/CreditTab.jsx:55` | [NEVER-REVIEWED] | `inline-ternary` | Other | ${skipped} overdue — no contact info to remind | ${skipped} የዘገዩ ደንበኞች አሏቸው ግን ስልክ ወይም ቴሌግራም የላቸውም |
| `src/components/CreditTab.jsx:56` | [NEVER-REVIEWED] | `inline-ternary` | Other | No overdue customers | ምንም የዘገዩ ደንበኞች የሉም |
| `src/components/CustomerDetail.jsx:294` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Back · Customers | ተመለስ · ደንበኞች |
| `src/components/CustomerDetail.jsx:317` | [VERIFIED] | `inline-ternary` | Customers | SETTLED | ተከፍሏል |
| `src/components/CustomerDetail.jsx:328` | [NEVER-REVIEWED] | `inline-ternary` | Customers | PROMISE | ተስፋ |
| `src/components/CustomerDetail.jsx:397` | [NEVER-REVIEWED] | `inline-ternary` | Customers | No phone or Telegram | ስልክ ወይም ቴሌግራም የለም |
| `src/components/CustomerDetail.jsx:409` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Edit customer | አስተካክል |
| `src/components/CustomerDetail.jsx:472` | [VERIFIED] | `inline-ternary` | Customers | birr | ብር |
| `src/components/CustomerDetail.jsx:480` | [VERIFIED] | `inline-ternary` | Customers | Settled | ተከፍሏል |
| `src/components/CustomerDetail.jsx:483` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Due | የሚከፍለው |
| `src/components/CustomerDetail.jsx:512` | [VERIFIED] | `inline-ternary` | Customers | Settled | ተከፍሏል |
| `src/components/CustomerDetail.jsx:513` | [NEVER-REVIEWED] | `inline-ternary` | Customers | You are owed | ለእኔ ይከፍላሉ |
| `src/components/CustomerDetail.jsx:526` | [VERIFIED] | `inline-ternary` | Customers | birr | ብር |
| `src/components/CustomerDetail.jsx:538` | [VERIFIED] | `inline-ternary` | Customers | Paid | ተከፍሏል |
| `src/components/CustomerDetail.jsx:553` | [VERIFIED] | `inline-ternary` | Customers | Settled | ተከፍሏል |
| `src/components/CustomerDetail.jsx:554` | [NEVER-REVIEWED] | `inline-ternary` | Customers | You are owed | ለእኔ ይከፍላሉ |
| `src/components/CustomerDetail.jsx:566` | [VERIFIED] | `inline-ternary` | Customers | birr | ብር |
| `src/components/CustomerDetail.jsx:576` | [NEVER-REVIEWED] | `inline-ternary` | Customers | entries | መዝገብ |
| `src/components/CustomerDetail.jsx:582` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Avg pay | አማካይ ክፍያ |
| `src/components/CustomerDetail.jsx:598` | [VERIFIED] | `inline-ternary` | Customers | Balance Fully Paid | ሙሉ ተከፍሏል |
| `src/components/CustomerDetail.jsx:640` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Mark Fully Paid | ሙሉ ይከፍሉ |
| `src/components/CustomerDetail.jsx:665` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Promise | ቃል የተገባ |
| `src/components/CustomerDetail.jsx:687` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Call | ለመደወል |
| `src/components/CustomerDetail.jsx:720` | [NEVER-REVIEWED] | `inline-ternary` | Customers | More actions | ተጨማሪ እርምጃዎች |
| `src/components/CustomerDetail.jsx:736` | [VERIFIED] | `inline-ternary` | Customers | More | ተጨማሪ |
| `src/components/CustomerDetail.jsx:757` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Missed promise — due ${formatEthiopian(promiseDateVal)} | የጠበቀው ቀን አልፏል — ${formatEthiopian(promiseDateVal)} |
| `src/components/CustomerDetail.jsx:759` | [VERIFIED] | `inline-ternary` | Customers | Promised to pay today | ዛሬ ይከፍላል ብሏል |
| `src/components/CustomerDetail.jsx:760` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Promised to pay by ${formatEthiopian(promiseDateVal)} | እስከ ${formatEthiopian(promiseDateVal)} ይከፍላል ብሏል |
| `src/components/CustomerDetail.jsx:763` | [VERIFIED] | `inline-ternary` | Customers | Clear | አስወግድ |
| `src/components/CustomerDetail.jsx:795` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Timeline | ታሪክ |
| `src/components/CustomerDetail.jsx:796` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Promises | ቃል የተገባ |
| `src/components/CustomerDetail.jsx:797` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Notes | ማስታወሻዎች |
| `src/components/CustomerDetail.jsx:839` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Follow-up | ተከታተል |
| `src/components/CustomerDetail.jsx:867` | [VERIFIED] | `inline-ternary` | Customers | Promised to pay today | ዛሬ ይከፍላል ብሏል |
| `src/components/CustomerDetail.jsx:886` | [VERIFIED] | `inline-ternary` | Customers | Clear | አስወግድ |
| `src/components/CustomerDetail.jsx:899` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Record a Promise | ቃል የተገባ ይመዝግቡ |
| `src/components/CustomerDetail.jsx:915` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Record Promise to Pay | ቃል የተገባ ይመዝግቡ |
| `src/components/CustomerDetail.jsx:938` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Amount (optional) | መጠን (ምርጫ) |
| `src/components/CustomerDetail.jsx:1014` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Past Promises | ያለፉ ቃል የተገባ |
| `src/components/CustomerDetail.jsx:1021` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Promise | ቃል የተገባ |
| `src/components/CustomerDetail.jsx:1025` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Cleared | ተሰረዘ |
| `src/components/CustomerDetail.jsx:1025` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Missed | ተጠራቀመ |
| `src/components/CustomerDetail.jsx:1025` | [VERIFIED] | `inline-ternary` | Customers | Paid | ተከፍሏል |
| `src/components/CustomerDetail.jsx:1044` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Timeline | መዝገብ |
| `src/components/CustomerDetail.jsx:1056` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Tap row to edit | ለማስተካከል ይንኩ |
| `src/components/CustomerDetail.jsx:1072` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Search items... | እቃ ይፈልጉ... |
| `src/components/CustomerDetail.jsx:1091` | [VERIFIED] | `inline-ternary` | Customers | All | ሁሉም |
| `src/components/CustomerDetail.jsx:1092` | [VERIFIED] | `inline-ternary` | Customers | Credits | ዱቤ |
| `src/components/CustomerDetail.jsx:1093` | [VERIFIED] | `inline-ternary` | Customers | Payments | ክፍያ |
| `src/components/CustomerDetail.jsx:1120` | [VERIFIED] | `inline-ternary` | Customers | Filter | ማጣሪያ |
| `src/components/CustomerDetail.jsx:1125` | [NEVER-REVIEWED] | `inline-ternary` | Customers | All time | ሁሉም ጊዜ |
| `src/components/CustomerDetail.jsx:1125` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Last 30 days | የመጨረሻ 30 ቀናት |
| `src/components/CustomerDetail.jsx:1125` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Last 90 days | የመጨረሻ 90 ቀናት |
| `src/components/CustomerDetail.jsx:1125` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Last year | የመጨረሻ አመት |
| `src/components/CustomerDetail.jsx:1152` | [NEVER-REVIEWED] | `inline-ternary` | Customers | No entries found | ምንም ውጤት አልተገኘም |
| `src/components/CustomerDetail.jsx:1169` | [VERIFIED] | `inline-ternary` | Customers | Credit | ዱቤ |
| `src/components/CustomerDetail.jsx:1169` | [VERIFIED] | `inline-ternary` | Customers | Payment | ክፍያ |
| `src/components/CustomerDetail.jsx:1171` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Credit given | ዱቤ ተሰጥቷል |
| `src/components/CustomerDetail.jsx:1171` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Payment received | ክፍል ተቀባይቷል |
| `src/components/CustomerDetail.jsx:1179` | [NEVER-REVIEWED] | `inline-ternary` | Customers | entries | መዝገብ |
| `src/components/CustomerDetail.jsx:1212` | [NEVER-REVIEWED] | `inline-ternary` | Customers | No notes yet | ምንም ማስታወሻ የለም |
| `src/components/CustomerDetail.jsx:1236` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Edit | አስተካክል |
| `src/components/CustomerDetail.jsx:1237` | [VERIFIED] | `inline-ternary` | Customers | Delete | ሰርዝ |
| `src/components/CustomerDetail.jsx:1249` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Write a note... | ማስታወሻ ይጻፉ... |
| `src/components/CustomerDetail.jsx:1258` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Add note | ጨምር |
| `src/components/CustomerDetail.jsx:1336` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Archive | አርክስ |
| `src/components/CustomerDetail.jsx:1357` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Restore | መልስ |
| `src/components/CustomerDetail.jsx:1358` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Archive | አርክስ |
| `src/components/CustomerDetail.jsx:1450` | [NEVER-REVIEWED] | `inline-ternary` | Customers | More actions | ተጨማሪ እርምጃዎች |
| `src/components/CustomerDetail.jsx:1455` | [VERIFIED] | `inline-ternary` | Customers | Close | ዝጋ |
| `src/components/CustomerDetail.jsx:1486` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Transfer credit | ዱቤ አስተላልፍ |
| `src/components/CustomerDetail.jsx:1511` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Telegram | ቴሌግራም |
| `src/components/CustomerDetail.jsx:1512` | [VERIFIED] | `inline-ternary` | Customers | Connect Telegram | ቴሌግራም አገናኝ |
| `src/components/CustomerDetail.jsx:1535` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Send Reminder | አስታወስ |
| `src/components/CustomerDetail.jsx:1558` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Edit customer | ደንበኛ አስተካክል |
| `src/components/CustomerDetail.jsx:1582` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Restore customer | ደንበኛ መልስ |
| `src/components/CustomerDetail.jsx:1583` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Archive customer | ደንበኛ አርክስ |
| `src/components/CustomerDetail.jsx:1611` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Balance Settled! | ሙሉ በሙሉ ተከፍሏል! |
| `src/components/CustomerForm.jsx:105` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Edit customer | ደንበኛ አስተካክል |
| `src/components/CustomerForm.jsx:106` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Add customer | ደንበኛ አክል |
| `src/components/CustomerForm.jsx:170` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Photo added | ፎቶ ተጨምሯል |
| `src/components/CustomerForm.jsx:188` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Replace | ቀይር |
| `src/components/CustomerForm.jsx:203` | [VERIFIED] | `inline-ternary` | Customers | Remove | አስወግድ |
| `src/components/CustomerForm.jsx:210` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Photo (optional) | ፎቶ (አማራጭ) |
| `src/components/CustomerForm.jsx:213` | [NEVER-REVIEWED] | `inline-ternary` | Customers | recognize them faster at the counter | በቆጣሪው ላይ ለማወቅ ይረዳዎታል |
| `src/components/CustomerForm.jsx:228` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Add Photo | ፎቶ ይምረጡ |
| `src/components/CustomerForm.jsx:235` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Compressing… | ፎቶ እያዘጋጀ… |
| `src/components/CustomerForm.jsx:252` | [VERIFIED] | `inline-ternary` | Customers | Name | ስም |
| `src/components/CustomerForm.jsx:258` | [VERIFIED] | `inline-ternary` | Customers | e.g. Tigist | ለምሳሌ ትግስት |
| `src/components/CustomerForm.jsx:272` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Phone | ስልክ |
| `src/components/CustomerForm.jsx:274` | [NEVER-REVIEWED] | `inline-ternary` | Customers | for reminders | ለማስታወሻ |
| `src/components/CustomerForm.jsx:338` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Telegram | ቴሌግራም |
| `src/components/CustomerForm.jsx:340` | [NEVER-REVIEWED] | `inline-ternary` | Customers | optional | አማራጭ |
| `src/components/CustomerForm.jsx:365` | [VERIFIED] | `inline-ternary` | Customers | Note | ማስታወሻ |
| `src/components/CustomerForm.jsx:367` | [NEVER-REVIEWED] | `inline-ternary` | Customers | optional | አማራጭ |
| `src/components/CustomerForm.jsx:398` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Update | አስተካክል |
| `src/components/CustomerReminderHistory.jsx:14` | [NEVER-REVIEWED] | `locale-object` | Other | Sent | ተልኳል |
| `src/components/CustomerReminderHistory.jsx:15` | [NEVER-REVIEWED] | `locale-object` | Other | Queued | በመጠባበቅ |
| `src/components/CustomerReminderHistory.jsx:16` | [NEVER-REVIEWED] | `locale-object` | Other | Failed | አልተሳካም |
| `src/components/CustomerReminderHistory.jsx:17` | [NEVER-REVIEWED] | `locale-object` | Other | Skipped | ተሻረ |
| `src/components/CustomerReminderHistory.jsx:33` | [VERIFIED] | `inline-ternary` | Other | today | ዛሬ |
| `src/components/CustomerReminderHistory.jsx:58` | [NEVER-REVIEWED] | `inline-ternary` | Other | Failed to load reminder history | ማስታወሻ ታሪክ መጫን አልተቻለም |
| `src/components/CustomerReminderHistory.jsx:79` | [NEVER-REVIEWED] | `inline-ternary` | Other | No reminders sent | ምንም ማስታወሻ አልተላከም |
| `src/components/CustomerReminderHistory.jsx:107` | [NEVER-REVIEWED] | `inline-ternary` | Other | Reminder history | የማስታወሻ ታሪክ |
| `src/components/CustomerReminderHistory.jsx:158` | [NEVER-REVIEWED] | `inline-ternary` | Other | Error: | ስህተት፦ |
| `src/components/CustomerReminderHistory.jsx:163` | [VERIFIED] | `inline-ternary` | Other | Retry | እንደገና ሞክር |
| `src/components/CustomerReminderHistory.jsx:171` | [NEVER-REVIEWED] | `inline-ternary` | Other | No reminder history | ምንም ማስታወሻ ታሪክ የለም |
| `src/components/CustomerReminderHistory.jsx:198` | [NEVER-REVIEWED] | `inline-ternary` | Other | Error: | ስህተት፦ |
| `src/components/CustomerReminderHistory.jsx:238` | [NEVER-REVIEWED] | `inline-ternary` | Other | Send reminder | ማስታወሻ ላክ |
| `src/components/CustomerTelegramConnectSheet.jsx:108` | [NEVER-REVIEWED] | `inline-ternary` | Other | Telegram connected | ቴሌግራም ተገናኝቷል |
| `src/components/CustomerTelegramConnectSheet.jsx:147` | [NEVER-REVIEWED] | `inline-ternary` | Other | Could not copy | መቅዳት አልተሳካም |
| `src/components/CustomerTelegramConnectSheet.jsx:166` | [NEVER-REVIEWED] | `inline-ternary` | Other | Could not generate code | ኮድ ማመንጨት አልተሳካም |
| `src/components/CustomerTelegramConnectSheet.jsx:188` | [VERIFIED] | `inline-ternary` | Other | Close | ዝጋ |
| `src/components/CustomerTelegramConnectSheet.jsx:196` | [NEVER-REVIEWED] | `inline-ternary` | Other | Customer | ደንበኛ |
| `src/components/CustomerTelegramConnectSheet.jsx:204` | [NEVER-REVIEWED] | `inline-ternary` | Other | No link token for this customer | መረጃ የለም |
| `src/components/CustomerTelegramConnectSheet.jsx:221` | [NEVER-REVIEWED] | `inline-ternary` | Other | Code expires in 15 minutes | ኮዱ በ15 ደቂቃ ውስጥ ያበቃል |
| `src/components/CustomerTelegramConnectSheet.jsx:229` | [NEVER-REVIEWED] | `inline-ternary` | Other | Generate new code | ሌላ ኮድ |
| `src/components/CustomerTelegramConnectSheet.jsx:239` | [NEVER-REVIEWED] | `inline-ternary` | Other | Use QR instead | ወደ QR ተመለስ |
| `src/components/CustomerTelegramConnectSheet.jsx:260` | [NEVER-REVIEWED] | `inline-ternary` | Other | Linking... | በራስ ይታያል... |
| `src/components/CustomerTelegramConnectSheet.jsx:262` | [NEVER-REVIEWED] | `inline-ternary` | Other | ✓ Linked | ✓ ተገናኝቷል |
| `src/components/CustomerTelegramConnectSheet.jsx:263` | [NEVER-REVIEWED] | `inline-ternary` | Other | Open in Telegram | ቴሌግራም ይክፈቱ |
| `src/components/CustomerTelegramConnectSheet.jsx:273` | [NEVER-REVIEWED] | `inline-ternary` | Other | Copied! | ተቀድቷል! |
| `src/components/CustomerTelegramConnectSheet.jsx:274` | [NEVER-REVIEWED] | `inline-ternary` | Other | Copy link | አገናኝ ቅዳ |
| `src/components/CustomerTelegramConnectSheet.jsx:283` | [NEVER-REVIEWED] | `inline-ternary` | Other | 🔢 Use a code instead | 🎲 በኮድ አገናኝ |
| `src/components/CustomerTransactionSheet.jsx:194` | [NEVER-REVIEWED] | `inline-ternary` | Customers | − Payment | − ክፍያ |
| `src/components/CustomerTransactionSheet.jsx:195` | [NEVER-REVIEWED] | `inline-ternary` | Customers | + Credit | + ዱቤ |
| `src/components/CustomerTransactionSheet.jsx:197` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Update | አስተካክል |
| `src/components/CustomerTransactionSheet.jsx:199` | [VERIFIED] | `inline-ternary` | Customers | Save Payment | ክፍያ አስቀምጥ |
| `src/components/CustomerTransactionSheet.jsx:200` | [VERIFIED] | `inline-ternary` | Customers | Save Credit | ዱቤ አስቀምጥ |
| `src/components/CustomerTransactionSheet.jsx:309` | [VERIFIED] | `inline-ternary` | Customers | Back | ተመለስ |
| `src/components/CustomerTransactionSheet.jsx:410` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Payment Method | የክፍያ ዘዴ |
| `src/components/CustomerTransactionSheet.jsx:514` | [NEVER-REVIEWED] | `inline-ternary` | Customers | photos | ፎቶዎች |
| `src/components/CustomerTransactionSheet.jsx:565` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Quick items: | ፈጣን ዕቃዎች: |
| `src/components/CustomerTransactionSheet.jsx:600` | [NEVER-REVIEWED] | `inline-ternary` | Customers | 🧺 ${validLineItems.length} items | 🧺 ${validLineItems.length} ዕቃዎች |
| `src/components/CustomerTransactionSheet.jsx:601` | [NEVER-REVIEWED] | `inline-ternary` | Customers | 🧺 Break down into items | 🧺 ብዙ ዕቃዎች ይከፋፍሉ |
| `src/components/CustomerTransactionSheet.jsx:613` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Tap saved item to add | ለማከል ይጫኑ |
| `src/components/CustomerTransactionSheet.jsx:651` | [NEVER-REVIEWED] | `inline-ternary` | Customers | item ${idx + 1} | ዕቃ ${idx + 1} |
| `src/components/CustomerTransactionSheet.jsx:669` | [VERIFIED] | `inline-ternary` | Customers | Remove | አስወግድ |
| `src/components/CustomerTransactionSheet.jsx:692` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Add first item | የመጀመሪያ ዕቃ ጨምር |
| `src/components/CustomerTransactionSheet.jsx:693` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Add another item | ሌላ ዕቃ ጨምር |
| `src/components/CustomerTransactionSheet.jsx:700` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Items total | የዕቃዎች ድምር |
| `src/components/CustomerTransactionSheet.jsx:701` | [VERIFIED] | `inline-ternary` | Customers | birr | ብር |
| `src/components/CustomerTransactionSheet.jsx:714` | [VERIFIED] | `inline-ternary` | Customers | Items exceed | በላይ |
| `src/components/CustomerTransactionSheet.jsx:714` | [VERIFIED] | `inline-ternary` | Customers | Unaccounted | ቀሪ |
| `src/components/CustomerTransactionSheet.jsx:729` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Use items sum as total | መጠን ከድምር ጋር ይሞላ |
| `src/components/CustomerTransactionSheet.jsx:776` | [VERIFIED] | `inline-ternary` | Customers | Pick | ምረጥ |
| `src/components/CustomerTransactionSheet.jsx:827` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Overpayment | የጨረ ክፍያ |
| `src/components/CustomerTransactionSheet.jsx:847` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Payment amount | የክፍያ መጠን |
| `src/components/CustomerTransactionSheet.jsx:855` | [NEVER-REVIEWED] | `inline-ternary` | Customers | Current balance | የተከፈለ ድምር |
| `src/components/CustomerTransactionSheet.jsx:863` | [VERIFIED] | `inline-ternary` | Customers | Excess | ትርፍ |
| `src/components/CustomerTransactionSheet.jsx:878` | [VERIFIED] | `inline-ternary` | Customers | Cancel | ሰርዝ |
| `src/components/CustomerTransactionSheet.jsx:886` | [VERIFIED] | `inline-ternary` | Customers | Continue | ቀጥል |
| `src/components/DeleteConfirmDialog.jsx:20` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/EditTransactionSheet.jsx:436` | [NEVER-REVIEWED] | `inline-ternary` | Other | photos | ፎቶዎች |
| `src/components/EditTransactionSheet.jsx:521` | [NEVER-REVIEWED] | `inline-ternary` | Other | DISCOUNT APPLIED | ቅናሽ ተደርጓል |
| `src/components/EditTransactionSheet.jsx:623` | [VERIFIED] | `inline-ternary` | Other | Partial payment | ከፊል ክፍያ |
| `src/components/EditTransactionSheet.jsx:627` | [VERIFIED] | `inline-ternary` | Other | Remaining Dubie | ቀሪ ዱቤ |
| `src/components/EditTransactionSheet.jsx:634` | [VERIFIED] | `inline-ternary` | Other | Amount received | የተቀበሉት መጠን |
| `src/components/EditTransactionSheet.jsx:653` | [NEVER-REVIEWED] | `inline-ternary` | Other | Received is the full amount — this is not a partial. | ሙሉ ክፍያ ነው — ከፊል አይደለም |
| `src/components/EditTransactionSheet.jsx:658` | [NEVER-REVIEWED] | `inline-ternary` | Other | cash | ጥሬ |
| `src/components/EditTransactionSheet.jsx:658` | [VERIFIED] | `inline-ternary` | Other | ETB | ብር |
| `src/components/EditTransactionSheet.jsx:658` | [VERIFIED] | `inline-ternary` | Other | via | በ |
| `src/components/EditTransactionSheet.jsx:665` | [NEVER-REVIEWED] | `inline-ternary` | Other | Received via | የተቀበሉት ክፍያ ዘዴ |
| `src/components/HandoverStatus.jsx:63` | [NEVER-REVIEWED] | `t-helper` | Other | Waiting | ተጠብቋል |
| `src/components/HandoverStatus.jsx:64` | [NEVER-REVIEWED] | `t-helper` | Other | Submitted | አሳልፏል |
| `src/components/HandoverStatus.jsx:65` | [NEVER-REVIEWED] | `t-helper` | Other | Disputed | ክርክር |
| `src/components/HandoverStatus.jsx:66` | [NEVER-REVIEWED] | `t-helper` | Other | Confirmed | ተረጋግጧል |
| `src/components/HeroStatus.jsx:24` | [NEVER-REVIEWED] | `inline-ternary` | Other | ✅ Close this day | ✅ ዝጋ |
| `src/components/HistoryView.jsx:334` | [VERIFIED] | `inline-ternary` | Other | View transaction photo | የግብይት ፎቶ ይመልከቱ |
| `src/components/HistoryView.jsx:385` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/HistoryView.jsx:395` | [VERIFIED] | `inline-ternary` | Other | Excess | በላይ |
| `src/components/HistoryView.jsx:395` | [VERIFIED] | `inline-ternary` | Other | Unaccounted | ቀሪ |
| `src/components/HistoryView.jsx:396` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/HistoryView.jsx:440` | [NEVER-REVIEWED] | `inline-ternary` | Other | current | አሁን |
| `src/components/HistoryView.jsx:496` | [NEVER-REVIEWED] | `inline-ternary` | Other | Load more months | ተጨማሪ ወራት አሳይ |
| `src/components/HistoryView.jsx:620` | [NEVER-REVIEWED] | `inline-ternary` | Other | Load more weeks | ተጨማሪ ሳምንታት አሳይ |
| `src/components/InlineDatePicker.jsx:205` | [NEVER-REVIEWED] | `inline-ternary` | Other | Pick a date | የቀን ምረጫ |
| `src/components/InlineDatePicker.jsx:248` | [VERIFIED] | `inline-ternary` | Other | Today | ዛሬ |
| `src/components/InlineDatePicker.jsx:258` | [NEVER-REVIEWED] | `inline-ternary` | Other | Tomorrow | ነገ |
| `src/components/InlineDatePicker.jsx:281` | [NEVER-REVIEWED] | `inline-ternary` | Other | Previous month | ያለፈ ወር |
| `src/components/InlineDatePicker.jsx:297` | [NEVER-REVIEWED] | `inline-ternary` | Other | Next month | ቀጣይ ወር |
| `src/components/InlineDatePicker.jsx:372` | [VERIFIED] | `inline-ternary` | Other | Cancel | ተው |
| `src/components/InlineDatePicker.jsx:381` | [NEVER-REVIEWED] | `inline-ternary` | Other | Confirm | አረጋግጥ |
| `src/components/InlineDatePicker.jsx:444` | [VERIFIED] | `inline-ternary` | Other | Today | ዛሬ |
| `src/components/JoinPage.jsx:253` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Sorry | ይቅርታ |
| `src/components/JoinPage.jsx:257` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Go to Gebya | ወደ ጌባያ ይሂዱ |
| `src/components/JoinPage.jsx:276` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Cashier | ካሸር |
| `src/components/JoinPage.jsx:276` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Viewer | ተመልካች |
| `src/components/MembersPanel.jsx:41` | [NEVER-REVIEWED] | `inline-ternary` | Other | Member added ✓ | ተጨምሯል ✓ |
| `src/components/MembersPanel.jsx:42` | [NEVER-REVIEWED] | `inline-ternary` | Other | Already on the list | አስቀድሞ አለ |
| `src/components/MembersPanel.jsx:48` | [NEVER-REVIEWED] | `inline-ternary` | Other | Error: | ስህተት፡ |
| `src/components/MembersPanel.jsx:55` | [NEVER-REVIEWED] | `inline-ternary` | Other | Remove ${ph} from platform admins? | ${ph} ይወገድ? |
| `src/components/MembersPanel.jsx:68` | [NEVER-REVIEWED] | `inline-ternary` | Other | Add team member | አዲስ አባል ጨምር |
| `src/components/MembersPanel.jsx:71` | [NEVER-REVIEWED] | `inline-ternary` | Other | Ethiopian mobile 09... / +2519... OR email (Google sign-in) | የኢትዮጵያ ስልክ ቁጥር (09... ወይም +2519...) ወይም ኢሜይል |
| `src/components/MembersPanel.jsx:92` | [VERIFIED] | `inline-ternary` | Other | Note (optional) | ማስታወሻ (አማራጭ) |
| `src/components/MembersPanel.jsx:102` | [NEVER-REVIEWED] | `inline-ternary` | Other | Add member | ጨምር |
| `src/components/MembersPanel.jsx:114` | [NEVER-REVIEWED] | `inline-ternary` | Other | Team members | የቡድን አባላት |
| `src/components/MembersPanel.jsx:123` | [NEVER-REVIEWED] | `inline-ternary` | Other | No members yet | አባላት የሉም ገና |
| `src/components/MembersPanel.jsx:132` | [NEVER-REVIEWED] | `inline-ternary` | Other | added | ተጨምራል |
| `src/components/MembersPanel.jsx:140` | [VERIFIED] | `inline-ternary` | Other | Remove | አስወግድ |
| `src/components/MoneyFlowBar.jsx:27` | [NEVER-REVIEWED] | `inline-ternary` | Other | Cash | ጥሬ |
| `src/components/MoneyFlowBar.jsx:28` | [NEVER-REVIEWED] | `inline-ternary` | Other | Digital | ዲጂታል |
| `src/components/MoneyFlowBar.jsx:29` | [VERIFIED] | `inline-ternary` | Other | Owed | ዱቤ |
| `src/components/NotificationPanel.jsx:22` | [NEVER-REVIEWED] | `inline-ternary` | Other | Just now | አሁን |
| `src/components/NotificationPanel.jsx:23` | [NEVER-REVIEWED] | `inline-ternary` | Other | ${mins}m ago | ከ ${mins} ደቂቃ በፊት |
| `src/components/NotificationPanel.jsx:25` | [NEVER-REVIEWED] | `inline-ternary` | Other | ${hours}h ago | ከ ${hours} ሰዓት በፊት |
| `src/components/NotificationPanel.jsx:27` | [NEVER-REVIEWED] | `inline-ternary` | Other | ${days}d ago | ከ ${days} ቀን በፊት |
| `src/components/NotificationPanel.jsx:171` | [VERIFIED] | `inline-ternary` | Other | Today | ዛሬ |
| `src/components/NotificationPanel.jsx:173` | [NEVER-REVIEWED] | `inline-ternary` | Other | Yesterday | ከትናንት |
| `src/components/NotificationPanel.jsx:201` | [NEVER-REVIEWED] | `inline-ternary` | Other | Notifications | ማስጠንቂቾች |
| `src/components/NotificationPanel.jsx:205` | [NEVER-REVIEWED] | `inline-ternary` | Other | unread | አዲስ |
| `src/components/NotificationPanel.jsx:216` | [NEVER-REVIEWED] | `inline-ternary` | Other | Mark all read | ሁሉንም አንብብ |
| `src/components/NotificationPanel.jsx:221` | [VERIFIED] | `inline-ternary` | Other | Close | ዝጋ |
| `src/components/NotificationPanel.jsx:236` | [NEVER-REVIEWED] | `inline-ternary` | Other | Get instant alerts | የተሳሰሩ ማስጠንቂቾችን ያግኙ |
| `src/components/NotificationPanel.jsx:249` | [NEVER-REVIEWED] | `inline-ternary` | Other | Enable | አብራ |
| `src/components/NotificationPanel.jsx:256` | [NEVER-REVIEWED] | `inline-ternary` | Other | No thanks | አይፈልግም |
| `src/components/NotificationPanel.jsx:273` | [NEVER-REVIEWED] | `inline-ternary` | Other | No notifications yet | ማስጠንቂቾች የሉዎትም |
| `src/components/NotificationPanel.jsx:324` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/OfflineStatusStrip.jsx:24` | [NEVER-REVIEWED] | `inline-ternary` | App shell | Syncing… | በማመሳሰል ላይ… |
| `src/components/OfflineStatusStrip.jsx:27` | [NEVER-REVIEWED] | `inline-ternary` | App shell | Pending sync | ወደ ደመና እየጠበቀ |
| `src/components/OfflineStatusStrip.jsx:28` | [NEVER-REVIEWED] | `inline-ternary` | App shell | record | ሪከርድ |
| `src/components/OfflineStatusStrip.jsx:31` | [NEVER-REVIEWED] | `inline-ternary` | App shell | Sync failed | ማመሳሰል አልተሳካም |
| `src/components/OfflineStatusStrip.jsx:33` | [NEVER-REVIEWED] | `inline-ternary` | App shell | Error: | ስህተት: |
| `src/components/OfflineStatusStrip.jsx:37` | [VERIFIED] | `inline-ternary` | App shell | Offline | ኔትወርክ የለም |
| `src/components/OfflineStatusStrip.jsx:38` | [VERIFIED] | `inline-ternary` | App shell | saves on this phone | በዚህ ስልክ ይቀመጣል |
| `src/components/OfflineStatusStrip.jsx:41` | [VERIFIED] | `inline-ternary` | App shell | Telegram waiting | ቴሌግራም ይጠብቃል |
| `src/components/OfflineStatusStrip.jsx:57` | [VERIFIED] | `inline-ternary` | App shell | Retry | እንደገና |
| `src/components/OfflineStatusStrip.jsx:63` | [VERIFIED] | `inline-ternary` | App shell | Update ready | አዲስ ስሪት ዝግጁ ነው |
| `src/components/OfflineStatusStrip.jsx:64` | [VERIFIED] | `inline-ternary` | App shell | tap to refresh | ለማደስ ይጫኑ |
| `src/components/OfflineStatusStrip.jsx:72` | [VERIFIED] | `inline-ternary` | App shell | Update | አድስ |
| `src/components/OfflineStatusStrip.jsx:77` | [VERIFIED] | `inline-ternary` | App shell | Offline ready | ከመስመር ውጭ ዝግጁ |
| `src/components/OfflineStatusStrip.jsx:78` | [VERIFIED] | `inline-ternary` | App shell | works without internet | ያለ ኢንተርኔት ይሰራል |
| `src/components/OfflineStatusStrip.jsx:100` | [VERIFIED] | `inline-ternary` | App shell | Sync conflict | ሁከት ተፈጠረ |
| `src/components/OwnerActivityDashboard.jsx:12` | [NEVER-REVIEWED] | `locale-object` | Admin | Recorded | ተመዝግቧል |
| `src/components/OwnerActivityDashboard.jsx:13` | [NEVER-REVIEWED] | `locale-object` | Admin | Updated | ተሻሽሏል |
| `src/components/OwnerActivityDashboard.jsx:14` | [NEVER-REVIEWED] | `locale-object` | Admin | Deleted | ጥሷል |
| `src/components/OwnerActivityDashboard.jsx:15` | [NEVER-REVIEWED] | `locale-object` | Admin | Blocked attempt | የጣሰ ሙከራ |
| `src/components/OwnerActivityDashboard.jsx:27` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Yesterday | ትላንትና |
| `src/components/OwnerActivityDashboard.jsx:35` | [VERIFIED] | `inline-ternary` | Admin | Today | ዛሬ |
| `src/components/OwnerActivityDashboard.jsx:37` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Yesterday | ትላንትና |
| `src/components/OwnerActivityDashboard.jsx:63` | [NEVER-REVIEWED] | `inline-ternary` | Admin | sale/expense | ሽያጭ/ወጪ |
| `src/components/OwnerActivityDashboard.jsx:64` | [NEVER-REVIEWED] | `inline-ternary` | Admin | customer | ደንበኛ |
| `src/components/OwnerActivityDashboard.jsx:65` | [NEVER-REVIEWED] | `inline-ternary` | Admin | customer ledger | የደንበኛ ሂሳብ |
| `src/components/OwnerActivityDashboard.jsx:66` | [NEVER-REVIEWED] | `inline-ternary` | Admin | supplier | አቅራቢ |
| `src/components/OwnerActivityDashboard.jsx:67` | [NEVER-REVIEWED] | `inline-ternary` | Admin | supplier ledger | የአቅራቢ ሂሳብ |
| `src/components/OwnerActivityDashboard.jsx:68` | [NEVER-REVIEWED] | `inline-ternary` | Admin | staff | ሰራተኛ |
| `src/components/OwnerActivityDashboard.jsx:89` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Conflicts | የሁከት ሪኮርዶች |
| `src/components/OwnerActivityDashboard.jsx:101` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Dismiss | አጽዳ |
| `src/components/OwnerActivityDashboard.jsx:116` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Latest version kept. Staff changes were merged automatically. | የላቀ ስሪት ተቀብሏል። |
| `src/components/OwnerActivityDashboard.jsx:236` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Today's activity | የዛሬ ሪኮርዶች |
| `src/components/OwnerActivityDashboard.jsx:242` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No activity recorded yet today | ምንም እንቅስቃሴ አልተመዘገበም |
| `src/components/OwnerActivityDashboard.jsx:256` | [VERIFIED] | `inline-ternary` | Admin | birr | ብር |
| `src/components/OwnerActivityDashboard.jsx:256` | [NEVER-REVIEWED] | `inline-ternary` | Admin | records | ሪኮርዶች |
| `src/components/OwnerActivityDashboard.jsx:269` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Performance Metrics | የአፈፃፀሚ ሪኮርዶች |
| `src/components/OwnerActivityDashboard.jsx:272` | [VERIFIED] | `inline-ternary` | Admin | ETB | ብር |
| `src/components/OwnerActivityDashboard.jsx:272` | [VERIFIED] | `inline-ternary` | Admin | Total | ጠቅላላ |
| `src/components/OwnerActivityDashboard.jsx:277` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No performance data yet | ምንም እንቅስቃሴ አልተመዘገበም |
| `src/components/OwnerActivityDashboard.jsx:290` | [NEVER-REVIEWED] | `inline-ternary` | Admin | credits | ብር ክፍያ |
| `src/components/OwnerActivityDashboard.jsx:290` | [VERIFIED] | `inline-ternary` | Admin | payments | ክፍያ |
| `src/components/OwnerActivityDashboard.jsx:290` | [VERIFIED] | `inline-ternary` | Admin | sales | ሽያጭ |
| `src/components/OwnerActivityDashboard.jsx:296` | [VERIFIED] | `inline-ternary` | Admin | ETB | ብር |
| `src/components/OwnerActivityDashboard.jsx:318` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Blocked Actions | የታገዱ ሙከራዎች |
| `src/components/OwnerActivityDashboard.jsx:330` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No blocked actions | ምንም የታገደ ሙከራ የለም |
| `src/components/OwnerActivityDashboard.jsx:341` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Device | ዘዴ |
| `src/components/OwnerActivityDashboard.jsx:341` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Staff | ሰራተኛ |
| `src/components/OwnerActivityDashboard.jsx:347` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Attempted: | ጣሰ ሙከራ: |
| `src/components/OwnerActivityDashboard.jsx:364` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Filters | ማጣሪያዎች |
| `src/components/OwnerActivityDashboard.jsx:369` | [NEVER-REVIEWED] | `inline-ternary` | Admin | All staff | ሁሉም ሰራተኞች |
| `src/components/OwnerActivityDashboard.jsx:373` | [VERIFIED] | `inline-ternary` | Admin | Today | ዛሬ |
| `src/components/OwnerActivityDashboard.jsx:374` | [VERIFIED] | `inline-ternary` | Admin | All | ሁሉም |
| `src/components/OwnerActivityDashboard.jsx:377` | [VERIFIED] | `inline-ternary` | Admin | All | ሁሉም |
| `src/components/OwnerActivityDashboard.jsx:378` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Created | መውጫ |
| `src/components/OwnerActivityDashboard.jsx:379` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Updated | ማሻሻል |
| `src/components/OwnerActivityDashboard.jsx:380` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Deleted | መሰረዝ |
| `src/components/OwnerActivityDashboard.jsx:389` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Recent activity | የቅርብ እንቅስቃሴዎች |
| `src/components/OwnerActivityDashboard.jsx:394` | [NEVER-REVIEWED] | `inline-ternary` | Admin | No matching activity | ምንም እንቅስቃሴ አልተገኘም |
| `src/components/OwnerActivityDashboard.jsx:405` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Staff | ሰራተኛ |
| `src/components/OwnerActivityDashboard.jsx:406` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Owner | ባለቤት |
| `src/components/OwnerActivityDashboard.jsx:425` | [VERIFIED] | `inline-ternary` | Admin | birr | ብር |
| `src/components/PartialPaymentSheet.jsx:118` | [VERIFIED] | `inline-ternary` | Other | Back | ተመለስ |
| `src/components/PartialPaymentSheet.jsx:122` | [NEVER-REVIEWED] | `inline-ternary` | Other | ½ Partial Payment | ½ ከፊል ክፍያ |
| `src/components/PartialPaymentSheet.jsx:133` | [NEVER-REVIEWED] | `inline-ternary` | Other | Total Amount | ጠቅላላ መጠን |
| `src/components/PartialPaymentSheet.jsx:136` | [VERIFIED] | `inline-ternary` | Other | ETB | ብር |
| `src/components/PartialPaymentSheet.jsx:143` | [VERIFIED] | `inline-ternary` | Other | Amount Received | የተቀበሉት መጠን |
| `src/components/PartialPaymentSheet.jsx:160` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/PartialPaymentSheet.jsx:165` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/PartialPaymentSheet.jsx:165` | [VERIFIED] | `inline-ternary` | Other | Remaining Dubie | ቀሪ ዱቤ |
| `src/components/PartialPaymentSheet.jsx:170` | [NEVER-REVIEWED] | `inline-ternary` | Other | Amount received equals total — use "Paid" instead. | የተቀበሉት ሙሉ ነው — "ሙሉ" ይምረጡ |
| `src/components/PartialPaymentSheet.jsx:178` | [NEVER-REVIEWED] | `inline-ternary` | Other | How was the amount paid? | የተቀበሉት እንዴት ተከፈለ? |
| `src/components/PartialPaymentSheet.jsx:192` | [VERIFIED] | `inline-ternary` | Other | ETB | ብር |
| `src/components/PartialPaymentSheet.jsx:192` | [VERIFIED] | `inline-ternary` | Other | via | በ |
| `src/components/PartialPaymentSheet.jsx:200` | [NEVER-REVIEWED] | `inline-ternary` | Other | Customer (for remaining Dubie) | ደንበኛ (ለቀሪው ዱቤ) |
| `src/components/PartialPaymentSheet.jsx:208` | [NEVER-REVIEWED] | `inline-ternary` | Other | Type customer name... | ስም ይተይቡ... |
| `src/components/PartialPaymentSheet.jsx:220` | [VERIFIED] | `inline-ternary` | Other | BAL | ዱቤ |
| `src/components/PartialPaymentSheet.jsx:226` | [VERIFIED] | `inline-ternary` | Other | Add as new customer | እንደ አዲስ ደንበኛ አክል |
| `src/components/PartialPaymentSheet.jsx:232` | [VERIFIED] | `inline-ternary` | Other | No customer found | ደንበኛ አልተገኘም |
| `src/components/PartialPaymentSheet.jsx:241` | [VERIFIED] | `inline-ternary` | Other | Add | አክል |
| `src/components/PartialPaymentSheet.jsx:262` | [VERIFIED] | `inline-ternary` | Other | BAL | ዱቤ |
| `src/components/PartialPaymentSheet.jsx:272` | [NEVER-REVIEWED] | `inline-ternary` | Other | optional | አማራጭ |
| `src/components/PartialPaymentSheet.jsx:272` | [NEVER-REVIEWED] | `inline-ternary` | Other | Remaining Due Date | የቀሪው መክፈያ ቀን |
| `src/components/PartialPaymentSheet.jsx:305` | [VERIFIED] | `inline-ternary` | Other | Pick | ምረጥ |
| `src/components/PartialPaymentSheet.jsx:317` | [NEVER-REVIEWED] | `inline-ternary` | Other | Select or add a customer above | ከላይ ደንበኛ ይምረጡ ወይም ያክሉ |
| `src/components/PartialPaymentSheet.jsx:333` | [NEVER-REVIEWED] | `inline-ternary` | Other | Saving... | በማስቀመጥ ላይ... |
| `src/components/PartialPaymentSheet.jsx:334` | [NEVER-REVIEWED] | `inline-ternary` | Other | Save Partial Payment | ከፊል ክፍያ አስቀምጥ |
| `src/components/PeriodInsights.jsx:103` | [NEVER-REVIEWED] | `inline-ternary` | Other | TOP SELLERS | ብዙ የተሸጡ |
| `src/components/PhotoAttachment.jsx:11` | [NEVER-REVIEWED] | `inline-ternary` | Other | View photo | ፎቶ ይመልከቱ |
| `src/components/PhotoAttachment.jsx:12` | [VERIFIED] | `inline-ternary` | Other | Close | ዝጋ |
| `src/components/PhotoAttachment.jsx:140` | [NEVER-REVIEWED] | `inline-ternary` | Other | Previous photo | ያለፈው ፎቶ |
| `src/components/PhotoAttachment.jsx:164` | [NEVER-REVIEWED] | `inline-ternary` | Other | Next photo | ቀጣዩ ፎቶ |
| `src/components/ProfitCard.jsx:75` | [NEVER-REVIEWED] | `inline-ternary` | Other | TODAY · NET | ዛሬ · ቀሪ |
| `src/components/ProfitCard.jsx:78` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/ProfitCard.jsx:88` | [NEVER-REVIEWED] | `inline-ternary` | Other | Toggle privacy | ቁጥሮችን ደብቅ/አሳይ |
| `src/components/ProfitCard.jsx:96` | [NEVER-REVIEWED] | `inline-ternary` | Other | Show details | ዝርዝር አሳይ |
| `src/components/ProfitCard.jsx:120` | [NEVER-REVIEWED] | `inline-ternary` | Other | TODAY · NET | ዛሬ · ቀሪ |
| `src/components/ProfitCard.jsx:127` | [NEVER-REVIEWED] | `inline-ternary` | Other | Toggle privacy | ቁጥሮችን ደብቅ/አሳይ |
| `src/components/ProfitCard.jsx:143` | [NEVER-REVIEWED] | `inline-ternary` | Other | Reveal | አሳይ |
| `src/components/ProfitCard.jsx:149` | [NEVER-REVIEWED] | `inline-ternary` | Other | Collapse | አጥራ |
| `src/components/ProfitCard.jsx:172` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/ProfitCard.jsx:180` | [NEVER-REVIEWED] | `inline-ternary` | Other | vs yesterday | ካለፈው ቀን |
| `src/components/ProfitCard.jsx:187` | [VERIFIED] | `inline-ternary` | Other | Sales | ሽያጭ |
| `src/components/ProfitCard.jsx:190` | [VERIFIED] | `inline-ternary` | Other | Spent | ወጪ |
| `src/components/PwaInstallPanel.jsx:133` | [NEVER-REVIEWED] | `inline-ternary` | App shell | Gebya is installed on this device | ገበያ በስልክዎ ላይ ተጭኗል |
| `src/components/ReminderSheet.jsx:130` | [NEVER-REVIEWED] | `inline-ternary` | Other | Send reminder | ማስታወሻ ላክ |
| `src/components/ReminderSheet.jsx:134` | [NEVER-REVIEWED] | `inline-ternary` | Other | last | መጨረሻ |
| `src/components/ReminderSheet.jsx:140` | [VERIFIED] | `inline-ternary` | Other | Close | ዝጋ |
| `src/components/ReminderSheet.jsx:160` | [VERIFIED] | `inline-ternary` | Other | Outstanding | ቀሪ ዱቤ |
| `src/components/ReminderSheet.jsx:170` | [NEVER-REVIEWED] | `inline-ternary` | Other | Tone | አንደ ምን ያስታውሱ |
| `src/components/ReminderSheet.jsx:200` | [NEVER-REVIEWED] | `inline-ternary` | Other | Message | መልዕክት |
| `src/components/ReminderSheet.jsx:209` | [NEVER-REVIEWED] | `inline-ternary` | Other | Copied | ተቀዳ |
| `src/components/ReminderSheet.jsx:210` | [NEVER-REVIEWED] | `inline-ternary` | Other | Copy | ቅዳ |
| `src/components/ReminderSheet.jsx:235` | [NEVER-REVIEWED] | `inline-ternary` | Other | Send via | በምን ይላኩ |
| `src/components/ReminderSheet.jsx:325` | [NEVER-REVIEWED] | `inline-ternary` | Other | Sending… | እየተላከ… |
| `src/components/ReminderSheet.jsx:326` | [NEVER-REVIEWED] | `inline-ternary` | Other | Send reminder | ላክ |
| `src/components/report/SettlementSheet.jsx:166` | [NEVER-REVIEWED] | `t-helper` | Settlements | Failed to mark as disputed | አከራካሪ አድርጎ ምልክት ማድረግ አልተሳካም |
| `src/components/report/SettlementSheet.jsx:187` | [NEVER-REVIEWED] | `t-helper` | Settlements | Enter at least actual cash or transfer amount | እባክዎ ቢያንስ የጥሬ ገንዘብ ወይም የዝውውር መጠን ያስገቡ |
| `src/components/report/SettlementSheet.jsx:204` | [NEVER-REVIEWED] | `t-helper` | Settlements | Dispute resolved — owner accepted | ክርክር ተፈቷል — ባለቤት ተቀብሏል |
| `src/components/report/SettlementSheet.jsx:204` | [NEVER-REVIEWED] | `t-helper` | Settlements | Dispute resolved with adjustments | ክርክር በማስተካከል ተፈቷል |
| `src/components/report/SettlementSheet.jsx:205` | [NEVER-REVIEWED] | `t-helper` | Settlements | Owner accepted staff report | ባለቤት የሰራተኛ ሪፖርት ተቀብሏል |
| `src/components/report/SettlementSheet.jsx:205` | [NEVER-REVIEWED] | `t-helper` | Settlements | Owner reviewed with adjustments | ባለቤት በማስተካከል ተመልክቷል |
| `src/components/report/SettlementSheet.jsx:253` | [NEVER-REVIEWED] | `t-helper` | Settlements | Failed to save settlement | ማስተካከያ ማስቀመጥ አልተሳካም |
| `src/components/report/SettlementSheet.jsx:283` | [NEVER-REVIEWED] | `t-helper` | Settlements | Settle with | ከ |
| `src/components/report/SettlementSheet.jsx:284` | [NEVER-REVIEWED] | `t-helper` | Settlements | Settlement | ማስተካከያ |
| `src/components/report/SettlementSheet.jsx:287` | [NEVER-REVIEWED] | `t-helper` | Settlements | Start | መጀመሪያ |
| `src/components/report/SettlementSheet.jsx:304` | [NEVER-REVIEWED] | `t-helper` | Settlements | Disputed by owner | በባለቤት ተከራክሯል |
| `src/components/report/SettlementSheet.jsx:315` | [NEVER-REVIEWED] | `t-helper` | Settlements | The owner will review your settlement again to resolve this. | ባለቤቱ ይህንን ለመፍታት የእርስዎን ማስተካከያ እንደገና ይመለከታል። |
| `src/components/report/SettlementSheet.jsx:324` | [NEVER-REVIEWED] | `t-helper` | Settlements | Cash | ጥሬ |
| `src/components/report/SettlementSheet.jsx:325` | [NEVER-REVIEWED] | `t-helper` | Settlements | Transfer | ዝውውር |
| `src/components/report/SettlementSheet.jsx:326` | [VERIFIED] | `t-helper` | Settlements | Total | ጠቅላላ |
| `src/components/report/SettlementSheet.jsx:345` | [NEVER-REVIEWED] | `t-helper` | Settlements | Items sold | የተሸጡ ዕቃዎች |
| `src/components/report/SettlementSheet.jsx:347` | [VERIFIED] | `t-helper` | Settlements | qty | ብዛት |
| `src/components/report/SettlementSheet.jsx:347` | [NEVER-REVIEWED] | `t-helper` | Settlements | types | አይነት |
| `src/components/report/SettlementSheet.jsx:359` | [NEVER-REVIEWED] | `t-helper` | Settlements | Item | ዕቃ |
| `src/components/report/SettlementSheet.jsx:360` | [NEVER-REVIEWED] | `t-helper` | Settlements | Qty × Price | ብዛት × ዋጋ |
| `src/components/report/SettlementSheet.jsx:361` | [VERIFIED] | `t-helper` | Settlements | Total | ድምር |
| `src/components/report/SettlementSheet.jsx:374` | [NEVER-REVIEWED] | `t-helper` | Settlements | + more items not shown | + ተጨማሪ ዕቃዎች አልታዩም |
| `src/components/report/SettlementSheet.jsx:380` | [NEVER-REVIEWED] | `t-helper` | Settlements | Itemized sales | ዝርዝር ሽያጭ |
| `src/components/report/SettlementSheet.jsx:381` | [NEVER-REVIEWED] | `t-helper` | Settlements | simple sale(s) without item details | ሽያጭ ያለ ዝርዝር |
| `src/components/report/SettlementSheet.jsx:384` | [NEVER-REVIEWED] | `t-helper` | Settlements | of | ከ |
| `src/components/report/SettlementSheet.jsx:384` | [NEVER-REVIEWED] | `t-helper` | Settlements | sales total | ከሽያጭ ድምር |
| `src/components/report/SettlementSheet.jsx:397` | [NEVER-REVIEWED] | `t-helper` | Settlements | Staff reported | ሰራተኛ ያስረከበው |
| `src/components/report/SettlementSheet.jsx:401` | [NEVER-REVIEWED] | `t-helper` | Settlements | Cash | ጥሬ |
| `src/components/report/SettlementSheet.jsx:405` | [NEVER-REVIEWED] | `t-helper` | Settlements | Transfer | ዝውውር |
| `src/components/report/SettlementSheet.jsx:411` | [NEVER-REVIEWED] | `t-helper` | Settlements | Total reported | ጠቅላላ ያስረከበው |
| `src/components/report/SettlementSheet.jsx:415` | [NEVER-REVIEWED] | `t-helper` | Settlements | vs Expected | ከሚጠበቀው ጋር |
| `src/components/report/SettlementSheet.jsx:421` | [NEVER-REVIEWED] | `t-helper` | Settlements | Matched | ተመጣጣኚ |
| `src/components/report/SettlementSheet.jsx:439` | [NEVER-REVIEWED] | `t-helper` | Settlements | Use staff amounts | የሰራተኛውን መጠን ተጠቀም |
| `src/components/report/SettlementSheet.jsx:450` | [NEVER-REVIEWED] | `t-helper` | Settlements | Difference found | አከራካሪ ማስተካከያ |
| `src/components/report/SettlementSheet.jsx:454` | [NEVER-REVIEWED] | `t-helper` | Settlements | Owner identified a discrepancy. Review and resolve. | ባለቤት ልዩነት አስተውሏል። መርምረው ይፍቱ። |
| `src/components/report/SettlementSheet.jsx:462` | [NEVER-REVIEWED] | `t-helper` | Settlements | Actual (counted) | ትክክለኛው |
| `src/components/report/SettlementSheet.jsx:462` | [NEVER-REVIEWED] | `t-helper` | Settlements | Owner confirmation | የባለቤት ማረጋገጫ |
| `src/components/report/SettlementSheet.jsx:466` | [NEVER-REVIEWED] | `t-helper` | Settlements | Cash in hand | በእጅ ጥሬ |
| `src/components/report/SettlementSheet.jsx:478` | [NEVER-REVIEWED] | `t-helper` | Settlements | Transfer | ዝውውር |
| `src/components/report/SettlementSheet.jsx:479` | [NEVER-REVIEWED] | `t-helper` | Settlements | opt | አማራጭ |
| `src/components/report/SettlementSheet.jsx:500` | [NEVER-REVIEWED] | `t-helper` | Settlements | Expected total | የሚጠበቅ ድምር |
| `src/components/report/SettlementSheet.jsx:505` | [NEVER-REVIEWED] | `t-helper` | Settlements | Expected cash | የሚጠበቅ ጥሬ |
| `src/components/report/SettlementSheet.jsx:511` | [NEVER-REVIEWED] | `t-helper` | Settlements | Expected transfer | የሚጠበቅ ዝውውር |
| `src/components/report/SettlementSheet.jsx:521` | [NEVER-REVIEWED] | `t-helper` | Settlements | Photo of handover | የማስረከቢያ ፎቶ |
| `src/components/report/SettlementSheet.jsx:522` | [NEVER-REVIEWED] | `t-helper` | Settlements | optional | አማራጭ |
| `src/components/report/SettlementSheet.jsx:531` | [NEVER-REVIEWED] | `t-helper` | Settlements | Add photo | ፎቶ ያንሱ |
| `src/components/report/SettlementSheet.jsx:541` | [NEVER-REVIEWED] | `t-helper` | Settlements | Handover proof | የማስረከቢያ ማረጋገጫ |
| `src/components/report/SettlementSheet.jsx:550` | [NEVER-REVIEWED] | `t-helper` | Settlements | Remove photo | ፎቶ አስወግድ |
| `src/components/report/SettlementSheet.jsx:575` | [NEVER-REVIEWED] | `t-helper` | Settlements | Variance | ልዩነት |
| `src/components/report/SettlementSheet.jsx:584` | [NEVER-REVIEWED] | `inline-ternary` | Settlements | Balanced | ተመጣጣኚ |
| `src/components/report/SettlementSheet.jsx:590` | [NEVER-REVIEWED] | `t-helper` | Settlements | Cash | ጥሬ |
| `src/components/report/SettlementSheet.jsx:591` | [NEVER-REVIEWED] | `t-helper` | Settlements | Transfer | ዝውውር |
| `src/components/report/SettlementSheet.jsx:600` | [NEVER-REVIEWED] | `t-helper` | Settlements | Adjustments | ማስተካከያ |
| `src/components/report/SettlementSheet.jsx:601` | [NEVER-REVIEWED] | `t-helper` | Settlements | owner only | የባለቤት |
| `src/components/report/SettlementSheet.jsx:614` | [VERIFIED] | `t-helper` | Settlements | Expense | ወጪ |
| `src/components/report/SettlementSheet.jsx:615` | [NEVER-REVIEWED] | `t-helper` | Settlements | Credit to owner | ለባለቤት ክሬዲት |
| `src/components/report/SettlementSheet.jsx:616` | [NEVER-REVIEWED] | `t-helper` | Settlements | Other | ሌላ |
| `src/components/report/SettlementSheet.jsx:616` | [VERIFIED] | `t-helper` | Settlements | Sale | ሽያጭ |
| `src/components/report/SettlementSheet.jsx:637` | [VERIFIED] | `t-helper` | Settlements | Expense | ወጪ |
| `src/components/report/SettlementSheet.jsx:638` | [NEVER-REVIEWED] | `t-helper` | Settlements | Credit to owner | ለባለቤት ክሬዲት |
| `src/components/report/SettlementSheet.jsx:639` | [VERIFIED] | `t-helper` | Settlements | Sale | ሽያጭ |
| `src/components/report/SettlementSheet.jsx:640` | [NEVER-REVIEWED] | `t-helper` | Settlements | Other | ሌላ |
| `src/components/report/SettlementSheet.jsx:643` | [VERIFIED] | `t-helper` | Settlements | Amount | መጠን |
| `src/components/report/SettlementSheet.jsx:647` | [VERIFIED] | `t-helper` | Settlements | Note | ማስታወሻ |
| `src/components/report/SettlementSheet.jsx:661` | [NEVER-REVIEWED] | `t-helper` | Settlements | Timeline | የእንቅስቃሴ ምዝግብ |
| `src/components/report/SettlementSheet.jsx:692` | [NEVER-REVIEWED] | `t-helper` | Settlements | Owner | ባለቤት |
| `src/components/report/SettlementSheet.jsx:692` | [NEVER-REVIEWED] | `t-helper` | Settlements | Staff | ሰራተኛ |
| `src/components/report/SettlementSheet.jsx:719` | [VERIFIED] | `t-helper` | Settlements | Notes (optional) | ማስታወሻ |
| `src/components/report/SettlementSheet.jsx:729` | [NEVER-REVIEWED] | `t-helper` | Settlements | Owner review note | የባለቤት ማስታወሻ |
| `src/components/report/SettlementSheet.jsx:732` | [NEVER-REVIEWED] | `t-helper` | Settlements | Any difference? Note it here | ልዩነት ካለ እዚህ ያስረዱ |
| `src/components/report/SettlementSheet.jsx:744` | [NEVER-REVIEWED] | `t-helper` | Settlements | Why are you flagging this? (required — the staff will see this) | ለምን እንደሚከራከሩ ይጻፉ (አስፈላጊ — ሰራተኛው ያያል) |
| `src/components/report/SettlementSheet.jsx:748` | [NEVER-REVIEWED] | `t-helper` | Settlements | e.g. Cash is 200 short | ለምሳሌ ጥሬ ገንዘብ በ200 አሳጥሯል |
| `src/components/report/SettlementSheet.jsx:755` | [NEVER-REVIEWED] | `t-helper` | Settlements | Cancel | ተዉ |
| `src/components/report/SettlementSheet.jsx:758` | [NEVER-REVIEWED] | `t-helper` | Settlements | Confirm dispute | አከራካሪ አድርግ |
| `src/components/report/SettlementSheet.jsx:758` | [NEVER-REVIEWED] | `t-helper` | Settlements | Saving... | በማስቀመጥ ላይ... |
| `src/components/report/SettlementSheet.jsx:775` | [VERIFIED] | `t-helper` | Settlements | Back | ተመለስ |
| `src/components/report/SettlementSheet.jsx:786` | [NEVER-REVIEWED] | `t-helper` | Settlements | Failed to re-open | እንደገና መክፈት አልተሳካም |
| `src/components/report/SettlementSheet.jsx:789` | [NEVER-REVIEWED] | `t-helper` | Settlements | Re-open | እንደገና ክፈት |
| `src/components/report/SettlementSheet.jsx:801` | [NEVER-REVIEWED] | `t-helper` | Settlements | Flag difference | አከራካሪ |
| `src/components/report/SettlementSheet.jsx:811` | [NEVER-REVIEWED] | `t-helper` | Settlements | Saving... | በማስቀመጥ ላይ... |
| `src/components/report/SettlementSheet.jsx:813` | [NEVER-REVIEWED] | `t-helper` | Settlements | Resolve & Finalize | ፍታ እና ጨርስ |
| `src/components/report/SettlementSheet.jsx:814` | [NEVER-REVIEWED] | `t-helper` | Settlements | Accept & Finalize | ተቀበል እና ጨርስ |
| `src/components/report/SettlementSheet.jsx:828` | [NEVER-REVIEWED] | `t-helper` | Settlements | Save Settlement | አስቀምጥ |
| `src/components/report/SettlementSheet.jsx:828` | [NEVER-REVIEWED] | `t-helper` | Settlements | Saving... | በማስቀመጥ ላይ... |
| `src/components/ReportView.jsx:143` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Owner | ባለቤት |
| `src/components/ReportView.jsx:413` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Closing recorded ✓ | ዝጋ ተመዝገቧል ✓ |
| `src/components/ReportView.jsx:467` | [VERIFIED] | `inline-ternary` | Reports & story | Today | ዛሬ |
| `src/components/ReportView.jsx:469` | [VERIFIED] | `inline-ternary` | Reports & story | This Week | ሳምንት |
| `src/components/ReportView.jsx:471` | [VERIFIED] | `inline-ternary` | Reports & story | This Month | ወር |
| `src/components/ReportView.jsx:472` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Custom Range | ብጁ ክልል |
| `src/components/ReportView.jsx:478` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | My shop | ሱቅ |
| `src/components/ReportView.jsx:519` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Notebook | ማስታወሻ ደብተር |
| `src/components/ReportView.jsx:522` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Your shop | ሱቅህ |
| `src/components/ReportView.jsx:528` | [VERIFIED] | `inline-ternary` | Reports & story | TODAY | ዛሬ |
| `src/components/ReportView.jsx:555` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Search notebook | ፈልግ |
| `src/components/ReportView.jsx:565` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Search notebook... (/) | ፈልግ... (/) |
| `src/components/ReportView.jsx:571` | [VERIFIED] | `inline-ternary` | Reports & story | Share report summary | አጋራ |
| `src/components/ReportView.jsx:581` | [VERIFIED] | `inline-ternary` | Reports & story | Share | አጋራ |
| `src/components/ReportView.jsx:607` | [VERIFIED] | `inline-ternary` | Reports & story | Today | ዛሬ |
| `src/components/ReportView.jsx:608` | [VERIFIED] | `inline-ternary` | Reports & story | Week | ሳምንት |
| `src/components/ReportView.jsx:609` | [VERIFIED] | `inline-ternary` | Reports & story | Month | ወር |
| `src/components/ReportView.jsx:610` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Custom | ብጁ |
| `src/components/ReportView.jsx:636` | [VERIFIED] | `inline-ternary` | Reports & story | Everyone | ሁሉም |
| `src/components/ReportView.jsx:637` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Owner | ባለቤት |
| `src/components/ReportView.jsx:668` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | MY DAY | የእኔ ቀን |
| `src/components/ReportView.jsx:676` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | From | ከ |
| `src/components/ReportView.jsx:683` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | To | ወደ |
| `src/components/ReportView.jsx:701` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Device not linked yet | መሣሪያዎ ገና አልተገናኘም |
| `src/components/ReportView.jsx:703` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Nothing recorded in this period | በዚህ ጊዜ ውስጥ ምንም እንቅስቃሴ የለም |
| `src/components/ReportView.jsx:704` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Welcome to your shop | ወደ ሱቅ ታሪክ እንኳን በደህና መጡ |
| `src/components/ReportView.jsx:723` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Record First Sale | የመጀመሪያ ሽያጭ መዝግብ |
| `src/components/ReportView.jsx:729` | [VERIFIED] | `inline-ternary` | Reports & story | Sale | ሽያጭ |
| `src/components/ReportView.jsx:746` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | MY DAY | የእኔ ቀን |
| `src/components/ReportView.jsx:747` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | MY DAY | የእኔ ቀን |
| `src/components/ReportView.jsx:761` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Ready to hand over? | ገንዘብ ለማስረከብ ዝግጁ ነዎት? |
| `src/components/ReportView.jsx:778` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Surrender | አሳልፍ |
| `src/components/ReportView.jsx:798` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | ENTRIES | እንቅስቃሴዎች |
| `src/components/ReportView.jsx:808` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | SHOP STATUS | የሱቅ ሁኔታ |
| `src/components/ReportView.jsx:823` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | TODAY'S BUSINESS | የዛሬ ንግድ |
| `src/components/ReportView.jsx:831` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | DO THIS NEXT | በመቀጠል ይህን አድርግ |
| `src/components/ReportView.jsx:852` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | STAFF HANDOVER | 🤝 የሰራተኛ ማስረከቢያ |
| `src/components/ReportView.jsx:866` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | WHAT I NOTICED | ያስተዋልኩት |
| `src/components/ReportView.jsx:877` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | TODAY'S STORY | የዛሬ ታሪክ |
| `src/components/ReportView.jsx:895` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | SUMMARY | ማጠቃለያ |
| `src/components/ReportView.jsx:922` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | BUSINESS SUMMARY | የንግድ ማጠቃለያ |
| `src/components/ReportView.jsx:932` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | TODAY'S ENTRIES | የዛሬ እንቅስቃሴ |
| `src/components/ReportView.jsx:933` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | ENTRIES | እንቅስቃሴዎች |
| `src/components/ReportView.jsx:951` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Loading... | በመጫን ላይ... |
| `src/components/ReportView.jsx:961` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Handover recorded ✓ | ማስረከቢያ ተመዝግቧል ✓ |
| `src/components/RunningTotalPill.jsx:35` | [VERIFIED] | `t-helper` | Other | Today | ዛሬ |
| `src/components/RunningTotalPill.jsx:45` | [NEVER-REVIEWED] | `t-helper` | Other | Credit sales not yet collected | ክፍያ ያልተከፈለ ዱቤ ሽያጭ |
| `src/components/RunningTotalPill.jsx:48` | [VERIFIED] | `t-helper` | Other | dubie | ዱቤ |
| `src/components/SearchSheet.jsx:7` | [NEVER-REVIEWED] | `locale-object` | Other | Where is Abebe's credit? | የአበበ ዱቤ የት አለ? |
| `src/components/SearchSheet.jsx:8` | [NEVER-REVIEWED] | `locale-object` | Other | Did I sell sugar yesterday? | ትናንት ስኳር ሸጥኩ? |
| `src/components/SearchSheet.jsx:9` | [NEVER-REVIEWED] | `locale-object` | Other | Show all Telebirr payments | ሁሉንም የቴሌብር ክፍያ አሳይ |
| `src/components/SearchSheet.jsx:10` | [NEVER-REVIEWED] | `locale-object` | Other | How much did I spend this week? | በዚህ ሳምንት ምን ያህል አወጣሁ? |
| `src/components/SearchSheet.jsx:11` | [NEVER-REVIEWED] | `locale-object` | Other | Who still hasn't paid? | ማን ገና አልከፈለም? |
| `src/components/SearchSheet.jsx:12` | [NEVER-REVIEWED] | `locale-object` | Other | Find last oil purchase | የመጨረሻውን የዘይት ግዢ ፈልግ |
| `src/components/SearchSheet.jsx:128` | [VERIFIED] | `inline-ternary` | Other | All | ሁሉም |
| `src/components/SearchSheet.jsx:129` | [VERIFIED] | `inline-ternary` | Other | Sales | ሽያጭ |
| `src/components/SearchSheet.jsx:130` | [VERIFIED] | `inline-ternary` | Other | Expenses | ወጪ |
| `src/components/SearchSheet.jsx:131` | [VERIFIED] | `inline-ternary` | Other | Credit | ዱቤ |
| `src/components/SearchSheet.jsx:132` | [NEVER-REVIEWED] | `inline-ternary` | Other | Collections | መሰብሰብ |
| `src/components/SearchSheet.jsx:133` | [NEVER-REVIEWED] | `inline-ternary` | Other | Customers | ደንበኛ |
| `src/components/SearchSheet.jsx:134` | [VERIFIED] | `inline-ternary` | Other | Items | እቃ |
| `src/components/SearchSheet.jsx:138` | [NEVER-REVIEWED] | `inline-ternary` | Other | Any time | በሙሉ ጊዜ |
| `src/components/SearchSheet.jsx:139` | [NEVER-REVIEWED] | `inline-ternary` | Other | This week | በዚህ ሳምንት |
| `src/components/SearchSheet.jsx:140` | [NEVER-REVIEWED] | `inline-ternary` | Other | This month | በዚህ ወር |
| `src/components/SearchSheet.jsx:182` | [NEVER-REVIEWED] | `inline-ternary` | Other | Ask your notebook... | ማስታወሻ ደብተርዎን ይጠይቁ... |
| `src/components/SearchSheet.jsx:201` | [VERIFIED] | `inline-ternary` | Other | Cancel | ዝጋ |
| `src/components/SearchSheet.jsx:208` | [NEVER-REVIEWED] | `inline-ternary` | Other | Try asking | ለምሳሌ |
| `src/components/SearchSheet.jsx:292` | [NEVER-REVIEWED] | `inline-ternary` | Other | found | ተገኝተዋል |
| `src/components/SearchSheet.jsx:300` | [NEVER-REVIEWED] | `inline-ternary` | Other | No results found | ምንም አልተገኘም |
| `src/components/SearchSheet.jsx:303` | [NEVER-REVIEWED] | `inline-ternary` | Other | Try a different search term | በሌላ ቃል ይሞክሩ |
| `src/components/SearchSheet.jsx:343` | [VERIFIED] | `inline-ternary` | Other | ETB | ብር |
| `src/components/settings/AdminPanel.jsx:42` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Platform Admin | ፕላትፎርም አስተዳዳሪ |
| `src/components/settings/AdminPanel.jsx:43` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Shop Admin | የሱቅ አስተዳዳሪ |
| `src/components/settings/AdminPanel.jsx:48` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Metrics | ሜትሪክስ |
| `src/components/settings/AdminPanel.jsx:53` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Analytics | ትንተና |
| `src/components/settings/AdminPanel.jsx:59` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Curation | ማስተካከያ ወረፍ |
| `src/components/settings/AdminPanel.jsx:65` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Activity | እንቅስቃሴ |
| `src/components/settings/AdminPanel.jsx:70` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Support | ድጋፍ |
| `src/components/settings/AdminPanel.jsx:90` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Open Command Center | የመሣሪያ ስርዓት ማዕከል ክፈት |
| `src/components/settings/AdminPanel.jsx:96` | [NEVER-REVIEWED] | `inline-ternary` | Admin | Share with your team: /admin | ለቡድኑ ተጋሩ፡ /admin |
| `src/components/settings/backup/DangerZoneSection.jsx:29` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Invalid backup file | የተበላሸ ምትኬ ፋይል |
| `src/components/settings/backup/DangerZoneSection.jsx:42` | [NEVER-REVIEWED] | `inline-ternary` | Settings | ✓ Restored — reloading… | ✓ መልሶ ተመለሰ — በመጫን ላይ… |
| `src/components/settings/backup/DangerZoneSection.jsx:46` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Restore failed | መልሶ ማስቀመጥ አልተሳካም |
| `src/components/settings/backup/DangerZoneSection.jsx:64` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Restore from backup file | ከምትኬ ፋይል መልሰው ይጫኑ |
| `src/components/settings/backup/DangerZoneSection.jsx:66` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Replaces all data · two-step confirm | ሁሉንም መረጃ ይተካል · ሁለት ጊዜ ማረጋገጫ ያስፈልጋል |
| `src/components/settings/backup/DangerZoneSection.jsx:82` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Start over on this phone | መልሰው ጀምር |
| `src/components/settings/backup/DangerZoneSection.jsx:84` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Deletes everything — cannot be undone | ሁሉንም ይሰርዛል — መልሶ ማግኘት አይቻልም |
| `src/components/settings/backup/DangerZoneSection.jsx:94` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Start over on this phone? | በዚህ ስልክ መልሰው ይጀምሩ? |
| `src/components/settings/backup/DangerZoneSection.jsx:98` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Continue → | ቀጥል → |
| `src/components/settings/backup/DangerZoneSection.jsx:107` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Are you sure? | እርግጠኛ ነዎት? |
| `src/components/settings/backup/DangerZoneSection.jsx:108` | [NEVER-REVIEWED] | `inline-ternary` | Settings | This is your last chance. All data will be permanently deleted. | ይህ የመጨረሻ ማረጋገጫ ነው። ሁሉም ውሂብ ይሰረዛል። |
| `src/components/settings/backup/DangerZoneSection.jsx:109` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Yes, delete everything | አዎ፣ አሁን ሰርዝ |
| `src/components/settings/backup/DangerZoneSection.jsx:110` | [NEVER-REVIEWED] | `inline-ternary` | Settings | No, keep my data | አይ፣ ይተወው |
| `src/components/settings/backup/DangerZoneSection.jsx:122` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Restore from backup? | ምትኬ ይመለስ? |
| `src/components/settings/backup/DangerZoneSection.jsx:126` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Continue → | ቀጥል → |
| `src/components/settings/backup/DangerZoneSection.jsx:135` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Are you sure? | እርግጠኛ ነዎት? |
| `src/components/settings/backup/DangerZoneSection.jsx:136` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Tip: download a backup of current data first. | ከመመለስ በፊት የአሁኑን መረጃ ምትኬ ይውሰዱ። |
| `src/components/settings/backup/DangerZoneSection.jsx:137` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Yes, restore now | አዎ፣ መልሰው ጫን |
| `src/components/settings/backup/DangerZoneSection.jsx:138` | [NEVER-REVIEWED] | `inline-ternary` | Settings | No, keep current data | አይ፣ ይተወው |
| `src/components/settings/BackupDataPanel.jsx:26` | [VERIFIED] | `inline-ternary` | Settings | customers in dubie | ደንበኞች |
| `src/components/settings/BackupDataPanel.jsx:26` | [NEVER-REVIEWED] | `inline-ternary` | Settings | entries | መዝገብ |
| `src/components/settings/BackupDataPanel.jsx:41` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Export CSV (for accountant) | CSV አውጣ (ለሂሳብ ቤት) |
| `src/components/settings/BackupDataPanel.jsx:43` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Flat spreadsheet · no photos | ጠፍጣፋ ስፕሬድሺት · ፎቶ የለም |
| `src/components/settings/BackupDataPanel.jsx:55` | [NEVER-REVIEWED] | `inline-ternary` | Settings | ✓ Backup completed | ✓ መደቃቀፋ ተሳክቷል |
| `src/components/settings/BackupDataPanel.jsx:57` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Backup failed | መደቃቀፋ አልተሳከም |
| `src/components/settings/BackupDataPanel.jsx:60` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Backup failed | መደቃቀፋ አልተሳከም |
| `src/components/settings/BackupDataPanel.jsx:72` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Back up to cloud | ወደ ደረጃ መደቃቀፍ |
| `src/components/settings/BackupDataPanel.jsx:73` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Requires sign-in · encrypted in transit | የሚታወቀውን ቴሌግራምና ወይም ኢሜይል ያስፈልጋል |
| `src/components/settings/CatalogPanel.jsx:66` | [NEVER-REVIEWED] | `inline-ternary` | Settings | 📦 Item | 📦 ዕቃ |
| `src/components/settings/CatalogPanel.jsx:67` | [NEVER-REVIEWED] | `inline-ternary` | Settings | 🛠 Service | 🛠 አገልግሎት |
| `src/components/settings/CatalogPanel.jsx:75` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Name · e.g. Sugar | ስም · ለምሳሌ ስኳር |
| `src/components/settings/CatalogPanel.jsx:82` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Sale price | የሽያጭ ዋጋ |
| `src/components/settings/CatalogPanel.jsx:89` | [VERIFIED] | `inline-ternary` | Settings | birr | ብር |
| `src/components/settings/CatalogPanel.jsx:96` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Cost (optional) | መግዣ ዋጋ (አማራጭ) |
| `src/components/settings/CatalogPanel.jsx:103` | [NEVER-REVIEWED] | `inline-ternary` | Settings | for profit | ለትርፍ ስሌት |
| `src/components/settings/CatalogPanel.jsx:117` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Cancel | ይቅር |
| `src/components/settings/CatalogPanel.jsx:128` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Update | አስተካክል |
| `src/components/settings/CatalogPanel.jsx:129` | [NEVER-REVIEWED] | `inline-ternary` | Settings | + Save | + አስቀምጥ |
| `src/components/settings/CatalogPanel.jsx:136` | [NEVER-REVIEWED] | `inline-ternary` | Settings | No saved items yet. | ገና ምንም ዕቃ አልተቀመጠም። |
| `src/components/settings/CatalogPanel.jsx:146` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Service | አገልግሎት |
| `src/components/settings/CatalogPanel.jsx:147` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Item | ዕቃ |
| `src/components/settings/CatalogPanel.jsx:151` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Archived | ተደብቋል |
| `src/components/settings/CatalogPanel.jsx:156` | [VERIFIED] | `inline-ternary` | Settings | Sale | ሽያጭ |
| `src/components/settings/CatalogPanel.jsx:158` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Cost | መግዣ |
| `src/components/settings/CatalogPanel.jsx:176` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Edit | አስተካክል |
| `src/components/settings/CatalogPanel.jsx:185` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Restore | መልስ |
| `src/components/settings/CatalogPanel.jsx:186` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Archive | ደብቅ |
| `src/components/settings/DubieRulesPanel.jsx:33` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Dubie overdue threshold (days) | ዱቤ ጊዜ ማብቂያ (ቀናት) |
| `src/components/settings/DubieRulesPanel.jsx:47` | [VERIFIED] | `inline-ternary` | Settings | days | ቀን |
| `src/components/settings/DubieRulesPanel.jsx:47` | [NEVER-REVIEWED] | `inline-ternary` | Settings | None | ምንም |
| `src/components/settings/DubieRulesPanel.jsx:58` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Save | አስቀምጥ |
| `src/components/settings/ExportPanel.jsx:28` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Downloading... | በማውረድ ላይ... |
| `src/components/settings/ExportPanel.jsx:28` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Export to CSV | ወደ CSV ያውርዱ |
| `src/components/settings/grouped/AboutPanel.jsx:46` | [NEVER-REVIEWED] | `inline-ternary` | Settings | All data stays on this phone only | ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል |
| `src/components/settings/grouped/AboutPanel.jsx:50` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Built | የግንባታ ቀን |
| `src/components/settings/grouped/AboutPanel.jsx:61` | [NEVER-REVIEWED] | `inline-ternary` | Settings | App info | መስመርቻ መረጃ |
| `src/components/settings/grouped/AboutPanel.jsx:66` | [NEVER-REVIEWED] | `inline-ternary` | Settings | more taps | ተጨማሪ መታ |
| `src/components/settings/grouped/AboutPanel.jsx:79` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Error & usage reporting | የስህተት እና አጠቃቀም ሪፖርት |
| `src/components/settings/grouped/AboutPanel.jsx:91` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Error & usage reporting | የስህተት እና አጠቃቀም ሪፖርት |
| `src/components/settings/grouped/HelpSupportPanel.jsx:16` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Common Questions | ተደጋጋሚ ጥያቄዎች |
| `src/components/settings/grouped/HelpSupportPanel.jsx:19` | [NEVER-REVIEWED] | `inline-ternary` | Settings | How do I remind a customer about dubie? | ዱቤ እንዴት ላስታውሳል? |
| `src/components/settings/grouped/HelpSupportPanel.jsx:27` | [NEVER-REVIEWED] | `inline-ternary` | Settings | How do I add a discount to a sale? | ሽያጭ ሲመዘገብ ቅናሽ እንዴት ልጨምር? |
| `src/components/settings/grouped/HelpSupportPanel.jsx:35` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Where is my data stored? | ውሂቤ ወዴት ይሄዳል? |
| `src/components/settings/groupedLabels.js:17` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | SHOP | ሱቅ |
| `src/components/settings/groupedLabels.js:18` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | MONEY & CREDIT | ገንዘብ እና ዱቤ |
| `src/components/settings/groupedLabels.js:19` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | MY APP | የእርስዎ መተግበሪያ |
| `src/components/settings/groupedLabels.js:22` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | MY ACCOUNT | የእርስዎ መለያ |
| `src/components/settings/groupedLabels.js:26` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Shop Profile | የሱቅ መገለጫ |
| `src/components/settings/groupedLabels.js:27` | [VERIFIED] | `locale-object` | Settings — grouped draft | Items | እቃዎች |
| `src/components/settings/groupedLabels.js:30` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Recurring Expenses | ወርሃዊ ወጪ |
| `src/components/settings/groupedLabels.js:31` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Dubie (Credit) Rules | የዱቤ ህጎች |
| `src/components/settings/groupedLabels.js:32` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Payment Channels | የክፍያ መንገዶች |
| `src/components/settings/groupedLabels.js:33` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Plan | እቅድ |
| `src/components/settings/groupedLabels.js:34` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Alerts & reminders | ማስታወቂያዎች |
| `src/components/settings/groupedLabels.js:35` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Remind customers | ለደንበኞች ማስታወቂያ |
| `src/components/settings/groupedLabels.js:36` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Backup & sync | መጠባበቂያ እና ማመሳሰል |
| `src/components/settings/groupedLabels.js:37` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Password & devices | የሚስጥር ቃል እና መሣሪያዎች |
| `src/components/settings/groupedLabels.js:38` | [VERIFIED] | `locale-object` | Settings — grouped draft | Appearance | መልክ |
| `src/components/settings/groupedLabels.js:39` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Language | ቋንቋ |
| `src/components/settings/groupedLabels.js:40` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Help & Support | እርዳታ እና ድጋፍ |
| `src/components/settings/groupedLabels.js:41` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | About Gebya | ስለ ገበያ |
| `src/components/settings/groupedLabels.js:42` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Sign out | ውጣ |
| `src/components/settings/groupedLabels.js:44` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | My alerts | የእኔ ማስታወቂያዎች |
| `src/components/settings/groupedLabels.js:45` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | My phone | የእኔ ስልክ |
| `src/components/settings/groupedLabels.js:46` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | My password | የእኔ የሚስጥር ቃል |
| `src/components/settings/groupedLabels.js:51` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | configured | ተዋቅሯል |
| `src/components/settings/groupedLabels.js:53` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | more taps | ተጨማሪ መታ |
| `src/components/settings/groupedLabels.js:56` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Sign out? | መውጣት? |
| `src/components/settings/groupedLabels.js:67` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Records not yet synced | ያልተመሳሰሉ መዝገቦች |
| `src/components/settings/groupedLabels.js:76` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Sync now | አሁን አማሳይ። |
| `src/components/settings/groupedLabels.js:77` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Sign out anyway | ምንም አልተከለከለም ውጣ |
| `src/components/settings/groupedLabels.js:79` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Set | ተዋቅሯል |
| `src/components/settings/groupedLabels.js:80` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — grouped draft | Not set | አልተዋቀረም |
| `src/components/settings/MyAccountPanel.jsx:96` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Owner | ባለቤት |
| `src/components/settings/MyAccountPanel.jsx:97` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Manager | ሥራ አስኪያጅ |
| `src/components/settings/MyAccountPanel.jsx:98` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Staff | ሰራተኛ |
| `src/components/settings/MyAccountPanel.jsx:152` | [NEVER-REVIEWED] | `inline-ternary` | Settings | No phone added | ስልክ አልተጨመረም |
| `src/components/settings/MyAccountPanel.jsx:172` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Dark/light mode, hide amounts | ጨለማ/ብርሃን ሁነታ፣ መጠኖችን ደብቅ |
| `src/components/settings/MyAccountPanel.jsx:184` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Notification preferences | የማስጠንቂያ ምርጫ |
| `src/components/settings/MyAccountPanel.jsx:199` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Empty | ባዶ |
| `src/components/settings/MyAccountPanel.jsx:225` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Not added | አልተጨመረም |
| `src/components/settings/MyAccountPanel.jsx:257` | [NEVER-REVIEWED] | `inline-ternary` | Settings | EN | አማ |
| `src/components/settings/MyAccountPanel.jsx:263` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Language | ቋንቋ |
| `src/components/settings/MyAccountPanel.jsx:276` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Switch to አማር‌ኛ | አማር‌ኛ በመረጡት |
| `src/components/settings/MyAccountPanel.jsx:302` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Get answers, report a problem | ጥያቄዎችን ያግኙ፡ ችግር ያመልክቱ |
| `src/components/settings/notificationGroups.js:4` | [VERIFIED] | `locale-object` | Settings | Sales | ሽያጭ |
| `src/components/settings/notificationGroups.js:5` | [NEVER-REVIEWED] | `locale-object` | Settings | Credit Given | ተሰጠ ብር |
| `src/components/settings/notificationGroups.js:6` | [NEVER-REVIEWED] | `locale-object` | Settings | Payments Received | ክፍያ ተቀባይ |
| `src/components/settings/notificationGroups.js:7` | [NEVER-REVIEWED] | `locale-object` | Settings | Supplier Payments | የአቅራቢያ ክፍያ |
| `src/components/settings/notificationGroups.js:8` | [NEVER-REVIEWED] | `locale-object` | Settings | Supplier Purchases | የአቅራቢያ ግዥስ |
| `src/components/settings/notificationGroups.js:9` | [VERIFIED] | `locale-object` | Settings | Expenses | ወጪ |
| `src/components/settings/notificationGroups.js:10` | [NEVER-REVIEWED] | `locale-object` | Settings | Staff Joined | ሰራተኛ ተቀላቅሏል |
| `src/components/settings/notificationGroups.js:11` | [NEVER-REVIEWED] | `locale-object` | Settings | Security Alerts | የደህንነት ማስጠንቂያ |
| `src/components/settings/notificationGroups.js:12` | [NEVER-REVIEWED] | `locale-object` | Settings | Overdue Payments | የጊዜ ያለፈ ክፍያ |
| `src/components/settings/notificationGroups.js:13` | [NEVER-REVIEWED] | `locale-object` | Settings | Device Approval | የስልክ ማጽደቅ |
| `src/components/settings/notificationGroups.js:14` | [NEVER-REVIEWED] | `locale-object` | Settings | Announcements | ማስታወቂያ |
| `src/components/settings/notificationGroups.js:15` | [NEVER-REVIEWED] | `locale-object` | Settings | Support Replies | የድጋፍ መልስ |
| `src/components/settings/notificationGroups.js:16` | [NEVER-REVIEWED] | `locale-object` | Settings | Staff Submissions | የሰራተኛ ስብስብ |
| `src/components/settings/notificationGroups.js:27` | [NEVER-REVIEWED] | `locale-object` | Settings | Money in | ገቢ ገንዘብ |
| `src/components/settings/notificationGroups.js:33` | [VERIFIED] | `locale-object` | Settings | Credit–Dubie | ዱቤ |
| `src/components/settings/notificationGroups.js:37` | [NEVER-REVIEWED] | `locale-object` | Settings | Cannot disable | መዝጋት አይቻልም |
| `src/components/settings/notificationGroups.js:41` | [NEVER-REVIEWED] | `locale-object` | Settings | Money out | ወጪ ገንዘብ |
| `src/components/settings/notificationGroups.js:47` | [NEVER-REVIEWED] | `locale-object` | Settings | Team | ቡድን |
| `src/components/settings/notificationGroups.js:53` | [NEVER-REVIEWED] | `locale-object` | Settings | Gebya & support | ገበያ እና ድጋፍ |
| `src/components/settings/NotificationPreferences.jsx:78` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Locked ON | የተወሠነ |
| `src/components/settings/NotificationPreferences.jsx:133` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Cannot disable | መዝጋት አይቻልም |
| `src/components/settings/NotificationPreferences.jsx:147` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Quiet Hours | የማስጠንቂያ ሰዓት |
| `src/components/settings/NotificationPreferences.jsx:158` | [NEVER-REVIEWED] | `inline-ternary` | Settings | From | ከ |
| `src/components/settings/NotificationPreferences.jsx:171` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Until | እስከ |
| `src/components/settings/NotificationPreferences.jsx:205` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Sign in required to load preferences | መለያ ያስፈልጋል። ይግቡ። |
| `src/components/settings/NotificationPreferences.jsx:243` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Sign in to save preferences | መለያ ያስፈልጋል። ይግቡ። |
| `src/components/settings/NotificationPreferences.jsx:257` | [VERIFIED] | `inline-ternary` | Settings | Failed to save | ማስተካከል አልተሳካም |
| `src/components/settings/NotificationPreferences.jsx:271` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Sign in to save quiet hours | መለያ ያስፈልጋል። ይግቡ። |
| `src/components/settings/NotificationPreferences.jsx:293` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Sign in to reset preferences | መለያ ያስፈልጋል። ይግቡ። |
| `src/components/settings/NotificationPreferences.jsx:303` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Reset to defaults | ወደ ነባሪ ተመልሷል |
| `src/components/settings/NotificationPreferences.jsx:320` | [NEVER-REVIEWED] | `inline-ternary` | Settings | NOTIFICATION PREFERENCES | የማስጠንቂያ ምርጫ |
| `src/components/settings/NotificationPreferences.jsx:335` | [NEVER-REVIEWED] | `inline-ternary` | Settings | NOTIFICATION PREFERENCES | የማስጠንቂያ ምርጫ |
| `src/components/settings/NotificationPreferences.jsx:340` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Could not load notification preferences. | የማስጠንቂያ ምርጫዎችን መጫን አልተቻለም። |
| `src/components/settings/NotificationPreferences.jsx:348` | [VERIFIED] | `inline-ternary` | Settings | Try again | እንደገና ሞክር |
| `src/components/settings/NotificationPreferences.jsx:359` | [NEVER-REVIEWED] | `inline-ternary` | Settings | NOTIFICATION PREFERENCES | የማስጠንቂያ ምርጫ |
| `src/components/settings/NotificationPreferences.jsx:368` | [NEVER-REVIEWED] | `inline-ternary` | Settings | What to receive | ምን ይላኩ |
| `src/components/settings/NotificationPreferences.jsx:373` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Saving... | በመቀየር... |
| `src/components/settings/NotificationPreferences.jsx:429` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Reset to defaults | ወደ ነባሪ ተመልስ |
| `src/components/settings/PasswordSettings.jsx:16` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | Password must be at least 6 characters | የሚስጥር ቃል መዲዛ መስከቨሪ ነው 6 በላይ ከአይነት |
| `src/components/settings/PasswordSettings.jsx:25` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Sign in required | መለያ ያስፈልጋል። ይግቡ። |
| `src/components/settings/PasswordSettings.jsx:31` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | Password saved successfully | የሚስጥር ቃል መዲዛ በተሳካ ሁኔታ ተለዋዋጭ ይሆናል |
| `src/components/settings/PasswordSettings.jsx:37` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | Failed to save password | የሚስጥር ቃል መዲዛ አልተሳካም |
| `src/components/settings/PasswordSettings.jsx:44` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | You will use OTP again. Remove password? | እንደገና OTP መረጃ ለማጠቃቀል ይሁኑ፣ የሚስጥር ቃል መዲዛ ነው ለማስወገድ? |
| `src/components/settings/PasswordSettings.jsx:51` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Sign in required | መለያ ያስፈልጋል። ይግቡ። |
| `src/components/settings/PasswordSettings.jsx:57` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | Password removed successfully | የሚስጥር ቃል መዲዛ በተሳካ ሁኔታ ተለዋዋጭ ይሆናል |
| `src/components/settings/PasswordSettings.jsx:62` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | Failed to remove password | የሚስጥር ቃል መዲዛ አልተለወደደም |
| `src/components/settings/PasswordSettings.jsx:75` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | PASSWORD LOGIN | የሚስጥር ቃል መዲዛ |
| `src/components/settings/PasswordSettings.jsx:91` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | Remove Password | የሚስጥር ቃል መዲዛ አስudya |
| `src/components/settings/PasswordSettings.jsx:93` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | Remove Password | የሚስጥር ቃል መዲዛ አስudya |
| `src/components/settings/PasswordSettings.jsx:100` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | New Password | የሚስጥር ቃል መዲዛ |
| `src/components/settings/PasswordSettings.jsx:106` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | 6-32 characters | 6-32 ሰምዶች |
| `src/components/settings/PasswordSettings.jsx:110` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | New Password | የሚስጥር ቃል መዲዛ |
| `src/components/settings/PasswordSettings.jsx:117` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Hide | ዝርዝር ይመልስ |
| `src/components/settings/PasswordSettings.jsx:118` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Show | ተወድህ ነው |
| `src/components/settings/PasswordSettings.jsx:122` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Hide | ዝርዝር ይመልስ |
| `src/components/settings/PasswordSettings.jsx:123` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Show | ተወድህ ነው |
| `src/components/settings/PasswordSettings.jsx:130` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | Set Password | የሚስጥር ቃል መዲዛ ያስገቡ |
| `src/components/settings/PasswordSettings.jsx:133` | [NEVER-REVIEWED] | `inline-ternary` | Auth & onboarding | Saving... | በመያየዝ... |
| `src/components/settings/PasswordSettings.jsx:134` | [NEEDS-FIX] | `inline-ternary` | Auth & onboarding | Set Password | የሚስጥር ቃል መዲዛ ያስገቡ |
| `src/components/settings/PaymentChannelsSection.jsx:63` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Payment channels | የክፍያ መንገዶች |
| `src/components/settings/PaymentChannelsSection.jsx:76` | [NEVER-REVIEWED] | `inline-ternary` | Settings | configured | ተዋቅሯል |
| `src/components/settings/PaymentChannelsSection.jsx:93` | [VERIFIED] | `inline-ternary` | Settings | Search banks and wallets... | ባንኮች እና ዋሌቶችን ፈልጉ... |
| `src/components/settings/PaymentChannelsSection.jsx:113` | [VERIFIED] | `inline-ternary` | Settings | Mobile wallets | ሞባይል ዋሌት |
| `src/components/settings/PaymentChannelsSection.jsx:133` | [VERIFIED] | `inline-ternary` | Settings | Banks | ባንኮች |
| `src/components/settings/PaymentChannelsSection.jsx:155` | [NEVER-REVIEWED] | `inline-ternary` | Settings | No results | ምንም ውጤት አልተገኘም |
| `src/components/settings/PaymentChannelsSection.jsx:172` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Remove this channel? | ይህን መንገድ ይሰርዙ? |
| `src/components/settings/PaymentChannelsSection.jsx:173` | [NEVER-REVIEWED] | `inline-ternary` | Settings | This channel will be removed from your list. | ይህ መንገድ ከዝርዝርዎ ይወገዳል። |
| `src/components/settings/PaymentChannelsSection.jsx:174` | [VERIFIED] | `inline-ternary` | Settings | Remove | አስወግድ |
| `src/components/settings/PaymentChannelsSection.jsx:175` | [VERIFIED] | `inline-ternary` | Settings | Cancel | ሰርዝ |
| `src/components/settings/PaymentChannelsSection.jsx:221` | [VERIFIED] | `inline-ternary` | Settings | Remove | አስወግድ |
| `src/components/settings/PaymentChannelsSection.jsx:264` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Same as shop phone | ከሱቅ ስልክ ጋር አንድ |
| `src/components/settings/ReminderSettings.jsx:13` | [NEVER-REVIEWED] | `locale-object` | Settings | Daily | በየቀኑ |
| `src/components/settings/ReminderSettings.jsx:14` | [NEVER-REVIEWED] | `locale-object` | Settings | Weekly | በየሳምንቱ |
| `src/components/settings/ReminderSettings.jsx:61` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Auto-reminders enabled | ራስ-ሰር ማስታወቂያ ተከፍቷል |
| `src/components/settings/ReminderSettings.jsx:62` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Auto-reminders paused | ራስ-ሰር ማስታወቂያ ተዘግቷል |
| `src/components/settings/ReminderSettings.jsx:67` | [VERIFIED] | `inline-ternary` | Settings | Failed to update | ማስተካከል አልተሳካም |
| `src/components/settings/ReminderSettings.jsx:83` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Reminder frequency updated | ድግግሞሽ ተስተካክሏል |
| `src/components/settings/ReminderSettings.jsx:89` | [VERIFIED] | `inline-ternary` | Settings | Failed to update | ማስተካከል አልተሳካም |
| `src/components/settings/ReminderSettings.jsx:101` | [NEVER-REVIEWED] | `inline-ternary` | Settings | AUTO REMINDERS | ራስ-ሰር ማስታወቂያ |
| `src/components/settings/ReminderSettings.jsx:108` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Reminder Notifications | ተገዢ ማስታወቂያ |
| `src/components/settings/ReminderSettings.jsx:117` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Reminders are paused | ማስታወቂያ ተዘግቷል |
| `src/components/settings/ReminderSettings.jsx:127` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Pause reminders | ማስታወቂያ አልተሰጠም |
| `src/components/settings/ReminderSettings.jsx:128` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Enable reminders | ማስታወቂያ አድረጹ |
| `src/components/settings/ReminderSettings.jsx:138` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Frequency: | ድግግሞሽ: |
| `src/components/settings/ReminderSettings.jsx:147` | [VERIFIED] | `inline-ternary` | Settings | Reminder frequency | ድግግሞሽ |
| `src/components/settings/SettingsGroupedPage.jsx:110` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Empty | ባዶ |
| `src/components/settings/SettingsGroupedPage.jsx:112` | [NEVER-REVIEWED] | `inline-ternary` | Settings | ${activeItems.length} saved items | ${activeItems.length} እቃዎች ተቀምጠዋል |
| `src/components/settings/SettingsGroupedPage.jsx:113` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Add to get started | ለመጀመር ይጨምሩ |
| `src/components/settings/SettingsGroupedPage.jsx:115` | [NEVER-REVIEWED] | `inline-ternary` | Settings | None | ባዶ |
| `src/components/settings/SettingsGroupedPage.jsx:117` | [NEVER-REVIEWED] | `inline-ternary` | Settings | ${recurringCount} monthly bills | ${recurringCount} ወርሃዊ ወጪ |
| `src/components/settings/SettingsGroupedPage.jsx:118` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Rent, internet, electricity, etc. | ኪራይ፣ ኢንተርኔት፣ ወዘተ |
| `src/components/settings/SettingsGroupedPage.jsx:122` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Set up a payment channel | አንድ መንገድ ያዋቅሩ |
| `src/components/settings/SettingsGroupedPage.jsx:167` | [NEVER-REVIEWED] | `inline-ternary` | Settings | No name | ስም የለም |
| `src/components/settings/SettingsGroupedPage.jsx:168` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Partial | ይጨምሩ |
| `src/components/settings/SettingsGroupedPage.jsx:168` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Set | ተዋቅሯል |
| `src/components/settings/SettingsGroupedPage.jsx:213` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Overdue threshold | የዘገዬ ጊዜ |
| `src/components/settings/SettingsGroupedPage.jsx:256` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Notification preferences | የማስጠንቂያ ምርጫ |
| `src/components/settings/SettingsGroupedPage.jsx:268` | [NEVER-REVIEWED] | `inline-ternary` | Settings | AUTO REMINDERS | ራስ-ሰር ማስታወቂያ |
| `src/components/settings/SettingsGroupedPage.jsx:283` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Empty | ባዶ |
| `src/components/settings/SettingsGroupedPage.jsx:317` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Dark/light mode, hide amounts | ጨለማ/ብርሃን ሁነታ፣ መጠኖችን ደብቅ |
| `src/components/settings/SettingsGroupedPage.jsx:329` | [NEVER-REVIEWED] | `inline-ternary` | Settings | EN | አማ |
| `src/components/settings/SettingsGroupedPage.jsx:335` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Language | ቋንቋ |
| `src/components/settings/SettingsGroupedPage.jsx:348` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Switch to አማር‌ኛ | አማር‌ኛ በመረጡት |
| `src/components/settings/SettingsGroupedPage.jsx:360` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Get answers, report a problem | ጥያቄዎችን ያግኙ፡ ችግር ያመልክቱ |
| `src/components/settings/tabs/DataTab.jsx:25` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Empty | ባዶ |
| `src/components/settings/tabs/DataTab.jsx:58` | [VERIFIED] | `inline-ternary` | Settings | Your Data | የእርስዎ ውሂብ |
| `src/components/settings/tabs/DataTab.jsx:77` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Display & Privacy | ማሳያ እና ግላዊነት |
| `src/components/settings/tabs/DataTab.jsx:78` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Dark/light mode, hide amounts | ጨለማ/ብርሃን ሁነታ፣ መጠኖችን ደብቅ |
| `src/components/settings/tabs/DataTab.jsx:88` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Error & usage reporting | የስህተት እና አጠቃቀም ሪፖርት |
| `src/components/settings/tabs/DataTab.jsx:100` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Error & usage reporting | የስህተት እና አጠቃቀም ሪፖርት |
| `src/components/settings/tabs/DataTab.jsx:117` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Install the App | መተግበሪያውን ይጫኑ |
| `src/components/settings/tabs/DataTab.jsx:118` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Use it like a native app — works offline too | እንደ መተግበሪያ ይክፈቱ — ከመስመር ውጭም ይሰራል |
| `src/components/settings/tabs/DataTab.jsx:128` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Sync Status | ማስተካከያ |
| `src/components/settings/tabs/DataTab.jsx:129` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Cloud sync status & backup | የውሂብ መስተካከያ ማስታወሻ |
| `src/components/settings/tabs/DataTab.jsx:138` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Help & Support | እርዳታ እና ድጋፍ |
| `src/components/settings/tabs/DataTab.jsx:139` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Get answers, report a problem | ጥያቄዎችን ያግኙ፡ ችግር ያመልክቱ |
| `src/components/settings/tabs/DataTab.jsx:145` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Common Questions | ተደጋጋሚ ጥያቄዎች |
| `src/components/settings/tabs/DataTab.jsx:148` | [NEVER-REVIEWED] | `inline-ternary` | Settings | How do I remind a customer about dubie? | ዱቤ እንዴት ላስታውሳል? |
| `src/components/settings/tabs/DataTab.jsx:156` | [NEVER-REVIEWED] | `inline-ternary` | Settings | How do I add a discount to a sale? | ሽያጭ ሲመዘገብ ቅናሽ እንዴት ልጨምር? |
| `src/components/settings/tabs/DataTab.jsx:164` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Where is my data stored? | ውሂቤ ወዴት ይሄዳል? |
| `src/components/settings/tabs/DataTab.jsx:179` | [NEVER-REVIEWED] | `inline-ternary` | Settings | About Gebya | ስለ ገበያ |
| `src/components/settings/tabs/DataTab.jsx:187` | [NEVER-REVIEWED] | `inline-ternary` | Settings | All data stays on this phone only | ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል |
| `src/components/settings/tabs/DataTab.jsx:191` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Built | የግንባታ ቀን |
| `src/components/settings/tabs/MoneyTab.jsx:27` | [NEVER-REVIEWED] | `inline-ternary` | Settings | configured | መንገድ ዝግጁ |
| `src/components/settings/tabs/MoneyTab.jsx:28` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Set up a payment channel | አንድ መንገድ ያዋቅሩ |
| `src/components/settings/tabs/MoneyTab.jsx:47` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Payment Channels | የክፍያ መንገዶች |
| `src/components/settings/tabs/MoneyTab.jsx:67` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Dubie (Credit) Rules | የዱቤ ህጎች |
| `src/components/settings/tabs/MoneyTab.jsx:68` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Overdue threshold · reminders in Data tab | የዘገዬ ጊዜ · ማስታወቂያ በውሂብ ውስጥ |
| `src/components/settings/tabs/ShopTab.jsx:23` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Empty | ባዶ |
| `src/components/settings/tabs/ShopTab.jsx:26` | [NEVER-REVIEWED] | `inline-ternary` | Settings | ${activeItems.length} saved items | ${activeItems.length} እቃዎች ተቀምጠዋል |
| `src/components/settings/tabs/ShopTab.jsx:27` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Add to get started | ለመጀመር ይጨምሩ |
| `src/components/settings/tabs/ShopTab.jsx:30` | [NEVER-REVIEWED] | `inline-ternary` | Settings | None | ባዶ |
| `src/components/settings/tabs/ShopTab.jsx:33` | [NEVER-REVIEWED] | `inline-ternary` | Settings | ${recurringCount} monthly bills | ${recurringCount} ወርሃዊ ወጪ |
| `src/components/settings/tabs/ShopTab.jsx:34` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Rent, internet, electricity, etc. | ኪራይ፣ ኢንተርኔት፣ ወዘተ |
| `src/components/settings/tabs/ShopTab.jsx:58` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Shop Profile | የሱቅ መገለጫ |
| `src/components/settings/tabs/ShopTab.jsx:59` | [NEVER-REVIEWED] | `inline-ternary` | Settings | No name | ስም የለም |
| `src/components/settings/tabs/ShopTab.jsx:60` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Partial | ይጨምሩ |
| `src/components/settings/tabs/ShopTab.jsx:60` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Set | ተዋቅሯል |
| `src/components/settings/tabs/ShopTab.jsx:71` | [VERIFIED] | `inline-ternary` | Settings | Items | እቃዎች |
| `src/components/settings/tabs/ShopTab.jsx:88` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Recurring Expenses | ወርሃዊ ወጪ |
| `src/components/SettingsPage.jsx:62` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Owner | ባለቤት |
| `src/components/SettingsPage.jsx:63` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Manager | ሥራ አስኪያጅ |
| `src/components/SettingsPage.jsx:64` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Staff | ሰራተኛ |
| `src/components/SettingsPage.jsx:192` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Shop | ሱቅ |
| `src/components/SettingsPage.jsx:200` | [NEVER-REVIEWED] | `inline-ternary` | Settings | No phone added | ስልክ አልተጨመረም |
| `src/components/SettingsPage.jsx:217` | [NEVER-REVIEWED] | `inline-ternary` | Settings | Switch to አማር‌ኛ | አማር‌ኛ በመረጡት |
| `src/components/SettingsPage.jsx:382` | [NEVER-REVIEWED] | `inline-ternary` | Settings | App info | መስመርቻ መረጃ |
| `src/components/SettingsPage.jsx:389` | [NEVER-REVIEWED] | `inline-ternary` | Settings | more taps | ተጨማሪ መታ |
| `src/components/SideNav.jsx:5` | [NEVER-REVIEWED] | `locale-object` | App shell | Today | የዛሬ |
| `src/components/SideNav.jsx:6` | [VERIFIED] | `locale-object` | App shell | Credit | ዱቤ |
| `src/components/SideNav.jsx:7` | [VERIFIED] | `locale-object` | App shell | Report | ሪፖርት |
| `src/components/SideNav.jsx:8` | [NEVER-REVIEWED] | `locale-object` | App shell | Staff | ሰራተኞች |
| `src/components/SideNav.jsx:9` | [VERIFIED] | `locale-object` | App shell | More | ተጨማሪ |
| `src/components/staff/ReconStatusBadge.jsx:4` | [NEVER-REVIEWED] | `t-helper` | Staff | Waiting for your review | ሰራተኛ ልኳል |
| `src/components/staff/ReconStatusBadge.jsx:5` | [NEVER-REVIEWED] | `t-helper` | Staff | You reviewed — needs finalize | ባለቤት ተመልክቷል |
| `src/components/staff/ReconStatusBadge.jsx:6` | [NEVER-REVIEWED] | `t-helper` | Staff | Difference found | አልተስማማም |
| `src/components/staff/ReconStatusBadge.jsx:7` | [VERIFIED] | `t-helper` | Staff | Settled | ተጠናቋል |
| `src/components/staff/ReconStatusBadge.jsx:8` | [NEVER-REVIEWED] | `t-helper` | Staff | Counted directly | ተፈትሟል |
| `src/components/staff/StaffActivityFeed.jsx:41` | [VERIFIED] | `t-helper` | Staff | All | ሁሉም |
| `src/components/staff/StaffActivityFeed.jsx:42` | [VERIFIED] | `t-helper` | Staff | Sales | ሽያጭ |
| `src/components/staff/StaffActivityFeed.jsx:43` | [VERIFIED] | `t-helper` | Staff | Payments | ክፍያ |
| `src/components/staff/StaffActivityFeed.jsx:44` | [VERIFIED] | `t-helper` | Staff | Dubie | ዱቤ |
| `src/components/staff/StaffActivityFeed.jsx:60` | [VERIFIED] | `t-helper` | Staff | Today | ዛሬ |
| `src/components/staff/StaffActivityFeed.jsx:61` | [NEVER-REVIEWED] | `t-helper` | Staff | This week | በዚህ ሳምንት |
| `src/components/staff/StaffActivityFeed.jsx:62` | [NEVER-REVIEWED] | `t-helper` | Staff | This month | በዚህ ወር |
| `src/components/staff/StaffActivityFeed.jsx:63` | [NEVER-REVIEWED] | `t-helper` | Staff | Older | ቀደም ብሎ |
| `src/components/staff/StaffActivityFeed.jsx:115` | [NEVER-REVIEWED] | `t-helper` | Staff | activities | እንቅስቃሴዎች |
| `src/components/staff/StaffActivityFeed.jsx:116` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffActivityFeed.jsx:139` | [VERIFIED] | `t-helper` | Staff | Retry | እንደገና |
| `src/components/staff/StaffActivityFeed.jsx:152` | [NEVER-REVIEWED] | `t-helper` | Staff | Filter activities | የእንቅስቃሴ ያስተማረ |
| `src/components/staff/StaffAllMembers.jsx:39` | [NEVER-REVIEWED] | `t-helper` | Staff | All Staff | ሁሉም ሰራተኞች |
| `src/components/staff/StaffAllMembers.jsx:50` | [NEVER-REVIEWED] | `t-helper` | Staff | Search staff... | ሰራተኞችን ፈልግ... |
| `src/components/staff/StaffAllMembers.jsx:63` | [NEVER-REVIEWED] | `t-helper` | Staff | No matches | አልተገኘም |
| `src/components/staff/StaffAllMembers.jsx:63` | [NEVER-REVIEWED] | `t-helper` | Staff | No staff yet | እስካሁን ሰራተኞች የሉም |
| `src/components/staff/StaffAllMembers.jsx:96` | [NEVER-REVIEWED] | `t-helper` | Staff | Custom | የተበጀ |
| `src/components/staff/StaffAllMembers.jsx:106` | [VERIFIED] | `t-helper` | Staff | Active | ንቁ |
| `src/components/staff/StaffAllMembers.jsx:106` | [NEVER-REVIEWED] | `t-helper` | Staff | Inactive | ተሰናብቷል |
| `src/components/staff/StaffAllMembers.jsx:119` | [NEVER-REVIEWED] | `t-helper` | Staff | Role | ሚና |
| `src/components/staff/StaffAllMembers.jsx:123` | [NEVER-REVIEWED] | `t-helper` | Staff | Custom | የተበጀ |
| `src/components/staff/StaffAllMembers.jsx:158` | [NEVER-REVIEWED] | `t-helper` | Staff | Permissions | ፍቃዶች |
| `src/components/staff/StaffAllMembers.jsx:177` | [NEVER-REVIEWED] | `t-helper` | Staff | Owner permissions are full and cannot be edited | የባለቤት ፍቃዶች ሁሉም ሲሆኑ አይቀየሩም |
| `src/components/staff/StaffAllMembers.jsx:186` | [NEVER-REVIEWED] | `t-helper` | Staff | Deactivate | አቁም |
| `src/components/staff/StaffAllMembers.jsx:195` | [NEVER-REVIEWED] | `t-helper` | Staff | Reactivate | ንቁ አድርግ |
| `src/components/staff/StaffAttendance.jsx:43` | [NEVER-REVIEWED] | `t-helper` | Staff | Clocked in | ገባ |
| `src/components/staff/StaffAttendance.jsx:56` | [NEVER-REVIEWED] | `t-helper` | Staff | Clocked out | ወጣ |
| `src/components/staff/StaffAttendance.jsx:80` | [NEVER-REVIEWED] | `t-helper` | Staff | Attendance | መግቢያ መውጫ |
| `src/components/staff/StaffAttendance.jsx:85` | [NEVER-REVIEWED] | `t-helper` | Staff | Clock In | ግባ |
| `src/components/staff/StaffAttendance.jsx:89` | [NEVER-REVIEWED] | `t-helper` | Staff | Clock Out | ውጣ |
| `src/components/staff/StaffAttendance.jsx:98` | [NEVER-REVIEWED] | `t-helper` | Staff | Currently working | እየሠሩ ነው |
| `src/components/staff/StaffAttendance.jsx:107` | [NEVER-REVIEWED] | `t-helper` | Staff | No attendance records | የመግቢያ መውጫ ምዝገቦች የሉም |
| `src/components/staff/StaffAttendance.jsx:115` | [NEVER-REVIEWED] | `t-helper` | Staff | Now | አሁን |
| `src/components/staff/StaffAttendance.jsx:123` | [VERIFIED] | `t-helper` | Staff | Completed | ተጠናቀቀ |
| `src/components/staff/StaffCollectionForm.jsx:33` | [NEVER-REVIEWED] | `t-helper` | Staff | Submitted to owner | ለባለቤት አቀበረለክላው |
| `src/components/staff/StaffCollectionForm.jsx:36` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffCollectionForm.jsx:36` | [NEVER-REVIEWED] | `t-helper` | Staff | Cash: | ጥሬ: |
| `src/components/staff/StaffCollectionForm.jsx:38` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffCollectionForm.jsx:38` | [NEVER-REVIEWED] | `t-helper` | Staff | Transfer: | ዝውውር: |
| `src/components/staff/StaffCollectionForm.jsx:48` | [NEVER-REVIEWED] | `t-helper` | Staff | Difference found by owner | ባለቤት ልዙድ አስተዋውሏል |
| `src/components/staff/StaffCollectionForm.jsx:54` | [NEVER-REVIEWED] | `t-helper` | Staff | ✅ Settled by owner | ✅ ባለቤት ተስርቶ አደረገ |
| `src/components/staff/StaffCollectionForm.jsx:62` | [NEVER-REVIEWED] | `t-helper` | Staff | Update submission | አሻሽል |
| `src/components/staff/StaffCollectionForm.jsx:69` | [NEVER-REVIEWED] | `t-helper` | Staff | Today recorded | ዛሬ የተመዘገበ |
| `src/components/staff/StaffCollectionForm.jsx:71` | [NEVER-REVIEWED] | `t-helper` | Staff | sales | ሽያጮች |
| `src/components/staff/StaffCollectionForm.jsx:72` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffCollectionForm.jsx:72` | [NEVER-REVIEWED] | `t-helper` | Staff | Cash: | ጥሬ: |
| `src/components/staff/StaffCollectionForm.jsx:73` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffCollectionForm.jsx:73` | [NEVER-REVIEWED] | `t-helper` | Staff | Transfer: | ዝውውር: |
| `src/components/staff/StaffCollectionForm.jsx:79` | [NEVER-REVIEWED] | `t-helper` | Staff | Cash collected | የተሰበበ ጥሬ |
| `src/components/staff/StaffCollectionForm.jsx:89` | [NEVER-REVIEWED] | `t-helper` | Staff | Transfer | ዝውውር |
| `src/components/staff/StaffCollectionForm.jsx:104` | [NEVER-REVIEWED] | `t-helper` | Staff | cash | ጥሬ |
| `src/components/staff/StaffCollectionForm.jsx:109` | [NEVER-REVIEWED] | `t-helper` | Staff | Full amount | ሙሉ መጅን |
| `src/components/staff/StaffCollectionForm.jsx:115` | [VERIFIED] | `t-helper` | Staff | Note (optional) | ማስታወሻ |
| `src/components/staff/StaffCollectionForm.jsx:129` | [NEVER-REVIEWED] | `t-helper` | Staff | Submit collection | ስብስቡን ላክ |
| `src/components/staff/StaffCollectionForm.jsx:163` | [NEVER-REVIEWED] | `inline-ternary` | Staff | ✅ Owner accepted! Collection settled | ✅ ባለቤት ተቀባው አደረገ! ስብስብ ተስርቷል |
| `src/components/staff/StaffCollectionForm.jsx:168` | [NEVER-REVIEWED] | `inline-ternary` | Staff | ⚠️ Owner flagged a difference | ⚠️ ባለቤት ልዩነት አስተዋውሏል |
| `src/components/staff/StaffCollectionForm.jsx:173` | [NEVER-REVIEWED] | `inline-ternary` | Staff | 👀 Owner reviewed your submission | 👀 ባለቤት ስብስብ አድርጓል |
| `src/components/staff/StaffCollectionForm.jsx:186` | [NEVER-REVIEWED] | `t-helper` | Staff | Difference found by owner | ባለቤት ልዙድ አስተዋውሏል |
| `src/components/staff/StaffCollectionForm.jsx:192` | [NEVER-REVIEWED] | `t-helper` | Staff | ✅ Settled by owner | ✅ ባለቤት ተስርቶ አደረገ |
| `src/components/staff/StaffCollectionForm.jsx:204` | [NEVER-REVIEWED] | `t-helper` | Staff | My Collection | የእኔ ስብስብ |
| `src/components/staff/StaffCollectionForm.jsx:232` | [NEVER-REVIEWED] | `t-helper` | Staff | My Collection | የእኔ ስብስብ |
| `src/components/staff/StaffCollectionForm.jsx:232` | [NEVER-REVIEWED] | `t-helper` | Staff | Update Submission | አሻሽል |
| `src/components/staff/StaffCollectionForm.jsx:249` | [NEVER-REVIEWED] | `t-helper` | Staff | My Collection | የእኔ ስብስብ |
| `src/components/staff/StaffDeviceManager.jsx:4` | [NEVER-REVIEWED] | `t-helper` | Staff | Device Management | የመሳሪያ አስተዳደር |
| `src/components/staff/StaffDeviceManager.jsx:6` | [NEVER-REVIEWED] | `t-helper` | Staff | No pending devices | በመጠባበቅ ላይ ያሉ መሳሪያዎች የሉም |
| `src/components/staff/StaffDeviceManager.jsx:14` | [NEVER-REVIEWED] | `t-helper` | Staff | pending | በመጠባበቅ |
| `src/components/staff/StaffDeviceManager.jsx:20` | [NEVER-REVIEWED] | `t-helper` | Staff | Approve | አረጋግጥ |
| `src/components/staff/StaffDeviceManager.jsx:25` | [NEVER-REVIEWED] | `t-helper` | Staff | Reject | አቁም |
| `src/components/staff/StaffJoinCode.jsx:18` | [NEVER-REVIEWED] | `t-helper` | Staff | Failed to reset join code | ኮድ አልተሻከረም |
| `src/components/staff/StaffJoinCode.jsx:20` | [NEVER-REVIEWED] | `t-helper` | Staff | ✓ Join code reset | ✓ ኮድ ተሻከረ |
| `src/components/staff/StaffJoinCode.jsx:21` | [NEVER-REVIEWED] | `t-helper` | Staff | Failed to reset join code | ኮድ አልተሻከረም |
| `src/components/staff/StaffJoinCode.jsx:23` | [NEVER-REVIEWED] | `t-helper` | Staff | Failed to reset join code | ኮድ አልተሻከረም |
| `src/components/staff/StaffJoinCode.jsx:34` | [NEVER-REVIEWED] | `t-helper` | Staff | Join code | የመቀላቀል ኮድ |
| `src/components/staff/StaffJoinCode.jsx:47` | [NEVER-REVIEWED] | `t-helper` | Staff | ✓ Code copied | ✓ ኮድ ተቀድሷል |
| `src/components/staff/StaffJoinCode.jsx:53` | [NEVER-REVIEWED] | `t-helper` | Staff | Copy | ቅዳ |
| `src/components/staff/StaffJoinCode.jsx:61` | [NEVER-REVIEWED] | `t-helper` | Staff | Join code | የመቀላቀል ኮድ |
| `src/components/staff/StaffJoinCode.jsx:62` | [NEVER-REVIEWED] | `t-helper` | Staff | Use this code to join my shop: | እንደምትቀላቀሉ ኮድ: |
| `src/components/staff/StaffJoinCode.jsx:69` | [VERIFIED] | `t-helper` | Staff | Share | አጋራ |
| `src/components/staff/StaffJoinCode.jsx:83` | [NEVER-REVIEWED] | `t-helper` | Staff | Reset code | ኮድ ለአዲስ |
| `src/components/staff/StaffJoinCode.jsx:83` | [NEVER-REVIEWED] | `t-helper` | Staff | Resetting… | ያስቀምጠል… |
| `src/components/staff/StaffJoinCode.jsx:104` | [NEVER-REVIEWED] | `t-helper` | Staff | Failed to generate join code | ኮድ አልተፈጠረም |
| `src/components/staff/StaffJoinCode.jsx:106` | [NEVER-REVIEWED] | `t-helper` | Staff | ✓ Join code generated | ✓ የመቀላቀል ኮድ ተፈጠረ |
| `src/components/staff/StaffJoinCode.jsx:107` | [NEVER-REVIEWED] | `t-helper` | Staff | Failed to generate join code | ኮድ አልተፈጠረም |
| `src/components/staff/StaffJoinCode.jsx:109` | [NEVER-REVIEWED] | `t-helper` | Staff | Failed to generate join code | ኮድ አልተፈጠረም |
| `src/components/staff/StaffJoinCode.jsx:116` | [NEVER-REVIEWED] | `t-helper` | Staff | Generate join code for staff | የመቀላቀል ኮድ ፍጠር |
| `src/components/staff/StaffJoinCode.jsx:119` | [NEVER-REVIEWED] | `t-helper` | Staff | Generate a code to share with staff so they can join your shop. | ሰራተኞች እንዲቀላቀሉ ኮድ ይፍጠሩ። |
| `src/components/staff/StaffPastSettlements.jsx:20` | [NEVER-REVIEWED] | `t-helper` | Settlements | Past Settlements | ያለፉ ማስተካከያዎች |
| `src/components/staff/StaffPastSettlements.jsx:25` | [NEVER-REVIEWED] | `t-helper` | Settlements | Needs review | ክለሳ ይፈልጋል |
| `src/components/staff/StaffPastSettlements.jsx:54` | [VERIFIED] | `t-helper` | Settlements | birr | ብር |
| `src/components/staff/StaffPerformanceDashboard.jsx:49` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffPerformanceDashboard.jsx:51` | [NEVER-REVIEWED] | `t-helper` | Staff | Avg | ጨርሳ |
| `src/components/staff/StaffPerformanceDashboard.jsx:51` | [NEVER-REVIEWED] | `t-helper` | Staff | txns | ግብት |
| `src/components/staff/StaffPerformanceDashboard.jsx:89` | [NEVER-REVIEWED] | `inline-ternary` | Staff | Staff | ሰራተኛ |
| `src/components/staff/StaffPerformanceDashboard.jsx:131` | [NEVER-REVIEWED] | `t-helper` | Staff | No staff data available | የሰራተኛ ዝርዝር የለም |
| `src/components/staff/StaffPerformanceDashboard.jsx:132` | [NEVER-REVIEWED] | `t-helper` | Staff | Staff performance data appears here once sales are recorded | የሰራተኛ አለም ምክንያት ብወጋል ለጠቅም ተመልከቱ |
| `src/components/staff/StaffPerformanceDashboard.jsx:143` | [NEVER-REVIEWED] | `t-helper` | Staff | Staff Performance | የሰራተኞች አለም |
| `src/components/staff/StaffPerformanceDashboard.jsx:146` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffPerformanceDashboard.jsx:146` | [NEVER-REVIEWED] | `t-helper` | Staff | Team Avg | ቡድን ጨርሳ |
| `src/components/staff/StaffPerformanceDashboard.jsx:174` | [NEVER-REVIEWED] | `inline-ternary` | Staff | Top Performer | ረዢ ሰራተኛ |
| `src/components/staff/StaffPerformanceDashboard.jsx:182` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffPerformanceDashboard.jsx:185` | [NEVER-REVIEWED] | `t-helper` | Staff | txns | ግብት |
| `src/components/staff/StaffPerformanceDashboard.jsx:196` | [NEVER-REVIEWED] | `t-helper` | Staff | Transactions | መዝገብ |
| `src/components/staff/StaffPerformanceDashboard.jsx:201` | [NEVER-REVIEWED] | `t-helper` | Staff | Total Sales | አጠቃ ብር |
| `src/components/staff/StaffPerformanceDashboard.jsx:206` | [NEVER-REVIEWED] | `t-helper` | Staff | Cash | ጥሬ |
| `src/components/staff/StaffPerformanceDashboard.jsx:211` | [NEVER-REVIEWED] | `t-helper` | Staff | Transfer | ዝውውር |
| `src/components/staff/StaffPerformanceDashboard.jsx:239` | [NEVER-REVIEWED] | `t-helper` | Staff | Active Staff | ንቁ ሰራተኞች |
| `src/components/staff/StaffPerformanceDashboard.jsx:240` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffPerformanceDashboard.jsx:240` | [NEVER-REVIEWED] | `t-helper` | Staff | Team Total | ቡድን ጥሬ |
| `src/components/staff/StaffTasks.jsx:39` | [NEVER-REVIEWED] | `t-helper` | Staff | Task created | ተግባር ተፈጥሯል |
| `src/components/staff/StaffTasks.jsx:63` | [NEVER-REVIEWED] | `t-helper` | Staff | Delete task? | ተግባሩን ማጥፋት ይፈልጋሉ? |
| `src/components/staff/StaffTasks.jsx:66` | [NEVER-REVIEWED] | `t-helper` | Staff | Deleted | ጥፋታል |
| `src/components/staff/StaffTasks.jsx:100` | [NEVER-REVIEWED] | `t-helper` | Staff | Due | የሚጠበቅበት |
| `src/components/staff/StaffTasks.jsx:110` | [VERIFIED] | `t-helper` | Staff | Done | ተጠናቀቀ |
| `src/components/staff/StaffTasks.jsx:114` | [NEVER-REVIEWED] | `t-helper` | Staff | Reopen | ክፍት |
| `src/components/staff/StaffTasks.jsx:118` | [VERIFIED] | `t-helper` | Staff | Delete | ሰርዝ |
| `src/components/staff/StaffTasks.jsx:130` | [NEVER-REVIEWED] | `t-helper` | Staff | Tasks | ተግባሮች |
| `src/components/staff/StaffTasks.jsx:137` | [NEVER-REVIEWED] | `t-helper` | Staff | Add Task | ተግባር ጨምር |
| `src/components/staff/StaffTasks.jsx:137` | [VERIFIED] | `t-helper` | Staff | Cancel | ሰርዝ |
| `src/components/staff/StaffTasks.jsx:147` | [NEVER-REVIEWED] | `t-helper` | Staff | Task title | የተግባር ርዕስ |
| `src/components/staff/StaffTasks.jsx:161` | [NEVER-REVIEWED] | `t-helper` | Staff | Low | ዝቅተኛ |
| `src/components/staff/StaffTasks.jsx:162` | [NEVER-REVIEWED] | `t-helper` | Staff | Medium | መካከለኛ |
| `src/components/staff/StaffTasks.jsx:163` | [NEVER-REVIEWED] | `t-helper` | Staff | High | ከፍተኛ |
| `src/components/staff/StaffTasks.jsx:164` | [NEVER-REVIEWED] | `t-helper` | Staff | Urgent | አጡ |
| `src/components/staff/StaffTasks.jsx:177` | [NEVER-REVIEWED] | `t-helper` | Staff | Create Task | ተግባር ፍጠር |
| `src/components/staff/StaffTasks.jsx:186` | [NEVER-REVIEWED] | `t-helper` | Staff | No tasks yet | እስካሁን ተግባሮች የሉም |
| `src/components/staff/StaffTodayTeam.jsx:70` | [NEVER-REVIEWED] | `t-helper` | Staff | pending | በመጠባበቅ |
| `src/components/staff/StaffTodayTeam.jsx:76` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffTodayTeam.jsx:76` | [NEVER-REVIEWED] | `t-helper` | Staff | sales | ሽያጮች |
| `src/components/staff/StaffTodayTeam.jsx:80` | [NEVER-REVIEWED] | `t-helper` | Staff | No sales today | ዛሬ ሽያጥ የለም |
| `src/components/staff/StaffTodayTeam.jsx:90` | [NEVER-REVIEWED] | `t-helper` | Staff | Review | መርምር |
| `src/components/staff/StaffTodayTeam.jsx:93` | [VERIFIED] | `t-helper` | Staff | Settled | ተቀምጧል |
| `src/components/staff/StaffTodayTeam.jsx:99` | [NEVER-REVIEWED] | `t-helper` | Staff | Settle | አስተካክል |
| `src/components/staff/StaffTodayTeam.jsx:112` | [VERIFIED] | `t-helper` | Staff | Items | እቃዎች |
| `src/components/staff/StaffTodayTeam.jsx:116` | [NEVER-REVIEWED] | `t-helper` | Staff | Cash Sales | ጥሬ ሽያጭ |
| `src/components/staff/StaffTodayTeam.jsx:120` | [NEVER-REVIEWED] | `t-helper` | Staff | Transfer | ዝውውር |
| `src/components/staff/StaffTodayTeam.jsx:133` | [NEVER-REVIEWED] | `t-helper` | Staff | Awaiting review | ክለሳ ይጠበቃል |
| `src/components/staff/StaffTodayTeam.jsx:133` | [NEVER-REVIEWED] | `t-helper` | Staff | Last settled | የመጨረሻ ማስተካከያ |
| `src/components/staff/StaffTodayTeam.jsx:133` | [NEVER-REVIEWED] | `t-helper` | Staff | Settled today | ዛሬ ተቀምጧል |
| `src/components/staff/StaffTodayTeam.jsx:137` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffTodayTeam.jsx:144` | [NEVER-REVIEWED] | `t-helper` | Staff | Today's transactions | የዛሬ ግብይቶች |
| `src/components/staff/StaffTodayTeam.jsx:151` | [NEVER-REVIEWED] | `t-helper` | Staff | Settle | አስተካክል |
| `src/components/staff/StaffTodayTeam.jsx:157` | [NEVER-REVIEWED] | `t-helper` | Staff | No sales recorded today | ዛሬ ምንም ሽያጥ የለም |
| `src/components/staff/StaffTodayTeam.jsx:169` | [VERIFIED] | `t-helper` | Staff | Sale | ሽያጭ |
| `src/components/staff/StaffTodayTeam.jsx:176` | [VERIFIED] | `t-helper` | Staff | Credit | ዱቤ |
| `src/components/staff/StaffTodayTeam.jsx:179` | [NEVER-REVIEWED] | `t-helper` | Staff | Trans | ዝውውር |
| `src/components/staff/StaffTodayTeam.jsx:182` | [NEVER-REVIEWED] | `t-helper` | Staff | Cash | ጥሬ |
| `src/components/staff/StaffTodayTeam.jsx:190` | [VERIFIED] | `t-helper` | Staff | Total | ጠቅላላ |
| `src/components/staff/StaffTodayTeam.jsx:192` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/staff/StaffTodayTeam.jsx:214` | [NEVER-REVIEWED] | `t-helper` | Staff | Inactive | ተሰናብቷል |
| `src/components/staff/StaffTodayTeam.jsx:221` | [NEVER-REVIEWED] | `t-helper` | Staff | Reactivate | ንቁ አድርግ |
| `src/components/staff/StaffTodayTeam.jsx:231` | [NEVER-REVIEWED] | `t-helper` | Staff | Today's Team | የዛሬ ቡድን |
| `src/components/staff/StaffTodayTeam.jsx:233` | [VERIFIED] | `t-helper` | Staff | active | ንቁ |
| `src/components/staff/StaffTodayTeam.jsx:243` | [NEVER-REVIEWED] | `t-helper` | Staff | Invite your first team member | የመጀመሪያ ሰራተኛዎን ይጋብዙ |
| `src/components/staff/StaffTodayTeam.jsx:244` | [NEVER-REVIEWED] | `t-helper` | Staff | No team members yet | እስካሁን የቡድን አባላት የሉም |
| `src/components/staff/StaffTodayTeam.jsx:251` | [NEVER-REVIEWED] | `t-helper` | Staff | Inactive | ያልነቃ |
| `src/components/StaffPage.jsx:238` | [NEVER-REVIEWED] | `t-helper` | Staff | Team | ቡድን |
| `src/components/StaffPage.jsx:239` | [VERIFIED] | `t-helper` | Staff | Today | ዛሬ |
| `src/components/StaffPage.jsx:240` | [NEVER-REVIEWED] | `t-helper` | Staff | Performance | አገልግሎት |
| `src/components/StaffPage.jsx:241` | [NEVER-REVIEWED] | `t-helper` | Staff | Settlements | ማስተካከያ |
| `src/components/StaffPage.jsx:242` | [NEVER-REVIEWED] | `t-helper` | Staff | Activity | እንቅስቃሴ |
| `src/components/StaffPage.jsx:280` | [NEVER-REVIEWED] | `t-helper` | Staff | Something went wrong in the staff page. Please try refreshing. | በየሰራተኛ ገጠ በዝሬ ቀረሽ. እባክዎ ይሞክሩ። |
| `src/components/StaffPage.jsx:280` | [NEVER-REVIEWED] | `t-helper` | Staff | Staff | የሰራተኛ |
| `src/components/StaffPage.jsx:285` | [NEVER-REVIEWED] | `t-helper` | Staff | Main navigation | ዋና አሸግንት |
| `src/components/StaffPage.jsx:307` | [NEVER-REVIEWED] | `t-helper` | Staff | Add Staff | ሰራተኛ አክሙ |
| `src/components/StaffPage.jsx:315` | [NEVER-REVIEWED] | `t-helper` | Staff | Add Staff Member | ሰራተኛ አክሙ |
| `src/components/StaffPage.jsx:318` | [NEVER-REVIEWED] | `t-helper` | Staff | Enter staff details to add them to your shop. | የሰራተኛ ዝርዝር ያስገቡ። |
| `src/components/StaffPage.jsx:328` | [NEVER-REVIEWED] | `t-helper` | Staff | Display name (optional) | ስም ለማሳጥ (አርጣ) |
| `src/components/StaffPage.jsx:332` | [VERIFIED] | `t-helper` | Staff | Display name | ስም |
| `src/components/StaffPage.jsx:340` | [VERIFIED] | `t-helper` | Staff | Phone number | ስልክ ቁጥር |
| `src/components/StaffPage.jsx:343` | [VERIFIED] | `t-helper` | Staff | Phone number | ስልክ ቁጥር |
| `src/components/StaffPage.jsx:347` | [NEVER-REVIEWED] | `t-helper` | Staff | Role | ሚና |
| `src/components/StaffPage.jsx:353` | [NEVER-REVIEWED] | `t-helper` | Staff | Role | ሚና |
| `src/components/StaffPage.jsx:355` | [NEVER-REVIEWED] | `t-helper` | Staff | Cashier | ክራሚያ |
| `src/components/StaffPage.jsx:356` | [NEVER-REVIEWED] | `t-helper` | Staff | Viewer | ተመልካች |
| `src/components/StaffPage.jsx:357` | [NEVER-REVIEWED] | `t-helper` | Staff | Manager | አስተዳዳሪ |
| `src/components/StaffPage.jsx:358` | [NEVER-REVIEWED] | `t-helper` | Staff | Trusted Staff | ተስፋ ያለው ሰራተኛ |
| `src/components/StaffPage.jsx:373` | [VERIFIED] | `t-helper` | Staff | Cancel | ሰርዝ |
| `src/components/StaffPage.jsx:379` | [NEVER-REVIEWED] | `t-helper` | Staff | A valid Ethiopian phone number is required | ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስፈልጋል |
| `src/components/StaffPage.jsx:396` | [NEVER-REVIEWED] | `t-helper` | Staff | Failed to add staff. Please try again. | ሰራተኛ ማከል አልተመለሰም። |
| `src/components/StaffPage.jsx:405` | [NEVER-REVIEWED] | `t-helper` | Staff | Add | አክሙ |
| `src/components/StaffPage.jsx:440` | [NEVER-REVIEWED] | `t-helper` | Staff | Staff submissions pending review | የሰራተኞች ስብስብ ክለሳ ይፈልጋል |
| `src/components/StaffPage.jsx:443` | [NEVER-REVIEWED] | `t-helper` | Staff | staff member(s) have submitted their collection | ሰራተኞች ስብስባቸውን ልከዋል |
| `src/components/StaffPage.jsx:449` | [NEVER-REVIEWED] | `t-helper` | Staff | Review | ክለሳ |
| `src/components/StaffPage.jsx:460` | [NEVER-REVIEWED] | `t-helper` | Staff | Needs attention | ክለሳ ይፈልጋል |
| `src/components/StaffPage.jsx:473` | [NEVER-REVIEWED] | `t-helper` | Staff | Last settled | የመጨረሻ ማስተካከያ |
| `src/components/StaffPage.jsx:473` | [NEVER-REVIEWED] | `t-helper` | Staff | Never settled | በጭረት አላስተካከለም |
| `src/components/StaffPage.jsx:476` | [VERIFIED] | `t-helper` | Staff | birr | ብር |
| `src/components/StaffPage.jsx:476` | [NEVER-REVIEWED] | `t-helper` | Staff | Est. | ተገምቶ |
| `src/components/StaffPage.jsx:485` | [NEVER-REVIEWED] | `t-helper` | Staff | Review | መርምር |
| `src/components/StaffPage.jsx:491` | [NEVER-REVIEWED] | `t-helper` | Staff | Settle | አስተካክል |
| `src/components/StaffPage.jsx:554` | [NEVER-REVIEWED] | `t-helper` | Staff | Activity Feed | የእንቅስቃሴ መረጃ |
| `src/components/StaffPage.jsx:609` | [NEVER-REVIEWED] | `t-helper` | Staff | Remove all permissions? | ሁሉም ፍቃዶች ይቺርዳሉ? |
| `src/components/StaffPage.jsx:610` | [NEVER-REVIEWED] | `t-helper` | Staff | This staff member will not be able to do anything in the app. Proceed? | ይህ ሰራተኛ በቀላሉ ምንም አይችልም። ሙሉ? |
| `src/components/StaffPage.jsx:611` | [NEVER-REVIEWED] | `t-helper` | Staff | Proceed | ሙሉ |
| `src/components/StaffPage.jsx:612` | [VERIFIED] | `t-helper` | Staff | Cancel | ሰርዝ |
| `src/components/StaffPage.jsx:620` | [NEVER-REVIEWED] | `t-helper` | Staff | Grant "${store.pendingPermChange.label}"? | "${store.pendingPermChange.label}" ይስጡ? |
| `src/components/StaffPage.jsx:620` | [NEVER-REVIEWED] | `t-helper` | Staff | Revoke "${store.pendingPermChange.label}"? | "${store.pendingPermChange.label}" ያስወግዱ? |
| `src/components/StaffPage.jsx:621` | [NEVER-REVIEWED] | `t-helper` | Staff | Change permission for ${store.pendingPermChange.member.displayName \|\| store.pendingPermChange.member.display_name \|\| 'this member'}? | ለ${store.pendingPermChange.member.displayName \|\| store.pendingPermChange.member.display_name \|\| 'ይህ አባል'} ፍቃድ ይቀየር? |
| `src/components/StaffPage.jsx:622` | [NEVER-REVIEWED] | `t-helper` | Staff | Confirm | አረጋግጥ |
| `src/components/StaffPage.jsx:623` | [VERIFIED] | `t-helper` | Staff | Cancel | ሰርዝ |
| `src/components/StaffPage.jsx:631` | [NEVER-REVIEWED] | `t-helper` | Staff | Change role to ${store.pendingRoleChange.label}? | ሚና ወደ ${store.pendingRoleChange.label} ይቀየር? |
| `src/components/StaffPage.jsx:632` | [NEVER-REVIEWED] | `t-helper` | Staff | This will update ${store.pendingRoleChange.member.displayName \|\| store.pendingRoleChange.member.display_name \|\| 'this member'}'s permissions to match the ${store.pendingRoleChange.label} role. | የ${store.pendingRoleChange.member.displayName \|\| store.pendingRoleChange.member.display_name \|\| 'ይህ አባል'} ፍቃዶች ወደ ${store.pendingRoleChange.label} ሚና ይቀየራሉ። |
| `src/components/StaffPage.jsx:633` | [NEVER-REVIEWED] | `t-helper` | Staff | Change Role | ሚና ቀይር |
| `src/components/StaffPage.jsx:634` | [VERIFIED] | `t-helper` | Staff | Cancel | ሰርዝ |
| `src/components/StaffPage.jsx:642` | [NEVER-REVIEWED] | `t-helper` | Staff | Deactivate ${store.pendingDeactivation.name}? | ${store.pendingDeactivation.name}ን ያቁሙ? |
| `src/components/StaffPage.jsx:643` | [NEVER-REVIEWED] | `t-helper` | Staff | They will not be able to access the shop until reactivated. Their sales history is preserved. | እስኪነቁ ድረስ ሱቁን መጠቀም አይችሉም። የሽያጭ ታሪካቸው ይቆያል። |
| `src/components/StaffPage.jsx:644` | [NEVER-REVIEWED] | `t-helper` | Staff | Deactivate | አቁም |
| `src/components/StaffPage.jsx:645` | [VERIFIED] | `t-helper` | Staff | Cancel | ሰርዝ |
| `src/components/StaffPage.jsx:651` | [NEVER-REVIEWED] | `t-helper` | Staff | Could not deactivate — please try again | ማቆም አልተቻለም — እባክዎ እንደገና ይሞክሩ |
| `src/components/SupplierDetail.jsx:112` | [VERIFIED] | `inline-ternary` | Suppliers | Back | ተመለስ |
| `src/components/SupplierDetail.jsx:123` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | OPEN | ቆይቷል |
| `src/components/SupplierDetail.jsx:133` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Edit supplier | አስተካክል |
| `src/components/SupplierDetail.jsx:166` | [VERIFIED] | `inline-ternary` | Suppliers | Add photo | ፎቶ ይጨምሩ |
| `src/components/SupplierDetail.jsx:207` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | No phone | ስልክ የለም |
| `src/components/SupplierDetail.jsx:243` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | open | ቆይቷል |
| `src/components/SupplierDetail.jsx:250` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | I owe | ለመክፈል |
| `src/components/SupplierDetail.jsx:262` | [VERIFIED] | `inline-ternary` | Suppliers | birr | ብር |
| `src/components/SupplierDetail.jsx:272` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | entries | መዝገብ |
| `src/components/SupplierDetail.jsx:276` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | First purchase | የመጀመሪያ ግዢ |
| `src/components/SupplierDetail.jsx:297` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | entries | መዝገብ |
| `src/components/SupplierDetail.jsx:297` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | History | መዝገብ |
| `src/components/SupplierDetail.jsx:305` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | No entries yet | መዝገብ የለም |
| `src/components/SupplierDetail.jsx:348` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | entries | መዝገብ |
| `src/components/SupplierDetail.jsx:386` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | PURCHASE (+) | ግዢ ጨምር (+) |
| `src/components/SupplierDetail.jsx:404` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | PAY (-) | ክፍያ (-) |
| `src/components/SupplierDetail.jsx:410` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Saved on this phone only | መረጃው በዚህ ስልክ ብቻ ይቀመጣል |
| `src/components/SupplierDetail.jsx:458` | [VERIFIED] | `inline-ternary` | Suppliers | Payment | ክፍያ |
| `src/components/SupplierDetail.jsx:459` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Purchase | ግዢ |
| `src/components/SupplierForm.jsx:83` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Edit supplier | አቅራቢ አስተካክል |
| `src/components/SupplierForm.jsx:84` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Add supplier | አቅራቢ አክል |
| `src/components/SupplierForm.jsx:87` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Someone you buy from on credit | የምትገዙበት ሰው |
| `src/components/SupplierForm.jsx:143` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Take a photo (optional) | ፎቶ ይውሰዱ (አማራጭ) |
| `src/components/SupplierForm.jsx:162` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Replace | መልሰው ይውሰዱ |
| `src/components/SupplierForm.jsx:171` | [VERIFIED] | `inline-ternary` | Suppliers | Remove | አስወግድ |
| `src/components/SupplierForm.jsx:184` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Add Photo | ፎቶ ይምረጡ |
| `src/components/SupplierForm.jsx:197` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Supplier name | የአቅራቢ ስም |
| `src/components/SupplierForm.jsx:203` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | e.g. Kiros Coffee Wholesale | ለምሳሌ ቡና ቤት ኪሮስ |
| `src/components/SupplierForm.jsx:213` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Phone | ስልክ |
| `src/components/SupplierForm.jsx:215` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | optional | አማራጭ |
| `src/components/SupplierForm.jsx:270` | [VERIFIED] | `inline-ternary` | Suppliers | Note (optional) | ማስታወሻ (አማራጭ) |
| `src/components/SupplierForm.jsx:275` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | e.g. wholesale coffee distributor | ለምሳሌ ጥቅል ቡና አከፋፋይ |
| `src/components/SupplierForm.jsx:283` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Stored on this phone only | መረጃው በዚህ ስልክ ላይ ብቻ ይቀመጣል |
| `src/components/SupplierForm.jsx:300` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Saving… | እያስቀመጥኩ… |
| `src/components/SupplierForm.jsx:302` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Save changes | አስተካክል |
| `src/components/SupplierForm.jsx:303` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Save supplier | አስቀምጥ |
| `src/components/SupplierTransactionSheet.jsx:120` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | ✏️ Edit payment | ✏️ ክፍያ አስተካክል |
| `src/components/SupplierTransactionSheet.jsx:121` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | ✏️ Edit purchase | ✏️ ግዢ አስተካክል |
| `src/components/SupplierTransactionSheet.jsx:123` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | − Payment | − ክፍያ |
| `src/components/SupplierTransactionSheet.jsx:124` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | + Buy | + ግዢ |
| `src/components/SupplierTransactionSheet.jsx:126` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Update | አስተካክል |
| `src/components/SupplierTransactionSheet.jsx:128` | [VERIFIED] | `inline-ternary` | Suppliers | Save payment | ክፍያ አስቀምጥ |
| `src/components/SupplierTransactionSheet.jsx:129` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Save purchase | ግዢ አስቀምጥ |
| `src/components/SupplierTransactionSheet.jsx:194` | [VERIFIED] | `inline-ternary` | Suppliers | Back | ተመለስ |
| `src/components/SupplierTransactionSheet.jsx:229` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Currently owed | አሁን ለመክፈል |
| `src/components/SupplierTransactionSheet.jsx:232` | [VERIFIED] | `inline-ternary` | Suppliers | birr | ብር |
| `src/components/SupplierTransactionSheet.jsx:238` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | After | ከዚህ በኋላ |
| `src/components/SupplierTransactionSheet.jsx:241` | [VERIFIED] | `inline-ternary` | Suppliers | birr | ብር |
| `src/components/SupplierTransactionSheet.jsx:249` | [VERIFIED] | `inline-ternary` | Suppliers | Amount | መጠን |
| `src/components/SupplierTransactionSheet.jsx:270` | [VERIFIED] | `inline-ternary` | Suppliers | birr | ብር |
| `src/components/SupplierTransactionSheet.jsx:279` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Payment Method | የክፍያ ዘዴ |
| `src/components/SupplierTransactionSheet.jsx:314` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Nothing outstanding to pay | ለመክፈል ምንም የለም |
| `src/components/SupplierTransactionSheet.jsx:319` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Payment exceeds what is owed | ከዱቤ በላይ ነው |
| `src/components/SupplierTransactionSheet.jsx:326` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Note (optional) | መልእክት (አማራጭ) |
| `src/components/SupplierTransactionSheet.jsx:331` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | e.g. current stock status | ለምሳሌ የትንዳገብ ወቅታዊ ሁኔታ |
| `src/components/SupplierTransactionSheet.jsx:343` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | What did you buy (optional) | ምን ገዙ (አማራጭ) |
| `src/components/SupplierTransactionSheet.jsx:350` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | e.g. 5 bags coffee | ለምሳሌ 5 ቦርሳ ቡና |
| `src/components/SupplierTransactionSheet.jsx:406` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | photos | ፎቶዎች |
| `src/components/SupplierTransactionSheet.jsx:454` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Due date (optional) | የሚከፈልበት ቀን |
| `src/components/SupplierTransactionSheet.jsx:486` | [VERIFIED] | `inline-ternary` | Suppliers | Pick | ምረጥ |
| `src/components/SupplierTransactionSheet.jsx:515` | [NEVER-REVIEWED] | `inline-ternary` | Suppliers | Saving… | እያስቀመጥኩ… |
| `src/components/SyncStatusIndicator.jsx:63` | [NEVER-REVIEWED] | `inline-ternary` | Other | No auth token. Manual sync will not upload data. | የሂለው መረጃ ይስጠው አለህ። ከዚህ ማስተካከያ ይቀኝባታ። |
| `src/components/SyncStatusIndicator.jsx:123` | [NEVER-REVIEWED] | `inline-ternary` | Other | Just now | አሁን |
| `src/components/SyncStatusIndicator.jsx:124` | [NEVER-REVIEWED] | `inline-ternary` | Other | ago | በፊት |
| `src/components/SyncStatusIndicator.jsx:124` | [NEVER-REVIEWED] | `inline-ternary` | Other | min | ደቂቃ |
| `src/components/SyncStatusIndicator.jsx:127` | [NEVER-REVIEWED] | `inline-ternary` | Other | ago | በፊት |
| `src/components/SyncStatusIndicator.jsx:127` | [NEVER-REVIEWED] | `inline-ternary` | Other | hr | ሰዓት |
| `src/components/SyncStatusIndicator.jsx:130` | [NEVER-REVIEWED] | `inline-ternary` | Other | ago | በፊት |
| `src/components/SyncStatusIndicator.jsx:130` | [VERIFIED] | `inline-ternary` | Other | day | ቀን |
| `src/components/SyncStatusIndicator.jsx:140` | [VERIFIED] | `inline-ternary` | Other | Retry | እንደገና ሞክር |
| `src/components/SyncStatusIndicator.jsx:148` | [NEVER-REVIEWED] | `inline-ternary` | Other | Syncing... | የተላሳዊ ማስተካከያ... |
| `src/components/SyncStatusIndicator.jsx:157` | [NEVER-REVIEWED] | `inline-ternary` | Other | Pending | የተመለከተው |
| `src/components/SyncStatusIndicator.jsx:159` | [NEVER-REVIEWED] | `inline-ternary` | Other | Sync | ማስተካከያ |
| `src/components/SyncStatusIndicator.jsx:169` | [NEVER-REVIEWED] | `inline-ternary` | Other | Sync | ማስተካከያ |
| `src/components/SyncStatusIndicator.jsx:176` | [NEVER-REVIEWED] | `inline-ternary` | Other | First sync pending | የመጀመሪያ ማስተካከያ |
| `src/components/SyncStatusIndicator.jsx:178` | [NEVER-REVIEWED] | `inline-ternary` | Other | Sync | ማስተካከያ |
| `src/components/TimelineView.jsx:23` | [VERIFIED] | `inline-ternary` | Other | All | ሁሉም |
| `src/components/TimelineView.jsx:24` | [VERIFIED] | `inline-ternary` | Other | Sales | ሽያጭ |
| `src/components/TimelineView.jsx:25` | [VERIFIED] | `inline-ternary` | Other | Expenses | ወጪ |
| `src/components/TimelineView.jsx:26` | [NEVER-REVIEWED] | `inline-ternary` | Other | Collections | መሰብሰብ |
| `src/components/TimelineView.jsx:27` | [VERIFIED] | `inline-ternary` | Other | Credit | ዱቤ |
| `src/components/TimelineView.jsx:39` | [NEVER-REVIEWED] | `inline-ternary` | Other | ½ Partial | ½ ከፊል |
| `src/components/TimelineView.jsx:43` | [NEVER-REVIEWED] | `inline-ternary` | Other | Cash | ጥሬ |
| `src/components/TimelineView.jsx:61` | [NEVER-REVIEWED] | `inline-ternary` | Other | Export | ላክ |
| `src/components/TimelineView.jsx:98` | [NEVER-REVIEWED] | `inline-ternary` | Other | No entries yet | ምንም እንቅስቃሴ የለም |
| `src/components/TimelineView.jsx:127` | [NEVER-REVIEWED] | `inline-ternary` | Other | Record | መዝገብ |
| `src/components/TodayBusiness.jsx:62` | [NEVER-REVIEWED] | `inline-ternary` | Other | · today's sales | · የዛሬ ሽያጭ |
| `src/components/TodayBusiness.jsx:86` | [NEVER-REVIEWED] | `inline-ternary` | Other | 💵 Cash | 💵 ጥሬ ገንዘብ |
| `src/components/TodayBusiness.jsx:87` | [NEVER-REVIEWED] | `inline-ternary` | Other | 📱 Digital | 📱 ዲጂታል |
| `src/components/TodayBusiness.jsx:88` | [NEVER-REVIEWED] | `inline-ternary` | Other | 📤 Expenses | 📤 ወጪ |
| `src/components/TodayBusiness.jsx:89` | [NEVER-REVIEWED] | `inline-ternary` | Other | 💰 Collections | 💰 የዕዳ መሰብሰብ |
| `src/components/TodayBusiness.jsx:97` | [NEVER-REVIEWED] | `inline-ternary` | Other | Partial payments | ከፊል ክፍያዎች |
| `src/components/TodayBusiness.jsx:99` | [NEVER-REVIEWED] | `inline-ternary` | Other | 💵 Received · cash | 💵 በጥሬ የተቀበለ |
| `src/components/TodayBusiness.jsx:100` | [NEVER-REVIEWED] | `inline-ternary` | Other | 📱 Received · bank/wallet | 📱 በባንክ/ዋሌት የተቀበለ |
| `src/components/TodayBusiness.jsx:101` | [NEVER-REVIEWED] | `inline-ternary` | Other | ↩ Still owed (Dubie) | ↩ ገና ያልተከፈለ (ዱቤ) |
| `src/components/TodayBusiness.jsx:105` | [NEVER-REVIEWED] | `inline-ternary` | Other | 💵 Cash you should have | 💵 ሊኖርህ የሚገባ ገንዘብ |
| `src/components/TodayBusiness.jsx:108` | [NEVER-REVIEWED] | `inline-ternary` | Other | ↓ Cash in hand | ↓ በእጅህ ያለ ገንዘብ |
| `src/components/TodayBusiness.jsx:110` | [NEVER-REVIEWED] | `inline-ternary` | Other | 📊 Difference | 📊 ልዩነት |
| `src/components/TodayBusiness.jsx:122` | [NEVER-REVIEWED] | `inline-ternary` | Other | Cash I counted | የቆጠርኩት ጥሬ ገንዘብ |
| `src/components/TodayBusiness.jsx:123` | [NEVER-REVIEWED] | `inline-ternary` | Other | Cash in hand | በእጅህ ያለ ገንዘብ |
| `src/components/TodayBusiness.jsx:150` | [NEVER-REVIEWED] | `inline-ternary` | Other | Check | አረጋግጥ |
| `src/components/TodayBusiness.jsx:151` | [VERIFIED] | `inline-ternary` | Other | Close | ዝጋ |
| `src/components/TodayTab.jsx:125` | [VERIFIED] | `inline-ternary` | Other | ENTRIES | ምዝገባዎች |
| `src/components/TodayTab.jsx:128` | [VERIFIED] | `inline-ternary` | Other | Share | አጋራ |
| `src/components/TodayTab.jsx:135` | [VERIFIED] | `inline-ternary` | Other | No entries yet | ገና ምንም ምዝገባ የለም |
| `src/components/TodayTab.jsx:136` | [VERIFIED] | `inline-ternary` | Other | Tap above to start | ለመጀመር ከላይ ይጫኑ |
| `src/components/TransactionForm.jsx:299` | [VERIFIED] | `inline-ternary` | Transactions — form | ETB | ብር |
| `src/components/TransactionForm.jsx:302` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Save Credit · ${fmt(sellingPrice)} ETB | ዱቤ አስቀምጥ · ${fmt(sellingPrice)} ${currency} |
| `src/components/TransactionForm.jsx:303` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Save ${fmt(sellingPrice)} ETB | አስቀምጥ · ${fmt(sellingPrice)} ${currency} |
| `src/components/TransactionForm.jsx:304` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Add amount to save photo sale | ለፎቶ ሽያጭ መጠን ያክሉ |
| `src/components/TransactionForm.jsx:304` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Save | አስቀምጥ |
| `src/components/TransactionForm.jsx:310` | [VERIFIED] | `inline-ternary` | Transactions — form | Back | ተመለስ |
| `src/components/TransactionForm.jsx:310` | [VERIFIED] | `inline-ternary` | Transactions — form | Back | ተመለስ |
| `src/components/TransactionForm.jsx:315` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Recording as ${actorLabel} | በ${actorLabel} እየተመዘገበ |
| `src/components/TransactionForm.jsx:319` | [VERIFIED] | `inline-ternary` | Transactions — form | Cancel | ሰርዝ |
| `src/components/TransactionForm.jsx:328` | [VERIFIED] | `inline-ternary` | Transactions — form | Amount | መጠን |
| `src/components/TransactionForm.jsx:342` | [VERIFIED] | `inline-ternary` | Transactions — form | Note (optional) | ማስታወሻ (አማራጭ) |
| `src/components/TransactionForm.jsx:347` | [VERIFIED] | `inline-ternary` | Transactions — form | Take or choose photo | ፎቶ አክል |
| `src/components/TransactionForm.jsx:351` | [VERIFIED] | `inline-ternary` | Transactions — form | Add details... | ዝርዝሩን ይመዝቡ... |
| `src/components/TransactionForm.jsx:358` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Proof photos | ፎቶ |
| `src/components/TransactionForm.jsx:397` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | CUSTOMER | ደንበኛ |
| `src/components/TransactionForm.jsx:400` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Type customer name... | ስም ይተይቡ... |
| `src/components/TransactionForm.jsx:416` | [VERIFIED] | `inline-ternary` | Transactions — form | Add as new customer | እንደ አዲስ ደንበኛ አክል |
| `src/components/TransactionForm.jsx:422` | [VERIFIED] | `inline-ternary` | Transactions — form | No customer found | ደንበኛ አልተገኘም |
| `src/components/TransactionForm.jsx:431` | [VERIFIED] | `inline-ternary` | Transactions — form | Add | አክል |
| `src/components/TransactionForm.jsx:453` | [VERIFIED] | `inline-ternary` | Transactions — form | BAL | ዱቤ |
| `src/components/TransactionForm.jsx:462` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | optional | አማራጭ |
| `src/components/TransactionForm.jsx:462` | [VERIFIED] | `inline-ternary` | Transactions — form | WHEN IS IT DUE? | መቼ ይከፍላል? |
| `src/components/TransactionForm.jsx:495` | [VERIFIED] | `inline-ternary` | Transactions — form | Pick | ምረጥ |
| `src/components/TransactionForm.jsx:510` | [VERIFIED] | `inline-ternary` | Transactions — form | Amount Received | የተቀበሉት መጠን |
| `src/components/TransactionForm.jsx:523` | [VERIFIED] | `inline-ternary` | Transactions — form | birr | ብር |
| `src/components/TransactionForm.jsx:528` | [VERIFIED] | `inline-ternary` | Transactions — form | birr | ብር |
| `src/components/TransactionForm.jsx:528` | [VERIFIED] | `inline-ternary` | Transactions — form | Credit owed | ቀሪ ዱቤ |
| `src/components/TransactionForm.jsx:533` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Amount received is the full sale — use "Paid" instead. | የተቀበሉት ሙሉ ነው — "ሙሉ" ይምረጡ |
| `src/components/TransactionForm.jsx:538` | [VERIFIED] | `inline-ternary` | Transactions — form | ETB | ብር |
| `src/components/TransactionForm.jsx:538` | [VERIFIED] | `inline-ternary` | Transactions — form | via | በ |
| `src/components/TransactionForm.jsx:545` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | CUSTOMER | ደንበኛ |
| `src/components/TransactionForm.jsx:548` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Type customer name... | ስም ይተይቡ... |
| `src/components/TransactionForm.jsx:564` | [VERIFIED] | `inline-ternary` | Transactions — form | Add as new customer | እንደ አዲስ ደንበኛ አክል |
| `src/components/TransactionForm.jsx:570` | [VERIFIED] | `inline-ternary` | Transactions — form | No customer found | ደንበኛ አልተገኘም |
| `src/components/TransactionForm.jsx:579` | [VERIFIED] | `inline-ternary` | Transactions — form | Add | አክል |
| `src/components/TransactionForm.jsx:601` | [VERIFIED] | `inline-ternary` | Transactions — form | BAL | ዱቤ |
| `src/components/TransactionForm.jsx:610` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | optional | አማራጭ |
| `src/components/TransactionForm.jsx:610` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | REMAINING DUE DATE | የቀሪው መክፈያ ቀን |
| `src/components/TransactionForm.jsx:643` | [VERIFIED] | `inline-ternary` | Transactions — form | Pick | ምረጥ |
| `src/components/TransactionForm.jsx:655` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Add or pick a customer above | ከላይ ደንበኛ ይምረጡ ወይም ያክሉ |
| `src/components/TransactionForm.jsx:659` | [VERIFIED] | `inline-ternary` | Transactions — form | Saved | ተቀምጧል |
| `src/components/TransactionForm.jsx:661` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Saved on this phone · Syncs later | በዚህ ስልክ ተቀምጧል · በኋላ ይመሳሰላል |
| `src/components/TransactionForm.jsx:680` | [VERIFIED] | `inline-ternary` | Transactions — form | Back | ተመለስ |
| `src/components/TransactionForm.jsx:686` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Clear | አጽዳ |
| `src/components/TransactionForm.jsx:697` | [VERIFIED] | `inline-ternary` | Transactions — form | DIRECTION | አቅጣጫ |
| `src/components/TransactionForm.jsx:699` | [VERIFIED] | `inline-ternary` | Transactions — form | I owe them | የተበደርኩት |
| `src/components/TransactionForm.jsx:699` | [VERIFIED] | `inline-ternary` | Transactions — form | They owe me | ያበደርኩት |
| `src/components/TransactionForm.jsx:710` | [VERIFIED] | `inline-ternary` | Transactions — form | QUICK-FILL | ፈጣን ሙላ |
| `src/components/TransactionForm.jsx:715` | [VERIFIED] | `inline-ternary` | Transactions — form | birr | ብር |
| `src/components/TransactionForm.jsx:720` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | You can add more recurring expenses in Settings | በቅንብሮች ውስጥ ሌሎች ተደጋጋሚ ወጪዎችን ማከል ይችላሉ |
| `src/components/TransactionForm.jsx:725` | [VERIFIED] | `inline-ternary` | Transactions — form | QUICK-FILL (EXAMPLES) | ፈጣን ሙላ |
| `src/components/TransactionForm.jsx:727` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Rent | ኪራይ |
| `src/components/TransactionForm.jsx:727` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | እቁብ | እቁብ |
| `src/components/TransactionForm.jsx:739` | [VERIFIED] | `inline-ternary` | Transactions — form | AMOUNT | መጠን |
| `src/components/TransactionForm.jsx:746` | [VERIFIED] | `inline-ternary` | Transactions — form | birr | ብር |
| `src/components/TransactionForm.jsx:759` | [VERIFIED] | `inline-ternary` | Transactions — form | Take or choose photo | ፎቶ አክል |
| `src/components/TransactionForm.jsx:770` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Proof photos | ፎቶ |
| `src/components/TransactionForm.jsx:792` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Payment Method | የክፍያ ዘዴ |
| `src/components/TransactionForm.jsx:810` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | CUSTOMER | ደንበኛ |
| `src/components/TransactionForm.jsx:812` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Type customer name... | ስም ይተይቡ... |
| `src/components/TransactionForm.jsx:820` | [VERIFIED] | `inline-ternary` | Transactions — form | ETB | ብር |
| `src/components/TransactionForm.jsx:826` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | Add new customer | አዲስ ደንበኛ ይመልከቱ |
| `src/components/TransactionForm.jsx:838` | [VERIFIED] | `inline-ternary` | Transactions — form | PHONE (OPTIONAL) | ስልክ (አማራጭ) |
| `src/components/TransactionForm.jsx:853` | [VERIFIED] | `inline-ternary` | Transactions — form | WHEN IS IT DUE? | መቼ ይከፍላል? |
| `src/components/TransactionForm.jsx:883` | [VERIFIED] | `inline-ternary` | Transactions — form | Pick | ምረጥ |
| `src/components/TransactionForm.jsx:886` | [VERIFIED] | `inline-ternary` | Transactions — form | Please select a due date | የመክፍያ ቀን ይምረጡ |
| `src/components/TransactionForm.jsx:899` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | ↑ Enter customer name | ↑ ስም ይተይቡ |
| `src/components/TransactionForm.jsx:900` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | ↑ Pick due date | ↑ የመክፈያ ቀን ይምረጡ |
| `src/components/TransactionForm.jsx:901` | [NEVER-REVIEWED] | `inline-ternary` | Transactions — form | ↑ Phone format invalid | ↑ ስልክ ስህተት |
| `src/components/TransactionForm.jsx:908` | [VERIFIED] | `inline-ternary` | Transactions — form | Saved | ተቀምጧል |
| `src/components/TransactionForm.jsx:917` | [VERIFIED] | `inline-ternary` | Transactions — form | Add recurring expense | ተደጋጋሚ ወጪ አክል |
| `src/components/TransactionForm.jsx:920` | [VERIFIED] | `inline-ternary` | Transactions — form | Save this as a recurring expense to reuse it anytime | ይህን ወጪ ለሚቀጥሉ ጊዜያት አስቀምጥ |
| `src/components/TransactionForm.jsx:923` | [VERIFIED] | `inline-ternary` | Transactions — form | What did you spend on? | ምን ላይ ወጪ? |
| `src/components/TransactionForm.jsx:924` | [VERIFIED] | `inline-ternary` | Transactions — form | Add details... | ዝርዝሩን ይመዝቡ... |
| `src/components/TransactionForm.jsx:928` | [VERIFIED] | `inline-ternary` | Transactions — form | How much total? | ጠቅላላ ስንት? |
| `src/components/TransactionForm.jsx:932` | [VERIFIED] | `inline-ternary` | Transactions — form | birr | ብር |
| `src/components/TransactionForm.jsx:936` | [VERIFIED] | `inline-ternary` | Transactions — form | Frequency | ድግግሞሽ |
| `src/components/TransactionForm.jsx:938` | [VERIFIED] | `inline-ternary` | Transactions — form | Daily | ዕለታዊ |
| `src/components/TransactionForm.jsx:938` | [VERIFIED] | `inline-ternary` | Transactions — form | Monthly | ወርሃዊ |
| `src/components/TransactionForm.jsx:938` | [VERIFIED] | `inline-ternary` | Transactions — form | Weekly | ሳምንታዊ |
| `src/components/TransactionForm.jsx:947` | [VERIFIED] | `inline-ternary` | Transactions — form | Add & Use | አስቀምጥ እና ተጠቀም |
| `src/components/TransactionRow.jsx:27` | [VERIFIED] | `inline-ternary` | Other | Payment | ክፍያ |
| `src/components/TransactionRow.jsx:28` | [VERIFIED] | `inline-ternary` | Other | Credit | ዱቤ |
| `src/components/TransactionRow.jsx:29` | [VERIFIED] | `inline-ternary` | Other | Reversal | ሰርዝ |
| `src/components/TransactionRow.jsx:46` | [VERIFIED] | `inline-ternary` | Other | Paid | ተከፍሏል |
| `src/components/TransferSheet.jsx:80` | [NEVER-REVIEWED] | `inline-ternary` | Other | Transfer Credit | ዱቤ ማስተላለፍ |
| `src/components/TransferSheet.jsx:100` | [NEVER-REVIEWED] | `inline-ternary` | Other | From | ከ |
| `src/components/TransferSheet.jsx:120` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/TransferSheet.jsx:120` | [NEVER-REVIEWED] | `inline-ternary` | Other | Current balance | የአሁን ዱቤ |
| `src/components/TransferSheet.jsx:129` | [NEVER-REVIEWED] | `inline-ternary` | Other | To | ለማን |
| `src/components/TransferSheet.jsx:168` | [NEVER-REVIEWED] | `inline-ternary` | Other | Type customer name... | የደንበኛ ስም ይተይቡ... |
| `src/components/TransferSheet.jsx:207` | [VERIFIED] | `inline-ternary` | Other | Amount | መጠን |
| `src/components/TransferSheet.jsx:215` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/TransferSheet.jsx:252` | [NEVER-REVIEWED] | `inline-ternary` | Other | Amount exceeds available balance | መጠኑ ከዱቤው ይበልጣል |
| `src/components/TransferSheet.jsx:272` | [NEVER-REVIEWED] | `inline-ternary` | Other | Transferring... | በማስተላለፍ ላይ... |
| `src/components/TransferSheet.jsx:275` | [NEVER-REVIEWED] | `inline-ternary` | Other | Transfer Credit | ዱቤ አስተላልፍ |
| `src/components/TxRow.jsx:25` | [VERIFIED] | `inline-ternary` | Other | credit | ዱቤ |
| `src/components/TxRow.jsx:36` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/TxRow.jsx:42` | [VERIFIED] | `inline-ternary` | Other | disc | ቅናሽ |
| `src/components/TxRow.jsx:55` | [VERIFIED] | `inline-ternary` | Other | View transaction photo | የግብይት ፎቶ ይመልከቱ |
| `src/components/TxRow.jsx:64` | [VERIFIED] | `inline-ternary` | Other | Show items | እቃዎችን አሳይ |
| `src/components/TxRow.jsx:72` | [VERIFIED] | `inline-ternary` | Other | More | ተጨማሪ |
| `src/components/TxRow.jsx:78` | [VERIFIED] | `inline-ternary` | Other | Edit | አርትዕ |
| `src/components/TxRow.jsx:82` | [VERIFIED] | `inline-ternary` | Other | Delete | ሰርዝ |
| `src/components/TxRow.jsx:96` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/TxRow.jsx:108` | [VERIFIED] | `inline-ternary` | Other | Discount | ቅናሽ |
| `src/components/TxRow.jsx:109` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/components/TxRow.jsx:116` | [VERIFIED] | `inline-ternary` | Other | Excess | በላይ |
| `src/components/TxRow.jsx:116` | [VERIFIED] | `inline-ternary` | Other | Unaccounted | ቀሪ |
| `src/components/TxRow.jsx:117` | [VERIFIED] | `inline-ternary` | Other | birr | ብር |
| `src/hooks/useCustomers.js:124` | [VERIFIED] | `inline-ternary` | Other | Customer updated | ተስተካክሏል |
| `src/hooks/useCustomers.js:289` | [VERIFIED] | `inline-ternary` | Other | Entry updated | ተስተካክሏል |
| `src/hooks/useCustomers.js:293` | [VERIFIED] | `inline-ternary` | Other | Could not update entry | ማስተካከል አልተሳካም |
| `src/hooks/useCustomers.js:322` | [VERIFIED] | `inline-ternary` | Other | Could not reverse entry | ሰርዝ አልተሳካም |
| `src/hooks/useCustomers.js:325` | [VERIFIED] | `inline-ternary` | Other | Entry reversed | ተሰርዟል |
| `src/hooks/useShopOps.js:47` | [NEVER-REVIEWED] | `inline-ternary` | Other | Already exists | ይህ አስቀድሞ አለ |
| `src/labels/onboarding.js:25` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Two ways to use Gebya | ገበያን ለመጠቀም ሁለት መንገዶች |
| `src/labels/onboarding.js:26` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Select Account Type | የአጠቃቀም አይነት ይምረጡ |
| `src/labels/onboarding.js:27` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Shop Owner | የሱቅ ባለቤት |
| `src/labels/onboarding.js:28` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Create your own notebook | የራስዎን ማስታወሻ ይፍጠሩ |
| `src/labels/onboarding.js:29` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Join a Shop | ሱቅ ይቀላቀሉ |
| `src/labels/onboarding.js:30` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Connect as a staff member | እንደ ሰራተኛ ይገናኙ |
| `src/labels/onboarding.js:31` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | ወደ አማርኛ ቀይር | Switch to English |
| `src/labels/onboarding.js:32` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | አማርኛ | English |
| `src/labels/onboarding.js:33` | [VERIFIED] | `locale-object` | Onboarding — labels | Back | ተመለስ |
| `src/labels/onboarding.js:34` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Set up your notebook | የሱቅዎን ማስታወሻ ደብተር ያዘጋጁ |
| `src/labels/onboarding.js:35` | [VERIFIED] | `locale-object` | Onboarding — labels | Your Name | ስም |
| `src/labels/onboarding.js:36` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Enter your name | ስምዎን ያስገቡ |
| `src/labels/onboarding.js:37` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Please enter your name | እባክዎ ስም ያስገቡ |
| `src/labels/onboarding.js:38` | [VERIFIED] | `locale-object` | Onboarding — labels | Phone Number | ስልክ ቁጥር |
| `src/labels/onboarding.js:39` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Enter a valid phone number | እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ |
| `src/labels/onboarding.js:40` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Saving... | በማስቀመጥ ላይ... |
| `src/labels/onboarding.js:41` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Onboarding — labels | Start | ጀምር |
| `src/labels/settings.js:9` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Set shop name | የሱቅ ስም ያስገቡ |
| `src/labels/settings.js:10` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Add shop phone number | የስልክ ቁጥር ያስገቡ |
| `src/labels/settings.js:11` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Set up a payment channel | የክፍያ መንገድ ያዋቅሩ |
| `src/labels/settings.js:12` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Add items to catalog | እቃዎች ያስገቡ |
| `src/labels/settings.js:13` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Add recurring expenses | ወርሃዊ ወጪ ይመዝግቡ |
| `src/labels/settings.js:14` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Add › | ያስገቡ › |
| `src/labels/settings.js:15` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Setup › | ያዋቅሩ › |
| `src/labels/settings.js:18` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | ይመዝግቡ › | ይመዝግቡ › |
| `src/labels/settings.js:19` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | All set up | ሁሉም ተዋቅሯል |
| `src/labels/settings.js:20` | [VERIFIED] | `locale-object` | Settings — labels | Details | ተጨማሪ |
| `src/labels/settings.js:21` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Shop | ሱቅ |
| `src/labels/settings.js:32` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Unlimited staff members | ያልተገደበ ሰራተኞች |
| `src/labels/settings.js:33` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Unlimited monthly transactions | ያልተገደበ ወርሃዊ ግብይቶች |
| `src/labels/settings.js:34` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Advanced reports & analytics | የላቀ ሪፖርቶች እና ትንታኔ |
| `src/labels/settings.js:35` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Multi-shop management | ባለብዙ ሱቅ አስተዳደር |
| `src/labels/settings.js:36` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Priority support | ቅድሚያ ድጋፍ |
| `src/labels/settings.js:37` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Free Plan | ነፃ ፕላን |
| `src/labels/settings.js:38` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Limited staff and reports | የሰራተኞች እና የሪፖርት ገደቦች አሉ |
| `src/labels/settings.js:39` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Staff | ሰራተኞች |
| `src/labels/settings.js:40` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Monthly tx | ወርሃዊ ግብይቶች |
| `src/labels/settings.js:41` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Upgrade to Plus | ወደ Plus አሻሽል |
| `src/labels/settings.js:43` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Upgrade Now | ወደ Plus አሻሽል |
| `src/labels/settings.js:44` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Upgrading... | በመስራት ላይ... |
| `src/labels/settings.js:45` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Upgraded to Gebya Plus! 🎉 | ወደ Gebya Plus ተሻሽሏል! 🎉 |
| `src/labels/settings.js:46` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Something went wrong | እባክዎ እንደገና ይሞክሩ |
| `src/labels/settings.js:47` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Unlock everything and scale your business | ሁሉንም ገደቦች ይክፈቱ እና የንግድዎን አቅም ይጨምሩ |
| `src/labels/settings.js:48` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Settings — labels | Tied to this device. No payment is taken. | ከዚህ ስልክ ጋር የተያያዘ ነው። ምንም ክፍያ አይጠየቅም። |
| `src/labels/shared.js:16` | [VERIFIED] | `locale-object` | Shared labels | birr | ብር |
| `src/labels/transactions.js:12` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Transactions — labels | + Sale | + ሽያጭ |
| `src/labels/transactions.js:13` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Transactions — labels | − Expense | − ወጪ |
| `src/labels/transactions.js:14` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Transactions — labels | ↻ Credit | ↻ ዱቤ |
| `src/labels/transactions.js:19` | [VERIFIED] | `locale-object` | Transactions — labels | Save Credit | ዱቤ አስቀምጥ |
| `src/labels/transactions.js:20` | [VERIFIED] | `locale-object` | Transactions — labels | Save Expense | ወጪ አስቀምጥ |
| `src/labels/transactions.js:21` | [VERIFIED] | `locale-object` | Transactions — labels | Save Sale | ሽያጭ አስቀምጥ |
| `src/labels/transactions.js:25` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Transactions — labels | Save | አስቀምጥ |
| `src/labels/transactions.js:29` | [VERIFIED] | `locale-object` | Transactions — labels | e.g. Abebe... | ለምሳሌ አበበ… |
| `src/labels/transactions.js:30` | [VERIFIED] | `locale-object` | Transactions — labels | Add details... | ዝርዝሩን ይመዝቡ... |
| `src/labels/transactions.js:31` | [VERIFIED] | `locale-object` | Transactions — labels | Add details... | ዝርዝሩን ይመዝቡ... |
| `src/labels/transactions.js:34` | [VERIFIED] | `locale-object` | Transactions — labels | NAME | ስም |
| `src/labels/transactions.js:35` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Transactions — labels | Item / Service (Optional) | ዕቃ / አገልግሎት (አማራጭ) |
| `src/labels/transactions.js:39` | [VERIFIED] | `locale-object` | Transactions — labels | You can attach up to 3 photos | 3 ፎቶዎች ሙሉ በሙሉ ተያዝዋል |
| `src/labels/transactions.js:43` | [DRAFT-REVIEWED-PENDING] | `locale-object` | Transactions — labels | Cash | ጥሬ |
| `src/labels/transactions.js:44` | [VERIFIED] | `locale-object` | Transactions — labels | Credit | ዱቤ |
| `src/stores/staffStore.js:25` | [NEVER-REVIEWED] | `locale-object` | Staff | Manager | ማኔጀር |
| `src/stores/staffStore.js:26` | [NEVER-REVIEWED] | `locale-object` | Staff | Sales Staff | ሰራተኛ |
| `src/stores/staffStore.js:27` | [NEVER-REVIEWED] | `locale-object` | Staff | Auditor | ኦዲተር |
| `src/stores/staffStore.js:28` | [NEVER-REVIEWED] | `locale-object` | Staff | Trusted Staff | ተስፋ ያለው ሰራተኛ |
| `src/stores/staffStore.js:63` | [NEVER-REVIEWED] | `t-helper` | Staff | Custom | የተበጀ |
| `src/stores/staffStore.js:193` | [NEVER-REVIEWED] | `t-helper` | Staff | ✓ Updated | ✓ ተሻሽሏል |
| `src/stores/staffStore.js:196` | [NEVER-REVIEWED] | `t-helper` | Staff | Failed | አልተሳካም |
| `src/stores/staffStore.js:207` | [NEVER-REVIEWED] | `t-helper` | Staff | Owner permissions cannot be edited | የባለቤት ፍቃዶች አይቀየርም |
| `src/stores/staffStore.js:226` | [NEVER-REVIEWED] | `t-helper` | Staff | Owner role cannot be changed | የባለቤት ሚና አይቀየርም |
| `src/stores/staffStore.js:255` | [NEVER-REVIEWED] | `t-helper` | Staff | Failed to change role | ሚና መቀየር አልተሳካም |
| `src/stores/staffStore.js:290` | [NEVER-REVIEWED] | `t-helper` | Staff | Enter at least cash or transfer amount | ቢያንስ የጥሬ ገንዘብ ወይም የዝውውር መጠን ያስገቡ |
| `src/stores/staffStore.js:299` | [NEVER-REVIEWED] | `t-helper` | Staff | Staff submitted collection | ሰራተኛ ስብስብ አስገብቷል |
| `src/stores/staffStore.js:331` | [NEVER-REVIEWED] | `t-helper` | Staff | ✓ Collection submitted | ✓ ስብስብ ተልኳል |
| `src/stores/staffStore.js:346` | [NEVER-REVIEWED] | `t-helper` | Staff | Staff submitted collection | ሰራተኛ ስብስብ አስገብቷል |
| `src/stores/staffStore.js:353` | [NEVER-REVIEWED] | `t-helper` | Staff | Failed to submit | ማስገባት አልተሳካም |
| `src/utils/reminders.js:20` | [NEVER-REVIEWED] | `locale-object` | Utils & stores | Gentle | ቀላል |
| `src/utils/reminders.js:26` | [NEVER-REVIEWED] | `locale-object` | Utils & stores | Firm | ቀጥተኛ |
| `src/utils/reminders.js:32` | [NEVER-REVIEWED] | `locale-object` | Utils & stores | Final notice | ለመጨረሻ ጊዜ |
| `src/utils/reminders.js:38` | [NEVER-REVIEWED] | `locale-object` | Utils & stores | Telegram | ቴሌግራም |
| `src/utils/reminders.js:39` | [NEVER-REVIEWED] | `locale-object` | Utils & stores | WhatsApp | ዋትስአፕ |
| `src/utils/reminders.js:41` | [NEVER-REVIEWED] | `locale-object` | Utils & stores | Call | ጥሪ |
| `src/utils/reminders.js:145` | [VERIFIED] | `inline-ternary` | Utils & stores | today | ዛሬ |
| `src/utils/shopStory.js:33` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Other | ልዩ |
| `src/utils/shopStory.js:141` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Cash not counted yet | ገንዘብ ገና አልተጠቀሰም |
| `src/utils/shopStory.js:145` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Count Cash | ገንዘብ ቅጠል |
| `src/utils/shopStory.js:152` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | less than expected | በዚህ ብዛት ያነሰ ነው |
| `src/utils/shopStory.js:152` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | more than expected | በዚህ ብዛት ተጨማሪ ነው |
| `src/utils/shopStory.js:156` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Cash does not match | ገንዘብ አይዛመድም |
| `src/utils/shopStory.js:158` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Review | 🔍 መመርመር |
| `src/utils/shopStory.js:174` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Remind | ያስታውሱ |
| `src/utils/shopStory.js:184` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Sales are lower than usual | ሽያጭ ከመደበኛው ዝቅተኛ ነው |
| `src/utils/shopStory.js:198` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | Expenses are higher than usual | ወጪ ከመደበኛው ከፍተኛ ነው |
| `src/utils/shopStory.js:226` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | No sales in this period. | በዚህ ጊዜ ምንም ሽያጭ አልነበረም |
| `src/utils/shopStory.js:286` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | 💰 Count Cash → | 💰 ገንዘብ ቆጠራ |
| `src/utils/shopStory.js:295` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | 💰 Count Cash → | 💰 ገንዘብ ቆጠራ |
| `src/utils/shopStory.js:304` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | 📋 Review | 📋 መረምር |
| `src/utils/shopStory.js:313` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | 👥 Collect → | 👥 ሰብስብ |
| `src/utils/shopStory.js:322` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | 🔔 Remind → | 🔔 አስታውስ |
| `src/utils/shopStory.js:331` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | 🛒 Record Sale → | 🛒 ሽያጭ መዝግብ |
| `src/utils/shopStory.js:339` | [NEVER-REVIEWED] | `inline-ternary` | Reports & story | 📒 View Details | 📒 ዝርዝር ይመልከቱ |

## 6. What the reviewer needs to decide

Ordered by blast radius, not by effort.

| Priority | Work | Why |
| --- | --- | --- |
| 1 | Re-derive the 23 broken strings in section 3 | Shipped UI shows non-Amharic to every Amharic user who signs in. The password surface alone is on the login path. |
| 2 | Ratify the 95 label entries in section 4 | They are byte-locked by tests, so changing wording is a deliberate act with test fallout. |
| 3 | Settle terminology across the 1297 inline pairs | The same English word is translated several different ways in different screens. This is the drift that only a human can settle. |
| 4 | Give the 448 Amharic-only strings an English anchor | No sibling means no review is possible. Either add the EN half or accept these as translator-owned copy. |
| 5 | Decide register: Latin vs Ethiopic numerals in Amharic copy | Already an open question in `R2-LABELS-DRAFT.md` for the unsynced-records block. It is not isolated to that block. |

## 7. Guard rails already in place

| Check | Command | What it protects |
| --- | --- | --- |
| Script guard | `pnpm --filter gebya lint:i18n` | `check-i18n-chars.mjs` fails the build on any character outside ASCII + Ethiopic. This catches foreign-script slips (Bengali, Cyrillic, CJK) but **not** wrong Amharic, which is why this packet exists. |
| Label byte-identity | `tests/labels-*.spec.ts` | Freezes the exact bytes in `src/labels/*` so extraction cannot silently reword copy. |
| Design regression | `tests/design-regression-smoke.spec.ts` | Snapshot-level UI coverage. |

---

_Generated by `scripts/audit/build.cjs`. Reproduce with `node scripts/audit/build.cjs`._
