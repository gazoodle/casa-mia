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
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: p, getPrototypeOf: m } = Object, h = globalThis, g = h.trustedTypes, _ = g ? g.emptyScript : "", v = h.reactiveElementPolyfillSupport, y = (e, t) => e, b = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? _ : null;
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
}, x = (e, t) => !l(e, t), S = {
	attribute: !0,
	type: String,
	converter: b,
	reflect: !1,
	useDefault: !1,
	hasChanged: x
};
Symbol.metadata ??= Symbol("metadata"), h.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var C = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = S) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? S;
	}
	static _$Ei() {
		if (this.hasOwnProperty(y("elementProperties"))) return;
		let e = m(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(y("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(y("properties"))) {
			let e = this.properties, t = [...f(e), ...p(e)];
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
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? x)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
C.elementStyles = [], C.shadowRootOptions = { mode: "open" }, C[y("elementProperties")] = /* @__PURE__ */ new Map(), C[y("finalized")] = /* @__PURE__ */ new Map(), v?.({ ReactiveElement: C }), (h.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var w = globalThis, ee = (e) => e, T = w.trustedTypes, te = T ? T.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ne = "$lit$", E = `lit$${Math.random().toFixed(9).slice(2)}$`, re = "?" + E, ie = `<${re}>`, D = document, O = () => D.createComment(""), k = (e) => e === null || typeof e != "object" && typeof e != "function", A = Array.isArray, ae = (e) => A(e) || typeof e?.[Symbol.iterator] == "function", j = "[ 	\n\f\r]", M = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, oe = /-->/g, se = />/g, N = RegExp(`>|${j}(?:([^\\s"'>=/]+)(${j}*=${j}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ce = /'/g, le = /"/g, ue = /^(?:script|style|textarea|title)$/i, P = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), F = Symbol.for("lit-noChange"), I = Symbol.for("lit-nothing"), de = /* @__PURE__ */ new WeakMap(), L = D.createTreeWalker(D, 129);
function fe(e, t) {
	if (!A(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return te === void 0 ? t : te.createHTML(t);
}
var pe = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = M;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === M ? c[1] === "!--" ? o = oe : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = N) : (ue.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = N) : o = se : o === N ? c[0] === ">" ? (o = i ?? M, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? N : c[3] === "\"" ? le : ce) : o === le || o === ce ? o = N : o === oe || o === se ? o = M : (o = N, i = void 0);
		let d = o === N && e[t + 1].startsWith("/>") ? " " : "";
		a += o === M ? n + ie : l >= 0 ? (r.push(s), n.slice(0, l) + ne + n.slice(l) + E + d) : n + E + (l === -2 ? t : d);
	}
	return [fe(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, R = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = pe(t, n);
		if (this.el = e.createElement(l, r), L.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = L.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ne)) {
					let t = u[o++], n = i.getAttribute(e).split(E), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? he : r[1] === "?" ? ge : r[1] === "@" ? _e : V
					}), i.removeAttribute(e);
				} else e.startsWith(E) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ue.test(i.tagName)) {
					let e = i.textContent.split(E), t = e.length - 1;
					if (t > 0) {
						i.textContent = T ? T.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], O()), L.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], O());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === re) c.push({
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
		let n = D.createElement("template");
		return n.innerHTML = e, n;
	}
};
function z(e, t, n = e, r) {
	if (t === F) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = k(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = z(e, i._$AS(e, t.values), i, r)), t;
}
var me = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? D).importNode(t, !0);
		L.currentNode = r;
		let i = L.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new B(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new ve(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = L.nextNode(), a++);
		}
		return L.currentNode = D, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, B = class e {
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
		e = z(this, e, t), k(e) ? e === I || e == null || e === "" ? (this._$AH !== I && this._$AR(), this._$AH = I) : e !== this._$AH && e !== F && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ae(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== I && k(this._$AH) ? this._$AA.nextSibling.data = e : this.T(D.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = R.createElement(fe(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new me(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = de.get(e.strings);
		return t === void 0 && de.set(e.strings, t = new R(e)), t;
	}
	k(t) {
		A(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(O()), this.O(O()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ee(e).nextSibling;
			ee(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, V = class {
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
		if (i === void 0) e = z(this, e, t, 0), a = !k(e) || e !== this._$AH && e !== F, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = z(this, r[n + o], t, o), s === F && (s = this._$AH[o]), a ||= !k(s) || s !== this._$AH[o], s === I ? e = I : e !== I && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === I ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, he = class extends V {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === I ? void 0 : e;
	}
}, ge = class extends V {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== I);
	}
}, _e = class extends V {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = z(this, e, t, 0) ?? I) === F) return;
		let n = this._$AH, r = e === I && n !== I || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== I && (n === I || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, ve = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		z(this, e);
	}
}, ye = w.litHtmlPolyfillSupport;
ye?.(R, B), (w.litHtmlVersions ??= []).push("3.3.3");
var be = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new B(t.insertBefore(O(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, H = globalThis, U = class extends C {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = be(t, this.renderRoot, this.renderOptions);
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
U._$litElement$ = !0, U.finalized = !0, H.litElementHydrateSupport?.({ LitElement: U });
var xe = H.litElementPolyfillSupport;
xe?.({ LitElement: U }), (H.litElementVersions ??= []).push("4.2.2");
var W = {
	about: "The layout options shared by the Camera Commander (drawn by the compositor, edited on the Camera Dashboard page) and the Tablet layout card (laid out in the browser, edited in Lovelace): one engine, two places (compositor.commander_layout, integration/cards/src/layout.ts, checked against tests/layout_cases.json). Each option: label, help ({item} is camera or card), default, and `for` when only one of them has it. Read by the compositor's defaults, the admin page and the cards' editors.",
	main: {
		gap: {
			label: "Gap, px",
			default: 4,
			min: 0,
			max: 64,
			help: "The room between tiles and panels."
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
		}
	},
	panel: {
		size: {
			label: "Size, %",
			min: 0,
			max: 100,
			help: "Left and right: % of the width. Top and bottom: % of the height."
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
			for: "tablet",
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
function G(e, t, n) {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}
async function K(e, t, n) {
	await customElements.whenDefined("hui-card");
	let r = document.createElement("hui-card");
	return r.hass = t, r.preview = n, r.config = e, r.load(), r;
}
var q = (e) => !e.hasAttribute("hidden") && e.style.display !== "none";
function Se(e) {
	history.pushState(null, "", e), G(window, "location-changed", { replace: !1 });
}
async function Ce() {
	return await (await window.loadCardHelpers()).createCardElement({
		type: "vertical-stack",
		cards: []
	}), await customElements.whenDefined("hui-vertical-stack-card"), customElements.get("hui-vertical-stack-card").getConfigElement();
}
function J(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !1,
		documentationURL: "https://github.com/gazoodle/casa-mia"
	});
}
var we = W.main, Te = W.panel;
function Ee(e, t) {
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
function De(e) {
	return Object.entries(we).filter(([, t]) => (!t.when || t.when.includes(e)) && (!t.for || t.for === "tablet")).map(([e, t]) => Ee(e, t));
}
function Oe(e) {
	return Object.entries(Te).filter(([, t]) => (!t.edge || e === "top" || e === "bottom") && (!t.for || t.for === "tablet")).map(([e, t]) => Ee(e, t));
}
var ke = {
	...we,
	...Te,
	aspect: {
		label: "Shape",
		help: "Width:height where it is not the whole screen (in a column): e.g. 16:10, 4:3."
	}
}, Ae = (e) => ke[e.name]?.label ?? e.name, je = (e) => ke[e.name]?.help?.replaceAll("{item}", "card"), Me = 100, Y = (e) => e.parentElement ?? (e.getRootNode().host || null);
function Ne(e) {
	for (let t = Y(e); t; t = Y(t)) {
		let e = t.tagName ?? "";
		if (e === "HUI-PANEL-VIEW") return !0;
		if (e.includes("-") && e !== "HUI-CARD") return !1;
	}
	return !1;
}
function Pe(e) {
	for (let t = e; t; t = Y(t)) if (t.tagName?.startsWith("HUI-DIALOG") || t.tagName === "HA-DIALOG") return !0;
	return !1;
}
function Fe(e) {
	let t = e.getBoundingClientRect().top + window.scrollY, n = window.visualViewport?.height ?? window.innerHeight;
	return Math.max(Me, Math.floor(n - t));
}
function Ie(e) {
	return {
		locked: Ne(e),
		room: Fe(e),
		preview: Pe(e)
	};
}
function Le(e, t, n) {
	return e.preview ? Math.round(t / n) : e.locked ? e.room : Math.min(Math.round(t / n), e.room);
}
function Re(e) {
	return window.addEventListener("resize", e), window.visualViewport?.addEventListener("resize", e), () => {
		window.removeEventListener("resize", e), window.visualViewport?.removeEventListener("resize", e);
	};
}
function ze(e) {
	let t = e?.config?.views ?? [], n = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] ?? "");
	return (t.find((e, t) => (e.path ?? String(t)) === n) ?? t[Number(n)] ?? t[0])?.type === "panel";
}
//#endregion
//#region src/section.ts
var Be = (e) => e.view_layout?.counts !== !1;
function Ve(e) {
	let t = e, n = {
		...t.getGridOptions?.() ?? t._element?.getGridOptions?.() ?? {},
		...e.config?.grid_options
	};
	return {
		columns: n.columns === "full" ? 12 : Math.min(12, Math.max(1, Number(n.columns) || 12)),
		rows: typeof n.rows == "number" ? n.rows : "auto"
	};
}
var He = class extends U {
	constructor(...e) {
		super(...e), this.preview = !1, this._cards = [], this.frame = 0, this.changed = (e) => {
			e.stopPropagation(), this.schedule();
		};
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			preview: { type: Boolean },
			_cards: { state: !0 }
		};
	}
	static getConfigElement() {
		return document.createElement("casa-mia-section-editor");
	}
	static getStubConfig() {
		return { cards: [{
			type: "heading",
			heading: "Warnings",
			view_layout: { counts: !1 }
		}, {
			type: "markdown",
			content: "Each card here can have its own visibility; the section hides when none shows."
		}] };
	}
	setConfig(e) {
		if (!Array.isArray(e.cards)) throw Error("cards: a list of cards");
		this._config = e, Promise.all(e.cards.map((e) => K(e, this.hass, this.preview))).then((t) => {
			this._config === e && (this._cards = t);
		});
	}
	getCardSize() {
		return this._cards.length;
	}
	getGridOptions() {
		return {
			columns: "full",
			rows: "auto"
		};
	}
	connectedCallback() {
		super.connectedCallback(), this.renderRoot.addEventListener("card-visibility-changed", this.changed);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.renderRoot.removeEventListener("card-visibility-changed", this.changed), cancelAnimationFrame(this.frame);
	}
	schedule() {
		cancelAnimationFrame(this.frame), this.frame = requestAnimationFrame(() => this.check());
	}
	updated(e) {
		for (let t of this._cards) e.has("hass") && (t.hass = this.hass), e.has("preview") && (t.preview = this.preview);
		this.schedule();
	}
	check() {
		this._cards.forEach((e) => {
			let t = e.parentElement;
			if (!t) return;
			let n = Ve(e);
			t.style.gridColumn = `span ${n.columns}`, t.style.gridRow = n.rows === "auto" ? "" : `span ${n.rows}`, t.style.height = n.rows === "auto" ? "" : `calc(${n.rows} * var(--row-height, 56px) + ${n.rows - 1} * var(--row-gap, 8px))`, t.hidden = !q(e);
		});
		let e = this.preview || this._cards.some((e, t) => Be(this._config.cards[t]) && q(e));
		this.hidden === e && (this.hidden = !e, G(this, "card-visibility-changed", { value: e }));
	}
	render() {
		return P`<div class="grid">${this._cards.map((e) => P`<div class="cell">${e}</div>`)}</div>`;
	}
	static {
		this.styles = o`
    :host([hidden]) {
      display: none;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      grid-auto-rows: minmax(var(--row-height, 56px), auto);
      gap: var(--row-gap, 8px) var(--column-gap, 8px);
    }
    .cell[hidden] {
      display: none;
    }
    .cell > * {
      height: 100%;
    }
  `;
	}
}, Ue = [
	["", "Its own"],
	["3", "Quarter"],
	["4", "Third"],
	["6", "Half"],
	["8", "Two thirds"],
	["12", "Full"]
];
function We(e) {
	let t = e.heading ?? e.title ?? e.name ?? e.entity ?? (e.content ? String(e.content).slice(0, 30) : "");
	return `${String(e.type).replace(/^custom:/, "")}${t ? `: ${t}` : ""}`;
}
async function Ge(e, t, n, r, i) {
	let a = await Ce();
	return a.hass = t, a.lovelace = n, a.setConfig({
		type: "vertical-stack",
		cards: r
	}), a.addEventListener("config-changed", (e) => {
		e.stopPropagation(), i(e.detail.config.cards ?? []);
	}), e.replaceChildren(a), a;
}
var Ke = class extends U {
	static {
		this.properties = {
			hass: { attribute: !1 },
			lovelace: { attribute: !1 },
			_config: { state: !0 }
		};
	}
	setConfig(e) {
		this._config = e, this.stack?.setConfig({
			type: "vertical-stack",
			cards: e.cards
		});
	}
	firstUpdated() {
		Ge(this.renderRoot.querySelector(".stack"), this.hass, this.lovelace, this._config?.cards ?? [], (e) => this.save({
			...this._config,
			cards: e
		})).then((e) => this.stack = e);
	}
	updated(e) {
		this.stack && e.has("hass") && (this.stack.hass = this.hass);
	}
	save(e) {
		this._config = e, G(this, "config-changed", { config: e });
	}
	setCard(e, t) {
		let n = structuredClone(this._config.cards);
		t(n[e]), n[e].view_layout && !Object.keys(n[e].view_layout).length && delete n[e].view_layout, n[e].grid_options && !Object.keys(n[e].grid_options).length && delete n[e].grid_options, this.save({
			...this._config,
			cards: n
		}), this.stack?.setConfig({
			type: "vertical-stack",
			cards: n
		});
	}
	render() {
		return this._config ? P`
      <p class="help">The section hides while none of the cards that count is showing (each card's own visibility). A heading that should only show with them: switch off Counts.</p>
      <div class="rows">
        ${this._config.cards.map((e, t) => P`<div class="row">
            <span class="name">${t + 1}. ${We(e)}</span>
            <label
              >Counts
              <ha-switch
                .checked=${Be(e)}
                @change=${(e) => this.setCard(t, (t) => {
			let n = e.target.checked;
			t.view_layout = { ...t.view_layout }, n ? delete t.view_layout.counts : t.view_layout.counts = !1;
		})}
              ></ha-switch
            ></label>
            <select
              .value=${String(e.grid_options?.columns === "full" ? 12 : e.grid_options?.columns ?? "")}
              @change=${(e) => this.setCard(t, (t) => {
			let n = e.target.value;
			t.grid_options = { ...t.grid_options }, n ? t.grid_options.columns = Number(n) : delete t.grid_options.columns;
		})}
            >
              ${Ue.map(([e, t]) => P`<option value=${e}>${t}</option>`)}
            </select>
          </div>`)}
      </div>
      <div class="stack"></div>
    ` : I;
	}
	static {
		this.styles = o`
    .help {
      color: var(--secondary-text-color);
      margin: 0 0 8px;
    }
    .rows {
      display: grid;
      gap: 4px;
      margin-bottom: 16px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    label {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `;
	}
};
customElements.define("casa-mia-section", He), customElements.define("casa-mia-section-editor", Ke), J("casa-mia-section", "Casa Mia section", "A section's grid of cards that hides itself while none of the cards that count is showing.");
//#endregion
//#region src/layout.ts
var X = [
	"left",
	"top",
	"right",
	"bottom"
], qe = [
	"stack",
	"reverse",
	"centre"
];
function Z(e) {
	let t = Math.floor(e), n = e - t;
	return n > .5 ? t + 1 : n < .5 || t % 2 == 0 ? t : t + 1;
}
var Q = (e, t) => Math.floor(e / t);
function Je(e, t, n, r) {
	let [i, a, o, s] = e, c = n ? s : o, l = Array.from({ length: t + 1 }, (e, n) => Z(n * (c - (t - 1) * r) / t + n * r)), u = Array.from({ length: t }, (e, n) => [l[n], l[n + 1] - l[n] - (n < t - 1 ? r : 0)]);
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
function Ye(e, t, n, r, i) {
	let [a, o, s, c] = e, [l, u] = n ? [s, c] : [c, s], d = t.map((e) => n ? l / e : l * e), f = u - r * (t.length - 1), p = d.reduce((e, t) => e + t, 0), m = p > 0 && f > 0 ? Math.min(1, f / p) : 0, h = Math.trunc(l * m);
	d = d.map((e) => Math.trunc(e * m));
	let g = d.reduce((e, t) => e + t, 0) + r * (t.length - 1), _ = i === "reverse" ? u - g : i === "centre" ? Q(u - g, 2) : 0, v = Q(l - h, 2);
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
function Xe(e, t, n, r, i, a, o) {
	n = Math.max(1, Math.min(n, t));
	let s = Je(e, n, !r, i), c = [], l = 0;
	return s.forEach((e, s) => {
		let u = Math.floor(t / n) + +(s < t % n);
		c.push(...a === null ? Je(e, u, r, i) : Ye(e, a.slice(l, l + u), r, i, o)), l += u;
	}), c;
}
function Ze(e) {
	let t;
	if (typeof e == "number") t = e;
	else {
		let [n, r] = String(e).trim().replace("/", ":").split(":");
		t = r === void 0 ? Number(n) : Number(n) / Number(r);
	}
	if (!(t > 0)) throw Error(`not a shape: ${e}`);
	return t;
}
var $ = (e) => W.main[e].default;
function Qe(e, t) {
	let n = e.main_fit ?? $("main_fit");
	return n === "fixed" ? Ze(e.main_ratio ?? $("main_ratio")) : n === "own" ? Number((e.aspects ?? {})[t ?? ""] || 16 / 9) : null;
}
function $e(e, t = null) {
	let { width: n, height: r, gap: i } = e, a = Qe(e, t), o = (t) => e[t].cameras.length > 0, s = (t, n) => o(t) ? Z(n * e[t].size / 100) : 0, c = (t, n) => {
		let r = `anchor_${n}`;
		return !!(e[t][r] ?? W.panels[t][r]);
	}, l, u, d, f, p = 0, m = 0;
	if (a === null) [l, u, d, f] = [
		s("left", n),
		s("right", n),
		s("top", r),
		s("bottom", r)
	];
	else {
		let t = Number(e.panel_min ?? $("panel_min")), s = (e, n, r) => (Number(o(n)) + Number(o(r))) * (Z(e * t / 100) + i), c = n - s(n, "left", "right"), h = r - s(r, "top", "bottom");
		p = Math.min(Z(n * Number(e.main_width ?? $("main_width")) / 100), c), m = Z(p / a), m > h && ([m, p] = [h, Z(h * a)]);
		let g = (e, t, n) => {
			let [r, a] = [o(t), o(n)], s = Math.max(e - i * (Number(r) + Number(a)), 0);
			return r && a ? [Q(s, 2), s - Q(s, 2)] : r ? [s, 0] : a ? [0, s] : [0, 0];
		};
		[l, u] = g(n - p, "left", "right"), [d, f] = g(r - m, "top", "bottom");
	}
	let h = l + (l ? i : 0), g = n - u - (u ? i : 0), _ = d + (d ? i : 0), v = r - f - (f ? i : 0), y = (e, t, r) => {
		let i = c(e, "left") ? 0 : h;
		return [
			i,
			t,
			(c(e, "right") ? n : g) - i,
			r
		];
	}, b = (e, t, n) => {
		let i = d && c("top", n) ? _ : 0;
		return [
			e,
			i,
			t,
			(f && c("bottom", n) ? v : r) - i
		];
	}, x = {
		top: y("top", 0, d),
		bottom: y("bottom", r - f, f),
		left: b(0, l, "left"),
		right: b(n - u, u, "right")
	}, S = (t) => qe.includes(e[t].fit ?? "") ? e[t].cameras.map((t) => Number((e.aspects ?? {})[t] || 16 / 9)) : null, C = Object.fromEntries(X.map((t) => [t, o(t) ? Xe(x[t], e[t].cameras.length, Math.trunc(Number(e[t].lines ?? 1)), t === "left" || t === "right", i, S(t), e[t].fit ?? "cover") : []])), w = [
		h,
		_,
		g - h,
		v - _
	];
	return a !== null && (p = Math.min(p, g - h), m = Math.min(m, v - _), w = [
		h + Q(g - h - p, 2),
		_ + Q(v - _ - m, 2),
		p,
		m
	]), [
		[n, r],
		w,
		C
	];
}
//#endregion
//#region src/commander.ts
var et = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", tt = 4096e3, nt = 64, rt = 400;
function it(e, t, n) {
	let r = Math.min(1, Math.sqrt(tt / (e * n * t * n))), [i, a] = [8 * Z(e * n * r / 8), 8 * Z(t * n * r / 8)];
	return Math.min(i, a) >= nt ? [
		i,
		a,
		Math.round(n * r * 100) / 100 || 1
	] : null;
}
function at(e) {
	return Object.entries(e.states).filter(([e, t]) => e.startsWith("select.") && (t.attributes.card || t.attributes.draft_card)).map(([e, t]) => ({
		value: e,
		label: String(t.attributes.friendly_name ?? e)
	}));
}
var ot = class extends U {
	constructor(...e) {
		super(...e), this._natural = "", this._size = null, this._box = [0, 0], this._fit = null, this.settle = 0, this.resize = new ResizeObserver(([e]) => {
			let { width: t, height: n } = e.contentRect;
			this._box = [Math.round(t * 10) / 10, Math.round(n * 10) / 10], this.measure(), this.debugOn() && this.requestUpdate();
			let r = it(t, n, window.devicePixelRatio || 1);
			clearTimeout(this.settle), String(r) !== String(this._size) && (this._size ? this.settle = window.setTimeout(() => this._size = r, rt) : this._size = r);
		}), this.measure = () => {
			let e = Ie(this);
			JSON.stringify(e) !== JSON.stringify(this._fit) && (this._fit = e);
		};
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			_config: { state: !0 },
			_size: { state: !0 },
			_natural: { state: !0 },
			_fit: { state: !0 }
		};
	}
	debugOn() {
		return !!((this._config?.entity ? this.hass?.states[this._config.entity] : void 0)?.attributes[this._config?.draft ? "draft_card" : "card"])?.layout.debug?.on;
	}
	connectedCallback() {
		super.connectedCallback(), this.unwatch = Re(this.measure), requestAnimationFrame(this.measure);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unwatch?.(), this.resize.disconnect(), clearTimeout(this.settle);
	}
	updated() {
		let e = this.renderRoot.querySelector(".box");
		e && this.resize.observe(e);
		let t = this.renderRoot.querySelector(".picture"), n = t?.naturalWidth ? `${t.naturalWidth} x ${t.naturalHeight}` : "";
		this.debugOn() && n && n !== this._natural && (this._natural = n);
	}
	static getConfigElement() {
		return document.createElement("casa-mia-commander-editor");
	}
	static getStubConfig(e) {
		return { entity: at(e)[0]?.value ?? "" };
	}
	setConfig(e) {
		this._config = e;
	}
	getCardSize() {
		return 6;
	}
	getGridOptions() {
		return {
			columns: "full",
			rows: "auto"
		};
	}
	main(e, t) {
		let n = Object.entries(e.cameras).find(([, e]) => e.title === t);
		return n ? n[0] : e.start;
	}
	render() {
		let e = this._config?.entity ? this.hass?.states[this._config.entity] : void 0, t = e?.attributes[this._config?.draft ? "draft_card" : "card"];
		if (!t) return P`<ha-card
        ><div class="note">
          ${this._config?.entity ? e ? `${this._config.draft ? "No saved draft" : "Not deployed live yet"} for this commander` : `No commander at ${this._config.entity}` : "Choose a commander"}
        </div></ha-card
      >`;
		if (!t.picture) return P`<ha-card><div class="note">Its picture's address is not known yet (the app has no LAN address).</div></ha-card>`;
		let n = this.main(t, e.state), r = t.layout, [i, a, o] = this._size ?? [
			r.width,
			r.height,
			1
		], s = this._size ? {
			...r,
			width: i,
			height: a,
			gap: Z(r.gap * o)
		} : r, [[c, l], u, d] = $e(s, n), f = ([e, t, n, r]) => `left:${e / c * 100}%;top:${t / l * 100}%;width:${n / c * 100}%;height:${r / l * 100}%`, p = s.highlight ?? {}, m = X.flatMap((e) => s[e].cameras.map((t, n) => [t, d[e][n]])).find(([e]) => e === n)?.[1], h = this._fit, g = !h || h.preview ? "" : h.locked ? `;height:${h.room}px` : `;max-height:${h.room}px`;
		return P`<ha-card style="aspect-ratio:${r.width}/${r.height}${g}">
      <div class="box">
        ${this._size ? P`<img
              class="picture"
              src="${t.picture}?w=${i}&h=${a}&dpr=${o}"
              alt=""
              @load=${(e) => {
			let t = e.target;
			this._natural = `${t.naturalWidth} x ${t.naturalHeight}`;
		}}
            />` : I}
        ${r.debug?.on ? P`<div class="debug" style="color:${r.debug.colour ?? "#ffd60a"}">
              card box ${this._box[0]} x ${this._box[1]} CSS px, screen ${window.devicePixelRatio}x<br />
              asked ${this._size ? `${i} x ${a} @${o}x` : "nothing yet"}; picture ${this._natural || "not loaded"}
            </div>` : I}
        ${X.flatMap((e) => s[e].cameras.map((r, i) => d[e][i][2] > 0 && r !== n ? P`<div class="zone" style=${f(d[e][i])} title=${t.cameras[r]?.title ?? r} @click=${() => this.choose(t, r)}></div>` : I))}
        <div class="zone" style=${f(u)} @click=${() => this.open(t, n)}></div>
        ${m && m[2] > 0 ? P`<img
              class="highlight"
              src="${et}#cm-highlight"
              alt=""
              style="${f(m)};border:${p.width}px solid ${p.colour};box-shadow:0 0 ${p.blur}px ${p.colour};--cm-colour:${p.colour};--cm-blur:${p.blur}px;--cm-pulse:${p.pulse}s;--cm-style:${p.style}"
            />` : I}
      </div>
    </ha-card>`;
	}
	choose(e, t) {
		this.hass?.callService("select", "select_option", { option: e.cameras[t]?.title }, { entity_id: this._config.entity });
	}
	open(e, t) {
		let n = this._config?.tap_main ?? "live";
		n === "live" && e.cameras[t] ? Se(e.cameras[t].live) : n === "more-info" && G(this, "hass-more-info", { entityId: t });
	}
	static {
		this.styles = o`
    :host {
      display: block;
      height: 100%;
    }
    /* Exactly the space it is given (a panel view, a Tablet layout tile); given no height,
       its aspect-ratio sets one. The width must be set too: with only the height set,
       aspect-ratio would make the width (16:9 of the height), wider than the screen. */
    ha-card {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: none;
      border: none;
      box-shadow: none;
    }
    .box {
      position: absolute;
      inset: 0;
    }
    .picture {
      display: block;
      width: 100%;
      height: 100%;
    }
    .zone,
    .highlight {
      position: absolute;
      box-sizing: border-box;
    }
    .zone {
      cursor: pointer;
    }
    .highlight {
      pointer-events: none;
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
  `;
	}
}, st = class extends U {
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
		if (!this.hass || !this._config) return I;
		let e = [
			{
				name: "entity",
				selector: { select: {
					mode: "dropdown",
					options: at(this.hass)
				} }
			},
			{
				name: "draft",
				selector: { boolean: {} }
			},
			{
				name: "tap_main",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: "live",
							label: "Opens its live page"
						},
						{
							value: "more-info",
							label: "Opens its more-info"
						},
						{
							value: "none",
							label: "Nothing"
						}
					]
				} }
			}
		], t = {
			entity: "Commander",
			draft: "Show the draft",
			tap_main: "A tap on the main camera"
		};
		return P`<ha-form
      .hass=${this.hass}
      .data=${{
			tap_main: "live",
			...this._config
		}}
      .schema=${e}
      .computeLabel=${(e) => t[e.name]}
      .computeHelper=${(e) => e.name === "entity" ? "The commanders built on the Camera Dashboard page (each one's Main camera select)." : e.name === "draft" ? "As saved on the Camera Dashboard page (Save draft), before it is deployed live: for trying changes out. Off: as deployed live." : void 0}
      @value-changed=${(e) => {
			e.stopPropagation(), this._config = e.detail.value, G(this, "config-changed", { config: this._config });
		}}
    ></ha-form>`;
	}
};
customElements.define("casa-mia-commander", ot), customElements.define("casa-mia-commander-editor", st), J("casa-mia-commander", "Casa Mia Camera Commander", "One of the Camera Dashboard's commanders: tap a camera to make it the main one.");
//#endregion
//#region src/tablet.ts
var ct = class extends HTMLElement {
	setConfig() {}
};
customElements.define("casa-mia-probe", ct);
var lt = "16:10", ut = class extends U {
	constructor(...e) {
		super(...e), this.preview = !1, this._items = [], this.probes = {}, this.frame = 0, this.resize = new ResizeObserver(() => this.schedule()), this.changed = (e) => {
			e.stopPropagation(), this.schedule();
		}, this.later = () => this.schedule();
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			preview: { type: Boolean },
			_items: { state: !0 }
		};
	}
	static getConfigElement() {
		return document.createElement("casa-mia-tablet-layout-editor");
	}
	static getStubConfig() {
		return {
			main: {
				type: "markdown",
				content: "## Main\nA Camera Commander card goes well here."
			},
			left: { cards: [{
				type: "markdown",
				content: "Left"
			}] },
			bottom: { cards: [{
				type: "markdown",
				content: "Bottom"
			}] }
		};
	}
	setConfig(e) {
		this._config = e;
		let t = [...e.main ? [["main", e.main]] : [], ...X.flatMap((t) => (e[t]?.cards ?? []).map((e) => [t, e]))];
		Promise.all(t.map(([, e]) => K(e, this.hass, this.preview))).then(async (n) => {
			let r = {};
			for (let t of X) e[t]?.visibility?.length && (r[t] = await K({
				type: "custom:casa-mia-probe",
				visibility: e[t].visibility
			}, this.hass, this.preview));
			this._config === e && (this.probes = r, this._items = n.map((e, n) => ({
				place: t[n][0],
				el: e
			})));
		});
	}
	getCardSize() {
		return 12;
	}
	getGridOptions() {
		return {
			columns: "full",
			rows: "auto"
		};
	}
	connectedCallback() {
		super.connectedCallback(), this.renderRoot.addEventListener("card-visibility-changed", this.changed), this.unwatch = Re(this.later), this.resize.observe(this);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.renderRoot.removeEventListener("card-visibility-changed", this.changed), this.unwatch?.(), this.resize.disconnect(), cancelAnimationFrame(this.frame);
	}
	schedule() {
		cancelAnimationFrame(this.frame), this.frame = requestAnimationFrame(() => this.place());
	}
	updated(e) {
		for (let t of [...this._items.map((e) => e.el), ...Object.values(this.probes)]) e.has("hass") && (t.hass = this.hass), e.has("preview") && (t.preview = this.preview);
		if (e.has("_items")) for (let e of this.renderRoot.querySelectorAll(".inner")) this.resize.observe(e);
		this.schedule();
	}
	settings(e, t) {
		let n = this._config, r = {
			width: e,
			height: t,
			aspects: {}
		};
		for (let e of Object.keys(W.main)) r[e] = n[e] ?? W.main[e].default;
		for (let e of X) {
			let t = n[e] ?? {}, i = !t.hidden && (!this.probes[e] || q(this.probes[e])), a = i ? this._items.flatMap((t, n) => t.place === e && q(t.el) ? [String(n)] : []) : [], o = i && !a.length && t.hide_empty === !1 && (t.cards?.length ?? 0) > 0;
			r[e] = {
				...W.panels[e],
				...t,
				cameras: o ? [`${e}-empty`] : a
			};
		}
		return r;
	}
	place() {
		let e = this.renderRoot.querySelector(".view");
		if (!e || !this._config) return;
		let t = this.clientWidth, n = 16 / 10;
		try {
			n = Ze(this._config.aspect ?? lt);
		} catch {}
		let r = Le(Ie(this), t, n);
		if (e.style.height = `${r}px`, !t) return;
		let i = this.settings(t, r), a = this._items.findIndex((e) => e.place === "main"), o = a >= 0 && q(this._items[a].el) ? String(a) : null, s = (e) => this._items[e].el.parentElement, c = (e) => {
			for (let [t, n] of e) Object.assign(s(t).style, {
				width: `${n}px`,
				height: "auto"
			});
			return e.map(([e]) => s(e).offsetHeight || 1);
		}, [, l, u] = $e({
			...i,
			...Object.fromEntries(X.map((e) => [e, {
				...i[e],
				fit: "cover"
			}]))
		}, o), d = [];
		for (let e of X) qe.includes(i[e].fit ?? "") && i[e].cameras.forEach((t, n) => Number.isInteger(Number(t)) && d.push([Number(t), u[e][n][2]]));
		o && i.main_fit === "own" && d.push([Number(o), l[2]]), c(d).forEach((e, t) => i.aspects[String(d[t][0])] = d[t][1] / e);
		let [, f, p] = $e(i, o), m = /* @__PURE__ */ new Map(), h = (e) => e === "cover" || e === "fill" || e === "crop";
		for (let e of X) i[e].cameras.forEach((t, n) => Number.isInteger(Number(t)) && m.set(Number(t), [p[e][n], h(i[e].fit)]));
		o && m.set(Number(o), [f, h(i.main_fit)]);
		let g = [...m].filter(([, [, e]]) => !e), _ = c(g.map(([e, [t]]) => [e, t[2]])), v = new Map(g.map(([e], t) => [e, _[t]]));
		this._items.forEach((e, t) => {
			let n = s(t).parentElement, r = m.get(t);
			if (n.hidden = !r || r[0][2] <= 0 || r[0][3] <= 0, n.hidden) return;
			let [[i, a, o, c], l] = r;
			Object.assign(n.style, {
				left: `${i}px`,
				top: `${a}px`,
				width: `${o}px`,
				height: `${c}px`
			});
			let u = s(t);
			if (u.classList.toggle("stretch", l), l) Object.assign(u.style, {
				width: `${o}px`,
				height: `${c}px`,
				left: "0",
				top: "0",
				transform: ""
			});
			else {
				let e = v.get(t), n = Math.min(1, c / e);
				Object.assign(u.style, {
					width: `${o}px`,
					height: "auto",
					left: `${(o - o * n) / 2}px`,
					top: `${(c - e * n) / 2}px`,
					transform: n < 1 ? `scale(${n})` : ""
				});
			}
		});
	}
	render() {
		return this._config ? P`<div class="view">
      ${this._items.map((e) => P`<div class="tile ${e.place}" hidden><div class="inner">${e.el}</div></div>`)}
    </div>` : I;
	}
	static {
		this.styles = o`
    :host {
      display: block;
    }
    .view {
      position: relative;
      overflow: hidden;
      width: 100%;
    }
    .tile {
      position: absolute;
      overflow: hidden;
    }
    .tile[hidden] {
      display: none;
    }
    .inner {
      position: absolute;
      transform-origin: 0 0;
    }
    .inner.stretch > * {
      height: 100%;
    }
  `;
	}
}, dt = [
	["layout", "Layout"],
	["main", "Main"],
	["left", "Left"],
	["top", "Top"],
	["right", "Right"],
	["bottom", "Bottom"]
], ft = class extends U {
	constructor(...e) {
		super(...e), this._tab = "layout", this.mounted = "";
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			lovelace: { attribute: !1 },
			_config: { state: !0 },
			_tab: { state: !0 }
		};
	}
	setConfig(e) {
		this._config = e;
	}
	save(e) {
		this._config = e, G(this, "config-changed", { config: e });
	}
	updated() {
		let e = this.renderRoot.querySelector(".stack");
		if (!e || this.mounted === this._tab) return;
		this.mounted = this._tab;
		let t = this._tab, n = t === "main" ? this._config.main ? [this._config.main] : [] : this._config[t]?.cards ?? [];
		Ge(e, this.hass, this.lovelace, n, (e) => {
			if (t === "main") {
				let { main: t, ...n } = this._config;
				this.save(e[0] ? {
					...n,
					main: e[0]
				} : n);
			} else this.save({
				...this._config,
				[t]: {
					...this._config[t],
					cards: e
				}
			});
		});
	}
	form(e, t, n) {
		return P`<ha-form
      .hass=${this.hass}
      .data=${t}
      .schema=${e}
      .computeLabel=${Ae}
      .computeHelper=${je}
      @value-changed=${(e) => {
			e.stopPropagation(), n(e.detail.value);
		}}
    ></ha-form>`;
	}
	body() {
		let e = this._config;
		if (this._tab === "layout") {
			let t = Object.fromEntries(Object.entries(W.main).map(([t, n]) => [t, e[t] ?? n.default])), n = ze(this.lovelace), r = n ? [] : [{
				name: "aspect",
				selector: { text: {} }
			}];
			return n || (t.aspect = e.aspect ?? lt), P`${n ? P`<p class="help">Alone in a Panel view, it is exactly the screen: nothing scrolls.</p>` : I}${this.form([...r, ...De(String(t.main_fit))], t, (t) => this.save({
				...e,
				...t
			}))}`;
		}
		if (this._tab === "main") return P`<p class="help">The card between the panels (one; a Camera Commander suits it). Its fit is on the Layout tab.</p>
        <div class="stack"></div>`;
		let t = this._tab, { cards: n, ...r } = e[t] ?? {}, i = {
			...W.panels[t],
			hide_empty: !0,
			...r
		}, a = [...Oe(t), {
			name: "visibility",
			selector: { object: {} }
		}];
		return P`${this.form(a, i, (r) => this.save({
			...e,
			[t]: {
				...r,
				cards: n
			}
		}))}
      <p class="help">${(n ?? []).length} cards${(n ?? []).length ? `: ${(n ?? []).map(We).join(", ")}` : ""}.</p>
      <div class="stack"></div>`;
	}
	render() {
		return this._config ? P`<div class="tabs">
        ${dt.map(([e, t]) => P`<button class=${e === this._tab ? "on" : ""} @click=${() => (this._tab = e, this.mounted = "")}>${t}</button>`)}
      </div>
      ${this.body()}` : I;
	}
	static {
		this.styles = o`
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 16px;
    }
    button {
      font: inherit;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid var(--divider-color);
      background: none;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    button.on {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--text-primary-color);
    }
    .help {
      color: var(--secondary-text-color);
    }
  `;
	}
};
//#endregion
//#region src/main.ts
customElements.define("casa-mia-tablet-layout", ut), customElements.define("casa-mia-tablet-layout-editor", ft), J("casa-mia-tablet-layout", "Casa Mia tablet layout", "A whole screen and never more: panels of cards around a main card, fitted with no scroll bars and no gaps."), console.info(`%cCASA-MIA CARDS\n%ctablet layout, commander, section (${new URL(import.meta.url).searchParams.get("v") || "dev"})`, "color: green; font-weight: bold;", "");
//#endregion
