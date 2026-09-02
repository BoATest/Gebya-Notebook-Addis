import PlanPanel from '../PlanPanel';
import PaymentChannelsSection from '../PaymentChannelsSection';
import DubieRulesPanel from '../DubieRulesPanel';
import TabCard from '../TabCard';
import useAccordion from '../useAccordion';

export default function MoneyTab({
  paymentChannels,
  shopProfile,
  shopId,
  onSavePaymentChannels,
  lang,
  planTier,
  entitlements,
  staffCount,
  transactionCount,
  pendingCardId,
}) {
  const { openCards, toggleCard } = useAccordion(pendingCardId);

  const chTotal = (paymentChannels || []).length;
  const chOnConfigured = (paymentChannels || []).filter(c => c.enabled && (c.usePhoneFromShop || c.phone || c.account)).length;
  const channelBadge = `${chOnConfigured}/${chTotal}`;
  const channelTone = chOnConfigured === 0 ? 'warn' : (chOnConfigured < chTotal ? 'warn' : 'ok');
  const channelSub = chOnConfigured > 0
    ? `${chOnConfigured} ${lang === 'am' ? 'መንገድ ዝግጁ' : 'configured'}`
    : (lang === 'am' ? 'አንድ መንገድ ያዋቅሩ' : 'Set up a payment channel');

  const shopPhone = shopProfile?.phone || '';

  return (
    <div>
      <div className="mb-2.5">
        <PlanPanel
          tier={planTier}
          entitlements={entitlements}
          staffCount={staffCount}
          transactionCount={transactionCount}

        />
      </div>

      <TabCard
        id="channels"
        icon="💳"
        title={lang === 'am' ? 'የክፍያ መንገዶች' : 'Payment Channels'}
        subtitle={channelSub}
        badge={channelBadge}
        badgeTone={channelTone}
        open={openCards.has('channels')}
        onToggle={() => toggleCard('channels')}
      >
        <PaymentChannelsSection
          channels={paymentChannels}
          shopPhone={shopPhone}
          enabledCount={(paymentChannels || []).filter(c => c.enabled).length}
          configuredCount={chOnConfigured}
          onChange={(next) => onSavePaymentChannels?.(next)}
          lang={lang}
        />
      </TabCard>

      <TabCard
        id="dubie-rules"
        icon="⚖️"
        title={lang === 'am' ? 'የዱቤ ህጎች' : 'Dubie (Credit) Rules'}
        subtitle={lang === 'am' ? 'የዘገዬ ጊዜ እና ራስ-ሰር ማስታወቂያ' : 'Overdue threshold and auto-reminders'}
        badgeTone="neutral"
        open={openCards.has('dubie-rules')}
        onToggle={() => toggleCard('dubie-rules')}
      >
        <DubieRulesPanel />
      </TabCard>
    </div>
  );
}
