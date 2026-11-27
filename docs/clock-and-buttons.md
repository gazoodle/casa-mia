# Clock and Buttons cards

Two Lovelace cards that come with Casa Mia. Both are made to fit small places, such
as a Camera Commander's last place or a Tablet Layout panel, and both work anywhere a
card can go. Add them from the dashboard's card picker, where they are **Casa Mia Clock**
and **Casa Mia Buttons**.

## Casa Mia Clock

Home Assistant's own clock card, made as big as the space it is given. Every option of
Home Assistant's clock works here, with Home Assistant's own editor for it: a title, digital
or analogue, the size, seconds, the date in the parts and order you choose, 12 or 24
hours, the time zone, and for the analogue face its border, ticks, numbers (plain or
Roman) and whether the second hand sweeps or ticks. Home Assistant's
[clock card documentation](https://www.home-assistant.io/dashboards/clock/) describes them.
A clock you already have becomes this one by changing its `type: clock` to
`type: custom:casa-mia-clock`.

What it adds is the size. Home Assistant draws its clock at one of three fixed sizes
(**Size**: small, medium or large). This card scales the whole clock, title and date
included, to fill the place it is in, as a picture is scaled: whole and centred. So in a
Camera Commander's last place, a Tablet Layout panel, or a sections card with its rows set
on the Layout tab, the clock is as big as the place allows. In a column with no height of
its own it is the size you chose, as Home Assistant's own card would be, or smaller if the
column is too narrow for it.

In YAML:

```yaml
type: custom:casa-mia-clock
clock_style: analog
ticks: hour
face_style: roman
show_seconds: true
date_format:
  - weekday-short
  - day-numeric
  - month-short
```

## Casa Mia Buttons

A few small buttons, each one of the style guide's chips: an icon and a name. Four of
them fit a Camera Commander's last place on a phone. A button that is on (a light on, a
gate open, a lock unlocked) is filled in.

A tap does what Home Assistant's own cards do. Left to itself, a button toggles what can
be toggled (a light, a switch, a cover) and opens the more-info dialog for anything else,
such as a lock. Give it a tap action to do something else: go to another page, perform an
action, or ask before it acts (the action's **Confirmation**), which is worth setting for
a gate or a lock.

| Option | What it does |
|---|---|
| **Buttons** | The list. Each button has an entity, a name and an icon (both blank: the entity's own) and a tap action. Drag them to change the order. |
| **Columns** | How many buttons sit side by side; 2 by default. The rows follow. |
| **Show names** | On by default. The chips keep one size everywhere, so in a very small place a name is cut short; switch names off to show the icons alone. |
| **No background** | Just the buttons, on whatever is behind the card. |

In YAML:

```yaml
type: custom:casa-mia-buttons
columns: 2
buttons:
  - entity: light.porch
  - entity: cover.front_gate
    tap_action:
      action: toggle
      confirmation: true
  - name: Home
    icon: mdi:home
    tap_action:
      action: navigate
      navigation_path: /lovelace/home
  - entity: script.goodnight
```
