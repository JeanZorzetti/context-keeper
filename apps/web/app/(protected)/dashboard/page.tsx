import { getSession } from "@auth0/nextjs-auth0";
import { getPrisma } from "@/lib/prisma";
import { Project, Decision } from "@prisma/client";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const prisma = getPrisma();
  const session = await getSession();

  if (!session?.user?.sub) {
    return <div>Error loading user</div>;
  }

  // Get or create user
  let user = await prisma.user.findUnique({
    where: { auth0Id: session.user.sub },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        auth0Id: session.user.sub,
        email: session.user.email || "",
      },
    });
  }

  // Get user's projects and decisions
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      decisions: {
        orderBy: { capturedAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalDecisions = await prisma.decision.count({
    where: {
      project: { userId: user.id },
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Manage your projects and captured architectural decisions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-indigo-600">
            {user.plan === "PERSONAL" ? `${projects.length}/5` : projects.length}
          </div>
          <div className="text-sm text-gray-600">
            {user.plan === "PERSONAL" ? "Tracked Projects (limit)" : "Tracked Projects"}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-indigo-600">{totalDecisions}</div>
          <div className="text-sm text-gray-600">Decisions Captured</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-indigo-600">
            {user.plan === "FREE" ? "Free Plan" : user.plan}
          </div>
          <div className="text-sm text-gray-600">Current Plan</div>
        </div>
      </div>

      {/* Plan limit warning */}
      {user.plan === "PERSONAL" && projects.length >= 5 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm font-medium">
            ⚠️ You've reached the project limit for the Personal plan (5 projects). Upgrade to Pro to add more projects.
          </p>
        </div>
      )}

      {/* Projects */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
        </div>

        {projects.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600 mb-4">No projects tracked yet.</p>
            <p className="text-sm text-gray-500">
              Install the context-keeper daemon to start capturing decisions from your coding sessions.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {projects.map((project: Project & { decisions: Decision[] }) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono">{project.path}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {project.decisions.length} recent decisions
                  </div>
                </div>

                {project.decisions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Recent Decisions
                    </h4>
                    <ul className="space-y-1">
                      {project.decisions.map((decision) => (
                        <li
                          key={decision.id}
                          className="text-sm text-gray-600 border-l-2 border-indigo-200 pl-3"
                        >
                          {decision.text}
                          <span className="text-xs text-gray-400 ml-2">
                            {decision.capturedAt.toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Get Started</h3>
        <p className="text-blue-800 mb-4">
          To start capturing architectural decisions, install and run the context-keeper daemon:
        </p>
        <code className="block bg-white p-4 rounded border border-blue-200 text-sm font-mono text-gray-800 mb-4">
          npx context-keeper start
        </code>
        <p className="text-sm text-blue-700">
          <Link
            href="/settings"
            className="underline hover:text-blue-900"
          >
            Configure your Groq API key in Settings
          </Link>
          {" "}to get started.
        </p>
      </div>
    </div>
  );
}
