/* =====================================================
   🛒 السلة — إضافة، حذف، كوبونات، والطلب عبر واتساب
   ===================================================== */
const Cart = {
  key: "atqen_cart",
  couponKey: "atqen_coupon",
  items: [],
  coupon: null,

  init() {
    this.items = Utils.load(this.key, [])
      .map(String)
      .filter(id => Utils.getProduct(id));

    // استرجاع الكوبون إن كان ما زال فعّالاً
    const saved = Utils.load(this.couponKey, null);
    this.coupon = saved ? this.findCoupon(saved) : null;

    this.save();
  },

  save() {
    Utils.save(this.key, this.items);
    Utils.save(this.couponKey, this.coupon ? this.coupon.code : null);
    UI.updateCartBadge();
  },

  has(id) {
    return this.items.includes(String(id));
  },

  add(id) {
    id = String(id);
    if (this.has(id)) {
      Utils.toast("المنتج موجود في السلة");
      return;
    }
    this.items.push(id);
    this.save();
    Utils.toast("✓ تمت الإضافة للسلة");
  },

  remove(id) {
    this.items = this.items.filter(x => x !== String(id));
    this.save();
  },

  clear() {
    this.items = [];
    this.coupon = null;
    this.save();
  },

  getProducts() {
    return this.items.map(id => Utils.getProduct(id)).filter(Boolean);
  },

  count() {
    return this.items.length;
  },

  /* ---------- الحساب ---------- */
  subtotal() {
    return this.getProducts().reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  },

  discount() {
    if (!this.coupon) return 0;
    return Math.round(this.subtotal() * this.coupon.percent) / 100;
  },

  total() {
    return Math.max(0, this.subtotal() - this.discount());
  },

  /* ---------- الكوبونات ---------- */
  findCoupon(code) {
    const c = String(code || "").trim().toUpperCase();
    return (CONFIG.coupons || []).find(x => x.active !== false && String(x.code).toUpperCase() === c) || null;
  },

  applyCoupon(code) {
    const coupon = this.findCoupon(code);
    if (!coupon) {
      Utils.toast("الكوبون غير صحيح أو منتهي");
      return false;
    }
    this.coupon = coupon;
    this.save();
    Utils.toast(`🎉 تم تطبيق خصم ${coupon.percent}%`);
    return true;
  },

  removeCoupon() {
    this.coupon = null;
    this.save();
  },

  /* ---------- الطلب ---------- */
  // إتمام شراء كل ما في السلة (PayPal / مجاني / واتساب)
  checkout() {
    if (!this.items.length) return;
    Checkout.open(this.items, { useCoupon: true });
  },

  // شراء منتج واحد مباشرة
  buyNow(id) {
    Checkout.open([id]);
  }
};
