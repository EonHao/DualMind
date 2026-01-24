// API service base configuration
const API_BASE_URL = 'http://localhost:8000/api';

// API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
    timestamp: string;
  };
}

// Chat related types
export interface ChatSession {
  sessionId: string;
  content: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'llm';
  content: string;
  timestamp: string;
}

export interface ChatHistory {
  sessionId: string;
  messages: ChatMessage[];
}

// Simulation related types
export interface SimulationConfig {
  agents: number;
  num_rounds: number;
  interactionProbability: number;
  positiveResponseProbability: number;
  negativeResponseProbability: number;
  neutralResponseProbability: number;
  initialPositiveSentiment: number;
  initialNegativeSentiment: number;
  initialNeutralSentiment: number;
}

export interface StartSimulationRequest {
  initialTopic: string;
  llmModel: string;
  simulationConfig: SimulationConfig;
  prStrategy?: string;  // First round PR strategy (optional)
}

export interface SimulationStatus {
  simulationId: string;
  status: string;
  currentRound: number;
  activeAgents: number;
  totalPosts: number;
}

export interface SimulationResult {
  simulationId: string;
  status: string;
  round: number;
  summary: {
    totalAgents: number;
    activeAgents: number;
    totalPosts: number;
    positiveSentiment: number;
    negativeSentiment: number;
    neutralSentiment: number;
  };
  agents: Array<{
    agentId: string;
    username: string;
    description: string;
    influence_score: number;
    primaryPlatform: string;
    emotionalStyle: string;
    stanceScore: number;
    postsSent: number;
    latestPost?: string;
    isActive: boolean;
  }>;
  propagationPaths: Array<{
    from: string;
    content: string;
    round: number;
    stance: number;
  }>;
}

export interface NetworkData {
  nodes: Array<{
    id: string;
    username: string;
    platform: string;
    influence_score: number;
    sentiment: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    strength: number;
    type: string;
  }>;
}

export interface ReportRequest {
  simulationId: string;
  reportType: string;
  includeVisualizations: boolean;
}

// Evaluation metrics for trajectory fidelity assessment
export interface EvaluationMetric {
  group: number;              // Round number (1-based)
  pr_round: string;           // Round label (e.g., "Round 1")
  r_e: number;                // Pearson correlation coefficient
  JSD_e: number;              // Jensen-Shannon Divergence
  KL_p_e_m_e: number;         // KL divergence (real → simulation)
  KL_p_hat_e_m_e: number;     // KL divergence (simulation → real)
  statistics: {
    mean_y_e: number;         // Ground truth mean stance
    mean_y_hat_e: number;     // Simulation mean stance
    std_y_e: number;          // Ground truth standard deviation
    std_y_hat_e: number;      // Simulation standard deviation
    rmse: number;             // Root Mean Square Error
    mae: number;              // Mean Absolute Error
  };
}

export interface ReportResponse {
  reportId: string;
  reportType: string;
  content: string;
  evaluation: {
    evaluation_type: string;
    overall_ideal_achievement_percentage?: number; // Scenario1
    overall_similarity_percentage?: number; // Scenario2
    rating?: string; // Scenario1
    dimension_scores: {
      [dimensionName: string]: {
        weight: number;
        details: any;
      };
    };
    summary: string;
  };
  caseId?: string; // Scenario2
  caseTitle?: string; // Scenario2
  overallSimilarityPercentage?: number; // Scenario2
  evaluationMetrics?: EvaluationMetric[]; // Scenario2: Trajectory fidelity metrics
  generatedAt: string;
}

export interface SimulationResultData {
  overallSentiment: number;
  engagementRate: number;
  reach: number;
  sentimentTrend: string;
  prEffectiveness: number;
  keyInsights: string;
  recommendations: string[];
  influentialNodes: Array<{
    node: string;
    influence_score: number;
    sentiment: string;
    reach: number;
  }>;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trendData: {
    positive: string;
    engagement: string;
    reach: string;
  };
  effectivenessRating: {
    score: number;
    rating: string;
    thresholds: {
      excellent: number;
      good: number;
    };
  };
}

