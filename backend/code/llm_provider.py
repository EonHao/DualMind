from langchain_openai import ChatOpenAI
import config
import os
from logger import log_message

def get_llm(model_name="gpt-4o-mini", temperature=0.7):
    """
    Load configured LLM instances, supporting custom OpenAI-compatible endpoints.
    """
    
    # Unify the use of the OpenAI client
    base_url = config.CUSTOM_API_BASE
    log_message(f"--- Loading model: {model_name} ---")
    model_name = "deepseek-chat"
    return ChatOpenAI(
        model=model_name,
        temperature=temperature,
        base_url=base_url,  
        api_key=config.API_KEY,
    )