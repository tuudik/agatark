"""
Module for managing Agatark devices.

This module contains the AgatarkDevice class, which provides methods for
interacting with and managing Agatark devices via the API.
"""

from __future__ import annotations

import logging
from typing import Any

from .api import AgatarkIntegrationApiClient

_LOGGER = logging.getLogger(__name__)


class AgatarkDevice:
    """Representation of an Agatark device."""

    def __init__(self, host: str, email: str, password: str) -> None:
        """Initialize the device."""
        self._client = AgatarkIntegrationApiClient(
            email=email,
            password=password,
            host=host,
        )
        self._data: dict[str, Any] = {}

    async def async_initialize(self) -> None:
        """Initialize the device by authenticating and fetching initial data."""
        await self._client.authenticate()
        await self.async_update_data()

    async def async_update_data(self) -> None:
        """Fetch the latest data from the device."""
        self._data = await self._client.async_get_data()

    async def async_set_title(self, title: str) -> None:
        """Set the title via the API."""
        await self._client.async_set_title(title)

    @property
    def data(self) -> dict[str, Any]:
        """Return the latest data."""
        return self._data
