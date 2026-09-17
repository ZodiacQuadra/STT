import React from 'react';
import ReactDOM from 'react-dom/client';
import UnifiedOperationsPortal from './src/webparts/unifiedOperationsPortal/components/UnifiedOperationsPortal';

const App: React.FC = () => {
  return (
    <UnifiedOperationsPortal
      userDisplayName="Admin User"
      userEmail="admin@sttgdc.com"
      isDarkTheme={false}
      hasTeamsContext={false}
    />
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
