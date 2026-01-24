import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Typography, message } from 'antd';
import ConfigurationPanel from './ConfigurationPanel';
import VisualizationArea from './VisualizationArea';
import StrategyRefinementDrawer from '../../components/StrategyRefinementDrawer';
import Scenario1ReportPage from './Scenario1ReportPage';
import { SimulationConfig, SimulationParameters, SimulationState } from '../../types';
import { useStartSimulation, useAddPRStrategy, useSimulationStatus, useSimulationResult, useGenerateReport, useResetSimulation } from '../../hooks/useApi';
import { transformSimulationResultToNetworkData, transformAgentsToNetworkData } from '../../utils/dataTransformer';
import './Scenario1Page.css';

const { Title, Paragraph } = Typography;

const Scenario1Page: React.FC = () => {
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [simulationState, setSimulationState] = useState<SimulationState | undefined>(undefined);
  const [confirmedStrategy, setConfirmedStrategy] = useState<string>('');
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [hasCompletedSimulation, setHasCompletedSimulation] = useState<boolean>(false);
  const [isStartingNewRound, setIsStartingNewRound] = useState<boolean>(false);
  const [animationKey, setAnimationKey] = useState(0); // Used to force reset animation
  const [isReportJustClosed, setIsReportJustClosed] = useState(false); // Track if the report was just closed
  const [shouldKeepFinalState, setShouldKeepFinalState] = useState<boolean>(false); // Flag to determine if the final state should be kept
  const [preservedUserColorStates, setPreservedUserColorStates] = useState<{ [username: string]: { r: number; g: number; b: number } }>({}); // Save user color states

  // API hooks
  const startSimulationMutation = useStartSimulation();
  const addPRStrategyMutation = useAddPRStrategy();
  const generateReportMutation = useGenerateReport();
  const resetSimulationMutation = useResetSimulation();
  const { data: simulationStatusData } = useSimulationStatus(simulationId, isSimulationRunning);
  const { data: simulationResultData } = useSimulationResult(simulationId);


  // Listen for simulation state changes
  useEffect(() => {
    if (simulationStatusData?.success && simulationStatusData.data) {
      const status = simulationStatusData.data.status;
      console.log('Simulation status:', status);
      
      if (status === 'completed' && isSimulationRunning) {
        console.log('Simulation completed, stopping polling and fetching results');
        setIsSimulationRunning(false);
        // No need to manually fetch results here, useSimulationResult will fetch them automatically
      } else if (status === 'error') {
        console.log('Simulation failed');
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
      console.log('Simulation result data received, stopping loading state');
      setIsSimulationRunning(false);
    }
  }, [simulationResultData, isSimulationRunning, isStartingNewRound]);

  // Listen to all data states to determine if data is ready (but don't mark as complete immediately)
  useEffect(() => {
    const hasStatusData = !!simulationStatusData?.success;
    const hasResultData = !!simulationResultData?.success;
    
    if (hasStatusData && hasResultData) {
      console.log('All simulation data ready, data is available for animation');
      // Don't set hasCompletedSimulation here, let the animation start first
    }
  }, [simulationStatusData, simulationResultData]);

  // Use ref to save the previous network data
  const previousNetworkDataRef = useRef<any>(null);
  
  // Use useMemo to cache network data transformation results to avoid unnecessary recalculations
  const memoizedNetworkData = useMemo(() => {
    console.log('====== [DATA DEBUG] Scenario1 - memoizedNetworkData computing ======');
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
        
        console.log('[DATA DEBUG] Transformed network data users:', result?.users?.map(u => ({
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
          const transformedAgents = simulationResultData.data.agents.map(agent => ({
            ...agent,
            // The field name returned by the backend is influence_score, needs conversion
            influenceScore: agent.influence_score || 0
          }));
          const result = transformAgentsToNetworkData(transformedAgents);
          previousNetworkDataRef.current = result;
          return result;
        }
      }
    }
    console.log('[DATA DEBUG] Returning undefined because no valid data');
    return previousNetworkDataRef.current || undefined;
  }, [simulationResultData, isStartingNewRound]);

  // Debug log - moved after memoizedNetworkData definition
  console.log('Scenario1Page - Current state:', {
    simulationId,
    isSimulationRunning,
    isStartingNewRound,
    hasStatusData: !!simulationStatusData,
    hasResultData: !!simulationResultData,
    hasCompletedSimulation,
    hasMemoizedNetworkData: !!memoizedNetworkData,
    simulationState: simulationState
  });

  const handleStartSimulation = async (config: SimulationConfig) => {
    console.log('Scenario1Page - handleStartSimulation called with config:', config);
    
    if (!config.eventDescription?.trim()) {
      message.warning('Please enter event description first');
      return;
    }
    if (!config.strategy.content.trim()) {
      message.warning('Please enter your PR strategy first');
      return;
    }

    // Immediately set the running state to give the user instant feedback
    setIsSimulationRunning(true);
    
    try {
      message.loading('Starting simulation...', 0);
      const result = await startSimulationMutation.mutateAsync({
        initialTopic: config.eventDescription,
        llmModel: config.llm,
        simulationConfig: {
          agents: 10,
          num_rounds: 1,
          interactionProbability: 0.5,
          positiveResponseProbability: 0.3,
          negativeResponseProbability: 0.3,
          neutralResponseProbability: 0.4,
          initialPositiveSentiment: 0.2,
          initialNegativeSentiment: 0.6,
          initialNeutralSentiment: 0.2,
        },
        prStrategy: config.strategy.content,
      });

      message.destroy();
      
      if (result.success && result.data) {
        console.log('Scenario1Page - Start simulation result:', result);
        setSimulationId(result.data.simulationId);
        // isSimulationRunning = true has already been set at the beginning of the try block
        setSimulationState({
          isRunning: true,
          currentRound: 1,
          lockedConfig: {
            llm: config.llm,
            eventDescription: config.eventDescription || '',
          },
          strategyHistory: [{
            round: 1,
            strategy: config.strategy.content,
            timestamp: new Date(),
          }],
        });
        message.success('Simulation started successfully!');
      } else {
        console.log('Scenario1Page - Start simulation failed, result:', result);
        setIsSimulationRunning(false);
        message.error(result.error?.message || 'Failed to start simulation');
      }
    } catch (error) {
      message.destroy();
      setIsSimulationRunning(false);
      message.error('Failed to start simulation. Please try again.');
      console.error('Start simulation error:', error);
    }
  };


  const handleStartNextRound = async (strategy: string) => {
    if (!strategy.trim()) {
      message.warning('Please enter next round strategy first');
      return;
    }

    if (!simulationId) {
      message.error('No active simulation found');
      return;
    }

    // Immediately set the running state to give user instant feedback
    console.log('handleStartNextRound - Setting states:', {
      before: { isSimulationRunning, hasCompletedSimulation, isStartingNewRound }
    });
    
    // Reset the completion state first to ensure that the new component can correctly receive the state
    setHasCompletedSimulation(false);
    setIsSimulationRunning(true);
    setIsStartingNewRound(true); // Mark that a new round is starting, clear old data
    setIsReportJustClosed(false); // A new round starts, reset the report closed state
    setShouldKeepFinalState(false); // A new round starts, do not keep the final state
    
    // Use setTimeout to ensure the animationKey is updated after the state is updated
    setTimeout(() => {
      setAnimationKey(prev => prev + 1); // Force reset animation
      // Ensure again that hasCompletedSimulation is reset
      setHasCompletedSimulation(false);
    }, 0);
    console.log('handleStartNextRound - States set, should show running simulation');
    
    try {
      message.loading('Starting next round simulation...', 0);
      const result = await addPRStrategyMutation.mutateAsync({
        simulationId,
        prStrategy: strategy,
      });

      message.destroy();
      
      if (result.success && result.data) {
        const roundNumber = result.data.round;
        console.log('Next round simulation started, round:', roundNumber);
        console.log('Backend returned new data, clearing isStartingNewRound flag');
        
        // The backend has returned new data, clear the new round flag
        setIsStartingNewRound(false);
        
        // Update the simulation state, add the current strategy to the history
        setSimulationState(prev => prev ? {
          ...prev,
          currentRound: roundNumber || (prev.currentRound + 1),
          strategyHistory: [
            ...prev.strategyHistory,
            {
              round: roundNumber || (prev.currentRound + 1),
              strategy: strategy,
              timestamp: new Date(),
            }
          ],
          nextRoundStrategy: strategy,
        } : undefined);

        message.success(`Round ${roundNumber || 'next'} simulation started!`);
      } else {
        console.log('Next round simulation failed, result:', result);
        setIsSimulationRunning(false);
        setIsStartingNewRound(false);
        message.error(result.error?.message || 'Failed to start next round');
      }
    } catch (error) {
      message.destroy();
      setIsSimulationRunning(false);
      setIsStartingNewRound(false);
      message.error('Next round simulation failed. Please try again.');
      console.error('Next round error:', error);
    }
  };

  const handleGenerateReport = async () => {
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
        setIsGeneratingReport(false);
        message.success('Report generated successfully!');
        console.log('Generated report:', result.data);
      } else {
        setIsGeneratingReport(false);
        message.error(result.error?.message || 'Failed to generate report');
      }
    } catch (error) {
      message.destroy();
      setIsGeneratingReport(false);
      message.error('Failed to generate report');
      console.error('Generate report error:', error);
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
      setSimulationState(undefined);
      setSimulationId(null);
      setConfirmedStrategy('');
      setIsDrawerVisible(false);
      setShowResults(false);
      setReportData(null);
      setIsSimulationRunning(false);
      setIsGeneratingReport(false);
      setHasCompletedSimulation(false);
      setIsStartingNewRound(false);
      setAnimationKey(0); // Reset animation key
      setIsReportJustClosed(false);
      setShouldKeepFinalState(false);
      setPreservedUserColorStates({});
      
      // Clear cached network data to prevent old data from being displayed after reset
      previousNetworkDataRef.current = null;
      
      message.success('Simulation reset successfully');
    } catch (error) {
      message.error('Failed to reset simulation');
      console.error('Reset error:', error);
    }
  };

  const handleOpenDrawer = () => {
    setIsDrawerVisible(true);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setIsReportJustClosed(true);
    setShouldKeepFinalState(true);
    // Do not reset the animation state, keep the current animation state
  };

  const handleBackToSimulation = () => {
    setShowResults(false);
    setIsReportJustClosed(true);
    setShouldKeepFinalState(true);
    // Do not reset the animation state, keep the current animation state
  };

  const handleCloseDrawer = () => {
    setIsDrawerVisible(false);
  };

  const handleStrategyConfirm = (strategy: string, parameters: SimulationParameters) => {
    // Save the confirmed strategy
    setConfirmedStrategy(strategy);
    console.log('Confirmed strategy:', strategy);
    console.log('Parameters:', parameters);
    message.success('Strategy confirmed and parameters updated!');
  };

  // If the results page is displayed, render the results component
  if (showResults && reportData) {
    return (
      <Scenario1ReportPage
        reportData={reportData}
        onBack={handleBackToSimulation}
        onClose={handleCloseResults}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="scenario1-page">
      <div className="page-header">
        <Title level={2} className="page-title">
          DualMind: Cognitive-Affective Simulation for PR Crisis Dynamics
        </Title>
        <Paragraph className="page-description">
          Simulate public opinion evolution through dual-component agent architecture modeling cognitive beliefs and affective responses.
        </Paragraph>
      </div>

      <div className="page-content">
        <div className="content-grid">
          <div className="config-column">
            <ConfigurationPanel
              onStartSimulation={handleStartSimulation}
              onStartNextRound={handleStartNextRound}
              onGenerateReport={handleGenerateReport}
              onReset={handleReset}
              onOpenDrawer={handleOpenDrawer}
              simulationState={simulationState}
              confirmedStrategy={confirmedStrategy}
              isGeneratingReport={isGeneratingReport}
            />
          </div>
          <div className="visualization-column">
            <VisualizationArea
              key={`scenario1-${simulationState?.currentRound || 1}-${simulationId}-${animationKey}`} // Add key to force re-render
              isLoading={startSimulationMutation.isPending || addPRStrategyMutation.isPending}
              isSimulationRunning={isSimulationRunning}
              hasCompletedSimulation={hasCompletedSimulation}
              onAnimationCompleted={() => setHasCompletedSimulation(true)}
              networkData={memoizedNetworkData}
              simulationResult={simulationResultData?.success ? simulationResultData.data : undefined}
              animationKey={animationKey} // Pass animationKey to NetworkVisualization
              isReportJustClosed={isReportJustClosed} // Pass the report closed state
              shouldKeepFinalState={shouldKeepFinalState} // Pass whether the final state should be kept
              preservedUserColorStates={preservedUserColorStates} // Pass the saved color states
              onColorStatesChange={setPreservedUserColorStates} // Callback for color state changes
            />
          </div>
        </div>
      </div>

      <StrategyRefinementDrawer
        visible={isDrawerVisible}
        onClose={handleCloseDrawer}
        onStrategyConfirm={handleStrategyConfirm}
      />
    </div>
  );
};

export default Scenario1Page;
