import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from llm_provider import get_llm
from logger import log_message

# Use a simple dictionary to simulate session storage
# key: sessionId, value: session_data
# In a production environment, this should be replaced with Redis or a database
_chat_sessions: Dict[str, Dict[str, Any]] = {}

# System Prompt for the PR assistant
SYSTEM_PROMPT = """You are a world-class public relations strategy expert. Your mission is to help users analyze public relations incidents and develop professional, effective, and forward-looking PR strategies.
Please communicate with users in a guiding and advisory tone. At the beginning of the conversation, please greet the user and guide them to describe the current PR problem they are facing."""

def create_new_chat_session() -> Dict[str, Any]:
    """
    Creates a new chat session.
    """
    session_id = f"chat_session_{uuid.uuid4()}"
    log_message(f"Creating a new chat session: {session_id}")
    
    # 1. Get LLM instance
    llm = get_llm()
    
    # 2. Create initial message list, including the System Prompt
    message_history = [SystemMessage(content=SYSTEM_PROMPT)]
    
    # 3. Call LLM to get the first welcome message
    initial_response = llm.invoke(message_history)
    welcome_content = initial_response.content
    log_message(f"LLM response received: {welcome_content[:50]}...")
    
    # 4. Add the AI's first message to the history
    welcome_message = {
        "id": f"msg_{uuid.uuid4()}",
        "type": "llm",
        "content": welcome_content,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    message_history.append(AIMessage(content=welcome_content))
    
    # 5. Store the session in memory
    _chat_sessions[session_id] = {
        "created_at": datetime.now(timezone.utc),
        "message_history_langchain": message_history, # For interacting with LLM
        "message_history_api": [welcome_message] # For API returns
    }
    
    log_message(f"Session {session_id} created successfully.")
    
    return {
        "sessionId": session_id,
        "content": welcome_message["content"],
        "timestamp": welcome_message["timestamp"]
    }

def add_message_to_session(session_id: str, user_message: str) -> Dict[str, Any]:
    """
    Adds a user message to an existing session and gets a response from the LLM.
    """
    if session_id not in _chat_sessions:
        raise ValueError("Session ID does not exist")
        
    log_message(f"Session {session_id} received new message: '{user_message[:50]}...'")
    session = _chat_sessions[session_id]
    
    # 1. Add user message to history
    session["message_history_langchain"].append(HumanMessage(content=user_message))
    session["message_history_api"].append({
        "id": f"msg_{uuid.uuid4()}",
        "type": "user",
        "content": user_message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # 2. Call LLM to get a response
    llm = get_llm()
    ai_response = llm.invoke(session["message_history_langchain"])
    response_content = ai_response.content
    log_message(f"LLM response received: {response_content[:50]}...")
    
    # 3. Add LLM's response to history
    response_message = {
        "id": f"msg_{uuid.uuid4()}",
        "type": "llm",
        "content": response_content,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    session["message_history_langchain"].append(AIMessage(content=response_content))
    session["message_history_api"].append(response_message)
    
    log_message(f"Session {session_id} LLM response: '{response_message['content'][:50]}...'")
    
    return response_message

def get_session_history(session_id: str) -> Dict[str, Any]:
    """
    Gets the chat history for a specified session.
    """
    if session_id not in _chat_sessions:
        raise ValueError("Session ID does not exist")
    
    log_message(f"Fetching history for session {session_id}.")
    session = _chat_sessions[session_id]
    
    return {
        "sessionId": session_id,
        "messages": session["message_history_api"]
    }
