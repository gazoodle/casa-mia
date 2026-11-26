var e = {
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
function t(e, t, n) {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}
var n = /* @__PURE__ */ new Set();
function r(e) {
	n.has(e) || console.warn(`CASA-MIA CARDS: ${e}`), n.add(e);
}
function i(e) {
	history.pushState(null, "", e), t(window, "location-changed", { replace: !1 });
}
async function a() {
	customElements.get("ha-form") || (await (await (await window.loadCardHelpers()).createCardElement({
		type: "entities",
		entities: []
	})).constructor.getConfigElement?.(), await customElements.whenDefined("ha-form"));
}
async function o() {
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
var s = { shown: 0 };
function c(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function l(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !0,
		documentationURL: "https://github.com/gazoodle/casa-mia"
	});
}
var u = e.main, d = e.panel;
function f(e, t) {
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
function p(e) {
	return Object.entries(u).filter(([, t]) => (!t.when || t.when.includes(e)) && (!t.for || t.for === "view")).map(([e, t]) => f(e, t));
}
function m(e) {
	return Object.entries(d).filter(([, t]) => (!t.edge || e === "top" || e === "bottom") && (!t.for || t.for === "view")).map(([e, t]) => f(e, t));
}
var h = {
	...u,
	...d
}, g = (e) => h[e.name]?.label ?? e.name, _ = (e) => h[e.name]?.help?.replaceAll("{item}", "card"), v = 100, y = (e) => e.parentElement ?? (e.getRootNode().host || null);
function b(e) {
	for (let t = y(e); t; t = y(t)) {
		let e = t.tagName ?? "";
		if (e.includes("-") && e !== "HUI-CARD") return e;
	}
	return "";
}
function x(e) {
	for (let t = y(e); t; t = y(t)) if (t.tagName === "HUI-CARD") return t.hasAttribute("cm-fill");
	return !1;
}
function S(e) {
	for (let t = e; t; t = y(t)) if (t.tagName === "HUI-CARD-PICKER") return !0;
	return !1;
}
function C(e) {
	for (let t = e; t; t = y(t)) if (t.tagName?.startsWith("HUI-DIALOG") || t.tagName === "HA-DIALOG") return !0;
	return !1;
}
function w(e) {
	let t = e.getBoundingClientRect().top + window.scrollY, n = window.visualViewport?.height ?? window.innerHeight;
	return Math.max(v, Math.floor(n - t));
}
function T(e, t, n = !1) {
	return t ? "preview" : e === "HUI-PANEL-VIEW" ? "screen" : e === "CASA-MIA-TABLET-LAYOUT" ? "tile" : n ? "cell" : "column";
}
function E(e, t = !1) {
	let n = x(e) ? "CASA-MIA-TABLET-LAYOUT" : b(e);
	return {
		mode: T(n, C(e), t),
		room: w(e),
		container: n.toLowerCase()
	};
}
function D(e, t, n) {
	switch (e.mode) {
		case "screen": return e.room;
		case "tile":
		case "cell": return null;
		default: return Math.round(t / n);
	}
}
function O(e) {
	return window.addEventListener("resize", e), window.visualViewport?.addEventListener("resize", e), () => {
		window.removeEventListener("resize", e), window.visualViewport?.removeEventListener("resize", e);
	};
}
function k(e) {
	let t = e.hostname.replace(/^\[|\]$/g, "").toLowerCase();
	return e.protocol === "http:" && (!t.includes(".") && !t.includes(":") || /^(127|10|192\.168|172\.(1[6-9]|2\d|3[01])|169\.254)\./.test(t) || /^(::1|f[cd][0-9a-f]{0,2}:.*|fe80:.*)$/.test(t) || /\.(local|lan|home|internal|home\.arpa)$/.test(t));
}
var A = {
	full: Infinity,
	balanced: 1.5,
	light: 1,
	saver: .75
};
function j(e, t, n = "balanced") {
	return t ? Math.min(e, A[n] ?? A.balanced) : e;
}
function M(e, t, n) {
	let r = e.filter(([, e, t]) => e > 0 && t > 0);
	return (r.find(([, e, r]) => n ? e >= t[0] || r >= t[1] : e >= t[0] && r >= t[1]) ?? r[r.length - 1] ?? e[e.length - 1])?.[0];
}
var N = {
	tint: [
		61,
		123,
		255
	],
	strength: 3,
	darkness: 20
};
function P([e, t, n], r, i) {
	let [a, o, s] = [
		e,
		t,
		n
	].map((e) => e / 255), c = Math.max(a, o, s), l = c - Math.min(a, o, s), u = 0;
	return l && (u = c === a ? (o - s) / l % 6 : c === o ? (s - a) / l + 2 : (a - o) / l + 4), `grayscale(1) sepia(1) hue-rotate(${Math.round(u * 60 - 35)}deg) saturate(${r}) brightness(${Math.max(.1, 1 - i / 100).toFixed(2)}) contrast(1.1)`;
}
function F(e, t) {
	return Object.fromEntries(Object.entries(e).filter(([e, n]) => !(e in t) || JSON.stringify(n) !== JSON.stringify(t[e])));
}
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var I = globalThis, ee = I.ShadowRoot && (I.ShadyCSS === void 0 || I.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, te = Symbol(), L = /* @__PURE__ */ new WeakMap(), ne = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== te) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (ee && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = L.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && L.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, re = (e) => new ne(typeof e == "string" ? e : e + "", void 0, te), R = (e, ...t) => new ne(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, te), ie = (e, t) => {
	if (ee) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = I.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, ae = ee ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return re(t);
})(e) : e, { is: oe, defineProperty: se, getOwnPropertyDescriptor: ce, getOwnPropertyNames: le, getOwnPropertySymbols: ue, getPrototypeOf: de } = Object, fe = globalThis, pe = fe.trustedTypes, me = pe ? pe.emptyScript : "", he = fe.reactiveElementPolyfillSupport, ge = (e, t) => e, _e = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? me : null;
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
}, ve = (e, t) => !oe(e, t), ye = {
	attribute: !0,
	type: String,
	converter: _e,
	reflect: !1,
	useDefault: !1,
	hasChanged: ve
};
Symbol.metadata ??= Symbol("metadata"), fe.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var be = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ye) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && se(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = ce(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? ye;
	}
	static _$Ei() {
		if (this.hasOwnProperty(ge("elementProperties"))) return;
		let e = de(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(ge("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(ge("properties"))) {
			let e = this.properties, t = [...le(e), ...ue(e)];
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
			for (let e of n) t.unshift(ae(e));
		} else e !== void 0 && t.push(ae(e));
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
		return ie(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? _e : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? _e : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ve)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
be.elementStyles = [], be.shadowRootOptions = { mode: "open" }, be[ge("elementProperties")] = /* @__PURE__ */ new Map(), be[ge("finalized")] = /* @__PURE__ */ new Map(), he?.({ ReactiveElement: be }), (fe.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var xe = globalThis, Se = (e) => e, Ce = xe.trustedTypes, we = Ce ? Ce.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, Te = "$lit$", Ee = `lit$${Math.random().toFixed(9).slice(2)}$`, De = "?" + Ee, Oe = `<${De}>`, ke = document, Ae = () => ke.createComment(""), je = (e) => e === null || typeof e != "object" && typeof e != "function", Me = Array.isArray, Ne = (e) => Me(e) || typeof e?.[Symbol.iterator] == "function", Pe = "[ 	\n\f\r]", Fe = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Ie = /-->/g, Le = />/g, Re = RegExp(`>|${Pe}(?:([^\\s"'>=/]+)(${Pe}*=${Pe}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ze = /'/g, Be = /"/g, Ve = /^(?:script|style|textarea|title)$/i, z = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), He = Symbol.for("lit-noChange"), B = Symbol.for("lit-nothing"), Ue = /* @__PURE__ */ new WeakMap(), We = ke.createTreeWalker(ke, 129);
function Ge(e, t) {
	if (!Me(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return we === void 0 ? t : we.createHTML(t);
}
var Ke = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = Fe;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === Fe ? c[1] === "!--" ? o = Ie : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = Re) : (Ve.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = Re) : o = Le : o === Re ? c[0] === ">" ? (o = i ?? Fe, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? Re : c[3] === "\"" ? Be : ze) : o === Be || o === ze ? o = Re : o === Ie || o === Le ? o = Fe : (o = Re, i = void 0);
		let d = o === Re && e[t + 1].startsWith("/>") ? " " : "";
		a += o === Fe ? n + Oe : l >= 0 ? (r.push(s), n.slice(0, l) + Te + n.slice(l) + Ee + d) : n + Ee + (l === -2 ? t : d);
	}
	return [Ge(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, qe = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Ke(t, n);
		if (this.el = e.createElement(l, r), We.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = We.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(Te)) {
					let t = u[o++], n = i.getAttribute(e).split(Ee), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Qe : r[1] === "?" ? $e : r[1] === "@" ? et : Ze
					}), i.removeAttribute(e);
				} else e.startsWith(Ee) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Ve.test(i.tagName)) {
					let e = i.textContent.split(Ee), t = e.length - 1;
					if (t > 0) {
						i.textContent = Ce ? Ce.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], Ae()), We.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], Ae());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === De) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(Ee, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += Ee.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = ke.createElement("template");
		return n.innerHTML = e, n;
	}
};
function Je(e, t, n = e, r) {
	if (t === He) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = je(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = Je(e, i._$AS(e, t.values), i, r)), t;
}
var Ye = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? ke).importNode(t, !0);
		We.currentNode = r;
		let i = We.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Xe(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new tt(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = We.nextNode(), a++);
		}
		return We.currentNode = ke, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Xe = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = B, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = Je(this, e, t), je(e) ? e === B || e == null || e === "" ? (this._$AH !== B && this._$AR(), this._$AH = B) : e !== this._$AH && e !== He && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? Ne(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== B && je(this._$AH) ? this._$AA.nextSibling.data = e : this.T(ke.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = qe.createElement(Ge(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ye(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Ue.get(e.strings);
		return t === void 0 && Ue.set(e.strings, t = new qe(e)), t;
	}
	k(t) {
		Me(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(Ae()), this.O(Ae()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = Se(e).nextSibling;
			Se(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Ze = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = B, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = B;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = Je(this, e, t, 0), a = !je(e) || e !== this._$AH && e !== He, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = Je(this, r[n + o], t, o), s === He && (s = this._$AH[o]), a ||= !je(s) || s !== this._$AH[o], s === B ? e = B : e !== B && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === B ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Qe = class extends Ze {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === B ? void 0 : e;
	}
}, $e = class extends Ze {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== B);
	}
}, et = class extends Ze {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = Je(this, e, t, 0) ?? B) === He) return;
		let n = this._$AH, r = e === B && n !== B || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== B && (n === B || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, tt = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		Je(this, e);
	}
}, nt = {
	M: Te,
	P: Ee,
	A: De,
	C: 1,
	L: Ke,
	R: Ye,
	D: Ne,
	V: Je,
	I: Xe,
	H: Ze,
	N: $e,
	U: et,
	B: Qe,
	F: tt
}, rt = xe.litHtmlPolyfillSupport;
rt?.(qe, Xe), (xe.litHtmlVersions ??= []).push("3.3.3");
var it = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Xe(t.insertBefore(Ae(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, at = globalThis, V = class extends be {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = it(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return He;
	}
};
V._$litElement$ = !0, V.finalized = !0, at.litElementHydrateSupport?.({ LitElement: V });
var ot = at.litElementPolyfillSupport;
ot?.({ LitElement: V }), (at.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/lit-html/directive.js
var st = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, ct = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), lt = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, { I: ut } = nt, dt = (e) => e, ft = () => document.createComment(""), pt = (e, t, n) => {
	let r = e._$AA.parentNode, i = t === void 0 ? e._$AB : t._$AA;
	if (n === void 0) n = new ut(r.insertBefore(ft(), i), r.insertBefore(ft(), i), e, e.options);
	else {
		let t = n._$AB.nextSibling, a = n._$AM, o = a !== e;
		if (o) {
			let t;
			n._$AQ?.(e), n._$AM = e, n._$AP !== void 0 && (t = e._$AU) !== a._$AU && n._$AP(t);
		}
		if (t !== i || o) {
			let e = n._$AA;
			for (; e !== t;) {
				let t = dt(e).nextSibling;
				dt(r).insertBefore(e, i), e = t;
			}
		}
	}
	return n;
}, mt = (e, t, n = e) => (e._$AI(t, n), e), ht = {}, gt = (e, t = ht) => e._$AH = t, _t = (e) => e._$AH, vt = (e) => {
	e._$AR(), e._$AA.remove();
}, yt = ct(class extends lt {
	constructor() {
		super(...arguments), this.key = B;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (gt(e), this.key = t), n;
	}
}), bt = (e, t, n) => {
	let r = /* @__PURE__ */ new Map();
	for (let i = t; i <= n; i++) r.set(e[i], i);
	return r;
}, xt = ct(class extends lt {
	constructor(e) {
		if (super(e), e.type !== st.CHILD) throw Error("repeat() can only be used in text expressions");
	}
	dt(e, t, n) {
		let r;
		n === void 0 ? n = t : t !== void 0 && (r = t);
		let i = [], a = [], o = 0;
		for (let t of e) i[o] = r ? r(t, o) : o, a[o] = n(t, o), o++;
		return {
			values: a,
			keys: i
		};
	}
	render(e, t, n) {
		return this.dt(e, t, n).values;
	}
	update(e, [t, n, r]) {
		let i = _t(e), { values: a, keys: o } = this.dt(t, n, r);
		if (!Array.isArray(i)) return this.ut = o, a;
		let s = this.ut ??= [], c = [], l, u, d = 0, f = i.length - 1, p = 0, m = a.length - 1;
		for (; d <= f && p <= m;) if (i[d] === null) d++;
		else if (i[f] === null) f--;
		else if (s[d] === o[p]) c[p] = mt(i[d], a[p]), d++, p++;
		else if (s[f] === o[m]) c[m] = mt(i[f], a[m]), f--, m--;
		else if (s[d] === o[m]) c[m] = mt(i[d], a[m]), pt(e, c[m + 1], i[d]), d++, m--;
		else if (s[f] === o[p]) c[p] = mt(i[f], a[p]), pt(e, i[d], i[f]), f--, p++;
		else if (l === void 0 && (l = bt(o, p, m), u = bt(s, d, f)), l.has(s[d])) {
			if (l.has(s[f])) {
				let t = u.get(o[p]), n = t === void 0 ? null : i[t];
				if (n === null) {
					let t = pt(e, i[d]);
					mt(t, a[p]), c[p] = t;
				} else c[p] = mt(n, a[p]), pt(e, i[d], n), i[t] = null;
				p++;
			} else vt(i[f]), f--;
		} else vt(i[d]), d++;
		for (; p <= m;) {
			let t = pt(e, c[m + 1]);
			mt(t, a[p]), c[p++] = t;
		}
		for (; d <= f;) {
			let e = i[d++];
			e !== null && vt(e);
		}
		return this.ut = o, gt(e, c), He;
	}
}), H = [
	"left",
	"top",
	"right",
	"bottom"
], St = [
	"stack",
	"reverse",
	"centre"
], Ct = ["squares", "squares_spread"];
function U(e) {
	let t = Math.floor(e), n = e - t;
	return n > .5 ? t + 1 : n < .5 || t % 2 == 0 ? t : t + 1;
}
var W = (e, t) => Math.floor(e / t);
function wt(e, t, n, r) {
	let [i, a, o, s] = e, c = n ? s : o, l = Array.from({ length: t + 1 }, (e, n) => U(n * (c - (t - 1) * r) / t + n * r)), u = Array.from({ length: t }, (e, n) => [l[n], l[n + 1] - l[n] - (n < t - 1 ? r : 0)]);
	return u[t - 1] = [u[t - 1][0], c - u[t - 1][0]], u.map(([e, t]) => n ? [
		i,
		a + e,
		o,
		t
	] : [
		i + e,
		a,
		t,
		s
	]);
}
function Tt(e, t, n, r, i) {
	let [a, o, s, c] = e, [l, u] = n ? [s, c] : [c, s], d = t.map((e) => n ? l / e : l * e), f = u - r * (t.length - 1), p = d.reduce((e, t) => e + t, 0), m = p > 0 && f > 0 ? Math.min(1, f / p) : 0, h = Math.trunc(l * m);
	d = d.map((e) => Math.trunc(e * m));
	let g = d.reduce((e, t) => e + t, 0) + r * (t.length - 1), _ = i === "reverse" ? u - g : i === "centre" ? W(u - g, 2) : 0, v = W(l - h, 2);
	return d.map((e) => {
		let t = n ? [
			a + v,
			o + _,
			h,
			e
		] : [
			a + _,
			o + v,
			e,
			h
		];
		return _ += e + r, t;
	});
}
function Et(e, t, n, r, i, a, o) {
	n = Math.max(1, Math.min(n, t));
	let s = wt(e, n, !r, i), c = [], l = 0;
	return s.forEach((e, s) => {
		let u = Math.floor(t / n) + +(s < t % n);
		c.push(...a === null ? wt(e, u, r, i) : Tt(e, a.slice(l, l + u), r, i, o)), l += u;
	}), c;
}
function Dt(e, t, n, r, i, a, o) {
	n = Math.max(1, Math.min(n, t));
	let s = wt(e, n, !r, i), c = Math.ceil(t / n), l = r ? e[3] : e[2], u = Math.min(...s.map((e) => r ? e[2] : e[3])), d = r ? 1 / o : o, f = Math.max(0, Math.min(U(u * d), W(l - i * (c - 1), c))), p = Math.min(u, U(f / d)), m = l - c * f, h = Array.from({ length: c }, (e, t) => t), g = a && m >= i * (c + 1) ? h.map((e) => U((e + 1) * m / (c + 1)) + e * f) : h.map((e) => W(m - i * (c - 1), 2) + e * (f + i));
	return s.flatMap(([e, i, a, o], s) => {
		let c = Math.floor(t / n) + +(s < t % n), l = W((r ? a : o) - p, 2);
		return g.slice(0, c).map((t) => r ? [
			e + l,
			i + t,
			p,
			f
		] : [
			e + t,
			i + l,
			f,
			p
		]);
	});
}
function Ot(e) {
	let t;
	if (typeof e == "number") t = e;
	else {
		let [n, r] = String(e).trim().replace("/", ":").split(":");
		t = r === void 0 ? Number(n) : Number(n) / Number(r);
	}
	if (!(t > 0)) throw Error(`not a shape: ${e}`);
	return t;
}
var kt = (t) => e.main[t].default;
function At(e, t) {
	let n = e.main_fit ?? kt("main_fit");
	return n === "fixed" ? Ot(e.main_ratio ?? kt("main_ratio")) : n === "own" ? Number((e.aspects ?? {})[t ?? ""] || 16 / 9) : null;
}
function jt(t, n = null) {
	let { width: r, height: i, gap: a } = t, o = Math.max(0, Math.min(Math.trunc(Number(t.margin ?? 0)), W(Math.min(r, i) - 1, 2)));
	if (o) {
		let [, e, a] = jt({
			...t,
			width: r - 2 * o,
			height: i - 2 * o,
			margin: 0
		}, n), s = (e) => [
			e[0] + o,
			e[1] + o,
			e[2],
			e[3]
		];
		return [
			[r, i],
			s(e),
			Object.fromEntries(H.map((e) => [e, a[e].map(s)]))
		];
	}
	let s = At(t, n), c = (e) => t[e].cameras.length > 0, l = (e, n) => c(e) ? t[e].unit === "px" ? Math.min(U(t[e].size * (t.scale ?? 1)), W(n * 45, 100)) : U(n * t[e].size / 100) : 0, u = (n, r) => {
		let i = `anchor_${r}`;
		return !!(t[n][i] ?? e.panels[n][i]);
	}, d, f, p, m, h = 0, g = 0;
	if (s === null) [d, f, p, m] = [
		l("left", r),
		l("right", r),
		l("top", i),
		l("bottom", i)
	];
	else {
		let e = Number(t.panel_min ?? kt("panel_min")), n = (t, n, r) => (Number(c(n)) + Number(c(r))) * (U(t * e / 100) + a), o = r - n(r, "left", "right"), l = i - n(i, "top", "bottom");
		h = Math.min(U(r * Number(t.main_width ?? kt("main_width")) / 100), o), g = U(h / s), g > l && ([g, h] = [l, U(l * s)]);
		let u = (e, t, n) => {
			let [r, i] = [c(t), c(n)], o = Math.max(e - a * (Number(r) + Number(i)), 0);
			return r && i ? [W(o, 2), o - W(o, 2)] : r ? [o, 0] : i ? [0, o] : [0, 0];
		};
		[d, f] = u(r - h, "left", "right"), [p, m] = u(i - g, "top", "bottom");
	}
	let _ = d + (d ? a : 0), v = r - f - (f ? a : 0), y = p + (p ? a : 0), b = i - m - (m ? a : 0), x = (e, t, n) => {
		let i = u(e, "left") ? 0 : _;
		return [
			i,
			t,
			(u(e, "right") ? r : v) - i,
			n
		];
	}, S = (e, t, n) => {
		let r = p && u("top", n) ? y : 0;
		return [
			e,
			r,
			t,
			(m && u("bottom", n) ? b : i) - r
		];
	}, C = {
		top: x("top", 0, p),
		bottom: x("bottom", i - m, m),
		left: S(0, d, "left"),
		right: S(r - f, f, "right")
	}, w = (e) => St.includes(t[e].fit ?? "") ? t[e].cameras.map((e) => Number((t.aspects ?? {})[e] || 16 / 9)) : null, T = (n) => {
		let [r, i, o, s] = [
			t[n].cameras.length,
			Math.trunc(Number(t[n].lines ?? 1)),
			t[n].fit ?? "cover",
			n === "left" || n === "right"
		];
		return r ? Ct.includes(o) ? Dt(C[n], r, i, s, a, o === "squares_spread", Ot(t[n].cell ?? e.panel.cell.default)) : Et(C[n], r, i, s, a, w(n), o) : [];
	}, E = Object.fromEntries(H.map((e) => [e, T(e)])), D = [
		_,
		y,
		v - _,
		b - y
	];
	return s !== null && (h = Math.min(h, v - _), g = Math.min(g, b - y), D = [
		_ + W(v - _ - h, 2),
		y + W(b - y - g, 2),
		h,
		g
	]), [
		[r, i],
		D,
		E
	];
}
function Mt(e, t, n, r) {
	let i = (r) => jt({
		...e,
		width: n,
		height: r
	}, t)[1], a = At(e, t) !== null, [o, s] = [1, Math.max(64, Math.ceil(n * 4))], c = i(s)[2], l = (e) => {
		let [, , t, n] = i(e);
		return a ? t >= c : n > 0 && t <= n * r;
	};
	if (!c || !l(s)) return Math.round(n / r);
	for (; o < s;) {
		let e = W(o + s, 2);
		l(e) ? s = e : o = e + 1;
	}
	return o;
}
//#endregion
//#region src/responsive.ts
var Nt = e.responsive, Pt = Object.fromEntries(Object.entries(Nt).map(([e, t]) => [e, t.default])), Ft = [
	"bottom",
	"right",
	"left",
	"top"
], It = [16, 9], Lt = 5, Rt = 24, G = (e, t) => Math.floor(e / t);
function zt(e) {
	if (typeof e == "string" && e.includes(":")) {
		let [t, n] = e.split(":");
		return [Math.trunc(Number(t)), Math.trunc(Number(n))];
	}
	return [U(Number(e) * 1e3), 1e3];
}
function Bt(e, t, n) {
	let [r, i] = [e * n[1], t * n[0]];
	return 1e3 - G(1e3 * Math.min(r, i), Math.max(r, i));
}
var Vt = (e, t, n) => Math.min(e, G(t * n[0], n[1])) * Math.min(t, G(e * n[1], n[0]));
function Ht(e, t, n, r) {
	return e ? r.includes(t) && r.includes(n) ? r.indexOf(t) < r.indexOf(n) ? G(e + 1, 2) : G(e, 2) : r.includes(t) ? e : r.includes(n) ? 0 : null : 0;
}
var Ut = /* @__PURE__ */ new Map();
function Wt(e, t, n, r, i, a, o, s, c, l, u) {
	let d = JSON.stringify([
		e,
		t,
		n,
		r,
		i,
		a,
		o,
		s,
		c,
		l,
		u
	]), f = Ut.get(d);
	if (f !== void 0) return f;
	let p = Vt(e, t, a), m = null, h = null;
	for (let d = 1; d <= Rt; d++) {
		let f = G(e - (d - 1) * n, d);
		if (f < s) break;
		for (let g = 1; g <= Rt; g++) {
			let [_, v] = [f, G(t - (g - 1) * n, g)];
			if (v < 1) break;
			if (_ * i[1] * (100 - o) > v * i[0] * 100 ? _ = G(v * i[0] * 100, i[1] * (100 - o)) : _ * i[1] * 100 < v * i[0] * (100 - o) && (v = G(_ * i[1] * 100, i[0] * (100 - o))), _ < s || v < 1) continue;
			let y = Bt(_, v, i);
			for (let i = 2; i <= d; i++) {
				let s = Ht(d - i, "left", "right", u);
				if (s !== null) for (let f = 2; f <= g; f++) {
					let b = Ht(g - f, "top", "bottom", u), x = d * g - i * f;
					if (b === null || !x) continue;
					let [S, C] = [i * _ + (i - 1) * n, f * v + (f - 1) * n], w = Bt(S, C, a), T = S * C;
					if (w > Math.max(o * 10 + Lt, 50) || T * 100 < c * p) continue;
					let E = x >= r ? 0 : r - (x - 1), D = Math.min(r, x), O = e * t - D * _ * v - T, k = Math.max(0, T * 100 - l * p), A = [
						E,
						G(O * 1e6, e * t) + 500 * y + 500 * w + G(k * 9e3, e * t),
						-_ * v,
						d,
						g,
						i,
						f
					];
					(m === null || Gt(A, m)) && ([m, h] = [A, [
						d,
						g,
						i,
						f,
						s,
						b,
						_,
						v
					]]);
				}
			}
		}
	}
	return Ut.size >= 512 && Ut.clear(), Ut.set(d, h), h;
}
function Gt(e, t) {
	for (let n = 0; n < e.length; n++) if (e[n] !== t[n]) return e[n] < t[n];
	return !1;
}
function Kt([e, t, n, r, i, a], o) {
	let s = {
		left: (e) => e < i,
		right: (e) => e >= i + n,
		top: (e, t) => t < a,
		bottom: (e, t) => t >= a + r
	}, c = [];
	return o.forEach((n, r) => {
		let i = o.slice(r + 1);
		for (let r = 0; r < t; r++) for (let t = 0; t < e; t++) s[n](t, r) && !i.some((e) => s[e](t, r)) && c.push([t, r]);
	}), c;
}
function qt(e, t, n, r, i, a = {}, o = null, s = 1) {
	let c = {
		...Pt,
		...a
	}, l = Math.max(0, Math.min(Math.trunc(r), G(Math.min(e, t) - 1, 2))), [u, d] = [e - 2 * l, t - 2 * l], f = d > u && c.edges_tall !== null ? c.edges_tall : c.edges, p = [...new Set(f.filter((e) => Ft.includes(e)))], m = o ? zt(o) : It, h = c.main_other === "follow" ? m : It, g = i > 1 ? i : 0, _ = Math.max(1, U(c.tile_min * s)), v = (e, t, r) => Wt(u, d, n, g, zt(c.tile_shape), h, Math.trunc(c.tile_loss), r, t, Math.trunc(c.main_most), e), y = p, b = [], x = g ? v(p, Math.trunc(c.main_least), _) : null;
	if (x === null && g && c.cant_fit === "find") {
		let e = [
			[
				Math.trunc(c.main_least),
				_,
				[]
			],
			[
				0,
				_,
				["main_least"]
			],
			[
				0,
				1,
				["main_least", "tile_min"]
			]
		];
		for (let [t, n, r] of e) {
			if ([p, b] = [y, r], x = v(p, t, n)) break;
			for (let e of Ft.filter((e) => !y.includes(e))) if ([p, b] = [[...p, e], ["edges", ...r]], x = v(p, t, n)) break;
			if (x) break;
		}
	}
	if (x === null) return {
		size: [e, t],
		main: [
			l,
			l,
			u,
			d
		],
		main_how: Bt(u, d, m) <= 50 ? "cover" : "contain",
		tiles: [],
		more: null,
		dropped: g,
		gave: g ? [...b, "main_alone"] : [],
		grid: [
			1,
			1,
			1,
			1
		]
	};
	let [S, C, w, T, E, D, O, k] = x, A = l + G(u - (S * O + (S - 1) * n), 2), j = l + G(d - (C * k + (C - 1) * n), 2), [M, N] = [w * O + (w - 1) * n, T * k + (T - 1) * n], P = Kt(x, p).map(([e, t]) => [
		A + e * (O + n),
		j + t * (k + n),
		O,
		k
	]), F = P.length >= g ? 0 : g - (P.length - 1), I = g - F, ee = c.main_other === "whole" && Bt(M, N, m) > 50;
	return {
		size: [e, t],
		main: [
			A + E * (O + n),
			j + D * (k + n),
			M,
			N
		],
		main_how: ee ? "contain" : "cover",
		tiles: P.slice(0, I),
		more: F ? P[I] : null,
		dropped: F,
		gave: b,
		grid: [
			S,
			C,
			w,
			T
		]
	};
}
//#endregion
//#region src/placed.ts
var Jt = ["cover", ...Ct], Yt = {
	fill: "fill",
	crop: "cover"
};
function Xt(e) {
	return e.mode === "responsive" ? [...new Set(e.responsive?.cameras ?? [])] : [...new Set(H.flatMap((t) => e[t].cameras))];
}
function Zt(e, t = null) {
	if (e.mode !== "responsive") {
		let [n, r, i] = jt(e, t);
		return {
			size: n,
			main: r,
			mainHow: Yt[e.main_fit ?? "fit"] ?? "contain",
			tiles: H.flatMap((t) => e[t].cameras.map((n, r) => ({
				where: t,
				camera: n,
				rect: i[t][r],
				how: Jt.includes(e[t].fit ?? "cover") ? "cover" : "contain"
			}))),
			more: null,
			gave: []
		};
	}
	let n = Xt(e), r = qt(e.width, e.height, e.gap, e.margin ?? 0, n.length, e.responsive ?? {}, (e.aspects ?? {})[t ?? ""] ?? null, e.scale ?? 1);
	return {
		size: [e.width, e.height],
		main: r.main,
		mainHow: r.main_how,
		tiles: r.tiles.map((e, t) => ({
			where: "tiles",
			camera: n[t],
			rect: e,
			how: "cover"
		})),
		more: r.more ? {
			rect: r.more,
			count: r.dropped
		} : null,
		gave: r.gave
	};
}
var Qt = {
	about: "How a commander's camera names are drawn, and where the Camera Commander card puts its Talk chips: each commander's `labels`. Each option: label, help, default, and its range (with `step` where it takes halves) or its choices (neither: a colour). `name`: a name's size is a share of its place, never under `floor` px nor over `cap` px (CSS px); `tile_was` and `main_was` are the sides a size saved in px before 2026.11.14-b8 is read against. `picture`: which part of a cropped main camera is kept (the commander's `main_keep`). `fonts`: the file of each font but the standard one (Pillow's built-in), in the casa_mia component's www/fonts. Read by the compositor (compositor/labels.py), the app's checks, the cards (integration/cards/src/labels.ts) and the admin page. Not in layout.json, which Sensor Watch's cards bundle.",
	labels: {
		font: {
			label: "Font",
			default: "standard",
			options: [
				["standard", "Standard"],
				["sans", "DejaVu Sans"],
				["sans_bold", "DejaVu Sans Bold"],
				["mono", "DejaVu Sans Mono (fixed width)"]
			],
			help: "The font the cameras' names are in. Standard is the one they were always in; a live main camera's name is then in the browser's own font."
		},
		tile_share: {
			label: "Tile name size, %",
			default: 11,
			min: 4,
			max: 25,
			step: .5,
			help: "The height of a tile's name, as a share of the shorter side of the commander's smallest tile, so the names are in proportion on a phone and on a large screen alike, and all the same size. Never under 7 px or over 72 px. A name too long for its tile is shortened, with … at its end."
		},
		main_share: {
			label: "Main camera name size, %",
			default: 4,
			min: 2,
			max: 12,
			step: .5,
			help: "The height of the main camera's name and of the clock beside it, as a share of the shorter side of the main camera's place. Never under 7 px or over 72 px."
		},
		colour: {
			label: "Text colour",
			default: "#ffffff",
			help: "The colour of the names and the clock."
		},
		tint: {
			label: "Background colour",
			default: "#000000",
			help: "The colour behind a name."
		},
		opacity: {
			label: "Background opacity, %",
			default: 55,
			min: 0,
			max: 100,
			help: "How solid the colour behind a name is. 0 leaves the name alone on the picture."
		},
		tile_style: {
			label: "A tile's name",
			default: "bar",
			options: [
				["bar", "Bar"],
				["pill", "Pill"],
				["none", "None"]
			],
			help: "Bar: across the foot of the tile. Pill: only as wide as the name. None: no name."
		},
		main_style: {
			label: "The main camera's name",
			default: "pill",
			options: [
				["bar", "Bar"],
				["pill", "Pill"],
				["none", "None"]
			],
			help: "Bar: across the foot of the main camera. Pill: only as wide as the name. None: no name; the clock stays."
		},
		talk_status: {
			label: "Call status at",
			default: "top-left",
			options: [
				["top-left", "Top, left"],
				["top-centre", "Top, centre"],
				["top-right", "Top, right"],
				["bottom-left", "Bottom, left"],
				["bottom-centre", "Bottom, centre"],
				["bottom-right", "Bottom, right"]
			],
			help: "Where the call's state (ringing, answered, time left) goes over the main camera. Put it clear of the date and name your cameras write on their own picture."
		},
		talk_status_x: {
			label: "Call status, nudge across, px",
			default: 0,
			min: -300,
			max: 300,
			help: "Moves the call's state sideways from where it is put: to the right, or to the left below 0."
		},
		talk_status_y: {
			label: "Call status, nudge down, px",
			default: 0,
			min: -300,
			max: 300,
			help: "Moves the call's state down from where it is put, or up below 0."
		},
		talk_buttons: {
			label: "Talk buttons at",
			default: "bottom-right",
			options: [
				["top-left", "Top, left"],
				["top-centre", "Top, centre"],
				["top-right", "Top, right"],
				["bottom-left", "Bottom, left"],
				["bottom-centre", "Bottom, centre"],
				["bottom-right", "Bottom, right"]
			],
			help: "Where the Talk and hold-to-talk buttons go over the main camera."
		},
		talk_buttons_x: {
			label: "Talk buttons, nudge across, px",
			default: 0,
			min: -300,
			max: 300,
			help: "Moves the Talk buttons sideways from where it is put: to the right, or to the left below 0."
		},
		talk_buttons_y: {
			label: "Talk buttons, nudge down, px",
			default: 0,
			min: -300,
			max: 300,
			help: "Moves the Talk buttons down from where it is put, or up below 0."
		}
	},
	name: {
		floor: 7,
		cap: 72,
		tile_was: 144,
		main_was: 500
	},
	picture: { main_keep: {
		label: "Keep this part of the main camera",
		default: "center",
		options: [
			["top-left", "Top left"],
			["top", "Top"],
			["top-right", "Top right"],
			["left", "Left"],
			["center", "Centre"],
			["right", "Right"],
			["bottom-left", "Bottom left"],
			["bottom", "Bottom"],
			["bottom-right", "Bottom right"]
		],
		help: "When the main camera is cropped, in any layout, the crop keeps this part of its picture and comes off the opposite side. Top left keeps the date and time many cameras write there."
	} },
	fonts: {
		sans: "DejaVuSans.ttf",
		sans_bold: "DejaVuSans-Bold.ttf",
		mono: "DejaVuSansMono.ttf"
	}
}, $t = Qt.labels, en = Qt.fonts, tn = Object.fromEntries(Object.entries($t).map(([e, t]) => [e, t.default])), nn = (e) => ({
	...tn,
	...e
});
function rn(e, t, n = 1) {
	return Math.floor(Math.min(Qt.name.cap * n, Math.max(Qt.name.floor * n, e * t / 100)) + .5);
}
var an = (e) => `Casa Mia ${e}`, on = (e) => e in en ? `"${an(e)}", sans-serif` : "sans-serif";
function sn(e) {
	let [t, n, r] = [
		1,
		3,
		5
	].map((t) => parseInt(e.tint.slice(t, t + 2), 16));
	return `rgb(${t} ${n} ${r} / ${e.opacity / 100})`;
}
var cn = /* @__PURE__ */ new Set();
function ln(e, t) {
	if (!(e in en) || cn.has(e) || typeof FontFace > "u") return;
	cn.add(e);
	let n = new FontFace(an(e), `url("${t(en[e])}")`);
	document.fonts.add(n), n.load().catch((n) => console.warn(`casa-mia: the label font ${e} (${t(en[e])}) didn't load: ${n}`));
}
var un = 10;
function dn(e, t, n) {
	return e.main_style === "bar" ? Math.round(n * 1.9) + 6 : e.main_style === "pill" && t === "bottom-left" ? un + Math.round(n * 1.2) + 4 + 6 : un;
}
function fn(e, t = un) {
	let [n, r] = e.split("-"), i = {
		left: {
			left: `${un}px`,
			alignItems: "flex-start",
			"--cm-just": "flex-start"
		},
		centre: {
			left: "50%",
			transform: "translateX(-50%)",
			alignItems: "center",
			"--cm-just": "center"
		},
		right: {
			right: `${un}px`,
			alignItems: "flex-end",
			"--cm-just": "flex-end"
		}
	};
	return {
		...n === "top" ? { top: `${un}px` } : { bottom: `${t}px` },
		...i[r]
	};
}
var pn = (e, t) => ({ transform: `translate(${e[`${t}_x`]}px, ${e[`${t}_y`]}px)` }), mn = Qt.picture.main_keep;
function hn(e = mn.default) {
	return `${e.includes("left") ? 0 : e.includes("right") ? 100 : 50}% ${e.includes("top") ? 0 : e.includes("bottom") ? 100 : 50}%`;
}
//#endregion
//#region src/commander/motion.ts
var gn = {
	motion_dot: !0,
	motion_colour: [
		255,
		59,
		48
	],
	motion_size: 10,
	motion_pulse: 1.5,
	motion_linger: 10,
	motion_corner: "top-right"
}, _n = (e) => new Date(e).toLocaleTimeString([], {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit"
}), vn = ({ since: e, until: t }) => t === void 0 ? `Motion since ${_n(e)}` : e === void 0 ? `Motion until ${_n(t)}` : `Motion ${_n(e)} to ${_n(t)}`, yn = class {
	constructor() {
		this.began = /* @__PURE__ */ new Map();
	}
	seen(e, t, n, r) {
		let i = {
			...gn,
			...n
		}, a = /* @__PURE__ */ new Map();
		if (clearTimeout(this.timer), !i.motion_dot) return a;
		let o = Date.now(), s = Infinity;
		for (let [n, r] of Object.entries(t)) {
			let t = e.states[r], c = Date.parse(t?.last_changed ?? "");
			t && !Number.isNaN(c) && (t.state === "on" ? (this.began.set(r, c), a.set(n, { since: c })) : o - c < i.motion_linger * 1e3 && (a.set(n, {
				since: this.began.get(r),
				until: c
			}), s = Math.min(s, c + i.motion_linger * 1e3)));
		}
		return s < Infinity && (this.timer = setTimeout(r, s - o + 50)), a;
	}
	stop() {
		clearTimeout(this.timer);
	}
};
function bn(e, t, n, r) {
	if (!e) return B;
	let i = {
		...gn,
		...n
	}, [a, o, s] = i.motion_colour, [c, l] = i.motion_corner.split("-");
	return z`<div class="motion-tile" style=${t}>
    <span
      class="motion ${i.motion_pulse > 0 ? "pulse" : ""}"
      title=${vn(e)}
      style="${c}:6px;${l}:6px;--cm-motion:rgb(${a},${o},${s});--cm-motion-size:${i.motion_size}px;--cm-motion-pulse:${i.motion_pulse}s"
      @click=${r}
    ></span>
  </div>`;
}
var xn = R`
  .motion-tile {
    position: absolute;
    pointer-events: none;
  }
  .motion {
    position: absolute;
    width: var(--cm-motion-size);
    height: var(--cm-motion-size);
    border-radius: 50%;
    background: var(--cm-motion);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
    pointer-events: auto;
    cursor: pointer;
  }
  .motion.pulse {
    animation: cm-motion var(--cm-motion-pulse) ease-out infinite;
  }
  @keyframes cm-motion {
    0% {
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 0 0 var(--cm-motion);
    }
    100% {
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 0 calc(var(--cm-motion-size) * 0.9) transparent;
    }
  }
`, Sn = {
	landscape: "bottom",
	portrait: "bottom",
	align: "center",
	size: 7,
	opacity: 60
}, Cn = {
	min: 3,
	max: 12,
	step: .5
}, wn = {
	small: 40,
	medium: 56,
	large: 72
}, Tn = 800;
function En(e) {
	let t = {
		...Sn,
		...e
	}, n = typeof t.size == "number" ? t.size : wn[t.size] ?? Sn.size, r = n > Cn.max ? Math.round(200 * n / Tn) / 2 : n;
	return {
		...t,
		size: Math.min(Cn.max, Math.max(Cn.min, r))
	};
}
function Dn(e, t) {
	return Math.min(96, Math.max(10, e.size * Math.min(...t) / 100));
}
var On = {
	height: 22,
	font: 10,
	pad: 10,
	gap: 4,
	icon: 13
}, kn = .72, An = .2, jn = .3, Mn = .3, Nn = (e) => e === null ? 1 : (2 * On.pad + On.icon + On.gap + e.length * On.font * kn) / On.height;
function Pn(e, t, n, r, i) {
	let a = Dn(e, t), o = n === "top" || n === "bottom", s = (e, n) => {
		let s = i.length ? n ? ["PTZ"] : i : [], c = [...r, ...s].map((t) => Nn(e ? t : null));
		if (!c.length) return !0;
		let l = (e) => (e.reduce((e, t) => e + t, 0) + (e.length - 1) * An + 2 * jn) * a;
		return o ? l(c) <= t[0] : l(c.map(() => 1)) <= t[1] && (Math.max(...c) + 2 * jn) * a <= t[0] * Mn;
	}, c = [
		[!0, i.length > 3],
		[!0, !0],
		[!1, !0]
	], [l, u] = c.find(([e, t]) => s(e, t)) ?? c[2];
	return {
		height: a,
		names: l,
		fold: u
	};
}
function Fn(e, t, n = 1) {
	let r = t * n, i = (e) => `${Math.round(r * e * 100 / On.height) / 100}px`;
	return {
		"--cm-pill-height": `${Math.round(r * 100) / 100}px`,
		"--cm-pill-font": i(On.font),
		"--cm-pill-pad": i(On.pad),
		"--cm-pill-gap": i(On.gap),
		"--cm-pill-icon": i(On.icon),
		"--cm-pill-alpha": `${e.opacity}%`,
		"--cm-pill-align": e.align === "center" ? "center" : `flex-${e.align}`
	};
}
//#endregion
//#region src/commander/full.ts
var In = /* @__PURE__ */ new Set(["unavailable", "unknown"]), Ln = 1e4;
function Rn(e, n, r, i, a, o, s) {
	let c = r.controls ?? [], l = r.presets ?? [];
	if (!c.length && !o.length && !l.length) return B;
	let u = En(r.controls_at), d = a[0] >= a[1] ? u.landscape : u.portrait, f = (e) => e.name || n.states[e.entity]?.attributes.friendly_name || e.entity, p = Pn(u, a, d, [...o.map((e) => e.label), ...c.map(f)], l.map((e) => e.name)), m = Object.entries(Fn(u, p.height)).map(([e, t]) => `${e}:${t}`).join(";"), h = p.fold && l.length > 0, g = (e) => z`<button class="control" title="Move the camera to ${e.name}" @click=${() => s.go(e)}>
      <ha-icon icon="mdi:camera-control"></ha-icon>
      <span>${e.name}</span>
    </button>`;
	return z`<div class="controls-area" style=${i}>
    <div class="controls ${p.names ? "" : "icons"}" style=${m} data-edge=${d}>
      <div class="controls-line">
        ${o.map((e) => z`<button class="control ${e.on ? "on" : ""}" title=${e.title} aria-label=${e.label} @click=${e.toggle}>
              <ha-icon icon=${e.icon}></ha-icon>
              <span>${e.label}</span>
            </button>`)}
        ${c.map((r) => {
		let i = n.states[r.entity], a = f(r), o = i ? In.has(i.state) ? "Unavailable" : "" : "Not found";
		return z`<button
            class="control ${i?.state === "on" || i?.state === "open" || i?.state === "unlocked" ? "on" : ""}"
            ?disabled=${!!o}
            title=${o ? `${r.entity}: ${o}` : a}
            aria-label=${a}
            @click=${() => t(e, "hass-action", {
			config: {
				entity: r.entity,
				tap_action: { action: "toggle" }
			},
			action: "tap"
		})}
          >
            ${i ? z`<ha-state-icon .hass=${n} .stateObj=${i} .icon=${r.icon}></ha-state-icon>` : z`<ha-icon icon="mdi:alert-circle-outline"></ha-icon>`}
            <span>${a}</span>
            ${o ? z`<span class="cm-pill cm-filled cm-bad">${o}</span>` : B}
          </button>`;
	})}
        ${h ? z`<button
              class="control ${s.open ? "on" : ""}"
              title=${s.open ? "Put the presets away" : `Its ${l.length} PTZ presets`}
              aria-expanded=${s.open}
              @click=${s.toggle}
            >
              <ha-icon icon="mdi:camera-control"></ha-icon>
              <span>PTZ</span>
            </button>` : l.map(g)}
        ${s.failed ? z`<span class="cm-pill cm-filled cm-bad failed">${s.failed}</span>` : B}
      </div>
      ${h && s.open ? z`<div class="controls-line">${l.map(g)}</div>` : B}
    </div>
  </div>`;
}
var zn = R`
  /* Over the whole screen, Home Assistant's own header and sidebar too. */
  .full {
    position: fixed;
    inset: 0;
    z-index: 10;
    background: #000;
  }
  /* Sized from the pill's height (controls.ts: controlsStyle), as the page's preview is.
     The bar's lines stand side by side from its edge inwards: the bar itself, then the
     PTZ presets when they are opened out. */
  .controls {
    position: absolute;
    display: flex;
    gap: calc(var(--cm-pill-height) * 0.2);
    padding: calc(var(--cm-pill-height) * 0.3);
  }
  .controls-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: var(--cm-pill-align);
    gap: calc(var(--cm-pill-height) * 0.2);
  }
  /* The style guide's chip (pills.css: cm-chip) at the pill's height: its text, ends and
     gap in the guide's proportions (controls.ts: CHIP), in capitals. Its colours are its
     own: white on a black of the camera's chosen strength, to be read over a picture. */
  .control {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--cm-pill-gap);
    height: var(--cm-pill-height);
    padding: 0 var(--cm-pill-pad);
    border: none;
    border-radius: calc(var(--cm-pill-height) / 2);
    background: rgb(0 0 0 / var(--cm-pill-alpha));
    color: #fff;
    font: 500 var(--cm-pill-font) / 1.2 var(--ha-font-family-body, sans-serif);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    --mdc-icon-size: var(--cm-pill-icon);
  }
  .control.on {
    background: color-mix(in srgb, var(--state-active-color, var(--primary-color)) var(--cm-pill-alpha), transparent);
  }
  .control:disabled {
    opacity: 0.7;
    cursor: default;
  }
  /* A pill drawn small (a phone's main area) is still as easy to hit as a 44 px one: its
     tap area reaches past it, across the bar, and half-way to the next pill along it. */
  .control::after {
    content: "";
    position: absolute;
    inset: min(0px, calc((var(--cm-pill-height) - 44px) / 2)) calc(var(--cm-pill-height) * -0.1);
  }
  .controls[data-edge="left"] .control::after,
  .controls[data-edge="right"] .control::after {
    inset: calc(var(--cm-pill-height) * -0.1) min(0px, calc((var(--cm-pill-height) - 44px) / 2));
  }
  /* No room for the names (controls.ts: barFit): the bar's pills are their icons alone,
     round, each still named to a screen reader and on a pointer's hover. The presets,
     when opened out, keep their names. */
  .controls.icons .controls-line:first-child .control {
    justify-content: center;
    width: var(--cm-pill-height);
    padding: 0;
  }
  .controls.icons .controls-line:first-child .control span {
    display: none;
  }
  /* Why a preset didn't go: wraps, so a long reason stays on a narrow card. */
  .controls .failed {
    white-space: normal;
  }
  /* Its place (the full screen or the main area) lets taps through to the picture
     under it, but for the buttons themselves. */
  .controls-area {
    position: absolute;
    pointer-events: none;
  }
  .control {
    pointer-events: auto;
  }
  /* The edge for its place's shape: set on the Cameras page. The second line is on the
     picture's side of the first. */
  .controls[data-edge="top"] { top: 0; left: 0; right: 0; flex-direction: column; }
  .controls[data-edge="bottom"] { bottom: 0; left: 0; right: 0; flex-direction: column-reverse; }
  .controls[data-edge="left"] { left: 0; top: 0; bottom: 0; flex-direction: row; }
  .controls[data-edge="right"] { right: 0; top: 0; bottom: 0; flex-direction: row-reverse; }
  .controls[data-edge="left"] .controls-line,
  .controls[data-edge="right"] .controls-line { flex-direction: column; flex-wrap: nowrap; align-items: stretch; }
`, Bn = ["fullscreenchange", "webkitfullscreenchange"], Vn = (e = document) => !!(e.fullscreenEnabled ?? e.webkitFullscreenEnabled), Hn = (e = document) => !!(e.fullscreenElement ?? e.webkitFullscreenElement);
function Un(e, t, n = document) {
	let r = t ? e.requestFullscreen ? e.requestFullscreen() : e.webkitRequestFullscreen?.() : n.exitFullscreen ? n.exitFullscreen() : n.webkitExitFullscreen?.();
	Promise.resolve(r).catch((e) => console.warn(`casa-mia: full screen ${t ? "refused" : "not left"}: ${e?.message ?? e}`));
}
function Wn(e = navigator) {
	return /iPad|Macintosh/.test(e.userAgent) && e.maxTouchPoints > 1 ? "max(env(safe-area-inset-top, 0px), 24px)" : "env(safe-area-inset-top, 0px)";
}
var Gn = (e) => !!(e.webkitSupportsFullscreen && e.webkitEnterFullscreen), Kn = 500;
function qn(e) {
	e.addEventListener("webkitendfullscreen", () => setTimeout(() => e.play().catch(() => void 0), Kn), { once: !0 }), e.webkitEnterFullscreen?.();
}
//#endregion
//#region src/commander/common.ts
var Jn = 1e4, Yn = 2e4;
function Xn(e, t, n, r = Jn) {
	return t ? n - t < 5e3 ? null : "the video stopped" : n - e < r ? null : "no video arrived";
}
var Zn = () => document.createElement("video").canPlayType("application/vnd.apple.mpegurl") !== "", Qn = (e = globalThis, t = Zn) => "RTCPeerConnection" in e ? "webrtc" : t() ? "hls" : "", $n = 3e4, er = 6e5;
function tr(e, t, n, r) {
	let i = (e?.fails ?? 0) + 1;
	return {
		since: e?.since ?? n,
		until: r + Math.min(er, $n * 2 ** (i - 1)),
		fails: i,
		why: t
	};
}
function nr(e, t, n) {
	let r = e.map(([e]) => e), i = r.indexOf(M(e, t, n) ?? "");
	return [...r.slice(0, i + 1).reverse(), ...r.slice(i + 1)];
}
function rr(e, t, n) {
	let r = e.find(t);
	return {
		shown: r,
		tried: (r === void 0 ? e : e.slice(0, e.indexOf(r))).find((e) => !n(e))
	};
}
function ir(e) {
	let t = Math.floor(e / 1e3);
	if (t < 60) return `${t} s`;
	if (t < 3600) return `${Math.floor(t / 60)} min`;
	let n = Math.floor(t / 60) % 60;
	return `${Math.floor(t / 3600)} h${n ? ` ${n} min` : ""}`;
}
function ar(e, t, n) {
	return !t || n - t >= 15e3 ? null : `Picture failing for ${ir(n - e)}: retrying`;
}
function or(e, t, n) {
	return e === "ha" || e === "auto" && (n || !t);
}
function sr(e, t, n) {
	return e === "auto" && !t && !n;
}
function cr(e, t) {
	return !e.startsWith("/api/") || !e.includes(".mjpg?") ? "" : new URL(e.replace(".mjpg?", ".ws?"), t.replace(/^http/, "ws")).href;
}
var lr = () => location.pathname.split("/")[1] ?? "", ur = new URL(import.meta.url).searchParams.get("v") || "dev", dr = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", fr = 4096e3;
function pr(e, t, n) {
	let r = Math.min(1, Math.sqrt(fr / (e * n * t * n))), [i, a] = [8 * U(e * n * r / 8), 8 * U(t * n * r / 8)];
	return Math.min(i, a) >= 64 ? [
		i,
		a,
		Math.round(n * r * 100) / 100 || 1
	] : null;
}
var mr = null;
function hr(e, t = !1) {
	if (t || !mr || Date.now() > mr.until) {
		let t = e.callWS({ type: "casa_mia_commander/picture_token" }).then((e) => e.token);
		mr = {
			value: t,
			until: Date.now() + 432e5
		}, t.catch(() => mr = null);
	}
	return mr.value;
}
function gr(e) {
	return Object.entries(e.states).filter(([e, t]) => e.startsWith("select.") && t.attributes.card).map(([e, t]) => ({
		value: e,
		label: String(t.attributes.friendly_name ?? e)
	}));
}
function _r(e) {
	let t = e.entities ?? {};
	return Object.values(t).filter((e) => e.platform === "casa_mia_intercom" && e.translation_key === "call").map((e) => e.entity_id);
}
function vr(e, t, n = _r(e)) {
	return n.find((n) => (e.states[n]?.attributes.camera_entities)?.includes(t));
}
function yr(e, t, n) {
	let r = e?.attributes.camera_entities ?? [];
	return r.includes(t) ? t : r.find((e) => n.includes(e)) ?? r[0];
}
function br(e) {
	return !(!e.sensor || e.live === "" && !e.talking || !e.secure || e.editing);
}
function xr(e) {
	return e?.state === "ringing" ? "Ringing" : e?.state === "answered" ? `Answered by ${e.attributes.answered_by ?? "someone"}` : e?.state === "complete" && e.attributes.outcome === "missed" ? "Missed" : "";
}
function Sr(e, t) {
	if (e?.state !== "answered") return null;
	let n = e.attributes.ends_at ? Date.parse(String(e.attributes.ends_at)) : NaN;
	if (Number.isNaN(n)) return e.attributes.held ? {
		text: "Held",
		warn: !1
	} : null;
	let r = Math.max(0, Math.ceil((n - t) / 1e3));
	return {
		text: `Hangs up in ${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`,
		warn: r <= 30
	};
}
var Cr = 1e4;
function wr(e, t, n, r) {
	let i = D(e, t, n);
	return r && e.mode === "column" && t < 500 && i !== null && e.room > i ? e.room : i;
}
var Tr = ".cm-pill, .cm-chip {\n  --surface: var(--card-background-color, #fff);\n  --muted: var(--secondary-text-color, #727272);\n  --accent: var(--primary-color, #03a9f4);\n  --on-accent: var(--text-primary-color, #fff);\n  --good: var(--success-color, #43a047);\n  --warn: var(--warning-color, #ffa600);\n  --bad: var(--error-color, #db4437);\n  --bark: #d8885a;\n  --mono: var(--ha-font-family-code, monospace);\n}\n.cm-pill{box-sizing:border-box;background:color-mix(in srgb, var(--tone,var(--muted)) 14%, transparent);max-width:100%;color:var(--tone,var(--muted));letter-spacing:.04em;text-transform:uppercase;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;border-radius:12px;padding:3px 9px;font-size:10px;font-weight:600;line-height:16px;display:inline-block;overflow:hidden}.cm-pill.cm-filled{background:var(--tone,var(--muted));color:var(--on-accent)}.cm-pill.cm-outline{box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--tone,var(--muted)) 55%, transparent);background:0 0}.cm-pill.cm-fixed{text-align:center;width:104px}.cm-chip{box-sizing:border-box;box-shadow:inset 0 0 0 1px var(--tone,var(--muted));background:var(--surface);color:var(--tone,var(--muted));font:inherit;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;cursor:pointer;border:none;border-radius:12px;justify-content:center;align-items:center;gap:4px;padding:3px 10px;font-size:10px;font-weight:500;line-height:16px;transition:box-shadow .15s,filter .15s;display:inline-flex}.cm-chip.cm-on{box-shadow:none;background:var(--tone,var(--accent));color:var(--on-accent)}.cm-chip.cm-icon{border-radius:50%;width:26px;height:26px;padding:4px}.cm-chip.cm-icon svg{fill:currentColor;width:16px;height:16px;display:block}.cm-chip.cm-mono{font:11px/14px var(--mono);letter-spacing:0;text-transform:none;border-radius:8px;padding:1px 6px}.cm-chip.cm-quiet{box-shadow:none;background:color-mix(in srgb, var(--surface) 80%, transparent);color:var(--muted)}.cm-chip:disabled{opacity:.4;cursor:default}.cm-chip:not(:disabled):hover,.cm-chip:focus-visible{box-shadow:inset 0 0 0 1px var(--tone,var(--muted)), 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent);filter:brightness(1.08);outline:none}.cm-chip.cm-on:not(:disabled):hover,.cm-chip.cm-on:focus-visible,.cm-chip.cm-quiet:not(:disabled):hover{box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent)}.cm-good{--tone:var(--good)}.cm-accent{--tone:var(--accent)}.cm-warn{--tone:var(--warn)}.cm-bad{--tone:var(--bad)}.cm-muted{--tone:var(--muted)}.cm-bark{--tone:var(--bark)}", Er = re(Tr), Dr = "important", Or = " !" + Dr, kr = ct(class extends lt {
	constructor(e) {
		if (super(e), e.type !== st.ATTRIBUTE || e.name !== "style" || e.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
	}
	render(e) {
		return Object.keys(e).reduce((t, n) => {
			let r = e[n];
			return r == null ? t : t + `${n = n.includes("-") ? n : n.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${r};`;
		}, "");
	}
	update(e, [t]) {
		let { style: n } = e.element;
		if (this.ft === void 0) return this.ft = new Set(Object.keys(t)), this.render(t);
		for (let e of this.ft) t[e] ?? (this.ft.delete(e), e.includes("-") ? n.removeProperty(e) : n[e] = null);
		for (let e in t) {
			let r = t[e];
			if (r != null) {
				this.ft.add(e);
				let t = typeof r == "string" && r.endsWith(Or);
				e.includes("-") || t ? n.setProperty(e, t ? r.slice(0, -11) : r, t ? Dr : "") : n[e] = r;
			}
		}
		return He;
	}
});
//#endregion
//#region ../../app/web/src/webrtc.ts
async function Ar(e, t, n, r, i) {
	let a = await e.sendMessagePromise({
		type: "camera/webrtc/get_client_config",
		entity_id: t
	}), o = new RTCPeerConnection(a.configuration);
	a.dataChannel && o.createDataChannel(a.dataChannel), n instanceof HTMLVideoElement && o.addTransceiver("video", { direction: "recvonly" }), i ? o.addTransceiver(i, { direction: "sendrecv" }) : o.addTransceiver("audio", { direction: "recvonly" });
	let s = new MediaStream();
	o.ontrack = (e) => {
		s.addTrack(e.track), n.srcObject = s;
	}, o.onconnectionstatechange = () => {
		o.connectionState === "failed" && r("The WebRTC connection failed.");
	};
	let c, l = [], u = (n) => e.sendMessagePromise({
		type: "camera/webrtc/candidate",
		entity_id: t,
		session_id: c,
		candidate: {
			candidate: n.candidate,
			sdpMid: n.sdpMid,
			sdpMLineIndex: n.sdpMLineIndex
		}
	}).catch(() => void 0);
	o.onicecandidate = (e) => {
		e.candidate && (c ? u(e.candidate) : l.push(e.candidate));
	}, await o.setLocalDescription(await o.createOffer());
	let d = await e.subscribeMessage((e) => {
		e.type === "session" ? (c = e.session_id, l.splice(0).forEach(u)) : e.type === "answer" ? o.setRemoteDescription({
			type: "answer",
			sdp: e.answer
		}).then(() => {
			let e = o.getTransceivers().some((e) => e.receiver.track.kind === "video" && e.currentDirection?.includes("recv"));
			n instanceof HTMLVideoElement && !e && r("The camera's video is in a format this device can't play.", "no_video");
		}, (e) => r(String(e))) : e.type === "candidate" ? o.addIceCandidate(e.candidate).catch(() => void 0) : e.type === "error" && r(e.message, e.code);
	}, {
		type: "camera/webrtc/offer",
		entity_id: t,
		offer: o.localDescription.sdp
	});
	return () => {
		d().catch(() => void 0), o.close(), n.srcObject = null;
	};
}
async function jr(e, t, n, r) {
	let { url: i } = await e.sendMessagePromise({
		type: "camera/stream",
		entity_id: t
	});
	return n.onerror = () => r(n.error?.message || "The video stream failed."), n.src = i, n.play().catch((e) => r(`It wouldn't play: ${e?.message ?? e}`)), () => {
		n.onerror = null, n.removeAttribute("src"), n.load();
	};
}
//#endregion
//#region src/commander/base.ts
var Mr = !1, Nr = !1, Pr = !1, Fr = class extends V {
	constructor(...e) {
		super(...e), this.preview = !1, this._natural = "", this._token = "", this.retry = 0, this.downSince = 0, this.lastError = 0, this._shown = 0, this.shows = 0, this._framed = "", this._full = "", this.frameWait = 0, this.awaited = "", this.awaitedSince = 0, this.motion = new yn(), this.run = "", this._size = null, this._box = [0, 0], this._fit = null, this.settle = 0, this.resize = new ResizeObserver(([e]) => {
			let { width: t, height: n } = e.contentRect;
			this._box = [Math.round(t * 10) / 10, Math.round(n * 10) / 10], this.measure(), this.debugOn() && this.requestUpdate();
			let r = pr(t, n, j(window.devicePixelRatio || 1, this.viaHa(), this._config?.away_sharpness));
			clearTimeout(this.settle), String(r) !== String(this._size) && (this._size ? this.settle = window.setTimeout(() => this._size = r, 400) : this._size = r);
		}), this._width = 0, this.measure = () => {
			let e = E(this, this.layout === "grid" && typeof this._config?.grid_options?.rows == "number");
			JSON.stringify(e) !== JSON.stringify(this._fit) && (this._fit = e), this.clientWidth !== this._width && (this._width = this.clientWidth);
		}, this.widthWatch = new ResizeObserver(() => this.measure()), this.visibility = () => {
			let e = document.hidden ? "page hidden" : this.isConnected ? lr() === this.home ? this.inView ? "" : "out of view" : "left the dashboard" : "off the page";
			if (e) return this.outOfSight(e);
			clearTimeout(this.leaving), this.leaving = 0, this._shown ||= (this.sid = Math.random().toString(36).slice(2), ++this.shows);
		}, this.sid = "", this.streaming = "", this.leaving = 0, this.home = "", this.inView = !1, this.onScreen = new IntersectionObserver((e) => {
			this.inView = e[e.length - 1].isIntersecting, this.visibility();
		}), this.frames = Mr, this.socket = null, this.socketFor = "", this.frameUrl = "";
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			_config: { state: !0 },
			_size: { state: !0 },
			_natural: { state: !0 },
			_fit: { state: !0 },
			_width: { state: !0 },
			_token: { state: !0 },
			_shown: { state: !0 },
			_framed: { state: !0 },
			_full: { state: !0 },
			preview: { type: Boolean },
			layout: { attribute: !1 }
		};
	}
	debugOn() {
		return !!((this._config?.entity ? this.hass?.states[this._config.entity] : void 0)?.attributes.card)?.layout.debug?.on;
	}
	connectedCallback() {
		super.connectedCallback(), document.addEventListener("visibilitychange", this.visibility), window.addEventListener("location-changed", this.visibility), window.addEventListener("popstate", this.visibility), this.home = lr();
		let e = this.renderRoot?.querySelector(".box");
		e && this.onScreen.observe(e), this.unwatch = O(this.measure), this.widthWatch.observe(this), requestAnimationFrame(this.measure);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.motion.stop(), document.removeEventListener("visibilitychange", this.visibility), window.removeEventListener("location-changed", this.visibility), window.removeEventListener("popstate", this.visibility), this.onScreen.disconnect(), this.inView = !1, this.visibility(), this.unwatch?.(), this.widthWatch.disconnect(), this.resize.disconnect(), clearTimeout(this.settle), clearTimeout(this.retry), clearTimeout(this.frameWait);
	}
	outOfSight(e) {
		let t = document.hidden ? 0 : this._config?.leave_after ?? 15;
		t ? this._shown && !this.leaving && (this.leaving = window.setTimeout(() => this.cut(e), t * 1e3)) : this.cut(e);
	}
	cut(e) {
		clearTimeout(this.leaving), this.leaving = 0, this._shown && (this._shown = 0, this.done(e), this.renderRoot?.querySelector(".picture")?.setAttribute("src", dr));
	}
	followPicture() {
		let e = this.frames && this._shown ? cr(this.streaming, location.href) : "";
		if (e === this.socketFor || (this.closeSocket(), !e)) return;
		this.socketFor = e;
		let t = this.socket = new WebSocket(e);
		t.onmessage = (e) => {
			let n = this.renderRoot.querySelector(".picture");
			if (this.socket !== t || !n) return;
			let r = this.frameUrl;
			n.src = this.frameUrl = URL.createObjectURL(e.data), URL.revokeObjectURL(r);
		}, t.onclose = () => {
			this.socket === t && (this.socket = null, this.refused());
		};
	}
	closeSocket() {
		let e = this.socket;
		this.socket = null, this.socketFor = "", e?.close(), URL.revokeObjectURL(this.frameUrl), this.frameUrl = "";
	}
	done(e) {
		this.closeSocket();
		let t = this.streaming;
		this.streaming = "", t.includes(".mjpg?") && navigator.sendBeacon(`${t.replace(".mjpg?", "/done?")}&why=${encodeURIComponent(e)}`);
	}
	editing() {
		return this.preview || C(this);
	}
	stillUrl(e, [t, n, r]) {
		let i = `${e.picture.replace(".mjpg", ".jpg")}?w=${t}&h=${n}&dpr=${r}`;
		if (!this.viaHa()) return i;
		if (!this._token) return this.ask(), "";
		let a = new URL(i);
		return `/api/casa_mia_commander/live${a.pathname}${a.search}&token=${this._token}`;
	}
	look() {
		let e = this._config;
		return e?.security_look ? P(e.look_tint ?? N.tint, e.look_strength ?? N.strength, e.look_darkness ?? N.darkness) : "";
	}
	shapeOf(e, t) {
		let n = Number(e.layout.aspects?.[t]);
		if (n > 0) return n;
		let [, r, i] = (e.cameras[t]?.channels ?? []).reduce((e, t) => t[1] * t[2] > e[1] * e[2] ? t : e, [
			"",
			0,
			0
		]);
		return r && i ? r / i : 16 / 9;
	}
	watchFrame() {
		clearTimeout(this.frameWait);
		let e = this.renderRoot.querySelector(".picture, .still");
		if (!e) return;
		let t = e.classList.contains("still") ? "still" : `s${this._shown}`;
		t !== this._framed && (t !== this.awaited && (this.awaited = t, this.awaitedSince = Date.now()), e.naturalWidth > 0 ? (this._framed = t, t !== "still" && !this.viaHa() && (Nr = !0)) : t !== "still" && Date.now() - this.awaitedSince > 1e4 ? (this.awaited = "", this.refused()) : this.frameWait = window.setTimeout(() => this.watchFrame(), 200));
	}
	viaHa() {
		return or(this._config?.route ?? "auto", k(location), Pr);
	}
	pictureUrl(e, [t, n, r]) {
		let i = `w=${t}&h=${n}&dpr=${r}&sid=${this.sid}&v=${encodeURIComponent(ur)}`;
		return this.viaHa() ? this._token ? `/api/casa_mia_commander/live${new URL(e.picture).pathname}?${i}&token=${this._token}` : (this.ask(), "") : `${e.picture}?${i}`;
	}
	ask(e = !1) {
		this.hass && hr(this.hass, e).then((e) => this._token = e, (e) => {
			this.failed(`Home Assistant gave no token for it: ${e?.message ?? JSON.stringify(e)}`), this.retry = window.setTimeout(() => this.ask(!0), 1e4);
		});
	}
	failed(e) {
		let t = Date.now();
		ar(this.downSince, this.lastError, t) || (this.downSince = t, console.warn(`casa-mia: the picture failed (${e}); retrying until it comes`)), this.lastError = t, this.requestUpdate();
	}
	refused() {
		if (!this.frames && this.viaHa() && navigator.serviceWorker?.controller) {
			Mr || console.info("casa-mia: the picture's stream failed on a page a service worker controls; its frames come over a WebSocket from now on"), this.frames = Mr = !0, this.requestUpdate();
			return;
		}
		if (sr(this._config?.route ?? "auto", this.viaHa(), Nr)) {
			console.warn("casa-mia: the picture's direct address gave nothing from this page; it comes through Home Assistant until the app restarts"), Pr = !0, this._size = pr(this._box[0], this._box[1], j(window.devicePixelRatio || 1, !0, this._config?.away_sharpness)), this.requestUpdate();
			return;
		}
		this.failed(this.viaHa() ? "through Home Assistant" : "direct"), clearTimeout(this.retry), this.retry = window.setTimeout(() => this.viaHa() ? this.ask(!0) : this.again(), this.viaHa() ? 5e3 : 3e3);
	}
	restarted() {
		Pr = !1, this.again();
	}
	again() {
		this._shown &&= (this.done("its stream failed"), this.frames ||= Mr, this.sid = Math.random().toString(36).slice(2), ++this.shows);
	}
	now() {
		let e = this._config?.entity ? this.hass?.states[this._config.entity] : void 0, t = e?.attributes.card;
		return {
			card: t,
			main: t ? this.main(t, e.state) : ""
		};
	}
	main(e, t) {
		if (this._full && e.cameras[this._full]) return this._full;
		let n = Object.entries(e.cameras).find(([, e]) => e.title === t);
		return n ? n[0] : e.start;
	}
};
//#endregion
//#region src/commander/live.ts
function Ir() {
	let e = globalThis.RTCRtpReceiver?.getCapabilities?.("video")?.codecs ?? [];
	return [...new Set(e.map((e) => e.mimeType.replace("video/", "")).filter((e) => !/^(rtx|red|ulpfec|flexfec)/i.test(e)))].join(", ") || "no video it can name";
}
var Lr = Qn();
Lr !== "webrtc" && console.info(`casa-mia: this device has no WebRTC, so ${Lr ? "live main cameras play as HLS, some seconds behind" : "main cameras are drawn, not live"}, and Talk is not offered`);
var Rr = class extends Fr {
	constructor(...e) {
		super(...e), this.liveOn = "", this.sessions = /* @__PURE__ */ new Map(), this.bad = /* @__PURE__ */ new Map(), this.markedFor = "", this.unseen = 0, this.beat = 0, this.onBeat = () => {
			let e = Date.now();
			this.leaving && (this.unseen = e);
			for (let [t, n] of this.sessions) {
				let r = this.lapsed(n, e);
				r && this.liveLost(t, r);
			}
			(this.liveOn || this.ticking()) && this.requestUpdate();
		};
	}
	static {
		this.properties = {
			...Fr.properties,
			liveOn: { state: !0 }
		};
	}
	connectedCallback() {
		super.connectedCallback(), this.beat = window.setInterval(this.onBeat, 1e3);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), clearInterval(this.beat), this.endAll();
	}
	cut(e) {
		super.cut(e), this.endAll();
	}
	ticking() {
		return this.lastError > 0 && Date.now() - this.lastError < 15e3;
	}
	lapsed(e, t) {
		return Xn(Math.max(e.from, this.unseen), e.frameAt && Math.max(e.frameAt, this.unseen), t, Lr === "hls" ? Yn : Jn);
	}
	liveMain(e) {
		return !!(Lr && e.live_main && this._config?.live_main !== !1 && this.hass?.connection && this._shown && !this.editing());
	}
	liveNow(e, t, n, r) {
		let i = nr(e.cameras[t]?.channels ?? [[
			t,
			0,
			0
		]], [n[2], n[3]], r), a = Date.now(), { shown: o, tried: s } = rr(i, (e) => {
			let t = this.sessions.get(e);
			return !!t?.frameAt && this.lapsed(t, a) === null;
		}, (e) => (this.bad.get(e)?.until ?? 0) > a), c = o ? void 0 : i.map((e) => this.bad.get(e)).find(Boolean);
		return {
			videos: [o, s].filter((e) => e !== void 0),
			shown: o,
			lost: c,
			video: !!(o || s && !c)
		};
	}
	followLive() {
		let { card: e, main: t } = this.now(), n = e && this.liveMain(e) ? t : "";
		n !== this.liveOn && (this.liveOn = n), n && n !== this.markedFor && (this.bad.clear(), this.markedFor = n);
		let r = new Map([...this.renderRoot.querySelectorAll("video.live")].map((e) => [e.dataset.entity ?? "", e]));
		for (let [e, t] of this.sessions) r.get(e) !== t.video && this.endSession(e);
		for (let [e, t] of r) this.sessions.has(e) || this.startSession(e, t);
	}
	startSession(e, t) {
		let n = {
			video: t,
			stop: () => void 0,
			from: Date.now(),
			frameAt: 0
		};
		this.sessions.set(e, n);
		let r = () => this.sessions.get(e) === n, i = (t) => {
			r() && this.liveLost(e, t);
		};
		if (!t.requestVideoFrameCallback) return i("this browser can't tell whether its video is playing");
		let a = () => {
			let t = !n.frameAt;
			n.frameAt = Date.now(), t && this.liveBack(e);
		}, o = 0, s = () => {
			t.cancelVideoFrameCallback(o), o = t.requestVideoFrameCallback(c);
		}, c = () => {
			r() && (a(), s());
		};
		s(), t.onloadeddata = t.onresize = t.onplaying = () => {
			r() && (s(), !n.frameAt && t.videoWidth > 0 && a());
		}, (Lr === "hls" ? jr : Ar)(this.hass.connection, e, t, i).then((e) => r() ? n.stop = e : e(), (e) => i(e?.message ?? JSON.stringify(e)));
	}
	endSession(e) {
		let t = this.sessions.get(e);
		t && (this.sessions.delete(e), t.video.onloadeddata = t.video.onresize = t.video.onplaying = null, t.stop());
	}
	endAll() {
		for (let e of [...this.sessions.keys()]) this.endSession(e);
	}
	liveLost(e, t) {
		let n = t.replace(/\.$/, ""), r = this.sessions.get(e), i = Date.now(), a = tr(this.bad.get(e), n, r?.frameAt || r?.from || i, i);
		this.bad.set(e, a), this.endSession(e), this.report(e, "lost", `${n}; this device plays ${Lr === "hls" ? "HLS, having no WebRTC" : Ir()}; next try in ${ir(a.until - i)}`, a.fails), this.requestUpdate();
	}
	liveBack(e) {
		let t = this.bad.get(e);
		t && (this.bad.delete(e), this.report(e, "back", `after ${ir(Date.now() - t.since)} and ${t.fails} failed ${t.fails === 1 ? "try" : "tries"}`, t.fails)), this.requestUpdate();
	}
	report(e, t, n, r) {
		console.info(`casa-mia: live ${e} ${t}: ${n}`), this.hass?.callWS({
			type: "casa_mia_commander/live_report",
			commander: this._config?.entity ?? "",
			channel: e,
			what: t,
			why: n,
			fails: r
		}).catch(() => void 0);
	}
	caption(e, t, n) {
		return z`<div class="caption ${nn(this.now().card?.layout.labels).main_style}" style=${t}>
      <span class="title">${e}${n.shown ? Lr === "hls" ? " (live, some seconds behind)" : " (live)" : ""}</span>
      ${n.lost ? z`<span class="lost">Live lost ${ir(Date.now() - n.lost.since)} ago: ${n.lost.why}</span>` : B}
    </div>`;
	}
}, K = {
	talk: "Talk",
	answer: "Answer",
	hang_up: "Hang up",
	hold: "Hold to talk",
	live: "Live"
}, zr = (e) => e ? K.answer : K.talk;
function Br(e) {
	return e === "live" ? {
		look: "live",
		name: K.live,
		enabled: !0
	} : {
		look: "hold",
		name: null,
		enabled: e === "silent"
	};
}
function Vr(e, t, n) {
	return {
		hold: e === "silent" || e === "live" ? Br(e).name ?? K.hold : null,
		main: t ? K.hang_up : zr(n)
	};
}
function Hr(e, t) {
	let n = e?.state === "answered" ? e.attributes.answered_by : void 0;
	return !!n && n === t;
}
function Ur(e, t = {}) {
	return {
		talk: e,
		...t.duplex === "half" ? { duplex: t.duplex } : {},
		...t.entity ? { entity: t.entity } : {},
		...t.call ? { call: t.call } : {}
	};
}
var Wr = [{
	value: "full",
	label: "Full duplex: your voice goes out as soon as you answer"
}, {
	value: "half",
	label: "Half duplex: answering opens the call silent; your voice goes out only while Hold to talk is held"
}], Gr = {
	"touch-action": "none",
	"user-select": "none",
	"-webkit-user-select": "none",
	"-webkit-touch-callout": "none"
};
function Kr(e) {
	return e.talking ? e.connected ? e.half ? e.held ? "live" : "silent" : "full" : "connecting" : "off";
}
function qr(e, t) {
	return {
		mic: t ? e === "live" : e !== "off",
		muted: e === "live"
	};
}
var Jr = [
	"pointerup",
	"pointercancel",
	"blur"
], Yr = class {
	constructor(e, t = window, n = document) {
		this.held = !1, this.end = () => {
			if (this.held) {
				this.held = !1;
				for (let e of Jr) this.win.removeEventListener(e, this.end);
				this.doc.removeEventListener("visibilitychange", this.hidden), this.changed();
			}
		}, this.hidden = () => this.doc.hidden && this.end(), this.changed = e, this.win = t, this.doc = n;
	}
	press() {
		if (!this.held) {
			this.held = !0;
			for (let e of Jr) this.win.addEventListener(e, this.end);
			this.doc.addEventListener("visibilitychange", this.hidden), this.changed();
		}
	}
}, Xr = "casa-mia-talk", Zr = "casa-mia-talk-ask";
function Qr(e, t) {
	let n = () => $r(e, t());
	return e.addEventListener(Zr, n), () => e.removeEventListener(Zr, n);
}
function $r(e, t) {
	e.dispatchEvent(new CustomEvent(Xr, { detail: t }));
}
var ei = [
	"off",
	"connecting",
	"full",
	"silent",
	"live"
];
function ti(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = (e) => {
		let { commander: i, state: a } = e.detail;
		t && i !== t || (r.set(i, a), n([...r.values()].reduce((e, t) => ei.indexOf(t) > ei.indexOf(e) ? t : e, "off")));
	};
	return e.addEventListener(Xr, i), e.dispatchEvent(new Event(Zr)), () => e.removeEventListener(Xr, i);
}
//#endregion
//#region src/commander/talk.ts
var ni = /* @__PURE__ */ new WeakSet(), ri = {
	ringing: "cm-warn",
	answered: "cm-accent",
	complete: "cm-muted"
}, ii = class extends Rr {
	constructor(...e) {
		super(...e), this._talk = "", this._talkNote = "", this.claimed = !1, this.asking = 0, this.noteGone = 0, this.found = { sensors: [] }, this.half = !1, this.connected = !1, this.hold = new Yr(() => this.sync()), this.said = "off", this.answered = "", this.toldHeld = !1, this.touchedAt = 0, this.onOrder = (e) => {
			let t = e.detail?.casa_mia_commander;
			if (!t?.talk || t.entity && t.entity !== this._config?.entity) return;
			if (t.talk === "press") return this.said === "silent" && this.hold.press();
			if (t.talk === "release") return this.hold.end();
			let n = t.call ?? this.call(), r = t.call ? Hr(this.hass?.states[t.call], this.hass?.user?.name) : !!this._talk;
			if (!(t.talk === "toggle" ? !r : t.talk === "on")) return this.hangUp();
			!ni.has(e) && this.talkOn(t.duplex, n) && ni.add(e);
		}, this.touched = () => {
			!this.answered || this.half || Date.now() - this.touchedAt < 5e3 || (this.touchedAt = Date.now(), this.tell({ touched: !0 }));
		};
	}
	static {
		this.properties = {
			...Rr.properties,
			_talk: { state: !0 },
			_talkNote: { state: !0 }
		};
	}
	connectedCallback() {
		super.connectedCallback(), window.addEventListener("ll-custom", this.onOrder), this.unask = Qr(window, () => ({
			commander: this._config?.entity ?? "",
			state: this.said
		})), window.addEventListener("pointerdown", this.touched, !0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), window.removeEventListener("ll-custom", this.onOrder), this.unask?.(), window.removeEventListener("pointerdown", this.touched, !0), clearTimeout(this.noteGone);
	}
	sync() {
		let e = Kr({
			talking: !!this._talk,
			connected: this.connected,
			half: this.half,
			held: this.hold.held
		}), { mic: t, muted: n } = qr(e, this.half);
		this.mic && (this.mic.enabled = t), this.heard && (this.heard.muted = n), this.tellHeld(), e !== this.said && (this.said = e, $r(window, {
			commander: this._config?.entity ?? "",
			state: e
		}), this.requestUpdate());
	}
	tell(e) {
		let t = this.answered;
		t && this.hass && this.hass.callWS({
			type: "casa_mia_intercom/call",
			entity_id: t,
			...e
		}).then(() => console.info(`casa-mia: call timer for ${t}: ${JSON.stringify(e)}`), (n) => {
			console.warn(`casa-mia: call timer for ${t} refused ${JSON.stringify(e)}: ${n?.code ?? ""} ${n?.message ?? n}`), this.note(`The call timer refused it: ${n?.message ?? n?.code ?? n}`);
		});
	}
	tellHeld() {
		this.answered && this.half && this.hold.held !== this.toldHeld && (this.toldHeld = this.hold.held, this.tell({ held: this.toldHeld }));
	}
	ticking() {
		return super.ticking() || this.hass?.states[this.call() ?? ""]?.state === "answered";
	}
	call() {
		let e = this._talk || this.now().main, t = this.hass?.entities;
		if (e && t) return this.found.entities !== t && (this.found = {
			entities: t,
			sensors: _r(this.hass)
		}), vr(this.hass, e, this.found.sensors);
	}
	canTalk() {
		return Lr === "webrtc" && br({
			sensor: this.call(),
			live: this.liveOn,
			talking: this._talk,
			secure: window.isSecureContext,
			editing: this.editing()
		});
	}
	talkOn(e = this._config?.duplex ?? "full", t = this.call()) {
		if (this._talk || this.editing()) return !1;
		let { card: n, main: r } = this.now(), i = yr(this.hass?.states[t ?? ""], r, Object.keys(n?.cameras ?? {}));
		if (!i) return console.info(`casa-mia: talk: no doorbell to answer (${t ? `${t} has no camera` : "the main camera has no call sensor"})`), !1;
		if (!window.isSecureContext) return console.info(`casa-mia: talk to ${i}: refused, the page isn't https`), this.note("Talking needs this page on https"), !1;
		let a = ++this.asking;
		return this._talk = i, this.half = e === "half", this.note(""), this.sync(), navigator.mediaDevices.getUserMedia({ audio: !0 }).then((e) => {
			let [t] = e.getAudioTracks();
			if (a !== this.asking) return t?.stop();
			console.info(`casa-mia: talk to ${i}: microphone on${this.half ? " (half duplex: silent until held)" : ""}`), this.mic = t, this.claimed = !1, this.sync(), this.speak(i, t, a), this.requestUpdate();
		}, (e) => {
			a === this.asking && (console.info(`casa-mia: talk to ${i}: no microphone: ${e}`), this.hangUp(`No microphone: ${e?.message ?? e}`));
		}), !0;
	}
	speak(e, t, n) {
		let r = new Audio();
		r.autoplay = !0, this.heard = r, r.onplaying = () => {
			n === this.asking && (this.connected = !0, this.sync());
		};
		let i = (e, t) => {
			n === this.asking && (t === "intercom_answered_elsewhere" ? this.hangUp(e || "Answered elsewhere") : t === "intercom_call_ended" ? this.hangUp("The call ended") : this.hangUp(`The call failed: ${e}`));
		};
		Ar(this.hass.connection, e, r, i, t).then((e) => n === this.asking ? this.voice = e : e(), (e) => i(String(e)));
	}
	hangUp(e = "") {
		this.asking++, this.voice?.(), this.voice = void 0, this.mic &&= (console.info(`casa-mia: talk to ${this._talk}: hung up${e ? ` (${e})` : ""}`), this.mic.stop(), void 0), this.claimed = !1, this.answered = "", this.toldHeld = !1, this.touchedAt = 0, this._talk = "", this.heard = void 0, this.connected = !1, this.hold.end(), this.sync(), e && this.note(e);
	}
	note(e) {
		clearTimeout(this.noteGone), this._talkNote = e, e && (this.noteGone = window.setTimeout(() => this._talkNote = "", Cr));
	}
	followCall() {
		if (!this.mic) return;
		let e = this.call() ?? "", t = this.hass?.states[e];
		Hr(t, this.hass?.user?.name) ? (this.claimed = !0, this.answered || this.answeredHere(e)) : this.claimed && this.hangUp("The call ended");
	}
	answeredHere(e) {
		this.answered = e, this.touchedAt = Date.now(), this.half && this.tell({ duplex: "half" }), this.tellHeld();
	}
	outOfSight(e) {
		this._talk && (console.info(`casa-mia: talk ended: ${e}`), this.hangUp()), super.outOfSight(e);
	}
	talkParts(e, t, n) {
		let r = this.call();
		if (!r && !this._talkNote) return B;
		let i = this.hass?.states[r ?? ""], a = xr(i), o = Sr(i, Date.now()), s = this._config?.talk_button !== !1 && (this._talk || this.canTalk()), c = this._talk ? this.half : this._config?.duplex === "half", l = Vr(this.said, !!this._talk, c), u = this.said === "full" || this.said === "live", d = nn(e.layout.labels), f = (e, t) => z`<div class="talk-at" style=${kr(fn(e, dn(d, e, n)))}>${t}</div>`, p = z`<div class="talk-said" style=${kr(pn(d, "talk_status"))}>
        ${u ? z`<span class="cm-pill cm-filled cm-bad">Live to ${e.cameras[this._talk]?.title ?? this.hass?.states[this._talk]?.attributes.friendly_name ?? this._talk}</span>` : B}
        ${a ? z`<span class="cm-pill cm-filled ${ri[i.state]}">${a}</span>` : B}
        ${o ? z`<span class="cm-pill cm-filled ${o.warn ? "cm-warn" : "cm-muted"}">${o.text}</span>` : B}
        ${this._talkNote && this._talkNote !== a ? z`<span class="cm-pill cm-filled cm-muted">${this._talkNote}</span>` : B}
      </div>`, m = z`<div class="talk-buttons" style=${kr(pn(d, "talk_buttons"))}>
        ${s && l.hold ? z`<button
              class="cm-chip cm-on ${this.said === "live" ? "cm-bad" : "cm-good"}"
              style=${kr(Gr)}
              @pointerdown=${() => this.said === "silent" && this.hold.press()}
              @contextmenu=${(e) => e.preventDefault()}
            >
              ${l.hold}
            </button>` : B}
        ${s ? z`<button class="cm-chip cm-on ${this._talk ? "cm-bad" : "cm-good"}" @click=${() => this._talk ? this.hangUp() : this.talkOn()}>
              ${l.main}
            </button>` : B}
      </div>`;
		return z`<div class="talk" style=${t}>
      ${d.talk_status === d.talk_buttons ? f(d.talk_status, [p, m]) : [f(d.talk_status, p), f(d.talk_buttons, m)]}
    </div>`;
	}
}, ai = R`
  .talk {
    position: absolute;
    box-sizing: border-box;
    pointer-events: none;
  }
  .talk-at {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: calc(100% - 20px);
  }
  .talk-said,
  .talk-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: var(--cm-just);
    gap: 6px;
  }
  .talk button {
    pointer-events: auto;
  }
`, oi = [xn, R`
    :host {
      display: block;
      height: 100%;
    }
    /* All of its width; its height from the rule (render). Width set: with only a height,
       aspect-ratio would make the width from it (wider than its space). */
    ha-card {
      position: relative;
      width: 100%;
      overflow: hidden;
      background: none;
      border: none;
      box-shadow: none;
    }
    .box,
    .seen {
      position: absolute;
      inset: 0;
    }
    /* What the Security look covers (its filter here): taps go to the zones over it. */
    .seen {
      pointer-events: none;
    }
    .picture,
    .still {
      display: block;
      width: 100%;
      height: 100%;
    }
    /* A still while editing: hatched, so it is not taken for the live picture. */
    .hatch {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding: 8px;
      background: repeating-linear-gradient(45deg, rgb(255 255 255 / 0.18) 0 4px, rgb(0 0 0 / 0.18) 4px 14px);
      pointer-events: none;
    }
    .hatch span {
      padding: 2px 6px;
      background: rgb(0 0 0 / 0.63);
      color: #fff;
      font: 13px/1.2 sans-serif;
    }
    .zone,
    .highlight,
    .live,
    .caption {
      position: absolute;
      box-sizing: border-box;
    }
    /* The live main camera over the picture (its drawn main area shows until it plays). */
    .live {
      pointer-events: none;
      background: transparent;
      transition: opacity 0.3s;
    }
    /* Its caption, as the compositor draws a main camera's: along the foot, on the left. */
    .caption {
      display: flex;
      flex-wrap: wrap;
      align-content: flex-end;
      align-items: flex-end;
      gap: 4px 6px;
      /* in step with the name: 10 px for a name of 20 */
      padding: 0 calc(var(--cm-label-size) / 2) calc(var(--cm-label-size) / 2);
      pointer-events: none;
    }
    /* Its font, size and colours are the commander's labels (labels.ts), set on the box:
       the size is a share of the main camera's place (labels.ts: nameSize). A name too
       long for its place is cut short with …, as the compositor's is (labels.py: fitted). */
    .caption span {
      box-sizing: border-box;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 2px 6px;
      background: var(--cm-label-back);
      color: var(--cm-label-colour);
      font: var(--cm-label-size) / 1.2 var(--cm-label-font);
    }
    /* A pill: rounded ends, as the style guide's pills have. */
    .caption.pill span {
      padding: 0.1em 0.5em;
      border-radius: 999px;
    }
    /* A bar: the name across the foot, anything said beside it standing above. */
    .caption.bar {
      padding: 0;
    }
    .caption.bar .title {
      order: 1;
      flex: 1 0 100%;
      box-sizing: border-box;
      padding: 0.35em 0.5em;
    }
    .caption.bar .lost {
      margin-left: 0.5em;
    }
    .caption.none .title {
      display: none;
    }
    /* No live video: said in red beside the title, wrapping on a narrow card (RULE FIVE). */
    .caption .lost {
      background: rgb(200 30 30 / 0.9);
      color: #fff;
      font-weight: 600;
    }
    /* The picture failing (common.ts: pictureDown): said over the card, top left, wrapping. */
    .down {
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      pointer-events: none;
    }
    .down span {
      white-space: normal;
    }
    .zone {
      cursor: pointer;
    }
    .highlight {
      pointer-events: none;
    }
    /* Its pulse, every --cm-pulse seconds: "breathe", the glow swelling to its full blur and
       back; "ripple", a ring spreading out from the border and fading. Steady for a viewer
       who asked for less motion. */
    .highlight.breathe {
      animation: cm-breathe var(--cm-pulse) ease-in-out infinite;
    }
    .highlight.ripple {
      animation: cm-ripple var(--cm-pulse) ease-out infinite;
    }
    @keyframes cm-breathe {
      0%,
      100% {
        box-shadow: 0 0 calc(var(--cm-blur) / 4) 0 color-mix(in srgb, var(--cm-colour) 30%, transparent);
      }
      50% {
        box-shadow: 0 0 var(--cm-blur) 2px color-mix(in srgb, var(--cm-colour) 70%, transparent);
      }
    }
    @keyframes cm-ripple {
      0% {
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--cm-colour) 60%, transparent);
      }
      70%,
      100% {
        box-shadow: 0 0 0 max(6px, var(--cm-blur)) color-mix(in srgb, var(--cm-colour) 0%, transparent);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .highlight {
        animation: none !important;
      }
    }
    /* Debug: the card's own figures, 70% down the middle (the compositor's are 30% down),
       clear of the corners and the crossing. */
    .debug {
      position: absolute;
      left: 50%;
      top: 70%;
      transform: translate(-50%, -50%);
      padding: 4px 10px;
      background: #000;
      font: 13px/1.4 ui-monospace, monospace;
      text-align: center;
      white-space: nowrap;
      pointer-events: none;
    }
    .note {
      padding: 16px;
      color: var(--secondary-text-color);
    }
`], si = class extends ii {
	static {
		this.properties = {
			...ii.properties,
			_sound: { state: !0 },
			_screen: { state: !0 },
			_ptz: { state: !0 },
			_ptzFailed: { state: !0 }
		};
	}
	constructor() {
		super(), this._sound = "", this._screen = !1, this._ptz = "", this._ptzFailed = "", this.ptzNoteGone = 0;
		for (let e of Bn) this.addEventListener(e, () => this._screen = Hn());
	}
	updated() {
		let e = this.now().card?.run ?? "";
		e && this.run && e !== this.run && (console.info("casa-mia: the app restarted; a fresh picture stream"), this.restarted()), e && (this.run = e);
		let t = this.now().card;
		this._full && t && !this.liveMain(t) && (this._full = ""), this.watchFrame(), this.measure(), this.streaming && this.editing() && this.done("editing");
		let n = this.renderRoot.querySelector(".box");
		n && (this.resize.observe(n), this.onScreen.observe(n)), this.followPicture(), this.followCall(), this.followLive();
		let r = this.renderRoot.querySelector(".picture"), i = r?.naturalWidth ? `${r.naturalWidth} x ${r.naturalHeight}` : "";
		this.debugOn() && i && i !== this._natural && (this._natural = i);
	}
	static getConfigElement() {
		return document.createElement("casa-mia-commander-editor");
	}
	static getStubConfig(e) {
		return { entity: gr(e)[0]?.value ?? "" };
	}
	setConfig(e) {
		this._config = e;
	}
	getCardSize() {
		return 6;
	}
	getGridOptions() {
		return {
			columns: s.shown ? "full" : 6,
			rows: "auto"
		};
	}
	render() {
		let e = this._config?.entity ? this.hass?.states[this._config.entity] : void 0, t = e?.attributes.card;
		if (!t) return z`<ha-card
        ><div class="note">
          ${this._config?.entity ? e ? "Not drawn yet: give this commander cameras on the Camera Commander page" : `No commander at ${this._config.entity}` : "Choose a commander"}
        </div></ha-card
      >`;
		if (!t.picture) return z`<ha-card><div class="note">Its picture's address is not known yet (the app has no LAN address).</div></ha-card>`;
		let n = this.main(t, e.state), r = this.editing(), i = r ? null : ar(this.downSince, this.lastError, Date.now()), a = t.layout, o = S(this) ? [
			a.width,
			a.height,
			1
		] : this._size, [s, c, l] = o ?? [
			a.width,
			a.height,
			1
		], u = o && !r ? this.pictureUrl(t, o) : "", d = r && o ? this.stillUrl(t, o) : "", f = o ? {
			...a,
			width: s,
			height: c,
			gap: U(a.gap * l),
			margin: U((a.margin ?? 0) * l),
			scale: l
		} : a, p = Zt(f, n), [m, h] = p.size, g = p.main, _ = p.tiles.filter((e) => e.rect[2] > 0), v = !!(this._full && t.cameras[this._full]), y = [
			0,
			0,
			Math.round(innerWidth * devicePixelRatio),
			Math.round(innerHeight * devicePixelRatio)
		], b = this.liveMain(t) && (v || g[2] > 0) ? this.liveNow(t, n, v ? y : g, v || p.mainHow === "contain") : null, x = this._sound === n && !this._talk, C = this._config?.sound_button && b ? [{
			on: this._sound === n,
			icon: this._sound === n ? "mdi:volume-high" : "mdi:volume-off",
			label: this._sound === n ? "Sound on" : "Sound off",
			title: this._sound === n ? "Mute the camera" : "Hear the camera",
			toggle: () => this._sound = this._sound === n ? "" : n
		}] : [], w = b?.shown && !Vn() ? this.renderRoot.querySelector(`video.live[data-entity="${b.shown}"]`) : null, T = this._config?.screen_button ? Vn() ? [{
			on: this._screen,
			icon: this._screen ? "mdi:fullscreen-exit" : "mdi:fullscreen",
			label: this._screen ? "Exit full screen" : "Full screen",
			title: this._screen ? "Back to the page" : "The commander over the whole screen",
			toggle: () => Un(this, !this._screen)
		}] : w && Gn(w) ? [{
			on: !1,
			icon: "mdi:fullscreen",
			label: "Full screen",
			title: "The main camera over the whole screen",
			toggle: () => qn(w)
		}] : [] : [], E = (e) => b ? xt(b.videos, (e) => e, (t) => z`<video
                class="live"
                data-entity=${t}
                style="${e};opacity:${+(t === b.shown)}"
                autoplay
                playsinline
                .muted=${t !== b.shown || !x}
              ></video>`) : B, D = "left:0;top:0;width:100%;height:100%", O = u && b?.video ? `${u}&main=video` : u, k = ([e, t, n, r]) => `left:${e / m * 100}%;top:${t / h * 100}%;width:${n / m * 100}%;height:${r / h * 100}%`, A = f.highlight ?? {}, j = nn(a.labels);
		ln(j.font, (e) => `/casa_mia/fonts/${e}`);
		let M = [g[2] / m * this._box[0], g[3] / h * this._box[1]], N = [innerWidth, innerHeight], P = (e) => rn(j.main_share, Math.min(...e)), F = (e) => `--cm-label-font:${on(j.font)};--cm-label-size:${P(e)}px;--cm-label-colour:${j.colour};--cm-label-back:${sn(j)}`, I = this.motion.seen(this.hass, e.attributes.motion ?? {}, this._config, () => this.requestUpdate()), ee = _.find((e) => e.camera === n)?.rect, te = p.more ? Xt(f).slice(p.tiles.length) : [], L = p.gave.includes("main_alone") && a.responsive?.cant_fit === "keep" ? `Its limits don't fit this space (${Math.round(s / l)} × ${Math.round(c / l)} px), so only the main camera is shown` : "", ne = this._fit, re = this._width && a.mode !== "responsive" ? this._width / Mt(a, n, this._width, this.shapeOf(t, n)) : a.width / a.height, R = ne && this._width ? wr(ne, this._width, re, a.mode === "responsive") : null;
		return z`<ha-card style=${this._screen ? `height:calc(100% - ${Wn()});margin-top:${Wn()}` : S(this) ? `aspect-ratio:${a.width}/${a.height}` : !ne || ne.mode === "tile" || ne.mode === "cell" ? `height:100%;aspect-ratio:${a.width}/${a.height}` : R ? `height:${R}px` : ""}>
      <div class="box" style=${F(M)}>
        <div class="seen" style="filter:${this.look()}">
        ${r ? d ? z`<img class="still" src=${d} alt="" />` : B : O && this._shown ? yt(this._shown, z`<img
                class="picture"
                data-cm-own
                src=${(this.streaming = O) && this.frames ? dr : O}
                alt=""
                @load=${(e) => {
			let t = e.target;
			this._natural = `${t.naturalWidth} x ${t.naturalHeight}`;
		}}
                @error=${() => this.refused()}
              />`) : B}
        ${b && !v ? z`${E(`${k(g)};object-fit:${p.mainHow};${p.mainHow === "cover" ? `object-position:${hn(a.main_keep)}` : ""}`)}
              ${this.caption(t.cameras[n]?.title ?? n, k(g), b)}` : B}
        </div>
        ${r && !S(this) ? z`<div class="hatch"><span>Still picture while editing</span></div>` : B}
        ${a.debug?.on ? z`<div class="debug" style="color:${a.debug.colour ?? "#ffd60a"}">
              ${this._fit?.mode ?? "?"} (in ${this._fit?.container || "?"}), room ${this._fit?.room ?? "?"} px<br />
              card box ${this._box[0]} x ${this._box[1]} CSS px, screen ${window.devicePixelRatio}x<br />
              asked ${this._size ? `${s} x ${c} @${l}x` : "nothing yet"}; picture ${this._natural || "not loaded"}
              ${this.viaHa() ? "through Home Assistant" : "direct"}
              ${p.gave.length ? z`<br />its limits gave way here: ${p.gave.join(", ")}` : B}
            </div>` : B}
        ${_.map((e) => e.camera === n ? B : z`<div class="zone" style=${k(e.rect)} title=${t.cameras[e.camera]?.title ?? e.camera} @click=${() => this.choose(t, e.camera)}></div>`)}
        ${p.more ? z`<div class="zone" style="${k(p.more.rect)};cursor:default" title="${p.more.count} more cameras"></div>` : B}
        <div class="zone" style=${k(g)} @click=${() => this.open(t, n)}></div>
        ${ee && ee[2] > 0 && this._framed === (r ? "still" : `s${this._shown}`) ? z`<img
              class="highlight ${Number(A.pulse) > 0 ? A.style ?? "breathe" : ""}"
              src=${dr}
              alt=""
              style="${k(ee)};border:${A.width}px solid ${A.colour};box-shadow:0 0 ${A.blur}px ${A.colour};--cm-colour:${A.colour};--cm-blur:${A.blur}px;--cm-pulse:${A.pulse}s;--cm-style:${A.style}"
            />` : B}
        ${_.map((e) => bn(I.get(e.camera), k(e.rect), this._config, () => e.camera === n ? this.open(t, e.camera) : this.choose(t, e.camera)))}
        ${p.more ? bn(te.map((e) => I.get(e)).find(Boolean), k(p.more.rect), this._config, () => void 0) : B}
        ${g[2] > 0 ? bn(I.get(n), k(g), this._config, () => this.open(t, n)) : B}
        ${(this._config?.main_controls || T.length) && t.cameras[n] && g[2] > 0 && !v && !r ? this._config?.main_controls ? Rn(this, this.hass, t.cameras[n], k(g), M, [...C, ...T], this.ptz(n)) : Rn(this, this.hass, {
			...t.cameras[n],
			controls: [],
			presets: []
		}, k(g), M, T, this.ptz(n)) : B}
        ${(b || this._talk) && g[2] > 0 && !v ? this.talkParts(t, k(g), P(M)) : B}
        ${i ? z`<div class="down"><span class="cm-pill cm-filled cm-bad">${i}</span></div>` : L ? z`<div class="down"><span class="cm-pill cm-filled cm-warn">${L}</span></div>` : B}
      </div>
      ${v ? z`<div class="full" style=${F(N)}>
            <div class="seen" style="filter:${this.look()}">${E(`${D};object-fit:contain`)}</div>
            ${b ? this.caption(t.cameras[n].title, D, b) : B}
            <div class="zone" style=${D} title="Back" @click=${() => this._full = ""}></div>
            ${Rn(this, this.hass, t.cameras[n], D, N, [...C, ...T], this.ptz(n))}
            ${this.talkParts(t, D, P(N))}
          </div>` : B}
    </ha-card>`;
	}
	choose(e, t) {
		this.hass?.callService("select", "select_option", { option: e.cameras[t]?.title }, { entity_id: this._config.entity });
	}
	ptz(e) {
		return {
			open: this._ptz === e,
			failed: this._ptzFailed,
			toggle: () => this._ptz = this._ptz === e ? "" : e,
			go: async (t) => {
				let [n, r] = t.action.split(".");
				clearTimeout(this.ptzNoteGone), this._ptzFailed = "";
				try {
					await this.hass.callService(n, r, t.data), console.info(`casa-mia: ${e} sent to its preset ${t.name}`);
				} catch (n) {
					let r = n?.message ?? String(n);
					console.warn(`casa-mia: ${e} not sent to its preset ${t.name}: ${r}`), this._ptzFailed = `${t.name}: ${r}`, this.ptzNoteGone = window.setTimeout(() => this._ptzFailed = "", Ln);
				}
			}
		};
	}
	open(e, n) {
		let r = this._config?.tap_main ?? "more-info", a = e.cameras[n]?.live;
		r === "live" && a ? i(a) : r === "full" && this.liveMain(e) ? this._full = n : r !== "none" && (this._screen && Un(this, !1), t(this, "hass-more-info", { entityId: n }));
	}
	static {
		this.styles = [
			...oi,
			Er,
			ai,
			zn
		];
	}
}, ci = {
	tap_main: "more-info",
	route: "auto",
	away_sharpness: "balanced",
	live_main: !0,
	talk_button: !0,
	main_controls: !1,
	sound_button: !1,
	screen_button: !1,
	duplex: "full",
	leave_after: 15,
	security_look: !1,
	look_tint: N.tint,
	look_strength: N.strength,
	look_darkness: N.darkness,
	...gn
};
function li(e) {
	return F(e, ci);
}
var ui = class extends V {
	static {
		this.properties = {
			hass: { attribute: !1 },
			_config: { state: !0 }
		};
	}
	setConfig(e) {
		this._config = e;
	}
	render() {
		if (!this.hass || !this._config) return B;
		let e = {
			...ci,
			...this._config
		}, n = [
			{
				name: "entity",
				selector: { select: {
					mode: "dropdown",
					options: gr(this.hass)
				} }
			},
			{
				name: "route",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: "auto",
							label: "Direct at home, through Home Assistant away"
						},
						{
							value: "direct",
							label: "Always direct (the box's LAN address)"
						},
						{
							value: "ha",
							label: "Always through Home Assistant"
						}
					]
				} }
			},
			{
				name: "away_sharpness",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: "full",
							label: "Full (the screen's own)"
						},
						{
							value: "balanced",
							label: "Balanced (1.5x)"
						},
						{
							value: "light",
							label: "Light (1x)"
						},
						{
							value: "saver",
							label: "Data saver (0.75x)"
						}
					]
				} }
			},
			{
				name: "live_main",
				selector: { boolean: {} }
			},
			{
				name: "talk_button",
				selector: { boolean: {} }
			},
			{
				name: "duplex",
				selector: { select: {
					mode: "list",
					options: Wr
				} }
			},
			{
				name: "security_look",
				selector: { boolean: {} }
			},
			{
				name: "look_tint",
				selector: { color_rgb: {} }
			},
			{
				name: "look_strength",
				selector: { number: {
					min: .5,
					max: 10,
					step: .5,
					mode: "slider"
				} }
			},
			{
				name: "look_darkness",
				selector: { number: {
					min: 0,
					max: 90,
					step: 1,
					mode: "slider",
					unit_of_measurement: "%"
				} }
			},
			{
				name: "leave_after",
				selector: { number: {
					min: 0,
					max: 120,
					step: 1,
					mode: "slider",
					unit_of_measurement: "s"
				} }
			},
			{
				name: "motion_dot",
				selector: { boolean: {} }
			},
			{
				name: "motion_colour",
				selector: { color_rgb: {} }
			},
			{
				name: "motion_size",
				selector: { number: {
					min: 4,
					max: 40,
					step: 1,
					mode: "slider",
					unit_of_measurement: "px"
				} }
			},
			{
				name: "motion_pulse",
				selector: { number: {
					min: 0,
					max: 5,
					step: .1,
					mode: "slider",
					unit_of_measurement: "s"
				} }
			},
			{
				name: "motion_linger",
				selector: { number: {
					min: 0,
					max: 300,
					step: 1,
					mode: "slider",
					unit_of_measurement: "s"
				} }
			},
			{
				name: "motion_corner",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: "top-right",
							label: "Top right"
						},
						{
							value: "top-left",
							label: "Top left"
						},
						{
							value: "bottom-right",
							label: "Bottom right"
						},
						{
							value: "bottom-left",
							label: "Bottom left"
						}
					]
				} }
			},
			{
				name: "tap_main",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: "more-info",
							label: "Opens its more-info (live video)"
						},
						{
							value: "live",
							label: "Opens its page on the camera dashboard"
						},
						{
							value: "full",
							label: "Shows it full screen, with its controls"
						},
						{
							value: "none",
							label: "Nothing"
						}
					]
				} }
			},
			{
				name: "main_controls",
				selector: { boolean: {} }
			},
			{
				name: "sound_button",
				selector: { boolean: {} }
			},
			{
				name: "screen_button",
				selector: { boolean: {} }
			}
		], r = {
			entity: "Commander",
			tap_main: "A tap on the main camera",
			route: "The picture",
			away_sharpness: "Sharpness through Home Assistant",
			live_main: "Main camera as live video",
			talk_button: "Talk button",
			main_controls: "Its controls over the main camera",
			sound_button: "Sound button",
			screen_button: "Full screen button",
			duplex: "Mode",
			leave_after: "Picture kept running once out of sight",
			security_look: "Apply security look",
			look_tint: "Tint",
			look_strength: "Strength",
			look_darkness: "Darkness",
			motion_dot: "Show motion dot",
			motion_colour: "Colour",
			motion_size: "Size",
			motion_pulse: "Pulse",
			motion_linger: "Keep after motion",
			motion_corner: "Corner"
		}, i = (...e) => n.filter((t) => e.includes(t.name)), a = (n, i = "") => z`<ha-form
      class=${i}
      .hass=${this.hass}
      .data=${e}
      .schema=${n}
      .computeLabel=${(e) => r[e.name]}
      .computeHelper=${(e) => e.name === "entity" ? "The commanders built on the Camera Commander page (each one's Main camera select)." : e.name === "security_look" ? "The pictures in monochrome, tinted, like a security control room: the picture, the main camera's live video and its caption (not the highlight)." : e.name === "route" ? "At home: this page reached Home Assistant over http at a home address (a private IP, a .local name). Through Home Assistant works anywhere you can sign in, at a little cost to Home Assistant." : e.name === "away_sharpness" ? "How sharp the picture is when it comes through Home Assistant (away from home): a 2x screen at Full is four times the bytes of Light. Direct at home it is always the screen's own." : e.name === "live_main" ? "The main camera plays as live video over the picture, through Home Assistant's WebRTC (this device decodes it; the box does not). Needs the Camera compositor's Live main camera switch on; a video that does not start gives way to the drawn picture." : e.name === "main_controls" ? "The main camera's page controls (a gate, a light) over it, as on its full screen: the edge, size and background set for it on the Cameras page, the wide or tall edge by the main camera's own shape." : e.name === "sound_button" ? "A Sound button with the main camera's controls (on its full screen, and over it when its controls are), to hear the camera. It goes back to off when the main camera changes, and the camera is not heard while you talk (the visitor is heard through Talk)." : e.name === "screen_button" ? "A Full screen button over the main camera: the whole commander takes the screen, with the browser's bars and Home Assistant's header gone. Tap it again to go back. On an iPhone, where a browser can't show a page full screen, it shows the main camera's live video in the phone's own player instead. It has to be tapped again after the page reloads." : e.name === "talk_button" ? "A Talk button over a doorbell's live video (a camera with a Casa Mia Intercom call sensor, on an https page). Turn it off to use your own buttons: a tap_action of fire-dom-event with casa_mia_commander: {talk: toggle} does the same." : e.name === "motion_dot" ? "A small dot on a camera's tile while its motion sensor sees motion (the sensor Track motion uses), and for a while after; hover it for when." : e.name === "motion_pulse" ? "Seconds each pulse takes; 0: a steady dot." : e.name === "motion_linger" ? "Seconds the dot stays once the motion has stopped, so a short one is not missed. 0: it goes at once." : e.name === "leave_after" ? "Seconds the picture goes on once the card is out of sight (another page in Home Assistant, scrolled away), so coming back (the back button) finds it running; then it stops, and the box sends nothing more. 0: at once. Closing the app always stops it at once." : void 0}
      @value-changed=${(e) => {
			e.stopPropagation(), this._config = li({
				...this._config,
				...e.detail.value
			}), t(this, "config-changed", { config: this._config });
		}}
    ></ha-form>`;
		return z`
      <section aria-labelledby="main-heading">
        <h3 id="main-heading">Main camera</h3>
        ${a(i("entity", "live_main", "tap_main", "main_controls", "sound_button", "screen_button"))}
      </section>
      <section aria-labelledby="security-heading">
        <h3 id="security-heading">Security look</h3>
        ${a(i("security_look"))}
        ${e.security_look ? z`<div class="details">
          ${a(i("look_tint"), "colour")}
          ${a(i("look_strength", "look_darkness"), "adjustments")}
        </div>` : B}
      </section>
      <section aria-labelledby="motion-heading">
        <h3 id="motion-heading">Motion dot</h3>
        ${a(i("motion_dot"))}
        ${e.motion_dot ? z`<div class="details">
          ${a(i("motion_colour"), "colour")}
          ${a(i("motion_size", "motion_pulse", "motion_linger", "motion_corner"), "adjustments")}
        </div>` : B}
      </section>
      <section aria-labelledby="talk-heading">
        <h3 id="talk-heading">Talking</h3>
        ${a(i("talk_button", "duplex"))}
      </section>
      <section>
        ${a([{
			type: "expandable",
			name: "",
			flatten: !0,
			title: "Connection and performance",
			schema: i("route", ...e.route === "direct" ? [] : ["away_sharpness"], "leave_after")
		}])}
      </section>`;
	}
	static {
		this.styles = R`
    :host { display: block; }
    section { padding: 16px 0; }
    section + section { border-top: 1px solid var(--divider-color); }
    h3 { margin: 0 0 12px; font-size: var(--ha-font-size-m, 16px); }
    .details { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 16px; margin-top: 16px; }
    .colour { flex: 0 0 96px; width: 96px; }
    .adjustments { flex: 1 1 220px; min-width: 0; }
  `;
	}
};
c("casa-mia-commander", si), c("casa-mia-commander-editor", ui), l("casa-mia-commander", "Casa Mia Camera Commander", "One of the Camera Commander page's commanders: tap a camera to make it the main one.");
//#endregion
//#region src/connection.ts
var di = 100, fi = 600, pi = 6e4, mi = [
	"pointerdown",
	"keydown",
	"wheel"
];
function hi(e, t) {
	let n = (t) => console.error(`CASA-MIA CARDS: ${e} won't work: ${t}`), r = () => {
		let e = window.hassConnection;
		return e?.then(t, (e) => n(`Home Assistant's connection failed (${e})`)), !!e;
	};
	if (r()) return;
	let i = fi, a = setInterval(() => {
		r() ? clearInterval(a) : --i === 0 && (clearInterval(a), n("Home Assistant's connection never appeared"));
	}, di);
}
function gi(e, t, n, r) {
	n !== "dev" && hi(`${e}'s offer to reload after an update`, ({ conn: i }) => {
		i.addEventListener("ready", () => i.sendMessagePromise({ type: t }).then(({ version: t }) => {
			t && t !== n && (console.warn(`CASA-MIA CARDS: ${e} ${n} running, ${t} served: reload to update`), document.querySelector("home-assistant")?.dispatchEvent(new CustomEvent("hass-notification", {
				detail: {
					message: `${e} updated to ${t}: reload to use it`,
					duration: -1,
					dismissable: !0,
					action: {
						text: "Reload",
						action: () => location.reload()
					}
				},
				bubbles: !0,
				composed: !0
			})), r && vi(e, r));
		}, () => {}));
	});
}
var _i = !1;
function vi(e, t) {
	if (_i) return;
	_i = !0;
	let n, r = () => {
		clearTimeout(n), n = setTimeout(() => {
			t() && (console.warn(`CASA-MIA CARDS: ${e} reloading itself to update, untouched for ${pi / 1e3} s`), location.reload());
		}, pi);
	};
	for (let e of mi) window.addEventListener(e, r, {
		capture: !0,
		passive: !0
	});
	r();
}
//#endregion
//#region src/own.ts
var yi = new URL(import.meta.url).pathname.includes("casa-mia-tablet-layout");
function bi(e) {
	let t = window, n = t.casaMiaLayout ||= e;
	n !== e && console.warn(`CASA-MIA CARDS: ${e} loaded after ${n}, which is the Tablet Layout in use. Remove casa-mia-tablet-layout.js from the dashboard resources: Casa Mia has its own copy.`);
}
//#endregion
//#region src/anchors.ts
var xi = [
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
];
function Si(e) {
	let t = xi.findIndex((t) => t.includes(e));
	return t < 0 ? [1, 1] : [t, xi[t].indexOf(e)];
}
function Ci(e) {
	let [t, n] = Si(e), r = [
		"flex-start",
		"center",
		"flex-end"
	];
	return {
		justify: r[n],
		align: r[t]
	};
}
//#endregion
//#region src/over-layer/common.ts
var wi = "custom:casa-mia-over-layer", Ti = {
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
}, Ei = (e) => ({
	...Ti,
	...e
}), Di = (e) => !!e?.some((e) => e?.type === "custom:casa-mia-over-layer" && e.panel === !0);
function Oi(e, t) {
	let [n, r] = Si(t);
	return xi[e === "scroll" ? 0 : n][r];
}
function ki(e) {
	let t = Ei(e), n = Oi(t.mode, t.anchor), r = t.mode === "full" || n === "center" || t.mode === "scroll" && n === "top" ? "" : ` ${n}`, i = {
		float: "float",
		full: "full screen",
		scroll: "scroll with the view"
	}[t.mode] + r;
	return `Over layer · ${t.panel ? "its whole panel · " : ""}${i} · ${t.cover === "window" ? "the whole window" : "the view"}${t.block ? "" : " · taps pass through"}`;
}
//#endregion
//#region src/garnish.ts
var Ai = (e) => e.view_layout?.garnish !== !0 && e.type !== "custom:casa-mia-over-layer", ji = (e) => {
	let t = e.filter((e) => !e.hidden);
	return t.length > 0 && t.every((e) => !!e.config && !Ai(e.config));
};
function Mi(e) {
	for (let t = e; t; t = t.parentElement ?? (t.getRootNode().host || null)) if (["CASA-MIA-TABLET-LAYOUT", "CASA-MIA-TABLET-VIEW"].includes(t.tagName)) return !0;
	return !1;
}
var Ni = /* @__PURE__ */ new Set([
	"custom:casa-mia-commander",
	"picture",
	"picture-entity",
	"picture-glance",
	"map",
	"iframe",
	"custom:advanced-camera-card",
	"custom:webrtc-camera"
]), Pi = (e) => e.view_layout?.fill ?? Ni.has(e.type);
function Fi(e, t) {
	let { view_layout: n = {}, ...r } = e, { garnish: i, ...a } = n;
	return t && (a.garnish = !0), {
		...r,
		...Object.keys(a).length && { view_layout: a }
	};
}
function Ii(e) {
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
//#region src/tablet.ts
var Li = ["main", ...H];
function Ri(e, t) {
	let n = e?.view_layout;
	if (n?.panel === void 0) return t < Li.length ? {
		layer: 1,
		place: Li[t]
	} : null;
	let r = Number(n.layer ?? 1);
	return Li.includes(n.panel) && Number.isInteger(r) && r >= 1 && r <= 4 ? {
		layer: r,
		place: n.panel
	} : null;
}
function q(e, t) {
	let n = e;
	for (let e = 1; e < t; e++) n = n?.inner ?? {};
	return n ?? {};
}
function zi(e, t, n) {
	return t <= 1 ? n(e) : {
		...e,
		inner: zi(e.inner ?? {}, t - 1, n)
	};
}
function Bi(e, t) {
	let n = e[t];
	return !n || n.place === "main" ? n ? [t] : [] : e.flatMap((e, t) => e && e.layer === n.layer && e.place === n.place ? [t] : []);
}
var Vi = {
	main: "Main",
	left: "Left",
	top: "Top",
	right: "Right",
	bottom: "Bottom"
};
function Hi(e, t) {
	let n = e[t];
	if (!n) return "";
	let r = Bi(e, t);
	return `${n.layer > 1 && n.place !== "main" ? `L${n.layer} ` : ""}${Vi[n.place]}${r.length > 1 ? ` ${r.indexOf(t) + 1}` : ""}`;
}
function Ui(e, t) {
	let n = Wi(e);
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
	}), ...e.filter((e, t) => !Ri(e, t))];
}
var Wi = (e) => e.flatMap((e, t) => {
	let n = Ri(e, t);
	return n ? [{
		from: t,
		...n
	}] : [];
}), Gi = (e, t) => t !== "main" && e[t]?.size === "auto";
function Ki(e, t) {
	let n = e.map((e) => {
		let t = typeof e.columns == "number" ? e.columns : 12;
		return Math.min(e.max_columns ?? Infinity, Math.max(e.min_columns ?? 0, t));
	});
	return t ? n.reduce((e, t) => e + t, 0) : Math.max(0, ...n);
}
var qi = (e, t, n, r = 8) => e > 0 ? Math.max(0, Math.round(e * (t + r) / (12 * n) - r)) : 0;
function Ji(t, n, r, i, a, o) {
	let s = {
		width: n,
		height: r,
		aspects: {}
	};
	for (let [n, r] of Object.entries(e.main)) s[n] = t[n] ?? r.default;
	for (let c of H) {
		let l = t[c] ?? {}, u = c === "top" || c === "bottom" ? r : n, d = Gi(t, c) ? u > 0 ? a(c) / u * 100 : 0 : l.size;
		s[c] = {
			...e.panels[c],
			...l,
			...d !== void 0 && { size: d },
			fit: "cover",
			lines: 1,
			cameras: (o || !l.hidden) && i(c) ? [c] : []
		};
	}
	return s;
}
var Yi = [
	"top",
	"right",
	"bottom",
	"left"
];
function Xi(e) {
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
var Zi = (e, t) => e == null || e === "" ? t : Math.max(0, Number(e) || 0);
function Qi(t, n) {
	let r = q(t, n), i = Number(t.gap ?? e.main.gap.default);
	return {
		gap: i,
		middle: Object.fromEntries(H.map((e) => [e, Zi(r[e]?.gap, i)]))
	};
}
function $i(e, t, n) {
	let r = (e) => t ? e.share !== void 0 : e.length !== void 0, i = e.map((e) => !r(e) && e.size === "fill"), a = e.map((e) => !r(e) && e.size === void 0);
	if (e.length === 1) return a.map((e, t) => e || i[t]);
	if (i.some(Boolean) || n === "centre" || n === "end") return i;
	let o = e.map((e, t) => t), s = [...o.filter((t) => !e[t].hold), ...o.filter((t) => e[t].hold)].filter((e) => a[e]).at(-1);
	return o.map((e) => e === s);
}
function ea(e, t, n, r, i = 4, a) {
	let o = n.map((e, t) => t), [s, c] = [o.filter((e) => !n[e].hold), o.filter((e) => n[e].hold)], l = (e) => n[e].gapAfter ?? t, u = (e) => e.slice(0, -1).reduce((e, t) => e + l(t), 0), d = Math.max(0, e - u([...s, ...c])), f = $i(n, r, a), p = n.map((e, t) => f[t] ? 0 : r ? e.share === void 0 ? e.wide || d / i : d * e.share : e.length ?? e.tall ?? 0), m = p.reduce((e, t) => e + t, 0), h = f.filter(Boolean).length, g = m > d ? d / m : 1, _ = p.map((e, t) => f[t] ? Math.max(0, d - m) / h : e * g), v = (e) => e.reduce((e, t) => e + _[t], 0) + u(e), y = e - (c.length ? v(c) + (s.length ? l(s[s.length - 1]) : 0) : 0) - v(s), b = h ? 0 : a === "end" ? y : a === "centre" ? y / 2 : 0, x = [], S = Math.max(0, b);
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
var ta = (e, t) => Math.floor(e / t);
function na(t, n, r) {
	let { width: i, height: a } = t, o = At(t, r), s = (e) => t[e].cameras.length > 0, c = (e, n) => s(e) ? t[e].unit === "px" ? Math.min(U(t[e].size * (t.scale ?? 1)), ta(n * 45, 100)) : U(n * t[e].size / 100) : 0, l = (n, r) => {
		let i = `anchor_${r}`;
		return !!(t[n][i] ?? e.panels[n][i]);
	}, u, d, f, p, m = 0, h = 0;
	if (o === null) [u, d, f, p] = [
		c("left", i),
		c("right", i),
		c("top", a),
		c("bottom", a)
	];
	else {
		let r = Number(t.panel_min ?? e.main.panel_min.default), c = (e, t, i) => (s(t) ? U(e * r / 100) + n[t] : 0) + (s(i) ? U(e * r / 100) + n[i] : 0), l = i - c(i, "left", "right"), g = a - c(a, "top", "bottom");
		m = Math.min(U(i * Number(t.main_width ?? e.main.main_width.default) / 100), l), h = U(m / o), h > g && ([h, m] = [g, U(g * o)]);
		let _ = (e, t, r) => {
			let [i, a] = [s(t), s(r)], o = Math.max(e - (i ? n[t] : 0) - (a ? n[r] : 0), 0);
			return i && a ? [ta(o, 2), o - ta(o, 2)] : i ? [o, 0] : a ? [0, o] : [0, 0];
		};
		[u, d] = _(i - m, "left", "right"), [f, p] = _(a - h, "top", "bottom");
	}
	let g = u + (u ? n.left : 0), _ = i - d - (d ? n.right : 0), v = f + (f ? n.top : 0), y = a - p - (p ? n.bottom : 0), b = (e, t, n) => {
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
		g + ta(_ - g - m, 2),
		v + ta(y - v - h, 2),
		m,
		h
	]), {
		mid: C,
		edges: Object.fromEntries(H.map((e) => [e, s(e) ? S[e] : null]))
	};
}
function ra() {
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
var ia = (e) => Math.max(1, ...e.flatMap((e) => e && e.place !== "main" ? [e.layer] : []));
function aa(e, t, n, r, i = 4, a = !1) {
	let o = ia(r);
	if (!n || o < 2 || a) return oa(e, t, n, r, i, n, a);
	let s = oa(e, t, !1, r, i, !0);
	if (s.boxes.length < o) return oa(e, t, n, r, i);
	let c = e;
	for (let t = 1; t < o; t++) {
		let [n, r] = [s.boxes[t - 1], s.boxes[t]], { middle: i } = Qi(e, t), a = (e, t) => e > 0 ? e - i[t] : 0, o = {
			left: a(r[0] - n[0], "left"),
			top: a(r[1] - n[1], "top"),
			right: a(n[0] + n[2] - r[0] - r[2], "right"),
			bottom: a(n[1] + n[3] - r[1] - r[3], "bottom")
		};
		c = zi(c, t, (e) => ({
			...e,
			...Object.fromEntries(H.map((t) => [t, {
				...e[t],
				size: o[t],
				unit: "px"
			}]))
		}));
	}
	let l = s.boxes[o - 1];
	return oa(c, [t[0] + s.canvas[0] - l[2], t[1] + s.canvas[1] - l[3]], !0, r, i);
}
function oa(e, [t, n], r, i, a, o = r, s = !1) {
	let c = Math.max(0, Math.floor((Math.min(t, n) - 1) / 2)), l = Xi(e.margin).map((e) => Math.min(e, c)), u = l.map((e) => !r || s || e <= 25 ? e : 0), [d, f] = [t - u[1] - u[3], n - u[0] - u[2]], p = ia(i), m = i.findIndex((e) => e?.place === "main" && e.shows), [h, g] = [ra(), ra()], _ = [], v = [], y = [], [b, x, S, C] = [
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
		let s = (e) => i.flatMap((n, r) => n && n.layer === t && n.place === e && n.shows ? [r] : []), c = i.some((e) => e?.shows && e.place !== "main" && e.layer > t), l = (e) => e === "main" ? m >= 0 || t < p && c : s(e).length > 0, u = (e) => Math.max(0, ...s(e).map((t) => (e === "top" || e === "bottom" ? i[t].tall : i[t].wide) ?? 0)), d = q(e, t), f = {
			...Ji({
				...e,
				...Object.fromEntries(H.map((e) => [e, d[e]])),
				...t < p && { main_fit: "fit" }
			}, n[2], n[3], l, u, o),
			margin: 0
		}, w = Qi(e, t), { mid: T, edges: E } = na(f, w.middle, l("main") ? "main" : null), D = (e) => E[e] ?? [
			0,
			0,
			0,
			0
		], [O, k, A, j] = [
			D("left")[2],
			D("top")[3],
			D("right")[2],
			D("bottom")[3]
		], M = w.middle, N = h.add(b.at + O, b, x), P = h.add(b.at + (O && O + M.left), N, x), F = h.add(x.at - (A && A + M.right), P, x), I = h.add(x.at - A, F, x), ee = g.add(S.at + k, S, C), te = g.add(S.at + (k && k + M.top), ee, C), L = g.add(C.at - (j && j + M.bottom), te, C), ne = g.add(C.at - j, L, C), re = (e, t) => !!f[e][`anchor_${t}`], R = (e, t) => E[e] !== null && re(e, t), ie = {
			top: {
				cross: [S, ee],
				along: [re("top", "left") ? b : P, re("top", "right") ? x : F]
			},
			bottom: {
				cross: [ne, C],
				along: [re("bottom", "left") ? b : P, re("bottom", "right") ? x : F]
			},
			left: {
				cross: [b, N],
				along: [R("top", "left") ? te : S, R("bottom", "left") ? L : C]
			},
			right: {
				cross: [I, x],
				along: [R("top", "right") ? te : S, R("bottom", "right") ? L : C]
			}
		};
		for (let e of H) {
			if (!E[e]) continue;
			let n = e === "top" || e === "bottom", r = n ? h : g, { cross: o, along: c } = ie[e], [l, u] = c, f = s(e), p = ea(u.at - l.at, w.gap, f.map((e) => i[e]), n, a, d[e]?.arrange), m = f.map((e, t) => t).sort((e, t) => p[e].at - p[t].at), v = l, b = [];
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
				top: [ee, te],
				bottom: [L, ne],
				left: [N, P],
				right: [F, I]
			};
			x && y.push({
				id: `${t}.${e}`,
				edge: {
					layer: t,
					place: e
				},
				size: M[e],
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
				P,
				F,
				te,
				L
			];
		} else if (m >= 0 && T) {
			let e = [
				n[0] + T[0],
				n[1] + T[1],
				T[2],
				T[3]
			], t = T[2] < F.at - P.at || T[3] < L.at - te.at;
			_[m] = {
				col: [P, F],
				row: [te, L],
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
function sa(e, t, n = (e) => e.rect) {
	return e.flatMap((e) => {
		let r = t(e);
		if (!r) return [];
		let [i, a, o, s] = n(e), [c, l, u] = [
			Number(r.knock) || 0,
			Number(r.extend_start) || 0,
			Number(r.extend_end) || 0
		], d = Array.isArray(r.color) ? `rgb(${r.color.map(Number).join(", ")})` : String(r.color ?? "#000"), f = {
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
function ca(e) {
	let t = (e) => Object.fromEntries(Object.entries(e).map(([e, t]) => [e, String(t)]));
	return e.flatMap((e) => {
		let n = e.width, r = e.style === "dashed" ? { "stroke-dasharray": `${3 * n} ${2 * n}` } : e.style === "dotted" ? {
			"stroke-dasharray": `0 ${2 * n}`,
			"stroke-linecap": "round"
		} : {};
		if (e.style !== "double") return [t({
			x1: e.x1,
			y1: e.y1,
			x2: e.x2,
			y2: e.y2,
			stroke: e.color,
			"stroke-width": n,
			...r
		})];
		let i = Math.max(1, n / 3), [a, o] = e.y1 === e.y2 ? [0, i] : [i, 0];
		return [-1, 1].map((n) => t({
			x1: e.x1 + n * a,
			y1: e.y1 + n * o,
			x2: e.x2 + n * a,
			y2: e.y2 + n * o,
			stroke: e.color,
			"stroke-width": i
		}));
	});
}
function la(t, n) {
	return t.size === "auto" ? "auto" : t.unit === "px" ? "" : `${Number(t.size ?? e.panels[n].size) || 0}%`;
}
var ua = /* @__PURE__ */ new Map();
function da(e, t) {
	let n = `${e}/${t}`, r = ua.get(n);
	return r || ua.set(n, r = { naturals: {} }), r;
}
//#endregion
//#region src/view/common.ts
var fa = (e) => Xi(e).map((e) => e + 2);
function pa(e, t) {
	let n = [];
	for (let r = e; r; r = r.parentElement ?? (r.getRootNode().host || null)) {
		let e = r.getBoundingClientRect?.().height ?? 0;
		e > t + 1 && n.push(`${r.tagName.toLowerCase()} ${Math.round(e)}`);
	}
	return n.length ? `\ntoo tall: ${n.join("\n")}` : "";
}
function ma(e, t) {
	let n, r = !1;
	return e.connection.subscribeMessage((e) => t(e?.tablet_view ?? {}), { type: "casa_mia/settings/subscribe" }).then((e) => r ? e() : n = e).catch(() => t({})), () => {
		r = !0, n?.();
	};
}
var ha = (t) => Math.max(0, Number(t.header_space ?? e.main.header_space.default) || 0), [ga, _a] = [56, 8], va = "casa-mia-tablet-dimensions", ya = "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z", ba = "M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z";
function xa(e) {
	return (e?.querySelector("hui-grid-section"))?.shadowRoot?.querySelector(".container")?.offsetHeight ?? 0;
}
var Sa = (t) => Math.max(0, Number(t.narrow_below ?? e.main.narrow_below.default) || 0), Ca = [
	"top",
	"main",
	"left",
	"right",
	"bottom"
], wa = (e) => String(e && Ca.includes(e) ? Ca.indexOf(e) : Ca.length);
function Ta(e, t, n) {
	return t <= 0 ? !1 : e <= 0 ? n : e < t + (n ? 24 : 0);
}
//#endregion
//#region src/view/styles.ts
var Ea = R`
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
`, Da = R`
  :host([cm-narrow]) .create-section-container {
    display: none;
  }
`, Oa = new CSSStyleSheet();
Oa.replaceSync("\n  .add { min-width: var(--row-height, 56px); } /* edit mode: HA's Add card button never narrower than tall */\n  :host([cm-fill]) ha-sortable { display: contents; }\n  :host([cm-fill]) .container { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; margin: 0; }\n  :host([cm-fill]) .card { flex: none; }\n  :host([cm-fill]) .card:has(> [cm-fill]) { flex: 1 1 0; min-height: 0; }\n  [cm-fill], [cm-fill] > * { display: block; height: 100%; }\n  .card:has(> [cm-garnish]) { display: none; } /* narrow (HA's own sections): garnish left out */\n");
//#endregion
//#region src/view/base.ts
var ka = (e) => class extends e {
	constructor(...e) {
		super(...e), this.cmDebug = !1, this.cmApp = {}, this.cmLayout = {}, this.cmBoxes = [], this.cmGapsNow = [], this.cmSections = [], this.cmColumns = 4, this.cmFrame = 0, this.cmAdding = !1, this.cmNarrow = !1, this.cmSeen = new ResizeObserver(() => this.cmLater()), this.cmLater = () => {
			cancelAnimationFrame(this.cmFrame), this.cmFrame = requestAnimationFrame(() => this.cmPlace());
		};
	}
	static {
		this.styles = [
			e.styles,
			Er,
			Da,
			Ea
		];
	}
	get cmSeenOut() {
		return da(location.pathname.split("/")[1], this.index);
	}
	setConfig(e) {
		super.setConfig(e), this.cmDebug = !!e.debug, this.cmMarks(), this.cmLayout = e.layout ?? {}, this.cmSections = e.sections ?? [], this.cmColumns = Number(e.max_columns) || 4;
	}
	connectedCallback() {
		super.connectedCallback(), s.shown++, this.cmHolder = this.parentElement?.parentElement, this.cmPage(!this.cmNarrow), this.cmSeen.observe(this), this.cmStop = O(() => this.cmLater()), this.addEventListener("section-visibility-changed", this.cmLater), this.addEventListener("card-visibility-changed", this.cmLater);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), s.shown--, this.cmPage(!1), this.cmSeen.disconnect(), this.cmStop?.(), this.removeEventListener("section-visibility-changed", this.cmLater), this.removeEventListener("card-visibility-changed", this.cmLater), cancelAnimationFrame(this.cmFrame), this.cmUnwatch?.(), this.cmUnwatch = void 0;
	}
	cmPage(e) {
		for (let [t, n] of [[this.cmHolder, "min-height"], [document.documentElement, "height"]]) e ? t?.style.setProperty(n, "100dvh") : t?.style.removeProperty(n);
	}
	cmToNarrow(e) {
		this.cmNarrow = e, this.toggleAttribute("cm-narrow", e);
		let t = this.shadowRoot, n = Ea.styleSheet;
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
		n && (n.disabled = !0), t && this.cmComplete(), !this.cmUnwatch && this.hass && (this.cmUnwatch = ma(this.hass, (e) => {
			this.cmApp = e, this.cmMarks(), this.cmLater();
		})), this.cmLater();
	}
	cmComplete() {
		let e = this.lovelace.config.views[this.index].sections ?? [], t = Li.filter((t) => !e.some((e, n) => Ri(e, n)?.layer === 1 && Ri(e, n)?.place === t));
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
			return localStorage.getItem(va) !== "off";
		} catch {
			return !0;
		}
	}
	set cmDimsOn(e) {
		try {
			localStorage.setItem(va, e ? "on" : "off");
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
			length: Number(e.row_span) * (ga + _a) - _a
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
		return Ki((this.sections[e]?._cards ?? []).filter((e) => !e.hidden).map((e) => e.getGridOptions?.() ?? {}), t === "top" || t === "bottom");
	}
	cmCards(e, t, n) {
		if (t.place === "main") return {};
		let r = t.place === "top" || t.place === "bottom", i = Gi(q(this.cmLayout, t.layer), t.place), a = this.cmCardColumns(e, t.place), [o, s, c, l] = fa(this.cmSections[e]?.view_layout?.padding), u = () => ({ wide: qi(a || 12, n, this.cmColumns) + l + s }), d = () => ({ tall: (a ? this.cmNatural(e) : Math.max(ga, this.cmNatural(e))) + o + c });
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
		let i = xa(n);
		return this.lovelace?.editMode || (this.cmSeenOut.naturals[t] = i), i;
	}
	cmGridColumns(e, t) {
		let n = t[e], r = t.flatMap((e, t) => e?.shows && e.layer === n.layer && e.place === n.place ? [t] : []), i = (e) => this.cmCardColumns(e, n.place);
		if (n.place === "top" || n.place === "bottom") {
			let a = $i(r.map((e) => t[e]), !0, q(this.cmLayout, n.layer)[n.place]?.arrange);
			return n.share === void 0 && r.length > 1 && !a[r.indexOf(e)] && i(e) || null;
		}
		return n.place === "main" || !Gi(q(this.cmLayout, n.layer), n.place) ? null : Math.max(0, ...r.map(i)) || null;
	}
	cmGrid(e, t) {
		let n = e?.querySelector("hui-grid-section");
		n && (t === null ? (n.style.removeProperty("--base-column-count"), n.style.removeProperty("--column-span")) : (n.style.setProperty("--base-column-count", String(t)), n.style.setProperty("--column-span", "1")));
	}
	cmFill(e, t) {
		let n = e?.querySelector("hui-grid-section");
		if (!n?.shadowRoot) return;
		let r = n.shadowRoot.adoptedStyleSheets;
		r.includes(Oa) || (n.shadowRoot.adoptedStyleSheets = [...r, Oa]);
		let i = t.length === 1 && Pi(t[0].config ?? { type: "" }) ? t[0] : null;
		n.toggleAttribute("cm-fill", !!i);
		for (let t of e._cards ?? []) t.toggleAttribute("cm-fill", t === i);
	}
	cmShow() {
		if (!this.cmDebug && !this.cmApp.show_size) return this.cmLabel?.remove();
		this.cmLabel?.isConnected || (this.cmLabel = document.createElement("div"), this.cmLabel.className = "cm-debug", this.shadowRoot?.prepend(this.cmLabel));
		let e = this.getBoundingClientRect(), t = document.documentElement;
		this.cmLabel.textContent = `view ${Math.round(e.width)} x ${Math.round(e.height)}, room ${w(this)}\npage scrolls ${t.scrollWidth - t.clientWidth} x ${t.scrollHeight - t.clientHeight}` + pa(this, t.clientHeight);
	}
	cmPlace() {}
}, Aa = "auto", ja = /* @__PURE__ */ new Set(["fit", "lines"]), Ma = (t) => ({
	...e.panels[t],
	unit: "%",
	hide_empty: !0,
	arrange: "start"
}), J = (e) => e === "top" || e === "bottom", Na = (e, t) => ({ number: {
	min: e,
	max: t,
	mode: "box",
	unit_of_measurement: "px"
} });
function Pa(t) {
	let n = {};
	for (let [r, i] of Object.entries(t)) if (r === "inner") {
		let e = Pa(i ?? {});
		Object.keys(e).length && (n.inner = e);
	} else if (H.includes(r)) {
		let e = Ma(r), t = Object.fromEntries(Object.entries(i ?? {}).filter(([t, n]) => !ja.has(t) && n !== e[t]));
		Object.keys(t).length && (n[r] = t);
	} else i !== e.main[r]?.default && (n[r] = i);
	return n;
}
function Fa(e, t, n, r, i) {
	let a = !!t && typeof t == "object", o = a ? 0 : Number(t) || 0, s = (e) => a ? Number(t[e]) || 0 : o;
	return {
		data: {
			[e]: o,
			[`${e}_each`]: a,
			...Object.fromEntries(Yi.map((t) => [`${e}_${t}`, s(t)]))
		},
		schema: [...a ? Yi.map((t) => ({
			name: `${e}_${t}`,
			selector: Na(0, n)
		})) : [{
			name: e,
			selector: Na(0, n)
		}], {
			name: `${e}_each`,
			selector: { boolean: {} }
		}],
		labels: {
			[e]: [r, i],
			[`${e}_each`]: ["Each side its own", ""],
			...Object.fromEntries(Yi.map((t) => [`${e}_${t}`, [`${r}, ${t}`, ""]]))
		},
		read(t) {
			return t[`${e}_each`] ? Object.fromEntries(Yi.map((n) => [n, Number(t[`${e}_${n}`] ?? t[e]) || 0])) : Number(t[e]) || 0;
		}
	};
}
function Ia(t) {
	let n = Object.fromEntries(Object.entries(e.main).map(([e, n]) => [e, t[e] ?? n.default]));
	return {
		schema: p(String(n.main_fit)).flatMap((e) => e.name === "main_fit" ? [{
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
		data: n,
		change: (e) => ({
			...t,
			...e
		})
	};
}
function La(t, n, r, i, a) {
	let o = q(t, n)[r] ?? {}, s = o.size === Aa, c = {
		...Ma(r),
		...o,
		[Aa]: s
	};
	s && (c.size = e.panels[r].size);
	let l = c.unit === "px", u = [
		{
			name: Aa,
			selector: { boolean: {} }
		},
		...m(r).filter((e) => !ja.has(e.name) && !e.name.startsWith("anchor_") && (!s || e.name !== "size" && e.name !== "unit")).map((e) => e.name === "size" && l ? {
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
						label: J(r) ? "From the left" : "From the top"
					},
					{
						value: "centre",
						label: "Centred"
					},
					{
						value: "end",
						label: J(r) ? "From the right" : "From the bottom"
					}
				]
			} }
		}
	].filter((e) => !a || a.includes(e.name)), d = J(r) ? "tall" : "wide";
	return {
		schema: u,
		data: c,
		labels: {
			[Aa]: [`As ${d} as its cards`, `The edge is exactly as ${d} as what its panels hold, as cards show and hide.`],
			arrange: ["Arrange", "Where its panels sit when they do not fill it (none filling); those held to the end stay there."]
		},
		change: (a) => {
			let { [Aa]: o, ...s } = a, l = o ? Aa : s.size === Aa ? e.panels[r].size : s.size;
			if (!o && s.unit !== c.unit) {
				let [e, t] = i() ?? [0, 0], n = J(r) ? t : e;
				n > 0 && (l = Math.round(s.unit === "px" ? n * l / 100 : Math.min(100, l * 100 / n)));
			}
			return zi(t, n, (e) => ({
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
function Ra(e, t, n) {
	let r = t.labels ?? {};
	return z`<ha-form
    .hass=${e}
    .data=${t.data}
    .schema=${t.schema}
    .computeLabel=${(e) => r[e.name]?.[0] ?? g(e)}
    .computeHelper=${(e) => r[e.name]?.[1] ?? _(e)}
    @value-changed=${(e) => {
		e.stopPropagation(), n(t.change(e.detail.value));
	}}
  ></ha-form>`;
}
function za(e, t, n, r) {
	let i = e.view_layout ?? {}, a = Fa("padding", i.padding ?? 0, 400, "Padding", "Room inside it, round its cards, px: to line them up."), { view_layout: o, ...s } = e, c = (e, t, n = s) => {
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
	let l = t, u = J(l) ? "column_span" : "row_span", d = e[u] === void 0 ? i.length ?? (r ? "fill" : "cards") : "fixed";
	return {
		schema: [
			{
				name: "length",
				selector: { select: {
					mode: "list",
					options: [
						{
							value: "cards",
							label: `As ${J(l) ? "wide" : "tall"} as its cards`
						},
						{
							value: "fill",
							label: "Fill what is left"
						},
						{
							value: "fixed",
							label: J(l) ? "A fixed width" : "A fixed height"
						}
					]
				} }
			},
			...d === "fixed" ? [{
				name: u,
				selector: { number: {
					min: 1,
					max: J(l) ? n : 16,
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
			length: [J(l) ? "Width" : "Height", ""],
			column_span: ["Width", `Columns of the view's ${n} (its Width in HA's Layout tab).`],
			row_span: ["Height", "In HA's card rows (56 px each, and the gap between)."],
			hold: [`Hold to the ${J(l) ? "right" : "bottom"}`, "Against the end of its edge, whatever the others do."],
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
function Ba(e, t) {
	let n = e.getBoundingClientRect(), [r, i] = [window.innerWidth, window.innerHeight], a = Math.max(8, Math.min(n.left, r - t.offsetWidth - 8)), o = i - n.bottom - 12, s = n.top - 12;
	return o >= 360 || o >= s ? `left:${a}px;top:${n.bottom + 4}px;max-height:${o}px` : `left:${a}px;bottom:${i - n.top + 4}px;max-height:${s}px`;
}
var Va = class extends V {
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
		e && (this.at = Ba(this.anchor(), e));
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
		return z`<div class="backdrop" @click=${() => this.cancel()}></div>
      <div class="box" role="dialog" aria-label=${t} style=${this.at || "visibility:hidden"}>
        <header><h2>${e}</h2>${n}</header>
        <div class="middle">${customElements.get("ha-form") ? r : z`<p class="note">Loading…</p>`}</div>
        <footer>
          <button class="btn" @click=${() => this.cancel()}>Cancel</button>
          <button class="btn primary ${a ? "danger" : ""}" ?disabled=${this.busy} @click=${() => this.save()}>${i}</button>
        </footer>
      </div>`;
	}
	static {
		this.styles = [Er, R`
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
c("casa-mia-panel-options", class extends Va {
	constructor(...e) {
		super(...e), this.layout = {}, this.section = {};
	}
	static {
		this.properties = {
			...Va.properties,
			layout: { state: !0 },
			section: { state: !0 }
		};
	}
	open(e) {
		this.o = e, this.layout = e.layout, this.section = e.section, document.body.append(this), a().then(() => this.requestUpdate());
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
		return this.o.save(Pa(this.layout), this.section);
	}
	act(e) {
		this.cancel(), e?.();
	}
	group(e, t, n) {
		return z`<section>
      <h3>${e}</h3>
      ${t ? z`<p class="note">${t}</p>` : B}
      ${n}
    </section>`;
	}
	render() {
		if (!this.o) return B;
		let e = this.o, t = e.place === "main", n = e.place, r = `${e.layer > 1 ? `layer ${e.layer} ` : ""}${n} edge`, { add: i, back: a, on: o, remove: s } = e.actions, c = J(n) ? ["←", "→"] : ["↑", "↓"], l = t ? z`<div class="actions">
          ${i ? z`<button class="cm-chip" @click=${() => this.act(i)}>+ Add a layer</button>` : B}
          ${s ? z`<button class="cm-chip" @click=${() => this.act(s)}>Remove layer ${e.count}</button>` : B}
        </div>` : z`<div class="actions">
          <button class="cm-chip" @click=${() => this.act(i)}>+ Add a panel</button>
          ${a || o ? z`<button class="cm-chip" ?disabled=${!a} aria-label="Move earlier" @click=${() => this.act(a)}>${c[0]}</button>
                <button class="cm-chip" ?disabled=${!o} aria-label="Move later" @click=${() => this.act(o)}>${c[1]}</button>` : B}
        </div>`;
		return this.frame(e.name, `${e.name} options`, l, z`${this.group("This panel", t ? "" : `${e.name} only.`, z`${Ra(e.hass, za(this.section, e.place, e.columns, e.fills), (e) => this.change(this.layout, e))}
          <button class="link" @click=${() => this.act(e.edit)}>Visibility, background and more (HA's own)…</button>`)}
      ${t ? this.group("Whole view", "The main panel's shape.", Ra(e.hass, Ia(this.layout), (e) => this.change(e))) : this.group(`Whole ${r}`, e.count > 1 ? `All ${e.count} panels of the ${r}.` : `Every panel of the ${r} (one now).`, Ra(e.hass, La(this.layout, e.layer, n, e.room), (e) => this.change(e)))}`);
	}
});
function Ha(e) {
	document.createElement("casa-mia-panel-options").open(e);
}
c("casa-mia-mini", class extends Va {
	constructor(...e) {
		super(...e), this.value = {};
	}
	static {
		this.properties = {
			...Va.properties,
			value: { state: !0 }
		};
	}
	open(e) {
		this.o = e, this.value = e.value, document.body.append(this), a().then(() => this.requestUpdate());
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
		if (!this.o) return B;
		let e = this.o, t = e.actions?.length ? z`<div class="actions">
          ${e.actions.map((e) => z`<button
                class="cm-chip"
                @click=${() => {
			this.cancel(), e.run();
		}}
              >
                ${e.label}
              </button>`)}
        </div>` : B;
		return this.frame(e.title, e.title, t, z`<div class="plain">
        ${e.note ? z`<p class="note">${e.note}</p>` : B}
        ${Ra(e.hass, e.form(this.value), (t) => {
			this.value = t, e.apply(t);
		})}
      </div>`);
	}
});
function Ua(e) {
	document.createElement("casa-mia-mini").open(e);
}
c("casa-mia-confirm", class extends Va {
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
		return this.frame(t, t, B, z`<p class="plain note">${n}</p>`, this.action, this.danger);
	}
});
function Wa(e, { action: t = "OK", danger: n = !1 } = {}) {
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
var Ga = (t) => class extends t {
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
		let t = e(Wi(this.cmSections));
		return this.cmReseen(t), this.cmSaveView((e) => ({
			...e,
			sections: Ui(e.sections ?? [], t)
		}));
	}
	cmActions(e) {
		let t = Ri(this.cmSections[e], e);
		if (!t) return {};
		if (t.place === "main") {
			let e = ia(Wi(this.cmSections)), t = [
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
					(!Wi(this.cmSections).some((e) => t(e) && this.cmSections[e.from]?.cards?.length) || await Wa(`Remove layer ${e}? Its panels' cards go with it.`, {
						action: "Remove",
						danger: !0
					})) && this.cmRestack((e) => e.filter((e) => !t(e)));
				} }
			};
		}
		let n = (t) => {
			let n = Wi(this.cmSections), r = n.findIndex((t) => t.from === e), i = Bi(n, r), a = i[i.indexOf(r) + t];
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
		let n = Ri(this.cmSections[e], e);
		if (!n) return;
		let r = this.sections.map((e, t) => Ri(this.cmSections[t], t)), i = this.shadowRoot?.querySelectorAll(".content > .section")[e], [a, o] = [this.cmLayout, this.cmSections], s = n.place === "main" ? [] : Bi(r, e), c = n.place === "top" || n.place === "bottom", l = $i(s.map((e) => this.cmLock(o[e], n.place)), c, q(a, n.layer)[n.place]?.arrange)[s.indexOf(e)] ?? !1, u = (t, n) => {
			this.cmLayout = t, this.cmSections = o.map((t, r) => r === e ? n : t), this.cmLater();
		};
		Ha({
			hass: this.hass,
			anchor: t,
			name: Hi(r, e),
			...n,
			count: n.place === "main" ? ia(r) : s.length,
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
		return e.edge ? q(this.cmLayout, e.edge.layer)[e.edge.place]?.line : this.cmSections[e.after]?.view_layout?.line_after;
	}
	cmGapSet(e, t, n, r, i) {
		if (e.edge) {
			let { layer: a, place: o } = e.edge;
			return [zi(r, a, (e) => {
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
			for (let e of H) if (t[e]) {
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
			let { layout: r, ...i } = n, a = Pa(e);
			return {
				...i,
				sections: t,
				...Object.keys(a).length && { layout: a }
			};
		});
	}
	cmMini(e, t, n, r, i, a, o = []) {
		let [s, c] = [this.cmLayout, this.cmSections];
		Ua({
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
		let t = this.sections.map((e, t) => Ri(this.cmSections[t], t));
		return e.edge ? `Between the ${e.edge.layer > 1 ? `layer ${e.edge.layer} ` : ""}${e.edge.place} edge and its middle.` : `After ${Hi(t, e.after)}, to the next along its edge.`;
	}
	cmGap(e, t) {
		let n = this.cmLineOf(e);
		this.cmMini(t, "Gap", this.cmGapWhose(e), {
			gap: e.size,
			all: !1
		}, (e) => ({
			schema: [{
				name: "gap",
				selector: Na(0, 200)
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
					selector: Na(0, 40)
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
					selector: Na(-200, 200)
				},
				{
					name: "extend_start",
					selector: Na(-400, 400)
				},
				{
					name: "extend_end",
					selector: Na(-400, 400)
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
		let n = Xi(this.cmLayout.margin);
		this.cmMini(t, `Margin, ${e}`, e === "top" ? "Below the header." : e === "bottom" ? "Above the footer." : `Against the screen's ${e}.`, {
			margin: n[Yi.indexOf(e)],
			all: !1
		}, (e) => ({
			schema: [{
				name: "margin",
				selector: Na(0, 400)
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
			let o = Object.fromEntries(Yi.map((t, r) => [t, t === e ? a : n[r]]));
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
		this.cmMini(n, `${e > 1 ? `Layer ${e} ` : ""}${t[0].toUpperCase()}${t.slice(1)} edge`, t === "top" || t === "bottom" ? "How tall it is." : "How wide it is.", this.cmLayout, (n) => La(n, e, t, r, [
			"auto",
			"size",
			"unit"
		]), (e, t, n) => [e, n]);
	}
	cmHeader(e) {
		let t = this.shadowRoot?.querySelector("hui-view-header");
		this.cmMini(e, "Header", "The view's header: its title and badges.", { header_space: ha(this.cmLayout) }, (e) => ({
			schema: [{
				name: "header_space",
				selector: Na(0, 200)
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
	cmAnchor(t, n, r) {
		let i = `anchor_${r}`, a = q(this.cmLayout, t)[n]?.[i] ?? e.panels[n][i], o = zi(this.cmLayout, t, (e) => ({
			...e,
			[n]: {
				...e[n],
				[i]: !a
			}
		}));
		this.cmSaveAll(o, this.cmSections);
	}
}, Ka = (t) => class extends t {
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
		let i = e.querySelector(":scope > .cm-lines"), a = sa(t, (e) => this.cmLineOf(e), (e) => this.cmGapRect(e, n, r));
		if (!a.length) return i?.remove(), a;
		i || (i = document.createElement("div"), i.className = "cm-lines", e.append(i));
		let o = ca(a), s = JSON.stringify(o);
		if (i.dataset.lines === s) return a;
		let c = "http://www.w3.org/2000/svg", l = document.createElementNS(c, "svg");
		for (let e of o) {
			let t = document.createElementNS(c, "line");
			for (let [n, r] of Object.entries(e)) t.setAttribute(n, r);
			l.append(t);
		}
		return i.replaceChildren(l), i.dataset.lines = s, a;
	}
	cmOverlay(e, t) {
		let n = e.querySelector(`:scope > .${t}`);
		return n || (n = document.createElement("div"), n.className = t, n.addEventListener("click", this.cmMark), e.append(n)), n;
	}
	cmDims(e, t, n, r, i, a, o) {
		if (!t) return e.querySelector(":scope > .cm-dims")?.remove();
		let s = this.cmOverlay(e, "cm-dims"), c = e.getBoundingClientRect(), l = [...e.querySelectorAll(":scope > .section")], u = (e) => {
			let t = l[e]?.getBoundingClientRect();
			return t && t.width > 0 ? {
				l: t.left - c.left,
				t: t.top - c.top,
				r: t.right - c.left,
				b: t.bottom - c.top
			} : null;
		}, d = [], f = [], [p, m] = [5, 7], h = (e, t, n, r, i, a, o) => {
			let [s, c] = o ? [p, 0] : [0, p], l = Math.abs(o ? r - t : n - e), u = l >= 2 * m + 2 ? " marker-start=\"url(#cm-arrow)\" marker-end=\"url(#cm-arrow)\"" : "";
			d.push(`<line x1="${e}" y1="${t}" x2="${n}" y2="${r}"${u}/>`, `<line x1="${e - s}" y1="${t - c}" x2="${e + s}" y2="${t + c}"/>`, `<line x1="${n - s}" y1="${r - c}" x2="${n + s}" y2="${r + c}"/>`);
			let [h, g] = [i.length * 6.6 + 14, 16], _ = l >= (o ? g : h) + 2 * m + 6, [v, y] = [(e + n) / 2, (t + r) / 2], [b, x] = _ ? [v, y] : o ? [v + p + 4 + h / 2, y] : [v, y - p - 4 - g / 2];
			f.push(`<button class="cm-chip cm-mono" ${a} style="left:${b}px;top:${x}px">${i}</button>`);
		}, g = (e) => `${Math.round(e)} px`, _ = (e, t, n) => Math.round(e + n * (t - e)), v = /* @__PURE__ */ new Map();
		n.forEach((e, t) => {
			e && e.place !== "main" && r.places[t] && u(t) && v.set(`${e.layer}.${e.place}`, [...v.get(`${e.layer}.${e.place}`) ?? [], t]);
		});
		for (let [e, t] of v) {
			let [n, i] = e.split("."), a = q(this.cmLayout, Number(n))[i] ?? {}, o = i === "top" || i === "bottom", s = Math.max(...t.map((e) => r.places[e].rect[o ? 3 : 2])), c = la(a, i), l = c ? `${c} · ${g(s)}` : g(s), d = t.map(u).reduce((e, t) => ({
				l: Math.min(e.l, t.l),
				t: Math.min(e.t, t.t),
				r: Math.max(e.r, t.r),
				b: Math.max(e.b, t.b)
			})), f = `title="How ${o ? "tall" : "wide"} the ${Number(n) > 1 ? `layer ${n} ` : ""}${i} edge is: as its cards, or a size"`;
			o ? h(_(d.l, d.r, .92), d.t, _(d.l, d.r, .92), d.b, l, `data-depth="${e}" ${f}`, !0) : h(d.l, _(d.t, d.b, .92), d.r, _(d.t, d.b, .92), l, `data-depth="${e}" ${f}`, !1);
		}
		for (let e of i) {
			let [t, n, r, i] = this.cmGapRect(e, a, o), s = `data-gap="${e.id}" title="This gap: its size, or every gap's; or add a line in it"`;
			e.across ? h(_(t, t + r, .3), n, _(t, t + r, .3), n + i, `gap ${e.size}`, s, !0) : h(t, _(n, n + i, .3), t + r, _(n, n + i, .3), `gap ${e.size}`, s, !1);
		}
		let [y, b, x, S] = r.inset, [C, w] = [c.width, c.height], T = (e, t) => `data-margin="${e}" title="The margin ${t}: this side, or every side"`;
		h(_(0, C, .3), -y, _(0, C, .3), 0, `margin ${y}`, T("top", "below the header"), !0), h(_(0, C, .3), w, _(0, C, .3), w + x, `margin ${x}`, T("bottom", "above the footer"), !0), h(-S, _(0, w, .3), 0, _(0, w, .3), `margin ${S}`, T("left", "against the screen's left"), !1), h(C, _(0, w, .3), C + b, _(0, w, .3), `margin ${b}`, T("right", "against the screen's right"), !1), r.places.forEach((e, t) => {
			let n = e && u(t);
			if (!n) return;
			let [r, i, a, o] = Xi(this.cmSections[t]?.view_layout?.padding), s = `data-n="${t}" title="Its padding, round its cards: in its options"`;
			r && h(_(n.l, n.r, .5), n.t, _(n.l, n.r, .5), n.t + r, `pad ${r}`, s, !0), a && h(_(n.l, n.r, .5), n.b - a, _(n.l, n.r, .5), n.b, `pad ${a}`, s, !0), o && h(n.l, _(n.t, n.b, .5), n.l + o, _(n.t, n.b, .5), `pad ${o}`, s, !1), i && h(n.r - i, _(n.t, n.b, .5), n.r, _(n.t, n.b, .5), `pad ${i}`, s, !1);
		});
		let E = e.getRootNode().querySelector("hui-view-header")?.getBoundingClientRect();
		if (E && E.height > 0) {
			let e = ha(this.cmLayout), t = Math.round(E.left - c.left + .92 * E.width);
			h(t, E.top - c.top, t, E.top - c.top + e, `space ${e}`, "data-n=\"header\" title=\"The space above the header\"", !0);
		}
		r.places.forEach((e, t) => {
			let n = e && u(t);
			n && f.push(`<button class="cm-chip cm-mono cm-quiet cm-size" data-n="${t}" title="Its size on the screen, out of edit mode; its options" style="left:${n.r - 6}px;top:${n.b - 6}px">${Math.round(e.rect[2])} × ${Math.round(e.rect[3])}</button>`);
		});
		let D = `<svg><defs><marker id="cm-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>${d.join("")}</svg>${f.join("")}`;
		s.dataset.html !== D && ([s.innerHTML, s.dataset.html] = [D, D]);
	}
	cmEditMarks(t, n, r, i) {
		if (!n) return t.querySelector(":scope > .cm-ends")?.remove();
		let a = this.cmOverlay(t, "cm-ends"), o = t.getRootNode(), s = t.getBoundingClientRect(), c = [];
		for (let e of ["header", "footer"]) {
			let t = o.querySelector(`hui-view-${e}`)?.getBoundingClientRect(), n = e === "header" ? "The header: the space above it, and HA's own editor for the rest" : "The footer: take space under the panels or float over them, and HA's own editor";
			t && t.height > 0 && c.push(`<button class="cm-chip cm-on" data-end="${e}" title="${n}" style="left:${Math.round(t.left - s.left + 10)}px;top:${Math.round(t.top - s.top + 6)}px">${e}</button>`);
		}
		for (let e of i) {
			let [t, n] = [Math.round((e.x1 + e.x2) / 2), Math.round((e.y1 + e.y2) / 2)];
			c.push(`<button class="cm-chip cm-on cm-line" data-line="${e.id}" title="This line: its width, colour, style, knock and ends, or remove it" style="left:${t}px;top:${n}px">line</button>`);
		}
		let l = [...t.querySelectorAll(":scope > .section")], u = (e) => {
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
		for (let t = 1; t <= f; t++) for (let n of ["top", "bottom"]) {
			let i = d(r.flatMap((e, r) => e && e.layer === t && e.place === n ? [r] : []));
			if (!i) continue;
			let a = Math.round((i.t + i.b) / 2);
			for (let r of ["left", "right"]) {
				let o = `anchor_${r}`, s = !!(q(this.cmLayout, t)[n]?.[o] ?? e.panels[n][o]), l = Math.round(r === "left" ? i.l : i.r), u = `${t > 1 ? `Layer ${t} ` : ""}${n} edge to the ${r} side: ${s ? "on" : "off"}`, d = `${t > 1 ? `Layer ${t}'s ` : "The "}${n} edge ${s ? "runs" : "stops short of the side panel; click to run it"} to the ${r} side${s ? ", over the side panel; click to stop it short" : ""}`;
				c.push(`<button class="cm-chip cm-icon cm-lock ${s ? "cm-on" : ""}" data-lock="${t}.${n}.${r}" aria-label="${u}" title="${d}" style="left:${l}px;top:${a}px"><svg viewBox="0 0 24 24"><path d="${s ? ya : ba}"/></svg></button>`);
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
		let a = n[r], o = Bi(n, r), s = o.indexOf(r), c = a.place === "top" || a.place === "bottom", l = ia(n), u = a.place !== "main" && q(this.cmLayout, a.layer)[a.place]?.hidden, d = a.place === "main" && l > 1 ? `Main · ${l} layers` : `${Hi(n, r)}${u ? " · hidden" : ""}`, f = a.place === "main" ? "The main panel: its padding, and the main panel's shape; add or remove a layer" : `${Hi(n, r)}: its own options, and its whole edge's`, [p, m] = c ? ["left", "right"] : ["up", "down"], h = `<button class="cm-chip cm-on cm-name" data-act="options" title="${f}">${d}</button>` + (a.place === "main" ? l < 2 ? "<button class=\"cm-chip cm-on cm-tool\" data-act=\"add\" aria-label=\"Add a layer\" title=\"Add a layer inside this one: its four edges, a panel each\">+</button>" : "" : "<button class=\"cm-chip cm-on cm-tool\" data-act=\"add\" aria-label=\"Add a panel\" title=\"Add a panel after this one, in its edge\">+</button>" + (o.length > 1 ? `<button class="cm-chip cm-on cm-tool" data-act="back" aria-label="Move earlier" title="Move it ${p}, along its edge" ${s === 0 ? "disabled" : ""}>${c ? "←" : "↑"}</button><button class="cm-chip cm-on cm-tool" data-act="on" aria-label="Move later" title="Move it ${m}, along its edge" ${s === o.length - 1 ? "disabled" : ""}>${c ? "→" : "↓"}</button>` : ""));
		i.dataset.html !== h && ([i.innerHTML, i.dataset.html] = [h, h]), i.dataset.n = String(r);
		let g = e.querySelector("hui-section-edit-mode"), _ = 18 + (g?.shadowRoot?.querySelector(".section-actions")?.offsetWidth ?? 0);
		i.classList.remove("cm-narrow"), i.classList.toggle("cm-narrow", i.scrollWidth > e.clientWidth - _);
		let v = i.querySelector(".cm-name")?.offsetWidth ?? 0, y = g?.shadowRoot?.querySelector(".section-wrapper"), b = y && getComputedStyle(y), x = b ? [
			"paddingLeft",
			"paddingRight",
			"borderLeftWidth",
			"borderRightWidth"
		].reduce((e, t) => e + (parseFloat(b[t]) || 0), 0) : 0, S = parseFloat(getComputedStyle(e).getPropertyValue("--row-height")) || ga;
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
o().then((e) => {
	class t extends Ka(Ga(ka(e))) {
		cmPlace() {
			let e = this.shadowRoot, t = e?.querySelector(".content");
			if (!t) return;
			let r = !!this.lovelace?.editMode, i = Ta(this.clientWidth, Sa(this.cmLayout), this.cmNarrow);
			i !== this.cmNarrow && this.cmToNarrow(i), this.cmBar(r && !i), this.toggleAttribute("cm-footer-float", this.cmLayout.footer === "float");
			let a = e.querySelector("hui-view-header"), o = this.cmLayout.header_space === void 0 ? void 0 : ha(this.cmLayout);
			a?.style.setProperty("padding-top", o === void 0 || i ? "" : `${o}px`);
			let s = this.sections.map((e, t) => Ri(this.cmSections[t], t));
			if (i) return this.cmNarrowPlace(t, s, r);
			let c = this.cmSeenOut, [l, u] = r && c.shown ? [c.shown[0], c.shown[1] + (c.top === void 0 ? 0 : c.top - ha(this.cmLayout))] : this.cmArea();
			r || (this.cmSeenOut.shown = [l, u], this.cmSeenOut.top = a && !a.hidden ? ha(this.cmLayout) : void 0);
			let d = this.cmSections.findIndex((e, t) => Ri(e, t)?.place === "main"), f = r && !(this.cmSections[d]?.cards?.length > 0), [p, m] = f ? this.cmArea() : [l, u], h = (e) => {
				let t = s[e];
				return t.place === "top" || t.place === "bottom" ? Gi(q(this.cmLayout, t.layer), t.place) : t.place !== "main" && Bi(s, e).length > 1 && this.cmSections[e]?.view_layout?.length !== "fill";
			}, g = s.map((e, t) => e ? {
				...e,
				shows: this.cmShows(t, e, r),
				...this.cmLock(this.cmSections[t], e.place),
				...this.cmCards(t, e, l)
			} : null), _ = aa(this.cmLayout, [p, m], r, g, this.cmColumns, f);
			this.cmBoxes = _.boxes;
			let v = r ? aa(this.cmLayout, [l, u], !1, g, this.cmColumns) : _, y = _.inset.map((e) => `${e}px`).join(" "), b = _.inset.some(Boolean);
			t.style.inset = r ? "" : y, t.style.margin = r && b ? y : "", t.style.width = r && !f && (_.canvas[0] !== p || b) ? `${_.canvas[0]}px` : "", t.style.height = f ? `${_.canvas[1]}px` : "", t.style.gridTemplateColumns = _.columns, t.style.gridTemplateRows = _.rows;
			let x = [...e.querySelectorAll(".content > .section")];
			if (x.forEach((e, t) => {
				let i = _.places[t] ?? null;
				e.classList.toggle("cm-off", !i), e.classList.toggle("cm-hidden", r && !!i && !!s[t] && !!q(this.cmLayout, s[t].layer)[s[t].place]?.hidden);
				let a = this.cmSections[t]?.cards ?? [];
				e.classList.toggle("cm-garnish-only", r && !!i && !!s[t] && a.length > 0 && (!a.some(Ai) || Di(a))), this.cmTools(e, r && !!i, s, t);
				let o = !!s[t] && s[t].place !== "main" && Bi(s, t).length > 1;
				if (e.querySelector("hui-section-edit-mode")?.toggleAttribute("cm-deletable", r && o), this.cmFill(this.sections[t], r || !s[t] || h(t) ? [] : this.cmCounting(t)), this.cmGrid(this.sections[t], i && g[t] ? this.cmGridColumns(t, g) : null), this.cmGarnish(t, !1), !i) return;
				let c = s[t] ? fa(this.cmSections[t]?.view_layout?.padding) : [
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
			return (this.sections[e]?._cards ?? []).filter((e) => Ai(e.config ?? { type: "" }) && !e.hidden);
		}
		cmShows(e, t, n) {
			let r = this.sections[e];
			return !r || r.hidden ? !1 : n || q(this.cmLayout, t.layer)[t.place]?.hide_empty === !1 ? !0 : this.cmCounting(e).length > 0 && !Di(this.cmSections[e]?.cards);
		}
		cmGarnish(e, t) {
			for (let n of this.sections[e]?._cards ?? []) n.toggleAttribute("cm-garnish", t && !Ai(n.config ?? { type: "" }));
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
				let a = t[i], o = r || !!a && !q(this.cmLayout, a.layer)[a.place]?.hidden && this.cmShows(i, a, !1);
				for (let t of [
					"cm-off",
					"cm-hidden",
					"cm-garnish-only"
				]) e.classList.remove(t);
				e.querySelector("hui-section-edit-mode")?.removeAttribute("cm-deletable"), this.cmTools(e, !1, t, i), this.cmFill(this.sections[i], []), this.cmGrid(this.sections[i], null), this.cmGarnish(i, !r), Object.assign(e.style, {
					...n,
					order: wa(a?.place),
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
	c("casa-mia-tablet-layout", t), c("casa-mia-tablet-view", class extends t {});
});
//#endregion
//#region src/view/patches.ts
var qa = new CSSStyleSheet();
qa.replaceSync(".handle, ha-dropdown-item[value=\"duplicate\"], :host(:not([cm-deletable])) ha-dropdown-item[value=\"delete\"], :host(:not([cm-deletable])) wa-divider { display: none; }\n  /* Its frame fills the panel's room, as the panel does out of edit mode (not only its cards' height). */\n  :host { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }\n  .section-wrapper { flex: 1 1 auto; box-sizing: border-box; }"), customElements.whenDefined("hui-section-edit-mode").then(() => {
	let e = customElements.get("hui-section-edit-mode").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		for (let e = this; e; e = e.parentElement ?? (e.getRootNode().host || null)) if (Ya.some((t) => e.tagName === t.slice(7).toUpperCase())) {
			let e = this.shadowRoot;
			e && !e.adoptedStyleSheets.includes(qa) && (e.adoptedStyleSheets = [...e.adoptedStyleSheets, qa]);
			return;
		}
	};
});
var Ja = "custom:casa-mia-tablet-layout", Ya = [Ja, "custom:casa-mia-tablet-view"];
customElements.whenDefined("hui-view-editor").then(() => {
	let e = customElements.get("hui-view-editor").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		let n = this._schema;
		typeof n == "function" && (this._schema = (...e) => n(...e).map((e) => {
			if (e.name === "section_specifics" && Ya.includes(this._config?.type)) return {
				...e,
				visible: void 0,
				schema: e.schema.filter((e) => e.name !== "dense_section_placement")
			};
			let t = e.name === "type" ? e.selector?.select?.options : void 0;
			return !t || t.some((e) => e.value === Ja) ? e : {
				...e,
				selector: { select: {
					...e.selector.select,
					options: [...t, {
						value: Ja,
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
			n.set.call(this, Ya.includes(e?.type) && e.max_columns === void 0 ? {
				...e,
				max_columns: 4
			} : e);
		}
	});
	let r = e._valueChanged;
	e._valueChanged = function(e) {
		let t = e.detail?.value;
		if (!Ya.includes(t?.type)) return r.call(this, e);
		let n = new Proxy(t, { deleteProperty: (e, t) => t === "max_columns" || t === "top_margin" || Reflect.deleteProperty(e, t) });
		return r.call(this, new CustomEvent(e.type, { detail: { value: n } }));
	};
}), customElements.whenDefined("hui-dialog-edit-view").then(() => {
	let e = customElements.get("hui-dialog-edit-view").prototype, t = Object.getOwnPropertyDescriptor(e, "_type");
	t?.get && Object.defineProperty(e, "_type", {
		...t,
		get() {
			return Ya.includes(this._config?.type) ? "sections" : t.get.call(this);
		}
	});
});
//#endregion
//#region src/garnish-sections.ts
var Xa = !1, Za = /* @__PURE__ */ new Set(), Qa = () => Xa;
customElements.whenDefined("hui-section").then(() => {
	let e = customElements.get("hui-section").prototype, t = e._updateVisibility;
	if (typeof t != "function" || typeof e._setElementVisibility != "function") {
		console.warn("CASA-MIA CARDS: garnish on all section dashboards: this Home Assistant's sections changed; not available");
		return;
	}
	e._updateVisibility = function(...e) {
		if (this.cmContentHidden = !1, t.apply(this, e), Za.size > 200) for (let e of Za) e.isConnected || Za.delete(e);
		Za.add(this), !(this.hidden || this.preview || !this._config || Mi(this)) && (Di(this._config.cards) || Xa && ji([
			...this._cards ?? [],
			...this._badges ?? [],
			...this._sections ?? []
		])) && (this.cmContentHidden = !0, this._setElementVisibility(!1));
	};
});
function $a(e) {
	if (e !== Xa) {
		Xa = e, console.info(`CASA-MIA CARDS: garnish on all section dashboards ${e ? "on" : "off"}`);
		for (let e of Za) e.isConnected ? e._updateVisibility() : Za.delete(e);
	}
}
hi("garnish on all section dashboards", ({ conn: e }) => e.subscribeMessage((e) => $a(!!e?.dashboards?.garnish_everywhere), { type: "casa_mia/settings/subscribe" }).catch(() => $a(yi)));
//#endregion
//#region src/garnish-editor.ts
var eo = "M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z", to = {
	content: "Content: while this card shows, its panel shows. Tap to make it garnish.",
	garnish: "Garnish: adornment, like a heading, that never holds its panel open; the panel hides when only garnish is left. Tap to make it content."
}, no = new CSSStyleSheet();
no.replaceSync(`${Tr}
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
		let r = n.querySelector(".cm-garnish"), i = Qa() || Mi(this), a = Ii(this.path ?? []), o = ((e) => a.reduce((e, t) => e?.[t], e))(this.lovelace?.config);
		if (!i || !this.lovelace?.editMode || this.noEdit || !a.includes("sections") || !o?.type || o.type === "custom:casa-mia-over-layer") return this.classList.remove("cm-garnished"), n.querySelector(".cm-garnish-frame")?.remove(), r?.remove();
		n.adoptedStyleSheets.includes(no) || (n.adoptedStyleSheets = [...n.adoptedStyleSheets, no]), r || (r = document.createElement("button"), r.type = "button", r.className = "cm-garnish cm-chip cm-icon", r.innerHTML = `<svg viewBox="0 0 24 24"><path d="${eo}"/></svg>`, r.addEventListener("pointerdown", (e) => e.stopPropagation()), r.addEventListener("click", async (e) => {
			e.stopPropagation(), r.disabled = !0;
			try {
				let e = structuredClone(this.lovelace.config), t = Ii(this.path), n = t.slice(0, -1).reduce((e, t) => e[t], e), r = t[t.length - 1], i = Ai(n[r]);
				n[r] = Fi(n[r], i), await this.lovelace.saveConfig(e), console.info(`CASA-MIA CARDS: panel card marked ${i ? "Garnish" : "Content"}`);
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
		let s = !Ai(o);
		r.setAttribute("aria-pressed", String(s)), r.classList.toggle("cm-on", s), r.title = to[s ? "garnish" : "content"], r.setAttribute("aria-label", r.title), this.classList.toggle("cm-garnished", s);
		let c = n.querySelector(".cm-garnish-frame");
		s && !c ? (c = document.createElement("div"), c.className = "cm-garnish-frame", n.append(c)) : s || c?.remove();
	};
});
//#endregion
//#region src/screen-condition.ts
var ro = [{
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
function io(e = "") {
	let t = e.split(",").map((e) => e.trim().match(/^(?:(.+) and )?\(orientation:\s*(portrait|landscape)\)$/)), n = t[0]?.[2];
	return !n || t.some((e) => !e || e[2] !== n) || t.length > 1 && t.some((e) => !e?.[1]) ? {
		width: e,
		orientation: "any"
	} : {
		width: t.map((e) => e[1] ?? "").join(", "),
		orientation: n
	};
}
function ao(e, t = "any") {
	if (t === "any") return e;
	let n = `(orientation: ${t})`;
	return e ? e.split(",").map((e) => `${e.trim()} and ${n}`).join(", ") : n;
}
var oo = window;
if (!oo.cmScreenOrientation) {
	oo.cmScreenOrientation = !0;
	let e = !1;
	customElements.whenDefined("ha-card-condition-screen").then(() => {
		let n = customElements.get("ha-card-condition-screen"), i = n.prototype, a = i.render, o = i._valueChanged, s = n.validateUIConfig;
		if (typeof a != "function" || typeof o != "function" || typeof s != "function") {
			r("screen orientation: Home Assistant's screen editor changed; not available");
			return;
		}
		n.validateUIConfig = function(t, n) {
			let r = e ? io(t.media_query).width : t.media_query;
			return s.call(this, {
				...t,
				media_query: r
			}, n);
		}, i.render = function() {
			if (!e) return a.call(this);
			let { width: n, orientation: r } = io(this.condition.media_query), i = Object.create(this, { condition: { value: {
				...this.condition,
				media_query: n
			} } });
			return z`${a.call(i)}
        <ha-form
          style="display: block; margin-top: 16px"
          .hass=${this.hass}
          .data=${{ orientation: r }}
          .schema=${ro}
          .disabled=${this.disabled}
          .computeLabel=${() => "Orientation"}
          .computeHelper=${() => "The selected screen widths must also match this orientation. Leave widths unselected for any width."}
          @value-changed=${(r) => {
				r.stopPropagation(), e && t(this, "value-changed", { value: {
					...this.condition,
					media_query: ao(n, r.detail.value.orientation)
				} });
			}}
        ></ha-form>`;
		}, i._valueChanged = function(t) {
			if (!e) return o.call(this, t);
			let { orientation: n } = io(this.condition.media_query), r = Object.create(this, { dispatchEvent: { value: (e) => (e.detail.value = {
				...this.condition,
				...e.detail.value,
				media_query: ao(e.detail.value.media_query, n)
			}, this.dispatchEvent(e)) } });
			return o.call(r, t);
		};
	}), hi("screen orientation conditions", ({ conn: t }) => t.subscribeMessage((t) => {
		let n = !!t?.dashboards && t.dashboards.screen_orientation !== !1;
		n !== e && console.info(`CASA-MIA CARDS: screen orientation conditions ${n ? "on" : "off"}`), e = n;
	}, { type: "casa_mia/settings/subscribe" }).catch((t) => {
		e = yi, yi || console.warn("CASA-MIA CARDS: screen orientation settings unavailable", t);
	}));
}
//#endregion
//#region src/anchor-grid.ts
var so = class extends V {
	constructor(...e) {
		super(...e), this.value = "center", this.label = "", this.rows = 3;
	}
	static {
		this.properties = {
			value: {},
			label: {},
			rows: { type: Number }
		};
	}
	render() {
		return z`<div class="anchors" role="radiogroup" aria-label=${this.label}>
      ${xi.map((e, n) => e.map((e) => z`<button
              type="button"
              role="radio"
              aria-checked=${e === this.value}
              aria-label=${e}
              title=${e}
              class=${e === this.value ? "on" : ""}
              ?disabled=${n >= this.rows}
              @click=${() => t(this, "anchor-changed", { value: e })}
            ></button>`))}
    </div>`;
	}
	static {
		this.styles = R`
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
  `;
	}
}, co = "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z", lo = 4e3, uo = "\n  .lid { position: fixed; z-index: 8; transition: opacity 0.3s; cursor: pointer; }\n  .lid::after { content: \"\"; position: absolute; inset: 0; border-radius: 50%; pointer-events: none; animation: cm-door 2.4s ease-out infinite; }\n  .lid.open { opacity: 0; pointer-events: none; }\n  .lid.open::after { animation: none; }\n  @keyframes cm-door {\n    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-color, #03a9f4) 45%, transparent); }\n    70%, 100% { box-shadow: 0 0 0 8px transparent; }\n  }\n  @media (prefers-reduced-motion: reduce) { .lid::after { animation: none; } }\n";
function fo(e) {
	for (let t = e; t; t = t.parentElement ?? (t.getRootNode().host || null)) {
		if (t.tagName !== "HUI-ROOT") continue;
		let e = t.shadowRoot;
		return [...e?.querySelectorAll("ha-icon-button[slot=\"actionItems\"]") ?? []].find((e) => e.path === co) ?? e?.querySelector("#dashboardmenu") ?? null;
	}
	return null;
}
function po(e, t, n, r, i, a) {
	return `path(evenodd, "M0 0 H${e} V${t} H0 Z M${n} ${r} h${i} v${a} h${-i} Z")`;
}
function mo(e) {
	let [t, n] = [Math.floor(e.left), Math.floor(e.top)];
	return [
		t,
		n,
		Math.ceil(e.right) - t,
		Math.ceil(e.bottom) - n
	];
}
var ho = class {
	constructor(e) {
		this.shut = 0, this.lid = document.createElement("div"), this.lid.className = "lid", this.lid.hidden = !0, e.append(this.lid), this.lid.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && this.open()), this.lid.addEventListener("pointerdown", (e) => {
			if (e.preventDefault(), e.pointerType === "mouse") return this.open();
			this.open(), clearTimeout(this.shut), this.shut = window.setTimeout(() => this.close(), lo);
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
		let [i, a, o, s] = mo(r);
		for (let t of e) {
			let e = t.getBoundingClientRect();
			t.style.clipPath = po(e.width, e.height, i - e.left, a - e.top, o, s);
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
function go(e) {
	for (let t = e; t; t = t.parentElement ?? (t.getRootNode().host || null)) if (t.tagName === "HUI-VIEW") return t;
	return null;
}
function _o(e) {
	let t = [];
	for (let n = e; n; n = n.parentElement ?? (n.getRootNode().host || null)) n.tagName === "HUI-SECTION" && t.push(n);
	return t;
}
function vo(e) {
	return _o(e).some((e) => e.hasAttribute("hidden") && !e.cmContentHidden);
}
var yo = `
  /* Cut off from the page's styles, but not its typography: all: initial alone sets the
     font to the browser's default (Times), so a card on the layer lost Home Assistant's. */
  :host { all: initial; font: inherit; color: inherit; -webkit-font-smoothing: inherit; }
  .layer { position: fixed; z-index: 7; display: flex; box-sizing: border-box; pointer-events: none; }
  .layer.scroll { position: absolute; }
  .backdrop { position: absolute; inset: 0; }
  .holder { position: relative; box-sizing: border-box; width: 100%; }
  .layer.full .holder { height: 100%; }
  .layer.full .holder > * { height: 100%; }
${uo}`, bo = class extends V {
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
		let e = _o(this), t = () => this._checkSections();
		for (let n of e) n.addEventListener("section-visibility-changed", t);
		this._unwatchSections = () => e.forEach((e) => e.removeEventListener("section-visibility-changed", t)), this._place();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unwatchSections?.(), this._takeDown();
	}
	_checkSections() {
		let e = vo(this);
		e !== this._sectionOff && (this._sectionOff = e, console.info(`CASA-MIA CARDS: over layer: a section round it is ${e ? "hidden by its own Visibility: down" : "shown again: up"}`), this._place());
	}
	_setEditing(e) {
		e !== this._editing && (this._editing = e, this._place());
	}
	_makePanel() {
		let e = _o(this)[0];
		if (!e?.config) return;
		let t = document.createElement("hui-section"), { visibility: n, ...r } = e.config;
		t.hass = this._hass, t.lovelace = e.lovelace, t.index = e.index, t.viewIndex = e.viewIndex, t.preview = !1, t.config = {
			...r,
			cards: (r.cards ?? []).filter((e) => e?.type !== wi)
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
		if (!this.isConnected || this._editing || !this._config || S(this) || (this._sectionOff = vo(this))) {
			this._takeDown(), this.requestUpdate();
			return;
		}
		this._host || this._putUp(), this._style();
	}
	_putUp() {
		this._host = document.createElement("casa-mia-over-layer-host");
		let e = this._host.attachShadow({ mode: "open" });
		e.innerHTML = `<style>${yo}</style><div class="layer"><div class="backdrop"></div><div class="holder"></div></div>`, this._layer = e.querySelector(".layer"), this._config?.panel && this._makePanel(), this._child && this._layer.querySelector(".holder").append(this._child), this._door = new ho(e);
		let t = document.querySelector("home-assistant")?.shadowRoot;
		t || console.warn("CASA-MIA CARDS: over layer: no <home-assistant> found; taps on its cards may do nothing"), (t ?? document.body).append(this._host);
		let n = () => this._style(), r = go(this), i = new ResizeObserver(n);
		r && i.observe(r), addEventListener("resize", n), addEventListener("scroll", n, {
			capture: !0,
			passive: !0
		}), this._watch = () => {
			i.disconnect(), removeEventListener("resize", n), removeEventListener("scroll", n, { capture: !0 });
		}, setTimeout(n, 500), console.info(`CASA-MIA CARDS: over layer shown (${ki(this._config)})`), this.requestUpdate();
	}
	_takeDown() {
		this._host && (this._watch?.(), this._door?.remove(), this._host.remove(), this._host = this._layer = this._watch = this._door = void 0, this._config?.panel && (this._child = void 0), console.info("CASA-MIA CARDS: over layer taken down"));
	}
	_style() {
		if (!this._layer || !this._config) return;
		let e = Ei(this._config), t = this._layer;
		t.className = `layer ${e.mode}`;
		let n = (e.cover === "view" ? go(this) : null)?.getBoundingClientRect();
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
		let c = e.block && e.cover === "window" && !!this._hass?.user?.is_admin, l = Ci(Oi(e.mode, e.anchor));
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
		}), this._door?.place([o, u], c ? fo(this) : null, s);
	}
	render() {
		return this._config ? this.isConnected && S(this) ? z`<div class="sample" aria-label="An Over layer: one card over the dashboard">
        <div class="tiles">${[
			0,
			1,
			2,
			3,
			4,
			5
		].map(() => z`<span></span>`)}</div>
        <div class="veil"></div>
        <div class="over"><strong>Over layer</strong><span>One card over the whole dashboard while its Visibility conditions hold: the alarm set, a visitor, night.</span></div>
      </div>` : this._editing ? this._config.panel ? z`<div class="badge cm-pill cm-accent">${ki(this._config)}</div>` : z`<div class="badge cm-pill cm-accent">${ki(this._config)}</div>
      ${this._child ?? z`<div class="empty">No card yet: pick one in the editor.</div>`}` : B : B;
	}
	static {
		this.styles = [Er, R`
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
}, xo = [
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
], So = [{
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
}], Co = {
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
}, wo = {
	panel: "In place of a card of its own, the layer shows every card in the panel it's in (but Over layers). That panel never shows in its own place out of edit mode; edit its cards there, as usual.",
	block: "On: what's beneath can be seen but not touched; only the card works. Off: taps reach the dashboard round the card."
};
async function To() {
	customElements.get("hui-card-element-editor") && customElements.get("hui-card-picker") || (await (await (await window.loadCardHelpers()).createCardElement({
		type: "conditional",
		conditions: [],
		card: { type: "button" }
	})).constructor.getConfigElement?.(), await customElements.whenDefined("hui-card-element-editor"));
}
var Eo = class extends V {
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
		super.connectedCallback(), Promise.all([a(), To()]).then(() => this._ready = !0);
	}
	_save(e) {
		this._config = e, t(this, "config-changed", { config: F(e, Ti) });
	}
	render() {
		if (!this.hass || !this._config || !this._ready) return B;
		let e = this._config.card;
		return z`
      <ha-form
        .hass=${this.hass}
        .data=${{
			...Ti,
			...this._config
		}}
        .schema=${xo}
        .computeLabel=${(e) => Co[e.name] ?? e.name}
        .computeHelper=${(e) => wo[e.name]}
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
      ${this._config.panel ? B : this._card(e)}
    `;
	}
	_card(e) {
		return z`<h3>Its card</h3>
      ${e?.type ? z`<div class="actions">
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
            ></hui-card-element-editor>` : z`<hui-card-picker
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
			...Ti,
			...this._config
		};
		return e.mode === "full" ? B : z`<h3>Where it sits</h3>
      <div class="where">
        <casa-mia-over-layer-anchors
          label="Where it sits"
          .value=${Oi(e.mode, e.anchor)}
          .rows=${e.mode === "scroll" ? 1 : 3}
          @anchor-changed=${(e) => {
			e.stopPropagation(), this._save({
				...this._config,
				anchor: e.detail.value
			});
		}}
        ></casa-mia-over-layer-anchors>
        <ha-form
          .hass=${this.hass}
          .data=${e}
          .schema=${So}
          .computeLabel=${(e) => Co[e.name] ?? e.name}
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
		this.styles = [Er, R`
    .where {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .where ha-form {
      flex: 1;
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
c("casa-mia-over-layer", bo), c("casa-mia-over-layer-editor", Eo), c("casa-mia-over-layer-anchors", so), l("casa-mia-over-layer", "Casa Mia Over layer", "One card over the whole dashboard while its Visibility conditions hold; what's beneath can be seen but not touched.");
//#endregion
//#region src/qr-code/card.ts
var Do = {
	wifi: !1,
	instructions: !0,
	wifi_details: !0,
	welcome: !1,
	border: !1,
	code_frames: !0
}, Oo = class extends V {
	constructor(...e) {
		super(...e), this._seen = null;
	}
	static {
		this.properties = {
			_config: { state: !0 },
			_found: { state: !0 },
			_problem: { state: !0 }
		};
	}
	static getStubConfig(e) {
		let t = Object.keys(e.entities ?? {}).find((t) => e.entities[t]?.platform === "casa_mia_guest_login" && t.startsWith("switch."));
		return t ? { endpoint: t } : { path: "/lovelace" };
	}
	static getConfigElement() {
		return document.createElement("casa-mia-qr-code-editor");
	}
	setConfig(e) {
		this._config = { ...e }, this._seen = null, this._hass && (this.hass = this._hass);
	}
	set hass(e) {
		this._hass = e;
		let t = this._config;
		if (!t) return;
		let n = t.endpoint ? e.states[t.endpoint] : void 0, r = JSON.stringify([
			t,
			n?.state,
			n?.last_changed
		]);
		r !== this._seen && (this._seen = r, this._ask(e, {
			...Do,
			...t
		}));
	}
	async _ask(e, t) {
		if (!t.endpoint && !t.path && !t.wifi) {
			this._found = void 0, this._problem = "Pick an endpoint or a page, or turn on the Wi-Fi's code.";
			return;
		}
		try {
			this._found = await e.callWS({
				type: "casa_mia_guest_login/qr",
				...t.endpoint ? { entity_id: t.endpoint } : t.path ? { path: t.path } : {},
				wifi: t.wifi,
				...t.caption ? { caption: t.caption } : {},
				welcome: t.welcome,
				border: t.border,
				frame: t.code_frames,
				details: t.wifi_details,
				steps: t.instructions
			}), this._problem = this._found?.error;
		} catch (e) {
			this._found = void 0, this._problem = `Casa Mia isn't answering (${e?.message ?? e}): is Guest login switched on in the app, and the Casa Mia Guest Login integration set up?`, console.warn(`CASA-MIA CARDS: qr code: ${this._problem}`);
		}
	}
	getCardSize() {
		return 5;
	}
	getGridOptions() {
		return {
			columns: this._config?.wifi && (this._config.endpoint || this._config.path) ? 12 : 6,
			rows: "auto"
		};
	}
	render() {
		if (!this._config) return B;
		let e = this._found ?? {};
		return z`<ha-card class=${this._config.border ? "printed" : ""} .header=${this._config.title || void 0}>
      ${this._problem ? z`<p class="note problem">${this._problem}</p>` : B}
      ${e.wifi_error ? z`<p class="note">${e.wifi_error} (Casa Mia → Guest login → QR codes → Wi-Fi)</p>` : B}
      ${e.svg ? z`<img src=${`data:image/svg+xml,${encodeURIComponent(e.svg)}`} alt="QR code" />` : B}
    </ha-card>`;
	}
	static {
		this.styles = R`
    ha-card {
      overflow: hidden;
    }
    ha-card.printed {
      background: none;
      border: none;
      box-shadow: none;
    }
    img {
      display: block;
      width: 100%;
    }
    .note {
      margin: 8px;
      color: var(--secondary-text-color);
    }
    .problem {
      color: var(--error-color);
    }
  `;
	}
};
//#endregion
//#region src/qr-code/editor.ts
function ko(e) {
	return Object.entries(e.entities ?? {}).filter(([e, t]) => t.platform === "casa_mia_guest_login" && e.startsWith("switch.")).map(([t, n]) => {
		let r = e.devices?.[n.device_id];
		return {
			value: t,
			label: r?.name_by_user || r?.name || e.states[t]?.attributes?.friendly_name || t
		};
	}).sort((e, t) => e.label.localeCompare(t.label));
}
var Ao = (e) => [
	{
		name: "title",
		selector: { text: {} }
	},
	{
		name: "endpoint",
		selector: { select: {
			mode: "dropdown",
			options: [{
				value: "",
				label: "None"
			}, ...ko(e)]
		} }
	},
	{
		name: "path",
		selector: { navigation: {} }
	},
	{
		name: "wifi",
		selector: { boolean: {} }
	},
	{
		name: "caption",
		selector: { text: {} }
	},
	{
		name: "instructions",
		selector: { boolean: {} }
	},
	{
		name: "wifi_details",
		selector: { boolean: {} }
	},
	{
		name: "welcome",
		selector: { boolean: {} }
	},
	{
		name: "border",
		selector: { boolean: {} }
	},
	{
		name: "code_frames",
		selector: { boolean: {} }
	}
], jo = {
	title: "Title",
	endpoint: "Guest login endpoint",
	path: "Or a page",
	wifi: "The Wi-Fi's code beside it",
	caption: "Caption",
	instructions: "Show instructions",
	wifi_details: "Write out the network and password",
	welcome: "The welcome title on top",
	border: "A black border round the card, as printed",
	code_frames: "A black frame round each code"
}, Mo = {
	endpoint: "Its code shows while the endpoint is open, and scanning it signs the visitor in.",
	path: "Used when no endpoint is picked. A plain link to the page: it signs nobody in, so it's for phones already signed in.",
	wifi: "The network saved in Casa Mia's Guest login (QR codes → Wi-Fi), first, so a phone joins before it signs in. With no endpoint or page, the Wi-Fi's code alone.",
	caption: "Under the code. Empty: the endpoint's name, or the page's path.",
	instructions: "The steps (Join the Wi-Fi, Scan to sign in) and the name under the code. Off, with nothing else on, the code alone fills the card. Their words: Casa Mia → Guest login → QR codes → Words.",
	wifi_details: "Under the Wi-Fi's code, for anyone who'd rather type them.",
	welcome: "Guest login's welcome title (Welcome to …), or the endpoint's own."
}, No = class extends V {
	constructor(...e) {
		super(...e), this._ready = !1;
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			_config: { state: !0 },
			_ready: { state: !0 }
		};
	}
	setConfig(e) {
		this._config = e;
	}
	connectedCallback() {
		super.connectedCallback(), a().then(() => this._ready = !0);
	}
	render() {
		return !this.hass || !this._config || !this._ready ? B : z`<ha-form
      .hass=${this.hass}
      .data=${{
			...Do,
			...this._config
		}}
      .schema=${Ao(this.hass)}
      .computeLabel=${(e) => jo[e.name] ?? e.name}
      .computeHelper=${(e) => Mo[e.name]}
      @value-changed=${(e) => {
			e.stopPropagation();
			let n = {
				...this._config,
				...e.detail.value
			};
			for (let e of [
				"title",
				"endpoint",
				"path",
				"caption"
			]) n[e] || delete n[e];
			this._config = n, t(this, "config-changed", { config: F(n, Do) });
		}}
    ></ha-form>`;
	}
};
c("casa-mia-qr-code", Oo), c("casa-mia-qr-code-editor", No), l("casa-mia-qr-code", "Casa Mia QR code", "A guest login endpoint's QR code while it is open, or any page's, with the Wi-Fi's beside it if you like.");
//#endregion
//#region node_modules/lit-html/directives/unsafe-html.js
var Po = class extends lt {
	constructor(e) {
		if (super(e), this.it = B, e.type !== st.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
	}
	render(e) {
		if (e === B || e == null) return this._t = void 0, this.it = e;
		if (e === He) return e;
		if (typeof e != "string") throw Error(this.constructor.directiveName + "() called with a non-string value");
		if (e === this.it) return this._t;
		this.it = e;
		let t = [e];
		return t.raw = t, this._t = {
			_$litType$: this.constructor.resultType,
			strings: t,
			values: []
		};
	}
};
Po.directiveName = "unsafeHTML", Po.resultType = 1;
//#endregion
//#region node_modules/lit-html/directives/unsafe-svg.js
var Fo = class extends Po {};
Fo.directiveName = "unsafeSVG", Fo.resultType = 2;
var Io = ct(Fo), Lo = {
	view: "system",
	pipes: "outline",
	markers: "chev",
	colours: "temp",
	readouts: "pill",
	animations: !0,
	area_outside: "Outside",
	area_plant: "Plant room",
	area_house: "House"
}, Ro = (e) => [
	e.floor_1,
	e.floor_2,
	e.floor_3
].filter((e) => !!e && !!(e.name || e.supply || e.return || e.loops?.length || e.rooms?.length)), zo = (e) => e.dhw?.enabled ?? !!(e.dhw?.tank?.length || e.dhw?.coil_in || e.dhw?.hot_plant?.length);
function Bo(e) {
	let t = [], n = (e) => {
		typeof e == "string" && /^[a-z_]+\.[a-z0-9_]+$/.test(e) ? t.push(e) : Array.isArray(e) ? e.forEach(n) : e && typeof e == "object" && Object.entries(e).forEach(([e, t]) => !e.endsWith("_action") && n(t));
	};
	return n({
		...e,
		type: void 0
	}), [...new Set(t)];
}
function Vo(e) {
	let t = Math.max(1, Math.round(e / 6e4));
	if (t < 60) return `${t} min`;
	let n = Math.round(t / 60);
	return n < 48 ? `${n} h` : `${Math.round(n / 24)} days`;
}
var Ho = /* @__PURE__ */ new Set([
	"on",
	"open",
	"opening",
	"true",
	"home",
	"heat",
	"heating",
	"running"
]), Uo = /* @__PURE__ */ new Set([
	"off",
	"closed",
	"closing",
	"false",
	"idle",
	"standby"
]);
function Wo(e, t, n, r) {
	if (!e) return {
		v: NaN,
		unit: "",
		dp: 0,
		e: t,
		stale: "missing"
	};
	let i = e.attributes?.unit_of_measurement ?? "", a = /^°[CF]$/.test(i) ? "°" : i === "%" ? "%" : i ? ` ${i}` : "", o = Date.parse(e.last_changed ?? e.last_updated ?? ""), s = Number.isFinite(o) ? r - o : 0, c = e.state === "unavailable" || e.state === "unknown", l = parseFloat(e.state), u = e.state.toLowerCase(), d = {
		v: Number.isFinite(l) ? l : Ho.has(u) ? 1 : Uo.has(u) ? 0 : NaN,
		unit: a,
		dp: n ?? e.state.split(".")[1]?.length ?? 0,
		e: t
	};
	return Number.isFinite(l) || (d.text = e.state), c && (d.stale = Vo(s)), d;
}
function Go(e) {
	let t = (e ?? "").toLowerCase();
	return !t || t === "unavailable" || t === "unknown" ? "Unknown" : /water|dhw|hot/.test(t) ? "Hot water" : /defrost/.test(t) ? "Defrost" : /cool/.test(t) ? "Cooling" : /heat/.test(t) ? "Heating" : /off|idle|stand|none/.test(t) ? "Off" : e;
}
var Ko = {
	Heating: "#e5443a",
	"Hot water": "#a652d6",
	Off: "#7a8190",
	Defrost: "#2f86e0",
	Cooling: "#2fbfd0"
}, qo = /^(|0|ok|none|off|no alarm|no alarms|normal|false|unavailable|unknown)$/i;
function Jo(e, t, n = Date.now()) {
	let r = {};
	for (let i of Bo(t)) r[i] = Wo(e.states[i], i, e.entities?.[i]?.display_precision, n);
	let i = {};
	for (let n of Ro(t).flatMap((e) => e.rooms ?? [])) {
		let t = e.states[n], a = t?.attributes ?? {};
		t && a.current_temperature != null && r[n].stale == null && (r[n] = {
			...r[n],
			v: Number(a.current_temperature),
			unit: "°",
			dp: 1,
			text: void 0
		}), i[n] = {
			name: a.friendly_name ?? n,
			target: a.temperature != null && Number.isFinite(+a.temperature) ? +a.temperature : null
		};
	}
	let a = (e) => e && r[e] && !r[e].stale && Number.isFinite(r[e].v) ? r[e].v : null, o = (e) => (a(e) ?? 0) > 0, s = t.heat_pump ?? {}, c = t.source ?? {}, l = t.dhw ?? {}, u = t.water ?? {}, d = Go(s.priority ? e.states[s.priority]?.state : void 0), f = s.compressor ? o(s.compressor) : d !== "Off" && d !== "Unknown", p = (e) => !e || o(e), m = (d === "Heating" || d === "Defrost") && p(s.pump), h = d === "Hot water" && p(s.pump), g = c.type !== "air" && c.type !== "none" && (c.pump ? o(c.pump) : f), _ = g && !!c.pvt && o(c.pvt_valve), v = o(l.loop_pump), y = (u.pumps ?? []).some(o), b = !!u.storage && o(u.inlet), x = o(u.meter), S = u.storage ? y : x, C = {
		comp: f,
		heat: m,
		coil: h,
		hp_out: m || h,
		brine: g,
		pvt: _,
		hot: v || S,
		recirc: v,
		soft: S,
		fill: b,
		mains: b || x,
		hard: !!u.storage && x && !b
	};
	for (let e of Ro(t)) for (let t of e.loops ?? []) C[t] = m && o(t);
	let w = s.alarm ? e.states[s.alarm]?.state : void 0;
	return {
		data: r,
		rooms: i,
		flows: C,
		prio: d,
		alarm: w && !qo.test(w.trim()) ? w : null,
		saltLow: !!u.softener && o(u.salt_low)
	};
}
//#endregion
//#region src/heating-flow/engine.ts
var Yo = [
	[-15, "#17171f"],
	[-10, "#2b2475"],
	[-5, "#3b47c9"],
	[5, "#2f86e0"],
	[15, "#2fbfd0"],
	[25, "#43c08a"],
	[35, "#e2c22e"],
	[45, "#f2902a"],
	[55, "#e8492f"],
	[65, "#b31e3d"]
], Xo = {
	brine: "#3b6fe0",
	pvt: "#f0a020",
	heat: "#e5443a",
	dhw: "#a652d6",
	hot: "#d6457f",
	cold: "#38b8e0",
	ref: "#7f8ea6"
}, Zo = "#9aa3b2", Qo = (e) => [
	1,
	3,
	5
].map((t) => parseInt(e.slice(t, t + 2), 16)), $o = (e) => "#" + e.map((e) => Math.round(e).toString(16).padStart(2, "0")).join(""), es = (e, t, n) => $o(Qo(e).map((e, r) => e + (Qo(t)[r] - e) * n));
function ts(e) {
	if (e <= Yo[0][0]) return Yo[0][1];
	for (let t = 1; t < Yo.length; t++) if (e <= Yo[t][0]) {
		let [n, r] = Yo[t - 1], [i, a] = Yo[t];
		return es(r, a, (e - n) / (i - n));
	}
	return Yo[Yo.length - 1][1];
}
var Y = (e) => String(e ?? "").replace(/[&<>"']/g, (e) => `&#${e.charCodeAt(0)};`);
function ns(e, t) {
	let n = [], r = 0;
	for (let t = 1; t < e.length; t++) {
		let [i, a] = e[t - 1], [o, s] = e[t], c = Math.hypot(o - i, s - a);
		n.push({
			ax: i,
			ay: a,
			bx: o,
			by: s,
			L: c,
			s0: r,
			ux: (o - i) / c,
			uy: (s - a) / c,
			k0: 0,
			k1: 0
		}), r += c;
	}
	for (let e = 0; e < n.length - 1; e++) n[e].k1 = n[e + 1].k0 = Math.min(t, n[e].L / 2, n[e + 1].L / 2);
	return {
		segs: n,
		total: r
	};
}
function rs(e, t) {
	let n = e.slice(), r = e.length, i = ([e, n], [r, i]) => {
		let a = Math.hypot(r - e, i - n);
		return [r + (r - e) / a * t, i + (i - n) / a * t];
	};
	return n[0] = i(e[1], e[0]), n[r - 1] = i(e[r - 2], e[r - 1]), n;
}
function is(e) {
	let t = 0;
	return e.forEach((n, r) => {
		if (t += n.L - n.k0 - n.k1, !n.k1) return;
		let i = e[r + 1], a = [n.bx - n.ux * n.k1, n.by - n.uy * n.k1], o = [i.ax + i.ux * i.k0, i.ay + i.uy * i.k0], [s, c] = a;
		for (let e = .1; e <= 1.0001; e += .1) {
			let r = (1 - e) ** 2 * a[0] + 2 * (1 - e) * e * n.bx + e * e * o[0], i = (1 - e) ** 2 * a[1] + 2 * (1 - e) * e * n.by + e * e * o[1];
			t += Math.hypot(r - s, i - c), [s, c] = [r, i];
		}
	}), t;
}
function as(e, [t, n]) {
	for (let r of e) {
		let e = (t - r.ax) * r.ux + (n - r.ay) * r.uy;
		if (e >= -.5 && e <= r.L + .5 && Math.hypot(r.ax + r.ux * e - t, r.ay + r.uy * e - n) < 1) return r.s0 + e;
	}
	return 0;
}
function os(e, t) {
	for (let n of e) if (t <= n.s0 + n.L || n === e[e.length - 1]) {
		let e = Math.min(Math.max(t - n.s0, 0), n.L);
		return {
			x: n.ax + n.ux * e,
			y: n.ay + n.uy * e,
			horiz: Math.abs(n.uy) < 1e-6
		};
	}
	return {
		x: 0,
		y: 0,
		horiz: !0
	};
}
function ss(e, t) {
	if (!e.length) return null;
	if (t <= e[0][0]) return e[0][1];
	for (let n = 1; n < e.length; n++) if (t <= e[n][0]) {
		let [r, i] = e[n - 1], [a, o] = e[n];
		return i + (o - i) * (t - r) / (a - r || 1);
	}
	return e[e.length - 1][1];
}
function cs(e, t, n, r, i) {
	let a = {};
	e.forEach((e) => e.area && (a[e.area] ||= []).push(e));
	let o = {};
	for (let e in a) {
		let r = i.find((t) => t[0] === e), a = Infinity, s = -Infinity;
		for (let e = 0; r && e <= n; e += 2) {
			let n = os(t, e);
			n.x >= r[1] && n.x < r[2] && ([a, s] = [Math.min(a, e), Math.max(s, e)]);
		}
		o[e] = a <= s ? [a, s] : [0, n];
	}
	return e.map((e) => {
		if (e.area) {
			let t = a[e.area], [n, r] = o[e.area];
			return {
				...e,
				s: n + (t.indexOf(e) + 1) * (r - n) / (t.length + 1)
			};
		}
		return {
			...e,
			s: e.at ? as(t, e.at) : (r ? 1 - (e.f ?? 0) : e.f ?? 0) * n
		};
	});
}
//#endregion
//#region src/heating-flow/draw.ts
var ls = class {
	constructor(e, t, n) {
		this.uid = 0, this.areas = [], this.data = e, this.flows = t, this.look = n;
	}
	id(e) {
		return e + this.uid++;
	}
	val(e) {
		let t = e ? this.data[e] : void 0;
		return t && !t.stale && Number.isFinite(t.v) ? t.v : null;
	}
	fmt(e) {
		return e.text ?? e.v.toFixed(e.dp) + e.unit;
	}
	colourOf(e) {
		let t = this.val(e);
		return t == null ? Zo : ts(t);
	}
	tint(e, t, n) {
		let r = this.look.colours === "circuit" ? Xo[n] ?? "#9aa3b2" : this.colourOf(e);
		return this.flows[t] ? r : es(r, Zo, .35);
	}
	bgAt(e) {
		return `var(${(this.areas.find((t) => e < t[2]) ?? this.areas[this.areas.length - 1])?.[4] ?? "--hf-panel"})`;
	}
	pipe(e) {
		let t = e.w ?? 12, { segs: n, total: r } = ns(rs(e.rev ? e.pts.slice().reverse() : e.pts, t / 2), e.r ?? 12), i = cs(e.sensors ?? [], n, r, e.rev, this.areas), a = i.map((e) => [e.s, this.val(e.k)]).filter((e) => e[1] != null).sort((e, t) => e[0] - t[0]), o = !!(e.flow && this.flows[e.flow]), s = (t) => {
			let n = ss(a, t), r = this.look.colours === "circuit" ? Xo[e.circ] ?? "#9aa3b2" : n == null ? Zo : ts(n);
			return o ? r : es(r, Zo, .35);
		}, c = (e) => {
			let t = this.look.colours === "temp" ? ss(a, e) : null, n = Math.round(t == null ? 32 : 32 + 68 * Math.min(1, Math.max(0, (-5 - t) / 5)));
			return n < 100 ? `color-mix(in srgb, ${s(e)} ${n}%, var(--hf-panel))` : s(e);
		}, l = n.map((e, t) => {
			let r = n[t + 1];
			return {
				s0: e.s0 + e.k0,
				s1: e.s0 + e.L - e.k1,
				end: e.s0 + e.L,
				x0: e.ax + e.ux * e.k0,
				y0: e.ay + e.uy * e.k0,
				x1: e.bx - e.ux * e.k1,
				y1: e.by - e.uy * e.k1,
				bend: e.k1 ? `Q${e.bx} ${e.by} ${r.ax + r.ux * r.k0} ${r.ay + r.uy * r.k0}` : ""
			};
		}), u = `M${n[0].ax} ${n[0].ay}` + l.map((e) => `L${e.x1} ${e.y1}${e.bend}`).join(""), d = "", f = (e = s) => l.map(({ s0: t, s1: n, end: r, x0: i, y0: o, x1: s, y1: c, bend: l }) => {
			let u = "";
			if (n > t + .1) {
				let r = this.id("pg"), l = [
					t,
					...a.map((e) => e[0]).filter((e) => e > t && e < n),
					n
				];
				d += `<linearGradient id="${r}" gradientUnits="userSpaceOnUse" x1="${i}" y1="${o}" x2="${s}" y2="${c}">` + l.map((r) => `<stop offset="${((r - t) / (n - t)).toFixed(4)}" style="stop-color:${e(r)}"/>`).join("") + "</linearGradient>", u += `<path d="M${i} ${o}L${s} ${c}" style="stroke:url(#${r})"/>`;
			}
			return l && (u += `<path d="M${s} ${c}${l}" style="stroke:${e(r)}"/>`), u;
		}).join(""), p = s(r / 2), m = this.look.pipes, h = (e, t, n = "") => `<path d="${u}" fill="none" stroke-width="${e}" style="stroke:${t}" ${n}/>`, g = (e, t = f(), n = "") => `<g fill="none" stroke-width="${e}" ${n}>${t}</g>`, _ = "", v = "";
		m === "outline" && ([_, v] = [h(t + 3, "var(--hf-edge)"), h(t, p) + g(t)]), m === "glass" && ([_, v] = [h(t + 3, p) + g(t + 3), h(t, c(r / 2)) + g(t, f(c))]), (m === "conduit" || m === "neon") && ([_, v] = [h(t + 2, "var(--hf-conduit)"), g(Math.max(3, t * .42), f(), m === "neon" ? `style="filter:drop-shadow(0 0 3px ${p})"` : "")]);
		let y = "";
		if (o) {
			let r = is(n), i = Math.max(1, Math.round(r / 26)), a = this.val(e.speed), o = r / (a == null ? 576 / t : 18 + Math.min(a, 100) * .5), s = m === "glass" ? "var(--hf-edge)" : "#fff", c = t < 12 ? ` transform="scale(${Math.max(.6, t / 12)})"` : "";
			for (let e = 0; e < i; e++) y += `<use href="#mk-${this.look.markers}"${c} style="color:${s}"><animateMotion dur="${o.toFixed(2)}s" begin="-${(o * e / i).toFixed(2)}s" repeatCount="indefinite" rotate="auto" path="${u}"/></use>`;
		}
		let b = (e.hops ?? []).map(([e, n, r]) => `<path d="${r === "h" ? `M${e - t} ${n}H${e + t}` : `M${e} ${n - t}V${n + t}`}" stroke-width="${t + 8}" style="stroke:${this.bgAt(e)}"/>`).join(""), x = i.filter((e) => e.show !== !1).map((e) => {
			let t = os(n, e.s);
			return this.readout(t.x, t.y, e.k, t.horiz);
		}).join(""), S = h(t + 4, "rgba(0,0,0,.18)", "transform=\"translate(0 1)\"");
		return {
			defs: d,
			gap: b,
			outline: _,
			fill: v,
			marks: y,
			pills: x,
			shadow: S
		};
	}
	pipes(e) {
		let t = e.map((e) => ({
			p: e,
			...this.pipe(e)
		})), n = t.filter((e) => !e.p.hops).sort((e, t) => (e.p.z ?? 0) - (t.p.z ?? 0)), r = t.filter((e) => e.p.hops), i = n.map((e) => e.outline).join("") + n.map((e) => e.fill).join("") + n.map((e) => e.marks).join("") + r.map((e) => e.gap + e.outline + e.fill + e.marks).join("");
		return {
			defs: t.map((e) => e.defs).join(""),
			shadow: t.map((e) => e.shadow).join(""),
			body: i,
			pills: t.map((e) => e.pills).join("")
		};
	}
	readout(e, t, n, r = !0) {
		let i = this.data[n];
		if (!i) return "";
		let a = i.stale ? `— ${i.stale}` : this.fmt(i), o = i.stale ? "var(--hf-warn)" : i.unit === "°" && this.look.colours === "temp" ? ts(i.v) : "var(--hf-line)", s = `<title>${Y(i.e)}${i.stale ? `: not current for ${Y(i.stale)}` : ""}</title>`;
		if (this.look.readouts === "pill" || i.stale) {
			let n = Math.max(46, a.length * 6.6 + 14);
			return `<g class="hit" data-e="${Y(i.e)}">${s}<rect class="hl" x="${e - n / 2}" y="${t - 10}" width="${n}" height="20" rx="10" style="fill:var(--hf-panel);stroke:${o}" stroke-width="2"/><text x="${e}" y="${t + 4}" text-anchor="middle" font-size="11" font-weight="700" class="${i.stale ? "w" : "t"}">${Y(a)}</text></g>`;
		}
		let [c, l, u] = r ? [
			e,
			t - 11,
			"middle"
		] : [
			e + 11,
			t + 4,
			"start"
		];
		return `<g class="hit" data-e="${Y(i.e)}">${s}<text x="${c}" y="${l}" text-anchor="${u}" font-size="12" font-weight="700" class="t halo">${Y(a)}</text></g>`;
	}
	row(e, t, n, r, i) {
		let a = this.data[r];
		return a ? `<g class="hit" data-e="${Y(a.e)}"><rect class="hl" x="${e - 4}" y="${t - 13}" width="${i - e + 8}" height="18" rx="4" fill="transparent"/><text x="${e}" y="${t}" font-size="11.5" class="m">${Y(n)}</text><text x="${i}" y="${t}" text-anchor="end" font-size="12" font-weight="700" class="${a.stale ? "w" : "t"}">${Y(a.stale ? "— " + a.stale : this.fmt(a))}</text></g>` : "";
	}
}, us = "\n  <path id=\"mk-chev\" d=\"M-3 -4L2 0L-3 4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  <path id=\"mk-arrow\" d=\"M-6 0H3M0 -3L3.5 0L0 3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  <circle id=\"mk-bub\" r=\"2.1\" fill=\"currentColor\"/>\n  <linearGradient id=\"panelg\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" style=\"stop-color:var(--hf-panel)\"/><stop offset=\"1\" style=\"stop-color:var(--hf-panel2)\"/></linearGradient>\n  <linearGradient id=\"earthg\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" style=\"stop-color:var(--hf-earth1)\"/><stop offset=\".55\" style=\"stop-color:var(--hf-earth2)\"/><stop offset=\"1\" style=\"stop-color:var(--hf-earth3)\"/></linearGradient>\n  <linearGradient id=\"cellg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#4a78c4\"/><stop offset=\"1\" stop-color=\"#1f3f7a\"/></linearGradient>\n  <linearGradient id=\"sheen\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".3\"/><stop offset=\".5\" stop-color=\"#fff\" stop-opacity=\"0\"/></linearGradient>", ds = {
	e: 0,
	s: 90,
	w: 180,
	n: 270
}, X = (e, t, n) => `<g class="hit" data-e="${Y(e ?? "")}"><title>${Y(t)}</title>${n}</g>`;
function fs(e, t, n, r, i, a, [o, s, c], l = !1) {
	let u = e.data[i], d = e.val(i) != null && e.val(i) > 0;
	return X(u?.e, a, (l ? `<circle cx="${t}" cy="${n}" r="22" fill="none" style="stroke:var(--hf-warn)" stroke-width="3" class="pulse"/>` : "") + (d ? `<circle cx="${t}" cy="${n}" r="18" fill="none" style="stroke:var(--hf-run);transform-origin:${t}px ${n}px" stroke-width="2" stroke-dasharray="3 4" class="spin"/>` : "") + `<circle class="hl" cx="${t}" cy="${n}" r="14" style="fill:var(--hf-panel);stroke:var(--hf-edge)" stroke-width="2"/><path d="M-7 -11L13 0L-7 11Z" transform="translate(${t} ${n}) rotate(${ds[r]})" style="fill:${d ? "var(--hf-run)" : "var(--hf-off)"};stroke:var(--hf-edge)" stroke-width="1.5" stroke-linejoin="round"/><text x="${o}" y="${s}" text-anchor="${c}" font-size="10.5" class="m halo">${Y(a)} · ${u?.stale ? "— " + Y(u.stale) : d && u?.unit ? Y(e.fmt(u)) : d ? "on" : "off"}</text>`);
}
function ps(e, t, n, r, i, a, o) {
	let s = (n) => `<path d="M0 0L12 -8L12 8Z" transform="translate(${e} ${t}) rotate(${ds[n]})" style="fill:${r.includes(n) ? "var(--hf-edge)" : "var(--hf-panel)"};stroke:var(--hf-edge)" stroke-width="1.6" stroke-linejoin="round"/>`, [c, l] = {
		n: [0, -1],
		s: [0, 1],
		e: [1, 0],
		w: [-1, 0]
	}[[
		"n",
		"s",
		"e",
		"w"
	].find((e) => !n.includes(e))];
	return X(a, i, `<path d="M${e} ${t}L${e + c * 13} ${t + l * 13}" style="stroke:var(--hf-edge)" stroke-width="2"/><rect class="hl" x="${e + c * 18 - 6}" y="${t + l * 18 - 6}" width="12" height="12" rx="2" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="1.6"/>` + n.map(s).join("") + (o ? `<text x="${o[0]}" y="${o[1]}" text-anchor="${o[2]}" font-size="10.5" class="m halo">${Y(i)}</text>` : ""));
}
var ms = (e, t) => e.map(([, e, n, r, i]) => `<rect x="${e}" y="0" width="${n - e}" height="${t}" style="fill:var(${i})"/><text x="${e + 12}" y="20" class="zl">${Y(r)}</text>`).join("") + e.slice(1).map(([, e]) => `<path d="M${e} 0V${t}" style="stroke:var(--hf-line)" stroke-dasharray="2 4"/>`).join("");
function hs(e, t, n, r, i, a, o) {
	let s = e.id("gc");
	return X(o, a, `<clipPath id="${s}"><rect x="${t}" y="${n}" width="${r}" height="${i}" rx="12"/></clipPath><g clip-path="url(#${s})"><rect x="${t}" y="${n}" width="${r}" height="${i}" fill="url(#earthg)"/><rect x="${t}" y="${n}" width="${r}" height="10" style="fill:var(--hf-grass)"/><path d="M${t} ${n + i * .4}q${r * .25} -8 ${r * .5} 0t${r * .5} -3M${t} ${n + i * .72}q${r * .3} 8 ${r * .55} 0t${r * .45} 4" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/></g><rect class="hl" x="${t}" y="${n}" width="${r}" height="${i}" rx="12" fill="none" style="stroke:var(--hf-line)"/><text x="${t + r - 10}" y="${n + i - 12}" text-anchor="end" font-size="12" font-weight="700" class="lt">${Y(a)}</text>`);
}
function gs(e, t, n, r, i) {
	let a = (n - 12) / 2, o = (r - 12) / 2, s = `<rect class="hl" x="${e}" y="${t}" width="${n}" height="${r}" rx="8" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.2"/>`;
	for (let n = 0; n < 2; n++) for (let r = 0; r < 2; r++) {
		let i = e + 4 + n * (a + 4), c = t + 4 + r * (o + 4);
		s += `<rect x="${i}" y="${c}" width="${a}" height="${o}" rx="3" fill="url(#cellg)"/><path d="M${i} ${c + o / 2}h${a}M${i + a / 2} ${c}v${o}" stroke="#fff" stroke-opacity=".18"/>`;
	}
	return s += `<path d="M${e + 4} ${t + 4}h${n - 8}l-${n * .45} ${r - 8}h-${n * .55 - 8}z" fill="url(#sheen)"/>`, s += `<circle cx="${e + 10}" cy="${t - 16}" r="5" fill="#f4b400"/>` + [
		0,
		45,
		90,
		135,
		180,
		225,
		270,
		315
	].map((n) => `<path d="M${e + 10} ${t - 24.5}v-3" transform="rotate(${n} ${e + 10} ${t - 16})" stroke="#f4b400" stroke-width="1.6" stroke-linecap="round"/>`).join(""), X(i, "PVT panels", s + `<text x="${e + 24}" y="${t - 11}" font-size="12" font-weight="700" class="t">PVT panels</text>`);
}
function _s(e, t, n, r, i, a) {
	let o = t + 8, s = n + 8, c = r - 16, l = i - 16, u = e.id("tw"), d = a.map(([t, n]) => [n, e.val(t)]).filter((e) => e[1] != null), f = (e) => {
		if (!d.length) return null;
		if (e <= d[0][0]) return d[0][1];
		for (let t = 1; t < d.length; t++) if (e <= d[t][0]) {
			let [n, r] = d[t - 1], [i, a] = d[t];
			return r + (a - r) * (e - n) / (i - n);
		}
		return d[d.length - 1][1];
	}, p = Array.from({ length: 11 }, (e, t) => {
		let n = f(t / 10);
		return `<stop offset="${t / 10}" stop-color="${n == null ? Zo : ts(n)}"/>`;
	}).join("");
	return {
		under: X(a[0]?.[0] && e.data[a[0][0]]?.e, "Hot water tank", `<linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">${p}</linearGradient><rect class="hl" x="${t}" y="${n}" width="${r}" height="${i}" rx="30" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/><rect x="${o}" y="${s}" width="${c}" height="${l}" rx="24" fill="url(#${u})"/><rect x="${o + 6}" y="${s + 12}" width="8" height="${l - 24}" rx="4" fill="#fff" opacity=".2"/>`),
		over: a.map(([n, i]) => {
			let a = e.data[n], o = s + i * l;
			return a ? X(a.e, a.e, `<path d="M${t + r - 8 - 36} ${o}l6 -4v8z" fill="#fff"/><text x="${t + r - 8 - 3}" y="${o + 4}" text-anchor="end" font-size="11" font-weight="700" class="${a.stale ? "w" : "lt"}">${a.stale ? "—" : Y(a.v.toFixed(1) + "°")}</text>`) : "";
		}).join("")
	};
}
function vs(e, t, n, r, i, a, o) {
	let s = e.id("rg"), c = Math.max(3, Math.floor(r / 7)), l = r / c;
	return `<g><linearGradient id="${s}" gradientUnits="userSpaceOnUse" x1="0" y1="${n}" x2="0" y2="${n + i}"><stop offset="0" stop-color="${e.colourOf(a)}"/><stop offset="1" stop-color="${e.colourOf(o)}"/></linearGradient>` + Array.from({ length: c }, (e, r) => `<rect x="${t + r * l}" y="${n}" width="${l - 2}" height="${i}" rx="${(l - 2) / 2}" fill="url(#${s})" style="stroke:var(--hf-edge)" stroke-width=".8"/>`).join("") + "</g>";
}
function ys(e, t, n, r, i) {
	let a = e.val(i), o = a != null && a > 0, s = Array.from({ length: 7 }, (e, i) => `<path d="M${t} ${n}q${r * .25} ${-r * .45} ${r * .12} ${-r * .72}" transform="rotate(${i * 360 / 7} ${t} ${n})" fill="none" style="stroke:var(--hf-edge)" stroke-width="3" stroke-linecap="round"/>`).join("");
	return X(i, "Compressor", `<circle class="hl" cx="${t}" cy="${n}" r="${r}" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="2.5"/><g class="${o ? "spin" : ""}" style="transform-origin:${t}px ${n}px;--sd:${o ? (60 / Math.max(a, 10)).toFixed(2) : 0}s">${s}</g><circle cx="${t}" cy="${n}" r="${r * .16}" style="fill:var(--hf-edge)"/>`);
}
function bs(e, t, n, r, i, a, o, s, c, l) {
	let u = e.id("vg"), d = c ? e.data[c] : void 0, f = `<linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${e.colourOf(a)}" stop-opacity=".75"/><stop offset="1" stop-color="${e.colourOf(o)}" stop-opacity=".75"/></linearGradient><rect class="hl" x="${t}" y="${n}" width="${r}" height="${i}" rx="22" fill="url(#${u})" style="stroke:var(--hf-edge)" stroke-width="2"/>`;
	if (l) for (let e = 0; e < 9; e++) f += `<circle cx="${t + 14 + e * 37 % (r - 28)}" cy="${n + i - 14}" r="${2 + e % 3}" fill="#fff" opacity=".7" class="rise" style="animation-delay:-${(e * .41).toFixed(2)}s"/>`;
	return X(c, s, f + `<text x="${t + r / 2}" y="${n + 20}" text-anchor="middle" font-size="12" font-weight="700" class="lt">${Y(s)}</text>` + (d ? `<text x="${t + r / 2}" y="${n + 37}" text-anchor="middle" font-size="12" class="lt">${d.stale ? "— " + Y(d.stale) : Y(e.fmt(d))}</text>` : ""));
}
function xs(e, t, n, r, i, a, o, [s, c]) {
	let l = e.data[a], u = l?.stale ? "var(--hf-warn)" : e.colourOf(a);
	return X(a, i, `<path d="M${t + r / 2} ${n + 22}L${s} ${c}" style="stroke:${u}" stroke-width="2"/><circle cx="${s}" cy="${c}" r="3.5" style="fill:${u}"/><rect class="hl" x="${t}" y="${n}" width="${r}" height="44" rx="8" style="fill:${u}"/><text x="${t + r / 2}" y="${n + 18}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" letter-spacing=".04em">${Y(i.toUpperCase())}</text><text x="${t + r / 2}" y="${n + 35}" text-anchor="middle" font-size="12" fill="#fff">${l?.stale ? "— " + Y(l.stale) : l ? Y(e.fmt(l)) : ""} · ${Y(o)}</text>`);
}
function Ss(e, t, n, r, i) {
	let a = e.data[i], o = (e.val(i) ?? 0) > 0;
	return X(a?.e, `Immersion heater · ${a && o ? e.fmt(a) : "off"}`, `<rect x="${Math.min(t, n)}" y="${r - 3}" width="${Math.abs(n - t)}" height="6" rx="3" fill="${o ? "#ff7a1a" : "#8a8f99"}" style="${o ? "filter:drop-shadow(0 0 4px #ff7a1a)" : ""}" class="${o ? "pulse" : ""}"/><rect class="hl" x="${t - 4}" y="${r - 7}" width="9" height="14" rx="2" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="1.4"/>`);
}
function Cs(e, t, n, r, i, a, o = 12) {
	let [s, c] = {
		n: [0, -1],
		s: [0, 1],
		e: [1, 0],
		w: [-1, 0]
	}[n], [l, u] = [-c, s], d = (n, r) => `M${e + l * n} ${t + u * n}L${e + s * o + l * r} ${t + c * o + u * r}L${e + s * o - l * r} ${t + c * o - u * r}L${e - l * n} ${t - u * n}Z`;
	return `<path d="${d((r + 3) / 2, (i + 3) / 2)}" style="fill:var(--hf-edge)"/><path d="${d(r / 2, i / 2)}" fill="${a}"/>`;
}
var ws = (e, t, n) => X(n, "Mains in", `<circle class="hl" cx="${e}" cy="${t}" r="9" style="fill:var(--hf-panel);stroke:var(--hf-edge)" stroke-width="2"/><path d="M${e - 5} ${t - 5}L${e + 5} ${t + 5}" style="stroke:var(--hf-edge)" stroke-width="2.5" stroke-linecap="round"/><text x="${e - 8}" y="${t + 24}" font-size="11" font-weight="700" class="t halo">Mains in</text>`);
function Ts(e, t, n, r, i, a, o, s) {
	let c = o ? e.data[o] : void 0, l = Math.max(0, Math.min(1, (e.val(o) ?? 0) / 100)), u = r - 26, d = n + 22, f = i - 30, p = t + r - 20, m = n + 10, h = i - 10, g = e.id("rc"), _ = "";
	for (let e = m + 6; e < m + h - 3; e += 4.5) for (let t = 0; t < 3; t++) _ += `<circle cx="${p + 5 + t * 5 + Math.round(e) % 2 * 1.5}" cy="${e}" r="1.9"/>`;
	return X(o ?? s, `Softener${c ? ": salt " + e.fmt(c) : ""}${a ? ", needs topping up" : ""}`, `<rect class="hl ${a ? "pulse" : ""}" x="${t - 7}" y="${n - 7}" width="${r + 14}" height="${i + 14}" rx="10" style="fill:var(--hf-panel2);stroke:${a ? "var(--hf-warn)" : "var(--hf-line)"}" stroke-width="${a ? 3 : 1.5}"/><rect x="${t}" y="${n}" width="${u}" height="${i}" rx="8" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/><rect x="${t + 6}" y="${d}" width="${u - 12}" height="${f}" rx="4" style="fill:var(--hf-panel2);stroke:var(--hf-line)"/>` + (c ? `<rect x="${t + 6}" y="${d + f * (1 - l)}" width="${u - 12}" height="${f * l}" rx="4" fill="${a ? "var(--hf-warn)" : "#e8e2d4"}" style="stroke:var(--hf-line)"/><text x="${t + u / 2}" y="${n + 15}" text-anchor="middle" font-size="10.5" font-weight="700" class="t">${Y(c.stale ? "—" : e.fmt(c))}</text>` : "") + `<clipPath id="${g}"><rect x="${p}" y="${m}" width="20" height="${h}" rx="10"/></clipPath><rect x="${p}" y="${m}" width="20" height="${h}" rx="10" fill="url(#panelg)"/><g clip-path="url(#${g})" fill="#d9a441" fill-opacity=".75">${_}</g><rect x="${p}" y="${m}" width="20" height="${h}" rx="10" fill="none" style="stroke:var(--hf-edge)" stroke-width="1.5"/><text x="${t + r / 2}" y="${n - 14}" text-anchor="middle" font-size="11" font-weight="700" class="${a ? "w" : "t"} halo">${a ? "Top up salt" : "Softener"}</text>`);
}
function Es(e, t, n, r, i, a, o, s, c) {
	let l = Xo.cold, u = e.val(c), d = u == null ? 1 : Math.max(0, Math.min(1, u / 100)), f = n + 30 + (i - 37) * (1 - d), p = `<rect class="hl" x="${t}" y="${n}" width="${r}" height="${i}" rx="10" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.8"/><rect x="${t + 7}" y="${f}" width="${r - 14}" height="${n + i - 7 - f}" rx="6" fill="${l}" opacity=".22"/><text x="${t + r / 2}" y="${n + 52}" text-anchor="middle" font-size="11" font-weight="700" class="t">${Y(o)}</text><text x="${t + r / 2}" y="${n + 67}" text-anchor="middle" font-size="10.5" class="m">${u == null ? "level: no sensor" : `level ${Y(e.fmt(e.data[c]))}`}</text>`;
	return a && (p += Array.from({ length: 5 }, (e, i) => `<circle cx="${t + r * .5 + i % 2 * 4}" cy="${n + 14}" r="2" fill="${l}" class="drip" style="animation-delay:-${(i * .14).toFixed(2)}s"/>`).join(""), p += `<rect x="${t + r / 2 - 28}" y="${n + 76}" width="56" height="18" rx="9" fill="${l}"/><text x="${t + r / 2}" y="${n + 89}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff">Filling</text>`), X(s, `${o}${a ? ": filling" : ""}`, p);
}
function Ds(e, t, n, r, i) {
	let a = (e, t, n, r) => Array.from({ length: n }, (n, i) => `<circle cx="${e + (i % 3 - 1) * 4}" cy="${t}" r="1.8" fill="${Xo.cold}" class="${r ? "drip" : ""}" style="animation-delay:-${(i * .23).toFixed(2)}s" opacity="${r ? 1 : .25}"/>`).join(""), o = (e, t, n, r) => n === "none" ? "" : n === "shower" ? `<path d="M${e} ${t - 12}v6h8M${e + 2} ${t}a10 5 0 0 1 20 0z" fill="none" style="stroke:var(--hf-edge);fill:var(--hf-panel2)" stroke-width="2.5" stroke-linejoin="round"/>${a(e + 12, t + 10, 6, r)}` : `<path d="M${e} ${t - 6}h14a6 6 0 0 1 6 6v3M${e + 6} ${t - 6}v-5m-4 0h8" fill="none" style="stroke:var(--hf-edge)" stroke-width="3" stroke-linecap="round"/>${a(e + 20, t + 12, 3, r)}`;
	return `<g><rect x="${e}" y="${t}" width="${n}" height="${r}" rx="12" fill="url(#panelg)" style="stroke:var(--hf-line)"/><text x="${e + 12}" y="${t + 18}" font-size="12" font-weight="700" class="t">Taps &amp; showers</text>` + i.map((t) => X(t.e, t.label, `<text x="${e + 12}" y="${t.y + 4}" font-size="11" class="${t.on ? "t" : "m"}" font-weight="${t.on ? 700 : 400}">${Y(t.label)}</text>` + o(e + n - 40, t.y, t.icon, t.on) + (t.note ? `<text x="${e + 12}" y="${t.y + 18}" font-size="9.5" class="m">${Y(t.note)}</text>` : ""))).join("") + "</g>";
}
//#endregion
//#region src/heating-flow/system.ts
var Os = 1180, Z = (e, t = {}) => e ? [{
	k: e,
	...t
}] : [], Q = (e, t) => Z(e, {
	f: t,
	show: !1
}), ks = (e, t) => (e ?? []).map((e) => ({
	k: e,
	area: t
}));
function As(e, t, n) {
	let r = new ls(t.data, t.flows, n), i = e.source ?? {}, a = e.heat_pump ?? {}, o = e.heating ?? {}, s = e.dhw ?? {}, c = e.water ?? {}, l = [
		[
			"outside",
			0,
			245,
			e.area_outside ?? "Outside",
			"--hf-zone-out"
		],
		[
			"plant",
			245,
			900,
			e.area_plant ?? "Plant room",
			"--hf-zone-plant"
		],
		[
			"house",
			900,
			1180,
			e.area_house ?? "House",
			"--hf-zone-house"
		]
	];
	r.areas = l;
	let u = [], d = "", f = "", p = (e, t) => [
		[888, e],
		[912, e + t],
		[1030, e + t]
	], m = i.type === "borehole" || i.type === "horizontal" || !i.type, h = i.type === "air", g = m && !!i.pvt;
	if (m) {
		d += hs(r, 25, 440, 200, 180, i.type === "horizontal" ? "Ground loop" : "Borehole", i.ground ?? i.out);
		let e = [
			[70, 440],
			[70, 600],
			[150, 600],
			[150, 440]
		];
		if (i.type === "horizontal") {
			e = [[70, 440], [70, 560]];
			for (let t = 82, n = 0; t <= 202; t += 12, n++) e.push([t, n % 2 ? 548 : 572]);
			e.push([206, 560], [206, 480], [150, 480], [150, 440]);
		}
		u.push({
			circ: "brine",
			pts: e,
			r: i.type === "horizontal" ? 6 : 40,
			w: 10,
			flow: "brine",
			speed: i.pump,
			sensors: [...Q(i.out, 0), ...Q(i.ground ?? i.in, 1)]
		}), u.push({
			circ: "brine",
			pts: [
				[285, 200],
				[70, 200],
				[70, 440]
			],
			flow: "brine",
			speed: i.pump,
			hops: g ? [[
				180,
				200,
				"h"
			], [
				215,
				200,
				"h"
			]] : void 0,
			sensors: Z(i.out, { at: [120, 200] })
		}), u.push({
			circ: "brine",
			z: 1,
			pts: [
				[150, 440],
				[150, 255],
				[285, 255]
			],
			flow: "brine",
			speed: i.pump,
			sensors: [...Q(i.ground, 0), ...Z(i.in, { at: [262, 255] })]
		}), g && (d += gs(35, 62, 120, 85, i.pvt_out), u.push({
			circ: "brine",
			pts: [
				[180, 255],
				[180, 127],
				[155, 127]
			],
			flow: "pvt",
			speed: i.pump,
			sensors: Z(i.ground, { at: [180, 226] })
		}), u.push({
			circ: "pvt",
			pts: [
				[155, 84],
				[215, 84],
				[215, 255]
			],
			flow: "pvt",
			speed: i.pump,
			sensors: Z(i.pvt_out, { at: [215, 160] })
		}), f += ps(180, 255, [
			"w",
			"e",
			"n"
		], t.flows.pvt ? ["w", "n"] : ["w", "e"], "PVT valve", i.pvt_valve, [
			192,
			278,
			"start"
		])), i.pump && (f += fs(r, 150, 412, "n", i.pump, "Brine pump", [
			172,
			426,
			"start"
		], t.flows.comp && !t.flows.brine));
	} else if (h) {
		let e = t.flows.comp;
		d += `<g class="hit" data-e="${Y(i.outdoor ?? "")}" transform="translate(0 -130)"><rect class="hl" x="30" y="230" width="200" height="190" rx="16" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/><circle cx="130" cy="325" r="72" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="2"/><g class="${e ? "spin" : ""}" style="transform-origin:130px 325px;--sd:.8s">${[
			0,
			120,
			240
		].map((e) => `<path d="M130 325c10 -30 40 -40 52 -30c-8 20 -30 32 -52 30z" transform="rotate(${e} 130 325)" style="fill:var(--hf-line)"/>`).join("")}</g>` + [
			0,
			1,
			2,
			3,
			4
		].map((e) => `<circle cx="130" cy="325" r="${20 + e * 13}" fill="none" style="stroke:var(--hf-edge)" stroke-opacity=".35"/>`).join("") + "<text x=\"130\" y=\"222\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" class=\"t\">Outdoor fan coil</text></g>", u.push({
			circ: "ref",
			pts: [[285, 170], [230, 170]],
			flow: "comp"
		}), u.push({
			circ: "ref",
			pts: [[230, 230], [285, 230]],
			flow: "comp"
		}), i.outdoor && (f += r.readout(130, 315, i.outdoor));
	}
	let _ = a.compressor ? t.data[a.compressor] : void 0;
	f += `<g transform="translate(0 -130)"><rect x="285" y="170" width="235" height="280" rx="18" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/><text x="300" y="194" font-size="13" font-weight="700" class="t">${Y(a.label || `${h ? "Air" : m ? "Ground" : ""} source heat pump`)}</text><g class="hit" data-e="${Y(a.priority ?? "")}"><title>Priority</title><rect class="hl" x="300" y="204" width="96" height="22" rx="11" fill="${Ko[t.prio] ?? "#7a8190"}"/><text x="348" y="219" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${Y(t.prio)}</text></g>` + (t.alarm ? `<g class="hit" data-e="${Y(a.alarm ?? "")}"><title>${Y(t.alarm)}</title><rect class="hl pulse" x="404" y="204" width="104" height="22" rx="11" style="fill:var(--hf-bad)"/><text x="456" y="219" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Alarm</text></g>` : "") + (a.compressor ? ys(r, 337, 282, 30, a.compressor) + `<text x="337" y="330" text-anchor="middle" font-size="12" font-weight="700" class="t">${_ && !_.stale && _.v > 0 ? Y(r.fmt(_)) : _?.stale ? "— " + Y(_.stale) : "Stopped"}</text>` : "") + js(r, [
		["Supply", a.supply],
		["Calculated", a.calculated],
		["Return", a.return]
	], 382, 258, 508) + "<path d=\"M300 344H506\" style=\"stroke:var(--hf-line)\"/>" + js(r, [
		["Outdoor", i.outdoor],
		["Power", a.power],
		["Heat", a.heat]
	], 300, 368, 396) + js(r, [
		["COP", a.cop],
		["Aux", a.aux],
		["DM", a.degree_minutes]
	], 412, 368, 508) + "</g>";
	let v = Ro(e).reverse(), y = v.length, b = [
		30,
		145,
		260
	].slice(3 - y), x = b.map((e) => e + 34), S = b.map((e) => e + 74), C = (e, t, n = {}) => u.push({
		circ: "heat",
		pts: e,
		flow: "heat",
		speed: a.pump,
		sensors: t,
		...n
	});
	u.push({
		circ: "heat",
		pts: [[520, 120], [625, 120]],
		flow: "hp_out",
		speed: a.pump,
		sensors: Q(a.supply, 0)
	});
	let w = v[y - 1];
	C([[625, 120], [y ? 920 : 900, 120]], [
		...Q(a.supply, 0),
		...ks(o.supply_plant, "plant"),
		...Q(o.house_supply ?? w?.supply, 1)
	]);
	let T = [0, y - 1].filter((e, t, n) => y && n.indexOf(e) === t && x[e] !== 120);
	T.forEach((e) => C([
		[920, 120],
		[920, x[e]],
		[960, x[e]]
	], [...Q(o.house_supply, 0), ...Q(v[e].supply, 1)], { z: 1 })), v.forEach((e, t) => !T.includes(t) && C([[920, x[t]], [960, x[t]]], [...Q(o.house_supply, 0), ...Q(e.supply, 1)])), y && (C([
		[1150, S[0]],
		[1165, S[0]],
		[1165, 368],
		[900, 368]
	], [...Q(v[0].return, 0), ...Q(o.house_return, 1)], { z: 1 }), v.forEach((e, t) => t > 0 && C([[1150, S[t]], [1165, S[t]]], Q(e.return, 0)))), C([[900, 368], [595, 368]], [...Q(o.house_return ?? w?.return, 0), ...ks(o.return_plant, "plant")], {
		z: 1,
		r: 0
	}), u.push({
		circ: "heat",
		z: 1,
		pts: [
			[595, 368],
			[560, 368],
			[560, 290],
			[520, 290]
		],
		flow: "hp_out",
		speed: a.pump,
		sensors: Q(a.return, 1)
	}), a.pump && (f += fs(r, 565, 120, "e", a.pump, "Pump", [
		565,
		153,
		"middle"
	]));
	let E = t.prio === "Hot water";
	f += ps(625, 120, [
		"w",
		"e",
		"s"
	], ["w", E ? "s" : "e"], `Diverter → ${E ? "hot water" : "heating"}`, a.priority, [
		625,
		86,
		"middle"
	]);
	let D = v.map((e, t) => Ms(r, e, b[t], x[t], S[t])), O = zo(e), k = "";
	if (O) {
		u.push({
			circ: "dhw",
			pts: [
				[625, 120],
				[625, 545],
				[660, 545]
			],
			flow: "coil",
			speed: a.pump,
			hops: [[
				625,
				368,
				"v"
			]],
			sensors: Z(s.coil_in, { at: [625, 250] })
		});
		let e = s.tank ?? [], t = _s(r, 660, 440, 140, 250, e.map((t, n) => [t, e.length > 1 ? .14 + .72 * n / (e.length - 1) : .5]));
		if (d += t.under, k = t.over + (s.immersion ? Ss(r, 800, 762, 620, s.immersion) : "") + Cs(654, 545, "e", 12, 8, r.tint(s.coil_in, "coil", "dhw")) + Cs(654, 645, "e", 12, 8, r.tint(s.coil_out, "coil", "dhw")), u.push({
			circ: "dhw",
			w: 8,
			r: 8,
			flow: "coil",
			speed: a.pump,
			pts: [
				[660, 545],
				[748, 545],
				[748, 570],
				[684, 570],
				[684, 595],
				[748, 595],
				[748, 620],
				[684, 620],
				[684, 645],
				[660, 645]
			],
			sensors: [...Q(s.coil_in, 0), ...Q(s.coil_out, 1)]
		}), u.push({
			circ: "dhw",
			pts: [
				[660, 645],
				[595, 645],
				[595, 368]
			],
			flow: "coil",
			speed: a.pump,
			sensors: Z(s.coil_out, { at: [595, 500] })
		}), u.push({
			circ: "hot",
			pts: [
				[730, 440],
				[730, 412],
				...p(412, 14)
			],
			flow: "hot",
			sensors: [
				...Q(e[0], 0),
				...ks(s.hot_plant, "plant"),
				...ks(s.hot_house, "house")
			]
		}), s.loop_pump || s.loop_house?.length || s.loop_plant?.length) {
			let e = [[870, 592], [835, 500]], t = (s.loop_plant ?? []).map((t, n) => n < e.length ? {
				k: t,
				at: e[n]
			} : {
				k: t,
				area: "plant"
			});
			u.push({
				circ: "hot",
				w: 7,
				pts: [
					[1030, 620],
					[870, 620],
					[870, 500],
					[800, 500]
				],
				flow: "recirc",
				sensors: [...ks(s.loop_house, "house"), ...t]
			}), s.loop_pump && (f += fs(r, 870, 548, "n", s.loop_pump, "Loop", [
				890,
				552,
				"start"
			]));
		}
	}
	let A = !!c.softener, j = !!c.storage, M = [[700, 708], [700, 690]];
	d += ws(262, 742, c.meter ?? c.cold), A ? (d += Ts(r, 285, 540, 60, 150, t.saltLow, c.salt, c.salt_low), u.push({
		circ: "cold",
		z: 1,
		pts: [[278, 742], [335, 742]],
		flow: "mains",
		sensors: Q(c.cold, 0)
	}), u.push({
		circ: "cold",
		pts: [[335, 742], [335, 690]],
		flow: "mains",
		sensors: Q(c.cold, 0)
	}), u.push({
		circ: "cold",
		pts: [[335, 742], ...p(742, -14)],
		flow: "hard",
		sensors: Q(c.cold, 0)
	})) : u.push({
		circ: "cold",
		z: 1,
		pts: [[278, 742], [330, 742]],
		flow: "mains",
		sensors: Q(c.cold, 0)
	});
	let N = A ? [
		[345, 580],
		[362, 580],
		[362, 468]
	] : [[330, 742], [330, 468]];
	if (j) {
		d += Es(r, 375, 480, 180, 240, t.flows.fill, c.storage_label || "Storage", c.inlet ?? c.level, c.level), u.push({
			circ: "cold",
			pts: [
				...N,
				[465, 468],
				[465, 480]
			],
			flow: "fill",
			sensors: Q(c.cold, 0)
		}), f += ps(410, 468, ["w", "e"], t.flows.fill ? ["w", "e"] : [], `Inlet${t.flows.fill ? " · open" : ""}`, c.inlet, [
			410,
			434,
			"middle"
		]);
		let e = (c.pumps ?? []).slice(0, 2), n = e.length > 1 ? [420, 510] : [465];
		e.forEach((e, t) => {
			t && u.push({
				circ: "cold",
				pts: [[n[t], 678], [n[t], 664]],
				flow: (r.val(e) ?? 0) > 0 ? "soft" : void 0,
				speed: e,
				sensors: Q(c.cold, 0)
			}), f += fs(r, n[t], 692, "n", e, `P${t + 1}`, [
				n[t],
				650,
				"middle"
			]);
		}), u.push({
			circ: "cold",
			z: 1,
			pts: [
				[n[0], 678],
				[n[0], 664],
				[565, 664],
				[565, 708],
				...M
			],
			flow: "soft",
			speed: e[0],
			sensors: [...Q(c.cold, 0), ...Z(c.cold, { at: [640, 708] })]
		});
	} else u.push({
		circ: "cold",
		z: 1,
		pts: A ? [
			...N,
			[565, 468],
			[565, 708],
			...M
		] : [
			[330, 742],
			[330, 708],
			...M
		],
		flow: "soft",
		sensors: [...Q(c.cold, 0), ...Z(c.cold, { at: [640, 708] })]
	});
	u.push({
		circ: "cold",
		pts: [[700, 708], ...p(708, -14)],
		flow: "soft",
		speed: c.pumps?.[0],
		sensors: Q(c.cold, 0)
	});
	let P = t.flows.soft, F = P ? "in use · hot or cold?" : "";
	f += Ds(1030, 380, 135, 382, [
		...O ? [{
			y: 426,
			label: A ? "Soft hot" : "Hot",
			icon: "shower",
			on: P,
			note: F,
			e: s.hot_house?.at(-1)
		}] : [],
		...O && (s.loop_pump || s.loop_house?.length) ? [{
			y: 620,
			label: "Return loop",
			icon: "none",
			on: t.flows.recirc,
			e: s.loop_pump
		}] : [],
		{
			y: 694,
			label: A ? "Soft cold" : "Cold",
			icon: "tap",
			on: P,
			note: F,
			e: c.pumps?.[0] ?? c.cold
		},
		...A ? [{
			y: 728,
			label: "Hard (kitchen)",
			icon: "tap",
			on: t.flows.hard,
			note: c.meter ? "" : "needs a mains meter",
			e: c.meter
		}] : []
	]);
	let I = r.pipes(u);
	return `<defs>${us}${I.defs}${D.map((e) => e.defs).join("")}</defs>${ms(l, 770)}${d}${I.shadow}${I.body}${k}${D.map((e) => e.box).join("")}${D.map((e) => e.pipes).join("")}${D.map((e) => e.over).join("")}${f}${I.pills}`;
}
var js = (e, t, n, r, i) => t.filter(([, e]) => e).map(([t, a], o) => e.row(n, r + o * 22, t, a, i)).join("");
function Ms(e, t, n, r, i) {
	let a = t.emitters !== "rad", o = a && !!t.mixed, s = t.loops ?? [], c = s.filter((t) => (e.val(t) ?? 0) > 0).length, l = o ? 982 : 966, u = `<g class="hit" data-e="${Y(t.supply ?? "")}"><rect class="hl" x="960" y="${n}" width="190" height="100" rx="12" fill="url(#panelg)" style="stroke:var(--hf-line)"/><text x="972" y="${n + 18}" font-size="12" font-weight="700" class="t">${Y(t.name ?? "Floor")}</text><text x="1140" y="${n + 18}" text-anchor="end" font-size="10.5" class="m">${a ? "Underfloor" : "Radiators"}${o ? " · mixed" : ""}</text><text x="972" y="${n + 93}" font-size="10.5" class="m">${a ? s.length ? `${c} of ${s.length} loops open` : "" : "Radiators"}</text></g>`, d = [{
		circ: "heat",
		w: 6,
		r: 0,
		z: 1,
		pts: [[960, r], [1120, r]],
		flow: "heat",
		sensors: Q(t.supply, 0)
	}, {
		circ: "heat",
		w: 6,
		r: 0,
		z: 1,
		pts: [[l + 50, i], [1150, i]],
		flow: "heat",
		sensors: Q(t.return, 1)
	}], f = "";
	if (a) s.slice(0, 6).forEach((n, a) => {
		let o = l + 56 + a * 15, s = (e.val(n) ?? 0) > 0;
		d.push({
			circ: "heat",
			w: 5,
			r: 0,
			pts: [[o, r], [o, i]],
			flow: n,
			sensors: s ? [...Q(t.supply, 0), ...Q(t.return, 1)] : []
		}), f += `<g class="hit" data-e="${Y(n)}"><title>${Y(n)}: ${s ? "open" : "closed"}</title><circle class="hl" cx="${o}" cy="${r + 11}" r="4.5" style="fill:${s ? "var(--hf-run)" : "var(--hf-panel)"};stroke:var(--hf-edge)" stroke-width="1.5"/></g>`;
	});
	else for (let n = 0; n < 3; n++) f += vs(e, l + 54 + n * 30, r + 7, 24, i - r - 20, t.supply ?? "", t.return ?? "");
	o && (f += ps(974, r, [
		"w",
		"e",
		"n"
	], [
		"w",
		"e",
		"n"
	], "Mixing valve", void 0)), f += Cs(954, r, "e", 12, 6, e.tint(t.supply, "heat", "heat")) + Cs(1156, i, "w", 12, 6, e.tint(t.return, "heat", "heat")), t.supply && (f += e.readout(l + 24, r, t.supply)), t.return && (f += e.readout(1120, i, t.return));
	let p = e.pipes(d);
	return {
		defs: p.defs,
		box: u,
		pipes: p.shadow + p.body,
		over: f
	};
}
//#endregion
//#region src/heating-flow/heatpump.ts
var Ns = 1e3;
function Ps(e, t, n) {
	let r = new ls(t.data, t.flows, n), i = e.source ?? {}, a = e.heat_pump ?? {}, o = a.refrigerant ?? {}, s = e.heating ?? {}, c = e.dhw ?? {}, l = i.type === "air", u = !l && i.type !== "none", d = t.prio === "Defrost", f = t.flows.comp, p = [
		[
			"outside",
			0,
			230,
			l ? e.area_outside ?? "Outside" : "Source",
			"--hf-zone-out"
		],
		[
			"plant",
			230,
			770,
			a.label || "Heat pump",
			"--hf-zone-plant"
		],
		[
			"house",
			770,
			1e3,
			"Load",
			"--hf-zone-house"
		]
	];
	r.areas = p;
	let m = [], h = "<rect x=\"250\" y=\"62\" width=\"500\" height=\"555\" rx=\"28\" style=\"fill:var(--hf-panel);stroke:var(--hf-line)\" opacity=\".55\"/>", g = "";
	if (u) {
		h += hs(r, 20, 470, 190, 150, i.type === "horizontal" ? "Ground loop" : "Borehole", i.ground ?? i.out);
		let e = (e, t, n = {}) => m.push({
			circ: "brine",
			pts: e,
			flow: "brine",
			speed: i.pump,
			sensors: t,
			...n
		});
		e([
			[150, 470],
			[150, 595],
			[70, 595],
			[70, 470]
		], [...Q(i.out, 0), ...Q(i.ground, 1)], {
			r: 40,
			w: 10
		}), e([
			[70, 470],
			[70, 250],
			[290, 250]
		], [...Q(i.ground, 0), ...Z(i.in, { at: [200, 250] })]), e([
			[290, 440],
			[150, 440],
			[150, 470]
		], Z(i.out, { at: [220, 440] })), e([
			[290, 250],
			[370, 250],
			[370, 290],
			[310, 290],
			[310, 330],
			[370, 330],
			[370, 370],
			[310, 370],
			[310, 410],
			[370, 410],
			[370, 440],
			[290, 440]
		], [...Q(i.in, 0), ...Q(i.out, 1)], {
			w: 9,
			r: 9
		}), i.pump && (g += fs(r, 70, 360, "n", i.pump, "Brine pump", [
			92,
			364,
			"start"
		], f && !t.flows.brine));
	} else l && (h += `<g class="hit" data-e="${Y(i.outdoor ?? "")}"><rect class="hl" x="20" y="200" width="190" height="290" rx="16" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/><circle cx="115" cy="345" r="70" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="2"/><g class="${f ? "spin" : ""}" style="transform-origin:115px 345px;--sd:.8s">${[
		0,
		120,
		240
	].map((e) => `<path d="M115 345c10 -30 40 -40 52 -30c-8 20 -30 32 -52 30z" transform="rotate(${e} 115 345)" style="fill:var(--hf-line)"/>`).join("")}</g><text x="115" y="190" text-anchor="middle" font-size="12" font-weight="700" class="t">Outdoor fan</text></g>`, i.outdoor && (g += r.readout(115, 460, i.outdoor)), f && (g += [
		270,
		330,
		390,
		450
	].map((e) => `<path d="M190 ${e}H385" fill="none" stroke="${Xo.cold}" stroke-width="3" stroke-dasharray="6 8" class="dash" style="--d:.5s" opacity=".8"/>`).join("")));
	h += bs(r, 290, 200, 100, 280, o.suction, o.evaporating, "Evaporator", o.evaporating, f);
	let _ = (e, t) => m.push({
		circ: "ref",
		pts: e,
		flow: "comp",
		speed: a.compressor,
		rev: d,
		sensors: Q(t, 0)
	});
	_([
		[340, 200],
		[340, 110],
		[456, 110]
	], o.suction), _([
		[544, 110],
		[700, 110],
		[700, 200]
	], o.hot_gas), _([
		[700, 480],
		[700, 560],
		[524, 560]
	], o.liquid), _([
		[476, 560],
		[340, 560],
		[340, 480]
	], o.evaporating);
	let v = a.compressor ? t.data[a.compressor] : void 0, y = a.oil ? t.data[a.oil] : void 0;
	g += ys(r, 500, 110, 44, a.compressor) + `<text x="500" y="52" text-anchor="middle" font-size="12" font-weight="700" class="t">Compressor · ${v?.stale ? "— " + Y(v.stale) : v && f ? Y(r.fmt(v)) : f ? "running" : "stopped"}` + (y ? `<tspan class="hit ${y.stale ? "w" : "m"}" data-e="${Y(y.e)}" font-weight="400"> · oil ${Y(y.stale ? "— " + y.stale : r.fmt(y))}</tspan>` : "") + "</text>", g += ps(500, 560, ["w", "e"], ["w", "e"], "Expansion valve", void 0, [
		500,
		598,
		"middle"
	]), l && o.reversing_valve && (g += `<g class="hit" data-e="${Y(o.reversing_valve)}"><title>Reversing valve</title><rect class="hl" x="603" y="97" width="34" height="26" rx="4" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="1.6"/><path d="M610 104l20 12M610 116l20 -12" style="stroke:${d ? Xo.cold : "var(--hf-edge)"}" stroke-width="2"/><text x="620" y="88" text-anchor="middle" font-size="10.5" class="m halo">Reversing valve · ${d ? "defrost" : "heating"}</text></g>`), h += bs(r, 650, 200, 100, 280, o.hot_gas, o.liquid, "Condenser", o.condensing, f), o.suction && (g += xs(r, 115, 92, 140, "Suction gas", o.suction, "low pressure", [340, 150])), o.hot_gas && (g += xs(r, 540, 140, 150, "Hot gas", o.hot_gas, "high pressure", [700, 170])), o.liquid && (g += xs(r, 535, 490, 150, "Liquid", o.liquid, "high pressure", [620, 560]));
	let b = (e, t, n, r = {}) => m.push({
		circ: "heat",
		pts: e,
		flow: t,
		speed: a.pump,
		sensors: n,
		...r
	});
	b([
		[750, 460],
		[670, 460],
		[670, 420],
		[730, 420],
		[730, 380],
		[670, 380],
		[670, 340],
		[730, 340],
		[730, 300],
		[670, 300],
		[670, 260],
		[750, 260]
	], "hp_out", [...Q(a.return, 0), ...Q(a.supply, 1)], {
		w: 9,
		r: 9
	}), b([[750, 260], [850, 260]], "hp_out", Z(a.supply, { at: [775, 260] })), b([[850, 260], [880, 260]], "heat", Q(a.supply, 0)), b([
		[880, 300],
		[870, 300],
		[870, 440]
	], "heat", [...Q(s.house_return, 0), ...Q(a.return, 1)]), b([
		[870, 440],
		[870, 460],
		[750, 460]
	], "hp_out", [...Q(a.return, 0), ...Z(a.return, { at: [800, 460] })], { z: 1 });
	let x = zo(e);
	x && (m.push({
		circ: "dhw",
		pts: [
			[850, 260],
			[850, 390],
			[880, 390]
		],
		flow: "coil",
		speed: a.pump,
		hops: [[
			870,
			390,
			"h"
		]],
		sensors: Q(c.coil_in ?? a.supply, 0)
	}), m.push({
		circ: "dhw",
		pts: [[880, 440], [870, 440]],
		flow: "coil",
		speed: a.pump,
		sensors: Q(c.coil_out, 0)
	})), a.pump && (g += fs(r, 815, 260, "e", a.pump, "Heating pump", [
		815,
		232,
		"middle"
	])), g += ps(850, 260, [
		"w",
		"e",
		"s"
	], ["w", t.prio === "Hot water" ? "s" : "e"], "Diverter", a.priority);
	let S = (e, t, n) => `<g><rect x="880" y="${e}" width="110" height="${26 + n.filter(([, e]) => e).length * 22}" rx="10" fill="url(#panelg)" style="stroke:var(--hf-line)"/><text x="890" y="${e + 18}" font-size="12" font-weight="700" class="t">${Y(t)}</text>` + js(r, n, 890, e + 40, 982) + "</g>";
	g += S(200, "Heating", [
		["Supply", s.house_supply],
		["Target", a.calculated],
		["Return", s.house_return],
		["DM", a.degree_minutes]
	]), x && (g += S(360, "Hot water", [
		["Top", c.tank?.[0]],
		["Coil in", c.coil_in],
		["Coil out", c.coil_out]
	]));
	let C = r.pipes(m);
	return `<defs>${us}${C.defs}</defs>${ms(p, 630)}${h}${C.shadow}${C.body}${g}${C.pills}`;
}
//#endregion
//#region src/heating-flow/rooms.ts
var Fs = 1e3;
function Is(e, t, n) {
	let r = new ls(t.data, t.flows, n);
	r.areas = [[
		"house",
		0,
		Fs,
		"",
		"--hf-zone-house"
	]];
	let i = Ro(e).reverse(), a = Math.min(205, 620 / Math.max(1, i.length)), o = [], s = "";
	i.forEach((n, i) => s += Ls(r, t, n, 10 + i * a, a - 14, o, e.heat_pump?.pump)), i.length || (s += `<text x="${Fs / 2}" y="315" text-anchor="middle" font-size="14" class="m">No floors set: add them in the card's options.</text>`);
	let c = r.pipes(o);
	return `<defs>${us}${c.defs}</defs><rect width="${Fs}" height="630" style="fill:var(--hf-zone-house)"/>${s}${c.body}${c.pills}`;
}
function Ls(e, t, n, r, i, a, o) {
	let s = n.emitters !== "rad", c = n.loops ?? [], l = n.rooms ?? [], u = n.loop_returns ?? [], d = c.filter((t) => (e.val(t) ?? 0) > 0).length, f = Math.max(c.length, l.length), p = `<g class="hit" data-e="${Y(n.supply ?? "")}"><rect class="hl" x="12" y="${r}" width="166" height="${i}" rx="14" fill="url(#panelg)" style="stroke:var(--hf-line)"/><text x="26" y="${r + 24}" font-size="14" font-weight="700" class="t">${Y(n.name ?? "Floor")}</text><text x="26" y="${r + 42}" font-size="11" class="m">${s ? "Underfloor" : "Radiators"}${s && n.mixed ? " · mixed" : ""}</text>` + (n.supply ? `<text x="26" y="${r + 74}" font-size="11.5" class="m">Supply</text>` : "") + (n.return ? `<text x="26" y="${r + 102}" font-size="11.5" class="m">Return</text>` : "") + `<text x="26" y="${r + i - 14}" font-size="11" class="m">${c.length ? s ? `${d} of ${c.length} loops open` : `${d} of ${c.length} open` : f ? `${f} rooms` : "No rooms set"}</text></g>`;
	n.supply && (p += e.readout(140, r + 70, n.supply)), n.return && (p += e.readout(140, r + 98, n.return));
	let m = (800 - (f - 1) * 10) / f;
	for (let d = 0; d < f; d++) {
		let f = 190 + d * (m + 10), h = c[d], g = l[d], _ = u[d] ?? n.return, v = g ? t.data[g] : void 0, y = g ? t.rooms[g] : void 0, b = y?.target ?? null, x = !h || (e.val(h) ?? 0) > 0, S = x && t.flows.heat, C = g ? e.val(g) : null, w = S && C != null && b != null && C < b - 1, T = y?.name ?? (h ? h.replace(/^[^.]+\./, "") : `Room ${d + 1}`);
		if (p += `<g class="hit" data-e="${Y(g ?? h ?? "")}"><rect class="hl" x="${f}" y="${r}" width="${m}" height="${i}" rx="14" fill="url(#panelg)" style="stroke:${w ? "var(--hf-warn)" : "var(--hf-line)"}" stroke-width="${w ? 2.5 : 1}"/><text x="${f + 12}" y="${r + 22}" font-size="12.5" font-weight="700" class="t">${Y(T)}</text>` + (v ? `<text x="${f + 12}" y="${r + 54}" font-size="${v.stale ? 14 : 24}" font-weight="700" class="${v.stale ? "w" : "t"}">${Y(v.stale ? "— " + v.stale : e.fmt(v))}</text>` : "") + (b != null && C != null ? `<text x="${f + 12}" y="${r + 72}" font-size="11" class="${w ? "w" : "m"}">${w ? `${(b - C).toFixed(1)}° below ${b.toFixed(1)}°` : `target ${b.toFixed(1)}°`}</text>` : "") + "</g>", h) {
			let n = t.data[h], i = n?.stale ? "—" : n?.unit === "%" ? e.fmt(n) : x ? "Open" : "Closed";
			p += `<g class="hit" data-e="${Y(h)}"><title>${Y(h)}</title><rect class="hl" x="${f + m - 62}" y="${r + 9}" width="50" height="18" rx="9" style="fill:${x ? "var(--hf-run)" : "var(--hf-panel2)"};stroke:${n?.stale ? "var(--hf-warn)" : x ? "var(--hf-run)" : "var(--hf-line)"}"/><text x="${f + m - 37}" y="${r + 22}" text-anchor="middle" font-size="10.5" font-weight="700" style="fill:${x ? "#fff" : "var(--hf-muted)"}">${Y(i)}</text></g>`;
		}
		let E = f + 14, D = f + m - 14, O = r + 88, k = r + i - 14;
		if (!(k - O < 10)) {
			if (s) {
				let e = Math.max(2, Math.floor((k - O) / 15) + 1), t = [[E, O]];
				for (let n = 0; n < e; n++) {
					let r = O + n * (k - O) / (e - 1);
					n && t.push([n % 2 ? D : E + 10, r]), t.push([n % 2 ? E + 10 : D, r]);
				}
				a.push({
					circ: "heat",
					w: 6,
					r: 7,
					pts: t,
					flow: h ?? "heat",
					speed: o,
					sensors: [...x ? Q(n.supply, 0) : [], ...Q(_, 1)]
				});
			} else p += vs(e, E, O, Math.min(120, D - E), k - O, n.supply ?? "", _ ?? "");
		}
	}
	return p;
}
//#endregion
//#region src/heating-flow/card.ts
var Rs = 500, zs = {
	system: [
		"System",
		Os,
		770,
		As
	],
	heat_pump: [
		"Heat pump",
		Ns,
		630,
		Ps
	],
	rooms: [
		"Rooms",
		Fs,
		630,
		Is
	]
}, Bs = class extends V {
	constructor(...e) {
		super(...e), this._view = "system", this._seen = "", this._held = !1, this._down = (e) => {
			let t = this._part(e);
			this._held = !1, clearTimeout(this._timer), t && (this._timer = window.setTimeout(() => (this._held = !0, this._act(t, "hold")), Rs));
		}, this._up = () => clearTimeout(this._timer), this._click = (e) => {
			let t = this._part(e);
			t && !this._held && this._act(t, "tap");
		}, this._dbl = (e) => {
			let t = this._part(e);
			t && this._act(t, "double_tap");
		};
	}
	static {
		this.properties = {
			_config: { state: !0 },
			_view: { state: !0 }
		};
	}
	static getStubConfig() {
		return {
			source: { type: "borehole" },
			dhw: { enabled: !0 },
			floor_1: { name: "Ground floor" },
			floor_2: { name: "First floor" }
		};
	}
	static getConfigElement() {
		return document.createElement("casa-mia-heating-flow-editor");
	}
	setConfig(e) {
		this._config = { ...e }, this._view = e.view && e.view in zs ? e.view : Lo.view, this._seen = "";
	}
	set hass(e) {
		this._hass = e;
		let t = (this._config ? Bo(this._config) : []).map((t) => `${t}@${e.states[t]?.last_updated ?? ""}`).join(",");
		t !== this._seen && (this._seen = t, this.requestUpdate());
	}
	getCardSize() {
		return 9;
	}
	getGridOptions() {
		return {
			columns: "full",
			rows: "auto",
			min_columns: 6
		};
	}
	render() {
		if (!this._config || !this._hass) return B;
		let e = {
			...Lo,
			...this._config
		}, t = {
			pipes: e.pipes,
			markers: e.markers,
			colours: e.colours,
			readouts: e.readouts
		}, n = Jo(this._hass, this._config), [r, i, a, o] = zs[this._view];
		return z`<ha-card>
      <div class="head">
        <span class="title">${e.title ?? "Heating & hot water"}</span>
        ${this._chips(n)}
        <span class="tabs">
          ${Object.keys(zs).map((e) => z`<button class="cm-chip ${e === this._view ? "cm-on" : ""}" @click=${() => this._view = e}>${zs[e][0]}</button>`)}
        </span>
      </div>
      <svg
        class=${this._still() ? "still" : ""}
        viewBox="0 0 ${i} ${a}"
        role="img"
        aria-label="Heating and hot water: ${r}"
        @pointerdown=${this._down}
        @pointerup=${this._up}
        @pointerleave=${this._up}
        @click=${this._click}
        @dblclick=${this._dbl}
      >
        ${Io(o(this._config, n, t))}
      </svg>
    </ha-card>`;
	}
	_still() {
		return this._config?.animations === !1 || matchMedia("(prefers-reduced-motion: reduce)").matches;
	}
	updated() {
		let e = this.renderRoot.querySelector("svg");
		e && (this._still() ? e.pauseAnimations() : e.unpauseAnimations());
	}
	_chips(e) {
		let t = this._config?.heat_pump?.compressor ? e.data[this._config.heat_pump.compressor] : void 0, n = this._config?.source?.outdoor ? e.data[this._config.source.outdoor] : void 0, r = (e) => e.text ?? e.v.toFixed(e.dp) + e.unit;
		return z`<span class="cm-pill cm-filled" style="--tone:${Ko[e.prio] ?? "var(--secondary-text-color)"}">${e.prio}</span>
      ${t && !t.stale ? z`<span class="cm-pill">${t.v > 0 ? r(t) : "Compressor off"}</span>` : B}
      ${n && !n.stale ? z`<span class="cm-pill">Outdoor ${r(n)}</span>` : B}
      ${e.alarm ? z`<span class="cm-pill cm-filled" style="--tone:var(--error-color, #db4437)">Alarm: ${e.alarm}</span>` : B}
      ${e.saltLow ? z`<span class="cm-pill cm-filled" style="--tone:var(--warning-color, #ffa600)">Softener: top up salt</span>` : B}`;
	}
	_part(e) {
		return e.target.closest?.("[data-e]")?.getAttribute("data-e") || void 0;
	}
	_act(e, n) {
		let r = this._config;
		t(this, "hass-action", {
			config: {
				entity: e,
				tap_action: r.tap_action ?? { action: "more-info" },
				hold_action: r.hold_action ?? { action: "none" },
				double_tap_action: r.double_tap_action ?? { action: "none" }
			},
			action: n
		});
	}
	static {
		this.styles = [Er, R`
      :host {
        --hf-panel: var(--card-background-color, #fff);
        --hf-panel2: color-mix(in srgb, var(--primary-text-color, #212121) 6%, var(--hf-panel));
        --hf-line: var(--divider-color, #c9ced8);
        --hf-text: var(--primary-text-color, #212121);
        --hf-muted: var(--secondary-text-color, #727272);
        --hf-edge: color-mix(in srgb, var(--primary-text-color, #212121) 78%, var(--hf-panel));
        --hf-conduit: color-mix(in srgb, #000 75%, var(--hf-panel));
        --hf-off: color-mix(in srgb, var(--secondary-text-color, #727272) 45%, var(--hf-panel));
        --hf-accent: var(--primary-color, #03a9f4);
        --hf-run: var(--success-color, #43a047);
        --hf-warn: var(--warning-color, #ffa600);
        --hf-bad: var(--error-color, #db4437);
        --hf-zone-out: color-mix(in srgb, #2f86e0 7%, var(--hf-panel));
        --hf-zone-plant: color-mix(in srgb, var(--primary-text-color, #212121) 3%, var(--hf-panel));
        --hf-zone-house: color-mix(in srgb, #e8a050 7%, var(--hf-panel));
        --hf-earth1: color-mix(in srgb, #9a7b55 85%, var(--hf-panel));
        --hf-earth2: color-mix(in srgb, #b89a70 85%, var(--hf-panel));
        --hf-earth3: color-mix(in srgb, #8a8780 85%, var(--hf-panel));
        --hf-grass: #5f9e4f;
      }
      ha-card {
        overflow: hidden;
      }
      .head {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        padding: 10px 14px;
        border-bottom: 1px solid var(--hf-line);
      }
      .title {
        margin-right: auto;
        color: var(--hf-text);
        font-size: 16px;
        font-weight: 500;
      }
      .tabs {
        display: flex;
        gap: 4px;
      }
      svg {
        display: block;
        width: 100%;
        height: auto;
        font-family: var(--ha-font-family-body, inherit);
      }
      .t { fill: var(--hf-text); }
      .m { fill: var(--hf-muted); }
      .w { fill: var(--hf-warn); }
      .zl { fill: var(--hf-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
      .halo { paint-order: stroke; stroke: var(--hf-panel); stroke-width: 4px; stroke-linejoin: round; }
      .lt { fill: #fff; paint-order: stroke; stroke: rgba(0, 0, 0, 0.45); stroke-width: 3px; }
      .hit { cursor: pointer; }
      .hit:hover .hl { stroke: var(--hf-accent) !important; stroke-width: 2.5px; }
      .spin { animation: spin var(--sd, 3s) linear infinite; }
      .pulse { animation: pulse 1.2s ease-in-out infinite; }
      .drip { animation: drip 0.7s linear infinite; }
      .rise { animation: rise 2.6s linear infinite; }
      .dash { animation: dash var(--d, 1.2s) linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 50% { opacity: 0.35; } }
      @keyframes drip { from { transform: translateY(0); opacity: 1; } to { transform: translateY(22px); opacity: 0; } }
      @keyframes rise { from { transform: translateY(0); opacity: 0.8; } to { transform: translateY(-230px); opacity: 0; } }
      @keyframes dash { to { stroke-dashoffset: -28; } }
      .still .spin, .still .pulse, .still .drip, .still .rise, .still .dash { animation: none; }
    `];
	}
}, $ = (e, t) => ({
	name: e,
	selector: { entity: t ? { filter: { domain: t } } : {} }
}), Vs = (e) => ({
	name: e,
	selector: { entity: {
		multiple: !0,
		reorder: !0
	} }
}), Hs = (e, t) => ({
	name: e,
	selector: { select: {
		mode: "dropdown",
		options: t.map(([e, t]) => ({
			value: e,
			label: t
		}))
	} }
}), Us = (e) => ({
	name: e,
	selector: { boolean: {} }
}), Ws = (e) => ({
	name: e,
	selector: { text: {} }
}), Gs = (e, t, n, r) => ({
	type: "expandable",
	...e ? { name: e } : {},
	title: t,
	icon: r,
	schema: n
}), Ks = [
	"binary_sensor",
	"switch",
	"input_boolean",
	"valve",
	"sensor"
], qs = (e, t) => Gs(`floor_${e}`, t, [
	Ws("name"),
	Hs("emitters", [["ufh", "Underfloor"], ["rad", "Radiators"]]),
	Us("mixed"),
	$("supply", ["sensor"]),
	$("return", ["sensor"]),
	Vs("loops"),
	Vs("rooms"),
	Vs("loop_returns")
], "mdi:floor-plan"), Js = [
	Ws("title"),
	Hs("view", [
		["system", "System"],
		["heat_pump", "Heat pump"],
		["rooms", "Rooms"]
	]),
	Gs(void 0, "Look", [
		Hs("pipes", [
			["outline", "Outline"],
			["glass", "Glass"],
			["conduit", "Conduit"],
			["neon", "Neon"]
		]),
		Hs("markers", [
			["chev", "Chevrons"],
			["arrow", "Arrows"],
			["bub", "Bubbles"]
		]),
		Hs("colours", [["temp", "By temperature"], ["circuit", "By circuit"]]),
		Hs("readouts", [["pill", "Pills on the pipe"], ["text", "Text beside the pipe"]]),
		Us("animations"),
		Ws("area_outside"),
		Ws("area_plant"),
		Ws("area_house")
	], "mdi:palette"),
	Gs("source", "Source", [
		Hs("type", [
			["borehole", "Borehole"],
			["horizontal", "Horizontal ground loop"],
			["air", "Air"],
			["none", "None"]
		]),
		$("outdoor", ["sensor"]),
		$("pump"),
		$("out", ["sensor"]),
		$("ground", ["sensor"]),
		$("in", ["sensor"]),
		Us("pvt"),
		$("pvt_out", ["sensor"]),
		$("pvt_valve", Ks)
	], "mdi:earth"),
	Gs("heat_pump", "Heat pump", [
		Ws("label"),
		$("priority"),
		$("compressor"),
		$("supply", ["sensor"]),
		$("calculated", ["sensor"]),
		$("return", ["sensor"]),
		$("pump"),
		$("power", ["sensor"]),
		$("heat", ["sensor"]),
		$("cop", ["sensor"]),
		$("aux", ["sensor"]),
		$("degree_minutes", ["sensor"]),
		$("alarm"),
		$("oil", ["sensor"]),
		Gs("refrigerant", "Refrigerant", [
			$("suction", ["sensor"]),
			$("hot_gas", ["sensor"]),
			$("liquid", ["sensor"]),
			$("evaporating", ["sensor"]),
			$("condensing", ["sensor"]),
			$("reversing_valve", Ks)
		], "mdi:snowflake-thermometer")
	], "mdi:heat-pump"),
	Gs("heating", "Heating runs", [
		Vs("supply_plant"),
		Vs("return_plant"),
		$("house_supply", ["sensor"]),
		$("house_return", ["sensor"])
	], "mdi:pipe"),
	qs(1, "Lowest floor"),
	qs(2, "Next floor up"),
	qs(3, "Top floor"),
	Gs("dhw", "Hot water", [
		Us("enabled"),
		$("coil_in", ["sensor"]),
		$("coil_out", ["sensor"]),
		Vs("tank"),
		Vs("hot_plant"),
		Vs("hot_house"),
		$("loop_pump", Ks),
		Vs("loop_house"),
		Vs("loop_plant"),
		$("immersion")
	], "mdi:water-boiler"),
	Gs("water", "Water", [
		Us("softener"),
		$("salt", ["sensor"]),
		$("salt_low", Ks),
		Us("storage"),
		Ws("storage_label"),
		$("inlet", Ks),
		$("level", ["sensor"]),
		Vs("pumps"),
		$("meter", ["sensor"]),
		$("cold", ["sensor"])
	], "mdi:water"),
	Gs(void 0, "Tap, hold and double tap", [
		{
			name: "tap_action",
			selector: { ui_action: { default_action: "more-info" } }
		},
		{
			name: "hold_action",
			selector: { ui_action: { default_action: "none" } }
		},
		{
			name: "double_tap_action",
			selector: { ui_action: { default_action: "none" } }
		}
	], "mdi:gesture-tap")
], Ys = {
	title: "Title",
	view: "Opens on",
	pipes: "Pipes",
	markers: "Flow markers",
	colours: "Colours",
	readouts: "Readings",
	animations: "Enable animations",
	area_outside: "Outside area's name",
	area_plant: "Plant area's name",
	area_house: "House area's name",
	label: "Heat pump's name",
	storage_label: "Storage tank's name",
	type: "Kind",
	outdoor: "Outdoor temperature",
	pump: "Pump (speed or on/off)",
	out: "Out to the ground",
	ground: "Back from the ground",
	in: "Into the heat pump",
	pvt: "PVT panels",
	pvt_out: "PVT out",
	pvt_valve: "PVT valve (open: through the panels)",
	priority: "Priority (heating, hot water, off…)",
	compressor: "Compressor (frequency or on/off)",
	supply: "Supply",
	calculated: "Calculated supply",
	return: "Return",
	power: "Power in",
	heat: "Heat out",
	cop: "COP",
	aux: "Aux heater",
	degree_minutes: "Degree minutes",
	alarm: "Alarm",
	supply_plant: "Supply sensors in the plant room",
	return_plant: "Return sensors in the plant room",
	house_supply: "Supply arriving at the house",
	house_return: "Return leaving the house",
	name: "Name",
	emitters: "Emitters",
	mixed: "Mixed down (its own mixing valve)",
	loops: "Loop actuators",
	rooms: "Rooms",
	loop_returns: "Loop returns",
	suction: "Suction gas",
	hot_gas: "Hot gas",
	liquid: "Liquid",
	evaporating: "Evaporating",
	condensing: "Condensing",
	reversing_valve: "Reversing valve (on: defrost)",
	oil: "Compressor oil temperature",
	enabled: "Hot water tank",
	coil_in: "Coil in",
	coil_out: "Coil out",
	tank: "Tank sensors (top first)",
	hot_plant: "Hot sensors in the plant room",
	hot_house: "Hot sensors in the house",
	loop_pump: "Return loop pump",
	loop_house: "Return loop sensors in the house",
	loop_plant: "Return loop sensors in the plant room",
	immersion: "Immersion heater (power or on/off)",
	softener: "Softener",
	salt: "Salt level",
	salt_low: "Needs salt",
	storage: "Storage tank",
	inlet: "Storage inlet (open: filling)",
	level: "Storage level",
	pumps: "Storage pumps (one or two)",
	meter: "Mains flow meter",
	cold: "Mains temperature",
	tap_action: "Tap",
	hold_action: "Hold",
	double_tap_action: "Double tap"
}, Xs = {
	animations: "Off: a still picture, with the flow markers standing on the pipes that flow. For low-powered tablets.",
	supply_plant: "In the order the water passes them; the card spaces them along the run.",
	return_plant: "In the order the water passes them, from the house back to the heat pump.",
	view: "The tab the card shows first.",
	loops: "One per underfloor loop or radiator valve, open when on.",
	rooms: "A thermostat (or temperature sensor) per room, in the same order as the loops: room 1 is on loop 1.",
	loop_returns: "Each loop's return temperature, in the same order. Without one, the floor's return.",
	hot_plant: "Along the hot run from the tank, in order.",
	loop_house: "Along the return loop from its far end, in order.",
	meter: "With a storage tank, a flow while it isn't filling is the hard tap.",
	priority: "Its state decides the diverter and which circuits flow."
}, Zs = class extends V {
	constructor(...e) {
		super(...e), this._ready = !1;
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			_config: { state: !0 },
			_ready: { state: !0 }
		};
	}
	setConfig(e) {
		this._config = e;
	}
	connectedCallback() {
		super.connectedCallback(), a().then(() => this._ready = !0);
	}
	render() {
		return !this.hass || !this._config || !this._ready ? B : z`<ha-form
      .hass=${this.hass}
      .data=${{
			...Lo,
			...this._config
		}}
      .schema=${Js}
      .computeLabel=${(e) => Ys[e.name] ?? e.name}
      .computeHelper=${(e) => Xs[e.name]}
      @value-changed=${(e) => {
			e.stopPropagation(), this._config = {
				...this._config,
				...e.detail.value
			}, t(this, "config-changed", { config: F(this._config, Lo) });
		}}
    ></ha-form>`;
	}
};
c("casa-mia-heating-flow", Bs), c("casa-mia-heating-flow-editor", Zs), l("casa-mia-heating-flow", "Casa Mia Heating Flow", "The heating and hot water as a live diagram: colour is temperature, chevrons are flow, and anything not current says so.");
//#endregion
//#region src/swap/engine.ts
var Qs = [
	"exact",
	"case",
	"regex"
], $s = /\p{L}+/gu, ec = /\$(?:(\$)|(&)|(\d\d?)|<([^>]*)>)/g, tc = (e) => e.replace($s, (e) => {
	let [t, ...n] = e;
	return t.toUpperCase() + n.join("").toLowerCase();
});
function nc(e, t) {
	let n = e.toLowerCase(), r = e.toUpperCase();
	return e === n && e === r ? t : e === n ? t.toLowerCase() : e === tc(e) ? tc(t) : e === r ? t.toUpperCase() : t;
}
function rc(e, t) {
	let n = t.length - 1;
	return e.replace(ec, (e, r, i, a, o) => {
		if (r) return "$";
		if (i) return t[0];
		if (a) {
			let r = Number(a), i = "";
			return r > n && ([r, i] = [Number(a[0]), a.slice(1)]), r > 0 && r <= n ? (t[r] ?? "") + i : e;
		}
		return t.groups && o in t.groups ? t.groups[o] ?? "" : e;
	});
}
var ic = (e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function ac(e) {
	let { match: t, mode: n = "exact" } = e;
	if (typeof t != "string" || !t) throw Error("nothing to match");
	if (n === "regex") return new RegExp(t, "gu");
	if (!Qs.includes(n)) throw Error(`unknown mode '${n}'`);
	return RegExp(`(?<!\\p{L})${ic(t)}(?!\\p{L})`, n === "case" ? "giu" : "gu");
}
function oc(e, t, n) {
	for (; n <= t.length;) {
		e.lastIndex = n;
		let r = e.exec(t);
		if (!r || r[0].length) return r;
		n = r.index + 1;
	}
	return null;
}
var sc = class {
	constructor(e) {
		this.errors = [], this.rules = [], e.forEach((e, t) => {
			if (e.enabled !== !1) try {
				this.rules.push([
					ac(e),
					e,
					t
				]);
			} catch (e) {
				this.errors.push([t, String(e.message ?? e)]);
			}
		});
	}
	replacement(e, t) {
		let n = String(e.replace ?? "");
		return e.mode === "case" ? nc(t[0], n) : e.mode === "regex" ? rc(n, t) : n;
	}
	*spans(e) {
		let t = this.rules.map(([t]) => oc(t, e, 0)), n = 0;
		for (;;) {
			let r = -1;
			if (this.rules.forEach(([i], a) => {
				let o = t[a];
				o && o.index < n && (o = t[a] = oc(i, e, n));
				let s = r < 0 ? null : t[r];
				o && (!s || o.index < s.index || o.index === s.index && o[0].length > s[0].length) && (r = a);
			}), r < 0) return;
			let i = t[r], a = i.index + i[0].length, [, o, s] = this.rules[r];
			yield [
				i.index,
				a,
				this.replacement(o, i),
				s
			], n = a;
		}
	}
	out(e) {
		let t = "", n = 0;
		for (let [r, i, a] of this.spans(e)) t += e.slice(n, r) + a, n = i;
		return n ? t + e.slice(n) : e;
	}
}, cc = "data-swap-layer", lc = "1px solid red", uc = "position:fixed;inset:0;margin:0;padding:0;border:0;width:auto;height:auto;max-width:none;max-height:none;overflow:visible;background:transparent;pointer-events:none;z-index:2147483647", dc = /* @__PURE__ */ new WeakMap(), fc = /* @__PURE__ */ new WeakMap();
function pc(e, t, n) {
	let r = e.elementFromPoint(t, n);
	for (; r?.shadowRoot;) {
		let e = r.shadowRoot.elementFromPoint(t, n);
		if (!e || e === r) break;
		r = e;
	}
	return r;
}
var mc = (e) => e.parentElement ?? e.parentNode?.host ?? null;
function hc(e, t, n) {
	if (!t.width || !t.height) return !1;
	for (let r = pc(n, t.left + t.width / 2, t.top + t.height / 2); r; r = mc(r)) if (r === e) return !0;
	return !1;
}
function gc(e, t) {
	for (let n = e; n; n = mc(n)) {
		let e = t.getComputedStyle(n).backgroundColor;
		if (e && e !== "transparent" && !/,\s*0\)$/.test(e)) return e;
	}
	return "Canvas";
}
function _c(e, t, n) {
	if (!e.value || e.matches(":focus")) return null;
	let { shown: r, marks: i } = n(e.value, t);
	if (r === e.value && !i.length) return null;
	let a = e.getBoundingClientRect();
	if (!hc(e, a, t)) return null;
	let o = t.defaultView, s = o.getComputedStyle(e), [c, l, u, d] = [
		s.borderTopWidth,
		s.borderRightWidth,
		s.borderBottomWidth,
		s.borderLeftWidth
	].map(parseFloat), f = e.tagName === "TEXTAREA";
	return {
		x: a.left + d,
		y: a.top + c,
		w: a.width - d - l,
		h: a.height - c - u,
		red: i.length > 0,
		text: r,
		css: `font:${s.font};color:${s.color};letter-spacing:${s.letterSpacing};text-align:${s.textAlign};padding:${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft};background:${gc(e, o)};display:flex;overflow:hidden;align-items:${f ? "flex-start" : "center"};white-space:${f ? "pre-wrap" : "pre"}`
	};
}
function vc(e, t) {
	let n = [], r = e.createRange();
	for (let [i, a] of t) {
		let t = i.parentElement ?? i.parentNode?.host;
		if (i.ownerDocument === e && i.isConnected && t) {
			for (let [o, s] of a) if (!(s > i.data.length)) {
				r.setStart(i, o), r.setEnd(i, s);
				for (let i of r.getClientRects()) hc(t, i, e) && n.push({
					x: i.left,
					y: i.top,
					w: i.width,
					h: i.height,
					red: !0
				});
			}
		}
	}
	return n;
}
function yc(e) {
	let t = dc.get(e);
	return t || (t = e.createElement("div"), t.setAttribute(cc, ""), t.setAttribute("popover", "manual"), t.style.cssText = uc, dc.set(e, t)), t.isConnected || e.documentElement.append(t), t;
}
function bc(e, t, n, r) {
	for (let i of e) {
		let e = vc(i, t);
		for (let t of n) {
			let n = t.ownerDocument === i ? _c(t, i, r) : null;
			n && e.push(n);
		}
		let a = JSON.stringify(e);
		if (a === (fc.get(i) ?? "[]")) continue;
		fc.set(i, a);
		let o = yc(i);
		o.replaceChildren(...e.map((e) => {
			let t = i.createElement("div");
			return t.style.cssText = `position:fixed;left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;box-sizing:border-box;${e.red ? `outline:${lc};` : ""}${e.css ?? ""}`, e.text !== void 0 && (t.textContent = e.text), t;
		})), o.showPopover && (o.matches(":popover-open") && o.hidePopover(), e.length && o.showPopover());
	}
}
//#endregion
//#region src/swap/dom.ts
var xc = [
	"title",
	"aria-label",
	"placeholder"
], Sc = "data-swap", Cc = /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/, wc = /^(|text|search|email|tel|url|number)$/, Tc = 1, Ec = 3, Dc = null, Oc = null, kc = 0, Ac = /* @__PURE__ */ new Map(), jc = /* @__PURE__ */ new Set(), Mc = /* @__PURE__ */ new WeakMap(), Nc = /* @__PURE__ */ new WeakMap(), Pc = /* @__PURE__ */ new WeakSet(), Fc = /* @__PURE__ */ new WeakSet(), Ic = /* @__PURE__ */ new WeakSet(), Lc = [];
function Rc(e, t) {
	if (!Dc || t.documentElement?.getAttribute(Sc) === "off") return {
		shown: e,
		marks: []
	};
	let n = "", r = 0, i = [];
	for (let [t, a, o, s] of Dc.spans(e)) {
		let c = Oc !== null && s === 0;
		n += e.slice(r, t);
		let l = n.length;
		n += c && !Oc.replace ? e.slice(t, a) : o, c && i.push([l, n.length]), r = a;
	}
	return {
		shown: r ? n + e.slice(r) : e,
		marks: i
	};
}
function zc(e) {
	return !Cc.test(e.tagName) && !e.isContentEditable && !e.hasAttribute("data-swap-layer");
}
function Bc(e, t, n, r) {
	if (t && t.gen === kc && e === t.shown) return;
	let i = t && e === t.shown ? t.real : e, { shown: a, marks: o } = Rc(i, n);
	return r?.push(...o), a === i && !t ? void 0 : {
		real: i,
		shown: a,
		gen: kc
	};
}
function Vc(e) {
	let t = e.parentNode;
	if (!t || t.nodeType === Tc && !zc(t)) return;
	let n = Mc.get(e);
	if (n && n.gen === kc && e.data === n.shown) return;
	let r = [], i = Bc(e.data, n, e.ownerDocument, r);
	r.length ? Ac.set(e, r) : Ac.delete(e), i && (Mc.set(e, i), e.data !== i.shown && (e.data = i.shown));
}
function Hc(e, t) {
	let n = e.getAttribute(t);
	if (n === null) return;
	let r = Nc.get(e), i = Bc(n, r?.get(t), e.ownerDocument);
	i && (r ? r.set(t, i) : Nc.set(e, /* @__PURE__ */ new Map([[t, i]])), n !== i.shown && e.setAttribute(t, i.shown));
}
function Uc(e) {
	if (e.nodeType === Ec) return Vc(e);
	if (e.nodeType === Tc) {
		let t = e;
		if ((t.tagName === "TEXTAREA" || t.tagName === "INPUT" && wc.test(t.type)) && jc.add(t), !zc(t)) return;
		for (let e of xc) t.hasAttribute(e) && Hc(t, e);
		t.shadowRoot && Xc(t.shadowRoot), t.tagName === "IFRAME" && Zc(t);
	}
	for (let t = e.firstChild; t; t = t.nextSibling) Uc(t);
}
function Wc(e) {
	return !!(e.nodeType === Tc ? e : e.parentElement)?.closest(`[${cc}]`);
}
function Gc(e) {
	let t = !1;
	for (let n of e) Wc(n.target) || (t = !0, n.type === "characterData" ? Vc(n.target) : n.type === "childList" ? n.addedNodes.forEach(Uc) : n.attributeName === Sc ? (kc++, Uc(n.target.ownerDocument ?? n.target)) : Hc(n.target, n.attributeName));
	t && qc();
}
var Kc = !1;
function qc() {
	Kc || (Kc = !0, requestAnimationFrame(() => {
		Kc = !1;
		for (let e of [...jc]) e.isConnected || jc.delete(e);
		bc(Lc.map((e) => e.deref()).filter((e) => !!e), Ac, jc, (e, t) => Rc(e, t));
	}));
}
var Jc = [
	"scroll",
	"resize",
	"focusin",
	"focusout",
	"input",
	"transitionend",
	"animationend"
], Yc = (e) => Jc.forEach((t) => e.addEventListener(t, qc, {
	capture: !0,
	passive: !0
}));
function Xc(e) {
	Pc.has(e) || (Pc.add(e), new MutationObserver(Gc).observe(e, {
		subtree: !0,
		childList: !0,
		characterData: !0,
		attributes: !0,
		attributeFilter: [...xc, Sc]
	}), e.nodeType !== 9 && Yc(e)), Uc(e);
}
function Zc(e) {
	let t = () => {
		try {
			e.contentWindow?.document && Qc(e.contentWindow);
		} catch {}
	};
	Ic.has(e) || (Ic.add(e), e.addEventListener("load", t)), t();
}
function Qc(e) {
	if (!Fc.has(e)) {
		Fc.add(e);
		let t = e.Element.prototype, n = t.attachShadow;
		t.attachShadow = function(e) {
			let t = n.call(this, e);
			return Xc(t), t;
		}, Lc.push(new WeakRef(e.document)), Yc(e);
	}
	Xc(e.document);
}
function $c(e, t, n = window) {
	let r = t ? [t, ...e] : e;
	if (!r.length && !Dc) return;
	let i = r.length ? new sc(r) : null;
	for (let [e, t] of i?.errors ?? []) console.warn(`CASA-MIA SWAP: rule ${e + 1} left out: ${t}`);
	Dc = i, Oc = t, kc++, Ac.clear(), Qc(n);
	for (let e of [...Lc]) {
		let t = e.deref();
		t ? Uc(t) : Lc.splice(Lc.indexOf(e), 1);
	}
	qc();
}
//#endregion
//#region src/swap/index.ts
hi("the screenshot swap", ({ conn: e }) => e.subscribeMessage((e) => $c(e.rules ?? [], e.draft ?? null), { type: "casa_mia/swap/subscribe" }).catch((e) => console.warn("CASA-MIA SWAP: the integration doesn't offer the swap:", e)));
//#endregion
//#region src/talk-tile/common.ts
var el = [
	"talk",
	"ringing",
	"hang_up",
	"answered_elsewhere"
], tl = ["hold", "live"], nl = {
	talk: "mdi:microphone",
	ringing: "mdi:bell-ring",
	hang_up: "mdi:phone-hangup",
	answered_elsewhere: "mdi:microphone-off",
	hold: "mdi:microphone",
	live: "mdi:microphone"
}, rl = { live: "red" };
function il(e, t) {
	return Hr(e, t) ? {
		look: "hang_up",
		name: K.hang_up
	} : e?.state === "answered" ? {
		look: "answered_elsewhere",
		name: `Answered by ${e.attributes.answered_by ?? "someone"}`
	} : e?.state === "ringing" ? {
		look: "ringing",
		name: null
	} : {
		look: "talk",
		name: null
	};
}
var al = { action: "none" };
function ol(e, t, n, r = "off") {
	let { type: i, commander: a, icons: o, colors: s, button: c, duplex: l, ...u } = e, d = c === "hold", { look: f, name: p, enabled: m } = d ? Br(r) : {
		...il(t, n),
		enabled: !0
	}, h = d ? al : e.tap_action ?? {
		action: "fire-dom-event",
		casa_mia_commander: Ur("toggle", {
			entity: a,
			duplex: l,
			call: e.entity
		})
	}, g = m ? s?.[f] ?? e.color ?? rl[f] : "disabled", _ = {
		...u,
		type: "tile",
		name: p ?? e.name ?? (d ? K.hold : zr(l === "half")),
		icon: e.icon ?? o?.[f] ?? nl[f],
		tap_action: h,
		icon_tap_action: d ? al : e.icon_tap_action ?? h
	};
	return d && Object.assign(_, {
		hold_action: al,
		double_tap_action: al
	}), g ? _.color = g : delete _.color, _;
}
var sl = {
	button: "answer",
	duplex: "full",
	vertical: !1,
	hide_state: !1,
	features_position: "bottom"
};
function cl(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) if (r !== void 0 && r !== "" && r !== null && !(n in sl && JSON.stringify(r) === JSON.stringify(sl[n]))) {
		if (n === "icons" || n === "colors") {
			let e = Object.fromEntries(Object.entries(r).filter(([, e]) => e !== void 0 && e !== ""));
			Object.keys(e).length && (t[n] = e);
			continue;
		}
		t[n] = r;
	}
	return t;
}
//#endregion
//#region src/talk-tile/card.ts
var ll = class extends HTMLElement {
	constructor() {
		super(), this.shown = "", this.talk = "off", this.down = (e) => {
			this.holding() && Br(this.talk).enabled && (e.preventDefault(), this.setPointerCapture(e.pointerId), this.order("press"));
		}, this.up = () => this.holding() && this.order("release"), this.addEventListener("pointerdown", this.down), this.addEventListener("pointerup", this.up), this.addEventListener("pointercancel", this.up), this.addEventListener("contextmenu", (e) => this.holding() && e.preventDefault());
	}
	connectedCallback() {
		this.style.display = "block", this.style.height = "100%", this.listen();
	}
	disconnectedCallback() {
		this.unfollow?.(), this.unfollow = void 0;
	}
	listen() {
		this.unfollow?.(), this.unfollow = this.isConnected ? ti(window, this.config?.commander, (e) => {
			this.talk = e, this.follow();
		}) : void 0;
	}
	holding() {
		return this.config?.button === "hold";
	}
	hostStyle() {
		let e = this.holding();
		for (let [t, n] of Object.entries(Gr)) this.style.setProperty(t, e ? n : "");
	}
	order(e) {
		this.dispatchEvent(new CustomEvent("ll-custom", {
			bubbles: !0,
			composed: !0,
			detail: { casa_mia_commander: Ur(e, { entity: this.config?.commander }) }
		}));
	}
	static getStubConfig(e) {
		return { entity: _r(e)[0] ?? "" };
	}
	static getConfigElement() {
		return document.createElement("casa-mia-talk-tile-editor");
	}
	setConfig(e) {
		if (!e.entity) throw Error("Choose the doorbell's call sensor (entity).");
		let t = this.config?.commander;
		this.config = e, e.commander !== t && this.listen(), this.hostStyle(), this.follow();
	}
	set hass(e) {
		this._hass = e, this.follow();
	}
	getCardSize() {
		return this.tile?.getCardSize?.() ?? 1;
	}
	getGridOptions() {
		return this.tile?.getGridOptions?.() ?? {
			columns: 6,
			rows: this.config?.vertical ? 2 : 1
		};
	}
	follow() {
		let e = this._hass;
		if (!this.config || !e) return;
		if (!this.helpers) {
			window.loadCardHelpers().then((e) => {
				this.helpers = e, this.follow();
			}, (e) => console.error(`CASA-MIA CARDS: the Talk tile can't load HA's card helpers: ${e}`));
			return;
		}
		let t = ol(this.config, e.states[this.config.entity], e.user?.name, this.talk), n = JSON.stringify(t);
		n !== this.shown && (this.shown = n, this.place(t)), this.tile.hass = e;
	}
	place(e) {
		try {
			if (this.tile?.localName !== "hui-tile-card") throw Error("no tile yet");
			this.tile.setConfig(e);
		} catch {
			this.tile = this.helpers.createCardElement(e), this.replaceChildren(this.tile);
		}
	}
}, ul = {
	talk: K.talk,
	ringing: "Ringing",
	hang_up: K.hang_up,
	answered_elsewhere: "Answered elsewhere",
	hold: K.hold,
	live: K.live
}, dl = { action: "fire-dom-event" }, fl = (e) => ({ select: {
	mode: "list",
	options: e
} }), pl = (e, t) => [
	{
		name: "entity",
		required: !0,
		selector: { entity: { include_entities: _r(e) } }
	},
	{
		name: "commander",
		selector: { select: {
			mode: "dropdown",
			options: gr(e)
		} }
	},
	{
		name: "button",
		selector: fl([{
			value: "answer",
			label: "Answer: answers the call, and hangs up"
		}, {
			value: "hold",
			label: "Hold to talk: your voice goes out only while held, on the device that answered in half duplex"
		}])
	},
	...t ? [] : [{
		name: "duplex",
		selector: fl(Wr)
	}],
	{
		type: "grid",
		name: "",
		schema: [{
			name: "name",
			selector: { text: {} }
		}, {
			name: "icon",
			selector: { icon: {} }
		}]
	},
	{
		name: "color",
		selector: { ui_color: {} }
	},
	{
		type: "expandable",
		name: "colors",
		title: "Colour for each state",
		schema: (t ? tl : el).map((e) => ({
			name: e,
			selector: { ui_color: {} }
		}))
	},
	{
		type: "expandable",
		name: "icons",
		title: "Icon for each state",
		schema: (t ? tl : el).map((e) => ({
			name: e,
			selector: { icon: { placeholder: nl[e] } }
		}))
	},
	{
		type: "expandable",
		name: "",
		title: "Layout",
		flatten: !0,
		schema: [
			{
				name: "vertical",
				selector: { boolean: {} }
			},
			{
				name: "hide_state",
				selector: { boolean: {} }
			},
			{
				name: "features_position",
				selector: { select: {
					mode: "dropdown",
					options: [{
						value: "bottom",
						label: "Bottom"
					}, {
						value: "inline",
						label: "Inline"
					}]
				} }
			}
		]
	},
	...t ? [] : [{
		type: "expandable",
		name: "",
		title: "Interactions",
		flatten: !0,
		schema: [{
			name: "tap_action",
			selector: { ui_action: { default_action: dl } }
		}, {
			name: "icon_tap_action",
			selector: { ui_action: { default_action: dl } }
		}]
	}]
], ml = {
	entity: "Call sensor",
	commander: "Commander",
	button: "Button",
	duplex: "Talking",
	name: "Name",
	icon: "Icon",
	color: "Colour",
	vertical: "Vertical",
	hide_state: "Hide state",
	features_position: "Features position",
	tap_action: "Tap action",
	icon_tap_action: "Icon tap action",
	...ul
}, hl = {
	entity: "The doorbell's Casa Mia Intercom call sensor.",
	commander: "Only that Commander card talks. Empty: every Commander card on the page showing the doorbell.",
	name: "Replaces \"Talk\", \"Answer\" or \"Hold to talk\". \"Hang up\", \"Answered by …\" and \"Live\" always show, as they say what is happening.",
	icon: "Empty: an icon for each state (below). Set: this one in every state.",
	color: "One colour in every state. Empty: the tile's own colouring, or a colour for each state (below).",
	tap_action: "Empty: Talk on or off for the doorbell's Commander card.",
	icon_tap_action: "Empty: the same as the tap action."
}, gl = class extends V {
	static {
		this.properties = {
			hass: { attribute: !1 },
			_config: { state: !0 }
		};
	}
	setConfig(e) {
		this._config = e;
	}
	render() {
		return !this.hass || !this._config ? B : z`<ha-form
      .hass=${this.hass}
      .data=${{
			...sl,
			...this._config
		}}
      .schema=${pl(this.hass, this._config.button === "hold")}
      .computeLabel=${(e) => ml[e.name] ?? e.title}
      .computeHelper=${(e) => hl[e.name]}
      @value-changed=${(e) => {
			e.stopPropagation(), this._config = cl(e.detail.value), t(this, "config-changed", { config: this._config });
		}}
    ></ha-form>`;
	}
};
c("casa-mia-talk-tile", ll), c("casa-mia-talk-tile-editor", gl), l("casa-mia-talk-tile", "Casa Mia Talk tile", "A tile for a doorbell's call: Talk, Hang up or Answered by …, as a tap here would do.");
//#endregion
//#region src/guest-goodbye.ts
var _l = 1e3, vl = (e, t) => e.state === "on" && !(e.attributes.closes_at && t / 1e3 >= e.attributes.closes_at);
function yl(e, t, n, r, i) {
	if (!t || t.is_admin) return null;
	let a = Object.values(e).filter((e) => e.entity_id.startsWith("switch.") && e.attributes?.guest_user_id === t.id), o = a.find((e) => e.attributes.signs_out && n.get(e.entity_id) === !0 && !vl(e, r));
	for (let e of a) n.set(e.entity_id, vl(e, r));
	if (!o || a.some((e) => vl(e, r))) return null;
	let s = o.attributes;
	return s.goodbye_url || `http://${i}:${s.guest_port ?? 8675}/bye`;
}
function bl() {
	let e = /* @__PURE__ */ new Map();
	setInterval(() => {
		let t = document.querySelector("home-assistant")?.hass;
		if (!t?.states) return;
		let n = yl(t.states, t.user, e, Date.now(), location.hostname);
		n && (console.info("CASA-MIA CARDS: this guest's endpoint closed; going to the goodbye page"), location.replace(n));
	}, _l);
}
console.info(`%cCASA-MIA CARDS\n%ccommander, tablet layout (${ur})`, "color: green; font-weight: bold;", ""), gi("Casa Mia", "casa_mia/cards", ur), bi(`cm-cards.js ${ur}`), bl();
//#endregion
