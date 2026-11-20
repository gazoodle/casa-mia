// What Contraption adds to the invented house, so that every kind of device Dash-Bored
// reads from a real house has a mechanism here. All of it is made up.
//
// A device's `level` is in per cent unless it has a `span`, when it is in degrees.
// `dims` is the real model's word for "its level can be set from the page".
(() => {
  for (const id of ["k_ceiling", "s_lamp", "b_bedside"]) House.find(id).dims = true;
  for (const d of House.devices) if (d.kind === "cover") d.dims = true;

  const degrees = (min, max) => ({ min, max });
  House.add("kitchen", { id: "k_boiler", name: "Boiler", kind: "water_heater", on: true, dims: true, temp: 51, level: 55, span: degrees(30, 70), watts: 0 });
  House.add("sitting", { id: "s_gram", name: "Wireless", kind: "media_player", on: true, dims: true, level: 35, title: "Gymnopédie No. 1", watts: 20 });
  House.add("study", { id: "st_stat", name: "Radiator", kind: "climate", on: true, dims: true, temp: 19.2, level: 20, span: degrees(5, 30), watts: 0 });
  House.add("study", { id: "st_fan", name: "Fan", kind: "fan", on: false, dims: true, level: 40, watts: 30 });
  House.add("hall", { id: "h_alarm", name: "Alarm", kind: "alarm_control_panel", on: false, watts: 0 });
  House.add("hall", { id: "h_cam", name: "Porch camera", kind: "camera", on: true, watts: 4 });
  House.add("bedroom", { id: "b_damp", name: "Humidifier", kind: "humidifier", on: false, dims: true, level: 50, watts: 25 });
  House.add("bedroom", { id: "b_sweep", name: "Sweeper", kind: "vacuum", on: false, watts: 30 });
  House.add("garden", { id: "g_butt", name: "Water butt", kind: "valve", on: false, watts: 0 });
  House.add("garden", { id: "g_sheep", name: "Mower", kind: "lawn_mower", on: false, watts: 0 });
  House.add("garden", { id: "g_horn", name: "Klaxon", kind: "siren", on: false, watts: 0 });

  House.people = [{ name: "Ada", home: true }, { name: "Wilf", home: false }, { name: "Nell", home: true }];
  House.outside = { temp: 9.3, sky: "rainy" };
  House.loose = ["Stray lamp", "Status lamp", "Pump relay"]; // devices in no room
  House.alerts = []; // what Sensor Watch would be saying
})();
