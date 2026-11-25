"""Where Jukebox signs in to Spotify (config_flow.py), for Home Assistant's own store
of application credentials: the same Spotify developer app as Home Assistant's Spotify
integration uses, entered once more for Jukebox."""

from homeassistant.components.application_credentials import AuthorizationServer
from homeassistant.core import HomeAssistant


async def async_get_authorization_server(hass: HomeAssistant) -> AuthorizationServer:
    return AuthorizationServer(
        authorize_url="https://accounts.spotify.com/authorize",
        token_url="https://accounts.spotify.com/api/token",
    )
