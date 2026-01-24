import os
from dotenv import load_dotenv
import time
import random
import networkx as nx
from network import create_social_network
from config import LLM_PROVIDER
from llm_provider import get_llm
from langchain.prompts import PromptTemplate
from logger import setup_logging, log_message

def get_personalized_feed(agent_id, agents, G, all_posts_last_round):
    """Calculate the visible posts for an agent in this round based on platform-specific rules."""
    if not all_posts_last_round:
        return []

    feed = []
    
    for author_id, content, _ in all_posts_last_round:
        if author_id == agent_id: continue # A post just made by the agent will not affect their own thinking

        author_persona = agents[author_id].persona
        author_platform = author_persona.get("primary_platform")
        
        is_visible = False
        
        # WeChat Moments-like: Visible only to "mutual friends" (strong connections)
        if author_platform == "WeChat Moments-like":
            edge_data = G.get_edge_data(agent_id, author_id)
            if edge_data and edge_data.get("tie_strength") == "mutual":
                is_visible = True
        
        # Weibo/Twitter-like: I follow them, or recommended by algorithm due to popularity
        elif author_platform == "Weibo/Twitter-like":
            if G.has_edge(agent_id, author_id): # I follow the author
                is_visible = True
            else: # Simulate algorithmic recommendation, higher influence increases the chance of being recommended to non-followers
                if random.random() < author_persona.get("influence_score", 50) / 300.0:
                    is_visible = True

        # TikTok-like: Purely algorithmic recommendation, weak social ties
        elif author_platform == "TikTok-like":
            # Simplified model: Higher influence makes it more likely to be seen
            if random.random() < author_persona.get("influence_score", 50) / 150.0:
                is_visible = True
        
        # Forum-like: Open to everyone in the simulation
        elif author_platform == "Forum-like":
            is_visible = True
            
        if is_visible:
            feed.append(f"{author_persona['username']}: {content}")
            
    log_message(f"--- Agent {agent_id} found {len(feed)} new posts in their feed ---")
    return feed


def summarize_discourse(discourse_history: list, agents: dict):
    """
    After the simulation is over, call the LLM to generate a public opinion summary report.
    """
    log_message("\n" + "="*25 + "\n=== Generating public opinion summary report... ===\n" + "="*25)

    llm = get_llm()
    
    formatted_history = ""
    for author_id, content, round_num in discourse_history:
        username = agents[author_id].persona['username'] if author_id != "system" else "System"
        formatted_history += f"[Round {round_num}] {username}: {content}\n"
        
    prompt = PromptTemplate.from_template(
        """You are a professional social media public opinion analyst. Below is the complete record of a simulated online discussion about "AI predicting the stock market".

        # Discussion Record:
        ---
        {history}
        ---

        # Your Task:
        Based on the complete discussion record above, please write a concise public opinion summary report. The report should include at least the following points:
        1.  **Core Topic**: What was the central topic of the discussion?
        2.  **Main Factions**: What were the main opinion groups that formed during the discussion (e.g., supporters, opponents, skeptics)? What were the core arguments of each faction?
        3.  **Key Opinion Leaders (KOLs)**: Which users (please specify usernames) played a key role in the discussion? How did they influence the direction of public opinion?
        4.  **Evolution of Opinion**: How did the overall sentiment or mainstream opinion of the discussion change over time (rounds)?
        5.  **Final Consensus or Disagreement**: At the end of the discussion, was a general consensus reached? If not, what were the main points of disagreement?

        Please write this report in a professional, analytical tone."""
    )
    
    summarizer_chain = prompt | llm
    
    summary_report = summarizer_chain.invoke({
        "history": formatted_history
    }).content
    
    return summary_report

