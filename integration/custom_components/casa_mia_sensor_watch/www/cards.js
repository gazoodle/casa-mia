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
({
	...c,
	...l
});
var u = (e) => e.parentElement ?? (e.getRootNode().host || null);
function d(e) {
	for (let t = e; t; t = u(t)) if (t.tagName === "HUI-CARD-PICKER") return !0;
	return !1;
}
function ee(e, t) {
	return Object.fromEntries(Object.entries(e).filter(([e, n]) => !(e in t) || JSON.stringify(n) !== JSON.stringify(t[e])));
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
}, _ = (e) => new g(typeof e == "string" ? e : e + "", void 0, m), te = (e, ...t) => new g(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, m), ne = (e, t) => {
	if (p) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = f.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, re = p ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return _(t);
})(e) : e, { is: ie, defineProperty: ae, getOwnPropertyDescriptor: oe, getOwnPropertyNames: se, getOwnPropertySymbols: ce, getPrototypeOf: le } = Object, v = globalThis, y = v.trustedTypes, ue = y ? y.emptyScript : "", de = v.reactiveElementPolyfillSupport, b = (e, t) => e, x = {
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
}, fe = (e, t) => !ie(e, t), pe = {
	attribute: !0,
	type: String,
	converter: x,
	reflect: !1,
	useDefault: !1,
	hasChanged: fe
};
Symbol.metadata ??= Symbol("metadata"), v.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var S = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = pe) {
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
		return this.elementProperties.get(e) ?? pe;
	}
	static _$Ei() {
		if (this.hasOwnProperty(b("elementProperties"))) return;
		let e = le(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(b("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(b("properties"))) {
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
			for (let e of n) t.unshift(re(e));
		} else e !== void 0 && t.push(re(e));
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
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? fe)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
S.elementStyles = [], S.shadowRootOptions = { mode: "open" }, S[b("elementProperties")] = /* @__PURE__ */ new Map(), S[b("finalized")] = /* @__PURE__ */ new Map(), de?.({ ReactiveElement: S }), (v.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var C = globalThis, me = (e) => e, w = C.trustedTypes, he = w ? w.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ge = "$lit$", T = `lit$${Math.random().toFixed(9).slice(2)}$`, _e = "?" + T, ve = `<${_e}>`, E = document, D = () => E.createComment(""), O = (e) => e === null || typeof e != "object" && typeof e != "function", k = Array.isArray, ye = (e) => k(e) || typeof e?.[Symbol.iterator] == "function", A = "[ 	\n\f\r]", j = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, M = /-->/g, N = />/g, P = RegExp(`>|${A}(?:([^\\s"'>=/]+)(${A}*=${A}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), F = /'/g, I = /"/g, L = /^(?:script|style|textarea|title)$/i, R = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), z = Symbol.for("lit-noChange"), B = Symbol.for("lit-nothing"), be = /* @__PURE__ */ new WeakMap(), V = E.createTreeWalker(E, 129);
function H(e, t) {
	if (!k(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return he === void 0 ? t : he.createHTML(t);
}
var xe = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = j;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === j ? c[1] === "!--" ? o = M : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = P) : (L.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = P) : o = N : o === P ? c[0] === ">" ? (o = i ?? j, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? P : c[3] === "\"" ? I : F) : o === I || o === F ? o = P : o === M || o === N ? o = j : (o = P, i = void 0);
		let d = o === P && e[t + 1].startsWith("/>") ? " " : "";
		a += o === j ? n + ve : l >= 0 ? (r.push(s), n.slice(0, l) + ge + n.slice(l) + T + d) : n + T + (l === -2 ? t : d);
	}
	return [H(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, U = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = xe(t, n);
		if (this.el = e.createElement(l, r), V.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = V.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ge)) {
					let t = u[o++], n = i.getAttribute(e).split(T), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Ce : r[1] === "?" ? we : r[1] === "@" ? Te : K
					}), i.removeAttribute(e);
				} else e.startsWith(T) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (L.test(i.tagName)) {
					let e = i.textContent.split(T), t = e.length - 1;
					if (t > 0) {
						i.textContent = w ? w.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], D()), V.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], D());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === _e) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(T, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += T.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = E.createElement("template");
		return n.innerHTML = e, n;
	}
};
function W(e, t, n = e, r) {
	if (t === z) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = O(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = W(e, i._$AS(e, t.values), i, r)), t;
}
var Se = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? E).importNode(t, !0);
		V.currentNode = r;
		let i = V.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new G(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ee(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = V.nextNode(), a++);
		}
		return V.currentNode = E, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, G = class e {
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
		e = W(this, e, t), O(e) ? e === B || e == null || e === "" ? (this._$AH !== B && this._$AR(), this._$AH = B) : e !== this._$AH && e !== z && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ye(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== B && O(this._$AH) ? this._$AA.nextSibling.data = e : this.T(E.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = U.createElement(H(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Se(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = be.get(e.strings);
		return t === void 0 && be.set(e.strings, t = new U(e)), t;
	}
	k(t) {
		k(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(D()), this.O(D()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = me(e).nextSibling;
			me(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, K = class {
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
		if (i === void 0) e = W(this, e, t, 0), a = !O(e) || e !== this._$AH && e !== z, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = W(this, r[n + o], t, o), s === z && (s = this._$AH[o]), a ||= !O(s) || s !== this._$AH[o], s === B ? e = B : e !== B && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === B ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Ce = class extends K {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === B ? void 0 : e;
	}
}, we = class extends K {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== B);
	}
}, Te = class extends K {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = W(this, e, t, 0) ?? B) === z) return;
		let n = this._$AH, r = e === B && n !== B || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== B && (n === B || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ee = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		W(this, e);
	}
}, De = C.litHtmlPolyfillSupport;
De?.(U, G), (C.litHtmlVersions ??= []).push("3.3.3");
var Oe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new G(t.insertBefore(D(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, q = globalThis, J = class extends S {
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
		return z;
	}
};
J._$litElement$ = !0, J.finalized = !0, q.litElementHydrateSupport?.({ LitElement: J });
var ke = q.litElementPolyfillSupport;
ke?.({ LitElement: J }), (q.litElementVersions ??= []).push("4.2.2");
var Ae = _(".cm-pill, .cm-chip {\n  --surface: var(--card-background-color, #fff);\n  --muted: var(--secondary-text-color, #727272);\n  --accent: var(--primary-color, #03a9f4);\n  --on-accent: var(--text-primary-color, #fff);\n  --good: var(--success-color, #43a047);\n  --warn: var(--warning-color, #ffa600);\n  --bad: var(--error-color, #db4437);\n  --bark: #d8885a;\n  --mono: var(--ha-font-family-code, monospace);\n}\n.cm-pill{box-sizing:border-box;background:color-mix(in srgb, var(--tone,var(--muted)) 14%, transparent);max-width:100%;color:var(--tone,var(--muted));letter-spacing:.04em;text-transform:uppercase;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;border-radius:12px;padding:3px 9px;font-size:10px;font-weight:600;line-height:16px;display:inline-block;overflow:hidden}.cm-pill.cm-filled{background:var(--tone,var(--muted));color:var(--on-accent)}.cm-pill.cm-outline{box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--tone,var(--muted)) 55%, transparent);background:0 0}.cm-pill.cm-fixed{text-align:center;width:104px}.cm-chip{box-sizing:border-box;box-shadow:inset 0 0 0 1px var(--tone,var(--muted));background:var(--surface);color:var(--tone,var(--muted));font:inherit;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;cursor:pointer;border:none;border-radius:12px;justify-content:center;align-items:center;gap:4px;padding:3px 10px;font-size:10px;font-weight:500;line-height:16px;transition:box-shadow .15s,filter .15s;display:inline-flex}.cm-chip.cm-on{box-shadow:none;background:var(--tone,var(--accent));color:var(--on-accent)}.cm-chip.cm-icon{border-radius:50%;width:26px;height:26px;padding:4px}.cm-chip.cm-icon svg{fill:currentColor;width:16px;height:16px;display:block}.cm-chip.cm-mono{font:11px/14px var(--mono);letter-spacing:0;text-transform:none;border-radius:8px;padding:1px 6px}.cm-chip.cm-quiet{box-shadow:none;background:color-mix(in srgb, var(--surface) 80%, transparent);color:var(--muted)}.cm-chip:disabled{opacity:.4;cursor:default}.cm-chip:not(:disabled):hover,.cm-chip:focus-visible{box-shadow:inset 0 0 0 1px var(--tone,var(--muted)), 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent);filter:brightness(1.08);outline:none}.cm-chip.cm-on:not(:disabled):hover,.cm-chip.cm-on:focus-visible,.cm-chip.cm-quiet:not(:disabled):hover{box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent)}.cm-good{--tone:var(--good)}.cm-accent{--tone:var(--accent)}.cm-warn{--tone:var(--warn)}.cm-bad{--tone:var(--bad)}.cm-muted{--tone:var(--muted)}.cm-bark{--tone:var(--bark)}"), Y = "casa_mia_sensor_watch", je = Y, Me = {
	domain: Y,
	service: "list"
};
function Ne(e) {
	return e.platform === Y;
}
var Pe = [
	"task",
	"warning",
	"error",
	"critical"
], Fe = [
	"level",
	"state",
	"none"
], Ie = [
	"icon",
	"level",
	"name",
	"message",
	"value",
	"since"
], X = {
	levels: [...Pe],
	max: 20,
	when_clear: "hide",
	clear_message: "All well.",
	show: Ie.filter((e) => e !== "icon"),
	icon_color: "level"
};
function Le(e) {
	let t = e.map((e) => e === "name" || e === "message" ? "what" : e);
	return t.filter((e, n) => t.indexOf(e) === n);
}
var Re = {
	icon: "24px",
	level: "72px",
	what: "minmax(0, 1fr)",
	name: "",
	message: "",
	value: "auto",
	since: "auto"
};
function ze(e) {
	return Le(e).map((e) => Re[e]).join(" ");
}
var Be = [
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
function Ve(e, t, n) {
	let r = e.split(".")[0], i = Be.includes(t) ? "inactive" : "active", a = [
		...n ? [`--state-${r}-${n}-${t}-color`] : [],
		`--state-${r}-${t}-color`,
		`--state-${r}-${i}-color`
	], o = i === "inactive" ? "var(--state-inactive-color)" : "var(--state-icon-color)";
	return a.reduceRight((e, t) => `var(${t}, ${e})`, o);
}
function He(e, t) {
	let n = e ? Date.parse(e) : NaN;
	return Number.isNaN(n) ? t ? `${t} days` : "" : new Date(n).toLocaleDateString(void 0, {
		day: "numeric",
		month: "short"
	});
}
function Ue(e, t) {
	let n = Math.max(0, (t - Date.parse(e)) / 1e3);
	return n < 60 ? "now" : n < 3600 ? `${Math.floor(n / 60)} min` : n < 86400 ? `${Math.floor(n / 3600)} h` : `${Math.floor(n / 86400)} d`;
}
var We = `${Y}/entity`, Ge = "sensor-watch", Ke = (e, t) => `/${Ge}?watch=${encodeURIComponent(e)}&at=${t}`, qe = {
	nominal: "var(--success-color, #43a047)",
	task: "var(--info-color, #039be5)",
	warning: "var(--warning-color, #ffa600)",
	error: "var(--error-color, #db4437)",
	critical: "var(--error-color, #db4437)"
};
function Je(e, t) {
	let n = e && t?.[e.entity_id];
	if (n?.platform === "casa_mia_sensor_watch" && n?.translation_key === "status") return qe[e.state];
}
//#endregion
//#region src/sensor-watch/card.ts
var Ye = 300, Z = (e) => (/* @__PURE__ */ new Date(Date.now() - e * 36e5)).toISOString(), Xe = [
	{
		entity_id: "",
		name: "Plug 3 voltage",
		level: "critical",
		value: "198 V",
		message: "Mains far too low: under 207 V",
		since: Z(3)
	},
	{
		entity_id: "",
		name: "Freezer",
		level: "warning",
		value: "-12 °C",
		message: "Freezer too warm: check the door and seal",
		since: Z(1)
	},
	{
		entity_id: "",
		name: "Softener salt",
		level: "task",
		value: "18 %",
		message: "Top up the salt",
		since: Z(50)
	}
], Ze = _(Object.entries(qe).map(([e, t]) => `.${e} { --cm-level: ${t}; }`).join("\n")), Qe = class extends J {
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
		}, je);
		this._unsubscribe = t, t.catch((e) => console.warn(`CASA-MIA CARDS: sensor watch: can't hear its event (${e})`));
	}
	set hass(e) {
		this._hass = e, this.isConnected && this._subscribe(e);
		let t = Object.entries(e.entities ?? {}).filter(([, e]) => Ne(e)).map(([t]) => `${t}@${e.states[t]?.last_updated ?? ""}`).join(",");
		t !== this._seen && (this._seen = t, this._later()), this.requestUpdate();
	}
	set preview(e) {
		this._editing = e, this._showOrHide();
	}
	set editMode(e) {
		this._editing = e, this._showOrHide();
	}
	_later() {
		clearTimeout(this._timer), this._timer = window.setTimeout(() => this._ask(), Ye);
	}
	async _ask() {
		let e = this._hass, t = {
			...X,
			...this._config
		};
		if (e) {
			try {
				let n = await e.callWS({
					type: "call_service",
					...Me,
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
			...X,
			...this._config
		}, n = !this._editing && !(this.isConnected && d(this)) && !this._problem && this._rows !== void 0 && this._rows.length === 0 && e.when_clear === "hide";
		n !== this.hidden && (this.hidden = n, t(this, "card-visibility-changed", { value: !n }));
	}
	getCardSize() {
		return 1 + Math.min(this._rows?.length ?? 1, {
			...X,
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
		if (!this._config) return B;
		let e = {
			...X,
			...this._config
		};
		if (d(this) && (this._problem !== void 0 || this._rows !== void 0 && !this._rows.length)) return R`<ha-card .header=${e.title || "Needs looking at"}>
        ${Xe.map((e) => this._row(e, e.value ?? "", Date.now()))}
        <p class="note">An example: hidden when all is well.</p>
      </ha-card>`;
		let t = (this._rows ?? []).slice(0, e.max), n = (this._rows?.length ?? 0) - t.length, r = Date.now();
		return R`<ha-card .header=${e.title || void 0}>
      ${this._problem ? R`<p class="note problem">${this._problem}</p>` : B}
      ${!this._problem && this._rows && !t.length ? R`<p class="note">${e.when_clear === "message" ? e.clear_message : "All well: nothing to list, so this card is hidden on the dashboard."}</p>` : B}
      ${t.map((e) => {
			let t = this._hass?.states[e.entity_id];
			if (e.days_until) return this._row(e, He(e.attribute ? String(t?.attributes?.[e.attribute] ?? "") : t?.state, e.value), r);
			if (e.attribute) return this._row(e, String(t?.attributes?.[e.attribute] ?? e.value ?? ""), r);
			let n = t?.attributes?.unit_of_measurement ?? "", i = t && (this._hass?.formatEntityState?.(t) ?? `${t.state}${n ? ` ${n}` : ""}`);
			return this._row(e, i || (e.value ?? ""), r);
		})}
      ${n > 0 ? R`<p class="note">and ${n} more</p>` : B}
    </ha-card>`;
	}
	_row(e, n, r) {
		let i = {
			...X,
			...this._config
		}, a = i.show, o = this._hass?.states[e.entity_id];
		return R`<button
      class="row ${e.level}"
      style="grid-template-columns:${ze(a)}"
      @click=${() => e.entity_id && t(this, "hass-more-info", { entityId: e.entity_id })}
    >
      ${Le(a).map((t) => {
			switch (t) {
				case "icon": {
					let t = i.icon_color === "level" ? "var(--cm-level)" : i.icon_color === "state" && o ? Ve(e.entity_id, o.state, o.attributes?.device_class) : "";
					return R`<ha-state-icon class="icon" style=${t ? `color:${t}` : ""} .hass=${this._hass} .stateObj=${o}></ha-state-icon>`;
				}
				case "level": return R`<span class="level cm-pill ${e.level === "critical" ? "cm-filled" : ""}">${e.level}</span>`;
				case "what": return R`<span class="what">
            ${a.filter((e) => e === "name" || e === "message").map((t) => t === "name" ? R`<span class="name">${e.name}</span>` : e.message ? R`<span class="message">${e.message}</span>` : B)}
          </span>`;
				case "value": return R`<span class="value">${n}</span>`;
				case "since": return R`<span class="since">${Ue(e.since, r)}</span>`;
				default: return B;
			}
		})}
    </button>`;
	}
	static {
		this.styles = [
			Ae,
			Ze,
			te`
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
}, $e = {
	icon: "Icon",
	level: "Level",
	name: "Name",
	message: "Message",
	value: "Value (its state now)",
	since: "How long"
}, et = (e) => [
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
			options: Pe.map((e) => ({
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
			options: Ie.map((e) => ({
				value: e,
				label: $e[e]
			}))
		} }
	},
	{
		name: "icon_color",
		selector: { select: {
			mode: "dropdown",
			options: Fe.map((e) => ({
				value: e,
				label: tt[e]
			}))
		} }
	}
], tt = {
	level: "The level's colour",
	state: "Its state's colour, as a tile",
	none: "None"
}, nt = {
	title: "Title",
	group: "Group",
	levels: "Levels to list",
	max: "At most",
	when_clear: "When all is well",
	clear_message: "Its message",
	show: "Each row shows",
	icon_color: "Icon colour"
}, rt = {
	title: "Or none, and give its panel a garnish heading (it hides with the card).",
	group: "Only one group's members (from Casa Mia's Sensor Watch page), or every watched sensor.",
	show: "Drag to reorder; the name and message share a place, where the first of them is."
}, it = class extends J {
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
					...Me,
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
		return !this.hass || !this._config || !this._ready ? B : (this._askGroups(), R`<ha-form
      .hass=${this.hass}
      .data=${{
			...X,
			...this._config
		}}
      .schema=${et(this._groups)}
      .computeLabel=${(e) => nt[e.name] ?? e.name}
      .computeHelper=${(e) => rt[e.name]}
      @value-changed=${(e) => {
			e.stopPropagation();
			let n = {
				...this._config,
				...e.detail.value
			};
			n.group || delete n.group, this._config = n, t(this, "config-changed", { config: ee(this._config, X) });
		}}
    ></ha-form>`);
	}
}, Q = "casa-mia-watch-eye", at = class extends J {
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
		this._for = this.entityId, this.entityId && e && (this._off = e.subscribeMessage((e) => this._watch = "error" in e ? void 0 : e, {
			type: We,
			entity_id: this.entityId
		}), this._off.catch((e) => {
			e?.code !== "unknown_command" && e?.code !== "not_running" && console.warn(`CASA-MIA CARDS: the eye: can't ask Sensor Watch (${e?.message ?? e})`);
		}));
	}
	_unsubscribe() {
		this._off?.then((e) => e()).catch(() => {}), this._off = void 0, this._watch = void 0;
	}
	_open() {
		if (!this.hass?.panels?.["sensor-watch"]) {
			t(this, "hass-notification", {
				message: "Sensor Watch's page isn't in Home Assistant's sidebar. Restart Home Assistant if Casa Mia has just been updated.",
				duration: 1e4
			});
			return;
		}
		this.dialog?.closeDialog?.(), i(Ke(this.entityId, Date.now()));
	}
	render() {
		let e = this._watch;
		if (!e) return B;
		let t = e.watched ? e.level : void 0, n = e.watched ? `Sensor Watch: ${t ?? "watched, no level yet"}${e.escalated && e.real ? ` (escalated from ${e.real})` : ""}${e.message ? `: ${e.message}` : ""}. Open its watch` : "Watch in Sensor Watch";
		return R`<button class=${t ?? ""} title=${n} aria-label=${n} @click=${this._open}>
      <ha-icon icon=${e.watched ? "mdi:eye" : "mdi:eye-plus-outline"}></ha-icon>
      ${t ? R`<span class="cm-pill ${t === "critical" ? "cm-filled" : ""}">${t}</span>` : B}
    </button>`;
	}
	static {
		this.styles = [
			Ae,
			Ze,
			te`
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
function ot(e) {
	let t = e.shadowRoot, n = t?.querySelector(Q), i = t?.querySelector("[slot=\"headerTitle\"]");
	if (!t || !e.hass?.user?.is_admin || !e._entityId || e._currView !== "info" || !i) {
		t && e._entityId && !i && r("the entity dialog's header changed; no eye"), n?.remove();
		return;
	}
	n || (n = document.createElement(Q), n.slot = "headerActionItems", i.after(n)), n.hass = e.hass, n.dialog = e, n.entityId = e._entityId;
}
customElements.whenDefined("ha-more-info-dialog").then(() => {
	let e = customElements.get("ha-more-info-dialog").prototype, t = e.updated;
	if (typeof t != "function") {
		r("the entity dialog changed; no eye");
		return;
	}
	e.updated = function(...e) {
		t.apply(this, e), ot(this);
	};
});
//#endregion
//#region src/sensor-watch/level-colour.ts
var st = () => document.querySelector("home-assistant")?.hass?.entities;
function $(e) {
	let t = [document];
	for (let n; n = t.pop();) for (let r of n.querySelectorAll("*")) r.localName === e && r.requestUpdate?.(), r.shadowRoot && t.push(r.shadowRoot);
}
customElements.whenDefined("ha-state-icon").then(() => {
	let e = customElements.get("ha-state-icon").prototype, t = e.updated;
	if (typeof t != "function") return r("ha-state-icon changed; the Status sensor keeps HA's colour");
	e.updated = function(...e) {
		t.apply(this, e);
		let n = Je(this.stateObj, this._entities ?? this.hass?.entities ?? st());
		n ? (this.style.color !== n && (this.style.color = n), this.cmLevelColour = !0) : this.cmLevelColour &&= (this.style.removeProperty("color"), !1);
	}, $("ha-state-icon");
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
			typeof t == "function" ? this._computeStateColor = (e, n) => !n && Je(e, this.hass?.entities) || t(e, n) : r(`${e} changed; the Status sensor keeps HA's colour`);
		}
		return n.apply(this, t);
	}, $(e);
});
o("casa-mia-sensor-watch", Qe), o("casa-mia-sensor-watch-editor", it), o(Q, at), s("casa-mia-sensor-watch", "Casa Mia Sensor Watch", "What needs doing or has gone wrong (all of it, or one group's), worst first; hidden when all is well.");
//#endregion
