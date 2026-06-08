import Link from "next/link";
import { JsonLd } from "@/components/blog/JsonLd";
import { organizationSchema, webSiteSchema } from "@/lib/schema";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd schema={organizationSchema()} />
      <JsonLd schema={webSiteSchema()} />
      <nav className="flex justify-between items-center px-8 py-4 bg-white shadow-sm">
        <Link href="/" className="text-2xl font-bold text-indigo-600">
          Context Keeper
        </Link>
        <div className="flex items-center space-x-6">
          <Link href="/blog" className="text-gray-600 hover:text-indigo-600">
            Blog
          </Link>
          <Link
            href="/api/auth/login"
            className="text-indigo-600 hover:text-indigo-700"
          >
            Sign In
          </Link>
          <Link
            href="/api/auth/login"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Get Started
          </Link>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="bg-gray-900 text-white px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400">
              © 2026 Context Keeper. Part of the ROI Labs family.
            </p>
            <div className="flex space-x-6 text-gray-400 text-sm">
              <Link href="/blog" className="hover:text-white">
                Blog
              </Link>
              <Link href="/api/auth/login" className="hover:text-white">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
