// Heating Flow mock-up: invented readings for each scenario. NEVER TEST THIS.
'use strict';

HF.PRIO = {Heating: '#e5443a', 'Hot water': '#a652d6', Off: '#7a8190', Defrost: '#2f86e0'};

// Invented rooms: [name, room temperature, target, actuator open].
HF.ROOMS = {
  gf: {name: 'Ground floor', loops: [['Kitchen', 20.8, 21, 1], ['Living room', 20.1, 21, 1], ['Hall', 19.6, 19, 0], ['Utility', 18.2, 18, 0], ['Snug', 18.6, 21, 1]]},
  ff: {name: 'First floor', loops: [['Bedroom 1', 18.4, 18, 0], ['Bedroom 2', 17.6, 18, 1], ['Bathroom', 21.3, 22, 1], ['Landing', 19.0, 19, 0]]},
  tf: {name: 'Top floor', loops: [['Loft room', 19.2, 20, 1], ['Shower room', 20.4, 20, 0]]},
};

// Underfloor or radiators, per floor, for the chosen emitters.
HF.floorType = (cfg, fk) => cfg.emitters === 'ufh' || (cfg.emitters === 'mixed' && fk === 'gf') ? 'ufh' : 'rad';

HF.load = cfg => {
  const D = (HF.data = {}), sc = cfg.scenario, air = cfg.source === 'air';
  const put = (k, v, unit = '°', dp = 1, stale) => { D[k] = {v, unit, dp, e: 'sensor.' + k, stale}; };
  const pick = (heating, dhw, idle, fault = heating, defrost = heating) => ({heating, dhw, idle, fault, defrost})[sc];
  const heat = ['heating', 'fault', 'defrost'].includes(sc), dhw = sc === 'dhw', on = sc !== 'idle';
  const hot = cfg.emitters === 'ufh' ? 0 : 9;   // radiators want a hotter supply

  // Heat pump
  put('hz', pick(52, 78, 0, 34, 60), ' Hz', 0);
  put('supply', pick(38.4 + hot, 54.0, 29.0, 36.9 + hot, 31.2));
  put('calc', 39.0 + hot);
  put('return', pick(33.4 + hot, 46.5, 28.6, 33.0 + hot, 33.0));
  put('dm', pick(-120, -260, 0, -410, -180), ' DM', 0);
  put('outdoor', 7.2);
  put('pin', pick(1.6, 2.3, 0.02, 1.1, 1.4), ' kW', 2);
  put('pout', pick(6.4, 6.9, 0, 3.3, 0), ' kW');
  put('cop', pick(4.0, 3.0, 0, 3.0, 0), '');
  put('aux', 0, ' kW');
  put('pump_heat', on ? pick(45, 70, 0) : 0, '%', 0);
  put('house_supply', pick(37.6 + hot, 31.0, 28.0, 36.0 + hot, 30.4));
  put('house_return', pick(33.0 + hot, 29.5, 27.8, 32.6 + hot, 30.0));

  // Refrigerant
  put('suction', pick(1.5, 0.5, 15, -1.0, 4.0));
  put('hotgas', pick(78, 96, 25, 70, 64));
  put('liquid', pick(34.2, 48.0, 20, 33.0, 12.0));
  put('evap', pick(-4.1, -5.5, 10, -7.0, 2.0));
  put('cond', pick(40.6, 55.8, 22, 38.0, 30.0));

  // Source
  const pvt = !air && cfg.pvt && on;
  if (!air) {
    put('pump_brine', on && sc !== 'fault' ? 62 : 0, '%', 0);
    put('brine_out', pick(-0.6, -2.1, 6.0, -3.9));
    put('brine_ground', pick(2.4, 2.2, 6.2, 2.0));
    put('pvt_out', pvt ? pick(9.6, 9.4, 6.2, 9.0) : 6.0);
    put('brine_in', pvt ? pick(8.1, 7.9, 6.2, 7.5) : pick(2.4, 2.2, 6.2, 2.0), '°', 1, sc === 'fault' ? '23 min' : undefined);
  }

  // Floors and their loops
  for (const [fk, s, r] of [['gf', 37.2, 32.6], ['ff', 37.4, 33.5], ['tf', 37.3, 33.9]]) {
    const ufh = HF.floorType(cfg, fk) === 'ufh', mixed = cfg.emitters === 'mixed' && ufh;
    const fs = heat ? (mixed ? 35.0 : s + (ufh ? 0 : hot)) : 29.5, fr = heat ? (mixed ? 31.0 : r + (ufh ? 0 : hot)) : 28.5;
    put(fk + '_s', fs);
    put(fk + '_r', fr);
    HF.ROOMS[fk].loops.forEach(([, t, target, open], j) => {
      put(`room_${fk}${j}`, t);
      put(`target_${fk}${j}`, target);
      put(`loop_${fk}${j}`, open && heat ? fr - 0.6 + j * 0.3 : t + 1);
    });
  }

  // The heating runs: sensors along the supply and return between the heat pump and the house.
  put('run_s1', D.supply.v - 0.2);
  put('run_s2', D.supply.v - 0.5, '°', 1, sc === 'fault' ? '3 days' : undefined);
  put('run_r2', D.house_return.v - 0.1);
  put('run_r1', D.house_return.v - 0.3);

  // Hot water: the tank's pockets, then sensors along the hot run and back along the return loop.
  put('tank_top', 51.0);
  put('tank_mid', dhw ? 48.5 : 47.2);
  put('tank_bot', dhw ? 41.0 : 33.5);
  put('coil_in', dhw ? 54.0 : 30.0);
  put('coil_out', dhw ? 46.2 : 30.5);
  const loop = cfg.recirc;   // the return loop keeps the hot run hot
  [['hot_out', 50.2, 50.2], ['hot_p1', 49.8, 31.0], ['hot_p2', 49.3, 27.0], ['hot_h1', 48.4, 24.0], ['hot_h2', 47.6, 22.5],
   ['circ_h2', 46.9, 22.0], ['circ_h1', 46.3, 21.8], ['circ_p2', 45.6, 21.6], ['circ_p1', 45.1, 21.5]].forEach(([k, a, b]) => put(k, loop ? a : b));
  put('cold', 11.4);
  put('pump_recirc', loop ? 100 : 0, '%', 0);
  put('immersion', cfg.immersion && cfg.immOn ? 3.0 : 0, ' kW');

  // Water: softener salt, the storage tank's pumps and inlet, and the mains meter (if fitted).
  // The pumps run whenever soft water is drawn, hot or cold; which, the card can't yet tell.
  const used = cfg.inUse, pumps = cfg.storage && used;
  put('salt', cfg.saltLow ? 12 : 46, '%', 0);
  D.salt_low = {v: cfg.saltLow ? 1 : 0, e: 'binary_sensor.salt_low'};
  put('pump_soft1', pumps ? 42 : 0, ' Hz', 0);
  put('pump_soft2', pumps && cfg.pumps > 1 ? 42 : 0, ' Hz', 0);
  put('mains_flow', cfg.meter ? (cfg.hardTap ? 4.1 : 0) + (!cfg.storage && used ? 6.2 : 0) + (cfg.filling ? 12 : 0) : 0, ' l/min');

  // What is flowing, the priority and what is wrong.
  const brine = !air && D.pump_brine.v > 0;
  const softKnown = cfg.storage ? pumps : cfg.meter && used;   // water use we can see
  HF.flows = {brine, pvt: brine && pvt, bypass: brine && !pvt, hp_out: heat || dhw, heat, coil: dhw, comp: D.hz.v > 0,
              hot: loop, recirc: loop, soft: softKnown, fill: cfg.storage && cfg.filling,
              mains: (cfg.storage && cfg.filling) || (cfg.meter && (cfg.hardTap || (!cfg.storage && used))),
              hard: cfg.meter && cfg.hardTap};
  HF.inUse = {soft: softKnown, hard: cfg.meter && cfg.hardTap};
  HF.status = {prio: pick('Heating', 'Hot water', 'Off', 'Heating', 'Defrost'), alarm: sc === 'fault' ? 'Low brine flow' : null,
               stale: Object.values(D).filter(d => d.stale)};
  HF.flags = {brinePumpWarn: sc === 'fault'};
  HF.status.warn = cfg.saltLow && cfg.softener ? 'Softener: top up salt' : null;
};
