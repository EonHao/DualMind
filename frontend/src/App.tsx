/**
 * Main application component
 * Configure global state
 */

import React from 'react';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import './App.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#2563eb',
            borderRadius: 6,
            colorBgBase: '#f5f7fb',
            colorTextBase: '#1f2937',
            fontFamily:
              '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
          },
          components: {
            Layout: {
              bodyBg: '#f5f7fb',
            },
          },
        }}
      >
        <AntdApp>
          <div className="app">
            <Dashboard />
          </div>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
