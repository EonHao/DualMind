import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Typography, Button, message } from 'antd';
import {
  ReloadOutlined,
  BarChartOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { HistoricalCase } from '../../types';
import Scenario2ReportPage from './Scenario2ReportPage';
import EvaluationMetricsReportPage from './EvaluationMetricsReportPage';
import VisualizationArea from '../scenario1/VisualizationArea';
import { useStartScenario2Simulation, useScenario2SimulationStatus, useGenerateScenario2Report, useAddScenario2Strategy, useScenario2SimulationResult, useResetSimulation } from '../../hooks/useApi';
import { transformSimulationResultToNetworkData } from '../../utils/dataTransformer';
import './Scenario2SimulationPage.css';

const { Title, Text } = Typography;

type ReportType = 'comparative' | 'metrics';

interface Scenario2SimulationPageProps {
  selectedCase: HistoricalCase | null;
  llmModel: string; 
  onBack: () => void;
  onReselectCase: () => void;
}

const Scenario2SimulationPage: React.FC<Scenario2SimulationPageProps> = ({
  selectedCase,
  llmModel,
  onBack: _onBack,
  onReselectCase,
}) => {
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [currentReportType, setCurrentReportType] = useState<ReportType>('comparative');
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [hasCompletedSimulation, setHasCompletedSimulation] = useState<boolean>(false);
  const [isStartingNewRound, setIsStartingNewRound] = useState<boolean>(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);
  const [animationKey, setAnimationKey] = useState(0); // Used to force reset animation
  const [isReportJustClosed, setIsReportJustClosed] = useState(false); // Track if the report was just closed
  const [shouldKeepFinalState, setShouldKeepFinalState] = useState<boolean>(false); // Flag to determine if the final state should be kept

  // API hooks
  const startSimulationMutation = useStartScenario2Simulation();
  const addScenario2StrategyMutation = useAddScenario2Strategy(); // Use Scenario2's API
  const generateReportMutation = useGenerateScenario2Report();
  const resetSimulationMutation = useResetSimulation(); // Add reset functionality
  const { data: simulationStatusData } = useScenario2SimulationStatus(simulationId, isSimulationRunning);
  // Use Scenario2's data fetching method
  const { data: simulationResultData } = useScenario2SimulationResult(simulationId);

  // Listen for simulation state changes
  useEffect(() => {
    if (simulationStatusData?.success && simulationStatusData.data) {
      const status = simulationStatusData.data.status;
      const round = simulationStatusData.data.currentRound;
      console.log('Scenario 2 simulation status:', status, 'round:', round);
      
      if (status === 'completed' && isSimulationRunning) {
        console.log('Scenario 2 simulation completed, stopping polling and fetching results');
        setIsSimulationRunning(false);
        setCurrentRound(round);
        // Don't set hasCompletedSimulation here, let the animation component set it via the onAnimationCompleted callback
      } else if (status === 'error') {
        console.log('Scenario 2 simulation failed');
        setIsSimulationRunning(false);
        message.error('Simulation failed');
      }
    }
  }, [simulationStatusData, isSimulationRunning]);

  // Listen for data fetch results, and stop the loading state if there is data
  useEffect(() => {
    // If a new round is starting, ignore old cached data
    if (isStartingNewRound) {
      console.log('Ignoring cached data because isStartingNewRound is true');
      return;
    }
    
    if (simulationResultData?.success && simulationResultData.data && isSimulationRunning) {
      console.log('Scenario 2 simulation result data received, stopping loading state');
      setIsSimulationRunning(false);
    }
  }, [simulationResultData, isSimulationRunning, isStartingNewRound]);

  // Listen to all data states to determine if data is ready
  useEffect(() => {
    const hasStatusData = !!simulationStatusData?.success;
    const hasResultData = !!simulationResultData?.success;
    
    if (hasStatusData && hasResultData) {
      console.log('All Scenario 2 simulation data ready, data is available for animation');
      // Don't set hasCompletedSimulation here, let the animation start first
    }
  }, [simulationStatusData, simulationResultData]);

  // Use ref to save the previous network data
  const previousNetworkDataRef = useRef<any>(null);
  
  // Handle network data transformation - use the same method as Scenario1
  const memoizedNetworkData = useMemo(() => {
    console.log('====== [DATA DEBUG] Scenario2 - memoizedNetworkData computing ======');
    console.log('[DATA DEBUG] isStartingNewRound:', isStartingNewRound);
    console.log('[DATA DEBUG] simulationResultData:', simulationResultData?.success ? 'has data' : 'no data');
    
    // If a new round is starting, return the previous round's data to keep the component mounted
    if (isStartingNewRound) {
      console.log('[DATA DEBUG] Returning previous networkData because isStartingNewRound=true');
      return previousNetworkDataRef.current;
    }
    
    // Data transformation: Convert backend format to frontend expected format
    if (simulationResultData?.success && simulationResultData.data) {
      console.log('[DATA DEBUG] Processing simulation result data');
      console.log('[DATA DEBUG] Agents data:', simulationResultData.data.agents?.map((a: any) => ({
        username: a.username,
        stance: a.stanceScore || a.objective_stance_score
      })));
      
      try {
        // Convert data format to match the expected interface
        const transformedData = {
          ...simulationResultData.data,
          agents: simulationResultData.data.agents.map((agent: any) => ({
            ...agent,
            // The field name returned by the backend is influence_score, needs conversion
            influenceScore: agent.influence_score !== undefined ? agent.influence_score : (agent.influenceScore || 0)
          }))
        };
        
        const result = transformSimulationResultToNetworkData(
          transformedData
        );
        
        console.log('[DATA DEBUG] Transformed network data users:', result?.users?.map((u: any) => ({
          username: u.username,
          stance: u.objective_stance_score
        })));
        
        // Save current data for the next round
        previousNetworkDataRef.current = result;
        
        return result;
      } catch (error) {
        console.error('Error transforming simulation data:', error);
        // If transformation fails, try a simplified version
        if (simulationResultData.data.agents) {
          // Convert data format to match the expected interface
          const transformedAgents = simulationResultData.data.agents.map((agent: any) => ({
            ...agent,
            // The field name returned by the backend is influence_score, needs conversion
            influenceScore: agent.influence_score || 0
          }));
          const result = transformSimulationResultToNetworkData({
            ...simulationResultData.data,
            agents: transformedAgents
          });
          previousNetworkDataRef.current = result;
          return result;
        }
      }
    }
    console.log('[DATA DEBUG] Returning undefined because no valid data');
    return previousNetworkDataRef.current || undefined;
  }, [simulationResultData, isStartingNewRound]);

  // Debug log
  console.log('Scenario2SimulationPage - Current state:', {
    simulationId,
    isSimulationRunning,
    isStartingNewRound,
    hasStatusData: !!simulationStatusData,
    hasResultData: !!simulationResultData,
    hasCompletedSimulation
  });

  const handleStartSimulation = async () => {
    if (!selectedCase) {
      message.error('Please select a case first');
      return;
    }

    // Immediately set the running state to give the user instant feedback
    setIsSimulationRunning(true);
    
    try {
      message.loading('Starting simulation...', 0);
      const result = await startSimulationMutation.mutateAsync({
        caseId: selectedCase.id,
        llmModel: llmModel,
        simulationConfig: {
          agents: 10,
          num_rounds: 1, // Only execute one round of simulation after adding a strategy
          interactionProbability: 0.7,
          positiveResponseProbability: 0.3,
          negativeResponseProbability: 0.2,
          neutralResponseProbability: 0.5,
          initialPositiveSentiment: 0.3,
          initialNegativeSentiment: 0.4,
          initialNeutralSentiment: 0.3
        }
      });
      
      message.destroy();
      
      if (result.success && result.data) {
        setSimulationId(result.data.simulationId);
        setCurrentRound(1);
        setHasCompletedSimulation(false);
        console.log('Scenario 2 simulation started:', result.data);
      } else {
        message.error(result.error?.message || 'Failed to start simulation');
        setIsSimulationRunning(false);
      }
    } catch (error) {
      message.destroy();
      console.error('Failed to start simulation:', error);
      message.error('Failed to start simulation');
      setIsSimulationRunning(false);
    }
  };

  const handleContinueNextRound = async () => {
    if (!simulationId) {
      message.error('No active simulation');
      return;
    }

    // Immediately set the running state to give user instant feedback
    console.log('handleContinueNextRound - Setting states:', {
      before: { isSimulationRunning, hasCompletedSimulation, isStartingNewRound }
    });
    
    // Reset the completion state first to ensure that the new component can correctly receive the state
    setHasCompletedSimulation(false);
    setIsSimulationRunning(true);
    setIsStartingNewRound(true); // Mark that a new round is starting, clear old data
    
    // Immediately update to the next round to let the user see the next round's strategy
    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);
    
    // Synchronously update animationKey and hasCompletedSimulation state
    setAnimationKey(prev => prev + 1); // Force reset animation
    // Ensure hasCompletedSimulation is reset
    setHasCompletedSimulation(false);
    
    // A new round starts, reset the report closed state
    setIsReportJustClosed(false);
    setShouldKeepFinalState(false);
    
    console.log('handleContinueNextRound - States set, should show running simulation');
    
    try {
      message.loading('Starting next round simulation...', 0);
      
      const result = await addScenario2StrategyMutation.mutateAsync(simulationId);

      message.destroy();
      
      if (result.success && result.data) {
        const roundNumber = result.data.currentRound;
        console.log('Next round simulation started, round:', roundNumber);
        console.log('Backend returned new data, clearing isStartingNewRound flag');
        
        // The backend has returned new data, clear the new round flag
        setIsStartingNewRound(false);
        
        // Ensure the round is consistent with the backend response
        if (roundNumber !== nextRound) {
          setCurrentRound(roundNumber);
        }
      } else {
        message.error(result.error?.message || 'Failed to start next round');
        setIsSimulationRunning(false);
        setIsStartingNewRound(false);
        // If it fails, roll back to the previous round
        setCurrentRound(currentRound);
      }
    } catch (error) {
      message.destroy();
      setIsSimulationRunning(false);
      setIsStartingNewRound(false);
      // If it fails, roll back to the previous round
      setCurrentRound(currentRound);
      console.error('Failed to start next round:', error);
      message.error('Failed to start next round');
    }
  };

  const handleViewResults = async () => {
    if (!simulationId) {
      message.warning('Please run a simulation first');
      return;
    }

    // Immediately set the report generation state
    setIsGeneratingReport(true);

    try {
      message.loading('Generating report...', 0);
      const result = await generateReportMutation.mutateAsync({
        simulationId,
        reportType: 'comprehensive',
        includeVisualizations: true,
      });

      message.destroy();
      
      if (result.success && result.data) {
        setReportData(result.data);
        setShowResults(true);
      } else {
        message.error(result.error?.message || 'Failed to generate report');
      }
    } catch (error) {
      message.destroy();
      console.error('Failed to generate report:', error);
      message.error('Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleReset = async () => {
    try {
      // If there is an active simulation, call the backend reset interface first
      if (simulationId) {
        const result = await resetSimulationMutation.mutateAsync(simulationId);
        if (!result.success) {
          message.error(result.error?.message || 'Failed to reset simulation on server');
          return;
        }
      }

      // Reset all frontend states
      setSimulationId(null);
      setCurrentRound(1);
      setIsSimulationRunning(false);
      setHasCompletedSimulation(false);
      setIsStartingNewRound(false);
      setAnimationKey(0); // Reset animation key
      setIsReportJustClosed(false);
      setShouldKeepFinalState(false);
      setReportData(null);
      
      // Clear cached network data to prevent old data from being displayed after reset
      previousNetworkDataRef.current = null;
    } catch (error) {
      console.error('Reset error:', error);
      message.error('Failed to reset simulation');
    }
  };

  const getCurrentRoundStrategy = (strategies: any[], round: number) => {
    // Get the strategy for the corresponding round from the strategies array
    const strategy = strategies.find(s => s.round === round);
    if (strategy) {
      return `
        <h4>${strategy.title}</h4>
        <p>${strategy.content}</p>
        <small><strong>Timeline:</strong> ${strategy.timeline}</small>
      `;
    }
    
    // If the corresponding round is not found, return the first or last round
    if (round > strategies.length) {
      const lastStrategy = strategies[strategies.length - 1];
      return `
        <h4>${lastStrategy.title}</h4>
        <p>${lastStrategy.content}</p>
        <small><strong>Timeline:</strong> ${lastStrategy.timeline}</small>
      `;
    }
    
    const firstStrategy = strategies[0];
    return `
      <h4>${firstStrategy.title}</h4>
      <p>${firstStrategy.content}</p>
      <small><strong>Timeline:</strong> ${firstStrategy.timeline}</small>
    `;
  };

  const renderMapVisualization = () => {
    return (
      <VisualizationArea
        key={`scenario2-${currentRound}-${simulationId}-${animationKey}`} // Add animationKey to force re-render
        isLoading={startSimulationMutation.isPending || addScenario2StrategyMutation.isPending || isSimulationRunning || isStartingNewRound}
        isSimulationRunning={isSimulationRunning || isStartingNewRound}
        hasCompletedSimulation={hasCompletedSimulation}
        onAnimationCompleted={() => setHasCompletedSimulation(true)}
        networkData={memoizedNetworkData}
        simulationResult={simulationResultData?.success ? simulationResultData.data : undefined}
        animationKey={animationKey} // Pass animationKey to NetworkVisualization
        isReportJustClosed={isReportJustClosed} // Pass the report closed state
        shouldKeepFinalState={shouldKeepFinalState} // Pass whether the final state should be kept
      />
    );
  };

  const renderEventDetails = () => {
    if (!selectedCase) return null;

    return (
      <div className="event-details">
        <div className="event-header">
          <Title level={4} className="event-title">{selectedCase.title}</Title>
          <Text className="event-description">{selectedCase.description}</Text>
        </div>

        <div className="current-round-section">
          <Title level={5} className="round-title">Current PR Strategy</Title>
          <div className="strategy-content">
            <Text className="round-indicator">Round {currentRound}</Text>
            <div 
              className="strategy-details"
              dangerouslySetInnerHTML={{ __html: getCurrentRoundStrategy(selectedCase.strategies, currentRound) }}
            />
          </div>
        </div>

        <div className="action-buttons">
          {!simulationId ? (
            <Button
              size="large"
              className="action-button primary-button"
              onClick={handleStartSimulation}
              loading={startSimulationMutation.isPending}
              icon={<PlayCircleOutlined />}
            >
              Start Simulation
            </Button>
          ) : (
            <>
              {/* Only show the Continue button if there is a next round strategy */}
              {selectedCase && currentRound < selectedCase.strategies.length && (
                <Button
                  size="large"
                  className="action-button primary-button"
                  onClick={handleContinueNextRound}
                  disabled={isStartingNewRound}
                  loading={addScenario2StrategyMutation.isPending}
                  icon={<ReloadOutlined />}
                >
                  Continue Next Round Simulation
                </Button>
              )}

              <Button
                size="large"
                className="action-button secondary-button"
                onClick={handleViewResults}
                disabled={!simulationId}
                loading={isGeneratingReport}
                icon={<BarChartOutlined />}
              >
                {isGeneratingReport ? 'Generating Report...' : 'Generate Report & View Results'}
              </Button>
            </>
          )}

          <Button
            size="large"
            className="action-button secondary-button"
            onClick={handleReset}
            icon={<ReloadOutlined />}
          >
            Reset
          </Button>

          <Button
            size="large"
            className="action-button secondary-button"
            onClick={async () => {
              // First reset the backend state, then reselect the case
              await handleReset();
              onReselectCase();
            }}
          >
            Reselect Case Study
          </Button>
        </div>
      </div>
    );
  };


  // Handle report switching
  const handleSwitchReport = (reportType: ReportType) => {
    setCurrentReportType(reportType);
  };

  // If the results page is displayed, render the appropriate report based on currentReportType
  if (showResults && reportData) {
    const commonProps = {
      onBack: () => {
        setShowResults(false);
        setIsReportJustClosed(true);
        setShouldKeepFinalState(true);
        // Do not reset the animation state, keep the current animation state
      },
      onClose: () => {
        setShowResults(false);
        setIsReportJustClosed(true);
        setShouldKeepFinalState(true);
        // Do not reset the animation state, keep the current animation state
      },
      onReset: handleReset,
      onSwitchReport: handleSwitchReport,
      currentReportType: currentReportType,
    };

    if (currentReportType === 'comparative') {
      return (
        <Scenario2ReportPage
          reportData={reportData}
          {...commonProps}
        />
      );
    } else {
      return (
        <EvaluationMetricsReportPage
          metricsData={reportData?.evaluationMetrics}  // Pass backend data
          {...commonProps}
        />
      );
    }
  }

  return (
    <div className="scenario2-simulation-page">
      <div className="page-header">
        <Title level={2} className="page-title">
          DualMind: Cognitive-Affective Simulation for PR Crisis Dynamics
        </Title>
      </div>

      <div className="page-content">
        <div className="content-grid">
          <div className="left-panel">
            <Card className="event-panel">
              {renderEventDetails()}
            </Card>
          </div>

          <div className="right-panel">
            <Card className="map-panel">
              {renderMapVisualization()}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scenario2SimulationPage;
