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
var ee = {
	full: Infinity,
	balanced: 1.5,
	light: 1,
	saver: .75
};
function te(e, t, n = "balanced") {
	return t ? Math.min(e, ee[n] ?? ee.balanced) : e;
}
function A(e, t, n) {
	let r = e.filter(([, e, t]) => e > 0 && t > 0);
	return (r.find(([, e, r]) => n ? e >= t[0] || r >= t[1] : e >= t[0] && r >= t[1]) ?? r[r.length - 1] ?? e[e.length - 1])?.[0];
}
var j = {
	tint: [
		61,
		123,
		255
	],
	strength: 3,
	darkness: 20
};
function M([e, t, n], r, i) {
	let [a, o, s] = [
		e,
		t,
		n
	].map((e) => e / 255), c = Math.max(a, o, s), l = c - Math.min(a, o, s), u = 0;
	return l && (u = c === a ? (o - s) / l % 6 : c === o ? (s - a) / l + 2 : (a - o) / l + 4), `grayscale(1) sepia(1) hue-rotate(${Math.round(u * 60 - 35)}deg) saturate(${r}) brightness(${Math.max(.1, 1 - i / 100).toFixed(2)}) contrast(1.1)`;
}
function N(e, t) {
	return Object.fromEntries(Object.entries(e).filter(([e, n]) => !(e in t) || JSON.stringify(n) !== JSON.stringify(t[e])));
}
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var ne = globalThis, re = ne.ShadowRoot && (ne.ShadyCSS === void 0 || ne.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, P = Symbol(), F = /* @__PURE__ */ new WeakMap(), ie = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== P) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (re && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = F.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && F.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, ae = (e) => new ie(typeof e == "string" ? e : e + "", void 0, P), I = (e, ...t) => new ie(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, P), oe = (e, t) => {
	if (re) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = ne.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, se = re ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return ae(t);
})(e) : e, { is: ce, defineProperty: le, getOwnPropertyDescriptor: ue, getOwnPropertyNames: de, getOwnPropertySymbols: fe, getPrototypeOf: pe } = Object, me = globalThis, he = me.trustedTypes, ge = he ? he.emptyScript : "", _e = me.reactiveElementPolyfillSupport, ve = (e, t) => e, ye = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ge : null;
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
}, be = (e, t) => !ce(e, t), xe = {
	attribute: !0,
	type: String,
	converter: ye,
	reflect: !1,
	useDefault: !1,
	hasChanged: be
};
Symbol.metadata ??= Symbol("metadata"), me.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var Se = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = xe) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && le(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = ue(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? xe;
	}
	static _$Ei() {
		if (this.hasOwnProperty(ve("elementProperties"))) return;
		let e = pe(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(ve("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(ve("properties"))) {
			let e = this.properties, t = [...de(e), ...fe(e)];
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
			for (let e of n) t.unshift(se(e));
		} else e !== void 0 && t.push(se(e));
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
		return oe(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? ye : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? ye : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? be)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
Se.elementStyles = [], Se.shadowRootOptions = { mode: "open" }, Se[ve("elementProperties")] = /* @__PURE__ */ new Map(), Se[ve("finalized")] = /* @__PURE__ */ new Map(), _e?.({ ReactiveElement: Se }), (me.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var Ce = globalThis, we = (e) => e, Te = Ce.trustedTypes, Ee = Te ? Te.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, De = "$lit$", L = `lit$${Math.random().toFixed(9).slice(2)}$`, Oe = "?" + L, ke = `<${Oe}>`, Ae = document, je = () => Ae.createComment(""), Me = (e) => e === null || typeof e != "object" && typeof e != "function", Ne = Array.isArray, Pe = (e) => Ne(e) || typeof e?.[Symbol.iterator] == "function", Fe = "[ 	\n\f\r]", Ie = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Le = /-->/g, Re = />/g, ze = RegExp(`>|${Fe}(?:([^\\s"'>=/]+)(${Fe}*=${Fe}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Be = /'/g, Ve = /"/g, He = /^(?:script|style|textarea|title)$/i, R = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), Ue = Symbol.for("lit-noChange"), z = Symbol.for("lit-nothing"), We = /* @__PURE__ */ new WeakMap(), Ge = Ae.createTreeWalker(Ae, 129);
function Ke(e, t) {
	if (!Ne(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return Ee === void 0 ? t : Ee.createHTML(t);
}
var qe = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = Ie;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === Ie ? c[1] === "!--" ? o = Le : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = ze) : (He.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = ze) : o = Re : o === ze ? c[0] === ">" ? (o = i ?? Ie, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? ze : c[3] === "\"" ? Ve : Be) : o === Ve || o === Be ? o = ze : o === Le || o === Re ? o = Ie : (o = ze, i = void 0);
		let d = o === ze && e[t + 1].startsWith("/>") ? " " : "";
		a += o === Ie ? n + ke : l >= 0 ? (r.push(s), n.slice(0, l) + De + n.slice(l) + L + d) : n + L + (l === -2 ? t : d);
	}
	return [Ke(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Je = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = qe(t, n);
		if (this.el = e.createElement(l, r), Ge.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = Ge.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(De)) {
					let t = u[o++], n = i.getAttribute(e).split(L), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? $e : r[1] === "?" ? et : r[1] === "@" ? tt : Qe
					}), i.removeAttribute(e);
				} else e.startsWith(L) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (He.test(i.tagName)) {
					let e = i.textContent.split(L), t = e.length - 1;
					if (t > 0) {
						i.textContent = Te ? Te.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], je()), Ge.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], je());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === Oe) c.push({
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
		let n = Ae.createElement("template");
		return n.innerHTML = e, n;
	}
};
function Ye(e, t, n = e, r) {
	if (t === Ue) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = Me(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = Ye(e, i._$AS(e, t.values), i, r)), t;
}
var Xe = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? Ae).importNode(t, !0);
		Ge.currentNode = r;
		let i = Ge.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Ze(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new nt(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = Ge.nextNode(), a++);
		}
		return Ge.currentNode = Ae, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Ze = class e {
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
		e = Ye(this, e, t), Me(e) ? e === z || e == null || e === "" ? (this._$AH !== z && this._$AR(), this._$AH = z) : e !== this._$AH && e !== Ue && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? Pe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== z && Me(this._$AH) ? this._$AA.nextSibling.data = e : this.T(Ae.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Je.createElement(Ke(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Xe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = We.get(e.strings);
		return t === void 0 && We.set(e.strings, t = new Je(e)), t;
	}
	k(t) {
		Ne(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(je()), this.O(je()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = we(e).nextSibling;
			we(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Qe = class {
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
		if (i === void 0) e = Ye(this, e, t, 0), a = !Me(e) || e !== this._$AH && e !== Ue, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = Ye(this, r[n + o], t, o), s === Ue && (s = this._$AH[o]), a ||= !Me(s) || s !== this._$AH[o], s === z ? e = z : e !== z && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === z ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, $e = class extends Qe {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === z ? void 0 : e;
	}
}, et = class extends Qe {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== z);
	}
}, tt = class extends Qe {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = Ye(this, e, t, 0) ?? z) === Ue) return;
		let n = this._$AH, r = e === z && n !== z || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== z && (n === z || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, nt = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		Ye(this, e);
	}
}, rt = {
	M: De,
	P: L,
	A: Oe,
	C: 1,
	L: qe,
	R: Xe,
	D: Pe,
	V: Ye,
	I: Ze,
	H: Qe,
	N: et,
	U: tt,
	B: $e,
	F: nt
}, it = Ce.litHtmlPolyfillSupport;
it?.(Je, Ze), (Ce.litHtmlVersions ??= []).push("3.3.3");
var at = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Ze(t.insertBefore(je(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, ot = globalThis, B = class extends Se {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = at(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return Ue;
	}
};
B._$litElement$ = !0, B.finalized = !0, ot.litElementHydrateSupport?.({ LitElement: B });
var st = ot.litElementPolyfillSupport;
st?.({ LitElement: B }), (ot.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/lit-html/directive.js
var ct = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, lt = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), ut = class {
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
}, { I: dt } = rt, ft = {}, pt = (e, t = ft) => e._$AH = t, mt = lt(class extends ut {
	constructor() {
		super(...arguments), this.key = z;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (pt(e), this.key = t), n;
	}
}), V = [
	"left",
	"top",
	"right",
	"bottom"
], ht = [
	"stack",
	"reverse",
	"centre"
];
function H(e) {
	let t = Math.floor(e), n = e - t;
	return n > .5 ? t + 1 : n < .5 || t % 2 == 0 ? t : t + 1;
}
var U = (e, t) => Math.floor(e / t);
function gt(e, t, n, r) {
	let [i, a, o, s] = e, c = n ? s : o, l = Array.from({ length: t + 1 }, (e, n) => H(n * (c - (t - 1) * r) / t + n * r)), u = Array.from({ length: t }, (e, n) => [l[n], l[n + 1] - l[n] - (n < t - 1 ? r : 0)]);
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
function _t(e, t, n, r, i) {
	let [a, o, s, c] = e, [l, u] = n ? [s, c] : [c, s], d = t.map((e) => n ? l / e : l * e), f = u - r * (t.length - 1), p = d.reduce((e, t) => e + t, 0), m = p > 0 && f > 0 ? Math.min(1, f / p) : 0, h = Math.trunc(l * m);
	d = d.map((e) => Math.trunc(e * m));
	let g = d.reduce((e, t) => e + t, 0) + r * (t.length - 1), _ = i === "reverse" ? u - g : i === "centre" ? U(u - g, 2) : 0, v = U(l - h, 2);
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
function vt(e, t, n, r, i, a, o) {
	n = Math.max(1, Math.min(n, t));
	let s = gt(e, n, !r, i), c = [], l = 0;
	return s.forEach((e, s) => {
		let u = Math.floor(t / n) + +(s < t % n);
		c.push(...a === null ? gt(e, u, r, i) : _t(e, a.slice(l, l + u), r, i, o)), l += u;
	}), c;
}
function yt(e) {
	let t;
	if (typeof e == "number") t = e;
	else {
		let [n, r] = String(e).trim().replace("/", ":").split(":");
		t = r === void 0 ? Number(n) : Number(n) / Number(r);
	}
	if (!(t > 0)) throw Error(`not a shape: ${e}`);
	return t;
}
var bt = (t) => e.main[t].default;
function xt(e, t) {
	let n = e.main_fit ?? bt("main_fit");
	return n === "fixed" ? yt(e.main_ratio ?? bt("main_ratio")) : n === "own" ? Number((e.aspects ?? {})[t ?? ""] || 16 / 9) : null;
}
function St(t, n = null) {
	let { width: r, height: i, gap: a } = t, o = Math.max(0, Math.min(Math.trunc(Number(t.margin ?? 0)), U(Math.min(r, i) - 1, 2)));
	if (o) {
		let [, e, a] = St({
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
			Object.fromEntries(V.map((e) => [e, a[e].map(s)]))
		];
	}
	let s = xt(t, n), c = (e) => t[e].cameras.length > 0, l = (e, n) => c(e) ? t[e].unit === "px" ? Math.min(H(t[e].size * (t.scale ?? 1)), U(n * 45, 100)) : H(n * t[e].size / 100) : 0, u = (n, r) => {
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
		let e = Number(t.panel_min ?? bt("panel_min")), n = (t, n, r) => (Number(c(n)) + Number(c(r))) * (H(t * e / 100) + a), o = r - n(r, "left", "right"), l = i - n(i, "top", "bottom");
		h = Math.min(H(r * Number(t.main_width ?? bt("main_width")) / 100), o), g = H(h / s), g > l && ([g, h] = [l, H(l * s)]);
		let u = (e, t, n) => {
			let [r, i] = [c(t), c(n)], o = Math.max(e - a * (Number(r) + Number(i)), 0);
			return r && i ? [U(o, 2), o - U(o, 2)] : r ? [o, 0] : i ? [0, o] : [0, 0];
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
	}, w = (e) => ht.includes(t[e].fit ?? "") ? t[e].cameras.map((e) => Number((t.aspects ?? {})[e] || 16 / 9)) : null, T = Object.fromEntries(V.map((e) => [e, c(e) ? vt(C[e], t[e].cameras.length, Math.trunc(Number(t[e].lines ?? 1)), e === "left" || e === "right", a, w(e), t[e].fit ?? "cover") : []])), E = [
		_,
		y,
		v - _,
		b - y
	];
	return s !== null && (h = Math.min(h, v - _), g = Math.min(g, b - y), E = [
		_ + U(v - _ - h, 2),
		y + U(b - y - g, 2),
		h,
		g
	]), [
		[r, i],
		E,
		T
	];
}
function Ct(e, t, n, r) {
	let i = (r) => St({
		...e,
		width: n,
		height: r
	}, t)[1], a = xt(e, t) !== null, [o, s] = [1, Math.max(64, Math.ceil(n * 4))], c = i(s)[2], l = (e) => {
		let [, , t, n] = i(e);
		return a ? t >= c : n > 0 && t <= n * r;
	};
	if (!c || !l(s)) return Math.round(n / r);
	for (; o < s;) {
		let e = U(o + s, 2);
		l(e) ? s = e : o = e + 1;
	}
	return o;
}
//#endregion
//#region ../../app/web/src/webrtc.ts
async function wt(e, t, n, r) {
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
var Tt = {
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
}, Et = (e) => new Date(e).toLocaleTimeString([], {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit"
}), Dt = ({ since: e, until: t }) => t === void 0 ? `Motion since ${Et(e)}` : e === void 0 ? `Motion until ${Et(t)}` : `Motion ${Et(e)} to ${Et(t)}`, Ot = class {
	constructor() {
		this.began = /* @__PURE__ */ new Map();
	}
	seen(e, t, n, r) {
		let i = {
			...Tt,
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
function kt(e, t, n, r) {
	if (!e) return z;
	let i = {
		...Tt,
		...n
	}, [a, o, s] = i.motion_colour, [c, l] = i.motion_corner.split("-");
	return R`<div class="motion-tile" style=${t}>
    <span
      class="motion ${i.motion_pulse > 0 ? "pulse" : ""}"
      title=${Dt(e)}
      style="${c}:6px;${l}:6px;--cm-motion:rgb(${a},${o},${s});--cm-motion-size:${i.motion_size}px;--cm-motion-pulse:${i.motion_pulse}s"
      @click=${r}
    ></span>
  </div>`;
}
var At = I`
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
`, jt = 1e4;
function Mt(e, t, n) {
	if (t && n - t < 5e3) return { live: !0 };
	let r = t || e;
	return n - r < 5e3 ? null : { lost: Nt(n - r) };
}
function Nt(e) {
	let t = Math.floor(e / 1e3);
	if (t < 60) return `${t} s`;
	if (t < 3600) return `${Math.floor(t / 60)} min`;
	let n = Math.floor(t / 60) % 60;
	return `${Math.floor(t / 3600)} h${n ? ` ${n} min` : ""}`;
}
var Pt = () => location.pathname.split("/")[1] ?? "", Ft = new URL(import.meta.url).searchParams.get("v") || "dev", It = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", Lt = 4096e3;
function Rt(e, t, n) {
	let r = Math.min(1, Math.sqrt(Lt / (e * n * t * n))), [i, a] = [8 * H(e * n * r / 8), 8 * H(t * n * r / 8)];
	return Math.min(i, a) >= 64 ? [
		i,
		a,
		Math.round(n * r * 100) / 100 || 1
	] : null;
}
var zt = null;
function Bt(e, t = !1) {
	if (t || !zt || Date.now() > zt.until) {
		let t = e.callWS({ type: "casa_mia_commander/picture_token" }).then((e) => e.token);
		zt = {
			value: t,
			until: Date.now() + 432e5
		}, t.catch(() => zt = null);
	}
	return zt.value;
}
function Vt(e) {
	return Object.entries(e.states).filter(([e, t]) => e.startsWith("select.") && t.attributes.card).map(([e, t]) => ({
		value: e,
		label: String(t.attributes.friendly_name ?? e)
	}));
}
//#endregion
//#region src/commander/card.ts
var Ht = class extends B {
	constructor(...e) {
		super(...e), this.preview = !1, this._natural = "", this._token = "", this.retry = 0, this.liveOn = "", this.liveWait = 0, this._playing = !1, this._liveFailed = "", this.liveFails = 0, this.frameAt = 0, this.liveFrom = 0, this.watched = null, this.counting = null, this.beat = 0, this._shown = 0, this.shows = 0, this._framed = "", this.frameWait = 0, this.motion = new Ot(), this.run = "", this._size = null, this._box = [0, 0], this._fit = null, this.settle = 0, this.resize = new ResizeObserver(([e]) => {
			let { width: t, height: n } = e.contentRect;
			this._box = [Math.round(t * 10) / 10, Math.round(n * 10) / 10], this.measure(), this.debugOn() && this.requestUpdate();
			let r = Rt(t, n, te(window.devicePixelRatio || 1, this.viaHa(), this._config?.away_sharpness));
			clearTimeout(this.settle), String(r) !== String(this._size) && (this._size ? this.settle = window.setTimeout(() => this._size = r, 400) : this._size = r);
		}), this._width = 0, this.measure = () => {
			let e = E(this, this.layout === "grid" && typeof this._config?.grid_options?.rows == "number");
			JSON.stringify(e) !== JSON.stringify(this._fit) && (this._fit = e), this.clientWidth !== this._width && (this._width = this.clientWidth);
		}, this.widthWatch = new ResizeObserver(() => this.measure()), this.onBeat = () => {
			let e = this.renderRoot?.querySelector("video.live") ?? null;
			e !== this.watched && this.watch(e), e && this.requestUpdate();
		}, this.visibility = () => {
			let e = document.hidden ? "page hidden" : this.isConnected ? Pt() === this.home ? this.inView ? "" : "out of view" : "left the dashboard" : "off the page";
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
		super.connectedCallback(), document.addEventListener("visibilitychange", this.visibility), window.addEventListener("location-changed", this.visibility), window.addEventListener("popstate", this.visibility), this.home = Pt();
		let e = this.renderRoot?.querySelector(".box");
		e && this.onScreen.observe(e), this.unwatch = O(this.measure), this.widthWatch.observe(this), requestAnimationFrame(this.measure), this.beat = window.setInterval(this.onBeat, 1e3);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.motion.stop(), document.removeEventListener("visibilitychange", this.visibility), window.removeEventListener("location-changed", this.visibility), window.removeEventListener("popstate", this.visibility), this.onScreen.disconnect(), this.inView = !1, this.visibility(), this.unwatch?.(), this.widthWatch.disconnect(), this.resize.disconnect(), clearTimeout(this.settle), clearTimeout(this.retry), clearTimeout(this.frameWait), clearInterval(this.beat), this.stopLive();
	}
	watch(e) {
		this.watched = e, this.frameAt = 0, this.liveFrom = Date.now(), e && this.countFrames(e);
	}
	countFrames(e) {
		if (this.counting === e) return;
		this.counting = e;
		let t = () => {
			if (this.watched !== e) {
				this.counting === e && (this.counting = null);
				return;
			}
			this.frameAt = Date.now(), e.requestVideoFrameCallback(t);
		};
		e.requestVideoFrameCallback?.(t);
	}
	cut(e) {
		clearTimeout(this.leaving), this.leaving = 0, this._shown && (this._shown = 0, this.done(e), this.renderRoot?.querySelector(".picture")?.setAttribute("src", It));
	}
	done(e) {
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
		return e?.security_look ? M(e.look_tint ?? j.tint, e.look_strength ?? j.strength, e.look_darkness ?? j.darkness) : "";
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
		let e = this.now().card?.run ?? "";
		e && this.run && e !== this.run && (console.info("casa-mia: the app restarted; a fresh picture stream"), this.again()), e && (this.run = e), this.watchFrame(), this.measure(), this.streaming && this.editing() && this.done("editing");
		let t = this.renderRoot.querySelector(".box");
		t && (this.resize.observe(t), this.onScreen.observe(t)), this.followLive();
		let n = this.renderRoot.querySelector(".picture"), r = n?.naturalWidth ? `${n.naturalWidth} x ${n.naturalHeight}` : "";
		this.debugOn() && r && r !== this._natural && (this._natural = r);
	}
	static getConfigElement() {
		return document.createElement("casa-mia-commander-editor");
	}
	static getStubConfig(e) {
		return { entity: Vt(e)[0]?.value ?? "" };
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
	viaHa() {
		let e = this._config?.route ?? "auto";
		return e === "ha" || e === "auto" && !k(location);
	}
	pictureUrl(e, [t, n, r]) {
		let i = `w=${t}&h=${n}&dpr=${r}&sid=${this.sid}&v=${encodeURIComponent(Ft)}`;
		return this.viaHa() ? this._token ? `/api/casa_mia_commander/live${new URL(e.picture).pathname}?${i}&token=${this._token}` : (this.ask(), "") : `${e.picture}?${i}`;
	}
	ask(e = !1) {
		this.hass && Bt(this.hass, e).then((e) => this._token = e, () => this.retry = window.setTimeout(() => this.ask(!0), 1e4));
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
		return A(e.cameras[t]?.channels ?? [[
			t,
			0,
			0
		]], [n[2], n[3]], r !== "fill" && r !== "crop");
	}
	followLive() {
		let { card: e, main: t } = this.now(), n = this.renderRoot.querySelector("video.live"), r = e && n && this.liveMain(e, t) ? n.dataset.entity ?? "" : "";
		if (r === this.liveOn || (this.stopLive(), !r || !n)) return;
		this.liveOn = r, this.watch(n);
		let i = (e) => {
			if (this.liveOn !== r) return;
			this.liveFails += 1;
			let n = this.liveFails >= 2 ? `; ${this.liveFails} in a row, so no more tries until the page reloads` : "";
			console.info(`casa-mia: live main camera ${r}: ${e}; the drawn picture instead${n}`), this.stopLive(), this._liveFailed = t;
		};
		this.liveWait = window.setTimeout(() => i("not playing in time"), jt), n.onplaying = () => {
			clearTimeout(this.liveWait), this.liveFails = 0, this._playing = !0;
		}, wt(this.hass.connection, r, n, i).then((e) => this.liveOn === r ? this.liveStop = e : e(), (e) => i(String(e)));
	}
	stopLive() {
		clearTimeout(this.liveWait), this.liveStop?.(), this.liveStop = void 0, this.liveOn = "", this._playing = !1;
	}
	caption(e, t) {
		let n = Mt(this.liveFrom, this.frameAt, Date.now());
		return R`<div class="caption" style=${t}>
      <span>${e}${n && "live" in n ? " (live)" : ""}</span>
      ${n && "lost" in n ? R`<span class="lost">Live lost ${n.lost} ago</span>` : z}
    </div>`;
	}
	main(e, t) {
		let n = Object.entries(e.cameras).find(([, e]) => e.title === t);
		return n ? n[0] : e.start;
	}
	render() {
		let e = this._config?.entity ? this.hass?.states[this._config.entity] : void 0, t = e?.attributes.card;
		if (!t) return R`<ha-card
        ><div class="note">
          ${this._config?.entity ? e ? "Not drawn yet: give this commander cameras on the Camera Commander page" : `No commander at ${this._config.entity}` : "Choose a commander"}
        </div></ha-card
      >`;
		if (!t.picture) return R`<ha-card><div class="note">Its picture's address is not known yet (the app has no LAN address).</div></ha-card>`;
		let n = this.main(t, e.state);
		this._liveFailed && this._liveFailed !== n && (this._liveFailed = "");
		let r = this.editing(), i = !r && this.liveMain(t, n), a = t.layout, o = S(this) ? [
			a.width,
			a.height,
			1
		] : this._size, [s, c, l] = o ?? [
			a.width,
			a.height,
			1
		], u = o && !r ? this.pictureUrl(t, o) : "", d = u && i ? `${u}&main=video` : u, f = r && o ? this.stillUrl(t, o) : "", p = o ? {
			...a,
			width: s,
			height: c,
			gap: H(a.gap * l),
			margin: H((a.margin ?? 0) * l),
			scale: l
		} : a, [[m, h], g, _] = St(p, n), v = ([e, t, n, r]) => `left:${e / m * 100}%;top:${t / h * 100}%;width:${n / m * 100}%;height:${r / h * 100}%`, y = p.highlight ?? {}, b = this.motion.seen(this.hass, e.attributes.motion ?? {}, this._config, () => this.requestUpdate()), x = V.flatMap((e) => p[e].cameras.map((t, n) => [t, _[e][n]])).find(([e]) => e === n)?.[1], C = this._fit, w = this._width ? this._width / Ct(a, n, this._width, this.shapeOf(t, n)) : a.width / a.height, T = C && this._width ? D(C, this._width, w) : null;
		return R`<ha-card style=${S(this) ? `aspect-ratio:${a.width}/${a.height}` : !C || C.mode === "tile" || C.mode === "cell" ? `height:100%;aspect-ratio:${a.width}/${a.height}` : T ? `height:${T}px` : ""}>
      <div class="box">
        <div class="seen" style="filter:${this.look()}">
        ${r ? f ? R`<img class="still" src=${f} alt="" />` : z : d && this._shown ? mt(this._shown, R`<img
                class="picture"
                data-cm-own
                src=${this.streaming = d}
                alt=""
                @load=${(e) => {
			let t = e.target;
			this._natural = `${t.naturalWidth} x ${t.naturalHeight}`;
		}}
                @error=${() => this.refused()}
              />`) : z}
        ${i && g[2] > 0 ? R`<video
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
              ${this.caption(t.cameras[n]?.title ?? n, v(g))}` : z}
        </div>
        ${r && !S(this) ? R`<div class="hatch"><span>Still picture while editing</span></div>` : z}
        ${a.debug?.on ? R`<div class="debug" style="color:${a.debug.colour ?? "#ffd60a"}">
              ${this._fit?.mode ?? "?"} (in ${this._fit?.container || "?"}), room ${this._fit?.room ?? "?"} px<br />
              card box ${this._box[0]} x ${this._box[1]} CSS px, screen ${window.devicePixelRatio}x<br />
              asked ${this._size ? `${s} x ${c} @${l}x` : "nothing yet"}; picture ${this._natural || "not loaded"}
              ${this.viaHa() ? "through Home Assistant" : "direct"}
            </div>` : z}
        ${V.flatMap((e) => p[e].cameras.map((r, i) => _[e][i][2] > 0 && r !== n ? R`<div class="zone" style=${v(_[e][i])} title=${t.cameras[r]?.title ?? r} @click=${() => this.choose(t, r)}></div>` : z))}
        <div class="zone" style=${v(g)} @click=${() => this.open(t, n)}></div>
        ${x && x[2] > 0 && this._framed === (r ? "still" : `s${this._shown}`) ? R`<img
              class="highlight ${Number(y.pulse) > 0 ? y.style ?? "breathe" : ""}"
              src=${It}
              alt=""
              style="${v(x)};border:${y.width}px solid ${y.colour};box-shadow:0 0 ${y.blur}px ${y.colour};--cm-colour:${y.colour};--cm-blur:${y.blur}px;--cm-pulse:${y.pulse}s;--cm-style:${y.style}"
            />` : z}
        ${V.flatMap((e) => p[e].cameras.map((r, i) => _[e][i][2] > 0 ? kt(b.get(r), v(_[e][i]), this._config, () => r === n ? this.open(t, r) : this.choose(t, r)) : z))}
        ${g[2] > 0 ? kt(b.get(n), v(g), this._config, () => this.open(t, n)) : z}
      </div>
    </ha-card>`;
	}
	choose(e, t) {
		this.hass?.callService("select", "select_option", { option: e.cameras[t]?.title }, { entity_id: this._config.entity });
	}
	open(e, n) {
		let r = this._config?.tap_main ?? "more-info", a = e.cameras[n]?.live;
		r === "live" && a ? i(a) : r !== "none" && t(this, "hass-more-info", { entityId: n });
	}
	static {
		this.styles = [At, I`
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
    /* No frame for a while: said in red beside the title (RULE FIVE). */
    .caption .lost {
      margin-left: 6px;
      background: rgb(200 30 30 / 0.9);
      font-weight: 600;
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
}, Ut = {
	tap_main: "more-info",
	route: "auto",
	away_sharpness: "balanced",
	live_main: !0,
	leave_after: 15,
	security_look: !1,
	look_tint: j.tint,
	look_strength: j.strength,
	look_darkness: j.darkness,
	...Tt
};
function Wt(e) {
	return N(e, Ut);
}
var Gt = class extends B {
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
		if (!this.hass || !this._config) return z;
		let e = [
			{
				name: "entity",
				selector: { select: {
					mode: "dropdown",
					options: Vt(this.hass)
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
		return R`<ha-form
      .hass=${this.hass}
      .data=${{
			...Ut,
			...this._config
		}}
      .schema=${e}
      .computeLabel=${(e) => n[e.name]}
      .computeHelper=${(e) => e.name === "entity" ? "The commanders built on the Camera Commander page (each one's Main camera select)." : e.name === "security_look" ? "The pictures in monochrome, tinted, like a security control room: the picture, the main camera's live video and its caption (not the highlight)." : e.name === "route" ? "At home: this page reached Home Assistant over http at a home address (a private IP, a .local name). Through Home Assistant works anywhere you can sign in, at a little cost to Home Assistant." : e.name === "away_sharpness" ? "How sharp the picture is when it comes through Home Assistant (away from home): a 2x screen at Full is four times the bytes of Light. Direct at home it is always the screen's own." : e.name === "live_main" ? "The main camera plays as live video over the picture, through Home Assistant's WebRTC (this device decodes it; the box does not). Needs the Camera compositor's Live main camera switch on; a video that does not start gives way to the drawn picture." : e.name === "motion_dot" ? "A small dot on a camera's tile while its motion sensor sees motion (the sensor Track motion uses), and for a while after; hover it for when." : e.name === "motion_pulse" ? "Seconds each pulse takes; 0: a steady dot." : e.name === "motion_linger" ? "Seconds the dot stays once the motion has stopped, so a short one is not missed. 0: it goes at once." : e.name === "leave_after" ? "Seconds the picture goes on once the card is out of sight (another page in Home Assistant, scrolled away), so coming back (the back button) finds it running; then it stops, and the box sends nothing more. 0: at once. Closing the app always stops it at once." : void 0}
      @value-changed=${(e) => {
			e.stopPropagation(), this._config = Wt(e.detail.value), t(this, "config-changed", { config: this._config });
		}}
    ></ha-form>`;
	}
};
c("casa-mia-commander", Ht), c("casa-mia-commander-editor", Gt), l("casa-mia-commander", "Casa Mia Camera Commander", "One of the Camera Commander page's commanders: tap a camera to make it the main one.");
//#endregion
//#region src/over-layer/common.ts
var Kt = "custom:casa-mia-over-layer", qt = [
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
], Jt = {
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
}, Yt = (e) => ({
	...Jt,
	...e
}), Xt = (e) => !!e?.some((e) => e?.type === "custom:casa-mia-over-layer" && e.panel === !0);
function Zt(e) {
	let t = qt.findIndex((t) => t.includes(e));
	return t < 0 ? [1, 1] : [t, qt[t].indexOf(e)];
}
function Qt(e, t) {
	let [n, r] = Zt(t);
	return qt[e === "scroll" ? 0 : n][r];
}
function $t(e) {
	let [t, n] = Zt(e), r = [
		"flex-start",
		"center",
		"flex-end"
	];
	return {
		justify: r[n],
		align: r[t]
	};
}
function en(e) {
	let t = Yt(e), n = Qt(t.mode, t.anchor), r = t.mode === "full" || n === "center" || t.mode === "scroll" && n === "top" ? "" : ` ${n}`, i = {
		float: "float",
		full: "full screen",
		scroll: "scroll with the view"
	}[t.mode] + r;
	return `Over layer · ${t.panel ? "its whole panel · " : ""}${i} · ${t.cover === "window" ? "the whole window" : "the view"}${t.block ? "" : " · taps pass through"}`;
}
//#endregion
//#region src/garnish.ts
var tn = (e) => e.view_layout?.garnish !== !0 && e.type !== "custom:casa-mia-over-layer", nn = (e) => {
	let t = e.filter((e) => !e.hidden);
	return t.length > 0 && t.every((e) => !!e.config && !tn(e.config));
};
function rn(e) {
	for (let t = e; t; t = t.parentElement ?? (t.getRootNode().host || null)) if (["CASA-MIA-TABLET-LAYOUT", "CASA-MIA-TABLET-VIEW"].includes(t.tagName)) return !0;
	return !1;
}
var an = /* @__PURE__ */ new Set([
	"custom:casa-mia-commander",
	"picture",
	"picture-entity",
	"picture-glance",
	"map",
	"iframe",
	"custom:advanced-camera-card",
	"custom:webrtc-camera"
]), on = (e) => e.view_layout?.fill ?? an.has(e.type);
function sn(e, t) {
	let { view_layout: n = {}, ...r } = e, { garnish: i, ...a } = n;
	return t && (a.garnish = !0), {
		...r,
		...Object.keys(a).length && { view_layout: a }
	};
}
function cn(e) {
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
var ln = ["main", ...V];
function W(e, t) {
	let n = e?.view_layout;
	if (n?.panel === void 0) return t < ln.length ? {
		layer: 1,
		place: ln[t]
	} : null;
	let r = Number(n.layer ?? 1);
	return ln.includes(n.panel) && Number.isInteger(r) && r >= 1 && r <= 4 ? {
		layer: r,
		place: n.panel
	} : null;
}
function G(e, t) {
	let n = e;
	for (let e = 1; e < t; e++) n = n?.inner ?? {};
	return n ?? {};
}
function un(e, t, n) {
	return t <= 1 ? n(e) : {
		...e,
		inner: un(e.inner ?? {}, t - 1, n)
	};
}
function dn(e, t) {
	let n = e[t];
	return !n || n.place === "main" ? n ? [t] : [] : e.flatMap((e, t) => e && e.layer === n.layer && e.place === n.place ? [t] : []);
}
var fn = {
	main: "Main",
	left: "Left",
	top: "Top",
	right: "Right",
	bottom: "Bottom"
};
function pn(e, t) {
	let n = e[t];
	if (!n) return "";
	let r = dn(e, t);
	return `${n.layer > 1 && n.place !== "main" ? `L${n.layer} ` : ""}${fn[n.place]}${r.length > 1 ? ` ${r.indexOf(t) + 1}` : ""}`;
}
function mn(e, t) {
	let n = hn(e);
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
	}), ...e.filter((e, t) => !W(e, t))];
}
var hn = (e) => e.flatMap((e, t) => {
	let n = W(e, t);
	return n ? [{
		from: t,
		...n
	}] : [];
}), gn = (e, t) => t !== "main" && e[t]?.size === "auto";
function _n(e, t) {
	let n = e.map((e) => {
		let t = typeof e.columns == "number" ? e.columns : 12;
		return Math.min(e.max_columns ?? Infinity, Math.max(e.min_columns ?? 0, t));
	});
	return t ? n.reduce((e, t) => e + t, 0) : Math.max(0, ...n);
}
var vn = (e, t, n, r = 8) => e > 0 ? Math.max(0, Math.round(e * (t + r) / (12 * n) - r)) : 0;
function yn(t, n, r, i, a, o) {
	let s = {
		width: n,
		height: r,
		aspects: {}
	};
	for (let [n, r] of Object.entries(e.main)) s[n] = t[n] ?? r.default;
	for (let c of V) {
		let l = t[c] ?? {}, u = c === "top" || c === "bottom" ? r : n, d = gn(t, c) ? u > 0 ? a(c) / u * 100 : 0 : l.size;
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
var bn = [
	"top",
	"right",
	"bottom",
	"left"
];
function xn(e) {
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
var Sn = (e, t) => e == null || e === "" ? t : Math.max(0, Number(e) || 0);
function Cn(t, n) {
	let r = G(t, n), i = Number(t.gap ?? e.main.gap.default);
	return {
		gap: i,
		middle: Object.fromEntries(V.map((e) => [e, Sn(r[e]?.gap, i)]))
	};
}
function wn(e, t, n, r, i = 4, a = "start") {
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
var Tn = (e, t) => Math.floor(e / t);
function En(t, n, r) {
	let { width: i, height: a } = t, o = xt(t, r), s = (e) => t[e].cameras.length > 0, c = (e, n) => s(e) ? t[e].unit === "px" ? Math.min(H(t[e].size * (t.scale ?? 1)), Tn(n * 45, 100)) : H(n * t[e].size / 100) : 0, l = (n, r) => {
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
		let r = Number(t.panel_min ?? e.main.panel_min.default), c = (e, t, i) => (s(t) ? H(e * r / 100) + n[t] : 0) + (s(i) ? H(e * r / 100) + n[i] : 0), l = i - c(i, "left", "right"), g = a - c(a, "top", "bottom");
		m = Math.min(H(i * Number(t.main_width ?? e.main.main_width.default) / 100), l), h = H(m / o), h > g && ([h, m] = [g, H(g * o)]);
		let _ = (e, t, r) => {
			let [i, a] = [s(t), s(r)], o = Math.max(e - (i ? n[t] : 0) - (a ? n[r] : 0), 0);
			return i && a ? [Tn(o, 2), o - Tn(o, 2)] : i ? [o, 0] : a ? [0, o] : [0, 0];
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
		g + Tn(_ - g - m, 2),
		v + Tn(y - v - h, 2),
		m,
		h
	]), {
		mid: C,
		edges: Object.fromEntries(V.map((e) => [e, s(e) ? S[e] : null]))
	};
}
function Dn() {
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
var On = (e) => Math.max(1, ...e.flatMap((e) => e && e.place !== "main" ? [e.layer] : []));
function kn(e, t, n, r, i = 4, a = !1) {
	let o = On(r);
	if (!n || o < 2 || a) return An(e, t, n, r, i, n, a);
	let s = An(e, t, !1, r, i, !0);
	if (s.boxes.length < o) return An(e, t, n, r, i);
	let c = e;
	for (let t = 1; t < o; t++) {
		let [n, r] = [s.boxes[t - 1], s.boxes[t]], { middle: i } = Cn(e, t), a = (e, t) => e > 0 ? e - i[t] : 0, o = {
			left: a(r[0] - n[0], "left"),
			top: a(r[1] - n[1], "top"),
			right: a(n[0] + n[2] - r[0] - r[2], "right"),
			bottom: a(n[1] + n[3] - r[1] - r[3], "bottom")
		};
		c = un(c, t, (e) => ({
			...e,
			...Object.fromEntries(V.map((t) => [t, {
				...e[t],
				size: o[t],
				unit: "px"
			}]))
		}));
	}
	let l = s.boxes[o - 1];
	return An(c, [t[0] + s.canvas[0] - l[2], t[1] + s.canvas[1] - l[3]], !0, r, i);
}
function An(e, [t, n], r, i, a, o = r, s = !1) {
	let c = Math.max(0, Math.floor((Math.min(t, n) - 1) / 2)), l = xn(e.margin).map((e) => Math.min(e, c)), u = l.map((e) => !r || s || e <= 25 ? e : 0), [d, f] = [t - u[1] - u[3], n - u[0] - u[2]], p = On(i), m = i.findIndex((e) => e?.place === "main" && e.shows), [h, g] = [Dn(), Dn()], _ = [], v = [], y = [], [b, x, S, C] = [
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
		let s = (e) => i.flatMap((n, r) => n && n.layer === t && n.place === e && n.shows ? [r] : []), c = i.some((e) => e?.shows && e.place !== "main" && e.layer > t), l = (e) => e === "main" ? m >= 0 || t < p && c : s(e).length > 0, u = (e) => Math.max(0, ...s(e).map((t) => (e === "top" || e === "bottom" ? i[t].tall : i[t].wide) ?? 0)), d = G(e, t), f = {
			...yn({
				...e,
				...Object.fromEntries(V.map((e) => [e, d[e]])),
				...t < p && { main_fit: "fit" }
			}, n[2], n[3], l, u, o),
			margin: 0
		}, w = Cn(e, t), { mid: T, edges: E } = En(f, w.middle, l("main") ? "main" : null), D = (e) => E[e] ?? [
			0,
			0,
			0,
			0
		], [O, k, ee, te] = [
			D("left")[2],
			D("top")[3],
			D("right")[2],
			D("bottom")[3]
		], A = w.middle, j = h.add(b.at + O, b, x), M = h.add(b.at + (O && O + A.left), j, x), N = h.add(x.at - (ee && ee + A.right), M, x), ne = h.add(x.at - ee, N, x), re = g.add(S.at + k, S, C), P = g.add(S.at + (k && k + A.top), re, C), F = g.add(C.at - (te && te + A.bottom), P, C), ie = g.add(C.at - te, F, C), ae = (e, t) => !!f[e][`anchor_${t}`], I = (e, t) => E[e] !== null && ae(e, t), oe = {
			top: {
				cross: [S, re],
				along: [ae("top", "left") ? b : M, ae("top", "right") ? x : N]
			},
			bottom: {
				cross: [ie, C],
				along: [ae("bottom", "left") ? b : M, ae("bottom", "right") ? x : N]
			},
			left: {
				cross: [b, j],
				along: [I("top", "left") ? P : S, I("bottom", "left") ? F : C]
			},
			right: {
				cross: [ne, x],
				along: [I("top", "right") ? P : S, I("bottom", "right") ? F : C]
			}
		};
		for (let e of V) {
			if (!E[e]) continue;
			let n = e === "top" || e === "bottom", r = n ? h : g, { cross: o, along: c } = oe[e], [l, u] = c, f = s(e), p = wn(u.at - l.at, w.gap, f.map((e) => i[e]), n, a, d[e]?.arrange), m = f.map((e, t) => t).sort((e, t) => p[e].at - p[t].at), v = l, b = [];
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
function jn(e, t, n = (e) => e.rect) {
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
var Mn = /* @__PURE__ */ new Map();
function Nn(e, t) {
	let n = `${e}/${t}`, r = Mn.get(n);
	return r || Mn.set(n, r = { naturals: {} }), r;
}
//#endregion
//#region src/view/common.ts
function Pn(e, t) {
	let n = [];
	for (let r = e; r; r = r.parentElement ?? (r.getRootNode().host || null)) {
		let e = r.getBoundingClientRect?.().height ?? 0;
		e > t + 1 && n.push(`${r.tagName.toLowerCase()} ${Math.round(e)}`);
	}
	return n.length ? `\ntoo tall: ${n.join("\n")}` : "";
}
function Fn(e, t) {
	let n, r = !1;
	return e.connection.subscribeMessage((e) => t(e?.tablet_view ?? {}), { type: "casa_mia/settings/subscribe" }).then((e) => r ? e() : n = e).catch(() => t({})), () => {
		r = !0, n?.();
	};
}
var In = (t) => Math.max(0, Number(t.header_space ?? e.main.header_space.default) || 0), [Ln, Rn] = [56, 8], zn = "casa-mia-tablet-dimensions", Bn = "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z", Vn = "M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z";
function Hn(e) {
	return (e?.querySelector("hui-grid-section"))?.shadowRoot?.querySelector(".container")?.offsetHeight ?? 0;
}
//#endregion
//#region src/view/styles.ts
var Un = I`
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
`, Wn = new CSSStyleSheet();
Wn.replaceSync("\n  .add { min-width: var(--row-height, 56px); } /* edit mode: HA's Add card button never narrower than tall */\n  :host([cm-fill]) ha-sortable { display: contents; }\n  :host([cm-fill]) .container { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; margin: 0; }\n  :host([cm-fill]) .card { flex: none; }\n  :host([cm-fill]) .card:has(> [cm-fill]) { flex: 1 1 0; min-height: 0; }\n  [cm-fill], [cm-fill] > * { display: block; height: 100%; }\n");
var Gn = ".cm-pill, .cm-chip {\n  --surface: var(--card-background-color, #fff);\n  --muted: var(--secondary-text-color, #727272);\n  --accent: var(--primary-color, #03a9f4);\n  --on-accent: var(--text-primary-color, #fff);\n  --good: var(--success-color, #43a047);\n  --warn: var(--warning-color, #ffa600);\n  --bad: var(--error-color, #db4437);\n  --bark: #d8885a;\n  --mono: var(--ha-font-family-code, monospace);\n}\n.cm-pill{box-sizing:border-box;background:color-mix(in srgb, var(--tone,var(--muted)) 14%, transparent);max-width:100%;color:var(--tone,var(--muted));letter-spacing:.04em;text-transform:uppercase;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;border-radius:12px;padding:3px 9px;font-size:10px;font-weight:600;line-height:16px;display:inline-block;overflow:hidden}.cm-pill.cm-filled{background:var(--tone,var(--muted));color:var(--on-accent)}.cm-pill.cm-outline{box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--tone,var(--muted)) 55%, transparent);background:0 0}.cm-pill.cm-fixed{text-align:center;width:104px}.cm-chip{box-sizing:border-box;box-shadow:inset 0 0 0 1px var(--tone,var(--muted));background:var(--surface);color:var(--tone,var(--muted));font:inherit;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;cursor:pointer;border:none;border-radius:12px;justify-content:center;align-items:center;gap:4px;padding:3px 10px;font-size:10px;font-weight:500;line-height:16px;transition:box-shadow .15s,filter .15s;display:inline-flex}.cm-chip.cm-on{box-shadow:none;background:var(--tone,var(--accent));color:var(--on-accent)}.cm-chip.cm-icon{border-radius:50%;width:26px;height:26px;padding:4px}.cm-chip.cm-icon svg{fill:currentColor;width:16px;height:16px;display:block}.cm-chip.cm-mono{font:11px/14px var(--mono);letter-spacing:0;text-transform:none;border-radius:8px;padding:1px 6px}.cm-chip.cm-quiet{box-shadow:none;background:color-mix(in srgb, var(--surface) 80%, transparent);color:var(--muted)}.cm-chip:disabled{opacity:.4;cursor:default}.cm-chip:not(:disabled):hover,.cm-chip:focus-visible{box-shadow:inset 0 0 0 1px var(--tone,var(--muted)), 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent);filter:brightness(1.08);outline:none}.cm-chip.cm-on:not(:disabled):hover,.cm-chip.cm-on:focus-visible,.cm-chip.cm-quiet:not(:disabled):hover{box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent)}.cm-good{--tone:var(--good)}.cm-accent{--tone:var(--accent)}.cm-warn{--tone:var(--warn)}.cm-bad{--tone:var(--bad)}.cm-muted{--tone:var(--muted)}.cm-bark{--tone:var(--bark)}", Kn = ae(Gn), qn = (e) => class extends e {
	constructor(...e) {
		super(...e), this.cmDebug = !1, this.cmApp = {}, this.cmLayout = {}, this.cmBoxes = [], this.cmGapsNow = [], this.cmSections = [], this.cmColumns = 4, this.cmFrame = 0, this.cmAdding = !1, this.cmSeen = new ResizeObserver(() => this.cmLater()), this.cmLater = () => {
			cancelAnimationFrame(this.cmFrame), this.cmFrame = requestAnimationFrame(() => this.cmPlace());
		};
	}
	static {
		this.styles = [
			e.styles,
			Kn,
			Un
		];
	}
	get cmSeenOut() {
		return Nn(location.pathname.split("/")[1], this.index);
	}
	setConfig(e) {
		super.setConfig(e), this.cmDebug = !!e.debug, this.cmMarks(), this.cmLayout = e.layout ?? {}, this.cmSections = e.sections ?? [], this.cmColumns = Number(e.max_columns) || 4;
	}
	connectedCallback() {
		super.connectedCallback(), s.shown++, this.cmHolder = this.parentElement?.parentElement, this.cmHolder?.style.setProperty("min-height", "100dvh"), document.documentElement.style.setProperty("height", "100dvh"), this.cmSeen.observe(this), this.cmStop = O(() => this.cmLater()), this.addEventListener("section-visibility-changed", this.cmLater), this.addEventListener("card-visibility-changed", this.cmLater);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), s.shown--, this.cmHolder?.style.removeProperty("min-height"), document.documentElement.style.removeProperty("height"), this.cmSeen.disconnect(), this.cmStop?.(), this.removeEventListener("section-visibility-changed", this.cmLater), this.removeEventListener("card-visibility-changed", this.cmLater), cancelAnimationFrame(this.cmFrame), this.cmUnwatch?.(), this.cmUnwatch = void 0;
	}
	cmMarks() {
		this.toggleAttribute("cm-identify", this.cmDebug || !!this.cmApp.identify_panels), this.style.setProperty("--cm-outline", this.cmApp.identify_outline || "1px solid red");
	}
	updated(e) {
		super.updated?.(e);
		let t = !!this.lovelace?.editMode;
		this.toggleAttribute("editing", t);
		let n = this.shadowRoot?.querySelector(".container > ha-sortable");
		n && (n.disabled = !0), t && this.cmComplete(), !this.cmUnwatch && this.hass && (this.cmUnwatch = Fn(this.hass, (e) => {
			this.cmApp = e, this.cmMarks(), this.cmLater();
		})), this.cmLater();
	}
	cmComplete() {
		let e = this.lovelace.config.views[this.index].sections ?? [], t = ln.filter((t) => !e.some((e, n) => W(e, n)?.layer === 1 && W(e, n)?.place === t));
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
			return localStorage.getItem(zn) !== "off";
		} catch {
			return !0;
		}
	}
	set cmDimsOn(e) {
		try {
			localStorage.setItem(zn, e ? "on" : "off");
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
			length: Number(e.row_span) * (Ln + Rn) - Rn
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
		return _n((this.sections[e]?._cards ?? []).filter((e) => !e.hidden).map((e) => e.getGridOptions?.() ?? {}), t === "top" || t === "bottom");
	}
	cmCards(e, t, n) {
		if (t.place === "main") return {};
		let r = t.place === "top" || t.place === "bottom", i = gn(G(this.cmLayout, t.layer), t.place), a = this.cmCardColumns(e, t.place), [o, s, c, l] = xn(this.cmSections[e]?.view_layout?.padding), u = () => ({ wide: vn(a || 12, n, this.cmColumns) + l + s }), d = () => ({ tall: (a ? this.cmNatural(e) : Math.max(Ln, this.cmNatural(e))) + o + c });
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
		let i = Hn(n);
		return this.lovelace?.editMode || (this.cmSeenOut.naturals[t] = i), i;
	}
	cmGridColumns(e, t) {
		let n = t[e], r = t.flatMap((e, t) => e?.shows && e.layer === n.layer && e.place === n.place ? [t] : []), i = (e) => this.cmCardColumns(e, n.place);
		return n.place === "top" || n.place === "bottom" ? n.share === void 0 && n.size !== "fill" && r.length > 1 && i(e) || null : n.place === "main" || !gn(G(this.cmLayout, n.layer), n.place) ? null : Math.max(0, ...r.map(i)) || null;
	}
	cmGrid(e, t) {
		let n = e?.querySelector("hui-grid-section");
		n && (t === null ? (n.style.removeProperty("--base-column-count"), n.style.removeProperty("--column-span")) : (n.style.setProperty("--base-column-count", String(t)), n.style.setProperty("--column-span", "1")));
	}
	cmFill(e, t) {
		let n = e?.querySelector("hui-grid-section");
		if (!n?.shadowRoot) return;
		let r = n.shadowRoot.adoptedStyleSheets;
		r.includes(Wn) || (n.shadowRoot.adoptedStyleSheets = [...r, Wn]);
		let i = t.length === 1 && on(t[0].config ?? { type: "" }) ? t[0] : null;
		n.toggleAttribute("cm-fill", !!i);
		for (let t of e._cards ?? []) t.toggleAttribute("cm-fill", t === i);
	}
	cmShow() {
		if (!this.cmDebug && !this.cmApp.show_size) return this.cmLabel?.remove();
		this.cmLabel?.isConnected || (this.cmLabel = document.createElement("div"), this.cmLabel.className = "cm-debug", this.shadowRoot?.prepend(this.cmLabel));
		let e = this.getBoundingClientRect(), t = document.documentElement;
		this.cmLabel.textContent = `view ${Math.round(e.width)} x ${Math.round(e.height)}, room ${w(this)}\npage scrolls ${t.scrollWidth - t.clientWidth} x ${t.scrollHeight - t.clientHeight}` + Pn(this, t.clientHeight);
	}
	cmPlace() {}
}, Jn = "auto", Yn = /* @__PURE__ */ new Set(["fit", "lines"]), Xn = (t) => ({
	...e.panels[t],
	unit: "%",
	hide_empty: !0,
	arrange: "start"
}), K = (e) => e === "top" || e === "bottom", q = (e, t) => ({ number: {
	min: e,
	max: t,
	mode: "box",
	unit_of_measurement: "px"
} });
function Zn(t) {
	let n = {};
	for (let [r, i] of Object.entries(t)) if (r === "inner") {
		let e = Zn(i ?? {});
		Object.keys(e).length && (n.inner = e);
	} else if (V.includes(r)) {
		let e = Xn(r), t = Object.fromEntries(Object.entries(i ?? {}).filter(([t, n]) => !Yn.has(t) && n !== e[t]));
		Object.keys(t).length && (n[r] = t);
	} else i !== e.main[r]?.default && (n[r] = i);
	return n;
}
function Qn(e, t, n, r, i) {
	let a = !!t && typeof t == "object", o = a ? 0 : Number(t) || 0, s = (e) => a ? Number(t[e]) || 0 : o;
	return {
		data: {
			[e]: o,
			[`${e}_each`]: a,
			...Object.fromEntries(bn.map((t) => [`${e}_${t}`, s(t)]))
		},
		schema: [...a ? bn.map((t) => ({
			name: `${e}_${t}`,
			selector: q(0, n)
		})) : [{
			name: e,
			selector: q(0, n)
		}], {
			name: `${e}_each`,
			selector: { boolean: {} }
		}],
		labels: {
			[e]: [r, i],
			[`${e}_each`]: ["Each side its own", ""],
			...Object.fromEntries(bn.map((t) => [`${e}_${t}`, [`${r}, ${t}`, ""]]))
		},
		read(t) {
			return t[`${e}_each`] ? Object.fromEntries(bn.map((n) => [n, Number(t[`${e}_${n}`] ?? t[e]) || 0])) : Number(t[e]) || 0;
		}
	};
}
function $n(t) {
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
function er(t, n, r, i, a) {
	let o = G(t, n)[r] ?? {}, s = o.size === Jn, c = {
		...Xn(r),
		...o,
		[Jn]: s
	};
	s && (c.size = e.panels[r].size);
	let l = c.unit === "px", u = [
		{
			name: Jn,
			selector: { boolean: {} }
		},
		...m(r).filter((e) => !Yn.has(e.name) && !e.name.startsWith("anchor_") && (!s || e.name !== "size" && e.name !== "unit")).map((e) => e.name === "size" && l ? {
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
						label: K(r) ? "From the left" : "From the top"
					},
					{
						value: "centre",
						label: "Centred"
					},
					{
						value: "end",
						label: K(r) ? "From the right" : "From the bottom"
					}
				]
			} }
		}
	].filter((e) => !a || a.includes(e.name)), d = K(r) ? "tall" : "wide";
	return {
		schema: u,
		data: c,
		labels: {
			[Jn]: [`As ${d} as its cards`, `The edge is exactly as ${d} as what its panels hold, as cards show and hide.`],
			arrange: ["Arrange", "Where its panels sit when they do not fill it (none filling); those held to the end stay there."]
		},
		change: (a) => {
			let { [Jn]: o, ...s } = a, l = o ? Jn : s.size === Jn ? e.panels[r].size : s.size;
			if (!o && s.unit !== c.unit) {
				let [e, t] = i() ?? [0, 0], n = K(r) ? t : e;
				n > 0 && (l = Math.round(s.unit === "px" ? n * l / 100 : Math.min(100, l * 100 / n)));
			}
			return un(t, n, (e) => ({
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
function tr(e, t, n) {
	let r = t.labels ?? {};
	return R`<ha-form
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
function nr(e, t, n, r) {
	let i = e.view_layout ?? {}, a = Qn("padding", i.padding ?? 0, 400, "Padding", "Room inside it, round its cards, px: to line them up."), { view_layout: o, ...s } = e, c = (e, t, n = s) => {
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
	let l = t, u = K(l) ? "column_span" : "row_span", d = e[u] === void 0 ? i.length ?? (r ? "fill" : "cards") : "fixed";
	return {
		schema: [
			{
				name: "length",
				selector: { select: {
					mode: "list",
					options: [
						{
							value: "cards",
							label: `As ${K(l) ? "wide" : "tall"} as its cards`
						},
						{
							value: "fill",
							label: "Fill what is left"
						},
						{
							value: "fixed",
							label: K(l) ? "A fixed width" : "A fixed height"
						}
					]
				} }
			},
			...d === "fixed" ? [{
				name: u,
				selector: { number: {
					min: 1,
					max: K(l) ? n : 16,
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
			length: [K(l) ? "Width" : "Height", ""],
			column_span: ["Width", `Columns of the view's ${n} (its Width in HA's Layout tab).`],
			row_span: ["Height", "In HA's card rows (56 px each, and the gap between)."],
			hold: [`Hold to the ${K(l) ? "right" : "bottom"}`, "Against the end of its edge, whatever the others do."],
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
function rr(e, t) {
	let n = e.getBoundingClientRect(), [r, i] = [window.innerWidth, window.innerHeight], a = Math.max(8, Math.min(n.left, r - t.offsetWidth - 8)), o = i - n.bottom - 12, s = n.top - 12;
	return o >= 360 || o >= s ? `left:${a}px;top:${n.bottom + 4}px;max-height:${o}px` : `left:${a}px;bottom:${i - n.top + 4}px;max-height:${s}px`;
}
var ir = class extends B {
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
		e && (this.at = rr(this.anchor(), e));
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
		return R`<div class="backdrop" @click=${() => this.cancel()}></div>
      <div class="box" role="dialog" aria-label=${t} style=${this.at || "visibility:hidden"}>
        <header><h2>${e}</h2>${n}</header>
        <div class="middle">${customElements.get("ha-form") ? r : R`<p class="note">Loading…</p>`}</div>
        <footer>
          <button class="btn" @click=${() => this.cancel()}>Cancel</button>
          <button class="btn primary ${a ? "danger" : ""}" ?disabled=${this.busy} @click=${() => this.save()}>${i}</button>
        </footer>
      </div>`;
	}
	static {
		this.styles = [Kn, I`
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
c("casa-mia-panel-options", class extends ir {
	constructor(...e) {
		super(...e), this.layout = {}, this.section = {};
	}
	static {
		this.properties = {
			...ir.properties,
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
		return this.o.save(Zn(this.layout), this.section);
	}
	act(e) {
		this.cancel(), e?.();
	}
	group(e, t, n) {
		return R`<section>
      <h3>${e}</h3>
      ${t ? R`<p class="note">${t}</p>` : z}
      ${n}
    </section>`;
	}
	render() {
		if (!this.o) return z;
		let e = this.o, t = e.place === "main", n = e.place, r = `${e.layer > 1 ? `layer ${e.layer} ` : ""}${n} edge`, { add: i, back: a, on: o, remove: s } = e.actions, c = K(n) ? ["←", "→"] : ["↑", "↓"], l = t ? R`<div class="actions">
          ${i ? R`<button class="cm-chip" @click=${() => this.act(i)}>+ Add a layer</button>` : z}
          ${s ? R`<button class="cm-chip" @click=${() => this.act(s)}>Remove layer ${e.count}</button>` : z}
        </div>` : R`<div class="actions">
          <button class="cm-chip" @click=${() => this.act(i)}>+ Add a panel</button>
          ${a || o ? R`<button class="cm-chip" ?disabled=${!a} aria-label="Move earlier" @click=${() => this.act(a)}>${c[0]}</button>
                <button class="cm-chip" ?disabled=${!o} aria-label="Move later" @click=${() => this.act(o)}>${c[1]}</button>` : z}
        </div>`;
		return this.frame(e.name, `${e.name} options`, l, R`${this.group("This panel", t ? "" : `${e.name} only.`, R`${tr(e.hass, nr(this.section, e.place, e.columns, e.count === 1), (e) => this.change(this.layout, e))}
          <button class="link" @click=${() => this.act(e.edit)}>Visibility, background and more (HA's own)…</button>`)}
      ${t ? this.group("Whole view", "The main panel's shape.", tr(e.hass, $n(this.layout), (e) => this.change(e))) : this.group(`Whole ${r}`, e.count > 1 ? `All ${e.count} panels of the ${r}.` : `Every panel of the ${r} (one now).`, tr(e.hass, er(this.layout, e.layer, n, e.room), (e) => this.change(e)))}`);
	}
});
function ar(e) {
	document.createElement("casa-mia-panel-options").open(e);
}
c("casa-mia-mini", class extends ir {
	constructor(...e) {
		super(...e), this.value = {};
	}
	static {
		this.properties = {
			...ir.properties,
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
		if (!this.o) return z;
		let e = this.o, t = e.actions?.length ? R`<div class="actions">
          ${e.actions.map((e) => R`<button
                class="cm-chip"
                @click=${() => {
			this.cancel(), e.run();
		}}
              >
                ${e.label}
              </button>`)}
        </div>` : z;
		return this.frame(e.title, e.title, t, R`<div class="plain">
        ${e.note ? R`<p class="note">${e.note}</p>` : z}
        ${tr(e.hass, e.form(this.value), (t) => {
			this.value = t, e.apply(t);
		})}
      </div>`);
	}
});
function or(e) {
	document.createElement("casa-mia-mini").open(e);
}
c("casa-mia-confirm", class extends ir {
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
		return this.frame(t, t, z, R`<p class="plain note">${n}</p>`, this.action, this.danger);
	}
});
function sr(e, { action: t = "OK", danger: n = !1 } = {}) {
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
var cr = (t) => class extends t {
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
		let t = e(hn(this.cmSections));
		return this.cmReseen(t), this.cmSaveView((e) => ({
			...e,
			sections: mn(e.sections ?? [], t)
		}));
	}
	cmActions(e) {
		let t = W(this.cmSections[e], e);
		if (!t) return {};
		if (t.place === "main") {
			let e = On(hn(this.cmSections)), t = [
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
				...e > 1 && { remove: async () => {
					let t = (t) => t.place !== "main" && t.layer === e;
					(!hn(this.cmSections).some((e) => t(e) && this.cmSections[e.from]?.cards?.length) || await sr(`Remove layer ${e}? Its panels' cards go with it.`, {
						action: "Remove",
						danger: !0
					})) && this.cmRestack((e) => e.filter((e) => !t(e)));
				} }
			};
		}
		let n = (t) => {
			let n = hn(this.cmSections), r = n.findIndex((t) => t.from === e), i = dn(n, r), a = i[i.indexOf(r) + t];
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
		let n = W(this.cmSections[e], e);
		if (!n) return;
		let r = this.sections.map((e, t) => W(this.cmSections[t], t)), i = this.shadowRoot?.querySelectorAll(".content > .section")[e], [a, o] = [this.cmLayout, this.cmSections], s = (t, n) => {
			this.cmLayout = t, this.cmSections = o.map((t, r) => r === e ? n : t), this.cmLater();
		};
		ar({
			hass: this.hass,
			anchor: t,
			name: pn(r, e),
			...n,
			count: n.place === "main" ? On(r) : dn(r, e).length,
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
		return e.edge ? G(this.cmLayout, e.edge.layer)[e.edge.place]?.line : this.cmSections[e.after]?.view_layout?.line_after;
	}
	cmGapSet(e, t, n, r, i) {
		if (e.edge) {
			let { layer: a, place: o } = e.edge;
			return [un(r, a, (e) => {
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
			for (let e of V) if (t[e]) {
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
			let { layout: r, ...i } = n, a = Zn(e);
			return {
				...i,
				sections: t,
				...Object.keys(a).length && { layout: a }
			};
		});
	}
	cmMini(e, t, n, r, i, a, o = []) {
		let [s, c] = [this.cmLayout, this.cmSections];
		or({
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
		let t = this.sections.map((e, t) => W(this.cmSections[t], t));
		return e.edge ? `Between the ${e.edge.layer > 1 ? `layer ${e.edge.layer} ` : ""}${e.edge.place} edge and its middle.` : `After ${pn(t, e.after)}, to the next along its edge.`;
	}
	cmGap(e, t) {
		let n = this.cmLineOf(e);
		this.cmMini(t, "Gap", this.cmGapWhose(e), {
			gap: e.size,
			all: !1
		}, (e) => ({
			schema: [{
				name: "gap",
				selector: q(0, 200)
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
					selector: q(0, 40)
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
					selector: q(-200, 200)
				},
				{
					name: "extend_start",
					selector: q(-400, 400)
				},
				{
					name: "extend_end",
					selector: q(-400, 400)
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
		let n = xn(this.cmLayout.margin);
		this.cmMini(t, `Margin, ${e}`, e === "top" ? "Below the header." : e === "bottom" ? "Above the footer." : `Against the screen's ${e}.`, {
			margin: n[bn.indexOf(e)],
			all: !1
		}, (e) => ({
			schema: [{
				name: "margin",
				selector: q(0, 400)
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
			let o = Object.fromEntries(bn.map((t, r) => [t, t === e ? a : n[r]]));
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
		this.cmMini(n, `${e > 1 ? `Layer ${e} ` : ""}${t[0].toUpperCase()}${t.slice(1)} edge`, t === "top" || t === "bottom" ? "How tall it is." : "How wide it is.", this.cmLayout, (n) => er(n, e, t, r, [
			"auto",
			"size",
			"unit"
		]), (e, t, n) => [e, n]);
	}
	cmHeader(e) {
		let t = this.shadowRoot?.querySelector("hui-view-header");
		this.cmMini(e, "Header", "The view's header: its title and badges.", { header_space: In(this.cmLayout) }, (e) => ({
			schema: [{
				name: "header_space",
				selector: q(0, 200)
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
		let i = `anchor_${r}`, a = G(this.cmLayout, t)[n]?.[i] ?? e.panels[n][i], o = un(this.cmLayout, t, (e) => ({
			...e,
			[n]: {
				...e[n],
				[i]: !a
			}
		}));
		this.cmSaveAll(o, this.cmSections);
	}
}, lr = (t) => class extends t {
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
		let i = e.querySelector(":scope > .cm-lines"), a = jn(t, (e) => this.cmLineOf(e), (e) => this.cmGapRect(e, n, r));
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
			p.push(`<button class="cm-chip cm-mono" ${a} style="left:${b}px;top:${x}px">${i}</button>`);
		}, _ = (e) => `${Math.round(e)} px`, v = (e, t, n) => Math.round(e + n * (t - e)), y = /* @__PURE__ */ new Map();
		r.forEach((e, t) => {
			e && e.place !== "main" && i.places[t] && d(t) && y.set(`${e.layer}.${e.place}`, [...y.get(`${e.layer}.${e.place}`) ?? [], t]);
		});
		for (let [t, n] of y) {
			let [r, a] = t.split("."), o = G(this.cmLayout, Number(r))[a] ?? {}, s = a === "top" || a === "bottom", c = Math.max(...n.map((e) => i.places[e].rect[s ? 3 : 2])), l = o.size === "auto" ? "auto" : o.unit === "px" ? "" : `${o.size ?? e.panels[a].size}%`, u = l ? `${l} · ${_(c)}` : _(c), f = n.map(d).reduce((e, t) => ({
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
			let [r, i, a, o] = xn(this.cmSections[t]?.view_layout?.padding), s = `data-n="${t}" title="Its padding, round its cards: in its options"`;
			r && g(v(n.l, n.r, .5), n.t, v(n.l, n.r, .5), n.t + r, `pad ${r}`, s, !0), a && g(v(n.l, n.r, .5), n.b - a, v(n.l, n.r, .5), n.b, `pad ${a}`, s, !0), o && g(n.l, v(n.t, n.b, .5), n.l + o, v(n.t, n.b, .5), `pad ${o}`, s, !1), i && g(n.r - i, v(n.t, n.b, .5), n.r, v(n.t, n.b, .5), `pad ${i}`, s, !1);
		});
		let D = t.getRootNode().querySelector("hui-view-header")?.getBoundingClientRect();
		if (D && D.height > 0) {
			let e = In(this.cmLayout), t = Math.round(D.left - l.left + .92 * D.width);
			g(t, D.top - l.top, t, D.top - l.top + e, `space ${e}`, "data-n=\"header\" title=\"The space above the header\"", !0);
		}
		i.places.forEach((e, t) => {
			let n = e && d(t);
			n && p.push(`<button class="cm-chip cm-mono cm-quiet cm-size" data-n="${t}" title="Its size on the screen, out of edit mode; its options" style="left:${n.r - 6}px;top:${n.b - 6}px">${Math.round(e.rect[2])} × ${Math.round(e.rect[3])}</button>`);
		});
		let O = `<svg><defs><marker id="cm-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>${f.join("")}</svg>${p.join("")}`;
		c.dataset.html !== O && ([c.innerHTML, c.dataset.html] = [O, O]);
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
				let o = `anchor_${r}`, s = !!(G(this.cmLayout, t)[n]?.[o] ?? e.panels[n][o]), l = Math.round(r === "left" ? i.l : i.r), u = `${t > 1 ? `Layer ${t} ` : ""}${n} edge to the ${r} side: ${s ? "on" : "off"}`, d = `${t > 1 ? `Layer ${t}'s ` : "The "}${n} edge ${s ? "runs" : "stops short of the side panel; click to run it"} to the ${r} side${s ? ", over the side panel; click to stop it short" : ""}`;
				c.push(`<button class="cm-chip cm-icon cm-lock ${s ? "cm-on" : ""}" data-lock="${t}.${n}.${r}" aria-label="${u}" title="${d}" style="left:${l}px;top:${a}px"><svg viewBox="0 0 24 24"><path d="${s ? Bn : Vn}"/></svg></button>`);
			}
		}
		let p = c.join("");
		a.dataset.html !== p && ([a.innerHTML, a.dataset.html] = [p, p]);
	}
	cmTools(e, t, n, r) {
		let i = e.querySelector(":scope > .cm-tools");
		if (!t || !n[r]) return e.style.minWidth = "", i?.remove();
		i || (i = document.createElement("div"), i.className = "cm-tools", i.addEventListener("click", this.cmTool), e.append(i));
		let a = n[r], o = dn(n, r), s = o.indexOf(r), c = a.place === "top" || a.place === "bottom", l = On(n), u = a.place !== "main" && G(this.cmLayout, a.layer)[a.place]?.hidden, d = a.place === "main" && l > 1 ? `Main · ${l} layers` : `${pn(n, r)}${u ? " · hidden" : ""}`, f = a.place === "main" ? "The main panel: its padding, and the main panel's shape; add or remove a layer" : `${pn(n, r)}: its own options, and its whole edge's`, [p, m] = c ? ["left", "right"] : ["up", "down"], h = `<button class="cm-chip cm-on cm-name" data-act="options" title="${f}">${d}</button>` + (a.place === "main" ? l < 4 ? "<button class=\"cm-chip cm-on cm-tool\" data-act=\"add\" aria-label=\"Add a layer\" title=\"Add a layer inside this one: its four edges, a panel each\">+</button>" : "" : "<button class=\"cm-chip cm-on cm-tool\" data-act=\"add\" aria-label=\"Add a panel\" title=\"Add a panel after this one, in its edge\">+</button>" + (o.length > 1 ? `<button class="cm-chip cm-on cm-tool" data-act="back" aria-label="Move earlier" title="Move it ${p}, along its edge" ${s === 0 ? "disabled" : ""}>${c ? "←" : "↑"}</button><button class="cm-chip cm-on cm-tool" data-act="on" aria-label="Move later" title="Move it ${m}, along its edge" ${s === o.length - 1 ? "disabled" : ""}>${c ? "→" : "↓"}</button>` : ""));
		i.dataset.html !== h && ([i.innerHTML, i.dataset.html] = [h, h]), i.dataset.n = String(r);
		let g = e.querySelector("hui-section-edit-mode"), _ = 18 + (g?.shadowRoot?.querySelector(".section-actions")?.offsetWidth ?? 0);
		i.classList.remove("cm-narrow"), i.classList.toggle("cm-narrow", i.scrollWidth > e.clientWidth - _);
		let v = i.querySelector(".cm-name")?.offsetWidth ?? 0, y = g?.shadowRoot?.querySelector(".section-wrapper"), b = y && getComputedStyle(y), x = b ? [
			"paddingLeft",
			"paddingRight",
			"borderLeftWidth",
			"borderRightWidth"
		].reduce((e, t) => e + (parseFloat(b[t]) || 0), 0) : 0, S = parseFloat(getComputedStyle(e).getPropertyValue("--row-height")) || Ln;
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
o().then((e) => {
	class t extends lr(cr(qn(e))) {
		cmPlace() {
			let e = this.shadowRoot, t = e?.querySelector(".content");
			if (!t) return;
			let n = !!this.lovelace?.editMode;
			this.cmBar(n), this.toggleAttribute("cm-footer-float", this.cmLayout.footer === "float");
			let r = e.querySelector("hui-view-header"), i = this.cmLayout.header_space === void 0 ? void 0 : In(this.cmLayout);
			r?.style.setProperty("padding-top", i === void 0 ? "" : `${i}px`);
			let a = this.cmSeenOut, [o, s] = n && a.shown ? [a.shown[0], a.shown[1] + (a.top === void 0 ? 0 : a.top - In(this.cmLayout))] : this.cmArea();
			n || (this.cmSeenOut.shown = [o, s], this.cmSeenOut.top = r && !r.hidden ? In(this.cmLayout) : void 0);
			let c = this.cmSections.findIndex((e, t) => W(e, t)?.place === "main"), l = n && !(this.cmSections[c]?.cards?.length > 0), [u, d] = l ? this.cmArea() : [o, s], f = (e) => (e?._cards ?? []).filter((e) => tn(e.config ?? { type: "" }) && !e.hidden), p = this.sections.map((e, t) => W(this.cmSections[t], t)), m = (e) => {
				let t = p[e];
				return t.place === "top" || t.place === "bottom" ? gn(G(this.cmLayout, t.layer), t.place) : t.place !== "main" && dn(p, e).length > 1 && this.cmSections[e]?.view_layout?.length !== "fill";
			}, h = p.map((e, t) => {
				if (!e) return null;
				let r = this.sections[t], i = !!r && !r.hidden && (n || G(this.cmLayout, e.layer)[e.place]?.hide_empty === !1 || f(r).length > 0 && !Xt(this.cmSections[t]?.cards));
				return {
					...e,
					shows: i,
					...this.cmLock(this.cmSections[t], e.place),
					...this.cmCards(t, e, o)
				};
			}), g = kn(this.cmLayout, [u, d], n, h, this.cmColumns, l);
			this.cmBoxes = g.boxes;
			let _ = n ? kn(this.cmLayout, [o, s], !1, h, this.cmColumns) : g, v = g.inset.map((e) => `${e}px`).join(" "), y = g.inset.some(Boolean);
			t.style.inset = n ? "" : v, t.style.margin = n && y ? v : "", t.style.width = n && !l && (g.canvas[0] !== u || y) ? `${g.canvas[0]}px` : "", t.style.height = l ? `${g.canvas[1]}px` : "", t.style.gridTemplateColumns = g.columns, t.style.gridTemplateRows = g.rows;
			let b = [...e.querySelectorAll(".content > .section")];
			if (b.forEach((e, t) => {
				let r = g.places[t] ?? null;
				e.classList.toggle("cm-off", !r), e.classList.toggle("cm-hidden", n && !!r && !!p[t] && !!G(this.cmLayout, p[t].layer)[p[t].place]?.hidden);
				let i = this.cmSections[t]?.cards ?? [];
				e.classList.toggle("cm-garnish-only", n && !!r && !!p[t] && i.length > 0 && (!i.some(tn) || Xt(i))), this.cmTools(e, n && !!r, p, t);
				let a = !!p[t] && p[t].place !== "main" && dn(p, t).length > 1;
				if (e.querySelector("hui-section-edit-mode")?.toggleAttribute("cm-deletable", n && a), this.cmFill(this.sections[t], n || !p[t] || m(t) ? [] : f(this.sections[t])), this.cmGrid(this.sections[t], r && h[t] ? this.cmGridColumns(t, h) : null), !r) return;
				let o = p[t] ? xn(this.cmSections[t]?.view_layout?.padding) : [
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
	c("casa-mia-tablet-layout", t), c("casa-mia-tablet-view", class extends t {});
});
//#endregion
//#region src/view/patches.ts
var ur = new CSSStyleSheet();
ur.replaceSync(".handle, ha-dropdown-item[value=\"duplicate\"], :host(:not([cm-deletable])) ha-dropdown-item[value=\"delete\"], :host(:not([cm-deletable])) wa-divider { display: none; }\n  /* Its frame fills the panel's room, as the panel does out of edit mode (not only its cards' height). */\n  :host { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }\n  .section-wrapper { flex: 1 1 auto; box-sizing: border-box; }"), customElements.whenDefined("hui-section-edit-mode").then(() => {
	let e = customElements.get("hui-section-edit-mode").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		for (let e = this; e; e = e.parentElement ?? (e.getRootNode().host || null)) if (fr.some((t) => e.tagName === t.slice(7).toUpperCase())) {
			let e = this.shadowRoot;
			e && !e.adoptedStyleSheets.includes(ur) && (e.adoptedStyleSheets = [...e.adoptedStyleSheets, ur]);
			return;
		}
	};
});
var dr = "custom:casa-mia-tablet-layout", fr = [dr, "custom:casa-mia-tablet-view"];
customElements.whenDefined("hui-view-editor").then(() => {
	let e = customElements.get("hui-view-editor").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		let n = this._schema;
		typeof n == "function" && (this._schema = (...e) => n(...e).map((e) => {
			if (e.name === "section_specifics" && fr.includes(this._config?.type)) return {
				...e,
				visible: void 0,
				schema: e.schema.filter((e) => e.name !== "dense_section_placement")
			};
			let t = e.name === "type" ? e.selector?.select?.options : void 0;
			return !t || t.some((e) => e.value === dr) ? e : {
				...e,
				selector: { select: {
					...e.selector.select,
					options: [...t, {
						value: dr,
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
			n.set.call(this, fr.includes(e?.type) && e.max_columns === void 0 ? {
				...e,
				max_columns: 4
			} : e);
		}
	});
	let r = e._valueChanged;
	e._valueChanged = function(e) {
		let t = e.detail?.value;
		if (!fr.includes(t?.type)) return r.call(this, e);
		let n = new Proxy(t, { deleteProperty: (e, t) => t === "max_columns" || t === "top_margin" || Reflect.deleteProperty(e, t) });
		return r.call(this, new CustomEvent(e.type, { detail: { value: n } }));
	};
}), customElements.whenDefined("hui-dialog-edit-view").then(() => {
	let e = customElements.get("hui-dialog-edit-view").prototype, t = Object.getOwnPropertyDescriptor(e, "_type");
	t?.get && Object.defineProperty(e, "_type", {
		...t,
		get() {
			return fr.includes(this._config?.type) ? "sections" : t.get.call(this);
		}
	});
});
//#endregion
//#region src/garnish-sections.ts
var pr = !1, mr = /* @__PURE__ */ new Set(), hr = () => pr;
customElements.whenDefined("hui-section").then(() => {
	let e = customElements.get("hui-section").prototype, t = e._updateVisibility;
	if (typeof t != "function" || typeof e._setElementVisibility != "function") {
		console.warn("CASA-MIA CARDS: garnish on all section dashboards: this Home Assistant's sections changed; not available");
		return;
	}
	e._updateVisibility = function(...e) {
		if (this.cmContentHidden = !1, t.apply(this, e), mr.size > 200) for (let e of mr) e.isConnected || mr.delete(e);
		mr.add(this), !(this.hidden || this.preview || !this._config || rn(this)) && (Xt(this._config.cards) || pr && nn([
			...this._cards ?? [],
			...this._badges ?? [],
			...this._sections ?? []
		])) && (this.cmContentHidden = !0, this._setElementVisibility(!1));
	};
});
function gr(e) {
	if (e !== pr) {
		pr = e, console.info(`CASA-MIA CARDS: garnish on all section dashboards ${e ? "on" : "off"}`);
		for (let e of mr) e.isConnected ? e._updateVisibility() : mr.delete(e);
	}
}
window.hassConnection?.then(({ conn: e }) => e.subscribeMessage((e) => gr(!!e?.dashboards?.garnish_everywhere), { type: "casa_mia/settings/subscribe" }).catch(() => gr(!1)));
//#endregion
//#region src/garnish-editor.ts
var _r = "M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z", vr = {
	content: "Content: while this card shows, its panel shows. Tap to make it garnish.",
	garnish: "Garnish: adornment, like a heading, that never holds its panel open; the panel hides when only garnish is left. Tap to make it content."
}, yr = new CSSStyleSheet();
yr.replaceSync(`${Gn}
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
		let r = n.querySelector(".cm-garnish"), i = hr() || rn(this), a = cn(this.path ?? []), o = ((e) => a.reduce((e, t) => e?.[t], e))(this.lovelace?.config);
		if (!i || !this.lovelace?.editMode || this.noEdit || !a.includes("sections") || !o?.type || o.type === "custom:casa-mia-over-layer") return this.classList.remove("cm-garnished"), n.querySelector(".cm-garnish-frame")?.remove(), r?.remove();
		n.adoptedStyleSheets.includes(yr) || (n.adoptedStyleSheets = [...n.adoptedStyleSheets, yr]), r || (r = document.createElement("button"), r.type = "button", r.className = "cm-garnish cm-chip cm-icon", r.innerHTML = `<svg viewBox="0 0 24 24"><path d="${_r}"/></svg>`, r.addEventListener("pointerdown", (e) => e.stopPropagation()), r.addEventListener("click", async (e) => {
			e.stopPropagation(), r.disabled = !0;
			try {
				let e = structuredClone(this.lovelace.config), t = cn(this.path), n = t.slice(0, -1).reduce((e, t) => e[t], e), r = t[t.length - 1], i = tn(n[r]);
				n[r] = sn(n[r], i), await this.lovelace.saveConfig(e), console.info(`CASA-MIA CARDS: panel card marked ${i ? "Garnish" : "Content"}`);
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
		let s = !tn(o);
		r.setAttribute("aria-pressed", String(s)), r.classList.toggle("cm-on", s), r.title = vr[s ? "garnish" : "content"], r.setAttribute("aria-label", r.title), this.classList.toggle("cm-garnished", s);
		let c = n.querySelector(".cm-garnish-frame");
		s && !c ? (c = document.createElement("div"), c.className = "cm-garnish-frame", n.append(c)) : s || c?.remove();
	};
});
//#endregion
//#region src/over-layer/door.ts
var br = "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z", xr = 4e3, Sr = "\n  .lid { position: fixed; z-index: 8; transition: opacity 0.3s; cursor: pointer; }\n  .lid::after { content: \"\"; position: absolute; inset: 0; border-radius: 50%; pointer-events: none; animation: cm-door 2.4s ease-out infinite; }\n  .lid.open { opacity: 0; pointer-events: none; }\n  .lid.open::after { animation: none; }\n  @keyframes cm-door {\n    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-color, #03a9f4) 45%, transparent); }\n    70%, 100% { box-shadow: 0 0 0 8px transparent; }\n  }\n  @media (prefers-reduced-motion: reduce) { .lid::after { animation: none; } }\n";
function Cr(e) {
	for (let t = e; t; t = t.parentElement ?? (t.getRootNode().host || null)) {
		if (t.tagName !== "HUI-ROOT") continue;
		let e = t.shadowRoot;
		return [...e?.querySelectorAll("ha-icon-button[slot=\"actionItems\"]") ?? []].find((e) => e.path === br) ?? e?.querySelector("#dashboardmenu") ?? null;
	}
	return null;
}
function wr(e, t, n, r, i, a) {
	return `path(evenodd, "M0 0 H${e} V${t} H0 Z M${n} ${r} h${i} v${a} h${-i} Z")`;
}
function Tr(e) {
	let [t, n] = [Math.floor(e.left), Math.floor(e.top)];
	return [
		t,
		n,
		Math.ceil(e.right) - t,
		Math.ceil(e.bottom) - n
	];
}
var Er = class {
	constructor(e) {
		this.shut = 0, this.lid = document.createElement("div"), this.lid.className = "lid", this.lid.hidden = !0, e.append(this.lid), this.lid.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && this.open()), this.lid.addEventListener("pointerdown", (e) => {
			if (e.preventDefault(), e.pointerType === "mouse") return this.open();
			this.open(), clearTimeout(this.shut), this.shut = window.setTimeout(() => this.close(), xr);
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
		let [i, a, o, s] = Tr(r);
		for (let t of e) {
			let e = t.getBoundingClientRect();
			t.style.clipPath = wr(e.width, e.height, i - e.left, a - e.top, o, s);
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
function Dr(e) {
	for (let t = e; t; t = t.parentElement ?? (t.getRootNode().host || null)) if (t.tagName === "HUI-VIEW") return t;
	return null;
}
function Or(e) {
	let t = [];
	for (let n = e; n; n = n.parentElement ?? (n.getRootNode().host || null)) n.tagName === "HUI-SECTION" && t.push(n);
	return t;
}
function kr(e) {
	return Or(e).some((e) => e.hasAttribute("hidden") && !e.cmContentHidden);
}
var Ar = `
  :host { all: initial; }
  .layer { position: fixed; z-index: 7; display: flex; box-sizing: border-box; pointer-events: none; }
  .layer.scroll { position: absolute; }
  .backdrop { position: absolute; inset: 0; }
  .holder { position: relative; box-sizing: border-box; width: 100%; }
  .layer.full .holder { height: 100%; }
  .layer.full .holder > * { height: 100%; }
${Sr}`, jr = class extends B {
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
		let e = Or(this), t = () => this._checkSections();
		for (let n of e) n.addEventListener("section-visibility-changed", t);
		this._unwatchSections = () => e.forEach((e) => e.removeEventListener("section-visibility-changed", t)), this._place();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unwatchSections?.(), this._takeDown();
	}
	_checkSections() {
		let e = kr(this);
		e !== this._sectionOff && (this._sectionOff = e, console.info(`CASA-MIA CARDS: over layer: a section round it is ${e ? "hidden by its own Visibility: down" : "shown again: up"}`), this._place());
	}
	_setEditing(e) {
		e !== this._editing && (this._editing = e, this._place());
	}
	_makePanel() {
		let e = Or(this)[0];
		if (!e?.config) return;
		let t = document.createElement("hui-section"), { visibility: n, ...r } = e.config;
		t.hass = this._hass, t.lovelace = e.lovelace, t.index = e.index, t.viewIndex = e.viewIndex, t.preview = !1, t.config = {
			...r,
			cards: (r.cards ?? []).filter((e) => e?.type !== Kt)
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
		if (!this.isConnected || this._editing || !this._config || S(this) || (this._sectionOff = kr(this))) {
			this._takeDown(), this.requestUpdate();
			return;
		}
		this._host || this._putUp(), this._style();
	}
	_putUp() {
		this._host = document.createElement("casa-mia-over-layer-host");
		let e = this._host.attachShadow({ mode: "open" });
		e.innerHTML = `<style>${Ar}</style><div class="layer"><div class="backdrop"></div><div class="holder"></div></div>`, this._layer = e.querySelector(".layer"), this._config?.panel && this._makePanel(), this._child && this._layer.querySelector(".holder").append(this._child), this._door = new Er(e), document.body.append(this._host);
		let t = () => this._style(), n = Dr(this), r = new ResizeObserver(t);
		n && r.observe(n), addEventListener("resize", t), addEventListener("scroll", t, {
			capture: !0,
			passive: !0
		}), this._watch = () => {
			r.disconnect(), removeEventListener("resize", t), removeEventListener("scroll", t, { capture: !0 });
		}, setTimeout(t, 500), console.info(`CASA-MIA CARDS: over layer shown (${en(this._config)})`), this.requestUpdate();
	}
	_takeDown() {
		this._host && (this._watch?.(), this._door?.remove(), this._host.remove(), this._host = this._layer = this._watch = this._door = void 0, this._config?.panel && (this._child = void 0), console.info("CASA-MIA CARDS: over layer taken down"));
	}
	_style() {
		if (!this._layer || !this._config) return;
		let e = Yt(this._config), t = this._layer;
		t.className = `layer ${e.mode}`;
		let n = (e.cover === "view" ? Dr(this) : null)?.getBoundingClientRect();
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
		let c = e.block && e.cover === "window" && !!this._hass?.user?.is_admin, l = $t(Qt(e.mode, e.anchor));
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
		}), this._door?.place([o, u], c ? Cr(this) : null, s);
	}
	render() {
		return this._config ? this.isConnected && S(this) ? R`<div class="sample" aria-label="An Over layer: one card over the dashboard">
        <div class="tiles">${[
			0,
			1,
			2,
			3,
			4,
			5
		].map(() => R`<span></span>`)}</div>
        <div class="veil"></div>
        <div class="over"><strong>Over layer</strong><span>One card over the whole dashboard while its Visibility conditions hold: the alarm set, a visitor, night.</span></div>
      </div>` : this._editing ? this._config.panel ? R`<div class="badge cm-pill cm-accent">${en(this._config)}</div>` : R`<div class="badge cm-pill cm-accent">${en(this._config)}</div>
      ${this._child ?? R`<div class="empty">No card yet: pick one in the editor.</div>`}` : z : z;
	}
	static {
		this.styles = [Kn, I`
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
}, Mr = [
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
], Nr = [{
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
}], Pr = {
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
}, Fr = {
	panel: "In place of a card of its own, the layer shows every card in the panel it's in (but Over layers). That panel never shows in its own place out of edit mode; edit its cards there, as usual.",
	block: "On: what's beneath can be seen but not touched; only the card works. Off: taps reach the dashboard round the card."
};
async function Ir() {
	customElements.get("hui-card-element-editor") && customElements.get("hui-card-picker") || (await (await (await window.loadCardHelpers()).createCardElement({
		type: "conditional",
		conditions: [],
		card: { type: "button" }
	})).constructor.getConfigElement?.(), await customElements.whenDefined("hui-card-element-editor"));
}
var Lr = class extends B {
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
		super.connectedCallback(), Promise.all([a(), Ir()]).then(() => this._ready = !0);
	}
	_save(e) {
		this._config = e, t(this, "config-changed", { config: N(e, Jt) });
	}
	render() {
		if (!this.hass || !this._config || !this._ready) return z;
		let e = this._config.card;
		return R`
      <ha-form
        .hass=${this.hass}
        .data=${{
			...Jt,
			...this._config
		}}
        .schema=${Mr}
        .computeLabel=${(e) => Pr[e.name] ?? e.name}
        .computeHelper=${(e) => Fr[e.name]}
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
      ${this._config.panel ? z : this._card(e)}
    `;
	}
	_card(e) {
		return R`<h3>Its card</h3>
      ${e?.type ? R`<div class="actions">
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
            ></hui-card-element-editor>` : R`<hui-card-picker
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
			...Jt,
			...this._config
		};
		if (e.mode === "full") return z;
		let t = Qt(e.mode, e.anchor);
		return R`<h3>Where it sits</h3>
      <div class="where">
        <div class="anchors" role="radiogroup" aria-label="Where it sits">
          ${qt.map((n, r) => n.map((n) => R`<button
                  type="button"
                  role="radio"
                  aria-checked=${n === t}
                  aria-label=${n}
                  title=${n}
                  class=${n === t ? "on" : ""}
                  ?disabled=${e.mode === "scroll" && r > 0}
                  @click=${() => this._save({
			...this._config,
			anchor: n
		})}
                ></button>`))}
        </div>
        <ha-form
          .hass=${this.hass}
          .data=${e}
          .schema=${Nr}
          .computeLabel=${(e) => Pr[e.name] ?? e.name}
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
		this.styles = [Kn, I`
    .where {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .where ha-form {
      flex: 1;
    }
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
c("casa-mia-over-layer", jr), c("casa-mia-over-layer-editor", Lr), l("casa-mia-over-layer", "Casa Mia Over layer", "One card over the whole dashboard while its Visibility conditions hold; what's beneath can be seen but not touched.");
//#endregion
//#region ../../app/web/src/open.ts
var Rr = "casa-mia:open";
function zr(e, t) {
	return JSON.stringify({
		hash: `#/sensor-watch?watch=${encodeURIComponent(e)}&at=${t}`,
		at: t
	});
}
//#endregion
//#region src/sensor-watch/common.ts
var Br = "casa_mia_sensor_watch", Vr = {
	domain: "casa_mia",
	service: "sensor_watch_list"
};
function Hr(e) {
	return e.platform === "casa_mia" && (e.translation_key ?? "").startsWith("sensor_watch_");
}
var Ur = [
	"task",
	"warning",
	"error",
	"critical"
], Wr = [
	"level",
	"state",
	"none"
], Gr = [
	"icon",
	"level",
	"name",
	"message",
	"value",
	"since"
], Kr = {
	levels: [...Ur],
	max: 20,
	when_clear: "hide",
	clear_message: "All well.",
	show: Gr.filter((e) => e !== "icon"),
	icon_color: "level"
};
function qr(e) {
	let t = e.map((e) => e === "name" || e === "message" ? "what" : e);
	return t.filter((e, n) => t.indexOf(e) === n);
}
var Jr = {
	icon: "24px",
	level: "72px",
	what: "minmax(0, 1fr)",
	name: "",
	message: "",
	value: "auto",
	since: "auto"
};
function Yr(e) {
	return qr(e).map((e) => Jr[e]).join(" ");
}
var Xr = [
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
function Zr(e, t, n) {
	let r = e.split(".")[0], i = Xr.includes(t) ? "inactive" : "active", a = [
		...n ? [`--state-${r}-${n}-${t}-color`] : [],
		`--state-${r}-${t}-color`,
		`--state-${r}-${i}-color`
	], o = i === "inactive" ? "var(--state-inactive-color)" : "var(--state-icon-color)";
	return a.reduceRight((e, t) => `var(${t}, ${e})`, o);
}
function Qr(e, t) {
	let n = e ? Date.parse(e) : NaN;
	return Number.isNaN(n) ? t ? `${t} days` : "" : new Date(n).toLocaleDateString(void 0, {
		day: "numeric",
		month: "short"
	});
}
function $r(e, t) {
	let n = Math.max(0, (t - Date.parse(e)) / 1e3);
	return n < 60 ? "now" : n < 3600 ? `${Math.floor(n / 60)} min` : n < 86400 ? `${Math.floor(n / 3600)} h` : `${Math.floor(n / 86400)} d`;
}
var ei = "casa_mia/sensor_watch/entity";
function ti(e) {
	return Object.values(e ?? {}).find((e) => /(^|_)casa_mia$/.test(e?.config?.addon ?? ""));
}
var ni = {
	nominal: "var(--success-color, #43a047)",
	task: "var(--info-color, #039be5)",
	warning: "var(--warning-color, #ffa600)",
	error: "var(--error-color, #db4437)",
	critical: "var(--error-color, #db4437)"
};
function ri(e, t) {
	let n = e && t?.[e.entity_id];
	if (n?.platform === "casa_mia" && n?.translation_key === "sensor_watch_status") return ni[e.state];
}
//#endregion
//#region src/sensor-watch/card.ts
var ii = 300, ai = (e) => (/* @__PURE__ */ new Date(Date.now() - e * 36e5)).toISOString(), oi = [
	{
		entity_id: "",
		name: "Plug 3 voltage",
		level: "critical",
		value: "198 V",
		message: "Mains far too low: under 207 V",
		since: ai(3)
	},
	{
		entity_id: "",
		name: "Freezer",
		level: "warning",
		value: "-12 °C",
		message: "Freezer too warm: check the door and seal",
		since: ai(1)
	},
	{
		entity_id: "",
		name: "Softener salt",
		level: "task",
		value: "18 %",
		message: "Top up the salt",
		since: ai(50)
	}
], si = ae(Object.entries(ni).map(([e, t]) => `.${e} { --cm-level: ${t}; }`).join("\n")), ci = class extends B {
	constructor(...e) {
		super(...e), this._editing = !1, this._seen = null;
	}
	static {
		this.properties = {
			_config: { state: !0 },
			_rows: { state: !0 },
			_problem: { state: !0 },
			_editing: { state: !0 }
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
		}, Br);
		this._unsubscribe = t, t.catch((e) => console.warn(`CASA-MIA CARDS: sensor watch: can't hear its event (${e})`));
	}
	set hass(e) {
		this._hass = e, this.isConnected && this._subscribe(e);
		let t = Object.entries(e.entities ?? {}).filter(([, e]) => Hr(e)).map(([t]) => `${t}@${e.states[t]?.last_updated ?? ""}`).join(",");
		t !== this._seen && (this._seen = t, this._later()), this.requestUpdate();
	}
	set preview(e) {
		this._editing = e, this._showOrHide();
	}
	set editMode(e) {
		this._editing = e, this._showOrHide();
	}
	_later() {
		clearTimeout(this._timer), this._timer = window.setTimeout(() => this._ask(), ii);
	}
	async _ask() {
		let e = this._hass, t = {
			...Kr,
			...this._config
		};
		if (e) {
			try {
				let n = await e.callWS({
					type: "call_service",
					...Vr,
					service_data: {
						levels: t.levels,
						...t.group ? { group: t.group } : {}
					},
					return_response: !0
				});
				this._rows = n?.response?.sensors ?? [], this._problem = void 0;
			} catch (e) {
				this._rows = [], this._problem = `Sensor Watch isn't answering (${e?.message ?? e}): is it switched on in the Casa Mia app, and Home Assistant restarted since?`, console.warn(`CASA-MIA CARDS: sensor watch: ${this._problem}`);
			}
			this._showOrHide();
		}
	}
	_showOrHide() {
		let e = {
			...Kr,
			...this._config
		}, n = !this._editing && !(this.isConnected && S(this)) && !this._problem && this._rows !== void 0 && this._rows.length === 0 && e.when_clear === "hide";
		n !== this.hidden && (this.hidden = n, t(this, "card-visibility-changed", { value: !n }));
	}
	getCardSize() {
		return 1 + Math.min(this._rows?.length ?? 1, {
			...Kr,
			...this._config
		}.max);
	}
	getGridOptions() {
		return {
			columns: 12,
			rows: "auto"
		};
	}
	render() {
		if (!this._config) return z;
		let e = {
			...Kr,
			...this._config
		};
		if (S(this) && (this._problem !== void 0 || this._rows !== void 0 && !this._rows.length)) return R`<ha-card .header=${e.title || "Needs looking at"}>
        ${oi.map((e) => this._row(e, e.value ?? "", Date.now()))}
        <p class="note">An example: hidden when all is well.</p>
      </ha-card>`;
		let t = (this._rows ?? []).slice(0, e.max), n = (this._rows?.length ?? 0) - t.length, r = Date.now();
		return R`<ha-card .header=${e.title || void 0}>
      ${this._problem ? R`<p class="note problem">${this._problem}</p>` : z}
      ${!this._problem && this._rows && !t.length ? R`<p class="note">${e.when_clear === "message" ? e.clear_message : "All well: nothing to list, so this card is hidden on the dashboard."}</p>` : z}
      ${t.map((e) => {
			let t = this._hass?.states[e.entity_id];
			if (e.days_until) return this._row(e, Qr(e.attribute ? String(t?.attributes?.[e.attribute] ?? "") : t?.state, e.value), r);
			if (e.attribute) return this._row(e, String(t?.attributes?.[e.attribute] ?? e.value ?? ""), r);
			let n = t?.attributes?.unit_of_measurement ?? "", i = t && (this._hass?.formatEntityState?.(t) ?? `${t.state}${n ? ` ${n}` : ""}`);
			return this._row(e, i || (e.value ?? ""), r);
		})}
      ${n > 0 ? R`<p class="note">and ${n} more</p>` : z}
    </ha-card>`;
	}
	_row(e, n, r) {
		let i = {
			...Kr,
			...this._config
		}, a = i.show, o = this._hass?.states[e.entity_id];
		return R`<button
      class="row ${e.level}"
      style="grid-template-columns:${Yr(a)}"
      @click=${() => e.entity_id && t(this, "hass-more-info", { entityId: e.entity_id })}
    >
      ${qr(a).map((t) => {
			switch (t) {
				case "icon": {
					let t = i.icon_color === "level" ? "var(--cm-level)" : i.icon_color === "state" && o ? Zr(e.entity_id, o.state, o.attributes?.device_class) : "";
					return R`<ha-state-icon class="icon" style=${t ? `color:${t}` : ""} .hass=${this._hass} .stateObj=${o}></ha-state-icon>`;
				}
				case "level": return R`<span class="level cm-pill ${e.level === "critical" ? "cm-filled" : ""}">${e.level}</span>`;
				case "what": return R`<span class="what">
            ${a.filter((e) => e === "name" || e === "message").map((t) => t === "name" ? R`<span class="name">${e.name}</span>` : e.message ? R`<span class="message">${e.message}</span>` : z)}
          </span>`;
				case "value": return R`<span class="value">${n}</span>`;
				case "since": return R`<span class="since">${$r(e.since, r)}</span>`;
				default: return z;
			}
		})}
    </button>`;
	}
	static {
		this.styles = [
			Kn,
			si,
			I`
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
}, li = {
	icon: "Icon",
	level: "Level",
	name: "Name",
	message: "Message",
	value: "Value (its state now)",
	since: "How long"
}, ui = (e) => [
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
			options: Ur.map((e) => ({
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
			options: Gr.map((e) => ({
				value: e,
				label: li[e]
			}))
		} }
	},
	{
		name: "icon_color",
		selector: { select: {
			mode: "dropdown",
			options: Wr.map((e) => ({
				value: e,
				label: di[e]
			}))
		} }
	}
], di = {
	level: "The level's colour",
	state: "Its state's colour, as a tile",
	none: "None"
}, fi = {
	title: "Title",
	group: "Group",
	levels: "Levels to list",
	max: "At most",
	when_clear: "When all is well",
	clear_message: "Its message",
	show: "Each row shows",
	icon_color: "Icon colour"
}, pi = {
	title: "Or none, and give its panel a garnish heading (it hides with the card).",
	group: "Only one group's members (from Casa Mia's Sensor Watch page), or every watched sensor.",
	show: "Drag to reorder; the name and message share a place, where the first of them is."
}, mi = class extends B {
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
					...Vr,
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
		super.connectedCallback(), a().then(() => this._ready = !0);
	}
	render() {
		return !this.hass || !this._config || !this._ready ? z : (this._askGroups(), R`<ha-form
      .hass=${this.hass}
      .data=${{
			...Kr,
			...this._config
		}}
      .schema=${ui(this._groups)}
      .computeLabel=${(e) => fi[e.name] ?? e.name}
      .computeHelper=${(e) => pi[e.name]}
      @value-changed=${(e) => {
			e.stopPropagation();
			let n = {
				...this._config,
				...e.detail.value
			};
			n.group || delete n.group, this._config = n, t(this, "config-changed", { config: N(this._config, Kr) });
		}}
    ></ha-form>`);
	}
}, hi = "casa-mia-watch-eye", gi = class extends B {
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
		this._for = this.entityId, this.entityId && e && (this._off = e.subscribeMessage((e) => this._watch = e, {
			type: ei,
			entity_id: this.entityId
		}), this._off.catch((e) => {
			e?.code !== "unknown_command" && e?.code !== "not_running" && console.warn(`CASA-MIA CARDS: the eye: can't ask Sensor Watch (${e?.message ?? e})`);
		}));
	}
	_unsubscribe() {
		this._off?.then((e) => e()).catch(() => {}), this._off = void 0, this._watch = void 0;
	}
	_open() {
		let e = ti(this.hass?.panels);
		if (!e) {
			t(this, "hass-notification", {
				message: "Casa Mia's app has no page in the sidebar: turn on Show in sidebar on its page in Settings → Apps.",
				duration: 1e4
			});
			return;
		}
		try {
			localStorage.setItem(Rr, zr(this.entityId, Date.now()));
		} catch (e) {
			console.warn(`CASA-MIA CARDS: the eye: can't leave the app its note (${e}); it opens at its home page`);
		}
		this.dialog?.closeDialog?.(), i(`/${e.url_path}`);
	}
	render() {
		let e = this._watch;
		if (!e) return z;
		let t = e.watched ? e.level : void 0, n = e.watched ? `Sensor Watch: ${t ?? "watched, no level yet"}${e.escalated && e.real ? ` (escalated from ${e.real})` : ""}. Open its watch` : "Watch in Sensor Watch";
		return R`<button class=${t ?? ""} title=${n} aria-label=${n} @click=${this._open}>
      <ha-icon icon=${e.watched ? "mdi:eye" : "mdi:eye-plus-outline"}></ha-icon>
      ${t ? R`<span class="cm-pill ${t === "critical" ? "cm-filled" : ""}">${t}</span>` : z}
    </button>`;
	}
	static {
		this.styles = [
			Kn,
			si,
			I`
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
function _i(e) {
	let t = e.shadowRoot, n = t?.querySelector(hi), i = t?.querySelector("[slot=\"headerTitle\"]");
	if (!t || !e.hass?.user?.is_admin || !e._entityId || e._currView !== "info" || !i) {
		t && e._entityId && !i && r("the entity dialog's header changed; no eye"), n?.remove();
		return;
	}
	n || (n = document.createElement(hi), n.slot = "headerActionItems", i.after(n)), n.hass = e.hass, n.dialog = e, n.entityId = e._entityId;
}
customElements.whenDefined("ha-more-info-dialog").then(() => {
	let e = customElements.get("ha-more-info-dialog").prototype, t = e.updated;
	if (typeof t != "function") {
		r("the entity dialog changed; no eye");
		return;
	}
	e.updated = function(...e) {
		t.apply(this, e), _i(this);
	};
});
//#endregion
//#region src/sensor-watch/level-colour.ts
var vi = () => document.querySelector("home-assistant")?.hass?.entities;
function yi(e) {
	let t = [document];
	for (let n; n = t.pop();) for (let r of n.querySelectorAll("*")) r.localName === e && r.requestUpdate?.(), r.shadowRoot && t.push(r.shadowRoot);
}
customElements.whenDefined("ha-state-icon").then(() => {
	let e = customElements.get("ha-state-icon").prototype, t = e.updated;
	if (typeof t != "function") return r("ha-state-icon changed; the Status sensor keeps HA's colour");
	e.updated = function(...e) {
		t.apply(this, e);
		let n = ri(this.stateObj, this._entities ?? this.hass?.entities ?? vi());
		n ? (this.style.color !== n && (this.style.color = n), this.cmLevelColour = !0) : this.cmLevelColour &&= (this.style.removeProperty("color"), !1);
	}, yi("ha-state-icon");
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
			typeof t == "function" ? this._computeStateColor = (e, n) => !n && ri(e, this.hass?.entities) || t(e, n) : r(`${e} changed; the Status sensor keeps HA's colour`);
		}
		return n.apply(this, t);
	}, yi(e);
});
c("casa-mia-sensor-watch", ci), c("casa-mia-sensor-watch-editor", mi), c(hi, gi), l("casa-mia-sensor-watch", "Casa Mia Sensor Watch", "What needs doing or has gone wrong (all of it, or one group's), worst first; hidden when all is well.");
//#endregion
//#region src/qr-code/card.ts
var bi = {
	wifi: !1,
	instructions: !0,
	wifi_details: !0,
	welcome: !1,
	border: !1,
	code_frames: !0
}, xi = class extends B {
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
			...bi,
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
		if (!this._config) return z;
		let e = this._found ?? {};
		return R`<ha-card class=${this._config.border ? "printed" : ""} .header=${this._config.title || void 0}>
      ${this._problem ? R`<p class="note problem">${this._problem}</p>` : z}
      ${e.wifi_error ? R`<p class="note">${e.wifi_error} (Casa Mia → Guest login → QR codes → Wi-Fi)</p>` : z}
      ${e.svg ? R`<img src=${`data:image/svg+xml,${encodeURIComponent(e.svg)}`} alt="QR code" />` : z}
    </ha-card>`;
	}
	static {
		this.styles = I`
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
function Si(e) {
	return Object.entries(e.entities ?? {}).filter(([e, t]) => t.platform === "casa_mia_guest_login" && e.startsWith("switch.")).map(([t, n]) => {
		let r = e.devices?.[n.device_id];
		return {
			value: t,
			label: r?.name_by_user || r?.name || e.states[t]?.attributes?.friendly_name || t
		};
	}).sort((e, t) => e.label.localeCompare(t.label));
}
var Ci = (e) => [
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
			}, ...Si(e)]
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
], wi = {
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
}, Ti = {
	endpoint: "Its code shows while the endpoint is open, and scanning it signs the visitor in.",
	path: "Used when no endpoint is picked. A plain link to the page: it signs nobody in, so it's for phones already signed in.",
	wifi: "The network saved in Casa Mia's Guest login (QR codes → Wi-Fi), first, so a phone joins before it signs in. With no endpoint or page, the Wi-Fi's code alone.",
	caption: "Under the code. Empty: the endpoint's name, or the page's path.",
	instructions: "The steps (Join the Wi-Fi, Scan to sign in) and the name under the code. Off, with nothing else on, the code alone fills the card. Their words: Casa Mia → Guest login → QR codes → Words.",
	wifi_details: "Under the Wi-Fi's code, for anyone who'd rather type them.",
	welcome: "Guest login's welcome title (Welcome to …), or the endpoint's own."
}, Ei = class extends B {
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
		return !this.hass || !this._config || !this._ready ? z : R`<ha-form
      .hass=${this.hass}
      .data=${{
			...bi,
			...this._config
		}}
      .schema=${Ci(this.hass)}
      .computeLabel=${(e) => wi[e.name] ?? e.name}
      .computeHelper=${(e) => Ti[e.name]}
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
			this._config = n, t(this, "config-changed", { config: N(n, bi) });
		}}
    ></ha-form>`;
	}
};
c("casa-mia-qr-code", xi), c("casa-mia-qr-code-editor", Ei), l("casa-mia-qr-code", "Casa Mia QR code", "A guest login endpoint's QR code while it is open, or any page's, with the Wi-Fi's beside it if you like.");
//#endregion
//#region node_modules/lit-html/directives/unsafe-html.js
var Di = class extends ut {
	constructor(e) {
		if (super(e), this.it = z, e.type !== ct.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
	}
	render(e) {
		if (e === z || e == null) return this._t = void 0, this.it = e;
		if (e === Ue) return e;
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
Di.directiveName = "unsafeHTML", Di.resultType = 1;
//#endregion
//#region node_modules/lit-html/directives/unsafe-svg.js
var Oi = class extends Di {};
Oi.directiveName = "unsafeSVG", Oi.resultType = 2;
var ki = lt(Oi), Ai = {
	pipes: "outline",
	markers: "chev",
	colours: "temp",
	readouts: "pill",
	area_outside: "Outside",
	area_plant: "Plant room",
	area_house: "House",
	stale_hours: 6
}, ji = (e) => [
	e.floor_1,
	e.floor_2,
	e.floor_3
].filter((e) => !!e && !!(e.name || e.supply || e.return || e.loops?.length));
function Mi(e) {
	let t = [], n = (e) => {
		typeof e == "string" && /^[a-z_]+\.[a-z0-9_]+$/.test(e) ? t.push(e) : Array.isArray(e) ? e.forEach(n) : e && typeof e == "object" && Object.entries(e).forEach(([e, t]) => !e.endsWith("_action") && n(t));
	};
	return n({
		...e,
		type: void 0
	}), [...new Set(t)];
}
function Ni(e) {
	let t = Math.max(1, Math.round(e / 6e4));
	if (t < 60) return `${t} min`;
	let n = Math.round(t / 60);
	return n < 48 ? `${n} h` : `${Math.round(n / 24)} days`;
}
var Pi = /* @__PURE__ */ new Set([
	"on",
	"open",
	"opening",
	"true",
	"home",
	"heat",
	"heating",
	"running"
]), Fi = /* @__PURE__ */ new Set([
	"off",
	"closed",
	"closing",
	"false",
	"idle",
	"standby"
]);
function Ii(e, t, n, r, i) {
	if (!e) return {
		v: NaN,
		unit: "",
		dp: 0,
		e: t,
		stale: "missing"
	};
	let a = e.attributes?.unit_of_measurement ?? "", o = /^°[CF]$/.test(a) ? "°" : a === "%" ? "%" : a ? ` ${a}` : "", s = Date.parse(e.last_reported ?? e.last_updated ?? e.last_changed ?? ""), c = Number.isFinite(s) ? r - s : 0, l = e.state === "unavailable" || e.state === "unknown" || i > 0 && c > i * 36e5, u = parseFloat(e.state), d = e.state.toLowerCase(), f = {
		v: Number.isFinite(u) ? u : Pi.has(d) ? 1 : Fi.has(d) ? 0 : NaN,
		unit: o,
		dp: n ?? e.state.split(".")[1]?.length ?? 0,
		e: t
	};
	return Number.isFinite(u) || (f.text = e.state), l && (f.stale = Ni(c)), f;
}
function Li(e) {
	let t = (e ?? "").toLowerCase();
	return !t || t === "unavailable" || t === "unknown" ? "Unknown" : /water|dhw|hot/.test(t) ? "Hot water" : /defrost/.test(t) ? "Defrost" : /cool/.test(t) ? "Cooling" : /heat/.test(t) ? "Heating" : /off|idle|stand|none/.test(t) ? "Off" : e;
}
var Ri = {
	Heating: "#e5443a",
	"Hot water": "#a652d6",
	Off: "#7a8190",
	Defrost: "#2f86e0",
	Cooling: "#2fbfd0"
}, zi = /^(|0|ok|none|off|no alarm|no alarms|normal|false|unavailable|unknown)$/i;
function Bi(e, t, n = Date.now()) {
	let r = t.stale_hours ?? Ai.stale_hours, i = {};
	for (let a of Mi(t)) i[a] = Ii(e.states[a], a, e.entities?.[a]?.display_precision, n, r);
	let a = (e) => e && i[e] && !i[e].stale && Number.isFinite(i[e].v) ? i[e].v : null, o = (e) => (a(e) ?? 0) > 0, s = t.heat_pump ?? {}, c = t.source ?? {}, l = t.dhw ?? {}, u = t.water ?? {}, d = Li(s.priority ? e.states[s.priority]?.state : void 0), f = s.compressor ? o(s.compressor) : d !== "Off" && d !== "Unknown", p = (e) => !e || o(e), m = (d === "Heating" || d === "Defrost") && p(s.pump), h = d === "Hot water" && p(s.pump), g = c.type !== "air" && c.type !== "none" && (c.pump ? o(c.pump) : f), _ = g && !!c.pvt && o(c.pvt_valve), v = o(l.loop_pump), y = (u.pumps ?? []).some(o), b = !!u.storage && o(u.inlet), x = o(u.meter), S = u.storage ? y : x, C = {
		comp: f,
		heat: m,
		coil: h,
		hp_out: m || h,
		brine: g,
		pvt: _,
		hot: v,
		recirc: v,
		soft: S,
		fill: b,
		mains: b || x,
		hard: !!u.storage && x && !b
	};
	for (let e of ji(t)) for (let t of e.loops ?? []) C[t] = m && o(t);
	let w = s.alarm ? e.states[s.alarm]?.state : void 0;
	return {
		data: i,
		flows: C,
		prio: d,
		alarm: w && !zi.test(w.trim()) ? w : null,
		saltLow: !!u.softener && o(u.salt_low),
		stale: Object.values(i).filter((e) => e.stale)
	};
}
//#endregion
//#region src/heating-flow/engine.ts
var Vi = [
	[-5, "#3b47c9"],
	[5, "#2f86e0"],
	[15, "#2fbfd0"],
	[25, "#43c08a"],
	[35, "#e2c22e"],
	[45, "#f2902a"],
	[55, "#e8492f"],
	[65, "#b31e3d"]
], Hi = {
	brine: "#3b6fe0",
	pvt: "#f0a020",
	heat: "#e5443a",
	dhw: "#a652d6",
	hot: "#d6457f",
	cold: "#38b8e0",
	ref: "#7f8ea6"
}, Ui = "#9aa3b2", Wi = (e) => [
	1,
	3,
	5
].map((t) => parseInt(e.slice(t, t + 2), 16)), Gi = (e) => "#" + e.map((e) => Math.round(e).toString(16).padStart(2, "0")).join(""), Ki = (e, t, n) => Gi(Wi(e).map((e, r) => e + (Wi(t)[r] - e) * n));
function qi(e) {
	if (e <= Vi[0][0]) return Vi[0][1];
	for (let t = 1; t < Vi.length; t++) if (e <= Vi[t][0]) {
		let [n, r] = Vi[t - 1], [i, a] = Vi[t];
		return Ki(r, a, (e - n) / (i - n));
	}
	return Vi[Vi.length - 1][1];
}
var J = (e) => String(e ?? "").replace(/[&<>"']/g, (e) => `&#${e.charCodeAt(0)};`);
function Ji(e, t) {
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
function Yi(e, t) {
	let n = e.slice(), r = e.length, i = ([e, n], [r, i]) => {
		let a = Math.hypot(r - e, i - n);
		return [r + (r - e) / a * t, i + (i - n) / a * t];
	};
	return n[0] = i(e[1], e[0]), n[r - 1] = i(e[r - 2], e[r - 1]), n;
}
function Xi(e) {
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
function Zi(e, [t, n]) {
	for (let r of e) {
		let e = (t - r.ax) * r.ux + (n - r.ay) * r.uy;
		if (e >= -.5 && e <= r.L + .5 && Math.hypot(r.ax + r.ux * e - t, r.ay + r.uy * e - n) < 1) return r.s0 + e;
	}
	return 0;
}
function Qi(e, t) {
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
function $i(e, t) {
	if (!e.length) return null;
	if (t <= e[0][0]) return e[0][1];
	for (let n = 1; n < e.length; n++) if (t <= e[n][0]) {
		let [r, i] = e[n - 1], [a, o] = e[n];
		return i + (o - i) * (t - r) / (a - r || 1);
	}
	return e[e.length - 1][1];
}
function ea(e, t, n, r, i) {
	let a = {};
	e.forEach((e) => e.area && (a[e.area] ||= []).push(e));
	let o = {};
	for (let e in a) {
		let r = i.find((t) => t[0] === e), a = Infinity, s = -Infinity;
		for (let e = 0; r && e <= n; e += 2) {
			let n = Qi(t, e);
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
			s: e.at ? Zi(t, e.at) : (r ? 1 - (e.f ?? 0) : e.f ?? 0) * n
		};
	});
}
//#endregion
//#region src/heating-flow/draw.ts
var ta = class {
	constructor(e, t, n, r = !1) {
		this.uid = 0, this.areas = [], this.data = e, this.flows = t, this.look = n, this.reduced = r;
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
		return t == null ? Ui : qi(t);
	}
	bgAt(e) {
		return `var(${(this.areas.find((t) => e < t[2]) ?? this.areas[this.areas.length - 1])?.[4] ?? "--hf-panel"})`;
	}
	pipe(e) {
		let t = e.w ?? 12, { segs: n, total: r } = Ji(Yi(e.rev ? e.pts.slice().reverse() : e.pts, t / 2), e.r ?? 12), i = ea(e.sensors ?? [], n, r, e.rev, this.areas), a = i.map((e) => [e.s, this.val(e.k)]).filter((e) => e[1] != null).sort((e, t) => e[0] - t[0]), o = !!(e.flow && this.flows[e.flow]), s = (t) => {
			let n = $i(a, t), r = this.look.colours === "circuit" ? Hi[e.circ] ?? "#9aa3b2" : n == null ? Ui : qi(n);
			return o ? r : Ki(r, Ui, .35);
		}, c = "", l = "", u = `M${n[0].ax} ${n[0].ay}`;
		n.forEach((e, t) => {
			let r = e.s0 + e.k0, i = e.s0 + e.L - e.k1, o = e.ax + e.ux * e.k0, d = e.ay + e.uy * e.k0, f = e.bx - e.ux * e.k1, p = e.by - e.uy * e.k1;
			if (u += `L${f} ${p}`, i > r + .1) {
				let e = this.id("pg"), t = [
					r,
					...a.map((e) => e[0]).filter((e) => e > r && e < i),
					i
				];
				c += `<linearGradient id="${e}" gradientUnits="userSpaceOnUse" x1="${o}" y1="${d}" x2="${f}" y2="${p}">` + t.map((e) => `<stop offset="${((e - r) / (i - r)).toFixed(4)}" stop-color="${s(e)}"/>`).join("") + "</linearGradient>", l += `<path d="M${o} ${d}L${f} ${p}" style="stroke:url(#${e})"/>`;
			}
			if (e.k1) {
				let r = n[t + 1], i = `Q${e.bx} ${e.by} ${r.ax + r.ux * r.k0} ${r.ay + r.uy * r.k0}`;
				u += i, l += `<path d="M${f} ${p}${i}" style="stroke:${s(e.s0 + e.L)}"/>`;
			}
		});
		let d = s(r / 2), f = this.look.pipes, p = (e, t, n = "") => `<path d="${u}" fill="none" stroke-width="${e}" style="stroke:${t}" ${n}/>`, m = (e, t = "") => `<g fill="none" stroke-width="${e}" ${t}>${l}</g>`, h = "", g = "";
		f === "outline" && ([h, g] = [p(t + 3, "var(--hf-edge)"), p(t, d) + m(t)]), f === "glass" && ([h, g] = [p(t + 3, d) + m(t + 3), p(t, "var(--hf-panel)") + m(t, "opacity=\".32\"")]), (f === "conduit" || f === "neon") && ([h, g] = [p(t + 2, "var(--hf-conduit)"), m(Math.max(3, t * .42), f === "neon" ? `style="filter:drop-shadow(0 0 3px ${d})"` : "")]);
		let _ = "";
		if (o && !this.reduced) {
			let r = Xi(n), i = Math.max(1, Math.round(r / 26)), a = this.val(e.speed), o = r / (a == null ? 576 / t : 18 + Math.min(a, 100) * .5), s = f === "glass" ? "var(--hf-edge)" : "#fff", c = t < 12 ? ` transform="scale(${Math.max(.6, t / 12)})"` : "";
			for (let e = 0; e < i; e++) _ += `<use href="#mk-${this.look.markers}"${c} style="color:${s}"><animateMotion dur="${o.toFixed(2)}s" begin="-${(o * e / i).toFixed(2)}s" repeatCount="indefinite" rotate="auto" path="${u}"/></use>`;
		}
		let v = (e.hops ?? []).map(([e, n, r]) => `<path d="${r === "h" ? `M${e - t} ${n}H${e + t}` : `M${e} ${n - t}V${n + t}`}" stroke-width="${t + 8}" style="stroke:${this.bgAt(e)}"/>`).join(""), y = i.filter((e) => e.show !== !1).map((e) => {
			let t = Qi(n, e.s);
			return this.readout(t.x, t.y, e.k, t.horiz);
		}).join("");
		return {
			defs: c,
			gap: v,
			outline: h,
			fill: g,
			marks: _,
			pills: y
		};
	}
	pipes(e) {
		let t = e.map((e) => ({
			p: e,
			...this.pipe(e)
		})), n = t.filter((e) => !e.p.hops).sort((e, t) => (e.p.z ?? 0) - (t.p.z ?? 0)), r = t.filter((e) => e.p.hops), i = n.map((e) => e.outline).join("") + n.map((e) => e.fill).join("") + n.map((e) => e.marks).join("") + r.map((e) => e.gap + e.outline + e.fill + e.marks).join("");
		return {
			defs: t.map((e) => e.defs).join(""),
			body: i,
			pills: t.map((e) => e.pills).join("")
		};
	}
	readout(e, t, n, r = !0) {
		let i = this.data[n];
		if (!i) return "";
		let a = i.stale ? `— ${i.stale}` : this.fmt(i), o = i.stale ? "var(--hf-warn)" : i.unit === "°" && this.look.colours === "temp" ? qi(i.v) : "var(--hf-line)", s = `<title>${J(i.e)}${i.stale ? `: not current for ${J(i.stale)}` : ""}</title>`;
		if (this.look.readouts === "pill" || i.stale) {
			let n = Math.max(46, a.length * 6.6 + 14);
			return `<g class="hit" data-e="${J(i.e)}">${s}<rect class="hl" x="${e - n / 2}" y="${t - 10}" width="${n}" height="20" rx="10" style="fill:var(--hf-panel);stroke:${o}" stroke-width="2"/><text x="${e}" y="${t + 4}" text-anchor="middle" font-size="11" font-weight="700" class="${i.stale ? "w" : "t"}">${J(a)}</text></g>`;
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
		return `<g class="hit" data-e="${J(i.e)}">${s}<text x="${c}" y="${l}" text-anchor="${u}" font-size="12" font-weight="700" class="t halo">${J(a)}</text></g>`;
	}
	row(e, t, n, r, i) {
		let a = this.data[r];
		return a ? `<g class="hit" data-e="${J(a.e)}"><rect class="hl" x="${e - 4}" y="${t - 13}" width="${i - e + 8}" height="18" rx="4" fill="transparent"/><text x="${e}" y="${t}" font-size="11.5" class="m">${J(n)}</text><text x="${i}" y="${t}" text-anchor="end" font-size="12" font-weight="700" class="${a.stale ? "w" : "t"}">${J(a.stale ? "— " + a.stale : this.fmt(a))}</text></g>` : "";
	}
}, na = "\n  <path id=\"mk-chev\" d=\"M-3 -4L2 0L-3 4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  <path id=\"mk-arrow\" d=\"M-6 0H3M0 -3L3.5 0L0 3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  <circle id=\"mk-bub\" r=\"2.1\" fill=\"currentColor\"/>\n  <linearGradient id=\"panelg\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" style=\"stop-color:var(--hf-panel)\"/><stop offset=\"1\" style=\"stop-color:var(--hf-panel2)\"/></linearGradient>\n  <linearGradient id=\"earthg\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" style=\"stop-color:var(--hf-earth1)\"/><stop offset=\".55\" style=\"stop-color:var(--hf-earth2)\"/><stop offset=\"1\" style=\"stop-color:var(--hf-earth3)\"/></linearGradient>\n  <linearGradient id=\"cellg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#4a78c4\"/><stop offset=\"1\" stop-color=\"#1f3f7a\"/></linearGradient>\n  <linearGradient id=\"sheen\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".3\"/><stop offset=\".5\" stop-color=\"#fff\" stop-opacity=\"0\"/></linearGradient>", ra = {
	e: 0,
	s: 90,
	w: 180,
	n: 270
}, Y = (e, t, n) => `<g class="hit" data-e="${J(e ?? "")}"><title>${J(t)}</title>${n}</g>`;
function ia(e, t, n, r, i, a, [o, s, c], l = !1) {
	let u = e.data[i], d = e.val(i) != null && e.val(i) > 0;
	return Y(u?.e, a, (l ? `<circle cx="${t}" cy="${n}" r="22" fill="none" style="stroke:var(--hf-warn)" stroke-width="3" class="pulse"/>` : "") + (d ? `<circle cx="${t}" cy="${n}" r="18" fill="none" style="stroke:var(--hf-run);transform-origin:${t}px ${n}px" stroke-width="2" stroke-dasharray="3 4" class="spin"/>` : "") + `<circle class="hl" cx="${t}" cy="${n}" r="14" style="fill:var(--hf-panel);stroke:var(--hf-edge)" stroke-width="2"/><path d="M-7 -11L13 0L-7 11Z" transform="translate(${t} ${n}) rotate(${ra[r]})" style="fill:${d ? "var(--hf-run)" : "var(--hf-off)"};stroke:var(--hf-edge)" stroke-width="1.5" stroke-linejoin="round"/><text x="${o}" y="${s}" text-anchor="${c}" font-size="10.5" class="m halo">${J(a)} · ${u?.stale ? "— " + J(u.stale) : d && u?.unit ? J(e.fmt(u)) : d ? "on" : "off"}</text>`);
}
function aa(e, t, n, r, i, a, o) {
	let s = (n) => `<path d="M0 0L12 -8L12 8Z" transform="translate(${e} ${t}) rotate(${ra[n]})" style="fill:${r.includes(n) ? "var(--hf-edge)" : "var(--hf-panel)"};stroke:var(--hf-edge)" stroke-width="1.6" stroke-linejoin="round"/>`, [c, l] = {
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
	return Y(a, i, `<path d="M${e} ${t}L${e + c * 13} ${t + l * 13}" style="stroke:var(--hf-edge)" stroke-width="2"/><rect class="hl" x="${e + c * 18 - 6}" y="${t + l * 18 - 6}" width="12" height="12" rx="2" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="1.6"/>` + n.map(s).join("") + (o ? `<text x="${o[0]}" y="${o[1]}" text-anchor="${o[2]}" font-size="10.5" class="m halo">${J(i)}</text>` : ""));
}
var oa = (e, t) => e.map(([, e, n, r, i]) => `<rect x="${e}" y="0" width="${n - e}" height="${t}" style="fill:var(${i})"/><text x="${e + 12}" y="20" class="zl">${J(r)}</text>`).join("") + e.slice(1).map(([, e]) => `<path d="M${e} 0V${t}" style="stroke:var(--hf-line)" stroke-dasharray="2 4"/>`).join("");
function sa(e, t, n, r, i, a, o) {
	let s = e.id("gc");
	return Y(o, a, `<clipPath id="${s}"><rect x="${t}" y="${n}" width="${r}" height="${i}" rx="12"/></clipPath><g clip-path="url(#${s})"><rect x="${t}" y="${n}" width="${r}" height="${i}" fill="url(#earthg)"/><rect x="${t}" y="${n}" width="${r}" height="10" style="fill:var(--hf-grass)"/><path d="M${t} ${n + i * .4}q${r * .25} -8 ${r * .5} 0t${r * .5} -3M${t} ${n + i * .72}q${r * .3} 8 ${r * .55} 0t${r * .45} 4" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/></g><rect class="hl" x="${t}" y="${n}" width="${r}" height="${i}" rx="12" fill="none" style="stroke:var(--hf-line)"/><text x="${t + r - 10}" y="${n + i - 12}" text-anchor="end" font-size="12" font-weight="700" class="lt">${J(a)}</text>`);
}
function ca(e, t, n, r, i) {
	let a = (n - 16) / 3, o = (r - 12) / 2, s = `<rect class="hl" x="${e}" y="${t}" width="${n}" height="${r}" rx="8" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.2"/>`;
	for (let n = 0; n < 3; n++) for (let r = 0; r < 2; r++) {
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
	].map((n) => `<path d="M${e + 10} ${t - 24.5}v-3" transform="rotate(${n} ${e + 10} ${t - 16})" stroke="#f4b400" stroke-width="1.6" stroke-linecap="round"/>`).join(""), Y(i, "PVT panels", s + `<text x="${e + 24}" y="${t - 11}" font-size="12" font-weight="700" class="t">PVT panels</text>`);
}
function la(e, t, n, r, i, a) {
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
		return `<stop offset="${t / 10}" stop-color="${n == null ? Ui : qi(n)}"/>`;
	}).join("");
	return {
		under: Y(a[0]?.[0] && e.data[a[0][0]]?.e, "Hot water tank", `<linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">${p}</linearGradient><rect class="hl" x="${t}" y="${n}" width="${r}" height="${i}" rx="30" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/><rect x="${o}" y="${s}" width="${c}" height="${l}" rx="24" fill="url(#${u})"/><rect x="${o + 6}" y="${s + 12}" width="8" height="${l - 24}" rx="4" fill="#fff" opacity=".2"/>`),
		over: a.map(([n, i]) => {
			let a = e.data[n], o = s + i * l;
			return a ? Y(a.e, a.e, `<path d="M${t + r - 8 - 36} ${o}l6 -4v8z" fill="#fff"/><text x="${t + r - 8 - 3}" y="${o + 4}" text-anchor="end" font-size="11" font-weight="700" class="${a.stale ? "w" : "lt"}">${a.stale ? "—" : J(a.v.toFixed(1) + "°")}</text>`) : "";
		}).join("")
	};
}
function ua(e, t, n, r, i, a, o) {
	let s = e.id("rg"), c = Math.max(3, Math.floor(r / 7)), l = r / c;
	return `<g><linearGradient id="${s}" gradientUnits="userSpaceOnUse" x1="0" y1="${n}" x2="0" y2="${n + i}"><stop offset="0" stop-color="${e.colourOf(a)}"/><stop offset="1" stop-color="${e.colourOf(o)}"/></linearGradient>` + Array.from({ length: c }, (e, r) => `<rect x="${t + r * l}" y="${n}" width="${l - 2}" height="${i}" rx="${(l - 2) / 2}" fill="url(#${s})" style="stroke:var(--hf-edge)" stroke-width=".8"/>`).join("") + "</g>";
}
function da(e, t, n, r, i) {
	let a = e.val(i), o = a != null && a > 0, s = Array.from({ length: 7 }, (e, i) => `<path d="M${t} ${n}q${r * .25} ${-r * .45} ${r * .12} ${-r * .72}" transform="rotate(${i * 360 / 7} ${t} ${n})" fill="none" style="stroke:var(--hf-edge)" stroke-width="3" stroke-linecap="round"/>`).join("");
	return Y(e.data[i]?.e, "Compressor", `<circle class="hl" cx="${t}" cy="${n}" r="${r}" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="2.5"/><g class="${o ? "spin" : ""}" style="transform-origin:${t}px ${n}px;--sd:${o ? (60 / Math.max(a, 10)).toFixed(2) : 0}s">${s}</g><circle cx="${t}" cy="${n}" r="${r * .16}" style="fill:var(--hf-edge)"/>`);
}
function fa(e, t, n, r, i) {
	let a = e.data[i], o = (e.val(i) ?? 0) > 0;
	return Y(a?.e, `Immersion heater · ${a && o ? e.fmt(a) : "off"}`, `<rect x="${t - 3}" y="${Math.min(n, r)}" width="6" height="${Math.abs(r - n)}" rx="3" fill="${o ? "#ff7a1a" : "#8a8f99"}" style="${o ? "filter:drop-shadow(0 0 4px #ff7a1a)" : ""}" class="${o ? "pulse" : ""}"/><rect class="hl" x="${t - 7}" y="${n - 4}" width="14" height="9" rx="2" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="1.4"/>`);
}
var pa = (e, t, n) => Y(n, "Mains in", `<circle class="hl" cx="${e}" cy="${t}" r="9" style="fill:var(--hf-panel);stroke:var(--hf-edge)" stroke-width="2"/><path d="M${e - 5} ${t - 5}L${e + 5} ${t + 5}" style="stroke:var(--hf-edge)" stroke-width="2.5" stroke-linecap="round"/><text x="${e - 8}" y="${t + 24}" font-size="11" font-weight="700" class="t halo">Mains in</text>`);
function ma(e, t, n, r, i, a, o, s) {
	let c = o ? e.data[o] : void 0, l = Math.max(0, Math.min(1, (e.val(o) ?? 0) / 100)), u = t + 26, d = r - 30, f = n + 22, p = i - 30;
	return Y(o ?? s, `Softener${c ? ": salt " + e.fmt(c) : ""}${a ? ", needs topping up" : ""}`, (a ? `<rect x="${t - 4}" y="${n - 4}" width="${r + 8}" height="${i + 8}" rx="12" fill="none" style="stroke:var(--hf-warn)" stroke-width="3" class="pulse"/>` : "") + `<rect class="hl" x="${t}" y="${n + 10}" width="20" height="${i - 10}" rx="10" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/><rect x="${u}" y="${n}" width="${d}" height="${i}" rx="8" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/><rect x="${u + 6}" y="${f}" width="${d - 12}" height="${p}" rx="4" style="fill:var(--hf-panel2);stroke:var(--hf-line)"/>` + (c ? `<rect x="${u + 6}" y="${f + p * (1 - l)}" width="${d - 12}" height="${p * l}" rx="4" fill="${a ? "var(--hf-warn)" : "#e8e2d4"}" style="stroke:var(--hf-line)"/><text x="${u + d / 2}" y="${n + 15}" text-anchor="middle" font-size="10.5" font-weight="700" class="t">${J(c.stale ? "—" : e.fmt(c))}</text>` : "") + `<text x="${t + r / 2}" y="${n - 8}" text-anchor="middle" font-size="11" font-weight="700" class="${a ? "w" : "t"} halo">${a ? "Top up salt" : "Softener"}</text>`);
}
function ha(e, t, n, r, i, a, o, s, c) {
	let l = Hi.cold, u = e.val(c), d = u == null ? 1 : Math.max(0, Math.min(1, u / 100)), f = n + 30 + (i - 37) * (1 - d), p = `<rect class="hl" x="${t}" y="${n}" width="${r}" height="${i}" rx="${r / 2.4}" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.8"/><rect x="${t + 7}" y="${f}" width="${r - 14}" height="${n + i - 7 - f}" rx="${r / 3}" fill="${l}" opacity=".22"/><text x="${t + r / 2}" y="${n + 52}" text-anchor="middle" font-size="11" font-weight="700" class="t">${J(o)}</text><text x="${t + r / 2}" y="${n + 67}" text-anchor="middle" font-size="10.5" class="m">${u == null ? "level: no sensor" : `level ${J(e.fmt(e.data[c]))}`}</text>`;
	return a && (p += Array.from({ length: 5 }, (e, i) => `<circle cx="${t + r * .5 + i % 2 * 4}" cy="${n + 14}" r="2" fill="${l}" class="drip" style="animation-delay:-${(i * .14).toFixed(2)}s"/>`).join(""), p += `<rect x="${t + r / 2 - 28}" y="${n + 76}" width="56" height="18" rx="9" fill="${l}"/><text x="${t + r / 2}" y="${n + 89}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff">Filling</text>`), Y(s, `${o}${a ? ": filling" : ""}`, p);
}
function ga(e, t, n, r, i) {
	let a = (e, t, n, r) => Array.from({ length: n }, (n, i) => `<circle cx="${e + (i % 3 - 1) * 4}" cy="${t}" r="1.8" fill="${Hi.cold}" class="${r ? "drip" : ""}" style="animation-delay:-${(i * .23).toFixed(2)}s" opacity="${r ? 1 : .25}"/>`).join(""), o = (e, t, n, r) => n === "none" ? "" : n === "shower" ? `<path d="M${e} ${t - 12}v6h8M${e + 2} ${t}a10 5 0 0 1 20 0z" fill="none" style="stroke:var(--hf-edge);fill:var(--hf-panel2)" stroke-width="2.5" stroke-linejoin="round"/>${a(e + 12, t + 10, 6, r)}` : `<path d="M${e} ${t - 6}h14a6 6 0 0 1 6 6v3M${e + 6} ${t - 6}v-5m-4 0h8" fill="none" style="stroke:var(--hf-edge)" stroke-width="3" stroke-linecap="round"/>${a(e + 20, t + 12, 3, r)}`;
	return `<g><rect x="${e}" y="${t}" width="${n}" height="${r}" rx="12" fill="url(#panelg)" style="stroke:var(--hf-line)"/><text x="${e + 12}" y="${t + 18}" font-size="12" font-weight="700" class="t">Taps &amp; showers</text>` + i.map((t) => Y(t.e, t.label, `<text x="${e + 12}" y="${t.y + 4}" font-size="11" class="${t.on ? "t" : "m"}" font-weight="${t.on ? 700 : 400}">${J(t.label)}</text>` + o(e + n - 40, t.y, t.icon, t.on) + (t.note ? `<text x="${e + 12}" y="${t.y + 18}" font-size="9.5" class="m">${J(t.note)}</text>` : ""))).join("") + "</g>";
}
//#endregion
//#region src/heating-flow/system.ts
var _a = 1180, X = (e, t = {}) => e ? [{
	k: e,
	...t
}] : [], Z = (e, t) => X(e, {
	f: t,
	show: !1
}), va = (e, t) => (e ?? []).map((e) => ({
	k: e,
	area: t
}));
function ya(e, t, n, r) {
	let i = new ta(t.data, t.flows, n, r), a = e.source ?? {}, o = e.heat_pump ?? {}, s = e.heating ?? {}, c = e.dhw ?? {}, l = e.water ?? {}, u = [
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
	i.areas = u;
	let d = [], f = "", p = "", m = a.type === "borehole" || a.type === "horizontal" || !a.type, h = a.type === "air", g = m && !!a.pvt;
	if (m) {
		f += sa(i, 25, 440, 200, 180, a.type === "horizontal" ? "Ground loop" : "Borehole", a.ground ?? a.out);
		let e = [
			[70, 440],
			[70, 600],
			[150, 600],
			[150, 440]
		];
		if (a.type === "horizontal") {
			e = [[70, 440], [70, 560]];
			for (let t = 82, n = 0; t <= 202; t += 12, n++) e.push([t, n % 2 ? 548 : 572]);
			e.push([206, 560], [206, 480], [150, 480], [150, 440]);
		}
		d.push({
			circ: "brine",
			pts: e,
			r: a.type === "horizontal" ? 6 : 40,
			w: 10,
			flow: "brine",
			speed: a.pump,
			sensors: [...Z(a.out, 0), ...Z(a.ground ?? a.in, 1)]
		}), d.push({
			circ: "brine",
			pts: [
				[285, 330],
				[70, 330],
				[70, 440]
			],
			flow: "brine",
			speed: a.pump,
			hops: g ? [[
				205,
				330,
				"h"
			], [
				240,
				330,
				"h"
			]] : void 0,
			sensors: X(a.out, { at: [120, 330] })
		}), d.push({
			circ: "brine",
			z: 1,
			pts: [
				[150, 440],
				[150, 385],
				[285, 385]
			],
			flow: "brine",
			speed: a.pump,
			sensors: [...Z(a.ground, 0), ...X(a.in, { at: [262, 385] })]
		}), g && (f += ca(40, 62, 155, 85, a.pvt_out), d.push({
			circ: "brine",
			pts: [
				[205, 385],
				[205, 127],
				[195, 127]
			],
			flow: "pvt",
			speed: a.pump,
			sensors: X(a.ground, { at: [205, 250] })
		}), d.push({
			circ: "pvt",
			pts: [
				[195, 84],
				[240, 84],
				[240, 385]
			],
			flow: "pvt",
			speed: a.pump,
			sensors: X(a.pvt_out, { at: [240, 190] })
		}), p += aa(205, 385, [
			"w",
			"e",
			"n"
		], t.flows.pvt ? ["w", "n"] : ["w", "e"], "PVT valve", a.pvt_valve, [
			196,
			372,
			"end"
		])), a.pump && (p += ia(i, 150, 412, "n", a.pump, "Brine pump", [
			172,
			426,
			"start"
		], t.flows.comp && !t.flows.brine));
	} else if (h) {
		let e = t.flows.comp;
		f += `<g class="hit" data-e="${J(a.outdoor ?? "")}"><rect class="hl" x="30" y="230" width="200" height="190" rx="16" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/><circle cx="130" cy="325" r="72" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="2"/><g class="${e ? "spin" : ""}" style="transform-origin:130px 325px;--sd:.8s">${[
			0,
			120,
			240
		].map((e) => `<path d="M130 325c10 -30 40 -40 52 -30c-8 20 -30 32 -52 30z" transform="rotate(${e} 130 325)" style="fill:var(--hf-line)"/>`).join("")}</g>` + [
			0,
			1,
			2,
			3,
			4
		].map((e) => `<circle cx="130" cy="325" r="${20 + e * 13}" fill="none" style="stroke:var(--hf-edge)" stroke-opacity=".35"/>`).join("") + "<text x=\"130\" y=\"222\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" class=\"t\">Outdoor fan coil</text></g>", d.push({
			circ: "ref",
			pts: [[285, 300], [230, 300]],
			flow: "comp"
		}), d.push({
			circ: "ref",
			pts: [[230, 360], [285, 360]],
			flow: "comp"
		}), a.outdoor && (p += i.readout(130, 445, a.outdoor));
	}
	let _ = o.compressor ? t.data[o.compressor] : void 0;
	p += `<g><rect x="285" y="170" width="235" height="280" rx="18" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/><text x="300" y="194" font-size="13" font-weight="700" class="t">${J(o.label || `${h ? "Air" : m ? "Ground" : ""} source heat pump`)}</text><g class="hit" data-e="${J(o.priority ?? "")}"><title>Priority</title><rect class="hl" x="300" y="204" width="96" height="22" rx="11" fill="${Ri[t.prio] ?? "#7a8190"}"/><text x="348" y="219" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${J(t.prio)}</text></g>` + (t.alarm ? `<g class="hit" data-e="${J(o.alarm ?? "")}"><title>${J(t.alarm)}</title><rect class="hl pulse" x="404" y="204" width="104" height="22" rx="11" style="fill:var(--hf-bad)"/><text x="456" y="219" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Alarm</text></g>` : "") + (o.compressor ? da(i, 337, 282, 30, o.compressor) + `<text x="337" y="330" text-anchor="middle" font-size="12" font-weight="700" class="t">${_ && !_.stale && _.v > 0 ? J(i.fmt(_)) : _?.stale ? "— " + J(_.stale) : "Stopped"}</text>` : "") + ba(i, [
		["Supply", o.supply],
		["Calculated", o.calculated],
		["Return", o.return]
	], 382, 258, 508) + "<path d=\"M300 344H506\" style=\"stroke:var(--hf-line)\"/>" + ba(i, [
		["Outdoor", a.outdoor],
		["Power", o.power],
		["Heat", o.heat]
	], 300, 368, 396) + ba(i, [
		["COP", o.cop],
		["Aux", o.aux],
		["DM", o.degree_minutes]
	], 412, 368, 508) + "</g>";
	let v = ji(e).reverse(), y = v.length, b = [
		30,
		145,
		260
	].slice(3 - y), x = b.map((e) => e + 34), S = b.map((e) => e + 74), C = (e, t, n = {}) => d.push({
		circ: "heat",
		pts: e,
		flow: "heat",
		speed: o.pump,
		sensors: t,
		...n
	});
	d.push({
		circ: "heat",
		pts: [[520, 250], [620, 250]],
		flow: "hp_out",
		speed: o.pump,
		sensors: Z(o.supply, 0)
	});
	let w = v[y - 1];
	C([[620, 250], [y ? 920 : 900, 250]], [
		...Z(o.supply, 0),
		...va(s.supply_plant, "plant"),
		...Z(s.house_supply ?? w?.supply, 1)
	]), y && x[0] < 250 && C([
		[920, 250],
		[920, x[0]],
		[960, x[0]]
	], [...Z(s.house_supply, 0), ...Z(v[0].supply, 1)], { z: 1 }), y && x[y - 1] > 250 && C([
		[920, 250],
		[920, x[y - 1]],
		[960, x[y - 1]]
	], [...Z(s.house_supply, 0), ...Z(w.supply, 1)], { z: 1 }), v.forEach((e, t) => t > 0 && t < y - 1 && C([[920, x[t]], [960, x[t]]], [...Z(s.house_supply, 0), ...Z(e.supply, 1)])), y && (C([
		[1150, S[0]],
		[1165, S[0]],
		[1165, 405],
		[900, 405]
	], [...Z(v[0].return, 0), ...Z(s.house_return, 1)], { z: 1 }), v.forEach((e, t) => t > 0 && C([[1150, S[t]], [1165, S[t]]], Z(e.return, 0)))), C([[900, 405], [560, 405]], [...Z(s.house_return ?? w?.return, 0), ...va(s.return_plant, "plant")], {
		z: 1,
		r: 0
	}), d.push({
		circ: "heat",
		z: 1,
		pts: [[560, 405], [520, 405]],
		flow: "hp_out",
		speed: o.pump,
		sensors: Z(o.return, 1)
	}), o.pump && (p += ia(i, 565, 250, "e", o.pump, "Pump", [
		565,
		283,
		"middle"
	]));
	let T = t.prio === "Hot water";
	p += aa(620, 250, [
		"w",
		"e",
		"s"
	], ["w", T ? "s" : "e"], `Diverter → ${T ? "hot water" : "heating"}`, o.priority, [
		620,
		216,
		"middle"
	]);
	let E = v.map((e, t) => xa(i, e, b[t], x[t], S[t])), D = c.enabled ?? !!(c.tank?.length || c.coil_in || c.hot_plant?.length), O = "";
	if (D) {
		d.push({
			circ: "dhw",
			pts: [
				[620, 250],
				[620, 455],
				[584, 455],
				[584, 500],
				[600, 500]
			],
			flow: "coil",
			speed: o.pump,
			hops: [[
				620,
				405,
				"v"
			]],
			sensors: X(c.coil_in, { at: [620, 340] })
		});
		let e = c.tank ?? [], t = la(i, 600, 470, 140, 160, e.map((t, n) => [t, e.length > 1 ? .14 + .72 * n / (e.length - 1) : .5]));
		f += t.under, O = t.over + (c.immersion ? fa(i, 660, 636, 590, c.immersion) : ""), d.push({
			circ: "dhw",
			w: 8,
			r: 8,
			flow: "coil",
			speed: o.pump,
			pts: [
				[600, 500],
				[688, 500],
				[688, 526],
				[624, 526],
				[624, 552],
				[688, 552],
				[688, 578],
				[624, 578],
				[624, 604],
				[600, 604]
			],
			sensors: [...Z(c.coil_in, 0), ...Z(c.coil_out, 1)]
		}), d.push({
			circ: "dhw",
			pts: [
				[600, 604],
				[560, 604],
				[560, 405]
			],
			flow: "coil",
			speed: o.pump,
			sensors: X(c.coil_out, { at: [560, 560] })
		}), d.push({
			circ: "hot",
			pts: [
				[670, 470],
				[670, 445],
				[1030, 445]
			],
			flow: "hot",
			sensors: [
				...Z(e[0], 0),
				...va(c.hot_plant, "plant"),
				...va(c.hot_house, "house")
			]
		}), (c.loop_pump || c.loop_house?.length || c.loop_plant?.length) && (d.push({
			circ: "hot",
			w: 7,
			pts: [[1030, 530], [740, 530]],
			flow: "recirc",
			sensors: [...va(c.loop_house, "house"), ...va(c.loop_plant, "plant")]
		}), c.loop_pump && (p += ia(i, 800, 530, "w", c.loop_pump, "Loop", [
			816,
			560,
			"start"
		])));
	}
	let k = !!l.softener, ee = !!l.storage;
	f += pa(262, 712, l.meter ?? l.cold), k ? (f += ma(i, 285, 530, 60, 142, t.saltLow, l.salt, l.salt_low), d.push({
		circ: "cold",
		z: 1,
		pts: [[262, 712], [300, 712]],
		flow: "mains",
		sensors: Z(l.cold, 0)
	}), d.push({
		circ: "cold",
		pts: [[300, 712], [300, 672]],
		flow: "mains",
		sensors: Z(l.cold, 0)
	}), d.push({
		circ: "cold",
		pts: [[300, 712], [1030, 712]],
		flow: "hard",
		sensors: Z(l.cold, 0)
	})) : d.push({
		circ: "cold",
		z: 1,
		pts: [[262, 712], [330, 712]],
		flow: "mains",
		sensors: Z(l.cold, 0)
	});
	let te = k ? [
		[345, 560],
		[362, 560],
		[362, 486]
	] : [[330, 712], [330, 486]];
	if (ee) {
		f += ha(i, 380, 498, 120, 202, t.flows.fill, l.storage_label || "Storage", l.inlet ?? l.level, l.level), d.push({
			circ: "cold",
			pts: [
				...te,
				[440, 486],
				[440, 498]
			],
			flow: "fill",
			sensors: Z(l.cold, 0)
		}), p += aa(395, 486, ["w", "e"], t.flows.fill ? ["w", "e"] : [], `Inlet${t.flows.fill ? " · open" : ""}`, l.inlet, [
			395,
			452,
			"middle"
		]);
		let e = (l.pumps ?? []).slice(0, 2), n = e.length > 1 ? [405, 470] : [440];
		e.forEach((e, t) => {
			let r = (i.val(e) ?? 0) > 0;
			d.push({
				circ: "cold",
				w: 8,
				pts: [[n[t], 668], [n[t], 650]],
				flow: r ? "soft" : void 0,
				speed: e,
				sensors: Z(l.cold, 0)
			}), p += ia(i, n[t], 682, "n", e, `P${t + 1}`, [
				n[t],
				638,
				"middle"
			]);
		}), d.push({
			circ: "cold",
			z: 1,
			pts: [
				[e.length ? n[0] : 440, 650],
				[760, 650],
				[760, 612],
				[740, 612]
			],
			flow: "soft",
			speed: e[0],
			sensors: [...Z(l.cold, 0), ...X(l.cold, { at: [640, 650] })]
		});
	} else d.push({
		circ: "cold",
		z: 1,
		pts: k ? [
			...te,
			[520, 486],
			[520, 650],
			[760, 650],
			[760, 612],
			[740, 612]
		] : [
			[330, 712],
			[330, 650],
			[760, 650],
			[760, 612],
			[740, 612]
		],
		flow: "soft",
		sensors: [...Z(l.cold, 0), ...X(l.cold, { at: [640, 650] })]
	});
	d.push({
		circ: "cold",
		pts: [[760, 650], [1030, 650]],
		flow: "soft",
		speed: l.pumps?.[0],
		sensors: Z(l.cold, 0)
	});
	let A = t.flows.soft, j = A ? "in use · hot or cold?" : "";
	p += ga(1030, 412, 135, 318, [
		...D ? [{
			y: 470,
			label: k ? "Soft hot" : "Hot",
			icon: "shower",
			on: A,
			note: j,
			e: c.hot_house?.at(-1)
		}] : [],
		...D && (c.loop_pump || c.loop_house?.length) ? [{
			y: 530,
			label: "Return loop",
			icon: "none",
			on: t.flows.recirc,
			e: c.loop_pump
		}] : [],
		{
			y: 650,
			label: k ? "Soft cold" : "Cold",
			icon: "tap",
			on: A,
			note: j,
			e: l.pumps?.[0] ?? l.cold
		},
		...k ? [{
			y: 704,
			label: "Hard (kitchen)",
			icon: "tap",
			on: t.flows.hard,
			note: l.meter ? "" : "needs a mains meter",
			e: l.meter
		}] : []
	]);
	let M = i.pipes(d), N = "style=\"filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.25))\"";
	return `<defs>${na}${M.defs}${E.map((e) => e.defs).join("")}</defs>${oa(u, 740)}${f}<g ${N}>${M.body}</g>${O}${E.map((e) => e.box).join("")}<g ${N}>${E.map((e) => e.pipes).join("")}</g>${E.map((e) => e.over).join("")}${p}${M.pills}`;
}
var ba = (e, t, n, r, i) => t.filter(([, e]) => e).map(([t, a], o) => e.row(n, r + o * 22, t, a, i)).join("");
function xa(e, t, n, r, i) {
	let a = t.emitters !== "rad", o = a && !!t.mixed, s = t.loops ?? [], c = s.filter((t) => (e.val(t) ?? 0) > 0).length, l = o ? 982 : 966, u = `<g class="hit" data-e="${J(t.supply ?? "")}"><rect class="hl" x="960" y="${n}" width="190" height="100" rx="12" fill="url(#panelg)" style="stroke:var(--hf-line)"/><text x="972" y="${n + 18}" font-size="12" font-weight="700" class="t">${J(t.name ?? "Floor")}</text><text x="1140" y="${n + 18}" text-anchor="end" font-size="10.5" class="m">${a ? "Underfloor" : "Radiators"}${o ? " · mixed" : ""}</text><text x="972" y="${n + 93}" font-size="10.5" class="m">${a ? s.length ? `${c} of ${s.length} loops open` : "" : "Radiators"}</text></g>`, d = [{
		circ: "heat",
		w: 6,
		r: 0,
		z: 1,
		pts: [[960, r], [1120, r]],
		flow: "heat",
		sensors: Z(t.supply, 0)
	}, {
		circ: "heat",
		w: 6,
		r: 0,
		z: 1,
		pts: [[l + 50, i], [1150, i]],
		flow: "heat",
		sensors: Z(t.return, 1)
	}], f = "";
	if (a) s.slice(0, 6).forEach((n, a) => {
		let o = l + 56 + a * 15, s = (e.val(n) ?? 0) > 0;
		d.push({
			circ: "heat",
			w: 5,
			r: 0,
			pts: [[o, r], [o, i]],
			flow: n,
			sensors: s ? [...Z(t.supply, 0), ...Z(t.return, 1)] : []
		}), f += `<g class="hit" data-e="${J(n)}"><title>${J(n)}: ${s ? "open" : "closed"}</title><circle class="hl" cx="${o}" cy="${r + 11}" r="4.5" style="fill:${s ? "var(--hf-run)" : "var(--hf-panel)"};stroke:var(--hf-edge)" stroke-width="1.5"/></g>`;
	});
	else for (let n = 0; n < 3; n++) f += ua(e, l + 54 + n * 30, r + 7, 24, i - r - 20, t.supply ?? "", t.return ?? "");
	o && (f += aa(974, r, [
		"w",
		"e",
		"n"
	], [
		"w",
		"e",
		"n"
	], "Mixing valve", void 0)), t.supply && (f += e.readout(l + 24, r, t.supply)), t.return && (f += e.readout(1120, i, t.return));
	let p = e.pipes(d);
	return {
		defs: p.defs,
		box: u,
		pipes: p.body,
		over: f
	};
}
//#endregion
//#region src/heating-flow/card.ts
var Sa = 500, Ca = class extends B {
	constructor(...e) {
		super(...e), this._seen = "", this._held = !1, this._down = (e) => {
			let t = this._part(e);
			this._held = !1, clearTimeout(this._timer), t && (this._timer = window.setTimeout(() => (this._held = !0, this._act(t, "hold")), Sa));
		}, this._up = () => clearTimeout(this._timer), this._click = (e) => {
			let t = this._part(e);
			t && !this._held && this._act(t, "tap");
		}, this._dbl = (e) => {
			let t = this._part(e);
			t && this._act(t, "double_tap");
		};
	}
	static {
		this.properties = { _config: { state: !0 } };
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
		this._config = { ...e }, this._seen = "";
	}
	set hass(e) {
		this._hass = e;
		let t = (this._config ? Mi(this._config) : []).map((t) => `${t}@${e.states[t]?.last_updated ?? ""}`).join(",");
		t !== this._seen && (this._seen = t, this.requestUpdate());
	}
	getCardSize() {
		return 9;
	}
	getGridOptions() {
		return {
			columns: 12,
			rows: "auto",
			min_columns: 6
		};
	}
	render() {
		if (!this._config || !this._hass) return z;
		let e = {
			...Ai,
			...this._config
		}, t = {
			pipes: e.pipes,
			markers: e.markers,
			colours: e.colours,
			readouts: e.readouts
		}, n = Bi(this._hass, this._config), r = matchMedia("(prefers-reduced-motion: reduce)").matches;
		return R`<ha-card>
      <div class="head">
        <span class="title">${e.title ?? "Heating & hot water"}</span>
        ${this._chips(n)}
      </div>
      <svg
        viewBox="0 0 ${_a} ${740}"
        role="img"
        aria-label="Heating and hot water"
        @pointerdown=${this._down}
        @pointerup=${this._up}
        @pointerleave=${this._up}
        @click=${this._click}
        @dblclick=${this._dbl}
      >
        ${ki(ya(this._config, n, t, r))}
      </svg>
    </ha-card>`;
	}
	_chips(e) {
		let t = this._config?.heat_pump?.compressor ? e.data[this._config.heat_pump.compressor] : void 0, n = this._config?.source?.outdoor ? e.data[this._config.source.outdoor] : void 0, r = (e) => e.text ?? e.v.toFixed(e.dp) + e.unit, i = e.stale.map((e) => `${this._hass?.states[e.e]?.attributes?.friendly_name ?? e.e}, ${e.stale}`);
		return R`<span class="cm-pill cm-filled" style="--tone:${Ri[e.prio] ?? "var(--secondary-text-color)"}">${e.prio}</span>
      ${t && !t.stale ? R`<span class="cm-pill">${t.v > 0 ? r(t) : "Compressor off"}</span>` : z}
      ${n && !n.stale ? R`<span class="cm-pill">Outdoor ${r(n)}</span>` : z}
      ${e.alarm ? R`<span class="cm-pill cm-filled" style="--tone:var(--error-color, #db4437)">Alarm: ${e.alarm}</span>` : z}
      ${e.saltLow ? R`<span class="cm-pill cm-filled" style="--tone:var(--warning-color, #ffa600)">Softener: top up salt</span>` : z}
      ${i.length ? R`<span class="cm-pill cm-filled wrap" style="--tone:var(--warning-color, #ffa600)">${i.length} not current: ${i.join("; ")}</span>` : R`<span class="cm-pill" style="--tone:var(--success-color, #43a047)">All sensors current</span>`}`;
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
		this.styles = [Kn, I`
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
      .wrap {
        white-space: normal;
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
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 50% { opacity: 0.35; } }
      @keyframes drip { from { transform: translateY(0); opacity: 1; } to { transform: translateY(22px); opacity: 0; } }
      @media (prefers-reduced-motion: reduce) {
        .spin, .pulse, .drip { animation: none; }
      }
    `];
	}
}, Q = (e, t) => ({
	name: e,
	selector: { entity: t ? { filter: { domain: t } } : {} }
}), $ = (e) => ({
	name: e,
	selector: { entity: {
		multiple: !0,
		reorder: !0
	} }
}), wa = (e, t) => ({
	name: e,
	selector: { select: {
		mode: "dropdown",
		options: t.map(([e, t]) => ({
			value: e,
			label: t
		}))
	} }
}), Ta = (e) => ({
	name: e,
	selector: { boolean: {} }
}), Ea = (e) => ({
	name: e,
	selector: { text: {} }
}), Da = (e, t, n, r) => ({
	type: "expandable",
	...e ? { name: e } : {},
	title: t,
	icon: r,
	schema: n
}), Oa = [
	"binary_sensor",
	"switch",
	"input_boolean",
	"valve",
	"sensor"
], ka = (e, t) => Da(`floor_${e}`, t, [
	Ea("name"),
	wa("emitters", [["ufh", "Underfloor"], ["rad", "Radiators"]]),
	Ta("mixed"),
	Q("supply", ["sensor"]),
	Q("return", ["sensor"]),
	$("loops")
], "mdi:floor-plan"), Aa = [
	Ea("title"),
	Da(void 0, "Look", [
		wa("pipes", [
			["outline", "Outline"],
			["glass", "Glass"],
			["conduit", "Conduit"],
			["neon", "Neon"]
		]),
		wa("markers", [
			["chev", "Chevrons"],
			["arrow", "Arrows"],
			["bub", "Bubbles"]
		]),
		wa("colours", [["temp", "By temperature"], ["circuit", "By circuit"]]),
		wa("readouts", [["pill", "Pills on the pipe"], ["text", "Text beside the pipe"]]),
		{
			name: "stale_hours",
			selector: { number: {
				min: 0,
				max: 168,
				step: 1,
				mode: "box",
				unit_of_measurement: "h"
			} }
		},
		Ea("area_outside"),
		Ea("area_plant"),
		Ea("area_house")
	], "mdi:palette"),
	Da("source", "Source", [
		wa("type", [
			["borehole", "Borehole"],
			["horizontal", "Horizontal ground loop"],
			["air", "Air"],
			["none", "None"]
		]),
		Q("outdoor", ["sensor"]),
		Q("pump"),
		Q("out", ["sensor"]),
		Q("ground", ["sensor"]),
		Q("in", ["sensor"]),
		Ta("pvt"),
		Q("pvt_out", ["sensor"]),
		Q("pvt_valve", Oa)
	], "mdi:earth"),
	Da("heat_pump", "Heat pump", [
		Ea("label"),
		Q("priority"),
		Q("compressor"),
		Q("supply", ["sensor"]),
		Q("calculated", ["sensor"]),
		Q("return", ["sensor"]),
		Q("pump"),
		Q("power", ["sensor"]),
		Q("heat", ["sensor"]),
		Q("cop", ["sensor"]),
		Q("aux", ["sensor"]),
		Q("degree_minutes", ["sensor"]),
		Q("alarm")
	], "mdi:heat-pump"),
	Da("heating", "Heating runs", [
		$("supply_plant"),
		$("return_plant"),
		Q("house_supply", ["sensor"]),
		Q("house_return", ["sensor"])
	], "mdi:pipe"),
	ka(1, "Lowest floor"),
	ka(2, "Next floor up"),
	ka(3, "Top floor"),
	Da("dhw", "Hot water", [
		Ta("enabled"),
		Q("coil_in", ["sensor"]),
		Q("coil_out", ["sensor"]),
		$("tank"),
		$("hot_plant"),
		$("hot_house"),
		Q("loop_pump", Oa),
		$("loop_house"),
		$("loop_plant"),
		Q("immersion")
	], "mdi:water-boiler"),
	Da("water", "Water", [
		Ta("softener"),
		Q("salt", ["sensor"]),
		Q("salt_low", Oa),
		Ta("storage"),
		Ea("storage_label"),
		Q("inlet", Oa),
		Q("level", ["sensor"]),
		$("pumps"),
		Q("meter", ["sensor"]),
		Q("cold", ["sensor"])
	], "mdi:water"),
	Da(void 0, "Tap, hold and double tap", [
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
], ja = {
	title: "Title",
	pipes: "Pipes",
	markers: "Flow markers",
	colours: "Colours",
	readouts: "Readings",
	stale_hours: "Not current after",
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
}, Ma = {
	stale_hours: "A sensor silent for longer shows its age instead of a value (0: only when unavailable).",
	supply_plant: "In the order the water passes them; the card spaces them along the run.",
	return_plant: "In the order the water passes them, from the house back to the heat pump.",
	loops: "One per underfloor loop, open when on.",
	hot_plant: "Along the hot run from the tank, in order.",
	loop_house: "Along the return loop from its far end, in order.",
	meter: "With a storage tank, a flow while it isn't filling is the hard tap.",
	priority: "Its state decides the diverter and which circuits flow."
}, Na = class extends B {
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
		return !this.hass || !this._config || !this._ready ? z : R`<ha-form
      .hass=${this.hass}
      .data=${{
			...Ai,
			...this._config
		}}
      .schema=${Aa}
      .computeLabel=${(e) => ja[e.name] ?? e.name}
      .computeHelper=${(e) => Ma[e.name]}
      @value-changed=${(e) => {
			e.stopPropagation(), this._config = {
				...this._config,
				...e.detail.value
			}, t(this, "config-changed", { config: N(this._config, Ai) });
		}}
    ></ha-form>`;
	}
};
c("casa-mia-heating-flow", Ca), c("casa-mia-heating-flow-editor", Na), l("casa-mia-heating-flow", "Casa Mia Heating Flow", "The heating and hot water as a live diagram: colour is temperature, chevrons are flow, and anything not current says so.");
//#endregion
//#region src/guest-goodbye.ts
var Pa = 1e3, Fa = (e, t) => e.state === "on" && !(e.attributes.closes_at && t / 1e3 >= e.attributes.closes_at);
function Ia(e, t, n, r, i) {
	if (!t || t.is_admin) return null;
	let a = Object.values(e).filter((e) => e.entity_id.startsWith("switch.") && e.attributes?.guest_user_id === t.id), o = a.find((e) => e.attributes.signs_out && n.get(e.entity_id) === !0 && !Fa(e, r));
	for (let e of a) n.set(e.entity_id, Fa(e, r));
	if (!o || a.some((e) => Fa(e, r))) return null;
	let s = o.attributes;
	return s.goodbye_url || `http://${i}:${s.guest_port ?? 8675}/bye`;
}
function La() {
	let e = /* @__PURE__ */ new Map();
	setInterval(() => {
		let t = document.querySelector("home-assistant")?.hass;
		if (!t?.states) return;
		let n = Ia(t.states, t.user, e, Date.now(), location.hostname);
		n && (console.info("CASA-MIA CARDS: this guest's endpoint closed; going to the goodbye page"), location.replace(n));
	}, Pa);
}
console.info(`%cCASA-MIA CARDS\n%ccommander, tablet layout (${Ft})`, "color: green; font-weight: bold;", ""), Ft !== "dev" && window.hassConnection?.then(({ conn: e }) => {
	e.addEventListener("ready", () => e.sendMessagePromise({ type: "casa_mia/cards" }).then(({ version: e }) => {
		e && e !== Ft && (console.warn(`CASA-MIA CARDS ${Ft} running, ${e} served: reload to update`), document.querySelector("home-assistant")?.dispatchEvent(new CustomEvent("hass-notification", {
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
}), La();
//#endregion
