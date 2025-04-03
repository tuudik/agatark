"""Adds config flow for Agatark."""

from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_EMAIL, CONF_HOST, CONF_PASSWORD
from homeassistant.helpers import selector
from slugify import slugify

from .api import (
    AgatarkIntegrationApiClient,
    AgatarkIntegrationApiClientAuthenticationError,
    AgatarkIntegrationApiClientCommunicationError,
    AgatarkIntegrationApiClientError,
)
from .const import DOMAIN, LOGGER


class AgatarkConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Agatark integration."""

    VERSION = 1

    def __init__(self) -> None:
        """Initialize the configuration flow."""
        super().__init__()
        self.options = {}

    async def async_step_user(
        self,
        user_input: dict | None = None,
    ) -> config_entries.ConfigFlowResult:
        """Handle a flow initialized by the user."""
        _errors = {}
        if user_input is not None:
            try:
                await self._test_credentials(
                    host=user_input[CONF_HOST],
                    email=user_input[CONF_EMAIL],
                    password=user_input[CONF_PASSWORD],
                )
            except AgatarkIntegrationApiClientAuthenticationError as exception:
                LOGGER.warning(exception)
                _errors["base"] = "auth"
            except AgatarkIntegrationApiClientCommunicationError as exception:
                LOGGER.error(exception)
                _errors["base"] = "connection"
            except AgatarkIntegrationApiClientError as exception:
                LOGGER.exception(exception)
                _errors["base"] = "unknown"
            else:
                await self.async_set_unique_id(slugify(user_input[CONF_HOST]))
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=user_input[CONF_HOST],
                    data=user_input,
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_HOST): selector.TextSelector(
                        selector.TextSelectorConfig(type=selector.TextSelectorType.TEXT)
                    ),
                    vol.Required(CONF_EMAIL): selector.TextSelector(
                        selector.TextSelectorConfig(type=selector.TextSelectorType.TEXT)
                    ),
                    vol.Required(CONF_PASSWORD): selector.TextSelector(
                        selector.TextSelectorConfig(
                            type=selector.TextSelectorType.PASSWORD
                        )
                    ),
                }
            ),
            errors=_errors,
        )

    async def _test_credentials(self, host: str, email: str, password: str) -> None:
        """Test the provided credentials."""
        client = AgatarkIntegrationApiClient(host=host, email=email, password=password)
        try:
            await client.authenticate()
        except Exception as exception:
            raise AgatarkIntegrationApiClientAuthenticationError from exception


class OptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for Agatark integration."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(
        self, user_input: dict | None = None
    ) -> config_entries.ConfigFlowResult:
        """Manage the options."""
        if user_input is not None:
            # Update the options
            return self.async_create_entry(title="", data=user_input)

        # Show the options form
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        "host", default=self.config_entry.options.get("host", "")
                    ): str,
                    vol.Optional(
                        "email",
                        default=self.config_entry.options.get("email", ""),
                    ): str,
                    vol.Optional(
                        "password",
                        default=self.config_entry.options.get("password", ""),
                    ): str,
                }
            ),
        )


# Example usage of the AgatarkConfigFlow class
flow = AgatarkConfigFlow()
if hasattr(flow, "options"):
    LOGGER.debug("Flow options: %s", flow.options)
else:
    LOGGER.warning("Options attribute is not defined.")
