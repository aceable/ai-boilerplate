import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from './theme-toggle';

// next-themes reads prefers-color-scheme through matchMedia, which jsdom lacks.
let prefersDark = false;

beforeEach(() => {
  prefersDark = false;
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' && prefersDark,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
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

  it('renders the button on the client and switches light to dark', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(document.documentElement).toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(document.documentElement).toHaveClass('light');
  });

  it('switches to light in one click when the system theme is dark', async () => {
    const user = userEvent.setup();
    prefersDark = true;
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(document.documentElement).toHaveClass('light');
  });
});
