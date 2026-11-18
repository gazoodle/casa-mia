# Dash-Bored: what each family shows, and what other dashboards have

Written 2026-11-17. It has two parts: the capabilities of Dash-Bored's own families
compared with each other, and a comparison with other dashboards. The first part is the
one to keep up to date.

## Every family gets every capability

**The rule (owner, 2026-11-17):** every family shows every capability, in its own style.
A capability is added to this table when it is built, and each family it is missing from
gets a backlog entry at the same time.

Why: the Gazette had the weather and who is at home from its first weeks. Aurora and the
Console were built later without either, and nobody noticed until Aurora was compared with
other dashboards. Both were already in `House` (`house.outside`, `house.people`), which
every family is given, so showing them needed no new data.

`tests/test_dash_bored_parity.py` enforces the part of this it can read from the sources:
the fields of `House`, a device's optional fields, the integration's feeds and the
forecast. One that any family reads must be read by all four, or be in the test's `OWED`
list with the reason. It sees what a family reads and not what it draws, so this table is
still kept by hand.

How to read it: **yes** means built, **no** means not built, **part** is explained under
the table, and **?** means it was not checked when this was written. Check a **?** in the
source before relying on it, and replace it.

| Capability | Gazette | Console | Fridge | Aurora |
|---|---|---|---|---|
| All fifteen kinds of device | yes | yes | yes | yes |
| Levels: brightness, position, speed, volume, target temperature | yes | yes | yes | yes |
| Two presses to unlock, open or sound | yes | yes | yes | yes |
| Scenes | yes | yes | yes | yes |
| Sensor Watch's alerts | yes | yes | yes | yes |
| A camera's latest picture and what it last saw | yes | yes | yes | yes |
| Casa Mia's cameras: presets, zoom and controls | yes | yes | no | yes |
| The weather now | yes | yes | yes | no |
| The forecast by the day | yes | yes | no | no |
| Who is at home | yes | no | yes | no |
| People's comings and goings, with times | yes | no | no | no |
| What the players played lately | yes | no | no | no |
| What is playing, and pause or play | yes | ? | ? | no |
| Which appliances are drawing power | yes | no | no | no |
| Love it or Loathe it's ratings | yes | no | no | no |
| Power in use | yes | ? | yes | yes |
| A device's history | yes | part | ? | part |
| A door found unlocked, said on the front | yes | ? | yes | ? |
| Devices not answering, said on the front | yes | ? | ? | ? |
| What the house is missing (devices in no area and the like) | yes | no | no | no |
| A thermostat's modes and a player's source | no | no | no | yes |
| Finding a device by typing | ? | no | no | yes |
| The house's own agent's column (ZenOS-AI) | yes | no | no | no |

- **A device's history:** the Console has a chart recorder for a room. Aurora has the
  last hour of the house's power and nothing for a device.
- Each family's own varieties (the Gazette's three papers, the Console's five eras, the
  Fridge's three households, Aurora's skins) are not capabilities, and are not in the table.

## Other dashboards

Read from each project's own page on 2026-11-17, so a feature its page does not mention
may still exist. Card builders (Ultra Card, CardBuilder Pro, Dashboard Studio, LCARdS's
layout editor) are left out, because they are tools for making cards.

| Feature | Who has it | Dash-Bored |
|---|---|---|
| Weather on the home page | HomeDeck, Casora, Oriel, Simon42, Bonbon, SMARTi, HA Fusion, Hass Dashboard Pro | Gazette and Fridge only |
| Who is home | Oriel, Simon42, Bonbon, Hass Dashboard Pro | Gazette and Fridge only |
| Calendar or agenda | HomeDeck, Casora, Simon42, SMARTi | No family |
| Favourites pinned to the home page | Oriel, Simon42, Bonbon, Hass Dashboard Pro | No family |
| Light colour and colour temperature | HomeDeck, Casora | No family: brightness only |
| Media: artwork, play and pause, what is playing | HomeDeck, Casora, HA Fusion | Gazette's clipping only |
| Sensor history on a tile | HomeDeck, Oriel, Casora, Bonbon, Mushroom Strategy | See the table above |
| Low batteries, updates, unavailable devices | Simon42, Casora, Oriel | Sensor Watch covers faults, not batteries or updates |
| A doorbell pop-up with the camera | HomeDeck | No family |
| A screensaver for a wall tablet | HomeDeck, Oriel | No: Kiosk Satellite's job |
| Show or hide by user, time or house mode | HomeDeck, Oriel, Simon42 | No family |
| The season readable and settable by an automation | Seasonal Glass (a sensor, a calendar entity and a service) | No: the browser or the card's setting |
| Birthdays and personal days as a season | Seasonal Glass, HomeDeck | No |

Where Dash-Bored is ahead: no other has things that land on the tiles, pile up and are
tidied away; none says in a sentence how the house stands; none says how old a camera's
still is. Seasonal Glass draws at 30 frames a second by choice, which is worth copying if
a tablet struggles with Aurora's seasons.

Recommended, in order (see BACKLOG): the weather, who is home and the next calendar event
where they are missing; light colour and media transport; the skin as something Home
Assistant can read and set; birthdays from a calendar as an Almanac day. Left out for now:
per-user visibility, a screensaver and favourites.

Sources: [HomeDeck](https://github.com/rodrigo-wa/homedeck),
[Seasonal Glass](https://github.com/pietroguidetti02/ha-seasonal-glass),
[Casora](https://github.com/SH1FT-W/casora),
[Oriel Dashboard](https://github.com/TheDave94/oriel-dashboard),
[Dwains Dashboard Next](https://github.com/dwainscheeren/dwains-dashboard-next),
[SMARTi](https://github.com/Prosono/SMARTi_BaseComponent),
[Mushroom Strategy](https://github.com/DigiLive/mushroom-strategy),
[Linus Dashboard](https://github.com/Thank-you-Linus/Linus-Dashboard),
[Simon42 Dashboard Strategy](https://github.com/TheRealSimon42/simon42-dashboard-strategy),
[HA Fusion](https://github.com/knowald/ha-fusion),
[Bonbon Strategy](https://github.com/trashbytes/bonbon-strategy),
[Hass Dashboard Pro](https://github.com/SecSunshine/hass-dashboard-pro).
