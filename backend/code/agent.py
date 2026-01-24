import chromadb
import uuid
import json
from typing import TypedDict, List, Dict

from pydantic import BaseModel, Field
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate
from langgraph.graph import StateGraph, END
from llm_provider import get_llm
from logger import log_message

class AgentAction(BaseModel):
    action: str = Field(description="Your action decision, must be one of 'POST', 'NO_ACTION', or 'DROPOUT'")
    content: str = Field(description="If the action is 'POST', this is the content of the post you want to publish. Otherwise, it's empty.")

class CognitiveStep(BaseModel):
    internal_monologue: str = Field(description="My latest, most authentic internal associations and thought process at this moment, based on the information I've just seen and my memories.")
    cognitive_summary: str = Field(description="Based on the information I saw and my recent associations, what is my 'one-sentence core view' or 'first-reaction thought' at this moment. Must be extremely brief.")
    final_action: AgentAction = Field(description="Based on the above thinking, the final action I have decided to take.")
    stance_score: int = Field(description="An objective score of my current stance on the topic, ranging from -3 (Strongly Oppose) to 3 (Strongly Support).")
    
class AgentState(TypedDict):
    recent_messages: List[str]
    agent_persona: Dict
    response: CognitiveStep

class Agent:
    def __init__(self, agent_id: str, persona: dict, llm_model: str = "deepseek-chat"):
        self.id = agent_id
        self.persona = persona
        self.llm = get_llm(model_name=llm_model)
        self.llm_model_name = llm_model  # Save the model name
        client = chromadb.Client()
        self.memory = client.get_or_create_collection(name=f"agent_memory_{self.id}")
        self.last_cognitive_summary = ""

    def update_memory(self, content: str):
        self.memory.add(documents=[content], ids=[str(uuid.uuid4())])

    def _retrieve_raw_memory_docs(self, query: str, n_results: int = 3) -> List[str]:
        doc_count = self.memory.count()
        if doc_count == 0:
            return []
        effective_n_results = min(n_results, doc_count)
        results = self.memory.query(query_texts=[query], n_results=effective_n_results)
        return results['documents'][0] if results.get('documents') else []

    def _create_graph(self):
        
        def unified_cognitive_node(state: AgentState) -> dict:
            log_message(f"--- Agent {self.id} ({self.persona['username']}) is thinking ---")

            log_message(f"   [Using LLM]: {self.llm_model_name}")
            
            raw_memories = self._retrieve_raw_memory_docs("\n".join(state['recent_messages']))
            
            parser = PydanticOutputParser(pydantic_object=CognitiveStep)

            template = """You are deep-playing a social network user. You need to think and respond like a real person.

            # 1. Your Role Setting:
            {persona}

            # 2. These fragments flashed back in your long-term memory:
            {memories}
            
            # 3. Your current opinion on this topic is (empty if this is the first round of thinking):
            {current_stance}

            # 4. This is the LATEST information from the public discourse:
            
            **[IMPORTANT] Information Type Description:**
            - `[Initial Topic]`: The initial news event or topic
            - `[Official PR Statement]`: An official public relations statement/response (from the company or organization involved)
            - Others (e.g., "username: content"): Comments from regular netizens
            
            {recent_messages}

            # === Your Task ===
            Please complete the entire thinking and decision-making process in one step and output in JSON format. Please output in English.

            **A. internal_monologue (Internal Associations)**:
            - **[Core Directive]**: Synthesize ALL your known information (role, long-term memory, existing views, latest information) to generate a natural, coherent internal monologue.
            - **[IMPORTANT]**: Differentiate between official statements and netizen comments. Official statements are usually more formal and authoritative but may also trigger your skepticism; netizen comments represent public opinion.
            - Your thinking should naturally extend or revise your previous views, not just bluntly compare "last round" and "this round". Let the evolution of your thoughts be embedded in your text.
            - **[Fact Anchor]**: Your associations MUST be based on real-world events your character might know. **[STRICTLY PROHIBITED]**: Absolutely no fabrication!

            **B. cognitive_summary (Cognitive Summary)**:
            - Based on the internal monologue above, summarize your LATEST core view in one sentence.

            **C. final_action (Final Action)**:
            - **[Interest Judgment]**: Determine if the current topic is still relevant to the "interests" in your persona. If the discussion has become very boring or has completely strayed from your field, you should choose 'DROPOUT' to permanently exit the discussion.
            - **[Style]**: Your post must match your persona and emotional style, and can be very aggressive. **[PROHIBITED]**: Absolutely do not start sentences with "As a...".
            - **[Decision]**: Make a decision of 'POST', 'NO_ACTION', or 'DROPOUT'.
            - **[Platform Style]**: Your post must fully conform to the style and format of your primary active platform ({platform}).
                - 'Weibo/Twitter-like': Short and punchy, can include #hashtags#, with a clear viewpoint.
                - 'WeChat Moments-like': Tone is more personal and life-oriented, like sharing with friends.
                - 'TikTok-like': Content should be like a script or title for a short video, creative and engaging, with plenty of emojis.
                - 'Forum-like': Content can be longer, with more rigorous logic, suitable for in-depth discussion.

            **D. stance_score (Objective Stance Score)**:
            - **[Detach from Role]**: After completing the above thinking, briefly detach from your role-playing and act as a neutral AI analysis program.
            - **[Objective Scoring]**: Based on the internal monologue and cognitive summary you just generated, give a quantitative score for your current attitude towards the [Initial Topic]. The scoring standard is as follows:
              - 3: Strongly support or extremely optimistic
              - 2: Support or optimistic
              - 1: Slightly support or slightly optimistic
              - 0: Completely neutral or indifferent
              - -1: Slightly oppose or slightly pessimistic
              - -2: Oppose or pessimistic
              - -3: Strongly oppose or extremely pessimistic
            - Your score must be an integer.

            {format_instructions}"""
            
            persona_data = state['agent_persona']
            platform = persona_data.get("primary_platform", "Weibo/Twitter-like")

            prompt_template = PromptTemplate(
                template=template,
                input_variables=["persona", "memory", "recent_messages", "platform"],
                partial_variables={"format_instructions": parser.get_format_instructions()}
            )

            chain = prompt_template | self.llm | parser
            
            # Add a retry mechanism to handle LLM parsing failures
            max_retries = 3
            cognitive_result = None
            
            for attempt in range(max_retries):
                try:
                    cognitive_result = chain.invoke({
                        "persona": json.dumps(persona_data, ensure_ascii=False),
                        "memories": "\n- ".join(raw_memories) if raw_memories else "(No relevant long-term memories)",
                        "recent_messages": "\n".join(state['recent_messages']),
                        "current_stance": self.last_cognitive_summary if self.last_cognitive_summary else "(This is my initial view)",
                        "platform": platform
                    })
                    
                    # Check if the result is valid
                    if cognitive_result is None:
                        raise ValueError("LLM returned null response")
                    
                    # Validate necessary fields
                    if not hasattr(cognitive_result, 'internal_monologue') or not hasattr(cognitive_result, 'final_action'):
                        raise ValueError("LLM response missing required fields")
                    
                    break  # Success, exit the retry loop
                    
                except Exception as e:
                    log_message(f"   [LLM Parsing Failed] Attempt {attempt + 1}/{max_retries}: {str(e)}")
                    
                    if attempt == max_retries - 1:
                        # Last attempt failed, use a default response
                        log_message(f"   [LLM Parsing Failed] All retries failed, using default response")
                        from pydantic import ValidationError
                        
                        # Create a default CognitiveStep
                        cognitive_result = CognitiveStep(
                            internal_monologue="Due to a technical issue, I couldn't complete my normal thought process.",
                            cognitive_summary="Unable to form a clear opinion at the moment.",
                            final_action=AgentAction(action="NO_ACTION", content=""),
                            stance_score=0
                        )
                        break
                    else:
                        # Wait for one second before retrying
                        import time
                        time.sleep(1)

            log_message(f"   [Memory Association]: {cognitive_result.internal_monologue}")
            log_message(f"   [Cognitive Summary]: {cognitive_result.cognitive_summary}")
            log_message(f"   [Objective Stance Score]: {cognitive_result.stance_score}")
            
            self.update_memory(cognitive_result.cognitive_summary)
            self.last_cognitive_summary = cognitive_result.cognitive_summary
            
            final_action = cognitive_result.final_action

            if final_action.action == 'POST':
                log_message(f"   [Decision]: {final_action.action}, Content: '{final_action.content}'")
                self.update_memory(f"I made a new post about this: '{final_action.content}'")
            else:
                log_message(f"   [Decision]: {final_action.action}")

            return {"response": cognitive_result}

        graph = StateGraph(AgentState)
        graph.add_node("think_and_decide", unified_cognitive_node)
        graph.set_entry_point("think_and_decide")
        graph.add_edge("think_and_decide", END)
        return graph.compile()
    
    def get_graph(self):
        if not hasattr(self, '_graph'):
            self._graph = self._create_graph()
        return self._graph