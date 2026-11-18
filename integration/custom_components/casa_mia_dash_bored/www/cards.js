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
var m = 100;
function h(e) {
	let t = e.getBoundingClientRect().top + window.scrollY, n = window.visualViewport?.height ?? window.innerHeight;
	return Math.max(m, Math.floor(n - t));
}
function g(e) {
	return window.addEventListener("resize", e), window.visualViewport?.addEventListener("resize", e), () => {
		window.removeEventListener("resize", e), window.visualViewport?.removeEventListener("resize", e);
	};
}
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var _ = globalThis, v = _.ShadowRoot && (_.ShadyCSS === void 0 || _.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, y = Symbol(), b = /* @__PURE__ */ new WeakMap(), x = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== y) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (v && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = b.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && b.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, S = (e) => new x(typeof e == "string" ? e : e + "", void 0, y), C = (e, ...t) => new x(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, y), w = (e, t) => {
	if (v) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = _.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, T = v ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return S(t);
})(e) : e, { is: E, defineProperty: ee, getOwnPropertyDescriptor: te, getOwnPropertyNames: ne, getOwnPropertySymbols: D, getPrototypeOf: O } = Object, re = globalThis, k = re.trustedTypes, A = k ? k.emptyScript : "", ie = re.reactiveElementPolyfillSupport, ae = (e, t) => e, oe = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? A : null;
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
}, se = (e, t) => !E(e, t), ce = {
	attribute: !0,
	type: String,
	converter: oe,
	reflect: !1,
	useDefault: !1,
	hasChanged: se
};
Symbol.metadata ??= Symbol("metadata"), re.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var le = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ce) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && ee(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = te(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? ce;
	}
	static _$Ei() {
		if (this.hasOwnProperty(ae("elementProperties"))) return;
		let e = O(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(ae("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(ae("properties"))) {
			let e = this.properties, t = [...ne(e), ...D(e)];
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
			for (let e of n) t.unshift(T(e));
		} else e !== void 0 && t.push(T(e));
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
		return w(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? oe : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? oe : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? se)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
le.elementStyles = [], le.shadowRootOptions = { mode: "open" }, le[ae("elementProperties")] = /* @__PURE__ */ new Map(), le[ae("finalized")] = /* @__PURE__ */ new Map(), ie?.({ ReactiveElement: le }), (re.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ue = globalThis, de = (e) => e, fe = ue.trustedTypes, pe = fe ? fe.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, me = "$lit$", he = `lit$${Math.random().toFixed(9).slice(2)}$`, ge = "?" + he, _e = `<${ge}>`, ve = document, ye = () => ve.createComment(""), be = (e) => e === null || typeof e != "object" && typeof e != "function", xe = Array.isArray, Se = (e) => xe(e) || typeof e?.[Symbol.iterator] == "function", Ce = "[ 	\n\f\r]", we = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Te = /-->/g, Ee = />/g, De = RegExp(`>|${Ce}(?:([^\\s"'>=/]+)(${Ce}*=${Ce}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Oe = /'/g, ke = /"/g, Ae = /^(?:script|style|textarea|title)$/i, je = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), j = je(1), M = je(2), Me = Symbol.for("lit-noChange"), N = Symbol.for("lit-nothing"), Ne = /* @__PURE__ */ new WeakMap(), Pe = ve.createTreeWalker(ve, 129);
function Fe(e, t) {
	if (!xe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return pe === void 0 ? t : pe.createHTML(t);
}
var Ie = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = we;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === we ? c[1] === "!--" ? o = Te : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = De) : (Ae.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = De) : o = Ee : o === De ? c[0] === ">" ? (o = i ?? we, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? De : c[3] === "\"" ? ke : Oe) : o === ke || o === Oe ? o = De : o === Te || o === Ee ? o = we : (o = De, i = void 0);
		let d = o === De && e[t + 1].startsWith("/>") ? " " : "";
		a += o === we ? n + _e : l >= 0 ? (r.push(s), n.slice(0, l) + me + n.slice(l) + he + d) : n + he + (l === -2 ? t : d);
	}
	return [Fe(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Le = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Ie(t, n);
		if (this.el = e.createElement(l, r), Pe.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = Pe.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(me)) {
					let t = u[o++], n = i.getAttribute(e).split(he), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? He : r[1] === "?" ? Ue : r[1] === "@" ? We : Ve
					}), i.removeAttribute(e);
				} else e.startsWith(he) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Ae.test(i.tagName)) {
					let e = i.textContent.split(he), t = e.length - 1;
					if (t > 0) {
						i.textContent = fe ? fe.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], ye()), Pe.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], ye());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === ge) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(he, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += he.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = ve.createElement("template");
		return n.innerHTML = e, n;
	}
};
function Re(e, t, n = e, r) {
	if (t === Me) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = be(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = Re(e, i._$AS(e, t.values), i, r)), t;
}
var ze = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? ve).importNode(t, !0);
		Pe.currentNode = r;
		let i = Pe.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Be(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ge(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = Pe.nextNode(), a++);
		}
		return Pe.currentNode = ve, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Be = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = N, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = Re(this, e, t), be(e) ? e === N || e == null || e === "" ? (this._$AH !== N && this._$AR(), this._$AH = N) : e !== this._$AH && e !== Me && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? Se(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== N && be(this._$AH) ? this._$AA.nextSibling.data = e : this.T(ve.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Le.createElement(Fe(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new ze(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Ne.get(e.strings);
		return t === void 0 && Ne.set(e.strings, t = new Le(e)), t;
	}
	k(t) {
		xe(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(ye()), this.O(ye()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = de(e).nextSibling;
			de(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Ve = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = N, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = N;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = Re(this, e, t, 0), a = !be(e) || e !== this._$AH && e !== Me, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = Re(this, r[n + o], t, o), s === Me && (s = this._$AH[o]), a ||= !be(s) || s !== this._$AH[o], s === N ? e = N : e !== N && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === N ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, He = class extends Ve {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === N ? void 0 : e;
	}
}, Ue = class extends Ve {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== N);
	}
}, We = class extends Ve {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = Re(this, e, t, 0) ?? N) === Me) return;
		let n = this._$AH, r = e === N && n !== N || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== N && (n === N || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ge = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		Re(this, e);
	}
}, Ke = {
	M: me,
	P: he,
	A: ge,
	C: 1,
	L: Ie,
	R: ze,
	D: Se,
	V: Re,
	I: Be,
	H: Ve,
	N: Ue,
	U: We,
	B: He,
	F: Ge
}, qe = ue.litHtmlPolyfillSupport;
qe?.(Le, Be), (ue.litHtmlVersions ??= []).push("3.3.3");
var Je = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Be(t.insertBefore(ye(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Ye = globalThis, Xe = class extends le {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Je(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return Me;
	}
};
Xe._$litElement$ = !0, Xe.finalized = !0, Ye.litElementHydrateSupport?.({ LitElement: Xe });
var Ze = Ye.litElementPolyfillSupport;
Ze?.({ LitElement: Xe }), (Ye.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/dash-bored/aurora/season-styles.ts
var Qe = C`
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
`, $e = "linear(0, .009, .035 2.1%, .141 4.4%, .723 12.9%, .938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, .991, .977 51%, .974 53.8%, .975 57.1%, .997 69.8%, 1.003 76.9%, 1.004 83.8%, 1)", et = C`
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
    .aurora { --spring: ${S($e)}; }
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
  .room::after, .set::after, .lone::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: var(--lit); transition: opacity .8s;
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
  ${Qe}
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

  /* ---------- one room alone (a room's card, room.ts) ---------- */
  /* The room's sheet on the card itself, as tall as what is in it. Its faders are shorter
     than a sheet's, since the card stands among a page's other cards. */
  .alone { padding: 14px; display: grid; gap: 12px; }
  .lone { padding: 22px; --lit: 0; --hue: 60; }
  .lone header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 18px; }
  .lone .scenes { padding: 0 0 18px; overflow: visible; }
  .lone .controls { --tall: 190px; }
  .narrow .lone { padding: 16px; }

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
`, P = "#2b2f3a", tt = (e) => Array.from({ length: e }, (e, t) => t), nt = (e, t, n) => M`<g transform="translate(${e} ${t})">
  ${tt(10).map((e) => M`<ellipse rx=${n * .28} ry=${n * .6} cy=${-n * .62} fill="#fff" stroke="#d9dfe8" stroke-width=".6" transform="rotate(${e * 36})"/>`)}
  <circle r=${n * .34} fill="#f5c542"/></g>`, rt = (e, t, n, r, i) => M`<g transform="translate(${e} ${t})">
  <ellipse rx=${n} ry=${n * 1.3} fill=${r}/><path d="M${-n * .96} ${-n * .2}q${n * .48} ${n * .5} ${n * .96} 0t${n * .96} 0" fill="none" stroke=${i} stroke-width=${n * .28}/></g>`, it = (e, t, n, r) => M`<path transform="translate(${e} ${t}) rotate(${n}) scale(.75)" d="M0-12C-8-6-9 4-4 12 6 10 12 2 10-8 6-11 3-12 0-12zM-4 12L5-3" fill=${r} stroke="#7a3d12" stroke-width=".8"/>`, at = (e) => M`<path d="M6 ${e}l3-14 3 14m16 0l4-18 2 18m22 0l2-12 4 12m18 0l4-16 3 16m24 0l2-13 4 13m20 0l4-17 2 17m22 0l3-12 3 12m20 0l4-16 3 16m18 0l2-12 4 12" fill="none" stroke="#3f9a3f" stroke-width="2.4" stroke-linecap="round"/>`, ot = M`<path d="M0 74V38q40-14 80 0t80-4 80 4v36z" fill="#dbe9f7"/><path d="M0 74V48q30-16 60-4t60-6 60 6 60-2v32z" fill="#fff"/>`, st = {
	flake: M`<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 6l-2.5-2.500M12 6l2.5-2.500M12 18l-2.5 2.500M12 18l2.5 2.5" fill="none" stroke="#9cc4e8" stroke-width="3.4" stroke-linecap="round" opacity=".55"/>
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 6l-2.5-2.500M12 6l2.5-2.500M12 18l-2.5 2.500M12 18l2.5 2.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`,
	petal: M`<ellipse cx="12" cy="12" rx="5" ry="9" fill="#fff" stroke="currentColor" stroke-width="1.2" transform="rotate(25 12 12)"/>`,
	leaf: M`<path d="M12 2C5 7 3 14 7 22c9-1 14-8 12-17-3-2-5-3-7-3zM7 22L15 9" fill="currentColor" stroke="#7a3d12" stroke-width="1"/>`,
	heart: M`<path d="M12 21C5 15 2 11 2 7.500A5 5 0 0 1 12 6a5 5 0 0 1 10 1.500C22 11 19 15 12 21z" fill="currentColor"/>`,
	bat: M`<path d="M12 9l-1.5-3-1 3.500C7 7 4 7 1 9c2 1 3 3 3 5 1.5-1 3-1 4 .500 1-1 2-.500 2.5 1L12 18l1.5-2.500c.500-1.5 1.5-2 2.5-1 1-1.5 2.5-1.5 4-.500 0-2 1-4 3-5-3-2-6-2-8.5.500l-1-3.500z" fill="currentColor"/>`,
	gull: M`<path d="M1 14q6-9 11-1 5-8 11 1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
	burst: M`${tt(12).map((e) => M`<path d="M12 7V2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" transform="rotate(${e * 30} 12 12)"/>`)}
    ${tt(6).map((e) => M`<circle cx="12" cy="5.5" r=".9" fill="#fff" transform="rotate(${e * 60 + 15} 12 12)"/>`)}`
}, ct = (e, t) => M`<g class="prop"><path d="M${e} ${t}V${t - 9}" stroke=${P} stroke-width="1.6"/><ellipse class="whirr" cx=${e} cy=${t - 10} rx="17" ry="2.600" fill="#9aa3b2" opacity=".8" style="transform-origin: ${e}px ${t - 10}px"/></g>`, lt = {
	robot: M`${ct(30, 12)}<path d="M46 22l12 7v9H44z" fill="#9aa3b2" stroke=${P} stroke-width="1.4" stroke-linejoin="round"/>
    <rect x="8" y="12" width="40" height="22" rx="7" fill="#e8ecf2" stroke=${P} stroke-width="1.6"/><path d="M13 19h9" stroke="#3f9a3f" stroke-width="3" stroke-linecap="round"/>
    <circle cx="37" cy="21" r="5.500" fill="#fff" stroke=${P} stroke-width="1.4"/><circle cx="38.500" cy="21" r="2.200" fill=${P}/>
    <path d="M20 12V5" stroke=${P} stroke-width="1.6"/><circle class="twinkle" cx="20" cy="4" r="2.800" fill="#e2483d"/>
    <circle cx="18" cy="36" r="6" fill=${P}/><circle cx="18" cy="36" r="2" fill="#9aa3b2"/><circle cx="38" cy="36" r="6" fill=${P}/><circle cx="38" cy="36" r="2" fill="#9aa3b2"/>`,
	blower: M`${ct(36, 14)}<path d="M28 15V8q0-5-8-5" fill="none" stroke="#c9342c" stroke-width="6" stroke-linecap="round"/><path d="M13 20L3 9" stroke=${P} stroke-width="2.600" stroke-linecap="round"/>
    <rect x="12" y="14" width="30" height="19" rx="4" fill="#e2483d" stroke=${P} stroke-width="1.6"/>
    <path d="M42 17h11a5 5 0 0 1 5 5v16H42z" fill="#f5c542" stroke=${P} stroke-width="1.6" stroke-linejoin="round"/><path d="M45 24l10 5m-10 2l10 5" stroke=${P} stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="22" cy="36" r="6" fill=${P}/><circle cx="22" cy="36" r="2" fill="#9aa3b2"/>`
}, ut = {
	snowman: () => M`<ellipse cx="100" cy="155" rx="84" ry="7" fill="#fff"/>
    <path d="M64 110L34 88m8 6l-2-12m2 12l-12 2M136 110l30-22m-8 6l2-12m-2 12l12 2" stroke="#6b4a2f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="118" r="38" fill="#fff" stroke="#b9cfe6" stroke-width="1.5"/><circle cx="100" cy="66" r="27" fill="#fff" stroke="#b9cfe6" stroke-width="1.5"/>
    <rect x="80" y="24" width="40" height="22" rx="3" fill=${P}/><rect x="70" y="42" width="60" height="6" rx="3" fill=${P}/><rect x="80" y="36" width="40" height="5" fill="#d8413c"/>
    <circle cx="91" cy="62" r="3" fill=${P}/><circle cx="109" cy="62" r="3" fill=${P}/><path d="M100 68l22 5-22 4z" fill="#f08a24"/>
    <path d="M76 84q24 12 48 0v9q-24 12-48 0z" fill="#d8413c"/><path d="M112 90l8 26-10 2-6-24z" fill="#d8413c"/>
    ${[
		108,
		124,
		140
	].map((e) => M`<circle cx="100" cy=${e} r="3.2" fill=${P}/>`)}`,
	tree: () => M`<rect x="62" y="132" width="12" height="22" fill="#6b4a2f"/>
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
	].map(([e, t, n]) => M`<circle class="twinkle" cx=${e} cy=${t} r="4.5" fill=${n} style="animation-delay: -${Number(e) % 7}s"/>`)}
    <rect x="120" y="112" width="44" height="42" rx="3" fill="#d8413c"/><rect x="139" y="112" width="6" height="42" fill="#f5c542"/><rect x="120" y="128" width="44" height="6" fill="#f5c542"/>
    <path d="M142 112q-14-16-18-4t18 4q14-16 18-4t-18 4" fill="none" stroke="#f5c542" stroke-width="4"/>
    <rect x="160" y="128" width="32" height="26" rx="3" fill="#2f8fd0"/><rect x="174" y="128" width="5" height="26" fill="#fff"/>
    <rect x="100" y="136" width="24" height="18" rx="2" fill="#f5c542"/><rect x="110" y="136" width="4" height="18" fill="#d8413c"/>`,
	clock: (e) => M`<path d="M20 150q20-50 8-96M176 150q-16-44-2-90" fill="none" stroke="#e8436e" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 9"/>
    <circle cx="100" cy="88" r="60" fill="#fff" stroke=${P} stroke-width="5"/>
    ${tt(12).map((e) => M`<path d="M100 36v${e % 3 ? 6 : 12}" stroke=${P} stroke-width=${e % 3 ? 2 : 4} stroke-linecap="round" transform="rotate(${e * 30} 100 88)"/>`)}
    <path d="M100 88V56" stroke=${P} stroke-width="6" stroke-linecap="round" transform="rotate(${(e.getHours() % 12 + e.getMinutes() / 60) * 30} 100 88)"/>
    <path d="M100 88V42" stroke=${P} stroke-width="3.5" stroke-linecap="round" transform="rotate(${e.getMinutes() * 6} 100 88)"/>
    <circle cx="100" cy="88" r="5" fill="#e8436e"/>
    <path d="M52 30l-8-18 18 8zM148 30l8-18-18 8z" fill="#f5c542"/>`,
	heart: () => M`<path d="M8 124L192 38" stroke="#7a5a30" stroke-width="4" stroke-linecap="round"/><path d="M8 124l-4-13m4 13l-14 2m22-8l-4-13m4 13l-14 2" stroke="#7a5a30" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path class="beat" d="M100 150C40 104 20 76 20 50a36 36 0 0 1 80-14 36 36 0 0 1 80 14c0 26-20 54-80 100z" fill="#e8436e"/>
    <path d="M44 46a18 18 0 0 1 22-14" stroke="#fff" opacity=".6" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M192 38l-24 1 11 18z" fill="#7a5a30"/>`,
	daisies: () => M`<path d="M0 160q100-22 200 0z" fill="#6cbf5a"/>
    <path d="M60 150q-6-50 4-84M110 152q4-60-6-104M150 150q8-40 0-66M86 150q-10-20-22-24M124 150q12-22 24-24" fill="none" stroke="#3f9a3f" stroke-width="3.5" stroke-linecap="round"/>
    ${nt(64, 62, 24)}${nt(104, 44, 30)}${nt(150, 80, 22)}
    <g class="bob"><ellipse cx="166" cy="32" rx="11" ry="8" fill="#f5c542" stroke=${P} stroke-width="1.5"/><path d="M162 25v14M168 25v14" stroke=${P} stroke-width="2.5"/>
      <ellipse cx="160" cy="22" rx="7" ry="4.5" fill="#fff" opacity=".85" stroke="#9aa3ad" stroke-width=".8" transform="rotate(-25 160 22)"/><ellipse cx="170" cy="21" rx="7" ry="4.5" fill="#fff" opacity=".85" stroke="#9aa3ad" stroke-width=".8" transform="rotate(20 170 21)"/></g>`,
	bunny: () => M`<path d="M0 160q100-20 200 0z" fill="#6cbf5a"/>
    <path d="M84 86q-16-60 4-68 14 8 10 68zM116 86q16-60-4-68-14 8-10 68z" fill="#f4efe9" stroke="#d9cfc4" stroke-width="1.5"/><path d="M86 76q-8-40 2-48 6 8 4 48zM114 76q8-40-2-48-6 8-4 48z" fill="#f7b6cf"/>
    <ellipse cx="100" cy="112" rx="38" ry="32" fill="#f4efe9" stroke="#d9cfc4" stroke-width="1.5"/>
    <circle cx="86" cy="104" r="4" fill=${P}/><circle cx="114" cy="104" r="4" fill=${P}/><path d="M96 114h8l-4 5z" fill="#f08aa8"/>
    <path d="M100 119v6m0 0q-6 5-11 1m11-1q6 5 11 1M72 116l-20-4m20 9l-20 4M128 116l20-4m-20 9l20 4" fill="none" stroke="#9a8f86" stroke-width="1.5" stroke-linecap="round"/>
    ${rt(38, 136, 15, "#f7b6cf", "#fff")}${rt(162, 138, 14, "#a8d8f0", "#fbe38a")}${rt(134, 144, 11, "#fbe38a", "#f08aa8")}${rt(66, 146, 10, "#c9b6f0", "#fff")}
    ${at(160)}`,
	sandcastle: () => M`<path d="M0 160q100-26 200 0z" fill="#ecd29a"/>
    <path d="M100 44V12" stroke="#7a5a30" stroke-width="2.5" stroke-linecap="round"/><path class="wave" d="M100 12l26 7-26 9z" fill="#e2483d"/>
    <rect x="85" y="44" width="30" height="52" fill="#e3bd76"/>${[
		85,
		97,
		109
	].map((e) => M`<rect x=${e} y="36" width="6" height="9" fill="#e3bd76"/>`)}
    <rect x="56" y="86" width="88" height="62" fill="#e3bd76"/>${[
		56,
		73,
		90,
		107,
		124,
		138
	].map((e) => M`<rect x=${e} y="77" width="9" height="10" fill="#e3bd76"/>`)}
    ${[38, 132].map((e) => M`<rect x=${e} y="62" width="30" height="88" fill="#d9b166"/>${[
		0,
		11,
		22
	].map((t) => M`<rect x=${e + t} y="53" width="8" height="10" fill="#d9b166"/>`)}<rect x=${e + 11} y="78" width="8" height="14" rx="4" fill="#a9824a"/>`)}
    <rect x="96" y="58" width="8" height="14" rx="4" fill="#a9824a"/><path d="M88 148v-22a12 12 0 0 1 24 0v22z" fill="#a9824a"/>
    <path d="M170 126l4 26h18l4-26z" fill="#e2483d"/><path d="M170 126q13-18 26 0" fill="none" stroke="#e2483d" stroke-width="2.5"/>
    <path d="M22 108l10 40" stroke="#2f8fd0" stroke-width="3.5" stroke-linecap="round"/><path d="M27 142l10 8-4 10-10-4z" fill="#2f8fd0"/>`,
	hedgehog: () => M`<path d="M0 160q100-20 200 0z" fill="#b5651d" opacity=".55"/>
    <path d="M44 122l-12-14 17 5-5-19 17 12 0-21 14 16 7-21 10 18 12-16 5 20 14-11-2 19 15-5-8 17" fill="#5b3a1d" stroke="#5b3a1d" stroke-width="4" stroke-linejoin="round"/>
    <path d="M40 152q-6-50 48-54t62 36q4 10-2 18z" fill="#7a4f2a"/><path d="M136 126q32 2 48 24-12 4-48 2z" fill="#e6c9a0"/>
    <circle cx="184" cy="149" r="4.5" fill=${P}/><circle cx="158" cy="134" r="3.2" fill=${P}/><path d="M60 152v6m24-6v6m30-6v6" stroke="#5b3a1d" stroke-width="5" stroke-linecap="round"/>
    <path d="M12 154v-22h10v22z" fill="#f3ead8"/><path d="M-2 134q19-32 38 0z" fill="#d8413c"/><circle cx="12" cy="124" r="2.5" fill="#fff"/><circle cx="24" cy="128" r="2" fill="#fff"/>
    ${it(170, 110, 30, "#e0872a")}${it(28, 100, -40, "#c94f1d")}${it(120, 84, 80, "#e3b23c")}`,
	lantern: () => M`<ellipse cx="80" cy="154" rx="70" ry="6" fill="#000" opacity=".25"/>
    <path d="M76 72q0-14 12-18l4 6q-6 4-6 12z" fill="#4c7a2a"/>
    <ellipse cx="80" cy="112" rx="62" ry="44" fill="#ee7a1c"/><ellipse cx="80" cy="112" rx="38" ry="44" fill="#f59330"/><ellipse cx="80" cy="112" rx="13" ry="44" fill="#ee7a1c"/>
    <g class="twinkle"><path d="M46 98l18-12 4 18zM114 98l-18-12-4 18zM74 110h12l-6-9z" fill="#ffe27a"/>
      <path d="M42 120l10 8 8-8 10 9 10-9 10 9 10-9 8 8 10-8q-8 28-38 28t-38-28z" fill="#ffe27a"/></g>
    <g class="bob"><path d="M150 150V92a22 22 0 0 1 44 0v58l-7.5-8-7 8-7.5-8-7 8-7.5-8z" fill="#fff" opacity=".93"/>
      <circle cx="165" cy="92" r="4" fill=${P}/><circle cx="180" cy="92" r="4" fill=${P}/><ellipse cx="172" cy="107" rx="4" ry="6" fill=${P}/></g>`
}, dt = {
	drift: ot,
	presents: M`${ot}
    <rect x="28" y="38" width="26" height="24" rx="2" fill="#d8413c"/><rect x="39" y="38" width="4" height="24" fill="#f5c542"/><path d="M41 38q-8-9-10-2t10 2q8-9 10-2t-10 2" fill="none" stroke="#f5c542" stroke-width="2.5"/>
    <path d="M118 62V40a8 8 0 0 1 16 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M118 62V40a8 8 0 0 1 16 0" fill="none" stroke="#d8413c" stroke-width="6" stroke-dasharray="5 6"/>
    <rect x="176" y="44" width="22" height="20" rx="2" fill="#1f7a4a"/><rect x="185" y="44" width="4" height="20" fill="#fff"/><rect x="196" y="50" width="18" height="16" rx="2" fill="#2f8fd0"/><rect x="203" y="50" width="4" height="16" fill="#f5c542"/>`,
	meadow: M`<path d="M0 74V58q60-14 120 0t120 0v16z" fill="#6cbf5a"/>
    <path d="M30 60V38M96 58V28M150 60V42M210 58V32" stroke="#3f9a3f" stroke-width="2.5" stroke-linecap="round"/>
    ${nt(30, 36, 11)}${nt(96, 26, 13)}${nt(150, 40, 10)}${nt(210, 30, 12)}${at(66)}`,
	eggs: M`<path d="M0 74V58q60-14 120 0t120 0v16z" fill="#6cbf5a"/>
    ${rt(34, 54, 9, "#f7b6cf", "#fff")}${rt(104, 50, 10, "#a8d8f0", "#fbe38a")}${rt(168, 55, 8, "#fbe38a", "#f08aa8")}${rt(214, 52, 9, "#c9b6f0", "#fff")}${at(68)}`,
	sea: M`<path d="M162 34l22 4-22 6zM160 22v26" fill="#fff" stroke="#fff" stroke-width="2"/><path d="M146 48h32l-6 9h-20z" fill="#e2483d"/>
    <path d="M0 74V46q15-10 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0v28z" fill="#4aa9dc"/><path d="M0 74V58q15-9 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0v16z" fill="#8fd0ee"/>`,
	leaves: M`<path d="M0 74V58q30-14 60-4t60-6 60 6 60-2v22z" fill="#b5651d"/>
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
	].map(([e, t, n, r]) => it(Number(e), Number(t), Number(n), String(r)))}
    <path d="M108 66v-12h6v12z" fill="#f3ead8"/><path d="M100 56q11-18 22 0z" fill="#d8413c"/>`,
	graves: M`<path d="M0 74V60q60-8 120 0t120 0v14z" fill="#2a2033"/>
    <path d="M40 64V40a11 11 0 0 1 22 0v24z" fill="#6b6877"/><path d="M47 46h8m-4-4v12" stroke="#2a2033" stroke-width="2"/>
    <path d="M100 66V34m14 32V38m14 28V32m14 34V40M96 46h50M96 56h50" stroke="#2a2033" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="190" cy="56" rx="15" ry="11" fill="#ee7a1c"/><ellipse cx="190" cy="56" rx="6" ry="11" fill="#f59330"/><path d="M189 46q0-6 5-7" fill="none" stroke="#4c7a2a" stroke-width="3"/>
    <path d="M183 53l5-3 1 5zM197 53l-5-3-1 5zM183 60q7 5 14 0" fill="#ffe27a"/>`,
	skyline: M`<path d="M0 74V44h18V30h20v20h14V22h22v30h12V38h24v18h12V16h20v36h14V34h22v22h12V26h18v30h14V42h18v32z" fill="#1d2033"/>
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
	].map(([e, t]) => M`<rect x=${e} y=${t} width="4" height="5" fill="#ffe27a"/>`)}`
}, ft = {
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
function pt(e, t) {
	return !t || t.state === "unavailable" ? [] : (ft[e] ?? []).flatMap(([e, n, r, i, a]) => {
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
var mt = (e, t, n) => ({
	domain: t.service.split(".")[0],
	service: t.service.split(".")[1],
	ids: [e],
	data: { [t.key]: n }
}), ht = (e) => e.replace(/_/g, " "), gt = 1, _t = 4;
function vt(e) {
	return (Array.isArray(e) ? e : []).filter((e) => typeof e?.temperature == "number" && Date.parse(e.datetime)).slice(0, _t).map((e) => ({
		at: Date.parse(e.datetime),
		sky: String(e.condition ?? ""),
		high: e.temperature,
		low: typeof e.templow == "number" ? e.templow : void 0
	}));
}
var yt = "dash_bored_hide", bt = "casa_mia_dash_bored", xt = /\b(led|relay|screen|screensaver|in use|enabled|watching|mode|program(me)?|charge)\b/i, St = {
	climate: "thermostat",
	media_player: "player",
	lawn_mower: "mower",
	water_heater: "water heater",
	alarm_control_panel: "alarm"
}, Ct = /* @__PURE__ */ new Set(["climate", "water_heater"]), wt = /* @__PURE__ */ new Set([
	"lock",
	"valve",
	"siren"
]), Tt = /* @__PURE__ */ new Set([
	"garage",
	"gate",
	"door"
]);
function Et(e, t, n) {
	let r = (Ot(e, t) ?? e).replace(n === "light" ? /\s+lights?$/i : n === "switch" ? /\s+switch$/i : /$^/, ""), i = St[n] ?? n;
	return Dt(!r || RegExp(`^${i}s?$`, "i").test(r) ? i : r);
}
var Dt = (e) => e[0].toUpperCase() + e.slice(1);
function Ot(e, t) {
	let n = e.slice(t.length);
	if (t && e.toLowerCase().startsWith(t.toLowerCase()) && !/^[a-z0-9]/i.test(n)) return n.replace(/^[\s\-–—:,.]+/, "");
}
function kt(e, t) {
	let n = /* @__PURE__ */ new Map(), r = [], i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Set(), o = [], s = [], c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map(), u = t.weather, d = [], f = [], p = [], m = [], h = (e) => !!e?.labels?.includes(yt), g = /* @__PURE__ */ new Map(), _ = /* @__PURE__ */ new Map();
	for (let n of t.cameras ?? []) {
		for (let e of [
			n.entity,
			n.medium,
			n.high
		]) e && g.set(e, n);
		let t = e.entities?.[n.entity]?.device_id;
		t && _.set(t, n);
	}
	let v = (e, t) => wt.has(e) || e === "cover" && Tt.has(t.attributes.device_class);
	for (let p of Object.values(e.entities ?? {})) {
		let g = p.entity_id, _ = e.states[g], y = g === t.entity;
		if (t.entity && !y || !_ || !y && (p.hidden || p.entity_category)) continue;
		let b = g.split(".")[0];
		b === "weather" && (!u || g === "weather.home") && !t.weather && (u = g), b === "sensor" && _.attributes.device_class === "power" && p.device_id && c.set(p.device_id, g);
		let x = e.devices?.[p.device_id], S = e.areas?.[p.area_id ?? x?.area_id];
		if (!y && (h(p) || h(x) || h(S))) continue;
		if (b === "person" && o.push(g), b === "scene" && r.push({
			id: g,
			name: _.attributes.friendly_name ?? p.name ?? g,
			area: y ? void 0 : S?.area_id
		}), b === "image" && p.platform === bt && !h(e.entities[_.attributes.camera]) && (s.push({
			id: g,
			name: x?.name_by_user ?? x?.name ?? g,
			room: S?.name
		}), a.add(_.attributes.camera)), It.has(b)) {
			let e = _.attributes.friendly_name ?? p.name ?? g;
			S || d.push({
				id: g,
				name: e
			}), !S && !y && b === "light" && f.push({
				id: g,
				kind: "light",
				name: e,
				full: e,
				guarded: !1
			}), xt.test(e) && m.push({
				id: g,
				name: e,
				via: p.platform
			});
		}
		if (!It.has(b) || !S && !y) continue;
		let C = y ? "" : S.area_id;
		if (y && n.set(C, {
			id: C,
			name: "",
			level: Infinity,
			devices: [],
			scenes: []
		}), !n.has(C)) {
			let t = e.floors?.[S.floor_id];
			n.set(C, {
				id: C,
				name: S.name,
				floor: t?.name,
				floorId: t?.floor_id,
				level: t ? t.level ?? 0 : Infinity,
				temp: S.temperature_entity_id ?? void 0,
				humidity: S.humidity_entity_id ?? void 0,
				devices: [],
				scenes: []
			});
		}
		let w = n.get(C);
		b === "climate" && (w.climate ??= g);
		let T = _.attributes.friendly_name ?? p.name ?? g, E = {
			id: g,
			kind: b,
			name: y ? T : Et(T, S.name, b),
			full: T,
			guarded: v(b, _)
		};
		w.devices.push(E), b === "switch" && p.device_id && l.set(E, p.device_id), b === "camera" && x && !y && i.set(E, {
			device: p.device_id,
			name: x.name_by_user ?? x.name ?? T
		});
	}
	let y = (e) => (a.has(e.id) ? 2 : 0) + +(g.get(e.id)?.entity === e.id);
	for (let t of n.values()) {
		let n = /* @__PURE__ */ new Map();
		for (let e of [...t.devices].sort((e, t) => e.id.localeCompare(t.id))) {
			let t = i.get(e);
			if (!t) continue;
			let r = n.get(t.device);
			(!r || y(e) > y(r)) && n.set(t.device, e);
		}
		let r = new Set([...i].filter(([e, r]) => n.get(r.device) !== e && t.devices.includes(e)).map(([, e]) => e.device));
		t.devices = t.devices.filter((e) => !i.has(e) || n.get(i.get(e).device) === e);
		for (let e of r) {
			let r = n.get(e);
			r.full = i.get(r).name, r.name = Et(r.full, t.name, "camera");
		}
		for (let n of t.devices) {
			let r = n.kind === "camera" ? g.get(n.id) ?? _.get(i.get(n)?.device ?? "") : void 0;
			r && (n.lens = r, n.full = r.title, n.name = Et(r.title, t.name, "camera"), n.controls = r.controls.flatMap((t) => {
				let n = e.states[t.entity];
				if (!n) return [];
				let r = t.entity.split(".")[0], i = t.name || n.attributes.friendly_name || t.entity;
				return [{
					id: t.entity,
					name: i,
					found: It.has(r) ? {
						id: t.entity,
						kind: r,
						name: i,
						full: i,
						guarded: v(r, n)
					} : void 0
				}];
			}));
		}
	}
	let b = /* @__PURE__ */ new Map();
	for (let e of l.values()) b.set(e, (b.get(e) ?? 0) + 1);
	for (let [e, t] of l) b.get(t) === 1 && (e.power = c.get(t));
	let x = (e, t, n) => {
		let r = (e ?? []).findIndex((e) => e === t || !!n && e.toLowerCase() === n.toLowerCase());
		return r < 0 ? Infinity : r;
	}, { floors: S, rooms: C } = t, w = (e) => x(S ?? t.floor_order, e.floorId, e.floor), T = (e) => x(C ?? t.room_order, e.id, e.name), E = [...n.values()].filter((e) => (e.devices.length || e.temp) && (!S || w(e) < Infinity) && (!C || T(e) < Infinity)).sort((e, t) => w(e) - w(t) || e.level - t.level || (e.floor ?? "").localeCompare(t.floor ?? "") || T(e) - T(t) || e.name.localeCompare(t.name));
	for (let e of E) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.devices) t.set(n.name, (t.get(n.name) ?? 0) + 1);
		for (let n of e.devices) t.get(n.name) !== 1 && (n.name = n.full, p.push({
			id: n.id,
			name: n.full
		}));
	}
	for (let e of E) e.devices.sort((e, t) => e.kind.localeCompare(t.kind) || e.name.localeCompare(t.name));
	let ee = (e, t) => [...e].sort((e, n) => t(n).length - t(e).length), te = ee(E, (e) => e.name), ne = ee([...new Set(E.flatMap((e) => e.floor ? [e.floor] : []))], (e) => e), D = [];
	for (let e of r.sort((e, t) => e.name.localeCompare(t.name))) {
		let t = E.find((t) => t.id === e.area) ?? te.find((t) => Ot(e.name, t.name) !== void 0), n = t ? void 0 : ne.find((t) => Ot(e.name, t) !== void 0), r = Ot(e.name, t?.name ?? n ?? "");
		(t?.scenes ?? D).push({
			id: e.id,
			name: r ? Dt(r) : e.name,
			full: e.name,
			floor: n
		});
	}
	let O = S || C ? [] : f, re = E.flatMap((e) => [
		e.temp,
		e.humidity,
		e.climate,
		...e.devices.flatMap((e) => [
			e.id,
			e.power,
			e.lens?.zoom,
			...(e.controls ?? []).map((e) => e.id)
		])
	]), k = (e) => e.map((e) => ({
		id: e.id,
		name: e.name
	})), A = {
		rooms: E,
		strays: O,
		people: o,
		sightings: s,
		gaps: [
			{
				kind: "loose",
				items: d
			},
			{
				kind: "plumbing",
				items: m.sort((e, t) => (e.via ?? "").localeCompare(t.via ?? "") || e.name.localeCompare(t.name))
			},
			{
				kind: "clash",
				items: p
			},
			{
				kind: "floorless",
				items: E.some((e) => e.floor) ? k(E.filter((e) => !e.floor)) : []
			},
			{
				kind: "cold",
				items: k(E.filter((e) => !e.temp && !e.climate))
			}
		].filter((e) => e.items.length),
		scenes: D,
		weather: u,
		power: t.power,
		watched: [.../* @__PURE__ */ new Set([
			...re,
			...O.map((e) => e.id),
			...r.map((e) => e.id),
			...o,
			u,
			t.power,
			t.entity
		])].filter((e) => !!e)
	};
	return t.sample ? Mt(A) : A;
}
var At = 4, jt = 2;
function Mt(e) {
	let t = (e) => new Set(e.devices.map((e) => e.kind)).size, n = e.rooms.reduce((e, n) => !e || t(n) > t(e) ? n : e, void 0);
	if (!n) return e;
	let r = n.devices.filter((e, t) => n.devices.findIndex((t) => t.kind === e.kind) === t), i = [...r, ...n.devices.filter((e) => !r.includes(e))].slice(0, At), a = e.scenes.filter((e) => !e.floor).slice(0, jt), o = n.scenes.slice(0, jt), s = [
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
		watched: s.filter((e) => !!e)
	};
}
var Nt = (e) => (t) => t === e, Pt = (e) => (t) => t !== e, Ft = {
	light: Nt("on"),
	switch: Nt("on"),
	lock: Nt("locked"),
	cover: Pt("closed"),
	climate: Pt("off"),
	media_player: Nt("playing"),
	camera: () => !1,
	fan: Nt("on"),
	valve: Pt("closed"),
	vacuum: Nt("cleaning"),
	lawn_mower: Nt("mowing"),
	water_heater: Pt("off"),
	humidifier: Nt("on"),
	siren: Nt("on"),
	alarm_control_panel: (e) => e.startsWith("armed")
}, It = new Set(Object.keys(Ft)), Lt = [
	"docked",
	"returning",
	"paused",
	"error"
], Rt = {
	vacuum: Lt,
	lawn_mower: Lt,
	alarm_control_panel: [
		"triggered",
		"pending",
		"arming"
	]
}, zt = {
	light: ["brightness", (e) => Math.round(e / 255 * 100)],
	cover: ["current_position", (e) => e],
	climate: ["temperature", (e) => e],
	media_player: ["volume_level", (e) => Math.round(e * 100)],
	fan: ["percentage", (e) => e],
	valve: ["current_position", (e) => e],
	water_heater: ["temperature", (e) => e],
	humidifier: ["humidity", (e) => e]
}, Bt = (e) => e in zt, Vt = {
	light: (e) => (e.supported_color_modes ?? []).some((e) => e !== "onoff"),
	cover: (e) => !!(e.supported_features & 4),
	climate: (e) => !!(e.supported_features & 1),
	media_player: (e) => !!(e.supported_features & 4),
	fan: (e) => !!(e.supported_features & 1),
	water_heater: (e) => !!(e.supported_features & 1),
	humidifier: () => !0
}, Ht = {
	min: 0,
	max: 100,
	step: 1,
	vote: 10
}, Ut = {
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
		...Ht,
		vote: 5
	})
}, Wt = (e, t) => Ut[e]?.(t) ?? Ht;
function Gt(e, t) {
	let n = !t || t.state === "unavailable", r = !n && Ft[e](t.state), [i, a] = zt[e] ?? [], o = i && t?.attributes[i];
	return {
		on: r,
		phase: t && Rt[e]?.includes(t.state) ? t.state : void 0,
		level: typeof o == "number" && a ? a(o) : void 0,
		away: n
	};
}
function Kt(e, t) {
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
		let s = t.states[e.id], { on: c, phase: l, level: u, away: d } = Gt(e.kind, s), f = s?.attributes ?? {}, p = !e.guarded && !!Vt[e.kind]?.(f), m = c ? r(e.power) : void 0;
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
			span: Wt(e.kind, f),
			temp: Ct.has(e.kind) && typeof f.current_temperature == "number" ? f.current_temperature : void 0,
			title: e.kind === "media_player" && c && [f.media_title, f.media_artist].filter(Boolean).join(", ") || void 0,
			picture: e.kind === "camera" ? f.entity_picture : void 0,
			away: d,
			since: Date.parse(s?.last_changed ?? "") || 0,
			guarded: e.guarded,
			room: n,
			choices: pt(e.kind, s),
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
			daily: !!(l.attributes.supported_features & gt)
		} : void 0,
		kw: r(e.power)
	};
}
function qt(e, t) {
	let n = new Map(e.sightings.map((e) => [e.id, e]));
	return t.flatMap((e) => {
		let t = n.get(e.entity), r = e.photo ? `/api/${bt}/photo/${e.id}?v=${e.changed}` : void 0;
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
var Jt = (e) => [...e.rooms.flatMap((e) => e.devices), ...e.strays].filter((e) => e.kind === "light" && !e.away), Yt = (e) => [...e.scenes, ...e.rooms.flatMap((e) => e.scenes)].map((e) => ({
	...e,
	name: e.full
})), Xt = {
	lock: ["unlock", "lock"],
	cover: ["close_cover", "open_cover"],
	media_player: ["media_pause", "media_play"],
	valve: ["close_valve", "open_valve"],
	vacuum: ["return_to_base", "start"],
	lawn_mower: ["dock", "start_mowing"]
}, Zt = (e) => ({
	domain: e.kind,
	service: (Xt[e.kind] ?? ["turn_off", "turn_on"])[+!e.on],
	ids: [e.id]
}), Qt = {
	light: ["turn_on", (e) => ({ brightness_pct: e })],
	cover: ["set_cover_position", (e) => ({ position: e })],
	climate: ["set_temperature", (e) => ({ temperature: e })],
	media_player: ["volume_set", (e) => ({ volume_level: e / 100 })],
	fan: ["set_percentage", (e) => ({ percentage: e })],
	water_heater: ["set_temperature", (e) => ({ temperature: e })],
	humidifier: ["set_humidity", (e) => ({ humidity: e })]
};
function $t(e, t) {
	if (e.kind === "light" && !t) return {
		domain: "light",
		service: "turn_off",
		ids: [e.id]
	};
	let [n, r] = Qt[e.kind];
	return {
		domain: e.kind,
		service: n,
		ids: [e.id],
		data: r(t)
	};
}
var en = (e, t) => ({
	domain: "number",
	service: "set_value",
	ids: [e.zoom.id],
	data: { value: t }
}), tn = (e) => ({
	domain: e.action.split(".")[0],
	service: e.action.split(".")[1] ?? "",
	ids: [],
	data: e.data
}), nn = {
	button: "button.press",
	input_button: "input_button.press",
	script: "script.turn_on",
	scene: "scene.turn_on"
};
function rn(e) {
	let [t, n] = (nn[e.id.split(".")[0]] ?? "homeassistant.toggle").split(".");
	return {
		domain: t,
		service: n,
		ids: [e.id]
	};
}
var an = 6, on = 60, sn = (e) => e.trim().toLowerCase(), cn = (e, t) => sn(e.title) === sn(t.title) && (!e.artist || !t.artist || sn(e.artist) === sn(t.artist));
function ln(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of [...e].sort((e, t) => e.at - t.at)) t.set(`${sn(n.name)}\n${sn(n.title)}\n${sn(n.artist)}`, n);
	return [...t.values()].filter((e) => e.kind !== "clear");
}
function un(e, t, n) {
	let r = ln(t), i = /* @__PURE__ */ new Map();
	for (let t of [...e].sort((e, t) => e.at - t.at)) i.set(t.entity_id, t.id);
	let a = [];
	for (let t of [...e].sort((e, t) => t.at - e.at)) {
		let e = n.get(t.entity_id);
		if (!e) continue;
		let o = e.on && i.get(e.id) === t.id && (!e.title || sn(e.title).startsWith(sn(t.title))), s = e.room.toLowerCase(), c = a.find((e) => e.live === o && e.vars.title === t.title && e.vars.artist === t.artist && e.at - t.at * 1e3 < on * 1e3);
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
	return a.slice(0, an);
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
], F = (e) => new Date(e).toTimeString().slice(0, 5), bn = (e) => e && e[0].toUpperCase() + e.slice(1);
function xn(e) {
	let t = yn[e] ?? String(e);
	return {
		n: String(e),
		N: bn(t),
		n_word: t,
		s: e === 1 ? "" : "s",
		v: e === 1 ? "s" : ""
	};
}
function Sn(e) {
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
function Cn(e) {
	return typeof e.value == "number" || typeof e.value == "string" && e.value.trim() !== "" && Number.isFinite(Number(e.value)) ? `${e.value}${e.unit ? ` ${e.unit}` : ""}` : "";
}
function wn(e, t, n, r = []) {
	let i = [], a = (e) => i.push({
		variant: "",
		flavour: "",
		...e
	}), o = e.rooms.flatMap((e) => e.devices);
	for (let e of t) {
		let t = {
			name: e.name,
			area: (e.area ?? "house").toLowerCase(),
			message: e.message || `${bn(e.level)}.`,
			reading: Cn(e),
			since: F(e.began),
			escalated: e.escalated ? "yes" : ""
		}, r = Cn(e) ? [Cn(e), e.area ?? e.name] : [bn(e.level), e.name];
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
			at: F(e.at)
		},
		figure: [F(e.at), e.name],
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
				...xn(c.length),
				names: c.length > 3 ? `${e} and ${c.length - 3} more` : e,
				since: F(Math.min(...c.map((e) => e.since)))
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
	let l = Jt(e), u = l.filter((e) => e.on);
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
			vars: xn(u.length),
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
		vars: xn(o.length),
		figure: [String(e.rooms.length), e.rooms.length === 1 ? "room" : "rooms"]
	}), i.sort((e, t) => t.rank - e.rank);
}
//#endregion
//#region src/dash-bored/family.ts
var Tn = "casa_mia_dash_bored/alerts", En = "casa_mia_dash_bored/sightings", Dn = "casa_mia_dash_bored/settings", On = "casa_mia", kn = "casa_mia/cameras/subscribe", An = "weather/subscribe_forecast", jn = 18e5, Mn = 350, Nn = C`
  :host { display: block; }
  :host([panel]) > :first-child { min-height: 100vh; }
  /* In the card picker (picked below) a window on the top of the specimen: in its narrow
     column even one room of a family is about 1,000 px tall. */
  :host([sample]) { max-height: 400px; overflow: hidden; }
`, Pn = (e) => e.getRootNode().host?.localName === "hui-card-picker", Fn = /* @__PURE__ */ new Set();
function In(e, t) {
	if (Fn.has(e)) return;
	Fn.add(e);
	let n = new FontFace(e, `url(/casa_mia_dash_bored/fonts/${t})`);
	document.fonts.add(n), n.load().catch((t) => console.error(`Dash-Bored: the typeface ${e} could not be loaded`, t));
}
var Ln = class extends Xe {
	constructor(...e) {
		super(...e), this.narrow = !1, this._days = [], this._fault = "", this._lost = 0, this._config = {}, this._settings = {}, this._cameras = [], this._spotted = [], this._feeds = /* @__PURE__ */ new Map(), this._timers = /* @__PURE__ */ new Set(), this._picked = !1;
	}
	static {
		this.properties = {
			narrow: { type: Boolean },
			_house: { state: !0 },
			_days: { state: !0 },
			_fault: { state: !0 },
			_lost: { state: !0 }
		};
	}
	static getStubConfig(e) {
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
	get _alone() {
		return !1;
	}
	get _vacant() {
		return this._config.rooms?.length ? "This room has nothing in it that can be shown here." : "Choose a room in the card's options.";
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
		if (!this._survey || !t || t.entities !== e.entities || t.areas !== e.areas || t.devices !== e.devices || t.floors !== e.floors) this._survey = kt(e, {
			...this._settings,
			...this._config,
			cameras: this._cameras,
			sample: this._sample
		});
		else if (t.states === e.states || !this._survey.watched.some((n) => t.states[n] !== e.states[n])) return;
		let n = new Map(this._house?.rooms.flatMap((e) => e.devices).map((e) => [e.id, e]));
		this._house = Kt(this._survey, e), this._surveyed();
		for (let e of this._house.rooms.flatMap((e) => e.devices)) {
			let t = n.get(e.id);
			t && (t.on !== e.on || t.phase !== e.phase || t.level !== e.level || t.away !== e.away) && this._moved(e);
		}
	}
	_surveyed() {}
	_moved(e) {}
	connectedCallback() {
		super.connectedCallback(), Pn(this) !== this._picked && (this._picked = !this._picked, this.toggleAttribute("sample", this._picked), this._survey = void 0, this._hass && (this.hass = this._hass)), this._hass?.connected !== !1 && this._listen(), this._resized(this.clientWidth || window.innerWidth), this._sizes = new ResizeObserver(([e]) => this._resized(e.contentRect.width)), this._sizes.observe(this);
	}
	_resized(e) {}
	disconnectedCallback() {
		super.disconnectedCallback(), this._sizes?.disconnect();
		for (let e of this._feeds.values()) e.then((e) => e()).catch(() => void 0);
		this._feeds.clear(), this._forecastOf = void 0;
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
		this._follow(Dn, "Dash-Bored's settings", (e) => {
			this._settings = e.at(-1) ?? this._settings, this._survey = void 0, this._hass && (this.hass = this._hass);
		}), this._hass?.config?.components?.includes(On) && this._follow(kn, "Casa Mia's cameras", (e) => {
			this._cameras = e, this._survey = void 0, this._hass && (this.hass = this._hass);
		}, !0);
	}
	_outlook() {
		let e = this._hass?.connection, t = this._house?.outside, n = t?.daily ? t.id : void 0;
		if (!e || !this.isConnected || n === this._forecastOf || (this._feeds.get(An)?.then((e) => e()).catch(() => void 0), this._feeds.delete(An), this._forecastOf = n, this._days = [], !n)) return;
		let r = e.subscribeMessage((e) => this._days = vt(e.forecast), {
			type: An,
			forecast_type: "daily",
			entity_id: n
		});
		this._feeds.set(An, r), r.catch((e) => {
			this._feeds.delete(An), console.error(`Dash-Bored: the forecast of ${n} failed`, e), this._fault = `The weather forecast is not reaching this page (${e?.message ?? e}).`;
		});
	}
	_watch() {
		this._follow(En, "The cameras' sightings", (e) => {
			let t = new Map(this._spotted.map((e) => [e.id, e])), n = Date.now();
			for (let r of e) t.set(r.id, r), this._after(jn - (n - r.at * 1e3) + 1e3, () => this.requestUpdate());
			this._spotted = [...t.values()].filter((e) => n - e.at * 1e3 < jn), this.requestUpdate();
		});
	}
	_sighted(e = Date.now()) {
		let t = /* @__PURE__ */ new Map();
		for (let n of this._survey ? qt(this._survey, this._spotted) : []) e - n.at < jn && n.at >= (t.get(n.camera)?.at ?? 0) && t.set(n.camera, n);
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
	_lights(e) {
		let t = e.devices.filter((e) => e.kind === "light" && !e.away), n = t.some((e) => e.on), r = t.filter((e) => e.on === n).map((e) => e.id);
		r.length && this._call({
			domain: "light",
			service: n ? "turn_off" : "turn_on",
			ids: r
		}, `${e.name} lights`);
	}
	_ask(e, t, n = $t) {
		clearTimeout(this._asking), this._timers.delete(this._asking), this._asking = setTimeout(() => {
			this._timers.delete(this._asking), this._call(n(e, t), `${e.room} ${e.name}`);
		}, Mn), this._timers.add(this._asking);
	}
};
//#endregion
//#region src/dash-bored/fridge/magnets.ts
function Rn(e, t) {
	let n = 0;
	for (let t of e) n = n * 31 + t.charCodeAt(0) >>> 0;
	return n % t;
}
var I = (e, t = 4) => (Rn(e, 2 * t * 10 + 1) / 10 - t || .4).toFixed(1), L = (e) => M`<path d=${e} fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`, zn = {
	light: M`${L("M8.5,14.5 a5.6,5.6 0 1 1 7,0 v2.2 h-7 z M9.8,19.3 h4.4 M10.8,21.4 h2.4")}`,
	switch: M`${L("M6,9 h12 v4 a6,6 0 0 1 -12,0 z M9,9 V4.5 M15,9 V4.5 M12,19 v2.5")}`,
	cover: M`${L("M4.5,4.5 h15 M6,4.5 v14 h12 v-14 M6,8.5 h12 M6,12 h12 M6,15.5 h12 M12,18.5 v2.5")}<circle cx="12" cy="21.4" r="1" fill="#fff"/>`,
	lock: M`${L("M6.5,11 h11 v9 h-11 z M8.8,11 V8 a3.2,3.2 0 0 1 6.4,0 v3")}<circle cx="12" cy="15.5" r="1.4" fill="#fff"/>`,
	climate: M`${L("M10,4 a2,2 0 0 1 4,0 v9.6 a4,4 0 1 1 -4,0 z M12,9 v7")}<circle cx="12" cy="17" r="2" fill="#fff"/>`,
	media_player: M`${L("M9.5,18 V6 l8.5,-2 v12")}<ellipse cx="7.3" cy="18" rx="2.6" ry="2" fill="#fff"/><ellipse cx="15.8" cy="16" rx="2.6" ry="2" fill="#fff"/>`,
	camera: M`${L("M4,8 h3.5 l1.5,-2 h6 l1.5,2 H20 v10.5 H4 z")}<circle cx="12" cy="13" r="3.2" fill="none" stroke="#fff" stroke-width="1.9"/>`,
	fan: M`${L("M12,12 c0,-5 4,-7 6,-5 s-1,5 -6,5 c5,0 7,4 5,6 s-5,-1 -5,-6 c0,5 -4,7 -6,5 s1,-5 6,-5 c-5,0 -7,-4 -5,-6 s5,1 5,6")}`,
	valve: M`${L("M12,3.5 c4,5 6,8 6,11 a6,6 0 0 1 -12,0 c0,-3 2,-6 6,-11 z")}`,
	vacuum: M`<circle cx="12" cy="13" r="7.6" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="12" cy="13" r="2" fill="#fff"/>${L("M7,7.6 a7.6,7.6 0 0 1 10,0")}`,
	lawn_mower: M`${L("M4,20 h16 M6,20 v-4 M9,20 v-6.5 M12,20 v-4.5 M15,20 v-7 M18,20 v-4")}`,
	water_heater: M`${L("M7,10 h10 v8 a2,2 0 0 1 -2,2 h-6 a2,2 0 0 1 -2,-2 z M17,12 h2 a1.6,1.6 0 0 1 0,3.2 h-2 M10,3.5 c-1,1.5 1,2 0,3.5 M14,3.5 c-1,1.5 1,2 0,3.5")}`,
	humidifier: M`${L("M7,14 a4,4 0 0 1 1,-7.8 a5,5 0 0 1 9.4,1.2 a3.4,3.4 0 0 1 -.4,6.6 z M9,17.5 v2 M12,18.5 v2.5 M15,17.5 v2")}`,
	siren: M`${L("M6.5,17 v-5.5 a5.5,5.5 0 0 1 11,0 V17 z M4.5,17 h15 M10.5,20 a1.6,1.6 0 0 0 3,0")}`,
	alarm_control_panel: M`${L("M12,3.5 l7,2.5 v5.5 c0,4.5 -3,7.5 -7,9 c-4,-1.5 -7,-4.500 -7,-9 V6 z M9,12 l2.2,2.2 l4,-4.4")}`
}, Bn = M`${L("M6.5,11 h11 v9 h-11 z M8.8,11 V8 a3.2,3.2 0 0 1 6.2,-1")}<circle cx="12" cy="15.5" r="1.4" fill="#fff"/>`, Vn = (e, t = !1) => e === "lock" && t ? Bn : zn[e], Hn = (e, t = !1) => M`<svg class="button" viewBox="0 0 48 48" aria-hidden="true">
  <circle cx="24" cy="26" r="21" fill="#000" opacity=".28"/><circle class="disc" cx="24" cy="24" r="21"/>
  <circle cx="24" cy="24" r="21" fill="url(#dome)"/><circle cx="24" cy="24" r="17.5" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1.2"/>
  <g transform="translate(12 12)">${Vn(e, t)}</g>
  <ellipse cx="16.5" cy="13.5" rx="7" ry="3.6" fill="#fff" opacity=".4" transform="rotate(-32 16.5 13.5)"/></svg>`, R = (e, t) => M`<ellipse cx=${e} cy=${t} rx="4" ry="2.2" fill="#fff" opacity=".55" transform="rotate(-30 ${e} ${t})"/>`, Un = (e, t, n) => M`<circle cx=${e} cy=${n} r="1.9" fill="#1d1d1d"/><circle cx=${t} cy=${n} r="1.9" fill="#1d1d1d"/><circle cx=${e + .6} cy=${n - .6} r=".6" fill="#fff"/><circle cx=${t + .6} cy=${n - .6} r=".6" fill="#fff"/>`, Wn = {
	butterfly: M`<path d="M24,24 C14,6 2,10 5,22 C6,28 14,28 24,24 C14,30 8,40 16,43 C22,44 24,34 24,24 Z" fill="#f08a24" stroke="#5a2d05" stroke-width="1.4"/>
    <path d="M24,24 C34,6 46,10 43,22 C42,28 34,28 24,24 C34,30 40,40 32,43 C26,44 24,34 24,24 Z" fill="#f6a93b" stroke="#5a2d05" stroke-width="1.4"/>
    <circle cx="11" cy="18" r="3" fill="#fff3c9"/><circle cx="37" cy="18" r="3" fill="#fff3c9"/><circle cx="16" cy="36" r="2.2" fill="#3a1c04"/><circle cx="32" cy="36" r="2.2" fill="#3a1c04"/>
    <ellipse cx="24" cy="25" rx="2.4" ry="11" fill="#3a1c04"/><path d="M23,15 C21,9 18,8 17,7 M25,15 C27,9 30,8 31,7" fill="none" stroke="#3a1c04" stroke-width="1.3" stroke-linecap="round"/>${R(12, 14)}`,
	ladybird: M`<ellipse cx="24" cy="27" rx="17" ry="15" fill="#d81f26" stroke="#5a0a0d" stroke-width="1.4"/><path d="M24,12 V42" stroke="#5a0a0d" stroke-width="1.6"/>
    <path d="M12,17 a14,10 0 0 1 24,0 a13,8 0 0 0 -24,0 z" fill="#1d1d1d"/><circle cx="24" cy="12" r="7" fill="#1d1d1d"/>
    <g fill="#1d1d1d"><circle cx="16" cy="24" r="3"/><circle cx="32" cy="24" r="3"/><circle cx="14" cy="34" r="2.6"/><circle cx="34" cy="34" r="2.6"/><circle cx="20" cy="31" r="2"/><circle cx="28" cy="31" r="2"/></g>
    <circle cx="21" cy="10.5" r="1.6" fill="#fff"/><circle cx="27" cy="10.5" r="1.6" fill="#fff"/>${R(15, 19)}`,
	bee: M`<ellipse cx="15" cy="15" rx="9" ry="6" fill="#dff1fb" stroke="#6b8794" stroke-width="1.1" transform="rotate(-25 15 15)"/><ellipse cx="33" cy="15" rx="9" ry="6" fill="#dff1fb" stroke="#6b8794" stroke-width="1.1" transform="rotate(25 33 15)"/>
    <ellipse cx="24" cy="28" rx="13" ry="14" fill="#ffc928" stroke="#5a3c05" stroke-width="1.4"/><path d="M12.5,23 h23 M11,29 h26 M13,35 h22" stroke="#2a1d05" stroke-width="3.4" stroke-linecap="round"/>
    ${Un(20, 28, 20)}<path d="M21,24.500 q3,2 6,0" fill="none" stroke="#2a1d05" stroke-width="1.1" stroke-linecap="round"/>${R(17, 22)}`,
	fish: M`<path d="M6,24 C12,12 28,10 36,24 C28,38 12,36 6,24 Z" fill="#2aa6c9" stroke="#0c4a5e" stroke-width="1.4"/><path d="M35,24 L45,15 V33 Z" fill="#2390b0" stroke="#0c4a5e" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M18,14.500 q4,-5 8,-.5" fill="#2390b0" stroke="#0c4a5e" stroke-width="1.2"/><path d="M22,20 q4,4 0,8 M27,20 q4,4 0,8" fill="none" stroke="#0c4a5e" stroke-opacity=".5" stroke-width="1.1"/>
    <circle cx="13" cy="22" r="2.6" fill="#fff"/><circle cx="13.400" cy="22" r="1.3" fill="#1d1d1d"/>${R(18, 18)}`,
	cat: M`<path d="M9,18 L8,6 L19,12 Z M39,18 L40,6 L29,12 Z" fill="#8a8f98" stroke="#33363b" stroke-width="1.4" stroke-linejoin="round"/><ellipse cx="24" cy="27" rx="17" ry="15" fill="#9aa0a9" stroke="#33363b" stroke-width="1.4"/>
    ${Un(17, 31, 24)}<path d="M22.500,29.500 h3 l-1.500,2 z" fill="#e58a9a"/><path d="M24,31.500 q-3,3 -6,1 M24,31.500 q3,3 6,1 M8,27 h7 M9,31 l6,-1 M40,27 h-7 M39,31 l-6,-1" fill="none" stroke="#33363b" stroke-width="1" stroke-linecap="round"/>${R(16, 17)}`,
	frog: M`<circle cx="15" cy="13" r="7" fill="#57b947" stroke="#1f5a17" stroke-width="1.4"/><circle cx="33" cy="13" r="7" fill="#57b947" stroke="#1f5a17" stroke-width="1.4"/><ellipse cx="24" cy="28" rx="18" ry="14" fill="#63c552" stroke="#1f5a17" stroke-width="1.4"/>
    <circle cx="15" cy="13" r="3.6" fill="#fff"/><circle cx="33" cy="13" r="3.6" fill="#fff"/><circle cx="15.500" cy="13.500" r="1.8" fill="#1d1d1d"/><circle cx="33.500" cy="13.500" r="1.8" fill="#1d1d1d"/>
    <path d="M13,31 q11,8 22,0" fill="none" stroke="#1f5a17" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="29" r="2.4" fill="#f28ba0" opacity=".7"/><circle cx="36" cy="29" r="2.4" fill="#f28ba0" opacity=".7"/>${R(18, 22)}`,
	strawberry: M`<path d="M24,44 C10,36 6,24 9,16 C13,10 35,10 39,16 C42,24 38,36 24,44 Z" fill="#e3263b" stroke="#6b0a16" stroke-width="1.4"/>
    <path d="M24,14 C18,6 12,8 9,12 C14,13 15,16 18,15 C20,18 28,18 30,15 C33,16 34,13 39,12 C36,8 30,6 24,14 Z" fill="#3fa63a" stroke="#1f5a17" stroke-width="1.2" stroke-linejoin="round"/>
    <g fill="#ffe08a"><ellipse cx="17" cy="23" rx="1.1" ry="1.7"/><ellipse cx="24" cy="24" rx="1.1" ry="1.7"/><ellipse cx="31" cy="23" rx="1.1" ry="1.7"/><ellipse cx="20" cy="30" rx="1.1" ry="1.7"/><ellipse cx="28" cy="30" rx="1.1" ry="1.7"/><ellipse cx="24" cy="36" rx="1.1" ry="1.7"/></g>${R(15, 20)}`,
	apple: M`<path d="M24,15 C16,8 5,13 6,25 C7,36 15,44 24,40 C33,44 41,36 42,25 C43,13 32,8 24,15 Z" fill="#7cc242" stroke="#2e5c12" stroke-width="1.4"/><path d="M24,15 C24,10 26,7 29,5" fill="none" stroke="#5a3a12" stroke-width="2" stroke-linecap="round"/>
    <path d="M27,9 C32,4 38,6 39,8 C36,12 30,12 27,9 Z" fill="#3fa63a" stroke="#1f5a17" stroke-width="1.1"/>${R(15, 20)}`,
	star: M`<path d="M24,4 L29.900,17.200 L44,18.900 L33.500,28.600 L36.400,42.700 L24,35.600 L11.600,42.700 L14.500,28.600 L4,18.900 L18.100,17.200 Z" fill="#ffd23f" stroke="#8a6a05" stroke-width="1.4" stroke-linejoin="round"/>${Un(20, 28, 24)}<path d="M20,29 q4,3 8,0" fill="none" stroke="#5a4503" stroke-width="1.2" stroke-linecap="round"/>${R(18, 17)}`,
	heart: M`<path d="M24,42 C6,30 2,18 9,11 C15,6 22,9 24,15 C26,9 33,6 39,11 C46,18 42,30 24,42 Z" fill="#f0486a" stroke="#7a0f28" stroke-width="1.4"/>${R(14, 17)}`,
	flower: M`<g fill="#f6a5c0" stroke="#8a3355" stroke-width="1.2"><circle cx="24" cy="10" r="8"/><circle cx="37" cy="19" r="8"/><circle cx="32" cy="35" r="8"/><circle cx="16" cy="35" r="8"/><circle cx="11" cy="19" r="8"/></g><circle cx="24" cy="24" r="8" fill="#ffd23f" stroke="#8a6a05" stroke-width="1.2"/>${R(21, 8)}`,
	sun: M`<g stroke="#e08a12" stroke-width="3.4" stroke-linecap="round"><path d="M24,3 v6 M24,39 v6 M3,24 h6 M39,24 h6 M9,9 l4.500,4.500 M34.500,34.500 l4.500,4.500 M39,9 l-4.500,4.500 M13.500,34.500 l-4.500,4.500"/></g><circle cx="24" cy="24" r="12.500" fill="#ffd23f" stroke="#8a6a05" stroke-width="1.4"/>${Un(20, 28, 22)}<path d="M19.500,27 q4.500,4 9,0" fill="none" stroke="#5a4503" stroke-width="1.3" stroke-linecap="round"/>${R(19, 17)}`,
	briefcase: M`<path d="M18,14 v-4 a3,3 0 0 1 3,-3 h6 a3,3 0 0 1 3,3 v4" fill="none" stroke="#1d1d1d" stroke-width="2.6"/><rect x="5" y="14" width="38" height="26" rx="4" fill="#3b3f46" stroke="#111" stroke-width="1.4"/><path d="M5,25 h38" stroke="#111" stroke-width="1.4"/><rect x="20.500" y="22" width="7" height="6" rx="1.5" fill="#c9a24b" stroke="#5a4310" stroke-width="1"/>${R(13, 19)}`,
	teddy: M`<circle cx="12" cy="11" r="6.500" fill="#b9793f" stroke="#5a3412" stroke-width="1.4"/><circle cx="36" cy="11" r="6.500" fill="#b9793f" stroke="#5a3412" stroke-width="1.4"/><circle cx="12" cy="11" r="3" fill="#e6b98a"/><circle cx="36" cy="11" r="3" fill="#e6b98a"/>
    <circle cx="24" cy="26" r="17" fill="#c58a4d" stroke="#5a3412" stroke-width="1.4"/><ellipse cx="24" cy="31.500" rx="7.500" ry="6" fill="#edc9a0"/>${Un(17.5, 30.5, 23)}<ellipse cx="24" cy="29" rx="2.600" ry="1.900" fill="#2a1705"/><path d="M24,31 v2.500 q-3,2 -4.500,.2 M24,33.500 q3,2 4.500,.2" fill="none" stroke="#2a1705" stroke-width="1.1" stroke-linecap="round"/>${R(15, 17)}`,
	teacup: M`<path d="M34,22 h4 a5.500,5.500 0 0 1 0,11 h-5" fill="none" stroke="#3a5a8a" stroke-width="3"/><path d="M7,18 h28 v9 a12,12 0 0 1 -12,12 h-4 a12,12 0 0 1 -12,-12 z" fill="#fdfaf2" stroke="#3a5a8a" stroke-width="1.4"/>
    <path d="M9,24 q12,5 24,0" fill="none" stroke="#3a5a8a" stroke-width="1.2"/><g fill="#e36a8a"><circle cx="15" cy="30" r="1.800"/><circle cx="21" cy="33" r="1.800"/><circle cx="27" cy="30" r="1.800"/></g><path d="M5,41 h32" stroke="#3a5a8a" stroke-width="2.400" stroke-linecap="round"/>
    <path d="M15,13 c-2,-3 2,-4 0,-7 M22,13 c-2,-3 2,-4 0,-7 M29,13 c-2,-3 2,-4 0,-7" fill="none" stroke="#9aa5b5" stroke-width="1.400" stroke-linecap="round"/>${R(13, 22)}`,
	menu: M`<g transform="rotate(-5 24 26)"><rect x="9" y="8" width="30" height="37" rx="1.5" fill="#fdf6df" stroke="#8a2a1c" stroke-width="1.4"/><rect x="9" y="8" width="30" height="10" fill="#d8432e"/>
    <path d="M14,24 h14 M14,29 h11 M14,34 h14 M14,39 h9" stroke="#6a5a48" stroke-width="1.600" stroke-linecap="round"/><path d="M32,24 h3 M32,29 h3 M32,34 h3 M32,39 h3" stroke="#d8432e" stroke-width="1.600" stroke-linecap="round"/></g>
    <circle cx="24" cy="9" r="6" fill="#2a9d8f" stroke="#14564e" stroke-width="1.4"/>${R(22, 7)}`
}, Gn = (e) => M`<svg class="novelty" viewBox="0 0 48 48" aria-hidden="true">${Wn[e]}</svg>`, Kn = M`<svg class="defs" width="0" height="0" aria-hidden="true"><defs>
  <radialGradient id="dome" cx=".36" cy=".28" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient>
</defs></svg>`, qn = 3;
function Jn(e, t, n, r = 0, i = () => !1) {
	let a = Array.from({ length: e }, (e, r) => Array.from({ length: n }, (e, n) => t(r, n + 1))), o = (e, t) => {
		let n = a[e].findIndex((e) => e <= t);
		return n < 0 ? Infinity : n + 1;
	}, s = (e, t, s) => {
		let c = [];
		for (let l = e, u = 0; l < t;) {
			let e = o(l, s);
			if (u += e, u > n) return;
			let d = 1;
			for (let n = a[l++][e - 1]; l < t && d < qn && !i(l) && n + r + a[l][e - 1] <= s; l++, d++) n += r + a[l][e - 1];
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
		for (let i = t + 1; i <= Math.min(e, t + n * qn); i++) {
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
function Yn(e) {
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
var Xn = 228, Zn = 14, Qn = 30, $n = 220, er = [80, 108], tr = 30, nr = [144, 172], rr = 250, ir = [110, 40], ar = (e) => Math.max(1, Math.floor((e + Zn) / Xn));
function or(e, t) {
	let n = Xn * t - Zn, r = (e, t) => Math.ceil(e / Math.max(1, Math.floor(n / t))), i = r(e.magnets, er[0]), a = Math.min(i, r(e.strips, er[0]) * 2);
	return $n + r(e.prints, nr[0]) * nr[1] + i * er[1] + a * tr + e.alarms * rr + r(e.words, ir[0]) * ir[1];
}
var sr = (e, t, n) => Jn(e.length, (t, n) => or(e[t], n), t, Qn, n), cr = "dash-bored-page", lr = "dash-bored-choose", ur = "dash-bored-family", dr = 120, fr = 450, pr = "button, a, input, textarea, summary, dialog, [role=button], [role=slider]", mr = (e, t, n, r) => e <= n && e > n - dr && t >= r && t < r + dr, hr = [
	{
		id: "gazette",
		name: "The Gazette",
		back: "the Gazette's box marked Other editions",
		says: "The house as a newspaper.",
		draw: (e, t) => j`<dash-bored-gazette .hass=${e} .narrow=${t} .panel=${!0}></dash-bored-gazette>`,
		still: j`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#f3eee0"/>
      <rect x="34" y="8" width="92" height="9" fill="#1c1a17"/><path d="M10,22 h140 M10,24.5 h140" stroke="#1c1a17" stroke-width=".8"/>
      <rect x="10" y="31" width="84" height="7" fill="#1c1a17"/><rect x="10" y="41" width="62" height="7" fill="#1c1a17"/>
      <path d="M10,56 h84 M10,62 h84 M10,68 h84 M10,74 h84 M10,80 h84 M10,86 h60 M104,34 h46 M104,40 h46 M104,46 h46 M104,52 h30 M104,66 h46 M104,72 h46 M104,78 h46 M104,84 h36" stroke="#1c1a17" stroke-opacity=".55" stroke-width="2"/>
      <path d="M99,30 v60" stroke="#1c1a17" stroke-width=".6"/></svg>`
	},
	{
		id: "console",
		name: "Console",
		back: "the Console's maker's plate",
		says: "The house as a control panel, in the style of a decade. Bakelite is the 1950s.",
		draw: (e, t) => j`<dash-bored-console .hass=${e} .narrow=${t} .panel=${!0}></dash-bored-console>`,
		still: j`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#66756a"/>
      <rect x="10" y="10" width="64" height="80" rx="8" fill="#2b1811"/><rect x="86" y="10" width="64" height="80" rx="8" fill="#2b1811"/>
      <rect x="18" y="17" width="48" height="30" rx="3" fill="#efe6c8"/><path d="M24,42 a18,18 0 0 1 36,0" fill="none" stroke="#2a1a10"/><path d="M42,44 L52,24" stroke="#151515" stroke-width="1.5"/>
      <circle cx="42" cy="68" r="14" fill="#161616"/><circle cx="42" cy="68" r="14" fill="none" stroke="#3a3a3a" stroke-width="3" stroke-dasharray="2 2"/><path d="M42,54 v7" stroke="#f4f0e4" stroke-width="2.5"/>
      <ellipse cx="118" cy="38" rx="15" ry="20" fill="#ff8a1e" opacity=".55"/><path d="M108,56 V32 Q108,18 118,16 Q128,18 128,32 V56 Z" fill="#cfe0e8" fill-opacity=".3" stroke="#dfe8ee"/><ellipse cx="118" cy="40" rx="4" ry="11" fill="#fff2b0"/>
      <rect x="100" y="70" width="36" height="10" rx="1.5" fill="#111" stroke="#777" stroke-width=".6"/></svg>`
	},
	{
		id: "fridge",
		name: "Fridge",
		back: "the Fridge's takeaway menu",
		says: "The house as a fridge door: polaroids, magnets and sticky notes. A young family's, a pair of yuppies' or grandparents'.",
		draw: (e, t) => j`<dash-bored-fridge .hass=${e} .narrow=${t} .panel=${!0}></dash-bored-fridge>`,
		still: j`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#efefe9"/><rect x="6" y="20" width="5" height="50" rx="2.5" fill="#9a9da2"/>
      <g transform="rotate(-3 45 40)"><rect x="24" y="16" width="42" height="48" fill="#fdfdf8" stroke="#bbb" stroke-width=".5"/><rect x="28" y="20" width="34" height="28" fill="#ffd166"/><circle cx="45" cy="15" r="5" fill="#e63946"/></g>
      <g transform="rotate(4 100 38)"><rect x="80" y="14" width="42" height="48" fill="#fdfdf8" stroke="#bbb" stroke-width=".5"/><rect x="84" y="18" width="34" height="28" fill="#27304d"/><circle cx="101" cy="13" r="5" fill="#2a9d8f"/></g>
      <rect x="128" y="18" width="26" height="26" fill="#fff48f" transform="rotate(5 141 31)"/><rect x="130" y="52" width="24" height="24" fill="#ff9db0" transform="rotate(-6 142 64)"/>
      <g><circle cx="34" cy="80" r="7" fill="#457b9d"/><circle cx="54" cy="82" r="7" fill="#b9b9b2"/><circle cx="92" cy="78" r="7" fill="#f4a261"/><circle cx="112" cy="81" r="7" fill="#9b5de5"/></g></svg>`
	},
	{
		id: "aurora",
		name: "Aurora",
		back: "the four squares on Aurora's bar",
		says: "The house in the current web style: glass tiles over a sky that warms as the lights come on. A room's tile grows into a sheet of faders.",
		draw: (e, t) => j`<dash-bored-aurora .hass=${e} .narrow=${t} .panel=${!0}></dash-bored-aurora>`,
		still: j`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#0b0d16"/>
      <circle cx="28" cy="22" r="46" fill="#5b6cf0" opacity=".45"/><circle cx="136" cy="30" r="42" fill="#22b8c8" opacity=".4"/><circle cx="92" cy="96" r="44" fill="#e0559c" opacity=".4"/><circle cx="140" cy="88" r="26" fill="#f2c14e" opacity=".5"/>
      <g fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".35" stroke-width=".6"><rect x="8" y="8" width="62" height="46" rx="8"/><rect x="8" y="60" width="62" height="12" rx="6"/><rect x="8" y="78" width="36" height="14" rx="6"/><rect x="48" y="78" width="22" height="14" rx="6"/>
        <rect x="76" y="8" width="36" height="40" rx="8"/><rect x="116" y="8" width="36" height="40" rx="8"/><rect x="76" y="52" width="36" height="40" rx="8"/><rect x="116" y="52" width="36" height="40" rx="8"/></g>
      <rect x="14" y="24" width="40" height="6" rx="3" fill="#fff"/><rect x="14" y="36" width="48" height="3" rx="1.5" fill="#fff" opacity=".6"/><rect x="14" y="42" width="34" height="3" rx="1.5" fill="#fff" opacity=".6"/>
      <circle cx="84" cy="40" r="3.5" fill="#fff"/><circle cx="94" cy="40" r="3.5" fill="#fff" opacity=".3"/><circle cx="124" cy="40" r="3.5" fill="#fff" opacity=".3"/><circle cx="84" cy="84" r="3.5" fill="#fff"/><circle cx="124" cy="84" r="3.5" fill="#fff"/></svg>`
	},
	{
		id: "digs",
		name: "Digs",
		beside: "4²",
		back: "the signboard in Digs",
		says: "The house in section, built of square blocks: a block for each device, lit by its lamps, with the household walking about in it.",
		draw: (e, t) => j`<dash-bored-digs .hass=${e} .narrow=${t} .panel=${!0}></dash-bored-digs>`,
		still: j`<svg viewBox="0 0 160 100" aria-hidden="true" shape-rendering="crispEdges"><rect width="160" height="100" fill="#7fb2ff"/><rect x="10" y="10" width="20" height="20" fill="#ffe45c"/>
      <rect y="80" width="160" height="10" fill="#5aa13c"/><rect y="90" width="160" height="10" fill="#7a5536"/><rect x="20" y="50" width="10" height="30" fill="#6b4a2b"/><rect x="10" y="30" width="30" height="20" fill="#3f7d2c"/>
      <rect x="60" y="30" width="90" height="50" fill="#b98a4e"/><rect x="60" y="20" width="90" height="10" fill="#9a3b2e"/><rect x="70" y="10" width="70" height="10" fill="#9a3b2e"/><rect x="60" y="50" width="90" height="5" fill="#7d5a30"/>
      <rect x="65" y="30" width="38" height="20" fill="#9c927c"/><rect x="107" y="30" width="38" height="20" fill="#5c5648"/><rect x="65" y="55" width="38" height="25" fill="#5c5648"/><rect x="107" y="55" width="38" height="25" fill="#9c927c"/>
      <rect x="80" y="30" width="10" height="10" fill="#ffe9a0"/><rect x="120" y="55" width="10" height="10" fill="#ffe9a0"/><rect x="135" y="60" width="10" height="20" fill="#9a6a34"/><rect x="122" y="66" width="6" height="14" fill="#e0913a"/></svg>`
	},
	{
		id: "contraption",
		name: "Contraption",
		back: "Contraption's lever",
		says: "A room as one absurd machine that ducks go through. Each duck is the engine of the device it is passing. So far, one room.",
		draw: (e, t) => j`<dash-bored-contraption .hass=${e} .narrow=${t} .panel=${!0}></dash-bored-contraption>`,
		still: j`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#f3e6c4"/>
      <g fill="none" stroke="#1c2a4a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M0,52 h56 M104,52 h56" stroke-width="4" stroke="#c0703a"/><path d="M30,84 h112 M52,74 h44"/>
        <circle cx="42" cy="74" r="10" fill="#f0b830"/><path d="M42,64 v20 M32,74 h20"/><circle cx="106" cy="74" r="8" fill="#8da0b3"/><path d="M106,66 v16 M98,74 h16"/>
        <rect x="118" y="66" width="20" height="16" rx="3" fill="#e2703a"/><path d="M138,74 h10 V16 h-22 v8"/>
        <circle cx="126" cy="34" r="16" fill="#ffe14d" stroke="none" opacity=".6"/><circle cx="126" cy="34" r="10" fill="#fff8e6"/>
        <ellipse cx="78" cy="42" rx="12" ry="7" fill="#ffd21f"/><circle cx="88" cy="32" r="5.5" fill="#ffd21f"/><path d="M93,31 l7,2 l-7,2 z" fill="#ff7a1a"/>
        <ellipse cx="20" cy="45" rx="9" ry="5" fill="#ffd21f"/><circle cx="27" cy="38" r="4" fill="#ffd21f"/></g></svg>`
	}
], gr = class extends Xe {
	constructor(...e) {
		super(...e), this.narrow = !1, this._family = hr[0].id, this._choosing = !1, this._last = 0, this._asked = () => this._choosing = !0, this._tap = (e) => {
			let t = this.getBoundingClientRect();
			if (e.composedPath().some((e) => e instanceof Element && e.matches(pr)) || !mr(e.clientX, e.clientY, t.right, Math.max(0, t.top))) return void (this._last = 0);
			e.timeStamp - this._last < fr && (this._choosing = !0), this._last = this._choosing ? 0 : e.timeStamp;
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
		this.styles = C`
    :host { display: block; }
    dialog { box-sizing: border-box; width: min(560px, calc(100vw - 24px)); padding: 18px; border: 0; border-radius: 12px; background: #24272b; color: #f1f1f1;
      font: 15px/1.4 system-ui, sans-serif; box-shadow: 0 16px 48px rgba(0,0,0,.5); }
    dialog::backdrop { background: rgba(0,0,0,.55); }
    h2 { margin: 0 0 12px; font-size: 18px; font-weight: 600; }
    .choices { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    /* Six families are three across and two down on a screen wider than it is tall, and two across and three down on an upright one. */
    @media (orientation: landscape) { dialog { width: min(840px, calc(100vw - 24px)); } .choices { grid-template-columns: repeat(3, 1fr); } }
    button { all: unset; display: flex; flex-direction: column; box-sizing: border-box; cursor: pointer; padding: 8px; border-radius: 8px; border: 2px solid transparent; background: #30343a; }
    button:hover, button:focus-visible { border-color: #9aa3ad; }
    button[aria-current="true"] { border-color: #6cb6ff; }
    svg { display: block; width: 100%; border-radius: 4px; margin-bottom: 8px; }
    b { display: block; } small { font-weight: 400; opacity: .6; } span { opacity: .75; font-size: 13px; }
    p { margin: 14px 0 0; opacity: .6; font-size: 13px; overflow-wrap: anywhere; }
  `;
	}
	set panel(e) {}
	connectedCallback() {
		super.connectedCallback();
		try {
			let e = localStorage.getItem(ur)?.replace(/^bakelite$/, "console");
			hr.some((t) => t.id === e) ? this._family = e : this._choosing = !0;
		} catch {}
		this.addEventListener("click", this._tap, !0), this.addEventListener(lr, this._asked);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.removeEventListener("click", this._tap, !0), this.removeEventListener(lr, this._asked);
	}
	_choose(e = this._family) {
		this._family = e, this._choosing = !1;
		try {
			localStorage.setItem(ur, e);
		} catch {}
	}
	updated() {
		let e = this.renderRoot.querySelector("dialog");
		e && !e.open && e.showModal();
	}
	render() {
		if (!this.hass) return N;
		let e = hr.find((e) => e.id === this._family);
		return j`${e.draw(this.hass, this.narrow)}
      ${this._choosing ? j`<dialog @close=${() => this._choose()} @click=${(e) => e.target === e.currentTarget && this._choose()}>
            <h2>Dash-Bored</h2>
            <div class="choices">
              ${hr.map((t) => j`<button aria-current=${t.id === e.id} @click=${() => this._choose(t.id)}>${t.still}<b>${t.name}${t.beside ? j` <small>${t.beside}</small>` : N}</b><span>${t.says}</span></button>`)}
            </div>
            <p>To choose again, press ${hr.map((e, t) => `${t === hr.length - 1 ? "or " : ""}${e.back}`).join(", ")}. Two presses in the top right corner of any of them do the same.</p>
          </dialog>` : N}`;
	}
}, _r = [
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
function vr(e) {
	let t = e.rooms.flatMap((e) => e.devices), n = Jt(e).filter((e) => e.on).length, r = t.filter((e) => e.kind === "lock" && !e.on && !e.away), i = e.rooms.filter((e) => e.temp !== void 0).sort((e, t) => t.temp - e.temp), a = e.people.filter((e) => e.place === "home").map((e) => e.name);
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
var yr = C`
  .door { --ink: #2b2b2b; --paper: #fdfdf8; --grease: rgba(90, 70, 50, .22); --hand: "Chalkboard SE", "Marker Felt", "Comic Sans MS", "Bradley Hand", cursive;
    position: relative; box-sizing: border-box; min-height: 100%; padding: 16px 26px 34px 76px; overflow: hidden; color: var(--ink); font-family: var(--hand); font-size: 15px;
    background: linear-gradient(90deg, rgba(0,0,0,.1), transparent 3%, transparent 96%, rgba(0,0,0,.12)), linear-gradient(175deg, #fcfcf9, #e7e7e1); }
  .door * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; overflow: visible; }
  .defs { position: absolute; }
  button:focus-visible, input:focus-visible { outline: 3px solid #2b6cb0; outline-offset: 3px; }
  .who, .urgent, .notes, .board { position: relative; z-index: 1; }
  /* A room's card: a piece of the door with one room on it, and no handle to leave room for. */
  .door.alone { padding: 6px 18px 22px; }

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
  /* The takeaway menu beside them opens the choice of family (shell.ts): it is no one's fridge, so it is never the biggest. */
  .who .menu:hover, .who .menu:focus-visible { opacity: 1; }
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
`, br = "dash-bored-fridge", xr = "dash-bored-fridge", Sr = "alarm_control_panel", Cr = "camera", wr = /* @__PURE__ */ new Set([
	"climate",
	"water_heater",
	"humidifier",
	"media_player"
]), Tr = {
	lock: ["locked", "unlocked"],
	cover: ["open", "shut"],
	valve: ["open", "shut"],
	siren: ["sounding", "quiet"],
	vacuum: ["cleaning", "home"],
	lawn_mower: ["mowing", "home"],
	media_player: ["playing", "paused"]
}, Er = {
	lock: "unlock",
	cover: "open",
	valve: "open",
	siren: "sound"
}, Dr = [
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
], Or = 6e3, kr = 5e3, Ar = 3e4, jr = 18e5, Mr = 8, Nr = class extends Ln {
	constructor(...e) {
		super(...e), this._skin = _r[0].id, this._alerts = [], this._seen = [], this._armed = "", this._tapped = "", this._cols = 1;
	}
	static {
		this.styles = [Nn, yr];
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
		super.connectedCallback(), this._recall(), In("Dash-Bored Hand", "HomemadeApple-Regular.ttf");
	}
	_recall() {
		let e = this._config.style;
		try {
			e ??= localStorage.getItem(xr) ?? void 0;
		} catch {}
		_r.some((t) => t.id === e) && (this._skin = e);
	}
	_dress(e) {
		this._skin = e;
		try {
			localStorage.setItem(xr, e);
		} catch {}
	}
	_resized(e) {
		let t = ar(this.renderRoot?.querySelector(".photos")?.clientWidth || e - 102);
		t !== this._cols && (this._cols = t);
	}
	updated() {
		this._resized(this.clientWidth);
	}
	_listen() {
		super._listen(), this._alone || this._follow(Tn, "Sensor Watch's alerts", (e) => {
			let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
			for (let n of e) t.set(n.entity_id, n);
			this._alerts = [...t.values()];
		}), this._follow(En, "The cameras' sightings", (e) => {
			let t = new Map(this._seen.map((e) => [e.id, e])), n = Date.now();
			for (let r of e) t.set(r.id, r), this._after(jr - (n - r.at * 1e3) + 1e3, () => this.requestUpdate());
			this._seen = [...t.values()].filter((e) => n - e.at * 1e3 < jr);
		});
	}
	_moved(e) {
		this._want?.id === e.id && (this._want = void 0), this._armed === e.id && (this._armed = "");
	}
	_press(e) {
		if (!e.away) {
			if (this._tapped = e.id, this._after(520, () => this._tapped === e.id && (this._tapped = "")), e.guarded && (e.kind === "lock" ? e.on : !e.on) && this._armed !== e.id) {
				this._armed = e.id, this._dropping = this._instead(this._dropping, Or, () => this._armed === e.id && (this._armed = ""));
				return;
			}
			this._armed = "", this._call(Zt(e), `${e.room} ${e.name}`);
		}
	}
	_level(e) {
		return this._want?.id === e.id ? this._want.level : wr.has(e.kind) ? e.level ?? e.span.min : e.on ? e.level ?? e.span.max : e.span.min;
	}
	_slide(e, t) {
		let n = Number(t.target.value);
		this._want = {
			id: e.id,
			level: n
		}, this._waiting = this._instead(this._waiting, kr, () => this._want = void 0), this._ask(e, n);
	}
	_figure(e, t) {
		let n = this._code?.id === e.id ? this._code.figures : "";
		this._code = {
			id: e.id,
			figures: t === "" ? n.slice(0, -1) : (n + t).slice(0, Mr)
		}, this._hiding = this._instead(this._hiding, Ar, () => this._code = void 0);
	}
	_throw(e) {
		this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.name), this._tapped = e.id, this._after(520, () => this._tapped === e.id && (this._tapped = ""));
	}
	_magnet(e, t) {
		let n = Ct.has(e.kind), r = this._level(e), i = e.away ? "not answering" : e.dims ? n ? e.on ? `${r}°` : "off" : e.kind === "media_player" ? e.on ? `vol ${r}` : "paused" : e.on || wr.has(e.kind) ? `${Math.round(r)}%` : Tr[e.kind]?.[1] ?? "off" : e.phase ?? Tr[e.kind]?.[+!e.on] ?? (e.on ? "on" : "off"), a = e.title ?? (n && e.temp !== void 0 ? `now ${e.temp}°` : ""), o = this._armed === e.id;
		return j`<div class="mag ${e.on ? "on" : ""} ${e.away ? "away" : ""} ${o ? "armed" : ""} ${this._tapped === e.id ? "tapped" : ""}" style="--c: ${t.colours[Rn(e.id, t.colours.length)]}; --r: ${I(e.id, 7)}deg">
      <button class="press" aria-pressed=${e.on} aria-label="${e.name}: ${i}${o ? `. Press again to ${Er[e.kind]}` : ""}" @click=${() => this._press(e)}>${Hn(e.kind, e.kind === "lock" && !e.on)}</button>
      <span class="name">${e.name}<small>${i}</small>${a ? j`<small class="also">${a}</small>` : N}</span>
      ${o ? j`<span class="again" role="status">again to ${Er[e.kind]}?</span>` : N}
      ${e.dims && !e.away ? j`<input class="strip" type="range" min=${e.span.min} max=${e.span.max} step=${e.span.step} .value=${String(r)} aria-label="${e.name}: ${n ? "temperature" : e.kind === "media_player" ? "volume" : "level"}" @input=${(t) => this._slide(e, t)} />` : N}
    </div>`;
	}
	_print(e, t, n, r, i, a = !1) {
		return j`<button class="print ${a ? "away" : ""}" style="--r: ${I(i, 5)}deg" aria-label="${e}${n ? `: ${n}` : ""}" @click=${() => s(this, "hass-more-info", { entityId: i })}>
      <span class="photo worn${Rn(i + "worn", 4)}">${t ? j`<img src=${t} alt="" loading="lazy" />` : j`<span class="blank">${a ? "no picture" : "…"}</span>`}</span>
      ${Gn(r)}
      <span class="tab">${e}${n ? j`<small>${n}</small>` : N}</span>
    </button>`;
	}
	_alarm(e, t) {
		let n = this._hass.states[e.id]?.attributes ?? {}, r = e.away ? "not answering" : e.phase === "triggered" ? "SOUNDING" : e.phase ?? (e.on ? "set" : "unset"), i = this._code?.id === e.id ? this._code.figures : "", a = (t, n) => () => {
			this._call({
				domain: Sr,
				service: t,
				ids: [e.id],
				data: i ? { code: i } : void 0
			}, `${e.room} ${e.name} (${n})`), this._code = void 0;
		}, o = e.on || e.phase ? [["alarm_disarm", "unset"]] : Dr.filter(([, e]) => n.supported_features & e).map(([e, , t]) => [e, t]);
		return j`<div class="alarm ${e.phase === "triggered" ? "sounding" : ""}" style="--r: ${I(e.id, 3)}deg">
      <div class="status">${e.name}: <b>${r}</b></div>
      ${n.code_format === "number" && !e.away ? j`<div class="code" role="status" aria-label="Code: ${i.length} figures">${i || "code?"}</div>
            <div class="keys">${[..."1234567890"].map((n, r) => j`<button style="--c: ${t.colours[r % t.colours.length]}; --r: ${I(e.id + n, 9)}deg" aria-label="Figure ${n}" @click=${() => this._figure(e, n)}>${n}</button>`)}
              <button class="back" aria-label="Take the last figure off" @click=${() => this._figure(e, "")}>←</button></div>` : N}
      ${e.away ? N : j`<div class="words">${o.map(([t, n]) => j`<button style="--r: ${I(e.id + n, 5)}deg" @click=${a(t, n)}>${n}</button>`)}</div>`}
    </div>`;
	}
	render() {
		let e = this._house, t = _r.find((e) => e.id === this._skin) ?? _r[0];
		if (!this._hass || !e) return j`<div class="door ${t.id}"><div class="urgent">Waiting for Home Assistant…</div></div>`;
		let n = (e) => e.kind === Cr, r = (e) => e.devices.filter((e) => e.kind !== Sr || this._hass.states[e.id]?.attributes.code_format !== "text"), i = Date.now(), a = /* @__PURE__ */ new Map();
		for (let e of this._survey ? qt(this._survey, this._seen) : []) i - e.at < jr && e.at >= (a.get(e.camera)?.at ?? 0) && a.set(e.camera, e);
		let o = new Set(e.rooms.flatMap((e) => e.devices.filter(n).map((e) => e.id))), c = 0, l = (e, t) => j`<button class=${this._tapped === e.id ? "tapped" : ""} style="--r: ${I(e.id, 5)}deg" aria-label="Scene: ${e.full}" @click=${() => this._throw(e)}>${t}</button>`, u = e.rooms.filter((e) => r(e).length || e.temp !== void 0 || e.scenes.length), d = u.some((e) => e.floor), f = (e) => d && u[e].floor !== u[e - 1]?.floor, p = u.map((e) => {
			let t = r(e), i = t.filter((e) => !n(e) && e.kind !== Sr);
			return {
				magnets: i.length,
				strips: i.filter((e) => e.dims).length,
				prints: t.filter(n).length,
				alarms: t.length - i.length - t.filter(n).length,
				words: e.scenes.length
			};
		}), m = JSON.stringify([
			this._cols,
			p,
			u.map((e) => e.floor)
		]);
		this._rows?.key !== m && (this._rows = {
			key: m,
			placed: sr(p, this._cols, f)
		});
		let h = Yn(this._rows.placed), g = (e) => {
			let i = r(e), o = i.filter((e) => e.kind === "light" && !e.away), s = o.some((e) => e.on), u = this._hass.areas?.[e.id]?.picture ?? void 0, d = e.devices.length - i.length;
			return j`<section class="room">
        <div class="snap" style="--r: ${I(e.id, 3)}deg">
          <div class="polaroid ${s ? "lit" : ""} worn${Rn(e.id + "worn", 4)}">
            <button class="pic" ?disabled=${!o.length} aria-label="${e.name}: ${o.length ? `lights ${s ? "on" : "off"}. Press to turn them all ${s ? "off" : "on"}` : "no lights"}" @click=${() => this._lights(e)}>
              ${u ? j`<img src=${u} alt="" loading="lazy" />` : j`<span class="scene"><i class="window"></i><i class="lamp"></i></span>`}
            </button>
            <div class="cap"><span>${e.name}</span>${e.temp === void 0 ? N : j`<small>${e.temp.toFixed(1)}°</small>`}</div>
          </div>
          ${Gn(t.holders[Rn(e.id, t.holders.length)])}
        </div>
        <div class="magnets">
          ${i.filter(n).map((e) => {
				let n = a.get(e.id);
				return this._print(e.name, n?.photo ?? (e.away ? "" : e.picture ?? ""), n ? `${n.kind} ${F(n.at)}` : e.away ? "not answering" : "", t.holders[c++ % t.holders.length], e.id, e.away);
			})}
          ${i.filter((e) => !n(e) && e.kind !== Sr).map((e) => this._magnet(e, t))}
          ${i.filter((e) => e.kind === Sr).map((e) => this._alarm(e, t))}
          ${d ? j`<span class="more">and ${d} more that the door has no magnet for</span>` : N}
        </div>
        ${e.scenes.length ? j`<div class="poetry">${e.scenes.map((e) => l(e, e.name))}</div>` : N}
      </section>`;
		}, _ = j`${this._lost ? j`<div class="urgent" role="alert">No connection to Home Assistant since ${F(this._lost)}. What is on the door is as it was then.</div>` : N}
      ${this._fault ? j`<div class="urgent" role="alert">${this._fault}</div>` : N}`;
		if (this._alone) return j`<div class="door ${t.id} alone">
        ${Kn}
        ${_}
        ${u[0] ? g(u[0]) : j`<div class="urgent">${this._vacant}</div>`}
      </div>`;
		let v = h.map((e) => {
			let t = u[e.things[0]].floor;
			return j`${f(e.things[0]) ? j`<div class="floor ${e.column > 1 ? "beside" : ""}" style="grid-row: ${e.row * 2 + 1}; grid-column: ${e.column} / span ${e.wide}"><span style="--r: ${I(t ?? "elsewhere", 2)}deg">${t ?? "Elsewhere"}</span></div>` : N}<div class="bay" style="grid-row: ${e.row * 2 + 2}; grid-column: ${e.column} / span ${e.wide}">${e.things.map((e) => g(u[e]))}</div>`;
		}), y = this._alerts.filter((e) => e.level !== mn).sort((e, t) => (gn[t.level] ?? 0) - (gn[e.level] ?? 0) || e.began - t.began), b = e.scenes.flatMap((e, n) => [t.words[n % t.words.length], e]);
		return j`<div class="door ${t.id}">
      ${Kn}
      <div class="wear" aria-hidden="true"><i class="fingers a"></i><i class="fingers b"></i><i class="fingers c"></i><i class="fingers d"></i><i class="smear"></i><i class="dab"></i><i class="streak"></i><i class="scribble"></i></div>
      <div class="handle" aria-hidden="true"></div>
      <div class="who" role="radiogroup" aria-label="Whose fridge this is">
        ${this._config.style ? N : _r.map((e) => j`<button role="radio" aria-checked=${e.id === t.id} style="--r: ${I(e.id, 6)}deg" @click=${() => this._dress(e.id)}>${Gn(e.picker)}<span>${e.label}</span></button>`)}
        ${this.hasAttribute("panel") ? j`<button class="menu" aria-label="Choose another style of Dash-Bored" style="--r: ${I("menu", 6)}deg" @click=${() => s(this, lr)}>${Gn("menu")}<span>Other styles</span></button>` : N}
      </div>
      ${_}
      ${y.length ? j`<div class="notes">${y.map((e) => j`<div class="postit ${e.level}" role="status" style="--r: ${I(e.entity_id, 4)}deg"><b>${e.name}</b>${e.message || e.level}<small>since ${F(e.began * 1e3)}</small></div>`)}</div>` : N}
      <div class="board">
        <aside class="side">
          <div class="pad"><h2>${t.pad}</h2><ul>${vr(e).map((e) => j`<li>${e}</li>`)}</ul><i class="ring" aria-hidden="true"></i></div>
          ${b.length ? j`<div class="poetry">${b.map((e, t) => typeof e == "string" ? j`<span style="--r: ${I(e + t, 5)}deg">${e}</span>` : l(e, e.full))}</div>` : N}
          ${[...a.values()].filter((e) => !o.has(e.camera)).map((e, n) => this._print(e.name, e.photo ?? "", `${e.kind} ${F(e.at)}`, t.holders[(c + n) % t.holders.length], e.camera))}
          <div class="extra" style="--r: ${I(t.extra.title, 4)}deg" aria-hidden="true"><b>${t.extra.title}</b>${t.extra.lines.map((e) => j`<span>${e}</span>`)}${Gn(t.extra.holder)}</div>
        </aside>
        <div class="photos" style="--cols: ${this._cols}">${v}</div>
      </div>
    </div>`;
	}
}, Pr = {
	...Tr,
	alarm_control_panel: ["set", "unset"],
	camera: ["look", "look"]
}, Fr = /* @__PURE__ */ new Set(["camera", "alarm_control_panel"]), Ir = 6e3, Lr = 5e3, Rr = 1500, zr = class extends Ln {
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
		}, this._waiting = this._instead(this._waiting, Lr, () => this._dragging || (this._want = void 0)), this._ask(e, a);
	}
	_drag(e, t) {
		let n = t.currentTarget;
		if (t.type === "pointerdown") n.setPointerCapture(t.pointerId), this._dragging = e.id;
		else if (this._dragging !== e.id) return;
		let r = n.getBoundingClientRect();
		this._set(e, e.span.min + (r.bottom - t.clientY) / r.height * (e.span.max - e.span.min));
	}
	_drop() {
		this._dragging = "", this._waiting = this._instead(this._waiting, Lr, () => this._want = void 0);
	}
	_press(e) {
		if (!e.away) {
			if (Fr.has(e.kind)) return this._open = "", s(this, "hass-more-info", { entityId: e.id });
			if (e.guarded && (e.kind === "lock" ? e.on : !e.on) && this._armed !== e.id) {
				this._armed = e.id, this._dropping = this._instead(this._dropping, Ir, () => this._armed === e.id && (this._armed = ""));
				return;
			}
			this._armed = "", this._call(Zt(e), `${e.room} ${e.name}`);
		}
	}
	_throw(e) {
		this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.full), this._thrown = e.id, this._after(Rr, () => this._thrown === e.id && (this._thrown = ""));
	}
	_scene(e, t) {
		return j`<button class=${this._thrown === e.id ? "thrown" : ""} @click=${() => this._throw(e)}>${t}</button>`;
	}
	_stands(e) {
		return e.away ? "not answering" : e.dims && e.on && e.kind !== "media_player" ? Ct.has(e.kind) ? `${this._level(e)}°` : `${Math.round(this._level(e))}%` : e.phase ?? Pr[e.kind]?.[+!e.on] ?? (e.on ? "on" : "off");
	}
	_pic(e) {
		return j`<svg class="pic" viewBox="0 0 24 24" aria-hidden="true">${Vn(e.kind, e.kind === "lock" && !e.on)}</svg>`;
	}
	_control(e) {
		let t = this._level(e), n = this._stands(e);
		if (e.dims && !e.away && Ct.has(e.kind)) return j`<div class="key ${e.on ? "on" : ""}">
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
			}, i = (t) => this._drag(e, t), a = j`<span class="face" aria-hidden="true"><b>${this._pic(e)}${t > e.span.min ? `${Math.round(t)}%` : n}</b><span>${e.name}</span></span>`;
			return j`<div class="fader ${this._dragging === e.id ? "drag" : ""}" role="slider" tabindex="0" aria-label=${e.name} aria-valuemin=${e.span.min} aria-valuemax=${e.span.max} aria-valuenow=${t}
        style="--lvl: ${(t - e.span.min) / (e.span.max - e.span.min)}" @pointerdown=${i} @pointermove=${i} @pointerup=${this._drop} @pointercancel=${this._drop} @keydown=${r}>
        ${a}<i>${a}</i>
      </div>`;
		}
		let r = this._armed === e.id;
		return j`<button class="key ${e.on ? "on" : ""} ${e.away ? "away" : ""} ${r ? "armed" : ""}" aria-pressed=${e.on} ?disabled=${e.away} @click=${() => this._press(e)}>
      <b>${this._pic(e)}</b><span>${e.name}<em role=${r ? "status" : N}>${r ? `again to ${Er[e.kind]}?` : n}</em></span>
    </button>`;
	}
}, Br = (e) => e.rooms.flatMap((e) => e.devices).filter((e) => e.kind === "camera");
function Vr(e, t, n, r) {
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
		says: i ? `${i.kind} ${F(i.at)}` : n.has(a) ? `as at ${F(n.get(a))}` : "",
		at: i?.at ?? 0
	} : {
		d: e,
		src: a,
		says: i ? `${i.kind} ${F(i.at)}` : "no picture",
		at: i?.at ?? 0
	};
}
var Hr = (e, t, n = "") => e.src ? j`<img class=${n} src=${e.src} alt="" loading="lazy" @load=${() => t.came(e.src)} @error=${() => t.failed(e.src)} />` : N, Ur = (e, t) => j`<button class="shot" aria-label="${e.d.name}${e.says ? `: ${e.says}` : ""}. See it live" ?disabled=${e.d.away} @click=${() => t.look(e.d)}>
    ${Hr(e, t)}<span><b>${e.d.name}</b>${e.says}</span>
  </button>`;
function Wr(e, t) {
	let n = e.zoom;
	return j`${e.presets?.length ? j`<nav class="scenes" aria-label="${e.name}: where it can be turned to">${e.presets.map((n) => j`<button @click=${() => t.turn(e, n)}>${n.name}</button>`)}</nav>` : N}
    ${n ? j`<label class="zoomer">Zoom<input type="range" min=${n.span.min} max=${n.span.max} step=${n.span.step} .value=${String(n.level)}
            @change=${(n) => t.zoom(e, Number(n.target.value))} /></label>` : N}
    ${e.controls?.length ? j`<div class="controls">${e.controls.map((n) => n.device ? t.device(n.device) : j`<button class="key ${n.away ? "away" : ""}" ?disabled=${n.away} @click=${() => t.press(e, n)}><b></b><span>${n.name}<em>${n.away ? "not answering" : "press"}</em></span></button>`)}</div>` : N}`;
}
//#endregion
//#region src/dash-bored/aurora/settings.ts
var Gr = (e, t) => e.flatMap((e) => (e.choices ?? []).map((n) => j`<div class="choice"><span class="label">${e.name} · ${n.what}</span>
        <nav class="scenes" aria-label="${e.name}: ${n.what}">
          ${n.options.map((r) => j`<button class=${r === n.now ? "thrown" : ""} aria-pressed=${r === n.now} @click=${() => t(e, n, r)}>${ht(r)}</button>`)}
        </nav></div>`)), Kr = {
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
}, qr = "ground", Jr = 40, Yr = 24, Xr = 12, Zr = 2.5, Qr = 7, $r = .35, ei = 160, ti = 260, ni = 18, ri = 1 / 7;
function z(e) {
	e.seed = e.seed + 1831565813 | 0;
	let t = Math.imul(e.seed ^ e.seed >>> 15, 1 | e.seed);
	return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function ii(e, t, n = !1) {
	let { how: r, swing: i, rate: a } = e.move;
	Object.assign(t, {
		state: "air",
		dir: z(e) < .5 ? -1 : 1,
		rate: a * (.7 + z(e) * .6),
		a: (z(e) - .5) * i * 2,
		vx: 0,
		vy: 0,
		rest: z(e) * 14,
		blow: z(e) * 2 - 1,
		pace: .55 + z(e) * .9,
		off: ""
	}), t.w = (z(e) - .5) * t.rate, r === "cross" ? (t.x = n ? z(e) * e.wide : t.dir > 0 ? -40 : e.wide + Jr, t.y = e.tall * (.08 + z(e) * .55)) : (t.x = z(e) * e.wide, t.y = n ? z(e) * e.tall * .9 : r === "rise" ? e.tall + Jr : -40 - z(e) * 60);
}
var ai = (e) => 300 + z(e) * 180, oi = (e, t) => e.ledges.find((e) => e.id === t), si = (e, t) => Math.max(0, Math.min(e.heap.length - 1, Math.floor((t - e.from) / (e.to - e.from) * e.heap.length))), ci = (e, t) => e.top - 4 - e.heap[si(e, t)], li = (e, t) => ({
	...e,
	heap: t ?? Array(Math.max(1, Math.ceil((e.to - e.from) / Yr))).fill(0)
});
function ui(e, t, n) {
	let r = si(t, n);
	for (let [e, n] of [
		[r - 1, Zr / 2],
		[r, Zr],
		[r + 1, Zr / 2]
	]) t.heap[e] !== void 0 && (t.heap[e] = Math.min(Xr, t.heap[e] + n));
	e.changed.add(t.id);
}
function di(e, t, n, r, i = 1) {
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
	a.every = ai(a), pi(a, n, r);
	for (let e of a.motes.slice(0, t)) ii(a, e, !0);
	return a;
}
function fi(e, t) {
	let n = oi(e, t);
	if (!n) return;
	let r = (n, r, i) => Object.assign(n, {
		state: "air",
		x: r,
		y: i,
		vx: (z(e) - .5) * 140,
		vy: z(e) * 150 - 90,
		pace: .55 + z(e) * .9,
		off: t,
		on: ""
	});
	for (let n of e.motes) n.state === "down" && n.on === t && r(n, n.x, n.y);
	n.heap.forEach((t, i) => {
		let a = t > 3 ? e.motes.find((e) => e.state === "spare") : void 0;
		a && r(a, n.from + (i + .5) * (n.to - n.from) / n.heap.length, n.top - t);
	}), n.heap.some((e) => e) && e.changed.add(t), n.heap.fill(0);
}
function pi(e, t, n, r = []) {
	let i = [...r, {
		id: qr,
		from: -40,
		to: t + Jr,
		top: n - 14
	}].map((e) => li(e));
	for (let t of e.ledges) {
		let n = i.find((e) => e.id === t.id);
		n?.heap.length === t.heap.length ? n.heap = t.heap : fi(e, t.id), (n?.top !== t.top || n?.from !== t.from) && e.changed.add(t.id);
	}
	Object.assign(e, {
		wide: t,
		tall: n,
		ledges: i
	});
	for (let t of e.motes) t.state === "down" && (t.y = ci(oi(e, t.on), t.x) - t.rest / 2);
}
function mi(e) {
	if (!e.heap.some((e) => e)) return "";
	let t = (e.to - e.from) / e.heap.length, n = (n) => [e.from + (n + .5) * t, e.top - (e.heap[n] ?? 0)], r = e.heap.map((t, r) => {
		let [[i, a], [o, s]] = [n(r), n(r + 1)];
		return r === e.heap.length - 1 ? `Q${i.toFixed(1)} ${a.toFixed(1)} ${e.to.toFixed(1)} ${e.top}` : `Q${i.toFixed(1)} ${a.toFixed(1)} ${((i + o) / 2).toFixed(1)} ${((a + s) / 2).toFixed(1)}`;
	});
	return `M${e.from.toFixed(1)} ${e.top}${r.join("")}Z`;
}
function hi(e, t) {
	let [n, r, i] = e.air;
	return e.move.wind * (t.blow * (n / 18) * (1.2 - .5 * t.y / e.tall) + r / 25 * .3 * Math.sin(t.x / 170 + i / 8));
}
var gi = (e, t) => e.move.how === "cross" ? t.vy / 160 * t.dir : t.a, _i = (e) => e.motes.filter((e) => e.state === "air" || e.state === "thrown").length;
function vi(e, t, n) {
	for (let r of e.ledges) {
		if (r.id === t.off || t.x < r.from || t.x > r.to) continue;
		let i = ci(r, t.x);
		if (n >= i || t.y < i) continue;
		let a = z(e) < $r, o = _i(e) > e.count;
		if (a) {
			let n = e.motes.find((e) => e.state === "spare");
			return !n && !o ? ui(e, r, t.x) : Object.assign(t, {
				state: "down",
				on: r.id,
				age: 0,
				y: i - t.rest / 2,
				a: (z(e) - .5) * .6
			}), o ? void 0 : ii(e, n ?? t);
		}
		if (r.id === "ground") {
			o ? t.state = "spare" : ii(e, t);
			return;
		}
	}
}
function yi(e, t, n, r) {
	let { how: i, swing: a, snap: o, slide: s } = e.move, c = e.move.speed * t.pace;
	t.w += (o * (1 - (t.a / a) ** 2) * t.w - t.rate ** 2 * t.a) * n + r * a * 1.5 * n, t.a = Math.max(-3 * a, Math.min(3 * a, t.a + t.w * n));
	let l = Math.min(1, Math.abs(t.w) / (2 * a * t.rate)), u = hi(e, t), [d, f] = i === "cross" ? [t.dir * c + .3 * u, s * t.w] : [u + s * t.w, (i === "rise" ? -1 : 1) * c * (.4 + .6 * l)], p = Math.min(1, 3 * n), m = t.y;
	if (t.vx += (d - t.vx) * p, t.vy += (f - t.vy) * p, t.x += t.vx * n, t.y += t.vy * n, i === "cross") {
		t.y = Math.max(e.tall * .04, Math.min(e.tall * .7, t.y)), (t.x < -40 || t.x > e.wide + Jr) && ii(e, t);
		return;
	}
	t.x < -40 && (t.x += e.wide + 80), t.x > e.wide + Jr && (t.x -= e.wide + 80), i === "fall" ? vi(e, t, m) : t.y < -40 && ii(e, t);
}
function bi(e, t) {
	e.vy += 520 * t, e.x += e.vx * t, e.y += e.vy * t, e.a += e.w * t, e.vy >= 0 && Object.assign(e, {
		state: "air",
		w: 0
	});
}
function xi(e, t, n) {
	t.age += n, !(t.age < Qr + t.rest / 4) && (ui(e, oi(e, t.on), t.x), t.state = "spare");
}
var Si = (e, t) => ({
	state: "thrown",
	on: "",
	off: "",
	vx: -t.dir * (60 + z(e) * 160),
	vy: -(300 + z(e) * 260),
	w: (z(e) - .5) * 12
});
function Ci(e, t, n) {
	let r = e.move.tidy === "blower";
	for (let i of e.motes) i.state !== "down" || i.on !== n.id || Math.abs(i.x - t.x) > ni || (r || z(e) < ri ? Object.assign(i, Si(e, t)) : i.state = "spare");
	let i = si(n, t.x);
	if (!n.heap[i] || t.x < n.from || t.x > n.to) return;
	let a = r && n.heap[i] > 3 ? e.motes.find((e) => e.state === "spare") : void 0;
	a && Object.assign(a, Si(e, t), {
		x: t.x,
		y: n.top - n.heap[i]
	}), n.heap[i] = 0, e.changed.add(n.id);
}
function wi(e, t) {
	if (e.since += t, !e.tidy && e.since > e.every) {
		let t = e.ledges.filter((t) => t.heap.some((e) => e) || e.motes.some((e) => e.state === "down" && e.on === t.id));
		if (!t.length) return;
		let n = z(e) < .5 ? -1 : 1;
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
	for (; n.route.length && !oi(e, n.route[0]);) Object.assign(n, {
		route: n.route.slice(1),
		driving: !1
	});
	let r = oi(e, n.route[0] ?? ""), [i, a] = r ? [Math.max(r.from, -40), Math.min(r.to, e.wide + Jr)] : [0, 0];
	if (r && n.driving) {
		n.x += n.dir * ei * t, n.y = r.top - 4, Ci(e, n, r), (n.dir > 0 ? n.x >= a : n.x <= i) && Object.assign(n, {
			route: n.route.slice(1),
			driving: !1
		});
		return;
	}
	let [o, s] = r ? [Math.abs(n.x - i) < Math.abs(n.x - a) ? i : a, r.top - 4] : [n.x < e.wide / 2 ? -80 : e.wide + 80, n.y], c = Math.hypot(o - n.x, s - n.y), l = Math.min(1, ti * t / (c || 1));
	Math.abs(o - n.x) > 1 && (n.dir = o > n.x ? 1 : -1), n.x += (o - n.x) * l, n.y += (s - n.y) * l, !(l < 1) && (r ? Object.assign(n, {
		driving: !0,
		dir: o === i ? 1 : -1
	}) : Object.assign(e, {
		tidy: void 0,
		since: 0,
		every: ai(e)
	}));
}
function Ti(e, t) {
	t = Math.min(t, .05);
	let [n, r, i] = e.air, a = t * .3;
	e.air = [
		n + 10 * (r - n) * a,
		r + (n * (28 - i) - r) * a,
		i + (n * r - 8 / 3 * i) * a
	];
	let o = t ? (e.air[0] - n) / 18 / t : 0;
	for (let n of e.motes) n.state === "air" ? yi(e, n, t, o) : n.state === "thrown" ? bi(n, t) : n.state === "down" && xi(e, n, t);
	return e.move.tidy && wi(e, t), e;
}
//#endregion
//#region src/dash-bored/aurora/drifting.ts
var Ei = 22, Di = 56, Oi = {
	flake: ["#fff", "#cfe0f1"],
	leaf: ["#c9742a", "#8a4a17"],
	petal: ["#f8cfe0", "#e9a3c1"]
}, ki = class {
	constructor() {
		this._ledges = [], this._ids = /* @__PURE__ */ new WeakMap(), this._named = 0, this._sizes = new ResizeObserver(() => this._measure()), this._watching = !1, this._things = [], this._machine = null, this._heaps = /* @__PURE__ */ new Map(), this._drawn = [], this._frame = 0, this._last = 0, this._tick = (e) => {
			Ti(this._field, this._last ? (e - this._last) / 1e3 : 0), this._last = e, this._paint(), this._frame = requestAnimationFrame(this._tick);
		};
	}
	over(e, t) {
		let n = Kr[e?.dataset.glyph ?? ""];
		if (!e || !n) return this.stop();
		let r = e !== this._host || n !== this._field?.move;
		if (r && (this._field = di(n, Number(e.dataset.count), e.clientWidth, e.clientHeight, Date.now() | 0), this._things = [...e.querySelectorAll(".m")], this._machine = e.querySelector(".machine"), this._drawn = [], e.querySelector(".heaps")?.replaceChildren(), this._heaps.clear()), r || !this._watching) {
			this._watching = !0, this._sizes.disconnect();
			for (let n of [e, t[0]]) n && this._sizes.observe(n);
		}
		return [this._host, this._ledges] = [e, t], this._measure(), matchMedia("(prefers-reduced-motion: reduce)").matches ? this.stop()._paint() : (this._frame ||= (this._last = 0, requestAnimationFrame(this._tick)), this);
	}
	shake(e) {
		let t = e && this._ids.get(e);
		return t && this._field && fi(this._field, t), this;
	}
	stop() {
		return cancelAnimationFrame(this._frame), this._frame = 0, this._sizes.disconnect(), this._watching = !1, this;
	}
	_measure() {
		if (!this._field || !this._host?.isConnected) return;
		let e = this._host.getBoundingClientRect(), t = this._ledges.flatMap((t) => {
			let n = t.getBoundingClientRect();
			return n.width < 88 || n.top - e.top < Di ? [] : (this._ids.has(t) || this._ids.set(t, `l${++this._named}`), [{
				id: this._ids.get(t),
				from: n.left - e.left + Ei,
				to: n.right - e.left - Ei,
				top: n.top - e.top
			}]);
		});
		pi(this._field, e.width, e.height, t);
	}
	_set(e, t, n) {
		t && this._drawn[e] !== n && (this._drawn[e] = n, t.style.transform = n, t.style.visibility = n ? "visible" : "hidden");
	}
	_heap() {
		let e = this._field, [t, n] = Oi[this._host.dataset.glyph] ?? ["#fff", "#ccc"];
		for (let r of e.changed) {
			let i = e.ledges.find((e) => e.id === r), a = this._heaps.get(r);
			if (!i) {
				a?.remove(), this._heaps.delete(r);
				continue;
			}
			a || (a = document.createElementNS("http://www.w3.org/2000/svg", "path"), a.setAttribute("fill", t), a.setAttribute("stroke", n), this._host.querySelector(".heaps")?.append(a), this._heaps.set(r, a)), a.setAttribute("d", mi(i));
		}
		e.changed.clear();
	}
	_paint() {
		let e = this._field;
		e.motes.forEach((t, n) => this._set(n, this._things[n], t.state === "spare" ? "" : `translate(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px) rotate(${gi(e, t).toFixed(2)}rad)`)), e.changed.size && this._heap();
		let t = e.tidy;
		return this._set(e.motes.length, this._machine, t ? `translate(${t.x.toFixed(1)}px, ${(t.y - 50).toFixed(1)}px) scaleX(${t.dir})` : ""), this._machine?.classList.toggle("flying", !!t && !t.driving), this;
	}
}, Ai = {
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
function ji(e) {
	let t = e % 19, [n, r] = [Math.floor(e / 100), e % 100], i = (19 * t + n - Math.floor(n / 4) - Math.floor((n - Math.floor((n + 8) / 25) + 1) / 3) + 15) % 30, a = (32 + n % 4 * 2 + 2 * Math.floor(r / 4) - i - r % 4) % 7, o = Math.floor((t + 11 * i + 22 * a) / 451), s = i + a - 7 * o + 114;
	return [Math.floor(s / 31), s % 31 + 1];
}
var Mi = [
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
], Ni = [
	"snow",
	"spring",
	"summer",
	"autumn"
];
function Pi(e, t = !1, n = "") {
	let [r, i] = [e.getMonth() + 1, e.getDate()], a = r * 100 + i, o = Mi.find(([, e, t, r, i, o]) => a >= e * 100 + t && a <= r * 100 + i && (!o || o === n));
	if (o) return o[0];
	let [s, c] = ji(e.getFullYear()), l = Math.round((new Date(e.getFullYear(), r - 1, i).getTime() - new Date(e.getFullYear(), s - 1, c).getTime()) / 864e5);
	return l >= -2 && l <= 1 ? "easter" : Ni[(Math.floor(r % 12 / 3) + (t ? 2 : 0)) % 4];
}
var Fi = (e, t) => (e * 61.803 + t * 37.7) % 100 / 100;
function Ii({ glyph: e, count: t, hues: n, colour: r }) {
	let i = Kr[e], a = t + (i?.tidy ? 30 : 0), o = Array.from({ length: a }, (t, a) => {
		let o = r ? `color: ${r}` : n ? `color: oklch(.72 .2 ${n[a % n.length]})` : "";
		if (i) return j`<svg class="m" viewBox="0 0 24 24" style="--s: ${((i.how === "cross" ? 22 : 10) + Fi(a, 1) * 16).toFixed(0)}px; ${o}">${st[e]}</svg>`;
		let s = 2.4 + Fi(a, 2) * 1.6;
		return j`<svg class="p" viewBox="0 0 24 24" style="--x: ${(Fi(a, 3) * 100).toFixed(1)}%; --y: ${(8 + Fi(a, 4) * 55).toFixed(1)}%; --s: ${(90 + Fi(a, 1) * 110).toFixed(0)}px; --d: ${s.toFixed(1)}s; --w: -${(Fi(a, 5) * s * 3).toFixed(1)}s; ${o}">${st[e]}</svg>`;
	});
	return [
		i?.tidy ? j`<svg class="heaps" width="100%" height="100%"></svg>` : N,
		o,
		i?.tidy ? j`<svg class="machine" viewBox="0 -12 60 56">${lt[i.tidy]}</svg>` : N
	];
}
var Li = (e) => j`<svg class="top" width=${e} height="46" viewBox="0 0 ${e} 46">
    <path d="M0 6${Array.from({ length: Math.ceil(e / 120) }, () => "q60 26 120 0").join("")}" fill="none" stroke="#3a3f4a" stroke-width="1.6"/>
    ${Array.from({ length: Math.ceil(e / 40) }, (e, t) => {
	let n = (t * 40 + 20) % 120 / 120;
	return M`<ellipse class="twinkle" cx=${t * 40 + 20} cy=${12 + 52 * n * (1 - n)} rx="4.5" ry="6.5" fill="oklch(.74 .2 ${[
		25,
		140,
		85,
		260,
		330
	][t % 5]})" style="animation-delay: -${t * .7 % 3}s"/>`;
})}
  </svg>`, Ri = j`<svg class="top flip" width="150" height="190" viewBox="0 0 150 190">
    <path d="M0 0L140 20M0 0L110 70M0 0L60 120M0 0L10 140M132 19Q104 34 104 66 76 72 57 113 30 108 9 132M90 13Q72 24 71 45 52 50 39 78 22 74 6 90M46 6Q38 12 36 23 26 26 20 40 10 38 3 46" fill="none" stroke="#fff" stroke-width="1.3" opacity=".8"/>
    <g class="bob"><path d="M84 46V150" stroke="#fff" stroke-width="1" opacity=".8"/><circle cx="84" cy="158" r="9" fill="#1b1422"/><circle cx="84" cy="148" r="5" fill="#1b1422"/>
      <path d="M76 154l-12-6m12 10l-13 0m13 4l-11 7M92 154l12-6m-12 10l13 0m-13 4l11 7" stroke="#1b1422" stroke-width="2" stroke-linecap="round"/></g>
  </svg>`, zi = j`<svg class="top right" width="150" height="150" viewBox="-75 -75 150 150">
    <g class="turn">${Array.from({ length: 12 }, (e, t) => M`<path d="M0-46V-66" stroke="#f5c542" stroke-width="6" stroke-linecap="round" transform="rotate(${t * 30})"/>`)}</g>
    <circle r="36" fill="#f7d355"/>
  </svg>`;
function Bi(e, t) {
	return j`<div class="season" aria-hidden="true" data-glyph=${e.drift?.glyph ?? ""} data-count=${e.drift?.count ?? 0}>
    ${e.foot ? j`<svg class="foot" width="100%" height="74"><defs><pattern id="aurora-foot" width="240" height="74" patternUnits="userSpaceOnUse">${dt[e.foot]}</pattern></defs><rect width="100%" height="74" fill="url(#aurora-foot)"/></svg>` : N}
    ${e.top === "lights" ? Li(t) : e.top === "web" ? Ri : e.top === "sun" ? zi : N}
    ${e.drift ? Ii(e.drift) : N}
  </div>`;
}
var Vi = (e, t) => e.hero ? j`<svg class="motif" viewBox="0 0 200 160" aria-hidden="true">${ut[e.hero](t)}</svg>` : N, Hi = "almanac", Ui = [
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
], Wi = [
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
], Gi = (e) => [...Ui, ...Wi].find((t) => t.id === e), Ki = (e) => `${e.sky.map((t, n) => `--h${n + 1}: ${t}; --m${n + 1}: ${e.moves[n]}`).join("; ")}; --hw: ${e.warm}; --strength: ${e.strength}`, qi = (e) => `background: conic-gradient(${[...e.sky, e.sky[0]].map((t) => `oklch(.72 ${(.19 * e.strength).toFixed(3)} ${t})`).join(", ")})`;
//#endregion
//#region src/dash-bored/aurora/bento.ts
function Ji(e, t, n, r, i, a, o) {
	if (r < 0 || i < 0 || r + a > t || i + o > n) return !1;
	for (let n = i; n < i + o; n++) for (let i = r; i < r + a; i++) if (e[n * t + i]) return !1;
	return !0;
}
function Yi(e, t, n) {
	for (let r = n.row; r < n.row + n.h; r++) for (let i = n.col; i < n.col + n.w; i++) e[r * t + i] = !0;
}
function Xi(e, t, n) {
	let r = Array(t * n).fill(!1), i = [];
	for (let a of e) {
		let e = Math.min(a.w, t), o = Math.min(a.h, n), s;
		for (let [i, c] of [
			[e, o],
			[e, 1],
			[1, 1]
		]) {
			for (let e = 0; e < t * n && !s; e++) Ji(r, t, n, e % t, Math.floor(e / t), i, c) && (s = {
				id: a.id,
				col: e % t,
				row: Math.floor(e / t),
				w: i,
				h: c
			});
			if (s) break;
		}
		if (!s) break;
		Yi(r, t, s), i.push(s);
	}
	return {
		placed: i,
		taken: r
	};
}
function Zi(e, t, n, r) {
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
			].find(([e]) => Ji(t, n, r, ...e));
			e && (Object.assign(a, e[1]), Yi(t, n, a), i = !0);
		}
	}
}
function Qi(e, t, n) {
	let r = 0;
	for (let i = e; i.length; r++) i = i.slice(Xi(i, t, n).placed.length || 1);
	let i = [];
	for (let a = e; a.length;) {
		let e = Math.ceil(a.length / Math.max(1, r - i.length)), { placed: o, taken: s } = Xi(a.slice(0, e), t, n);
		Zi(o, s, t, n), s.includes(!1) && ({placed: o, taken: s} = Xi(a.slice(0, e).map((e) => ({
			...e,
			h: 1
		})), t, n), Zi(o, s, t, n)), i.push(o), a = a.slice(o.length || 1);
	}
	return i;
}
//#endregion
//#region src/dash-bored/aurora/pages.ts
var $i = "hero", ea = "alerts", ta = "scenes", na = "energy", ra = "climate", ia = "cameras", aa = "split:", oa = "room:", sa = [200, 175], ca = 106, la = 1.3, ua = .85, da = [
	300,
	250,
	1.6
], fa = (e, t) => Math.min(da[2], Math.max(1, Math.min(e / da[0], t / da[1])));
function pa(e, t) {
	let n = (e, t, n) => Math.min(n, Math.max(2, Math.floor(e / t)));
	return [n(e, sa[0], 8), n(t - ca, sa[1], 6)];
}
function ma(e) {
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
var ha = (e, t) => e >= 9 || t ? [2, 2] : e >= 4 ? [2, 1] : [1, 1], ga = (e) => e.w * 3 * (e.h * 2 - 1), _a = [
	84,
	170,
	250
], va = 12, ya = 96;
function ba(e, t, n) {
	let r = Math.floor((e - 32 + va) / (_a[0] + va));
	if (!n || r < 1) return 0;
	let i = Math.ceil(n / r), a = Math.floor((t - ya - (i - 1) * va) / i);
	return a >= _a[1] ? Math.min(_a[2], a) : 0;
}
function xa(e, t, n, r) {
	let i = e.reduce((e, t) => e + t.w * t.h, 0), a;
	for (let o = Math.max(...e.map((e) => e.w)); o <= t; o++) for (let t = Math.max(...e.map((e) => e.h)); t <= n; t++) {
		let n = (o * t - i) / i + Math.abs(Math.log(r * t / o / la));
		if (o * t < i || a && n >= a.cost) continue;
		let s = Qi(e, o, t);
		s.length === 1 && (a = {
			cost: n,
			cols: o,
			rows: t,
			tiles: s[0]
		});
	}
	return a;
}
function Sa(e, t, n) {
	let [r, i] = pa(t, n), a = t / Math.max(1, n - ca), o = ma(e), s = [
		{
			id: $i,
			w: r >= 6 ? 3 : 2,
			h: 2
		},
		{
			id: ea,
			w: 2,
			h: 1
		},
		...e.scenes.length ? [{
			id: ta,
			w: 2,
			h: 1
		}] : [],
		...e.power ? [{
			id: na,
			w: 2,
			h: 1
		}] : [],
		...e.rooms.some((e) => e.climate) ? [{
			id: ra,
			w: 1,
			h: 2
		}] : [],
		...e.rooms.some((e) => e.devices.some((e) => e.kind === "camera")) ? [{
			id: ia,
			w: 2,
			h: 1
		}] : [],
		...o.map((e) => ({
			id: aa + e.id,
			w: 1,
			h: 1
		}))
	], c = new Map(e.rooms.map((e) => [e.id, ha(e.devices.length, e.devices.some((e) => e.kind === "camera"))])), l = (e) => e.rooms.map((e) => ({
		id: oa + e,
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
		].map((e) => Qi(e, r, i));
		return t.find((e) => e.length === t[2].length);
	}, d = (e, t, n, o = u) => {
		let s = xa(t, r, i, a);
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
		f.length > 0 && t.reduce((e, t) => e + t.w, 0) <= r * i * ua && Qi(t, r, i).length === 1 ? f.at(-1).push(e) : f.push([e]);
	}
	let p = (e) => e.length === o.length && e.length > 1 ? "Rooms" : e.map((e) => e.name).join(" · ");
	return [...d("Home", s, [], (e) => Qi(e, r, i)), ...f.flatMap((e) => d(p(e), e.flatMap(l), e.map((e) => e.id)))];
}
//#endregion
//#region src/dash-bored/aurora/words.ts
var Ca = (e) => e < 12 ? "Good morning." : e < 18 ? "Good afternoon." : "Good evening.", wa = (e) => e.length ? e.reduce((e, t) => e + (t.on ? t.level ?? 100 : 0), 0) / (e.length * 100) : 0;
function Ta(e) {
	let t = Jt(e).filter((e) => e.on).length, { N: n, s: r } = xn(t), i = e.rooms.filter((e) => e.temp !== void 0).sort((e, t) => t.temp - e.temp), a = [[[`${n} light${r} ${t === 1 ? "is" : "are"} on`, !0]]];
	return e.kw !== void 0 && a.push([[`the house is drawing ${e.kw.toFixed(1)} kW`, !1]]), i.length > 1 && a.push([[`the warmest room is ${i[0].name} at `, !1], [`${i[0].temp.toFixed(1)}°`, !0]]), [...a.flatMap((e, t) => [...t ? [[t === a.length - 1 ? " and " : ", ", !1]] : [], ...e]), [".", !1]];
}
function Ea(e, t) {
	let n = [];
	for (let r of e) (!n.length || r[0] - n.at(-1)[0] >= t) && n.push(r);
	return n;
}
var Da = .9;
function Oa(e, t, n, r = 300, i = 90) {
	if (e.length < 2 || n <= t) return;
	let a = Math.max(Da, ...e.map(([, e]) => e)), o = e.map(([e, o]) => [Math.round(Math.max(0, e - t) / (n - t) * r * 10) / 10, Math.round((i - 6 - Math.max(0, o) / a * (i - 16)) * 10) / 10]), s = `M${o[0]}`;
	for (let e = 1; e < o.length; e++) s += ` Q${o[e - 1]} ${(o[e - 1][0] + o[e][0]) / 2},${(o[e - 1][1] + o[e][1]) / 2}`;
	return s += ` L${o.at(-1)}`, {
		line: s,
		area: `${s} L${o.at(-1)[0]},${i} L${o[0][0]},${i}Z`
	};
}
//#endregion
//#region src/dash-bored/aurora.ts
var ka = "dash-bored-aurora", Aa = "dash-bored-aurora-skin", ja = 36e5, Ma = 3e4, Na = 6e4, Pa = 200, Fa = (e) => Ai[e]?.drift ? j`<svg viewBox="0 0 24 24" aria-hidden="true">${st[Ai[e].drift.glyph]}</svg>` : N, Ia = (e, t) => `${e} ${t}${e === 1 ? "" : "s"}`, La = (e) => `grid-area: ${e.row + 1} / ${e.col + 1} / span ${e.h} / span ${e.w}`, Ra = class extends zr {
	constructor(...e) {
		super(...e), this._alerts = [], this._find = "", this._trace = [], this._now = Date.now(), this._at = 0, this._wide = 0, this._skin = Ui[0].id, this._dressing = !1, this._traced = "", this._kept = "", this._again = () => this.requestUpdate(), this._came = /* @__PURE__ */ new Map(), this._failed = /* @__PURE__ */ new Set(), this._drift = new ki(), this._looks = {
			look: (e) => this._press(e),
			came: (e) => this._noted(this._came, e, Date.now()),
			failed: (e) => this._noted(this._failed, e)
		}, this._works = {
			turn: (e, t) => this._call(tn(t), `${e.room} ${e.name}: ${t.name}`),
			zoom: (e, t) => this._ask(e, t, en),
			press: (e, t) => this._call(rn(t), `${e.room} ${t.name}`),
			device: (e) => this._control(e)
		}, this._tick = () => {
			this._now = Date.now(), this._after(Na - this._now % Na + 50, this._tick);
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
		this.styles = [Nn, et];
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
			e ??= localStorage.getItem(Aa) ?? void 0;
		} catch {}
		this._skin = e === "almanac" || Gi(e) ? e : Ui[0].id;
	}
	_dress(e) {
		this._skin = e;
		try {
			localStorage.setItem(Aa, e);
		} catch {}
	}
	connectedCallback() {
		super.connectedCallback(), this._wear(), this._tick(), window.addEventListener("keydown", this._slash), window.addEventListener("resize", this._again);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._drift.stop(), window.removeEventListener("keydown", this._slash), window.removeEventListener("resize", this._again);
	}
	_listen() {
		super._listen(), this._alone || this._follow(Tn, "Sensor Watch's alerts", (e) => {
			let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
			for (let n of e) t.set(n.entity_id, n);
			this._alerts = [...t.values()];
		}), this._watch();
	}
	_noted(e, t, n = 0) {
		e.has(t) || (e instanceof Map ? e.set(t, n) : e.add(t), e.size > Pa && e.delete(e.keys().next().value), this.requestUpdate());
	}
	_surveyed() {
		let e = this._survey?.power;
		if (!e || this._sample || this._alone) return;
		this._traced !== e && (this._traced = e, this._trace = [], this._recall(e));
		let t = this._house?.kw, n = Date.now(), r = this._trace.at(-1);
		t !== void 0 && (!r || r[1] !== t && n - r[0] >= Ma) && (this._trace = [...this._trace.filter(([e]) => e > n - ja), [n, t]]);
	}
	async _recall(e) {
		let t = Date.now();
		try {
			let n = await this._hass.connection.sendMessagePromise({
				type: "history/history_during_period",
				start_time: (/* @__PURE__ */ new Date(t - ja)).toISOString(),
				entity_ids: [e],
				minimal_response: !0,
				no_attributes: !0
			}), r = this._hass.states[e]?.attributes.unit_of_measurement === "kW" ? 1 : 1e3, i = (n[e] ?? []).filter((e) => e.s !== "" && Number.isFinite(Number(e.s))).map((e) => [Math.max(e.lu * 1e3, t - ja), Number(e.s) / r]);
			this._traced === e && (this._trace = Ea([...i, ...this._trace.filter(([e]) => e >= t)], Ma));
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
		}, s = CSS.supports("transition-timing-function", "linear(0, .009, .035 2.1%, .141 4.4%, .723 12.9%, .938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, .991, .977 51%, .974 53.8%, .975 57.1%, .997 69.8%, 1.003 76.9%, 1.004 83.8%, 1)") ? $e : "ease-out";
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
		let r = Sa(e, t, n), i = r.flatMap((e, t) => e.part === 0 ? [{
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
			sets: new Map(ma(e).map((e) => [e.id, e]))
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
		let o = e.devices.filter((e) => e.kind === "light" && !e.away), s = o.filter((e) => e.on).length, c = wa(o), l = o.length ? s ? `${s} of ${Ia(o.length, "light")} on` : o.length === 1 ? "Light off" : "All lights off" : e.devices.length ? Ia(e.devices.length, "device") : "", u = [...e.devices].sort((e, t) => Number(t.kind === "light") - Number(e.kind === "light")), d = ga(t), f = u.length > d ? u.length - (d - 1) : 0, p = () => this._open = e.id, m = ba(t.w * i[0] + (t.w - 1) * i[2], t.h * i[1] + (t.h - 1) * i[2], e.devices.length), h = [l, a && a.at ? `${a.d.name}: ${a.says}` : ""].filter(Boolean).join(" · ");
		return j`<article class="room glass w${Math.min(t.w, 2)} h${Math.min(t.h, 2)} ${r ? "dim" : ""} ${a?.src ? "pictured" : ""}" data-room=${e.id} style="${La(t)}; --hue: ${n}; --lit: ${c ? (.35 + c * .65).toFixed(2) : 0}">
      ${a ? Hr(a, this._looks, "back") : N}
      <button class="open" aria-label="${e.name}${h ? `: ${h}` : ""}. Open its controls" @click=${p}></button>
      <div class="head"><div><h2>${e.name}</h2><span class="sub">${h}</span></div>${e.temp === void 0 ? N : j`<div class="temp">${e.temp.toFixed(1)}°</div>`}</div>
      ${m ? j`<div class="controls" style="--tall: ${m}px">${e.devices.map((e) => this._control(e))}</div>` : j`<div class="dots">
        ${(f ? u.slice(0, d - 1) : u).map((e) => j`<button class="dot ${e.kind === "light" ? "lamp" : ""} ${e.on ? "on" : ""} ${e.away ? "away" : ""}" title=${e.name} aria-label="${e.name}: ${this._stands(e)}" aria-pressed=${e.on} ?disabled=${e.away}
          @click=${() => e.guarded ? p() : this._press(e)}>${this._pic(e)}</button>`)}
        ${f ? j`<button class="dot" aria-label="${f} more in ${e.name}" @click=${p}>+${f}</button>` : N}
      </div>`}
    </article>`;
	}
	render() {
		let e = this._house, t = this._hass, n = this._survey, r = this._tall, i = (e) => `aurora ${e ? "dark" : ""} ${this._wide < 520 ? "narrow" : ""}`, a = i(t?.themes?.darkMode);
		if (!t || !e || !n) return this._alone ? j`<div class="${a} alone"><div class="urgent">Waiting for Home Assistant…</div></div>` : j`<div class=${a} style="height: ${r}px"><div class="urgent over">Waiting for Home Assistant…</div></div>`;
		let [o, c, l] = this._wide < 520 ? [
			12,
			10,
			84
		] : [
			18,
			14,
			88
		], u = (e) => {
			let [t, n] = [(this._wide - 2 * o - (e.cols - 1) * c) / e.cols, (r - o - l - (e.rows - 1) * c) / e.rows], i = fa(t, n);
			return {
				by: i,
				cell: [
					t / i,
					n / i,
					c / i
				]
			};
		}, d = Date.now(), f = new Date(this._now), p = Gi(this._skin === "almanac" ? Pi(f, (t.config?.latitude ?? 0) < 0, t.config?.country ?? "") : this._skin) ?? Ui[0], m = Ai[p.id], h = new Map(e.rooms.map((e, t) => [e.id, {
			r: e,
			hue: p.rooms[t % p.rooms.length]
		}])), g = this._alerts.filter((e) => e.level !== mn).sort((e, t) => (gn[t.level] ?? 0) - (gn[e.level] ?? 0) || e.began - t.began), _ = e.rooms.flatMap((e) => e.devices).find((e) => e.kind === "climate" && e.dims && !e.away), v = Oa(this._trace, d - ja, d), y = this._find.trim().toLowerCase(), b = (e) => !!e && (!y || [
			e.name,
			...e.devices.map((e) => e.name),
			...e.scenes.map((e) => e.name)
		].some((e) => e.toLowerCase().includes(y))), x = (e) => e.parts > 1 ? `${e.name} ${e.part + 1}` : e.name, S = (e) => {
			let t = e.currentTarget.getBoundingClientRect();
			return e.target === e.currentTarget && (e.clientX < t.left || e.clientX > t.right || e.clientY < t.top || e.clientY > t.bottom);
		}, C = this._sighted(d), w = new Map(Br(e).map((e) => [e.id, Vr(e, C, this._came, this._failed)])), T = new Map(e.rooms.flatMap((e) => {
			let t = e.devices.flatMap((e) => w.has(e.id) ? [w.get(e.id)] : []), n = t.find((e) => e.src) ?? t[0];
			return n ? [[e.id, n]] : [];
		})), E = {
			[$i]: (n) => j`<section class="hero glass" style=${La(n)}>
        <time>${f.toLocaleString(t.locale?.language, {
				weekday: "long",
				day: "numeric",
				month: "long",
				hour: "2-digit",
				minute: "2-digit"
			})}</time>
        <h1>${Ca(f.getHours())}</h1>
        <p>${Ta(e).map(([e, t]) => t ? j`<b>${e}</b>` : e)}</p>
        ${m ? Vi(m, f) : N}
      </section>`,
			[ea]: (e) => j`<section class="alerts glass" style=${La(e)}><span class="label">Sensor Watch</span>
        ${g.length ? g.map((e) => j`<div class="note ${e.level}" role="status"><b>${e.name}</b>${e.message || e.level}<small>since ${F(e.began * 1e3)}</small></div>`) : j`<div class="none">${t.config?.components?.includes("casa_mia_sensor_watch") ? "Nothing needs attention." : "Sensor Watch is not installed, so nothing is watched from here."}</div>`}
      </section>`,
			[ta]: (t) => j`<nav class="scenes glass" style=${La(t)} aria-label="Scenes">${e.scenes.map((e) => this._scene(e, e.floor ? e.full : e.name))}</nav>`,
			[na]: (t) => j`<section class="energy glass" style=${La(t)}><span class="label">Drawing now</span>
        ${e.kw === void 0 ? j`<div class="none">The power sensor is not answering.</div>` : j`<div class="big">${e.kw.toFixed(2)}<small>kW</small></div>
              ${v ? j`<svg viewBox="0 0 300 90" preserveAspectRatio="none" role="img" aria-label="The power drawn over the last hour">
                    <defs><linearGradient id="aurora-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
                    <path d=${v.area} fill="url(#aurora-fade)"/><path d=${v.line} fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>` : j`<div class="none">No readings from the last hour yet.</div>`}`}
      </section>`,
			[ra]: (e) => j`<section class="climate glass" style=${La(e)}>
        ${_ ? j`<div class="ringwrap"><div class="ring" style="--pct: ${(this._level(_) - _.span.min) / (_.span.max - _.span.min)}"></div>
                <div class="read"><b>${this._level(_)}°</b><span>${_.room}${_.on ? _.temp === void 0 ? "" : ` · now ${_.temp.toFixed(1)}°` : " · off"}</span></div></div>
              <div class="steps"><button aria-label="${_.room} ${_.name}: cooler" @click=${() => this._set(_, this._level(_) - _.span.step)}>−</button><button aria-label="${_.room} ${_.name}: warmer" @click=${() => this._set(_, this._level(_) + _.span.step)}>+</button></div>` : j`<div class="none">No thermostat here takes a target just now.</div>`}
      </section>`
		};
		E[ia] = (e) => j`<section class="cameras glass" style=${La(e)} aria-label="Cameras">${[...w.values()].sort((e, t) => t.at - e.at).map((e) => Ur(e, this._looks))}</section>`;
		let ee = (e) => {
			let t = k.sets.get(e.id.slice(aa.length)), n = t.rooms.flatMap((e) => h.has(e) ? [h.get(e).r] : []), r = n.flatMap((e) => e.devices).filter((e) => e.kind === "light" && !e.away), i = r.filter((e) => e.on).length, a = wa(r);
			return j`<button class="set glass ${y && !n.some(b) ? "dim" : ""}" style="${La(e)}; --hue: ${p.warm}; --lit: ${a ? (.35 + a * .65).toFixed(2) : 0}" @click=${() => this._go(k.entries.find((e) => e.splits.includes(t.id)).first)}>
        <span><h2>${t.name}</h2><span class="sub">${Ia(n.length, "room")}${r.length ? ` · ${i ? `${Ia(i, "light")} on` : "lights off"}` : ""}</span></span>
        <span class="in">${n.map((e) => {
				let t = e.devices.filter((e) => e.kind === "light" && e.on && !e.away).length;
				return j`<span class=${t ? "lit" : ""}>${e.name}${t ? j`<b>${t}</b>` : N}</span>`;
			})}</span>
      </button>`;
		}, te = (e, t) => {
			if (e.id.startsWith("split:")) return ee(e);
			if (!e.id.startsWith("room:")) return E[e.id](e);
			let n = h.get(e.id.slice(oa.length));
			return n ? this._tile(n.r, e, n.hue, !b(n.r), t, T.get(n.r.id)) : N;
		}, ne = (e) => {
			let t = e.key === "Enter" && y ? k.screens.findIndex((e) => e.tiles.some((e) => e.id.startsWith("room:") && b(h.get(e.id.slice(5))?.r))) : -1;
			t >= 0 && this._go(t);
		}, D = e.rooms.find((e) => e.id === this._open), O = [this._lost ? `No connection to Home Assistant since ${F(this._lost)}. What is shown is as it was then.` : "", this._fault].filter(Boolean), re = (e) => j`${e.scenes.length ? j`<nav class="scenes" aria-label="${e.name}'s scenes">${e.scenes.map((e) => this._scene(e, e.name))}</nav>` : N}
      ${e.devices.some((e) => w.has(e.id)) ? j`<div class="shots">${e.devices.flatMap((e) => w.has(e.id) ? [j`<div class="cam">${Ur(w.get(e.id), this._looks)}${Wr(e, this._works)}</div>`] : [])}</div>` : N}
      <div class="controls">${e.devices.filter((e) => !w.has(e.id)).map((e) => this._control(e))}</div>
      ${Gr(e.devices, (e, t, n) => this._call(mt(e.id, t, n), `${e.room} ${e.name}: ${t.what}`))}
      ${e.devices.length || e.scenes.length ? N : j`<p class="none">Nothing in this room can be worked from here.</p>`}`;
		if (this._alone) {
			let [n] = e.rooms, r = wa(n?.devices.filter((e) => e.kind === "light" && !e.away) ?? []);
			return j`<div class="${i(p.dark || t.themes?.darkMode)} alone" style="--warm: ${r.toFixed(3)}; ${Ki(p)}" @pointermove=${this._shine}>
        <div class="sky" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        ${O.map((e) => j`<div class="urgent" role="alert">${e}</div>`)}
        ${n ? j`<section class="lone glass" aria-label=${n.name} style="--hue: ${p.rooms[0]}; --lit: ${r ? (.35 + r * .65).toFixed(2) : 0}">
              <header><h2>${n.name}</h2>${n.temp === void 0 ? N : j`<div class="temp">${n.temp.toFixed(1)}°</div>`}</header>
              ${re(n)}
            </section>` : j`<div class="urgent">${this._vacant}</div>`}
      </div>`;
		}
		let k = this._lay(n), A = Math.min(this._at, k.screens.length - 1);
		return j`<div class=${i(p.dark || t.themes?.darkMode)} style="height: ${r}px; --warm: ${wa(Jt(e)).toFixed(3)}; ${Ki(p)}" @pointermove=${this._shine}>
      <div class="sky" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="pages" @scroll=${this._scrolled} @pointerover=${this._nudge} @pointerdown=${this._nudge}>
        ${k.screens.map((e) => {
			let { by: t, cell: n } = u(e);
			return j`<div class="page" role="group" aria-label=${x(e)} style="--cols: ${e.cols}; --rows: ${e.rows}; --zoom: ${t.toFixed(3)}">${e.tiles.map((e) => te(e, n))}</div>`;
		})}
      </div>
      ${m ? Bi(m, this._wide) : N}
      ${O.length ? j`<div class="urgent over" role="alert">${O.map((e) => j`<div>${e}</div>`)}</div>` : N}
      ${A > 0 ? j`<button class="edge left" aria-label="Back to ${x(k.screens[A - 1])}" @click=${() => this._go(A - 1)}>${x(k.screens[A - 1])}</button>` : N}
      ${A < k.screens.length - 1 ? j`<button class="edge right" aria-label="On to ${x(k.screens[A + 1])}" @click=${() => this._go(A + 1)}>${x(k.screens[A + 1])}</button>` : N}
      ${this._dressing ? j`<nav class="bar" aria-label="Colours">
            ${Ui.map((e) => j`<button class="skin" style=${qi(e)} title=${e.name} aria-label=${e.name} aria-pressed=${e.id === this._skin} @click=${() => this._dress(e.id)}></button>`)}
            <button class="${this._skin === "almanac" ? "here" : ""}" aria-pressed=${this._skin === Hi} title="The season's or the holiday's skin, by the date" @click=${() => this._dress(Hi)}>Almanac</button>
            ${Wi.map((e) => j`<button class="skin" style=${qi(e)} title=${e.name} aria-label=${e.name} aria-pressed=${e.id === this._skin} @click=${() => this._dress(e.id)}>${Fa(e.id)}</button>`)}
            <button class="done" @click=${() => this._dressing = !1}>Done</button>
          </nav>` : j`<nav class="bar" aria-label="Screens">
        ${k.entries.map((e) => {
			let t = A >= e.first && A < e.first + e.parts, n = !!y && e.splits.length > 0 && !e.splits.some((e) => k.sets.get(e).rooms.some((e) => b(h.get(e)?.r)));
			return j`<button class="${t ? "here" : ""} ${n ? "dim" : ""}" aria-current=${t ? "page" : N} @click=${() => this._go(e.first)}>${e.name}${e.parts > 1 ? j`<i>${Array.from({ length: e.parts }, (t, n) => j`<b class=${e.first + n === A ? "on" : ""}></b>`)}</i>` : N}</button>`;
		})}
        ${this._sample || e.rooms.length < 2 ? N : j`<label class="ask"><input placeholder="Find…" aria-label="Find a room, a device or a scene" autocomplete="off" .value=${this._find} @input=${(e) => this._find = e.target.value} @keydown=${ne} /><kbd>/</kbd></label>`}
        ${this._sample || this._config.style ? N : j`<button class="skin" style=${qi(p)} title="Colours" aria-label="Choose its colours. Now ${this._skin === "almanac" ? `the Almanac's, ${p.name}` : p.name}" @click=${() => this._dressing = !0}>${Fa(p.id)}</button>`}
        ${this.hasAttribute("panel") ? j`<button class="other" aria-label="Choose another style of Dash-Bored" title="Another style" @click=${() => s(this, lr)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4,4 h7 v7 h-7 z M13,4 h7 v7 h-7 z M4,13 h7 v7 h-7 z M13,13 h7 v7 h-7 z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>` : N}
      </nav>`}
      ${D ? j`<dialog class="sheet glass" aria-label=${D.name} @cancel=${(e) => (e.preventDefault(), this._shut())} @click=${(e) => S(e) && this._shut()}>
            <header><h2>${D.name}</h2><button class="close" @click=${this._shut}>Done</button></header>
            ${this._fault ? j`<div class="urgent" role="alert">${this._fault}</div>` : N}
            ${re(D)}
          </dialog>` : N}
    </div>`;
	}
}, za = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, Ba = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Va = class {
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
}, { I: Ha } = Ke, Ua = (e) => e, Wa = (e) => e.strings === void 0, Ga = () => document.createComment(""), Ka = (e, t, n) => {
	let r = e._$AA.parentNode, i = t === void 0 ? e._$AB : t._$AA;
	if (n === void 0) n = new Ha(r.insertBefore(Ga(), i), r.insertBefore(Ga(), i), e, e.options);
	else {
		let t = n._$AB.nextSibling, a = n._$AM, o = a !== e;
		if (o) {
			let t;
			n._$AQ?.(e), n._$AM = e, n._$AP !== void 0 && (t = e._$AU) !== a._$AU && n._$AP(t);
		}
		if (t !== i || o) {
			let e = n._$AA;
			for (; e !== t;) {
				let t = Ua(e).nextSibling;
				Ua(r).insertBefore(e, i), e = t;
			}
		}
	}
	return n;
}, qa = (e, t, n = e) => (e._$AI(t, n), e), Ja = {}, Ya = (e, t = Ja) => e._$AH = t, Xa = (e) => e._$AH, Za = (e) => {
	e._$AR(), e._$AA.remove();
}, Qa = (e, t, n) => {
	let r = /* @__PURE__ */ new Map();
	for (let i = t; i <= n; i++) r.set(e[i], i);
	return r;
}, $a = Ba(class extends Va {
	constructor(e) {
		if (super(e), e.type !== za.CHILD) throw Error("repeat() can only be used in text expressions");
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
		let i = Xa(e), { values: a, keys: o } = this.dt(t, n, r);
		if (!Array.isArray(i)) return this.ut = o, a;
		let s = this.ut ??= [], c = [], l, u, d = 0, f = i.length - 1, p = 0, m = a.length - 1;
		for (; d <= f && p <= m;) if (i[d] === null) d++;
		else if (i[f] === null) f--;
		else if (s[d] === o[p]) c[p] = qa(i[d], a[p]), d++, p++;
		else if (s[f] === o[m]) c[m] = qa(i[f], a[m]), f--, m--;
		else if (s[d] === o[m]) c[m] = qa(i[d], a[m]), Ka(e, c[m + 1], i[d]), d++, m--;
		else if (s[f] === o[p]) c[p] = qa(i[f], a[p]), Ka(e, i[d], i[f]), f--, p++;
		else if (l === void 0 && (l = Qa(o, p, m), u = Qa(s, d, f)), l.has(s[d])) {
			if (l.has(s[f])) {
				let t = u.get(o[p]), n = t === void 0 ? null : i[t];
				if (n === null) {
					let t = Ka(e, i[d]);
					qa(t, a[p]), c[p] = t;
				} else c[p] = qa(n, a[p]), Ka(e, i[d], n), i[t] = null;
				p++;
			} else Za(i[f]), f--;
		} else Za(i[d]), d++;
		for (; p <= m;) {
			let t = Ka(e, c[m + 1]);
			qa(t, a[p]), c[p++] = t;
		}
		for (; d <= f;) {
			let e = i[d++];
			e !== null && Za(e);
		}
		return this.ut = o, Ya(e, c), Me;
	}
}), eo = [
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
], to = 11, no = (e) => {
	let t = (e % to + to) % to;
	return t ? String(t - 1) : "";
}, ro = /* @__PURE__ */ t({
	DEFS: () => io,
	dolly: () => go,
	jewel: () => po,
	knife: () => Co,
	knob: () => vo,
	label: () => ao,
	meter: () => fo,
	push: () => So,
	swing: () => co,
	tv: () => yo,
	valve: () => ho,
	wheels: () => xo
}), io = j`<svg class="defs" width="0" height="0" aria-hidden="true"><defs>
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
  <path id="round" d="M26.4,84.5 A41,41 0 1 1 93.6,84.5"/>
  <linearGradient id="lever" x1="0" x2="1"><stop offset="0" stop-color="#b98a6c"/><stop offset=".4" stop-color="#6a3f2c"/><stop offset="1" stop-color="#2a140c"/></linearGradient>
</defs></svg>`, ao = (e) => j`<span class="label">${e}</span>`, oo = (e, t) => {
	let n = (t - 90) * Math.PI / 180;
	return [60 + e * Math.cos(n), 84 + e * Math.sin(n)];
}, so = (e, t) => oo(e, t).map((e) => e.toFixed(1)).join(","), co = (e, t, n) => -50 + 100 * Math.min(1, Math.max(0, (e - t) / (n - t))), lo = {
	"°C": "Degrees Celsius",
	kW: "Kilowatts"
}, uo = Array.from({ length: 51 }, (e, t) => M`<path class="scale" d="M${so(36, -50 + t * 2)} L${so(t % 5 ? 40 : 43, -50 + t * 2)}"/>`);
function fo(e, t, n, r, i, a = 0, o = !0) {
	let s = Array.from({ length: 6 }, (e, r) => {
		let [i, a] = oo(48, -50 + r * 20);
		return M`<text x=${i.toFixed(1)} y=${(a + 2).toFixed(1)}>${+(t + (n - t) * r / 5).toFixed(1)}</text>`;
	});
	return j`<div class="meter">
    <svg viewBox="0 0 120 120" role="img" aria-label="${e}: ${r} ${i}">
      <circle cx="60" cy="60" r="59" fill="url(#ebon)"/><circle cx="60" cy="60" r="58" fill="none" stroke="#fff" stroke-opacity=".12"/><circle cx="60" cy="62" r="49" fill="none" stroke="#000" stroke-width="2.5"/>
      ${o ? M`<circle cx="60" cy="62" r="50.5" fill="none" stroke="#ffb347" stroke-opacity=".28" stroke-width="2"/>` : N}
      <path fill="url(#${o ? "lit" : "unlit"})" d="M17,78 A46,46 0 1 1 103,78 Q100,92 86,92 C76,92 78,75 60,75 C42,75 44,92 34,92 Q20,92 17,78 Z"/>
      ${o ? M`<ellipse cx="60" cy="24" rx="24" ry="9" fill="url(#spot)" opacity=".55"/>` : N}
      <path class="scale" d="M${so(36, -50)} A36,36 0 0 1 ${so(36, 50)} M${so(40, -50)} A40,40 0 0 1 ${so(40, 50)}"/>${uo}${s}
      <text class="legend"><textPath href="#arch" startOffset="50%">${lo[i] ?? i}</textPath></text>
      <text class="unit" x="60" y="66">${i}</text><text class="small" x="33" y="84">MOVING COIL</text><text class="small" x="87" y="84">DASH-BORED</text>
      <g class="needle" style="transform: rotate(${co(r, t, n).toFixed(1)}deg)"><g class="waver" style="animation-duration: ${eo[a % eo.length] * 16}ms">
        <path d="M60,84 V51" stroke="#b4b1a4" stroke-width=".8"/><path d="M60,51 V42" stroke="#111" stroke-width=".8" stroke-linecap="round"/><circle cx="60" cy="50" r="1.5" fill="#111"/></g></g>
      <path d="M17,78 A46,46 0 1 1 103,78" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2.4"/><path d="M26,44 A40,40 0 0 1 58,20" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M17,79 Q20,93 34,93 C45,93 43,76 60,76 C77,76 75,93 86,93 Q100,93 103,79 A46,46 0 0 1 17,79 Z" fill="url(#ebon)"/>
      <circle cx="60" cy="103" r="4.5" fill="#1a1a1a" stroke="#000"/><path d="M56.5,102 l7,2" stroke="#000" stroke-width="1.3"/>
      <g fill="#161616" stroke="#000" stroke-width=".6"><circle cx="60" cy="6" r="2.2"/><circle cx="13" cy="87" r="2.2"/><circle cx="107" cy="87" r="2.2"/></g>
    </svg>
    ${ao(e)}
  </div>`;
}
var po = (e) => j`<svg class="jewel ${e}" viewBox="0 0 40 40" width="34" aria-hidden="true">
  <circle cx="20" cy="21.2" r="18" fill="#000" opacity=".5"/><circle cx="20" cy="20" r="18" fill="url(#brass)"/>
  <g fill="none" stroke="#3a2808"><circle cx="20" cy="20" r="17.6" stroke-width=".7"/><circle cx="20" cy="20" r="15.4" stroke-width=".6" stroke-opacity=".7"/><circle cx="20" cy="20" r="13.6" stroke-width=".9"/></g>
  <circle cx="20" cy="20" r="16.5" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".5" stroke-dasharray="14 90" transform="rotate(200 20 20)"/>
  <circle cx="20" cy="20" r="12.6" fill="#120805"/><circle class="glass" cx="20" cy="20" r="11.8"/>
  <circle cx="20" cy="20" r="11.8" fill="url(#rim)"/><circle cx="20" cy="21" r="8.5" fill="url(#spot)"/><circle cx="20" cy="21" r="4" fill="url(#spot)"/>
  <path d="M12.2,15.5 A9.5,9.5 0 0 1 19,10.6" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5" stroke-linecap="round"/></svg>`, mo = Array.from({ length: 19 }, (e, t) => `M36.4,${(41.5 + t * 1.4).toFixed(1)} h7.2`).join(" "), ho = (e) => j`<svg class="valve" viewBox="0 0 80 100" width="74" aria-hidden="true" style="--heat: ${e.toFixed(2)}">
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
  <path d="M36.4,33 V73 M43.6,33 V73" stroke="#b87a3a" stroke-width=".9"/><path d="${mo}" stroke="#d9b98a" stroke-width=".35" stroke-opacity=".8"/>
  <rect class="heater" x="38.7" y="35" width="2.6" height="38" rx="1.3" fill="#ff7a1a"/><rect class="heater" x="39.4" y="36" width="1.2" height="36" rx=".6" fill="#ffd28a"/><circle class="heater" cx="40" cy="35.5" r="2.3" fill="#fff4c4"/>
  <g fill="#cdbfa6" fill-opacity=".9" stroke="#7d6e55" stroke-width=".5"><ellipse cx="40" cy="39" rx="15" ry="2.5"/><ellipse cx="40" cy="70" rx="15" ry="2.5"/></g>
  <path d="M24,34 V26 Q24,10 36,7 L38,3 Q40,1 42,3 L44,7 Q56,10 56,26 V34 Q40,29 24,34 Z" fill="url(#getter)"/>
  <path d="M24,91 V26 Q24,10 36,7 L38,3 Q40,1 42,3 L44,7 Q56,10 56,26 V91 Q40,95 24,91 Z" fill="url(#tube)" stroke="#e6eef2" stroke-opacity=".55" stroke-width=".7"/>
  <path d="M27.3,24 V86" stroke="#fff" stroke-opacity=".42" stroke-width="1.5" stroke-linecap="round"/><path d="M53.2,30 V84" stroke="#fff" stroke-opacity=".16" stroke-width="1" stroke-linecap="round"/>
  <path d="M29,17 Q32,10.5 38,9" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/></svg>`, go = (e, t, n, r, i = "", a = "", o = ["On", "Off"]) => j`<button class="dolly ${t ? "on" : ""} ${n ? "away" : ""} ${i}" aria-pressed=${t} aria-label=${n ? `${e}: not answering` : e + a} @click=${r}>
  <svg viewBox="0 -8 64 74"><circle class="pilot" cx="32" cy="-3" r="3.6" stroke="#c9a24b" stroke-width="1.2"/>
    <circle cx="32" cy="34" r="30" fill="#0e0705"/><circle cx="32" cy="32" r="30" fill="url(#bake)"/>
    <circle cx="32" cy="32" r="29" fill="none" stroke="#fff" stroke-opacity=".16"/><circle cx="32" cy="32" r="23.5" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="1.6"/>
    <g fill="#8a8473" stroke="#2a1a10" stroke-width=".8"><circle cx="9.5" cy="45" r="3"/><circle cx="54.5" cy="19" r="3"/></g>
    <path d="M7.4,43.6 l4.2,2.8 M52.4,20.4 l4.2,-2.8" stroke="#2a1a10" stroke-width="1.1"/>
    <g class="throw"><circle cx="32" cy="32" r="19" fill="url(#dome)"/><rect x="25" y="19" width="14" height="26" rx="3" fill="#050201" stroke="#9a6a50" stroke-opacity=".5" stroke-width=".8"/>
    <g class="lever"><path d="M26.5,34 L28,9 Q32,5 36,9 L37.5,34 Z" fill="url(#lever)" stroke="#060302" stroke-width=".8"/>
      <path d="M30,11 L29.2,31" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/></g></g>
    ${i ? M`<g class="guard"><rect x="17" y="4" width="30" height="56" rx="5" fill="#c8281e" fill-opacity=".82" stroke="#5a0f0a" stroke-width="1.2"/><path d="M21,9 h22" stroke="#fff" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/><rect x="14" y="1" width="36" height="6" rx="2" fill="#8a8473" stroke="#2a1a10" stroke-width=".8"/></g>` : N}
    <ellipse cx="24" cy="23" rx="5" ry="3" fill="#fff" opacity=".22" transform="rotate(-35 24 23)"/></svg>
  ${ao(e)}
</button>`, _o = Array.from({ length: 11 }, (e, t) => {
	let n = (-135 + t * 27 - 90) * Math.PI / 180, r = (e) => [(52 + e * Math.cos(n)).toFixed(1), (52 + e * Math.sin(n)).toFixed(1)], [i, a] = r(40), [o, s] = r(47);
	return M`<line x1=${i} y1=${a} x2=${o} y2=${s} stroke="#e9dfc3" stroke-width=${t % 5 ? 1 : 2.2}/>`;
}), vo = (e, t, n, r, i, a, o, s, c = [0, 100], l) => j`<div class="dial ${t}">
  <div class="dimmer"><svg viewBox="0 0 104 104" aria-hidden="true">${_o}</svg>
    <div class="knob ${t} ${i ? "drag" : ""}" role="slider" tabindex="0" aria-label="${e} ${n}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(r)} aria-valuetext=${a} style="--lvl: ${r.toFixed(1)}"
      @pointerdown=${s.down} @pointermove=${s.move} @pointerup=${s.up} @pointercancel=${s.drop} @keydown=${s.key}><span class="flutes"></span><span class="cap"></span><span class="mark"></span></div></div>
  ${ao(e)}${o || t === "sound" ? j`<span class="note">${o ? ao(o) : N}</span>` : N}
</div>`, yo = (e, t, n) => j`<button class="tv" aria-label=${e} @click=${n}>
  <span class="tube">${t ? j`<img src=${t} alt="" loading="lazy" />` : N}</span>
  ${ao(e)}
</button>`, bo = [
	.9,
	-1.3,
	.4,
	1.6,
	-.7,
	-1.7
], xo = (e, t, n) => j`<div class="wheels" role="group" aria-label="${e} code">${t.map((e, t) => j`<div class="wheel">
    ${$a([
	-2,
	-1,
	0,
	1,
	2
].map((t) => e + t), (e) => e, (n) => j`<span class=${n === e ? "at" : ""} aria-hidden=${n === e ? N : "true"} aria-label=${n === e ? `Wheel ${t + 1}: ${no(n) || "blank"}` : N}
        style="--n: ${n - e}; --off: ${bo[t % bo.length]}px">${no(n)}</span>`)}
    <button aria-label="Wheel ${t + 1} on" @click=${() => n(t, 1)}></button><button aria-label="Wheel ${t + 1} back" @click=${() => n(t, -1)}></button>
  </div>`)}</div>`, So = (e, t) => j`<button class="push" @click=${t}><span class="cap"></span>${ao(e)}</button>`, Co = (e, t, n) => j`<button class="knife ${t ? "closed" : ""}" @click=${n}>
  <svg viewBox="0 0 130 84" aria-hidden="true"><rect x="4" y="62" width="122" height="18" rx="3" fill="#3c4142" stroke="#111"/>
    <path d="M100,62 v-16 M108,62 v-16" stroke="#c9a24b" stroke-width="4"/><path d="M18,62 v-8 h8 v8" fill="#c9a24b"/>
    <circle class="spark" cx="104" cy="46" r="7" fill="url(#hot)"/>
    <g class="blade"><rect x="18" y="56" width="92" height="7" rx="2" fill="#d6a45a" stroke="#7a5c1e"/><rect x="104" y="42" width="12" height="26" rx="5" fill="#1c0f0a"/></g>
    <circle cx="22" cy="60" r="4" fill="#7a5c1e"/></svg>
  ${ao(e)}
</button>`;
//#endregion
//#region src/dash-bored/console/plot.ts
function wo(e, t, n, r, i) {
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
var To = [
	"#a3261a",
	"#1f3f7a",
	"#2c6b3a",
	"#6a2a6a"
], Eo = 96, Do = 640, Oo = 34, ko = 36e5;
function Ao(e, t, n, r, i) {
	let a = n - 24 * ko, o = (e) => Eo + (e - a) / (n - a) * 536, s = Math.ceil(a / ko) * ko, c = Array.from({ length: 24 }, (e, t) => s + t * ko).filter((e) => e <= n), l = t.length * Oo + 26;
	return j`<dialog class="recorder" aria-label="${e}: the last day" @close=${i} @click=${(e) => e.target === e.currentTarget && i()}>
    ${ao(`${e}: the last day`)}
    ${r ? j`<div class="warn"><span class="lamp"></span>${ao(`The record could not be read (${r}).`)}</div>` : N}
    <svg class="paper" viewBox="0 0 ${Do} ${l}" role="img" aria-label="A chart of when each device in ${e} was on">
      <rect width=${Do} height=${l} fill="url(#sepia)"/>
      ${c.map((e) => {
		let t = new Date(e).getHours() % 3 == 0;
		return M`<path d="M${o(e).toFixed(1)},4 V${l - 16}" stroke="#7a5a2c" stroke-opacity=${t ? .5 : .2} stroke-width=".6"/>${t ? M`<text class="hour" x=${o(e).toFixed(1)} y=${l - 5}>${String(new Date(e).getHours()).padStart(2, "0")}</text>` : N}`;
	})}
      ${t.map((e, t) => {
		let i = (t + 1) * Oo, o = wo(e.changes ?? [], a, n, e.lo, e.hi).map((e) => e.map(([e, t], n) => `${n ? "L" : "M"}${(Eo + e * 536).toFixed(1)},${(i - t * 22).toFixed(1)}`).join(" ")).join(" "), s = To[t % To.length];
		return M`<path d="M${Eo},${i} H${632}" stroke="#7a5a2c" stroke-opacity=".35" stroke-width=".5" stroke-dasharray="1 3"/>
          <text class="lane" x=${90} y=${i - 3}>${e.name}</text>
          ${e.changes ? M`<path d=${o} fill="none" stroke=${s} stroke-width="1.3" stroke-linejoin="round" stroke-opacity=".9"/>` : M`<text class="hour" x=${136} y=${i - 3}>${r ? "" : "reading…"}</text>`}`;
	})}
    </svg>
    ${So("Close", i)}
  </dialog>`;
}
//#endregion
//#region src/dash-bored/console/bakelite/styles.ts
var jo = C`
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

  /* The barometer (weather.ts): a meter's case with a whole dial. Its hands turn about the dial's middle. */
  .baro .word { font-size: 5.4px; letter-spacing: .14em; text-transform: uppercase; }
  .baro .slip { fill: #1a1209; font-size: 5px; letter-spacing: .16em; text-transform: uppercase; }
  .hand { transform-origin: 60px 61px; transition: transform 1.1s cubic-bezier(.3, 1.7, .5, 1); }
  /* The forecast: a desk calendar on a Bakelite stand, a card for each day on two brass rings. */
  .days { text-align: center; }
  .cards { display: flex; gap: 8px; padding: 12px 10px 8px; margin-bottom: 6px; border-radius: 8px; background: linear-gradient(170deg, #4a2a1d, var(--bake2));
    box-shadow: inset 0 2px 0 rgba(255,255,255,.15), inset 0 -4px 8px rgba(0,0,0,.5), 0 8px 14px rgba(0,0,0,.35); }
  .card { position: relative; width: 74px; padding: 12px 4px 7px; border-radius: 2px; color: #2a1a10; text-align: center;
    background: linear-gradient(#f6ecd0, #e3cf9f); box-shadow: 0 2px 0 #cdb785, 0 4px 0 #b9a271, 0 6px 5px rgba(0,0,0,.5); }
  .card::before, .card::after { content: ""; position: absolute; top: -7px; width: 7px; height: 15px; border-radius: 4px; border: 2px solid var(--brass); border-bottom-color: #7a5c1e; }
  .card::before { left: 16px; } .card::after { right: 16px; }
  .card b { display: block; font-size: 10px; font-weight: normal; letter-spacing: .22em; text-transform: uppercase; color: #a3261b; }
  .card svg { width: 26px; height: 26px; margin: 2px auto; fill: #2a1a10; }
  .card .line { fill: none; stroke: #2a1a10; stroke-width: 1.5; stroke-linecap: round; }
  .card u { display: block; margin: 3px 3px 0; padding-top: 3px; border-top: 1px solid rgba(42,26,16,.35); font-size: 8.5px; letter-spacing: .04em; text-decoration: none; text-transform: uppercase; }
  .card s { display: block; font-size: 9px; text-decoration: none; opacity: .7; }

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
`, Mo = [
	"Stormy",
	"Rain",
	"Change",
	"Fair",
	"Set fair"
], No = {
	"lightning-rainy": [
		0,
		"Thunder",
		"storm"
	],
	lightning: [
		0,
		"Lightning",
		"storm"
	],
	hail: [
		0,
		"Hail",
		"snow"
	],
	exceptional: [
		0,
		"Exceptional",
		"storm"
	],
	pouring: [
		.4,
		"Pouring",
		"rain"
	],
	rainy: [
		1,
		"Rain",
		"rain"
	],
	"snowy-rainy": [
		1,
		"Sleet",
		"snow"
	],
	snowy: [
		1,
		"Snow",
		"snow"
	],
	cloudy: [
		2,
		"Cloud",
		"cloud"
	],
	fog: [
		2,
		"Fog",
		"fog"
	],
	windy: [
		2,
		"Wind",
		"wind"
	],
	"windy-variant": [
		2,
		"Wind",
		"wind"
	],
	partlycloudy: [
		3,
		"Part cloud",
		"part"
	],
	sunny: [
		4,
		"Sunny",
		"sun"
	],
	"clear-night": [
		4,
		"Clear",
		"sun"
	]
}, Po = (e) => No[e] ?? [
	2,
	e.replace(/[-_]/g, " "),
	"cloud"
], Fo = M`<path d="M7,16 a3.6,3.6 0 0 1 .5,-7.1 a5,5 0 0 1 9.7,1.2 a3,3 0 0 1 -.6,5.9 Z"/>`, Io = {
	sun: M`<circle cx="12" cy="12" r="4.2"/><path class="line" d="M12,2.5 v3 M12,18.5 v3 M2.5,12 h3 M18.5,12 h3 M5.3,5.3 l2.1,2.1 M16.6,16.6 l2.1,2.1 M5.3,18.7 l2.1,-2.1 M16.6,7.4 l2.1,-2.1"/>`,
	part: M`<circle cx="16.5" cy="7.5" r="3.4"/><path class="line" d="M16.5,1.2 v1.8 M22.8,7.5 h-1.8 M21,3 l-1.3,1.3"/><g transform="translate(-1.5 3)">${Fo}</g>`,
	cloud: M`<g transform="translate(0 -1)">${Fo}</g>`,
	rain: M`<g transform="translate(0 -4)">${Fo}</g><path class="line" d="M8,15.5 l-1.5,4.5 M12.5,15.5 l-1.5,4.5 M17,15.5 l-1.5,4.5"/>`,
	snow: M`<g transform="translate(0 -4)">${Fo}</g><path class="line" d="M7.5,15.5 v4 M5.8,16.5 l3.4,2 M9.2,16.5 l-3.4,2 M16.5,15.5 v4 M14.8,16.5 l3.4,2 M18.2,16.5 l-3.4,2 M12,18 v3.6"/>`,
	storm: M`<g transform="translate(0 -4)">${Fo}</g><path d="M13,13 l-4,5.2 h2.6 l-1.4,4.3 l4.6,-6 h-2.7 Z"/>`,
	fog: M`<path class="line" d="M4,8 h16 M6,12 h14 M4,16 h13 M8,20 h12"/>`,
	wind: M`<path class="line" d="M3,9 h11 a2.6,2.6 0 1 0 -2.6,-2.6 M3,13 h15.5 a2.8,2.8 0 1 1 -2.8,2.8 M3,17 h8"/>`
}, Lo = (e) => j`<svg class="pic" viewBox="0 0 24 24" aria-hidden="true">${Io[e]}</svg>`, Ro = [
	0,
	1,
	2,
	3,
	4
], zo = (e, t, n) => j`<em>${e}</em>${Ro.map((e) => j`<i class=${n && e === Math.round(t) ? "lit" : ""}></i>`)}`;
function Bo(e, t) {
	return {
		barometer(t, n, r = !0) {
			let [i, a, o] = Po(t), s = n === void 0 ? void 0 : Po(n);
			return j`<div class="meter display sky ${r ? "" : "unlit"}">
        <div class="win" role="img" aria-label="Weather: ${a} now${s ? `, ${s[1]} tomorrow` : ""}">
          <span></span>${Mo.map((e) => j`<span class="place">${e}</span>`)}
          ${zo("Now", i, r)}
          ${s ? zo("Tomorrow", s[0], r) : N}
          <div class="slip">${Lo(o)}<span>${a}</span></div>
        </div>
        ${e("Weather")}
      </div>`;
		},
		calendar(n, r) {
			return j`<div class="meter display days">
        <div class="win">
          ${n.map((e) => {
				let [, n, i] = Po(e.sky);
				return j`<div class="day">
              <b>${new Date(e.at).toLocaleDateString(r, { weekday: "short" })}</b>
              ${Lo(i)}
              ${t(`${Math.round(e.high)}°`.padStart(3, " "))}
              <u>${n}</u>
              <s>${e.low === void 0 ? "" : `Low ${Math.round(e.low)}°`}</s>
            </div>`;
			})}
        </div>
        ${e("Forecast")}
      </div>`;
		}
	};
}
var Vo = C`
  .top > .sky { flex: 0 1 250px; } .top > .days { flex: 0 1 290px; }
  .sky .win, .days .win { aspect-ratio: auto; height: 104px; color: var(--sky-ink); }
  .sky .win { display: grid; grid-template-columns: 40px repeat(5, 1fr); align-content: center; align-items: center; gap: 6px 0; padding: 6px 8px; }
  .sky .place, .sky em { font-size: 6.5px; font-style: normal; font-weight: 600; line-height: 1.1; letter-spacing: .04em; text-transform: uppercase; }
  .sky em { text-align: left; opacity: .7; }
  .sky .win i { justify-self: center; width: 8px; height: 8px; border-radius: 50%; background: var(--sky-off); }
  .sky .win i.lit { background: var(--sky-on); box-shadow: var(--sky-glow, none); }
  .sky .win em:nth-of-type(2) ~ i.lit { background: var(--sky-next, var(--sky-on)); }
  .slip { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; }
  .unlit .slip { opacity: .15; }
  .meter .pic { flex: none; width: 20px; height: 20px; margin: 0; fill: currentColor; } .meter .pic .line { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
  .days .win { display: flex; flex-wrap: nowrap; align-items: stretch; justify-content: space-around; gap: 4px; padding: 5px 6px; }
  .day { display: flex; flex: 1 1 0; min-width: 0; flex-direction: column; align-items: center; justify-content: space-between; font-size: 6.5px; letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; }
  /* Its own children only: a nixie tube's figures are b and u too. */
  .day > b { font-size: 8px; font-weight: 600; letter-spacing: .18em; } .day > u, .day > s { text-decoration: none; } .day > s { opacity: .7; }
  .meter .day .pic { width: 17px; height: 17px; }
  .days .figs { --t: 2px; --h: 6px; --w: 9px; } .days .nixies { --fig: 17px; }
`, Ho = (e) => -96 + 48 * e, Uo = (e, t) => [60 + e * Math.sin(t * Math.PI / 180), 61 - e * Math.cos(t * Math.PI / 180)].map((e) => e.toFixed(1)).join(","), Wo = Array.from({ length: 41 }, (e, t) => M`<path class="scale" d="M${Uo(30, -120 + t * 6)} L${Uo(t % 8 == 4 ? 35 : 33, -120 + t * 6)}"/>`), Go = Mo.map((e, t) => M`<text class="word"><textPath href="#round" startOffset="${10 + t * 20}%">${e}</textPath></text>`), Ko = 10;
function qo(e, t, n = !0) {
	let [r, i] = Po(e), a = t === void 0 ? void 0 : Po(t);
	return j`<div class="meter baro">
    <svg viewBox="0 0 120 120" role="img" aria-label=${`Weather: ${i} now${a ? `, ${a[1]} tomorrow` : ""}`}>
      <circle cx="60" cy="60" r="59" fill="url(#ebon)"/><circle cx="60" cy="60" r="58" fill="none" stroke="#fff" stroke-opacity=".12"/>
      ${n ? M`<circle cx="60" cy="61" r="50.5" fill="none" stroke="#ffb347" stroke-opacity=".28" stroke-width="2"/>` : N}
      <circle cx="60" cy="61" r="48" fill="url(#${n ? "lit" : "unlit"})" stroke="#000" stroke-width="2.5"/>
      ${n ? M`<ellipse cx="60" cy="24" rx="24" ry="9" fill="url(#spot)" opacity=".55"/>` : N}
      <path class="scale" d="M${Uo(30, -120)} A30,30 0 1 1 ${Uo(30, 120)}"/>${Wo}${Go}
      <rect x="40" y="83" width="40" height="10" rx="1" fill="#f6ecd0" stroke="#2a1a10" stroke-width=".8"/>
      <text class="slip" x="60" y="90" textLength=${i.length > Ko ? 36 : N} lengthAdjust="spacingAndGlyphs">${i}</text>
      <text class="small" x="60" y="99">ANEROID · DASH-BORED</text>
      ${a ? M`<text class="small" x="60" y="76">BRASS HAND: TOMORROW</text>
        <g class="hand" style="transform: rotate(${Ho(a[0]).toFixed(1)}deg)"><path d="M60,61 V30" stroke="url(#brass)" stroke-width="1.6" stroke-linecap="round"/><path d="M57,34 L60,27 L63,34 Z" fill="#c9a24b" stroke="#7a5c1e" stroke-width=".4"/></g>` : N}
      <g class="hand" style="transform: rotate(${Ho(r).toFixed(1)}deg)"><path d="M60,70 V28" stroke="#111" stroke-width="1.1" stroke-linecap="round"/><circle cx="60" cy="33" r="2.2" fill="none" stroke="#111"/></g>
      <circle cx="60" cy="61" r="5" fill="url(#brass)" stroke="#5a4210" stroke-width=".6"/><path d="M56.5,60 l7,2" stroke="#5a4210"/>
      <path d="M26,44 A40,40 0 0 1 58,20" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2.5" stroke-linecap="round"/>
      <g fill="#161616" stroke="#000" stroke-width=".6"><circle cx="60" cy="6" r="2.2"/><circle cx="13" cy="87" r="2.2"/><circle cx="107" cy="87" r="2.2"/></g>
    </svg>
    ${ao("Weather")}
  </div>`;
}
function Jo(e, t) {
	return j`<div class="days">
    <div class="cards">
      ${e.map((e) => {
		let [, n, r] = Po(e.sky);
		return j`<div class="card">
          <b>${new Date(e.at).toLocaleDateString(t, { weekday: "short" })}</b>
          <svg viewBox="0 0 24 24" aria-hidden="true">${Io[r]}</svg>
          <u>${n}</u>
          <s>${Math.round(e.high)}°${e.low === void 0 ? "" : ` / ${Math.round(e.low)}°`}</s>
        </div>`;
	})}
    </div>
    ${ao("Forecast")}
  </div>`;
}
//#endregion
//#region src/dash-bored/record.ts
var Yo = 864e5;
function Xo(e, t) {
	let n = [];
	for (let r of t) {
		let t = {
			at: r.lu * 1e3,
			...Gt(e, {
				state: r.s,
				attributes: r.a ?? {}
			})
		}, i = n.at(-1);
		(!i || i.on !== t.on || i.phase !== t.phase || i.level !== t.level || i.away !== t.away) && n.push(t);
	}
	return n;
}
function Zo(e, t, n) {
	let r = [];
	return e.forEach((i, a) => {
		let o = Math.max(i.at, t), s = Math.min(e[a + 1]?.at ?? n, n);
		i.on && s > o && r.push([(o - t) / (n - t) * 100, (s - o) / (n - t) * 100]);
	}), r;
}
async function Qo(e, t, n) {
	let r = await e.connection.sendMessagePromise({
		type: "history/history_during_period",
		start_time: (/* @__PURE__ */ new Date(n - Yo)).toISOString(),
		entity_ids: [t.id],
		significant_changes_only: !1,
		no_attributes: t.kind === "light" || !Bt(t.kind)
	});
	return Xo(t.kind, r[t.id] ?? []);
}
//#endregion
//#region src/dash-bored/console/balance.ts
var $o = 172, es = 32, ts = [156, 185], ns = [110, 156], rs = [98, 126], is = [146, 170], as = [156, 158], os = [136, 166], ss = (e) => [140, 124 + e * 15], cs = 12, ls = 120, us = (e) => Math.max(1, Math.floor((e + 12) / $o));
function ds(e, t) {
	let n = $o * t - es, r = 0, i = n, a = 0;
	for (let [t, o] of [
		...e.meter ? [ts] : [],
		...Array(e.knives).fill(os),
		...e.selectors.map(ss),
		...Array(e.knobs).fill(ns),
		...Array(e.dollies).fill(rs),
		...Array(e.tvs).fill(as),
		...e.presets.map(ss),
		...Array(e.alarms).fill(is)
	]) i + t > n && (r += a, i = a = 0), i += t, a = Math.max(a, o);
	return r + a;
}
var fs = 96;
function ps(e, t) {
	let n = Yn(t), r = n.map((t) => t.things.reduce((n, r) => n + cs + ls + ds(e[r], t.wide), -12)), i = /* @__PURE__ */ new Map();
	return n.forEach((e, t) => i.set(e.row, Math.max(i.get(e.row) ?? 0, r[t]))), n.map((e, t) => ({
		...e,
		blank: i.get(e.row) - r[t] - cs >= fs
	}));
}
var ms = (e, t, n = () => !1) => Jn(e.length, (t, n) => ls + ds(e[t], n), t, cs, n), hs = 270, gs = 180, _s = (e, t) => t < 2 ? 0 : -135 + hs * e / (t - 1), vs = (e, t, n, r, i = "") => j`<div class="selector" role="radiogroup" aria-label=${e}>
  <div class="rotary">
    ${t.map((e, n) => j`<button class="stop" tabindex="-1" aria-hidden="true" style="--a: ${_s(n, t.length)}deg" @click=${() => r(n)}>${n + 1}</button>`)}
    <span class="pointer" style="--a: ${n < 0 ? gs : _s(n, t.length)}deg"></span>
  </div>
  <ol class="legend">${i ? j`<li class="head" title=${i}>${i}</li>` : N}${t.map((e, t) => j`<li><button role="radio" aria-checked=${t === n} title=${e} @click=${() => r(t)}><b>${t + 1}</b><span>${e}</span></button></li>`)}</ol>
</div>`, ys = C`
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
`, bs = "alarm_control_panel", xs = "camera", Ss = {
	light: ["", "dimmer"],
	cover: ["wind", "position"],
	climate: ["heat", "target"],
	water_heater: ["heat", "target"],
	media_player: ["sound", "volume"],
	fan: ["air", "speed"],
	humidifier: ["air", "target"]
}, Cs = /* @__PURE__ */ new Set([
	"climate",
	"water_heater",
	"humidifier",
	"media_player",
	xs
]), ws = 18e5, Ts = [
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
], Es = 6, Ds = 3e4, Os = {
	lock: ["locked", "unlocked"],
	cover: ["open", "closed"],
	valve: ["open", "closed"],
	siren: ["sounding", "silent"]
}, ks = {
	lock: ["Unlocked", "Locked"],
	cover: ["Open", "Shut"],
	valve: ["Open", "Shut"],
	siren: ["On", "Off"]
}, As = 6e3, js = 270, Ms = 4, Ns = 1200, Ps = 5e3, Fs = [
	3,
	6,
	12,
	24,
	48
], Is = {
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
}, Ls = (e) => e.dims && !e.away, Rs = (e) => e.kind === bs, zs = (e) => e.kind === xs, Bs = (e) => !Ls(e) && !Rs(e) && !zs(e), Vs = j`<div class="room blank" aria-hidden="true"><i class="vent"></i></div>`, Hs = (e) => {
	let t = Math.ceil(e / 10), n = Math.ceil(e / t);
	return Array.from({ length: t }, (t, r) => Math.min(n, e - r * n));
}, Us = (e) => e.room ? `${e.room} ${e.name}` : e.name;
function Ws(e) {
	let t = e.currentTarget.getBoundingClientRect();
	return Math.atan2(e.clientY - (t.top + t.height / 2), e.clientX - (t.left + t.width / 2)) * 180 / Math.PI;
}
var Gs = class extends Ln {
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
		let t = us(this.renderRoot?.querySelector(".rooms")?.clientWidth || e - 44);
		t !== this._cols && (this._cols = t);
	}
	_surveyed() {
		this._view === "panel" && this._outlook();
	}
	get _reads() {
		return this._view !== "lamps";
	}
	_listen() {
		super._listen();
		let e = this._view;
		(e === "panel" || e === "lamps") && this._follow(Tn, "Sensor Watch's alerts", (e) => {
			let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
			for (let n of e) t.set(n.entity_id, n);
			this._alerts = [...t.values()], this._heard = !0;
		}), (e === "panel" || e === "room" || this._config.entity?.startsWith(`${xs}.`)) && this._follow(En, "The cameras' sightings", (e) => {
			let t = new Map(this._seen.map((e) => [e.id, e])), n = Date.now();
			for (let r of e) t.set(r.id, r), this._later(ws - (n - r.at * 1e3));
			this._seen = [...t.values()].filter((e) => n - e.at * 1e3 < ws);
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
		for (let e of t) Qo(this._hass, e, n).then((t) => r() && (this._chart = {
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
		let r = this._code?.id === e.id ? this._code.wheels : Array(Es).fill(0);
		this._code = {
			id: e.id,
			wheels: r.map((e, r) => r === t ? e + n : e)
		}, clearTimeout(this._hiding), this._timers.delete(this._hiding), this._hiding = setTimeout(() => {
			this._timers.delete(this._hiding), this._code = void 0;
		}, Ds), this._timers.add(this._hiding);
	}
	_alarm(e) {
		let t = this._hass.states[e.id]?.attributes ?? {}, n = e.away ? "not answering" : e.phase === "triggered" ? "sounding" : e.phase ?? (e.on ? "set" : "unset"), { label: r, push: i, wheels: a } = this.kit, o = this._code?.id === e.id ? this._code.wheels : Array(Es).fill(0), s = o.map(no).join(""), c = (t, n) => () => this._call({
			domain: bs,
			service: t,
			ids: [e.id],
			data: s ? { code: s } : void 0
		}, `${Us(e)} (${n})`), l = Ts.filter(([, e]) => t.supported_features & e), u = e.on || e.phase ? [i("Unset", c("alarm_disarm", "unset"))] : l.map(([e, , t]) => i(t, c(e, t.toLowerCase())));
		return j`<div class="alarm ${n}">
      ${r(`${e.name}: ${n}`)}
      ${t.code_format === "number" && !e.away ? a(e.name, o, (t, n) => this._spin(e, t, n)) : N}
      ${e.away ? N : j`<div class="pushes">${u}</div>`}
    </div>`;
	}
	_guarded(e, t, n) {
		if (t) return this._call(Zt(e), Us(e));
		if (this._armed === e.id) {
			if (!(n.detail === 0 || n.target.closest?.(".throw"))) return void (this._armed = "");
			this._call(Zt(e), Us(e));
		}
		this._armed = e.id, clearTimeout(this._dropping), this._timers.delete(this._dropping), this._dropping = setTimeout(() => {
			this._timers.delete(this._dropping), this._armed === e.id && (this._armed = "");
		}, As), this._timers.add(this._dropping);
	}
	_turn(e, t) {
		this._want = {
			id: e.id,
			level: t
		}, clearTimeout(this._waiting), this._timers.delete(this._waiting), this._waiting = setTimeout(() => {
			this._timers.delete(this._waiting), this._grip || (this._want = void 0);
		}, Ps), this._timers.add(this._waiting);
	}
	_dial(e) {
		let t = zs(e) ? en : void 0, { min: n, max: r, step: i, vote: a } = e.span, o = Cs.has(e.kind) ? e.level ?? n : e.on ? e.level ?? r : n, s = () => this._want?.id === e.id ? this._want.level : o, c = (e) => +(Math.round(Math.min(r, Math.max(n, e)) / i) * i).toFixed(2);
		return {
			level: s(),
			turn: (s() - n) / (r - n) * 100,
			held: this._grip?.id === e.id,
			on: {
				down: (t) => {
					t.currentTarget.setPointerCapture(t.pointerId), this._grip = {
						id: e.id,
						level: s(),
						angle: Ws(t),
						x: t.clientX,
						y: t.clientY,
						at: t.clientY,
						moved: !1
					};
				},
				move: (t) => {
					let i = this._grip;
					if (i?.id !== e.id || (i.moved ||= Math.hypot(t.clientX - i.x, t.clientY - i.y) > Ms, !i.moved)) return;
					let a = t.currentTarget, o = a.classList.contains("slide") ? (i.at - t.clientY) / a.getBoundingClientRect().height : void 0;
					i.at = t.clientY;
					let s = Ws(t), l = (s - i.angle + 540) % 360 - 180;
					i.angle = s, i.level = Math.min(r, Math.max(n, i.level + (o ?? l / js) * (r - n))), this._turn(e, c(i.level));
				},
				up: () => {
					let n = this._grip;
					this._grip = void 0, n?.id === e.id && (n.moved && this._want ? this._ask(e, this._want.level, t) : t || this._call(Zt(e), Us(e)));
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
					} else !t && (n.key === "Enter" || n.key === " ") && (n.preventDefault(), this._call(Zt(e), Us(e)));
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
		}, Ns);
		this._timers.add(r);
	}
	_lenses(e) {
		let t = e.filter(zs), n = new Set(e.map((e) => e.id)), r = t.flatMap((e) => e.controls ?? []).filter((e, t, r) => !n.has(e.id) && r.findIndex((t) => t.id === e.id) === t);
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
		let t = e.presets, n = Hs(t.length);
		return n.map((r, i) => {
			let a = t.slice(i * n[0], i * n[0] + r);
			return vs(`${e.name} presets`, a.map((e) => e.name), a.findIndex((t) => t.name === this._turned[e.id]), (t) => {
				this._call(tn(a[t]), `${Us(e)} to ${a[t].name}`), this._turned = {
					...this._turned,
					[e.id]: a[t].name
				};
			}, e.name);
		});
	}
	_pressed(e, t) {
		return this.kit.knife(e.away ? `${e.name}: not answering` : e.name, this._thrown === e.id, () => e.away || this._close(e.id, rn(e), `${t} ${e.name}`));
	}
	_shows(e) {
		return e.devices.filter((e) => !(Rs(e) && this._hass.states[e.id]?.attributes.code_format === "text"));
	}
	_sights() {
		let e = Date.now(), t = /* @__PURE__ */ new Map();
		for (let n of this._survey ? qt(this._survey, this._seen) : []) e - n.at < ws && n.at >= (t.get(n.camera)?.at ?? 0) && t.set(n.camera, n);
		return t;
	}
	_knob(e) {
		let t = this._dial(e), [n, r] = Ss[e.kind], i = Ct.has(e.kind), a = i ? e.on ? `${e.name} ${t.level}°` : `${e.name}: off` : e.kind === "humidifier" ? `${e.name} ${t.level}%` : e.name, o = e.title ?? (i && e.temp !== void 0 ? `now ${e.temp}°` : "");
		return this.kit.knob(a, n, r, t.turn, t.held, i ? `${t.level} degrees` : `${t.level} per cent`, o, t.on, [e.span.min, e.span.max], e.temp);
	}
	_dolly(e) {
		let { dolly: t } = this.kit, n = e.phase ? `${e.name}: ${e.phase}` : e.name, r = Os[e.kind] ? `: ${Os[e.kind][+!e.on]}` : "";
		if (!e.guarded) return t(n, e.on, e.away, () => e.away || this._call(Zt(e), Us(e)), "", r);
		let i = e.kind === "lock" ? !e.on : e.on, a = i || this._armed === e.id, o = i ? "press to shut it, which puts the switch back" : a ? "press the switch to throw it, or anywhere else to shut the guard" : "press to lift it";
		return t(n, i, e.away, (t) => e.away || this._guarded(e, i, t), a ? "up" : "shut", `${r}. Under a guard: ${o}`, ks[e.kind]);
	}
	_screen(e, t) {
		let n = t.get(e.id);
		return this.kit.tv(n ? `${e.name}: ${n.kind} ${F(n.at)}` : e.away ? `${e.name}: not answering` : e.name, n?.photo ?? (e.away ? "" : e.picture ?? ""), this._look(e.id));
	}
	_scenes(e) {
		return e.scenes.length === 1 ? this.kit.knife(e.scenes[0].name, this._thrown === e.scenes[0].id, () => this._throw(e.scenes[0])) : Hs(e.scenes.length).map((t, n) => {
			let r = e.scenes.slice(n * Hs(e.scenes.length)[0], n * Hs(e.scenes.length)[0] + t), i = r.reduce((e, t, n) => t.at > (r[e]?.at ?? 0) ? n : e, -1), a = r.findIndex((e) => e.id === this._thrown);
			return vs(`${e.name} scenes`, r.map((e) => e.name), a < 0 ? i : a, (e) => this._throw(r[e]));
		});
	}
	_load(e) {
		let t = this._shows(e), n = this._lenses(t);
		return {
			knobs: t.filter(Ls).length + n.zooms.length,
			dollies: t.filter(Bs).length + n.switches.length,
			alarms: t.filter(Rs).length,
			tvs: t.filter(zs).length,
			meter: e.temp !== void 0,
			knives: +(e.scenes.length === 1) + n.pressed.length,
			selectors: e.scenes.length > 1 ? Hs(e.scenes.length) : [],
			presets: n.turned.flatMap((e) => Hs(e.presets.length).map((e) => e + 1))
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
			racks: ps(d, this._view === "room" ? [{
				wide: this._cols,
				first: !0,
				under: !1
			}] : ms(d, this._cols, u))
		});
		let { racks: p } = this._rows, m = !this._lost, h = 1, g = (e) => {
			let n = this._shows(e), r = n.filter((e) => e.kind === "light" && !e.away), s = r.reduce((e, t) => e + (t.on ? t.level ?? 100 : 0), 0) / (r.length * 100 || 1), c = e.devices.length - n.length, l = n.filter((e) => !zs(e)), u = this._lenses(n);
			return j`<section class="room">
        ${o(s ? .35 + s * .65 : 0)}${i(e.name)}
        <div class="works">${e.temp === void 0 ? N : a(`${e.temp.toFixed(1)}°`, 5, 30, e.temp, "°C", ++h, m)}
        ${u.pressed.map((t) => this._pressed(t, e.name))}${e.scenes.length ? this._scenes(e) : N}
        <div class="dials">${n.filter(Ls).map((e) => this._knob(e))}${u.zooms.map((e) => this._zoom(e))}</div>
        <div class="dollies">${n.filter(Bs).map((e) => this._dolly(e))}${u.switches.map((e) => this._dolly(e))}</div>
        ${n.filter(zs).map((e) => this._screen(e, t))}${u.turned.map((e) => this._presets(e))}${n.filter(Rs).map((e) => this._alarm(e))}</div>
        ${c ? j`<div class="more" title="An alarm whose code is not in digits is not on this panel.">${i(`and ${c} more`)}</div>` : N}
        ${l.length ? j`<button class="rec" aria-label="${e.name}: chart of the last day" @click=${() => this._record(e, l)}>${i("Chart")}</button>` : N}
      </section>`;
		}, _ = (e) => {
			let { row: t, column: n } = p[e], a = c[p[e].things[0]].floor, o = 0;
			for (let n = e; n < p.length && p[n].row === t && (n === e || !u(p[n].things[0])); n++) o += p[n].wide;
			return j`<div class="floor ${n > 1 ? "barred" : ""}" style="grid-row: ${t * 2 + 1}; grid-column: ${n} / span ${o}">${i(a ?? "Elsewhere")}${a ? j`<span class="pushes">${r.filter((e) => e.floor === a).map((e) => s(e.name, () => this._throw(e)))}</span>` : N}</div>
        ${n > 1 ? j`<i class="bar" style="grid-row: ${t * 2 + 1} / span 2; grid-column: ${n}"></i>` : N}`;
		}, v = (e) => !!p[e] && p[e].column > 1 && u(p[e].things[0]);
		return j`<div class="rooms" style="--cols: ${this._cols}">${p.map((e, t) => j`${u(e.things[0]) ? _(t) : N}<div class="bay ${e.blank ? "blanked" : ""} ${v(t) ? "barred" : ""} ${v(t + 1) ? "bars" : ""}" style="grid-row: ${e.row * 2 + 2}; grid-column: ${e.column} / span ${e.wide}">${e.things.map((e) => g(c[e]))}${e.blank ? Vs : N}</div>`)}</div>`;
	}
	_lamps(e) {
		let { jewel: t, label: n } = this.kit, r = this._alerts.filter((e) => e.level !== mn).sort((e, t) => (gn[t.level] ?? 0) - (gn[e.level] ?? 0) || e.began - t.began);
		return r.length ? j`<div class="lamps">${r.map((e) => j`<div class="alert" role="status">${t(e.level)}${n(`${e.name}: ${e.message || e.level}, since ${F(e.began * 1e3)}`)}</div>`)}</div>` : e ? j`<div class="lamps"><div class="alert" role="status">${t(this._heard ? mn : "")}${n(this._heard ? "Sensor Watch: all well" : "Waiting for Sensor Watch")}</div></div>` : N;
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
		if (s && Rs(s) && o.attributes.code_format === "text") return r(`${s.name}: its code is in words, and the Console has only thumbwheels for digits`);
		if (s) return zs(s) ? this._screen(s, this._sights()) : Rs(s) ? this._alarm(s) : Ls(s) ? j`<div class="dials">${this._knob(s)}</div>` : j`<div class="dollies">${this._dolly(s)}</div>`;
		let c = t.find((e) => e.id === a);
		if (c) return j`<div class="knives">${n(c.name, this._thrown === a, () => this._throw(c))}</div>`;
		let l = o.attributes.friendly_name ?? a, u = o.attributes.device_class, d = o.attributes.unit_of_measurement ?? "", f = Number(o.state);
		if (u !== "power" && !Is[u]) return r(`${l}: the Console has no meter for this`);
		if (o.state === "" || !Number.isFinite(f)) return r(`${l}: not answering`);
		let p = [...a].reduce((e, t) => e + t.charCodeAt(0), 0), m = `${l}: ${o.state} ${d}`.trim();
		if (u !== "power") return i(m, Is[u][0], Is[u][1], f, Is[u][2], p, !this._lost);
		let h = d === "kW" ? f : f / 1e3;
		return i(m, 0, Fs.find((e) => h <= e) ?? Fs.at(-1), h, "kW", p, !this._lost);
	}
	_whole() {
		let { barometer: e, calendar: t, knife: n, meter: r, tv: i } = this.kit, a = this._house, o = (/* @__PURE__ */ new Date()).toDateString(), s = this._days.find((e) => new Date(e.at).toDateString() !== o), c = this._sights(), l = new Set(a.rooms.flatMap((e) => e.devices.filter(zs).map((e) => e.id))), u = !this._lost, d = new Set(a.rooms.map((e) => e.floor)), f = a.scenes.filter((e) => !e.floor || !d.has(e.floor));
		return j`${this._lamps(!1)}
      <div class="top">
        ${a.kw === void 0 ? N : r("Mains draw", 0, Fs.find((e) => a.kw <= e) ?? Fs.at(-1), a.kw, "kW", 0, u)}
        ${a.outside ? r("Outside air", -10, 30, a.outside.temp, "°C", 1, u) : N}
        ${a.outside ? e(a.outside.sky, s?.sky, u) : N}
        ${this._days.length ? t(this._days, this._hass.locale?.language ?? "en-GB") : N}
        ${[...c.values()].filter((e) => !l.has(e.camera)).map((e) => i(`${e.name}: ${e.kind} ${F(e.at)}`, e.photo ?? "", this._look(e.camera)))}
        ${f.length ? j`<div class="knives">${f.map((e) => n(e.name, this._thrown === e.id, () => this._throw(e)))}</div>` : N}
        <slot name="era"></slot>
      </div>
      ${this._rooms(a.rooms, c, !0, a.scenes)}`;
	}
	render() {
		let { DEFS: e, label: t, recorder: n } = this.kit, r = this._view, i = this._house, a = (n) => j`<div class="panel as-${r} ${r === "instrument" && this._config.backing === !1 ? "bare" : ""}" @click=${this._elsewhere}>
      ${e}
      ${this._lost ? j`<div class="warn"><span class="lamp"></span>${t(`No connection to Home Assistant since ${F(this._lost)}. What is shown is as it was then.`)}</div>` : N}
      ${this._fault ? j`<div class="warn"><span class="lamp"></span>${t(this._fault)}</div>` : N}
      ${n}
    </div>`;
		if (!this._hass) return a(t("Waiting for Home Assistant"));
		if (r === "lamps") return a(this._lamps(!0));
		if (!i) return a(t("Waiting for Home Assistant"));
		if (r === "instrument") return a(this._instrument(i.rooms.flatMap((e) => e.devices), Yt(i)));
		let o = i.rooms.find((e) => e.name === this._chart?.room), s = this._chart && o ? n(o.name, this._shows(o).filter((e) => !zs(e)).map((e) => ({
			name: e.name,
			lo: e.span.min,
			hi: e.span.max,
			changes: this._chart.records[e.id]
		})), this._chart.at, this._chart.fault, () => this._chart = void 0) : N;
		return a(j`${r === "room" ? this._room(i.rooms) : this._whole()}${s}`);
	}
}, Ks = [C`
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
`, ys], qs = "dash-bored-bakelite", Js = class extends Gs {
	constructor(...e) {
		super(...e), this.kit = {
			...ro,
			recorder: Ao,
			barometer: qo,
			calendar: Jo
		};
	}
	static {
		this.styles = [
			Nn,
			Ks,
			jo
		];
	}
	connectedCallback() {
		super.connectedCallback(), In("Dash-Bored Hand", "HomemadeApple-Regular.ttf");
	}
}, Ys = (e, t) => {
	let n = (t - 90) * Math.PI / 180;
	return [(60 + e * Math.cos(n)).toFixed(1), (96 + e * Math.sin(n)).toFixed(1)];
}, Xs = 33, Zs = M`<path class="scale" d="M${Ys(80, -33)} A80,80 0 0 1 ${Ys(80, Xs)}"/><path class="over" d="M${Ys(77.5, Xs * .6)} A77.5,77.5 0 0 1 ${Ys(77.5, Xs)}"/>
  ${Array.from({ length: 21 }, (e, t) => M`<path class="scale" d="M${Ys(t % 5 ? 77 : 74, -33 + t * Xs * .1)} L${Ys(80, -33 + t * Xs * .1)}"/>`)}`;
function Qs(e, t, n, r, i, a, o, s) {
	let c = Math.min(1, Math.max(0, (r - t) / (n - t))), l = [
		0,
		1,
		2,
		3,
		4
	].map((e) => {
		let [r, i] = Ys(68, -33 + e * Xs * .5);
		return M`<text x=${r} y=${Number(i) + 2}>${+(t + (n - t) * e / 4).toFixed(1)}</text>`;
	});
	return j`<div class="meter ${o ? "" : "unlit"}">
    <div class="win" role="img" aria-label="${e}: ${r} ${i}">
      <svg class="face" viewBox="0 0 120 70" aria-hidden="true">${Zs}${l}<text class="unit" x="60" y="52">${i}</text></svg>
      <div class="needle" style="transform: rotate(${(-33 + 66 * c).toFixed(1)}deg)"><svg class="waver" viewBox="0 0 120 70" aria-hidden="true" style="animation-duration: ${eo[a % eo.length] * 16}ms"><path d="M60,96 V19"/></svg></div>
      <i class="cowl"></i>
    </div>
    ${s}
  </div>`;
}
//#endregion
//#region src/dash-bored/console/figures.ts
var $s = {
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
function ec(e, t, n, r = +(t === "°")) {
	let i = Math.max(...n.map((e) => String(Math.trunc(Math.abs(e))).length)) + +(n[0] < 0), a = i + (r ? 1 + r : 0), o = " ".repeat(i) + (r ? "." + " ".repeat(r) : "");
	return (e === "" ? o : Number(e).toFixed(r).padStart(a, " ")) + t;
}
function tc(e, t, n) {
	let r = /^(.*?) (-?[\d.]+)([°%])$/.exec(e), i = t === "heat" ? /^(.*): off$/.exec(e) : null;
	return {
		legend: r?.[1] ?? i?.[1] ?? e,
		shown: r ? ec(r[2], r[3], n) : i ? ec("", "°", n) : void 0,
		lit: !!r
	};
}
var nc = (e, t = !0, n = e.trim()) => j`<span class="figs ${t ? "" : "dark"}" role="img" aria-label=${n}>${[...e].map((e) => e === "." ? j`<i class="dp"></i>` : e === "°" ? j`<i class="deg"></i>` : e === "%" ? j`<i class="pc">%</i>` : j`<i class="d">${[..."abcdefg"].map((n) => j`<b class="s${n} ${t && $s[e]?.includes(n) ? "lit" : ""}"></b>`)}</i>`)}</span>`, rc = Array.from({ length: 20 }, (e, t) => t);
function ic(e, t, n, r, i, a, o) {
	let s = Math.round(Math.min(1, Math.max(0, (r - t) / (n - t))) * 20);
	return j`<div class="meter display ${a ? "" : "unlit"}">
    <div class="win" role="img" aria-label="${e}: ${r} ${i}">${nc(ec(a ? String(r) : "", "", [t, n], i === "kW" ? 2 : 1), a, "")}<span class="unit">${i}</span>
      <div class="sweep">${rc.map((e) => j`<i class="${a && e < s ? "lit" : ""} ${a && e === s - 1 ? "tip" : ""}"></i>`)}</div></div>
    ${o}
  </div>`;
}
var ac = (e, t, n) => j`<div class="wheels" role="group" aria-label="${e} code">${t.map((e, t) => j`<div class="wheel">
    <button aria-label="Figure ${t + 1} on" @click=${() => n(t, 1)}></button>
    ${nc(no(e) || " ", !0, `Figure ${t + 1}: ${no(e) || "blank"}`)}
    <button aria-label="Figure ${t + 1} back" @click=${() => n(t, -1)}></button>
  </div>`)}</div>`, oc = C`
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
`, sc = /* @__PURE__ */ t({
	DEFS: () => cc,
	dolly: () => mc,
	figs: () => nc,
	jewel: () => fc,
	knife: () => _c,
	knob: () => hc,
	label: () => lc,
	meter: () => dc,
	push: () => gc,
	tv: () => yo,
	valve: () => pc,
	wheels: () => ac
}), cc = j``, lc = (e) => j`<span class="label">${e}</span>`, uc = Array.from({ length: 10 }, (e, t) => t);
function dc(e, t, n, r, i, a = 0, o = !0) {
	return a >= 2 && a % 3 == 1 ? ic(e, t, n, r, i, o, lc(e)) : Qs(e, t, n, r, i, a, o, lc(e));
}
var fc = (e) => j`<span class="jewel ${e}" aria-hidden="true"></span>`, pc = (e) => {
	let t = e ? Math.max(1, Math.round((e - .35) / .65 * 10)) : 0;
	return j`<div class="leds" role="img" aria-label="Lights: ${t} of 10">${uc.map((e) => j`<span class=${e < t ? "on" : ""}></span>`)}</div>`;
}, mc = (e, t, n, r, i = "", a = "", o = ["On", "Off"]) => j`<button class="dolly ${t ? "on" : ""} ${n ? "away" : ""} ${i}" aria-pressed=${t} aria-label=${n ? `${e}: not answering` : e + a} @click=${r}>
  <span class="soft"><span class="throw"><i class="pilot"></i></span>${i ? j`<i class="flap"></i>` : N}</span>
  ${lc(e)}
</button>`, hc = (e, t, n, r, i, a, o, s, c = [0, 100], l) => {
	let { legend: u, shown: d, lit: f } = tc(e, t, c), p = Math.round(r / 10), m = o || t === "sound", h = (o, c) => j`<div class="${o} ${t} ${i ? "drag" : ""}" role="slider" tabindex="0" aria-orientation=${o === "slide" ? "vertical" : N} aria-label="${e} ${n}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(r)} aria-valuetext=${a} style="--lvl: ${r.toFixed(1)}"
    @pointerdown=${s.down} @pointermove=${s.move} @pointerup=${s.up} @pointercancel=${s.drop} @keydown=${s.key}>${c}</div>`;
	return j`<div class="dial ${t}">
    <div class="dimmer">${t === "heat" ? h("knob", j`<span class="mark"></span>`) : j`<div class="ladder ${t}" aria-hidden="true">${uc.map((e) => j`<i class=${e < p ? "lit" : ""}></i>`)}</div>${h("slide", j`<i class="cap"></i>`)}`}</div>
    ${lc(u)}${d === void 0 ? N : nc(d, f)}${m ? j`<span class="note">${o ? lc(o) : N}</span>` : N}
  </div>`;
}, gc = (e, t) => j`<button class="push" @click=${t}><span class="key">${e}</span></button>`, _c = (e, t, n) => j`<button class="knife ${t ? "closed" : ""}" @click=${n}><i class="bar"></i><span class="key"></span>${lc(e)}</button>`, vc = 96, yc = 6, bc = 6, xc = 36e5;
function Sc(e, t = vc) {
	let n = Array(t).fill(void 0);
	for (let r of e) for (let e = 0; e + 1 < r.length; e += 2) {
		let [i, a] = r[e], o = r[e + 1][0];
		for (let e = Math.max(0, Math.ceil(i * t - .5)); e < t && (e + .5) / t < o; e++) n[e] = a;
	}
	return n;
}
function Cc(e, t, n, r, i) {
	let a = n - 24 * xc, o = Math.ceil(a / xc) * xc, s = Array.from({ length: 24 }, (e, t) => o + t * xc).filter((e) => e <= n && new Date(e).getHours() % 3 == 0);
	return j`<dialog class="recorder" aria-label="${e}: the last day" @close=${i} @click=${(e) => e.target === e.currentTarget && i()}>
    ${lc(`${e}: the last day`)}
    ${r ? j`<div class="warn"><span class="lamp"></span>${lc(`The record could not be read (${r}).`)}</div>` : N}
    <div class="analyser" role="img" aria-label="When each device in ${e} was on">
      ${t.map((e) => j`<div class="lane"><span class="name">${e.name}</span>
          ${e.changes ? j`<span class="columns">${Sc(wo(e.changes, a, n, e.lo, e.hi)).map((e) => j`<i class=${e === void 0 ? "gap" : ""} style="--n: ${Math.round((e ?? 0) * bc)}"></i>`)}</span>` : j`<span class="columns reading">${r ? "" : "reading…"}</span>`}</div>`)}
      <div class="lane hours"><span class="name"></span><span class="columns">${s.map((e) => j`<b style="left: ${((e - a) / (n - a) * vc * yc).toFixed(0)}px">${String(new Date(e).getHours()).padStart(2, "0")}</b>`)}</span></div>
    </div>
    ${gc("Close", i)}
  </dialog>`;
}
//#endregion
//#region src/dash-bored/console/bargraph/styles.ts
var wc = C`
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
  ${oc}
  .sweep i { transform: skewX(-12deg); } .sweep i:nth-child(n + 17) { background: #ff6a3a; }
  /* The last lit segment flickers now and then: all that is left of a needle's waver. */
  .sweep .tip { animation: tip 5.3s steps(1) infinite; }
  @keyframes tip { 0%, 73%, 89% { opacity: 1; } 71% { opacity: .4; } 88% { opacity: .6; } }

  /* Alerts: an LED, and what is wrong on a dot-matrix fluorescent line. A critical one flashes. */
  .lamps { display: flex; flex-wrap: wrap; gap: 10px 24px; margin-bottom: 14px; padding: 10px 12px; }
  .alert { display: flex; align-items: center; gap: 9px; max-width: 100%; }
  /* The weather (../weather.ts): a fluorescent display, with a green LED for now and an amber one for tomorrow. */
  .panel { --sky-ink: var(--vfd); --sky-on: #4fdc4f; --sky-next: var(--amber); --sky-off: rgba(255,255,255,.09); --sky-glow: 0 0 6px currentColor; }
  .panel .sky .win, .panel .days .win { text-shadow: 0 0 5px rgba(125,247,230,.7); }
  .panel .sky .win i.lit { color: var(--sky-on); } .panel .sky .win em:nth-of-type(2) ~ i.lit { color: var(--sky-next); }
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
`, Tc = "dash-bored-bargraph", Ec = class extends Gs {
	constructor(...e) {
		super(...e), this.kit = {
			...sc,
			recorder: Cc,
			...Bo(lc, nc)
		};
	}
	static {
		this.styles = [
			Nn,
			Ks,
			wc,
			Vo
		];
	}
}, Dc = /* @__PURE__ */ t({
	DEFS: () => Oc,
	dolly: () => Hc,
	jewel: () => Lc,
	knife: () => Zc,
	knob: () => Yc,
	label: () => kc,
	meter: () => Ic,
	push: () => Xc,
	readout: () => Mc,
	tv: () => yo,
	valve: () => Rc,
	wheels: () => xo
}), Oc = j`<svg class="defs" width="0" height="0" aria-hidden="true"><defs>
  <linearGradient id="chrome" x1="0" x2="1"><stop offset="0" stop-color="#6d7175"/><stop offset=".28" stop-color="#f4f6f7"/><stop offset=".5" stop-color="#a9adb1"/><stop offset=".72" stop-color="#e3e6e8"/><stop offset="1" stop-color="#55595d"/></linearGradient>
  <linearGradient id="nut" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f4f5"/><stop offset=".5" stop-color="#8d9195"/><stop offset="1" stop-color="#d5d8da"/></linearGradient>
  <linearGradient id="dial" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9fbf4"/><stop offset=".45" stop-color="#9fe3d2"/><stop offset="1" stop-color="#3f9d94"/></linearGradient>
  <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b9390"/><stop offset="1" stop-color="#565d5b"/></linearGradient>
  <linearGradient id="moulded" x1="0" x2="1"><stop offset="0" stop-color="#a51013"/><stop offset=".2" stop-color="#f0322e"/><stop offset=".55" stop-color="#d81b1d"/><stop offset=".85" stop-color="#b01316"/><stop offset="1" stop-color="#8a0c0f"/></linearGradient>
  <radialGradient id="lens" cx=".4" cy=".35"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs></svg>`, kc = (e) => j`<span class="label" role="img" aria-label=${e}>${e.split(" ").map((e, t) => j`<span class="word">${[...e].map((e, n) => {
	let r = e.charCodeAt(0) * 31 + n * 17 + t * 7;
	return j`<i style="--y: ${((r % 11 - 5) * .22).toFixed(2)}px; --r: ${((r % 7 - 3) * .55).toFixed(2)}deg">${e}</i>`;
})}</span> `)}</span>`, Ac = "#3a0d0a", jc = {
	a: "M2.5,1 H7.5",
	b: "M9,2.5 V8",
	c: "M9,10 V15.5",
	d: "M2.5,17 H7.5",
	e: "M1,10 V15.5",
	f: "M1,2.5 V8",
	g: "M2.5,9 H7.5"
};
function Mc(e, t = !0) {
	let n = 3, r = t ? "#ff3a22" : Ac, i = [...e.replace("%", "")].map((e) => {
		let t = n;
		return e === "." ? (n += 4, M`<circle cx=${t} cy="17" r="1" fill=${r}/>`) : (n += 12, e === "°" ? M`<path d="M${t + 1},1 h4 v4 h-4 z" fill="none" stroke=${r} stroke-width="1.3"/>` : M`<g transform="translate(${t} 0)" stroke-width="1.7" stroke-linecap="round">${Object.entries(jc).map(([t, n]) => M`<path d=${n} stroke=${$s[e]?.includes(t) ? r : Ac}/>`)}</g>`);
	});
	return j`<svg class="readout" viewBox="0 -3 ${n + 2} 24" height="22" role="img" aria-label=${e}><rect x="0" y="-3" width=${n + 2} height="24" rx="2" fill="#160504"/>${i}</svg>`;
}
var Nc = (e, t) => {
	let n = (t - 90) * Math.PI / 180;
	return `${(60 + e * Math.cos(n)).toFixed(1)},${(74 + e * Math.sin(n)).toFixed(1)}`;
}, Pc = {
	"°C": "TEMPERATURE °C",
	kW: "POWER kW"
}, Fc = Array.from({ length: 21 }, (e, t) => M`<path d="M${Nc(50, -50 + t * 5)} L${Nc(t % 4 ? 53 : 56, -50 + t * 5)}" stroke=${t > 16 ? "#c9170f" : "#101614"} stroke-width=${t % 4 ? .6 : 1.1}/>`);
function Ic(e, t, n, r, i, a = 0, o = !0) {
	let s = Array.from({ length: 6 }, (e, r) => {
		let [i, a] = Nc(41, -50 + r * 20).split(",");
		return M`<text x=${i} y=${Number(a) + 2}>${+(t + (n - t) * r / 5).toFixed(1)}</text>`;
	});
	return j`<div class="meter">
    <svg viewBox="0 0 120 84" role="img" aria-label="${e}: ${r} ${i}">
      <rect x="1" y="1" width="118" height="82" rx="4" fill="#101112"/><rect x="1.5" y="1.5" width="117" height="81" rx="3.5" fill="none" stroke="#fff" stroke-opacity=".2"/>
      <rect x="7" y="7" width="106" height="58" rx="2" fill="url(#${o ? "dial" : "dark"})"/>
      ${o ? M`<rect x="7" y="7" width="106" height="20" rx="2" fill="#fff" opacity=".22"/>` : N}
      <path d="M${Nc(50, -50)} A50,50 0 0 1 ${Nc(50, 34)}" fill="none" stroke="#101614" stroke-width=".8"/><path d="M${Nc(50, 34)} A50,50 0 0 1 ${Nc(50, 50)}" fill="none" stroke="#c9170f" stroke-width="2"/>
      ${Fc}${s}<text class="legend" x="60" y="60">${Pc[i] ?? i}</text>
      <clipPath id="window"><rect x="7" y="7" width="106" height="58" rx="2"/></clipPath>
      <g clip-path="url(#window)"><g class="needle" style="transform: rotate(${co(r, t, n).toFixed(1)}deg)"><g class="waver" style="animation-duration: ${eo[a % eo.length] * 16}ms"><path d="M60,74 V19" stroke="#0b0d0c" stroke-width=".9"/></g></g></g>
      <rect x="7" y="7" width="106" height="58" rx="2" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.6"/><path d="M11,10 L52,10 L38,34 L11,34 Z" fill="#fff" opacity=".1"/>
      <circle cx="60" cy="74" r="4" fill="#1d1f20" stroke="#000"/><path d="M57,74 h6" stroke="#000" stroke-width="1.1"/>
    </svg>
    ${kc(e)}
  </div>`;
}
var Lc = (e) => j`<span class="jewel ${e}" aria-hidden="true">${e}</span>`, Rc = (e) => {
	let t = e ? Math.max(1, Math.round((e - .35) / .65 * 5)) : 0;
	return j`<div class="leds" role="img" aria-label="Lights: ${t} of 5">${[
		0,
		1,
		2,
		3,
		4
	].map((e) => j`<span class=${e < t ? "on" : ""}></span>`)}</div>`;
}, zc = (e) => +(e.length * 3.05 + 5).toFixed(1), Bc = [
	7.4,
	6.6,
	5.8
].map((e) => M`<circle cx="29" cy="46" r=${e} fill="none" stroke="#4b4f53" stroke-width=".45"/>`), Vc = Array.from({ length: 7 }, (e, t) => `M${25.4 + t * 1.2},1.6 v5.8`).join(" "), Hc = (e, t, n, r, i = "", a = "", o = ["On", "Off"]) => j`<button class="dolly ${t ? "on" : ""} ${n ? "away" : ""} ${i}" aria-pressed=${t} aria-label=${n ? `${e}: not answering` : e + a} @click=${r}>
  <svg viewBox=${i ? "0 -30 64 114" : "0 0 64 84"}>
    ${i ? M`<path d="M12.5,-3 h33 q2,0 2,2 v82 q0,2 -2,2 h-33 q-2,0 -2,-2 v-82 q0,-2 2,-2 z" fill="#1d1e20" stroke="#000" stroke-width=".6"/><path d="M11.4,-1 v80" stroke="#fff" stroke-opacity=".16" stroke-width=".8"/>` : M`<rect x="12" y="9" width="34" height="74" rx="2" fill="#141516"/>`}
    <rect x=${29 - zc(o[0]) / 2} y="12.4" width=${zc(o[0])} height="7.2" rx="1" fill="#c9170f"/><text class="onoff" x="29" y="18">${o[0]}</text>
    <rect x=${29 - zc(o[1]) / 2} y="73.4" width=${zc(o[1])} height="7.2" rx="1" fill="#050505" stroke="#e9e9e7" stroke-width=".4"/><text class="onoff" x="29" y="79">${o[1]}</text>
    <circle cx="54" cy="76" r="6.5" fill="url(#nut)" stroke="#444" stroke-width=".6"/><circle class="pilot" cx="54" cy="76" r="4.3"/><circle cx="54" cy="76" r="4.3" fill="url(#lens)"/>
    <g class="throw"><circle cx="29" cy="46" r="17" fill="transparent"/><circle cx="29" cy="46.8" r="12.4" fill="#000" opacity=".45"/>
    <path d="M29,34.6 l9.9,5.7 v11.4 l-9.9,5.7 l-9.9,-5.7 v-11.4 z" fill="url(#nut)" stroke="#33363a" stroke-width=".7"/><path d="M29,34.6 l9.9,5.7 M19.1,51.7 l9.9,5.7" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>
    <circle cx="29" cy="46" r="8.4" fill="url(#chrome)" stroke="#33363a" stroke-width=".6"/>${Bc}<circle cx="29" cy="46" r="4.6" fill="#0d0e0f"/><circle cx="29" cy="46" r="3.5" fill="url(#nut)"/>
    <g class="lever"><path d="M28.6,48 L27.2,31 Q27.2,26 31.2,26 Q35.2,26 35.2,31 L33.4,48 Z" fill="#000" opacity=".3"/>
      <path d="M26.7,46 L24.9,29.5 Q24.9,23.6 29,23.6 Q33.1,23.6 33.1,29.5 L31.3,46 Z" fill="url(#chrome)" stroke="#2f3235" stroke-width=".6"/>
      <path d="M27,29 L28,44" stroke="#fff" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round"/><ellipse cx="29" cy="26.8" rx="3.3" ry="2.2" fill="#fff" opacity=".6"/></g></g>
    ${i ? M`<g class="shell shut-shell">
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
          <rect x="25" y="1.4" width="8.4" height="6.2" rx="1" fill="#aeb2b6"/><path d="${Vc}" stroke="#4d5154" stroke-width=".55"/>
          <circle cx="46" cy="4.5" r="2.7" fill="url(#nut)" stroke="#2f3235" stroke-width=".5"/><path d="M44.4,4.5 h3.2 M46,2.9 v3.2" stroke="#2f3235" stroke-width=".7"/><circle cx="12.4" cy="4.5" r="1.7" fill="url(#nut)" stroke="#2f3235" stroke-width=".4"/>` : N}
  </svg>
  ${kc(e)}
</button>`, Uc = Array.from({ length: 11 }, (e, t) => {
	let n = (-135 + t * 27 - 90) * Math.PI / 180, r = (e) => `${(52 + e * Math.cos(n)).toFixed(1)},${(52 + e * Math.sin(n)).toFixed(1)}`;
	return M`<path d="M${r(41)} L${r(t % 5 ? 46 : 49)}" stroke="#141516" stroke-width=${t % 5 ? .9 : 1.8}/>`;
}), Wc = (e, t) => {
	let n = (t - 90) * Math.PI / 180;
	return `${(52 + e * Math.cos(n)).toFixed(1)},${(52 + e * Math.sin(n)).toFixed(1)}`;
}, Gc = "#1f8f45", Kc = "#e2512a", qc = Array.from({ length: 21 }, (e, t) => {
	let n = -135 + t * 13.5;
	return M`<path d="M${Wc(t % 5 ? 26.5 : 25, n)} L${Wc(30, n)}" stroke=${t < 10 ? Gc : t > 10 ? Kc : "#141516"} stroke-width=${t % 5 ? .8 : 1.4}/>`;
});
function Jc(e, t, n) {
	let r = [
		0,
		1,
		2,
		3,
		4
	].map((n) => {
		let [r, i] = Wc(37.2, -135 + n * 67.5).split(",");
		return M`<text x=${r} y=${Number(i) + 2.2} fill=${n < 2 ? Gc : n > 2 ? Kc : "#141516"}>${Math.round(e + (t - e) * n / 4)}</text>`;
	}), i = n === void 0 ? void 0 : -135 + 270 * Math.min(1, Math.max(0, (n - e) / (t - e)));
	return M`<rect x="2.5" y="2.5" width="99" height="99" rx="7" fill="#121314" stroke="#000"/><rect x="3.5" y="3.5" width="97" height="97" rx="6" fill="none" stroke="#fff" stroke-opacity=".16"/>
    ${[
		[10, 10],
		[94, 10],
		[10, 94],
		[94, 94]
	].map(([e, t]) => M`<circle cx=${e} cy=${t} r="2.6" fill="url(#nut)" stroke="#000" stroke-width=".4"/><path d="M${e - 1.6},${t - 1.1} l3.2,2.2" stroke="#2a2c2e" stroke-width=".8"/>`)}
    <circle cx="52" cy="52" r="44.5" fill="#000"/><circle class="face" cx="52" cy="52" r="42.5"/>
    <path d="M${Wc(31.3, -135)} A31.3,31.3 0 0 1 ${Wc(31.3, 0)}" fill="none" stroke=${Gc} stroke-width="2.4"/><path d="M${Wc(31.3, 0)} A31.3,31.3 0 0 1 ${Wc(31.3, 135)}" fill="none" stroke=${Kc} stroke-width="2.4"/>
    ${qc}<g class="figures">${r}</g>
    ${i === void 0 ? N : M`<g class="hand" style="transform: rotate(${i.toFixed(1)}deg)"><path d="M52,52 V14" stroke="#d0180f" stroke-width=".9"/><path d="M52,10.5 l-1.9,4.4 h3.8 z" fill="#d0180f"/></g>`}
    <path d="M20,30 A38,38 0 0 1 48,13" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>`;
}
var Yc = (e, t, n, r, i, a, o, s, c = [0, 100], l) => {
	let { legend: u, shown: d, lit: f } = tc(e, t, c), p = d === void 0 ? N : Mc(d, f), m = o || t === "sound";
	return j`<div class="dial ${t}">
    <div class="dimmer"><svg viewBox="0 0 104 104" aria-hidden="true">${t === "heat" ? Jc(c[0], c[1], l) : Uc}</svg>
      <div class="knob ${t} ${i ? "drag" : ""}" role="slider" tabindex="0" aria-label="${e} ${n}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(r)} aria-valuetext=${a} style="--lvl: ${r.toFixed(1)}"
        @pointerdown=${s.down} @pointermove=${s.move} @pointerup=${s.up} @pointercancel=${s.drop} @keydown=${s.key}><span class="flutes"></span><span class="cap"></span><span class="mark"></span></div></div>
    ${kc(u)}${p}${m ? j`<span class="note ${/^now /.test(o) ? "reading" : ""}">${o ? kc(o) : N}</span>` : N}
  </div>`;
}, Xc = (e, t) => j`<button class="push" @click=${t}><span class="key"></span>${kc(e)}</button>`, Zc = (e, t, n) => j`<button class="knife ${t ? "closed" : ""}" @click=${n}><span class="key">${e}</span></button>`, Qc = /* @__PURE__ */ t({
	DEFS: () => $c,
	dolly: () => rl,
	jewel: () => nl,
	knife: () => ol,
	knob: () => il,
	label: () => el,
	meter: () => tl,
	push: () => al,
	tv: () => yo,
	valve: () => Rc,
	wheels: () => ac
}), $c = j``, el = (e) => j`<span class="label">${e}</span>`;
function tl(e, t, n, r, i, a = 0, o = !0) {
	return ic(e, t, n, r, i, o, el(e));
}
var nl = (e) => j`<span class="jewel ${e}" aria-hidden="true"></span>`, rl = (e, t, n, r, i = "", a = "", o = ["On", "Off"]) => j`<button class="dolly ${t ? "on" : ""} ${n ? "away" : ""} ${i}" aria-pressed=${t} aria-label=${n ? `${e}: not answering` : e + a} @click=${r}>
  <span class="rocker"><i class="pilot"></i><span class="throw"><b>I</b><b>O</b></span>${i ? j`<i class="lock"></i>` : N}</span>
  ${el(e)}
</button>`, il = (e, t, n, r, i, a, o, s, c = [0, 100], l) => {
	let { legend: u, shown: d, lit: f } = tc(e, t, c), p = o || t === "sound";
	return j`<div class="dial ${t}">
    <div class="dimmer"><div class="knob ${t} ${i ? "drag" : ""}" role="slider" tabindex="0" aria-label="${e} ${n}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(r)} aria-valuetext=${a} style="--lvl: ${r.toFixed(1)}"
      @pointerdown=${s.down} @pointermove=${s.move} @pointerup=${s.up} @pointercancel=${s.drop} @keydown=${s.key}><span class="disc"></span></div></div>
    ${el(u)}${d === void 0 ? nc(ec(String(Math.round(r)), "%", [0, 100])) : nc(d, f)}${p ? j`<span class="note">${o ? el(o) : N}</span>` : N}
  </div>`;
}, al = (e, t) => j`<button class="push" @click=${t}><span class="key"></span>${el(e)}</button>`, ol = (e, t, n) => j`<button class="knife ${t ? "closed" : ""}" @click=${n}><span class="strip">${e}</span><span class="key"></span></button>`, sl = C`
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
  ${oc}
  .sweep i:nth-child(n) { height: 7px; }

  /* Alerts: an LED, and what is wrong on a character LCD. A critical one flashes. */
  .lamps { display: flex; flex-wrap: wrap; gap: 10px 24px; margin-bottom: 14px; padding: 12px 14px; }
  .alert { display: flex; align-items: center; gap: 9px; max-width: 100%; }
  /* The weather (../weather.ts): an LCD, as a weather station for the home had, its lamps blocks of the display. */
  .panel { --sky-ink: var(--lcd-ink); --sky-on: var(--lcd-ink); --sky-off: rgba(29,38,26,.09); }
  .panel .sky .win i { width: 12px; height: 7px; border-radius: 1px; }
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
`, cl = 104, ll = 640, ul = 34, dl = 36e5, fl = (e, t) => (n, r, i, a, o) => {
	let s = i - 24 * dl, c = (e) => cl + (e - s) / (i - s) * 526, l = Math.ceil(s / dl) * dl, u = Array.from({ length: 24 }, (e, t) => l + t * dl).filter((e) => e <= i), d = r.length * ul + 30;
	return j`<dialog class="recorder" aria-label="${n}: the last day" @close=${o} @click=${(e) => e.target === e.currentTarget && o()}>
    ${e(`${n}: the last day`)}
    ${a ? j`<div class="warn"><span class="lamp"></span>${e(`The record could not be read (${a}).`)}</div>` : N}
    <svg class="scope" viewBox="0 0 ${ll} ${d}" role="img" aria-label="Traces of when each device in ${n} was on">
      <rect class="screen" width=${ll} height=${d} rx="14" fill="#04140d"/>
      ${u.map((e) => {
		let t = new Date(e).getHours() % 3 == 0;
		return M`<path class="grid" d="M${c(e).toFixed(1)},6 V${d - 18}" stroke="#7dffc0" stroke-opacity=${t ? .28 : .1} stroke-width=".6"/>${t ? M`<text class="hour" x=${c(e).toFixed(1)} y=${d - 6}>${String(new Date(e).getHours()).padStart(2, "0")}</text>` : N}`;
	})}
      ${r.map((e, t) => {
		let n = (t + 1) * ul, r = wo(e.changes ?? [], s, i, e.lo, e.hi).map((e) => e.map(([e, t], r) => `${r ? "L" : "M"}${(cl + e * 526).toFixed(1)},${(n - t * 22).toFixed(1)}`).join(" ")).join(" ");
		return M`<g class="channel"><path class="grid" d="M${cl},${n} H${630}" stroke="#7dffc0" stroke-opacity=".16" stroke-width=".5"/>
          <text class="lane" x=${96} y=${n - 3}>${e.name}</text>
          ${e.changes ? M`<path class="glow" d=${r} fill="none" stroke="#3dff9a" stroke-opacity=".3" stroke-width="4" stroke-linejoin="round"/><path class="trace" d=${r} fill="none" stroke="#c9ffe2" stroke-width="1.1" stroke-linejoin="round"/>` : M`<text class="hour" x=${144} y=${n - 3}>${a ? "" : "reading…"}</text>`}</g>`;
	})}
    </svg>
    ${t("Close", o)}
  </dialog>`;
}, pl = "dash-bored-beige", ml = class extends Gs {
	constructor(...e) {
		super(...e), this.kit = {
			...Qc,
			recorder: fl(el, al),
			...Bo(el, nc)
		};
	}
	static {
		this.styles = [
			Nn,
			Ks,
			sl,
			Vo
		];
	}
}, hl = (e, t, n = {}, r = {}) => class extends Xe {
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
		super.connectedCallback(), l().then(() => this._ready = !0);
	}
	render() {
		return !this.hass || !this._config || !this._ready ? N : j`<ha-form
        .hass=${this.hass}
        .data=${{
			...r,
			...this._config
		}}
        .schema=${e}
        .computeLabel=${(e) => t[e.name] ?? e.name}
        .computeHelper=${(e) => n[e.name]}
        @value-changed=${(e) => {
			e.stopPropagation();
			let t = Object.fromEntries(Object.entries(e.detail.value).filter(([e, t]) => t != null && t !== "" && !(e in r && t === r[e])));
			this._config = t, s(this, "config-changed", { config: t });
		}}
      ></ha-form>`;
	}
};
//#endregion
//#region src/dash-bored/room.ts
function gl(e) {
	let t = (t) => t.area_id ?? e.devices?.[t.device_id]?.area_id ?? void 0, n = Object.values(e.entities ?? {}).find((e) => e.entity_id.startsWith("light.") && !e.hidden && t(e));
	return (n && t(n)) ?? Object.keys(e.areas ?? {})[0] ?? "";
}
function _l(e, t) {
	return class extends e {
		static getConfigElement() {
			return document.createElement(`${t}-editor`);
		}
		static getStubConfig(e) {
			return { room: gl(e) };
		}
		setConfig(e) {
			super.setConfig({
				...e,
				rooms: e.room ? [e.room] : []
			});
		}
		get _alone() {
			return !0;
		}
		getCardSize() {
			return 4;
		}
		getGridOptions() {
			return {
				columns: 6,
				min_columns: 3
			};
		}
	};
}
var vl = (e = []) => hl([{
	name: "room",
	required: !0,
	selector: { area: {} }
}, ...e.length ? [{
	name: "style",
	selector: { select: {
		mode: "dropdown",
		options: e.map(([e, t]) => ({
			value: e,
			label: t
		}))
	} }
}] : []], {
	room: "Room",
	style: "Style"
}, { style: "Left empty, the card is in the style last chosen on Dash-Bored's page in this browser." }), yl = Symbol.for(""), bl = (e) => {
	if (e?.r === yl) return e?._$litStatic$;
}, xl = (e) => ({
	_$litStatic$: e,
	r: yl
}), Sl = /* @__PURE__ */ new Map(), Cl = ((e) => (t, ...n) => {
	let r = n.length, i, a, o = [], s = [], c, l = 0, u = !1;
	for (; l < r;) {
		for (c = t[l]; l < r && (a = n[l], (i = bl(a)) !== void 0);) c += i + t[++l], u = !0;
		l !== r && s.push(a), o.push(c), l++;
	}
	if (l === r && o.push(t[r]), u) {
		let e = o.join("$$lit$$");
		(t = Sl.get(e)) === void 0 && (o.raw = o, Sl.set(e, t = o)), n = s;
	}
	return e(t, ...n);
})(j), wl = "dash-bored-console", Tl = "dash-bored-era", El = [
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
], Dl = class extends Xe {
	constructor(...e) {
		super(...e), this.narrow = !1, this._era = El[0].id, this._config = {}, this._told = {}, this._page = !1;
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			narrow: { type: Boolean },
			_era: { state: !0 }
		};
	}
	static {
		this.styles = C`
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
    /* The maker's plate, with a screw at each end: it opens the choice of family (shell.ts), on the page only. */
    .own { flex: none; display: flex; flex-direction: column; align-items: center; gap: 10px; margin-left: auto; }
    .maker { all: unset; flex: none; box-sizing: border-box; cursor: pointer; padding: 8px 22px; border-radius: 3px; text-align: center; color: #f4f0e4; font: 600 9px/1.5 "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif; letter-spacing: .2em; text-transform: uppercase;
      background: radial-gradient(circle at 9px 50%, #8f8f86 0 3px, transparent 3.5px), radial-gradient(circle at calc(100% - 9px) 50%, #8f8f86 0 3px, transparent 3.5px), #111; box-shadow: 0 0 0 1px #777, 0 3px 5px rgba(0,0,0,.5); }
    .maker b { display: block; font-size: 12px; } .maker i { display: block; font-style: normal; opacity: .65; }
    .maker:hover i, .maker:focus-visible i { opacity: 1; } .maker:focus-visible { outline: 2px solid #f4f0e4; outline-offset: 2px; }
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
		return Pn(this) ? {
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
		super.connectedCallback(), this._recall(), Pn(this) && (this._told = this._tell(this._config)), this.toggleAttribute("sample", this._told.sample === !0);
	}
	_recall() {
		let e = this._config.era;
		try {
			e ??= localStorage.getItem(Tl) ?? void 0;
		} catch {}
		El.some((t) => t.id === e) && (this._era = e);
	}
	_turn(e) {
		this._era = e;
		try {
			localStorage.setItem(Tl, e);
		} catch {}
	}
	render() {
		if (!this.hass) return N;
		let e = Math.max(0, El.findIndex((e) => e.id === this._era)), t = El[e], n = (n) => this._switched ? j`<div slot=${n} class="eras ${t.tag ? t.id : ""}" role="radiogroup" aria-label="The Console's era" style="--at: ${e}">
            ${El.map((t, n) => j`<button class="stop ${t.tag ? "" : "unbuilt"}" role="radio" aria-checked=${n === e} aria-label="${t.name}, the ${t.decade}${t.tag ? "" : ": not built yet"}" style="--i: ${n}" @click=${() => this._turn(t.id)}>${t.decade.slice(2, 4)}</button>`)}
            <button class="switch" aria-label="The next era" @click=${() => this._turn(El[(e + 1) % El.length].id)}><span></span></button>
            <span class="named">${t.name}</span>
          </div>` : N, r = (e) => this._page ? j`<div slot=${e} class="own">${n("")}<button class="maker" aria-label="Choose another style of Dash-Bored" @click=${() => s(this, lr)}><b>Dash-Bored</b>Instrument Co.<i>Other models ▸</i></button></div>` : n(e);
		if (t.tag) {
			let e = xl(t.tag);
			return Cl`<${e} class="era" .config=${this._told} .hass=${this.hass} .narrow=${this.narrow} ?panel=${this._page}>${r("era")}</${e}>`;
		}
		return j`<div class="unbuilt-era">
      <div class="plate"><b>${t.name}</b>The Console of the ${t.decade} is not built yet. Turn the switch to another era.</div>
      ${r("")}
    </div>`;
	}
}, Ol = "dash-bored-console-instrument", kl = "dash-bored-console-room", Al = "dash-bored-console-lamps", jl = [
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
], Ml = {
	name: "era",
	selector: { select: {
		mode: "dropdown",
		options: El.map((e) => ({
			value: e.id,
			label: `${e.name}, the ${e.decade}`
		}))
	} }
}, Nl = {
	[Ol]: [
		{
			name: "entity",
			required: !0,
			selector: { entity: { filter: [{ domain: jl }, {
				domain: "sensor",
				device_class: [
					"temperature",
					"humidity",
					"power"
				]
			}] } }
		},
		Ml,
		{
			name: "backing",
			default: !0,
			selector: { boolean: {} }
		}
	],
	[kl]: [{
		name: "room",
		required: !0,
		selector: { area: {} }
	}, Ml],
	[Al]: [Ml]
}, Pl = {
	entity: "Entity",
	room: "Room",
	era: "Era",
	backing: "On the era's panel"
}, Fl = {
	entity: "A light, switch, cover, lock, thermostat, player, fan, camera, alarm or scene, or a temperature, humidity or power sensor.",
	era: "Left empty, the card is in the era last chosen on the Console in this browser, and follows its switch.",
	backing: "Off, the instrument stands on the dashboard's own card, lettered in its colours."
}, Il = class extends Dl {
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
}, Ll = class extends Il {
	static getConfigElement() {
		return document.createElement(`${Ol}-editor`);
	}
	static getStubConfig(e) {
		let t = Object.keys(e.states);
		return { entity: t.find((t) => t.startsWith("light.") && (e.states[t].attributes.supported_color_modes ?? []).some((e) => e !== "onoff")) ?? t.find((e) => jl.includes(e.split(".")[0])) ?? "" };
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
}, Rl = class extends Il {
	static getConfigElement() {
		return document.createElement(`${kl}-editor`);
	}
	static getStubConfig(e) {
		return { room: gl(e) };
	}
	_tell(e) {
		return {
			rooms: e.room ? [e.room] : [],
			view: "room"
		};
	}
}, zl = class extends Il {
	static getConfigElement() {
		return document.createElement(`${Al}-editor`);
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
}, Bl = (e) => hl(Nl[e], Pl, Fl, { backing: !0 }), Vl = /* @__PURE__ */ t({
	DEFS: () => Hl,
	dolly: () => Xl,
	jewel: () => Jl,
	knife: () => $l,
	knob: () => Zl,
	label: () => Ul,
	meter: () => ql,
	nixies: () => Kl,
	push: () => Ql,
	tubes: () => Gl,
	tv: () => yo,
	valve: () => Yl,
	wheels: () => xo
}), Hl = j``, Ul = (e) => j`<span class="label">${e}</span>`, Wl = [..."1029348576"];
function Gl(e) {
	let t = [];
	for (let n of e.replace(/[°%]/g, "")) n === "." ? t.length && (t.at(-1).point = !0) : t.push({
		figure: n.trim(),
		point: !1
	});
	return t;
}
var Kl = (e, t = !0, n = e.trim()) => j`<span class="nixies" role="img" aria-label=${n}>${Gl(e).map(({ figure: e, point: n }) => j`<i class="nix ${t && e ? "on" : ""}">${Wl.map((n, r) => j`<b class=${t && n === e ? "lit" : ""} style="--z: ${r}">${n}</b>`)}${t && e === "-" ? j`<b class="lit">−</b>` : N}<u class=${t && n ? "lit" : ""}></u></i>`)}</span>`;
function ql(e, t, n, r, i, a = 0, o = !0) {
	return a < 2 ? Qs(e, t, n, r, i, a, o, Ul(e)) : j`<div class="meter display ${o ? "" : "unlit"}">
    <div class="win" role="img" aria-label="${e}: ${r} ${i}">${Kl(ec(o ? String(r) : "", "", [t, n], 1), o, "")}<span class="unit">${i}</span></div>
    ${Ul(e)}
  </div>`;
}
var Jl = (e) => j`<span class="jewel ${e}" aria-hidden="true"></span>`, Yl = (e) => {
	let t = e ? Math.max(.08, (e - .35) / .65) : 0;
	return j`<div class="eye" role="img" aria-label="Lights: ${Math.round(t * 100)} per cent" style="--shut: ${t.toFixed(2)}"><i></i><i></i></div>`;
}, Xl = (e, t, n, r, i = "", a = "", o = ["On", "Off"]) => j`<button class="dolly ${t ? "on" : ""} ${n ? "away" : ""} ${i}" aria-pressed=${t} aria-label=${n ? `${e}: not answering` : e + a} @click=${r}>
  <span class="key"><svg viewBox="0 0 44 66" aria-hidden="true"><circle class="glow" cx="22" cy="6" r="9"/><circle class="pilot" cx="22" cy="6" r="4.2"/>
    <g class="throw"><rect x="8" y="16" width="28" height="48" rx="3" fill="#cfd3d6" stroke="#4a5257"/><path d="M10,18 h24" stroke="#fff" stroke-opacity=".7"/>
      <circle cx="13" cy="21" r="1.6" fill="#6d757a"/><circle cx="31" cy="59" r="1.6" fill="#6d757a"/><rect x="18" y="24" width="8" height="30" rx="4" fill="#0b0b0b"/>
      <g class="lever"><path d="M19.5,40 L18,21 Q18,12 22,12 Q26,12 26,21 L24.5,40 Z" fill="#141414" stroke="#000" stroke-width=".7"/><path d="M20.3,16 L20.8,36" stroke="#fff" stroke-opacity=".3" stroke-width="1.4" stroke-linecap="round"/></g></g></svg>${i ? j`<i class="cover"></i>` : N}</span>
  ${Ul(e)}
</button>`, Zl = (e, t, n, r, i, a, o, s, c = [0, 100], l) => {
	let { legend: u, shown: d, lit: f } = tc(e, t, c), p = o || t === "sound";
	return j`<div class="dial ${t}">
    <div class="dimmer"><div class="knob ${t} ${i ? "drag" : ""}" role="slider" tabindex="0" aria-label="${e} ${n}" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(r)} aria-valuetext=${a} style="--lvl: ${r.toFixed(1)}"
      @pointerdown=${s.down} @pointermove=${s.move} @pointerup=${s.up} @pointercancel=${s.drop} @keydown=${s.key}><span class="grip"></span></div></div>
    ${Ul(u)}${d === void 0 ? N : Kl(d, f)}${p ? j`<span class="note">${o ? Ul(o) : N}</span>` : N}
  </div>`;
}, Ql = (e, t) => j`<button class="push" @click=${t}><span class="key"></span>${Ul(e)}</button>`, $l = (e, t, n) => j`<button class="knife ${t ? "closed" : ""}" @click=${n}><span class="key">${e}</span></button>`, eu = C`
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
  /* The weather (../weather.ts): white legends and neon lamps behind dark glass, with no pictures, which no instrument of the time had. */
  .panel { --sky-ink: #c9b9a6; --sky-on: #ffb05a; --sky-off: rgba(178,160,146,.18); --sky-glow: 0 0 6px 1px #ff6a00; }
  .panel .sky .win i { width: 6px; height: 10px; border-radius: 3px; }
  .panel .sky .pic, .panel .day .pic { display: none; }
  .panel .days .nixies { --fig: 28px; }
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
`, tu = "dash-bored-nixie", nu = class extends Gs {
	constructor(...e) {
		super(...e), this.kit = {
			...Vl,
			recorder: fl(Ul, Ql),
			...Bo(Ul, Kl)
		};
	}
	static {
		this.styles = [
			Nn,
			Ks,
			eu,
			Vo
		];
	}
}, ru = C`
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
  /* The weather (../weather.ts): a tuner's dial, lit in its blue-green behind a black bezel. Its lamps are pointers: red for now, black for tomorrow. */
  .panel { --sky-ink: #101614; --sky-on: #c9170f; --sky-next: #101614; --sky-off: transparent; }
  .panel .sky .win, .panel .days .win { border: 7px solid #101112; border-radius: 4px; background: linear-gradient(#f2fffa, #9fdccd 45%, #58ab9b); box-shadow: 0 0 0 .5px rgba(255,255,255,.2), 0 3px 4px rgba(0,0,0,.45), inset 0 0 0 1px rgba(0,0,0,.45); }
  .panel .sky.unlit .win { background: #8a8f8d; }
  .panel .sky .win i { width: 2px; height: 13px; border-radius: 1px; }
  .panel .sky .win { background-image: linear-gradient(rgba(16,22,20,.55), rgba(16,22,20,.55)), linear-gradient(#f2fffa, #9fdccd 45%, #58ab9b); background-size: calc(100% - 64px) 1px, auto; background-position: 52px 23px, 0 0; background-repeat: no-repeat; }
  .panel .top .sky, .panel .top .days { flex: 0 1 250px; } .panel .top .days { flex-basis: 290px; }
  .panel .days .readout { height: 16px; }
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
`, iu = "dash-bored-silverface", au = class extends Gs {
	constructor(...e) {
		super(...e), this.kit = {
			...Dc,
			recorder: fl(kc, Xc),
			...Bo(kc, Mc)
		};
	}
	static {
		this.styles = [
			Nn,
			Ks,
			ru,
			Vo
		];
	}
}, ou = (e) => () => {
	e = e + 1831565813 | 0;
	let t = Math.imul(e ^ e >>> 15, 1 | e);
	return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
}, B = (e) => [...e].reduce((e, t) => e * 31 + t.charCodeAt(0) | 0, 7) >>> 0, su = /\b(garden|drive(way)?|patio|yard|terrace|outside|outdoors?|balcony|porch|deck|lawn|pond)\b/i, cu = /\b(garage|barn|shed|workshop|stables?|annexe?|outbuilding|studio|lodge|cabin|greenhouse|summer ?house)\b/i, lu = 4, uu = 3, du = 4, fu = 3, pu = 24, mu = 3, hu = "lamps:", gu = "chest:", _u = (e) => e.kind === "camera" ? "picture" : e.kind === "light" ? "lamp" : e.kind === "lock" || e.kind === "cover" && e.guarded ? "door" : e.kind === "cover" ? "window" : "block";
function vu(e) {
	let t = e.devices.filter((e) => e.kind === "light"), n = e.devices.filter((e) => e.kind === "switch"), r = /* @__PURE__ */ new Set([...t.length > 8 ? t : [], ...n.length > 8 ? n : []]);
	return [
		...e.devices.filter((e) => !r.has(e)).map((e) => ({
			id: e.id,
			shape: _u(e)
		})),
		...t.length > 8 ? [{
			id: hu + e.id,
			shape: "lamp"
		}] : [],
		...n.length > 8 || e.scenes.length ? [{
			id: gu + e.id,
			shape: "block"
		}] : []
	];
}
var yu = (e) => e.reduce((e, t) => ({
	...e,
	[t.shape]: e[t.shape] + 1
}), {
	lamp: 0,
	window: 0,
	door: 0,
	block: 0,
	picture: 0
}), bu = (e) => e.window + 3 * e.picture;
function xu(e) {
	let t = yu(vu(e));
	return Math.max(lu, bu(t) + Math.ceil(t.lamp / 2) + t.door, t.block + t.door);
}
var Su = (e) => e.reduce((e, t) => e + xu(t) + 1, -1);
function Cu(e) {
	if (!e.length) return [];
	let t = Su(e), n = Math.max(1, Math.min(mu, Math.ceil(t / pu))), r = [[]];
	for (let i of e) r.length < n && r.at(-1).length && Su(r.at(-1)) >= t / n - lu && r.push([]), r.at(-1).push(i);
	return r;
}
function wu(e, t = !1) {
	let n = e.filter((e) => su.test(e.name)), r = e.filter((e) => !n.includes(e)), i = [...new Set(r.flatMap((e) => e.floor ? [e.floor] : []))], a = r.filter((e) => !e.floor), o = [
		i.map((e) => r.filter((t) => t.floor === e)),
		Cu(a.filter((e) => !cu.test(e.name))),
		...a.filter((e) => cu.test(e.name)).map((e) => [[e]])
	].filter((e) => e.length), s = o.map((e) => e.map((t, n) => Math.max(...e.slice(n).map(Su)))), c = Math.max(1, ...o.map((e) => e.length)), l = c >= 3, u = 4 * c + (l ? 1 : 5) + fu, d = u - fu, f = n.map((e) => ({
		room: e,
		list: vu(e),
		n: yu(vu(e))
	})).map((e) => ({
		...e,
		w: Math.max(uu, Math.ceil(e.n.lamp / 2) + bu(e.n) + e.n.door + e.n.block)
	})), p = 12 + (t ? 5 : 0), m = f.reduce((e, t) => e + t.w + 1, p), h = s.reduce((e, t) => e + t[0] + 4, m), g = Array.from({ length: u }, () => Array(h).fill(null)), _ = (e, t, n, r, i) => {
		for (let a = Math.max(0, t); a <= r; a++) for (let t = e; t <= n; t++) g[a][t] = typeof i == "function" ? i() : i;
	}, v = {
		w: h,
		h: u,
		ground: d,
		blocks: g,
		deco: [],
		zones: [],
		plots: [],
		zone: [],
		slots: /* @__PURE__ */ new Map(),
		sign: {
			x: 5,
			y: d - 2
		},
		notice: {
			x: 8,
			y: d - 2
		},
		signs: []
	}, { deco: y, slots: b, zones: x } = v, S = ou(3);
	_(0, d, h - 1, d, "grass"), _(0, d + 1, h - 1, u - 1, () => S() < .1 ? "ore" : S() < .35 ? "stone" : "dirt"), _(0, d, 1, d, "water"), _(3, d - 3, 3, d - 1, "trunk"), _(2, d - 6, 4, d - 4, "leaves"), _(3, d - 7, 3, d - 7, "leaves"), t && (v.signs = Array.from({ length: du }, (e, t) => ({
		x: 12 + t,
		y: d - 2
	})));
	for (let e of [
		5,
		6,
		8,
		10,
		...v.signs.map((e) => e.x)
	]) y.push([
		"post",
		e,
		d - 1
	]);
	let C = p;
	for (let { room: e, list: t, w: n } of f) {
		v.plots.push({
			id: e.id,
			name: e.name,
			x0: C,
			x1: C + n - 1,
			y: d - 4
		});
		let r = t.filter((e) => e.shape === "lamp");
		r.forEach((e, t) => b.set(e.id, {
			x: C + (t >> 1),
			y: d - 2 - t % 2,
			h: 1
		}));
		for (let e = 0; e < r.length; e += 2) y.push([
			"post",
			C + (e >> 1),
			d - 1
		]);
		let i = C + Math.ceil(r.length / 2);
		for (let e of t.filter((e) => e.shape !== "lamp")) e.shape === "picture" && y.push([
			"post",
			i + 1,
			d - 1
		]), b.set(e.id, e.shape === "block" ? {
			x: i,
			y: d - 1,
			h: 1
		} : e.shape === "picture" ? {
			x: i,
			y: d - 3,
			h: 2,
			w: 3
		} : {
			x: i,
			y: d - 2,
			h: 2
		}), i += e.shape === "picture" ? 3 : 1;
		C += n + 1;
	}
	let w = [];
	o.forEach((e, t) => {
		let n = C + 1, r = s[t], i = (e) => n + r[e] + 1, a = (e) => d - 4 * (e + 1);
		if (w.push([n, i(0)]), _(n, d, i(0), d, "stone"), e.forEach((e, t) => {
			_(n, a(t), i(t), a(t) + 3, "plank"), _(n, a(t), i(t), a(t), "roof"), t && _(n, a(t - 1), i(t), a(t - 1), "beam");
		}), !l) {
			let t = e.length - 1;
			for (let e = 1; e < 3; e++) n + 2 * e <= i(t) - 2 * e && _(n + 2 * e, a(t) - e, i(t) - 2 * e, a(t) - e, "roof");
			r[t] > 10 && _(i(t) - 5, a(t) - 3, i(t) - 5, a(t) - 3, "brick");
		}
		e.forEach((e, t) => {
			let r = a(t) + 1, o = r + 3 - 1, s = n + 1;
			if (e.forEach((n, a) => {
				let c = a === e.length - 1, l = {
					id: n.id,
					name: n.name,
					x0: s,
					y0: r,
					x1: c ? i(t) - 1 : s + xu(n) - 1,
					y1: o,
					storey: t
				};
				x.push(l), _(l.x0, r, l.x1, o, "wall"), c || _(l.x1 + 1, r + 1, l.x1 + 1, o, "wall");
				let u = vu(n), d = yu(u), f = l.x1 - l.x0 + 1 - bu(d) - d.door, p = l.x0, m = 0, h = l.x1, g = l.x0, v = {
					window: () => ({
						x: p++,
						y: r,
						h: 2
					}),
					picture: () => ({
						x: (p += 3) - 3,
						y: r,
						h: 2,
						w: 3
					}),
					lamp: () => ({
						x: l.x0 + bu(d) + m % f,
						y: r + Math.floor(m++ / f),
						h: 1
					}),
					door: () => ({
						x: h--,
						y: r + 1,
						h: 2
					}),
					block: () => ({
						x: g++,
						y: o,
						h: 1
					})
				};
				for (let e of u) b.set(e.id, v[e.shape]());
				s = l.x1 + 2;
			}), t) {
				_(i(t) - 1, o + 1, i(t) - 1, o + 1, "wall");
				for (let e = o + 1; e <= o + 1 + 3; e++) y.push([
					"ladder",
					i(t) - 1,
					e
				]);
			}
		}), C = i(0) + 2;
	});
	let T = (e, t) => x.find((n) => e >= n.x0 && e <= n.x1 && t >= n.y0 && t <= n.y1)?.id;
	return v.zone = g.map((e, t) => e.map((e, n) => T(n, t) ?? (t < d && w.some(([e, t]) => n >= e && n <= t) ? "struct" : "out"))), v;
}
function Tu(e) {
	let t = e.zones[0] ?? e.plots[0];
	return t && {
		x: t.x0 - 1,
		y: e.ground - 4,
		w: t.x1 - t.x0 + 3,
		h: e.h - e.ground + 4
	};
}
function Eu(e, t, n) {
	let r = (e) => e.kind === "light" && e.on && !e.away, i = t.flatMap((t) => {
		let n = t.devices.filter((e) => e.kind === "light"), i = e.slots.get(hu + t.id);
		return (i ? n.some(r) ? [{
			at: i,
			k: .6 + .4 * n.filter(r).length / n.length
		}] : [] : n.filter(r).flatMap((t) => e.slots.has(t.id) ? [{
			at: e.slots.get(t.id),
			k: .6 + .4 * (t.level ?? 100) / 100
		}] : [])).map(({ at: t, k: n }) => ({
			...t,
			k: n,
			zone: e.zone[t.y][t.x]
		}));
	}), a = e.blocks.map((e) => e.map(Boolean));
	for (let [t, n, r] of e.deco) t !== "post" && (a[r][n] = !0);
	for (let { x: t, y: n, h: r, w: i = 1 } of e.slots.values()) for (let e = 0; e < r; e++) for (let r = 0; r < i; r++) a[n + e][t + r] = !0;
	let o = [
		e.sign,
		{
			...e.sign,
			x: e.sign.x + 1
		},
		...[
			0,
			1,
			2
		].map((t) => ({
			...e.notice,
			x: e.notice.x + t
		})),
		...e.signs
	];
	for (let { x: e, y: t } of o) a[t][e] = !0;
	let s = new Map(t.map((e) => [e.id, Math.max(0, ...e.devices.filter((e) => e.kind === "cover" && !e.guarded && e.on && !e.away).map((e) => e.level ?? 100))]));
	return e.zone.map((e, t) => e.map((e, r) => {
		if (!a[t][r]) return -1;
		let o = e === "out" ? Math.max(.15, n) : e === "struct" ? Math.max(.3, n) : .15 + .45 * n + .3 * n * (s.get(e) ?? 0) / 100;
		for (let n of i) (e === n.zone || e === "struct") && (o = Math.max(o, n.k * (1 - Math.hypot(r - n.x, t - n.y) / (n.zone === "out" ? 4 : 6))));
		return (1 - Math.min(1, o)) * .8;
	}));
}
//#endregion
//#region src/dash-bored/contraption/kit.ts
var V = (e, t = 0, n = 1) => Math.max(t, Math.min(n, e)), Du = (e, t) => t[B(e) % t.length], Ou = (e, t, n) => e < t ? Math.min(t, e + n) : Math.max(t, e - n);
function ku(e, t, n, r = 70, i = 9) {
	return e.v += ((t - e.x) * r - e.v * i) * n, e.x += e.v * n, Math.abs(t - e.x) < .001 && Math.abs(e.v) < .001 && Object.assign(e, {
		x: t,
		v: 0
	}), e.x;
}
var H = (e, t, n) => void Object.assign(e, {
	x: t,
	y: n
}), U = (e, t, n = 0, r = 0) => void Object.assign(e, {
	deg: t,
	cx: n,
	cy: r
}), W = (e, t) => void (e.o = t), Au = (e, t) => void (e.d = t), ju = (e) => e.replace(/[&<>"]/g, (e) => `&#${e.charCodeAt(0)};`);
function G(e, t, n, r, i) {
	let a = "";
	for (let e = 0; e < r; e++) {
		let t = e / r * 2 * Math.PI, i = Math.cos(t), o = Math.sin(t);
		a += `M${(i * n).toFixed(1)},${(o * n).toFixed(1)} L${(i * (n + 3.5)).toFixed(1)},${(o * (n + 3.5)).toFixed(1)} `;
	}
	return `<g transform="translate(${e},${t})"><g data-p="${i}" data-ring="24"><circle class="fill" r="${n}"/>
    <path d="${a}M0,0 L${n - 3},0"/><circle class="solid" r="1.8"/></g></g>`;
}
function Mu(e, t, n) {
	let r = e / t, i = Math.sqrt(Math.max(0, n * n - r * r)) / 2, a = "";
	for (let e = 0; e < t; e++) {
		let t = (e * r).toFixed(1), n = ((e + 1) * r).toFixed(1), o = i.toFixed(1);
		a += `M${t},-${o} L${n},${o} M${t},${o} L${n},-${o} `;
	}
	return a;
}
var Nu = (e, t) => [
	e[0] * t[0] + e[2] * t[1],
	e[1] * t[0] + e[3] * t[1],
	e[0] * t[2] + e[2] * t[3],
	e[1] * t[2] + e[3] * t[3],
	e[0] * t[4] + e[2] * t[5] + e[4],
	e[1] * t[4] + e[3] * t[5] + e[5]
];
function Pu(e) {
	let t = e.deg * Math.PI / 180, n = Math.cos(t), r = Math.sin(t);
	return [
		n * e.sx,
		r * e.sx,
		-r * e.sy,
		n * e.sy,
		e.x + e.cx - n * e.cx + r * e.cy,
		e.y + e.cy - r * e.cx - n * e.cy
	];
}
function Fu(e) {
	let t = e[0] * e[3] - e[1] * e[2] < 0 ? -1 : 1;
	return {
		deg: t * (Math.atan2(t * e[1], t * e[0]) * 180 / Math.PI),
		flip: t,
		sx: Math.hypot(e[0], e[1]),
		sy: Math.hypot(e[2], e[3])
	};
}
function Iu(e, t, n) {
	if (!e.wrap) return V(Math.round((n - e.lo) / e.span * (t - 1)), 0, t - 1);
	let r = ((n - e.lo) % e.span + e.span) % e.span;
	return Math.round(r / e.span * t) % t;
}
function Lu(e) {
	let [t, n] = e.includes(":") ? e.split(":") : ["360", e], [r, i] = t.includes("..") ? t.split("..").map(Number) : [0, Number(t)];
	return {
		ring: {
			lo: r,
			span: i - r,
			wrap: !t.includes("..")
		},
		steps: Number(n)
	};
}
var Ru = {
	L: [0, 130],
	R: [260, 130],
	T: [130, 0],
	B: [130, 260]
};
function zu(e, t = !1) {
	let [n, r] = e.includes(">") ? e.split(">") : [e[0], e[1]], i = (e) => t ? e.replace(/[LR]/g, (e) => e === "L" ? "R" : "L") : e;
	return {
		ins: i(n),
		outs: i(r)
	};
}
var Bu = (e, t, n) => (e + t) % n;
function K(...e) {
	return (t) => {
		let n = 0;
		for (; n < e.length - 2 && t >= e[n + 1][0];) n++;
		let [r, i, a, o = 0] = e[n], [s, c, l] = e[n + 1], u = V((t - r) / (s - r));
		return {
			x: i + (c - i) * u,
			y: a + (l - a) * u - o * Math.sin(Math.PI * u),
			i: n,
			u
		};
	};
}
var q = (e, t, n) => +(e >= t && e < n), Vu = (e, t, n, r) => ({
	still: `<path class="thin" d="M${e},${t - n - 30} V${t - n - 8}"/><rect class="brass" x="${e - 6}" y="${t - n - 8}" width="12" height="10"/>
    <circle class="glass" cx="${e}" cy="${t}" r="${n}"/><path class="thin" d="M${e - 5},${t - n} v${n - 4} l5,7 l5,-7 v${4 - n}"/>`,
	live: `<g class="shine" data-p="${r}"><circle cx="${e}" cy="${t}" r="${n * 1.6}"/></g>`
}), Hu = (e, t, n) => `<text data-cap="${ju(e.id)}" x="${t}" y="${n}" text-anchor="middle">${ju(e.name)}<tspan class="state" x="${t}" dy="15"></tspan></text>`, Uu = (e, t, n, r, i = "24") => `<g transform="translate(${e},${t})"><g data-p="${n}" data-ring="${i}">${r}</g></g>`;
function Wu(e, t, n) {
	let r = (e) => {
		let r = 1 - e;
		return {
			x: r * r * t[0] + 2 * r * e * 130 + e * e * n[0],
			y: r * r * t[1] + 2 * r * e * 130 + e * e * n[1],
			o: 0
		};
	}, i = `M${t} Q130,130 ${n}`, a = r(.5), o = a.x < 130 ? 186 : 74, s = a.y < 130 ? 212 : 50;
	return {
		art: `<g data-p="out">
    <path class="paper" d="M14,40 q40,-26 76,-8 q44,-30 84,-2 q40,-16 72,12 l4,196 q-34,14 -60,-2 q-30,16 -58,0 q-30,14 -60,-2 q-28,12 -62,0 z"/>
    <path class="thin" d="M90,32 q-8,60 6,110 M174,30 q10,80 -8,150 M60,120 q20,60 4,116 M214,90 q-12,70 6,140"/>
    <path class="tube" d="${i}"/><path class="bore" d="${i}"/><g data-p="lump"><circle class="paper" r="17"/></g>
    <g data-p="sign" data-sign="${ju(e.id)}"><g transform="translate(${o},${s}) rotate(-4)"><path d="M0,-28 V-40"/><rect class="label" x="-58" y="-28" width="116" height="56"/>
      <text text-anchor="middle" y="-8">${ju(e.name)}</text><text class="small" data-word text-anchor="middle" y="6"></text>
      <text class="small" data-since text-anchor="middle" y="19"></text></g></g></g>`,
		through: r
	};
}
//#endregion
//#region src/dash-bored/contraption/carriers.ts
var Gu = K([
	0,
	130,
	260
], [
	.35,
	130,
	150,
	95
], [
	.75,
	218,
	130
], [
	1,
	260,
	130
]), Ku = [232, 62], qu = [
	-1,
	0,
	1
], Ju = [
	0,
	1,
	2,
	3
], Yu = (e, t) => `<g data-p="${e}"><circle class="drop" r="${t}"/></g>`, Xu = {
	io: "BR",
	faults: [{
		kind: "bolt",
		at: [96, 240]
	}],
	still: `<path class="thin" d="M118,236 V260 M142,236 V260"/>
    <rect class="iron" x="82" y="150" width="96" height="86" rx="12"/><path d="M98,150 h64 M96,236 v8 M164,236 v8"/>
    <text x="130" y="200" text-anchor="middle">TOAST</text>
    <path class="wood" d="M196,132 h64 v7 h-64 z"/><path class="thin" d="M202,139 l-12,38 V139"/>
    <path d="M254,132 V44 h-22 V${Ku[1]}"/><path class="thin" d="M254,60 l-14,-16"/>`,
	live: `<path class="flame bare" data-p="toast-glow" d="M100,145 h60 v5 h-60 z"/>
    <g data-p="toast-lever"><path d="M178,0 h8"/><rect class="brass" x="186" y="-5" width="12" height="10" rx="2"/></g>
    <text data-p="toast-pop" x="152" y="104">pop!</text>${qu.map((e) => Yu(`sweat${e}`, 2.2)).join("")}${Ju.map((e) => Yu(`water${e}`, 3.4)).join("")}
    <g data-p="bucket" data-ring="0..110:23"><path class="iron" d="M-13,0 h26 l-4,24 h-18 z"/><circle class="solid" r="2.5"/></g>
    <text data-p="splosh" class="small said" x="176" y="100">splosh</text>`,
	duck({ p: e }) {
		let t = Gu(e);
		return {
			...t,
			o: e < .35 ? 0 : 1,
			r: t.i === 1 ? t.u * 360 : 0
		};
	},
	pose(e, { p: t }) {
		H(e("toast-lever"), 0, t < .3 ? 168 + 146 * t : t < .35 ? 212 : 168), W(e("toast-glow"), q(t, 0, .35) * V(t / .3)), W(e("toast-pop"), q(t, .35, .55));
		let n = Gu(t), r = q(t, .38, .75);
		for (let i of qu) {
			let a = ((t - .38) * 5 + (i + 1) / 3) % 1;
			W(e(`sweat${i}`), r * (1 - a)), H(e(`sweat${i}`), n.x + i * 18 * a + 4, n.y - 20 - 26 * a + 40 * a * a);
		}
		let i = V((t - .7) / .07) - V((t - .92) / .08), a = q(t, .76, .93);
		H(e("bucket"), Ku[0], Ku[1]), U(e("bucket"), 110 * i);
		for (let n of Ju) {
			let r = ((t - .76) * 9 + n / Ju.length) % 1;
			W(e(`water${n}`), a), H(e(`water${n}`), Ku[0] - 6, Ku[1] + 14 + 56 * r * r);
		}
		W(e("splosh"), a);
	}
}, Zu = {
	io: "LR",
	faults: [{
		kind: "oil",
		at: [130, 129]
	}, {
		kind: "bolt",
		at: [90, 215]
	}],
	still: "<path class=\"wood\" d=\"M84,40 h12 v170 h-12 z M164,40 h12 v170 h-12 z M70,210 h120 v10 h-120 z\"/>\n    <path class=\"wood\" d=\"M0,132 h84 v6 h-84 z M176,132 h84 v6 h-84 z\"/>",
	live: `${G(130, 98, 28, 10, "mangle-a")}${G(130, 160, 28, 10, "mangle-b")}`,
	duck({ p: e }) {
		let t = V((e - .62) / .25), n = e < .62 ? 1 - .75 * V((e - .38) / .12) : 1 - .75 * (1 - t) * Math.cos(t * 10);
		return {
			x: 260 * e,
			y: 130,
			sy: n,
			sx: 1 + (1 - n) * .8
		};
	},
	pose(e, { p: t }) {
		U(e("mangle-a"), t * 360), U(e("mangle-b"), -t * 360);
	}
}, Qu = K([
	0,
	260,
	130
], [
	.3,
	150,
	130,
	10
], [
	.38,
	130,
	120
], [
	.6,
	130,
	120
], [
	1,
	130,
	0
]), $u = {
	io: "RT",
	still: "<path class=\"wood\" d=\"M150,132 h110 v7 h-110 z M86,250 h88 v7 h-88 z\"/><path class=\"thin\" d=\"M158,139 l-10,30 V139\"/>",
	live: "<g data-p=\"cork-bottle\"><path class=\"glass\" d=\"M112,250 V172 q0,-14 10,-22 V132 h16 v18 q10,8 10,22 V250 z\"/>\n      <rect class=\"paper\" x=\"114\" y=\"190\" width=\"32\" height=\"30\"/><text class=\"small\" x=\"130\" y=\"208\" text-anchor=\"middle\">FIZZ</text></g>\n    <g data-p=\"cork-cork\"><rect class=\"brass\" x=\"-7\" y=\"-10\" width=\"14\" height=\"12\" rx=\"2\"/></g>\n    <text data-p=\"cork-pop\" x=\"150\" y=\"96\">POP</text>",
	duck({ p: e, now: t }) {
		let n = Qu(e);
		return {
			...n,
			x: n.x + (n.i === 2 ? Math.sin(t * 40) * 1.5 : 0)
		};
	},
	pose(e, { p: t, now: n }) {
		let r = t < .6 ? 132 : t < .8 ? 132 - (t - .6) * 450 : 42 + (t - .8) * 450;
		H(e("cork-cork"), 130, r), H(e("cork-bottle"), q(t, .38, .6) * Math.sin(n * 40) * 1.5, 0), W(e("cork-pop"), q(t, .6, .8));
	}
}, ed = K([
	0,
	260,
	130
], [
	.2,
	212,
	130
]), td = {
	io: "RB",
	still: "<path class=\"wood\" d=\"M222,132 h38 v6 h-38 z\"/>\n    <path class=\"glass\" d=\"M40,136 H220 L138,214 V260 H122 V214 z\"/>\n    <ellipse class=\"thin\" cx=\"130\" cy=\"152\" rx=\"66\" ry=\"6\"/><ellipse class=\"thin\" cx=\"130\" cy=\"176\" rx=\"40\" ry=\"4\"/><ellipse class=\"thin\" cx=\"130\" cy=\"198\" rx=\"17\" ry=\"3\"/>\n    <path d=\"M130,0 V22 M112,22 h36\"/><path class=\"brass\" d=\"M120,22 h20 v20 h-20 z\"/>",
	live: "<g data-p=\"plug-drip\"><circle class=\"drop\" r=\"3\"/></g><text data-p=\"plug-glug\" x=\"150\" y=\"240\">glug</text>",
	duck({ p: e }) {
		if (e < .2) return ed(e);
		if (e >= .85) return {
			x: 130,
			y: 212 + (e - .85) / .15 * 48,
			r: e * 2e3
		};
		let t = (e - .2) / .65;
		return {
			x: 130 + 82 * (1 - t) ** .8 * Math.cos(t * 5 * Math.PI),
			y: 138 + 74 * t
		};
	},
	pose(e, { p: t }) {
		H(e("plug-drip"), 130, 46 + t * 3 % 1 * 88), W(e("plug-glug"), q(t, .85, 1));
	}
}, nd = K([
	0,
	130,
	0
], [
	.28,
	136,
	168,
	92
], [
	.72,
	30,
	130
], [
	1,
	0,
	130
]), rd = {
	io: "TL",
	faults: [{
		kind: "bolt",
		at: [96, 214]
	}],
	still: "<path d=\"M96,170 V214 M176,170 V214 M84,214 h24 M164,214 h24\"/><path class=\"thin\" d=\"M96,196 H176\"/>\n    <path class=\"wood\" d=\"M0,132 h52 v6 h-52 z\"/><path class=\"thin\" d=\"M44,138 l-10,30 V138\"/>",
	live: "<path class=\"rope\" data-p=\"mat\"/><text data-p=\"boing\" class=\"small\" x=\"150\" y=\"150\">boing</text>",
	duck({ p: e }) {
		let t = nd(e);
		return {
			...t,
			r: t.i === 1 ? -t.u * 360 : 0
		};
	},
	pose(e, { p: t }) {
		let n = t - .28, r = n < 0 ? 0 : 16 * Math.exp(-n * 9) * Math.cos(n * 42);
		Au(e("mat"), `M96,170 Q136,${(170 + r * 2).toFixed(1)} 176,170`), W(e("boing"), q(t, .28, .5));
	}
}, id = K([
	0,
	0,
	130
], [
	.3,
	62,
	130
], [
	.45,
	62,
	130,
	86
], [
	.8,
	204,
	130
], [
	1,
	260,
	130
]), ad = {
	toaster: Xu,
	mangle: Zu,
	cork: $u,
	plug: td,
	trampoline: rd,
	ladle: {
		io: "LR",
		faults: [{
			kind: "oil",
			at: [112, 150]
		}],
		still: "<path class=\"wood\" d=\"M0,132 h40 v6 h-40 z M176,138 h84 v6 h-84 z\"/><path class=\"iron\" d=\"M112,150 l-12,30 h24 z\"/><path d=\"M84,180 h56\"/>\n    <ellipse class=\"cloth\" cx=\"204\" cy=\"134\" rx=\"26\" ry=\"8\"/>",
		live: "<g data-p=\"ladle\" data-ring=\"-10..55:27\"><path d=\"M-44,0 H40\"/><path class=\"iron\" d=\"M-64,-4 h22 q0,14 -11,14 q-11,0 -11,-14 z\"/><circle class=\"solid\" cx=\"40\" r=\"4\"/></g>\n    <text data-p=\"hup\" class=\"small\" x=\"120\" y=\"60\">hup!</text>",
		duck({ p: e }) {
			let t = id(e);
			return {
				...t,
				r: t.i === 2 ? t.u * 360 : 0
			};
		},
		pose(e, { p: t }) {
			let n = t < .3 ? 0 : t < .45 ? -8 * ((t - .3) / .15) : t < .52 ? -8 + 60 * ((t - .45) / .07) : 52 * (1 - V((t - .52) / .3));
			H(e("ladle"), 112, 148), U(e("ladle"), n), W(e("hup"), q(t, .45, .65));
		}
	}
}, od = [
	0,
	1,
	2
], sd = (e) => `<g data-p="tread${e}"><path class="wood" d="M-16,0 h32 v5 h-32 z"/></g>`, cd = (e, t, n, r) => {
	for (let i of od) {
		let a = (t + i / od.length) % 1;
		H(e(`tread${i}`), n + 130 * a, r - 130 * a);
	}
}, ld = [{
	io: "LT",
	steady: !0,
	faults: [{
		kind: "oil",
		at: [22, 150]
	}],
	still: "<path class=\"wood\" d=\"M0,132 h14 v6 h-14 z\"/><path d=\"M4,152 L146,10 M-8,112 L104,0\"/><path class=\"thin\" d=\"M40,116 V200 M96,60 V200 M24,200 h90\"/>\n      <text class=\"small\" x=\"150\" y=\"150\">UP</text>",
	live: `${od.map(sd).join("")}`,
	duck: ({ p: e }) => ({
		x: 130 * e,
		y: 130 - 130 * e
	}),
	pose(e, { p: t }) {
		cd(e, t, 0, 132);
	}
}, {
	io: "BR",
	steady: !0,
	faults: [{
		kind: "bolt",
		at: [236, 150]
	}],
	still: "<path d=\"M134,282 L256,160 M122,242 L234,130\"/><path class=\"thin\" d=\"M170,246 V260 M226,190 V260\"/><path class=\"wood\" d=\"M246,132 h14 v6 h-14 z\"/>\n      <circle class=\"iron\" cx=\"248\" cy=\"158\" r=\"9\"/>",
	live: `${od.map(sd).join("")}`,
	duck: ({ p: e }) => ({
		x: 130 + 130 * e,
		y: 260 - 130 * e
	}),
	pose(e, { p: t }) {
		cd(e, t, 130, 262);
	}
}], ud = K([
	0,
	0,
	130
], [
	.25,
	34,
	130
], [
	1,
	130,
	260
]), dd = K([
	0,
	130,
	0
], [
	.65,
	206,
	122
], [
	.8,
	226,
	130,
	10
], [
	1,
	260,
	130
]), fd = [{
	io: "LB",
	steady: !0,
	faults: [{
		kind: "bolt",
		at: [40, 200]
	}],
	still: "<path class=\"wood\" d=\"M0,132 h36 v6 h-36 z\"/><path d=\"M36,136 Q84,150 130,260 M36,116 Q96,124 150,260\"/><path class=\"thin\" d=\"M30,138 V236 M18,236 h24 M30,170 h-10 M30,200 h-10\"/>",
	live: "<text data-p=\"whee\" class=\"small said\" x=\"96\" y=\"150\">wheee</text>",
	duck({ p: e }) {
		let t = ud(e);
		return {
			...t,
			r: t.i === 1 ? 45 * Math.min(1, t.u * 4) : 0
		};
	},
	pose(e, { p: t }) {
		W(e("whee"), q(t, .3, 1));
	}
}, {
	io: "TR",
	steady: !0,
	still: "<path d=\"M130,0 Q160,108 206,128 H260 M150,0 Q176,92 214,110\"/><path class=\"thin\" d=\"M196,130 V200 M184,200 h24\"/><ellipse class=\"cloth\" cx=\"232\" cy=\"134\" rx=\"22\" ry=\"6\"/>",
	live: "<text data-p=\"oof\" class=\"small said\" x=\"214\" y=\"100\">oof</text>",
	duck({ p: e }) {
		let t = dd(e);
		return {
			...t,
			r: t.i === 0 ? 45 * (1 - t.u ** 3) : 0
		};
	},
	pose(e, { p: t }) {
		W(e("oof"), q(t, .65, .9));
	}
}], pd = K([
	0,
	130,
	0
], [
	.2,
	92,
	62,
	14
], [
	.4,
	168,
	112,
	14
], [
	.6,
	92,
	164,
	14
], [
	.8,
	168,
	214,
	14
], [
	1,
	130,
	260
]), md = (e, t, n = !1) => `<g transform="translate(${e},${t}) ${n ? "scale(-1,1)" : ""} rotate(-8)"><path d="M10,0 H62"/><ellipse class="iron" rx="15" ry="7"/></g>`, hd = {
	io: "TB",
	steady: !0,
	still: `<path class="thin" d="M30,40 V200 M230,90 V245"/>${md(92, 69, !0)}${md(168, 119)}${md(92, 171, !0)}${md(168, 221)}`,
	live: "<text data-p=\"ting\" class=\"small\">ting!</text>",
	duck({ p: e }) {
		let t = pd(e);
		return {
			...t,
			r: (t.i % 2 ? 25 : -25) * Math.sin(Math.PI * t.u)
		};
	},
	pose(e, { p: t }) {
		let n = pd(t), r = n.i > 0 && n.u < .35;
		W(e("ting"), +!!r), r && H(e("ting"), n.x + (n.i % 2 ? -44 : 20), n.y - 22);
	}
}, gd = "<g data-p=\"board\"><path class=\"wood\" d=\"M-34,0 h68 v6 h-68 z\"/><path class=\"rope\" d=\"M-30,0 L0,-36 L30,0\"/></g>", _d = {
	io: "BT",
	steady: !0,
	faults: [{
		kind: "cord",
		loop: [[130, 260], [130, 0]],
		run: (e) => e * 100
	}],
	still: "<path d=\"M92,0 V260 M168,0 V260\"/><path class=\"thin\" d=\"M92,52 h76 M92,104 h76 M92,156 h76 M92,208 h76\"/><path class=\"rope\" d=\"M130,0 V260\"/>\n    <text class=\"small\" x=\"60\" y=\"130\" transform=\"rotate(-90 60 130)\" text-anchor=\"middle\">DUMB WAITER</text>",
	live: gd,
	duck: ({ p: e }) => ({
		x: 130,
		y: 260 - 260 * e
	}),
	pose(e, { p: t }) {
		H(e("board"), 130, 262 - 260 * t);
	}
}, vd = K([
	0,
	0,
	130
], [
	1,
	260,
	130
]), yd = K([
	0,
	0,
	130
], [
	.3,
	100,
	130
], [
	.7,
	160,
	130
], [
	1,
	260,
	130
]);
function bd(e) {
	let t = Vu(36, 62, 13, "lamp"), n = 90;
	return {
		device: e.id,
		io: "LR",
		faults: [{
			kind: "bolt",
			at: [72, 138]
		}],
		still: `<path class="wood" d="M0,132 h260 v6 h-260 z"/><path class="thin" d="M30,138 l-10,30 V138 M230,138 l10,30 V138"/>${t.still}${Hu(e, 130, 176)}`,
		live: `${t.live}<g data-p="crate"><rect class="wood" x="65" y="66" width="130" height="66"/><path class="thin" d="M65,88 h130 M65,110 h130 M98,66 v66 M162,66 v66"/>
        <rect class="label" x="72" y="90" width="116" height="18"/><text class="small" x="130" y="102" text-anchor="middle">${ju(e.kind.replaceAll("_", " ").toUpperCase())}</text></g>
      <g data-p="flag" data-ring="0..90:19"><path d="M202,132 V86"/><path class="cloth" d="M202,86 h24 l-7,7 l7,7 h-24 z"/></g>
      <text data-p="knock" class="small" x="118" y="56">knock knock</text>`,
		duck({ p: e, on: t }) {
			let n = (t ? yd : vd)(e);
			return {
				...n,
				o: n.x > 78 && n.x < 182 ? 0 : 1
			};
		},
		pose(t, { p: r, on: i, dt: a, now: o }) {
			let s = i && q(r, .3, .7) === 1;
			H(t("crate"), s ? Math.sin(o * 38) * 1.5 : 0, 0), W(t("knock"), +!!s), W(t("lamp"), e.on ? .8 : 0), n = Ou(n, e.on ? 0 : 90, a * 360), U(t("flag"), n, 202, 132);
		}
	};
}
//#endregion
//#region src/dash-bored/contraption/light.ts
var xd = [
	[0, 130],
	[100, 130],
	[260, 130]
], Sd = {
	belt: {
		points: xd,
		at: 1,
		hop: (e) => Math.abs(Math.sin(e * 18)) * 5,
		still: "<path d=\"M56,131 H144 M56,153 H144\"/><path class=\"rope\" d=\"M48,146 L61,190 M65,151 L79,191\"/>",
		live: `${G(56, 142, 10, 6, "r1")}${G(144, 142, 10, 6, "r2")}`,
		pose(e, t) {
			U(e("r1"), t.spin), U(e("r2"), t.spin);
		}
	},
	treadle: {
		points: xd,
		at: 1,
		hop: (e) => Math.abs(Math.sin(e * 7)) * 24,
		still: "<path class=\"wood\" d=\"M44,132 h18 v6 h-18 z M138,132 h18 v6 h-18 z\"/><path d=\"M62,128 V168 M138,128 V168\"/>\n      <path class=\"thin\" d=\"M76,142 l8,5 l-16,6 l16,6 l-8,5 M124,142 l8,5 l-16,6 l16,6 l-8,5\"/>",
		live: "<path data-p=\"rod\"/><g data-p=\"board\"><path class=\"wood\" d=\"M-36,-3 h72 v6 h-72 z\"/></g>",
		pose(e, t) {
			let n = t.working ? 7 * (1 - Math.abs(Math.sin(t.t * 7))) : 0, r = t.spin / 57.3;
			H(e("board"), 100, 135 + n), Au(e("rod"), `M100,${(138 + n).toFixed(1)} L${(70 + 8 * Math.cos(r)).toFixed(1)},${(196 + 8 * Math.sin(r)).toFixed(1)}`);
		}
	},
	wheel: {
		points: [
			[0, 130],
			[52, 130],
			[100, 152],
			[148, 130],
			[260, 130]
		],
		at: 2,
		hop: (e) => Math.abs(Math.sin(e * 18)) * 4,
		still: "<path d=\"M100,112 L76,172 M100,112 L124,172 M66,172 h68\"/><path class=\"rope\" d=\"M93,116 L62,190 M106,118 L79,192\"/>",
		live: Uu(100, 112, "tw", "<circle class=\"glass\" r=\"46\"/><circle class=\"thin\" r=\"40\"/>\n      <path class=\"thin\" d=\"M-46,0 H46 M0,-46 V46 M-32,-32 L32,32 M-32,32 L32,-32\"/><circle class=\"solid\" r=\"3\"/>", "45:9"),
		pose(e, t) {
			U(e("tw"), -t.spin * .5);
		}
	}
};
function Cd(e, t, n) {
	let { points: r, at: i } = e, a = [];
	return r.forEach(([e, o], s) => {
		s <= i && a.push([
			t * s / i,
			e,
			o
		]), s === i && a.push([
			n,
			e,
			o
		]), s > i && a.push([
			n + (1 - n) * (s - i) / (r.length - 1 - i),
			e,
			o
		]);
	}), K(...a);
}
var wd = (e) => {
	let t = e.at / (e.points.length - 1);
	return Cd(e, t, t);
}, Td = (e, t) => Uu(e, t, "fly", "<circle class=\"iron\" r=\"20\"/><circle class=\"paper\" r=\"14\"/><path d=\"M-20,0 H20 M0,-20 V20\"/>", "90:18"), Ed = {
	flywheel: {
		still: "<path d=\"M80,196 H146 M160,196 H180\"/><rect class=\"brass\" x=\"146\" y=\"180\" width=\"6\" height=\"32\"/><path class=\"iron\" d=\"M132,190 h8 v36 h-8 z\"/>",
		live: `${Td(106, 196)}<g data-p="driven"><rect class="copper" x="152" y="180" width="6" height="32"/></g>
      <g data-p="lever" data-ring="0..25:11"><path d="M155,180 V160"/><circle class="solid" cx="155" cy="158" r="4"/></g>`,
		pose(e, t) {
			U(e("fly"), t.flown), H(e("driven"), 8 * t.gap, 0), U(e("lever"), 25 * t.gap, 155, 180);
		}
	},
	cogs: {
		still: "<path d=\"M170,196 H180\"/>",
		live: `${G(98, 196, 14, 9, "g1")}${G(156, 196, 14, 9, "g3")}<path data-p="arm"/><g data-p="idler">${G(0, 0, 11, 7, "g2")}</g><g data-p="knob"><circle class="solid" r="4"/></g>`,
		pose(e, t) {
			let n = t.gap * .6, r = Math.cos(n), i = Math.sin(n), a = 98 + 52 * r, o = 196 - 52 * i - 14;
			U(e("g1"), -t.flown), U(e("g2"), t.flown * 1.3), U(e("g3"), -t.spun), H(e("idler"), 98 + 29 * r, 196 - 29 * i), Au(e("arm"), `M98,196 L${a.toFixed(1)},${o.toFixed(1)}`), H(e("knob"), a, o);
		}
	},
	slack: {
		still: "<path d=\"M80,196 H88 M176,196 H180\"/>",
		live: `${G(100, 196, 12, 5, "p1")}${G(164, 196, 12, 5, "p2")}<path class="rope" data-p="belt-over"/><path class="rope" data-p="belt-under"/>
      <path data-p="stem"/><g data-p="jockey"><circle class="brass" r="5"/></g>`,
		pose(e, t) {
			let n = 1 - t.gap, r = 169 + 14 * n;
			U(e("p1"), t.flown), U(e("p2"), t.spun), Au(e("belt-over"), `M100,184 Q132,${(184 + 8 * n).toFixed(1)} 164,184`), Au(e("belt-under"), `M100,208 Q132,${(208 + 18 * t.gap).toFixed(1)} 164,208`), H(e("jockey"), 132, r), Au(e("stem"), `M132,${(r - 5).toFixed(1)} V${(r - 30).toFixed(1)} m-8,0 h16`);
		}
	}
}, Dd = (e, t, n = "") => e.map(([e, r]) => `<circle class="${n}" cx="${e}" cy="${r}" r="${t}"/>`).join(""), Od = [
	[160, 58],
	[196, 50],
	[232, 58]
], kd = [
	[233, 30],
	[206, 38],
	[178, 42],
	[150, 37]
], Ad = {
	bulb: {
		hang: 196,
		still: Vu(196, 66, 22, "").still,
		glow: "<circle cx=\"196\" cy=\"66\" r=\"35\"/>"
	},
	chandelier: {
		hang: 196,
		still: `<path d="M196,14 V56 M160,66 q36,-30 72,0"/>${Dd(Od, 7, "glass")}`,
		glow: Dd(Od, 13)
	},
	lantern: {
		hang: 246,
		still: "<path d=\"M246,40 H206 V48\"/><path class=\"brass\" d=\"M190,48 h32 v6 h-32 z M194,88 h24 v5 h-24 z\"/><path class=\"glass\" d=\"M192,54 h28 l-2,34 h-24 z\"/>",
		glow: "<path d=\"M188,52 h36 l-4,40 h-28 z\"/>"
	},
	fairy: {
		hang: 246,
		still: `<path class="thin" d="M246,14 q-12,26 -26,10 q-14,24 -28,4 q-14,24 -28,4 q-14,22 -28,-6"/>${Dd(kd, 5, "glass")}`,
		glow: Dd(kd, 10)
	},
	desk: {
		hang: 246,
		still: "<path class=\"thin\" d=\"M246,82 H224\"/><path class=\"wood\" d=\"M176,90 h70 v5 h-70 z\"/><path class=\"iron\" d=\"M196,90 v-6 h28 v6 z\"/>\n      <path d=\"M210,84 L228,56 L200,40\"/><path class=\"brass\" d=\"M204,36 l-26,8 l12,16 z\"/>",
		glow: "<path d=\"M180,48 l-22,40 h40 l-6,-32 z\"/>"
	}
}, jd = [
	[/chandelier/i, "chandelier"],
	[/desk/i, "desk"],
	[/fairy|string/i, "fairy"],
	[/lantern|porch|wall/i, "lantern"]
], Md = (e) => Ad[jd.find(([t]) => t.test(e.name))?.[1] ?? Du(e.id, [
	"bulb",
	"lantern",
	"chandelier"
])], Nd = () => ({
	spin: 0,
	fly: 140,
	flown: 0,
	gap: 1,
	dyn: 0,
	spun: 0,
	working: !1,
	t: 0
});
function Pd(e, t, n, r, i) {
	Object.assign(e, {
		working: t,
		t: i
	}), e.spin += r * (t ? 900 : 140), e.fly += ((t ? 900 : 180) - e.fly) * V(r * (t ? 3 : .5)), e.flown += r * e.fly, e.gap = Ou(e.gap, +!n, r * 6), e.dyn += ((e.gap ? 0 : e.fly) - e.dyn) * V(r * 4), e.spun += r * e.dyn;
}
function Fd(e, t) {
	let n = Object.values(Sd)[t % 3], r = Object.values(Ed)[B(e.id) % 3], i = Md(e), a = Nd(), o = () => .25 + .5 * (e.level / 100), s = wd(n), c = s, l = -1, u = e.dims ? {
		still: "<circle class=\"paper\" cx=\"30\" cy=\"46\" r=\"16\"/><text class=\"small\" x=\"30\" y=\"58\" text-anchor=\"middle\">VOLTS</text>",
		live: "<g data-p=\"volt\" data-ring=\"-60..60:25\"><path d=\"M30,46 V33\"/></g>"
	} : {
		still: "",
		live: ""
	};
	return {
		device: e.id,
		io: "LR",
		faults: [
			{
				kind: "oil",
				at: [70, 196]
			},
			{
				kind: "bolt",
				at: [184, 220]
			},
			...n === Sd.belt ? [{
				kind: "cord",
				loop: [
					[56, 131],
					[144, 131],
					[144, 153],
					[56, 153]
				],
				run: () => a.spin * .1745
			}] : []
		],
		still: `<path class="wood" d="M0,132 h44 v6 h-44 z M156,132 h104 v6 h-104 z"/><path d="M14,226 H250"/>
      <rect class="copper" x="180" y="178" width="44" height="36" rx="6"/><path class="thin" d="M188,178 v36 M196,178 v36 M208,178 v36 M216,178 v36"/>
      <path class="iron" d="M176,214 h52 v12 h-52 z"/><path class="thin" d="M224,196 H246 V14 H${i.hang}"/>
      <circle class="paper" cx="246" cy="160" r="3"/><circle class="paper" cx="246" cy="110" r="3"/>${n.still}${r.still}${i.still}${u.still}${Hu(e, 92, 30)}`,
		live: `<g class="shine" data-p="glow" data-glow="${ju(e.id)}" style="${e.colour ? `--lit:${e.colour}` : ""}">${i.glow}</g>${G(70, 196, 10, 6, "a")}${n.live}${r.live}
      ${G(202, 196, 8, 8, "dyn")}<path class="spark" data-p="spark" d="M202,160 l3,6 l6,-2 l-4,5 l4,5 l-6,-2 l-3,6 l-3,-6 l-6,2 l4,-5 l-4,-5 l6,2 z"/>${u.live}`,
		duck({ p: t, on: r, now: i }) {
			if (!r) return s(t);
			l !== e.level && (l = e.level, c = Cd(n, .22, o()));
			let a = c(t);
			return a.i === n.at ? {
				...a,
				y: a.y - n.hop(i)
			} : a;
		},
		pose(t, { p: i, on: s, dt: c, now: l }) {
			Pd(a, s && q(i, .22, o()) === 1, e.on, c, l), U(t("a"), a.spin), n.pose(t, a), r.pose(t, a), U(t("dyn"), a.spun), W(t("spark"), +(a.dyn > 500 && Math.sin(l * 50) > 0));
			let u = e.on ? V(a.dyn / 700) : 0;
			W(t("glow"), e.on ? .3 + .55 * u : 0), e.dims && U(t("volt"), -60 + 120 * u * (e.level / 100), 30, 46);
		}
	};
}
//#endregion
//#region src/dash-bored/contraption/group.ts
var Id = K([
	0,
	0,
	130
], [
	.4,
	122,
	130
], [
	.6,
	122,
	130
], [
	1,
	260,
	130
]), Ld = [
	"<path class=\"thin\" d=\"M-22,22 l12,-18 l8,10 l10,-16 l14,24\"/><circle class=\"thin\" cx=\"14\" cy=\"-8\" r=\"4\"/>",
	"<ellipse class=\"thin\" cx=\"0\" cy=\"2\" rx=\"10\" ry=\"13\"/><path class=\"thin\" d=\"M-18,22 q18,-14 36,0\"/>",
	"<path class=\"thin\" d=\"M-22,10 h44 M-12,10 q4,-22 12,-6 q6,-14 12,6\"/>"
];
function Rd(e, t) {
	let n = Object.values(Sd)[t % 3], r = Cd(n, .22, .7), i = wd(n), a = Nd(), o = e.map((e, t) => 200 + 255 * t), s = o.at(-1) + 30, c = e.map(() => ({
		gap: 1,
		dyn: 0,
		spun: 0
	})), l = e.map((e, t) => {
		let n = o[t];
		return {
			still: `<rect class="paper" x="${n - 32}" y="44" width="64" height="48"/><rect class="thin" x="${n - 27}" y="49" width="54" height="38"/>
        <g transform="translate(${n},68)">${Ld[t % Ld.length]}</g><path class="brass" d="M${n - 26},30 h52 v6 h-52 z"/>
        <rect class="copper" x="${n - 14}" y="180" width="34" height="32" rx="5"/><path class="iron" d="M${n - 18},212 h42 v14 h-42 z M${n - 60},190 h8 v36 h-8 z"/>
        <path class="thin" d="M${n + 20},196 H${n + 44} V22 H${n} V30"/>${Hu(e, n, 243)}`,
			live: `<g class="shine" data-p="glow${t}"><path d="M${n - 26},36 h52 l10,58 h-72 z"/></g>${G(n - 32, 196, 9, 6, `take${t}`)}${G(n + 3, 196, 7, 8, `dyn${t}`)}
        <g data-p="lever${t}" data-ring="0..25:11"><path d="M${n - 20},186 V164"/><circle class="solid" cx="${n - 20}" cy="162" r="4"/></g>`
		};
	});
	return [{
		device: e[0].id,
		io: "LR",
		wide: !0,
		span: e.length,
		mode: () => e.some((e) => e.on),
		faults: [{
			kind: "oil",
			at: [112, 196]
		}, ...o.map((e) => ({
			kind: "bolt",
			at: [e - 56, 222]
		}))],
		still: `<path class="wood" d="M0,132 h44 v6 h-44 z M156,132 H${e.length * 260} v6 H156 z"/><path d="M14,226 H${s + 20} M80,196 H${s}"/>
      <text x="92" y="30" text-anchor="middle">${ju(e[0].group ?? "")}</text>${n.still}${l.map((e) => e.still).join("")}`,
		live: `${G(70, 196, 10, 6, "a")}${n.live}${Td(112, 196)}${l.map((e) => e.live).join("")}`,
		duck({ p: e, on: t, now: a }) {
			let o = (t ? r : i)(e);
			return t && o.i === n.at ? {
				...o,
				y: o.y - n.hop(a)
			} : o;
		},
		pose(t, { p: r, on: i, dt: s, now: l }) {
			Pd(a, i && q(r, .22, .7) === 1, !0, s, l), U(t("a"), a.spin), n.pose(t, a), U(t("fly"), a.flown), e.forEach((e, n) => {
				let r = c[n];
				r.gap = Ou(r.gap, +!e.on, s * 6), r.dyn += ((r.gap ? 0 : a.fly) - r.dyn) * V(s * 4), r.spun += s * r.dyn, U(t(`take${n}`), a.flown), U(t(`dyn${n}`), r.spun), U(t(`lever${n}`), 25 * r.gap, o[n] - 20, 186), W(t(`glow${n}`), e.on ? .3 + .55 * V(r.dyn / 700) : 0);
			});
		}
	}, ...e.slice(1).map((e) => ({
		device: e.id,
		io: "LR",
		live: "<text data-p=\"hm\" class=\"small\" x=\"140\" y=\"98\">hm.</text>",
		duck: ({ p: e }) => Id(e),
		pose(e, { p: t }) {
			W(e("hm"), q(t, .42, .6));
		}
	}))];
}
//#endregion
//#region src/dash-bored/contraption/points.ts
var zd = ([e, t], n) => `<ellipse class="solid" cx="${e}" cy="${t}" rx="28" ry="8"/><text class="small" x="${e}" y="${t + 20}" text-anchor="middle">${ju(n)}</text>`, Bd = (e, t) => ({
	...e,
	sy: V(t / .1, .05),
	o: t < .02 ? 0 : 1
}), Vd = (e, t, n) => ({
	...e,
	sy: V((n - t) / .06, .05),
	o: t >= n ? 0 : 1
}), Hd = [130, 130], Ud = {
	R: 0,
	B: 90,
	L: 180,
	T: -90
}, Wd = {
	L: "M0,132 h84 v6 h-84 z",
	R: "M176,132 h84 v6 h-84 z",
	T: "M127,0 h6 v84 h-6 z",
	B: "M127,176 h6 v84 h-6 z"
}, Gd = (e) => e * e * (3 - 2 * e);
function Kd(e, t) {
	let n = t.length, r = e === "B", i = r ? [50, 222] : [44, 216], a = r ? [74, 130] : [36, 130], o = (e, r) => t[Bu(e, r, n)], s = (e, t) => r ? e ? n === 2 ? .3 : o(e, t) === "T" || e === 2 && o(1, t) !== "T" ? .36 : .2 : o(0, t) === "T" ? .5 : .4 : .5 + (e - (n - 1) / 2) * .12, c = /* @__PURE__ */ new Map(), l = (e, t, n) => {
		let o = `${e}${t}${n}`, s = Ru[t];
		if (!c.has(o)) {
			let l = (...e) => K([
				0,
				i[0],
				i[1] - 2
			], [
				.08,
				i[0],
				i[1] - 12
			], [n * .55, ...a], [n, ...Hd], ...e);
			c.set(o, r ? t === "T" ? e ? l([.5, ...Hd], [1, ...s]) : K([0, ...Ru.B], [1, ...s]) : e ? l([1, ...s]) : K([0, ...Ru.B], [
				.3,
				130,
				182,
				22
			], [
				.45,
				t === "R" ? 178 : 82,
				130
			], [1, ...s]) : e ? l([1, ...s]) : K([0, ...Ru.L], [n, ...Hd], [1, ...s]));
		}
		return c.get(o);
	}, u = Array.from({ length: n }, (e, t) => t);
	return {
		io: `${e}>${t}`,
		steady: !0,
		pit: i,
		faults: [{
			kind: "oil",
			at: [130, 130]
		}],
		still: `${r ? "<path d=\"M92,180 V260 M168,180 V260 M92,0 V80 M168,0 V80\"/><path class=\"wood\" d=\"M56,132 h28 v6 h-28 z\"/>" : ""}
      <path class="wood" d="${r ? "" : Wd[e]} ${[...t].map((e) => r && e === "T" ? "" : Wd[e]).join(" ")}"/><path class="rope" d="M${i[0]},${i[1] - 8} L${a}"/>
      <circle class="paper" cx="130" cy="130" r="46"/><circle class="thin" cx="130" cy="130" r="38"/>${zd(i, "SPARES")}`,
		live: `${r ? gd : ""}<g transform="translate(130,130)"><g data-p="arm" data-ring="72"><path class="brass" d="M-30,-6 h40 v-8 l22,14 l-22,14 v-8 h-40 z"/><circle class="solid" r="4"/></g></g>`,
		duck({ p: e, from: n, to: r, turn: i }) {
			let a = Math.max(0, -n), o = l(a, t[Math.max(0, r)], s(a, i))(e);
			return a ? Bd(o, e) : o;
		},
		pose(e, { p: t, turn: i }) {
			let a = (e) => [...u].sort((t, n) => s(t, e) - s(n, e)), c = i + n - 1, l = Ud[o(a(c).at(-1), c)];
			for (let e of a(i)) l += (Ud[o(e, i)] - l) * Gd(V((t - s(e, i) + .1) / .08));
			U(e("arm"), l), r && H(e("board"), 130, 262 - 260 * t);
		}
	};
}
var qd = 40, Jd = .3, Yd = 560, Xd = (e) => [Hd[0] + qd * Math.cos(e * Math.PI / 180), Hd[1] + qd * Math.sin(e * Math.PI / 180)], Zd = (e, t, n) => ({
	x: e[0] + (t[0] - e[0]) * n,
	y: e[1] + (t[1] - e[1]) * n
});
function Qd(e) {
	let t = [204, 214];
	return {
		io: `${e}>R`,
		steady: !0,
		pit: t,
		faults: [{
			kind: "oil",
			at: [130, 130]
		}],
		still: `<path class="wood" d="${Wd.R} ${[...e].map((e) => Wd[e]).join(" ")}"/><circle class="thin" cx="130" cy="130" r="50"/>${zd(t, "TOO MANY")}`,
		live: "<g transform=\"translate(130,130)\"><g data-p=\"disc\" data-ring=\"120:24\"><circle class=\"paper\" r=\"46\"/><path d=\"M0,0 L46,0 M0,0 L-23,39.8 M0,0 L-23,-39.8\"/><circle class=\"brass\" r=\"7\"/></g></g>",
		duck({ p: n, from: r, to: i }) {
			let a = e[Math.max(0, r)], o = Ud[a] + 360, s = i >= 0, c = Jd + (((s ? 720 : 765) - o) % 360 || 360) / Yd;
			if (n < Jd) return Zd(Ru[a], Xd(o), n / Jd);
			if (n < c) return Zd(Xd(o + Yd * (n - Jd)), Hd, 0);
			if (s) return Zd(Xd(0), Ru.R, (n - c) / (1 - c));
			let l = V((n - c) / .08), u = Zd(Xd(45), t, l);
			return Vd({
				...u,
				y: u.y - 22 * Math.sin(Math.PI * l)
			}, n, c + .12);
		},
		pose(e, { p: t }) {
			U(e("disc"), Yd * t);
		}
	};
}
var $d = K([
	0,
	0,
	130
], [
	.5,
	120,
	130
], [
	.85,
	186,
	146,
	40
], [
	1,
	186,
	152
]), ef = {
	io: "L>",
	steady: !0,
	pit: [186, 154],
	still: `<path class="wood" d="M0,132 h140 v6 h-140 z"/><path class="thin" d="M130,138 l10,30 V138"/>${zd([186, 154], "WAY BACK")}`,
	live: "<text data-p=\"bye\" class=\"small said\" x=\"150\" y=\"200\">plop</text>",
	duck: ({ p: e }) => Vd($d(e), e, .98),
	pose(e, { p: t }) {
		W(e("bye"), q(t, .86, 1));
	}
}, tf = {
	io: ">T",
	steady: !0,
	pit: [130, 234],
	still: `<path d="M92,0 V226 M168,0 V226"/><path class="thin" d="M92,52 h76 M92,104 h76 M92,156 h76"/><path class="rope" d="M130,0 V226"/>${zd([130, 234], "ALL ABOARD")}`,
	live: gd,
	duck: ({ p: e }) => Bd({
		x: 130,
		y: 260 - 260 * e
	}, e),
	pose(e, { p: t }) {
		H(e("board"), 130, 262 - 260 * t), W(e("board"), V(t / .1));
	}
}, nf = K([
	0,
	130,
	260
], [
	.5,
	130,
	130,
	44
], [
	.72,
	212,
	144
], [
	1,
	212,
	148
]), rf = {
	io: "B>",
	steady: !0,
	pit: [212, 150],
	still: `<path d="M92,56 V260 M168,56 V260 M92,56 h76"/><path class="thin" d="M92,156 h76 M92,208 h76"/><path class="rope" d="M130,72 V260"/><circle class="iron" cx="130" cy="56" r="16"/>
    ${zd([212, 150], "ROUND AGAIN")}`,
	live: `${gd}<text data-p="bye" class="small said" x="196" y="96">hup</text>`,
	duck: ({ p: e }) => Vd(nf(e), e, .76),
	pose(e, { p: t }) {
		H(e("board"), 130, 262 - 260 * Math.min(t, .56)), W(e("board"), 1 - V((t - .5) / .06)), W(e("bye"), q(t, .5, .72));
	}
};
//#endregion
//#region src/dash-bored/contraption/flow.ts
function af(e) {
	let t = /* @__PURE__ */ new Set(), n = e.length;
	return e.map((e, r) => {
		for (; t.has((r + e) % n);) e++;
		return t.add((r + e) % n), e;
	});
}
function of(e, t, n) {
	let r = e.nodes.map(() => []);
	for (let e of t) e.cell >= 0 && r[e.cell].push(e);
	return r.forEach((t, r) => {
		let { next: i, down: a } = e.nodes[r], o = [...i.map((e, t) => t), ...a.map((e, t) => -1 - t)];
		t.sort((e, t) => (e.from < 0 ? 1e3 - e.from : e.from) - (t.from < 0 ? 1e3 - t.from : t.from)), t.forEach((e, t) => e.to = o[Bu(t, n, o.length)]);
	}), t;
}
function sf(e) {
	let t = [], n = (e) => void t.push({
		id: t.length,
		cell: -1,
		tunnel: -1,
		way: 0,
		age: 0,
		from: 0,
		to: 0,
		...e
	});
	return e.nodes.forEach((e, t) => {
		for (let r = 0; r < e.ins; r++) n({
			cell: t,
			from: r
		});
		e.up.forEach((e, r) => n({
			cell: t,
			from: -1 - r
		}));
	}), e.tunnels.forEach(({ ways: e }, t) => {
		let r = e.length, i = Math.max(...e.map((e) => e.periods));
		for (let a = 0; a < i; a++) {
			let i = (r - a % r) % r;
			a < e[i].periods && n({
				tunnel: t,
				way: i,
				age: a
			});
		}
	}), of(e, t, 0);
}
function cf(e, t, n) {
	for (let r of t) if (r.tunnel >= 0) {
		if (++r.age < e.tunnels[r.tunnel].ways[r.way].periods) continue;
		let t = e.tunnels[r.tunnel].to;
		Object.assign(r, {
			cell: t,
			from: -1 - e.nodes[t].up.indexOf(r.tunnel),
			tunnel: -1
		});
	} else if (r.to >= 0) {
		let t = e.nodes[r.cell].next[r.to];
		Object.assign(r, {
			cell: t.to,
			from: t.from
		});
	} else {
		let t = e.nodes[r.cell].down[-1 - r.to];
		Object.assign(r, {
			tunnel: t,
			way: n % e.tunnels[t].ways.length,
			age: 0,
			cell: -1
		});
	}
	return of(e, t, n);
}
var lf = 48;
function uf(e, t, n) {
	let r = (e, t) => B(n + e) % t, i = t[0] - e[0], a = t[1] - e[1], o = Math.min(Math.abs(i), Math.abs(a)), s = Math.abs(i) > Math.abs(a), c = Math.max(Math.abs(i), Math.abs(a)) - o, l = [
		.25,
		.5,
		.75,
		0,
		1
	], u = l[r("straight", 5)], d = l[r("slant", 5)], f = (e) => s ? [Math.sign(i) * e, 0] : [0, Math.sign(a) * e], p = (e) => [Math.sign(i) * e, Math.sign(a) * e], m = [
		f(c * u),
		p(o * d),
		f(c * (1 - u)),
		p(o * (1 - d))
	];
	r("order", 2) && m.reverse();
	let h = [e];
	for (let [e, t] of m) (e || t) && h.push([h.at(-1)[0] + e, h.at(-1)[1] + t]);
	return h[h.length - 1] = t, h.slice(1);
}
var df = ([e, t], n) => [e + (n % 3 - 1) * (34 + n % 8 * 12), t + 34 + n % 8 * 12];
function ff(e, t, n) {
	let r = df(e, B(n + "drop"));
	return [
		e,
		r,
		...uf(r, df(t, B(n + "rise")), n),
		t
	];
}
var pf = (e) => e.slice(1).map((t, n) => [e[n], t]), mf = ([e, t]) => Math.hypot(t[0] - e[0], t[1] - e[1]), hf = (e) => pf(e).reduce((e, t) => e + mf(t), 0);
function gf([e, t], [n, r]) {
	let i = mf([e, t]), a = (t[0] - e[0]) / i, o = (t[1] - e[1]) / i, s = r[0] - n[0], c = r[1] - n[1], l = a * c - o * s, u = n[0] - e[0], d = n[1] - e[1];
	if (Math.abs(l) > 1e-6 * Math.hypot(s, c)) {
		let e = (u * c - d * s) / l, t = (u * o - d * a) / l;
		return {
			beside: 0,
			cross: e > 1 && e < i - 1 && t > 0 && t < 1
		};
	}
	if (Math.abs(u * o - d * a) >= 40) return {
		beside: 0,
		cross: !1
	};
	let f = u * a + d * o, p = f + s * a + c * o, m = Math.min(f, p), h = Math.max(f, p);
	return {
		beside: Math.abs(u * o - d * a) < .5 && Math.abs(m) < .5 && Math.abs(h - i) < .5 ? 0 : Math.max(0, Math.min(i, h) - Math.max(0, m)),
		cross: !1
	};
}
function _f(e, t) {
	let n = hf(e) * .05;
	for (let r of pf(e)) if (!(mf(r) < 1)) for (let e of t) {
		let { beside: t, cross: i } = gf(r, e);
		n += (t ? 300 + 4 * t : 0) + (i ? 20 : 0);
	}
	return n;
}
function vf(e, t, n, r, i) {
	let a = Array.from({ length: lf }, (r, i) => {
		let a = ff(e, t, `${n}.${i}`);
		return [a, a.length];
	});
	for (let t of i) for (let r = 2; r < t.length - 1; r++) for (let i = 0; i < 3; i++) {
		let o = df(e, B(`${n}.${r}.${i}`)), s = [
			e,
			o,
			...uf(o, t[r], `${n}.${r}.${i}`)
		];
		a.push([[...s, ...t.slice(r + 1)], s.length]);
	}
	let o = a[0][0], s = Infinity;
	for (let [e, t] of a) {
		let n = _f(e.slice(0, t), r);
		n < s && ([o, s] = [e, n]);
	}
	return o;
}
function yf(e, t = 0, n = 1) {
	let r = hf(e) / 260 + t / n, i = Math.max(1, Math.ceil(r - 1e-9));
	return {
		path: e,
		periods: i,
		lead: i - r
	};
}
function bf({ path: e, lead: t }, n) {
	let r = (n - t) * 260;
	if (!(r < 0)) for (let t of pf(e)) {
		let e = mf(t), [[n, i], [a, o]] = t;
		if (r <= e && e) return [n + (a - n) * r / e, i + (o - i) * r / e];
		r -= e;
	}
}
var xf = [
	[1, 0],
	[Math.SQRT1_2, Math.SQRT1_2],
	[0, 1],
	[-Math.SQRT1_2, Math.SQRT1_2],
	[-1, 0],
	[-Math.SQRT1_2, -Math.SQRT1_2],
	[0, -1],
	[Math.SQRT1_2, -Math.SQRT1_2]
];
function Sf([e, t], n) {
	let r = n / 1.307, i = 44 / 1.307 / 8, a = [[e - r / 2, t - r * 1.207]];
	for (let e = 0; r - e * i > 14; e++) {
		let [t, n] = a.at(-1), o = r - e * i, [s, c] = xf[e % 8];
		a.push([t + s * o, n + c * o]);
	}
	return a;
}
function Cf(e, t, n) {
	let r = t[0] - e[0], i = t[1] - e[1], a = Math.min(Math.abs(r), Math.abs(i)), o = n ? [e[0] + Math.sign(r) * a, e[1] + Math.sign(i) * a] : [t[0] - Math.sign(r) * a, t[1] - Math.sign(i) * a];
	return Math.hypot(o[0] - e[0], o[1] - e[1]) > 1 && Math.hypot(o[0] - t[0], o[1] - t[1]) > 1 ? [o, t] : [t];
}
var wf = [
	[84, 0],
	[-84, 0],
	[64, -64],
	[-64, -64]
];
function Tf(e, t, n, r, i) {
	let a = (e, t) => B(i + e) % t, o = [e[0], e[1] + 46], s = new Set(n.map(String)), c = [n.filter(([e]) => e > r), n.filter(([e]) => e < r)];
	if (!c[0].length || !c[1].length) {
		let e = [...n].sort((e, t) => Math.abs(e[0] - r) - Math.abs(t[0] - r));
		c = [e.filter((e, t) => t % 2 == 0), e.filter((e, t) => t % 2 == 1)];
	}
	let l = ([e, t]) => [
		-1,
		0,
		1
	].flatMap((n) => [
		-1,
		0,
		1
	].map((r) => s.has(`${e + n},${t + r}`))).filter(Boolean).length, u = n.reduce((e, t) => l(t) > l(e) ? t : e, n[0]), d = (e) => {
		let t = [...new Set(e.map(([, e]) => e))].sort((e, t) => e - t);
		return t.flatMap((n, i) => e.filter(([, e]) => e === n).sort((e, n) => (Math.abs(e[0] - r) - Math.abs(n[0] - r)) * ((t.length - 1 - i) % 2 ? 1 : -1)));
	}, f = (e, t) => {
		let n = [e];
		for (let [e, r] of t) {
			let t = `${e},${r}`, i = [e * 260 + 130, r * 260 + 130], o = e === u?.[0] && r === u[1] ? Sf(i, l([e, r]) === 9 ? 232 : 104) : [[i[0] + 30 * (a(`x${t}`, 5) - 2), i[1] + 30 * (a(`y${t}`, 5) - 2)]];
			n.push(...Cf(n.at(-1), o[0], a(`e${t}`, 2) === 1), ...o.slice(1));
		}
		return n.slice(1);
	}, p = [
		[],
		[],
		[],
		[]
	];
	c.forEach((n, r) => {
		let i = d(n), s = i.length >= 8, c = [
			e,
			o,
			...f(o, i.slice(0, 1))
		], l = i.slice(1);
		[0, 1].forEach((e) => {
			let n = s ? l.filter(([, t]) => t % 2 === e) : l, i = [...c, ...f(c.at(-1), n)], o = [t[0] + wf[r + 2 * e][0], t[1] + wf[r + 2 * e][1]];
			p[r + 2 * e] = [
				...i,
				...Cf(i.at(-1), o, a(`c${r}${e}`, 2) === 1),
				t
			];
		}), s || (p[r + 2] = p[r]);
	});
	let m = p[0] === p[2] && p[1] === p[3] ? p.slice(0, 2) : p;
	return af(m.map((e) => Math.max(1, Math.ceil(hf(e) / 260 - 1e-9)))).map((e, t) => ({
		path: m[t],
		periods: e,
		lead: 0
	}));
}
//#endregion
//#region src/dash-bored/contraption/layout.ts
var Ef = 8, Df = 3, { cork: Of, toaster: kf, plug: Af, trampoline: jf, mangle: Mf, ladle: Nf } = ad, Pf = [Mf, Nf], Ff = [[Of, kf], ld], If = [[Af, jf], fd], Lf = (e) => e.length + 1;
function Rf(e, t) {
	let n = [];
	for (let e of t) e.group && n.at(-1)?.[0].group === e.group ? n.at(-1).push(e) : n.push([e]);
	let r = n.reduce((e, t) => e + Lf(t), 0), i = r / Math.max(1, Math.ceil(r / Ef)), a = [[]], o = 0;
	for (let e of n) o >= i * a.length && a.at(-1).length && a.push([]), a.at(-1).push(e), o += Lf(e);
	let s = [], c = [], l = [], u = B(e), d = B(e), f = (e) => zu(e.io).ins.includes("R") || zu(e.io).outs.includes("L"), p = (e) => {
		let t = d++;
		return e.length > 1 ? Rd(e, t) : [e[0].kind === "light" ? Fd(e[0], t) : bd(e[0])];
	};
	a.forEach((e, t) => {
		let n = t >> 1, r = t % 2 ? -1 : 1, i = 1, a = 1, o = !0, d = (e, t, i) => s.push({
			col: r * e,
			row: n * Df + t,
			tile: i,
			flip: r < 0 !== f(i)
		}) - 1, m = (t) => {
			let n = 0;
			for (; e[t + n]?.length === 1;) n++;
			return n;
		};
		for (let t = 0; t < e.length;) {
			let n = m(t);
			if (!o && n >= 2 && a === 1) {
				let r = Math.min(3, n), a = n >= 2 * r && u++ % 2 ? 2 : 1, s = r === 3 ? [
					1,
					0,
					2
				] : [1, u++ % 2 ? 0 : 2], l = s.map((e) => "RTB"[e === 1 ? 0 : e === 0 ? 1 : 2]).join(""), f = i + 2 * a, m = d(i, 1, Kd("L", l)), h = d(f, 1, Qd(l.replace("R", "L")));
				for (let e = 1; e < r; e++) c.push([h, m]);
				for (let n of s) {
					n !== 1 && (d(i, n, n ? jf : kf), d(f, n, n ? Of : Af));
					for (let r = 0; r < a; r++) d(i + 1 + 2 * r, n, p(e[t++])[0]), r < a - 1 && d(i + 2 + 2 * r, n, Pf[u++ % 2]);
				}
				i = f + 1, o = !0;
			} else {
				for (let n of p(e[t++])) d(i++, a, n);
				o = !1;
			}
			if (t === e.length || o) continue;
			let r = m(t) >= 2 ? 1 : (a + 1 + u++ % 2) % Df, s = r < a;
			if (r === a) d(i, a, Pf[u++ % 2]);
			else {
				let [e, t] = Math.abs(r - a) > 1 ? (s ? Ff : If)[0] : (s ? Ff : If)[u++ % 2];
				d(i, a, e);
				for (let e = a + Math.sign(r - a); e !== r; e += Math.sign(r - a)) d(i, e, s ? _d : hd);
				d(i, r, t);
			}
			[i, a] = [i + 1, r];
		}
		(l[n] ??= []).push(d(i, a, ef));
	});
	let m = l.length, h = (e, t) => s.push({
		col: 0,
		row: e,
		tile: t,
		flip: !1
	}) - 1, g = h((m - 1) * Df + 2, tf), _ = h(0, rf);
	for (let e = 0; e < m; e++) {
		let t = h(e * Df + 1, Kd("B", "R" + (a[2 * e + 1] ? "L" : "") + "T"));
		for (let n of l[e]) c.push([n, t]);
		if (e) for (let t of [e * Df - 1, e * Df]) h(t, _d);
	}
	let v = Math.min(...s.map((e) => e.col));
	for (let e of s) e.col -= v;
	let y = ({ col: e, row: t, tile: n, flip: r }) => [e * 260 + (r ? 260 - n.pit[0] : n.pit[0]), t * 260 + n.pit[1]], b = new Set(s.map((e) => `${e.col},${e.row}`)), x = Math.max(...s.map((e) => e.col)) + 1, S = Array.from({ length: x * m * Df }, (e, t) => [t % x, Math.floor(t / x)]).filter((e) => !b.has(String(e))), C = Tf(y(s[_]), y(s[g]), S, s[g].col, e), w = [{
		from: _,
		to: g,
		ways: C,
		layer: 2
	}], T = C.flatMap((e) => pf(e.path)), E = [...new Set(c.map(([, e]) => e))];
	return c.forEach(([t, n], r) => {
		let i = w.filter((e) => e.to === n), a = i.find((e) => e.from === t)?.ways[0].path ?? vf(y(s[t]), y(s[n]), `${e}.${r}`, T, i.map((e) => e.ways[0].path));
		w.push({
			from: t,
			to: n,
			ways: [yf(a, i.length, c.filter((e) => e[1] === n).length)],
			layer: E.indexOf(n) % 2
		}), T.push(...pf(a));
	}), {
		way: s,
		tunnels: w
	};
}
var zf = {
	L: [
		-1,
		0,
		"R"
	],
	R: [
		1,
		0,
		"L"
	],
	T: [
		0,
		-1,
		"B"
	],
	B: [
		0,
		1,
		"T"
	]
};
function Bf({ way: e, tunnels: t }) {
	let n = (e) => `column ${e.col}, row ${e.row}`, r = new Map(e.map((e, t) => [`${e.col},${e.row}`, t]));
	if (r.size !== e.length) throw Error("The route is wrong: two tiles are in one place.");
	let i = e.map((e) => zu(e.tile.io, e.flip)), a = i.map(({ ins: e }) => [...e].map(() => 0)), o = e.map((e, t) => [...i[t].outs].map((t) => {
		let [o, s, c] = zf[t], l = r.get(`${e.col + o},${e.row + s}`), u = l === void 0 ? -1 : i[l].ins.indexOf(c);
		if (l === void 0 || u < 0) throw Error(`The route is wrong: the tile at ${n(e)} sends a duck out by ${t}, and nothing takes it.`);
		return a[l][u]++, {
			to: l,
			from: u
		};
	})), s = e.map((e, n) => t.flatMap((e, t) => e.to === n ? t : [])), c = e.map((e, n) => t.flatMap((e, t) => e.from === n ? t : []));
	return e.forEach((e, t) => {
		if (a[t].some((e) => e !== 1)) throw Error(`The route is wrong: the tile at ${n(e)} is drawn to be entered by ${i[t].ins}, and is not.`);
		let r = i[t].ins.length + s[t].length, o = i[t].outs.length + c[t].length;
		if (r !== o || !r) throw Error(`The route is wrong: ${r} ducks a period come into the tile at ${n(e)} and ${o} leave it.`);
		if ((s[t].length || c[t].length) && !e.tile.pit) throw Error(`The route is wrong: a tunnel ends at the tile at ${n(e)}, which has no hole.`);
	}), {
		io: i,
		next: o,
		up: s,
		down: c
	};
}
//#endregion
//#region src/dash-bored/contraption/bot.ts
var Vf = 460, Hf = 1.5, Uf = "<g data-p=\"bot\"><g data-p=\"bot_lean\">\n  <g transform=\"translate(0,-9)\"><g data-p=\"bot_wheel\" data-ring=\"90:18\"><circle class=\"paper\" r=\"9\"/><path d=\"M-9,0 H9 M0,-9 V9\"/><circle class=\"solid\" r=\"1.6\"/></g></g>\n  <g data-p=\"bot_flip\"><g transform=\"translate(0,-18) rotate(-90)\"><path class=\"thin\" data-p=\"bot_sc\"/></g>\n  <g data-p=\"bot_body\" data-ring=\"-24..24:25\"><path class=\"iron\" d=\"M-9,0 h18 v-18 h-18 z\"/><path class=\"brass\" d=\"M-7,-18 q0,-11 7,-11 q7,0 7,11 z\"/>\n    <circle class=\"solid\" cx=\"3\" cy=\"-23\" r=\"1.5\"/><path d=\"M-3,-29 l-3,-5 h12 l-3,5\"/>\n    <path d=\"M-9,-12 l-7,6\"/><path class=\"brass\" d=\"M-21,-7 h6 v6 h-6 z\"/>\n    <g transform=\"translate(9,-12)\"><g data-p=\"bot_arm\" data-ring=\"-60..60:41\"><path d=\"M0,0 l11,6 m0,0 l4,-2 m-4,2 l3,4\"/></g></g></g>\n  </g></g></g>";
function Wf(e, t) {
	let n = [], r = {
		x: 0,
		v: 0
	}, i = (t.lo + t.hi) / 2, a = t.floor, o = 0, s = null, c = "idle", l = 1.5, u = i, d = 1, f = 0, p = 0, m = () => !!s && s.floor !== a;
	function h(e) {
		s !== e && !n.includes(e) && n.push(e);
	}
	function g(h, g) {
		let _ = 0;
		if (l -= h, c === "idle") n.length ? (s = n.shift(), u = m() ? t.pole : s.x, c = "ride") : l <= 0 && (u = t.lo + B(`potter${p++}`) % (t.hi - t.lo), c = "ride");
		else if (c === "ride") {
			let e = u - i, n = t.speed * h;
			Math.abs(e) > n ? (d = Math.sign(e), i += d * n, _ = d, f += d * n * 6.37) : m() ? (i = u, c = "slide") : (i = u, c = s ? "up" : "work", l = .9, d = s?.face ?? d, s?.start());
		} else c === "slide" ? (a = Ou(a, s.floor, Vf * h), a === s.floor && (u = s.x, c = "ride")) : c === "up" ? (o = Math.min(s.rise, o + Vf * h), o >= s.rise && (c = "work", l = Hf)) : c === "work" ? (s?.work(1 - Math.max(0, l) / Hf), l <= 0 && (s?.done(), c = s ? "down" : "idle", s = null, l = 2 + B(`rest${p}`) % 30 / 10)) : (o = Math.max(0, o - Vf * h), o || (c = "idle", l = 1));
		let v = c === "idle" ? Math.sin(g * 2.2) * 6 : 0;
		H(e("bot"), i + v, a), U(e("bot_lean"), ku(r, _ * 10, h, 60, 10) + v), e("bot_flip").sx = d, U(e("bot_wheel"), f + v * 7), Au(e("bot_sc"), Mu(10 + o, 8, 36)), H(e("bot_body"), 0, -28 - o), U(e("bot_arm"), c === "work" ? Math.sin(g * 18) * 30 : 0);
	}
	return {
		ask: h,
		tick: g
	};
}
//#endregion
//#region src/dash-bored/contraption/faults.ts
var Gf = 3, Kf = {
	oil: (e) => `<text class="small" x="18" y="-24">eek eek</text><g data-p="jit${e}"><path class="thin" d="M8,-8 q6,-4 4,-12 M14,-4 q10,-6 8,-18"/></g>
    <g data-p="drip${e}"><circle class="drop" r="2.5"/></g>`,
	bolt: (e) => `<text class="small" x="10" y="-10">rattle</text><g data-p="bolt${e}" data-ring="180:12"><path class="brass" d="M-6,0 l3,-5.2 h6 l3,5.2 l-3,5.2 h-6 z"/><path d="M-3,0 H3"/></g>`,
	cord: (e) => `<text class="small" x="8" y="-22">twang</text><g data-p="jit${e}"><path class="thin" d="M0,0 q6,-10 2,-18 M0,0 q-8,-6 -12,-16"/></g>`
}, qf = (e) => `<g data-p="knot${e}"><circle class="solid" r="3.5"/><path class="thin" d="M0,0 l5,-6 M0,0 l-6,-4"/></g>`;
function Jf(e, t) {
	let n = e.map((t, n) => {
		let r = e[(n + 1) % e.length];
		return {
			a: t,
			b: r,
			long: Math.hypot(r[0] - t[0], r[1] - t[1])
		};
	}), r = n.reduce((e, t) => e + t.long, 0);
	t = (t % r + r) % r;
	for (let { a: e, b: r, long: i } of n) {
		if (t <= i) return [e[0] + (r[0] - e[0]) * t / i, e[1] + (r[1] - e[1]) * t / i];
		t -= i;
	}
	return e[0];
}
function Yf(e) {
	let t = [];
	for (let n of e) for (let e of n.tile.faults ?? []) {
		let r = ([e, t]) => [n.x + (n.flip ? 260 - e : e), n.y + t], i = e.kind === "cord" ? e.loop.map(r) : void 0, [a, o] = i ? i[0] : r(e.at);
		t.push({
			...e,
			cell: n,
			x: a,
			y: o,
			way: i,
			floor: n.y + 260 - 4,
			state: "sound"
		});
	}
	let n = t.map((e, t) => `<g data-p="fault${t}">${Kf[e.kind](t)}</g>${e.way ? qf(t) : ""}`).join("");
	function r(e, n) {
		let r = 4, i = 0, a = 0;
		t.forEach((t, n) => {
			H(e(`fault${n}`), t.x, t.y), W(e(`fault${n}`), 0), t.kind === "oil" && W(e(`drip${n}`), 0), t.way && W(e(`knot${n}`), 0);
		});
		function o(r) {
			let a = t.indexOf(r);
			r.state = "wrong", i++, W(e(`fault${a}`), 1), n({
				x: r.x - 18,
				face: 1,
				floor: r.floor,
				rise: Math.max(0, r.floor - 40 - r.y),
				start: () => void (r.state = "mending"),
				work(t) {
					r.kind === "bolt" && U(e(`bolt${a}`), t * 1080), r.kind === "oil" && (W(e(`drip${a}`), 1), H(e(`drip${a}`), 0, -26 + t * 5 % 1 * 26));
				},
				done() {
					W(e(`fault${a}`), 0), i--, r.state = r.way ? "knotted" : "sound", r.way && W(e(`knot${a}`), 1);
				}
			});
		}
		return (n, s) => {
			if (a += n, (r -= n) < 0) {
				let e = t.filter((e) => e.state === "sound" && !e.cell.away && e.cell.seen);
				r = 5 + B(`wait${s | 0}`) % 8, e.length && i < Gf && o(e[B(`fault${s | 0}`) % e.length]);
			}
			t.forEach((t, n) => {
				(t.state === "wrong" || t.state === "mending") && (t.kind === "bolt" ? t.state === "wrong" && U(e(`bolt${n}`), Math.sin(s * 30) * 25) : H(e(`jit${n}`), Math.sin(s * 52) * 1.5, Math.cos(s * 52) * .5)), t.state === "knotted" && t.kind === "cord" && H(e(`knot${n}`), ...Jf(t.way, t.run(a)));
			});
		};
	}
	return {
		art: n,
		start: r,
		spots: t
	};
}
//#endregion
//#region src/dash-bored/contraption/skins.ts
var Xf = [
	{
		id: "patent",
		name: "Patent engraving",
		line: "#2b2118",
		w: 1.7,
		wob: !0,
		vars: {
			bg: "#eadcbc",
			font: "\"Bradley Hand\", \"Segoe Print\", \"Chalkboard SE\", cursive",
			title: "\"Snell Roundhand\", \"Apple Chancery\", \"Lucida Calligraphy\", cursive",
			paper: "#eadcbc",
			brass: "#dcc694",
			copper: "#d4b17c",
			iron: "url(#cross)",
			wood: "url(#hatch)",
			glass: "rgba(255,255,255,.28)",
			cloth: "#c79a8a",
			flame: "#e98a2b",
			lit: "#f2c84b",
			duck: "#f3ead3",
			label: "#f3ead3",
			water: "#4f8996",
			red: "#a8452f"
		}
	},
	{
		id: "blueprint",
		name: "Blueprint",
		line: "#e8f1ff",
		w: 1.2,
		vars: {
			bg: "#1d4f91",
			font: "\"Courier New\", ui-monospace, monospace",
			title: "\"Courier New\", ui-monospace, monospace",
			paper: "#1d4f91",
			brass: "#1d4f91",
			copper: "#1d4f91",
			iron: "url(#blue)",
			wood: "#1d4f91",
			glass: "rgba(255,255,255,.07)",
			cloth: "url(#blue)",
			flame: "rgba(255,255,255,.3)",
			lit: "#fff3b0",
			duck: "#1d4f91",
			label: "#1d4f91",
			water: "#9fd0ff",
			red: "#e8f1ff"
		}
	},
	{
		id: "tin",
		name: "Tin toy",
		line: "#1c2a4a",
		w: 2.6,
		vars: {
			bg: "#f3e6c4",
			font: "\"Arial Rounded MT Bold\", \"Trebuchet MS\", sans-serif",
			title: "\"Arial Rounded MT Bold\", \"Trebuchet MS\", sans-serif",
			paper: "#fff8e6",
			brass: "#f0b830",
			copper: "#e2703a",
			iron: "#8da0b3",
			wood: "#c0703a",
			glass: "rgba(170,228,232,.6)",
			cloth: "#d8352a",
			flame: "#ff7a1a",
			lit: "#ffe14d",
			duck: "#ffd21f",
			label: "#fff8e6",
			water: "#19a3d1",
			red: "#d8352a"
		}
	}
], Zf = (e) => `--line:${e.line};--w:${e.w};${Object.entries(e.vars).map(([e, t]) => `--${e}:${t.replaceAll("\"", "'")}`).join(";")}`, Qf = "\n.ink * { stroke: var(--line); stroke-width: var(--w); stroke-linecap: round; stroke-linejoin: round; fill: none; }\n.ink .paper, .ink .fill { fill: var(--paper); }\n.ink .solid { fill: var(--line); }\n.ink .brass { fill: var(--brass); }\n.ink .copper { fill: var(--copper); }\n.ink .iron { fill: var(--iron); }\n.ink .wood { fill: var(--wood); }\n.ink .glass { fill: var(--glass); }\n.ink .cloth { fill: var(--cloth); }\n.ink .bare { stroke: none; }\n.ink .spark { fill: var(--lit); }\n.ink .drop { stroke: none; fill: var(--water); }\n.ink .duck { fill: var(--duck); }\n.ink .flame { fill: var(--flame); }\n.ink .label { fill: var(--label); }\n.ink .shine * { stroke: none; fill: var(--lit); }\n.ink .ghost * { fill: none; stroke-dasharray: 2.2 2.2; stroke-width: calc(var(--w) * .5); }\n.ink .rope { stroke-width: calc(var(--w) * .8); }\n.ink .thin { stroke-width: calc(var(--w) * .6); }\n.ink .tube { stroke-width: 26; stroke-linecap: butt; }\n.ink .bore { stroke: var(--paper); stroke-width: 21; stroke-linecap: butt; }\n.ink text, .ink tspan { stroke: var(--bg); stroke-width: 4px; paint-order: stroke; fill: var(--line); font-size: 14px; font-family: var(--font); }\n.ink .title { font-size: 23px; font-family: var(--title); }\n.ink tspan.state { font-size: 12px; font-style: italic; }\n.ink .small { font-size: 9px; }\n.ink .said { font-style: italic; }\n", $f = "\n<filter id=\"wobble\" x=\"-2%\" y=\"-2%\" width=\"104%\" height=\"104%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".03\" numOctaves=\"2\" seed=\"4\"/>\n  <feDisplacementMap in=\"SourceGraphic\" scale=\"3\"/></filter>\n<pattern id=\"hatch\" width=\"5\" height=\"5\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(40)\">\n  <rect width=\"5\" height=\"5\" fill=\"#eadcbc\"/><line y2=\"5\" stroke=\"#2b2118\" stroke-width=\"1\"/></pattern>\n<pattern id=\"cross\" width=\"4\" height=\"4\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\">\n  <rect width=\"4\" height=\"4\" fill=\"#eadcbc\"/><path d=\"M0,0 V4 M0,0 H4\" stroke=\"#2b2118\" stroke-width=\".9\"/></pattern>\n<pattern id=\"blue\" width=\"6\" height=\"6\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\">\n  <rect width=\"6\" height=\"6\" fill=\"#1d4f91\"/><line y2=\"6\" stroke=\"#e8f1ff\" stroke-width=\".7\"/></pattern>\n", ep = 4, tp = 4096, np = 1, rp = (e) => new XMLSerializer().serializeToString(e);
function ip(e) {
	let t = e.cloneNode(!0);
	for (let e of t.querySelectorAll("[data-p]")) e.remove();
	for (let e of ["data-p", "data-ring"]) t.removeAttribute(e);
	return t;
}
function ap(e, t, n) {
	let [r, i, a, o] = e.box, s = r + a / 2, c = i + o / 2, l = Math.hypot(a, o), u = t.span / (t.wrap ? n : n - 1);
	return Array.from({ length: n }, (n, r) => ({
		markup: `<g transform="rotate(${t.lo + r * u} ${s} ${c})">${e.markup}</g>`,
		box: [
			s - l / 2,
			c - l / 2,
			l,
			l
		]
	}));
}
function op(e, t = !1) {
	let n = [], r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
	for (let a of e.querySelectorAll("[data-p]")) {
		let o = a.parentElement.closest("[data-p]"), s = o && i.has(o) ? o : e, c = s.getCTM().inverse().multiply(a.parentNode.getCTM()), l = {
			name: a.dataset.p,
			m: [
				c.a,
				c.b,
				c.c,
				c.d,
				c.e,
				c.f
			],
			kids: [],
			looks: [],
			d: "",
			x: 0,
			y: 0,
			deg: 0,
			cx: 0,
			cy: 0,
			sx: 1,
			sy: 1,
			o: 1
		};
		if (a.localName === "path" && !a.hasAttribute("d")) l.line = a.classList.contains("rope") ? .8 : a.classList.contains("thin") ? .6 : 1;
		else {
			let e = ip(a);
			a.after(e);
			let n = e.getBBox();
			if (e.remove(), n.width || n.height) {
				let r = {
					markup: t && (e.localName === "text" || e.querySelector("text")) ? `<g transform="translate(${2 * n.x + n.width},0) scale(-1,1)">${rp(e)}</g>` : rp(e),
					box: [
						n.x - ep,
						n.y - ep,
						n.width + 8,
						n.height + 8
					],
					from: a
				}, i = a.dataset.ring ? Lu(a.dataset.ring) : void 0;
				l.ring = i?.ring, l.looks = i ? ap(r, i.ring, i.steps) : [r];
			}
		}
		i.set(a, l), r.set(l.name, l), (s === e ? n : i.get(s).kids).push(l);
	}
	return {
		tops: n,
		named: r
	};
}
function sp(e, t) {
	let n = rp(ip(e));
	return Array.from({ length: t }, (t, r) => ({
		markup: n,
		box: [
			r * 260,
			0,
			260,
			260
		],
		from: e,
		wob: !0
	}));
}
var cp = (e, t, n, r) => `<svg x="${t.x / n}" y="${t.y / n}" width="${t.w / n}" height="${t.h / n}" viewBox="${e.box.join(" ")}" preserveAspectRatio="none">${e.wob && r.wob ? `<g filter="url(#wobble)">${e.markup}</g>` : e.markup}</svg>`;
async function lp(e, t, n, r, i) {
	let a = `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${n}" viewBox="0 0 ${t / r} ${n / r}"><defs>${$f}</defs><style>${Qf}</style><g class="ink" style="${Zf(i)}">${e}</g></svg>`, o = new Image();
	return o.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(a)}`, await o.decode(), o;
}
var up = (e) => `${e.box}|${e.markup}`;
async function dp(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = [], a = 0, o = 0, s = 0;
	for (let c of [...e].sort((e, t) => t.box[3] - e.box[3])) {
		if (r.has(up(c))) continue;
		let e = Math.ceil(c.box[2] * t), l = Math.ceil(c.box[3] * t);
		a + e > tp && ([a, o, s] = [
			0,
			o + s + np,
			0
		]), (!i.length || o + l > tp) && (i.push({
			inner: "",
			wide: 0,
			high: 0,
			slots: []
		}), [a, o, s] = [
			0,
			0,
			0
		]);
		let u = i.at(-1), d = {
			x: a,
			y: o,
			w: e,
			h: l
		};
		u.inner += cp(c, d, t, n), u.slots.push(d), r.set(up(c), d), a += e + np, s = Math.max(s, l), u.wide = Math.max(u.wide, a), u.high = o + s;
	}
	let c = e.map((e) => [e, r.get(up(e))]);
	await Promise.all(i.map(async (e) => {
		let r = Object.assign(document.createElement("canvas"), {
			width: e.wide,
			height: e.high
		});
		r.getContext("2d").drawImage(await lp(e.inner, e.wide, e.high, t, n), 0, 0);
		for (let t of e.slots) t.page = r;
	}));
	for (let [e, t] of c) e.at = t;
	return {
		pages: i.length,
		px: i.reduce((e, t) => e + t.wide * t.high, 0)
	};
}
var fp = (e) => void (e.markup = rp(ip(e.from)));
async function pp(e, t, n) {
	let r = e.at;
	if (!r) return;
	let i = await lp(cp(e, {
		...r,
		x: 0,
		y: 0
	}, t, n), r.w, r.h, t, n), a = r.page.getContext("2d");
	a.clearRect(r.x, r.y, r.w, r.h), a.drawImage(i, r.x, r.y);
}
//#endregion
//#region src/dash-bored/contraption/stage.ts
var mp = [
	1,
	0,
	0,
	1,
	0,
	0
];
function hp(e, t, n, r = Fu(n), i = 1) {
	let a = t.at;
	if (!a) return;
	let { g: o, k: s } = e, [c, l, u, d] = t.box, f = c + u / 2, p = l + d / 2;
	o.setTransform(s * r.flip * r.sx, 0, 0, s * r.sy, s * (n[0] * f + n[2] * p + n[4]) - e.ox, s * (n[1] * f + n[3] * p + n[5])), o.globalAlpha = i, o.drawImage(a.page, a.x, a.y, a.w, a.h, -u / 2, -d / 2, u, d);
}
function gp(e, t, n, r = 1) {
	if (!t.o) return;
	let i = Nu(Nu(n, t.m), Pu(t)), a = r * t.o, { g: o, k: s } = e;
	if (t.line !== void 0) t.d && (o.setTransform(s * i[0], s * i[1], s * i[2], s * i[3], s * i[4] - e.ox, s * i[5]), o.globalAlpha = a, o.lineWidth = e.w * t.line, o.stroke(new Path2D(t.d)));
	else if (t.looks.length) {
		let n = Fu(i);
		hp(e, t.ring ? t.looks[Iu(t.ring, t.looks.length, n.deg)] : t.looks[0], i, n, a);
	}
	for (let n of t.kids) gp(e, n, i, a);
}
var _p = 22, vp = [
	[10, 7],
	[5, 7],
	[
		14,
		5,
		3,
		5
	]
];
function yp(e, t, n, r, i) {
	let { g: a, k: o } = e;
	a.setTransform(o, 0, 0, o, -e.ox, 0), Object.assign(a, {
		globalAlpha: r,
		lineWidth: _p + 2.4 * e.w,
		lineCap: "butt",
		lineDashOffset: -i
	}), a.setLineDash(vp[n % vp.length]), a.stroke(t), a.setLineDash([]), Object.assign(a, {
		globalAlpha: 1,
		lineWidth: _p,
		lineCap: "round",
		globalCompositeOperation: "destination-out"
	}), a.stroke(t), a.globalCompositeOperation = "source-over";
}
function bp(e) {
	let { g: t } = e;
	t.setTransform(1, 0, 0, 1, 0, 0), t.clearRect(0, 0, t.canvas.width, t.canvas.height), Object.assign(t, {
		strokeStyle: e.line,
		lineCap: "round",
		lineJoin: "round"
	});
}
var xp = (e) => [...e.looks, ...e.kids.flatMap(xp)], Sp = 66, Cp = "<ellipse class=\"duck\" cy=\"-5\" rx=\"10\" ry=\"6\"/><circle class=\"duck\" cx=\"8\" cy=\"-13\" r=\"4.5\"/>\n  <path class=\"flame\" d=\"M12,-14 l6,1.5 l-6,1.5 z\"/><circle class=\"solid\" cx=\"9\" cy=\"-14\" r=\"1\"/>", wp = "<path class=\"solid\" d=\"M3,-18 h10 M5,-18 v-8 h6 v8 z\"/>", Tp = 11, Ep = (e) => `<g data-p="body" data-ring="24"><g transform="scale(1.6)">${Cp}${e}</g></g>`, Dp = `<g data-p="body"><g class="ghost" transform="scale(1.6)">${Cp}</g></g>`, Op = [
	.5,
	.4,
	.3
], kp = .62, Ap = (e) => e.d ? e.tile.mode ? e.tile.mode() : e.d.on : !1, jp = (e, t) => (n) => {
	let r = e.get(n);
	if (!r) throw Error(`Contraption: ${t} has no part called "${n}"`);
	return r;
}, Mp = class {
	constructor(e, t, n, r, i, a) {
		this.bench = e, this.period = i, this.fail = a, this.made = {
			pages: 0,
			px: 0
		}, this.ready = !1, this.turn = 0, this.queue = Promise.resolve(), this.scale = 1, this.steam = {
			x: 1,
			v: 0
		}, this.ph = 0, this.was = 0, this.lap = 0, this.honking = 0, this.silly = 12, this.sillies = 0;
		let { way: o } = t, { io: s, next: c, up: l, down: u } = Bf(t), d = Math.min(...o.map((e) => e.row)), f = this.cells = o.map(({ col: e, row: t, tile: r, flip: i }, a) => {
			let o = 80 + e * 260, s = (t - d) * 260, c = i ? [
				-1,
				0,
				0,
				1,
				o + 260,
				s
			] : [
				1,
				0,
				0,
				1,
				o,
				s
			];
			return {
				col: e,
				row: t,
				x: o,
				y: s,
				tile: r,
				d: r.device ? n.get(r.device) : void 0,
				flip: i,
				m: c,
				plain: [
					1,
					0,
					0,
					1,
					o,
					s
				],
				turned: Fu(c),
				on: !1,
				away: "",
				sheeted: !1,
				tubed: !1,
				seen: !0,
				p: 0,
				bend: r.steady ? 0 : (B(`bend${a}`) % 401 - 200) / 1e3,
				rate: .85 + B(`rate${a}`) % 300 / 1e3,
				lag: B(`lag${a}`) % 7,
				stills: [],
				tops: [],
				q: void 0
			};
		});
		this.net = {
			nodes: o.map((e, t) => ({
				ins: s[t].ins.length,
				next: c[t],
				up: l[t],
				down: u[t]
			})),
			tunnels: t.tunnels
		}, this.burrows = t.tunnels.map(({ ways: e, layer: t }) => ({
			layer: t,
			ways: e.map((e) => ({
				...e,
				path: e.path.map(([e, t]) => [e + 80, t - d * 260])
			}))
		})), this.tubes = Array.from({ length: 3 }, (e, t) => {
			let n = /* @__PURE__ */ new Set(), r = "";
			for (let e of this.burrows) if (e.layer === t) for (let { path: t } of e.ways) {
				let e = !1;
				for (let [i, a] of pf(t)) {
					let t = [i, a].map(([e, t]) => `${e.toFixed(1)},${t.toFixed(1)}`), o = [...t].sort().join(" ");
					e = !n.has(o) && (r += e ? ` L${t[1]}` : ` M${t[0]} L${t[1]}`, !0), n.add(o);
				}
			}
			return new Path2D(r);
		});
		for (let e of f) e.on = Ap(e);
		this.wide = (Math.max(...f.map((e) => e.col)) + 1) * 260 + 160, this.high = Math.max(...f.map((e) => e.y)) + 260;
		let { wide: p, high: m } = this, h = f.map((e, t) => e.d ? Wu(e.d, Ru[s[t].ins[0]], Ru[s[t].outs[0]]) : void 0), g = Yf(f);
		e.innerHTML = f.map((e, t) => `<g data-cell="${t}"><g data-still>${e.tile.still ?? ""}</g><g data-live>${e.tile.live ?? ""}</g><g data-cover>${h[t]?.art ?? ""}</g></g>`).join("") + `<g data-extra="duck">${Ep("")}</g><g data-extra="hat">${Ep(wp)}</g><g data-extra="ghost">${Dp}</g><g data-extra="faults">${g.art}</g><g data-extra="bot">${Uf}</g>
        <g data-extra="words"><text data-p="zz" class="small said" x="8" y="-34">z z z</text><text data-p="honk" class="said" text-anchor="middle">HONK</text></g>
        <g data-margin="left"><path d="M${Sp},0 V${m}"/><text class="title" x="44" y="${m / 2}" transform="rotate(-90 44 ${m / 2})" text-anchor="middle">Fig. 3. ${ju(r)}</text></g>
        <g data-margin="right"><text data-note x="${p - 40}" y="${m / 2}" transform="rotate(90 ${p - 40} ${m / 2})" text-anchor="middle"></text></g>`;
		let _ = (t) => e.querySelector(`[data-${t}]`);
		f.forEach((t, n) => {
			let r = e.querySelector(`[data-cell="${n}"] [data-still]`);
			if (t.flip) for (let e of r.querySelectorAll("text")) e.setAttribute("transform", `translate(${2 * Number(e.getAttribute("x") ?? 0)},0) scale(-1,1)`);
			t.tile.still && (t.stills = sp(r, t.tile.span ?? 1));
			let i = op(e.querySelector(`[data-cell="${n}"] [data-live]`), t.flip);
			if (t.tops = i.tops, t.q = jp(i.named, `the tile at column ${t.col}, row ${t.row}`), !h[n]) return;
			let a = jp(op(e.querySelector(`[data-cell="${n}"] [data-cover]`)).named, "a cover");
			t.cover = {
				through: h[n].through,
				out: a("out"),
				lump: a("lump"),
				sign: a("sign"),
				on: !1,
				fell: 1,
				pull: 0,
				shake: 0
			};
		});
		let v = op(_("extra=\"duck\"")).tops[0], y = op(_("extra=\"hat\"")).tops[0], b = op(_("extra=\"ghost\"")).tops[0];
		this.ducks = sf(this.net).map((e) => ({
			at: e,
			x: 0,
			y: 0,
			facing: 1,
			size: .9 + B(`size${e.id}`) % 21 / 100,
			body: { ...e.id % Tp === 3 ? y : v },
			ghost: { ...b }
		}));
		let x = op(_("extra=\"words\"")), S = op(_("extra=\"faults\"")), C = op(_("extra=\"bot\""));
		this.zz = x.named.get("zz"), this.honk = x.named.get("honk"), this.extras = [...S.tops, ...C.tops], this.bot = Wf(jp(C.named, "the bot"), {
			speed: 420,
			lo: 100,
			hi: p - 80 - 20,
			floor: m - 4,
			pole: Sp
		}), this.loose = g.start(jp(S.named, "the faults"), this.bot.ask), this.margins = [{
			markup: "",
			box: [
				0,
				0,
				80,
				m
			],
			from: _("margin=\"left\"")
		}, {
			markup: "",
			box: [
				p - 80,
				0,
				80,
				m
			],
			from: _("margin=\"right\"")
		}], this.margins.forEach(fp), this.all = [
			...this.margins,
			...f.flatMap((e) => [
				...e.stills,
				...e.tops.flatMap(xp),
				...e.cover ? xp(e.cover.out) : []
			]),
			...[
				v,
				y,
				b,
				...x.tops,
				...this.extras
			].flatMap(xp)
		];
	}
	todo(e) {
		return this.queue = this.queue.then(e).catch(this.fail), this.queue;
	}
	bake(e, t) {
		return this.todo(async () => {
			this.made = await dp(this.all, e, t), Object.assign(this, {
				scale: e,
				skin: t,
				ready: !0
			});
		});
	}
	again(...e) {
		e.forEach(fp), this.todo(() => Promise.all(e.map((e) => pp(e, this.scale, this.skin))));
	}
	caption(e, t) {
		let n = this.bench.querySelector(`[data-cap="${CSS.escape(e)}"] .state`);
		n && n.textContent !== t && (n.textContent = t, this.again(...this.cells[Number(n.closest("[data-cell]").dataset.cell)].stills));
	}
	note(e) {
		let t = this.bench.querySelector("[data-note]");
		t.textContent !== e && (t.textContent = e, this.again(this.margins[1]));
	}
	glow(e, t = "") {
		let n = this.bench.querySelector(`[data-glow="${CSS.escape(e)}"]`), r = this.cells.find((t) => t.d?.id === e);
		n && r && n.style.getPropertyValue("--lit") !== t && (n.style.setProperty("--lit", t), this.again(...r.q("glow").looks));
	}
	answers(e, t, n = !1) {
		let r = this.cells.find((t) => t.d?.id === e), i = r?.cover;
		if (!r || !i || !t == !r.away) return;
		r.away = t;
		let a = this.bench.querySelector(`[data-sign="${CSS.escape(e)}"]`);
		if (a.querySelector("[data-word]").textContent = t ? "OUT OF ORDER" : "BACK IN ORDER", a.querySelector("[data-since]").textContent = t ? `since ${t}` : "sheet coming off", this.again(...i.sign.looks), t) {
			Object.assign(r, {
				sheeted: !0,
				tubed: r.tubed || n
			}), Object.assign(i, {
				pull: 0,
				on: n
			});
			return;
		}
		this.bot.ask({
			x: r.x + 130 - 18,
			face: 1,
			floor: r.y + 260 - 4,
			rise: 170,
			start() {},
			work: (e) => void (r.away || (i.pull = e)),
			done: () => void (r.away || (r.sheeted = !1))
		});
	}
	shake(e) {
		let t = this.cells.find((t) => t.d?.id === e)?.cover;
		t && (t.shake = .35);
	}
	look(e, t, n, r) {
		for (let i of this.cells) {
			let a = (i.tile.span ?? 1) * 260, o = i.flip ? i.x + 260 - a : i.x;
			i.seen = o < t + 260 && o + a > e - 260 && i.y < r + 260 && i.y + 260 > n - 260;
		}
	}
	get seen() {
		return this.cells.filter((e) => e.seen).length;
	}
	frame(e, t, n, r) {
		let { cells: i } = this, a = V(ku(this.steam, +!r, t, 6, 5)), o = t * a;
		this.ph += o / this.period;
		let s = this.ph % 1;
		if (s < this.was) {
			cf(this.net, this.ducks.map((e) => e.at), ++this.turn);
			for (let e of i) Object.assign(e, {
				on: Ap(e),
				tubed: e.sheeted
			});
		}
		this.was = s, bp(e);
		for (let t = 2; t >= 0; t--) yp(e, this.tubes[t], t, Op[t], (this.turn + s) * 28);
		for (let t of this.ducks) {
			if (t.at.tunnel < 0) continue;
			let n = this.burrows[t.at.tunnel], r = bf(n.ways[t.at.way], t.at.age + s);
			if (!r) continue;
			let [i, a] = r, o = t.size * kp;
			Math.abs(i - t.x) > .4 && (t.facing = Math.sign(i - t.x)), Object.assign(t, {
				x: i,
				y: a
			}), Object.assign(t.ghost, {
				x: i,
				y: a + 12 * o,
				sx: t.facing * o,
				sy: o
			}), gp(e, t.ghost, mp, Op[n.layer] + .35);
		}
		for (let t of this.margins) hp(e, t, mp);
		for (let t of i) if (t.seen) for (let n of t.stills) hp(e, n, t.m, t.turned);
		for (let t of i) if (t.p = s + t.bend * Math.sin(Math.PI * s), t.seen) {
			(!(t.tubed || t.sheeted) || t.tile.wide) && t.tile.pose?.(t.q, {
				p: t.p,
				on: t.on,
				dt: o,
				now: n * t.rate + t.lag,
				from: 0,
				to: 0,
				turn: this.turn
			});
			for (let n of t.tops) gp(e, n, t.m);
		}
		for (let n of i) n.cover && this.covered(e, n, n.cover, t);
		for (let t of this.ducks) {
			if (t.at.cell < 0) continue;
			let r = i[t.at.cell];
			if (!r.seen) continue;
			let s = r.tubed ? r.cover.through(r.p) : r.tile.duck({
				p: r.p,
				on: r.on,
				dt: o,
				now: n * r.rate + r.lag,
				from: t.at.from,
				to: t.at.to,
				turn: this.turn
			}), c = r.flip && !r.tubed, l = r.x + (c ? 260 - s.x : s.x), u = r.y + s.y, d = t.size * (t === this.goose ? 1.5 : 1);
			Math.abs(l - t.x) > .4 && (t.facing = Math.sign(l - t.x)), Object.assign(t, {
				x: l,
				y: u
			}), s.o !== 0 && (Object.assign(t.body, {
				x: l,
				y: u,
				deg: (s.r ?? 0) * (c ? -1 : 1),
				sx: t.facing * (s.sx ?? 1) * d,
				sy: (s.sy ?? 1) * d
			}), gp(e, t.body, mp), a < .5 && (H(this.zz, l, u), gp(e, this.zz, mp, 1 - 2 * a)));
		}
		(this.silly -= o) < 0 && (this.goose = this.ducks[B(`goose${this.sillies}`) % this.ducks.length], this.lap = this.period * 12, this.honking = 1.4, this.silly = 25 + B(`silly${this.sillies++}`) % 20), this.goose && (this.lap -= o) < 0 && (this.goose = void 0), this.honking = Math.max(0, this.honking - t), this.goose && this.honking && this.goose.at.cell >= 0 && i[this.goose.at.cell].seen && (H(this.honk, this.goose.x, this.goose.y - 56), gp(e, this.honk, mp)), this.loose(o, n), this.bot.tick(o, n);
		for (let t of this.extras) gp(e, t, mp);
	}
	covered(e, t, n, r) {
		let i = t.tubed || t.sheeted;
		if (i && !n.on && (n.fell = 0), n.on = i, i && t.seen) {
			if (n.fell = Math.min(1, n.fell + r / .45), H(n.out, 0, -60 * (1 - n.fell) ** 2 - 70 * n.pull), W(n.out, n.fell * (1 - n.pull)), W(n.lump, +!!t.tubed), t.tubed) {
				let e = n.through(t.p);
				H(n.lump, e.x, e.y);
			}
			n.shake = Math.max(0, n.shake - r), H(n.sign, Math.sin(n.shake * 36) * 5 * Math.min(1, n.shake * 6), 0), gp(e, n.out, t.plain);
		}
	}
}, Np = C`
  .contraption { position: relative; box-sizing: border-box; padding: 10px 16px 12px; color: var(--line); background-color: var(--bg); font-family: var(--font); }
  .contraption[data-skin="blueprint"] { text-transform: uppercase; letter-spacing: .04em; background-size: 24px 24px;
    background-image: linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px); }
  /* Foxed paper, for the engraving only: darker towards the edges. */
  .contraption[data-skin="patent"]::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 55%, rgba(110,70,20,.35)); }

  header { display: flex; align-items: flex-end; gap: 6px 20px; flex-wrap: wrap; padding: 0 0 6px; }
  h1 { font: 400 30px/1 var(--title); margin: 0; }
  header p { margin: 0 0 4px; font-size: 13.5px; font-style: italic; flex: 1; min-width: 220px; }
  .size { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .size input { accent-color: var(--line); width: 140px; }
  .size output { min-width: 4.5em; }
  .rate { font-size: 12px; opacity: .8; }
  .skins { display: flex; gap: 6px; }
  .skins button { font: inherit; font-size: 13px; color: inherit; background: none; border: 2px solid var(--line); border-radius: 4px; padding: 3px 9px; cursor: pointer; }
  .skins button[aria-pressed="true"] { background: var(--line); color: var(--bg); }
  /* The lever opens the choice of family (shell.ts), on the page only: it is drawn in the skin's own line, and leans over under the hand. */
  .lever { display: flex; align-items: center; gap: 6px; font: inherit; font-size: 13px; color: inherit; background: none; border: 2px solid var(--line); border-radius: 4px; padding: 2px 9px 2px 6px; cursor: pointer; }
  .lever svg { width: 30px; height: 26px; fill: none; stroke: var(--line); stroke-width: 2; stroke-linecap: round; overflow: visible; }
  .lever circle { fill: var(--red); }
  .lever:hover svg, .lever:active svg { transform: scaleX(-1); }
  .lever:focus-visible { outline: 2px dashed var(--line); outline-offset: 2px; }
  .skins button:focus-visible, .hit:focus-visible { outline: 2px dashed var(--line); outline-offset: -4px; }
  .notice { margin: 4px 0; padding: 6px 10px; font-size: 15px; background: var(--red); color: var(--bg); border: 2px solid var(--line); overflow-wrap: anywhere; }

  /* The sheet is as big as the tiles are drawn, and is walked along sideways where it is
     wider than the screen. The canvas is only as wide as what is seen of it, and stays
     put while the sheet goes by under it: a canvas the size of a big sheet would pass a
     tablet's limit. */
  .scroll { overflow-x: auto; overflow-y: hidden; }
  .sheet { position: relative; margin: 0 auto; }
  canvas { position: sticky; left: 0; display: block; }
  /* No word from the house: the whole machine fades. */
  .stale canvas { opacity: .5; }
  /* A device's tile is a button over the drawing, for a finger, the keyboard and a screen reader. */
  .hit { all: unset; position: absolute; box-sizing: border-box; width: var(--t); height: var(--t); cursor: pointer; }

  /* Where a tile's drawing is measured before it is made into bitmaps: on the page, as it
     must be to be measured, and never seen. */
  .bench { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; visibility: hidden; pointer-events: none; }
  ${S(Qf)}
`, J = (e, t) => {
	let n = parseInt(e.slice(1), 16);
	return `rgb(${[
		n >> 16,
		n >> 8 & 255,
		n & 255
	].map((e) => Math.min(255, Math.round(e * t))).join()})`;
}, Y = (e, t, n = .1) => J(e, 1 + (Math.floor(t() * 4) - 1.5) * n), X = (e, t, n = 16, r = 16) => e === 0 || t === 0 || e === n - 1 || t === r - 1, Pp = "#b98a4e", Fp = "#7d5a30", Ip = "#868686", Lp = "#e0b088", Rp = "#2a2018", zp = (e, t, n, r) => Math.hypot(e - n, t - r), Bp = (e) => (t, n, r) => n % 4 == 3 || t === ((n >> 2) * 7 + 3) % 16 ? J(e, .7) : Y(e, r, .06), Vp = (e, t, n, r) => (i, a, o) => X(i, a) ? e : i % 5 == 0 || a % 5 == 0 ? t : Y(n, o, r), Hp = (e) => (t, n, r) => X(t, n) ? J(Ip, .55) : t > 3 && t < 12 && n > 5 && n < 13 ? e ? Y("#ffb030", r, .2) : "#26262a" : n < 3 ? J(Ip, 1.15) : Y("#7c7f86", r, .06), Up = (e) => (t, n, r) => t > 3 && t < 12 && n > 7 && n < 14 ? e ? r() < .35 ? "#ffe45c" : Y("#e8641e", r, .2) : "#1c1a18" : n % 4 == 3 || (t + (n >> 2) % 2 * 4) % 8 == 0 ? J(Ip, .6) : Y("#77706a", r, .07), Wp = (e) => (t, n, r) => X(t, n) ? J(Ip, .55) : Math.hypot(t - 7.5, n - 7.5) < 4.5 ? e ? Y("#e02c3c", r, .2) : "#4a2226" : Y("#7c7f86", r, .06), Gp = (e) => (t, n) => {
	if (n > 11) return t > 2 && t < 13 ? J(Ip, n === 12 ? 1 : .7) : null;
	let r = e ? 8 + (11 - n) / 2 : 7 - (11 - n) / 2;
	return n < 3 || Math.abs(t - r) > 1 ? null : n < 5 ? e ? "#e02c3c" : "#5a3a3a" : Fp;
}, Kp = (e) => (t, n) => (t === 7 || t === 8) && n < 6 ? "#4a3016" : n > 5 && n < 9 && t > 0 && t < 15 ? "#a8742a" : n > 8 && n < 14 && t % 4 > 0 && t % 4 < 3 && t > 0 && t < 15 ? e : null, qp = (e, t, n) => (r, i) => i < 8 ? r < 4 || r > 11 ? null : i < 3 ? e : i === 4 && (r === 6 || r === 9) ? Rp : Lp : i < 20 ? r > 3 && r < 12 ? t : r > 1 && r < 14 ? i < 18 ? J(t, .85) : Lp : null : r < 4 || r > 11 ? null : i > 29 ? Rp : r === 7 || r === 8 ? J(n, .8) : n, Jp = (e, t) => [
	e[0].length,
	e.length,
	(n, r) => e[r][n] === "#" ? t : null
], Yp = [
	".##.##.",
	"#######",
	"#######",
	".#####.",
	"..###..",
	"...#..."
], Xp = [
	"..##",
	".##.",
	"####",
	".##.",
	"##..",
	"#..."
], Zp = (e) => (t, n) => n > 4 && n < 10 && t > 1 && t < 14 && !(n === 5 && (t < 5 || t > 10)) ? e : null, Qp = (() => {
	let e = ou(11), t = /* @__PURE__ */ new Set(), n = 8;
	for (let r = 0; r < 32; r++) n += Math.floor(e() * 3) - 1, t.add(`${n},${r}`), r % 9 == 4 && t.add(`${n + 1},${r}`).add(`${n + 2},${r - 1}`);
	return (e, n) => t.has(`${e},${n}`);
})(), $p = {
	dirt: [
		16,
		16,
		(e, t, n) => Y("#7a5536", n)
	],
	grass: [
		16,
		16,
		(e, t, n) => t < 3 + (n() * 3 | 0) ? Y("#5aa13c", n) : Y("#7a5536", n)
	],
	stone: [
		16,
		16,
		(e, t, n) => t % 4 == 3 || (e + (t >> 2) * 5) % 8 == 0 ? J(Ip, .72) : Y(Ip, n, .07)
	],
	ore: [
		16,
		16,
		(e, t, n) => n() < .1 && !X(e, t) ? "#e0913a" : Y(Ip, n, .08)
	],
	plank: [
		16,
		16,
		Bp(Pp)
	],
	beam: [
		16,
		16,
		Bp(Fp)
	],
	wall: [
		16,
		16,
		(e, t, n) => Y("#9c927c", n, .04)
	],
	roof: [
		16,
		16,
		(e, t, n) => t % 4 == 3 || (e + (t >> 2) % 2 * 4) % 8 == 0 ? J("#9a3b2e", .65) : Y("#9a3b2e", n, .08)
	],
	brick: [
		16,
		16,
		(e, t, n) => t % 4 == 3 || (e + (t >> 2) % 2 * 4) % 8 == 7 ? "#c9c2b4" : Y("#a4553c", n, .08)
	],
	trunk: [
		16,
		16,
		(e) => J("#6b4a2b", 1 + (e * 37 % 5 - 2) * .08)
	],
	leaves: [
		16,
		16,
		(e, t, n) => n() < .1 ? null : Y("#3f7d2c", n, .16)
	],
	water: [
		16,
		16,
		(e, t, n) => t % 5 == 1 && n() < .6 ? "#7fa8f0" : Y("#3a6fd8", n, .05)
	],
	post: [
		16,
		16,
		(e, t, n) => e > 5 && e < 10 ? Y(Fp, n, .08) : null
	],
	ladder: [
		16,
		16,
		(e, t) => e === 2 || e === 3 || e === 12 || e === 13 || t % 4 == 1 && e > 1 && e < 14 ? "#8a6536" : null
	],
	board: [
		16,
		16,
		(e, t, n) => X(e, t) ? J(Pp, .55) : Y(Pp, n, .05)
	],
	glass: [
		16,
		32,
		(e, t) => X(e, t, 16, 32) || t === 15 ? "#dff1ff" : (e + t) % 16 == 8 && e > 2 && e < 8 ? "rgba(255,255,255,.8)" : "rgba(170,215,255,.25)"
	],
	slat: [
		16,
		16,
		(e, t) => t % 3 == 2 ? J("#e8e0c8", .7) : "#e8e0c8"
	],
	lampOff: [
		16,
		16,
		Vp("#4a3016", "#4f3a1c", "#7a5a2a", .06)
	],
	lampOn: [
		16,
		16,
		Vp("#a8742a", "#e0a93a", "#ffe9a0", .05)
	],
	machOff: [
		16,
		16,
		Hp(!1)
	],
	machOn: [
		16,
		16,
		Hp(!0)
	],
	stoveOff: [
		16,
		16,
		Up(!1)
	],
	stoveOn: [
		16,
		16,
		Up(!0)
	],
	alarmOff: [
		16,
		16,
		Wp(!1)
	],
	alarmOn: [
		16,
		16,
		Wp(!0)
	],
	leverOff: [
		16,
		16,
		Gp(!1)
	],
	leverOn: [
		16,
		16,
		Gp(!0)
	],
	chandelierOff: [
		16,
		16,
		Kp("#7a5a2a")
	],
	chandelierOn: [
		16,
		16,
		Kp("#ffe9a0")
	],
	chest: [
		16,
		16,
		(e, t, n) => t < 2 ? null : X(e, t - 2, 16, 14) || t === 7 ? J(Fp, .6) : e > 6 && e < 9 && t > 5 && t < 10 ? "#e6c65a" : Y(Pp, n, .07)
	],
	frame: [
		48,
		32,
		(e, t, n) => e < 2 || e > 45 || t < 2 || t > 29 || t === 24 ? Y(Fp, n, .1) : t > 24 ? "#3a2a18" : "#16161a"
	],
	camera: [
		16,
		16,
		(e, t, n) => X(e, t) ? J(Ip, .55) : Math.hypot(e - 7.5, t - 7.5) < 2 ? "#7fa8f0" : Math.hypot(e - 7.5, t - 7.5) < 5 ? "#16161a" : Y("#b9bcc4", n, .05)
	],
	door: [
		16,
		32,
		(e, t, n) => e < 1 || e > 14 || t < 1 ? "#5e3d18" : (e > 2 && e < 7 || e > 8 && e < 13) && t > 3 && t < 10 ? "rgba(190,225,255,.6)" : e > 10 && e < 13 && t > 16 && t < 19 ? "#e6c65a" : t === 14 || t === 30 ? "#5e3d18" : Y("#9a6a34", n, .06)
	],
	doorOpen: [
		16,
		32,
		(e, t, n) => e < 3 ? Y("#9a6a34", n, .06) : null
	],
	dead: [
		16,
		16,
		(e, t, n) => Qp(e, t) || Qp(15 - e, t + 16) ? "#1c1c1c" : X(e, t) ? J(Ip, .45) : Y("#5a5a5a", n, .05)
	],
	crack: [
		16,
		32,
		(e, t) => Qp(e, t) ? "rgba(20,10,0,.85)" : null
	],
	ghost: [
		16,
		16,
		(e, t) => X(e, t) && (e + t) % 2 ? "rgba(255,255,255,.45)" : null
	],
	ember: [
		16,
		16,
		(e, t, n) => X(e, t) ? "#8a2c14" : n() < .3 ? "#ffe45c" : Y("#e8641e", n, .15)
	],
	rain: [
		16,
		16,
		(e, t, n) => n() < .04 ? "rgba(200,220,255,.85)" : null
	],
	snow: [
		16,
		16,
		(e, t, n) => n() < .03 ? "#fff" : null
	],
	heart: Jp(Yp, "#e02c3c"),
	heart0: Jp(Yp, "rgba(0,0,0,.5)"),
	bolt: Jp(Xp, "#ffd83a"),
	bolt0: Jp(Xp, "rgba(0,0,0,.5)"),
	imp: [
		16,
		16,
		(e, t) => t < 3 && (e === 4 || e === 11) || t === 1 && (e === 5 || e === 10) ? "#5a1420" : t > 2 && t < 9 && e > 3 && e < 12 ? t === 5 && (e === 6 || e === 9) ? "#ffe45c" : t === 7 && e > 5 && e < 10 ? "#2a0a10" : "#c8323c" : t > 8 && t < 14 && e > 4 && e < 11 ? "#a02630" : t > 13 && (e === 5 || e === 6 || e === 9 || e === 10) || t === 11 && e > 10 && e < 14 || e === 13 && t > 8 && t < 11 || t === 8 && e > 12 ? "#5a1420" : null
	],
	tnt: [
		16,
		16,
		(e, t) => t < 3 ? e === 8 && t > 0 || e === 9 && t === 0 ? "#2a2018" : null : t > 4 && t < 12 ? t > 5 && t < 11 && e > 1 && e < 14 && (e - 2) % 4 < 3 && Number("72222 65555 72222".split(" ")[e - 2 >> 2][t - 6]) & 4 >> (e - 2) % 4 ? "#2a2018" : "#f0e6c8" : e % 4 == 3 ? "#7a1418" : t === 3 || t === 15 ? "#a01c22" : e % 4 == 0 ? "#e85a50" : "#d0282e"
	],
	hole: [
		16,
		16,
		(e, t, n) => X(e, t) && n() < .5 ? null : n() < .12 ? "#3a3632" : "#16141a"
	],
	bot: [
		16,
		16,
		(e, t) => t === 0 && e > 2 && e < 13 ? "#b9bcc4" : t < 3 && (e === 7 || e === 8) ? "#5a5d66" : t > 2 && t < 11 && e > 3 && e < 12 ? t > 4 && t < 8 && e > 5 && e < 10 ? "#5ad8ff" : X(e - 4, t - 3, 8, 8) ? "#5a5d66" : "#9a9da6" : t > 10 && t < 15 && (e === 5 || e === 10) ? "#5a5d66" : t === 14 && e > 3 && e < 12 || t > 11 && e > 11 && e < 15 && e - t === 0 ? "#ffd83a" : null
	],
	sun: [
		32,
		32,
		(e, t) => zp(e, t, 15.5, 15.5) > 15.6 ? null : zp(e, t, 15.5, 15.5) > 12 ? "#ffd020" : "#ffe45c"
	],
	moon: [
		32,
		32,
		(e, t) => zp(e, t, 15.5, 15.5) > 15.6 ? null : zp(e, t, 11, 12) > 16 ? "#b9c3da" : [
			[
				10,
				10,
				3
			],
			[
				21,
				17,
				3.5
			],
			[
				13,
				23,
				2.2
			]
		].some(([n, r, i]) => zp(e, t, n, r) < i) ? "#cbd3e6" : "#e3e9f6"
	],
	skySun: [
		16,
		16,
		(e, t) => Math.hypot(e - 7.5, t - 7.5) < 4.5 ? "#ffe45c" : (e === 7 || e === 8 || t === 7 || t === 8) && Math.hypot(e - 7.5, t - 7.5) > 6 ? "#ffd020" : null
	],
	skyCloud: [
		16,
		16,
		Zp("#f2f4f8")
	],
	skyRain: [
		16,
		16,
		(e, t) => Zp("#aab4c4")(e, t, Math.random) ?? (t > 10 && t < 15 && (e + t) % 4 == 0 && e > 2 && e < 14 ? "#7fa8f0" : null)
	],
	skySnow: [
		16,
		16,
		(e, t) => Zp("#d8dee8")(e, t, Math.random) ?? (t > 10 && t < 15 && t % 2 == 1 && (e + t) % 4 == 0 && e > 2 && e < 14 ? "#fff" : null)
	]
}, em = [
	"#5a2d1a",
	"#c9c2b4",
	"#2a2018",
	"#d8a43a",
	"#8a3a1c"
], tm = [
	"#e0913a",
	"#7a4fa8",
	"#3a6fd8",
	"#b8323a",
	"#3f7d2c",
	"#2a9d8f"
], nm = [
	"#3f6d4c",
	"#4a5a78",
	"#5a4632",
	"#33343c"
], rm = /* @__PURE__ */ new Map(), im = /* @__PURE__ */ new Map();
function am(e, t, n, r) {
	let i = Object.assign(document.createElement("canvas"), {
		width: t,
		height: n
	}), a = i.getContext("2d"), o = ou(B(e));
	for (let e = 0; e < n; e++) for (let n = 0; n < t; n++) {
		let t = r(n, e, o);
		t && (a.fillStyle = t, a.fillRect(n, e, 1, 1));
	}
	return rm.set(e, i), i;
}
var om = (e) => rm.get(e) ?? am(e, ...$p[e]), sm = (e, t) => {
	let n = im.get(e);
	return n || im.set(e, n = t().toDataURL()), n;
}, Z = (e) => `url(${sm(e, () => om(e))})`;
function cm(e) {
	let t = B(e);
	return `url(${sm(`who:${e}`, () => am(`who:${e}`, 16, 32, qp(em[t % em.length], tm[(t >> 3) % tm.length], nm[(t >> 6) % nm.length])))})`;
}
var lm = {
	A: "25755",
	B: "65656",
	C: "34443",
	D: "65556",
	E: "74647",
	F: "74644",
	G: "34553",
	H: "55755",
	I: "72227",
	J: "11152",
	K: "55655",
	L: "44447",
	M: "57755",
	N: "65555",
	O: "25552",
	P: "65644",
	Q: "25573",
	R: "65655",
	S: "34216",
	T: "72222",
	U: "55557",
	V: "55552",
	W: "55775",
	X: "55255",
	Y: "55222",
	Z: "71247",
	0: "75557",
	1: "26227",
	2: "61247",
	3: "61216",
	4: "55711",
	5: "74616",
	6: "34757",
	7: "71222",
	8: "75757",
	9: "75716",
	".": "00002",
	":": "02020",
	"%": "51245",
	"°": "25200",
	"-": "00700",
	",": "00024",
	"'": "22000",
	"!": "22202",
	"?": "61202",
	"/": "11244",
	"+": "02720",
	"(": "12221",
	")": "42224",
	"²": "61300"
}, um = 600;
function dm(e) {
	let t = e.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
	if (im.size > um) for (let e of [...im.keys()].filter((e) => e.startsWith("txt:"))) im.delete(e);
	return {
		src: sm(`txt:${t}`, () => {
			let e = Object.assign(document.createElement("canvas"), {
				width: Math.max(1, t.length * 4),
				height: 6
			}), n = e.getContext("2d");
			for (let [e, r] of [[1, "rgba(0,0,0,.7)"], [0, "#fff"]]) n.fillStyle = r, [...t].forEach((t, r) => [...lm[t] ?? "00000"].forEach((t, i) => {
				for (let a = 0; a < 3; a++) Number(t) & 4 >> a && n.fillRect(r * 4 + a + e, i + e, 1, 1);
			}));
			return e;
		}),
		w: t.length * 4,
		h: 6
	};
}
var Q = (e, t = 1) => j`<img src=${dm(e).src} alt=${e} style="--k:${t}" />`, fm = "alarm_control_panel", pm = (e, t) => Ct.has(e.kind) ? `${t}°` : `${Math.round(t)}%`;
function mm(e) {
	if (e.away) return "not answering";
	if (e.kind === "camera") return "camera";
	let t = e.phase ?? Tr[e.kind]?.[+!e.on] ?? (e.kind === "alarm_control_panel" ? e.on ? "set" : "unset" : e.on ? "on" : "off"), n = e.on && e.level !== void 0 ? ` ${pm(e, e.level)}` : "", r = e.title ?? (e.temp === void 0 ? "" : `now ${e.temp}°`);
	return `${t}${n}${r ? `, ${r}` : ""}`;
}
var hm = (e, t) => j`<div class="chest" @click=${(e) => e.target === e.currentTarget && t.shut()}>
  <div class="inv" role="dialog" aria-label="${e.name}: everything in it">
    <div class="head">${Q(e.name)}<button class="box" aria-label="Shut" @click=${t.shut}>${Q("x")}</button></div>
    ${e.scenes.length ? j`<div class="scenes">${e.scenes.map((e) => j`<button class="box" aria-label="Scene: ${e.full}" @click=${() => t.throw(e)}>${Q(e.name)}</button>`)}</div>` : N}
    <div class="cells">${e.devices.map((e) => j`<div class="cell">${t.block(e)}<span>${Q(e.name)}${Q(mm(e))}</span></div>`)}</div>
  </div>
</div>`, gm = "dash-bored-contraption", _m = "dash-bored-contraption-skin", vm = /kitchen/i, [ym, bm] = [140, 520], xm = 2, Sm = 2, Cm = () => matchMedia("(prefers-reduced-motion: reduce)").matches ? 8 : 2.6, wm = /* @__PURE__ */ new Set([
	"hs",
	"rgb",
	"rgbw",
	"rgbww",
	"xy"
]), Tm = (e) => [e.temp === void 0 ? "" : `${e.temp}° within${e.target === void 0 ? "" : ` (${e.target}° wanted)`}`, e.humidity === void 0 ? "" : `the air ${e.humidity}% damp`].filter(Boolean).join(", "), Em = class extends Ln {
	constructor(...e) {
		super(...e), this._skin = Xf[0].id, this._size = 0, this._tile = ym, this._rate = "", this._devs = /* @__PURE__ */ new Map(), this._baked = "", this._dirty = !1, this._raf = 0, this._last = 0, this._frames = 0, this._stopped = (e) => {
			console.error("Dash-Bored: Contraption has stopped", e), Object.assign(this, {
				_machine: void 0,
				_way: void 0
			}), this._fault = `Contraption has stopped (${e?.message ?? e}).`;
		}, this._count = () => {
			this._after(1e3, this._count);
			let e = this._machine;
			this._rate = e?.ready ? `${e.cells.length} tiles, ${e.seen} in view, ${this._frames} frames a second, ${e.made.pages} ${e.made.pages === 1 ? "page" : "pages"} of bitmaps` : "", this._frames = 0;
		}, this._look = () => {
			let e = this._machine, t = this.renderRoot?.querySelector(".scroll"), n = this._pen;
			if (!e || !t || !n) return;
			let r = t.getBoundingClientRect(), i = 260 / this._tile;
			n.ox = t.scrollLeft * (n.k / (this._tile / 260)), e.look(t.scrollLeft * i, (t.scrollLeft + t.clientWidth) * i, -r.top * i, (window.innerHeight - r.top) * i);
		}, this._frame = (e) => {
			this._raf = requestAnimationFrame(this._frame);
			let t = e / 1e3, n = Math.min(.05, t - this._last), r = this._machine;
			if (this._last = t, r?.ready && this._pen) try {
				r.frame(this._pen, n, t, !!this._lost), this._frames++;
			} catch (e) {
				this._stopped(e);
			}
		};
	}
	static {
		this.styles = [Nn, Np];
	}
	static {
		this.properties = {
			_skin: { state: !0 },
			_size: { state: !0 },
			_tile: { state: !0 },
			_rate: { state: !0 },
			_room: { state: !0 }
		};
	}
	setConfig(e) {
		super.setConfig(e), this._wear();
	}
	_wear() {
		let e = this._config.style;
		try {
			e ??= localStorage.getItem(_m) ?? void 0;
		} catch {}
		this._dress(Xf.find((t) => t.id === e)?.id ?? Xf[0].id, !1);
	}
	_dress(e, t = !0) {
		if (this._skin = e, this._dirty = !0, t) try {
			localStorage.setItem(_m, e);
		} catch {}
	}
	connectedCallback() {
		super.connectedCallback(), this._wear(), window.addEventListener("scroll", this._look, {
			passive: !0,
			capture: !0
		}), this._raf = requestAnimationFrame(this._frame), this._alone || this._after(1e3, this._count);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), window.removeEventListener("scroll", this._look, { capture: !0 }), cancelAnimationFrame(this._raf);
	}
	_resized() {
		this._dirty = !0, this.requestUpdate();
	}
	_pick() {
		let e = this._house.rooms.filter((e) => e.devices.length);
		return (this._config.rooms?.length ? void 0 : e.find((e) => vm.test(e.name))) ?? e[0];
	}
	_view(e, t) {
		let n = this._hass.states[e.id]?.attributes ?? {}, r = n.rgb_color, i = e.kind === "light" && wm.has(n.color_mode) && Array.isArray(r) ? `rgb(${r.map(Number).join()})` : void 0;
		return {
			id: e.id,
			name: e.name,
			kind: e.kind,
			on: e.on && !e.away,
			level: e.level ?? 100,
			dims: e.dims,
			colour: i,
			group: t
		};
	}
	_surveyed() {
		let e = this._pick();
		if (this._room = e, this._built === this._survey) return this._told();
		if (this._built = this._survey, Object.assign(this, {
			_machine: void 0,
			_way: void 0,
			_pen: void 0,
			_baked: ""
		}), !e) return;
		let t = this._hass.states, n = /* @__PURE__ */ new Map(), r = new Set(e.devices.map((e) => e.id));
		for (let i of e.devices) {
			let e = i.kind === "light" ? t[i.id]?.attributes.entity_id : void 0, a = Array.isArray(e) ? e.filter((e) => r.has(e) && !n.has(e)) : [];
			if (a.length > 1) for (let e of a) n.set(e, i.name);
		}
		let i = new Set(n.values()), a = (t, r) => n.has(t.id) ? e.devices.findIndex((e) => n.get(e.id) === n.get(t.id)) : r, o = e.devices.map((e, t) => ({
			d: e,
			at: a(e, t)
		})).filter(({ d: e }) => !(i.has(e.name) && Array.isArray(t[e.id]?.attributes.entity_id))).sort((e, t) => e.at - t.at);
		this._devs = new Map(o.map(({ d: e }) => [e.id, this._view(e, n.get(e.id))]));
		try {
			this._way = Rf(e.id, [...this._devs.values()]);
		} catch (e) {
			this._stopped(e);
		}
	}
	_told(e = !1) {
		let t = this._machine, n = this._room;
		if (t && n) {
			for (let r of n.devices) {
				let n = this._devs.get(r.id);
				n && (Object.assign(n, this._view(r, n.group)), t.caption(r.id, r.away ? "" : mm(r)), t.glow(r.id, n.colour), e && r.away && t.answers(r.id, F(r.since), !0));
			}
			t.note(Tm(n));
		}
	}
	_moved(e) {
		this._machine?.answers(e.id, e.away ? F(e.since) : "");
	}
	_press(e) {
		if (e.away) return this._machine?.shake(e.id);
		if (e.guarded || e.kind === "camera" || e.kind === "alarm_control_panel") return s(this, "hass-more-info", { entityId: e.id });
		this._call(Zt(e), `${e.room} ${e.name}`);
	}
	_fit() {
		let e = this._machine, t = this.renderRoot.querySelector(".scroll"), n = this.renderRoot.querySelector("canvas");
		if (!e || !t || !n || !t.clientWidth) return;
		this._dirty = !1;
		let r = Xf.find((e) => e.id === this._skin), i = Math.min(devicePixelRatio, xm);
		this._tile = this._size || Math.max(ym, Math.min(260, Math.floor(t.clientWidth * 260 / e.wide)));
		let a = this._tile / 260, o = Math.min(t.clientWidth, Math.ceil(e.wide * a)), s = Math.ceil(e.high * a);
		Object.assign(n, {
			width: Math.round(o * i),
			height: Math.round(s * i)
		}), Object.assign(n.style, {
			width: `${o}px`,
			height: `${s}px`
		}), this._pen = {
			g: n.getContext("2d"),
			k: a * i,
			ox: 0,
			line: r.line,
			w: r.w
		};
		let c = Math.min(a * i, Sm), l = `${c}|${r.id}`;
		l !== this._baked && (this._baked = l, e.bake(c, r)), this._look();
	}
	updated() {
		let e = this.renderRoot.querySelector(".bench");
		if (this._way && !this._machine && e && this._room) {
			try {
				this._machine = new Mp(e, this._way, this._devs, `The ${this._room.name}, by duck`, Cm(), this._stopped);
			} catch (e) {
				return this._stopped(e);
			}
			this._told(!0), this._dirty = !0, this.requestUpdate();
			return;
		}
		this._dirty && this._fit();
	}
	render() {
		if (!this._house) return N;
		let e = this._room, t = this._machine, n = Xf.find((e) => e.id === this._skin), r = new Map(e?.devices.map((e) => [e.id, e])), i = [
			this._lost ? `No word from the house since ${F(this._lost)}. The ducks are asleep, and nothing shown here is current.` : "",
			this._fault,
			e ? "" : this._alone ? this._vacant : "There is no room with a device in it to make a machine of."
		].filter(Boolean);
		return j`<div class="contraption ${this._lost ? "stale" : ""}" data-skin=${n.id} style=${Zf(n)}>
      <header>
        <h1>${e ? `The ${e.name}, by duck` : "Contraption"}</h1>
        ${this._alone ? N : j`<p>The ducks go through every device in turn and are its engine. Tap a device to throw its clutch.</p>
              <label class="size">Tile size <input type="range" min="100" max=${bm} step="10" .value=${String(this._tile)} @change=${(e) => {
			this._size = Number(e.target.value), this._dirty = !0;
		}} /> <output>${this._size ? `${this._size} px` : "to fit"}</output></label>
              <output class="rate">${this._rate}</output>`}
        ${this._config.style || this._sample || this._alone ? N : j`<div class="skins">${Xf.map((e) => j`<button aria-pressed=${e.id === n.id} @click=${() => this._dress(e.id)}>${e.name}</button>`)}</div>`}
        ${this.hasAttribute("panel") ? j`<button class="lever" aria-label="Choose another style of Dash-Bored" @click=${() => s(this, lr)}><svg viewBox="0 0 30 26" aria-hidden="true"><path d="M3,23 h24 M8,23 a7,7 0 0 1 14,0 M15,18 L23,5" /><circle cx="24" cy="4" r="3" /></svg>Change machine</button>` : N}
      </header>
      ${i.map((e) => j`<p class="notice" role="status">${e}</p>`)}
      <div class="scroll" @scroll=${this._look}>
        ${t ? j`<div class="sheet" style="--t:${this._tile}px;width:${t.wide * this._tile / 260}px;height:${t.high * this._tile / 260}px">
              <canvas></canvas>
              ${t.cells.map((e) => {
			let t = e.d && r.get(e.d.id);
			return t ? j`<button class="hit" style="left:${e.x * this._tile / 260}px;top:${e.y * this._tile / 260}px" aria-pressed=${t.on} aria-label="${t.name}: ${mm(t)}" @click=${() => this._press(t)}></button>` : N;
		})}
            </div>` : N}
      </div>
      <svg class="bench ink" aria-hidden="true"></svg>
    </div>`;
	}
}, Dm = 2e4, [Om, km] = [18e4, 36e4], [Am, jm, Mm, Nm, Pm] = [
	1200,
	4200,
	5e3,
	7e3,
	800
], Fm = 3, Im = [
	"#b98a4e",
	"#868686",
	"#7a5536",
	"#9a3b2e",
	"#ffd83a",
	"#26262a",
	"#b98a4e",
	"#868686"
];
function Lm(e, t, n, r) {
	let i = /* @__PURE__ */ new Set(), a = (e, t) => i.add(`${e},${t}`);
	for (let { x: t, y: n, h: r, w: i = 1 } of e.slots.values()) for (let e = 0; e < r; e++) for (let r = 0; r < i; r++) a(t + r, n + e);
	for (let [, t, n] of e.deco) a(t, n);
	for (let { x: t, y: n } of [
		e.sign,
		{
			...e.sign,
			x: e.sign.x + 1
		},
		...[
			0,
			1,
			2
		].map((t) => ({
			...e.notice,
			x: e.notice.x + t
		})),
		...e.signs
	]) a(t, n);
	let o = Array.from({ length: e.w }, (e, t) => t).filter((t) => !e.blocks[e.ground - 1][t]), s = [...e.zones.flatMap((e) => Array.from({ length: e.x1 - e.x0 + 1 }, (t, n) => ({
		x: e.x0 + n,
		y: e.y1,
		min: e.x0,
		max: e.x1
	}))), ...o.map((t) => ({
		x: t,
		y: e.ground - 1,
		min: Math.min(...o),
		max: Math.max(...o)
	}))].filter((e) => !i.has(`${e.x},${e.y}`)), c = s.filter((e) => e.x >= t && e.x <= n), l = c.length ? c : s;
	if (!l.length) return;
	let u = l[Math.floor(r() * l.length)], d = r() < .5 ? -3 : Fm, f = (e) => Math.max(u.min, Math.min(u.max, u.x + e)), p = {
		x: f(d) === u.x ? f(-d) : f(d),
		y: u.y
	}, m = [
		-1,
		0,
		1
	].flatMap((e) => [
		-2,
		-1,
		0,
		1,
		2
	].map((t) => ({
		x: u.x + t,
		y: u.y + e
	}))).filter((e) => Math.abs(e.x - u.x) < 2 || e.y === u.y + 1 && r() < .5).filter((t) => e.blocks[t.y]?.[t.x] && !i.has(`${t.x},${t.y}`));
	return {
		tnt: {
			x: u.x,
			y: u.y
		},
		imp: p,
		holes: m
	};
}
var Rm = (e, t = "") => `--x:${e.x};--y:${e.y};${t}`, zm = class {
	constructor(e) {
		this._stage = 0, this._mended = 0, this._begin = () => {
			let e = this._host.world(), t = e && !this._host.still() ? Lm(e, ...this._host.seen(), Math.random) : void 0, n = Nm + Pm * ((t?.holes.length ?? 0) + 2);
			if (this._host.after((t ? n : 0) + Om + Math.random() * (km - Om), this._begin), t) {
				this._plan = t, this._set(1, 0);
				for (let [e, t] of [
					[Am, 2],
					[jm, 3],
					[Mm, 4],
					[Nm, 5]
				]) this._host.after(e, () => this._set(t));
				t.holes.forEach((e, t) => this._host.after(Nm + Pm * (t + 1), () => this._set(5, t + 1))), this._host.after(n, () => {
					this._plan = void 0, this._set(0, 0);
				});
			}
		}, this._host = e;
	}
	start() {
		this._plan = void 0, this._stage = this._mended = 0, this._host.after(Dm, this._begin);
	}
	get shaking() {
		return this._stage === 3;
	}
	_set(e, t = this._mended) {
		this._stage = e, this._mended = t, this._host.requestUpdate();
	}
	draw() {
		let e = this._plan, t = this._stage;
		if (!e || !t) return N;
		let n = e.holes.slice(this._mended), r = n[0] ? {
			x: n[0].x,
			y: n[0].y - 1
		} : {
			x: e.tnt.x,
			y: -3
		};
		return j`<div class="prank" aria-hidden="true">
      ${t >= 3 ? n.map((e) => j`<i class="at hole" style="${Rm(e)}background-image:${Z("hole")}"></i>`) : N}
      ${t < 3 ? j`<i class="at tnt ${t === 2 ? "lit" : ""}" style="${Rm(t === 1 ? {
			x: e.tnt.x,
			y: e.tnt.y - 1
		} : e.tnt)}background-image:${Z("tnt")}"></i>` : N}
      ${t < 5 ? j`<i class="at imp ${t > 2 ? "laugh" : ""}" style="${Rm(t === 1 ? e.tnt : e.imp)}background-image:${Z("imp")}"></i>` : N}
      ${t === 3 ? j`<i class="at bang" style=${Rm(e.tnt)}>${Im.map((e, t) => j`<b style="--a:${t * 45 + 20}deg;background:${e}"></b>`)}</i>` : N}
      ${t === 5 ? j`<i class="at bot" style="${Rm(r)}background-image:${Z("bot")}"></i>` : N}
    </div>`;
	}
}, Bm = [44, 22], Vm = 8;
function Hm(e) {
	for (let t of e.querySelectorAll(".shot")) {
		let e = t.dataset.src ?? "";
		if (t.shown === e) continue;
		t.shown = e;
		let n = t.getContext("2d"), r = (e, r = 0, i = 0, a = t.width, o = t.height) => {
			n.clearRect(0, 0, t.width, t.height), n.drawImage(om(e), r, i, a, o);
		};
		if (!e) {
			r("camera", 14, 3, 16, 16);
			continue;
		}
		let i = new Image();
		i.onload = () => {
			if (t.shown !== e) return;
			let r = Math.max(t.width / i.naturalWidth, t.height / i.naturalHeight), [a, o] = [t.width / r, t.height / r], s = Object.assign(document.createElement("canvas"), {
				width: t.width * Vm,
				height: t.height * Vm
			}), c = s.getContext("2d");
			c.drawImage(i, (i.naturalWidth - a) / 2, (i.naturalHeight - o) / 2, a, o, 0, 0, s.width, s.height);
			for (let e = Vm; e > 1; e /= 2) c.drawImage(s, 0, 0, t.width * e, t.height * e, 0, 0, t.width * e / 2, t.height * e / 2);
			n.clearRect(0, 0, t.width, t.height), n.drawImage(s, 0, 0, t.width, t.height, 0, 0, t.width, t.height);
		}, i.onerror = () => {
			t.shown === e && (r("dead"), console.warn(`Dash-Bored: a camera's picture could not be fetched (${e.split("?")[0]})`));
		}, i.src = e;
	}
}
//#endregion
//#region src/dash-bored/digs/styles.ts
var Um = C`
  .digs { position: relative; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; background: var(--sky); transition: background 1s;
    container-type: inline-size; font-size: 0; user-select: none; -webkit-user-select: none; --t: calc(var(--b) / 16); }
  canvas, button, i, img, .who, .fall, .board, .icon, .orb { image-rendering: pixelated; }
  button { border: 0; padding: 0; margin: 0; background: transparent 0 0 / 100% 100% no-repeat; cursor: pointer; }
  button:hover, button:focus-visible { outline: 3px solid #fff; outline-offset: -3px; }
  img { display: block; height: calc(var(--t) * 6 * var(--k, 1)); width: auto; flex: none; }

  /* The sky is behind the world and stays put when the world is walked along. */
  .sky, .hud { position: absolute; inset: 0; pointer-events: none; }
  .orb { position: absolute; width: calc(var(--b) * 2); height: calc(var(--b) * 2); background: 0 0 / 100% 100% no-repeat; transition: left 1s, top 1s; }
  .cloud { position: absolute; left: calc(var(--b) * -5); width: calc(var(--b) * 3); height: var(--b); background: #fff; opacity: .9;
    box-shadow: var(--b) calc(var(--b) / -2) 0 0 #fff; animation: drift 140s linear infinite; }
  @keyframes drift { to { translate: calc(100vw + var(--b) * 6); } }
  .fall { position: absolute; inset: 0; background-size: var(--b) calc(var(--b) * 2); animation: fall .5s linear infinite; }
  .fall.snow { background-size: var(--b) var(--b); animation-duration: 5s; }
  @keyframes fall { to { background-position: 0 calc(var(--b) * 2); } }

  /* A house wider than the screen is walked along sideways. */
  .scroll { position: relative; overflow-x: auto; overflow-y: hidden; }
  .stage { position: relative; margin: 0 auto; width: calc(var(--b) * var(--w)); height: calc(var(--b) * var(--h)); }
  .stage > canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
  /* A room's card (room.ts): the world cut down to the one room (--rx, --ry, --rw and --rh,
     in blocks: _cut in digs.ts). It has no map, and its level's stack is as tall as the
     card, down its right edge, with the tip and the scenes clear of it. */
  .cut { overflow: hidden; margin: 0 auto; width: calc(var(--b) * var(--rw)); height: calc(var(--b) * var(--rh)); }
  .cut .stage { margin: calc(var(--b) * var(--ry) * -1) 0 0 calc(var(--b) * var(--rx) * -1); }
  .alone .map { display: none; }
  .alone .levels { top: 0; bottom: 0; }
  .alone .levels button { flex: 1; height: auto; }
  .alone .tips { right: var(--b); }
  .alone .hot { left: 0; right: var(--b); translate: none; justify-content: safe center; }
  .dark { pointer-events: none; }
  .at { position: absolute; left: calc(var(--b) * var(--x)); top: calc(var(--b) * var(--y)); width: calc(var(--b) * var(--cw, 1)); height: calc(var(--b) * var(--ch, 1)); }
  .dev { overflow: hidden; }
  .blind { position: absolute; left: 0; top: 0; width: 100%; background-size: var(--b) var(--b); transition: height .4s steps(8); }
  /* A camera's picture: what it last saw, a texel to a texel, over its name. */
  .shot { position: absolute; left: calc(var(--t) * 2); top: calc(var(--t) * 2); width: calc(var(--t) * 44); height: calc(var(--t) * 22); }
  .painting img { position: absolute; left: calc(var(--t) * 3); bottom: calc(var(--t) * 1.5); }
  /* A guarded block cracks at the first hit and gives way at the second. */
  .cracked::after { content: ""; position: absolute; inset: 0; background: var(--crack) 0 0 / 100% 100%; }
  .sounding { animation: sound .5s steps(2) infinite; }
  @keyframes sound { 50% { filter: brightness(2); } }
  .label, .board { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: var(--t); overflow: hidden; }
  .icon, .who, .label:disabled { pointer-events: none; }
  .board, .icon, .who { background: 0 0 / 100% 100% no-repeat; }
  .who { transition: left .5s steps(4); }
  /* The block that is chosen: a white edge, and its name over it, in the light whatever the hour. */
  .tag, .label.sel { outline: 3px solid #fff; outline-offset: -3px; }
  .tag { pointer-events: none; }
  .tag img { position: absolute; bottom: 100%; left: 50%; translate: -50% calc(var(--t) * -1); background: rgba(0,0,0,.6); padding: var(--t); }
  .who img { position: absolute; bottom: 100%; left: 50%; translate: -50% calc(var(--t) * -1); }

  /* The prank: a show in the world that takes no press. The imp runs, its crate's fuse blinks, the bits fly, the bot comes down. */
  .prank, .prank i { pointer-events: none; }
  .prank i { background: 0 0 / 100% 100% no-repeat; image-rendering: pixelated; }
  .imp { transition: left .8s steps(6); animation: arrive .3s steps(3); }
  .imp.laugh { animation: hop .35s steps(2) infinite; }
  .tnt { transition: top .3s steps(3); }
  .tnt.lit { animation: fuse .3s steps(2) infinite; }
  .bot { transition: left .6s, top .6s; animation: arrive .6s; }
  .bang b { position: absolute; left: 40%; top: 40%; width: calc(var(--t) * 3); height: calc(var(--t) * 3); animation: fly .8s ease-out forwards; }
  .bang { background: radial-gradient(circle, #fff 0 30%, #ffd83a 45%, transparent 70%); animation: burst .5s steps(4) forwards; }
  .shake { animation: shake .4s steps(4); }
  @keyframes arrive { from { translate: 0 calc(var(--b) * -3); opacity: 0; } }
  @keyframes hop { 50% { translate: 0 calc(var(--t) * -4); } }
  @keyframes fuse { 50% { filter: brightness(1.8); } }
  @keyframes burst { from { scale: 1; } 60% { scale: 4; opacity: 1; } to { scale: 4.5; opacity: 0; } }
  @keyframes fly { to { transform: rotate(var(--a)) translateX(calc(var(--b) * 1)) rotate(180deg); opacity: 0; } }
  @keyframes shake { 25% { translate: calc(var(--t) * 2) calc(var(--t) * -1); } 50% { translate: calc(var(--t) * -2) var(--t); } 75% { translate: var(--t) 0; } }
  /* The bars, the clock, the tip and the scenes, over the world and still while it is walked along. */
  .hud > * { position: absolute; }
  .bar { display: flex; gap: var(--t); align-items: center; top: calc(var(--t) * 4); pointer-events: auto; }
  .bar i { width: calc(var(--t) * 7); height: calc(var(--t) * 6); background: 0 0 / 100% 100% no-repeat; }
  .bar.power { right: calc(var(--t) * 4); pointer-events: none; }
  .bar.power i { width: calc(var(--t) * 4); }
  .hearts { left: calc(var(--t) * 4); }
  .row { display: flex; gap: calc(var(--t) * 2); left: 50%; translate: -50%; max-width: 100%; }
  .top { top: calc(var(--t) * 2); }
  .hot { bottom: calc(var(--t) * 3); overflow-x: auto; pointer-events: auto; box-sizing: border-box; padding: 0 calc(var(--t) * 2); }
  .box { display: flex; align-items: center; justify-content: center; flex: none; height: var(--b); padding: 0 calc(var(--t) * 5); background: rgba(0,0,0,.55); box-shadow: inset 0 0 0 var(--t) #8b8b8b; }
  button.box.sel { box-shadow: inset 0 0 0 var(--t) #fff; }
  .tips { bottom: calc(var(--b) + var(--t) * 7); left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: var(--t); }
  .tip img { max-width: 100%; object-fit: contain; }
  .tip { display: flex; align-items: center; max-width: 100%; overflow: hidden; box-sizing: border-box; height: calc(var(--t) * 10); padding: 0 calc(var(--t) * 3); background: rgba(0,0,0,.55); }
  /* A fault is said in plain type, so that however long it is it wraps and can be read. */
  .fault { max-width: 90%; padding: 6px 10px; background: #8a1c1c; color: #fff; font: 14px/1.3 ui-monospace, monospace; overflow-wrap: anywhere; }
  /* The map: the whole world in small, with a frame round what is on the screen. Over the scenes, clear of the top storey's names. */
  .map { position: relative; max-width: 96%; pointer-events: auto; box-shadow: 0 0 0 var(--t) rgba(0,0,0,.55); background-color: var(--sky); }
  .map canvas { display: block; width: calc(var(--w) * 3px); max-width: 100%; }
  .map i { position: absolute; top: 0; bottom: 0; left: var(--from); width: var(--seen); box-shadow: inset 0 0 0 1px #fff; pointer-events: none; }
  /* A room's list: everything in it, by name. */
  .chest { inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: auto; background: rgba(0,0,0,.45); }
  .inv { box-sizing: border-box; width: min(92%, calc(var(--b) * 24)); max-height: 82%; overflow-y: auto; display: flex; flex-direction: column; gap: calc(var(--t) * 3); padding: calc(var(--t) * 4);
    background: rgba(24,24,30,.94); box-shadow: inset 0 0 0 var(--t) #8b8b8b; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: calc(var(--t) * 4); }
  .scenes { display: flex; flex-wrap: wrap; gap: calc(var(--t) * 2); }
  .cells { display: grid; grid-template-columns: repeat(auto-fill, minmax(calc(var(--b) * 7), 1fr)); gap: calc(var(--t) * 3); }
  .cell { display: flex; align-items: center; gap: calc(var(--t) * 2); min-width: 0; }
  .cell .dev { position: relative; flex: none; width: var(--b); height: var(--b); }
  .cell span { display: flex; flex-direction: column; align-items: flex-start; gap: var(--t); min-width: 0; overflow: hidden; }
  .levels { right: 0; bottom: calc(var(--b) * 3); display: flex; flex-direction: column-reverse; pointer-events: auto; background: rgba(0,0,0,.35); }
  .levels button { width: var(--b); height: var(--b); }
  /* Too narrow for the hearts, the clock and the power side by side: one under another. */
  @container (max-width: 760px) {
    .bar.power { right: auto; left: calc(var(--t) * 4); top: calc(var(--t) * 13); }
    .top { top: calc(var(--t) * 22); left: calc(var(--t) * 4); translate: none; }
  }
  @media (prefers-reduced-motion: reduce) { .cloud, .fall, .sounding { animation: none; } .who, .blind { transition: none; } }
`, Wm = "dash-bored-digs", Gm = 3e3, Km = 8e3, qm = "room:", Jm = 6e4, Ym = 5e3, Xm = 10, Zm = .3, Qm = 10, $m = .75, eh = 32, [th, nh] = [16, 64], rh = 48, ih = 2, ah = {
	light: ["lampOn", "lampOff"],
	lock: ["door", "doorOpen"],
	cover: ["doorOpen", "door"],
	climate: ["stoveOn", "stoveOff"],
	water_heater: ["stoveOn", "stoveOff"],
	camera: ["camera", "camera"],
	[fm]: ["alarmOn", "alarmOff"]
}, oh = {
	light: "lampOn",
	cover: "slat"
}, sh = {
	rainy: "rain",
	pouring: "rain",
	"lightning-rainy": "rain",
	hail: "rain",
	snowy: "snow",
	"snowy-rainy": "snow"
}, ch = /* @__PURE__ */ new Set([
	"sunny",
	"clear-night",
	"partlycloudy",
	"windy"
]), lh = (e) => sh[e] ?? (ch.has(e) && e !== "partlycloudy" ? "clear" : "cloud"), uh = {
	rain: "skyRain",
	snow: "skySnow",
	clear: "skySun",
	cloud: "skyCloud"
}, dh = (e) => !!e?.outside && !ch.has(e.outside.sky), [fh, ph, mh] = [
	[
		10,
		15,
		44
	],
	[
		127,
		178,
		255
	],
	[
		125,
		135,
		148
	]
], hh = (e, t, n) => e.map((e, r) => Math.round(e + (t[r] - e) * n)), gh = (e, t, n) => Math.max(t, Math.min(n, e)), _h = (e, t) => `${e} ${t}${e === 1 ? "" : "s"}`, vh = (e, t, n = 1, r = 1) => `--x:${e};--y:${t};--cw:${n};--ch:${r}`, yh = class extends Ln {
	constructor(...e) {
		super(...e), this._alerts = [], this._sel = "", this._armed = "", this._hurt = -1, this._told = "", this._open = "", this._now = Date.now(), this._b = eh, this._walk = /* @__PURE__ */ new Map(), this._day = 1, this._prank = new zm({
			after: (e, t) => void this._after(e, t),
			requestUpdate: () => this.requestUpdate(),
			world: () => this._world,
			seen: () => {
				let e = this.renderRoot.querySelector(".scroll");
				return e ? [Math.ceil(e.scrollLeft / this._b), Math.floor((e.scrollLeft + e.clientWidth) / this._b) - 1] : [0, 0];
			},
			still: () => this._sample || this._alone || !!this._open || matchMedia("(prefers-reduced-motion: reduce)").matches
		}), this._tick = () => {
			this._now = Date.now(), this._after(Jm - this._now % Jm + 50, this._tick);
		}, this._fit = () => {
			let e = this._cut, t = e && this.clientWidth ? gh(Math.floor(this.clientWidth / (e.w + 1) / 8) * 8, th, rh) : this.hasAttribute("panel") && this._world ? gh(Math.floor(h(this) / this._world.h / 8) * 8, th, nh) : eh;
			t !== this._b && (this._b = t), this._framed();
		}, this._stroll = () => {
			this._after(Ym, this._stroll);
			let e = this._world && this._house ? this._lived(this._world) : [];
			!e.length || this._sample || matchMedia("(prefers-reduced-motion: reduce)").matches || (this._walk = new Map(this._house.people.filter((e) => e.place === "home").map((t) => {
				let { zone: n, x: r } = this._stands(t, e);
				return [t.id, {
					room: n.id,
					x: gh(r + Math.floor(Math.random() * 3) - 1, n.x0, n.x1)
				}];
			})));
		}, this._block = (e, t) => {
			let n = e.kind === "cover" && !e.guarded, r = e.kind === "switch" && this._hass.states[e.id]?.attributes.device_class === "outlet", i = e.kind === "switch" && !r ? ["leverOn", "leverOff"] : ah[e.kind] ?? ["machOn", "machOff"], a = e.away ? "dead" : n ? "glass" : i[e.on || e.phase === "triggered" ? 0 : 1], o = this._armed === e.id;
			return t?.w && !e.away ? j`<button class="at dev painting" style="${vh(t.x, t.y, t.w, t.h)};background-image:${Z("frame")}" aria-label="${e.room} ${e.name}: camera. Open" @click=${() => this._press(e, !t)}>
        <canvas class="shot" width=${Bm[0]} height=${Bm[1]} data-src=${e.picture ?? ""}></canvas>${Q(e.name)}
      </button>` : j`<button class="${t ? "at" : ""} dev ${o ? "cracked" : ""} ${e.phase === "triggered" ? "sounding" : ""}" style="${t ? `${vh(t.x, t.y, t.w, t.h)};` : ""}background-image:${Z(a)}"
      aria-pressed=${e.on} aria-label="${e.room} ${e.name}: ${mm(e)}${o ? `. Hit again to ${Er[e.kind]}` : ""}" @click=${() => this._press(e, !t)}>
      ${n && !e.away ? j`<span class="blind" style="height:${e.on ? 100 - (e.level ?? 100) : 100}%;background-image:${Z("slat")}"></span>` : N}
    </button>`;
		}, this._jump = (e) => {
			let t = this.renderRoot.querySelector(".scroll"), n = e.currentTarget.getBoundingClientRect();
			t.scrollTo({
				left: (e.clientX - n.left) / n.width * t.scrollWidth - t.clientWidth / 2,
				behavior: "smooth"
			});
		}, this._framed = () => {
			let e = this.renderRoot?.querySelector(".scroll"), t = this.renderRoot?.querySelector(".map");
			e && t && (t.hidden = e.scrollWidth <= e.clientWidth + 1, t.style.setProperty("--from", `${e.scrollLeft / e.scrollWidth * 100}%`), t.style.setProperty("--seen", `${e.clientWidth / e.scrollWidth * 100}%`));
		};
	}
	static {
		this.styles = [Nn, Um];
	}
	static {
		this.properties = {
			_alerts: { state: !0 },
			_sel: { state: !0 },
			_armed: { state: !0 },
			_hurt: { state: !0 },
			_told: { state: !0 },
			_open: { state: !0 },
			_now: { state: !0 },
			_b: { state: !0 },
			_walk: { state: !0 }
		};
	}
	connectedCallback() {
		super.connectedCallback(), this._tick(), this._after(Ym, this._stroll), this._prank.start(), this._unwatch = g(this._fit);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unwatch?.();
	}
	get _cut() {
		return this._alone && this._world ? Tu(this._world) : void 0;
	}
	_resized() {
		this._fit();
	}
	_listen() {
		super._listen(), this._alone || this._follow(Tn, "Sensor Watch's alerts", (e) => {
			let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
			for (let n of e) t.set(n.entity_id, n);
			this._alerts = [...t.values()];
		});
	}
	_surveyed() {
		this._built !== this._survey && (this._built = this._survey, this._world = wu(this._house.rooms, !this._alone && !!this._survey?.weather), this._fit()), this._alone || this._outlook();
	}
	_moved(e) {
		this._armed === e.id && (this._armed = "");
	}
	_lived(e) {
		let t = e.zones.filter((e) => this._house.rooms.find((t) => t.id === e.id)?.devices.some((e) => e.kind === "light" && e.on));
		return t.length ? t : e.zones.filter((e) => e.storey === 0);
	}
	_stands(e, t) {
		let n = t[B(e.id) % t.length], r = this._walk.get(e.id);
		return {
			zone: n,
			x: r?.room === n.id ? r.x : n.x0 + B(e.id + n.id) % (n.x1 - n.x0 + 1)
		};
	}
	_point(e = "", t = "") {
		this._sel = e, this._told = t, this._hurt = -1, this._lapsing = this._instead(this._lapsing, e || t ? Km : 0, () => this._point());
	}
	_press(e, t = !1) {
		let n = t || this._sel === e.id;
		if (this._point(e.id), !e.away) {
			if (e.kind === "camera" || e.kind === "alarm_control_panel") return s(this, "hass-more-info", { entityId: e.id });
			if (n) {
				if (e.guarded && (e.kind === "lock" ? e.on : !e.on) && this._armed !== e.id) {
					this._armed = e.id, this._dropping = this._instead(this._dropping, Gm, () => this._armed === e.id && (this._armed = ""));
					return;
				}
				this._armed = "", this._call(Zt(e), `${e.room} ${e.name}`);
			}
		}
	}
	_hurts(e) {
		return [
			...e.filter((e) => e.kind === "lock" && !e.on && !e.away).map((e) => `${e.room} ${e.name} unlocked`),
			...this._alerts.filter((e) => e.level !== mn).map((e) => `${e.name}: ${e.message || e.level}`),
			...e.filter((e) => e.away).map((e) => `${e.room} ${e.name} not answering`)
		];
	}
	_crowd(e, t, n) {
		if (!n) return N;
		let r = n.devices.filter((e) => e.kind === "light"), i = r.filter((e) => e.on).length, [a, o] = e.startsWith("lamps:") ? [i ? "chandelierOn" : "chandelierOff", `${n.name} lights: ${i} of ${r.length} on`] : ["chest", `${n.name}: everything in it`];
		return j`<button class="at dev" style="${vh(t.x, t.y)};background-image:${Z(a)}" aria-label="${o}. Open" @click=${() => this._open = n.id}></button>`;
	}
	_levels(e) {
		let { min: t, max: n, step: r } = e.span, i = e.on && e.level !== void 0 ? (e.level - t) / (n - t) * Qm : 0;
		return j`<div class="levels">
      ${Array.from({ length: Qm }, (a, o) => {
			let s = Math.round((t + (n - t) * (o + 1) / Qm) / r) * r;
			return j`<button style="background-image:${Z(i >= o + .5 ? oh[e.kind] ?? "ember" : "ghost")}" aria-label="${e.name} to ${pm(e, s)}" @click=${() => (this._point(e.id), this._ask(e, s))}></button>`;
		})}
    </div>`;
	}
	willUpdate() {
		let e = new Date(this._now), t = e.getHours() + e.getMinutes() / 60;
		this._day = gh(Math.sin(Math.PI * (t - 6) / 12) * 1.5 + .15, 0, 1) * (dh(this._house) ? .8 : 1);
	}
	updated() {
		let e = this._world;
		Hm(this.renderRoot);
		let [t, n, r] = [
			".world",
			".dark",
			".map canvas"
		].map((e) => this.renderRoot.querySelector(e));
		if (!e || !this._house || !t || !n || !r) return;
		if (t.world !== e) {
			t.world = e;
			let n = t.getContext("2d");
			n.clearRect(0, 0, t.width, t.height), e.blocks.forEach((e, t) => e.forEach((e, r) => e && n.drawImage(om(e), r * 16, t * 16)));
			for (let [t, r, i] of e.deco) n.drawImage(om(t), r * 16, i * 16);
			let r = Math.min(...e.zones.map((e) => e.x0)) - 1, i = this.renderRoot.querySelector(".scroll");
			Number.isFinite(r) && !this._alone && (i.scrollLeft = r * this._b - i.clientWidth * .4);
		}
		let i = n.getContext("2d");
		i.clearRect(0, 0, e.w, e.h), Eu(e, this._house.rooms, this._day).forEach((e, t) => e.forEach((e, n) => {
			e <= 0 || (i.fillStyle = `rgba(6,8,26,${e})`, i.fillRect(n, t, 1, 1));
		}));
		let a = r.getContext("2d");
		a.imageSmoothingEnabled = !1, a.clearRect(0, 0, r.width, r.height), a.drawImage(t, 0, 0, r.width, r.height), a.drawImage(n, 0, 0, r.width, r.height), a.fillStyle = "#ffe9a0";
		for (let t of this._house.rooms) {
			let n = t.devices.filter((e) => e.kind === "light" && e.on), r = e.slots.get(hu + t.id);
			for (let t of r ? n.length ? [r] : [] : n.flatMap((t) => e.slots.get(t.id) ?? [])) a.fillRect(t.x * ih, t.y * ih, ih, ih);
		}
		this._framed();
	}
	render() {
		let e = this._house, t = this._world;
		if (!e || !t) return N;
		let n = this._alone, r = this._cut;
		if (n && !r) return j`<div class="digs"><div class="fault">${this._vacant}</div></div>`;
		let i = new Map(e.rooms.map((e) => [e.id, e])), a = e.rooms.flatMap((e) => e.devices), o = new Map(a.map((e) => [e.id, e])), c = o.get(this._sel), l = this._sel.startsWith(qm) ? i.get(this._sel.slice(5)) : void 0, u = l?.devices.filter((e) => e.kind === "light" && !e.away) ?? [], d = o.get(this._armed), f = this._hurts(a), p = f[this._hurt], m = n ? e.rooms[0].scenes : e.scenes, h = m.reduce((e, t) => Math.max(e, t.at), 0), g = this._lived(t), _ = i.get(this._open), v = (e) => this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.name), y = (t) => e.gaps.find((e) => e.kind === t)?.items.length ?? 0, [b, x] = [y("floorless"), y("loose")], S = [b ? `${_h(b, "room")} on no floor` : "", x ? `${_h(x, "device")} in no area` : ""].filter(Boolean).join(", "), C = new Date(this._now), w = C.getHours() + C.getMinutes() / 60, T = w >= 6 && w < 18, E = (w + (T ? 18 : 6)) % 24 / 12, ee = e.outside ? lh(e.outside.sky) : "clear", te = dh(e), ne = hh(hh(fh, ph, this._day / (te ? .8 : 1)), mh, te ? .5 : 0), D = (e, t, n, r, a) => {
			let o = i.get(e), s = a * 16 - 2, c = `${t}${o?.temp === void 0 ? "" : ` ${o.temp.toFixed(1)}°`}`, l = c.length * 4 * $m <= s ? c : t, u = o?.devices.filter((e) => e.kind === "light" && !e.away) ?? [], d = u.some((e) => e.on), f = this._sel === qm + e;
			return j`<button class="at label ${f ? "sel" : ""}" style=${vh(n, r, a)} ?disabled=${!u.length} aria-label="${c}: ${u.length ? `lights ${d ? "on" : "off"}. ${f ? "Press" : "Press twice"} to turn them all ${d ? "off" : "on"}` : "no lights"}"
        @click=${() => {
				o && f && this._lights(o), this._point(qm + e);
			}}>${Q(l, Math.min(1, s / (l.length * 4)))}</button>`;
		}, O = this._lost ? `No connection since ${F(this._lost)}` : d ? `Hit again to ${Er[d.kind]}` : p ? `${this._hurt + 1}/${f.length} ${p}` : this._told || (c ? `${c.room} ${c.name}: ${mm(c)}` : l ? `${l.name}: ${u.filter((e) => e.on).length} of ${u.length} lights on` : "Press a block to name it, again to switch it"), re = j`<div class="stage ${this._prank.shaking ? "shake" : ""}" style="--crack:${Z("crack")}">
        <canvas class="world" .width=${t.w * 16} .height=${t.h * 16}></canvas>
        ${t.zones.map((e) => D(e.id, e.name, e.x0, e.y0 - 1, e.x1 - e.x0 + 1))}
        ${t.plots.map((e) => D(e.id, e.name, e.x0, e.y, e.x1 - e.x0 + 1))}
        ${n ? N : j`
        ${this.hasAttribute("panel") ? j`<button class="at board" style="${vh(t.sign.x, t.sign.y, 2)};background-image:${Z("board")}" aria-label="Choose another Dash-Bored" @click=${() => s(this, lr)}>${Q("Dash")}${Q("Bored")}</button>` : j`<div class="at board" style="${vh(t.sign.x, t.sign.y, 2)};background-image:${Z("board")}">${Q("Dash")}${Q("Bored")}</div>`}
        ${S ? j`<button class="at board" style="${vh(t.notice.x, t.notice.y, 3)};background-image:${Z("board")}" aria-label="What the house is missing: ${S}" @click=${() => this._point("", S)}>
              ${b ? Q(`No floor ${b}`) : N}${x ? Q(`No area ${x}`) : N}
            </button>` : N}
        ${this._days.slice(0, t.signs.length).map((e, n) => {
			let { x: r, y: i } = t.signs[n], [a, o] = [new Date(e.at).toLocaleDateString("en", { weekday: "short" }), `${Math.round(e.high)}°`];
			return j`<div class="at icon" style="${vh(r, i - 1)};background-image:${Z(uh[lh(e.sky)])}"></div>
            <div class="at board" role="img" aria-label="${a}: ${e.sky}, ${o}" style="${vh(r, i)};background-image:${Z("board")}">${Q(a)}${Q(o)}</div>`;
		})}`}
        ${[...t.slots].map(([e, t]) => o.has(e) ? this._block(o.get(e), t) : this._crowd(e, t, i.get(e.replace(hu, "").replace(gu, ""))))}
        ${this._prank.draw()}
        ${g.length && !n ? e.people.filter((e) => e.place === "home").map((e) => {
			let { zone: t, x: n } = this._stands(e, g);
			return j`<div class="at who" style="${vh(n, t.y1 - 1, 1, 2)};background-image:${cm(e.name)}">${Q(e.name)}</div>`;
		}) : N}
        <canvas class="dark" .width=${t.w} .height=${t.h}></canvas>
        ${c && t.slots.has(c.id) ? j`<div class="at tag" style=${vh(t.slots.get(c.id).x, t.slots.get(c.id).y, t.slots.get(c.id).w, t.slots.get(c.id).h)}>${Q(c.name)}</div>` : N}
      </div>`;
		return j`<div class="digs ${n ? "alone" : ""}" style="--b:${this._b}px;--w:${t.w};--h:${t.h};--sky:rgb(${ne.join()})${r ? `;--rx:${r.x};--ry:${r.y};--rw:${r.w};--rh:${r.h}` : ""}">
      <div class="sky">
        ${te || n ? N : j`<div class="orb" style="background-image:${Z(T ? "sun" : "moon")};left:calc((100% - var(--b) * 2) * ${E});top:${85 - Math.sin(Math.PI * E) * 78}%"></div>`}
        ${n ? N : j`<div class="cloud" style="top:8%"></div><div class="cloud" style="top:18%;animation-delay:-80s"></div>`}
        ${(ee === "rain" || ee === "snow") && !n ? j`<div class="fall ${ee}" style="background-image:${Z(ee)}"></div>` : N}
      </div>
      <div class="scroll" @scroll=${this._framed}>${r ? j`<div class="cut">${re}</div>` : re}</div>
      <div class="hud">
        ${n ? N : j`<button class="bar hearts" aria-label="${f.length ? `${f.length} wrong: ${f.join("; ")}` : "Nothing is wrong"}" @click=${() => {
			let e = f.length ? (this._hurt + 1) % f.length : -1;
			this._point(), this._hurt = e;
		}}>
          ${Array.from({ length: Xm }, (e, t) => j`<i style="background-image:${Z(t < Xm - f.length ? "heart" : "heart0")}"></i>`)}
        </button>
        ${e.kw === void 0 ? N : j`<div class="bar power">${Array.from({ length: 10 }, (t, n) => j`<i style="background-image:${Z(n < Math.round(e.kw / Zm) ? "bolt" : "bolt0")}"></i>`)}${Q(` ${e.kw.toFixed(2)} kW`)}</div>`}
        <div class="row top"><div class="box">${Q(F(this._now))}</div>${e.outside ? j`<div class="box">${Q(`${ee} ${e.outside.temp.toFixed(1)}°`)}</div>` : N}</div>`}
        <div class="tips">
          ${this._fault ? j`<div class="fault" role="alert">${this._fault}</div>` : N}
          <div class="tip" role="status">${Q(O)}</div>
          <button class="map" hidden aria-label="Map of the house. Press to go there" @click=${this._jump}><canvas .width=${t.w * ih} .height=${t.h * ih}></canvas><i></i></button>
        </div>
        <div class="row hot">${m.map((e) => j`<button class="box ${h && e.at === h ? "sel" : ""}" aria-label="Scene: ${e.name}" @click=${() => v(e)}>${Q(e.name)}</button>`)}</div>
        ${_ ? hm(_, {
			block: this._block,
			throw: v,
			shut: () => this._open = ""
		}) : N}
        ${c?.dims && !c.away ? this._levels(c) : N}
      </div>
    </div>`;
	}
}, bh = Ba(class extends Va {
	constructor() {
		super(...arguments), this.key = N;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (Ya(e), this.key = t), n;
	}
}), xh = Ba(class extends Va {
	constructor(e) {
		if (super(e), e.type !== za.PROPERTY && e.type !== za.ATTRIBUTE && e.type !== za.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!Wa(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === Me || t === N) return t;
		let n = e.element, r = e.name;
		if (e.type === za.PROPERTY) {
			if (t === n[r]) return Me;
		} else if (e.type === za.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return Me;
		} else if (e.type === za.ATTRIBUTE && n.getAttribute(r) === t + "") return Me;
		return Ya(e), t;
	}
}), Sh = {
	kicker: "Stop press",
	head: ["{name} gives cause for alarm"],
	deck: "{message}",
	body: "The reading stood at {reading} in the {area} as this edition went to press, and the trouble dates from {since}.",
	plain: "The trouble in the {area} dates from {since}.",
	worse: "Matters have worsened since our earlier report."
}, Ch = {
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
		awaited: "Copy awaited",
		late: "Our correspondent's copy is late: {reason} (since {time})"
	},
	stories: {
		alert: Sh,
		"alert.warning": {
			...Sh,
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
}, wh = {
	kicker: "Breaking",
	head: ["{name}: what we know so far", "Live: {name}"],
	deck: "{message}",
	body: "The latest reading in the {area} is {reading}. It began at {since}.",
	plain: "It began in the {area} at {since}.",
	worse: "Update: it has got worse."
}, Th = {
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
		awaited: "Update pending",
		late: "Analysis delayed: {reason} (since {time})"
	},
	stories: {
		alert: wh,
		"alert.warning": {
			...wh,
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
}, Eh = {
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
}, Dh = {
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
		awaited: "Story on its way",
		late: "Our insider's gone quiet: {reason} (since {time})"
	},
	stories: {
		alert: Eh,
		"alert.warning": {
			...Eh,
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
}, $ = (e, t) => e.replace(/\{(\w+)\}/g, (e, n) => t[n] ?? ""), Oh = {
	esphome: "ESPHome. Add entity_category: config (or diagnostic) to each in its device's YAML",
	knx: "KNX. Add entity_category: config to each in the KNX YAML",
	"": "Give each the label Dash-Bored hide, or hide it in Home Assistant"
};
function kh(e, t, n) {
	let r = e.stories[`${t.kind}.${t.variant}`] ?? e.stories[t.kind], i = r.flavours?.[t.flavour] ?? r.head, a = t.vars.escalated && r.worse ? " " + r.worse : "";
	return {
		kicker: r.kicker,
		head: $(i[n % i.length], t.vars),
		deck: $(r.deck, t.vars),
		body: r.body ? $(t.vars.reading === "" && r.plain ? r.plain : r.body, t.vars) + a : "",
		act: t.press && r.act ? r.act : "",
		vote: t.vote && r.vote ? r.vote : ""
	};
}
var Ah = (e, t, n) => $(e.words[Ct.has(t) ? "degrees" : "percent"], { n: String(n) });
function jh(e) {
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
function Mh(e, t) {
	let { ask: n, less: r, more: i } = e.polls[t.kind];
	return {
		ask: $(n, jh(t)),
		less: r,
		more: i
	};
}
function Nh(e, t) {
	let n = (n) => `${t.kind}.${n}` in e.words, r = t.away ? "away" : t.phase && n(t.phase) ? `${t.kind}.${t.phase}` : t.on ? t.level === void 0 && n("plain") ? `${t.kind}.plain` : `${t.kind}.on` : `${t.kind}.off`, [i, a] = $(e.words[r], {
		...jh(t),
		level: "\0"
	}).replace(/^the (?=\S+['’]s )/, "").split("\0");
	return a === void 0 ? [
		i,
		"",
		""
	] : [
		i,
		Ah(e, t.kind, t.level),
		a
	];
}
var Ph = (e, t) => Nh(e, t).join(""), Fh = (e, t) => e.skies[t] ?? bn(t.replace(/[-_]/g, " "));
function Ih(e, t) {
	let n = $(t.vars.artist ? e.personal.song : e.personal.tune, t.vars);
	return [$(e.celebrity[t.live ? `${t.kind}.live` : t.kind], {
		...t.vars,
		song: n
	}), t.marks.map((t) => $(e.celebrity[t.kind], { name: t.name }))];
}
function Lh(e, t) {
	let n = $(t.vars.artist ? e.personal.song : e.personal.tune, t.vars);
	return $(e.personal[t.kind], {
		...t.vars,
		song: n
	});
}
var Rh = (e, t) => $(t.level === "nominal" ? e.wire.clear : e.wire.trouble, {
	name: t.name,
	message: t.message || t.level,
	level: t.level.toUpperCase()
}), zh = {
	broadsheet: Ch,
	tabloid: Dh,
	rolling: Th
}, Bh = {
	s: 1,
	x: 0,
	y: 0
}, Vh = 6, Hh = 1.2, Uh = 2.5;
function Wh(e, t, n, r, i, a, o, s) {
	let c = Math.min(Vh, Math.max(1, e.s * t)), l = c / e.s, u = (e, t) => Math.min(t, Math.max(-t, e)) || 0;
	return {
		s: c,
		x: u(n - (n - e.x - i) * l, (c - 1) * o / 2),
		y: u(r - (r - e.y - a) * l, (c - 1) * s / 2)
	};
}
var Gh = Bh, Kh = /* @__PURE__ */ new Map();
function qh() {
	let e = [...Kh.values()], t = (t) => e.reduce((e, n) => e + n[t], 0) / e.length;
	return [
		t(0),
		t(1),
		e.length > 1 ? Math.hypot(e[0][0] - e[1][0], e[0][1] - e[1][1]) : 0
	];
}
function Jh(e, t, n, r, i = 0, a = 0) {
	let o = e.getBoundingClientRect();
	Gh = Wh(Gh, t, n - o.left - o.width / 2, r - o.top - o.height / 2, i, a, o.width, o.height), e.firstElementChild.style.transform = `translate(${Gh.x}px, ${Gh.y}px) scale(${Gh.s})`, e.classList.toggle("near", Gh.s > 1);
}
var Yh = (e) => e.currentTarget, Xh = {
	whole() {
		Gh = Bh, Kh.clear();
	},
	down(e) {
		Yh(e).setPointerCapture(e.pointerId), Kh.set(e.pointerId, [e.clientX, e.clientY]);
	},
	move(e) {
		if (!Kh.has(e.pointerId)) return;
		let [t, n, r] = qh();
		Kh.set(e.pointerId, [e.clientX, e.clientY]);
		let [i, a, o] = qh();
		Jh(Yh(e), r && o ? o / r : 1, i, a, i - t, a - n);
	},
	up(e) {
		Kh.delete(e.pointerId);
	},
	wheel(e) {
		e.preventDefault(), Jh(Yh(e), e.deltaY < 0 ? Hh : 1 / Hh, e.clientX, e.clientY);
	},
	twice(e) {
		Jh(Yh(e), Gh.s > 1 ? 1 / Gh.s : Uh, e.clientX, e.clientY);
	}
}, Zh = 5, Qh = /* @__PURE__ */ new Map();
function $h(e) {
	let t = Qh.get(e);
	if (t) return t;
	let n = [...e].reduce((e, t) => e * 31 + t.charCodeAt(0) >>> 0, 7), r = () => (n = n * 1664525 + 1013904223 >>> 0) / 2 ** 32, i = (e) => Array.from({ length: e }, (t, n) => ((n + r() * .8) / e * 100).toFixed(1)), a = () => (r() * Zh).toFixed(1), o = `polygon(${[
		...i(30).map((e) => `${e}% ${a()}px`),
		...i(22).map((e) => `calc(100% - ${a()}px) ${e}%`),
		...i(30).map((e) => `calc(100% - ${e}%) calc(100% - ${a()}px)`),
		...i(22).map((e) => `${a()}px calc(100% - ${e}%)`)
	].join(",")})`;
	return Qh.set(e, o), o;
}
var eg = (e, t, n, r, i = "") => j`<dialog class="clipping ${i}" @close=${n} @click=${(e) => e.target === e.currentTarget && n()}>
    <div class="cutting" style="clip-path:${$h(e)}">
      <div class="scrap above" aria-hidden="true">${t.above}</div>
      <div class="story">${r}</div>
      <div class="scrap beside" aria-hidden="true"><span>${t.beside}</span></div>
      <div class="scrap below" aria-hidden="true">${t.below}</div>
    </div>
  </dialog>`;
function tg(e, t, n, r) {
	let i = e.clipping;
	return eg(t.src, n, r.shut, j`<p class="kicker">${t.caption}</p>
    <div class="zoom" @pointerdown=${Xh.down} @pointermove=${Xh.move} @pointerup=${Xh.up} @pointercancel=${Xh.up} @wheel=${Xh.wheel} @dblclick=${Xh.twice}>
      <img src=${t.src} alt=${t.caption} draggable="false" @load=${Xh.whole} />
    </div>
    <p class="hint">${i.closer}</p>
    <div class="foot">${t.see ? j`<button class="mend" @click=${r.more}>${i.live}</button>` : j`<span></span>`}<button class="act" @click=${r.shut}>${i.shut}</button></div>`, "shot");
}
function ng(e, t, n, r, i, a, o) {
	let s = e.clipping, c = j`${t.presets?.length ? j`<p class="turn"><i>${s.presets}</i>${t.presets.map((e) => j`<button class="mend" @click=${() => o.turn(e)}>${e.name}</button>`)}</p>` : N}
    ${t.zoom ? j`<label class="scale"><i>${s.zoom}</i><input type="range" min=${t.zoom.span.min} max=${t.zoom.span.max} step=${t.zoom.span.step} .value=${String(t.zoom.level)}
          @change=${(e) => o.zoom(Number(e.target.value))} /><output>${t.zoom.level}</output></label>` : N}
    ${t.controls?.length ? j`<p class="turn"><i>${s.controls}</i>${t.controls.map((e) => j`<button class="mend" ?disabled=${e.away} @click=${() => o.control(e)}>${e.name}</button>`)}</p>` : N}`, l = (n) => bn(Ph(e, {
		...t,
		on: n.on,
		phase: n.phase,
		level: n.level,
		away: n.away
	})), u = n.record, d = e.acts[`${t.kind}.${t.on ? "on" : "off"}`];
	return eg(t.id, a, o.shut, j`<p class="kicker">${t.room}</p>
      <h4 class="title">${t.name}</h4>
      <p class="deck">${bn(Ph(e, t))}. ${t.since && t.kind !== "camera" ? $(s.since, { at: F(t.since) }) : ""}
        ${t.temp === void 0 ? "" : $(s.reads, { temp: t.temp.toFixed(1) })} ${t.title ? $(s.playing, { title: t.title }) : ""}</p>
      ${t.picture ? j`<img class="still" src=${t.picture} alt=${t.name} role="button" tabindex="0" @click=${o.picture} @keydown=${(e) => e.key === "Enter" && o.picture()} />` : N}
      ${t.away ? N : c}
      ${t.away || !d ? N : j`<button class="act ${n.armed ? "sure" : ""}" @click=${o.flip}>${n.armed ? s.sure : d}</button>`}
      ${i}
      ${t.kind === "camera" ? N : j`<h3>${s.record}</h3>`}
      ${t.kind === "camera" ? N : n.fault ? j`<p class="fault" role="alert">Home Assistant's history could not be read (${n.fault}).</p>` : u ? j`<div class="band">${Zo(u, r - Yo, r).map(([e, t]) => j`<i style="left:${e}%;width:${t}%"></i>`)}</div>
              <div class="span"><span>${s.ago}</span><span>${s.now}</span></div>
              <ol>${u.length ? u.slice(-12).reverse().map((e) => j`<li><time>${F(e.at)}</time>${l(e)}</li>`) : j`<li>${s.none}</li>`}</ol>` : j`<p class="wait">${s.wait}</p>`}
      <div class="foot"><button class="mend" @click=${o.more}>${s.more}</button><button class="act" @click=${o.shut}>${s.shut}</button></div>`);
}
//#endregion
//#region src/dash-bored/styles.ts
var rg = C`
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
  /* The ear: the ruled box a paper prints beside its name. It opens the choice of family (shell.ts), on the page only. */
  .masthead { position: relative; }
  .ear { position: absolute; right: 0; top: 50%; transform: translateY(-50%); box-sizing: border-box; width: 124px; padding: 6px 8px; border: 1px solid var(--ink); outline: 1px solid var(--ink); outline-offset: 2px;
    text-align: center; font-size: 11px; line-height: 1.25; font-style: italic; }
  .ear b { display: block; font-style: normal; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
  .ear:hover, .ear:focus-visible { background: var(--ink); color: var(--paper); }
  /* The tabloid's and the rolling news's mastheads are a row: the ear is at its end. */
  [data-style="tabloid"] .ear, [data-style="rolling"] .ear { position: static; transform: none; margin-left: auto; font-style: normal; }
  [data-style="rolling"] .ear { border: 0; outline: 0; border-radius: 4px; background: var(--site); color: #fff; }
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
    /* No room beside the name: the ear goes under it. */
    .ear { position: static; transform: none; display: block; margin: 8px auto 2px; } [data-style="tabloid"] .ear, [data-style="rolling"] .ear { margin: 0 0 0 auto; }
    [data-style="tabloid"] h2 { font-size: 62px; } [data-style="tabloid"] .masthead h1 { font-size: 36px; }
    [data-style="rolling"] h2 { font-size: 30px; } [data-style="rolling"] .masthead h1 { font-size: 26px; }
    [data-style="rolling"] .page > * + * { padding-left: 0; }
    .figure, [data-style="tabloid"] .figure { width: 104px; } .figure b, [data-style="tabloid"] .figure b { font-size: 28px; }
  }
`, ig = "casa_mia_dash_bored/personal", ag = "casa_mia_dash_bored/playing", og = "casa_mia_dash_bored/column", sg = 18e5, cg = "dash-bored-style", lg = "/casa_mia_dash_bored/fonts/ManufacturingConsent-Regular.ttf", ug = !1;
function dg() {
	if (ug) return;
	ug = !0;
	let e = new FontFace("Dash-Bored Masthead", `url(${lg})`);
	document.fonts.add(e), e.load().catch((e) => console.error("Dash-Bored: the masthead's font could not be loaded", e));
}
var fg = class extends Ln {
	constructor(...e) {
		super(...e), this._played = [], this._style = "broadsheet", this._alerts = [], this._seen = [], this._rated = [], this._column = {}, this._late = [], this._turn = /* @__PURE__ */ new Map(), this._showing = /* @__PURE__ */ new Set(), this._primed = !1, this._seenPrimed = !1;
	}
	static {
		this.styles = [Nn, rg];
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
			_column: { state: !0 }
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
		super.connectedCallback(), dg(), this._choose();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._primed = this._seenPrimed = !1;
	}
	_choose() {
		let e = this._config.style;
		try {
			e ??= localStorage.getItem(cg) ?? void 0;
		} catch {}
		e && e in zh && (this._style = e);
	}
	_dress(e) {
		this._style = e;
		try {
			localStorage.setItem(cg, e);
		} catch {}
	}
	_listen() {
		super._listen(), this._follow(Tn, "Sensor Watch's alerts", (e) => this._take(e)), this._follow(En, "The cameras' sightings", (e) => this._sight(e));
		let e = (e, t) => [...new Map(e.map((e) => [t(e), e])).values()];
		this._follow(ig, "The Personal column's announcements", (t) => this._rated = e([...this._rated, ...t], (e) => `${e.at} ${e.name} ${e.title}`)), this._follow(ag, "What the players have played", (t) => this._played = e([...this._played, ...t], (e) => e.id)), this._follow(og, "The agent's column", (e) => this._column = e.at(-1) ?? {});
	}
	_sight(e) {
		let t = new Map(this._seen.map((e) => [e.id, e])), n = Date.now();
		for (let r of e) {
			let e = t.has(r.id);
			t.set(r.id, r);
			let i = n - r.at * 1e3;
			if (e || i >= 6e5) continue;
			this._later(hn - i);
			let [a] = this._seenPrimed && this._survey ? qt(this._survey, [r]) : [];
			a && this._note({
				time: a.at,
				seen: a
			});
		}
		this._seenPrimed = !0, this._seen = [...t.values()].filter((e) => n - e.at * 1e3 < sg);
	}
	_take(e) {
		let t = new Map(this._alerts.map((e) => [e.entity_id, e]));
		for (let n of e) {
			let e = {
				...n,
				at: n.at * 1e3,
				began: n.began * 1e3,
				flavour: Sn(this._hass?.states[n.entity_id]?.attributes.device_class)
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
}, pg = 6e3, mg = /* @__PURE__ */ new Set([
	"climate",
	"media_player",
	"camera",
	"water_heater",
	"vacuum",
	"lawn_mower",
	"alarm_control_panel"
]), hg = class extends fg {
	_press(e) {
		e.guarded || e.away || mg.has(e.kind) ? this._story(e) : this._call(Zt(e), `${e.room} ${e.name}`);
	}
	_story(e) {
		this._open = { id: e.id }, this._scale = e.dims && !e.away ? { id: e.id } : void 0;
		let t = (t) => {
			this._open?.id === e.id && (this._open = {
				...this._open,
				...t
			});
		};
		e.kind !== "camera" && Qo(this._hass, e, Date.now()).then((e) => t({ record: e }), (n) => {
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
			}, pg);
			this._timers.add(n);
			return;
		}
		this._open = {
			...t,
			armed: !1
		}, this._call(Zt(e), `${e.room} ${e.name}`);
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
}, gg = 36e5, _g = (e) => e ? e * 1e3 : void 0;
function vg(e, t, n) {
	if (!e || !("papers" in e)) return;
	let r = e.papers?.[t], i = r ? _g(e.at) : void 0;
	return {
		by: e.by ?? void 0,
		paper: r,
		at: i,
		lapsed: !!i && n - i > gg,
		writing: _g(e.writing),
		late: e.late ? {
			reason: e.late.reason,
			since: e.late.since * 1e3
		} : void 0
	};
}
//#endregion
//#region src/dash-bored/gazette.ts
var yg = "dash-bored-gazette", bg = 30, xg = 3, Sg = /* @__PURE__ */ new Set([
	"climate",
	"camera",
	"water_heater",
	"alarm_control_panel"
]), Cg = /* @__PURE__ */ new Set(["docked"]), wg = (e) => e.away || !!e.phase && !Cg.has(e.phase) || !Sg.has(e.kind) && (e.kind === "lock" ? !e.on : e.on), Tg = (e) => e.kind !== "camera" || e.away, Eg = class extends hg {
	render() {
		let e = this._hass, t = this._house, n = zh[this._style];
		if (!e || !t) return j`<div class="paper" data-style=${this._style}><p class="wait">Waiting for Home Assistant.</p></div>`;
		let r = Date.now(), i = qt(this._survey, this._seen).filter((e) => r - e.at < sg), a = [...i].sort((e, t) => t.at - e.at).slice(0, 10), o = (e) => (n.stories[`sighting.${e}`]?.kicker ?? e).toLowerCase(), l = wn(t, this._alerts, r, i);
		for (let e of l) this._showing.has(e.id) || this._turn.set(e.id, (this._turn.get(e.id) ?? -1) + 1);
		this._showing = new Set(l.map((e) => e.id));
		let u = l.map((e) => ({
			s: e,
			...kh(n, e, this._turn.get(e.id))
		})), [d, ...f] = u, p = u.find((e) => e.s.kind === "alert"), m = (e) => {
			let t = (t, n) => t ? j`<button class="act" @click=${() => this._call(n, e.head)}>${t}</button>` : N;
			return j`${t(e.act, e.s.press)}${t(e.vote, e.s.vote)}`;
		}, h = (e, t) => {
			let [r, i, a] = e.dims && !e.away ? Nh(n, e) : [
				Ph(n, e),
				"",
				""
			], o = (e, t, n) => e ? j`<span class="fact ${t}" role="button" tabindex="0" @click=${n} @keydown=${this._key}>${e}</span>` : N;
			return j`${o(t ? bn(r) : r, e.away ? "away" : "", () => this._press(e))}${o(i, "level", () => this._measure(e))}${o(a, "", () => this._press(e))}`;
		}, g = (e) => {
			let t = this._scale;
			if (!e || !t || t.id !== e.id || !e.dims || e.away) return N;
			let { min: r, max: i, step: a, vote: o } = e.span, s = e.level ?? r, c = (e) => Number(e.target.value), l = t.want ?? s, u = Mh(n, e), d = (n, a) => {
				let o = Math.min(i, Math.max(r, Math.round((l + a) * 10) / 10));
				return j`<button class="act" ?disabled=${o === l} @click=${() => (this._scale = {
					...t,
					want: o
				}, this._ask(e, o))}>${n}</button>`;
			};
			return j`<span class="scale">
        <span class="poll"><i>${bn(u.ask)}</i>${d(u.less, -o)}${d(u.more, o)}</span>
        <input type="range" min=${r} max=${i} step=${a} aria-label=${e.name} .value=${xh(String(l))}
          @input=${(e) => this._scale = {
				...t,
				want: c(e)
			}}
          @change=${(t) => this._ask(e, c(t))} />
        <output>${Ah(n, e.kind, s)}${t.want === void 0 || t.want === s ? "" : ` → ${t.want}`}</output>
        <button aria-label="Close" @click=${() => this._scale = void 0}>×</button>
      </span>`;
		}, _ = (e) => e.photo ? j`<figure class="photo" role="button" tabindex="0" @click=${() => this._look({
			src: e.photo,
			caption: `${e.figure[1]}, ${e.figure[0]}`,
			see: e.see
		})} @keydown=${this._key}>
            <img src=${e.photo} alt=${e.figure[1]} loading="lazy" @error=${() => this._fault = `The photograph from ${e.figure[1]} could not be fetched.`} />
            <figcaption>${e.figure[1]}, ${e.figure[0]}</figcaption>
          </figure>` : N, v = t.rooms.filter((e) => e.temp !== void 0), y = pn(t.people, this._rated, r), b = vg(this._column, this._style, r), x = (t) => new Date(t).toDateString() === new Date(r).toDateString() ? F(t) : `${new Date(t).toLocaleDateString(e.locale?.language ?? "en-GB", {
			day: "numeric",
			month: "short"
		})}, ${F(t)}`, S = t.rooms.filter((e) => e.devices.length), C = S.reduce((e, t) => e + t.devices.length, 0) > bg, w = S.map((e) => ({
			...e,
			devices: e.devices.filter(C ? wg : Tg)
		})).filter((e) => e.devices.length), T = S.some((e) => e.floor), E = (e, t, r = (e) => e) => {
			let i = /* @__PURE__ */ new Map();
			for (let t of e) i.set(t.floor ?? "", [...i.get(t.floor ?? "") ?? [], t]);
			return [...i].map(([e, i]) => j`${T ? j`<h5>${e || n.titles.elsewhere}</h5>` : N}${r(i.map(t))}`);
		}, ee = (e) => {
			let t = (t) => {
				let n = e.devices.filter((e) => C && e.kind === t && e.on && !e.away);
				return n.length > xg ? n : [];
			}, r = t("light"), i = t("switch"), a = e.devices.filter((e) => !r.includes(e) && !i.includes(e)).map((e, t) => h(e, !t && !r.length && !i.length));
			return i.length && a.unshift(r.length ? $(n.words["switch.many"], xn(i.length)) : bn($(n.words["switch.many"], xn(i.length)))), r.length && a.unshift(j`<span class="fact" role="button" tabindex="0" @click=${() => this._call({
				domain: "light",
				service: "turn_off",
				ids: r.map((e) => e.id)
			}, e.name)} @keydown=${this._key}>${bn($(n.words["light.many"], xn(r.length)))}</span>`), j`<p><b>${e.name}.</b> ${a.map((e, t) => j`${t ? n.join : ""}${e}`)}${n.end}${this._open ? N : g(e.devices.find((e) => e.id === this._scale?.id))}</p>`;
		}, te = (e) => j`<div class="pair"><button class="chip ${e.on ? "on" : ""} ${e.away ? "away" : ""}" aria-pressed=${e.on} @click=${() => this._press(e)}>${e.name}</button
        ><button class="chip tab" aria-label="${e.name}: its story" @click=${() => this._story(e)}>${e.dims && !e.away ? `${e.level ?? e.span.min}${Ct.has(e.kind) ? "°" : "%"}` : "›"}</button></div>`, ne = t.rooms.flatMap((e) => e.devices), D = new Map([...ne.flatMap((e) => (e.controls ?? []).flatMap((e) => e.device ? [e.device] : [])), ...ne].map((e) => [e.id, e])), O = this._open && D.get(this._open.id), re = un(this._played, this._rated, D), k = f.length ? f : u, A = {
			above: k[0].deck,
			beside: [...k, ...u].map((e) => `${e.head}. ${e.deck}`).join(" "),
			below: k.at(-1).head
		}, ie = j`<h3>${n.titles.board}</h3>
      ${E(S, (e) => j`<div class="row"><span>${e.name}</span>${e.devices.map(te)}</div>`, (e) => j`<div class="rows">${e}</div>`)}`, ae = b?.paper, oe = b ? j`<h3>${n.titles.desk}</h3>
                <div class="desk">
                  <p class="by">${$(n.desk.by, { name: b.by ?? n.desk.staff })} · ${b.at ? j`<span class=${b.lapsed ? "old" : ""} role=${b.lapsed ? "alert" : N}>${$(b.lapsed ? n.desk.lapsed : n.desk.filed, { time: x(b.at) })}</span>` : `${n.desk.awaited}${b.writing ? ` (${x(b.writing)})` : ""}`}</p>
                  ${ae ? j`<p class="lead">${ae.head}</p>${ae.body.map((e) => j`<p>${e}</p>`)}` : N}
                  ${ae?.items.length ? j`<ul>${ae.items.map((e) => j`<li>${e}</li>`)}</ul>` : N}
                  ${b.late ? j`<p class="error" role="alert">${$(n.desk.late, {
			reason: b.late.reason,
			time: x(b.late.since)
		})}</p>` : N}
                </div>` : N;
		return j`<div class="paper" data-style=${this._style}>
      ${this._lost ? j`<div class="fault" role="alert">Not connected to Home Assistant since ${F(this._lost)}. What follows is how things stood then.</div>` : N}
      ${this._fault ? j`<div class="fault" role="alert">${this._fault}</div>` : N}
      ${p ? bh(p.s.id + p.s.variant, j`<div class="breaking" role="status"><b>${n.flash}</b>${p.head}${/[!?]$/.test(p.head) ? "" : ":"} ${p.s.vars.message}</div>`) : N}
      <header class="masthead"><h1>${n.name}</h1><p>${n.strap}</p>
        ${this.hasAttribute("panel") ? j`<button class="ear" aria-label="Choose another style of Dash-Bored" @click=${() => s(this, lr)}><b>Other editions</b>Dash-Bored in another style</button>` : N}</header>
      <div class="dateline">
        ${this.hasAttribute("panel") ? j`<ha-menu-button .hass=${e} .narrow=${this.narrow}></ha-menu-button>` : N}
        <span>${(/* @__PURE__ */ new Date()).toLocaleDateString(e.locale?.language ?? "en-GB", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric"
		})}</span>
        ${this._config.style ? N : j`<span class="styles">${Object.entries(zh).map(([e, t]) => j`<button aria-pressed=${e === this._style} @click=${() => this._dress(e)}>${t.label}</button>`)}</span>`}
        <span>${n.price} · ${F(Date.now())}</span>
      </div>
      ${n.ticker ? j`<div class="ticker" aria-hidden="true"><b>${n.ticker}</b><div><span>${u.map((e) => e.head).join("  •  ")}</span></div></div>` : N}
      <main class="page ${f.length || b ? "" : "solo"}">
        <article>
          <div class="figure"><b>${d.s.figure[0]}</b><span>${d.s.figure[1]}</span></div>
          <p class="kicker">${d.kicker}</p>
          ${bh(d.head, j`<h2>${d.head}</h2>`)}
          <p class="deck">${d.deck}</p>
          ${m(d)}
          ${_(d.s)}
          <div class="copy">
            ${d.body ? j`<p>${d.body}</p>` : N}
            ${E(w, ee)}
            ${S.length > w.length ? j`<p>${$(n.rest, xn(S.length - w.length))}</p>` : N}
            ${S.length ? N : j`<p>No areas with lights, switches or other devices were found. Give your devices areas in Home Assistant's settings and this page fills itself in.</p>`}
          </div>
        </article>
        ${f.length || b ? j`<section>
              ${f.length ? j`<h3>${n.titles.more}</h3>` : N}
              ${f.slice(0, 3).map((e) => j`<div class="item"><p class="kicker">${e.kicker}</p><h4>${e.head}</h4>${_(e.s)}<p>${e.deck}</p>${m(e)}</div>`)}
              ${f.length > 3 ? j`<h3>${n.titles.briefs}</h3><ul>${f.slice(3).map((e) => j`<li><b>${e.head}.</b> ${e.deck}</li>`)}</ul>` : N}
              ${oe}
            </section>` : N}
        <aside>
          <h3>${n.titles.late}</h3>
          <ol>${this._late.length ? this._late.map((e) => {
			let t = e.device && D.get(e.device.id);
			return j`<li role=${t ? "button" : N} tabindex=${t ? 0 : N} @click=${() => t && this._story(t)} @keydown=${this._key}><time>${F(e.time)}</time>${e.alert ? Rh(n, e.alert) : e.seen ? `${e.seen.name}: ${o(e.seen.kind)}` : `${e.device.room}: ${Ph(n, e.device)}`}</li>`;
		}) : j`<li>${n.nothing}</li>`}</ol>
          ${a.length ? j`<h3>${n.titles.archive}</h3>
                <ol class="archive">${a.map((e) => j`<li role="button" tabindex="0" @click=${() => e.photo ? this._look({
			src: e.photo,
			caption: `${e.name}, ${F(e.at)}`,
			see: e.camera
		}) : s(this, "hass-more-info", { entityId: e.camera })} @keydown=${this._key}>
                    ${e.photo ? j`<img src=${e.photo} alt="" loading="lazy" />` : j`<i></i>`}<span><time>${F(e.at)}</time>${e.name}: ${o(e.kind)}</span></li>`)}</ol>` : N}
          ${y.length ? j`<h3>${n.titles.personal}</h3><ol>${y.map((e) => j`<li><time>${F(e.at)}</time>${Lh(n, e)}</li>`)}</ol>` : N}
          ${re.length ? j`<h3>${n.titles.celebrity}</h3><ol>${re.map((e) => {
			let [t, r] = Ih(n, e);
			return j`<li role="button" tabindex="0" @click=${() => this._story(D.get(e.id))} @keydown=${this._key}><time>${F(e.at)}</time>${t}${r.map((t, n) => j` <span class="mark ${e.marks[n].kind}">${t}</span>`)}</li>`;
		})}</ol>` : N}
          ${t.outside ? j`<h3>${n.titles.weather}</h3>
                <p class="now">${$(n.forecast.now, {
			sky: Fh(n, t.outside.sky),
			temp: t.outside.temp.toFixed(1)
		})}</p>
                ${this._days.length ? j`<table class="days">${this._days.map((t) => j`<tr><td>${new Date(t.at).toDateString() === new Date(r).toDateString() ? n.forecast.today : new Date(t.at).toLocaleDateString(e.locale?.language ?? "en-GB", { weekday: "long" })}</td>
                        <td>${Fh(n, t.sky)}</td><td>${Math.round(t.high)}°${t.low === void 0 ? "" : ` / ${Math.round(t.low)}°`}</td></tr>`)}</table>` : N}` : N}
          ${v.length ? j`<h3>${n.titles.temps}</h3><table>${v.map((e) => j`<tr><td>${e.name}</td><td>${e.temp.toFixed(1)}° ${e.target === void 0 ? "" : e.temp < e.target - .5 ? "▼" : e.temp > e.target + .5 ? "▲" : "="}</td></tr>`)}</table>` : N}
          ${C ? N : ie}
          ${t.gaps.length ? j`<h3>${n.titles.gaps}</h3>
                ${t.gaps.map((e) => j`<details><summary>${$(n.gaps[e.kind], xn(e.items.length))}</summary>
                  <ul>${e.items.map((t, n) => j`${e.kind === "plumbing" && t.via !== e.items[n - 1]?.via ? j`<li class="via">${Oh[t.via ?? ""] ?? `${t.via}. ${Oh[""]}`}:</li>` : N}<li><button class="mend" @click=${() => e.kind === "floorless" || e.kind === "cold" ? c(`/config/areas/area/${t.id}`) : s(this, "hass-more-info", { entityId: t.id })}>${t.name}</button></li>`)}</ul></details>`)}
                <p class="mend">${n.mend}</p>` : N}
          ${t.scenes.length || t.rooms.some((e) => e.scenes.length) ? j`<h3>${n.titles.notices}</h3>${Yt(t).slice(0, 8).map((e, t) => j`<button class="ad" @click=${() => this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.name)}><b>${e.name}</b>${n.notices[t % n.notices.length]}</button>`)}` : N}
        </aside>
        ${C ? j`<section class="board">${ie}</section>` : N}
      </main>
      ${O ? ng(n, O, this._open, r, g(O), A, {
			flip: () => this._flip(O),
			more: () => this._live(O.id),
			picture: () => this._look({
				src: O.picture,
				caption: `${O.room}: ${O.name}`,
				see: O.id
			}),
			shut: () => this._shut(),
			turn: (e) => this._call(tn(e), `${O.room} ${O.name} to ${e.name}`),
			zoom: (e) => this._ask(O, e, en),
			control: (e) => e.device ? this._press(e.device) : this._call(rn(e), `${O.room} ${e.name}`)
		}) : this._shot ? tg(n, this._shot, A, {
			more: () => this._live(this._shot.see),
			shut: () => this._shut()
		}) : N}
    </div>`;
	}
}, Dg = new URL(import.meta.url).searchParams.get("v") || "dev";
u(yg, Eg), u(qs, Js), u(Tc, Ec), u(pl, ml), u(wl, Dl), u(tu, nu), u(iu, au), u(br, Nr), u(ka, Ra), u(Wm, yh), u(gm, Em), u(cr, gr);
for (let [e, t] of [
	[Ol, Ll],
	[kl, Rl],
	[Al, zl]
]) u(e, t), u(`${e}-editor`, Bl(e));
var Og = (e) => e.map((e) => [e.id, e.name]), kg = [
	[
		br,
		_l(Nr, `${br}-room`),
		"Fridge",
		"One room on a piece of the fridge door: its polaroid, a magnet for each of its devices and its scenes as word magnets.",
		_r.map((e) => [e.id, e.label])
	],
	[
		ka,
		_l(Ra, `${ka}-room`),
		"Aurora",
		"One room in the current web style: a fader or a key for each of its devices, its scenes and its cameras, on glass over a sky that warms as its lights come on.",
		[
			...Og(Ui),
			[Hi, "Almanac"],
			...Og(Wi)
		]
	],
	[
		Wm,
		_l(yh, `${Wm}-room`),
		"Digs",
		"One room built of square blocks: a block to hit for each of its devices, lit by its lamps, with its scenes along the bottom."
	],
	[
		gm,
		_l(Em, `${gm}-room`),
		"Contraption",
		"One room as an absurd machine that ducks go through: each duck is the engine of the device it is passing, and a tap on a device throws its clutch.",
		Og(Xf)
	]
];
for (let [e, t, n, r, i] of kg) u(`${e}-room`, t), u(`${e}-room-editor`, vl(i)), d(`${e}-room`, `Casa Mia Dash-Bored ${n} room`, `${r} For a page that is about that room.`);
d(yg, "Casa Mia Dash-Bored Gazette", "Your house as a newspaper: what matters most is the headline, and every underlined fact is a switch. Best in a panel view."), d(wl, "Casa Mia Dash-Bored Console", "Your house as a control panel, in the style of a decade, with a switch to choose which. Every decade from the 1950s to the 1990s is built. Best in a panel view."), d(br, "Casa Mia Dash-Bored Fridge", "Your house as a fridge door: a polaroid for each room, a magnet for each device, sticky notes for what is wrong and the cameras' pictures held up by a butterfly. Dress it as a young family's, a pair of yuppies' or grandparents'. Best in a panel view."), d(ka, "Casa Mia Dash-Bored Aurora", "Your house in the current web style: glass tiles over a sky that warms as the lights come on, with the scenes, the power being drawn and a thermostat. A room's tile has a dot for each device and grows into a sheet of faders. Best in a panel view."), d(Wm, "Casa Mia Dash-Bored Digs", "Your house in section, built of square blocks: a block to hit for each device, lit by its lamps, with the household walking about in the lit rooms, hearts for what is wrong and the scenes along the bottom. Best in a panel view."), d(gm, "Casa Mia Dash-Bored Contraption", "One room as an absurd machine that ducks go through: each duck is the engine of the device it is passing, and a tap on a device throws its clutch. The first build shows one room, the kitchen unless you name another. Best in a panel view."), d(Ol, "Casa Mia Dash-Bored Console instrument", "One light, switch, thermostat, lock, camera, alarm, scene or sensor as an instrument on the Console, in the style of a decade: a knob, a switch, a screen or a meter. On its era's panel, or on the dashboard's own card."), d(kl, "Casa Mia Dash-Bored Console room", "One room as a chassis on the Console, in the style of a decade: a lamp for its lights, a meter for its temperature, and a control for each of its devices."), d(Al, "Casa Mia Dash-Bored Console warning lamps", "Sensor Watch's warnings as the Console's warning lamps, in the style of a decade, the worst first. A green lamp says when all is well."), a("Dash-Bored", "casa_mia_dash_bored/cards", Dg);
//#endregion
