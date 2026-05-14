export interface MetricValue {
  value: number;
  momDelta: number;
  yoyDelta: number;
}

export interface LifecycleWeeklyData {
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;

  // Volume
  totalRevenue: MetricValue;
  totalOrders: MetricValue;
  emailsSent: MetricValue;
  smsSent: MetricValue;
  pushDelivered: MetricValue;

  // Engagement
  emailOpenRate: MetricValue;
  emailClickRate: MetricValue;
  unsubscribeRate: MetricValue;

  // Email channel
  emailRevenue: MetricValue;
  emailOrders: MetricValue;
  emailConvRate: MetricValue;
  emailAov: MetricValue;
  emailRpk: MetricValue;

  // SMS channel
  smsRevenue: MetricValue;
  smsOrders: MetricValue;
  smsConvRate: MetricValue;
  smsAov: MetricValue;
  smsRpk: MetricValue;

  // Push channel
  pushRevenue: MetricValue;
  pushOrders: MetricValue;
  pushConvRate: MetricValue;
  pushAov: MetricValue;
  pushRpk: MetricValue;
}
