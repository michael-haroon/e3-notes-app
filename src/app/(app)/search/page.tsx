import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SearchView } from "@/components/notes/SearchView";

export default async function SearchPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.activeOrgId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">Search</span>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <SearchView />
      </main>
    </div>
  );
}
