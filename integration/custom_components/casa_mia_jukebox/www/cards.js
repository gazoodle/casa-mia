//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: ee, getOwnPropertyNames: te, getOwnPropertySymbols: ne, getPrototypeOf: re } = Object, ie = globalThis, ae = ie.trustedTypes, oe = ae ? ae.emptyScript : "", se = ie.reactiveElementPolyfillSupport, d = (e, t) => e, ce = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? oe : null;
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
}, le = (e, t) => !l(e, t), ue = {
	attribute: !0,
	type: String,
	converter: ce,
	reflect: !1,
	useDefault: !1,
	hasChanged: le
};
Symbol.metadata ??= Symbol("metadata"), ie.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var f = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ue) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = ee(this.prototype, e) ?? {
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
		if (this.hasOwnProperty(d("elementProperties"))) return;
		let e = re(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(d("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(d("properties"))) {
			let e = this.properties, t = [...te(e), ...ne(e)];
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
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
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
		return s(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? ce : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? ce : e.converter;
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
f.elementStyles = [], f.shadowRootOptions = { mode: "open" }, f[d("elementProperties")] = /* @__PURE__ */ new Map(), f[d("finalized")] = /* @__PURE__ */ new Map(), se?.({ ReactiveElement: f }), (ie.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var de = globalThis, fe = (e) => e, p = de.trustedTypes, pe = p ? p.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, me = "$lit$", m = `lit$${Math.random().toFixed(9).slice(2)}$`, he = "?" + m, ge = `<${he}>`, h = document, g = () => h.createComment(""), _ = (e) => e === null || typeof e != "object" && typeof e != "function", _e = Array.isArray, ve = (e) => _e(e) || typeof e?.[Symbol.iterator] == "function", ye = "[ 	\n\f\r]", v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, be = /-->/g, xe = />/g, y = RegExp(`>|${ye}(?:([^\\s"'>=/]+)(${ye}*=${ye}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Se = /'/g, Ce = /"/g, we = /^(?:script|style|textarea|title)$/i, b = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), x = Symbol.for("lit-noChange"), S = Symbol.for("lit-nothing"), Te = /* @__PURE__ */ new WeakMap(), C = h.createTreeWalker(h, 129);
function Ee(e, t) {
	if (!_e(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return pe === void 0 ? t : pe.createHTML(t);
}
var De = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = v;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === v ? c[1] === "!--" ? o = be : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = y) : (we.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = y) : o = xe : o === y ? c[0] === ">" ? (o = i ?? v, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? y : c[3] === "\"" ? Ce : Se) : o === Ce || o === Se ? o = y : o === be || o === xe ? o = v : (o = y, i = void 0);
		let ee = o === y && e[t + 1].startsWith("/>") ? " " : "";
		a += o === v ? n + ge : l >= 0 ? (r.push(s), n.slice(0, l) + me + n.slice(l) + m + ee) : n + m + (l === -2 ? t : ee);
	}
	return [Ee(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Oe = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = De(t, n);
		if (this.el = e.createElement(l, r), C.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = C.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(me)) {
					let t = u[o++], n = i.getAttribute(e).split(m), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? je : r[1] === "?" ? Me : r[1] === "@" ? Ne : T
					}), i.removeAttribute(e);
				} else e.startsWith(m) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (we.test(i.tagName)) {
					let e = i.textContent.split(m), t = e.length - 1;
					if (t > 0) {
						i.textContent = p ? p.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], g()), C.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], g());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === he) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(m, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += m.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = h.createElement("template");
		return n.innerHTML = e, n;
	}
};
function w(e, t, n = e, r) {
	if (t === x) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = _(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = w(e, i._$AS(e, t.values), i, r)), t;
}
var ke = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? h).importNode(t, !0);
		C.currentNode = r;
		let i = C.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Ae(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Pe(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = C.nextNode(), a++);
		}
		return C.currentNode = h, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Ae = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = S, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = w(this, e, t), _(e) ? e === S || e == null || e === "" ? (this._$AH !== S && this._$AR(), this._$AH = S) : e !== this._$AH && e !== x && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ve(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== S && _(this._$AH) ? this._$AA.nextSibling.data = e : this.T(h.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Oe.createElement(Ee(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new ke(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Te.get(e.strings);
		return t === void 0 && Te.set(e.strings, t = new Oe(e)), t;
	}
	k(t) {
		_e(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(g()), this.O(g()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = fe(e).nextSibling;
			fe(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, T = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = S, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = S;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = w(this, e, t, 0), a = !_(e) || e !== this._$AH && e !== x, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = w(this, r[n + o], t, o), s === x && (s = this._$AH[o]), a ||= !_(s) || s !== this._$AH[o], s === S ? e = S : e !== S && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === S ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, je = class extends T {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === S ? void 0 : e;
	}
}, Me = class extends T {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== S);
	}
}, Ne = class extends T {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = w(this, e, t, 0) ?? S) === x) return;
		let n = this._$AH, r = e === S && n !== S || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== S && (n === S || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Pe = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		w(this, e);
	}
}, Fe = de.litHtmlPolyfillSupport;
Fe?.(Oe, Ae), (de.litHtmlVersions ??= []).push("3.3.3");
var Ie = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Ae(t.insertBefore(g(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Le = globalThis, E = class extends f {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ie(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return x;
	}
};
E._$litElement$ = !0, E.finalized = !0, Le.litElementHydrateSupport?.({ LitElement: E });
var Re = Le.litElementPolyfillSupport;
Re?.({ LitElement: E }), (Le.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/anchors.ts
var ze = [
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
];
function Be(e) {
	let t = ze.findIndex((t) => t.includes(e));
	return t < 0 ? [1, 1] : [t, ze[t].indexOf(e)];
}
function Ve(e) {
	let [t, n] = Be(e), r = [
		"flex-start",
		"center",
		"flex-end"
	];
	return {
		justify: r[n],
		align: r[t]
	};
}
var He = {
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
function D(e, t, n) {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}
function Ue(e) {
	history.pushState(null, "", e), D(window, "location-changed", { replace: !1 });
}
async function We() {
	customElements.get("ha-form") || (await (await (await window.loadCardHelpers()).createCardElement({
		type: "entities",
		entities: []
	})).constructor.getConfigElement?.(), await customElements.whenDefined("ha-form"));
}
function O(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function k(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !0,
		documentationURL: "https://github.com/gazoodle/casa-mia-jukebox"
	});
}
var Ge = He.main, Ke = He.panel;
({
	...Ge,
	...Ke
});
var qe = (e) => e.parentElement ?? (e.getRootNode().host || null);
function A(e) {
	for (let t = e; t; t = qe(t)) if (t.tagName === "HUI-CARD-PICKER") return !0;
	return !1;
}
function Je(e, t) {
	return Object.fromEntries(Object.entries(e).filter(([e, n]) => !(e in t) || JSON.stringify(n) !== JSON.stringify(t[e])));
}
//#endregion
//#region src/anchor-grid.ts
var Ye = class extends E {
	constructor(...e) {
		super(...e), this.value = "center", this.label = "", this.rows = 3;
	}
	static {
		this.properties = {
			value: {},
			label: {},
			rows: { type: Number }
		};
	}
	render() {
		return b`<div class="anchors" role="radiogroup" aria-label=${this.label}>
      ${ze.map((e, t) => e.map((e) => b`<button
              type="button"
              role="radio"
              aria-checked=${e === this.value}
              aria-label=${e}
              title=${e}
              class=${e === this.value ? "on" : ""}
              ?disabled=${t >= this.rows}
              @click=${() => D(this, "anchor-changed", { value: e })}
            ></button>`))}
    </div>`;
	}
	static {
		this.styles = o`
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
  `;
	}
}, Xe = 100, Ze = 600, Qe = 6e4, $e = [
	"pointerdown",
	"keydown",
	"wheel"
];
function et(e, t) {
	let n = (t) => console.error(`CASA-MIA CARDS: ${e} won't work: ${t}`), r = () => {
		let e = window.hassConnection;
		return e?.then(t, (e) => n(`Home Assistant's connection failed (${e})`)), !!e;
	};
	if (r()) return;
	let i = Ze, a = setInterval(() => {
		r() ? clearInterval(a) : --i === 0 && (clearInterval(a), n("Home Assistant's connection never appeared"));
	}, Xe);
}
function tt(e, t, n, r) {
	n !== "dev" && et(`${e}'s offer to reload after an update`, ({ conn: i }) => {
		i.addEventListener("ready", () => i.sendMessagePromise({ type: t }).then(({ version: t }) => {
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
			})), r && rt(e, r));
		}, () => {}));
	});
}
var nt = !1;
function rt(e, t) {
	if (nt) return;
	nt = !0;
	let n, r = () => {
		clearTimeout(n), n = setTimeout(() => {
			t() && (console.warn(`CASA-MIA CARDS: ${e} reloading itself to update, untouched for ${Qe / 1e3} s`), location.reload());
		}, Qe);
	};
	for (let e of $e) window.addEventListener(e, r, {
		capture: !0,
		passive: !0
	});
	r();
}
//#endregion
//#region src/jukebox/lineup.ts
var it = {
	songs: [],
	at: -1,
	shuffle: !1,
	repeat: "off"
};
function at(e, t, n) {
	let r = [
		...e.songs.slice(0, n),
		...t,
		...e.songs.slice(n)
	];
	return {
		...e,
		songs: r,
		at: e.at < 0 ? r.length ? 0 : -1 : e.at >= n ? e.at + t.length : e.at
	};
}
function ot(e, t, n, r) {
	if (n === "replace") return [{
		...e,
		songs: t,
		at: t.length ? 0 : -1
	}, t.length > 0];
	if (!t.length) return [e, !1];
	if (r !== void 0) return [at(e, t, Math.max(0, Math.min(e.songs.length, r - 1))), !1];
	if (n === "add") return [at(e, t, e.songs.length), !1];
	let i = at(e, t, e.at + 1);
	return n === "next" ? [i, !1] : [{
		...i,
		at: e.at + 1
	}, !0];
}
function st(e, t, n) {
	let [r, i] = [t - 1, n - 1];
	if (r === i || !e.songs[r] || !e.songs[i]) return e;
	let a = [...e.songs];
	a.splice(i, 0, ...a.splice(r, 1));
	let o = e.at === r ? i : r < e.at && i >= e.at ? e.at - 1 : r > e.at && i <= e.at ? e.at + 1 : e.at;
	return {
		...e,
		songs: a,
		at: o
	};
}
function ct(e, t) {
	let n = t - 1;
	if (!e.songs[n]) return [e, !1];
	let r = e.songs.filter((e, t) => t !== n), i = n < e.at ? e.at - 1 : Math.min(e.at, r.length - 1);
	return [{
		...e,
		songs: r,
		at: i
	}, n === e.at];
}
function lt(e, t, n = Math.random) {
	let r = e.songs.length;
	if (!r) return null;
	if (t && e.repeat === "one") return e.at;
	if (e.shuffle && r > 1) {
		let t = Math.floor(n() * (r - 1));
		return t >= e.at ? t + 1 : t;
	}
	return e.at + 1 < r ? e.at + 1 : e.repeat === "all" ? 0 : null;
}
var ut = (e) => Math.max(0, e.at - 1), dt = "https://sdk.scdn.co/spotify-player.js", ft = "https://api.spotify.com/v1/me/player/play", pt = 15e3, mt = {
	initialization_error: "This browser can't run Spotify's player",
	authentication_error: "Spotify refused Jukebox's sign-in",
	account_error: "Spotify plays in a page only for a Premium account"
};
function ht() {
	let e = /* @__PURE__ */ new Uint8Array(844), t = new DataView(e.buffer), n = (e, n) => [...n].forEach((n, r) => t.setUint8(e + r, n.charCodeAt(0)));
	return n(0, "RIFF"), t.setUint32(4, 836, !0), n(8, "WAVEfmt "), t.setUint32(16, 16, !0), t.setUint16(20, 1, !0), t.setUint16(22, 1, !0), t.setUint32(24, 8e3, !0), t.setUint32(28, 8e3, !0), t.setUint16(32, 1, !0), t.setUint16(34, 8, !0), n(36, "data"), t.setUint32(40, 800, !0), e.fill(128, 44), URL.createObjectURL(new Blob([e], { type: "audio/wav" }));
}
var gt;
function _t() {
	let e = window;
	return gt ??= new Promise((t, n) => {
		if (e.Spotify) return t(e.Spotify);
		e.onSpotifyWebPlaybackSDKReady = () => t(e.Spotify);
		let r = Object.assign(document.createElement("script"), {
			src: dt,
			onerror: () => n(/* @__PURE__ */ Error("Spotify's player couldn't be fetched from Spotify"))
		});
		document.head.append(r);
	}).catch((e) => {
		throw gt = void 0, e;
	});
}
var vt = class {
	constructor(e, t) {
		this.on = "", this._device = "", this._heard = !1, [this._hears, this._token] = [e, t];
	}
	unlock() {
		if (this._made?.then((e) => e.activateElement?.()).catch(() => void 0), this._audio) return;
		let e = this._listen(new Audio());
		e.src = this._silence = ht(), e.play().catch(() => void 0);
	}
	_listen(e) {
		this._audio = e;
		let t = () => this.on === "audio" && e.src !== this._silence, n = () => t() && this._hears.told({
			playing: !e.paused,
			position: e.currentTime,
			duration: Number.isFinite(e.duration) ? e.duration : null
		});
		for (let t of [
			"playing",
			"pause",
			"seeked",
			"durationchange"
		]) e.addEventListener(t, n);
		return e.addEventListener("playing", () => t() && this._hears.note("")), e.addEventListener("waiting", () => t() && this._hears.note("Waiting for the sound to arrive…")), e.addEventListener("ended", () => t() && this._hears.ended()), e.addEventListener("error", () => {
			if (!t()) return;
			let n = {
				2: "it stopped arriving",
				3: "it can't be read",
				4: "this browser can't fetch it, or doesn't play that kind of file"
			}[e.error?.code ?? 0] ?? "the browser gave no reason";
			this._hears.failed(e.error?.message ? `${n} (${e.error.message})` : n);
		}), e;
	}
	async audio(e, t = 0) {
		this.on === "spotify" && this._made?.then((e) => e.pause()).catch(() => void 0);
		let n = this._audio ?? this._listen(new Audio());
		this.on = "audio", n.src = e, t && (n.currentTime = t);
		try {
			await n.play();
		} catch (e) {
			if (e?.name === "NotAllowedError") throw Error("The browser starts sound only from a tap. Press play.");
		}
	}
	_cant(e) {
		this._wait ? this._wait.failed(e) : this.on === "spotify" && this._hears.lost(e.message);
	}
	_make() {
		return this._made ??= _t().then((e) => {
			let t = new e.Player({
				name: "Jukebox",
				volume: 1,
				getOAuthToken: (e) => void this._token().then(e, (e) => this._cant(e))
			});
			t.addListener("ready", (e) => {
				this._device = e.device_id, this._wait?.done();
			}), t.addListener("not_ready", () => this._device = "");
			for (let e of Object.keys(mt)) t.addListener(e, (t) => this._cant(/* @__PURE__ */ Error(`${mt[e]} (${t.message})`)));
			return t.addListener("playback_error", (e) => this.on === "spotify" && this._hears.failed(`Spotify says: ${e.message}`)), t.addListener("autoplay_failed", () => this.on === "spotify" && this._hears.lost("The browser starts sound only from a tap. Press play.")), t.addListener("player_state_changed", (e) => this._spotifySaid(e)), t;
		}).catch((e) => {
			throw this._made = void 0, e;
		});
	}
	_connect(e = !1) {
		return this._connecting ??= this._make().then(async (t) => {
			if (e && (t.disconnect(), this._device = ""), this._device) return t;
			let n;
			try {
				await new Promise((e, r) => {
					this._wait = {
						done: e,
						failed: r
					}, n = setTimeout(() => r(/* @__PURE__ */ Error("Spotify's player didn't connect in 15 seconds")), pt), t.connect().then((e) => e || r(/* @__PURE__ */ Error("Spotify's player wouldn't connect")), r);
				});
			} finally {
				clearTimeout(n), this._wait = void 0;
			}
			return t;
		}).finally(() => this._connecting = void 0);
	}
	ready() {
		return this._connect();
	}
	async spotify(e, t = 0, n = !0) {
		this._audio?.pause(), await this._connect(), [this.on, this._heard] = ["spotify", !1];
		let r = await fetch(`${ft}?device_id=${this._device}`, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${await this._token()}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				uris: [e],
				position_ms: Math.round(t * 1e3)
			})
		});
		if (r.status === 404 && n) return this._hears.note("Connecting to Spotify again…"), await this._connect(!0), this.spotify(e, t, !1);
		if (!r.ok) {
			let e = await r.json().then((e) => e?.error?.message, () => void 0);
			throw Error(`Spotify wouldn't play it (${e || r.status})`);
		}
	}
	_spotifySaid(e) {
		if (this.on !== "spotify") return;
		if (!e) return this._hears.lost("Spotify is playing somewhere else on this account now, so it stopped here. Press play to bring it back.");
		let t = e.track_window?.current_track;
		this._hears.told({
			playing: !e.paused,
			position: e.position / 1e3,
			duration: e.duration ? e.duration / 1e3 : null,
			...t ? {
				title: t.name,
				artist: (t.artists ?? []).map((e) => e.name).join(", "),
				album: t.album?.name,
				picture: t.album?.images?.[0]?.url
			} : {}
		}), !e.paused && e.position > 0 ? this._heard = !0 : e.paused && e.position === 0 && this._heard && (this._heard = !1, this._hears.ended());
	}
	async pause() {
		this.on === "spotify" ? await (await this._make()).pause() : this._audio?.pause();
	}
	async resume(e, t) {
		if (this.on !== "spotify") return void await this._audio?.play();
		let n = await this._connect();
		await n.getCurrentState() ? await n.resume() : await this.spotify(e, t);
	}
	async seek(e) {
		this.on === "spotify" ? (e || (this._heard = !1), await (await this._make()).seek(Math.round(e * 1e3))) : this._audio && (this._audio.currentTime = e);
	}
	stop() {
		this.on === "spotify" && this._made?.then((e) => e.pause()).catch(() => void 0), this.on = "", this._audio && (this._audio.pause(), this._audio.removeAttribute("src"), this._audio.load());
	}
}, j = "this_device", yt = "casa_mia_jukebox", bt = "casa-mia-jukebox-phone", xt = 3, St = 3, Ct = {
	volume: "Use this device's own volume buttons",
	group_volume: "Use this device's own volume buttons",
	mute: "Use this device's own volume buttons",
	group_mute: "Use this device's own volume buttons",
	join: "This device plays by itself, and can't be joined to the Sonos rooms",
	leave: "This device plays by itself",
	party: "A party is for the Sonos rooms",
	party_open: "A party is for the Sonos rooms",
	queue_save: "This device's queue can't be saved as a Sonos playlist"
};
function wt() {
	let e = navigator.userAgent;
	return /iPhone|iPod|Android.+Mobile/.test(e) ? "This phone" : /iPad|Android/.test(e) || /Macintosh/.test(e) && navigator.maxTouchPoints > 1 ? "This tablet" : "This computer";
}
function Tt() {
	try {
		let e = JSON.parse(localStorage.getItem(bt) ?? "null");
		if (Array.isArray(e?.line?.songs) && e.line.songs.every((e) => typeof e?.uri == "string") && typeof e.line.at == "number" && e.line.at < e.line.songs.length) return {
			line: {
				...it,
				...e.line
			},
			station: typeof e.station?.uri == "string" ? e.station : void 0
		};
	} catch {}
	return { line: it };
}
var Et = (e) => e?.message ?? String(e), M = new class {
	constructor() {
		this._told = {
			playing: !1,
			position: 0,
			duration: null,
			at: 0
		}, this._trouble = "", this._note = "", this._heard = /* @__PURE__ */ new Set(), this._serial = 0, this._retried = 0, this._failed = 0, this._fails = 0, this._seen = /* @__PURE__ */ new Map(), this._session = !1, this._acts = {
			play: () => this._resume(),
			pause: () => this._sound.pause(),
			next: () => {
				if (this._station) throw Error("A station has no next song");
				return this._go(lt(this._line, !1));
			},
			previous: () => this._position() > St ? this._seek(0) : this._go(ut(this._line)),
			seek: (e) => this._seek(Number(e.value)),
			shuffle: (e) => void (this._line = {
				...this._line,
				shuffle: !!e.on
			}),
			repeat: (e) => void (this._line = {
				...this._line,
				repeat: e.mode
			}),
			play_media: (e) => this._add(e, e.enqueue),
			queue_add: (e) => this._add(e, "add", e.to),
			queue_play: (e) => this._go(Number(e.value) - 1),
			queue_move: (e) => void (this._line = st(this._line, Number(e.value), Number(e.to))),
			queue_remove: (e) => {
				let [t, n] = ct(this._line, Number(e.value));
				if (this._line = t, n && !this._station && this._told.playing) return this._go(t.at < 0 ? null : t.at);
				n && !this._station && this._rest();
			},
			queue_clear: () => {
				this._line = {
					...this._line,
					songs: [],
					at: -1
				}, this._station || this._rest();
			},
			stop: () => {
				[this._line, this._station] = [{
					...this._line,
					songs: [],
					at: -1
				}, void 0], this._rest();
			}
		}, {line: this._line, station: this._station} = Tt(), this._sound = new vt({
			told: (e) => this._heardTold(e),
			ended: () => this._advance(!0),
			failed: (e) => this._cant(e),
			lost: (e) => this._lost(e),
			note: (e) => (this._note = e, this._changed())
		}, () => this._spotifyToken());
	}
	listen(e) {
		return this._heard.add(e), () => void this._heard.delete(e);
	}
	_changed() {
		for (let e of this._heard) e();
	}
	_save() {
		try {
			localStorage.setItem(bt, JSON.stringify({
				line: this._line,
				station: this._station
			}));
		} catch {}
	}
	within(e) {
		this._house = e;
		let t = this._group();
		if (t.quiet && e.me === "screen") return e;
		let n = {
			...e.rooms,
			[j]: {
				name: wt(),
				volume: null,
				muted: !1,
				available: !0
			}
		};
		return {
			...e,
			rooms: n,
			groups: t.quiet ? [...e.groups, t] : [t, ...e.groups]
		};
	}
	speaker() {
		let e = this._house?.rooms ?? {};
		return Object.keys(e).find((t) => e[t].available) ?? "";
	}
	seen(e) {
		this._seen.size > 2e3 && this._seen.clear();
		for (let t of e) this._seen.set(t.media_content_id, t);
	}
	wake(e) {
		this._hass = e, this._house?.spotify && this._sound.ready().catch(() => void 0);
	}
	_current() {
		return this._station ?? this._line.songs[this._line.at];
	}
	_position() {
		return this._told.position + (this._told.playing ? Math.max(0, (Date.now() - this._told.at) / 1e3) : 0);
	}
	_group() {
		let [e, t, n] = [
			this._current(),
			this._told,
			this._line
		], r = this._station ? "radio" : e ? "queue" : "nothing";
		return {
			id: j,
			rooms: [j],
			state: t.playing ? "playing" : "paused",
			kind: r,
			quiet: r === "nothing",
			title: this._station ? "" : e?.title ?? "",
			artist: this._station ? "" : e?.artist ?? "",
			album: this._station ? "" : e?.album ?? "",
			channel: this._station?.title ?? "",
			picture: e?.picture ?? null,
			duration: this._station ? null : t.duration ?? e?.duration ?? null,
			position: this._station ? null : t.position,
			position_at: new Date(t.at || Date.now()).toISOString(),
			shuffle: n.shuffle,
			repeat: n.repeat,
			queue_size: n.songs.length,
			queue_position: n.at + 1,
			party: null,
			love: null,
			trouble: this._trouble || this._note || void 0
		};
	}
	queue() {
		return Promise.resolve({
			songs: this._line.songs,
			total: this._line.songs.length
		});
	}
	do(e, t, n = {}) {
		this._hass = e, this._sound.unlock(), this._trouble = "";
		let r = this._acts[t];
		return r ? Promise.resolve().then(() => r(n)).finally(() => (this._save(), this._changed())) : Promise.reject(Error(Ct[t] ?? "That can't be done on this device"));
	}
	_send(e) {
		return this._hass.connection.sendMessagePromise(e);
	}
	async _add(e, t, n) {
		let r = this.speaker();
		if (!r) throw Error("No Sonos speaker is answering, and the music is listed by one");
		let i = this._seen.get(e.media_content_id), a = await this._send({
			type: `${yt}/phone/songs`,
			entity_id: r,
			media_content_id: e.media_content_id,
			media_content_type: e.media_content_type,
			name: i?.title ?? e.name ?? "",
			by: i?.by ?? ""
		});
		a.songs.length === 1 && (a.songs[0].picture ??= i?.picture ?? null);
		let o = a.songs[0];
		if (o.live) this._station = o, await this._start(o);
		else {
			let [e, r] = ot(this._line, a.songs, t, n);
			this._line = e, r && (this._station = void 0, await this._start(e.songs[e.at]));
		}
		let s = a.left_out;
		s && (this._trouble = `${this._trouble} ${s === 1 ? "One of its songs is" : `${s} of its songs are`} from another music service, and couldn't be added.`.trim());
	}
	_go(e) {
		return e === null || !this._line.songs[e] ? this._rest() : ([this._line, this._station] = [{
			...this._line,
			at: e
		}, void 0], this._start(this._line.songs[e]));
	}
	_rest() {
		this._sound.stop(), this._serial++, this._line = {
			...this._line,
			at: this._line.songs.length ? 0 : -1
		}, this._told = {
			playing: !1,
			position: 0,
			duration: null,
			at: Date.now()
		}, this._note = "";
	}
	async _resume() {
		let e = this._current();
		if (!e) throw Error("There is nothing to play. Choose something from Favourites or Search.");
		if (!this._sound.on) return this._start(e, e.live ? 0 : this._told.position);
		await this._sound.resume(e.uri, this._told.position);
	}
	async _seek(e) {
		await this._sound.seek(e), this._told = {
			...this._told,
			position: e,
			at: Date.now()
		};
	}
	async _start(e, t = 0) {
		let n = ++this._serial;
		if (this._note = "", this._told = {
			playing: !1,
			position: t,
			duration: e.duration,
			at: Date.now()
		}, this._save(), this._changed(), e.uri.startsWith("spotify:")) await this._sound.spotify(e.uri, t);
		else {
			let { url: r } = await this._send({
				type: `${yt}/phone/address`,
				uri: e.uri,
				secure: location.protocol === "https:"
			});
			if (n !== this._serial) return;
			await this._sound.audio(r.startsWith("/") ? this._hass.hassUrl?.(r) ?? r : r, t);
		}
		n === this._serial && this._lockScreen(e);
	}
	_heardTold(e) {
		this._told = {
			...e,
			at: Date.now()
		}, e.playing && ([this._fails, this._note] = [0, ""]);
		let t = this._current();
		if (t && !t.live) {
			let n = {
				title: e.title || t.title,
				artist: e.artist || t.artist,
				album: e.album || t.album,
				picture: t.picture ?? e.picture,
				duration: t.duration ?? e.duration
			};
			Object.keys(n).some((e) => n[e] !== t[e]) && (Object.assign(t, n), this._save(), this._lockScreen(t));
		}
		"mediaSession" in navigator && (navigator.mediaSession.playbackState = e.playing ? "playing" : "paused"), this._changed();
	}
	_advance(e) {
		if (this._station) return this._lost("The station's stream ended. Press play to start it again.");
		let t = lt(this._line, e);
		Promise.resolve().then(() => this._go(t)).catch((e) => this._cant(Et(e))).finally(() => (this._save(), this._changed()));
	}
	_cant(e) {
		let t = this._current();
		if (!t || this._failed === this._serial) return;
		if (this._retried !== this._serial && !t.uri.startsWith("spotify:") && this._told.position > 0) {
			this._retried = this._serial + 1, this._start(t, t.live ? 0 : this._position()).catch((e) => this._cant(Et(e)));
			return;
		}
		this._failed = this._serial;
		let n = t.title ? `“${t.title}”` : "This song";
		if (this._trouble = `${n} couldn't be played: ${e.replace(/\.$/, "")}.`, t.live || ++this._fails >= xt) return t.live || (this._trouble += ` Stopped, as ${xt} songs in a row couldn't be played.`), this._sound.stop(), this._told = {
			...this._told,
			playing: !1,
			at: Date.now()
		}, this._changed();
		this._advance(!1);
	}
	_lost(e) {
		[this._trouble, this._note] = [e, ""], this._told = {
			...this._told,
			position: this._position(),
			playing: !1,
			at: Date.now()
		}, this._changed();
	}
	_lockScreen(e) {
		if (!("mediaSession" in navigator)) return;
		let t = navigator.mediaSession, n = e.picture ? [{ src: new URL(e.picture, location.href).href }] : [];
		if (t.metadata = new MediaMetadata({
			title: e.title,
			artist: e.artist,
			album: e.live ? "Radio" : e.album,
			artwork: n
		}), this._session) return;
		this._session = !0;
		let r = (e) => (t) => void this.do(this._hass, e, { value: t.seekTime }).catch((e) => this._lost(Et(e)));
		for (let [e, n] of [
			["play", "play"],
			["pause", "pause"],
			["nexttrack", "next"],
			["previoustrack", "previous"],
			["seekto", "seek"]
		]) try {
			t.setActionHandler(e, r(n));
		} catch {}
	}
	async _spotifyToken() {
		let e = Date.now() / 1e3;
		if (this._token && this._token.until > e + 60) return this._token.token;
		let { token: t, expires: n } = await this._send({ type: `${yt}/phone/token` });
		return this._token = {
			token: t,
			until: n
		}, t;
	}
}(), N = "casa_mia_jukebox", Dt = new URL(import.meta.url).searchParams.get("v") || "dev", Ot = `${N}/cards`, P = (e) => e?.curates ?? e?.me === "host", kt = (e, t) => !!t.party && e.me !== "host" && !(e.me === "screen" && t.party.open), At = 6e5;
function jt(e, t) {
	let n = e.love;
	if (!n || !n.now && t - Date.parse(n.at) > At) return;
	let r = n.did || "Changing this player", i = n.because ? `${r}, because ${n.because}.` : `${r}. ${n.why}.`;
	return {
		text: n.next ? `${i} ${n.next}.` : i,
		over: !n.now
	};
}
function Mt(e, t) {
	let n, r = () => n && t(M.within(n)), i = e.subscribeMessage((e) => (n = e, r()), { type: `${N}/house` });
	i.catch((e) => t(void 0, e?.code === "unknown_command" ? "Jukebox isn't set up in Home Assistant" : e?.message ?? String(e)));
	let a = M.listen(r);
	return () => (a(), void i.then((e) => e()).catch(() => void 0));
}
function F(e, t, n, r = {}) {
	n === "this_device" && M.wake(e);
	let i = n === "this_device" ? M.speaker() : n;
	return i ? e.connection.sendMessagePromise({
		type: `${N}/${t}`,
		entity_id: i,
		...r
	}) : Promise.reject(/* @__PURE__ */ Error("No Sonos speaker is answering, and the music is listed by one"));
}
var Nt = (e) => (M.seen(e), e);
function I(e, t, n, r = {}) {
	return n === "this_device" && !t.startsWith("playlist_") ? M.do(e, t, r) : F(e, "do", n, {
		action: t,
		...r
	});
}
function Pt(e, t) {
	return F(e, "favourites", t).then(Nt);
}
function Ft(e, t, n) {
	return t === "this_device" && !n ? (M.wake(e), M.queue()) : F(e, "queue", t, n ? { playlist: n } : {});
}
function It(e, t, n) {
	return F(e, "search", t, { query: n }).then((e) => (e.sources.forEach((e) => Nt(e.items)), e));
}
function Lt(e, t, n) {
	return F(e, "browse", t, n ? {
		media_content_type: n.media_content_type,
		media_content_id: n.media_content_id
	} : {}).then((e) => (Nt(e.items), e));
}
function Rt(e, t) {
	return e.connection.sendMessagePromise({
		type: `${N}/order`,
		rooms: t.filter((e) => e !== j)
	});
}
function zt(e, t) {
	let n = e?.casa_mia_jukebox;
	if (n !== void 0) return typeof n?.room != "string" || !n.room ? "this button's action names no room: give casa_mia_jukebox a room, such as media_player.kitchen" : n.tab !== void 0 && !t.includes(n.tab) ? `this button's action asks for "${n.tab}", which isn't one of ${t.join(", ")}` : {
		room: n.room,
		tab: n.tab
	};
}
var L = (e) => e?.message ?? String(e), R = (e, t) => e.groups.find((e) => e.rooms.includes(t)), z = (e, t) => t.rooms.map((t) => e.rooms[t]?.name ?? t).join(" + ");
function B(e, t) {
	let n = t.rooms.map((t) => e.rooms[t]?.volume).filter((e) => typeof e == "number");
	return n.length ? Math.round(n.reduce((e, t) => e + t, 0) / n.length) : 0;
}
var Bt = (e, t) => t.rooms.some((t) => typeof e.rooms[t]?.volume == "number"), Vt = (e, t) => t.rooms.length > 0 && t.rooms.every((t) => e.rooms[t]?.muted);
function Ht(e, t, n) {
	return !n || t.trouble ? "trouble" : t.quiet || t.kind === "nothing" ? "quiet" : t.state === "playing" ? Vt(e, t) ? "muted" : "playing" : "paused";
}
function V(e) {
	let t = {
		tv: "Television",
		line_in: "Line-in",
		nothing: "Nothing playing"
	};
	return e.kind in t ? {
		title: e.title || t[e.kind],
		by: ""
	} : e.kind === "radio" ? {
		title: e.title || e.channel || "Playing, but the speaker gives no title",
		by: e.artist || (e.title && e.title !== e.channel ? e.channel : "")
	} : {
		title: e.title || "Playing, but the speaker gives no title",
		by: e.artist
	};
}
function Ut(e, t) {
	if (typeof e.position != "number" || !e.duration) return null;
	let n = e.state === "playing" && e.position_at ? Math.max(0, (t - Date.parse(e.position_at)) / 1e3) : 0;
	return Math.min(e.duration, Math.floor(e.position + n));
}
var H = (e) => new Date(e).toLocaleTimeString([], {
	hour: "2-digit",
	minute: "2-digit",
	hour12: !1
}), Wt = (e) => `${Math.floor(e / 60)}:${String(Math.floor(e % 60)).padStart(2, "0")}`;
function U(e) {
	let t = 0;
	for (let n of e) t = t * 31 + n.charCodeAt(0) >>> 0;
	let n = t % 360;
	return [`hsl(${n} 72% 56%)`, `hsl(${(n + 70) % 360} 62% 30%)`];
}
var Gt = (e) => e.split(/\s+/).slice(0, 2).map((e) => e[0] ?? "").join("").toUpperCase();
function Kt(e, t) {
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
//#region src/jukebox/pick.ts
var qt = "casa-mia-jukebox-last-playlist";
function Jt(e, t, n, r) {
	let i = n.title || "This song", [a, o, s] = r ? [
		"playlist_copy",
		"Copied",
		` It stays in ${e.title} too.`
	] : [
		"playlist_send",
		"Moved",
		` It is taken out of ${e.title}.`
	];
	return {
		action: a,
		data: (r) => ({
			playlist: e.media_content_id,
			value: t + 1,
			name: n.title.slice(0, 60),
			into: r.media_content_id
		}),
		said: (e) => `${o} to ${e.title}: ${i}`,
		pick: {
			title: `${r ? "Copy" : "Move"} to another playlist`,
			text: `“${i}” goes at the end of the playlist you choose.${s}`,
			except: e.media_content_id
		}
	};
}
function Yt() {
	try {
		return localStorage.getItem(qt);
	} catch {
		return null;
	}
}
function Xt(e) {
	try {
		localStorage.setItem(qt, e.media_content_id);
	} catch {}
}
function Zt(e, t, n) {
	let r = e.filter((e) => e.playlist && e.media_content_id !== n);
	return [...r.filter((e) => e.media_content_id === t), ...r.filter((e) => e.media_content_id !== t)];
}
function Qt(e, t, n) {
	let r = Yt(), i = Array.isArray(e) ? Zt(e, r, t.except) : [], a = e === void 0 ? b`<p>Fetching the playlists you have…</p>` : typeof e == "string" ? b`<p class="lost">The playlists couldn't be fetched: ${e}</p>` : i.length ? S : b`<p class="lost">There is no ${t.except ? "other " : ""}playlist to put it in. Save a queue as a playlist first.</p>`;
	return b`<div class="sheet" role="dialog" aria-label=${t.title}>
    <h4>${t.title}</h4>
    <p>${t.text}</p>
    ${a}
    <div class="acts picks">
      ${i.map((e) => b`<button class=${e.media_content_id === r ? "main" : ""} @click=${() => (Xt(e), t.pick(e))}>${e.title}</button>`)}
    </div>
    <div class="acts"><button class="sep" @click=${n}>Cancel</button></div>
  </div>`;
}
//#endregion
//#region src/jukebox/parts.ts
var $t = {
	play: "M8 5v14l11-7z",
	reset: "M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6 0 2.97-2.17 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93 0-4.42-3.58-8-8-8zm-6 8c0-1.65.67-3.15 1.76-4.24L6.34 7.34C4.9 8.79 4 10.79 4 13c0 4.08 3.05 7.44 7 7.93v-2.02c-2.83-.48-5-2.94-5-5.91z",
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
	muted: "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z",
	warn: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
	check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
	plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
	menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
	back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
	home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
}, W = (e) => b`<svg viewBox="0 0 24 24" aria-hidden="true"><path d=${$t[e]}></path></svg>`, G = (e, t) => /^https?:/.test(t) ? t : e?.hassUrl?.(t) ?? t, K = (e) => e.target.remove();
function q(e, t, n) {
	let [r, i] = U(n);
	return b`<span class="art" style="--a:${r};--b:${i}"><i>${Gt(n)}</i>${t ? b`<img src=${G(e, t)} alt="" loading="lazy" @error=${K} />` : S}</span>`;
}
function en(e, t, n) {
	if (!t.cover) return q(e, t.picture, n);
	let [r, i] = U(n);
	return b`<span class="art" style="--a:${r};--b:${i}"><i>${Gt(n)}</i><img src=${G(e, t.cover)} alt="" @error=${K} />${t.picture ? b`<img class="badge" src=${G(e, t.picture)} alt="" @error=${K} />` : S}</span>`;
}
function tn(e, t, n, r) {
	let [i, a] = U(t);
	return b`<span class="art plate" style="--a:${i};--b:${a}">${r ? b`<img src=${G(e, r)} alt="" @error=${K} />` : S}<span class="sign">${n}</span></span>`;
}
function nn(e, t, n, r) {
	if (!t || t.length < 4) return q(e, t?.[0] ?? n, r);
	let [i, a] = U(r);
	return b`<span class="art four" style="--a:${i};--b:${a}"><i>${Gt(r)}</i>${t.slice(0, 4).map((t) => b`<img src=${G(e, t)} alt="" loading="lazy" @error=${K} />`)}</span>`;
}
var rn = 450, an = 10, on = class {
	start(e, t) {
		this.drop();
		let n = setTimeout(() => {
			let { x: e, y: n } = this.at;
			this.at = void 0, t(e, n);
		}, rn);
		this.at = {
			x: e.clientX,
			y: e.clientY,
			timer: n
		};
	}
	moved(e) {
		this.at && Math.hypot(e.clientX - this.at.x, e.clientY - this.at.y) > an && this.drop();
	}
	drop() {
		clearTimeout(this.at?.timer), this.at = void 0;
	}
}, sn = class {
	constructor(e, t, n) {
		this.host = e, this.key = t, this.first = n, this.drag = (e, t) => {
			let n = e.currentTarget;
			n.setPointerCapture(e.pointerId), e.preventDefault();
			let r = (e) => {
				this.value = t(e), this.host.requestUpdate();
			}, i = () => {
				n.removeEventListener("pointermove", r), n.removeEventListener("pointerup", i), n.removeEventListener("pointercancel", i), this.keep();
			};
			n.addEventListener("pointermove", r), n.addEventListener("pointerup", i), n.addEventListener("pointercancel", i);
		}, this.reset = () => {
			this.value = this.first, this.keep();
		}, this.value = n;
		try {
			let e = Number(localStorage.getItem(t));
			e > 0 && (this.value = e);
		} catch {}
	}
	get moved() {
		return this.value !== this.first;
	}
	keep() {
		try {
			this.moved ? localStorage.setItem(this.key, String(this.value)) : localStorage.removeItem(this.key);
		} catch {}
		this.host.requestUpdate();
	}
	grip(e) {
		return b`<div class="grip" role="separator" aria-orientation="vertical" aria-label="Drag to change the width of the panels" @pointerdown=${(t) => this.drag(t, e)} @dblclick=${this.reset}>
      ${this.moved ? b`<button @pointerdown=${(e) => e.stopPropagation()} @click=${this.reset} aria-label="Put the panels back to the width they came with">${W("reset")}</button>` : S}
    </div>`;
	}
}, cn = o`
  .grip { position: relative; display: grid; place-items: center; width: 14px; cursor: col-resize; touch-action: none; }
  .grip::before { content: ""; width: 4px; height: 56px; border-radius: 2px; background: rgb(255 255 255 / 22%); }
  .grip:hover::before, .grip:active::before { background: rgb(255 255 255 / 60%); }
  .grip button { position: absolute; top: calc(50% + 40px); display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #3a3630; color: #fff; box-shadow: 0 4px 14px rgb(0 0 0 / 50%); z-index: 2; }
  .grip button svg { width: 18px; height: 18px; }
`, ln = class {
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
}, un = "casa-mia-jukebox-slider", dn = 16, fn = 22, pn = class extends E {
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
			let t = this.getBoundingClientRect(), n = this._held ?? this.value, r = t.width - dn, i = t.left + dn / 2 + (this.max ? n / this.max : 0) * r;
			Math.abs(e.clientX - i) > fn || (this.setPointerCapture(e.pointerId), this._drag = {
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
		this._held = e, clearTimeout(this._settle), D(this, t ? "jb-set" : "jb-slide", { value: e }), t && (this._settle = setTimeout(() => this._held = void 0, 1500));
	}
	_keyed(e, t) {
		this._send(Number(e.target.value), t);
	}
	render() {
		let e = this._held ?? this.value;
		return b`<input
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
		this.styles = o`
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
}, mn = "casa-mia-jukebox-marquee", hn = class extends E {
	constructor(...e) {
		super(...e), this.text = "", this._over = 0, this._space = new ResizeObserver(() => this._measure());
	}
	static {
		this.properties = {
			text: {},
			_over: { state: !0 }
		};
	}
	connectedCallback() {
		super.connectedCallback(), this._space.observe(this);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._space.disconnect();
	}
	updated(e) {
		e.has("text") && this._measure();
	}
	_measure() {
		let e = this.renderRoot.querySelector("span");
		e && (this._over = Math.max(0, Math.ceil(e.scrollWidth - this.clientWidth)));
	}
	render() {
		let e = this._over;
		return b`<span class=${e ? "run" : ""} style=${e ? `--over:-${e}px;--time:${(4 + e / 40).toFixed(1)}s` : ""}>${this.text}</span>`;
	}
	static {
		this.styles = o`
    :host { display: block; min-width: 0; overflow: hidden; white-space: nowrap; }
    span { display: inline-block; vertical-align: top; }
    .run { animation: slide var(--time) ease-in-out infinite alternate; }
    @keyframes slide { 0%, 18% { transform: none; } 82%, 100% { transform: translateX(var(--over)); } }
    @media (prefers-reduced-motion: reduce) {
      span { display: block; overflow: hidden; text-overflow: ellipsis; }
      .run { animation: none; }
    }
  `;
	}
}, gn = a(320), Y = o`
  * { box-sizing: border-box; }
  button { margin: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; text-align: inherit; }
  button:disabled { opacity: 0.4; cursor: default; }
  svg { display: block; width: 24px; height: 24px; fill: currentColor; }
  .ib { display: grid; place-items: center; flex: none; width: 42px; height: 42px; border-radius: 50%; }
  .hush casa-mia-jukebox-slider { opacity: 0.4; }
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
  .art img.badge { inset: auto 5% 5% auto; width: 32%; height: 32%; border-radius: 50%; border: 2px solid rgb(255 255 255 / 85%); background: #111; box-shadow: 0 2px 10px rgb(0 0 0 / 55%); box-sizing: border-box; }
  /* A plate's sign is half the picture's width, whatever the picture's size; its own
     picture is shown whole (a logo isn't to be cut), and hides the sign while it is there. */
  .plate .sign { display: grid; }
  .plate img ~ .sign { display: none; }
  .plate img { object-fit: contain; }
  .plate svg, .plate ha-icon { width: 50cqw; height: 50cqw; --mdc-icon-size: 50cqw; }
  .art.four img { inset: auto; width: 50%; height: 50%; }
  .art.four img:nth-of-type(1) { top: 0; left: 0; }
  .art.four img:nth-of-type(2) { top: 0; left: 50%; }
  .art.four img:nth-of-type(3) { top: 50%; left: 0; }
  .art.four img:nth-of-type(4) { top: 50%; left: 50%; }
`, _n = "casa-mia-jukebox-editor", vn = {
	library: "Music library",
	spotify: "Spotify",
	streamed: "A streaming service"
}, yn = [
	[
		"title",
		"By title",
		"title"
	],
	[
		"artist",
		"By artist, then album",
		"artist"
	],
	[
		"album",
		"By album, in the album's own order",
		"album"
	]
];
function bn(e, t, n, r) {
	document.querySelector(_n)?.remove(), document.body.append(Object.assign(document.createElement(_n), {
		hass: e,
		room: t,
		playlist: n,
		done: r
	}));
}
var xn = class extends E {
	constructor(...e) {
		super(...e), this.room = "", this.done = () => {}, this._songs = [], this._stamp = 0, this._toast = "", this._sorting = !1, this._unsort = !1, this._zoom = !1, this._frame = 0, this._busy = new J(this), this._split = new sn(this, "casa-mia-jukebox-split-editor", 50), this._key = (e) => {
			e.key === "Escape" && (e.stopImmediatePropagation(), this._zoom || this._menu || this._sorting || this._confirm || this._putting ? [this._zoom, this._menu, this._sorting, this._confirm, this._putting] = [
				!1,
				void 0,
				!1,
				void 0,
				void 0
			] : this.remove());
		}, this._touch = (e) => {
			this._lift && e.preventDefault();
		}, this._do = (e, t) => this._run(e, t).then((e) => !!e), this._listed = (e) => {
			let { total: t, songs: n } = e.detail, r = this._adding;
			r && this._sel !== void 0 && t > r.total ? (this._sel += t - r.total, this._adding = void 0) : r?.over && (this._adding = void 0), [this._songs, this._total] = [n, t], this._sel !== void 0 && this._sel >= n.length && (this._sel = void 0);
		}, this._edge = () => {
			let e = this._lift, t = this.renderRoot.querySelector(".list .scroll");
			if (!e || !t) return;
			let n = t.getBoundingClientRect(), r = e.x >= n.left && e.x <= n.right ? e.y < n.top + 70 ? -Math.ceil((n.top + 70 - e.y) / 5) : e.y > n.bottom - 70 ? Math.ceil((e.y - n.bottom + 70) / 5) : 0 : 0, i = t.scrollTop;
			r && (t.scrollTop = i + r), t.scrollTop !== i && this._place(), this._frame = requestAnimationFrame(this._edge);
		}, this._lifted = (e) => {
			this._lift = e.detail, this._place(), this._frame = requestAnimationFrame(this._edge);
		}, this._carried = (e) => {
			this._lift && (this._lift = {
				...this._lift,
				...e.detail
			}, this._place());
		}, this._let = (e) => {
			let [t, n, r] = [
				this._lift,
				this._mark,
				this._sel
			];
			cancelAnimationFrame(this._frame), this._lift = this._mark = void 0, e && t && n !== void 0 && this._add(t.item, n + 1, r !== void 0 && n <= r);
		};
	}
	static {
		this.properties = {
			room: {},
			playlist: { attribute: !1 },
			_house: { state: !0 },
			_why: { state: !0 },
			_lift: { state: !0 },
			_mark: { state: !0 },
			_songs: { state: !0 },
			_total: { state: !0 },
			_sel: { state: !0 },
			_stamp: { state: !0 },
			_toast: { state: !0 },
			_menu: { state: !0 },
			_sorting: { state: !0 },
			_confirm: { state: !0 },
			_unsort: { state: !0 },
			_zoom: { state: !0 },
			_putting: { state: !0 },
			_lists: { state: !0 }
		};
	}
	connectedCallback() {
		super.connectedCallback(), this._off = Mt(this.hass.connection, (e, t) => [this._house, this._why] = [e, t]), window.addEventListener("keydown", this._key), this.addEventListener("touchmove", this._touch, { passive: !1 });
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._off?.(), window.removeEventListener("keydown", this._key), this.removeEventListener("touchmove", this._touch), clearTimeout(this._fade), cancelAnimationFrame(this._frame), this.done();
	}
	_say(e) {
		this._toast = e, clearTimeout(this._fade), this._fade = setTimeout(() => this._toast = "", 3500);
	}
	_run(e, t = {}, n = e) {
		return this._busy.during(n, I(this.hass, e, this.room, t)).then((n) => (this._moved(e, t), this._stamp++, n ?? {}), (e) => (this._say(L(e)), void 0));
	}
	_moved(e, t) {
		/sort$/.test(e) || (this._unsort = !1);
		let n = this._sel;
		if (n === void 0) return;
		let [r, i] = [Number(t.value) - 1, Number(t.to) - 1];
		/_(remove|send)$/.test(e) ? this._sel = r === n ? void 0 : r < n ? n - 1 : n : /_move$/.test(e) ? this._sel = r === n ? i : r < n && i >= n ? n - 1 : r > n && i <= n ? n + 1 : n : /sort$|dedupe$|clear$/.test(e) && (this._sel = void 0);
	}
	async _add(e, t, n = !1) {
		this._menu = void 0;
		let r = t ? { to: t } : {}, i = `fav:${e.media_content_id}`, a = n ? {
			total: this._total ?? 0,
			over: !1
		} : void 0;
		this._adding = a;
		let o = this.playlist ? await this._run("playlist_add", {
			playlist: this.playlist.media_content_id,
			media_content_id: e.media_content_id,
			name: e.title.slice(0, 60),
			...r
		}, i) : await this._run("queue_add", {
			media_content_id: e.media_content_id,
			media_content_type: e.media_content_type,
			...r
		}, i);
		a && (a.over = !0), o && this._say(t ? `Added as number ${t}: ${e.title}` : `Added to the end: ${e.title}`);
	}
	_choose(e) {
		this._sel === void 0 ? this._add(e) : this._menu = e;
	}
	_move(e) {
		let t = this._sel;
		e - 1 !== t && this._run(this.playlist ? "playlist_move" : "queue_move", {
			...this._which(),
			value: t + 1,
			to: e
		});
	}
	_send(e, t, n) {
		let r = this.playlist, i = Jt(r, e, t, n), a = async (e) => {
			this._putting = void 0, await this._run(i.action, i.data(e)) && this._say(i.said(e));
		};
		this._lists = void 0, Pt(this.hass, this.room).then((e) => this._lists = e, (e) => this._lists = L(e)), this._putting = {
			...i.pick,
			pick: a
		};
	}
	_which() {
		return this.playlist ? { playlist: this.playlist.media_content_id } : {};
	}
	async _sort(e, t) {
		this._sorting = !1;
		let n = await this._run("playlist_sort", {
			...this._which(),
			by: e
		});
		n && (this._unsort = !!n.moved, this._say(n.moved ? `Sorted by ${t}. Put it back returns the order it had.` : `It is already in order of ${t}.`));
	}
	async _back() {
		await this._run("playlist_unsort", this._which()) && (this._unsort = !1, this._say("Back in the order it had."));
	}
	_dedupe() {
		let e = async () => {
			let e = await this._run("playlist_dedupe", this._which());
			if (!e) return;
			let t = Number(e.removed);
			this._say(t ? `Took out ${t === 1 ? "1 song that was" : `${t} songs that were`} in it more than once.` : "No song is in it more than once.");
		};
		this._confirm = {
			warn: "This takes songs out",
			text: "Every song that is in this playlist more than once is taken out, keeping the first of each. They can't be put back.",
			keep: "Leave it",
			go: "Take them out",
			run: e
		};
	}
	get _list() {
		return this.renderRoot.querySelector("casa-mia-jukebox-queue");
	}
	_place() {
		let [e, t] = [this._lift, this._list], n = this.renderRoot.querySelector(".list .scroll")?.getBoundingClientRect();
		if (!e || !t || !n) return;
		let r = e.x >= n.left && e.x <= n.right && e.y >= n.top && e.y <= n.bottom;
		this._mark = r ? t.at(e.y) : void 0;
	}
	_pane() {
		let [e, t] = [this._sel, this._sel === void 0 ? void 0 : this._songs[this._sel]];
		if (e === void 0 || !t) return b`<p class="pane none">Tap a song to see it here, and to choose where the next thing you add goes.</p>`;
		let n = this._total ?? this._songs.length, r = [
			t.duration ? Wt(t.duration) : "",
			vn[t.source ?? ""] ?? "",
			`Number ${e + 1} of ${n}`
		].filter(Boolean);
		return b`<div class="pane">
      <button class="cover" @click=${() => this._zoom = !0} aria-label="Show the cover larger">${q(this.hass, t.picture, t.title || t.album || "?")}</button>
      <div class="about">
        <h3>${t.title || "A song with no title"}</h3>
        ${t.artist ? b`<p>${t.artist}</p>` : S}
        ${t.album ? b`<p class="album">${t.album}</p>` : S}
        <small>${r.join(" · ")}</small>
        <div class="acts">
          ${this.playlist ? S : b`<button class=${this._busy.on("queue_play")} @click=${() => this._run("queue_play", { value: e + 1 })}>${W("play")}Play from here</button>`}
          <button ?disabled=${e === 0} @click=${() => this._move(1)}>To the top</button>
          <button ?disabled=${e >= n - 1} @click=${() => this._move(n)}>To the end</button>
          <button @click=${() => this._run(this.playlist ? "playlist_remove" : "queue_remove", {
			...this._which(),
			value: e + 1
		})}>${W("close")}Take out</button>
          ${this.playlist ? b`<button class=${this._busy.on("playlist_send")} @click=${() => this._send(e, t, !1)}>Move to another playlist…</button>
                <button class=${this._busy.on("playlist_copy")} @click=${() => this._send(e, t, !0)}>Copy to another playlist…</button>` : S}
          <button @click=${() => this._sel = void 0}>Let go</button>
        </div>
      </div>
    </div>`;
	}
	_sheets() {
		let [e, t, n] = [
			this._confirm,
			this._menu,
			this._sel === void 0 ? void 0 : this._songs[this._sel]
		], r = (e, t) => b`<div class="veil" @click=${(e) => e.target === e.currentTarget && t()}>${e}</div>`;
		if (e) return r(b`<div class="sheet" role="alertdialog" aria-label=${e.warn}>
          <p class="warn">${e.warn}</p>
          <p>${e.text}</p>
          <div class="acts">
            <button class="main" @click=${() => this._confirm = void 0}>${e.keep}</button>
            <button class="danger" @click=${() => (this._confirm = void 0, e.run())}>${e.go}</button>
          </div>
        </div>`, () => this._confirm = void 0);
		if (t && n && this._sel !== void 0) {
			let [e, i] = [this._sel, n.title || "the chosen song"];
			return r(b`<div class="sheet" role="dialog" aria-label="Where to add ${t.title}">
          <h4>${t.title}</h4>
          <p>Where should it go?</p>
          <div class="acts">
            <button class="main" @click=${() => this._add(t, e + 2, !0)}>After “${i}”</button>
            <button @click=${() => this._add(t, e + 1, !0)}>Before “${i}”</button>
            <button @click=${() => this._add(t)}>At the end</button>
            <button class="sep" @click=${() => this._menu = void 0}>Cancel</button>
          </div>
        </div>`, () => this._menu = void 0);
		}
		if (this._putting) {
			let e = () => this._putting = void 0;
			return r(Qt(this._lists, this._putting, e), e);
		}
		return this._sorting ? r(b`<div class="sheet" role="dialog" aria-label="Sort this playlist">
          <h4>Sort this playlist</h4>
          <p>The songs are moved into that order in Sonos. Put it back returns the order it had, until you change the playlist or close this editor.</p>
          <div class="acts">
            ${yn.map(([e, t, n]) => b`<button @click=${() => this._sort(e, n)}>${t}</button>`)}
            <button class="sep" @click=${() => this._sorting = !1}>Cancel</button>
          </div>
        </div>`, () => this._sorting = !1) : this._zoom && n ? r(b`<div class="large">${q(this.hass, n.picture, n.title || n.album || "?")}</div>`, () => this._zoom = !1) : S;
	}
	render() {
		let e = this._house, t = e && R(e, this.room), n = this._lift, r = this.playlist ? this.playlist.title : t && e ? `The queue in ${z(e, t)}` : "The queue", i = this._total === void 0 ? "" : this._total === 1 ? "1 song" : `${this._total} songs`, a = (this._total ?? 0) - this._songs.length, o = this.playlist && P(e), s = this._split.value;
		return b`<div class="page ${n ? "carrying" : ""}">
      <header>
        <button class="ib" @click=${() => this.remove()} aria-label="Close the editor">${W("back")}</button>
        <h1>${r}<small>Tap a song on the left to choose it. Press + beside something on the right to add it, or rest a finger on it until it lifts and drag it to its place.</small></h1>
      </header>
      ${t ? b`<div class="cols" style="grid-template-columns:minmax(0,${s}fr) auto minmax(0,${100 - s}fr)">
            <section class="list">
              <h2>${this.playlist ? "In this playlist" : "In the queue"}<small>${i}${a > 0 ? `, the first ${this._songs.length} shown` : ""}</small></h2>
              ${this._pane()}
              ${o ? b`<div class="tools">
                    <button class=${this._busy.on("playlist_sort")} @click=${() => this._sorting = !0}>Sort…</button>
                    <button class=${this._busy.on("playlist_dedupe")} @click=${() => this._dedupe()}>Duplicates…</button>
                    ${this._unsort ? b`<button class="go ${this._busy.on("playlist_unsort")}" @click=${() => this._back()}>${W("reset")}Put it back</button>` : S}
                  </div>` : S}
              <div class="scroll"><casa-mia-jukebox-queue picks .hass=${this.hass} .group=${t} .playlist=${this.playlist?.media_content_id} .do=${this._do} .stamp=${this._stamp} .mark=${this._mark} .selected=${this._sel} @jb-listed=${this._listed} @jb-pick=${(e) => this._sel = this._sel === e.detail ? void 0 : e.detail}></casa-mia-jukebox-queue></div>
            </section>
            ${this._split.grip((e) => {
			let t = this.renderRoot.querySelector(".cols").getBoundingClientRect();
			return Math.round(Math.max(25, Math.min(75, 100 * (e.clientX - t.left) / t.width)));
		})}
            <section class="find">
              <h2>Search and browse</h2>
              <div class="scroll">
                <casa-mia-jukebox-find carry .hass=${this.hass} .room=${t.id} .waiting=${(e) => this._busy.on(e)} .changes=${this._busy.changes} @jb-choose=${(e) => this._choose(e.detail)} @jb-lift=${this._lifted} @jb-carry=${this._carried} @jb-drop=${() => this._let(!0)} @jb-cancel=${() => this._let(!1)}></casa-mia-jukebox-find>
              </div>
            </section>
          </div>` : b`<p class="none">${this._why ?? (e ? "That room isn't answering." : "Asking Home Assistant what is playing…")}</p>`}
      ${n ? b`<div class="ghost" style="transform:translate(${n.x + 14}px,${n.y - 28}px)">${q(this.hass, n.item.picture, n.item.title)}<b>${n.item.title}</b></div>` : S}
      ${this._sheets()}
      ${this._toast ? b`<div class="toast" role="status">${this._toast}</div>` : S}
    </div>`;
	}
	static {
		this.styles = [
			Y,
			cn,
			o`
      :host { position: fixed; inset: 0; z-index: 1001; font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); color: #fff; --line: rgb(255 255 255 / 14%); --muted: rgb(255 255 255 / 60%); }
      .page { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; padding: max(14px, env(safe-area-inset-top)) 16px 16px; box-sizing: border-box; background: #171512; }
      .page.carrying { cursor: grabbing; }
      header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
      h1 { display: grid; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; min-width: 0; }
      h1 small { font-size: 13px; font-weight: 400; color: var(--muted); letter-spacing: 0; }
      .cols { display: grid; gap: 2px; min-height: 0; }
      section { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; border-radius: 22px; background: #26231f; }
      section.list { grid-template-rows: auto auto auto minmax(0, 1fr); }
      h2 { display: flex; align-items: baseline; gap: 10px; margin: 0; padding: 14px 18px 10px; font-size: 15px; }
      h2 small { font-weight: 400; color: var(--muted); }
      .scroll { overflow: auto; overscroll-behavior: contain; padding: 0 6px 10px; }
      .carrying .list { outline: 2px dashed rgb(255 255 255 / 35%); outline-offset: -2px; }
      .none { color: var(--muted); }
      /* The chosen song, whole. Its names wrap: here nothing is cut short. */
      .pane { display: grid; grid-template-columns: clamp(110px, 22vh, 200px) minmax(0, 1fr); gap: 16px; margin: 0 12px 10px; padding: 12px; border-radius: 16px; background: rgb(255 255 255 / 6%); }
      .pane.none { display: block; margin: 0 12px 10px; }
      .pane .cover { align-self: start; border-radius: 12px; cursor: zoom-in; }
      .about { display: grid; align-content: start; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
      .about h3 { margin: 0; font-size: 18px; line-height: 1.2; }
      .about p { margin: 0; }
      .about .album, .about small { color: var(--muted); }
      .about .acts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .about .acts button, .tools button { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 12px; background: rgb(255 255 255 / 10%); font-size: 13px; font-weight: 600; }
      .about .acts button:disabled { opacity: 0.35; }
      .about .acts svg, .tools svg { width: 16px; height: 16px; flex: none; }
      .tools { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 10px; }
      .tools .go { background: #fff; color: #111; }
      .ghost { position: fixed; left: 0; top: 0; z-index: 5; display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: center; gap: 10px; max-width: 300px; padding: 8px 14px 8px 8px; border-radius: 14px; background: #3a3630; box-shadow: 0 16px 40px rgb(0 0 0 / 60%); pointer-events: none; }
      .ghost .art { border-radius: 8px; }
      .ghost b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .veil { position: fixed; inset: 0; z-index: 7; display: grid; place-items: center; padding: 16px; background: rgb(0 0 0 / 60%); }
      .sheet { width: min(100%, 440px); padding: 18px; border-radius: 22px; background: #26231f; box-shadow: 0 20px 60px rgb(0 0 0 / 60%); }
      .sheet h4 { margin: 0 0 2px; font-size: 16px; overflow-wrap: anywhere; }
      .sheet p { margin: 0 0 14px; color: rgb(255 255 255 / 70%); overflow-wrap: anywhere; }
      .sheet .warn { margin: 0 0 10px; color: #ff6b5e; font-size: 30px; font-weight: 900; line-height: 1.05; text-transform: uppercase; }
      .sheet .acts { display: grid; gap: 8px; }
      .sheet .acts button { padding: 14px; border-radius: 14px; background: rgb(255 255 255 / 10%); font-size: 15px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }
      .sheet .acts .main { background: #fff; color: #111; }
      .sheet .acts .danger { background: none; border: 1px solid #ff6b5e; color: #ff6b5e; }
      .sheet .acts .sep { margin-top: 10px; }
      .sheet .picks { max-height: 32vh; overflow: auto; }
      .sheet .lost { color: #ff9a8f; }
      .large { width: min(84vw, 84vh); }
      .large .art { border-radius: 18px; box-shadow: 0 20px 60px rgb(0 0 0 / 60%); }
      .toast { position: fixed; left: 50%; bottom: 26px; z-index: 8; transform: translateX(-50%); max-width: min(90vw, 520px); padding: 12px 18px; border-radius: 14px; background: #fff; color: #111; font-weight: 600; overflow-wrap: anywhere; }
    `
		];
	}
}, Sn = "casa-mia-jukebox-big", Cn = [
	["queue", "Queue"],
	["rooms", "Rooms"],
	["favourites", "Favourites"],
	["search", "Search"]
], wn = {
	off: "all",
	all: "one",
	one: "off"
}, Tn = "casa-mia-jukebox-folded";
function En() {
	try {
		let e = JSON.parse(localStorage.getItem(Tn) ?? "[]");
		return Array.isArray(e) ? e.filter((e) => typeof e == "string") : [];
	} catch {
		return [];
	}
}
function X(e, t, n) {
	document.querySelector(Sn)?.remove(), document.body.append(Object.assign(document.createElement(Sn), {
		hass: e,
		room: t,
		tab: n
	}));
}
var Dn = class extends E {
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
			_viewing: { state: !0 },
			_adding: { state: !0 },
			_folded: { state: !0 },
			_toast: { state: !0 },
			_vol: { state: !0 },
			_putting: { state: !0 },
			_tapped: { state: !0 }
		};
	}
	constructor() {
		super(), this.room = "", this._fresh = 0, this._split = new sn(this, "casa-mia-jukebox-split-big", 460), this._settling = !1, this._folded = En(), this._naming = !1, this._dirty = !1, this.inline = !1, this._stamp = 0, this._partying = !1, this._toast = "", this._sliders = /* @__PURE__ */ new Map(), this._busy = new J(this), this._key = (e) => {
			e.key === "Escape" && !this.inline && !document.querySelector("casa-mia-jukebox-editor") && this.remove();
		}, this._ask = (e, t) => this._do(e, t), this._save = async (e) => {
			e.preventDefault();
			let t = String(new FormData(e.target).get("name") ?? "").trim();
			if (!t) return;
			let n = this._playlists().find((e) => e.title.toLowerCase() === t.toLowerCase());
			if (n) return void this._over(n);
			this._naming = !1, await this._do("queue_save", { name: t }) && (this._say(`Saved as a playlist: ${t}`), this._favourites = void 0);
		}, this._waiting = (e) => this._busy.on(e), new ln(this);
	}
	connectedCallback() {
		super.connectedCallback(), this._off = Mt(this.hass.connection, (e, t) => [this._house, this._why] = [e, t]), window.addEventListener("keydown", this._key);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._off?.(), window.removeEventListener("keydown", this._key), clearTimeout(this._fade);
	}
	willUpdate(e) {
		if (e.has("_house") && this._settling && ([this._vol, this._settling] = [void 0, !1]), e.has("_house") && this._house) {
			let e = R(this._house, this.room)?.party?.undone[0];
			e && this._said !== void 0 && e.at !== this._said && this._say(e.failed ? e.what : `Put back: ${e.what.replace(/^Someone/, "someone")}`), this._said = e?.at ?? "";
		}
		this._dirty && !this._viewing && ([this._dirty, this._favourites] = [!1, void 0]), (e.has("tab") || e.has("_favourites") || e.has("_naming") || e.has("_putting")) && (this.tab === "favourites" || this._naming || this._putting) && this._favourites === void 0 && Pt(this.hass, this.room).then((e) => this._favourites = e, (e) => this._favourites = L(e));
	}
	_shut() {
		return this.inline ? b`<span class="ib"></span>` : b`<button class="ib" @click=${() => this.remove()} aria-label="Close the player">${W("down")}</button>`;
	}
	_say(e) {
		this._toast = e, clearTimeout(this._fade), this._fade = setTimeout(() => this._toast = "", 3500);
	}
	_do(e, t = {}, n = e) {
		return this._busy.during(n, I(this.hass, e, this.room, t)).then(() => (/^(queue_|play_media|stop)/.test(e) && this._stamp++, /^playlist_/.test(e) && (this._dirty = !0), !0), (e) => (this._say(L(e)), !1));
	}
	_slide(e, t) {
		let n = `${e} ${t}`;
		return this._sliders.has(n) || this._sliders.set(n, Kt((n) => I(this.hass, e, t, { value: n }), (e) => this._say(L(e)))), (e) => this._sliders.get(n)(e.detail.value);
	}
	_slid(e, t, n) {
		[this._vol, this._settling] = [t.detail.value, n], this._slide("group_volume", e.id)(t);
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
		}, `fav:${e.media_content_id}`) && (this._say(`${{
			next: "Playing next",
			add: "Added to the end"
		}[t ?? ""] ?? "Playing"}: ${e.title}`), this._adding === "queue" && ([this._adding, this.tab] = [void 0, "queue"]));
	}
	_fold(e) {
		this._folded = this._folded.includes(e) ? this._folded.filter((t) => t !== e) : [...this._folded, e];
		try {
			localStorage.setItem(Tn, JSON.stringify(this._folded));
		} catch {}
	}
	_add(e) {
		[this._adding, this.tab] = [e, "search"], this._fresh++;
	}
	async _addToPlaylist(e, t) {
		await this._do("playlist_add", {
			playlist: e.media_content_id,
			media_content_id: t.media_content_id,
			name: t.title.slice(0, 60)
		}, `fav:${t.media_content_id}`) && (this._say(`Added to ${e.title}: ${t.title}`), [this._adding, this.tab] = [void 0, "favourites"], this._stamp++);
	}
	_choose(e, t) {
		this._adding === "playlist" && this._viewing ? this._addToPlaylist(this._viewing, t) : t.live || e.kind === "nothing" && !t.playlist ? this._play(t) : this._menu = t;
	}
	_tabs(e) {
		let t = this.tab ?? "rooms";
		return b`<div class="tabs">
      ${Cn.map(([n, r]) => b`<button class=${this.tab === n ? "up" : t === n ? "shown" : ""} @click=${() => [this._adding, this._viewing, this.tab] = [
			void 0,
			void 0,
			this.tab === n ? void 0 : n
		]}>
          ${W(n)}${r}${n === "rooms" && e.rooms.length > 1 ? b` (${e.rooms.length})` : S}
        </button>`)}
    </div>`;
	}
	_now(e, t) {
		let { title: n, by: r } = V(t), i = Ut(t, Date.now()), a = t.state === "playing", o = Vt(e, t), s = t.kind === "queue", c = e.me === "host", l = jt(t, Date.now());
		return b`<div class="now">
      <div class="bar">
        ${this._shut()}
        <div class="where"><small>Playing in</small><b>${z(e, t)}</b></div>
        ${(t.party || c) && t.id !== "this_device" ? b`<button class="pill ${t.party ? "on" : ""} ${this._busy.on("party")}" @click=${() => t.party ? this._partying = !0 : this._party(!0)} aria-label=${t.party ? "The party lock is on" : "Turn the party lock on"}>
              ${W("lock")}${t.party ? `Party on${c && t.party.undone.length ? ` · ${t.party.undone.length}` : ""}` : "Party"}
            </button>` : S}
      </div>
      ${kt(e, t) ? b`<p class="barred">A party is on: the music can't be changed from this screen.</p>` : S}
      ${t.trouble ? b`<p class="barred" role="status">${t.trouble}</p>` : S}
      <div class="cover">${en(this.hass, t, n)}</div>
      <div class="title">
        <b>${n}</b><span>${r}</span>
        <!-- Love it or Loathe it's own thumbs, where it is installed: its bundle defines the
             element, and it shows nothing where this login can't rate. -->
        ${t.id === "this_device" ? S : b`<casa-mia-thumbs quiet .hass=${this.hass} .entityId=${t.id}></casa-mia-thumbs>`}
        ${t.kind === "radio" && P(e) && t.id !== "this_device" ? b`<button class="pill keep ${t.found ? "" : "off"} ${this._busy.on("keep")}" @click=${() => this._keep(t)}>${W("plus")}Add to a playlist</button>` : S}
        ${l ? b`<p class="love ${l.over ? "over" : ""}"><strong>Love it or Loathe it${l.over ? `, at ${H(t.love.at)}` : ""}:</strong> ${l.text}</p>` : S}
      </div>
      ${i !== null && t.duration ? b`<div class="seek">
            <span>${Wt(i)}</span>
            <casa-mia-jukebox-slider .value=${i} .max=${t.duration} label="Place in the song" @jb-set=${(e) => this._do("seek", { value: e.detail.value })}></casa-mia-jukebox-slider>
            <span>${Wt(t.duration)}</span>
          </div>` : t.kind === "radio" ? b`<div class="live">LIVE${t.channel ? ` · ${t.channel.toUpperCase()}` : ""}</div>` : S}
      <div class="tp">
        ${s ? b`<button class="ib sm ${t.shuffle ? "on" : ""} ${this._busy.on("shuffle")}" @click=${() => this._do("shuffle", { on: !t.shuffle })} aria-label="Shuffle">${W("shuffle")}</button>` : S}
        ${s ? b`<button class="ib ${this._busy.on("previous")}" @click=${() => this._do("previous")} aria-label="Previous song">${W("previous")}</button>` : S}
        <button class="ib play ${this._busy.on("play")}" ?disabled=${t.kind === "nothing"} @click=${() => this._do(a ? "pause" : "play", {}, "play")} aria-label=${a ? "Pause" : "Play"}>${W(a ? "pause" : "play")}</button>
        ${s ? b`<button class="ib ${this._busy.on("next")}" @click=${() => this._do("next")} aria-label="Next song">${W("next")}</button>` : S}
        ${s ? b`<button class="ib sm ${t.repeat === "off" ? "" : "on"} ${this._busy.on("repeat")}" @click=${() => this._do("repeat", { mode: wn[t.repeat] })} aria-label="Repeat">
              ${W("repeat")}${t.repeat === "one" ? b`<sup>1</sup>` : S}
            </button>` : S}
      </div>
      <div class="gvol ${o ? "hush" : ""}">
        ${Bt(e, t) ? b`<button class="ib ${this._busy.on("group_mute")}" @click=${() => this._do("group_mute", { on: !o })} aria-label=${o ? "Unmute" : "Mute"} aria-pressed=${o}>${W(o ? "muted" : "volume")}</button>
              <casa-mia-jukebox-slider .value=${B(e, t)} label="Volume" @jb-slide=${(e) => this._slid(t, e, !1)} @jb-set=${(e) => this._slid(t, e, !0)}></casa-mia-jukebox-slider>
              <output aria-hidden="true">${this._vol ?? B(e, t)}%</output>` : b`<span class="own">Its own volume buttons set how loud it is</span>`}
        <button class="ib ${this._busy.on("stop")}" @click=${() => this._stop(e, t)} aria-label="Stop the music here and clear the player">${W("stop")}</button>
      </div>
      ${this._tabs(t)}
    </div>`;
	}
	_head(e, t) {
		return b`<div class="head">
      <b>${e}<small>${t}</small></b>
      <button class="ib shut" @click=${() => this.tab = void 0} aria-label="Close">${W("close")}</button>
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
			text: `${this._songs(t)} will go, and ${z(e, t)} will be listed with the quiet rooms again.`,
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
	_playlists() {
		return Array.isArray(this._favourites) ? this._favourites.filter((e) => e.playlist) : [];
	}
	async _over(e) {
		this._naming = !1;
		let t = (e) => e === 1 ? "1 song" : `${e} songs`, n = await Ft(this.hass, this.room, e.media_content_id).then((e) => e.total, () => void 0), r = async () => await this._do("queue_save", { playlist: e.media_content_id }) && this._say(`Saved over the playlist: ${e.title}`), i = n === void 0 ? "" : ` holds ${t(n)} now. It`, a = this._queued ? t(this._queued) : "songs";
		this._confirm = {
			warn: "This replaces the playlist",
			text: `"${e.title}"${i} will hold the queue's ${a} instead, and what it held can't be got back.`,
			keep: "Keep the playlist",
			go: "Replace it",
			run: r
		};
	}
	_overs(e) {
		if (this._favourites === void 0) return b`<p class="or">Fetching the playlists you have…</p>`;
		let t = (t) => t.media_content_id === e.source, n = this._playlists().sort((e, n) => Number(t(n)) - Number(t(e)));
		return n.length ? b`<p class="or">Or save it over a playlist you have:</p>
      <div class="acts over">${n.map((e) => b`<button type="button" @click=${() => this._over(e)}>${t(e) ? b`Save back to <strong>${e.title}</strong>` : e.title}</button>`)}</div>` : S;
	}
	_edit(e) {
		bn(this.hass, this.room, e, () => (this._dirty ||= !!e, this._stamp++));
	}
	_keep(e) {
		let t = e.found;
		if (!t) return this._say(`This song can't be added to a playlist. ${e.unfound ?? "It hasn't been found on Spotify"}.`);
		let n = async (e) => {
			this._putting = void 0;
			let n = {
				playlist: e.media_content_id,
				media_content_id: t.uri,
				name: t.title.slice(0, 60)
			};
			await this._do("playlist_add", n, "keep") && this._say(`Added to ${e.title}: ${t.title}`);
		};
		this._putting = {
			title: "Add to a playlist",
			text: `“${t.title}” by ${t.by}, from Spotify, goes at the end of the playlist you choose.`,
			pick: n
		};
	}
	_send(e, t, n, r) {
		this._tapped = void 0;
		let i = Jt(e, t, n, r), a = async (e) => {
			this._putting = void 0, await this._do(i.action, i.data(e), `row:${t}`) && (this._say(i.said(e)), this._stamp++);
		};
		this._putting = {
			...i.pick,
			pick: a
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
		let t = this._adding === "playlist" && this._viewing;
		return b`${t ? this._head(`Add to ${t.title}`, "Press + beside a song or an album to add it to the end of the playlist.") : this._adding === "queue" ? this._head("Add to the queue", "Press + beside what you find to play it next or add it to the end.") : this._head("Search", "The music library and Spotify. Press + to play something or add it to the queue.")}
      <div class="scroll">
        <casa-mia-jukebox-find .hass=${this.hass} .room=${e.id} .fresh=${this._fresh} .waiting=${this._waiting} .changes=${this._busy.changes} @jb-choose=${(t) => this._choose(e, t.detail)}></casa-mia-jukebox-find>
      </div>`;
	}
	_queue(e) {
		let t = this._queued === 0;
		return b`${this._head("Queue", "Tap a song to play it. Drag one by its handle to move it.")}
      ${e.kind !== "queue" && !t ? b`<div class="tools"><button class="go ${this._busy.on("queue_play")}" @click=${() => this._do("queue_play", { value: 1 })}>${W("play")}Play the queue${e.kind === "radio" ? " in place of the radio" : ""}</button></div>` : S}
      <div class="tools">
        <button @click=${() => this._add("queue")}>${W("plus")}Add</button>
        <button class="wide" @click=${() => this._edit()} aria-label="Edit the queue side by side with Search">${W("drag")}Edit…</button>
        ${P(this._house) && e.id !== "this_device" ? b`<button class=${this._busy.on("queue_save")} ?disabled=${t} @click=${() => this._naming = !0} aria-label="Save the queue as a playlist">${W("save")}Save…</button>` : S}
        <button class=${this._busy.on("queue_clear")} ?disabled=${t} @click=${() => this._clear(e)} aria-label="Clear the queue">${W("trash")}Clear…</button>
      </div>
      <div class="scroll"><casa-mia-jukebox-queue .hass=${this.hass} .group=${e} .do=${this._ask} .stamp=${this._stamp} @jb-queued=${(e) => this._queued = e.detail}></casa-mia-jukebox-queue></div>`;
	}
	_rooms(e, t) {
		let n = Object.keys(e.rooms).filter((e) => !t.rooms.includes(e) && e !== "this_device" && t.id !== "this_device").sort((t, n) => e.rooms[t].name.localeCompare(e.rooms[n].name)), r = (n) => {
			let r = e.rooms[n], i = t.rooms.includes(n), a = R(e, n), o = r.available ? i ? "Playing this" : a && !a.quiet ? `Playing ${V(a).title}: tap to bring it here` : "Quiet: tap to add it" : "Not answering", s = `mute:${n}`;
			return b`<div class="room ${i ? "in" : ""} ${r.muted ? "hush" : ""}">
        <button class="tick ${this._busy.on(`room:${n}`)}" ?disabled=${!r.available} @click=${() => this._toggleRoom(t, n)} aria-label=${i ? `Take ${r.name} out` : `Add ${r.name}`}>${W(i ? "check" : "plus")}</button>
        <button class="t" ?disabled=${!r.available} @click=${() => this._toggleRoom(t, n)}><b>${r.name}</b><small>${o}</small></button>
        ${i && r.volume !== null ? b`<button class="ib mute ${this._busy.on(s)}" @click=${() => this._busy.during(s, I(this.hass, "mute", n, { on: !r.muted })).catch((e) => this._say(L(e)))} aria-label=${r.muted ? `Unmute ${r.name}` : `Mute ${r.name}`} aria-pressed=${r.muted}>${W(r.muted ? "muted" : "volume")}</button><casa-mia-jukebox-slider .value=${r.volume} label="${r.name} volume" @jb-slide=${this._slide("volume", n)} @jb-set=${this._slide("volume", n)}></casa-mia-jukebox-slider><output>${r.volume}</output>` : S}
      </div>`;
		};
		return b`${this._head("Rooms", t.id === "this_device" ? "This device plays by itself, through its own speaker or whatever it is connected to." : "Tap a room to add it or take it out. Each has its own volume.")}
      <div class="scroll">${[...t.rooms, ...n].map(r)}</div>`;
	}
	_favouritesPanel(e) {
		let t = this._favourites, n = Array.isArray(t) ? [...new Set(t.map((e) => e.folder))] : [], r = (t) => b`<button class=${this._busy.on(`fav:${t.media_content_id}`)} @click=${() => this._choose(e, t)}>${nn(this.hass, t.pictures, t.picture, t.title)}<b>${t.title}</b></button>`, i = this._viewing;
		if (i) {
			let t = P(this._house);
			return b`${this._head(i.title, t ? "Drag a song by its handle to move it, or take it out with the cross. Tap one to move or copy it to another playlist." : "The songs in this playlist.")}
        <div class="tools">
          <button @click=${() => this._viewing = void 0}>${W("back")}Favourites</button>
          <button @click=${() => this._menu = i}>${W("play")}Play…</button>
          ${t ? b`<button @click=${() => this._add("playlist")}>${W("plus")}Add</button><button class="wide" @click=${() => this._edit(i)} aria-label="Edit the playlist side by side with Search">${W("drag")}Edit…</button>` : S}
        </div>
        <div class="scroll"><casa-mia-jukebox-queue .hass=${this.hass} .group=${e} .playlist=${i.media_content_id} .locked=${!t} .do=${this._ask} .stamp=${this._stamp} @jb-song=${(e) => this._tapped = e.detail}></casa-mia-jukebox-queue></div>`;
		}
		return b`${this._head("Favourites", "The stations, playlists and songs saved in Sonos")}
      <div class="scroll">
        ${t === void 0 ? b`<p class="empty">Fetching them from the speaker…</p>` : typeof t == "string" ? b`<p class="empty">The favourites couldn't be fetched: ${t}</p>` : t.length ? n.map((e) => {
			let n = t.filter((t) => t.folder === e), i = this._folded.includes(e);
			return b`<h3><button class="fold" aria-expanded=${!i} @click=${() => this._fold(e)}>${W(i ? "chevron" : "down")}${e} (${n.length})</button></h3>
                    ${i ? S : b`<div class="tiles">${n.map(r)}</div>`}`;
		}) : b`<p class="empty">There are no favourites saved in Sonos yet.</p>`}
      </div>`;
	}
	_sheets(e, t) {
		let { _menu: n, _confirm: r } = this;
		if (r) return b`<div class="veil">
        <div class="sheet" role="alertdialog" aria-label=${r.warn}>
          <p class="warn">${r.warn}</p>
          <p>${r.text}</p>
          <div class="acts">
            <button class="main" @click=${() => this._confirm = void 0}>${r.keep}</button>
            <button class="danger" @click=${() => (this._confirm = void 0, r.run())}>${r.go}</button>
          </div>
        </div>
      </div>`;
		if (this._putting) {
			let e = () => this._putting = void 0;
			return b`<div class="veil" @click=${(t) => t.target === t.currentTarget && e()}>${Qt(this._favourites, this._putting, e)}</div>`;
		}
		let [i, a] = [this._tapped, this._viewing];
		if (i && a) {
			let e = () => this._tapped = void 0;
			return b`<div class="veil" @click=${(t) => t.target === t.currentTarget && e()}>
        <div class="sheet" role="dialog" aria-label=${i.song.title || "A song"}>
          <h4>${i.song.title || "A song with no title"}</h4>
          <p>${[i.song.artist, i.song.album].filter(Boolean).join(" · ")}</p>
          <div class="acts">
            <button class="main" @click=${() => this._send(a, i.at, i.song, !1)}>Move to another playlist…</button>
            <button @click=${() => this._send(a, i.at, i.song, !0)}>Copy to another playlist…</button>
            <button class="sep" @click=${e}>Cancel</button>
          </div>
        </div>
      </div>`;
		}
		if (this._partying && t.party) {
			let n = t.party;
			return b`<div class="veil" @click=${(e) => e.target === e.currentTarget && (this._partying = !1)}>
        <div class="sheet" role="dialog" aria-label="The party lock">
          <h4>The party is on, since ${H(n.since)}</h4>
          <p>The queue, the rooms and their volumes can only be changed from Jukebox. Anything changed another way, such as from the Sonos app, is put back.</p>
          ${n.unwatched ? b`<p class="lost">A song moved in another app isn't being noticed, since ${H(n.unwatched)}: the speaker isn't reporting its queue. Songs added or taken out are still put back.</p>` : S}
          ${n.undone.length ? b`<ul class="undone">${n.undone.map((e) => b`<li class=${e.failed ? "failed" : ""}><time>${H(e.at)}</time>${e.failed ? e.what : `Put back: ${e.what.replace(/^Someone/, "someone")}`}</li>`)}</ul>` : b`<p>Nothing has had to be put back.</p>`}
          ${e.me === "host" ? b`<button class="switch ${this._busy.on("party_open")}" role="switch" aria-checked=${n.open} @click=${() => this._do("party_open", { on: !n.open })}>
                  <span><b>Let the wall tablets change the music</b><small>${n.open ? "They can, until you turn this off or the party ends." : "Only the people who run the party can."}</small></span><i></i>
                </button>
                <div class="acts">
                  <button class="main" @click=${() => this._partying = !1}>Keep the party going</button>
                  <button class="danger" @click=${() => this._party(!1)}>End the party</button>
                </div>` : b`<p>${kt(e, t) ? "The music can't be changed from this screen." : "This screen has been let to change the music."} Only the people who run the party can end it.</p>
                <div class="acts"><button class="main" @click=${() => this._partying = !1}>Close</button></div>`}
        </div>
      </div>`;
		}
		if (this._naming) return b`<div class="veil" @click=${(e) => e.target === e.currentTarget && (this._naming = !1)}>
        <form class="sheet" aria-label="Save the queue as a playlist" @submit=${this._save}>
          <h4>Save the queue as a playlist</h4>
          <p>It is kept in Sonos, and is listed with the favourites.</p>
          <input name="name" maxlength="60" required autocomplete="off" placeholder="A name for the playlist" aria-label="A name for the playlist" />
          <div class="acts">
            <button class="main" type="submit">Save</button>
            <button type="button" @click=${() => this._naming = !1}>Cancel</button>
          </div>
          ${this._overs(t)}
        </form>
      </div>`;
		if (n) {
			let r = {
				warn: "This replaces the whole queue",
				text: `${this._songs(t)} will go, and "${n.title}" will start now.`,
				keep: "Keep the queue",
				go: "Replace it",
				run: () => void this._play(n, "replace")
			};
			return b`<div class="veil" @click=${(e) => e.target === e.currentTarget && (this._menu = void 0)}>
        <div class="sheet" role="dialog" aria-label=${n.title}>
          <h4>${n.title}</h4>
          <p>${n.folder}</p>
          <div class="acts">
            ${t.kind === "nothing" ? b`<button class="main" @click=${() => this._play(n)}>Play now</button>` : b`<button class="main" @click=${() => this._play(n, "next")}>Play next</button>
                  <button @click=${() => this._play(n, "add")}>Add to the end of the queue</button>
                  <button class="danger sep" @click=${() => [this._menu, this._confirm] = [void 0, r]}>Play now and replace the queue…</button>`}
            ${n.playlist && this._viewing !== n ? b`<button class="sep" @click=${() => [this._menu, this._viewing, this.tab] = [
				void 0,
				n,
				"favourites"
			]}>See what is in it</button>` : S}
            ${n.playlist && P(e) ? b`<button class="danger sep" @click=${() => this._delete(n)}>Delete this playlist…</button>` : S}
          </div>
        </div>
      </div>`;
		}
		return S;
	}
	render() {
		let e = this._house, t = e && R(e, this.room);
		if (!e || !t) {
			let t = this._why ?? (e ? "This room's speaker isn't answering." : "Asking Home Assistant what is playing…");
			return b`<div class="big"><div class="now"><div class="bar">${this._shut()}</div><p class="empty">${t}</p></div></div>`;
		}
		let n = this.tab ?? "rooms", [r, i] = U(V(t).title), a = t.picture ? `--pic:url('${(this.hass.hassUrl?.(t.picture) ?? t.picture).replace(/'/g, "%27")}');` : "";
		return b`<div class="big" style="--a:${r};--b:${i};--side:${this._split.value}px;${a}">
      ${this._now(e, t)}
      <div class="side ${this.tab ? "up" : ""}">${this._split.grip((e) => {
			let t = this.getBoundingClientRect();
			return Math.round(Math.max(360, Math.min(t.width - 380, t.right - e.clientX)));
		})}${this._tabs(t)}${n === "queue" ? this._queue(t) : n === "rooms" ? this._rooms(e, t) : n === "search" ? this._search(t) : this._favouritesPanel(t)}</div>
      ${this._sheets(e, t)}
      <div class="toast ${this._toast ? "on" : ""}" role="status">${this._toast}</div>
    </div>`;
	}
	static {
		this.styles = [
			Y,
			cn,
			o`
      /* The handle that sets the side panel's width: only where the panel is beside the cover. */
      .side > .grip { display: none; position: absolute; left: -7px; top: 0; bottom: 0; z-index: 3; }
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
      /* No bigger than Spotify's covers are, so one of those is never stretched. */
      .cover .art { width: min(100cqw, 100cqh, 640px); border-radius: 18px; box-shadow: 0 20px 50px rgb(0 0 0 / 50%); }
      .cover .art:has(img) { overflow: visible; background: none; box-shadow: none; }
      .cover .art:has(img) i { display: none; }
      .cover .art img { object-fit: contain; border-radius: 18px; filter: drop-shadow(0 16px 30px rgb(0 0 0 / 50%)); }
      .cover .art img.badge { object-fit: cover; border-radius: 50%; filter: none; }
      .title { text-align: center; }
      /* Two lines at most: enough to tell one version of a song from another, and no title
         can squeeze the artwork. */
      .title b { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 21px; line-height: 1.2; overflow-wrap: anywhere; text-wrap: balance; }
      .title span { color: var(--muted); }
      .title casa-mia-thumbs { display: flex; justify-content: center; --secondary-text-color: rgb(255 255 255 / 66%); --secondary-background-color: rgb(255 255 255 / 12%); }
      .title .keep { display: inline-flex; margin-top: 8px; }
      /* Not found on Spotify (yet): still pressed, to say why. */
      .title .keep.off { opacity: 0.55; }
      .love { margin: 6px 0 0; font-size: 12.5px; line-height: 1.35; color: #fff; overflow-wrap: anywhere; }
      .love.over { color: var(--muted); }
      .barred { margin: 0; padding: 8px 12px; border-radius: 12px; background: rgb(255 255 255 / 12%); font-size: 13px; text-align: center; }
      .switch { display: flex; align-items: center; gap: 12px; width: 100%; margin: 0 0 14px; padding: 12px 14px; border-radius: 14px; background: rgb(255 255 255 / 8%); text-align: left; }
      .switch span { flex: 1; min-width: 0; }
      .switch small { display: block; color: rgb(255 255 255 / 70%); }
      .switch i { position: relative; flex: none; width: 44px; height: 26px; border-radius: 999px; background: rgb(255 255 255 / 25%); transition: background 0.15s; }
      .switch i::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: translate 0.15s; }
      .switch[aria-checked="true"] i { background: #3fae5a; }
      .switch[aria-checked="true"] i::after { translate: 18px; }
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
      .gvol output { flex: none; min-width: 2.8em; text-align: right; font-size: 13px; font-variant-numeric: tabular-nums; }
      .gvol .ib:first-child { margin: 0 -11px; }
      .gvol .own { flex: 1; font-size: 13px; }
      .room .mute { justify-self: center; color: var(--muted); }
      .room .mute svg { width: 20px; height: 20px; }
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
      .tools .go { background: #fff; color: #111; }
      /* The editor has two lists side by side: only where the screen is wide enough. */
      .tools .wide { display: none; }
      @media (min-width: 900px) { .tools .wide { display: flex; } }
      .fold { display: flex; align-items: center; gap: 4px; width: 100%; min-height: 36px; text-transform: inherit; letter-spacing: inherit; }
      .fold svg { width: 18px; height: 18px; }
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
      .sheet .or { margin: 16px 0 8px; }
      .over, .picks { max-height: 32vh; overflow: auto; }
      .toast { position: absolute; left: 14px; right: 14px; bottom: 18px; z-index: 6; margin: 0 auto; width: fit-content; max-width: calc(100% - 28px); padding: 11px 16px; border-radius: 14px; background: #fff; color: #111; font-weight: 600; overflow-wrap: anywhere; box-shadow: 0 10px 30px rgb(0 0 0 / 45%); opacity: 0; transform: translateY(12px); transition: 0.25s; pointer-events: none; }
      .toast.on { opacity: 1; transform: none; }
      /* Out of the way of a question's buttons. */
      .veil ~ .toast { top: max(18px, env(safe-area-inset-top)); bottom: auto; }

      /* A wide screen (a wall tablet): the rooms and favourites sit beside the player. */
      /* In a dashboard card (the Now playing card): in place, the size the card is given. */
      :host([inline]) { position: relative; inset: auto; z-index: 0; display: block; height: 100%; min-height: 560px; overflow: hidden; border-radius: var(--ha-card-border-radius, 18px); }
      :host([inline]) .big { animation: none; }

      @container (min-width: 900px) {
        .big { grid-template-columns: minmax(0, 1fr) min(var(--side, 460px), 100cqw - 380px); }
        .side > .grip { display: grid; }
        .now { padding: 16px 56px 22px; }
        .now .tabs, .shut { display: none; }
        .side { position: relative; inset: auto; display: flex; border-radius: 0; border-left: 1px solid var(--line); background: rgb(12 11 10 / 46%); backdrop-filter: blur(24px); box-shadow: none; animation: none; }
        .side .tabs { display: flex; }
        .side .tabs .shown { background: rgb(255 255 255 / 16%); color: #fff; }
        .veil { place-items: center; }
      }
    `
		];
	}
}, On = "casa-mia-jukebox-page", Z = class extends E {
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
		!this._off && this.isConnected && this._hass?.connection && (this._off = Mt(this._hass.connection, (e, t) => [this._house, this._why] = [e, t]));
	}
	get _trouble() {
		return this._connected ? this._house ? void 0 : this._why ?? "Asking Home Assistant what is playing…" : "No connection to Home Assistant. What is shown may be out of date.";
	}
};
function kn(e) {
	for (let t = e; t; t = t.parentNode ?? t.host) if (t instanceof Element && t.scrollHeight > t.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(t).overflowY)) return t;
	return document.scrollingElement ?? document.documentElement;
}
var An = class extends Z {
	constructor(...e) {
		super(...e), this._hold = new on(), this._at = {
			x: 0,
			y: 0
		}, this._frame = 0, this._dragged = !1, this._touch = (e) => {
			this._drag && e.preventDefault();
		}, this._moved = (e) => {
			this._hold.moved(e), this._drag && (this._at = {
				x: e.clientX,
				y: e.clientY
			}, this._place());
		}, this._edge = () => {
			if (!this._drag) return;
			let [e, t] = [this._at.y, this._scroller], n = e < 70 ? -Math.ceil((70 - e) / 5) : e > innerHeight - 70 ? Math.ceil((e - innerHeight + 70) / 5) : 0, r = t.scrollTop;
			n && (t.scrollTop = Math.min(this._drag.end, r + n)), t.scrollTop !== r && this._place(), this._frame = requestAnimationFrame(this._edge);
		}, this._drop = () => {
			this._hold.drop(), cancelAnimationFrame(this._frame), this._drag = void 0;
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
			Rt(this._hass, r).then(() => this._failed = void 0, (e) => this._failed = `The order couldn't be kept: ${L(e)}`);
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
		this._drop(), this._dragged = !1, this._hold.start(e, (e, i) => {
			n.setPointerCapture(r), this._scroller = kn(this), this._at = {
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
		});
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
	_minis(e) {
		let [t, n, r] = [
			this._hass,
			this._house,
			this._drag
		];
		return e.map((e, i) => b`<div
        class="slot ${r?.from === i ? "held" : ""} ${r && r.to === i && r.from !== i ? "here" : ""}"
        style=${r?.from === i ? `transform:translate(${r.dx}px,${r.dy}px) scale(1.03)` : ""}
        @pointerdown=${(e) => this._down(e, i)}
        @pointermove=${this._moved}
        @pointerup=${this._up}
        @pointercancel=${this._drop}
        @click=${this._tap}
        @contextmenu=${(e) => e.preventDefault()}
        @dragstart=${(e) => e.preventDefault()}
      >
        <casa-mia-jukebox-mini .hass=${t} .house=${n} .group=${e}></casa-mia-jukebox-mini>
      </div>`);
	}
}, jn = o`
  .slot { position: relative; min-width: 0; border-radius: 18px; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  .slot.held { z-index: 2; box-shadow: 0 16px 40px rgb(0 0 0 / 45%); cursor: grabbing; }
  .slot.here { outline: 2px dashed var(--primary-color); outline-offset: 3px; }
  .hint { margin: 10px 2px 0; font-size: 12px; color: var(--secondary-text-color); }
`, Mn = "To move a player, rest a finger on it until it lifts, then drag it.", Nn = class extends An {
	render() {
		let e = this._hass;
		if (!e) return S;
		let t = this._house, n = t?.groups.filter((e) => !e.quiet) ?? [], r = this._trouble ?? this._failed;
		return b`<div class="page">
      <div class="nav">
        ${this.narrow ? b`<button class="ib" @click=${() => D(this, "hass-toggle-menu")} aria-label="Home Assistant's menu">${W("menu")}</button>` : S}
        <button class="ib" @click=${() => history.back()} aria-label="Back">${W("back")}</button>
        <h1>Music</h1>
        <button class="ib" @click=${() => Ue("/")} aria-label="Home">${W("home")}</button>
      </div>
      ${r ? b`<p class="trouble" role="status">${r}</p>` : S}
      <div class="minis">
        ${this._minis(n)}
      </div>
      ${n.length > 1 ? b`<p class="hint">${Mn}</p>` : S}
      ${t && !n.length ? b`<p class="none">Nothing is playing anywhere.</p>` : S}
      <casa-mia-jukebox-rooms class="rooms" .hass=${e} .house=${t}></casa-mia-jukebox-rooms>
    </div>`;
	}
	static {
		this.styles = [
			Y,
			jn,
			o`
      :host { display: block; min-height: 100vh; background: var(--primary-background-color); color: var(--primary-text-color); font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .page { max-width: 1240px; margin: 0 auto; padding: max(18px, env(safe-area-inset-top)) 16px 32px; }
      .nav { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
      .nav h1 { flex: 1; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
      .nav .ib { background: var(--card-background-color); border: 1px solid var(--divider-color); }
      .minis { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, ${gn}px), 1fr)); gap: 12px; }
      .rooms { margin-top: 22px; }
      .none { margin: 0; color: var(--secondary-text-color); overflow-wrap: anywhere; }
      .trouble { margin: 0 0 14px; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--error-color, #db4437) 16%, transparent); overflow-wrap: anywhere; }
    `
		];
	}
}, Pn = "casa-mia-jukebox", Fn = class extends An {
	static {
		this.properties = {
			...An.properties,
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
		if (!e || !this._config) return S;
		if (!t) return b`<p class="note">${A(this) ? "What is playing, with pause, skip and volume" : this._trouble}</p>`;
		let n = this._config.entity, r = n ? R(t, n) : void 0, i = n ? r ? [r] : [] : t.groups.filter((e) => !e.quiet), a = this._trouble ?? this._failed;
		return b`${a ? b`<p class="note">${a}</p>` : S}
      ${n ? i.map((n) => b`<casa-mia-jukebox-mini .hass=${e} .house=${t} .group=${n}></casa-mia-jukebox-mini>`) : this._minis(i)}
      ${!n && i.length > 1 ? b`<p class="hint">${Mn}</p>` : S}
      ${i.length ? S : b`<p class="note">${n ? `${t.rooms[n]?.name ?? n} isn't answering` : "Nothing is playing"}</p>`}`;
	}
	static {
		this.styles = [
			Y,
			jn,
			o`
      /* As many players across as fit the width the dashboard gives the card, each at least
         COLUMN wide: one on a phone, two or three on a tablet (owner, 2026-11-24: a card
         the width of an iPad showed one long player to a row). A player alone keeps a
         column's width; it isn't stretched across the card. */
      :host { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, ${gn}px), 1fr)); gap: 12px; }
      .hint { grid-column: 1 / -1; margin: 0 2px; }
      .note { grid-column: 1 / -1; margin: 0; padding: 14px 16px; border-radius: 18px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--secondary-text-color); overflow-wrap: anywhere; }
    `
		];
	}
}, In = "casa-mia-jukebox-micro", Ln = `${In}-editor`, Rn = {
	size: "small",
	anchor: "center",
	picture_only: !1
}, zn = 8, Q = {
	small: {
		px: 120,
		rows: 2,
		columns: 3
	},
	medium: {
		px: 184,
		rows: 3,
		columns: 6
	},
	large: {
		px: 248,
		rows: 4,
		columns: 6
	}
}, Bn = b`<span class="mark eq"><i></i><i></i><i></i></span>`, Vn = {
	playing: Bn,
	paused: Bn,
	muted: b`<span class="mark">${W("muted")}</span>`,
	trouble: b`<span class="mark warn">${W("warn")}</span>`
}, Hn = {
	paused: ", paused",
	muted: ", muted"
}, Un = class extends Z {
	static {
		this.properties = {
			...Z.properties,
			_config: { state: !0 }
		};
	}
	constructor() {
		super(), this._page = () => Ue("/jukebox"), new ln(this);
	}
	static getStubConfig(e) {
		let t = Object.keys(e.states).filter((t) => t.startsWith("media_player.") && e.entities?.[t]?.platform === "sonos"), n = t.find((t) => e.states[t].state === "playing") ?? t[0];
		return n ? { entity: n } : {};
	}
	static getConfigElement() {
		return document.createElement(Ln);
	}
	setConfig(e) {
		this._config = { ...e };
		let t = Ve(e.anchor ?? Rn.anchor);
		this.style.setProperty("--jb-size", `${this._size.px - (e.picture_only ? 0 : 16)}px`), this.style.setProperty("--jb-justify", t.justify), this.style.setProperty("--jb-align", t.align);
	}
	get _size() {
		return Q[this._config?.size ?? Rn.size] ?? Q.small;
	}
	getCardSize() {
		return Math.ceil(this._size.px / 50);
	}
	getGridOptions() {
		let { rows: e, columns: t } = this._size;
		return this._config?.entity ? {
			columns: t,
			rows: e,
			min_columns: 2,
			min_rows: e
		} : {
			columns: 12,
			min_columns: 2
		};
	}
	_tap(e, t) {
		let n = this._config?.tap_action;
		return n ? () => D(this, "hass-action", {
			config: {
				entity: e,
				tap_action: n
			},
			action: "tap"
		}) : t;
	}
	_plate(e) {
		let { quiet_icon: t, quiet_image: n } = this._config;
		return tn(this._hass, e, t ? b`<ha-icon .icon=${t}></ha-icon>` : W("rooms"), n);
	}
	_unknown(e) {
		let t = this._hass, n = e ? t.states[e]?.attributes.friendly_name ?? e : "Jukebox", r = this._connected && !this._why;
		return {
			picture: this._plate(n),
			state: r ? "asking" : "trouble",
			says: `${n}: ${this._trouble}`,
			tap: e ? () => X(t, e) : this._page,
			room: e
		};
	}
	_group(e, t, n) {
		let r = this._hass, i = Ht(e, t, this._connected), { title: a, by: o } = V(t), s = z(e, t), c = i === "quiet" ? "nothing playing" : `${a}${o ? ` by ${o}` : ""}${Hn[i] ?? ""}`, l = i === "trouble" ? `. ${t.trouble ?? this._trouble}` : "", u = i === "trouble" || i === "quiet" ? null : Ut(t, Date.now());
		return {
			picture: i === "quiet" ? this._plate(s) : en(r, t, a),
			state: i,
			says: `${s}: ${c}${l}`,
			tap: () => X(r, n ?? t.id, i === "quiet" ? "favourites" : void 0),
			part: u !== null && t.duration ? u / t.duration : void 0,
			room: n ?? t.id
		};
	}
	_tiles(e, t) {
		let n = this._hass;
		if (t) {
			let r = R(e, t);
			if (r) return [this._group(e, r, t)];
			let i = e.rooms[t]?.name ?? t;
			return [{
				picture: this._plate(i),
				state: "trouble",
				says: `${i} isn't answering`,
				tap: () => X(n, t),
				room: t
			}];
		}
		let r = e.groups.filter((e) => !e.quiet);
		if (r.length) return r.map((t) => this._group(e, t, void 0));
		let [i, a] = this._connected ? ["quiet", "Nothing is playing"] : ["trouble", this._trouble];
		return [{
			picture: this._plate("Jukebox"),
			state: i,
			says: `Jukebox: ${a}`,
			tap: this._page
		}];
	}
	render() {
		let [e, t, n] = [
			this._hass,
			this._house,
			this._config
		];
		if (!e || !n) return S;
		let r = (t ? this._tiles(t, n.entity) : [this._unknown(n.entity)]).map(({ picture: e, state: t, says: n, tap: r, part: i, room: a }) => b`<button class="tile ${t} ${t !== "playing" && t !== "muted" ? "still" : ""}" title=${n} aria-label=${n} @click=${this._tap(a, r)}>
        ${e} ${Vn[t] ?? S}
        ${i === void 0 ? S : b`<i class="prog" style="width:${100 * i}%"></i>`}
      </button>`);
		return b`<ha-card class=${n.picture_only ? "picture-only" : ""}>${r}</ha-card>`;
	}
	static {
		this.styles = [Y, o`
      /* The pictures in a row that wraps, placed in the card as the nine places say: across
         by justify, and down (in a card taller than they are) by align. */
      :host { display: block; height: 100%; }
      ha-card { display: flex; flex-wrap: wrap; gap: 8px; height: 100%; padding: ${zn}px; justify-content: var(--jb-justify, center); align-content: var(--jb-align, center); }
      /* The picture alone: what Home Assistant's Markdown card takes off for text only. */
      ha-card.picture-only { padding: 0; background: none; border: none; box-shadow: none; backdrop-filter: none; }
      /* No border, no raised edge and no hover: it is a picture that can be tapped, not a
         button of the player. Its size is the one chosen, less in a card too narrow for
         it. The marks are measured from its width. */
      .tile { position: relative; display: block; flex: none; width: min(var(--jb-size, 120px), 100%); overflow: hidden; border-radius: 12px; container-type: inline-size; }
      .tile:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .art { transition: filter 0.3s; }
      /* Not playing, or not known to be: the picture loses its colour. Muted music is
         still playing, and keeps it. */
      .still .art { filter: grayscale(0.85) brightness(0.65); }
      /* A picture the card was given for a quiet room is shown as it is: it says quiet by
         being there, and a logo with its colours taken off is no longer the logo. */
      .still .art.plate:has(img) { filter: none; }

      /* A sign on the picture: square-cornered and too small for a finger, so it isn't
         taken for something to press. A tap on it is a tap on the picture. */
      .mark { position: absolute; top: 5%; left: 5%; display: grid; place-items: center; width: clamp(16px, 28cqw, 30px); height: clamp(16px, 28cqw, 30px); border-radius: 22%; background: rgb(0 0 0 / 60%); color: #fff; pointer-events: none;
        /* A light edge, so the mark is still a mark on a cover that is black itself. */
        box-shadow: 0 0 0 1px rgb(255 255 255 / 22%); }
      .mark svg { width: 70%; height: 70%; }
      .mark.warn { background: var(--error-color, #db4437); }

      /* The bars move only while the house says music is playing: only their height is
         changed, by a transform, which costs a wall tablet nothing to draw. */
      .mark.eq { display: flex; align-items: center; justify-content: center; gap: 9%; }
      /* Sized as parts of the mark itself: a padding in % would be of the whole picture's
         width, and left the bars no room at all. */
      .eq i { width: 14%; height: 56%; border-radius: 1px; background: currentColor; transform-origin: bottom; transform: scaleY(0.3); }
      .playing .eq i { animation: bar 0.9s ease-in-out infinite alternate; }
      .playing .eq i:nth-child(2) { animation-delay: -0.3s; }
      .playing .eq i:nth-child(3) { animation-delay: -0.6s; }
      @keyframes bar { to { transform: scaleY(1); } }
      /* Where a device asks for less movement the bars stand at different heights, which
         still tells playing from paused. */
      @media (prefers-reduced-motion: reduce) {
        .playing .eq i { animation: none; transform: scaleY(0.6); }
        .playing .eq i:nth-child(2) { transform: scaleY(1); }
      }

      .prog { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--primary-color, #c4552d); }
    `];
	}
}, Wn = { entity: { filter: {
	integration: "sonos",
	domain: "media_player"
} } }, Gn = o`
  .note { margin: 0; padding: 14px 16px; border-radius: 18px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--secondary-text-color); overflow-wrap: anywhere; }
`, Kn = "casa-mia-jukebox-quiet", qn = {
	heading: "Show the heading over the rooms",
	silent: "List the speakers that aren't answering"
}, Jn = class extends Z {
	constructor(...e) {
		super(...e), this._config = {};
	}
	static {
		this.properties = {
			...Z.properties,
			_config: { state: !0 }
		};
	}
	static getStubConfig() {
		return {
			heading: !0,
			silent: !0
		};
	}
	static getConfigForm() {
		return {
			schema: [{
				name: "heading",
				selector: { boolean: {} }
			}, {
				name: "silent",
				selector: { boolean: {} }
			}],
			computeLabel: (e) => qn[e.name]
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
			columns: 12,
			min_columns: 6
		};
	}
	render() {
		let [e, t] = [this._hass, this._house];
		if (!e) return S;
		if (!t) return b`<p class="note">${A(this) ? "The rooms that are playing nothing, a tap from their favourites" : this._trouble}</p>`;
		let [n, r] = [this._config.heading !== !1, this._config.silent !== !1], i = !t.groups.some((e) => e.quiet) && (!r || Object.values(t.rooms).every((e) => e.available));
		return b`${this._trouble ? b`<p class="note">${this._trouble}</p>` : S}
      ${i ? b`<p class="note">Every room is playing something.</p>` : b`<casa-mia-jukebox-rooms .hass=${e} .house=${t} .heading=${n} .silent=${r}></casa-mia-jukebox-rooms>`}`;
	}
	static {
		this.styles = [
			Y,
			Gn,
			o`:host { display: grid; gap: 12px; }`
		];
	}
}, Yn = "casa-mia-jukebox-shortcut", Xn = {
	favourite: "Favourite or Sonos playlist, by its name",
	rooms: "Rooms (the first leads, the others join it)",
	name: "What the button says (leave empty for the favourite's name)",
	icon: "Icon",
	enqueue: "Where in the queue (leave empty to play now)"
}, Zn = class extends E {
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
						...Wn.entity,
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
			computeLabel: (e) => Xn[e.name]
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
		this._busy.during("play", this._hass.callService("casa_mia_jukebox", "play", t)).catch((e) => D(this, "hass-notification", { message: `Jukebox: ${L(e)}` }));
	}
	render() {
		let [e, t] = [this._hass, this._config];
		if (!e || !t) return S;
		let n = t.rooms ?? [];
		if (!t.favourite || !n.length) return b`<p class="note">${A(this) ? "A button that plays one favourite in the rooms you choose" : "Choose a favourite and a room for this shortcut."}</p>`;
		let r = n.map((t) => e.states[t]?.attributes.friendly_name ?? t).join(" + ");
		return b`<button class="short ${this._busy.on("play")}" @click=${() => this._play(t)}>
      <ha-icon .icon=${t.icon || "mdi:play-circle"}></ha-icon>
      <span><b>${t.name || t.favourite}</b><small>${r}</small></span>
    </button>`;
	}
	static {
		this.styles = [
			Y,
			Gn,
			o`
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
}, Qn = "casa-mia-jukebox-now", $n = class extends E {
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
				selector: Wn
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
		return !e || !this._config ? S : !t || A(this) ? b`<p class="note">${t ? "" : "Choose a room. "}The whole player for one room: artwork, controls, queue, rooms, favourites and search.</p>` : b`<casa-mia-jukebox-big inline .hass=${e} .room=${t}></casa-mia-jukebox-big>`;
	}
	static {
		this.styles = [
			Y,
			Gn,
			o`:host { display: block; height: 100%; }`
		];
	}
}, er = "casa-mia-jukebox-anchors", tr = (e) => `${e} rows of a section`, nr = [
	{
		name: "entity",
		selector: Wn
	},
	{
		name: "size",
		selector: { select: {
			mode: "dropdown",
			options: [
				{
					value: "small",
					label: `Small: ${Q.small.px} px, ${tr(Q.small.rows)}`
				},
				{
					value: "medium",
					label: `Medium: ${Q.medium.px} px, ${tr(Q.medium.rows)}`
				},
				{
					value: "large",
					label: `Large: ${Q.large.px} px, ${tr(Q.large.rows)}`
				}
			]
		} }
	},
	{
		name: "picture_only",
		selector: { boolean: {} }
	},
	{
		name: "tap_action",
		selector: { ui_action: {} }
	},
	{
		type: "expandable",
		name: "",
		title: "A room that is playing nothing",
		flatten: !0,
		schema: [{
			name: "quiet_icon",
			selector: { icon: { placeholder: "mdi:speaker" } }
		}, {
			name: "quiet_image",
			selector: { text: {} }
		}]
	}
], rr = {
	entity: "Room",
	size: "Size",
	picture_only: "The picture alone, with no card round it",
	tap_action: "Tap action",
	quiet_icon: "Icon",
	quiet_image: "Or a picture, by its address"
}, ir = {
	entity: "Leave empty for a picture of everything that is playing.",
	size: "The height of the card. In a card with a border the picture is 16 px smaller, so the card still fills whole rows.",
	picture_only: "Off: the card has the background and border of Home Assistant's own cards. On: only the picture shows, as the Markdown card's text only does for words.",
	quiet_icon: "Shown in the picture's place while the room plays nothing. Empty: a speaker.",
	quiet_image: "Such as /local/quiet.png, for a file in Home Assistant's www folder. It is shown whole, in the icon's place, at the size chosen above.",
	tap_action: "Left at its default, a tap opens the big player. For Jukebox's page instead, choose Navigate and /jukebox."
}, ar = class extends E {
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
		super.connectedCallback(), We().then(() => this._ready = !0);
	}
	_save(e) {
		this._config = e;
		let t = Object.fromEntries(Object.entries(e).filter(([, e]) => e !== void 0 && e !== ""));
		D(this, "config-changed", { config: Je(t, Rn) });
	}
	render() {
		if (!this.hass || !this._config || !this._ready) return S;
		let e = {
			...Rn,
			...this._config
		};
		return b`<ha-form
        .hass=${this.hass}
        .data=${e}
        .schema=${nr}
        .computeLabel=${(e) => rr[e.name] ?? e.name}
        .computeHelper=${(e) => ir[e.name]}
        @value-changed=${(e) => {
			e.stopPropagation(), this._save({
				...this._config,
				...e.detail.value
			});
		}}
      ></ha-form>
      <h3>Where the picture sits in its card</h3>
      <div class="where">
        <casa-mia-jukebox-anchors
          label="Where the picture sits in its card"
          .value=${e.anchor}
          @anchor-changed=${(e) => {
			e.stopPropagation(), this._save({
				...this._config,
				anchor: e.detail.value
			});
		}}
        ></casa-mia-jukebox-anchors>
        <p class="note">Across always shows. Up and down shows only in a card that is taller than the picture: one given more rows on the Layout tab, or one filling a panel of a Tablet Layout.</p>
      </div>`;
	}
	static {
		this.styles = o`
    h3 { margin: 16px 0 8px; font-size: 15px; }
    .where { display: flex; gap: 16px; align-items: center; }
    .note { flex: 1; margin: 0; color: var(--secondary-text-color); font-size: 13px; overflow-wrap: anywhere; }
  `;
	}
}, or = "casa-mia-jukebox-mini", sr = class extends E {
	static {
		this.properties = {
			hass: { attribute: !1 },
			house: { attribute: !1 },
			group: { attribute: !1 },
			_stopping: { state: !0 },
			_vol: { state: !0 }
		};
	}
	willUpdate(e) {
		e.has("house") && this._settling && ([this._vol, this._settling] = [void 0, !1]);
	}
	_slid(e, t) {
		[this._vol, this._settling] = [e.detail.value, t], this._volume(e.detail.value);
	}
	constructor() {
		super(), this._stopping = !1, this._settling = !1, this._volume = Kt((e) => I(this.hass, "group_volume", this.group.id, { value: e }), (e) => this._failed(e)), this._busy = new J(this), new ln(this);
	}
	_failed(e) {
		D(this, "hass-notification", { message: `Jukebox: ${L(e)}` });
	}
	disconnectedCallback() {
		super.disconnectedCallback(), clearTimeout(this._unasked);
	}
	_sure(e) {
		clearTimeout(this._unasked), this._stopping = e, e && (this._unasked = setTimeout(() => this._stopping = !1, 8e3));
	}
	_ask(e, t = e, n = {}) {
		this._busy.during(t, I(this.hass, e, this.group.id, n)).catch((e) => this._failed(e));
	}
	render() {
		let { hass: e, house: t, group: n } = this;
		if (!e || !t || !n) return S;
		let { title: r, by: i } = V(n), a = Ut(n, Date.now()), o = n.state === "playing", s = Vt(t, n), c = () => X(e, n.id);
		return this._stopping ? b`<div class="mini" style="--a:${U(r)[0]}">
        <span class="pic">${en(e, n, r)}</span>
        <span class="meta"><b>Stop and clear?</b><span>Empties the queue</span><small>${z(t, n)}</small></span>
        <span class="tp">
          <button class="say" @click=${() => this._sure(!1)}>Keep</button>
          <button class="say stop" @click=${() => (this._sure(!1), this._ask("stop"))}>Stop</button>
        </span>
      </div>` : b`<div class="mini" style="--a:${U(r)[0]}">
      <button class="pic" @click=${c} aria-label="Open the player">${en(e, n, r)}</button>
      <button class="meta" @click=${c}>
        <b><casa-mia-jukebox-marquee .text=${r}></casa-mia-jukebox-marquee></b>
        <span><casa-mia-jukebox-marquee .text=${i}></casa-mia-jukebox-marquee></span>
        <small><casa-mia-jukebox-marquee .text=${`${z(t, n)}${n.party ? " · Party" : ""}${n.love?.now && n.love.did ? ` · ${n.love.did} (Love it or Loathe it)` : ""}${n.trouble ? ` · ${n.trouble}` : ""}`}></casa-mia-jukebox-marquee></small>
      </button>
      <span class="tp">
        <button class="ib ${this._busy.on("play")}" ?disabled=${n.kind === "nothing"} @click=${() => this._ask(o ? "pause" : "play", "play")} aria-label=${o ? "Pause" : "Play"}>${W(o ? "pause" : "play")}</button>
        ${o && n.kind === "queue" ? b`<button class="ib ${this._busy.on("next")}" @click=${() => this._ask("next")} aria-label="Next song">${W("next")}</button>` : b`<button class="ib ${this._busy.on("stop")}" @click=${() => this._sure(!0)} aria-label="Stop the music here and clear the player">${W("stop")}</button>`}
      </span>
      ${Bt(t, n) ? b`<div class="vol ${s ? "hush" : ""}">
            <button class=${this._busy.on("mute")} @click=${() => this._ask("group_mute", "mute", { on: !s })} aria-label=${s ? "Unmute" : "Mute"} aria-pressed=${s}>${W(s ? "muted" : "volume")}</button>
            <casa-mia-jukebox-slider .value=${B(t, n)} label="Volume" @jb-slide=${(e) => this._slid(e, !1)} @jb-set=${(e) => this._slid(e, !0)}></casa-mia-jukebox-slider>
            <output aria-hidden="true">${this._vol ?? B(t, n)}%</output>
          </div>` : S}
      ${a !== null && n.duration ? b`<i class="prog" style="width:${100 * a / n.duration}%"></i>` : S}
    </div>`;
	}
	static {
		this.styles = [Y, o`
      /* Its own font, so it looks the same on Jukebox's page and in any dashboard. */
      :host { display: block; font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .mini { position: relative; overflow: hidden; display: grid; grid-template-columns: 60px minmax(0, 1fr) auto; gap: 8px 12px; align-items: center; padding: 12px; border-radius: 18px; border: 1px solid var(--divider-color, #8884);
        color: var(--primary-text-color); background: linear-gradient(100deg, color-mix(in srgb, var(--a) 26%, var(--card-background-color, #fff)), var(--card-background-color, #fff) 75%); }
      .meta { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; }
      /* Each line slides along when it is too long (the marquee), so it is never cut. */
      .meta b, .meta span, .meta small { min-width: 0; }
      .meta b { font-size: 15px; }
      .meta span { color: var(--secondary-text-color); }
      .meta small { margin-top: 3px; font-size: 12px; font-weight: 600; color: color-mix(in srgb, var(--a) 55%, var(--primary-text-color)); }
      .tp { display: flex; gap: 2px; --jb-glow: var(--primary-color, #c4552d); }
      .tp:has(.say) { gap: 8px; }
      .say { padding: 10px 14px; border-radius: 999px; background: color-mix(in srgb, currentColor 12%, transparent); font-size: 13px; font-weight: 700; }
      .say.stop { background: var(--error-color, #db4437); color: #fff; }
      .meta > b, .meta > span, .meta > small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .vol { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; color: var(--secondary-text-color); --jb-fill: #c4552d; }
      .vol svg { width: 18px; height: 18px; flex: none; }
      .vol output { flex: none; min-width: 2.8em; text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; }
      /* A finger's worth to press, taking no more of the line than the picture did. */
      .vol button { display: grid; place-items: center; flex: none; width: 34px; height: 34px; margin: -8px; border-radius: 50%; }
      .prog { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--a); }
    `];
	}
}, cr = "casaMiaJukeboxListening";
function lr() {
	let e = window;
	e[cr] || (e[cr] = !0, window.addEventListener("ll-custom", (e) => {
		let t = zt(e.detail, Cn.map(([e]) => e));
		if (t === void 0) return;
		let n = document.querySelector("home-assistant");
		if (typeof t == "string" || !n?.hass) {
			let e = typeof t == "string" ? t : "Home Assistant isn't ready";
			console.warn(`CASA-MIA CARDS: Jukebox: ${e}`), n && D(n, "hass-notification", { message: `Jukebox: ${e}` });
			return;
		}
		X(n.hass, t.room, t.tab);
	}));
}
//#endregion
//#region src/jukebox/queue.ts
var ur = "casa-mia-jukebox-queue", $ = 56, dr = class extends E {
	constructor(...e) {
		super(...e), this.locked = !1, this.stamp = 0, this.picks = !1, this._total = 0, this._asked = 0, this._busy = new J(this), this._moved = (e) => {
			let t = this._drag;
			if (!t) return;
			let n = e.clientY - t.y;
			this._drag = {
				...t,
				dy: n,
				to: Math.max(0, Math.min(this._songs.length - 1, t.from + Math.round(n / $)))
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
			playlist: {},
			locked: { type: Boolean },
			stamp: { type: Number },
			mark: { type: Number },
			picks: { type: Boolean },
			selected: { type: Number },
			_songs: { state: !0 },
			_total: { state: !0 },
			_why: { state: !0 },
			_drag: { state: !0 }
		};
	}
	willUpdate(e) {
		let t = e.get("group"), n = this.group;
		(e.has("group") && n && (!t || t.id !== n.id || t.queue_size !== n.queue_size || t.queue_position !== n.queue_position || t.kind !== n.kind) || (e.has("stamp") || e.has("playlist")) && n) && this._fetch();
	}
	_fetch() {
		let e = ++this._asked;
		Ft(this.hass, this.group.id, this.playlist).then((t) => {
			e !== this._asked || this._drag || ([this._songs, this._total, this._why] = [
				t.songs,
				t.total,
				void 0
			], this.playlist || D(this, "jb-queued", t.total), D(this, "jb-listed", {
				total: t.total,
				songs: t.songs
			}));
		}, (t) => e === this._asked && (this._why = L(t)));
	}
	at(e) {
		let t = this.renderRoot.querySelector(".row")?.getBoundingClientRect().top ?? this.getBoundingClientRect().top;
		return Math.max(0, Math.min(this._songs?.length ?? 0, Math.round((e - t) / $)));
	}
	async _act(e, t, n, r = -1) {
		let i = [...this._songs ?? []];
		n(i), this._songs = i;
		let [a, o] = this.playlist ? [e.replace("queue_", "playlist_"), { playlist: this.playlist }] : [e, {}];
		await this._busy.during(`row:${r}`, this.do(a, {
			...t,
			...o
		})), this._fetch();
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
		if (!e) return S;
		let r = this.playlist ? "playlist" : "queue";
		if (!t) return b`<p class="empty">${this._why ? `The ${r} couldn't be read: ${this._why}` : `Asking the speaker for the ${r}…`}</p>`;
		if (!t.length) return b`<p class="empty ${this.mark === void 0 ? "" : "over"}">${this.playlist ? "This playlist is empty." : "The queue is empty. Press + to add something."}</p>`;
		let i = !this.playlist && e.kind === "queue" ? e.queue_position : null, a = this.locked, o = (e) => b`<b>${e.title || "A song with no title"}</b><small>${[e.artist, e.album].filter(Boolean).join(" · ")}</small>`;
		return b`${this._why ? b`<p class="empty">The queue couldn't be read again: ${this._why}</p>` : S}
      ${this.mark === void 0 ? S : b`<div class="mark" style="top:${(this.renderRoot.querySelector(".row")?.offsetTop ?? 0) + this.mark * $}px"></div>`}
      ${t.map((e, t) => {
			let s = n ? t === n.from ? n.dy : n.from < t && t <= n.to ? -56 : n.to <= t && t < n.from ? $ : 0 : 0;
			return b`<div class="row ${t + 1 === i ? "now" : ""} ${this.selected === t ? "sel" : ""} ${n?.from === t ? "held" : ""} ${this._busy.on(`row:${t}`)}" style="transform:translateY(${s}px)">
          ${a ? b`<span></span>` : b`<span class="handle" @pointerdown=${(e) => this._down(e, t)} @pointermove=${this._moved} @pointerup=${this._up} @pointercancel=${this._up}>${W("drag")}</span>`}
          ${q(this.hass, e.picture, e.title || e.album || "?")}
          ${this.picks ? b`<button class="t" @click=${() => D(this, "jb-pick", t)} aria-pressed=${this.selected === t} aria-label="Choose ${e.title}">${o(e)}</button>` : this.playlist ? a ? b`<span class="t">${o(e)}</span>` : b`<button class="t" @click=${() => D(this, "jb-song", {
				at: t,
				song: e
			})} aria-label="Move or copy ${e.title} to another playlist">${o(e)}</button>` : b`<button class="t" @click=${() => this._busy.during(`row:${t}`, this.do("queue_play", { value: t + 1 }))} aria-label="Play ${e.title}">${o(e)}</button>`}
          <span class="len">${t + 1 === i ? W("volume") : e.duration ? Wt(e.duration) : S}</span>
          ${a ? b`<span></span>` : b`<button class="ib" @click=${() => this._act("queue_remove", { value: t + 1 }, (e) => e.splice(t, 1))} aria-label="Take ${e.title} out of the ${r}">${W("close")}</button>`}
        </div>`;
		})}
      ${this._total > t.length ? b`<p class="empty">and ${this._total - t.length} more, which aren't shown</p>` : S}`;
	}
	static {
		this.styles = [Y, o`
      :host { display: block; position: relative; }
      .mark { position: absolute; left: 6px; right: 6px; z-index: 3; height: 3px; margin-top: -1.5px; border-radius: 2px; background: #fff; box-shadow: 0 0 10px rgb(255 255 255 / 70%); pointer-events: none; }
      .empty.over { outline: 2px dashed #fff; outline-offset: -10px; border-radius: 18px; }
      .empty { padding: 28px 18px; text-align: center; color: var(--muted); overflow-wrap: anywhere; }
      .row { display: grid; grid-template-columns: 40px 40px minmax(0, 1fr) auto 42px; align-items: center; gap: 6px; height: ${$}px; padding: 0 4px; border-radius: 14px; transition: transform 0.15s; }
      .row.now { background: rgb(255 255 255 / 9%); }
      .row.sel { outline: 2px solid #fff; outline-offset: -2px; background: rgb(255 255 255 / 14%); }
      .row.held { position: relative; z-index: 2; background: rgb(255 255 255 / 18%); box-shadow: 0 8px 24px rgb(0 0 0 / 50%); transition: none; }
      /* The handle takes the finger for itself, so a drag moves the song and not the list. */
      .handle { display: grid; place-items: center; height: 100%; color: var(--muted); cursor: grab; touch-action: none; }
      .t { display: grid; grid-template-columns: minmax(0, 1fr); align-self: stretch; align-content: center; min-width: 0; }
      .t b, .t small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .t small { color: var(--muted); }
      .art { border-radius: 8px; }
      .len { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
      .len svg { width: 18px; height: 18px; color: #fff; }
      .ib { color: var(--muted); }
    `];
	}
}, fr = "casa-mia-jukebox-find", pr = 400, mr = class extends E {
	constructor(...e) {
		super(...e), this.room = "", this.waiting = () => "", this.changes = 0, this.fresh = 0, this.carry = !1, this._hold = new on(), this._dropped = !1, this._query = "", this._trail = [], this._asked = 0, this._moved = (e) => {
			this._hold.moved(e), this._carried && D(this, "jb-carry", {
				x: e.clientX,
				y: e.clientY
			});
		}, this._tap = {
			capture: !0,
			handleEvent: (e) => {
				this._dropped && (this._dropped = !1, e.stopPropagation(), e.preventDefault());
			}
		};
	}
	static {
		this.properties = {
			room: {},
			changes: { type: Number },
			fresh: { type: Number },
			carry: { type: Boolean },
			_carried: { state: !0 },
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
		super.disconnectedCallback(), clearTimeout(this._typed), this._hold.drop();
	}
	_down(e, t) {
		if (e.button) return;
		let [n, r] = [e.currentTarget, e.pointerId];
		this._dropped = !1, this._hold.start(e, (e, i) => {
			n.setPointerCapture(r), this._carried = t, navigator.vibrate?.(15), D(this, "jb-lift", {
				item: t,
				x: e,
				y: i
			});
		});
	}
	_let(e, t) {
		this._hold.drop();
		let n = this._carried;
		n && ([this._carried, this._dropped] = [void 0, !0], D(this, t, {
			item: n,
			x: e.clientX,
			y: e.clientY
		}));
	}
	updated(e) {
		e.has("fresh") && e.get("fresh") !== void 0 && this._query && this._clear();
	}
	_open(e) {
		let t = { title: e?.title ?? "Browse" };
		this._trail = [...this._trail, t];
		let n = (e) => this._trail = this._trail.map((n) => n === t ? Object.assign(t, e) : n);
		Lt(this.hass, this.room, e).then((e) => n({ items: e.items }), (e) => n({ why: L(e) }));
	}
	_type(e) {
		this._query = e.target.value, this._trail = this._trail.slice(0, 1), clearTimeout(this._typed), [this._found, this._why] = [void 0, void 0];
		let t = ++this._asked, n = this._query.trim();
		n && (this._typed = setTimeout(() => It(this.hass, this.room, n).then((e) => t === this._asked && (this._found = e.sources), (e) => t === this._asked && (this._why = L(e))), pr));
	}
	_clear() {
		let e = this.renderRoot.querySelector("input");
		e.value = "", e.dispatchEvent(new Event("input")), e.focus();
	}
	_row(e) {
		return this.carry && e.can_play ? b`<div
        class="row carry ${this._carried === e ? "lifted" : ""} ${this.waiting(`fav:${e.media_content_id}`)}"
        @pointerdown=${(t) => this._down(t, e)}
        @pointermove=${this._moved}
        @pointerup=${(e) => this._let(e, "jb-drop")}
        @pointercancel=${(e) => this._let(e, "jb-cancel")}
        @click=${this._tap}
        @contextmenu=${(e) => e.preventDefault()}
        @dragstart=${(e) => e.preventDefault()}
      >
        ${this._inside(e)}
      </div>` : b`<div class="row ${this.waiting(`fav:${e.media_content_id}`)}">${this._inside(e)}</div>`;
	}
	_inside(e) {
		let t = () => D(this, "jb-choose", e), n = e.can_expand;
		return b`
      <button class="t" ?disabled=${!n && !e.can_play} @click=${() => n ? this._open(e) : t()}>
        ${q(this.hass, e.picture, e.title)}
        <span><b>${e.title}</b>${e.by ? b`<small>${e.by}</small>` : S}</span>
        ${n ? W("chevron") : S}
      </button>
      ${e.can_play ? b`<button class="ib" @click=${t} aria-label="Play ${e.title}, or add it to the queue">${W("plus")}</button>` : S}`;
	}
	_results() {
		return this._why ? b`<p class="note">The search couldn't be made: ${this._why}</p>` : this._found ? this._found.map((e) => {
			let t = [...new Set(e.items.map((e) => e.folder))];
			return b`<h3>${e.name}</h3>
        ${e.why ? b`<p class="note">${e.name} couldn't be searched: ${e.why}</p>` : e.items.length ? S : b`<p class="note">Nothing found.</p>`}
        ${t.map((t) => b`<h4>${t}</h4>${e.items.filter((e) => e.folder === t).map((e) => this._row(e))}`)}`;
		}) : b`<p class="note">Searching the music library and Spotify…</p>`;
	}
	_browsing() {
		let e = this._trail[this._trail.length - 1];
		return e ? b`<div class="where">
        ${this._trail.length > 1 ? b`<button class="ib" @click=${() => this._trail = this._trail.slice(0, -1)} aria-label="Back">${W("back")}</button>` : S}
        <h3>${e.title}</h3>
      </div>
      ${e.why ? b`<p class="note">This couldn't be opened: ${e.why}</p>` : e.items ? e.items.length ? e.items.map((e) => this._row(e)) : b`<p class="note">There is nothing here.</p>` : b`<p class="note">Asking the speaker…</p>`}` : S;
	}
	render() {
		let e = this._query.trim() && this._trail.length < 2;
		return b`<label class="box">
        ${W("search")}
        <input type="text" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="A song, an album or an artist" aria-label="Search the music library and Spotify" @input=${this._type} />
        ${this._query ? b`<button class="ib" @click=${this._clear} aria-label="Clear the search">${W("close")}</button>` : S}
      </label>
      ${e ? this._results() : this._browsing()}`;
	}
	static {
		this.styles = [Y, o`
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
      /* A long press is for lifting the row: not for selecting its words, or the menu a
         phone offers for a picture. */
      .row.carry { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      .row.lifted { opacity: 0.35; }
    `];
	}
}, hr = "casa-mia-jukebox-rooms", gr = class extends E {
	constructor(...e) {
		super(...e), this.heading = !0, this.silent = !0;
	}
	static {
		this.properties = {
			house: { attribute: !1 },
			heading: { type: Boolean },
			silent: { type: Boolean }
		};
	}
	render() {
		let { hass: e, house: t } = this;
		if (!e || !t) return S;
		let n = t.groups.filter((e) => e.quiet), r = this.silent ? Object.values(t.rooms).filter((e) => !e.available) : [];
		return b`${n.length ? b`${this.heading ? b`<h2>Quiet rooms: tap one to play something there</h2>` : S}
            <div class="chips">${n.map((n) => b`<button @click=${() => X(e, n.id, "favourites")}>${W("rooms")}${t.rooms[n.id].name}</button>`)}</div>` : S}
      ${r.length ? b`<h2>Not answering</h2><p class="none">${r.map((e) => e.name).join(", ")}</p>` : S}`;
	}
	static {
		this.styles = [Y, o`
      :host { display: block; color: var(--primary-text-color); font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      h2 { margin: 22px 0 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--secondary-text-color); }
      h2:first-child { margin-top: 0; }
      .chips + h2 { margin-top: 22px; }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chips button { display: flex; align-items: center; gap: 6px; padding: 8px 14px 8px 10px; border-radius: 999px; border: 1px solid var(--divider-color); background: var(--card-background-color); font-weight: 600; }
      .chips svg { width: 18px; height: 18px; color: var(--secondary-text-color); }
      .none { margin: 0; color: var(--secondary-text-color); overflow-wrap: anywhere; }
    `];
	}
};
O(un, pn), O(mn, hn), O(or, sr), O(ur, dr), O(fr, mr), O(hr, gr), O(Sn, Dn), O(_n, xn), O(On, Nn), O(Pn, Fn), O(Kn, Jn), O(Yn, Zn), O(Qn, $n), O(In, Un), O(Ln, ar), O(er, Ye), k(Pn, "Casa Mia Jukebox: players", "What is playing on the Sonos speakers, with pause, skip and volume. A tap opens the big player."), k(In, "Casa Mia Jukebox: micro player", "Only the picture of what a room is playing, small enough for a sidebar, marked when it is playing, paused or muted. A tap opens the big player."), k(Kn, "Casa Mia Jukebox: quiet rooms", "The rooms that are playing nothing, each a tap from its favourites."), k(Yn, "Casa Mia Jukebox: shortcut", "A button that plays one favourite in the rooms you choose."), k(Qn, "Casa Mia Jukebox: now playing", "The whole player for one room, in place: artwork, controls, queue, rooms, favourites and search."), lr(), tt("Jukebox", Ot, Dt);
//#endregion
