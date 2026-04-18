import React, { useState } from 'react';
import Logo from './Logo';
import { LogOut, Menu, X } from 'lucide-react';

interface StudentSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const menuItems = [
    { id: 'tasks', label: 'Oppgaver', icon: '📝' },
    { id: 'calendar', label: 'Timeplan', icon: '📅' },
    { id: 'uploads', label: 'Innleveringer', icon: '📤' },
    { id: 'messages', label: 'Meldinger', icon: '💬' },
    { id: 'resources', label: 'Ressurser', icon: '📚' },
    { id: 'settings', label: 'Innstillinger', icon: '⚙️' },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu className="h-6 w-6" />
          </button>
          <Logo iconSize="w-6 h-6 text-sm" textSize="text-lg" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onLogout} className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={`md:hidden fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <Logo iconSize="w-6 h-6 text-sm" textSize="text-lg" />
          <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1 flex-grow overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <span>🚪</span> Logg ut
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 h-screen bg-white border-r border-gray-100 p-4 flex-col sticky top-0">
        <div className="mb-8 px-2 flex items-center justify-between">
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
    </>
  );
};

export default StudentSidebar;
