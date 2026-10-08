import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from './theme-toggle';

beforeEach(() => {
  // next-themes reads prefers-color-scheme through matchMedia, which jsdom lacks.
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      media: query,
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  localStorage.clear();
  document.documentElement.className = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeToggle', () => {
  it('server-renders a hidden placeholder instead of the button', () => {
    const html = renderToString(
      <ThemeProvider attribute="class">
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('Toggle theme');
  });

  it('renders the button on the client and switches light to dark', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(document.documentElement).toHaveClass('dark');
  });
});
