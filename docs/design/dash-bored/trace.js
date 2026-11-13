// History for the mock-ups, and the phosphor trace that shows it. The past here is made
// up (a daily swing plus a little noise, ending on the room's present reading): the real
// thing would ask Home Assistant's recorder once and then follow pushed state changes.
window.Trace = (() => {
  const HOUR = 3.6e6, TAU = Math.PI * 2;
  const noise = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  // How far a room sits from its daily mean at a moment in time.
  function drift(room, ms) {
    const i = House.rooms.indexOf(room), hours = ms / HOUR, local = new Date(ms).getHours() + new Date(ms).getMinutes() / 60;
    const swing = room.id === "garden" ? 4.2 : 1.1;
    return Math.sin(((local - 9) / 24) * TAU) * swing + (noise(Math.floor(hours * 3) + i * 50) - 0.5) * 0.45;
  }
  const temp = (room, hoursAgo) => room.temp + drift(room, Date.now() - hoursAgo * HOUR) - drift(room, Date.now());

  // Whether a room's lights were on: evenings, and a short spell at breakfast downstairs.
  function lit(room, hoursAgo) {
    if (hoursAgo < 0.05) return House.lightsOn(room) > 0;
    const i = House.rooms.indexOf(room), h = new Date(Date.now() - hoursAgo * HOUR).getHours();
    return (h >= 17 + (i % 3) && h < 22 + (i % 2)) || (h === 7 && i < 2);
  }

  // Draw the chosen rooms on a tube. `span` is the hours across the whole screen (ten
  // divisions); `perDiv` is degrees per vertical division; the middle line is `centre`.
  function draw(canvas, rooms, { span = 24, perDiv = 2, centre = 16, colours, label = true }) {
    const ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height, dx = W / 10, dy = H / 8;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#03120b"; ctx.fillRect(0, 0, W, H);

    // The graticule: ten by eight divisions, with finer ticks along the two centre lines.
    ctx.strokeStyle = "rgba(140,255,190,.2)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= 10; i++) { ctx.moveTo(i * dx, 0); ctx.lineTo(i * dx, H); }
    for (let i = 0; i <= 8; i++) { ctx.moveTo(0, i * dy); ctx.lineTo(W, i * dy); }
    for (let i = 0; i <= 50; i++) { ctx.moveTo((i * dx) / 5, H / 2 - 4); ctx.lineTo((i * dx) / 5, H / 2 + 4); }
    for (let i = 0; i <= 40; i++) { ctx.moveTo(W / 2 - 4, (i * dy) / 5); ctx.lineTo(W / 2 + 4, (i * dy) / 5); }
    ctx.stroke();

    const y = (t) => H / 2 - ((t - centre) / perDiv) * dy;
    rooms.forEach((room, n) => {
      const colour = colours[House.rooms.indexOf(room)];
      ctx.strokeStyle = colour; ctx.shadowColor = colour; ctx.shadowBlur = 12; ctx.lineWidth = 2.2; ctx.lineJoin = "round";
      // The temperature, oldest at the left and now at the right-hand edge.
      ctx.beginPath();
      for (let px = 0; px <= W; px += 3) ctx.lineTo(px, y(temp(room, span * (1 - px / W))));
      ctx.stroke();
      // The event track: a square wave along the bottom that is high while the room was lit.
      ctx.lineWidth = 1.4; ctx.beginPath();
      const base = H - 8 - n * 16;
      for (let px = 0; px <= W; px += 3) ctx.lineTo(px, base - (lit(room, span * (1 - px / W)) ? 9 : 0));
      ctx.stroke();
      // The spot where the beam is now.
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(W - 3, y(temp(room, 0)), 3, 0, TAU); ctx.fill();
      if (label) {
        ctx.shadowBlur = 6; ctx.fillStyle = colour; ctx.font = `700 ${Math.round(H / 34)}px "Courier New", monospace`;
        ctx.fillText(`CH${House.rooms.indexOf(room) + 1} ${room.name.toUpperCase()} ${room.temp.toFixed(1)}°`, 10, H / 30 + 6 + n * Math.round(H / 26));
      }
    });
    ctx.shadowBlur = 6; ctx.fillStyle = "rgba(170,255,210,.9)"; ctx.font = `700 ${Math.round(H / 36)}px "Courier New", monospace`;
    const each = span / 10;
    ctx.fillText(`${perDiv}°/DIV   ${each >= 1 ? each + " H" : each * 60 + " MIN"}/DIV   CENTRE ${centre}°`, 10, H - 14 - rooms.length * 16);
  }

  return { temp, lit, draw, COLOURS: ["#7dffb0", "#ffd166", "#6fd3ff", "#ff9ad5", "#c9a6ff", "#b6ff6a"] };
})();
