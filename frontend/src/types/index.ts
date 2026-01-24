// Project type definitions

export interface LLMOption {
  value: string;
  label: string;
}

export interface PRStrategy {
  content: string;
  isOptimized: boolean;
}

export interface SimulationConfig {
  llm: string;
  eventDescription?: string;
  strategy: PRStrategy;
  enableRefinement: boolean;
}

export interface SimulationState {
  isRunning: boolean;
  currentRound: number;
  lockedConfig: {
    llm: string;
    eventDescription: string;
  };
  strategyHistory: {
    round: number;
    strategy: string;
    timestamp: Date;
  }[];
  nextRoundStrategy?: string;
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
    nodeId: string;
    value: number;
    postSend: number;
    postReceived: number;
    round: number;
    stance: string;
  }>;
  propagationPaths: Array<{
    from: string;
    to: string;
    content: string;
  }>;
}

export interface HistoricalPRStrategy {
  round: number;
  title: string;
  content: string;
  timeline: string;
}

export interface RealWorldOutcome {
  success: boolean;
  metrics: {
    sentimentImprovement: number | string;
    mediaCoverage: string;
    stockPrice: string;
  };
  keyFactors: string[];
}

export interface HistoricalCase {
  id: string;
  title: string;
  description: string;
  background: string;
  industry: string;
  difficulty: string;
  totalRounds: number;
  strategies: HistoricalPRStrategy[];
  realWorldOutcome: RealWorldOutcome;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'llm';
  content: string;
  timestamp: Date;
}

export interface SimulationParameters {
  agents: number;
  interactionProbability: number;
  positiveResponseProbability: number;
  negativeResponseProbability: number;
  neutralResponseProbability: number;
  initialPositiveSentiment: number;
  initialNegativeSentiment: number;
  initialNeutralSentiment: number;
}

export interface Scenario2Config {
  llm: string;
  case: HistoricalCase;
  enableRefinement: boolean;
}

export interface Scenario2Result {
  success: boolean;
  score: number;
  accuracy: number;
  comparison: {
    predicted: {
      positive: number;
      negative: number;
      neutral: number;
    };
    actual: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  networkData: {
    nodes: number;
    connections: number;
  };
}
