import DashboardHeader from '../DashboardHeader';
import TurnosClient from './TurnosClient';

export default function TurnosPage() {
  return (
    <>
      <DashboardHeader title="Turnos" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Turnos</h1>
            <p className="text-gray-400">Gestioná las reservas de tu negocio.</p>
          </div>
          <TurnosClient />
        </div>
      </div>
    </>
  );
}
