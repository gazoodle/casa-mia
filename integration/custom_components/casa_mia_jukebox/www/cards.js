//#region src/connection.ts
var e = 6e4, t = [
	"pointerdown",
	"keydown",
	"wheel"
];
function n(e, t) {
	let n = (t) => console.error(`CASA-MIA CARDS: ${e} won't work: ${t}`), r = () => {
		let e = window.hassConnection;
		return e?.then(t, (e) => n(`Home Assistant's connection failed (${e})`)), !!e;
	};
	if (r()) return;
	let i = 600, a = setInterval(() => {
		r() ? clearInterval(a) : --i === 0 && (clearInterval(a), n("Home Assistant's connection never appeared"));
	}, 100);
}
function r(e, t, r, i) {
	r !== "dev" && n(`${e}'s offer to reload after an update`, ({ conn: n }) => {
		n.addEventListener("ready", () => n.sendMessagePromise({ type: t }).then(({ version: t }) => {
			t && t !== r && (console.warn(`CASA-MIA CARDS: ${e} ${r} running, ${t} served: reload to update`), document.querySelector("home-assistant")?.dispatchEvent(new CustomEvent("hass-notification", {
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
			})), i && a(e, i));
		}, () => {}));
	});
}
var i = !1;
function a(n, r) {
	if (i) return;
	i = !0;
	let a, o = () => {
		clearTimeout(a), a = setTimeout(() => {
			r() && (console.warn(`CASA-MIA CARDS: ${n} reloading itself to update, untouched for ${e / 1e3} s`), location.reload());
		}, e);
	};
	for (let e of t) window.addEventListener(e, o, {
		capture: !0,
		passive: !0
	});
	o();
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
function l(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function u(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !0,
		documentationURL: "https://github.com/gazoodle/casa-mia/blob/main/docs/applets/jukebox.md"
	});
}
var d = o.main, ee = o.panel;
({
	...d,
	...ee
});
var te = (e) => e.parentElement ?? (e.getRootNode().host || null);
function f(e) {
	for (let t = e; t; t = te(t)) if (t.tagName === "HUI-CARD-PICKER") return !0;
	return !1;
}
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var p = globalThis, m = p.ShadowRoot && (p.ShadyCSS === void 0 || p.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, ne = Symbol(), re = /* @__PURE__ */ new WeakMap(), ie = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== ne) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (m && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = re.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && re.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, ae = (e) => new ie(typeof e == "string" ? e : e + "", void 0, ne), h = (e, ...t) => new ie(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, ne), oe = (e, t) => {
	if (m) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = p.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, se = m ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return ae(t);
})(e) : e, { is: ce, defineProperty: le, getOwnPropertyDescriptor: ue, getOwnPropertyNames: de, getOwnPropertySymbols: fe, getPrototypeOf: pe } = Object, g = globalThis, me = g.trustedTypes, he = me ? me.emptyScript : "", ge = g.reactiveElementPolyfillSupport, _ = (e, t) => e, _e = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? he : null;
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
}, ve = (e, t) => !ce(e, t), ye = {
	attribute: !0,
	type: String,
	converter: _e,
	reflect: !1,
	useDefault: !1,
	hasChanged: ve
};
Symbol.metadata ??= Symbol("metadata"), g.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var v = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ye) {
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
		return this.elementProperties.get(e) ?? ye;
	}
	static _$Ei() {
		if (this.hasOwnProperty(_("elementProperties"))) return;
		let e = pe(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(_("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(_("properties"))) {
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
			let i = (n.converter?.toAttribute === void 0 ? _e : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? _e : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ve)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
v.elementStyles = [], v.shadowRootOptions = { mode: "open" }, v[_("elementProperties")] = /* @__PURE__ */ new Map(), v[_("finalized")] = /* @__PURE__ */ new Map(), ge?.({ ReactiveElement: v }), (g.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var y = globalThis, be = (e) => e, b = y.trustedTypes, xe = b ? b.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, Se = "$lit$", x = `lit$${Math.random().toFixed(9).slice(2)}$`, Ce = "?" + x, we = `<${Ce}>`, S = document, C = () => S.createComment(""), w = (e) => e === null || typeof e != "object" && typeof e != "function", Te = Array.isArray, Ee = (e) => Te(e) || typeof e?.[Symbol.iterator] == "function", De = "[ 	\n\f\r]", T = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Oe = /-->/g, ke = />/g, E = RegExp(`>|${De}(?:([^\\s"'>=/]+)(${De}*=${De}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Ae = /'/g, je = /"/g, Me = /^(?:script|style|textarea|title)$/i, D = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), O = Symbol.for("lit-noChange"), k = Symbol.for("lit-nothing"), Ne = /* @__PURE__ */ new WeakMap(), A = S.createTreeWalker(S, 129);
function Pe(e, t) {
	if (!Te(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return xe === void 0 ? t : xe.createHTML(t);
}
var Fe = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = T;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === T ? c[1] === "!--" ? o = Oe : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = E) : (Me.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = E) : o = ke : o === E ? c[0] === ">" ? (o = i ?? T, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? E : c[3] === "\"" ? je : Ae) : o === je || o === Ae ? o = E : o === Oe || o === ke ? o = T : (o = E, i = void 0);
		let d = o === E && e[t + 1].startsWith("/>") ? " " : "";
		a += o === T ? n + we : l >= 0 ? (r.push(s), n.slice(0, l) + Se + n.slice(l) + x + d) : n + x + (l === -2 ? t : d);
	}
	return [Pe(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, j = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Fe(t, n);
		if (this.el = e.createElement(l, r), A.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = A.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(Se)) {
					let t = u[o++], n = i.getAttribute(e).split(x), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Le : r[1] === "?" ? Re : r[1] === "@" ? ze : P
					}), i.removeAttribute(e);
				} else e.startsWith(x) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Me.test(i.tagName)) {
					let e = i.textContent.split(x), t = e.length - 1;
					if (t > 0) {
						i.textContent = b ? b.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], C()), A.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], C());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === Ce) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(x, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += x.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = S.createElement("template");
		return n.innerHTML = e, n;
	}
};
function M(e, t, n = e, r) {
	if (t === O) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = w(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = M(e, i._$AS(e, t.values), i, r)), t;
}
var Ie = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? S).importNode(t, !0);
		A.currentNode = r;
		let i = A.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new N(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Be(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = A.nextNode(), a++);
		}
		return A.currentNode = S, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, N = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = k, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = M(this, e, t), w(e) ? e === k || e == null || e === "" ? (this._$AH !== k && this._$AR(), this._$AH = k) : e !== this._$AH && e !== O && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? Ee(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== k && w(this._$AH) ? this._$AA.nextSibling.data = e : this.T(S.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = j.createElement(Pe(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ie(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Ne.get(e.strings);
		return t === void 0 && Ne.set(e.strings, t = new j(e)), t;
	}
	k(t) {
		Te(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(C()), this.O(C()), this, this.options)) : r = n[i], r._$AI(a), i++;
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
}, P = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = k, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = k;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = M(this, e, t, 0), a = !w(e) || e !== this._$AH && e !== O, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = M(this, r[n + o], t, o), s === O && (s = this._$AH[o]), a ||= !w(s) || s !== this._$AH[o], s === k ? e = k : e !== k && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === k ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Le = class extends P {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === k ? void 0 : e;
	}
}, Re = class extends P {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== k);
	}
}, ze = class extends P {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = M(this, e, t, 0) ?? k) === O) return;
		let n = this._$AH, r = e === k && n !== k || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== k && (n === k || r);
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
		M(this, e);
	}
}, Ve = y.litHtmlPolyfillSupport;
Ve?.(j, N), (y.litHtmlVersions ??= []).push("3.3.3");
var He = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new N(t.insertBefore(C(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, F = globalThis, I = class extends v {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = He(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return O;
	}
};
I._$litElement$ = !0, I.finalized = !0, F.litElementHydrateSupport?.({ LitElement: I });
var Ue = F.litElementPolyfillSupport;
Ue?.({ LitElement: I }), (F.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/jukebox/common.ts
var L = "casa_mia_jukebox", We = new URL(import.meta.url).searchParams.get("v") || "dev", Ge = `${L}/cards`;
function Ke(e, t) {
	let n = e.subscribeMessage((e) => t(e), { type: `${L}/house` });
	return n.catch((e) => t(void 0, e?.code === "unknown_command" ? "Jukebox isn't set up in Home Assistant" : e?.message ?? String(e))), () => void n.then((e) => e()).catch(() => void 0);
}
function R(e, t, n, r = {}) {
	return e.connection.sendMessagePromise({
		type: `${L}/do`,
		action: t,
		entity_id: n,
		...r
	});
}
function qe(e, t) {
	return e.connection.sendMessagePromise({
		type: `${L}/favourites`,
		entity_id: t
	});
}
function Je(e, t) {
	return e.connection.sendMessagePromise({
		type: `${L}/queue`,
		entity_id: t
	});
}
function Ye(e, t, n) {
	return e.connection.sendMessagePromise({
		type: `${L}/search`,
		entity_id: t,
		query: n
	});
}
function Xe(e, t, n) {
	let r = n ? {
		media_content_type: n.media_content_type,
		media_content_id: n.media_content_id
	} : {};
	return e.connection.sendMessagePromise({
		type: `${L}/browse`,
		entity_id: t,
		...r
	});
}
function Ze(e, t) {
	return e.connection.sendMessagePromise({
		type: `${L}/order`,
		rooms: t
	});
}
var z = (e) => e?.message ?? String(e), B = (e, t) => e.groups.find((e) => e.rooms.includes(t)), V = (e, t) => t.rooms.map((t) => e.rooms[t]?.name ?? t).join(" + ");
function Qe(e, t) {
	let n = t.rooms.map((t) => e.rooms[t]?.volume).filter((e) => typeof e == "number");
	return n.length ? Math.round(n.reduce((e, t) => e + t, 0) / n.length) : 0;
}
function H(e) {
	let t = {
		tv: "Television",
		line_in: "Line-in",
		nothing: "Nothing playing"
	};
	return e.kind in t ? {
		title: e.title || t[e.kind],
		by: ""
	} : e.kind === "radio" ? {
		title: e.title || e.channel,
		by: e.artist || (e.title && e.title !== e.channel ? e.channel : "")
	} : {
		title: e.title,
		by: e.artist
	};
}
function $e(e, t) {
	if (typeof e.position != "number" || !e.duration) return null;
	let n = e.state === "playing" && e.position_at ? Math.max(0, (t - Date.parse(e.position_at)) / 1e3) : 0;
	return Math.min(e.duration, Math.floor(e.position + n));
}
var U = (e) => new Date(e).toLocaleTimeString([], {
	hour: "2-digit",
	minute: "2-digit",
	hour12: !1
}), W = (e) => `${Math.floor(e / 60)}:${String(Math.floor(e % 60)).padStart(2, "0")}`;
function G(e) {
	let t = 0;
	for (let n of e) t = t * 31 + n.charCodeAt(0) >>> 0;
	let n = t % 360;
	return [`hsl(${n} 72% 56%)`, `hsl(${(n + 70) % 360} 62% 30%)`];
}
var et = (e) => e.split(/\s+/).slice(0, 2).map((e) => e[0] ?? "").join("").toUpperCase();
function tt(e, t) {
	let n = !1, r, i = (a) => {
		if (n) return void (r = { value: a });
		n = !0, e(a).catch(t).finally(() => {
			n = !1;
			let e = r;
			r = void 0, e && i(e.value);
		});
	};
	return i;
}
//#endregion
//#region src/jukebox/parts.ts
var nt = {
	play: "M8 5v14l11-7z",
	pause: "M6 5h4v14H6zM14 5h4v14h-4z",
	stop: "M6 6h12v12H6z",
	next: "M6 6l8.5 6L6 18zM16 6h2v12h-2z",
	previous: "M18 6l-8.5 6L18 18zM6 6h2v12H6z",
	shuffle: "M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z",
	repeat: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
	queue: "M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z",
	drag: "M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z",
	save: "M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z",
	trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
	search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
	chevron: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
	lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
	rooms: "M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 1.99 2 1.99L17 22c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 2c1.1 0 2 .9 2 2s-.9 2-2 2c-1.11 0-2-.9-2-2s.89-2 2-2zm0 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
	favourites: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
	down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z",
	close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
	volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z",
	check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
	plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
	menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
	back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
	home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
}, K = (e) => D`<svg viewBox="0 0 24 24" aria-hidden="true"><path d=${nt[e]}></path></svg>`;
function q(e, t, n) {
	let [r, i] = G(n);
	return D`<span class="art" style="--a:${r};--b:${i}"><i>${et(n)}</i>${t ? D`<img src=${e?.hassUrl?.(t) ?? t} alt="" @error=${(e) => e.target.remove()} />` : k}</span>`;
}
var rt = class {
	constructor(e) {
		this.host = e, e.addController(this);
	}
	hostConnected() {
		this.timer = setInterval(() => this.host.requestUpdate(), 1e3);
	}
	hostDisconnected() {
		clearInterval(this.timer);
	}
};
try {
	CSS.registerProperty({
		name: "--jb-turn",
		syntax: "<angle>",
		inherits: !1,
		initialValue: "0deg"
	});
} catch {}
var J = class {
	constructor(e) {
		this.host = e, this.waiting = /* @__PURE__ */ new Map(), this.changes = 0;
	}
	during(e, t) {
		let n = (t) => {
			this.waiting.set(e, (this.waiting.get(e) ?? 0) + t), this.changes++, this.host.requestUpdate();
		};
		n(1);
		let r = () => n(-1);
		return t.then(r, r), t;
	}
	on(e) {
		return this.waiting.get(e) ? "busy" : "";
	}
}, it = "casa-mia-jukebox-slider", at = 16, ot = 22, st = class extends I {
	static {
		this.properties = {
			value: { type: Number },
			max: { type: Number },
			label: {},
			_held: { state: !0 }
		};
	}
	constructor() {
		super(), this.value = 0, this.max = 100, this.label = "", this._down = (e) => {
			if (e.button) return;
			let t = this.getBoundingClientRect(), n = this._held ?? this.value, r = t.width - at, i = t.left + at / 2 + (this.max ? n / this.max : 0) * r;
			Math.abs(e.clientX - i) > ot || (this.setPointerCapture(e.pointerId), this._drag = {
				x: e.clientX,
				from: n,
				travel: r,
				moved: !1
			});
		}, this._dragged = (e) => {
			let t = this._drag;
			if (!t || t.travel <= 0) return;
			let n = Math.round(Math.max(0, Math.min(this.max, t.from + (e.clientX - t.x) / t.travel * this.max)));
			n !== (this._held ?? this.value) && (t.moved = !0, this._send(n, !1));
		}, this._let = () => {
			let e = this._drag;
			this._drag = void 0, e?.moved && this._send(this._held ?? this.value, !0);
		}, this.addEventListener("pointerdown", this._down), this.addEventListener("pointermove", this._dragged), this.addEventListener("pointerup", this._let), this.addEventListener("pointercancel", this._let);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), clearTimeout(this._settle);
	}
	_send(e, t) {
		this._held = e, clearTimeout(this._settle), s(this, t ? "jb-set" : "jb-slide", { value: e }), t && (this._settle = setTimeout(() => this._held = void 0, 1500));
	}
	_keyed(e, t) {
		this._send(Number(e.target.value), t);
	}
	render() {
		let e = this._held ?? this.value;
		return D`<input
      type="range"
      min="0"
      max=${this.max}
      .value=${String(e)}
      style="--fill:${this.max ? 100 * e / this.max : 0}%"
      aria-label=${this.label}
      @input=${(e) => this._keyed(e, !1)}
      @change=${(e) => this._keyed(e, !0)}
    />`;
	}
	static {
		this.styles = h`
    /* Half as tall again as the line and its dot need, so a finger a little above or below
       still takes the dot. The margins give the height back, so what is around the slider
       stays where it was. A finger moving up or down still scrolls the page. */
    :host { display: block; flex: 1; min-width: 0; height: 33px; margin: -5.5px 0; padding: 5.5px 0; box-sizing: border-box; cursor: pointer; touch-action: pan-y; }
    input { display: block; width: 100%; height: 22px; margin: 0; background: none; appearance: none; -webkit-appearance: none; pointer-events: none; }
    input::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--jb-fill, currentColor) var(--fill), var(--jb-track, rgb(128 128 128 / 35%)) var(--fill)); }
    input::-moz-range-track { height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--jb-fill, currentColor) var(--fill), var(--jb-track, rgb(128 128 128 / 35%)) var(--fill)); }
    input::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; margin-top: -6px; border: 0; border-radius: 50%; background: var(--jb-fill, currentColor); box-shadow: 0 1px 4px rgb(0 0 0 / 40%); }
    input::-moz-range-thumb { width: 16px; height: 16px; border: 0; border-radius: 50%; background: var(--jb-fill, currentColor); box-shadow: 0 1px 4px rgb(0 0 0 / 40%); }
  `;
	}
}, Y = h`
  * { box-sizing: border-box; }
  button { margin: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; text-align: inherit; }
  button:disabled { opacity: 0.4; cursor: default; }
  svg { display: block; width: 24px; height: 24px; fill: currentColor; }
  .ib { display: grid; place-items: center; flex: none; width: 42px; height: 42px; border-radius: 50%; }
  .ib:hover:not(:disabled) { background: color-mix(in srgb, currentColor 12%, transparent); }
  .busy { position: relative; }
  /* Just outside the button, so it shows round one that is itself white, and with a glow. */
  .busy::after { content: ""; position: absolute; inset: -5px; padding: 3px; border-radius: 999px; pointer-events: none; filter: drop-shadow(0 0 5px var(--jb-glow, currentColor));
    background: conic-gradient(from var(--jb-turn, 0deg), transparent 0 30%, var(--jb-glow, currentColor) 95%, transparent);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
    animation: jb-turn 0.9s linear infinite, jb-pulse 0.9s ease-in-out infinite alternate; }
  @keyframes jb-turn { to { --jb-turn: 360deg; } }
  @keyframes jb-pulse { from { opacity: 0.6; } }
  /* What isn't round keeps its own corners, and the arc runs along its edge. */
  .busy.row::after, .tools .busy::after, .tiles .busy::after { inset: -2px; border-radius: 16px; }
  .art { position: relative; display: grid; place-items: center; aspect-ratio: 1; width: 100%; overflow: hidden; border-radius: 12px; color: rgb(255 255 255 / 92%); font-weight: 800; container-type: inline-size;
    background: radial-gradient(circle at 28% 22%, rgb(255 255 255 / 38%), transparent 42%), conic-gradient(from 200deg at 68% 72%, var(--a), var(--b), var(--a)); }
  .art i { font-style: normal; font-size: 30cqw; letter-spacing: -0.02em; text-shadow: 0 2px 12px rgb(0 0 0 / 30%); }
  .art img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
