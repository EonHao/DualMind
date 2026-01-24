from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any
import uvicorn

import chat_manager
import case_manager
import simulation_manager
from logger import log_message

# Initialize FastAPI application
app = FastAPI(
    title="DualMind Multi-Agent Simulation API",
    description="API for cognitive-affective cascade modeling in public opinion dissemination via multi-agent simulation.",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow the frontend development server's origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all request headers
)

# --- Pydantic Models for Request/Response Validation ---

class ChatMessageRequest(BaseModel):
    sessionId: str
    message: str

class SimulationConfigRequest(BaseModel):
    agents: int = 10
    num_rounds: int = 1 
    interactionProbability: float = 0.5
    positiveResponseProbability: float = 0.3
    negativeResponseProbability: float = 0.3
    neutralResponseProbability: float = 0.4
    initialPositiveSentiment: float = 0.2
    initialNegativeSentiment: float = 0.6
    initialNeutralSentiment: float = 0.2

class StartScenario2Request(BaseModel):
    caseId: str
    llmModel: str
    simulationConfig: SimulationConfigRequest

# Scenario 1 Request Model
class StartScenario1Request(BaseModel):
    initialTopic: str  # User-input initial topic
    llmModel: str
    simulationConfig: SimulationConfigRequest
    prStrategy: str = ""  # Optional first-round PR strategy

class AddPRStrategyRequest(BaseModel):
    prStrategy: str = ""  # Optional PR strategy content

class GenerateReportRequest(BaseModel):
    simulationId: str
    reportType: str = "comprehensive"  # "summary" or "comprehensive"
    includeVisualizations: bool = False

class ApiResponse(BaseModel):
    success: bool
    data: Any | None = None
    error: dict | None = None

# --- API Endpoints for 1.1 LLM Strategy Refinement ---

@app.get("/api/scenario1/chat/init", response_model=ApiResponse, tags=["Scenario 1 - Chat"])
def init_chat_session():
    """
    1.1.1 Initialize LLM chat session
    """
    try:
        session_data = chat_manager.create_new_chat_session()
        return ApiResponse(success=True, data=session_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scenario1/chat/message", response_model=ApiResponse, tags=["Scenario 1 - Chat"])
def post_chat_message(request: ChatMessageRequest):
    """
    1.1.2 Send a chat message
    """
    try:
        response_data = chat_manager.add_message_to_session(
            session_id=request.sessionId,
            user_message=request.message
        )
        return ApiResponse(success=True, data=response_data)
    except ValueError as e:
        error_payload = {"code": "SESSION_NOT_FOUND", "message": str(e)}
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": error_payload}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scenario1/chat/{session_id}/history", response_model=ApiResponse, tags=["Scenario 1 - Chat"])
def get_chat_history(session_id: str):
    """
    1.1.3 Get chat history
    """
    try:
        history_data = chat_manager.get_session_history(session_id)
        return ApiResponse(success=True, data=history_data)
    except ValueError as e:
        error_payload = {"code": "SESSION_NOT_FOUND", "message": str(e)}
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": error_payload}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- API Endpoints for 1.2 Scenario 1 Simulation ---

@app.post("/api/scenario1/simulation/start", response_model=ApiResponse, tags=["Scenario 1 - Simulation"])
def start_scenario1_sim(request: StartScenario1Request):
    """
    1.2.1 Start Scenario 1 simulation (supports user-input initial topic and first-round PR strategy)
    """
    try:
        sim_data = simulation_manager.start_scenario1_simulation(
            initial_topic=request.initialTopic,  # Receive user-input topic
            llm_model=request.llmModel,
            simulation_config=request.simulationConfig.model_dump(),
            pr_strategy=request.prStrategy  # Receive first-round PR strategy
        )
        return ApiResponse(success=True, data=sim_data)
    except Exception as e:
        # Add detailed error logging
        import traceback
        print(f"Error starting simulation: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scenario1/simulation/{simulation_id}/add-strategy", response_model=ApiResponse, tags=["Scenario 1 - Simulation"])
