"use client";

import { useState, useEffect } from "react";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

interface AdminTicket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  createdAt: string;
  user: { email: string };
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

const ALL_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "CLOSED"];

export default function AdminTicketsClient() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then((r) => r.json())
      .then((data) => {
        if (data.tickets) setTickets(data.tickets);
        else setError("Failed to load tickets.");
      })
      .catch(() => setError("Failed to load tickets."))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: TicketStatus) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      );
    } catch {
      setError("Failed to update ticket status.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Support Tickets</h1>
        <p className="text-gray-500 text-sm">Admin view — all user tickets</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : tickets.length === 0 ? (
        <p className="text-gray-500 text-sm">No tickets yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Message</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{ticket.user.email}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">{ticket.subject}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs">
                    <span className="line-clamp-2">{ticket.message}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[ticket.status]}`}>
                        {statusLabels[ticket.status]}
                      </span>
                      <select
                        value={ticket.status}
                        disabled={updating === ticket.id}
                        onChange={(e) => updateStatus(ticket.id, e.target.value as TicketStatus)}
                        className="text-xs border border-gray-300 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {statusLabels[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
