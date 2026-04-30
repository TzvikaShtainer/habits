import React, { useState } from 'react';
import { CalendarView } from './CalendarView';

const TAB_KEY = 'center-tab';

const TABS = [
  { id: 'habits', label: 'הרגלים' },
  { id: 'weekly', label: 'לו"ז שבועי' },
  { id: 'monthly', label: 'לו"ז חודשי' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface Props {
  children: React.ReactNode;
  completionByDate?: Record<string, number>;
}

export function CenterTabs({ children, completionByDate }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const saved = localStorage.getItem(TAB_KEY) as TabId | null;
    return saved && TABS.some(t => t.id === saved) ? saved : 'habits';
  });

  function selectTab(id: TabId) {
    setActiveTab(id);
    localStorage.setItem(TAB_KEY, id);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-slate-700 mb-4 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/50',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'habits' && <div className="h-full">{children}</div>}
        {activeTab === 'weekly' && (
          <div className="h-full" style={{ minHeight: 480 }}>
            <CalendarView view="week" completionByDate={completionByDate} />
          </div>
        )}
        {activeTab === 'monthly' && (
          <div className="h-full" style={{ minHeight: 480 }}>
            <CalendarView view="month" completionByDate={completionByDate} />
          </div>
        )}
      </div>
    </div>
  );
}
