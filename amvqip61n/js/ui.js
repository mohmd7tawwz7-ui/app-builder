/* =====================================================
   🎨 واجهة المتجر — المنتجات، النوافذ، السلة، المفضلة
   ===================================================== */
const UI = {
  state: {
    category: "الكل",
    search: "",
    sort: "default"
  },

  FAV: "❤️ المفضلة",

  /* ---------- معلومات المتجر ---------- */
  applyConfig() {
    ["name", "tagline", "heroLine1", "heroHighlight", "heroLine2"].forEach(key => {
      Utils.$$(`[data-store='${key}']`).forEach(el => (el.textContent = CONFIG[key] || ""));
    });
    Utils.$$(".logo-mark").forEach(el => (el.textContent = (CONFIG.name || "أ").trim().charAt(0)));
    document.title = `${CONFIG.name} | متجر المنتجات الرقمية`;
    Utils.$("#year").textContent = new Date().getFullYear();

    const wa = `https://wa.me/${CONFIG.whatsapp}`;
    Utils.$("#contactWhatsapp").href = wa;
    Utils.$("#maintenanceWhatsapp").href = wa;

    const fab = Utils.$("#fabWhatsapp");
    fab.href = wa;
    fab.hidden = CONFIG.floatingWhatsapp === false;

    const bar = Utils.$("#announce");
    bar.textContent = CONFIG.announcement || "";
    bar.hidden = !CONFIG.announcement;
  },

  /* ---------- وضع الصيانة ---------- */
  applyMaintenance() {
    const preview = new URLSearchParams(location.search).has("preview");
    const closed = CONFIG.maintenance && !preview;
    Utils.$("#maintenanceText").textContent = CONFIG.maintenanceMessage || "";
    Utils.$("#maintenance").hidden = !closed;
    document.body.classList.toggle("no-scroll", closed);

    if (CONFIG.maintenance && preview) {
      const bar = Utils.$("#announce");
      bar.textContent = "👁 معاينة المالك — المتجر مغلق حالياً أمام الزوار";
      bar.hidden = false;
    }
  },

  /* ---------- أزرار الأقسام ---------- */
  renderCategories() {
    const cats = ["الكل", ...CONFIG.categories];
    if (Favorites.count()) cats.push(this.FAV);
    if (!cats.includes(this.state.category)) this.state.category = "الكل";

    Utils.$("#categoryChips").innerHTML = cats
      .map(c => {
        const label = c === this.FAV ? `${c} (${Favorites.count()})` : c;
        return `<button class="chip ${c === this.state.category ? "active" : ""}" data-cat="${Utils.escape(c)}">${Utils.escape(label)}</button>`;
      })
      .join("");
  },

  /* ---------- فلترة وترتيب ---------- */
  getFilteredProducts() {
    const { category, search, sort } = this.state;
    const q = search.trim().toLowerCase();

    let list = PRODUCTS.filter(p => {
      const inCat =
        category === "الكل" ||
        (category === this.FAV ? Favorites.has(p.id) : p.category === category);
      const inSearch = !q ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q);
      return inCat && inSearch;
    });

    if (sort === "price-asc") list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === "price-desc") list.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sort === "newest") list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    else list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.order ?? 0) - (b.order ?? 0));

    return list;
  },

  media(p) {
    return p.image
      ? `<img src="${Utils.escape(p.image)}" alt="${Utils.escape(p.name)}" loading="lazy">`
      : Utils.escape(p.icon || "📦");
  },

  priceHTML(p) {
    if (!Number(p.price)) return `<span class="price">مجاني</span>`;
    const old = Number(p.oldPrice) > Number(p.price) ? `<span class="price-old">${p.oldPrice}</span>` : "";
    return `<span class="price">${Number(p.price).toLocaleString("ar-SA")}<small>${Utils.escape(CONFIG.currency)}</small>${old}</span>`;
  },

  discountPercent(p) {
    const price = Number(p.price), old = Number(p.oldPrice);
    return old > price && price > 0 ? Math.round((1 - price / old) * 100) : 0;
  },

  showLoading() {
    Utils.$("#productGrid").innerHTML = `<div class="loader"></div>`;
  },

  /* ---------- رسم المنتجات ---------- */
  renderProducts() {
    const grid = Utils.$("#productGrid");
    const list = this.getFilteredProducts();

    if (!PRODUCTS.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="e-icon">🚀</div>
          <h3>منتجاتنا قادمة قريباً</h3>
          <p>نعمل على تجهيز منتجات مميزة لك، تابعنا ليصلك كل جديد</p>
        </div>`;
      return;
    }

    if (!list.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="e-icon">🔍</div>
          <h3>لا توجد نتائج</h3>
          <p>جرّب كلمة بحث أخرى أو قسماً مختلفاً</p>
        </div>`;
      return;
    }

    grid.innerHTML = list.map(p => {
      const off = this.discountPercent(p);
      const badge = p.badge || (off ? `خصم ${off}%` : "") || (p.featured ? "⭐ مميز" : "");
      const fav = Favorites.has(p.id);
      return `
      <article class="card ${p.featured ? "featured" : ""}" data-open="${Utils.escape(p.id)}">
        <div class="card-media">
          ${badge ? `<span class="card-badge">${Utils.escape(badge)}</span>` : ""}
          <button class="fav-btn ${fav ? "on" : ""}" data-fav="${Utils.escape(p.id)}" aria-label="المفضلة">${fav ? "♥" : "♡"}</button>
          ${this.media(p)}
        </div>
        <div class="card-body">
          <span class="card-cat">${Utils.escape(p.category)}</span>
          <h3 class="card-title">${Utils.escape(p.name)}</h3>
          <p class="card-desc">${Utils.escape(p.description)}</p>
          <div class="card-foot">
            ${this.priceHTML(p)}
            <button class="add-btn ${Cart.has(p.id) ? "in-cart" : ""}" data-add="${Utils.escape(p.id)}" aria-label="أضف للسلة">
              ${Cart.has(p.id) ? "✓" : "+"}
            </button>
          </div>
        </div>
      </article>`;
    }).join("");
  },

  /* ---------- تفاصيل المنتج ---------- */
  openProduct(id) {
    const p = Utils.getProduct(id);
    if (!p) return;

    const features = (p.features || []).filter(Boolean).map(f => `<li>${Utils.escape(f)}</li>`).join("");
    const fav = Favorites.has(p.id);
    const off = this.discountPercent(p);

    Utils.$("#productPanel").innerHTML = `
      <div class="modal-media">
        ${this.media(p)}
        <button class="icon-btn modal-close" data-close aria-label="إغلاق">✕</button>
      </div>
      <div class="modal-content">
        <span class="card-cat">${Utils.escape(p.category)}</span>
        <h3>${Utils.escape(p.name)}</h3>
        <div class="modal-price">
          ${this.priceHTML(p)}
          ${off ? `<span class="save-tag">وفّر ${off}%</span>` : ""}
        </div>
        <p class="modal-desc">${Utils.escape(p.description)}</p>
        ${features ? `<ul class="modal-features">${features}</ul>` : ""}
        <div class="modal-actions">
          <button class="btn btn-primary btn-block" data-buy="${Utils.escape(p.id)}">
            ${Number(p.price) ? "اشترِ الآن" : "احصل عليه مجاناً"}
          </button>
          <button class="btn btn-outline btn-block" data-add="${Utils.escape(p.id)}" data-close-after>
            ${Cart.has(p.id) ? "✓ في السلة" : "أضف للسلة 🛒"}
          </button>
          <div class="modal-mini">
            <button class="btn btn-outline btn-sm" data-fav="${Utils.escape(p.id)}">${fav ? "♥ في المفضلة" : "♡ المفضلة"}</button>
            <button class="btn btn-outline btn-sm" data-share="${Utils.escape(p.id)}">↗ مشاركة</button>
          </div>
        </div>
      </div>`;

    this.open("#productModal");
    history.replaceState(null, "", `#p=${encodeURIComponent(p.id)}`);
  },

  /* ---------- مشاركة منتج ---------- */
  async shareProduct(id) {
    const p = Utils.getProduct(id);
    if (!p) return;
    const url = location.href.split("#")[0].split("?")[0] + `#p=${encodeURIComponent(p.id)}`;
    const text = `${p.name} — ${Utils.formatPrice(p.price)} من متجر ${CONFIG.name}`;

    if (navigator.share) {
      try { await navigator.share({ title: p.name, text, url }); } catch (e) {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      Utils.toast("✓ تم نسخ رابط المنتج");
    } catch (e) {
      prompt("انسخ رابط المنتج:", url);
    }
  },

  /* ---------- السلة ---------- */
  renderCart() {
    const products = Cart.getProducts();
    const body = Utils.$("#cartItems");
    const foot = Utils.$("#cartFoot");

    if (!products.length) {
      body.innerHTML = `<div class="cart-empty"><div>🛒</div><p>السلة فارغة</p></div>`;
      foot.innerHTML = `<button class="btn btn-outline btn-block" data-close>متابعة التسوق</button>`;
      return;
    }

    body.innerHTML = products.map(p => `
      <div class="cart-item">
        <div class="cart-thumb">${this.media(p)}</div>
        <div class="cart-info">
          <div class="cart-name">${Utils.escape(p.name)}</div>
          <div class="cart-price">${Utils.formatPrice(p.price)}</div>
        </div>
        <button class="cart-remove" data-remove="${Utils.escape(p.id)}" aria-label="حذف">🗑</button>
      </div>`).join("");

    const hasCoupons = (CONFIG.coupons || []).some(c => c.active !== false);
    let couponHTML = "";
    if (Cart.coupon) {
      couponHTML = `
        <div class="coupon-applied">
          <span>🎟️ ${Utils.escape(Cart.coupon.code)} (-${Cart.coupon.percent}%)</span>
          <button data-coupon-remove aria-label="إزالة الكوبون">✕</button>
        </div>`;
    } else if (hasCoupons) {
      couponHTML = `
        <form class="coupon-form" id="couponForm">
          <input id="couponInput" placeholder="عندك كوبون خصم؟" dir="ltr" autocomplete="off">
          <button class="btn btn-outline btn-sm" type="submit">تطبيق</button>
        </form>`;
    }

    foot.innerHTML = `
      ${couponHTML}
      ${Cart.coupon ? `
        <div class="cart-line"><span>المجموع</span><span>${Utils.formatPrice(Cart.subtotal())}</span></div>
        <div class="cart-line discount"><span>الخصم</span><span>-${Utils.formatPrice(Cart.discount())}</span></div>` : ""}
      <div class="cart-total"><span>الإجمالي</span><span class="gold">${Utils.formatPrice(Cart.total())}</span></div>
      ${Checkout.isPayPalReady()
        ? `<button class="btn btn-primary btn-block" data-checkout>💳 إتمام الشراء</button>`
        : `<button class="btn btn-whatsapp btn-block" data-checkout>إتمام الطلب عبر واتساب 💬</button>`}`;
  },

  openCart() {
    this.renderCart();
    this.open("#cartDrawer");
  },

  updateCartBadge() {
    const badge = Utils.$("#cartBadge");
    const n = Cart.count();
    badge.textContent = n;
    badge.classList.toggle("show", n > 0);
    badge.classList.remove("bump");
    void badge.offsetWidth;
    if (n) badge.classList.add("bump");
  },

  /* ---------- الأسئلة الشائعة ---------- */
  renderFAQ() {
    Utils.$("#faq").hidden = !CONFIG.faq.length;
    Utils.$("#faqList").innerHTML = CONFIG.faq.map(item => `
      <div class="faq-item">
        <button class="faq-q">${Utils.escape(item.q)}<span>+</span></button>
        <div class="faq-a"><p>${Utils.escape(item.a)}</p></div>
      </div>`).join("");
  },

  toggleFAQ(btn) {
    const item = btn.closest(".faq-item");
    const answer = Utils.$(".faq-a", item);
    const isOpen = item.classList.toggle("open");
    answer.style.maxHeight = isOpen ? answer.scrollHeight + "px" : "0";
  },

  /* ---------- حسابات التواصل ---------- */
  renderSocials() {
    const links = Object.entries(CONFIG.socials || {}).filter(([, url]) => url);
    Utils.$("#socialLinks").innerHTML = links
      .map(([key, url]) => `<a class="social" href="${Utils.escape(url)}" target="_blank" rel="noopener">${Utils.escape(SOCIAL_LABELS[key] || key)}</a>`)
      .join("");
  },

  /* ---------- النوافذ ---------- */
  open(selector) {
    Utils.$(selector).classList.add("open");
    document.body.classList.add("no-scroll");
  },

  closeAll() {
    Utils.$$(".modal.open, .drawer.open").forEach(el => el.classList.remove("open"));
    document.body.classList.remove("no-scroll");
    if (location.hash.startsWith("#p=")) history.replaceState(null, "", location.pathname + location.search);
  }
};
