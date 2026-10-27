/* =====================================================
   💳 الدفع والتسليم التلقائي
   -----------------------------------------------------
   • منتج مجاني          ← يصل للزبون فوراً
   • منتج له رابط دفع خارجي (Payhip...) ← يفتح صفحة الدفع
   • باقي المنتجات       ← الدفع عبر PayPal ثم يظهر رابط التحميل
   • بدون PayPal          ← الطلب عبر واتساب
   ===================================================== */
const Checkout = {
  sdkPromise: null,
  PURCHASES: "atqen_purchases",
  current: null, // { products, useCoupon }

  isPayPalReady() {
    return !!String(CONFIG.paypalClientId || "").trim();
  },

  /* ---------- الحساب ---------- */
  calc(products, useCoupon) {
    const subtotal = products.reduce((s, p) => s + (Number(p.price) || 0), 0);
    const percent = useCoupon && Cart.coupon ? Cart.coupon.percent : 0;
    const discount = Math.round(subtotal * percent) / 100;
    const total = Math.max(0, subtotal - discount);
    const paypalAmount = (Math.round(total * Number(CONFIG.paypalRate || 1) * 100) / 100).toFixed(2);
    return { subtotal, discount, total, paypalAmount };
  },

  /* ---------- فتح صفحة الدفع ---------- */
  open(ids, { useCoupon = false } = {}) {
    const products = ids.map(id => Utils.getProduct(id)).filter(Boolean);
    if (!products.length) return;

    // منتج واحد له صفحة دفع خارجية ← نفتحها مباشرة
    if (products.length === 1 && products[0].payLink) {
      window.open(products[0].payLink, "_blank");
      return;
    }

    this.current = { products, useCoupon };
    this.renderCheckout();
    UI.closeAll();
    UI.open("#checkoutModal");
  },

  renderCheckout() {
    const { products, useCoupon } = this.current;
    const external = products.filter(p => p.payLink);
    const direct = products.filter(p => !p.payLink);
    const c = this.calc(direct, useCoupon);
    const panel = Utils.$("#checkoutPanel");

    const rows = direct.map(p => `
      <div class="co-item">
        <div class="cart-thumb">${UI.media(p)}</div>
        <div class="cart-info"><div class="cart-name">${Utils.escape(p.name)}</div></div>
        <span class="co-price">${Utils.formatPrice(p.price)}</span>
      </div>`).join("");

    const externalHTML = external.length ? `
      <div class="co-block">
        <h4>منتجات تُشترى من صفحة الدفع الخاصة بها</h4>
        ${external.map(p => `
          <a class="co-ext" href="${Utils.escape(p.payLink)}" target="_blank" rel="noopener">
            <span>${Utils.escape(p.name)}</span><b>${Utils.formatPrice(p.price)} ↗</b>
          </a>`).join("")}
      </div>` : "";

    let payHTML = "";
    if (direct.length) {
      if (c.total === 0) {
        payHTML = `<button class="btn btn-primary btn-block" data-free-get>🎁 احصل عليه مجاناً</button>`;
      } else if (this.isPayPalReady()) {
        const showConv = String(CONFIG.paypalCurrency).toUpperCase() !== "SAR" &&
          String(CONFIG.currency).trim() !== String(CONFIG.paypalCurrency).trim();
        payHTML = `
          ${showConv ? `<p class="co-note">💱 سيتم الدفع بـ <b>${c.paypalAmount} ${Utils.escape(CONFIG.paypalCurrency)}</b> (ما يعادل ${Utils.formatPrice(c.total)})</p>` : ""}
          <div id="paypalButtons" class="paypal-box"><div class="loader small"></div></div>
          <p class="co-safe">🔒 دفع آمن عبر PayPal — بالحساب أو بالبطاقة، ويصلك المنتج فوراً بعد الدفع</p>
          ${CONFIG.whatsappOrders ? `<button class="btn btn-outline btn-block" data-wa-order>💬 أو اطلب عبر واتساب</button>` : ""}`;
      } else {
        payHTML = `<button class="btn btn-whatsapp btn-block" data-wa-order>💬 إتمام الطلب عبر واتساب</button>`;
      }
    }

    panel.innerHTML = `
      <div class="drawer-head">
        <h3>إتمام الشراء</h3>
        <button class="icon-btn" data-close aria-label="إغلاق">✕</button>
      </div>
      <div class="co-body">
        ${direct.length ? `
          <div class="co-list">${rows}</div>
          ${c.discount ? `
            <div class="cart-line"><span>المجموع</span><span>${Utils.formatPrice(c.subtotal)}</span></div>
            <div class="cart-line discount"><span>خصم ${Utils.escape(Cart.coupon.code)}</span><span>-${Utils.formatPrice(c.discount)}</span></div>` : ""}
          <div class="cart-total"><span>الإجمالي</span><span class="gold">${Utils.formatPrice(c.total)}</span></div>
          ${payHTML}` : ""}
        ${externalHTML}
      </div>`;

    if (direct.length && c.total > 0 && this.isPayPalReady()) this.mountPayPal(direct, c);
  },

  /* ---------- PayPal ---------- */
  loadSDK() {
    if (this.sdkPromise) return this.sdkPromise;
    this.sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(CONFIG.paypalClientId.trim()) +
        "&currency=" + encodeURIComponent(CONFIG.paypalCurrency || "USD") +
        "&intent=capture&components=buttons&enable-funding=card";
      s.onload = resolve;
      s.onerror = () => {
        this.sdkPromise = null;
        reject(new Error("تعذر تحميل PayPal"));
      };
      document.head.appendChild(s);
    });
    return this.sdkPromise;
  },

  async mountPayPal(products, c) {
    const box = Utils.$("#paypalButtons");
    try {
      await this.loadSDK();
      box.innerHTML = "";
      await window.paypal.Buttons({
        style: { layout: "vertical", shape: "pill", label: "pay", height: 48 },

        createOrder: (data, actions) => actions.order.create({
          purchase_units: [{
            description: `${CONFIG.name}: ${products.map(p => p.name).join("، ")}`.slice(0, 120),
            amount: { currency_code: CONFIG.paypalCurrency, value: c.paypalAmount }
          }],
          application_context: { shipping_preference: "NO_SHIPPING", brand_name: CONFIG.name }
        }),

        onApprove: async (data, actions) => {
          box.innerHTML = `<div class="loader small"></div><p class="co-note center">جاري تأكيد الدفع...</p>`;
          try {
            const details = await actions.order.capture();
            if (details.status !== "COMPLETED") throw new Error(details.status);
            await this.complete(products, c, {
              method: "paypal",
              id: details.id,
              payer: {
                name: [details.payer?.name?.given_name, details.payer?.name?.surname].filter(Boolean).join(" "),
                email: details.payer?.email_address || ""
              }
            });
          } catch (e) {
            console.error(e);
            this.renderCheckout();
            Utils.toast("لم يكتمل الدفع، حاول مرة أخرى");
          }
        },

        onCancel: () => Utils.toast("تم إلغاء الدفع"),
        onError: err => {
          console.error(err);
          Utils.toast("حدث خطأ في PayPal، حاول مرة أخرى");
        }
      }).render(box);
    } catch (e) {
      console.error(e);
      box.innerHTML = `<p class="co-error">تعذر تحميل PayPal. تأكد من اتصالك بالإنترنت.</p>
        <button class="btn btn-whatsapp btn-block" data-wa-order>💬 اطلب عبر واتساب بدلاً من ذلك</button>`;
    }
  },

  /* ---------- مجاني ---------- */
  async getFree() {
    const products = this.current.products.filter(p => !p.payLink);
    const c = this.calc(products, this.current.useCoupon);
    await this.complete(products, c, { method: "free", id: "FREE-" + Date.now().toString(36).toUpperCase() });
  },

  /* ---------- واتساب ---------- */
  orderWhatsApp() {
    const products = this.current.products.filter(p => !p.payLink);
    const c = this.calc(products, this.current.useCoupon);
    const lines = products.map((p, i) => `${i + 1}. ${p.name} — ${Utils.formatPrice(p.price)}`).join("\n");
    const disc = c.discount ? `كوبون ${Cart.coupon.code}: -${Utils.formatPrice(c.discount)}\n` : "";
    Utils.openWhatsApp(`${CONFIG.orderGreeting} ${CONFIG.name}:\n\n${lines}\n\n${disc}الإجمالي: ${Utils.formatPrice(c.total)}`);
  },

  /* ---------- بعد الدفع: التسليم ---------- */
  async complete(products, c, info) {
    const order = {
      id: info.id,
      method: info.method,
      date: new Date().toISOString(),
      items: products.map(p => ({ id: String(p.id), name: p.name, price: Number(p.price) || 0 })),
      subtotal: c.subtotal,
      discount: c.discount,
      total: c.total,
      currency: CONFIG.currency,
      paid: info.method === "paypal" ? `${c.paypalAmount} ${CONFIG.paypalCurrency}` : "0",
      coupon: c.discount && Cart.coupon ? Cart.coupon.code : "",
      payer: info.payer || null
    };

    // نحفظ المشتريات عند الزبون ليرجع لها لاحقاً
    const purchases = Utils.load(this.PURCHASES, []);
    purchases.unshift({
      orderId: order.id,
      date: order.date,
      items: products.map(p => ({ id: String(p.id), name: p.name, icon: p.icon || "📦", downloadUrl: p.downloadUrl || "" }))
    });
    Utils.save(this.PURCHASES, purchases.slice(0, 100));

    // نسجّل الطلب ليظهر في لوحة المالك
    DB.addOrder(order).catch(e => console.warn("تعذر تسجيل الطلب", e));

    // نزيل المنتجات المشتراة من السلة
    products.forEach(p => Cart.remove(p.id));
    if (this.current.useCoupon) Cart.removeCoupon();
    UI.renderProducts();

    this.renderSuccess(order, products);
  },

  renderSuccess(order, products) {
    const panel = Utils.$("#checkoutPanel");
    panel.innerHTML = `
      <div class="drawer-head">
        <h3>${order.method === "free" ? "منتجاتك جاهزة 🎁" : "تم الدفع بنجاح ✅"}</h3>
        <button class="icon-btn" data-close aria-label="إغلاق">✕</button>
      </div>
      <div class="co-body">
        <div class="success-icon">✓</div>
        <p class="center">شكراً لك${order.payer?.name ? " " + Utils.escape(order.payer.name) : ""}! حمّل منتجاتك من هنا:</p>
        <div class="dl-list">${products.map(p => this.downloadRow(p, order.id)).join("")}</div>
        <p class="co-note">رقم الطلب: <b dir="ltr">${Utils.escape(order.id)}</b><br>
        تقدر ترجع لمنتجاتك في أي وقت من زر <b>"مشترياتي"</b> في القائمة.</p>
      </div>`;
  },

  downloadRow(p, orderId) {
    if (p.downloadUrl) {
      return `<a class="dl-row" href="${Utils.escape(p.downloadUrl)}" target="_blank" rel="noopener">
        <span>${Utils.escape(p.icon || "📦")} ${Utils.escape(p.name)}</span><b>⬇️ تحميل</b></a>`;
    }
    const msg = encodeURIComponent(`السلام عليكم، طلب رقم ${orderId}: أرغب باستلام "${p.name}"`);
    return `<a class="dl-row pending" href="https://wa.me/${CONFIG.whatsapp}?text=${msg}" target="_blank" rel="noopener">
      <span>${Utils.escape(p.icon || "📦")} ${Utils.escape(p.name)}</span><b>💬 استلام</b></a>`;
  },

  /* ---------- مشترياتي ---------- */
  openPurchases() {
    const purchases = Utils.load(this.PURCHASES, []);
    const panel = Utils.$("#checkoutPanel");
    panel.innerHTML = `
      <div class="drawer-head">
        <h3>مشترياتي 🧾</h3>
        <button class="icon-btn" data-close aria-label="إغلاق">✕</button>
      </div>
      <div class="co-body">
        ${purchases.length ? purchases.map(o => `
          <div class="co-block">
            <h4>${new Date(o.date).toLocaleDateString("ar-SA")} · <span dir="ltr">${Utils.escape(o.orderId)}</span></h4>
            <div class="dl-list">${o.items.map(it => {
              const live = Utils.getProduct(it.id);
              return this.downloadRow({ ...it, downloadUrl: (live && live.downloadUrl) || it.downloadUrl }, o.orderId);
            }).join("")}</div>
          </div>`).join("")
        : `<div class="cart-empty"><div>🧾</div><p>لا توجد مشتريات على هذا الجهاز</p></div>`}
      </div>`;
    UI.closeAll();
    UI.open("#checkoutModal");
  }
};
