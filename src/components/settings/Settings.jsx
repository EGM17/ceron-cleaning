import { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  FileText
} from 'lucide-react';
import CompanySettings from './CompanySettings';
import CalendarSettings from './CalendarSettings';
import InvoiceSettings from './InvoiceSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('company');

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'calendar', label: 'Calendar Integration', icon: Calendar },
    { id: 'invoices', label: 'Invoices', icon: FileText }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return <CompanySettings />;
      case 'calendar':
        return <CalendarSettings />;
      case 'invoices':
        return <InvoiceSettings />;
      default:
        return <CompanySettings />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
          Settings
        </h1>
        <p className="text-gray-600">Manage your platform configuration and preferences</p>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;