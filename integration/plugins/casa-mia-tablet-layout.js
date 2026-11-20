//#region src/own.ts
var e = new URL(import.meta.url).pathname.includes("casa-mia-tablet-layout");
function t(e) {
	let t = window, n = t.casaMiaLayout ||= e;
	n !== e && console.warn(`CASA-MIA CARDS: ${e} loaded after ${n}, which is the Tablet Layout in use. Remove casa-mia-tablet-layout.js from the dashboard resources: Casa Mia has its own copy.`);
}
var n = {
	about: "The layout options shared by the Camera Commander (drawn by the compositor, edited on the Camera Commander page) and the Tablet Layout (laid out in the browser, edited in Lovelace): one engine, two places (compositor.commander_layout, integration/cards/src/layout.ts, checked against tests/layout_cases.json). Each option: label, help ({item} is camera or card), default, and `for` when only one of them has it. Read by the compositor's defaults, the admin page and the cards' editors.",
	main: {
		gap: {
			label: "Gap, px",
			default: 4,
			min: 0,
			max: 64,
			help: "The room between tiles and panels."
		},
		margin: {
			label: "Margin, px",
			default: 0,
			min: 0,
			max: 64,
			help: "Room left clear all round the whole area, like the gap but at its edges."
		},
		main_fit: {
			label: "Fit",
			default: "fit",
			options: [
				["fit", "Fit"],
				["fill", "Fill"],
				["crop", "Crop"],
				["own", "Own shape"],
				["fixed", "Fixed shape"]
			],
			help: "Fit: the {item} whole, in the middle of the space (around it, the background shows through). Fill: stretched to the space. Crop: fills it, edges cut off. Own shape: Main width wide at the {item}'s own shape, the panels around it (they move when its shape changes). Fixed shape: Main width wide at the shape set, the {item} whole within it."
		},
		main_width: {
			label: "Main width, %",
			default: 70,
			min: 10,
			max: 100,
			when: ["own", "fixed"],
			help: "Of the whole width; the panels share the room around it."
		},
		panel_min: {
			label: "Smallest panel, %",
			default: 8,
			min: 0,
			max: 50,
			when: ["own", "fixed"],
			help: "A panel with {item}s keeps at least this much; the main {item} shrinks (same shape) rather than squeeze it out."
		},
		main_ratio: {
			label: "Main shape",
			default: "16:9",
			when: ["fixed"],
			help: "Width:height, e.g. 16:9 or 4:3."
		},
		header_space: {
			label: "Space above the header, px",
			default: 24,
			min: 0,
			max: 64,
			for: "view",
			help: "Room above the view's header (its heading card and badges), when it has one; Home Assistant's own is 24."
		},
		narrow_below: {
			label: "Phone layout below, px",
			default: 600,
			min: 0,
			max: 2e3,
			for: "view",
			help: "Narrower than this (a phone), the view is Home Assistant's own sections instead: one column that scrolls, the main panel first, garnish left out. 0: always the Tablet Layout."
		}
	},
	responsive: {
		main_least: {
			label: "Main camera at least, %",
			default: 40,
			min: 10,
			max: 100,
			help: "The smallest the main camera may be, as a share of the biggest it could be in the space, shown whole. Cameras go into +n more before it gets smaller than this."
		},
		main_most: {
			label: "Main camera at most, %",
			default: 60,
			min: 10,
			max: 100,
			help: "Beyond this the room goes to bigger tiles. The same measure as the least."
		},
		tile_loss: {
			label: "A camera may lose up to, %",
			default: 12,
			min: 0,
			max: 30,
			help: "How far a tile may be from the tile shape, and the main camera's place from 16:9, which is how much of a camera of that shape is cropped. A camera is cropped about its centre, never squeezed."
		},
		tile_min: {
			label: "Smallest tile, px",
			default: 110,
			min: 40,
			max: 400,
			help: "The narrowest a tile may be. Smaller than this, a camera can't be made out."
		},
		tile_shape: {
			label: "Tile shape",
			default: "16:9",
			options: [
				["16:9", "16:9"],
				["3:2", "3:2"],
				["4:3", "4:3"],
				["1:1", "Square"]
			],
			help: "Every tile is held near this shape. A camera of another shape is cropped about its centre."
		},
		edges: {
			label: "Edges, in the order they fill",
			default: ["bottom", "right"],
			help: "The edges the tiles go on. The first cameras go on the first edge."
		},
		edges_tall: {
			label: "Different when the space is taller than wide",
			default: null,
			help: "A second list of edges, used when the space is taller than it is wide."
		},
		main_other: {
			label: "A main camera of another shape",
			default: "fill",
			options: [
				["fill", "Crop to fill"],
				["whole", "Show whole"],
				["follow", "Fit the layout to it"]
			],
			help: "What a main camera does when its shape is not its place's. Crop to fill and Show whole never move a tile when the main camera changes; Fit the layout to it can."
		},
		cant_fit: {
			label: "When the limits can't all be met",
			default: "find",
			options: [["find", "Find something that fits"], ["keep", "Keep to my limits"]],
			help: "Find something that fits allows other edges, then a smaller main camera, then smaller tiles. Keep to my limits shows the main camera alone and says so."
		}
	},
	panel: {
		size: {
			label: "Size",
			min: 0,
			max: 100,
			help: "Left and right: its width. Top and bottom: its height. In % of the view's, or in px (at most 45% of the view's: a smaller screen gets less)."
		},
		unit: {
			label: "Size in",
			default: "%",
			options: [["%", "% of the view"], ["px", "px"]],
			help: "% of the view: grows and shrinks with the screen. px: the same on any screen."
		},
		lines: {
			label: "Lines",
			default: 1,
			min: 1,
			max: 12,
			help: "Columns (left, right) or rows (top, bottom) its {item}s are shared between, the first taking one more when they don't share evenly."
		},
		fit: {
			label: "Fit",
			default: "cover",
			options: [
				["cover", "Fill"],
				["contain", "Whole"],
				["stack", "Stack"],
				["reverse", "Reverse"],
				["centre", "Centre"],
				["squares", "Same size"],
				["squares_spread", "Same size, spread"]
			],
			help: "Fill: equal tiles, each {item} filling its own. Whole: equal tiles, each {item} whole in its own. Stack, Reverse, Centre: each {item} whole at its own shape, edge to edge, from the start, against the end, or in the middle; the spare room is left clear (too many to fit: all shrink alike). Same size: tiles all of one size and of the Tile shape (square, 16:9…), each {item} cropped to fill its own, as thick as the panel (shared by its lines), in the middle; Same size, spread: the same, the spare room shared evenly between them and at both ends."
		},
		cell: {
			label: "Tile shape",
			default: "1:1",
			when: ["squares", "squares_spread"],
			for: "commander",
			help: "Width:height of every tile, for Same size: 1:1 for squares, 16:9 for most cameras (none cropped)."
		},
		anchor_left: {
			label: "To the left edge",
			edge: !0,
			help: "On: it runs to the view's edge and Left stops at it. Off: it stops at Left."
		},
		anchor_right: {
			label: "To the right edge",
			edge: !0,
			help: "On: it runs to the view's edge and Right stops at it. Off: it stops at Right."
		},
		hidden: {
			label: "Hidden",
			default: !1,
			help: "Off the view entirely: no room, no tiles; its {item}s kept for when it is shown again."
		},
		hide_empty: {
			label: "Hide when empty",
			default: !0,
			for: "view",
			help: "No card of it showing (each card's own visibility, or a Casa Mia section with nothing to show): it takes no room. Off: its room is kept, empty."
		}
	},
	panels: {
		left: {
			size: 15,
			fit: "cover",
			lines: 1,
			hidden: !1
		},
		top: {
			size: 18,
			fit: "cover",
			anchor_left: !1,
			anchor_right: !1,
			lines: 1,
			hidden: !1
		},
		right: {
			size: 15,
			fit: "cover",
			lines: 1,
			hidden: !1
		},
		bottom: {
			size: 20,
			fit: "cover",
			anchor_left: !0,
			anchor_right: !0,
			lines: 1,
			hidden: !1
		}
	}
};
//#endregion
//#region src/ha.ts
function r(e, t, n) {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}
var i = /* @__PURE__ */ new Set();
function a(e) {
	i.has(e) || console.warn(`CASA-MIA CARDS: ${e}`), i.add(e);
}
async function o() {
	customElements.get("ha-form") || (await (await (await window.loadCardHelpers()).createCardElement({
		type: "entities",
		entities: []
	})).constructor.getConfigElement?.(), await customElements.whenDefined("ha-form"));
}
async function s() {
	if (!customElements.get("hui-sections-view")) {
		await customElements.whenDefined("hui-view");
		let e = document.createElement("hui-view");
		e.style.display = "none", e.lovelace = {
			config: { views: [{
				type: "sections",
				sections: []
			}] },
			editMode: !1
		}, e.index = 0, document.body.append(e), await customElements.whenDefined("hui-sections-view"), e.remove();
	}
	return customElements.get("hui-sections-view");
}
var c = { shown: 0 };
function l(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function u(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !0,
		documentationURL: "https://github.com/gazoodle/casa-mia"
	});
}
var d = n.main, f = n.panel;
function p(e, t) {
	return t.options ? {
		name: e,
		selector: { select: {
			mode: "dropdown",
			options: t.options.map(([e, t]) => ({
				value: e,
				label: t
			}))
		} }
	} : typeof t.default == "boolean" || t.edge ? {
		name: e,
		selector: { boolean: {} }
	} : t.min === void 0 ? {
		name: e,
		selector: { text: {} }
	} : {
		name: e,
		selector: { number: {
			min: t.min,
			max: t.max,
			mode: "box"
		} }
	};
}
function m(e) {
	return Object.entries(d).filter(([, t]) => (!t.when || t.when.includes(e)) && (!t.for || t.for === "view")).map(([e, t]) => p(e, t));
}
function h(e) {
	return Object.entries(f).filter(([, t]) => (!t.edge || e === "top" || e === "bottom") && (!t.for || t.for === "view")).map(([e, t]) => p(e, t));
}
var g = {
	...d,
	...f
}, _ = (e) => g[e.name]?.label ?? e.name, v = (e) => g[e.name]?.help?.replaceAll("{item}", "card"), y = 100, b = (e) => e.parentElement ?? (e.getRootNode().host || null);
function x(e) {
	for (let t = e; t; t = b(t)) if (t.tagName === "HUI-CARD-PICKER") return !0;
	return !1;
}
function S(e) {
	let t = e.getBoundingClientRect().top + window.scrollY, n = window.visualViewport?.height ?? window.innerHeight;
	return Math.max(y, Math.floor(n - t));
}
function C(e) {
	return window.addEventListener("resize", e), window.visualViewport?.addEventListener("resize", e), () => {
		window.removeEventListener("resize", e), window.visualViewport?.removeEventListener("resize", e);
	};
}
function w(e, t) {
	return Object.fromEntries(Object.entries(e).filter(([e, n]) => !(e in t) || JSON.stringify(n) !== JSON.stringify(t[e])));
}
//#endregion
//#region src/over-layer/common.ts
var T = "custom:casa-mia-over-layer", E = [
	[
		"top-left",
		"top",
		"top-right"
	],
	[
		"left",
		"center",
		"right"
	],
	[
		"bottom-left",
		"bottom",
		"bottom-right"
	]
], D = {
	panel: !1,
	mode: "float",
	cover: "view",
	block: !0,
	backdrop_color: [
		0,
		0,
		0
	],
	backdrop_opacity: 40,
	backdrop_blur: 0,
	width: 480,
	anchor: "center",
	offset_x: 16,
	offset_y: 16
}, O = (e) => ({
	...D,
	...e
}), ee = (e) => !!e?.some((e) => e?.type === "custom:casa-mia-over-layer" && e.panel === !0);
function te(e) {
	let t = E.findIndex((t) => t.includes(e));
	return t < 0 ? [1, 1] : [t, E[t].indexOf(e)];
}
function k(e, t) {
	let [n, r] = te(t);
	return E[e === "scroll" ? 0 : n][r];
}
function A(e) {
	let [t, n] = te(e), r = [
		"flex-start",
		"center",
		"flex-end"
	];
	return {
		justify: r[n],
		align: r[t]
	};
}
function j(e) {
	let t = O(e), n = k(t.mode, t.anchor), r = t.mode === "full" || n === "center" || t.mode === "scroll" && n === "top" ? "" : ` ${n}`, i = {
		float: "float",
		full: "full screen",
		scroll: "scroll with the view"
	}[t.mode] + r;
	return `Over layer · ${t.panel ? "its whole panel · " : ""}${i} · ${t.cover === "window" ? "the whole window" : "the view"}${t.block ? "" : " · taps pass through"}`;
}
//#endregion
//#region src/garnish.ts
var M = (e) => e.view_layout?.garnish !== !0 && e.type !== "custom:casa-mia-over-layer", N = (e) => {
	let t = e.filter((e) => !e.hidden);
	return t.length > 0 && t.every((e) => !!e.config && !M(e.config));
};
function ne(e) {
	for (let t = e; t; t = t.parentElement ?? (t.getRootNode().host || null)) if (["CASA-MIA-TABLET-LAYOUT", "CASA-MIA-TABLET-VIEW"].includes(t.tagName)) return !0;
	return !1;
}
var re = /* @__PURE__ */ new Set([
	"custom:casa-mia-commander",
	"picture",
	"picture-entity",
	"picture-glance",
	"map",
	"iframe",
	"custom:advanced-camera-card",
	"custom:webrtc-camera"
]), P = (e) => e.view_layout?.fill ?? re.has(e.type);
function F(e, t) {
	let { view_layout: n = {}, ...r } = e, { garnish: i, ...a } = n;
	return t && (a.garnish = !0), {
		...r,
		...Object.keys(a).length && { view_layout: a }
	};
}
function ie(e) {
	return e.length === 3 && e.every((e) => typeof e == "number") ? [
		"views",
		e[0],
		"sections",
		e[1],
		"cards",
		e[2]
	] : e[0] === "views" ? e : ["views", ...e];
}
//#endregion
//#region src/layout.ts
var I = [
	"left",
	"top",
	"right",
	"bottom"
];
function L(e) {
	let t = Math.floor(e), n = e - t;
	return n > .5 ? t + 1 : n < .5 || t % 2 == 0 ? t : t + 1;
}
function ae(e) {
	let t;
	if (typeof e == "number") t = e;
	else {
		let [n, r] = String(e).trim().replace("/", ":").split(":");
		t = r === void 0 ? Number(n) : Number(n) / Number(r);
	}
	if (!(t > 0)) throw Error(`not a shape: ${e}`);
	return t;
}
var oe = (e) => n.main[e].default;
function se(e, t) {
	let n = e.main_fit ?? oe("main_fit");
	return n === "fixed" ? ae(e.main_ratio ?? oe("main_ratio")) : n === "own" ? Number((e.aspects ?? {})[t ?? ""] || 16 / 9) : null;
}
//#endregion
//#region src/tablet.ts
var ce = ["main", ...I];
function R(e, t) {
	let n = e?.view_layout;
	if (n?.panel === void 0) return t < ce.length ? {
		layer: 1,
		place: ce[t]
	} : null;
	let r = Number(n.layer ?? 1);
	return ce.includes(n.panel) && Number.isInteger(r) && r >= 1 && r <= 4 ? {
		layer: r,
		place: n.panel
	} : null;
}
function z(e, t) {
	let n = e;
	for (let e = 1; e < t; e++) n = n?.inner ?? {};
	return n ?? {};
}
function le(e, t, n) {
	return t <= 1 ? n(e) : {
		...e,
		inner: le(e.inner ?? {}, t - 1, n)
	};
}
function B(e, t) {
	let n = e[t];
	return !n || n.place === "main" ? n ? [t] : [] : e.flatMap((e, t) => e && e.layer === n.layer && e.place === n.place ? [t] : []);
}
var ue = {
	main: "Main",
	left: "Left",
	top: "Top",
	right: "Right",
	bottom: "Bottom"
};
function de(e, t) {
	let n = e[t];
	if (!n) return "";
	let r = B(e, t);
	return `${n.layer > 1 && n.place !== "main" ? `L${n.layer} ` : ""}${ue[n.place]}${r.length > 1 ? ` ${r.indexOf(t) + 1}` : ""}`;
}
function fe(e, t) {
	let n = pe(e);
	return t.length === n.length && t.every((e, t) => e.from === n[t].from) ? [...e] : [...t.map((t) => {
		let n = t.from === null ? {
			type: "grid",
			cards: []
		} : e[t.from], { layer: r, ...i } = n.view_layout ?? {};
		return {
			...n,
			view_layout: {
				...i,
				panel: t.place,
				...t.layer > 1 && { layer: t.layer }
			}
		};
	}), ...e.filter((e, t) => !R(e, t))];
}
var pe = (e) => e.flatMap((e, t) => {
	let n = R(e, t);
	return n ? [{
		from: t,
		...n
	}] : [];
}), me = (e, t) => t !== "main" && e[t]?.size === "auto";
function he(e, t) {
	let n = e.map((e) => {
		let t = typeof e.columns == "number" ? e.columns : 12;
		return Math.min(e.max_columns ?? Infinity, Math.max(e.min_columns ?? 0, t));
	});
	return t ? n.reduce((e, t) => e + t, 0) : Math.max(0, ...n);
}
var ge = (e, t, n, r = 8) => e > 0 ? Math.max(0, Math.round(e * (t + r) / (12 * n) - r)) : 0;
function _e(e, t, r, i, a, o) {
	let s = {
		width: t,
		height: r,
		aspects: {}
	};
	for (let [t, r] of Object.entries(n.main)) s[t] = e[t] ?? r.default;
	for (let c of I) {
		let l = e[c] ?? {}, u = c === "top" || c === "bottom" ? r : t, d = me(e, c) ? u > 0 ? a(c) / u * 100 : 0 : l.size;
		s[c] = {
			...n.panels[c],
			...l,
			...d !== void 0 && { size: d },
			fit: "cover",
			lines: 1,
			cameras: (o || !l.hidden) && i(c) ? [c] : []
		};
	}
	return s;
}
var V = [
	"top",
	"right",
	"bottom",
	"left"
];
function ve(e) {
	let t = (e) => Math.max(0, Math.trunc(Number(e) || 0));
	if (e && typeof e == "object") {
		let n = e;
		return [
			t(n.top),
			t(n.right),
			t(n.bottom),
			t(n.left)
		];
	}
	return [
		t(e),
		t(e),
		t(e),
		t(e)
	];
}
var ye = (e, t) => e == null || e === "" ? t : Math.max(0, Number(e) || 0);
function be(e, t) {
	let r = z(e, t), i = Number(e.gap ?? n.main.gap.default);
	return {
		gap: i,
		middle: Object.fromEntries(I.map((e) => [e, ye(r[e]?.gap, i)]))
	};
}
function xe(e, t, n) {
	let r = (e) => t ? e.share !== void 0 : e.length !== void 0, i = e.map((e) => !r(e) && e.size === "fill"), a = e.map((e) => !r(e) && e.size === void 0);
	if (e.length === 1) return a.map((e, t) => e || i[t]);
	if (i.some(Boolean) || n === "centre" || n === "end") return i;
	let o = e.map((e, t) => t), s = [...o.filter((t) => !e[t].hold), ...o.filter((t) => e[t].hold)].filter((e) => a[e]).at(-1);
	return o.map((e) => e === s);
}
function Se(e, t, n, r, i = 4, a) {
	let o = n.map((e, t) => t), [s, c] = [o.filter((e) => !n[e].hold), o.filter((e) => n[e].hold)], l = (e) => n[e].gapAfter ?? t, u = (e) => e.slice(0, -1).reduce((e, t) => e + l(t), 0), d = Math.max(0, e - u([...s, ...c])), f = xe(n, r, a), p = n.map((e, t) => f[t] ? 0 : r ? e.share === void 0 ? e.wide || d / i : d * e.share : e.length ?? e.tall ?? 0), m = p.reduce((e, t) => e + t, 0), h = f.filter(Boolean).length, g = m > d ? d / m : 1, _ = p.map((e, t) => f[t] ? Math.max(0, d - m) / h : e * g), v = (e) => e.reduce((e, t) => e + _[t], 0) + u(e), y = e - (c.length ? v(c) + (s.length ? l(s[s.length - 1]) : 0) : 0) - v(s), b = h ? 0 : a === "end" ? y : a === "centre" ? y / 2 : 0, x = [], S = Math.max(0, b);
	for (let e of s) [x[e], S] = [S, S + _[e] + l(e)];
	S = e - (c.length ? v(c) : 0);
	for (let e of c) [x[e], S] = [S, S + _[e] + l(e)];
	return o.map((e) => {
		let t = Math.round(x[e]);
		return {
			at: t,
			length: Math.round(x[e] + _[e]) - t
		};
	});
}
var Ce = (e, t) => Math.floor(e / t);
function we(e, t, r) {
	let { width: i, height: a } = e, o = se(e, r), s = (t) => e[t].cameras.length > 0, c = (t, n) => s(t) ? e[t].unit === "px" ? Math.min(L(e[t].size * (e.scale ?? 1)), Ce(n * 45, 100)) : L(n * e[t].size / 100) : 0, l = (t, r) => {
		let i = `anchor_${r}`;
		return !!(e[t][i] ?? n.panels[t][i]);
	}, u, d, f, p, m = 0, h = 0;
	if (o === null) [u, d, f, p] = [
		c("left", i),
		c("right", i),
		c("top", a),
		c("bottom", a)
	];
	else {
		let r = Number(e.panel_min ?? n.main.panel_min.default), c = (e, n, i) => (s(n) ? L(e * r / 100) + t[n] : 0) + (s(i) ? L(e * r / 100) + t[i] : 0), l = i - c(i, "left", "right"), g = a - c(a, "top", "bottom");
		m = Math.min(L(i * Number(e.main_width ?? n.main.main_width.default) / 100), l), h = L(m / o), h > g && ([h, m] = [g, L(g * o)]);
		let _ = (e, n, r) => {
			let [i, a] = [s(n), s(r)], o = Math.max(e - (i ? t[n] : 0) - (a ? t[r] : 0), 0);
			return i && a ? [Ce(o, 2), o - Ce(o, 2)] : i ? [o, 0] : a ? [0, o] : [0, 0];
		};
		[u, d] = _(i - m, "left", "right"), [f, p] = _(a - h, "top", "bottom");
	}
	let g = u + (u ? t.left : 0), _ = i - d - (d ? t.right : 0), v = f + (f ? t.top : 0), y = a - p - (p ? t.bottom : 0), b = (e, t, n) => {
		let r = l(e, "left") ? 0 : g;
		return [
			r,
			t,
			(l(e, "right") ? i : _) - r,
			n
		];
	}, x = (e, t, n) => {
		let r = f && l("top", n) ? v : 0;
		return [
			e,
			r,
			t,
			(p && l("bottom", n) ? y : a) - r
		];
	}, S = {
		top: b("top", 0, f),
		bottom: b("bottom", a - p, p),
		left: x(0, u, "left"),
		right: x(i - d, d, "right")
	}, C = [
		g,
		v,
		_ - g,
		y - v
	];
	return o !== null && (m = Math.min(m, _ - g), h = Math.min(h, y - v), C = [
		g + Ce(_ - g - m, 2),
		v + Ce(y - v - h, 2),
		m,
		h
	]), {
		mid: C,
		edges: Object.fromEntries(I.map((e) => [e, s(e) ? S[e] : null]))
	};
}
function Te() {
	let e = [];
	return {
		add(t, n, r) {
			let i = { at: t }, a = n ? e.indexOf(n) + 1 : e.length, o = r ? e.indexOf(r) : e.length;
			for (; a < o && e[a].at <= t;) a++;
			return e.splice(a, 0, i), i;
		},
		n: (t) => e.indexOf(t) + 1,
		tracks: (t) => e.slice(1).map((n, r) => t(n.at - e[r].at)).join(" ")
	};
}
var Ee = (e) => Math.max(1, ...e.flatMap((e) => e && e.place !== "main" ? [e.layer] : []));
function De(e, t, n, r, i = 4, a = !1) {
	let o = Ee(r);
	if (!n || o < 2 || a) return Oe(e, t, n, r, i, n, a);
	let s = Oe(e, t, !1, r, i, !0);
	if (s.boxes.length < o) return Oe(e, t, n, r, i);
	let c = e;
	for (let t = 1; t < o; t++) {
		let [n, r] = [s.boxes[t - 1], s.boxes[t]], { middle: i } = be(e, t), a = (e, t) => e > 0 ? e - i[t] : 0, o = {
			left: a(r[0] - n[0], "left"),
			top: a(r[1] - n[1], "top"),
			right: a(n[0] + n[2] - r[0] - r[2], "right"),
			bottom: a(n[1] + n[3] - r[1] - r[3], "bottom")
		};
		c = le(c, t, (e) => ({
			...e,
			...Object.fromEntries(I.map((t) => [t, {
				...e[t],
				size: o[t],
				unit: "px"
			}]))
		}));
	}
	let l = s.boxes[o - 1];
	return Oe(c, [t[0] + s.canvas[0] - l[2], t[1] + s.canvas[1] - l[3]], !0, r, i);
}
function Oe(e, [t, n], r, i, a, o = r, s = !1) {
	let c = Math.max(0, Math.floor((Math.min(t, n) - 1) / 2)), l = ve(e.margin).map((e) => Math.min(e, c)), u = l.map((e) => !r || s || e <= 25 ? e : 0), [d, f] = [t - u[1] - u[3], n - u[0] - u[2]], p = Ee(i), m = i.findIndex((e) => e?.place === "main" && e.shows), [h, g] = [Te(), Te()], _ = [], v = [], y = [], [b, x, S, C] = [
		h.add(0),
		h.add(d),
		g.add(0),
		g.add(f)
	];
	for (let t = 1; t <= p; t++) {
		let n = [
			b.at,
			S.at,
			x.at - b.at,
			C.at - S.at
		];
		v.push(n);
		let s = (e) => i.flatMap((n, r) => n && n.layer === t && n.place === e && n.shows ? [r] : []), c = i.some((e) => e?.shows && e.place !== "main" && e.layer > t), l = (e) => e === "main" ? m >= 0 || t < p && c : s(e).length > 0, u = (e) => Math.max(0, ...s(e).map((t) => (e === "top" || e === "bottom" ? i[t].tall : i[t].wide) ?? 0)), d = z(e, t), f = {
			..._e({
				...e,
				...Object.fromEntries(I.map((e) => [e, d[e]])),
				...t < p && { main_fit: "fit" }
			}, n[2], n[3], l, u, o),
			margin: 0
		}, w = be(e, t), { mid: T, edges: E } = we(f, w.middle, l("main") ? "main" : null), D = (e) => E[e] ?? [
			0,
			0,
			0,
			0
		], [O, ee, te, k] = [
			D("left")[2],
			D("top")[3],
			D("right")[2],
			D("bottom")[3]
		], A = w.middle, j = h.add(b.at + O, b, x), M = h.add(b.at + (O && O + A.left), j, x), N = h.add(x.at - (te && te + A.right), M, x), ne = h.add(x.at - te, N, x), re = g.add(S.at + ee, S, C), P = g.add(S.at + (ee && ee + A.top), re, C), F = g.add(C.at - (k && k + A.bottom), P, C), ie = g.add(C.at - k, F, C), L = (e, t) => !!f[e][`anchor_${t}`], ae = (e, t) => E[e] !== null && L(e, t), oe = {
			top: {
				cross: [S, re],
				along: [L("top", "left") ? b : M, L("top", "right") ? x : N]
			},
			bottom: {
				cross: [ie, C],
				along: [L("bottom", "left") ? b : M, L("bottom", "right") ? x : N]
			},
			left: {
				cross: [b, j],
				along: [ae("top", "left") ? P : S, ae("bottom", "left") ? F : C]
			},
			right: {
				cross: [ne, x],
				along: [ae("top", "right") ? P : S, ae("bottom", "right") ? F : C]
			}
		};
		for (let e of I) {
			if (!E[e]) continue;
			let n = e === "top" || e === "bottom", r = n ? h : g, { cross: o, along: c } = oe[e], [l, u] = c, f = s(e), p = Se(u.at - l.at, w.gap, f.map((e) => i[e]), n, a, d[e]?.arrange), m = f.map((e, t) => t).sort((e, t) => p[e].at - p[t].at), v = l, b = [];
			m.forEach((e, t) => {
				let [i, a] = [l.at + p[e].at, l.at + p[e].at + p[e].length], s = t === 0 && i === l.at ? l : r.add(i, v, u), c = t === m.length - 1 && a === u.at ? u : r.add(a, s, u);
				_[f[e]] = n ? {
					col: [s, c],
					row: o
				} : {
					col: o,
					row: [s, c]
				}, b.push([
					f[e],
					s,
					c
				]), v = c;
			});
			let x = o[1].at > o[0].at, S = {
				top: [re, P],
				bottom: [F, ie],
				left: [j, M],
				right: [N, ne]
			};
			x && y.push({
				id: `${t}.${e}`,
				edge: {
					layer: t,
					place: e
				},
				size: A[e],
				across: n,
				...n ? {
					col: c,
					row: S[e]
				} : {
					col: S[e],
					row: c
				}
			}), b.slice(1).forEach(([, e], t) => {
				let [r, , a] = b[t];
				y.push({
					id: `after.${r}`,
					after: r,
					size: i[r].gapAfter ?? w.gap,
					across: !n,
					...n ? {
						col: [a, e],
						row: o
					} : {
						col: o,
						row: [a, e]
					}
				});
			});
		}
		if (t < p) {
			if (!T) break;
			[b, x, S, C] = [
				M,
				N,
				P,
				F
			];
		} else if (m >= 0 && T) {
			let e = [
				n[0] + T[0],
				n[1] + T[1],
				T[2],
				T[3]
			], t = T[2] < N.at - M.at || T[3] < F.at - P.at;
			_[m] = {
				col: [M, N],
				row: [P, F],
				rect: e,
				...t && {
					width: T[2],
					centred: !0,
					...!r && { height: T[3] }
				}
			};
		}
	}
	return {
		inset: l,
		canvas: [d, f],
		columns: h.tracks((e) => r ? `minmax(auto, ${e}fr)` : `${e}px`),
		rows: g.tracks((e) => s ? `minmax(auto, ${e}fr)` : r ? `minmax(${e}px, auto)` : `${e}px`),
		places: i.map((e, t) => {
			let n = _[t];
			if (!n) return null;
			let { col: r, row: i, rect: a, ...o } = n;
			return {
				column: `${h.n(r[0])} / ${h.n(r[1])}`,
				row: `${g.n(i[0])} / ${g.n(i[1])}`,
				rect: a ?? [
					r[0].at,
					i[0].at,
					r[1].at - r[0].at,
					i[1].at - i[0].at
				],
				...o
			};
		}),
		boxes: v,
		gaps: y.map(({ col: e, row: t, ...n }) => ({
			...n,
			column: [h.n(e[0]), h.n(e[1])],
			row: [g.n(t[0]), g.n(t[1])],
			rect: [
				e[0].at,
				t[0].at,
				e[1].at - e[0].at,
				t[1].at - t[0].at
			]
		}))
	};
}
function ke(e, t, n = (e) => e.rect) {
	return e.flatMap((e) => {
		let r = t(e);
		if (!r) return [];
		let [i, a, o, s] = n(e), [c, l, u] = [
			Number(r.knock) || 0,
			Number(r.extend_start) || 0,
			Number(r.extend_end) || 0
		], d = Array.isArray(r.color) ? `rgb(${r.color.join(", ")})` : r.color ?? "#000", f = {
			id: e.id,
			color: d,
			width: r.width === void 0 ? 1 : Math.max(0, Number(r.width) || 0),
			style: r.style ?? "solid"
		};
		return e.across ? [{
			...f,
			x1: i - l,
			y1: a + s / 2 + c,
			x2: i + o + u,
			y2: a + s / 2 + c
		}] : [{
			...f,
			x1: i + o / 2 + c,
			y1: a - l,
			x2: i + o / 2 + c,
			y2: a + s + u
		}];
	});
}
var Ae = /* @__PURE__ */ new Map();
function je(e, t) {
	let n = `${e}/${t}`, r = Ae.get(n);
	return r || Ae.set(n, r = { naturals: {} }), r;
}
//#endregion
//#region src/view/common.ts
var Me = (e) => ve(e).map((e) => e + 2);
function Ne(e, t) {
	let n = [];
	for (let r = e; r; r = r.parentElement ?? (r.getRootNode().host || null)) {
		let e = r.getBoundingClientRect?.().height ?? 0;
		e > t + 1 && n.push(`${r.tagName.toLowerCase()} ${Math.round(e)}`);
	}
	return n.length ? `\ntoo tall: ${n.join("\n")}` : "";
}
function Pe(e, t) {
	let n, r = !1;
	return e.connection.subscribeMessage((e) => t(e?.tablet_view ?? {}), { type: "casa_mia/settings/subscribe" }).then((e) => r ? e() : n = e).catch(() => t({})), () => {
		r = !0, n?.();
	};
}
var Fe = (e) => Math.max(0, Number(e.header_space ?? n.main.header_space.default) || 0), [Ie, Le] = [56, 8], Re = "casa-mia-tablet-dimensions", ze = "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z", Be = "M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z";
function Ve(e) {
	return (e?.querySelector("hui-grid-section"))?.shadowRoot?.querySelector(".container")?.offsetHeight ?? 0;
}
var He = (e) => Math.max(0, Number(e.narrow_below ?? n.main.narrow_below.default) || 0), Ue = [
	"top",
	"main",
	"left",
	"right",
	"bottom"
], We = (e) => String(e && Ue.includes(e) ? Ue.indexOf(e) : Ue.length);
function Ge(e, t, n) {
	return t <= 0 ? !1 : e <= 0 ? n : e < t + (n ? 24 : 0);
}
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var Ke = globalThis, qe = Ke.ShadowRoot && (Ke.ShadyCSS === void 0 || Ke.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Je = Symbol(), Ye = /* @__PURE__ */ new WeakMap(), Xe = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== Je) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (qe && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = Ye.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && Ye.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, Ze = (e) => new Xe(typeof e == "string" ? e : e + "", void 0, Je), Qe = (e, ...t) => new Xe(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, Je), $e = (e, t) => {
	if (qe) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = Ke.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, et = qe ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return Ze(t);
})(e) : e, { is: tt, defineProperty: nt, getOwnPropertyDescriptor: rt, getOwnPropertyNames: it, getOwnPropertySymbols: at, getPrototypeOf: ot } = Object, st = globalThis, ct = st.trustedTypes, lt = ct ? ct.emptyScript : "", ut = st.reactiveElementPolyfillSupport, dt = (e, t) => e, ft = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? lt : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, pt = (e, t) => !tt(e, t), mt = {
	attribute: !0,
	type: String,
	converter: ft,
	reflect: !1,
	useDefault: !1,
	hasChanged: pt
};
Symbol.metadata ??= Symbol("metadata"), st.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var ht = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = mt) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && nt(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = rt(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? mt;
	}
	static _$Ei() {
		if (this.hasOwnProperty(dt("elementProperties"))) return;
		let e = ot(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(dt("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(dt("properties"))) {
			let e = this.properties, t = [...it(e), ...at(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(et(e));
		} else e !== void 0 && t.push(et(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return $e(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? ft : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? ft : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? pt)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
ht.elementStyles = [], ht.shadowRootOptions = { mode: "open" }, ht[dt("elementProperties")] = /* @__PURE__ */ new Map(), ht[dt("finalized")] = /* @__PURE__ */ new Map(), ut?.({ ReactiveElement: ht }), (st.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var gt = globalThis, _t = (e) => e, vt = gt.trustedTypes, yt = vt ? vt.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, bt = "$lit$", H = `lit$${Math.random().toFixed(9).slice(2)}$`, xt = "?" + H, St = `<${xt}>`, U = document, Ct = () => U.createComment(""), wt = (e) => e === null || typeof e != "object" && typeof e != "function", Tt = Array.isArray, Et = (e) => Tt(e) || typeof e?.[Symbol.iterator] == "function", Dt = "[ 	\n\f\r]", Ot = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, kt = /-->/g, At = />/g, W = RegExp(`>|${Dt}(?:([^\\s"'>=/]+)(${Dt}*=${Dt}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), jt = /'/g, Mt = /"/g, Nt = /^(?:script|style|textarea|title)$/i, G = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), K = Symbol.for("lit-noChange"), q = Symbol.for("lit-nothing"), Pt = /* @__PURE__ */ new WeakMap(), J = U.createTreeWalker(U, 129);
function Ft(e, t) {
	if (!Tt(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return yt === void 0 ? t : yt.createHTML(t);
}
var It = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = Ot;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === Ot ? c[1] === "!--" ? o = kt : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = W) : (Nt.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = W) : o = At : o === W ? c[0] === ">" ? (o = i ?? Ot, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? W : c[3] === "\"" ? Mt : jt) : o === Mt || o === jt ? o = W : o === kt || o === At ? o = Ot : (o = W, i = void 0);
		let d = o === W && e[t + 1].startsWith("/>") ? " " : "";
		a += o === Ot ? n + St : l >= 0 ? (r.push(s), n.slice(0, l) + bt + n.slice(l) + H + d) : n + H + (l === -2 ? t : d);
	}
	return [Ft(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Lt = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = It(t, n);
		if (this.el = e.createElement(l, r), J.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = J.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(bt)) {
					let t = u[o++], n = i.getAttribute(e).split(H), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Vt : r[1] === "?" ? Ht : r[1] === "@" ? Ut : Bt
					}), i.removeAttribute(e);
				} else e.startsWith(H) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Nt.test(i.tagName)) {
					let e = i.textContent.split(H), t = e.length - 1;
					if (t > 0) {
						i.textContent = vt ? vt.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], Ct()), J.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], Ct());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === xt) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(H, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += H.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = U.createElement("template");
		return n.innerHTML = e, n;
	}
};
function Y(e, t, n = e, r) {
	if (t === K) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = wt(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = Y(e, i._$AS(e, t.values), i, r)), t;
}
var Rt = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? U).importNode(t, !0);
		J.currentNode = r;
		let i = J.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new zt(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Wt(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = J.nextNode(), a++);
		}
		return J.currentNode = U, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, zt = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = q, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = Y(this, e, t), wt(e) ? e === q || e == null || e === "" ? (this._$AH !== q && this._$AR(), this._$AH = q) : e !== this._$AH && e !== K && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? Et(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== q && wt(this._$AH) ? this._$AA.nextSibling.data = e : this.T(U.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Lt.createElement(Ft(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Rt(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Pt.get(e.strings);
		return t === void 0 && Pt.set(e.strings, t = new Lt(e)), t;
	}
	k(t) {
		Tt(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(Ct()), this.O(Ct()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = _t(e).nextSibling;
			_t(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Bt = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = q, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = q;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = Y(this, e, t, 0), a = !wt(e) || e !== this._$AH && e !== K, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = Y(this, r[n + o], t, o), s === K && (s = this._$AH[o]), a ||= !wt(s) || s !== this._$AH[o], s === q ? e = q : e !== q && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === q ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Vt = class extends Bt {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === q ? void 0 : e;
	}
}, Ht = class extends Bt {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== q);
	}
}, Ut = class extends Bt {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = Y(this, e, t, 0) ?? q) === K) return;
		let n = this._$AH, r = e === q && n !== q || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== q && (n === q || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Wt = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		Y(this, e);
	}
}, Gt = gt.litHtmlPolyfillSupport;
Gt?.(Lt, zt), (gt.litHtmlVersions ??= []).push("3.3.3");
var Kt = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new zt(t.insertBefore(Ct(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, qt = globalThis, X = class extends ht {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Kt(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return K;
	}
};
X._$litElement$ = !0, X.finalized = !0, qt.litElementHydrateSupport?.({ LitElement: X });
var Jt = qt.litElementPolyfillSupport;
Jt?.({ LitElement: X }), (qt.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/view/styles.ts
var Yt = Qe`
  :host {
    flex: 1 1 0 !important;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }
  .wrapper {
    max-width: none;
    min-height: 0;
    height: 100%;
    box-sizing: border-box;
    padding: 0;
  }
  /* HA's extra space above (top_margin), a margin on the wrapper: out of its height. */
  :host(:not([editing])) .wrapper.top-margin {
    height: calc(100% - var(--top-margin));
  }
  .container {
    display: block;
    position: relative;
    flex: 1 1 0;
    min-height: 0;
    padding: 0;
  }
  .content {
    display: grid;
    position: absolute;
    inset: 0;
    gap: 0;
    align-items: stretch; /* HA's: start, so a section was only as tall as its cards */
    justify-content: stretch;
  }
  .section {
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    box-sizing: border-box; /* its padding inside its room */
  }
  /* Edit mode: the panels grow to what they hold and the view scrolls, editors and all. */
  :host([editing]) {
    overflow: auto;
  }
  :host([editing]) .wrapper {
    height: auto;
    min-height: 100%;
    padding: 0 calc(var(--column-gap) / 2); /* HA's spacing back, for its editors */
  }
  :host([editing]) .container {
    flex: none;
    padding: calc(var(--row-gap) / 2) 0;
  }
  :host([editing]) .content {
    position: relative;
  }
  /* half each side of the engine's own gap track, so HA's spacing between two panels (a
   * margin, not the grid's gap: that would come between every track, and layers and stacks
   * make many) */
  :host([editing]) .section {
    overflow: visible;
    margin: calc(var(--row-gap) / 2) calc(var(--column-gap) / 2);
    /* Never too small to edit, whatever its share (its rows and columns grow to it, and the
     * view scrolls): as tall as what it holds, as wide as its least (cmTools: its chip and
     * HA's frame). Its cards' own widths count for nothing (contained), only that. */
    min-height: min-content;
    contain: inline-size;
  }
  /* A panel's section is its cell's height, so a card can fill it (FILL). */
  :host(:not([editing])) .section-container,
  :host(:not([editing])) hui-section,
  :host(:not([editing])) hui-grid-section {
    display: block;
    height: 100%;
  }
  :host(:not([editing])) hui-grid-section {
    display: flex;
  }
  /* The footer under the panels, not over them (HA's sticks it a row gap above the bottom),
   * in edit mode too; or, as HA's, floating over them (layout footer: float). */
  :host(:not([cm-footer-float])) hui-view-footer {
    position: static;
  }
  :host([cm-footer-float]:not([editing])) hui-view-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
  }
  /* Edit mode: the Tablet Layout button over the panels, and each panel's name. */
  .cm-bar {
    display: flex;
    justify-content: flex-start;
    padding: 12px 0 0 20px;
  }
  .cm-bar label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--primary-text-color);
    cursor: pointer;
  }
  .cm-bar input {
    width: 18px;
    height: 18px;
    accent-color: var(--primary-color);
  }
  :host([editing]) .section {
    position: relative;
  }
  .cm-tools {
    position: absolute;
    top: 6px;
    left: 10px;
    z-index: 2;
    display: flex;
    gap: 4px;
    max-width: calc(100% - 20px);
  }
  .cm-ends {
    position: absolute;
    inset: 0;
    z-index: 6; /* over HA's sticky footer (4) */
    pointer-events: none;
  }
  /* The marks are the shared chips (pills.ts; docs/design/pills-and-chips.html, tl-*), in
   * the theme's colour, filled; here only where they sit. */
  .cm-tools,
  .cm-ends,
  .cm-dims {
    --tone: var(--primary-color);
  }
  .cm-ends button {
    position: absolute;
    pointer-events: auto;
  }
  .cm-ends button.cm-line,
  .cm-ends button.cm-lock {
    transform: translate(-50%, -50%);
  }
  .cm-tools .cm-tool {
    padding: 3px 8px;
  }
  .cm-tools.cm-narrow .cm-tool {
    display: none;
  }
  /* A hidden edge, shown in edit mode to be shown again: dimmed and hatched. */
  .section.cm-hidden > :not(.cm-tools) {
    opacity: 0.45;
  }
  .section.cm-hidden::after,
  .section.cm-garnish-only::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    border-radius: var(--ha-section-border-radius, 12px);
    background: repeating-linear-gradient(-45deg, transparent 0 8px, color-mix(in srgb, var(--primary-text-color) 18%, transparent) 8px 10px);
  }
  .cm-lines {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }
  .cm-lines svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .cm-dims {
    position: absolute;
    inset: 0;
    z-index: 5; /* over HA's sticky footer (4) */
    pointer-events: none;
    color: var(--primary-color);
  }
  .cm-dims svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .cm-dims line {
    stroke: currentColor;
    stroke-width: 1;
  }
  .cm-dims button {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: auto;
  }
  .cm-dims button.cm-size {
    transform: translate(-100%, -100%);
  }
  /* Edit mode: each panel's room outlined, in its chip's colour (the identify outline, for
   * debugging, over it when on). */
  :host([editing]) .section,
  :host([editing]) hui-view-header,
  :host([editing]) hui-view-footer {
    outline: 1px solid var(--primary-color);
    outline-offset: -1px;
  }
  :host([cm-identify]) .section,
  :host([cm-identify]) hui-view-header,
  :host([cm-identify]) hui-view-footer {
    outline: var(--cm-outline, 1px solid red);
    outline-offset: -1px;
  }
  .section.cm-off,
  .create-section-container {
    display: none;
  }
  .cm-debug {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 10;
    padding: 2px 6px;
    font: 12px monospace;
    color: #000;
    background: rgb(255 214 10 / 0.7); /* see-through enough for what is under it */
    pointer-events: none;
    white-space: pre-wrap;
    max-width: calc(100% - 16px);
  }
`, Xt = Qe`
  :host([cm-narrow]) .create-section-container {
    display: none;
  }
`, Zt = new CSSStyleSheet();
Zt.replaceSync("\n  .add { min-width: var(--row-height, 56px); } /* edit mode: HA's Add card button never narrower than tall */\n  :host([cm-fill]) ha-sortable { display: contents; }\n  :host([cm-fill]) .container { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; margin: 0; }\n  :host([cm-fill]) .card { flex: none; }\n  :host([cm-fill]) .card:has(> [cm-fill]) { flex: 1 1 0; min-height: 0; }\n  [cm-fill], [cm-fill] > * { display: block; height: 100%; }\n  .card:has(> [cm-garnish]) { display: none; } /* narrow (HA's own sections): garnish left out */\n");
var Qt = ".cm-pill, .cm-chip {\n  --surface: var(--card-background-color, #fff);\n  --muted: var(--secondary-text-color, #727272);\n  --accent: var(--primary-color, #03a9f4);\n  --on-accent: var(--text-primary-color, #fff);\n  --good: var(--success-color, #43a047);\n  --warn: var(--warning-color, #ffa600);\n  --bad: var(--error-color, #db4437);\n  --bark: #d8885a;\n  --mono: var(--ha-font-family-code, monospace);\n}\n.cm-pill{box-sizing:border-box;background:color-mix(in srgb, var(--tone,var(--muted)) 14%, transparent);max-width:100%;color:var(--tone,var(--muted));letter-spacing:.04em;text-transform:uppercase;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;border-radius:12px;padding:3px 9px;font-size:10px;font-weight:600;line-height:16px;display:inline-block;overflow:hidden}.cm-pill.cm-filled{background:var(--tone,var(--muted));color:var(--on-accent)}.cm-pill.cm-outline{box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--tone,var(--muted)) 55%, transparent);background:0 0}.cm-pill.cm-fixed{text-align:center;width:104px}.cm-chip{box-sizing:border-box;box-shadow:inset 0 0 0 1px var(--tone,var(--muted));background:var(--surface);color:var(--tone,var(--muted));font:inherit;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;cursor:pointer;border:none;border-radius:12px;justify-content:center;align-items:center;gap:4px;padding:3px 10px;font-size:10px;font-weight:500;line-height:16px;transition:box-shadow .15s,filter .15s;display:inline-flex}.cm-chip.cm-on{box-shadow:none;background:var(--tone,var(--accent));color:var(--on-accent)}.cm-chip.cm-icon{border-radius:50%;width:26px;height:26px;padding:4px}.cm-chip.cm-icon svg{fill:currentColor;width:16px;height:16px;display:block}.cm-chip.cm-mono{font:11px/14px var(--mono);letter-spacing:0;text-transform:none;border-radius:8px;padding:1px 6px}.cm-chip.cm-quiet{box-shadow:none;background:color-mix(in srgb, var(--surface) 80%, transparent);color:var(--muted)}.cm-chip:disabled{opacity:.4;cursor:default}.cm-chip:not(:disabled):hover,.cm-chip:focus-visible{box-shadow:inset 0 0 0 1px var(--tone,var(--muted)), 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent);filter:brightness(1.08);outline:none}.cm-chip.cm-on:not(:disabled):hover,.cm-chip.cm-on:focus-visible,.cm-chip.cm-quiet:not(:disabled):hover{box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent)}.cm-good{--tone:var(--good)}.cm-accent{--tone:var(--accent)}.cm-warn{--tone:var(--warn)}.cm-bad{--tone:var(--bad)}.cm-muted{--tone:var(--muted)}.cm-bark{--tone:var(--bark)}", $t = Ze(Qt), en = (e) => class extends e {
	constructor(...e) {
		super(...e), this.cmDebug = !1, this.cmApp = {}, this.cmLayout = {}, this.cmBoxes = [], this.cmGapsNow = [], this.cmSections = [], this.cmColumns = 4, this.cmFrame = 0, this.cmAdding = !1, this.cmNarrow = !1, this.cmSeen = new ResizeObserver(() => this.cmLater()), this.cmLater = () => {
			cancelAnimationFrame(this.cmFrame), this.cmFrame = requestAnimationFrame(() => this.cmPlace());
		};
	}
	static {
		this.styles = [
			e.styles,
			$t,
			Xt,
			Yt
		];
	}
	get cmSeenOut() {
		return je(location.pathname.split("/")[1], this.index);
	}
	setConfig(e) {
		super.setConfig(e), this.cmDebug = !!e.debug, this.cmMarks(), this.cmLayout = e.layout ?? {}, this.cmSections = e.sections ?? [], this.cmColumns = Number(e.max_columns) || 4;
	}
	connectedCallback() {
		super.connectedCallback(), c.shown++, this.cmHolder = this.parentElement?.parentElement, this.cmPage(!this.cmNarrow), this.cmSeen.observe(this), this.cmStop = C(() => this.cmLater()), this.addEventListener("section-visibility-changed", this.cmLater), this.addEventListener("card-visibility-changed", this.cmLater);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), c.shown--, this.cmPage(!1), this.cmSeen.disconnect(), this.cmStop?.(), this.removeEventListener("section-visibility-changed", this.cmLater), this.removeEventListener("card-visibility-changed", this.cmLater), cancelAnimationFrame(this.cmFrame), this.cmUnwatch?.(), this.cmUnwatch = void 0;
	}
	cmPage(e) {
		for (let [t, n] of [[this.cmHolder, "min-height"], [document.documentElement, "height"]]) e ? t?.style.setProperty(n, "100dvh") : t?.style.removeProperty(n);
	}
	cmToNarrow(e) {
		this.cmNarrow = e, this.toggleAttribute("cm-narrow", e);
		let t = this.shadowRoot, n = Yt.styleSheet;
		if (t && n) {
			let r = t.adoptedStyleSheets.filter((e) => e !== n);
			t.adoptedStyleSheets = e ? r : [...r, n];
		} else console.warn("CASA-MIA CARDS: Tablet Layout: this browser keeps its styles in <style>, so the phone layout can't take them out");
		this.cmPage(!e), console.info(`CASA-MIA CARDS: Tablet Layout: ${e ? "narrow, Home Assistant's own sections" : "the Tablet Layout"} at ${this.clientWidth} px`);
	}
	cmMarks() {
		this.toggleAttribute("cm-identify", this.cmDebug || !!this.cmApp.identify_panels), this.style.setProperty("--cm-outline", this.cmApp.identify_outline || "1px solid red");
	}
	updated(e) {
		super.updated?.(e);
		let t = !!this.lovelace?.editMode;
		this.toggleAttribute("editing", t);
		let n = this.shadowRoot?.querySelector(".container > ha-sortable");
		n && (n.disabled = !0), t && this.cmComplete(), !this.cmUnwatch && this.hass && (this.cmUnwatch = Pe(this.hass, (e) => {
			this.cmApp = e, this.cmMarks(), this.cmLater();
		})), this.cmLater();
	}
	cmComplete() {
		let e = this.lovelace.config.views[this.index].sections ?? [], t = ce.filter((t) => !e.some((e, n) => R(e, n)?.layer === 1 && R(e, n)?.place === t));
		if (this.isStrategy || this.cmAdding || !t.length) return;
		this.cmAdding = !0;
		let n = t.map((e) => ({
			type: "grid",
			cards: [],
			view_layout: { panel: e }
		}));
		this.cmSaveView((e) => ({
			...e,
			sections: [...e.sections ?? [], ...n]
		})).finally(() => this.cmAdding = !1);
	}
	cmSaveView(e) {
		let t = this.lovelace.config, n = t.views.map((t, n) => n === this.index ? e(t) : t);
		return Promise.resolve(this.lovelace.saveConfig({
			...t,
			views: n
		}));
	}
	get cmDimsOn() {
		try {
			return localStorage.getItem(Re) !== "off";
		} catch {
			return !0;
		}
	}
	set cmDimsOn(e) {
		try {
			localStorage.setItem(Re, e ? "on" : "off");
		} catch {}
	}
	cmLock(e, t) {
		if (t === "main") return {};
		let n = t === "top" || t === "bottom", r = e?.view_layout ?? {}, i = {
			...(r.length === "fill" || r.length === "cards") && { size: r.length },
			...r.hold === "end" && { hold: !0 },
			...r.gap_after !== void 0 && r.gap_after !== null && r.gap_after !== "" && { gapAfter: Math.max(0, Number(r.gap_after) || 0) }
		};
		return n && e?.column_span ? {
			...i,
			share: Math.min(Number(e.column_span), this.cmColumns) / this.cmColumns
		} : !n && e?.row_span ? {
			...i,
			length: Number(e.row_span) * (Ie + Le) - Le
		} : i;
	}
	cmArea() {
		let e = this.shadowRoot, t = [...e.querySelectorAll("hui-view-header, hui-view-footer")];
		t.forEach((e) => this.cmSeen.observe(e));
		let n = e.querySelector(".container");
		if (!this.lovelace?.editMode && n) return [this.clientWidth, n.clientHeight];
		let r = n ? parseFloat(getComputedStyle(n).paddingTop) + parseFloat(getComputedStyle(n).paddingBottom) : 0, i = e.querySelector(".cm-bar")?.offsetHeight ?? 0;
		return [this.clientWidth, this.clientHeight - i - r - t.reduce((e, t) => e + t.offsetHeight, 0)];
	}
	cmCardColumns(e, t) {
		return he((this.sections[e]?._cards ?? []).filter((e) => !e.hidden).map((e) => e.getGridOptions?.() ?? {}), t === "top" || t === "bottom");
	}
	cmCards(e, t, n) {
		if (t.place === "main") return {};
		let r = t.place === "top" || t.place === "bottom", i = me(z(this.cmLayout, t.layer), t.place), a = this.cmCardColumns(e, t.place), [o, s, c, l] = Me(this.cmSections[e]?.view_layout?.padding), u = () => ({ wide: ge(a || 12, n, this.cmColumns) + l + s }), d = () => ({ tall: (a ? this.cmNatural(e) : Math.max(Ie, this.cmNatural(e))) + o + c });
		return r ? {
			...u(),
			...i && d()
		} : {
			...d(),
			...i && u()
		};
	}
	cmNatural(e) {
		let t = String(e);
		if (this.lovelace?.editMode && t in this.cmSeenOut.naturals) return this.cmSeenOut.naturals[t];
		let n = this.sections[e], r = n?.querySelector("hui-grid-section")?.shadowRoot?.querySelector(".container");
		r && this.cmSeen.observe(r);
		let i = Ve(n);
		return this.lovelace?.editMode || (this.cmSeenOut.naturals[t] = i), i;
	}
	cmGridColumns(e, t) {
		let n = t[e], r = t.flatMap((e, t) => e?.shows && e.layer === n.layer && e.place === n.place ? [t] : []), i = (e) => this.cmCardColumns(e, n.place);
		if (n.place === "top" || n.place === "bottom") {
			let a = xe(r.map((e) => t[e]), !0, z(this.cmLayout, n.layer)[n.place]?.arrange);
			return n.share === void 0 && r.length > 1 && !a[r.indexOf(e)] && i(e) || null;
		}
		return n.place === "main" || !me(z(this.cmLayout, n.layer), n.place) ? null : Math.max(0, ...r.map(i)) || null;
	}
	cmGrid(e, t) {
		let n = e?.querySelector("hui-grid-section");
		n && (t === null ? (n.style.removeProperty("--base-column-count"), n.style.removeProperty("--column-span")) : (n.style.setProperty("--base-column-count", String(t)), n.style.setProperty("--column-span", "1")));
	}
	cmFill(e, t) {
		let n = e?.querySelector("hui-grid-section");
		if (!n?.shadowRoot) return;
		let r = n.shadowRoot.adoptedStyleSheets;
		r.includes(Zt) || (n.shadowRoot.adoptedStyleSheets = [...r, Zt]);
		let i = t.length === 1 && P(t[0].config ?? { type: "" }) ? t[0] : null;
		n.toggleAttribute("cm-fill", !!i);
		for (let t of e._cards ?? []) t.toggleAttribute("cm-fill", t === i);
	}
	cmShow() {
		if (!this.cmDebug && !this.cmApp.show_size) return this.cmLabel?.remove();
		this.cmLabel?.isConnected || (this.cmLabel = document.createElement("div"), this.cmLabel.className = "cm-debug", this.shadowRoot?.prepend(this.cmLabel));
		let e = this.getBoundingClientRect(), t = document.documentElement;
		this.cmLabel.textContent = `view ${Math.round(e.width)} x ${Math.round(e.height)}, room ${S(this)}\npage scrolls ${t.scrollWidth - t.clientWidth} x ${t.scrollHeight - t.clientHeight}` + Ne(this, t.clientHeight);
	}
	cmPlace() {}
}, Z = "auto", tn = /* @__PURE__ */ new Set(["fit", "lines"]), nn = (e) => ({
	...n.panels[e],
	unit: "%",
	hide_empty: !0,
	arrange: "start"
}), Q = (e) => e === "top" || e === "bottom", $ = (e, t) => ({ number: {
	min: e,
	max: t,
	mode: "box",
	unit_of_measurement: "px"
} });
function rn(e) {
	let t = {};
	for (let [r, i] of Object.entries(e)) if (r === "inner") {
		let e = rn(i ?? {});
		Object.keys(e).length && (t.inner = e);
	} else if (I.includes(r)) {
		let e = nn(r), n = Object.fromEntries(Object.entries(i ?? {}).filter(([t, n]) => !tn.has(t) && n !== e[t]));
		Object.keys(n).length && (t[r] = n);
	} else i !== n.main[r]?.default && (t[r] = i);
	return t;
}
function an(e, t, n, r, i) {
	let a = !!t && typeof t == "object", o = a ? 0 : Number(t) || 0, s = (e) => a ? Number(t[e]) || 0 : o;
	return {
		data: {
			[e]: o,
			[`${e}_each`]: a,
			...Object.fromEntries(V.map((t) => [`${e}_${t}`, s(t)]))
		},
		schema: [...a ? V.map((t) => ({
			name: `${e}_${t}`,
			selector: $(0, n)
		})) : [{
			name: e,
			selector: $(0, n)
		}], {
			name: `${e}_each`,
			selector: { boolean: {} }
		}],
		labels: {
			[e]: [r, i],
			[`${e}_each`]: ["Each side its own", ""],
			...Object.fromEntries(V.map((t) => [`${e}_${t}`, [`${r}, ${t}`, ""]]))
		},
		read(t) {
			return t[`${e}_each`] ? Object.fromEntries(V.map((n) => [n, Number(t[`${e}_${n}`] ?? t[e]) || 0])) : Number(t[e]) || 0;
		}
	};
}
function on(e) {
	let t = Object.fromEntries(Object.entries(n.main).map(([t, n]) => [t, e[t] ?? n.default]));
	return {
		schema: m(String(t.main_fit)).flatMap((e) => e.name === "main_fit" ? [{
			...e,
			selector: { select: {
				...e.selector.select,
				options: e.selector.select.options.filter((e) => e.value !== "own")
			} }
		}] : [
			"gap",
			"margin",
			"header_space"
		].includes(e.name) ? [] : [e]),
		data: t,
		change: (t) => ({
			...e,
			...t
		})
	};
}
function sn(e, t, r, i, a) {
	let o = z(e, t)[r] ?? {}, s = o.size === Z, c = {
		...nn(r),
		...o,
		[Z]: s
	};
	s && (c.size = n.panels[r].size);
	let l = c.unit === "px", u = [
		{
			name: Z,
			selector: { boolean: {} }
		},
		...h(r).filter((e) => !tn.has(e.name) && !e.name.startsWith("anchor_") && (!s || e.name !== "size" && e.name !== "unit")).map((e) => e.name === "size" && l ? {
			...e,
			selector: { number: {
				...e.selector.number,
				max: 2e3
			} }
		} : e),
		{
			name: "arrange",
			selector: { select: {
				mode: "dropdown",
				options: [
					{
						value: "start",
						label: Q(r) ? "From the left" : "From the top"
					},
					{
						value: "centre",
						label: "Centred"
					},
					{
						value: "end",
						label: Q(r) ? "From the right" : "From the bottom"
					}
				]
			} }
		}
	].filter((e) => !a || a.includes(e.name)), d = Q(r) ? "tall" : "wide";
	return {
		schema: u,
		data: c,
		labels: {
			[Z]: [`As ${d} as its cards`, `The edge is exactly as ${d} as what its panels hold, as cards show and hide.`],
			arrange: ["Arrange", "Where its panels sit when they do not fill it (none filling); those held to the end stay there."]
		},
		change: (a) => {
			let { [Z]: o, ...s } = a, l = o ? Z : s.size === Z ? n.panels[r].size : s.size;
			if (!o && s.unit !== c.unit) {
				let [e, t] = i() ?? [0, 0], n = Q(r) ? t : e;
				n > 0 && (l = Math.round(s.unit === "px" ? n * l / 100 : Math.min(100, l * 100 / n)));
			}
			return le(e, t, (e) => ({
				...e,
				[r]: {
					...e[r],
					...s,
					size: l
				}
			}));
		}
	};
}
function cn(e, t, n) {
	let r = t.labels ?? {};
	return G`<ha-form
    .hass=${e}
    .data=${t.data}
    .schema=${t.schema}
    .computeLabel=${(e) => r[e.name]?.[0] ?? _(e)}
    .computeHelper=${(e) => r[e.name]?.[1] ?? v(e)}
    @value-changed=${(e) => {
		e.stopPropagation(), n(t.change(e.detail.value));
	}}
  ></ha-form>`;
}
function ln(e, t, n, r) {
	let i = e.view_layout ?? {}, a = an("padding", i.padding ?? 0, 400, "Padding", "Room inside it, round its cards, px: to line them up."), { view_layout: o, ...s } = e, c = (e, t, n = s) => {
		let r = a.read(e), { padding: i, ...o } = t, c = {
			...o,
			...(typeof r == "object" || r) && { padding: r }
		};
		return {
			...n,
			...Object.keys(c).length && { view_layout: c }
		};
	};
	if (t === "main") return {
		schema: a.schema,
		data: a.data,
		labels: a.labels,
		change: (e) => c(e, i)
	};
	let l = t, u = Q(l) ? "column_span" : "row_span", d = e[u] === void 0 ? i.length ?? (r ? "fill" : "cards") : "fixed";
	return {
		schema: [
			{
				name: "length",
				selector: { select: {
					mode: "list",
					options: [
						{
							value: "cards",
							label: `As ${Q(l) ? "wide" : "tall"} as its cards`
						},
						{
							value: "fill",
							label: "Fill what is left"
						},
						{
							value: "fixed",
							label: Q(l) ? "A fixed width" : "A fixed height"
						}
					]
				} }
			},
			...d === "fixed" ? [{
				name: u,
				selector: { number: {
					min: 1,
					max: Q(l) ? n : 16,
					mode: "slider"
				} }
			}] : [],
			{
				name: "hold",
				selector: { boolean: {} }
			},
			...a.schema
		],
		data: {
			length: d,
			[u]: e[u] ?? 1,
			hold: i.hold === "end",
			...a.data
		},
		labels: {
			length: [Q(l) ? "Width" : "Height", ""],
			column_span: ["Width", `Columns of the view's ${n} (its Width in HA's Layout tab).`],
			row_span: ["Height", "In HA's card rows (56 px each, and the gap between)."],
			hold: [`Hold to the ${Q(l) ? "right" : "bottom"}`, "Against the end of its edge, whatever the others do."],
			...a.labels
		},
		change: (e) => {
			let { [u]: t, ...n } = s, { length: r, hold: a, ...o } = i;
			return c(e, {
				...o,
				...e.length !== "fixed" && { length: e.length },
				...e.hold && { hold: "end" }
			}, {
				...n,
				...e.length === "fixed" && { [u]: Number(e[u]) || 1 }
			});
		}
	};
}
function un(e, t) {
	let n = e.getBoundingClientRect(), [r, i] = [window.innerWidth, window.innerHeight], a = Math.max(8, Math.min(n.left, r - t.offsetWidth - 8)), o = i - n.bottom - 12, s = n.top - 12;
	return o >= 360 || o >= s ? `left:${a}px;top:${n.bottom + 4}px;max-height:${o}px` : `left:${a}px;bottom:${i - n.top + 4}px;max-height:${s}px`;
}
var dn = class extends X {
	constructor(...e) {
		super(...e), this.busy = !1, this.at = "", this.key = (e) => e.key === "Escape" && this.cancel();
	}
	static {
		this.properties = {
			busy: { state: !0 },
			at: { state: !0 }
		};
	}
	connectedCallback() {
		super.connectedCallback(), window.addEventListener("keydown", this.key);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), window.removeEventListener("keydown", this.key);
	}
	updated() {
		if (this.at || !customElements.get("ha-form")) return;
		let e = this.shadowRoot?.querySelector(".box");
		e && (this.at = un(this.anchor(), e));
	}
	async save() {
		this.busy = !0;
		try {
			await this.commit(), this.remove();
		} finally {
			this.busy = !1;
		}
	}
	frame(e, t, n, r, i = "Save", a = !1) {
		return G`<div class="backdrop" @click=${() => this.cancel()}></div>
      <div class="box" role="dialog" aria-label=${t} style=${this.at || "visibility:hidden"}>
        <header><h2>${e}</h2>${n}</header>
        <div class="middle">${customElements.get("ha-form") ? r : G`<p class="note">Loading…</p>`}</div>
        <footer>
          <button class="btn" @click=${() => this.cancel()}>Cancel</button>
          <button class="btn primary ${a ? "danger" : ""}" ?disabled=${this.busy} @click=${() => this.save()}>${i}</button>
        </footer>
      </div>`;
	}
	static {
		this.styles = [$t, Qe`
    :host {
      position: fixed;
      inset: 0;
      z-index: 100;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
      color: var(--primary-text-color);
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.2);
    }
    .box {
      position: absolute;
      display: flex;
      flex-direction: column;
      width: min(380px, calc(100vw - 16px));
      overflow: hidden;
      border: 1px solid var(--divider-color);
      border-radius: 18px;
      background: var(--card-background-color, #fff);
      box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
    }
    header {
      flex: none;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 16px 18px 6px;
    }
    .middle {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      padding: 4px 0;
    }
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    /* Its actions are the shared chips (pills.ts; card-action), in the theme's colour. */
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      --tone: var(--primary-color);
    }
    section {
      margin: 8px 12px;
      padding: 8px 12px 12px;
      border-radius: 12px;
      border: 1px solid var(--divider-color);
    }
    h3 {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--primary-color);
    }
    .note {
      margin: 2px 0 8px;
      font-size: 13px;
      color: var(--secondary-text-color);
    }
    .plain {
      padding: 4px 16px;
    }
    .link {
      margin-top: 8px;
      padding: 0;
      font: inherit;
      font-size: 14px;
      border: none;
      background: none;
      color: var(--primary-color);
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }
    .link:hover {
      text-decoration-thickness: 2px;
    }
    footer {
      flex: none;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 14px 18px 16px;
      border-top: 1px solid var(--divider-color);
    }
    /* The admin page's buttons (button, button-primary), in HA's colours; the chips' ring. */
    .btn {
      padding: 8px 14px;
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      background: none;
      color: var(--primary-text-color);
      font: inherit;
      font-size: 14px;
      font-weight: 560;
      cursor: pointer;
      transition: box-shadow 0.15s, filter 0.15s;
    }
    .btn:not([disabled]):hover,
    .btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 35%, transparent);
      filter: brightness(1.08);
    }
    .primary {
      border-color: transparent;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .danger {
      background: var(--error-color, #db4437);
    }
    .btn[disabled] {
      opacity: 0.5;
      cursor: default;
    }
  `];
	}
};
l("casa-mia-panel-options", class extends dn {
	constructor(...e) {
		super(...e), this.layout = {}, this.section = {};
	}
	static {
		this.properties = {
			...dn.properties,
			layout: { state: !0 },
			section: { state: !0 }
		};
	}
	open(e) {
		this.o = e, this.layout = e.layout, this.section = e.section, document.body.append(this), o().then(() => this.requestUpdate());
	}
	anchor() {
		return this.o.anchor;
	}
	change(e, t = this.section) {
		this.layout = e, this.section = t, this.o.apply(e, t);
	}
	cancel() {
		this.o.apply(this.o.layout, this.o.section), this.remove();
	}
	commit() {
		return this.o.save(rn(this.layout), this.section);
	}
	act(e) {
		this.cancel(), e?.();
	}
	group(e, t, n) {
		return G`<section>
      <h3>${e}</h3>
      ${t ? G`<p class="note">${t}</p>` : q}
      ${n}
    </section>`;
	}
	render() {
		if (!this.o) return q;
		let e = this.o, t = e.place === "main", n = e.place, r = `${e.layer > 1 ? `layer ${e.layer} ` : ""}${n} edge`, { add: i, back: a, on: o, remove: s } = e.actions, c = Q(n) ? ["←", "→"] : ["↑", "↓"], l = t ? G`<div class="actions">
          ${i ? G`<button class="cm-chip" @click=${() => this.act(i)}>+ Add a layer</button>` : q}
          ${s ? G`<button class="cm-chip" @click=${() => this.act(s)}>Remove layer ${e.count}</button>` : q}
        </div>` : G`<div class="actions">
          <button class="cm-chip" @click=${() => this.act(i)}>+ Add a panel</button>
          ${a || o ? G`<button class="cm-chip" ?disabled=${!a} aria-label="Move earlier" @click=${() => this.act(a)}>${c[0]}</button>
                <button class="cm-chip" ?disabled=${!o} aria-label="Move later" @click=${() => this.act(o)}>${c[1]}</button>` : q}
        </div>`;
		return this.frame(e.name, `${e.name} options`, l, G`${this.group("This panel", t ? "" : `${e.name} only.`, G`${cn(e.hass, ln(this.section, e.place, e.columns, e.fills), (e) => this.change(this.layout, e))}
          <button class="link" @click=${() => this.act(e.edit)}>Visibility, background and more (HA's own)…</button>`)}
      ${t ? this.group("Whole view", "The main panel's shape.", cn(e.hass, on(this.layout), (e) => this.change(e))) : this.group(`Whole ${r}`, e.count > 1 ? `All ${e.count} panels of the ${r}.` : `Every panel of the ${r} (one now).`, cn(e.hass, sn(this.layout, e.layer, n, e.room), (e) => this.change(e)))}`);
	}
});
function fn(e) {
	document.createElement("casa-mia-panel-options").open(e);
}
l("casa-mia-mini", class extends dn {
	constructor(...e) {
		super(...e), this.value = {};
	}
	static {
		this.properties = {
			...dn.properties,
			value: { state: !0 }
		};
	}
	open(e) {
		this.o = e, this.value = e.value, document.body.append(this), o().then(() => this.requestUpdate());
	}
	anchor() {
		return this.o.anchor;
	}
	cancel() {
		this.o.apply(this.o.value), this.remove();
	}
	commit() {
		return this.o.save(this.value);
	}
	render() {
		if (!this.o) return q;
		let e = this.o, t = e.actions?.length ? G`<div class="actions">
          ${e.actions.map((e) => G`<button
                class="cm-chip"
                @click=${() => {
			this.cancel(), e.run();
		}}
              >
                ${e.label}
              </button>`)}
        </div>` : q;
		return this.frame(e.title, e.title, t, G`<div class="plain">
        ${e.note ? G`<p class="note">${e.note}</p>` : q}
        ${cn(e.hass, e.form(this.value), (t) => {
			this.value = t, e.apply(t);
		})}
      </div>`);
	}
});
function pn(e) {
	document.createElement("casa-mia-mini").open(e);
}
l("casa-mia-confirm", class extends dn {
	constructor(...e) {
		super(...e), this.question = "", this.action = "OK", this.danger = !1, this.answer = () => {};
	}
	anchor() {
		return document.body;
	}
	updated() {
		this.at ||= "left:50%;top:18%;transform:translateX(-50%)";
	}
	cancel() {
		this.answer(!1), this.remove();
	}
	async commit() {
		this.answer(!0);
	}
	render() {
		let e = this.question.indexOf("?"), [t, n] = e > 0 ? [this.question.slice(0, e + 1), this.question.slice(e + 1).trim()] : [this.question, ""];
		return this.frame(t, t, q, G`<p class="plain note">${n}</p>`, this.action, this.danger);
	}
});
function mn(e, { action: t = "OK", danger: n = !1 } = {}) {
	return new Promise((r) => {
		let i = document.createElement("casa-mia-confirm");
		Object.assign(i, {
			question: e,
			action: t,
			danger: n,
			answer: r
		}), document.body.append(i);
	});
}
//#endregion
//#region src/view/edit.ts
var hn = (e) => class extends e {
	constructor(...e) {
		super(...e), this.cmTool = (e) => {
			let t = e.target.closest("button"), n = t?.closest(".cm-tools");
			if (!t || !n) return;
			e.stopPropagation();
			let r = Number(n.dataset.n), i = this.cmActions(r)[t.dataset.act];
			t.dataset.act === "options" ? this.cmOptions(r, t) : i?.();
		};
	}
	cmBar(e) {
		let t = this.shadowRoot, n = t?.querySelector(".cm-bar");
		if (!e || this.isStrategy) return n?.remove();
		!n && t && (n = document.createElement("div"), n.className = "cm-bar", n.innerHTML = `<label><input type="checkbox" ${this.cmDimsOn ? "checked" : ""}>Show dimensions</label>`, n.querySelector("input").addEventListener("change", (e) => {
			this.cmDimsOn = e.target.checked, this.cmLater();
		}), t.prepend(n));
	}
	cmReseen(e) {
		let t = this.cmSeenOut.naturals;
		this.cmSeenOut.naturals = Object.fromEntries(e.flatMap((e, n) => e.from !== null && String(e.from) in t ? [[String(n), t[e.from]]] : []));
	}
	cmRestack(e) {
		let t = e(pe(this.cmSections));
		return this.cmReseen(t), this.cmSaveView((e) => ({
			...e,
			sections: fe(e.sections ?? [], t)
		}));
	}
	cmActions(e) {
		let t = R(this.cmSections[e], e);
		if (!t) return {};
		if (t.place === "main") {
			let e = Ee(pe(this.cmSections)), t = [
				"top",
				"left",
				"right",
				"bottom"
			];
			return {
				...e < 2 && { add: () => this.cmRestack((n) => [...n, ...t.map((t) => ({
					from: null,
					layer: e + 1,
					place: t
				}))]) },
				...e > 1 && { remove: async () => {
					let t = (t) => t.place !== "main" && t.layer === e;
					(!pe(this.cmSections).some((e) => t(e) && this.cmSections[e.from]?.cards?.length) || await mn(`Remove layer ${e}? Its panels' cards go with it.`, {
						action: "Remove",
						danger: !0
					})) && this.cmRestack((e) => e.filter((e) => !t(e)));
				} }
			};
		}
		let n = (t) => {
			let n = pe(this.cmSections), r = n.findIndex((t) => t.from === e), i = B(n, r), a = i[i.indexOf(r) + t];
			return a === void 0 ? void 0 : () => this.cmRestack((e) => {
				let t = [...e];
				return [t[r], t[a]] = [t[a], t[r]], t;
			});
		};
		return {
			add: () => this.cmRestack((n) => {
				let r = n.findIndex((t) => t.from === e);
				return [
					...n.slice(0, r + 1),
					{
						from: null,
						...t
					},
					...n.slice(r + 1)
				];
			}),
			back: n(-1),
			on: n(1)
		};
	}
	cmOptions(e, t) {
		let n = R(this.cmSections[e], e);
		if (!n) return;
		let r = this.sections.map((e, t) => R(this.cmSections[t], t)), i = this.shadowRoot?.querySelectorAll(".content > .section")[e], [a, o] = [this.cmLayout, this.cmSections], s = n.place === "main" ? [] : B(r, e), c = n.place === "top" || n.place === "bottom", l = xe(s.map((e) => this.cmLock(o[e], n.place)), c, z(a, n.layer)[n.place]?.arrange)[s.indexOf(e)] ?? !1, u = (t, n) => {
			this.cmLayout = t, this.cmSections = o.map((t, r) => r === e ? n : t), this.cmLater();
		};
		fn({
			hass: this.hass,
			anchor: t,
			name: de(r, e),
			...n,
			count: n.place === "main" ? Ee(r) : s.length,
			fills: l,
			columns: this.cmColumns,
			layout: a,
			section: o[e] ?? {},
			room: () => {
				let e = this.cmBoxes[n.layer - 1];
				return e && [e[2], e[3]];
			},
			actions: this.cmActions(e),
			edit: () => (i?.querySelector("hui-section-edit-mode"))?._editSection?.(),
			apply: u,
			save: (t, n) => this.cmSaveView((r) => {
				let { layout: i, ...a } = r, o = (r.sections ?? []).map((t, r) => r === e ? n : t);
				return {
					...a,
					sections: o,
					...Object.keys(t).length && { layout: t }
				};
			})
		});
	}
	cmLineOf(e) {
		return e.edge ? z(this.cmLayout, e.edge.layer)[e.edge.place]?.line : this.cmSections[e.after]?.view_layout?.line_after;
	}
	cmGapSet(e, t, n, r, i) {
		if (e.edge) {
			let { layer: a, place: o } = e.edge;
			return [le(r, a, (e) => {
				let { [t]: r, ...i } = e[o] ?? {};
				return {
					...e,
					[o]: {
						...i,
						...n !== void 0 && { [t]: n }
					}
				};
			}), i];
		}
		let a = t === "gap" ? "gap_after" : "line_after";
		return [r, i.map((t, r) => {
			if (r !== e.after) return t;
			let { view_layout: i = {}, ...o } = t ?? {}, { [a]: s, ...c } = i, l = {
				...c,
				...n !== void 0 && { [a]: n }
			};
			return {
				...o,
				...Object.keys(l).length && { view_layout: l }
			};
		})];
	}
	cmAllGaps(e, t, n) {
		let r = (e) => {
			let t = { ...e };
			for (let e of I) if (t[e]) {
				let { gap: n, ...r } = t[e];
				t[e] = r;
			}
			return t.inner &&= r(t.inner), t;
		};
		return [{
			...r(t),
			gap: e
		}, n.map((e) => {
			if (!e?.view_layout?.gap_after && e?.view_layout?.gap_after !== 0) return e;
			let { gap_after: t, ...n } = e.view_layout, { view_layout: r, ...i } = e;
			return {
				...i,
				...Object.keys(n).length && { view_layout: n }
			};
		})];
	}
	cmDraft(e, t) {
		this.cmLayout = e, this.cmSections = t, this.cmLater();
	}
	cmSaveAll(e, t) {
		return this.cmSaveView((n) => {
			let { layout: r, ...i } = n, a = rn(e);
			return {
				...i,
				sections: t,
				...Object.keys(a).length && { layout: a }
			};
		});
	}
	cmMini(e, t, n, r, i, a, o = []) {
		let [s, c] = [this.cmLayout, this.cmSections];
		pn({
			hass: this.hass,
			anchor: e,
			title: t,
			note: n,
			value: r,
			form: i,
			actions: o,
			apply: (e) => this.cmDraft(...e === r ? [s, c] : a(e, s, c)),
			save: (e) => this.cmSaveAll(...a(e, s, c))
		});
	}
	cmGapWhose(e) {
		let t = this.sections.map((e, t) => R(this.cmSections[t], t));
		return e.edge ? `Between the ${e.edge.layer > 1 ? `layer ${e.edge.layer} ` : ""}${e.edge.place} edge and its middle.` : `After ${de(t, e.after)}, to the next along its edge.`;
	}
	cmGap(e, t) {
		let n = this.cmLineOf(e);
		this.cmMini(t, "Gap", this.cmGapWhose(e), {
			gap: e.size,
			all: !1
		}, (e) => ({
			schema: [{
				name: "gap",
				selector: $(0, 200)
			}, {
				name: "all",
				selector: { boolean: {} }
			}],
			data: e,
			labels: {
				gap: ["Gap", ""],
				all: ["Apply to all", "Every gap in the view, on every layer, this size."]
			},
			change: (e) => e
		}), (t, n, r) => {
			let i = Math.max(0, Number(t.gap) || 0);
			return t.all ? this.cmAllGaps(i, n, r) : this.cmGapSet(e, "gap", i, n, r);
		}, n ? [] : [{
			label: "+ Add a line",
			run: () => this.cmSaveAll(...this.cmGapSet(e, "line", {}, this.cmLayout, this.cmSections))
		}]);
	}
	cmLine(e, t) {
		let n = {
			width: 1,
			color: [
				0,
				0,
				0
			],
			style: "solid",
			knock: 0,
			extend_start: 0,
			extend_end: 0,
			...this.cmLineOf(e)
		};
		this.cmMini(t, "Line", `In the gap: ${this.cmGapWhose(e).toLowerCase()}`, n, (e) => ({
			schema: [
				{
					name: "width",
					selector: $(0, 40)
				},
				{
					name: "color",
					selector: { color_rgb: {} }
				},
				{
					name: "style",
					selector: { select: {
						mode: "dropdown",
						options: [
							"solid",
							"dashed",
							"dotted",
							"double"
						].map((e) => ({
							value: e,
							label: e[0].toUpperCase() + e.slice(1)
						}))
					} }
				},
				{
					name: "knock",
					selector: $(-200, 200)
				},
				{
					name: "extend_start",
					selector: $(-400, 400)
				},
				{
					name: "extend_end",
					selector: $(-400, 400)
				}
			],
			data: e,
			labels: {
				width: ["Width", ""],
				color: ["Colour", ""],
				style: ["Style", ""],
				knock: ["Knock", "px across from the middle of the gap."],
				extend_start: ["Past its start", "px beyond the top or left end; less than none, stops short of it."],
				extend_end: ["Past its end", "px beyond the bottom or right end; less than none, stops short of it."]
			},
			change: (e) => e
		}), (t, n, r) => this.cmGapSet(e, "line", t, n, r), [{
			label: "Remove line",
			run: () => this.cmSaveAll(...this.cmGapSet(e, "line", void 0, this.cmLayout, this.cmSections))
		}]);
	}
	cmMargin(e, t) {
		let n = ve(this.cmLayout.margin);
		this.cmMini(t, `Margin, ${e}`, e === "top" ? "Below the header." : e === "bottom" ? "Above the footer." : `Against the screen's ${e}.`, {
			margin: n[V.indexOf(e)],
			all: !1
		}, (e) => ({
			schema: [{
				name: "margin",
				selector: $(0, 400)
			}, {
				name: "all",
				selector: { boolean: {} }
			}],
			data: e,
			labels: {
				margin: ["Margin", ""],
				all: ["Apply to all", "Every side this size."]
			},
			change: (e) => e
		}), (t, r, i) => {
			let a = Math.max(0, Number(t.margin) || 0);
			if (t.all) return [{
				...r,
				margin: a
			}, i];
			let o = Object.fromEntries(V.map((t, r) => [t, t === e ? a : n[r]]));
			return [{
				...r,
				margin: o
			}, i];
		});
	}
	cmDepth(e, t, n) {
		let r = () => {
			let t = this.cmBoxes[e - 1];
			return t && [t[2], t[3]];
		};
		this.cmMini(n, `${e > 1 ? `Layer ${e} ` : ""}${t[0].toUpperCase()}${t.slice(1)} edge`, t === "top" || t === "bottom" ? "How tall it is." : "How wide it is.", this.cmLayout, (n) => sn(n, e, t, r, [
			"auto",
			"size",
			"unit"
		]), (e, t, n) => [e, n]);
	}
	cmHeader(e) {
		let t = this.shadowRoot?.querySelector("hui-view-header");
		this.cmMini(e, "Header", "The view's header: its title and badges.", { header_space: Fe(this.cmLayout) }, (e) => ({
			schema: [{
				name: "header_space",
				selector: $(0, 200)
			}],
			data: e,
			labels: { header_space: ["Space above it", ""] },
			change: (e) => e
		}), (e, t, n) => [{
			...t,
			header_space: Math.max(0, Number(e.header_space) || 0)
		}, n], [{
			label: "Layout, badges and more (HA's own)…",
			run: () => t?._configure?.()
		}]);
	}
	cmFooter(e) {
		let t = this.shadowRoot?.querySelector("hui-view-footer");
		this.cmMini(e, "Footer", "The view's footer.", { footer: this.cmLayout.footer === "float" ? "float" : "space" }, (e) => ({
			schema: [{
				name: "footer",
				selector: { select: {
					mode: "list",
					options: [{
						value: "space",
						label: "Take space: under the panels"
					}, {
						value: "float",
						label: "Float: over the bottom of the panels (HA's own)"
					}]
				} }
			}],
			data: e,
			labels: { footer: ["Where", ""] },
			change: (e) => e
		}), (e, t, n) => {
			let { footer: r, ...i } = t;
			return [{
				...i,
				...e.footer === "float" && { footer: "float" }
			}, n];
		}, [{
			label: "Its cards and more (HA's own)…",
			run: () => t?._configure?.()
		}]);
	}
	cmAnchor(e, t, r) {
		let i = `anchor_${r}`, a = z(this.cmLayout, e)[t]?.[i] ?? n.panels[t][i], o = le(this.cmLayout, e, (e) => ({
			...e,
			[t]: {
				...e[t],
				[i]: !a
			}
		}));
		this.cmSaveAll(o, this.cmSections);
	}
}, gn = (e) => class extends e {
	constructor(...e) {
		super(...e), this.cmMark = (e) => {
			let t = e.target.closest("button");
			if (!t) return;
			e.stopPropagation();
			let n = t.dataset, r = () => this.cmGapsNow.find((e) => e.id === n.gap || e.id === n.line);
			n.gap ? r() && this.cmGap(r(), t) : n.line ? r() && this.cmLine(r(), t) : n.margin ? this.cmMargin(n.margin, t) : n.depth ? this.cmDepth(Number(n.depth.split(".")[0]), n.depth.split(".")[1], t) : n.lock ? this.cmAnchor(Number(n.lock.split(".")[0]), n.lock.split(".")[1], n.lock.split(".")[2]) : n.end === "header" || n.n === "header" ? this.cmHeader(t) : n.end === "footer" ? this.cmFooter(t) : n.n && this.cmOptions(Number(n.n), t);
		};
	}
	cmTracks(e) {
		let t = getComputedStyle(e), n = (e) => e.split(" ").reduce((e, t) => [...e, e[e.length - 1] + (parseFloat(t) || 0)], [0]);
		return [n(t.gridTemplateColumns), n(t.gridTemplateRows)];
	}
	cmGapRect(e, [t, n], r) {
		let [i, a, o, s] = [
			t[e.column[0] - 1],
			t[e.column[1] - 1],
			n[e.row[0] - 1],
			n[e.row[1] - 1]
		];
		return e.across ? [
			i,
			o - r,
			a - i,
			s - o + 2 * r
		] : [
			i - r,
			o,
			a - i + 2 * r,
			s - o
		];
	}
	cmLines(e, t, n, r) {
		let i = e.querySelector(":scope > .cm-lines"), a = ke(t, (e) => this.cmLineOf(e), (e) => this.cmGapRect(e, n, r));
		if (!a.length) return i?.remove(), a;
		i || (i = document.createElement("div"), i.className = "cm-lines", e.append(i));
		let o = `<svg>${a.map((e) => {
			let t = e.width, n = e.style === "dashed" ? ` stroke-dasharray="${3 * t} ${2 * t}"` : e.style === "dotted" ? ` stroke-dasharray="0 ${2 * t}" stroke-linecap="round"` : "";
			if (e.style !== "double") return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${e.color}" stroke-width="${t}"${n}/>`;
			let r = Math.max(1, t / 3), [i, a] = e.y1 === e.y2 ? [0, r] : [r, 0];
			return [-1, 1].map((t) => `<line x1="${e.x1 + t * i}" y1="${e.y1 + t * a}" x2="${e.x2 + t * i}" y2="${e.y2 + t * a}" stroke="${e.color}" stroke-width="${r}"/>`).join("");
		}).join("")}</svg>`;
		return i.dataset.html !== o && ([i.innerHTML, i.dataset.html] = [o, o]), a;
	}
	cmOverlay(e, t) {
		let n = e.querySelector(`:scope > .${t}`);
		return n || (n = document.createElement("div"), n.className = t, n.addEventListener("click", this.cmMark), e.append(n)), n;
	}
	cmDims(e, t, r, i, a, o, s) {
		if (!t) return e.querySelector(":scope > .cm-dims")?.remove();
		let c = this.cmOverlay(e, "cm-dims"), l = e.getBoundingClientRect(), u = [...e.querySelectorAll(":scope > .section")], d = (e) => {
			let t = u[e]?.getBoundingClientRect();
			return t && t.width > 0 ? {
				l: t.left - l.left,
				t: t.top - l.top,
				r: t.right - l.left,
				b: t.bottom - l.top
			} : null;
		}, f = [], p = [], [m, h] = [5, 7], g = (e, t, n, r, i, a, o) => {
			let [s, c] = o ? [m, 0] : [0, m], l = Math.abs(o ? r - t : n - e), u = l >= 2 * h + 2 ? " marker-start=\"url(#cm-arrow)\" marker-end=\"url(#cm-arrow)\"" : "";
			f.push(`<line x1="${e}" y1="${t}" x2="${n}" y2="${r}"${u}/>`, `<line x1="${e - s}" y1="${t - c}" x2="${e + s}" y2="${t + c}"/>`, `<line x1="${n - s}" y1="${r - c}" x2="${n + s}" y2="${r + c}"/>`);
			let [d, g] = [i.length * 6.6 + 14, 16], _ = l >= (o ? g : d) + 2 * h + 6, [v, y] = [(e + n) / 2, (t + r) / 2], [b, x] = _ ? [v, y] : o ? [v + m + 4 + d / 2, y] : [v, y - m - 4 - g / 2];
			p.push(`<button class="cm-chip cm-mono" ${a} style="left:${b}px;top:${x}px">${i}</button>`);
		}, _ = (e) => `${Math.round(e)} px`, v = (e, t, n) => Math.round(e + n * (t - e)), y = /* @__PURE__ */ new Map();
		r.forEach((e, t) => {
			e && e.place !== "main" && i.places[t] && d(t) && y.set(`${e.layer}.${e.place}`, [...y.get(`${e.layer}.${e.place}`) ?? [], t]);
		});
		for (let [e, t] of y) {
			let [r, a] = e.split("."), o = z(this.cmLayout, Number(r))[a] ?? {}, s = a === "top" || a === "bottom", c = Math.max(...t.map((e) => i.places[e].rect[s ? 3 : 2])), l = o.size === "auto" ? "auto" : o.unit === "px" ? "" : `${o.size ?? n.panels[a].size}%`, u = l ? `${l} · ${_(c)}` : _(c), f = t.map(d).reduce((e, t) => ({
				l: Math.min(e.l, t.l),
				t: Math.min(e.t, t.t),
				r: Math.max(e.r, t.r),
				b: Math.max(e.b, t.b)
			})), p = `title="How ${s ? "tall" : "wide"} the ${Number(r) > 1 ? `layer ${r} ` : ""}${a} edge is: as its cards, or a size"`;
			s ? g(v(f.l, f.r, .92), f.t, v(f.l, f.r, .92), f.b, u, `data-depth="${e}" ${p}`, !0) : g(f.l, v(f.t, f.b, .92), f.r, v(f.t, f.b, .92), u, `data-depth="${e}" ${p}`, !1);
		}
		for (let e of a) {
			let [t, n, r, i] = this.cmGapRect(e, o, s), a = `data-gap="${e.id}" title="This gap: its size, or every gap's; or add a line in it"`;
			e.across ? g(v(t, t + r, .3), n, v(t, t + r, .3), n + i, `gap ${e.size}`, a, !0) : g(t, v(n, n + i, .3), t + r, v(n, n + i, .3), `gap ${e.size}`, a, !1);
		}
		let [b, x, S, C] = i.inset, [w, T] = [l.width, l.height], E = (e, t) => `data-margin="${e}" title="The margin ${t}: this side, or every side"`;
		g(v(0, w, .3), -b, v(0, w, .3), 0, `margin ${b}`, E("top", "below the header"), !0), g(v(0, w, .3), T, v(0, w, .3), T + S, `margin ${S}`, E("bottom", "above the footer"), !0), g(-C, v(0, T, .3), 0, v(0, T, .3), `margin ${C}`, E("left", "against the screen's left"), !1), g(w, v(0, T, .3), w + x, v(0, T, .3), `margin ${x}`, E("right", "against the screen's right"), !1), i.places.forEach((e, t) => {
			let n = e && d(t);
			if (!n) return;
			let [r, i, a, o] = ve(this.cmSections[t]?.view_layout?.padding), s = `data-n="${t}" title="Its padding, round its cards: in its options"`;
			r && g(v(n.l, n.r, .5), n.t, v(n.l, n.r, .5), n.t + r, `pad ${r}`, s, !0), a && g(v(n.l, n.r, .5), n.b - a, v(n.l, n.r, .5), n.b, `pad ${a}`, s, !0), o && g(n.l, v(n.t, n.b, .5), n.l + o, v(n.t, n.b, .5), `pad ${o}`, s, !1), i && g(n.r - i, v(n.t, n.b, .5), n.r, v(n.t, n.b, .5), `pad ${i}`, s, !1);
		});
		let D = e.getRootNode().querySelector("hui-view-header")?.getBoundingClientRect();
		if (D && D.height > 0) {
			let e = Fe(this.cmLayout), t = Math.round(D.left - l.left + .92 * D.width);
			g(t, D.top - l.top, t, D.top - l.top + e, `space ${e}`, "data-n=\"header\" title=\"The space above the header\"", !0);
		}
		i.places.forEach((e, t) => {
			let n = e && d(t);
			n && p.push(`<button class="cm-chip cm-mono cm-quiet cm-size" data-n="${t}" title="Its size on the screen, out of edit mode; its options" style="left:${n.r - 6}px;top:${n.b - 6}px">${Math.round(e.rect[2])} × ${Math.round(e.rect[3])}</button>`);
		});
		let O = `<svg><defs><marker id="cm-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>${f.join("")}</svg>${p.join("")}`;
		c.dataset.html !== O && ([c.innerHTML, c.dataset.html] = [O, O]);
	}
	cmEditMarks(e, t, r, i) {
		if (!t) return e.querySelector(":scope > .cm-ends")?.remove();
		let a = this.cmOverlay(e, "cm-ends"), o = e.getRootNode(), s = e.getBoundingClientRect(), c = [];
		for (let e of ["header", "footer"]) {
			let t = o.querySelector(`hui-view-${e}`)?.getBoundingClientRect(), n = e === "header" ? "The header: the space above it, and HA's own editor for the rest" : "The footer: take space under the panels or float over them, and HA's own editor";
			t && t.height > 0 && c.push(`<button class="cm-chip cm-on" data-end="${e}" title="${n}" style="left:${Math.round(t.left - s.left + 10)}px;top:${Math.round(t.top - s.top + 6)}px">${e}</button>`);
		}
		for (let e of i) {
			let [t, n] = [Math.round((e.x1 + e.x2) / 2), Math.round((e.y1 + e.y2) / 2)];
			c.push(`<button class="cm-chip cm-on cm-line" data-line="${e.id}" title="This line: its width, colour, style, knock and ends, or remove it" style="left:${t}px;top:${n}px">line</button>`);
		}
		let l = [...e.querySelectorAll(":scope > .section")], u = (e) => {
			let t = l[e]?.getBoundingClientRect();
			return t && t.width > 0 && !l[e].classList.contains("cm-off") ? {
				l: t.left - s.left,
				t: t.top - s.top,
				r: t.right - s.left,
				b: t.bottom - s.top
			} : null;
		}, d = (e) => e.map(u).reduce((e, t) => t ? e ? {
			l: Math.min(e.l, t.l),
			t: Math.min(e.t, t.t),
			r: Math.max(e.r, t.r),
			b: Math.max(e.b, t.b)
		} : t : e, null), f = Math.max(1, ...r.map((e) => e && e.place !== "main" ? e.layer : 1));
		for (let e = 1; e <= f; e++) for (let t of ["top", "bottom"]) {
			let i = d(r.flatMap((n, r) => n && n.layer === e && n.place === t ? [r] : []));
			if (!i) continue;
			let a = Math.round((i.t + i.b) / 2);
			for (let r of ["left", "right"]) {
				let o = `anchor_${r}`, s = !!(z(this.cmLayout, e)[t]?.[o] ?? n.panels[t][o]), l = Math.round(r === "left" ? i.l : i.r), u = `${e > 1 ? `Layer ${e} ` : ""}${t} edge to the ${r} side: ${s ? "on" : "off"}`, d = `${e > 1 ? `Layer ${e}'s ` : "The "}${t} edge ${s ? "runs" : "stops short of the side panel; click to run it"} to the ${r} side${s ? ", over the side panel; click to stop it short" : ""}`;
				c.push(`<button class="cm-chip cm-icon cm-lock ${s ? "cm-on" : ""}" data-lock="${e}.${t}.${r}" aria-label="${u}" title="${d}" style="left:${l}px;top:${a}px"><svg viewBox="0 0 24 24"><path d="${s ? ze : Be}"/></svg></button>`);
			}
		}
		let p = c.join("");
		a.dataset.html !== p && ([a.innerHTML, a.dataset.html] = [p, p]);
	}
	cmTools(e, t, n, r) {
		let i = e.querySelector(":scope > .cm-tools");
		if (!t || !n[r]) return Object.assign(e.style, {
			minWidth: "",
			minHeight: ""
		}), i?.remove();
		i || (i = document.createElement("div"), i.className = "cm-tools", i.addEventListener("click", this.cmTool), e.append(i));
		let a = n[r], o = B(n, r), s = o.indexOf(r), c = a.place === "top" || a.place === "bottom", l = Ee(n), u = a.place !== "main" && z(this.cmLayout, a.layer)[a.place]?.hidden, d = a.place === "main" && l > 1 ? `Main · ${l} layers` : `${de(n, r)}${u ? " · hidden" : ""}`, f = a.place === "main" ? "The main panel: its padding, and the main panel's shape; add or remove a layer" : `${de(n, r)}: its own options, and its whole edge's`, [p, m] = c ? ["left", "right"] : ["up", "down"], h = `<button class="cm-chip cm-on cm-name" data-act="options" title="${f}">${d}</button>` + (a.place === "main" ? l < 2 ? "<button class=\"cm-chip cm-on cm-tool\" data-act=\"add\" aria-label=\"Add a layer\" title=\"Add a layer inside this one: its four edges, a panel each\">+</button>" : "" : "<button class=\"cm-chip cm-on cm-tool\" data-act=\"add\" aria-label=\"Add a panel\" title=\"Add a panel after this one, in its edge\">+</button>" + (o.length > 1 ? `<button class="cm-chip cm-on cm-tool" data-act="back" aria-label="Move earlier" title="Move it ${p}, along its edge" ${s === 0 ? "disabled" : ""}>${c ? "←" : "↑"}</button><button class="cm-chip cm-on cm-tool" data-act="on" aria-label="Move later" title="Move it ${m}, along its edge" ${s === o.length - 1 ? "disabled" : ""}>${c ? "→" : "↓"}</button>` : ""));
		i.dataset.html !== h && ([i.innerHTML, i.dataset.html] = [h, h]), i.dataset.n = String(r);
		let g = e.querySelector("hui-section-edit-mode"), _ = 18 + (g?.shadowRoot?.querySelector(".section-actions")?.offsetWidth ?? 0);
		i.classList.remove("cm-narrow"), i.classList.toggle("cm-narrow", i.scrollWidth > e.clientWidth - _);
		let v = i.querySelector(".cm-name")?.offsetWidth ?? 0, y = g?.shadowRoot?.querySelector(".section-wrapper"), b = y && getComputedStyle(y), x = b ? [
			"paddingLeft",
			"paddingRight",
			"borderLeftWidth",
			"borderRightWidth"
		].reduce((e, t) => e + (parseFloat(b[t]) || 0), 0) : 0, S = parseFloat(getComputedStyle(e).getPropertyValue("--row-height")) || Ie;
		e.style.minWidth = `${Math.ceil(Math.max(v + _, S + x))}px`;
		let C = g?.shadowRoot?.querySelector(".section-header");
		C && (C.style.flexShrink = "0");
		let w = b ? [
			"paddingTop",
			"paddingBottom",
			"borderTopWidth",
			"borderBottomWidth"
		].reduce((e, t) => e + (parseFloat(b[t]) || 0), 0) : 0;
		e.style.minHeight = `${Math.ceil((C?.offsetHeight ?? 0) + S + w)}px`;
	}
};
//#endregion
//#region src/view/view.ts
s().then((e) => {
	class t extends gn(hn(en(e))) {
		cmPlace() {
			let e = this.shadowRoot, t = e?.querySelector(".content");
			if (!t) return;
			let r = !!this.lovelace?.editMode, i = Ge(this.clientWidth, He(this.cmLayout), this.cmNarrow);
			i !== this.cmNarrow && this.cmToNarrow(i), this.cmBar(r && !i), this.toggleAttribute("cm-footer-float", this.cmLayout.footer === "float");
			let a = e.querySelector("hui-view-header"), o = this.cmLayout.header_space === void 0 ? void 0 : Fe(this.cmLayout);
			a?.style.setProperty("padding-top", o === void 0 || i ? "" : `${o}px`);
			let s = this.sections.map((e, t) => R(this.cmSections[t], t));
			if (i) return this.cmNarrowPlace(t, s, r);
			let c = this.cmSeenOut, [l, u] = r && c.shown ? [c.shown[0], c.shown[1] + (c.top === void 0 ? 0 : c.top - Fe(this.cmLayout))] : this.cmArea();
			r || (this.cmSeenOut.shown = [l, u], this.cmSeenOut.top = a && !a.hidden ? Fe(this.cmLayout) : void 0);
			let d = this.cmSections.findIndex((e, t) => R(e, t)?.place === "main"), f = r && !(this.cmSections[d]?.cards?.length > 0), [p, m] = f ? this.cmArea() : [l, u], h = (e) => {
				let t = s[e];
				return t.place === "top" || t.place === "bottom" ? me(z(this.cmLayout, t.layer), t.place) : t.place !== "main" && B(s, e).length > 1 && this.cmSections[e]?.view_layout?.length !== "fill";
			}, g = s.map((e, t) => e ? {
				...e,
				shows: this.cmShows(t, e, r),
				...this.cmLock(this.cmSections[t], e.place),
				...this.cmCards(t, e, l)
			} : null), _ = De(this.cmLayout, [p, m], r, g, this.cmColumns, f);
			this.cmBoxes = _.boxes;
			let v = r ? De(this.cmLayout, [l, u], !1, g, this.cmColumns) : _, y = _.inset.map((e) => `${e}px`).join(" "), b = _.inset.some(Boolean);
			t.style.inset = r ? "" : y, t.style.margin = r && b ? y : "", t.style.width = r && !f && (_.canvas[0] !== p || b) ? `${_.canvas[0]}px` : "", t.style.height = f ? `${_.canvas[1]}px` : "", t.style.gridTemplateColumns = _.columns, t.style.gridTemplateRows = _.rows;
			let x = [...e.querySelectorAll(".content > .section")];
			if (x.forEach((e, t) => {
				let i = _.places[t] ?? null;
				e.classList.toggle("cm-off", !i), e.classList.toggle("cm-hidden", r && !!i && !!s[t] && !!z(this.cmLayout, s[t].layer)[s[t].place]?.hidden);
				let a = this.cmSections[t]?.cards ?? [];
				e.classList.toggle("cm-garnish-only", r && !!i && !!s[t] && a.length > 0 && (!a.some(M) || ee(a))), this.cmTools(e, r && !!i, s, t);
				let o = !!s[t] && s[t].place !== "main" && B(s, t).length > 1;
				if (e.querySelector("hui-section-edit-mode")?.toggleAttribute("cm-deletable", r && o), this.cmFill(this.sections[t], r || !s[t] || h(t) ? [] : this.cmCounting(t)), this.cmGrid(this.sections[t], i && g[t] ? this.cmGridColumns(t, g) : null), this.cmGarnish(t, !1), !i) return;
				let c = s[t] ? Me(this.cmSections[t]?.view_layout?.padding) : [
					0,
					0,
					0,
					0
				];
				Object.assign(e.style, {
					...n,
					padding: c.some(Boolean) ? c.map((e) => `${e}px`).join(" ") : "",
					gridColumn: i.column,
					gridRow: i.row,
					width: i.width === void 0 ? "" : `${i.width}px`,
					height: i.height === void 0 ? "" : `${i.height}px`,
					justifySelf: i.centred ? "center" : "",
					alignSelf: i.centred ? "center" : ""
				});
			}), f) {
				let e = this.scrollHeight - this.clientHeight;
				e > 0 && (t.style.height = `${Math.max(0, _.canvas[1] - e)}px`);
			}
			this.cmGapsNow = _.gaps;
			let S = this.cmTracks(t), C = x.find((e) => !e.classList.contains("cm-off")), w = r && C && parseFloat(getComputedStyle(C).marginTop) || 0, T = this.cmLines(t, _.gaps, S, w);
			this.cmDims(t, r && this.cmDimsOn, s, v, _.gaps, S, w), this.cmEditMarks(t, r, s, T), this.cmShow();
		}
		cmCounting(e) {
			return (this.sections[e]?._cards ?? []).filter((e) => M(e.config ?? { type: "" }) && !e.hidden);
		}
		cmShows(e, t, n) {
			let r = this.sections[e];
			return !r || r.hidden ? !1 : n || z(this.cmLayout, t.layer)[t.place]?.hide_empty === !1 ? !0 : this.cmCounting(e).length > 0 && !ee(this.cmSections[e]?.cards);
		}
		cmGarnish(e, t) {
			for (let n of this.sections[e]?._cards ?? []) n.toggleAttribute("cm-garnish", t && !M(n.config ?? { type: "" }));
		}
		cmNarrowPlace(e, t, r) {
			Object.assign(e.style, {
				inset: "",
				margin: "",
				width: "",
				height: "",
				gridTemplateColumns: "",
				gridTemplateRows: ""
			}), [...e.querySelectorAll(":scope > .section")].forEach((e, i) => {
				let a = t[i], o = r || !!a && !z(this.cmLayout, a.layer)[a.place]?.hidden && this.cmShows(i, a, !1);
				for (let t of [
					"cm-off",
					"cm-hidden",
					"cm-garnish-only"
				]) e.classList.remove(t);
				e.querySelector("hui-section-edit-mode")?.removeAttribute("cm-deletable"), this.cmTools(e, !1, t, i), this.cmFill(this.sections[i], []), this.cmGrid(this.sections[i], null), this.cmGarnish(i, !r), Object.assign(e.style, {
					...n,
					order: We(a?.place),
					display: o ? "" : "none"
				});
			}), this.cmLines(e, [], [[], []], 0), this.cmDims(e, !1, t, {}, [], [[], []], 0), this.cmEditMarks(e, !1, t, []), this.cmShow();
		}
	}
	let n = {
		padding: "",
		gridColumn: "",
		gridRow: "",
		width: "",
		height: "",
		justifySelf: "",
		alignSelf: "",
		order: "",
		display: ""
	};
	l("casa-mia-tablet-layout", t), l("casa-mia-tablet-view", class extends t {});
});
//#endregion
//#region src/view/patches.ts
var _n = new CSSStyleSheet();
_n.replaceSync(".handle, ha-dropdown-item[value=\"duplicate\"], :host(:not([cm-deletable])) ha-dropdown-item[value=\"delete\"], :host(:not([cm-deletable])) wa-divider { display: none; }\n  /* Its frame fills the panel's room, as the panel does out of edit mode (not only its cards' height). */\n  :host { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }\n  .section-wrapper { flex: 1 1 auto; box-sizing: border-box; }"), customElements.whenDefined("hui-section-edit-mode").then(() => {
	let e = customElements.get("hui-section-edit-mode").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		for (let e = this; e; e = e.parentElement ?? (e.getRootNode().host || null)) if (yn.some((t) => e.tagName === t.slice(7).toUpperCase())) {
			let e = this.shadowRoot;
			e && !e.adoptedStyleSheets.includes(_n) && (e.adoptedStyleSheets = [...e.adoptedStyleSheets, _n]);
			return;
		}
	};
});
var vn = "custom:casa-mia-tablet-layout", yn = [vn, "custom:casa-mia-tablet-view"];
customElements.whenDefined("hui-view-editor").then(() => {
	let e = customElements.get("hui-view-editor").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		let n = this._schema;
		typeof n == "function" && (this._schema = (...e) => n(...e).map((e) => {
			if (e.name === "section_specifics" && yn.includes(this._config?.type)) return {
				...e,
				visible: void 0,
				schema: e.schema.filter((e) => e.name !== "dense_section_placement")
			};
			let t = e.name === "type" ? e.selector?.select?.options : void 0;
			return !t || t.some((e) => e.value === vn) ? e : {
				...e,
				selector: { select: {
					...e.selector.select,
					options: [...t, {
						value: vn,
						label: "Tablet (Casa Mia)"
					}]
				} }
			};
		}), this.requestUpdate());
	};
	let n = Object.getOwnPropertyDescriptor(e, "config");
	n?.set && Object.defineProperty(e, "config", {
		...n,
		set(e) {
			n.set.call(this, yn.includes(e?.type) && e.max_columns === void 0 ? {
				...e,
				max_columns: 4
			} : e);
		}
	});
	let r = e._valueChanged;
	e._valueChanged = function(e) {
		let t = e.detail?.value;
		if (!yn.includes(t?.type)) return r.call(this, e);
		let n = new Proxy(t, { deleteProperty: (e, t) => t === "max_columns" || t === "top_margin" || Reflect.deleteProperty(e, t) });
		return r.call(this, new CustomEvent(e.type, { detail: { value: n } }));
	};
}), customElements.whenDefined("hui-dialog-edit-view").then(() => {
	let e = customElements.get("hui-dialog-edit-view").prototype, t = Object.getOwnPropertyDescriptor(e, "_type");
	t?.get && Object.defineProperty(e, "_type", {
		...t,
		get() {
			return yn.includes(this._config?.type) ? "sections" : t.get.call(this);
		}
	});
});
//#endregion
//#region src/connection.ts
var bn = 100, xn = 600;
function Sn(e, t) {
	let n = (t) => console.error(`CASA-MIA CARDS: ${e} won't work: ${t}`), r = () => {
		let e = window.hassConnection;
		return e?.then(t, (e) => n(`Home Assistant's connection failed (${e})`)), !!e;
	};
	if (r()) return;
	let i = xn, a = setInterval(() => {
		r() ? clearInterval(a) : --i === 0 && (clearInterval(a), n("Home Assistant's connection never appeared"));
	}, bn);
}
//#endregion
//#region src/garnish-sections.ts
var Cn = !1, wn = /* @__PURE__ */ new Set(), Tn = () => Cn;
customElements.whenDefined("hui-section").then(() => {
	let e = customElements.get("hui-section").prototype, t = e._updateVisibility;
	if (typeof t != "function" || typeof e._setElementVisibility != "function") {
		console.warn("CASA-MIA CARDS: garnish on all section dashboards: this Home Assistant's sections changed; not available");
		return;
	}
	e._updateVisibility = function(...e) {
		if (this.cmContentHidden = !1, t.apply(this, e), wn.size > 200) for (let e of wn) e.isConnected || wn.delete(e);
		wn.add(this), !(this.hidden || this.preview || !this._config || ne(this)) && (ee(this._config.cards) || Cn && N([
			...this._cards ?? [],
			...this._badges ?? [],
			...this._sections ?? []
		])) && (this.cmContentHidden = !0, this._setElementVisibility(!1));
	};
});
function En(e) {
	if (e !== Cn) {
		Cn = e, console.info(`CASA-MIA CARDS: garnish on all section dashboards ${e ? "on" : "off"}`);
		for (let e of wn) e.isConnected ? e._updateVisibility() : wn.delete(e);
	}
}
Sn("garnish on all section dashboards", ({ conn: t }) => t.subscribeMessage((e) => En(!!e?.dashboards?.garnish_everywhere), { type: "casa_mia/settings/subscribe" }).catch(() => En(e)));
//#endregion
//#region src/garnish-editor.ts
var Dn = "M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z", On = {
	content: "Content: while this card shows, its panel shows. Tap to make it garnish.",
	garnish: "Garnish: adornment, like a heading, that never holds its panel open; the panel hides when only garnish is left. Tap to make it content."
}, kn = new CSSStyleSheet();
kn.replaceSync(`${Qt}
  /* The sprig is a round icon chip (tl-sprig): outlined for content, filled for garnish. */
  .cm-garnish {
    position: absolute; bottom: -13px; right: 4px; z-index: 3;
    --tone: var(--primary-color);
  }
  .cm-garnish-frame {
    position: absolute; inset: 0; z-index: 2; pointer-events: none;
    border: 2px dashed var(--primary-color); border-radius: var(--ha-card-border-radius, 12px);
  }
  :host(.cm-garnished) ::slotted(*) { opacity: 0.55; }
`), customElements.whenDefined("hui-card-edit-mode").then(() => {
	let e = customElements.get("hui-card-edit-mode").prototype, t = e.updated;
	e.updated = function(...e) {
		t?.apply(this, e);
		let n = this.shadowRoot;
		if (!n) return;
		let r = n.querySelector(".cm-garnish"), i = Tn() || ne(this), a = ie(this.path ?? []), o = ((e) => a.reduce((e, t) => e?.[t], e))(this.lovelace?.config);
		if (!i || !this.lovelace?.editMode || this.noEdit || !a.includes("sections") || !o?.type || o.type === "custom:casa-mia-over-layer") return this.classList.remove("cm-garnished"), n.querySelector(".cm-garnish-frame")?.remove(), r?.remove();
		n.adoptedStyleSheets.includes(kn) || (n.adoptedStyleSheets = [...n.adoptedStyleSheets, kn]), r || (r = document.createElement("button"), r.type = "button", r.className = "cm-garnish cm-chip cm-icon", r.innerHTML = `<svg viewBox="0 0 24 24"><path d="${Dn}"/></svg>`, r.addEventListener("pointerdown", (e) => e.stopPropagation()), r.addEventListener("click", async (e) => {
			e.stopPropagation(), r.disabled = !0;
			try {
				let e = structuredClone(this.lovelace.config), t = ie(this.path), n = t.slice(0, -1).reduce((e, t) => e[t], e), r = t[t.length - 1], i = M(n[r]);
				n[r] = F(n[r], i), await this.lovelace.saveConfig(e), console.info(`CASA-MIA CARDS: panel card marked ${i ? "Garnish" : "Content"}`);
			} catch (e) {
				console.error("CASA-MIA CARDS: could not save Garnish", e), this.dispatchEvent(new CustomEvent("hass-notification", {
					detail: { message: "Could not save Garnish. Please try again." },
					bubbles: !0,
					composed: !0
				}));
			} finally {
				r.disabled = !1, this.requestUpdate();
			}
		}), n.append(r));
		let s = !M(o);
		r.setAttribute("aria-pressed", String(s)), r.classList.toggle("cm-on", s), r.title = On[s ? "garnish" : "content"], r.setAttribute("aria-label", r.title), this.classList.toggle("cm-garnished", s);
		let c = n.querySelector(".cm-garnish-frame");
		s && !c ? (c = document.createElement("div"), c.className = "cm-garnish-frame", n.append(c)) : s || c?.remove();
	};
});
//#endregion
//#region src/screen-condition.ts
var An = [{
	name: "orientation",
	selector: { select: {
		mode: "dropdown",
		options: [
			{
				value: "any",
				label: "Any"
			},
			{
				value: "portrait",
				label: "Portrait"
			},
			{
				value: "landscape",
				label: "Landscape"
			}
		]
	} }
}];
function jn(e = "") {
	let t = e.split(",").map((e) => e.trim().match(/^(?:(.+) and )?\(orientation:\s*(portrait|landscape)\)$/)), n = t[0]?.[2];
	return !n || t.some((e) => !e || e[2] !== n) || t.length > 1 && t.some((e) => !e?.[1]) ? {
		width: e,
		orientation: "any"
	} : {
		width: t.map((e) => e[1] ?? "").join(", "),
		orientation: n
	};
}
function Mn(e, t = "any") {
	if (t === "any") return e;
	let n = `(orientation: ${t})`;
	return e ? e.split(",").map((e) => `${e.trim()} and ${n}`).join(", ") : n;
}
var Nn = window;
if (!Nn.cmScreenOrientation) {
	Nn.cmScreenOrientation = !0;
	let t = !1;
	customElements.whenDefined("ha-card-condition-screen").then(() => {
		let e = customElements.get("ha-card-condition-screen"), n = e.prototype, i = n.render, o = n._valueChanged, s = e.validateUIConfig;
		if (typeof i != "function" || typeof o != "function" || typeof s != "function") {
			a("screen orientation: Home Assistant's screen editor changed; not available");
			return;
		}
		e.validateUIConfig = function(e, n) {
			let r = t ? jn(e.media_query).width : e.media_query;
			return s.call(this, {
				...e,
				media_query: r
			}, n);
		}, n.render = function() {
			if (!t) return i.call(this);
			let { width: e, orientation: n } = jn(this.condition.media_query), a = Object.create(this, { condition: { value: {
				...this.condition,
				media_query: e
			} } });
			return G`${i.call(a)}
        <ha-form
          style="display: block; margin-top: 16px"
          .hass=${this.hass}
          .data=${{ orientation: n }}
          .schema=${An}
          .disabled=${this.disabled}
          .computeLabel=${() => "Orientation"}
          .computeHelper=${() => "The selected screen widths must also match this orientation. Leave widths unselected for any width."}
          @value-changed=${(n) => {
				n.stopPropagation(), t && r(this, "value-changed", { value: {
					...this.condition,
					media_query: Mn(e, n.detail.value.orientation)
				} });
			}}
        ></ha-form>`;
		}, n._valueChanged = function(e) {
			if (!t) return o.call(this, e);
			let { orientation: n } = jn(this.condition.media_query), r = Object.create(this, { dispatchEvent: { value: (e) => (e.detail.value = {
				...this.condition,
				...e.detail.value,
				media_query: Mn(e.detail.value.media_query, n)
			}, this.dispatchEvent(e)) } });
			return o.call(r, e);
		};
	}), Sn("screen orientation conditions", ({ conn: n }) => n.subscribeMessage((e) => {
		let n = !!e?.dashboards && e.dashboards.screen_orientation !== !1;
		n !== t && console.info(`CASA-MIA CARDS: screen orientation conditions ${n ? "on" : "off"}`), t = n;
	}, { type: "casa_mia/settings/subscribe" }).catch((n) => {
		t = e, e || console.warn("CASA-MIA CARDS: screen orientation settings unavailable", n);
	}));
}
//#endregion
//#region src/over-layer/door.ts
var Pn = "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z", Fn = 4e3, In = "\n  .lid { position: fixed; z-index: 8; transition: opacity 0.3s; cursor: pointer; }\n  .lid::after { content: \"\"; position: absolute; inset: 0; border-radius: 50%; pointer-events: none; animation: cm-door 2.4s ease-out infinite; }\n  .lid.open { opacity: 0; pointer-events: none; }\n  .lid.open::after { animation: none; }\n  @keyframes cm-door {\n    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-color, #03a9f4) 45%, transparent); }\n    70%, 100% { box-shadow: 0 0 0 8px transparent; }\n  }\n  @media (prefers-reduced-motion: reduce) { .lid::after { animation: none; } }\n";
function Ln(e) {
	for (let t = e; t; t = t.parentElement ?? (t.getRootNode().host || null)) {
		if (t.tagName !== "HUI-ROOT") continue;
		let e = t.shadowRoot;
		return [...e?.querySelectorAll("ha-icon-button[slot=\"actionItems\"]") ?? []].find((e) => e.path === Pn) ?? e?.querySelector("#dashboardmenu") ?? null;
	}
	return null;
}
function Rn(e, t, n, r, i, a) {
	return `path(evenodd, "M0 0 H${e} V${t} H0 Z M${n} ${r} h${i} v${a} h${-i} Z")`;
}
function zn(e) {
	let [t, n] = [Math.floor(e.left), Math.floor(e.top)];
	return [
		t,
		n,
		Math.ceil(e.right) - t,
		Math.ceil(e.bottom) - n
	];
}
var Bn = class {
	constructor(e) {
		this.shut = 0, this.lid = document.createElement("div"), this.lid.className = "lid", this.lid.hidden = !0, e.append(this.lid), this.lid.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && this.open()), this.lid.addEventListener("pointerdown", (e) => {
			if (e.preventDefault(), e.pointerType === "mouse") return this.open();
			this.open(), clearTimeout(this.shut), this.shut = window.setTimeout(() => this.close(), Fn);
		}), this.follow = (e) => {
			if (e.pointerType !== "mouse" || !this.lid.classList.contains("open")) return;
			let t = this.lid.getBoundingClientRect();
			(e.clientX < t.left || e.clientX > t.right || e.clientY < t.top || e.clientY > t.bottom) && this.close();
		}, addEventListener("pointermove", this.follow, { passive: !0 });
	}
	open() {
		this.lid.classList.add("open");
	}
	close() {
		clearTimeout(this.shut), this.lid.classList.remove("open");
	}
	place(e, t, n) {
		let r = t?.getBoundingClientRect();
		if (!r || !r.width || !r.height) {
			for (let t of e) t.style.clipPath = "";
			this.lid.hidden = !0;
			return;
		}
		let [i, a, o, s] = zn(r);
		for (let t of e) {
			let e = t.getBoundingClientRect();
			t.style.clipPath = Rn(e.width, e.height, i - e.left, a - e.top, o, s);
		}
		Object.assign(this.lid.style, {
			left: `${i}px`,
			top: `${a}px`,
			width: `${o}px`,
			height: `${s}px`,
			...n
		}), this.lid.hidden = !1;
	}
	remove() {
		clearTimeout(this.shut), removeEventListener("pointermove", this.follow), this.lid.remove();
	}
};
//#endregion
//#region src/over-layer/card.ts
function Vn(e) {
	for (let t = e; t; t = t.parentElement ?? (t.getRootNode().host || null)) if (t.tagName === "HUI-VIEW") return t;
	return null;
}
function Hn(e) {
	let t = [];
	for (let n = e; n; n = n.parentElement ?? (n.getRootNode().host || null)) n.tagName === "HUI-SECTION" && t.push(n);
	return t;
}
function Un(e) {
	return Hn(e).some((e) => e.hasAttribute("hidden") && !e.cmContentHidden);
}
var Wn = `
  /* Cut off from the page's styles, but not its typography: all: initial alone sets the
     font to the browser's default (Times), so a card on the layer lost Home Assistant's. */
  :host { all: initial; font: inherit; color: inherit; -webkit-font-smoothing: inherit; }
  .layer { position: fixed; z-index: 7; display: flex; box-sizing: border-box; pointer-events: none; }
  .layer.scroll { position: absolute; }
  .backdrop { position: absolute; inset: 0; }
  .holder { position: relative; box-sizing: border-box; width: 100%; }
  .layer.full .holder { height: 100%; }
  .layer.full .holder > * { height: 100%; }
${In}`, Gn = class extends X {
	constructor(...e) {
		super(...e), this._editing = !1, this._childFor = "", this._sectionOff = !1;
	}
	static {
		this.properties = {
			_config: { state: !0 },
			_editing: { state: !0 }
		};
	}
	static getStubConfig() {
		return { card: {
			type: "markdown",
			content: "**Over layer.** This card shows over the dashboard while its Visibility conditions hold."
		} };
	}
	static getConfigElement() {
		return document.createElement("casa-mia-over-layer-editor");
	}
	setConfig(e) {
		if (!e.panel && e.card !== void 0 && (typeof e.card != "object" || !e.card.type)) throw Error("card: one card, with its type");
		this._config = e, this._makeChild(), this._place();
	}
	set hass(e) {
		let t = !this._hass;
		this._hass = e, this._child && (this._child.hass = e), this._checkSections(), t && this._style();
	}
	set preview(e) {
		this._setEditing(e);
	}
	set editMode(e) {
		this._setEditing(e);
	}
	getCardSize() {
		return this._editing ? 3 : 0;
	}
	getGridOptions() {
		return {
			columns: "full",
			rows: "auto"
		};
	}
	connectedCallback() {
		super.connectedCallback();
		let e = Hn(this), t = () => this._checkSections();
		for (let n of e) n.addEventListener("section-visibility-changed", t);
		this._unwatchSections = () => e.forEach((e) => e.removeEventListener("section-visibility-changed", t)), this._place();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unwatchSections?.(), this._takeDown();
	}
	_checkSections() {
		let e = Un(this);
		e !== this._sectionOff && (this._sectionOff = e, console.info(`CASA-MIA CARDS: over layer: a section round it is ${e ? "hidden by its own Visibility: down" : "shown again: up"}`), this._place());
	}
	_setEditing(e) {
		e !== this._editing && (this._editing = e, this._place());
	}
	_makePanel() {
		let e = Hn(this)[0];
		if (!e?.config) return;
		let t = document.createElement("hui-section"), { visibility: n, ...r } = e.config;
		t.hass = this._hass, t.lovelace = e.lovelace, t.index = e.index, t.viewIndex = e.viewIndex, t.preview = !1, t.config = {
			...r,
			cards: (r.cards ?? []).filter((e) => e?.type !== T)
		}, t.style.setProperty("--column-span", String(r.column_span ?? 1)), this._child = t, this._childFor = "";
	}
	async _makeChild() {
		if (this._config?.panel) {
			this._child = void 0, this._childFor = "";
			return;
		}
		let e = this._config?.card, t = JSON.stringify(e ?? null);
		if (t !== this._childFor) {
			if (this._childFor = t, this._child = void 0, e) {
				let n = await window.loadCardHelpers();
				if (t !== this._childFor) return;
				this._child = n.createCardElement(e), this._hass && (this._child.hass = this._hass);
			}
			this._layer?.querySelector(".holder")?.replaceChildren(...this._child && !this._editing ? [this._child] : []), this.requestUpdate();
		}
	}
	_place() {
		if (!this.isConnected || this._editing || !this._config || x(this) || (this._sectionOff = Un(this))) {
			this._takeDown(), this.requestUpdate();
			return;
		}
		this._host || this._putUp(), this._style();
	}
	_putUp() {
		this._host = document.createElement("casa-mia-over-layer-host");
		let e = this._host.attachShadow({ mode: "open" });
		e.innerHTML = `<style>${Wn}</style><div class="layer"><div class="backdrop"></div><div class="holder"></div></div>`, this._layer = e.querySelector(".layer"), this._config?.panel && this._makePanel(), this._child && this._layer.querySelector(".holder").append(this._child), this._door = new Bn(e);
		let t = document.querySelector("home-assistant")?.shadowRoot;
		t || console.warn("CASA-MIA CARDS: over layer: no <home-assistant> found; taps on its cards may do nothing"), (t ?? document.body).append(this._host);
		let n = () => this._style(), r = Vn(this), i = new ResizeObserver(n);
		r && i.observe(r), addEventListener("resize", n), addEventListener("scroll", n, {
			capture: !0,
			passive: !0
		}), this._watch = () => {
			i.disconnect(), removeEventListener("resize", n), removeEventListener("scroll", n, { capture: !0 });
		}, setTimeout(n, 500), console.info(`CASA-MIA CARDS: over layer shown (${j(this._config)})`), this.requestUpdate();
	}
	_takeDown() {
		this._host && (this._watch?.(), this._door?.remove(), this._host.remove(), this._host = this._layer = this._watch = this._door = void 0, this._config?.panel && (this._child = void 0), console.info("CASA-MIA CARDS: over layer taken down"));
	}
	_style() {
		if (!this._layer || !this._config) return;
		let e = O(this._config), t = this._layer;
		t.className = `layer ${e.mode}`;
		let n = (e.cover === "view" ? Vn(this) : null)?.getBoundingClientRect();
		if (e.mode === "scroll") {
			let e = (n?.top ?? 0) + scrollY;
			Object.assign(t.style, {
				left: `${(n?.left ?? 0) + scrollX}px`,
				top: `${e}px`,
				width: n ? `${n.width}px` : "100%",
				height: n ? `${n.height}px` : "100%",
				right: "",
				bottom: ""
			});
		} else if (n) {
			let e = Math.max(n.top, 0), r = Math.min(n.bottom, innerHeight);
			Object.assign(t.style, {
				left: `${n.left}px`,
				top: `${e}px`,
				width: `${n.width}px`,
				height: `${Math.max(r - e, 0)}px`,
				right: "",
				bottom: ""
			});
		} else Object.assign(t.style, {
			left: "0",
			top: "0",
			right: "0",
			bottom: "0",
			width: "",
			height: ""
		});
		let [r, i, a] = e.backdrop_color, o = t.querySelector(".backdrop"), s = {
			background: `rgba(${r}, ${i}, ${a}, ${e.backdrop_opacity / 100})`,
			backdropFilter: e.backdrop_blur ? `blur(${e.backdrop_blur}px)` : ""
		};
		Object.assign(o.style, {
			...s,
			pointerEvents: e.block ? "auto" : "none"
		});
		let c = e.block && e.cover === "window" && !!this._hass?.user?.is_admin, l = A(k(e.mode, e.anchor));
		Object.assign(t.style, e.mode === "full" ? {
			justifyContent: "",
			alignItems: "",
			padding: ""
		} : {
			justifyContent: l.justify,
			alignItems: l.align,
			padding: `${e.offset_y}px ${e.offset_x}px`
		});
		let u = t.querySelector(".holder");
		Object.assign(u.style, {
			maxWidth: e.mode === "full" ? "" : `${e.width}px`,
			pointerEvents: "auto"
		}), this._door?.place([o, u], c ? Ln(this) : null, s);
	}
	render() {
		return this._config ? this.isConnected && x(this) ? G`<div class="sample" aria-label="An Over layer: one card over the dashboard">
        <div class="tiles">${[
			0,
			1,
			2,
			3,
			4,
			5
		].map(() => G`<span></span>`)}</div>
        <div class="veil"></div>
        <div class="over"><strong>Over layer</strong><span>One card over the whole dashboard while its Visibility conditions hold: the alarm set, a visitor, night.</span></div>
      </div>` : this._editing ? this._config.panel ? G`<div class="badge cm-pill cm-accent">${j(this._config)}</div>` : G`<div class="badge cm-pill cm-accent">${j(this._config)}</div>
      ${this._child ?? G`<div class="empty">No card yet: pick one in the editor.</div>`}` : q : q;
	}
	static {
		this.styles = [$t, Qe`
    :host {
      display: block;
    }
    /* What it does, while edited: a status pill (pills.ts; card-badge). */
    .badge {
      margin: 0 0 6px;
    }
    .sample {
      position: relative;
      height: 170px;
      overflow: hidden;
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--primary-background-color);
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding: 10px;
    }
    .tiles span {
      height: 66px;
      border-radius: 10px;
      background: var(--card-background-color, #fff);
    }
    .veil {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(2px);
    }
    .over {
      position: absolute;
      left: 50%;
      top: 50%;
      display: grid;
      gap: 4px;
      width: 62%;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      font-size: 12px;
      transform: translate(-50%, -50%);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    }
    .over strong {
      font-size: 14px;
    }
    .empty {
      padding: 16px;
      color: var(--secondary-text-color);
      border: 1px dashed var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }
  `];
	}
}, Kn = [
	{
		name: "panel",
		selector: { boolean: {} }
	},
	{
		name: "mode",
		selector: { select: {
			mode: "dropdown",
			options: [
				{
					value: "float",
					label: "Float: the card where you place it (below), the middle by default"
				},
				{
					value: "full",
					label: "Full screen: the card fills what it covers"
				},
				{
					value: "scroll",
					label: "Scroll with the view: the card at the top, moving with the page"
				}
			]
		} }
	},
	{
		name: "cover",
		selector: { select: {
			mode: "dropdown",
			options: [{
				value: "view",
				label: "The view (the sidebar and header stay usable)"
			}, {
				value: "window",
				label: "The whole window (sidebar and header too)"
			}]
		} }
	},
	{
		name: "block",
		selector: { boolean: {} }
	},
	{
		type: "grid",
		name: "",
		schema: [
			{
				name: "backdrop_color",
				selector: { color_rgb: {} }
			},
			{
				name: "backdrop_opacity",
				selector: { number: {
					min: 0,
					max: 100,
					step: 5,
					unit_of_measurement: "%"
				} }
			},
			{
				name: "backdrop_blur",
				selector: { number: {
					min: 0,
					max: 20,
					step: 1,
					unit_of_measurement: "px"
				} }
			},
			{
				name: "width",
				selector: { number: {
					min: 200,
					max: 1600,
					step: 10,
					mode: "box",
					unit_of_measurement: "px"
				} }
			}
		]
	}
], qn = [{
	type: "grid",
	name: "",
	schema: [{
		name: "offset_x",
		selector: { number: {
			min: 0,
			max: 400,
			step: 1,
			mode: "box",
			unit_of_measurement: "px"
		} }
	}, {
		name: "offset_y",
		selector: { number: {
			min: 0,
			max: 400,
			step: 1,
			mode: "box",
			unit_of_measurement: "px"
		} }
	}]
}], Jn = {
	panel: "Show its whole panel",
	offset_x: "In from the side",
	offset_y: "In from the top or bottom",
	mode: "How it shows",
	cover: "What it covers",
	block: "Block taps on what's beneath",
	backdrop_color: "Backdrop colour",
	backdrop_opacity: "Backdrop opacity",
	backdrop_blur: "Backdrop blur",
	width: "Card width (float, scroll)"
}, Yn = {
	panel: "In place of a card of its own, the layer shows every card in the panel it's in (but Over layers). That panel never shows in its own place out of edit mode; edit its cards there, as usual.",
	block: "On: what's beneath can be seen but not touched; only the card works. Off: taps reach the dashboard round the card."
};
async function Xn() {
	customElements.get("hui-card-element-editor") && customElements.get("hui-card-picker") || (await (await (await window.loadCardHelpers()).createCardElement({
		type: "conditional",
		conditions: [],
		card: { type: "button" }
	})).constructor.getConfigElement?.(), await customElements.whenDefined("hui-card-element-editor"));
}
var Zn = class extends X {
	constructor(...e) {
		super(...e), this._ready = !1;
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			lovelace: { attribute: !1 },
			_config: { state: !0 },
			_ready: { state: !0 }
		};
	}
	setConfig(e) {
		this._config = e;
	}
	connectedCallback() {
		super.connectedCallback(), Promise.all([o(), Xn()]).then(() => this._ready = !0);
	}
	_save(e) {
		this._config = e, r(this, "config-changed", { config: w(e, D) });
	}
	render() {
		if (!this.hass || !this._config || !this._ready) return q;
		let e = this._config.card;
		return G`
      <ha-form
        .hass=${this.hass}
        .data=${{
			...D,
			...this._config
		}}
        .schema=${Kn}
        .computeLabel=${(e) => Jn[e.name] ?? e.name}
        .computeHelper=${(e) => Yn[e.name]}
        @value-changed=${(e) => {
			e.stopPropagation(), this._save({
				...this._config,
				...e.detail.value
			});
		}}
      ></ha-form>
      ${this._where()}
      <p class="note">
        It shows over the dashboard while its <strong>Visibility</strong> conditions hold (the Visibility tab): the alarm set, a
        user, the time of day. While the dashboard is edited it sits here as an ordinary card. The way out is for admins
        only: covering the whole window and blocking, it leaves a door over Home Assistant's edit button (hover over it, or
        tap it, then tap the button); and <code>?edit=1</code> at the end of the dashboard's address opens edit mode,
        where this card steps aside. Everyone else gets the wall.
      </p>
      ${this._config.panel ? q : this._card(e)}
    `;
	}
	_card(e) {
		return G`<h3>Its card</h3>
      ${e?.type ? G`<div class="actions">
              <button type="button" class="cm-chip" @click=${() => this._save({
			...this._config,
			card: void 0
		})}>Change the card</button>
            </div>
            <hui-card-element-editor
              .hass=${this.hass}
              .lovelace=${this.lovelace}
              .value=${e}
              @config-changed=${(e) => {
			e.stopPropagation(), this._save({
				...this._config,
				card: e.detail.config
			});
		}}
            ></hui-card-element-editor>` : G`<hui-card-picker
            .hass=${this.hass}
            .lovelace=${this.lovelace}
            @config-changed=${(e) => {
			e.stopPropagation(), this._save({
				...this._config,
				card: e.detail.config
			});
		}}
          ></hui-card-picker>`}`;
	}
	_where() {
		let e = {
			...D,
			...this._config
		};
		if (e.mode === "full") return q;
		let t = k(e.mode, e.anchor);
		return G`<h3>Where it sits</h3>
      <div class="where">
        <div class="anchors" role="radiogroup" aria-label="Where it sits">
          ${E.map((n, r) => n.map((n) => G`<button
                  type="button"
                  role="radio"
                  aria-checked=${n === t}
                  aria-label=${n}
                  title=${n}
                  class=${n === t ? "on" : ""}
                  ?disabled=${e.mode === "scroll" && r > 0}
                  @click=${() => this._save({
			...this._config,
			anchor: n
		})}
                ></button>`))}
        </div>
        <ha-form
          .hass=${this.hass}
          .data=${e}
          .schema=${qn}
          .computeLabel=${(e) => Jn[e.name] ?? e.name}
          @value-changed=${(e) => {
			e.stopPropagation(), this._save({
				...this._config,
				...e.detail.value
			});
		}}
        ></ha-form>
      </div>`;
	}
	static {
		this.styles = [$t, Qe`
    .where {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .where ha-form {
      flex: 1;
    }
    .anchors {
      display: grid;
      grid-template-columns: repeat(3, 22px);
      gap: 4px;
      padding: 6px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .anchors button {
      width: 22px;
      height: 22px;
      padding: 0;
      border: 1px solid var(--primary-color);
      border-radius: 4px;
      background: none;
      cursor: pointer;
    }
    .anchors button.on {
      background: var(--primary-color);
    }
    .anchors button:disabled {
      opacity: 0.25;
      cursor: default;
    }
    .note {
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    h3 {
      margin: 16px 0 8px;
      font-size: 15px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
      --tone: var(--primary-color);
    }
  `];
	}
};
l("casa-mia-over-layer", Gn), l("casa-mia-over-layer-editor", Zn), u("casa-mia-over-layer", "Casa Mia Over layer", "One card over the whole dashboard while its Visibility conditions hold; what's beneath can be seen but not touched.");
//#endregion
//#region src/alone.ts
var Qn = "cm-plugin-version@2026.11.9", $n = Qn.slice(Qn.indexOf("@") + 1);
console.info(`%cCASA-MIA TABLET LAYOUT%c ${$n}`, "color: green; font-weight: bold;", ""), t(`casa-mia-tablet-layout.js ${$n}`);
//#endregion
