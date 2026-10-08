import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { useIsMobile } from './use-mobile';

// jsdom has no matchMedia; this stub lets each test set the query result and fire change events.
let matches = false;
let listeners: Array<() => void> = [];

beforeEach(() => {
  matches = false;
  listeners = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      media: query,
      get matches() {
        return matches;
      },
      addEventListener: (_type: string, cb: () => void) => listeners.push(cb),
      removeEventListener: (_type: string, cb: () => void) => {
        listeners = listeners.filter((l) => l !== cb);
      },
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useIsMobile', () => {
  it('queries the 767px max-width breakpoint', () => {
    renderHook(() => useIsMobile());
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('is true on the first client render when the mobile query matches', () => {
    matches = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('is false when the mobile query does not match', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('updates when the media query changes', () => {
    const { result } = renderHook(() => useIsMobile());
    act(() => {
      matches = true;
      listeners.forEach((l) => l());
    });
    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners).toHaveLength(1);
    unmount();
    expect(listeners).toHaveLength(0);
  });

  it('renders false on the server', () => {
    matches = true;
    function Probe() {
      return <>{String(useIsMobile())}</>;
    }
    expect(renderToString(<Probe />)).toBe('false');
  });
});
