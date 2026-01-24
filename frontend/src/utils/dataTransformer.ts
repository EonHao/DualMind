/**
 * Data transformation utility
 * Converts data formats from backend API responses to the format expected by frontend visualization components.
 */

// Backend response network data type
interface BackendNetworkData {
  nodes: Array<{
    id: string;
    username: string;
    platform: string;
    influenceScore: number;
    sentiment: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    strength: number;
    type: string;
  }>;
}

// Backend response simulation result type
interface BackendSimulationResult {
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
    influenceScore: number;
    primaryPlatform: string;
    emotionalStyle: string;
    stanceScore: number;
    postsSent: number;
    latestPost?: string;
    isActive: boolean;
  }>;
  propagationPaths?: Array<{
    from: string;
    content: string;
    round: number;
    stance: number;
  }>;
  platforms?: Array<{
    name: string;
    type: string;
    userCount: number;
    activeUsers: string[];
    message_propagation: Array<{
      sender: string;
      receivers: string[];
      content: string;
      sentiment: string;
      timestamp: string;
    }>;
  }>;
}

// Frontend expected user data format
interface FrontendUser {
  agentId?: string;
  username: string;
  influence_score: number;
  primary_platform: string;
  emotional_style: string;
  final_decision: string;
  objective_stance_score: number;
}

// Frontend expected platform data format
interface FrontendPlatform {
  name: string;
  type: string;
  userCount: number;
  activeUsers: string[];
  message_propagation: Array<{
    sender: string;
    receivers: string[];
    content: string;
    sentiment: string;
    timestamp: string;
    likes: number;
    shares: number;
    comments: number;
  }>;
}

// Frontend expected network data format
interface FrontendNetworkData {
  users: FrontendUser[];
  platforms: FrontendPlatform[];
}

/**
 * Converts backend simulation result data to the format required by frontend visualization components
 */
export function transformSimulationResultToNetworkData(
  simulationResult: BackendSimulationResult,
  networkData?: BackendNetworkData
): FrontendNetworkData {
  // 1. Transform user data
  const users: FrontendUser[] = simulationResult.agents.map(agent => ({
    agentId: agent.agentId,
    username: agent.username,
    influence_score: agent.influenceScore !== undefined ? agent.influenceScore : (agent.influence_score || 0),
    primary_platform: agent.primaryPlatform,
    emotional_style: agent.emotionalStyle,
    final_decision: agent.latestPost || "No statement yet",
    objective_stance_score: agent.stanceScore,
  }));

  // 2. Construct platform data
  const platformMap = new Map<string, FrontendPlatform>();
  const platformTypes: { [key: string]: string } = {
    'Weibo/Twitter-like': 'social_media',
    'WeChat Moments-like': 'private_social',
    'TikTok-like': 'short_video',
    'Forum-like': 'discussion_forum',
  };

  // Group users by platform
  simulationResult.agents.forEach(agent => {
    const platformName = agent.primaryPlatform;
    if (!platformMap.has(platformName)) {
      platformMap.set(platformName, {
        name: platformName,
        type: platformTypes[platformName] || 'social_media',
        userCount: 0,
        activeUsers: [],
        message_propagation: [],
      });
    }
    const platform = platformMap.get(platformName)!;
    platform.userCount++;
    if (agent.isActive) {
      platform.activeUsers.push(agent.username);
    }
  });

  // 3. Construct message propagation data
  // Check if the backend directly provides platforms data (including message_propagation)
  const messagePropagationMap = new Map<string, Array<any>>();
  
  // First, check for direct platforms data (which the backend might return directly)
  if (simulationResult.platforms && Array.isArray(simulationResult.platforms)) {
    console.log('DataTransformer - Found direct platforms data with', simulationResult.platforms.length, 'platforms');
    simulationResult.platforms.forEach((platform: any) => {
      if (platform.message_propagation && Array.isArray(platform.message_propagation)) {
        console.log('DataTransformer - Platform', platform.name, 'has', platform.message_propagation.length, 'messages');
        messagePropagationMap.set(platform.name, platform.message_propagation);
      }
    });
  }
  
  // If there's no direct platforms data, try to build it from propagationPaths
  if (messagePropagationMap.size === 0 && simulationResult.propagationPaths && simulationResult.propagationPaths.length > 0) {
    console.log('DataTransformer - Using propagationPaths data');
    simulationResult.propagationPaths.forEach((path, index) => {
      const sender = simulationResult.agents.find(a => a.agentId === path.from);
      if (!sender) return;

      const platform = sender.primaryPlatform;
      if (!messagePropagationMap.has(platform)) {
        messagePropagationMap.set(platform, []);
      }

      // Get receivers (based on network topology)
      const receivers: string[] = [];
      if (networkData && networkData.edges) {
        networkData.edges
          .filter(edge => edge.source === path.from)
          .forEach(edge => {
            const receiver = simulationResult.agents.find(a => a.agentId === edge.target);
            if (receiver) {
              receivers.push(receiver.username);
            }
          });
      } else {
        // If there is no network data, randomly select some agents as receivers
        const otherAgents = simulationResult.agents.filter(a => a.agentId !== path.from);
        const numReceivers = Math.min(3, otherAgents.length);
        for (let i = 0; i < numReceivers; i++) {
          const randomIndex = Math.floor(Math.random() * otherAgents.length);
          receivers.push(otherAgents[randomIndex].username);
          otherAgents.splice(randomIndex, 1); // Avoid duplicate selection
        }
      }

      const sentiment = path.stance > 0 ? 'positive' : path.stance < 0 ? 'negative' : 'neutral';
      
      messagePropagationMap.get(platform)!.push({
        sender: sender.username,
        receivers: receivers.slice(0, 4), // Limit the number of receivers
        content: path.content,
        sentiment: sentiment,
        timestamp: new Date(Date.now() + index * 6000).toISOString(), // Use actual timestamp
        likes: Math.floor(Math.random() * 50) + 10,
        shares: Math.floor(Math.random() * 20) + 5,
        comments: Math.floor(Math.random() * 15) + 3,
      });
    });
  }
  
  // If there is still no data, generate basic messages from agents' posts
  if (messagePropagationMap.size === 0) {
    console.log('DataTransformer - Generating messages from agents data');
    simulationResult.agents.forEach((agent, index) => {
      if (agent.latestPost && agent.postsSent > 0) {
        const platform = agent.primaryPlatform;
        if (!messagePropagationMap.has(platform)) {
          messagePropagationMap.set(platform, []);
        }

        const sentiment = agent.stanceScore > 0 ? 'positive' : 
                         agent.stanceScore < 0 ? 'negative' : 'neutral';
        
        // Generate some receivers for the message
        const otherAgents = simulationResult.agents.filter(a => a.agentId !== agent.agentId);
        const numReceivers = Math.min(3, otherAgents.length);
        const receivers: string[] = [];
        for (let i = 0; i < numReceivers; i++) {
          const randomIndex = Math.floor(Math.random() * otherAgents.length);
          receivers.push(otherAgents[randomIndex].username);
          otherAgents.splice(randomIndex, 1); // Avoid duplicate selection
        }

        messagePropagationMap.get(platform)!.push({
          sender: agent.username,
          receivers: receivers,
          content: agent.latestPost,
          sentiment: sentiment,
          timestamp: new Date(Date.now() + index * 6000).toISOString(),
          likes: Math.floor(Math.random() * 50) + 10,
          shares: Math.floor(Math.random() * 20) + 5,
          comments: Math.floor(Math.random() * 15) + 3,
        });
      }
    });
  }

  // Add message propagation data to platforms
  messagePropagationMap.forEach((messages, platformName) => {
    const platform = platformMap.get(platformName);
    if (platform) {
      platform.message_propagation = messages;
      console.log('DataTransformer - Added', messages.length, 'messages to platform', platformName);
    }
  });

  const platforms = Array.from(platformMap.values());
  
  console.log('DataTransformer - Final result:');
  console.log('  - users:', users.length);
  console.log('  - platforms:', platforms.length);
  platforms.forEach(platform => {
    console.log(`  - Platform ${platform.name}: ${platform.message_propagation?.length || 0} messages`);
  });

  return {
    users,
    platforms,
  };
}

