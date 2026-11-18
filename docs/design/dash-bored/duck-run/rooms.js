// What the duck run can show, and the ways round each. All of it is made up.
//
// The Kitchen has one of each kind of thing and is placed by hand. The Long Gallery is
// the worst case for looking all the same, a room with nothing in it but eight lights,
// three of them switched together, and it is laid out by rule (layout.js). The Big House
// is the worst case for size: as many rooms like the gallery as are asked for
// (`?rooms=`, 15 if not said), side by side on one sheet, each with its own way round.
//
// Each is { name, note, loops(), other, breaks }: `loops` gives the ways round, made
// when asked for; `other` is the device someone else switches, and `breaks` the one that
// stops answering.
window.Rooms = (() => {
  const room = (id) => House.rooms.find((r) => r.id === id);
  const air = (r) => `${r.temp}° within (${r.target}° wanted), the air ${r.humidity}% damp`;

  // A room of eight lights: five by themselves and three picture lights switched together.
  const LAMPS = ["Chandelier", "Desk lamp", "Fairy lights", "Wall lantern", "Reading lamp", "Porch light", "Table lamp", "String lights"];
  function lights(id, name, n) {
    House.rooms.push({ id, name, temp: 18.9, target: 19, humidity: 43, devices: [] });
    const light = (key, title, more) => House.add(id, { id: `${id}_${key}`, name: title, kind: "light", on: Kit.hash(id + key) % 3 > 0, level: 100, watts: 12, ...more });

    for (let i = 0; i < 5; i++) {
      // Every other one can be dimmed, and the last has a colour.
      const dims = i % 2 === 0 ? { dims: true, level: 50 + ((Kit.hash(id) + i * 15) % 50) } : {};
      light(`l${i}`, LAMPS[(n + i) % LAMPS.length], { ...dims, ...(i === 4 ? { colour: "#f29bd4" } : {}) });
    }
    for (const where of ["north", "middle", "south"]) light(`p_${where}`, `Picture, ${where}`, { group: "Picture lights", watts: 5 });
    return room(id);
  }
  const gallery = lights("gallery", "Long Gallery", 0);

  Tile.add("ceiling", Tile.light(House.find("k_ceiling"), 0));
  const KITCHEN = [[0, 0, "toaster"], [1, 0, "ceiling"], [2, 0, "mangle"], [3, 0, "kettle"], [3, 1, "pegs"], [3, 2, "boiler"],
    [2, 2, "cork"], [2, 1, "blind"], [1, 1, "plug"], [1, 2, "counter"], [0, 2, "waiterLow"], [0, 1, "waiter"]];

  // The Big House: its rooms three across, a tile's width between them.
  const WINGS = ["Orangery", "Scullery", "Boot Room", "Library", "Nursery", "Pantry", "Conservatory", "Attic", "Cellar", "Landing", "Morning Room", "Workshop", "Larder", "Music Room", "Snug"];
  const ACROSS = 3, PITCH = [10, 3]; // a room is nine tiles by three
  function house() {
    const many = +new URLSearchParams(location.search).get("rooms") || 15;
    return Array.from({ length: many }, (_, n) => {
      const r = lights(`w${n}`, `${WINGS[n % WINGS.length]}${n < WINGS.length ? "" : ` ${Math.floor(n / WINGS.length) + 1}`}`, n);
      return Layout.route(r).map(([col, row, tile]) => [col + (n % ACROSS) * PITCH[0], row + Math.floor(n / ACROSS) * PITCH[1], tile]);
    });
  }

  return {
    kitchen: { name: "Kitchen", note: air(room("kitchen")), loops: () => [KITCHEN], other: "k_counter", breaks: "k_blind" },
    gallery: { name: "Long Gallery", note: air(gallery), loops: () => [Layout.route(gallery)], other: "gallery_l1", breaks: "gallery_l2" },
    house: { name: "Big House", note: "Made up, to see what a great many tiles do", loops: house, other: "w0_l1", breaks: "w0_l2" },
  };
})();
