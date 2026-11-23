//#region src/connection.ts
var e = 6e4, t = [
	"pointerdown",
	"keydown",
	"wheel"
];
function n(e, t) {
	let n = (t) => console.error(`CASA-MIA CARDS: ${e} won't work: ${t}`), r = () => {
		let e = window.hassConnection;
		return e?.then(t, (e) => n(`Home Assistant's connection failed (${e})`)), !!e;
	};
	if (r()) return;
	let i = 600, a = setInterval(() => {
		r() ? clearInterval(a) : --i === 0 && (clearInterval(a), n("Home Assistant's connection never appeared"));
	}, 100);
}
function r(e, t, r, i) {
	r !== "dev" && n(`${e}'s offer to reload after an update`, ({ conn: n }) => {
		n.addEventListener("ready", () => n.sendMessagePromise({ type: t }).then(({ version: t }) => {
			t && t !== r && (console.warn(`CASA-MIA CARDS: ${e} ${r} running, ${t} served: reload to update`), document.querySelector("home-assistant")?.dispatchEvent(new CustomEvent("hass-notification", {
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
			})), i && a(e, i));
		}, () => {}));
	});
}
var i = !1;
function a(n, r) {
	if (i) return;
	i = !0;
	let a, o = () => {
		clearTimeout(a), a = setTimeout(() => {
			r() && (console.warn(`CASA-MIA CARDS: ${n} reloading itself to update, untouched for ${e / 1e3} s`), location.reload());
		}, e);
	};
	for (let e of t) window.addEventListener(e, o, {
		capture: !0,
		passive: !0
	});
	o();
}
var o = {
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
function s(e, t, n) {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}
var c = /* @__PURE__ */ new Set();
function l(e) {
	c.has(e) || console.warn(`CASA-MIA CARDS: ${e}`), c.add(e);
}
function u(e) {
	history.pushState(null, "", e), s(window, "location-changed", { replace: !1 });
}
async function d() {
	customElements.get("ha-form") || (await (await (await window.loadCardHelpers()).createCardElement({
		type: "entities",
		entities: []
	})).constructor.getConfigElement?.(), await customElements.whenDefined("ha-form"));
}
function f(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function ee(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !0,
		documentationURL: "https://github.com/gazoodle/casa-mia-sensor-watch"
	});
}
var te = o.main, ne = o.panel;
({
	...te,
	...ne
});
var re = (e) => e.parentElement ?? (e.getRootNode().host || null);
function p(e) {
	for (let t = e; t; t = re(t)) if (t.tagName === "HUI-CARD-PICKER") return !0;
	return !1;
}
function ie(e, t) {
	return Object.fromEntries(Object.entries(e).filter(([e, n]) => !(e in t) || JSON.stringify(n) !== JSON.stringify(t[e])));
}
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var m = globalThis, h = m.ShadowRoot && (m.ShadyCSS === void 0 || m.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, g = Symbol(), ae = /* @__PURE__ */ new WeakMap(), oe = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== g) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (h && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = ae.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && ae.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, _ = (e) => new oe(typeof e == "string" ? e : e + "", void 0, g), se = (e, ...t) => new oe(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, g), ce = (e, t) => {
	if (h) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = m.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, le = h ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return _(t);
})(e) : e, { is: ue, defineProperty: de, getOwnPropertyDescriptor: fe, getOwnPropertyNames: pe, getOwnPropertySymbols: me, getPrototypeOf: he } = Object, v = globalThis, ge = v.trustedTypes, _e = ge ? ge.emptyScript : "", ve = v.reactiveElementPolyfillSupport, y = (e, t) => e, b = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? _e : null;
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
}, ye = (e, t) => !ue(e, t), be = {
	attribute: !0,
	type: String,
	converter: b,
	reflect: !1,
	useDefault: !1,
	hasChanged: ye
};
Symbol.metadata ??= Symbol("metadata"), v.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var x = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = be) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && de(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = fe(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? be;
	}
	static _$Ei() {
		if (this.hasOwnProperty(y("elementProperties"))) return;
		let e = he(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(y("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(y("properties"))) {
			let e = this.properties, t = [...pe(e), ...me(e)];
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
			for (let e of n) t.unshift(le(e));
		} else e !== void 0 && t.push(le(e));
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
		return ce(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? b : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? b : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ye)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
x.elementStyles = [], x.shadowRootOptions = { mode: "open" }, x[y("elementProperties")] = /* @__PURE__ */ new Map(), x[y("finalized")] = /* @__PURE__ */ new Map(), ve?.({ ReactiveElement: x }), (v.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var S = globalThis, xe = (e) => e, C = S.trustedTypes, Se = C ? C.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, Ce = "$lit$", w = `lit$${Math.random().toFixed(9).slice(2)}$`, we = "?" + w, Te = `<${we}>`, T = document, E = () => T.createComment(""), D = (e) => e === null || typeof e != "object" && typeof e != "function", O = Array.isArray, Ee = (e) => O(e) || typeof e?.[Symbol.iterator] == "function", k = "[ 	\n\f\r]", A = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, De = /-->/g, Oe = />/g, j = RegExp(`>|${k}(?:([^\\s"'>=/]+)(${k}*=${k}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ke = /'/g, Ae = /"/g, je = /^(?:script|style|textarea|title)$/i, Me = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), M = Me(1), Ne = Me(2), N = Symbol.for("lit-noChange"), P = Symbol.for("lit-nothing"), Pe = /* @__PURE__ */ new WeakMap(), F = T.createTreeWalker(T, 129);
function Fe(e, t) {
	if (!O(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return Se === void 0 ? t : Se.createHTML(t);
}
var Ie = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = A;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === A ? c[1] === "!--" ? o = De : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = j) : (je.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = j) : o = Oe : o === j ? c[0] === ">" ? (o = i ?? A, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? j : c[3] === "\"" ? Ae : ke) : o === Ae || o === ke ? o = j : o === De || o === Oe ? o = A : (o = j, i = void 0);
		let d = o === j && e[t + 1].startsWith("/>") ? " " : "";
		a += o === A ? n + Te : l >= 0 ? (r.push(s), n.slice(0, l) + Ce + n.slice(l) + w + d) : n + w + (l === -2 ? t : d);
	}
	return [Fe(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, I = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Ie(t, n);
		if (this.el = e.createElement(l, r), F.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = F.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(Ce)) {
					let t = u[o++], n = i.getAttribute(e).split(w), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Re : r[1] === "?" ? ze : r[1] === "@" ? Be : z
					}), i.removeAttribute(e);
				} else e.startsWith(w) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (je.test(i.tagName)) {
					let e = i.textContent.split(w), t = e.length - 1;
					if (t > 0) {
						i.textContent = C ? C.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], E()), F.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], E());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === we) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(w, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += w.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = T.createElement("template");
		return n.innerHTML = e, n;
	}
};
function L(e, t, n = e, r) {
	if (t === N) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = D(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = L(e, i._$AS(e, t.values), i, r)), t;
}
var Le = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? T).importNode(t, !0);
		F.currentNode = r;
		let i = F.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new R(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ve(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = F.nextNode(), a++);
		}
		return F.currentNode = T, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, R = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = P, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = L(this, e, t), D(e) ? e === P || e == null || e === "" ? (this._$AH !== P && this._$AR(), this._$AH = P) : e !== this._$AH && e !== N && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? Ee(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== P && D(this._$AH) ? this._$AA.nextSibling.data = e : this.T(T.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = I.createElement(Fe(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Le(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Pe.get(e.strings);
		return t === void 0 && Pe.set(e.strings, t = new I(e)), t;
	}
	k(t) {
		O(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(E()), this.O(E()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = xe(e).nextSibling;
			xe(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, z = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = P, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = P;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = L(this, e, t, 0), a = !D(e) || e !== this._$AH && e !== N, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = L(this, r[n + o], t, o), s === N && (s = this._$AH[o]), a ||= !D(s) || s !== this._$AH[o], s === P ? e = P : e !== P && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === P ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Re = class extends z {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === P ? void 0 : e;
	}
}, ze = class extends z {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== P);
	}
}, Be = class extends z {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = L(this, e, t, 0) ?? P) === N) return;
		let n = this._$AH, r = e === P && n !== P || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== P && (n === P || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ve = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		L(this, e);
	}
}, He = S.litHtmlPolyfillSupport;
He?.(I, R), (S.litHtmlVersions ??= []).push("3.3.3");
var Ue = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new R(t.insertBefore(E(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, B = globalThis, V = class extends x {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ue(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return N;
	}
};
V._$litElement$ = !0, V.finalized = !0, B.litElementHydrateSupport?.({ LitElement: V });
var We = B.litElementPolyfillSupport;
We?.({ LitElement: V }), (B.litElementVersions ??= []).push("4.2.2");
var H = _(".cm-pill, .cm-chip {\n  --surface: var(--card-background-color, #fff);\n  --muted: var(--secondary-text-color, #727272);\n  --accent: var(--primary-color, #03a9f4);\n  --on-accent: var(--text-primary-color, #fff);\n  --good: var(--success-color, #43a047);\n  --warn: var(--warning-color, #ffa600);\n  --bad: var(--error-color, #db4437);\n  --bark: #d8885a;\n  --mono: var(--ha-font-family-code, monospace);\n}\n.cm-pill{box-sizing:border-box;background:color-mix(in srgb, var(--tone,var(--muted)) 14%, transparent);max-width:100%;color:var(--tone,var(--muted));letter-spacing:.04em;text-transform:uppercase;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;border-radius:12px;padding:3px 9px;font-size:10px;font-weight:600;line-height:16px;display:inline-block;overflow:hidden}.cm-pill.cm-filled{background:var(--tone,var(--muted));color:var(--on-accent)}.cm-pill.cm-outline{box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--tone,var(--muted)) 55%, transparent);background:0 0}.cm-pill.cm-fixed{text-align:center;width:104px}.cm-chip{box-sizing:border-box;box-shadow:inset 0 0 0 1px var(--tone,var(--muted));background:var(--surface);color:var(--tone,var(--muted));font:inherit;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;cursor:pointer;border:none;border-radius:12px;justify-content:center;align-items:center;gap:4px;padding:3px 10px;font-size:10px;font-weight:500;line-height:16px;transition:box-shadow .15s,filter .15s;display:inline-flex}.cm-chip.cm-on{box-shadow:none;background:var(--tone,var(--accent));color:var(--on-accent)}.cm-chip.cm-icon{border-radius:50%;width:26px;height:26px;padding:4px}.cm-chip.cm-icon svg{fill:currentColor;width:16px;height:16px;display:block}.cm-chip.cm-mono{font:11px/14px var(--mono);letter-spacing:0;text-transform:none;border-radius:8px;padding:1px 6px}.cm-chip.cm-quiet{box-shadow:none;background:color-mix(in srgb, var(--surface) 80%, transparent);color:var(--muted)}.cm-chip:disabled{opacity:.4;cursor:default}.cm-chip:not(:disabled):hover,.cm-chip:focus-visible{box-shadow:inset 0 0 0 1px var(--tone,var(--muted)), 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent);filter:brightness(1.08);outline:none}.cm-chip.cm-on:not(:disabled):hover,.cm-chip.cm-on:focus-visible,.cm-chip.cm-quiet:not(:disabled):hover{box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent)}.cm-good{--tone:var(--good)}.cm-accent{--tone:var(--accent)}.cm-warn{--tone:var(--warn)}.cm-bad{--tone:var(--bad)}.cm-muted{--tone:var(--muted)}.cm-bark{--tone:var(--bark)}"), U = "casa_mia_sensor_watch", Ge = U, Ke = {
	domain: U,
	service: "list"
}, qe = [
	["1 day", 1],
	["1 week", 7],
	["30 days", 30]
], Je = new URL(import.meta.url).searchParams.get("v") || "dev", Ye = `${U}/cards`;
function Xe(e) {
	return e.platform === U;
}
var Ze = [
	"task",
	"warning",
	"error",
	"critical"
], Qe = [
	"level",
	"state",
	"none"
], $e = [
	"icon",
	"level",
	"name",
	"message",
	"value",
	"since"
], W = {
	levels: [...Ze],
	max: 20,
	when_clear: "hide",
	clear_message: "All well.",
	show: $e.filter((e) => e !== "icon"),
	icon_color: "level",
	snooze: !1
};
function et(e) {
	let t = e.map((e) => e === "name" || e === "message" ? "what" : e);
	return t.filter((e, n) => t.indexOf(e) === n);
}
var tt = {
	icon: "24px",
	level: "72px",
	what: "minmax(0, 1fr)",
	name: "",
	message: "",
	value: "auto",
	since: "auto"
};
function nt(e) {
	return et(e).map((e) => tt[e]).join(" ");
}
var rt = [
	"off",
	"closed",
	"locked",
	"idle",
	"standby",
	"docked",
	"not_home",
	"unavailable",
	"unknown"
];
function it(e, t, n) {
	let r = e.split(".")[0], i = rt.includes(t) ? "inactive" : "active", a = [
		...n ? [`--state-${r}-${n}-${t}-color`] : [],
		`--state-${r}-${t}-color`,
		`--state-${r}-${i}-color`
	], o = i === "inactive" ? "var(--state-inactive-color)" : "var(--state-icon-color)";
	return a.reduceRight((e, t) => `var(${t}, ${e})`, o);
}
function at(e) {
	return !!e.entity_id && !/^(integration|homeassistant)\./.test(e.entity_id);
}
function ot(e) {
	return !e.snoozed && !!e.level && e.level !== "critical" && e.level !== "nominal";
}
function st(e, t = !1) {
	return e.sensors?.length || t && ot(e) ? "unfold" : at(e) ? "details" : void 0;
}
function ct(e, t) {
	if (e.length !== 1) return `${e.length} snoozed`;
	let [n] = e, r = ut(n.since, t);
	return `1 snoozed until ${J(Date.parse(n.snoozed.until), t)}: ${n.name}, ${n.level} ${r === "now" ? "just now" : `for ${r}`}`;
}
function lt(e, t) {
	let n = e ? Date.parse(e) : NaN;
	return Number.isNaN(n) ? t ? `${t} days` : "" : new Date(n).toLocaleDateString(void 0, {
		day: "numeric",
		month: "short"
	});
}
function ut(e, t) {
	let n = Math.max(0, (t - Date.parse(e)) / 1e3);
	return n < 60 ? "now" : n < 3600 ? `${Math.floor(n / 60)} min` : n < 86400 ? `${Math.floor(n / 3600)} h` : `${Math.floor(n / 86400)} d`;
}
var dt = `${U}/entity`;
function ft(e, t, n) {
	let r = e.subscribeMessage((e) => "error" in e ? n(void 0, e.error) : n(e), {
		type: dt,
		entity_id: t
	});
	return r.catch((e) => {
		e?.code !== "unknown_command" && e?.code !== "not_running" && console.warn(`CASA-MIA CARDS: can't ask Sensor Watch about ${t} (${e?.message ?? e})`), n(void 0, e?.code === "unknown_command" ? "Sensor Watch isn't set up in Home Assistant" : e?.message ?? String(e));
	}), () => void r.then((e) => e()).catch(() => {});
}
var pt = "sensor-watch", G = (e, t) => `/${pt}?watch=${encodeURIComponent(e)}&at=${t}`, mt = {
	nominal: "var(--success-color, #43a047)",
	task: "var(--info-color, #039be5)",
	warning: "var(--warning-color, #ffa600)",
	error: "var(--error-color, #db4437)",
	critical: "var(--error-color, #db4437)"
};
function ht(e, t) {
	let n = e && t?.[e.entity_id];
	if (n?.platform === "casa_mia_sensor_watch" && n?.translation_key === "status") return mt[e.state];
}
function gt(e, t, n) {
	if (!e) return;
	let r = t.attribute ? e.attributes?.[t.attribute] : e.state;
	if (r == null || r === "") return;
	if (t.days_until) {
		let e = Date.parse(String(r));
		return Number.isNaN(e) ? void 0 : (e - n) / 864e5;
	}
	let i = Number(r);
	return Number.isNaN(i) ? void 0 : i;
}
function _t(e, t = {}) {
	let n = e.flatMap((e) => [e.from, e.to]).filter((e) => e !== null), [r, i] = [0, 100];
	if (t.unit !== "%" && n.length) {
		r = Math.min(...n), i = Math.max(...n);
		let t = (i - r) / 2 || Math.abs(r) / 2 || 1, a = (t) => i === r || e.some((e) => e[t] === null);
		a("from") && (r -= t), a("to") && (i += t);
	}
	return r = t.min ?? r, i = t.max ?? i, i > r ? [r, i] : [r, r + 1];
}
function K(e, [t, n]) {
	return Math.min(1, Math.max(0, (e - t) / (n - t)));
}
function vt(e, t) {
	return e.map((e) => ({
		from: K(e.from ?? t[0], t),
		to: K(e.to ?? t[1], t),
		level: e.level
	})).filter((e) => e.to > e.from);
}
var q = {
	cx: 100,
	cy: 100,
	r: 80
};
function yt(e, t) {
	let n = (e) => {
		let t = Math.PI * (1 - e);
		return `${(q.cx + q.r * Math.cos(t)).toFixed(1)} ${(q.cy - q.r * Math.sin(t)).toFixed(1)}`;
	};
	return `M ${n(e)} A ${q.r} ${q.r} 0 0 1 ${n(t)}`;
}
var bt = (e) => String(Number(e.toPrecision(4)));
function J(e, t) {
	let n = new Date(e), r = n.toLocaleTimeString(void 0, {
		hour: "2-digit",
		minute: "2-digit"
	});
	return new Date(t).toDateString() === n.toDateString() ? r : `${n.toLocaleDateString(void 0, {
		day: "numeric",
		month: "short"
	})} ${r}`;
}
//#endregion
//#region src/sensor-watch/card.ts
var xt = 300, Y = "snoozed", X = (e) => (/* @__PURE__ */ new Date(Date.now() - e * 36e5)).toISOString(), St = [
	{
		entity_id: "",
		name: "Plug 3 voltage",
		level: "critical",
		value: "198 V",
		message: "Mains far too low: under 207 V",
		since: X(3)
	},
	{
		entity_id: "",
		name: "Freezer",
		level: "warning",
		value: "-12 °C",
		message: "Freezer too warm: check the door and seal",
		since: X(1)
	},
	{
		entity_id: "",
		name: "Softener salt",
		level: "task",
		value: "18 %",
		message: "Top up the salt",
		since: X(50)
	}
], Z = _(Object.entries(mt).map(([e, t]) => `.${e} { --cm-level: ${t}; }`).join("\n")), Ct = class extends V {
	constructor(...e) {
		super(...e), this._snoozed = [], this._editing = !1, this._open = /* @__PURE__ */ new Set(), this._seen = null;
	}
	static {
		this.properties = {
			_config: { state: !0 },
			_rows: { state: !0 },
			_snoozed: { state: !0 },
			_problem: { state: !0 },
			_refused: { state: !0 },
			_editing: { state: !0 },
			_open: { state: !0 }
		};
	}
	static getStubConfig() {
		return {};
	}
	static getConfigElement() {
		return document.createElement("casa-mia-sensor-watch-editor");
	}
	setConfig(e) {
		this._config = { ...e }, this._seen = null, this._hass && this._later();
	}
	connectedCallback() {
		super.connectedCallback(), this._hass && this._subscribe(this._hass);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unsubscribe?.then((e) => e()).catch(() => {}), this._unsubscribe = void 0;
	}
	_subscribe(e) {
		if (this._unsubscribe || !e.connection) return;
		let t = e.connection.subscribeEvents(() => {
			clearTimeout(this._timer), this._ask();
		}, Ge);
		this._unsubscribe = t, t.catch((e) => console.warn(`CASA-MIA CARDS: sensor watch: can't hear its event (${e})`));
	}
	set hass(e) {
		this._hass = e, this.isConnected && this._subscribe(e);
		let t = Object.entries(e.entities ?? {}).filter(([, e]) => Xe(e)).map(([t]) => `${t}@${e.states[t]?.last_updated ?? ""}`).join(",");
		t !== this._seen && (this._seen = t, this._later()), this.requestUpdate();
	}
	set preview(e) {
		this._editing = e, this._showOrHide();
	}
	set editMode(e) {
		this._editing = e, this._showOrHide();
	}
	_later() {
		clearTimeout(this._timer), this._timer = window.setTimeout(() => this._ask(), xt);
	}
	async _ask() {
		let e = this._hass, t = {
			...W,
			...this._config
		};
		if (e) {
			try {
				let n = await e.callWS({
					type: "call_service",
					...Ke,
					service_data: {
						levels: t.levels,
						...t.group ? { group: t.group } : {}
					},
					return_response: !0
				});
				this._rows = n?.response?.sensors ?? [], this._snoozed = n?.response?.snoozed ?? [], this._problem = void 0;
			} catch (e) {
				this._rows = [], this._snoozed = [], this._problem = `Sensor Watch isn't answering (${e?.message ?? e}): is it switched on in the Casa Mia app, and Home Assistant restarted since?`, console.warn(`CASA-MIA CARDS: sensor watch: ${this._problem}`);
			}
			this._showOrHide();
		}
	}
	async _snooze(e, t) {
		let n = {
			entity_id: e.entity_id,
			...t ? { duration: { days: t } } : {}
		};
		try {
			await this._hass?.callWS({
				type: "call_service",
				domain: U,
				service: t ? "snooze" : "unsnooze",
				service_data: n
			}), this._refused = void 0;
			let r = new Set(this._open);
			r.delete(e.entity_id), this._open = r, this._ask();
		} catch (n) {
			this._refused = `${e.name} wasn't ${t ? "snoozed" : "unsnoozed"}: ${n?.message ?? n}`, console.warn(`CASA-MIA CARDS: sensor watch: ${this._refused}`);
		}
	}
	_showOrHide() {
		let e = {
			...W,
			...this._config
		}, t = !this._editing && !(this.isConnected && p(this)) && !this._problem && this._rows !== void 0 && this._rows.length === 0 && this._snoozed.length === 0 && e.when_clear === "hide";
		t !== this.hidden && (this.hidden = t, s(this, "card-visibility-changed", { value: !t }));
	}
	getCardSize() {
		return 1 + Math.min(this._rows?.length ?? 1, {
			...W,
			...this._config
		}.max) + +!!this._snoozed.length;
	}
	getGridOptions() {
		return {
			columns: 12,
			rows: "auto"
		};
	}
	render() {
		if (!this._config) return P;
		let e = {
			...W,
			...this._config
		};
		if (p(this) && (this._problem !== void 0 || this._rows !== void 0 && !this._rows.length)) return M`<ha-card .header=${e.title || "Needs looking at"}>
        ${St.map((e) => this._row(e, e.value ?? "", Date.now()))}
        <p class="note">An example: hidden when all is well.</p>
      </ha-card>`;
		let t = (this._rows ?? []).slice(0, e.max), n = (this._rows?.length ?? 0) - t.length, r = Date.now();
		return M`<ha-card .header=${e.title || void 0}>
      ${this._problem ? M`<p class="note problem">${this._problem}</p>` : P}
      ${this._refused ? M`<p class="note problem">${this._refused}</p>` : P}
      ${!this._problem && this._rows && !t.length && (e.when_clear === "message" || !this._snoozed.length) ? M`<p class="note">${e.when_clear === "message" ? e.clear_message : "All well: nothing to list, so this card is hidden on the dashboard."}</p>` : P}
      ${t.map((t) => this._unfolding(t, r, e.snooze))}
      ${n > 0 ? M`<p class="note">and ${n} more</p>` : P}
      ${this._snoozed.length ? M`<button class="snoozed" aria-expanded=${String(this._open.has(Y))} @click=${() => this._toggle(Y)}>
              ${ct(this._snoozed, r)} ${this._open.has(Y) ? "▴" : "▾"}
            </button>
            ${this._open.has(Y) ? M`<div class="dim">${this._snoozed.map((t) => this._unfolding(t, r, e.snooze))}</div>` : P}` : P}
    </ha-card>`;
	}
	_unfolding(e, t, n) {
		let r = this._open.has(e.entity_id);
		return [
			this._live(e, t),
			e.snoozed ? M`<div class="acts">
            <span class="note">until ${J(Date.parse(e.snoozed.until), t)}${e.snoozed.by ? ` · snoozed by ${e.snoozed.by}` : ""}</span>
            ${n ? M`<button class="cm-chip" @click=${() => this._snooze(e)}>Unsnooze</button>` : P}
          </div>` : P,
			r && n && ot(e) ? M`<div class="acts">
            <span class="note">Snooze for</span>
            ${qe.map(([t, n]) => M`<button class="cm-chip" @click=${() => this._snooze(e, n)}>${t}</button>`)}
            ${at(e) ? M`<button class="cm-chip cm-quiet" @click=${() => s(this, "hass-more-info", { entityId: e.entity_id })}>Details</button>` : P}
          </div>` : P,
			r && e.sensors?.length ? M`<div class="under">${e.sensors.map((e) => this._live(e, t))}</div>` : P
		];
	}
	_live(e, t) {
		if (e.sensors?.length) return this._row(e, `${e.sensors.length} sensor${e.sensors.length === 1 ? "" : "s"} ${this._open.has(e.entity_id) ? "▴" : "▾"}`, t);
		let n = this._hass?.states[e.entity_id];
		if (e.days_until) return this._row(e, lt(e.attribute ? String(n?.attributes?.[e.attribute] ?? "") : n?.state, e.value), t);
		if (e.attribute) return this._row(e, String(n?.attributes?.[e.attribute] ?? e.value ?? ""), t);
		let r = n?.attributes?.unit_of_measurement ?? "", i = n && (this._hass?.formatEntityState?.(n) ?? `${n.state}${r ? ` ${r}` : ""}`);
		return this._row(e, i || (e.value ?? ""), t);
	}
	_tap(e) {
		let t = st(e, {
			...W,
			...this._config
		}.snooze);
		t === "details" && s(this, "hass-more-info", { entityId: e.entity_id }), t === "unfold" && this._toggle(e.entity_id);
	}
	_toggle(e) {
		let t = new Set(this._open);
		t.delete(e) || t.add(e), this._open = t;
	}
	_row(e, t, n) {
		let r = {
			...W,
			...this._config
		}, i = r.show, a = this._hass?.states[e.entity_id];
		return M`<button
      class="row ${e.level}"
      style="grid-template-columns:${nt(i)}"
      aria-expanded=${e.sensors?.length ? String(this._open.has(e.entity_id)) : P}
      @click=${() => this._tap(e)}
    >
      ${et(i).map((o) => {
			switch (o) {
				case "icon": {
					let t = r.icon_color === "level" ? "var(--cm-level)" : r.icon_color === "state" && a ? it(e.entity_id, a.state, a.attributes?.device_class) : "";
					return M`<ha-state-icon class="icon" style=${t ? `color:${t}` : ""} .hass=${this._hass} .stateObj=${a}></ha-state-icon>`;
				}
				case "level": return M`<span class="level cm-pill ${e.level === "critical" ? "cm-filled" : ""}">${e.level}</span>`;
				case "what": return M`<span class="what">
            ${i.filter((e) => e === "name" || e === "message").map((t) => t === "name" ? M`<span class="name">${e.name}</span>` : e.message ? M`<span class="message">${e.message}</span>` : P)}
          </span>`;
				case "value": return M`<span class="value">${t}</span>`;
				case "since": return M`<span class="since">${ut(e.since, n)}</span>`;
				default: return P;
			}
		})}
    </button>`;
	}
	static {
		this.styles = [
			H,
			Z,
			se`
    ha-card {
      padding: 4px 0;
      overflow: hidden;
    }
    .row {
      display: grid;
      grid-template-columns: 72px 1fr auto auto;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 16px;
      border: 0;
      border-left: 4px solid var(--cm-level);
      background: none;
      color: var(--primary-text-color);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .row:hover {
      background: var(--secondary-background-color);
    }
    /* A status pill in its level's colour (pills.ts; card-level), critical filled. */
    .icon {
      --mdc-icon-size: 24px;
      display: flex;
      color: var(--state-icon-color);
    }
    .level {
      justify-self: start;
      --tone: var(--cm-level);
    }
    .what {
      display: grid;
      min-width: 0;
    }
    /* What is rolled up into the failed integration above it. */
    .under {
      padding-inline-start: 24px;
    }
    /* What a row offers when open: to snooze it, or to put a snoozed one back. */
    .acts {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 0 16px 8px 20px;
    }
    .acts .note {
      margin: 0;
    }
    /* What is snoozed: out of the list, never out of sight. */
    .snoozed {
      display: block;
      width: 100%;
      padding: 6px 16px;
      border: 0;
      background: none;
      color: var(--secondary-text-color);
      font: inherit;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    .snoozed:hover {
      background: var(--secondary-background-color);
    }
    .dim .row {
      opacity: 0.55;
    }
    /* An error's text wraps, a long address in it too. */
    .message {
      overflow-wrap: anywhere;
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .message,
    .since,
    .note {
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .value {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .note {
      margin: 8px 16px;
    }
    .problem {
      color: var(--error-color, #db4437);
    }
  `
		];
	}
}, wt = {
	icon: "Icon",
	level: "Level",
	name: "Name",
	message: "Message",
	value: "Value (its state now)",
	since: "How long"
}, Tt = (e) => [
	{
		name: "title",
		selector: { text: {} }
	},
	{
		name: "group",
		selector: { select: {
			mode: "dropdown",
			custom_value: !0,
			options: [{
				value: "",
				label: "Every watched sensor"
			}, ...e.map((e) => ({
				value: e,
				label: e
			}))]
		} }
	},
	{
		name: "levels",
		selector: { select: {
			multiple: !0,
			mode: "list",
			options: Ze.map((e) => ({
				value: e,
				label: e[0].toUpperCase() + e.slice(1)
			}))
		} }
	},
	{
		name: "max",
		selector: { number: {
			min: 1,
			max: 100,
			mode: "box"
		} }
	},
	{
		name: "when_clear",
		selector: { select: {
			mode: "dropdown",
			options: [{
				value: "hide",
				label: "Hide the card (in a Tablet Layout, its panel closes)"
			}, {
				value: "message",
				label: "Say so"
			}]
		} }
	},
	{
		name: "clear_message",
		selector: { text: {} }
	},
	{
		name: "show",
		selector: { select: {
			multiple: !0,
			reorder: !0,
			options: $e.map((e) => ({
				value: e,
				label: wt[e]
			}))
		} }
	},
	{
		name: "icon_color",
		selector: { select: {
			mode: "dropdown",
			options: Qe.map((e) => ({
				value: e,
				label: Et[e]
			}))
		} }
	},
	{
		name: "snooze",
		selector: { boolean: {} }
	}
], Et = {
	level: "The level's colour",
	state: "Its state's colour, as a tile",
	none: "None"
}, Dt = {
	title: "Title",
	group: "Group",
	levels: "Levels to list",
	max: "At most",
	when_clear: "When all is well",
	clear_message: "Its message",
	show: "Each row shows",
	icon_color: "Icon colour",
	snooze: "Snooze from this card"
}, Ot = {
	title: "Or none, and give its panel a garnish heading (it hides with the card).",
	group: "Only one group's members (from Casa Mia's Sensor Watch page), or every watched sensor.",
	show: "Drag to reorder; the name and message share a place, where the first of them is.",
	snooze: "A tap on a row then offers to snooze it for a day, a week or 30 days, and what is snoozed can be put back. Leave it off on a tablet that anyone can reach: the Sensor Watch page can always snooze."
}, kt = class extends V {
	constructor(...e) {
		super(...e), this._ready = !1, this._groups = [], this._asked = !1;
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			_config: { state: !0 },
			_ready: { state: !0 },
			_groups: { state: !0 }
		};
	}
	async _askGroups() {
		if (!this._asked && this.hass) {
			this._asked = !0;
			try {
				let e = await this.hass.callWS({
					type: "call_service",
					...Ke,
					service_data: {},
					return_response: !0
				});
				this._groups = e?.response?.groups ?? [];
			} catch {}
		}
	}
	setConfig(e) {
		this._config = e;
	}
	connectedCallback() {
		super.connectedCallback(), d().then(() => this._ready = !0);
	}
	render() {
		return !this.hass || !this._config || !this._ready ? P : (this._askGroups(), M`<ha-form
      .hass=${this.hass}
      .data=${{
			...W,
			...this._config
		}}
      .schema=${Tt(this._groups)}
      .computeLabel=${(e) => Dt[e.name] ?? e.name}
      .computeHelper=${(e) => Ot[e.name]}
      @value-changed=${(e) => {
			e.stopPropagation();
			let t = {
				...this._config,
				...e.detail.value
			};
			t.group || delete t.group, this._config = t, s(this, "config-changed", { config: ie(this._config, W) });
		}}
    ></ha-form>`);
	}
}, Q = "casa-mia-watch-eye", At = class extends V {
	static {
		this.properties = {
			entityId: {},
			_watch: { state: !0 }
		};
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unsubscribe();
	}
	updated() {
		this.entityId !== this._for && this._subscribe();
	}
	_subscribe() {
		this._unsubscribe();
		let e = this.hass?.connection;
		this._for = this.entityId, this.entityId && e && (this._off = ft(e, this.entityId, (e) => this._watch = e));
	}
	_unsubscribe() {
		this._off?.(), this._off = void 0, this._watch = void 0;
	}
	_open() {
		if (!this.hass?.panels?.["sensor-watch"]) {
			s(this, "hass-notification", {
				message: "Sensor Watch's page isn't in Home Assistant's sidebar. Restart Home Assistant if Casa Mia has just been updated.",
				duration: 1e4
			});
			return;
		}
		this.dialog?.closeDialog?.(), u(G(this.entityId, Date.now()));
	}
	render() {
		let e = this._watch;
		if (!e) return P;
		let t = e.watched ? e.level : void 0, n = e.watched ? `Sensor Watch: ${t ?? "watched, no level yet"}${e.escalated && e.real ? ` (escalated from ${e.real})` : ""}${e.message ? `: ${e.message}` : ""}. Open its watch` : "Watch in Sensor Watch";
		return M`<button class=${t ?? ""} title=${n} aria-label=${n} @click=${this._open}>
      <ha-icon icon=${e.watched ? "mdi:eye" : "mdi:eye-plus-outline"}></ha-icon>
      ${t ? M`<span class="cm-pill ${t === "critical" ? "cm-filled" : ""}">${t}</span>` : P}
    </button>`;
	}
	static {
		this.styles = [
			H,
			Z,
			se`
      button {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 40px;
        margin: 4px 0;
        padding: 0 8px;
        border: 0;
        border-radius: 20px;
        background: none;
        color: var(--cm-level, var(--secondary-text-color));
        font: inherit;
        cursor: pointer;
      }
      button:hover {
        background: var(--secondary-background-color);
      }
      .cm-pill {
        --tone: var(--cm-level);
      }
      /* A phone's header has no room for the word: the eye keeps the level's colour. */
      @media (max-width: 450px) {
        .cm-pill {
          display: none;
        }
      }
    `
		];
	}
};
function jt(e) {
	let t = e.shadowRoot, n = t?.querySelector(Q), r = t?.querySelector("[slot=\"headerTitle\"]");
	if (!t || !e.hass?.user?.is_admin || !e._entityId || e._currView !== "info" || !r) {
		t && e._entityId && !r && l("the entity dialog's header changed; no eye"), n?.remove();
		return;
	}
	n || (n = document.createElement(Q), n.slot = "headerActionItems", r.after(n)), n.hass = e.hass, n.dialog = e, n.entityId = e._entityId;
}
customElements.whenDefined("ha-more-info-dialog").then(() => {
	let e = customElements.get("ha-more-info-dialog").prototype, t = e.updated;
	if (typeof t != "function") {
		l("the entity dialog changed; no eye");
		return;
	}
	e.updated = function(...e) {
		t.apply(this, e), jt(this);
	};
});
//#endregion
//#region src/sensor-watch/gauge.ts
var $ = {
	name: "Mains voltage",
	value: 212,
	unit: "V",
	watch: {
		watched: !0,
		kind: "numeric",
		level: "warning",
		message: "Mains low: under 216 V",
		otherwise: "error",
		bands: [
			{
				from: null,
				to: 207,
				level: "critical"
			},
			{
				from: 207,
				to: 216,
				level: "warning"
			},
			{
				from: 216,
				to: 253,
				level: "nominal"
			},
			{
				from: 253,
				to: 262,
				level: "warning"
			},
			{
				from: 262,
				to: null,
				level: "critical"
			}
		]
	}
}, Mt = {
	binary: "It is watched by on and off, so there are no bands to draw.",
	state: "It is watched by its states, so there are no bands to draw.",
	available: "It is watched for being there at all, so there are no bands to draw."
}, Nt = class extends V {
	static {
		this.properties = {
			_config: { state: !0 },
			_watch: { state: !0 },
			_lapsed: { state: !0 }
		};
	}
	static getStubConfig() {
		return {};
	}
	static getConfigElement() {
		return document.createElement("casa-mia-sensor-watch-gauge-editor");
	}
	setConfig(e) {
		this._config = { ...e };
	}
	set hass(e) {
		let t = this._config?.entity, n = this._hass;
		this._hass = e, e.connected === !1 && !this._lapsed && this._watch && (this._lapsed = {
			why: "No connection to Home Assistant",
			since: Date.now()
		}), (!n || !t || n.states[t] !== e.states[t] || n.connected !== e.connected) && this.requestUpdate();
	}
	connectedCallback() {
		super.connectedCallback(), this.requestUpdate();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unfollow();
	}
	updated() {
		let e = this._config?.entity;
		this.isConnected && this._hass?.connection && e !== this._for && this._follow(e);
	}
	_follow(e) {
		this._unfollow(), this._for = e, e && (this._off = ft(this._hass.connection, e, (e, t) => {
			e ? [this._watch, this._lapsed] = [e, void 0] : this._lapsed ??= {
				why: t ?? "Sensor Watch isn't answering",
				since: Date.now()
			};
		}));
	}
	_unfollow() {
		this._off?.(), this._off = this._for = this._watch = this._lapsed = void 0;
	}
	getCardSize() {
		return 3;
	}
	getGridOptions() {
		return {
			columns: 6,
			rows: "auto",
			min_columns: 3
		};
	}
	render() {
		if (!this._config) return P;
		let e = this._config.entity, t = e ? this._hass?.states[e] : void 0;
		if (!e) return p(this) ? this._face($.name, $.watch, $.value, `${$.value} ${$.unit}`, $.unit) : M`<ha-card><p class="note">Choose an entity that Sensor Watch watches.</p></ha-card>`;
		let n = this._config.name || t?.attributes?.friendly_name || e, r = this._watch;
		if (!r) return M`<ha-card><p class="name">${n}</p>${this._lapsed ? M`<p class="note problem">${this._lapsed.why}.</p>` : P}</ha-card>`;
		let i = t ? gt(t, r, Date.now()) : void 0, a = r.days_until ? "days" : r.attribute ? "" : t?.attributes?.unit_of_measurement ?? "", o = t ? r.days_until ? i === void 0 ? String(t.state) : `${i.toFixed(1)} days` : r.attribute ? String(t.attributes?.[r.attribute] ?? "no such attribute") : this._hass?.formatEntityState?.(t) ?? `${t.state}${a ? ` ${a}` : ""}` : "not in Home Assistant";
		return this._face(n, r, i, o, a, e);
	}
	_face(e, t, n, r, i, a) {
		let o = !!this._hass?.user?.is_admin && !!this._hass?.panels?.["sensor-watch"], c = t.watched && !t.disabled ? t.level : void 0, l = [
			e,
			r,
			c,
			t.message
		].filter(Boolean).join(", "), d = this._lapsed;
		return M`<ha-card class=${d ? "lapsed" : ""}>
      <button class="face ${c ?? ""}" aria-label=${l} @click=${() => a && s(this, "hass-more-info", { entityId: a })}>
        ${t.bands ? this._dial(t, n, i) : P}
        <span class="value ${t.stale ? "old" : ""}">${r}</span>
        <span class="name">${e}</span>
        ${c ? M`<span class="counts">
              <span class="cm-pill ${c === "critical" ? "cm-filled" : ""}">${c}</span>
              ${t.message ? M`<span class="message">${t.message}</span>` : P}
            </span>` : P}
      </button>
      ${t.watched ? t.disabled ? M`<p class="note">Its watch is switched off in Sensor Watch.</p>` : t.bands ? c ? P : M`<p class="note">No level yet: Sensor Watch is waiting out its hold-off.</p>` : M`<p class="note">${Mt[t.kind ?? ""] ?? "Its watch has no bands to draw."}</p>` : M`<p class="note">
            Sensor Watch doesn't watch this.
            ${o && a ? M`<a href=${G(a, 0)} @click=${(e) => (e.preventDefault(), u(G(a, Date.now())))}>Watch it</a>` : P}
          </p>`}
      ${d ? M`<p class="note problem">${d.why}: its level is not current since ${J(d.since, Date.now())}.</p>` : P}
      ${a ? P : M`<p class="note">An example: the bands come from the sensor's watch.</p>`}
    </ha-card>`;
	}
	_dial(e, t, n) {
		let r = _t(e.bands, {
			min: this._config?.min,
			max: this._config?.max,
			unit: n
		}), i = t === void 0 ? 0 : K(t, r) * 180 - 90;
		return M`<svg viewBox="0 0 200 122" aria-hidden="true">
      <path class="band ${e.otherwise ?? "error"}" d=${yt(0, 1)} />
      ${vt(e.bands, r).map((e) => Ne`<path class="band ${e.level}" d=${yt(e.from, e.to)} />`)}
      <text class="end" x=${q.cx - q.r} y="118" text-anchor="middle">${bt(r[0])}</text>
      <text class="end" x=${q.cx + q.r} y="118" text-anchor="middle">${bt(r[1])}</text>
      ${t === void 0 ? P : Ne`<g class="needle" style="transform: rotate(${i.toFixed(1)}deg)">
            <path d="M ${q.cx - 3} ${q.cy} L ${q.cx} ${q.cy - q.r + 14} L ${q.cx + 3} ${q.cy} Z" />
            <circle cx=${q.cx} cy=${q.cy} r="6" />
          </g>`}
    </svg>`;
	}
	static {
		this.styles = [
			H,
			Z,
			se`
      ha-card {
        padding: 12px 16px;
        overflow: hidden;
      }
      .face {
        display: grid;
        justify-items: center;
        gap: 2px;
        width: 100%;
        padding: 0;
        border: 0;
        background: none;
        color: var(--primary-text-color);
        font: inherit;
        text-align: center;
        cursor: pointer;
      }
      svg {
        width: 100%;
        max-width: 280px;
      }
      .band {
        fill: none;
        stroke: var(--cm-level);
        stroke-width: 16;
      }
      .end {
        fill: var(--secondary-text-color);
        font-size: 10px;
      }
      /* The needle in the colour of the level that counts (the face's), which the band
         under it may not be; no level yet: the text's colour. */
      .needle {
        transform-origin: 100px 100px;
        transition: transform 0.6s ease-out;
        fill: var(--cm-level, var(--primary-text-color));
        stroke: var(--card-background-color, #fff);
        stroke-width: 1.5;
      }
      @media (prefers-reduced-motion: reduce) {
        .needle {
          transition: none;
        }
      }
      .value {
        font-size: 28px;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
      }
      /* Stale: the number is the last one it sent, not one to trust. */
      .value.old,
      .lapsed .face {
        opacity: 0.55;
      }
      .name {
        margin: 0;
        overflow-wrap: anywhere;
      }
      .counts {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 6px;
      }
      .cm-pill {
        --tone: var(--cm-level);
      }
      .message,
      .note {
        color: var(--secondary-text-color);
        font-size: 13px;
        overflow-wrap: anywhere;
      }
      .note {
        margin: 8px 0 0;
        text-align: center;
      }
      .note a {
        color: var(--primary-color);
      }
      .problem {
        color: var(--error-color, #db4437);
      }
    `
		];
	}
}, Pt = [
	{
		name: "entity",
		required: !0,
		selector: { entity: {} }
	},
	{
		name: "name",
		selector: { text: {} }
	},
	{
		type: "grid",
		name: "",
		schema: [{
			name: "min",
			selector: { number: {
				mode: "box",
				step: "any"
			} }
		}, {
			name: "max",
			selector: { number: {
				mode: "box",
				step: "any"
			} }
		}]
	}
], Ft = {
	entity: "Entity",
	name: "Name",
	min: "Arc starts at",
	max: "Arc ends at"
}, It = {
	entity: "One that Sensor Watch watches by bands (a number). Its bands colour the arc, and follow the watch when it is edited.",
	name: "Instead of the entity's own.",
	min: "Left empty: from the bands (0 for a percentage).",
	max: "Left empty: from the bands (100 for a percentage)."
}, Lt = class extends V {
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
		super.connectedCallback(), d().then(() => this._ready = !0);
	}
	render() {
		return !this.hass || !this._config || !this._ready ? P : M`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${Pt}
      .computeLabel=${(e) => Ft[e.name] ?? e.name}
      .computeHelper=${(e) => It[e.name]}
      @value-changed=${(e) => {
			e.stopPropagation();
			let t = Object.fromEntries(Object.entries(e.detail.value).filter(([, e]) => e != null && e !== ""));
			this._config = t, s(this, "config-changed", { config: t });
		}}
    ></ha-form>`;
	}
}, Rt = () => document.querySelector("home-assistant")?.hass?.entities;
function zt(e) {
	let t = [document];
	for (let n; n = t.pop();) for (let r of n.querySelectorAll("*")) r.localName === e && r.requestUpdate?.(), r.shadowRoot && t.push(r.shadowRoot);
}
customElements.whenDefined("ha-state-icon").then(() => {
	let e = customElements.get("ha-state-icon").prototype, t = e.updated;
	if (typeof t != "function") return l("ha-state-icon changed; the Status sensor keeps HA's colour");
	e.updated = function(...e) {
		t.apply(this, e);
		let n = ht(this.stateObj, this._entities ?? this.hass?.entities ?? Rt());
		n ? (this.style.color !== n && (this.style.color = n), this.cmLevelColour = !0) : this.cmLevelColour &&= (this.style.removeProperty("color"), !1);
	}, zt("ha-state-icon");
});
for (let e of [
	"hui-tile-card",
	"hui-entity-badge",
	"hui-entity-heading-badge"
]) customElements.whenDefined(e).then(() => {
	let t = customElements.get(e).prototype, n = t.willUpdate;
	t.willUpdate = function(...t) {
		if (!this.cmLevelColour) {
			this.cmLevelColour = !0;
			let t = this._computeStateColor;
			typeof t == "function" ? this._computeStateColor = (e, n) => !n && ht(e, this.hass?.entities) || t(e, n) : l(`${e} changed; the Status sensor keeps HA's colour`);
		}
		return n.apply(this, t);
	}, zt(e);
});
f("casa-mia-sensor-watch", Ct), f("casa-mia-sensor-watch-editor", kt), f("casa-mia-sensor-watch-gauge", Nt), f("casa-mia-sensor-watch-gauge-editor", Lt), f(Q, At), ee("casa-mia-sensor-watch-gauge", "Casa Mia Sensor Watch gauge", "One watched number on an arc coloured by its Sensor Watch bands, which follow the watch when it is edited."), r("Sensor Watch", Ye, Je), ee("casa-mia-sensor-watch", "Casa Mia Sensor Watch", "What needs doing or has gone wrong (all of it, or one group's), worst first; hidden when all is well.");
//#endregion
