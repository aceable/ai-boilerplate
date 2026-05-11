import type { FullConfig } from '@playwright/test';

// Global setup runs BEFORE Playwright's webServer is started, so we
// can't hit the dev server here. Use this hook only to seed env state
// that the webServer + tests will read. Playwright's webServer.url
// already handles "is the server reachable" before tests start.
//
 
function globalSetup(_config: FullConfig) {
  process.env['PLAYWRIGHT_TESTING'] = 'true';
   
  console.log('🎭 Playwright Global Setup: Authentication bypass enabled');
}

export default globalSetup;
