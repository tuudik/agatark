"""Agatark API Client."""

from __future__ import annotations

import hashlib
import logging
import socket

import aiohttp
import async_timeout

# HTTP status codes
HTTP_STATUS_OK = 200

_LOGGER = logging.getLogger(__name__)  # Define the logger for the integration


class AgatarkIntegrationApiClientError(Exception):
    """Exception to indicate a general API error."""


class AgatarkIntegrationApiClientCommunicationError(
    AgatarkIntegrationApiClientError,
):
    """Exception to indicate a communication error."""


class AgatarkIntegrationApiClientAuthenticationError(
    AgatarkIntegrationApiClientError,
):
    """Exception to indicate an authentication error."""


def _verify_response_or_raise(response: aiohttp.ClientResponse) -> None:
    """Verify that the response is valid."""
    if response.status in (401, 403):
        error_message = f"Invalid credentials: {response.status} - {response.reason}"
        _LOGGER.error("Authentication failed: %s", error_message)
        raise AgatarkIntegrationApiClientAuthenticationError(error_message)
    response.raise_for_status()


# Add this helper function to generate the token
def generate_token(password: str, email: str) -> str:
    """Generate a token using PBKDF2."""
    return hashlib.pbkdf2_hmac(
        "sha256",  # Hash algorithm
        password.encode("utf-8"),  # Password as bytes
        email.encode("utf-8"),  # Salt as bytes
        10_000,  # Number of iterations
        32,  # Key length
    ).hex()  # Convert to hexadecimal string


class AgatarkIntegrationApiClient:
    """Agatark API Client."""

    def __init__(
        self,
        email: str,
        password: str,
        host: str,
        session: aiohttp.ClientSession | None = None,
    ) -> None:
        """Initialize the API client."""
        self._email = email
        self._password = password
        self._host = host
        self._session = session or aiohttp.ClientSession()
        self._authorization = None  # Store the authorization token

    def update_credentials(self, email: str, password: str, host: str) -> None:
        """Update the API client credentials."""
        self._email = email
        self._password = password
        self._host = host
        _LOGGER.info("Updated API client credentials")

    async def close(self) -> None:
        """Close the aiohttp session."""
        if not self._session.closed:
            await self._session.close()

    async def authenticate(self) -> None:
        """Authenticate with the API."""
        url = f"http://{self._host}/hello"
        token = generate_token(self._password, self._email)
        data = {
            "a": "1lp",
            "email": self._email,
            "token": token,
            "remember": "on",
        }

        headers = {
            "Content-Type": "application/json",  # Essential header
        }

        _LOGGER.debug("Authenticating with Agatark API at %s with data: %s", url, data)

        try:
            async with self._session.put(url, json=data, headers=headers) as response:
                _LOGGER.debug("Authentication response status: %s", response.status)
                _LOGGER.debug("Authentication response body: %s", await response.text())
                if response.status == HTTP_STATUS_OK:
                    response_data = await response.json()
                    self._authorization = response_data.get("authorization")
                    if self._authorization:
                        _LOGGER.info("Successfully authenticated with Agatark API")
                        _LOGGER.debug("Authorization token: %s", self._authorization)
                    else:
                        _LOGGER.error("Authorization token missing in response")
                else:
                    _verify_response_or_raise(response)
        except aiohttp.ClientError as err:
            _LOGGER.exception("Error communicating with Agatark API")
            raise AgatarkIntegrationApiClientCommunicationError from err

    async def async_get_data(self) -> dict:
        """Fetch data from the API."""
        # Implement the logic to fetch data
        return {"title": "example"}

    async def async_set_title(self, title: str) -> None:
        """Set the title via the API."""
        # Implement the logic to set the title

    async def async_long_poll_events(self) -> None:
        """Continuously long poll the /events endpoint."""
        if not self._authorization:
            msg = "Authorization token is missing. Login first."
            raise AgatarkIntegrationApiClientError(msg)

        url = f"http://{self._host}/events"
        headers = {
            "Accept": "application/json",
            "Authorization": self._authorization,  # Use the authorization token
            "User-Agent": "AgatarkIntegration/1.0.0",
        }

        while True:
            _LOGGER.debug("Start polling /events")
            if self._session is None or self._session.closed:
                _LOGGER.debug("Session closed; ending long-poll loop.")
                break

            try:
                async with async_timeout.timeout(30):  # Long poll timeout
                    response = await self._session.get(url, headers=headers)
                    _verify_response_or_raise(response)
                    data = await response.json()

                    # Log the result in debug mode
                    _LOGGER.debug("Received events: %s", data)

            except TimeoutError:
                _LOGGER.warning("Timeout while polling /events. Retrying...")
            except (aiohttp.ClientError, socket.gaierror):
                _LOGGER.exception("Error during long polling /events")
                break  # Exit the loop on connection errors
            except Exception:  # pylint: disable=broad-except
                _LOGGER.exception("Unexpected error during long polling /events")
                break
