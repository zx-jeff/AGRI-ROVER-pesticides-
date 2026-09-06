import enum
import logging
import asyncio
from typing import Callable, Optional
from services.websocket_manager import ws_manager

logger = logging.getLogger("rover_state_machine")

class RoverState(str, enum.Enum):
    IDLE = "IDLE"
    MOVING = "MOVING"
    PLANT_APPROACH = "PLANT_APPROACH"
    STOPPING = "STOPPING"
    CAPTURING = "CAPTURING"
    AI_ANALYZING = "AI_ANALYZING"
    TREATMENT_PENDING = "TREATMENT_PENDING"
    SPRAYING = "SPRAYING"
    RESUMING = "RESUMING"
    OBSTACLE_STOP = "OBSTACLE_STOP"
    ERROR = "ERROR"
    EMERGENCY_STOP = "EMERGENCY_STOP"

class RoverStateMachine:
    """
    Formal 12-State Machine for Autonomous Rover Crop Inspection Sequence.
    Enforces atomic state transitions and broadcasts live activity step updates to dashboard clients.
    """
    def __init__(self):
        self._state: RoverState = RoverState.IDLE
        self._current_plant_index: int = 1

    @property
    def current_state(self) -> RoverState:
        return self._state

    async def transition_to(self, new_state: RoverState, details: str = "") -> bool:
        old_state = self._state

        # Emergency stop overrides any state
        if new_state == RoverState.EMERGENCY_STOP:
            self._state = RoverState.EMERGENCY_STOP
            await self._notify(old_state, new_state, details or "EMERGENCY STOP ENGAGED")
            return True

        if old_state == RoverState.EMERGENCY_STOP and new_state != RoverState.IDLE:
            logger.warning("Cannot exit EMERGENCY_STOP without explicit reset to IDLE.")
            return False

        self._state = new_state
        logger.info(f"Rover State Transition: {old_state.value} -> {new_state.value} ({details})")
        await self._notify(old_state, new_state, details)
        return True

    async def _notify(self, old_state: RoverState, new_state: RoverState, details: str):
        await ws_manager.broadcast("ROVER_STATE_TRANSITION", {
            "previous_state": old_state.value,
            "current_state": new_state.value,
            "details": details,
            "plant_index": self._current_plant_index
        })

rover_state_machine = RoverStateMachine()