`, ct = "casa-mia-jukebox-big", lt = [
	["queue", "Queue"],
	["rooms", "Rooms"],
	["favourites", "Favourites"],
	["search", "Search"]
], ut = {
	off: "all",
	all: "one",
	one: "off"
};
function X(e, t, n, r) {
	document.querySelector(ct)?.remove(), document.body.append(Object.assign(document.createElement(ct), {
		hass: e,
		room: t,
		tab: n,
		first: r
	}));
}
var dt = class extends I {
	static {
		this.properties = {
			room: {},
			tab: {},
			inline: {
				type: Boolean,
				reflect: !0
			},
			_house: { state: !0 },
			_why: { state: !0 },
			_favourites: { state: !0 },
			_menu: { state: !0 },
			_confirm: { state: !0 },
			_naming: { state: !0 },
			_partying: { state: !0 },
			_queued: { state: !0 },
			_stamp: { state: !0 },
			_toast: { state: !0 }
		};
	}
	constructor() {
		super(), this.room = "", this._naming = !1, this.inline = !1, this._stamp = 0, this._partying = !1, this._toast = "", this._sliders = /* @__PURE__ */ new Map(), this._busy = new J(this), this._key = (e) => {
			e.key === "Escape" && !this.inline && this.remove();
		}, this._ask = (e, t) => this._do(e, t), this._save = async (e) => {
			e.preventDefault();
			let t = String(new FormData(e.target).get("name") ?? "").trim();
			t && (this._naming = !1, await this._do("queue_save", { name: t }) && (this._say(`Saved as a playlist: ${t}`), this._favourites = void 0));
		}, this._waiting = (e) => this._busy.on(e), new rt(this);
	}
	connectedCallback() {
		super.connectedCallback(), this._off = Ke(this.hass.connection, (e, t) => [this._house, this._why] = [e, t]), window.addEventListener("keydown", this._key);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._off?.(), window.removeEventListener("keydown", this._key), clearTimeout(this._fade);
	}
	willUpdate(e) {
		if (e.has("_house") && this._house && this.first) {
			let e = B(this._house, this.room);
			e && this._stop(this._house, e), this.first = void 0;
		}
		if (e.has("_house") && this._house) {
			let e = B(this._house, this.room)?.party?.undone[0];
			e && this._said !== void 0 && e.at !== this._said && this._say(e.failed ? e.what : `Put back: ${e.what.replace(/^Someone/, "someone")}`), this._said = e?.at ?? "";
		}
		(e.has("tab") || e.has("_favourites")) && this.tab === "favourites" && this._favourites === void 0 && qe(this.hass, this.room).then((e) => this._favourites = e, (e) => this._favourites = z(e));
	}
	_shut() {
		return this.inline ? D`<span class="ib"></span>` : D`<button class="ib" @click=${() => this.remove()} aria-label="Close the player">${K("down")}</button>`;
	}
	_say(e) {
		this._toast = e, clearTimeout(this._fade), this._fade = setTimeout(() => this._toast = "", 3500);
	}
	_do(e, t = {}, n = e) {
		return this._busy.during(n, R(this.hass, e, this.room, t)).then(() => (/^(queue_|play_media|stop)/.test(e) && this._stamp++, !0), (e) => (this._say(z(e)), !1));
	}
	_slide(e, t) {
		let n = `${e} ${t}`;
		return this._sliders.has(n) || this._sliders.set(n, tt((n) => R(this.hass, e, t, { value: n }), (e) => this._say(z(e)))), (e) => this._sliders.get(n)(e.detail.value);
	}
	_toggleRoom(e, t) {
		if (!e.rooms.includes(t)) return void this._do("join", { room: t }, `room:${t}`);
		if (e.rooms.length === 1) return this._say("That is the last room. Pause the music to stop it.");
		t === this.room && (this.room = e.rooms.find((e) => e !== t)), this._do("leave", { room: t }, `room:${t}`);
	}
	async _play(e, t) {
		this._menu = this._confirm = void 0, await this._do("play_media", {
			media_content_id: e.media_content_id,
			media_content_type: e.media_content_type,
			...t ? { enqueue: t } : {}
		}, `fav:${e.media_content_id}`) && this._say(`${{
			next: "Playing next",
			add: "Added to the end"
		}[t ?? ""] ?? "Playing"}: ${e.title}`);
	}
	_choose(e, t) {
		t.live || e.kind === "nothing" && !t.playlist ? this._play(t) : this._menu = t;
	}
	_tabs(e) {
		let t = this.tab ?? "rooms";
		return D`<div class="tabs">
      ${lt.map(([n, r]) => D`<button class=${this.tab === n ? "up" : t === n ? "shown" : ""} @click=${() => this.tab = this.tab === n ? void 0 : n}>
          ${K(n)}${r}${n === "rooms" && e.rooms.length > 1 ? D` (${e.rooms.length})` : k}
        </button>`)}
    </div>`;
	}
	_now(e, t) {
		let { title: n, by: r } = H(t), i = $e(t, Date.now()), a = t.state === "playing", o = t.kind === "queue";
		return D`<div class="now">
      <div class="bar">
        ${this._shut()}
        <div class="where"><small>Playing in</small><b>${V(e, t)}</b></div>
        <button class="pill ${t.party ? "on" : ""} ${this._busy.on("party")}" @click=${() => t.party ? this._partying = !0 : this._party(!0)} aria-label=${t.party ? "The party lock is on" : "Turn the party lock on"}>
          ${K("lock")}${t.party ? `Party on${t.party.undone.length ? ` · ${t.party.undone.length}` : ""}` : "Party"}
        </button>
      </div>
      <div class="cover">${q(this.hass, t.picture, n)}</div>
      <div class="title"><b>${n}</b><span>${r}</span></div>
      ${i !== null && t.duration ? D`<div class="seek">
            <span>${W(i)}</span>
            <casa-mia-jukebox-slider .value=${i} .max=${t.duration} label="Place in the song" @jb-set=${(e) => this._do("seek", { value: e.detail.value })}></casa-mia-jukebox-slider>
            <span>${W(t.duration)}</span>
          </div>` : t.kind === "radio" ? D`<div class="live">LIVE${t.channel ? ` · ${t.channel.toUpperCase()}` : ""}</div>` : k}
      <div class="tp">
        ${o ? D`<button class="ib sm ${t.shuffle ? "on" : ""} ${this._busy.on("shuffle")}" @click=${() => this._do("shuffle", { on: !t.shuffle })} aria-label="Shuffle">${K("shuffle")}</button>` : k}
        ${o ? D`<button class="ib ${this._busy.on("previous")}" @click=${() => this._do("previous")} aria-label="Previous song">${K("previous")}</button>` : k}
        <button class="ib play ${this._busy.on("play")}" ?disabled=${t.kind === "nothing"} @click=${() => this._do(a ? "pause" : "play", {}, "play")} aria-label=${a ? "Pause" : "Play"}>${K(a ? "pause" : "play")}</button>
        ${o ? D`<button class="ib ${this._busy.on("next")}" @click=${() => this._do("next")} aria-label="Next song">${K("next")}</button>` : k}
        ${o ? D`<button class="ib sm ${t.repeat === "off" ? "" : "on"} ${this._busy.on("repeat")}" @click=${() => this._do("repeat", { mode: ut[t.repeat] })} aria-label="Repeat">
              ${K("repeat")}${t.repeat === "one" ? D`<sup>1</sup>` : k}
            </button>` : k}
      </div>
      <div class="gvol">
        ${K("volume")}
        <casa-mia-jukebox-slider .value=${Qe(e, t)} label="Volume" @jb-slide=${this._slide("group_volume", t.id)} @jb-set=${this._slide("group_volume", t.id)}></casa-mia-jukebox-slider>
        <button class="ib ${this._busy.on("stop")}" @click=${() => this._stop(e, t)} aria-label="Stop the music here and clear the player">${K("stop")}</button>
      </div>
      ${this._tabs(t)}
    </div>`;
	}
	_head(e, t) {
		return D`<div class="head">
      <b>${e}<small>${t}</small></b>
      <button class="ib shut" @click=${() => this.tab = void 0} aria-label="Close">${K("close")}</button>
    </div>`;
	}
	async _party(e) {
		this._partying = !1, await this._do("party", { on: e }, "party") && this._say(e ? "Party on. The queue, the rooms and the volume can only be changed from Jukebox." : "Party off. Other apps can change things again.");
	}
	_songs(e) {
		let t = this._queued ?? (e.kind === "queue" ? e.queue_size : null);
		return t ? t === 1 ? "The one song in the queue" : `The ${t} songs in the queue` : "Whatever is in the queue";
	}
	_stop(e, t) {
		let n = async () => await this._do("stop", {}, "stop") && !this.inline && this.remove();
		this._confirm = {
			warn: "This stops the music here",
			text: `${this._songs(t)} will go, and ${V(e, t)} will be listed with the quiet rooms again.`,
			keep: "Keep it",
			go: "Stop it",
			run: n
		};
	}
	_clear(e) {
		this._confirm = {
			warn: "This clears the whole queue",
			text: `${this._songs(e)} will go, and the music stops.`,
			keep: "Keep the queue",
			go: "Clear it",
			run: () => this._do("queue_clear")
		};
	}
	_delete(e) {
		let t = async () => {
			await this._do("playlist_delete", { media_content_id: e.media_content_id }, `fav:${e.media_content_id}`) && (Array.isArray(this._favourites) && (this._favourites = this._favourites.filter((t) => t !== e)), this._say(`Deleted: ${e.title}`));
		};
		this._menu = void 0, this._confirm = {
			warn: "This deletes the playlist",
			text: `"${e.title}" will be gone from Sonos for good. The queue is left as it is.`,
			keep: "Keep the playlist",
			go: "Delete it",
			run: t
		};
	}
	_search(e) {
		return D`${this._head("Search", "The music library and Spotify. Press + to play something or add it to the queue.")}
      <div class="scroll">
        <casa-mia-jukebox-find .hass=${this.hass} .room=${e.id} .waiting=${this._waiting} .changes=${this._busy.changes} @jb-choose=${(t) => this._choose(e, t.detail)}></casa-mia-jukebox-find>
      </div>`;
	}
	_queue(e) {
		let t = this._queued === 0;
		return D`${this._head("Queue", "Tap a song to play it. Drag one by its handle to move it.")}
      <div class="tools">
        <button class=${this._busy.on("queue_save")} ?disabled=${t} @click=${() => this._naming = !0}>${K("save")}Save as a playlist</button>
        <button class=${this._busy.on("queue_clear")} ?disabled=${t} @click=${() => this._clear(e)}>${K("trash")}Clear the queue</button>
      </div>
      <div class="scroll"><casa-mia-jukebox-queue .hass=${this.hass} .group=${e} .do=${this._ask} .stamp=${this._stamp} @jb-queued=${(e) => this._queued = e.detail}></casa-mia-jukebox-queue></div>`;
	}
	_rooms(e, t) {
		let n = Object.keys(e.rooms).filter((e) => !t.rooms.includes(e)).sort((t, n) => e.rooms[t].name.localeCompare(e.rooms[n].name)), r = (n) => {
			let r = e.rooms[n], i = t.rooms.includes(n), a = B(e, n), o = r.available ? i ? "Playing this" : a && !a.quiet ? `Playing ${H(a).title}: tap to bring it here` : "Quiet: tap to add it" : "Not answering";
			return D`<div class="room ${i ? "in" : ""}">
        <button class="tick ${this._busy.on(`room:${n}`)}" ?disabled=${!r.available} @click=${() => this._toggleRoom(t, n)} aria-label=${i ? `Take ${r.name} out` : `Add ${r.name}`}>${K(i ? "check" : "plus")}</button>
        <button class="t" ?disabled=${!r.available} @click=${() => this._toggleRoom(t, n)}><b>${r.name}</b><small>${o}</small></button>
        ${i && r.volume !== null ? D`<casa-mia-jukebox-slider .value=${r.volume} label="${r.name} volume" @jb-slide=${this._slide("volume", n)} @jb-set=${this._slide("volume", n)}></casa-mia-jukebox-slider><output>${r.volume}</output>` : k}
      </div>`;
		};
		return D`${this._head("Rooms", "Tap a room to add it or take it out. Each has its own volume.")}
      <div class="scroll">${[...t.rooms, ...n].map(r)}</div>`;
	}
	_favouritesPanel(e) {
		let t = this._favourites, n = Array.isArray(t) ? [...new Set(t.map((e) => e.folder))] : [], r = (t) => D`<button class=${this._busy.on(`fav:${t.media_content_id}`)} @click=${() => this._choose(e, t)}>${q(this.hass, t.picture, t.title)}<b>${t.title}</b></button>`;
		return D`${this._head("Favourites", "The stations, playlists and songs saved in Sonos")}
      <div class="scroll">
        ${t === void 0 ? D`<p class="empty">Fetching them from the speaker…</p>` : typeof t == "string" ? D`<p class="empty">The favourites couldn't be fetched: ${t}</p>` : t.length ? n.map((e) => D`<h3>${e}</h3><div class="tiles">${t.filter((t) => t.folder === e).map(r)}</div>`) : D`<p class="empty">There are no favourites saved in Sonos yet.</p>`}
      </div>`;
	}
	_sheets(e) {
		let { _menu: t, _confirm: n } = this;
		if (n) return D`<div class="veil">
        <div class="sheet" role="alertdialog" aria-label=${n.warn}>
          <p class="warn">${n.warn}</p>
          <p>${n.text}</p>
          <div class="acts">
            <button class="main" @click=${() => this._confirm = void 0}>${n.keep}</button>
            <button class="danger" @click=${() => (this._confirm = void 0, n.run())}>${n.go}</button>
          </div>
        </div>
      </div>`;
		if (this._partying && e.party) {
			let t = e.party;
			return D`<div class="veil" @click=${(e) => e.target === e.currentTarget && (this._partying = !1)}>
        <div class="sheet" role="dialog" aria-label="The party lock">
          <h4>The party is on, since ${U(t.since)}</h4>
          <p>The queue, the rooms and their volumes can only be changed from Jukebox. Anything changed another way, such as from the Sonos app, is put back.</p>
          ${t.unwatched ? D`<p class="lost">A song moved in another app isn't being noticed, since ${U(t.unwatched)}: the speaker isn't reporting its queue. Songs added or taken out are still put back.</p>` : k}
          ${t.undone.length ? D`<ul class="undone">${t.undone.map((e) => D`<li class=${e.failed ? "failed" : ""}><time>${U(e.at)}</time>${e.failed ? e.what : `Put back: ${e.what.replace(/^Someone/, "someone")}`}</li>`)}</ul>` : D`<p>Nothing has had to be put back.</p>`}
          <div class="acts">
            <button class="main" @click=${() => this._partying = !1}>Keep the party going</button>
            <button class="danger" @click=${() => this._party(!1)}>End the party</button>
          </div>
        </div>
      </div>`;
		}
		if (this._naming) return D`<div class="veil" @click=${(e) => e.target === e.currentTarget && (this._naming = !1)}>
        <form class="sheet" aria-label="Save the queue as a playlist" @submit=${this._save}>
          <h4>Save the queue as a playlist</h4>
          <p>It is kept in Sonos, and is listed with the favourites.</p>
          <input name="name" maxlength="60" required autocomplete="off" placeholder="A name for the playlist" aria-label="A name for the playlist" />
          <div class="acts">
            <button class="main" type="submit">Save</button>
            <button type="button" @click=${() => this._naming = !1}>Cancel</button>
          </div>
        </form>
      </div>`;
		if (t) {
			let n = {
				warn: "This replaces the whole queue",
				text: `${this._songs(e)} will go, and "${t.title}" will start now.`,
				keep: "Keep the queue",
				go: "Replace it",
				run: () => void this._play(t, "replace")
			};
			return D`<div class="veil" @click=${(e) => e.target === e.currentTarget && (this._menu = void 0)}>
        <div class="sheet" role="dialog" aria-label=${t.title}>
          <h4>${t.title}</h4>
          <p>${t.folder}</p>
          <div class="acts">
            ${e.kind === "nothing" ? D`<button class="main" @click=${() => this._play(t)}>Play now</button>` : D`<button class="main" @click=${() => this._play(t, "next")}>Play next</button>
                  <button @click=${() => this._play(t, "add")}>Add to the end of the queue</button>
                  <button class="danger sep" @click=${() => [this._menu, this._confirm] = [void 0, n]}>Play now and replace the queue…</button>`}
            ${t.playlist ? D`<button class="danger sep" @click=${() => this._delete(t)}>Delete this playlist…</button>` : k}
          </div>
        </div>
      </div>`;
		}
		return k;
	}
	render() {
		let e = this._house, t = e && B(e, this.room);
		if (!e || !t) {
			let t = this._why ?? (e ? "This room's speaker isn't answering." : "Asking Home Assistant what is playing…");
			return D`<div class="big"><div class="now"><div class="bar">${this._shut()}</div><p class="empty">${t}</p></div></div>`;
		}
		let n = this.tab ?? "rooms", [r, i] = G(H(t).title);
		return D`<div class="big" style="--a:${r};--b:${i};${t.picture ? `--pic:url('${(this.hass.hassUrl?.(t.picture) ?? t.picture).replace(/'/g, "%27")}');` : ""}">
      ${this._now(e, t)}
      <div class="side ${this.tab ? "up" : ""}">${this._tabs(t)}${n === "queue" ? this._queue(t) : n === "rooms" ? this._rooms(e, t) : n === "search" ? this._search(t) : this._favouritesPanel(t)}</div>
      ${this._sheets(t)}
      <div class="toast ${this._toast ? "on" : ""}" role="status">${this._toast}</div>
    </div>`;
	}
	static {
		this.styles = [Y, h`
      /* Its own width decides its layout, not the screen's: it may be over the whole screen,
         or in a card of any size. */
      :host { position: fixed; inset: 0; z-index: 1000; container-type: inline-size; font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .big { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 1fr); overflow: clip; background: #111; color: #fff; --muted: rgb(255 255 255 / 66%); --line: rgb(255 255 255 / 14%); --jb-fill: #fff; --jb-glow: #fff; --jb-track: rgb(255 255 255 / 22%); animation: up 0.28s ease-out; }
      /* Clipped, not hidden: a hidden box can still be scrolled (a tap brings its target into
         view), and the light behind the player overflows it on purpose. */
      .big::before { content: ""; position: absolute; inset: -60px; background: var(--pic, conic-gradient(from 200deg at 60% 40%, var(--a), var(--b), var(--a))) center / cover; filter: blur(50px) saturate(1.3); }
      .big::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgb(0 0 0 / 30%), rgb(0 0 0 / 72%)); }
      /* The one column is no wider than the screen. Left to itself it grows to fit a long
         title, which may not wrap, and the buttons go off the right edge with it. */
      .big > * { position: relative; z-index: 1; min-width: 0; min-height: 0; }
      @keyframes up { from { transform: translateY(40px); opacity: 0; } }
      .now { display: flex; flex-direction: column; gap: 12px; padding: max(12px, env(safe-area-inset-top)) 22px max(14px, env(safe-area-inset-bottom)); }
      .bar { display: flex; align-items: center; gap: 8px; }
      .where { flex: 1; min-width: 0; text-align: center; }
      .pill { display: flex; align-items: center; gap: 5px; flex: none; padding: 8px 12px 8px 9px; border-radius: 999px; background: rgb(255 255 255 / 14%); font-size: 12px; font-weight: 700; }
      .pill svg { width: 16px; height: 16px; }
      .pill.on { background: #fff; color: #111; }
      .where small { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
      .where b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      /* The artwork is a square that fits the space left for it, whichever way that space is
         the narrower, and the picture is shown whole inside it, never cropped. */
      .cover { flex: 1; min-height: 0; display: grid; place-items: center; container-type: size; }
      .cover .art { width: min(100cqw, 100cqh, 380px); border-radius: 18px; box-shadow: 0 20px 50px rgb(0 0 0 / 50%); }
      .cover .art:has(img) { overflow: visible; background: none; box-shadow: none; }
      .cover .art:has(img) i { display: none; }
      .cover .art img { object-fit: contain; border-radius: 18px; filter: drop-shadow(0 16px 30px rgb(0 0 0 / 50%)); }
      .title { text-align: center; }
      /* Two lines at most: enough to tell one version of a song from another, and no title
         can squeeze the artwork. */
      .title b { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 21px; line-height: 1.2; overflow-wrap: anywhere; text-wrap: balance; }
      .title span { color: var(--muted); }
      .seek { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
      .live { text-align: center; color: var(--muted); font-size: 12px; font-weight: 700; letter-spacing: 0.1em; }
      .tp { display: flex; align-items: center; justify-content: center; gap: 10px; }
      .tp .ib svg { width: 30px; height: 30px; }
      .tp .ib.sm { position: relative; color: var(--muted); }
      .tp .ib.sm svg { width: 22px; height: 22px; }
      .tp .ib.sm.on { color: #fff; background: rgb(255 255 255 / 22%); }
      .tp sup { position: absolute; top: 4px; right: 6px; font-size: 10px; font-weight: 800; }
      .tp .play { width: 66px; height: 66px; background: #fff; color: #111; }
      .tp .play:hover:not(:disabled) { background: #fff; transform: scale(1.05); }
      .tp .play svg { width: 36px; height: 36px; }
      .gvol { display: flex; align-items: center; gap: 12px; color: var(--muted); }
      .gvol svg { width: 20px; height: 20px; flex: none; }
      .gvol casa-mia-jukebox-slider, .seek casa-mia-jukebox-slider { color: #fff; }
      .tabs { display: flex; gap: 6px; }
      .tabs button { flex: 1; display: grid; justify-items: center; gap: 2px; padding: 8px 4px; border-radius: 12px; font-size: 11px; font-weight: 700; color: var(--muted); }
      .tabs svg { width: 22px; height: 22px; }
      .tabs .up { background: rgb(255 255 255 / 16%); color: #fff; }

      /* The rooms and favourites: a sheet over the player on a phone. */
      .side { position: absolute; inset: 64px 0 0; z-index: 3; display: none; flex-direction: column; border-radius: 22px 22px 0 0; background: rgb(22 20 18); box-shadow: 0 -10px 40px rgb(0 0 0 / 50%); animation: up 0.24s ease-out; }
      .side.up { display: flex; }
      .side .tabs { display: none; padding: 10px 10px 0; }
      .head { display: flex; align-items: center; gap: 8px; padding: 12px 10px 8px 16px; }
      .head b { flex: 1; font-size: 16px; }
      .head small { display: block; color: var(--muted); font-weight: 500; font-size: 12px; }
      .tools { display: flex; gap: 8px; padding: 0 12px 8px; }
      .tools button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 12px; background: rgb(255 255 255 / 10%); font-size: 13px; font-weight: 600; }
      .tools svg { width: 18px; height: 18px; flex: none; }
      .scroll { flex: 1; min-height: 0; overflow: auto; padding: 0 6px max(16px, env(safe-area-inset-bottom)); }
      .scroll h3 { margin: 16px 10px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
      .empty { padding: 28px 18px; text-align: center; color: var(--muted); overflow-wrap: anywhere; }
      .room { display: grid; grid-template-columns: 44px minmax(0, 1fr) 34px; gap: 4px 12px; align-items: center; padding: 10px; border-radius: 14px; }
      .room.in { margin-bottom: 6px; background: rgb(255 255 255 / 9%); }
      .tick { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--line); color: var(--muted); }
      .room.in .tick { background: #fff; border-color: #fff; color: #111; }
      .room .t b { display: block; }
      .room .t small { color: var(--muted); }
      .room casa-mia-jukebox-slider { grid-column: 2; }
      .room output { text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }
      .tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 10px; padding: 0 10px; }
      .tiles button { display: grid; gap: 6px; min-width: 0; }
      .tiles b { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .veil { position: absolute; inset: 0; z-index: 5; display: grid; place-items: end center; padding: 14px; background: rgb(0 0 0 / 60%); }
      .sheet { width: min(100%, 440px); padding: 18px; border-radius: 22px; background: #26231f; box-shadow: 0 20px 60px rgb(0 0 0 / 60%); animation: up 0.2s ease-out; }
      .sheet h4 { margin: 0 0 2px; font-size: 16px; }
      .sheet p { margin: 0 0 14px; color: rgb(255 255 255 / 70%); overflow-wrap: anywhere; }
      .sheet input { display: block; width: 100%; margin: 0 0 14px; padding: 13px 14px; border: 1px solid var(--line); border-radius: 14px; background: rgb(255 255 255 / 8%); color: #fff; font: inherit; font-size: 16px; }
      .sheet .lost, .undone .failed { color: #ff9a8f; }
      .undone { max-height: 34vh; margin: 0 0 14px; padding: 0; overflow: auto; list-style: none; }
      .undone li { display: flex; gap: 10px; padding: 7px 0; border-top: 1px solid var(--line); font-size: 13px; overflow-wrap: anywhere; }
      .undone time { flex: none; color: var(--muted); font-variant-numeric: tabular-nums; }
      .sheet .warn { margin: 0 0 10px; color: #ff6b5e; font-size: 30px; font-weight: 900; line-height: 1.05; text-transform: uppercase; }
      .acts { display: grid; gap: 8px; }
      .acts button { padding: 14px; border-radius: 14px; background: rgb(255 255 255 / 10%); font-size: 15px; font-weight: 700; text-align: center; }
      .acts button:hover { background: rgb(255 255 255 / 18%); }
      .acts .main { background: #fff; color: #111; }
      .acts .danger { background: none; border: 1px solid #ff6b5e; color: #ff6b5e; }
      .acts .sep { margin-top: 10px; }
      .toast { position: absolute; left: 14px; right: 14px; bottom: 18px; z-index: 6; margin: 0 auto; width: fit-content; max-width: calc(100% - 28px); padding: 11px 16px; border-radius: 14px; background: #fff; color: #111; font-weight: 600; overflow-wrap: anywhere; box-shadow: 0 10px 30px rgb(0 0 0 / 45%); opacity: 0; transform: translateY(12px); transition: 0.25s; pointer-events: none; }
      .toast.on { opacity: 1; transform: none; }
      /* Out of the way of a question's buttons. */
      .veil ~ .toast { top: max(18px, env(safe-area-inset-top)); bottom: auto; }

      /* A wide screen (a wall tablet): the rooms and favourites sit beside the player. */
      /* In a dashboard card (the Now playing card): in place, the size the card is given. */
      :host([inline]) { position: relative; inset: auto; z-index: 0; display: block; height: 100%; min-height: 560px; overflow: hidden; border-radius: var(--ha-card-border-radius, 18px); }
      :host([inline]) .big { animation: none; }

      @container (min-width: 900px) {
        .big { grid-template-columns: minmax(0, 1fr) 460px; }
        .now { padding: 16px 56px 22px; }
        .now .tabs, .shut { display: none; }
        .side { position: relative; inset: auto; display: flex; border-radius: 0; border-left: 1px solid var(--line); background: rgb(12 11 10 / 46%); backdrop-filter: blur(24px); box-shadow: none; animation: none; }
        .side .tabs { display: flex; }
        .side .tabs .shown { background: rgb(255 255 255 / 16%); color: #fff; }
        .veil { place-items: center; }
      }
    `];
	}
}, ft = "casa-mia-jukebox-page", Z = class extends I {
	constructor(...e) {
		super(...e), this.narrow = !1, this._connected = !0;
	}
	static {
		this.properties = {
			narrow: { type: Boolean },
			_house: { state: !0 },
			_why: { state: !0 },
			_connected: { state: !0 }
		};
	}
	set hass(e) {
		let t = !this._hass;
		this._hass = e, this._connected = e.connected !== !1, t && this._follow();
	}
	connectedCallback() {
		super.connectedCallback(), this._follow();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._off?.(), this._off = void 0;
	}
	_follow() {
		!this._off && this.isConnected && this._hass?.connection && (this._off = Ke(this._hass.connection, (e, t) => [this._house, this._why] = [e, t]));
	}
	get _trouble() {
		return this._connected ? this._house ? void 0 : this._why ?? "Asking Home Assistant what is playing…" : "No connection to Home Assistant. What is shown may be out of date.";
	}
}, pt = 450, mt = 10, Q = 70;
function ht(e) {
	for (let t = e; t; t = t.parentNode ?? t.host) if (t instanceof Element && t.scrollHeight > t.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(t).overflowY)) return t;
	return document.scrollingElement ?? document.documentElement;
}
var gt = class extends Z {
	constructor(...e) {
		super(...e), this._at = {
			x: 0,
			y: 0
		}, this._frame = 0, this._dragged = !1, this._touch = (e) => {
			this._drag && e.preventDefault();
		}, this._moved = (e) => {
			let t = this._hold;
			t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > mt && this._drop(), this._drag && (this._at = {
				x: e.clientX,
				y: e.clientY
			}, this._place());
		}, this._edge = () => {
			if (!this._drag) return;
			let [e, t] = [this._at.y, this._scroller], n = e < Q ? -Math.ceil((Q - e) / 5) : e > innerHeight - Q ? Math.ceil((e - innerHeight + Q) / 5) : 0, r = t.scrollTop;
			n && (t.scrollTop = Math.min(this._drag.end, r + n)), t.scrollTop !== r && this._place(), this._frame = requestAnimationFrame(this._edge);
		}, this._drop = () => {
			clearTimeout(this._hold?.timer), cancelAnimationFrame(this._frame), this._hold = this._drag = void 0;
		}, this._up = () => {
			let [e, t] = [this._drag, this._house];
			if (this._drop(), !e || (this._dragged = !0, !t || e.to === e.from)) return;
			let n = t.groups.filter((e) => !e.quiet);
			n.splice(e.to, 0, ...n.splice(e.from, 1));
			let r = [.../* @__PURE__ */ new Set([
				...n.flatMap((e) => e.rooms),
				...t.groups.flatMap((e) => e.rooms),
				...Object.keys(t.rooms)
			])];
			Ze(this._hass, r).then(() => this._failed = void 0, (e) => this._failed = `The order couldn't be kept: ${z(e)}`);
		}, this._tap = {
			capture: !0,
			handleEvent: (e) => {
				this._dragged && (this._dragged = !1, e.stopPropagation(), e.preventDefault());
			}
		};
	}
	static {
		this.properties = {
			...Z.properties,
			_drag: { state: !0 },
			_failed: { state: !0 }
		};
	}
	connectedCallback() {
		super.connectedCallback(), this.addEventListener("touchmove", this._touch, { passive: !1 });
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.removeEventListener("touchmove", this._touch), this._drop();
	}
	_down(e, t) {
		if (e.button || e.composedPath().some((e) => e.localName === "casa-mia-jukebox-slider")) return;
		let [n, r] = [e.currentTarget, e.pointerId];
		this._drop(), this._dragged = !1;
		let i = () => {
			let { x: e, y: i } = this._hold;
			this._hold = void 0, n.setPointerCapture(r), this._scroller = ht(this), this._at = {
				x: e,
				y: i
			};
			let a = this._scroller;
			this._drag = {
				from: t,
				to: t,
				x: e,
				y: i,
				dx: 0,
				dy: 0,
				top: a.scrollTop,
				end: a.scrollHeight - a.clientHeight
			}, navigator.vibrate?.(15), this._frame = requestAnimationFrame(this._edge);
		};
		this._hold = {
			x: e.clientX,
			y: e.clientY,
			timer: setTimeout(i, pt)
		};
	}
	_place() {
		let e = this._drag;
		if (!e) return;
		let { x: t, y: n } = this._at, [r, i] = [t - e.x, n - e.y + this._scroller.scrollTop - e.top], a = [...this.renderRoot.querySelectorAll(".slot")].findIndex((r, i) => {
			let a = r.getBoundingClientRect(), [o, s] = i === e.from ? [a.left - e.dx, a.top - e.dy] : [a.left, a.top];
			return t >= o && t <= o + a.width && n >= s && n <= s + a.height;
		});
		this._drag = {
			...e,
			dx: r,
			dy: i,
			to: a < 0 ? e.to : a
		};
	}
	render() {
		let e = this._hass;
		if (!e) return k;
		let t = this._house, n = t?.groups.filter((e) => !e.quiet) ?? [], r = this._trouble ?? this._failed, i = this._drag;
		return D`<div class="page">
      <div class="nav">
        ${this.narrow ? D`<button class="ib" @click=${() => s(this, "hass-toggle-menu")} aria-label="Home Assistant's menu">${K("menu")}</button>` : k}
        <button class="ib" @click=${() => history.back()} aria-label="Back">${K("back")}</button>
        <h1>Music</h1>
        <button class="ib" @click=${() => c("/")} aria-label="Home">${K("home")}</button>
      </div>
      ${r ? D`<p class="trouble" role="status">${r}</p>` : k}
      <div class="minis">
        ${n.map((n, r) => D`<div
            class="slot ${i?.from === r ? "held" : ""} ${i && i.to === r && i.from !== r ? "here" : ""}"
            style=${i?.from === r ? `transform:translate(${i.dx}px,${i.dy}px) scale(1.03)` : ""}
            @pointerdown=${(e) => this._down(e, r)}
            @pointermove=${this._moved}
            @pointerup=${this._up}
            @pointercancel=${this._drop}
            @click=${this._tap}
            @contextmenu=${(e) => e.preventDefault()}
            @dragstart=${(e) => e.preventDefault()}
          >
            <casa-mia-jukebox-mini .hass=${e} .house=${t} .group=${n}></casa-mia-jukebox-mini>
          </div>`)}
      </div>
      ${n.length > 1 ? D`<p class="hint">To move a player, rest a finger on it until it lifts, then drag it.</p>` : k}
      ${t && !n.length ? D`<p class="none">Nothing is playing anywhere.</p>` : k}
      <casa-mia-jukebox-rooms class="rooms" .hass=${e} .house=${t}></casa-mia-jukebox-rooms>
    </div>`;
	}
	static {
		this.styles = [Y, h`
      :host { display: block; min-height: 100vh; background: var(--primary-background-color); color: var(--primary-text-color); font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .page { max-width: 1240px; margin: 0 auto; padding: max(18px, env(safe-area-inset-top)) 16px 32px; }
      .nav { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
      .nav h1 { flex: 1; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
      .nav .ib { background: var(--card-background-color); border: 1px solid var(--divider-color); }
      .minis { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 12px; }
      .hint { margin: 10px 2px 0; font-size: 12px; color: var(--secondary-text-color); }
      /* A long press is for lifting a player: not for selecting its words, or the menu a
         phone offers for a picture. */
      .slot { position: relative; min-width: 0; border-radius: 18px; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      .slot.held { z-index: 2; box-shadow: 0 16px 40px rgb(0 0 0 / 45%); cursor: grabbing; }
      .slot.here { outline: 2px dashed var(--primary-color); outline-offset: 3px; }
      .rooms { margin-top: 22px; }
      .none { margin: 0; color: var(--secondary-text-color); overflow-wrap: anywhere; }
      .trouble { margin: 0 0 14px; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--error-color, #db4437) 16%, transparent); overflow-wrap: anywhere; }
    `];
	}
}, _t = "casa-mia-jukebox", vt = class extends Z {
	static {
		this.properties = {
			...Z.properties,
			_config: { state: !0 }
		};
	}
	static getStubConfig() {
		return {};
	}
	static getConfigForm() {
		return {
			schema: [{
				name: "entity",
				selector: { entity: { filter: {
					integration: "sonos",
					domain: "media_player"
				} } }
			}],
			computeLabel: () => "Room (leave empty for everything that is playing)"
		};
	}
	setConfig(e) {
		this._config = { ...e };
	}
	getCardSize() {
		return 2;
	}
	getGridOptions() {
		return {
			columns: 12,
			min_columns: 6
		};
	}
	render() {
		let e = this._hass, t = this._house;
		if (!e || !this._config) return k;
		if (!t) return D`<p class="note">${f(this) ? "What is playing, with pause, skip and volume" : this._trouble}</p>`;
		let n = this._config.entity, r = n ? B(t, n) : void 0, i = n ? r ? [r] : [] : t.groups.filter((e) => !e.quiet);
		return D`${this._trouble ? D`<p class="note">${this._trouble}</p>` : k}
      ${i.map((n) => D`<casa-mia-jukebox-mini .hass=${e} .house=${t} .group=${n}></casa-mia-jukebox-mini>`)}
      ${i.length ? k : D`<p class="note">${n ? `${t.rooms[n]?.name ?? n} isn't answering` : "Nothing is playing"}</p>`}`;
	}
	static {
		this.styles = [Y, h`
      :host { display: grid; gap: 12px; }
      .note { margin: 0; padding: 14px 16px; border-radius: 18px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--secondary-text-color); overflow-wrap: anywhere; }
    `];
	}
}, yt = "casa-mia-jukebox-mini", bt = class extends I {
	static {
		this.properties = {
			hass: { attribute: !1 },
			house: { attribute: !1 },
			group: { attribute: !1 }
		};
	}
	constructor() {
		super(), this._volume = tt((e) => R(this.hass, "group_volume", this.group.id, { value: e }), (e) => this._failed(e)), this._busy = new J(this), new rt(this);
	}
	_failed(e) {
		s(this, "hass-notification", { message: `Jukebox: ${z(e)}` });
	}
	_ask(e, t = e) {
		this._busy.during(t, R(this.hass, e, this.group.id)).catch((e) => this._failed(e));
	}
	render() {
		let { hass: e, house: t, group: n } = this;
		if (!e || !t || !n) return k;
		let { title: r, by: i } = H(n), a = $e(n, Date.now()), o = n.state === "playing", s = () => X(e, n.id);
		return D`<div class="mini" style="--a:${G(r)[0]}">
      <button class="pic" @click=${s} aria-label="Open the player">${q(e, n.picture, r)}</button>
      <button class="meta" @click=${s}>
        <b>${r}</b><span>${i}</span><small>${V(t, n)}${n.party ? " · Party" : ""}</small>
      </button>
      <span class="tp">
        <button class="ib ${this._busy.on("play")}" ?disabled=${n.kind === "nothing"} @click=${() => this._ask(o ? "pause" : "play", "play")} aria-label=${o ? "Pause" : "Play"}>${K(o ? "pause" : "play")}</button>
        ${o && n.kind === "queue" ? D`<button class="ib ${this._busy.on("next")}" @click=${() => this._ask("next")} aria-label="Next song">${K("next")}</button>` : D`<button class="ib" @click=${() => X(e, n.id, void 0, "stop")} aria-label="Stop the music here and clear the player">${K("stop")}</button>`}
      </span>
      <div class="vol">
        ${K("volume")}
        <casa-mia-jukebox-slider .value=${Qe(t, n)} label="Volume" @jb-slide=${(e) => this._volume(e.detail.value)} @jb-set=${(e) => this._volume(e.detail.value)}></casa-mia-jukebox-slider>
      </div>
      ${a !== null && n.duration ? D`<i class="prog" style="width:${100 * a / n.duration}%"></i>` : k}
    </div>`;
	}
	static {
		this.styles = [Y, h`
      /* Its own font, so it looks the same on Jukebox's page and in any dashboard. */
      :host { display: block; font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .mini { position: relative; overflow: hidden; display: grid; grid-template-columns: 60px minmax(0, 1fr) auto; gap: 8px 12px; align-items: center; padding: 12px; border-radius: 18px; border: 1px solid var(--divider-color, #8884);
        color: var(--primary-text-color); background: linear-gradient(100deg, color-mix(in srgb, var(--a) 26%, var(--card-background-color, #fff)), var(--card-background-color, #fff) 75%); }
      .meta { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; }
      .meta b, .meta span, .meta small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .meta b { font-size: 15px; }
      .meta span { color: var(--secondary-text-color); }
      .meta small { margin-top: 3px; font-size: 12px; font-weight: 600; color: color-mix(in srgb, var(--a) 55%, var(--primary-text-color)); }
      .tp { display: flex; gap: 2px; --jb-glow: var(--primary-color, #c4552d); }
      .vol { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; color: var(--secondary-text-color); --jb-fill: #c4552d; }
      .vol svg { width: 18px; height: 18px; flex: none; }
      .prog { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--a); }
    `];
	}
}, xt = "casa-mia-jukebox-queue", St = 56, Ct = class extends I {
	constructor(...e) {
		super(...e), this.stamp = 0, this._total = 0, this._asked = 0, this._busy = new J(this), this._moved = (e) => {
			let t = this._drag;
			if (!t) return;
			let n = e.clientY - t.y;
			this._drag = {
				...t,
				dy: n,
				to: Math.max(0, Math.min(this._songs.length - 1, t.from + Math.round(n / St)))
			};
		}, this._up = () => {
			let e = this._drag;
			if (e) {
				if (this._drag = void 0, e.to === e.from) return this._fetch();
				this._act("queue_move", {
					value: e.from + 1,
					to: e.to + 1
				}, (t) => t.splice(e.to, 0, ...t.splice(e.from, 1)), e.to);
			}
		};
	}
	static {
		this.properties = {
			group: { attribute: !1 },
			stamp: { type: Number },
			_songs: { state: !0 },
			_total: { state: !0 },
			_why: { state: !0 },
			_drag: { state: !0 }
		};
	}
	willUpdate(e) {
		let t = e.get("group"), n = this.group;
		(e.has("group") && n && (!t || t.id !== n.id || t.queue_size !== n.queue_size || t.queue_position !== n.queue_position || t.kind !== n.kind) || e.has("stamp") && n) && this._fetch();
	}
	_fetch() {
		let e = ++this._asked;
		Je(this.hass, this.group.id).then((t) => {
			e !== this._asked || this._drag || ([this._songs, this._total, this._why] = [
				t.songs,
				t.total,
				void 0
			], s(this, "jb-queued", t.total));
		}, (t) => e === this._asked && (this._why = z(t)));
	}
	async _act(e, t, n, r = -1) {
		let i = [...this._songs ?? []];
		n(i), this._songs = i, await this._busy.during(`row:${r}`, this.do(e, t)), this._fetch();
	}
	_down(e, t) {
		e.currentTarget.setPointerCapture(e.pointerId), this._drag = {
			from: t,
			to: t,
			y: e.clientY,
			dy: 0
		};
	}
	render() {
		let { group: e, _songs: t, _drag: n } = this;
		if (!e) return k;
		if (!t) return D`<p class="empty">${this._why ? `The queue couldn't be read: ${this._why}` : "Asking the speaker for its queue…"}</p>`;
		if (!t.length) return D`<p class="empty">The queue is empty. Add something from the favourites.</p>`;
		let r = e.kind === "queue" ? e.queue_position : null;
		return D`${this._why ? D`<p class="empty">The queue couldn't be read again: ${this._why}</p>` : k}
      ${t.map((e, t) => {
			let i = n ? t === n.from ? n.dy : n.from < t && t <= n.to ? -56 : n.to <= t && t < n.from ? St : 0 : 0;
			return D`<div class="row ${t + 1 === r ? "now" : ""} ${n?.from === t ? "held" : ""} ${this._busy.on(`row:${t}`)}" style="transform:translateY(${i}px)">
          <span class="handle" @pointerdown=${(e) => this._down(e, t)} @pointermove=${this._moved} @pointerup=${this._up} @pointercancel=${this._up}>${K("drag")}</span>
          <button class="t" @click=${() => this._busy.during(`row:${t}`, this.do("queue_play", { value: t + 1 }))} aria-label="Play ${e.title}"><b>${e.title}</b><small>${e.artist}</small></button>
          <span class="len">${t + 1 === r ? K("volume") : e.duration ? W(e.duration) : k}</span>
          <button class="ib" @click=${() => this._act("queue_remove", { value: t + 1 }, (e) => e.splice(t, 1))} aria-label="Take ${e.title} out of the queue">${K("close")}</button>
        </div>`;
		})}
      ${this._total > t.length ? D`<p class="empty">and ${this._total - t.length} more, which aren't shown</p>` : k}`;
	}
	static {
		this.styles = [Y, h`
      :host { display: block; }
      .empty { padding: 28px 18px; text-align: center; color: var(--muted); overflow-wrap: anywhere; }
      .row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto 42px; align-items: center; gap: 4px; height: ${St}px; padding: 0 4px; border-radius: 14px; transition: transform 0.15s; }
      .row.now { background: rgb(255 255 255 / 9%); }
      .row.held { position: relative; z-index: 2; background: rgb(255 255 255 / 18%); box-shadow: 0 8px 24px rgb(0 0 0 / 50%); transition: none; }
      /* The handle takes the finger for itself, so a drag moves the song and not the list. */
      .handle { display: grid; place-items: center; height: 100%; color: var(--muted); cursor: grab; touch-action: none; }
      .t { display: grid; grid-template-columns: minmax(0, 1fr); align-self: stretch; align-content: center; min-width: 0; }
      .t b, .t small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .t small { color: var(--muted); }
      .len { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
      .len svg { width: 18px; height: 18px; color: #fff; }
      .ib { color: var(--muted); }
    `];
	}
}, wt = "casa-mia-jukebox-find", Tt = 400, Et = class extends I {
	constructor(...e) {
		super(...e), this.room = "", this.waiting = () => "", this.changes = 0, this._query = "", this._trail = [], this._asked = 0;
	}
	static {
		this.properties = {
			room: {},
			changes: { type: Number },
			_query: { state: !0 },
			_found: { state: !0 },
			_why: { state: !0 },
			_trail: { state: !0 }
		};
	}
	connectedCallback() {
		super.connectedCallback(), this._trail.length || this._open();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), clearTimeout(this._typed);
	}
	_open(e) {
		let t = { title: e?.title ?? "Browse" };
		this._trail = [...this._trail, t];
		let n = (e) => this._trail = this._trail.map((n) => n === t ? Object.assign(t, e) : n);
		Xe(this.hass, this.room, e).then((e) => n({ items: e.items }), (e) => n({ why: z(e) }));
	}
	_type(e) {
		this._query = e.target.value, this._trail = this._trail.slice(0, 1), clearTimeout(this._typed), [this._found, this._why] = [void 0, void 0];
		let t = ++this._asked, n = this._query.trim();
		n && (this._typed = setTimeout(() => Ye(this.hass, this.room, n).then((e) => t === this._asked && (this._found = e.sources), (e) => t === this._asked && (this._why = z(e))), Tt));
	}
	_clear() {
		let e = this.renderRoot.querySelector("input");
		e.value = "", e.dispatchEvent(new Event("input")), e.focus();
	}
	_row(e) {
		let t = () => s(this, "jb-choose", e), n = e.can_expand;
		return D`<div class="row ${this.waiting(`fav:${e.media_content_id}`)}">
      <button class="t" ?disabled=${!n && !e.can_play} @click=${() => n ? this._open(e) : t()}>
        ${q(this.hass, e.picture, e.title)}
        <span><b>${e.title}</b>${e.by ? D`<small>${e.by}</small>` : k}</span>
        ${n ? K("chevron") : k}
      </button>
      ${e.can_play ? D`<button class="ib" @click=${t} aria-label="Play ${e.title}, or add it to the queue">${K("plus")}</button>` : k}
    </div>`;
	}
	_results() {
		return this._why ? D`<p class="note">The search couldn't be made: ${this._why}</p>` : this._found ? this._found.map((e) => {
			let t = [...new Set(e.items.map((e) => e.folder))];
			return D`<h3>${e.name}</h3>
        ${e.why ? D`<p class="note">${e.name} couldn't be searched: ${e.why}</p>` : e.items.length ? k : D`<p class="note">Nothing found.</p>`}
        ${t.map((t) => D`<h4>${t}</h4>${e.items.filter((e) => e.folder === t).map((e) => this._row(e))}`)}`;
		}) : D`<p class="note">Searching the music library and Spotify…</p>`;
	}
	_browsing() {
		let e = this._trail[this._trail.length - 1];
		return e ? D`<div class="where">
        ${this._trail.length > 1 ? D`<button class="ib" @click=${() => this._trail = this._trail.slice(0, -1)} aria-label="Back">${K("back")}</button>` : k}
        <h3>${e.title}</h3>
      </div>
      ${e.why ? D`<p class="note">This couldn't be opened: ${e.why}</p>` : e.items ? e.items.length ? e.items.map((e) => this._row(e)) : D`<p class="note">There is nothing here.</p>` : D`<p class="note">Asking the speaker…</p>`}` : k;
	}
	render() {
		let e = this._query.trim() && this._trail.length < 2;
		return D`<label class="box">
        ${K("search")}
        <input type="text" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="A song, an album or an artist" aria-label="Search the music library and Spotify" @input=${this._type} />
        ${this._query ? D`<button class="ib" @click=${this._clear} aria-label="Clear the search">${K("close")}</button>` : k}
      </label>
      ${e ? this._results() : this._browsing()}`;
	}
	static {
		this.styles = [Y, h`
      :host { display: block; padding: 0 6px; }
      .box { display: flex; align-items: center; gap: 8px; margin: 2px 4px 10px; padding: 0 6px 0 12px; border-radius: 14px; border: 1px solid var(--line); background: rgb(255 255 255 / 8%); color: var(--muted); }
      .box:focus-within { border-color: #fff; }
      .box svg { width: 20px; height: 20px; flex: none; }
      /* 16px, or a phone zooms the page in when the box is tapped. */
      .box input { flex: 1; min-width: 0; height: 46px; border: 0; outline: 0; background: none; color: #fff; font: inherit; font-size: 16px; }
      .box .ib { width: 36px; height: 36px; }
      h3 { margin: 14px 6px 4px; font-size: 15px; }
      h4 { margin: 12px 6px 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
      .where { display: flex; align-items: center; gap: 4px; min-height: 42px; }
      .where h3 { flex: 1; min-width: 0; margin: 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .note { margin: 0; padding: 14px 8px; color: var(--muted); overflow-wrap: anywhere; }
      .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 2px; border-radius: 14px; }
      .t { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 56px; padding: 6px; }
      .t .art { border-radius: 8px; }
      .t span { display: grid; grid-template-columns: minmax(0, 1fr); }
      .t b, .t small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .t small, .t > svg, .row > .ib { color: var(--muted); }
    `];
	}
}, Dt = { entity: { filter: {
	integration: "sonos",
	domain: "media_player"
} } }, $ = h`
  .note { margin: 0; padding: 14px 16px; border-radius: 18px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--secondary-text-color); overflow-wrap: anywhere; }
`, Ot = "casa-mia-jukebox-quiet", kt = class extends Z {
	static getStubConfig() {
		return {};
	}
	setConfig(e) {}
	getCardSize() {
		return 1;
	}
	getGridOptions() {
		return {
			columns: 12,
			min_columns: 6
		};
	}
	render() {
		let [e, t] = [this._hass, this._house];
		if (!e) return k;
		if (!t) return D`<p class="note">${f(this) ? "The rooms that are playing nothing, a tap from their favourites" : this._trouble}</p>`;
		let n = !t.groups.some((e) => e.quiet) && Object.values(t.rooms).every((e) => e.available);
		return D`${this._trouble ? D`<p class="note">${this._trouble}</p>` : k}
      ${n ? D`<p class="note">Every room is playing something.</p>` : D`<casa-mia-jukebox-rooms .hass=${e} .house=${t}></casa-mia-jukebox-rooms>`}`;
	}
	static {
		this.styles = [
			Y,
			$,
			h`:host { display: grid; gap: 12px; }`
		];
	}
}, At = "casa-mia-jukebox-shortcut", jt = {
	favourite: "Favourite or Sonos playlist, by its name",
	rooms: "Rooms (the first leads, the others join it)",
	name: "What the button says (leave empty for the favourite's name)",
	icon: "Icon",
	enqueue: "Where in the queue (leave empty to play now)"
}, Mt = class extends I {
	constructor(...e) {
		super(...e), this._busy = new J(this);
	}
	static {
		this.properties = { _config: { state: !0 } };
	}
	set hass(e) {
		let t = !this._hass;
		this._hass = e, t && this.requestUpdate();
	}
	static getStubConfig() {
		return {
			favourite: "",
			rooms: []
		};
	}
	static getConfigForm() {
		return {
			schema: [
				{
					name: "favourite",
					required: !0,
					selector: { text: {} }
				},
				{
					name: "rooms",
					required: !0,
					selector: { entity: {
						...Dt.entity,
						multiple: !0
					} }
				},
				{
					name: "name",
					selector: { text: {} }
				},
				{
					name: "icon",
					selector: { icon: {} }
				},
				{
					name: "enqueue",
					selector: { select: { options: [{
						value: "next",
						label: "Play next"
					}, {
						value: "add",
						label: "Add to the end of the queue"
					}] } }
				}
			],
			computeLabel: (e) => jt[e.name]
		};
	}
	setConfig(e) {
		this._config = { ...e };
	}
	getCardSize() {
		return 1;
	}
	getGridOptions() {
		return {
			columns: 6,
			rows: 1,
			min_columns: 3
		};
	}
	_play(e) {
		let t = {
			favourite: e.favourite,
			rooms: e.rooms,
			...e.enqueue ? { enqueue: e.enqueue } : {}
		};
		this._busy.during("play", this._hass.callService("casa_mia_jukebox", "play", t)).catch((e) => s(this, "hass-notification", { message: `Jukebox: ${z(e)}` }));
	}
	render() {
		let [e, t] = [this._hass, this._config];
		if (!e || !t) return k;
		let n = t.rooms ?? [];
		if (!t.favourite || !n.length) return D`<p class="note">${f(this) ? "A button that plays one favourite in the rooms you choose" : "Choose a favourite and a room for this shortcut."}</p>`;
		let r = n.map((t) => e.states[t]?.attributes.friendly_name ?? t).join(" + ");
		return D`<button class="short ${this._busy.on("play")}" @click=${() => this._play(t)}>
      <ha-icon .icon=${t.icon || "mdi:play-circle"}></ha-icon>
      <span><b>${t.name || t.favourite}</b><small>${r}</small></span>
    </button>`;
	}
	static {
		this.styles = [
			Y,
			$,
			h`
      :host { display: block; height: 100%; --jb-glow: var(--primary-color, #c4552d); font: 14px/1.3 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .short { display: flex; align-items: center; gap: 12px; width: 100%; height: 100%; min-height: 56px; padding: 8px 16px 8px 12px; border-radius: 18px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
      .short.busy::after { border-radius: 20px; }
      ha-icon { flex: none; --mdc-icon-size: 28px; color: var(--primary-color); }
      span { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; }
      b, small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      small { color: var(--secondary-text-color); }
    `
		];
	}
}, Nt = "casa-mia-jukebox-now", Pt = class extends I {
	static {
		this.properties = { _config: { state: !0 } };
	}
	set hass(e) {
		let t = !this._hass;
		this._hass = e, t && this.requestUpdate();
	}
	static getStubConfig() {
		return {};
	}
	static getConfigForm() {
		return {
			schema: [{
				name: "entity",
				required: !0,
				selector: Dt
			}],
			computeLabel: () => "Room"
		};
	}
	setConfig(e) {
		this._config = { ...e };
	}
	getCardSize() {
		return 9;
	}
	getGridOptions() {
		return {
			columns: 12,
			rows: 9,
			min_columns: 6,
			min_rows: 8
		};
	}
	render() {
		let [e, t] = [this._hass, this._config?.entity];
		return !e || !this._config ? k : !t || f(this) ? D`<p class="note">${t ? "" : "Choose a room. "}The whole player for one room: artwork, controls, queue, rooms, favourites and search.</p>` : D`<casa-mia-jukebox-big inline .hass=${e} .room=${t}></casa-mia-jukebox-big>`;
	}
	static {
		this.styles = [
			Y,
			$,
			h`:host { display: block; height: 100%; }`
		];
	}
}, Ft = "casa-mia-jukebox-rooms", It = class extends I {
	static {
		this.properties = { house: { attribute: !1 } };
	}
	render() {
		let { hass: e, house: t } = this;
		if (!e || !t) return k;
		let n = t.groups.filter((e) => e.quiet), r = Object.values(t.rooms).filter((e) => !e.available);
		return D`${n.length ? D`<h2>Quiet rooms: tap one to play something there</h2>
            <div class="chips">${n.map((n) => D`<button @click=${() => X(e, n.id, "favourites")}>${K("rooms")}${t.rooms[n.id].name}</button>`)}</div>` : k}
      ${r.length ? D`<h2>Not answering</h2><p class="none">${r.map((e) => e.name).join(", ")}</p>` : k}`;
	}
	static {
		this.styles = [Y, h`
      :host { display: block; color: var(--primary-text-color); font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      h2 { margin: 22px 0 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--secondary-text-color); }
      h2:first-child { margin-top: 0; }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chips button { display: flex; align-items: center; gap: 6px; padding: 8px 14px 8px 10px; border-radius: 999px; border: 1px solid var(--divider-color); background: var(--card-background-color); font-weight: 600; }
      .chips svg { width: 18px; height: 18px; color: var(--secondary-text-color); }
      .none { margin: 0; color: var(--secondary-text-color); overflow-wrap: anywhere; }
    `];
	}
};
l(it, st), l(yt, bt), l(xt, Ct), l(wt, Et), l(Ft, It), l(ct, dt), l(ft, gt), l(_t, vt), l(Ot, kt), l(At, Mt), l(Nt, Pt), u(_t, "Casa Mia Jukebox: players", "What is playing on the Sonos speakers, with pause, skip and volume. A tap opens the big player."), u(Ot, "Casa Mia Jukebox: quiet rooms", "The rooms that are playing nothing, each a tap from its favourites."), u(At, "Casa Mia Jukebox: shortcut", "A button that plays one favourite in the rooms you choose."), u(Nt, "Casa Mia Jukebox: now playing", "The whole player for one room, in place: artwork, controls, queue, rooms, favourites and search."), r("Jukebox", Ge, We);
//#endregion
