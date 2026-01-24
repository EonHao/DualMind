import csv
import os
from typing import List, Dict
from pathlib import Path
from logger import log_message

current_file = Path(__file__).resolve()
file_path = current_file.parent.parent / 'data' / 'personas.csv'

def load_personas_from_csv(csv_file_path: str = file_path) -> List[Dict]:
    """
    Loads persona information from a CSV file.
    
    Args:
        csv_file_path: Path to the CSV file.
        
    Returns:
        List[Dict]: A list of persona information, compatible with the original PERSONA_LIBRARY format.
    """
    personas = []
    
    if not os.path.exists(csv_file_path):
        raise FileNotFoundError(f"Persona CSV file not found: {csv_file_path}")
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Convert data types
            persona_data = {
                "username": row["username"],
                "description": row["description"],
                "emotional_style": row["emotional_style"],
                "influence_score": int(row["influence_score"]),
                "primary_platform": row["primary_platform"],
            }
            
            personas.append({"data": persona_data})
    
    log_message(f"Successfully loaded {len(personas)} personas from {csv_file_path}") 
    return personas

    # Load data from the CSV file into PERSONA_LIBRARY
try:
    PERSONA_LIBRARY = load_personas_from_csv()
except FileNotFoundError as e:
    log_message(f"Warning: {e}")  
    log_message("Will use the default hardcoded persona library.")  
    
    # Fallback hardcoded data (to prevent the program from crashing if the CSV file does not exist)
    PERSONA_LIBRARY = [
        {"data": {
            "username": "Default_Agent", 
            "description": "Default Persona", 
            "emotional_style": "Neutral", 
            "influence_score": 50,
            "primary_platform": "Weibo/Twitter-like",
        }}
    ]

def get_persona_library() -> List[Dict]:
    """
    Public interface function to get the persona library.
    """
    return PERSONA_LIBRARY

def get_persona_by_username(username: str) -> Dict:
    """
    Gets a specific persona by username.
    
    Args:
        username: The username.
        
    Returns:
        Dict: Persona data, or None if not found.
    """
    for persona in PERSONA_LIBRARY:
        if persona["data"]["username"] == username:
            return persona["data"]
    return None

def add_persona_to_csv(persona_data: Dict, csv_file_path: str = "personas.csv"):
    """
    Adds a new persona to the CSV file.
    
    Args:
        persona_data: A dictionary containing the persona data.
        csv_file_path: Path to the CSV file.
    """
    file_exists = os.path.exists(csv_file_path)
    
    with open(csv_file_path, 'a', encoding='utf-8', newline='') as file:
        fieldnames = ["username", "description", "emotional_style", "influence_score", 
                     "primary_platform"]
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        
        if not file_exists:
            writer.writeheader()
        
        writer.writerow({
            "username": persona_data["username"],
            "description": persona_data["description"],
            "emotional_style": persona_data["emotional_style"],
            "influence_score": persona_data["influence_score"],
            "primary_platform": persona_data["primary_platform"],
        })
    
    log_message(f"Successfully added persona '{persona_data['username']}' to {csv_file_path}")  

def list_personas():
    """Lists all personas."""
    for i, persona in enumerate(PERSONA_LIBRARY, 1):
        data = persona['data']
        log_message(f"{i}. {data['username']} - {data['description']} ({data['primary_platform']})")

