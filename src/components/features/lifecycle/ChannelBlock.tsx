import { type ReactNode } from 'react';

interface ChannelBlockProps {
  name: string;
  borderColorClass: string;
  children: ReactNode;
  'data-testid'?: string;
}

export function ChannelBlock({
  name,
  borderColorClass,
  children,
  'data-testid': testId,
}: ChannelBlockProps) {
  return (
    <div data-testid={testId} className={`pl-4 ${borderColorClass} border-l-4`}>
      <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3">
        {name}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {children}
      </div>
    </div>
  );
}
