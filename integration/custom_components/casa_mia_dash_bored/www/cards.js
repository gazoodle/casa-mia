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
})(n) + e[r + 1], e[0]), e, d), ee = (e, t) => {
	if (u) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = l.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, g = u ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return m(t);
})(e) : e, { is: te, defineProperty: _, getOwnPropertyDescriptor: ne, getOwnPropertyNames: re, getOwnPropertySymbols: ie, getPrototypeOf: ae } = Object, v = globalThis, oe = v.trustedTypes, se = oe ? oe.emptyScript : "", ce = v.reactiveElementPolyfillSupport, y = (e, t) => e, b = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? se : null;
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
}, le = (e, t) => !te(e, t), ue = {
	attribute: !0,
	type: String,
	converter: b,
	reflect: !1,
	useDefault: !1,
	hasChanged: le
};
Symbol.metadata ??= Symbol("metadata"), v.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var x = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ue) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && _(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = ne(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? ue;
	}
	static _$Ei() {
		if (this.hasOwnProperty(y("elementProperties"))) return;
		let e = ae(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(y("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(y("properties"))) {
			let e = this.properties, t = [...re(e), ...ie(e)];
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
			for (let e of n) t.unshift(g(e));
		} else e !== void 0 && t.push(g(e));
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
		return ee(e, this.constructor.elementStyles), e;
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
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? le)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
x.elementStyles = [], x.shadowRootOptions = { mode: "open" }, x[y("elementProperties")] = /* @__PURE__ */ new Map(), x[y("finalized")] = /* @__PURE__ */ new Map(), ce?.({ ReactiveElement: x }), (v.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var S = globalThis, C = (e) => e, w = S.trustedTypes, de = w ? w.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, T = "$lit$", E = `lit$${Math.random().toFixed(9).slice(2)}$`, D = "?" + E, fe = `<${D}>`, O = document, k = () => O.createComment(""), A = (e) => e === null || typeof e != "object" && typeof e != "function", j = Array.isArray, pe = (e) => j(e) || typeof e?.[Symbol.iterator] == "function", M = "[ 	\n\f\r]", N = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, me = /-->/g, he = />/g, P = RegExp(`>|${M}(?:([^\\s"'>=/]+)(${M}*=${M}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ge = /'/g, _e = /"/g, F = /^(?:script|style|textarea|title)$/i, I = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), L = Symbol.for("lit-noChange"), R = Symbol.for("lit-nothing"), ve = /* @__PURE__ */ new WeakMap(), z = O.createTreeWalker(O, 129);
function ye(e, t) {
	if (!j(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return de === void 0 ? t : de.createHTML(t);
}
var be = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = N;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === N ? c[1] === "!--" ? o = me : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = P) : (F.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = P) : o = he : o === P ? c[0] === ">" ? (o = i ?? N, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? P : c[3] === "\"" ? _e : ge) : o === _e || o === ge ? o = P : o === me || o === he ? o = N : (o = P, i = void 0);
		let d = o === P && e[t + 1].startsWith("/>") ? " " : "";
		a += o === N ? n + fe : l >= 0 ? (r.push(s), n.slice(0, l) + T + n.slice(l) + E + d) : n + E + (l === -2 ? t : d);
	}
	return [ye(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, B = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = be(t, n);
		if (this.el = e.createElement(l, r), z.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = z.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(T)) {
					let t = u[o++], n = i.getAttribute(e).split(E), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Se : r[1] === "?" ? Ce : r[1] === "@" ? we : U
					}), i.removeAttribute(e);
				} else e.startsWith(E) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (F.test(i.tagName)) {
					let e = i.textContent.split(E), t = e.length - 1;
					if (t > 0) {
						i.textContent = w ? w.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], k()), z.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], k());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === D) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(E, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += E.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = O.createElement("template");
		return n.innerHTML = e, n;
	}
};
function V(e, t, n = e, r) {
	if (t === L) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = A(t) ? void 0 : t._$litDirective$;
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? O).importNode(t, !0);
		z.currentNode = r;
		let i = z.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new H(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Te(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = z.nextNode(), a++);
		}
		return z.currentNode = O, r;
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
		this.type = 2, this._$AH = R, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = V(this, e, t), A(e) ? e === R || e == null || e === "" ? (this._$AH !== R && this._$AR(), this._$AH = R) : e !== this._$AH && e !== L && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? pe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== R && A(this._$AH) ? this._$AA.nextSibling.data = e : this.T(O.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = B.createElement(ye(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new xe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ve.get(e.strings);
		return t === void 0 && ve.set(e.strings, t = new B(e)), t;
	}
	k(t) {
		j(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(k()), this.O(k()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = C(e).nextSibling;
			C(e).remove(), e = t;
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
		this.type = 1, this._$AH = R, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = R;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = V(this, e, t, 0), a = !A(e) || e !== this._$AH && e !== L, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = V(this, r[n + o], t, o), s === L && (s = this._$AH[o]), a ||= !A(s) || s !== this._$AH[o], s === R ? e = R : e !== R && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === R ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Se = class extends U {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === R ? void 0 : e;
	}
}, Ce = class extends U {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== R);
	}
}, we = class extends U {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = V(this, e, t, 0) ?? R) === L) return;
		let n = this._$AH, r = e === R && n !== R || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== R && (n === R || r);
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
	M: T,
	P: E,
	A: D,
	C: 1,
	L: be,
	R: xe,
	D: pe,
	V,
	I: H,
	H: U,
	N: Ce,
	U: we,
	B: Se,
	F: Te
}, De = S.litHtmlPolyfillSupport;
De?.(B, H), (S.litHtmlVersions ??= []).push("3.3.3");
var Oe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new H(t.insertBefore(k(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, W = globalThis, G = class extends x {
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
		return L;
	}
};
G._$litElement$ = !0, G.finalized = !0, W.litElementHydrateSupport?.({ LitElement: G });
var ke = W.litElementPolyfillSupport;
ke?.({ LitElement: G }), (W.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/lit-html/directive.js
var Ae = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), je = class {
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
}, { I: Me } = Ee, Ne = {}, Pe = (e, t = Ne) => e._$AH = t, Fe = Ae(class extends je {
	constructor() {
		super(...arguments), this.key = R;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (Pe(e), this.key = t), n;
	}
}), Ie = "dash_bored_hide", Le = /\b(led|relay|screen|screensaver|in use|enabled|watching|mode|program(me)?|charge)\b/i, Re = /* @__PURE__ */ new Set([
	"light",
	"switch",
	"cover",
	"lock"
]), ze = /* @__PURE__ */ new Set([
	"garage",
	"gate",
	"door"
]);
function Be(e, t, n) {
	let r = e.slice(t.length), i = (e.toLowerCase().startsWith(t.toLowerCase()) && !/^[a-z0-9]/i.test(r) ? r.replace(/^[\s\-–—:,.]+/, "") : e).replace(n === "light" ? /\s+lights?$/i : n === "switch" ? /\s+switch$/i : /$^/, ""), a = !i || RegExp(`^${n}s?$`, "i").test(i) ? n : i;
	return a[0].toUpperCase() + a.slice(1);
}
function Ve(e, t) {
	let n = /* @__PURE__ */ new Map(), r = [], i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map(), o = t.weather, s = [], c = [], l = [], u = (e) => !!e?.labels?.includes(Ie);
	for (let c of Object.values(e.entities ?? {})) {
		let d = c.entity_id, f = e.states[d];
		if (!f || c.hidden || c.entity_category) continue;
		let p = d.split(".")[0];
		p === "scene" && r.push(d), p === "weather" && (!o || d === "weather.home") && !t.weather && (o = d), p === "sensor" && f.attributes.device_class === "power" && c.device_id && i.set(c.device_id, d);
		let m = e.areas?.[c.area_id ?? e.devices?.[c.device_id]?.area_id];
		if (u(c) || u(e.devices?.[c.device_id]) || u(m)) continue;
		if (Re.has(p)) {
			let e = f.attributes.friendly_name ?? c.name ?? d;
			m || s.push({
				id: d,
				name: e
			}), Le.test(e) && l.push({
				id: d,
				name: e,
				via: c.platform
			});
		}
		if (!m || p !== "climate" && !Re.has(p)) continue;
		if (!n.has(m.area_id)) {
			let t = e.floors?.[m.floor_id];
			n.set(m.area_id, {
				id: m.area_id,
				name: m.name,
				floor: t?.name,
				level: t ? t.level ?? 0 : Infinity,
				temp: m.temperature_entity_id ?? void 0,
				humidity: m.humidity_entity_id ?? void 0,
				devices: []
			});
		}
		let h = n.get(m.area_id);
		if (p === "climate") h.climate ??= d;
		else {
			let e = f.attributes.friendly_name ?? c.name ?? d, t = {
				id: d,
				kind: p,
				name: Be(e, m.name, p),
				full: e,
				guarded: p === "lock" || ze.has(f.attributes.device_class)
			};
			h.devices.push(t), p === "switch" && c.device_id && a.set(t, c.device_id);
		}
	}
	let d = /* @__PURE__ */ new Map();
	for (let e of a.values()) d.set(e, (d.get(e) ?? 0) + 1);
	for (let [e, t] of a) d.get(t) === 1 && (e.power = i.get(t));
	let f = [...n.values()].filter((e) => e.devices.length || e.temp).sort((e, t) => e.level - t.level || (e.floor ?? "").localeCompare(t.floor ?? "") || e.name.localeCompare(t.name));
	for (let e of f) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.devices) t.set(n.name, (t.get(n.name) ?? 0) + 1);
		for (let n of e.devices) t.get(n.name) !== 1 && (n.name = n.full, c.push({
			id: n.id,
			name: n.full
		}));
	}
	for (let e of f) e.devices.sort((e, t) => e.kind.localeCompare(t.kind) || e.name.localeCompare(t.name));
	let p = f.flatMap((e) => [
		e.temp,
		e.humidity,
		e.climate,
		...e.devices.flatMap((e) => [e.id, e.power])
	]), m = (e) => e.map((e) => ({
		id: e.id,
		name: e.name
	}));
	return {
		rooms: f,
		gaps: [
			{
				kind: "loose",
				items: s
			},
			{
				kind: "plumbing",
				items: l.sort((e, t) => (e.via ?? "").localeCompare(t.via ?? "") || e.name.localeCompare(t.name))
			},
			{
				kind: "clash",
				items: c
			},
			{
				kind: "floorless",
				items: f.some((e) => e.floor) ? m(f.filter((e) => !e.floor)) : []
			},
			{
				kind: "cold",
				items: m(f.filter((e) => !e.temp && !e.climate))
			}
		].filter((e) => e.items.length),
		scenes: r.sort(),
		weather: o,
		power: t.power,
		watched: [
			...p,
			...r,
			o,
			t.power
		].filter((e) => !!e)
	};
}
function He(e, t) {
	let n = (e) => {
		let n = e ? t.states[e] : void 0, r = Number(n?.state);
		return n && n.state !== "" && Number.isFinite(r) ? r : void 0;
	}, r = (e) => {
		let r = n(e);
		return r === void 0 ? void 0 : t.states[e].attributes.unit_of_measurement === "kW" ? r : r / 1e3;
	}, i = [], a = e.rooms.map((e) => {
		let a = e.climate ? t.states[e.climate] : void 0, o = a?.attributes.temperature, s = e.devices.map((n) => {
			let a = t.states[n.id], o = !a || a.state === "unavailable", s = !o && (n.kind === "lock" ? a.state === "locked" : n.kind === "cover" ? a.state !== "closed" : a.state === "on"), c = n.kind === "light" ? a?.attributes.brightness : n.kind === "cover" ? a?.attributes.current_position : void 0, l = typeof c == "number" ? n.kind === "light" ? Math.round(c / 255 * 100) : c : void 0, u = s ? r(n.power) : void 0;
			return u !== void 0 && u >= 1 && i.push({
				id: n.id,
				name: n.name,
				room: e.name,
				kw: u
			}), {
				id: n.id,
				name: n.name,
				kind: n.kind,
				on: s,
				level: l,
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
var Ue = 6e5, We = {
	critical: 100,
	error: 95,
	warning: 70,
	task: 40
}, Ge = [
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
	let t = Ge[e] ?? String(e);
	return {
		n: String(e),
		N: q(t),
		n_word: t,
		s: e === 1 ? "" : "s",
		v: e === 1 ? "s" : ""
	};
}
function Ke(e) {
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
function Y(e) {
	return typeof e.value == "number" || typeof e.value == "string" && e.value.trim() !== "" && Number.isFinite(Number(e.value)) ? `${e.value}${e.unit ? ` ${e.unit}` : ""}` : "";
}
function qe(e, t, n) {
	let r = [], i = (e) => r.push({
		variant: "",
		flavour: "",
		...e
	}), a = e.rooms.flatMap((e) => e.devices);
	for (let e of t) {
		let t = {
			name: e.name,
			area: (e.area ?? "house").toLowerCase(),
			message: e.message || `${q(e.level)}.`,
			reading: Y(e),
			since: K(e.began),
			escalated: e.escalated ? "yes" : ""
		}, r = Y(e) ? [Y(e), e.area ?? e.name] : [q(e.level), e.name];
		e.level === "nominal" ? n - e.at < 6e5 && i({
			kind: "recovered",
			id: e.entity_id + ".ok",
			rank: 45,
			vars: {
				...t,
				minutes: String(Math.max(1, Math.round((e.at - e.began) / 6e4)))
			},
			figure: r
		}) : i({
			kind: "alert",
			variant: e.level,
			flavour: e.flavour,
			id: e.entity_id,
			rank: We[e.level] ?? 70,
			vars: t,
			figure: r
		});
	}
	for (let e of a) e.kind === "lock" && !e.on && !e.away && i({
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
	let o = a.filter((e) => e.away);
	if (o.length) {
		let e = o.slice(0, 3).map((e) => `${e.room} ${e.name.toLowerCase()}`).join(", ");
		i({
			kind: "offline",
			id: "offline",
			rank: 65,
			figure: [String(o.length), "not answering"],
			vars: {
				...J(o.length),
				names: o.length > 3 ? `${e} and ${o.length - 3} more` : e,
				since: K(Math.min(...o.map((e) => e.since)))
			}
		});
	}
	for (let t of e.appliances) i({
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
	let s = a.filter((e) => e.kind === "light" && !e.away), c = s.filter((e) => e.on);
	if (s.length) {
		let e = c.length >= 7 && c.length * 2 >= s.length ? "ablaze" : c.length ? "lights" : "dark";
		i({
			kind: e,
			id: e,
			rank: {
				ablaze: 60,
				lights: 30,
				dark: 35
			}[e],
			vars: J(c.length),
			figure: [String(c.length), c.length === 1 ? "light on" : "lights on"],
			press: c.length ? {
				domain: "light",
				service: "turn_off",
				ids: c.map((e) => e.id)
			} : void 0
		});
	}
	for (let t of e.rooms) t.temp !== void 0 && t.target !== void 0 && t.temp < t.target - .8 && i({
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
	if (e.kw !== void 0 && i({
		kind: "power",
		id: "power",
		rank: 20,
		vars: { kw: e.kw.toFixed(2) },
		figure: [e.kw.toFixed(2), "kilowatts"]
	}), e.outside) {
		let { temp: t, humidity: n } = e.outside;
		i({
			kind: "weather",
			variant: t < 5 ? "freezing" : t < 12 ? "cold" : t > 24 ? "hot" : "mild",
			id: "weather",
			rank: 10,
			vars: { temp: t.toFixed(1) },
			figure: [t.toFixed(1) + "°", typeof n == "number" ? `${n}% humidity` : "outside"]
		});
	}
	return r.length || i({
		kind: "quiet",
		id: "quiet",
		rank: 1,
		vars: J(a.length),
		figure: [String(e.rooms.length), e.rooms.length === 1 ? "room" : "rooms"]
	}), r.sort((e, t) => t.rank - e.rank);
}
//#endregion
//#region src/dash-bored/styles.ts
var Je = h`
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
  .masthead h1 { margin: 0; font: 400 62px/1 "UnifrakturCook", "Old English Text MT", "Luminari", "Blackletter", fantasy; }
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
  [data-style="tabloid"] .figure b { font: 400 36px/1 var(--head); color: var(--mark); }
  [data-style="tabloid"] .act { background: var(--flash); color: #fff; border: 0; font-weight: 900; font-style: italic; padding: 7px 14px; }
  [data-style="tabloid"] .act:hover { background: var(--ink); }
  [data-style="tabloid"] .copy { column-rule: 0; font-size: 14px; }
  [data-style="tabloid"] .fact { border-bottom: 2px solid var(--flash); }
  [data-style="tabloid"] h5 { font: italic 900 14px/1 "Arial Black", sans-serif; text-transform: uppercase; text-align: left; color: var(--flash); }
  [data-style="tabloid"] h5::before, [data-style="tabloid"] h5::after { content: none; }
  [data-style="tabloid"] .board .rows { column-rule: 0; }
  [data-style="tabloid"] .fact:hover { background: var(--mark); color: #111; }
  [data-style="tabloid"] h3 { text-align: left; border: 0; background: var(--flash); color: #fff; padding: 5px 8px; letter-spacing: .02em; font: italic 900 14px/1 "Arial Black", sans-serif; }
  [data-style="tabloid"] .item h4 { font: 400 34px/.95 var(--head); text-transform: uppercase; }
  [data-style="tabloid"] .chip.on { background: var(--mark); color: #111; font-weight: 800; }
  [data-style="tabloid"] .ad { border: 3px solid var(--ink); } [data-style="tabloid"] .ad b { font: 400 24px/1 var(--head); letter-spacing: .02em; }
  [data-style="tabloid"] .ad:hover { background: var(--mark); color: #111; }

  /* ---------- narrow: one column, in reading order ---------- */
  @container (max-width: 900px) {
    .paper { padding: 10px 14px 20px; }
    .page { grid-template-columns: 1fr; } .page > * + * { border-left: 0; padding-left: 0; margin-top: 18px; } .solo > article { grid-column: auto; }
    .copy { columns: 1; } h2 { font-size: 34px; } .masthead h1 { font-size: 42px; }
    [data-style="tabloid"] h2 { font-size: 62px; } [data-style="tabloid"] .masthead h1 { font-size: 36px; }
    .figure, [data-style="tabloid"] .figure { width: 104px; } .figure b, [data-style="tabloid"] .figure b { font-size: 28px; }
  }
`, X = (e, t) => e.replace(/\{(\w+)\}/g, (e, n) => t[n] ?? ""), Ye = {
	esphome: "ESPHome. Add entity_category: config (or diagnostic) to each in its device's YAML",
	knx: "KNX. Add entity_category: config to each in the KNX YAML",
	"": "Give each the label Dash-Bored hide, or hide it in Home Assistant"
};
function Xe(e, t, n) {
	let r = e.stories[`${t.kind}.${t.variant}`] ?? e.stories[t.kind], i = r.flavours?.[t.flavour] ?? r.head, a = t.vars.escalated && r.worse ? " " + r.worse : "";
	return {
		kicker: r.kicker,
		head: X(i[n % i.length], t.vars),
		deck: X(r.deck, t.vars),
		body: r.body ? X(t.vars.reading === "" && r.plain ? r.plain : r.body, t.vars) + a : "",
		act: t.press && r.act ? r.act : ""
	};
}
function Z(e, t) {
	let n = t.name.toLowerCase(), r = /lamp|light/i.test(n) ? n : `${n} light`, i = /s$/i.test((t.kind === "light" ? r : n).split(" - ")[0]), a = t.away ? "away" : t.on ? t.level === void 0 && (t.kind === "light" || t.kind === "cover") ? `${t.kind}.plain` : `${t.kind}.on` : `${t.kind}.off`;
	return X(e.words[a], {
		name: n,
		lamp: r,
		level: String(t.level ?? ""),
		is: i ? "are" : "is",
		v: i ? "" : "s"
	}).replace(/^the (?=\S+['’]s )/, "");
}
var Ze = (e, t) => X(t.level === "nominal" ? e.wire.clear : e.wire.trouble, {
	name: t.name,
	message: t.message || t.level,
	level: t.level.toUpperCase()
}), Qe = {
	kicker: "Stop press",
	head: ["{name} gives cause for alarm"],
	deck: "{message}",
	body: "The reading stood at {reading} in the {area} as this edition went to press, and the trouble dates from {since}.",
	plain: "The trouble in the {area} dates from {since}.",
	worse: "Matters have worsened since our earlier report."
}, Q = {
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
}, $ = {
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
			"light.on": "the {lamp} burn{v} at {level} per cent",
			"light.plain": "the {lamp} {is} lit",
			"light.off": "the {lamp} {is} out",
			"light.many": "{n_word} lights are lit",
			"switch.many": "{n_word} switches are running",
			"cover.on": "the {name} stand{v} {level} per cent open",
			"cover.plain": "the {name} {is} open",
			"cover.off": "the {name} {is} closed",
			"lock.on": "the {name} {is} locked",
			"lock.off": "the {name} stand{v} unlocked",
			"switch.on": "the {name} {is} running",
			"switch.off": "the {name} {is} idle",
			away: "the {name} {is} not answering"
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
			alert: Qe,
			"alert.warning": {
				...Qe,
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
			"light.on": "{lamp} ON at {level}%",
			"light.plain": "{lamp} ON",
			"light.off": "{lamp} off",
			"light.many": "{n} lights ON",
			"switch.many": "{n} switches ON",
			"cover.on": "{name} {level}% open",
			"cover.plain": "{name} open",
			"cover.off": "{name} shut",
			"lock.on": "{name} locked",
			"lock.off": "{name} UNLOCKED!",
			"switch.on": "{name} ON",
			"switch.off": "{name} off",
			away: "{name} GONE QUIET"
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
			alert: Q,
			"alert.warning": {
				...Q,
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
}, $e = "dash-bored-gazette", et = "casa_mia_dash_bored/alerts", tt = "dash-bored-style", nt = 30, rt = 3, it = (e) => e.away || (e.kind === "lock" ? !e.on : e.on), at = class extends G {
	constructor(...e) {
		super(...e), this.narrow = !1, this._style = "broadsheet", this._alerts = [], this._fault = "", this._lost = 0, this._config = {}, this._late = [], this._turn = /* @__PURE__ */ new Map(), this._showing = /* @__PURE__ */ new Set(), this._primed = !1, this._timers = /* @__PURE__ */ new Set();
	}
	static {
		this.styles = Je;
	}
	static {
		this.properties = {
			narrow: { type: Boolean },
			_house: { state: !0 },
			_style: { state: !0 },
			_alerts: { state: !0 },
			_fault: { state: !0 },
			_lost: { state: !0 }
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
		if (this._lost = 0, this._listen(), !this._survey || !t || t.entities !== e.entities || t.areas !== e.areas || t.devices !== e.devices || t.floors !== e.floors) this._survey = Ve(e, this._config);
		else if (t.states === e.states || !this._survey.watched.some((n) => t.states[n] !== e.states[n])) return;
		let n = new Map(this._house?.rooms.flatMap((e) => e.devices).map((e) => [e.id, e]));
		this._house = He(this._survey, e);
		for (let e of this._house.rooms.flatMap((e) => e.devices)) {
			let t = n.get(e.id);
			t && (t.on !== e.on || t.level !== e.level || t.away !== e.away) && this._note({
				time: Date.now(),
				device: e
			});
		}
	}
	connectedCallback() {
		super.connectedCallback(), this._choose(), this._hass?.connected !== !1 && this._listen();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._feed?.then((e) => e()).catch(() => void 0), this._feed = void 0, this._primed = !1;
		for (let e of this._timers) clearTimeout(e);
		this._timers.clear();
	}
	_choose() {
		let e = this._config.style;
		try {
			e ??= localStorage.getItem(tt) ?? void 0;
		} catch {}
		e && e in $ && (this._style = e);
	}
	_dress(e) {
		this._style = e;
		try {
			localStorage.setItem(tt, e);
		} catch {}
	}
	_listen() {
		let e = this._hass?.connection;
		if (this._feed || !e || !this.isConnected) return;
		let t = e.subscribeMessage((e) => this._take(e), { type: et });
		this._feed = t, t.catch((e) => {
			this._feed = void 0, console.error("Dash-Bored: the alerts feed failed", e), this._fault = `Sensor Watch's alerts are not reaching this page (${e?.message ?? e}).`;
		});
	}
	_take(e) {
		let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
		for (let n of e) {
			let e = {
				...n,
				at: n.at * 1e3,
				began: n.began * 1e3,
				flavour: Ke(this._hass?.states[n.entity_id]?.attributes.device_class)
			};
			if (t.set(e.entity_id, e), this._primed) {
				if (this._note({
					time: e.at,
					alert: e
				}), e.level !== "nominal") this.scrollIntoView({
					block: "start",
					behavior: "smooth"
				});
				else {
					let e = setTimeout(() => {
						this._timers.delete(e), this.requestUpdate();
					}, Ue + 1e3);
					this._timers.add(e);
				}
			}
		}
		this._primed = !0, this._alerts = [...t.values()];
	}
	_note(e) {
		this._late = [e, ...this._late].slice(0, 8);
	}
	_call(e, t) {
		this._hass.callService(e.domain, e.service, { entity_id: e.ids }).then(() => this._fault = "", (n) => {
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
	_key(e) {
		(e.key === "Enter" || e.key === " ") && (e.preventDefault(), e.currentTarget.click());
	}
	render() {
		let e = this._hass, t = this._house, n = $[this._style];
		if (!e || !t) return I`<div class="paper" data-style=${this._style}><p class="wait">Waiting for Home Assistant.</p></div>`;
		let a = qe(t, this._alerts, Date.now());
		for (let e of a) this._showing.has(e.id) || this._turn.set(e.id, (this._turn.get(e.id) ?? -1) + 1);
		this._showing = new Set(a.map((e) => e.id));
		let o = a.map((e) => ({
			s: e,
			...Xe(n, e, this._turn.get(e.id))
		})), [s, ...c] = o, l = o.find((e) => e.s.kind === "alert"), u = (e) => e.act ? I`<button class="act" @click=${() => this._call(e.s.press, e.head)}>${e.act}</button>` : R, d = (e, t) => I`<span class="fact ${e.away ? "away" : ""}" role="button" tabindex="0" @click=${() => this._press(e)} @keydown=${this._key}>${t ? q(Z(n, e)) : Z(n, e)}</span>`, f = t.rooms.filter((e) => e.temp !== void 0), p = t.rooms.filter((e) => e.devices.length), m = p.reduce((e, t) => e + t.devices.length, 0) > nt, h = m ? p.map((e) => ({
			...e,
			devices: e.devices.filter(it)
		})).filter((e) => e.devices.length) : p, ee = p.some((e) => e.floor), g = (e, t, r = (e) => e) => {
			let i = /* @__PURE__ */ new Map();
			for (let t of e) i.set(t.floor ?? "", [...i.get(t.floor ?? "") ?? [], t]);
			return [...i].map(([e, i]) => I`${ee ? I`<h5>${e || n.titles.elsewhere}</h5>` : R}${r(i.map(t))}`);
		}, te = (e) => {
			let t = (t) => {
				let n = e.devices.filter((e) => m && e.kind === t && e.on && !e.away);
				return n.length > rt ? n : [];
			}, r = t("light"), i = t("switch"), a = e.devices.filter((e) => !r.includes(e) && !i.includes(e)).map((e, t) => d(e, !t && !r.length && !i.length));
			return i.length && a.unshift(r.length ? X(n.words["switch.many"], J(i.length)) : q(X(n.words["switch.many"], J(i.length)))), r.length && a.unshift(I`<span class="fact" role="button" tabindex="0" @click=${() => this._call({
				domain: "light",
				service: "turn_off",
				ids: r.map((e) => e.id)
			}, e.name)} @keydown=${this._key}>${q(X(n.words["light.many"], J(r.length)))}</span>`), I`<p><b>${e.name}.</b> ${a.map((e, t) => I`${t ? n.join : ""}${e}`)}${n.end}</p>`;
		}, _ = I`<h3>${n.titles.board}</h3>
      ${g(p, (e) => I`<div class="row"><span>${e.name}</span>${e.devices.map((e) => I`<button class="chip ${e.on ? "on" : ""} ${e.away ? "away" : ""}" aria-pressed=${e.on} @click=${() => this._press(e)}>${e.name}</button>`)}</div>`, (e) => I`<div class="rows">${e}</div>`)}`;
		return I`<div class="paper" data-style=${this._style}>
      ${this._lost ? I`<div class="fault" role="alert">Not connected to Home Assistant since ${K(this._lost)}. What follows is how things stood then.</div>` : R}
      ${this._fault ? I`<div class="fault" role="alert">${this._fault}</div>` : R}
      ${l ? Fe(l.s.id + l.s.variant, I`<div class="breaking" role="status"><b>${n.flash}</b>${l.head}${/[!?]$/.test(l.head) ? "" : ":"} ${l.s.vars.message}</div>`) : R}
      <header class="masthead"><h1>${n.name}</h1><p>${n.strap}</p></header>
      <div class="dateline">
        ${this.hasAttribute("panel") ? I`<ha-menu-button .hass=${e} .narrow=${this.narrow}></ha-menu-button>` : R}
        <span>${(/* @__PURE__ */ new Date()).toLocaleDateString(e.locale?.language ?? "en-GB", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric"
		})}</span>
        ${this._config.style ? R : I`<span class="styles">${Object.entries($).map(([e, t]) => I`<button aria-pressed=${e === this._style} @click=${() => this._dress(e)}>${t.label}</button>`)}</span>`}
        <span>${n.price} · ${K(Date.now())}</span>
      </div>
      <main class="page ${c.length ? "" : "solo"}">
        <article>
          <div class="figure"><b>${s.s.figure[0]}</b><span>${s.s.figure[1]}</span></div>
          <p class="kicker">${s.kicker}</p>
          ${Fe(s.head, I`<h2>${s.head}</h2>`)}
          <p class="deck">${s.deck}</p>
          ${u(s)}
          <div class="copy">
            ${s.body ? I`<p>${s.body}</p>` : R}
            ${g(h, te)}
            ${p.length > h.length ? I`<p>${X(n.rest, J(p.length - h.length))}</p>` : R}
            ${p.length ? R : I`<p>No areas with lights, switches, covers or locks were found. Give your devices areas in Home Assistant's settings and this page fills itself in.</p>`}
          </div>
        </article>
        ${c.length ? I`<section>
              <h3>${n.titles.more}</h3>
              ${c.slice(0, 3).map((e) => I`<div class="item"><p class="kicker">${e.kicker}</p><h4>${e.head}</h4><p>${e.deck}</p>${u(e)}</div>`)}
              ${c.length > 3 ? I`<h3>${n.titles.briefs}</h3><ul>${c.slice(3).map((e) => I`<li><b>${e.head}.</b> ${e.deck}</li>`)}</ul>` : R}
            </section>` : R}
        <aside>
          <h3>${n.titles.late}</h3>
          <ol>${this._late.length ? this._late.map((e) => I`<li><time>${K(e.time)}</time>${e.alert ? Ze(n, e.alert) : `${e.device.room}: ${Z(n, e.device)}`}</li>`) : I`<li>${n.nothing}</li>`}</ol>
          ${f.length ? I`<h3>${n.titles.temps}</h3><table>${f.map((e) => I`<tr><td>${e.name}</td><td>${e.temp.toFixed(1)}° ${e.target === void 0 ? "" : e.temp < e.target - .5 ? "▼" : e.temp > e.target + .5 ? "▲" : "="}</td></tr>`)}</table>` : R}
          ${m ? R : _}
          ${t.gaps.length ? I`<h3>${n.titles.gaps}</h3>
                ${t.gaps.map((e) => I`<details><summary>${X(n.gaps[e.kind], J(e.items.length))}</summary>
                  <ul>${e.items.map((t, n) => I`${e.kind === "plumbing" && t.via !== e.items[n - 1]?.via ? I`<li class="via">${Ye[t.via ?? ""] ?? `${t.via}. ${Ye[""]}`}:</li>` : R}<li><button class="mend" @click=${() => e.kind === "floorless" || e.kind === "cold" ? i(`/config/areas/area/${t.id}`) : r(this, "hass-more-info", { entityId: t.id })}>${t.name}</button></li>`)}</ul></details>`)}
                <p class="mend">${n.mend}</p>` : R}
          ${t.scenes.length ? I`<h3>${n.titles.notices}</h3>${t.scenes.slice(0, 8).map((e, t) => I`<button class="ad" @click=${() => this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.name)}><b>${e.name}</b>${n.notices[t % n.notices.length]}</button>`)}` : R}
        </aside>
        ${m ? I`<section class="board">${_}</section>` : R}
      </main>
    </div>`;
	}
}, ot = new URL(import.meta.url).searchParams.get("v") || "dev";
a($e, at), o($e, "Dash-Bored Gazette", "Your house as a newspaper: what matters most is the headline, and every underlined fact is a switch. Best in a panel view."), t("Dash-Bored", "casa_mia_dash_bored/cards", ot);
//#endregion
