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
var w = globalThis, T = (e) => e, E = w.trustedTypes, D = E ? E.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ee = "$lit$", O = `lit$${Math.random().toFixed(9).slice(2)}$`, k = "?" + O, te = `<${k}>`, A = document, j = () => A.createComment(""), M = (e) => e === null || typeof e != "object" && typeof e != "function", N = Array.isArray, ne = (e) => N(e) || typeof e?.[Symbol.iterator] == "function", re = "[ 	\n\f\r]", P = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, F = /-->/g, ie = />/g, I = RegExp(`>|${re}(?:([^\\s"'>=/]+)(${re}*=${re}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ae = /'/g, oe = /"/g, se = /^(?:script|style|textarea|title)$/i, L = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), ce = Symbol.for("lit-noChange"), R = Symbol.for("lit-nothing"), le = /* @__PURE__ */ new WeakMap(), z = A.createTreeWalker(A, 129);
function ue(e, t) {
	if (!N(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return D === void 0 ? t : D.createHTML(t);
}
var de = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = P;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === P ? c[1] === "!--" ? o = F : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = I) : (se.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = I) : o = ie : o === I ? c[0] === ">" ? (o = i ?? P, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? I : c[3] === "\"" ? oe : ae) : o === oe || o === ae ? o = I : o === F || o === ie ? o = P : (o = I, i = void 0);
		let d = o === I && e[t + 1].startsWith("/>") ? " " : "";
		a += o === P ? n + te : l >= 0 ? (r.push(s), n.slice(0, l) + ee + n.slice(l) + O + d) : n + O + (l === -2 ? t : d);
	}
	return [ue(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, fe = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = de(t, n);
		if (this.el = e.createElement(l, r), z.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = z.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ee)) {
					let t = u[o++], n = i.getAttribute(e).split(O), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? ge : r[1] === "?" ? _e : r[1] === "@" ? ve : he
					}), i.removeAttribute(e);
				} else e.startsWith(O) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (se.test(i.tagName)) {
					let e = i.textContent.split(O), t = e.length - 1;
					if (t > 0) {
						i.textContent = E ? E.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], j()), z.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], j());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === k) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(O, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += O.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = A.createElement("template");
		return n.innerHTML = e, n;
	}
};
function B(e, t, n = e, r) {
	if (t === ce) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = M(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = B(e, i._$AS(e, t.values), i, r)), t;
}
var pe = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? A).importNode(t, !0);
		z.currentNode = r;
		let i = z.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new me(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new ye(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = z.nextNode(), a++);
		}
		return z.currentNode = A, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, me = class e {
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
		e = B(this, e, t), M(e) ? e === R || e == null || e === "" ? (this._$AH !== R && this._$AR(), this._$AH = R) : e !== this._$AH && e !== ce && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ne(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== R && M(this._$AH) ? this._$AA.nextSibling.data = e : this.T(A.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = fe.createElement(ue(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new pe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = le.get(e.strings);
		return t === void 0 && le.set(e.strings, t = new fe(e)), t;
	}
	k(t) {
		N(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(j()), this.O(j()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = T(e).nextSibling;
			T(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, he = class {
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
		if (i === void 0) e = B(this, e, t, 0), a = !M(e) || e !== this._$AH && e !== ce, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = B(this, r[n + o], t, o), s === ce && (s = this._$AH[o]), a ||= !M(s) || s !== this._$AH[o], s === R ? e = R : e !== R && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === R ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, ge = class extends he {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === R ? void 0 : e;
	}
}, _e = class extends he {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== R);
	}
}, ve = class extends he {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = B(this, e, t, 0) ?? R) === ce) return;
		let n = this._$AH, r = e === R && n !== R || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== R && (n === R || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, ye = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		B(this, e);
	}
}, be = {
	M: ee,
	P: O,
	A: k,
	C: 1,
	L: de,
	R: pe,
	D: ne,
	V: B,
	I: me,
	H: he,
	N: _e,
	U: ve,
	B: ge,
	F: ye
}, xe = w.litHtmlPolyfillSupport;
xe?.(fe, me), (w.litHtmlVersions ??= []).push("3.3.3");
var Se = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new me(t.insertBefore(j(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Ce = globalThis, V = class extends C {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Se(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return ce;
	}
};
V._$litElement$ = !0, V.finalized = !0, Ce.litElementHydrateSupport?.({ LitElement: V });
var we = Ce.litElementPolyfillSupport;
we?.({ LitElement: V }), (Ce.litElementVersions ??= []).push("4.2.2");
var H = {
	about: "The layout options shared by the Camera Commander (drawn by the compositor, edited on the Camera Dashboard page) and the Tablet Layout (laid out in the browser, edited in Lovelace): one engine, two places (compositor.commander_layout, integration/cards/src/layout.ts, checked against tests/layout_cases.json). Each option: label, help ({item} is camera or card), default, and `for` when only one of them has it. Read by the compositor's defaults, the admin page and the cards' editors.",
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
function Te(e, t, n) {
	e.dispatchEvent(new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0
	}));
}
async function Ee(e, t, n) {
	await customElements.whenDefined("hui-card");
	let r = document.createElement("hui-card");
	return r.hass = t, r.preview = n, r.config = e, r.load(), r;
}
var De = (e) => !e.hasAttribute("hidden") && e.style.display !== "none";
function Oe(e) {
	history.pushState(null, "", e), Te(window, "location-changed", { replace: !1 });
}
async function ke() {
	return await (await window.loadCardHelpers()).createCardElement({
		type: "vertical-stack",
		cards: []
	}), await customElements.whenDefined("hui-vertical-stack-card"), customElements.get("hui-vertical-stack-card").getConfigElement();
}
async function Ae() {
	customElements.get("ha-form") || (await (await (await window.loadCardHelpers()).createCardElement({
		type: "entities",
		entities: []
	})).constructor.getConfigElement?.(), await customElements.whenDefined("ha-form"));
}
async function je() {
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
function U(e, t) {
	if (!customElements.get(e)) try {
		customElements.define(e, t);
	} catch (t) {
		console.error(`CASA-MIA CARDS failed: defining ${e}: ${t}`);
	}
}
function Me(e, t, n) {
	let r = window;
	r.customCards ||= [], r.customCards.some((t) => t.type === e) || r.customCards.push({
		type: e,
		name: t,
		description: n,
		preview: !1,
		documentationURL: "https://github.com/gazoodle/casa-mia"
	});
}
var Ne = H.main, Pe = H.panel;
function Fe(e, t) {
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
function Ie(e) {
	return Object.entries(Ne).filter(([, t]) => (!t.when || t.when.includes(e)) && (!t.for || t.for === "view")).map(([e, t]) => Fe(e, t));
}
function Le(e) {
	return Object.entries(Pe).filter(([, t]) => (!t.edge || e === "top" || e === "bottom") && (!t.for || t.for === "view")).map(([e, t]) => Fe(e, t));
}
var Re = {
	...Ne,
	...Pe
}, ze = (e) => Re[e.name]?.label ?? e.name, Be = (e) => Re[e.name]?.help?.replaceAll("{item}", "card"), Ve = 100, He = (e) => e.parentElement ?? (e.getRootNode().host || null);
function Ue(e) {
	for (let t = He(e); t; t = He(t)) {
		let e = t.tagName ?? "";
		if (e.includes("-") && e !== "HUI-CARD") return e;
	}
	return "";
}
function We(e) {
	for (let t = He(e); t; t = He(t)) if (t.tagName === "HUI-CARD") return t.hasAttribute("cm-fill");
	return !1;
}
function Ge(e) {
	for (let t = e; t; t = He(t)) if (t.tagName?.startsWith("HUI-DIALOG") || t.tagName === "HA-DIALOG") return !0;
	return !1;
}
function Ke(e) {
	let t = e.getBoundingClientRect().top + window.scrollY, n = window.visualViewport?.height ?? window.innerHeight;
	return Math.max(Ve, Math.floor(n - t));
}
function qe(e, t, n = !1) {
	return t ? "preview" : e === "HUI-PANEL-VIEW" ? "screen" : e === "CASA-MIA-TABLET-LAYOUT" ? "tile" : n ? "cell" : "column";
}
function Je(e, t = !1) {
	let n = We(e) ? "CASA-MIA-TABLET-LAYOUT" : Ue(e);
	return {
		mode: qe(n, Ge(e), t),
		room: Ke(e),
		container: n.toLowerCase()
	};
}
function Ye(e, t, n) {
	switch (e.mode) {
		case "screen": return e.room;
		case "tile":
		case "cell": return null;
		default: return Math.round(t / n);
	}
}
function Xe(e) {
	return window.addEventListener("resize", e), window.visualViewport?.addEventListener("resize", e), () => {
		window.removeEventListener("resize", e), window.visualViewport?.removeEventListener("resize", e);
	};
}
function Ze(e) {
	let t = e.hostname.replace(/^\[|\]$/g, "").toLowerCase();
	return e.protocol === "http:" && (!t.includes(".") && !t.includes(":") || /^(127|10|192\.168|172\.(1[6-9]|2\d|3[01])|169\.254)\./.test(t) || /^(::1|f[cd][0-9a-f]{0,2}:.*|fe80:.*)$/.test(t) || /\.(local|lan|home|internal|home\.arpa)$/.test(t));
}
var Qe = {
	full: Infinity,
	balanced: 1.5,
	light: 1,
	saver: .75
};
function $e(e, t, n = "balanced") {
	return t ? Math.min(e, Qe[n] ?? Qe.balanced) : e;
}
function et(e, t, n) {
	let r = e.filter(([, e, t]) => e > 0 && t > 0);
	return (r.find(([, e, r]) => n ? e >= t[0] || r >= t[1] : e >= t[0] && r >= t[1]) ?? r[r.length - 1] ?? e[e.length - 1])?.[0];
}
var W = {
	tint: [
		61,
		123,
		255
	],
	strength: 3,
	darkness: 20
};
function tt([e, t, n], r, i) {
	let [a, o, s] = [
		e,
		t,
		n
	].map((e) => e / 255), c = Math.max(a, o, s), l = c - Math.min(a, o, s), u = 0;
	return l && (u = c === a ? (o - s) / l % 6 : c === o ? (s - a) / l + 2 : (a - o) / l + 4), `grayscale(1) sepia(1) hue-rotate(${Math.round(u * 60 - 35)}deg) saturate(${r}) brightness(${Math.max(.1, 1 - i / 100).toFixed(2)}) contrast(1.1)`;
}
//#endregion
//#region src/garnish.ts
var G = (e) => e.view_layout?.garnish !== !0 && e.view_layout?.counts !== !1, nt = /* @__PURE__ */ new Set([
	"custom:casa-mia-commander",
	"picture",
	"picture-entity",
	"picture-glance",
	"map",
	"iframe",
	"custom:advanced-camera-card",
	"custom:webrtc-camera"
]), rt = (e) => e.view_layout?.fill ?? nt.has(e.type);
function it(e, t) {
	let { view_layout: n = {}, ...r } = e, { counts: i, garnish: a, ...o } = n;
	return t && (o.garnish = !0), {
		...r,
		...Object.keys(o).length && { view_layout: o }
	};
}
function at(e) {
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
//#region src/section.ts
function ot(e) {
	let t = e, n = {
		...t.getGridOptions?.() ?? t._element?.getGridOptions?.() ?? {},
		...e.config?.grid_options
	};
	return {
		columns: n.columns === "full" ? 12 : Math.min(12, Math.max(1, Number(n.columns) || 12)),
		rows: typeof n.rows == "number" ? n.rows : "auto"
	};
}
var st = class extends V {
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
			view_layout: { garnish: !0 }
		}, {
			type: "markdown",
			content: "Each card here can have its own visibility; the section hides when none shows."
		}] };
	}
	setConfig(e) {
		if (!Array.isArray(e.cards)) throw Error("cards: a list of cards");
		this._config = e, Promise.all(e.cards.map((e) => Ee(e, this.hass, this.preview))).then((t) => {
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
			let n = ot(e);
			t.style.gridColumn = `span ${n.columns}`, t.style.gridRow = n.rows === "auto" ? "" : `span ${n.rows}`, t.style.height = n.rows === "auto" ? "" : `calc(${n.rows} * var(--row-height, 56px) + ${n.rows - 1} * var(--row-gap, 8px))`, t.hidden = !De(e);
		});
		let e = this.preview || this._cards.some((e, t) => G(this._config.cards[t]) && De(e));
		this.hidden === e && (this.hidden = !e, Te(this, "card-visibility-changed", { value: e }));
	}
	render() {
		return L`<div class="grid">${this._cards.map((e) => L`<div class="cell">${e}</div>`)}</div>`;
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
}, ct = [
	["", "Its own"],
	["3", "Quarter"],
	["4", "Third"],
	["6", "Half"],
	["8", "Two thirds"],
	["12", "Full"]
];
function lt(e) {
	let t = e.heading ?? e.title ?? e.name ?? e.entity ?? (e.content ? String(e.content).slice(0, 30) : "");
	return `${String(e.type).replace(/^custom:/, "")}${t ? `: ${t}` : ""}`;
}
async function ut(e, t, n, r, i) {
	let a = await ke();
	return a.hass = t, a.lovelace = n, a.setConfig({
		type: "vertical-stack",
		cards: r
	}), a.addEventListener("config-changed", (e) => {
		e.stopPropagation(), i(e.detail.config.cards ?? []);
	}), e.replaceChildren(a), a;
}
var dt = class extends V {
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
		ut(this.renderRoot.querySelector(".stack"), this.hass, this.lovelace, this._config?.cards ?? [], (e) => this.save({
			...this._config,
			cards: e
		})).then((e) => this.stack = e);
	}
	updated(e) {
		this.stack && e.has("hass") && (this.stack.hass = this.hass);
	}
	save(e) {
		this._config = e, Te(this, "config-changed", { config: e });
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
		return this._config ? L`
      <p class="help">The section hides while no content card is showing. Mark a heading as Garnish to show it only while its content shows.</p>
      <div class="rows">
        ${this._config.cards.map((e, t) => L`<div class="row">
            <span class="name">${t + 1}. ${lt(e)}</span>
            <label
              >Garnish
              <ha-switch
                .checked=${!G(e)}
                @change=${(e) => this.setCard(t, (t) => {
			let n = e.target.checked, r = it(t, n);
			delete t.view_layout, Object.assign(t, r);
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
              ${ct.map(([e, t]) => L`<option value=${e}>${t}</option>`)}
            </select>
          </div>`)}
      </div>
      <div class="stack"></div>
    ` : R;
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
U("casa-mia-section", st), U("casa-mia-section-editor", dt), Me("casa-mia-section", "Casa Mia section", "A section's grid of cards that hides itself while none of the cards that count is showing.");
//#endregion
//#region node_modules/lit-html/directive.js
var ft = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), pt = class {
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
}, { I: mt } = be, ht = {}, gt = (e, t = ht) => e._$AH = t, _t = ft(class extends pt {
	constructor() {
		super(...arguments), this.key = R;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (gt(e), this.key = t), n;
	}
}), K = [
	"left",
	"top",
	"right",
	"bottom"
], vt = [
	"stack",
	"reverse",
	"centre"
];
function q(e) {
	let t = Math.floor(e), n = e - t;
	return n > .5 ? t + 1 : n < .5 || t % 2 == 0 ? t : t + 1;
}
var J = (e, t) => Math.floor(e / t);
function yt(e, t, n, r) {
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
function bt(e, t, n, r, i) {
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
function xt(e, t, n, r, i, a, o) {
	n = Math.max(1, Math.min(n, t));
	let s = yt(e, n, !r, i), c = [], l = 0;
	return s.forEach((e, s) => {
		let u = Math.floor(t / n) + +(s < t % n);
		c.push(...a === null ? yt(e, u, r, i) : bt(e, a.slice(l, l + u), r, i, o)), l += u;
	}), c;
}
function St(e) {
	let t;
	if (typeof e == "number") t = e;
	else {
		let [n, r] = String(e).trim().replace("/", ":").split(":");
		t = r === void 0 ? Number(n) : Number(n) / Number(r);
	}
	if (!(t > 0)) throw Error(`not a shape: ${e}`);
	return t;
}
var Ct = (e) => H.main[e].default;
function wt(e, t) {
	let n = e.main_fit ?? Ct("main_fit");
	return n === "fixed" ? St(e.main_ratio ?? Ct("main_ratio")) : n === "own" ? Number((e.aspects ?? {})[t ?? ""] || 16 / 9) : null;
}
function Tt(e, t = null) {
	let { width: n, height: r, gap: i } = e, a = Math.max(0, Math.min(Math.trunc(Number(e.margin ?? 0)), J(Math.min(n, r) - 1, 2)));
	if (a) {
		let [, i, o] = Tt({
			...e,
			width: n - 2 * a,
			height: r - 2 * a,
			margin: 0
		}, t), s = (e) => [
			e[0] + a,
			e[1] + a,
			e[2],
			e[3]
		];
		return [
			[n, r],
			s(i),
			Object.fromEntries(K.map((e) => [e, o[e].map(s)]))
		];
	}
	let o = wt(e, t), s = (t) => e[t].cameras.length > 0, c = (t, n) => s(t) ? e[t].unit === "px" ? Math.min(q(e[t].size * (e.scale ?? 1)), J(n * 45, 100)) : q(n * e[t].size / 100) : 0, l = (t, n) => {
		let r = `anchor_${n}`;
		return !!(e[t][r] ?? H.panels[t][r]);
	}, u, d, f, p, m = 0, h = 0;
	if (o === null) [u, d, f, p] = [
		c("left", n),
		c("right", n),
		c("top", r),
		c("bottom", r)
	];
	else {
		let t = Number(e.panel_min ?? Ct("panel_min")), a = (e, n, r) => (Number(s(n)) + Number(s(r))) * (q(e * t / 100) + i), c = n - a(n, "left", "right"), l = r - a(r, "top", "bottom");
		m = Math.min(q(n * Number(e.main_width ?? Ct("main_width")) / 100), c), h = q(m / o), h > l && ([h, m] = [l, q(l * o)]);
		let g = (e, t, n) => {
			let [r, a] = [s(t), s(n)], o = Math.max(e - i * (Number(r) + Number(a)), 0);
			return r && a ? [J(o, 2), o - J(o, 2)] : r ? [o, 0] : a ? [0, o] : [0, 0];
		};
		[u, d] = g(n - m, "left", "right"), [f, p] = g(r - h, "top", "bottom");
	}
	let g = u + (u ? i : 0), _ = n - d - (d ? i : 0), v = f + (f ? i : 0), y = r - p - (p ? i : 0), b = (e, t, r) => {
		let i = l(e, "left") ? 0 : g;
		return [
			i,
			t,
			(l(e, "right") ? n : _) - i,
			r
		];
	}, x = (e, t, n) => {
		let i = f && l("top", n) ? v : 0;
		return [
			e,
			i,
			t,
			(p && l("bottom", n) ? y : r) - i
		];
	}, S = {
		top: b("top", 0, f),
		bottom: b("bottom", r - p, p),
		left: x(0, u, "left"),
		right: x(n - d, d, "right")
	}, C = (t) => vt.includes(e[t].fit ?? "") ? e[t].cameras.map((t) => Number((e.aspects ?? {})[t] || 16 / 9)) : null, w = Object.fromEntries(K.map((t) => [t, s(t) ? xt(S[t], e[t].cameras.length, Math.trunc(Number(e[t].lines ?? 1)), t === "left" || t === "right", i, C(t), e[t].fit ?? "cover") : []])), T = [
		g,
		v,
		_ - g,
		y - v
	];
	return o !== null && (m = Math.min(m, _ - g), h = Math.min(h, y - v), T = [
		g + J(_ - g - m, 2),
		v + J(y - v - h, 2),
		m,
		h
	]), [
		[n, r],
		T,
		w
	];
}
function Et(e, t, n, r) {
	let i = (r) => Tt({
		...e,
		width: n,
		height: r
	}, t)[1], a = wt(e, t) !== null, [o, s] = [1, Math.max(64, Math.ceil(n * 4))], c = i(s)[2], l = (e) => {
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
async function Dt(e, t, n, r) {
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
//#region src/commander.ts
var Ot = 1e4, kt = 2, At = () => location.pathname.split("/")[1] ?? "", jt = 15, Mt = new URL(import.meta.url).searchParams.get("v") || "dev", Nt = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", Pt = 4096e3, Ft = 64, It = 400;
function Lt(e, t, n) {
	let r = Math.min(1, Math.sqrt(Pt / (e * n * t * n))), [i, a] = [8 * q(e * n * r / 8), 8 * q(t * n * r / 8)];
	return Math.min(i, a) >= Ft ? [
		i,
		a,
		Math.round(n * r * 100) / 100 || 1
	] : null;
}
var Rt = null;
function zt(e, t = !1) {
	if (t || !Rt || Date.now() > Rt.until) {
		let t = e.callWS({ type: "casa_mia/picture_token" }).then((e) => e.token);
		Rt = {
			value: t,
			until: Date.now() + 432e5
		}, t.catch(() => Rt = null);
	}
	return Rt.value;
}
function Bt(e) {
	return Object.entries(e.states).filter(([e, t]) => e.startsWith("select.") && (t.attributes.card || t.attributes.draft_card)).map(([e, t]) => ({
		value: e,
		label: String(t.attributes.friendly_name ?? e)
	}));
}
var Vt = class extends V {
	constructor(...e) {
		super(...e), this.preview = !1, this._natural = "", this._token = "", this.retry = 0, this.liveOn = "", this.liveWait = 0, this._playing = !1, this._liveFailed = "", this.liveFails = 0, this._shown = 0, this.shows = 0, this._framed = "", this.frameWait = 0, this._size = null, this._box = [0, 0], this._fit = null, this.settle = 0, this.resize = new ResizeObserver(([e]) => {
			let { width: t, height: n } = e.contentRect;
			this._box = [Math.round(t * 10) / 10, Math.round(n * 10) / 10], this.measure(), this.debugOn() && this.requestUpdate();
			let r = Lt(t, n, $e(window.devicePixelRatio || 1, this.viaHa(), this._config?.away_sharpness));
			clearTimeout(this.settle), String(r) !== String(this._size) && (this._size ? this.settle = window.setTimeout(() => this._size = r, It) : this._size = r);
		}), this._width = 0, this.measure = () => {
			let e = Je(this, this.layout === "grid" && typeof this._config?.grid_options?.rows == "number");
			JSON.stringify(e) !== JSON.stringify(this._fit) && (this._fit = e), this.clientWidth !== this._width && (this._width = this.clientWidth);
		}, this.widthWatch = new ResizeObserver(() => this.measure()), this.visibility = () => {
			let e = document.hidden ? "page hidden" : this.isConnected ? At() === this.home ? this.inView ? "" : "out of view" : "left the dashboard" : "off the page";
			if (e) {
				let t = document.hidden ? 0 : this._config?.leave_after ?? jt;
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
		return !!((this._config?.entity ? this.hass?.states[this._config.entity] : void 0)?.attributes[this._config?.draft ? "draft_card" : "card"])?.layout.debug?.on;
	}
	connectedCallback() {
		super.connectedCallback(), document.addEventListener("visibilitychange", this.visibility), window.addEventListener("location-changed", this.visibility), window.addEventListener("popstate", this.visibility), this.home = At();
		let e = this.renderRoot?.querySelector(".box");
		e && this.onScreen.observe(e), this.unwatch = Xe(this.measure), this.widthWatch.observe(this), requestAnimationFrame(this.measure);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), document.removeEventListener("visibilitychange", this.visibility), window.removeEventListener("location-changed", this.visibility), window.removeEventListener("popstate", this.visibility), this.onScreen.disconnect(), this.inView = !1, this.visibility(), this.unwatch?.(), this.widthWatch.disconnect(), this.resize.disconnect(), clearTimeout(this.settle), clearTimeout(this.retry), clearTimeout(this.frameWait), this.stopLive();
	}
	cut(e) {
		clearTimeout(this.leaving), this.leaving = 0, this._shown && (this._shown = 0, this.done(e), this.renderRoot?.querySelector(".picture")?.setAttribute("src", Nt));
	}
	done(e) {
		let t = this.streaming;
		this.streaming = "", t.includes(".mjpg?") && navigator.sendBeacon(`${t.replace(".mjpg?", "/done?")}&why=${encodeURIComponent(e)}`);
	}
	editing() {
		return this.preview || Ge(this);
	}
	stillUrl(e, [t, n, r]) {
		let i = `${e.picture.replace(".mjpg", ".jpg")}?w=${t}&h=${n}&dpr=${r}`;
		if (!this.viaHa()) return i;
		if (!this._token) return this.ask(), "";
		let a = new URL(i);
		return `/api/casa_mia/${this._config?.draft ? "draft" : "live"}${a.pathname}${a.search}&token=${this._token}`;
	}
	look() {
		let e = this._config;
		return e?.security_look ? tt(e.look_tint ?? W.tint, e.look_strength ?? W.strength, e.look_darkness ?? W.darkness) : "";
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
		return { entity: Bt(e)[0]?.value ?? "" };
	}
	setConfig(e) {
		this._config = e;
	}
	getCardSize() {
		return 6;
	}
	getGridOptions() {
		return {
			columns: 6,
			rows: "auto"
		};
	}
	viaHa() {
		let e = this._config?.route ?? "auto";
		return e === "ha" || e === "auto" && !Ze(location);
	}
	pictureUrl(e, [t, n, r]) {
		let i = `w=${t}&h=${n}&dpr=${r}&sid=${this.sid}&v=${encodeURIComponent(Mt)}`;
		if (!this.viaHa()) return `${e.picture}?${i}`;
		if (!this._token) return this.ask(), "";
		let a = new URL(e.picture).pathname;
		return `/api/casa_mia/${this._config?.draft ? "draft" : "live"}${a}?${i}&token=${this._token}`;
	}
	ask(e = !1) {
		this.hass && zt(this.hass, e).then((e) => this._token = e, () => this.retry = window.setTimeout(() => this.ask(!0), 1e4));
	}
	refused() {
		clearTimeout(this.retry), this.retry = window.setTimeout(() => this.viaHa() ? this.ask(!0) : this.again(), this.viaHa() ? 5e3 : 3e3);
	}
	again() {
		this._shown &&= (this.done("its stream failed"), this.sid = Math.random().toString(36).slice(2), ++this.shows);
	}
	now() {
		let e = this._config?.entity ? this.hass?.states[this._config.entity] : void 0, t = e?.attributes[this._config?.draft ? "draft_card" : "card"];
		return {
			card: t,
			main: t ? this.main(t, e.state) : ""
		};
	}
	liveMain(e, t) {
		return !!(e.live_main && this._config?.live_main !== !1 && this._liveFailed !== t && this.liveFails < kt && this.hass?.connection);
	}
	liveEntity(e, t, n) {
		let r = e.layout.main_fit ?? "fit";
		return et(e.cameras[t]?.channels ?? [[
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
			let n = this.liveFails >= kt ? `; ${this.liveFails} in a row, so no more tries until the page reloads` : "";
			console.info(`casa-mia: live main camera ${r}: ${e}; the drawn picture instead${n}`), this.stopLive(), this._liveFailed = t;
		};
		this.liveWait = window.setTimeout(() => i("not playing in time"), Ot), n.onplaying = () => {
			clearTimeout(this.liveWait), this.liveFails = 0, this._playing = !0;
		}, Dt(this.hass.connection, r, n, i).then((e) => this.liveOn === r ? this.liveStop = e : e(), (e) => i(String(e)));
	}
	stopLive() {
		clearTimeout(this.liveWait), this.liveStop?.(), this.liveStop = void 0, this.liveOn = "", this._playing = !1;
	}
	main(e, t) {
		let n = Object.entries(e.cameras).find(([, e]) => e.title === t);
		return n ? n[0] : e.start;
	}
	render() {
		let e = this._config?.entity ? this.hass?.states[this._config.entity] : void 0, t = e?.attributes[this._config?.draft ? "draft_card" : "card"];
		if (!t) return L`<ha-card
        ><div class="note">
          ${this._config?.entity ? e ? `${this._config.draft ? "No saved draft" : "Not deployed live yet"} for this commander` : `No commander at ${this._config.entity}` : "Choose a commander"}
        </div></ha-card
      >`;
		if (!t.picture) return L`<ha-card><div class="note">Its picture's address is not known yet (the app has no LAN address).</div></ha-card>`;
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
		} : a, [[m, h], g, _] = Tt(p, n), v = ([e, t, n, r]) => `left:${e / m * 100}%;top:${t / h * 100}%;width:${n / m * 100}%;height:${r / h * 100}%`, y = p.highlight ?? {}, b = K.flatMap((e) => p[e].cameras.map((t, n) => [t, _[e][n]])).find(([e]) => e === n)?.[1], x = this._fit, S = this._width ? this._width / Et(a, n, this._width, this.shapeOf(t, n)) : a.width / a.height, C = x && this._width ? Ye(x, this._width, S) : null;
		return L`<ha-card style=${!x || x.mode === "tile" || x.mode === "cell" ? `height:100%;aspect-ratio:${a.width}/${a.height}` : C ? `height:${C}px` : ""}>
      <div class="box">
        <div class="seen" style="filter:${this.look()}">
        ${r ? f ? L`<img class="still" src=${f} alt="" />` : R : d && this._shown ? _t(this._shown, L`<img
                class="picture"
                data-cm-own
                src=${this.streaming = d}
                alt=""
                @load=${(e) => {
			let t = e.target;
			this._natural = `${t.naturalWidth} x ${t.naturalHeight}`;
		}}
                @error=${() => this.refused()}
              />`) : R}
        ${i && g[2] > 0 ? L`<video
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
              <div class="caption" style=${v(g)}><span>${t.cameras[n]?.title ?? n}${this._playing ? " (live)" : ""}</span></div>` : R}
        </div>
        ${r ? L`<div class="hatch"><span>Still picture while editing</span></div>` : R}
        ${a.debug?.on ? L`<div class="debug" style="color:${a.debug.colour ?? "#ffd60a"}">
              ${this._fit?.mode ?? "?"} (in ${this._fit?.container || "?"}), room ${this._fit?.room ?? "?"} px<br />
              card box ${this._box[0]} x ${this._box[1]} CSS px, screen ${window.devicePixelRatio}x<br />
              asked ${this._size ? `${s} x ${c} @${l}x` : "nothing yet"}; picture ${this._natural || "not loaded"}
              ${this.viaHa() ? "through Home Assistant" : "direct"}
            </div>` : R}
        ${K.flatMap((e) => p[e].cameras.map((r, i) => _[e][i][2] > 0 && r !== n ? L`<div class="zone" style=${v(_[e][i])} title=${t.cameras[r]?.title ?? r} @click=${() => this.choose(t, r)}></div>` : R))}
        <div class="zone" style=${v(g)} @click=${() => this.open(t, n)}></div>
        ${b && b[2] > 0 && this._framed === (r ? "still" : `s${this._shown}`) ? L`<img
              class="highlight ${Number(y.pulse) > 0 ? y.style ?? "breathe" : ""}"
              src=${Nt}
              alt=""
              style="${v(b)};border:${y.width}px solid ${y.colour};box-shadow:0 0 ${y.blur}px ${y.colour};--cm-colour:${y.colour};--cm-blur:${y.blur}px;--cm-pulse:${y.pulse}s;--cm-style:${y.style}"
            />` : R}
      </div>
    </ha-card>`;
	}
	choose(e, t) {
		this.hass?.callService("select", "select_option", { option: e.cameras[t]?.title }, { entity_id: this._config.entity });
	}
	open(e, t) {
		let n = this._config?.tap_main ?? "live";
		n === "live" && e.cameras[t] ? Oe(e.cameras[t].live) : n === "more-info" && Te(this, "hass-more-info", { entityId: t });
	}
	static {
		this.styles = o`
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
  `;
	}
}, Ht = class extends V {
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
		if (!this.hass || !this._config) return R;
		let e = [
			{
				name: "entity",
				selector: { select: {
					mode: "dropdown",
					options: Bt(this.hass)
				} }
			},
			{
				name: "draft",
				selector: { boolean: {} }
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
			tap_main: "A tap on the main camera",
			route: "The picture",
			away_sharpness: "Sharpness through Home Assistant",
			live_main: "Main camera as live video",
			leave_after: "Picture kept running once out of sight",
			security_look: "Security look",
			look_tint: "Security look: tint",
			look_strength: "Security look: strength",
			look_darkness: "Security look: darker"
		};
		return L`<ha-form
      .hass=${this.hass}
      .data=${{
			tap_main: "live",
			route: "auto",
			away_sharpness: "balanced",
			live_main: !0,
			leave_after: jt,
			security_look: !1,
			look_tint: W.tint,
			look_strength: W.strength,
			look_darkness: W.darkness,
			...this._config
		}}
      .schema=${e}
      .computeLabel=${(e) => t[e.name]}
      .computeHelper=${(e) => e.name === "entity" ? "The commanders built on the Camera Dashboard page (each one's Main camera select)." : e.name === "security_look" ? "The pictures in monochrome, tinted, like a security control room: the picture, the main camera's live video and its caption (not the highlight)." : e.name === "route" ? "At home: this page reached Home Assistant over http at a home address (a private IP, a .local name). Through Home Assistant works anywhere you can sign in, at a little cost to Home Assistant." : e.name === "away_sharpness" ? "How sharp the picture is when it comes through Home Assistant (away from home): a 2x screen at Full is four times the bytes of Light. Direct at home it is always the screen's own." : e.name === "live_main" ? "The main camera plays as live video over the picture, through Home Assistant's WebRTC (this device decodes it; the box does not). Needs the Camera compositor's Live main camera switch on; a video that does not start gives way to the drawn picture." : e.name === "leave_after" ? "Seconds the picture goes on once the card is out of sight (another page in Home Assistant, scrolled away), so coming back (the back button) finds it running; then it stops, and the box sends nothing more. 0: at once. Closing the app always stops it at once." : e.name === "draft" ? "As saved on the Camera Dashboard page (Save draft), before it is deployed live: for trying changes out. Off: as deployed live." : void 0}
      @value-changed=${(e) => {
			e.stopPropagation(), this._config = e.detail.value, Te(this, "config-changed", { config: this._config });
		}}
    ></ha-form>`;
	}
};
U("casa-mia-commander", Vt), U("casa-mia-commander-editor", Ht), Me("casa-mia-commander", "Casa Mia Camera Commander", "One of the Camera Dashboard's commanders: tap a camera to make it the main one.");
//#endregion
//#region src/tablet.ts
var Ut = ["main", ...K];
function Y(e, t) {
	let n = e?.view_layout;
	if (n?.panel === void 0) return t < Ut.length ? {
		layer: 1,
		place: Ut[t]
	} : null;
	let r = Number(n.layer ?? 1);
	return Ut.includes(n.panel) && Number.isInteger(r) && r >= 1 && r <= 4 ? {
		layer: r,
		place: n.panel
	} : null;
}
function X(e, t) {
	let n = e;
	for (let e = 1; e < t; e++) n = n?.inner ?? {};
	return n ?? {};
}
function Wt(e, t, n) {
	return t <= 1 ? n(e) : {
		...e,
		inner: Wt(e.inner ?? {}, t - 1, n)
	};
}
function Gt(e, t) {
	let n = e[t];
	return !n || n.place === "main" ? n ? [t] : [] : e.flatMap((e, t) => e && e.layer === n.layer && e.place === n.place ? [t] : []);
}
var Kt = {
	main: "Main",
	left: "Left",
	top: "Top",
	right: "Right",
	bottom: "Bottom"
};
function qt(e, t) {
	let n = e[t];
	if (!n) return "";
	let r = Gt(e, t);
	return `${n.layer > 1 && n.place !== "main" ? `L${n.layer} ` : ""}${Kt[n.place]}${r.length > 1 ? ` ${r.indexOf(t) + 1}` : ""}`;
}
function Jt(e, t) {
	let n = Yt(e);
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
var Yt = (e) => e.flatMap((e, t) => {
	let n = Y(e, t);
	return n ? [{
		from: t,
		...n
	}] : [];
}), Xt = (e, t) => t !== "main" && e[t]?.size === "auto";
function Zt(e, t) {
	let n = e.map((e) => {
		let t = typeof e.columns == "number" ? e.columns : 12;
		return Math.min(e.max_columns ?? Infinity, Math.max(e.min_columns ?? 0, t));
	});
	return t ? n.reduce((e, t) => e + t, 0) : Math.max(0, ...n);
}
var Qt = (e, t, n, r = 8) => e > 0 ? Math.max(0, Math.round(e * (t + r) / (12 * n) - r)) : 0;
function $t(e, t, n, r, i, a) {
	let o = {
		width: t,
		height: n,
		aspects: {}
	};
	for (let [t, n] of Object.entries(H.main)) o[t] = e[t] ?? n.default;
	for (let s of K) {
		let c = e[s] ?? {}, l = s === "top" || s === "bottom" ? n : t, u = Xt(e, s) ? l > 0 ? i(s) / l * 100 : 0 : c.size;
		o[s] = {
			...H.panels[s],
			...c,
			...u !== void 0 && { size: u },
			fit: "cover",
			lines: 1,
			cameras: (a || !c.hidden) && r(s) ? [s] : []
		};
	}
	return o;
}
var en = [
	"top",
	"right",
	"bottom",
	"left"
];
function tn(e) {
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
var nn = (e, t) => e == null || e === "" ? t : Math.max(0, Number(e) || 0);
function rn(e, t) {
	let n = X(e, t), r = Number(e.gap ?? H.main.gap.default);
	return {
		gap: r,
		middle: Object.fromEntries(K.map((e) => [e, nn(n[e]?.gap, r)]))
	};
}
function an(e, t, n, r, i = 4, a = "start") {
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
var on = (e, t) => Math.floor(e / t);
function sn(e, t, n) {
	let { width: r, height: i } = e, a = wt(e, n), o = (t) => e[t].cameras.length > 0, s = (t, n) => o(t) ? e[t].unit === "px" ? Math.min(q(e[t].size * (e.scale ?? 1)), on(n * 45, 100)) : q(n * e[t].size / 100) : 0, c = (t, n) => {
		let r = `anchor_${n}`;
		return !!(e[t][r] ?? H.panels[t][r]);
	}, l, u, d, f, p = 0, m = 0;
	if (a === null) [l, u, d, f] = [
		s("left", r),
		s("right", r),
		s("top", i),
		s("bottom", i)
	];
	else {
		let n = Number(e.panel_min ?? H.main.panel_min.default), s = (e, r, i) => (o(r) ? q(e * n / 100) + t[r] : 0) + (o(i) ? q(e * n / 100) + t[i] : 0), c = r - s(r, "left", "right"), h = i - s(i, "top", "bottom");
		p = Math.min(q(r * Number(e.main_width ?? H.main.main_width.default) / 100), c), m = q(p / a), m > h && ([m, p] = [h, q(h * a)]);
		let g = (e, n, r) => {
			let [i, a] = [o(n), o(r)], s = Math.max(e - (i ? t[n] : 0) - (a ? t[r] : 0), 0);
			return i && a ? [on(s, 2), s - on(s, 2)] : i ? [s, 0] : a ? [0, s] : [0, 0];
		};
		[l, u] = g(r - p, "left", "right"), [d, f] = g(i - m, "top", "bottom");
	}
	let h = l + (l ? t.left : 0), g = r - u - (u ? t.right : 0), _ = d + (d ? t.top : 0), v = i - f - (f ? t.bottom : 0), y = (e, t, n) => {
		let i = c(e, "left") ? 0 : h;
		return [
			i,
			t,
			(c(e, "right") ? r : g) - i,
			n
		];
	}, b = (e, t, n) => {
		let r = d && c("top", n) ? _ : 0;
		return [
			e,
			r,
			t,
			(f && c("bottom", n) ? v : i) - r
		];
	}, x = {
		top: y("top", 0, d),
		bottom: y("bottom", i - f, f),
		left: b(0, l, "left"),
		right: b(r - u, u, "right")
	}, S = [
		h,
		_,
		g - h,
		v - _
	];
	return a !== null && (p = Math.min(p, g - h), m = Math.min(m, v - _), S = [
		h + on(g - h - p, 2),
		_ + on(v - _ - m, 2),
		p,
		m
	]), {
		mid: S,
		edges: Object.fromEntries(K.map((e) => [e, o(e) ? x[e] : null]))
	};
}
function cn() {
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
var ln = (e) => Math.max(1, ...e.flatMap((e) => e && e.place !== "main" ? [e.layer] : []));
function un(e, t, n, r, i = 4, a = !1) {
	let o = ln(r);
	if (!n || o < 2 || a) return dn(e, t, n, r, i, n, a);
	let s = dn(e, t, !1, r, i, !0);
	if (s.boxes.length < o) return dn(e, t, n, r, i);
	let c = e;
	for (let t = 1; t < o; t++) {
		let [n, r] = [s.boxes[t - 1], s.boxes[t]], { middle: i } = rn(e, t), a = (e, t) => e > 0 ? e - i[t] : 0, o = {
			left: a(r[0] - n[0], "left"),
			top: a(r[1] - n[1], "top"),
			right: a(n[0] + n[2] - r[0] - r[2], "right"),
			bottom: a(n[1] + n[3] - r[1] - r[3], "bottom")
		};
		c = Wt(c, t, (e) => ({
			...e,
			...Object.fromEntries(K.map((t) => [t, {
				...e[t],
				size: o[t],
				unit: "px"
			}]))
		}));
	}
	let l = s.boxes[o - 1];
	return dn(c, [t[0] + s.canvas[0] - l[2], t[1] + s.canvas[1] - l[3]], !0, r, i);
}
function dn(e, [t, n], r, i, a, o = r, s = !1) {
	let c = Math.max(0, Math.floor((Math.min(t, n) - 1) / 2)), l = tn(e.margin).map((e) => Math.min(e, c)), u = l.map((e) => !r || s || e <= 25 ? e : 0), [d, f] = [t - u[1] - u[3], n - u[0] - u[2]], p = ln(i), m = i.findIndex((e) => e?.place === "main" && e.shows), [h, g] = [cn(), cn()], _ = [], v = [], y = [], [b, x, S, C] = [
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
			...$t({
				...e,
				...Object.fromEntries(K.map((e) => [e, d[e]])),
				...t < p && { main_fit: "fit" }
			}, n[2], n[3], l, u, o),
			margin: 0
		}, w = rn(e, t), { mid: T, edges: E } = sn(f, w.middle, l("main") ? "main" : null), D = (e) => E[e] ?? [
			0,
			0,
			0,
			0
		], [ee, O, k, te] = [
			D("left")[2],
			D("top")[3],
			D("right")[2],
			D("bottom")[3]
		], A = w.middle, j = h.add(b.at + ee, b, x), M = h.add(b.at + (ee && ee + A.left), j, x), N = h.add(x.at - (k && k + A.right), M, x), ne = h.add(x.at - k, N, x), re = g.add(S.at + O, S, C), P = g.add(S.at + (O && O + A.top), re, C), F = g.add(C.at - (te && te + A.bottom), P, C), ie = g.add(C.at - te, F, C), I = (e, t) => !!f[e][`anchor_${t}`], ae = (e, t) => E[e] !== null && I(e, t), oe = {
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
			let n = e === "top" || e === "bottom", r = n ? h : g, { cross: o, along: c } = oe[e], [l, u] = c, f = s(e), p = an(u.at - l.at, w.gap, f.map((e) => i[e]), n, a, d[e]?.arrange), m = f.map((e, t) => t).sort((e, t) => p[e].at - p[t].at), v = l, b = [];
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
function fn(e, t, n = (e) => e.rect) {
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
var pn = /* @__PURE__ */ new Map();
function mn(e, t) {
	let n = `${e}/${t}`, r = pn.get(n);
	return r || pn.set(n, r = { naturals: {} }), r;
}
//#endregion
//#region src/panel-options.ts
var Z = "auto", hn = /* @__PURE__ */ new Set(["fit", "lines"]), gn = (e) => ({
	...H.panels[e],
	unit: "%",
	hide_empty: !0,
	arrange: "start"
}), Q = (e) => e === "top" || e === "bottom", $ = (e, t) => ({ number: {
	min: e,
	max: t,
	mode: "box",
	unit_of_measurement: "px"
} });
function _n(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) if (n === "inner") {
		let e = _n(r ?? {});
		Object.keys(e).length && (t.inner = e);
	} else if (K.includes(n)) {
		let e = gn(n), i = Object.fromEntries(Object.entries(r ?? {}).filter(([t, n]) => !hn.has(t) && n !== e[t]));
		Object.keys(i).length && (t[n] = i);
	} else r !== H.main[n]?.default && (t[n] = r);
	return t;
}
function vn(e, t, n, r, i) {
	let a = !!t && typeof t == "object", o = a ? 0 : Number(t) || 0, s = (e) => a ? Number(t[e]) || 0 : o;
	return {
		data: {
			[e]: o,
			[`${e}_each`]: a,
			...Object.fromEntries(en.map((t) => [`${e}_${t}`, s(t)]))
		},
		schema: [...a ? en.map((t) => ({
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
			...Object.fromEntries(en.map((t) => [`${e}_${t}`, [`${r}, ${t}`, ""]]))
		},
		read(t) {
			return t[`${e}_each`] ? Object.fromEntries(en.map((n) => [n, Number(t[`${e}_${n}`] ?? t[e]) || 0])) : Number(t[e]) || 0;
		}
	};
}
function yn(e) {
	let t = Object.fromEntries(Object.entries(H.main).map(([t, n]) => [t, e[t] ?? n.default]));
	return {
		schema: Ie(String(t.main_fit)).flatMap((e) => e.name === "main_fit" ? [{
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
		data: t,
		change: (t) => ({
			...e,
			...t
		})
	};
}
function bn(e, t, n, r, i) {
	let a = X(e, t)[n] ?? {}, o = a.size === Z, s = {
		...gn(n),
		...a,
		[Z]: o
	};
	o && (s.size = H.panels[n].size);
	let c = s.unit === "px", l = [
		{
			name: Z,
			selector: { boolean: {} }
		},
		...Le(n).filter((e) => !hn.has(e.name) && !e.name.startsWith("anchor_") && (!o || e.name !== "size" && e.name !== "unit")).map((e) => e.name === "size" && c ? {
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
						label: Q(n) ? "From the left" : "From the top"
					},
					{
						value: "centre",
						label: "Centred"
					},
					{
						value: "end",
						label: Q(n) ? "From the right" : "From the bottom"
					}
				]
			} }
		}
	].filter((e) => !i || i.includes(e.name)), u = Q(n) ? "tall" : "wide";
	return {
		schema: l,
		data: s,
		labels: {
			[Z]: [`As ${u} as its cards`, `The edge is exactly as ${u} as what its panels hold, as cards show and hide.`],
			arrange: ["Arrange", "Where its panels sit when they do not fill it (none filling); those held to the end stay there."]
		},
		change: (i) => {
			let { [Z]: a, ...o } = i, c = a ? Z : o.size === Z ? H.panels[n].size : o.size;
			if (!a && o.unit !== s.unit) {
				let [e, t] = r() ?? [0, 0], i = Q(n) ? t : e;
				i > 0 && (c = Math.round(o.unit === "px" ? i * c / 100 : Math.min(100, c * 100 / i)));
			}
			return Wt(e, t, (e) => ({
				...e,
				[n]: {
					...e[n],
					...o,
					size: c
				}
			}));
		}
	};
}
function xn(e, t, n) {
	let r = t.labels ?? {};
	return L`<ha-form
    .hass=${e}
    .data=${t.data}
    .schema=${t.schema}
    .computeLabel=${(e) => r[e.name]?.[0] ?? ze(e)}
    .computeHelper=${(e) => r[e.name]?.[1] ?? Be(e)}
    @value-changed=${(e) => {
		e.stopPropagation(), n(t.change(e.detail.value));
	}}
  ></ha-form>`;
}
function Sn(e, t, n, r) {
	let i = e.view_layout ?? {}, a = vn("padding", i.padding ?? 0, 400, "Padding", "Room inside it, round its cards, px: to line them up."), { view_layout: o, ...s } = e, c = (e, t, n = s) => {
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
function Cn(e, t) {
	let n = e.getBoundingClientRect(), [r, i] = [window.innerWidth, window.innerHeight], a = Math.max(8, Math.min(n.left, r - t.offsetWidth - 8)), o = i - n.bottom - 12, s = n.top - 12;
	return o >= 360 || o >= s ? `left:${a}px;top:${n.bottom + 4}px;max-height:${o}px` : `left:${a}px;bottom:${i - n.top + 4}px;max-height:${s}px`;
}
var wn = class extends V {
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
		e && (this.at = Cn(this.anchor(), e));
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
		return L`<div class="backdrop" @click=${() => this.cancel()}></div>
      <div class="box" role="dialog" aria-label=${t} style=${this.at || "visibility:hidden"}>
        <header><h2>${e}</h2>${n}</header>
        <div class="middle">${customElements.get("ha-form") ? r : L`<p class="note">Loading…</p>`}</div>
        <footer>
          <button class="text" @click=${() => this.cancel()}>Cancel</button>
          <button class="primary" ?disabled=${this.busy} @click=${() => this.save()}>Save</button>
        </footer>
      </div>`;
	}
	static {
		this.styles = o`
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
U("casa-mia-panel-options", class extends wn {
	constructor(...e) {
		super(...e), this.layout = {}, this.section = {};
	}
	static {
		this.properties = {
			...wn.properties,
			layout: { state: !0 },
			section: { state: !0 }
		};
	}
	open(e) {
		this.o = e, this.layout = e.layout, this.section = e.section, document.body.append(this), Ae().then(() => this.requestUpdate());
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
		return this.o.save(_n(this.layout), this.section);
	}
	act(e) {
		this.cancel(), e?.();
	}
	group(e, t, n) {
		return L`<section>
      <h3>${e}</h3>
      ${t ? L`<p class="note">${t}</p>` : R}
      ${n}
    </section>`;
	}
	render() {
		if (!this.o) return R;
		let e = this.o, t = e.place === "main", n = e.place, r = `${e.layer > 1 ? `layer ${e.layer} ` : ""}${n} edge`, { add: i, back: a, on: o, remove: s } = e.actions, c = Q(n) ? ["←", "→"] : ["↑", "↓"], l = t ? L`<div class="actions">
          ${i ? L`<button @click=${() => this.act(i)}>+ Add a layer</button>` : R}
          ${s ? L`<button @click=${() => this.act(s)}>Remove layer ${e.count}</button>` : R}
        </div>` : L`<div class="actions">
          <button @click=${() => this.act(i)}>+ Add a panel</button>
          ${a || o ? L`<button ?disabled=${!a} aria-label="Move earlier" @click=${() => this.act(a)}>${c[0]}</button>
                <button ?disabled=${!o} aria-label="Move later" @click=${() => this.act(o)}>${c[1]}</button>` : R}
        </div>`;
		return this.frame(e.name, `${e.name} options`, l, L`${this.group("This panel", t ? "" : `${e.name} only.`, L`${xn(e.hass, Sn(this.section, e.place, e.columns, e.count === 1), (e) => this.change(this.layout, e))}
          <button class="link" @click=${() => this.act(e.edit)}>Visibility, background and more (HA's own)…</button>`)}
      ${t ? this.group("Whole view", "The main panel's shape.", xn(e.hass, yn(this.layout), (e) => this.change(e))) : this.group(`Whole ${r}`, e.count > 1 ? `All ${e.count} panels of the ${r}.` : `Every panel of the ${r} (one now).`, xn(e.hass, bn(this.layout, e.layer, n, e.room), (e) => this.change(e)))}`);
	}
});
function Tn(e) {
	document.createElement("casa-mia-panel-options").open(e);
}
U("casa-mia-mini", class extends wn {
	constructor(...e) {
		super(...e), this.value = {};
	}
	static {
		this.properties = {
			...wn.properties,
			value: { state: !0 }
		};
	}
	open(e) {
		this.o = e, this.value = e.value, document.body.append(this), Ae().then(() => this.requestUpdate());
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
		if (!this.o) return R;
		let e = this.o, t = e.actions?.length ? L`<div class="actions">
          ${e.actions.map((e) => L`<button
                @click=${() => {
			this.cancel(), e.run();
		}}
              >
                ${e.label}
              </button>`)}
        </div>` : R;
		return this.frame(e.title, e.title, t, L`<div class="plain">
        ${e.note ? L`<p class="note">${e.note}</p>` : R}
        ${xn(e.hass, e.form(this.value), (t) => {
			this.value = t, e.apply(t);
		})}
      </div>`);
	}
});
function En(e) {
	document.createElement("casa-mia-mini").open(e);
}
//#endregion
//#region src/view.ts
var Dn = o`
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
`, On = new CSSStyleSheet();
On.replaceSync("\n  .add { min-width: var(--row-height, 56px); } /* edit mode: HA's Add card button never narrower than tall */\n  :host([cm-fill]) ha-sortable { display: contents; }\n  :host([cm-fill]) .container { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; margin: 0; }\n  :host([cm-fill]) .card { flex: none; }\n  :host([cm-fill]) .card:has(> [cm-fill]) { flex: 1 1 0; min-height: 0; }\n  [cm-fill], [cm-fill] > * { display: block; height: 100%; }\n");
function kn(e, t) {
	let n = [];
	for (let r = e; r; r = r.parentElement ?? (r.getRootNode().host || null)) {
		let e = r.getBoundingClientRect?.().height ?? 0;
		e > t + 1 && n.push(`${r.tagName.toLowerCase()} ${Math.round(e)}`);
	}
	return n.length ? `\ntoo tall: ${n.join("\n")}` : "";
}
function An(e, t) {
	let n, r = !1;
	return e.connection.subscribeMessage((e) => t(e?.tablet_view ?? {}), { type: "casa_mia/settings/subscribe" }).then((e) => r ? e() : n = e).catch(() => t({})), () => {
		r = !0, n?.();
	};
}
var jn = (e) => Math.max(0, Number(e.header_space ?? H.main.header_space.default) || 0), [Mn, Nn] = [56, 8], Pn = "casa-mia-tablet-dimensions", Fn = "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z", In = "M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z";
function Ln(e) {
	return (e?.querySelector("hui-grid-section"))?.shadowRoot?.querySelector(".container")?.offsetHeight ?? 0;
}
je().then((e) => {
	class t extends e {
		constructor(...e) {
			super(...e), this.cmDebug = !1, this.cmApp = {}, this.cmLayout = {}, this.cmBoxes = [], this.cmGapsNow = [], this.cmSections = [], this.cmColumns = 4, this.cmFrame = 0, this.cmAdding = !1, this.cmSeen = new ResizeObserver(() => this.cmLater()), this.cmLater = () => {
				cancelAnimationFrame(this.cmFrame), this.cmFrame = requestAnimationFrame(() => this.cmPlace());
			}, this.cmTool = (e) => {
				let t = e.target.closest("button"), n = t?.closest(".cm-tools");
				if (!t || !n) return;
				e.stopPropagation();
				let r = Number(n.dataset.n), i = this.cmActions(r)[t.dataset.act];
				t.dataset.act === "options" ? this.cmOptions(r, t) : i?.();
			}, this.cmMark = (e) => {
				let t = e.target.closest("button");
				if (!t) return;
				e.stopPropagation();
				let n = t.dataset, r = () => this.cmGapsNow.find((e) => e.id === n.gap || e.id === n.line);
				n.gap ? r() && this.cmGap(r(), t) : n.line ? r() && this.cmLine(r(), t) : n.margin ? this.cmMargin(n.margin, t) : n.depth ? this.cmDepth(Number(n.depth.split(".")[0]), n.depth.split(".")[1], t) : n.lock ? this.cmAnchor(Number(n.lock.split(".")[0]), n.lock.split(".")[1], n.lock.split(".")[2]) : n.end === "header" || n.n === "header" ? this.cmHeader(t) : n.end === "footer" ? this.cmFooter(t) : n.n && this.cmOptions(Number(n.n), t);
			};
		}
		static {
			this.styles = [e.styles, Dn];
		}
		get cmSeenOut() {
			return mn(location.pathname.split("/")[1], this.index);
		}
		setConfig(e) {
			super.setConfig(e), this.cmDebug = !!e.debug, this.cmMarks(), this.cmLayout = e.layout ?? {}, this.cmSections = e.sections ?? [], this.cmColumns = Number(e.max_columns) || 4;
		}
		connectedCallback() {
			super.connectedCallback(), this.cmHolder = this.parentElement?.parentElement, this.cmHolder?.style.setProperty("min-height", "100dvh"), document.documentElement.style.setProperty("height", "100dvh"), this.cmSeen.observe(this), this.cmStop = Xe(() => this.cmLater()), this.addEventListener("section-visibility-changed", this.cmLater), this.addEventListener("card-visibility-changed", this.cmLater);
		}
		disconnectedCallback() {
			super.disconnectedCallback(), this.cmHolder?.style.removeProperty("min-height"), document.documentElement.style.removeProperty("height"), this.cmSeen.disconnect(), this.cmStop?.(), this.removeEventListener("section-visibility-changed", this.cmLater), this.removeEventListener("card-visibility-changed", this.cmLater), cancelAnimationFrame(this.cmFrame), this.cmUnwatch?.(), this.cmUnwatch = void 0;
		}
		cmMarks() {
			this.toggleAttribute("cm-identify", this.cmDebug || !!this.cmApp.identify_panels), this.style.setProperty("--cm-outline", this.cmApp.identify_outline || "1px solid red");
		}
		updated(e) {
			super.updated?.(e);
			let t = !!this.lovelace?.editMode;
			this.toggleAttribute("editing", t);
			let n = this.shadowRoot?.querySelector(".container > ha-sortable");
			n && (n.disabled = !0), t && this.cmComplete(), !this.cmUnwatch && this.hass && (this.cmUnwatch = An(this.hass, (e) => {
				this.cmApp = e, this.cmMarks(), this.cmLater();
			})), this.cmLater();
		}
		cmComplete() {
			let e = this.lovelace.config.views[this.index].sections ?? [], t = Ut.filter((t) => !e.some((e, n) => Y(e, n)?.layer === 1 && Y(e, n)?.place === t));
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
		cmBar(e) {
			let t = this.shadowRoot, n = t?.querySelector(".cm-bar");
			if (!e || this.isStrategy) return n?.remove();
			!n && t && (n = document.createElement("div"), n.className = "cm-bar", n.innerHTML = `<label><input type="checkbox" ${this.cmDimsOn ? "checked" : ""}>Show dimensions</label>`, n.querySelector("input").addEventListener("change", (e) => {
				this.cmDimsOn = e.target.checked, this.cmLater();
			}), t.prepend(n));
		}
		get cmDimsOn() {
			try {
				return localStorage.getItem(Pn) !== "off";
			} catch {
				return !0;
			}
		}
		set cmDimsOn(e) {
			try {
				localStorage.setItem(Pn, e ? "on" : "off");
			} catch {}
		}
		cmReseen(e) {
			let t = this.cmSeenOut.naturals;
			this.cmSeenOut.naturals = Object.fromEntries(e.flatMap((e, n) => e.from !== null && String(e.from) in t ? [[String(n), t[e.from]]] : []));
		}
		cmRestack(e) {
			let t = e(Yt(this.cmSections));
			return this.cmReseen(t), this.cmSaveView((e) => ({
				...e,
				sections: Jt(e.sections ?? [], t)
			}));
		}
		cmActions(e) {
			let t = Y(this.cmSections[e], e);
			if (!t) return {};
			if (t.place === "main") {
				let e = ln(Yt(this.cmSections)), t = [
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
						(!Yt(this.cmSections).some((e) => t(e) && this.cmSections[e.from]?.cards?.length) || confirm(`Remove layer ${e}? Its panels' cards go with it.`)) && this.cmRestack((e) => e.filter((e) => !t(e)));
					} }
				};
			}
			let n = (t) => {
				let n = Yt(this.cmSections), r = n.findIndex((t) => t.from === e), i = Gt(n, r), a = i[i.indexOf(r) + t];
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
			Tn({
				hass: this.hass,
				anchor: t,
				name: qt(r, e),
				...n,
				count: n.place === "main" ? ln(r) : Gt(r, e).length,
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
				length: Number(e.row_span) * (Mn + Nn) - Nn
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
			return Zt((this.sections[e]?._cards ?? []).filter((e) => !e.hidden).map((e) => e.getGridOptions?.() ?? {}), t === "top" || t === "bottom");
		}
		cmCards(e, t, n) {
			if (t.place === "main") return {};
			let r = t.place === "top" || t.place === "bottom", i = Xt(X(this.cmLayout, t.layer), t.place), a = this.cmCardColumns(e, t.place), [o, s, c, l] = tn(this.cmSections[e]?.view_layout?.padding), u = () => ({ wide: Qt(a || 12, n, this.cmColumns) + l + s }), d = () => ({ tall: (a ? this.cmNatural(e) : Math.max(Mn, this.cmNatural(e))) + o + c });
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
			let i = Ln(n);
			return this.lovelace?.editMode || (this.cmSeenOut.naturals[t] = i), i;
		}
		cmPlace() {
			let e = this.shadowRoot, t = e?.querySelector(".content");
			if (!t) return;
			let n = !!this.lovelace?.editMode;
			this.cmBar(n), this.toggleAttribute("cm-footer-float", this.cmLayout.footer === "float");
			let r = e.querySelector("hui-view-header"), i = this.cmLayout.header_space === void 0 ? void 0 : jn(this.cmLayout);
			r?.style.setProperty("padding-top", i === void 0 ? "" : `${i}px`);
			let a = this.cmSeenOut, [o, s] = n && a.shown ? [a.shown[0], a.shown[1] + (a.top === void 0 ? 0 : a.top - jn(this.cmLayout))] : this.cmArea();
			n || (this.cmSeenOut.shown = [o, s], this.cmSeenOut.top = r && !r.hidden ? jn(this.cmLayout) : void 0);
			let c = this.cmSections.findIndex((e, t) => Y(e, t)?.place === "main"), l = n && !(this.cmSections[c]?.cards?.length > 0), [u, d] = l ? this.cmArea() : [o, s], f = (e) => (e?._cards ?? []).filter((e) => G(e.config ?? { type: "" }) && !e.hidden), p = this.sections.map((e, t) => Y(this.cmSections[t], t)), m = (e) => {
				let t = p[e];
				return t.place === "top" || t.place === "bottom" ? Xt(X(this.cmLayout, t.layer), t.place) : t.place !== "main" && Gt(p, e).length > 1 && this.cmSections[e]?.view_layout?.length !== "fill";
			}, h = p.map((e, t) => {
				if (!e) return null;
				let r = this.sections[t], i = !!r && !r.hidden && (n || X(this.cmLayout, e.layer)[e.place]?.hide_empty === !1 || f(r).length > 0);
				return {
					...e,
					shows: i,
					...this.cmLock(this.cmSections[t], e.place),
					...this.cmCards(t, e, o)
				};
			}), g = un(this.cmLayout, [u, d], n, h, this.cmColumns, l);
			this.cmBoxes = g.boxes;
			let _ = n ? un(this.cmLayout, [o, s], !1, h, this.cmColumns) : g, v = g.inset.map((e) => `${e}px`).join(" "), y = g.inset.some(Boolean);
			t.style.inset = n ? "" : v, t.style.margin = n && y ? v : "", t.style.width = n && !l && (g.canvas[0] !== u || y) ? `${g.canvas[0]}px` : "", t.style.height = l ? `${g.canvas[1]}px` : "", t.style.gridTemplateColumns = g.columns, t.style.gridTemplateRows = g.rows;
			let b = [...e.querySelectorAll(".content > .section")];
			if (b.forEach((e, t) => {
				let r = g.places[t] ?? null;
				e.classList.toggle("cm-off", !r), e.classList.toggle("cm-hidden", n && !!r && !!p[t] && !!X(this.cmLayout, p[t].layer)[p[t].place]?.hidden);
				let i = this.cmSections[t]?.cards ?? [];
				e.classList.toggle("cm-garnish-only", n && !!r && !!p[t] && i.length > 0 && !i.some(G)), this.cmTools(e, n && !!r, p, t);
				let a = !!p[t] && p[t].place !== "main" && Gt(p, t).length > 1;
				if (e.querySelector("hui-section-edit-mode")?.toggleAttribute("cm-deletable", n && a), this.cmFill(this.sections[t], n || !p[t] || m(t) ? [] : f(this.sections[t])), this.cmGrid(this.sections[t], r && h[t] ? this.cmGridColumns(t, h) : null), !r) return;
				let o = p[t] ? tn(this.cmSections[t]?.view_layout?.padding) : [
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
		cmLineOf(e) {
			return e.edge ? X(this.cmLayout, e.edge.layer)[e.edge.place]?.line : this.cmSections[e.after]?.view_layout?.line_after;
		}
		cmGapSet(e, t, n, r, i) {
			if (e.edge) {
				let { layer: a, place: o } = e.edge;
				return [Wt(r, a, (e) => {
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
				let { layout: r, ...i } = n, a = _n(e);
				return {
					...i,
					sections: t,
					...Object.keys(a).length && { layout: a }
				};
			});
		}
		cmMini(e, t, n, r, i, a, o = []) {
			let [s, c] = [this.cmLayout, this.cmSections];
			En({
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
			return e.edge ? `Between the ${e.edge.layer > 1 ? `layer ${e.edge.layer} ` : ""}${e.edge.place} edge and its middle.` : `After ${qt(t, e.after)}, to the next along its edge.`;
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
			let n = tn(this.cmLayout.margin);
			this.cmMini(t, `Margin, ${e}`, e === "top" ? "Below the header." : e === "bottom" ? "Above the footer." : `Against the screen's ${e}.`, {
				margin: n[en.indexOf(e)],
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
				let o = Object.fromEntries(en.map((t, r) => [t, t === e ? a : n[r]]));
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
			this.cmMini(n, `${e > 1 ? `Layer ${e} ` : ""}${t[0].toUpperCase()}${t.slice(1)} edge`, t === "top" || t === "bottom" ? "How tall it is." : "How wide it is.", this.cmLayout, (n) => bn(n, e, t, r, [
				"auto",
				"size",
				"unit"
			]), (e, t, n) => [e, n]);
		}
		cmHeader(e) {
			let t = this.shadowRoot?.querySelector("hui-view-header");
			this.cmMini(e, "Header", "The view's header: its title and badges.", { header_space: jn(this.cmLayout) }, (e) => ({
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
		cmAnchor(e, t, n) {
			let r = `anchor_${n}`, i = X(this.cmLayout, e)[t]?.[r] ?? H.panels[t][r], a = Wt(this.cmLayout, e, (e) => ({
				...e,
				[t]: {
					...e[t],
					[r]: !i
				}
			}));
			this.cmSaveAll(a, this.cmSections);
		}
		cmLines(e, t, n, r) {
			let i = e.querySelector(":scope > .cm-lines"), a = fn(t, (e) => this.cmLineOf(e), (e) => this.cmGapRect(e, n, r));
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
		cmDims(e, t, n, r, i, a, o) {
			if (!t) return e.querySelector(":scope > .cm-dims")?.remove();
			let s = this.cmOverlay(e, "cm-dims"), c = e.getBoundingClientRect(), l = [...e.querySelectorAll(":scope > .section")], u = (e) => {
				let t = l[e]?.getBoundingClientRect();
				return t && t.width > 0 ? {
					l: t.left - c.left,
					t: t.top - c.top,
					r: t.right - c.left,
					b: t.bottom - c.top
				} : null;
			}, d = [], f = [], [p, m] = [5, 7], h = (e, t, n, r, i, a, o) => {
				let [s, c] = o ? [p, 0] : [0, p], l = Math.abs(o ? r - t : n - e), u = l >= 2 * m + 2 ? " marker-start=\"url(#cm-arrow)\" marker-end=\"url(#cm-arrow)\"" : "";
				d.push(`<line x1="${e}" y1="${t}" x2="${n}" y2="${r}"${u}/>`, `<line x1="${e - s}" y1="${t - c}" x2="${e + s}" y2="${t + c}"/>`, `<line x1="${n - s}" y1="${r - c}" x2="${n + s}" y2="${r + c}"/>`);
				let [h, g] = [i.length * 6.6 + 14, 16], _ = l >= (o ? g : h) + 2 * m + 6, [v, y] = [(e + n) / 2, (t + r) / 2], [b, x] = _ ? [v, y] : o ? [v + p + 4 + h / 2, y] : [v, y - p - 4 - g / 2];
				f.push(`<button ${a} style="left:${b}px;top:${x}px">${i}</button>`);
			}, g = (e) => `${Math.round(e)} px`, _ = (e, t, n) => Math.round(e + n * (t - e)), v = /* @__PURE__ */ new Map();
			n.forEach((e, t) => {
				e && e.place !== "main" && r.places[t] && u(t) && v.set(`${e.layer}.${e.place}`, [...v.get(`${e.layer}.${e.place}`) ?? [], t]);
			});
			for (let [e, t] of v) {
				let [n, i] = e.split("."), a = X(this.cmLayout, Number(n))[i] ?? {}, o = i === "top" || i === "bottom", s = Math.max(...t.map((e) => r.places[e].rect[o ? 3 : 2])), c = a.size === "auto" ? "auto" : a.unit === "px" ? "" : `${a.size ?? H.panels[i].size}%`, l = c ? `${c} · ${g(s)}` : g(s), d = t.map(u).reduce((e, t) => ({
					l: Math.min(e.l, t.l),
					t: Math.min(e.t, t.t),
					r: Math.max(e.r, t.r),
					b: Math.max(e.b, t.b)
				})), f = `title="How ${o ? "tall" : "wide"} the ${Number(n) > 1 ? `layer ${n} ` : ""}${i} edge is: as its cards, or a size"`;
				o ? h(_(d.l, d.r, .92), d.t, _(d.l, d.r, .92), d.b, l, `data-depth="${e}" ${f}`, !0) : h(d.l, _(d.t, d.b, .92), d.r, _(d.t, d.b, .92), l, `data-depth="${e}" ${f}`, !1);
			}
			for (let e of i) {
				let [t, n, r, i] = this.cmGapRect(e, a, o), s = `data-gap="${e.id}" title="This gap: its size, or every gap's; or add a line in it"`;
				e.across ? h(_(t, t + r, .3), n, _(t, t + r, .3), n + i, `gap ${e.size}`, s, !0) : h(t, _(n, n + i, .3), t + r, _(n, n + i, .3), `gap ${e.size}`, s, !1);
			}
			let [y, b, x, S] = r.inset, [C, w] = [c.width, c.height], T = (e, t) => `data-margin="${e}" title="The margin ${t}: this side, or every side"`;
			h(_(0, C, .3), -y, _(0, C, .3), 0, `margin ${y}`, T("top", "below the header"), !0), h(_(0, C, .3), w, _(0, C, .3), w + x, `margin ${x}`, T("bottom", "above the footer"), !0), h(-S, _(0, w, .3), 0, _(0, w, .3), `margin ${S}`, T("left", "against the screen's left"), !1), h(C, _(0, w, .3), C + b, _(0, w, .3), `margin ${b}`, T("right", "against the screen's right"), !1), r.places.forEach((e, t) => {
				let n = e && u(t);
				if (!n) return;
				let [r, i, a, o] = tn(this.cmSections[t]?.view_layout?.padding), s = `data-n="${t}" title="Its padding, round its cards: in its options"`;
				r && h(_(n.l, n.r, .5), n.t, _(n.l, n.r, .5), n.t + r, `pad ${r}`, s, !0), a && h(_(n.l, n.r, .5), n.b - a, _(n.l, n.r, .5), n.b, `pad ${a}`, s, !0), o && h(n.l, _(n.t, n.b, .5), n.l + o, _(n.t, n.b, .5), `pad ${o}`, s, !1), i && h(n.r - i, _(n.t, n.b, .5), n.r, _(n.t, n.b, .5), `pad ${i}`, s, !1);
			});
			let E = e.getRootNode().querySelector("hui-view-header")?.getBoundingClientRect();
			if (E && E.height > 0) {
				let e = jn(this.cmLayout), t = Math.round(E.left - c.left + .92 * E.width);
				h(t, E.top - c.top, t, E.top - c.top + e, `space ${e}`, "data-n=\"header\" title=\"The space above the header\"", !0);
			}
			r.places.forEach((e, t) => {
				let n = e && u(t);
				n && f.push(`<button class="cm-size" data-n="${t}" title="Its size on the screen, out of edit mode; its options" style="left:${n.r - 6}px;top:${n.b - 6}px">${Math.round(e.rect[2])} × ${Math.round(e.rect[3])}</button>`);
			});
			let D = `<svg><defs><marker id="cm-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>${d.join("")}</svg>${f.join("")}`;
			s.dataset.html !== D && ([s.innerHTML, s.dataset.html] = [D, D]);
		}
		cmEditMarks(e, t, n, r) {
			if (!t) return e.querySelector(":scope > .cm-ends")?.remove();
			let i = this.cmOverlay(e, "cm-ends"), a = e.getRootNode(), o = e.getBoundingClientRect(), s = [];
			for (let e of ["header", "footer"]) {
				let t = a.querySelector(`hui-view-${e}`)?.getBoundingClientRect(), n = e === "header" ? "The header: the space above it, and HA's own editor for the rest" : "The footer: take space under the panels or float over them, and HA's own editor";
				t && t.height > 0 && s.push(`<button class="cm-chip" data-end="${e}" title="${n}" style="left:${Math.round(t.left - o.left + 10)}px;top:${Math.round(t.top - o.top + 6)}px">${e}</button>`);
			}
			for (let e of r) {
				let [t, n] = [Math.round((e.x1 + e.x2) / 2), Math.round((e.y1 + e.y2) / 2)];
				s.push(`<button class="cm-line" data-line="${e.id}" title="This line: its width, colour, style, knock and ends, or remove it" style="left:${t}px;top:${n}px">line</button>`);
			}
			let c = [...e.querySelectorAll(":scope > .section")], l = (e) => {
				let t = c[e]?.getBoundingClientRect();
				return t && t.width > 0 && !c[e].classList.contains("cm-off") ? {
					l: t.left - o.left,
					t: t.top - o.top,
					r: t.right - o.left,
					b: t.bottom - o.top
				} : null;
			}, u = (e) => e.map(l).reduce((e, t) => t ? e ? {
				l: Math.min(e.l, t.l),
				t: Math.min(e.t, t.t),
				r: Math.max(e.r, t.r),
				b: Math.max(e.b, t.b)
			} : t : e, null), d = Math.max(1, ...n.map((e) => e && e.place !== "main" ? e.layer : 1));
			for (let e = 1; e <= d; e++) for (let t of ["top", "bottom"]) {
				let r = u(n.flatMap((n, r) => n && n.layer === e && n.place === t ? [r] : []));
				if (!r) continue;
				let i = Math.round((r.t + r.b) / 2);
				for (let n of ["left", "right"]) {
					let a = `anchor_${n}`, o = !!(X(this.cmLayout, e)[t]?.[a] ?? H.panels[t][a]), c = Math.round(n === "left" ? r.l : r.r), l = `${e > 1 ? `Layer ${e} ` : ""}${t} edge to the ${n} side: ${o ? "on" : "off"}`, u = `${e > 1 ? `Layer ${e}'s ` : "The "}${t} edge ${o ? "runs" : "stops short of the side panel; click to run it"} to the ${n} side${o ? ", over the side panel; click to stop it short" : ""}`;
					s.push(`<button class="cm-lock ${o ? "on" : ""}" data-lock="${e}.${t}.${n}" aria-label="${l}" title="${u}" style="left:${c}px;top:${i}px"><svg viewBox="0 0 24 24"><path d="${o ? Fn : In}"/></svg></button>`);
				}
			}
			let f = s.join("");
			i.dataset.html !== f && ([i.innerHTML, i.dataset.html] = [f, f]);
		}
		cmTools(e, t, n, r) {
			let i = e.querySelector(":scope > .cm-tools");
			if (!t || !n[r]) return e.style.minWidth = "", i?.remove();
			i || (i = document.createElement("div"), i.className = "cm-tools", i.addEventListener("click", this.cmTool), e.append(i));
			let a = n[r], o = Gt(n, r), s = o.indexOf(r), c = a.place === "top" || a.place === "bottom", l = ln(n), u = a.place !== "main" && X(this.cmLayout, a.layer)[a.place]?.hidden, d = a.place === "main" && l > 1 ? `Main · ${l} layers` : `${qt(n, r)}${u ? " · hidden" : ""}`, f = a.place === "main" ? "The main panel: its padding, and the main panel's shape; add or remove a layer" : `${qt(n, r)}: its own options, and its whole edge's`, [p, m] = c ? ["left", "right"] : ["up", "down"], h = `<button class="cm-chip" data-act="options" title="${f}">${d}</button>` + (a.place === "main" ? l < 4 ? "<button data-act=\"add\" aria-label=\"Add a layer\" title=\"Add a layer inside this one: its four edges, a panel each\">+</button>" : "" : "<button data-act=\"add\" aria-label=\"Add a panel\" title=\"Add a panel after this one, in its edge\">+</button>" + (o.length > 1 ? `<button data-act="back" aria-label="Move earlier" title="Move it ${p}, along its edge" ${s === 0 ? "disabled" : ""}>${c ? "←" : "↑"}</button><button data-act="on" aria-label="Move later" title="Move it ${m}, along its edge" ${s === o.length - 1 ? "disabled" : ""}>${c ? "→" : "↓"}</button>` : ""));
			i.dataset.html !== h && ([i.innerHTML, i.dataset.html] = [h, h]), i.dataset.n = String(r);
			let g = e.querySelector("hui-section-edit-mode"), _ = 18 + (g?.shadowRoot?.querySelector(".section-actions")?.offsetWidth ?? 0);
			i.classList.remove("cm-narrow"), i.classList.toggle("cm-narrow", i.scrollWidth > e.clientWidth - _);
			let v = i.querySelector(".cm-chip")?.offsetWidth ?? 0, y = g?.shadowRoot?.querySelector(".section-wrapper"), b = y && getComputedStyle(y), x = b ? [
				"paddingLeft",
				"paddingRight",
				"borderLeftWidth",
				"borderRightWidth"
			].reduce((e, t) => e + (parseFloat(b[t]) || 0), 0) : 0, S = parseFloat(getComputedStyle(e).getPropertyValue("--row-height")) || Mn;
			e.style.minWidth = `${Math.ceil(Math.max(v + _, S + x))}px`;
		}
		cmGridColumns(e, t) {
			let n = t[e], r = t.flatMap((e, t) => e?.shows && e.layer === n.layer && e.place === n.place ? [t] : []), i = (e) => this.cmCardColumns(e, n.place);
			return n.place === "top" || n.place === "bottom" ? n.share === void 0 && n.size !== "fill" && r.length > 1 && i(e) || null : n.place === "main" || !Xt(X(this.cmLayout, n.layer), n.place) ? null : Math.max(0, ...r.map(i)) || null;
		}
		cmGrid(e, t) {
			let n = e?.querySelector("hui-grid-section");
			n && (t === null ? (n.style.removeProperty("--base-column-count"), n.style.removeProperty("--column-span")) : (n.style.setProperty("--base-column-count", String(t)), n.style.setProperty("--column-span", "1")));
		}
		cmFill(e, t) {
			let n = e?.querySelector("hui-grid-section");
			if (!n?.shadowRoot) return;
			let r = n.shadowRoot.adoptedStyleSheets;
			r.includes(On) || (n.shadowRoot.adoptedStyleSheets = [...r, On]);
			let i = t.length === 1 && rt(t[0].config ?? { type: "" }) ? t[0] : null;
			n.toggleAttribute("cm-fill", !!i);
			for (let t of e._cards ?? []) t.toggleAttribute("cm-fill", t === i);
		}
		cmShow() {
			if (!this.cmDebug && !this.cmApp.show_size) return this.cmLabel?.remove();
			this.cmLabel?.isConnected || (this.cmLabel = document.createElement("div"), this.cmLabel.className = "cm-debug", this.shadowRoot?.prepend(this.cmLabel));
			let e = this.getBoundingClientRect(), t = document.documentElement;
			this.cmLabel.textContent = `view ${Math.round(e.width)} x ${Math.round(e.height)}, room ${Ke(this)}\npage scrolls ${t.scrollWidth - t.clientWidth} x ${t.scrollHeight - t.clientHeight}` + kn(this, t.clientHeight);
		}
	}
	U("casa-mia-tablet-layout", t), U("casa-mia-tablet-view", class extends t {});
});
var Rn = new CSSStyleSheet();
Rn.replaceSync(".handle, ha-dropdown-item[value=\"duplicate\"], :host(:not([cm-deletable])) ha-dropdown-item[value=\"delete\"], :host(:not([cm-deletable])) wa-divider { display: none; }\n  /* Its frame fills the panel's room, as the panel does out of edit mode (not only its cards' height). */\n  :host { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }\n  .section-wrapper { flex: 1 1 auto; box-sizing: border-box; }"), customElements.whenDefined("hui-section-edit-mode").then(() => {
	let e = customElements.get("hui-section-edit-mode").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		for (let e = this; e; e = e.parentElement ?? (e.getRootNode().host || null)) if (Bn.some((t) => e.tagName === t.slice(7).toUpperCase())) {
			let e = this.shadowRoot;
			e && !e.adoptedStyleSheets.includes(Rn) && (e.adoptedStyleSheets = [...e.adoptedStyleSheets, Rn]);
			return;
		}
	};
});
var zn = "custom:casa-mia-tablet-layout", Bn = [zn, "custom:casa-mia-tablet-view"];
customElements.whenDefined("hui-view-editor").then(() => {
	let e = customElements.get("hui-view-editor").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		let n = this._schema;
		typeof n == "function" && (this._schema = (...e) => n(...e).map((e) => {
			if (e.name === "section_specifics" && Bn.includes(this._config?.type)) return {
				...e,
				visible: void 0,
				schema: e.schema.filter((e) => e.name !== "dense_section_placement")
			};
			let t = e.name === "type" ? e.selector?.select?.options : void 0;
			return !t || t.some((e) => e.value === zn) ? e : {
				...e,
				selector: { select: {
					...e.selector.select,
					options: [...t, {
						value: zn,
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
			n.set.call(this, Bn.includes(e?.type) && e.max_columns === void 0 ? {
				...e,
				max_columns: 4
			} : e);
		}
	});
	let r = e._valueChanged;
	e._valueChanged = function(e) {
		let t = e.detail?.value;
		if (!Bn.includes(t?.type)) return r.call(this, e);
		let n = new Proxy(t, { deleteProperty: (e, t) => t === "max_columns" || t === "top_margin" || Reflect.deleteProperty(e, t) });
		return r.call(this, new CustomEvent(e.type, { detail: { value: n } }));
	};
}), customElements.whenDefined("hui-dialog-edit-view").then(() => {
	let e = customElements.get("hui-dialog-edit-view").prototype, t = Object.getOwnPropertyDescriptor(e, "_type");
	t?.get && Object.defineProperty(e, "_type", {
		...t,
		get() {
			return Bn.includes(this._config?.type) ? "sections" : t.get.call(this);
		}
	});
});
//#endregion
//#region src/garnish-editor.ts
var Vn = "M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z", Hn = {
	content: "Content: while this card shows, its panel shows. Tap to make it garnish.",
	garnish: "Garnish: adornment, like a heading, that never holds its panel open; the panel hides when only garnish is left. Tap to make it content."
}, Un = new CSSStyleSheet();
Un.replaceSync("\n  .cm-garnish {\n    position: absolute; bottom: -13px; right: 4px; z-index: 3;\n    padding: 0; border: none; background: none; cursor: pointer;\n  }\n  .cm-garnish .cm-sprig {\n    display: block; box-sizing: border-box; width: 26px; height: 26px; padding: 4px; border-radius: 50%;\n    border: 1px solid var(--primary-color); color: var(--primary-color);\n    background: var(--card-background-color, #fff); opacity: 0.6;\n  }\n  .cm-garnish:hover .cm-sprig, .cm-garnish:focus-visible .cm-sprig { opacity: 1; }\n  .cm-garnish svg { display: block; width: 16px; height: 16px; fill: currentColor; }\n  .cm-garnish[aria-pressed=\"true\"] .cm-sprig { opacity: 1; color: var(--text-primary-color, #fff); background: var(--primary-color); }\n  .cm-garnish-frame {\n    position: absolute; inset: 0; z-index: 2; pointer-events: none;\n    border: 2px dashed var(--primary-color); border-radius: var(--ha-card-border-radius, 12px);\n  }\n  :host(.cm-garnished) ::slotted(*) { opacity: 0.55; }\n"), customElements.whenDefined("hui-card-edit-mode").then(() => {
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
		let a = at(this.path ?? []), o = ((e) => a.reduce((e, t) => e?.[t], e))(this.lovelace?.config);
		if (!i || !this.lovelace?.editMode || this.noEdit || !a.includes("sections") || !o?.type) return this.classList.remove("cm-garnished"), n.querySelector(".cm-garnish-frame")?.remove(), r?.remove();
		n.adoptedStyleSheets.includes(Un) || (n.adoptedStyleSheets = [...n.adoptedStyleSheets, Un]), r || (r = document.createElement("button"), r.type = "button", r.className = "cm-garnish", r.innerHTML = `<span class="cm-sprig"><svg viewBox="0 0 24 24"><path d="${Vn}"/></svg></span>`, r.addEventListener("pointerdown", (e) => e.stopPropagation()), r.addEventListener("click", async (e) => {
			e.stopPropagation(), r.disabled = !0;
			try {
				let e = structuredClone(this.lovelace.config), t = at(this.path), n = t.slice(0, -1).reduce((e, t) => e[t], e), r = t[t.length - 1], i = G(n[r]);
				n[r] = it(n[r], i), await this.lovelace.saveConfig(e), console.info(`CASA-MIA CARDS: panel card marked ${i ? "Garnish" : "Content"}`);
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
		let s = !G(o);
		r.setAttribute("aria-pressed", String(s)), r.title = Hn[s ? "garnish" : "content"], r.setAttribute("aria-label", r.title), this.classList.toggle("cm-garnished", s);
		let c = n.querySelector(".cm-garnish-frame");
		s && !c ? (c = document.createElement("div"), c.className = "cm-garnish-frame", n.append(c)) : s || c?.remove();
	};
}), console.info(`%cCASA-MIA CARDS\n%ccommander, section, tablet layout (${Mt})`, "color: green; font-weight: bold;", ""), Mt !== "dev" && window.hassConnection?.then(({ conn: e }) => {
	e.addEventListener("ready", () => e.sendMessagePromise({ type: "casa_mia/cards" }).then(({ version: e }) => {
		e && e !== Mt && (console.warn(`CASA-MIA CARDS ${Mt} running, ${e} served: reload to update`), document.querySelector("home-assistant")?.dispatchEvent(new CustomEvent("hass-notification", {
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
