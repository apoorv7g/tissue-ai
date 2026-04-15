"""
Multi-Agent Configuration System
Defines different agent types and their configurations.
"""

from enum import Enum
from typing import List, Dict, Any
from dataclasses import dataclass


class AgentType(Enum):
    """Enum for different agent types"""
    PRELIMINARY = "preliminary"
    REASONING = "reasoning"
    WEB_SEARCH = "web_search"


@dataclass
class Agent:
    """Represents a single agent in the pipeline"""
    id: str
    type: AgentType
    name: str
    model: str
    system_prompt: str
    order: int
    enabled: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert agent to dictionary"""
        return {
            "id": self.id,
            "type": self.type.value,
            "name": self.name,
            "model": self.model,
            "system_prompt": self.system_prompt,
            "order": self.order,
            "enabled": self.enabled,
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Agent":
        """Create agent from dictionary"""
        return Agent(
            id=data["id"],
            type=AgentType(data["type"]),
            name=data["name"],
            model=data["model"],
            system_prompt=data["system_prompt"],
            order=data["order"],
            enabled=data.get("enabled", True),
        )


# Default Agents
DEFAULT_AGENTS = [
    Agent(
        id="agent_preliminary",
        type=AgentType.PRELIMINARY,
        name="Preliminary Agent",
        model="openai/gpt-oss-20b",
        system_prompt="Analyze input: extract key concepts, topics, and entities. Be concise.",
        order=1,
        enabled=True,
    ),
    Agent(
        id="agent_reasoning",
        type=AgentType.REASONING,
        name="Reasoning Agent",
        model="groq/compound",
        system_prompt="Identify relationships and logical connections between concepts. Be concise.",
        order=2,
        enabled=False,
    ),
    Agent(
        id="agent_web_search",
        type=AgentType.WEB_SEARCH,
        name="Web Search Agent",
        model="groq/compound",
        system_prompt="Enrich with context, best practices, and relevant domain knowledge. Be concise.",
        order=3,
        enabled=False,
    ),
]


def get_default_agents() -> List[Agent]:
    """Get list of default agents"""
    return DEFAULT_AGENTS.copy()


def get_enabled_agents(agents: List[Agent]) -> List[Agent]:
    """Get only enabled agents, sorted by order"""
    return sorted([a for a in agents if a.enabled], key=lambda a: a.order)


def create_agent(
    agent_type: AgentType,
    name: str,
    model: str,
    system_prompt: str,
    order: int,
) -> Agent:
    """Factory function to create a new agent"""
    import uuid
    return Agent(
        id=f"agent_{uuid.uuid4().hex[:8]}",
        type=agent_type,
        name=name,
        model=model,
        system_prompt=system_prompt,
        order=order,
        enabled=True,
    )
