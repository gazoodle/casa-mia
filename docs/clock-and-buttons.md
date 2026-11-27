# Clock and Buttons cards

Two small Lovelace cards that come with Casa Mia. Both are made to fit small places, such
as a Camera Commander's last place or a Tablet Layout panel, and both work anywhere a
card can go. Add them from the dashboard's card picker, where they are **Casa Mia Clock**
and **Casa Mia Buttons**.

## Casa Mia Clock

The time, digital or analogue, made as big as the space it is given. In a place with a
height of its own (a Camera Commander's last place, a Tablet Layout panel, a sections card
with its rows set on the Layout tab) it fills it. In a column with no height of its own it
takes its own shape: 5 by 2 when digital, square when analogue.

| Option | What it does |
|---|---|
| **Style** | Digital (the default) or Analogue. |
| **Hours** | As your language has it (the default), 24-hour or 12-hour. A 12-hour clock shows am or pm beside the time. |
| **Show seconds** | Adds the seconds, and a second hand on the analogue face. |
| **Time zone** | As your profile (the default): this device's zone, or the server's where your Home Assistant profile says so. Or any zone from the list. |
| **No background** | Just the time, on whatever is behind the card. |

In YAML:

```yaml
type: custom:casa-mia-clock
clock_style: analog
show_seconds: true
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
