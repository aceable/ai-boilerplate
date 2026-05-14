export const formatCurrency = (n: number) =>
  `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export const formatNumber = (n: number) => n.toLocaleString('en-US');

export const formatRate = (n: number) => `${(n * 100).toFixed(2)}%`;

export const formatRpK = (n: number) => `$${n.toFixed(2)}`;

export const formatDelta = (n: number) =>
  `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
