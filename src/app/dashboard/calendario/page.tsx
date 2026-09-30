import DashboardHeader from '../DashboardHeader';
import CalendarioClient from './CalendarioClient';

export default function CalendarioPage() {
  return (
    <>
      <DashboardHeader title="Calendario" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Calendario</h1>
            <p className="text-gray-400">Acá vas a poder visualizar y gestionar la agenda de tu negocio.</p>
          </div>
          <CalendarioClient />
        </div>
      </div>
    </>
  );
}
