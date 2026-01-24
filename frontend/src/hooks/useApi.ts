import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type StartSimulationRequest, type ReportRequest } from '../services/api';

// LLM Chat相关hooks
export const useInitChatSession = () => {
  return useMutation({
    mutationFn: () => apiClient.initChatSession(),
    onSuccess: (data) => {
      console.log('Chat session initialized:', data);
    },
    onError: (error) => {
      console.error('Failed to initialize chat session:', error);
    },
  });
};

export const useSendChatMessage = () => {
  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) => 
      apiClient.sendChatMessage(sessionId, message),
    onError: (error) => {
      console.error('Failed to send chat message:', error);
    },
  });
};

export const useChatHistory = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['chatHistory', sessionId],
    queryFn: () => apiClient.getChatHistory(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

// 模拟相关hooks
export const useStartSimulation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: StartSimulationRequest) => apiClient.startSimulation(request),
    onSuccess: (data) => {
      console.log('Simulation started:', data);
      // 清除相关的查询缓存
      queryClient.invalidateQueries({ queryKey: ['simulation'] });
    },
    onError: (error) => {
      console.error('Failed to start simulation:', error);
    },
  });
};

export const useAddPRStrategy = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ simulationId, prStrategy }: { simulationId: string; prStrategy: string }) => 
      apiClient.addPRStrategy(simulationId, prStrategy),
    onSuccess: (data, variables) => {
      console.log('PR strategy added:', data);
      // 清除相关的查询缓存，强制重新获取最新数据
      queryClient.invalidateQueries({ queryKey: ['simulationStatus', variables.simulationId] });
      queryClient.invalidateQueries({ queryKey: ['simulationResult', variables.simulationId] });
    },
    onError: (error) => {
      console.error('Failed to add PR strategy:', error);
    },
  });
};

export const useSimulationStatus = (simulationId: string | null, isRunning: boolean = true) => {
  return useQuery({
    queryKey: ['simulationStatus', simulationId],
    queryFn: () => apiClient.getSimulationStatus(simulationId!),
    enabled: !!simulationId && isRunning,
    refetchInterval: isRunning ? 2000 : false, // 只在运行时轮询
  });
};

export const useSimulationResult = (simulationId: string | null) => {
  return useQuery({
    queryKey: ['simulationResult', simulationId],
    queryFn: () => apiClient.getSimulationResult(simulationId!),
    enabled: !!simulationId,
    staleTime: 30 * 1000, // 30秒
    retry: 3, // 重试3次
    retryDelay: 1000, // 重试间隔1秒
  });
};


export const useStopSimulation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (simulationId: string) => apiClient.stopSimulation(simulationId),
    onSuccess: (data, simulationId) => {
      console.log('Simulation stopped:', data);
      // 清除模拟相关的查询缓存
      queryClient.removeQueries({ queryKey: ['simulation', simulationId] });
    },
    onError: (error) => {
      console.error('Failed to stop simulation:', error);
    },
  });
};

export const useGenerateReport = () => {
  return useMutation({
    mutationFn: (request: ReportRequest) => apiClient.generateReport(request),
    onSuccess: (data) => {
      console.log('Report generated:', data);
    },
    onError: (error) => {
      console.error('Failed to generate report:', error);
    },
  });
};

export const useResetSimulation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (simulationId: string) => apiClient.resetSimulation(simulationId),
    onSuccess: (data, simulationId) => {
      console.log('Simulation reset:', data);
      // 清除所有模拟相关的查询缓存
      queryClient.removeQueries({ queryKey: ['simulation', simulationId] });
      queryClient.removeQueries({ queryKey: ['simulationStatus', simulationId] });
      queryClient.removeQueries({ queryKey: ['simulationResult', simulationId] });
    },
    onError: (error) => {
      console.error('Failed to reset simulation:', error);
    },
  });
};

// Scenario 2 相关hooks
export const useStartScenario2Simulation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: { caseId: string; llmModel: string; simulationConfig: any }) => 
      apiClient.startScenario2Simulation(request),
    onSuccess: (data) => {
      console.log('Scenario 2 simulation started:', data);
      // 清除相关的查询缓存
      queryClient.invalidateQueries({ queryKey: ['scenario2Simulation'] });
    },
    onError: (error) => {
      console.error('Failed to start Scenario 2 simulation:', error);
    },
  });
};

export const useAddScenario2Strategy = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (simulationId: string) => apiClient.addScenario2Strategy(simulationId),
    onSuccess: (data, simulationId) => {
      console.log('Scenario 2 strategy added:', data);
      // 清除相关的查询缓存，强制重新获取最新数据
      queryClient.invalidateQueries({ queryKey: ['scenario2SimulationStatus', simulationId] });
      queryClient.invalidateQueries({ queryKey: ['scenario2SimulationResult', simulationId] });
      queryClient.invalidateQueries({ queryKey: ['scenario2NetworkData', simulationId] });
    },
    onError: (error) => {
      console.error('Failed to add Scenario 2 strategy:', error);
    },
  });
};

export const useScenario2SimulationStatus = (simulationId: string | null, isRunning: boolean = true) => {
  return useQuery({
    queryKey: ['scenario2SimulationStatus', simulationId],
    queryFn: () => apiClient.getScenario2Status(simulationId!),
    enabled: !!simulationId && isRunning,
    refetchInterval: isRunning ? 2000 : false, // 只在运行时轮询
  });
};

export const useScenario2SimulationResult = (simulationId: string | null) => {
  return useQuery({
    queryKey: ['scenario2SimulationResult', simulationId],
    queryFn: () => apiClient.getScenario2Result(simulationId!),
    enabled: !!simulationId,
    staleTime: 30 * 1000, // 30秒
    retry: 3, // 重试3次
    retryDelay: 1000, // 重试间隔1秒
  });
};

export const useGenerateScenario2Report = () => {
  return useMutation({
    mutationFn: (request: ReportRequest) => apiClient.generateScenario2Report(request),
    onSuccess: (data) => {
      console.log('Scenario 2 report generated:', data);
    },
    onError: (error) => {
      console.error('Failed to generate Scenario 2 report:', error);
    },
  });
};
