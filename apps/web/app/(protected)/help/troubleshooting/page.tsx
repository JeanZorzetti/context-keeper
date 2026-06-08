export const dynamic = 'force-dynamic';

const issues = [
  {
    title: '"Error loading user" on Dashboard or Billing',
    solution:
      'Visit /dashboard first. The system creates your profile automatically on first visit. If the problem persists, sign out and log in again.',
  },
  {
    title: 'Invalid Groq key or "API key not valid"',
    solution:
      'Check that the key in Settings starts with "gsk_". Go to console.groq.com, confirm the key is active, and generate a new one if needed.',
  },
  {
    title: 'Daemon does not start / "command not found"',
    solution:
      'Make sure Node.js 18+ is installed. Run: node --version. Try npx --yes @jeanzorzetti/context-keeper start to force a fresh download.',
  },
  {
    title: 'Daemon starts but does not capture decisions',
    solution:
      'Check that Claude Code is generating transcripts in the default directory. Confirm your Groq key is configured in Settings and is active.',
  },
  {
    title: 'Login not working / redirect loop',
    solution:
      'Clear browser cookies for context.nimblabs.com. If you use an ad blocker, allow cookies from auth0.com. Try in a private/incognito window.',
  },
  {
    title: 'Logout CORS error',
    solution:
      'Use the "Sign Out" button in the navigation menu. If the problem persists, navigate directly to: https://context.nimblabs.com/api/auth/logout',
  },
  {
    title: 'Billing page not loading / plan not updating',
    solution:
      'After a payment, wait a few seconds and reload the page. The Stripe webhook may take a moment to process.',
  },
  {
    title: 'Database connection error',
    solution:
      'This is a server-side error — no user action is required. Wait a few minutes and try again. If it persists, contact support.',
  },
];

export default function TroubleshootingPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Troubleshooting</h1>
        <p className="text-gray-600">Solutions to the most common Context Keeper issues.</p>
      </div>

      {issues.map(({ title, solution }) => (
        <section key={title} className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-700 text-sm">{solution}</p>
        </section>
      ))}
    </div>
  );
}
