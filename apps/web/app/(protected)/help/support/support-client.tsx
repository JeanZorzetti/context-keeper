"use client";

import { useState, useEffect } from "react";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
}

const statusColors: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};

export default function SupportClient() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      if (res.ok) setTickets(data.tickets);
    } catch {
      // silent — list stays empty
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitResult({ type: "error", text: data.error || "Failed to submit ticket" });
        return;
      }

      setSubmitResult({ type: "success", text: "Ticket submitted successfully. We'll get back to you soon." });
      setSubject("");
      setMessage("");
      setTickets((prev) => [data.ticket, ...prev]);
    } catch {
      setSubmitResult({ type: "error", text: "Failed to submit ticket. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Support</h1>
        <p className="text-gray-600">Open a support ticket and we&apos;ll get back to you.</p>
      </div>

      {/* Open a ticket */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Open a Support Ticket</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
              placeholder="Brief description of your issue"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, and your browser/OS."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>

          {submitResult && (
            <div
              className={`p-3 rounded text-sm ${
                submitResult.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {submitResult.type === "success" ? "✓" : "✕"} {submitResult.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </form>
      </section>

      {/* Before you open a ticket */}
      <section className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-indigo-900 mb-2">Before opening a ticket</h2>
        <ul className="space-y-1 text-sm text-indigo-800">
          <li>→ Check the <a href="/help/troubleshooting" className="hover:underline font-medium">Troubleshooting</a> page</li>
          <li>→ Include the exact error (browser console or terminal output)</li>
          <li>→ Mention your browser/OS and whether the issue is reproducible</li>
        </ul>
      </section>

      {/* GitHub Issues */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">GitHub Issues</h2>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 text-xl flex-shrink-0">⌥</div>
          <div>
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
      </section>

      {/* Your Tickets */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Tickets</h2>
        {ticketsLoading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : tickets.length === 0 ? (
          <p className="text-gray-500 text-sm">No tickets yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(ticket.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded ${statusColors[ticket.status]}`}>
                  {statusLabels[ticket.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
