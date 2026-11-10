"""Sensor Watch's constants."""

DOMAIN = "casa_mia_sensor_watch"
# Bus event on each change of level (after its hold-off), for automations.
EVENT = DOMAIN
LIST = "list"  # casa_mia_sensor_watch.list
REFRESH = "refresh"  # casa_mia_sensor_watch.refresh (and its button)
# One entity's watch, now and at each change: the eye in its dialog (the cards' eye.ts).
ENTITY = f"{DOMAIN}/entity"
# Fired by the Casa Mia app when it has written newer files for its components: the
# moment to look for this one's restart marker (restart_notice.py). Nobody fires it for
# an install from HACS or the Marketplace, which ask for their restart themselves.
INSTALLED_EVENT = "casa_mia_components_installed"
# The screenshot swap, when Casa Mia is set up beside this (its swap_rules): sent on
# SWAP with the rule (text in, text out; None for no swap) at each change, and whenever
# SWAP_ASK is sent. Dispatcher signals, since a rule is a function.
SWAP = "casa_mia_swap"
SWAP_ASK = "casa_mia_swap_ask"
