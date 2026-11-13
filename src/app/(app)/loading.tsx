export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-48 animate-pulse rounded-md bg-surface" />
      <div className="h-32 animate-pulse rounded-xl bg-surface" />
      <div className="h-64 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}
