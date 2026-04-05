import React from 'react';
import Logo from './Logo';
import { LogOut } from 'lucide-react';

interface StudentSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'tasks', label: 'Oppgaver', icon: '📝' },
    { id: 'calendar', label: 'Timeplan', icon: '📅' },
    { id: 'uploads', label: 'Innleveringer', icon: '📤' },
    { id: 'messages', label: 'Meldinger', icon: '💬' },
    { id: 'resources', label: 'Ressurser', icon: '📚' },
    { id: 'settings', label: 'Innstillinger', icon: '⚙️' },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Logo iconSize="w-6 h-6 text-sm" textSize="text-lg" />
        <button onClick={onLogout} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 h-screen bg-white border-r border-gray-100 p-4 flex-col sticky top-0">
        <div className="mb-8 px-2 flex items-center">
          <Logo iconSize="w-8 h-8 text-lg" textSize="text-xl" />
        </div>
        <nav className="space-y-1 flex-grow">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <button onClick={onLogout} className="mt-auto w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
          <span>🚪</span> Logg ut
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-safe">
        <div className="flex items-center justify-around p-2 overflow-x-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center p-2 min-w-[64px] ${
                activeTab === item.id ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default StudentSidebar;