def add_pr_strategy(simulation_id: str, request: AddPRStrategyRequest):
    """
    1.2.2 Add a PR strategy and execute one round of simulation.
    Supports multiple PR strategy inputs for a single topic.
    """
    try:
        result_data = simulation_manager.add_pr_strategy_and_simulate(
            simulation_id=simulation_id,
            pr_strategy=request.prStrategy
        )
        return ApiResponse(success=True, data=result_data)
    except ValueError as e:
        error_payload = {"code": "SIMULATION_ERROR", "message": str(e)}
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": error_payload}
        )
    except Exception as e:
        # Add detailed error logging
        import traceback
        print(f"Error adding strategy: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scenario1/simulation/{simulation_id}/status", response_model=ApiResponse, tags=["Scenario 1 - Simulation"])
def get_scenario1_status(simulation_id: str):
    """
    1.2.2 Get simulation status
    """
    try:
        # Simply return the current status
        if simulation_id not in simulation_manager._simulations:
            raise ValueError(f"Simulation ID '{simulation_id}' does not exist.")
        
        sim = simulation_manager._simulations[simulation_id]
        status_data = {
            "simulationId": simulation_id,
            "status": sim["status"],
            "currentRound": sim.get("currentRound", 0),
            "activeAgents": len(sim.get("activeAgents", [])),
            "totalPosts": len([p for p in sim.get("discourseHistory", []) if p[0] != "system"])
        }
        return ApiResponse(success=True, data=status_data)
    except ValueError as e:
        error_payload = {"code": "SIMULATION_NOT_FOUND", "message": str(e)}
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": error_payload}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scenario1/simulation/{simulation_id}/result", response_model=ApiResponse, tags=["Scenario 1 - Simulation"])
def get_scenario1_result(simulation_id: str):
    """
    1.2.3 Get simulation results (including detailed agent info, stance scores, decisions, and comments)
    """
    try:
        result_data = simulation_manager.get_scenario1_result(simulation_id)
        return ApiResponse(success=True, data=result_data)
    except ValueError as e:
        error_payload = {"code": "SIMULATION_NOT_FOUND", "message": str(e)}
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": error_payload}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scenario1/simulation/{simulation_id}/stop", response_model=ApiResponse, tags=["Scenario 1 - Simulation"])
def stop_scenario1_sim(simulation_id: str):
    """
    Manually stop Scenario 1 simulation.
    Called when the user decides not to add any more PR strategies.
    """
    try:
        result = simulation_manager.stop_scenario1_simulation(simulation_id)
        return ApiResponse(success=True, data=result)
    except ValueError as e:
        error_payload = {"code": "SIMULATION_ERROR", "message": str(e)}
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": error_payload}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scenario1/reports/generate", response_model=ApiResponse, tags=["Scenario 1 - Reports"])
def generate_scenario1_report(request: GenerateReportRequest):
    """
    Generate Scenario 1 public opinion analysis report
    """
    try:
        report_data = simulation_manager.generate_scenario1_report(
            simulation_id=request.simulationId,
            report_type=request.reportType
        )
        return ApiResponse(success=True, data=report_data)
    except ValueError as e:
        error_payload = {"code": "SIMULATION_NOT_FOUND", "message": str(e)}
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": error_payload}
        )
    except Exception as e:
        import traceback
        print(f"Error generating report: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# --- General Endpoints ---

@app.post("/api/simulation/{simulation_id}/reset", response_model=ApiResponse, tags=["General"])
def reset_simulation(simulation_id: str):
    """
    Reset simulation (general endpoint)
    """
    try:
        # Reset logic can be added here, e.g., clearing simulation data
        # Currently just returns a success response
        log_message(f"Simulation {simulation_id} reset requested")
        return ApiResponse(
            success=True, 
            data={
                "simulationId": simulation_id,
                "status": "reset",
                "message": "Simulation has been reset successfully"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- [NEW] API Endpoints for 2. Scenario 2 ---

@app.get("/api/scenario2/cases", response_model=ApiResponse, tags=["Scenario 2 - Cases & Simulation"])
def get_historical_cases():
    """
    2.1.1 Get list of historical cases
    """
    try:
        cases = case_manager.get_all_cases()
        return ApiResponse(success=True, data=cases)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scenario2/cases/{case_id}", response_model=ApiResponse, tags=["Scenario 2 - Cases & Simulation"])
def get_case_details(case_id: str):
    """
    2.1.2 Get case details
    """
    try:
        case = case_manager.get_case_by_id(case_id)
        if case:
            return ApiResponse(success=True, data=case)
        else:
            error_payload = {"code": "CASE_NOT_FOUND", "message": f"Case with ID '{case_id}' not found."}
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": error_payload}
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scenario2/simulation/start", response_model=ApiResponse, tags=["Scenario 2 - Cases & Simulation"])
def start_scenario2_sim(request: StartScenario2Request):
    """
    2.2.1 Start Scenario 2 simulation
    """
    try:
        sim_data = simulation_manager.start_scenario2_simulation(
            case_id=request.caseId,
            llm_model=request.llmModel,
            simulation_config=request.simulationConfig.model_dump()  
        )
        return ApiResponse(success=True, data=sim_data)
    except ValueError as e:
        error_payload = {"code": "CASE_NOT_FOUND", "message": str(e)}
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": error_payload}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scenario2/simulation/{simulation_id}/add-strategy", response_model=ApiResponse, tags=["Scenario 2 - Cases & Simulation"])
def add_scenario2_strategy(simulation_id: str):
    """
    2.2.2 继续下一轮模拟
    """
    try:
        round_data = simulation_manager.advance_to_next_round(simulation_id)
        return ApiResponse(success=True, data=round_data)
    except ValueError as e:
        error_payload = {"code": "SIMULATION_ERROR", "message": str(e)}
        return JSONResponse(
            status_code=400, # Bad Request, e.g., sim not found or already finished
            content={"success": False, "error": error_payload}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scenario2/simulation/{simulation_id}/status", response_model=ApiResponse, tags=["Scenario 2 - Cases & Simulation"])
def get_scenario2_status(simulation_id: str):
    """
    2.2.2 Get Scenario 2 simulation status
    Uses the Scenario 1 status system directly.
    """
    try:
        # Directly call the Scenario 1 status query function
        status_response = get_scenario1_status(simulation_id)
        
        # Add case ID information
        if simulation_id in simulation_manager._simulations:
            case_id = simulation_manager._simulations[simulation_id].get("caseId", "")
            if status_response.success and status_response.data:
                status_response.data["caseId"] = case_id
        
        return status_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scenario2/simulation/{simulation_id}/result", response_model=ApiResponse, tags=["Scenario 2 - Cases & Simulation"])
def get_scenario2_sim_result(simulation_id: str):
    """
    2.2.3 Get Scenario 2 simulation results
    Uses the Scenario 1 result system directly.
    """
    try:
        # Directly call the Scenario 1 result retrieval function
        result_response = get_scenario1_result(simulation_id)
        
        # Add case ID information
        if simulation_id in simulation_manager._simulations:
            case_id = simulation_manager._simulations[simulation_id].get("caseId", "")
            if result_response.success and result_response.data:
                result_response.data["caseId"] = case_id
        
        return result_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scenario2/reports/generate", response_model=ApiResponse, tags=["Scenario 2 - Reports"])
def generate_scenario2_report(request: GenerateReportRequest):
    """
    Generate Scenario 2 comparative analysis report (simulation vs. real case)
    """
    try:
        report_data = simulation_manager.generate_scenario2_report(
            simulation_id=request.simulationId,
            report_type=request.reportType
        )
        return ApiResponse(success=True, data=report_data)
    except ValueError as e:
        error_payload = {"code": "SIMULATION_NOT_FOUND", "message": str(e)}
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": error_payload}
        )
    except Exception as e:
        import traceback
        print(f"Error generating scenario2 report: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Start the API server
    # Port 8000 is required by the documentation
    uvicorn.run(app, host="127.0.0.1", port=8000)
