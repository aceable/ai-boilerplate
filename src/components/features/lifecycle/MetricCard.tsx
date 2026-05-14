import { formatCurrency, formatNumber, formatRate, formatRpK, formatDelta } from '@/lib/format';

interface MetricCardProps {
  label: string;
  value: number;
  format: 'currency' | 'number' | 'rate' | 'rpk';
  momDelta: number;
  yoyDelta: number;
  favorableDirection: 'up' | 'down';
  subLabel?: string;
  'data-testid'?: string;
}

function formatValue(value: number, format: MetricCardProps['format']): string {
  switch (format) {
    case 'currency': return formatCurrency(value);
    case 'number':   return formatNumber(value);
    case 'rate':     return formatRate(value);
    case 'rpk':      return formatRpK(value);
  }
}

interface DeltaBadgeProps {
  label: string;
  delta: number;
  favorableDirection: 'up' | 'down';
}

function DeltaBadge({ label, delta, favorableDirection }: DeltaBadgeProps) {
  const isPositive = delta >= 0;
  const isFavorable =
    favorableDirection === 'up' ? isPositive : !isPositive;

  const colorClass = isFavorable
    ? 'text-emerald-400 bg-emerald-900/40'
    : 'text-red-400 bg-red-900/40';

  const arrow = isPositive ? '▲' : '▼';

  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 text-xs uppercase tracking-widest">{label}</span>
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
        {arrow} {formatDelta(delta)}
      </span>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  format,
  momDelta,
  yoyDelta,
  favorableDirection,
  subLabel,
  'data-testid': testId,
}: MetricCardProps) {
  return (
    <div
      className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex flex-col gap-3"
      data-testid={testId}
    >
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-widest font-medium">{label}</p>
        {subLabel && (
          <p className="text-gray-600 text-xs mt-0.5">{subLabel}</p>
        )}
      </div>

      <p className="text-3xl font-bold text-white tabular-nums leading-none">
        {formatValue(value, format)}
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        <DeltaBadge label="MoM" delta={momDelta} favorableDirection={favorableDirection} />
        <DeltaBadge label="YoY" delta={yoyDelta} favorableDirection={favorableDirection} />
      </div>
    </div>
  );
}
