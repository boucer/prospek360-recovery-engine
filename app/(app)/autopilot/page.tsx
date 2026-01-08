// app/(app)/autopilot/page.tsx
import AutopilotClient from "@/components/autopilot/AutopilotClient";

type SearchParamsLike = Record<string, string | string[] | undefined>;

export default async function AutopilotPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsLike> | SearchParamsLike;
}) {
  const sp = (await Promise.resolve(searchParams ?? {})) as SearchParamsLike;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-[1500px] p-6 lg:p-8">
        <AutopilotClient initialSearchParams={sp} />
      </div>
    </main>
  );
}
