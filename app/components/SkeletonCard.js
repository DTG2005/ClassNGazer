'use client';

export default function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-full animate-pulse flex flex-col h-[130px]">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
        <div className="h-3 bg-gray-100 rounded w-1/3 mb-4"></div>
      </div>
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
        <div className="h-3 bg-gray-100 rounded w-1/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-full animate-pulse flex items-center justify-between">
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-3 bg-gray-100 rounded w-1/4"></div>
      </div>
      <div className="h-8 bg-gray-100 rounded w-20"></div>
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
