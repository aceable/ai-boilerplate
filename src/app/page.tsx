import { BookOpen, Database, Layers, Rocket, Zap } from 'lucide-react';

const Page = () => {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-4xl font-bold flex gap-2 items-center mb-2">
          <Zap className="text-primary" /> AI Boilerplate
        </h1>
        <p className="text-muted-foreground">
          A Next.js 15 starter with optional Clerk auth, system-aware theming, Tailwind v4, Neon Postgres, Drizzle ORM, and the Vercel AI SDK — runs out of the box with zero env setup.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold flex gap-2 items-center mb-3">
          <Rocket className="h-5 w-5" /> Getting Started
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Rename the app: update <code className="bg-muted px-1 py-0.5 rounded text-xs">APP_NAME</code> in{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">src/lib/config.ts</code> (propagates to the header, page title, and anywhere it&apos;s referenced).
          </li>
          <li>
            Run <code className="bg-muted px-1 py-0.5 rounded text-xs">npm run dev</code>. The app boots immediately as a public site with no env setup.
          </li>
          <li>
            (Optional) Copy{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">.env.example</code> to{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">.env.local</code> and fill in what you need — see{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">AGENTS.md</code> for auth setup (use{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">pk_test_*</code> keys for local + non-prod deploys).
          </li>
          <li>
            (Optional) If using a database, run <code className="bg-muted px-1 py-0.5 rounded text-xs">npm run db:push</code> after setting{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">DATABASE_URL</code>.
          </li>
          <li>Replace this page and start building.</li>
        </ol>
      </div>

      <div>
        <h2 className="text-xl font-semibold flex gap-2 items-center mb-3">
          <Layers className="h-5 w-5" /> Tech Stack
        </h2>
        <ul className="space-y-1.5 text-sm">
          <li>
            <a href="https://nextjs.org/docs" className="text-primary font-medium">Next.js 15</a>
            {' '}— App Router, Server Components, Turbopack
          </li>
          <li>
            <a href="https://clerk.com/docs" className="text-primary font-medium">Clerk</a>
            {' '}— Optional auth, flag-gated via{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_ENABLE_USER_AUTH</code>
          </li>
          <li>
            <a href="https://neon.tech/docs" className="text-primary font-medium">Neon Postgres</a>
            {' '}+{' '}
            <a href="https://orm.drizzle.team/docs/overview" className="text-primary font-medium">Drizzle ORM</a>
            {' '}— Serverless DB with type-safe queries
          </li>
          <li>
            <a href="https://sdk.vercel.ai/docs" className="text-primary font-medium">Vercel AI SDK</a>
            {' '}— Streaming, structured outputs, multi-provider
          </li>
          <li>
            <a href="https://tailwindcss.com/docs" className="text-primary font-medium">Tailwind v4</a>
            {' '}+{' '}
            <a href="https://github.com/pacocoursey/next-themes" className="text-primary font-medium">next-themes</a>
            {' '}— Styling + system-aware dark mode with a header toggle
          </li>
          <li>
            <a href="https://docs.railway.com" className="text-primary font-medium">Railway</a>
            {' '}— Preferred deploy target (see{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">railway.json</code>)
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-semibold flex gap-2 items-center mb-3">
          <Database className="h-5 w-5" /> Database Commands
        </h2>
        <ul className="space-y-1.5 text-sm font-mono">
          <li><code className="bg-muted px-1.5 py-0.5 rounded">npm run db:push</code> — push schema changes to your database</li>
          <li><code className="bg-muted px-1.5 py-0.5 rounded">npm run db:studio</code> — open the Drizzle Studio UI</li>
          <li><code className="bg-muted px-1.5 py-0.5 rounded">npm run db:generate</code> — generate migration files for production</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-semibold flex gap-2 items-center mb-3">
          <BookOpen className="h-5 w-5" /> Docs
        </h2>
        <ul className="space-y-1.5 text-sm">
          <li>Engineering standards + auth/theme setup — <code className="bg-muted px-1 py-0.5 rounded text-xs">AGENTS.md</code></li>
          <li>Development setup — <code className="bg-muted px-1 py-0.5 rounded text-xs">docs/DEVELOPMENT.md</code></li>
          <li>Security baseline — <code className="bg-muted px-1 py-0.5 rounded text-xs">docs/security.md</code></li>
          <li>Testing strategy — <code className="bg-muted px-1 py-0.5 rounded text-xs">docs/testing-strategy.md</code></li>
          <li>AI workflow — <code className="bg-muted px-1 py-0.5 rounded text-xs">docs/ai-workflow.md</code></li>
        </ul>
      </div>
    </div>
  );
};

export default Page;
