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
})(e) : e, { is: v, defineProperty: y, getOwnPropertyDescriptor: b, getOwnPropertyNames: x, getOwnPropertySymbols: ee, getPrototypeOf: S } = Object, C = globalThis, w = C.trustedTypes, T = w ? w.emptyScript : "", te = C.reactiveElementPolyfillSupport, E = (e, t) => e, D = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? T : null;
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
}, ne = (e, t) => !v(e, t), re = {
	attribute: !0,
	type: String,
	converter: D,
	reflect: !1,
	useDefault: !1,
	hasChanged: ne
};
Symbol.metadata ??= Symbol("metadata"), C.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var O = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = re) {
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
		return this.elementProperties.get(e) ?? re;
	}
	static _$Ei() {
		if (this.hasOwnProperty(E("elementProperties"))) return;
		let e = S(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(E("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(E("properties"))) {
			let e = this.properties, t = [...x(e), ...ee(e)];
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
			let i = (n.converter?.toAttribute === void 0 ? D : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? D : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ne)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
O.elementStyles = [], O.shadowRootOptions = { mode: "open" }, O[E("elementProperties")] = /* @__PURE__ */ new Map(), O[E("finalized")] = /* @__PURE__ */ new Map(), te?.({ ReactiveElement: O }), (C.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ie = globalThis, ae = (e) => e, k = ie.trustedTypes, oe = k ? k.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, se = "$lit$", A = `lit$${Math.random().toFixed(9).slice(2)}$`, ce = "?" + A, le = `<${ce}>`, j = document, M = () => j.createComment(""), N = (e) => e === null || typeof e != "object" && typeof e != "function", P = Array.isArray, ue = (e) => P(e) || typeof e?.[Symbol.iterator] == "function", F = "[ 	\n\f\r]", I = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, de = /-->/g, fe = />/g, L = RegExp(`>|${F}(?:([^\\s"'>=/]+)(${F}*=${F}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), pe = /'/g, me = /"/g, he = /^(?:script|style|textarea|title)$/i, R = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), z = Symbol.for("lit-noChange"), B = Symbol.for("lit-nothing"), ge = /* @__PURE__ */ new WeakMap(), V = j.createTreeWalker(j, 129);
function _e(e, t) {
	if (!P(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return oe === void 0 ? t : oe.createHTML(t);
}
var ve = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = I;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === I ? c[1] === "!--" ? o = de : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = L) : (he.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = L) : o = fe : o === L ? c[0] === ">" ? (o = i ?? I, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? L : c[3] === "\"" ? me : pe) : o === me || o === pe ? o = L : o === de || o === fe ? o = I : (o = L, i = void 0);
		let d = o === L && e[t + 1].startsWith("/>") ? " " : "";
		a += o === I ? n + le : l >= 0 ? (r.push(s), n.slice(0, l) + se + n.slice(l) + A + d) : n + A + (l === -2 ? t : d);
	}
	return [_e(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, H = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ve(t, n);
		if (this.el = e.createElement(l, r), V.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = V.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(se)) {
					let t = u[o++], n = i.getAttribute(e).split(A), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? be : r[1] === "?" ? xe : r[1] === "@" ? Se : G
					}), i.removeAttribute(e);
				} else e.startsWith(A) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (he.test(i.tagName)) {
					let e = i.textContent.split(A), t = e.length - 1;
					if (t > 0) {
						i.textContent = k ? k.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], M()), V.nextNode(), c.push({
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
function U(e, t, n = e, r) {
	if (t === z) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = N(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = U(e, i._$AS(e, t.values), i, r)), t;
}
var ye = class {
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
		V.currentNode = r;
		let i = V.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new W(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ce(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = V.nextNode(), a++);
		}
		return V.currentNode = j, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, W = class e {
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
		e = U(this, e, t), N(e) ? e === B || e == null || e === "" ? (this._$AH !== B && this._$AR(), this._$AH = B) : e !== this._$AH && e !== z && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ue(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== B && N(this._$AH) ? this._$AA.nextSibling.data = e : this.T(j.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = H.createElement(_e(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new ye(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ge.get(e.strings);
		return t === void 0 && ge.set(e.strings, t = new H(e)), t;
	}
	k(t) {
		P(this._$AH) || (this._$AH = [], this._$AR());
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
}, G = class {
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
		if (i === void 0) e = U(this, e, t, 0), a = !N(e) || e !== this._$AH && e !== z, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = U(this, r[n + o], t, o), s === z && (s = this._$AH[o]), a ||= !N(s) || s !== this._$AH[o], s === B ? e = B : e !== B && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === B ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, be = class extends G {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === B ? void 0 : e;
	}
}, xe = class extends G {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== B);
	}
}, Se = class extends G {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = U(this, e, t, 0) ?? B) === z) return;
		let n = this._$AH, r = e === B && n !== B || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== B && (n === B || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ce = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		U(this, e);
	}
}, we = {
	M: se,
	P: A,
	A: ce,
	C: 1,
	L: ve,
	R: ye,
	D: ue,
	V: U,
	I: W,
	H: G,
	N: xe,
	U: Se,
	B: be,
	F: Ce
}, Te = ie.litHtmlPolyfillSupport;
Te?.(H, W), (ie.litHtmlVersions ??= []).push("3.3.3");
var Ee = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new W(t.insertBefore(M(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, K = globalThis, q = class extends O {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ee(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return z;
	}
};
q._$litElement$ = !0, q.finalized = !0, K.litElementHydrateSupport?.({ LitElement: q });
var De = K.litElementPolyfillSupport;
De?.({ LitElement: q }), (K.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/lit-html/directive.js
var J = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, Oe = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), ke = class {
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
}, { I: Ae } = we, je = (e) => e.strings === void 0, Me = {}, Ne = (e, t = Me) => e._$AH = t, Pe = Oe(class extends ke {
	constructor() {
		super(...arguments), this.key = B;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (Ne(e), this.key = t), n;
	}
}), Fe = Oe(class extends ke {
	constructor(e) {
		if (super(e), e.type !== J.PROPERTY && e.type !== J.ATTRIBUTE && e.type !== J.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!je(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === z || t === B) return t;
		let n = e.element, r = e.name;
		if (e.type === J.PROPERTY) {
			if (t === n[r]) return z;
		} else if (e.type === J.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return z;
		} else if (e.type === J.ATTRIBUTE && n.getAttribute(r) === t + "") return z;
		return Ne(e), t;
	}
}), Ie = "dash_bored_hide", Le = "casa_mia_dash_bored", Re = /\b(led|relay|screen|screensaver|in use|enabled|watching|mode|program(me)?|charge)\b/i, ze = /* @__PURE__ */ new Set([
	"light",
	"switch",
	"cover",
	"lock"
]), Be = /* @__PURE__ */ new Set([
	"garage",
	"gate",
	"door"
]);
function Ve(e, t, n) {
	let r = e.slice(t.length), i = (e.toLowerCase().startsWith(t.toLowerCase()) && !/^[a-z0-9]/i.test(r) ? r.replace(/^[\s\-–—:,.]+/, "") : e).replace(n === "light" ? /\s+lights?$/i : n === "switch" ? /\s+switch$/i : /$^/, ""), a = !i || RegExp(`^${n}s?$`, "i").test(i) ? n : i;
	return a[0].toUpperCase() + a.slice(1);
}
function He(e, t) {
	let n = /* @__PURE__ */ new Map(), r = [], i = [], a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = t.weather, c = [], l = [], u = [], d = (e) => !!e?.labels?.includes(Ie);
	for (let l of Object.values(e.entities ?? {})) {
		let f = l.entity_id, p = e.states[f];
		if (!p || l.hidden || l.entity_category) continue;
		let m = f.split(".")[0];
		m === "scene" && r.push(f), m === "weather" && (!s || f === "weather.home") && !t.weather && (s = f), m === "sensor" && p.attributes.device_class === "power" && l.device_id && a.set(l.device_id, f);
		let h = e.devices?.[l.device_id], g = e.areas?.[l.area_id ?? h?.area_id];
		if (d(l) || d(h) || d(g)) continue;
		if (m === "image" && l.platform === Le && !d(e.entities[p.attributes.camera]) && i.push({
			id: f,
			name: h?.name_by_user ?? h?.name ?? f,
			room: g?.name
		}), ze.has(m)) {
			let e = p.attributes.friendly_name ?? l.name ?? f;
			g || c.push({
				id: f,
				name: e
			}), Re.test(e) && u.push({
				id: f,
				name: e,
				via: l.platform
			});
		}
		if (!g || m !== "climate" && !ze.has(m)) continue;
		if (!n.has(g.area_id)) {
			let t = e.floors?.[g.floor_id];
			n.set(g.area_id, {
				id: g.area_id,
				name: g.name,
				floor: t?.name,
				level: t ? t.level ?? 0 : Infinity,
				temp: g.temperature_entity_id ?? void 0,
				humidity: g.humidity_entity_id ?? void 0,
				devices: []
			});
		}
		let _ = n.get(g.area_id);
		if (m === "climate") _.climate ??= f;
		else {
			let e = p.attributes.friendly_name ?? l.name ?? f, t = {
				id: f,
				kind: m,
				name: Ve(e, g.name, m),
				full: e,
				guarded: m === "lock" || Be.has(p.attributes.device_class)
			};
			_.devices.push(t), m === "switch" && l.device_id && o.set(t, l.device_id);
		}
	}
	let f = /* @__PURE__ */ new Map();
	for (let e of o.values()) f.set(e, (f.get(e) ?? 0) + 1);
	for (let [e, t] of o) f.get(t) === 1 && (e.power = a.get(t));
	let p = [...n.values()].filter((e) => e.devices.length || e.temp).sort((e, t) => e.level - t.level || (e.floor ?? "").localeCompare(t.floor ?? "") || e.name.localeCompare(t.name));
	for (let e of p) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.devices) t.set(n.name, (t.get(n.name) ?? 0) + 1);
		for (let n of e.devices) t.get(n.name) !== 1 && (n.name = n.full, l.push({
			id: n.id,
			name: n.full
		}));
	}
	for (let e of p) e.devices.sort((e, t) => e.kind.localeCompare(t.kind) || e.name.localeCompare(t.name));
	let m = p.flatMap((e) => [
		e.temp,
		e.humidity,
		e.climate,
		...e.devices.flatMap((e) => [e.id, e.power])
	]), h = (e) => e.map((e) => ({
		id: e.id,
		name: e.name
	}));
	return {
		rooms: p,
		sightings: i,
		gaps: [
			{
				kind: "loose",
				items: c
			},
			{
				kind: "plumbing",
				items: u.sort((e, t) => (e.via ?? "").localeCompare(t.via ?? "") || e.name.localeCompare(t.name))
			},
			{
				kind: "clash",
				items: l
			},
			{
				kind: "floorless",
				items: p.some((e) => e.floor) ? h(p.filter((e) => !e.floor)) : []
			},
			{
				kind: "cold",
				items: h(p.filter((e) => !e.temp && !e.climate))
			}
		].filter((e) => e.items.length),
		scenes: r.sort(),
		weather: s,
		power: t.power,
		watched: [
			...m,
			...r,
			s,
			t.power
		].filter((e) => !!e)
	};
}
function Ue(e, t) {
	let n = (e) => {
		let n = e ? t.states[e] : void 0, r = Number(n?.state);
		return n && n.state !== "" && Number.isFinite(r) ? r : void 0;
	}, r = (e) => {
		let r = n(e);
		return r === void 0 ? void 0 : t.states[e].attributes.unit_of_measurement === "kW" ? r : r / 1e3;
	}, i = [], a = e.rooms.map((e) => {
		let a = e.climate ? t.states[e.climate] : void 0, o = a?.attributes.temperature, s = e.devices.map((n) => {
			let a = t.states[n.id], o = !a || a.state === "unavailable", s = !o && (n.kind === "lock" ? a.state === "locked" : n.kind === "cover" ? a.state !== "closed" : a.state === "on"), c = n.kind === "light" ? a?.attributes.brightness : n.kind === "cover" ? a?.attributes.current_position : void 0, l = typeof c == "number" ? n.kind === "light" ? Math.round(c / 255 * 100) : c : void 0, u = a?.attributes.supported_color_modes ?? [], d = !n.guarded && (n.kind === "light" ? u.some((e) => e !== "onoff") : n.kind === "cover" && !!(a?.attributes.supported_features & 4)), f = s ? r(n.power) : void 0;
			return f !== void 0 && f >= 1 && i.push({
				id: n.id,
				name: n.name,
				room: e.name,
				kw: f
			}), {
				id: n.id,
				name: n.name,
				kind: n.kind,
				on: s,
				level: l,
				dims: d,
				away: o,
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
function We(e, t) {
	let n = new Map(e.sightings.map((e) => [e.id, e]));
	return t.flatMap((e) => {
		let t = n.get(e.entity), r = e.photo ? `/api/${Le}/photo/${e.id}?v=${e.changed}` : void 0;
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
//#region src/dash-bored/stories.ts
var Ge = (e, t) => e.kind === "cover" ? {
	domain: "cover",
	service: "set_cover_position",
	ids: [e.id],
	data: { position: t }
} : t ? {
	domain: "light",
	service: "turn_on",
	ids: [e.id],
	data: { brightness_pct: t }
} : {
	domain: "light",
	service: "turn_off",
	ids: [e.id]
}, Ke = 6e5, qe = {
	critical: 100,
	error: 95,
	warning: 70,
	task: 40
}, Y = {
	alarm: 92,
	doorbell: 80,
	person: 62,
	vehicle: 42,
	animal: 41
}, Je = [
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
], X = (e) => new Date(e).toTimeString().slice(0, 5), Z = (e) => e && e[0].toUpperCase() + e.slice(1);
function Q(e) {
	let t = Je[e] ?? String(e);
	return {
		n: String(e),
		N: Z(t),
		n_word: t,
		s: e === 1 ? "" : "s",
		v: e === 1 ? "s" : ""
	};
}
function Ye(e) {
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
function Xe(e) {
	return typeof e.value == "number" || typeof e.value == "string" && e.value.trim() !== "" && Number.isFinite(Number(e.value)) ? `${e.value}${e.unit ? ` ${e.unit}` : ""}` : "";
}
function Ze(e, t, n, r = []) {
	let i = [], a = (e) => i.push({
		variant: "",
		flavour: "",
		...e
	}), o = e.rooms.flatMap((e) => e.devices);
	for (let e of t) {
		let t = {
			name: e.name,
			area: (e.area ?? "house").toLowerCase(),
			message: e.message || `${Z(e.level)}.`,
			reading: Xe(e),
			since: X(e.began),
			escalated: e.escalated ? "yes" : ""
		}, r = Xe(e) ? [Xe(e), e.area ?? e.name] : [Z(e.level), e.name];
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
			rank: qe[e.level] ?? 70,
			vars: t,
			figure: r
		});
	}
	let s = /* @__PURE__ */ new Map();
	for (let e of r) {
		if (n - e.at >= 6e5 || !(e.kind in Y)) continue;
		let t = s.get(e.camera);
		(!t || Y[e.kind] > Y[t.kind] || Y[e.kind] === Y[t.kind] && e.at > t.at) && s.set(e.camera, e);
	}
	for (let e of [...s.values()].sort((e, t) => t.at - e.at)) a({
		kind: "sighting",
		variant: e.kind,
		id: "sighting." + e.camera,
		rank: Y[e.kind],
		vars: {
			name: e.name,
			room: (e.room ?? "house").toLowerCase(),
			at: X(e.at)
		},
		figure: [X(e.at), e.name],
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
	let c = o.filter((e) => e.away);
	if (c.length) {
		let e = c.slice(0, 3).map((e) => `${e.room} ${e.name.toLowerCase()}`).join(", ");
		a({
			kind: "offline",
			id: "offline",
			rank: 65,
			figure: [String(c.length), "not answering"],
			vars: {
				...Q(c.length),
				names: c.length > 3 ? `${e} and ${c.length - 3} more` : e,
				since: X(Math.min(...c.map((e) => e.since)))
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
			vars: Q(u.length),
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
		vars: Q(o.length),
		figure: [String(e.rooms.length), e.rooms.length === 1 ? "room" : "rooms"]
	}), i.sort((e, t) => t.rank - e.rank);
}
//#endregion
//#region src/dash-bored/styles.ts
var Qe = h`
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
  .masthead h1 { margin: 0; font: 400 clamp(30px, 10.5cqi, 62px)/1.1 "Dash-Bored Masthead", var(--head); overflow-wrap: anywhere; }
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
  [data-style="tabloid"] .archive img { filter: none; }
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
`, $ = (e, t) => e.replace(/\{(\w+)\}/g, (e, n) => t[n] ?? ""), $e = {
	esphome: "ESPHome. Add entity_category: config (or diagnostic) to each in its device's YAML",
	knx: "KNX. Add entity_category: config to each in the KNX YAML",
	"": "Give each the label Dash-Bored hide, or hide it in Home Assistant"
};
function et(e, t, n) {
	let r = e.stories[`${t.kind}.${t.variant}`] ?? e.stories[t.kind], i = r.flavours?.[t.flavour] ?? r.head, a = t.vars.escalated && r.worse ? " " + r.worse : "";
	return {
		kicker: r.kicker,
		head: $(i[n % i.length], t.vars),
		deck: $(r.deck, t.vars),
		body: r.body ? $(t.vars.reading === "" && r.plain ? r.plain : r.body, t.vars) + a : "",
		act: t.press && r.act ? r.act : ""
	};
}
var tt = (e, t) => $(e.words.percent, { n: String(t) });
function nt(e) {
	let t = e.name.toLowerCase(), n = /lamp|light/i.test(t) ? t : `${t} light`, r = /s$/i.test((e.kind === "light" ? n : t).split(" - ")[0]);
	return {
		name: t,
		lamp: n,
		is: r ? "are" : "is",
		v: r ? "" : "s"
	};
}
function rt(e, t) {
	let { ask: n, less: r, more: i } = e.polls[t.kind];
	return {
		ask: $(n, nt(t)),
		less: r,
		more: i
	};
}
function it(e, t) {
	let n = t.away ? "away" : t.on ? t.level === void 0 && (t.kind === "light" || t.kind === "cover") ? `${t.kind}.plain` : `${t.kind}.on` : `${t.kind}.off`, [r, i] = $(e.words[n], {
		...nt(t),
		level: "\0"
	}).replace(/^the (?=\S+['’]s )/, "").split("\0");
	return i === void 0 ? [
		r,
		"",
		""
	] : [
		r,
		tt(e, t.level),
		i
	];
}
var at = (e, t) => it(e, t).join(""), ot = (e, t) => $(t.level === "nominal" ? e.wire.clear : e.wire.trouble, {
	name: t.name,
	message: t.message || t.level,
	level: t.level.toUpperCase()
}), st = {
	kicker: "Stop press",
	head: ["{name} gives cause for alarm"],
	deck: "{message}",
	body: "The reading stood at {reading} in the {area} as this edition went to press, and the trouble dates from {since}.",
	plain: "The trouble in the {area} dates from {since}.",
	worse: "Matters have worsened since our earlier report."
}, ct = {
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
}, lt = {
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
			gaps: "Corrections and clarifications"
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
			}
		},
		wire: {
			trouble: "{name}: {message}",
			clear: "{name}: all is well again."
		},
		notices: [
			"Arranged at a touch. Apply within.",
			"By appointment to the household.",
			"Satisfaction assured.",
			"Enquire at this office."
		],
		stories: {
			alert: st,
			"alert.warning": {
				...st,
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
			gaps: "Sort it out"
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
			}
		},
		wire: {
			trouble: "{name}: {level}!",
			clear: "{name}: PANIC OVER"
		},
		notices: [
			"Go on, press it.",
			"One tap. Job done.",
			"You know you want to.",
			"Easy as that."
		],
		stories: {
			alert: ct,
			"alert.warning": {
				...ct,
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
}, ut = "dash-bored-gazette", dt = "casa_mia_dash_bored/alerts", ft = "casa_mia_dash_bored/sightings", pt = 18e5, mt = 10, ht = "dash-bored-style", gt = "/casa_mia_dash_bored/fonts/UnifrakturCook-Bold.ttf", _t = !1;
function vt() {
	if (_t) return;
	_t = !0;
	let e = new FontFace("Dash-Bored Masthead", `url(${gt})`);
	document.fonts.add(e), e.load().catch((e) => console.error("Dash-Bored: the masthead's font could not be loaded", e));
}
var yt = 30, bt = 3, xt = 10, St = 350, Ct = (e) => e.away || (e.kind === "lock" ? !e.on : e.on), wt = class extends q {
	constructor(...e) {
		super(...e), this.narrow = !1, this._style = "broadsheet", this._alerts = [], this._seen = [], this._fault = "", this._lost = 0, this._config = {}, this._late = [], this._turn = /* @__PURE__ */ new Map(), this._showing = /* @__PURE__ */ new Set(), this._feeds = /* @__PURE__ */ new Map(), this._primed = !1, this._seenPrimed = !1, this._timers = /* @__PURE__ */ new Set();
	}
	static {
		this.styles = Qe;
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
			_scale: { state: !0 }
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
		if (this._lost = 0, this._listen(), !this._survey || !t || t.entities !== e.entities || t.areas !== e.areas || t.devices !== e.devices || t.floors !== e.floors) this._survey = He(e, this._config);
		else if (t.states === e.states || !this._survey.watched.some((n) => t.states[n] !== e.states[n])) return;
		let n = new Map(this._house?.rooms.flatMap((e) => e.devices).map((e) => [e.id, e]));
		this._house = Ue(this._survey, e);
		for (let e of this._house.rooms.flatMap((e) => e.devices)) {
			let t = n.get(e.id);
			!t || t.on === e.on && t.level === e.level && t.away === e.away || (this._note({
				time: Date.now(),
				device: e
			}), this._scale?.id === e.id && (this._scale = {
				...this._scale,
				want: void 0
			}));
		}
	}
	connectedCallback() {
		super.connectedCallback(), vt(), this._choose(), this._hass?.connected !== !1 && this._listen();
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
			e ??= localStorage.getItem(ht) ?? void 0;
		} catch {}
		e && e in lt && (this._style = e);
	}
	_dress(e) {
		this._style = e;
		try {
			localStorage.setItem(ht, e);
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
		t(dt, "Sensor Watch's alerts", (e) => this._take(e)), t(ft, "The cameras' sightings", (e) => this._sight(e));
	}
	_sight(e) {
		let t = new Map(this._seen.map((e) => [e.id, e])), n = Date.now();
		for (let r of e) {
			let e = t.has(r.id);
			t.set(r.id, r);
			let i = n - r.at * 1e3;
			if (e || i >= 6e5) continue;
			this._later(Ke - i);
			let [a] = this._seenPrimed && this._survey ? We(this._survey, [r]) : [];
			a && this._note({
				time: a.at,
				seen: a
			});
		}
		this._seenPrimed = !0, this._seen = [...t.values()].filter((e) => n - e.at * 1e3 < pt);
	}
	_take(e) {
		let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
		for (let n of e) {
			let e = {
				...n,
				at: n.at * 1e3,
				began: n.began * 1e3,
				flavour: Ye(this._hass?.states[n.entity_id]?.attributes.device_class)
			};
			t.set(e.entity_id, e), this._primed && (this._note({
				time: e.at,
				alert: e
			}), e.level === "nominal" ? this._later(Ke) : this.scrollIntoView({
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
		e.guarded || e.away ? r(this, "hass-more-info", { entityId: e.id }) : this._call({
			domain: e.kind,
			service: "toggle",
			ids: [e.id]
		}, `${e.room} ${e.name}`);
	}
	_ask(e, t) {
		clearTimeout(this._asking), this._timers.delete(this._asking), this._asking = setTimeout(() => {
			this._timers.delete(this._asking), this._call(Ge(e, t), `${e.room} ${e.name}`);
		}, St), this._timers.add(this._asking);
	}
	_measure(e, t) {
		this._scale = this._scale?.id === e.id && this._scale.board === t ? void 0 : {
			id: e.id,
			board: t
		};
	}
	_key(e) {
		(e.key === "Enter" || e.key === " ") && (e.preventDefault(), e.currentTarget.click());
	}
	render() {
		let e = this._hass, t = this._house, n = lt[this._style];
		if (!e || !t) return R`<div class="paper" data-style=${this._style}><p class="wait">Waiting for Home Assistant.</p></div>`;
		let a = Date.now(), o = We(this._survey, this._seen).filter((e) => a - e.at < pt), s = [...o].sort((e, t) => t.at - e.at).slice(0, mt), c = (e) => (n.stories[`sighting.${e}`]?.kicker ?? e).toLowerCase(), l = Ze(t, this._alerts, a, o);
		for (let e of l) this._showing.has(e.id) || this._turn.set(e.id, (this._turn.get(e.id) ?? -1) + 1);
		this._showing = new Set(l.map((e) => e.id));
		let u = l.map((e) => ({
			s: e,
			...et(n, e, this._turn.get(e.id))
		})), [d, ...f] = u, p = u.find((e) => e.s.kind === "alert"), m = (e) => e.act ? R`<button class="act" @click=${() => this._call(e.s.press, e.head)}>${e.act}</button>` : B, h = (e, t) => {
			let [r, i, a] = e.dims && !e.away ? it(n, e) : [
				at(n, e),
				"",
				""
			], o = (e, t, n) => e ? R`<span class="fact ${t}" role="button" tabindex="0" @click=${n} @keydown=${this._key}>${e}</span>` : B;
			return R`${o(t ? Z(r) : r, e.away ? "away" : "", () => this._press(e))}${o(i, "level", () => this._measure(e, !1))}${o(a, "", () => this._press(e))}`;
		}, g = (e, t) => {
			let r = this._scale, i = r?.board === t ? e.devices.find((e) => e.id === r.id && e.dims && !e.away) : void 0;
			if (!i || !r) return B;
			let a = i.on ? i.level ?? 0 : 0, o = (e) => Number(e.target.value), s = r.want ?? a, c = rt(n, i), l = (e, t) => {
				let n = Math.min(100, Math.max(0, s + t));
				return R`<button class="act" ?disabled=${n === s} @click=${() => (this._scale = {
					...r,
					want: n
				}, this._ask(i, n))}>${e}</button>`;
			};
			return R`<span class="scale">
        <span class="poll"><i>${Z(c.ask)}</i>${l(c.less, -10)}${l(c.more, xt)}</span>
        <input type="range" min="0" max="100" aria-label=${i.name} .value=${Fe(String(s))}
          @input=${(e) => this._scale = {
				...r,
				want: o(e)
			}}
          @change=${(e) => this._ask(i, o(e))} />
        <output>${tt(n, a)}${r.want === void 0 || r.want === a ? "" : ` → ${r.want}`}</output>
        <button aria-label="Close" @click=${() => this._scale = void 0}>×</button>
      </span>`;
		}, _ = (e) => e.photo ? R`<figure class="photo" role="button" tabindex="0" @click=${() => r(this, "hass-more-info", { entityId: e.see })} @keydown=${this._key}>
            <img src=${e.photo} alt=${e.figure[1]} loading="lazy" @error=${() => this._fault = `The photograph from ${e.figure[1]} could not be fetched.`} />
            <figcaption>${e.figure[1]}, ${e.figure[0]}</figcaption>
          </figure>` : B, v = t.rooms.filter((e) => e.temp !== void 0), y = t.rooms.filter((e) => e.devices.length), b = y.reduce((e, t) => e + t.devices.length, 0) > yt, x = b ? y.map((e) => ({
			...e,
			devices: e.devices.filter(Ct)
		})).filter((e) => e.devices.length) : y, ee = y.some((e) => e.floor), S = (e, t, r = (e) => e) => {
			let i = /* @__PURE__ */ new Map();
			for (let t of e) i.set(t.floor ?? "", [...i.get(t.floor ?? "") ?? [], t]);
			return [...i].map(([e, i]) => R`${ee ? R`<h5>${e || n.titles.elsewhere}</h5>` : B}${r(i.map(t))}`);
		}, C = (e) => {
			let t = (t) => {
				let n = e.devices.filter((e) => b && e.kind === t && e.on && !e.away);
				return n.length > bt ? n : [];
			}, r = t("light"), i = t("switch"), a = e.devices.filter((e) => !r.includes(e) && !i.includes(e)).map((e, t) => h(e, !t && !r.length && !i.length));
			return i.length && a.unshift(r.length ? $(n.words["switch.many"], Q(i.length)) : Z($(n.words["switch.many"], Q(i.length)))), r.length && a.unshift(R`<span class="fact" role="button" tabindex="0" @click=${() => this._call({
				domain: "light",
				service: "turn_off",
				ids: r.map((e) => e.id)
			}, e.name)} @keydown=${this._key}>${Z($(n.words["light.many"], Q(r.length)))}</span>`), R`<p><b>${e.name}.</b> ${a.map((e, t) => R`${t ? n.join : ""}${e}`)}${n.end}${g(e, !1)}</p>`;
		}, w = (e) => {
			let t = R`<button class="chip ${e.on ? "on" : ""} ${e.away ? "away" : ""}" aria-pressed=${e.on} @click=${() => this._press(e)}>${e.name}</button>`;
			return !e.dims || e.away ? t : R`<div class="pair">${t}<button class="chip tab" aria-label="${e.name}: set the level" aria-expanded=${this._scale?.id === e.id && this._scale.board} @click=${() => this._measure(e, !0)}>${e.on ? e.level ?? "" : 0}%</button></div>`;
		}, T = R`<h3>${n.titles.board}</h3>
      ${S(y, (e) => R`<div class="row"><span>${e.name}</span>${e.devices.map(w)}</div>${g(e, !0)}`, (e) => R`<div class="rows">${e}</div>`)}`;
		return R`<div class="paper" data-style=${this._style}>
      ${this._lost ? R`<div class="fault" role="alert">Not connected to Home Assistant since ${X(this._lost)}. What follows is how things stood then.</div>` : B}
      ${this._fault ? R`<div class="fault" role="alert">${this._fault}</div>` : B}
      ${p ? Pe(p.s.id + p.s.variant, R`<div class="breaking" role="status"><b>${n.flash}</b>${p.head}${/[!?]$/.test(p.head) ? "" : ":"} ${p.s.vars.message}</div>`) : B}
      <header class="masthead"><h1>${n.name}</h1><p>${n.strap}</p></header>
      <div class="dateline">
        ${this.hasAttribute("panel") ? R`<ha-menu-button .hass=${e} .narrow=${this.narrow}></ha-menu-button>` : B}
        <span>${(/* @__PURE__ */ new Date()).toLocaleDateString(e.locale?.language ?? "en-GB", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric"
		})}</span>
        ${this._config.style ? B : R`<span class="styles">${Object.entries(lt).map(([e, t]) => R`<button aria-pressed=${e === this._style} @click=${() => this._dress(e)}>${t.label}</button>`)}</span>`}
        <span>${n.price} · ${X(Date.now())}</span>
      </div>
      <main class="page ${f.length ? "" : "solo"}">
        <article>
          <div class="figure"><b>${d.s.figure[0]}</b><span>${d.s.figure[1]}</span></div>
          <p class="kicker">${d.kicker}</p>
          ${Pe(d.head, R`<h2>${d.head}</h2>`)}
          <p class="deck">${d.deck}</p>
          ${m(d)}
          ${_(d.s)}
          <div class="copy">
            ${d.body ? R`<p>${d.body}</p>` : B}
            ${S(x, C)}
            ${y.length > x.length ? R`<p>${$(n.rest, Q(y.length - x.length))}</p>` : B}
            ${y.length ? B : R`<p>No areas with lights, switches, covers or locks were found. Give your devices areas in Home Assistant's settings and this page fills itself in.</p>`}
          </div>
        </article>
        ${f.length ? R`<section>
              <h3>${n.titles.more}</h3>
              ${f.slice(0, 3).map((e) => R`<div class="item"><p class="kicker">${e.kicker}</p><h4>${e.head}</h4>${_(e.s)}<p>${e.deck}</p>${m(e)}</div>`)}
              ${f.length > 3 ? R`<h3>${n.titles.briefs}</h3><ul>${f.slice(3).map((e) => R`<li><b>${e.head}.</b> ${e.deck}</li>`)}</ul>` : B}
            </section>` : B}
        <aside>
          <h3>${n.titles.late}</h3>
          <ol>${this._late.length ? this._late.map((e) => R`<li><time>${X(e.time)}</time>${e.alert ? ot(n, e.alert) : e.seen ? `${e.seen.name}: ${c(e.seen.kind)}` : `${e.device.room}: ${at(n, e.device)}`}</li>`) : R`<li>${n.nothing}</li>`}</ol>
          ${s.length ? R`<h3>${n.titles.archive}</h3>
                <ol class="archive">${s.map((e) => R`<li role="button" tabindex="0" @click=${() => r(this, "hass-more-info", { entityId: e.camera })} @keydown=${this._key}>
                    ${e.photo ? R`<img src=${e.photo} alt="" loading="lazy" />` : R`<i></i>`}<span><time>${X(e.at)}</time>${e.name}: ${c(e.kind)}</span></li>`)}</ol>` : B}
          ${v.length ? R`<h3>${n.titles.temps}</h3><table>${v.map((e) => R`<tr><td>${e.name}</td><td>${e.temp.toFixed(1)}° ${e.target === void 0 ? "" : e.temp < e.target - .5 ? "▼" : e.temp > e.target + .5 ? "▲" : "="}</td></tr>`)}</table>` : B}
          ${b ? B : T}
          ${t.gaps.length ? R`<h3>${n.titles.gaps}</h3>
                ${t.gaps.map((e) => R`<details><summary>${$(n.gaps[e.kind], Q(e.items.length))}</summary>
                  <ul>${e.items.map((t, n) => R`${e.kind === "plumbing" && t.via !== e.items[n - 1]?.via ? R`<li class="via">${$e[t.via ?? ""] ?? `${t.via}. ${$e[""]}`}:</li>` : B}<li><button class="mend" @click=${() => e.kind === "floorless" || e.kind === "cold" ? i(`/config/areas/area/${t.id}`) : r(this, "hass-more-info", { entityId: t.id })}>${t.name}</button></li>`)}</ul></details>`)}
                <p class="mend">${n.mend}</p>` : B}
          ${t.scenes.length ? R`<h3>${n.titles.notices}</h3>${t.scenes.slice(0, 8).map((e, t) => R`<button class="ad" @click=${() => this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.name)}><b>${e.name}</b>${n.notices[t % n.notices.length]}</button>`)}` : B}
        </aside>
        ${b ? R`<section class="board">${T}</section>` : B}
      </main>
    </div>`;
	}
}, Tt = new URL(import.meta.url).searchParams.get("v") || "dev";
a(ut, wt), o(ut, "Casa Mia Dash-Bored Gazette", "Your house as a newspaper: what matters most is the headline, and every underlined fact is a switch. Best in a panel view."), t("Dash-Bored", "casa_mia_dash_bored/cards", Tt);
//#endregion
