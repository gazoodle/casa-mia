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
var w = globalThis, T = (e) => e, E = w.trustedTypes, D = E ? E.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ee = "$lit$", O = `lit$${Math.random().toFixed(9).slice(2)}$`, te = "?" + O, ne = `<${te}>`, k = document, A = () => k.createComment(""), j = (e) => e === null || typeof e != "object" && typeof e != "function", re = Array.isArray, ie = (e) => re(e) || typeof e?.[Symbol.iterator] == "function", ae = "[ 	\n\f\r]", M = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, oe = /-->/g, se = />/g, N = RegExp(`>|${ae}(?:([^\\s"'>=/]+)(${ae}*=${ae}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ce = /'/g, le = /"/g, ue = /^(?:script|style|textarea|title)$/i, P = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), F = Symbol.for("lit-noChange"), I = Symbol.for("lit-nothing"), de = /* @__PURE__ */ new WeakMap(), L = k.createTreeWalker(k, 129);
function fe(e, t) {
	if (!re(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return D === void 0 ? t : D.createHTML(t);
}
var pe = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = M;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === M ? c[1] === "!--" ? o = oe : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = N) : (ue.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = N) : o = se : o === N ? c[0] === ">" ? (o = i ?? M, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? N : c[3] === "\"" ? le : ce) : o === le || o === ce ? o = N : o === oe || o === se ? o = M : (o = N, i = void 0);
		let d = o === N && e[t + 1].startsWith("/>") ? " " : "";
		a += o === M ? n + ne : l >= 0 ? (r.push(s), n.slice(0, l) + ee + n.slice(l) + O + d) : n + O + (l === -2 ? t : d);
	}
	return [fe(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, me = class e {
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
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ee)) {
					let t = u[o++], n = i.getAttribute(e).split(O), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? _e : r[1] === "?" ? ve : r[1] === "@" ? ye : z
					}), i.removeAttribute(e);
				} else e.startsWith(O) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ue.test(i.tagName)) {
					let e = i.textContent.split(O), t = e.length - 1;
					if (t > 0) {
						i.textContent = E ? E.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], A()), L.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], A());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === te) c.push({
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
		let n = k.createElement("template");
		return n.innerHTML = e, n;
	}
};
function R(e, t, n = e, r) {
	if (t === F) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = j(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = R(e, i._$AS(e, t.values), i, r)), t;
}
var he = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? k).importNode(t, !0);
		L.currentNode = r;
		let i = L.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new ge(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new be(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = L.nextNode(), a++);
		}
		return L.currentNode = k, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, ge = class e {
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
		e = R(this, e, t), j(e) ? e === I || e == null || e === "" ? (this._$AH !== I && this._$AR(), this._$AH = I) : e !== this._$AH && e !== F && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ie(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== I && j(this._$AH) ? this._$AA.nextSibling.data = e : this.T(k.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = me.createElement(fe(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new he(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = de.get(e.strings);
		return t === void 0 && de.set(e.strings, t = new me(e)), t;
	}
	k(t) {
		re(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(A()), this.O(A()), this, this.options)) : r = n[i], r._$AI(a), i++;
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
}, z = class {
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
		if (i === void 0) e = R(this, e, t, 0), a = !j(e) || e !== this._$AH && e !== F, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = R(this, r[n + o], t, o), s === F && (s = this._$AH[o]), a ||= !j(s) || s !== this._$AH[o], s === I ? e = I : e !== I && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === I ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, _e = class extends z {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === I ? void 0 : e;
	}
}, ve = class extends z {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== I);
	}
}, ye = class extends z {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = R(this, e, t, 0) ?? I) === F) return;
		let n = this._$AH, r = e === I && n !== I || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== I && (n === I || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, be = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		R(this, e);
	}
}, xe = {
	M: ee,
	P: O,
	A: te,
	C: 1,
	L: pe,
	R: he,
	D: ie,
	V: R,
	I: ge,
	H: z,
	N: ve,
	U: ye,
	B: _e,
	F: be
}, Se = w.litHtmlPolyfillSupport;
Se?.(me, ge), (w.litHtmlVersions ??= []).push("3.3.3");
var Ce = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new ge(t.insertBefore(A(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, we = globalThis, B = class extends C {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ce(t, this.renderRoot, this.renderOptions);
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
B._$litElement$ = !0, B.finalized = !0, we.litElementHydrateSupport?.({ LitElement: B });
var Te = we.litElementPolyfillSupport;
Te?.({ LitElement: B }), (we.litElementVersions ??= []).push("4.2.2");
var V = {
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
function H(e, t, n) {
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
	history.pushState(null, "", e), H(window, "location-changed", { replace: !1 });
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
var Ne = V.main, Pe = V.panel;
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
}, ze = (e) => Re[e.name]?.label ?? e.name, Be = (e) => Re[e.name]?.help?.replaceAll("{item}", "card"), Ve = 100, W = (e) => e.parentElement ?? (e.getRootNode().host || null);
function He(e) {
	for (let t = W(e); t; t = W(t)) {
		let e = t.tagName ?? "";
		if (e.includes("-") && e !== "HUI-CARD") return e;
	}
	return "";
}
function Ue(e) {
	for (let t = W(e); t; t = W(t)) if (t.tagName === "HUI-CARD") return t.hasAttribute("cm-fill");
	return !1;
}
function We(e) {
	for (let t = e; t; t = W(t)) if (t.tagName?.startsWith("HUI-DIALOG") || t.tagName === "HA-DIALOG") return !0;
	return !1;
}
function Ge(e) {
	let t = e.getBoundingClientRect().top + window.scrollY, n = window.visualViewport?.height ?? window.innerHeight;
	return Math.max(Ve, Math.floor(n - t));
}
function Ke(e, t, n = !1) {
	return t ? "preview" : e === "HUI-PANEL-VIEW" ? "screen" : e === "CASA-MIA-TABLET-LAYOUT" ? "tile" : n ? "cell" : "column";
}
function qe(e, t = !1) {
	let n = Ue(e) ? "CASA-MIA-TABLET-LAYOUT" : He(e);
	return {
		mode: Ke(n, We(e), t),
		room: Ge(e),
		container: n.toLowerCase()
	};
}
function Je(e, t, n) {
	switch (e.mode) {
		case "screen": return e.room;
		case "tile":
		case "cell": return null;
		default: return Math.round(t / n);
	}
}
function Ye(e) {
	return window.addEventListener("resize", e), window.visualViewport?.addEventListener("resize", e), () => {
		window.removeEventListener("resize", e), window.visualViewport?.removeEventListener("resize", e);
	};
}
function Xe(e) {
	let t = e.hostname.replace(/^\[|\]$/g, "").toLowerCase();
	return e.protocol === "http:" && (!t.includes(".") && !t.includes(":") || /^(127|10|192\.168|172\.(1[6-9]|2\d|3[01])|169\.254)\./.test(t) || /^(::1|f[cd][0-9a-f]{0,2}:.*|fe80:.*)$/.test(t) || /\.(local|lan|home|internal|home\.arpa)$/.test(t));
}
var Ze = {
	full: Infinity,
	balanced: 1.5,
	light: 1,
	saver: .75
};
function Qe(e, t, n = "balanced") {
	return t ? Math.min(e, Ze[n] ?? Ze.balanced) : e;
}
function $e(e, t, n) {
	let r = e.filter(([, e, t]) => e > 0 && t > 0);
	return (r.find(([, e, r]) => n ? e >= t[0] || r >= t[1] : e >= t[0] && r >= t[1]) ?? r[r.length - 1] ?? e[e.length - 1])?.[0];
}
var G = {
	tint: [
		61,
		123,
		255
	],
	strength: 3,
	darkness: 20
};
function et([e, t, n], r, i) {
	let [a, o, s] = [
		e,
		t,
		n
	].map((e) => e / 255), c = Math.max(a, o, s), l = c - Math.min(a, o, s), u = 0;
	return l && (u = c === a ? (o - s) / l % 6 : c === o ? (s - a) / l + 2 : (a - o) / l + 4), `grayscale(1) sepia(1) hue-rotate(${Math.round(u * 60 - 35)}deg) saturate(${r}) brightness(${Math.max(.1, 1 - i / 100).toFixed(2)}) contrast(1.1)`;
}
//#endregion
//#region src/section.ts
var tt = (e) => e.view_layout?.counts !== !1;
function nt(e) {
	let t = e, n = {
		...t.getGridOptions?.() ?? t._element?.getGridOptions?.() ?? {},
		...e.config?.grid_options
	};
	return {
		columns: n.columns === "full" ? 12 : Math.min(12, Math.max(1, Number(n.columns) || 12)),
		rows: typeof n.rows == "number" ? n.rows : "auto"
	};
}
var rt = class extends B {
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
			let n = nt(e);
			t.style.gridColumn = `span ${n.columns}`, t.style.gridRow = n.rows === "auto" ? "" : `span ${n.rows}`, t.style.height = n.rows === "auto" ? "" : `calc(${n.rows} * var(--row-height, 56px) + ${n.rows - 1} * var(--row-gap, 8px))`, t.hidden = !De(e);
		});
		let e = this.preview || this._cards.some((e, t) => tt(this._config.cards[t]) && De(e));
		this.hidden === e && (this.hidden = !e, H(this, "card-visibility-changed", { value: e }));
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
}, it = [
	["", "Its own"],
	["3", "Quarter"],
	["4", "Third"],
	["6", "Half"],
	["8", "Two thirds"],
	["12", "Full"]
];
function at(e) {
	let t = e.heading ?? e.title ?? e.name ?? e.entity ?? (e.content ? String(e.content).slice(0, 30) : "");
	return `${String(e.type).replace(/^custom:/, "")}${t ? `: ${t}` : ""}`;
}
async function ot(e, t, n, r, i) {
	let a = await ke();
	return a.hass = t, a.lovelace = n, a.setConfig({
		type: "vertical-stack",
		cards: r
	}), a.addEventListener("config-changed", (e) => {
		e.stopPropagation(), i(e.detail.config.cards ?? []);
	}), e.replaceChildren(a), a;
}
var st = class extends B {
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
		ot(this.renderRoot.querySelector(".stack"), this.hass, this.lovelace, this._config?.cards ?? [], (e) => this.save({
			...this._config,
			cards: e
		})).then((e) => this.stack = e);
	}
	updated(e) {
		this.stack && e.has("hass") && (this.stack.hass = this.hass);
	}
	save(e) {
		this._config = e, H(this, "config-changed", { config: e });
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
            <span class="name">${t + 1}. ${at(e)}</span>
            <label
              >Counts
              <ha-switch
                .checked=${tt(e)}
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
              ${it.map(([e, t]) => P`<option value=${e}>${t}</option>`)}
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
U("casa-mia-section", rt), U("casa-mia-section-editor", st), Me("casa-mia-section", "Casa Mia section", "A section's grid of cards that hides itself while none of the cards that count is showing.");
//#endregion
//#region node_modules/lit-html/directive.js
var ct = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), lt = class {
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
}, { I: ut } = xe, dt = {}, ft = (e, t = dt) => e._$AH = t, pt = ct(class extends lt {
	constructor() {
		super(...arguments), this.key = I;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (ft(e), this.key = t), n;
	}
}), K = [
	"left",
	"top",
	"right",
	"bottom"
], mt = [
	"stack",
	"reverse",
	"centre"
];
function q(e) {
	let t = Math.floor(e), n = e - t;
	return n > .5 ? t + 1 : n < .5 || t % 2 == 0 ? t : t + 1;
}
var J = (e, t) => Math.floor(e / t);
function ht(e, t, n, r) {
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
function gt(e, t, n, r, i) {
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
function _t(e, t, n, r, i, a, o) {
	n = Math.max(1, Math.min(n, t));
	let s = ht(e, n, !r, i), c = [], l = 0;
	return s.forEach((e, s) => {
		let u = Math.floor(t / n) + +(s < t % n);
		c.push(...a === null ? ht(e, u, r, i) : gt(e, a.slice(l, l + u), r, i, o)), l += u;
	}), c;
}
function vt(e) {
	let t;
	if (typeof e == "number") t = e;
	else {
		let [n, r] = String(e).trim().replace("/", ":").split(":");
		t = r === void 0 ? Number(n) : Number(n) / Number(r);
	}
	if (!(t > 0)) throw Error(`not a shape: ${e}`);
	return t;
}
var yt = (e) => V.main[e].default;
function bt(e, t) {
	let n = e.main_fit ?? yt("main_fit");
	return n === "fixed" ? vt(e.main_ratio ?? yt("main_ratio")) : n === "own" ? Number((e.aspects ?? {})[t ?? ""] || 16 / 9) : null;
}
function Y(e, t = null) {
	let { width: n, height: r, gap: i } = e, a = Math.max(0, Math.min(Math.trunc(Number(e.margin ?? 0)), J(Math.min(n, r) - 1, 2)));
	if (a) {
		let [, i, o] = Y({
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
	let o = bt(e, t), s = (t) => e[t].cameras.length > 0, c = (t, n) => s(t) ? e[t].unit === "px" ? Math.min(q(e[t].size * (e.scale ?? 1)), J(n * 45, 100)) : q(n * e[t].size / 100) : 0, l = (t, n) => {
		let r = `anchor_${n}`;
		return !!(e[t][r] ?? V.panels[t][r]);
	}, u, d, f, p, m = 0, h = 0;
	if (o === null) [u, d, f, p] = [
		c("left", n),
		c("right", n),
		c("top", r),
		c("bottom", r)
	];
	else {
		let t = Number(e.panel_min ?? yt("panel_min")), a = (e, n, r) => (Number(s(n)) + Number(s(r))) * (q(e * t / 100) + i), c = n - a(n, "left", "right"), l = r - a(r, "top", "bottom");
		m = Math.min(q(n * Number(e.main_width ?? yt("main_width")) / 100), c), h = q(m / o), h > l && ([h, m] = [l, q(l * o)]);
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
	}, C = (t) => mt.includes(e[t].fit ?? "") ? e[t].cameras.map((t) => Number((e.aspects ?? {})[t] || 16 / 9)) : null, w = Object.fromEntries(K.map((t) => [t, s(t) ? _t(S[t], e[t].cameras.length, Math.trunc(Number(e[t].lines ?? 1)), t === "left" || t === "right", i, C(t), e[t].fit ?? "cover") : []])), T = [
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
function xt(e, t, n, r) {
	let i = (r) => Y({
		...e,
		width: n,
		height: r
	}, t)[1], a = bt(e, t) !== null, [o, s] = [1, Math.max(64, Math.ceil(n * 4))], c = i(s)[2], l = (e) => {
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
async function St(e, t, n, r) {
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
var Ct = 1e4, wt = () => location.pathname.split("/")[1] ?? "", Tt = 15, Et = new URL(import.meta.url).searchParams.get("v") || "dev", Dt = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", Ot = 4096e3, kt = 64, At = 400;
function jt(e, t, n) {
	let r = Math.min(1, Math.sqrt(Ot / (e * n * t * n))), [i, a] = [8 * q(e * n * r / 8), 8 * q(t * n * r / 8)];
	return Math.min(i, a) >= kt ? [
		i,
		a,
		Math.round(n * r * 100) / 100 || 1
	] : null;
}
var X = null;
function Mt(e, t = !1) {
	if (t || !X || Date.now() > X.until) {
		let t = e.callWS({ type: "casa_mia/picture_token" }).then((e) => e.token);
		X = {
			value: t,
			until: Date.now() + 432e5
		}, t.catch(() => X = null);
	}
	return X.value;
}
function Nt(e) {
	return Object.entries(e.states).filter(([e, t]) => e.startsWith("select.") && (t.attributes.card || t.attributes.draft_card)).map(([e, t]) => ({
		value: e,
		label: String(t.attributes.friendly_name ?? e)
	}));
}
var Pt = class extends B {
	constructor(...e) {
		super(...e), this.preview = !1, this._natural = "", this._token = "", this.retry = 0, this.liveOn = "", this.liveWait = 0, this._playing = !1, this._liveFailed = "", this._shown = 0, this.shows = 0, this._framed = "", this.frameWait = 0, this._size = null, this._box = [0, 0], this._fit = null, this.settle = 0, this.resize = new ResizeObserver(([e]) => {
			let { width: t, height: n } = e.contentRect;
			this._box = [Math.round(t * 10) / 10, Math.round(n * 10) / 10], this.measure(), this.debugOn() && this.requestUpdate();
			let r = jt(t, n, Qe(window.devicePixelRatio || 1, this.viaHa(), this._config?.away_sharpness));
			clearTimeout(this.settle), String(r) !== String(this._size) && (this._size ? this.settle = window.setTimeout(() => this._size = r, At) : this._size = r);
		}), this._width = 0, this.measure = () => {
			let e = qe(this, this.layout === "grid" && typeof this._config?.grid_options?.rows == "number");
			JSON.stringify(e) !== JSON.stringify(this._fit) && (this._fit = e), this.clientWidth !== this._width && (this._width = this.clientWidth);
		}, this.widthWatch = new ResizeObserver(() => this.measure()), this.visibility = () => {
			let e = document.hidden ? "page hidden" : this.isConnected ? wt() === this.home ? this.inView ? "" : "out of view" : "left the dashboard" : "off the page";
			if (e) {
				let t = document.hidden ? 0 : this._config?.leave_after ?? Tt;
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
		super.connectedCallback(), document.addEventListener("visibilitychange", this.visibility), window.addEventListener("location-changed", this.visibility), window.addEventListener("popstate", this.visibility), this.home = wt();
		let e = this.renderRoot?.querySelector(".box");
		e && this.onScreen.observe(e), this.unwatch = Ye(this.measure), this.widthWatch.observe(this), requestAnimationFrame(this.measure);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), document.removeEventListener("visibilitychange", this.visibility), window.removeEventListener("location-changed", this.visibility), window.removeEventListener("popstate", this.visibility), this.onScreen.disconnect(), this.inView = !1, this.visibility(), this.unwatch?.(), this.widthWatch.disconnect(), this.resize.disconnect(), clearTimeout(this.settle), clearTimeout(this.retry), clearTimeout(this.frameWait), this.stopLive();
	}
	cut(e) {
		clearTimeout(this.leaving), this.leaving = 0, this._shown && (this._shown = 0, this.done(e), this.renderRoot?.querySelector(".picture")?.setAttribute("src", Dt));
	}
	done(e) {
		let t = this.streaming;
		this.streaming = "", t.includes(".mjpg?") && navigator.sendBeacon(`${t.replace(".mjpg?", "/done?")}&why=${encodeURIComponent(e)}`);
	}
	editing() {
		return this.preview || We(this);
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
		return e?.security_look ? et(e.look_tint ?? G.tint, e.look_strength ?? G.strength, e.look_darkness ?? G.darkness) : "";
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
		return { entity: Nt(e)[0]?.value ?? "" };
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
		return e === "ha" || e === "auto" && !Xe(location);
	}
	pictureUrl(e, [t, n, r]) {
		let i = `w=${t}&h=${n}&dpr=${r}&sid=${this.sid}&v=${encodeURIComponent(Et)}`;
		if (!this.viaHa()) return `${e.picture}?${i}`;
		if (!this._token) return this.ask(), "";
		let a = new URL(e.picture).pathname;
		return `/api/casa_mia/${this._config?.draft ? "draft" : "live"}${a}?${i}&token=${this._token}`;
	}
	ask(e = !1) {
		this.hass && Mt(this.hass, e).then((e) => this._token = e, () => this.retry = window.setTimeout(() => this.ask(!0), 1e4));
	}
	refused() {
		this.viaHa() && (clearTimeout(this.retry), this.retry = window.setTimeout(() => this.ask(!0), 5e3));
	}
	now() {
		let e = this._config?.entity ? this.hass?.states[this._config.entity] : void 0, t = e?.attributes[this._config?.draft ? "draft_card" : "card"];
		return {
			card: t,
			main: t ? this.main(t, e.state) : ""
		};
	}
	liveMain(e, t) {
		return !!(e.live_main && this._config?.live_main !== !1 && this._liveFailed !== t && this.hass?.connection);
	}
	liveEntity(e, t, n) {
		let r = e.layout.main_fit ?? "fit";
		return $e(e.cameras[t]?.channels ?? [[
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
			this.liveOn === r && (console.info(`casa-mia: live main camera ${r}: ${e}; the drawn picture instead`), this.stopLive(), this._liveFailed = t);
		};
		this.liveWait = window.setTimeout(() => i("not playing in time"), Ct), n.onplaying = () => {
			clearTimeout(this.liveWait), this._playing = !0;
		}, St(this.hass.connection, r, n, i).then((e) => this.liveOn === r ? this.liveStop = e : e(), (e) => i(String(e)));
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
		if (!t) return P`<ha-card
        ><div class="note">
          ${this._config?.entity ? e ? `${this._config.draft ? "No saved draft" : "Not deployed live yet"} for this commander` : `No commander at ${this._config.entity}` : "Choose a commander"}
        </div></ha-card
      >`;
		if (!t.picture) return P`<ha-card><div class="note">Its picture's address is not known yet (the app has no LAN address).</div></ha-card>`;
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
		} : a, [[m, h], g, _] = Y(p, n), v = ([e, t, n, r]) => `left:${e / m * 100}%;top:${t / h * 100}%;width:${n / m * 100}%;height:${r / h * 100}%`, y = p.highlight ?? {}, b = K.flatMap((e) => p[e].cameras.map((t, n) => [t, _[e][n]])).find(([e]) => e === n)?.[1], x = this._fit, S = this._width ? this._width / xt(a, n, this._width, this.shapeOf(t, n)) : a.width / a.height, C = x && this._width ? Je(x, this._width, S) : null;
		return P`<ha-card style=${!x || x.mode === "tile" || x.mode === "cell" ? `height:100%;aspect-ratio:${a.width}/${a.height}` : C ? `height:${C}px` : ""}>
      <div class="box">
        <div class="seen" style="filter:${this.look()}">
        ${r ? f ? P`<img class="still" src=${f} alt="" />` : I : d && this._shown ? pt(this._shown, P`<img
                class="picture"
                data-cm-own
                src=${this.streaming = d}
                alt=""
                @load=${(e) => {
			let t = e.target;
			this._natural = `${t.naturalWidth} x ${t.naturalHeight}`;
		}}
                @error=${() => this.refused()}
              />`) : I}
        ${i && g[2] > 0 ? P`<video
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
              <div class="caption" style=${v(g)}><span>${t.cameras[n]?.title ?? n}</span></div>` : I}
        </div>
        ${r ? P`<div class="hatch"><span>Still picture while editing</span></div>` : I}
        ${a.debug?.on ? P`<div class="debug" style="color:${a.debug.colour ?? "#ffd60a"}">
              ${this._fit?.mode ?? "?"} (in ${this._fit?.container || "?"}), room ${this._fit?.room ?? "?"} px<br />
              card box ${this._box[0]} x ${this._box[1]} CSS px, screen ${window.devicePixelRatio}x<br />
              asked ${this._size ? `${s} x ${c} @${l}x` : "nothing yet"}; picture ${this._natural || "not loaded"}
              ${this.viaHa() ? "through Home Assistant" : "direct"}
            </div>` : I}
        ${K.flatMap((e) => p[e].cameras.map((r, i) => _[e][i][2] > 0 && r !== n ? P`<div class="zone" style=${v(_[e][i])} title=${t.cameras[r]?.title ?? r} @click=${() => this.choose(t, r)}></div>` : I))}
        <div class="zone" style=${v(g)} @click=${() => this.open(t, n)}></div>
        ${b && b[2] > 0 && this._framed === (r ? "still" : `s${this._shown}`) ? P`<img
              class="highlight ${Number(y.pulse) > 0 ? y.style ?? "breathe" : ""}"
              src=${Dt}
              alt=""
              style="${v(b)};border:${y.width}px solid ${y.colour};box-shadow:0 0 ${y.blur}px ${y.colour};--cm-colour:${y.colour};--cm-blur:${y.blur}px;--cm-pulse:${y.pulse}s;--cm-style:${y.style}"
            />` : I}
      </div>
    </ha-card>`;
	}
	choose(e, t) {
		this.hass?.callService("select", "select_option", { option: e.cameras[t]?.title }, { entity_id: this._config.entity });
	}
	open(e, t) {
		let n = this._config?.tap_main ?? "live";
		n === "live" && e.cameras[t] ? Oe(e.cameras[t].live) : n === "more-info" && H(this, "hass-more-info", { entityId: t });
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
}, Ft = class extends B {
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
					options: Nt(this.hass)
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
		return P`<ha-form
      .hass=${this.hass}
      .data=${{
			tap_main: "live",
			route: "auto",
			away_sharpness: "balanced",
			live_main: !0,
			leave_after: Tt,
			security_look: !1,
			look_tint: G.tint,
			look_strength: G.strength,
			look_darkness: G.darkness,
			...this._config
		}}
      .schema=${e}
      .computeLabel=${(e) => t[e.name]}
      .computeHelper=${(e) => e.name === "entity" ? "The commanders built on the Camera Dashboard page (each one's Main camera select)." : e.name === "security_look" ? "The pictures in monochrome, tinted, like a security control room: the picture, the main camera's live video and its caption (not the highlight)." : e.name === "route" ? "At home: this page reached Home Assistant over http at a home address (a private IP, a .local name). Through Home Assistant works anywhere you can sign in, at a little cost to Home Assistant." : e.name === "away_sharpness" ? "How sharp the picture is when it comes through Home Assistant (away from home): a 2x screen at Full is four times the bytes of Light. Direct at home it is always the screen's own." : e.name === "live_main" ? "The main camera plays as live video over the picture, through Home Assistant's WebRTC (this device decodes it; the box does not). Needs the Camera compositor's Live main camera switch on; a video that does not start gives way to the drawn picture." : e.name === "leave_after" ? "Seconds the picture goes on once the card is out of sight (another page in Home Assistant, scrolled away), so coming back (the back button) finds it running; then it stops, and the box sends nothing more. 0: at once. Closing the app always stops it at once." : e.name === "draft" ? "As saved on the Camera Dashboard page (Save draft), before it is deployed live: for trying changes out. Off: as deployed live." : void 0}
      @value-changed=${(e) => {
			e.stopPropagation(), this._config = e.detail.value, H(this, "config-changed", { config: this._config });
		}}
    ></ha-form>`;
	}
};
U("casa-mia-commander", Pt), U("casa-mia-commander-editor", Ft), Me("casa-mia-commander", "Casa Mia Camera Commander", "One of the Camera Dashboard's commanders: tap a camera to make it the main one.");
//#endregion
//#region src/tablet.ts
var Z = ["main", ...K], It = (e, t) => (t === "top" || t === "bottom") && e[t]?.size === "auto";
function Lt(e, t, n, r, i = () => 0) {
	let a = {
		width: t,
		height: n,
		aspects: {}
	};
	for (let [t, n] of Object.entries(V.main)) a[t] = e[t] ?? n.default;
	for (let t of K) {
		let o = e[t] ?? {}, s = It(e, t) ? n > 0 ? i(t) / n * 100 : 0 : o.size;
		a[t] = {
			...V.panels[t],
			...o,
			...s !== void 0 && { size: s },
			fit: "cover",
			lines: 1,
			cameras: !o.hidden && r(t) ? [t] : []
		};
	}
	return a;
}
function Rt(e, [t, n], r, i, a = {}) {
	let o = r ? 0 : Math.max(0, Math.min(Math.trunc(Number(e.margin ?? 0)), Math.floor((Math.min(t, n) - 1) / 2))), [s, c] = [t - 2 * o, n - 2 * o], l = (e) => i.includes(e), u = {
		...Lt(e, s, c, l, (e) => a[e] ?? 0),
		margin: 0
	}, [, d, f] = Y(u, l("main") ? "main" : null), p = (e) => f[e][0] ?? [
		0,
		0,
		0,
		0
	], [m, h, g, _] = [
		p("left")[2],
		p("top")[3],
		p("right")[2],
		p("bottom")[3]
	], v = u.gap, y = [
		0,
		m,
		m && m + v,
		s - (g && g + v),
		s - g,
		s
	], b = [
		0,
		h,
		h && h + v,
		c - (_ && _ + v),
		c - _,
		c
	], x = (e, t) => e.slice(1).map((n, r) => t(n - e[r])).join(" "), S = (e, t) => !!u[e][`anchor_${t}`], C = (e, t) => f[e].length > 0 && S(e, t), w = (e) => `${S(e, "left") ? 1 : 3} / ${S(e, "right") ? 6 : 4}`, T = (e) => `${C("top", e) ? 3 : 1} / ${C("bottom", e) ? 4 : 6}`, E = {
		top: {
			column: w("top"),
			row: "1 / 2"
		},
		bottom: {
			column: w("bottom"),
			row: "5 / 6"
		},
		left: {
			column: "1 / 2",
			row: T("left")
		},
		right: {
			column: "5 / 6",
			row: T("right")
		}
	}, D = {};
	for (let e of Z) {
		let t = e === "main" ? l("main") ? d : void 0 : f[e]?.[0];
		t ? e === "main" ? D.main = {
			column: "3 / 4",
			row: "3 / 4",
			...(t[2] < y[3] - y[2] || t[3] < b[3] - b[2]) && {
				width: t[2],
				centred: !0,
				...!r && { height: t[3] }
			}
		} : D[e] = E[e] : D[e] = null;
	}
	return {
		inset: o,
		columns: x(y, (e) => r ? `minmax(0, ${e}fr)` : `${e}px`),
		rows: x(b, (e) => r ? `minmax(${e}px, auto)` : `${e}px`),
		places: D
	};
}
var zt = /* @__PURE__ */ new Map();
function Bt(e, t) {
	let n = `${e}/${t}`, r = zt.get(n);
	return r || zt.set(n, r = { naturals: {} }), r;
}
//#endregion
//#region src/view-settings.ts
var Vt = {
	main: "Main",
	left: "Left",
	top: "Top",
	right: "Right",
	bottom: "Bottom"
}, Q = "auto", Ht = /* @__PURE__ */ new Set(["fit", "lines"]), Ut = (e) => ({
	...V.panels[e],
	unit: "%",
	hide_empty: !0
});
function Wt(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) if (K.includes(n)) {
		let e = Ut(n), i = Object.fromEntries(Object.entries(r ?? {}).filter(([t, n]) => !Ht.has(t) && n !== e[t]));
		Object.keys(i).length && (t[n] = i);
	} else r !== V.main[n]?.default && (t[n] = r);
	return t;
}
U("casa-mia-view-settings", class extends B {
	constructor(...e) {
		super(...e), this.layout = {}, this.sel = "main", this.busy = !1, this.original = {}, this.key = (e) => e.key === "Escape" && this.cancel();
	}
	static {
		this.properties = {
			layout: { state: !0 },
			sel: { state: !0 },
			busy: { state: !0 }
		};
	}
	open(e) {
		this.settings = e, this.original = e.layout, this.layout = e.layout, document.body.append(this), Ae().then(() => this.requestUpdate());
	}
	connectedCallback() {
		super.connectedCallback(), window.addEventListener("keydown", this.key);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), window.removeEventListener("keydown", this.key);
	}
	change(e) {
		this.layout = e, this.settings.apply(e);
	}
	cancel() {
		this.settings.apply(this.original), this.remove();
	}
	async save() {
		this.busy = !0;
		try {
			await this.settings.save(Wt(this.layout)), this.remove();
		} finally {
			this.busy = !1;
		}
	}
	form(e, t, n) {
		return P`<ha-form
      .hass=${this.settings.hass}
      .data=${t}
      .schema=${e}
      .computeLabel=${(e) => e.name === Q ? "As tall as its cards" : ze(e)}
      .computeHelper=${(e) => e.name === Q ? "The panel is exactly as tall as what it holds, as cards show and hide." : Be(e)}
      @value-changed=${(e) => {
			e.stopPropagation(), n(e.detail.value);
		}}
    ></ha-form>`;
	}
	options() {
		if (!customElements.get("ha-form")) return P`<p class="help">Loading…</p>`;
		let e = this.layout;
		if (this.sel === "main") {
			let t = Object.fromEntries(Object.entries(V.main).map(([t, n]) => [t, e[t] ?? n.default])), n = Ie(String(t.main_fit)).map((e) => e.name === "main_fit" ? {
				...e,
				selector: { select: {
					...e.selector.select,
					options: e.selector.select.options.filter((e) => e.value !== "own")
				} }
			} : e);
			return P`<p class="help">The middle: what is left between the panels, and how the panels share the screen.</p>
        ${this.form(n, t, (t) => this.change({
				...e,
				...t
			}))}`;
		}
		let t = this.sel, n = e[t] ?? {}, r = t === "top" || t === "bottom", i = r && n.size === Q, a = {
			...Ut(t),
			...n,
			...r && { [Q]: i }
		};
		i && (a.size = V.panels[t].size);
		let o = a.unit === "px", s = [...r ? [{
			name: Q,
			selector: { boolean: {} }
		}] : [], ...Le(t).filter((e) => !Ht.has(e.name) && (!i || e.name !== "size" && e.name !== "unit")).map((e) => e.name === "size" && o ? {
			...e,
			selector: { number: {
				...e.selector.number,
				max: 2e3
			} }
		} : e)];
		return P`<p class="help">Its cards are the view's ${Vt[t].toLowerCase()} section: add and edit them on the view.</p>
      ${this.form(s, a, (n) => {
			let { [Q]: i, ...o } = n, s = i ? Q : o.size === Q ? V.panels[t].size : o.size;
			if (!i && o.unit !== a.unit) {
				let { width: t, height: n } = this.settings.preview(e), i = r ? n : t;
				i > 0 && (s = Math.round(o.unit === "px" ? i * s / 100 : Math.min(100, s * 100 / i)));
			}
			this.change({
				...e,
				[t]: {
					...o,
					size: s
				}
			});
		})}`;
	}
	map() {
		let { width: e, height: t, rects: n } = this.settings.preview(this.layout), r = (e, t) => `${e / t * 100}%`, i = (i) => {
			let a = n[i];
			return !a || a[2] <= 0 || a[3] <= 0 ? I : P`<button
        class="area ${i} ${this.sel === i ? "on" : ""}"
        style="left:${r(a[0], e)};top:${r(a[1], t)};width:${r(a[2], e)};height:${r(a[3], t)}"
        @click=${() => this.sel = i}
      >
        <span>${Vt[i]}</span><small>${Math.round(a[2])} × ${Math.round(a[3])}</small>
      </button>`;
		}, a = K.filter((e) => !n[e]);
		return P`<div class="map" style="aspect-ratio:${e} / ${t}">${["main", ...K].map(i)}</div>
      <div class="chips">
        ${["main", ...K].map((e) => P`<button class="chip ${this.sel === e ? "on" : ""} ${a.includes(e) ? "off" : ""}" @click=${() => this.sel = e}>
            ${Vt[e]}${a.includes(e) ? " (hidden)" : ""}
          </button>`)}
      </div>`;
	}
	render() {
		return this.settings ? P`<div class="backdrop" @click=${this.cancel}></div>
      <div class="dialog" role="dialog" aria-label="Tablet Layout">
        <header>
          <h2>Tablet Layout</h2>
          <p class="help">How this view's panels share the screen. Pick a panel, or the middle for the whole layout.</p>
        </header>
        <div class="body">${this.map()}${this.options()}</div>
        <footer>
          <button class="text" @click=${this.cancel}>Cancel</button>
          <button class="primary" ?disabled=${this.busy} @click=${this.save}>Save</button>
        </footer>
      </div>` : I;
	}
	static {
		this.styles = o`
    :host {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
      color: var(--primary-text-color);
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
    }
    .dialog {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(720px, calc(100vw - 32px));
      max-height: calc(100dvh - 32px);
      background: var(--card-background-color, #fff);
      border-radius: var(--ha-dialog-border-radius, 24px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    header {
      padding: 20px 24px 0;
    }
    h2 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 400;
    }
    .help {
      margin: 0 0 12px;
      color: var(--secondary-text-color);
      font-size: 14px;
    }
    .body {
      padding: 8px 24px;
      overflow: auto;
    }
    .map {
      position: relative;
      width: 100%;
      max-height: 40dvh;
      margin: 0 auto 12px;
      background: var(--primary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      overflow: hidden;
    }
    .area {
      position: absolute;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 0;
      font: inherit;
      color: var(--primary-text-color);
      background: color-mix(in srgb, var(--primary-color) 14%, var(--card-background-color));
      border: 1px solid color-mix(in srgb, var(--primary-color) 40%, transparent);
      border-radius: 4px;
      cursor: pointer;
      overflow: hidden;
    }
    .area.main {
      background: color-mix(in srgb, var(--primary-color) 6%, var(--card-background-color));
    }
    .area.on {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color);
    }
    .area span {
      font-size: 14px;
      font-weight: 500;
    }
    .area small {
      font-size: 11px;
      opacity: 0.75;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }
    .chip {
      font: inherit;
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 16px;
      border: 1px solid var(--divider-color);
      background: none;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .chip.on {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .chip.off:not(.on) {
      color: var(--secondary-text-color);
      border-style: dashed;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 24px 20px;
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
});
function Gt(e) {
	document.createElement("casa-mia-view-settings").open(e);
}
//#endregion
//#region src/view.ts
var Kt = [
	"Main",
	"Left",
	"Top",
	"Right",
	"Bottom"
], qt = "M3,3H11V11H3V3M13,3H21V11H13V3M3,13H11V21H3V13M18,13H16V16H13V18H16V21H18V18H21V16H18V13Z", Jt = o`
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
  }
  /* Edit mode: the panels grow to what they hold and the view scrolls, editors and all. */
  :host([editing]) {
    overflow: auto;
  }
  :host([editing]) .wrapper {
    height: auto;
    min-height: 100%;
    padding: 0 var(--column-gap); /* HA's spacing back, for its editors */
  }
  :host([editing]) .container {
    flex: none;
    padding: var(--row-gap) 0;
  }
  :host([editing]) .content {
    position: relative;
    /* half each side of the engine's own gap track, so HA's spacing between two panels */
    gap: calc(var(--row-gap) / 2) calc(var(--column-gap) / 2);
  }
  :host([editing]) .section {
    overflow: visible;
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
  /* The footer under the panels, not over them: HA's sticks it a row gap above the bottom. */
  :host(:not([editing])) hui-view-footer {
    position: static;
  }
  /* Edit mode: the Tablet Layout button over the panels, and each panel's name. */
  .cm-bar {
    display: flex;
    justify-content: center;
    padding: 12px 0 0;
  }
  .cm-bar button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 20px;
    border-radius: 20px;
    border: 1px solid var(--primary-color);
    background: none;
    color: var(--primary-color);
    cursor: pointer;
  }
  .cm-bar svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
  :host([editing]) .section {
    position: relative;
  }
  .cm-name {
    position: absolute;
    top: 8px;
    left: 12px;
    z-index: 2;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-primary-color, #fff);
    background: var(--primary-color);
    pointer-events: none;
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
`, Yt = new CSSStyleSheet();
Yt.replaceSync("\n  :host([cm-fill]) ha-sortable { display: contents; }\n  :host([cm-fill]) .container { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; margin: 0; }\n  :host([cm-fill]) .card { flex: none; }\n  :host([cm-fill]) .card:has(> [cm-fill]) { flex: 1 1 0; min-height: 0; }\n  [cm-fill], [cm-fill] > * { display: block; height: 100%; }\n");
function Xt(e, t) {
	let n = [];
	for (let r = e; r; r = r.parentElement ?? (r.getRootNode().host || null)) {
		let e = r.getBoundingClientRect?.().height ?? 0;
		e > t + 1 && n.push(`${r.tagName.toLowerCase()} ${Math.round(e)}`);
	}
	return n.length ? `\ntoo tall: ${n.join("\n")}` : "";
}
function Zt(e, t) {
	let n, r = !1;
	return e.connection.subscribeMessage((e) => t(e?.tablet_view ?? {}), { type: "casa_mia/settings/subscribe" }).then((e) => r ? e() : n = e).catch(() => t({})), () => {
		r = !0, n?.();
	};
}
var Qt = (e) => Math.max(0, Number(e.header_space ?? V.main.header_space.default) || 0);
function $t(e) {
	return (e?.querySelector("hui-grid-section"))?.shadowRoot?.querySelector(".container")?.offsetHeight ?? 0;
}
je().then((e) => {
	class t extends e {
		constructor(...e) {
			super(...e), this.cmDebug = !1, this.cmApp = {}, this.cmLayout = {}, this.cmFrame = 0, this.cmAdding = !1, this.cmSeen = new ResizeObserver(() => this.cmLater()), this.cmLater = () => {
				cancelAnimationFrame(this.cmFrame), this.cmFrame = requestAnimationFrame(() => this.cmPlace());
			};
		}
		static {
			this.styles = [e.styles, Jt];
		}
		get cmSeenOut() {
			return Bt(location.pathname.split("/")[1], this.index);
		}
		setConfig(e) {
			super.setConfig(e), this.cmDebug = !!e.debug, this.cmMarks(), this.cmLayout = e.layout ?? {};
		}
		connectedCallback() {
			super.connectedCallback(), this.cmHolder = this.parentElement?.parentElement, this.cmHolder?.style.setProperty("min-height", "100dvh"), document.documentElement.style.setProperty("height", "100dvh"), this.cmSeen.observe(this), this.cmStop = Ye(() => this.cmLater()), this.addEventListener("section-visibility-changed", this.cmLater), this.addEventListener("card-visibility-changed", this.cmLater);
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
			n && (n.disabled = !0), t && this.cmComplete(), !this.cmUnwatch && this.hass && (this.cmUnwatch = Zt(this.hass, (e) => {
				this.cmApp = e, this.cmMarks(), this.cmLater();
			})), this.cmLater();
		}
		cmComplete() {
			let e = this.lovelace.config.views[this.index].sections?.length ?? 0;
			if (this.isStrategy || this.cmAdding || e >= Z.length) return;
			this.cmAdding = !0;
			let t = Z.slice(e).map(() => ({
				type: "grid",
				cards: []
			}));
			this.cmSaveView((e) => ({
				...e,
				sections: [...e.sections ?? [], ...t]
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
			!n && t && (n = document.createElement("div"), n.className = "cm-bar", n.innerHTML = `<button type="button"><svg viewBox="0 0 24 24"><path d="${qt}"/></svg>Tablet Layout</button>`, n.querySelector("button").addEventListener("click", () => this.cmSettings()), t.prepend(n));
		}
		cmSettings() {
			Gt({
				hass: this.hass,
				layout: this.cmLayout,
				preview: (e) => this.cmPreview(e),
				apply: (e) => {
					this.cmLayout = e, this.cmLater();
				},
				save: (e) => this.cmSaveView((t) => {
					let { layout: n, ...r } = t;
					return Object.keys(e).length ? {
						...r,
						layout: e
					} : r;
				})
			});
		}
		cmPreview(e) {
			let [t, n] = this.cmSeenOut.shown ?? this.cmArea(), r = this.cmSeenOut.top === void 0 ? n : n + this.cmSeenOut.top - Qt(e), [, i, a] = Y(Lt(Wt(e), t, r, (t) => t === "main" || !e[t]?.hidden, (e) => this.cmNatural(e)), "main");
			return {
				width: t,
				height: r,
				rects: {
					main: i,
					...Object.fromEntries(K.flatMap((e) => a[e][0] ? [[e, a[e][0]]] : []))
				}
			};
		}
		cmArea() {
			let e = this.shadowRoot, t = [...e.querySelectorAll("hui-view-header, hui-view-footer")];
			t.forEach((e) => this.cmSeen.observe(e));
			let n = e.querySelector(".container");
			if (!this.lovelace?.editMode && n) return [this.clientWidth, n.clientHeight];
			let r = n ? parseFloat(getComputedStyle(n).paddingTop) + parseFloat(getComputedStyle(n).paddingBottom) : 0, i = e.querySelector(".cm-bar")?.offsetHeight ?? 0;
			return [this.clientWidth, this.clientHeight - i - r - t.reduce((e, t) => e + t.offsetHeight, 0)];
		}
		cmNatural(e) {
			if (this.lovelace?.editMode && e in this.cmSeenOut.naturals) return this.cmSeenOut.naturals[e];
			let t = this.sections[Z.indexOf(e)], n = t?.querySelector("hui-grid-section")?.shadowRoot?.querySelector(".container");
			n && this.cmSeen.observe(n);
			let r = $t(t);
			return this.lovelace?.editMode || (this.cmSeenOut.naturals[e] = r), r;
		}
		cmPlace() {
			let e = this.shadowRoot, t = e?.querySelector(".content");
			if (!t) return;
			let n = !!this.lovelace?.editMode;
			this.cmBar(n);
			let r = e.querySelector("hui-view-header"), i = this.cmLayout.header_space === void 0 ? void 0 : Qt(this.cmLayout);
			r?.style.setProperty("padding-top", i === void 0 ? "" : `${i}px`);
			let [a, o] = n && this.cmSeenOut.shown ? this.cmSeenOut.shown : this.cmArea();
			n || (this.cmSeenOut.shown = [a, o], this.cmSeenOut.top = r && !r.hidden ? Qt(this.cmLayout) : void 0);
			let s = (e) => {
				let t = this.sections[Z.indexOf(e)];
				return !t || t.hidden ? !1 : n || this.cmLayout[e]?.hide_empty === !1 ? !0 : c(t).length > 0;
			}, c = (e) => (e._cards ?? []).filter((e) => tt(e.config ?? { type: "" }) && !e.hidden), l = Z.filter(s), u = Object.fromEntries(K.filter((e) => It(this.cmLayout, e)).map((e) => [e, this.cmNatural(e)])), d = Rt(this.cmLayout, [a, o], n, l, u);
			t.style.inset = n ? "" : `${d.inset}px`, t.style.gridTemplateColumns = d.columns, t.style.gridTemplateRows = d.rows, [...e.querySelectorAll(".content > .section")].forEach((e, t) => {
				let r = Z[t], i = r ? d.places[r] : null;
				e.classList.toggle("cm-off", !i);
				let a = e.querySelector(":scope > .cm-name");
				n ? !a && Kt[t] && (a = document.createElement("div"), a.className = "cm-name", a.textContent = Kt[t], e.append(a)) : a?.remove(), this.cmFill(this.sections[t], n || It(this.cmLayout, r) ? [] : c(this.sections[t])), i && Object.assign(e.style, {
					gridColumn: i.column,
					gridRow: i.row,
					width: i.width === void 0 ? "" : `${i.width}px`,
					height: i.height === void 0 ? "" : `${i.height}px`,
					justifySelf: i.centred ? "center" : "",
					alignSelf: i.centred ? "center" : ""
				});
			}), this.cmShow();
		}
		cmFill(e, t) {
			let n = e?.querySelector("hui-grid-section");
			if (!n?.shadowRoot) return;
			let r = n.shadowRoot.adoptedStyleSheets;
			r.includes(Yt) || (n.shadowRoot.adoptedStyleSheets = [...r, Yt]);
			let i = t.length === 1 ? t[0] : null;
			n.toggleAttribute("cm-fill", !!i);
			for (let t of e._cards ?? []) t.toggleAttribute("cm-fill", t === i);
		}
		cmShow() {
			if (!this.cmDebug && !this.cmApp.show_size) return this.cmLabel?.remove();
			this.cmLabel?.isConnected || (this.cmLabel = document.createElement("div"), this.cmLabel.className = "cm-debug", this.shadowRoot?.prepend(this.cmLabel));
			let e = this.getBoundingClientRect(), t = document.documentElement;
			this.cmLabel.textContent = `view ${Math.round(e.width)} x ${Math.round(e.height)}, room ${Ge(this)}\npage scrolls ${t.scrollWidth - t.clientWidth} x ${t.scrollHeight - t.clientHeight}` + Xt(this, t.clientHeight);
		}
	}
	U("casa-mia-tablet-layout", t), U("casa-mia-tablet-view", class extends t {});
});
var en = new CSSStyleSheet();
en.replaceSync(".handle, ha-dropdown-item[value=\"duplicate\"], ha-dropdown-item[value=\"delete\"], wa-divider { display: none; }"), customElements.whenDefined("hui-section-edit-mode").then(() => {
	let e = customElements.get("hui-section-edit-mode").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		for (let e = this; e; e = e.parentElement ?? (e.getRootNode().host || null)) if ($.some((t) => e.tagName === t.slice(7).toUpperCase())) {
			let e = this.shadowRoot;
			e && !e.adoptedStyleSheets.includes(en) && (e.adoptedStyleSheets = [...e.adoptedStyleSheets, en]);
			return;
		}
	};
});
var tn = "custom:casa-mia-tablet-layout", $ = [tn, "custom:casa-mia-tablet-view"];
//#endregion
//#region src/main.ts
customElements.whenDefined("hui-view-editor").then(() => {
	let e = customElements.get("hui-view-editor").prototype, t = e.firstUpdated;
	e.firstUpdated = function(...e) {
		t?.apply(this, e);
		let n = this._schema;
		typeof n == "function" && (this._schema = (...e) => n(...e).map((e) => {
			if (e.name === "section_specifics" && $.includes(this._config?.type)) return {
				...e,
				visible: void 0,
				schema: e.schema.filter((e) => e.name !== "dense_section_placement")
			};
			let t = e.name === "type" ? e.selector?.select?.options : void 0;
			return !t || t.some((e) => e.value === tn) ? e : {
				...e,
				selector: { select: {
					...e.selector.select,
					options: [...t, {
						value: tn,
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
			n.set.call(this, $.includes(e?.type) && e.max_columns === void 0 ? {
				...e,
				max_columns: 4
			} : e);
		}
	});
	let r = e._valueChanged;
	e._valueChanged = function(e) {
		let t = e.detail?.value;
		if (!$.includes(t?.type)) return r.call(this, e);
		let n = new Proxy(t, { deleteProperty: (e, t) => t === "max_columns" || t === "top_margin" || Reflect.deleteProperty(e, t) });
		return r.call(this, new CustomEvent(e.type, { detail: { value: n } }));
	};
}), customElements.whenDefined("hui-dialog-edit-view").then(() => {
	let e = customElements.get("hui-dialog-edit-view").prototype, t = Object.getOwnPropertyDescriptor(e, "_type");
	t?.get && Object.defineProperty(e, "_type", {
		...t,
		get() {
			return $.includes(this._config?.type) ? "sections" : t.get.call(this);
		}
	});
}), console.info(`%cCASA-MIA CARDS\n%ccommander, section, tablet layout (${Et})`, "color: green; font-weight: bold;", "");
//#endregion
