"use client";

import { useState } from "react";

const PROVIDER_LINKS: Record<string, { label: string; url: string; placeholder: string }> = {
  groq:      { label: "console.groq.com", url: "https://console.groq.com", placeholder: "gsk_..." },
  openai:    { label: "platform.openai.com/api-keys", url: "https://platform.openai.com/api-keys", placeholder: "sk-..." },
  anthropic: { label: "console.anthropic.com", url: "https://console.anthropic.com", placeholder: "sk-ant-..." },
  gemini:    { label: "aistudio.google.com/apikey", url: "https://aistudio.google.com/apikey", placeholder: "AIza..." },
  ollama:    { label: "", url: "", placeholder: "" },
};

const MODEL_DEFAULTS: Record<string, string> = {
  groq:      "llama-3.3-70b-versatile",
  openai:    "gpt-4o-mini",
  anthropic: "claude-haiku-4-5",
  gemini:    "gemini-2.0-flash",
  ollama:    "llama3.1",
};

interface SettingsClientProps {
  userEmail?: string;
  initialAiProvider?: string | null;
  initialAiApiKey?: string | null;
  initialAiModel?: string | null;
  initialAiBaseUrl?: string | null;
  initialAutoCommit?: boolean;
  initialApiToken?: string | null;
}

export default function SettingsClient({
  userEmail,
  initialAiProvider,
  initialAiApiKey,
  initialAiModel,
  initialAiBaseUrl,
  initialAutoCommit = true,
  initialApiToken,
}: SettingsClientProps) {
  const [aiProvider, setAiProvider] = useState(initialAiProvider || "groq");
  const [aiApiKey, setAiApiKey] = useState(initialAiApiKey || "");
  const [aiModel, setAiModel] = useState(initialAiModel || "");
  const [aiBaseUrl, setAiBaseUrl] = useState(initialAiBaseUrl || "");
  const [autoCommit, setAutoCommit] = useState(initialAutoCommit);
  const [apiToken, setApiToken] = useState(initialApiToken || "");
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiProvider,
          aiApiKey: aiApiKey || null,
          aiModel: aiModel || null,
          aiBaseUrl: aiBaseUrl || null,
          autoCommit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to save settings",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Settings saved successfully",
      });
    } catch (error) {
      console.error("Settings save error:", error);
      setMessage({
        type: "error",
        text: "Failed to save settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    setTokenLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/api-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to generate API token",
        });
        return;
      }

      setApiToken(data.apiToken);
      setMessage({
        type: "success",
        text: "API token generated successfully",
      });
    } catch (error) {
      console.error("Token generation error:", error);
      setMessage({
        type: "error",
        text: "Failed to generate API token",
      });
    } finally {
      setTokenLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (apiToken) {
      navigator.clipboard.writeText(apiToken);
      setMessage({
        type: "success",
        text: "Token copied to clipboard",
      });
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure your Context Keeper preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Provider Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              AI Provider
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose the AI provider for automatic decision extraction. The daemon fetches this config from the dashboard.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="groq">Groq (free tier available)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="ollama">Ollama (local)</option>
                </select>
              </div>

              {aiProvider !== "ollama" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    placeholder={PROVIDER_LINKS[aiProvider]?.placeholder ?? ""}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {PROVIDER_LINKS[aiProvider]?.url && (
                    <p className="text-xs text-gray-500 mt-1">
                      Get your key at{" "}
                      <a
                        href={PROVIDER_LINKS[aiProvider].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {PROVIDER_LINKS[aiProvider].label}
                      </a>
                    </p>
                  )}
                </div>
              )}

              {aiProvider === "ollama" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ollama Base URL
                  </label>
                  <input
                    type="text"
                    placeholder="http://localhost:11434"
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder={`Default: ${MODEL_DEFAULTS[aiProvider] ?? "provider default"}`}
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {message && (
                <div
                  className={`p-3 rounded text-sm ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {message.type === "success" ? "✓" : "✕"} {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save AI Settings"}
              </button>
            </form>
          </div>

          {/* Auto-Commit Setting */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Daemon Settings
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure how the daemon handles context updates.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoCommit}
                  onChange={(e) => setAutoCommit(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">
                  Auto-commit context updates
                </span>
              </label>
              <p className="text-xs text-gray-500">
                When enabled, the daemon will automatically commit changes to CLAUDE.md
                after extracting decisions. Otherwise, changes are saved but not committed.
              </p>

              {message && (
                <div
                  className={`p-3 rounded text-sm ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {message.type === "success" ? "✓" : "✕"} {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Settings"}
              </button>
            </form>
          </div>

          {/* Daemon Integration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Daemon Integration
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Generate an API token to authenticate your daemon with Context Keeper.
            </p>

            <div className="space-y-4">
              <button
                onClick={handleGenerateToken}
                disabled={tokenLoading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tokenLoading ? "Generating..." : "Generate API Token"}
              </button>

              {apiToken && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your API Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiToken}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono text-gray-600 bg-gray-50"
                    />
                    <button
                      onClick={handleCopyToken}
                      className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Add to your daemon's <code className="bg-gray-100 px-1 rounded">.env</code> file:
                  </p>
                  <code className="block bg-gray-50 border border-gray-200 rounded p-2 mt-2 text-xs text-gray-700 overflow-x-auto">
                    CONTEXT_KEEPER_TOKEN={apiToken}
                  </code>
                </div>
              )}

              {message && (
                <div
                  className={`p-3 rounded text-sm ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {message.type === "success" ? "✓" : "✕"} {message.text}
                </div>
              )}
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Account
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="mt-1 text-gray-600">{userEmail}</p>
              </div>

              <div>
                <a
                  href="/api/auth/logout"
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Sign Out
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Help */}
        <div className="lg:col-span-1">
          <div className="bg-indigo-50 rounded-lg p-6 sticky top-24">
            <h3 className="font-semibold text-indigo-900 mb-4">Need Help?</h3>
            <ul className="space-y-3 text-sm text-indigo-800">
              <li>
                <a href="/help/installation" className="hover:underline">
                  → Installation Guide
                </a>
              </li>
              <li>
                <a href="/help/api" className="hover:underline">
                  → API Documentation
                </a>
              </li>
              <li>
                <a href="/help/troubleshooting" className="hover:underline">
                  → Troubleshooting
                </a>
              </li>
              <li>
                <a href="/help/support" className="hover:underline">
                  → Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
