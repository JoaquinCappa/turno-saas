export default function StatusBadge({ status }: { status: string }) {
  const isConfirmed = status.toLowerCase() === 'confirmado' || status.toLowerCase() === 'activo';
  const isPending = status.toLowerCase() === 'pendiente';
  const isCancelled = status.toLowerCase() === 'cancelado' || status.toLowerCase() === 'inactivo';

  let colorClasses = 'bg-gray-500/10 text-gray-400';
  if (isConfirmed) colorClasses = 'bg-green-500/10 text-green-400';
  if (isPending) colorClasses = 'bg-yellow-500/10 text-yellow-400';
  if (isCancelled) colorClasses = 'bg-red-500/10 text-red-400';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${colorClasses}`}>
      {status}
    </span>
  );
}
