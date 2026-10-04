# Changelog

## 2026.10.2-b3

- Screenshot swap: while `custom_components/casa_mia/swap.json` says so, the panel, the integration's entities, the guest QR codes and the welcome page show stand-ins for real names, numbers and addresses, so screenshots give nothing private away. Each save shows on the panel within seconds.

## 2026.10.2-b2

## 2026.10.2-b1

- Adding the Casa Mia integration fills in the app's address again: it had stopped finding the app on current Home Assistant (a function it uses had moved), so the field came up empty. Leaving the field empty now also means the app found here.
- The integration setup dialog no longer shows a made-up example address, and a pasted address with a trailing full stop or spaces is accepted.
- The panel's Copy buttons now work in the Home Assistant companion app and say whether the copy worked (they did nothing there before).

## 2026.10.1

- First public release. See the README for what Casa Mia does and how to set it up.
