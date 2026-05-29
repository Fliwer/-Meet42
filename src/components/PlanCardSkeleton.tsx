import React from "react";

export default function PlanCardSkeleton() {
  return (
    <div className="rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-sm animate-pulse">
      <div className="flex gap-3">
        <div className="h-14 w-14 rounded-2xl bg-zinc-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-zinc-200" />
          <div className="h-3 w-1/2 rounded bg-zinc-100" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-7 w-24 rounded-full bg-zinc-100" />
        <div className="h-7 w-20 rounded-full bg-zinc-100" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-zinc-200" />
        <div className="h-9 w-9 rounded-full bg-zinc-200" />
        <div className="h-9 w-9 rounded-full bg-zinc-200" />
      </div>
    </div>
  );
}
