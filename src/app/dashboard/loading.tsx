import { ArrowPathIcon } from "@heroicons/react/24/outline";

export default function DashboardLoading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-8 space-y-4">
      <ArrowPathIcon className="h-10 w-10 animate-spin text-blue-600" />
      <h2 className="text-xl font-medium text-slate-700 animate-pulse">Loading data...</h2>
      <p className="text-sm text-slate-500">Please wait while we fetch your information.</p>
    </div>
  );
}
