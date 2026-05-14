'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { BRANDS, VERTICALS } from '@/lib/lifecycle-filters';
import type { Brand, Vertical } from '@/lib/lifecycle-filters';

interface FilterRowProps {
  label: string;
  options: readonly string[];
  paramKey: string;
  current: string;
  onSelect: (key: string, value: string) => void;
}

function FilterRow({ label, options, paramKey, current, onSelect }: FilterRowProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-gray-500 text-xs uppercase tracking-widest w-16 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-wrap">
        {options.map((option) => {
          const isActive = option === current;
          return (
            <button
              key={option}
              onClick={() => onSelect(paramKey, option)}
              data-testid={`filter-${paramKey}-${option.toLowerCase().replace(/[\s.]/g, '-')}`}
              className={[
                'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                isActive
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-transparent border-[#30363d] text-gray-400 hover:border-teal-500/60 hover:text-teal-300',
              ].join(' ')}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface FilterBarProps {
  brand: Brand;
  vertical: Vertical;
}

export function FilterBar({ brand, vertical }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'All') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  return (
    <div
      className="bg-[#161b22] border border-[#30363d] rounded-lg px-5 py-4 flex flex-col gap-3"
      data-testid="filter-bar"
    >
      <FilterRow
        label="Brand"
        options={BRANDS}
        paramKey="brand"
        current={brand}
        onSelect={handleSelect}
      />
      <FilterRow
        label="Vertical"
        options={VERTICALS}
        paramKey="vertical"
        current={vertical}
        onSelect={handleSelect}
      />
    </div>
  );
}
