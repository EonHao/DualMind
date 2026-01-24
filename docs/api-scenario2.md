# Scenario 2 API Documentation

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

---

## 1. Case Selection Interface

### 1.1 Get Historical Cases List

**Endpoint**: `GET /api/scenario2/cases`

**Description**: Get a list of all available historical PR cases (summary information)

**Request Parameters**: None

**Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "case_001",
      "title": "Tech Product Controversy",
      "description": "A tech company faces backlash over a controversial product feature. The PR team must address user concerns and restore trust.",
      "industry": "technology",
      "difficulty": "medium",
      "totalRounds": 3
    },
    {
      "id": "case_002",
      "title": "Food Safety Crisis",
      "description": "A food brand encounters a health scare related to one of its products. The PR response focuses on transparency and consumer safety.",
      "industry": "food",
      "difficulty": "high",
      "totalRounds": 2
    }
  ]
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to load historical cases",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 1.2 Get Case Details

**Endpoint**: `GET /api/scenario2/cases/{caseId}`

**Description**: Get complete detailed information for a specified historical case, including background, strategies, and real-world outcomes

**Path Parameters**:
- `caseId`: Case ID (e.g., `case_001`)

**Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "case_001",
    "title": "Tech Product Controversy",
    "description": "A tech company faces backlash over a controversial product feature...",
    "background": "A major tech firm launched a new social media app with a feature that automatically shared users' locations with friends by default. This led to a massive public outcry over privacy concerns, with #TechGiantIsWatching trending globally. The company's stock dropped 15% within 48 hours.",
    "industry": "technology",
    "difficulty": "medium",
    "totalRounds": 3,
    "strategies": [
      {
        "round": 1,
        "title": "Initial Response",
        "content": "Immediately issue a public apology acknowledging the mistake. Temporarily disable the feature for all users. Promise a full review and a more transparent redesign.",
        "timeline": "Within 12 hours"
      },
      {
        "round": 2,
        "title": "Follow-up Actions",
        "content": "Publish a detailed blog post explaining what went wrong and the steps being taken. Announce the feature will be opt-in only in the future. Engage with privacy advocates and key tech journalists.",
        "timeline": "48-72 hours"
      },
      {
        "round": 3,
        "title": "Long-term Recovery",
        "content": "Launch a 'Privacy First' marketing campaign. Roll out the redesigned feature with clear, user-friendly privacy controls. Partner with a respected third-party for a security audit.",
        "timeline": "1-2 weeks"
      }
    ],
    "realWorldOutcome": {
      "success": true,
      "metrics": {
        "sentimentImprovement": 35,
        "mediaCoverage": "positive",
        "stockPrice": "+8% over 3 months"
      },
      "keyFactors": ["Quick apology", "Decisive action (disabling feature)", "Transparency"]
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "CASE_NOT_FOUND",
    "message": "Case with ID 'case_xxx' not found",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## 2. Simulation Execution Interface

### 2.1 Start Simulation

**Endpoint**: `POST /api/scenario2/simulation/start`

**Description**: Start a Scenario 2 simulation. Unlike Scenario 1, only `caseId` needs to be passed, and the backend will automatically read the case's event description and first-round strategy

**Request Body**:
```json
{
  "caseId": "case_001",
  "llmModel": "gpt-4o-mini",
  "simulationConfig": {
    "agents": 20,
    "num_rounds": 1,
    "interactionProbability": 0.7,
    "positiveResponseProbability": 0.3,
    "negativeResponseProbability": 0.2,
    "neutralResponseProbability": 0.5,
    "initialPositiveSentiment": 0.3,
    "initialNegativeSentiment": 0.4,
    "initialNeutralSentiment": 0.3
  }
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "simulationId": "sim_scenario2_1759732135883",
    "status": "running",
    "caseId": "case_001",
    "currentRound": 1,
    "totalRounds": 3
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "CASE_NOT_FOUND",
    "message": "Case with ID 'case_xxx' not found",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 2.2 Continue to Next Round

**Endpoint**: `POST /api/scenario2/simulation/{simulationId}/next-round`

**Description**: Continue the simulation based on the next round strategy from the historical case. The backend will automatically read the strategy for the corresponding round from the case data

**Path Parameters**:
- `simulationId`: Simulation ID

**Request Body**: None (strategy is automatically read from case data)

**Response Example**:
```json
{
  "success": true,
  "data": {
    "simulationId": "sim_scenario2_1759732135883",
    "status": "running",
    "currentRound": 2,
    "totalRounds": 3,
    "roundStrategy": {
      "round": 2,
      "title": "Follow-up Actions",
      "content": "Publish a detailed blog post explaining what went wrong..."
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "SIMULATION_ERROR",
    "message": "Simulation has already completed all rounds",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 2.3 Get Simulation Status

**Endpoint**: `GET /api/scenario2/simulation/{simulationId}/status`

**Description**: Get the current status information of the simulation for polling

**Path Parameters**:
- `simulationId`: Simulation ID

**Response Example**:
```json
{
  "success": true,
  "data": {
    "simulationId": "sim_scenario2_1759732135883",
    "status": "running",
    "currentRound": 2,
    "totalRounds": 3,
    "progress": 66,
    "message": "Simulation is running"
  }
}
```

**Status Descriptions**:
- `initial`: Initial state
- `running`: Running
- `completed`: Completed (all rounds finished)
- `error`: Error state

---

### 2.4 Get Simulation Result

**Endpoint**: `GET /api/scenario2/simulation/{simulationId}/result`

**Description**: Get detailed simulation result data, including network visualization data and agent decision information

**Path Parameters**:
- `simulationId`: Simulation ID

**Response Example**:
```json
{
  "success": true,
  "data": {
    "simulationId": "sim_scenario2_1759732135883",
    "caseId": "case_001",
    "status": "completed",
    "currentRound": 3,
    "eventDescription": "A well-known tech company released a controversial AI product...",
    "executedStrategies": [
      {
        "round": 1,
        "title": "Initial Response",
        "content": "Immediately issue a public apology...",
        "timestamp": "2024-10-03T10:00:00Z"
      },
      {
        "round": 2,
        "title": "Follow-up Actions",
        "content": "Publish a detailed blog post...",
        "timestamp": "2024-10-03T10:30:00Z"
      },
      {
        "round": 3,
        "title": "Long-term Recovery",
        "content": "Launch a 'Privacy First' marketing campaign...",
        "timestamp": "2024-10-03T11:00:00Z"
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
        "final_decision": "This AI product represents the future direction of technological development...",
        "contextual_memories": ["As a marketing expert, I see the enormous commercial potential of this AI product..."],
        "short_term_memories": ["AI product controversy is normal; the key is to guide public opinion in a positive direction"]
      }
    ],
    "platforms": [
      {
        "name": "Weibo/Twitter-like",
        "type": "social_media",
        "userCount": 4,
        "activeUsers": ["MarketingPro_Serena", "Skeptical_Journalist"],
        "message_propagation": [
          {
            "sender": "MarketingPro_Serena",
            "receivers": ["Skeptical_Journalist", "TechBro_Elon"],
            "content": "This AI product represents the future direction of technological development...",
            "sentiment": "positive",
            "timestamp": "2024-10-03T10:15:00Z"
          }
        ]
      }
    ],
    "sentimentSummary": {
      "positive": 45,
      "negative": 20,
      "neutral": 35
    }
  }
}
```

---

## 3. Report Generation Interface

### 3.1 Generate Comparative Analysis Report

**Endpoint**: `POST /api/scenario2/reports/generate`

**Description**: Generate a Scenario 2 comparative analysis report using a 9-dimensional LLM-driven evaluation system to compare simulation results with real-world historical outcomes

**Request Body**: 
```json
{
  "simulationId": "sim_scenario2_1759732135883",
  "reportType": "comprehensive",
  "includeVisualizations": true
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "reportId": "report_sim_scenario2_1759732135883_1729987200",
    "reportType": "scenario2_comparative",
    "caseId": "CASE-01",
    "caseTitle": "'Ascending Dragon' Fireworks Incident",
    "content": "# Comparative Analysis Report\n\n## 1. Simulation vs Real Case Comparison\n- Simulated case: Arc'teryx fireworks incident...\n- Real case: Arc'teryx fireworks incident...\n\n## 2. 9-Dimensional Similarity Analysis\n- Overall Stance Tendency: 85.5% similarity...\n- Public Opinion Evolution Direction: 82.3% similarity...\n\n## 3. Key Differences Analysis\n- Emotional fluctuations in the simulation are more dramatic than in the real case...\n\n## 4. Model Validation Results\n- Overall similarity: 84.2%, rated as 'High Similarity'...",
    "evaluationMetrics": [
      {
        "group": 1,
        "pr_round": "Round 1",
        "r_e": 0.62,
        "JSD_e": 0.39,
        "KL_p_e_m_e": 0.41,
        "KL_p_hat_e_m_e": 0.37,
        "statistics": {
          "mean_y_e": 45.2,
          "mean_y_hat_e": 44.8,
          "std_y_e": 12.5,
          "std_y_hat_e": 12.1,
          "rmse": 3.2,
          "mae": 2.5
        }
      },
      {
        "group": 2,
        "pr_round": "Round 2",
        "r_e": 0.66,
        "JSD_e": 0.34,
        "KL_p_e_m_e": 0.36,
        "KL_p_hat_e_m_e": 0.32,
        "statistics": {
          "mean_y_e": 48.5,
          "mean_y_hat_e": 48.1,
          "std_y_e": 11.8,
          "std_y_hat_e": 11.5,
          "rmse": 2.9,
          "mae": 2.2
        }
      }
    ],
    "evaluation": {
      "evaluation_type": "comparative",
      "overall_similarity_percentage": 84.2,
      "dimension_scores": {
        "Overall Stance Tendency": {
          "weight": 0.12,
          "details": {
            "category": "comparative",
            "simulation": {
              "summary": "The overall stance tendency in the simulation shows a clear opposition, with opponents outnumbering supporters and an average stance at a negative value, reflecting doubts about brand integrity and transparency. Although there are some supportive voices, the overall public is pessimistic about the prospects of restoring brand trust, emphasizing the importance of substantive reforms."
            },
            "real_case": {
              "summary": "In the real case, public stance towards Arc'teryx shows clear opposition, mainly centered around the inconsistency between brand values and actual actions. Consumers question the brand's environmental commitments, believing the fireworks event conflicts with eco-friendly principles, leading to decreased brand trust."
            },
            "similarity": {
              "similarity_score": 85.5,
              "reasoning": "The simulation results are highly consistent with the real case in terms of overall stance tendency, both reflecting public doubts about brand integrity. The simulation successfully captures the real case's concern about the inconsistency between brand values and actual actions, with a similarity of 85.5%."
            }
          }
        },
        "Public Opinion Evolution Direction": {
          "weight": 0.12,
          "details": {
            "category": "comparative",
            "simulation": {
              "percentage": 65,
              "summary": "The overall direction of public opinion evolution tends to deteriorate, with the average stance declining from 0.11 to -0.33, a change of 0.44, showing a dramatic reversal between support and opposition.",
              "reasoning": "The simulation shows that the direction of public opinion evolution needs adjustment, as current strategies have not effectively reversed the negative trend."
            },
            "real_case": {
              "percentage": 68,
              "summary": "In the real case, the direction of public opinion evolution also shows a deteriorating trend, with public doubts about the brand gradually deepening, evolving from initial environmental controversy to questioning the brand's overall values.",
              "reasoning": "In the real case, the direction of public opinion evolution indeed tends towards deterioration, basically consistent with the simulation results."
            },
            "similarity": {
              "similarity_percentage": 82.3,
              "summary": "High similarity",
              "reasoning": "The simulation results are highly consistent with the real case in terms of public opinion evolution direction, both reflecting the trend of deterioration, with a similarity of 82.3%."
            }
          }
        },
        "Public Opinion Polarization Degree": {
          "weight": 0.08,
          "details": {
            "category": "comparative",
            "simulation": {
              "percentage": 70,
              "summary": "Public opinion in this simulation shows significant polarization characteristics, with participants' views presenting an opposition between extreme support and extreme opposition, leading to overall extremism and a lack of neutral opinions.",
              "reasoning": "The degree of public opinion polarization is high, reflecting the characteristics of controversial topics."
            },
            "real_case": {
              "percentage": 72,
              "summary": "In the real case, the degree of public opinion polarization is also high, with consumers supporting environmental protection forming an opposition to those supporting brand activities, lacking middle ground.",
              "reasoning": "In the real case, the degree of public opinion polarization is indeed high, basically consistent with the simulation results."
            },
            "similarity": {
              "similarity_percentage": 78.9,
              "summary": "High similarity",
              "reasoning": "The simulation results are highly consistent with the real case in terms of public opinion polarization degree, both reflecting the characteristics of extremism, with a similarity of 78.9%."
            }
          }
        },
        "Critical Turning Point Timing": {
          "weight": 0.08,
          "details": {
            "category": "comparative",
            "simulation": {
              "percentage": 60,
              "summary": "A significant turning point appeared in Round 3, with a deterioration in stance, and the average stance decline reached -0.56.",
              "reasoning": "The timing of the turning point shows that PR strategies made errors in later stages."
            },
            "real_case": {
              "percentage": 62,
              "summary": "In the real case, the critical turning point appeared after the brand's response, when public doubts about the brand's sincerity reached a peak.",
              "reasoning": "In the real case, the timing of the turning point is basically consistent with the simulation results."
            },
            "similarity": {
              "similarity_percentage": 75.2,
              "summary": "Medium similarity",
              "reasoning": "The simulation results are basically consistent with the real case in terms of critical turning point timing, both reflecting the characteristic of negative turns appearing in later stages, with a similarity of 75.2%."
            }
          }
        },
        "Core Controversial Focus": {
          "weight": 0.15,
          "details": {
            "category": "comparative",
            "simulation": {
              "percentage": 80,
              "summary": "The focus of public discussion is mainly on the brand's response to the AI product and transparency, centered around the brand's reputation and consumer concerns about product safety. It conveys expectations for brand responsibility.",
              "reasoning": "The core controversial focus is accurately grasped, successfully identifying the main public concerns."
            },
            "real_case": {
              "percentage": 82,
              "summary": "In the real case, the core controversial focus is on the inconsistency between brand values and actual actions, particularly the conflict between environmental commitments and the fireworks event.",
              "reasoning": "In the real case, the core controversial focus indeed revolves around value consistency, basically consistent with the simulation results."
            },
            "similarity": {
              "similarity_percentage": 88.7,
              "summary": "Very high similarity",
              "reasoning": "The simulation results are highly consistent with the real case in terms of core controversial focus, both reflecting public attention to brand value consistency, with a similarity of 88.7%."
            }
          }
        },
        "Mainstream Arguments": {
          "weight": 0.12,
          "details": {
            "category": "comparative",
            "simulation": {
              "percentage": 85,
              "summary": "In the AI product controversy case, it emphasized that brand trust restoration requires transparency and honesty as the foundation, and consumers want to see actual actions rather than just verbal commitments. The fragility of brand image should be taken seriously, and when facing doubts, enterprises must demonstrate sincere improvement measures.",
              "reasoning": "The mainstream argument analysis is accurate, successfully capturing public expectations for brand improvement."
            },
            "real_case": {
              "percentage": 83,
              "summary": "In the real case, mainstream arguments also emphasize the need for brands to demonstrate sincere improvement measures, particularly requiring actual actions to prove environmental commitments.",
              "reasoning": "In the real case, mainstream arguments indeed emphasize the importance of actual actions, basically consistent with the simulation results."
            },
            "similarity": {
              "similarity_percentage": 91.4,
              "summary": "Very high similarity",
              "reasoning": "The simulation results are highly consistent with the real case in terms of mainstream arguments, both emphasizing the importance of actual actions, with a similarity of 91.4%."
            }
          }
        },
        "Emotional Tone": {
          "weight": 0.10,
          "details": {
            "category": "comparative",
            "simulation": {
              "percentage": 75,
              "summary": "Most speakers support the brand in rebuilding trust through transparency and sincerity, but many also express doubts about its sincerity, believing that more substantive measures should be taken.",
              "reasoning": "The emotional tone analysis is reasonable, reflecting the public's complex psychology."
            },
            "real_case": {
              "percentage": 77,
              "summary": "In the real case, the emotional tone also shows doubts about brand sincerity, expecting more substantive measures to prove environmental commitments.",
              "reasoning": "In the real case, the emotional tone indeed shows doubts about sincerity, basically consistent with the simulation results."
            },
            "similarity": {
              "similarity_percentage": 86.8,
              "summary": "Very high similarity",
              "reasoning": "The simulation results are highly consistent with the real case in terms of emotional tone, both reflecting doubts about brand sincerity, with a similarity of 86.8%."
            }
          }
        },
        "PR Strategy Response Pattern": {
          "weight": 0.10,
          "details": {
            "category": "comparative",
            "simulation": {
              "percentage": 70,
              "summary": "After multiple rounds of review, support votes and opposition votes are nearly balanced, showing controversy.",
              "reasoning": "The PR strategy response pattern shows limited strategy effectiveness."
            },
            "real_case": {
              "percentage": 72,
              "summary": "In the real case, the PR strategy response pattern also shows controversy, with the public divided on the brand's response.",
              "reasoning": "In the real case, the PR strategy response pattern indeed shows controversy, basically consistent with the simulation results."
            },
            "similarity": {
              "similarity_percentage": 79.3,
              "summary": "High similarity",
              "reasoning": "The simulation results are basically consistent with the real case in terms of PR strategy response pattern, both reflecting the controversial nature of strategy effectiveness, with a similarity of 79.3%."
            }
          }
        },
        "Secondary Topic Diffusion Path": {
          "weight": 0.13,
          "details": {
            "category": "comparative",
            "simulation": {
              "percentage": 65,
              "summary": "The brand's initial PR response was defensive and confrontational, failing to effectively address public concerns.",
              "reasoning": "The secondary topic diffusion path analysis is accurate, identifying initial strategy problems."
            },
            "real_case": {
              "percentage": 67,
              "summary": "In the real case, the brand's initial response was also defensive, failing to effectively address public concerns about value consistency.",
              "reasoning": "In the real case, the initial response was indeed defensive, basically consistent with the simulation results."
            },
            "similarity": {
              "similarity_percentage": 81.6,
              "summary": "High similarity",
              "reasoning": "The simulation results are basically consistent with the real case in terms of secondary topic diffusion path, both reflecting the defensive nature of the initial strategy, with a similarity of 81.6%."
            }
          }
        }
      },
      "summary": "【Scenario 2: Comparative Evaluation】\n\nThis simulation shows high consistency with the real case across 9 key dimensions, with an overall similarity of 84.2%, rated as 'High Similarity'.\n\n**Highly Consistent Dimensions**:\n- Mainstream Arguments: 91.4% similarity, both emphasizing the importance of actual actions\n- Core Controversial Focus: 88.7% similarity, both centered on value consistency\n- Emotional Tone: 86.8% similarity, both reflecting doubts about brand sincerity\n- Overall Stance Tendency: 85.5% similarity, both reflecting doubts about brand integrity\n\n**Basically Consistent Dimensions**:\n- Public Opinion Evolution Direction: 82.3% similarity, both reflecting deteriorating trends\n- Secondary Topic Diffusion Path: 81.6% similarity, both reflecting initial strategy problems\n- PR Strategy Response Pattern: 79.3% similarity, both reflecting strategy controversy\n- Public Opinion Polarization Degree: 78.9% similarity, both reflecting extremism characteristics\n\n**Dimensions Needing Improvement**:\n- Critical Turning Point Timing: 75.2% similarity, timing of turning points needs optimization\n\n**Model Validation Conclusion**:\n1. The simulation successfully captures core characteristics and evolution trends of the real case\n2. Performance is particularly outstanding in mainstream arguments and controversial focus\n3. It is recommended to optimize turning point timing prediction to improve overall similarity"
    },
    "overallSimilarityPercentage": 84.2,
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

---

## 4. Data Model Description

### 4.1 Historical Case Model

```typescript
interface HistoricalCase {
  id: string;                           // Case ID
  title: string;                        // Case title
  description: string;                  // Brief description
  background: string;                   // Detailed background
  industry: string;                     // Industry classification
  difficulty: string;                   // Difficulty level (low/medium/high)
  totalRounds: number;                  // Total number of rounds
  strategies: HistoricalPRStrategy[];   // Strategies for each round
  realWorldOutcome: RealWorldOutcome;   // Real-world outcome
}
```

### 4.2 Historical Strategy Model

```typescript
interface HistoricalPRStrategy {
  round: number;          // Round number
  title: string;          // Strategy title
  content: string;        // Strategy content
  timeline: string;       // Execution timeline
}
```

### 4.3 Real-World Outcome Model

```typescript
interface RealWorldOutcome {
  success: boolean;       // Whether successful
  metrics: {
    sentimentImprovement: number | string;  // Sentiment improvement degree
    mediaCoverage: string;                  // Media coverage status
    stockPrice: string;                     // Stock price change
  };
  keyFactors: string[];   // Key success factors
}
```

### 4.4 Simulation Status Model

```typescript
interface Scenario2SimulationStatus {
  simulationId: string;               // Simulation ID
  caseId: string;                     // Case ID
  status: 'initial' | 'running' | 'completed' | 'error';
  currentRound: number;               // Current round
  totalRounds: number;                // Total number of rounds
  progress: number;                   // Progress percentage (0-100)
  message?: string;                   // Status message
}
```

### 4.5 Comparative Analysis Report Model

```typescript
interface EvaluationMetric {
  group: number;                      // Round number (1-based)
  pr_round: string;                   // Round label (e.g., "Round 1")
  r_e: number;                        // Pearson correlation coefficient (simulation vs real)
  JSD_e: number;                      // Jensen-Shannon divergence
  KL_p_e_m_e: number;                 // KL divergence (real→simulation)
  KL_p_hat_e_m_e: number;             // KL divergence (simulation→real)
  statistics: {                       // Statistical metrics
    mean_y_e: number;                 // Real data mean
    mean_y_hat_e: number;             // Simulated data mean
    std_y_e: number;                  // Real data standard deviation
    std_y_hat_e: number;              // Simulated data standard deviation
    rmse: number;                     // Root mean square error
    mae: number;                      // Mean absolute error
  };
}

interface ReportResponse {
  reportId: string;                   // Report ID
  reportType: string;                 // Report type ("scenario2_comparative")
  caseId: string;                     // Case ID
  caseTitle: string;                  // Case title
  content: string;                    // Report content (Markdown format)
  evaluationMetrics: EvaluationMetric[]; // Trajectory fidelity evaluation metrics
  evaluation: {                       // 9-dimensional comparative evaluation results
    evaluation_type: string;          // Evaluation type ("comparative")
    overall_similarity_percentage: number; // Overall similarity 0-100
    dimension_scores: {               // Detailed comparative scores for 9 dimensions
      [dimensionName: string]: {
        weight: number;               // Weight
        details: {
          category: string;            // Category ("comparative")
          simulation: {               // Simulation results
            percentage?: number;       // Achievement score (dimensions 2-9)
            summary: string;           // Brief summary (dimensions 2-9) or detailed description (dimension 1)
            reasoning?: string;        // Reasoning (dimensions 2-9)
          };
          real_case: {                // Real case results
            percentage?: number;       // Achievement score (dimensions 2-9)
            summary: string;           // Brief summary (dimensions 2-9) or detailed description (dimension 1)
            reasoning?: string;        // Reasoning (dimensions 2-9)
          };
          similarity: {               // Similarity analysis
            similarity_score?: number; // Similarity score (used by dimension 1)
            similarity_percentage?: number; // Similarity percentage (used by dimensions 2-9)
            summary?: string;          // Similarity summary (dimensions 2-9)
            reasoning: string;         // Detailed similarity analysis
          };
        };
      };
    };
    summary: string;                  // Evaluation summary
  };
  overallSimilarityPercentage: number; // Overall similarity (compatibility field)
  generatedAt: string;                // Generation time
}
```

**Evaluation Metrics Description (evaluationMetrics)**:

The `evaluationMetrics` field provides quantitative evaluation of trajectory fidelity, including the following metrics:

1. **r_e (Pearson Correlation)**
   - Range: -1 to 1
   - Meaning: Linear correlation between simulated and real trajectories
   - Values closer to 1 indicate more similar trajectories

2. **JSD_e (Jensen-Shannon Divergence)**
   - Range: 0 to 1
   - Meaning: Difference between simulated and real probability distributions
   - Values closer to 0 indicate more similar distributions

3. **KL Divergence (KL_p_e_m_e & KL_p_hat_e_m_e)**
   - Range: 0 to ∞
   - Meaning: Asymmetric measure of distribution difference
   - Smaller values indicate closer distributions

4. **Statistics (Statistical Metrics)**
   - `rmse`: Root mean square error of trajectory points
   - `mae`: Mean absolute error of trajectory points
   - `mean/std`: Mean and standard deviation comparison

**Note**: The current version of `evaluationMetrics` is dynamically calculated based on actual simulation results and real-world case data.

---

## 5. Interface Differences from Scenario 1

| Feature | Scenario 1 | Scenario 2 |
|------|-----------|-----------|
| **Initial Input** | User inputs event description and strategy | Select case ID, automatically loaded |
| **Strategy Source** | User manual input/LLM optimization | Automatically read from case data |
| **Round Progression** | `POST /add-strategy` requires strategy input | `POST /next-round` automatically reads |
| **Report Type** | Public opinion analysis report (PR effectiveness evaluation) | Comparative report (simulation vs real) |
| **Core Metrics** | 9-dimensional achievement evaluation | 9-dimensional similarity comparison |
| **Evaluation System** | Standalone evaluation | Comparative evaluation |
| **Report Endpoint** | `POST /api/scenario1/reports/generate` | `POST /api/scenario2/reports/generate` |
| **LLM Chat** | Has strategy optimization chat interface | None (directly uses historical strategies) |

---

## 6. Error Code Description

| Error Code | Description | HTTP Status Code |
|--------|------|------------|
| `CASE_NOT_FOUND` | Historical case does not exist | 404 |
| `SIMULATION_NOT_FOUND` | Simulation does not exist | 404 |
| `SIMULATION_ERROR` | Simulation execution error | 400 |
| `ROUND_LIMIT_EXCEEDED` | Maximum rounds reached | 400 |
| `NETWORK_ERROR` | Network connection error | - |
| `INTERNAL_ERROR` | Internal server error | 500 |

---

## 7. Frontend Workflow

### 7.1 Case Selection Process

1. **Load Case List**: Call `GET /api/scenario2/cases` when page loads
2. **Select Case**: User clicks case → Call `GET /api/scenario2/cases/{caseId}` to get details
3. **Display Details**: Show case background, strategy preview, etc. on the right side

### 7.2 Simulation Execution Process

1. **Start Simulation**: Call `POST /api/scenario2/simulation/start` (pass caseId)
2. **Poll Status**: Call `GET /api/scenario2/simulation/{simulationId}/status` every 1 second
3. **Get Round Results**: 
   - `status: completed` → Call `GET /api/scenario2/simulation/{simulationId}/result`
   - Display network visualization for current round
4. **Continue Next Round**: User clicks "Next Round" → Call `POST /api/scenario2/simulation/{simulationId}/next-round`
5. **Repeat steps 2-4** until all rounds are completed

### 7.3 Report Generation Process

1. **Generate Report**: After all rounds complete, call `POST /api/scenario2/reports/generate`
2. **Display Comparison**: Show 9-dimensional comparative analysis of simulation vs real results
3. **Validate Model**: Display overall similarity score and model validation information
