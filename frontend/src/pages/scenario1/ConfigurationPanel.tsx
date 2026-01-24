import React, { useState, useEffect } from 'react';
import { Card, Select, Input, Button, Space, Typography, Progress } from 'antd';
import { ThunderboltOutlined, SendOutlined, RightOutlined, EyeOutlined, LockOutlined } from '@ant-design/icons';
import { LLMOption, SimulationState } from '../../types';
import { SimulationStatus } from '../../services/api';
import ContentModal from '../../components/ContentModal';
import './ConfigurationPanel.css';

const { Title } = Typography;
const { TextArea } = Input;

interface ConfigurationPanelProps {
  onStartSimulation: (config: any) => void;
  onStartNextRound: (strategy: string) => void;
  onGenerateReport: () => void;
  onReset: () => void;
  onOpenDrawer: () => void;
  simulationState?: SimulationState;
  confirmedStrategy?: string;
  onResetFields?: () => void;
  pollingStatus?: SimulationStatus | null;
  isPolling?: boolean;
  pollingError?: string | null;
  isGeneratingReport?: boolean;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  onStartSimulation,
  onStartNextRound,
  onGenerateReport,
  onReset,
  onOpenDrawer,
  simulationState,
  confirmedStrategy,
  onResetFields,
  pollingStatus = null,
  isPolling = false,
  pollingError = null,
  isGeneratingReport = false,
}) => {
  const [selectedLLM, setSelectedLLM] = useState<string>('gpt-4-turbo');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [prStrategy, setPrStrategy] = useState<string>('');
  const [nextRoundStrategy, setNextRoundStrategy] = useState<string>('');
  
  // Modal states
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [strategyModalVisible, setStrategyModalVisible] = useState(false);

  const llmOptions: LLMOption[] = [
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
    { value: 'gpt-4-turbo', label: 'gpt-4-turbo' },
    { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
    { value: 'gpt-5-mini', label: 'gpt-5-mini' },
    { value: 'gemini-2.5-flash-preview-05-20', label: 'gemini-2.5-flash-preview-05-20'},
    //Tested and found unusable { value: 'gemini-2.5-flash-preview-09-2025', label: 'gemini-2.5-flash-preview-09-2025' }, 
    { value: 'gemini-2.5-pro-preview-03-25', label: 'gemini-2.5-pro-preview-03-25' },
  ];

  // Listen for changes in confirmedStrategy and auto-fill the strategy input box
  useEffect(() => {
    if (confirmedStrategy && confirmedStrategy.trim()) {
      if (simulationState?.isRunning) {
        // If the simulation is running, fill in the next round's strategy
        setNextRoundStrategy(confirmedStrategy);
      } else {
        // If the simulation has not started, fill in the first round's strategy
        setPrStrategy(confirmedStrategy);
      }
    }
  }, [confirmedStrategy, simulationState?.isRunning]);

  // Reset all fields
  const resetFields = () => {
    setSelectedLLM('gpt-4-turbo');
    setEventDescription('');
    setPrStrategy('');
    setNextRoundStrategy('');
  };

  // When the parent component calls reset, clear the fields
  useEffect(() => {
    if (onResetFields) {
      onResetFields();
    }
  }, [onResetFields]);

  const handleStartSimulation = () => {
    const config = {
      llm: selectedLLM,
      eventDescription: eventDescription,
      strategy: {
        content: prStrategy,
        isOptimized: false, // Not optimized by default, user needs to optimize via the sidebar
      },
      enableRefinement: false,
    };
    onStartSimulation(config);
  };

  const handleStartNextRound = () => {
    if (!nextRoundStrategy.trim()) {
      return;
    }
    onStartNextRound(nextRoundStrategy);
    setNextRoundStrategy('');
  };

  // If the simulation is in progress, display the locked state
  if (simulationState?.isRunning) {
    return (
      <>
        <Card className="configuration-panel glassmorphism">
          <Title level={4} className="panel-title">Simulation in Progress</Title>
          
          <div className="config-content">
            {/* Locked configuration */}
            <div className="config-section">
              <label className="config-label locked-label">
                <LockOutlined className="locked-icon" />
                LLM Selection
              </label>
              <div className="locked-value">
                {simulationState.lockedConfig.llm}
              </div>
            </div>

            <div className="config-section">
              <label className="config-label locked-label">
                <LockOutlined className="locked-icon" />
                Event Description
              </label>
              <Button
                className="content-button"
                icon={<EyeOutlined />}
                onClick={() => setEventModalVisible(true)}
              >
                View Event Description
              </Button>
            </div>

            <div className="config-section">
              <label className="config-label locked-label">
                <LockOutlined className="locked-icon" />
                Previous Rounds' Strategies
              </label>
              <Button
                className="content-button"
                icon={<EyeOutlined />}
                onClick={() => setStrategyModalVisible(true)}
              >
                View All Previous Strategies
              </Button>
            </div>

            {/* Next round configuration */}
            <div className="config-section">
              <label className="config-label">LLM Strategy Refinement</label>
              <div className="refinement-toggle" onClick={onOpenDrawer}>
                <Space>
                  <ThunderboltOutlined className="refinement-icon" />
                  <span className="refinement-text">Enable LLM Strategy Refinement</span>
                </Space>
                <RightOutlined className="refinement-arrow" />
              </div>
            </div>

            <div className="config-section">
              <label className="config-label">Next Round Strategy</label>
              <TextArea
                className="strategy-input"
                value={nextRoundStrategy}
                onChange={(e) => setNextRoundStrategy(e.target.value)}
                placeholder="Enter your next round PR response strategy..."
                rows={4}
                showCount
                maxLength={1000}
              />
            </div>

            <div className="config-actions">
              <Button
                type="primary"
                size="large"
                className="action-button primary-button"
                onClick={handleStartNextRound}
                icon={<SendOutlined />}
                disabled={!nextRoundStrategy.trim()}
              >
                Start Next Round Simulation
              </Button>
              
              <Button
                size="large"
                className="action-button secondary-button"
                onClick={onGenerateReport}
                loading={isGeneratingReport}
                disabled={isGeneratingReport}
              >
                {isGeneratingReport ? 'Generating Report...' : 'Generate Report & View Results'}
              </Button>
              
              <Button
                size="large"
                className="action-button secondary-button"
                onClick={() => {
                  resetFields();
                  onReset();
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </Card>

        {/* Modals */}
        <ContentModal
          visible={eventModalVisible}
          onClose={() => setEventModalVisible(false)}
          title="Event Description"
          content={simulationState.lockedConfig.eventDescription}
        />

        <ContentModal
          visible={strategyModalVisible}
          onClose={() => setStrategyModalVisible(false)}
          title="Previous Rounds' Strategies"
          content={simulationState.strategyHistory
            .map(item => `Round ${item.round} (${item.timestamp.toLocaleString()}):\n${item.strategy}`)
            .join('\n\n' + '='.repeat(50) + '\n\n')
          }
        />
      </>
    );
  }

  // Initial configuration state
  return (
    <Card className="configuration-panel glassmorphism">
      <Title level={4} className="panel-title">Configuration</Title>
      
      <div className="config-content">
        <div className="config-section">
          <label className="config-label">LLM Selection</label>
          <Select
            className="config-select"
            value={selectedLLM}
            onChange={setSelectedLLM}
            options={llmOptions}
            placeholder="Select LLM"
          />
        </div>

        <div className="config-section">
          <label className="config-label">Event Description</label>
          <TextArea
            className="strategy-input"
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            placeholder="Describe the PR crisis event..."
            rows={3}
            showCount
            maxLength={500}
          />
        </div>

        <div className="config-section">
          <label className="config-label">LLM Strategy Refinement</label>
          <div className="refinement-toggle" onClick={onOpenDrawer}>
            <Space>
              <ThunderboltOutlined className="refinement-icon" />
              <span className="refinement-text">Enable LLM Strategy Refinement</span>
            </Space>
            <RightOutlined className="refinement-arrow" />
          </div>
        </div>

        <div className="config-section">
          <label className="config-label">First Round PR Strategy</label>
          <TextArea
            className="strategy-input"
            value={prStrategy}
            onChange={(e) => setPrStrategy(e.target.value)}
            placeholder="Enter your first round PR response strategy..."
            rows={4}
            showCount
            maxLength={1000}
          />
        </div>

        {/* Polling status display */}
        {(isPolling || pollingError) && (
          <div className="config-section">
            <label className="config-label">Simulation Status</label>
            <div className="polling-status">
              {pollingError ? (
                <div className="error-status">
                  <div className="status-info">
                    <span className="error-text">{pollingError}</span>
                  </div>
                </div>
              ) : pollingStatus ? (
                <>
                  <div className="status-info">
                    <span className="status-text">
                      {pollingStatus.status === 'running' ? 'Running...' : 
                       pollingStatus.status === 'completed' ? 'Completed' : 
                       pollingStatus.status === 'error' ? 'Error' : 'Unknown'}
                    </span>
                    <span className="round-info">Round {pollingStatus.currentRound}</span>
                  </div>
                  {pollingStatus.status === 'running' && (
                    <Progress 
                      percent={pollingStatus.progress} 
                      size="small" 
                      status="active"
                      className="polling-progress"
                    />
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}

        <div className="config-actions">
          <Button
            type="primary"
            size="large"
            className="action-button primary-button"
            onClick={handleStartSimulation}
            icon={<SendOutlined />}
          >
            Start Simulation
          </Button>
          
          <Button
            size="large"
            className="action-button secondary-button"
            onClick={() => {
              resetFields();
              onReset();
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ConfigurationPanel;
