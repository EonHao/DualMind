import React, { useState } from 'react';
import { Drawer, Button, Typography, Space } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined, CloseOutlined } from '@ant-design/icons';
import ParameterPanel from './ParameterPanel';
import ChatInterface from './ChatInterface';
import { SimulationParameters } from '../types';
import './StrategyRefinementDrawer.css';

const { Title } = Typography;

interface StrategyRefinementDrawerProps {
  visible: boolean;
  onClose: () => void;
  onStrategyConfirm: (strategy: string, parameters: SimulationParameters) => void;
}

const StrategyRefinementDrawer: React.FC<StrategyRefinementDrawerProps> = ({
  visible,
  onClose,
  onStrategyConfirm,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [parameters, setParameters] = useState<SimulationParameters>({
    agents: 10,
    interactionProbability: 0.5,
    positiveResponseProbability: 0.3,
    negativeResponseProbability: 0.3,
    neutralResponseProbability: 0.4,
    initialPositiveSentiment: 0.2,
    initialNegativeSentiment: 0.6,
    initialNeutralSentiment: 0.2,
  });

  const handleParameterChange = (key: keyof SimulationParameters, value: number) => {
    setParameters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const [lastLLMMessage, setLastLLMMessage] = useState<string>('');

  const handleStrategyGenerated = (strategy: string) => {
    // 这里可以处理策略生成逻辑
    console.log('Generated strategy:', strategy);
  };

  const handleLastLLMMessageChange = (message: string) => {
    setLastLLMMessage(message);
  };

  const handleConfirm = () => {
    // 使用最后一条LLM消息作为策略
    const finalStrategy = lastLLMMessage.trim() || "No strategy generated from chat";
    onStrategyConfirm(finalStrategy, parameters);
    onClose();
  };

  return (
    <>
      <Drawer
        title={null}
        placement="right"
        onClose={onClose}
        open={visible}
        width={isFullscreen ? '100vw' : '80vw'}
        className={`strategy-drawer ${isFullscreen ? 'fullscreen' : ''}`}
        mask={!isFullscreen}
        maskClosable={!isFullscreen}
        closable={false}
        bodyStyle={{ padding: 0, height: '100vh' }}
      >
        <div className="drawer-content">
          <div className="drawer-header">
            <Title level={2} className="drawer-title">LLM Strategy Refinement</Title>
            <Space>
              <Button
                type="text"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="header-button"
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={onClose}
                className="header-button"
              />
            </Space>
          </div>
          
          <div className="drawer-body">
            <div className="left-panel">
              <ParameterPanel
                parameters={parameters}
                onParameterChange={handleParameterChange}
              />
              <div className="confirm-section">
                <Button
                  type="primary"
                  size="large"
                  onClick={handleConfirm}
                  className="confirm-button"
                >
                  Confirm Final Strategy & Return
                </Button>
              </div>
            </div>
            
            <div className="right-panel">
              <ChatInterface 
                onStrategyGenerated={handleStrategyGenerated} 
                onLastLLMMessageChange={handleLastLLMMessageChange}
              />
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default StrategyRefinementDrawer;
