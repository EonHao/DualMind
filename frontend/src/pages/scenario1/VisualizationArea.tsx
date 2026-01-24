import React from 'react';
import { Card, Typography } from 'antd';
import NetworkVisualization from '../../components/NetworkVisualization';
import './VisualizationArea.css';

const { Title } = Typography;

interface VisualizationAreaProps {
  isLoading?: boolean;
  isSimulationRunning?: boolean;
  hasCompletedSimulation?: boolean;
  onAnimationCompleted?: () => void;
  networkData?: any;
  simulationResult?: any;
  animationKey?: number;
  isReportJustClosed?: boolean;
  shouldKeepFinalState?: boolean;
  preservedUserColorStates?: { [username: string]: { r: number; g: number; b: number } };
  onColorStatesChange?: (colorStates: { [username: string]: { r: number; g: number; b: number } }) => void;
}

const VisualizationArea: React.FC<VisualizationAreaProps> = ({
  isLoading: _isLoading = false,
  isSimulationRunning = false,
  hasCompletedSimulation = false,
  onAnimationCompleted,
  networkData,
  simulationResult: _simulationResult,
  animationKey = 0,
  isReportJustClosed = false,
  shouldKeepFinalState = false,
  preservedUserColorStates = {},
  onColorStatesChange,
}) => {
  console.log('VisualizationArea - Props:', { 
    isLoading: _isLoading, 
    isSimulationRunning, 
    hasCompletedSimulation,
    hasNetworkData: !!networkData,
    networkData: networkData
  });
  return (
    <Card className="visualization-area glassmorphism">
      <Title level={4} className="visualization-title">
        Social Network Propagation
      </Title>
      
      <div className="visualization-content">
        {(() => {
          console.log('VisualizationArea - Rendering decision:', { 
            isSimulationRunning, 
            hasNetworkData: !!networkData,
            networkData: networkData,
            willShowRunning: isSimulationRunning,
            willShowNetwork: !isSimulationRunning && !!networkData,
            willShowEmpty: !isSimulationRunning && !networkData
          });
          return null;
        })()}
        {/* Always render NetworkVisualization to maintain state, just hide it when running */}
        {networkData && (
          <div className="network-visualization" style={{ display: isSimulationRunning ? 'none' : 'block' }}>
            <NetworkVisualization 
              users={networkData.users}
              platforms={networkData.platforms}
              isLoading={false}
              hasCompletedSimulation={hasCompletedSimulation}
              onAnimationCompleted={onAnimationCompleted}
              animationKey={animationKey}
              isReportJustClosed={isReportJustClosed}
              shouldKeepFinalState={shouldKeepFinalState}
              preservedUserColorStates={preservedUserColorStates}
              onColorStatesChange={onColorStatesChange}
            />
          </div>
        )}
        
        {isSimulationRunning && (
          <div className="simulation-running-state">
            <div className="simulation-loading-icon">
              <div className="loading-spinner"></div>
            </div>
            <h3 className="simulation-title">Running Simulation...</h3>
            <p className="simulation-description">
              The AI agents are processing your PR strategy and simulating public opinion propagation.
              This may take a few moments.
            </p>
            <div className="simulation-progress">
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
            </div>
          </div>
        )}
        
        {!isSimulationRunning && !networkData && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="2"/>
                <circle cx="32" cy="32" r="4" fill="currentColor"/>
              </svg>
            </div>
            <p className="empty-text">
              Configure your PR strategy and start simulation to see the network propagation
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default VisualizationArea;
