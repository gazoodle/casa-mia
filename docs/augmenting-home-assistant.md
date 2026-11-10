# Augmenting Home Assistant

Some Casa Mia features extend Home Assistant's own pages or services where there is no
public API for what they need. They fill gaps we have found while using Home Assistant.
An HA release can change those internals and break an augmentation, or provide the
feature itself so Casa Mia's version is no longer needed.

## Portrait and landscape conditions

Home Assistant already evaluates screen orientation in dashboard conditions, but its
visual editor offers only screen widths. Casa Mia adds **Orientation** beneath those
width choices, with **Any**, **Portrait** and **Landscape**.

In a dashboard's condition editor, add a **Screen** condition and choose an orientation.
Leave the widths unselected to match that orientation at any width. Portrait saves:

```yaml
condition: screen
media_query: '(orientation: portrait)'
```

Landscape saves `(orientation: landscape)`. These describe the browser's visible page:
portrait means its height is at least its width, and landscape means it is wider than
it is tall. They do not read a device's physical rotation sensor.

Selecting widths as well requires both a selected width and the orientation to match.
For example, **Tablet** and **Portrait** save:

```yaml
condition: screen
media_query: '(min-width: 768px) and (max-width: 1023px) and (orientation: portrait)'
```

Multiple widths still mean any of the selected widths; each is constrained to the chosen
orientation. **Any** removes the orientation constraint and keeps the widths. Existing
width conditions reopen with **Any** selected. Other custom media queries remain in
Home Assistant's YAML editor.

**Screen orientation conditions** is on by default, including for existing Casa Mia
installations. Change it in **Casa Mia → the cog beside the house photo → Settings →
Dashboards**. Settings are sent to open pages; close and reopen the condition editor
after changing the switch. After a Casa Mia integration reload, reload the page too.

Turning it off removes the extra control. Saved conditions still work because they use
Home Assistant's normal `screen` condition. Orientation conditions can then be edited
in YAML. The augmentation uses HA's shared screen editor, including dashboard Visibility
conditions and conditional cards, and needs the Casa Mia integration.

## Other augmentations

| Feature | What Casa Mia changes | Where to configure it |
|---|---|---|
| Dashboard refresh | Listens for dashboard changes and reloads an open dashboard, except while it is being edited. | [Settings → Dashboard helpers](applets/settings.md#dashboard-helpers), **Reload dashboards when they change**. |
| Back button helper | Makes a dashboard navigation action to `#BACK` go back through the page's history. | [Settings → Dashboard helpers](applets/settings.md#dashboard-helpers), **Back button helper**. |
| Camera picture helpers | Stops supported streams on hidden pages and restarts them when shown. | [Settings → Dashboard helpers](applets/settings.md#dashboard-helpers), **Keep camera pictures live**. |
| Garnish | Adds the sprig in HA's section editor and changes section visibility so headings and other garnish cannot hold an otherwise empty section open. | [Garnish](tablet-layout.md#showing-and-hiding); **Enable garnish on all section dashboards** in Settings extends it beyond Tablet Layouts. |
| Tablet Layout and Over layer | Use HA's Sections view, card wrappers and editors to fit panels to the screen and show conditional content over a dashboard. | [Tablet Layout](tablet-layout.md) and [Over layer](over-layer.md). |
| Sensor Watch | Adds the eye to HA's entity dialog and colours the Status sensor's icon according to its level. | [Sensor Watch](applets/sensor-watch.md). These additions come with its integration. |
| UniFi Protect talkback | Adds talk sources to HA's managed go2rtc configuration and makes selected Protect cameras advertise two-way audio. | [UniFi Protect talkback](applets/protect-talkback.md). Enable the module, then choose cameras in its integration's options. |

The eye and icon colour are the Sensor Watch augmentations covered here; its monitoring,
events and entities are separate from those frontend changes. Protect talkback changes
HA's audio plumbing as well as exposing its existing Talk button. It is intended to go
away when HA and go2rtc provide that support themselves.

## After a Home Assistant update

Check the augmentations you use after updating HA, especially dashboard editing and
Protect talkback. The frontend patches check the entry points they use where possible
and report incompatibilities in the browser console. Protect talkback reports a failed
patch in Home Assistant's Repairs and log. Those checks cannot anticipate every change
HA might make.

If a feature stops working, check its guide and the relevant log, and report the HA and
Casa Mia versions with the error. Screen orientation's saved YAML continues to be an HA
condition even when Casa Mia's editor augmentation is off or unavailable. Each helper's
own switch can disable it while a compatibility problem is investigated.
