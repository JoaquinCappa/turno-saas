import { getAuthenticatedContext } from '@/lib/auth';
import LogoutButton from './LogoutButton';

export default async function DashboardHeader({ title }: { title: string }) {
  const session = await getAuthenticatedContext();
  const userName = session?.user?.name || 'Usuario';
  const userRole = session?.user?.role || 'STAFF';

  return (
    <header className="h-16 md:h-20 bg-[#0A0A0B] border-b border-gray-800 flex items-center justify-between px-6 lg:px-10 flex-shrink-0">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-bold text-white">{userName}</div>
          <div className="text-xs text-gray-500">{userRole}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-bold text-white uppercase">
          {userName.charAt(0)}
        </div>
        <div className="md:hidden ml-2">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
