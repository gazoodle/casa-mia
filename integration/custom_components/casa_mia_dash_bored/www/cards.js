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
function i(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function a(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !0,
		documentationURL: "https://github.com/gazoodle/casa-mia"
	});
}
var o = n.main, s = n.panel;
({
	...o,
	...s
});
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var c = globalThis, l = c.ShadowRoot && (c.ShadyCSS === void 0 || c.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, u = Symbol(), d = /* @__PURE__ */ new WeakMap(), f = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== u) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (l && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = d.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && d.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, p = (e) => new f(typeof e == "string" ? e : e + "", void 0, u), ee = (e, ...t) => new f(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, u), m = (e, t) => {
	if (l) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = c.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, h = l ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return p(t);
})(e) : e, { is: g, defineProperty: te, getOwnPropertyDescriptor: ne, getOwnPropertyNames: re, getOwnPropertySymbols: ie, getPrototypeOf: ae } = Object, _ = globalThis, oe = _.trustedTypes, se = oe ? oe.emptyScript : "", ce = _.reactiveElementPolyfillSupport, v = (e, t) => e, y = {
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
}, le = (e, t) => !g(e, t), ue = {
	attribute: !0,
	type: String,
	converter: y,
	reflect: !1,
	useDefault: !1,
	hasChanged: le
};
Symbol.metadata ??= Symbol("metadata"), _.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var b = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ue) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && te(this.prototype, e, r);
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
		if (this.hasOwnProperty(v("elementProperties"))) return;
		let e = ae(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(v("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(v("properties"))) {
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
			for (let e of n) t.unshift(h(e));
		} else e !== void 0 && t.push(h(e));
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
		return m(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? y : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? y : e.converter;
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
b.elementStyles = [], b.shadowRootOptions = { mode: "open" }, b[v("elementProperties")] = /* @__PURE__ */ new Map(), b[v("finalized")] = /* @__PURE__ */ new Map(), ce?.({ ReactiveElement: b }), (_.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var x = globalThis, de = (e) => e, S = x.trustedTypes, fe = S ? S.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, C = "$lit$", w = `lit$${Math.random().toFixed(9).slice(2)}$`, T = "?" + w, pe = `<${T}>`, E = document, D = () => E.createComment(""), O = (e) => e === null || typeof e != "object" && typeof e != "function", k = Array.isArray, me = (e) => k(e) || typeof e?.[Symbol.iterator] == "function", A = "[ 	\n\f\r]", j = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, M = /-->/g, N = />/g, P = RegExp(`>|${A}(?:([^\\s"'>=/]+)(${A}*=${A}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), he = /'/g, ge = /"/g, _e = /^(?:script|style|textarea|title)$/i, F = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), I = Symbol.for("lit-noChange"), L = Symbol.for("lit-nothing"), ve = /* @__PURE__ */ new WeakMap(), R = E.createTreeWalker(E, 129);
function z(e, t) {
	if (!k(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return fe === void 0 ? t : fe.createHTML(t);
}
var B = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = j;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === j ? c[1] === "!--" ? o = M : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = P) : (_e.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = P) : o = N : o === P ? c[0] === ">" ? (o = i ?? j, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? P : c[3] === "\"" ? ge : he) : o === ge || o === he ? o = P : o === M || o === N ? o = j : (o = P, i = void 0);
		let d = o === P && e[t + 1].startsWith("/>") ? " " : "";
		a += o === j ? n + pe : l >= 0 ? (r.push(s), n.slice(0, l) + C + n.slice(l) + w + d) : n + w + (l === -2 ? t : d);
	}
	return [z(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, V = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = B(t, n);
		if (this.el = e.createElement(l, r), R.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = R.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(C)) {
					let t = u[o++], n = i.getAttribute(e).split(w), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? be : r[1] === "?" ? xe : r[1] === "@" ? Se : W
					}), i.removeAttribute(e);
				} else e.startsWith(w) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (_e.test(i.tagName)) {
					let e = i.textContent.split(w), t = e.length - 1;
					if (t > 0) {
						i.textContent = S ? S.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], D()), R.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], D());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === T) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(w, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += w.length - 1;
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
function H(e, t, n = e, r) {
	if (t === I) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = O(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = H(e, i._$AS(e, t.values), i, r)), t;
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? E).importNode(t, !0);
		R.currentNode = r;
		let i = R.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new U(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ce(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = R.nextNode(), a++);
		}
		return R.currentNode = E, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, U = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = L, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = H(this, e, t), O(e) ? e === L || e == null || e === "" ? (this._$AH !== L && this._$AR(), this._$AH = L) : e !== this._$AH && e !== I && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? me(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== L && O(this._$AH) ? this._$AA.nextSibling.data = e : this.T(E.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = V.createElement(z(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new ye(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ve.get(e.strings);
		return t === void 0 && ve.set(e.strings, t = new V(e)), t;
	}
	k(t) {
		k(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(D()), this.O(D()), this, this.options)) : r = n[i], r._$AI(a), i++;
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
}, W = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = L, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = L;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = H(this, e, t, 0), a = !O(e) || e !== this._$AH && e !== I, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = H(this, r[n + o], t, o), s === I && (s = this._$AH[o]), a ||= !O(s) || s !== this._$AH[o], s === L ? e = L : e !== L && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === L ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, be = class extends W {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === L ? void 0 : e;
	}
}, xe = class extends W {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== L);
	}
}, Se = class extends W {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = H(this, e, t, 0) ?? L) === I) return;
		let n = this._$AH, r = e === L && n !== L || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== L && (n === L || r);
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
		H(this, e);
	}
}, we = {
	M: C,
	P: w,
	A: T,
	C: 1,
	L: B,
	R: ye,
	D: me,
	V: H,
	I: U,
	H: W,
	N: xe,
	U: Se,
	B: be,
	F: Ce
}, Te = x.litHtmlPolyfillSupport;
Te?.(V, U), (x.litHtmlVersions ??= []).push("3.3.3");
var Ee = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new U(t.insertBefore(D(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, G = globalThis, K = class extends b {
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
		return I;
	}
};
K._$litElement$ = !0, K.finalized = !0, G.litElementHydrateSupport?.({ LitElement: K });
var De = G.litElementPolyfillSupport;
De?.({ LitElement: K }), (G.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/lit-html/directive.js
var Oe = (e) => (...t) => ({
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
}, { I: Ae } = we, je = {}, Me = (e, t = je) => e._$AH = t, Ne = Oe(class extends ke {
	constructor() {
		super(...arguments), this.key = L;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (Me(e), this.key = t), n;
	}
}), Pe = /* @__PURE__ */ new Set([
	"light",
	"switch",
	"cover",
	"lock"
]), Fe = /* @__PURE__ */ new Set([
	"garage",
	"gate",
	"door"
]);
function Ie(e, t, n) {
	let r = e.slice(t.length), i = (e.toLowerCase().startsWith(t.toLowerCase()) && !/^[a-z0-9]/i.test(r) ? r.replace(/^[\s\-–—:,.]+/, "") : e).replace(n === "light" ? /\s+lights?$/i : n === "switch" ? /\s+switch$/i : /$^/, ""), a = !i || RegExp(`^${n}s?$`, "i").test(i) ? n : i;
	return a[0].toUpperCase() + a.slice(1);
}
function Le(e, t) {
	let n = /* @__PURE__ */ new Map(), r = [], i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map(), o = t.weather;
	for (let s of Object.values(e.entities ?? {})) {
		let c = s.entity_id, l = e.states[c];
		if (!l || s.hidden || s.entity_category) continue;
		let u = c.split(".")[0];
		u === "scene" && r.push(c), u === "weather" && (!o || c === "weather.home") && !t.weather && (o = c), u === "sensor" && l.attributes.device_class === "power" && s.device_id && i.set(s.device_id, c);
		let d = e.areas?.[s.area_id ?? e.devices?.[s.device_id]?.area_id];
		if (!d || u !== "climate" && !Pe.has(u)) continue;
		if (!n.has(d.area_id)) {
			let t = e.floors?.[d.floor_id];
			n.set(d.area_id, {
				id: d.area_id,
				name: d.name,
				floor: t?.name,
				level: t ? t.level ?? 0 : Infinity,
				temp: d.temperature_entity_id ?? void 0,
				humidity: d.humidity_entity_id ?? void 0,
				devices: []
			});
		}
		let f = n.get(d.area_id);
		if (u === "climate") f.climate ??= c;
		else {
			let e = l.attributes.friendly_name ?? s.name ?? c, t = {
				id: c,
				kind: u,
				name: Ie(e, d.name, u),
				full: e,
				guarded: u === "lock" || Fe.has(l.attributes.device_class)
			};
			f.devices.push(t), u === "switch" && s.device_id && a.set(t, s.device_id);
		}
	}
	let s = /* @__PURE__ */ new Map();
	for (let e of a.values()) s.set(e, (s.get(e) ?? 0) + 1);
	for (let [e, t] of a) s.get(t) === 1 && (e.power = i.get(t));
	let c = [...n.values()].filter((e) => e.devices.length || e.temp).sort((e, t) => e.level - t.level || (e.floor ?? "").localeCompare(t.floor ?? "") || e.name.localeCompare(t.name));
	for (let e of c) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.devices) t.set(n.name, (t.get(n.name) ?? 0) + 1);
		for (let n of e.devices) t.get(n.name) > 1 && (n.name = n.full);
	}
	for (let e of c) e.devices.sort((e, t) => e.kind.localeCompare(t.kind) || e.name.localeCompare(t.name));
	let l = c.flatMap((e) => [
		e.temp,
		e.humidity,
		e.climate,
		...e.devices.flatMap((e) => [e.id, e.power])
	]);
	return {
		rooms: c,
		scenes: r.sort(),
		weather: o,
		power: t.power,
		watched: [
			...l,
			...r,
			o,
			t.power
		].filter((e) => !!e)
	};
}
function Re(e, t) {
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
var ze = 6e5, Be = {
	critical: 100,
	error: 95,
	warning: 70,
	task: 40
}, Ve = [
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
], q = (e) => new Date(e).toTimeString().slice(0, 5), J = (e) => e && e[0].toUpperCase() + e.slice(1);
function Y(e) {
	let t = Ve[e] ?? String(e);
	return {
		n: String(e),
		N: J(t),
		n_word: t,
		s: e === 1 ? "" : "s",
		v: e === 1 ? "s" : ""
	};
}
function He(e) {
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
function X(e) {
	return typeof e.value == "number" || typeof e.value == "string" && e.value.trim() !== "" && Number.isFinite(Number(e.value)) ? `${e.value}${e.unit ? ` ${e.unit}` : ""}` : "";
}
function Ue(e, t, n) {
	let r = [], i = (e) => r.push({
		variant: "",
		flavour: "",
		...e
	}), a = e.rooms.flatMap((e) => e.devices);
	for (let e of t) {
		let t = {
			name: e.name,
			area: (e.area ?? "house").toLowerCase(),
			message: e.message || `${J(e.level)}.`,
			reading: X(e),
			since: q(e.began),
			escalated: e.escalated ? "yes" : ""
		}, r = X(e) ? [X(e), e.area ?? e.name] : [J(e.level), e.name];
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
			rank: Be[e.level] ?? 70,
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
				...Y(o.length),
				names: o.length > 3 ? `${e} and ${o.length - 3} more` : e,
				since: q(Math.min(...o.map((e) => e.since)))
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
			vars: Y(c.length),
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
		vars: Y(a.length),
		figure: [String(e.rooms.length), e.rooms.length === 1 ? "room" : "rooms"]
	}), r.sort((e, t) => t.rank - e.rank);
}
//#endregion
//#region src/dash-bored/styles.ts
var We = ee`
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
`, Z = (e, t) => e.replace(/\{(\w+)\}/g, (e, n) => t[n] ?? "");
function Ge(e, t, n) {
	let r = e.stories[`${t.kind}.${t.variant}`] ?? e.stories[t.kind], i = r.flavours?.[t.flavour] ?? r.head, a = t.vars.escalated && r.worse ? " " + r.worse : "";
	return {
		kicker: r.kicker,
		head: Z(i[n % i.length], t.vars),
		deck: Z(r.deck, t.vars),
		body: r.body ? Z(t.vars.reading === "" && r.plain ? r.plain : r.body, t.vars) + a : "",
		act: t.press && r.act ? r.act : ""
	};
}
function Q(e, t) {
	let n = t.name.toLowerCase(), r = /lamp|light/i.test(n) ? n : `${n} light`, i = /s$/i.test((t.kind === "light" ? r : n).split(" - ")[0]), a = t.away ? "away" : t.on ? t.level === void 0 && (t.kind === "light" || t.kind === "cover") ? `${t.kind}.plain` : `${t.kind}.on` : `${t.kind}.off`;
	return Z(e.words[a], {
		name: n,
		lamp: r,
		level: String(t.level ?? ""),
		is: i ? "are" : "is",
		v: i ? "" : "s"
	}).replace(/^the (?=\S+['’]s )/, "");
}
var Ke = (e, t) => Z(t.level === "nominal" ? e.wire.clear : e.wire.trouble, {
	name: t.name,
	message: t.message || t.level,
	level: t.level.toUpperCase()
}), qe = {
	kicker: "Stop press",
	head: ["{name} gives cause for alarm"],
	deck: "{message}",
	body: "The reading stood at {reading} in the {area} as this edition went to press, and the trouble dates from {since}.",
	plain: "The trouble in the {area} dates from {since}.",
	worse: "Matters have worsened since our earlier report."
}, Je = {
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
			elsewhere: "Elsewhere"
		},
		join: "; ",
		end: ".",
		nothing: "Nothing has happened yet.",
		rest: "In {n_word} room{s} nothing is switched on.",
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
			alert: qe,
			"alert.warning": {
				...qe,
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
			elsewhere: "Everywhere else"
		},
		join: " • ",
		end: "",
		nothing: "Nothing yet. Give it a minute.",
		rest: "{n} room{s} with NOTHING ON!",
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
			alert: Je,
			"alert.warning": {
				...Je,
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
}, Ye = "dash-bored-gazette", Xe = "casa_mia_dash_bored/alerts", Ze = "dash-bored-style", Qe = 30, $e = 3, et = (e) => e.away || (e.kind === "lock" ? !e.on : e.on), tt = class extends K {
	constructor(...e) {
		super(...e), this.narrow = !1, this._style = "broadsheet", this._alerts = [], this._fault = "", this._lost = 0, this._config = {}, this._late = [], this._turn = /* @__PURE__ */ new Map(), this._showing = /* @__PURE__ */ new Set(), this._primed = !1, this._timers = /* @__PURE__ */ new Set();
	}
	static {
		this.styles = We;
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
		if (this._lost = 0, this._listen(), !this._survey || !t || t.entities !== e.entities || t.areas !== e.areas || t.devices !== e.devices || t.floors !== e.floors) this._survey = Le(e, this._config);
		else if (t.states === e.states || !this._survey.watched.some((n) => t.states[n] !== e.states[n])) return;
		let n = new Map(this._house?.rooms.flatMap((e) => e.devices).map((e) => [e.id, e]));
		this._house = Re(this._survey, e);
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
			e ??= localStorage.getItem(Ze) ?? void 0;
		} catch {}
		e && e in $ && (this._style = e);
	}
	_dress(e) {
		this._style = e;
		try {
			localStorage.setItem(Ze, e);
		} catch {}
	}
	_listen() {
		let e = this._hass?.connection;
		if (this._feed || !e || !this.isConnected) return;
		let t = e.subscribeMessage((e) => this._take(e), { type: Xe });
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
				flavour: He(this._hass?.states[n.entity_id]?.attributes.device_class)
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
					}, ze + 1e3);
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
		if (!e || !t) return F`<div class="paper" data-style=${this._style}><p class="wait">Waiting for Home Assistant.</p></div>`;
		let r = Ue(t, this._alerts, Date.now());
		for (let e of r) this._showing.has(e.id) || this._turn.set(e.id, (this._turn.get(e.id) ?? -1) + 1);
		this._showing = new Set(r.map((e) => e.id));
		let i = r.map((e) => ({
			s: e,
			...Ge(n, e, this._turn.get(e.id))
		})), [a, ...o] = i, s = i.find((e) => e.s.kind === "alert"), c = (e) => e.act ? F`<button class="act" @click=${() => this._call(e.s.press, e.head)}>${e.act}</button>` : L, l = (e, t) => F`<span class="fact ${e.away ? "away" : ""}" role="button" tabindex="0" @click=${() => this._press(e)} @keydown=${this._key}>${t ? J(Q(n, e)) : Q(n, e)}</span>`, u = t.rooms.filter((e) => e.temp !== void 0), d = t.rooms.filter((e) => e.devices.length), f = d.reduce((e, t) => e + t.devices.length, 0) > Qe, p = f ? d.map((e) => ({
			...e,
			devices: e.devices.filter(et)
		})).filter((e) => e.devices.length) : d, ee = d.some((e) => e.floor), m = (e, t, r = (e) => e) => {
			let i = /* @__PURE__ */ new Map();
			for (let t of e) i.set(t.floor ?? "", [...i.get(t.floor ?? "") ?? [], t]);
			return [...i].map(([e, i]) => F`${ee ? F`<h5>${e || n.titles.elsewhere}</h5>` : L}${r(i.map(t))}`);
		}, h = (e) => {
			let t = (t) => {
				let n = e.devices.filter((e) => f && e.kind === t && e.on && !e.away);
				return n.length > $e ? n : [];
			}, r = t("light"), i = t("switch"), a = e.devices.filter((e) => !r.includes(e) && !i.includes(e)).map((e, t) => l(e, !t && !r.length && !i.length));
			return i.length && a.unshift(r.length ? Z(n.words["switch.many"], Y(i.length)) : J(Z(n.words["switch.many"], Y(i.length)))), r.length && a.unshift(F`<span class="fact" role="button" tabindex="0" @click=${() => this._call({
				domain: "light",
				service: "turn_off",
				ids: r.map((e) => e.id)
			}, e.name)} @keydown=${this._key}>${J(Z(n.words["light.many"], Y(r.length)))}</span>`), F`<p><b>${e.name}.</b> ${a.map((e, t) => F`${t ? n.join : ""}${e}`)}${n.end}</p>`;
		}, g = F`<h3>${n.titles.board}</h3>
      ${m(d, (e) => F`<div class="row"><span>${e.name}</span>${e.devices.map((e) => F`<button class="chip ${e.on ? "on" : ""} ${e.away ? "away" : ""}" aria-pressed=${e.on} @click=${() => this._press(e)}>${e.name}</button>`)}</div>`, (e) => F`<div class="rows">${e}</div>`)}`;
		return F`<div class="paper" data-style=${this._style}>
      ${this._lost ? F`<div class="fault" role="alert">Not connected to Home Assistant since ${q(this._lost)}. What follows is how things stood then.</div>` : L}
      ${this._fault ? F`<div class="fault" role="alert">${this._fault}</div>` : L}
      ${s ? Ne(s.s.id + s.s.variant, F`<div class="breaking" role="status"><b>${n.flash}</b>${s.head}${/[!?]$/.test(s.head) ? "" : ":"} ${s.s.vars.message}</div>`) : L}
      <header class="masthead"><h1>${n.name}</h1><p>${n.strap}</p></header>
      <div class="dateline">
        ${this.hasAttribute("panel") ? F`<ha-menu-button .hass=${e} .narrow=${this.narrow}></ha-menu-button>` : L}
        <span>${(/* @__PURE__ */ new Date()).toLocaleDateString(e.locale?.language ?? "en-GB", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric"
		})}</span>
        ${this._config.style ? L : F`<span class="styles">${Object.entries($).map(([e, t]) => F`<button aria-pressed=${e === this._style} @click=${() => this._dress(e)}>${t.label}</button>`)}</span>`}
        <span>${n.price} · ${q(Date.now())}</span>
      </div>
      <main class="page ${o.length ? "" : "solo"}">
        <article>
          <div class="figure"><b>${a.s.figure[0]}</b><span>${a.s.figure[1]}</span></div>
          <p class="kicker">${a.kicker}</p>
          ${Ne(a.head, F`<h2>${a.head}</h2>`)}
          <p class="deck">${a.deck}</p>
          ${c(a)}
          <div class="copy">
            ${a.body ? F`<p>${a.body}</p>` : L}
            ${m(p, h)}
            ${d.length > p.length ? F`<p>${Z(n.rest, Y(d.length - p.length))}</p>` : L}
            ${d.length ? L : F`<p>No areas with lights, switches, covers or locks were found. Give your devices areas in Home Assistant's settings and this page fills itself in.</p>`}
          </div>
        </article>
        ${o.length ? F`<section>
              <h3>${n.titles.more}</h3>
              ${o.slice(0, 3).map((e) => F`<div class="item"><p class="kicker">${e.kicker}</p><h4>${e.head}</h4><p>${e.deck}</p>${c(e)}</div>`)}
              ${o.length > 3 ? F`<h3>${n.titles.briefs}</h3><ul>${o.slice(3).map((e) => F`<li><b>${e.head}.</b> ${e.deck}</li>`)}</ul>` : L}
            </section>` : L}
        <aside>
          <h3>${n.titles.late}</h3>
          <ol>${this._late.length ? this._late.map((e) => F`<li><time>${q(e.time)}</time>${e.alert ? Ke(n, e.alert) : `${e.device.room}: ${Q(n, e.device)}`}</li>`) : F`<li>${n.nothing}</li>`}</ol>
          ${u.length ? F`<h3>${n.titles.temps}</h3><table>${u.map((e) => F`<tr><td>${e.name}</td><td>${e.temp.toFixed(1)}° ${e.target === void 0 ? "" : e.temp < e.target - .5 ? "▼" : e.temp > e.target + .5 ? "▲" : "="}</td></tr>`)}</table>` : L}
          ${f ? L : g}
          ${t.scenes.length ? F`<h3>${n.titles.notices}</h3>${t.scenes.slice(0, 8).map((e, t) => F`<button class="ad" @click=${() => this._call({
			domain: "scene",
			service: "turn_on",
			ids: [e.id]
		}, e.name)}><b>${e.name}</b>${n.notices[t % n.notices.length]}</button>`)}` : L}
        </aside>
        ${f ? F`<section class="board">${g}</section>` : L}
      </main>
    </div>`;
	}
}, nt = new URL(import.meta.url).searchParams.get("v") || "dev";
i(Ye, tt), a(Ye, "Dash-Bored Gazette", "Your house as a newspaper: what matters most is the headline, and every underlined fact is a switch. Best in a panel view."), t("Dash-Bored", "casa_mia_dash_bored/cards", nt);
//#endregion
