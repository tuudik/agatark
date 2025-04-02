"""Agatark API Client."""

from __future__ import annotations

import hashlib
import socket

import aiohttp
import async_timeout


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
        raise Exception("Invalid credentials")
    response.raise_for_status()


class AgatarkIntegrationApiClient:
    """Agatark API Client."""

    def __init__(
        self,
        host: str,
        username: str,
        password: str,
        session: aiohttp.ClientSession | None = None,
    ) -> None:
        """Initialize the API client."""
        self._host = host
        self._username = username
        self._password = password
        self._session = session or aiohttp.ClientSession()

    async def async_login(self) -> None:
        """Login to the API."""
        url = f"http://{self._host}/hello"
        headers = {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Accept-Language": "et-EE,et;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate",
            "Origin": f"http://{self._host}",
            "Referer": f"http://{self._host}/",
            "User-Agent": "AgatarkIntegration/1.0.0",
            # Replace with integration name and version
        }

        # Generate the token using PBKDF2
        token = hashlib.pbkdf2_hmac(
            "sha256",  # Hash algorithm
            self._password.encode("utf-8"),  # Password
            self._username.encode("utf-8"),  # Salt (email in this case)
            10000,  # Iterations
            32,  # Key length
        ).hex()

        # Prepare the payload
        data = {
            "a": "1lp",
            "email": self._username,
            "remember": None,
            "token": token,
        }

        try:
            async with async_timeout.timeout(10):
                response = await self._session.put(url, headers=headers, json=data)
                _verify_response_or_raise(response)
        except TimeoutError as exception:
            msg = f"Timeout error during login - {exception}"
            raise AgatarkIntegrationApiClientCommunicationError(msg) from exception
        except (aiohttp.ClientError, socket.gaierror) as exception:
            msg = f"Error during login - {exception}"
            raise AgatarkIntegrationApiClientCommunicationError(msg) from exception
        except Exception as exception:  # pylint: disable=broad-except
            msg = f"Unexpected error during login - {exception}"
            raise AgatarkIntegrationApiClientError(msg) from exception

    async def async_get_data(self) -> dict:
        """Fetch data from the API."""
        # Implement the logic to fetch data
        return {"title": "example"}

    async def async_set_title(self, title: str) -> None:
        """Set the title via the API."""
        # Implement the logic to set the title
        pass
