import { getSession } from "@auth0/nextjs-auth0";
import prisma from "@/lib/prisma";
import SettingsClient from "./settings-client";

export default async function Settings() {
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
