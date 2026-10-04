# Changelog

## 2026.10.2-b9

- Screenshot swap: a dashboard deployed while it is on shows the stand-in names on its camera pages too (their addresses keep the real ones).

## 2026.10.2-b8

- Screenshot swap: a dashboard deployed while it is on taps and follows the Main camera select by the stand-in names its options show (it refused the real ones). Deploy again with the swap off.

## 2026.10.2-b7

- Screenshot swap: a camera picture added after swap.json was last saved is used too (it was skipped until swap.json was saved again).

## 2026.10.2-b6

- Screenshot swap: `camera_images` in swap.json gives a camera a picture in place of its feed (in the composites, the Camera Dashboard's previews and thumbnails), and the camera names drawn into the composites are swapped too.

## 2026.10.2-b5

- Screenshot swap: a name is no longer replaced inside a longer word ("Ann" leaves "Annex" alone); numbers and entity ids still match.

## 2026.10.2-b4

- Screenshot swap: `"original_photo": true` in swap.json shows the shipped house photo in place of yours (which stays saved).

## 2026.10.2-b3

- Screenshot swap: while `custom_components/casa_mia/swap.json` says so, the panel, the integration's entities, the guest QR codes and the welcome page show stand-ins for real names, numbers and addresses, so screenshots give nothing private away. Each save shows on the panel within seconds.

## 2026.10.2-b2

## 2026.10.2-b1

- Adding the Casa Mia integration fills in the app's address again: it had stopped finding the app on current Home Assistant (a function it uses had moved), so the field came up empty. Leaving the field empty now also means the app found here.
- The integration setup dialog no longer shows a made-up example address, and a pasted address with a trailing full stop or spaces is accepted.
- The panel's Copy buttons now work in the Home Assistant companion app and say whether the copy worked (they did nothing there before).

## 2026.10.1

- First public release. See the README for what Casa Mia does and how to set it up.