# num_rounds is the number of rounds, can be adjusted for testing
def run_simulation(num_rounds: int = 2, participation_prob: float = 0.8, rejoining_prob: float = 0.1):
    """
    Run the public opinion simulation.
    
    Args:
        num_rounds: Number of simulation rounds
        participation_prob: Participation probability
        rejoining_prob: Probability of rejoining
        persona_csv_path: Path to the persona CSV file
    """
    logger = setup_logging()
    with logger:
        load_dotenv()

        G, agents = create_social_network(10)

        initial_post = f"【Initial Topic by System】: A little-known startup has released a product that claims to perfectly predict stock market trends for the next week!"
        global_discourse = [("system", initial_post, 0)]
    
        active_agent_ids = set(agents.keys())
        inactive_agent_ids = set()

        log_message("\n" + "="*25 + "\n=== Public Opinion Simulation Start ===\n" + "="*25)

        for i in range(num_rounds):
            current_round = i + 1
        
            newly_active = {agent_id for agent_id in inactive_agent_ids if random.random() < rejoining_prob}
            if newly_active:
                active_agent_ids.update(newly_active)
                inactive_agent_ids -= newly_active
                for agent_id in newly_active:
                    log_message(f"--- Observer {agents[agent_id].persona['username']} ({agent_id}) has regained interest and joined the discussion! ---")

            log_message(f"\n\n--- Round {current_round} | Active Agents: {len(active_agent_ids)} ---")
            if not active_agent_ids: 
                log_message("All agents have left the discussion. Simulation ending early.")
                break

            last_round_posts = [post for post in global_discourse if post[2] == current_round - 1]
            if not last_round_posts and current_round > 1:
                log_message("No new posts in the last round. Public opinion has settled. Simulation ending early.")
                break
        
            initial_messages = [post[1] for post in global_discourse if post[2] == 0]

            new_posts_this_round = []
            agents_to_make_inactive = set()
            action_order = list(active_agent_ids)
            random.shuffle(action_order)
        
            for agent_id in action_order:
                if random.random() > participation_prob:
                    continue

                agent = agents[agent_id]
                agent_graph = agent.get_graph()

                if current_round == 1:
                    # In the first round, everyone sees the initial topic
                    visible_messages_for_agent = initial_messages
                else:
                    visible_messages_for_agent = get_personalized_feed(agent_id, agents, G, last_round_posts)

                if not visible_messages_for_agent:
                    log_message(f"--- {agents[agent_id].persona['username']} ({agent_id}) saw no new messages this round and remains silent. ---")
                    continue

                state = {"recent_messages": visible_messages_for_agent, "agent_persona": agent.persona}
                final_state = agent_graph.invoke(state)
                cognitive_result = final_state.get('response')
                action = cognitive_result.final_action if cognitive_result else None

                if action and action.action == "POST" and action.content:
                    new_posts_this_round.append((agent_id, action.content, current_round))
                
                elif action and action.action == "DROPOUT":
                    agents_to_make_inactive.add(agent_id)
                    log_message(f"--- {agent.persona['username']} ({agent_id}) has lost interest and permanently left the discussion. ---") 

                time.sleep(1)
        
            if agents_to_make_inactive:
                active_agent_ids -= agents_to_make_inactive
                inactive_agent_ids.update(agents_to_make_inactive)
            
            if new_posts_this_round:
                global_discourse.extend(new_posts_this_round)
                log_message(f"\n--- Round {current_round} ended, with {len(new_posts_this_round)} new posts. ---")
            else:
                log_message(f"\n--- Round {current_round} ended, with no new posts. ---")

        log_message("\n" + "="*25 + f"\n=== Simulation End ===\n" + "="*25)

        log_message("\nFinal state of the discourse:")
        for author, content, round_num in global_discourse:
            username = agents[author].persona['username'] if author != "system" else "System"
            log_message(f"[Round {round_num}] {username}: {content}")
        
        final_report = summarize_discourse(global_discourse, agents)
        log_message("\n\n" + "#"*25 + "\n### Final Public Opinion Analysis Report ###\n" + "#"*25)
        log_message(final_report)
if __name__ == "__main__":
    run_simulation()
