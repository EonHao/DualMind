# Scenario 1 API Documentation

## Common Response Format

All API endpoints follow a unified response format:

```json
{
  "success": boolean,
  "data": any | null,
  "error": {
    "code": string,
    "message": string,
    "details": string,
    "timestamp": string
  } | null
}
```

## 1. LLM Strategy Optimization Interface

### 1.1 Initialize Chat Session

**Endpoint**: `GET /api/scenario1/chat/init`

**Description**: Create a new LLM chat session for strategy optimization

**Request Parameters**: None

**Response Example**:
```json
{
  "success": true,
  "data": {
    "sessionId": "chat_session_712781f2-ad53-4b04-86ba-129baaffe5e7",
    "content": "Hello! I'm your PR strategy optimization assistant...",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to create chat session",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### 1.2 Send Chat Message

**Endpoint**: `POST /api/scenario1/chat/message`

**Description**: Send a message to the LLM and receive strategy optimization suggestions

**Request Body**:
```json
{
  "sessionId": "chat_session_712781f2-ad53-4b04-86ba-129baaffe5e7",
  "message": "Please help me optimize this PR strategy..."
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "msg_12345678-1234-1234-1234-123456789012",
    "type": "llm",
    "content": "Based on your PR strategy, I suggest...",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### 1.3 Get Chat History

**Endpoint**: `GET /api/scenario1/chat/{sessionId}/history`

**Description**: Retrieve the complete chat history for a specified session

**Path Parameters**:
- `sessionId`: Chat session ID

**Response Example**:
```json
{
  "success": true,
  "data": {
    "sessionId": "chat_session_712781f2-ad53-4b04-86ba-129baaffe5e7",
    "messages": [
      {
        "id": "msg_1",
        "type": "llm",
        "content": "Hello! I'm your PR strategy optimization assistant...",
        "timestamp": "2024-01-01T12:00:00.000Z"
      },
      {
        "id": "msg_2",
        "type": "user",
        "content": "Please help me optimize this PR strategy...",
        "timestamp": "2024-01-01T12:01:00.000Z"
      }
    ]
  }
}
```

## 2. Simulation Execution Interface

### 2.1 Start Simulation

**Endpoint**: `POST /api/scenario1/simulation/start`

**Description**: Start a Scenario 1 simulation with user-defined initial topic and strategy

**Request Body**:
```json
{
  "initialTopic": "A well-known tech company released a controversial AI product that is accused of privacy leakage risks, sparking widespread public discussion and media attention.",
  "llmModel": "gpt-4o-mini",
  "simulationConfig": {
    "agents": 20,
    "num_rounds": 3,
    "interactionProbability": 0.7,
    "positiveResponseProbability": 0.3,
    "negativeResponseProbability": 0.2,
    "neutralResponseProbability": 0.5,
    "initialPositiveSentiment": 0.3,
    "initialNegativeSentiment": 0.4,
    "initialNeutralSentiment": 0.3
  },
  "prStrategy": "We take user privacy protection very seriously. This AI product uses industry-leading privacy protection technology, and all data processing complies with relevant regulations. We will continue to cooperate with regulatory agencies to ensure product safety and reliability."
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "simulationId": "sim_1759732135883",
    "status": "running"
  }
}
```

### 2.2 Add PR Strategy

**Endpoint**: `POST /api/scenario1/simulation/{simulationId}/add-strategy`

**Description**: Add a PR strategy and execute the next round of simulation

**Path Parameters**:
- `simulationId`: Simulation ID

**Request Body**:
```json
{
  "prStrategy": "We have decided to suspend the commercialization of this AI product and invite third-party security agencies for a comprehensive audit. We will establish a user data protection committee and regularly publish transparency reports to ensure maximum user privacy protection."
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "simulationId": "sim_1759732135883",
    "status": "running"
  }
}
```

### 2.3 Get Simulation Status

**Endpoint**: `GET /api/scenario1/simulation/{simulationId}/status`

**Description**: Get the current status information of the simulation for polling

**Path Parameters**:
- `simulationId`: Simulation ID

**Response Example**:
```json
{
  "success": true,
  "data": {
    "simulationId": "sim_1759732135883",
    "status": "running",
    "progress": 45,
    "currentRound": 1,
    "message": "Simulation is running"
  }
}
```

**Status Descriptions**:
- `initial`: Initial state
- `running`: Running
- `completed`: Completed
- `consumed`: Consumed (data has been retrieved)
- `error`: Error state

### 2.4 Get Simulation Result

**Endpoint**: `GET /api/scenario1/simulation/{simulationId}/result`

**Description**: Get detailed simulation result data for network visualization

**Path Parameters**:
- `simulationId`: Simulation ID

**Response Example**:
```json
{
  "success": true,
  "data": {
    "simulationId": "sim_scenario1_demo_001",
    "status": "completed",
    "currentRound": 1,
    "eventDescription": "A well-known tech company released a controversial AI product that is accused of privacy leakage risks, sparking widespread public discussion and media attention.",
  "prStrategies": [
    {
      "round": 1,
      "strategy": "We take user privacy protection very seriously. This AI product uses industry-leading privacy protection technology, and all data processing complies with relevant regulations. We will continue to cooperate with regulatory agencies to ensure product safety and reliability.",
      "timestamp": "2024-10-03T10:00:00Z"
    }
  ],
  "users": [
    {
      "username": "MarketingPro_Serena",
      "description": "Marketing expert with keen instincts, skilled at igniting topics.",
      "emotional_style": "Passionate Supporter",
      "influence_score": 90,
      "primary_platform": "Weibo/Twitter-like",
      "objective_stance_score": 2,
      "final_decision": "This AI product represents the future direction of technological development. We should embrace change instead of fear it. Any new technology faces skepticism, which is normal.",
      "contextual_memories": [
        "As a marketing expert, I see the enormous commercial potential of this AI product. From a market perspective, controversial products are often easier to gain attention, which is what we need. I need to help the company shape a positive image and let the public see the value brought by technology."
      ],
      "short_term_memories": [
        "AI product controversy is normal; the key is to guide public opinion in a positive direction"
      ]
    }
  ],
  "platforms": [
    {
      "name": "Weibo/Twitter-like",
      "type": "social_media",
      "userCount": 4,
      "activeUsers": ["MarketingPro_Serena", "Skeptical_Journalist", "TechBro_Elon", "SocialMedia_Intern"],
      "message_propagation": [
        {
          "sender": "MarketingPro_Serena",
          "receivers": ["Skeptical_Journalist", "TechBro_Elon", "ValueInvestor_Graham", "ArtStudent_Vivian"],
          "content": "This AI product represents the future direction of technological development. We should embrace change instead of fear it. Any new technology faces skepticism, which is normal.",
          "sentiment": "positive",
          "timestamp": "2024-10-03T10:15:00Z"
        }
      ]
    }
  ]
  }
}
```

## 3. Report Generation Interface

### 3.1 Generate Analysis Report

**Endpoint**: `POST /api/scenario1/reports/generate`

**Description**: Generate a Scenario 1 public opinion analysis report using a 9-dimensional LLM-driven evaluation system

**Request Body**:
```json
{
  "simulationId": "sim_1759732135883",
  "reportType": "comprehensive",
  "includeVisualizations": true
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "reportId": "report_sim_1759732135883_1729987200",
    "reportType": "scenario1",
    "content": "# Public Opinion Analysis Report\n\n## 1. Public Opinion Evolution Analysis\n- Initial public opinion state: Negative sentiment dominates...\n\n## 2. PR Strategy Effectiveness Evaluation\n- First round strategy: Immediate apology and product suspension...\n\n## 3. Key Opinion Leader Analysis\n- MarketingPro_Serena: Influence score 90, significant attitude change...\n\n## 4. Public Opinion Differences Across Platforms\n- Weibo/Twitter: Active discussions with significant emotional fluctuations...\n\n## 5. Improvement Recommendations\n- Enhance analysis of brand PR strategies...\n- Strengthen simulation of diverse public reactions...",
    "evaluation": {
      "evaluation_type": "standalone",
      "overall_ideal_achievement_percentage": 78.5,
      "rating": "Good - Mostly achieving ideal effects",
      "dimension_scores": {
        "Overall Stance Tendency": {
          "weight": 0.12,
          "details": {
            "category": "simulation_only",
            "description": "The overall stance tendency in the simulation shows a clear opposition, with opponents outnumbering supporters and an average stance at a negative value, reflecting doubts about brand integrity and transparency. Although there are some supportive voices, the overall public is pessimistic about the prospects of restoring brand trust, emphasizing the importance of substantive reforms.",
            "key_features": [
              "Opposition attitude dominates",
              "Average stance is negative",
              "Emphasis on substantive reform needs"
            ],
            "ideal_achievement_percentage": 75.0,
            "reasoning": "The current simulation performs moderately in overall stance tendency. Although it successfully reflects public doubts about brand integrity, it fails to fully demonstrate the possibility of brand trust restoration. It is recommended to strengthen positive information dissemination in subsequent rounds to enhance public confidence in brand improvement."
          }
        },
        "Public Opinion Evolution Direction": {
          "weight": 0.12,
          "details": {
            "category": "simulation_only",
            "description": "The overall direction of public opinion evolution tends to deteriorate, with the average stance declining from 0.11 to -0.33, a change of 0.44, showing a dramatic reversal between support and opposition.",
            "key_features": [
              "Large magnitude of stance change",
              "Reversal of support and opposition",
              "Overall trend towards negativity"
            ],
            "ideal_achievement_percentage": 65.0,
            "reasoning": "The direction of public opinion evolution shows that PR strategies need adjustment. Current strategies have not effectively reversed the negative trend. It is recommended to adopt more proactive communication strategies in subsequent rounds to respond to public concerns in a timely manner."
          }
        },
        "Public Opinion Polarization Degree": {
          "weight": 0.08,
          "details": {
            "category": "simulation_only",
            "description": "Public opinion in this simulation shows significant polarization characteristics, with participants' views presenting an opposition between extreme support and extreme opposition, leading to overall extremism and a lack of neutral opinions.",
            "key_features": [
              "Clear extremism in views",
              "Lack of neutral opinions",
              "Opposition between support and opposition"
            ],
            "ideal_achievement_percentage": 70.0,
            "reasoning": "The degree of public opinion polarization is high, reflecting the characteristics of controversial topics. It is recommended to reduce extremism by providing more objective information and promoting rational discussion."
          }
        },
        "Critical Turning Point Timing": {
          "weight": 0.08,
          "details": {
            "category": "simulation_only",
            "description": "A significant turning point appeared in Round 3, with a deterioration in stance, and the average stance decline reached -0.56.",
            "key_features": [
              "Turning point in Round 3",
              "Clear deterioration in stance",
              "Large decline magnitude"
            ],
            "ideal_achievement_percentage": 60.0,
            "reasoning": "The timing of the turning point shows that PR strategies made errors in later stages. It is recommended to optimize strategy execution timing to avoid negative turns at critical moments."
          }
        },
        "Core Controversial Focus": {
          "weight": 0.15,
          "details": {
            "category": "simulation_only",
            "description": "The focus of public discussion is mainly on the brand's response to the AI product and transparency, centered around the brand's reputation and consumer concerns about product safety. It conveys expectations for brand responsibility.",
            "key_features": [
              "Focus on brand response transparency",
              "Consumer safety concerns",
              "Expectations for brand responsibility"
            ],
            "ideal_achievement_percentage": 80.0,
            "reasoning": "The core controversial focus is accurately grasped, successfully identifying the main public concerns. It is recommended to continue communicating around transparency and responsibility."
          }
        },
        "Mainstream Arguments": {
          "weight": 0.12,
          "details": {
            "category": "simulation_only",
            "description": "In the AI product controversy case, it emphasized that brand trust restoration requires transparency and honesty as the foundation, and consumers want to see actual actions rather than just verbal commitments. The fragility of brand image should be taken seriously, and when facing doubts, enterprises must demonstrate sincere improvement measures.",
            "key_features": [
              "Emphasis on transparency and honesty",
              "Expectations for actual actions",
              "Attention to brand image fragility"
            ],
            "ideal_achievement_percentage": 85.0,
            "reasoning": "The mainstream argument analysis is accurate, successfully capturing public expectations for brand improvement. It is recommended to demonstrate more concrete actions in subsequent strategies."
          }
        },
        "Emotional Tone": {
          "weight": 0.10,
          "details": {
            "category": "simulation_only",
            "description": "Most speakers support the brand in rebuilding trust through transparency and sincerity, but many also express doubts about its sincerity, believing that more substantive measures should be taken.",
            "key_features": [
              "Support for transparency and sincerity",
              "Doubts about sincerity",
              "Expectations for substantive measures"
            ],
            "ideal_achievement_percentage": 75.0,
            "reasoning": "The emotional tone analysis is reasonable, reflecting the public's complex psychology. It is recommended to enhance public confidence in brand sincerity through concrete actions."
          }
        },
        "PR Strategy Response Pattern": {
          "weight": 0.10,
          "details": {
            "category": "simulation_only",
            "description": "After multiple rounds of review, support votes and opposition votes are nearly balanced, showing controversy.",
            "key_features": [
              "Support and opposition nearly balanced",
              "Shows controversy",
              "Multiple rounds of review results"
            ],
            "ideal_achievement_percentage": 70.0,
            "reasoning": "The PR strategy response pattern shows limited strategy effectiveness. It is recommended to adjust strategy direction to enhance persuasiveness and influence."
          }
        },
        "Secondary Topic Diffusion Path": {
          "weight": 0.13,
          "details": {
            "category": "simulation_only",
            "description": "The brand's initial PR response was defensive and confrontational, failing to effectively address public concerns.",
            "key_features": [
              "Defensive and confrontational response",
              "Failed to address public concerns",
              "Initial strategy has problems"
            ],
            "ideal_achievement_percentage": 65.0,
            "reasoning": "The secondary topic diffusion path analysis is accurate, identifying initial strategy problems. It is recommended to adopt a more proactive communication approach."
          }
        }
      },
      "summary": "【Scenario 1: Standalone Evaluation】\n\nThis simulation performs moderately to above-average on 9 key dimensions, with an overall achievement rate of 78.5%, rated as \"Good\".\n\n**Strengths**:\n- Core controversial focus is accurately grasped, successfully identifying main public concerns\n- Mainstream argument analysis is in-depth, accurately capturing public expectations\n- Emotional tone analysis is reasonable, reflecting public complex psychology\n\n**Areas for Improvement**:\n- Public opinion evolution direction needs adjustment, current strategies have not reversed negative trends\n- Critical turning point timing is poorly grasped, with negative turns appearing in later stages\n- PR strategy response pattern has limited effectiveness, needs enhanced persuasiveness\n\n**Recommendations**:\n1. Optimize strategy execution timing to avoid negative turns at critical moments\n2. Adopt more proactive communication strategies to respond to public concerns in a timely manner\n3. Enhance public confidence in brand sincerity through concrete actions\n4. Adjust strategy direction to enhance persuasiveness and influence"
    },
    "generatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "SIMULATION_NOT_FOUND",
    "message": "Simulation ID 'xxx' does not exist.",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

## 4. Common Interface

### 4.1 Reset Simulation (Real API)

**Endpoint**: `POST /api/simulation/{simulationId}/reset`

**Description**: Reset simulation state

**Path Parameters**:
- `simulationId`: Simulation ID

### 4.2 Reset Simulation (Mock API - Temporary Static Data)

**Endpoint**: `POST /api/scenario1/simulation/{simulationId}/reset`

**Description**: Reset simulation state (temporary static data implementation)

**Path Parameters**:
- `simulationId`: Simulation ID

**Response Example**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Simulation reset successfully"
  }
}
```

## 5. Data Model Description

### 5.1 User Model

```typescript
interface User {
  username: string;                    // Username
  description: string;                 // User description
  emotional_style: string;            // Emotional style
  influence_score: number;            // Influence score (0-100)
  primary_platform: string;           // Primary platform
  objective_stance_score: number;     // Objective stance score (-3 to 3)
  final_decision: string;             // Final decision
  contextual_memories: string[];      // Contextual memories
  short_term_memories: string[];      // Short-term memories
}
```

### 5.2 Platform Model

```typescript
interface Platform {
  name: string;                       // Platform name
  type: string;                       // Platform type
  userCount: number;                  // User count
  activeUsers: string[];              // Active users list
  message_propagation: Message[];     // Message propagation data
}
```

### 5.3 Message Model

```typescript
interface Message {
  sender: string;                     // Sender
  receivers: string[];                // Receivers list
  content: string;                    // Message content
  sentiment: string;                  // Sentiment (positive/negative/neutral)
  timestamp: string;                  // Timestamp
}
```

### 5.4 Simulation Status Model

```typescript
interface SimulationStatus {
  simulationId: string;               // Simulation ID
  status: 'initial' | 'running' | 'completed' | 'consumed' | 'error';
  progress: number;                   // Progress percentage (0-100)
  currentRound: number;               // Current round
  message?: string;                   // Status message
}
```

### 5.5 Analysis Result Model

```typescript
interface ReportResponse {
  reportId: string;                   // Report ID
  reportType: string;                 // Report type ("scenario1")
  content: string;                    // Report content (Markdown format)
  evaluation: {                       // 9-dimensional evaluation results
    evaluation_type: string;          // Evaluation type ("standalone")
    overall_ideal_achievement_percentage: number; // Overall achievement rate 0-100
    rating: string;                   // Rating text
    dimension_scores: {               // Detailed scores for 9 dimensions
      [dimensionName: string]: {
        weight: number;               // Weight
        details: {
          category: string;            // Category ("simulation_only")
          description: string;        // 200-300 word detailed description
          key_features: string[];     // Core features list
          ideal_achievement_percentage: number; // Achievement score
          reasoning: string;          // Detailed reasoning
        };
      };
    };
    summary: string;                  // Evaluation summary
  };
  generatedAt: string;                // Generation time
}

interface InfluentialNode {
  node: string;                       // Influencer name
  influence_score: number;            // Influence score 0-100
  sentiment: string;                  // Sentiment
  reach: number;                      // Reach count
}
```

## 6. Error Code Description

| Error Code | Description | HTTP Status Code |
|--------|------|------------|
| `SESSION_NOT_FOUND` | Chat session does not exist | 404 |
| `SIMULATION_NOT_FOUND` | Simulation does not exist | 404 |
| `SIMULATION_ERROR` | Simulation execution error | 400 |
| `SIMULATION_RUNNING` | Simulation is still running | 400 |
| `SIMULATION_DATA_UNAVAILABLE` | Simulation data unavailable | 400 |
| `NETWORK_ERROR` | Network connection error | - |
| `INTERNAL_ERROR` | Internal server error | 500 |

## 7. Frontend Polling Mechanism

### 7.1 Polling Process

1. **Start Simulation**: Call `POST /api/scenario1/simulation/start`
2. **Start Polling**: Call `GET /api/scenario1/simulation/{simulationId}/status` every 1 second
3. **Check Status**: 
   - `running`: Continue polling
   - `completed`: Call `GET /api/scenario1/simulation/{simulationId}/result` to get data
   - `error`: Stop polling, display error message
4. **Retrieve Data**: After calling the `result` interface, status automatically changes to `consumed`

### 7.2 Polling Parameters

- **Polling Interval**: 1 second
- **Timeout**: 40 seconds
- **Maximum Retries**: 3 times

### 7.3 Status Transitions

```
initial → running → completed → consumed
   ↓         ↓         ↓
  error ← error ← error
```
