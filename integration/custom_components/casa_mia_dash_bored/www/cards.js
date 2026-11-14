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
})(e) : e, { is: v, defineProperty: y, getOwnPropertyDescriptor: b, getOwnPropertyNames: x, getOwnPropertySymbols: ee, getPrototypeOf: te } = Object, S = globalThis, ne = S.trustedTypes, re = ne ? ne.emptyScript : "", C = S.reactiveElementPolyfillSupport, w = (e, t) => e, T = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? re : null;
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
}, E = (e, t) => !v(e, t), ie = {
	attribute: !0,
	type: String,
	converter: T,
	reflect: !1,
	useDefault: !1,
	hasChanged: E
};
Symbol.metadata ??= Symbol("metadata"), S.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var D = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ie) {
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
		return this.elementProperties.get(e) ?? ie;
	}
	static _$Ei() {
		if (this.hasOwnProperty(w("elementProperties"))) return;
		let e = te(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(w("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(w("properties"))) {
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
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? E)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
D.elementStyles = [], D.shadowRootOptions = { mode: "open" }, D[w("elementProperties")] = /* @__PURE__ */ new Map(), D[w("finalized")] = /* @__PURE__ */ new Map(), C?.({ ReactiveElement: D }), (S.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ae = globalThis, oe = (e) => e, se = ae.trustedTypes, ce = se ? se.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, le = "$lit$", O = `lit$${Math.random().toFixed(9).slice(2)}$`, ue = "?" + O, de = `<${ue}>`, k = document, A = () => k.createComment(""), j = (e) => e === null || typeof e != "object" && typeof e != "function", fe = Array.isArray, pe = (e) => fe(e) || typeof e?.[Symbol.iterator] == "function", me = "[ 	\n\f\r]", M = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, he = /-->/g, ge = />/g, N = RegExp(`>|${me}(?:([^\\s"'>=/]+)(${me}*=${me}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), _e = /'/g, ve = /"/g, ye = /^(?:script|style|textarea|title)$/i, P = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), F = Symbol.for("lit-noChange"), I = Symbol.for("lit-nothing"), be = /* @__PURE__ */ new WeakMap(), L = k.createTreeWalker(k, 129);
function xe(e, t) {
	if (!fe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ce === void 0 ? t : ce.createHTML(t);
}
var Se = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = M;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === M ? c[1] === "!--" ? o = he : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = N) : (ye.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = N) : o = ge : o === N ? c[0] === ">" ? (o = i ?? M, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? N : c[3] === "\"" ? ve : _e) : o === ve || o === _e ? o = N : o === he || o === ge ? o = M : (o = N, i = void 0);
		let d = o === N && e[t + 1].startsWith("/>") ? " " : "";
		a += o === M ? n + de : l >= 0 ? (r.push(s), n.slice(0, l) + le + n.slice(l) + O + d) : n + O + (l === -2 ? t : d);
	}
	return [xe(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Ce = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Se(t, n);
		if (this.el = e.createElement(l, r), L.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = L.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(le)) {
					let t = u[o++], n = i.getAttribute(e).split(O), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Te : r[1] === "?" ? Ee : r[1] === "@" ? De : B
					}), i.removeAttribute(e);
				} else e.startsWith(O) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ye.test(i.tagName)) {
					let e = i.textContent.split(O), t = e.length - 1;
					if (t > 0) {
						i.textContent = se ? se.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], A()), L.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], A());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === ue) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(O, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += O.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = k.createElement("template");
		return n.innerHTML = e, n;
	}
};
function R(e, t, n = e, r) {
	if (t === F) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = j(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = R(e, i._$AS(e, t.values), i, r)), t;
}
var we = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? k).importNode(t, !0);
		L.currentNode = r;
		let i = L.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new z(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Oe(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = L.nextNode(), a++);
		}
		return L.currentNode = k, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, z = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = I, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = R(this, e, t), j(e) ? e === I || e == null || e === "" ? (this._$AH !== I && this._$AR(), this._$AH = I) : e !== this._$AH && e !== F && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? pe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== I && j(this._$AH) ? this._$AA.nextSibling.data = e : this.T(k.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Ce.createElement(xe(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new we(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = be.get(e.strings);
		return t === void 0 && be.set(e.strings, t = new Ce(e)), t;
	}
	k(t) {
		fe(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(A()), this.O(A()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = oe(e).nextSibling;
			oe(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, B = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = I, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = I;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = R(this, e, t, 0), a = !j(e) || e !== this._$AH && e !== F, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = R(this, r[n + o], t, o), s === F && (s = this._$AH[o]), a ||= !j(s) || s !== this._$AH[o], s === I ? e = I : e !== I && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === I ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Te = class extends B {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === I ? void 0 : e;
	}
}, Ee = class extends B {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== I);
	}
}, De = class extends B {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = R(this, e, t, 0) ?? I) === F) return;
		let n = this._$AH, r = e === I && n !== I || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== I && (n === I || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Oe = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		R(this, e);
	}
}, ke = {
	M: le,
	P: O,
	A: ue,
	C: 1,
	L: Se,
	R: we,
	D: pe,
	V: R,
	I: z,
	H: B,
	N: Ee,
	U: De,
	B: Te,
	F: Oe
}, Ae = ae.litHtmlPolyfillSupport;
Ae?.(Ce, z), (ae.litHtmlVersions ??= []).push("3.3.3");
var je = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new z(t.insertBefore(A(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Me = globalThis, V = class extends D {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = je(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return F;
	}
};
V._$litElement$ = !0, V.finalized = !0, Me.litElementHydrateSupport?.({ LitElement: V });
var Ne = Me.litElementPolyfillSupport;
Ne?.({ LitElement: V }), (Me.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/lit-html/directive.js
var H = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, Pe = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Fe = class {
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
}, { I: Ie } = ke, Le = (e) => e.strings === void 0, Re = {}, ze = (e, t = Re) => e._$AH = t, Be = Pe(class extends Fe {
	constructor() {
		super(...arguments), this.key = I;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (ze(e), this.key = t), n;
	}
}), Ve = Pe(class extends Fe {
	constructor(e) {
		if (super(e), e.type !== H.PROPERTY && e.type !== H.ATTRIBUTE && e.type !== H.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!Le(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === F || t === I) return t;
		let n = e.element, r = e.name;
		if (e.type === H.PROPERTY) {
			if (t === n[r]) return F;
		} else if (e.type === H.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return F;
		} else if (e.type === H.ATTRIBUTE && n.getAttribute(r) === t + "") return F;
		return ze(e), t;
	}
}), He = 1, Ue = 4;
function We(e) {
	return (Array.isArray(e) ? e : []).filter((e) => typeof e?.temperature == "number" && Date.parse(e.datetime)).slice(0, Ue).map((e) => ({
		at: Date.parse(e.datetime),
		sky: String(e.condition ?? ""),
		high: e.temperature,
		low: typeof e.templow == "number" ? e.templow : void 0
	}));
}
var Ge = "dash_bored_hide", Ke = "casa_mia_dash_bored", qe = /\b(led|relay|screen|screensaver|in use|enabled|watching|mode|program(me)?|charge)\b/i, Je = {
	climate: "thermostat",
	media_player: "player",
	lawn_mower: "mower",
	water_heater: "water heater",
	alarm_control_panel: "alarm"
}, Ye = /* @__PURE__ */ new Set(["climate", "water_heater"]), Xe = /* @__PURE__ */ new Set([
	"lock",
	"valve",
	"siren"
]), Ze = /* @__PURE__ */ new Set([
	"garage",
	"gate",
	"door"
]);
function Qe(e, t, n) {
	let r = e.slice(t.length), i = (e.toLowerCase().startsWith(t.toLowerCase()) && !/^[a-z0-9]/i.test(r) ? r.replace(/^[\s\-–—:,.]+/, "") : e).replace(n === "light" ? /\s+lights?$/i : n === "switch" ? /\s+switch$/i : /$^/, ""), a = Je[n] ?? n, o = !i || RegExp(`^${a}s?$`, "i").test(i) ? a : i;
	return o[0].toUpperCase() + o.slice(1);
}
function $e(e, t) {
	let n = /* @__PURE__ */ new Map(), r = [], i = [], a = [], o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = t.weather, l = [], u = [], d = [], f = (e) => !!e?.labels?.includes(Ge);
	for (let u of Object.values(e.entities ?? {})) {
		let p = u.entity_id, m = e.states[p];
		if (!m || u.hidden || u.entity_category) continue;
		let h = p.split(".")[0];
		h === "scene" && r.push(p), h === "weather" && (!c || p === "weather.home") && !t.weather && (c = p), h === "sensor" && m.attributes.device_class === "power" && u.device_id && o.set(u.device_id, p);
		let g = e.devices?.[u.device_id], _ = e.areas?.[u.area_id ?? g?.area_id];
		if (f(u) || f(g) || f(_)) continue;
		if (h === "person" && i.push(p), h === "image" && u.platform === Ke && !f(e.entities[m.attributes.camera]) && a.push({
			id: p,
			name: g?.name_by_user ?? g?.name ?? p,
			room: _?.name
		}), nt.has(h)) {
			let e = m.attributes.friendly_name ?? u.name ?? p;
			_ || l.push({
				id: p,
				name: e
			}), qe.test(e) && d.push({
				id: p,
				name: e,
				via: u.platform
			});
		}
		if (!_ || !nt.has(h)) continue;
		if (!n.has(_.area_id)) {
			let t = e.floors?.[_.floor_id];
			n.set(_.area_id, {
				id: _.area_id,
				name: _.name,
				floor: t?.name,
				floorId: t?.floor_id,
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
			name: Qe(y, _.name, h),
			full: y,
			guarded: Xe.has(h) || h === "cover" && Ze.has(m.attributes.device_class)
		};
		v.devices.push(b), h === "switch" && u.device_id && s.set(b, u.device_id);
	}
	let p = /* @__PURE__ */ new Map();
	for (let e of s.values()) p.set(e, (p.get(e) ?? 0) + 1);
	for (let [e, t] of s) p.get(t) === 1 && (e.power = o.get(t));
	let m = (e, t, n) => {
		let r = (e ?? []).findIndex((e) => e === t || !!n && e.toLowerCase() === n.toLowerCase());
		return r < 0 ? Infinity : r;
	}, { floors: h, rooms: g } = t, _ = (e) => m(h ?? t.floor_order, e.floorId, e.floor), v = (e) => m(g ?? t.room_order, e.id, e.name), y = [...n.values()].filter((e) => (e.devices.length || e.temp) && (!h || _(e) < Infinity) && (!g || v(e) < Infinity)).sort((e, t) => _(e) - _(t) || e.level - t.level || (e.floor ?? "").localeCompare(t.floor ?? "") || v(e) - v(t) || e.name.localeCompare(t.name));
	for (let e of y) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.devices) t.set(n.name, (t.get(n.name) ?? 0) + 1);
		for (let n of e.devices) t.get(n.name) !== 1 && (n.name = n.full, u.push({
			id: n.id,
			name: n.full
		}));
	}
	for (let e of y) e.devices.sort((e, t) => e.kind.localeCompare(t.kind) || e.name.localeCompare(t.name));
	let b = y.flatMap((e) => [
		e.temp,
		e.humidity,
		e.climate,
		...e.devices.flatMap((e) => [e.id, e.power])
	]), x = (e) => e.map((e) => ({
		id: e.id,
		name: e.name
	}));
	return {
		rooms: y,
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
				items: y.some((e) => e.floor) ? x(y.filter((e) => !e.floor)) : []
			},
			{
				kind: "cold",
				items: x(y.filter((e) => !e.temp && !e.climate))
			}
		].filter((e) => e.items.length),
		scenes: r.sort(),
		weather: c,
		power: t.power,
		watched: [
			...b,
			...r,
			...i,
			c,
			t.power
		].filter((e) => !!e)
	};
}
var U = (e) => (t) => t === e, et = (e) => (t) => t !== e, tt = {
	light: U("on"),
	switch: U("on"),
	lock: U("locked"),
	cover: et("closed"),
	climate: et("off"),
	media_player: U("playing"),
	camera: () => !1,
	fan: U("on"),
	valve: et("closed"),
	vacuum: U("cleaning"),
	lawn_mower: U("mowing"),
	water_heater: et("off"),
	humidifier: U("on"),
	siren: U("on"),
	alarm_control_panel: (e) => e.startsWith("armed")
}, nt = new Set(Object.keys(tt)), rt = [
	"docked",
	"returning",
	"paused",
	"error"
], it = {
	vacuum: rt,
	lawn_mower: rt,
	alarm_control_panel: [
		"triggered",
		"pending",
		"arming"
	]
}, at = {
	light: ["brightness", (e) => Math.round(e / 255 * 100)],
	cover: ["current_position", (e) => e],
	climate: ["temperature", (e) => e],
	media_player: ["volume_level", (e) => Math.round(e * 100)],
	fan: ["percentage", (e) => e],
	valve: ["current_position", (e) => e],
	water_heater: ["temperature", (e) => e],
	humidifier: ["humidity", (e) => e]
}, ot = (e) => e in at, st = {
	light: (e) => (e.supported_color_modes ?? []).some((e) => e !== "onoff"),
	cover: (e) => !!(e.supported_features & 4),
	climate: (e) => !!(e.supported_features & 1),
	media_player: (e) => !!(e.supported_features & 4),
	fan: (e) => !!(e.supported_features & 1),
	water_heater: (e) => !!(e.supported_features & 1),
	humidifier: () => !0
}, ct = {
	min: 0,
	max: 100,
	step: 1,
	vote: 10
}, lt = {
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
		...ct,
		vote: 5
	})
}, ut = (e, t) => lt[e]?.(t) ?? ct;
function dt(e, t) {
	let n = !t || t.state === "unavailable", r = !n && tt[e](t.state), [i, a] = at[e] ?? [], o = i && t?.attributes[i];
	return {
		on: r,
		phase: t && it[e]?.includes(t.state) ? t.state : void 0,
		level: typeof o == "number" && a ? a(o) : void 0,
		away: n
	};
}
function ft(e, t) {
	let n = (e) => {
		let n = e ? t.states[e] : void 0, r = Number(n?.state);
		return n && n.state !== "" && Number.isFinite(r) ? r : void 0;
	}, r = (e) => {
		let r = n(e);
		return r === void 0 ? void 0 : t.states[e].attributes.unit_of_measurement === "kW" ? r : r / 1e3;
	}, i = [], a = e.rooms.map((e) => {
		let a = e.climate ? t.states[e.climate] : void 0, o = a?.attributes.temperature, s = e.devices.map((n) => {
			let a = t.states[n.id], { on: o, phase: s, level: c, away: l } = dt(n.kind, a), u = a?.attributes ?? {}, d = !n.guarded && !!st[n.kind]?.(u), f = o ? r(n.power) : void 0;
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
				span: ut(n.kind, u),
				temp: Ye.has(n.kind) && typeof u.current_temperature == "number" ? u.current_temperature : void 0,
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
			humidity: o.attributes.humidity,
			sky: o.state,
			id: e.weather,
			daily: !!(o.attributes.supported_features & He)
		} : void 0,
		kw: r(e.power)
	};
}
function pt(e, t) {
	let n = new Map(e.sightings.map((e) => [e.id, e]));
	return t.flatMap((e) => {
		let t = n.get(e.entity), r = e.photo ? `/api/${Ke}/photo/${e.id}?v=${e.changed}` : void 0;
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
var mt = 864e5;
function ht(e, t) {
	let n = [];
	for (let r of t) {
		let t = {
			at: r.lu * 1e3,
			...dt(e, {
				state: r.s,
				attributes: r.a ?? {}
			})
		}, i = n.at(-1);
		(!i || i.on !== t.on || i.phase !== t.phase || i.level !== t.level || i.away !== t.away) && n.push(t);
	}
	return n;
}
function gt(e, t, n) {
	let r = [];
	return e.forEach((i, a) => {
		let o = Math.max(i.at, t), s = Math.min(e[a + 1]?.at ?? n, n);
		i.on && s > o && r.push([(o - t) / (n - t) * 100, (s - o) / (n - t) * 100]);
	}), r;
}
async function _t(e, t, n) {
	let r = await e.connection.sendMessagePromise({
		type: "history/history_during_period",
		start_time: (/* @__PURE__ */ new Date(n - mt)).toISOString(),
		entity_ids: [t.id],
		significant_changes_only: !1,
		no_attributes: t.kind === "light" || !ot(t.kind)
	});
	return ht(t.kind, r[t.id] ?? []);
}
//#endregion
//#region src/dash-bored/stories.ts
var vt = {
	lock: ["unlock", "lock"],
	cover: ["close_cover", "open_cover"],
	media_player: ["media_pause", "media_play"],
	valve: ["close_valve", "open_valve"],
	vacuum: ["return_to_base", "start"],
	lawn_mower: ["dock", "start_mowing"]
}, yt = (e) => ({
	domain: e.kind,
	service: (vt[e.kind] ?? ["turn_off", "turn_on"])[+!e.on],
	ids: [e.id]
}), bt = {
	light: ["turn_on", (e) => ({ brightness_pct: e })],
	cover: ["set_cover_position", (e) => ({ position: e })],
	climate: ["set_temperature", (e) => ({ temperature: e })],
	media_player: ["volume_set", (e) => ({ volume_level: e / 100 })],
	fan: ["set_percentage", (e) => ({ percentage: e })],
	water_heater: ["set_temperature", (e) => ({ temperature: e })],
	humidifier: ["set_humidity", (e) => ({ humidity: e })]
};
function xt(e, t) {
	if (e.kind === "light" && !t) return {
		domain: "light",
		service: "turn_off",
		ids: [e.id]
	};
	let [n, r] = bt[e.kind];
	return {
		domain: e.kind,
		service: n,
		ids: [e.id],
		data: r(t)
	};
}
var St = 6, Ct = 60, W = (e) => e.trim().toLowerCase(), wt = (e, t) => W(e.title) === W(t.title) && (!e.artist || !t.artist || W(e.artist) === W(t.artist));
function Tt(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of [...e].sort((e, t) => e.at - t.at)) t.set(`${W(n.name)}\n${W(n.title)}\n${W(n.artist)}`, n);
	return [...t.values()].filter((e) => e.kind !== "clear");
}
function Et(e, t, n) {
	let r = Tt(t), i = /* @__PURE__ */ new Map();
	for (let t of [...e].sort((e, t) => e.at - t.at)) i.set(t.entity_id, t.id);
	let a = [];
	for (let t of [...e].sort((e, t) => t.at - e.at)) {
		let e = n.get(t.entity_id);
		if (!e) continue;
		let o = e.on && i.get(e.id) === t.id && (!e.title || W(e.title).startsWith(W(t.title))), s = e.room.toLowerCase(), c = a.find((e) => e.live === o && e.vars.title === t.title && e.vars.artist === t.artist && e.at - t.at * 1e3 < Ct * 1e3);
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
			marks: t.show ? [] : r.filter((e) => wt(e, t))
		});
	}
	return a.slice(0, St);
}
var Dt = 432e5, Ot = 8;
function kt(e, t, n) {
	let r = e.map((e) => ({
		kind: e.place === "home" ? "home" : e.place === "not_home" ? "left" : "zone",
		at: e.since,
		vars: {
			name: e.name,
			place: e.place
		}
	})), i = Tt(t).map((e) => ({
		kind: e.kind,
		at: e.at * 1e3,
		vars: {
			name: e.name,
			title: e.title,
			artist: e.artist
		}
	}));
	return [...r, ...i].filter((e) => e.at && n - e.at < Dt).sort((e, t) => t.at - e.at).slice(0, Ot);
}
var At = 6e5, jt = {
	critical: 100,
	error: 95,
	warning: 70,
	task: 40
}, G = {
	alarm: 92,
	doorbell: 80,
	person: 62,
	vehicle: 42,
	animal: 41
}, Mt = 30, Nt = [
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
], K = (e) => new Date(e).toTimeString().slice(0, 5), q = (e) => e && e[0].toUpperCase() + e.slice(1);
function J(e) {
	let t = Nt[e] ?? String(e);
	return {
		n: String(e),
		N: q(t),
		n_word: t,
		s: e === 1 ? "" : "s",
		v: e === 1 ? "s" : ""
	};
}
function Pt(e) {
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
function Ft(e) {
	return typeof e.value == "number" || typeof e.value == "string" && e.value.trim() !== "" && Number.isFinite(Number(e.value)) ? `${e.value}${e.unit ? ` ${e.unit}` : ""}` : "";
}
function It(e, t, n, r = []) {
	let i = [], a = (e) => i.push({
		variant: "",
		flavour: "",
		...e
	}), o = e.rooms.flatMap((e) => e.devices);
	for (let e of t) {
		let t = {
			name: e.name,
			area: (e.area ?? "house").toLowerCase(),
			message: e.message || `${q(e.level)}.`,
			reading: Ft(e),
			since: K(e.began),
			escalated: e.escalated ? "yes" : ""
		}, r = Ft(e) ? [Ft(e), e.area ?? e.name] : [q(e.level), e.name];
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
			rank: jt[e.level] ?? 70,
			vars: t,
			figure: r
		});
	}
	let s = /* @__PURE__ */ new Map();
	for (let e of r) {
		if (n - e.at >= 6e5 || !(e.kind in G)) continue;
		let t = s.get(e.camera);
		(!t || G[e.kind] > G[t.kind] || G[e.kind] === G[t.kind] && e.at > t.at) && s.set(e.camera, e);
	}
	for (let e of [...s.values()].sort((e, t) => t.at - e.at)) a({
		kind: "sighting",
		variant: e.kind,
		id: "sighting." + e.camera,
		rank: G[e.kind],
		vars: {
			name: e.name,
			room: (e.room ?? "house").toLowerCase(),
			at: K(e.at)
		},
		figure: [K(e.at), e.name],
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
				...J(c.length),
				names: c.length > 3 ? `${e} and ${c.length - 3} more` : e,
				since: K(Math.min(...c.map((e) => e.since)))
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
		let e = u.filter((e) => e.dims && (e.level ?? 100) > Mt), t = u.length >= 7 && u.length * 2 >= l.length ? "ablaze" : u.length ? "lights" : "dark";
		a({
			kind: t,
			id: t,
			rank: {
				ablaze: 60,
				lights: 30,
				dark: 35
			}[t],
			vars: J(u.length),
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
				data: { brightness_pct: Mt }
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
		vars: J(o.length),
		figure: [String(e.rooms.length), e.rooms.length === 1 ? "room" : "rooms"]
	}), i.sort((e, t) => t.rank - e.rank);
}
//#endregion
//#region src/dash-bored/voices/broadsheet.ts
var Lt = {
	kicker: "Stop press",
	head: ["{name} gives cause for alarm"],
	deck: "{message}",
	body: "The reading stood at {reading} in the {area} as this edition went to press, and the trouble dates from {since}.",
	plain: "The trouble in the {area} dates from {since}.",
	worse: "Matters have worsened since our earlier report."
}, Rt = {
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
		weather: "The weather"
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
		live: "See the camera as it is now"
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
	stories: {
		alert: Lt,
		"alert.warning": {
			...Lt,
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
}, zt = {
	kicker: "Breaking",
	head: ["{name}: what we know so far", "Live: {name}"],
	deck: "{message}",
	body: "The latest reading in the {area} is {reading}. It began at {since}.",
	plain: "It began in the {area} at {since}.",
	worse: "Update: it has got worse."
}, Bt = {
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
		weather: "Forecast"
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
		live: "Watch live"
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
	stories: {
		alert: zt,
		"alert.warning": {
			...zt,
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
}, Vt = {
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
}, Ht = {
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
		weather: "Brolly watch"
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
		live: "Watch it LIVE"
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
	stories: {
		alert: Vt,
		"alert.warning": {
			...Vt,
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
}, Y = (e, t) => e.replace(/\{(\w+)\}/g, (e, n) => t[n] ?? ""), Ut = {
	esphome: "ESPHome. Add entity_category: config (or diagnostic) to each in its device's YAML",
	knx: "KNX. Add entity_category: config to each in the KNX YAML",
	"": "Give each the label Dash-Bored hide, or hide it in Home Assistant"
};
function Wt(e, t, n) {
	let r = e.stories[`${t.kind}.${t.variant}`] ?? e.stories[t.kind], i = r.flavours?.[t.flavour] ?? r.head, a = t.vars.escalated && r.worse ? " " + r.worse : "";
	return {
		kicker: r.kicker,
		head: Y(i[n % i.length], t.vars),
		deck: Y(r.deck, t.vars),
		body: r.body ? Y(t.vars.reading === "" && r.plain ? r.plain : r.body, t.vars) + a : "",
		act: t.press && r.act ? r.act : "",
		vote: t.vote && r.vote ? r.vote : ""
	};
}
var Gt = (e, t, n) => Y(e.words[Ye.has(t) ? "degrees" : "percent"], { n: String(n) });
function Kt(e) {
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
function qt(e, t) {
	let { ask: n, less: r, more: i } = e.polls[t.kind];
	return {
		ask: Y(n, Kt(t)),
		less: r,
		more: i
	};
}
function Jt(e, t) {
	let n = (n) => `${t.kind}.${n}` in e.words, r = t.away ? "away" : t.phase && n(t.phase) ? `${t.kind}.${t.phase}` : t.on ? t.level === void 0 && n("plain") ? `${t.kind}.plain` : `${t.kind}.on` : `${t.kind}.off`, [i, a] = Y(e.words[r], {
		...Kt(t),
		level: "\0"
	}).replace(/^the (?=\S+['’]s )/, "").split("\0");
	return a === void 0 ? [
		i,
		"",
		""
	] : [
		i,
		Gt(e, t.kind, t.level),
		a
	];
}
var Yt = (e, t) => Jt(e, t).join(""), Xt = (e, t) => e.skies[t] ?? q(t.replace(/[-_]/g, " "));
function Zt(e, t) {
	let n = Y(t.vars.artist ? e.personal.song : e.personal.tune, t.vars);
	return [Y(e.celebrity[t.live ? `${t.kind}.live` : t.kind], {
		...t.vars,
		song: n
	}), t.marks.map((t) => Y(e.celebrity[t.kind], { name: t.name }))];
}
function Qt(e, t) {
	let n = Y(t.vars.artist ? e.personal.song : e.personal.tune, t.vars);
	return Y(e.personal[t.kind], {
		...t.vars,
		song: n
	});
}
var $t = (e, t) => Y(t.level === "nominal" ? e.wire.clear : e.wire.trouble, {
	name: t.name,
	message: t.message || t.level,
	level: t.level.toUpperCase()
}), en = {
	broadsheet: Rt,
	tabloid: Ht,
	rolling: Bt
}, tn = {
	s: 1,
	x: 0,
	y: 0
}, nn = 6, rn = 1.2, an = 2.5;
function on(e, t, n, r, i, a, o, s) {
	let c = Math.min(nn, Math.max(1, e.s * t)), l = c / e.s, u = (e, t) => Math.min(t, Math.max(-t, e)) || 0;
	return {
		s: c,
		x: u(n - (n - e.x - i) * l, (c - 1) * o / 2),
		y: u(r - (r - e.y - a) * l, (c - 1) * s / 2)
	};
}
var X = tn, Z = /* @__PURE__ */ new Map();
function sn() {
	let e = [...Z.values()], t = (t) => e.reduce((e, n) => e + n[t], 0) / e.length;
	return [
		t(0),
		t(1),
		e.length > 1 ? Math.hypot(e[0][0] - e[1][0], e[0][1] - e[1][1]) : 0
	];
}
function cn(e, t, n, r, i = 0, a = 0) {
	let o = e.getBoundingClientRect();
	X = on(X, t, n - o.left - o.width / 2, r - o.top - o.height / 2, i, a, o.width, o.height), e.firstElementChild.style.transform = `translate(${X.x}px, ${X.y}px) scale(${X.s})`, e.classList.toggle("near", X.s > 1);
}
var ln = (e) => e.currentTarget, Q = {
	whole() {
		X = tn, Z.clear();
	},
	down(e) {
		ln(e).setPointerCapture(e.pointerId), Z.set(e.pointerId, [e.clientX, e.clientY]);
	},
	move(e) {
		if (!Z.has(e.pointerId)) return;
		let [t, n, r] = sn();
		Z.set(e.pointerId, [e.clientX, e.clientY]);
		let [i, a, o] = sn();
		cn(ln(e), r && o ? o / r : 1, i, a, i - t, a - n);
	},
	up(e) {
		Z.delete(e.pointerId);
	},
	wheel(e) {
		e.preventDefault(), cn(ln(e), e.deltaY < 0 ? rn : 1 / rn, e.clientX, e.clientY);
	},
	twice(e) {
		cn(ln(e), X.s > 1 ? 1 / X.s : an, e.clientX, e.clientY);
	}
}, un = 5, dn = /* @__PURE__ */ new Map();
function fn(e) {
	let t = dn.get(e);
	if (t) return t;
	let n = [...e].reduce((e, t) => e * 31 + t.charCodeAt(0) >>> 0, 7), r = () => (n = n * 1664525 + 1013904223 >>> 0) / 2 ** 32, i = (e) => Array.from({ length: e }, (t, n) => ((n + r() * .8) / e * 100).toFixed(1)), a = () => (r() * un).toFixed(1), o = `polygon(${[
		...i(30).map((e) => `${e}% ${a()}px`),
		...i(22).map((e) => `calc(100% - ${a()}px) ${e}%`),
		...i(30).map((e) => `calc(100% - ${e}%) calc(100% - ${a()}px)`),
		...i(22).map((e) => `${a()}px calc(100% - ${e}%)`)
	].join(",")})`;
	return dn.set(e, o), o;
}
var pn = (e, t, n, r, i = "") => P`<dialog class="clipping ${i}" @close=${n} @click=${(e) => e.target === e.currentTarget && n()}>
    <div class="cutting" style="clip-path:${fn(e)}">
      <div class="scrap above" aria-hidden="true">${t.above}</div>
      <div class="story">${r}</div>
      <div class="scrap beside" aria-hidden="true"><span>${t.beside}</span></div>
      <div class="scrap below" aria-hidden="true">${t.below}</div>
    </div>
  </dialog>`;
function mn(e, t, n, r) {
	let i = e.clipping;
	return pn(t.src, n, r.shut, P`<p class="kicker">${t.caption}</p>
    <div class="zoom" @pointerdown=${Q.down} @pointermove=${Q.move} @pointerup=${Q.up} @pointercancel=${Q.up} @wheel=${Q.wheel} @dblclick=${Q.twice}>
      <img src=${t.src} alt=${t.caption} draggable="false" @load=${Q.whole} />
    </div>
    <p class="hint">${i.closer}</p>
    <div class="foot">${t.see ? P`<button class="mend" @click=${r.more}>${i.live}</button>` : P`<span></span>`}<button class="act" @click=${r.shut}>${i.shut}</button></div>`, "shot");
}
function hn(e, t, n, r, i, a, o) {
	let s = e.clipping, c = (n) => q(Yt(e, {
		...t,
		on: n.on,
		phase: n.phase,
		level: n.level,
		away: n.away
	})), l = n.record, u = e.acts[`${t.kind}.${t.on ? "on" : "off"}`];
	return pn(t.id, a, o.shut, P`<p class="kicker">${t.room}</p>
      <h4 class="title">${t.name}</h4>
      <p class="deck">${q(Yt(e, t))}. ${t.since && t.kind !== "camera" ? Y(s.since, { at: K(t.since) }) : ""}
        ${t.temp === void 0 ? "" : Y(s.reads, { temp: t.temp.toFixed(1) })} ${t.title ? Y(s.playing, { title: t.title }) : ""}</p>
      ${t.picture ? P`<img class="still" src=${t.picture} alt=${t.name} role="button" tabindex="0" @click=${o.picture} @keydown=${(e) => e.key === "Enter" && o.picture()} />` : I}
      ${t.away || !u ? I : P`<button class="act ${n.armed ? "sure" : ""}" @click=${o.flip}>${n.armed ? s.sure : u}</button>`}
      ${i}
      ${t.kind === "camera" ? I : P`<h3>${s.record}</h3>`}
      ${t.kind === "camera" ? I : n.fault ? P`<p class="fault" role="alert">Home Assistant's history could not be read (${n.fault}).</p>` : l ? P`<div class="band">${gt(l, r - mt, r).map(([e, t]) => P`<i style="left:${e}%;width:${t}%"></i>`)}</div>
              <div class="span"><span>${s.ago}</span><span>${s.now}</span></div>
              <ol>${l.length ? l.slice(-12).reverse().map((e) => P`<li><time>${K(e.at)}</time>${c(e)}</li>`) : P`<li>${s.none}</li>`}</ol>` : P`<p class="wait">${s.wait}</p>`}
      <div class="foot"><button class="mend" @click=${o.more}>${s.more}</button><button class="act" @click=${o.shut}>${s.shut}</button></div>`);
}
//#endregion
//#region src/dash-bored/styles.ts
var gn = h`
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
`, _n = "casa_mia_dash_bored/alerts", vn = "casa_mia_dash_bored/sightings", yn = "casa_mia_dash_bored/personal", bn = "casa_mia_dash_bored/playing", xn = "casa_mia_dash_bored/settings", $ = "weather/subscribe_forecast", Sn = 18e5, Cn = "dash-bored-style", wn = "/casa_mia_dash_bored/fonts/ManufacturingConsent-Regular.ttf", Tn = !1;
function En() {
	if (Tn) return;
	Tn = !0;
	let e = new FontFace("Dash-Bored Masthead", `url(${wn})`);
	document.fonts.add(e), e.load().catch((e) => console.error("Dash-Bored: the masthead's font could not be loaded", e));
}
var Dn = class extends V {
	constructor(...e) {
		super(...e), this.narrow = !1, this._played = [], this._days = [], this._style = "broadsheet", this._alerts = [], this._seen = [], this._rated = [], this._fault = "", this._lost = 0, this._config = {}, this._settings = {}, this._late = [], this._turn = /* @__PURE__ */ new Map(), this._showing = /* @__PURE__ */ new Set(), this._feeds = /* @__PURE__ */ new Map(), this._primed = !1, this._seenPrimed = !1, this._timers = /* @__PURE__ */ new Set();
	}
	static {
		this.styles = gn;
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
			_shot: { state: !0 },
			_rated: { state: !0 },
			_played: { state: !0 },
			_days: { state: !0 }
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
		if (this._lost = 0, this._listen(), !this._survey || !t || t.entities !== e.entities || t.areas !== e.areas || t.devices !== e.devices || t.floors !== e.floors) this._survey = $e(e, {
			...this._settings,
			...this._config
		});
		else if (t.states === e.states || !this._survey.watched.some((n) => t.states[n] !== e.states[n])) return;
		let n = new Map(this._house?.rooms.flatMap((e) => e.devices).map((e) => [e.id, e]));
		this._house = ft(this._survey, e), this._outlook();
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
		super.connectedCallback(), En(), this._choose(), this._hass?.connected !== !1 && this._listen();
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		for (let e of this._feeds.values()) e.then((e) => e()).catch(() => void 0);
		this._feeds.clear(), this._primed = this._seenPrimed = !1, this._forecastOf = void 0;
		for (let e of this._timers) clearTimeout(e);
		this._timers.clear();
	}
	_choose() {
		let e = this._config.style;
		try {
			e ??= localStorage.getItem(Cn) ?? void 0;
		} catch {}
		e && e in en && (this._style = e);
	}
	_dress(e) {
		this._style = e;
		try {
			localStorage.setItem(Cn, e);
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
		t(_n, "Sensor Watch's alerts", (e) => this._take(e)), t(vn, "The cameras' sightings", (e) => this._sight(e));
		let n = (e, t) => [...new Map(e.map((e) => [t(e), e])).values()];
		t(yn, "The Personal column's announcements", (e) => this._rated = n([...this._rated, ...e], (e) => `${e.at} ${e.name} ${e.title}`)), t(xn, "Dash-Bored's settings", (e) => {
			this._settings = e.at(-1) ?? this._settings, this._survey = void 0, this._hass && (this.hass = this._hass);
		}), t(bn, "What the players have played", (e) => this._played = n([...this._played, ...e], (e) => e.id));
	}
	_outlook() {
		let e = this._hass?.connection, t = this._house?.outside, n = t?.daily ? t.id : void 0;
		if (!e || !this.isConnected || n === this._forecastOf || (this._feeds.get($)?.then((e) => e()).catch(() => void 0), this._feeds.delete($), this._forecastOf = n, this._days = [], !n)) return;
		let r = e.subscribeMessage((e) => this._days = We(e.forecast), {
			type: $,
			forecast_type: "daily",
			entity_id: n
		});
		this._feeds.set($, r), r.catch((e) => {
			this._feeds.delete($), console.error(`Dash-Bored: the forecast of ${n} failed`, e), this._fault = `The weather forecast is not reaching this page (${e?.message ?? e}).`;
		});
	}
	_sight(e) {
		let t = new Map(this._seen.map((e) => [e.id, e])), n = Date.now();
		for (let r of e) {
			let e = t.has(r.id);
			t.set(r.id, r);
			let i = n - r.at * 1e3;
			if (e || i >= 6e5) continue;
			this._later(At - i);
			let [a] = this._seenPrimed && this._survey ? pt(this._survey, [r]) : [];
			a && this._note({
				time: a.at,
				seen: a
			});
		}
		this._seenPrimed = !0, this._seen = [...t.values()].filter((e) => n - e.at * 1e3 < Sn);
	}
	_take(e) {
		let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
		for (let n of e) {
			let e = {
				...n,
				at: n.at * 1e3,
				began: n.began * 1e3,
				flavour: Pt(this._hass?.states[n.entity_id]?.attributes.device_class)
			};
			t.set(e.entity_id, e), this._primed && (this._note({
				time: e.at,
				alert: e
			}), e.level === "nominal" ? this._later(At) : this.scrollIntoView({
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
}, On = 6e3, kn = 350, An = /* @__PURE__ */ new Set([
	"climate",
	"media_player",
	"camera",
	"water_heater",
	"vacuum",
	"lawn_mower",
	"alarm_control_panel"
]), jn = class extends Dn {
	_call(e, t) {
		this._hass.callService(e.domain, e.service, {
			entity_id: e.ids,
			...e.data
		}).then(() => this._fault = "", (n) => {
			console.error(`Dash-Bored: ${e.domain}.${e.service} refused`, n), this._fault = `${t}: Home Assistant refused (${n?.message ?? n}).`;
		});
	}
	_press(e) {
		e.guarded || e.away || An.has(e.kind) ? this._story(e) : this._call(yt(e), `${e.room} ${e.name}`);
	}
	_story(e) {
		this._open = { id: e.id }, this._scale = e.dims && !e.away ? { id: e.id } : void 0;
		let t = (t) => {
			this._open?.id === e.id && (this._open = {
				...this._open,
				...t
			});
		};
		e.kind !== "camera" && _t(this._hass, e, Date.now()).then((e) => t({ record: e }), (n) => {
			console.error(`Dash-Bored: the history of ${e.id} could not be read`, n), t({ fault: n?.message ?? String(n) });
		});
	}
	_shut() {
		this._open = this._scale = this._shot = void 0;
	}
	_live(e) {
		this._shut(), r(this, "hass-more-info", { entityId: e });
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
			}, On);
			this._timers.add(n);
			return;
		}
		this._open = {
			...t,
			armed: !1
		}, this._call(yt(e), `${e.room} ${e.name}`);
	}
	updated() {
		let e = this.renderRoot.querySelector("dialog");
		e && !e.open && e.showModal();
	}
	_ask(e, t) {
		clearTimeout(this._asking), this._timers.delete(this._asking), this._asking = setTimeout(() => {
			this._timers.delete(this._asking), this._call(xt(e, t), `${e.room} ${e.name}`);
		}, kn), this._timers.add(this._asking);
	}
	_measure(e) {
		this._scale = this._scale?.id === e.id ? void 0 : { id: e.id };
	}
	_key(e) {
		(e.key === "Enter" || e.key === " ") && (e.preventDefault(), e.currentTarget.click());
	}
}, Mn = "dash-bored-gazette", Nn = 30, Pn = 3, Fn = /* @__PURE__ */ new Set([
	"climate",
	"camera",
	"water_heater",
	"alarm_control_panel"
]), In = /* @__PURE__ */ new Set(["docked"]), Ln = (e) => e.away || !!e.phase && !In.has(e.phase) || !Fn.has(e.kind) && (e.kind === "lock" ? !e.on : e.on), Rn = (e) => e.kind !== "camera" || e.away, zn = class extends jn {
	render() {
		let e = this._hass, t = this._house, n = en[this._style];
		if (!e || !t) return P`<div class="paper" data-style=${this._style}><p class="wait">Waiting for Home Assistant.</p></div>`;
		let a = Date.now(), o = pt(this._survey, this._seen).filter((e) => a - e.at < Sn), s = [...o].sort((e, t) => t.at - e.at).slice(0, 10), c = (e) => (n.stories[`sighting.${e}`]?.kicker ?? e).toLowerCase(), l = It(t, this._alerts, a, o);
		for (let e of l) this._showing.has(e.id) || this._turn.set(e.id, (this._turn.get(e.id) ?? -1) + 1);
		this._showing = new Set(l.map((e) => e.id));
		let u = l.map((e) => ({
			s: e,
			...Wt(n, e, this._turn.get(e.id))
		})), [d, ...f] = u, p = u.find((e) => e.s.kind === "alert"), m = (e) => {
			let t = (t, n) => t ? P`<button class="act" @click=${() => this._call(n, e.head)}>${t}</button>` : I;
			return P`${t(e.act, e.s.press)}${t(e.vote, e.s.vote)}`;
		}, h = (e, t) => {
			let [r, i, a] = e.dims && !e.away ? Jt(n, e) : [
				Yt(n, e),
				"",
				""
			], o = (e, t, n) => e ? P`<span class="fact ${t}" role="button" tabindex="0" @click=${n} @keydown=${this._key}>${e}</span>` : I;
			return P`${o(t ? q(r) : r, e.away ? "away" : "", () => this._press(e))}${o(i, "level", () => this._measure(e))}${o(a, "", () => this._press(e))}`;
		}, g = (e) => {
			let t = this._scale;
			if (!e || !t || t.id !== e.id || !e.dims || e.away) return I;
			let { min: r, max: i, step: a, vote: o } = e.span, s = e.level ?? r, c = (e) => Number(e.target.value), l = t.want ?? s, u = qt(n, e), d = (n, a) => {
				let o = Math.min(i, Math.max(r, Math.round((l + a) * 10) / 10));
				return P`<button class="act" ?disabled=${o === l} @click=${() => (this._scale = {
					...t,
					want: o
				}, this._ask(e, o))}>${n}</button>`;
			};
			return P`<span class="scale">
        <span class="poll"><i>${q(u.ask)}</i>${d(u.less, -o)}${d(u.more, o)}</span>
        <input type="range" min=${r} max=${i} step=${a} aria-label=${e.name} .value=${Ve(String(l))}
          @input=${(e) => this._scale = {
				...t,
				want: c(e)
			}}
          @change=${(t) => this._ask(e, c(t))} />
        <output>${Gt(n, e.kind, s)}${t.want === void 0 || t.want === s ? "" : ` → ${t.want}`}</output>
        <button aria-label="Close" @click=${() => this._scale = void 0}>×</button>
      </span>`;
		}, _ = (e) => e.photo ? P`<figure class="photo" role="button" tabindex="0" @click=${() => this._look({
			src: e.photo,
			caption: `${e.figure[1]}, ${e.figure[0]}`,
			see: e.see
		})} @keydown=${this._key}>
            <img src=${e.photo} alt=${e.figure[1]} loading="lazy" @error=${() => this._fault = `The photograph from ${e.figure[1]} could not be fetched.`} />
            <figcaption>${e.figure[1]}, ${e.figure[0]}</figcaption>
          </figure>` : I, v = t.rooms.filter((e) => e.temp !== void 0), y = kt(t.people, this._rated, a), b = t.rooms.filter((e) => e.devices.length), x = b.reduce((e, t) => e + t.devices.length, 0) > Nn, ee = b.map((e) => ({
			...e,
			devices: e.devices.filter(x ? Ln : Rn)
		})).filter((e) => e.devices.length), te = b.some((e) => e.floor), S = (e, t, r = (e) => e) => {
			let i = /* @__PURE__ */ new Map();
			for (let t of e) i.set(t.floor ?? "", [...i.get(t.floor ?? "") ?? [], t]);
			return [...i].map(([e, i]) => P`${te ? P`<h5>${e || n.titles.elsewhere}</h5>` : I}${r(i.map(t))}`);
		}, ne = (e) => {
			let t = (t) => {
				let n = e.devices.filter((e) => x && e.kind === t && e.on && !e.away);
				return n.length > Pn ? n : [];
			}, r = t("light"), i = t("switch"), a = e.devices.filter((e) => !r.includes(e) && !i.includes(e)).map((e, t) => h(e, !t && !r.length && !i.length));
			return i.length && a.unshift(r.length ? Y(n.words["switch.many"], J(i.length)) : q(Y(n.words["switch.many"], J(i.length)))), r.length && a.unshift(P`<span class="fact" role="button" tabindex="0" @click=${() => this._call({
				domain: "light",
				service: "turn_off",
				ids: r.map((e) => e.id)
			}, e.name)} @keydown=${this._key}>${q(Y(n.words["light.many"], J(r.length)))}</span>`), P`<p><b>${e.name}.</b> ${a.map((e, t) => P`${t ? n.join : ""}${e}`)}${n.end}${this._open ? I : g(e.devices.find((e) => e.id === this._scale?.id))}</p>`;
		}, re = (e) => P`<div class="pair"><button class="chip ${e.on ? "on" : ""} ${e.away ? "away" : ""}" aria-pressed=${e.on} @click=${() => this._press(e)}>${e.name}</button
        ><button class="chip tab" aria-label="${e.name}: its story" @click=${() => this._story(e)}>${e.dims && !e.away ? `${e.level ?? e.span.min}${Ye.has(e.kind) ? "°" : "%"}` : "›"}</button></div>`, C = new Map(t.rooms.flatMap((e) => e.devices).map((e) => [e.id, e])), w = this._open && C.get(this._open.id), T = Et(this._played, this._rated, C), E = f.length ? f : u, ie = {
			above: E[0].deck,
			beside: [...E, ...u].map((e) => `${e.head}. ${e.deck}`).join(" "),
			below: E.at(-1).head
		}, D = P`<h3>${n.titles.board}</h3>
      ${S(b, (e) => P`<div class="row"><span>${e.name}</span>${e.devices.map(re)}</div>`, (e) => P`<div class="rows">${e}</div>`)}`;
		return P`<div class="paper" data-style=${this._style}>
      ${this._lost ? P`<div class="fault" role="alert">Not connected to Home Assistant since ${K(this._lost)}. What follows is how things stood then.</div>` : I}
      ${this._fault ? P`<div class="fault" role="alert">${this._fault}</div>` : I}
      ${p ? Be(p.s.id + p.s.variant, P`<div class="breaking" role="status"><b>${n.flash}</b>${p.head}${/[!?]$/.test(p.head) ? "" : ":"} ${p.s.vars.message}</div>`) : I}
      <header class="masthead"><h1>${n.name}</h1><p>${n.strap}</p></header>
      <div class="dateline">
        ${this.hasAttribute("panel") ? P`<ha-menu-button .hass=${e} .narrow=${this.narrow}></ha-menu-button>` : I}
        <span>${(/* @__PURE__ */ new Date()).toLocaleDateString(e.locale?.language ?? "en-GB", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric"
		})}</span>
        ${this._config.style ? I : P`<span class="styles">${Object.entries(en).map(([e, t]) => P`<button aria-pressed=${e === this._style} @click=${() => this._dress(e)}>${t.label}</button>`)}</span>`}
        <span>${n.price} · ${K(Date.now())}</span>
      </div>
      ${n.ticker ? P`<div class="ticker" aria-hidden="true"><b>${n.ticker}</b><div><span>${u.map((e) => e.head).join("  •  ")}</span></div></div>` : I}
      <main class="page ${f.length ? "" : "solo"}">
        <article>
          <div class="figure"><b>${d.s.figure[0]}</b><span>${d.s.figure[1]}</span></div>
          <p class="kicker">${d.kicker}</p>
          ${Be(d.head, P`<h2>${d.head}</h2>`)}
          <p class="deck">${d.deck}</p>
          ${m(d)}
          ${_(d.s)}
          <div class="copy">
            ${d.body ? P`<p>${d.body}</p>` : I}
            ${S(ee, ne)}
            ${b.length > ee.length ? P`<p>${Y(n.rest, J(b.length - ee.length))}</p>` : I}
            ${b.length ? I : P`<p>No areas with lights, switches or other devices were found. Give your devices areas in Home Assistant's settings and this page fills itself in.</p>`}
          </div>
        </article>
        ${f.length ? P`<section>
              <h3>${n.titles.more}</h3>
              ${f.slice(0, 3).map((e) => P`<div class="item"><p class="kicker">${e.kicker}</p><h4>${e.head}</h4>${_(e.s)}<p>${e.deck}</p>${m(e)}</div>`)}
              ${f.length > 3 ? P`<h3>${n.titles.briefs}</h3><ul>${f.slice(3).map((e) => P`<li><b>${e.head}.</b> ${e.deck}</li>`)}</ul>` : I}
            </section>` : I}
        <aside>
          <h3>${n.titles.late}</h3>
          <ol>${this._late.length ? this._late.map((e) => {
			let t = e.device && C.get(e.device.id);
			return P`<li role=${t ? "button" : I} tabindex=${t ? 0 : I} @click=${() => t && this._story(t)} @keydown=${this._key}><time>${K(e.time)}</time>${e.alert ? $t(n, e.alert) : e.seen ? `${e.seen.name}: ${c(e.seen.kind)}` : `${e.device.room}: ${Yt(n, e.device)}`}</li>`;
		}) : P`<li>${n.nothing}</li>`}</ol>
          ${s.length ? P`<h3>${n.titles.archive}</h3>
                <ol class="archive">${s.map((e) => P`<li role="button" tabindex="0" @click=${() => e.photo ? this._look({
			src: e.photo,
			caption: `${e.name}, ${K(e.at)}`,
			see: e.camera
		}) : r(this, "hass-more-info", { entityId: e.camera })} @keydown=${this._key}>
                    ${e.photo ? P`<img src=${e.photo} alt="" loading="lazy" />` : P`<i></i>`}<span><time>${K(e.at)}</time>${e.name}: ${c(e.kind)}</span></li>`)}</ol>` : I}
          ${y.length ? P`<h3>${n.titles.personal}</h3><ol>${y.map((e) => P`<li><time>${K(e.at)}</time>${Qt(n, e)}</li>`)}</ol>` : I}
          ${T.length ? P`<h3>${n.titles.celebrity}</h3><ol>${T.map((e) => {
			let [t, r] = Zt(n, e);
			return P`<li role="button" tabindex="0" @click=${() => this._story(C.get(e.id))} @keydown=${this._key}><time>${K(e.at)}</time>${t}${r.map((t, n) => P` <span class="mark ${e.marks[n].kind}">${t}</span>`)}</li>`;
		})}</ol>` : I}
          ${t.outside ? P`<h3>${n.titles.weather}</h3>
                <p class="now">${Y(n.forecast.now, {
			sky: Xt(n, t.outside.sky),
			temp: t.outside.temp.toFixed(1)
		})}</p>
                ${this._days.length ? P`<table class="days">${this._days.map((t) => P`<tr><td>${new Date(t.at).toDateString() === new Date(a).toDateString() ? n.forecast.today : new Date(t.at).toLocaleDateString(e.locale?.language ?? "en-GB", { weekday: "long" })}</td>
                        <td>${Xt(n, t.sky)}</td><td>${Math.round(t.high)}°${t.low === void 0 ? "" : ` / ${Math.round(t.low)}°`}</td></tr>`)}</table>` : I}` : I}
          ${v.length ? P`<h3>${n.titles.temps}</h3><table>${v.map((e) => P`<tr><td>${e.name}</td><td>${e.temp.toFixed(1)}° ${e.target === void 0 ? "" : e.temp < e.target - .5 ? "▼" : e.temp > e.target + .5 ? "▲" : "="}</td></tr>`)}</table>` : I}
          ${x ? I : D}
          ${t.gaps.length ? P`<h3>${n.titles.gaps}</h3>
                ${t.gaps.map((e) => P`<details><summary>${Y(n.gaps[e.kind], J(e.items.length))}</summary>
                  <ul>${e.items.map((t, n) => P`${e.kind === "plumbing" && t.via !== e.items[n - 1]?.via ? P`<li class="via">${Ut[t.via ?? ""] ?? `${t.via}. ${Ut[""]}`}:</li>` : I}<li><button class="mend" @click=${() => e.kind === "floorless" || e.kind === "cold" ? i(`/config/areas/area/${t.id}`) : r(this, "hass-more-info", { entityId: t.id })}>${t.name}</button></li>`)}</ul></details>`)}
                <p class="mend">${n.mend}</p>` : I}
          ${t.scenes.length ? P`<h3>${n.titles.notices}</h3>${t.scenes.slice(0, 8).map((e, t) => P`<button class="ad" @click=${() => this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.name)}><b>${e.name}</b>${n.notices[t % n.notices.length]}</button>`)}` : I}
        </aside>
        ${x ? P`<section class="board">${D}</section>` : I}
      </main>
      ${w ? hn(n, w, this._open, a, g(w), ie, {
			flip: () => this._flip(w),
			more: () => this._live(w.id),
			picture: () => this._look({
				src: w.picture,
				caption: `${w.room}: ${w.name}`,
				see: w.id
			}),
			shut: () => this._shut()
		}) : this._shot ? mn(n, this._shot, ie, {
			more: () => this._live(this._shot.see),
			shut: () => this._shut()
		}) : I}
    </div>`;
	}
}, Bn = new URL(import.meta.url).searchParams.get("v") || "dev";
a(Mn, zn), o(Mn, "Casa Mia Dash-Bored Gazette", "Your house as a newspaper: what matters most is the headline, and every underlined fact is a switch. Best in a panel view."), t("Dash-Bored", "casa_mia_dash_bored/cards", Bn);
//#endregion
