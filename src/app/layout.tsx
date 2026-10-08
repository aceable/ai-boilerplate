import { APP_DESCRIPTION, APP_NAME } from '@/lib/config';
import { MyThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import type React from 'react';
import { USER_AUTH_ENABLED } from '@/lib/env';
import ClientLayout from './client-layout';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <MyThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ClientLayout>{children}</ClientLayout>
      <Toaster />
    </MyThemeProvider>
  );

  // Clerk Core 3 requires ClerkProvider inside <body>, not wrapping <html>.
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {USER_AUTH_ENABLED ? (
          <ClerkProvider
            appearance={{ options: { unsafe_disableDevelopmentModeWarnings: true } }}
          >
            {content}
          </ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
