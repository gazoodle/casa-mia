function e(e, t) {
	let n = (t) => console.error(`CASA-MIA CARDS: ${e} won't work: ${t}`), r = () => {
		let e = window.hassConnection;
		return e?.then(t, (e) => n(`Home Assistant's connection failed (${e})`)), !!e;
	};
	if (r()) return;
	let i = 600, a = setInterval(() => {
		r() ? clearInterval(a) : --i === 0 && (clearInterval(a), n("Home Assistant's connection never appeared"));
	}, 100);
}
function t(t, n, r) {
	r !== "dev" && e(`${t}'s offer to reload after an update`, ({ conn: e }) => {
		e.addEventListener("ready", () => e.sendMessagePromise({ type: n }).then(({ version: e }) => {
			e && e !== r && (console.warn(`CASA-MIA CARDS: ${t} ${r} running, ${e} served: reload to update`), document.querySelector("home-assistant")?.dispatchEvent(new CustomEvent("hass-notification", {
				detail: {
					message: `${t} updated to ${e}: reload to use it`,
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
function i(e) {
	history.pushState(null, "", e), r(window, "location-changed", { replace: !1 });
}
function a(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function o(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !0,
		documentationURL: "https://github.com/gazoodle/casa-mia"
	});
}
var s = n.main, c = n.panel;
({
	...s,
	...c
});
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var l = globalThis, u = l.ShadowRoot && (l.ShadyCSS === void 0 || l.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, d = Symbol(), f = /* @__PURE__ */ new WeakMap(), p = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== d) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (u && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = f.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && f.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, m = (e) => new p(typeof e == "string" ? e : e + "", void 0, d), h = (e, ...t) => new p(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, d), g = (e, t) => {
	if (u) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = l.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, _ = u ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return m(t);
})(e) : e, { is: v, defineProperty: y, getOwnPropertyDescriptor: b, getOwnPropertyNames: x, getOwnPropertySymbols: S, getPrototypeOf: ee } = Object, C = globalThis, te = C.trustedTypes, ne = te ? te.emptyScript : "", re = C.reactiveElementPolyfillSupport, w = (e, t) => e, T = {
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
}, ie = (e, t) => !v(e, t), E = {
	attribute: !0,
	type: String,
	converter: T,
	reflect: !1,
	useDefault: !1,
	hasChanged: ie
};
Symbol.metadata ??= Symbol("metadata"), C.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var D = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = E) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && y(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = b(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? E;
	}
	static _$Ei() {
		if (this.hasOwnProperty(w("elementProperties"))) return;
		let e = ee(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(w("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(w("properties"))) {
			let e = this.properties, t = [...x(e), ...S(e)];
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
			for (let e of n) t.unshift(_(e));
		} else e !== void 0 && t.push(_(e));
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
		return g(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? T : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? T : e.converter;
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
D.elementStyles = [], D.shadowRootOptions = { mode: "open" }, D[w("elementProperties")] = /* @__PURE__ */ new Map(), D[w("finalized")] = /* @__PURE__ */ new Map(), re?.({ ReactiveElement: D }), (C.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var O = globalThis, ae = (e) => e, k = O.trustedTypes, oe = k ? k.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, se = "$lit$", A = `lit$${Math.random().toFixed(9).slice(2)}$`, ce = "?" + A, le = `<${ce}>`, j = document, M = () => j.createComment(""), N = (e) => e === null || typeof e != "object" && typeof e != "function", ue = Array.isArray, de = (e) => ue(e) || typeof e?.[Symbol.iterator] == "function", P = "[ 	\n\f\r]", F = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, fe = /-->/g, pe = />/g, I = RegExp(`>|${P}(?:([^\\s"'>=/]+)(${P}*=${P}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), me = /'/g, he = /"/g, ge = /^(?:script|style|textarea|title)$/i, L = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), R = Symbol.for("lit-noChange"), z = Symbol.for("lit-nothing"), _e = /* @__PURE__ */ new WeakMap(), B = j.createTreeWalker(j, 129);
function ve(e, t) {
	if (!ue(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return oe === void 0 ? t : oe.createHTML(t);
}
var ye = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = F;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === F ? c[1] === "!--" ? o = fe : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = I) : (ge.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = I) : o = pe : o === I ? c[0] === ">" ? (o = i ?? F, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? I : c[3] === "\"" ? he : me) : o === he || o === me ? o = I : o === fe || o === pe ? o = F : (o = I, i = void 0);
		let d = o === I && e[t + 1].startsWith("/>") ? " " : "";
		a += o === F ? n + le : l >= 0 ? (r.push(s), n.slice(0, l) + se + n.slice(l) + A + d) : n + A + (l === -2 ? t : d);
	}
	return [ve(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, be = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ye(t, n);
		if (this.el = e.createElement(l, r), B.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = B.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(se)) {
					let t = u[o++], n = i.getAttribute(e).split(A), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Se : r[1] === "?" ? Ce : r[1] === "@" ? we : U
					}), i.removeAttribute(e);
				} else e.startsWith(A) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ge.test(i.tagName)) {
					let e = i.textContent.split(A), t = e.length - 1;
					if (t > 0) {
						i.textContent = k ? k.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], M()), B.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], M());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === ce) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(A, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += A.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = j.createElement("template");
		return n.innerHTML = e, n;
	}
};
function V(e, t, n = e, r) {
	if (t === R) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = N(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = V(e, i._$AS(e, t.values), i, r)), t;
}
var xe = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? j).importNode(t, !0);
		B.currentNode = r;
		let i = B.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new H(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Te(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = B.nextNode(), a++);
		}
		return B.currentNode = j, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, H = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = z, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = V(this, e, t), N(e) ? e === z || e == null || e === "" ? (this._$AH !== z && this._$AR(), this._$AH = z) : e !== this._$AH && e !== R && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? de(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== z && N(this._$AH) ? this._$AA.nextSibling.data = e : this.T(j.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = be.createElement(ve(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new xe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = _e.get(e.strings);
		return t === void 0 && _e.set(e.strings, t = new be(e)), t;
	}
	k(t) {
		ue(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(M()), this.O(M()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ae(e).nextSibling;
			ae(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, U = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = z, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = z;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = V(this, e, t, 0), a = !N(e) || e !== this._$AH && e !== R, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = V(this, r[n + o], t, o), s === R && (s = this._$AH[o]), a ||= !N(s) || s !== this._$AH[o], s === z ? e = z : e !== z && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === z ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Se = class extends U {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === z ? void 0 : e;
	}
}, Ce = class extends U {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== z);
	}
}, we = class extends U {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = V(this, e, t, 0) ?? z) === R) return;
		let n = this._$AH, r = e === z && n !== z || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== z && (n === z || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Te = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		V(this, e);
	}
}, Ee = {
	M: se,
	P: A,
	A: ce,
	C: 1,
	L: ye,
	R: xe,
	D: de,
	V,
	I: H,
	H: U,
	N: Ce,
	U: we,
	B: Se,
	F: Te
}, De = O.litHtmlPolyfillSupport;
De?.(be, H), (O.litHtmlVersions ??= []).push("3.3.3");
var Oe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new H(t.insertBefore(M(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, ke = globalThis, W = class extends D {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Oe(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return R;
	}
};
W._$litElement$ = !0, W.finalized = !0, ke.litElementHydrateSupport?.({ LitElement: W });
var Ae = ke.litElementPolyfillSupport;
Ae?.({ LitElement: W }), (ke.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/lit-html/directive.js
var G = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, je = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Me = class {
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
}, { I: Ne } = Ee, Pe = (e) => e.strings === void 0, Fe = {}, Ie = (e, t = Fe) => e._$AH = t, Le = je(class extends Me {
	constructor() {
		super(...arguments), this.key = z;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (Ie(e), this.key = t), n;
	}
}), Re = je(class extends Me {
	constructor(e) {
		if (super(e), e.type !== G.PROPERTY && e.type !== G.ATTRIBUTE && e.type !== G.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!Pe(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === R || t === z) return t;
		let n = e.element, r = e.name;
		if (e.type === G.PROPERTY) {
			if (t === n[r]) return R;
		} else if (e.type === G.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return R;
		} else if (e.type === G.ATTRIBUTE && n.getAttribute(r) === t + "") return R;
		return Ie(e), t;
	}
}), ze = "dash_bored_hide", Be = "casa_mia_dash_bored", Ve = /\b(led|relay|screen|screensaver|in use|enabled|watching|mode|program(me)?|charge)\b/i, He = {
	climate: "thermostat",
	media_player: "player",
	lawn_mower: "mower",
	water_heater: "water heater",
	alarm_control_panel: "alarm"
}, Ue = /* @__PURE__ */ new Set(["climate", "water_heater"]), We = /* @__PURE__ */ new Set([
	"lock",
	"valve",
	"siren"
]), Ge = /* @__PURE__ */ new Set([
	"garage",
	"gate",
	"door"
]);
function Ke(e, t, n) {
	let r = e.slice(t.length), i = (e.toLowerCase().startsWith(t.toLowerCase()) && !/^[a-z0-9]/i.test(r) ? r.replace(/^[\s\-–—:,.]+/, "") : e).replace(n === "light" ? /\s+lights?$/i : n === "switch" ? /\s+switch$/i : /$^/, ""), a = He[n] ?? n, o = !i || RegExp(`^${a}s?$`, "i").test(i) ? a : i;
	return o[0].toUpperCase() + o.slice(1);
}
function qe(e, t) {
	let n = /* @__PURE__ */ new Map(), r = [], i = [], a = [], o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = t.weather, l = [], u = [], d = [], f = (e) => !!e?.labels?.includes(ze);
	for (let u of Object.values(e.entities ?? {})) {
		let p = u.entity_id, m = e.states[p];
		if (!m || u.hidden || u.entity_category) continue;
		let h = p.split(".")[0];
		h === "scene" && r.push(p), h === "weather" && (!c || p === "weather.home") && !t.weather && (c = p), h === "sensor" && m.attributes.device_class === "power" && u.device_id && o.set(u.device_id, p);
		let g = e.devices?.[u.device_id], _ = e.areas?.[u.area_id ?? g?.area_id];
		if (f(u) || f(g) || f(_)) continue;
		if (h === "person" && i.push(p), h === "image" && u.platform === Be && !f(e.entities[m.attributes.camera]) && a.push({
			id: p,
			name: g?.name_by_user ?? g?.name ?? p,
			room: _?.name
		}), Ye.has(h)) {
			let e = m.attributes.friendly_name ?? u.name ?? p;
			_ || l.push({
				id: p,
				name: e
			}), Ve.test(e) && d.push({
				id: p,
				name: e,
				via: u.platform
			});
		}
		if (!_ || !Ye.has(h)) continue;
		if (!n.has(_.area_id)) {
			let t = e.floors?.[_.floor_id];
			n.set(_.area_id, {
				id: _.area_id,
				name: _.name,
				floor: t?.name,
				level: t ? t.level ?? 0 : Infinity,
				temp: _.temperature_entity_id ?? void 0,
				humidity: _.humidity_entity_id ?? void 0,
				devices: []
			});
		}
		let v = n.get(_.area_id);
		h === "climate" && (v.climate ??= p);
		let y = m.attributes.friendly_name ?? u.name ?? p, b = {
			id: p,
			kind: h,
			name: Ke(y, _.name, h),
			full: y,
			guarded: We.has(h) || h === "cover" && Ge.has(m.attributes.device_class)
		};
		v.devices.push(b), h === "switch" && u.device_id && s.set(b, u.device_id);
	}
	let p = /* @__PURE__ */ new Map();
	for (let e of s.values()) p.set(e, (p.get(e) ?? 0) + 1);
	for (let [e, t] of s) p.get(t) === 1 && (e.power = o.get(t));
	let m = [...n.values()].filter((e) => e.devices.length || e.temp).sort((e, t) => e.level - t.level || (e.floor ?? "").localeCompare(t.floor ?? "") || e.name.localeCompare(t.name));
	for (let e of m) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.devices) t.set(n.name, (t.get(n.name) ?? 0) + 1);
		for (let n of e.devices) t.get(n.name) !== 1 && (n.name = n.full, u.push({
			id: n.id,
			name: n.full
		}));
	}
	for (let e of m) e.devices.sort((e, t) => e.kind.localeCompare(t.kind) || e.name.localeCompare(t.name));
	let h = m.flatMap((e) => [
		e.temp,
		e.humidity,
		e.climate,
		...e.devices.flatMap((e) => [e.id, e.power])
	]), g = (e) => e.map((e) => ({
		id: e.id,
		name: e.name
	}));
	return {
		rooms: m,
		people: i,
		sightings: a,
		gaps: [
			{
				kind: "loose",
				items: l
			},
			{
				kind: "plumbing",
				items: d.sort((e, t) => (e.via ?? "").localeCompare(t.via ?? "") || e.name.localeCompare(t.name))
			},
			{
				kind: "clash",
				items: u
			},
			{
				kind: "floorless",
				items: m.some((e) => e.floor) ? g(m.filter((e) => !e.floor)) : []
			},
			{
				kind: "cold",
				items: g(m.filter((e) => !e.temp && !e.climate))
			}
		].filter((e) => e.items.length),
		scenes: r.sort(),
		weather: c,
		power: t.power,
		watched: [
			...h,
			...r,
			...i,
			c,
			t.power
		].filter((e) => !!e)
	};
}
var K = (e) => (t) => t === e, q = (e) => (t) => t !== e, Je = {
	light: K("on"),
	switch: K("on"),
	lock: K("locked"),
	cover: q("closed"),
	climate: q("off"),
	media_player: K("playing"),
	camera: () => !1,
	fan: K("on"),
	valve: q("closed"),
	vacuum: K("cleaning"),
	lawn_mower: K("mowing"),
	water_heater: q("off"),
	humidifier: K("on"),
	siren: K("on"),
	alarm_control_panel: (e) => e.startsWith("armed")
}, Ye = new Set(Object.keys(Je)), Xe = [
	"docked",
	"returning",
	"paused",
	"error"
], Ze = {
	vacuum: Xe,
	lawn_mower: Xe,
	alarm_control_panel: [
		"triggered",
		"pending",
		"arming"
	]
}, Qe = {
	light: ["brightness", (e) => Math.round(e / 255 * 100)],
	cover: ["current_position", (e) => e],
	climate: ["temperature", (e) => e],
	media_player: ["volume_level", (e) => Math.round(e * 100)],
	fan: ["percentage", (e) => e],
	valve: ["current_position", (e) => e],
	water_heater: ["temperature", (e) => e],
	humidifier: ["humidity", (e) => e]
}, $e = (e) => e in Qe, et = {
	light: (e) => (e.supported_color_modes ?? []).some((e) => e !== "onoff"),
	cover: (e) => !!(e.supported_features & 4),
	climate: (e) => !!(e.supported_features & 1),
	media_player: (e) => !!(e.supported_features & 4),
	fan: (e) => !!(e.supported_features & 1),
	water_heater: (e) => !!(e.supported_features & 1),
	humidifier: () => !0
}, tt = {
	min: 0,
	max: 100,
	step: 1,
	vote: 10
}, nt = {
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
		...tt,
		vote: 5
	})
}, rt = (e, t) => nt[e]?.(t) ?? tt;
function it(e, t) {
	let n = !t || t.state === "unavailable", r = !n && Je[e](t.state), [i, a] = Qe[e] ?? [], o = i && t?.attributes[i];
	return {
		on: r,
		phase: t && Ze[e]?.includes(t.state) ? t.state : void 0,
		level: typeof o == "number" && a ? a(o) : void 0,
		away: n
	};
}
function at(e, t) {
	let n = (e) => {
		let n = e ? t.states[e] : void 0, r = Number(n?.state);
		return n && n.state !== "" && Number.isFinite(r) ? r : void 0;
	}, r = (e) => {
		let r = n(e);
		return r === void 0 ? void 0 : t.states[e].attributes.unit_of_measurement === "kW" ? r : r / 1e3;
	}, i = [], a = e.rooms.map((e) => {
		let a = e.climate ? t.states[e.climate] : void 0, o = a?.attributes.temperature, s = e.devices.map((n) => {
			let a = t.states[n.id], { on: o, phase: s, level: c, away: l } = it(n.kind, a), u = a?.attributes ?? {}, d = !n.guarded && !!et[n.kind]?.(u), f = o ? r(n.power) : void 0;
			return f !== void 0 && f >= 1 && i.push({
				id: n.id,
				name: n.name,
				room: e.name,
				kw: f
			}), {
				id: n.id,
				name: n.name,
				kind: n.kind,
				on: o,
				phase: s,
				level: c,
				dims: d,
				span: rt(n.kind, u),
				temp: Ue.has(n.kind) && typeof u.current_temperature == "number" ? u.current_temperature : void 0,
				title: n.kind === "media_player" && o && [u.media_title, u.media_artist].filter(Boolean).join(", ") || void 0,
				picture: n.kind === "camera" ? u.entity_picture : void 0,
				away: l,
				since: Date.parse(a?.last_changed ?? "") || 0,
				guarded: n.guarded,
				room: e.name
			};
		});
		return {
			id: e.id,
			name: e.name,
			floor: e.floor,
			temp: n(e.temp) ?? (typeof a?.attributes.current_temperature == "number" ? a.attributes.current_temperature : void 0),
			target: a && a.state !== "off" && typeof o == "number" ? o : void 0,
			humidity: n(e.humidity),
			devices: s
		};
	}), o = e.weather ? t.states[e.weather] : void 0;
	return {
		rooms: a,
		people: e.people.flatMap((e) => {
			let n = t.states[e];
			return n && n.state !== "unavailable" && n.state !== "unknown" ? [{
				id: e,
				name: n.attributes.friendly_name ?? e,
				place: n.state,
				since: Date.parse(n.last_changed ?? "") || 0
			}] : [];
		}),
		gaps: e.gaps,
		scenes: e.scenes.filter((e) => t.states[e]).map((e) => ({
			id: e,
			name: t.states[e].attributes.friendly_name ?? e
		})),
		appliances: i,
		outside: typeof o?.attributes.temperature == "number" ? {
			temp: o.attributes.temperature,
			humidity: o.attributes.humidity
		} : void 0,
		kw: r(e.power)
	};
}
function ot(e, t) {
	let n = new Map(e.sightings.map((e) => [e.id, e]));
	return t.flatMap((e) => {
		let t = n.get(e.entity), r = e.photo ? `/api/${Be}/photo/${e.id}?v=${e.changed}` : void 0;
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
//#endregion
//#region src/dash-bored/record.ts
var st = 864e5;
function ct(e, t) {
	let n = [];
	for (let r of t) {
		let t = {
			at: r.lu * 1e3,
			...it(e, {
				state: r.s,
				attributes: r.a ?? {}
			})
		}, i = n.at(-1);
		(!i || i.on !== t.on || i.phase !== t.phase || i.level !== t.level || i.away !== t.away) && n.push(t);
	}
	return n;
}
function lt(e, t, n) {
	let r = [];
	return e.forEach((i, a) => {
		let o = Math.max(i.at, t), s = Math.min(e[a + 1]?.at ?? n, n);
		i.on && s > o && r.push([(o - t) / (n - t) * 100, (s - o) / (n - t) * 100]);
	}), r;
}
async function ut(e, t, n) {
	let r = await e.connection.sendMessagePromise({
		type: "history/history_during_period",
		start_time: (/* @__PURE__ */ new Date(n - st)).toISOString(),
		entity_ids: [t.id],
		significant_changes_only: !1,
		no_attributes: t.kind === "light" || !$e(t.kind)
	});
	return ct(t.kind, r[t.id] ?? []);
}
//#endregion
//#region src/dash-bored/stories.ts
var dt = {
	lock: ["unlock", "lock"],
	cover: ["close_cover", "open_cover"],
	media_player: ["media_pause", "media_play"],
	valve: ["close_valve", "open_valve"],
	vacuum: ["return_to_base", "start"],
	lawn_mower: ["dock", "start_mowing"]
}, ft = (e) => ({
	domain: e.kind,
	service: (dt[e.kind] ?? ["turn_off", "turn_on"])[+!e.on],
	ids: [e.id]
}), pt = {
	light: ["turn_on", (e) => ({ brightness_pct: e })],
	cover: ["set_cover_position", (e) => ({ position: e })],
	climate: ["set_temperature", (e) => ({ temperature: e })],
	media_player: ["volume_set", (e) => ({ volume_level: e / 100 })],
	fan: ["set_percentage", (e) => ({ percentage: e })],
	water_heater: ["set_temperature", (e) => ({ temperature: e })],
	humidifier: ["set_humidity", (e) => ({ humidity: e })]
};
function mt(e, t) {
	if (e.kind === "light" && !t) return {
		domain: "light",
		service: "turn_off",
		ids: [e.id]
	};
	let [n, r] = pt[e.kind];
	return {
		domain: e.kind,
		service: n,
		ids: [e.id],
		data: r(t)
	};
}
var ht = 432e5, gt = 8;
function _t(e, t, n) {
	let r = e.map((e) => ({
		kind: e.place === "home" ? "home" : e.place === "not_home" ? "left" : "zone",
		at: e.since,
		vars: {
			name: e.name,
			place: e.place
		}
	})), i = t.map((e) => ({
		kind: e.kind,
		at: e.at * 1e3,
		vars: {
			name: e.name,
			title: e.title,
			artist: e.artist
		}
	}));
	return [...r, ...i].filter((e) => e.at && n - e.at < ht).sort((e, t) => t.at - e.at).slice(0, gt);
}
var vt = 6e5, yt = {
	critical: 100,
	error: 95,
	warning: 70,
	task: 40
}, J = {
	alarm: 92,
	doorbell: 80,
	person: 62,
	vehicle: 42,
	animal: 41
}, bt = [
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
], Y = (e) => new Date(e).toTimeString().slice(0, 5), X = (e) => e && e[0].toUpperCase() + e.slice(1);
function Z(e) {
	let t = bt[e] ?? String(e);
	return {
		n: String(e),
		N: X(t),
		n_word: t,
		s: e === 1 ? "" : "s",
		v: e === 1 ? "s" : ""
	};
}
function xt(e) {
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
function St(e) {
	return typeof e.value == "number" || typeof e.value == "string" && e.value.trim() !== "" && Number.isFinite(Number(e.value)) ? `${e.value}${e.unit ? ` ${e.unit}` : ""}` : "";
}
function Ct(e, t, n, r = []) {
	let i = [], a = (e) => i.push({
		variant: "",
		flavour: "",
		...e
	}), o = e.rooms.flatMap((e) => e.devices);
	for (let e of t) {
		let t = {
			name: e.name,
			area: (e.area ?? "house").toLowerCase(),
			message: e.message || `${X(e.level)}.`,
			reading: St(e),
			since: Y(e.began),
			escalated: e.escalated ? "yes" : ""
		}, r = St(e) ? [St(e), e.area ?? e.name] : [X(e.level), e.name];
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
			rank: yt[e.level] ?? 70,
			vars: t,
			figure: r
		});
	}
	let s = /* @__PURE__ */ new Map();
	for (let e of r) {
		if (n - e.at >= 6e5 || !(e.kind in J)) continue;
		let t = s.get(e.camera);
		(!t || J[e.kind] > J[t.kind] || J[e.kind] === J[t.kind] && e.at > t.at) && s.set(e.camera, e);
	}
	for (let e of [...s.values()].sort((e, t) => t.at - e.at)) a({
		kind: "sighting",
		variant: e.kind,
		id: "sighting." + e.camera,
		rank: J[e.kind],
		vars: {
			name: e.name,
			room: (e.room ?? "house").toLowerCase(),
			at: Y(e.at)
		},
		figure: [Y(e.at), e.name],
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
				...Z(c.length),
				names: c.length > 3 ? `${e} and ${c.length - 3} more` : e,
				since: Y(Math.min(...c.map((e) => e.since)))
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
	let l = o.filter((e) => e.kind === "light" && !e.away), u = l.filter((e) => e.on);
	if (l.length) {
		let e = u.length >= 7 && u.length * 2 >= l.length ? "ablaze" : u.length ? "lights" : "dark";
		a({
			kind: e,
			id: e,
			rank: {
				ablaze: 60,
				lights: 30,
				dark: 35
			}[e],
			vars: Z(u.length),
			figure: [String(u.length), u.length === 1 ? "light on" : "lights on"],
			press: u.length ? {
				domain: "light",
				service: "turn_off",
				ids: u.map((e) => e.id)
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
		vars: Z(o.length),
		figure: [String(e.rooms.length), e.rooms.length === 1 ? "room" : "rooms"]
	}), i.sort((e, t) => t.rank - e.rank);
}
//#endregion
//#region src/dash-bored/voices.ts
var Q = (e, t) => e.replace(/\{(\w+)\}/g, (e, n) => t[n] ?? ""), wt = {
	esphome: "ESPHome. Add entity_category: config (or diagnostic) to each in its device's YAML",
	knx: "KNX. Add entity_category: config to each in the KNX YAML",
	"": "Give each the label Dash-Bored hide, or hide it in Home Assistant"
};
function Tt(e, t, n) {
	let r = e.stories[`${t.kind}.${t.variant}`] ?? e.stories[t.kind], i = r.flavours?.[t.flavour] ?? r.head, a = t.vars.escalated && r.worse ? " " + r.worse : "";
	return {
		kicker: r.kicker,
		head: Q(i[n % i.length], t.vars),
		deck: Q(r.deck, t.vars),
		body: r.body ? Q(t.vars.reading === "" && r.plain ? r.plain : r.body, t.vars) + a : "",
		act: t.press && r.act ? r.act : ""
	};
}
var Et = (e, t, n) => Q(e.words[Ue.has(t) ? "degrees" : "percent"], { n: String(n) });
function Dt(e) {
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
function Ot(e, t) {
	let { ask: n, less: r, more: i } = e.polls[t.kind];
	return {
		ask: Q(n, Dt(t)),
		less: r,
		more: i
	};
}
function kt(e, t) {
	let n = (n) => `${t.kind}.${n}` in e.words, r = t.away ? "away" : t.phase && n(t.phase) ? `${t.kind}.${t.phase}` : t.on ? t.level === void 0 && n("plain") ? `${t.kind}.plain` : `${t.kind}.on` : `${t.kind}.off`, [i, a] = Q(e.words[r], {
		...Dt(t),
		level: "\0"
	}).replace(/^the (?=\S+['’]s )/, "").split("\0");
	return a === void 0 ? [
		i,
		"",
		""
	] : [
		i,
		Et(e, t.kind, t.level),
		a
	];
}
var $ = (e, t) => kt(e, t).join("");
function At(e, t) {
	let n = Q(t.vars.artist ? e.personal.song : e.personal.tune, t.vars);
	return Q(e.personal[t.kind], {
		...t.vars,
		song: n
	});
}
var jt = (e, t) => Q(t.level === "nominal" ? e.wire.clear : e.wire.trouble, {
	name: t.name,
	message: t.message || t.level,
	level: t.level.toUpperCase()
}), Mt = {
	kicker: "Stop press",
	head: ["{name} gives cause for alarm"],
	deck: "{message}",
	body: "The reading stood at {reading} in the {area} as this edition went to press, and the trouble dates from {since}.",
	plain: "The trouble in the {area} dates from {since}.",
	worse: "Matters have worsened since our earlier report."
}, Nt = {
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
}, Pt = {
	broadsheet: {
		label: "Broadsheet",
		name: "The Casa Courier",
		strap: "",
		price: "Price: nothing",
		flash: "Stop press",
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
			personal: "Personal"
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
			shut: "Fold away"
		},
		wire: {
			trouble: "{name}: {message}",
			clear: "{name}: all is well again."
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
		stories: {
			alert: Mt,
			"alert.warning": {
				...Mt,
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
				act: "Put them all out"
			},
			lights: {
				kicker: "Home affairs",
				head: ["{N} light{s} still burning at this hour"],
				deck: "The remainder of the house is reported quiet and in good order.",
				act: "Lights out"
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
	},
	tabloid: {
		label: "Red-top",
		name: "Daily Fuse",
		strap: "The paper that's always switched on",
		price: "Still FREE!",
		flash: "Breaking",
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
			personal: "Goss"
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
			shut: "Bin it"
		},
		wire: {
			trouble: "{name}: {level}!",
			clear: "{name}: PANIC OVER"
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
		stories: {
			alert: Nt,
			"alert.warning": {
				...Nt,
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
				act: "Kill the lights"
			},
			lights: {
				kicker: "Still on",
				head: [
					"{n} and counting",
					"Left on again",
					"Switched on"
				],
				deck: "{n} light{s} burn{v} while the meter ticks.",
				act: "Kill the lights"
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
	}
}, Ft = 5, It = /* @__PURE__ */ new Map();
function Lt(e) {
	let t = It.get(e);
	if (t) return t;
	let n = [...e].reduce((e, t) => e * 31 + t.charCodeAt(0) >>> 0, 7), r = () => (n = n * 1664525 + 1013904223 >>> 0) / 2 ** 32, i = (e) => Array.from({ length: e }, (t, n) => ((n + r() * .8) / e * 100).toFixed(1)), a = () => (r() * Ft).toFixed(1), o = `polygon(${[
		...i(30).map((e) => `${e}% ${a()}px`),
		...i(22).map((e) => `calc(100% - ${a()}px) ${e}%`),
		...i(30).map((e) => `calc(100% - ${e}%) calc(100% - ${a()}px)`),
		...i(22).map((e) => `${a()}px calc(100% - ${e}%)`)
	].join(",")})`;
	return It.set(e, o), o;
}
function Rt(e, t, n, r, i, a, o) {
	let s = e.clipping, c = (n) => X($(e, {
		...t,
		on: n.on,
		phase: n.phase,
		level: n.level,
		away: n.away
	})), l = n.record, u = e.acts[`${t.kind}.${t.on ? "on" : "off"}`];
	return L`<dialog class="clipping" @close=${o.shut} @click=${(e) => e.target === e.currentTarget && o.shut()}>
    <div class="cutting" style="clip-path:${Lt(t.id)}">
      <div class="scrap above" aria-hidden="true">${a.above}</div>
      <div class="story">
      <p class="kicker">${t.room}</p>
      <h4 class="title">${t.name}</h4>
      <p class="deck">${X($(e, t))}. ${t.since && t.kind !== "camera" ? Q(s.since, { at: Y(t.since) }) : ""}
        ${t.temp === void 0 ? "" : Q(s.reads, { temp: t.temp.toFixed(1) })} ${t.title ? Q(s.playing, { title: t.title }) : ""}</p>
      ${t.picture ? L`<img class="still" src=${t.picture} alt=${t.name} />` : z}
      ${t.away || !u ? z : L`<button class="act ${n.armed ? "sure" : ""}" @click=${o.flip}>${n.armed ? s.sure : u}</button>`}
      ${i}
      ${t.kind === "camera" ? z : L`<h3>${s.record}</h3>`}
      ${t.kind === "camera" ? z : n.fault ? L`<p class="fault" role="alert">Home Assistant's history could not be read (${n.fault}).</p>` : l ? L`<div class="band">${lt(l, r - st, r).map(([e, t]) => L`<i style="left:${e}%;width:${t}%"></i>`)}</div>
              <div class="span"><span>${s.ago}</span><span>${s.now}</span></div>
              <ol>${l.length ? l.slice(-12).reverse().map((e) => L`<li><time>${Y(e.at)}</time>${c(e)}</li>`) : L`<li>${s.none}</li>`}</ol>` : L`<p class="wait">${s.wait}</p>`}
      <div class="foot"><button class="mend" @click=${o.more}>${s.more}</button><button class="act" @click=${o.shut}>${s.shut}</button></div>
      </div>
      <div class="scrap beside" aria-hidden="true"><span>${a.beside}</span></div>
      <div class="scrap below" aria-hidden="true">${a.below}</div>
    </div>
  </dialog>`;
}
//#endregion
//#region src/dash-bored/styles.ts
var zt = h`
  :host { display: block; container-type: inline-size; }
  :host([panel]) { height: 100vh; overflow-y: auto; }
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
  .act { display: inline-block; border: 1.5px solid var(--ink); padding: 3px 12px; margin-bottom: 10px; font-size: 13px; letter-spacing: .16em; text-transform: uppercase; }
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
  .cutting .act { margin: 0 0 12px; }
  .act.sure { background: var(--flash); color: #fff; border-color: var(--flash); }
  .cutting .scale > button { display: none; }
  .cutting .scale { margin: 0 0 12px; }
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

  /* ---------- narrow: one column, in reading order ---------- */
  @container (max-width: 900px) {
    .paper { padding: 10px 14px 20px; }
    .page { grid-template-columns: 1fr; } .page > * + * { border-left: 0; padding-left: 0; margin-top: 18px; } .solo > article { grid-column: auto; }
    .copy { columns: 1; } h2 { font-size: 34px; }
    [data-style="tabloid"] h2 { font-size: 62px; } [data-style="tabloid"] .masthead h1 { font-size: 36px; }
    .figure, [data-style="tabloid"] .figure { width: 104px; } .figure b, [data-style="tabloid"] .figure b { font-size: 28px; }
  }
`, Bt = "dash-bored-gazette", Vt = "casa_mia_dash_bored/alerts", Ht = "casa_mia_dash_bored/sightings", Ut = "casa_mia_dash_bored/personal", Wt = 18e5, Gt = 10, Kt = "dash-bored-style", qt = "/casa_mia_dash_bored/fonts/ManufacturingConsent-Regular.ttf", Jt = !1;
function Yt() {
	if (Jt) return;
	Jt = !0;
	let e = new FontFace("Dash-Bored Masthead", `url(${qt})`);
	document.fonts.add(e), e.load().catch((e) => console.error("Dash-Bored: the masthead's font could not be loaded", e));
}
var Xt = 30, Zt = 3, Qt = 6e3, $t = 350, en = /* @__PURE__ */ new Set([
	"climate",
	"camera",
	"water_heater",
	"alarm_control_panel"
]), tn = /* @__PURE__ */ new Set(["docked"]), nn = (e) => e.away || !!e.phase && !tn.has(e.phase) || !en.has(e.kind) && (e.kind === "lock" ? !e.on : e.on), rn = (e) => e.kind !== "camera" || e.away, an = /* @__PURE__ */ new Set([
	"climate",
	"media_player",
	"camera",
	"water_heater",
	"vacuum",
	"lawn_mower",
	"alarm_control_panel"
]), on = class extends W {
	constructor(...e) {
		super(...e), this.narrow = !1, this._style = "broadsheet", this._alerts = [], this._seen = [], this._rated = [], this._fault = "", this._lost = 0, this._config = {}, this._late = [], this._turn = /* @__PURE__ */ new Map(), this._showing = /* @__PURE__ */ new Set(), this._feeds = /* @__PURE__ */ new Map(), this._primed = !1, this._seenPrimed = !1, this._timers = /* @__PURE__ */ new Set();
	}
	static {
		this.styles = zt;
	}
	static {
		this.properties = {
			narrow: { type: Boolean },
			_house: { state: !0 },
			_style: { state: !0 },
			_alerts: { state: !0 },
			_seen: { state: !0 },
			_fault: { state: !0 },
			_lost: { state: !0 },
			_scale: { state: !0 },
			_open: { state: !0 },
			_rated: { state: !0 }
		};
	}
	static getStubConfig() {
		return {};
	}
	setConfig(e) {
		this._config = { ...e }, this._survey = void 0, this._choose();
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
		if (this._lost = 0, this._listen(), !this._survey || !t || t.entities !== e.entities || t.areas !== e.areas || t.devices !== e.devices || t.floors !== e.floors) this._survey = qe(e, this._config);
		else if (t.states === e.states || !this._survey.watched.some((n) => t.states[n] !== e.states[n])) return;
		let n = new Map(this._house?.rooms.flatMap((e) => e.devices).map((e) => [e.id, e]));
		this._house = at(this._survey, e);
		for (let e of this._house.rooms.flatMap((e) => e.devices)) {
			let t = n.get(e.id);
			!t || t.on === e.on && t.phase === e.phase && t.level === e.level && t.away === e.away || (this._note({
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
			}));
		}
	}
	connectedCallback() {
		super.connectedCallback(), Yt(), this._choose(), this._hass?.connected !== !1 && this._listen();
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		for (let e of this._feeds.values()) e.then((e) => e()).catch(() => void 0);
		this._feeds.clear(), this._primed = this._seenPrimed = !1;
		for (let e of this._timers) clearTimeout(e);
		this._timers.clear();
	}
	_choose() {
		let e = this._config.style;
		try {
			e ??= localStorage.getItem(Kt) ?? void 0;
		} catch {}
		e && e in Pt && (this._style = e);
	}
	_dress(e) {
		this._style = e;
		try {
			localStorage.setItem(Kt, e);
		} catch {}
	}
	_listen() {
		let e = this._hass?.connection;
		if (!e || !this.isConnected) return;
		let t = (t, n, r) => {
			if (this._feeds.has(t)) return;
			let i = e.subscribeMessage(r, { type: t });
			this._feeds.set(t, i), i.catch((e) => {
				this._feeds.delete(t), console.error(`Dash-Bored: the feed ${t} failed`, e), this._fault = `${n} are not reaching this page (${e?.message ?? e}).`;
			});
		};
		t(Vt, "Sensor Watch's alerts", (e) => this._take(e)), t(Ht, "The cameras' sightings", (e) => this._sight(e)), t(Ut, "The Personal column's announcements", (e) => this._rated = [...new Map([...this._rated, ...e].map((e) => [`${e.at} ${e.name} ${e.title}`, e])).values()]);
	}
	_sight(e) {
		let t = new Map(this._seen.map((e) => [e.id, e])), n = Date.now();
		for (let r of e) {
			let e = t.has(r.id);
			t.set(r.id, r);
			let i = n - r.at * 1e3;
			if (e || i >= 6e5) continue;
			this._later(vt - i);
			let [a] = this._seenPrimed && this._survey ? ot(this._survey, [r]) : [];
			a && this._note({
				time: a.at,
				seen: a
			});
		}
		this._seenPrimed = !0, this._seen = [...t.values()].filter((e) => n - e.at * 1e3 < Wt);
	}
	_take(e) {
		let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
		for (let n of e) {
			let e = {
				...n,
				at: n.at * 1e3,
				began: n.began * 1e3,
				flavour: xt(this._hass?.states[n.entity_id]?.attributes.device_class)
			};
			t.set(e.entity_id, e), this._primed && (this._note({
				time: e.at,
				alert: e
			}), e.level === "nominal" ? this._later(vt) : this.scrollIntoView({
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
	_call(e, t) {
		this._hass.callService(e.domain, e.service, {
			entity_id: e.ids,
			...e.data
		}).then(() => this._fault = "", (n) => {
			console.error(`Dash-Bored: ${e.domain}.${e.service} refused`, n), this._fault = `${t}: Home Assistant refused (${n?.message ?? n}).`;
		});
	}
	_press(e) {
		e.guarded || e.away || an.has(e.kind) ? this._story(e) : this._call(ft(e), `${e.room} ${e.name}`);
	}
	_story(e) {
		this._open = { id: e.id }, this._scale = e.dims && !e.away ? { id: e.id } : void 0;
		let t = (t) => {
			this._open?.id === e.id && (this._open = {
				...this._open,
				...t
			});
		};
		e.kind !== "camera" && ut(this._hass, e, Date.now()).then((e) => t({ record: e }), (n) => {
			console.error(`Dash-Bored: the history of ${e.id} could not be read`, n), t({ fault: n?.message ?? String(n) });
		});
	}
	_shut() {
		this._open = this._scale = void 0;
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
			}, Qt);
			this._timers.add(n);
			return;
		}
		this._open = {
			...t,
			armed: !1
		}, this._call(ft(e), `${e.room} ${e.name}`);
	}
	updated() {
		let e = this.renderRoot.querySelector("dialog");
		e && !e.open && e.showModal();
	}
	_ask(e, t) {
		clearTimeout(this._asking), this._timers.delete(this._asking), this._asking = setTimeout(() => {
			this._timers.delete(this._asking), this._call(mt(e, t), `${e.room} ${e.name}`);
		}, $t), this._timers.add(this._asking);
	}
	_measure(e) {
		this._scale = this._scale?.id === e.id ? void 0 : { id: e.id };
	}
	_key(e) {
		(e.key === "Enter" || e.key === " ") && (e.preventDefault(), e.currentTarget.click());
	}
	render() {
		let e = this._hass, t = this._house, n = Pt[this._style];
		if (!e || !t) return L`<div class="paper" data-style=${this._style}><p class="wait">Waiting for Home Assistant.</p></div>`;
		let a = Date.now(), o = ot(this._survey, this._seen).filter((e) => a - e.at < Wt), s = [...o].sort((e, t) => t.at - e.at).slice(0, Gt), c = (e) => (n.stories[`sighting.${e}`]?.kicker ?? e).toLowerCase(), l = Ct(t, this._alerts, a, o);
		for (let e of l) this._showing.has(e.id) || this._turn.set(e.id, (this._turn.get(e.id) ?? -1) + 1);
		this._showing = new Set(l.map((e) => e.id));
		let u = l.map((e) => ({
			s: e,
			...Tt(n, e, this._turn.get(e.id))
		})), [d, ...f] = u, p = u.find((e) => e.s.kind === "alert"), m = (e) => e.act ? L`<button class="act" @click=${() => this._call(e.s.press, e.head)}>${e.act}</button>` : z, h = (e, t) => {
			let [r, i, a] = e.dims && !e.away ? kt(n, e) : [
				$(n, e),
				"",
				""
			], o = (e, t, n) => e ? L`<span class="fact ${t}" role="button" tabindex="0" @click=${n} @keydown=${this._key}>${e}</span>` : z;
			return L`${o(t ? X(r) : r, e.away ? "away" : "", () => this._press(e))}${o(i, "level", () => this._measure(e))}${o(a, "", () => this._press(e))}`;
		}, g = (e) => {
			let t = this._scale;
			if (!e || !t || t.id !== e.id || !e.dims || e.away) return z;
			let { min: r, max: i, step: a, vote: o } = e.span, s = e.level ?? r, c = (e) => Number(e.target.value), l = t.want ?? s, u = Ot(n, e), d = (n, a) => {
				let o = Math.min(i, Math.max(r, Math.round((l + a) * 10) / 10));
				return L`<button class="act" ?disabled=${o === l} @click=${() => (this._scale = {
					...t,
					want: o
				}, this._ask(e, o))}>${n}</button>`;
			};
			return L`<span class="scale">
        <span class="poll"><i>${X(u.ask)}</i>${d(u.less, -o)}${d(u.more, o)}</span>
        <input type="range" min=${r} max=${i} step=${a} aria-label=${e.name} .value=${Re(String(l))}
          @input=${(e) => this._scale = {
				...t,
				want: c(e)
			}}
          @change=${(t) => this._ask(e, c(t))} />
        <output>${Et(n, e.kind, s)}${t.want === void 0 || t.want === s ? "" : ` → ${t.want}`}</output>
        <button aria-label="Close" @click=${() => this._scale = void 0}>×</button>
      </span>`;
		}, _ = (e) => e.photo ? L`<figure class="photo" role="button" tabindex="0" @click=${() => r(this, "hass-more-info", { entityId: e.see })} @keydown=${this._key}>
            <img src=${e.photo} alt=${e.figure[1]} loading="lazy" @error=${() => this._fault = `The photograph from ${e.figure[1]} could not be fetched.`} />
            <figcaption>${e.figure[1]}, ${e.figure[0]}</figcaption>
          </figure>` : z, v = t.rooms.filter((e) => e.temp !== void 0), y = _t(t.people, this._rated, a), b = t.rooms.filter((e) => e.devices.length), x = b.reduce((e, t) => e + t.devices.length, 0) > Xt, S = b.map((e) => ({
			...e,
			devices: e.devices.filter(x ? nn : rn)
		})).filter((e) => e.devices.length), ee = b.some((e) => e.floor), C = (e, t, r = (e) => e) => {
			let i = /* @__PURE__ */ new Map();
			for (let t of e) i.set(t.floor ?? "", [...i.get(t.floor ?? "") ?? [], t]);
			return [...i].map(([e, i]) => L`${ee ? L`<h5>${e || n.titles.elsewhere}</h5>` : z}${r(i.map(t))}`);
		}, te = (e) => {
			let t = (t) => {
				let n = e.devices.filter((e) => x && e.kind === t && e.on && !e.away);
				return n.length > Zt ? n : [];
			}, r = t("light"), i = t("switch"), a = e.devices.filter((e) => !r.includes(e) && !i.includes(e)).map((e, t) => h(e, !t && !r.length && !i.length));
			return i.length && a.unshift(r.length ? Q(n.words["switch.many"], Z(i.length)) : X(Q(n.words["switch.many"], Z(i.length)))), r.length && a.unshift(L`<span class="fact" role="button" tabindex="0" @click=${() => this._call({
				domain: "light",
				service: "turn_off",
				ids: r.map((e) => e.id)
			}, e.name)} @keydown=${this._key}>${X(Q(n.words["light.many"], Z(r.length)))}</span>`), L`<p><b>${e.name}.</b> ${a.map((e, t) => L`${t ? n.join : ""}${e}`)}${n.end}${this._open ? z : g(e.devices.find((e) => e.id === this._scale?.id))}</p>`;
		}, ne = (e) => L`<div class="pair"><button class="chip ${e.on ? "on" : ""} ${e.away ? "away" : ""}" aria-pressed=${e.on} @click=${() => this._press(e)}>${e.name}</button
        ><button class="chip tab" aria-label="${e.name}: its story" @click=${() => this._story(e)}>${e.dims && !e.away ? `${e.level ?? e.span.min}${Ue.has(e.kind) ? "°" : "%"}` : "›"}</button></div>`, re = new Map(t.rooms.flatMap((e) => e.devices).map((e) => [e.id, e])), w = this._open && re.get(this._open.id), T = f.length ? f : u, ie = {
			above: T[0].deck,
			beside: [...T, ...u].map((e) => `${e.head}. ${e.deck}`).join(" "),
			below: T.at(-1).head
		}, E = L`<h3>${n.titles.board}</h3>
      ${C(b, (e) => L`<div class="row"><span>${e.name}</span>${e.devices.map(ne)}</div>`, (e) => L`<div class="rows">${e}</div>`)}`;
		return L`<div class="paper" data-style=${this._style}>
      ${this._lost ? L`<div class="fault" role="alert">Not connected to Home Assistant since ${Y(this._lost)}. What follows is how things stood then.</div>` : z}
      ${this._fault ? L`<div class="fault" role="alert">${this._fault}</div>` : z}
      ${p ? Le(p.s.id + p.s.variant, L`<div class="breaking" role="status"><b>${n.flash}</b>${p.head}${/[!?]$/.test(p.head) ? "" : ":"} ${p.s.vars.message}</div>`) : z}
      <header class="masthead"><h1>${n.name}</h1><p>${n.strap}</p></header>
      <div class="dateline">
        ${this.hasAttribute("panel") ? L`<ha-menu-button .hass=${e} .narrow=${this.narrow}></ha-menu-button>` : z}
        <span>${(/* @__PURE__ */ new Date()).toLocaleDateString(e.locale?.language ?? "en-GB", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric"
		})}</span>
        ${this._config.style ? z : L`<span class="styles">${Object.entries(Pt).map(([e, t]) => L`<button aria-pressed=${e === this._style} @click=${() => this._dress(e)}>${t.label}</button>`)}</span>`}
        <span>${n.price} · ${Y(Date.now())}</span>
      </div>
      <main class="page ${f.length ? "" : "solo"}">
        <article>
          <div class="figure"><b>${d.s.figure[0]}</b><span>${d.s.figure[1]}</span></div>
          <p class="kicker">${d.kicker}</p>
          ${Le(d.head, L`<h2>${d.head}</h2>`)}
          <p class="deck">${d.deck}</p>
          ${m(d)}
          ${_(d.s)}
          <div class="copy">
            ${d.body ? L`<p>${d.body}</p>` : z}
            ${C(S, te)}
            ${b.length > S.length ? L`<p>${Q(n.rest, Z(b.length - S.length))}</p>` : z}
            ${b.length ? z : L`<p>No areas with lights, switches or other devices were found. Give your devices areas in Home Assistant's settings and this page fills itself in.</p>`}
          </div>
        </article>
        ${f.length ? L`<section>
              <h3>${n.titles.more}</h3>
              ${f.slice(0, 3).map((e) => L`<div class="item"><p class="kicker">${e.kicker}</p><h4>${e.head}</h4>${_(e.s)}<p>${e.deck}</p>${m(e)}</div>`)}
              ${f.length > 3 ? L`<h3>${n.titles.briefs}</h3><ul>${f.slice(3).map((e) => L`<li><b>${e.head}.</b> ${e.deck}</li>`)}</ul>` : z}
            </section>` : z}
        <aside>
          <h3>${n.titles.late}</h3>
          <ol>${this._late.length ? this._late.map((e) => {
			let t = e.device && re.get(e.device.id);
			return L`<li role=${t ? "button" : z} tabindex=${t ? 0 : z} @click=${() => t && this._story(t)} @keydown=${this._key}><time>${Y(e.time)}</time>${e.alert ? jt(n, e.alert) : e.seen ? `${e.seen.name}: ${c(e.seen.kind)}` : `${e.device.room}: ${$(n, e.device)}`}</li>`;
		}) : L`<li>${n.nothing}</li>`}</ol>
          ${s.length ? L`<h3>${n.titles.archive}</h3>
                <ol class="archive">${s.map((e) => L`<li role="button" tabindex="0" @click=${() => r(this, "hass-more-info", { entityId: e.camera })} @keydown=${this._key}>
                    ${e.photo ? L`<img src=${e.photo} alt="" loading="lazy" />` : L`<i></i>`}<span><time>${Y(e.at)}</time>${e.name}: ${c(e.kind)}</span></li>`)}</ol>` : z}
          ${y.length ? L`<h3>${n.titles.personal}</h3><ol>${y.map((e) => L`<li><time>${Y(e.at)}</time>${At(n, e)}</li>`)}</ol>` : z}
          ${v.length ? L`<h3>${n.titles.temps}</h3><table>${v.map((e) => L`<tr><td>${e.name}</td><td>${e.temp.toFixed(1)}° ${e.target === void 0 ? "" : e.temp < e.target - .5 ? "▼" : e.temp > e.target + .5 ? "▲" : "="}</td></tr>`)}</table>` : z}
          ${x ? z : E}
          ${t.gaps.length ? L`<h3>${n.titles.gaps}</h3>
                ${t.gaps.map((e) => L`<details><summary>${Q(n.gaps[e.kind], Z(e.items.length))}</summary>
                  <ul>${e.items.map((t, n) => L`${e.kind === "plumbing" && t.via !== e.items[n - 1]?.via ? L`<li class="via">${wt[t.via ?? ""] ?? `${t.via}. ${wt[""]}`}:</li>` : z}<li><button class="mend" @click=${() => e.kind === "floorless" || e.kind === "cold" ? i(`/config/areas/area/${t.id}`) : r(this, "hass-more-info", { entityId: t.id })}>${t.name}</button></li>`)}</ul></details>`)}
                <p class="mend">${n.mend}</p>` : z}
          ${t.scenes.length ? L`<h3>${n.titles.notices}</h3>${t.scenes.slice(0, 8).map((e, t) => L`<button class="ad" @click=${() => this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.name)}><b>${e.name}</b>${n.notices[t % n.notices.length]}</button>`)}` : z}
        </aside>
        ${x ? L`<section class="board">${E}</section>` : z}
      </main>
      ${w ? Rt(n, w, this._open, a, g(w), ie, {
			flip: () => this._flip(w),
			more: () => (this._shut(), r(this, "hass-more-info", { entityId: w.id })),
			shut: () => this._shut()
		}) : z}
    </div>`;
	}
}, sn = new URL(import.meta.url).searchParams.get("v") || "dev";
a(Bt, on), o(Bt, "Casa Mia Dash-Bored Gazette", "Your house as a newspaper: what matters most is the headline, and every underlined fact is a switch. Best in a panel view."), t("Dash-Bored", "casa_mia_dash_bored/cards", sn);
//#endregion
