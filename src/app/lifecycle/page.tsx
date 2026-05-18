import { getLifecycleWeeklyData } from '@/lib/lifecycle-data';
import { MetricCard } from '@/components/features/lifecycle/MetricCard';
import { MetricSection } from '@/components/features/lifecycle/MetricSection';
import { ChannelBlock } from '@/components/features/lifecycle/ChannelBlock';
import { FilterBar } from '@/components/features/lifecycle/FilterBar';
import { BRANDS, VERTICALS } from '@/lib/lifecycle-filters';
import type { Brand, Vertical } from '@/lib/lifecycle-filters';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { Suspense } from 'react';

const CT_TIMEZONE = 'America/Chicago';

function formatPeriod(start: Date, end: Date): string {
  const s = toZonedTime(start, CT_TIMEZONE);
  const e = toZonedTime(end, CT_TIMEZONE);
  return `${format(s, 'EEE MMM d')} – ${format(e, 'EEE MMM d, yyyy')}`;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LifecyclePage({ searchParams }: PageProps) {
  const params = await searchParams;

  const rawBrand = typeof params['brand'] === 'string' ? params['brand'] : 'All';
  const rawVertical = typeof params['vertical'] === 'string' ? params['vertical'] : 'All';

  const brand: Brand = (BRANDS as readonly string[]).includes(rawBrand)
    ? (rawBrand as Brand)
    : 'All';
  const vertical: Vertical = (VERTICALS as readonly string[]).includes(rawVertical)
    ? (rawVertical as Vertical)
    : 'All';

  const data = await getLifecycleWeeklyData({ brand, vertical });

  const period = formatPeriod(data.periodStart, data.periodEnd);
  const updatedAt = data.generatedAt.toLocaleString('en-US', {
    timeZone: CT_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <div className="min-h-screen bg-[#0d1117] text-white px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-8">

        {/* Header */}
        <header data-testid="lifecycle-header">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">
            Lifecycle Weekly Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Performance Marketing · Lifecycle Channel
          </p>

          {/* Period banner — most visually dominant element */}
          <div
            className="mt-4 inline-flex flex-col gap-1 px-5 py-3 rounded-lg bg-teal-900/40 border border-teal-500/50"
            data-testid="period-banner"
          >
            <span className="text-teal-300 font-semibold text-xl sm:text-2xl">
              {period}
            </span>
            <span className="text-teal-500 text-xs uppercase tracking-widest">
              Auto-resolved · Most recent completed Mon–Sun week
            </span>
          </div>

          <p className="text-gray-500 text-xs mt-3">
            Last updated: {updatedAt}&nbsp;&nbsp;&nbsp;Data source: Snowflake
          </p>
        </header>

        {/* Filters */}
        <Suspense>
          <FilterBar brand={brand} vertical={vertical} />
        </Suspense>

        {/* Section 1 — Volume */}
        <MetricSection
          title="Volume"
          gridClassName="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
          data-testid="section-volume"
        >
          <MetricCard
            label="Lifecycle Revenue"
            value={data.totalRevenue.value}
            format="currency"
            momDelta={data.totalRevenue.momDelta}
            yoyDelta={data.totalRevenue.yoyDelta}
            favorableDirection="up"
            data-testid="card-total-revenue"
          />
          <MetricCard
            label="Lifecycle Orders"
            value={data.totalOrders.value}
            format="number"
            momDelta={data.totalOrders.momDelta}
            yoyDelta={data.totalOrders.yoyDelta}
            favorableDirection="up"
            data-testid="card-total-orders"
          />
          <MetricCard
            label="Emails Sent"
            value={data.emailsSent.value}
            format="number"
            momDelta={data.emailsSent.momDelta}
            yoyDelta={data.emailsSent.yoyDelta}
            favorableDirection="up"
            data-testid="card-emails-sent"
          />
          <MetricCard
            label="SMS Sent"
            value={data.smsSent.value}
            format="number"
            momDelta={data.smsSent.momDelta}
            yoyDelta={data.smsSent.yoyDelta}
            favorableDirection="up"
            data-testid="card-sms-sent"
          />
          <MetricCard
            label="Push Delivered"
            value={data.pushDelivered.value}
            format="number"
            momDelta={data.pushDelivered.momDelta}
            yoyDelta={data.pushDelivered.yoyDelta}
            favorableDirection="up"
            data-testid="card-push-delivered"
          />
        </MetricSection>

        {/* Section 2 — Email Engagement */}
        <MetricSection
          title="Email Engagement"
          gridClassName="grid grid-cols-1 sm:grid-cols-3 gap-4"
          data-testid="section-engagement"
        >
          <MetricCard
            label="Email Open Rate"
            value={data.emailOpenRate.value}
            format="rate"
            momDelta={data.emailOpenRate.momDelta}
            yoyDelta={data.emailOpenRate.yoyDelta}
            favorableDirection="up"
            data-testid="card-email-open-rate"
          />
          <MetricCard
            label="Email Click Rate"
            value={data.emailClickRate.value}
            format="rate"
            momDelta={data.emailClickRate.momDelta}
            yoyDelta={data.emailClickRate.yoyDelta}
            favorableDirection="up"
            data-testid="card-email-click-rate"
          />
          <MetricCard
            label="Unsubscribe Rate"
            value={data.unsubscribeRate.value}
            format="rate"
            momDelta={data.unsubscribeRate.momDelta}
            yoyDelta={data.unsubscribeRate.yoyDelta}
            favorableDirection="down"
            data-testid="card-unsubscribe-rate"
          />
        </MetricSection>

        {/* Section 3 — Revenue by Channel */}
        <MetricSection
          title="Revenue by Channel"
          gridClassName="grid grid-cols-1 gap-8"
          data-testid="section-channel-revenue"
        >
          <ChannelBlock
            name="Email"
            borderColorClass="border-blue-500"
            data-testid="channel-email"
          >
            <MetricCard
              label="Email Revenue"
              value={data.emailRevenue.value}
              format="currency"
              momDelta={data.emailRevenue.momDelta}
              yoyDelta={data.emailRevenue.yoyDelta}
              favorableDirection="up"
              data-testid="card-email-revenue"
            />
            <MetricCard
              label="Email Orders"
              value={data.emailOrders.value}
              format="number"
              momDelta={data.emailOrders.momDelta}
              yoyDelta={data.emailOrders.yoyDelta}
              favorableDirection="up"
              data-testid="card-email-orders"
            />
            <MetricCard
              label="Email Conv Rate"
              value={data.emailConvRate.value}
              format="rate"
              momDelta={data.emailConvRate.momDelta}
              yoyDelta={data.emailConvRate.yoyDelta}
              favorableDirection="up"
              data-testid="card-email-conv-rate"
            />
            <MetricCard
              label="Email AOV"
              value={data.emailAov.value}
              format="currency"
              momDelta={data.emailAov.momDelta}
              yoyDelta={data.emailAov.yoyDelta}
              favorableDirection="up"
              data-testid="card-email-aov"
            />
            <MetricCard
              label="Email RpK"
              value={data.emailRpk.value}
              format="rpk"
              momDelta={data.emailRpk.momDelta}
              yoyDelta={data.emailRpk.yoyDelta}
              favorableDirection="up"
              subLabel="per 1,000 sent"
              data-testid="card-email-rpk"
            />
          </ChannelBlock>

          <ChannelBlock
            name="SMS"
            borderColorClass="border-green-500"
            data-testid="channel-sms"
          >
            <MetricCard
              label="SMS Revenue"
              value={data.smsRevenue.value}
              format="currency"
              momDelta={data.smsRevenue.momDelta}
              yoyDelta={data.smsRevenue.yoyDelta}
              favorableDirection="up"
              data-testid="card-sms-revenue"
            />
            <MetricCard
              label="SMS Orders"
              value={data.smsOrders.value}
              format="number"
              momDelta={data.smsOrders.momDelta}
              yoyDelta={data.smsOrders.yoyDelta}
              favorableDirection="up"
              data-testid="card-sms-orders"
            />
            <MetricCard
              label="SMS Conv Rate"
              value={data.smsConvRate.value}
              format="rate"
              momDelta={data.smsConvRate.momDelta}
              yoyDelta={data.smsConvRate.yoyDelta}
              favorableDirection="up"
              data-testid="card-sms-conv-rate"
            />
            <MetricCard
              label="SMS AOV"
              value={data.smsAov.value}
              format="currency"
              momDelta={data.smsAov.momDelta}
              yoyDelta={data.smsAov.yoyDelta}
              favorableDirection="up"
              data-testid="card-sms-aov"
            />
            <MetricCard
              label="SMS RpK"
              value={data.smsRpk.value}
              format="rpk"
              momDelta={data.smsRpk.momDelta}
              yoyDelta={data.smsRpk.yoyDelta}
              favorableDirection="up"
              subLabel="per 1,000 sent"
              data-testid="card-sms-rpk"
            />
          </ChannelBlock>

          <ChannelBlock
            name="Push"
            borderColorClass="border-orange-500"
            data-testid="channel-push"
          >
            <MetricCard
              label="Push Revenue"
              value={data.pushRevenue.value}
              format="currency"
              momDelta={data.pushRevenue.momDelta}
              yoyDelta={data.pushRevenue.yoyDelta}
              favorableDirection="up"
              data-testid="card-push-revenue"
            />
            <MetricCard
              label="Push Orders"
              value={data.pushOrders.value}
              format="number"
              momDelta={data.pushOrders.momDelta}
              yoyDelta={data.pushOrders.yoyDelta}
              favorableDirection="up"
              data-testid="card-push-orders"
            />
            <MetricCard
              label="Push Conv Rate"
              value={data.pushConvRate.value}
              format="rate"
              momDelta={data.pushConvRate.momDelta}
              yoyDelta={data.pushConvRate.yoyDelta}
              favorableDirection="up"
              data-testid="card-push-conv-rate"
            />
            <MetricCard
              label="Push AOV"
              value={data.pushAov.value}
              format="currency"
              momDelta={data.pushAov.momDelta}
              yoyDelta={data.pushAov.yoyDelta}
              favorableDirection="up"
              data-testid="card-push-aov"
            />
            <MetricCard
              label="Push RpK"
              value={data.pushRpk.value}
              format="rpk"
              momDelta={data.pushRpk.momDelta}
              yoyDelta={data.pushRpk.yoyDelta}
              favorableDirection="up"
              subLabel="per 1,000 delivered"
              data-testid="card-push-rpk"
            />
          </ChannelBlock>
        </MetricSection>

      </div>
    </div>
  );
}
