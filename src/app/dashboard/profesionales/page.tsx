import DashboardHeader from '../DashboardHeader';
import ProfesionalesClient from './ProfesionalesClient';

export default function ProfesionalesPage() {
  return (
    <>
      <DashboardHeader title="Profesionales" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Profesionales</h1>
            <p className="text-gray-400">Administrá las personas que trabajan en tu negocio.</p>
          </div>
          <ProfesionalesClient />
        </div>
      </div>
    </>
  );
}
