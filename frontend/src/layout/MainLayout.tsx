import React from 'react';
import { Layout, ConfigProvider, theme } from 'antd';
import Header from './Header';
import './MainLayout.css';

const { Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
  currentScenario?: 'scenario1' | 'scenario2' | 'home';
  onScenarioChange?: (scenario: 'scenario1' | 'scenario2' | 'home') => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentScenario, onScenarioChange }) => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          colorBgBase: '#f5f7fb',
          colorTextBase: '#1f2937',
          borderRadius: 12,
          fontFamily: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Layout: {
            headerBg: 'transparent',
            bodyBg: 'transparent',
          },
          Card: {
            colorBgContainer: 'transparent',
          },
          Button: {
            controlHeight: 44,
          },
        },
      }}
    >
      <Layout className="main-layout">
        <Header currentScenario={currentScenario} onScenarioChange={onScenarioChange} />
        <Content className="main-content">
          {children}
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default MainLayout;
