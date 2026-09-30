import DashboardHeader from '../DashboardHeader';
import ClientesClient from './ClientesClient';

export default function ClientesPage() {
  return (
    <>
      <DashboardHeader title="Clientes" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Clientes</h1>
            <p className="text-gray-400">Consultá y administrá tus clientes.</p>
          </div>
          <ClientesClient />
        </div>
      </div>
    </>
  );
}
