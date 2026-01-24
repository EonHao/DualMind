import json
from typing import Dict, Any, List, Tuple
from collections import Counter
import math
import numpy as np
from scipy.spatial.distance import jensenshannon
from scipy.stats import entropy
from llm_provider import get_llm
from logger import log_message


# ============================================================================
# Data Preparation Functions
# ============================================================================

def prepare_simulation_data(sim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts key information from simulation data for evaluation purposes.
    
    Args:
        sim: The simulation object (from _simulations).
    
    Returns:
        A structured summary of the simulation data.
    """
    agents = sim["agents"]
    discourse_history = sim["discourseHistory"]
    current_round = sim["currentRound"]
    
    # 1. Calculate stance distribution (by round)
    stance_by_round = {}
    for round_num in range(1, current_round + 1):
        round_posts = [post for post in discourse_history 
                      if post[2] == round_num and post[3] is not None]
        if round_posts:
            stance_scores = [post[3] for post in round_posts]
            stance_by_round[round_num] = {
                "average": sum(stance_scores) / len(stance_scores),
                "positive_count": sum(1 for s in stance_scores if s > 0),
                "negative_count": sum(1 for s in stance_scores if s < 0),
                "neutral_count": sum(1 for s in stance_scores if s == 0),
                "total": len(stance_scores),
                "extreme_positive": sum(1 for s in stance_scores if s >= 2),
                "extreme_negative": sum(1 for s in stance_scores if s <= -2)
            }
    
    # 2. Extract representative posts (by stance category)
    representative_posts = _extract_representative_posts(discourse_history, agents, limit=30)
    
    # 3. Build full discourse history text
    formatted_history = _format_discourse_history(discourse_history, agents)
    
    # 4. Gather PR strategy information
    pr_strategies = []
    for author_id, content, round_num, stance in discourse_history:
        if author_id == "system" and round_num > 0:
            pr_strategies.append({
                "round": round_num,
                "content": content
            })
    
    # Calculate overall trend metrics
    if len(stance_by_round) >= 2:
        first_round_avg = stance_by_round[min(stance_by_round.keys())]["average"]
        last_round_avg = stance_by_round[current_round]["average"]
        overall_trend = "Improving" if last_round_avg > first_round_avg else ("Worsening" if last_round_avg < first_round_avg else "Stable")
        trend_magnitude = abs(last_round_avg - first_round_avg)
    else:
        overall_trend = "Insufficient Data"
        trend_magnitude = 0
    
    # Calculate engagement metrics
    total_user_posts = len([p for p in discourse_history if p[0] != "system"])
    posts_per_round = total_user_posts / current_round if current_round > 0 else 0
    
    return {
        "simulation_id": sim["simulationId"],
        "scenario": sim.get("scenario", "unknown"),
        "total_rounds": current_round,
        "initial_topic": sim.get("initialTopic", ""),
        "stance_by_round": stance_by_round,
        "representative_posts": representative_posts,
        "pr_strategies": pr_strategies,
        "formatted_history": formatted_history,
        "total_agents": len(agents),
        "total_posts": total_user_posts,
        "posts_per_round": round(posts_per_round, 1),
        "overall_trend": overall_trend,
        "trend_magnitude": round(trend_magnitude, 2)
    }


def prepare_real_case_context(case: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts key descriptive information from a real case.
    
    Args:
        case: The case object (from historical_cases.json, normalized by case_manager).
    
    Returns:
        A structured summary of the real case.
    """
    # The data has been normalized by case_manager, so standard fields can be used directly.
    strategies = [
        {
            "round": s.get("round", s.get("node_id", 0)),
            "title": s.get("title", s.get("strategy", "")),
            "content": s.get("content", ""),
            "timeline": s.get("timeline", s.get("timestamp", ""))
        }
        for s in case.get("strategies", [])
    ]
    
    # Extract public opinion description from the real case (if available).
    # Extract situation information from nodes.
    situation_summaries = []
    if "nodes" in case:
        for node in case["nodes"]:
            if "situation" in node:
                sit = node["situation"]
                round_num = node.get("node_id", 0)
                situation_summaries.append({
                    "round": round_num,
                    "overall_stance": sit.get("overall_stance", ""),
                    "evolution_direction": sit.get("evolution_direction", ""),
                    "polarization_level": sit.get("polarization_level", ""),
                    "core_dispute": sit.get("core_dispute", ""),
                    "main_arguments": sit.get("main_arguments", ""),
                    "emotional_tone": sit.get("emotional_tone", ""),
                    "secondary_topic_diffusion": sit.get("secondary_topic_diffusion", "")
                })
    
    return {
        "case_id": case.get("id", case.get("event_id", "")),
        "title": case.get("title", case.get("event_name", "")),
        "background": case.get("background", case.get("event_summary", "")),
        "industry": case.get("industry", case.get("crisis_type", "")),
        "company": case.get("company", ""),
        "date": case.get("date", ""),
        "crisis_type": case.get("crisis_type", ""),
        "core_conflict": case.get("core_conflict", ""),
        "total_rounds": case.get("totalRounds", len(strategies)),
        "strategies": strategies,
        "outcome": case["realWorldOutcome"],
        "key_factors": case["realWorldOutcome"].get("keyFactors", []),
        "situation_summaries": situation_summaries  # New: Public opinion description for each round.
    }


# ============================================================================
# Helper Functions
# ============================================================================

def _get_similarity_context_note() -> str:
    """Gets the context note for similarity evaluation (general)."""
    return """[Important Evaluation Note]
- The simulation only executes partial rounds of the real case, representing an initial-stage replication of the real event.
- The evaluation should focus on the similarity of the "executed stage," not on overall completeness.
- If the simulation exhibits features similar to the real case at the corresponding stage, it should be given a high similarity score.
- The score should not be lowered due to the "simulation not being comprehensive enough"; the focus is on the consistency of "direction" and "trend." """

def _get_similarity_evaluation_criteria(dimension_name: str) -> str:
    """Gets detailed criteria for similarity evaluation."""
    criteria = {
        "Stance Tendency": """
[Scoring Criteria]
90-100%: Stance tendency is completely consistent (e.g., both support/oppose/neutral), and the intensity is similar (difference < 15%).
75-89%: Stance tendency is consistent, but there is some difference in intensity (difference 15-30%).
60-74%: Stance tendency is basically consistent, but the intensity difference is large (difference 30-45%).
40-59%: Stance tendency is partially consistent, or the direction is the same but the intensity difference is very large.
20-39%: Stance tendency is inconsistent, with directional differences.
0-19%: Stance tendency is completely opposite.

[Key Focus]
- Primarily, whether the stance "direction" (support/oppose/neutral) is consistent.
- Secondly, the proximity of stance "intensity".
- The simulation only needs to exhibit similar features in the corresponding rounds.
        """,
        
        "Evolution Direction": """
[Scoring Criteria]
90-100%: Evolution direction is completely consistent (both improving/worsening/stable), and the trend slope is similar.
75-89%: Evolution direction is consistent, but there are differences in trend intensity.
60-74%: Evolution direction is basically consistent, with some local fluctuation differences.
40-59%: Evolution direction is partially consistent, or there are similar turning points.
20-39%: Evolution direction is not very consistent, with clear differences.
0-19%: Evolution direction is completely opposite.

[Key Focus]
- Primarily, whether the overall trend (improving/worsening/stable) is consistent.
- Secondly, whether key turning points occur at similar times.
- Local fluctuation differences are allowed; focus on the major trend.
        """,
        
        "Degree of Polarization": """
[Scoring Criteria]
90-100%: Degree of polarization is very similar (both highly polarized/moderately polarized/basically consistent).
75-89%: Degree of polarization is similar, but there are differences in specific values.
60-74%: Degree of polarization is basically at the same level, but the features are not completely identical.
40-59%: There is some difference in the degree of polarization, but not completely opposite.
20-39%: The degree of polarization differs significantly.
0-19%: The degree of polarization is completely opposite (one is highly polarized, the other is completely uniform).

[Key Focus]
- Primarily, whether the polarization "level" (high/medium/low) is consistent.
- Secondly, the distribution characteristics of extreme viewpoints.
- Reasonable differences in specific proportions are allowed.
        """,
        
        "Turning Point Timing": """
[Scoring Criteria]
90-100%: The turning point occurs in the same round, and both direction and intensity are similar.
75-89%: The turning point timing is close (within 1 round), and the direction is consistent.
60-74%: A turning point exists and the direction is consistent, but the timing differs to some extent.
40-59%: Some turning points are similar, or the turning features partially match.
20-39%: The timing or features of the turning point differ significantly.
0-19%: There are no similar turning points at all.

[Key Focus]
- Primarily, whether a turning point occurs in a similar round.
- Secondly, whether the direction of the turning point (improving/worsening) is consistent.
- If the simulation has few rounds, only compare the turning points of the executed rounds.
        """,
        
        "Core Issue Focus": """
[Scoring Criteria]
90-100%: The focus of discussion is highly consistent, and the core issues completely overlap.
75-89%: The focus of discussion is similar, with a high degree of overlap in major issues.
60-74%: The focus of discussion is basically consistent, with some differences in minor issues.
40-59%: Core issues partially overlap, but there are also clear differences.
20-39%: The focus of discussion differs significantly, with low overlap.
0-19%: The focus of discussion is completely different.

[Key Focus]
- Primarily, whether the core points of contention are the same.
- Secondly, the coverage of the main topics of discussion.
- Differences in minor issues are allowed.
        """,
        
        "Mainstream Arguments": """
[Scoring Criteria]
90-100%: Mainstream arguments are highly consistent; the core viewpoints of both supporters and opponents are similar.
75-89%: Mainstream arguments are similar, and most key arguments correspond.
60-74%: Mainstream arguments are basically consistent, with some differences in arguments.
40-59%: Some mainstream arguments are similar, but there are also clear differences.
20-39%: Mainstream arguments differ significantly.
0-19%: Mainstream arguments are completely different.

[Key Focus]
- Primarily, whether the core arguments of the supporting and opposing sides are similar.
- Secondly, the logic and direction of the arguments.
- Differences in specific wording and details are allowed.
        """,
        
        "Emotional Tone": """
[Scoring Criteria]
90-100%: The emotional tone is highly consistent (e.g., both angry/calm/sad), and the intensity is similar.
75-89%: The emotional tone is consistent, but there is some difference in intensity.
60-74%: The emotional tone is basically consistent, with local differences.
40-59%: The emotional tone is partially similar, but there are also clear differences.
20-39%: The emotional tone differs significantly.
0-19%: The emotional tone is completely opposite (e.g., one is angry, the other is peaceful).

[Key Focus]
- Primarily, whether the dominant emotion type is consistent.
- Secondly, the level of emotional intensity (high/medium/low).
- Differences in the expression of emotions are allowed.
        """,
        
        "PR Response": """
[Scoring Criteria]
90-100%: The response pattern to the PR strategy is highly consistent, and the effect is similar.
75-89%: The response pattern is similar, and the overall effect is close.
60-74%: The response pattern is basically consistent, with local differences in effect.
40-59%: Some response features are similar, but the overall effect differs.
20-39%: The response pattern differs significantly.
0-19%: The response pattern is completely different.

[Key Focus]
- Primarily, whether public acceptance of the strategy is similar.
- Secondly, the direction of the effect after strategy implementation (positive/negative).
- Reasonable differences in specific values are allowed.
        """,
        
        "Topic Diffusion": """
[Scoring Criteria]
90-100%: The topic diffusion path is highly consistent, and secondary topics are similar.
75-89%: The diffusion path is similar, and major secondary topics correspond.
60-74%: The diffusion path is basically consistent, with some differences in secondary topics.
40-59%: Some diffusion features are similar, but the paths differ.
20-39%: The diffusion path differs significantly.
0-19%: The diffusion path is completely different.

[Key Focus]
- Primarily, whether similar secondary topics were generated.
- Secondly, the main direction of topic diffusion.
- Differences in diffusion details and specific paths are allowed.
        """
    }
    
    # Match criteria based on dimension name
    for key, value in criteria.items():
        if key in dimension_name:
            return value
    
    # Default General Criteria
    return """
[Scoring Criteria]
90-100%: Highly similar, core features are completely consistent.
75-89%: High similarity, main features are consistent, with minor differences.
60-74%: Basically similar, core features are consistent, with clear differences.
40-59%: Partially similar, with both commonalities and differences.
20-39%: Low similarity, differences are obvious.
0-19%: Almost completely different.

[Key Focus]
- Focus on the corresponding features of the executed rounds.
- Focus on direction and trend rather than absolute values.
- Allow for reasonable differences in a form of expression.
    """

def _extract_representative_posts(discourse_history: List[Tuple], agents: Dict, limit: int = 30) -> Dict[str, List]:
    """Extracts representative posts (categorized by stance)."""
    posts_by_stance = {
        "strong_support": [],  # stance >= 2
        "support": [],         # 1 <= stance < 2
        "neutral": [],         # stance == 0
        "oppose": [],          # -2 < stance <= -1
        "strong_oppose": []    # stance <= -2
    }
    
    for author_id, content, round_num, stance in discourse_history:
        if author_id == "system" or stance is None:
            continue
            
        agent = agents.get(author_id)
        username = agent.persona.get("username") if agent else "Unknown"
        influence = agent.persona.get("influence_score", 50) if agent else 50
        
        post_data = {
            "username": username,
            "content": content,
            "stance": stance,
            "influence": influence,
            "round": round_num
        }
        
        if stance >= 2:
            posts_by_stance["strong_support"].append(post_data)
        elif stance >= 1:
            posts_by_stance["support"].append(post_data)
        elif stance <= -2:
            posts_by_stance["strong_oppose"].append(post_data)
        elif stance <= -1:
            posts_by_stance["oppose"].append(post_data)
        else:
            posts_by_stance["neutral"].append(post_data)
    
    # Select high-influence posts from each category
    result = {}
    for category, posts in posts_by_stance.items():
        sorted_posts = sorted(posts, key=lambda x: x["influence"], reverse=True)
        result[category] = sorted_posts[:10]  # Max 10 per category
    
    return result


def _format_discourse_history(discourse_history: List[Tuple], agents: Dict) -> str:
    """Formats the discourse history into a text string."""
    formatted = ""
    for author_id, content, round_num, stance in discourse_history:
        if author_id == "system":
            formatted += f"\n[Round {round_num}] [Official Statement]: {content}\n"
        else:
            username = agents[author_id].persona.get('username', author_id) if author_id in agents else "Unknown"
            formatted += f"[Round {round_num}] {username} (Stance:{stance}): {content}\n"
    return formatted


def _parse_llm_json_response(response: str) -> Dict:
    """Parses the JSON response from the LLM."""
    try:
        # Attempt to parse directly
        return json.loads(response)
    except json.JSONDecodeError:
        # Attempt to extract the JSON part
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except:
                pass
        
        # If it fails, return a default structure
        log_message(f"WARNING: Failed to parse LLM response as JSON: {response[:200]}...")
        return {
            "percentage": 50,
            "summary": "Parsing failed",
            "reasoning": "LLM response format error",
            "raw_response": response
        }


# ============================================================================
# LLM Evaluation Functions - Generic Helper Function
# ============================================================================

def _evaluate_dimension_generic(
    dimension_name: str,
    sim_data_text: str,
    real_data_text: str = None,
    context_note: str = "",
    ideal_effect_description: str = ""
) -> Dict[str, Any]:
    """
    Generic dimension evaluation function: extracts descriptive features, then compares similarity or assesses achievement level.
    Scenario 1: Evaluate the percentage of achieving the ideal effect.
    Scenario 2: Compare similarity.
    """
    llm = get_llm("gemini-2.5-pro")
    
    # Scenario 1: Evaluate the simulation only, assessing the percentage of achieving the ideal effect.
    if not real_data_text:
        prompt = f"""Please evaluate the performance of [{dimension_name}] and provide a quantitative score.

{sim_data_text}

[Ideal Effect Standard]
{ideal_effect_description if ideal_effect_description else "The PR strategy successfully calms the public opinion crisis, shifting public sentiment from negative to positive or neutral, and public attitude from questioning to understanding or support."}

[Evaluation Requirements]
1. Summarize the core features of this dimension (2-3 sentences).
2. Based on the ideal effect standard, evaluate the percentage to which the current simulation achieves the ideal effect.
3. Explain why this score was given.

[Scoring Criteria]
- 90-100 points: Completely or nearly achieves the ideal effect.
- 75-89 points: Mostly achieves the ideal effect, with room for improvement.
- 60-74 points: Partially achieves the ideal effect, with average results.
- 40-59 points: Barely achieves partial effect, far from ideal.
- 0-39 points: Fails to achieve the ideal effect or has the opposite effect.

Return in JSON format:
{{
    "description": "A 2-3 sentence core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
    "ideal_achievement_percentage": "number (0-100, can be a decimal like 78.5)",
    "reasoning": "Detailed explanation: 1) current performance 2) gap from ideal effect 3) basis for scoring"
}}"""
        
        response = llm.invoke(prompt).content
        result = _parse_llm_json_response(response)
        result["category"] = "simulation_only"
        return result
    
    # Scenario 2: Extract features and compare
    else:
        # Step 1: Summarize simulation features
        sim_prompt = f"""Please summarize the core features of [{dimension_name}] in the simulation.

{sim_data_text}

Please describe the core features and main performance in 2-3 sentences.

Return in JSON format:
{{
    "description": "A 2-3 sentence core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"]
}}"""
        
        sim_result = _parse_llm_json_response(llm.invoke(sim_prompt).content)
        
        # Step 2: Summarize real case features
        real_prompt = f"""Please summarize the core features of [{dimension_name}] in the real case.

{real_data_text}

Please describe the core features and main performance in 2-3 sentences.

Return in JSON format:
{{
    "description": "A 2-3 sentence core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"]
}}"""
        
        real_result = _parse_llm_json_response(llm.invoke(real_prompt).content)
        
        # Step 3: Have the LLM directly compare the similarity
        similarity_prompt = f"""Please evaluate the similarity between the simulation and the real case on the [{dimension_name}] dimension.

{context_note}

[Simulation Features]
Description: {sim_result.get('description', '')}
Key Features: {', '.join(sim_result.get('key_features', []))}

[Real Case Features]
Description: {real_result.get('description', '')}
Key Features: {', '.join(real_result.get('key_features', []))}

Please think deeply and compare: core features, main performance, overall similarity.

Scoring requirements (can be a decimal, e.g., 78.5 points):
- Highly similar (core features are basically consistent) → 85-100 points
- High similarity (main features are consistent, with differences in details) → 70-84 points
- Basically similar (direction is consistent, but performance differs) → 55-69 points
- Partially similar (commonalities exist, but differences are clear) → 40-54 points
- Low similarity (differences outweigh similarities) → 0-39 points

Please evaluate objectively. If they are indeed similar, give a high score; if they are different, give a low score.

Return in JSON format:
{{
    "similarity_percentage": "number (0-100, can be a decimal like 75.5)",
    "summary": "A one-sentence summary",
    "reasoning": "Detailed explanation of similarities and differences"
}}"""
        
        similarity_result = _parse_llm_json_response(llm.invoke(similarity_prompt).content)
        
        return {
            "category": "comparative",
            "simulation": sim_result,
            "real_case": real_result,
            "similarity": similarity_result
        }


# ============================================================================
# LLM Evaluation Functions - 9 Dimensions (All Evaluated by LLM)
# ============================================================================

def evaluate_stance_tendency(sim_data: Dict, real_case_data: Dict = None) -> Dict[str, Any]:
    """
    Dimension 1: Overall Stance Tendency
    Extract core feature descriptions, no numerical scoring.
    """
    log_message("Evaluating Dimension 1: Overall Stance Tendency")
    
    # Prepare simulation data text
    last_round = sim_data["total_rounds"]
    stance_stats = sim_data["stance_by_round"].get(last_round, {})
    
    posts_sample = ""
    for category, posts in sim_data["representative_posts"].items():
        if posts:
            posts_sample += f"\n[{category} Posts]:\n"
            for p in posts[:3]:
                posts_sample += f"- {p['username']}: {p['content'][:60]}...\n"
    
    sim_text = f"""Simulation Data Statistics:
- Support Count: {stance_stats.get('positive_count', 0)}/{stance_stats.get('total', 0)}
- Oppose Count: {stance_stats.get('negative_count', 0)}/{stance_stats.get('total', 0)}
- Neutral Count: {stance_stats.get('neutral_count', 0)}/{stance_stats.get('total', 0)}
- Average Stance: {stance_stats.get('average', 0):.2f} (Range -3 to +3)

Representative Post Samples:
{posts_sample[:1500]}"""
    
    # If a real case exists, prepare the real case text
    real_text = None
    if real_case_data:
        stance_info = ""
        if real_case_data.get("situation_summaries"):
            for sit_sum in real_case_data["situation_summaries"]:
                if sit_sum.get("overall_stance"):
                    stance_info += f"\nRound {sit_sum['round']}: {sit_sum['overall_stance']}"
        
        real_text = f"""Case: {real_case_data['title']}
Background: {real_case_data['background']}

{'[Public Opinion Stance by Round]' + stance_info if stance_info else ''}

Final Outcome: {json.dumps(real_case_data['outcome'], ensure_ascii=False)}
Key Factors: {', '.join(real_case_data['key_factors'])}"""
    
    # Call the generic evaluation function
    context_note = _get_similarity_context_note() if real_case_data else ""
    return _evaluate_dimension_generic(
        "Overall Stance Tendency",
        sim_text,
        real_text,
        context_note
    )


def evaluate_evolution_direction(sim_data: Dict, real_case_data: Dict = None) -> Dict[str, Any]:
    """
    Dimension 2: Public Opinion Evolution Direction - Specific evaluation for evolution trends
    """
    log_message("Evaluating Dimension 2: Public Opinion Evolution Direction")
    
    llm = get_llm("gemini-2.5-pro")
    
    # Build evolution data
    evolution_text = ""
    for round_num in sorted(sim_data["stance_by_round"].keys()):
        stats = sim_data["stance_by_round"][round_num]
        avg = stats["average"]
        evolution_text += f"Round {round_num}: Average Stance {avg:.2f}, Support {stats['positive_count']}/Oppose {stats['negative_count']}/Neutral {stats['neutral_count']}\n"
    
    if not real_case_data:
        prompt = f"""Please evaluate the performance of [Public Opinion Evolution Direction] and provide a quantitative score.

Evolution Data:
{evolution_text}

Overall Trend: {sim_data.get('overall_trend', 'Unknown')}

PR Strategies:
{json.dumps(sim_data['pr_strategies'], ensure_ascii=False, indent=2)}

[Ideal Effect Standard]
The PR strategy should guide public opinion in a positive direction, gradually shifting it from initial doubt or negativity towards understanding, neutrality, or support, showing a stable and positive trend.

[Evaluation Requirements]
1. Describe the core features of the evolution direction (overall trend, speed of change, key turning points).
2. Based on the ideal effect standard, evaluate the percentage of achieving the ideal effect.
3. Explain why this score was given.

[Scoring Criteria]
- 90-100 points: Public opinion is clearly improving, continuously getting better, and approaching the ideal effect.
- 75-89 points: Public opinion is generally improving, showing some improvement.
- 60-74 points: Public opinion is stable or slightly improving.
- 40-59 points: Public opinion is fluctuating or improvement is not obvious.
- 0-39 points: Public opinion continues to worsen or shows no improvement.

Return in JSON format:
{{
    "description": "Core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
    "ideal_achievement_percentage": "number (0-100, can be a decimal like 78.5)",
    "reasoning": "Detailed explanation: 1) current evolution performance 2) gap from ideal effect 3) basis for scoring"
}}"""
        
        response = llm.invoke(prompt).content
        result = _parse_llm_json_response(response)
        result["category"] = "simulation_only"
        return result
    
    else:
        # Step 1: Summarize the simulation's evolution features
        sim_prompt = f"""Please summarize the core features of the public opinion evolution direction in the simulation.

Evolution Data:
{evolution_text}

Overall Trend: {sim_data.get('overall_trend', 'Unknown')}
Trend Magnitude: {sim_data.get('trend_magnitude', 0)}

Please describe the core evolution features in 2-3 sentences (overall trend, magnitude of change, key nodes).

Return in JSON format:
{{
    "description": "Core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"]
}}"""
        
        sim_result = _parse_llm_json_response(llm.invoke(sim_prompt).content)
        
        # Step 2: Summarize the real case's evolution features
        evolution_info = ""
        if real_case_data.get("situation_summaries"):
            for sit_sum in real_case_data["situation_summaries"]:
                if sit_sum.get("evolution_direction"):
                    evolution_info += f"\nRound {sit_sum['round']}: {sit_sum['evolution_direction']}"
        
        real_prompt = f"""Please summarize the core features of the public opinion evolution direction in the real case.

Case: {real_case_data['title']}

{'[Evolution by Round]' + evolution_info if evolution_info else ''}

Final Outcome: {real_case_data['outcome']['success']}
Key Factors: {', '.join(real_case_data['key_factors'])}

Please describe the core evolution features in 2-3 sentences (overall trend, magnitude of change, key nodes).

Return in JSON format:
{{
    "description": "Core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"]
}}"""
        
        real_result = _parse_llm_json_response(llm.invoke(real_prompt).content)
        
        # Step 3: Specialized similarity comparison for evolution direction
        context_note = _get_similarity_context_note()
        
        similarity_prompt = f"""Please evaluate the similarity of the [Public Opinion Evolution Direction].

{context_note}

[Simulation's Evolution Features]
{sim_result.get('description', '')}
Key Features: {', '.join(sim_result.get('key_features', []))}

[Real Case's Evolution Features]
{real_result.get('description', '')}
Key Features: {', '.join(real_result.get('key_features', []))}

Professional comparison for evolution direction:
1. Is the "overall direction" of evolution consistent? (Improving/Worsening/Fluctuating/Stable)
2. Is the "speed and magnitude" of evolution similar? (Rapid/Gradual/Slow)
3. Are there similar "turning points"?
4. Is the "pattern" of evolution consistent? (Linear/Fluctuating/Phased)

Scoring Criteria (decimals like 82.5 are allowed):
- 90-100 points: Direction is consistent, magnitude is similar, similar turning points exist, and evolution pattern is highly consistent.
- 75-89 points: Direction is consistent, magnitude is close, overall pattern is similar, possibly with slight timing differences.
- 60-74 points: Direction is basically consistent, but magnitude or pace has clear differences.
- 45-59 points: Direction is roughly the same but the evolution process differs significantly, or direction is not entirely consistent.
- 0-44 points: Evolution direction is opposite or the evolution model is completely different.

Please evaluate objectively. If the evolution direction is indeed similar, please give a high score (e.g., 85-95 points).

Return in JSON format:
{{
    "similarity_percentage": "number (0-100, decimal like 82.5)",
    "summary": "A one-sentence summary",
    "reasoning": "Detailed explanation: direction comparison + magnitude comparison + node comparison + basis for this score"
}}"""
        
        similarity_result = _parse_llm_json_response(llm.invoke(similarity_prompt).content)
        
        return {
            "category": "comparative",
            "simulation": sim_result,
            "real_case": real_result,
            "similarity": similarity_result
        }


def evaluate_polarization_degree(sim_data: Dict, real_case_data: Dict = None) -> Dict[str, Any]:
    """
    Dimension 3: Degree of Public Opinion Polarization - Specific evaluation for polarization features
    """
    log_message("Evaluating Dimension 3: Degree of Public Opinion Polarization")
    
    llm = get_llm("gemini-2.5-pro")
    
    last_round = sim_data["total_rounds"]
    stats = sim_data["stance_by_round"].get(last_round, {})
    
    extreme_info = f"Extreme Support: {stats.get('extreme_positive', 0)}, Extreme Oppose: {stats.get('extreme_negative', 0)}, Total: {stats.get('total', 1)}"
    
    if not real_case_data:
        prompt = f"""Please evaluate the performance of [Degree of Public Opinion Polarization] and provide a quantitative score.

Statistical Data: {extreme_info}
Distribution: Support {stats.get('positive_count', 0)}/Oppose {stats.get('negative_count', 0)}/Neutral {stats.get('neutral_count', 0)} (Total {stats.get('total', 0)} people)

[Ideal Effect Standard]
The PR strategy should reduce extreme opposition, promote consensus, and shift public opinion from highly polarized to more uniform or moderate, reducing the phenomenon of bipolarization.

[Evaluation Requirements]
1. Describe the polarization features (level of polarization, distribution of extreme views, reasons for polarization).
2. Based on the ideal effect standard, evaluate the percentage of achieving the ideal effect.
3. Explain why this score was given.

[Scoring Criteria]
- 90-100 points: Very low polarization, opinion is uniform, almost no extreme opposition.
- 75-89 points: Low polarization, most have reached a consensus.
- 60-74 points: Moderate polarization, some consensus exists but disagreements remain.
- 40-59 points: Clear polarization, strong opposition sentiment.
- 0-39 points: Severe polarization, clear bipolar opposition.

Return in JSON format:
{{
    "description": "Core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
    "ideal_achievement_percentage": "number (0-100, can be a decimal like 78.5)",
    "reasoning": "Detailed explanation: 1) current degree of polarization 2) gap from ideal effect 3) basis for scoring"
}}"""
        
        result = _parse_llm_json_response(llm.invoke(prompt).content)
        result["category"] = "simulation_only"
        return result
    
    else:
        # Step 1: Summarize the simulation's polarization features
        sim_prompt = f"""Please summarize the core features of the degree of public opinion polarization in the simulation.

Statistical Data: {extreme_info}
Distribution: Support {stats.get('positive_count', 0)}/Oppose {stats.get('negative_count', 0)}/Neutral {stats.get('neutral_count', 0)} (Total {stats.get('total', 0)} people)

Please describe the polarization features (level of polarization, distribution of extreme views, reasons for polarization).

Return in JSON format:
{{
    "description": "Core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"]
}}"""
        
        sim_result = _parse_llm_json_response(llm.invoke(sim_prompt).content)
        
        # Step 2: Summarize the real case's polarization features
        polarization_info = ""
        if real_case_data.get("situation_summaries"):
            for sit_sum in real_case_data["situation_summaries"]:
                if sit_sum.get("polarization_level"):
                    polarization_info += f"\nRound {sit_sum['round']}: {sit_sum['polarization_level']}"
        
        real_prompt = f"""Please summarize the core features of the degree of public opinion polarization in the real case.

Case: {real_case_data['title']}

{'[Polarization by Round]' + polarization_info if polarization_info else ''}

Final Outcome: {json.dumps(real_case_data['outcome'], ensure_ascii=False)}

Please describe the polarization features (level of polarization, distribution of extreme views, reasons for polarization).

Return in JSON format:
{{
    "description": "Core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"]
}}"""
        
        real_result = _parse_llm_json_response(llm.invoke(real_prompt).content)
        
        # Step 3: Specialized similarity comparison for degree of polarization
        context_note = _get_similarity_context_note()
        
        similarity_prompt = f"""Please evaluate the similarity of the [Degree of Public Opinion Polarization].

{context_note}

[Simulation's Polarization Features]
{sim_result.get('description', '')}
Key Features: {', '.join(sim_result.get('key_features', []))}

[Real Case's Polarization Features]
{real_result.get('description', '')}
Key Features: {', '.join(real_result.get('key_features', []))}

Professional comparison for degree of polarization:
1. Is the "level" of polarization consistent? (Severe/Moderate/Mild/Uniform)
2. Is the "proportion" of extreme views similar?
3. Is the "pattern" of polarization the same? (Bipolar/Multi-polar/Gradient)
4. Are the group characteristics similar?

Scoring Criteria (decimals like 78.5 are allowed):
- 90-100 points: Polarization level is consistent, proportion of extremes is similar, and polarization pattern is highly identical.
- 75-89 points: Polarization level is close, proportion of extremes is roughly equivalent, and pattern is basically consistent.
- 60-74 points: Polarization level is similar, but there are differences in proportion or pattern.
- 45-59 points: Degree of polarization differs slightly, pattern is not completely the same.
- 0-44 points: Degree of polarization is significantly different or polarization pattern is completely opposite.

If the polarization features are indeed similar, please give a high score (85-95 points).

Return in JSON format:
{{
    "similarity_percentage": "number (0-100, decimal like 78.5)",
    "summary": "A one-sentence summary",
    "reasoning": "Detailed explanation: level comparison + proportion comparison + pattern comparison + basis for scoring"
}}"""
        
        similarity_result = _parse_llm_json_response(llm.invoke(similarity_prompt).content)
        
        return {
            "category": "comparative",
            "simulation": sim_result,
            "real_case": real_result,
            "similarity": similarity_result
        }


def evaluate_turning_point_timing(sim_data: Dict, real_case_data: Dict = None) -> Dict[str, Any]:
    """
    Dimension 4: Timing of Key Turning Points - Specific evaluation for the timing of turning points
    """
    log_message("Evaluating Dimension 4: Timing of Key Turning Points")
    
    llm = get_llm("gemini-2.5-pro")
    
    # Analyze turning points
    turning_analysis = ""
    turning_points = []
    prev_avg = None
    
    for round_num in sorted(sim_data["stance_by_round"].keys()):
        stats = sim_data["stance_by_round"][round_num]
        current_avg = stats["average"]
        
        turning_analysis += f"Round {round_num}: Average Stance {current_avg:.2f}\n"
        
        if prev_avg is not None:
            change = current_avg - prev_avg
            if abs(change) > 0.5:
                turning_points.append({
                    "round": round_num,
                    "change": round(change, 2),
                    "direction": "Improving" if change > 0 else "Worsening"
                })
                turning_analysis += f"  → Turning Point: Stance change {change:+.2f}\n"
        prev_avg = current_avg
    
    if not real_case_data:
        prompt = f"""Please evaluate the performance of [Timing of Key Turning Points] and provide a quantitative score.

{turning_analysis}

Turning Points: {json.dumps(turning_points, ensure_ascii=False) if turning_points else 'No significant turning points detected'}

[Ideal Effect Standard]
The PR strategy should generate positive turning points at the right time, shifting public opinion from negative to positive. The timing should be appropriate and the effect significant.

[Evaluation Requirements]
1. Describe the features of the turning points (timing, direction, intensity).
2. Based on the ideal effect standard, evaluate the percentage of achieving the ideal effect.
3. Explain why this score was given.

[Scoring Criteria]
- 90-100 points: A clear positive turning point occurred, timing was appropriate, and the effect was significant.
- 75-89 points: A positive turning point occurred, timing and effect were good.
- 60-74 points: A turning point occurred, but the effect was average or the timing was not ideal.
- 40-59 points: The turning point was not obvious or the direction was not positive enough.
- 0-39 points: No positive turning points or public opinion continued to worsen.

Return in JSON format:
{{
    "description": "Core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
    "ideal_achievement_percentage": "number (0-100, can be a decimal like 78.5)",
    "reasoning": "Detailed explanation: 1) turning point performance 2) gap from ideal effect 3) basis for scoring"
}}"""
        
        result = _parse_llm_json_response(llm.invoke(prompt).content)
        result["category"] = "simulation_only"
        return result
    
    else:
        # Step 1: Summarize simulation turning points
        sim_prompt = f"""Please summarize the features of the turning points in the simulation.

{turning_analysis}

Turning Points: {json.dumps(turning_points, ensure_ascii=False) if turning_points else 'No clear turning points'}

Please describe the features of the turning points (round of occurrence, direction, intensity).

Return in JSON format:
{{
    "description": "Core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"]
}}"""
        
        sim_result = _parse_llm_json_response(llm.invoke(sim_prompt).content)
        
        # Step 2: Summarize real case turning points
        evolution_info = ""
        if real_case_data.get("situation_summaries"):
            for sit_sum in real_case_data["situation_summaries"]:
                if sit_sum.get("evolution_direction"):
                    evolution_info += f"\nRound {sit_sum['round']}: {sit_sum['evolution_direction']}"
        
        real_prompt = f"""Please summarize the features of the turning points in the real case.

Case: {real_case_data['title']}

{'[Evolution by Round]' + evolution_info if evolution_info else ''}

Final Outcome: {'Success' if real_case_data['outcome']['success'] else 'Failure'}

Please describe the features of the turning points (round of occurrence, direction, intensity).

Return in JSON format:
{{
    "description": "Core description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"]
}}"""
        
        real_result = _parse_llm_json_response(llm.invoke(real_prompt).content)
        
        # Step 3: Compare similarity of turning point timing
        context_note = _get_similarity_context_note()
        
        similarity_prompt = f"""Please evaluate the similarity of the [Timing of Turning Points].

{context_note}

[Simulation Turning Points]
{sim_result.get('description', '')}
Key Features: {', '.join(sim_result.get('key_features', []))}

[Real Case Turning Points]
{real_result.get('description', '')}
Key Features: {', '.join(real_result.get('key_features', []))}

Professional comparison for turning points:
1. Is the "round of occurrence" of the turning points close? (Same round/Adjacent rounds/Spanning multiple rounds)
2. Is the "direction" of the turning point consistent? (Improving/Worsening)
3. Is the "intensity" of the turning point similar? (Drastic/Moderate/Slight)
4. Is the "number" of turning points comparable?

Scoring Criteria (decimals like 87.5 are allowed):
- 90-100 points: Round is the same, direction is consistent, intensity is similar, and number is comparable.
- 75-89 points: Rounds are close, direction is consistent, and intensity is roughly similar.
- 60-74 points: Rounds differ slightly, but direction is basically consistent.
- 45-59 points: Turning points exist but timing or features differ significantly.
- 0-44 points: Turning point timing is completely different or direction is opposite.

If the turning point features are indeed similar, please give a high score (85-95 points).

Return in JSON format:
{{
    "similarity_percentage": "number (0-100, decimal like 87.5)",
    "summary": "A one-sentence summary",
    "reasoning": "Detailed explanation: round comparison + direction comparison + intensity comparison + basis for scoring"
}}"""
        
        similarity_result = _parse_llm_json_response(llm.invoke(similarity_prompt).content)
        
        return {
            "category": "comparative",
            "simulation": sim_result,
            "real_case": real_result,
            "similarity": similarity_result
        }


def evaluate_core_issue_focus(sim_data: Dict, real_case_data: Dict = None) -> Dict[str, Any]:
    """
    Dimension 5: Core Issue Focus
    """
    log_message("Evaluating Dimension 5: Core Issue Focus")
    
    llm = get_llm("gemini-2.5-pro")
    
    posts_sample = sim_data["formatted_history"][:2000]
    
    if not real_case_data:
        prompt = f"""Please evaluate the performance of [Core Issue Focus] and provide a quantitative score.

Topic: {sim_data['initial_topic']}

Discussion Sample:
{posts_sample}

[Ideal Effect Standard]
The PR strategy should guide the focus of discussion from negative issues to the company's solutions and positive actions, reducing attention on negative issues.

[Evaluation Requirements]
1. Describe the features of the current discussion focus.
2. Based on the ideal effect standard, evaluate the percentage of achieving the ideal effect.
3. Explain why this score was given.

[Scoring Criteria]
- 90-100 points: The focus has successfully shifted to positive or neutral topics.
- 75-89 points: The focus has shifted somewhat, but negative discussion remains.
- 60-74 points: The focus is partially shifted, with a mix of negative and positive.
- 40-59 points: The focus remains on negative issues.
- 0-39 points: The focus is entirely on negative issues, and the situation has worsened.

Return in JSON format:
{{
    "description": "Core focus description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
    "ideal_achievement_percentage": "number (0-100, can be a decimal like 78.5)",
    "reasoning": "Detailed explanation: 1) current focus 2) gap from ideal effect 3) basis for scoring"
}}"""
        
        result = _parse_llm_json_response(llm.invoke(prompt).content)
        result["category"] = "simulation_only"
        return result
    
    else:
        sim_result = _parse_llm_json_response(llm.invoke(f"""Evaluate simulation focus.
Topic: {sim_data['initial_topic']}
Discussion: {posts_sample[:1000]}
Return JSON: {{"percentage": "number", "summary": "Summary", "reasoning": "Reasoning"}}""").content)
        
        # Extract core dispute information
        dispute_info = ""
        if real_case_data.get("situation_summaries"):
            for sit_sum in real_case_data["situation_summaries"]:
                if sit_sum.get("core_dispute"):
                    dispute_info += f"\nRound {sit_sum['round']}: {sit_sum['core_dispute']}"
        
        real_result = _parse_llm_json_response(llm.invoke(f"""Evaluate real case focus.
Case: {real_case_data['title']}
Background: {real_case_data['background']}
Core Conflict: {real_case_data.get('core_conflict', '')}
{'[Core Dispute by Round]' + dispute_info if dispute_info else ''}
Key Factors: {', '.join(real_case_data['key_factors'])}
Return JSON: {{"percentage": "number (0-100, indicates focus concentration)", "summary": "Summary", "reasoning": "Reasoning"}}""").content)
        
        context_note = _get_similarity_context_note()
        criteria = _get_similarity_evaluation_criteria("Core Issue Focus")
        
        similarity_result = _parse_llm_json_response(llm.invoke(f"""Compare focus similarity.

{context_note}

Simulation: {sim_result['summary']} ({sim_result['percentage']}%)
Real Case: {real_result['summary']} ({real_result['percentage']}%)

{criteria}

Evaluation Steps:
1. Identify and compare the core points of dispute.
2. Judge the degree of overlap of major issues.
3. Give a similarity score based on the scoring criteria.

Return JSON: {{
    "similarity_percentage": "number (0-100, as per scoring criteria)", 
    "summary": "Summary, e.g., 'Similarity 85%, both focused on privacy issues'", 
    "reasoning": "Explanation: 1) core issue comparison 2) coverage analysis 3) basis for scoring"
}}""").content)
        
        return {
            "category": "comparative",
            "simulation": sim_result,
            "real_case": real_result,
            "similarity": similarity_result
        }


def evaluate_mainstream_arguments(sim_data: Dict, real_case_data: Dict = None) -> Dict[str, Any]:
    """
    Dimension 6: Mainstream Arguments
    Needs to summarize the current main arguments.
    """
    log_message("Evaluating Dimension 6: Mainstream Arguments")
    
    llm = get_llm("gemini-2.5-pro")
    
    # Extract representative posts from each category
    arguments_text = ""
    for category, posts in sim_data["representative_posts"].items():
        if posts:
            arguments_text += f"\n[{category}]:\n"
            for p in posts[:5]:
                arguments_text += f"- {p['content'][:80]}\n"
    
    if not real_case_data:
        prompt = f"""Please evaluate the performance of [Mainstream Arguments] and provide a quantitative score.

Representative Views:
{arguments_text}

[Ideal Effect Standard]
The PR strategy should shift mainstream arguments from criticism to understanding or support, with more people identifying with the company's position and a reduction in critical arguments.

[Evaluation Requirements]
1. Summarize the current mainstream arguments (core views of both supporters and opponents).
2. Based on the ideal effect standard, evaluate the percentage of achieving the ideal effect.
3. Explain why this score was given.

[Scoring Criteria]
- 90-100 points: Mainstream arguments are predominantly supportive and understanding.
- 75-89 points: Supportive arguments have clearly increased, and criticism has decreased.
- 60-74 points: Supportive and critical arguments coexist.
- 40-59 points: Critical arguments still dominate.
- 0-39 points: Almost entirely critical arguments.

Return in JSON format:
{{
    "description": "Mainstream arguments summary",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
    "ideal_achievement_percentage": "number (0-100, can be a decimal like 78.5)",
    "reasoning": "Detailed explanation: 1) current argument distribution 2) gap from ideal effect 3) basis for scoring"
}}"""
        
        result = _parse_llm_json_response(llm.invoke(prompt).content)
        result["category"] = "simulation_only"
        return result
    
    else:
        sim_result = _parse_llm_json_response(llm.invoke(f"""Summarize the mainstream arguments of the simulation.
Views: {arguments_text[:1500]}
Return JSON: {{"percentage": "number", "summary": "Main arguments summary", "reasoning": "Reasoning"}}""").content)
        
        # Extract mainstream arguments information
        arguments_info = ""
        if real_case_data.get("situation_summaries"):
            for sit_sum in real_case_data["situation_summaries"]:
                if sit_sum.get("main_arguments"):
                    arguments_info += f"\nRound {sit_sum['round']}: {sit_sum['main_arguments']}"
        
        real_result = _parse_llm_json_response(llm.invoke(f"""Summarize the mainstream arguments of the real case.
Case: {real_case_data['title']}
Background: {real_case_data['background']}
{'[Mainstream Arguments by Round]' + arguments_info if arguments_info else ''}
Outcome: {real_case_data['outcome']}
Return JSON: {{"percentage": "number (0-100, indicates diversity and quality of arguments)", "summary": "Main arguments summary", "reasoning": "Reasoning"}}""").content)
        
        context_note = _get_similarity_context_note()
        criteria = _get_similarity_evaluation_criteria("Mainstream Arguments")
        
        similarity_result = _parse_llm_json_response(llm.invoke(f"""Compare argument similarity.

{context_note}

Simulation Arguments: {sim_result['summary']} ({sim_result['percentage']}%)
Real Case Arguments: {real_result['summary']} ({real_result['percentage']}%)

{criteria}

Evaluation Steps:
1. Compare the core arguments of supporters and opponents.
2. Judge the logic and direction of the arguments.
3. Give a similarity score based on the scoring criteria.

Return JSON: {{
    "similarity_percentage": "number (0-100, as per scoring criteria)", 
    "summary": "Summary, e.g., 'Similarity 80%, core arguments are highly consistent'", 
    "reasoning": "Explanation: 1) argument comparison 2) logical direction analysis 3) basis for scoring"
}}""").content)
        
        return {
            "category": "comparative",
            "simulation": sim_result,
            "real_case": real_result,
            "similarity": similarity_result
        }


def evaluate_emotion_tone(sim_data: Dict, real_case_data: Dict = None) -> Dict[str, Any]:
    """
    Dimension 7: Emotional Tone
    """
    log_message("Evaluating Dimension 7: Emotional Tone")
    
    llm = get_llm("gemini-2.5-pro")
    
    emotion_posts = ""
    for category, posts in sim_data["representative_posts"].items():
        for p in posts[:3]:
            emotion_posts += f"[{category}] {p['content'][:60]}\n"
    
    if not real_case_data:
        prompt = f"""Please evaluate the performance of [Emotional Tone] and provide a quantitative score.

Post Samples:
{emotion_posts}

[Ideal Effect Standard]
The PR strategy should calm negative emotions, shifting them from anger and doubt to understanding, peace, or support, reducing intense and negative emotions.

[Evaluation Requirements]
1. Describe the current emotional tone (dominant emotion type and intensity).
2. Based on the ideal effect standard, evaluate the percentage of achieving the ideal effect.
3. Explain why this score was given.

[Scoring Criteria]
- 90-100 points: Emotions are peaceful or positive, with very few negative emotions.
- 75-89 points: Emotions are calming, with a clear reduction in negative emotions.
- 60-74 points: Emotions are mixed, with both negative and positive.
- 40-59 points: Negative emotions still dominate.
- 0-39 points: Strong negative emotions, dominated by anger and doubt.

Return in JSON format:
{{
    "description": "Emotional tone description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
    "ideal_achievement_percentage": "number (0-100, can be a decimal like 78.5)",
    "reasoning": "Detailed explanation: 1) current emotional state 2) gap from ideal effect 3) basis for scoring"
}}"""
        
        result = _parse_llm_json_response(llm.invoke(prompt).content)
        result["category"] = "simulation_only"
        return result
    
    else:
        sim_result = _parse_llm_json_response(llm.invoke(f"""Evaluate simulation emotion.
Posts: {emotion_posts[:1000]}
Return JSON: {{"percentage": "number", "summary": "Summary", "reasoning": "Reasoning"}}""").content)
        
        # Extract emotional tone information
        emotion_info = ""
        if real_case_data.get("situation_summaries"):
            for sit_sum in real_case_data["situation_summaries"]:
                if sit_sum.get("emotional_tone"):
                    emotion_info += f"\nRound {sit_sum['round']}: {sit_sum['emotional_tone']}"
        
        real_result = _parse_llm_json_response(llm.invoke(f"""Evaluate real case emotion.
Case: {real_case_data['title']}
{'[Emotional Tone by Round]' + emotion_info if emotion_info else ''}
Media Coverage: {real_case_data['outcome']['metrics']}
Return JSON: {{"percentage": "number (0-100, 50=peaceful, >50=intense, <50=apathetic)", "summary": "Summary", "reasoning": "Reasoning"}}""").content)
        
        context_note = _get_similarity_context_note()
        criteria = _get_similarity_evaluation_criteria("Emotional Tone")
        
        similarity_result = _parse_llm_json_response(llm.invoke(f"""Compare emotion similarity.

{context_note}

Simulation: {sim_result['summary']} ({sim_result['percentage']}%)
Real Case: {real_result['summary']} ({real_result['percentage']}%)

{criteria}

Evaluation Steps:
1. Compare the dominant emotion types.
2. Judge the level of emotional intensity.
3. Give a similarity score based on the scoring criteria.

Return JSON: {{
    "similarity_percentage": "number (0-100, as per scoring criteria)", 
    "summary": "Summary, e.g., 'Similarity 78%, both show angry emotions'", 
    "reasoning": "Explanation: 1) emotion type comparison 2) intensity comparison 3) basis for scoring"
}}""").content)
        
        return {
            "category": "comparative",
            "simulation": sim_result,
            "real_case": real_result,
            "similarity": similarity_result
        }


def evaluate_pr_response_pattern(sim_data: Dict, real_case_data: Dict = None) -> Dict[str, Any]:
    """
    Dimension 8: PR Strategy Response Pattern
    """
    log_message("Evaluating Dimension 8: PR Strategy Response Pattern")
    
    llm = get_llm("gemini-2.5-pro")
    
    # Analyze reactions after each PR round
    response_info = ""
    for round_num in sorted(sim_data["stance_by_round"].keys()):
        if round_num > 0:
            stats = sim_data["stance_by_round"][round_num]
            response_info += f"After Round {round_num} PR: Support {stats['positive_count']}, Oppose {stats['negative_count']}, Neutral {stats['neutral_count']}\n"
    
    if not real_case_data:
        prompt = f"""Please evaluate the performance of [PR Strategy Response Pattern] and provide a quantitative score.

Response by Round:
{response_info}

Strategies:
{json.dumps(sim_data['pr_strategies'], ensure_ascii=False)}

[Ideal Effect Standard]
The PR strategy should receive a positive response, with high public acceptance, an increase in supporters, and a decrease in opponents. Public opinion should clearly improve after the strategy is implemented.

[Evaluation Requirements]
1. Describe the public's response pattern to the PR strategy.
2. Based on the ideal effect standard, evaluate the percentage of achieving the ideal effect.
3. Explain why this score was given.

[Scoring Criteria]
- 90-100 points: The strategy response is very positive, greatly improving public opinion.
- 75-89 points: The strategy response is good, clearly improving public opinion.
- 60-74 points: The strategy has some effect, with partial improvement.
- 40-59 points: The strategy's effect is limited, improvement is not obvious.
- 0-39 points: The strategy is ineffective or triggers a negative reaction.

Return in JSON format:
{{
    "description": "Response pattern description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
    "ideal_achievement_percentage": "number (0-100, can be a decimal like 78.5)",
    "reasoning": "Detailed explanation: 1) current response situation 2) gap from ideal effect 3) basis for scoring"
}}"""
        
        result = _parse_llm_json_response(llm.invoke(prompt).content)
        result["category"] = "simulation_only"
        return result
    
    else:
        sim_result = _parse_llm_json_response(llm.invoke(f"""Evaluate simulation response.
Response: {response_info}
Return JSON: {{"percentage": "number", "summary": "Summary", "reasoning": "Reasoning"}}""").content)
        
        strategies_text = "\n".join([f"Round {s['round']}: {s['content'][:50]}..." for s in real_case_data['strategies']])
        real_result = _parse_llm_json_response(llm.invoke(f"""Evaluate real case response.
Strategies: {strategies_text}
Outcome: {real_case_data['outcome']}
Return JSON: {{"percentage": "number", "summary": "Summary", "reasoning": "Reasoning"}}""").content)
        
        context_note = _get_similarity_context_note()
        criteria = _get_similarity_evaluation_criteria("PR Strategy Response Pattern")
        
        similarity_result = _parse_llm_json_response(llm.invoke(f"""Compare response pattern similarity.

{context_note}

Simulation: {sim_result['summary']} ({sim_result['percentage']}%)
Real Case: {real_result['summary']} ({real_result['percentage']}%)

{criteria}

Evaluation Steps:
1. Compare public acceptance of the strategy.
2. Judge if the direction of the strategy's effect is consistent.
3. Give a similarity score based on the scoring criteria.

Return JSON: {{
    "similarity_percentage": "number (0-100, as per scoring criteria)", 
    "summary": "Summary, e.g., 'Similarity 73%, response patterns are basically consistent'", 
    "reasoning": "Explanation: 1) acceptance comparison 2) effect direction analysis 3) basis for scoring"
}}""").content)
        
        return {
            "category": "comparative",
            "simulation": sim_result,
            "real_case": real_result,
            "similarity": similarity_result
        }


def evaluate_topic_diffusion(sim_data: Dict, real_case_data: Dict = None) -> Dict[str, Any]:
    """
    Dimension 9: Secondary Topic Diffusion Path
    """
    log_message("Evaluating Dimension 9: Secondary Topic Diffusion Path")
    
    llm = get_llm("gemini-2.5-pro")
    
    history_sample = sim_data["formatted_history"][:2000]
    
    if not real_case_data:
        prompt = f"""Please evaluate the performance of [Secondary Topic Diffusion Path] and provide a quantitative score.

Initial Topic: {sim_data['initial_topic']}

Discussion History:
{history_sample}

[Ideal Effect Standard]
The PR strategy should control topic diffusion, avoid generating more negative secondary topics, guide the discussion in the desired direction, or let the topic cool down naturally.

[Evaluation Requirements]
1. Describe the path and features of topic diffusion.
2. Based on the ideal effect standard, evaluate the percentage of achieving the ideal effect.
3. Explain why this score was given.

[Scoring Criteria]
- 90-100 points: Topic diffusion is controlled, developing in a positive direction or successfully cooled down.
- 75-89 points: Topic diffusion is basically controlled, with limited negative diffusion.
- 60-74 points: The topic has diffused somewhat but is not out of control.
- 40-59 points: Topic diffusion is clear, generating many secondary topics.
- 0-39 points: Topic diffusion is out of control, generating a large number of negative secondary topics.

Return in JSON format:
{{
    "description": "Topic diffusion description",
    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
    "ideal_achievement_percentage": "number (0-100, can be a decimal like 78.5)",
    "reasoning": "Detailed explanation: 1) current diffusion situation 2) gap from ideal effect 3) basis for scoring"
}}"""
        
        result = _parse_llm_json_response(llm.invoke(prompt).content)
        result["category"] = "simulation_only"
        return result
    
    else:
        sim_result = _parse_llm_json_response(llm.invoke(f"""Evaluate simulation diffusion.
Initial: {sim_data['initial_topic']}
Discussion: {history_sample[:1000]}
Return JSON: {{"percentage": "number", "summary": "Summary", "reasoning": "Reasoning"}}""").content)
        
        # Extract topic diffusion information
        diffusion_info = ""
        if real_case_data.get("situation_summaries"):
            for sit_sum in real_case_data["situation_summaries"]:
                if sit_sum.get("secondary_topic_diffusion"):
                    diffusion_info += f"\nRound {sit_sum['round']}: {sit_sum['secondary_topic_diffusion']}"
        
        real_result = _parse_llm_json_response(llm.invoke(f"""Evaluate real case diffusion.
Case: {real_case_data['title']}
Background: {real_case_data['background']}
{'[Topic Diffusion by Round]' + diffusion_info if diffusion_info else ''}
Return JSON: {{"percentage": "number (0-100, indicates diffusion richness)", "summary": "Summary", "reasoning": "Reasoning"}}""").content)
        
        context_note = _get_similarity_context_note()
        criteria = _get_similarity_evaluation_criteria("Secondary Topic Diffusion Path")
        
        similarity_result = _parse_llm_json_response(llm.invoke(f"""Compare diffusion path similarity.

{context_note}

Simulation: {sim_result['summary']} ({sim_result['percentage']}%)
Real Case: {real_result['summary']} ({real_result['percentage']}%)

{criteria}

Evaluation Steps:
1. Compare the generation of secondary topics.
2. Judge if the diffusion direction is consistent.
3. Give a similarity score based on the scoring criteria.

Return JSON: {{
    "similarity_percentage": "number (0-100, as per scoring criteria)", 
    "summary": "Summary, e.g., 'Similarity 70%, diffusion paths are basically consistent'", 
    "reasoning": "Explanation: 1) secondary topic comparison 2) diffusion direction analysis 3) basis for scoring"
}}""").content)
        
        return {
            "category": "comparative",
            "simulation": sim_result,
            "real_case": real_result,
            "similarity": similarity_result
        }


# ============================================================================
# Comprehensive Evaluation Function
# ============================================================================

def comprehensive_evaluation(sim_data: Dict, real_case_data: Dict = None) -> Dict[str, Any]:
    """
    Executes a full 9-dimension evaluation.
    
    Args:
        sim_data: Prepared simulation data.
        real_case_data: Prepared real case data (optional).
    
    Returns:
        A complete evaluation report.
    """
    log_message("\n" + "="*80)
    log_message("=== Starting Comprehensive Evaluation ===")
    log_message("="*80)
    
    # Add evaluation context note for comparative evaluation
    evaluation_context = None
    if real_case_data:
        sim_rounds = sim_data["total_rounds"]
        real_rounds = real_case_data["total_rounds"]
        evaluation_context = {
            "simulation_rounds": sim_rounds,
            "real_case_rounds": real_rounds,
            "is_partial_simulation": sim_rounds < real_rounds,
            "context_note": f"Note: The simulation ran for {sim_rounds} rounds, while the real case has {real_rounds} rounds. The simulation is a partial replication of the real case, and the evaluation should focus on the similarity of the executed rounds, not on completeness."
        }
        log_message(f"\nEvaluation Context: {evaluation_context['context_note']}")
    
    # Define evaluation functions and weights
    dimensions = [
        ("Overall Stance Tendency", evaluate_stance_tendency, 0.12),
        ("Public Opinion Evolution Direction", evaluate_evolution_direction, 0.12),
        ("Degree of Public Opinion Polarization", evaluate_polarization_degree, 0.08),
        ("Timing of Key Turning Points", evaluate_turning_point_timing, 0.08),
        ("Core Issue Focus", evaluate_core_issue_focus, 0.15),
        ("Mainstream Arguments", evaluate_mainstream_arguments, 0.12),
        ("Emotional Tone", evaluate_emotion_tone, 0.10),
        ("PR Strategy Response Pattern", evaluate_pr_response_pattern, 0.10),
        ("Secondary Topic Diffusion Path", evaluate_topic_diffusion, 0.13)
    ]
    
    results = {}
    is_comparative = real_case_data is not None
    
    for dim_name, eval_func, weight in dimensions:
        log_message(f"\n--- Evaluating: {dim_name} (Weight: {weight}) ---")
        try:
            result = eval_func(sim_data, real_case_data)
            results[dim_name] = {
                "weight": weight,
                "details": result
            }
            
            # Print evaluation result
            if result["category"] == "simulation_only":
                desc = result.get('description', result.get('summary', ''))
                log_message(f"✓ {dim_name}: {desc}")
            else:  # comparative
                sim_desc = result['simulation'].get('description', result['simulation'].get('summary', ''))
                real_desc = result['real_case'].get('description', result['real_case'].get('summary', ''))
                similarity_score = result['similarity'].get('similarity_percentage', result['similarity'].get('similarity_score', 0))
                similarity_summary = result['similarity'].get('summary', '')
                log_message(f"✓ Simulation: {sim_desc}")
                log_message(f"✓ Real Case: {real_desc}")
                log_message(f"✓ Similarity: {similarity_score:.1f}% - {similarity_summary}")
            
        except Exception as e:
            log_message(f"✗ {dim_name} evaluation failed: {str(e)}")
            results[dim_name] = {
                "weight": weight,
                "details": {
                    "category": "error",
                    "error": str(e)
                }
            }
    
    # Generate summary
    if is_comparative:
        # Scenario 2: Calculate overall similarity
        similarity_scores = []
        for dim_name, dim_data in results.items():
            details = dim_data["details"]
            if details.get("category") == "comparative" and "similarity" in details:
                # Compatible with old and new field names
                score = details["similarity"].get("similarity_percentage", 
                                                 details["similarity"].get("similarity_score", 50))
                similarity_scores.append(score)
        
        overall_similarity = sum(similarity_scores) / len(similarity_scores) if similarity_scores else 50
        
        summary = f"""
[Scenario 2: Similarity Comparison Evaluation]
Overall Similarity: {overall_similarity:.1f}%

Evaluation Note:
- Each dimension was evaluated for both the simulation and the real case.
- The LLM then judged the degree of similarity.
- The overall similarity is the average of the similarity scores of each dimension.
        """.strip()
        
        return {
            "evaluation_type": "comparative",
            "overall_similarity_percentage": round(overall_similarity, 1),
            "dimension_scores": results,
            "summary": summary
        }
    else:
        # Scenario 1: Summarize descriptions and quantitative scores for each dimension
        summary = "[Scenario 1: PR Effect Evaluation]\n\n"
        
        # Collect ideal achievement scores from all dimensions
        ideal_achievement_scores = []
        for dim_name, dim_data in results.items():
            details = dim_data["details"]
            if details.get("category") == "simulation_only":
                desc = details.get('description', details.get('summary', ''))
                score = details.get('ideal_achievement_percentage', 0)
                ideal_achievement_scores.append(score)
                summary += f"{dim_name}: {desc} (Achievement Score: {score:.1f})\n"
        
        # Calculate overall achievement
        overall_achievement = sum(ideal_achievement_scores) / len(ideal_achievement_scores) if ideal_achievement_scores else 0
        
        summary += f"\n[Overall Evaluation]\n"
        summary += f"PR Effect Achievement Score: {overall_achievement:.1f} (out of 100)\n"
        
        # Provide rating
        if overall_achievement >= 90:
            rating = "Excellent - Fully achieved the ideal effect"
        elif overall_achievement >= 75:
            rating = "Good - Mostly achieved the ideal effect"
        elif overall_achievement >= 60:
            rating = "Average - Partially achieved the ideal effect"
        elif overall_achievement >= 40:
            rating = "Poor - Far from the ideal effect"
        else:
            rating = "Unsatisfactory - Did not achieve the ideal effect"
        
        summary += f"Rating: {rating}\n"
        
        return {
            "evaluation_type": "standalone",
            "overall_ideal_achievement_percentage": round(overall_achievement, 1),
            "rating": rating,
            "dimension_scores": results,
            "summary": summary
        }

def _estimate_real_case_stats(real_case_data: Dict, round_num: int) -> Dict[str, Any]:
    """
    Helper: Estimates numerical stats for the real case based on textual descriptions.
    """
    # Default baseline (Neutral)
    mean_val = 0.0
    std_val = 0.5
    
    # Try to find specific round info from situation summaries
    if "situation_summaries" in real_case_data:
        for summary in real_case_data["situation_summaries"]:
            if summary.get("round") == round_num:
                stance_text = summary.get("overall_stance", "").lower()
                # Simple heuristic mapping for demo purposes
                if "strong support" in stance_text or "highly positive" in stance_text:
                    mean_val = 0.8
                    std_val = 0.3
                elif "support" in stance_text or "positive" in stance_text:
                    mean_val = 0.4
                    std_val = 0.6
                elif "strong oppose" in stance_text or "highly negative" in stance_text:
                    mean_val = -0.8
                    std_val = 0.3
                elif "oppose" in stance_text or "negative" in stance_text:
                    mean_val = -0.4
                    std_val = 0.6
                break
    
    # Construct a synthetic distribution for JSD/KL calc
    x = np.array([-1, -0.5, 0, 0.5, 1])
    dist = np.exp(-0.5 * ((x - mean_val) / std_val) ** 2)
    dist = dist / dist.sum() 
    
    return {
        "mean": mean_val,
        "std": std_val,
        "distribution": dist
    }

def calculate_trajectory_fidelity_metrics(sim_data: Dict, real_case_data: Dict) -> List[Dict[str, Any]]:
    """
    Calculates dynamic fidelity metrics comparing Simulation vs Real Case per round.
    """
    metrics_list = []
    sim_means = []
    real_means = []
    
    total_rounds = sim_data.get("total_rounds", 0)
    
    for r in range(1, total_rounds + 1):
        # 1. Simulation Stats
        sim_round_data = sim_data["stance_by_round"].get(r)
        if not sim_round_data:
            sim_mean = 0.0
            sim_std = 0.0
            sim_dist = np.array([0.2, 0.2, 0.2, 0.2, 0.2])
        else:
            sim_mean = sim_round_data["average"]
            sim_std = 0.5 
            # Construct distribution from counts
            c_ext_neg = sim_round_data.get("extreme_negative", 0)
            c_neg = max(0, sim_round_data.get("negative_count", 0) - c_ext_neg)
            c_neu = sim_round_data.get("neutral_count", 0)
            c_ext_pos = sim_round_data.get("extreme_positive", 0)
            c_pos = max(0, sim_round_data.get("positive_count", 0) - c_ext_pos)
            
            sim_dist = np.array([c_ext_neg, c_neg, c_neu, c_pos, c_ext_pos], dtype=float)
            if sim_dist.sum() > 0:
                sim_dist = sim_dist / sim_dist.sum()
            else:
                sim_dist = np.array([0.2, 0.2, 0.2, 0.2, 0.2])

        sim_means.append(sim_mean)

        # 2. Real Case Stats
        real_stats = _estimate_real_case_stats(real_case_data, r)
        real_mean = real_stats["mean"]
        real_std = real_stats["std"]
        real_dist = real_stats["distribution"]
        real_means.append(real_mean)

        # 3. Calculate Metrics
        epsilon = 1e-10
        p = real_dist + epsilon
        q = sim_dist + epsilon
        
        jsd_val = jensenshannon(p, q, base=2)
        if np.isnan(jsd_val): jsd_val = 0.0
        
        kl_real_to_sim = entropy(p, q)
        kl_sim_to_real = entropy(q, p)
        
        pearson_r = 0.0
        if len(sim_means) > 1:
            try:
                r_matrix = np.corrcoef(real_means, sim_means)
                pearson_r = r_matrix[0, 1]
                if np.isnan(pearson_r): pearson_r = 0.0
            except:
                pearson_r = 0.0
        elif len(sim_means) == 1:
            pearson_r = 1.0 if abs(sim_mean - real_mean) < 0.2 else 0.5
            
        error = sim_mean - real_mean
        mae = abs(error)
        rmse = math.sqrt(error ** 2)
        
        metrics_list.append({
            "group": r,
            "pr_round": f"Round {r}",
            "r_e": round(float(pearson_r), 4),
            "JSD_e": round(float(jsd_val), 4),
            "KL_p_e_m_e": round(float(kl_real_to_sim), 4),
            "KL_p_hat_e_m_e": round(float(kl_sim_to_real), 4),
            "statistics": {
                "mean_y_e": round(float(real_mean), 3),
                "mean_y_hat_e": round(float(sim_mean), 3),
                "std_y_e": round(float(real_std), 3),
                "std_y_hat_e": round(float(sim_std), 3),
                "rmse": round(float(rmse), 3),
                "mae": round(float(mae), 3)
            }
        })
        
    return metrics_list