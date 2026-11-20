"""Casa Mia says so, as a Repair, while Tablet Layout's own file is a dashboard resource."""

from types import SimpleNamespace

from custom_components.casa_mia import layout_resource
from custom_components.casa_mia.const import DOMAIN
from custom_components.casa_mia.coordinator import API_VERSION
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.helpers import issue_registry as ir
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

APP = "http://app.invalid:8780"


async def test_the_plugin_as_a_resource_is_a_repair_until_it_is_removed(hass):
    assert await async_setup_component(hass, "lovelace", {})
    resources = hass.data[LOVELACE_DATA].resources
    issues = ir.async_get(hass)
    unload = []
    entry = SimpleNamespace(async_on_unload=unload.append)

    # Another card's file is nobody's business.
    await resources.async_create_item({"res_type": "module", "url": "/local/other.js"})
    await layout_resource.watch(hass, entry)  # type: ignore[arg-type]
    assert issues.async_get_issue(DOMAIN, layout_resource.ISSUE) is None

    # The plugin, added while Casa Mia is running: told at once, with its address.
    url = "/hacsfiles/casa-mia-tablet-layout/casa-mia-tablet-layout.js?hacstag=1"
    added = await resources.async_create_item({"res_type": "module", "url": url})
    await hass.async_block_till_done()
    issue = issues.async_get_issue(DOMAIN, layout_resource.ISSUE)
    assert issue and issue.translation_placeholders == {"url": url}
    assert issue.severity is ir.IssueSeverity.WARNING

    # Removed: the Repair goes by itself.
    await resources.async_delete_item(added["id"])
    await hass.async_block_till_done()
    assert issues.async_get_issue(DOMAIN, layout_resource.ISSUE) is None

    # Already there when Casa Mia starts: found then. Unloading stops the watching.
    await resources.async_create_item({"res_type": "module", "url": url})
    await hass.async_block_till_done()
    issues.async_delete(DOMAIN, layout_resource.ISSUE)
    await layout_resource.watch(hass, entry)  # type: ignore[arg-type]
    assert issues.async_get_issue(DOMAIN, layout_resource.ISSUE)
    assert len(unload) == 4  # each watch: its Repair to clear, its listener to stop


async def test_casa_mia_watches_the_resources_from_when_it_is_set_up(
    hass, aioclient_mock
):
    # The whole integration, with the app's answer stood in for.
    aioclient_mock.get(f"{APP}/health", json={"api": API_VERSION, "modules": {}})
    entry = MockConfigEntry(domain=DOMAIN, data={"url": APP})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    url = "/local/casa-mia-tablet-layout.js"
    resources = hass.data[LOVELACE_DATA].resources
    added = await resources.async_create_item({"res_type": "module", "url": url})
    await hass.async_block_till_done()
    issues = ir.async_get(hass)
    assert issues.async_get_issue(DOMAIN, layout_resource.ISSUE)

    # Unloaded, Casa Mia loads no cards: the Repair goes, and nothing follows them.
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert issues.async_get_issue(DOMAIN, layout_resource.ISSUE) is None
    await resources.async_delete_item(added["id"])
    await resources.async_create_item({"res_type": "module", "url": url})
    await hass.async_block_till_done()
    assert issues.async_get_issue(DOMAIN, layout_resource.ISSUE) is None
