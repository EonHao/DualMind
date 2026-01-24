import networkx as nx
import random
from agent import Agent
import persona_manager
from logger import log_message

def create_social_network(num_agents: int = 10, sim_id_prefix: str = "", llm_model: str = "gpt-4o-mini") -> (nx.Graph, dict):
    log_message("--- Creating multi-platform social network... ---")

    persona_library = persona_manager.get_persona_library()

    # Extract persona data
    available_personas = [p['data'] for p in persona_library]

    # Ensure the number of requested agents does not exceed the number of available personas
    if num_agents > len(available_personas):
        log_message(f"Warning: The requested number of agents ({num_agents}) exceeds the number of available personas ({len(available_personas)})")  
        log_message(f"Will use all available personas: {len(available_personas)}")  
        num_agents = len(available_personas)
    
    # Randomly select the specified number of personas
    selected_personas_data = random.sample(available_personas, num_agents)

    agents = {}
    for i, persona_data in enumerate(selected_personas_data):
        # Add sim_id_prefix to ensure a unique agent ID for each simulation
        agent_id = f"{sim_id_prefix}_agent_{i}" if sim_id_prefix else f"agent_{i}"
        agents[agent_id] = Agent(agent_id=agent_id, persona=persona_data, llm_model=llm_model)
        log_message(f"  Created Agent: {agent_id}, Username: {persona_data['username']}, Active Platform: {persona_data['primary_platform']}, Description: {persona_data['description']}")

    # G is now a directed graph, which can represent a one-way "follow" relationship
    G = nx.DiGraph() 
    G.add_nodes_from(agents.keys())

    # Establish basic "weak connections" (random follows)
    for u in G.nodes():
        # Each user randomly follows 1 to half of the other users
        num_following = random.randint(1, num_agents // 2)
        possible_targets = [v for v in G.nodes() if u != v]
        targets = random.sample(possible_targets, min(num_following, len(possible_targets)))
        for v in targets:
            G.add_edge(u, v)

    # "Strong connections" (mutual follows, simulating friends)
    for u in G.nodes():
        for v in G.nodes():
            if u != v and G.has_edge(u, v) and G.has_edge(v, u):
                # If u and v follow each other, mark their connection
                nx.set_edge_attributes(G, {(u, v): "mutual", (v, u): "mutual"}, name="tie_strength")

    log_message("--- Multi-layer network structure created successfully ---")
    return G, agents