export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="skeleton mb-6 h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="skeleton mt-8 h-64" />
    </div>
  );
}
