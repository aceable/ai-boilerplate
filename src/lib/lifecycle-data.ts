import { startOfWeek, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type { LifecycleWeeklyData } from '@/types/lifecycle';
import type { Brand, Vertical } from '@/lib/lifecycle-filters';

export interface LifecycleFilters {
  brand: Brand;
  vertical: Vertical;
}

const CT_TIMEZONE = 'America/Chicago';

export function getMostRecentCompletedWeek(): { start: Date; end: Date } {
  const nowUtc = new Date();
  const nowCt = toZonedTime(nowUtc, CT_TIMEZONE);

  // Find the most recent Sunday that has fully ended (i.e., it's past Sunday 23:59:59 CT)
  // startOfWeek with weekStartsOn: 1 gives us Monday of the current CT week
  const currentWeekMonday = startOfWeek(nowCt, { weekStartsOn: 1 });

  // The last completed week ended on the Sunday before this Monday
  const lastSundayCt = subDays(currentWeekMonday, 1);
  const lastMondayCt = subDays(currentWeekMonday, 7);

  const weekStart = fromZonedTime(
    new Date(
      lastMondayCt.getFullYear(),
      lastMondayCt.getMonth(),
      lastMondayCt.getDate(),
      0, 0, 0, 0
    ),
    CT_TIMEZONE
  );

  const weekEnd = fromZonedTime(
    new Date(
      lastSundayCt.getFullYear(),
      lastSundayCt.getMonth(),
      lastSundayCt.getDate(),
      23, 59, 59, 999
    ),
    CT_TIMEZONE
  );

  return { start: weekStart, end: weekEnd };
}

function getMockData(): LifecycleWeeklyData {
  const { start, end } = getMostRecentCompletedWeek();

  return {
    periodStart: start,
    periodEnd: end,
    generatedAt: new Date(),

    totalRevenue:    { value: 1_823_441, momDelta:  0.083, yoyDelta:  0.214 },
    totalOrders:     { value: 12_387,    momDelta: -0.021, yoyDelta:  0.187 },
    emailsSent:      { value: 4_812_003, momDelta:  0.031, yoyDelta:  0.092 },
    smsSent:         { value: 381_200,   momDelta:  0.056, yoyDelta:  0.143 },
    pushDelivered:   { value: 208_440,   momDelta: -0.018, yoyDelta: -0.034 },

    emailOpenRate:   { value: 0.2830,    momDelta:  0.014, yoyDelta:  0.031 },
    emailClickRate:  { value: 0.0210,    momDelta: -0.009, yoyDelta:  0.022 },
    unsubscribeRate: { value: 0.00081,   momDelta:  0.003, yoyDelta: -0.007 },

    emailRevenue:    { value: 1_153_800, momDelta:  0.091, yoyDelta:  0.228 },
    emailOrders:     { value: 8_210,     momDelta:  0.074, yoyDelta:  0.201 },
    emailConvRate:   { value: 0.00171,   momDelta:  0.041, yoyDelta:  0.099 },
    emailAov:        { value: 140.54,    momDelta:  0.016, yoyDelta:  0.022 },
    emailRpk:        { value: 319.87,    momDelta:  0.057, yoyDelta:  0.124 },

    smsRevenue:      { value: 524_400,   momDelta:  0.062, yoyDelta:  0.198 },
    smsOrders:       { value: 2_840,     momDelta:  0.048, yoyDelta:  0.163 },
    smsConvRate:     { value: 0.00746,   momDelta: -0.011, yoyDelta:  0.054 },
    smsAov:          { value: 184.65,    momDelta:  0.013, yoyDelta:  0.029 },
    smsRpk:          { value: 2_103.45,  momDelta:  0.006, yoyDelta:  0.047 },

    pushRevenue:     { value: 145_241,   momDelta: -0.043, yoyDelta: -0.011 },
    pushOrders:      { value: 1_140,     momDelta: -0.031, yoyDelta: -0.008 },
    pushConvRate:    { value: 0.00547,   momDelta: -0.019, yoyDelta: -0.033 },
    pushAov:         { value: 127.40,    momDelta: -0.012, yoyDelta: -0.003 },
    pushRpk:         { value: 183.22,    momDelta: -0.025, yoyDelta: -0.044 },
  };
}

export async function getLifecycleWeeklyData(
  filters?: LifecycleFilters
): Promise<LifecycleWeeklyData> {
  if (!process.env['SNOWFLAKE_ACCOUNT'] || process.env['PLAYWRIGHT_TESTING'] === 'true') {
    return getMockData();
  }

  const { fetchLifecycleWeeklyData } = await import('./lifecycle-snowflake');
  const { start, end } = getMostRecentCompletedWeek();
  return fetchLifecycleWeeklyData(start, end, filters);
}
