//#region \0rolldown/runtime.js
var e = Object.defineProperty, t = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
}, n = 100, r = 600;
function i(e, t) {
	let i = (t) => console.error(`CASA-MIA CARDS: ${e} won't work: ${t}`), a = () => {
		let e = window.hassConnection;
		return e?.then(t, (e) => i(`Home Assistant's connection failed (${e})`)), !!e;
	};
	if (a()) return;
	let o = r, s = setInterval(() => {
		a() ? clearInterval(s) : --o === 0 && (clearInterval(s), i("Home Assistant's connection never appeared"));
	}, n);
}
function a(e, t, n) {
	n !== "dev" && i(`${e}'s offer to reload after an update`, ({ conn: r }) => {
		r.addEventListener("ready", () => r.sendMessagePromise({ type: t }).then(({ version: t }) => {
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
			})));
		}, () => {}));
	});
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
function c(e) {
	history.pushState(null, "", e), s(window, "location-changed", { replace: !1 });
}
async function l() {
	customElements.get("ha-form") || (await (await (await window.loadCardHelpers()).createCardElement({
		type: "entities",
		entities: []
	})).constructor.getConfigElement?.(), await customElements.whenDefined("ha-form"));
}
function u(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function d(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !0,
		documentationURL: "https://github.com/gazoodle/casa-mia"
	});
}
var f = o.main, p = o.panel;
({
	...f,
	...p
});
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var m = globalThis, h = m.ShadowRoot && (m.ShadyCSS === void 0 || m.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, g = Symbol(), _ = /* @__PURE__ */ new WeakMap(), v = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== g) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (h && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = _.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && _.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, y = (e) => new v(typeof e == "string" ? e : e + "", void 0, g), b = (e, ...t) => new v(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, g), x = (e, t) => {
	if (h) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = m.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, S = h ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return y(t);
})(e) : e, { is: C, defineProperty: w, getOwnPropertyDescriptor: T, getOwnPropertyNames: E, getOwnPropertySymbols: D, getPrototypeOf: O } = Object, ee = globalThis, te = ee.trustedTypes, ne = te ? te.emptyScript : "", k = ee.reactiveElementPolyfillSupport, A = (e, t) => e, re = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ne : null;
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
}, ie = (e, t) => !C(e, t), ae = {
	attribute: !0,
	type: String,
	converter: re,
	reflect: !1,
	useDefault: !1,
	hasChanged: ie
};
Symbol.metadata ??= Symbol("metadata"), ee.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var oe = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ae) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && w(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = T(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? ae;
	}
	static _$Ei() {
		if (this.hasOwnProperty(A("elementProperties"))) return;
		let e = O(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(A("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(A("properties"))) {
			let e = this.properties, t = [...E(e), ...D(e)];
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
			for (let e of n) t.unshift(S(e));
		} else e !== void 0 && t.push(S(e));
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
		return x(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? re : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? re : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ie)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
oe.elementStyles = [], oe.shadowRootOptions = { mode: "open" }, oe[A("elementProperties")] = /* @__PURE__ */ new Map(), oe[A("finalized")] = /* @__PURE__ */ new Map(), k?.({ ReactiveElement: oe }), (ee.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var se = globalThis, ce = (e) => e, le = se.trustedTypes, ue = le ? le.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, de = "$lit$", j = `lit$${Math.random().toFixed(9).slice(2)}$`, fe = "?" + j, pe = `<${fe}>`, me = document, he = () => me.createComment(""), ge = (e) => e === null || typeof e != "object" && typeof e != "function", _e = Array.isArray, ve = (e) => _e(e) || typeof e?.[Symbol.iterator] == "function", ye = "[ 	\n\f\r]", be = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, xe = /-->/g, Se = />/g, Ce = RegExp(`>|${ye}(?:([^\\s"'>=/]+)(${ye}*=${ye}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), we = /'/g, Te = /"/g, Ee = /^(?:script|style|textarea|title)$/i, De = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), M = De(1), N = De(2), P = Symbol.for("lit-noChange"), F = Symbol.for("lit-nothing"), Oe = /* @__PURE__ */ new WeakMap(), ke = me.createTreeWalker(me, 129);
function Ae(e, t) {
	if (!_e(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ue === void 0 ? t : ue.createHTML(t);
}
var je = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = be;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === be ? c[1] === "!--" ? o = xe : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = Ce) : (Ee.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = Ce) : o = Se : o === Ce ? c[0] === ">" ? (o = i ?? be, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? Ce : c[3] === "\"" ? Te : we) : o === Te || o === we ? o = Ce : o === xe || o === Se ? o = be : (o = Ce, i = void 0);
		let d = o === Ce && e[t + 1].startsWith("/>") ? " " : "";
		a += o === be ? n + pe : l >= 0 ? (r.push(s), n.slice(0, l) + de + n.slice(l) + j + d) : n + j + (l === -2 ? t : d);
	}
	return [Ae(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Me = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = je(t, n);
		if (this.el = e.createElement(l, r), ke.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = ke.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(de)) {
					let t = u[o++], n = i.getAttribute(e).split(j), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Le : r[1] === "?" ? Re : r[1] === "@" ? ze : Ie
					}), i.removeAttribute(e);
				} else e.startsWith(j) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Ee.test(i.tagName)) {
					let e = i.textContent.split(j), t = e.length - 1;
					if (t > 0) {
						i.textContent = le ? le.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], he()), ke.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], he());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === fe) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(j, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += j.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = me.createElement("template");
		return n.innerHTML = e, n;
	}
};
function Ne(e, t, n = e, r) {
	if (t === P) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = ge(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = Ne(e, i._$AS(e, t.values), i, r)), t;
}
var Pe = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? me).importNode(t, !0);
		ke.currentNode = r;
		let i = ke.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Fe(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Be(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = ke.nextNode(), a++);
		}
		return ke.currentNode = me, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Fe = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = F, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = Ne(this, e, t), ge(e) ? e === F || e == null || e === "" ? (this._$AH !== F && this._$AR(), this._$AH = F) : e !== this._$AH && e !== P && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ve(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== F && ge(this._$AH) ? this._$AA.nextSibling.data = e : this.T(me.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Me.createElement(Ae(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Pe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Oe.get(e.strings);
		return t === void 0 && Oe.set(e.strings, t = new Me(e)), t;
	}
	k(t) {
		_e(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(he()), this.O(he()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ce(e).nextSibling;
			ce(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Ie = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = F, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = F;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = Ne(this, e, t, 0), a = !ge(e) || e !== this._$AH && e !== P, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = Ne(this, r[n + o], t, o), s === P && (s = this._$AH[o]), a ||= !ge(s) || s !== this._$AH[o], s === F ? e = F : e !== F && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === F ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Le = class extends Ie {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === F ? void 0 : e;
	}
}, Re = class extends Ie {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== F);
	}
}, ze = class extends Ie {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = Ne(this, e, t, 0) ?? F) === P) return;
		let n = this._$AH, r = e === F && n !== F || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== F && (n === F || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Be = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		Ne(this, e);
	}
}, Ve = {
	M: de,
	P: j,
	A: fe,
	C: 1,
	L: je,
	R: Pe,
	D: ve,
	V: Ne,
	I: Fe,
	H: Ie,
	N: Re,
	U: ze,
	B: Le,
	F: Be
}, He = se.litHtmlPolyfillSupport;
He?.(Me, Fe), (se.litHtmlVersions ??= []).push("3.3.3");
var Ue = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Fe(t.insertBefore(he(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, We = globalThis, Ge = class extends oe {
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
		return P;
	}
};
Ge._$litElement$ = !0, Ge.finalized = !0, We.litElementHydrateSupport?.({ LitElement: Ge });
var Ke = We.litElementPolyfillSupport;
Ke?.({ LitElement: Ge }), (We.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/dash-bored/aurora/season-styles.ts
var qe = b`
  .season { position: absolute; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
  .season > * { position: absolute; }
  .foot { left: 0; bottom: 0; }
  .top { left: 0; top: 0; }
  .top.flip { left: auto; right: 0; scale: -1 1; } /* drawn for the left corner, shown in the right */
  .top.right { left: auto; right: -40px; top: -40px; }

  /* What drifts is placed each frame by drifting.ts, about its own middle. One that is not on the page is hidden. */
  .m { left: 0; top: 0; width: var(--s); height: var(--s); margin: calc(var(--s) / -2); visibility: hidden; will-change: transform; }
  .machine { left: -30px; top: 0; width: 60px; height: 56px; visibility: hidden; }
  .machine .prop { display: none; }
  .machine.flying .prop { display: inline; }
  .whirr { animation: whirr .12s linear infinite alternate; }
  @keyframes whirr { to { scale: .25 1; } }
  .heaps { left: 0; top: 0; }
  .heaps path { stroke-width: 1; }
  /* A firework bursts where it is. Faint, and gone quickly: one that lingers over a tile looks like something loading. */
  .p { left: var(--x); top: var(--y); width: var(--s); height: var(--s); animation: burst var(--d) ease-out var(--w) infinite; }
  @keyframes burst { 0% { scale: 0; opacity: .7; } 40% { opacity: .6; } 100% { scale: 1; opacity: 0; } }

  /* The drawing in the greeting tile's top right corner, which the date, the greeting and
     the sentence under it leave free: at the foot it stood on the sentence. */
  .motif { position: absolute; z-index: -1; right: 4%; top: 4%; height: 35%; max-width: 40%; pointer-events: none; }
  .twinkle { animation: twinkle 3s ease-in-out infinite; }
  @keyframes twinkle { 50% { opacity: .35; } }
  .bob { animation: bob 4s ease-in-out infinite alternate; }
  @keyframes bob { to { translate: 0 -8px; } }
  .beat { transform-origin: 100px 90px; animation: beat 1.4s ease-in-out infinite; }
  @keyframes beat { 15% { scale: 1.06; } 30% { scale: 1; } 45% { scale: 1.04; } 60% { scale: 1; } }
  .wave { transform-origin: 100px 20px; animation: wave 1.6s ease-in-out infinite alternate; }
  @keyframes wave { to { transform: skewY(8deg) scaleX(.9); } }
  .turn { animation: turn 60s linear infinite; }
  @keyframes turn { to { rotate: 360deg; } }

  @media (prefers-reduced-motion: reduce) {
    .twinkle, .bob, .beat, .wave, .turn, .whirr { animation: none; }
    .p { display: none; }
  }
`, Je = "linear(0, .009, .035 2.1%, .141 4.4%, .723 12.9%, .938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, .991, .977 51%, .974 53.8%, .975 57.1%, .997 69.8%, 1.003 76.9%, 1.004 83.8%, 1)", Ye = b`
  .aurora {
    --bg: #e9edf5; --text: #0d1220; --soft: rgba(13,18,32,.6);
    --glass: rgba(255,255,255,.5); --glass-hi: rgba(255,255,255,.85); --rim: rgba(255,255,255,.9);
    --track: rgba(13,18,32,.1); --sky: .8; --sheet: rgb(207,214,227); --bar: rgba(244,246,251,.95);
    --lift: 0 18px 36px -10px rgba(0,0,40,.45), 0 3px 8px rgba(0,0,40,.22); /* what floats over the screens casts this */
    --warm: 0; /* 0 to 1: how much of the house's light is on (glow in words.ts) */
    /* The skin (skins.ts sets these on the element): the first skin's, for an element drawn before it is chosen. */
    --h1: 265; --m1: -60; --h2: 190; --m2: -120; --h3: 330; --m3: 50; --hw: 85; --strength: 1;
    /* The plain curve is for a browser without linear(): SPRING above replaces it where it can. */
    --spring: cubic-bezier(.34, 1.56, .64, 1);
    position: relative; isolation: isolate; overflow: hidden; box-sizing: border-box;
    font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif; color: var(--text); background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }
  .aurora.dark {
    --bg: #07080d; --text: #f4f6fb; --soft: rgba(244,246,251,.62);
    --glass: rgba(255,255,255,.07); --glass-hi: rgba(255,255,255,.16); --rim: rgba(255,255,255,.2);
    --track: rgba(255,255,255,.1); --sky: .5; --sheet: rgb(18,20,30); --bar: rgba(26,29,41,.95);
    --lift: 0 18px 36px -10px rgba(0,0,0,.8), 0 3px 8px rgba(0,0,0,.5);
  }
  @supports (transition-timing-function: linear(0, 1)) {
    .aurora { --spring: ${y(Je)}; }
  }
  * { box-sizing: border-box; }
  button { font: inherit; color: inherit; border: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  :focus-visible { outline: 2px solid var(--text); outline-offset: 3px; }

  /* ---------- the sky ---------- */
  .sky { position: absolute; inset: 0; z-index: -1; overflow: hidden; opacity: var(--sky); pointer-events: none; }
  .sky i { position: absolute; width: 80vmax; height: 80vmax; margin: -22vmax; border-radius: 50%; animation: drift 26s ease-in-out infinite alternate; }
  .sky i:nth-child(1) { background: radial-gradient(closest-side, oklch(.68 calc(.2 * var(--strength)) calc(var(--h1) + var(--warm) * var(--m1)) / .75), transparent); left: 0; top: 0; }
  .sky i:nth-child(2) { background: radial-gradient(closest-side, oklch(.74 calc(.19 * var(--strength)) calc(var(--h2) + var(--warm) * var(--m2)) / .75), transparent); right: 0; top: 10%; animation-delay: -8s; animation-duration: 32s; }
  .sky i:nth-child(3) { background: radial-gradient(closest-side, oklch(.7 calc(.22 * var(--strength)) calc(var(--h3) + var(--warm) * var(--m3)) / .75), transparent); left: 30%; bottom: -10%; animation-delay: -15s; animation-duration: 38s; }
  .sky i:nth-child(4) { background: radial-gradient(closest-side, oklch(.82 calc(.17 * var(--strength)) var(--hw)), transparent); right: 12%; bottom: 0; opacity: calc(.1 + var(--warm) * .7); transition: opacity 1.2s; }
  @keyframes drift { to { translate: 12vw 9vh; scale: 1.25; } }

  /* ---------- glass ---------- */
  .glass { position: relative; border-radius: 30px; overflow: hidden; isolation: isolate;
    background: linear-gradient(140deg, var(--glass-hi), var(--glass) 45%); border: 1px solid var(--rim);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.12), 0 30px 50px -30px rgba(0,0,20,.5); }
  /* A highlight that follows a mouse, so the glass seems to catch the light. A finger has none. */
  @media (hover: hover) {
    .glass::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0; transition: opacity .4s;
      background: radial-gradient(240px circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,.34), transparent 70%); }
    .glass:hover::before { opacity: 1; }
  }

  /* ---------- the screens ---------- */
  /* One screen is on show at a time. They stand side by side in a box that the browser
     scrolls sideways and stops on each: no script moves them. */
  .pages { position: absolute; inset: 0; display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none; }
  .pages::-webkit-scrollbar { display: none; }
  /* The foot of a screen is left for the bar, so that the tiles fill what can be seen and none is under it. */
  .page { flex: 0 0 100%; height: 100%; scroll-snap-align: start; scroll-snap-stop: always; display: grid; gap: 14px; padding: 18px 18px 88px;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); grid-template-rows: repeat(var(--rows), minmax(0, 1fr)); }
  /* A tile's contents are enlarged with its cell (zoom, in pages.ts): the tile still fills its cells. */
  .page > * { min-width: 0; min-height: 0; margin: 0; zoom: var(--zoom, 1); }
  .label { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--soft); font-weight: 600; }
  .none { color: var(--soft); font-size: 14px; }
  .dim { opacity: .3; }

  .hero { padding: 26px 28px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
  .hero time { font-size: 15px; color: var(--soft); font-variant-numeric: tabular-nums; }
  .hero h1 { margin: 0; font-size: 52px; line-height: .98; font-weight: 650; letter-spacing: -.035em; }
  .hero p { margin: 0; font-size: 20px; line-height: 1.35; color: var(--soft); max-width: 30ch; text-wrap: balance; }
  .hero p b { color: var(--text); font-weight: 600; }

  .urgent { padding: 14px 20px; border-radius: 22px; border: 1px solid oklch(.7 .2 25); background: var(--bar); font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
  .urgent.over { position: absolute; z-index: 2; top: 14px; left: 50%; translate: -50%; width: max-content; max-width: calc(100% - 28px); box-shadow: var(--lift); }
  .sheet .urgent { margin-bottom: 16px; }

  .alerts { padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
  .note { font-size: 14px; line-height: 1.3; overflow-wrap: anywhere; --tone: oklch(.78 .16 85); }
  .note.critical, .note.error { --tone: oklch(.68 .22 25); }
  .note.task { --tone: oklch(.72 .14 240); }
  .note b { display: block; }
  .note b::before { content: ""; display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; background: var(--tone); box-shadow: 0 0 12px var(--tone); }
  .note small { color: var(--soft); margin-left: 6px; }

  .scenes { display: flex; flex-wrap: wrap; align-content: start; gap: 10px; padding: 12px; overflow-y: auto; }
  .scenes button { flex: 1 1 auto; min-height: 44px; padding: 8px 18px; border-radius: 20px; background: var(--track); font-size: 16px; font-weight: 600;
    transition: scale .5s var(--spring), background .3s; }
  .scenes button:active { scale: .92; }
  .scenes button.thrown { background: var(--text); color: var(--bg); }
  .sheet .scenes { padding: 0 0 18px; overflow: visible; }

  .energy { padding: 16px 20px 0; display: flex; flex-direction: column; }
  .big { font-size: 44px; font-weight: 650; letter-spacing: -.04em; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .big small { font-size: 18px; color: var(--soft); letter-spacing: 0; margin-left: 4px; }
  .energy svg { flex: 1; width: calc(100% + 40px); margin: 0 -20px; min-height: 0; }

  /* The ring is in the skin's colours, never so weak a one that it can't be told from its track. It is as big as its tile has room for: the tile may be one cell on a phone. */
  .climate { container-type: size; padding: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .ringwrap { position: relative; display: grid; place-items: center; width: min(150px, 100cqw, 100cqh - 34px); }
  .ring { width: 100%; aspect-ratio: 1; border-radius: 50%;
    background: conic-gradient(from 220deg, oklch(.75 calc(.16 * max(var(--strength), .6)) var(--h1)), oklch(.8 calc(.17 * max(var(--strength), .6)) var(--hw)) calc(var(--pct) * 280deg), var(--track) 0 280deg, transparent 0);
    -webkit-mask: radial-gradient(circle, transparent 57%, #000 58%); mask: radial-gradient(circle, transparent 57%, #000 58%); }
  .read { position: absolute; text-align: center; max-width: 70%; }
  .read b { display: block; font-size: 34px; font-weight: 650; letter-spacing: -.04em; }
  .read span { font-size: 12px; color: var(--soft); }
  .steps { display: flex; gap: 10px; margin-top: -14px; z-index: 1; }
  .steps button { width: 44px; height: 44px; border-radius: 50%; background: var(--track); font-size: 22px; transition: scale .5s var(--spring); }
  .steps button:active { scale: .85; }

  /* ---------- rooms, and sets of rooms ---------- */
  .room, .set { padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; text-align: left;
    --lit: 0; --hue: 60; transition: scale .6s var(--spring), opacity .3s; }
  @media (hover: hover) { .room:hover, .set:hover { scale: 1.02; } }
  /* The tile glows from a corner in proportion to the light actually on in it. */
  .room::after, .set::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: var(--lit); transition: opacity .8s;
    background: radial-gradient(120% 90% at 100% 0%, oklch(.86 calc(.17 * var(--strength)) var(--hue) / .85), transparent 62%); }
  /* The whole tile is pressed to open its sheet; its round buttons sit over that. */
  .room .open { position: absolute; inset: 0; background: none; border-radius: inherit; }
  .head { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
  h2 { margin: 0; font-size: 22px; line-height: 1.15; font-weight: 650; letter-spacing: -.02em; overflow-wrap: anywhere; }
  .temp { font-size: 24px; font-weight: 300; letter-spacing: -.04em; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .w2.h2 .temp { font-size: 40px; line-height: 1; } /* a tile one cell wide has no room for it beside the name */
  .sub { font-size: 14px; color: var(--soft); }
  /* A set's rooms, as many as its tile has room for, each with how many of its lights are on. */
  .set h2, .set .sub, .set .in > span { display: block; }
  .in { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: end; gap: 3px; font-size: 14px; color: var(--soft); }
  .in > span { display: flex !important; justify-content: space-between; gap: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .in .lit { color: var(--text); }
  .in b { flex: none; min-width: 20px; padding: 0 6px; border-radius: 10px; background: #fff; color: #111; font-size: 12px; line-height: 20px; text-align: center; }
  .dots { display: flex; flex-wrap: wrap; gap: 8px; }
  .dot { position: relative; flex: none; width: 44px; height: 44px; border-radius: 50%; background: var(--track); font-size: 14px; font-weight: 600;
    display: grid; place-items: center; transition: scale .5s var(--spring), background .3s, box-shadow .3s; }
  .dot.on, .key.on { background: #fff; color: #111; }
  .dot.lamp.on { box-shadow: 0 0 22px rgba(255,235,170,.9); } /* only a light gives light */
  .dot:active { scale: .8; }
  .away { opacity: .4; }
  /* A device's picture is the Fridge's, drawn in white line (fridge/magnets.ts): here it takes the text's colour. */
  .pic { width: 24px; height: 24px; display: block; }
  .pic [stroke="#fff"] { stroke: currentColor; }
  .pic [fill="#fff"] { fill: currentColor; }

  /* ---------- cameras ---------- */
  /* A camera's picture, with its name and what it says over a shade at its foot. */
  .shot { position: relative; display: block; min-width: 0; min-height: 0; padding: 0; overflow: hidden; border-radius: 18px; background: var(--track); text-align: left; color: var(--soft); }
  .shot img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .shot > span { position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 12px 8px; font-size: 13px; line-height: 1.25; overflow-wrap: anywhere; color: #fff;
    background: linear-gradient(transparent, rgba(0,0,10,.75)); }
  .shot b { display: block; font-size: 14px; }
  .shot:disabled { cursor: default; }
  /* Every camera on the home screen, as many across as fit: more than fit are scrolled to. */
  .cameras { padding: 10px; display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); grid-auto-rows: minmax(110px, 1fr); overflow-y: auto; }
  /* A room's camera is behind its tile, under a shade that keeps what is written on it readable whatever the picture. */
  .room .back { position: absolute; inset: 0; z-index: -1; width: 100%; height: 100%; object-fit: cover; }
  .room.pictured { color: #fff; --soft: rgba(255,255,255,.85); --track: rgba(10,10,25,.5); text-shadow: 0 1px 3px rgba(0,0,10,.7); }
  .room.pictured::after { opacity: 1; background: linear-gradient(rgba(0,0,10,.62), rgba(0,0,10,.12) 45%, rgba(0,0,10,.6)); }
  .room.pictured .dot.on, .room.pictured .key.on { text-shadow: none; }
  /* On a sheet each camera has its picture, and under it what Casa Mia set up for it. */
  .shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 16px; margin-bottom: 18px; }
  .cam { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
  .cam .shot { width: 100%; aspect-ratio: 16 / 9; }
  .cam .scenes { padding: 0; }
  .zoomer { display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--soft); }
  .zoomer input { flex: 1; min-height: 44px; accent-color: var(--text); }

  /* A device's setting that is a choice from a list: its options in a row that is scrolled when they are many. */
  .choice { margin-top: 16px; }
  .choice .scenes { padding: 8px 0 0; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .choice .scenes button { flex: none; text-transform: capitalize; }

  /* ---------- the way round: the edges and the bar ---------- */
  /* Both float over the screens, and their shadow says so. Neither needs a blur to be read. */
  .edge { position: absolute; top: 50%; translate: 0 -50%; z-index: 1; writing-mode: vertical-rl; max-height: 46%; padding: 16px 5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    background: var(--bar); border: 1px solid var(--rim); box-shadow: var(--lift); font-size: 12px; font-weight: 600; letter-spacing: .04em; color: var(--soft); }
  .edge.left { left: 0; border-left: 0; border-radius: 0 14px 14px 0; }
  .edge.right { right: 0; border-right: 0; border-radius: 14px 0 0 14px; }
  .narrow .edge { display: none; } /* a phone's two columns need the width, and it is swiped anyway */
  .bar { position: absolute; z-index: 1; left: 50%; translate: -50%; bottom: 14px; display: flex; align-items: center; gap: 4px; padding: 6px; border-radius: 99px;
    max-width: calc(100% - 28px); overflow-x: auto; scrollbar-width: none; background: var(--bar); border: 1px solid var(--rim); box-shadow: var(--lift); }
  .bar::-webkit-scrollbar { display: none; }
  .bar > button { position: relative; flex: none; height: 44px; padding: 0 16px; border-radius: 99px; background: none; font-size: 15px; font-weight: 600; white-space: nowrap;
    transition: background .3s, color .3s; }
  .bar > button.here { background: var(--text); color: var(--bg); }
  /* A set with several screens has a spot for each under its name. */
  .bar i { position: absolute; left: 0; right: 0; bottom: 5px; display: flex; justify-content: center; gap: 4px; }
  .bar i b { width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: .35; }
  .bar i b.on { opacity: 1; }
  .bar .other { padding: 0 12px; }
  /* A skin's button is its sky in small. The one in use has a ring. */
  .bar .skin { width: 32px; height: 32px; margin: 0 6px; padding: 0; border: 2px solid var(--bar); box-shadow: 0 0 0 1px var(--rim); }
  .bar .skin[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--text); }
  .bar .skin svg { display: block; width: 18px; height: 18px; margin: auto; color: #fff; filter: drop-shadow(0 0 1.5px rgba(0,0,20,.8)); }
  .bar .done { background: var(--text); color: var(--bg); margin-left: 6px; }
  ${qe}
  .bar .other svg { width: 20px; height: 20px; display: block; }
  .ask { flex: none; display: flex; align-items: center; gap: 6px; height: 44px; padding: 0 8px 0 14px; border-radius: 99px; background: var(--track); }
  .ask input { border: 0; background: none; outline: 0; font: inherit; color: inherit; width: 120px; min-width: 0; }
  .narrow .ask input { width: 70px; }
  .ask input::placeholder { color: var(--soft); }
  .ask kbd { font: inherit; font-size: 12px; color: var(--soft); border: 1px solid var(--rim); border-radius: 8px; padding: 2px 7px; }
  @media (hover: none) { .ask kbd { display: none; } }

  /* ---------- the room's sheet ---------- */
  /* Fixed by name: a dialog that is glass would take the glass's position, and the browser
     then puts it at the top of the document, not of the screen. */
  /* Nearly opaque by itself, so that it can be read in a browser that does not blur what
     is behind it: headless WebKit showed the page straight through a sheet that relied on the blur. */
  .sheet { position: fixed; padding: 30px; width: min(720px, 92vw); max-height: 90vh; overflow-y: auto; color: var(--text); transform-origin: 0 0;
    /* Less of the glass's white than a tile has: on the light theme a fader's white fill and a lit key must stand out from it. */
    background: linear-gradient(140deg, rgba(255,255,255,.22), transparent 45%), var(--sheet); } /* opaque: a camera's picture behind it showed through a nearly opaque one */
  dialog::backdrop { background: rgba(0,0,10,.35); }
  dialog header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 22px; }
  .sheet h2 { font-size: 40px; letter-spacing: -.03em; }
  .close { background: var(--track); border-radius: 99px; padding: 8px 16px; }
  .controls { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 16px; }
  /* On a tile big enough to hold them (holds in pages.ts): over the tile's own press. */
  .room .controls { position: relative; gap: 12px; align-content: end; } /* its columns are the sheet's, which is what holds counts by */
  /* As tall as on a sheet, unless a tile that holds them says how tall (holds in pages.ts). */
  .fader, .key { height: var(--tall, 250px); border-radius: 30px; background: var(--track); position: relative; overflow: hidden; font-size: 13px; font-weight: 600; text-align: center; }
  .fader { cursor: ns-resize; touch-action: none; user-select: none; -webkit-user-select: none; }
  .fader i { position: absolute; inset: auto 0 0; height: calc(var(--lvl) * 100%); overflow: hidden; background: #fff; color: #111; font-style: normal; transition: height .5s var(--spring); box-shadow: 0 0 18px rgba(255,235,170,.5); }
  .fader.drag i { transition: none; }
  /* The lettering, as tall as the fader and standing on its foot: the copy in the fill is cut off where the fill ends. */
  .face { position: absolute; inset: auto 0 0; height: var(--tall, 250px); pointer-events: none; }
  .face b, .face span { position: absolute; left: 6px; right: 6px; overflow-wrap: anywhere; }
  .face b { top: 16px; display: grid; justify-items: center; gap: 4px; font-size: 15px; }
  .face span { bottom: 14px; }
  .key { width: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 16px 6px 14px; overflow-wrap: anywhere;
    transition: scale .5s var(--spring), background .3s; }
  .key:active { scale: .94; }
  .key em { display: block; font-style: normal; font-weight: 400; opacity: .7; }
  .key .deg { font-size: 26px; font-weight: 650; letter-spacing: -.03em; }
  .key .steps { margin: 0; }
  .key.on .steps button { background: rgba(0,0,0,.1); }
  div.key:active { scale: none; }
  .key.armed { outline: 2px solid oklch(.7 .2 25); outline-offset: -2px; }
  .none { color: var(--soft); }

  .narrow .page { gap: 10px; padding: 12px 12px 84px; }
  .narrow .hero { padding: 18px 20px; }
  .narrow .hero h1 { font-size: 38px; }
  .narrow .hero p { font-size: 17px; }
  .narrow .room, .narrow .set { padding: 12px; }
  .narrow h2 { font-size: 18px; }
  .narrow .dot { width: 40px; height: 40px; }
  .narrow .dots { gap: 6px; }
  .narrow .sheet { padding: 20px; }
  .narrow .sheet h2 { font-size: 30px; }
  @media (prefers-reduced-motion: reduce) { .sky i { animation: none; } * { transition-duration: 0s !important; } }
`, I = "#2b2f3a", Xe = (e) => Array.from({ length: e }, (e, t) => t), Ze = (e, t, n) => N`<g transform="translate(${e} ${t})">
  ${Xe(10).map((e) => N`<ellipse rx=${n * .28} ry=${n * .6} cy=${-n * .62} fill="#fff" stroke="#d9dfe8" stroke-width=".6" transform="rotate(${e * 36})"/>`)}
  <circle r=${n * .34} fill="#f5c542"/></g>`, Qe = (e, t, n, r, i) => N`<g transform="translate(${e} ${t})">
  <ellipse rx=${n} ry=${n * 1.3} fill=${r}/><path d="M${-n * .96} ${-n * .2}q${n * .48} ${n * .5} ${n * .96} 0t${n * .96} 0" fill="none" stroke=${i} stroke-width=${n * .28}/></g>`, $e = (e, t, n, r) => N`<path transform="translate(${e} ${t}) rotate(${n}) scale(.75)" d="M0-12C-8-6-9 4-4 12 6 10 12 2 10-8 6-11 3-12 0-12zM-4 12L5-3" fill=${r} stroke="#7a3d12" stroke-width=".8"/>`, et = (e) => N`<path d="M6 ${e}l3-14 3 14m16 0l4-18 2 18m22 0l2-12 4 12m18 0l4-16 3 16m24 0l2-13 4 13m20 0l4-17 2 17m22 0l3-12 3 12m20 0l4-16 3 16m18 0l2-12 4 12" fill="none" stroke="#3f9a3f" stroke-width="2.4" stroke-linecap="round"/>`, tt = N`<path d="M0 74V38q40-14 80 0t80-4 80 4v36z" fill="#dbe9f7"/><path d="M0 74V48q30-16 60-4t60-6 60 6 60-2v32z" fill="#fff"/>`, nt = {
	flake: N`<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 6l-2.5-2.500M12 6l2.5-2.500M12 18l-2.5 2.500M12 18l2.5 2.5" fill="none" stroke="#9cc4e8" stroke-width="3.4" stroke-linecap="round" opacity=".55"/>
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 6l-2.5-2.500M12 6l2.5-2.500M12 18l-2.5 2.500M12 18l2.5 2.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`,
	petal: N`<ellipse cx="12" cy="12" rx="5" ry="9" fill="#fff" stroke="currentColor" stroke-width="1.2" transform="rotate(25 12 12)"/>`,
	leaf: N`<path d="M12 2C5 7 3 14 7 22c9-1 14-8 12-17-3-2-5-3-7-3zM7 22L15 9" fill="currentColor" stroke="#7a3d12" stroke-width="1"/>`,
	heart: N`<path d="M12 21C5 15 2 11 2 7.500A5 5 0 0 1 12 6a5 5 0 0 1 10 1.500C22 11 19 15 12 21z" fill="currentColor"/>`,
	bat: N`<path d="M12 9l-1.5-3-1 3.500C7 7 4 7 1 9c2 1 3 3 3 5 1.5-1 3-1 4 .500 1-1 2-.500 2.5 1L12 18l1.5-2.500c.500-1.5 1.5-2 2.5-1 1-1.5 2.5-1.5 4-.500 0-2 1-4 3-5-3-2-6-2-8.5.500l-1-3.500z" fill="currentColor"/>`,
	gull: N`<path d="M1 14q6-9 11-1 5-8 11 1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
	burst: N`${Xe(12).map((e) => N`<path d="M12 7V2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" transform="rotate(${e * 30} 12 12)"/>`)}
    ${Xe(6).map((e) => N`<circle cx="12" cy="5.5" r=".9" fill="#fff" transform="rotate(${e * 60 + 15} 12 12)"/>`)}`
}, rt = (e, t) => N`<g class="prop"><path d="M${e} ${t}V${t - 9}" stroke=${I} stroke-width="1.6"/><ellipse class="whirr" cx=${e} cy=${t - 10} rx="17" ry="2.600" fill="#9aa3b2" opacity=".8" style="transform-origin: ${e}px ${t - 10}px"/></g>`, it = {
	robot: N`${rt(30, 12)}<path d="M46 22l12 7v9H44z" fill="#9aa3b2" stroke=${I} stroke-width="1.4" stroke-linejoin="round"/>
    <rect x="8" y="12" width="40" height="22" rx="7" fill="#e8ecf2" stroke=${I} stroke-width="1.6"/><path d="M13 19h9" stroke="#3f9a3f" stroke-width="3" stroke-linecap="round"/>
    <circle cx="37" cy="21" r="5.500" fill="#fff" stroke=${I} stroke-width="1.4"/><circle cx="38.500" cy="21" r="2.200" fill=${I}/>
    <path d="M20 12V5" stroke=${I} stroke-width="1.6"/><circle class="twinkle" cx="20" cy="4" r="2.800" fill="#e2483d"/>
    <circle cx="18" cy="36" r="6" fill=${I}/><circle cx="18" cy="36" r="2" fill="#9aa3b2"/><circle cx="38" cy="36" r="6" fill=${I}/><circle cx="38" cy="36" r="2" fill="#9aa3b2"/>`,
	blower: N`${rt(36, 14)}<path d="M28 15V8q0-5-8-5" fill="none" stroke="#c9342c" stroke-width="6" stroke-linecap="round"/><path d="M13 20L3 9" stroke=${I} stroke-width="2.600" stroke-linecap="round"/>
    <rect x="12" y="14" width="30" height="19" rx="4" fill="#e2483d" stroke=${I} stroke-width="1.6"/>
    <path d="M42 17h11a5 5 0 0 1 5 5v16H42z" fill="#f5c542" stroke=${I} stroke-width="1.6" stroke-linejoin="round"/><path d="M45 24l10 5m-10 2l10 5" stroke=${I} stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="22" cy="36" r="6" fill=${I}/><circle cx="22" cy="36" r="2" fill="#9aa3b2"/>`
}, at = {
	snowman: () => N`<ellipse cx="100" cy="155" rx="84" ry="7" fill="#fff"/>
    <path d="M64 110L34 88m8 6l-2-12m2 12l-12 2M136 110l30-22m-8 6l2-12m-2 12l12 2" stroke="#6b4a2f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="118" r="38" fill="#fff" stroke="#b9cfe6" stroke-width="1.5"/><circle cx="100" cy="66" r="27" fill="#fff" stroke="#b9cfe6" stroke-width="1.5"/>
    <rect x="80" y="24" width="40" height="22" rx="3" fill=${I}/><rect x="70" y="42" width="60" height="6" rx="3" fill=${I}/><rect x="80" y="36" width="40" height="5" fill="#d8413c"/>
    <circle cx="91" cy="62" r="3" fill=${I}/><circle cx="109" cy="62" r="3" fill=${I}/><path d="M100 68l22 5-22 4z" fill="#f08a24"/>
    <path d="M76 84q24 12 48 0v9q-24 12-48 0z" fill="#d8413c"/><path d="M112 90l8 26-10 2-6-24z" fill="#d8413c"/>
    ${[
		108,
		124,
		140
	].map((e) => N`<circle cx="100" cy=${e} r="3.2" fill=${I}/>`)}`,
	tree: () => N`<rect x="62" y="132" width="12" height="22" fill="#6b4a2f"/>
    <path d="M68 14l26 40H80l24 36H88l26 42H22l26-42H32l24-36H42z" fill="#1f7a4a"/>
    <path d="M68 2l4 9 10 1-7.5 7 2 10-8.5-5-8.5 5 2-10L54 12l10-1z" fill="#f5c542"/>
    ${[
		[
			60,
			60,
			"#d8413c"
		],
		[
			80,
			80,
			"#f5c542"
		],
		[
			50,
			100,
			"#4aa3df"
		],
		[
			86,
			112,
			"#d8413c"
		],
		[
			66,
			120,
			"#f5c542"
		],
		[
			40,
			124,
			"#fff"
		]
	].map(([e, t, n]) => N`<circle class="twinkle" cx=${e} cy=${t} r="4.5" fill=${n} style="animation-delay: -${Number(e) % 7}s"/>`)}
    <rect x="120" y="112" width="44" height="42" rx="3" fill="#d8413c"/><rect x="139" y="112" width="6" height="42" fill="#f5c542"/><rect x="120" y="128" width="44" height="6" fill="#f5c542"/>
    <path d="M142 112q-14-16-18-4t18 4q14-16 18-4t-18 4" fill="none" stroke="#f5c542" stroke-width="4"/>
    <rect x="160" y="128" width="32" height="26" rx="3" fill="#2f8fd0"/><rect x="174" y="128" width="5" height="26" fill="#fff"/>
    <rect x="100" y="136" width="24" height="18" rx="2" fill="#f5c542"/><rect x="110" y="136" width="4" height="18" fill="#d8413c"/>`,
	clock: (e) => N`<path d="M20 150q20-50 8-96M176 150q-16-44-2-90" fill="none" stroke="#e8436e" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 9"/>
    <circle cx="100" cy="88" r="60" fill="#fff" stroke=${I} stroke-width="5"/>
    ${Xe(12).map((e) => N`<path d="M100 36v${e % 3 ? 6 : 12}" stroke=${I} stroke-width=${e % 3 ? 2 : 4} stroke-linecap="round" transform="rotate(${e * 30} 100 88)"/>`)}
    <path d="M100 88V56" stroke=${I} stroke-width="6" stroke-linecap="round" transform="rotate(${(e.getHours() % 12 + e.getMinutes() / 60) * 30} 100 88)"/>
    <path d="M100 88V42" stroke=${I} stroke-width="3.5" stroke-linecap="round" transform="rotate(${e.getMinutes() * 6} 100 88)"/>
    <circle cx="100" cy="88" r="5" fill="#e8436e"/>
    <path d="M52 30l-8-18 18 8zM148 30l8-18-18 8z" fill="#f5c542"/>`,
	heart: () => N`<path d="M8 124L192 38" stroke="#7a5a30" stroke-width="4" stroke-linecap="round"/><path d="M8 124l-4-13m4 13l-14 2m22-8l-4-13m4 13l-14 2" stroke="#7a5a30" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path class="beat" d="M100 150C40 104 20 76 20 50a36 36 0 0 1 80-14 36 36 0 0 1 80 14c0 26-20 54-80 100z" fill="#e8436e"/>
    <path d="M44 46a18 18 0 0 1 22-14" stroke="#fff" opacity=".6" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M192 38l-24 1 11 18z" fill="#7a5a30"/>`,
	daisies: () => N`<path d="M0 160q100-22 200 0z" fill="#6cbf5a"/>
    <path d="M60 150q-6-50 4-84M110 152q4-60-6-104M150 150q8-40 0-66M86 150q-10-20-22-24M124 150q12-22 24-24" fill="none" stroke="#3f9a3f" stroke-width="3.5" stroke-linecap="round"/>
    ${Ze(64, 62, 24)}${Ze(104, 44, 30)}${Ze(150, 80, 22)}
    <g class="bob"><ellipse cx="166" cy="32" rx="11" ry="8" fill="#f5c542" stroke=${I} stroke-width="1.5"/><path d="M162 25v14M168 25v14" stroke=${I} stroke-width="2.5"/>
      <ellipse cx="160" cy="22" rx="7" ry="4.5" fill="#fff" opacity=".85" stroke="#9aa3ad" stroke-width=".8" transform="rotate(-25 160 22)"/><ellipse cx="170" cy="21" rx="7" ry="4.5" fill="#fff" opacity=".85" stroke="#9aa3ad" stroke-width=".8" transform="rotate(20 170 21)"/></g>`,
	bunny: () => N`<path d="M0 160q100-20 200 0z" fill="#6cbf5a"/>
    <path d="M84 86q-16-60 4-68 14 8 10 68zM116 86q16-60-4-68-14 8-10 68z" fill="#f4efe9" stroke="#d9cfc4" stroke-width="1.5"/><path d="M86 76q-8-40 2-48 6 8 4 48zM114 76q8-40-2-48-6 8-4 48z" fill="#f7b6cf"/>
    <ellipse cx="100" cy="112" rx="38" ry="32" fill="#f4efe9" stroke="#d9cfc4" stroke-width="1.5"/>
    <circle cx="86" cy="104" r="4" fill=${I}/><circle cx="114" cy="104" r="4" fill=${I}/><path d="M96 114h8l-4 5z" fill="#f08aa8"/>
    <path d="M100 119v6m0 0q-6 5-11 1m11-1q6 5 11 1M72 116l-20-4m20 9l-20 4M128 116l20-4m-20 9l20 4" fill="none" stroke="#9a8f86" stroke-width="1.5" stroke-linecap="round"/>
    ${Qe(38, 136, 15, "#f7b6cf", "#fff")}${Qe(162, 138, 14, "#a8d8f0", "#fbe38a")}${Qe(134, 144, 11, "#fbe38a", "#f08aa8")}${Qe(66, 146, 10, "#c9b6f0", "#fff")}
    ${et(160)}`,
	sandcastle: () => N`<path d="M0 160q100-26 200 0z" fill="#ecd29a"/>
    <path d="M100 44V12" stroke="#7a5a30" stroke-width="2.5" stroke-linecap="round"/><path class="wave" d="M100 12l26 7-26 9z" fill="#e2483d"/>
    <rect x="85" y="44" width="30" height="52" fill="#e3bd76"/>${[
		85,
		97,
		109
	].map((e) => N`<rect x=${e} y="36" width="6" height="9" fill="#e3bd76"/>`)}
    <rect x="56" y="86" width="88" height="62" fill="#e3bd76"/>${[
		56,
		73,
		90,
		107,
		124,
		138
	].map((e) => N`<rect x=${e} y="77" width="9" height="10" fill="#e3bd76"/>`)}
    ${[38, 132].map((e) => N`<rect x=${e} y="62" width="30" height="88" fill="#d9b166"/>${[
		0,
		11,
		22
	].map((t) => N`<rect x=${e + t} y="53" width="8" height="10" fill="#d9b166"/>`)}<rect x=${e + 11} y="78" width="8" height="14" rx="4" fill="#a9824a"/>`)}
    <rect x="96" y="58" width="8" height="14" rx="4" fill="#a9824a"/><path d="M88 148v-22a12 12 0 0 1 24 0v22z" fill="#a9824a"/>
    <path d="M170 126l4 26h18l4-26z" fill="#e2483d"/><path d="M170 126q13-18 26 0" fill="none" stroke="#e2483d" stroke-width="2.5"/>
    <path d="M22 108l10 40" stroke="#2f8fd0" stroke-width="3.5" stroke-linecap="round"/><path d="M27 142l10 8-4 10-10-4z" fill="#2f8fd0"/>`,
	hedgehog: () => N`<path d="M0 160q100-20 200 0z" fill="#b5651d" opacity=".55"/>
    <path d="M44 122l-12-14 17 5-5-19 17 12 0-21 14 16 7-21 10 18 12-16 5 20 14-11-2 19 15-5-8 17" fill="#5b3a1d" stroke="#5b3a1d" stroke-width="4" stroke-linejoin="round"/>
    <path d="M40 152q-6-50 48-54t62 36q4 10-2 18z" fill="#7a4f2a"/><path d="M136 126q32 2 48 24-12 4-48 2z" fill="#e6c9a0"/>
    <circle cx="184" cy="149" r="4.5" fill=${I}/><circle cx="158" cy="134" r="3.2" fill=${I}/><path d="M60 152v6m24-6v6m30-6v6" stroke="#5b3a1d" stroke-width="5" stroke-linecap="round"/>
    <path d="M12 154v-22h10v22z" fill="#f3ead8"/><path d="M-2 134q19-32 38 0z" fill="#d8413c"/><circle cx="12" cy="124" r="2.5" fill="#fff"/><circle cx="24" cy="128" r="2" fill="#fff"/>
    ${$e(170, 110, 30, "#e0872a")}${$e(28, 100, -40, "#c94f1d")}${$e(120, 84, 80, "#e3b23c")}`,
	lantern: () => N`<ellipse cx="80" cy="154" rx="70" ry="6" fill="#000" opacity=".25"/>
    <path d="M76 72q0-14 12-18l4 6q-6 4-6 12z" fill="#4c7a2a"/>
    <ellipse cx="80" cy="112" rx="62" ry="44" fill="#ee7a1c"/><ellipse cx="80" cy="112" rx="38" ry="44" fill="#f59330"/><ellipse cx="80" cy="112" rx="13" ry="44" fill="#ee7a1c"/>
    <g class="twinkle"><path d="M46 98l18-12 4 18zM114 98l-18-12-4 18zM74 110h12l-6-9z" fill="#ffe27a"/>
      <path d="M42 120l10 8 8-8 10 9 10-9 10 9 10-9 8 8 10-8q-8 28-38 28t-38-28z" fill="#ffe27a"/></g>
    <g class="bob"><path d="M150 150V92a22 22 0 0 1 44 0v58l-7.5-8-7 8-7.5-8-7 8-7.5-8z" fill="#fff" opacity=".93"/>
      <circle cx="165" cy="92" r="4" fill=${I}/><circle cx="180" cy="92" r="4" fill=${I}/><ellipse cx="172" cy="107" rx="4" ry="6" fill=${I}/></g>`
}, ot = {
	drift: tt,
	presents: N`${tt}
    <rect x="28" y="38" width="26" height="24" rx="2" fill="#d8413c"/><rect x="39" y="38" width="4" height="24" fill="#f5c542"/><path d="M41 38q-8-9-10-2t10 2q8-9 10-2t-10 2" fill="none" stroke="#f5c542" stroke-width="2.5"/>
    <path d="M118 62V40a8 8 0 0 1 16 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M118 62V40a8 8 0 0 1 16 0" fill="none" stroke="#d8413c" stroke-width="6" stroke-dasharray="5 6"/>
    <rect x="176" y="44" width="22" height="20" rx="2" fill="#1f7a4a"/><rect x="185" y="44" width="4" height="20" fill="#fff"/><rect x="196" y="50" width="18" height="16" rx="2" fill="#2f8fd0"/><rect x="203" y="50" width="4" height="16" fill="#f5c542"/>`,
	meadow: N`<path d="M0 74V58q60-14 120 0t120 0v16z" fill="#6cbf5a"/>
    <path d="M30 60V38M96 58V28M150 60V42M210 58V32" stroke="#3f9a3f" stroke-width="2.5" stroke-linecap="round"/>
    ${Ze(30, 36, 11)}${Ze(96, 26, 13)}${Ze(150, 40, 10)}${Ze(210, 30, 12)}${et(66)}`,
	eggs: N`<path d="M0 74V58q60-14 120 0t120 0v16z" fill="#6cbf5a"/>
    ${Qe(34, 54, 9, "#f7b6cf", "#fff")}${Qe(104, 50, 10, "#a8d8f0", "#fbe38a")}${Qe(168, 55, 8, "#fbe38a", "#f08aa8")}${Qe(214, 52, 9, "#c9b6f0", "#fff")}${et(68)}`,
	sea: N`<path d="M162 34l22 4-22 6zM160 22v26" fill="#fff" stroke="#fff" stroke-width="2"/><path d="M146 48h32l-6 9h-20z" fill="#e2483d"/>
    <path d="M0 74V46q15-10 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0v28z" fill="#4aa9dc"/><path d="M0 74V58q15-9 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0v16z" fill="#8fd0ee"/>`,
	leaves: N`<path d="M0 74V58q30-14 60-4t60-6 60 6 60-2v22z" fill="#b5651d"/>
    ${[
		[
			14,
			56,
			20,
			"#e0872a"
		],
		[
			40,
			50,
			-50,
			"#c94f1d"
		],
		[
			70,
			60,
			70,
			"#e3b23c"
		],
		[
			98,
			50,
			10,
			"#e0872a"
		],
		[
			128,
			58,
			-30,
			"#a8421a"
		],
		[
			156,
			50,
			100,
			"#e3b23c"
		],
		[
			186,
			58,
			-70,
			"#c94f1d"
		],
		[
			220,
			52,
			40,
			"#e0872a"
		]
	].map(([e, t, n, r]) => $e(Number(e), Number(t), Number(n), String(r)))}
    <path d="M108 66v-12h6v12z" fill="#f3ead8"/><path d="M100 56q11-18 22 0z" fill="#d8413c"/>`,
	graves: N`<path d="M0 74V60q60-8 120 0t120 0v14z" fill="#2a2033"/>
    <path d="M40 64V40a11 11 0 0 1 22 0v24z" fill="#6b6877"/><path d="M47 46h8m-4-4v12" stroke="#2a2033" stroke-width="2"/>
    <path d="M100 66V34m14 32V38m14 28V32m14 34V40M96 46h50M96 56h50" stroke="#2a2033" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="190" cy="56" rx="15" ry="11" fill="#ee7a1c"/><ellipse cx="190" cy="56" rx="6" ry="11" fill="#f59330"/><path d="M189 46q0-6 5-7" fill="none" stroke="#4c7a2a" stroke-width="3"/>
    <path d="M183 53l5-3 1 5zM197 53l-5-3-1 5zM183 60q7 5 14 0" fill="#ffe27a"/>`,
	skyline: N`<path d="M0 74V44h18V30h20v20h14V22h22v30h12V38h24v18h12V16h20v36h14V34h22v22h12V26h18v30h14V42h18v32z" fill="#1d2033"/>
    ${[
		[24, 38],
		[30, 46],
		[58, 30],
		[66, 40],
		[58, 50],
		[96, 46],
		[108, 54],
		[140, 24],
		[146, 36],
		[140, 46],
		[170, 42],
		[182, 50],
		[208, 34],
		[214, 46],
		[230, 52]
	].map(([e, t]) => N`<rect x=${e} y=${t} width="4" height="5" fill="#ffe27a"/>`)}`
}, st = {
	climate: [
		[
			"Mode",
			"hvac_modes",
			"",
			"climate.set_hvac_mode",
			"hvac_mode"
		],
		[
			"Preset",
			"preset_modes",
			"preset_mode",
			"climate.set_preset_mode",
			"preset_mode"
		],
		[
			"Fan",
			"fan_modes",
			"fan_mode",
			"climate.set_fan_mode",
			"fan_mode"
		]
	],
	media_player: [[
		"Source",
		"source_list",
		"source",
		"media_player.select_source",
		"source"
	], [
		"Sound",
		"sound_mode_list",
		"sound_mode",
		"media_player.select_sound_mode",
		"sound_mode"
	]],
	fan: [[
		"Preset",
		"preset_modes",
		"preset_mode",
		"fan.set_preset_mode",
		"preset_mode"
	]],
	humidifier: [[
		"Mode",
		"available_modes",
		"mode",
		"humidifier.set_mode",
		"mode"
	]],
	water_heater: [[
		"Mode",
		"operation_list",
		"operation_mode",
		"water_heater.set_operation_mode",
		"operation_mode"
	]],
	vacuum: [[
		"Suction",
		"fan_speed_list",
		"fan_speed",
		"vacuum.set_fan_speed",
		"fan_speed"
	]],
	light: [[
		"Effect",
		"effect_list",
		"effect",
		"light.turn_on",
		"effect"
	]]
};
function ct(e, t) {
	return !t || t.state === "unavailable" ? [] : (st[e] ?? []).flatMap(([e, n, r, i, a]) => {
		let o = Array.isArray(t.attributes[n]) ? t.attributes[n].filter((e) => typeof e == "string") : [], s = r ? t.attributes[r] : t.state;
		return o.length > 1 ? [{
			what: e,
			options: o,
			now: typeof s == "string" ? s : void 0,
			service: i,
			key: a
		}] : [];
	});
}
var lt = (e, t, n) => ({
	domain: t.service.split(".")[0],
	service: t.service.split(".")[1],
	ids: [e],
	data: { [t.key]: n }
}), ut = (e) => e.replace(/_/g, " "), dt = "input_text.zenos_persona_name", ft = "zen_summary", pt = 36e5, mt = .5, L = (e) => typeof e == "string" && e.trim() ? e.trim() : void 0, ht = (e) => (Number(e) || 0) < mt, gt = (e) => e[0].toUpperCase() + e.slice(1).replace(/_/g, " "), _t = (e, t) => t - e.at > pt;
function vt(e, t, n) {
	let r = e?.attributes?.variables;
	if (!r || typeof r != "object") return;
	let i = n?.attributes?.variables ?? {}, a = Object.entries(r).flatMap(([e, t]) => {
		let n = t?.value;
		if (e.startsWith("_") || !n || typeof n != "object" || !("watchlist" in n)) return [];
		let r = i[e]?.value;
		if (e.startsWith("zen_") || r?.pipeline_tier === "system") return [];
		let a = L(n.subjective) ?? L(n.general_inference) ?? L(n.attention), o = L(n.error);
		if (!a && !o) return [];
		let s = L(n.attention);
		return [{
			id: e,
			name: L(r?.friendly_name) ?? gt(e),
			text: a ?? o,
			attention: a && s !== a ? s : void 0,
			urgency: Number(n.urgency) || 0,
			unsure: ht(n.confidence),
			failed: !a,
			at: Date.parse(t.timestamp) || 0
		}];
	}).sort((e, t) => t.urgency - e.urgency || t.at - e.at), o = r[ft]?.value?.zen_summary, s = L(o?.summary), c = s ? {
		text: s,
		attention: L(o.attention),
		objective: L(o.objective),
		urgency: Number(o.urgency) || 0,
		unsure: ht(o.confidence),
		errors: (Array.isArray(o.errors) ? o.errors : []).flatMap((e) => L(e) ?? []),
		at: Date.parse(o.timestamp ?? r[ft].timestamp) || 0
	} : void 0;
	if (!c && !a.length) return;
	let l = L(t);
	return {
		by: l === "unknown" || l === "unavailable" ? void 0 : l,
		lead: c,
		pieces: a
	};
}
//#endregion
//#region src/dash-bored/house.ts
var yt = 1, bt = 4;
function xt(e) {
	return (Array.isArray(e) ? e : []).filter((e) => typeof e?.temperature == "number" && Date.parse(e.datetime)).slice(0, bt).map((e) => ({
		at: Date.parse(e.datetime),
		sky: String(e.condition ?? ""),
		high: e.temperature,
		low: typeof e.templow == "number" ? e.templow : void 0
	}));
}
var St = "dash_bored_hide", Ct = "casa_mia_dash_bored", wt = /\b(led|relay|screen|screensaver|in use|enabled|watching|mode|program(me)?|charge)\b/i, Tt = {
	climate: "thermostat",
	media_player: "player",
	lawn_mower: "mower",
	water_heater: "water heater",
	alarm_control_panel: "alarm"
}, Et = /* @__PURE__ */ new Set(["climate", "water_heater"]), Dt = /* @__PURE__ */ new Set([
	"lock",
	"valve",
	"siren"
]), Ot = /* @__PURE__ */ new Set([
	"garage",
	"gate",
	"door"
]);
function kt(e, t, n) {
	let r = (jt(e, t) ?? e).replace(n === "light" ? /\s+lights?$/i : n === "switch" ? /\s+switch$/i : /$^/, ""), i = Tt[n] ?? n;
	return At(!r || RegExp(`^${i}s?$`, "i").test(r) ? i : r);
}
var At = (e) => e[0].toUpperCase() + e.slice(1);
function jt(e, t) {
	let n = e.slice(t.length);
	if (t && e.toLowerCase().startsWith(t.toLowerCase()) && !/^[a-z0-9]/i.test(n)) return n.replace(/^[\s\-–—:,.]+/, "");
}
function Mt(e, t) {
	let n = /* @__PURE__ */ new Map(), r = [], i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Set(), o = [], s = [], c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map(), u = t.weather, d, f, p = [], m = [], h = [], g = [], _ = (e) => !!e?.labels?.includes(St), v = /* @__PURE__ */ new Map(), y = /* @__PURE__ */ new Map();
	for (let n of t.cameras ?? []) {
		for (let e of [
			n.entity,
			n.medium,
			n.high
		]) e && v.set(e, n);
		let t = e.entities?.[n.entity]?.device_id;
		t && y.set(t, n);
	}
	let b = (e, t) => Dt.has(e) || e === "cover" && Ot.has(t.attributes.device_class);
	for (let h of Object.values(e.entities ?? {})) {
		let v = h.entity_id, y = e.states[v], x = v === t.entity;
		if (t.entity && !x || (h.labels?.includes("zen_kata_cabinet") && !_(h) && (d = v), h.labels?.includes("zen_dojo_cabinet") && (f = v), !y || !x && (h.hidden || h.entity_category))) continue;
		let S = v.split(".")[0];
		S === "weather" && (!u || v === "weather.home") && !t.weather && (u = v), S === "sensor" && y.attributes.device_class === "power" && h.device_id && c.set(h.device_id, v);
		let C = e.devices?.[h.device_id], w = e.areas?.[h.area_id ?? C?.area_id];
		if (!x && (_(h) || _(C) || _(w))) continue;
		if (S === "person" && o.push(v), S === "scene" && r.push({
			id: v,
			name: y.attributes.friendly_name ?? h.name ?? v,
			area: x ? void 0 : w?.area_id
		}), S === "image" && h.platform === Ct && !_(e.entities[y.attributes.camera]) && (s.push({
			id: v,
			name: C?.name_by_user ?? C?.name ?? v,
			room: w?.name
		}), a.add(y.attributes.camera)), Rt.has(S)) {
			let e = y.attributes.friendly_name ?? h.name ?? v;
			w || p.push({
				id: v,
				name: e
			}), !w && !x && S === "light" && m.push({
				id: v,
				kind: "light",
				name: e,
				full: e,
				guarded: !1
			}), wt.test(e) && g.push({
				id: v,
				name: e,
				via: h.platform
			});
		}
		if (!Rt.has(S) || !w && !x) continue;
		let T = x ? "" : w.area_id;
		if (x && n.set(T, {
			id: T,
			name: "",
			level: Infinity,
			devices: [],
			scenes: []
		}), !n.has(T)) {
			let t = e.floors?.[w.floor_id];
			n.set(T, {
				id: T,
				name: w.name,
				floor: t?.name,
				floorId: t?.floor_id,
				level: t ? t.level ?? 0 : Infinity,
				temp: w.temperature_entity_id ?? void 0,
				humidity: w.humidity_entity_id ?? void 0,
				devices: [],
				scenes: []
			});
		}
		let E = n.get(T);
		S === "climate" && (E.climate ??= v);
		let D = y.attributes.friendly_name ?? h.name ?? v, O = {
			id: v,
			kind: S,
			name: x ? D : kt(D, w.name, S),
			full: D,
			guarded: b(S, y)
		};
		E.devices.push(O), S === "switch" && h.device_id && l.set(O, h.device_id), S === "camera" && C && !x && i.set(O, {
			device: h.device_id,
			name: C.name_by_user ?? C.name ?? D
		});
	}
	let x = (e) => (a.has(e.id) ? 2 : 0) + +(v.get(e.id)?.entity === e.id);
	for (let t of n.values()) {
		let n = /* @__PURE__ */ new Map();
		for (let e of [...t.devices].sort((e, t) => e.id.localeCompare(t.id))) {
			let t = i.get(e);
			if (!t) continue;
			let r = n.get(t.device);
			(!r || x(e) > x(r)) && n.set(t.device, e);
		}
		let r = new Set([...i].filter(([e, r]) => n.get(r.device) !== e && t.devices.includes(e)).map(([, e]) => e.device));
		t.devices = t.devices.filter((e) => !i.has(e) || n.get(i.get(e).device) === e);
		for (let e of r) {
			let r = n.get(e);
			r.full = i.get(r).name, r.name = kt(r.full, t.name, "camera");
		}
		for (let n of t.devices) {
			let r = n.kind === "camera" ? v.get(n.id) ?? y.get(i.get(n)?.device ?? "") : void 0;
			r && (n.lens = r, n.full = r.title, n.name = kt(r.title, t.name, "camera"), n.controls = r.controls.flatMap((t) => {
				let n = e.states[t.entity];
				if (!n) return [];
				let r = t.entity.split(".")[0], i = t.name || n.attributes.friendly_name || t.entity;
				return [{
					id: t.entity,
					name: i,
					found: Rt.has(r) ? {
						id: t.entity,
						kind: r,
						name: i,
						full: i,
						guarded: b(r, n)
					} : void 0
				}];
			}));
		}
	}
	let S = /* @__PURE__ */ new Map();
	for (let e of l.values()) S.set(e, (S.get(e) ?? 0) + 1);
	for (let [e, t] of l) S.get(t) === 1 && (e.power = c.get(t));
	let C = (e, t, n) => {
		let r = (e ?? []).findIndex((e) => e === t || !!n && e.toLowerCase() === n.toLowerCase());
		return r < 0 ? Infinity : r;
	}, { floors: w, rooms: T } = t, E = (e) => C(w ?? t.floor_order, e.floorId, e.floor), D = (e) => C(T ?? t.room_order, e.id, e.name), O = [...n.values()].filter((e) => (e.devices.length || e.temp) && (!w || E(e) < Infinity) && (!T || D(e) < Infinity)).sort((e, t) => E(e) - E(t) || e.level - t.level || (e.floor ?? "").localeCompare(t.floor ?? "") || D(e) - D(t) || e.name.localeCompare(t.name));
	for (let e of O) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.devices) t.set(n.name, (t.get(n.name) ?? 0) + 1);
		for (let n of e.devices) t.get(n.name) !== 1 && (n.name = n.full, h.push({
			id: n.id,
			name: n.full
		}));
	}
	for (let e of O) e.devices.sort((e, t) => e.kind.localeCompare(t.kind) || e.name.localeCompare(t.name));
	let ee = (e, t) => [...e].sort((e, n) => t(n).length - t(e).length), te = ee(O, (e) => e.name), ne = ee([...new Set(O.flatMap((e) => e.floor ? [e.floor] : []))], (e) => e), k = [];
	for (let e of r.sort((e, t) => e.name.localeCompare(t.name))) {
		let t = O.find((t) => t.id === e.area) ?? te.find((t) => jt(e.name, t.name) !== void 0), n = t ? void 0 : ne.find((t) => jt(e.name, t) !== void 0), r = jt(e.name, t?.name ?? n ?? "");
		(t?.scenes ?? k).push({
			id: e.id,
			name: r ? At(r) : e.name,
			full: e.name,
			floor: n
		});
	}
	let A = w || T ? [] : m, re = O.flatMap((e) => [
		e.temp,
		e.humidity,
		e.climate,
		...e.devices.flatMap((e) => [
			e.id,
			e.power,
			e.lens?.zoom,
			...(e.controls ?? []).map((e) => e.id)
		])
	]), ie = (e) => e.map((e) => ({
		id: e.id,
		name: e.name
	})), ae = {
		rooms: O,
		strays: A,
		people: o,
		sightings: s,
		gaps: [
			{
				kind: "loose",
				items: p
			},
			{
				kind: "plumbing",
				items: g.sort((e, t) => (e.via ?? "").localeCompare(t.via ?? "") || e.name.localeCompare(t.name))
			},
			{
				kind: "clash",
				items: h
			},
			{
				kind: "floorless",
				items: O.some((e) => e.floor) ? ie(O.filter((e) => !e.floor)) : []
			},
			{
				kind: "cold",
				items: ie(O.filter((e) => !e.temp && !e.climate))
			}
		].filter((e) => e.items.length),
		scenes: k,
		weather: u,
		power: t.power,
		desk: d,
		dojo: f,
		watched: [.../* @__PURE__ */ new Set([
			...re,
			...A.map((e) => e.id),
			...r.map((e) => e.id),
			...o,
			u,
			t.power,
			d,
			d && "input_text.zenos_persona_name",
			d && f,
			t.entity
		])].filter((e) => !!e)
	};
	return t.sample ? Ft(ae) : ae;
}
var Nt = 4, Pt = 2;
function Ft(e) {
	let t = (e) => new Set(e.devices.map((e) => e.kind)).size, n = e.rooms.reduce((e, n) => !e || t(n) > t(e) ? n : e, void 0);
	if (!n) return e;
	let r = n.devices.filter((e, t) => n.devices.findIndex((t) => t.kind === e.kind) === t), i = [...r, ...n.devices.filter((e) => !r.includes(e))].slice(0, Nt), a = e.scenes.filter((e) => !e.floor).slice(0, Pt), o = n.scenes.slice(0, Pt), s = [
		n.temp,
		n.humidity,
		n.climate,
		...i.flatMap((e) => [e.id, e.power]),
		...[...a, ...o].map((e) => e.id),
		...e.people,
		e.weather,
		e.power
	];
	return {
		...e,
		rooms: [{
			...n,
			devices: i,
			scenes: o
		}],
		strays: [],
		sightings: [],
		gaps: [],
		scenes: a,
		desk: void 0,
		dojo: void 0,
		watched: s.filter((e) => !!e)
	};
}
var R = (e) => (t) => t === e, It = (e) => (t) => t !== e, Lt = {
	light: R("on"),
	switch: R("on"),
	lock: R("locked"),
	cover: It("closed"),
	climate: It("off"),
	media_player: R("playing"),
	camera: () => !1,
	fan: R("on"),
	valve: It("closed"),
	vacuum: R("cleaning"),
	lawn_mower: R("mowing"),
	water_heater: It("off"),
	humidifier: R("on"),
	siren: R("on"),
	alarm_control_panel: (e) => e.startsWith("armed")
}, Rt = new Set(Object.keys(Lt)), zt = [
	"docked",
	"returning",
	"paused",
	"error"
], Bt = {
	vacuum: zt,
	lawn_mower: zt,
	alarm_control_panel: [
		"triggered",
		"pending",
		"arming"
	]
}, Vt = {
	light: ["brightness", (e) => Math.round(e / 255 * 100)],
	cover: ["current_position", (e) => e],
	climate: ["temperature", (e) => e],
	media_player: ["volume_level", (e) => Math.round(e * 100)],
	fan: ["percentage", (e) => e],
	valve: ["current_position", (e) => e],
	water_heater: ["temperature", (e) => e],
	humidifier: ["humidity", (e) => e]
}, Ht = (e) => e in Vt, Ut = {
	light: (e) => (e.supported_color_modes ?? []).some((e) => e !== "onoff"),
	cover: (e) => !!(e.supported_features & 4),
	climate: (e) => !!(e.supported_features & 1),
	media_player: (e) => !!(e.supported_features & 4),
	fan: (e) => !!(e.supported_features & 1),
	water_heater: (e) => !!(e.supported_features & 1),
	humidifier: () => !0
}, Wt = {
	min: 0,
	max: 100,
	step: 1,
	vote: 10
}, Gt = {
	climate: (e) => ({
		min: e.min_temp ?? 7,
		max: e.max_temp ?? 35,
		step: e.target_temp_step ?? .5,
		vote: .5
	}),
	water_heater: (e) => ({
		min: e.min_temp ?? 30,
		max: e.max_temp ?? 70,
		step: e.target_temp_step ?? 1,
		vote: 1
	}),
	humidifier: (e) => ({
		min: e.min_humidity ?? 0,
		max: e.max_humidity ?? 100,
		step: 1,
		vote: 5
	}),
	media_player: () => ({
		...Wt,
		vote: 5
	})
}, Kt = (e, t) => Gt[e]?.(t) ?? Wt;
function qt(e, t) {
	let n = !t || t.state === "unavailable", r = !n && Lt[e](t.state), [i, a] = Vt[e] ?? [], o = i && t?.attributes[i];
	return {
		on: r,
		phase: t && Bt[e]?.includes(t.state) ? t.state : void 0,
		level: typeof o == "number" && a ? a(o) : void 0,
		away: n
	};
}
function Jt(e, t) {
	let n = (e) => {
		let n = e ? t.states[e] : void 0, r = Number(n?.state);
		return n && n.state !== "" && Number.isFinite(r) ? r : void 0;
	}, r = (e) => {
		let r = n(e);
		return r === void 0 ? void 0 : t.states[e].attributes.unit_of_measurement === "kW" ? r : r / 1e3;
	}, i = [], a = (e) => {
		let r = n(e), i = e ? t.states[e]?.attributes ?? {} : {};
		return r === void 0 ? void 0 : {
			id: e,
			level: r,
			span: {
				min: i.min ?? 0,
				max: i.max ?? 100,
				step: i.step ?? 1,
				vote: i.step ?? 1
			}
		};
	}, o = (e, n) => {
		let s = t.states[e.id], { on: c, phase: l, level: u, away: d } = qt(e.kind, s), f = s?.attributes ?? {}, p = !e.guarded && !!Ut[e.kind]?.(f), m = c ? r(e.power) : void 0;
		return m !== void 0 && m >= 1 && i.push({
			id: e.id,
			name: e.name,
			room: n,
			kw: m
		}), {
			id: e.id,
			name: e.name,
			kind: e.kind,
			on: c,
			phase: l,
			level: u,
			dims: p,
			span: Kt(e.kind, f),
			temp: Et.has(e.kind) && typeof f.current_temperature == "number" ? f.current_temperature : void 0,
			title: e.kind === "media_player" && c && [f.media_title, f.media_artist].filter(Boolean).join(", ") || void 0,
			picture: e.kind === "camera" ? f.entity_picture : void 0,
			away: d,
			since: Date.parse(s?.last_changed ?? "") || 0,
			guarded: e.guarded,
			room: n,
			choices: ct(e.kind, s),
			...e.lens ? {
				zoom: a(e.lens.zoom),
				presets: e.lens.presets,
				controls: (e.controls ?? []).map((e) => ({
					id: e.id,
					name: e.name,
					away: (t.states[e.id]?.state ?? "unavailable") === "unavailable",
					device: e.found && o(e.found, n)
				}))
			} : {}
		};
	}, s = (e) => t.states[e.id] ? [{
		...e,
		at: Date.parse(t.states[e.id].state) || 0
	}] : [], c = e.rooms.map((e) => {
		let r = e.climate ? t.states[e.climate] : void 0, i = r?.attributes.temperature, a = e.devices.map((t) => o(t, e.name));
		return {
			id: e.id,
			name: e.name,
			floor: e.floor,
			temp: n(e.temp) ?? (typeof r?.attributes.current_temperature == "number" ? r.attributes.current_temperature : void 0),
			target: r && r.state !== "off" && typeof i == "number" ? i : void 0,
			humidity: n(e.humidity),
			devices: a,
			scenes: e.scenes.flatMap(s)
		};
	}), l = e.weather ? t.states[e.weather] : void 0, u = e.people.flatMap((e) => {
		let n = t.states[e];
		return n && n.state !== "unavailable" && n.state !== "unknown" ? [{
			id: e,
			name: n.attributes.friendly_name ?? e,
			place: n.state,
			since: Date.parse(n.last_changed ?? "") || 0
		}] : [];
	});
	return {
		rooms: c,
		strays: e.strays.map((e) => o(e, "")),
		people: u,
		gaps: e.gaps,
		scenes: e.scenes.flatMap(s),
		appliances: i,
		outside: typeof l?.attributes.temperature == "number" ? {
			temp: l.attributes.temperature,
			humidity: l.attributes.humidity,
			sky: l.state,
			id: e.weather,
			daily: !!(l.attributes.supported_features & yt)
		} : void 0,
		kw: r(e.power),
		desk: e.desk ? vt(t.states[e.desk], t.states[dt]?.state, e.dojo ? t.states[e.dojo] : void 0) : void 0
	};
}
function Yt(e, t) {
	let n = new Map(e.sightings.map((e) => [e.id, e]));
	return t.flatMap((e) => {
		let t = n.get(e.entity), r = e.photo ? `/api/${Ct}/photo/${e.id}?v=${e.changed}` : void 0;
		return t ? [{
			id: e.id,
			camera: e.camera,
			name: t.name,
			room: t.room,
			kind: e.kind,
			at: e.at * 1e3,
			photo: r
		}] : [];
	});
}
var Xt = (e) => [...e.rooms.flatMap((e) => e.devices), ...e.strays].filter((e) => e.kind === "light" && !e.away), Zt = (e) => [...e.scenes, ...e.rooms.flatMap((e) => e.scenes)].map((e) => ({
	...e,
	name: e.full
})), Qt = {
	lock: ["unlock", "lock"],
	cover: ["close_cover", "open_cover"],
	media_player: ["media_pause", "media_play"],
	valve: ["close_valve", "open_valve"],
	vacuum: ["return_to_base", "start"],
	lawn_mower: ["dock", "start_mowing"]
}, z = (e) => ({
	domain: e.kind,
	service: (Qt[e.kind] ?? ["turn_off", "turn_on"])[+!e.on],
	ids: [e.id]
}), $t = {
	light: ["turn_on", (e) => ({ brightness_pct: e })],
	cover: ["set_cover_position", (e) => ({ position: e })],
	climate: ["set_temperature", (e) => ({ temperature: e })],
	media_player: ["volume_set", (e) => ({ volume_level: e / 100 })],
	fan: ["set_percentage", (e) => ({ percentage: e })],
	water_heater: ["set_temperature", (e) => ({ temperature: e })],
	humidifier: ["set_humidity", (e) => ({ humidity: e })]
};
function en(e, t) {
	if (e.kind === "light" && !t) return {
		domain: "light",
		service: "turn_off",
		ids: [e.id]
	};
	let [n, r] = $t[e.kind];
	return {
		domain: e.kind,
		service: n,
		ids: [e.id],
		data: r(t)
	};
}
var tn = (e, t) => ({
	domain: "number",
	service: "set_value",
	ids: [e.zoom.id],
	data: { value: t }
}), nn = (e) => ({
	domain: e.action.split(".")[0],
	service: e.action.split(".")[1] ?? "",
	ids: [],
	data: e.data
}), rn = {
	button: "button.press",
	input_button: "input_button.press",
	script: "script.turn_on",
	scene: "scene.turn_on"
};
function an(e) {
	let [t, n] = (rn[e.id.split(".")[0]] ?? "homeassistant.toggle").split(".");
	return {
		domain: t,
		service: n,
		ids: [e.id]
	};
}
var on = 6, sn = 60, B = (e) => e.trim().toLowerCase(), cn = (e, t) => B(e.title) === B(t.title) && (!e.artist || !t.artist || B(e.artist) === B(t.artist));
function ln(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of [...e].sort((e, t) => e.at - t.at)) t.set(`${B(n.name)}\n${B(n.title)}\n${B(n.artist)}`, n);
	return [...t.values()].filter((e) => e.kind !== "clear");
}
function un(e, t, n) {
	let r = ln(t), i = /* @__PURE__ */ new Map();
	for (let t of [...e].sort((e, t) => e.at - t.at)) i.set(t.entity_id, t.id);
	let a = [];
	for (let t of [...e].sort((e, t) => t.at - e.at)) {
		let e = n.get(t.entity_id);
		if (!e) continue;
		let o = e.on && i.get(e.id) === t.id && (!e.title || B(e.title).startsWith(B(t.title))), s = e.room.toLowerCase(), c = a.find((e) => e.live === o && e.vars.title === t.title && e.vars.artist === t.artist && e.at - t.at * 1e3 < sn * 1e3);
		c ? (c.rooms.includes(s) || c.rooms.unshift(s), c.vars.room = c.rooms.length > 1 ? `${c.rooms.slice(0, -1).join(", ")} and ${c.rooms.at(-1)}` : s) : a.push({
			id: e.id,
			at: t.at * 1e3,
			kind: t.show ? "show" : "song",
			live: o,
			rooms: [s],
			vars: {
				title: t.title,
				artist: t.artist,
				name: e.name,
				room: s
			},
			marks: t.show ? [] : r.filter((e) => cn(e, t))
		});
	}
	return a.slice(0, on);
}
var dn = 432e5, fn = 8;
function pn(e, t, n) {
	let r = e.map((e) => ({
		kind: e.place === "home" ? "home" : e.place === "not_home" ? "left" : "zone",
		at: e.since,
		vars: {
			name: e.name,
			place: e.place
		}
	})), i = ln(t).map((e) => ({
		kind: e.kind,
		at: e.at * 1e3,
		vars: {
			name: e.name,
			title: e.title,
			artist: e.artist
		}
	}));
	return [...r, ...i].filter((e) => e.at && n - e.at < dn).sort((e, t) => t.at - e.at).slice(0, fn);
}
var mn = "nominal", hn = 6e5, gn = {
	critical: 100,
	error: 95,
	warning: 70,
	task: 40
}, _n = {
	alarm: 92,
	doorbell: 80,
	person: 62,
	vehicle: 42,
	animal: 41
}, vn = 30, yn = [
	"no",
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
	"eight",
	"nine",
	"ten",
	"eleven",
	"twelve"
], V = (e) => new Date(e).toTimeString().slice(0, 5), H = (e) => e && e[0].toUpperCase() + e.slice(1);
function U(e) {
	let t = yn[e] ?? String(e);
	return {
		n: String(e),
		N: H(t),
		n_word: t,
		s: e === 1 ? "" : "s",
		v: e === 1 ? "s" : ""
	};
}
function bn(e) {
	return {
		temperature: "temperature",
		moisture: "moisture",
		door: "opening",
		window: "opening",
		opening: "opening",
		garage_door: "opening",
		battery: "battery",
		smoke: "smoke"
	}[String(e)] ?? "";
}
function xn(e) {
	return typeof e.value == "number" || typeof e.value == "string" && e.value.trim() !== "" && Number.isFinite(Number(e.value)) ? `${e.value}${e.unit ? ` ${e.unit}` : ""}` : "";
}
function Sn(e, t, n, r = []) {
	let i = [], a = (e) => i.push({
		variant: "",
		flavour: "",
		...e
	}), o = e.rooms.flatMap((e) => e.devices);
	for (let e of t) {
		let t = {
			name: e.name,
			area: (e.area ?? "house").toLowerCase(),
			message: e.message || `${H(e.level)}.`,
			reading: xn(e),
			since: V(e.began),
			escalated: e.escalated ? "yes" : ""
		}, r = xn(e) ? [xn(e), e.area ?? e.name] : [H(e.level), e.name];
		e.level === "nominal" ? n - e.at < 6e5 && a({
			kind: "recovered",
			id: e.entity_id + ".ok",
			rank: 45,
			vars: {
				...t,
				minutes: String(Math.max(1, Math.round((e.at - e.began) / 6e4)))
			},
			figure: r
		}) : a({
			kind: "alert",
			variant: e.level,
			flavour: e.flavour,
			id: e.entity_id,
			rank: gn[e.level] ?? 70,
			vars: t,
			figure: r
		});
	}
	let s = /* @__PURE__ */ new Map();
	for (let e of r) {
		if (n - e.at >= 6e5 || !(e.kind in _n)) continue;
		let t = s.get(e.camera);
		(!t || _n[e.kind] > _n[t.kind] || _n[e.kind] === _n[t.kind] && e.at > t.at) && s.set(e.camera, e);
	}
	for (let e of [...s.values()].sort((e, t) => t.at - e.at)) a({
		kind: "sighting",
		variant: e.kind,
		id: "sighting." + e.camera,
		rank: _n[e.kind],
		vars: {
			name: e.name,
			room: (e.room ?? "house").toLowerCase(),
			at: V(e.at)
		},
		figure: [V(e.at), e.name],
		photo: e.photo,
		see: e.camera
	});
	for (let e of o) e.kind === "lock" && !e.on && !e.away && a({
		kind: "unlocked",
		id: e.id,
		rank: 90,
		vars: {
			name: e.name,
			room: e.room
		},
		figure: ["Open", e.name],
		press: {
			domain: "lock",
			service: "lock",
			ids: [e.id]
		}
	});
	for (let e of o) e.phase === "triggered" && a({
		kind: "triggered",
		id: e.id,
		rank: 110,
		vars: {
			name: e.name,
			room: e.room.toLowerCase()
		},
		figure: ["Alarm", e.room]
	});
	let c = o.filter((e) => e.away);
	if (c.length) {
		let e = c.slice(0, 3).map((e) => `${e.room} ${e.name.toLowerCase()}`).join(", ");
		a({
			kind: "offline",
			id: "offline",
			rank: 65,
			figure: [String(c.length), "not answering"],
			vars: {
				...U(c.length),
				names: c.length > 3 ? `${e} and ${c.length - 3} more` : e,
				since: V(Math.min(...c.map((e) => e.since)))
			}
		});
	}
	for (let t of e.appliances) a({
		kind: "appliance",
		id: "load." + t.id,
		rank: 55,
		vars: {
			name: t.name,
			room: t.room,
			kw: t.kw.toFixed(1)
		},
		figure: [t.kw.toFixed(1), "kilowatts"],
		press: {
			domain: "switch",
			service: "turn_off",
			ids: [t.id]
		}
	});
	let l = Xt(e), u = l.filter((e) => e.on);
	if (l.length) {
		let e = u.filter((e) => e.dims && (e.level ?? 100) > vn), t = u.length >= 7 && u.length * 2 >= l.length ? "ablaze" : u.length ? "lights" : "dark";
		a({
			kind: t,
			id: t,
			rank: {
				ablaze: 60,
				lights: 30,
				dark: 35
			}[t],
			vars: U(u.length),
			figure: [String(u.length), u.length === 1 ? "light on" : "lights on"],
			press: u.length ? {
				domain: "light",
				service: "turn_off",
				ids: u.map((e) => e.id)
			} : void 0,
			vote: e.length ? {
				domain: "light",
				service: "turn_on",
				ids: e.map((e) => e.id),
				data: { brightness_pct: vn }
			} : void 0
		});
	}
	for (let t of e.rooms) t.temp !== void 0 && t.target !== void 0 && t.temp < t.target - .8 && a({
		kind: "cold",
		id: "cold." + t.id,
		rank: 25,
		vars: {
			room: t.name,
			temp: t.temp.toFixed(1),
			short: (t.target - t.temp).toFixed(1)
		},
		figure: [t.temp.toFixed(1) + "°", t.name]
	});
	if (e.kw !== void 0 && a({
		kind: "power",
		id: "power",
		rank: 20,
		vars: { kw: e.kw.toFixed(2) },
		figure: [e.kw.toFixed(2), "kilowatts"]
	}), e.outside) {
		let { temp: t, humidity: n } = e.outside;
		a({
			kind: "weather",
			variant: t < 5 ? "freezing" : t < 12 ? "cold" : t > 24 ? "hot" : "mild",
			id: "weather",
			rank: 10,
			vars: { temp: t.toFixed(1) },
			figure: [t.toFixed(1) + "°", typeof n == "number" ? `${n}% humidity` : "outside"]
		});
	}
	return i.length || a({
		kind: "quiet",
		id: "quiet",
		rank: 1,
		vars: U(o.length),
		figure: [String(e.rooms.length), e.rooms.length === 1 ? "room" : "rooms"]
	}), i.sort((e, t) => t.rank - e.rank);
}
//#endregion
//#region src/dash-bored/family.ts
var Cn = "casa_mia_dash_bored/alerts", wn = "casa_mia_dash_bored/sightings", Tn = "casa_mia_dash_bored/settings", En = "casa_mia", Dn = "casa_mia/cameras/subscribe", On = 18e5, kn = 350, W = b`
  :host { display: block; }
  :host([panel]) > :first-child { min-height: 100vh; }
  /* In the card picker (picked below) a window on the top of the specimen: in its narrow
     column even one room of a family is about 1,000 px tall. */
  :host([sample]) { max-height: 400px; overflow: hidden; }
`, An = (e) => e.getRootNode().host?.localName === "hui-card-picker", jn = /* @__PURE__ */ new Set();
function Mn(e, t) {
	if (jn.has(e)) return;
	jn.add(e);
	let n = new FontFace(e, `url(/casa_mia_dash_bored/fonts/${t})`);
	document.fonts.add(n), n.load().catch((t) => console.error(`Dash-Bored: the typeface ${e} could not be loaded`, t));
}
var Nn = class extends Ge {
	constructor(...e) {
		super(...e), this.narrow = !1, this._fault = "", this._lost = 0, this._config = {}, this._settings = {}, this._cameras = [], this._spotted = [], this._feeds = /* @__PURE__ */ new Map(), this._timers = /* @__PURE__ */ new Set(), this._picked = !1;
	}
	static {
		this.properties = {
			narrow: { type: Boolean },
			_house: { state: !0 },
			_fault: { state: !0 },
			_lost: { state: !0 }
		};
	}
	static getStubConfig() {
		return {};
	}
	setConfig(e) {
		this._config = { ...e }, this._survey = void 0, this._hass && (this.hass = this._hass);
	}
	set config(e) {
		this.setConfig(e);
	}
	get _sample() {
		return this._picked || !!this._config.sample;
	}
	get _reads() {
		return !0;
	}
	getCardSize() {
		return 12;
	}
	getGridOptions() {
		return { columns: "full" };
	}
	set panel(e) {
		this.toggleAttribute("panel", !0);
	}
	set hass(e) {
		let t = this._hass;
		if (this._hass = e, e.connected === !1) {
			this._lost ||= Date.now();
			return;
		}
		if (this._lost = 0, this._listen(), !this._reads) {
			t || this.requestUpdate();
			return;
		}
		if (!this._survey || !t || t.entities !== e.entities || t.areas !== e.areas || t.devices !== e.devices || t.floors !== e.floors) this._survey = Mt(e, {
			...this._settings,
			...this._config,
			cameras: this._cameras,
			sample: this._sample
		});
		else if (t.states === e.states || !this._survey.watched.some((n) => t.states[n] !== e.states[n])) return;
		let n = new Map(this._house?.rooms.flatMap((e) => e.devices).map((e) => [e.id, e]));
		this._house = Jt(this._survey, e), this._surveyed();
		for (let e of this._house.rooms.flatMap((e) => e.devices)) {
			let t = n.get(e.id);
			t && (t.on !== e.on || t.phase !== e.phase || t.level !== e.level || t.away !== e.away) && this._moved(e);
		}
	}
	_surveyed() {}
	_moved(e) {}
	connectedCallback() {
		super.connectedCallback(), An(this) !== this._picked && (this._picked = !this._picked, this.toggleAttribute("sample", this._picked), this._survey = void 0, this._hass && (this.hass = this._hass)), this._hass?.connected !== !1 && this._listen(), this._resized(this.clientWidth || window.innerWidth), this._sizes = new ResizeObserver(([e]) => this._resized(e.contentRect.width)), this._sizes.observe(this);
	}
	_resized(e) {}
	disconnectedCallback() {
		super.disconnectedCallback(), this._sizes?.disconnect();
		for (let e of this._feeds.values()) e.then((e) => e()).catch(() => void 0);
		this._feeds.clear();
		for (let e of this._timers) clearTimeout(e);
		this._timers.clear();
	}
	_follow(e, t, n, r = !1) {
		let i = this._hass?.connection;
		if (!i || !this.isConnected || this._feeds.has(e) || this._sample) return;
		let a = i.subscribeMessage(n, { type: e });
		this._feeds.set(e, a), a.catch((n) => {
			if (r && n?.code === "unknown_command") {
				this._feeds.set(e, Promise.resolve(() => void 0)), console.info(`Dash-Bored: ${t} are not fed by the version installed (${e})`);
				return;
			}
			this._feeds.delete(e), console.error(`Dash-Bored: the feed ${e} failed`, n), this._fault = `${t} are not reaching this page (${n?.message ?? n}).`;
		});
	}
	_listen() {
		this._follow(Tn, "Dash-Bored's settings", (e) => {
			this._settings = e.at(-1) ?? this._settings, this._survey = void 0, this._hass && (this.hass = this._hass);
		}), this._hass?.config?.components?.includes(En) && this._follow(Dn, "Casa Mia's cameras", (e) => {
			this._cameras = e, this._survey = void 0, this._hass && (this.hass = this._hass);
		}, !0);
	}
	_watch() {
		this._follow(wn, "The cameras' sightings", (e) => {
			let t = new Map(this._spotted.map((e) => [e.id, e])), n = Date.now();
			for (let r of e) t.set(r.id, r), this._after(On - (n - r.at * 1e3) + 1e3, () => this.requestUpdate());
			this._spotted = [...t.values()].filter((e) => n - e.at * 1e3 < On), this.requestUpdate();
		});
	}
	_sighted(e = Date.now()) {
		let t = /* @__PURE__ */ new Map();
		for (let n of this._survey ? Yt(this._survey, this._spotted) : []) e - n.at < On && n.at >= (t.get(n.camera)?.at ?? 0) && t.set(n.camera, n);
		return t;
	}
	_after(e, t) {
		if (e <= 0) return;
		let n = setTimeout(() => {
			this._timers.delete(n), t();
		}, e);
		return this._timers.add(n), n;
	}
	_instead(e, t, n) {
		return clearTimeout(e), this._timers.delete(e), this._after(t, n);
	}
	_call(e, t) {
		this._hass.callService(e.domain, e.service, {
			...e.ids.length ? { entity_id: e.ids } : {},
			...e.data
		}).then(() => this._fault = "", (n) => {
			console.error(`Dash-Bored: ${e.domain}.${e.service} refused`, n), this._fault = `${t}: Home Assistant refused (${n?.message ?? n}).`;
		});
	}
	_ask(e, t, n = en) {
		clearTimeout(this._asking), this._timers.delete(this._asking), this._asking = setTimeout(() => {
			this._timers.delete(this._asking), this._call(n(e, t), `${e.room} ${e.name}`);
		}, kn), this._timers.add(this._asking);
	}
};
//#endregion
//#region src/dash-bored/fridge/magnets.ts
function Pn(e, t) {
	let n = 0;
	for (let t of e) n = n * 31 + t.charCodeAt(0) >>> 0;
	return n % t;
}
var G = (e, t = 4) => (Pn(e, 2 * t * 10 + 1) / 10 - t || .4).toFixed(1), K = (e) => N`<path d=${e} fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`, Fn = {
	light: N`${K("M8.5,14.5 a5.6,5.6 0 1 1 7,0 v2.2 h-7 z M9.8,19.3 h4.4 M10.8,21.4 h2.4")}`,
	switch: N`${K("M6,9 h12 v4 a6,6 0 0 1 -12,0 z M9,9 V4.5 M15,9 V4.5 M12,19 v2.5")}`,
	cover: N`${K("M4.5,4.5 h15 M6,4.5 v14 h12 v-14 M6,8.5 h12 M6,12 h12 M6,15.5 h12 M12,18.5 v2.5")}<circle cx="12" cy="21.4" r="1" fill="#fff"/>`,
	lock: N`${K("M6.5,11 h11 v9 h-11 z M8.8,11 V8 a3.2,3.2 0 0 1 6.4,0 v3")}<circle cx="12" cy="15.5" r="1.4" fill="#fff"/>`,
	climate: N`${K("M10,4 a2,2 0 0 1 4,0 v9.6 a4,4 0 1 1 -4,0 z M12,9 v7")}<circle cx="12" cy="17" r="2" fill="#fff"/>`,
	media_player: N`${K("M9.5,18 V6 l8.5,-2 v12")}<ellipse cx="7.3" cy="18" rx="2.6" ry="2" fill="#fff"/><ellipse cx="15.8" cy="16" rx="2.6" ry="2" fill="#fff"/>`,
	camera: N`${K("M4,8 h3.5 l1.5,-2 h6 l1.5,2 H20 v10.5 H4 z")}<circle cx="12" cy="13" r="3.2" fill="none" stroke="#fff" stroke-width="1.9"/>`,
	fan: N`${K("M12,12 c0,-5 4,-7 6,-5 s-1,5 -6,5 c5,0 7,4 5,6 s-5,-1 -5,-6 c0,5 -4,7 -6,5 s1,-5 6,-5 c-5,0 -7,-4 -5,-6 s5,1 5,6")}`,
	valve: N`${K("M12,3.5 c4,5 6,8 6,11 a6,6 0 0 1 -12,0 c0,-3 2,-6 6,-11 z")}`,
	vacuum: N`<circle cx="12" cy="13" r="7.6" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="12" cy="13" r="2" fill="#fff"/>${K("M7,7.6 a7.6,7.6 0 0 1 10,0")}`,
	lawn_mower: N`${K("M4,20 h16 M6,20 v-4 M9,20 v-6.5 M12,20 v-4.5 M15,20 v-7 M18,20 v-4")}`,
	water_heater: N`${K("M7,10 h10 v8 a2,2 0 0 1 -2,2 h-6 a2,2 0 0 1 -2,-2 z M17,12 h2 a1.6,1.6 0 0 1 0,3.2 h-2 M10,3.5 c-1,1.5 1,2 0,3.5 M14,3.5 c-1,1.5 1,2 0,3.5")}`,
	humidifier: N`${K("M7,14 a4,4 0 0 1 1,-7.8 a5,5 0 0 1 9.4,1.2 a3.4,3.4 0 0 1 -.4,6.6 z M9,17.5 v2 M12,18.5 v2.5 M15,17.5 v2")}`,
	siren: N`${K("M6.5,17 v-5.5 a5.5,5.5 0 0 1 11,0 V17 z M4.5,17 h15 M10.5,20 a1.6,1.6 0 0 0 3,0")}`,
	alarm_control_panel: N`${K("M12,3.5 l7,2.5 v5.5 c0,4.5 -3,7.5 -7,9 c-4,-1.5 -7,-4.500 -7,-9 V6 z M9,12 l2.2,2.2 l4,-4.4")}`
}, In = N`${K("M6.5,11 h11 v9 h-11 z M8.8,11 V8 a3.2,3.2 0 0 1 6.2,-1")}<circle cx="12" cy="15.5" r="1.4" fill="#fff"/>`, Ln = (e, t = !1) => e === "lock" && t ? In : Fn[e], Rn = (e, t = !1) => N`<svg class="button" viewBox="0 0 48 48" aria-hidden="true">
  <circle cx="24" cy="26" r="21" fill="#000" opacity=".28"/><circle class="disc" cx="24" cy="24" r="21"/>
  <circle cx="24" cy="24" r="21" fill="url(#dome)"/><circle cx="24" cy="24" r="17.5" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1.2"/>
  <g transform="translate(12 12)">${Ln(e, t)}</g>
  <ellipse cx="16.5" cy="13.5" rx="7" ry="3.6" fill="#fff" opacity=".4" transform="rotate(-32 16.5 13.5)"/></svg>`, q = (e, t) => N`<ellipse cx=${e} cy=${t} rx="4" ry="2.2" fill="#fff" opacity=".55" transform="rotate(-30 ${e} ${t})"/>`, zn = (e, t, n) => N`<circle cx=${e} cy=${n} r="1.9" fill="#1d1d1d"/><circle cx=${t} cy=${n} r="1.9" fill="#1d1d1d"/><circle cx=${e + .6} cy=${n - .6} r=".6" fill="#fff"/><circle cx=${t + .6} cy=${n - .6} r=".6" fill="#fff"/>`, Bn = {
	butterfly: N`<path d="M24,24 C14,6 2,10 5,22 C6,28 14,28 24,24 C14,30 8,40 16,43 C22,44 24,34 24,24 Z" fill="#f08a24" stroke="#5a2d05" stroke-width="1.4"/>
    <path d="M24,24 C34,6 46,10 43,22 C42,28 34,28 24,24 C34,30 40,40 32,43 C26,44 24,34 24,24 Z" fill="#f6a93b" stroke="#5a2d05" stroke-width="1.4"/>
    <circle cx="11" cy="18" r="3" fill="#fff3c9"/><circle cx="37" cy="18" r="3" fill="#fff3c9"/><circle cx="16" cy="36" r="2.2" fill="#3a1c04"/><circle cx="32" cy="36" r="2.2" fill="#3a1c04"/>
    <ellipse cx="24" cy="25" rx="2.4" ry="11" fill="#3a1c04"/><path d="M23,15 C21,9 18,8 17,7 M25,15 C27,9 30,8 31,7" fill="none" stroke="#3a1c04" stroke-width="1.3" stroke-linecap="round"/>${q(12, 14)}`,
	ladybird: N`<ellipse cx="24" cy="27" rx="17" ry="15" fill="#d81f26" stroke="#5a0a0d" stroke-width="1.4"/><path d="M24,12 V42" stroke="#5a0a0d" stroke-width="1.6"/>
    <path d="M12,17 a14,10 0 0 1 24,0 a13,8 0 0 0 -24,0 z" fill="#1d1d1d"/><circle cx="24" cy="12" r="7" fill="#1d1d1d"/>
    <g fill="#1d1d1d"><circle cx="16" cy="24" r="3"/><circle cx="32" cy="24" r="3"/><circle cx="14" cy="34" r="2.6"/><circle cx="34" cy="34" r="2.6"/><circle cx="20" cy="31" r="2"/><circle cx="28" cy="31" r="2"/></g>
    <circle cx="21" cy="10.5" r="1.6" fill="#fff"/><circle cx="27" cy="10.5" r="1.6" fill="#fff"/>${q(15, 19)}`,
	bee: N`<ellipse cx="15" cy="15" rx="9" ry="6" fill="#dff1fb" stroke="#6b8794" stroke-width="1.1" transform="rotate(-25 15 15)"/><ellipse cx="33" cy="15" rx="9" ry="6" fill="#dff1fb" stroke="#6b8794" stroke-width="1.1" transform="rotate(25 33 15)"/>
    <ellipse cx="24" cy="28" rx="13" ry="14" fill="#ffc928" stroke="#5a3c05" stroke-width="1.4"/><path d="M12.5,23 h23 M11,29 h26 M13,35 h22" stroke="#2a1d05" stroke-width="3.4" stroke-linecap="round"/>
    ${zn(20, 28, 20)}<path d="M21,24.500 q3,2 6,0" fill="none" stroke="#2a1d05" stroke-width="1.1" stroke-linecap="round"/>${q(17, 22)}`,
	fish: N`<path d="M6,24 C12,12 28,10 36,24 C28,38 12,36 6,24 Z" fill="#2aa6c9" stroke="#0c4a5e" stroke-width="1.4"/><path d="M35,24 L45,15 V33 Z" fill="#2390b0" stroke="#0c4a5e" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M18,14.500 q4,-5 8,-.5" fill="#2390b0" stroke="#0c4a5e" stroke-width="1.2"/><path d="M22,20 q4,4 0,8 M27,20 q4,4 0,8" fill="none" stroke="#0c4a5e" stroke-opacity=".5" stroke-width="1.1"/>
    <circle cx="13" cy="22" r="2.6" fill="#fff"/><circle cx="13.400" cy="22" r="1.3" fill="#1d1d1d"/>${q(18, 18)}`,
	cat: N`<path d="M9,18 L8,6 L19,12 Z M39,18 L40,6 L29,12 Z" fill="#8a8f98" stroke="#33363b" stroke-width="1.4" stroke-linejoin="round"/><ellipse cx="24" cy="27" rx="17" ry="15" fill="#9aa0a9" stroke="#33363b" stroke-width="1.4"/>
    ${zn(17, 31, 24)}<path d="M22.500,29.500 h3 l-1.500,2 z" fill="#e58a9a"/><path d="M24,31.500 q-3,3 -6,1 M24,31.500 q3,3 6,1 M8,27 h7 M9,31 l6,-1 M40,27 h-7 M39,31 l-6,-1" fill="none" stroke="#33363b" stroke-width="1" stroke-linecap="round"/>${q(16, 17)}`,
	frog: N`<circle cx="15" cy="13" r="7" fill="#57b947" stroke="#1f5a17" stroke-width="1.4"/><circle cx="33" cy="13" r="7" fill="#57b947" stroke="#1f5a17" stroke-width="1.4"/><ellipse cx="24" cy="28" rx="18" ry="14" fill="#63c552" stroke="#1f5a17" stroke-width="1.4"/>
    <circle cx="15" cy="13" r="3.6" fill="#fff"/><circle cx="33" cy="13" r="3.6" fill="#fff"/><circle cx="15.500" cy="13.500" r="1.8" fill="#1d1d1d"/><circle cx="33.500" cy="13.500" r="1.8" fill="#1d1d1d"/>
    <path d="M13,31 q11,8 22,0" fill="none" stroke="#1f5a17" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="29" r="2.4" fill="#f28ba0" opacity=".7"/><circle cx="36" cy="29" r="2.4" fill="#f28ba0" opacity=".7"/>${q(18, 22)}`,
	strawberry: N`<path d="M24,44 C10,36 6,24 9,16 C13,10 35,10 39,16 C42,24 38,36 24,44 Z" fill="#e3263b" stroke="#6b0a16" stroke-width="1.4"/>
    <path d="M24,14 C18,6 12,8 9,12 C14,13 15,16 18,15 C20,18 28,18 30,15 C33,16 34,13 39,12 C36,8 30,6 24,14 Z" fill="#3fa63a" stroke="#1f5a17" stroke-width="1.2" stroke-linejoin="round"/>
    <g fill="#ffe08a"><ellipse cx="17" cy="23" rx="1.1" ry="1.7"/><ellipse cx="24" cy="24" rx="1.1" ry="1.7"/><ellipse cx="31" cy="23" rx="1.1" ry="1.7"/><ellipse cx="20" cy="30" rx="1.1" ry="1.7"/><ellipse cx="28" cy="30" rx="1.1" ry="1.7"/><ellipse cx="24" cy="36" rx="1.1" ry="1.7"/></g>${q(15, 20)}`,
	apple: N`<path d="M24,15 C16,8 5,13 6,25 C7,36 15,44 24,40 C33,44 41,36 42,25 C43,13 32,8 24,15 Z" fill="#7cc242" stroke="#2e5c12" stroke-width="1.4"/><path d="M24,15 C24,10 26,7 29,5" fill="none" stroke="#5a3a12" stroke-width="2" stroke-linecap="round"/>
    <path d="M27,9 C32,4 38,6 39,8 C36,12 30,12 27,9 Z" fill="#3fa63a" stroke="#1f5a17" stroke-width="1.1"/>${q(15, 20)}`,
	star: N`<path d="M24,4 L29.900,17.200 L44,18.900 L33.500,28.600 L36.400,42.700 L24,35.600 L11.600,42.700 L14.500,28.600 L4,18.900 L18.100,17.200 Z" fill="#ffd23f" stroke="#8a6a05" stroke-width="1.4" stroke-linejoin="round"/>${zn(20, 28, 24)}<path d="M20,29 q4,3 8,0" fill="none" stroke="#5a4503" stroke-width="1.2" stroke-linecap="round"/>${q(18, 17)}`,
	heart: N`<path d="M24,42 C6,30 2,18 9,11 C15,6 22,9 24,15 C26,9 33,6 39,11 C46,18 42,30 24,42 Z" fill="#f0486a" stroke="#7a0f28" stroke-width="1.4"/>${q(14, 17)}`,
	flower: N`<g fill="#f6a5c0" stroke="#8a3355" stroke-width="1.2"><circle cx="24" cy="10" r="8"/><circle cx="37" cy="19" r="8"/><circle cx="32" cy="35" r="8"/><circle cx="16" cy="35" r="8"/><circle cx="11" cy="19" r="8"/></g><circle cx="24" cy="24" r="8" fill="#ffd23f" stroke="#8a6a05" stroke-width="1.2"/>${q(21, 8)}`,
	sun: N`<g stroke="#e08a12" stroke-width="3.4" stroke-linecap="round"><path d="M24,3 v6 M24,39 v6 M3,24 h6 M39,24 h6 M9,9 l4.500,4.500 M34.500,34.500 l4.500,4.500 M39,9 l-4.500,4.500 M13.500,34.500 l-4.500,4.500"/></g><circle cx="24" cy="24" r="12.500" fill="#ffd23f" stroke="#8a6a05" stroke-width="1.4"/>${zn(20, 28, 22)}<path d="M19.500,27 q4.500,4 9,0" fill="none" stroke="#5a4503" stroke-width="1.3" stroke-linecap="round"/>${q(19, 17)}`,
	briefcase: N`<path d="M18,14 v-4 a3,3 0 0 1 3,-3 h6 a3,3 0 0 1 3,3 v4" fill="none" stroke="#1d1d1d" stroke-width="2.6"/><rect x="5" y="14" width="38" height="26" rx="4" fill="#3b3f46" stroke="#111" stroke-width="1.4"/><path d="M5,25 h38" stroke="#111" stroke-width="1.4"/><rect x="20.500" y="22" width="7" height="6" rx="1.5" fill="#c9a24b" stroke="#5a4310" stroke-width="1"/>${q(13, 19)}`,
	teddy: N`<circle cx="12" cy="11" r="6.500" fill="#b9793f" stroke="#5a3412" stroke-width="1.4"/><circle cx="36" cy="11" r="6.500" fill="#b9793f" stroke="#5a3412" stroke-width="1.4"/><circle cx="12" cy="11" r="3" fill="#e6b98a"/><circle cx="36" cy="11" r="3" fill="#e6b98a"/>
    <circle cx="24" cy="26" r="17" fill="#c58a4d" stroke="#5a3412" stroke-width="1.4"/><ellipse cx="24" cy="31.500" rx="7.500" ry="6" fill="#edc9a0"/>${zn(17.5, 30.5, 23)}<ellipse cx="24" cy="29" rx="2.600" ry="1.900" fill="#2a1705"/><path d="M24,31 v2.500 q-3,2 -4.500,.2 M24,33.500 q3,2 4.500,.2" fill="none" stroke="#2a1705" stroke-width="1.1" stroke-linecap="round"/>${q(15, 17)}`,
	teacup: N`<path d="M34,22 h4 a5.500,5.500 0 0 1 0,11 h-5" fill="none" stroke="#3a5a8a" stroke-width="3"/><path d="M7,18 h28 v9 a12,12 0 0 1 -12,12 h-4 a12,12 0 0 1 -12,-12 z" fill="#fdfaf2" stroke="#3a5a8a" stroke-width="1.4"/>
    <path d="M9,24 q12,5 24,0" fill="none" stroke="#3a5a8a" stroke-width="1.2"/><g fill="#e36a8a"><circle cx="15" cy="30" r="1.800"/><circle cx="21" cy="33" r="1.800"/><circle cx="27" cy="30" r="1.800"/></g><path d="M5,41 h32" stroke="#3a5a8a" stroke-width="2.400" stroke-linecap="round"/>
    <path d="M15,13 c-2,-3 2,-4 0,-7 M22,13 c-2,-3 2,-4 0,-7 M29,13 c-2,-3 2,-4 0,-7" fill="none" stroke="#9aa5b5" stroke-width="1.400" stroke-linecap="round"/>${q(13, 22)}`
}, Vn = (e) => N`<svg class="novelty" viewBox="0 0 48 48" aria-hidden="true">${Bn[e]}</svg>`, Hn = N`<svg class="defs" width="0" height="0" aria-hidden="true"><defs>
  <radialGradient id="dome" cx=".36" cy=".28" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient>
</defs></svg>`, Un = 3;
function Wn(e, t, n, r = 0, i = () => !1) {
	let a = Array.from({ length: e }, (e, r) => Array.from({ length: n }, (e, n) => t(r, n + 1))), o = (e, t) => {
		let n = a[e].findIndex((e) => e <= t);
		return n < 0 ? Infinity : n + 1;
	}, s = (e, t, s) => {
		let c = [];
		for (let l = e, u = 0; l < t;) {
			let e = o(l, s);
			if (u += e, u > n) return;
			let d = 1;
			for (let n = a[l++][e - 1]; l < t && d < Un && !i(l) && n + r + a[l][e - 1] <= s; l++, d++) n += r + a[l][e - 1];
			c.push({
				wide: e,
				holds: d
			});
		}
		return c;
	}, c = (e, t) => {
		let n = Array.from({ length: t - e }, (t, n) => e + n);
		for (let r of [...new Set(n.flatMap((e) => a[e]))].sort((e, t) => e - t)) {
			let n = s(e, t, r);
			if (n) return {
				height: r,
				stacks: n
			};
		}
	}, l = Array(e + 1).fill(0), u = [];
	for (let t = e - 1; t >= 0; t--) {
		l[t] = Infinity;
		for (let i = t + 1; i <= Math.min(e, t + n * Un); i++) {
			let e = c(t, i);
			e && e.height + r + l[i] <= l[t] && (l[t] = e.height + r + l[i], u[t] = e.stacks);
		}
	}
	let d = [];
	for (let t = 0; t < e;) {
		let e = u[t].map((e) => ({ ...e })), i = e.map((n, r) => t + e.slice(0, r).reduce((e, t) => e + t.holds, 0)), o = (t, n) => Array.from({ length: e[t].holds }, (e, r) => a[i[t] + r][n - 1]).reduce((e, t) => e + t + r, 0);
		for (let t = n - e.reduce((e, t) => e + t.wide, 0); t > 0; t--) {
			let t = e.map((e, t) => o(t, e.wide + 1) < o(t, e.wide) ? o(t, e.wide) : -1), n = Math.max(...t);
			if (n < 0) break;
			e[t.indexOf(n)].wide++;
		}
		e.forEach((e, t) => {
			for (let n = 0; n < e.holds; n++) d.push({
				wide: e.wide,
				first: t === 0 && n === 0,
				under: n > 0
			});
		}), t += e.reduce((e, t) => e + t.holds, 0);
	}
	return d;
}
function Gn(e) {
	let t = [], n = 0, r = 1;
	return e.forEach((e, i) => {
		if (e.under) return void t.at(-1).things.push(i);
		e.first && i && (n++, r = 1), t.push({
			row: n,
			column: r,
			wide: e.wide,
			things: [i]
		}), r += e.wide;
	}), t;
}
//#endregion
//#region src/dash-bored/fridge/rows.ts
var Kn = 228, qn = 14, Jn = 30, Yn = 220, Xn = [80, 108], Zn = 30, Qn = [144, 172], $n = 250, er = [110, 40], tr = (e) => Math.max(1, Math.floor((e + qn) / Kn));
function nr(e, t) {
	let n = Kn * t - qn, r = (e, t) => Math.ceil(e / Math.max(1, Math.floor(n / t))), i = r(e.magnets, Xn[0]), a = Math.min(i, r(e.strips, Xn[0]) * 2);
	return Yn + r(e.prints, Qn[0]) * Qn[1] + i * Xn[1] + a * Zn + e.alarms * $n + r(e.words, er[0]) * er[1];
}
var rr = (e, t, n) => Wn(e.length, (t, n) => nr(e[t], n), t, Jn, n), ir = [
	{
		id: "family",
		label: "Young family",
		picker: "teddy",
		colours: [
			"#e63946",
			"#f4a261",
			"#2a9d8f",
			"#457b9d",
			"#9b5de5",
			"#f15bb5",
			"#e9b949"
		],
		holders: [
			"butterfly",
			"ladybird",
			"bee",
			"frog",
			"strawberry",
			"sun",
			"star",
			"heart",
			"fish",
			"cat",
			"flower",
			"apple"
		],
		pad: "Today",
		words: [
			"we",
			"love",
			"toast",
			"bath",
			"story",
			"jam",
			"wellies"
		],
		extra: {
			title: "Star chart",
			lines: [
				"Teeth  ★ ★ ★",
				"Shoes on  ★ ★",
				"Peas eaten  ★"
			],
			holder: "star"
		}
	},
	{
		id: "yuppies",
		label: "Yuppies",
		picker: "briefcase",
		colours: [
			"#20242a",
			"#3a4250",
			"#59636f",
			"#c7541e"
		],
		holders: [
			"butterfly",
			"apple",
			"fish",
			"star"
		],
		pad: "To do",
		words: [
			"espresso",
			"deadline",
			"brunch",
			"inbox",
			"taxi",
			"gym"
		],
		extra: {
			title: "ESSENTIALS",
			lines: [
				"oat milk",
				"espresso pods",
				"limes",
				"sparkling water"
			],
			holder: "apple"
		}
	},
	{
		id: "grandparents",
		label: "Grandparents",
		picker: "teacup",
		colours: [
			"#8f3d3d",
			"#3f6b5a",
			"#3b5a8a",
			"#b08a35",
			"#7a4a6a"
		],
		holders: [
			"butterfly",
			"flower",
			"cat",
			"strawberry",
			"ladybird",
			"apple",
			"heart"
		],
		pad: "Don't forget",
		words: [
			"tea",
			"biscuits",
			"crossword",
			"wireless",
			"garden",
			"the"
		],
		extra: {
			title: "Greetings from Sandy Bay",
			lines: ["Weather lovely.", "Wish you were here!"],
			holder: "flower"
		}
	}
];
//#endregion
//#region src/dash-bored/fridge/today.ts
function ar(e) {
	let t = e.rooms.flatMap((e) => e.devices), n = Xt(e).filter((e) => e.on).length, r = t.filter((e) => e.kind === "lock" && !e.on && !e.away), i = e.rooms.filter((e) => e.temp !== void 0).sort((e, t) => t.temp - e.temp), a = e.people.filter((e) => e.place === "home").map((e) => e.name);
	return [
		n ? `${n} ${n === 1 ? "light" : "lights"} on` : "All the lights are off",
		...e.kw === void 0 ? [] : [`Using ${e.kw.toFixed(2)} kW`],
		...r.map((e) => `${e.room} ${e.name} is UNLOCKED!`),
		...e.outside ? [`Outside: ${e.outside.temp.toFixed(1)}°, ${e.outside.sky.replace("partlycloudy", "partly cloudy").replace(/[-_]/g, " ")}`] : [],
		...i.length > 1 ? [`Warmest: ${i[0].name} ${i[0].temp.toFixed(1)}°`, `Coldest: ${i.at(-1).name} ${i.at(-1).temp.toFixed(1)}°`] : [],
		...e.people.length ? [a.length ? `In: ${a.join(", ")}` : "Nobody is in"] : []
	];
}
//#endregion
//#region src/dash-bored/fridge/styles.ts
var or = b`
  .door { --ink: #2b2b2b; --paper: #fdfdf8; --grease: rgba(90, 70, 50, .22); --hand: "Chalkboard SE", "Marker Felt", "Comic Sans MS", "Bradley Hand", cursive;
    position: relative; box-sizing: border-box; min-height: 100%; padding: 16px 26px 34px 76px; overflow: hidden; color: var(--ink); font-family: var(--hand); font-size: 15px;
    background: linear-gradient(90deg, rgba(0,0,0,.1), transparent 3%, transparent 96%, rgba(0,0,0,.12)), linear-gradient(175deg, #fcfcf9, #e7e7e1); }
  .door * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; overflow: visible; }
  .defs { position: absolute; }
  button:focus-visible, input:focus-visible { outline: 3px solid #2b6cb0; outline-offset: 3px; }
  .who, .urgent, .notes, .board { position: relative; z-index: 1; }

  /* The handle, down the door's opening edge. */
  .handle { position: absolute; left: 24px; top: 150px; width: 22px; height: 380px; border-radius: 11px; background: linear-gradient(90deg, #fafafa, #b9bcc0 45%, #7d8186); box-shadow: 4px 6px 10px rgba(0,0,0,.3); }

  /* What the door has picked up: fingerprints near the handle and where hands go, and each household's own mess. */
  .wear { position: absolute; inset: 0; pointer-events: none; }
  .wear i { position: absolute; display: none; }
  .wear .fingers { display: block; width: 26px; height: 34px; border-radius: 50%; opacity: .6; background: repeating-radial-gradient(ellipse at 50% 62%, var(--grease) 0 1px, transparent 1px 3px); }
  .fingers.a { left: 52px; top: 250px; transform: rotate(22deg); } .fingers.b { left: 62px; top: 286px; transform: rotate(-14deg); }
  .fingers.c { right: 13%; top: 430px; transform: rotate(40deg); } .fingers.d { left: 41%; top: 96px; transform: rotate(-30deg); }

  /* Whose fridge it is: three magnets in the corner, the one in use the biggest. */
  .who { display: flex; justify-content: flex-end; gap: 12px; min-height: 8px; margin-bottom: 4px; }
  .who button { width: 62px; text-align: center; font-size: 10.5px; line-height: 1.1; opacity: .7; transform: rotate(var(--r)) scale(.8); transition: transform .25s, opacity .25s; }
  .who button[aria-checked="true"] { opacity: 1; transform: rotate(0deg) scale(1); }
  .who .novelty { width: 44px; margin: 0 auto 2px; }
  .novelty { filter: drop-shadow(1px 3px 2px rgba(0,0,0,.4)); }

  /* What must never be missed: a lost connection, a refused action. A torn sheet in red marker. */
  .urgent { max-width: 620px; margin: 4px 0 16px; padding: 10px 16px; border-left: 7px solid #d81f26; background: #fff; color: #b3121d; font-weight: 700; font-size: 16px; overflow-wrap: anywhere;
    transform: rotate(-.8deg); box-shadow: 2px 5px 8px rgba(0,0,0,.3); clip-path: polygon(0 0, 100% 0, 99% 30%, 100% 62%, 98.600% 100%, 0 100%); }

  /* Sensor Watch's alerts: sticky notes. Yellow is a task, orange a warning, pink an error, and red is critical and won't keep still. */
  .notes { display: flex; flex-wrap: wrap; gap: 16px 18px; margin: 6px 0 22px; }
  .postit { --lv: #fff48f; width: 172px; min-height: 118px; padding: 16px 12px 10px; border-bottom-right-radius: 34px 7px; font-size: 14.5px; line-height: 1.25; overflow-wrap: anywhere;
    background: linear-gradient(rgba(0,0,0,.07), transparent 16px), var(--lv); transform: rotate(var(--r)); box-shadow: 2px 7px 8px rgba(0,0,0,.24); }
  .postit b { display: block; margin-bottom: 3px; font-size: 15.500px; } .postit small { display: block; margin-top: 5px; opacity: .65; font-size: 12px; }
  .postit.warning { --lv: #ffc56b; } .postit.error { --lv: #ff9db0; } .postit.critical { --lv: #ff6464; animation: flap 1.2s ease-in-out infinite; }
  @keyframes flap { 50% { transform: rotate(calc(var(--r) + 2.500deg)) translateY(-2px); } }

  /* The door's two parts: the notepad, the word magnets and the rest across the top, and
     under them the rooms. (The notepad was a column down the side until 2026.11.9-b9: on a
     big house it ended a seventh of the way down, and a quarter of the door was bare below it.)
     The rooms stand on a grid of columns (--cols, as many as fit: fridge.ts). A bay is some
     of them across, where fridge/rows.ts says (fridge.ts places each by its row and
     column), and holds one room or a few small ones, one under another. The rows are
     left ragged: nothing on a fridge lines up. */
  .photos { display: grid; grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr)); column-gap: 14px; align-items: start; }
  .bay { display: flex; flex-direction: column; gap: 30px; min-width: 0; margin-bottom: 30px; }
  /* A floor's name, on a strip of masking tape torn off by hand. */
  .floor { margin-bottom: -12px; min-width: 0; }
  /* A floor that begins part of the way along a row has a strip of the same tape down its left, as long as its tape is tall. */
  .floor.beside { padding-left: 10px; border-left: 5px solid rgba(232, 219, 170, .92); }
  .floor span { display: inline-block; padding: 3px 22px 4px; background: rgba(232, 219, 170, .92); font-size: 16px; transform: rotate(var(--r)); box-shadow: 0 1px 2px rgba(0,0,0,.2);
    clip-path: polygon(0 12%, 2% 0, 4% 14%, 96% 6%, 98% 0, 100% 16%, 99% 60%, 100% 100%, 97% 88%, 3% 100%, 0 84%, 1.500% 50%); }
  .room { min-width: 0; }
  .room .poetry { margin-top: 12px; }

  /* A room's polaroid. Its edges have curled and it has been handled, so its outline is
     not square, it is creased once across, and a corner has gone dark. */
  .snap { position: relative; width: 184px; margin: 16px auto 12px; transform: rotate(var(--r)); filter: drop-shadow(2px 5px 5px rgba(0,0,0,.3)); }
  .polaroid { position: relative; padding: 9px 9px 6px; background: var(--paper);
    clip-path: polygon(.600% 1.200%, 30% 0, 62% .800%, 99.400% .400%, 100% 34%, 99.200% 68%, 99.800% 99%, 66% 100%, 31% 99.200%, .500% 99.600%, 0 61%, .800% 30%); }
  .polaroid::after, .photo::after { content: ""; position: absolute; inset: 0; z-index: 2; pointer-events: none;
    background: var(--crease, none), radial-gradient(circle at 100% 100%, rgba(0,0,0,.16), transparent 17%), radial-gradient(circle at 0 0, rgba(0,0,0,.07), transparent 12%); }
  /* No two have been handled alike: one is creased across a corner, one folded once down its length, one bent near an edge, and one is only dog-eared. */
  .worn0 { --crease: linear-gradient(118deg, transparent 46%, rgba(255,255,255,.55) 47%, rgba(0,0,0,.08) 48.500%, transparent 51%); }
  .worn1 { --crease: linear-gradient(72deg, transparent 22%, rgba(255,255,255,.5) 23%, rgba(0,0,0,.07) 24.500%, transparent 27%); }
  .worn2 { --crease: linear-gradient(176deg, transparent 61%, rgba(0,0,0,.07) 62%, rgba(255,255,255,.5) 63.500%, transparent 66%), radial-gradient(circle at 0 100%, rgba(0,0,0,.18), transparent 20%); }
  .worn3 { --crease: radial-gradient(circle at 100% 0, rgba(0,0,0,.2), rgba(255,255,255,.35) 9%, transparent 15%); }
  /* The picture is the room's lights: dark with them off, and warm with any on. */
  .pic { display: block; position: relative; width: 100%; height: 0; padding-top: 72%; overflow: hidden; background: linear-gradient(160deg, #27304d, #121829); transition: background .6s; }
  .pic:disabled { cursor: default; }
  .lit .pic { background: radial-gradient(circle at 60% 30%, #fff4c4, #ffd166 55%, #f2a541); }
  .pic img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: brightness(.42) saturate(.6); transition: filter .6s; }
  .lit .pic img { filter: none; }
  /* A room with no picture of its own has a drawn one: a window at night and a standard lamp. */
  .scene { position: absolute; inset: 0; }
  .window { display: block; position: absolute; left: 12%; top: 14%; width: 30%; height: 50%; border: 3px solid rgba(255,255,255,.6);
    background: linear-gradient(90deg, transparent 46%, rgba(255,255,255,.6) 46% 54%, transparent 54%), linear-gradient(transparent 46%, rgba(255,255,255,.6) 46% 54%, transparent 54%), linear-gradient(#1c2545, #0d1226); }
  .lit .window { border-color: rgba(120, 80, 30, .55); background: linear-gradient(90deg, transparent 46%, rgba(120,80,30,.55) 46% 54%, transparent 54%), linear-gradient(transparent 46%, rgba(120,80,30,.55) 46% 54%, transparent 54%), linear-gradient(#35406a, #1a2140); }
  .lamp { display: block; position: absolute; right: 16%; bottom: 0; width: 30%; height: 66%; }
  .lamp::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 42%; background: #8f8a7c; clip-path: polygon(24% 0, 76% 0, 100% 100%, 0 100%); transition: background .6s; }
  .lamp::after { content: ""; position: absolute; left: 50%; top: 42%; bottom: 0; width: 4px; margin-left: -2px; background: #55493a; }
  .lit .lamp::before { background: #fffbe2; filter: drop-shadow(0 0 12px #fff3b0); }
  .cap { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; margin: 6px 2px 2px; font-size: 17px; line-height: 1.15; overflow-wrap: anywhere; }
  .cap small { flex: none; font-size: 14px; opacity: .7; }
  .snap > .novelty { position: absolute; left: 50%; top: -19px; z-index: 3; width: 42px; margin-left: -21px; transform: rotate(calc(var(--r) * -2)); }

  /* Under it, a button magnet for each device. Grey while its device is off, then its own
     colour. A press makes it wobble; one that needs a second press lifts off the door and waits. */
  .magnets { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 12px 8px; }
  .mag { position: relative; width: 72px; text-align: center; font-size: 12.500px; line-height: 1.15; }
  .press { display: block; width: 50px; margin: 0 auto 3px; transform: rotate(var(--r)); transition: transform .2s, filter .2s; }
  .button { width: 100%; height: auto; } .button .disc { fill: var(--c); }
  .mag:not(.on) .button { filter: grayscale(1) brightness(1.08) contrast(.82); }
  .mag.tapped .press { animation: wobble .5s; }
  @keyframes wobble { 30% { transform: rotate(calc(var(--r) - 14deg)) scale(1.15); } 60% { transform: rotate(calc(var(--r) + 9deg)); } }
  .mag.armed .press { transform: rotate(var(--r)) translateY(-7px) scale(1.14); filter: drop-shadow(0 9px 5px rgba(0,0,0,.35)); }
  .again { position: absolute; left: 50%; top: -24px; z-index: 4; padding: 3px 7px; background: #fff48f; font-size: 11.500px; white-space: nowrap; transform: translateX(-50%) rotate(-4deg); box-shadow: 1px 3px 4px rgba(0,0,0,.3); }
  .name { display: block; overflow-wrap: anywhere; }
  .name small { display: block; font-size: 11px; opacity: .68; } .name .also { font-style: italic; }
  .mag.away .press { opacity: .45; cursor: default; } .mag.away .name { text-decoration: line-through; }
  /* A level is set on a paper strip marked like a ruler, with a small magnet to slide along it. */
  .strip { -webkit-appearance: none; appearance: none; display: block; width: 66px; height: 26px; margin: 1px auto 0; background: transparent; cursor: pointer; }
  .strip::-webkit-slider-runnable-track { height: 8px; border-radius: 1px; background: repeating-linear-gradient(90deg, rgba(0,0,0,.4) 0 1px, transparent 1px 6.600px), var(--paper); box-shadow: 0 1px 2px rgba(0,0,0,.4); }
  .strip::-moz-range-track { height: 8px; border-radius: 1px; background: repeating-linear-gradient(90deg, rgba(0,0,0,.4) 0 1px, transparent 1px 6.600px), var(--paper); box-shadow: 0 1px 2px rgba(0,0,0,.4); }
  .strip::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; margin-top: -4px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.7), transparent 45%), var(--c); box-shadow: 0 2px 2px rgba(0,0,0,.45); }
  .strip::-moz-range-thumb { width: 16px; height: 16px; border: 0; border-radius: 50%; background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.7), transparent 45%), var(--c); box-shadow: 0 2px 2px rgba(0,0,0,.45); }
  .more { flex: 0 0 100%; text-align: center; font-size: 12px; opacity: .7; }

  /* A camera's picture, printed and stuck up with a novelty magnet. It is dog-eared and
     creased as the polaroids are, and somebody has left a thumb print in its corner. */
  .print { position: relative; width: 132px; margin: 16px 6px 4px; text-align: center; transform: rotate(var(--r)); filter: drop-shadow(2px 4px 4px rgba(0,0,0,.3)); }
  .photo { display: block; position: relative; height: 0; padding-top: 76%; background: var(--paper);
    clip-path: polygon(1% .600%, 38% 0, 99% 1.400%, 100% 44%, 98.800% 99%, 60% 100%, 22% 99%, 0 100%, .800% 52%); }
  .photo img, .blank { position: absolute; left: 6px; top: 6px; width: calc(100% - 12px); height: calc(100% - 12px); object-fit: cover; }
  .blank { display: flex; align-items: center; justify-content: center; background: #20242b; color: #aab; font-size: 11px; }
  .photo::before { content: ""; position: absolute; right: 7%; bottom: 9%; z-index: 3; width: 22px; height: 29px; border-radius: 50%; opacity: .55; transform: rotate(24deg);
    background: repeating-radial-gradient(ellipse at 50% 62%, rgba(255,255,255,.55) 0 1px, transparent 1px 2.600px); }
  .print .novelty { position: absolute; left: 50%; top: -17px; z-index: 4; width: 40px; margin-left: -20px; }
  .tab { display: block; margin-top: 4px; font-size: 12.500px; line-height: 1.15; overflow-wrap: anywhere; } .tab small { display: block; font-size: 11px; opacity: .7; }
  .print.away .tab { text-decoration: line-through; }

  /* An alarm: a note of how it stands, number magnets to press its code out with, and a word magnet for each thing it can be told. */
  .alarm { flex: 0 0 100%; display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 6px; }
  .status { padding: 6px 12px; background: #fff48f; font-size: 14px; transform: rotate(var(--r)); box-shadow: 1px 4px 5px rgba(0,0,0,.25); }
  .alarm.sounding .status { background: #ff5a5a; color: #fff; animation: flap .6s ease-in-out infinite; }
  .code { min-width: 128px; padding: 3px 10px; background: var(--paper); font: 700 19px/1.3 ui-monospace, Menlo, monospace; letter-spacing: .28em; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.35); }
  .keys { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px 4px; max-width: 200px; }
  .keys button { width: 31px; height: 38px; color: var(--c, #555); font: 900 31px/38px "Arial Rounded MT Bold", "Chalkboard SE", "Helvetica Neue", sans-serif; text-align: center; transform: rotate(var(--r, 0deg));
    text-shadow: 0 2px 0 rgba(0,0,0,.28), 2px 3px 4px rgba(0,0,0,.25); -webkit-text-stroke: 1px rgba(0,0,0,.14); }
  .keys button:active, .poetry button:active, .words button:active { transform: rotate(var(--r, 0deg)) scale(.9); }

  /* Above the rooms: the notepad on its clip, the word magnets, and whatever else is up. */
  .side { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 28px; margin-bottom: 30px; }
  .side > .poetry { flex: 1 1 300px; max-width: 560px; }
  .pad { position: relative; width: 100%; max-width: 290px; padding: 46px 16px 14px 26px; border-left: 3px double #e88; font-size: 18px; line-height: 30px;
    background: repeating-linear-gradient(#fffbe0 0 29px, #b9d3ea 29px 30px); transform: rotate(1.500deg); box-shadow: 2px 5px 10px rgba(0,0,0,.25); }
  .pad::before { content: ""; position: absolute; left: 50%; top: -12px; width: 86px; height: 34px; margin-left: -43px; border-radius: 6px; background: linear-gradient(#3d3d3d, #111); box-shadow: 0 3px 5px rgba(0,0,0,.4); }
  .pad h2 { margin: 0; font-size: 22px; line-height: 30px; font-weight: 700; } .pad ul { margin: 0; padding: 0; list-style: none; } .pad li { overflow-wrap: anywhere; }
  .pad .ring { display: none; }
  /* Word magnets. The ones that are scenes have a coloured edge and can be pressed. */
  .poetry, .words { display: flex; flex-wrap: wrap; justify-content: center; gap: 9px 7px; }
  .poetry span, .poetry button, .words button { padding: 5px 9px; background: #fff; color: #111; font: 400 19px/1 Georgia, "Times New Roman", serif; transform: rotate(var(--r)); box-shadow: 1px 3px 4px rgba(0,0,0,.3); }
  .poetry button, .words button { border-bottom: 3px solid #f2a541; }
  .poetry .tapped { animation: hop .5s; }
  @keyframes hop { 40% { transform: rotate(var(--r)) translateY(-7px) scale(1.08); } }
  .extra { position: relative; width: 210px; padding: 28px 14px 12px; background: var(--paper); font-size: 14px; line-height: 1.5; transform: rotate(var(--r)); box-shadow: 2px 5px 8px rgba(0,0,0,.25); }
  .extra b { display: block; margin-bottom: 4px; font-size: 16px; } .extra span { display: block; }
  .extra .novelty { position: absolute; left: 50%; top: -17px; width: 40px; margin-left: -20px; }

  /* --- A young family's fridge: white enamel, felt pen, and a child's reach of mess. --- */
  /* Chocolate spread, put on with a hand and dragged: a thick end, and three fingers' worth of streaks trailing off. */
  .family .smear { display: block; left: 36px; top: 596px; width: 150px; height: 46px; border-radius: 42%; opacity: .9; transform: rotate(-14deg);
    background: radial-gradient(ellipse 34% 62% at 20% 52%, #3b200e 0 52%, rgba(59,32,14,.75) 76%, transparent 100%),
      linear-gradient(90deg, transparent 16%, rgba(74,42,18,.72) 30%, rgba(74,42,18,.26) 74%, transparent 96%) 0 26% / 100% 17% no-repeat,
      linear-gradient(90deg, transparent 18%, rgba(74,42,18,.62) 34%, rgba(74,42,18,.18) 84%, transparent 100%) 0 54% / 100% 15% no-repeat,
      linear-gradient(90deg, transparent 20%, rgba(74,42,18,.5) 36%, rgba(74,42,18,.12) 68%, transparent 88%) 0 80% / 100% 13% no-repeat; }
  .family .dab { display: block; left: 196px; top: 566px; width: 20px; height: 27px; border-radius: 50%; opacity: .8; transform: rotate(18deg);
    background: repeating-radial-gradient(ellipse at 50% 62%, #4a2a12 0 1.400px, rgba(74,42,18,.35) 1.400px 3px); }
  .family .scribble { display: block; left: 10px; top: 720px; width: 58px; height: 150px; border-radius: 58% 42% 66% 34% / 52% 60% 40% 48%; opacity: .5; transform: rotate(-6deg);
    background: repeating-linear-gradient(68deg, transparent 0 5px, #e63946 5px 7.500px), repeating-linear-gradient(-58deg, transparent 0 7px, #457b9d 7px 9px); }
  .family .extra { background: #fff; border: 2px dashed #f4a261; }
  /* And on a photograph or two: a thumb that had been in the chocolate spread. */
  .family .room:nth-of-type(3n + 2) .polaroid::before { content: ""; position: absolute; right: 9px; bottom: 5px; z-index: 3; width: 19px; height: 25px; border-radius: 50%; opacity: .75; transform: rotate(-20deg);
    background: repeating-radial-gradient(ellipse at 50% 62%, #4a2a12 0 1.400px, rgba(74,42,18,.3) 1.400px 3px); }
  .family .extra span { color: #2a9d8f; font-size: 16px; }

  /* --- Corporate yuppies': brushed steel that shows every finger, and everything printed and squared up. --- */
  .yuppies { --ink: #16181b; --paper: #fbfbfb; --grease: rgba(255, 255, 255, .55); --hand: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 13px;
    background: repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 4px), linear-gradient(100deg, #c6c9cd, #aeb2b7 30%, #d6d9dc 55%, #a3a7ac 80%, #bfc2c6); }
  .yuppies .handle { left: 30px; top: 60px; bottom: 60px; width: 13px; height: auto; border-radius: 3px; background: linear-gradient(90deg, #4a4e54, #17191c 60%, #33363b); }
  .yuppies .wear .fingers { opacity: .8; }
  .yuppies .streak { display: block; left: 18%; top: 70px; width: 58%; height: 300px; background: linear-gradient(113deg, transparent 30%, rgba(255,255,255,.16) 44%, rgba(255,255,255,.05) 56%, transparent 70%); }
  .yuppies .cap { font-size: 11.500px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; } .yuppies .cap small { font-size: 11px; }
  .yuppies .polaroid { padding: 6px 6px 5px; } .yuppies .pic img { filter: grayscale(1) brightness(.42); } .yuppies .lit .pic img { filter: grayscale(.25); }
  .yuppies .snap > .novelty, .yuppies .print .novelty, .yuppies .extra .novelty { width: 32px; margin-left: -16px; top: -13px; }
  .yuppies .mag { width: 86px; font-size: 9px; }
  .yuppies .name { display: inline-block; max-width: 100%; padding: 1px 5px; background: #fff; font-weight: 500; letter-spacing: .03em; text-transform: uppercase; overflow-wrap: break-word; box-shadow: 0 1px 1.500px rgba(0,0,0,.35); }
  .yuppies .name small { font-size: 9px; text-transform: none; letter-spacing: 0; }
  .yuppies .floor span { padding: 3px 12px; background: #fff; font-size: 11px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; clip-path: none; }
  .yuppies .postit { --lv: #f6c84a; width: 164px; min-height: 100px; padding: 12px 12px 10px; border-top: 8px solid var(--lv); border-bottom-right-radius: 0; background: #fbfbfb; font-size: 12.500px; }
  .yuppies .postit.warning { --lv: #f08a24; } .yuppies .postit.error, .yuppies .postit.critical { --lv: #d81f26; }
  .yuppies .postit b { font-size: 12.500px; letter-spacing: .04em; text-transform: uppercase; }
  .yuppies .pad { padding: 44px 18px 16px; border-left: 0; background: #fbfbfb; font-size: 13.500px; line-height: 26px; transform: rotate(.400deg); }
  .yuppies .pad h2 { font-size: 12px; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; border-bottom: 1px solid #16181b; margin-bottom: 4px; }
  .yuppies .pad li::before { content: ""; display: inline-block; width: 9px; height: 9px; margin-right: 9px; border: 1.500px solid #16181b; }
  .yuppies .poetry span, .yuppies .poetry button, .yuppies .words button { background: #1f2328; color: #f4f4f2; font: 500 13px/1 "Helvetica Neue", Helvetica, Arial, sans-serif; letter-spacing: .08em; text-transform: lowercase; padding: 6px 9px; }
  .yuppies .poetry button, .yuppies .words button { border-bottom-color: #c7541e; }
  .yuppies .status, .yuppies .again { background: #fbfbfb; border-top: 5px solid #f6c84a; }
  .yuppies .extra { font-size: 12.500px; } .yuppies .extra b { font-size: 11px; letter-spacing: .24em; border-bottom: 1px solid #16181b; padding-bottom: 3px; }
  .yuppies .keys button { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; }

  /* --- Grandparents': a cream enamel door with a chrome pull, joined-up handwriting, and paper that has yellowed. --- */
  .grandparents { --ink: #2a2118; --paper: #f6eedb; --grease: rgba(90, 70, 40, .17); --hand: "Dash-Bored Hand", "Snell Roundhand", "Segoe Script", cursive; font-size: 12px;
    background: linear-gradient(90deg, rgba(0,0,0,.09), transparent 4%, transparent 95%, rgba(0,0,0,.11)), radial-gradient(ellipse at 30% 0, rgba(255,255,255,.5), transparent 55%), linear-gradient(175deg, #f5ecd2, #dfd0a9); }
  .grandparents .handle { top: 170px; width: 26px; height: 190px; border-radius: 13px; background: linear-gradient(90deg, #ffffff, #c9ccd0 40%, #8a8e93 80%, #b9bcc0); box-shadow: 4px 6px 10px rgba(0,0,0,.3), 0 -14px 0 -6px #9a9da2, 0 14px 0 -6px #9a9da2; }
  .grandparents .cap { font-size: 13px; line-height: 1.5; } .grandparents .cap small { font-size: 11px; }
  .grandparents .pic img { filter: sepia(.6) brightness(.45); } .grandparents .lit .pic img { filter: sepia(.45) contrast(.92); }
  .grandparents .photo img { filter: sepia(.35) contrast(.94); }
  .grandparents .mag { width: 86px; font-size: 11px; line-height: 1.6; } .grandparents .name small { font-size: 9.500px; opacity: .75; }
  .grandparents .tab { font-size: 11px; line-height: 1.6; } .grandparents .tab small { font-size: 9.500px; }
  .grandparents .floor span { padding: 2px 18px 5px; border: 1px solid rgba(90,70,40,.5); background: #fbf6e6; font-size: 12px; clip-path: none; }
  /* Notes are on lined paper from a pad, with the level as a coloured margin: no sticky notes in this house. */
  .grandparents .postit { --lv: #d9b23a; width: 178px; padding: 12px 10px 8px 14px; border-left: 6px solid var(--lv); border-bottom-right-radius: 0; font-size: 11.500px; line-height: 22px;
    background: repeating-linear-gradient(#fbf6e6 0 21px, #c5d2e2 21px 22px); }
  .grandparents .postit.warning { --lv: #d07a1e; } .grandparents .postit.error, .grandparents .postit.critical { --lv: #b3272d; }
  .grandparents .postit { width: 196px; } .grandparents .postit b { font-size: 12px; } .grandparents .postit small { font-size: 10px; }
  .grandparents .pad { font-size: 13px; line-height: 30px; background: repeating-linear-gradient(#fbf6e6 0 29px, #c5d2e2 29px 30px); border-left-color: #c98; }
  .grandparents .pad h2 { font-size: 14px; }
  /* Somebody put a cup down on the pad. */
  .grandparents .pad .ring { display: block; position: absolute; right: 10px; bottom: 8px; width: 58px; height: 58px; border-radius: 50%; background: radial-gradient(circle, transparent 55%, rgba(120,80,30,.3) 57% 63%, transparent 66%); }
  .grandparents .poetry span, .grandparents .poetry button, .grandparents .words button { background: #fbf6e6; }
  .grandparents .status, .grandparents .again { background: #fbf6e6; border-left: 5px solid #d9b23a; font-size: 10.500px; }
  .grandparents .urgent { font-size: 12px; }
  /* The card is a postcard: a line down its middle and a place for the stamp. */
  .grandparents .extra { padding: 28px 70px 14px 14px; border: 1px solid rgba(90,70,40,.35); font-size: 10.500px; line-height: 1.9;
    background: linear-gradient(90deg, transparent 66%, rgba(90,70,40,.4) 66% 66.600%, transparent 66.600%), linear-gradient(#f6eedb, #efe3c6); }
  .grandparents .extra b { font-size: 11.500px; }
  .grandparents .extra::after { content: ""; position: absolute; right: 10px; top: 26px; width: 34px; height: 40px; border: 1.500px dashed rgba(90,70,40,.6); }

  @media (max-width: 760px) {
    .door { padding-left: 18px; padding-right: 18px; }
    .handle { display: none; }
    .who { justify-content: center; }
    /* Two notes to a row on a phone. */
    .notes { gap: 14px 12px; }
    .door .postit { width: calc(50% - 6px); min-height: 96px; }
  }
  @media (prefers-reduced-motion: reduce) { .postit.critical, .alarm.sounding .status, .mag.tapped .press, .poetry .tapped { animation: none; } }
`, sr = "dash-bored-fridge", cr = "dash-bored-fridge", lr = "alarm_control_panel", ur = "camera", dr = /* @__PURE__ */ new Set([
	"climate",
	"water_heater",
	"humidifier",
	"media_player"
]), fr = {
	lock: ["locked", "unlocked"],
	cover: ["open", "shut"],
	valve: ["open", "shut"],
	siren: ["sounding", "quiet"],
	vacuum: ["cleaning", "home"],
	lawn_mower: ["mowing", "home"],
	media_player: ["playing", "paused"]
}, pr = {
	lock: "unlock",
	cover: "open",
	valve: "open",
	siren: "sound"
}, mr = [
	[
		"alarm_arm_away",
		2,
		"away"
	],
	[
		"alarm_arm_home",
		1,
		"home"
	],
	[
		"alarm_arm_night",
		4,
		"night"
	]
], hr = 6e3, gr = 5e3, _r = 3e4, vr = 18e5, yr = 8, br = class extends Nn {
	constructor(...e) {
		super(...e), this._skin = ir[0].id, this._alerts = [], this._seen = [], this._armed = "", this._tapped = "", this._cols = 1;
	}
	static {
		this.styles = [W, or];
	}
	static {
		this.properties = {
			_cols: { state: !0 },
			_skin: { state: !0 },
			_alerts: { state: !0 },
			_seen: { state: !0 },
			_armed: { state: !0 },
			_want: { state: !0 },
			_code: { state: !0 },
			_tapped: { state: !0 }
		};
	}
	setConfig(e) {
		super.setConfig(e), this._recall();
	}
	connectedCallback() {
		super.connectedCallback(), this._recall(), Mn("Dash-Bored Hand", "HomemadeApple-Regular.ttf");
	}
	_recall() {
		let e = this._config.style;
		try {
			e ??= localStorage.getItem(cr) ?? void 0;
		} catch {}
		ir.some((t) => t.id === e) && (this._skin = e);
	}
	_dress(e) {
		this._skin = e;
		try {
			localStorage.setItem(cr, e);
		} catch {}
	}
	_resized(e) {
		let t = tr(this.renderRoot?.querySelector(".photos")?.clientWidth || e - 102);
		t !== this._cols && (this._cols = t);
	}
	updated() {
		this._resized(this.clientWidth);
	}
	_listen() {
		super._listen(), this._follow(Cn, "Sensor Watch's alerts", (e) => {
			let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
			for (let n of e) t.set(n.entity_id, n);
			this._alerts = [...t.values()];
		}), this._follow(wn, "The cameras' sightings", (e) => {
			let t = new Map(this._seen.map((e) => [e.id, e])), n = Date.now();
			for (let r of e) t.set(r.id, r), this._after(vr - (n - r.at * 1e3) + 1e3, () => this.requestUpdate());
			this._seen = [...t.values()].filter((e) => n - e.at * 1e3 < vr);
		});
	}
	_moved(e) {
		this._want?.id === e.id && (this._want = void 0), this._armed === e.id && (this._armed = "");
	}
	_press(e) {
		if (!e.away) {
			if (this._tapped = e.id, this._after(520, () => this._tapped === e.id && (this._tapped = "")), e.guarded && (e.kind === "lock" ? e.on : !e.on) && this._armed !== e.id) {
				this._armed = e.id, this._dropping = this._instead(this._dropping, hr, () => this._armed === e.id && (this._armed = ""));
				return;
			}
			this._armed = "", this._call(z(e), `${e.room} ${e.name}`);
		}
	}
	_lights(e) {
		let t = e.devices.filter((e) => e.kind === "light" && !e.away), n = t.some((e) => e.on), r = t.filter((e) => e.on === n).map((e) => e.id);
		r.length && this._call({
			domain: "light",
			service: n ? "turn_off" : "turn_on",
			ids: r
		}, `${e.name} lights`);
	}
	_level(e) {
		return this._want?.id === e.id ? this._want.level : dr.has(e.kind) ? e.level ?? e.span.min : e.on ? e.level ?? e.span.max : e.span.min;
	}
	_slide(e, t) {
		let n = Number(t.target.value);
		this._want = {
			id: e.id,
			level: n
		}, this._waiting = this._instead(this._waiting, gr, () => this._want = void 0), this._ask(e, n);
	}
	_figure(e, t) {
		let n = this._code?.id === e.id ? this._code.figures : "";
		this._code = {
			id: e.id,
			figures: t === "" ? n.slice(0, -1) : (n + t).slice(0, yr)
		}, this._hiding = this._instead(this._hiding, _r, () => this._code = void 0);
	}
	_throw(e) {
		this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.name), this._tapped = e.id, this._after(520, () => this._tapped === e.id && (this._tapped = ""));
	}
	_magnet(e, t) {
		let n = Et.has(e.kind), r = this._level(e), i = e.away ? "not answering" : e.dims ? n ? e.on ? `${r}°` : "off" : e.kind === "media_player" ? e.on ? `vol ${r}` : "paused" : e.on || dr.has(e.kind) ? `${Math.round(r)}%` : fr[e.kind]?.[1] ?? "off" : e.phase ?? fr[e.kind]?.[+!e.on] ?? (e.on ? "on" : "off"), a = e.title ?? (n && e.temp !== void 0 ? `now ${e.temp}°` : ""), o = this._armed === e.id;
		return M`<div class="mag ${e.on ? "on" : ""} ${e.away ? "away" : ""} ${o ? "armed" : ""} ${this._tapped === e.id ? "tapped" : ""}" style="--c: ${t.colours[Pn(e.id, t.colours.length)]}; --r: ${G(e.id, 7)}deg">
      <button class="press" aria-pressed=${e.on} aria-label="${e.name}: ${i}${o ? `. Press again to ${pr[e.kind]}` : ""}" @click=${() => this._press(e)}>${Rn(e.kind, e.kind === "lock" && !e.on)}</button>
      <span class="name">${e.name}<small>${i}</small>${a ? M`<small class="also">${a}</small>` : F}</span>
      ${o ? M`<span class="again" role="status">again to ${pr[e.kind]}?</span>` : F}
      ${e.dims && !e.away ? M`<input class="strip" type="range" min=${e.span.min} max=${e.span.max} step=${e.span.step} .value=${String(r)} aria-label="${e.name}: ${n ? "temperature" : e.kind === "media_player" ? "volume" : "level"}" @input=${(t) => this._slide(e, t)} />` : F}
    </div>`;
	}
	_print(e, t, n, r, i, a = !1) {
		return M`<button class="print ${a ? "away" : ""}" style="--r: ${G(i, 5)}deg" aria-label="${e}${n ? `: ${n}` : ""}" @click=${() => s(this, "hass-more-info", { entityId: i })}>
      <span class="photo worn${Pn(i + "worn", 4)}">${t ? M`<img src=${t} alt="" loading="lazy" />` : M`<span class="blank">${a ? "no picture" : "…"}</span>`}</span>
      ${Vn(r)}
      <span class="tab">${e}${n ? M`<small>${n}</small>` : F}</span>
    </button>`;
	}
	_alarm(e, t) {
		let n = this._hass.states[e.id]?.attributes ?? {}, r = e.away ? "not answering" : e.phase === "triggered" ? "SOUNDING" : e.phase ?? (e.on ? "set" : "unset"), i = this._code?.id === e.id ? this._code.figures : "", a = (t, n) => () => {
			this._call({
				domain: lr,
				service: t,
				ids: [e.id],
				data: i ? { code: i } : void 0
			}, `${e.room} ${e.name} (${n})`), this._code = void 0;
		}, o = e.on || e.phase ? [["alarm_disarm", "unset"]] : mr.filter(([, e]) => n.supported_features & e).map(([e, , t]) => [e, t]);
		return M`<div class="alarm ${e.phase === "triggered" ? "sounding" : ""}" style="--r: ${G(e.id, 3)}deg">
      <div class="status">${e.name}: <b>${r}</b></div>
      ${n.code_format === "number" && !e.away ? M`<div class="code" role="status" aria-label="Code: ${i.length} figures">${i || "code?"}</div>
            <div class="keys">${[..."1234567890"].map((n, r) => M`<button style="--c: ${t.colours[r % t.colours.length]}; --r: ${G(e.id + n, 9)}deg" aria-label="Figure ${n}" @click=${() => this._figure(e, n)}>${n}</button>`)}
              <button class="back" aria-label="Take the last figure off" @click=${() => this._figure(e, "")}>←</button></div>` : F}
      ${e.away ? F : M`<div class="words">${o.map(([t, n]) => M`<button style="--r: ${G(e.id + n, 5)}deg" @click=${a(t, n)}>${n}</button>`)}</div>`}
    </div>`;
	}
	render() {
		let e = this._house, t = ir.find((e) => e.id === this._skin) ?? ir[0];
		if (!this._hass || !e) return M`<div class="door ${t.id}"><div class="urgent">Waiting for Home Assistant…</div></div>`;
		let n = (e) => e.kind === ur, r = (e) => e.devices.filter((e) => e.kind !== lr || this._hass.states[e.id]?.attributes.code_format !== "text"), i = Date.now(), a = /* @__PURE__ */ new Map();
		for (let e of this._survey ? Yt(this._survey, this._seen) : []) i - e.at < vr && e.at >= (a.get(e.camera)?.at ?? 0) && a.set(e.camera, e);
		let o = new Set(e.rooms.flatMap((e) => e.devices.filter(n).map((e) => e.id))), s = 0, c = (e, t) => M`<button class=${this._tapped === e.id ? "tapped" : ""} style="--r: ${G(e.id, 5)}deg" aria-label="Scene: ${e.full}" @click=${() => this._throw(e)}>${t}</button>`, l = e.rooms.filter((e) => r(e).length || e.temp !== void 0 || e.scenes.length), u = l.some((e) => e.floor), d = (e) => u && l[e].floor !== l[e - 1]?.floor, f = l.map((e) => {
			let t = r(e), i = t.filter((e) => !n(e) && e.kind !== lr);
			return {
				magnets: i.length,
				strips: i.filter((e) => e.dims).length,
				prints: t.filter(n).length,
				alarms: t.length - i.length - t.filter(n).length,
				words: e.scenes.length
			};
		}), p = JSON.stringify([
			this._cols,
			f,
			l.map((e) => e.floor)
		]);
		this._rows?.key !== p && (this._rows = {
			key: p,
			placed: rr(f, this._cols, d)
		});
		let m = Gn(this._rows.placed), h = (e) => {
			let i = r(e), o = i.filter((e) => e.kind === "light" && !e.away), l = o.some((e) => e.on), u = this._hass.areas?.[e.id]?.picture ?? void 0, d = e.devices.length - i.length;
			return M`<section class="room">
        <div class="snap" style="--r: ${G(e.id, 3)}deg">
          <div class="polaroid ${l ? "lit" : ""} worn${Pn(e.id + "worn", 4)}">
            <button class="pic" ?disabled=${!o.length} aria-label="${e.name}: ${o.length ? `lights ${l ? "on" : "off"}. Press to turn them all ${l ? "off" : "on"}` : "no lights"}" @click=${() => this._lights(e)}>
              ${u ? M`<img src=${u} alt="" loading="lazy" />` : M`<span class="scene"><i class="window"></i><i class="lamp"></i></span>`}
            </button>
            <div class="cap"><span>${e.name}</span>${e.temp === void 0 ? F : M`<small>${e.temp.toFixed(1)}°</small>`}</div>
          </div>
          ${Vn(t.holders[Pn(e.id, t.holders.length)])}
        </div>
        <div class="magnets">
          ${i.filter(n).map((e) => {
				let n = a.get(e.id);
				return this._print(e.name, n?.photo ?? (e.away ? "" : e.picture ?? ""), n ? `${n.kind} ${V(n.at)}` : e.away ? "not answering" : "", t.holders[s++ % t.holders.length], e.id, e.away);
			})}
          ${i.filter((e) => !n(e) && e.kind !== lr).map((e) => this._magnet(e, t))}
          ${i.filter((e) => e.kind === lr).map((e) => this._alarm(e, t))}
          ${d ? M`<span class="more">and ${d} more that the door has no magnet for</span>` : F}
        </div>
        ${e.scenes.length ? M`<div class="poetry">${e.scenes.map((e) => c(e, e.name))}</div>` : F}
      </section>`;
		}, g = m.map((e) => {
			let t = l[e.things[0]].floor;
			return M`${d(e.things[0]) ? M`<div class="floor ${e.column > 1 ? "beside" : ""}" style="grid-row: ${e.row * 2 + 1}; grid-column: ${e.column} / span ${e.wide}"><span style="--r: ${G(t ?? "elsewhere", 2)}deg">${t ?? "Elsewhere"}</span></div>` : F}<div class="bay" style="grid-row: ${e.row * 2 + 2}; grid-column: ${e.column} / span ${e.wide}">${e.things.map((e) => h(l[e]))}</div>`;
		}), _ = this._alerts.filter((e) => e.level !== mn).sort((e, t) => (gn[t.level] ?? 0) - (gn[e.level] ?? 0) || e.began - t.began), v = e.scenes.flatMap((e, n) => [t.words[n % t.words.length], e]);
		return M`<div class="door ${t.id}">
      ${Hn}
      <div class="wear" aria-hidden="true"><i class="fingers a"></i><i class="fingers b"></i><i class="fingers c"></i><i class="fingers d"></i><i class="smear"></i><i class="dab"></i><i class="streak"></i><i class="scribble"></i></div>
      <div class="handle" aria-hidden="true"></div>
      <div class="who" role="radiogroup" aria-label="Whose fridge this is">
        ${this._config.style ? F : ir.map((e) => M`<button role="radio" aria-checked=${e.id === t.id} style="--r: ${G(e.id, 6)}deg" @click=${() => this._dress(e.id)}>${Vn(e.picker)}<span>${e.label}</span></button>`)}
      </div>
      ${this._lost ? M`<div class="urgent" role="alert">No connection to Home Assistant since ${V(this._lost)}. What is on the door is as it was then.</div>` : F}
      ${this._fault ? M`<div class="urgent" role="alert">${this._fault}</div>` : F}
      ${_.length ? M`<div class="notes">${_.map((e) => M`<div class="postit ${e.level}" role="status" style="--r: ${G(e.entity_id, 4)}deg"><b>${e.name}</b>${e.message || e.level}<small>since ${V(e.began * 1e3)}</small></div>`)}</div>` : F}
      <div class="board">
        <aside class="side">
          <div class="pad"><h2>${t.pad}</h2><ul>${ar(e).map((e) => M`<li>${e}</li>`)}</ul><i class="ring" aria-hidden="true"></i></div>
          ${v.length ? M`<div class="poetry">${v.map((e, t) => typeof e == "string" ? M`<span style="--r: ${G(e + t, 5)}deg">${e}</span>` : c(e, e.full))}</div>` : F}
          ${[...a.values()].filter((e) => !o.has(e.camera)).map((e, n) => this._print(e.name, e.photo ?? "", `${e.kind} ${V(e.at)}`, t.holders[(s + n) % t.holders.length], e.camera))}
          <div class="extra" style="--r: ${G(t.extra.title, 4)}deg" aria-hidden="true"><b>${t.extra.title}</b>${t.extra.lines.map((e) => M`<span>${e}</span>`)}${Vn(t.extra.holder)}</div>
        </aside>
        <div class="photos" style="--cols: ${this._cols}">${g}</div>
      </div>
    </div>`;
	}
}, xr = {
	...fr,
	alarm_control_panel: ["set", "unset"],
	camera: ["look", "look"]
}, Sr = /* @__PURE__ */ new Set(["camera", "alarm_control_panel"]), Cr = 6e3, wr = 5e3, Tr = 1500, Er = class extends Nn {
	constructor(...e) {
		super(...e), this._open = "", this._armed = "", this._dragging = "", this._thrown = "";
	}
	static {
		this.properties = {
			_open: { state: !0 },
			_want: { state: !0 },
			_armed: { state: !0 },
			_dragging: { state: !0 },
			_thrown: { state: !0 }
		};
	}
	_moved(e) {
		this._want?.id === e.id && this._dragging !== e.id && (this._want = void 0), this._armed === e.id && (this._armed = "");
	}
	_level(e) {
		return this._want?.id === e.id ? this._want.level : e.level ?? (e.on ? e.span.max : e.span.min);
	}
	_set(e, t) {
		let { min: n, max: r, step: i } = e.span, a = Number(Math.min(r, Math.max(n, Math.round(t / i) * i)).toFixed(2));
		this._want = {
			id: e.id,
			level: a
		}, this._waiting = this._instead(this._waiting, wr, () => this._dragging || (this._want = void 0)), this._ask(e, a);
	}
	_drag(e, t) {
		let n = t.currentTarget;
		if (t.type === "pointerdown") n.setPointerCapture(t.pointerId), this._dragging = e.id;
		else if (this._dragging !== e.id) return;
		let r = n.getBoundingClientRect();
		this._set(e, e.span.min + (r.bottom - t.clientY) / r.height * (e.span.max - e.span.min));
	}
	_drop() {
		this._dragging = "", this._waiting = this._instead(this._waiting, wr, () => this._want = void 0);
	}
	_press(e) {
		if (!e.away) {
			if (Sr.has(e.kind)) return this._open = "", s(this, "hass-more-info", { entityId: e.id });
			if (e.guarded && (e.kind === "lock" ? e.on : !e.on) && this._armed !== e.id) {
				this._armed = e.id, this._dropping = this._instead(this._dropping, Cr, () => this._armed === e.id && (this._armed = ""));
				return;
			}
			this._armed = "", this._call(z(e), `${e.room} ${e.name}`);
		}
	}
	_throw(e) {
		this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.full), this._thrown = e.id, this._after(Tr, () => this._thrown === e.id && (this._thrown = ""));
	}
	_scene(e, t) {
		return M`<button class=${this._thrown === e.id ? "thrown" : ""} @click=${() => this._throw(e)}>${t}</button>`;
	}
	_stands(e) {
		return e.away ? "not answering" : e.dims && e.on && e.kind !== "media_player" ? Et.has(e.kind) ? `${this._level(e)}°` : `${Math.round(this._level(e))}%` : e.phase ?? xr[e.kind]?.[+!e.on] ?? (e.on ? "on" : "off");
	}
	_pic(e) {
		return M`<svg class="pic" viewBox="0 0 24 24" aria-hidden="true">${Ln(e.kind, e.kind === "lock" && !e.on)}</svg>`;
	}
	_control(e) {
		let t = this._level(e), n = this._stands(e);
		if (e.dims && !e.away && Et.has(e.kind)) return M`<div class="key ${e.on ? "on" : ""}">
        <b>${this._pic(e)}</b><span class="deg">${t}°</span>
        <div class="steps"><button aria-label="${e.name}: cooler" @click=${() => this._set(e, t - e.span.step)}>−</button><button aria-label="${e.name}: warmer" @click=${() => this._set(e, t + e.span.step)}>+</button></div>
        <span>${e.name}<em>${e.on ? e.temp === void 0 ? "" : `now ${e.temp}°` : "off"}</em></span>
      </div>`;
		if (e.dims && !e.away) {
			let r = (n) => {
				let r = {
					ArrowUp: e.span.vote,
					ArrowDown: -e.span.vote
				}[n.key];
				r && (n.preventDefault(), this._set(e, t + r));
			}, i = (t) => this._drag(e, t), a = M`<span class="face" aria-hidden="true"><b>${this._pic(e)}${t > e.span.min ? `${Math.round(t)}%` : n}</b><span>${e.name}</span></span>`;
			return M`<div class="fader ${this._dragging === e.id ? "drag" : ""}" role="slider" tabindex="0" aria-label=${e.name} aria-valuemin=${e.span.min} aria-valuemax=${e.span.max} aria-valuenow=${t}
        style="--lvl: ${(t - e.span.min) / (e.span.max - e.span.min)}" @pointerdown=${i} @pointermove=${i} @pointerup=${this._drop} @pointercancel=${this._drop} @keydown=${r}>
        ${a}<i>${a}</i>
      </div>`;
		}
		let r = this._armed === e.id;
		return M`<button class="key ${e.on ? "on" : ""} ${e.away ? "away" : ""} ${r ? "armed" : ""}" aria-pressed=${e.on} ?disabled=${e.away} @click=${() => this._press(e)}>
      <b>${this._pic(e)}</b><span>${e.name}<em role=${r ? "status" : F}>${r ? `again to ${pr[e.kind]}?` : n}</em></span>
    </button>`;
	}
}, Dr = (e) => e.rooms.flatMap((e) => e.devices).filter((e) => e.kind === "camera");
function Or(e, t, n, r) {
	let i = t.get(e.id), a = i?.photo ?? (e.away ? "" : e.picture ?? "");
	return e.away ? {
		d: e,
		src: "",
		says: "not answering",
		at: 0
	} : a ? r.has(a) ? {
		d: e,
		src: "",
		says: "its picture could not be fetched",
		at: i?.at ?? 0
	} : {
		d: e,
		src: a,
		says: i ? `${i.kind} ${V(i.at)}` : n.has(a) ? `as at ${V(n.get(a))}` : "",
		at: i?.at ?? 0
	} : {
		d: e,
		src: a,
		says: i ? `${i.kind} ${V(i.at)}` : "no picture",
		at: i?.at ?? 0
	};
}
var kr = (e, t, n = "") => e.src ? M`<img class=${n} src=${e.src} alt="" loading="lazy" @load=${() => t.came(e.src)} @error=${() => t.failed(e.src)} />` : F, Ar = (e, t) => M`<button class="shot" aria-label="${e.d.name}${e.says ? `: ${e.says}` : ""}. See it live" ?disabled=${e.d.away} @click=${() => t.look(e.d)}>
    ${kr(e, t)}<span><b>${e.d.name}</b>${e.says}</span>
  </button>`;
function jr(e, t) {
	let n = e.zoom;
	return M`${e.presets?.length ? M`<nav class="scenes" aria-label="${e.name}: where it can be turned to">${e.presets.map((n) => M`<button @click=${() => t.turn(e, n)}>${n.name}</button>`)}</nav>` : F}
    ${n ? M`<label class="zoomer">Zoom<input type="range" min=${n.span.min} max=${n.span.max} step=${n.span.step} .value=${String(n.level)}
            @change=${(n) => t.zoom(e, Number(n.target.value))} /></label>` : F}
    ${e.controls?.length ? M`<div class="controls">${e.controls.map((n) => n.device ? t.device(n.device) : M`<button class="key ${n.away ? "away" : ""}" ?disabled=${n.away} @click=${() => t.press(e, n)}><b></b><span>${n.name}<em>${n.away ? "not answering" : "press"}</em></span></button>`)}</div>` : F}`;
}
//#endregion
//#region src/dash-bored/aurora/settings.ts
var Mr = (e, t) => e.flatMap((e) => (e.choices ?? []).map((n) => M`<div class="choice"><span class="label">${e.name} · ${n.what}</span>
        <nav class="scenes" aria-label="${e.name}: ${n.what}">
          ${n.options.map((r) => M`<button class=${r === n.now ? "thrown" : ""} aria-pressed=${r === n.now} @click=${() => t(e, n, r)}>${ut(r)}</button>`)}
        </nav></div>`)), Nr = {
	leaf: {
		how: "fall",
		speed: 85,
		swing: .55,
		rate: 2.3,
		snap: .9,
		slide: 42,
		wind: 55,
		tidy: "robot"
	},
	petal: {
		how: "fall",
		speed: 60,
		swing: .45,
		rate: 2.9,
		snap: .7,
		slide: 30,
		wind: 70,
		tidy: "robot"
	},
	flake: {
		how: "fall",
		speed: 42,
		swing: .2,
		rate: 1.5,
		snap: .4,
		slide: 22,
		wind: 95,
		tidy: "blower"
	},
	heart: {
		how: "rise",
		speed: 48,
		swing: .25,
		rate: 1.8,
		snap: .5,
		slide: 26,
		wind: 35
	},
	gull: {
		how: "cross",
		speed: 46,
		swing: .3,
		rate: .7,
		snap: .3,
		slide: 26,
		wind: 20
	},
	bat: {
		how: "cross",
		speed: 95,
		swing: .5,
		rate: 2.4,
		snap: 3.5,
		slide: 38,
		wind: 25
	}
}, Pr = "ground", Fr = 40, Ir = 24, Lr = 12, Rr = 2.5, zr = 7, Br = .35, Vr = 160, Hr = 260, Ur = 18, Wr = 1 / 7;
function J(e) {
	e.seed = e.seed + 1831565813 | 0;
	let t = Math.imul(e.seed ^ e.seed >>> 15, 1 | e.seed);
	return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function Gr(e, t, n = !1) {
	let { how: r, swing: i, rate: a } = e.move;
	Object.assign(t, {
		state: "air",
		dir: J(e) < .5 ? -1 : 1,
		rate: a * (.7 + J(e) * .6),
		a: (J(e) - .5) * i * 2,
		vx: 0,
		vy: 0,
		rest: J(e) * 14,
		blow: J(e) * 2 - 1,
		pace: .55 + J(e) * .9,
		off: ""
	}), t.w = (J(e) - .5) * t.rate, r === "cross" ? (t.x = n ? J(e) * e.wide : t.dir > 0 ? -40 : e.wide + Fr, t.y = e.tall * (.08 + J(e) * .55)) : (t.x = J(e) * e.wide, t.y = n ? J(e) * e.tall * .9 : r === "rise" ? e.tall + Fr : -40 - J(e) * 60);
}
var Kr = (e) => 300 + J(e) * 180, qr = (e, t) => e.ledges.find((e) => e.id === t), Jr = (e, t) => Math.max(0, Math.min(e.heap.length - 1, Math.floor((t - e.from) / (e.to - e.from) * e.heap.length))), Yr = (e, t) => e.top - 4 - e.heap[Jr(e, t)], Xr = (e, t) => ({
	...e,
	heap: t ?? Array(Math.max(1, Math.ceil((e.to - e.from) / Ir))).fill(0)
});
function Zr(e, t, n) {
	let r = Jr(t, n);
	for (let [e, n] of [
		[r - 1, Rr / 2],
		[r, Rr],
		[r + 1, Rr / 2]
	]) t.heap[e] !== void 0 && (t.heap[e] = Math.min(Lr, t.heap[e] + n));
	e.changed.add(t.id);
}
function Qr(e, t, n, r, i = 1) {
	let a = {
		move: e,
		count: t,
		wide: n,
		tall: r,
		ledges: [],
		changed: /* @__PURE__ */ new Set(),
		motes: Array.from({ length: t + (e.tidy ? 30 : 0) }, () => ({
			state: "spare",
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			a: 0,
			w: 0,
			rate: 1,
			dir: 1,
			rest: 0,
			blow: 1,
			pace: 1,
			on: "",
			off: "",
			age: 0
		})),
		air: [
			1,
			1,
			20
		],
		seed: i,
		since: 0,
		every: 0
	};
	a.every = Kr(a), ei(a, n, r);
	for (let e of a.motes.slice(0, t)) Gr(a, e, !0);
	return a;
}
function $r(e, t) {
	let n = qr(e, t);
	if (!n) return;
	let r = (n, r, i) => Object.assign(n, {
		state: "air",
		x: r,
		y: i,
		vx: (J(e) - .5) * 140,
		vy: J(e) * 150 - 90,
		pace: .55 + J(e) * .9,
		off: t,
		on: ""
	});
	for (let n of e.motes) n.state === "down" && n.on === t && r(n, n.x, n.y);
	n.heap.forEach((t, i) => {
		let a = t > 3 ? e.motes.find((e) => e.state === "spare") : void 0;
		a && r(a, n.from + (i + .5) * (n.to - n.from) / n.heap.length, n.top - t);
	}), n.heap.some((e) => e) && e.changed.add(t), n.heap.fill(0);
}
function ei(e, t, n, r = []) {
	let i = [...r, {
		id: Pr,
		from: -40,
		to: t + Fr,
		top: n - 14
	}].map((e) => Xr(e));
	for (let t of e.ledges) {
		let n = i.find((e) => e.id === t.id);
		n?.heap.length === t.heap.length ? n.heap = t.heap : $r(e, t.id), (n?.top !== t.top || n?.from !== t.from) && e.changed.add(t.id);
	}
	Object.assign(e, {
		wide: t,
		tall: n,
		ledges: i
	});
	for (let t of e.motes) t.state === "down" && (t.y = Yr(qr(e, t.on), t.x) - t.rest / 2);
}
function ti(e) {
	if (!e.heap.some((e) => e)) return "";
	let t = (e.to - e.from) / e.heap.length, n = (n) => [e.from + (n + .5) * t, e.top - (e.heap[n] ?? 0)], r = e.heap.map((t, r) => {
		let [[i, a], [o, s]] = [n(r), n(r + 1)];
		return r === e.heap.length - 1 ? `Q${i.toFixed(1)} ${a.toFixed(1)} ${e.to.toFixed(1)} ${e.top}` : `Q${i.toFixed(1)} ${a.toFixed(1)} ${((i + o) / 2).toFixed(1)} ${((a + s) / 2).toFixed(1)}`;
	});
	return `M${e.from.toFixed(1)} ${e.top}${r.join("")}Z`;
}
function ni(e, t) {
	let [n, r, i] = e.air;
	return e.move.wind * (t.blow * (n / 18) * (1.2 - .5 * t.y / e.tall) + r / 25 * .3 * Math.sin(t.x / 170 + i / 8));
}
var ri = (e, t) => e.move.how === "cross" ? t.vy / 160 * t.dir : t.a, ii = (e) => e.motes.filter((e) => e.state === "air" || e.state === "thrown").length;
function ai(e, t, n) {
	for (let r of e.ledges) {
		if (r.id === t.off || t.x < r.from || t.x > r.to) continue;
		let i = Yr(r, t.x);
		if (n >= i || t.y < i) continue;
		let a = J(e) < Br, o = ii(e) > e.count;
		if (a) {
			let n = e.motes.find((e) => e.state === "spare");
			return !n && !o ? Zr(e, r, t.x) : Object.assign(t, {
				state: "down",
				on: r.id,
				age: 0,
				y: i - t.rest / 2,
				a: (J(e) - .5) * .6
			}), o ? void 0 : Gr(e, n ?? t);
		}
		if (r.id === "ground") {
			o ? t.state = "spare" : Gr(e, t);
			return;
		}
	}
}
function oi(e, t, n, r) {
	let { how: i, swing: a, snap: o, slide: s } = e.move, c = e.move.speed * t.pace;
	t.w += (o * (1 - (t.a / a) ** 2) * t.w - t.rate ** 2 * t.a) * n + r * a * 1.5 * n, t.a = Math.max(-3 * a, Math.min(3 * a, t.a + t.w * n));
	let l = Math.min(1, Math.abs(t.w) / (2 * a * t.rate)), u = ni(e, t), [d, f] = i === "cross" ? [t.dir * c + .3 * u, s * t.w] : [u + s * t.w, (i === "rise" ? -1 : 1) * c * (.4 + .6 * l)], p = Math.min(1, 3 * n), m = t.y;
	if (t.vx += (d - t.vx) * p, t.vy += (f - t.vy) * p, t.x += t.vx * n, t.y += t.vy * n, i === "cross") {
		t.y = Math.max(e.tall * .04, Math.min(e.tall * .7, t.y)), (t.x < -40 || t.x > e.wide + Fr) && Gr(e, t);
		return;
	}
	t.x < -40 && (t.x += e.wide + 80), t.x > e.wide + Fr && (t.x -= e.wide + 80), i === "fall" ? ai(e, t, m) : t.y < -40 && Gr(e, t);
}
function si(e, t) {
	e.vy += 520 * t, e.x += e.vx * t, e.y += e.vy * t, e.a += e.w * t, e.vy >= 0 && Object.assign(e, {
		state: "air",
		w: 0
	});
}
function ci(e, t, n) {
	t.age += n, !(t.age < zr + t.rest / 4) && (Zr(e, qr(e, t.on), t.x), t.state = "spare");
}
var li = (e, t) => ({
	state: "thrown",
	on: "",
	off: "",
	vx: -t.dir * (60 + J(e) * 160),
	vy: -(300 + J(e) * 260),
	w: (J(e) - .5) * 12
});
function ui(e, t, n) {
	let r = e.move.tidy === "blower";
	for (let i of e.motes) i.state !== "down" || i.on !== n.id || Math.abs(i.x - t.x) > Ur || (r || J(e) < Wr ? Object.assign(i, li(e, t)) : i.state = "spare");
	let i = Jr(n, t.x);
	if (!n.heap[i] || t.x < n.from || t.x > n.to) return;
	let a = r && n.heap[i] > 3 ? e.motes.find((e) => e.state === "spare") : void 0;
	a && Object.assign(a, li(e, t), {
		x: t.x,
		y: n.top - n.heap[i]
	}), n.heap[i] = 0, e.changed.add(n.id);
}
function di(e, t) {
	if (e.since += t, !e.tidy && e.since > e.every) {
		let t = e.ledges.filter((t) => t.heap.some((e) => e) || e.motes.some((e) => e.state === "down" && e.on === t.id));
		if (!t.length) return;
		let n = J(e) < .5 ? -1 : 1;
		e.tidy = {
			x: n > 0 ? -80 : e.wide + 80,
			y: t[0].top - 4,
			dir: n,
			route: t.sort((e, t) => e.top - t.top || e.from - t.from).map((e) => e.id),
			driving: !1
		};
	}
	let n = e.tidy;
	if (!n) return;
	for (; n.route.length && !qr(e, n.route[0]);) Object.assign(n, {
		route: n.route.slice(1),
		driving: !1
	});
	let r = qr(e, n.route[0] ?? ""), [i, a] = r ? [Math.max(r.from, -40), Math.min(r.to, e.wide + Fr)] : [0, 0];
	if (r && n.driving) {
		n.x += n.dir * Vr * t, n.y = r.top - 4, ui(e, n, r), (n.dir > 0 ? n.x >= a : n.x <= i) && Object.assign(n, {
			route: n.route.slice(1),
			driving: !1
		});
		return;
	}
	let [o, s] = r ? [Math.abs(n.x - i) < Math.abs(n.x - a) ? i : a, r.top - 4] : [n.x < e.wide / 2 ? -80 : e.wide + 80, n.y], c = Math.hypot(o - n.x, s - n.y), l = Math.min(1, Hr * t / (c || 1));
	Math.abs(o - n.x) > 1 && (n.dir = o > n.x ? 1 : -1), n.x += (o - n.x) * l, n.y += (s - n.y) * l, !(l < 1) && (r ? Object.assign(n, {
		driving: !0,
		dir: o === i ? 1 : -1
	}) : Object.assign(e, {
		tidy: void 0,
		since: 0,
		every: Kr(e)
	}));
}
function fi(e, t) {
	t = Math.min(t, .05);
	let [n, r, i] = e.air, a = t * .3;
	e.air = [
		n + 10 * (r - n) * a,
		r + (n * (28 - i) - r) * a,
		i + (n * r - 8 / 3 * i) * a
	];
	let o = t ? (e.air[0] - n) / 18 / t : 0;
	for (let n of e.motes) n.state === "air" ? oi(e, n, t, o) : n.state === "thrown" ? si(n, t) : n.state === "down" && ci(e, n, t);
	return e.move.tidy && di(e, t), e;
}
//#endregion
//#region src/dash-bored/aurora/drifting.ts
var pi = 22, mi = 56, hi = {
	flake: ["#fff", "#cfe0f1"],
	leaf: ["#c9742a", "#8a4a17"],
	petal: ["#f8cfe0", "#e9a3c1"]
}, gi = class {
	constructor() {
		this._ledges = [], this._ids = /* @__PURE__ */ new WeakMap(), this._named = 0, this._sizes = new ResizeObserver(() => this._measure()), this._watching = !1, this._things = [], this._machine = null, this._heaps = /* @__PURE__ */ new Map(), this._drawn = [], this._frame = 0, this._last = 0, this._tick = (e) => {
			fi(this._field, this._last ? (e - this._last) / 1e3 : 0), this._last = e, this._paint(), this._frame = requestAnimationFrame(this._tick);
		};
	}
	over(e, t) {
		let n = Nr[e?.dataset.glyph ?? ""];
		if (!e || !n) return this.stop();
		let r = e !== this._host || n !== this._field?.move;
		if (r && (this._field = Qr(n, Number(e.dataset.count), e.clientWidth, e.clientHeight, Date.now() | 0), this._things = [...e.querySelectorAll(".m")], this._machine = e.querySelector(".machine"), this._drawn = [], e.querySelector(".heaps")?.replaceChildren(), this._heaps.clear()), r || !this._watching) {
			this._watching = !0, this._sizes.disconnect();
			for (let n of [e, t[0]]) n && this._sizes.observe(n);
		}
		return [this._host, this._ledges] = [e, t], this._measure(), matchMedia("(prefers-reduced-motion: reduce)").matches ? this.stop()._paint() : (this._frame ||= (this._last = 0, requestAnimationFrame(this._tick)), this);
	}
	shake(e) {
		let t = e && this._ids.get(e);
		return t && this._field && $r(this._field, t), this;
	}
	stop() {
		return cancelAnimationFrame(this._frame), this._frame = 0, this._sizes.disconnect(), this._watching = !1, this;
	}
	_measure() {
		if (!this._field || !this._host?.isConnected) return;
		let e = this._host.getBoundingClientRect(), t = this._ledges.flatMap((t) => {
			let n = t.getBoundingClientRect();
			return n.width < 88 || n.top - e.top < mi ? [] : (this._ids.has(t) || this._ids.set(t, `l${++this._named}`), [{
				id: this._ids.get(t),
				from: n.left - e.left + pi,
				to: n.right - e.left - pi,
				top: n.top - e.top
			}]);
		});
		ei(this._field, e.width, e.height, t);
	}
	_set(e, t, n) {
		t && this._drawn[e] !== n && (this._drawn[e] = n, t.style.transform = n, t.style.visibility = n ? "visible" : "hidden");
	}
	_heap() {
		let e = this._field, [t, n] = hi[this._host.dataset.glyph] ?? ["#fff", "#ccc"];
		for (let r of e.changed) {
			let i = e.ledges.find((e) => e.id === r), a = this._heaps.get(r);
			if (!i) {
				a?.remove(), this._heaps.delete(r);
				continue;
			}
			a || (a = document.createElementNS("http://www.w3.org/2000/svg", "path"), a.setAttribute("fill", t), a.setAttribute("stroke", n), this._host.querySelector(".heaps")?.append(a), this._heaps.set(r, a)), a.setAttribute("d", ti(i));
		}
		e.changed.clear();
	}
	_paint() {
		let e = this._field;
		e.motes.forEach((t, n) => this._set(n, this._things[n], t.state === "spare" ? "" : `translate(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px) rotate(${ri(e, t).toFixed(2)}rad)`)), e.changed.size && this._heap();
		let t = e.tidy;
		return this._set(e.motes.length, this._machine, t ? `translate(${t.x.toFixed(1)}px, ${(t.y - 50).toFixed(1)}px) scaleX(${t.dir})` : ""), this._machine?.classList.toggle("flying", !!t && !t.driving), this;
	}
}, _i = {
	snow: {
		drift: {
			glyph: "flake",
			count: 26
		},
		foot: "drift",
		hero: "snowman"
	},
	christmas: {
		drift: {
			glyph: "flake",
			count: 10
		},
		foot: "presents",
		hero: "tree",
		top: "lights"
	},
	fireworks: {
		drift: {
			glyph: "burst",
			count: 9,
			hues: [
				20,
				60,
				140,
				200,
				300,
				340
			]
		},
		foot: "skyline",
		hero: "clock"
	},
	valentine: {
		drift: {
			glyph: "heart",
			count: 14,
			hues: [
				0,
				350,
				15,
				330
			]
		},
		hero: "heart"
	},
	spring: {
		drift: {
			glyph: "petal",
			count: 12,
			colour: "#f3a6c4"
		},
		foot: "meadow",
		hero: "daisies"
	},
	easter: {
		drift: {
			glyph: "petal",
			count: 8,
			colour: "#c9b6f0"
		},
		foot: "eggs",
		hero: "bunny"
	},
	summer: {
		drift: {
			glyph: "gull",
			count: 3,
			colour: "#51606e"
		},
		foot: "sea",
		hero: "sandcastle",
		top: "sun"
	},
	autumn: {
		drift: {
			glyph: "leaf",
			count: 16,
			hues: [
				35,
				55,
				25,
				80
			]
		},
		foot: "leaves",
		hero: "hedgehog"
	},
	halloween: {
		drift: {
			glyph: "bat",
			count: 5,
			colour: "#1b1422"
		},
		foot: "graves",
		hero: "lantern",
		top: "web"
	}
};
function vi(e) {
	let t = e % 19, [n, r] = [Math.floor(e / 100), e % 100], i = (19 * t + n - Math.floor(n / 4) - Math.floor((n - Math.floor((n + 8) / 25) + 1) / 3) + 15) % 30, a = (32 + n % 4 * 2 + 2 * Math.floor(r / 4) - i - r % 4) % 7, o = Math.floor((t + 11 * i + 22 * a) / 451), s = i + a - 7 * o + 114;
	return [Math.floor(s / 31), s % 31 + 1];
}
var yi = [
	[
		"fireworks",
		12,
		31,
		12,
		31
	],
	[
		"fireworks",
		1,
		1,
		1,
		1
	],
	[
		"fireworks",
		11,
		5,
		11,
		5,
		"GB"
	],
	[
		"fireworks",
		7,
		4,
		7,
		4,
		"US"
	],
	[
		"christmas",
		12,
		1,
		12,
		26
	],
	[
		"valentine",
		2,
		14,
		2,
		14
	],
	[
		"halloween",
		10,
		25,
		10,
		31
	]
], bi = [
	"snow",
	"spring",
	"summer",
	"autumn"
];
function xi(e, t = !1, n = "") {
	let [r, i] = [e.getMonth() + 1, e.getDate()], a = r * 100 + i, o = yi.find(([, e, t, r, i, o]) => a >= e * 100 + t && a <= r * 100 + i && (!o || o === n));
	if (o) return o[0];
	let [s, c] = vi(e.getFullYear()), l = Math.round((new Date(e.getFullYear(), r - 1, i).getTime() - new Date(e.getFullYear(), s - 1, c).getTime()) / 864e5);
	return l >= -2 && l <= 1 ? "easter" : bi[(Math.floor(r % 12 / 3) + (t ? 2 : 0)) % 4];
}
var Si = (e, t) => (e * 61.803 + t * 37.7) % 100 / 100;
function Ci({ glyph: e, count: t, hues: n, colour: r }) {
	let i = Nr[e], a = t + (i?.tidy ? 30 : 0), o = Array.from({ length: a }, (t, a) => {
		let o = r ? `color: ${r}` : n ? `color: oklch(.72 .2 ${n[a % n.length]})` : "";
		if (i) return M`<svg class="m" viewBox="0 0 24 24" style="--s: ${((i.how === "cross" ? 22 : 10) + Si(a, 1) * 16).toFixed(0)}px; ${o}">${nt[e]}</svg>`;
		let s = 2.4 + Si(a, 2) * 1.6;
		return M`<svg class="p" viewBox="0 0 24 24" style="--x: ${(Si(a, 3) * 100).toFixed(1)}%; --y: ${(8 + Si(a, 4) * 55).toFixed(1)}%; --s: ${(90 + Si(a, 1) * 110).toFixed(0)}px; --d: ${s.toFixed(1)}s; --w: -${(Si(a, 5) * s * 3).toFixed(1)}s; ${o}">${nt[e]}</svg>`;
	});
	return [
		i?.tidy ? M`<svg class="heaps" width="100%" height="100%"></svg>` : F,
		o,
		i?.tidy ? M`<svg class="machine" viewBox="0 -12 60 56">${it[i.tidy]}</svg>` : F
	];
}
var wi = (e) => M`<svg class="top" width=${e} height="46" viewBox="0 0 ${e} 46">
    <path d="M0 6${Array.from({ length: Math.ceil(e / 120) }, () => "q60 26 120 0").join("")}" fill="none" stroke="#3a3f4a" stroke-width="1.6"/>
    ${Array.from({ length: Math.ceil(e / 40) }, (e, t) => {
	let n = (t * 40 + 20) % 120 / 120;
	return N`<ellipse class="twinkle" cx=${t * 40 + 20} cy=${12 + 52 * n * (1 - n)} rx="4.5" ry="6.5" fill="oklch(.74 .2 ${[
		25,
		140,
		85,
		260,
		330
	][t % 5]})" style="animation-delay: -${t * .7 % 3}s"/>`;
})}
  </svg>`, Ti = M`<svg class="top flip" width="150" height="190" viewBox="0 0 150 190">
    <path d="M0 0L140 20M0 0L110 70M0 0L60 120M0 0L10 140M132 19Q104 34 104 66 76 72 57 113 30 108 9 132M90 13Q72 24 71 45 52 50 39 78 22 74 6 90M46 6Q38 12 36 23 26 26 20 40 10 38 3 46" fill="none" stroke="#fff" stroke-width="1.3" opacity=".8"/>
    <g class="bob"><path d="M84 46V150" stroke="#fff" stroke-width="1" opacity=".8"/><circle cx="84" cy="158" r="9" fill="#1b1422"/><circle cx="84" cy="148" r="5" fill="#1b1422"/>
      <path d="M76 154l-12-6m12 10l-13 0m13 4l-11 7M92 154l12-6m-12 10l13 0m-13 4l11 7" stroke="#1b1422" stroke-width="2" stroke-linecap="round"/></g>
  </svg>`, Ei = M`<svg class="top right" width="150" height="150" viewBox="-75 -75 150 150">
    <g class="turn">${Array.from({ length: 12 }, (e, t) => N`<path d="M0-46V-66" stroke="#f5c542" stroke-width="6" stroke-linecap="round" transform="rotate(${t * 30})"/>`)}</g>
    <circle r="36" fill="#f7d355"/>
  </svg>`;
function Di(e, t) {
	return M`<div class="season" aria-hidden="true" data-glyph=${e.drift?.glyph ?? ""} data-count=${e.drift?.count ?? 0}>
    ${e.foot ? M`<svg class="foot" width="100%" height="74"><defs><pattern id="aurora-foot" width="240" height="74" patternUnits="userSpaceOnUse">${ot[e.foot]}</pattern></defs><rect width="100%" height="74" fill="url(#aurora-foot)"/></svg>` : F}
    ${e.top === "lights" ? wi(t) : e.top === "web" ? Ti : e.top === "sun" ? Ei : F}
    ${e.drift ? Ci(e.drift) : F}
  </div>`;
}
var Oi = (e, t) => e.hero ? M`<svg class="motif" viewBox="0 0 200 160" aria-hidden="true">${at[e.hero](t)}</svg>` : F, ki = "almanac", Ai = [
	{
		id: "aurora",
		name: "Aurora",
		sky: [
			265,
			190,
			330
		],
		moves: [
			-60,
			-120,
			50
		],
		warm: 85,
		strength: 1,
		rooms: [
			70,
			45,
			150,
			200,
			320,
			130
		]
	},
	{
		id: "ember",
		name: "Ember",
		sky: [
			45,
			70,
			25
		],
		moves: [
			10,
			10,
			15
		],
		warm: 85,
		strength: 1,
		rooms: [
			55,
			75,
			35,
			90
		]
	},
	{
		id: "verdant",
		name: "Verdant",
		sky: [
			165,
			145,
			190
		],
		moves: [
			-10,
			-15,
			-15
		],
		warm: 130,
		strength: .9,
		rooms: [
			165,
			140,
			185,
			120
		]
	},
	{
		id: "cobalt",
		name: "Cobalt",
		sky: [
			255,
			235,
			280
		],
		moves: [
			-10,
			-15,
			10
		],
		warm: 215,
		strength: 1,
		rooms: [
			250,
			225,
			280,
			205
		]
	},
	{
		id: "rose",
		name: "Rose",
		sky: [
			5,
			345,
			35
		],
		moves: [
			10,
			15,
			15
		],
		warm: 55,
		strength: 1,
		rooms: [
			10,
			350,
			40,
			60
		]
	},
	{
		id: "acid",
		name: "Acid",
		sky: [
			125,
			110,
			145
		],
		moves: [
			-10,
			-10,
			-20
		],
		warm: 105,
		strength: 1.1,
		rooms: [
			125,
			105,
			140,
			95
		]
	},
	{
		id: "alloy",
		name: "Alloy",
		sky: [
			240,
			225,
			255
		],
		moves: [
			0,
			0,
			0
		],
		warm: 230,
		strength: .18,
		rooms: [
			230,
			240,
			220,
			250
		]
	}
], ji = [
	{
		id: "snow",
		name: "Snow",
		sky: [
			230,
			210,
			250
		],
		moves: [
			-5,
			-5,
			5
		],
		warm: 215,
		strength: .6,
		rooms: [
			220,
			200,
			240
		]
	},
	{
		id: "christmas",
		name: "Christmas",
		sky: [
			150,
			25,
			90
		],
		moves: [
			-5,
			5,
			0
		],
		warm: 85,
		strength: 1,
		rooms: [
			25,
			150,
			85
		]
	},
	{
		id: "fireworks",
		name: "Fireworks",
		sky: [
			290,
			260,
			330
		],
		moves: [
			10,
			-10,
			10
		],
		warm: 60,
		strength: 1.1,
		rooms: [
			300,
			60,
			200,
			20
		],
		dark: !0
	},
	{
		id: "valentine",
		name: "Valentine",
		sky: [
			0,
			350,
			20
		],
		moves: [
			5,
			5,
			10
		],
		warm: 30,
		strength: 1.1,
		rooms: [
			0,
			340,
			20
		]
	},
	{
		id: "spring",
		name: "Spring",
		sky: [
			135,
			100,
			200
		],
		moves: [
			-5,
			0,
			-10
		],
		warm: 100,
		strength: .9,
		rooms: [
			135,
			100,
			200,
			330
		]
	},
	{
		id: "easter",
		name: "Easter",
		sky: [
			320,
			100,
			200
		],
		moves: [
			5,
			0,
			-5
		],
		warm: 95,
		strength: .7,
		rooms: [
			320,
			100,
			200,
			60
		]
	},
	{
		id: "summer",
		name: "Summer",
		sky: [
			230,
			210,
			85
		],
		moves: [
			-10,
			-5,
			0
		],
		warm: 85,
		strength: 1,
		rooms: [
			85,
			60,
			210,
			30
		]
	},
	{
		id: "autumn",
		name: "Autumn",
		sky: [
			50,
			30,
			80
		],
		moves: [
			5,
			5,
			5
		],
		warm: 75,
		strength: 1,
		rooms: [
			45,
			25,
			70,
			100
		]
	},
	{
		id: "halloween",
		name: "Halloween",
		sky: [
			300,
			45,
			280
		],
		moves: [
			-10,
			5,
			10
		],
		warm: 50,
		strength: 1.1,
		rooms: [
			50,
			300,
			130
		],
		dark: !0
	}
], Mi = (e) => [...Ai, ...ji].find((t) => t.id === e), Ni = (e) => `${e.sky.map((t, n) => `--h${n + 1}: ${t}; --m${n + 1}: ${e.moves[n]}`).join("; ")}; --hw: ${e.warm}; --strength: ${e.strength}`, Pi = (e) => `background: conic-gradient(${[...e.sky, e.sky[0]].map((t) => `oklch(.72 ${(.19 * e.strength).toFixed(3)} ${t})`).join(", ")})`;
//#endregion
//#region src/dash-bored/aurora/bento.ts
function Fi(e, t, n, r, i, a, o) {
	if (r < 0 || i < 0 || r + a > t || i + o > n) return !1;
	for (let n = i; n < i + o; n++) for (let i = r; i < r + a; i++) if (e[n * t + i]) return !1;
	return !0;
}
function Ii(e, t, n) {
	for (let r = n.row; r < n.row + n.h; r++) for (let i = n.col; i < n.col + n.w; i++) e[r * t + i] = !0;
}
function Li(e, t, n) {
	let r = Array(t * n).fill(!1), i = [];
	for (let a of e) {
		let e = Math.min(a.w, t), o = Math.min(a.h, n), s;
		for (let [i, c] of [
			[e, o],
			[e, 1],
			[1, 1]
		]) {
			for (let e = 0; e < t * n && !s; e++) Fi(r, t, n, e % t, Math.floor(e / t), i, c) && (s = {
				id: a.id,
				col: e % t,
				row: Math.floor(e / t),
				w: i,
				h: c
			});
			if (s) break;
		}
		if (!s) break;
		Ii(r, t, s), i.push(s);
	}
	return {
		placed: i,
		taken: r
	};
}
function Ri(e, t, n, r) {
	for (let i = !0; i && t.includes(!1);) {
		i = !1;
		for (let a of [...e].sort((e, t) => e.w * e.h - t.w * t.h)) {
			let e = [
				[[
					a.col + a.w,
					a.row,
					1,
					a.h
				], { w: a.w + 1 }],
				[[
					a.col,
					a.row + a.h,
					a.w,
					1
				], { h: a.h + 1 }],
				[[
					a.col - 1,
					a.row,
					1,
					a.h
				], {
					col: a.col - 1,
					w: a.w + 1
				}],
				[[
					a.col,
					a.row - 1,
					a.w,
					1
				], {
					row: a.row - 1,
					h: a.h + 1
				}]
			].find(([e]) => Fi(t, n, r, ...e));
			e && (Object.assign(a, e[1]), Ii(t, n, a), i = !0);
		}
	}
}
function zi(e, t, n) {
	let r = 0;
	for (let i = e; i.length; r++) i = i.slice(Li(i, t, n).placed.length || 1);
	let i = [];
	for (let a = e; a.length;) {
		let e = Math.ceil(a.length / Math.max(1, r - i.length)), { placed: o, taken: s } = Li(a.slice(0, e), t, n);
		Ri(o, s, t, n), s.includes(!1) && ({placed: o, taken: s} = Li(a.slice(0, e).map((e) => ({
			...e,
			h: 1
		})), t, n), Ri(o, s, t, n)), i.push(o), a = a.slice(o.length || 1);
	}
	return i;
}
//#endregion
//#region src/dash-bored/aurora/pages.ts
var Bi = "hero", Vi = "alerts", Hi = "scenes", Ui = "energy", Wi = "climate", Gi = "cameras", Ki = "split:", qi = "room:", Ji = [200, 175], Yi = 106, Xi = 1.3, Zi = .85, Qi = [
	300,
	250,
	1.6
], $i = (e, t) => Math.min(Qi[2], Math.max(1, Math.min(e / Qi[0], t / Qi[1])));
function ea(e, t) {
	let n = (e, t, n) => Math.min(n, Math.max(2, Math.floor(e / t)));
	return [n(e, Ji[0], 8), n(t - Yi, Ji[1], 6)];
}
function ta(e) {
	let t = e.rooms.some((e) => e.floor), n = /* @__PURE__ */ new Map();
	for (let r of e.rooms) {
		let e = t ? r.floor ?? "Elsewhere" : "Rooms";
		n.has(e) || n.set(e, {
			id: e,
			name: e,
			rooms: []
		}), n.get(e).rooms.push(r.id);
	}
	return [...n.values()];
}
var na = (e, t) => e >= 9 || t ? [2, 2] : e >= 4 ? [2, 1] : [1, 1], ra = (e) => e.w * 3 * (e.h * 2 - 1), ia = [
	84,
	170,
	250
], aa = 12, oa = 96;
function sa(e, t, n) {
	let r = Math.floor((e - 32 + aa) / (ia[0] + aa));
	if (!n || r < 1) return 0;
	let i = Math.ceil(n / r), a = Math.floor((t - oa - (i - 1) * aa) / i);
	return a >= ia[1] ? Math.min(ia[2], a) : 0;
}
function ca(e, t, n, r) {
	let i = e.reduce((e, t) => e + t.w * t.h, 0), a;
	for (let o = Math.max(...e.map((e) => e.w)); o <= t; o++) for (let t = Math.max(...e.map((e) => e.h)); t <= n; t++) {
		let n = (o * t - i) / i + Math.abs(Math.log(r * t / o / Xi));
		if (o * t < i || a && n >= a.cost) continue;
		let s = zi(e, o, t);
		s.length === 1 && (a = {
			cost: n,
			cols: o,
			rows: t,
			tiles: s[0]
		});
	}
	return a;
}
function la(e, t, n) {
	let [r, i] = ea(t, n), a = t / Math.max(1, n - Yi), o = ta(e), s = [
		{
			id: Bi,
			w: r >= 6 ? 3 : 2,
			h: 2
		},
		{
			id: Vi,
			w: 2,
			h: 1
		},
		...e.scenes.length ? [{
			id: Hi,
			w: 2,
			h: 1
		}] : [],
		...e.power ? [{
			id: Ui,
			w: 2,
			h: 1
		}] : [],
		...e.rooms.some((e) => e.climate) ? [{
			id: Wi,
			w: 1,
			h: 2
		}] : [],
		...e.rooms.some((e) => e.devices.some((e) => e.kind === "camera")) ? [{
			id: Gi,
			w: 2,
			h: 1
		}] : [],
		...o.map((e) => ({
			id: Ki + e.id,
			w: 1,
			h: 1
		}))
	], c = new Map(e.rooms.map((e) => [e.id, na(e.devices.length, e.devices.some((e) => e.kind === "camera"))])), l = (e) => e.rooms.map((e) => ({
		id: qi + e,
		w: c.get(e)[0],
		h: c.get(e)[1]
	})), u = (e) => {
		let t = [
			e,
			e.map((e) => ({
				...e,
				h: 1
			})),
			e.map((e) => ({
				...e,
				w: 1,
				h: 1
			}))
		].map((e) => zi(e, r, i));
		return t.find((e) => e.length === t[2].length);
	}, d = (e, t, n, o = u) => {
		let s = ca(t, r, i, a);
		return s ? [{
			name: e,
			splits: n,
			part: 0,
			parts: 1,
			cols: s.cols,
			rows: s.rows,
			tiles: s.tiles
		}] : o(t).map((t, a, o) => ({
			name: e,
			splits: n,
			part: a,
			parts: o.length,
			cols: r,
			rows: i,
			tiles: t
		}));
	}, f = [];
	for (let e of o) {
		let t = [...f.at(-1) ?? [], e].flatMap(l).map((e) => ({
			...e,
			h: 1
		}));
		f.length > 0 && t.reduce((e, t) => e + t.w, 0) <= r * i * Zi && zi(t, r, i).length === 1 ? f.at(-1).push(e) : f.push([e]);
	}
	let p = (e) => e.length === o.length && e.length > 1 ? "Rooms" : e.map((e) => e.name).join(" · ");
	return [...d("Home", s, [], (e) => zi(e, r, i)), ...f.flatMap((e) => d(p(e), e.flatMap(l), e.map((e) => e.id)))];
}
//#endregion
//#region src/dash-bored/aurora/words.ts
var ua = (e) => e < 12 ? "Good morning." : e < 18 ? "Good afternoon." : "Good evening.", da = (e) => e.length ? e.reduce((e, t) => e + (t.on ? t.level ?? 100 : 0), 0) / (e.length * 100) : 0;
function fa(e) {
	let t = Xt(e).filter((e) => e.on).length, { N: n, s: r } = U(t), i = e.rooms.filter((e) => e.temp !== void 0).sort((e, t) => t.temp - e.temp), a = [[[`${n} light${r} ${t === 1 ? "is" : "are"} on`, !0]]];
	return e.kw !== void 0 && a.push([[`the house is drawing ${e.kw.toFixed(1)} kW`, !1]]), i.length > 1 && a.push([[`the warmest room is ${i[0].name} at `, !1], [`${i[0].temp.toFixed(1)}°`, !0]]), [...a.flatMap((e, t) => [...t ? [[t === a.length - 1 ? " and " : ", ", !1]] : [], ...e]), [".", !1]];
}
function pa(e, t) {
	let n = [];
	for (let r of e) (!n.length || r[0] - n.at(-1)[0] >= t) && n.push(r);
	return n;
}
var ma = .9;
function ha(e, t, n, r = 300, i = 90) {
	if (e.length < 2 || n <= t) return;
	let a = Math.max(ma, ...e.map(([, e]) => e)), o = e.map(([e, o]) => [Math.round(Math.max(0, e - t) / (n - t) * r * 10) / 10, Math.round((i - 6 - Math.max(0, o) / a * (i - 16)) * 10) / 10]), s = `M${o[0]}`;
	for (let e = 1; e < o.length; e++) s += ` Q${o[e - 1]} ${(o[e - 1][0] + o[e][0]) / 2},${(o[e - 1][1] + o[e][1]) / 2}`;
	return s += ` L${o.at(-1)}`, {
		line: s,
		area: `${s} L${o.at(-1)[0]},${i} L${o[0][0]},${i}Z`
	};
}
//#endregion
//#region src/dash-bored/shell.ts
var ga = "dash-bored-page", _a = "dash-bored-choose", va = "dash-bored-family", ya = 120, ba = 450, xa = "button, a, input, textarea, summary, dialog, [role=button], [role=slider]", Sa = (e, t, n, r) => e <= n && e > n - ya && t >= r && t < r + ya, Ca = [
	{
		id: "gazette",
		name: "The Gazette",
		says: "The house as a newspaper.",
		draw: (e, t) => M`<dash-bored-gazette .hass=${e} .narrow=${t} .panel=${!0}></dash-bored-gazette>`,
		still: M`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#f3eee0"/>
      <rect x="34" y="8" width="92" height="9" fill="#1c1a17"/><path d="M10,22 h140 M10,24.5 h140" stroke="#1c1a17" stroke-width=".8"/>
      <rect x="10" y="31" width="84" height="7" fill="#1c1a17"/><rect x="10" y="41" width="62" height="7" fill="#1c1a17"/>
      <path d="M10,56 h84 M10,62 h84 M10,68 h84 M10,74 h84 M10,80 h84 M10,86 h60 M104,34 h46 M104,40 h46 M104,46 h46 M104,52 h30 M104,66 h46 M104,72 h46 M104,78 h46 M104,84 h36" stroke="#1c1a17" stroke-opacity=".55" stroke-width="2"/>
      <path d="M99,30 v60" stroke="#1c1a17" stroke-width=".6"/></svg>`
	},
	{
		id: "console",
		name: "Console",
		says: "The house as a control panel, in the style of a decade. Bakelite is the 1950s.",
		draw: (e, t) => M`<dash-bored-console .hass=${e} .narrow=${t} .panel=${!0}></dash-bored-console>`,
		still: M`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#66756a"/>
      <rect x="10" y="10" width="64" height="80" rx="8" fill="#2b1811"/><rect x="86" y="10" width="64" height="80" rx="8" fill="#2b1811"/>
      <rect x="18" y="17" width="48" height="30" rx="3" fill="#efe6c8"/><path d="M24,42 a18,18 0 0 1 36,0" fill="none" stroke="#2a1a10"/><path d="M42,44 L52,24" stroke="#151515" stroke-width="1.5"/>
      <circle cx="42" cy="68" r="14" fill="#161616"/><circle cx="42" cy="68" r="14" fill="none" stroke="#3a3a3a" stroke-width="3" stroke-dasharray="2 2"/><path d="M42,54 v7" stroke="#f4f0e4" stroke-width="2.5"/>
      <ellipse cx="118" cy="38" rx="15" ry="20" fill="#ff8a1e" opacity=".55"/><path d="M108,56 V32 Q108,18 118,16 Q128,18 128,32 V56 Z" fill="#cfe0e8" fill-opacity=".3" stroke="#dfe8ee"/><ellipse cx="118" cy="40" rx="4" ry="11" fill="#fff2b0"/>
      <rect x="100" y="70" width="36" height="10" rx="1.5" fill="#111" stroke="#777" stroke-width=".6"/></svg>`
	},
	{
		id: "fridge",
		name: "Fridge",
		says: "The house as a fridge door: polaroids, magnets and sticky notes. A young family's, a pair of yuppies' or grandparents'.",
		draw: (e, t) => M`<dash-bored-fridge .hass=${e} .narrow=${t} .panel=${!0}></dash-bored-fridge>`,
		still: M`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#efefe9"/><rect x="6" y="20" width="5" height="50" rx="2.5" fill="#9a9da2"/>
      <g transform="rotate(-3 45 40)"><rect x="24" y="16" width="42" height="48" fill="#fdfdf8" stroke="#bbb" stroke-width=".5"/><rect x="28" y="20" width="34" height="28" fill="#ffd166"/><circle cx="45" cy="15" r="5" fill="#e63946"/></g>
      <g transform="rotate(4 100 38)"><rect x="80" y="14" width="42" height="48" fill="#fdfdf8" stroke="#bbb" stroke-width=".5"/><rect x="84" y="18" width="34" height="28" fill="#27304d"/><circle cx="101" cy="13" r="5" fill="#2a9d8f"/></g>
      <rect x="128" y="18" width="26" height="26" fill="#fff48f" transform="rotate(5 141 31)"/><rect x="130" y="52" width="24" height="24" fill="#ff9db0" transform="rotate(-6 142 64)"/>
      <g><circle cx="34" cy="80" r="7" fill="#457b9d"/><circle cx="54" cy="82" r="7" fill="#b9b9b2"/><circle cx="92" cy="78" r="7" fill="#f4a261"/><circle cx="112" cy="81" r="7" fill="#9b5de5"/></g></svg>`
	},
	{
		id: "aurora",
		name: "Aurora",
		says: "The house in the current web style: glass tiles over a sky that warms as the lights come on. A room's tile grows into a sheet of faders.",
		draw: (e, t) => M`<dash-bored-aurora .hass=${e} .narrow=${t} .panel=${!0}></dash-bored-aurora>`,
		still: M`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#0b0d16"/>
      <circle cx="28" cy="22" r="46" fill="#5b6cf0" opacity=".45"/><circle cx="136" cy="30" r="42" fill="#22b8c8" opacity=".4"/><circle cx="92" cy="96" r="44" fill="#e0559c" opacity=".4"/><circle cx="140" cy="88" r="26" fill="#f2c14e" opacity=".5"/>
      <g fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".35" stroke-width=".6"><rect x="8" y="8" width="62" height="46" rx="8"/><rect x="8" y="60" width="62" height="12" rx="6"/><rect x="8" y="78" width="36" height="14" rx="6"/><rect x="48" y="78" width="22" height="14" rx="6"/>
        <rect x="76" y="8" width="36" height="40" rx="8"/><rect x="116" y="8" width="36" height="40" rx="8"/><rect x="76" y="52" width="36" height="40" rx="8"/><rect x="116" y="52" width="36" height="40" rx="8"/></g>
      <rect x="14" y="24" width="40" height="6" rx="3" fill="#fff"/><rect x="14" y="36" width="48" height="3" rx="1.5" fill="#fff" opacity=".6"/><rect x="14" y="42" width="34" height="3" rx="1.5" fill="#fff" opacity=".6"/>
      <circle cx="84" cy="40" r="3.5" fill="#fff"/><circle cx="94" cy="40" r="3.5" fill="#fff" opacity=".3"/><circle cx="124" cy="40" r="3.5" fill="#fff" opacity=".3"/><circle cx="84" cy="84" r="3.5" fill="#fff"/><circle cx="124" cy="84" r="3.5" fill="#fff"/></svg>`
	}
], wa = class extends Ge {
	constructor(...e) {
		super(...e), this.narrow = !1, this._family = Ca[0].id, this._choosing = !1, this._last = 0, this._asked = () => this._choosing = !0, this._tap = (e) => {
			let t = this.getBoundingClientRect();
			if (e.composedPath().some((e) => e instanceof Element && e.matches(xa)) || !Sa(e.clientX, e.clientY, t.right, Math.max(0, t.top))) return void (this._last = 0);
			e.timeStamp - this._last < ba && (this._choosing = !0), this._last = this._choosing ? 0 : e.timeStamp;
		};
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			narrow: { type: Boolean },
			_family: { state: !0 },
			_choosing: { state: !0 }
		};
	}
	static {
		this.styles = b`
    :host { display: block; }
    dialog { box-sizing: border-box; width: min(560px, calc(100vw - 24px)); padding: 18px; border: 0; border-radius: 12px; background: #24272b; color: #f1f1f1;
      font: 15px/1.4 system-ui, sans-serif; box-shadow: 0 16px 48px rgba(0,0,0,.5); }
    dialog::backdrop { background: rgba(0,0,0,.55); }
    h2 { margin: 0 0 12px; font-size: 18px; font-weight: 600; }
    .choices { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    button { all: unset; box-sizing: border-box; cursor: pointer; padding: 8px; border-radius: 8px; border: 2px solid transparent; background: #30343a; }
    button:hover, button:focus-visible { border-color: #9aa3ad; }
    button[aria-current="true"] { border-color: #6cb6ff; }
    svg { display: block; width: 100%; border-radius: 4px; margin-bottom: 8px; }
    b { display: block; } span { opacity: .75; font-size: 13px; }
    p { margin: 14px 0 0; opacity: .6; font-size: 13px; overflow-wrap: anywhere; }
  `;
	}
	set panel(e) {}
	connectedCallback() {
		super.connectedCallback();
		try {
			let e = localStorage.getItem(va)?.replace(/^bakelite$/, "console");
			Ca.some((t) => t.id === e) && (this._family = e);
		} catch {}
		this.addEventListener("click", this._tap, !0), this.addEventListener(_a, this._asked);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.removeEventListener("click", this._tap, !0), this.removeEventListener(_a, this._asked);
	}
	_choose(e) {
		this._family = e, this._choosing = !1;
		try {
			localStorage.setItem(va, e);
		} catch {}
	}
	updated() {
		let e = this.renderRoot.querySelector("dialog");
		e && !e.open && e.showModal();
	}
	render() {
		if (!this.hass) return F;
		let e = Ca.find((e) => e.id === this._family);
		return M`${e.draw(this.hass, this.narrow)}
      ${this._choosing ? M`<dialog @close=${() => this._choosing = !1} @click=${(e) => e.target === e.currentTarget && (this._choosing = !1)}>
            <h2>Dash-Bored</h2>
            <div class="choices">
              ${Ca.map((t) => M`<button aria-current=${t.id === e.id} @click=${() => this._choose(t.id)}>${t.still}<b>${t.name}</b><span>${t.says}</span></button>`)}
            </div>
            <p>To choose again, press twice in the top right corner of the page.</p>
          </dialog>` : F}`;
	}
}, Ta = "dash-bored-aurora", Ea = "dash-bored-aurora-skin", Da = 36e5, Oa = 3e4, ka = 6e4, Aa = 200, ja = (e) => _i[e]?.drift ? M`<svg viewBox="0 0 24 24" aria-hidden="true">${nt[_i[e].drift.glyph]}</svg>` : F, Ma = (e, t) => `${e} ${t}${e === 1 ? "" : "s"}`, Na = (e) => `grid-area: ${e.row + 1} / ${e.col + 1} / span ${e.h} / span ${e.w}`, Pa = class extends Er {
	constructor(...e) {
		super(...e), this._alerts = [], this._find = "", this._trace = [], this._now = Date.now(), this._at = 0, this._wide = 0, this._skin = Ai[0].id, this._dressing = !1, this._traced = "", this._kept = "", this._again = () => this.requestUpdate(), this._came = /* @__PURE__ */ new Map(), this._failed = /* @__PURE__ */ new Set(), this._drift = new gi(), this._looks = {
			look: (e) => this._press(e),
			came: (e) => this._noted(this._came, e, Date.now()),
			failed: (e) => this._noted(this._failed, e)
		}, this._works = {
			turn: (e, t) => this._call(nn(t), `${e.room} ${e.name}: ${t.name}`),
			zoom: (e, t) => this._ask(e, t, tn),
			press: (e, t) => this._call(an(t), `${e.room} ${t.name}`),
			device: (e) => this._control(e)
		}, this._tick = () => {
			this._now = Date.now(), this._after(ka - this._now % ka + 50, this._tick);
		}, this._slash = (e) => {
			let t = e.composedPath()[0];
			if (e.key !== "/" || t instanceof HTMLElement && (t.matches("input, textarea, select") || t.isContentEditable)) return;
			let n = this.renderRoot.querySelector(".ask input");
			n && (e.preventDefault(), n.focus());
		}, this._nudge = (e) => {
			let t = e.target.closest(".page > *");
			t && !(e.type === "pointerover" && t.contains(e.relatedTarget)) && this._drift.shake(t);
		};
	}
	static {
		this.styles = [W, Ye];
	}
	static {
		this.properties = {
			_alerts: { state: !0 },
			_find: { state: !0 },
			_trace: { state: !0 },
			_now: { state: !0 },
			_at: { state: !0 },
			_wide: { state: !0 },
			_skin: { state: !0 },
			_dressing: { state: !0 }
		};
	}
	setConfig(e) {
		super.setConfig(e), this._wear();
	}
	_wear() {
		let e = this._config.style;
		try {
			e ??= localStorage.getItem(Ea) ?? void 0;
		} catch {}
		this._skin = e === "almanac" || Mi(e) ? e : Ai[0].id;
	}
	_dress(e) {
		this._skin = e;
		try {
			localStorage.setItem(Ea, e);
		} catch {}
	}
	connectedCallback() {
		super.connectedCallback(), this._wear(), this._tick(), window.addEventListener("keydown", this._slash), window.addEventListener("resize", this._again);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._drift.stop(), window.removeEventListener("keydown", this._slash), window.removeEventListener("resize", this._again);
	}
	_listen() {
		super._listen(), this._follow(Cn, "Sensor Watch's alerts", (e) => {
			let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
			for (let n of e) t.set(n.entity_id, n);
			this._alerts = [...t.values()];
		}), this._watch();
	}
	_noted(e, t, n = 0) {
		e.has(t) || (e instanceof Map ? e.set(t, n) : e.add(t), e.size > Aa && e.delete(e.keys().next().value), this.requestUpdate());
	}
	_surveyed() {
		let e = this._survey?.power;
		if (!e || this._sample) return;
		this._traced !== e && (this._traced = e, this._trace = [], this._recall(e));
		let t = this._house?.kw, n = Date.now(), r = this._trace.at(-1);
		t !== void 0 && (!r || r[1] !== t && n - r[0] >= Oa) && (this._trace = [...this._trace.filter(([e]) => e > n - Da), [n, t]]);
	}
	async _recall(e) {
		let t = Date.now();
		try {
			let n = await this._hass.connection.sendMessagePromise({
				type: "history/history_during_period",
				start_time: (/* @__PURE__ */ new Date(t - Da)).toISOString(),
				entity_ids: [e],
				minimal_response: !0,
				no_attributes: !0
			}), r = this._hass.states[e]?.attributes.unit_of_measurement === "kW" ? 1 : 1e3, i = (n[e] ?? []).filter((e) => e.s !== "" && Number.isFinite(Number(e.s))).map((e) => [Math.max(e.lu * 1e3, t - Da), Number(e.s) / r]);
			this._traced === e && (this._trace = pa([...i, ...this._trace.filter(([e]) => e >= t)], Oa));
		} catch (e) {
			console.error("Dash-Bored: the power's last hour could not be read", e), this._fault = `The last hour of the house's power could not be read (${e?.message ?? e}).`;
		}
	}
	_grow(e, t) {
		let n = [...this.renderRoot.querySelectorAll(".room")].find((e) => e.dataset.room === this._open);
		if (!n || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		let r = n.getBoundingClientRect(), i = e.getBoundingClientRect(), a = {
			transform: `translate(${r.left - i.left}px, ${r.top - i.top}px) scale(${r.width / i.width}, ${r.height / i.height})`,
			opacity: .4
		}, o = {
			transform: "none",
			opacity: 1
		}, s = CSS.supports("transition-timing-function", "linear(0, .009, .035 2.1%, .141 4.4%, .723 12.9%, .938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, .991, .977 51%, .974 53.8%, .975 57.1%, .997 69.8%, 1.003 76.9%, 1.004 83.8%, 1)") ? Je : "ease-out";
		return e.animate(t ? [o, a] : [a, o], t ? {
			duration: 220,
			easing: "ease-in"
		} : {
			duration: 550,
			easing: s
		});
	}
	_shut() {
		let e = this.renderRoot.querySelector("dialog"), t = () => {
			this._open = "", this._armed = "";
		}, n = e && this._grow(e, !0);
		n ? n.finished.then(t, t) : t();
	}
	updated() {
		let e = this.renderRoot.querySelectorAll(".page")[this._at]?.children ?? [];
		this._drift.over(this.renderRoot.querySelector(".season"), [this.renderRoot.querySelector(".bar"), ...e].filter((e) => !!e));
		let t = this.renderRoot.querySelector("dialog");
		t && !t.open && (t.showModal(), this._grow(t, !1));
		let n = this.renderRoot.querySelector(".pages"), r = this._laid ? `${this._laid.screens.length} ${this._wide}x${this._tall}` : "";
		n && r !== this._kept && (this._kept = r, n.scrollLeft = Math.min(this._at, this._laid.screens.length - 1) * n.clientWidth);
	}
	_shine(e) {
		let t = e.pointerType === "mouse" ? e.target.closest(".glass") : null;
		if (!t) return;
		let n = t.getBoundingClientRect();
		t.style.setProperty("--mx", `${(e.clientX - n.left) / n.width * 100}%`), t.style.setProperty("--my", `${(e.clientY - n.top) / n.height * 100}%`);
	}
	_resized(e) {
		this._wide = e;
	}
	get _tall() {
		return this.hasAttribute("panel") ? window.innerHeight : this._sample ? 400 : Math.round(Math.min(760, Math.max(440, this._wide * .62)));
	}
	_lay(e) {
		let [t, n] = [this._wide, this._tall];
		if (this._laid?.found === e && this._laid.wide === t && this._laid.tall === n) return this._laid;
		let r = la(e, t, n), i = r.flatMap((e, t) => e.part === 0 ? [{
			name: e.name,
			splits: e.splits,
			first: t,
			parts: e.parts
		}] : []);
		return this._laid = {
			found: e,
			wide: t,
			tall: n,
			screens: r,
			entries: i,
			sets: new Map(ta(e).map((e) => [e.id, e]))
		};
	}
	_scrolled(e) {
		let t = e.currentTarget, n = Math.round(t.scrollLeft / t.clientWidth);
		n !== this._at && (this._at = n);
	}
	_go(e) {
		let t = this.renderRoot.querySelector(".pages");
		t?.scrollTo({
			left: e * t.clientWidth,
			behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
		});
	}
	_tile(e, t, n, r, i, a) {
		let o = e.devices.filter((e) => e.kind === "light" && !e.away), s = o.filter((e) => e.on).length, c = da(o), l = o.length ? s ? `${s} of ${Ma(o.length, "light")} on` : o.length === 1 ? "Light off" : "All lights off" : e.devices.length ? Ma(e.devices.length, "device") : "", u = [...e.devices].sort((e, t) => Number(t.kind === "light") - Number(e.kind === "light")), d = ra(t), f = u.length > d ? u.length - (d - 1) : 0, p = () => this._open = e.id, m = sa(t.w * i[0] + (t.w - 1) * i[2], t.h * i[1] + (t.h - 1) * i[2], e.devices.length), h = [l, a && a.at ? `${a.d.name}: ${a.says}` : ""].filter(Boolean).join(" · ");
		return M`<article class="room glass w${Math.min(t.w, 2)} h${Math.min(t.h, 2)} ${r ? "dim" : ""} ${a?.src ? "pictured" : ""}" data-room=${e.id} style="${Na(t)}; --hue: ${n}; --lit: ${c ? (.35 + c * .65).toFixed(2) : 0}">
      ${a ? kr(a, this._looks, "back") : F}
      <button class="open" aria-label="${e.name}${h ? `: ${h}` : ""}. Open its controls" @click=${p}></button>
      <div class="head"><div><h2>${e.name}</h2><span class="sub">${h}</span></div>${e.temp === void 0 ? F : M`<div class="temp">${e.temp.toFixed(1)}°</div>`}</div>
      ${m ? M`<div class="controls" style="--tall: ${m}px">${e.devices.map((e) => this._control(e))}</div>` : M`<div class="dots">
        ${(f ? u.slice(0, d - 1) : u).map((e) => M`<button class="dot ${e.kind === "light" ? "lamp" : ""} ${e.on ? "on" : ""} ${e.away ? "away" : ""}" title=${e.name} aria-label="${e.name}: ${this._stands(e)}" aria-pressed=${e.on} ?disabled=${e.away}
          @click=${() => e.guarded ? p() : this._press(e)}>${this._pic(e)}</button>`)}
        ${f ? M`<button class="dot" aria-label="${f} more in ${e.name}" @click=${p}>+${f}</button>` : F}
      </div>`}
    </article>`;
	}
	render() {
		let e = this._house, t = this._hass, n = this._survey, r = this._tall, i = (e) => `aurora ${e ? "dark" : ""} ${this._wide < 520 ? "narrow" : ""}`, a = i(t?.themes?.darkMode);
		if (!t || !e || !n) return M`<div class=${a} style="height: ${r}px"><div class="urgent over">Waiting for Home Assistant…</div></div>`;
		let o = this._lay(n), [c, l, u] = this._wide < 520 ? [
			12,
			10,
			84
		] : [
			18,
			14,
			88
		], d = (e) => {
			let [t, n] = [(this._wide - 2 * c - (e.cols - 1) * l) / e.cols, (r - c - u - (e.rows - 1) * l) / e.rows], i = $i(t, n);
			return {
				by: i,
				cell: [
					t / i,
					n / i,
					l / i
				]
			};
		}, f = Math.min(this._at, o.screens.length - 1), p = Date.now(), m = new Date(this._now), h = Mi(this._skin === "almanac" ? xi(m, (t.config?.latitude ?? 0) < 0, t.config?.country ?? "") : this._skin) ?? Ai[0], g = _i[h.id], _ = new Map(e.rooms.map((e, t) => [e.id, {
			r: e,
			hue: h.rooms[t % h.rooms.length]
		}])), v = this._alerts.filter((e) => e.level !== mn).sort((e, t) => (gn[t.level] ?? 0) - (gn[e.level] ?? 0) || e.began - t.began), y = e.rooms.flatMap((e) => e.devices).find((e) => e.kind === "climate" && e.dims && !e.away), b = ha(this._trace, p - Da, p), x = this._find.trim().toLowerCase(), S = (e) => !!e && (!x || [
			e.name,
			...e.devices.map((e) => e.name),
			...e.scenes.map((e) => e.name)
		].some((e) => e.toLowerCase().includes(x))), C = (e) => e.parts > 1 ? `${e.name} ${e.part + 1}` : e.name, w = (e) => {
			let t = e.currentTarget.getBoundingClientRect();
			return e.target === e.currentTarget && (e.clientX < t.left || e.clientX > t.right || e.clientY < t.top || e.clientY > t.bottom);
		}, T = this._sighted(p), E = new Map(Dr(e).map((e) => [e.id, Or(e, T, this._came, this._failed)])), D = new Map(e.rooms.flatMap((e) => {
			let t = e.devices.flatMap((e) => E.has(e.id) ? [E.get(e.id)] : []), n = t.find((e) => e.src) ?? t[0];
			return n ? [[e.id, n]] : [];
		})), O = {
			[Bi]: (n) => M`<section class="hero glass" style=${Na(n)}>
        <time>${m.toLocaleString(t.locale?.language, {
				weekday: "long",
				day: "numeric",
				month: "long",
				hour: "2-digit",
				minute: "2-digit"
			})}</time>
        <h1>${ua(m.getHours())}</h1>
        <p>${fa(e).map(([e, t]) => t ? M`<b>${e}</b>` : e)}</p>
        ${g ? Oi(g, m) : F}
      </section>`,
			[Vi]: (e) => M`<section class="alerts glass" style=${Na(e)}><span class="label">Sensor Watch</span>
        ${v.length ? v.map((e) => M`<div class="note ${e.level}" role="status"><b>${e.name}</b>${e.message || e.level}<small>since ${V(e.began * 1e3)}</small></div>`) : M`<div class="none">${t.config?.components?.includes("casa_mia_sensor_watch") ? "Nothing needs attention." : "Sensor Watch is not installed, so nothing is watched from here."}</div>`}
      </section>`,
			[Hi]: (t) => M`<nav class="scenes glass" style=${Na(t)} aria-label="Scenes">${e.scenes.map((e) => this._scene(e, e.floor ? e.full : e.name))}</nav>`,
			[Ui]: (t) => M`<section class="energy glass" style=${Na(t)}><span class="label">Drawing now</span>
        ${e.kw === void 0 ? M`<div class="none">The power sensor is not answering.</div>` : M`<div class="big">${e.kw.toFixed(2)}<small>kW</small></div>
              ${b ? M`<svg viewBox="0 0 300 90" preserveAspectRatio="none" role="img" aria-label="The power drawn over the last hour">
                    <defs><linearGradient id="aurora-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
                    <path d=${b.area} fill="url(#aurora-fade)"/><path d=${b.line} fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>` : M`<div class="none">No readings from the last hour yet.</div>`}`}
      </section>`,
			[Wi]: (e) => M`<section class="climate glass" style=${Na(e)}>
        ${y ? M`<div class="ringwrap"><div class="ring" style="--pct: ${(this._level(y) - y.span.min) / (y.span.max - y.span.min)}"></div>
                <div class="read"><b>${this._level(y)}°</b><span>${y.room}${y.on ? y.temp === void 0 ? "" : ` · now ${y.temp.toFixed(1)}°` : " · off"}</span></div></div>
              <div class="steps"><button aria-label="${y.room} ${y.name}: cooler" @click=${() => this._set(y, this._level(y) - y.span.step)}>−</button><button aria-label="${y.room} ${y.name}: warmer" @click=${() => this._set(y, this._level(y) + y.span.step)}>+</button></div>` : M`<div class="none">No thermostat here takes a target just now.</div>`}
      </section>`
		};
		O[Gi] = (e) => M`<section class="cameras glass" style=${Na(e)} aria-label="Cameras">${[...E.values()].sort((e, t) => t.at - e.at).map((e) => Ar(e, this._looks))}</section>`;
		let ee = (e) => {
			let t = o.sets.get(e.id.slice(Ki.length)), n = t.rooms.flatMap((e) => _.has(e) ? [_.get(e).r] : []), r = n.flatMap((e) => e.devices).filter((e) => e.kind === "light" && !e.away), i = r.filter((e) => e.on).length, a = da(r);
			return M`<button class="set glass ${x && !n.some(S) ? "dim" : ""}" style="${Na(e)}; --hue: ${h.warm}; --lit: ${a ? (.35 + a * .65).toFixed(2) : 0}" @click=${() => this._go(o.entries.find((e) => e.splits.includes(t.id)).first)}>
        <span><h2>${t.name}</h2><span class="sub">${Ma(n.length, "room")}${r.length ? ` · ${i ? `${Ma(i, "light")} on` : "lights off"}` : ""}</span></span>
        <span class="in">${n.map((e) => {
				let t = e.devices.filter((e) => e.kind === "light" && e.on && !e.away).length;
				return M`<span class=${t ? "lit" : ""}>${e.name}${t ? M`<b>${t}</b>` : F}</span>`;
			})}</span>
      </button>`;
		}, te = (e, t) => {
			if (e.id.startsWith("split:")) return ee(e);
			if (!e.id.startsWith("room:")) return O[e.id](e);
			let n = _.get(e.id.slice(qi.length));
			return n ? this._tile(n.r, e, n.hue, !S(n.r), t, D.get(n.r.id)) : F;
		}, ne = (e) => {
			let t = e.key === "Enter" && x ? o.screens.findIndex((e) => e.tiles.some((e) => e.id.startsWith("room:") && S(_.get(e.id.slice(5))?.r))) : -1;
			t >= 0 && this._go(t);
		}, k = e.rooms.find((e) => e.id === this._open), A = [this._lost ? `No connection to Home Assistant since ${V(this._lost)}. What is shown is as it was then.` : "", this._fault].filter(Boolean);
		return M`<div class=${i(h.dark || t.themes?.darkMode)} style="height: ${r}px; --warm: ${da(Xt(e)).toFixed(3)}; ${Ni(h)}" @pointermove=${this._shine}>
      <div class="sky" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="pages" @scroll=${this._scrolled} @pointerover=${this._nudge} @pointerdown=${this._nudge}>
        ${o.screens.map((e) => {
			let { by: t, cell: n } = d(e);
			return M`<div class="page" role="group" aria-label=${C(e)} style="--cols: ${e.cols}; --rows: ${e.rows}; --zoom: ${t.toFixed(3)}">${e.tiles.map((e) => te(e, n))}</div>`;
		})}
      </div>
      ${g ? Di(g, this._wide) : F}
      ${A.length ? M`<div class="urgent over" role="alert">${A.map((e) => M`<div>${e}</div>`)}</div>` : F}
      ${f > 0 ? M`<button class="edge left" aria-label="Back to ${C(o.screens[f - 1])}" @click=${() => this._go(f - 1)}>${C(o.screens[f - 1])}</button>` : F}
      ${f < o.screens.length - 1 ? M`<button class="edge right" aria-label="On to ${C(o.screens[f + 1])}" @click=${() => this._go(f + 1)}>${C(o.screens[f + 1])}</button>` : F}
      ${this._dressing ? M`<nav class="bar" aria-label="Colours">
            ${Ai.map((e) => M`<button class="skin" style=${Pi(e)} title=${e.name} aria-label=${e.name} aria-pressed=${e.id === this._skin} @click=${() => this._dress(e.id)}></button>`)}
            <button class="${this._skin === "almanac" ? "here" : ""}" aria-pressed=${this._skin === ki} title="The season's or the holiday's skin, by the date" @click=${() => this._dress(ki)}>Almanac</button>
            ${ji.map((e) => M`<button class="skin" style=${Pi(e)} title=${e.name} aria-label=${e.name} aria-pressed=${e.id === this._skin} @click=${() => this._dress(e.id)}>${ja(e.id)}</button>`)}
            <button class="done" @click=${() => this._dressing = !1}>Done</button>
          </nav>` : M`<nav class="bar" aria-label="Screens">
        ${o.entries.map((e) => {
			let t = f >= e.first && f < e.first + e.parts, n = !!x && e.splits.length > 0 && !e.splits.some((e) => o.sets.get(e).rooms.some((e) => S(_.get(e)?.r)));
			return M`<button class="${t ? "here" : ""} ${n ? "dim" : ""}" aria-current=${t ? "page" : F} @click=${() => this._go(e.first)}>${e.name}${e.parts > 1 ? M`<i>${Array.from({ length: e.parts }, (t, n) => M`<b class=${e.first + n === f ? "on" : ""}></b>`)}</i>` : F}</button>`;
		})}
        ${this._sample || e.rooms.length < 2 ? F : M`<label class="ask"><input placeholder="Find…" aria-label="Find a room, a device or a scene" autocomplete="off" .value=${this._find} @input=${(e) => this._find = e.target.value} @keydown=${ne} /><kbd>/</kbd></label>`}
        ${this._sample || this._config.style ? F : M`<button class="skin" style=${Pi(h)} title="Colours" aria-label="Choose its colours. Now ${this._skin === "almanac" ? `the Almanac's, ${h.name}` : h.name}" @click=${() => this._dressing = !0}>${ja(h.id)}</button>`}
        ${this.hasAttribute("panel") ? M`<button class="other" aria-label="Choose another style of Dash-Bored" title="Another style" @click=${() => s(this, _a)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4,4 h7 v7 h-7 z M13,4 h7 v7 h-7 z M4,13 h7 v7 h-7 z M13,13 h7 v7 h-7 z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>` : F}
      </nav>`}
      ${k ? M`<dialog class="sheet glass" aria-label=${k.name} @cancel=${(e) => (e.preventDefault(), this._shut())} @click=${(e) => w(e) && this._shut()}>
            <header><h2>${k.name}</h2><button class="close" @click=${this._shut}>Done</button></header>
            ${this._fault ? M`<div class="urgent" role="alert">${this._fault}</div>` : F}
            ${k.scenes.length ? M`<nav class="scenes" aria-label="${k.name}'s scenes">${k.scenes.map((e) => this._scene(e, e.name))}</nav>` : F}
            ${k.devices.some((e) => E.has(e.id)) ? M`<div class="shots">${k.devices.flatMap((e) => E.has(e.id) ? [M`<div class="cam">${Ar(E.get(e.id), this._looks)}${jr(e, this._works)}</div>`] : [])}</div>` : F}
            <div class="controls">${k.devices.filter((e) => !E.has(e.id)).map((e) => this._control(e))}</div>
            ${Mr(k.devices, (e, t, n) => this._call(lt(e.id, t, n), `${e.room} ${e.name}: ${t.what}`))}
            ${k.devices.length || k.scenes.length ? F : M`<p class="none">Nothing in this room can be worked from here.</p>`}
          </dialog>` : F}
    </div>`;
	}
}, Fa = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, Ia = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), La = class {
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
}, { I: Ra } = Ve, za = (e) => e, Ba = (e) => e.strings === void 0, Va = () => document.createComment(""), Ha = (e, t, n) => {
	let r = e._$AA.parentNode, i = t === void 0 ? e._$AB : t._$AA;
	if (n === void 0) n = new Ra(r.insertBefore(Va(), i), r.insertBefore(Va(), i), e, e.options);
	else {
		let t = n._$AB.nextSibling, a = n._$AM, o = a !== e;
		if (o) {
			let t;
			n._$AQ?.(e), n._$AM = e, n._$AP !== void 0 && (t = e._$AU) !== a._$AU && n._$AP(t);
		}
		if (t !== i || o) {
			let e = n._$AA;
			for (; e !== t;) {
				let t = za(e).nextSibling;
				za(r).insertBefore(e, i), e = t;
			}
		}
	}
	return n;
}, Ua = (e, t, n = e) => (e._$AI(t, n), e), Wa = {}, Ga = (e, t = Wa) => e._$AH = t, Ka = (e) => e._$AH, qa = (e) => {
	e._$AR(), e._$AA.remove();
}, Ja = (e, t, n) => {
	let r = /* @__PURE__ */ new Map();
	for (let i = t; i <= n; i++) r.set(e[i], i);
	return r;
}, Ya = Ia(class extends La {
	constructor(e) {
		if (super(e), e.type !== Fa.CHILD) throw Error("repeat() can only be used in text expressions");
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
		let i = Ka(e), { values: a, keys: o } = this.dt(t, n, r);
		if (!Array.isArray(i)) return this.ut = o, a;
		let s = this.ut ??= [], c = [], l, u, d = 0, f = i.length - 1, p = 0, m = a.length - 1;
		for (; d <= f && p <= m;) if (i[d] === null) d++;
		else if (i[f] === null) f--;
		else if (s[d] === o[p]) c[p] = Ua(i[d], a[p]), d++, p++;
		else if (s[f] === o[m]) c[m] = Ua(i[f], a[m]), f--, m--;
		else if (s[d] === o[m]) c[m] = Ua(i[d], a[m]), Ha(e, c[m + 1], i[d]), d++, m--;
		else if (s[f] === o[p]) c[p] = Ua(i[f], a[p]), Ha(e, i[d], i[f]), f--, p++;
		else if (l === void 0 && (l = Ja(o, p, m), u = Ja(s, d, f)), l.has(s[d])) {
			if (l.has(s[f])) {
				let t = u.get(o[p]), n = t === void 0 ? null : i[t];
				if (n === null) {
					let t = Ha(e, i[d]);
					Ua(t, a[p]), c[p] = t;
				} else c[p] = Ua(n, a[p]), Ha(e, i[d], n), i[t] = null;
				p++;
			} else qa(i[f]), f--;
		} else qa(i[d]), d++;
		for (; p <= m;) {
			let t = Ha(e, c[m + 1]);
			Ua(t, a[p]), c[p++] = t;
		}
		for (; d <= f;) {
			let e = i[d++];
			e !== null && qa(e);
		}
		return this.ut = o, Ga(e, c), P;
	}
}), Xa = [
	53,
	97,
	61,
	83,
	71,
	59,
	89,
	67,
	79,
	73
], Za = 11, Qa = (e) => {
	let t = (e % Za + Za) % Za;
	return t ? String(t - 1) : "";
}, $a = /* @__PURE__ */ t({
	DEFS: () => eo,
	dolly: () => uo,
	jewel: () => so,
	knife: () => vo,
	knob: () => po,
	label: () => Y,
	meter: () => oo,
	push: () => _o,
	swing: () => ro,
	tv: () => mo,
	valve: () => lo,
	wheels: () => go
}), eo = M`<svg class="defs" width="0" height="0" aria-hidden="true"><defs>
  <radialGradient id="hot"><stop offset="0" stop-color="#fff2b0"/><stop offset=".4" stop-color="#ff8a1e"/><stop offset="1" stop-color="#ff4a00" stop-opacity="0"/></radialGradient>
  <radialGradient id="bake" cx=".32" cy=".25"><stop offset="0" stop-color="#6a3f2c"/><stop offset=".5" stop-color="#34190f"/><stop offset="1" stop-color="#150a06"/></radialGradient>
  <radialGradient id="dome" cx=".35" cy=".28"><stop offset="0" stop-color="#8a5740"/><stop offset=".55" stop-color="#3a1d12"/><stop offset="1" stop-color="#1a0c07"/></radialGradient>
  <radialGradient id="ebon" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#3a3a3a"/><stop offset=".45" stop-color="#151515"/><stop offset="1" stop-color="#050505"/></radialGradient>
  <linearGradient id="tube" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".14" stop-color="#cfe0ea" stop-opacity=".08"/><stop offset=".55" stop-color="#cfe0ea" stop-opacity=".03"/><stop offset=".88" stop-color="#cfe0ea" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".28"/></linearGradient>
  <linearGradient id="getter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4046" stop-opacity=".95"/><stop offset=".35" stop-color="#14171b" stop-opacity=".92"/><stop offset=".75" stop-color="#2a2e33" stop-opacity=".6"/><stop offset="1" stop-color="#555b62" stop-opacity="0"/></linearGradient>
  <radialGradient id="lit" gradientUnits="userSpaceOnUse" cx="60" cy="18" r="88"><stop offset="0" stop-color="#fffbe6"/><stop offset=".22" stop-color="#fbe7ae"/><stop offset=".55" stop-color="#eec176"/><stop offset=".85" stop-color="#c58a3c"/><stop offset="1" stop-color="#8f5c1f"/></radialGradient>
  <radialGradient id="unlit" gradientUnits="userSpaceOnUse" cx="60" cy="40" r="80"><stop offset="0" stop-color="#d6d0ba"/><stop offset="1" stop-color="#8d8975"/></radialGradient>
  <radialGradient id="spot"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="rim"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
  <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d98d"/><stop offset=".45" stop-color="#b98f3a"/><stop offset=".7" stop-color="#7a5c1e"/><stop offset="1" stop-color="#d8b765"/></linearGradient>
  <linearGradient id="sepia" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe0b9"/><stop offset=".6" stop-color="#e3cf9f"/><stop offset="1" stop-color="#d2b983"/></linearGradient>
  <path id="arch" d="M24.9,39.1 A57,57 0 0 1 95.1,39.1"/>
  <linearGradient id="lever" x1="0" x2="1"><stop offset="0" stop-color="#b98a6c"/><stop offset=".4" stop-color="#6a3f2c"/><stop offset="1" stop-color="#2a140c"/></linearGradient>
</defs></svg>`, Y = (e) => M`<span class="label">${e}</span>`, to = (e, t) => {
	let n = (t - 90) * Math.PI / 180;
	return [60 + e * Math.cos(n), 84 + e * Math.sin(n)];
}, no = (e, t) => to(e, t).map((e) => e.toFixed(1)).join(","), ro = (e, t, n) => -50 + 100 * Math.min(1, Math.max(0, (e - t) / (n - t))), io = {
	"°C": "Degrees Celsius",
	kW: "Kilowatts"
}, ao = Array.from({ length: 51 }, (e, t) => N`<path class="scale" d="M${no(36, -50 + t * 2)} L${no(t % 5 ? 40 : 43, -50 + t * 2)}"/>`);
function oo(e, t, n, r, i, a = 0, o = !0) {
	let s = Array.from({ length: 6 }, (e, r) => {
		let [i, a] = to(48, -50 + r * 20);
		return N`<text x=${i.toFixed(1)} y=${(a + 2).toFixed(1)}>${+(t + (n - t) * r / 5).toFixed(1)}</text>`;
	});
	return M`<div class="meter">
    <svg viewBox="0 0 120 120" role="img" aria-label="${e}: ${r} ${i}">
      <circle cx="60" cy="60" r="59" fill="url(#ebon)"/><circle cx="60" cy="60" r="58" fill="none" stroke="#fff" stroke-opacity=".12"/><circle cx="60" cy="62" r="49" fill="none" stroke="#000" stroke-width="2.5"/>
      ${o ? N`<circle cx="60" cy="62" r="50.5" fill="none" stroke="#ffb347" stroke-opacity=".28" stroke-width="2"/>` : F}
      <path fill="url(#${o ? "lit" : "unlit"})" d="M17,78 A46,46 0 1 1 103,78 Q100,92 86,92 C76,92 78,75 60,75 C42,75 44,92 34,92 Q20,92 17,78 Z"/>
      ${o ? N`<ellipse cx="60" cy="24" rx="24" ry="9" fill="url(#spot)" opacity=".55"/>` : F}
      <path class="scale" d="M${no(36, -50)} A36,36 0 0 1 ${no(36, 50)} M${no(40, -50)} A40,40 0 0 1 ${no(40, 50)}"/>${ao}${s}
      <text class="legend"><textPath href="#arch" startOffset="50%">${io[i] ?? i}</textPath></text>
      <text class="unit" x="60" y="66">${i}</text><text class="small" x="33" y="84">MOVING COIL</text><text class="small" x="87" y="84">DASH-BORED</text>
      <g class="needle" style="transform: rotate(${ro(r, t, n).toFixed(1)}deg)"><g class="waver" style="animation-duration: ${Xa[a % Xa.length] * 16}ms">
        <path d="M60,84 V51" stroke="#b4b1a4" stroke-width=".8"/><path d="M60,51 V42" stroke="#111" stroke-width=".8" stroke-linecap="round"/><circle cx="60" cy="50" r="1.5" fill="#111"/></g></g>
      <path d="M17,78 A46,46 0 1 1 103,78" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2.4"/><path d="M26,44 A40,40 0 0 1 58,20" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M17,79 Q20,93 34,93 C45,93 43,76 60,76 C77,76 75,93 86,93 Q100,93 103,79 A46,46 0 0 1 17,79 Z" fill="url(#ebon)"/>
      <circle cx="60" cy="103" r="4.5" fill="#1a1a1a" stroke="#000"/><path d="M56.5,102 l7,2" stroke="#000" stroke-width="1.3"/>
      <g fill="#161616" stroke="#000" stroke-width=".6"><circle cx="60" cy="6" r="2.2"/><circle cx="13" cy="87" r="2.2"/><circle cx="107" cy="87" r="2.2"/></g>
    </svg>
    ${Y(e)}
  </div>`;
}
var so = (e) => M`<svg class="jewel ${e}" viewBox="0 0 40 40" width="34" aria-hidden="true">
  <circle cx="20" cy="21.2" r="18" fill="#000" opacity=".5"/><circle cx="20" cy="20" r="18" fill="url(#brass)"/>
  <g fill="none" stroke="#3a2808"><circle cx="20" cy="20" r="17.6" stroke-width=".7"/><circle cx="20" cy="20" r="15.4" stroke-width=".6" stroke-opacity=".7"/><circle cx="20" cy="20" r="13.6" stroke-width=".9"/></g>
  <circle cx="20" cy="20" r="16.5" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".5" stroke-dasharray="14 90" transform="rotate(200 20 20)"/>
  <circle cx="20" cy="20" r="12.6" fill="#120805"/><circle class="glass" cx="20" cy="20" r="11.8"/>
  <circle cx="20" cy="20" r="11.8" fill="url(#rim)"/><circle cx="20" cy="21" r="8.5" fill="url(#spot)"/><circle cx="20" cy="21" r="4" fill="url(#spot)"/>
  <path d="M12.2,15.5 A9.5,9.5 0 0 1 19,10.6" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5" stroke-linecap="round"/></svg>`, co = Array.from({ length: 19 }, (e, t) => `M36.4,${(41.5 + t * 1.4).toFixed(1)} h7.2`).join(" "), lo = (e) => M`<svg class="valve" viewBox="0 0 80 100" width="74" aria-hidden="true" style="--heat: ${e.toFixed(2)}">
  <ellipse class="halo" cx="40" cy="54" rx="25" ry="33" fill="url(#hot)"/>
  <ellipse cx="40" cy="93" rx="15" ry="2.6" fill="#120805"/><path d="M29,92 v6 M33.5,93 v6 M40,93.5 v6 M46.5,93 v6 M51,92 v6" stroke="#c9c2b0" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M24,91 V26 Q24,10 36,7 L38,3 Q40,1 42,3 L44,7 Q56,10 56,26 V91 Q40,95 24,91 Z" fill="#0c0806" fill-opacity=".35"/>
  <g fill="none" stroke="#b9b2a2" stroke-width=".6" stroke-opacity=".75"><path d="M30,71 C30,80 29,84 29,90 M34,71 C34,79 33.5,85 33.5,91 M40,72 V91 M46,71 C46,79 46.5,85 46.5,91 M50,71 C50,80 51,84 51,90"/><path d="M31,82 C36,78 40,84 45,80" stroke="#b87a3a"/></g>
  <ellipse cx="40" cy="89" rx="14.5" ry="2.4" fill="#fff" fill-opacity=".14"/>
  <path d="M30,38 V31 M34,38 V29 M46,38 V29 M50,38 V31 M33,29 H47" stroke="#9a9a94" stroke-width=".8" fill="none"/>
  <rect x="26.5" y="40" width="9.2" height="29" fill="#4b4e54"/><rect x="44.3" y="40" width="9.2" height="29" fill="#43464b"/>
  <path d="M28.4,40 V69 M46.2,40 V69" stroke="#fff" stroke-opacity=".2" stroke-width="1.6"/><path d="M26.5,47 h9.2 M26.5,62 h9.2 M44.3,47 h9.2 M44.3,62 h9.2" stroke="#000" stroke-opacity=".35" stroke-width=".5"/><path d="M35.2,40 V69 M44.8,40 V69" stroke="#000" stroke-opacity=".5" stroke-width=".8"/>
  <rect x="35.7" y="40" width="8.6" height="29" fill="#150c08"/>
  <ellipse class="heater" cx="40" cy="54" rx="9" ry="20" fill="url(#hot)"/>
  <path d="M36.4,33 V73 M43.6,33 V73" stroke="#b87a3a" stroke-width=".9"/><path d="${co}" stroke="#d9b98a" stroke-width=".35" stroke-opacity=".8"/>
  <rect class="heater" x="38.7" y="35" width="2.6" height="38" rx="1.3" fill="#ff7a1a"/><rect class="heater" x="39.4" y="36" width="1.2" height="36" rx=".6" fill="#ffd28a"/><circle class="heater" cx="40" cy="35.5" r="2.3" fill="#fff4c4"/>
  <g fill="#cdbfa6" fill-opacity=".9" stroke="#7d6e55" stroke-width=".5"><ellipse cx="40" cy="39" rx="15" ry="2.5"/><ellipse cx="40" cy="70" rx="15" ry="2.5"/></g>
  <path d="M24,34 V26 Q24,10 36,7 L38,3 Q40,1 42,3 L44,7 Q56,10 56,26 V34 Q40,29 24,34 Z" fill="url(#getter)"/>
  <path d="M24,91 V26 Q24,10 36,7 L38,3 Q40,1 42,3 L44,7 Q56,10 56,26 V91 Q40,95 24,91 Z" fill="url(#tube)" stroke="#e6eef2" stroke-opacity=".55" stroke-width=".7"/>
  <path d="M27.3,24 V86" stroke="#fff" stroke-opacity=".42" stroke-width="1.5" stroke-linecap="round"/><path d="M53.2,30 V84" stroke="#fff" stroke-opacity=".16" stroke-width="1" stroke-linecap="round"/>
  <path d="M29,17 Q32,10.5 38,9" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/></svg>`, uo = (e, t, n, r, i = "", a = "", o = ["On", "Off"]) => M`<button class="dolly ${t ? "on" : ""} ${n ? "away" : ""} ${i}" aria-pressed=${t} aria-label=${n ? `${e}: not answering` : e + a} @click=${r}>
  <svg viewBox="0 -8 64 74"><circle class="pilot" cx="32" cy="-3" r="3.6" stroke="#c9a24b" stroke-width="1.2"/>
    <circle cx="32" cy="34" r="30" fill="#0e0705"/><circle cx="32" cy="32" r="30" fill="url(#bake)"/>
    <circle cx="32" cy="32" r="29" fill="none" stroke="#fff" stroke-opacity=".16"/><circle cx="32" cy="32" r="23.5" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="1.6"/>
    <g fill="#8a8473" stroke="#2a1a10" stroke-width=".8"><circle cx="9.5" cy="45" r="3"/><circle cx="54.5" cy="19" r="3"/></g>
    <path d="M7.4,43.6 l4.2,2.8 M52.4,20.4 l4.2,-2.8" stroke="#2a1a10" stroke-width="1.1"/>
    <g class="throw"><circle cx="32" cy="32" r="19" fill="url(#dome)"/><rect x="25" y="19" width="14" height="26" rx="3" fill="#050201" stroke="#9a6a50" stroke-opacity=".5" stroke-width=".8"/>
    <g class="lever"><path d="M26.5,34 L28,9 Q32,5 36,9 L37.5,34 Z" fill="url(#lever)" stroke="#060302" stroke-width=".8"/>
      <path d="M30,11 L29.2,31" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/></g></g>
    ${i ? N`<g class="guard"><rect x="17" y="4" width="30" height="56" rx="5" fill="#c8281e" fill-opacity=".82" stroke="#5a0f0a" stroke-width="1.2"/><path d="M21,9 h22" stroke="#fff" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/><rect x="14" y="1" width="36" height="6" rx="2" fill="#8a8473" stroke="#2a1a10" stroke-width=".8"/></g>` : F}
    <ellipse cx="24" cy="23" rx="5" ry="3" fill="#fff" opacity=".22" transform="rotate(-35 24 23)"/></svg>
  ${Y(e)}
</button>`, fo = Array.from({ length: 11 }, (e, t) => {
	let n = (-135 + t * 27 - 90) * Math.PI / 180, r = (e) => [(52 + e * Math.cos(n)).toFixed(1), (52 + e * Math.sin(n)).toFixed(1)], [i, a] = r(40), [o, s] = r(47);
	return N`<line x1=${i} y1=${a} x2=${o} y2=${s} stroke="#e9dfc3" stroke-width=${t % 5 ? 1 : 2.2}/>`;
}), po = (e, t, n, r, i, a, o, s, c = [0, 100], l) => M`<div class="dial ${t}">
  <div class="dimmer"><svg viewBox="0 0 104 104" aria-hidden="true">${fo}</svg>
    <div class="knob ${t} ${i ? "drag" : ""}" role="slider" tabindex="0" aria-label="${e} ${n}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(r)} aria-valuetext=${a} style="--lvl: ${r.toFixed(1)}"
      @pointerdown=${s.down} @pointermove=${s.move} @pointerup=${s.up} @pointercancel=${s.drop} @keydown=${s.key}><span class="flutes"></span><span class="cap"></span><span class="mark"></span></div></div>
  ${Y(e)}${o || t === "sound" ? M`<span class="note">${o ? Y(o) : F}</span>` : F}
</div>`, mo = (e, t, n) => M`<button class="tv" aria-label=${e} @click=${n}>
  <span class="tube">${t ? M`<img src=${t} alt="" loading="lazy" />` : F}</span>
  ${Y(e)}
</button>`, ho = [
	.9,
	-1.3,
	.4,
	1.6,
	-.7,
	-1.7
], go = (e, t, n) => M`<div class="wheels" role="group" aria-label="${e} code">${t.map((e, t) => M`<div class="wheel">
    ${Ya([
	-2,
	-1,
	0,
	1,
	2
].map((t) => e + t), (e) => e, (n) => M`<span class=${n === e ? "at" : ""} aria-hidden=${n === e ? F : "true"} aria-label=${n === e ? `Wheel ${t + 1}: ${Qa(n) || "blank"}` : F}
        style="--n: ${n - e}; --off: ${ho[t % ho.length]}px">${Qa(n)}</span>`)}
    <button aria-label="Wheel ${t + 1} on" @click=${() => n(t, 1)}></button><button aria-label="Wheel ${t + 1} back" @click=${() => n(t, -1)}></button>
  </div>`)}</div>`, _o = (e, t) => M`<button class="push" @click=${t}><span class="cap"></span>${Y(e)}</button>`, vo = (e, t, n) => M`<button class="knife ${t ? "closed" : ""}" @click=${n}>
  <svg viewBox="0 0 130 84" aria-hidden="true"><rect x="4" y="62" width="122" height="18" rx="3" fill="#3c4142" stroke="#111"/>
    <path d="M100,62 v-16 M108,62 v-16" stroke="#c9a24b" stroke-width="4"/><path d="M18,62 v-8 h8 v8" fill="#c9a24b"/>
    <circle class="spark" cx="104" cy="46" r="7" fill="url(#hot)"/>
    <g class="blade"><rect x="18" y="56" width="92" height="7" rx="2" fill="#d6a45a" stroke="#7a5c1e"/><rect x="104" y="42" width="12" height="26" rx="5" fill="#1c0f0a"/></g>
    <circle cx="22" cy="60" r="4" fill="#7a5c1e"/></svg>
  ${Y(e)}
</button>`;
//#endregion
//#region src/dash-bored/console/plot.ts
function yo(e, t, n, r, i) {
	let a = [], o;
	return e.forEach((s, c) => {
		let l = Math.max(s.at, t), u = Math.min(e[c + 1]?.at ?? n, n);
		if (u <= l) return;
		if (s.away) return void (o = void 0);
		let d = s.on ? s.level === void 0 ? 1 : Math.min(1, Math.max(.08, (s.level - r) / (i - r))) : 0;
		o || a.push(o = []), o.push([(l - t) / (n - t), d], [(u - t) / (n - t), d]);
	}), a;
}
//#endregion
//#region src/dash-bored/console/bakelite/recorder.ts
var bo = [
	"#a3261a",
	"#1f3f7a",
	"#2c6b3a",
	"#6a2a6a"
], xo = 96, So = 640, Co = 34, wo = 36e5;
function To(e, t, n, r, i) {
	let a = n - 24 * wo, o = (e) => xo + (e - a) / (n - a) * 536, s = Math.ceil(a / wo) * wo, c = Array.from({ length: 24 }, (e, t) => s + t * wo).filter((e) => e <= n), l = t.length * Co + 26;
	return M`<dialog class="recorder" aria-label="${e}: the last day" @close=${i} @click=${(e) => e.target === e.currentTarget && i()}>
    ${Y(`${e}: the last day`)}
    ${r ? M`<div class="warn"><span class="lamp"></span>${Y(`The record could not be read (${r}).`)}</div>` : F}
    <svg class="paper" viewBox="0 0 ${So} ${l}" role="img" aria-label="A chart of when each device in ${e} was on">
      <rect width=${So} height=${l} fill="url(#sepia)"/>
      ${c.map((e) => {
		let t = new Date(e).getHours() % 3 == 0;
		return N`<path d="M${o(e).toFixed(1)},4 V${l - 16}" stroke="#7a5a2c" stroke-opacity=${t ? .5 : .2} stroke-width=".6"/>${t ? N`<text class="hour" x=${o(e).toFixed(1)} y=${l - 5}>${String(new Date(e).getHours()).padStart(2, "0")}</text>` : F}`;
	})}
      ${t.map((e, t) => {
		let i = (t + 1) * Co, o = yo(e.changes ?? [], a, n, e.lo, e.hi).map((e) => e.map(([e, t], n) => `${n ? "L" : "M"}${(xo + e * 536).toFixed(1)},${(i - t * 22).toFixed(1)}`).join(" ")).join(" "), s = bo[t % bo.length];
		return N`<path d="M${xo},${i} H${632}" stroke="#7a5a2c" stroke-opacity=".35" stroke-width=".5" stroke-dasharray="1 3"/>
          <text class="lane" x=${90} y=${i - 3}>${e.name}</text>
          ${e.changes ? N`<path d=${o} fill="none" stroke=${s} stroke-width="1.3" stroke-linejoin="round" stroke-opacity=".9"/>` : N`<text class="hour" x=${136} y=${i - 3}>${r ? "" : "reading…"}</text>`}`;
	})}
    </svg>
    ${_o("Close", i)}
  </dialog>`;
}
//#endregion
//#region src/dash-bored/console/bakelite/styles.ts
var Eo = b`
  .panel { --cream: #e9dfc3; --bake2: #1c0f0a; --brass: #c9a24b; box-sizing: border-box; min-height: 100%; padding: 18px 22px; color: var(--cream);
    font-family: "Gill Sans", "Gill Sans MT", "Futura", sans-serif;
    /* Hammer-finish enamel: the grey-green of a 1950s instrument panel. */
    background: radial-gradient(rgba(255,255,255,.06) 1px, transparent 1.6px) 0 0 / 5px 5px, linear-gradient(160deg, #7d8d80, #55645a); }
  .panel * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; margin: 0 auto; overflow: visible; }
  .defs { position: absolute; }
  /* Traffolyte: engraved labels, white letters cut through black laminate. */
  .label { display: inline-block; max-width: 100%; background: #111; color: #f4f0e4; font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase;
    padding: 3px 9px; border-radius: 2px; box-shadow: 0 0 0 1px #777, 0 1px 2px #000; overflow-wrap: anywhere; }

  /* What must never be missed: a lost connection, a refused action. A red lamp and a plate. */
  .warn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .warn .label { font-size: 12px; letter-spacing: .12em; text-transform: none; }
  .lamp { flex: none; width: 16px; height: 16px; border-radius: 50%; background: #ff5a3c; box-shadow: 0 0 0 2px var(--brass), 0 0 10px #ff5a3c; }

  .top { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end; margin-bottom: 16px; }
  .top .meter { flex: 0 1 170px; }
  .floor .label { font-size: 12px; }
  /* Between two floors in one row, a brass rod held off the enamel by two brass saddles,
     a tenth of its length in from each end, each with a slotted screw either side of the rod. */
  .bar { opacity: 1; background: linear-gradient(90deg, #6a4f18, #f6e3a0 36%, #c9a24b 62%, #5a4210); box-shadow: 3px 4px 4px rgba(0,0,0,.45), inset 0 0 0 .5px rgba(60,40,5,.6); }
  .bar::before, .bar::after { content: ""; position: absolute; left: 50%; width: 24px; height: 13px; margin-left: -12px; border-radius: 6.5px;
    background: linear-gradient(100deg, transparent 43%, rgba(30,18,4,.75) 44% 56%, transparent 57%) 2px 50% / 6px 6px no-repeat, linear-gradient(80deg, transparent 43%, rgba(30,18,4,.75) 44% 56%, transparent 57%) calc(100% - 2px) 50% / 6px 6px no-repeat,
      radial-gradient(circle at 5px 50%, #8a6a22 0 3.4px, transparent 3.8px), radial-gradient(circle at calc(100% - 5px) 50%, #8a6a22 0 3.4px, transparent 3.8px),
      linear-gradient(90deg, #b08a35, #f1d98d 30%, #fff3c4 50%, #e2c070 68%, #8a6a22);
    box-shadow: 0 3px 4px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1.5px 1px rgba(60,40,5,.6), 0 0 0 .6px #3a2808; }
  .bar::before { top: 10%; } .bar::after { bottom: 10%; }
  /* A chassis is some of the panel's columns across (views.ts lays the rooms out, and
     balance.ts chooses). */
  .room { background: linear-gradient(170deg, #4a2a1d, var(--bake2)); border-radius: 14px; padding: 10px 10px 14px; text-align: center;
    box-shadow: inset 0 2px 0 rgba(255,255,255,.15), inset 0 -4px 8px rgba(0,0,0,.5), 0 8px 14px rgba(0,0,0,.35); }
  /* A room's meter, knobs and switches share rows where the chassis is wide enough. Every
     control is fixed to the panel: it hangs from the top of its row and keeps the same
     height whatever its plate says, with room under it for a plate of two lines, so a
     name that grows or a setting that changes moves nothing (owner, 2026-11-15). */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px 6px; }
  .works > .meter { flex: 0 1 150px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .7; }
  .more .label { font-size: 8.5px; letter-spacing: .12em; }

  /* Moving-coil meters: the case and face are drawn in kit.ts, the lettering set here. */
  .meter { text-align: center; }
  .meter svg { width: 100%; height: auto; margin-bottom: 6px; filter: drop-shadow(0 6px 8px rgba(0,0,0,.5)); }
  .scale { fill: none; stroke: #2a1a10; stroke-width: .6; }
  /* The needle swings to a new reading and settles by its easing. Inside it, the pointer
     wavers a little all the time, as a moving coil does: it glides between seven places
     in about a second (owner, 2026-11-14: smooth, not in steps). Each meter has a period
     of its own (kit.ts), so they are never in step. The browser draws it; no script runs.
     This is the most a needle wavers in any era: the wobble falls by a quarter with each
     decade, to none in the 1990s (owner, 2026-11-15). */
  .needle { transform-origin: 60px 84px; transition: transform 1.1s cubic-bezier(.3, 1.7, .5, 1); }
  .waver { transform-origin: 60px 84px; animation: waver 1.2s ease-in-out infinite; }
  @keyframes waver { 0% { transform: rotate(0deg); } 14% { transform: rotate(.5deg); } 29% { transform: rotate(-.3deg); } 43% { transform: rotate(.7deg); } 57% { transform: rotate(-.6deg); } 71% { transform: rotate(.2deg); } 86% { transform: rotate(-.4deg); } }
  .meter text { fill: #2a1a10; font-size: 6px; text-anchor: middle; letter-spacing: .04em; }
  .meter .legend { font-size: 5.6px; letter-spacing: .12em; text-transform: uppercase; }
  .meter .unit { font-size: 6.5px; } .meter .small { font-size: 2.6px; letter-spacing: .1em; }

  /* Warning lamps: Sensor Watch's alerts, a pilot lamp and a plate each. The glass takes the
     level's colour; the lamp behind it is the white spot, and the light it throws on the
     panel is the shadow. A critical one flashes, as an annunciator's does. */
  .lamps { display: flex; flex-wrap: wrap; gap: 13px 16px; margin-bottom: 18px; }
  .alert { display: flex; align-items: center; gap: 8px; max-width: 100%; }
  /* What is wrong is written by hand, in India ink on thick card, and slid into a brass
     card holder: a bevelled frame with an ear and a screw at each end. No two cards sit
     quite square. */
  .alert .label { position: relative; margin: 0 17px; padding: 5px 14px 3px; border: 5px solid; border-image: linear-gradient(160deg, #f6e3a0, #b8923c 35%, #7a5c1e 60%, #e2c070) 1; border-radius: 0;
    background: var(--blots, none), linear-gradient(175deg, #f7efd9, #e9dcba); color: #17110a; text-shadow: 0 0 .7px rgba(23,17,10,.75), var(--smear, 0 0 0 transparent); font: 400 14px/1.55 "Dash-Bored Hand", "Snell Roundhand", "Segoe Script", "Lucida Handwriting", cursive; letter-spacing: 0; text-transform: none;
    box-shadow: inset 0 2px 3px rgba(0,0,0,.45), inset 0 0 0 1px rgba(60,40,5,.5), 0 2px 3px rgba(0,0,0,.6); }
  .alert .label::before, .alert .label::after { content: ""; position: absolute; top: 50%; width: 17px; height: 24px; margin-top: -12px;
    background: radial-gradient(circle at var(--screw) 50%, #20140a 0 2.3px, #6b5018 2.4px 3.2px, transparent 3.4px), linear-gradient(160deg, #f1d98d, #b08a35 50%, #7a5c1e); box-shadow: 0 2px 3px rgba(0,0,0,.6); }
  .alert .label::before { --screw: 7px; left: -22px; border-radius: 12px 0 0 12px; }
  .alert .label::after { --screw: 10px; right: -22px; border-radius: 0 12px 12px 0; }
  .alert:nth-child(3n + 1) .label { transform: rotate(-.35deg); } .alert:nth-child(3n + 2) .label { transform: rotate(.3deg); }
  /* Nobody wrote them that neatly. The ink has bled a little into the card everywhere;
     here and there is a blot where the nib was rested, a faint smear where a hand went
     over wet ink, and a line of writing dragged a little to the right. Three cards in
     four have something, each a different thing. */
  .alert:nth-child(4n + 1) .label { --blots: radial-gradient(ellipse 4px 3px at 86% 72%, rgba(23,17,10,.5), rgba(23,17,10,.12) 70%, transparent), radial-gradient(ellipse 30px 5px at 34% 78%, rgba(23,17,10,.09), transparent 75%); }
  .alert:nth-child(4n + 2) .label { --smear: 2px .6px 2.5px rgba(23,17,10,.2); --blots: radial-gradient(ellipse 9px 7px at 12% 30%, rgba(23,17,10,.07), transparent 80%); }
  .alert:nth-child(4n + 3) .label { --blots: radial-gradient(ellipse 2.5px 2.5px at 58% 22%, rgba(23,17,10,.45), transparent), radial-gradient(ellipse 1.5px 1.5px at 60% 34%, rgba(23,17,10,.4), transparent), radial-gradient(ellipse 40px 6px at 70% 66%, rgba(23,17,10,.08), transparent 75%); }
  .jewel { flex: none; margin: 0; filter: drop-shadow(0 0 4px var(--glow)) drop-shadow(0 0 14px var(--glow)); }
  .jewel .glass { fill: var(--glow); }
  .jewel.nominal { --glow: #4fdc4f; } .jewel.task { --glow: #efe7cc; } .jewel.warning { --glow: #ff9d14; } .jewel.error, .jewel.critical { --glow: #ff3b1f; }
  .jewel.critical { animation: flash 1s steps(2, jump-none) infinite; }
  @keyframes flash { 0% { filter: none; opacity: .45; } 100% { opacity: 1; } }

  /* Valves: one to a room, glowing with its lights. */
  .valve .heater { opacity: calc(.12 + var(--heat, 0) * .88); transition: opacity 1.4s; }
  .valve .halo { opacity: var(--heat, 0); transition: opacity 1.4s; animation: flicker 3.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes flicker { 0%, 100% { transform: scale(1); } 40% { transform: scale(1.06); } 43% { transform: scale(.97); } 70% { transform: scale(1.03); } }

  /* The dimmer: a fluted knob over an engraved scale. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; min-height: 152px; }
  .dial.heat { min-height: 174px; }
  /* A player's note has three lines' room kept for it, and anything longer is cut off there. */
  .dial.sound .note { height: 42px; overflow: hidden; }
  .dimmer { position: relative; width: 104px; height: 104px; margin: 8px auto 6px; }
  .dimmer svg { position: absolute; inset: 0; }
  /* A fluted Bakelite knob, in layers. The flutes and the pointer turn with the level. The
     light does not: the shading over the flutes, the cap's highlight and the shadow on the
     panel stay where they are, as they would on a real knob lit from the upper left.
     --k1 to --k3 are the flutes from their shadow to their shine; --c1 and --c2 the cap. */
  .knob { --k1: #0b0b0b; --k2: #262626; --k3: #4d4d4d; --c1: #5c5c5c; --c2: #151515; --ring: #8f8f86; --line: #f4f0e4;
    position: absolute; inset: 14px; border-radius: 50%; cursor: grab; touch-action: none;
    box-shadow: 0 9px 12px rgba(0,0,0,.6), 0 3px 3px rgba(0,0,0,.55), 0 0 0 1.5px rgba(0,0,0,.6); }
  .knob span { position: absolute; border-radius: 50%; }
  .flutes, .mark { inset: 0; transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .knob.drag .flutes, .knob.drag .mark { transition: none; }
  .flutes { background: repeating-conic-gradient(var(--k1) 0deg, var(--k2) 5deg, var(--k3) 9deg, var(--k2) 12deg, var(--k1) 15deg); }
  /* The light on the flutes: bright at the upper left, dark at the lower right, and a darker edge all round. */
  .knob::before { content: ""; position: absolute; inset: 0; z-index: 1; border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle at 30% 24%, rgba(255,255,255,.3), transparent 46%), radial-gradient(circle at 72% 80%, rgba(0,0,0,.55), transparent 58%);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.1), inset 0 -3px 6px rgba(0,0,0,.55), inset 0 2px 3px rgba(255,255,255,.18); }
  /* The cap: a shallow dome inside a metal ring. Named with its knob: a push button has a cap too. */
  .knob .cap { inset: 23%; z-index: 2; background: radial-gradient(circle at 34% 28%, var(--c1), var(--c2) 72%);
    box-shadow: 0 0 0 1.5px rgba(0,0,0,.7), 0 0 0 3px var(--ring), 0 0 0 4px rgba(0,0,0,.55), 0 3px 5px 4px rgba(0,0,0,.45), inset 0 2px 2px rgba(255,255,255,.3), inset 0 -3px 4px rgba(0,0,0,.5); }
  .knob .cap::after { content: ""; position: absolute; left: 18%; top: 12%; width: 34%; height: 20%; border-radius: 50%; background: rgba(255,255,255,.3); transform: rotate(-32deg); filter: blur(1.5px); }
  /* The pointer: a white line let into the knob, from the cap to the rim. */
  .mark { z-index: 3; pointer-events: none; }
  .mark::after { content: ""; position: absolute; left: 50%; top: 3%; width: 3.4px; height: 25%; margin-left: -1.7px; border-radius: 1.5px;
    background: var(--line); box-shadow: 0 0 0 .6px rgba(0,0,0,.6), inset 0 -1px 1px rgba(0,0,0,.25); }
  .knob:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }
  .note { display: block; margin-top: 4px; } .note .label { font-size: 8px; letter-spacing: .08em; text-transform: none; }
  /* A blind's winder is brass, the heating's knob oxblood, a player's ivory and a fan's grey-green. */
  .knob.wind { --k1: #4d370c; --k2: #a8832f; --k3: #f3dc94; --c1: #f8e7ae; --c2: #7d5e1c; --ring: #5a4210; --line: #2a1a05; }
  .knob.heat { --k1: #230504; --k2: #651711; --k3: #b54a3f; --c1: #b0483d; --c2: #330907; }
  .knob.sound { --k1: #776f5a; --k2: #cbc1a2; --k3: #fffbe8; --c1: #fffaea; --c2: #a1977a; --ring: #6f6853; --line: #1c0f0a; }
  .knob.air { --k1: #121a16; --k2: #3b4e43; --k3: #7f9d8b; --c1: #86a391; --c2: #1b2620; }

  /* Dolly switches: a stepped round base, a dome with a slot, a lever in the slot. */
  /* A button centres what is in it. The switch is pinned to the top instead, with its plate under it. */
  .dolly { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 92px; min-height: 100px; margin-top: 10px; text-align: center; }
  .dolly svg { flex: none; width: 60px; height: 70px; margin: 0 0 3px; filter: drop-shadow(0 4px 4px rgba(0,0,0,.55)); }
  .dolly .label { font-size: 8px; letter-spacing: .1em; padding: 2px 5px; }
  .dolly .lever { transform-origin: 32px 32px; transition: transform .1s cubic-bezier(.5, 0, 1, .5); }
  .dolly.on .lever { transform: scaleY(-1); }
  .dolly .pilot { fill: #4a1410; transition: fill .15s; }
  .dolly.on .pilot { fill: #ff5a3c; filter: drop-shadow(0 0 4px #ff5a3c); }
  /* A guard over a switch that must not be thrown by accident: hinged at its top, and lifted by the first press. */
  .dolly .guard { transform-origin: 32px 4px; transition: transform .18s; }
  .dolly.up .guard { transform: scaleY(.1); }
  .dolly.away { cursor: default; } .dolly.away svg { opacity: .45; } .dolly.away .pilot { fill: #222; filter: none; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible svg { outline: 2px solid var(--cream); border-radius: 8px; }

  /* An alarm: a plate saying how it stands, thumbwheels for its code, and push buttons. */
  .alarm { flex: 0 1 140px; display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 10px; }
  /* The alarm's plate is the same size whatever it says, since the thumbwheels are under it. */
  .alarm > .label { display: flex; align-items: center; justify-content: center; width: 132px; min-height: 34px; }
  .alarm.sounding > .label { background: #c8281e; }
  /* Thumbwheels: brass barrels seen from the front. The shading makes the barrel round,
     and the digits above and below are squashed as they curve away. */
  .wheels { display: flex; gap: 3px; padding: 5px; background: #0b0605; border-radius: 5px; box-shadow: inset 0 0 0 1px #000, 0 1px 0 rgba(255,255,255,.12); }
  .wheel { position: relative; width: 19px; height: 62px; overflow: hidden; border-radius: 4px; color: var(--bake2); font: bold 17px/18px "Gill Sans", "Gill Sans MT", sans-serif; text-align: center;
    background: linear-gradient(#2e2006, #8a6a22 10%, #c9a24b 24%, #f3dc9a 44%, #f8e9b8 52%, #c9a24b 76%, #7a5c1e 90%, #2e2006);
    box-shadow: inset 0 0 0 1px #2a1c05, 0 2px 3px rgba(0,0,0,.6); }
  /* The grooves either side of the front face. */
  .wheel::before, .wheel::after { content: ""; position: absolute; left: 0; right: 0; height: 1px; background: rgba(60,40,5,.65); box-shadow: 0 1px 0 rgba(255,255,255,.45); }
  .wheel::before { top: 16px; } .wheel::after { bottom: 17px; }
  /* The digits are engraved: dark in the cut, with a bright edge below where the light
     catches it. They roll to their new places when a wheel is turned, a little past and back. */
  .wheel span { position: absolute; left: 0; right: 0; top: 22px; height: 18px; color: rgba(46, 28, 4, .88); transform: translateY(calc(var(--n) * 27px + var(--off))) scaleY(.6);
    text-shadow: 0 1px 0 rgba(255, 246, 205, .85), 0 -.6px 0 rgba(0, 0, 0, .45); transition: transform .6s cubic-bezier(.45, 0, .3, 1.25); }
  .wheel span.at { transform: translateY(var(--off)); }
  .wheel span:not(.at) { opacity: .7; }
  .wheel button { position: absolute; left: 0; right: 0; height: 50%; } .wheel button:first-of-type { top: 0; } .wheel button:last-of-type { bottom: 0; }
  .wheel button:focus-visible { outline: 2px solid var(--cream); outline-offset: -2px; }
  .pushes { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .push { text-align: center; }
  .push .cap { display: block; width: 28px; height: 28px; margin: 4px auto 6px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #b8433a, #4a0f0a);
    box-shadow: 0 0 0 3px var(--bake2), 0 0 0 4px var(--brass), 0 3px 4px rgba(0,0,0,.6); }
  .push:active .cap { transform: translateY(1px); }
  .push .label { font-size: 8px; letter-spacing: .1em; padding: 2px 5px; }
  .push:focus-visible .cap { outline: 2px solid var(--cream); outline-offset: 4px; }

  /* A television screen: a camera's picture in black and white, behind a curved glass
     with its lines and a reflection. The surround is Bakelite with a brass trim. */
  .tv { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex: 0 1 150px; min-height: 146px; margin-top: 10px; text-align: center; }
  /* The screen's height is set from its width by padding, with the picture laid over it:
     an aspect ratio with a picture as tall as its box grows without end in WebKit. */
  .tube { display: block; position: relative; flex: none; align-self: stretch; height: 0; padding-top: calc((100% - 12px) * .75); margin: 0 6px 8px; overflow: hidden; border-radius: 22% / 26%; background: radial-gradient(#27302b, #0a0d0b);
    box-shadow: 0 0 0 5px #1c0f0a, 0 0 0 6px var(--brass), 0 6px 10px rgba(0,0,0,.6); }
  .tube img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.15) brightness(1.05) sepia(.14); }
  .tube::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(125deg, rgba(255,255,255,.2), transparent 32%), repeating-linear-gradient(rgba(0,0,0,.2) 0 1px, transparent 1px 3px), radial-gradient(transparent 55%, rgba(0,0,0,.6));
    box-shadow: inset 0 0 14px #000; }
  .tv .label { font-size: 8.5px; letter-spacing: .1em; padding: 2px 6px; }
  .tv:focus-visible .tube { outline: 2px solid var(--cream); outline-offset: 7px; }
  .top .tv { flex-basis: 170px; }

  /* The chart recorder: a strip of sepia paper in a Bakelite case. */
  .rec { margin-top: 10px; opacity: .85; } .rec .label { font-size: 8.5px; letter-spacing: .12em; }
  .rec:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }
  dialog.recorder { width: min(760px, 94vw); padding: 14px; border: 0; border-radius: 14px; color: var(--cream); text-align: center;
    background: linear-gradient(170deg, #4a2a1d, #1c0f0a); box-shadow: inset 0 2px 0 rgba(255,255,255,.15), 0 20px 40px rgba(0,0,0,.6); }
  dialog.recorder::backdrop { background: rgba(0,0,0,.55); }
  .paper { width: 100%; height: auto; margin: 10px 0 6px; border-radius: 3px; box-shadow: inset 0 0 0 1px #7a5a2c, 0 2px 6px rgba(0,0,0,.6); }
  .paper text { fill: #5a3d16; }
  .paper .lane { font-size: 9px; text-anchor: end; letter-spacing: .04em; } .paper .hour { font-size: 8px; text-anchor: middle; }

  /* Knife switches: the scenes. */
  /* An open blade stands well above its own switch: a second row of them is set that far below the first. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 46px 14px; justify-content: space-around; align-items: flex-end; padding: 38px 18px 10px;
    background: linear-gradient(170deg, #2b1811, #120906); border-radius: 12px; box-shadow: inset 0 2px 0 rgba(255,255,255,.14), 0 8px 14px rgba(0,0,0,.4); }
  .knife { text-align: center; max-width: 130px; }
  .knife svg { width: 130px; height: 84px; margin-bottom: 4px; }
  .blade { transform-origin: 22px 60px; transform: rotate(-52deg); transition: transform .16s cubic-bezier(.5, 0, 1, .6); }
  .knife.closed .blade { transform: rotate(0deg); transition: transform .1s cubic-bezier(.6, 0, 1, 1); }
  .spark { opacity: 0; transform-box: fill-box; transform-origin: center; } .knife.closed .spark { animation: spark .35s ease-out; }
  @keyframes spark { 10% { opacity: 1; } 100% { opacity: 0; transform: scale(2); } }
  .knife:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { .valve .halo, .waver, .jewel.critical { animation: none; } .needle { transition: none; } }
`, Do = 864e5;
function Oo(e, t) {
	let n = [];
	for (let r of t) {
		let t = {
			at: r.lu * 1e3,
			...qt(e, {
				state: r.s,
				attributes: r.a ?? {}
			})
		}, i = n.at(-1);
		(!i || i.on !== t.on || i.phase !== t.phase || i.level !== t.level || i.away !== t.away) && n.push(t);
	}
	return n;
}
function ko(e, t, n) {
	let r = [];
	return e.forEach((i, a) => {
		let o = Math.max(i.at, t), s = Math.min(e[a + 1]?.at ?? n, n);
		i.on && s > o && r.push([(o - t) / (n - t) * 100, (s - o) / (n - t) * 100]);
	}), r;
}
async function Ao(e, t, n) {
	let r = await e.connection.sendMessagePromise({
		type: "history/history_during_period",
		start_time: (/* @__PURE__ */ new Date(n - Do)).toISOString(),
		entity_ids: [t.id],
		significant_changes_only: !1,
		no_attributes: t.kind === "light" || !Ht(t.kind)
	});
	return Oo(t.kind, r[t.id] ?? []);
}
//#endregion
//#region src/dash-bored/console/balance.ts
var jo = 172, Mo = 32, No = [156, 185], Po = [110, 156], Fo = [98, 126], Io = [146, 170], Lo = [156, 158], Ro = [136, 166], zo = (e) => [140, 124 + e * 15], Bo = 12, Vo = 120, Ho = (e) => Math.max(1, Math.floor((e + 12) / jo));
function Uo(e, t) {
	let n = jo * t - Mo, r = 0, i = n, a = 0;
	for (let [t, o] of [
		...e.meter ? [No] : [],
		...Array(e.knives).fill(Ro),
		...e.selectors.map(zo),
		...Array(e.knobs).fill(Po),
		...Array(e.dollies).fill(Fo),
		...Array(e.tvs).fill(Lo),
		...e.presets.map(zo),
		...Array(e.alarms).fill(Io)
	]) i + t > n && (r += a, i = a = 0), i += t, a = Math.max(a, o);
	return r + a;
}
var Wo = 96;
function Go(e, t) {
	let n = Gn(t), r = n.map((t) => t.things.reduce((n, r) => n + Bo + Vo + Uo(e[r], t.wide), -12)), i = /* @__PURE__ */ new Map();
	return n.forEach((e, t) => i.set(e.row, Math.max(i.get(e.row) ?? 0, r[t]))), n.map((e, t) => ({
		...e,
		blank: i.get(e.row) - r[t] - Bo >= Wo
	}));
}
var Ko = (e, t, n = () => !1) => Wn(e.length, (t, n) => Vo + Uo(e[t], n), t, Bo, n), qo = 270, Jo = 180, Yo = (e, t) => t < 2 ? 0 : -135 + qo * e / (t - 1), Xo = (e, t, n, r, i = "") => M`<div class="selector" role="radiogroup" aria-label=${e}>
  <div class="rotary">
    ${t.map((e, n) => M`<button class="stop" tabindex="-1" aria-hidden="true" style="--a: ${Yo(n, t.length)}deg" @click=${() => r(n)}>${n + 1}</button>`)}
    <span class="pointer" style="--a: ${n < 0 ? Jo : Yo(n, t.length)}deg"></span>
  </div>
  <ol class="legend">${i ? M`<li class="head" title=${i}>${i}</li>` : F}${t.map((e, t) => M`<li><button role="radio" aria-checked=${t === n} title=${e} @click=${() => r(t)}><b>${t + 1}</b><span>${e}</span></button></li>`)}</ol>
</div>`, Zo = b`
  /* It gives up a little width in a chassis that stands off from a floor's bar: its legend is cut short there. */
  .selector { flex: 0 1 134px; min-width: 104px; margin-top: 8px; text-align: left; }
  .rotary { position: relative; width: 104px; height: 104px; margin: 0 auto 6px; }
  .rotary .stop { position: absolute; left: 50%; top: 50%; width: 20px; height: 20px; margin: -10px; border-radius: 50%; text-align: center; font-size: 10px; font-weight: 600; line-height: 20px; cursor: pointer;
    transform: rotate(var(--a)) translateY(-42px) rotate(calc(var(--a) * -1)); }
  .pointer { position: absolute; inset: 24px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle at 34% 28%, #5a5a5a, #111 70%);
    box-shadow: 0 5px 7px rgba(0,0,0,.6), 0 0 0 2px #000, 0 0 0 3.5px #8f8f86; transform: rotate(var(--a)); transition: transform .25s; }
  .pointer::after { content: ""; position: absolute; left: 50%; top: -7px; width: 9px; height: 35px; margin-left: -4.5px; border-radius: 4.5px 4.5px 2px 2px;
    background: linear-gradient(90deg, #1a1a1a, #6a6a6a 45%, #1a1a1a); box-shadow: inset 0 4px 0 #f4f0e4, 0 1px 2px rgba(0,0,0,.6); }
  .legend { margin: 0; padding: 0; list-style: none; }
  .legend button { display: flex; align-items: center; gap: 5px; box-sizing: border-box; width: 100%; height: 15px; font-size: 9px; letter-spacing: .06em; text-transform: uppercase; opacity: .72; cursor: pointer; }
  .legend .head { height: 15px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 9px; font-weight: 700; line-height: 15px; letter-spacing: .06em; text-transform: uppercase; text-align: center; }
  .legend b { flex: none; width: 12px; text-align: right; }
  .legend span { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .legend button[aria-checked="true"] { opacity: 1; font-weight: 700; }
  .legend button:focus-visible, .rotary .stop:focus-visible { outline: 2px solid currentColor; outline-offset: 1px; }
  @media (prefers-reduced-motion: reduce) { .pointer { transition: none; } }
`, Qo = "alarm_control_panel", $o = "camera", es = {
	light: ["", "dimmer"],
	cover: ["wind", "position"],
	climate: ["heat", "target"],
	water_heater: ["heat", "target"],
	media_player: ["sound", "volume"],
	fan: ["air", "speed"],
	humidifier: ["air", "target"]
}, ts = /* @__PURE__ */ new Set([
	"climate",
	"water_heater",
	"humidifier",
	"media_player",
	$o
]), ns = 18e5, rs = [
	[
		"alarm_arm_away",
		2,
		"Away"
	],
	[
		"alarm_arm_home",
		1,
		"Home"
	],
	[
		"alarm_arm_night",
		4,
		"Night"
	]
], is = 6, as = 3e4, os = {
	lock: ["locked", "unlocked"],
	cover: ["open", "closed"],
	valve: ["open", "closed"],
	siren: ["sounding", "silent"]
}, ss = {
	lock: ["Unlocked", "Locked"],
	cover: ["Open", "Shut"],
	valve: ["Open", "Shut"],
	siren: ["On", "Off"]
}, cs = 6e3, ls = 270, us = 4, ds = 1200, fs = 5e3, ps = [
	3,
	6,
	12,
	24,
	48
], ms = {
	temperature: [
		5,
		30,
		"°C"
	],
	humidity: [
		0,
		100,
		"%"
	]
}, hs = (e) => e.dims && !e.away, gs = (e) => e.kind === Qo, X = (e) => e.kind === $o, _s = (e) => !hs(e) && !gs(e) && !X(e), vs = M`<div class="room blank" aria-hidden="true"><i class="vent"></i></div>`, ys = (e) => {
	let t = Math.ceil(e / 10), n = Math.ceil(e / t);
	return Array.from({ length: t }, (t, r) => Math.min(n, e - r * n));
}, bs = (e) => e.room ? `${e.room} ${e.name}` : e.name;
function xs(e) {
	let t = e.currentTarget.getBoundingClientRect();
	return Math.atan2(e.clientY - (t.top + t.height / 2), e.clientX - (t.left + t.width / 2)) * 180 / Math.PI;
}
var Ss = class extends Nn {
	constructor(...e) {
		super(...e), this._cols = 1, this._heard = !1, this._thrown = "", this._turned = {}, this._armed = "", this._alerts = [], this._seen = [], this._elsewhere = (e) => {
			this._armed && !e.target.closest?.(".dolly.shut, .dolly.up") && (this._armed = "");
		}, this._look = (e) => () => s(this, "hass-more-info", { entityId: e });
	}
	static {
		this.properties = {
			_cols: { state: !0 },
			_want: { state: !0 },
			_thrown: { state: !0 },
			_turned: { state: !0 },
			_armed: { state: !0 },
			_code: { state: !0 },
			_alerts: { state: !0 },
			_heard: { state: !0 },
			_seen: { state: !0 },
			_chart: { state: !0 }
		};
	}
	get _view() {
		return this._config.view ?? "panel";
	}
	_resized(e) {
		let t = Ho(this.renderRoot?.querySelector(".rooms")?.clientWidth || e - 44);
		t !== this._cols && (this._cols = t);
	}
	get _reads() {
		return this._view !== "lamps";
	}
	_listen() {
		super._listen();
		let e = this._view;
		(e === "panel" || e === "lamps") && this._follow(Cn, "Sensor Watch's alerts", (e) => {
			let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
			for (let n of e) t.set(n.entity_id, n);
			this._alerts = [...t.values()], this._heard = !0;
		}), (e === "panel" || e === "room" || this._config.entity?.startsWith(`${$o}.`)) && this._follow(wn, "The cameras' sightings", (e) => {
			let t = new Map(this._seen.map((e) => [e.id, e])), n = Date.now();
			for (let r of e) t.set(r.id, r), this._later(ns - (n - r.at * 1e3));
			this._seen = [...t.values()].filter((e) => n - e.at * 1e3 < ns);
		});
	}
	_later(e) {
		if (e <= 0) return;
		let t = setTimeout(() => {
			this._timers.delete(t), this.requestUpdate();
		}, e + 1e3);
		this._timers.add(t);
	}
	_record(e, t) {
		let n = Date.now();
		this._chart = {
			room: e.name,
			at: n,
			records: {},
			fault: ""
		};
		let r = () => this._chart?.at === n;
		for (let e of t) Ao(this._hass, e, n).then((t) => r() && (this._chart = {
			...this._chart,
			records: {
				...this._chart.records,
				[e.id]: t
			}
		}), (t) => {
			console.error(`Dash-Bored: the history of ${e.id} could not be read`, t), r() && (this._chart = {
				...this._chart,
				fault: t?.message ?? String(t)
			});
		});
	}
	updated() {
		let e = this.renderRoot.querySelector("dialog");
		e && !e.open && e.showModal(), this._resized(this.clientWidth);
	}
	_moved(e) {
		this._want?.id === e.id && (this._want = void 0), this._armed === e.id && (this._armed = ""), this._code?.id === e.id && (this._code = void 0);
	}
	_spin(e, t, n) {
		let r = this._code?.id === e.id ? this._code.wheels : Array(is).fill(0);
		this._code = {
			id: e.id,
			wheels: r.map((e, r) => r === t ? e + n : e)
		}, clearTimeout(this._hiding), this._timers.delete(this._hiding), this._hiding = setTimeout(() => {
			this._timers.delete(this._hiding), this._code = void 0;
		}, as), this._timers.add(this._hiding);
	}
	_alarm(e) {
		let t = this._hass.states[e.id]?.attributes ?? {}, n = e.away ? "not answering" : e.phase === "triggered" ? "sounding" : e.phase ?? (e.on ? "set" : "unset"), { label: r, push: i, wheels: a } = this.kit, o = this._code?.id === e.id ? this._code.wheels : Array(is).fill(0), s = o.map(Qa).join(""), c = (t, n) => () => this._call({
			domain: Qo,
			service: t,
			ids: [e.id],
			data: s ? { code: s } : void 0
		}, `${bs(e)} (${n})`), l = rs.filter(([, e]) => t.supported_features & e), u = e.on || e.phase ? [i("Unset", c("alarm_disarm", "unset"))] : l.map(([e, , t]) => i(t, c(e, t.toLowerCase())));
		return M`<div class="alarm ${n}">
      ${r(`${e.name}: ${n}`)}
      ${t.code_format === "number" && !e.away ? a(e.name, o, (t, n) => this._spin(e, t, n)) : F}
      ${e.away ? F : M`<div class="pushes">${u}</div>`}
    </div>`;
	}
	_guarded(e, t, n) {
		if (t) return this._call(z(e), bs(e));
		if (this._armed === e.id) {
			if (!(n.detail === 0 || n.target.closest?.(".throw"))) return void (this._armed = "");
			this._call(z(e), bs(e));
		}
		this._armed = e.id, clearTimeout(this._dropping), this._timers.delete(this._dropping), this._dropping = setTimeout(() => {
			this._timers.delete(this._dropping), this._armed === e.id && (this._armed = "");
		}, cs), this._timers.add(this._dropping);
	}
	_turn(e, t) {
		this._want = {
			id: e.id,
			level: t
		}, clearTimeout(this._waiting), this._timers.delete(this._waiting), this._waiting = setTimeout(() => {
			this._timers.delete(this._waiting), this._grip || (this._want = void 0);
		}, fs), this._timers.add(this._waiting);
	}
	_dial(e) {
		let t = X(e) ? tn : void 0, { min: n, max: r, step: i, vote: a } = e.span, o = ts.has(e.kind) ? e.level ?? n : e.on ? e.level ?? r : n, s = () => this._want?.id === e.id ? this._want.level : o, c = (e) => +(Math.round(Math.min(r, Math.max(n, e)) / i) * i).toFixed(2);
		return {
			level: s(),
			turn: (s() - n) / (r - n) * 100,
			held: this._grip?.id === e.id,
			on: {
				down: (t) => {
					t.currentTarget.setPointerCapture(t.pointerId), this._grip = {
						id: e.id,
						level: s(),
						angle: xs(t),
						x: t.clientX,
						y: t.clientY,
						at: t.clientY,
						moved: !1
					};
				},
				move: (t) => {
					let i = this._grip;
					if (i?.id !== e.id || (i.moved ||= Math.hypot(t.clientX - i.x, t.clientY - i.y) > us, !i.moved)) return;
					let a = t.currentTarget, o = a.classList.contains("slide") ? (i.at - t.clientY) / a.getBoundingClientRect().height : void 0;
					i.at = t.clientY;
					let s = xs(t), l = (s - i.angle + 540) % 360 - 180;
					i.angle = s, i.level = Math.min(r, Math.max(n, i.level + (o ?? l / ls) * (r - n))), this._turn(e, c(i.level));
				},
				up: () => {
					let n = this._grip;
					this._grip = void 0, n?.id === e.id && (n.moved && this._want ? this._ask(e, this._want.level, t) : t || this._call(z(e), bs(e)));
				},
				drop: () => {
					this._grip = this._want = void 0;
				},
				key: (n) => {
					let r = {
						ArrowUp: a,
						ArrowRight: a,
						ArrowDown: -a,
						ArrowLeft: -a
					}[n.key];
					if (r) {
						n.preventDefault();
						let i = c(s() + r);
						this._turn(e, i), this._ask(e, i, t);
					} else !t && (n.key === "Enter" || n.key === " ") && (n.preventDefault(), this._call(z(e), bs(e)));
				}
			}
		};
	}
	_throw(e) {
		this._close(e.id, {
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.full);
	}
	_close(e, t, n) {
		this._call(t, n), this._thrown = e;
		let r = setTimeout(() => {
			this._timers.delete(r), this._thrown === e && (this._thrown = "");
		}, ds);
		this._timers.add(r);
	}
	_lenses(e) {
		let t = e.filter(X), n = new Set(e.map((e) => e.id)), r = t.flatMap((e) => e.controls ?? []).filter((e, t, r) => !n.has(e.id) && r.findIndex((t) => t.id === e.id) === t);
		return {
			zooms: t.filter((e) => e.zoom && !e.away),
			turned: t.filter((e) => e.presets?.length),
			switches: r.flatMap((e) => e.device ? [e.device] : []),
			pressed: r.filter((e) => !e.device)
		};
	}
	_zoom(e) {
		let { level: t, span: n } = e.zoom, r = this._dial({
			...e,
			id: e.zoom.id,
			name: `${e.name} zoom`,
			level: t,
			span: n
		});
		return this.kit.knob(`${e.name} zoom`, "", "zoom", r.turn, r.held, `zoom ${r.level}`, "", r.on, [n.min, n.max]);
	}
	_presets(e) {
		let t = e.presets, n = ys(t.length);
		return n.map((r, i) => {
			let a = t.slice(i * n[0], i * n[0] + r);
			return Xo(`${e.name} presets`, a.map((e) => e.name), a.findIndex((t) => t.name === this._turned[e.id]), (t) => {
				this._call(nn(a[t]), `${bs(e)} to ${a[t].name}`), this._turned = {
					...this._turned,
					[e.id]: a[t].name
				};
			}, e.name);
		});
	}
	_pressed(e, t) {
		return this.kit.knife(e.away ? `${e.name}: not answering` : e.name, this._thrown === e.id, () => e.away || this._close(e.id, an(e), `${t} ${e.name}`));
	}
	_shows(e) {
		return e.devices.filter((e) => !(gs(e) && this._hass.states[e.id]?.attributes.code_format === "text"));
	}
	_sights() {
		let e = Date.now(), t = /* @__PURE__ */ new Map();
		for (let n of this._survey ? Yt(this._survey, this._seen) : []) e - n.at < ns && n.at >= (t.get(n.camera)?.at ?? 0) && t.set(n.camera, n);
		return t;
	}
	_knob(e) {
		let t = this._dial(e), [n, r] = es[e.kind], i = Et.has(e.kind), a = i ? e.on ? `${e.name} ${t.level}°` : `${e.name}: off` : e.kind === "humidifier" ? `${e.name} ${t.level}%` : e.name, o = e.title ?? (i && e.temp !== void 0 ? `now ${e.temp}°` : "");
		return this.kit.knob(a, n, r, t.turn, t.held, i ? `${t.level} degrees` : `${t.level} per cent`, o, t.on, [e.span.min, e.span.max], e.temp);
	}
	_dolly(e) {
		let { dolly: t } = this.kit, n = e.phase ? `${e.name}: ${e.phase}` : e.name, r = os[e.kind] ? `: ${os[e.kind][+!e.on]}` : "";
		if (!e.guarded) return t(n, e.on, e.away, () => e.away || this._call(z(e), bs(e)), "", r);
		let i = e.kind === "lock" ? !e.on : e.on, a = i || this._armed === e.id, o = i ? "press to shut it, which puts the switch back" : a ? "press the switch to throw it, or anywhere else to shut the guard" : "press to lift it";
		return t(n, i, e.away, (t) => e.away || this._guarded(e, i, t), a ? "up" : "shut", `${r}. Under a guard: ${o}`, ss[e.kind]);
	}
	_screen(e, t) {
		let n = t.get(e.id);
		return this.kit.tv(n ? `${e.name}: ${n.kind} ${V(n.at)}` : e.away ? `${e.name}: not answering` : e.name, n?.photo ?? (e.away ? "" : e.picture ?? ""), this._look(e.id));
	}
	_scenes(e) {
		return e.scenes.length === 1 ? this.kit.knife(e.scenes[0].name, this._thrown === e.scenes[0].id, () => this._throw(e.scenes[0])) : ys(e.scenes.length).map((t, n) => {
			let r = e.scenes.slice(n * ys(e.scenes.length)[0], n * ys(e.scenes.length)[0] + t), i = r.reduce((e, t, n) => t.at > (r[e]?.at ?? 0) ? n : e, -1), a = r.findIndex((e) => e.id === this._thrown);
			return Xo(`${e.name} scenes`, r.map((e) => e.name), a < 0 ? i : a, (e) => this._throw(r[e]));
		});
	}
	_load(e) {
		let t = this._shows(e), n = this._lenses(t);
		return {
			knobs: t.filter(hs).length + n.zooms.length,
			dollies: t.filter(_s).length + n.switches.length,
			alarms: t.filter(gs).length,
			tvs: t.filter(X).length,
			meter: e.temp !== void 0,
			knives: +(e.scenes.length === 1) + n.pressed.length,
			selectors: e.scenes.length > 1 ? ys(e.scenes.length) : [],
			presets: n.turned.flatMap((e) => ys(e.presets.length).map((e) => e + 1))
		};
	}
	_rooms(e, t, n, r = []) {
		let { label: i, meter: a, valve: o, push: s } = this.kit, c = e.filter((e) => this._shows(e).length || e.temp !== void 0 || e.scenes.length), l = n && c.some((e) => e.floor), u = (e) => l && c[e].floor !== c[e - 1]?.floor, d = c.map((e) => this._load(e)), f = JSON.stringify([
			this._cols,
			l,
			this._view,
			d,
			c.map((e) => e.floor)
		]);
		this._rows?.key !== f && (this._rows = {
			key: f,
			racks: Go(d, this._view === "room" ? [{
				wide: this._cols,
				first: !0,
				under: !1
			}] : Ko(d, this._cols, u))
		});
		let { racks: p } = this._rows, m = !this._lost, h = 1, g = (e) => {
			let n = this._shows(e), r = n.filter((e) => e.kind === "light" && !e.away), s = r.reduce((e, t) => e + (t.on ? t.level ?? 100 : 0), 0) / (r.length * 100 || 1), c = e.devices.length - n.length, l = n.filter((e) => !X(e)), u = this._lenses(n);
			return M`<section class="room">
        ${o(s ? .35 + s * .65 : 0)}${i(e.name)}
        <div class="works">${e.temp === void 0 ? F : a(`${e.temp.toFixed(1)}°`, 5, 30, e.temp, "°C", ++h, m)}
        ${u.pressed.map((t) => this._pressed(t, e.name))}${e.scenes.length ? this._scenes(e) : F}
        <div class="dials">${n.filter(hs).map((e) => this._knob(e))}${u.zooms.map((e) => this._zoom(e))}</div>
        <div class="dollies">${n.filter(_s).map((e) => this._dolly(e))}${u.switches.map((e) => this._dolly(e))}</div>
        ${n.filter(X).map((e) => this._screen(e, t))}${u.turned.map((e) => this._presets(e))}${n.filter(gs).map((e) => this._alarm(e))}</div>
        ${c ? M`<div class="more" title="An alarm whose code is not in digits is not on this panel.">${i(`and ${c} more`)}</div>` : F}
        ${l.length ? M`<button class="rec" aria-label="${e.name}: chart of the last day" @click=${() => this._record(e, l)}>${i("Chart")}</button>` : F}
      </section>`;
		}, _ = (e) => {
			let { row: t, column: n } = p[e], a = c[p[e].things[0]].floor, o = 0;
			for (let n = e; n < p.length && p[n].row === t && (n === e || !u(p[n].things[0])); n++) o += p[n].wide;
			return M`<div class="floor ${n > 1 ? "barred" : ""}" style="grid-row: ${t * 2 + 1}; grid-column: ${n} / span ${o}">${i(a ?? "Elsewhere")}${a ? M`<span class="pushes">${r.filter((e) => e.floor === a).map((e) => s(e.name, () => this._throw(e)))}</span>` : F}</div>
        ${n > 1 ? M`<i class="bar" style="grid-row: ${t * 2 + 1} / span 2; grid-column: ${n}"></i>` : F}`;
		}, v = (e) => !!p[e] && p[e].column > 1 && u(p[e].things[0]);
		return M`<div class="rooms" style="--cols: ${this._cols}">${p.map((e, t) => M`${u(e.things[0]) ? _(t) : F}<div class="bay ${e.blank ? "blanked" : ""} ${v(t) ? "barred" : ""} ${v(t + 1) ? "bars" : ""}" style="grid-row: ${e.row * 2 + 2}; grid-column: ${e.column} / span ${e.wide}">${e.things.map((e) => g(c[e]))}${e.blank ? vs : F}</div>`)}</div>`;
	}
	_lamps(e) {
		let { jewel: t, label: n } = this.kit, r = this._alerts.filter((e) => e.level !== mn).sort((e, t) => (gn[t.level] ?? 0) - (gn[e.level] ?? 0) || e.began - t.began);
		return r.length ? M`<div class="lamps">${r.map((e) => M`<div class="alert" role="status">${t(e.level)}${n(`${e.name}: ${e.message || e.level}, since ${V(e.began * 1e3)}`)}</div>`)}</div>` : e ? M`<div class="lamps"><div class="alert" role="status">${t(this._heard ? mn : "")}${n(this._heard ? "Sensor Watch: all well" : "Waiting for Sensor Watch")}</div></div>` : F;
	}
	_room(e) {
		return e[0] ? this._rooms(e.slice(0, 1), this._sights(), !1) : this.kit.label(this._config.rooms?.length ? "This room has nothing the Console can show" : "Choose a room in the card's options");
	}
	_instrument(e, t) {
		let { knife: n, label: r, meter: i } = this.kit, a = this._config.entity;
		if (!a) return r("Choose an entity in the card's options");
		let o = this._hass.states[a];
		if (!o) return r(`${a} is not in Home Assistant`);
		let s = e.find((e) => e.id === a);
		if (s && gs(s) && o.attributes.code_format === "text") return r(`${s.name}: its code is in words, and the Console has only thumbwheels for digits`);
		if (s) return X(s) ? this._screen(s, this._sights()) : gs(s) ? this._alarm(s) : hs(s) ? M`<div class="dials">${this._knob(s)}</div>` : M`<div class="dollies">${this._dolly(s)}</div>`;
		let c = t.find((e) => e.id === a);
		if (c) return M`<div class="knives">${n(c.name, this._thrown === a, () => this._throw(c))}</div>`;
		let l = o.attributes.friendly_name ?? a, u = o.attributes.device_class, d = o.attributes.unit_of_measurement ?? "", f = Number(o.state);
		if (u !== "power" && !ms[u]) return r(`${l}: the Console has no meter for this`);
		if (o.state === "" || !Number.isFinite(f)) return r(`${l}: not answering`);
		let p = [...a].reduce((e, t) => e + t.charCodeAt(0), 0), m = `${l}: ${o.state} ${d}`.trim();
		if (u !== "power") return i(m, ms[u][0], ms[u][1], f, ms[u][2], p, !this._lost);
		let h = d === "kW" ? f : f / 1e3;
		return i(m, 0, ps.find((e) => h <= e) ?? ps.at(-1), h, "kW", p, !this._lost);
	}
	_whole() {
		let { knife: e, meter: t, tv: n } = this.kit, r = this._house, i = this._sights(), a = new Set(r.rooms.flatMap((e) => e.devices.filter(X).map((e) => e.id))), o = !this._lost, s = new Set(r.rooms.map((e) => e.floor)), c = r.scenes.filter((e) => !e.floor || !s.has(e.floor));
		return M`${this._lamps(!1)}
      <div class="top">
        ${r.kw === void 0 ? F : t("Mains draw", 0, ps.find((e) => r.kw <= e) ?? ps.at(-1), r.kw, "kW", 0, o)}
        ${r.outside ? t("Outside air", -10, 30, r.outside.temp, "°C", 1, o) : F}
        ${[...i.values()].filter((e) => !a.has(e.camera)).map((e) => n(`${e.name}: ${e.kind} ${V(e.at)}`, e.photo ?? "", this._look(e.camera)))}
        ${c.length ? M`<div class="knives">${c.map((t) => e(t.name, this._thrown === t.id, () => this._throw(t)))}</div>` : F}
        <slot name="era"></slot>
      </div>
      ${this._rooms(r.rooms, i, !0, r.scenes)}`;
	}
	render() {
		let { DEFS: e, label: t, recorder: n } = this.kit, r = this._view, i = this._house, a = (n) => M`<div class="panel as-${r} ${r === "instrument" && this._config.backing === !1 ? "bare" : ""}" @click=${this._elsewhere}>
      ${e}
      ${this._lost ? M`<div class="warn"><span class="lamp"></span>${t(`No connection to Home Assistant since ${V(this._lost)}. What is shown is as it was then.`)}</div>` : F}
      ${this._fault ? M`<div class="warn"><span class="lamp"></span>${t(this._fault)}</div>` : F}
      ${n}
    </div>`;
		if (!this._hass) return a(t("Waiting for Home Assistant"));
		if (r === "lamps") return a(this._lamps(!0));
		if (!i) return a(t("Waiting for Home Assistant"));
		if (r === "instrument") return a(this._instrument(i.rooms.flatMap((e) => e.devices), Zt(i)));
		let o = i.rooms.find((e) => e.name === this._chart?.room), s = this._chart && o ? n(o.name, this._shows(o).filter((e) => !X(e)).map((e) => ({
			name: e.name,
			lo: e.span.min,
			hi: e.span.max,
			changes: this._chart.records[e.id]
		})), this._chart.at, this._chart.fault, () => this._chart = void 0) : F;
		return a(M`${r === "room" ? this._room(i.rooms) : this._whole()}${s}`);
	}
}, Cs = [b`
  /* The rooms stand on a grid of columns (--cols, as many as fit: panel.ts). A bay is some
     of them across, where balance.ts says (panel.ts places each by its row and column),
     and holds one chassis or a few small ones, one under another. The bays of a row are
     stretched to one height, as panels in a rack are. Where a bay's chassis are shorter
     than that by enough, they keep their own height and a blanking plate is fitted under
     them (.blanked: balance.ts says); otherwise they share what is spare. balance.ts
     counts on these sizes: change them together. */
  .rooms { display: grid; grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr)); column-gap: 12px; align-items: stretch; }
  .bay { display: flex; flex-direction: column; gap: 12px; min-width: 0; margin-bottom: 12px; }
  .room { flex: 1 1 auto; min-width: 0; align-content: start; }
  .blanked > .room { flex: 0 0 auto; }
  /* The plate is a chassis with nothing on it but a vent: its look is its era's chassis. */
  .blanked > .room.blank { flex: 1 1 0; display: flex; align-items: center; justify-content: center; min-height: 0; padding: 14px; overflow: hidden; }
  .blank::before, .blank::after { content: none; }
  .vent { display: block; width: min(64%, 240px); height: min(100%, 132px); border-radius: 5px;
    background: repeating-linear-gradient(rgba(0,0,0,.5) 0 5px, rgba(255,255,255,.1) 5px 6px, transparent 6px 13px); box-shadow: inset 0 0 0 1px rgba(0,0,0,.35); }
  /* A floor's plate, in the lane over the row its floor begins in, with a push button for
     each of the floor's own scenes beside it. */
  .floor { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 4px 18px; min-width: 0; margin: 6px 0; }
  /* The bar between two floors that share a row: on the panel itself, between their
     chassis, from the plate down. The bay before it (.bars) and the floor it begins
     (.barred) each stand 17 px off, so that the bar has 20 px of panel on each side
     (owner, 2026-11-16: twice the 10 px it had). An era may make it of its own stuff. */
  .barred { padding-left: 17px; }
  .bars { padding-right: 17px; }
  .bar { position: relative; justify-self: start; width: 6px; margin: 6px 0 12px -9px; border-radius: 3px; background: currentColor; opacity: .4; }
  /* A room's one scene has a knife switch among its controls. An open blade stands well above its switch. */
  .works > .knife { flex: 0 0 130px; min-height: 124px; margin-top: 38px; }

  /* A card for one room, one instrument or the lamps is no page: no page's height, and a narrower margin. */
  .panel.as-room, .panel.as-instrument, .panel.as-lamps { min-height: 0; padding: 12px; }
  .as-instrument { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 8px; }
  .as-instrument > .warn { flex-basis: 100%; }
  .as-lamps .lamps { margin-bottom: 0; }
  /* An instrument with no backing stands on the dashboard's own card, and its lettering is
     in the dashboard's colour where its era doesn't print it on a plate of its own. */
  .panel.bare { padding: 0; background: none; box-shadow: none; border: 0; }
  :where(.bare) .label { color: var(--primary-text-color); }
`, Zo], ws = "dash-bored-bakelite", Ts = class extends Ss {
	constructor(...e) {
		super(...e), this.kit = {
			...$a,
			recorder: To
		};
	}
	static {
		this.styles = [
			W,
			Cs,
			Eo
		];
	}
	connectedCallback() {
		super.connectedCallback(), Mn("Dash-Bored Hand", "HomemadeApple-Regular.ttf");
	}
}, Es = (e, t) => {
	let n = (t - 90) * Math.PI / 180;
	return [(60 + e * Math.cos(n)).toFixed(1), (96 + e * Math.sin(n)).toFixed(1)];
}, Ds = 33, Os = N`<path class="scale" d="M${Es(80, -33)} A80,80 0 0 1 ${Es(80, Ds)}"/><path class="over" d="M${Es(77.5, Ds * .6)} A77.5,77.5 0 0 1 ${Es(77.5, Ds)}"/>
  ${Array.from({ length: 21 }, (e, t) => N`<path class="scale" d="M${Es(t % 5 ? 77 : 74, -33 + t * Ds * .1)} L${Es(80, -33 + t * Ds * .1)}"/>`)}`;
function ks(e, t, n, r, i, a, o, s) {
	let c = Math.min(1, Math.max(0, (r - t) / (n - t))), l = [
		0,
		1,
		2,
		3,
		4
	].map((e) => {
		let [r, i] = Es(68, -33 + e * Ds * .5);
		return N`<text x=${r} y=${Number(i) + 2}>${+(t + (n - t) * e / 4).toFixed(1)}</text>`;
	});
	return M`<div class="meter ${o ? "" : "unlit"}">
    <div class="win" role="img" aria-label="${e}: ${r} ${i}">
      <svg class="face" viewBox="0 0 120 70" aria-hidden="true">${Os}${l}<text class="unit" x="60" y="52">${i}</text></svg>
      <div class="needle" style="transform: rotate(${(-33 + 66 * c).toFixed(1)}deg)"><svg class="waver" viewBox="0 0 120 70" aria-hidden="true" style="animation-duration: ${Xa[a % Xa.length] * 16}ms"><path d="M60,96 V19"/></svg></div>
      <i class="cowl"></i>
    </div>
    ${s}
  </div>`;
}
//#endregion
//#region src/dash-bored/console/figures.ts
var As = {
	0: "abcdef",
	1: "bc",
	2: "abged",
	3: "abgcd",
	4: "fgbc",
	5: "afgcd",
	6: "afgedc",
	7: "abc",
	8: "abcdefg",
	9: "abcdfg",
	"-": "g"
};
function js(e, t, n, r = +(t === "°")) {
	let i = Math.max(...n.map((e) => String(Math.trunc(Math.abs(e))).length)) + +(n[0] < 0), a = i + (r ? 1 + r : 0), o = " ".repeat(i) + (r ? "." + " ".repeat(r) : "");
	return (e === "" ? o : Number(e).toFixed(r).padStart(a, " ")) + t;
}
function Ms(e, t, n) {
	let r = /^(.*?) (-?[\d.]+)([°%])$/.exec(e), i = t === "heat" ? /^(.*): off$/.exec(e) : null;
	return {
		legend: r?.[1] ?? i?.[1] ?? e,
		shown: r ? js(r[2], r[3], n) : i ? js("", "°", n) : void 0,
		lit: !!r
	};
}
var Ns = (e, t = !0, n = e.trim()) => M`<span class="figs ${t ? "" : "dark"}" role="img" aria-label=${n}>${[...e].map((e) => e === "." ? M`<i class="dp"></i>` : e === "°" ? M`<i class="deg"></i>` : e === "%" ? M`<i class="pc">%</i>` : M`<i class="d">${[..."abcdefg"].map((n) => M`<b class="s${n} ${t && As[e]?.includes(n) ? "lit" : ""}"></b>`)}</i>`)}</span>`, Ps = Array.from({ length: 20 }, (e, t) => t);
function Fs(e, t, n, r, i, a, o) {
	let s = Math.round(Math.min(1, Math.max(0, (r - t) / (n - t))) * 20);
	return M`<div class="meter display ${a ? "" : "unlit"}">
    <div class="win" role="img" aria-label="${e}: ${r} ${i}">${Ns(js(a ? String(r) : "", "", [t, n], i === "kW" ? 2 : 1), a, "")}<span class="unit">${i}</span>
      <div class="sweep">${Ps.map((e) => M`<i class="${a && e < s ? "lit" : ""} ${a && e === s - 1 ? "tip" : ""}"></i>`)}</div></div>
    ${o}
  </div>`;
}
var Is = (e, t, n) => M`<div class="wheels" role="group" aria-label="${e} code">${t.map((e, t) => M`<div class="wheel">
    <button aria-label="Figure ${t + 1} on" @click=${() => n(t, 1)}></button>
    ${Ns(Qa(e) || " ", !0, `Figure ${t + 1}: ${Qa(e) || "blank"}`)}
    <button aria-label="Figure ${t + 1} back" @click=${() => n(t, -1)}></button>
  </div>`)}</div>`, Ls = b`
  .figs { --t: 2px; --h: 6px; --w: 10px; display: inline-flex; align-items: flex-end; }
  .display .figs { --t: 3px; --h: 11px; --w: 17px; }
  .d { position: relative; width: var(--w); height: calc(2 * var(--h) + 3 * var(--t)); margin: 0 2px; transform: skewX(-5deg); }
  .d b { position: absolute; border-radius: 1px; background: var(--seg-off); } .d .lit { background: var(--seg-on); box-shadow: var(--seg-glow, none); }
  .sa, .sg, .sd { left: var(--t); right: var(--t); height: var(--t); } .sa { top: 0; } .sg { top: calc(var(--t) + var(--h)); } .sd { bottom: 0; }
  .sf, .sb, .se, .sc { width: var(--t); height: var(--h); } .sf, .sb { top: var(--t); } .se, .sc { bottom: var(--t); } .sf, .se { left: 0; } .sb, .sc { right: 0; }
  .dp { width: var(--t); height: var(--t); margin: 0 1px; border-radius: 50%; background: var(--seg-on); }
  .deg { align-self: flex-start; width: calc(var(--t) * 3); height: calc(var(--t) * 3); margin-left: 1px; border: var(--t) solid var(--seg-on); border-radius: 50%; }
  .pc { margin-left: 2px; color: var(--seg-on); font: 600 9px/1 "Helvetica Neue", Arial, sans-serif; }
  .dark .dp, .dark .deg, .dark .pc { opacity: .1; }
  .sweep { display: flex; align-items: flex-end; justify-content: center; gap: 2px; width: 100%; }
  .sweep i { width: 4px; background: var(--seg-on); opacity: .1; } .sweep .lit { opacity: 1; }
  .sweep i:nth-child(-n + 5) { height: 5px; } .sweep i:nth-child(n + 6) { height: 8px; } .sweep i:nth-child(n + 11) { height: 11px; } .sweep i:nth-child(n + 16) { height: 14px; }
`, Rs = /* @__PURE__ */ t({
	DEFS: () => zs,
	dolly: () => Ws,
	figs: () => Ns,
	jewel: () => Hs,
	knife: () => qs,
	knob: () => Gs,
	label: () => Z,
	meter: () => Vs,
	push: () => Ks,
	tv: () => mo,
	valve: () => Us,
	wheels: () => Is
}), zs = M``, Z = (e) => M`<span class="label">${e}</span>`, Bs = Array.from({ length: 10 }, (e, t) => t);
function Vs(e, t, n, r, i, a = 0, o = !0) {
	return a >= 2 && a % 3 == 1 ? Fs(e, t, n, r, i, o, Z(e)) : ks(e, t, n, r, i, a, o, Z(e));
}
var Hs = (e) => M`<span class="jewel ${e}" aria-hidden="true"></span>`, Us = (e) => {
	let t = e ? Math.max(1, Math.round((e - .35) / .65 * 10)) : 0;
	return M`<div class="leds" role="img" aria-label="Lights: ${t} of 10">${Bs.map((e) => M`<span class=${e < t ? "on" : ""}></span>`)}</div>`;
}, Ws = (e, t, n, r, i = "", a = "", o = ["On", "Off"]) => M`<button class="dolly ${t ? "on" : ""} ${n ? "away" : ""} ${i}" aria-pressed=${t} aria-label=${n ? `${e}: not answering` : e + a} @click=${r}>
  <span class="soft"><span class="throw"><i class="pilot"></i></span>${i ? M`<i class="flap"></i>` : F}</span>
  ${Z(e)}
</button>`, Gs = (e, t, n, r, i, a, o, s, c = [0, 100], l) => {
	let { legend: u, shown: d, lit: f } = Ms(e, t, c), p = Math.round(r / 10), m = o || t === "sound", h = (o, c) => M`<div class="${o} ${t} ${i ? "drag" : ""}" role="slider" tabindex="0" aria-orientation=${o === "slide" ? "vertical" : F} aria-label="${e} ${n}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(r)} aria-valuetext=${a} style="--lvl: ${r.toFixed(1)}"
    @pointerdown=${s.down} @pointermove=${s.move} @pointerup=${s.up} @pointercancel=${s.drop} @keydown=${s.key}>${c}</div>`;
	return M`<div class="dial ${t}">
    <div class="dimmer">${t === "heat" ? h("knob", M`<span class="mark"></span>`) : M`<div class="ladder ${t}" aria-hidden="true">${Bs.map((e) => M`<i class=${e < p ? "lit" : ""}></i>`)}</div>${h("slide", M`<i class="cap"></i>`)}`}</div>
    ${Z(u)}${d === void 0 ? F : Ns(d, f)}${m ? M`<span class="note">${o ? Z(o) : F}</span>` : F}
  </div>`;
}, Ks = (e, t) => M`<button class="push" @click=${t}><span class="key">${e}</span></button>`, qs = (e, t, n) => M`<button class="knife ${t ? "closed" : ""}" @click=${n}><i class="bar"></i><span class="key"></span>${Z(e)}</button>`, Js = 96, Ys = 6, Xs = 6, Zs = 36e5;
function Qs(e, t = Js) {
	let n = Array(t).fill(void 0);
	for (let r of e) for (let e = 0; e + 1 < r.length; e += 2) {
		let [i, a] = r[e], o = r[e + 1][0];
		for (let e = Math.max(0, Math.ceil(i * t - .5)); e < t && (e + .5) / t < o; e++) n[e] = a;
	}
	return n;
}
function $s(e, t, n, r, i) {
	let a = n - 24 * Zs, o = Math.ceil(a / Zs) * Zs, s = Array.from({ length: 24 }, (e, t) => o + t * Zs).filter((e) => e <= n && new Date(e).getHours() % 3 == 0);
	return M`<dialog class="recorder" aria-label="${e}: the last day" @close=${i} @click=${(e) => e.target === e.currentTarget && i()}>
    ${Z(`${e}: the last day`)}
    ${r ? M`<div class="warn"><span class="lamp"></span>${Z(`The record could not be read (${r}).`)}</div>` : F}
    <div class="analyser" role="img" aria-label="When each device in ${e} was on">
      ${t.map((e) => M`<div class="lane"><span class="name">${e.name}</span>
          ${e.changes ? M`<span class="columns">${Qs(yo(e.changes, a, n, e.lo, e.hi)).map((e) => M`<i class=${e === void 0 ? "gap" : ""} style="--n: ${Math.round((e ?? 0) * Xs)}"></i>`)}</span>` : M`<span class="columns reading">${r ? "" : "reading…"}</span>`}</div>`)}
      <div class="lane hours"><span class="name"></span><span class="columns">${s.map((e) => M`<b style="left: ${((e - a) / (n - a) * Js * Ys).toFixed(0)}px">${String(new Date(e).getHours()).padStart(2, "0")}</b>`)}</span></div>
    </div>
    ${Ks("Close", i)}
  </dialog>`;
}
//#endregion
//#region src/dash-bored/console/bargraph/styles.ts
var ec = b`
  .panel { --vfd: #7df7e6; --amber: #ff7a1a; --ink: #e8e8e8; --glass: #04100f; --seg-on: var(--vfd); --seg-off: rgba(125,247,230,.07); --seg-glow: 0 0 5px rgba(125,247,230,.8); box-sizing: border-box; min-height: 100%; padding: 18px 22px; color: var(--ink);
    font-family: "Helvetica Neue", "Arial Narrow", Arial, sans-serif; background: #070708; }
  .panel * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; overflow: visible; }
  /* A legend: fine white capitals printed on the black. */
  .label { display: inline-block; max-width: 100%; font-size: 9.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; overflow-wrap: anywhere; }

  /* What must never be missed: a lost connection, a refused action. A red LED and a line of print. */
  .warn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .warn .label { font-size: 12px; letter-spacing: .06em; text-transform: none; }
  .lamp { flex: none; width: 10px; height: 10px; border-radius: 50%; background: #ff3a2a; box-shadow: 0 0 8px #ff3a2a; }

  /* A separate: a brushed black front. */
  .room, .knives, .top > .meter, .top > .tv, .lamps { border-radius: 2px; background: repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px), linear-gradient(180deg, #252628, #131415);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.16), inset 0 -1px 0 #000, 0 2px 5px #000; }
  .top { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 14px; }
  .top > .meter { flex: 0 1 190px; padding: 10px 10px 8px; }
  .floor .label { font-size: 12px; font-style: italic; letter-spacing: .24em; color: var(--amber); }
  /* A chassis is some of the panel's columns across (views.ts lays the rooms out, and
     balance.ts chooses). Its lights are at its top left and its name at its top right, over an orange line. */
  .room { display: grid; grid-template-columns: auto 1fr; align-items: center; padding: 12px 10px 14px; text-align: center; }
  .room > .label { justify-self: end; font-size: 13px; font-style: italic; letter-spacing: .2em; text-align: right; }
  .room > :not(.leds, .label) { grid-column: 1 / -1; }
  /* Every control is fixed to the panel: it hangs from the top of its row and keeps the
     same height whatever its legend says, so a name that grows or a setting that changes
     moves nothing (owner, 2026-11-15). */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px 6px; margin-top: 9px; padding-top: 4px; border-top: 1px solid var(--amber); }
  .works > .meter { flex: 0 1 150px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .7; }
  .more .label, .rec .label { font-size: 8.5px; letter-spacing: .12em; }
  .rec { justify-self: center; margin-top: 10px; padding: 2px 10px; border: 1px solid #8a8a8a; border-radius: 10px; }
  .rec:focus-visible, .push:focus-visible .key, .knife:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* A room's lights: ten LEDs, green then amber then red. */
  .leds { display: flex; gap: 2px; padding: 4px 5px; border: 1px solid #333; background: #000; }
  .leds span { width: 5px; height: 12px; background: #35e35a; opacity: .14; transition: opacity .4s; }
  .leds span:nth-child(n + 7) { background: #ffc21a; } .leds span:nth-child(n + 9) { background: #ff3a2a; }
  .leds .on { opacity: 1; }

  /* Meters. A needle meter's face is still, and its needle is a layer of its own over it:
     the swing to a new reading and the waver are transforms of that layer, which the
     browser moves without drawing anything again. The needle wavers a quarter as far as
     Bakelite's (owner, 2026-11-15: the wobble falls by a quarter with each decade). */
  .meter { text-align: center; }
  .meter > .label { margin-top: 6px; }
  .win { position: relative; overflow: hidden; aspect-ratio: 120 / 70; max-width: 100%; border: 1px solid #3a3b3d; border-radius: 2px; background: radial-gradient(ellipse at 50% 130%, #6b5216, #17130a 70%); box-shadow: inset 0 0 12px #000; }
  .unlit .win { background: #121110; }
  .face { width: 100%; height: 100%; }
  .scale { fill: none; stroke: #f3ead0; stroke-width: .4; } .over { fill: none; stroke: #ff4a2a; stroke-width: 1.4; }
  .face text { fill: #f3ead0; font-size: 5.6px; text-anchor: middle; } .face .unit { font-size: 6px; letter-spacing: .1em; }
  .unlit .face { opacity: .45; }
  .needle { position: absolute; inset: 0; transform-origin: 50% 137.14%; transition: transform 1.1s cubic-bezier(.3, 1.5, .5, 1); }
  .waver { width: 100%; height: 100%; transform-origin: 50% 137.14%; animation: waver 1.2s ease-in-out infinite; }
  .waver path { stroke: #ff8a2a; stroke-width: .4; }
  @keyframes waver { 0% { transform: rotate(0deg); } 14% { transform: rotate(.125deg); } 29% { transform: rotate(-.075deg); } 43% { transform: rotate(.175deg); } 57% { transform: rotate(-.15deg); } 71% { transform: rotate(.05deg); } 86% { transform: rotate(-.1deg); } }
  .cowl { position: absolute; left: 0; right: 0; bottom: 0; height: 9%; background: #000; }
  /* The fluorescent display that every third room has for its meter. */
  .display .win { display: flex; flex-wrap: wrap; align-items: center; align-content: center; justify-content: center; gap: 5px 6px; background: var(--glass); }
  .display .unit { align-self: flex-end; margin-bottom: 4px; color: var(--vfd); font-size: 11px; font-weight: 600; text-shadow: 0 0 5px var(--vfd); }
  .display.unlit .unit { opacity: .12; text-shadow: none; }
  /* The fluorescent figures and the sweep (../figures.ts): the sweep's segments lean, and its last four are red. */
  ${Ls}
  .sweep i { transform: skewX(-12deg); } .sweep i:nth-child(n + 17) { background: #ff6a3a; }
  /* The last lit segment flickers now and then: all that is left of a needle's waver. */
  .sweep .tip { animation: tip 5.3s steps(1) infinite; }
  @keyframes tip { 0%, 73%, 89% { opacity: 1; } 71% { opacity: .4; } 88% { opacity: .6; } }

  /* Alerts: an LED, and what is wrong on a dot-matrix fluorescent line. A critical one flashes. */
  .lamps { display: flex; flex-wrap: wrap; gap: 10px 24px; margin-bottom: 14px; padding: 10px 12px; }
  .alert { display: flex; align-items: center; gap: 9px; max-width: 100%; }
  .jewel { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--glow); box-shadow: 0 0 7px var(--glow); }
  .jewel.nominal { --glow: #4fdc4f; } .jewel.task { --glow: #e8e8e8; } .jewel.warning { --glow: #ffc21a; } .jewel.error, .jewel.critical { --glow: #ff3a2a; }
  .jewel.critical { animation: flash 1s steps(2, jump-none) infinite; }
  @keyframes flash { 0% { opacity: .25; } 100% { opacity: 1; } }
  .alert .label { position: relative; padding: 5px 9px; border: 1px solid #333; background: var(--glass); color: var(--vfd); font: 700 13px/1.3 Menlo, "Courier New", monospace; letter-spacing: .1em; text-shadow: 0 0 5px var(--vfd); }
  /* The letters are made of dots: dark lines across them, both ways. */
  .alert .label::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgba(4,16,15,.5) .6px, transparent .6px) 0 0 / 100% 2.6px, linear-gradient(90deg, rgba(4,16,15,.5) .6px, transparent .6px) 0 0 / 2.6px 100%; }

  /* A fader for each level, in a slot with a scale each side, and its ladder of LEDs. The
     fader's element is as tall as its cap travels; the slot and the cap overhang it. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; min-height: 152px; }
  .dial.heat { min-height: 174px; }
  .dial.sound .note { height: 42px; overflow: hidden; }
  .dimmer { position: relative; display: flex; justify-content: center; gap: 8px; width: 104px; height: 104px; margin: 8px auto 6px; }
  .ladder { display: flex; flex-direction: column-reverse; justify-content: center; gap: 2px; }
  .ladder i { width: 8px; height: 8px; background: var(--amber); opacity: .14; } .ladder .lit { opacity: 1; }
  /* A blind's ladder is green, a player's ivory and a fan's blue-green. */
  .ladder.wind i { background: #35e35a; } .ladder.sound i { background: #f3ead0; } .ladder.air i { background: var(--vfd); }
  .slide { position: relative; width: 34px; height: 82px; margin: 11px 0; cursor: ns-resize; touch-action: none; }
  .slide::before { content: ""; position: absolute; inset: -11px 0; border-radius: 2px;
    background: linear-gradient(90deg, transparent 14px, #000 14px 20px, transparent 20px), repeating-linear-gradient(0deg, #8a8a8a 0 1px, transparent 1px 9px) 0 11px / 8px 83px no-repeat, repeating-linear-gradient(0deg, #8a8a8a 0 1px, transparent 1px 9px) 100% 11px / 8px 83px no-repeat; }
  .cap { position: absolute; left: 4px; right: 4px; bottom: calc(var(--lvl, 0) * 1% - 11px); height: 22px; border-radius: 2px; background: linear-gradient(180deg, #5a5b5e, #2a2b2d 42%, #f4f4f4 42% 56%, #232426 56%, #0f0f10);
    box-shadow: 0 4px 5px #000, inset 0 1px 0 rgba(255,255,255,.35); transition: bottom .3s; }
  .drag .cap { transition: none; }
  .slide:focus-visible, .knob:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  /* The heating's knob. Its ring of LEDs is lit as far as it is turned; its body, and the
     light on it, stay where they are, and only its line turns. */
  .knob { position: relative; width: 66px; height: 66px; margin: 19px 0; border-radius: 50%; cursor: grab; touch-action: none; }
  .knob::before { content: ""; position: absolute; inset: -12px; border-radius: 50%; background: conic-gradient(from 225deg, var(--amber) 0 calc(var(--lvl, 0) * 2.7deg), #3a2410 0 270deg, transparent 0);
    -webkit-mask: radial-gradient(circle, transparent 0 60%, #000 61% 68%, transparent 69%), repeating-conic-gradient(from 225deg, #000 0 9deg, transparent 9deg 15deg); -webkit-mask-composite: source-in; mask-composite: intersect; }
  .knob::after { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #4d4e51, #0d0d0e 70%); box-shadow: 0 5px 8px #000, inset 0 1px 0 rgba(255,255,255,.25); }
  .mark { position: absolute; inset: 3px; z-index: 1; border-radius: 50%; transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .drag .mark { transition: none; }
  .mark::after { content: ""; position: absolute; left: 50%; top: 6%; width: 2px; height: 22%; margin-left: -1px; background: var(--amber); }
  .dial > .figs { margin-top: 5px; padding: 4px 6px; border: 1px solid #333; background: var(--glass); }
  .dial > .figs, .note { display: flex; width: fit-content; margin-left: auto; margin-right: auto; }
  .note { margin-top: 4px; } .note .label { font-size: 8px; letter-spacing: .08em; text-transform: none; opacity: .8; }

  /* A soft-touch key with an LED in its corner. A button centres what is in it: the key
     is pinned to the top instead, with its legend under it. */
  .dolly { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 92px; min-height: 100px; margin-top: 10px; text-align: center; }
  .soft { position: relative; flex: none; margin: 12px 0 9px; }
  .throw { display: block; width: 54px; height: 26px; border-radius: 3px; background: linear-gradient(180deg, #414245, #1c1d1f); box-shadow: inset 0 1px 0 rgba(255,255,255,.28), 0 2px 3px #000; }
  .dolly:active .throw { background: linear-gradient(180deg, #2c2d30, #17181a); }
  .pilot { position: absolute; left: 6px; top: 5px; width: 9px; height: 4px; background: #4a0f0a; transition: background .15s; }
  .dolly.on .pilot { background: #ff3a2a; box-shadow: 0 0 6px #ff3a2a; }
  /* A guard over a key that must not be pressed by accident: a flap of smoked perspex,
     hinged at its top and lifted by the first press. Lifted, it takes no presses: in
     WebKit a cover folded small still took them, and the key under it could not be pressed. */
  .flap { position: absolute; inset: -5px -6px; border: 1px solid rgba(255,255,255,.3); border-radius: 2px; background: linear-gradient(120deg, rgba(255,255,255,.22), rgba(70,50,30,.6) 30%, rgba(40,28,18,.7)); transform-origin: top; transition: transform .18s; }
  .dolly.up .flap { transform: scaleY(.14); pointer-events: none; }
  .dolly .label { font-size: 8px; letter-spacing: .1em; }
  .dolly.away { cursor: default; } .dolly.away .soft { opacity: .45; } .dolly.away .pilot { background: #222; box-shadow: none; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible .throw { outline: 2px solid var(--ink); outline-offset: 3px; }

  /* An alarm: how it stands, a fluorescent figure for each place of its code with a key over and under it, and its keys. */
  .alarm { flex: 0 1 140px; display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 10px; }
  .alarm > .label { display: flex; align-items: center; justify-content: center; width: 132px; min-height: 33px; }
  .alarm.sounding > .label { color: #ff3a2a; }
  .wheels { display: flex; gap: 3px; }
  .wheel { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .wheel button { width: 18px; height: 13px; border: 1px solid #777; border-radius: 7px; color: #ccc; font-size: 10px; line-height: 11px; text-align: center; }
  .wheel button:first-of-type::after { content: "+"; } .wheel button:last-of-type::after { content: "−"; }
  .wheel button:active, .push:active .key { background: #2c2d30; }
  .wheel button:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
  .wheel .figs { padding: 3px 1px; background: var(--glass); }
  .pushes { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .push .key { display: block; min-width: 40px; padding: 4px 8px; border: 1px solid #999; border-radius: 11px; font-size: 8.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; text-align: center; }

  /* A camera: a small colour monitor in a black case, with lines across its picture. The
     tube's height is set by padding, not an aspect ratio, which grew without end in WebKit. */
  .tv { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex: 0 1 150px; min-height: 146px; margin-top: 10px; text-align: center; }
  .tube { display: block; position: relative; flex: none; align-self: stretch; height: 0; padding-top: calc((100% - 12px) * .75); margin: 0 6px 7px; overflow: hidden; border-radius: 6px; background: #0a0d0f; box-shadow: 0 0 0 7px #101011, 0 0 0 8px #3a3b3d; }
  .tube img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; }
  .tube::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,.2) 0 1px, transparent 1px 3px); }
  .top > .tv { flex-basis: 170px; margin-top: 0; padding: 18px 10px 8px; }
  .tv:focus-visible .tube { outline: 2px solid var(--ink); outline-offset: 9px; }

  /* Scenes: a tuner's presets, numbered as they come, each with a bar that lights when it is pressed. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 10px; align-items: flex-end; padding: 12px; counter-reset: preset; }
  .knife { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 66px; text-align: center; counter-increment: preset; }
  .bar { width: 26px; height: 3px; background: #4a2408; transition: background .1s; }
  .knife.closed .bar { background: var(--amber); box-shadow: 0 0 6px var(--amber); }
  .knife .key { display: block; width: 100%; height: 24px; border: 1px solid #555; border-radius: 12px; font: 600 12px/22px "Helvetica Neue", Arial, sans-serif; }
  .knife .key::after { content: counter(preset); }
  .knife:active .key { background: #2c2d30; }

  /* The recorder: a room's day on a spectrum analyser. Each device has a row of columns,
     a quarter of an hour each and six segments tall, lit as high as it stood. It scrolls
     sideways where the screen is narrower than its day. */
  dialog.recorder { width: min(760px, 94vw); padding: 14px; border: 1px solid #3a3b3d; border-radius: 2px; color: #e8e8e8; text-align: center; font-family: "Helvetica Neue", "Arial Narrow", Arial, sans-serif;
    --vfd: #7df7e6; --glass: #04100f; --ink: #e8e8e8; background: linear-gradient(180deg, #252628, #131415); box-shadow: 0 20px 40px #000; }
  dialog.recorder::backdrop { background: rgba(0,0,0,.6); }
  dialog.recorder > .label { font-size: 12px; font-style: italic; letter-spacing: .2em; }
  .analyser { margin: 10px 0; padding: 10px; overflow-x: auto; border: 1px solid #333; background: var(--glass); text-align: left; }
  .lane { display: flex; align-items: flex-end; gap: 8px; width: max-content; margin-bottom: 6px; }
  .lane .name { flex: none; width: 96px; overflow: hidden; color: var(--vfd); font-size: 9px; letter-spacing: .08em; text-align: right; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
  .columns { position: relative; display: flex; gap: 1px; width: 576px; height: 17px; color: var(--vfd); font-size: 9px; }
  /* A column: its six segments dark, and over them as many lit as its --n. */
  .columns i { position: relative; flex: none; width: 5px; height: 17px; background: repeating-linear-gradient(to top, rgba(125,247,230,.1) 0 2px, transparent 2px 3px); }
  .columns i::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--n) * 3px); background: repeating-linear-gradient(to top, var(--vfd) 0 2px, transparent 2px 3px); }
  .columns .gap { background: none; }
  .hours .columns { height: 11px; } .hours b { position: absolute; top: 0; font-weight: 400; opacity: .7; transform: translateX(-50%); }

  @media (prefers-reduced-motion: reduce) { .waver, .jewel.critical, .sweep .tip { animation: none; } .needle, .cap, .mark { transition: none; } }
`, tc = "dash-bored-bargraph", nc = class extends Ss {
	constructor(...e) {
		super(...e), this.kit = {
			...Rs,
			recorder: $s
		};
	}
	static {
		this.styles = [
			W,
			Cs,
			ec
		];
	}
}, rc = /* @__PURE__ */ t({
	DEFS: () => ic,
	dolly: () => vc,
	jewel: () => pc,
	knife: () => Dc,
	knob: () => Tc,
	label: () => ac,
	meter: () => fc,
	push: () => Ec,
	readout: () => cc,
	tv: () => mo,
	valve: () => mc,
	wheels: () => go
}), ic = M`<svg class="defs" width="0" height="0" aria-hidden="true"><defs>
  <linearGradient id="chrome" x1="0" x2="1"><stop offset="0" stop-color="#6d7175"/><stop offset=".28" stop-color="#f4f6f7"/><stop offset=".5" stop-color="#a9adb1"/><stop offset=".72" stop-color="#e3e6e8"/><stop offset="1" stop-color="#55595d"/></linearGradient>
  <linearGradient id="nut" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f4f5"/><stop offset=".5" stop-color="#8d9195"/><stop offset="1" stop-color="#d5d8da"/></linearGradient>
  <linearGradient id="dial" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9fbf4"/><stop offset=".45" stop-color="#9fe3d2"/><stop offset="1" stop-color="#3f9d94"/></linearGradient>
  <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b9390"/><stop offset="1" stop-color="#565d5b"/></linearGradient>
  <linearGradient id="moulded" x1="0" x2="1"><stop offset="0" stop-color="#a51013"/><stop offset=".2" stop-color="#f0322e"/><stop offset=".55" stop-color="#d81b1d"/><stop offset=".85" stop-color="#b01316"/><stop offset="1" stop-color="#8a0c0f"/></linearGradient>
  <radialGradient id="lens" cx=".4" cy=".35"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs></svg>`, ac = (e) => M`<span class="label" role="img" aria-label=${e}>${e.split(" ").map((e, t) => M`<span class="word">${[...e].map((e, n) => {
	let r = e.charCodeAt(0) * 31 + n * 17 + t * 7;
	return M`<i style="--y: ${((r % 11 - 5) * .22).toFixed(2)}px; --r: ${((r % 7 - 3) * .55).toFixed(2)}deg">${e}</i>`;
})}</span> `)}</span>`, oc = "#3a0d0a", sc = {
	a: "M2.5,1 H7.5",
	b: "M9,2.5 V8",
	c: "M9,10 V15.5",
	d: "M2.5,17 H7.5",
	e: "M1,10 V15.5",
	f: "M1,2.5 V8",
	g: "M2.5,9 H7.5"
};
function cc(e, t = !0) {
	let n = 3, r = t ? "#ff3a22" : oc, i = [...e.replace("%", "")].map((e) => {
		let t = n;
		return e === "." ? (n += 4, N`<circle cx=${t} cy="17" r="1" fill=${r}/>`) : (n += 12, e === "°" ? N`<path d="M${t + 1},1 h4 v4 h-4 z" fill="none" stroke=${r} stroke-width="1.3"/>` : N`<g transform="translate(${t} 0)" stroke-width="1.7" stroke-linecap="round">${Object.entries(sc).map(([t, n]) => N`<path d=${n} stroke=${As[e]?.includes(t) ? r : oc}/>`)}</g>`);
	});
	return M`<svg class="readout" viewBox="0 -3 ${n + 2} 24" height="22" role="img" aria-label=${e}><rect x="0" y="-3" width=${n + 2} height="24" rx="2" fill="#160504"/>${i}</svg>`;
}
var lc = (e, t) => {
	let n = (t - 90) * Math.PI / 180;
	return `${(60 + e * Math.cos(n)).toFixed(1)},${(74 + e * Math.sin(n)).toFixed(1)}`;
}, uc = {
	"°C": "TEMPERATURE °C",
	kW: "POWER kW"
}, dc = Array.from({ length: 21 }, (e, t) => N`<path d="M${lc(50, -50 + t * 5)} L${lc(t % 4 ? 53 : 56, -50 + t * 5)}" stroke=${t > 16 ? "#c9170f" : "#101614"} stroke-width=${t % 4 ? .6 : 1.1}/>`);
function fc(e, t, n, r, i, a = 0, o = !0) {
	let s = Array.from({ length: 6 }, (e, r) => {
		let [i, a] = lc(41, -50 + r * 20).split(",");
		return N`<text x=${i} y=${Number(a) + 2}>${+(t + (n - t) * r / 5).toFixed(1)}</text>`;
	});
	return M`<div class="meter">
    <svg viewBox="0 0 120 84" role="img" aria-label="${e}: ${r} ${i}">
      <rect x="1" y="1" width="118" height="82" rx="4" fill="#101112"/><rect x="1.5" y="1.5" width="117" height="81" rx="3.5" fill="none" stroke="#fff" stroke-opacity=".2"/>
      <rect x="7" y="7" width="106" height="58" rx="2" fill="url(#${o ? "dial" : "dark"})"/>
      ${o ? N`<rect x="7" y="7" width="106" height="20" rx="2" fill="#fff" opacity=".22"/>` : F}
      <path d="M${lc(50, -50)} A50,50 0 0 1 ${lc(50, 34)}" fill="none" stroke="#101614" stroke-width=".8"/><path d="M${lc(50, 34)} A50,50 0 0 1 ${lc(50, 50)}" fill="none" stroke="#c9170f" stroke-width="2"/>
      ${dc}${s}<text class="legend" x="60" y="60">${uc[i] ?? i}</text>
      <clipPath id="window"><rect x="7" y="7" width="106" height="58" rx="2"/></clipPath>
      <g clip-path="url(#window)"><g class="needle" style="transform: rotate(${ro(r, t, n).toFixed(1)}deg)"><g class="waver" style="animation-duration: ${Xa[a % Xa.length] * 16}ms"><path d="M60,74 V19" stroke="#0b0d0c" stroke-width=".9"/></g></g></g>
      <rect x="7" y="7" width="106" height="58" rx="2" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.6"/><path d="M11,10 L52,10 L38,34 L11,34 Z" fill="#fff" opacity=".1"/>
      <circle cx="60" cy="74" r="4" fill="#1d1f20" stroke="#000"/><path d="M57,74 h6" stroke="#000" stroke-width="1.1"/>
    </svg>
    ${ac(e)}
  </div>`;
}
var pc = (e) => M`<span class="jewel ${e}" aria-hidden="true">${e}</span>`, mc = (e) => {
	let t = e ? Math.max(1, Math.round((e - .35) / .65 * 5)) : 0;
	return M`<div class="leds" role="img" aria-label="Lights: ${t} of 5">${[
		0,
		1,
		2,
		3,
		4
	].map((e) => M`<span class=${e < t ? "on" : ""}></span>`)}</div>`;
}, hc = (e) => +(e.length * 3.05 + 5).toFixed(1), gc = [
	7.4,
	6.6,
	5.8
].map((e) => N`<circle cx="29" cy="46" r=${e} fill="none" stroke="#4b4f53" stroke-width=".45"/>`), _c = Array.from({ length: 7 }, (e, t) => `M${25.4 + t * 1.2},1.6 v5.8`).join(" "), vc = (e, t, n, r, i = "", a = "", o = ["On", "Off"]) => M`<button class="dolly ${t ? "on" : ""} ${n ? "away" : ""} ${i}" aria-pressed=${t} aria-label=${n ? `${e}: not answering` : e + a} @click=${r}>
  <svg viewBox=${i ? "0 -30 64 114" : "0 0 64 84"}>
    ${i ? N`<path d="M12.5,-3 h33 q2,0 2,2 v82 q0,2 -2,2 h-33 q-2,0 -2,-2 v-82 q0,-2 2,-2 z" fill="#1d1e20" stroke="#000" stroke-width=".6"/><path d="M11.4,-1 v80" stroke="#fff" stroke-opacity=".16" stroke-width=".8"/>` : N`<rect x="12" y="9" width="34" height="74" rx="2" fill="#141516"/>`}
    <rect x=${29 - hc(o[0]) / 2} y="12.4" width=${hc(o[0])} height="7.2" rx="1" fill="#c9170f"/><text class="onoff" x="29" y="18">${o[0]}</text>
    <rect x=${29 - hc(o[1]) / 2} y="73.4" width=${hc(o[1])} height="7.2" rx="1" fill="#050505" stroke="#e9e9e7" stroke-width=".4"/><text class="onoff" x="29" y="79">${o[1]}</text>
    <circle cx="54" cy="76" r="6.5" fill="url(#nut)" stroke="#444" stroke-width=".6"/><circle class="pilot" cx="54" cy="76" r="4.3"/><circle cx="54" cy="76" r="4.3" fill="url(#lens)"/>
    <g class="throw"><circle cx="29" cy="46" r="17" fill="transparent"/><circle cx="29" cy="46.8" r="12.4" fill="#000" opacity=".45"/>
    <path d="M29,34.6 l9.9,5.7 v11.4 l-9.9,5.7 l-9.9,-5.7 v-11.4 z" fill="url(#nut)" stroke="#33363a" stroke-width=".7"/><path d="M29,34.6 l9.9,5.7 M19.1,51.7 l9.9,5.7" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>
    <circle cx="29" cy="46" r="8.4" fill="url(#chrome)" stroke="#33363a" stroke-width=".6"/>${gc}<circle cx="29" cy="46" r="4.6" fill="#0d0e0f"/><circle cx="29" cy="46" r="3.5" fill="url(#nut)"/>
    <g class="lever"><path d="M28.6,48 L27.2,31 Q27.2,26 31.2,26 Q35.2,26 35.2,31 L33.4,48 Z" fill="#000" opacity=".3"/>
      <path d="M26.7,46 L24.9,29.5 Q24.9,23.6 29,23.6 Q33.1,23.6 33.1,29.5 L31.3,46 Z" fill="url(#chrome)" stroke="#2f3235" stroke-width=".6"/>
      <path d="M27,29 L28,44" stroke="#fff" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round"/><ellipse cx="29" cy="26.8" rx="3.3" ry="2.2" fill="#fff" opacity=".6"/></g></g>
    ${i ? N`<g class="shell shut-shell">
            <path d="M19,10 V4 Q19,.6 21.5,.6 Q24,.6 24,4 V9 H34 V4 Q34,.6 36.5,.6 Q39,.6 39,4 V10 L43.2,15.5 L44.6,22 V60 Q44.6,70.5 36,70.5 H22 Q13.4,70.5 13.4,60 V22 L14.8,15.5 Z" fill="url(#moulded)" stroke="#5a0709" stroke-width=".7"/>
            <path d="M41.6,17.5 L43,22.5 V60 Q43,67.5 36.5,69" fill="none" stroke="#7d0a0d" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/><path d="M15.6,23 V58" stroke="#ff9488" stroke-opacity=".75" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M24.6,12 H33.4 L34.6,45 Q34.6,52.5 29,52.5 Q23.4,52.5 23.4,45 Z" fill="url(#moulded)" stroke="#6a080a" stroke-width=".5"/><path d="M25.3,13.5 L24.5,44" stroke="#ffb0a6" stroke-opacity=".8" stroke-width="1" stroke-linecap="round"/><path d="M33,13.5 L33.8,45" stroke="#6a080a" stroke-opacity=".6" stroke-width="1.3" stroke-linecap="round"/>
            <ellipse cx="19.8" cy="34" rx="1.8" ry="11" fill="#fff" opacity=".28"/><path d="M16.5,62 Q29,71 41.5,62" fill="none" stroke="#6a080a" stroke-opacity=".5" stroke-width="1.1"/>
            <path d="M19.8,4 v5.4 M38.2,4 v5.4" stroke="#ff9488" stroke-opacity=".6" stroke-width=".8"/></g>
          <g class="shell up-shell">
            <path d="M19,7 V3 h5 V6 H34 V3 h5 V7 L44.3,1 L45.4,-10 Q46,-27.5 34.5,-27.5 H23.5 Q12,-27.5 12.6,-10 L13.7,1 Z" fill="url(#moulded)" stroke="#5a0709" stroke-width=".7"/>
            <path d="M17.4,1.5 L16.6,-10 Q16.2,-23.6 24.6,-23.6 H33.4 Q41.8,-23.6 41.4,-10 L40.6,1.5 Q29,5 17.4,1.5 Z" fill="#650a0c"/><path d="M17.4,1.5 Q29,5 40.6,1.5 L40.2,-4 Q29,-.5 17.8,-4 Z" fill="#b3181a" opacity=".55"/>
            <path d="M25,-23 H33 L33.8,-3 Q29,-1.6 24.2,-3 Z" fill="#3f0607" opacity=".85"/><path d="M25.4,-22 L24.8,-4" stroke="#000" stroke-opacity=".4" stroke-width=".9"/>
            <path d="M14.8,-10 Q14.4,-25.6 24,-25.6 H34" fill="none" stroke="#ffa59a" stroke-opacity=".8" stroke-width="1.1" stroke-linecap="round"/><path d="M43.6,-9 Q43.8,-20 39.5,-24.2" fill="none" stroke="#6a080a" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/></g>
          <path d="M14.5,-.4 h6 v9.6 h-6 z M37.5,-.4 h6 v9.6 h-6 z" fill="#27282a" stroke="#000" stroke-width=".5"/><path d="M12.5,4.5 H45" stroke="url(#chrome)" stroke-width="2.3"/><path d="M12.5,3.7 H45" stroke="#fff" stroke-opacity=".7" stroke-width=".5"/>
          <rect x="25" y="1.4" width="8.4" height="6.2" rx="1" fill="#aeb2b6"/><path d="${_c}" stroke="#4d5154" stroke-width=".55"/>
          <circle cx="46" cy="4.5" r="2.7" fill="url(#nut)" stroke="#2f3235" stroke-width=".5"/><path d="M44.4,4.5 h3.2 M46,2.9 v3.2" stroke="#2f3235" stroke-width=".7"/><circle cx="12.4" cy="4.5" r="1.7" fill="url(#nut)" stroke="#2f3235" stroke-width=".4"/>` : F}
  </svg>
  ${ac(e)}
</button>`, yc = Array.from({ length: 11 }, (e, t) => {
	let n = (-135 + t * 27 - 90) * Math.PI / 180, r = (e) => `${(52 + e * Math.cos(n)).toFixed(1)},${(52 + e * Math.sin(n)).toFixed(1)}`;
	return N`<path d="M${r(41)} L${r(t % 5 ? 46 : 49)}" stroke="#141516" stroke-width=${t % 5 ? .9 : 1.8}/>`;
}), bc = (e, t) => {
	let n = (t - 90) * Math.PI / 180;
	return `${(52 + e * Math.cos(n)).toFixed(1)},${(52 + e * Math.sin(n)).toFixed(1)}`;
}, xc = "#1f8f45", Sc = "#e2512a", Cc = Array.from({ length: 21 }, (e, t) => {
	let n = -135 + t * 13.5;
	return N`<path d="M${bc(t % 5 ? 26.5 : 25, n)} L${bc(30, n)}" stroke=${t < 10 ? xc : t > 10 ? Sc : "#141516"} stroke-width=${t % 5 ? .8 : 1.4}/>`;
});
function wc(e, t, n) {
	let r = [
		0,
		1,
		2,
		3,
		4
	].map((n) => {
		let [r, i] = bc(37.2, -135 + n * 67.5).split(",");
		return N`<text x=${r} y=${Number(i) + 2.2} fill=${n < 2 ? xc : n > 2 ? Sc : "#141516"}>${Math.round(e + (t - e) * n / 4)}</text>`;
	}), i = n === void 0 ? void 0 : -135 + 270 * Math.min(1, Math.max(0, (n - e) / (t - e)));
	return N`<rect x="2.5" y="2.5" width="99" height="99" rx="7" fill="#121314" stroke="#000"/><rect x="3.5" y="3.5" width="97" height="97" rx="6" fill="none" stroke="#fff" stroke-opacity=".16"/>
    ${[
		[10, 10],
		[94, 10],
		[10, 94],
		[94, 94]
	].map(([e, t]) => N`<circle cx=${e} cy=${t} r="2.6" fill="url(#nut)" stroke="#000" stroke-width=".4"/><path d="M${e - 1.6},${t - 1.1} l3.2,2.2" stroke="#2a2c2e" stroke-width=".8"/>`)}
    <circle cx="52" cy="52" r="44.5" fill="#000"/><circle class="face" cx="52" cy="52" r="42.5"/>
    <path d="M${bc(31.3, -135)} A31.3,31.3 0 0 1 ${bc(31.3, 0)}" fill="none" stroke=${xc} stroke-width="2.4"/><path d="M${bc(31.3, 0)} A31.3,31.3 0 0 1 ${bc(31.3, 135)}" fill="none" stroke=${Sc} stroke-width="2.4"/>
    ${Cc}<g class="figures">${r}</g>
    ${i === void 0 ? F : N`<g class="hand" style="transform: rotate(${i.toFixed(1)}deg)"><path d="M52,52 V14" stroke="#d0180f" stroke-width=".9"/><path d="M52,10.5 l-1.9,4.4 h3.8 z" fill="#d0180f"/></g>`}
    <path d="M20,30 A38,38 0 0 1 48,13" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>`;
}
var Tc = (e, t, n, r, i, a, o, s, c = [0, 100], l) => {
	let { legend: u, shown: d, lit: f } = Ms(e, t, c), p = d === void 0 ? F : cc(d, f), m = o || t === "sound";
	return M`<div class="dial ${t}">
    <div class="dimmer"><svg viewBox="0 0 104 104" aria-hidden="true">${t === "heat" ? wc(c[0], c[1], l) : yc}</svg>
      <div class="knob ${t} ${i ? "drag" : ""}" role="slider" tabindex="0" aria-label="${e} ${n}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(r)} aria-valuetext=${a} style="--lvl: ${r.toFixed(1)}"
        @pointerdown=${s.down} @pointermove=${s.move} @pointerup=${s.up} @pointercancel=${s.drop} @keydown=${s.key}><span class="flutes"></span><span class="cap"></span><span class="mark"></span></div></div>
    ${ac(u)}${p}${m ? M`<span class="note ${/^now /.test(o) ? "reading" : ""}">${o ? ac(o) : F}</span>` : F}
  </div>`;
}, Ec = (e, t) => M`<button class="push" @click=${t}><span class="key"></span>${ac(e)}</button>`, Dc = (e, t, n) => M`<button class="knife ${t ? "closed" : ""}" @click=${n}><span class="key">${e}</span></button>`, Oc = /* @__PURE__ */ t({
	DEFS: () => kc,
	dolly: () => Nc,
	jewel: () => Mc,
	knife: () => Ic,
	knob: () => Pc,
	label: () => Ac,
	meter: () => jc,
	push: () => Fc,
	tv: () => mo,
	valve: () => mc,
	wheels: () => Is
}), kc = M``, Ac = (e) => M`<span class="label">${e}</span>`;
function jc(e, t, n, r, i, a = 0, o = !0) {
	return Fs(e, t, n, r, i, o, Ac(e));
}
var Mc = (e) => M`<span class="jewel ${e}" aria-hidden="true"></span>`, Nc = (e, t, n, r, i = "", a = "", o = ["On", "Off"]) => M`<button class="dolly ${t ? "on" : ""} ${n ? "away" : ""} ${i}" aria-pressed=${t} aria-label=${n ? `${e}: not answering` : e + a} @click=${r}>
  <span class="rocker"><i class="pilot"></i><span class="throw"><b>I</b><b>O</b></span>${i ? M`<i class="lock"></i>` : F}</span>
  ${Ac(e)}
</button>`, Pc = (e, t, n, r, i, a, o, s, c = [0, 100], l) => {
	let { legend: u, shown: d, lit: f } = Ms(e, t, c), p = o || t === "sound";
	return M`<div class="dial ${t}">
    <div class="dimmer"><div class="knob ${t} ${i ? "drag" : ""}" role="slider" tabindex="0" aria-label="${e} ${n}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(r)} aria-valuetext=${a} style="--lvl: ${r.toFixed(1)}"
      @pointerdown=${s.down} @pointermove=${s.move} @pointerup=${s.up} @pointercancel=${s.drop} @keydown=${s.key}><span class="disc"></span></div></div>
    ${Ac(u)}${d === void 0 ? Ns(js(String(Math.round(r)), "%", [0, 100])) : Ns(d, f)}${p ? M`<span class="note">${o ? Ac(o) : F}</span>` : F}
  </div>`;
}, Fc = (e, t) => M`<button class="push" @click=${t}><span class="key"></span>${Ac(e)}</button>`, Ic = (e, t, n) => M`<button class="knife ${t ? "closed" : ""}" @click=${n}><span class="strip">${e}</span><span class="key"></span></button>`, Lc = b`
  .panel { --lcd: #aeb79e; --lcd-ink: #1d261a; --ink: #5b5648; --seg-on: var(--lcd-ink); --seg-off: rgba(29,38,26,.07); box-sizing: border-box; min-height: 100%; padding: 18px 22px; color: var(--ink);
    font-family: Helvetica, Arial, sans-serif; background: radial-gradient(rgba(0,0,0,.04) 1px, transparent 1.4px) 0 0 / 3px 3px, linear-gradient(175deg, #e6dfcb, #d5ccb5); }
  .panel * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; overflow: visible; }
  /* A legend: grey print on the plastic. */
  .label { display: inline-block; max-width: 100%; font-size: 10px; letter-spacing: .03em; overflow-wrap: anywhere; }

  /* What must never be missed: a lost connection, a refused action. A red LED and a line of print. */
  .warn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .warn .label { font-size: 12px; font-weight: 700; }
  .lamp { flex: none; width: 10px; height: 10px; border-radius: 50%; background: #e3291c; box-shadow: 0 0 6px #e3291c; }

  /* A bay: a shallow recess moulded into the case. */
  .room, .knives, .top > .meter, .top > .tv, .lamps { position: relative; border-radius: 7px; background: linear-gradient(180deg, #dad1bb, #cec4ac); box-shadow: inset 0 2px 3px rgba(0,0,0,.28), inset 0 -1px 0 rgba(255,255,255,.6), 0 1px 0 rgba(255,255,255,.65); }
  .top { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 14px; }
  .top > .meter { flex: 0 1 190px; padding: 12px 12px 8px; }
  .floor .label { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  /* A chassis is some of the panel's columns across (views.ts lays the rooms out, and
     balance.ts chooses). Its lights are at its top left and its name at its top right, and a row of
     cooling slots is moulded into its foot. */
  .room { display: grid; grid-template-columns: auto 1fr; align-items: center; padding: 12px 10px 32px; text-align: center; }
  .room::after { content: ""; position: absolute; right: 14px; bottom: 10px; width: 66px; height: 14px; background: repeating-linear-gradient(90deg, #8f8672 0 2px, transparent 2px 6px); }
  .room > .label { justify-self: end; font-size: 14px; font-weight: 700; font-style: italic; text-align: right; }
  .room > :not(.leds, .label) { grid-column: 1 / -1; }
  /* Every control is fixed to the panel: it hangs from the top of its row and keeps the
     same height whatever its legend says, so a name that grows or a setting that changes
     moves nothing (owner, 2026-11-15). */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px 6px; margin-top: 6px; }
  .works > .meter { flex: 0 1 150px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .8; }
  .more .label, .rec .label { font-size: 9px; }
  .rec { justify-self: center; margin-top: 10px; padding: 3px 12px; border-radius: 5px; background: linear-gradient(#9a9486, #7d776a); box-shadow: 0 2px 0 #5d584e; color: #f1ecdd; }
  .rec:active { transform: translateY(1px); box-shadow: 0 1px 0 #5d584e; }
  .rec:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* An LCD: black on grey-green, sunk a little into the case. */
  .win, .leds, .dial > .figs, .wheel .figs, .alert .label { background: var(--lcd); box-shadow: inset 0 2px 4px rgba(0,0,0,.4); }
  /* A room's lights: five strength bars, as a mobile telephone shows its signal. */
  .leds { display: flex; align-items: flex-end; gap: 2px; padding: 4px 7px; border-radius: 2px; }
  .leds span { width: 5px; background: var(--lcd-ink); opacity: .08; }
  .leds span:nth-child(1) { height: 4px; } .leds span:nth-child(2) { height: 7px; } .leds span:nth-child(3) { height: 10px; } .leds span:nth-child(4) { height: 13px; } .leds span:nth-child(5) { height: 16px; }
  .leds .on { opacity: 1; }

  /* Meters: figures over a row of blocks (../figures.ts). An LCD does not glow, and one
     that Home Assistant is not answering is blank. */
  .meter { text-align: center; }
  .meter > .label { margin-top: 6px; }
  .win { position: relative; display: flex; flex-wrap: wrap; align-items: center; align-content: center; justify-content: center; gap: 5px 6px; aspect-ratio: 120 / 70; max-width: 100%; border: 5px solid #b9b09a; border-radius: 3px; }
  .display .unit { align-self: flex-end; margin-bottom: 4px; color: var(--lcd-ink); font-size: 11px; font-weight: 700; }
  .display.unlit .unit { opacity: .1; }
  ${Ls}
  .sweep i:nth-child(n) { height: 7px; }

  /* Alerts: an LED, and what is wrong on a character LCD. A critical one flashes. */
  .lamps { display: flex; flex-wrap: wrap; gap: 10px 24px; margin-bottom: 14px; padding: 12px 14px; }
  .alert { display: flex; align-items: center; gap: 9px; max-width: 100%; }
  .jewel { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--glow); box-shadow: 0 0 5px var(--glow); }
  .jewel.nominal { --glow: #4fdc4f; } .jewel.task { --glow: #4cf04c; } .jewel.warning { --glow: #f0a51a; } .jewel.error, .jewel.critical { --glow: #e3291c; }
  .jewel.critical { animation: flash 1s steps(2, jump-none) infinite; }
  @keyframes flash { 0% { opacity: .25; } 100% { opacity: 1; } }
  .alert .label { max-width: 27ch; padding: 5px 9px; border: 3px solid #3a3a3a; border-radius: 2px; background: #b9cc2a; color: #1c2408; font: 13px/1.3 Menlo, "Courier New", monospace; letter-spacing: 0; }

  /* A jog dial in a well, with its setting on an LCD under its legend. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; min-height: 152px; }
  .dial.sound .note { height: 42px; overflow: hidden; }
  .dimmer { position: relative; width: 104px; height: 84px; margin: 4px auto 2px; }
  /* The dial, in layers. Its well and its shadow do not turn; the ridged disc does, and
     the dimple in it is turned back by as much, so that it stays lit from above. */
  .knob { position: absolute; left: 16px; top: 6px; width: 72px; height: 72px; border-radius: 50%; cursor: grab; touch-action: none; background: #c2b9a3; box-shadow: inset 0 2px 4px rgba(0,0,0,.4), 0 1px 0 #fff; }
  .knob::before { content: ""; position: absolute; inset: 5px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,.45); }
  .disc { position: absolute; inset: 5px; border-radius: 50%; background: repeating-radial-gradient(circle, #8f897b 0 1px, #aaa496 1px 3px); transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .disc::after { content: ""; position: absolute; left: 50%; top: 7%; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; background: radial-gradient(circle at 50% 30%, #6c675b, #b9b3a3); box-shadow: inset 0 2px 3px rgba(0,0,0,.55);
    transform: rotate(calc(135deg - var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .knob.drag .disc, .knob.drag .disc::after { transition: none; }
  .knob:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  .dial > .figs { margin-top: 5px; padding: 3px 5px; border-radius: 2px; }
  .dial > .figs, .note { display: flex; width: fit-content; margin-left: auto; margin-right: auto; }
  /* A note is somebody's own addition: black print on white labeller tape. */
  .note { align-items: flex-start; margin-top: 5px; } .note .label { padding: 1px 6px; background: #fff; color: #111; font-size: 9px; font-weight: 700; box-shadow: 0 1px 1px rgba(0,0,0,.35); }

  /* A rocker marked I and O, under a green LED. A button centres what is in it: the
     rocker is pinned to the top instead, with its legend under it. */
  .dolly { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 92px; min-height: 100px; margin-top: 10px; text-align: center; }
  .rocker { position: relative; flex: none; margin-bottom: 6px; }
  .pilot { display: block; width: 6px; height: 6px; margin: 2px auto 5px; border-radius: 50%; background: #3d4a2c; transition: background .15s; }
  .dolly.on .pilot { background: #4cf04c; box-shadow: 0 0 5px #4cf04c; }
  /* The half that is pressed in is in shadow: O at rest, I when on. */
  .throw { display: flex; flex-direction: column; width: 30px; height: 46px; border: 3px solid #2b2b2b; border-radius: 4px; background: linear-gradient(180deg, #f3eddc 0 50%, #aaa28d 50%); box-shadow: 0 2px 2px rgba(0,0,0,.3); }
  .dolly.on .throw { background: linear-gradient(180deg, #aaa28d 0 50%, #f3eddc 50%); }
  .throw b { flex: 1; display: grid; place-items: center; color: #555; font: 700 11px Helvetica, Arial, sans-serif; }
  /* A guard for a switch that must not be thrown by accident: the case's keylock, beside
     it. The first press turns the key, and it turns back when the switch is at rest again. */
  .lock { position: absolute; left: calc(100% + 7px); top: 26px; width: 20px; height: 20px; border: 2px solid #777; border-radius: 50%; background: radial-gradient(circle at 40% 30%, #f2f2f2, #8d8d8d); transition: transform .18s; }
  .lock::after { content: ""; position: absolute; left: 50%; top: 14%; width: 3px; height: 72%; margin-left: -1.5px; border-radius: 1px; background: #222; }
  .dolly.up .lock { transform: rotate(90deg); }
  .dolly.away { cursor: default; } .dolly.away .rocker { opacity: .5; } .dolly.away .pilot { background: #777; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible .throw { outline: 2px solid var(--ink); outline-offset: 3px; }

  /* An alarm: how it stands, an LCD figure for each place of its code with a rubber key over and under it, and its keys. */
  .alarm { flex: 0 1 140px; display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 10px; }
  .alarm > .label { display: flex; align-items: center; justify-content: center; width: 132px; min-height: 33px; font-weight: 700; }
  .alarm.sounding > .label { color: #c2180f; }
  .wheels { display: flex; gap: 3px; }
  .wheel { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .wheel button, .push .key { border-radius: 4px; background: linear-gradient(#9a9486, #7d776a); box-shadow: 0 2px 0 #5d584e; }
  .wheel button { width: 18px; height: 12px; color: #f1ecdd; font-size: 6px; line-height: 12px; text-align: center; }
  .wheel button:first-of-type::after { content: "▲"; } .wheel button:last-of-type::after { content: "▼"; }
  .wheel button:active, .push:active .key { transform: translateY(1px); box-shadow: 0 1px 0 #5d584e; }
  .wheel button:focus-visible, .push:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 1px; }
  .wheel .figs { padding: 3px 1px; border-radius: 2px; }
  .pushes { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .push { text-align: center; }
  .push .key { display: block; width: 40px; height: 22px; margin: 2px auto 5px; border-radius: 5px; }
  .push .label { font-size: 9px; }

  /* A camera: a beige monitor with its power LED, and its name on labeller tape. The
     tube's height is set by padding, not an aspect ratio, which grew without end in WebKit. */
  .tv { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex: 0 1 150px; min-height: 146px; margin-top: 10px; text-align: center; }
  .tube { display: block; position: relative; flex: none; align-self: stretch; height: 0; padding-top: calc((100% - 28px) * .75); margin: 9px 14px 22px; border-radius: 3px; background: #1d2023; box-shadow: 0 0 0 2px #333, 0 0 0 10px #d8cfb8, 0 10px 0 10px #d8cfb8, 0 12px 4px 10px rgba(0,0,0,.35); }
  .tube img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; border-radius: 3px; object-fit: cover; }
  .tube::after { content: ""; position: absolute; right: -2px; bottom: -14px; width: 6px; height: 6px; border-radius: 50%; background: #4cf04c; }
  .tv .label { padding: 2px 8px; background: #fff; color: #111; font-weight: 700; box-shadow: 0 1px 1px rgba(0,0,0,.35); transform: rotate(-1deg); }
  .top > .tv { flex-basis: 170px; margin-top: 0; padding: 12px 10px 8px; }
  .tv:focus-visible .tube { outline: 2px solid var(--ink); outline-offset: 12px; }

  /* Scenes: function keys, numbered as they come, under a paper strip that says what each does. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 8px 6px; align-items: flex-end; padding: 12px; counter-reset: fkey; }
  .knife { display: flex; flex-direction: column; gap: 6px; width: 62px; text-align: center; counter-increment: fkey; }
  .strip { padding: 2px 1px; border: 1px solid #9a9a9a; background: #fff; color: #111; font-size: 9px; line-height: 1.15; overflow-wrap: anywhere; }
  .knife .key { display: block; height: 36px; margin: 0 5px 3px; border-radius: 4px; background: linear-gradient(#ece5d3, #d2c9b3); box-shadow: 0 3px 0 #a79f8a, 0 4px 5px rgba(0,0,0,.35), inset 0 1px 0 #fff; color: #555; font-size: 10px; line-height: 30px; }
  .knife .key::after { content: "F" counter(fkey); }
  .knife.closed .key, .knife:active .key { transform: translateY(2px); box-shadow: 0 1px 0 #a79f8a, inset 0 1px 0 #fff; }
  .knife:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 3px; }

  /* The recorder: a room's day as a chart in a window of a sixteen-colour desktop. It is
     ../scope.ts's oscilloscope, dressed: a white ground, a dotted grid, no glow, and a
     colour for each device's line. */
  dialog.recorder { width: min(760px, 94vw); padding: 0 0 8px; border: 2px solid; border-color: #fff #404040 #404040 #fff; border-radius: 0; background: #c0c0c0; color: #000; text-align: center; font-family: Tahoma, Helvetica, Arial, sans-serif; box-shadow: 0 20px 40px rgba(0,0,0,.5); }
  dialog.recorder::backdrop { background: rgba(0,0,0,.4); }
  dialog.recorder > .label { display: block; margin: 2px; padding: 3px 6px; background: #000080; color: #fff; font-size: 12px; font-weight: 700; text-align: left; }
  dialog.recorder .warn { margin: 6px 8px 0; }
  .scope { width: calc(100% - 12px); height: auto; margin: 6px; border: 2px solid; border-color: #404040 #fff #fff #404040; background: #fff; }
  .scope .screen { fill: #fff; } .scope .grid { stroke: #008080; stroke-opacity: 1; stroke-dasharray: 1 3; } .scope .glow { display: none; }
  .scope .trace { stroke: #f00; stroke-width: 1.5; }
  .channel:nth-of-type(4n + 2) .trace { stroke: #00f; } .channel:nth-of-type(4n + 3) .trace { stroke: #008000; } .channel:nth-of-type(4n) .trace { stroke: #800080; }
  .scope text { fill: #000; font-size: 9px; }
  .scope .lane { text-anchor: end; } .scope .hour { font-size: 8px; text-anchor: middle; }
  /* The window's own button: grey, with a bevel. */
  dialog.recorder .push .key { display: none; }
  dialog.recorder .push .label { padding: 3px 22px; border: 2px solid; border-color: #fff #404040 #404040 #fff; background: #c0c0c0; color: #000; font-size: 12px; }
  dialog.recorder .push:active .label { border-color: #404040 #fff #fff #404040; }
  dialog.recorder .push:focus-visible .label { outline: 1px dotted #000; outline-offset: -5px; }

  @media (prefers-reduced-motion: reduce) { .jewel.critical { animation: none; } .disc, .disc::after, .lock { transition: none; } }
`, Rc = 104, zc = 640, Bc = 34, Vc = 36e5, Hc = (e, t) => (n, r, i, a, o) => {
	let s = i - 24 * Vc, c = (e) => Rc + (e - s) / (i - s) * 526, l = Math.ceil(s / Vc) * Vc, u = Array.from({ length: 24 }, (e, t) => l + t * Vc).filter((e) => e <= i), d = r.length * Bc + 30;
	return M`<dialog class="recorder" aria-label="${n}: the last day" @close=${o} @click=${(e) => e.target === e.currentTarget && o()}>
    ${e(`${n}: the last day`)}
    ${a ? M`<div class="warn"><span class="lamp"></span>${e(`The record could not be read (${a}).`)}</div>` : F}
    <svg class="scope" viewBox="0 0 ${zc} ${d}" role="img" aria-label="Traces of when each device in ${n} was on">
      <rect class="screen" width=${zc} height=${d} rx="14" fill="#04140d"/>
      ${u.map((e) => {
		let t = new Date(e).getHours() % 3 == 0;
		return N`<path class="grid" d="M${c(e).toFixed(1)},6 V${d - 18}" stroke="#7dffc0" stroke-opacity=${t ? .28 : .1} stroke-width=".6"/>${t ? N`<text class="hour" x=${c(e).toFixed(1)} y=${d - 6}>${String(new Date(e).getHours()).padStart(2, "0")}</text>` : F}`;
	})}
      ${r.map((e, t) => {
		let n = (t + 1) * Bc, r = yo(e.changes ?? [], s, i, e.lo, e.hi).map((e) => e.map(([e, t], r) => `${r ? "L" : "M"}${(Rc + e * 526).toFixed(1)},${(n - t * 22).toFixed(1)}`).join(" ")).join(" ");
		return N`<g class="channel"><path class="grid" d="M${Rc},${n} H${630}" stroke="#7dffc0" stroke-opacity=".16" stroke-width=".5"/>
          <text class="lane" x=${96} y=${n - 3}>${e.name}</text>
          ${e.changes ? N`<path class="glow" d=${r} fill="none" stroke="#3dff9a" stroke-opacity=".3" stroke-width="4" stroke-linejoin="round"/><path class="trace" d=${r} fill="none" stroke="#c9ffe2" stroke-width="1.1" stroke-linejoin="round"/>` : N`<text class="hour" x=${144} y=${n - 3}>${a ? "" : "reading…"}</text>`}</g>`;
	})}
    </svg>
    ${t("Close", o)}
  </dialog>`;
}, Uc = "dash-bored-beige", Wc = class extends Ss {
	constructor(...e) {
		super(...e), this.kit = {
			...Oc,
			recorder: Hc(Ac, Fc)
		};
	}
	static {
		this.styles = [
			W,
			Cs,
			Lc
		];
	}
}, Gc = Symbol.for(""), Kc = (e) => {
	if (e?.r === Gc) return e?._$litStatic$;
}, qc = (e) => ({
	_$litStatic$: e,
	r: Gc
}), Jc = /* @__PURE__ */ new Map(), Yc = ((e) => (t, ...n) => {
	let r = n.length, i, a, o = [], s = [], c, l = 0, u = !1;
	for (; l < r;) {
		for (c = t[l]; l < r && (a = n[l], (i = Kc(a)) !== void 0);) c += i + t[++l], u = !0;
		l !== r && s.push(a), o.push(c), l++;
	}
	if (l === r && o.push(t[r]), u) {
		let e = o.join("$$lit$$");
		(t = Jc.get(e)) === void 0 && (o.raw = o, Jc.set(e, t = o)), n = s;
	}
	return e(t, ...n);
})(M), Xc = "dash-bored-console", Zc = "dash-bored-era", Qc = [
	{
		id: "bakelite",
		name: "Bakelite",
		decade: "1950s",
		tag: "dash-bored-bakelite"
	},
	{
		id: "nixie",
		name: "Nixie",
		decade: "1960s",
		tag: "dash-bored-nixie"
	},
	{
		id: "silverface",
		name: "Silverface",
		decade: "1970s",
		tag: "dash-bored-silverface"
	},
	{
		id: "bargraph",
		name: "Bargraph",
		decade: "1980s",
		tag: "dash-bored-bargraph"
	},
	{
		id: "beige",
		name: "Beige",
		decade: "1990s",
		tag: "dash-bored-beige"
	}
], $c = class extends Ge {
	constructor(...e) {
		super(...e), this.narrow = !1, this._era = Qc[0].id, this._config = {}, this._told = {}, this._page = !1;
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			narrow: { type: Boolean },
			_era: { state: !0 }
		};
	}
	static {
		this.styles = b`
    :host { display: block; }
    /* In the card picker, a window on the top of the specimen (family.ts PAGE). */
    :host([sample]) { max-height: 400px; overflow: hidden; }
    .eras { position: relative; flex: none; width: 132px; height: 100px; margin-left: auto; color: #f4f0e4; font: 600 10px "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif; }
    /* The stops and the switch are named with .eras so that they outrank this reset. */
    .eras button { all: unset; position: absolute; cursor: pointer; }
    /* A rotary switch: five stops on an arc over the knob, each lettered with its decade. */
    .eras .stop { left: 50%; top: 58px; width: 24px; height: 16px; margin: -8px -12px; border-radius: 3px; text-align: center; line-height: 16px; letter-spacing: .05em; opacity: .65;
      transform: rotate(calc((var(--i) - 2) * 36deg)) translateY(-46px) rotate(calc((var(--i) - 2) * -36deg)); }
    .eras .stop.unbuilt { opacity: .4; }
    .eras .stop[aria-checked="true"] { opacity: 1; background: #111; box-shadow: 0 0 0 1px #777; }
    .eras .switch { left: 50%; top: 58px; width: 50px; height: 50px; margin: -25px; border-radius: 50%; background: radial-gradient(circle at 34% 28%, #5a5a5a, #111 70%);
      box-shadow: 0 5px 7px rgba(0,0,0,.6), 0 0 0 2px #000, 0 0 0 3.5px #8f8f86; }
    .switch span { position: absolute; inset: 0; transform: rotate(calc((var(--at) - 2) * 36deg)); transition: transform .25s; }
    .switch span::after { content: ""; position: absolute; left: 50%; top: -5px; width: 9px; height: 31px; margin-left: -4.5px; border-radius: 4.5px 4.5px 2px 2px;
      background: linear-gradient(90deg, #1a1a1a, #6a6a6a 45%, #1a1a1a); box-shadow: inset 0 4px 0 #f4f0e4, 0 1px 2px rgba(0,0,0,.6); }
    .stop:focus-visible, .switch:focus-visible { outline: 2px solid #f4f0e4; outline-offset: 2px; }
    .named { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-size: 9px; letter-spacing: .2em; text-transform: uppercase; }
    /* In Silverface the switch is of its time: a machined knob on an aluminium plate, with printed legends. */
    .eras.silverface { color: #141516; border-radius: 3px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      background: repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 3px), linear-gradient(180deg, #dfe1e3, #bfc2c5 55%, #d3d5d7);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 5px 10px rgba(0,0,0,.45); }
    .eras.silverface .stop { opacity: .7; }
    .eras.silverface .stop[aria-checked="true"] { opacity: 1; background: #141516; color: #f4f4f2; box-shadow: none; }
    .eras.silverface .switch { background: conic-gradient(from 25deg, #f4f5f6, #9a9ea2 11%, #e6e8e9 24%, #84888c 38%, #f1f2f3 51%, #9da1a5 63%, #e2e4e6 76%, #868a8e 89%, #f4f5f6);
      box-shadow: 0 6px 8px rgba(0,0,0,.4), 0 0 0 1px rgba(0,0,0,.6), 0 0 0 4px #b2b5b8, 0 0 0 5px rgba(0,0,0,.45); }
    .eras.silverface .switch span::after { top: 3px; width: 3px; height: 20px; margin-left: -1.5px; border-radius: 1px; background: #141516; box-shadow: none; }
    .eras.silverface .named { font-weight: 700; letter-spacing: .18em; }
    /* On Beige's pale panel the lettering is dark, but for the stop that is chosen, which is on black. */
    .eras.beige { color: #3a362c; }
    .eras.beige .stop[aria-checked="true"] { color: #f4f0e4; }
    .unbuilt-era { box-sizing: border-box; display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; min-height: 240px; padding: 18px 22px; background: #2b2d30; color: #f4f0e4;
      font: 15px/1.4 "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif; }
    :host([panel]) .unbuilt-era { min-height: 100vh; }
    .plate { padding: 10px 16px; border-radius: 3px; background: #111; box-shadow: 0 0 0 1px #777; overflow-wrap: anywhere; }
    .plate b { display: block; font-size: 18px; letter-spacing: .2em; text-transform: uppercase; }
  `;
	}
	static getStubConfig(e) {
		return {};
	}
	setConfig(e) {
		this._config = { ...e }, this._told = this._tell(this._config), this._recall(), this.requestUpdate();
	}
	_tell(e) {
		return An(this) ? {
			...e,
			sample: !0
		} : e;
	}
	get _switched() {
		return !this._config.era;
	}
	getCardSize() {
		return 12;
	}
	getGridOptions() {
		return { columns: "full" };
	}
	set panel(e) {
		this._page = !0, this.toggleAttribute("panel", !0), this.requestUpdate();
	}
	connectedCallback() {
		super.connectedCallback(), this._recall(), An(this) && (this._told = this._tell(this._config)), this.toggleAttribute("sample", this._told.sample === !0);
	}
	_recall() {
		let e = this._config.era;
		try {
			e ??= localStorage.getItem(Zc) ?? void 0;
		} catch {}
		Qc.some((t) => t.id === e) && (this._era = e);
	}
	_turn(e) {
		this._era = e;
		try {
			localStorage.setItem(Zc, e);
		} catch {}
	}
	render() {
		if (!this.hass) return F;
		let e = Math.max(0, Qc.findIndex((e) => e.id === this._era)), t = Qc[e], n = (n) => this._switched ? M`<div slot=${n} class="eras ${t.tag ? t.id : ""}" role="radiogroup" aria-label="The Console's era" style="--at: ${e}">
            ${Qc.map((t, n) => M`<button class="stop ${t.tag ? "" : "unbuilt"}" role="radio" aria-checked=${n === e} aria-label="${t.name}, the ${t.decade}${t.tag ? "" : ": not built yet"}" style="--i: ${n}" @click=${() => this._turn(t.id)}>${t.decade.slice(2, 4)}</button>`)}
            <button class="switch" aria-label="The next era" @click=${() => this._turn(Qc[(e + 1) % Qc.length].id)}><span></span></button>
            <span class="named">${t.name}</span>
          </div>` : F;
		if (t.tag) {
			let e = qc(t.tag);
			return Yc`<${e} class="era" .config=${this._told} .hass=${this.hass} .narrow=${this.narrow} ?panel=${this._page}>${n("era")}</${e}>`;
		}
		return M`<div class="unbuilt-era">
      <div class="plate"><b>${t.name}</b>The Console of the ${t.decade} is not built yet. Turn the switch to another era.</div>
      ${n("")}
    </div>`;
	}
}, el = "dash-bored-console-instrument", tl = "dash-bored-console-room", nl = "dash-bored-console-lamps", rl = [
	"light",
	"switch",
	"cover",
	"lock",
	"climate",
	"media_player",
	"camera",
	"fan",
	"valve",
	"vacuum",
	"lawn_mower",
	"water_heater",
	"humidifier",
	"siren",
	"alarm_control_panel",
	"scene"
], il = {
	name: "era",
	selector: { select: {
		mode: "dropdown",
		options: Qc.map((e) => ({
			value: e.id,
			label: `${e.name}, the ${e.decade}`
		}))
	} }
}, al = {
	[el]: [
		{
			name: "entity",
			required: !0,
			selector: { entity: { filter: [{ domain: rl }, {
				domain: "sensor",
				device_class: [
					"temperature",
					"humidity",
					"power"
				]
			}] } }
		},
		il,
		{
			name: "backing",
			default: !0,
			selector: { boolean: {} }
		}
	],
	[tl]: [{
		name: "room",
		required: !0,
		selector: { area: {} }
	}, il],
	[nl]: [il]
}, ol = {
	entity: "Entity",
	room: "Room",
	era: "Era",
	backing: "On the era's panel"
}, sl = {
	entity: "A light, switch, cover, lock, thermostat, player, fan, camera, alarm or scene, or a temperature, humidity or power sensor.",
	era: "Left empty, the card is in the era last chosen on the Console in this browser, and follows its switch.",
	backing: "Off, the instrument stands on the dashboard's own card, lettered in its colours."
}, cl = class extends $c {
	get _switched() {
		return !1;
	}
	getCardSize() {
		return 3;
	}
	getGridOptions() {
		return {
			columns: 6,
			min_columns: 3
		};
	}
}, ll = class extends cl {
	static getConfigElement() {
		return document.createElement(`${el}-editor`);
	}
	static getStubConfig(e) {
		let t = Object.keys(e.states);
		return { entity: t.find((t) => t.startsWith("light.") && (e.states[t].attributes.supported_color_modes ?? []).some((e) => e !== "onoff")) ?? t.find((e) => rl.includes(e.split(".")[0])) ?? "" };
	}
	_tell(e) {
		return {
			entity: e.entity,
			backing: e.backing,
			view: "instrument"
		};
	}
	getGridOptions() {
		return {
			columns: 3,
			min_columns: 3
		};
	}
}, ul = class extends cl {
	static getConfigElement() {
		return document.createElement(`${tl}-editor`);
	}
	static getStubConfig(e) {
		return { room: Object.keys(e.areas ?? {})[0] ?? "" };
	}
	_tell(e) {
		return {
			rooms: e.room ? [e.room] : [],
			view: "room"
		};
	}
}, dl = class extends cl {
	static getConfigElement() {
		return document.createElement(`${nl}-editor`);
	}
	_tell() {
		return { view: "lamps" };
	}
	getGridOptions() {
		return {
			columns: 12,
			min_columns: 6
		};
	}
}, fl = class extends Ge {
	constructor(...e) {
		super(...e), this._ready = !1, this.schema = [];
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
		super.connectedCallback(), l().then(() => this._ready = !0);
	}
	render() {
		return !this.hass || !this._config || !this._ready ? F : M`<ha-form
      .hass=${this.hass}
      .data=${{
			backing: !0,
			...this._config
		}}
      .schema=${this.schema}
      .computeLabel=${(e) => ol[e.name] ?? e.name}
      .computeHelper=${(e) => sl[e.name]}
      @value-changed=${(e) => {
			e.stopPropagation();
			let t = Object.fromEntries(Object.entries(e.detail.value).filter(([e, t]) => t != null && t !== "" && (e !== "backing" || t !== !0)));
			this._config = t, s(this, "config-changed", { config: t });
		}}
    ></ha-form>`;
	}
}, pl = (e) => class extends fl {
	constructor(...t) {
		super(...t), this.schema = al[e];
	}
}, ml = /* @__PURE__ */ t({
	DEFS: () => hl,
	dolly: () => Cl,
	jewel: () => xl,
	knife: () => El,
	knob: () => wl,
	label: () => gl,
	meter: () => bl,
	nixies: () => yl,
	push: () => Tl,
	tubes: () => vl,
	tv: () => mo,
	valve: () => Sl,
	wheels: () => go
}), hl = M``, gl = (e) => M`<span class="label">${e}</span>`, _l = [..."1029348576"];
function vl(e) {
	let t = [];
	for (let n of e.replace(/[°%]/g, "")) n === "." ? t.length && (t.at(-1).point = !0) : t.push({
		figure: n.trim(),
		point: !1
	});
	return t;
}
var yl = (e, t = !0, n = e.trim()) => M`<span class="nixies" role="img" aria-label=${n}>${vl(e).map(({ figure: e, point: n }) => M`<i class="nix ${t && e ? "on" : ""}">${_l.map((n, r) => M`<b class=${t && n === e ? "lit" : ""} style="--z: ${r}">${n}</b>`)}${t && e === "-" ? M`<b class="lit">−</b>` : F}<u class=${t && n ? "lit" : ""}></u></i>`)}</span>`;
function bl(e, t, n, r, i, a = 0, o = !0) {
	return a < 2 ? ks(e, t, n, r, i, a, o, gl(e)) : M`<div class="meter display ${o ? "" : "unlit"}">
    <div class="win" role="img" aria-label="${e}: ${r} ${i}">${yl(js(o ? String(r) : "", "", [t, n], 1), o, "")}<span class="unit">${i}</span></div>
    ${gl(e)}
  </div>`;
}
var xl = (e) => M`<span class="jewel ${e}" aria-hidden="true"></span>`, Sl = (e) => {
	let t = e ? Math.max(.08, (e - .35) / .65) : 0;
	return M`<div class="eye" role="img" aria-label="Lights: ${Math.round(t * 100)} per cent" style="--shut: ${t.toFixed(2)}"><i></i><i></i></div>`;
}, Cl = (e, t, n, r, i = "", a = "", o = ["On", "Off"]) => M`<button class="dolly ${t ? "on" : ""} ${n ? "away" : ""} ${i}" aria-pressed=${t} aria-label=${n ? `${e}: not answering` : e + a} @click=${r}>
  <span class="key"><svg viewBox="0 0 44 66" aria-hidden="true"><circle class="glow" cx="22" cy="6" r="9"/><circle class="pilot" cx="22" cy="6" r="4.2"/>
    <g class="throw"><rect x="8" y="16" width="28" height="48" rx="3" fill="#cfd3d6" stroke="#4a5257"/><path d="M10,18 h24" stroke="#fff" stroke-opacity=".7"/>
      <circle cx="13" cy="21" r="1.6" fill="#6d757a"/><circle cx="31" cy="59" r="1.6" fill="#6d757a"/><rect x="18" y="24" width="8" height="30" rx="4" fill="#0b0b0b"/>
      <g class="lever"><path d="M19.5,40 L18,21 Q18,12 22,12 Q26,12 26,21 L24.5,40 Z" fill="#141414" stroke="#000" stroke-width=".7"/><path d="M20.3,16 L20.8,36" stroke="#fff" stroke-opacity=".3" stroke-width="1.4" stroke-linecap="round"/></g></g></svg>${i ? M`<i class="cover"></i>` : F}</span>
  ${gl(e)}
</button>`, wl = (e, t, n, r, i, a, o, s, c = [0, 100], l) => {
	let { legend: u, shown: d, lit: f } = Ms(e, t, c), p = o || t === "sound";
	return M`<div class="dial ${t}">
    <div class="dimmer"><div class="knob ${t} ${i ? "drag" : ""}" role="slider" tabindex="0" aria-label="${e} ${n}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(r)} aria-valuetext=${a} style="--lvl: ${r.toFixed(1)}"
      @pointerdown=${s.down} @pointermove=${s.move} @pointerup=${s.up} @pointercancel=${s.drop} @keydown=${s.key}><span class="grip"></span></div></div>
    ${gl(u)}${d === void 0 ? F : yl(d, f)}${p ? M`<span class="note">${o ? gl(o) : F}</span>` : F}
  </div>`;
}, Tl = (e, t) => M`<button class="push" @click=${t}><span class="key"></span>${gl(e)}</button>`, El = (e, t, n) => M`<button class="knife ${t ? "closed" : ""}" @click=${n}><span class="key">${e}</span></button>`, Dl = b`
  .panel { --ink: #f3f1e6; --case: #17191b; box-sizing: border-box; min-height: 100%; padding: 18px 22px; color: var(--ink); font-family: "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif;
    /* Wrinkle finish: the dark blue-grey of an instrument rack. */
    background: radial-gradient(rgba(255,255,255,.05) 1px, transparent 1.7px) 0 0 / 4px 4px, radial-gradient(rgba(0,0,0,.2) 1px, transparent 1.7px) 2px 2px / 4px 4px, linear-gradient(170deg, #4c5961, #333d44); }
  .panel * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; overflow: visible; }
  /* A legend: engraved in the plate and filled white. */
  .label { display: inline-block; max-width: 100%; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; text-shadow: 0 1px 0 rgba(0,0,0,.45); overflow-wrap: anywhere; }

  /* What must never be missed: a lost connection, a refused action. A red lamp and an engraved line. */
  .warn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .warn .label { font-size: 12px; letter-spacing: .06em; text-transform: none; }
  .lamp { flex: none; width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffd0c8, #ff2a1a 55%, #a30f08); box-shadow: 0 0 0 2px var(--case), 0 0 10px #ff3a22; }

  /* A plate: blue-grey anodised aluminium, with a screw in each top corner. */
  .room, .knives, .top > .meter, .top > .tv, .lamps { position: relative; border-radius: 3px; background: linear-gradient(175deg, #8ba4b0, #6f8996); box-shadow: inset 0 1px 0 rgba(255,255,255,.4), inset 0 -1px 0 rgba(0,0,0,.3), 0 3px 6px rgba(0,0,0,.5); }
  .room::before, .room::after, .knives::before, .knives::after, .lamps::before, .lamps::after { content: ""; position: absolute; top: 3px; width: 8px; height: 8px;
    background: linear-gradient(45deg, transparent 44%, #333 44% 56%, transparent 56%), radial-gradient(circle, #d5d9dc 0 3px, #4a5257 3.2px 3.8px, transparent 4px); }
  .room::before, .knives::before, .lamps::before { left: 3px; } .room::after, .knives::after, .lamps::after { right: 3px; }
  .top { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 14px; }
  .top > .meter { flex: 0 1 190px; padding: 12px 12px 8px; }
  .floor .label { font-size: 13px; letter-spacing: .3em; }
  /* A chassis is some of the panel's columns across (views.ts lays the rooms out, and
     balance.ts chooses). Its magic eye is at its top left and its name at its top right. */
  .room { display: grid; grid-template-columns: auto 1fr; align-items: center; padding: 14px 10px 14px; text-align: center; }
  .room > .label { justify-self: end; font-size: 12px; text-align: right; }
  .room > :not(.eye, .label) { grid-column: 1 / -1; }
  /* Every control is fixed to the panel: it hangs from the top of its row and keeps the
     same height whatever its legend says, so a name that grows or a setting that changes
     moves nothing (owner, 2026-11-15). */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px 6px; margin-top: 6px; }
  .works > .meter { flex: 0 1 150px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .8; }
  .more .label, .rec .label { font-size: 8.5px; letter-spacing: .12em; }
  .rec { justify-self: center; margin-top: 10px; padding: 2px 9px; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.3); }
  .rec:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* A magic eye: two green bars that close on each other as the room's lights come up. */
  .eye { position: relative; width: 66px; height: 20px; overflow: hidden; border: 2px solid var(--case); border-radius: 10px; background: #07140b; box-shadow: inset 0 0 6px #000, 0 1px 0 rgba(255,255,255,.3); }
  .eye i { position: absolute; top: 2px; bottom: 2px; width: calc(6% + var(--shut, 0) * 44%); opacity: calc(.3 + var(--shut, 0) * .7); background: linear-gradient(#b8ffcf, #35e36f 40%, #0c9a3e); box-shadow: 0 0 8px #3dff7d; transition: width 1s, opacity 1s; }
  .eye i:first-child { left: 0; } .eye i:last-child { right: 0; }

  /* Meters. The two at the top have needles: a cream face under perspex, and a fine black
     needle on a layer of its own (../needle.ts), which wavers three quarters as far as
     Bakelite's (owner, 2026-11-15: the wobble falls by a quarter with each decade). */
  .meter { text-align: center; }
  .meter > .label { margin-top: 6px; }
  .win { position: relative; overflow: hidden; aspect-ratio: 120 / 70; max-width: 100%; border: 4px solid var(--case); border-radius: 5px; background: linear-gradient(#fbf8ec, #ebe6d2); box-shadow: 0 3px 5px rgba(0,0,0,.45); }
  .unlit .win { background: #8f918c; }
  .face { width: 100%; height: 100%; }
  .scale { fill: none; stroke: var(--case); stroke-width: .5; } .over { fill: none; stroke: #c2281c; stroke-width: 1.6; }
  .face text { fill: var(--case); font-size: 6px; text-anchor: middle; } .face .unit { font-size: 6.5px; }
  .needle { position: absolute; inset: 0; transform-origin: 50% 137.14%; transition: transform 1.1s cubic-bezier(.3, 1.6, .5, 1); }
  .waver { width: 100%; height: 100%; transform-origin: 50% 137.14%; animation: waver 1.2s ease-in-out infinite; }
  .waver path { stroke: var(--case); stroke-width: .45; }
  @keyframes waver { 0% { transform: rotate(0deg); } 14% { transform: rotate(.375deg); } 29% { transform: rotate(-.225deg); } 43% { transform: rotate(.525deg); } 57% { transform: rotate(-.45deg); } 71% { transform: rotate(.15deg); } 86% { transform: rotate(-.3deg); } }
  .cowl { position: absolute; left: 0; right: 0; bottom: 0; height: 13%; background: var(--case); }
  /* The perspex front: a little of the light on it. */
  .meter:not(.display) .win::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, rgba(255,255,255,.6) 0 10%, transparent 28%); }
  /* A room's meter: its reading in nixie tubes, behind a dark window. */
  .display .win { display: flex; align-items: center; justify-content: center; gap: 6px; background: #140a06; }
  .display .nixies { --fig: 36px; }
  .display .unit { align-self: flex-end; margin-bottom: 16%; color: #c9b9a6; font-size: 10px; }

  /* Nixie tubes. A tube holds all ten figures, stacked: each sits a little to one side
     of the one behind it (--z is its place in the stack). The unlit ones are faint wire.
     The lit one glows, and those after it in the tube, which are in front of it, cross
     it as fine dark lines. Over them all is the anode, a mesh. */
  .nixies { display: inline-flex; gap: 2px; font-size: var(--fig, 24px); }
  .nix { position: relative; width: .9em; height: 1.45em; overflow: hidden; border: 1px solid rgba(255,255,255,.28); border-radius: .45em .45em .12em .12em;
    background: linear-gradient(90deg, rgba(255,255,255,.2), transparent 25% 75%, rgba(255,255,255,.1)), #140a06; }
  .nix.on { background: radial-gradient(ellipse at 50% 55%, rgba(255,120,30,.3), transparent 72%), linear-gradient(90deg, rgba(255,255,255,.2), transparent 25% 75%, rgba(255,255,255,.1)), #140a06; }
  .nix b { position: absolute; inset: 0; display: grid; place-items: center; color: transparent; font: 200 1em/1 "Helvetica Neue", "Avenir Next", Roboto, sans-serif; -webkit-text-stroke: .35px rgba(178,160,146,.2); transform: translateX(calc((var(--z, 4.5) - 4.5) * .016em)); }
  .nix b.lit { color: #ffb05a; font-weight: 300; -webkit-text-stroke: .5px #ffd9a8; text-shadow: 0 0 .12em #ff7a10, 0 0 .4em #ff5a00; }
  .nix b.lit ~ b { -webkit-text-stroke: .35px rgba(60,24,8,.38); }
  .nix u { position: absolute; right: .1em; bottom: .16em; width: .1em; height: .1em; border-radius: 50%; background: rgba(178,160,146,.3); } .nix u.lit { background: #ffb866; box-shadow: 0 0 .25em #ff6a00; }
  .nix::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(60deg, rgba(0,0,0,.2) 0 .5px, transparent .5px 3.5px), repeating-linear-gradient(-60deg, rgba(0,0,0,.2) 0 .5px, transparent .5px 3.5px); }

  /* Alerts: a neon lamp, and what is wrong on a strip torn from the teleprinter. A critical one flashes. */
  .lamps { display: flex; flex-wrap: wrap; gap: 10px 24px; margin-bottom: 14px; padding: 12px 14px; }
  .alert { display: flex; align-items: center; gap: 9px; max-width: 100%; }
  .jewel { flex: none; width: 12px; height: 20px; border-radius: 6px; background: radial-gradient(ellipse at 50% 40%, #ffe2b0, var(--glow) 60%, #7a2a00); box-shadow: 0 0 10px var(--glow); }
  .jewel.nominal { --glow: #4fdc4f; } .jewel.task { --glow: #e9c98a; } .jewel.warning { --glow: #ff9a1e; } .jewel.error, .jewel.critical { --glow: #ff4a1e; }
  .jewel.critical { animation: flash 1s steps(2, jump-none) infinite; }
  @keyframes flash { 0% { opacity: .35; } 100% { opacity: 1; } }
  .alert .label { padding: 3px 16px 3px 8px; background: #f2ecd9; color: #222; font: 12px/1.35 "Courier New", Courier, monospace; letter-spacing: .04em; text-shadow: none; transform: rotate(-.4deg);
    clip-path: polygon(0 0, 100% 0, calc(100% - 4px) 25%, 100% 50%, calc(100% - 4px) 75%, 100% 100%, 0 100%); }
  .alert:nth-child(even) .label { transform: rotate(.3deg); }

  /* An instrument knob over its engraved scale: eleven lines round three quarters of a turn. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; min-height: 152px; }
  .dial.heat { min-height: 184px; }
  .dial.sound .note { height: 42px; overflow: hidden; }
  .dimmer { position: relative; width: 104px; height: 104px; margin: 6px auto 4px; }
  .dimmer::before { content: ""; position: absolute; inset: 6px; border-radius: 50%; background: repeating-conic-gradient(from 224.5deg, var(--ink) 0 1deg, transparent 1deg 27deg);
    -webkit-mask: radial-gradient(circle, transparent 0 60%, #000 61% 70%, transparent 71%), conic-gradient(from 224deg, #000 0 272deg, transparent 272deg); -webkit-mask-composite: source-in; mask-composite: intersect; }
  /* The knob, in layers. Its skirt and its shadow do not turn, nor does the light on it;
     the fluted grip and the index line on the skirt do. --mid is the grip's coloured middle. */
  .knob { --mid: #4d5459; position: absolute; inset: 15px; border-radius: 50%; cursor: grab; touch-action: none; background: #c9ced2; box-shadow: 0 0 0 1px #555c61, 0 6px 9px rgba(0,0,0,.5); }
  .grip { position: absolute; inset: 0; border-radius: 50%; transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s;
    background: radial-gradient(circle, var(--mid) 0 14%, transparent 15%), radial-gradient(circle, transparent 0 56%, #c9ced2 57%), repeating-conic-gradient(#15181a 0 8deg, #3d444a 8deg 16deg); }
  .knob.drag .grip { transition: none; }
  .grip::after { content: ""; position: absolute; left: 50%; top: 2px; width: 2px; height: 14px; margin-left: -1px; background: var(--case); }
  .knob::after { content: ""; position: absolute; inset: 0; border-radius: 50%; pointer-events: none; background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.28), transparent 45%), radial-gradient(circle at 70% 78%, rgba(0,0,0,.3), transparent 55%); }
  .knob:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  /* A blind's knob has a brass middle, the heating's red, a player's ivory and a fan's green. */
  .knob.wind { --mid: #b89238; } .knob.heat { --mid: #b3261b; } .knob.sound { --mid: #e6dfc8; } .knob.air { --mid: #3f7a5a; }
  /* A setting's tubes, in a dark window under the knob's legend. */
  .dial > .nixies { margin-top: 5px; padding: 2px 3px; border-radius: 3px; background: var(--case); }
  .dial > .nixies, .note { display: flex; width: fit-content; margin-left: auto; margin-right: auto; }
  .note { margin-top: 4px; } .note .label { font-size: 8px; letter-spacing: .08em; text-transform: none; }

  /* A lever key under a neon pilot. A button centres what is in it: the key is pinned to
     the top instead, with its legend under it. Down is on. */
  .dolly { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 92px; min-height: 100px; margin-top: 10px; text-align: center; }
  .key { position: relative; flex: none; }
  .dolly svg { width: 44px; height: 66px; margin-bottom: 4px; }
  .lever { transform-origin: 22px 39px; transition: transform .1s cubic-bezier(.5, 0, 1, .5); }
  .dolly.on .lever { transform: scaleY(-1); }
  .pilot { fill: #5a2a10; stroke: var(--case); transition: fill .15s; } .dolly.on .pilot { fill: #ffb070; }
  .glow { fill: #ff7a2a; opacity: 0; transition: opacity .15s; } .dolly.on .glow { opacity: .4; }
  /* A guard over a key that must not be thrown by accident: a red cover, hinged at its
     top and lifted by the first press. Lifted, it takes no presses: in WebKit a cover
     folded small still took them, and the key under it could not be thrown. */
  .cover { position: absolute; left: 5px; right: 5px; top: 19px; bottom: 2px; border-radius: 3px; background: linear-gradient(90deg, rgba(160,15,12,.94), rgba(238,62,50,.88) 40%, rgba(140,10,10,.94)); box-shadow: 0 2px 3px rgba(0,0,0,.5); transform-origin: top; transition: transform .18s; }
  .dolly.up .cover { transform: scaleY(.12); pointer-events: none; }
  .dolly .label { font-size: 8px; letter-spacing: .1em; }
  .dolly.away { cursor: default; } .dolly.away .key { opacity: .5; } .dolly.away .pilot { fill: #222; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible svg { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px; }

  /* An alarm: how it stands, thumbwheels for its code, and its keys. */
  .alarm { flex: 0 1 140px; display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 10px; }
  .alarm > .label { display: flex; align-items: center; justify-content: center; width: 132px; min-height: 33px; }
  .alarm.sounding > .label { color: #ffd2c8; text-shadow: 0 0 6px #ff3a22; }
  /* Thumbwheels: black wheels with white figures, seen from the front. The figures above
     and below the one in front curve away; a press on a wheel's top half turns it on by
     one and on its bottom half back, and the figures roll to their new places. */
  .wheels { display: flex; gap: 1.5px; padding: 3px; border-radius: 2px; background: #000; box-shadow: 0 0 0 1px #9aa2a7, 0 2px 3px rgba(0,0,0,.5); }
  .wheel { position: relative; width: 20px; height: 62px; overflow: hidden; border-radius: 1.5px; background: linear-gradient(#000, #26282a 28%, #3c3f42 50%, #26282a 72%, #000); color: #f4f1e6; font: 700 15px/20px "Helvetica Neue", Helvetica, Arial, sans-serif; text-align: center; }
  .wheel::before, .wheel::after { content: ""; position: absolute; left: 0; right: 0; height: 1px; background: #000; box-shadow: 0 1px 0 rgba(255,255,255,.14); }
  .wheel::before { top: 19px; } .wheel::after { bottom: 20px; }
  .wheel span { position: absolute; left: 0; right: 0; top: 21px; height: 20px; opacity: .45; transform: translateY(calc(var(--n) * 24px)) scaleY(.65); transition: transform .45s cubic-bezier(.45, 0, .3, 1.2); }
  .wheel span.at { opacity: 1; transform: none; }
  .wheel button { position: absolute; left: 0; right: 0; height: 50%; } .wheel button:first-of-type { top: 0; } .wheel button:last-of-type { bottom: 0; }
  .wheel button:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
  .pushes { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .push { text-align: center; }
  .push .key { display: block; width: 30px; height: 30px; margin: 3px auto 5px; border: 2px solid var(--case); border-radius: 3px; background: linear-gradient(160deg, rgba(255,255,255,.8), rgba(215,222,226,.5)); box-shadow: 0 3px 4px rgba(0,0,0,.5); }
  .push:active .key { transform: translateY(1px); }
  .push .label { font-size: 8px; letter-spacing: .1em; }
  .push:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 3px; }

  /* A camera: a black-and-white tube, its glass bulging at the corners, with its lines.
     The tube's height is set by padding, not an aspect ratio, which grew without end in WebKit. */
  .tv { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex: 0 1 150px; min-height: 146px; margin-top: 10px; text-align: center; }
  .tube { display: block; position: relative; flex: none; align-self: stretch; height: 0; padding-top: calc((100% - 12px) * .75); margin: 0 6px 8px; overflow: hidden; border-radius: 18% / 22%; background: radial-gradient(#27302b, #0a0d0b); box-shadow: 0 0 0 6px var(--case), 0 5px 8px 5px rgba(0,0,0,.4); }
  .tube img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.2) brightness(1.1); }
  .tube::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px), radial-gradient(ellipse, rgba(140,170,255,.1) 40%, rgba(0,0,0,.6)); }
  .top > .tv { flex-basis: 170px; margin-top: 0; padding: 18px 10px 8px; }
  .tv:focus-visible .tube { outline: 2px solid var(--ink); outline-offset: 8px; }

  /* Scenes: large round pushes, lit from behind for a moment when pressed. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 10px; align-items: center; padding: 14px; }
  .knife .key { display: grid; place-items: center; width: 56px; height: 56px; padding: 0 3px; border: 3px solid var(--case); border-radius: 50%; color: #222; font-size: 8px; line-height: 1.1; letter-spacing: .05em; text-transform: uppercase; text-align: center; overflow-wrap: anywhere;
    background: radial-gradient(circle at 35% 30%, #fffdf2, #d2ccb6 70%); box-shadow: 0 0 0 2px #b9bec2, 0 4px 6px rgba(0,0,0,.5); }
  .knife.closed .key { background: radial-gradient(circle at 40% 35%, #fff6c9, #ffb53c 75%); box-shadow: 0 0 0 2px #b9bec2, 0 0 16px #ffad33; }
  .knife:active .key { transform: translateY(1px); }
  .knife:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 4px; }

  /* The recorder: a room's day on an oscilloscope (../scope.ts), on a plate of its own. */
  dialog.recorder { width: min(760px, 94vw); padding: 14px; border: 0; border-radius: 3px; color: #f3f1e6; text-align: center; font-family: "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif;
    --ink: #f3f1e6; --case: #17191b; background: linear-gradient(175deg, #8ba4b0, #6f8996); box-shadow: 0 20px 40px rgba(0,0,0,.6); }
  dialog.recorder::backdrop { background: rgba(0,0,0,.55); }
  dialog.recorder > .label { font-size: 12px; letter-spacing: .2em; }
  .scope { width: 100%; height: auto; margin: 10px 0 8px; border-radius: 22px; box-shadow: 0 0 0 6px var(--case), inset 0 0 30px #000; }
  .scope text { fill: #7dffc0; font-size: 9px; }
  .scope .lane { text-anchor: end; letter-spacing: .04em; } .scope .hour { font-size: 8px; text-anchor: middle; opacity: .7; }

  @media (prefers-reduced-motion: reduce) { .waver, .jewel.critical { animation: none; } .needle, .grip, .wheel span, .eye i { transition: none; } }
`, Ol = "dash-bored-nixie", kl = class extends Ss {
	constructor(...e) {
		super(...e), this.kit = {
			...ml,
			recorder: Hc(gl, Tl)
		};
	}
	static {
		this.styles = [
			W,
			Cs,
			Dl
		];
	}
}, Al = b`
  .panel { --ink: #141516; --plate: #c9cccf; box-sizing: border-box; min-height: 100%; padding: 18px 22px; color: var(--ink);
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    /* Teak veneer: long grain across the cabinet. */
    background: repeating-linear-gradient(88deg, rgba(0,0,0,.09) 0 2px, transparent 2px 7px, rgba(255,255,255,.04) 7px 9px, transparent 9px 23px), linear-gradient(175deg, #8a5a33, #6b4020 60%, #7a4c28); }
  .panel * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; margin: 0 auto; overflow: visible; }
  .defs { position: absolute; }
  /* A legend. On the teak it is a small aluminium plate; on a faceplate it is printed straight on. */
  .label { display: inline-block; max-width: 100%; padding: 3px 8px; border-radius: 2px; background: linear-gradient(#e2e4e6, #b9bcbf); color: var(--ink);
    font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; box-shadow: 0 1px 2px rgba(0,0,0,.5); overflow-wrap: anywhere; }
  .room .label, dialog .label { padding: 2px 4px; background: none; box-shadow: none; }
  /* A device's name is an engraved strip: white laminate with black capitals cut through
     to its core, fixed over the control by whoever fitted the panel. */
  .dial > .label, .dolly > .label, .tv > .label, .alarm > .label, .push > .label, .meter > .label { padding: 2.5px 7px 2px; border-radius: 1px; background: linear-gradient(#fbfaf5, #e9e7de); color: #17181a;
    font-size: 8.5px; font-weight: 600; letter-spacing: .1em; text-shadow: 0 .6px 0 rgba(255,255,255,.9); box-shadow: 0 1px 1.5px rgba(0,0,0,.45), inset 0 0 0 .5px rgba(0,0,0,.3), inset 0 1px 0 #fff; }
  .meter > .label { font-size: 9.5px; }

  .label .word { display: inline-block; white-space: nowrap; }
  .label i { font-style: normal; }

  /* What the house's owner added to the panel after it left the factory is embossed tape
     from a label maker: the names of the floors and rooms, what is wrong with a sensor,
     what a player has on. --tape is the letter's size; everything else follows from it.
     The tape is glossy black vinyl: a bright line along its upper edge where it curves
     over, a band of sheen across it, and a duller lower edge. */
  .floor .label, .room > .label, .alert .label, .note:not(.reading) .label { --tape: 12px; padding: calc(var(--tape) * .42) calc(var(--tape) * .9) calc(var(--tape) * .34) calc(var(--tape) * .7); border-radius: 1px;
    color: #8b9196; font: 500 var(--tape)/1.5 "Avenir Next", "DIN Alternate", "Helvetica Neue", Helvetica, Arial, sans-serif; letter-spacing: 0; text-transform: uppercase; word-spacing: calc(var(--tape) * .5);
    background: linear-gradient(101deg, transparent 0 8%, rgba(255,255,255,.3) 15%, rgba(255,255,255,.07) 23%, transparent 34%, transparent 52%, rgba(255,255,255,.2) 61%, rgba(255,255,255,.05) 70%, transparent 82%),
      linear-gradient(180deg, rgba(255,255,255,.8) 0, rgba(255,255,255,.34) 6%, rgba(255,255,255,.14) 20%, rgba(255,255,255,.02) 42%, transparent 66%, rgba(255,255,255,.12) 86%, rgba(255,255,255,.4) 96%, rgba(0,0,0,.5)), #08090b;
    box-shadow: 0 1.5px 2.5px rgba(0,0,0,.6), 0 0 0 .5px #000;
    clip-path: polygon(0 3%, 100% 0, calc(100% - 1px) 100%, 1px 97%); }
  /* Each letter has the same width, as the embossing wheel gives it, and is struck a little
     off the line. It is raised: lit from the upper left, with its shadow to the lower
     right, and its edges are white where the vinyl has stretched. Round it is the pale
     patch the die leaves. */
  .floor .label i, .room > .label i, .alert .label i, .note:not(.reading) .label i { display: inline-block; width: calc(var(--tape) * .98); text-align: center; transform: translateY(var(--y)) rotate(var(--r));
    background: radial-gradient(ellipse 62% 58% at 50% 52%, rgba(255,255,255,.13), rgba(255,255,255,.05) 55%, transparent 78%);
    /* The stroke is the bright rim of the raised letter, and the fill its greyer face. */
    -webkit-text-stroke: calc(var(--tape) * .055) #cfd3d6; paint-order: stroke fill;
    text-shadow: -.4px -.5px 0 rgba(230,233,235,.85), 1.1px 1.4px 1.1px rgba(0,0,0,.95), 0 0 3px rgba(255,255,255,.28); }
  .floor .label { --tape: 14px; transform: rotate(-.5deg); }
  .room > .label { margin-bottom: 5px; transform: rotate(.6deg); }
  .room:nth-child(even) > .label { transform: rotate(-.7deg); }
  /* A message too long for one strip is cut into a strip for each line. */
  .alert .label { display: inline; line-height: 2.25; clip-path: none; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .alert:nth-child(odd) { transform: rotate(.25deg); } .alert:nth-child(even) { transform: rotate(-.3deg); }
  .note:not(.reading) .label { --tape: 9px; transform: rotate(-.8deg); }
  .note.reading .label { font-size: 8px; font-weight: 500; letter-spacing: .08em; text-transform: none; }

  /* What must never be missed: a lost connection, a refused action. A red lamp and a plate. */
  .warn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .warn .label { font-size: 12px; letter-spacing: .06em; text-transform: none; }
  .lamp { flex: none; width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffd0c8, #ff2a1a 55%, #a30f08); box-shadow: 0 0 0 2px var(--ink), 0 0 10px #ff3a22; }

  .top { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end; margin-bottom: 16px; }
  .top .meter { flex: 0 1 190px; }
  /* A faceplate: brushed aluminium, a socket screw in each corner. */
  .room { padding: 16px 10px 14px; border-radius: 3px; text-align: center;
    background: radial-gradient(circle at 9px 9px, #2a2c2e 0 1.6px, #8e9296 1.7px 3.6px, transparent 4px), radial-gradient(circle at calc(100% - 9px) 9px, #2a2c2e 0 1.6px, #8e9296 1.7px 3.6px, transparent 4px),
      radial-gradient(circle at 9px calc(100% - 9px), #2a2c2e 0 1.6px, #8e9296 1.7px 3.6px, transparent 4px), radial-gradient(circle at calc(100% - 9px) calc(100% - 9px), #2a2c2e 0 1.6px, #8e9296 1.7px 3.6px, transparent 4px),
      repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 3px), linear-gradient(180deg, #dfe1e3, #bfc2c5 55%, #d3d5d7);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.7), inset 0 -1px 0 rgba(0,0,0,.3), 0 6px 12px rgba(0,0,0,.45); }
  /* Every control is fixed to the plate. It hangs from the top of its row and keeps the
     same height whatever its lettering says, with room under it for a strip of two lines,
     so a name that grows or a display that changes moves nothing (owner, 2026-11-15). */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px 6px; }
  .works > .meter { flex: 0 1 150px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .7; }
  .more .label, .rec .label { font-size: 8.5px; letter-spacing: .12em; }
  .rec { margin-top: 10px; padding: 1px 6px; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.45); }
  .rec:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* A room's lights: five red LEDs. */
  .leds { display: flex; justify-content: center; gap: 6px; margin: 0 0 8px; }
  .leds span { width: 9px; height: 9px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #7a2a24, #3a0b08); box-shadow: 0 0 0 1.5px var(--ink); transition: background .4s, box-shadow .4s; }
  .leds .on { background: radial-gradient(circle at 35% 30%, #ffd9d2, #ff2a1a 55%, #a30f08); box-shadow: 0 0 0 1.5px var(--ink), 0 0 8px #ff3a22; }

  /* Panel meters: the window is drawn in kit.ts, the lettering set here. The needle
     wavers, each meter at a pace of its own, but half as far as Bakelite's: a needle's
     wobble falls with the decade, from all of it in the 1950s to none in the 1990s
     (owner, 2026-11-15). */
  .meter { text-align: center; }
  .meter svg { width: 100%; height: auto; margin-bottom: 5px; filter: drop-shadow(0 3px 4px rgba(0,0,0,.45)); }
  .needle { transform-origin: 60px 74px; transition: transform 1.1s cubic-bezier(.3, 1.7, .5, 1); }
  .waver { transform-origin: 60px 74px; animation: waver 1.2s ease-in-out infinite; }
  @keyframes waver { 0% { transform: rotate(0deg); } 14% { transform: rotate(.25deg); } 29% { transform: rotate(-.15deg); } 43% { transform: rotate(.35deg); } 57% { transform: rotate(-.3deg); } 71% { transform: rotate(.1deg); } 86% { transform: rotate(-.2deg); } }
  .meter text { fill: #101614; font-size: 6px; font-weight: 600; text-anchor: middle; }
  .meter .legend { font-size: 4.2px; letter-spacing: .14em; }

  /* The annunciator: Sensor Watch's alerts, a lit window and a plate each. A critical one flashes. */
  .lamps { display: flex; flex-wrap: wrap; gap: 9px 16px; margin-bottom: 16px; }
  .alert { position: relative; max-width: 100%; min-height: 36px; padding: 5px 0 0 98px; }
  .alert .jewel { position: absolute; left: 4px; top: 4px; height: 30px; }
  /* An annunciator window, after a ship's control board: a stepped black bezel standing
     proud of the panel, and recessed in it a milky lens with the level engraved in dark
     capitals. The lamp is behind the lens: brightest in the middle, and the level's
     colour (--glow). The border is the bezel, lighter along its top where the light falls. */
  .jewel { display: flex; flex: none; align-items: center; justify-content: center; width: 74px; padding: 0 3px; border: 5px solid #141516; border-top-color: #2f3134; border-bottom-color: #08090a; border-radius: 4px;
    color: rgba(34, 26, 20, .9); font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; text-shadow: 0 1px 0 rgba(255,255,255,.55);
    background: radial-gradient(ellipse 70% 90% at 50% 45%, rgba(255,255,255,.85), rgba(255,255,255,.25) 60%, rgba(0,0,0,.14)), var(--glow); background-clip: padding-box;
    box-shadow: 0 0 0 1px #000, 0 0 0 2.5px #2b2d30, 0 0 0 3.5px #000, 0 3px 4px 3px rgba(0,0,0,.5), inset 0 0 0 1px rgba(0,0,0,.55), inset 0 3px 5px rgba(0,0,0,.35), 0 0 16px 2px var(--glow); }
  .jewel.nominal { --glow: #4fdc4f; } .jewel.task { --glow: #f1ede2; } .jewel.warning { --glow: #ffb326; } .jewel.error, .jewel.critical { --glow: #ff4b36; }
  /* A critical one flashes: between lit and the grey-white of a lens with no lamp behind it. */
  .jewel.critical { animation: flash 1s steps(2, jump-none) infinite; }
  @keyframes flash { 0% { background: linear-gradient(#d9d6cd, #b9b6ad); background-clip: padding-box; box-shadow: 0 0 0 1px #000, 0 0 0 2.5px #2b2d30, 0 0 0 3.5px #000, 0 3px 4px 3px rgba(0,0,0,.5), inset 0 0 0 1px rgba(0,0,0,.55), inset 0 3px 5px rgba(0,0,0,.35); } }

  /* A machined knob, in layers. Its knurled edge and its line turn with the level; the
     light on its spun face and its shadow stay where they are. --dot is the colour of its
     centre, which says what kind of thing it sets. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; }
  .dimmer { position: relative; width: 104px; height: 104px; margin: 6px auto 4px; }
  .dimmer svg { position: absolute; inset: 0; }
  .knob { --dot: #1b1c1d; position: absolute; inset: 17px; border-radius: 50%; cursor: grab; touch-action: none; box-shadow: 0 8px 10px rgba(0,0,0,.45), 0 2px 3px rgba(0,0,0,.5), 0 0 0 1px rgba(0,0,0,.55); }
  .knob span { position: absolute; border-radius: 50%; }
  .flutes, .mark { inset: 0; transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .knob.drag .flutes, .knob.drag .mark { transition: none; }
  .flutes { background: repeating-conic-gradient(#7f8387 0deg, #eef0f1 2deg, #7f8387 4deg); }
  .knob::before { content: ""; position: absolute; inset: 0; z-index: 1; border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle at 30% 24%, rgba(255,255,255,.45), transparent 50%), radial-gradient(circle at 72% 80%, rgba(0,0,0,.4), transparent 58%); }
  /* The face: spun aluminium, which catches the light in wedges. */
  .knob .cap { inset: 11%; z-index: 2; box-shadow: 0 0 0 1px rgba(0,0,0,.5), inset 0 1px 1px rgba(255,255,255,.8), inset 0 -2px 3px rgba(0,0,0,.35);
    background: conic-gradient(from 25deg, #f4f5f6, #9a9ea2 11%, #e6e8e9 24%, #84888c 38%, #f1f2f3 51%, #9da1a5 63%, #e2e4e6 76%, #868a8e 89%, #f4f5f6); }
  .knob .cap::after { content: ""; position: absolute; inset: 34%; border-radius: 50%; background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), transparent 55%), var(--dot); box-shadow: 0 0 0 1px rgba(0,0,0,.6), inset 0 -1px 2px rgba(0,0,0,.5); }
  .mark { z-index: 3; pointer-events: none; }
  .mark::after { content: ""; position: absolute; left: 50%; top: 5%; width: 3px; height: 30%; margin-left: -1.5px; border-radius: 1px; background: var(--ink); box-shadow: 0 0 0 .5px rgba(255,255,255,.5); }
  .knob:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  .knob.wind { --dot: #2f6fd0; } .knob.sound { --dot: #e3a21a; } .knob.air { --dot: #2f9a5a; }
  /* The heating's knob is the pointer knob in the middle of its dial: black, with a white
     line that reaches to the scale. The dial's face and hand are drawn in kit.ts. */
  .knob.heat { inset: 29px; }
  .knob.heat .flutes { background: repeating-conic-gradient(#0b0b0b 0deg, #303234 6deg, #0b0b0b 12deg); }
  .knob.heat .cap { inset: 16%; background: radial-gradient(circle at 34% 28%, #55585b, #0e0f10 72%); box-shadow: 0 0 0 1px #000, inset 0 2px 2px rgba(255,255,255,.25), inset 0 -3px 4px rgba(0,0,0,.6); }
  .knob.heat .cap::after { display: none; }
  .knob.heat .mark::after { top: -7px; width: 3.2px; height: 58%; margin-left: -1.6px; background: linear-gradient(#f6f6f3 0 46%, #0e0f10 46%); box-shadow: 0 0 0 .5px rgba(0,0,0,.6); }
  .face { fill: #f8f7f1; } .figures text { font-size: 6.2px; font-weight: 700; text-anchor: middle; }
  .hand { transform-origin: 52px 52px; transition: transform 1.1s cubic-bezier(.3, 1.4, .5, 1); }
  .note { display: block; margin-top: 4px; }
  /* A player's tape has three lines' room kept for it, and anything longer is cut off there. */
  .dial.sound .note { height: 50px; overflow: hidden; }
  /* A setting in red digits, with the glow of the LEDs behind the window. */
  .readout { margin: 3px auto 0; filter: drop-shadow(0 0 2px rgba(255,58,34,.55)); }

  /* Toggle switches: up is on. The lever is drawn up and thrown over for off. */
  /* A button centres what is in it. The drawing is pinned to the top instead, with the strip under it. */
  .dolly { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 92px; min-height: 116px; margin-top: 8px; text-align: center; }
  .dolly.shut, .dolly.up { min-height: 145px; }
  .dolly svg { flex: none; width: 62px; height: auto; margin: 0; filter: drop-shadow(0 3px 3px rgba(0,0,0,.4)); }
  .dolly > .label { font-size: 8px; }
  .onoff { fill: #f4f4f2; font-size: 4.4px; font-weight: 700; letter-spacing: .04em; text-anchor: middle; text-transform: uppercase; }
  .dolly .lever { transform-origin: 29px 46px; transform: scaleY(-1); transition: transform .09s cubic-bezier(.5, 0, 1, .5); }
  .dolly.on .lever { transform: none; }
  .dolly .pilot { fill: #4a0d0a; transition: fill .15s; }
  .dolly.on .pilot { fill: #ff3322; filter: drop-shadow(0 0 4px #ff3322); }
  /* The red cover is hinged above the switch, and the first press flips it up. It is
     drawn twice: shut, it folds away towards the hinge, and then the open one unfolds
     above it, which reads as one cover swinging over. */
  .dolly .shell { transform-origin: 29px 4.5px; }
  /* The cover that is folded away takes no presses. Why: WebKit still took a tap on one
     folded to nothing, so a press on the switch under a lifted cover never reached it (2026-11-15). */
  .dolly.up .shut-shell, .dolly.shut .up-shell { pointer-events: none; }
  .dolly .shut-shell { transition: transform .12s ease-in .1s; }
  .dolly.up .shut-shell { transform: scaleY(0); transition-delay: 0s; }
  .dolly .up-shell { transform: scaleY(0); transition: transform .12s ease-in; }
  .dolly.up .up-shell { transform: scaleY(1); transition: transform .14s ease-out .1s; }
  .dolly.away { cursor: default; } .dolly.away svg { opacity: .5; } .dolly.away .pilot { fill: #222; filter: none; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible svg { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* An alarm: how it stands, thumbwheels for its code, and keys. The thumbwheels are black
     plastic with white figures, as the switches of the time were. */
  .alarm { flex: 0 1 140px; display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 10px; }
  /* The alarm's strip is the same size whatever it says, since the thumbwheels are under it. */
  .alarm > .label { display: flex; align-items: center; justify-content: center; width: 132px; min-height: 33px; }
  .alarm.sounding > .label { background: #ff4a35; }
  .wheels { display: flex; gap: 1.5px; padding: 3px; border-radius: 2px; background: #000; box-shadow: 0 0 0 1px #8e9296, 0 2px 3px rgba(0,0,0,.5); }
  /* One module: a window with one white figure, and a push button above it to step it on
     and one below to step it back. The figure rolls past the window when it is stepped. */
  .wheel { position: relative; width: 20px; height: 62px; overflow: hidden; border-radius: 1.5px; background: #17181a; color: #f4f4f2; font: 700 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif; text-align: center;
    box-shadow: inset 0 0 0 1px #000, inset 0 1px 0 rgba(255,255,255,.14); }
  .wheel::before { content: ""; position: absolute; left: 2px; right: 2px; top: 20px; height: 22px; border-radius: 1px; background: linear-gradient(#000, #101112 60%, #1d1e20); box-shadow: inset 0 2px 3px #000, 0 1px 0 rgba(255,255,255,.12); }
  .wheel span { position: absolute; left: 0; right: 0; top: 21px; height: 20px; transform: translateY(calc(var(--n) * 24px)); transition: transform .35s cubic-bezier(.45, 0, .3, 1.15); }
  .wheel button { position: absolute; left: 2.5px; right: 2.5px; height: 14px; border-radius: 2px; background: linear-gradient(#5b5e62, #2b2d2f); box-shadow: 0 0 0 1px #000, inset 0 1px 0 rgba(255,255,255,.3), 0 1px 1px rgba(0,0,0,.6); }
  .wheel button:first-of-type { top: 3px; } .wheel button:last-of-type { bottom: 3px; }
  .wheel button::after { position: absolute; inset: 0; color: #f4f4f2; font: 700 11px/13px "Helvetica Neue", Helvetica, Arial, sans-serif; }
  .wheel button:first-of-type::after { content: "+"; } .wheel button:last-of-type::after { content: "−"; }
  .wheel button:active { transform: translateY(.5px); background: linear-gradient(#3a3c3f, #1d1e20); }
  .wheel button:focus-visible { outline: 2px solid #f4f4f2; outline-offset: -1px; }
  .pushes { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .push { text-align: center; }
  .push .key { display: block; width: 30px; height: 22px; margin: 3px auto 5px; border-radius: 3px; background: linear-gradient(#f1f2f3, #a9adb1); box-shadow: 0 0 0 2px var(--ink), inset 0 1px 0 #fff, 0 3px 4px rgba(0,0,0,.5); }
  .push:active .key { transform: translateY(1px); }
  .push > .label { font-size: 7.5px; }
  .push:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 4px; }

  /* A colour television: a camera's picture behind a rounded glass, with its lines. */
  .tv { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex: 0 1 150px; min-height: 146px; margin-top: 10px; text-align: center; }
  /* The screen's height is set from its width by padding, with the picture laid over it.
     Why: with an aspect ratio and a picture as tall as its box, WebKit grew the screen
     without end (2026-11-15), and an old WebView has no aspect ratio at all. */
  .tube { display: block; position: relative; flex: none; align-self: stretch; height: 0; padding-top: calc((100% - 12px) * .75); margin: 0 6px 7px; overflow: hidden; border-radius: 13% / 16%; background: radial-gradient(#1c2428, #06090b);
    box-shadow: 0 0 0 4px var(--ink), 0 0 0 5.5px #e6e8ea, 0 5px 8px rgba(0,0,0,.5); }
  .tube img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; filter: saturate(1.35) contrast(1.06) sepia(.2) hue-rotate(-8deg) brightness(1.05); }
  .tube::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(125deg, rgba(255,255,255,.22), transparent 30%), repeating-linear-gradient(rgba(0,0,0,.16) 0 1px, transparent 1px 3px), radial-gradient(transparent 60%, rgba(0,0,0,.5));
    box-shadow: inset 0 0 12px #000; }
  .tv > .label { font-size: 8px; }
  .tv:focus-visible .tube { outline: 2px solid var(--ink); outline-offset: 7px; }
  .top .tv { flex-basis: 170px; }

  /* Scenes: a bank of illuminated push buttons, each with its legend on its face. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 3px; background: var(--ink); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 4px 8px rgba(0,0,0,.45); }
  .knife .key { display: flex; align-items: center; justify-content: center; min-width: 76px; max-width: 130px; min-height: 40px; padding: 4px 8px; border-radius: 3px; color: #3a2a10; text-align: center;
    font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; overflow-wrap: anywhere; background: linear-gradient(#efe6c6, #cdbb85);
    box-shadow: 0 0 0 2px #000, inset 0 1px 0 rgba(255,255,255,.7), inset 0 -3px 0 rgba(0,0,0,.22), 0 3px 4px rgba(0,0,0,.6); transition: background .12s, box-shadow .12s; }
  .knife.closed .key { transform: translateY(1px); background: linear-gradient(#fffbd6, #ffd24a); box-shadow: 0 0 0 2px #000, inset 0 1px 0 #fff, 0 0 16px #ffc93a; }
  .knife:focus-visible .key { outline: 2px solid #f1f1ef; outline-offset: 3px; }

  /* The recorder: an oscilloscope in an aluminium case. */
  dialog.recorder { width: min(760px, 94vw); padding: 14px; border: 0; border-radius: 4px; color: var(--ink); text-align: center;
    background: repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 3px), linear-gradient(180deg, #dfe1e3, #bfc2c5); box-shadow: 0 20px 40px rgba(0,0,0,.6); }
  dialog.recorder::backdrop { background: rgba(0,0,0,.55); }
  dialog.recorder > .label { font-size: 12px; letter-spacing: .2em; }
  .scope { width: 100%; height: auto; margin: 10px 0 8px; border-radius: 14px; box-shadow: 0 0 0 5px var(--ink), 0 0 0 6px #f1f2f3, inset 0 0 30px #000; }
  .scope text { fill: #7dffc0; font-size: 9px; }
  .scope .lane { text-anchor: end; letter-spacing: .04em; } .scope .hour { font-size: 8px; text-anchor: middle; opacity: .7; }

  /* On a phone an alert's window sits over its tape, which is cut narrower, so that one
     long word (an entity's id) still fits across the screen. */
  @media (max-width: 520px) {
    .alert { padding: 44px 0 0; }
    .alert .label { --tape: 10px; }
  }
  @media (prefers-reduced-motion: reduce) { .waver, .jewel.critical { animation: none; } .needle, .wheel span { transition: none; } }
`, jl = "dash-bored-silverface", Ml = class extends Ss {
	constructor(...e) {
		super(...e), this.kit = {
			...rc,
			recorder: Hc(ac, Ec)
		};
	}
	static {
		this.styles = [
			W,
			Cs,
			Al
		];
	}
}, Nl = Ia(class extends La {
	constructor() {
		super(...arguments), this.key = F;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (Ga(e), this.key = t), n;
	}
}), Pl = Ia(class extends La {
	constructor(e) {
		if (super(e), e.type !== Fa.PROPERTY && e.type !== Fa.ATTRIBUTE && e.type !== Fa.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!Ba(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === P || t === F) return t;
		let n = e.element, r = e.name;
		if (e.type === Fa.PROPERTY) {
			if (t === n[r]) return P;
		} else if (e.type === Fa.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return P;
		} else if (e.type === Fa.ATTRIBUTE && n.getAttribute(r) === t + "") return P;
		return Ga(e), t;
	}
}), Fl = {
	kicker: "Stop press",
	head: ["{name} gives cause for alarm"],
	deck: "{message}",
	body: "The reading stood at {reading} in the {area} as this edition went to press, and the trouble dates from {since}.",
	plain: "The trouble in the {area} dates from {since}.",
	worse: "Matters have worsened since our earlier report."
}, Il = {
	label: "Broadsheet",
	name: "The Casa Courier",
	strap: "",
	price: "Price: nothing",
	flash: "Stop press",
	ticker: "",
	titles: {
		more: "Other news",
		briefs: "In brief",
		late: "Late news",
		archive: "Thirty minutes ago",
		temps: "The temperatures",
		board: "The switchboard",
		notices: "Notices",
		elsewhere: "Elsewhere",
		gaps: "Corrections and clarifications",
		personal: "Personal",
		celebrity: "Amusements",
		weather: "The weather",
		desk: "From our own correspondent"
	},
	join: "; ",
	end: ".",
	nothing: "Nothing has happened yet.",
	rest: "In {n_word} room{s} nothing is switched on.",
	gaps: {
		loose: "{N} device{s} of no fixed abode",
		plumbing: "{N} suspected of being plumbing",
		clash: "{N} device{s} sharing a name with a neighbour",
		floorless: "{N} room{s} on no floor",
		cold: "{N} room{s} without a thermometer"
	},
	mend: "Each opens where it is put right. An area, a floor, a name or a temperature sensor in Home Assistant, and this paper reports the better for it.",
	words: {
		percent: "{n} per cent",
		degrees: "{n}°",
		"climate.on": "the {name} is set to {level}",
		"climate.plain": "the {name} is at work",
		"climate.off": "the {name} is off",
		"media_player.on": "the {name} is playing at {level}",
		"media_player.plain": "the {name} is playing",
		"media_player.off": "the {name} is silent",
		"camera.off": "the {camera} keeps watch",
		"fan.on": "the {name} turn{v} at {level}",
		"fan.plain": "the {name} {is} turning",
		"fan.off": "the {name} {is} still",
		"valve.on": "the {name} stand{v} {level} open",
		"valve.plain": "the {name} {is} open",
		"valve.off": "the {name} {is} shut",
		"vacuum.on": "the {name} is cleaning",
		"vacuum.off": "the {name} is at rest",
		"vacuum.docked": "the {name} is docked",
		"vacuum.returning": "the {name} is on its way home",
		"vacuum.paused": "the {name} has paused",
		"vacuum.error": "the {name} has come to grief",
		"lawn_mower.on": "the {name} is mowing",
		"lawn_mower.off": "the {name} is at rest",
		"lawn_mower.docked": "the {name} is docked",
		"lawn_mower.returning": "the {name} is on its way home",
		"lawn_mower.paused": "the {name} has paused",
		"lawn_mower.error": "the {name} has come to grief",
		"water_heater.on": "the {name} is set to {level}",
		"water_heater.plain": "the {name} is heating",
		"water_heater.off": "the {name} is off",
		"humidifier.on": "the {name} is set to {level}",
		"humidifier.plain": "the {name} is running",
		"humidifier.off": "the {name} is off",
		"siren.on": "the {name} is sounding",
		"siren.off": "the {name} is silent",
		"alarm_control_panel.on": "the {alarm} is set",
		"alarm_control_panel.off": "the {alarm} is not set",
		"alarm_control_panel.arming": "the {alarm} is being set",
		"alarm_control_panel.pending": "the {alarm} is about to sound",
		"alarm_control_panel.triggered": "the {alarm} is sounding",
		"light.on": "the {lamp} burn{v} at {level}",
		"light.plain": "the {lamp} {is} lit",
		"light.off": "the {lamp} {is} out",
		"light.many": "{n_word} lights are lit",
		"switch.many": "{n_word} switches are running",
		"cover.on": "the {name} stand{v} {level} open",
		"cover.plain": "the {name} {is} open",
		"cover.off": "the {name} {is} closed",
		"lock.on": "the {name} {is} locked",
		"lock.off": "the {name} stand{v} unlocked",
		"switch.on": "the {name} {is} running",
		"switch.off": "the {name} {is} idle",
		away: "the {name} {is} not answering"
	},
	polls: {
		light: {
			ask: "Readers are invited to say whether the {lamp} {is} too bright.",
			less: "Too bright",
			more: "Not bright enough"
		},
		cover: {
			ask: "Readers are invited to say whether the {name} stand{v} too far open.",
			less: "Too far",
			more: "Not far enough"
		},
		climate: {
			ask: "Readers are invited to say whether the {name} is set too warm.",
			less: "Too warm",
			more: "Too cold"
		},
		media_player: {
			ask: "Readers are invited to say whether the {name} is too loud.",
			less: "Too loud",
			more: "Not loud enough"
		},
		fan: {
			ask: "Readers are invited to say whether the {name} turn{v} too fast.",
			less: "Too fast",
			more: "Not fast enough"
		},
		water_heater: {
			ask: "Readers are invited to say whether the {name} is set too hot.",
			less: "Too hot",
			more: "Not hot enough"
		},
		humidifier: {
			ask: "Readers are invited to say whether the {name} is set too damp.",
			less: "Too damp",
			more: "Too dry"
		}
	},
	acts: {
		"light.on": "Put it out",
		"light.off": "Light it",
		"switch.on": "Switch it off",
		"switch.off": "Switch it on",
		"cover.on": "Close it",
		"cover.off": "Open it",
		"lock.on": "Unlock it",
		"lock.off": "Lock it",
		"climate.on": "Turn it off",
		"climate.off": "Turn it on",
		"media_player.on": "Pause it",
		"media_player.off": "Play on",
		"fan.on": "Stop it",
		"fan.off": "Start it",
		"valve.on": "Shut it",
		"valve.off": "Open it",
		"vacuum.on": "Send it home",
		"vacuum.off": "Set it cleaning",
		"lawn_mower.on": "Send it home",
		"lawn_mower.off": "Set it mowing",
		"water_heater.on": "Turn it off",
		"water_heater.off": "Turn it on",
		"humidifier.on": "Turn it off",
		"humidifier.off": "Turn it on",
		"siren.on": "Silence it",
		"siren.off": "Sound it"
	},
	clipping: {
		since: "So it has stood since {at}.",
		record: "The record",
		wait: "Our archivist is consulting the files.",
		none: "Nothing is recorded of the last day.",
		ago: "This time yesterday",
		now: "Now",
		reads: "The glass reads {temp}°.",
		playing: "On the air: {title}.",
		sure: "Press again to confirm",
		more: "Home Assistant's own page",
		shut: "Fold away",
		closer: "Pinch, or tap twice, for a closer look.",
		live: "See the camera as it is now",
		presets: "Our photographer may be directed to",
		zoom: "The lens",
		controls: "Within the photographer's reach"
	},
	celebrity: {
		song: "{song} was heard in the {room}.",
		"song.live": "{song} is being heard in the {room}.",
		show: "“{title}” was shown in the {room}.",
		"show.live": "“{title}” is being shown in the {room}.",
		love: "Admired by {name}.",
		loathe: "Deplored by {name}."
	},
	wire: {
		trouble: "{name}: {message}",
		clear: "{name}: all is well again."
	},
	forecast: {
		now: "{sky} at present, and {temp}° outside.",
		today: "To-day"
	},
	skies: {
		sunny: "Fair and bright",
		cloudy: "Overcast",
		partlycloudy: "Fair, with cloud",
		rainy: "Rain",
		pouring: "Heavy rain",
		snowy: "Snow",
		"snowy-rainy": "Sleet",
		fog: "Fog",
		hail: "Hail",
		lightning: "Thunder",
		"lightning-rainy": "Thunder and rain",
		windy: "Blustery",
		"windy-variant": "Blustery, with cloud",
		"clear-night": "Clear",
		exceptional: "Unsettled"
	},
	personal: {
		home: "{name} has arrived home.",
		left: "{name} has left the house.",
		zone: "{name} has arrived at {place}.",
		love: "{name} wishes it known that {song} is greatly to their liking.",
		loathe: "{name} begs that {song} be played no more.",
		song: "“{title}” by {artist}",
		tune: "“{title}”"
	},
	notices: [
		"Arranged at a touch. Apply within.",
		"By appointment to the household.",
		"Satisfaction assured.",
		"Enquire at this office."
	],
	desk: {
		by: "By {name}",
		staff: "our own correspondent",
		filed: "Filed at {time}",
		lapsed: "Nothing filed since {time}",
		unsure: "Unconfirmed",
		failed: "No report"
	},
	stories: {
		alert: Fl,
		"alert.warning": {
			...Fl,
			kicker: "Late report",
			head: ["{name} gives cause for concern"]
		},
		"alert.task": {
			kicker: "Notice",
			head: ["{name} wants attention"],
			deck: "{message}",
			body: "It has been so since {since}."
		},
		recovered: {
			kicker: "Resolved",
			head: ["{name} returns to normal"],
			deck: "Calm is restored in the {area}. The trouble began at {since}."
		},
		"sighting.alarm": {
			kicker: "Alarm heard",
			head: ["An alarm is heard sounding"],
			deck: "A smoke or carbon monoxide alarm was heard by the {name} at {at}. Readers are urged to look at once."
		},
		"sighting.doorbell": {
			kicker: "At the door",
			head: ["A caller rings the bell", "A visitor presents at the door"],
			deck: "The bell was rung at {at}, and the {name} obliged with a likeness."
		},
		"sighting.person": {
			kicker: "Person seen",
			head: ["A figure is observed", "Person seen on the premises"],
			deck: "Photographed by the {name} at {at}. Identity unconfirmed as this edition went to press."
		},
		"sighting.vehicle": {
			kicker: "Vehicle seen",
			head: ["A vehicle draws up", "Motor traffic is reported"],
			deck: "Photographed by the {name} at {at}."
		},
		"sighting.animal": {
			kicker: "Nature notes",
			head: ["Wildlife reported in the grounds", "A creature is observed"],
			deck: "Photographed by the {name} at {at}. It declined to comment."
		},
		triggered: {
			kicker: "Stop press",
			head: ["The alarm is sounding"],
			deck: "The {name} alarm was set off in the {room}. Readers are urged to look at once."
		},
		unlocked: {
			kicker: "Security",
			head: ["{name} found unlocked"],
			deck: "{room} in uproar as the household is urged to turn the key.",
			act: "Lock it"
		},
		offline: {
			kicker: "Missing",
			head: ["{N} device{s} not answering"],
			deck: "Silent since {since}: {names}."
		},
		appliance: {
			kicker: "Industry",
			head: ["{name} draws {kw} kilowatts"],
			deck: "{room} sources confirm that the meter is spinning in a good cause.",
			act: "Switch it off"
		},
		ablaze: {
			kicker: "Economy",
			head: ["House ablaze with light"],
			deck: "With {n_word} lamps burning at once, questions are asked about the bill.",
			act: "Put them all out",
			vote: "Dim them all"
		},
		lights: {
			kicker: "Home affairs",
			head: ["{N} light{s} still burning at this hour"],
			deck: "The remainder of the house is reported quiet and in good order.",
			act: "Lights out",
			vote: "Dim them"
		},
		dark: {
			kicker: "Home affairs",
			head: ["Darkness falls on entire household"],
			deck: "Not one lamp is left burning, our correspondent reports from the landing."
		},
		cold: {
			kicker: "Climate",
			head: ["{room} falls short of its target"],
			deck: "At {temp}°, the room is {short} degrees below what was asked of it."
		},
		power: {
			kicker: "Energy",
			head: ["House draws {kw} kilowatts"],
			deck: "The meter was read as this edition went to press."
		},
		weather: {
			kicker: "Outlook",
			head: ["{temp}° outside"],
			deck: "Fair."
		},
		"weather.freezing": {
			kicker: "Outlook",
			head: ["{temp}° outside"],
			deck: "Frost is likely. Mind the step."
		},
		"weather.cold": {
			kicker: "Outlook",
			head: ["{temp}° outside"],
			deck: "A coat is advised."
		},
		"weather.hot": {
			kicker: "Outlook",
			head: ["{temp}° outside"],
			deck: "Readers are advised to seek the shade."
		},
		quiet: {
			kicker: "Home affairs",
			head: ["All quiet in the house"],
			deck: "Nothing of note has occurred. {N} device{s} stand{v} ready."
		}
	}
}, Ll = {
	kicker: "Breaking",
	head: ["{name}: what we know so far", "Live: {name}"],
	deck: "{message}",
	body: "The latest reading in the {area} is {reading}. It began at {since}.",
	plain: "It began in the {area} at {since}.",
	worse: "Update: it has got worse."
}, Rl = {
	label: "Rolling news",
	name: "The Thermostat",
	strap: "Live from every room",
	price: "Free to read",
	flash: "Breaking",
	ticker: "Headlines",
	titles: {
		more: "Top stories",
		briefs: "More headlines",
		late: "Live updates",
		archive: "Last 30 minutes",
		temps: "Temperatures",
		board: "Controls",
		notices: "Quick actions",
		elsewhere: "Other rooms",
		gaps: "Needs attention",
		personal: "People",
		celebrity: "Now playing",
		weather: "Forecast",
		desk: "Analysis"
	},
	join: ", ",
	end: ".",
	nothing: "No updates yet.",
	rest: "Nothing to report from {n} room{s}.",
	gaps: {
		loose: "{n} device{s} without a room",
		plumbing: "{n} setting{s} listed as devices",
		clash: "{n} device{s} with a name another has",
		floorless: "{n} room{s} not on a floor",
		cold: "{n} room{s} with no temperature sensor"
	},
	mend: "Select one to put it right in Home Assistant: an area, a floor, a name or a temperature sensor.",
	words: {
		percent: "{n}%",
		degrees: "{n}°",
		"climate.on": "the {name} is set to {level}",
		"climate.plain": "the {name} is on",
		"climate.off": "the {name} is off",
		"media_player.on": "the {name} is playing at {level}",
		"media_player.plain": "the {name} is playing",
		"media_player.off": "the {name} is not playing",
		"camera.off": "the {camera} is watching",
		"fan.on": "the {name} {is} running at {level}",
		"fan.plain": "the {name} {is} running",
		"fan.off": "the {name} {is} off",
		"valve.on": "the {name} {is} {level} open",
		"valve.plain": "the {name} {is} open",
		"valve.off": "the {name} {is} shut",
		"vacuum.on": "the {name} is cleaning",
		"vacuum.off": "the {name} is idle",
		"vacuum.docked": "the {name} is docked",
		"vacuum.returning": "the {name} is returning to its dock",
		"vacuum.paused": "the {name} is paused",
		"vacuum.error": "the {name} has reported a problem",
		"lawn_mower.on": "the {name} is mowing",
		"lawn_mower.off": "the {name} is idle",
		"lawn_mower.docked": "the {name} is docked",
		"lawn_mower.returning": "the {name} is returning to its dock",
		"lawn_mower.paused": "the {name} is paused",
		"lawn_mower.error": "the {name} has reported a problem",
		"water_heater.on": "the {name} is set to {level}",
		"water_heater.plain": "the {name} is heating",
		"water_heater.off": "the {name} is off",
		"humidifier.on": "the {name} is set to {level}",
		"humidifier.plain": "the {name} is on",
		"humidifier.off": "the {name} is off",
		"siren.on": "the {name} is sounding",
		"siren.off": "the {name} is silent",
		"alarm_control_panel.on": "the {alarm} is set",
		"alarm_control_panel.off": "the {alarm} is not set",
		"alarm_control_panel.arming": "the {alarm} is being set",
		"alarm_control_panel.pending": "the {alarm} is about to sound",
		"alarm_control_panel.triggered": "the {alarm} is sounding",
		"light.on": "the {lamp} {is} on at {level}",
		"light.plain": "the {lamp} {is} on",
		"light.off": "the {lamp} {is} off",
		"light.many": "{n} lights are on",
		"switch.many": "{n} switches are on",
		"cover.on": "the {name} {is} {level} open",
		"cover.plain": "the {name} {is} open",
		"cover.off": "the {name} {is} closed",
		"lock.on": "the {name} {is} locked",
		"lock.off": "the {name} {is} unlocked",
		"switch.on": "the {name} {is} on",
		"switch.off": "the {name} {is} off",
		away: "the {name} {is} not responding"
	},
	polls: {
		light: {
			ask: "Have your say: {is} the {lamp} too bright?",
			less: "Too bright",
			more: "Too dim"
		},
		cover: {
			ask: "Have your say: {is} the {name} open too far?",
			less: "Too far",
			more: "Not far enough"
		},
		climate: {
			ask: "Have your say: is the {name} set too warm?",
			less: "Too warm",
			more: "Too cold"
		},
		media_player: {
			ask: "Have your say: is the {name} too loud?",
			less: "Too loud",
			more: "Too quiet"
		},
		fan: {
			ask: "Have your say: {is} the {name} too fast?",
			less: "Too fast",
			more: "Too slow"
		},
		water_heater: {
			ask: "Have your say: is the {name} set too hot?",
			less: "Too hot",
			more: "Not hot enough"
		},
		humidifier: {
			ask: "Have your say: is the {name} set too damp?",
			less: "Too damp",
			more: "Too dry"
		}
	},
	acts: {
		"light.on": "Turn off",
		"light.off": "Turn on",
		"switch.on": "Turn off",
		"switch.off": "Turn on",
		"cover.on": "Close",
		"cover.off": "Open",
		"lock.on": "Unlock",
		"lock.off": "Lock",
		"climate.on": "Turn off",
		"climate.off": "Turn on",
		"media_player.on": "Pause",
		"media_player.off": "Play",
		"fan.on": "Turn off",
		"fan.off": "Turn on",
		"valve.on": "Shut",
		"valve.off": "Open",
		"vacuum.on": "Send home",
		"vacuum.off": "Start cleaning",
		"lawn_mower.on": "Send home",
		"lawn_mower.off": "Start mowing",
		"water_heater.on": "Turn off",
		"water_heater.off": "Turn on",
		"humidifier.on": "Turn off",
		"humidifier.off": "Turn on",
		"siren.on": "Silence",
		"siren.off": "Sound"
	},
	clipping: {
		since: "Since {at}.",
		record: "Timeline",
		wait: "Loading the timeline…",
		none: "No changes in the last 24 hours.",
		ago: "24 hours ago",
		now: "Now",
		reads: "It is {temp}° in the room.",
		playing: "Now playing: {title}.",
		sure: "Press again to confirm",
		more: "Open in Home Assistant",
		shut: "Close",
		closer: "Pinch or double-tap to zoom.",
		live: "Watch live",
		presets: "Camera positions",
		zoom: "Zoom",
		controls: "Controls"
	},
	celebrity: {
		song: "{song} played in the {room}",
		"song.live": "Live in the {room}: {song}",
		show: "“{title}” was on in the {room}",
		"show.live": "Live in the {room}: “{title}”",
		love: "{name} loved it",
		loathe: "{name} loathed it"
	},
	wire: {
		trouble: "{name}: {message}",
		clear: "{name}: back to normal"
	},
	forecast: {
		now: "Now: {sky}, {temp}°.",
		today: "Today"
	},
	skies: {
		sunny: "Sunny",
		cloudy: "Cloudy",
		partlycloudy: "Partly cloudy",
		rainy: "Rain",
		pouring: "Heavy rain",
		snowy: "Snow",
		"snowy-rainy": "Sleet",
		fog: "Fog",
		hail: "Hail",
		lightning: "Thunderstorms",
		"lightning-rainy": "Thunderstorms with rain",
		windy: "Windy",
		"windy-variant": "Windy and cloudy",
		"clear-night": "Clear",
		exceptional: "Exceptional conditions"
	},
	personal: {
		home: "{name} arrived home",
		left: "{name} left home",
		zone: "{name} arrived at {place}",
		love: "{name} loved {song}",
		loathe: "{name} loathed {song}",
		song: "“{title}” by {artist}",
		tune: "“{title}”"
	},
	notices: [
		"Tap to run",
		"Runs at once",
		"One tap",
		"Ready to run"
	],
	desk: {
		by: "{name}",
		staff: "House correspondent",
		filed: "Updated {time}",
		lapsed: "Not updated since {time}",
		unsure: "Unconfirmed",
		failed: "No report"
	},
	stories: {
		alert: Ll,
		"alert.warning": {
			...Ll,
			kicker: "Developing",
			head: ["{name} needs checking", "{name}: what we know so far"]
		},
		"alert.task": {
			kicker: "To do",
			head: ["{name} needs attention"],
			deck: "{message}",
			body: "Outstanding since {since}."
		},
		recovered: {
			kicker: "Update",
			head: ["{name} is back to normal"],
			deck: "It began at {since} in the {area}. Nothing more needs doing."
		},
		"sighting.alarm": {
			kicker: "Breaking",
			head: ["An alarm has been heard"],
			deck: "The {name} heard a smoke or carbon monoxide alarm at {at}. Check now."
		},
		"sighting.doorbell": {
			kicker: "At the door",
			head: ["Someone is at the door"],
			deck: "The doorbell rang at {at}. Picture from the {name}."
		},
		"sighting.person": {
			kicker: "On camera",
			head: ["A person has been seen"],
			deck: "Picture from the {name} at {at}. Not yet identified."
		},
		"sighting.vehicle": {
			kicker: "On camera",
			head: ["A vehicle has been seen"],
			deck: "Picture from the {name} at {at}."
		},
		"sighting.animal": {
			kicker: "On camera",
			head: ["An animal has been seen"],
			deck: "Picture from the {name} at {at}."
		},
		triggered: {
			kicker: "Breaking",
			head: ["The alarm is sounding"],
			deck: "The {name} alarm was triggered in the {room}. Check now."
		},
		unlocked: {
			kicker: "Security",
			head: ["{name} is unlocked"],
			deck: "Reported in: {room}.",
			act: "Lock it"
		},
		offline: {
			kicker: "Outage",
			head: ["{N} device{s} not responding"],
			deck: "Not responding since {since}: {names}."
		},
		appliance: {
			kicker: "Energy",
			head: ["{name} is using {kw} kW"],
			deck: "Reported in: {room}.",
			act: "Turn it off"
		},
		ablaze: {
			kicker: "Energy",
			head: ["{N} lights are on at once"],
			deck: "Most of the lights in the house are on.",
			act: "Turn them all off",
			vote: "Dim them all"
		},
		lights: {
			kicker: "At home",
			head: ["{N} light{s} on"],
			deck: "Everything else is as expected.",
			act: "Turn off",
			vote: "Dim"
		},
		dark: {
			kicker: "At home",
			head: ["All the lights are off"],
			deck: "No light is on anywhere in the house."
		},
		cold: {
			kicker: "Heating",
			head: ["{room} is {short}° below its target"],
			deck: "It is {temp}° there now."
		},
		power: {
			kicker: "Energy",
			head: ["The house is using {kw} kW"],
			deck: "A live reading."
		},
		weather: {
			kicker: "Weather",
			head: ["{temp}° outside"],
			deck: "Mild."
		},
		"weather.freezing": {
			kicker: "Weather",
			head: ["{temp}° outside"],
			deck: "Freezing. There may be ice."
		},
		"weather.cold": {
			kicker: "Weather",
			head: ["{temp}° outside"],
			deck: "Cold."
		},
		"weather.hot": {
			kicker: "Weather",
			head: ["{temp}° outside"],
			deck: "Hot."
		},
		quiet: {
			kicker: "At home",
			head: ["Nothing to report"],
			deck: "No changes. Devices watched: {n}."
		}
	}
}, zl = {
	kicker: "Red alert",
	head: [
		"{name} shock",
		"{name} drama",
		"It's all kicking off"
	],
	flavours: {
		temperature: [
			"Meltdown!",
			"Hot stuff",
			"Too hot to handle"
		],
		moisture: [
			"Sink or swim",
			"What a drip",
			"Leak shock"
		],
		opening: [
			"Open season",
			"Draught dodgers",
			"Wide open"
		],
		battery: [
			"Flat out",
			"Out of juice",
			"Running on empty"
		],
		smoke: ["Smoke alarm!", "Up in smoke"]
	},
	deck: "{name}: {message}",
	body: "It's {reading} in the {area} and it's been going on since {since}.",
	plain: "It's been going on in the {area} since {since}.",
	worse: "And it's getting WORSE."
}, Bl = {
	label: "Red-top",
	name: "Daily Fuse",
	strap: "The paper that's always switched on",
	price: "Still FREE!",
	flash: "Breaking",
	ticker: "",
	titles: {
		more: "Also today",
		briefs: "Quick ones",
		late: "Latest",
		archive: "Rewind",
		temps: "Hot or not",
		board: "Flick a switch",
		notices: "Do it now",
		elsewhere: "Everywhere else",
		gaps: "Sort it out",
		personal: "Goss",
		celebrity: "Showbiz",
		weather: "Brolly watch",
		desk: "The inside line"
	},
	join: " • ",
	end: "",
	nothing: "Nothing yet. Give it a minute.",
	rest: "{n} room{s} with NOTHING ON!",
	gaps: {
		loose: "{n} device{s} HOMELESS!",
		plumbing: "{n} FAKE gadget{s} exposed",
		clash: "{n} device{s} in name mix-up",
		floorless: "{n} room{s} floating in mid-air",
		cold: "{n} room{s}: hot or not? No idea"
	},
	mend: "Tap one to fix it. Give it an area, a floor, a name or a thermometer in Home Assistant.",
	words: {
		percent: "{n}%",
		degrees: "{n}°",
		"climate.on": "{name} set to {level}",
		"climate.plain": "{name} ON",
		"climate.off": "{name} off",
		"media_player.on": "{name} BLARING at {level}",
		"media_player.plain": "{name} playing",
		"media_player.off": "{name} quiet",
		"camera.off": "{camera} watching",
		"fan.on": "{name} SPINNING at {level}",
		"fan.plain": "{name} spinning",
		"fan.off": "{name} off",
		"valve.on": "{name} {level} open",
		"valve.plain": "{name} OPEN",
		"valve.off": "{name} shut",
		"vacuum.on": "{name} HOOVERING",
		"vacuum.off": "{name} slacking",
		"vacuum.docked": "{name} docked",
		"vacuum.returning": "{name} heading home",
		"vacuum.paused": "{name} on a break",
		"vacuum.error": "{name} STUCK!",
		"lawn_mower.on": "{name} MOWING",
		"lawn_mower.off": "{name} slacking",
		"lawn_mower.docked": "{name} docked",
		"lawn_mower.returning": "{name} heading home",
		"lawn_mower.paused": "{name} on a break",
		"lawn_mower.error": "{name} STUCK!",
		"water_heater.on": "{name} set to {level}",
		"water_heater.plain": "{name} ON",
		"water_heater.off": "{name} off",
		"humidifier.on": "{name} set to {level}",
		"humidifier.plain": "{name} ON",
		"humidifier.off": "{name} off",
		"siren.on": "{name} WAILING!",
		"siren.off": "{name} quiet",
		"alarm_control_panel.on": "{alarm} SET",
		"alarm_control_panel.off": "{alarm} off",
		"alarm_control_panel.arming": "{alarm} setting…",
		"alarm_control_panel.pending": "{alarm} about to GO OFF",
		"alarm_control_panel.triggered": "{alarm} GOING OFF!",
		"light.on": "{lamp} ON at {level}",
		"light.plain": "{lamp} ON",
		"light.off": "{lamp} off",
		"light.many": "{n} lights ON",
		"switch.many": "{n} switches ON",
		"cover.on": "{name} {level} open",
		"cover.plain": "{name} open",
		"cover.off": "{name} shut",
		"lock.on": "{name} locked",
		"lock.off": "{name} UNLOCKED!",
		"switch.on": "{name} ON",
		"switch.off": "{name} off",
		away: "{name} GONE QUIET"
	},
	polls: {
		light: {
			ask: "{lamp}: TOO BRIGHT? You decide!",
			less: "Dim it",
			more: "Crank it up"
		},
		cover: {
			ask: "{name}: TOO OPEN? You decide!",
			less: "Shut it a bit",
			more: "Open up"
		},
		climate: {
			ask: "{name}: TOO HOT? You decide!",
			less: "Cool it",
			more: "Warm it up"
		},
		media_player: {
			ask: "{name}: TOO LOUD? You decide!",
			less: "Pipe down",
			more: "Louder!"
		},
		fan: {
			ask: "{name}: TOO FAST? You decide!",
			less: "Slow down",
			more: "Faster!"
		},
		water_heater: {
			ask: "{name}: TOO HOT? You decide!",
			less: "Cool it",
			more: "Hotter!"
		},
		humidifier: {
			ask: "{name}: TOO DAMP? You decide!",
			less: "Dry it out",
			more: "Damper!"
		}
	},
	acts: {
		"light.on": "Kill it",
		"light.off": "Light it up",
		"switch.on": "Off!",
		"switch.off": "On!",
		"cover.on": "Shut it",
		"cover.off": "Open up",
		"lock.on": "Unlock it",
		"lock.off": "Lock it",
		"climate.on": "Kill the heat",
		"climate.off": "Heat on!",
		"media_player.on": "Shush!",
		"media_player.off": "Play it!",
		"fan.on": "Kill it",
		"fan.off": "Spin it",
		"valve.on": "Shut it",
		"valve.off": "Open up",
		"vacuum.on": "Go home!",
		"vacuum.off": "Get hoovering",
		"lawn_mower.on": "Go home!",
		"lawn_mower.off": "Get mowing",
		"water_heater.on": "Kill the heat",
		"water_heater.off": "Heat on!",
		"humidifier.on": "Off!",
		"humidifier.off": "On!",
		"siren.on": "SHUT IT UP",
		"siren.off": "Sound it"
	},
	clipping: {
		since: "Been that way since {at}.",
		record: "The story so far",
		wait: "Digging the dirt…",
		none: "Nothing all day. Dull!",
		ago: "Yesterday",
		now: "Now",
		reads: "It's {temp}° in there.",
		playing: "Now playing: {title}.",
		sure: "SURE? Press again",
		more: "Home Assistant's page",
		shut: "Bin it",
		closer: "Pinch or double-tap to ZOOM IN",
		live: "Watch it LIVE",
		presets: "Point the snapper at",
		zoom: "ZOOM",
		controls: "While you're there"
	},
	celebrity: {
		song: "{song} rocked the {room}",
		"song.live": "ON NOW in the {room}: {song}",
		show: "“{title}” was on in the {room}",
		"show.live": "ON NOW in the {room}: “{title}”",
		love: "{name} LOVES it",
		loathe: "{name} HATES it"
	},
	wire: {
		trouble: "{name}: {level}!",
		clear: "{name}: PANIC OVER"
	},
	forecast: {
		now: "{sky} {temp}° out there.",
		today: "Today"
	},
	skies: {
		sunny: "SUN!",
		cloudy: "Grey.",
		partlycloudy: "Bit of both.",
		rainy: "Wet.",
		pouring: "CHUCKING IT DOWN!",
		snowy: "SNOW!",
		"snowy-rainy": "Sleet. Grim.",
		fog: "Pea-souper.",
		hail: "HAIL!",
		lightning: "THUNDER!",
		"lightning-rainy": "Thunder AND rain!",
		windy: "Blowy.",
		"windy-variant": "Blowy and grey.",
		"clear-night": "Clear.",
		exceptional: "Weird."
	},
	personal: {
		home: "{name}'s HOME!",
		left: "{name} has LEFT the building",
		zone: "{name} spotted at {place}",
		love: "{name} LOVES {song}",
		loathe: "{name} can't STAND {song}",
		song: "“{title}” by {artist}",
		tune: "“{title}”"
	},
	notices: [
		"Go on, press it.",
		"One tap. Job done.",
		"You know you want to.",
		"Easy as that."
	],
	desk: {
		by: "By {name}",
		staff: "our insider",
		filed: "In at {time}",
		lapsed: "Gone quiet since {time}",
		unsure: "Rumour",
		failed: "No comment"
	},
	stories: {
		alert: zl,
		"alert.warning": {
			...zl,
			kicker: "Uh-oh"
		},
		"alert.task": {
			kicker: "To-do",
			head: [
				"Job for you",
				"Sort it out",
				"Chop chop"
			],
			deck: "{name}: {message}",
			body: "Waiting since {since}."
		},
		recovered: {
			kicker: "Phew",
			head: [
				"Panic over",
				"And relax",
				"Stand down"
			],
			deck: "{name} back to normal. The drama started at {since}."
		},
		"sighting.alarm": {
			kicker: "Alarm",
			head: ["ALARM!", "Hear that?"],
			deck: "{name} heard a smoke or CO alarm at {at}. Go and LOOK."
		},
		"sighting.doorbell": {
			kicker: "Ding dong",
			head: [
				"Ding dong!",
				"Who's there?",
				"Knock knock"
			],
			deck: "Someone's at the door. {name} got the snap at {at}."
		},
		"sighting.person": {
			kicker: "Spotted",
			head: [
				"Who goes there?",
				"Caught on camera",
				"Smile!"
			],
			deck: "{name} snaps mystery figure at {at}."
		},
		"sighting.vehicle": {
			kicker: "Wheels",
			head: [
				"Park life",
				"Vroom!",
				"On the drive"
			],
			deck: "Motor caught on {name} at {at}."
		},
		"sighting.animal": {
			kicker: "Beast",
			head: [
				"Paws for thought",
				"Beast on the loose",
				"Fur real"
			],
			deck: "Creature caught on {name} at {at}."
		},
		triggered: {
			kicker: "Red alert",
			head: [
				"ALARM!",
				"Burglars?!",
				"It's going off!"
			],
			deck: "{name} alarm GOING OFF in the {room}. Go and LOOK."
		},
		unlocked: {
			kicker: "Exclusive",
			head: [
				"Lock shock",
				"Come on in!",
				"Open house"
			],
			deck: "{name} left UNLOCKED as household carries on regardless.",
			act: "Lock it NOW"
		},
		offline: {
			kicker: "Vanished",
			head: [
				"Gone quiet",
				"Missing in action",
				"Hello? Anyone?"
			],
			deck: "{n} device{s} not answering since {since}: {names}."
		},
		appliance: {
			kicker: "Power mad",
			head: [
				"Full steam ahead",
				"Watt a whopper",
				"Going large"
			],
			deck: "{name} guzzles {kw}kW in {room} power binge.",
			act: "Pull the plug"
		},
		ablaze: {
			kicker: "Bill shock",
			head: [
				"Lit up like a Christmas tree",
				"Who's paying for this?",
				"Blaze of glory"
			],
			deck: "{n} lights on AT ONCE in bill-busting bonanza.",
			act: "Kill the lights",
			vote: "Dim the lot"
		},
		lights: {
			kicker: "Still on",
			head: [
				"{n} and counting",
				"Left on again",
				"Switched on"
			],
			deck: "{n} light{s} burn{v} while the meter ticks.",
			act: "Kill the lights",
			vote: "Dim the lot"
		},
		dark: {
			kicker: "Blackout",
			head: [
				"Lights out!",
				"Dark days",
				"Who turned out the lights?"
			],
			deck: "Not a single bulb on in the WHOLE house."
		},
		cold: {
			kicker: "Chilly",
			head: [
				"Brrr!",
				"Cold comfort",
				"Frozen out"
			],
			deck: "{room} shivers at {temp}°, a full {short}° short."
		},
		power: {
			kicker: "Kerching",
			head: [
				"Watt a carry on",
				"Meter madness",
				"Power trip"
			],
			deck: "House burns {kw}kW. Who's paying?"
		},
		weather: {
			kicker: "Weather",
			head: ["Not bad out", "Can't complain"],
			deck: "{temp}° outside."
		},
		"weather.freezing": {
			kicker: "Weather",
			head: ["Big freeze", "Brass monkeys"],
			deck: "{temp}° outside. Stay in."
		},
		"weather.cold": {
			kicker: "Weather",
			head: [
				"Coat weather",
				"Bit nippy",
				"Grey day"
			],
			deck: "{temp}° outside."
		},
		"weather.hot": {
			kicker: "Weather",
			head: ["What a scorcher", "Hot hot hot"],
			deck: "{temp}° outside. Ice creams all round."
		},
		quiet: {
			kicker: "Yawn",
			head: [
				"Slow news day",
				"Nothing to see here",
				"All quiet"
			],
			deck: "Nothing going on. {n} device{s} behaving."
		}
	}
}, Q = (e, t) => e.replace(/\{(\w+)\}/g, (e, n) => t[n] ?? ""), Vl = {
	esphome: "ESPHome. Add entity_category: config (or diagnostic) to each in its device's YAML",
	knx: "KNX. Add entity_category: config to each in the KNX YAML",
	"": "Give each the label Dash-Bored hide, or hide it in Home Assistant"
};
function Hl(e, t, n) {
	let r = e.stories[`${t.kind}.${t.variant}`] ?? e.stories[t.kind], i = r.flavours?.[t.flavour] ?? r.head, a = t.vars.escalated && r.worse ? " " + r.worse : "";
	return {
		kicker: r.kicker,
		head: Q(i[n % i.length], t.vars),
		deck: Q(r.deck, t.vars),
		body: r.body ? Q(t.vars.reading === "" && r.plain ? r.plain : r.body, t.vars) + a : "",
		act: t.press && r.act ? r.act : "",
		vote: t.vote && r.vote ? r.vote : ""
	};
}
var Ul = (e, t, n) => Q(e.words[Et.has(t) ? "degrees" : "percent"], { n: String(n) });
function Wl(e) {
	let t = e.name.toLowerCase(), n = /lamp|light/i.test(t) ? t : `${t} light`, r = /s$/i.test((e.kind === "light" ? n : t).split(" - ")[0]);
	return {
		name: t,
		lamp: n,
		camera: /cam/i.test(t) ? t : `${t} camera`,
		alarm: /alarm/i.test(t) ? t : `${t} alarm`,
		is: r ? "are" : "is",
		v: r ? "" : "s"
	};
}
function Gl(e, t) {
	let { ask: n, less: r, more: i } = e.polls[t.kind];
	return {
		ask: Q(n, Wl(t)),
		less: r,
		more: i
	};
}
function Kl(e, t) {
	let n = (n) => `${t.kind}.${n}` in e.words, r = t.away ? "away" : t.phase && n(t.phase) ? `${t.kind}.${t.phase}` : t.on ? t.level === void 0 && n("plain") ? `${t.kind}.plain` : `${t.kind}.on` : `${t.kind}.off`, [i, a] = Q(e.words[r], {
		...Wl(t),
		level: "\0"
	}).replace(/^the (?=\S+['’]s )/, "").split("\0");
	return a === void 0 ? [
		i,
		"",
		""
	] : [
		i,
		Ul(e, t.kind, t.level),
		a
	];
}
var ql = (e, t) => Kl(e, t).join(""), Jl = (e, t) => e.skies[t] ?? H(t.replace(/[-_]/g, " "));
function Yl(e, t) {
	let n = Q(t.vars.artist ? e.personal.song : e.personal.tune, t.vars);
	return [Q(e.celebrity[t.live ? `${t.kind}.live` : t.kind], {
		...t.vars,
		song: n
	}), t.marks.map((t) => Q(e.celebrity[t.kind], { name: t.name }))];
}
function Xl(e, t) {
	let n = Q(t.vars.artist ? e.personal.song : e.personal.tune, t.vars);
	return Q(e.personal[t.kind], {
		...t.vars,
		song: n
	});
}
var Zl = (e, t) => Q(t.level === "nominal" ? e.wire.clear : e.wire.trouble, {
	name: t.name,
	message: t.message || t.level,
	level: t.level.toUpperCase()
}), Ql = {
	broadsheet: Il,
	tabloid: Bl,
	rolling: Rl
}, $l = {
	s: 1,
	x: 0,
	y: 0
}, eu = 6, tu = 1.2, nu = 2.5;
function ru(e, t, n, r, i, a, o, s) {
	let c = Math.min(eu, Math.max(1, e.s * t)), l = c / e.s, u = (e, t) => Math.min(t, Math.max(-t, e)) || 0;
	return {
		s: c,
		x: u(n - (n - e.x - i) * l, (c - 1) * o / 2),
		y: u(r - (r - e.y - a) * l, (c - 1) * s / 2)
	};
}
var $ = $l, iu = /* @__PURE__ */ new Map();
function au() {
	let e = [...iu.values()], t = (t) => e.reduce((e, n) => e + n[t], 0) / e.length;
	return [
		t(0),
		t(1),
		e.length > 1 ? Math.hypot(e[0][0] - e[1][0], e[0][1] - e[1][1]) : 0
	];
}
function ou(e, t, n, r, i = 0, a = 0) {
	let o = e.getBoundingClientRect();
	$ = ru($, t, n - o.left - o.width / 2, r - o.top - o.height / 2, i, a, o.width, o.height), e.firstElementChild.style.transform = `translate(${$.x}px, ${$.y}px) scale(${$.s})`, e.classList.toggle("near", $.s > 1);
}
var su = (e) => e.currentTarget, cu = {
	whole() {
		$ = $l, iu.clear();
	},
	down(e) {
		su(e).setPointerCapture(e.pointerId), iu.set(e.pointerId, [e.clientX, e.clientY]);
	},
	move(e) {
		if (!iu.has(e.pointerId)) return;
		let [t, n, r] = au();
		iu.set(e.pointerId, [e.clientX, e.clientY]);
		let [i, a, o] = au();
		ou(su(e), r && o ? o / r : 1, i, a, i - t, a - n);
	},
	up(e) {
		iu.delete(e.pointerId);
	},
	wheel(e) {
		e.preventDefault(), ou(su(e), e.deltaY < 0 ? tu : 1 / tu, e.clientX, e.clientY);
	},
	twice(e) {
		ou(su(e), $.s > 1 ? 1 / $.s : nu, e.clientX, e.clientY);
	}
}, lu = 5, uu = /* @__PURE__ */ new Map();
function du(e) {
	let t = uu.get(e);
	if (t) return t;
	let n = [...e].reduce((e, t) => e * 31 + t.charCodeAt(0) >>> 0, 7), r = () => (n = n * 1664525 + 1013904223 >>> 0) / 2 ** 32, i = (e) => Array.from({ length: e }, (t, n) => ((n + r() * .8) / e * 100).toFixed(1)), a = () => (r() * lu).toFixed(1), o = `polygon(${[
		...i(30).map((e) => `${e}% ${a()}px`),
		...i(22).map((e) => `calc(100% - ${a()}px) ${e}%`),
		...i(30).map((e) => `calc(100% - ${e}%) calc(100% - ${a()}px)`),
		...i(22).map((e) => `${a()}px calc(100% - ${e}%)`)
	].join(",")})`;
	return uu.set(e, o), o;
}
var fu = (e, t, n, r, i = "") => M`<dialog class="clipping ${i}" @close=${n} @click=${(e) => e.target === e.currentTarget && n()}>
    <div class="cutting" style="clip-path:${du(e)}">
      <div class="scrap above" aria-hidden="true">${t.above}</div>
      <div class="story">${r}</div>
      <div class="scrap beside" aria-hidden="true"><span>${t.beside}</span></div>
      <div class="scrap below" aria-hidden="true">${t.below}</div>
    </div>
  </dialog>`;
function pu(e, t, n, r) {
	let i = e.clipping;
	return fu(t.src, n, r.shut, M`<p class="kicker">${t.caption}</p>
    <div class="zoom" @pointerdown=${cu.down} @pointermove=${cu.move} @pointerup=${cu.up} @pointercancel=${cu.up} @wheel=${cu.wheel} @dblclick=${cu.twice}>
      <img src=${t.src} alt=${t.caption} draggable="false" @load=${cu.whole} />
    </div>
    <p class="hint">${i.closer}</p>
    <div class="foot">${t.see ? M`<button class="mend" @click=${r.more}>${i.live}</button>` : M`<span></span>`}<button class="act" @click=${r.shut}>${i.shut}</button></div>`, "shot");
}
function mu(e, t, n, r, i, a, o) {
	let s = e.clipping, c = M`${t.presets?.length ? M`<p class="turn"><i>${s.presets}</i>${t.presets.map((e) => M`<button class="mend" @click=${() => o.turn(e)}>${e.name}</button>`)}</p>` : F}
    ${t.zoom ? M`<label class="scale"><i>${s.zoom}</i><input type="range" min=${t.zoom.span.min} max=${t.zoom.span.max} step=${t.zoom.span.step} .value=${String(t.zoom.level)}
          @change=${(e) => o.zoom(Number(e.target.value))} /><output>${t.zoom.level}</output></label>` : F}
    ${t.controls?.length ? M`<p class="turn"><i>${s.controls}</i>${t.controls.map((e) => M`<button class="mend" ?disabled=${e.away} @click=${() => o.control(e)}>${e.name}</button>`)}</p>` : F}`, l = (n) => H(ql(e, {
		...t,
		on: n.on,
		phase: n.phase,
		level: n.level,
		away: n.away
	})), u = n.record, d = e.acts[`${t.kind}.${t.on ? "on" : "off"}`];
	return fu(t.id, a, o.shut, M`<p class="kicker">${t.room}</p>
      <h4 class="title">${t.name}</h4>
      <p class="deck">${H(ql(e, t))}. ${t.since && t.kind !== "camera" ? Q(s.since, { at: V(t.since) }) : ""}
        ${t.temp === void 0 ? "" : Q(s.reads, { temp: t.temp.toFixed(1) })} ${t.title ? Q(s.playing, { title: t.title }) : ""}</p>
      ${t.picture ? M`<img class="still" src=${t.picture} alt=${t.name} role="button" tabindex="0" @click=${o.picture} @keydown=${(e) => e.key === "Enter" && o.picture()} />` : F}
      ${t.away ? F : c}
      ${t.away || !d ? F : M`<button class="act ${n.armed ? "sure" : ""}" @click=${o.flip}>${n.armed ? s.sure : d}</button>`}
      ${i}
      ${t.kind === "camera" ? F : M`<h3>${s.record}</h3>`}
      ${t.kind === "camera" ? F : n.fault ? M`<p class="fault" role="alert">Home Assistant's history could not be read (${n.fault}).</p>` : u ? M`<div class="band">${ko(u, r - Do, r).map(([e, t]) => M`<i style="left:${e}%;width:${t}%"></i>`)}</div>
              <div class="span"><span>${s.ago}</span><span>${s.now}</span></div>
              <ol>${u.length ? u.slice(-12).reverse().map((e) => M`<li><time>${V(e.at)}</time>${l(e)}</li>`) : M`<li>${s.none}</li>`}</ol>` : M`<p class="wait">${s.wait}</p>`}
      <div class="foot"><button class="mend" @click=${o.more}>${s.more}</button><button class="act" @click=${o.shut}>${s.shut}</button></div>`);
}
//#endregion
//#region src/dash-bored/styles.ts
var hu = b`
  :host { display: block; container-type: inline-size; }
  .paper { --paper: #f3eee0; --ink: #1c1a17; --flash: #8c1c13; --mark: #f6d95a; --head: "Bodoni 72", "Didot", "Playfair Display", serif;
    box-sizing: border-box; min-height: 100%; padding: 14px 30px 24px; background: var(--paper); color: var(--ink);
    font-family: "Hoefler Text", "Baskerville", "Times New Roman", serif;
    background-image: radial-gradient(rgba(0,0,0,.05) 1px, transparent 1px); background-size: 4px 4px; }
  .paper * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  :focus-visible { outline: 2px solid var(--flash); outline-offset: 2px; }
  .wait { font-size: 18px; font-style: italic; }

  /* What must never be missed: breaking news, a lost connection, a refused action. */
  .breaking { border: 3px double var(--flash); color: var(--flash); padding: 6px 12px; margin-bottom: 10px; font-size: 17px; text-align: center;
    animation: flash 1.6s ease-out; overflow-wrap: anywhere; }
  .breaking b { letter-spacing: .3em; text-transform: uppercase; margin-right: 12px; }
  @keyframes flash { 0%, 45% { background: var(--mark); } }
  .fault { background: var(--flash); color: #fff; padding: 6px 12px; margin-bottom: 10px; font: 600 15px/1.3 system-ui, sans-serif; overflow-wrap: anywhere; }

  .masthead { text-align: center; border-bottom: 4px double var(--ink); padding-bottom: 6px; }
  /* The masthead's blackletter is the page's own font (gazette.ts loads it), sized to the
     paper's width so that the name stays on one line on a phone. Never the browser's
     "fantasy": on an iPhone that is a script whose swashes ran up over the breaking news. */
  .masthead h1 { margin: 0; font: 400 clamp(32px, 12cqi, 74px)/1.1 "Dash-Bored Masthead", var(--head); overflow-wrap: anywhere; }
  .masthead p { margin: 0; } .masthead p:empty { display: none; }
  .dateline { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: center; justify-content: space-between; font-size: 12px; letter-spacing: .14em; text-transform: uppercase;
    border-bottom: 1px solid var(--ink); padding: 5px 2px; margin-bottom: 14px; }
  .styles button { padding: 1px 8px; border-bottom: 1.5px dotted; }
  .styles button[aria-pressed="true"] { background: var(--ink); color: var(--paper); border-color: transparent; }

  .page { display: grid; grid-template-columns: 2.1fr 1.4fr 1.1fr; gap: 0 26px; }
  .page > * { min-width: 0; }
  .page > * + * { border-left: 1px solid var(--ink); padding-left: 26px; }
  .kicker { margin: 0 0 6px; font-size: 12px; letter-spacing: .3em; text-transform: uppercase; color: var(--flash); }
  h2 { margin: 0 0 8px; font: 900 46px/.98 var(--head); text-transform: uppercase; letter-spacing: -.01em; text-wrap: balance; overflow-wrap: anywhere; animation: ink 1.2s ease-out; }
  @keyframes ink { from { background: var(--mark); } }
  .deck { font-size: 19px; font-style: italic; margin: 0 0 12px; line-height: 1.25; }
  /* The figure: the story's one number, set like an engraving. */
  .figure { float: right; width: 150px; margin: 4px 0 8px 16px; border: 3px double var(--ink); text-align: center; padding: 10px 6px;
    background: repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,.07) 3px 4px); }
  .figure b { display: block; font: 900 38px/1 var(--head); overflow-wrap: anywhere; }
  .figure span { font-size: 11px; letter-spacing: .2em; text-transform: uppercase; }
  .act { display: inline-block; border: 1.5px solid var(--ink); padding: 3px 12px; margin: 0 8px 10px 0; font-size: 13px; letter-spacing: .16em; text-transform: uppercase; }
  .act:hover { background: var(--ink); color: var(--paper); }
  /* A photograph: printed in black and white, as a broadsheet's are. */
  .photo { margin: 0 0 12px; clear: both; cursor: pointer; }
  .photo img { display: block; width: 100%; border: 1px solid var(--ink); filter: grayscale(1) contrast(1.15); }
  .photo figcaption { padding-top: 3px; font-size: 12px; font-style: italic; overflow-wrap: anywhere; }
  .item .photo { margin-bottom: 6px; }
  /* The archive: the last half hour's sightings, each with its photograph small. */
  .archive li { display: grid; grid-template-columns: 72px 1fr; gap: 8px; align-items: center; cursor: pointer; overflow-wrap: anywhere; }
  .archive img, .archive i { width: 72px; aspect-ratio: 16 / 9; object-fit: cover; border: 1px solid var(--ink); filter: grayscale(1) contrast(1.15); }
  .archive i { background: repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,.07) 3px 4px); }
  .copy { columns: 2; column-gap: 22px; column-rule: 1px solid rgba(0,0,0,.25); font-size: 15px; line-height: 1.42; clear: both; }
  .copy p { margin: 0 0 8px; break-inside: avoid; }
  [data-style="broadsheet"] .copy p:first-of-type::first-letter { font-size: 52px; float: left; line-height: .82; padding: 4px 6px 0 0; font-family: var(--head); }
  .copy b { text-transform: uppercase; font-size: 12px; letter-spacing: .12em; }
  /* A crosshead: the floor, over its rooms in the report and on the switchboard. */
  h5 { margin: 12px 0 6px; font: italic 400 16px/1.2 var(--head); text-align: center; break-after: avoid; }
  h5::before, h5::after { content: " — "; }
  h5:first-child { margin-top: 0; }
  /* Anything in the report that can be switched is set like a correction: underlined, and pressable. */
  .fact { border-bottom: 1.5px dotted var(--ink); cursor: pointer; }
  .fact:hover { background: var(--ink); color: var(--paper); }
  .fact.away { border-bottom-style: solid; border-bottom-color: var(--flash); color: var(--flash); }
  /* A level that can be set is ruled twice: pressing it opens the scale, not the switch. */
  .fact.level { border-bottom: 3px double var(--ink); }
  /* The scale: a printed rule with a mark at every ten, and a slide in the paper's red. */
  .scale { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 10px; margin: 6px 0 8px; padding: 4px 8px; border: 1px solid var(--ink); break-inside: avoid; font-size: 13px; }
  /* The readers' poll over it: a question, and a vote each way. */
  .poll { flex: 1 1 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
  .poll i { flex: 1 1 100%; font-size: 14px; }
  .poll .act { margin: 0; font-size: 11px; padding: 6px 10px; }
  .poll .act[disabled] { opacity: .35; cursor: default; pointer-events: none; }
  .scale input { flex: 1 1 130px; min-width: 0; height: 34px; margin: 0; appearance: none; -webkit-appearance: none; cursor: pointer;
    background: repeating-linear-gradient(90deg, var(--ink) 0 1px, transparent 1px 10%) bottom / 100% 9px no-repeat, linear-gradient(var(--ink), var(--ink)) bottom / 100% 1px no-repeat; }
  .scale input::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 34px; background: var(--flash); border: 0; border-radius: 0; }
  .scale input::-moz-range-thumb { width: 14px; height: 34px; background: var(--flash); border: 0; border-radius: 0; }
  .scale output { font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }
  .scale > button { padding: 4px 8px; font-size: 18px; line-height: 1; }
  .copy .scale { margin-bottom: 0; }
  /* The clipping: one device's story, cut out and laid over the page a little askew. */
  dialog.clipping { width: min(540px, calc(100vw - 24px)); max-height: calc(100vh - 24px); padding: 0; border: 0; background: none; color: var(--ink); font: inherit; overflow: visible; }
  dialog.clipping::backdrop { background: rgba(0, 0, 0, .5); }
  /* Its edges are torn (clipping.ts gives the outline), so the shadow is the dialog's: a box's own shadow is cut off with it. */
  dialog.clipping { filter: drop-shadow(5px 7px 0 rgba(0, 0, 0, .4)); }
  .cutting { display: grid; grid-template-columns: minmax(0, 1fr) 30px; max-height: calc(100vh - 40px); overflow-y: auto; background: var(--paper); rotate: -.5deg;
    background-image: radial-gradient(rgba(0,0,0,.05) 1px, transparent 1px); background-size: 4px 4px; }
  .story { padding: 12px 16px 12px 20px; border-right: 1px solid var(--ink); min-width: 0; }
  /* What came away with it: the foot of the story above, cut through its last line; the
     edge of the next column, cut through its words; and the top of the headline below. */
  .scrap { overflow: hidden; opacity: .8; user-select: none; pointer-events: none; }
  .above { grid-column: 1 / -1; height: 15px; padding: 0 20px; border-bottom: 2px solid var(--ink); font-size: 15px; line-height: 5px; white-space: nowrap; } /* a line shorter than its type: the words stand half above the edge, where the tear takes them */
  .beside { position: relative; }
  .beside span { position: absolute; top: 6px; left: 8px; width: 190px; font-size: 14px; line-height: 1.42; }
  .below { grid-column: 1 / -1; height: 21px; padding: 5px 20px 0; border-top: 2px solid var(--ink); font: 900 28px/1 var(--head); white-space: nowrap; }
  .cutting .title { margin: 0 0 6px; font: 900 32px/1.02 var(--head); text-wrap: balance; overflow-wrap: anywhere; }
  .cutting .deck { font-size: 17px; }
  .cutting .still { display: block; width: 100%; margin: 0 0 12px; border: 1px solid var(--ink); filter: grayscale(1) contrast(1.15); }
  .cutting .still { cursor: zoom-in; }
  /* A photograph as a clipping: wider, in its own colours, and zoomed by the fingers
     (zoom.ts), so the browser is told to leave the touches alone. */
  dialog.clipping.shot { width: min(920px, calc(100vw - 24px)); }
  .zoom { overflow: hidden; border: 1px solid var(--ink); touch-action: none; cursor: zoom-in; background: #111; }
  .zoom.near { cursor: grab; }
  .zoom img { display: block; width: 100%; max-height: calc(100vh - 190px); object-fit: contain; user-select: none; -webkit-user-drag: none; }
  .hint { margin: 4px 0 10px; font-size: 12px; font-style: italic; }
  /* What somebody said of a song, in the celebrity column. */
  .mark { white-space: nowrap; font-style: italic; } .mark.loathe { color: var(--flash); }
  .cutting .act { margin: 0 0 12px; }
  .act.sure { background: var(--flash); color: #fff; border-color: var(--flash); }
  .cutting .scale > button { display: none; }
  .cutting .scale { margin: 0 0 12px; }
  .cutting .turn { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0 0 12px; font-size: 13px; }
  .cutting .turn i { flex: 0 0 100%; }
  .cutting .turn button:disabled { opacity: .5; }
  .cutting ol { max-height: 232px; overflow-y: auto; margin-bottom: 10px; }
  /* The record's band: the last day from left to right, inked where the device was on, with a mark at each hour. */
  .band { position: relative; height: 20px; border: 1px solid var(--ink); background: repeating-linear-gradient(90deg, rgba(0, 0, 0, .3) 0 1px, transparent 1px calc(100% / 24)); }
  .band i { position: absolute; top: 0; bottom: 0; background: var(--ink); }
  .span { display: flex; justify-content: space-between; margin: 2px 0 6px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; font-variant-numeric: tabular-nums; }
  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
  .foot .act { margin: 0; }
  li[role="button"] { cursor: pointer; }

  h3 { margin: 0 0 8px; font-size: 13px; letter-spacing: .3em; text-transform: uppercase; text-align: center;
    border-top: 2px solid var(--ink); border-bottom: 1px solid var(--ink); padding: 4px 0; }
  .item { border-bottom: 1px solid var(--ink); padding-bottom: 8px; margin-bottom: 10px; }
  .item h4 { margin: 0 0 4px; font: 900 24px/1.05 var(--head); text-wrap: balance; overflow-wrap: anywhere; }
  .item p { margin: 0 0 6px; font-size: 15px; line-height: 1.35; }
  .item .act { margin-bottom: 2px; font-size: 11px; }
  ul, ol { list-style: none; padding: 0; margin: 0 0 16px; font-size: 14px; line-height: 1.35; }
  li { padding: 4px 0; border-bottom: 1px dotted rgba(0,0,0,.4); }
  time { font-variant-numeric: tabular-nums; font-weight: 700; margin-right: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; margin-bottom: 16px; }
  td { padding: 4px 2px; border-bottom: 1px dotted rgba(0,0,0,.4); } td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  /* The agent's column: a model's account, in italics so that it isn't taken for the paper's own. */
  .desk { margin: 0 0 16px; }
  .desk p { margin: 0 0 6px; font-size: 14px; line-height: 1.4; font-style: italic; overflow-wrap: anywhere; }
  .desk .by { font-style: normal; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
  .desk .old { font-weight: 700; border-bottom: 1.5px dotted var(--ink); }
  .desk .lead { font-size: 16px; line-height: 1.35; }
  .desk .error { font-size: 13px; padding-left: 8px; border-left: 2px solid var(--ink); }
  .desk ul { margin: 0; font-size: 14px; line-height: 1.35; font-style: italic; overflow-wrap: anywhere; }
  .desk li b, .desk li time { font-style: normal; }
  /* The weather: the sky now, then the forecast's days, each with its sky and its high and low. */
  .now { margin: 0 0 6px; font-size: 15px; line-height: 1.35; }
  .days td:nth-child(2) { font-style: italic; } .days td:last-child { white-space: nowrap; }
  /* What Home Assistant isn't told about the house: a count that opens into its list. */
  details { border-bottom: 1px dotted rgba(0,0,0,.4); padding: 5px 0; font-size: 15px; }
  summary { cursor: pointer; font-weight: 700; }
  details ul { margin: 4px 0 0 16px; max-height: 260px; overflow-y: auto; }
  details li { border: 0; padding: 2px 0; }
  details li.via { font-style: italic; margin: 6px 0 2px; overflow-wrap: anywhere; }
  button.mend { border-bottom: 1.5px dotted var(--ink); overflow-wrap: anywhere; }
  p.mend { margin: 6px 0 16px; font-size: 13px; font-style: italic; line-height: 1.3; }
  /* The switchboard: every device as a plain button, for when you only want a switch. */
  .row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; break-inside: avoid; }
  /* A big house: the switchboard is a spread across the foot of the page, in columns. */
  .page > .board { grid-column: 1 / -1; border-left: 0; padding-left: 0; margin-top: 18px; }
  .board .rows { columns: 230px; column-gap: 26px; column-rule: 1px solid rgba(0,0,0,.25); }
  /* One story and no others: it takes the empty column too. */
  .solo > article { grid-column: span 2; }
  .row > span { flex: 0 0 100%; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }
  .chip { border: 1.5px solid var(--ink); padding: 3px 7px; font-size: 13px; }
  .chip.on { background: var(--ink); color: var(--paper); }
  .pair { display: inline-flex; } .chip.tab { border-left: 0; font-variant-numeric: tabular-nums; }
  .chip.tab[aria-expanded="true"] { background: var(--mark); color: #111; }
  .chip.away { border-style: dashed; border-color: var(--flash); color: var(--flash); text-decoration: line-through; }
  .ad { display: block; width: 100%; border: 1px solid var(--ink); padding: 8px 10px; margin-bottom: 8px; text-align: center; font-size: 14px; line-height: 1.3; }
  .ad b { display: block; font: 400 17px var(--head); letter-spacing: .14em; text-transform: uppercase; }
  .ad:hover { background: var(--ink); color: var(--paper); }

  /* ---------- the red-top ---------- */
  [data-style="tabloid"] { --paper: #fff; --ink: #111; --flash: #d7141a; --mark: #ffe600; --head: Impact, "Haettenschweiler", "Arial Narrow Bold", "Arial Black", sans-serif;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; background-image: none; }
  [data-style="tabloid"] .breaking { border: 0; background: var(--flash); color: #fff; font-weight: 800; text-align: left; text-transform: uppercase; animation-name: none; }
  [data-style="tabloid"] .breaking b { background: var(--mark); color: #111; padding: 2px 8px; letter-spacing: 0; font-style: italic; }
  [data-style="tabloid"] .masthead { text-align: left; border: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; }
  [data-style="tabloid"] .masthead h1 { font: italic 900 52px/1 "Arial Black", "Helvetica Neue", sans-serif; background: var(--flash); color: #fff; padding: 6px 20px 8px 14px; letter-spacing: -.05em; text-transform: uppercase; }
  [data-style="tabloid"] .masthead p { font: italic 800 16px/1.1 inherit; }
  [data-style="tabloid"] .dateline { background: var(--ink); color: #fff; border: 0; padding: 5px 10px; letter-spacing: .06em; font-weight: 700; }
  [data-style="tabloid"] .styles button[aria-pressed="true"] { background: var(--mark); color: #111; }
  [data-style="tabloid"] .page { gap: 0 22px; }
  [data-style="tabloid"] .page > * + * { border-left: 0; padding-left: 0; }
  [data-style="tabloid"] .kicker { display: inline-block; background: var(--mark); color: #111; font: italic 900 15px/1 "Arial Black", sans-serif; padding: 5px 10px; rotate: -2deg; letter-spacing: 0; }
  [data-style="tabloid"] h2 { font: 400 92px/.88 var(--head); letter-spacing: 0; }
  [data-style="tabloid"] .deck { font: 800 22px/1.15 inherit; }
  [data-style="tabloid"] .figure { border: 0; color: #fff; rotate: 2deg; width: 120px; background: radial-gradient(#fff3 1.2px, transparent 1.6px) 0 0 / 6px 6px, #111; }
  [data-style="tabloid"] .photo img { filter: none; border: 4px solid #111; }
  [data-style="tabloid"] .archive img, [data-style="tabloid"] .cutting .still { filter: none; }
  [data-style="tabloid"] .photo figcaption { font: 700 11px/1.3 system-ui, sans-serif; text-transform: uppercase; letter-spacing: .06em; }
  [data-style="tabloid"] .figure b { font: 400 36px/1 var(--head); color: var(--mark); }
  [data-style="tabloid"] .act { background: var(--flash); color: #fff; border: 0; font-weight: 900; font-style: italic; padding: 7px 14px; }
  [data-style="tabloid"] .act:hover { background: var(--ink); }
  [data-style="tabloid"] .copy { column-rule: 0; font-size: 14px; }
  [data-style="tabloid"] .fact { border-bottom: 2px solid var(--flash); }
  [data-style="tabloid"] h5 { font: italic 900 14px/1 "Arial Black", sans-serif; text-transform: uppercase; text-align: left; color: var(--flash); }
  [data-style="tabloid"] h5::before, [data-style="tabloid"] h5::after { content: none; }
  [data-style="tabloid"] .board .rows { column-rule: 0; }
  [data-style="tabloid"] .fact:hover { background: var(--mark); color: #111; }
  [data-style="tabloid"] .fact.level { border: 0; background: var(--mark); color: #111; padding: 0 3px; font-weight: 800; }
  [data-style="tabloid"] h3 { text-align: left; border: 0; background: var(--flash); color: #fff; padding: 5px 8px; letter-spacing: .02em; font: italic 900 14px/1 "Arial Black", sans-serif; }
  [data-style="tabloid"] .item h4 { font: 400 34px/.95 var(--head); text-transform: uppercase; }
  [data-style="tabloid"] .chip.on { background: var(--mark); color: #111; font-weight: 800; }
  [data-style="tabloid"] .ad { border: 3px solid var(--ink); } [data-style="tabloid"] .ad b { font: 400 24px/1 var(--head); letter-spacing: .02em; }
  [data-style="tabloid"] .ad:hover { background: var(--mark); color: #111; }

  /* ---------- the rolling news site ---------- */
  [data-style="rolling"] { --paper: #fff; --ink: #16181d; --flash: #c8102e; --site: #0b5cad; --mark: #ffe9a8; --head: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-family: var(--head); background-image: none; }
  /* Blue is the site's own colour. Red is kept for what is wrong (breaking news, a fault, a
     device not answering, a press that waits for its second), so that here red always means trouble. */
  [data-style="rolling"] .kicker { color: var(--site); }
  [data-style="rolling"] .mark.loathe { color: inherit; }
  [data-style="rolling"] :focus-visible { outline-color: var(--site); }
  [data-style="rolling"] .scale input::-webkit-slider-thumb { background: var(--site); } [data-style="rolling"] .scale input::-moz-range-thumb { background: var(--site); }
  [data-style="rolling"] .breaking { border: 0; background: var(--flash); color: #fff; font-weight: 600; text-align: left; animation-name: none; }
  [data-style="rolling"] .breaking b { background: #fff; color: var(--flash); padding: 1px 8px; border-radius: 3px; letter-spacing: .04em; }
  [data-style="rolling"] .masthead { text-align: left; border: 0; padding: 0 0 8px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; }
  [data-style="rolling"] .masthead h1 { font: 800 34px/1 var(--head); letter-spacing: -.03em; background: var(--ink); color: #fff; padding: 6px 12px; border-radius: 4px; }
  /* The site says it is live: a red light beside its strapline. */
  [data-style="rolling"] .masthead p { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--site); }
  [data-style="rolling"] .masthead p::before { content: ""; display: inline-block; width: 9px; height: 9px; margin-right: 7px; border-radius: 50%; background: var(--site); animation: live 1.6s ease-in-out infinite; }
  @keyframes live { 50% { opacity: .25; } }
  [data-style="rolling"] .dateline { border: 0; border-top: 3px solid var(--site); background: #f1f2f4; padding: 6px 10px; letter-spacing: .04em; font-weight: 600; margin-bottom: 0; }
  [data-style="rolling"] .styles button { border: 0; border-radius: 3px; } [data-style="rolling"] .styles button[aria-pressed="true"] { background: var(--site); color: #fff; }
  [data-style="rolling"] .page { gap: 0 24px; margin-top: 14px; }
  [data-style="rolling"] .page > * + * { border-left-color: #d9dce1; padding-left: 24px; }
  [data-style="rolling"] .kicker { font-weight: 800; letter-spacing: .06em; }
  [data-style="rolling"] h2 { font: 800 40px/1.06 var(--head); text-transform: none; letter-spacing: -.02em; animation-name: none; }
  [data-style="rolling"] .deck { font-style: normal; color: #454a54; }
  [data-style="rolling"] .figure { border: 0; border-left: 4px solid var(--site); background: #f1f2f4; text-align: left; padding: 10px 12px; }
  [data-style="rolling"] .figure b { font: 800 32px/1 var(--head); } [data-style="rolling"] .figure span { letter-spacing: .06em; font-weight: 600; }
  [data-style="rolling"] .act { border: 0; border-radius: 4px; background: var(--ink); color: #fff; padding: 6px 14px; font-weight: 700; letter-spacing: .03em; text-transform: none; }
  [data-style="rolling"] .act:hover { background: var(--site); } [data-style="rolling"] .act[disabled] { opacity: .4; }
  [data-style="rolling"] .act.sure { background: var(--flash); }
  [data-style="rolling"] .photo img, [data-style="rolling"] .archive img, [data-style="rolling"] .cutting .still { filter: none; border: 0; border-radius: 4px; }
  [data-style="rolling"] .photo figcaption { font-style: normal; color: #454a54; }
  [data-style="rolling"] .copy { column-rule-color: #d9dce1; }
  [data-style="rolling"] .fact { border-bottom: 1px solid #9aa0aa; } [data-style="rolling"] .fact:hover { background: var(--mark); }
  [data-style="rolling"] .fact.level { border: 0; background: #e8eaee; border-radius: 3px; padding: 0 2px; font-weight: 700; }
  [data-style="rolling"] h3 { text-align: left; border: 0; border-top: 3px solid var(--ink); padding: 6px 0 2px; font: 800 14px/1.2 var(--head); letter-spacing: .04em; }
  [data-style="rolling"] h5 { font: 700 12px/1 var(--head); font-style: normal; text-align: left; text-transform: uppercase; letter-spacing: .08em; color: var(--site); }
  [data-style="rolling"] h5::before, [data-style="rolling"] h5::after { content: none; }
  [data-style="rolling"] .item h4, [data-style="rolling"] .cutting .title { font: 800 22px/1.12 var(--head); }
  [data-style="rolling"] li, [data-style="rolling"] td, [data-style="rolling"] details { border-bottom: 1px solid #e3e5e9; }
  [data-style="rolling"] time { color: var(--site); }
  [data-style="rolling"] .chip { border: 1px solid #b8bdc6; border-radius: 4px; } [data-style="rolling"] .chip.on { background: var(--ink); border-color: var(--ink); color: #fff; }
  [data-style="rolling"] .pair .chip:first-child { border-radius: 4px 0 0 4px; } [data-style="rolling"] .chip.tab { border-radius: 0 4px 4px 0; }
  [data-style="rolling"] .ad { border: 1px solid #b8bdc6; border-radius: 4px; text-align: left; } [data-style="rolling"] .ad b { font: 700 15px var(--head); letter-spacing: 0; text-transform: none; }
  [data-style="rolling"] .ad:hover { background: var(--ink); color: #fff; }
  [data-style="rolling"] .mark, [data-style="rolling"] .hint, [data-style="rolling"] p.mend { font-style: normal; }
  /* A clipping here is a card, as a site's are: straight edges, and nothing torn away with it. */
  [data-style="rolling"] .cutting { clip-path: none !important; rotate: none; border-radius: 8px; background-image: none; grid-template-columns: minmax(0, 1fr); }
  [data-style="rolling"] .scrap { display: none; } [data-style="rolling"] .story { border: 0; padding: 18px 20px; }
  /* The ticker: the headlines passing under the dateline. Still, for a reader who has asked for less motion. */
  .ticker { display: flex; align-items: stretch; margin-top: 2px; background: var(--ink); color: #fff; font: 600 13px/1 var(--head); overflow: hidden; }
  .ticker b { flex: none; background: var(--site); padding: 7px 10px; text-transform: uppercase; letter-spacing: .06em; }
  .ticker div { flex: 1; min-width: 0; overflow: hidden; white-space: pre; padding: 7px 0; }
  .ticker span { display: inline-block; padding-left: 100%; animation: tick 40s linear infinite; }
  @keyframes tick { to { transform: translateX(-100%); } }
  @media (prefers-reduced-motion: reduce) { .ticker span { animation: none; padding-left: 10px; } [data-style="rolling"] .masthead p::before { animation: none; } }

  /* ---------- narrow: one column, in reading order ---------- */
  @container (max-width: 900px) {
    .paper { padding: 10px 14px 20px; }
    .page { grid-template-columns: 1fr; } .page > * + * { border-left: 0; padding-left: 0; margin-top: 18px; } .solo > article { grid-column: auto; }
    .copy { columns: 1; } h2 { font-size: 34px; }
    [data-style="tabloid"] h2 { font-size: 62px; } [data-style="tabloid"] .masthead h1 { font-size: 36px; }
    [data-style="rolling"] h2 { font-size: 30px; } [data-style="rolling"] .masthead h1 { font-size: 26px; }
    [data-style="rolling"] .page > * + * { padding-left: 0; }
    .figure, [data-style="tabloid"] .figure { width: 104px; } .figure b, [data-style="tabloid"] .figure b { font-size: 28px; }
  }
`, gu = "casa_mia_dash_bored/personal", _u = "casa_mia_dash_bored/playing", vu = "weather/subscribe_forecast", yu = 18e5, bu = "dash-bored-style", xu = "/casa_mia_dash_bored/fonts/ManufacturingConsent-Regular.ttf", Su = !1;
function Cu() {
	if (Su) return;
	Su = !0;
	let e = new FontFace("Dash-Bored Masthead", `url(${xu})`);
	document.fonts.add(e), e.load().catch((e) => console.error("Dash-Bored: the masthead's font could not be loaded", e));
}
var wu = class extends Nn {
	constructor(...e) {
		super(...e), this._played = [], this._days = [], this._style = "broadsheet", this._alerts = [], this._seen = [], this._rated = [], this._late = [], this._turn = /* @__PURE__ */ new Map(), this._showing = /* @__PURE__ */ new Set(), this._primed = !1, this._seenPrimed = !1;
	}
	static {
		this.styles = [W, hu];
	}
	static {
		this.properties = {
			_style: { state: !0 },
			_alerts: { state: !0 },
			_seen: { state: !0 },
			_scale: { state: !0 },
			_open: { state: !0 },
			_shot: { state: !0 },
			_rated: { state: !0 },
			_played: { state: !0 },
			_days: { state: !0 }
		};
	}
	setConfig(e) {
		super.setConfig(e), this._choose();
	}
	_surveyed() {
		this._outlook();
	}
	_moved(e) {
		this._note({
			time: Date.now(),
			device: e
		}), this._scale?.id === e.id && (this._scale = {
			...this._scale,
			want: void 0
		}), this._open?.id === e.id && (this._open = {
			...this._open,
			armed: !1,
			record: this._open.record && [...this._open.record, {
				at: Date.now(),
				on: e.on,
				phase: e.phase,
				level: e.level,
				away: e.away
			}]
		});
	}
	connectedCallback() {
		super.connectedCallback(), Cu(), this._choose();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._primed = this._seenPrimed = !1, this._forecastOf = void 0;
	}
	_choose() {
		let e = this._config.style;
		try {
			e ??= localStorage.getItem(bu) ?? void 0;
		} catch {}
		e && e in Ql && (this._style = e);
	}
	_dress(e) {
		this._style = e;
		try {
			localStorage.setItem(bu, e);
		} catch {}
	}
	_listen() {
		super._listen(), this._follow(Cn, "Sensor Watch's alerts", (e) => this._take(e)), this._follow(wn, "The cameras' sightings", (e) => this._sight(e));
		let e = (e, t) => [...new Map(e.map((e) => [t(e), e])).values()];
		this._follow(gu, "The Personal column's announcements", (t) => this._rated = e([...this._rated, ...t], (e) => `${e.at} ${e.name} ${e.title}`)), this._follow(_u, "What the players have played", (t) => this._played = e([...this._played, ...t], (e) => e.id));
	}
	_outlook() {
		let e = this._hass?.connection, t = this._house?.outside, n = t?.daily ? t.id : void 0;
		if (!e || !this.isConnected || n === this._forecastOf || (this._feeds.get(vu)?.then((e) => e()).catch(() => void 0), this._feeds.delete(vu), this._forecastOf = n, this._days = [], !n)) return;
		let r = e.subscribeMessage((e) => this._days = xt(e.forecast), {
			type: vu,
			forecast_type: "daily",
			entity_id: n
		});
		this._feeds.set(vu, r), r.catch((e) => {
			this._feeds.delete(vu), console.error(`Dash-Bored: the forecast of ${n} failed`, e), this._fault = `The weather forecast is not reaching this page (${e?.message ?? e}).`;
		});
	}
	_sight(e) {
		let t = new Map(this._seen.map((e) => [e.id, e])), n = Date.now();
		for (let r of e) {
			let e = t.has(r.id);
			t.set(r.id, r);
			let i = n - r.at * 1e3;
			if (e || i >= 6e5) continue;
			this._later(hn - i);
			let [a] = this._seenPrimed && this._survey ? Yt(this._survey, [r]) : [];
			a && this._note({
				time: a.at,
				seen: a
			});
		}
		this._seenPrimed = !0, this._seen = [...t.values()].filter((e) => n - e.at * 1e3 < yu);
	}
	_take(e) {
		let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
		for (let n of e) {
			let e = {
				...n,
				at: n.at * 1e3,
				began: n.began * 1e3,
				flavour: bn(this._hass?.states[n.entity_id]?.attributes.device_class)
			};
			t.set(e.entity_id, e), this._primed && (this._note({
				time: e.at,
				alert: e
			}), e.level === "nominal" ? this._later(hn) : this.scrollIntoView({
				block: "start",
				behavior: "smooth"
			}));
		}
		this._primed = !0, this._alerts = [...t.values()];
	}
	_later(e) {
		let t = setTimeout(() => {
			this._timers.delete(t), this.requestUpdate();
		}, e + 1e3);
		this._timers.add(t);
	}
	_note(e) {
		this._late = [e, ...this._late].slice(0, 8);
	}
}, Tu = 6e3, Eu = /* @__PURE__ */ new Set([
	"climate",
	"media_player",
	"camera",
	"water_heater",
	"vacuum",
	"lawn_mower",
	"alarm_control_panel"
]), Du = class extends wu {
	_press(e) {
		e.guarded || e.away || Eu.has(e.kind) ? this._story(e) : this._call(z(e), `${e.room} ${e.name}`);
	}
	_story(e) {
		this._open = { id: e.id }, this._scale = e.dims && !e.away ? { id: e.id } : void 0;
		let t = (t) => {
			this._open?.id === e.id && (this._open = {
				...this._open,
				...t
			});
		};
		e.kind !== "camera" && Ao(this._hass, e, Date.now()).then((e) => t({ record: e }), (n) => {
			console.error(`Dash-Bored: the history of ${e.id} could not be read`, n), t({ fault: n?.message ?? String(n) });
		});
	}
	_shut() {
		this._open = this._scale = this._shot = void 0;
	}
	_live(e) {
		this._shut(), s(this, "hass-more-info", { entityId: e });
	}
	_look(e) {
		this._shut(), this._shot = e;
	}
	_flip(e) {
		let t = this._open;
		if (e.guarded && (e.kind === "lock" ? e.on : !e.on) && !t.armed) {
			this._open = {
				...t,
				armed: !0
			};
			let n = setTimeout(() => {
				this._timers.delete(n), this._open?.id === e.id && (this._open = {
					...this._open,
					armed: !1
				});
			}, Tu);
			this._timers.add(n);
			return;
		}
		this._open = {
			...t,
			armed: !1
		}, this._call(z(e), `${e.room} ${e.name}`);
	}
	updated() {
		let e = this.renderRoot.querySelector("dialog");
		e && !e.open && e.showModal();
	}
	_measure(e) {
		this._scale = this._scale?.id === e.id ? void 0 : { id: e.id };
	}
	_key(e) {
		(e.key === "Enter" || e.key === " ") && (e.preventDefault(), e.currentTarget.click());
	}
}, Ou = "dash-bored-gazette", ku = 30, Au = 3, ju = /* @__PURE__ */ new Set([
	"climate",
	"camera",
	"water_heater",
	"alarm_control_panel"
]), Mu = /* @__PURE__ */ new Set(["docked"]), Nu = (e) => e.away || !!e.phase && !Mu.has(e.phase) || !ju.has(e.kind) && (e.kind === "lock" ? !e.on : e.on), Pu = (e) => e.kind !== "camera" || e.away, Fu = class extends Du {
	render() {
		let e = this._hass, t = this._house, n = Ql[this._style];
		if (!e || !t) return M`<div class="paper" data-style=${this._style}><p class="wait">Waiting for Home Assistant.</p></div>`;
		let r = Date.now(), i = Yt(this._survey, this._seen).filter((e) => r - e.at < yu), a = [...i].sort((e, t) => t.at - e.at).slice(0, 10), o = (e) => (n.stories[`sighting.${e}`]?.kicker ?? e).toLowerCase(), l = Sn(t, this._alerts, r, i);
		for (let e of l) this._showing.has(e.id) || this._turn.set(e.id, (this._turn.get(e.id) ?? -1) + 1);
		this._showing = new Set(l.map((e) => e.id));
		let u = l.map((e) => ({
			s: e,
			...Hl(n, e, this._turn.get(e.id))
		})), [d, ...f] = u, p = u.find((e) => e.s.kind === "alert"), m = (e) => {
			let t = (t, n) => t ? M`<button class="act" @click=${() => this._call(n, e.head)}>${t}</button>` : F;
			return M`${t(e.act, e.s.press)}${t(e.vote, e.s.vote)}`;
		}, h = (e, t) => {
			let [r, i, a] = e.dims && !e.away ? Kl(n, e) : [
				ql(n, e),
				"",
				""
			], o = (e, t, n) => e ? M`<span class="fact ${t}" role="button" tabindex="0" @click=${n} @keydown=${this._key}>${e}</span>` : F;
			return M`${o(t ? H(r) : r, e.away ? "away" : "", () => this._press(e))}${o(i, "level", () => this._measure(e))}${o(a, "", () => this._press(e))}`;
		}, g = (e) => {
			let t = this._scale;
			if (!e || !t || t.id !== e.id || !e.dims || e.away) return F;
			let { min: r, max: i, step: a, vote: o } = e.span, s = e.level ?? r, c = (e) => Number(e.target.value), l = t.want ?? s, u = Gl(n, e), d = (n, a) => {
				let o = Math.min(i, Math.max(r, Math.round((l + a) * 10) / 10));
				return M`<button class="act" ?disabled=${o === l} @click=${() => (this._scale = {
					...t,
					want: o
				}, this._ask(e, o))}>${n}</button>`;
			};
			return M`<span class="scale">
        <span class="poll"><i>${H(u.ask)}</i>${d(u.less, -o)}${d(u.more, o)}</span>
        <input type="range" min=${r} max=${i} step=${a} aria-label=${e.name} .value=${Pl(String(l))}
          @input=${(e) => this._scale = {
				...t,
				want: c(e)
			}}
          @change=${(t) => this._ask(e, c(t))} />
        <output>${Ul(n, e.kind, s)}${t.want === void 0 || t.want === s ? "" : ` → ${t.want}`}</output>
        <button aria-label="Close" @click=${() => this._scale = void 0}>×</button>
      </span>`;
		}, _ = (e) => e.photo ? M`<figure class="photo" role="button" tabindex="0" @click=${() => this._look({
			src: e.photo,
			caption: `${e.figure[1]}, ${e.figure[0]}`,
			see: e.see
		})} @keydown=${this._key}>
            <img src=${e.photo} alt=${e.figure[1]} loading="lazy" @error=${() => this._fault = `The photograph from ${e.figure[1]} could not be fetched.`} />
            <figcaption>${e.figure[1]}, ${e.figure[0]}</figcaption>
          </figure>` : F, v = t.rooms.filter((e) => e.temp !== void 0), y = pn(t.people, this._rated, r), b = t.desk, x = !!b?.lead && _t(b.lead, r), S = (t) => new Date(t).toDateString() === new Date(r).toDateString() ? V(t) : `${new Date(t).toLocaleDateString(e.locale?.language ?? "en-GB", {
			day: "numeric",
			month: "short"
		})}, ${V(t)}`, C = (e) => e.failed ? M`<i>${n.desk.failed}:</i> ` : e.unsure ? M`<i>${n.desk.unsure}:</i> ` : F, w = t.rooms.filter((e) => e.devices.length), T = w.reduce((e, t) => e + t.devices.length, 0) > ku, E = w.map((e) => ({
			...e,
			devices: e.devices.filter(T ? Nu : Pu)
		})).filter((e) => e.devices.length), D = w.some((e) => e.floor), O = (e, t, r = (e) => e) => {
			let i = /* @__PURE__ */ new Map();
			for (let t of e) i.set(t.floor ?? "", [...i.get(t.floor ?? "") ?? [], t]);
			return [...i].map(([e, i]) => M`${D ? M`<h5>${e || n.titles.elsewhere}</h5>` : F}${r(i.map(t))}`);
		}, ee = (e) => {
			let t = (t) => {
				let n = e.devices.filter((e) => T && e.kind === t && e.on && !e.away);
				return n.length > Au ? n : [];
			}, r = t("light"), i = t("switch"), a = e.devices.filter((e) => !r.includes(e) && !i.includes(e)).map((e, t) => h(e, !t && !r.length && !i.length));
			return i.length && a.unshift(r.length ? Q(n.words["switch.many"], U(i.length)) : H(Q(n.words["switch.many"], U(i.length)))), r.length && a.unshift(M`<span class="fact" role="button" tabindex="0" @click=${() => this._call({
				domain: "light",
				service: "turn_off",
				ids: r.map((e) => e.id)
			}, e.name)} @keydown=${this._key}>${H(Q(n.words["light.many"], U(r.length)))}</span>`), M`<p><b>${e.name}.</b> ${a.map((e, t) => M`${t ? n.join : ""}${e}`)}${n.end}${this._open ? F : g(e.devices.find((e) => e.id === this._scale?.id))}</p>`;
		}, te = (e) => M`<div class="pair"><button class="chip ${e.on ? "on" : ""} ${e.away ? "away" : ""}" aria-pressed=${e.on} @click=${() => this._press(e)}>${e.name}</button
        ><button class="chip tab" aria-label="${e.name}: its story" @click=${() => this._story(e)}>${e.dims && !e.away ? `${e.level ?? e.span.min}${Et.has(e.kind) ? "°" : "%"}` : "›"}</button></div>`, ne = t.rooms.flatMap((e) => e.devices), k = new Map([...ne.flatMap((e) => (e.controls ?? []).flatMap((e) => e.device ? [e.device] : [])), ...ne].map((e) => [e.id, e])), A = this._open && k.get(this._open.id), re = un(this._played, this._rated, k), ie = f.length ? f : u, ae = {
			above: ie[0].deck,
			beside: [...ie, ...u].map((e) => `${e.head}. ${e.deck}`).join(" "),
			below: ie.at(-1).head
		}, oe = M`<h3>${n.titles.board}</h3>
      ${O(w, (e) => M`<div class="row"><span>${e.name}</span>${e.devices.map(te)}</div>`, (e) => M`<div class="rows">${e}</div>`)}`, se = b ? M`<h3>${n.titles.desk}</h3>
                <div class="desk">
                  <p class="by">${Q(n.desk.by, { name: b.by ?? n.desk.staff })}${b.lead ? M` · <span class=${x ? "old" : ""} role=${x ? "alert" : F}>${Q(x ? n.desk.lapsed : n.desk.filed, { time: S(b.lead.at) })}</span>` : F}</p>
                  ${b.lead ? M`<p class="lead">${C(b.lead)}${b.lead.text}</p>${[b.lead.attention, b.lead.objective].map((e) => e ? M`<p>${e}</p>` : F)}` : F}
                  ${b.lead?.errors.map((e) => M`<p class="error">${e}</p>`)}
                  ${b.pieces.length ? M`<ul>${b.pieces.map((e) => M`<li><time>${S(e.at)}</time><b>${e.name}.</b> ${C(e)}${e.text}${e.attention ? ` ${e.attention}` : ""}</li>`)}</ul>` : F}
                </div>` : F;
		return M`<div class="paper" data-style=${this._style}>
      ${this._lost ? M`<div class="fault" role="alert">Not connected to Home Assistant since ${V(this._lost)}. What follows is how things stood then.</div>` : F}
      ${this._fault ? M`<div class="fault" role="alert">${this._fault}</div>` : F}
      ${p ? Nl(p.s.id + p.s.variant, M`<div class="breaking" role="status"><b>${n.flash}</b>${p.head}${/[!?]$/.test(p.head) ? "" : ":"} ${p.s.vars.message}</div>`) : F}
      <header class="masthead"><h1>${n.name}</h1><p>${n.strap}</p></header>
      <div class="dateline">
        ${this.hasAttribute("panel") ? M`<ha-menu-button .hass=${e} .narrow=${this.narrow}></ha-menu-button>` : F}
        <span>${(/* @__PURE__ */ new Date()).toLocaleDateString(e.locale?.language ?? "en-GB", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric"
		})}</span>
        ${this._config.style ? F : M`<span class="styles">${Object.entries(Ql).map(([e, t]) => M`<button aria-pressed=${e === this._style} @click=${() => this._dress(e)}>${t.label}</button>`)}</span>`}
        <span>${n.price} · ${V(Date.now())}</span>
      </div>
      ${n.ticker ? M`<div class="ticker" aria-hidden="true"><b>${n.ticker}</b><div><span>${u.map((e) => e.head).join("  •  ")}</span></div></div>` : F}
      <main class="page ${f.length || b ? "" : "solo"}">
        <article>
          <div class="figure"><b>${d.s.figure[0]}</b><span>${d.s.figure[1]}</span></div>
          <p class="kicker">${d.kicker}</p>
          ${Nl(d.head, M`<h2>${d.head}</h2>`)}
          <p class="deck">${d.deck}</p>
          ${m(d)}
          ${_(d.s)}
          <div class="copy">
            ${d.body ? M`<p>${d.body}</p>` : F}
            ${O(E, ee)}
            ${w.length > E.length ? M`<p>${Q(n.rest, U(w.length - E.length))}</p>` : F}
            ${w.length ? F : M`<p>No areas with lights, switches or other devices were found. Give your devices areas in Home Assistant's settings and this page fills itself in.</p>`}
          </div>
        </article>
        ${f.length || b ? M`<section>
              ${f.length ? M`<h3>${n.titles.more}</h3>` : F}
              ${f.slice(0, 3).map((e) => M`<div class="item"><p class="kicker">${e.kicker}</p><h4>${e.head}</h4>${_(e.s)}<p>${e.deck}</p>${m(e)}</div>`)}
              ${f.length > 3 ? M`<h3>${n.titles.briefs}</h3><ul>${f.slice(3).map((e) => M`<li><b>${e.head}.</b> ${e.deck}</li>`)}</ul>` : F}
              ${se}
            </section>` : F}
        <aside>
          <h3>${n.titles.late}</h3>
          <ol>${this._late.length ? this._late.map((e) => {
			let t = e.device && k.get(e.device.id);
			return M`<li role=${t ? "button" : F} tabindex=${t ? 0 : F} @click=${() => t && this._story(t)} @keydown=${this._key}><time>${V(e.time)}</time>${e.alert ? Zl(n, e.alert) : e.seen ? `${e.seen.name}: ${o(e.seen.kind)}` : `${e.device.room}: ${ql(n, e.device)}`}</li>`;
		}) : M`<li>${n.nothing}</li>`}</ol>
          ${a.length ? M`<h3>${n.titles.archive}</h3>
                <ol class="archive">${a.map((e) => M`<li role="button" tabindex="0" @click=${() => e.photo ? this._look({
			src: e.photo,
			caption: `${e.name}, ${V(e.at)}`,
			see: e.camera
		}) : s(this, "hass-more-info", { entityId: e.camera })} @keydown=${this._key}>
                    ${e.photo ? M`<img src=${e.photo} alt="" loading="lazy" />` : M`<i></i>`}<span><time>${V(e.at)}</time>${e.name}: ${o(e.kind)}</span></li>`)}</ol>` : F}
          ${y.length ? M`<h3>${n.titles.personal}</h3><ol>${y.map((e) => M`<li><time>${V(e.at)}</time>${Xl(n, e)}</li>`)}</ol>` : F}
          ${re.length ? M`<h3>${n.titles.celebrity}</h3><ol>${re.map((e) => {
			let [t, r] = Yl(n, e);
			return M`<li role="button" tabindex="0" @click=${() => this._story(k.get(e.id))} @keydown=${this._key}><time>${V(e.at)}</time>${t}${r.map((t, n) => M` <span class="mark ${e.marks[n].kind}">${t}</span>`)}</li>`;
		})}</ol>` : F}
          ${t.outside ? M`<h3>${n.titles.weather}</h3>
                <p class="now">${Q(n.forecast.now, {
			sky: Jl(n, t.outside.sky),
			temp: t.outside.temp.toFixed(1)
		})}</p>
                ${this._days.length ? M`<table class="days">${this._days.map((t) => M`<tr><td>${new Date(t.at).toDateString() === new Date(r).toDateString() ? n.forecast.today : new Date(t.at).toLocaleDateString(e.locale?.language ?? "en-GB", { weekday: "long" })}</td>
                        <td>${Jl(n, t.sky)}</td><td>${Math.round(t.high)}°${t.low === void 0 ? "" : ` / ${Math.round(t.low)}°`}</td></tr>`)}</table>` : F}` : F}
          ${v.length ? M`<h3>${n.titles.temps}</h3><table>${v.map((e) => M`<tr><td>${e.name}</td><td>${e.temp.toFixed(1)}° ${e.target === void 0 ? "" : e.temp < e.target - .5 ? "▼" : e.temp > e.target + .5 ? "▲" : "="}</td></tr>`)}</table>` : F}
          ${T ? F : oe}
          ${t.gaps.length ? M`<h3>${n.titles.gaps}</h3>
                ${t.gaps.map((e) => M`<details><summary>${Q(n.gaps[e.kind], U(e.items.length))}</summary>
                  <ul>${e.items.map((t, n) => M`${e.kind === "plumbing" && t.via !== e.items[n - 1]?.via ? M`<li class="via">${Vl[t.via ?? ""] ?? `${t.via}. ${Vl[""]}`}:</li>` : F}<li><button class="mend" @click=${() => e.kind === "floorless" || e.kind === "cold" ? c(`/config/areas/area/${t.id}`) : s(this, "hass-more-info", { entityId: t.id })}>${t.name}</button></li>`)}</ul></details>`)}
                <p class="mend">${n.mend}</p>` : F}
          ${t.scenes.length || t.rooms.some((e) => e.scenes.length) ? M`<h3>${n.titles.notices}</h3>${Zt(t).slice(0, 8).map((e, t) => M`<button class="ad" @click=${() => this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.name)}><b>${e.name}</b>${n.notices[t % n.notices.length]}</button>`)}` : F}
        </aside>
        ${T ? M`<section class="board">${oe}</section>` : F}
      </main>
      ${A ? mu(n, A, this._open, r, g(A), ae, {
			flip: () => this._flip(A),
			more: () => this._live(A.id),
			picture: () => this._look({
				src: A.picture,
				caption: `${A.room}: ${A.name}`,
				see: A.id
			}),
			shut: () => this._shut(),
			turn: (e) => this._call(nn(e), `${A.room} ${A.name} to ${e.name}`),
			zoom: (e) => this._ask(A, e, tn),
			control: (e) => e.device ? this._press(e.device) : this._call(an(e), `${A.room} ${e.name}`)
		}) : this._shot ? pu(n, this._shot, ae, {
			more: () => this._live(this._shot.see),
			shut: () => this._shut()
		}) : F}
    </div>`;
	}
}, Iu = new URL(import.meta.url).searchParams.get("v") || "dev";
u(Ou, Fu), u(ws, Ts), u(tc, nc), u(Uc, Wc), u(Xc, $c), u(Ol, kl), u(jl, Ml), u(sr, br), u(Ta, Pa), u(ga, wa);
for (let [e, t] of [
	[el, ll],
	[tl, ul],
	[nl, dl]
]) u(e, t), u(`${e}-editor`, pl(e));
d(Ou, "Casa Mia Dash-Bored Gazette", "Your house as a newspaper: what matters most is the headline, and every underlined fact is a switch. Best in a panel view."), d(Xc, "Casa Mia Dash-Bored Console", "Your house as a control panel, in the style of a decade, with a switch to choose which. Every decade from the 1950s to the 1990s is built. Best in a panel view."), d(sr, "Casa Mia Dash-Bored Fridge", "Your house as a fridge door: a polaroid for each room, a magnet for each device, sticky notes for what is wrong and the cameras' pictures held up by a butterfly. Dress it as a young family's, a pair of yuppies' or grandparents'. Best in a panel view."), d(Ta, "Casa Mia Dash-Bored Aurora", "Your house in the current web style: glass tiles over a sky that warms as the lights come on, with the scenes, the power being drawn and a thermostat. A room's tile has a dot for each device and grows into a sheet of faders. Best in a panel view."), d(el, "Casa Mia Dash-Bored Console instrument", "One light, switch, thermostat, lock, camera, alarm, scene or sensor as an instrument on the Console, in the style of a decade: a knob, a switch, a screen or a meter. On its era's panel, or on the dashboard's own card."), d(tl, "Casa Mia Dash-Bored Console room", "One room as a chassis on the Console, in the style of a decade: a lamp for its lights, a meter for its temperature, and a control for each of its devices."), d(nl, "Casa Mia Dash-Bored Console warning lamps", "Sensor Watch's warnings as the Console's warning lamps, in the style of a decade, the worst first. A green lamp says when all is well."), a("Dash-Bored", "casa_mia_dash_bored/cards", Iu);
//#endregion
