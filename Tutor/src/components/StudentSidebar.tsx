import React from 'react';

interface StudentSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'tasks', label: 'Mine Oppgaver', icon: '📝' },
    { id: 'calendar', label: 'Timeplan', icon: '📅' },
    { id: 'uploads', label: 'Mine Innleveringer', icon: '📤' },
    { id: 'messages', label: 'Meldinger', icon: '💬' },
    { id: 'resources', label: 'Ressurser', icon: '📚' },
    { id: 'settings', label: 'Innstillinger', icon: '⚙️' },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 p-4 flex flex-col sticky top-0">
      <div className="mb-8 px-2">
        <h2 className="text-xl font-bold text-blue-600">ElevPortal</h2>
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
  );
};

export default StudentSidebar;
