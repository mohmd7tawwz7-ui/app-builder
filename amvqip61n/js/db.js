/* =====================================================
   🗄️ قاعدة البيانات — تحفظ الإعدادات والمنتجات
   -----------------------------------------------------
   وضعان:
   • local    → يحفظ في المتصفح (للتجربة، لا يراه الزوار)
   • firebase → يحفظ في السحابة (يراه كل الزوار)
   يختار الوضع تلقائياً حسب js/firebase-config.js
   ===================================================== */

// قائمة المنتجات المستخدمة في كل الملفات
const PRODUCTS = [];

// نسخة ثابتة من الإعدادات الافتراضية
const DEFAULT_SETTINGS = JSON.parse(JSON.stringify(CONFIG));

const DB = {
  mode: "local",
  fs: null,
  auth: null,
  KEY: "atqen_data",
  SESSION: "atqen_owner",

  isFirebaseReady() {
    return typeof FIREBASE_CONFIG !== "undefined" &&
      FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId;
  },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  },

  /* ---------- التشغيل ---------- */
  async init() {
    if (!this.isFirebaseReady()) return;
    try {
      const base = "https://www.gstatic.com/firebasejs/10.12.2/";
      await this.loadScript(base + "firebase-app-compat.js");
      await Promise.all([
        this.loadScript(base + "firebase-firestore-compat.js"),
        this.loadScript(base + "firebase-auth-compat.js")
      ]);
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      this.fs = firebase.firestore();
      this.auth = firebase.auth();
      this.mode = "firebase";
    } catch (e) {
      console.warn("تعذر الاتصال بـ Firebase، سيتم استخدام الوضع المحلي", e);
      this.mode = "local";
    }
  },

  mergeSettings(saved = {}) {
    saved = { ...saved };
    // كلمة المرور القديمة (1234) تُستبدل بالجديدة تلقائياً
    if (String(saved.ownerPin) === "1234") delete saved.ownerPin;

    const s = Object.assign(Utils.clone(DEFAULT_SETTINGS), saved);
    s.theme = Object.assign({}, DEFAULT_SETTINGS.theme, saved.theme || {});
    s.socials = Object.assign({}, DEFAULT_SETTINGS.socials, saved.socials || {});
    if (!Array.isArray(s.coupons)) s.coupons = [];
    if (!Array.isArray(s.categories)) s.categories = [];
    if (!Array.isArray(s.faq)) s.faq = [];
    return s;
  },

  sortProducts(products = []) {
    return products
      .map((p, i) => ({ ...p, order: p.order ?? i }))
      .sort((a, b) => a.order - b.order);
  },

  /* ---------- قراءة كل البيانات ---------- */
  async load() {
    if (this.mode === "firebase") {
      const [settingsDoc, productsSnap] = await Promise.all([
        this.fs.collection("store").doc("settings").get(),
        this.fs.collection("products").get()
      ]);
      const products = productsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      return {
        settings: this.mergeSettings(settingsDoc.exists ? settingsDoc.data() : {}),
        products: this.sortProducts(products)
      };
    }

    const saved = this._readLocal();
    return {
      settings: this.mergeSettings(saved.settings),
      products: this.sortProducts(saved.products || [])
    };
  },

  _readLocal() {
    return Utils.load(this.KEY, { settings: {}, products: [] });
  },

  _writeLocal(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      throw new Error("مساحة التخزين ممتلئة — جرّب صوراً أصغر");
    }
  },

  /* ---------- الإعدادات ---------- */
  async saveSettings(settings) {
    if (this.mode === "firebase") {
      const publicSettings = { ...settings };
      delete publicSettings.ownerPin; // لا نرفع كلمة المرور للسحابة
      await this.fs.collection("store").doc("settings").set(publicSettings);
      return;
    }
    const data = this._readLocal();
    data.settings = settings;
    this._writeLocal(data);
  },

  /* ---------- المنتجات ---------- */
  newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  async saveProduct(product) {
    const p = { ...product };
    if (!p.id) p.id = this.newId();
    if (!p.date) p.date = new Date().toISOString().slice(0, 10);

    if (this.mode === "firebase") {
      const { id, ...data } = p;
      await this.fs.collection("products").doc(id).set(data);
      return p;
    }

    const data = this._readLocal();
    data.products = data.products || [];
    const i = data.products.findIndex(x => x.id === p.id);
    if (i >= 0) data.products[i] = p;
    else data.products.push(p);
    this._writeLocal(data);
    return p;
  },

  // حفظ ترتيب المنتجات بعد التقديم والتأخير
  async saveOrder(products) {
    if (this.mode === "firebase") {
      const batch = this.fs.batch();
      products.forEach(p => batch.update(this.fs.collection("products").doc(String(p.id)), { order: p.order }));
      await batch.commit();
      return;
    }
    const data = this._readLocal();
    const orderMap = Object.fromEntries(products.map(p => [p.id, p.order]));
    data.products = (data.products || []).map(p => ({ ...p, order: orderMap[p.id] ?? p.order }));
    this._writeLocal(data);
  },

  async deleteProduct(id) {
    if (this.mode === "firebase") {
      await this.fs.collection("products").doc(String(id)).delete();
      return;
    }
    const data = this._readLocal();
    data.products = (data.products || []).filter(p => p.id !== id);
    this._writeLocal(data);
  },

  /* ---------- الطلبات ---------- */
  ORDERS: "atqen_orders",

  async addOrder(order) {
    if (this.mode === "firebase") {
      await this.fs.collection("orders").doc(String(order.id)).set(order);
      return;
    }
    const orders = Utils.load(this.ORDERS, []);
    orders.unshift(order);
    Utils.save(this.ORDERS, orders.slice(0, 200));
  },

  async getOrders(limit = 50) {
    if (this.mode === "firebase") {
      const snap = await this.fs.collection("orders").orderBy("date", "desc").limit(limit).get();
      return snap.docs.map(d => ({ ...d.data(), id: d.id }));
    }
    return Utils.load(this.ORDERS, []).slice(0, limit);
  },

  /* ---------- نسخة احتياطية ---------- */
  async importAll({ settings, products }) {
    if (settings) await this.saveSettings(this.mergeSettings(settings));
    if (Array.isArray(products)) {
      if (this.mode === "firebase") {
        const old = await this.fs.collection("products").get();
        await Promise.all(old.docs.map(d => d.ref.delete()));
        for (const p of products) await this.saveProduct(p);
      } else {
        const data = this._readLocal();
        data.products = products;
        this._writeLocal(data);
      }
    }
  },

  /* ---------- تسجيل دخول المالك ---------- */
  async login(email, password) {
    if (this.mode === "firebase") {
      await this.auth.signInWithEmailAndPassword(email, password);
      return;
    }
    const { settings } = await this.load();
    if (password !== String(settings.ownerPin)) throw new Error("كلمة المرور غير صحيحة");
    sessionStorage.setItem(this.SESSION, "1");
  },

  async logout() {
    if (this.mode === "firebase") await this.auth.signOut();
    sessionStorage.removeItem(this.SESSION);
  },

  onAuthChange(callback) {
    if (this.mode === "firebase") {
      this.auth.onAuthStateChanged(user => callback(!!user));
    } else {
      callback(sessionStorage.getItem(this.SESSION) === "1");
    }
  }
};
