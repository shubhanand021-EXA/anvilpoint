import { AppProvider, useApp } from '../features/store/appStore.js';
import { Shell } from '../components/layout/Shell.js';
import { OverviewPage } from '../pages/Overview.js';
import { AnalysisPage } from '../pages/Analysis.js';
import { FindingsPage } from '../pages/Findings.js';
import { DocsPage } from '../pages/Docs.js';
import { DepsPage } from '../pages/Deps.js';
import { CiPage } from '../pages/Ci.js';
import { ChecklistPage } from '../pages/Checklist.js';
import { ReportsPage } from '../pages/Reports.js';
import { IntegrationsPage } from '../pages/Integrations.js';
import { SettingsPage } from '../pages/Settings.js';

function Router() {
  const { page } = useApp();
  switch (page) {
    case 'overview': return <OverviewPage />;
    case 'analysis': return <AnalysisPage />;
    case 'findings': return <FindingsPage />;
    case 'docs': return <DocsPage />;
    case 'deps': return <DepsPage />;
    case 'ci': return <CiPage />;
    case 'checklist': return <ChecklistPage />;
    case 'reports': return <ReportsPage />;
    case 'integrations': return <IntegrationsPage />;
    case 'settings': return <SettingsPage />;
  }
}

export function App() {
  return (
    <AppProvider>
      <Shell><Router /></Shell>
    </AppProvider>
  );
}
