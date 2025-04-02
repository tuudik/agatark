"""Custom types for agatark."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.loader import Integration

    from .api import AgatarkIntegrationApiClient
    from .coordinator import AgatarkDataUpdateCoordinator


type AgatarkIntegrationConfigEntry = ConfigEntry[AgatarkIntegrationData]


@dataclass
class AgatarkIntegrationData:
    """Data for the Blueprint integration."""

    client: AgatarkIntegrationApiClient
    coordinator: AgatarkDataUpdateCoordinator
    integration: Integration