// API Client Class
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // LLM Chat related APIs
  async initChatSession(): Promise<ApiResponse<ChatSession>> {
    return this.request<ChatSession>('/scenario1/chat/init', {
      method: 'GET',
    });
  }

  async sendChatMessage(sessionId: string, message: string): Promise<ApiResponse<ChatMessage>> {
    return this.request<ChatMessage>('/scenario1/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        message,
      }),
    });
  }

  async getChatHistory(sessionId: string): Promise<ApiResponse<ChatHistory>> {
    return this.request<ChatHistory>(`/scenario1/chat/${sessionId}/history`, {
      method: 'GET',
    });
  }

  // Simulation related APIs
  async startSimulation(request: StartSimulationRequest): Promise<ApiResponse<{ simulationId: string; status: string }>> {
    return this.request('/scenario1/simulation/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async addPRStrategy(simulationId: string, prStrategy: string): Promise<ApiResponse<SimulationResult>> {
    return this.request<SimulationResult>(`/scenario1/simulation/${simulationId}/add-strategy`, {
      method: 'POST',
      body: JSON.stringify({
        prStrategy,
      }),
    });
  }

  async getSimulationStatus(simulationId: string): Promise<ApiResponse<SimulationStatus>> {
    return this.request<SimulationStatus>(`/scenario1/simulation/${simulationId}/status`, {
      method: 'GET',
    });
  }

  async getSimulationResult(simulationId: string): Promise<ApiResponse<SimulationResult>> {
    return this.request<SimulationResult>(`/scenario1/simulation/${simulationId}/result`, {
      method: 'GET',
    });
  }

  async stopSimulation(simulationId: string): Promise<ApiResponse<{ simulationId: string; status: string; message: string }>> {
    return this.request(`/scenario1/simulation/${simulationId}/stop`, {
      method: 'POST',
    });
  }

  async generateReport(request: ReportRequest): Promise<ApiResponse<ReportResponse>> {
    return this.request<ReportResponse>('/scenario1/reports/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async resetSimulation(simulationId: string): Promise<ApiResponse<{ simulationId: string; status: string; message: string }>> {
    return this.request(`/simulation/${simulationId}/reset`, {
      method: 'POST',
    });
  }

  // Simulation data related APIs
  async getSimulationData(simulationId: string): Promise<ApiResponse<any>> {
    return this.request(`/scenario1/simulation/${simulationId}/data`, {
      method: 'GET',
    });
  }

  async getNetworkVisualizationData(simulationId: string): Promise<ApiResponse<{
    users: any[];
    platforms: any[];
    crossPlatformPropagation: any[];
  }>> {
    return this.request(`/scenario1/simulation/${simulationId}/network-data`, {
      method: 'GET',
    });
  }

  // Scenario 2 related APIs
  async getHistoricalCases(): Promise<ApiResponse<any[]>> {
    return this.request('/scenario2/cases', {
      method: 'GET',
    });
  }

  async getHistoricalCaseDetail(caseId: string): Promise<ApiResponse<any>> {
    return this.request(`/scenario2/cases/${caseId}`, {
      method: 'GET',
    });
  }

  async startScenario2Simulation(request: {
    caseId: string;
    llmModel: string;
    simulationConfig: any;
  }): Promise<ApiResponse<{ simulationId: string; status: string }>> {
    return this.request('/scenario2/simulation/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async addScenario2Strategy(simulationId: string): Promise<ApiResponse<any>> {
    return this.request(`/scenario2/simulation/${simulationId}/add-strategy`, {
      method: 'POST',
    });
  }

  async getScenario2Status(simulationId: string): Promise<ApiResponse<SimulationStatus>> {
    return this.request<SimulationStatus>(`/scenario2/simulation/${simulationId}/status`, {
      method: 'GET',
    });
  }

  async getScenario2Result(simulationId: string): Promise<ApiResponse<any>> {
    return this.request(`/scenario2/simulation/${simulationId}/result`, {
      method: 'GET',
    });
  }

  async generateScenario2Report(request: ReportRequest): Promise<ApiResponse<ReportResponse>> {
    return this.request<ReportResponse>('/scenario2/reports/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

// Export API client instance
export const apiClient = new ApiClient();
export default apiClient;
