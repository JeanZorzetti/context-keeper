import { getSession } from "@auth0/nextjs-auth0";
import { getPrisma } from "@/lib/prisma";
import SettingsClient from "./settings-client";

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const prisma = getPrisma();
  const session = await getSession();

  // Get user settings from database
  const user = await prisma.user.findUnique({
    where: { auth0Id: session?.user?.sub || "" },
  });

  return (
    <SettingsClient
      userEmail={session?.user?.email}
      initialGroqApiKey={user?.groqApiKey}
      initialAutoCommit={user?.autoCommit ?? true}
      initialApiToken={user?.apiToken}
    />
  );
}
