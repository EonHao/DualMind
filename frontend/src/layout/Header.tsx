import React from 'react';
import { Layout, Menu, Avatar, Button, Space } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import './Header.css';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  currentScenario?: 'scenario1' | 'scenario2' | 'home';
  onScenarioChange?: (scenario: 'scenario1' | 'scenario2' | 'home') => void;
}

const Header: React.FC<HeaderProps> = ({ currentScenario, onScenarioChange }) => {
  const menuItems = [
    {
      key: 'home',
      label: 'Home',
    },
    {
      key: 'scenario1',
      label: 'Case Study 1',
    },
    {
      key: 'scenario2',
      label: 'Case Study 2',
    },
  ];

  return (
    <AntHeader className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_6_330)">
                  <path 
                    clipRule="evenodd" 
                    d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" 
                    fill="currentColor" 
                    fillRule="evenodd"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_6_330">
                    <rect fill="white" height="48" width="48" />
                  </clipPath>
                </defs>
              </svg>
            </div>
            <h1 className="logo-text">DualMind</h1>
          </div>
        </div>
        
        <div className="header-center">
          <Menu
            mode="horizontal"
            selectedKeys={currentScenario ? [currentScenario] : []}
            items={menuItems}
            className="header-menu"
            onClick={({ key }) => {
              if (onScenarioChange) {
                onScenarioChange(key as 'scenario1' | 'scenario2' | 'home');
              }
            }}
          />
        </div>
        
        <div className="header-right">
          <Space>
            <Button 
              type="text" 
              icon={<BellOutlined />} 
              className="header-icon-btn"
            />
            <Avatar 
              size="small"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKQiI7JzZQPr_fgYPp47hdYz9C43HRRScEDZNL4BLOb91re3naLKBicjC_3x0lHQAfsokHqbQoebvDM6EaBYdnbrzOtu6B1qz4rbVjVH1r-CY6yW8-ZcMUMwtS45lAk2bNTa-LIfBD-7yhLQ20Rbr2tzlyjdpMB5bBaObNkcOypEDlxBayJ4s8O-pudWV30JaLELlfIZmIUe9PHWp9Y-otGNELch7LsD8hAeT5fpG8nOJbCg1AE8HLZWkvyjWHmfCl1RPu77jbhgo"
            />
          </Space>
        </div>
      </div>
    </AntHeader>
  );
};

export default Header;
