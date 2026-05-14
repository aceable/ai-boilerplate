import { type ReactNode } from 'react';

interface MetricSectionProps {
  title: string;
  children: ReactNode;
  gridClassName?: string;
  'data-testid'?: string;
}

export function MetricSection({
  title,
  children,
  gridClassName = 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4',
  'data-testid': testId,
}: MetricSectionProps) {
  return (
    <section data-testid={testId}>
      <h2 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3 border-b border-[#30363d] pb-2">
        {title}
      </h2>
      <div className={gridClassName}>
        {children}
      </div>
    </section>
  );
}
