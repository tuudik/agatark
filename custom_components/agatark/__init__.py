"""
Custom integration to integrate Agatark with Home Assistant.

For more details about this integration, please refer to
https://github.com/tuudik/agatark
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import TYPE_CHECKING

from homeassistant.const import CONF_EMAIL, CONF_HOST, CONF_PASSWORD, Platform
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.loader import async_get_loaded_integration

from .api import AgatarkIntegrationApiClient
from .const import DOMAIN
from .coordinator import AgatarkDataUpdateCoordinator
from .data import AgatarkIntegrationData

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)  # Define the logger for the integration

PLATFORMS: list[Platform] = [
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.SWITCH,
]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up the integration using UI."""
    _LOGGER.info("Setting up Agatark integration")

    client = AgatarkIntegrationApiClient(
        email=entry.options.get("email", entry.data[CONF_EMAIL]),
        password=entry.options.get("password", entry.data[CONF_PASSWORD]),
        host=entry.options.get("host", entry.data[CONF_HOST]),
        session=async_get_clientsession(hass),
    )

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = client

    entry.async_on_unload(entry.add_update_listener(async_update_options))

    try:
        await client.authenticate()
        hass.loop.create_task(client.async_long_poll_events())

        coordinator = AgatarkDataUpdateCoordinator(
            hass=hass,
            logger=_LOGGER,
            name=DOMAIN,
            update_interval=timedelta(hours=1),
        )
        entry.runtime_data = AgatarkIntegrationData(
            client=client,
            integration=async_get_loaded_integration(hass, entry.domain),
            coordinator=coordinator,
        )

        await coordinator.async_config_entry_first_refresh()
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
        entry.async_on_unload(entry.add_update_listener(async_reload_entry))

        _LOGGER.info("Agatark integration setup completed successfully")
    except Exception:
        _LOGGER.exception("Error setting up Agatark integration")
        return False
    else:
        return True


async def async_update_options(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update."""
    _LOGGER.info("Updating options for Agatark integration")
    client = hass.data[DOMAIN][entry.entry_id]
    client.update_credentials(
        email=entry.options.get("email"),
        password=entry.options.get("password"),
        host=entry.options.get("host"),
    )


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Handle removal of an entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload config entry."""
    await async_unload_entry(hass, entry)
    await async_setup_entry(hass, entry)
