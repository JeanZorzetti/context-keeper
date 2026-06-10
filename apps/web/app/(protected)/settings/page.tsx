import { getSession } from "@/lib/auth0";
import { getPrisma } from "@/lib/prisma";
import SettingsClient from "./settings-client";

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const prisma = getPrisma();
  const session = await getSession();

  const user = await prisma.user.findUnique({
    where: { auth0Id: session?.user?.sub || "" },
  });

  return (
    <SettingsClient
      userEmail={session?.user?.email}
      initialAiProvider={user?.aiProvider}
      initialAiApiKey={user?.aiApiKey}
      initialAiModel={user?.aiModel}
      initialAiBaseUrl={user?.aiBaseUrl}
      initialAutoCommit={user?.autoCommit ?? true}
      initialApiToken={user?.apiToken}
    />
  );
}
