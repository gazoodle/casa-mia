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
function s(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function c(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !0,
		documentationURL: "https://github.com/gazoodle/casa-mia"
	});
}
var l = n.main, u = n.panel;
({
	...l,
	...u
});
var d = (e) => e.parentElement ?? (e.getRootNode().host || null);
function ee(e) {
	for (let t = e; t; t = d(t)) if (t.tagName === "HUI-CARD-PICKER") return !0;
	return !1;
}
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var f = globalThis, p = f.ShadowRoot && (f.ShadyCSS === void 0 || f.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, m = Symbol(), h = /* @__PURE__ */ new WeakMap(), g = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== m) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (p && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = h.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && h.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, te = (e) => new g(typeof e == "string" ? e : e + "", void 0, m), _ = (e, ...t) => new g(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, m), ne = (e, t) => {
	if (p) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = f.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, v = p ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return te(t);
})(e) : e, { is: re, defineProperty: ie, getOwnPropertyDescriptor: ae, getOwnPropertyNames: oe, getOwnPropertySymbols: se, getPrototypeOf: ce } = Object, y = globalThis, le = y.trustedTypes, ue = le ? le.emptyScript : "", de = y.reactiveElementPolyfillSupport, b = (e, t) => e, x = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ue : null;
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
}, S = (e, t) => !re(e, t), C = {
	attribute: !0,
	type: String,
	converter: x,
	reflect: !1,
	useDefault: !1,
	hasChanged: S
};
Symbol.metadata ??= Symbol("metadata"), y.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var w = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = C) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && ie(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = ae(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? C;
	}
	static _$Ei() {
		if (this.hasOwnProperty(b("elementProperties"))) return;
		let e = ce(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(b("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(b("properties"))) {
			let e = this.properties, t = [...oe(e), ...se(e)];
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
			for (let e of n) t.unshift(v(e));
		} else e !== void 0 && t.push(v(e));
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
		return ne(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? x : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? x : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? S)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
w.elementStyles = [], w.shadowRootOptions = { mode: "open" }, w[b("elementProperties")] = /* @__PURE__ */ new Map(), w[b("finalized")] = /* @__PURE__ */ new Map(), de?.({ ReactiveElement: w }), (y.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var T = globalThis, E = (e) => e, D = T.trustedTypes, O = D ? D.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, k = "$lit$", A = `lit$${Math.random().toFixed(9).slice(2)}$`, j = "?" + A, fe = `<${j}>`, M = document, N = () => M.createComment(""), P = (e) => e === null || typeof e != "object" && typeof e != "function", F = Array.isArray, pe = (e) => F(e) || typeof e?.[Symbol.iterator] == "function", I = "[ 	\n\f\r]", L = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, R = /-->/g, z = />/g, B = RegExp(`>|${I}(?:([^\\s"'>=/]+)(${I}*=${I}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), me = /'/g, he = /"/g, ge = /^(?:script|style|textarea|title)$/i, V = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), H = Symbol.for("lit-noChange"), U = Symbol.for("lit-nothing"), _e = /* @__PURE__ */ new WeakMap(), W = M.createTreeWalker(M, 129);
function ve(e, t) {
	if (!F(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return O === void 0 ? t : O.createHTML(t);
}
var ye = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = L;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === L ? c[1] === "!--" ? o = R : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = B) : (ge.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = B) : o = z : o === B ? c[0] === ">" ? (o = i ?? L, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? B : c[3] === "\"" ? he : me) : o === he || o === me ? o = B : o === R || o === z ? o = L : (o = B, i = void 0);
		let d = o === B && e[t + 1].startsWith("/>") ? " " : "";
		a += o === L ? n + fe : l >= 0 ? (r.push(s), n.slice(0, l) + k + n.slice(l) + A + d) : n + A + (l === -2 ? t : d);
	}
	return [ve(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, G = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ye(t, n);
		if (this.el = e.createElement(l, r), W.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = W.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(k)) {
					let t = u[o++], n = i.getAttribute(e).split(A), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? xe : r[1] === "?" ? Se : r[1] === "@" ? Ce : J
					}), i.removeAttribute(e);
				} else e.startsWith(A) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ge.test(i.tagName)) {
					let e = i.textContent.split(A), t = e.length - 1;
					if (t > 0) {
						i.textContent = D ? D.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], N()), W.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], N());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === j) c.push({
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
		let n = M.createElement("template");
		return n.innerHTML = e, n;
	}
};
function K(e, t, n = e, r) {
	if (t === H) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = P(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = K(e, i._$AS(e, t.values), i, r)), t;
}
var be = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? M).importNode(t, !0);
		W.currentNode = r;
		let i = W.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new q(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new we(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = W.nextNode(), a++);
		}
		return W.currentNode = M, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, q = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = U, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = K(this, e, t), P(e) ? e === U || e == null || e === "" ? (this._$AH !== U && this._$AR(), this._$AH = U) : e !== this._$AH && e !== H && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? pe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== U && P(this._$AH) ? this._$AA.nextSibling.data = e : this.T(M.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = G.createElement(ve(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new be(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = _e.get(e.strings);
		return t === void 0 && _e.set(e.strings, t = new G(e)), t;
	}
	k(t) {
		F(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(N()), this.O(N()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = E(e).nextSibling;
			E(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, J = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = U, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = U;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = K(this, e, t, 0), a = !P(e) || e !== this._$AH && e !== H, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = K(this, r[n + o], t, o), s === H && (s = this._$AH[o]), a ||= !P(s) || s !== this._$AH[o], s === U ? e = U : e !== U && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === U ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, xe = class extends J {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === U ? void 0 : e;
	}
}, Se = class extends J {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== U);
	}
}, Ce = class extends J {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = K(this, e, t, 0) ?? U) === H) return;
		let n = this._$AH, r = e === U && n !== U || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== U && (n === U || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, we = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		K(this, e);
	}
}, Te = T.litHtmlPolyfillSupport;
Te?.(G, q), (T.litHtmlVersions ??= []).push("3.3.3");
var Ee = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new q(t.insertBefore(N(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Y = globalThis, X = class extends w {
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
		return H;
	}
};
X._$litElement$ = !0, X.finalized = !0, Y.litElementHydrateSupport?.({ LitElement: X });
var De = Y.litElementPolyfillSupport;
De?.({ LitElement: X }), (Y.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/love-or-loathe/common.ts
var Z = "casa_mia_love_or_loathe", Oe = new URL(import.meta.url).searchParams.get("v") || "dev", ke = `${Z}/cards`, Q = "casa-mia-love-or-loathe";
function Ae(e, t, n, r) {
	let i = e.subscribeMessage((e) => r(e), {
		type: `${Z}/song`,
		entity_id: t,
		...n ? { person: n } : {}
	});
	return i.catch((e) => r(void 0, e?.code === "unknown_command" ? "Love it or Loathe it isn't set up in Home Assistant" : e?.message ?? String(e))), () => void i.then((e) => e()).catch(() => void 0);
}
function je(e, t, n, r) {
	return e.callService(Z, "rate", {
		entity_id: t,
		feeling: n,
		...r ? { person: r } : {}
	});
}
function Me(e, t, n) {
	if (!n) return "No connection to Home Assistant";
	if (!e) return t ?? "Waiting for Home Assistant";
	if (!e.watched) return "Love it or Loathe it doesn't watch this player";
	if (e.refused) return e.refused;
	if (!e.playing) return "Nothing is playing";
	if (!e.title) return "The player reports no title, so there is nothing to rate";
}
//#endregion
//#region src/love-or-loathe/thumbs.ts
var $ = "casa-mia-thumbs", Ne = class extends X {
	constructor(...e) {
		super(...e), this.connected = !0, this.quiet = !1, this._busy = !1;
	}
	static {
		this.properties = {
			entityId: {},
			person: {},
			connected: { type: Boolean },
			quiet: { type: Boolean },
			_song: { state: !0 },
			_why: { state: !0 },
			_busy: { state: !0 }
		};
	}
	connectedCallback() {
		super.connectedCallback(), this.requestUpdate();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unfollow();
	}
	updated() {
		let e = this.entityId ? `${this.entityId} ${this.person ?? ""}` : void 0;
		this.isConnected && this.hass?.connection && e !== this._for && this._follow(e);
	}
	_follow(e) {
		this._unfollow(), this._for = e, e && (this._off = Ae(this.hass.connection, this.entityId, this.person, (e, t) => {
			[this._song, this._why] = [e, t], r(this, "cm-song", {
				song: e,
				why: t
			});
		}));
	}
	_unfollow() {
		this._off?.(), this._off = this._for = this._song = this._why = void 0;
	}
	async _rate(e) {
		if (this.hass && this.entityId) {
			this._busy = !0;
			try {
				await je(this.hass, this.entityId, this._song?.feeling === e ? "clear" : e, this.person);
			} catch (e) {
				r(this, "hass-notification", {
					message: e?.message ?? String(e),
					duration: 8e3
				});
			} finally {
				this._busy = !1;
			}
		}
	}
	render() {
		if (this.quiet && (!this._song?.watched || this._song.refused)) return U;
		let e = Me(this._song, this._why, this.connected), t = (t, n, r, i) => {
			let a = !e && this._song?.feeling === t, o = e ?? (a ? `${i}: tap to take that back` : r);
			return V`<button class=${t} aria-pressed=${a} title=${o} aria-label=${o} ?disabled=${!!e || this._busy} @click=${() => this._rate(t)}>
        <ha-icon icon=${a ? n : `${n}-outline`}></ha-icon>
      </button>`;
		};
		return V`${t("love", "mdi:thumb-up", "Love it", "Loved")}${t("loathe", "mdi:thumb-down", "Loathe it", "Loathed")}`;
	}
	static {
		this.styles = _`
    :host {
      display: inline-flex;
      gap: 4px;
    }
    button {
      display: grid;
      place-items: center;
      width: 44px; /* a finger's width, on a wall tablet too */
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--secondary-text-color);
      cursor: pointer;
    }
    button:not(:disabled):hover,
    button:focus-visible {
      outline: none;
      background: var(--secondary-background-color);
    }
    button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .love[aria-pressed="true"] {
      color: var(--success-color, #43a047);
    }
    .loathe[aria-pressed="true"] {
      color: var(--error-color, #db4437);
    }
  `;
	}
}, Pe = class extends X {
	static {
		this.properties = {
			_config: { state: !0 },
			_song: { state: !0 },
			_why: { state: !0 }
		};
	}
	static getStubConfig(e) {
		return { entity: Object.keys(e.states).find((e) => e.startsWith("media_player.")) ?? "" };
	}
	static getConfigElement() {
		return document.createElement(`${Q}-editor`);
	}
	setConfig(e) {
		this._config = { ...e };
	}
	set hass(e) {
		let t = this._config?.entity, n = this._hass;
		this._hass = e, (!n || !t || n.states[t] !== e.states[t] || n.connected !== e.connected) && this.requestUpdate();
	}
	getCardSize() {
		return 1;
	}
	getGridOptions() {
		return this._config?.compact ? {
			columns: 3,
			rows: 1,
			min_columns: 3
		} : {
			columns: 12,
			rows: 1,
			min_columns: 6
		};
	}
	render() {
		let e = this._config, t = this._hass;
		if (!e || !t) return U;
		let n = e.entity;
		if (!n) return V`<ha-card><div class="row"><div class="words"><span class="name">Love it or Loathe it</span><span class="song">${ee(this) ? "Thumbs for the song a player is playing" : "Choose a media player in the card's options"}</span></div></div></ha-card>`;
		let r = t.states[n], i = t.connected !== !1, a = Me(this._song, this._why, i), o = r?.attributes.media_title, s = r?.attributes.media_artist, c = a && a !== "Nothing is playing" ? a : o && r?.state === "playing" ? `${o}${s ? ` by ${s}` : ""}` : "Nothing is playing";
		return V`<ha-card>
      <div class="row ${e.compact ? "compact" : ""}">
        ${e.compact ? U : V`<div class="words">
              <span class="name">${e.name || r?.attributes.friendly_name || n}</span>
              <span class="song" title=${c}>${c}</span>
            </div>`}
        <casa-mia-thumbs
          .hass=${t}
          .entityId=${n}
          .person=${e.person || void 0}
          .connected=${i}
          @cm-song=${(e) => [this._song, this._why] = [e.detail.song, e.detail.why]}
        ></casa-mia-thumbs>
      </div>
    </ha-card>`;
	}
	static {
		this.styles = _`
    ha-card {
      height: 100%;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 100%;
      box-sizing: border-box;
      padding: 6px 8px 6px 16px;
    }
    .row.compact {
      justify-content: center;
      padding: 6px;
    }
    .words {
      display: grid;
      flex: 1;
      min-width: 0;
    }
    .name {
      font-weight: 500;
    }
    .name,
    .song {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .song {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
  `;
	}
};
//#endregion
//#region src/love-or-loathe/dialog.ts
function Fe(e) {
	let t = e.shadowRoot, n = t?.querySelector($), r = t?.querySelector("[slot=\"headerTitle\"]"), i = e._entityId;
	if (!t || !e.hass || !i?.startsWith("media_player.") || e._currView !== "info" || !r) {
		t && i && !r && a("the entity dialog's header changed; no thumbs"), n?.remove();
		return;
	}
	n || (n = document.createElement($), n.slot = "headerActionItems", n.quiet = !0, r.after(n)), n.hass = e.hass, n.connected = e.hass.connected !== !1, n.entityId = i;
}
customElements.whenDefined("ha-more-info-dialog").then(() => {
	let e = customElements.get("ha-more-info-dialog").prototype, t = e.updated;
	if (typeof t != "function") {
		a("the entity dialog changed; no thumbs");
		return;
	}
	e.updated = function(...e) {
		t.apply(this, e), Fe(this);
	};
});
//#endregion
//#region src/love-or-loathe/editor.ts
var Ie = [
	{
		name: "entity",
		required: !0,
		selector: { entity: { domain: "media_player" } }
	},
	{
		name: "person",
		selector: { entity: { domain: "person" } }
	},
	{
		name: "name",
		selector: { text: {} }
	},
	{
		name: "compact",
		selector: { boolean: {} }
	}
], Le = {
	entity: "Media player",
	person: "Whose song it is",
	name: "Name",
	compact: "Only the thumbs"
}, Re = {
	entity: "One that Love it or Loathe it watches.",
	person: "Left empty: whoever is signed in, which suits a dashboard each person opens as themselves. Name a person for a shared screen such as a wall tablet, and give each person a card.",
	name: "Instead of the player's own.",
	compact: "No name and no song: for beside a media card that already shows them."
}, ze = class extends X {
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
		super.connectedCallback(), o().then(() => this._ready = !0);
	}
	render() {
		return !this.hass || !this._config || !this._ready ? U : V`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${Ie}
      .computeLabel=${(e) => Le[e.name] ?? e.name}
      .computeHelper=${(e) => Re[e.name]}
      @value-changed=${(e) => {
			e.stopPropagation();
			let t = Object.fromEntries(Object.entries(e.detail.value).filter(([, e]) => e != null && e !== "" && e !== !1));
			this._config = t, r(this, "config-changed", { config: t });
		}}
    ></ha-form>`;
	}
};
s($, Ne), s(Q, Pe), s(`${Q}-editor`, ze), c(Q, "Casa Mia Love it or Loathe it", "A thumb up and a thumb down for the song a media player is playing, for whoever is signed in."), t("Love it or Loathe it", ke, Oe);
//#endregion
