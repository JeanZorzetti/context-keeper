export const dynamic = 'force-dynamic';

export default function SupportPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Support</h1>
        <p className="text-gray-600">Didn&apos;t find the answer? Reach out to the team.</p>
      </div>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Support Channels</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-xl flex-shrink-0">✉</div>
            <div>
              <h3 className="font-semibold text-gray-900">Email</h3>
              {/* TODO: confirm real support email with user before go-live */}
              <p className="text-gray-600 text-sm">
                support@nimblabs.com{' '}
                <span className="text-yellow-600 text-xs">(⚠ confirm address)</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">Response within 2 business days.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 text-xl flex-shrink-0">⌥</div>
            <div>
              <h3 className="font-semibold text-gray-900">GitHub Issues</h3>
              <a
                href="https://github.com/JeanZorzetti/context-keeper/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline text-sm"
              >
                github.com/JeanZorzetti/context-keeper/issues
              </a>
              <p className="text-gray-500 text-xs mt-1">For bugs or feature suggestions.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-indigo-900 mb-2">Before opening a ticket</h2>
        <ul className="space-y-1 text-sm text-indigo-800">
          <li>→ Check the <a href="/help/troubleshooting" className="hover:underline font-medium">Troubleshooting</a> page</li>
          <li>→ Include the exact error (browser console or terminal output)</li>
          <li>→ Mention your browser/OS and whether the issue is reproducible</li>
        </ul>
      </section>
    </div>
  );
}
