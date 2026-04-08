import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SearchView } from "@/components/notes/SearchView";

export default async function SearchPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.activeOrgId) redirect("/dashboard");

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">Search</h1>
        <p className="text-sm text-dim mt-1">Search across all notes in this org</p>
      </div>
      <SearchView />
    </div>
  );
}