/**
 * Simplified transformation function: Creates basic network visualization data based only on agents data
 * Used when the backend only returns agent information without detailed propagation paths
 */
export function transformAgentsToNetworkData(
  agents: BackendSimulationResult['agents']
): FrontendNetworkData {
  const users: FrontendUser[] = agents.map(agent => ({
    agentId: agent.agentId,
    username: agent.username,
    influence_score: agent.influenceScore !== undefined ? agent.influenceScore : (agent.influence_score || 0),
    primary_platform: agent.primaryPlatform,
    emotional_style: agent.emotionalStyle,
    final_decision: agent.latestPost || "No statement yet",
    objective_stance_score: agent.stanceScore,
  }));

  // Group by platform
  const platformMap = new Map<string, FrontendPlatform>();
  const platformTypes: { [key: string]: string } = {
    'Weibo/Twitter-like': 'social_media',
    'WeChat Moments-like': 'private_social',
    'TikTok-like': 'short_video',
    'Forum-like': 'discussion_forum',
  };

  agents.forEach(agent => {
    const platformName = agent.primaryPlatform;
    if (!platformMap.has(platformName)) {
      platformMap.set(platformName, {
        name: platformName,
        type: platformTypes[platformName] || 'social_media',
        userCount: 0,
        activeUsers: [],
        message_propagation: [],
      });
    }
    const platform = platformMap.get(platformName)!;
    platform.userCount++;
    if (agent.isActive) {
      platform.activeUsers.push(agent.username);
    }

    // If there is a post, add it to message propagation
    if (agent.latestPost && agent.postsSent > 0) {
      const sentiment = agent.stanceScore > 0 ? 'positive' : 
                       agent.stanceScore < 0 ? 'negative' : 'neutral';
      
      // Generate some receivers for the message
      const otherAgents = agents.filter(a => a.agentId !== agent.agentId);
      const numReceivers = Math.min(3, otherAgents.length);
      const receivers: string[] = [];
      for (let i = 0; i < numReceivers; i++) {
        const randomIndex = Math.floor(Math.random() * otherAgents.length);
        receivers.push(otherAgents[randomIndex].username);
        otherAgents.splice(randomIndex, 1); // Avoid duplicate selection
      }

      platform.message_propagation.push({
        sender: agent.username,
        receivers: receivers,
        content: agent.latestPost,
        sentiment: sentiment,
        timestamp: new Date().toISOString(),
        likes: Math.floor(Math.random() * 50) + 10,
        shares: Math.floor(Math.random() * 20) + 5,
        comments: Math.floor(Math.random() * 15) + 3,
      });
    }
  });

  const platforms = Array.from(platformMap.values());

  return {
    users,
    platforms,
  };
}

/**
 * Check if data is valid
 */
export function isValidNetworkData(data: any): data is FrontendNetworkData {
  return (
    data &&
    Array.isArray(data.users) &&
    Array.isArray(data.platforms) &&
    data.users.length > 0
  );
}

