export const dynamic = "force-dynamic";

import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import AdminTicketsClient from "./admin-tickets-client";

export default async function AdminTicketsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/api/auth/login?returnTo=/admin/tickets");
  }

  if (!isAdmin(session.user.email)) {
    redirect("/dashboard");
  }

  return <AdminTicketsClient />;
}
