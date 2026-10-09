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
				["centre", "Centre"]
			],
			help: "Fill: equal tiles, each {item} filling its own. Whole: equal tiles, each {item} whole in its own. Stack, Reverse, Centre: each {item} whole at its own shape, edge to edge, from the start, against the end, or in the middle; the spare room is left clear (too many to fit: all shrink alike)."
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
function n(e) {
	history.pushState(null, "", e), t(window, "location-changed", { replace: !1 });
}
async function r() {
	customElements.get("ha-form") || (await (await (await window.loadCardHelpers()).createCardElement({
		type: "entities",
		entities: []
	})).constructor.getConfigElement?.(), await customElements.whenDefined("ha-form"));
}
async function i() {
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
var a = { shown: 0 };
function o(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function s(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !0,
		documentationURL: "https://github.com/gazoodle/casa-mia"
	});
}
var c = e.main, l = e.panel;
function u(e, t) {
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
function d(e) {
	return Object.entries(c).filter(([, t]) => (!t.when || t.when.includes(e)) && (!t.for || t.for === "view")).map(([e, t]) => u(e, t));
}
function f(e) {
	return Object.entries(l).filter(([, t]) => (!t.edge || e === "top" || e === "bottom") && (!t.for || t.for === "view")).map(([e, t]) => u(e, t));
}
var p = {
	...c,
	...l
}, m = (e) => p[e.name]?.label ?? e.name, h = (e) => p[e.name]?.help?.replaceAll("{item}", "card"), g = 100, _ = (e) => e.parentElement ?? (e.getRootNode().host || null);
function v(e) {
	for (let t = _(e); t; t = _(t)) {
		let e = t.tagName ?? "";
		if (e.includes("-") && e !== "HUI-CARD") return e;
	}
	return "";
}
function y(e) {
	for (let t = _(e); t; t = _(t)) if (t.tagName === "HUI-CARD") return t.hasAttribute("cm-fill");
	return !1;
}
function b(e) {
	for (let t = e; t; t = _(t)) if (t.tagName?.startsWith("HUI-DIALOG") || t.tagName === "HA-DIALOG") return !0;
	return !1;
}
function x(e) {
	let t = e.getBoundingClientRect().top + window.scrollY, n = window.visualViewport?.height ?? window.innerHeight;
	return Math.max(g, Math.floor(n - t));
}
function S(e, t, n = !1) {
	return t ? "preview" : e === "HUI-PANEL-VIEW" ? "screen" : e === "CASA-MIA-TABLET-LAYOUT" ? "tile" : n ? "cell" : "column";
}
function C(e, t = !1) {
	let n = y(e) ? "CASA-MIA-TABLET-LAYOUT" : v(e);
	return {
		mode: S(n, b(e), t),
		room: x(e),
		container: n.toLowerCase()
	};
}
function w(e, t, n) {
	switch (e.mode) {
		case "screen": return e.room;
		case "tile":
		case "cell": return null;
		default: return Math.round(t / n);
	}
}
function T(e) {
	return window.addEventListener("resize", e), window.visualViewport?.addEventListener("resize", e), () => {
		window.removeEventListener("resize", e), window.visualViewport?.removeEventListener("resize", e);
	};
}
function E(e) {
	let t = e.hostname.replace(/^\[|\]$/g, "").toLowerCase();
	return e.protocol === "http:" && (!t.includes(".") && !t.includes(":") || /^(127|10|192\.168|172\.(1[6-9]|2\d|3[01])|169\.254)\./.test(t) || /^(::1|f[cd][0-9a-f]{0,2}:.*|fe80:.*)$/.test(t) || /\.(local|lan|home|internal|home\.arpa)$/.test(t));
}
var D = {
	full: Infinity,
	balanced: 1.5,
	light: 1,
	saver: .75
};
function O(e, t, n = "balanced") {
	return t ? Math.min(e, D[n] ?? D.balanced) : e;
}
function ee(e, t, n) {
	let r = e.filter(([, e, t]) => e > 0 && t > 0);
	return (r.find(([, e, r]) => n ? e >= t[0] || r >= t[1] : e >= t[0] && r >= t[1]) ?? r[r.length - 1] ?? e[e.length - 1])?.[0];
}
var k = {
	tint: [
		61,
		123,
		255
	],
	strength: 3,
	darkness: 20
};
function te([e, t, n], r, i) {
	let [a, o, s] = [
		e,
		t,
		n
	].map((e) => e / 255), c = Math.max(a, o, s), l = c - Math.min(a, o, s), u = 0;
	return l && (u = c === a ? (o - s) / l % 6 : c === o ? (s - a) / l + 2 : (a - o) / l + 4), `grayscale(1) sepia(1) hue-rotate(${Math.round(u * 60 - 35)}deg) saturate(${r}) brightness(${Math.max(.1, 1 - i / 100).toFixed(2)}) contrast(1.1)`;
}
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var A = globalThis, j = A.ShadowRoot && (A.ShadyCSS === void 0 || A.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, M = Symbol(), N = /* @__PURE__ */ new WeakMap(), ne = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== M) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (j && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = N.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && N.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, re = (e) => new ne(typeof e == "string" ? e : e + "", void 0, M), P = (e, ...t) => new ne(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, M), F = (e, t) => {
	if (j) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = A.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, ie = j ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return re(t);
})(e) : e, { is: I, defineProperty: ae, getOwnPropertyDescriptor: oe, getOwnPropertyNames: se, getOwnPropertySymbols: ce, getPrototypeOf: le } = Object, ue = globalThis, de = ue.trustedTypes, fe = de ? de.emptyScript : "", pe = ue.reactiveElementPolyfillSupport, me = (e, t) => e, he = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? fe : null;
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
}, ge = (e, t) => !I(e, t), _e = {
	attribute: !0,
	type: String,
	converter: he,
	reflect: !1,
	useDefault: !1,
	hasChanged: ge
};
Symbol.metadata ??= Symbol("metadata"), ue.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var ve = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = _e) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && ae(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = oe(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? _e;
	}
	static _$Ei() {
		if (this.hasOwnProperty(me("elementProperties"))) return;
		let e = le(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(me("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(me("properties"))) {
			let e = this.properties, t = [...se(e), ...ce(e)];
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
			for (let e of n) t.unshift(ie(e));
		} else e !== void 0 && t.push(ie(e));
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
		return F(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? he : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? he : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ge)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
ve.elementStyles = [], ve.shadowRootOptions = { mode: "open" }, ve[me("elementProperties")] = /* @__PURE__ */ new Map(), ve[me("finalized")] = /* @__PURE__ */ new Map(), pe?.({ ReactiveElement: ve }), (ue.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ye = globalThis, be = (e) => e, xe = ye.trustedTypes, Se = xe ? xe.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, Ce = "$lit$", L = `lit$${Math.random().toFixed(9).slice(2)}$`, we = "?" + L, Te = `<${we}>`, R = document, Ee = () => R.createComment(""), De = (e) => e === null || typeof e != "object" && typeof e != "function", Oe = Array.isArray, ke = (e) => Oe(e) || typeof e?.[Symbol.iterator] == "function", Ae = "[ 	\n\f\r]", je = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Me = /-->/g, Ne = />/g, z = RegExp(`>|${Ae}(?:([^\\s"'>=/]+)(${Ae}*=${Ae}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Pe = /'/g, Fe = /"/g, Ie = /^(?:script|style|textarea|title)$/i, B = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), V = Symbol.for("lit-noChange"), H = Symbol.for("lit-nothing"), Le = /* @__PURE__ */ new WeakMap(), U = R.createTreeWalker(R, 129);
function Re(e, t) {
	if (!Oe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return Se === void 0 ? t : Se.createHTML(t);
}
var ze = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = je;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === je ? c[1] === "!--" ? o = Me : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = z) : (Ie.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = z) : o = Ne : o === z ? c[0] === ">" ? (o = i ?? je, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? z : c[3] === "\"" ? Fe : Pe) : o === Fe || o === Pe ? o = z : o === Me || o === Ne ? o = je : (o = z, i = void 0);
		let d = o === z && e[t + 1].startsWith("/>") ? " " : "";
		a += o === je ? n + Te : l >= 0 ? (r.push(s), n.slice(0, l) + Ce + n.slice(l) + L + d) : n + L + (l === -2 ? t : d);
	}
	return [Re(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Be = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ze(t, n);
		if (this.el = e.createElement(l, r), U.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = U.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(Ce)) {
					let t = u[o++], n = i.getAttribute(e).split(L), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? We : r[1] === "?" ? Ge : r[1] === "@" ? Ke : Ue
					}), i.removeAttribute(e);
				} else e.startsWith(L) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Ie.test(i.tagName)) {
					let e = i.textContent.split(L), t = e.length - 1;
					if (t > 0) {
						i.textContent = xe ? xe.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], Ee()), U.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], Ee());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === we) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(L, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += L.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = R.createElement("template");
		return n.innerHTML = e, n;
	}
};
function W(e, t, n = e, r) {
	if (t === V) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = De(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = W(e, i._$AS(e, t.values), i, r)), t;
}
var Ve = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? R).importNode(t, !0);
		U.currentNode = r;
		let i = U.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new He(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new qe(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = U.nextNode(), a++);
		}
		return U.currentNode = R, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, He = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = H, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = W(this, e, t), De(e) ? e === H || e == null || e === "" ? (this._$AH !== H && this._$AR(), this._$AH = H) : e !== this._$AH && e !== V && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ke(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== H && De(this._$AH) ? this._$AA.nextSibling.data = e : this.T(R.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Be.createElement(Re(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ve(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Le.get(e.strings);
		return t === void 0 && Le.set(e.strings, t = new Be(e)), t;
	}
	k(t) {
		Oe(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(Ee()), this.O(Ee()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = be(e).nextSibling;
			be(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Ue = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = H, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = H;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = W(this, e, t, 0), a = !De(e) || e !== this._$AH && e !== V, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = W(this, r[n + o], t, o), s === V && (s = this._$AH[o]), a ||= !De(s) || s !== this._$AH[o], s === H ? e = H : e !== H && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === H ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, We = class extends Ue {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === H ? void 0 : e;
	}
}, Ge = class extends Ue {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== H);
	}
}, Ke = class extends Ue {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = W(this, e, t, 0) ?? H) === V) return;
		let n = this._$AH, r = e === H && n !== H || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== H && (n === H || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, qe = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		W(this, e);
	}
}, Je = {
	M: Ce,
	P: L,
	A: we,
	C: 1,
	L: ze,
	R: Ve,
	D: ke,
	V: W,
	I: He,
	H: Ue,
	N: Ge,
	U: Ke,
	B: We,
	F: qe
}, Ye = ye.litHtmlPolyfillSupport;
Ye?.(Be, He), (ye.litHtmlVersions ??= []).push("3.3.3");
var Xe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new He(t.insertBefore(Ee(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Ze = globalThis, G = class extends ve {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Xe(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return V;
	}
};
G._$litElement$ = !0, G.finalized = !0, Ze.litElementHydrateSupport?.({ LitElement: G });
var Qe = Ze.litElementPolyfillSupport;
Qe?.({ LitElement: G }), (Ze.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/lit-html/directive.js
var $e = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), et = class {
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
}, { I: tt } = Je, nt = {}, rt = (e, t = nt) => e._$AH = t, it = $e(class extends et {
	constructor() {
		super(...arguments), this.key = H;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (rt(e), this.key = t), n;
	}
}), K = [
	"left",
	"top",
	"right",
	"bottom"
], at = [
	"stack",
	"reverse",
	"centre"
];
function q(e) {
	let t = Math.floor(e), n = e - t;
	return n > .5 ? t + 1 : n < .5 || t % 2 == 0 ? t : t + 1;
}
var J = (e, t) => Math.floor(e / t);
function ot(e, t, n, r) {
	let [i, a, o, s] = e, c = n ? s : o, l = Array.from({ length: t + 1 }, (e, n) => q(n * (c - (t - 1) * r) / t + n * r)), u = Array.from({ length: t }, (e, n) => [l[n], l[n + 1] - l[n] - (n < t - 1 ? r : 0)]);
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
function st(e, t, n, r, i) {
	let [a, o, s, c] = e, [l, u] = n ? [s, c] : [c, s], d = t.map((e) => n ? l / e : l * e), f = u - r * (t.length - 1), p = d.reduce((e, t) => e + t, 0), m = p > 0 && f > 0 ? Math.min(1, f / p) : 0, h = Math.trunc(l * m);
	d = d.map((e) => Math.trunc(e * m));
	let g = d.reduce((e, t) => e + t, 0) + r * (t.length - 1), _ = i === "reverse" ? u - g : i === "centre" ? J(u - g, 2) : 0, v = J(l - h, 2);
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
function ct(e, t, n, r, i, a, o) {
	n = Math.max(1, Math.min(n, t));
	let s = ot(e, n, !r, i), c = [], l = 0;
	return s.forEach((e, s) => {
		let u = Math.floor(t / n) + +(s < t % n);
		c.push(...a === null ? ot(e, u, r, i) : st(e, a.slice(l, l + u), r, i, o)), l += u;
	}), c;
}
function lt(e) {
	let t;
	if (typeof e == "number") t = e;
	else {
		let [n, r] = String(e).trim().replace("/", ":").split(":");
		t = r === void 0 ? Number(n) : Number(n) / Number(r);
	}
	if (!(t > 0)) throw Error(`not a shape: ${e}`);
	return t;
}
var ut = (t) => e.main[t].default;
function dt(e, t) {
	let n = e.main_fit ?? ut("main_fit");
	return n === "fixed" ? lt(e.main_ratio ?? ut("main_ratio")) : n === "own" ? Number((e.aspects ?? {})[t ?? ""] || 16 / 9) : null;
}
function ft(t, n = null) {
	let { width: r, height: i, gap: a } = t, o = Math.max(0, Math.min(Math.trunc(Number(t.margin ?? 0)), J(Math.min(r, i) - 1, 2)));
	if (o) {
		let [, e, a] = ft({
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
			Object.fromEntries(K.map((e) => [e, a[e].map(s)]))
		];
	}
	let s = dt(t, n), c = (e) => t[e].cameras.length > 0, l = (e, n) => c(e) ? t[e].unit === "px" ? Math.min(q(t[e].size * (t.scale ?? 1)), J(n * 45, 100)) : q(n * t[e].size / 100) : 0, u = (n, r) => {
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
		let e = Number(t.panel_min ?? ut("panel_min")), n = (t, n, r) => (Number(c(n)) + Number(c(r))) * (q(t * e / 100) + a), o = r - n(r, "left", "right"), l = i - n(i, "top", "bottom");
		h = Math.min(q(r * Number(t.main_width ?? ut("main_width")) / 100), o), g = q(h / s), g > l && ([g, h] = [l, q(l * s)]);
		let u = (e, t, n) => {
			let [r, i] = [c(t), c(n)], o = Math.max(e - a * (Number(r) + Number(i)), 0);
			return r && i ? [J(o, 2), o - J(o, 2)] : r ? [o, 0] : i ? [0, o] : [0, 0];
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
	}, w = (e) => at.includes(t[e].fit ?? "") ? t[e].cameras.map((e) => Number((t.aspects ?? {})[e] || 16 / 9)) : null, T = Object.fromEntries(K.map((e) => [e, c(e) ? ct(C[e], t[e].cameras.length, Math.trunc(Number(t[e].lines ?? 1)), e === "left" || e === "right", a, w(e), t[e].fit ?? "cover") : []])), E = [
		_,
		y,
		v - _,
		b - y
	];
	return s !== null && (h = Math.min(h, v - _), g = Math.min(g, b - y), E = [
		_ + J(v - _ - h, 2),
		y + J(b - y - g, 2),
		h,
		g
	]), [
		[r, i],
		E,
		T
	];
}
function pt(e, t, n, r) {
	let i = (r) => ft({
		...e,
		width: n,
		height: r
	}, t)[1], a = dt(e, t) !== null, [o, s] = [1, Math.max(64, Math.ceil(n * 4))], c = i(s)[2], l = (e) => {
		let [, , t, n] = i(e);
		return a ? t >= c : n > 0 && t <= n * r;
	};
	if (!c || !l(s)) return Math.round(n / r);
	for (; o < s;) {
		let e = J(o + s, 2);
		l(e) ? s = e : o = e + 1;
	}
	return o;
}
//#endregion
//#region ../../app/web/src/webrtc.ts
async function mt(e, t, n, r) {
	let i = await e.sendMessagePromise({
		type: "camera/webrtc/get_client_config",
		entity_id: t
	}), a = new RTCPeerConnection(i.configuration);
	i.dataChannel && a.createDataChannel(i.dataChannel), a.addTransceiver("video", { direction: "recvonly" }), a.addTransceiver("audio", { direction: "recvonly" });
	let o = new MediaStream();
	a.ontrack = (e) => {
		o.addTrack(e.track), n.srcObject = o;
	}, a.onconnectionstatechange = () => {
		a.connectionState === "failed" && r("The WebRTC connection failed.");
	};
	let s, c = [], l = (n) => e.sendMessagePromise({
		type: "camera/webrtc/candidate",
		entity_id: t,
		session_id: s,
		candidate: {
			candidate: n.candidate,
			sdpMid: n.sdpMid,
			sdpMLineIndex: n.sdpMLineIndex
		}
	}).catch(() => void 0);
	a.onicecandidate = (e) => {
		e.candidate && (s ? l(e.candidate) : c.push(e.candidate));
	}, await a.setLocalDescription(await a.createOffer());
	let u = await e.subscribeMessage((e) => {
		e.type === "session" ? (s = e.session_id, c.splice(0).forEach(l)) : e.type === "answer" ? a.setRemoteDescription({
			type: "answer",
			sdp: e.answer
		}).catch((e) => r(String(e))) : e.type === "candidate" ? a.addIceCandidate(e.candidate).catch(() => void 0) : e.type === "error" && r(e.message);
	}, {
		type: "camera/webrtc/offer",
		entity_id: t,
		offer: a.localDescription.sdp
	});
	return () => {
		u().catch(() => void 0), a.close(), n.srcObject = null;
	};
}
//#endregion
//#region src/commander/motion.ts
var ht = {
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
}, gt = (e) => new Date(e).toLocaleTimeString([], {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit"
}), _t = ({ since: e, until: t }) => t === void 0 ? `Motion since ${gt(e)}` : e === void 0 ? `Motion until ${gt(t)}` : `Motion ${gt(e)} to ${gt(t)}`, vt = class {
	constructor() {
		this.began = /* @__PURE__ */ new Map();
	}
	seen(e, t, n, r) {
		let i = {
			...ht,
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
function yt(e, t, n, r) {
	if (!e) return H;
	let i = {
		...ht,
		...n
	}, [a, o, s] = i.motion_colour, [c, l] = i.motion_corner.split("-");
	return B`<div class="motion-tile" style=${t}>
    <span
      class="motion ${i.motion_pulse > 0 ? "pulse" : ""}"
      title=${_t(e)}
      style="${c}:6px;${l}:6px;--cm-motion:rgb(${a},${o},${s});--cm-motion-size:${i.motion_size}px;--cm-motion-pulse:${i.motion_pulse}s"
      @click=${r}
    ></span>
  </div>`;
}
var bt = P`
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
`, xt = 1e4, St = () => location.pathname.split("/")[1] ?? "", Ct = new URL(import.meta.url).searchParams.get("v") || "dev", wt = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", Tt = 4096e3;
function Et(e, t, n) {
	let r = Math.min(1, Math.sqrt(Tt / (e * n * t * n))), [i, a] = [8 * q(e * n * r / 8), 8 * q(t * n * r / 8)];
	return Math.min(i, a) >= 64 ? [
		i,
		a,
		Math.round(n * r * 100) / 100 || 1
	] : null;
}
var Dt = null;
function Ot(e, t = !1) {
	if (t || !Dt || Date.now() > Dt.until) {
		let t = e.callWS({ type: "casa_mia_commander/picture_token" }).then((e) => e.token);
		Dt = {
			value: t,
			until: Date.now() + 432e5
		}, t.catch(() => Dt = null);
	}
	return Dt.value;
}
function kt(e) {
	return Object.entries(e.states).filter(([e, t]) => e.startsWith("select.") && t.attributes.card).map(([e, t]) => ({
		value: e,
		label: String(t.attributes.friendly_name ?? e)
	}));
}
//#endregion
//#region src/commander/card.ts
var At = class extends G {
	constructor(...e) {
		super(...e), this.preview = !1, this._natural = "", this._token = "", this.retry = 0, this.liveOn = "", this.liveWait = 0, this._playing = !1, this._liveFailed = "", this.liveFails = 0, this._shown = 0, this.shows = 0, this._framed = "", this.frameWait = 0, this.motion = new vt(), this._size = null, this._box = [0, 0], this._fit = null, this.settle = 0, this.resize = new ResizeObserver(([e]) => {
			let { width: t, height: n } = e.contentRect;
			this._box = [Math.round(t * 10) / 10, Math.round(n * 10) / 10], this.measure(), this.debugOn() && this.requestUpdate();
			let r = Et(t, n, O(window.devicePixelRatio || 1, this.viaHa(), this._config?.away_sharpness));
			clearTimeout(this.settle), String(r) !== String(this._size) && (this._size ? this.settle = window.setTimeout(() => this._size = r, 400) : this._size = r);
		}), this._width = 0, this.measure = () => {
			let e = C(this, this.layout === "grid" && typeof this._config?.grid_options?.rows == "number");
			JSON.stringify(e) !== JSON.stringify(this._fit) && (this._fit = e), this.clientWidth !== this._width && (this._width = this.clientWidth);
		}, this.widthWatch = new ResizeObserver(() => this.measure()), this.visibility = () => {
			let e = document.hidden ? "page hidden" : this.isConnected ? St() === this.home ? this.inView ? "" : "out of view" : "left the dashboard" : "off the page";
			if (e) {
				let t = document.hidden ? 0 : this._config?.leave_after ?? 15;
				t ? this._shown && !this.leaving && (this.leaving = window.setTimeout(() => this.cut(e), t * 1e3)) : this.cut(e);
				return;
			}
			clearTimeout(this.leaving), this.leaving = 0, this._shown ||= (this.sid = Math.random().toString(36).slice(2), ++this.shows);
		}, this.sid = "", this.streaming = "", this.leaving = 0, this.home = "", this.inView = !1, this.onScreen = new IntersectionObserver((e) => {
			this.inView = e[e.length - 1].isIntersecting, this.visibility();
		});
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
			_playing: { state: !0 },
			_liveFailed: { state: !0 },
			_shown: { state: !0 },
			_framed: { state: !0 },
			preview: { type: Boolean },
			layout: { attribute: !1 }
		};
	}
	debugOn() {
		return !!((this._config?.entity ? this.hass?.states[this._config.entity] : void 0)?.attributes.card)?.layout.debug?.on;
	}
	connectedCallback() {
		super.connectedCallback(), document.addEventListener("visibilitychange", this.visibility), window.addEventListener("location-changed", this.visibility), window.addEventListener("popstate", this.visibility), this.home = St();
		let e = this.renderRoot?.querySelector(".box");
		e && this.onScreen.observe(e), this.unwatch = T(this.measure), this.widthWatch.observe(this), requestAnimationFrame(this.measure);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.motion.stop(), document.removeEventListener("visibilitychange", this.visibility), window.removeEventListener("location-changed", this.visibility), window.removeEventListener("popstate", this.visibility), this.onScreen.disconnect(), this.inView = !1, this.visibility(), this.unwatch?.(), this.widthWatch.disconnect(), this.resize.disconnect(), clearTimeout(this.settle), clearTimeout(this.retry), clearTimeout(this.frameWait), this.stopLive();
	}
	cut(e) {
		clearTimeout(this.leaving), this.leaving = 0, this._shown && (this._shown = 0, this.done(e), this.renderRoot?.querySelector(".picture")?.setAttribute("src", wt));
	}
	done(e) {
		let t = this.streaming;
		this.streaming = "", t.includes(".mjpg?") && navigator.sendBeacon(`${t.replace(".mjpg?", "/done?")}&why=${encodeURIComponent(e)}`);
	}
	editing() {
		return this.preview || b(this);
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
		return e?.security_look ? te(e.look_tint ?? k.tint, e.look_strength ?? k.strength, e.look_darkness ?? k.darkness) : "";
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
		t !== this._framed && (e.naturalWidth > 0 ? this._framed = t : this.frameWait = window.setTimeout(() => this.watchFrame(), 200));
	}
	updated() {
		this.watchFrame(), this.measure(), this.streaming && this.editing() && this.done("editing");
		let e = this.renderRoot.querySelector(".box");
		e && (this.resize.observe(e), this.onScreen.observe(e)), this.followLive();
		let t = this.renderRoot.querySelector(".picture"), n = t?.naturalWidth ? `${t.naturalWidth} x ${t.naturalHeight}` : "";
		this.debugOn() && n && n !== this._natural && (this._natural = n);
	}
	static getConfigElement() {
		return document.createElement("casa-mia-commander-editor");
	}
	static getStubConfig(e) {
		return { entity: kt(e)[0]?.value ?? "" };
	}
	setConfig(e) {
		this._config = e;
	}
	getCardSize() {
		return 6;
	}
	getGridOptions() {
		return {
			columns: a.shown ? "full" : 6,
			rows: "auto"
		};
	}
	viaHa() {
		let e = this._config?.route ?? "auto";
		return e === "ha" || e === "auto" && !E(location);
	}
	pictureUrl(e, [t, n, r]) {
		let i = `w=${t}&h=${n}&dpr=${r}&sid=${this.sid}&v=${encodeURIComponent(Ct)}`;
		return this.viaHa() ? this._token ? `/api/casa_mia_commander/live${new URL(e.picture).pathname}?${i}&token=${this._token}` : (this.ask(), "") : `${e.picture}?${i}`;
	}
	ask(e = !1) {
		this.hass && Ot(this.hass, e).then((e) => this._token = e, () => this.retry = window.setTimeout(() => this.ask(!0), 1e4));
	}
	refused() {
		clearTimeout(this.retry), this.retry = window.setTimeout(() => this.viaHa() ? this.ask(!0) : this.again(), this.viaHa() ? 5e3 : 3e3);
	}
	again() {
		this._shown &&= (this.done("its stream failed"), this.sid = Math.random().toString(36).slice(2), ++this.shows);
	}
	now() {
		let e = this._config?.entity ? this.hass?.states[this._config.entity] : void 0, t = e?.attributes.card;
		return {
			card: t,
			main: t ? this.main(t, e.state) : ""
		};
	}
	liveMain(e, t) {
		return !!(e.live_main && this._config?.live_main !== !1 && this._liveFailed !== t && this.liveFails < 2 && this.hass?.connection);
	}
	liveEntity(e, t, n) {
		let r = e.layout.main_fit ?? "fit";
		return ee(e.cameras[t]?.channels ?? [[
			t,
			0,
			0
		]], [n[2], n[3]], r !== "fill" && r !== "crop");
	}
	followLive() {
		let { card: e, main: t } = this.now(), n = this.renderRoot.querySelector("video.live"), r = e && n && this.liveMain(e, t) ? n.dataset.entity ?? "" : "";
		if (r === this.liveOn || (this.stopLive(), !r || !n)) return;
		this.liveOn = r;
		let i = (e) => {
			if (this.liveOn !== r) return;
			this.liveFails += 1;
			let n = this.liveFails >= 2 ? `; ${this.liveFails} in a row, so no more tries until the page reloads` : "";
			console.info(`casa-mia: live main camera ${r}: ${e}; the drawn picture instead${n}`), this.stopLive(), this._liveFailed = t;
		};
		this.liveWait = window.setTimeout(() => i("not playing in time"), xt), n.onplaying = () => {
			clearTimeout(this.liveWait), this.liveFails = 0, this._playing = !0;
		}, mt(this.hass.connection, r, n, i).then((e) => this.liveOn === r ? this.liveStop = e : e(), (e) => i(String(e)));
	}
	stopLive() {
		clearTimeout(this.liveWait), this.liveStop?.(), this.liveStop = void 0, this.liveOn = "", this._playing = !1;
	}
	main(e, t) {
		let n = Object.entries(e.cameras).find(([, e]) => e.title === t);
		return n ? n[0] : e.start;
	}
	render() {
		let e = this._config?.entity ? this.hass?.states[this._config.entity] : void 0, t = e?.attributes.card;
		if (!t) return B`<ha-card
        ><div class="note">
          ${this._config?.entity ? e ? "Not drawn yet: give this commander cameras on the Camera Commander page" : `No commander at ${this._config.entity}` : "Choose a commander"}
        </div></ha-card
      >`;
		if (!t.picture) return B`<ha-card><div class="note">Its picture's address is not known yet (the app has no LAN address).</div></ha-card>`;
		let n = this.main(t, e.state);
		this._liveFailed && this._liveFailed !== n && (this._liveFailed = "");
		let r = this.editing(), i = !r && this.liveMain(t, n), a = t.layout, o = this._size, [s, c, l] = o ?? [
			a.width,
			a.height,
			1
		], u = o && !r ? this.pictureUrl(t, o) : "", d = u && i ? `${u}&main=video` : u, f = r && o ? this.stillUrl(t, o) : "", p = o ? {
			...a,
			width: s,
			height: c,
			gap: q(a.gap * l),
			margin: q((a.margin ?? 0) * l),
			scale: l
		} : a, [[m, h], g, _] = ft(p, n), v = ([e, t, n, r]) => `left:${e / m * 100}%;top:${t / h * 100}%;width:${n / m * 100}%;height:${r / h * 100}%`, y = p.highlight ?? {}, b = this.motion.seen(this.hass, e.attributes.motion ?? {}, this._config, () => this.requestUpdate()), x = K.flatMap((e) => p[e].cameras.map((t, n) => [t, _[e][n]])).find(([e]) => e === n)?.[1], S = this._fit, C = this._width ? this._width / pt(a, n, this._width, this.shapeOf(t, n)) : a.width / a.height, T = S && this._width ? w(S, this._width, C) : null;
		return B`<ha-card style=${!S || S.mode === "tile" || S.mode === "cell" ? `height:100%;aspect-ratio:${a.width}/${a.height}` : T ? `height:${T}px` : ""}>
      <div class="box">
        <div class="seen" style="filter:${this.look()}">
        ${r ? f ? B`<img class="still" src=${f} alt="" />` : H : d && this._shown ? it(this._shown, B`<img
                class="picture"
                data-cm-own
                src=${this.streaming = d}
                alt=""
                @load=${(e) => {
			let t = e.target;
			this._natural = `${t.naturalWidth} x ${t.naturalHeight}`;
		}}
                @error=${() => this.refused()}
              />`) : H}
        ${i && g[2] > 0 ? B`<video
                class="live"
                data-entity=${this.liveEntity(t, n, g) ?? ""}
                style="${v(g)};object-fit:${{
			fill: "fill",
			crop: "cover"
		}[a.main_fit ?? "fit"] ?? "contain"};opacity:${+!!this._playing}"
                autoplay
                playsinline
                .muted=${!0}
              ></video>
              <div class="caption" style=${v(g)}><span>${t.cameras[n]?.title ?? n}${this._playing ? " (live)" : ""}</span></div>` : H}
        </div>
        ${r ? B`<div class="hatch"><span>Still picture while editing</span></div>` : H}
        ${a.debug?.on ? B`<div class="debug" style="color:${a.debug.colour ?? "#ffd60a"}">
              ${this._fit?.mode ?? "?"} (in ${this._fit?.container || "?"}), room ${this._fit?.room ?? "?"} px<br />
              card box ${this._box[0]} x ${this._box[1]} CSS px, screen ${window.devicePixelRatio}x<br />
              asked ${this._size ? `${s} x ${c} @${l}x` : "nothing yet"}; picture ${this._natural || "not loaded"}
              ${this.viaHa() ? "through Home Assistant" : "direct"}
            </div>` : H}
        ${K.flatMap((e) => p[e].cameras.map((r, i) => _[e][i][2] > 0 && r !== n ? B`<div class="zone" style=${v(_[e][i])} title=${t.cameras[r]?.title ?? r} @click=${() => this.choose(t, r)}></div>` : H))}
        <div class="zone" style=${v(g)} @click=${() => this.open(t, n)}></div>
        ${x && x[2] > 0 && this._framed === (r ? "still" : `s${this._shown}`) ? B`<img
              class="highlight ${Number(y.pulse) > 0 ? y.style ?? "breathe" : ""}"
              src=${wt}
              alt=""
              style="${v(x)};border:${y.width}px solid ${y.colour};box-shadow:0 0 ${y.blur}px ${y.colour};--cm-colour:${y.colour};--cm-blur:${y.blur}px;--cm-pulse:${y.pulse}s;--cm-style:${y.style}"
            />` : H}
        ${K.flatMap((e) => p[e].cameras.map((r, i) => _[e][i][2] > 0 ? yt(b.get(r), v(_[e][i]), this._config, () => r === n ? this.open(t, r) : this.choose(t, r)) : H))}
        ${g[2] > 0 ? yt(b.get(n), v(g), this._config, () => this.open(t, n)) : H}
      </div>
    </ha-card>`;
	}
	choose(e, t) {
		this.hass?.callService("select", "select_option", { option: e.cameras[t]?.title }, { entity_id: this._config.entity });
	}
	open(e, r) {
		let i = this._config?.tap_main ?? "more-info", a = e.cameras[r]?.live;
		i === "live" && a ? n(a) : i !== "none" && t(this, "hass-more-info", { entityId: r });
	}
	static {
		this.styles = [bt, P`
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
      align-items: flex-end;
      padding: 0 0 10px 10px;
      pointer-events: none;
    }
    .caption span {
      padding: 2px 6px;
      background: rgb(0 0 0 / 0.63);
      color: #fff;
      font: 20px/1.2 sans-serif;
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
  `];
	}
}, jt = {
	tap_main: "more-info",
	route: "auto",
	away_sharpness: "balanced",
	live_main: !0,
	leave_after: 15,
	security_look: !1,
	look_tint: k.tint,
	look_strength: k.strength,
	look_darkness: k.darkness,
	...ht
};
function Mt(e) {
	return Object.fromEntries(Object.entries(e).filter(([e, t]) => !(e in jt) || JSON.stringify(t) !== JSON.stringify(jt[e])));
}
var Nt = class extends G {
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
		if (!this.hass || !this._config) return H;
		let e = [
			{
				name: "entity",
				selector: { select: {
					mode: "dropdown",
					options: kt(this.hass)
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
							value: "none",
							label: "Nothing"
						}
					]
				} }
			}
		], n = {
			entity: "Commander",
			tap_main: "A tap on the main camera",
			route: "The picture",
			away_sharpness: "Sharpness through Home Assistant",
			live_main: "Main camera as live video",
			leave_after: "Picture kept running once out of sight",
			security_look: "Security look",
			look_tint: "Security look: tint",
			look_strength: "Security look: strength",
			look_darkness: "Security look: darker",
			motion_dot: "Motion dot",
			motion_colour: "Motion dot: colour",
			motion_size: "Motion dot: size",
			motion_pulse: "Motion dot: pulse",
			motion_linger: "Motion dot: stays after the motion",
			motion_corner: "Motion dot: corner"
		};
		return B`<ha-form
      .hass=${this.hass}
      .data=${{
			...jt,
			...this._config
		}}
      .schema=${e}
      .computeLabel=${(e) => n[e.name]}
      .computeHelper=${(e) => e.name === "entity" ? "The commanders built on the Camera Commander page (each one's Main camera select)." : e.name === "security_look" ? "The pictures in monochrome, tinted, like a security control room: the picture, the main camera's live video and its caption (not the highlight)." : e.name === "route" ? "At home: this page reached Home Assistant over http at a home address (a private IP, a .local name). Through Home Assistant works anywhere you can sign in, at a little cost to Home Assistant." : e.name === "away_sharpness" ? "How sharp the picture is when it comes through Home Assistant (away from home): a 2x screen at Full is four times the bytes of Light. Direct at home it is always the screen's own." : e.name === "live_main" ? "The main camera plays as live video over the picture, through Home Assistant's WebRTC (this device decodes it; the box does not). Needs the Camera compositor's Live main camera switch on; a video that does not start gives way to the drawn picture." : e.name === "motion_dot" ? "A small dot on a camera's tile while its motion sensor sees motion (the sensor Track motion uses), and for a while after; hover it for when." : e.name === "motion_pulse" ? "Seconds each pulse takes; 0: a steady dot." : e.name === "motion_linger" ? "Seconds the dot stays once the motion has stopped, so a short one is not missed. 0: it goes at once." : e.name === "leave_after" ? "Seconds the picture goes on once the card is out of sight (another page in Home Assistant, scrolled away), so coming back (the back button) finds it running; then it stops, and the box sends nothing more. 0: at once. Closing the app always stops it at once." : void 0}
      @value-changed=${(e) => {
			e.stopPropagation(), this._config = Mt(e.detail.value), t(this, "config-changed", { config: this._config });
		}}
    ></ha-form>`;
	}
};
o("casa-mia-commander", At), o("casa-mia-commander-editor", Nt), s("casa-mia-commander", "Casa Mia Camera Commander", "One of the Camera Commander page's commanders: tap a camera to make it the main one.");
//#endregion
//#region src/garnish.ts
var Pt = (e) => e.view_layout?.garnish !== !0 && e.view_layout?.counts !== !1, Ft = /* @__PURE__ */ new Set([
	"custom:casa-mia-commander",
	"picture",
	"picture-entity",
	"picture-glance",
	"map",
	"iframe",
	"custom:advanced-camera-card",
	"custom:webrtc-camera"
]), It = (e) => e.view_layout?.fill ?? Ft.has(e.type);
function Lt(e, t) {
	let { view_layout: n = {}, ...r } = e, { counts: i, garnish: a, ...o } = n;
	return t && (o.garnish = !0), {
		...r,
		...Object.keys(o).length && { view_layout: o }
	};
}
function Rt(e) {
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
var zt = ["main", ...K];
function Y(e, t) {
	let n = e?.view_layout;
	if (n?.panel === void 0) return t < zt.length ? {
		layer: 1,
		place: zt[t]
	} : null;
	let r = Number(n.layer ?? 1);
	return zt.includes(n.panel) && Number.isInteger(r) && r >= 1 && r <= 4 ? {
		layer: r,
		place: n.panel
	} : null;
}
function X(e, t) {
	let n = e;
	for (let e = 1; e < t; e++) n = n?.inner ?? {};
	return n ?? {};
}
function Bt(e, t, n) {
	return t <= 1 ? n(e) : {
		...e,
		inner: Bt(e.inner ?? {}, t - 1, n)
	};
}
function Vt(e, t) {
	let n = e[t];
	return !n || n.place === "main" ? n ? [t] : [] : e.flatMap((e, t) => e && e.layer === n.layer && e.place === n.place ? [t] : []);
}
var Ht = {
	main: "Main",
	left: "Left",
	top: "Top",
	right: "Right",
	bottom: "Bottom"
};
function Ut(e, t) {
	let n = e[t];
	if (!n) return "";
	let r = Vt(e, t);
	return `${n.layer > 1 && n.place !== "main" ? `L${n.layer} ` : ""}${Ht[n.place]}${r.length > 1 ? ` ${r.indexOf(t) + 1}` : ""}`;
}
function Wt(e, t) {
	let n = Gt(e);
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
	}), ...e.filter((e, t) => !Y(e, t))];
}
var Gt = (e) => e.flatMap((e, t) => {
	let n = Y(e, t);
	return n ? [{
		from: t,
		...n
	}] : [];
}), Kt = (e, t) => t !== "main" && e[t]?.size === "auto";
function qt(e, t) {
	let n = e.map((e) => {
		let t = typeof e.columns == "number" ? e.columns : 12;
		return Math.min(e.max_columns ?? Infinity, Math.max(e.min_columns ?? 0, t));
	});
	return t ? n.reduce((e, t) => e + t, 0) : Math.max(0, ...n);
}
var Jt = (e, t, n, r = 8) => e > 0 ? Math.max(0, Math.round(e * (t + r) / (12 * n) - r)) : 0;
function Yt(t, n, r, i, a, o) {
	let s = {
		width: n,
		height: r,
		aspects: {}
	};
	for (let [n, r] of Object.entries(e.main)) s[n] = t[n] ?? r.default;
	for (let c of K) {
		let l = t[c] ?? {}, u = c === "top" || c === "bottom" ? r : n, d = Kt(t, c) ? u > 0 ? a(c) / u * 100 : 0 : l.size;
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
var Xt = [
	"top",
	"right",
	"bottom",
	"left"
];
function Zt(e) {
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
var Qt = (e, t) => e == null || e === "" ? t : Math.max(0, Number(e) || 0);
function $t(t, n) {
	let r = X(t, n), i = Number(t.gap ?? e.main.gap.default);
	return {
		gap: i,
		middle: Object.fromEntries(K.map((e) => [e, Qt(r[e]?.gap, i)]))
	};
}
function en(e, t, n, r, i = 4, a = "start") {
	let o = n.length, s = n.map((e, t) => t), [c, l] = [s.filter((e) => !n[e].hold), s.filter((e) => n[e].hold)], u = (e) => n[e].gapAfter ?? t, d = (e) => e.slice(0, -1).reduce((e, t) => e + u(t), 0), f = Math.max(0, e - d([...c, ...l])), p = (e) => r ? e.share !== void 0 : e.length !== void 0, m = (e) => !p(e) && (e.size === "fill" || e.size === void 0 && o === 1), h = n.map((e) => m(e) ? 0 : r ? e.share === void 0 ? e.wide || f / i : f * e.share : e.length ?? e.tall ?? 0), g = h.reduce((e, t) => e + t, 0), _ = n.filter(m).length, v = g > f ? f / g : 1, y = h.map((e, t) => m(n[t]) ? Math.max(0, f - g) / _ : e * v), b = (e) => e.reduce((e, t) => e + y[t], 0) + d(e), x = e - (l.length ? b(l) + (c.length ? u(c[c.length - 1]) : 0) : 0) - b(c), S = _ ? 0 : a === "end" ? x : a === "centre" ? x / 2 : 0, C = [], w = Math.max(0, S);
	for (let e of c) [C[e], w] = [w, w + y[e] + u(e)];
	w = e - (l.length ? b(l) : 0);
	for (let e of l) [C[e], w] = [w, w + y[e] + u(e)];
	return s.map((e) => {
		let t = Math.round(C[e]);
		return {
			at: t,
			length: Math.round(C[e] + y[e]) - t
		};
	});
}
var tn = (e, t) => Math.floor(e / t);
function nn(t, n, r) {
	let { width: i, height: a } = t, o = dt(t, r), s = (e) => t[e].cameras.length > 0, c = (e, n) => s(e) ? t[e].unit === "px" ? Math.min(q(t[e].size * (t.scale ?? 1)), tn(n * 45, 100)) : q(n * t[e].size / 100) : 0, l = (n, r) => {
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
		let r = Number(t.panel_min ?? e.main.panel_min.default), c = (e, t, i) => (s(t) ? q(e * r / 100) + n[t] : 0) + (s(i) ? q(e * r / 100) + n[i] : 0), l = i - c(i, "left", "right"), g = a - c(a, "top", "bottom");
		m = Math.min(q(i * Number(t.main_width ?? e.main.main_width.default) / 100), l), h = q(m / o), h > g && ([h, m] = [g, q(g * o)]);
		let _ = (e, t, r) => {
			let [i, a] = [s(t), s(r)], o = Math.max(e - (i ? n[t] : 0) - (a ? n[r] : 0), 0);
			return i && a ? [tn(o, 2), o - tn(o, 2)] : i ? [o, 0] : a ? [0, o] : [0, 0];
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
		g + tn(_ - g - m, 2),
		v + tn(y - v - h, 2),
		m,
		h
	]), {
		mid: C,
		edges: Object.fromEntries(K.map((e) => [e, s(e) ? S[e] : null]))
	};
}
function rn() {
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
var an = (e) => Math.max(1, ...e.flatMap((e) => e && e.place !== "main" ? [e.layer] : []));
function on(e, t, n, r, i = 4, a = !1) {
	let o = an(r);
	if (!n || o < 2 || a) return sn(e, t, n, r, i, n, a);
	let s = sn(e, t, !1, r, i, !0);
	if (s.boxes.length < o) return sn(e, t, n, r, i);
	let c = e;
	for (let t = 1; t < o; t++) {
		let [n, r] = [s.boxes[t - 1], s.boxes[t]], { middle: i } = $t(e, t), a = (e, t) => e > 0 ? e - i[t] : 0, o = {
			left: a(r[0] - n[0], "left"),
			top: a(r[1] - n[1], "top"),
			right: a(n[0] + n[2] - r[0] - r[2], "right"),
			bottom: a(n[1] + n[3] - r[1] - r[3], "bottom")
		};
		c = Bt(c, t, (e) => ({
			...e,
			...Object.fromEntries(K.map((t) => [t, {
				...e[t],
				size: o[t],
				unit: "px"
			}]))
		}));
	}
	let l = s.boxes[o - 1];
	return sn(c, [t[0] + s.canvas[0] - l[2], t[1] + s.canvas[1] - l[3]], !0, r, i);
}
function sn(e, [t, n], r, i, a, o = r, s = !1) {
	let c = Math.max(0, Math.floor((Math.min(t, n) - 1) / 2)), l = Zt(e.margin).map((e) => Math.min(e, c)), u = l.map((e) => !r || s || e <= 25 ? e : 0), [d, f] = [t - u[1] - u[3], n - u[0] - u[2]], p = an(i), m = i.findIndex((e) => e?.place === "main" && e.shows), [h, g] = [rn(), rn()], _ = [], v = [], y = [], [b, x, S, C] = [
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
		let s = (e) => i.flatMap((n, r) => n && n.layer === t && n.place === e && n.shows ? [r] : []), c = i.some((e) => e?.shows && e.place !== "main" && e.layer > t), l = (e) => e === "main" ? m >= 0 || t < p && c : s(e).length > 0, u = (e) => Math.max(0, ...s(e).map((t) => (e === "top" || e === "bottom" ? i[t].tall : i[t].wide) ?? 0)), d = X(e, t), f = {
			...Yt({
				...e,
				...Object.fromEntries(K.map((e) => [e, d[e]])),
				...t < p && { main_fit: "fit" }
			}, n[2], n[3], l, u, o),
			margin: 0
		}, w = $t(e, t), { mid: T, edges: E } = nn(f, w.middle, l("main") ? "main" : null), D = (e) => E[e] ?? [
			0,
			0,
			0,
			0
		], [O, ee, k, te] = [
			D("left")[2],
			D("top")[3],
			D("right")[2],
			D("bottom")[3]
		], A = w.middle, j = h.add(b.at + O, b, x), M = h.add(b.at + (O && O + A.left), j, x), N = h.add(x.at - (k && k + A.right), M, x), ne = h.add(x.at - k, N, x), re = g.add(S.at + ee, S, C), P = g.add(S.at + (ee && ee + A.top), re, C), F = g.add(C.at - (te && te + A.bottom), P, C), ie = g.add(C.at - te, F, C), I = (e, t) => !!f[e][`anchor_${t}`], ae = (e, t) => E[e] !== null && I(e, t), oe = {
			top: {
				cross: [S, re],
				along: [I("top", "left") ? b : M, I("top", "right") ? x : N]
			},
			bottom: {
				cross: [ie, C],
				along: [I("bottom", "left") ? b : M, I("bottom", "right") ? x : N]
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
		for (let e of K) {
			if (!E[e]) continue;
			let n = e === "top" || e === "bottom", r = n ? h : g, { cross: o, along: c } = oe[e], [l, u] = c, f = s(e), p = en(u.at - l.at, w.gap, f.map((e) => i[e]), n, a, d[e]?.arrange), m = f.map((e, t) => t).sort((e, t) => p[e].at - p[t].at), v = l, b = [];
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
function cn(e, t, n = (e) => e.rect) {
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
var ln = /* @__PURE__ */ new Map();
function un(e, t) {
	let n = `${e}/${t}`, r = ln.get(n);
	return r || ln.set(n, r = { naturals: {} }), r;
}
//#endregion
//#region src/view/common.ts
function dn(e, t) {
	let n = [];
	for (let r = e; r; r = r.parentElement ?? (r.getRootNode().host || null)) {
		let e = r.getBoundingClientRect?.().height ?? 0;
		e > t + 1 && n.push(`${r.tagName.toLowerCase()} ${Math.round(e)}`);
	}
	return n.length ? `\ntoo tall: ${n.join("\n")}` : "";
}
function fn(e, t) {
	let n, r = !1;
	return e.connection.subscribeMessage((e) => t(e?.tablet_view ?? {}), { type: "casa_mia/settings/subscribe" }).then((e) => r ? e() : n = e).catch(() => t({})), () => {
		r = !0, n?.();
	};
}
var pn = (t) => Math.max(0, Number(t.header_space ?? e.main.header_space.default) || 0), [mn, hn] = [56, 8], gn = "casa-mia-tablet-dimensions", _n = "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z", vn = "M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z";
function yn(e) {
	return (e?.querySelector("hui-grid-section"))?.shadowRoot?.querySelector(".container")?.offsetHeight ?? 0;
}
//#endregion
//#region src/view/styles.ts
var bn = P`
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
  .cm-ends button {
    position: absolute;
    pointer-events: auto;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .cm-ends button.cm-line {
    transform: translate(-50%, -50%);
    font-size: 10px;
    padding: 1px 6px;
  }
  .cm-ends button.cm-lock {
    transform: translate(-50%, -50%);
    width: 26px;
    height: 26px;
    padding: 4px;
    border-radius: 50%;
    border: 1px solid var(--primary-color);
    color: var(--primary-color);
    background: var(--card-background-color, #fff);
  }
  .cm-ends button.cm-lock.on {
    color: var(--text-primary-color, #fff);
    background: var(--primary-color);
  }
  .cm-ends button.cm-lock svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  .cm-tools button,
  .cm-ends button {
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
    padding: 3px 10px;
    border: none;
    border-radius: 12px;
    color: var(--text-primary-color, #fff);
    background: var(--primary-color);
    cursor: pointer;
    white-space: nowrap;
  }
  .cm-tools .cm-chip {
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .cm-tools button:not(.cm-chip) {
    padding: 3px 8px;
  }
  .cm-tools button[disabled] {
    opacity: 0.4;
    cursor: default;
  }
  .cm-tools.cm-narrow button:not(.cm-chip) {
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
    font: 11px/14px var(--ha-font-family-code, monospace);
    padding: 1px 6px;
    border: 1px solid currentColor;
    border-radius: 8px;
    color: inherit;
    background: var(--card-background-color, #fff);
    cursor: pointer;
    white-space: nowrap;
  }
  .cm-dims button.cm-size {
    transform: translate(-100%, -100%);
    border-color: transparent;
    color: var(--secondary-text-color);
    background: color-mix(in srgb, var(--card-background-color, #fff) 80%, transparent);
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
`, xn = new CSSStyleSheet();
xn.replaceSync("\n  .add { min-width: var(--row-height, 56px); } /* edit mode: HA's Add card button never narrower than tall */\n  :host([cm-fill]) ha-sortable { display: contents; }\n  :host([cm-fill]) .container { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; margin: 0; }\n  :host([cm-fill]) .card { flex: none; }\n  :host([cm-fill]) .card:has(> [cm-fill]) { flex: 1 1 0; min-height: 0; }\n  [cm-fill], [cm-fill] > * { display: block; height: 100%; }\n");
//#endregion
//#region src/view/base.ts
var Sn = (e) => class extends e {
	constructor(...e) {
		super(...e), this.cmDebug = !1, this.cmApp = {}, this.cmLayout = {}, this.cmBoxes = [], this.cmGapsNow = [], this.cmSections = [], this.cmColumns = 4, this.cmFrame = 0, this.cmAdding = !1, this.cmSeen = new ResizeObserver(() => this.cmLater()), this.cmLater = () => {
			cancelAnimationFrame(this.cmFrame), this.cmFrame = requestAnimationFrame(() => this.cmPlace());
		};
	}
	static {
		this.styles = [e.styles, bn];
	}
	get cmSeenOut() {
		return un(location.pathname.split("/")[1], this.index);
	}
	setConfig(e) {
		super.setConfig(e), this.cmDebug = !!e.debug, this.cmMarks(), this.cmLayout = e.layout ?? {}, this.cmSections = e.sections ?? [], this.cmColumns = Number(e.max_columns) || 4;
	}
	connectedCallback() {
		super.connectedCallback(), a.shown++, this.cmHolder = this.parentElement?.parentElement, this.cmHolder?.style.setProperty("min-height", "100dvh"), document.documentElement.style.setProperty("height", "100dvh"), this.cmSeen.observe(this), this.cmStop = T(() => this.cmLater()), this.addEventListener("section-visibility-changed", this.cmLater), this.addEventListener("card-visibility-changed", this.cmLater);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), a.shown--, this.cmHolder?.style.removeProperty("min-height"), document.documentElement.style.removeProperty("height"), this.cmSeen.disconnect(), this.cmStop?.(), this.removeEventListener("section-visibility-changed", this.cmLater), this.removeEventListener("card-visibility-changed", this.cmLater), cancelAnimationFrame(this.cmFrame), this.cmUnwatch?.(), this.cmUnwatch = void 0;
	}
	cmMarks() {
		this.toggleAttribute("cm-identify", this.cmDebug || !!this.cmApp.identify_panels), this.style.setProperty("--cm-outline", this.cmApp.identify_outline || "1px solid red");
	}
	updated(e) {
		super.updated?.(e);
		let t = !!this.lovelace?.editMode;
		this.toggleAttribute("editing", t);
		let n = this.shadowRoot?.querySelector(".container > ha-sortable");
		n && (n.disabled = !0), t && this.cmComplete(), !this.cmUnwatch && this.hass && (this.cmUnwatch = fn(this.hass, (e) => {
			this.cmApp = e, this.cmMarks(), this.cmLater();
		})), this.cmLater();
	}
	cmComplete() {
		let e = this.lovelace.config.views[this.index].sections ?? [], t = zt.filter((t) => !e.some((e, n) => Y(e, n)?.layer === 1 && Y(e, n)?.place === t));
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
			return localStorage.getItem(gn) !== "off";
		} catch {
			return !0;
		}
	}
	set cmDimsOn(e) {
		try {
			localStorage.setItem(gn, e ? "on" : "off");
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
			length: Number(e.row_span) * (mn + hn) - hn
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
		return qt((this.sections[e]?._cards ?? []).filter((e) => !e.hidden).map((e) => e.getGridOptions?.() ?? {}), t === "top" || t === "bottom");
	}
	cmCards(e, t, n) {
		if (t.place === "main") return {};
		let r = t.place === "top" || t.place === "bottom", i = Kt(X(this.cmLayout, t.layer), t.place), a = this.cmCardColumns(e, t.place), [o, s, c, l] = Zt(this.cmSections[e]?.view_layout?.padding), u = () => ({ wide: Jt(a || 12, n, this.cmColumns) + l + s }), d = () => ({ tall: (a ? this.cmNatural(e) : Math.max(mn, this.cmNatural(e))) + o + c });
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
		let i = yn(n);
		return this.lovelace?.editMode || (this.cmSeenOut.naturals[t] = i), i;
	}
	cmGridColumns(e, t) {
		let n = t[e], r = t.flatMap((e, t) => e?.shows && e.layer === n.layer && e.place === n.place ? [t] : []), i = (e) => this.cmCardColumns(e, n.place);
		return n.place === "top" || n.place === "bottom" ? n.share === void 0 && n.size !== "fill" && r.length > 1 && i(e) || null : n.place === "main" || !Kt(X(this.cmLayout, n.layer), n.place) ? null : Math.max(0, ...r.map(i)) || null;
	}
	cmGrid(e, t) {
		let n = e?.querySelector("hui-grid-section");
		n && (t === null ? (n.style.removeProperty("--base-column-count"), n.style.removeProperty("--column-span")) : (n.style.setProperty("--base-column-count", String(t)), n.style.setProperty("--column-span", "1")));
	}
	cmFill(e, t) {
		let n = e?.querySelector("hui-grid-section");
		if (!n?.shadowRoot) return;
		let r = n.shadowRoot.adoptedStyleSheets;
		r.includes(xn) || (n.shadowRoot.adoptedStyleSheets = [...r, xn]);
		let i = t.length === 1 && It(t[0].config ?? { type: "" }) ? t[0] : null;
		n.toggleAttribute("cm-fill", !!i);
		for (let t of e._cards ?? []) t.toggleAttribute("cm-fill", t === i);
	}
	cmShow() {
		if (!this.cmDebug && !this.cmApp.show_size) return this.cmLabel?.remove();
		this.cmLabel?.isConnected || (this.cmLabel = document.createElement("div"), this.cmLabel.className = "cm-debug", this.shadowRoot?.prepend(this.cmLabel));
		let e = this.getBoundingClientRect(), t = document.documentElement;
		this.cmLabel.textContent = `view ${Math.round(e.width)} x ${Math.round(e.height)}, room ${x(this)}\npage scrolls ${t.scrollWidth - t.clientWidth} x ${t.scrollHeight - t.clientHeight}` + dn(this, t.clientHeight);
	}
	cmPlace() {}
}, Z = "auto", Cn = /* @__PURE__ */ new Set(["fit", "lines"]), wn = (t) => ({
	...e.panels[t],
	unit: "%",
	hide_empty: !0,
	arrange: "start"
}), Q = (e) => e === "top" || e === "bottom", $ = (e, t) => ({ number: {
	min: e,
	max: t,
	mode: "box",
	unit_of_measurement: "px"
} });
function Tn(t) {
	let n = {};
	for (let [r, i] of Object.entries(t)) if (r === "inner") {
		let e = Tn(i ?? {});
		Object.keys(e).length && (n.inner = e);
	} else if (K.includes(r)) {
		let e = wn(r), t = Object.fromEntries(Object.entries(i ?? {}).filter(([t, n]) => !Cn.has(t) && n !== e[t]));
		Object.keys(t).length && (n[r] = t);
	} else i !== e.main[r]?.default && (n[r] = i);
	return n;
}
function En(e, t, n, r, i) {
	let a = !!t && typeof t == "object", o = a ? 0 : Number(t) || 0, s = (e) => a ? Number(t[e]) || 0 : o;
	return {
		data: {
			[e]: o,
			[`${e}_each`]: a,
			...Object.fromEntries(Xt.map((t) => [`${e}_${t}`, s(t)]))
		},
		schema: [...a ? Xt.map((t) => ({
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
			...Object.fromEntries(Xt.map((t) => [`${e}_${t}`, [`${r}, ${t}`, ""]]))
		},
		read(t) {
			return t[`${e}_each`] ? Object.fromEntries(Xt.map((n) => [n, Number(t[`${e}_${n}`] ?? t[e]) || 0])) : Number(t[e]) || 0;
		}
	};
}
function Dn(t) {
	let n = Object.fromEntries(Object.entries(e.main).map(([e, n]) => [e, t[e] ?? n.default]));
	return {
		schema: d(String(n.main_fit)).flatMap((e) => e.name === "main_fit" ? [{
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
function On(t, n, r, i, a) {
	let o = X(t, n)[r] ?? {}, s = o.size === Z, c = {
		...wn(r),
		...o,
		[Z]: s
	};
	s && (c.size = e.panels[r].size);
	let l = c.unit === "px", u = [
		{
			name: Z,
			selector: { boolean: {} }
		},
		...f(r).filter((e) => !Cn.has(e.name) && !e.name.startsWith("anchor_") && (!s || e.name !== "size" && e.name !== "unit")).map((e) => e.name === "size" && l ? {
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
			let { [Z]: o, ...s } = a, l = o ? Z : s.size === Z ? e.panels[r].size : s.size;
			if (!o && s.unit !== c.unit) {
				let [e, t] = i() ?? [0, 0], n = Q(r) ? t : e;
				n > 0 && (l = Math.round(s.unit === "px" ? n * l / 100 : Math.min(100, l * 100 / n)));
			}
			return Bt(t, n, (e) => ({
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
function kn(e, t, n) {
	let r = t.labels ?? {};
	return B`<ha-form
    .hass=${e}
    .data=${t.data}
    .schema=${t.schema}
    .computeLabel=${(e) => r[e.name]?.[0] ?? m(e)}
    .computeHelper=${(e) => r[e.name]?.[1] ?? h(e)}
    @value-changed=${(e) => {
		e.stopPropagation(), n(t.change(e.detail.value));
	}}
  ></ha-form>`;
}
function An(e, t, n, r) {
	let i = e.view_layout ?? {}, a = En("padding", i.padding ?? 0, 400, "Padding", "Room inside it, round its cards, px: to line them up."), { view_layout: o, ...s } = e, c = (e, t, n = s) => {
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
function jn(e, t) {
	let n = e.getBoundingClientRect(), [r, i] = [window.innerWidth, window.innerHeight], a = Math.max(8, Math.min(n.left, r - t.offsetWidth - 8)), o = i - n.bottom - 12, s = n.top - 12;
	return o >= 360 || o >= s ? `left:${a}px;top:${n.bottom + 4}px;max-height:${o}px` : `left:${a}px;bottom:${i - n.top + 4}px;max-height:${s}px`;
}
var Mn = class extends G {
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
		e && (this.at = jn(this.anchor(), e));
	}
	async save() {
		this.busy = !0;
		try {
			await this.commit(), this.remove();
		} finally {
			this.busy = !1;
		}
	}
	frame(e, t, n, r) {
		return B`<div class="backdrop" @click=${() => this.cancel()}></div>
      <div class="box" role="dialog" aria-label=${t} style=${this.at || "visibility:hidden"}>
        <header><h2>${e}</h2>${n}</header>
        <div class="middle">${customElements.get("ha-form") ? r : B`<p class="note">Loading…</p>`}</div>
        <footer>
          <button class="text" @click=${() => this.cancel()}>Cancel</button>
          <button class="primary" ?disabled=${this.busy} @click=${() => this.save()}>Save</button>
        </footer>
      </div>`;
	}
	static {
		this.styles = P`
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
      background: var(--card-background-color, #fff);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    header {
      flex: none;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 16px 6px;
      border-bottom: 1px solid var(--divider-color);
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
      font-weight: 500;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .actions button,
    .act {
      font: inherit;
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 16px;
      border: 1px solid var(--primary-color);
      background: none;
      color: var(--primary-color);
      cursor: pointer;
    }
    .actions button[disabled] {
      opacity: 0.35;
      cursor: default;
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
      cursor: pointer;
    }
    footer {
      flex: none;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 10px 16px 14px;
      border-top: 1px solid var(--divider-color);
    }
    footer button {
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 20px;
      border: none;
      cursor: pointer;
    }
    .text {
      background: none;
      color: var(--primary-color);
    }
    .primary {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .primary[disabled] {
      opacity: 0.5;
    }
  `;
	}
};
o("casa-mia-panel-options", class extends Mn {
	constructor(...e) {
		super(...e), this.layout = {}, this.section = {};
	}
	static {
		this.properties = {
			...Mn.properties,
			layout: { state: !0 },
			section: { state: !0 }
		};
	}
	open(e) {
		this.o = e, this.layout = e.layout, this.section = e.section, document.body.append(this), r().then(() => this.requestUpdate());
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
		return this.o.save(Tn(this.layout), this.section);
	}
	act(e) {
		this.cancel(), e?.();
	}
	group(e, t, n) {
		return B`<section>
      <h3>${e}</h3>
      ${t ? B`<p class="note">${t}</p>` : H}
      ${n}
    </section>`;
	}
	render() {
		if (!this.o) return H;
		let e = this.o, t = e.place === "main", n = e.place, r = `${e.layer > 1 ? `layer ${e.layer} ` : ""}${n} edge`, { add: i, back: a, on: o, remove: s } = e.actions, c = Q(n) ? ["←", "→"] : ["↑", "↓"], l = t ? B`<div class="actions">
          ${i ? B`<button @click=${() => this.act(i)}>+ Add a layer</button>` : H}
          ${s ? B`<button @click=${() => this.act(s)}>Remove layer ${e.count}</button>` : H}
        </div>` : B`<div class="actions">
          <button @click=${() => this.act(i)}>+ Add a panel</button>
          ${a || o ? B`<button ?disabled=${!a} aria-label="Move earlier" @click=${() => this.act(a)}>${c[0]}</button>
                <button ?disabled=${!o} aria-label="Move later" @click=${() => this.act(o)}>${c[1]}</button>` : H}
        </div>`;
		return this.frame(e.name, `${e.name} options`, l, B`${this.group("This panel", t ? "" : `${e.name} only.`, B`${kn(e.hass, An(this.section, e.place, e.columns, e.count === 1), (e) => this.change(this.layout, e))}
          <button class="link" @click=${() => this.act(e.edit)}>Visibility, background and more (HA's own)…</button>`)}
      ${t ? this.group("Whole view", "The main panel's shape.", kn(e.hass, Dn(this.layout), (e) => this.change(e))) : this.group(`Whole ${r}`, e.count > 1 ? `All ${e.count} panels of the ${r}.` : `Every panel of the ${r} (one now).`, kn(e.hass, On(this.layout, e.layer, n, e.room), (e) => this.change(e)))}`);
	}
});
function Nn(e) {
	document.createElement("casa-mia-panel-options").open(e);
}
o("casa-mia-mini", class extends Mn {
	constructor(...e) {
		super(...e), this.value = {};
	}
	static {
		this.properties = {
			...Mn.properties,
			value: { state: !0 }
		};
	}
	open(e) {
		this.o = e, this.value = e.value, document.body.append(this), r().then(() => this.requestUpdate());
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
		if (!this.o) return H;
		let e = this.o, t = e.actions?.length ? B`<div class="actions">
          ${e.actions.map((e) => B`<button
                @click=${() => {
			this.cancel(), e.run();
		}}
              >
                ${e.label}
              </button>`)}
        </div>` : H;
		return this.frame(e.title, e.title, t, B`<div class="plain">
        ${e.note ? B`<p class="note">${e.note}</p>` : H}
        ${kn(e.hass, e.form(this.value), (t) => {
			this.value = t, e.apply(t);
		})}
      </div>`);
	}
});
function Pn(e) {
	document.createElement("casa-mia-mini").open(e);
}
//#endregion
//#region src/view/edit.ts
var Fn = (t) => class extends t {
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
		let t = e(Gt(this.cmSections));
		return this.cmReseen(t), this.cmSaveView((e) => ({
			...e,
			sections: Wt(e.sections ?? [], t)
		}));
	}
	cmActions(e) {
		let t = Y(this.cmSections[e], e);
		if (!t) return {};
		if (t.place === "main") {
			let e = an(Gt(this.cmSections)), t = [
				"top",
				"left",
				"right",
				"bottom"
			];
			return {
				...e < 4 && { add: () => this.cmRestack((n) => [...n, ...t.map((t) => ({
					from: null,
					layer: e + 1,
					place: t
				}))]) },
				...e > 1 && { remove: () => {
					let t = (t) => t.place !== "main" && t.layer === e;
					(!Gt(this.cmSections).some((e) => t(e) && this.cmSections[e.from]?.cards?.length) || confirm(`Remove layer ${e}? Its panels' cards go with it.`)) && this.cmRestack((e) => e.filter((e) => !t(e)));
				} }
			};
		}
		let n = (t) => {
			let n = Gt(this.cmSections), r = n.findIndex((t) => t.from === e), i = Vt(n, r), a = i[i.indexOf(r) + t];
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
		let n = Y(this.cmSections[e], e);
		if (!n) return;
		let r = this.sections.map((e, t) => Y(this.cmSections[t], t)), i = this.shadowRoot?.querySelectorAll(".content > .section")[e], [a, o] = [this.cmLayout, this.cmSections], s = (t, n) => {
			this.cmLayout = t, this.cmSections = o.map((t, r) => r === e ? n : t), this.cmLater();
		};
		Nn({
			hass: this.hass,
			anchor: t,
			name: Ut(r, e),
			...n,
			count: n.place === "main" ? an(r) : Vt(r, e).length,
			columns: this.cmColumns,
			layout: a,
			section: o[e] ?? {},
			room: () => {
				let e = this.cmBoxes[n.layer - 1];
				return e && [e[2], e[3]];
			},
			actions: this.cmActions(e),
			edit: () => (i?.querySelector("hui-section-edit-mode"))?._editSection?.(),
			apply: s,
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
		return e.edge ? X(this.cmLayout, e.edge.layer)[e.edge.place]?.line : this.cmSections[e.after]?.view_layout?.line_after;
	}
	cmGapSet(e, t, n, r, i) {
		if (e.edge) {
			let { layer: a, place: o } = e.edge;
			return [Bt(r, a, (e) => {
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
			for (let e of K) if (t[e]) {
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
			let { layout: r, ...i } = n, a = Tn(e);
			return {
				...i,
				sections: t,
				...Object.keys(a).length && { layout: a }
			};
		});
	}
	cmMini(e, t, n, r, i, a, o = []) {
		let [s, c] = [this.cmLayout, this.cmSections];
		Pn({
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
		let t = this.sections.map((e, t) => Y(this.cmSections[t], t));
		return e.edge ? `Between the ${e.edge.layer > 1 ? `layer ${e.edge.layer} ` : ""}${e.edge.place} edge and its middle.` : `After ${Ut(t, e.after)}, to the next along its edge.`;
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
		let n = Zt(this.cmLayout.margin);
		this.cmMini(t, `Margin, ${e}`, e === "top" ? "Below the header." : e === "bottom" ? "Above the footer." : `Against the screen's ${e}.`, {
			margin: n[Xt.indexOf(e)],
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
			let o = Object.fromEntries(Xt.map((t, r) => [t, t === e ? a : n[r]]));
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
		this.cmMini(n, `${e > 1 ? `Layer ${e} ` : ""}${t[0].toUpperCase()}${t.slice(1)} edge`, t === "top" || t === "bottom" ? "How tall it is." : "How wide it is.", this.cmLayout, (n) => On(n, e, t, r, [
			"auto",
			"size",
			"unit"
		]), (e, t, n) => [e, n]);
	}
	cmHeader(e) {
		let t = this.shadowRoot?.querySelector("hui-view-header");
		this.cmMini(e, "Header", "The view's header: its title and badges.", { header_space: pn(this.cmLayout) }, (e) => ({
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
	cmAnchor(t, n, r) {
		let i = `anchor_${r}`, a = X(this.cmLayout, t)[n]?.[i] ?? e.panels[n][i], o = Bt(this.cmLayout, t, (e) => ({
			...e,
			[n]: {
				...e[n],
				[i]: !a
			}
		}));
		this.cmSaveAll(o, this.cmSections);
	}
}, In = (t) => class extends t {
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
		let i = e.querySelector(":scope > .cm-lines"), a = cn(t, (e) => this.cmLineOf(e), (e) => this.cmGapRect(e, n, r));
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
	cmDims(t, n, r, i, a, o, s) {
		if (!n) return t.querySelector(":scope > .cm-dims")?.remove();
		let c = this.cmOverlay(t, "cm-dims"), l = t.getBoundingClientRect(), u = [...t.querySelectorAll(":scope > .section")], d = (e) => {
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
			p.push(`<button ${a} style="left:${b}px;top:${x}px">${i}</button>`);
		}, _ = (e) => `${Math.round(e)} px`, v = (e, t, n) => Math.round(e + n * (t - e)), y = /* @__PURE__ */ new Map();
		r.forEach((e, t) => {
			e && e.place !== "main" && i.places[t] && d(t) && y.set(`${e.layer}.${e.place}`, [...y.get(`${e.layer}.${e.place}`) ?? [], t]);
		});
		for (let [t, n] of y) {
			let [r, a] = t.split("."), o = X(this.cmLayout, Number(r))[a] ?? {}, s = a === "top" || a === "bottom", c = Math.max(...n.map((e) => i.places[e].rect[s ? 3 : 2])), l = o.size === "auto" ? "auto" : o.unit === "px" ? "" : `${o.size ?? e.panels[a].size}%`, u = l ? `${l} · ${_(c)}` : _(c), f = n.map(d).reduce((e, t) => ({
				l: Math.min(e.l, t.l),
				t: Math.min(e.t, t.t),
				r: Math.max(e.r, t.r),
				b: Math.max(e.b, t.b)
			})), p = `title="How ${s ? "tall" : "wide"} the ${Number(r) > 1 ? `layer ${r} ` : ""}${a} edge is: as its cards, or a size"`;
			s ? g(v(f.l, f.r, .92), f.t, v(f.l, f.r, .92), f.b, u, `data-depth="${t}" ${p}`, !0) : g(f.l, v(f.t, f.b, .92), f.r, v(f.t, f.b, .92), u, `data-depth="${t}" ${p}`, !1);
		}
		for (let e of a) {
			let [t, n, r, i] = this.cmGapRect(e, o, s), a = `data-gap="${e.id}" title="This gap: its size, or every gap's; or add a line in it"`;
			e.across ? g(v(t, t + r, .3), n, v(t, t + r, .3), n + i, `gap ${e.size}`, a, !0) : g(t, v(n, n + i, .3), t + r, v(n, n + i, .3), `gap ${e.size}`, a, !1);
		}
		let [b, x, S, C] = i.inset, [w, T] = [l.width, l.height], E = (e, t) => `data-margin="${e}" title="The margin ${t}: this side, or every side"`;
		g(v(0, w, .3), -b, v(0, w, .3), 0, `margin ${b}`, E("top", "below the header"), !0), g(v(0, w, .3), T, v(0, w, .3), T + S, `margin ${S}`, E("bottom", "above the footer"), !0), g(-C, v(0, T, .3), 0, v(0, T, .3), `margin ${C}`, E("left", "against the screen's left"), !1), g(w, v(0, T, .3), w + x, v(0, T, .3), `margin ${x}`, E("right", "against the screen's right"), !1), i.places.forEach((e, t) => {
			let n = e && d(t);
			if (!n) return;
			let [r, i, a, o] = Zt(this.cmSections[t]?.view_layout?.padding), s = `data-n="${t}" title="Its padding, round its cards: in its options"`;
			r && g(v(n.l, n.r, .5), n.t, v(n.l, n.r, .5), n.t + r, `pad ${r}`, s, !0), a && g(v(n.l, n.r, .5), n.b - a, v(n.l, n.r, .5), n.b, `pad ${a}`, s, !0), o && g(n.l, v(n.t, n.b, .5), n.l + o, v(n.t, n.b, .5), `pad ${o}`, s, !1), i && g(n.r - i, v(n.t, n.b, .5), n.r, v(n.t, n.b, .5), `pad ${i}`, s, !1);
		});
		let D = t.getRootNode().querySelector("hui-view-header")?.getBoundingClientRect();
		if (D && D.height > 0) {
			let e = pn(this.cmLayout), t = Math.round(D.left - l.left + .92 * D.width);
			g(t, D.top - l.top, t, D.top - l.top + e, `space ${e}`, "data-n=\"header\" title=\"The space above the header\"", !0);
		}
		i.places.forEach((e, t) => {
			let n = e && d(t);
			n && p.push(`<button class="cm-size" data-n="${t}" title="Its size on the screen, out of edit mode; its options" style="left:${n.r - 6}px;top:${n.b - 6}px">${Math.round(e.rect[2])} × ${Math.round(e.rect[3])}</button>`);
		});
		let O = `<svg><defs><marker id="cm-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>${f.join("")}</svg>${p.join("")}`;
		c.dataset.html !== O && ([c.innerHTML, c.dataset.html] = [O, O]);
	}
	cmEditMarks(t, n, r, i) {
		if (!n) return t.querySelector(":scope > .cm-ends")?.remove();
		let a = this.cmOverlay(t, "cm-ends"), o = t.getRootNode(), s = t.getBoundingClientRect(), c = [];
		for (let e of ["header", "footer"]) {
			let t = o.querySelector(`hui-view-${e}`)?.getBoundingClientRect(), n = e === "header" ? "The header: the space above it, and HA's own editor for the rest" : "The footer: take space under the panels or float over them, and HA's own editor";
			t && t.height > 0 && c.push(`<button class="cm-chip" data-end="${e}" title="${n}" style="left:${Math.round(t.left - s.left + 10)}px;top:${Math.round(t.top - s.top + 6)}px">${e}</button>`);
		}
		for (let e of i) {
			let [t, n] = [Math.round((e.x1 + e.x2) / 2), Math.round((e.y1 + e.y2) / 2)];
			c.push(`<button class="cm-line" data-line="${e.id}" title="This line: its width, colour, style, knock and ends, or remove it" style="left:${t}px;top:${n}px">line</button>`);
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
				let o = `anchor_${r}`, s = !!(X(this.cmLayout, t)[n]?.[o] ?? e.panels[n][o]), l = Math.round(r === "left" ? i.l : i.r), u = `${t > 1 ? `Layer ${t} ` : ""}${n} edge to the ${r} side: ${s ? "on" : "off"}`, d = `${t > 1 ? `Layer ${t}'s ` : "The "}${n} edge ${s ? "runs" : "stops short of the side panel; click to run it"} to the ${r} side${s ? ", over the side panel; click to stop it short" : ""}`;
				c.push(`<button class="cm-lock ${s ? "on" : ""}" data-lock="${t}.${n}.${r}" aria-label="${u}" title="${d}" style="left:${l}px;top:${a}px"><svg viewBox="0 0 24 24"><path d="${s ? _n : vn}"/></svg></button>`);
			}
		}
		let p = c.join("");
		a.dataset.html !== p && ([a.innerHTML, a.dataset.html] = [p, p]);
	}
	cmTools(e, t, n, r) {
		let i = e.querySelector(":scope > .cm-tools");
		if (!t || !n[r]) return e.style.minWidth = "", i?.remove();
		i || (i = document.createElement("div"), i.className = "cm-tools", i.addEventListener("click", this.cmTool), e.append(i));
		let a = n[r], o = Vt(n, r), s = o.indexOf(r), c = a.place === "top" || a.place === "bottom", l = an(n), u = a.place !== "main" && X(this.cmLayout, a.layer)[a.place]?.hidden, d = a.place === "main" && l > 1 ? `Main · ${l} layers` : `${Ut(n, r)}${u ? " · hidden" : ""}`, f = a.place === "main" ? "The main panel: its padding, and the main panel's shape; add or remove a layer" : `${Ut(n, r)}: its own options, and its whole edge's`, [p, m] = c ? ["left", "right"] : ["up", "down"], h = `<button class="cm-chip" data-act="options" title="${f}">${d}</button>` + (a.place === "main" ? l < 4 ? "<button data-act=\"add\" aria-label=\"Add a layer\" title=\"Add a layer inside this one: its four edges, a panel each\">+</button>" : "" : "<button data-act=\"add\" aria-label=\"Add a panel\" title=\"Add a panel after this one, in its edge\">+</button>" + (o.length > 1 ? `<button data-act="back" aria-label="Move earlier" title="Move it ${p}, along its edge" ${s === 0 ? "disabled" : ""}>${c ? "←" : "↑"}</button><button data-act="on" aria-label="Move later" title="Move it ${m}, along its edge" ${s === o.length - 1 ? "disabled" : ""}>${c ? "→" : "↓"}</button>` : ""));
		i.dataset.html !== h && ([i.innerHTML, i.dataset.html] = [h, h]), i.dataset.n = String(r);
		let g = e.querySelector("hui-section-edit-mode"), _ = 18 + (g?.shadowRoot?.querySelector(".section-actions")?.offsetWidth ?? 0);
		i.classList.remove("cm-narrow"), i.classList.toggle("cm-narrow", i.scrollWidth > e.clientWidth - _);
		let v = i.querySelector(".cm-chip")?.offsetWidth ?? 0, y = g?.shadowRoot?.querySelector(".section-wrapper"), b = y && getComputedStyle(y), x = b ? [
			"paddingLeft",
			"paddingRight",
			"borderLeftWidth",
			"borderRightWidth"
		].reduce((e, t) => e + (parseFloat(b[t]) || 0), 0) : 0, S = parseFloat(getComputedStyle(e).getPropertyValue("--row-height")) || mn;
		e.style.minWidth = `${Math.ceil(Math.max(v + _, S + x))}px`;
		let C = b ? [
			"paddingTop",
			"paddingBottom",
			"borderTopWidth",
			"borderBottomWidth"
		].reduce((e, t) => e + (parseFloat(b[t]) || 0), 0) : 0;
		e.style.minHeight = `${Math.ceil(S + C)}px`;
	}
};
//#endregion
//#region src/view/view.ts
i().then((e) => {
	class t extends In(Fn(Sn(e))) {
		cmPlace() {
			let e = this.shadowRoot, t = e?.querySelector(".content");
			if (!t) return;
			let n = !!this.lovelace?.editMode;
			this.cmBar(n), this.toggleAttribute("cm-footer-float", this.cmLayout.footer === "float");
			let r = e.querySelector("hui-view-header"), i = this.cmLayout.header_space === void 0 ? void 0 : pn(this.cmLayout);
			r?.style.setProperty("padding-top", i === void 0 ? "" : `${i}px`);
			let a = this.cmSeenOut, [o, s] = n && a.shown ? [a.shown[0], a.shown[1] + (a.top === void 0 ? 0 : a.top - pn(this.cmLayout))] : this.cmArea();
			n || (this.cmSeenOut.shown = [o, s], this.cmSeenOut.top = r && !r.hidden ? pn(this.cmLayout) : void 0);
			let c = this.cmSections.findIndex((e, t) => Y(e, t)?.place === "main"), l = n && !(this.cmSections[c]?.cards?.length > 0), [u, d] = l ? this.cmArea() : [o, s], f = (e) => (e?._cards ?? []).filter((e) => Pt(e.config ?? { type: "" }) && !e.hidden), p = this.sections.map((e, t) => Y(this.cmSections[t], t)), m = (e) => {
				let t = p[e];
				return t.place === "top" || t.place === "bottom" ? Kt(X(this.cmLayout, t.layer), t.place) : t.place !== "main" && Vt(p, e).length > 1 && this.cmSections[e]?.view_layout?.length !== "fill";
			}, h = p.map((e, t) => {
				if (!e) return null;
				let r = this.sections[t], i = !!r && !r.hidden && (n || X(this.cmLayout, e.layer)[e.place]?.hide_empty === !1 || f(r).length > 0);
				return {
					...e,
					shows: i,
					...this.cmLock(this.cmSections[t], e.place),
					...this.cmCards(t, e, o)
				};
			}), g = on(this.cmLayout, [u, d], n, h, this.cmColumns, l);
			this.cmBoxes = g.boxes;
			let _ = n ? on(this.cmLayout, [o, s], !1, h, this.cmColumns) : g, v = g.inset.map((e) => `${e}px`).join(" "), y = g.inset.some(Boolean);
			t.style.inset = n ? "" : v, t.style.margin = n && y ? v : "", t.style.width = n && !l && (g.canvas[0] !== u || y) ? `${g.canvas[0]}px` : "", t.style.height = l ? `${g.canvas[1]}px` : "", t.style.gridTemplateColumns = g.columns, t.style.gridTemplateRows = g.rows;
			let b = [...e.querySelectorAll(".content > .section")];
			if (b.forEach((e, t) => {
				let r = g.places[t] ?? null;
				e.classList.toggle("cm-off", !r), e.classList.toggle("cm-hidden", n && !!r && !!p[t] && !!X(this.cmLayout, p[t].layer)[p[t].place]?.hidden);
				let i = this.cmSections[t]?.cards ?? [];
				e.classList.toggle("cm-garnish-only", n && !!r && !!p[t] && i.length > 0 && !i.some(Pt)), this.cmTools(e, n && !!r, p, t);
				let a = !!p[t] && p[t].place !== "main" && Vt(p, t).length > 1;
				if (e.querySelector("hui-section-edit-mode")?.toggleAttribute("cm-deletable", n && a), this.cmFill(this.sections[t], n || !p[t] || m(t) ? [] : f(this.sections[t])), this.cmGrid(this.sections[t], r && h[t] ? this.cmGridColumns(t, h) : null), !r) return;
				let o = p[t] ? Zt(this.cmSections[t]?.view_layout?.padding) : [
					0,
					0,
					0,
					0
				];
				Object.assign(e.style, {
					padding: o.some(Boolean) ? o.map((e) => `${e}px`).join(" ") : "",
					gridColumn: r.column,
					gridRow: r.row,
					width: r.width === void 0 ? "" : `${r.width}px`,
					height: r.height === void 0 ? "" : `${r.height}px`,
					justifySelf: r.centred ? "center" : "",
					alignSelf: r.centred ? "center" : ""
				});
			}), l) {
				let e = this.scrollHeight - this.clientHeight;
				e > 0 && (t.style.height = `${Math.max(0, g.canvas[1] - e)}px`);
			}
			this.cmGapsNow = g.gaps;
			let x = this.cmTracks(t), S = b.find((e) => !e.classList.contains("cm-off")), C = n && S && parseFloat(getComputedStyle(S).marginTop) || 0, w = this.cmLines(t, g.gaps, x, C);
			this.cmDims(t, n && this.cmDimsOn, p, _, g.gaps, x, C), this.cmEditMarks(t, n, p, w), this.cmShow();
		}
	}
	o("casa-mia-tablet-layout", t), o("casa-mia-tablet-view", class extends t {});
});
//#endregion
//#region src/view/patches.ts
var Ln = new CSSStyleSheet();
Ln.replaceSync(".handle, ha-dropdown-item[value=\"duplicate\"], :host(:not([cm-deletable])) ha-dropdown-item[value=\"delete\"], :host(:not([cm-deletable])) wa-divider { display: none; }\n  /* Its frame fills the panel's room, as the panel does out of edit mode (not only its cards' height). */\n  :host { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }\n  .section-wrapper { flex: 1 1 auto; box-sizing: border-box; }"), customElements.whenDefined("hui-section-edit-mode").then(() => {
	let e = customElements.get("hui-section-edit-mode").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		for (let e = this; e; e = e.parentElement ?? (e.getRootNode().host || null)) if (zn.some((t) => e.tagName === t.slice(7).toUpperCase())) {
			let e = this.shadowRoot;
			e && !e.adoptedStyleSheets.includes(Ln) && (e.adoptedStyleSheets = [...e.adoptedStyleSheets, Ln]);
			return;
		}
	};
});
var Rn = "custom:casa-mia-tablet-layout", zn = [Rn, "custom:casa-mia-tablet-view"];
customElements.whenDefined("hui-view-editor").then(() => {
	let e = customElements.get("hui-view-editor").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		let n = this._schema;
		typeof n == "function" && (this._schema = (...e) => n(...e).map((e) => {
			if (e.name === "section_specifics" && zn.includes(this._config?.type)) return {
				...e,
				visible: void 0,
				schema: e.schema.filter((e) => e.name !== "dense_section_placement")
			};
			let t = e.name === "type" ? e.selector?.select?.options : void 0;
			return !t || t.some((e) => e.value === Rn) ? e : {
				...e,
				selector: { select: {
					...e.selector.select,
					options: [...t, {
						value: Rn,
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
			n.set.call(this, zn.includes(e?.type) && e.max_columns === void 0 ? {
				...e,
				max_columns: 4
			} : e);
		}
	});
	let r = e._valueChanged;
	e._valueChanged = function(e) {
		let t = e.detail?.value;
		if (!zn.includes(t?.type)) return r.call(this, e);
		let n = new Proxy(t, { deleteProperty: (e, t) => t === "max_columns" || t === "top_margin" || Reflect.deleteProperty(e, t) });
		return r.call(this, new CustomEvent(e.type, { detail: { value: n } }));
	};
}), customElements.whenDefined("hui-dialog-edit-view").then(() => {
	let e = customElements.get("hui-dialog-edit-view").prototype, t = Object.getOwnPropertyDescriptor(e, "_type");
	t?.get && Object.defineProperty(e, "_type", {
		...t,
		get() {
			return zn.includes(this._config?.type) ? "sections" : t.get.call(this);
		}
	});
});
//#endregion
//#region src/garnish-editor.ts
var Bn = "M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z", Vn = {
	content: "Content: while this card shows, its panel shows. Tap to make it garnish.",
	garnish: "Garnish: adornment, like a heading, that never holds its panel open; the panel hides when only garnish is left. Tap to make it content."
}, Hn = new CSSStyleSheet();
Hn.replaceSync("\n  .cm-garnish {\n    position: absolute; bottom: -13px; right: 4px; z-index: 3;\n    padding: 0; border: none; background: none; cursor: pointer;\n  }\n  .cm-garnish .cm-sprig {\n    display: block; box-sizing: border-box; width: 26px; height: 26px; padding: 4px; border-radius: 50%;\n    border: 1px solid var(--primary-color); color: var(--primary-color);\n    background: var(--card-background-color, #fff); opacity: 0.6;\n  }\n  .cm-garnish:hover .cm-sprig, .cm-garnish:focus-visible .cm-sprig { opacity: 1; }\n  .cm-garnish svg { display: block; width: 16px; height: 16px; fill: currentColor; }\n  .cm-garnish[aria-pressed=\"true\"] .cm-sprig { opacity: 1; color: var(--text-primary-color, #fff); background: var(--primary-color); }\n  .cm-garnish-frame {\n    position: absolute; inset: 0; z-index: 2; pointer-events: none;\n    border: 2px dashed var(--primary-color); border-radius: var(--ha-card-border-radius, 12px);\n  }\n  :host(.cm-garnished) ::slotted(*) { opacity: 0.55; }\n"), customElements.whenDefined("hui-card-edit-mode").then(() => {
	let e = customElements.get("hui-card-edit-mode").prototype, t = e.updated;
	e.updated = function(...e) {
		t?.apply(this, e);
		let n = this.shadowRoot;
		if (!n) return;
		let r = n.querySelector(".cm-garnish"), i = !1;
		for (let e = this; e; e = e.parentElement ?? e.getRootNode().host ?? null) if (["CASA-MIA-TABLET-LAYOUT", "CASA-MIA-TABLET-VIEW"].includes(e.tagName)) {
			i = !0;
			break;
		}
		let a = Rt(this.path ?? []), o = ((e) => a.reduce((e, t) => e?.[t], e))(this.lovelace?.config);
		if (!i || !this.lovelace?.editMode || this.noEdit || !a.includes("sections") || !o?.type) return this.classList.remove("cm-garnished"), n.querySelector(".cm-garnish-frame")?.remove(), r?.remove();
		n.adoptedStyleSheets.includes(Hn) || (n.adoptedStyleSheets = [...n.adoptedStyleSheets, Hn]), r || (r = document.createElement("button"), r.type = "button", r.className = "cm-garnish", r.innerHTML = `<span class="cm-sprig"><svg viewBox="0 0 24 24"><path d="${Bn}"/></svg></span>`, r.addEventListener("pointerdown", (e) => e.stopPropagation()), r.addEventListener("click", async (e) => {
			e.stopPropagation(), r.disabled = !0;
			try {
				let e = structuredClone(this.lovelace.config), t = Rt(this.path), n = t.slice(0, -1).reduce((e, t) => e[t], e), r = t[t.length - 1], i = Pt(n[r]);
				n[r] = Lt(n[r], i), await this.lovelace.saveConfig(e), console.info(`CASA-MIA CARDS: panel card marked ${i ? "Garnish" : "Content"}`);
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
		let s = !Pt(o);
		r.setAttribute("aria-pressed", String(s)), r.title = Vn[s ? "garnish" : "content"], r.setAttribute("aria-label", r.title), this.classList.toggle("cm-garnished", s);
		let c = n.querySelector(".cm-garnish-frame");
		s && !c ? (c = document.createElement("div"), c.className = "cm-garnish-frame", n.append(c)) : s || c?.remove();
	};
}), console.info(`%cCASA-MIA CARDS\n%ccommander, tablet layout (${Ct})`, "color: green; font-weight: bold;", ""), Ct !== "dev" && window.hassConnection?.then(({ conn: e }) => {
	e.addEventListener("ready", () => e.sendMessagePromise({ type: "casa_mia/cards" }).then(({ version: e }) => {
		e && e !== Ct && (console.warn(`CASA-MIA CARDS ${Ct} running, ${e} served: reload to update`), document.querySelector("home-assistant")?.dispatchEvent(new CustomEvent("hass-notification", {
			detail: {
				message: `Casa Mia updated to ${e}: reload to use it`,
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
//#endregion
