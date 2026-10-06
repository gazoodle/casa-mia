// The Camera Commander's picture route (ha.ts: atHome): direct only where this page reached
// Home Assistant over plain http at a home address.
import assert from "node:assert/strict";
import test from "node:test";
import { atHome } from "./ha.ts";

const at = (url: string) => atHome(new URL(url));

test("home addresses over http are home", () => {
  for (const url of ["http://192.168.1.20:8123", "http://10.0.0.5:8123", "http://172.20.1.1:8123", "http://homeassistant.local:8123", "http://homeassistant:8123", "http://[fd00::5]:8123", "http://ha.home.arpa:8123"])
    assert.equal(at(url), true, url);
});

test("https, or a public address, is away", () => {
  for (const url of ["https://192.168.1.20:8123", "https://example.ui.nabu.casa", "http://203.0.113.9:8123", "http://ha.example.com", "http://172.32.0.1:8123", "http://fdroid.example.com"])
    assert.equal(at(url), false, url);
});
