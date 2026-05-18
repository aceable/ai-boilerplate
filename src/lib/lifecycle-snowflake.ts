import snowflake from 'snowflake-sdk';
import { subWeeks } from 'date-fns';
import type { LifecycleWeeklyData, MetricValue } from '@/types/lifecycle';
import type { LifecycleFilters } from '@/lib/lifecycle-data';

function createConnection() {
  return snowflake.createConnection({
    account: process.env['SNOWFLAKE_ACCOUNT'] ?? '',
    username: process.env['SNOWFLAKE_USER'] ?? '',
    password: process.env['SNOWFLAKE_PASSWORD'] ?? '',
    ...(process.env['SNOWFLAKE_WAREHOUSE'] && { warehouse: process.env['SNOWFLAKE_WAREHOUSE'] }),
    ...(process.env['SNOWFLAKE_DATABASE'] && { database: process.env['SNOWFLAKE_DATABASE'] }),
    ...(process.env['SNOWFLAKE_SCHEMA'] && { schema: process.env['SNOWFLAKE_SCHEMA'] }),
  });
}

function connectAsync(conn: ReturnType<typeof snowflake.createConnection>): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.connect((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

type SnowflakeRow = Record<string, unknown>;

function num(row: SnowflakeRow, key: string): number {
  const v = row[key] ?? row[key.toUpperCase()];
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

function executeAsync(
  conn: ReturnType<typeof snowflake.createConnection>,
  sql: string,
  binds: string[]
): Promise<SnowflakeRow[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Query timeout')), 30_000);
    conn.execute({
      sqlText: sql,
      binds,
      complete: (err, _stmt, rows) => {
        clearTimeout(timer);
        if (err) reject(err);
        else resolve((rows ?? []) as SnowflakeRow[]);
      },
    });
  });
}

function mv(value: number, momValue: number, yoyValue: number): MetricValue {
  return {
    value,
    momDelta: momValue !== 0 ? (value - momValue) / momValue : 0,
    yoyDelta: yoyValue !== 0 ? (value - yoyValue) / yoyValue : 0,
  };
}

function rpk(revenue: number, sends: number): number {
  return sends > 0 ? (revenue / sends) * 1000 : 0;
}

export async function fetchLifecycleWeeklyData(
  start: Date,
  end: Date,
  filters?: LifecycleFilters
): Promise<LifecycleWeeklyData> {
  const momStart = subWeeks(start, 4);
  const momEnd = subWeeks(end, 4);
  const yoyStart = subWeeks(start, 52);
  const yoyEnd = subWeeks(end, 52);

  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

  const brand = filters?.brand && filters.brand !== 'All' ? filters.brand : null;
  const vertical = filters?.vertical && filters.vertical !== 'All' ? filters.vertical : null;

  // Extra WHERE clauses appended when a filter is active
  const financeFilters = [
    brand    ? `AND BRAND = '${brand}'`         : '',
    vertical ? `AND VERTICAL = '${vertical}'`   : '',
  ].filter(Boolean).join('\n        ');

  const campaignFilters = [
    brand    ? `AND BRAND_NAME = '${brand}'`       : '',
    vertical ? `AND VERTICAL_NM = '${vertical}'`   : '',
  ].filter(Boolean).join('\n        ');

  console.info('[lifecycle] querying week:', toDateStr(start), '–', toDateStr(end), { brand, vertical });

  // Dates are inlined directly — toDateStr() produces clean YYYY-MM-DD strings from internal Date objects
  const dateRange = (s: Date, e: Date) =>
    `BETWEEN '${toDateStr(s)}' AND '${toDateStr(e)}'`;

  const conn = createConnection();
  await connectAsync(conn);

  try {
    const volumeQuery = (s: Date, e: Date) => `
      SELECT
        SUM(SALES)   AS total_revenue,
        SUM(ORDERS)  AS total_orders
      FROM POWERBI.MAIN.PBI_FINANCE_ACTUALS_FOR_PLANFUL_DAILY
      WHERE CHANNEL_NM_2026 = 'Lifecycle'
        AND DATE ${dateRange(s, e)}
        ${financeFilters}
    `;

    const sendsQuery = (s: Date, e: Date) => `
      SELECT
        SUM(CASE WHEN MESSAGE_TYPE = 'email' THEN UNIQUE_DELIVERED ELSE 0 END) AS emails_sent,
        SUM(CASE WHEN MESSAGE_TYPE = 'sms'   THEN UNIQUE_DELIVERED ELSE 0 END) AS sms_sent,
        SUM(CASE WHEN MESSAGE_TYPE = 'push'  THEN UNIQUE_DELIVERED ELSE 0 END) AS push_delivered
      FROM POWERBI.MAIN.PBI_EMAIL_ALL_METRICS_BY_CAMPAIGN
      WHERE DELIVERED_DATE::DATE ${dateRange(s, e)}
        ${campaignFilters}
    `;

    const engagementQuery = (s: Date, e: Date) => `
      SELECT
        CASE WHEN SUM(UNIQUE_DELIVERED) > 0
             THEN SUM(UNIQUE_OPENS)::FLOAT / SUM(UNIQUE_DELIVERED)
             ELSE 0 END                                          AS email_open_rate,
        CASE WHEN SUM(UNIQUE_DELIVERED) > 0
             THEN SUM(UNIQUE_CLICKS)::FLOAT / SUM(UNIQUE_DELIVERED)
             ELSE 0 END                                          AS email_click_rate,
        CASE WHEN SUM(UNIQUE_DELIVERED) > 0
             THEN SUM(UNIQUE_UNSUBSCRIBED)::FLOAT / SUM(UNIQUE_DELIVERED)
             ELSE 0 END                                          AS unsubscribe_rate
      FROM POWERBI.MAIN.PBI_EMAIL_ALL_METRICS_BY_CAMPAIGN
      WHERE MESSAGE_TYPE = 'email'
        AND DELIVERED_DATE::DATE ${dateRange(s, e)}
        ${campaignFilters}
    `;

    const channelRevenueQuery = (s: Date, e: Date) => `
      SELECT
        SUM(CASE WHEN MESSAGE_TYPE = 'email' THEN FT_SALES   ELSE 0 END) AS email_revenue,
        SUM(CASE WHEN MESSAGE_TYPE = 'sms'   THEN FT_SALES   ELSE 0 END) AS sms_revenue,
        SUM(CASE WHEN MESSAGE_TYPE = 'push'  THEN FT_SALES   ELSE 0 END) AS push_revenue,
        SUM(CASE WHEN MESSAGE_TYPE = 'email' THEN FT_ORDERS  ELSE 0 END) AS email_orders,
        SUM(CASE WHEN MESSAGE_TYPE = 'sms'   THEN FT_ORDERS  ELSE 0 END) AS sms_orders,
        SUM(CASE WHEN MESSAGE_TYPE = 'push'  THEN FT_ORDERS  ELSE 0 END) AS push_orders,
        SUM(CASE WHEN MESSAGE_TYPE = 'email' THEN UNIQUE_DELIVERED ELSE 0 END) AS email_sends,
        SUM(CASE WHEN MESSAGE_TYPE = 'sms'   THEN UNIQUE_DELIVERED ELSE 0 END) AS sms_sends,
        SUM(CASE WHEN MESSAGE_TYPE = 'push'  THEN UNIQUE_DELIVERED ELSE 0 END) AS push_sends
      FROM POWERBI.MAIN.PBI_EMAIL_ALL_METRICS_BY_CAMPAIGN
      WHERE DELIVERED_DATE::DATE ${dateRange(s, e)}
        ${campaignFilters}
    `;

    const [volume, volumeMom, volumeYoy] = await Promise.all([
      executeAsync(conn, volumeQuery(start, end), []),
      executeAsync(conn, volumeQuery(momStart, momEnd), []),
      executeAsync(conn, volumeQuery(yoyStart, yoyEnd), []),
    ]);

    const [sends, sendsMom, sendsYoy] = await Promise.all([
      executeAsync(conn, sendsQuery(start, end), []),
      executeAsync(conn, sendsQuery(momStart, momEnd), []),
      executeAsync(conn, sendsQuery(yoyStart, yoyEnd), []),
    ]);

    const [eng, engMom, engYoy] = await Promise.all([
      executeAsync(conn, engagementQuery(start, end), []),
      executeAsync(conn, engagementQuery(momStart, momEnd), []),
      executeAsync(conn, engagementQuery(yoyStart, yoyEnd), []),
    ]);

    const [chan, chanMom, chanYoy] = await Promise.all([
      executeAsync(conn, channelRevenueQuery(start, end), []),
      executeAsync(conn, channelRevenueQuery(momStart, momEnd), []),
      executeAsync(conn, channelRevenueQuery(yoyStart, yoyEnd), []),
    ]);


    const v = volume[0] ?? {};
    const vM = volumeMom[0] ?? {};
    const vY = volumeYoy[0] ?? {};
    const s = sends[0] ?? {};
    const sM = sendsMom[0] ?? {};
    const sY = sendsYoy[0] ?? {};
    const e = eng[0] ?? {};
    const eM = engMom[0] ?? {};
    const eY = engYoy[0] ?? {};
    const c = chan[0] ?? {};
    const cM = chanMom[0] ?? {};
    const cY = chanYoy[0] ?? {};

    return {
      periodStart: start,
      periodEnd: end,
      generatedAt: new Date(),

      totalRevenue: mv(num(v, 'total_revenue'), num(vM, 'total_revenue'), num(vY, 'total_revenue')),
      totalOrders:  mv(num(v, 'total_orders'),  num(vM, 'total_orders'),  num(vY, 'total_orders')),

      emailsSent:    mv(num(s, 'emails_sent'),    num(sM, 'emails_sent'),    num(sY, 'emails_sent')),
      smsSent:       mv(num(s, 'sms_sent'),       num(sM, 'sms_sent'),       num(sY, 'sms_sent')),
      pushDelivered: mv(num(s, 'push_delivered'), num(sM, 'push_delivered'), num(sY, 'push_delivered')),

      emailOpenRate:   mv(num(e, 'email_open_rate'),   num(eM, 'email_open_rate'),   num(eY, 'email_open_rate')),
      emailClickRate:  mv(num(e, 'email_click_rate'),  num(eM, 'email_click_rate'),  num(eY, 'email_click_rate')),
      unsubscribeRate: mv(num(e, 'unsubscribe_rate'),  num(eM, 'unsubscribe_rate'),  num(eY, 'unsubscribe_rate')),

      emailRevenue:  mv(num(c, 'email_revenue'), num(cM, 'email_revenue'), num(cY, 'email_revenue')),
      emailOrders:   mv(num(c, 'email_orders'),  num(cM, 'email_orders'),  num(cY, 'email_orders')),
      emailConvRate: mv(
        rpk(num(c,  'email_orders'), num(c,  'email_sends')) / 1000,
        rpk(num(cM, 'email_orders'), num(cM, 'email_sends')) / 1000,
        rpk(num(cY, 'email_orders'), num(cY, 'email_sends')) / 1000,
      ),
      emailAov: mv(
        num(c,  'email_orders') > 0 ? num(c,  'email_revenue') / num(c,  'email_orders') : 0,
        num(cM, 'email_orders') > 0 ? num(cM, 'email_revenue') / num(cM, 'email_orders') : 0,
        num(cY, 'email_orders') > 0 ? num(cY, 'email_revenue') / num(cY, 'email_orders') : 0,
      ),
      emailRpk: mv(
        rpk(num(c,  'email_revenue'), num(c,  'email_sends')),
        rpk(num(cM, 'email_revenue'), num(cM, 'email_sends')),
        rpk(num(cY, 'email_revenue'), num(cY, 'email_sends')),
      ),

      smsRevenue:  mv(num(c, 'sms_revenue'), num(cM, 'sms_revenue'), num(cY, 'sms_revenue')),
      smsOrders:   mv(num(c, 'sms_orders'),  num(cM, 'sms_orders'),  num(cY, 'sms_orders')),
      smsConvRate: mv(
        rpk(num(c,  'sms_orders'), num(c,  'sms_sends')) / 1000,
        rpk(num(cM, 'sms_orders'), num(cM, 'sms_sends')) / 1000,
        rpk(num(cY, 'sms_orders'), num(cY, 'sms_sends')) / 1000,
      ),
      smsAov: mv(
        num(c,  'sms_orders') > 0 ? num(c,  'sms_revenue') / num(c,  'sms_orders') : 0,
        num(cM, 'sms_orders') > 0 ? num(cM, 'sms_revenue') / num(cM, 'sms_orders') : 0,
        num(cY, 'sms_orders') > 0 ? num(cY, 'sms_revenue') / num(cY, 'sms_orders') : 0,
      ),
      smsRpk: mv(
        rpk(num(c,  'sms_revenue'), num(c,  'sms_sends')),
        rpk(num(cM, 'sms_revenue'), num(cM, 'sms_sends')),
        rpk(num(cY, 'sms_revenue'), num(cY, 'sms_sends')),
      ),

      pushRevenue:  mv(num(c, 'push_revenue'), num(cM, 'push_revenue'), num(cY, 'push_revenue')),
      pushOrders:   mv(num(c, 'push_orders'),  num(cM, 'push_orders'),  num(cY, 'push_orders')),
      pushConvRate: mv(
        rpk(num(c,  'push_orders'), num(c,  'push_sends')) / 1000,
        rpk(num(cM, 'push_orders'), num(cM, 'push_sends')) / 1000,
        rpk(num(cY, 'push_orders'), num(cY, 'push_sends')) / 1000,
      ),
      pushAov: mv(
        num(c,  'push_orders') > 0 ? num(c,  'push_revenue') / num(c,  'push_orders') : 0,
        num(cM, 'push_orders') > 0 ? num(cM, 'push_revenue') / num(cM, 'push_orders') : 0,
        num(cY, 'push_orders') > 0 ? num(cY, 'push_revenue') / num(cY, 'push_orders') : 0,
      ),
      pushRpk: mv(
        rpk(num(c,  'push_revenue'), num(c,  'push_sends')),
        rpk(num(cM, 'push_revenue'), num(cM, 'push_sends')),
        rpk(num(cY, 'push_revenue'), num(cY, 'push_sends')),
      ),
    };
  } finally {
    conn.destroy((err) => {
      if (err) console.error('Snowflake disconnect error:', err);
    });
  }
}
