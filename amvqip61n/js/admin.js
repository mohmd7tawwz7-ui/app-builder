/* =====================================================
   🔒 لوحة المالك — التحكم الكامل في المتجر بدون كود
   ===================================================== */
const Admin = {
  settings: null,
  products: [],
  entered: false,
  editingId: null,
  pendingImage: "",
  draftTheme: null,
  faqDraft: [],
  orders: [],

  /* ================= التشغيل ================= */
  async start() {
    await DB.init();
    this.bindLogin();
    this.bindPanel();
    DB.onAuthChange(isOwner => (isOwner ? this.enter() : this.showLogin()));
  },

  showLogin() {
    this.entered = false;
    Utils.$("#panelView").hidden = true;
    Utils.$("#loginView").hidden = false;

    const cloud = DB.mode === "firebase";
    Utils.$("#emailField").hidden = !cloud;
    Utils.$("#loginEmail").required = cloud;
    if (cloud && typeof OWNER_EMAIL !== "undefined") Utils.$("#loginEmail").value = OWNER_EMAIL;
    Utils.$("#loginHint").textContent = cloud ? "☁️ متصل بالسحابة" : "📱 وضع التجربة المحلي";
    setTimeout(() => Utils.$("#loginPassword").focus(), 100);
  },

  async enter() {
    if (this.entered) return;
    this.entered = true;
    Utils.$("#loginView").hidden = true;
    Utils.$("#panelView").hidden = false;
    await this.reload();
  },

  async reload() {
    try {
      const data = await DB.load();
      this.settings = data.settings;
      this.products = data.products;
      Object.assign(CONFIG, this.settings);
    } catch (e) {
      console.error(e);
      Utils.toast("تعذر تحميل البيانات");
      return;
    }
    Utils.applyTheme(this.settings.theme);
    this.draftTheme = { ...this.settings.theme };
    this.renderAll();
    this.loadOrders();
  },

  /* ================= الطلبات ================= */
  async loadOrders() {
    Utils.$("#orderList").innerHTML = `<div class="loader small"></div>`;
    try {
      this.orders = await DB.getOrders(50);
    } catch (e) {
      console.error(e);
      this.orders = [];
      Utils.$("#orderList").innerHTML = `<div class="empty-small">تعذر تحميل الطلبات</div>`;
      return;
    }
    this.renderOrders();
    this.renderStats();
  },

  renderOrders() {
    const list = Utils.$("#orderList");
    if (!this.orders.length) {
      list.innerHTML = `<div class="empty-small">لا توجد طلبات بعد — أول طلب بيظهر هنا 🎉</div>`;
      return;
    }
    list.innerHTML = this.orders.map(o => {
      const d = new Date(o.date);
      const method = o.method === "paypal" ? `<span class="tag paypal">PayPal</span>` : `<span class="tag free">مجاني</span>`;
      return `
      <div class="p-row order-row">
        <div class="order-top">
          <span class="order-items">${(o.items || []).map(i => Utils.escape(i.name)).join("، ")}</span>
          <span class="amt">${o.total ? Utils.escape(o.total + " " + (o.currency || "")) : "مجاني"}</span>
        </div>
        <div class="order-meta">
          ${method}
          <span>${d.toLocaleDateString("ar-SA")} ${d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
          ${o.payer?.name ? `<span>👤 ${Utils.escape(o.payer.name)}</span>` : ""}
          ${o.payer?.email ? `<span dir="ltr">${Utils.escape(o.payer.email)}</span>` : ""}
          ${o.coupon ? `<span>🎟️ ${Utils.escape(o.coupon)}</span>` : ""}
          ${o.method === "paypal" ? `<span dir="ltr">💵 ${Utils.escape(o.paid)}</span>` : ""}
        </div>
      </div>`;
    }).join("");
  },

  renderPayStatus() {
    const on = !!String(this.settings.paypalClientId || "").trim();
    const box = Utils.$("#payStatus");
    box.className = `pay-status ${on ? "on" : "off"}`;
    box.innerHTML = on
      ? `<div class="m-icon">💳</div><div><strong>الدفع التلقائي مفعّل</strong><p>الزبون يدفع عبر PayPal ويستلم المنتج فوراً.</p></div>`
      : `<div class="m-icon">💬</div><div><strong>الدفع التلقائي غير مفعّل</strong><p>الطلبات حالياً عبر واتساب. أضف PayPal Client ID لتفعيله.</p></div>
         <button class="btn btn-primary btn-sm" data-goto="settings" data-scroll="payBox">تفعيل</button>`;
  },

  renderAll() {
    Utils.$("#brandName").textContent = this.settings.name;
    Utils.$$(".logo-mark").forEach(el => (el.textContent = (this.settings.name || "أ").trim().charAt(0)));
    this.renderMode();
    this.renderStatus();
    this.renderPayStatus();
    this.renderStats();
    this.renderProducts();
    this.renderCoupons();
    this.fillSettings();
    this.renderAppearance();
    this.faqDraft = Utils.clone(this.settings.faq || []);
    this.renderFaq();
  },

  /* ================= تسجيل الدخول ================= */
  bindLogin() {
    Utils.$("#passEye").addEventListener("click", e => {
      const input = Utils.$("#loginPassword");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      e.currentTarget.classList.toggle("on", show);
    });

    Utils.$("#loginForm").addEventListener("submit", async e => {
      e.preventDefault();
      const btn = Utils.$("#loginBtn");
      const err = Utils.$("#loginError");
      err.textContent = "";
      btn.disabled = true;
      btn.textContent = "جاري الدخول...";
      try {
        await DB.login(Utils.$("#loginEmail").value.trim(), Utils.$("#loginPassword").value.trim());
        Utils.$("#loginPassword").value = "";
        if (DB.mode === "local") await this.enter();
      } catch (ex) {
        err.textContent = DB.mode === "firebase" ? "البريد أو كلمة المرور غير صحيحة" : ex.message;
      } finally {
        btn.disabled = false;
        btn.textContent = "دخول";
      }
    });
  },

  /* ================= أزرار اللوحة ================= */
  bindPanel() {
    Utils.$("#tabs").addEventListener("click", e => {
      const tab = e.target.closest("[data-tab]");
      if (tab) this.goTo(tab.dataset.tab);
    });

    Utils.$("#logoutBtn").addEventListener("click", async () => {
      if (!confirm("تسجيل الخروج من لوحة المالك؟")) return;
      await DB.logout();
      this.showLogin();
    });

    // نقرات عامة
    document.addEventListener("click", e => {
      const t = e.target;
      const q = sel => t.closest(sel);

      if (q("[data-action='new-product']")) return this.openProductForm();
      if (q("[data-action='toggle-maintenance']")) return this.toggleMaintenance();
      if (q("[data-goto]")) {
        const g = q("[data-goto]");
        this.goTo(g.dataset.goto);
        if (g.dataset.scroll) setTimeout(() => Utils.$("#" + g.dataset.scroll)?.scrollIntoView({ behavior: "smooth" }), 300);
        return;
      }
      if (q("[data-edit]")) return this.openProductForm(q("[data-edit]").dataset.edit);
      if (q("[data-delete]")) return this.deleteProduct(q("[data-delete]").dataset.delete);
      if (q("[data-visibility]")) return this.toggleVisibility(q("[data-visibility]").dataset.visibility);
      if (q("[data-move]")) {
        const b = q("[data-move]");
        return this.moveProduct(b.dataset.move, Number(b.dataset.dir));
      }
      if (q("[data-copy-link]")) return this.copyProductLink(q("[data-copy-link]").dataset.copyLink);
      if (q("[data-coupon-toggle]")) return this.toggleCoupon(Number(q("[data-coupon-toggle]").dataset.couponToggle));
      if (q("[data-coupon-del]")) return this.deleteCoupon(Number(q("[data-coupon-del]").dataset.couponDel));
      if (q("[data-close]")) return this.closeModal();
    });

    Utils.$("#productSearch").addEventListener("input", () => this.renderProducts());
    Utils.$("#refreshOrders").addEventListener("click", () => this.loadOrders());

    // نموذج المنتج
    Utils.$("#productForm").addEventListener("submit", e => {
      e.preventDefault();
      this.saveProduct();
    });
    Utils.$("#imageInput").addEventListener("change", e => this.pickImage(e.target.files[0]));
    Utils.$("#removeImageBtn").addEventListener("click", () => {
      this.pendingImage = "";
      this.updateImagePreview();
    });
    Utils.$("#productForm").elements.icon.addEventListener("input", () => this.updateImagePreview());

    // الكوبونات
    Utils.$("#couponForm").addEventListener("submit", e => {
      e.preventDefault();
      this.addCoupon();
    });

    // الإعدادات
    const sf = Utils.$("#settingsForm");
    sf.addEventListener("submit", e => {
      e.preventDefault();
      this.saveSettings();
    });
    ["heroLine1", "heroHighlight", "heroLine2", "tagline"].forEach(n =>
      sf.elements[n].addEventListener("input", () => this.renderHeroPreview())
    );
    Utils.$("#exportBtn").addEventListener("click", () => this.exportData());
    Utils.$("#importInput").addEventListener("change", e => this.importData(e.target.files[0]));

    // المظهر
    Utils.$("#bgOptions").addEventListener("click", e => {
      const opt = e.target.closest("[data-bgopt]");
      if (!opt) return;
      this.draftTheme.background = opt.dataset.bgopt;
      this.previewTheme();
    });
    Utils.$("#swatches").addEventListener("click", e => {
      const sw = e.target.closest("[data-color]");
      if (!sw) return;
      this.draftTheme.accent = sw.dataset.color;
      this.previewTheme();
    });
    Utils.$("#customColor").addEventListener("input", e => {
      this.draftTheme.accent = e.target.value;
      this.previewTheme();
    });
    Utils.$("#saveThemeBtn").addEventListener("click", () => this.saveTheme());

    // الأسئلة
    Utils.$("#addFaqBtn").addEventListener("click", () => {
      this.syncFaqDraft();
      this.faqDraft.push({ q: "", a: "" });
      this.renderFaq();
      const inputs = Utils.$$("#faqEditor input");
      inputs[inputs.length - 1]?.focus();
    });
    Utils.$("#faqEditor").addEventListener("click", e => {
      const del = e.target.closest("[data-faq-del]");
      if (!del) return;
      this.syncFaqDraft();
      this.faqDraft.splice(Number(del.dataset.faqDel), 1);
      this.renderFaq();
    });
    Utils.$("#saveFaqBtn").addEventListener("click", () => this.saveFaq());

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") this.closeModal();
    });
  },

  goTo(name) {
    // نرجع المعاينة للمظهر المحفوظ عند ترك تبويب المظهر
    if (name !== "appearance" && this.settings) {
      this.draftTheme = { ...this.settings.theme };
      Utils.applyTheme(this.settings.theme);
      this.renderAppearance();
    }
    Utils.$$(".a-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
    Utils.$$(".tab-page").forEach(p => p.classList.toggle("active", p.id === `tab-${name}`));
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  /* ================= الرئيسية ================= */
  renderMode() {
    const card = Utils.$("#modeCard");
    if (DB.mode === "firebase") {
      card.className = "mode-card cloud";
      card.innerHTML = `<div class="m-icon">☁️</div><div><strong>متصل بالسحابة</strong><p>كل تعديل تحفظه يظهر لزوار متجرك مباشرة.</p></div>`;
    } else {
      card.className = "mode-card local";
      card.innerHTML = `<div class="m-icon">📱</div><div><strong>وضع التجربة (محلي)</strong><p>التعديلات محفوظة على هذا الجهاز فقط ولا يراها الزوار. اربط المتجر بـ Firebase لتظهر للجميع.</p></div>`;
    }
    Utils.$("#pinBox").hidden = DB.mode === "firebase";
  },

  renderStatus() {
    const closed = !!this.settings.maintenance;
    Utils.$("#storeStatus").innerHTML = `
      <div>
        <strong><span class="dot ${closed ? "off" : ""}"></span>${closed ? "المتجر مغلق مؤقتاً" : "المتجر مفتوح للزوار"}</strong>
        <small>${closed ? "الزوار يشوفون رسالة الصيانة" : "كل شيء يعمل بشكل طبيعي"}</small>
      </div>
      <button class="btn ${closed ? "btn-primary" : "btn-outline"} btn-sm" data-action="toggle-maintenance">
        ${closed ? "🔓 فتح المتجر" : "🔒 إغلاق مؤقت"}
      </button>`;
  },

  async toggleMaintenance() {
    const closing = !this.settings.maintenance;
    if (closing && !confirm("إغلاق المتجر مؤقتاً أمام الزوار؟")) return;
    this.settings.maintenance = closing;
    if (await this.persistSettings(closing ? "🔒 تم إغلاق المتجر مؤقتاً" : "🔓 المتجر مفتوح الآن")) {
      this.renderStatus();
      Utils.$("#settingsForm").elements.maintenance.checked = closing;
    }
  },

  renderStats() {
    const p = this.products;
    Utils.$("#statProducts").textContent = p.length;
    Utils.$("#statVisible").textContent = p.filter(x => x.visible !== false).length;
    Utils.$("#statOrders").textContent = this.orders.length;
    const sales = this.orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    Utils.$("#statSales").textContent = Math.round(sales).toLocaleString("ar-SA");
  },

  /* ================= المنتجات ================= */
  thumb(p) {
    return p.image ? `<img src="${Utils.escape(p.image)}" alt="">` : Utils.escape(p.icon || "📦");
  },

  renderProducts() {
    const list = Utils.$("#productList");
    const q = Utils.$("#productSearch").value.trim().toLowerCase();
    const items = this.products.filter(p => !q || (p.name || "").toLowerCase().includes(q));

    if (!this.products.length) {
      list.innerHTML = `<div class="empty-small">لا توجد منتجات بعد<br><br>
        <button class="btn btn-primary btn-sm" data-action="new-product">➕ أضف أول منتج</button></div>`;
      return;
    }
    if (!items.length) {
      list.innerHTML = `<div class="empty-small">لا توجد نتائج</div>`;
      return;
    }

    const last = this.products.length - 1;
    list.innerHTML = items.map(p => {
      const hidden = p.visible === false;
      const idx = this.products.indexOf(p);
      const id = Utils.escape(p.id);
      return `
      <div class="p-row ${hidden ? "hidden-product" : ""} ${p.featured ? "featured-row" : ""}">
        ${q ? "" : `<div class="order-btns">
          <button data-move="${id}" data-dir="-1" ${idx === 0 ? "disabled" : ""} aria-label="تقديم">▲</button>
          <button data-move="${id}" data-dir="1" ${idx === last ? "disabled" : ""} aria-label="تأخير">▼</button>
        </div>`}
        <div class="p-thumb">${this.thumb(p)}</div>
        <div class="p-info">
          <strong>${p.featured ? "⭐ " : ""}${Utils.escape(p.name)}</strong>
          <div class="p-meta">
            <span class="p-price">${Utils.formatPrice(p.price)}</span>
            <span>${Utils.escape(p.category || "")}</span>
            ${hidden ? "<span>• مخفي</span>" : ""}
          </div>
        </div>
        <div class="p-tools">
          <button class="icon-btn" data-copy-link="${id}" title="نسخ رابط المنتج">🔗</button>
          <button class="icon-btn" data-visibility="${id}" title="${hidden ? "إظهار" : "إخفاء"}">${hidden ? "🙈" : "👁"}</button>
          <button class="icon-btn" data-edit="${id}" title="تعديل">✏️</button>
          <button class="icon-btn del" data-delete="${id}" title="حذف">🗑</button>
        </div>
      </div>`;
    }).join("");
  },

  async moveProduct(id, dir) {
    const i = this.products.findIndex(p => String(p.id) === String(id));
    const j = i + dir;
    if (i < 0 || j < 0 || j >= this.products.length) return;
    [this.products[i], this.products[j]] = [this.products[j], this.products[i]];
    this.products.forEach((p, k) => (p.order = k));
    this.renderProducts();
    try {
      await DB.saveOrder(this.products);
    } catch (e) {
      Utils.toast("تعذر حفظ الترتيب");
    }
  },

  async copyProductLink(id) {
    const base = location.href.split("#")[0].split("?")[0].replace(/admin\.html$/, "index.html");
    const url = `${base}#p=${encodeURIComponent(id)}`;
    try {
      await navigator.clipboard.writeText(url);
      Utils.toast("✓ تم نسخ رابط المنتج — الصقه في البايو أو الفيديو");
    } catch (e) {
      prompt("انسخ رابط المنتج:", url);
    }
  },

  openProductForm(id = null) {
    const form = Utils.$("#productForm");
    const p = id ? this.products.find(x => String(x.id) === String(id)) : null;
    this.editingId = p ? p.id : null;
    form.reset();

    const cats = [...(this.settings.categories || [])];
    if (p && p.category && !cats.includes(p.category)) cats.push(p.category);
    Utils.$("#categorySelect").innerHTML = cats.length
      ? cats.map(c => `<option>${Utils.escape(c)}</option>`).join("")
      : `<option value="">— أضف أقساماً من الإعدادات —</option>`;

    Utils.$("#productFormTitle").textContent = p ? "تعديل المنتج" : "منتج جديد";

    const f = form.elements;
    f.name.value = p?.name || "";
    f.category.value = p?.category || cats[0] || "";
    f.icon.value = p?.icon || "📦";
    f.price.value = p ? Number(p.price) || 0 : 0;
    f.oldPrice.value = p && Number(p.oldPrice) ? p.oldPrice : "";
    f.badge.value = p?.badge || "";
    f.description.value = p?.description || "";
    f.features.value = (p?.features || []).join("\n");
    f.payLink.value = p?.payLink || "";
    f.downloadUrl.value = p?.downloadUrl || "";
    f.visible.checked = p ? p.visible !== false : true;
    f.featured.checked = !!p?.featured;

    this.pendingImage = p?.image || "";
    Utils.$("#imageInput").value = "";
    this.updateImagePreview();

    Utils.$("#productModal").classList.add("open");
    document.body.classList.add("no-scroll");
  },

  closeModal() {
    Utils.$("#productModal").classList.remove("open");
    document.body.classList.remove("no-scroll");
  },

  async pickImage(file) {
    if (!file) return;
    try {
      Utils.toast("جاري تجهيز الصورة...");
      this.pendingImage = await Utils.compressImage(file);
      this.updateImagePreview();
    } catch (e) {
      Utils.toast("تعذر قراءة الصورة");
    }
  },

  updateImagePreview() {
    const icon = Utils.$("#productForm").elements.icon.value || "📦";
    Utils.$("#imgPreview").innerHTML = this.pendingImage
      ? `<img src="${this.pendingImage}" alt="">`
      : Utils.escape(icon);
    Utils.$("#removeImageBtn").hidden = !this.pendingImage;
  },

  async saveProduct() {
    const f = Utils.$("#productForm").elements;
    const btn = Utils.$("#saveProductBtn");
    const old = this.editingId ? this.products.find(x => x.id === this.editingId) : null;

    const product = {
      ...(old || {}),
      name: f.name.value.trim(),
      category: f.category.value,
      icon: f.icon.value.trim() || "📦",
      image: this.pendingImage || "",
      price: Number(f.price.value) || 0,
      oldPrice: Number(f.oldPrice.value) || 0,
      badge: f.badge.value.trim(),
      description: f.description.value.trim(),
      features: f.features.value.split("\n").map(s => s.trim()).filter(Boolean),
      payLink: f.payLink.value.trim(),
      downloadUrl: f.downloadUrl.value.trim(),
      visible: f.visible.checked,
      featured: f.featured.checked
    };
    if (!product.name) return Utils.toast("اكتب اسم المنتج");
    if (product.oldPrice && product.oldPrice <= product.price) {
      return Utils.toast("السعر قبل الخصم لازم يكون أكبر من السعر");
    }
    if (!old) product.order = this.products.length;

    btn.disabled = true;
    try {
      const saved = await DB.saveProduct(product);
      const i = this.products.findIndex(x => x.id === saved.id);
      if (i >= 0) this.products[i] = saved;
      else this.products.push(saved);
      this.closeModal();
      this.renderProducts();
      this.renderStats();
      Utils.toast("✓ تم حفظ المنتج");
    } catch (e) {
      console.error(e);
      Utils.toast(e.message || "تعذر الحفظ");
    } finally {
      btn.disabled = false;
    }
  },

  async deleteProduct(id) {
    const p = this.products.find(x => String(x.id) === String(id));
    if (!p || !confirm(`حذف "${p.name}" نهائياً؟`)) return;
    try {
      await DB.deleteProduct(p.id);
      this.products = this.products.filter(x => x.id !== p.id);
      this.renderProducts();
      this.renderStats();
      Utils.toast("تم حذف المنتج");
    } catch (e) {
      Utils.toast("تعذر الحذف");
    }
  },

  async toggleVisibility(id) {
    const p = this.products.find(x => String(x.id) === String(id));
    if (!p) return;
    const updated = { ...p, visible: p.visible === false };
    try {
      await DB.saveProduct(updated);
      Object.assign(p, updated);
      this.renderProducts();
      this.renderStats();
      Utils.toast(updated.visible ? "المنتج ظاهر الآن" : "تم إخفاء المنتج");
    } catch (e) {
      Utils.toast("تعذر التحديث");
    }
  },

  /* ================= الكوبونات ================= */
  renderCoupons() {
    const list = Utils.$("#couponList");
    const coupons = this.settings.coupons || [];
    if (!coupons.length) {
      list.innerHTML = `<div class="empty-small">لا توجد كوبونات بعد</div>`;
      return;
    }
    list.innerHTML = coupons.map((c, i) => {
      const on = c.active !== false;
      return `
      <div class="p-row ${on ? "" : "off"}">
        <span class="coupon-code">${Utils.escape(c.code)}</span>
        <div class="p-info">
          <strong>خصم ${c.percent}%</strong>
          <div class="p-meta"><span>${on ? "✅ فعّال" : "⏸ موقوف"}</span></div>
        </div>
        <div class="p-tools">
          <button class="icon-btn" data-coupon-toggle="${i}" title="${on ? "إيقاف" : "تفعيل"}">${on ? "⏸" : "▶️"}</button>
          <button class="icon-btn del" data-coupon-del="${i}" title="حذف">🗑</button>
        </div>
      </div>`;
    }).join("");
  },

  async addCoupon() {
    const f = Utils.$("#couponForm").elements;
    const code = f.code.value.trim().toUpperCase().replace(/\s+/g, "");
    const percent = Math.round(Number(f.percent.value));
    if (!code) return Utils.toast("اكتب كود الكوبون");
    if (!(percent >= 1 && percent <= 100)) return Utils.toast("النسبة من 1 إلى 100");

    const coupons = this.settings.coupons || [];
    if (coupons.some(c => String(c.code).toUpperCase() === code)) return Utils.toast("هذا الكود موجود مسبقاً");

    this.settings.coupons = [...coupons, { code, percent, active: true }];
    if (await this.persistSettings(`✓ تمت إضافة كوبون ${code}`)) {
      Utils.$("#couponForm").reset();
      this.renderCoupons();
      this.renderStats();
    }
  },

  async toggleCoupon(i) {
    const c = this.settings.coupons[i];
    if (!c) return;
    c.active = c.active === false;
    if (await this.persistSettings(c.active ? "تم تفعيل الكوبون" : "تم إيقاف الكوبون")) {
      this.renderCoupons();
      this.renderStats();
    }
  },

  async deleteCoupon(i) {
    const c = this.settings.coupons[i];
    if (!c || !confirm(`حذف كوبون ${c.code}؟`)) return;
    this.settings.coupons.splice(i, 1);
    if (await this.persistSettings("تم حذف الكوبون")) {
      this.renderCoupons();
      this.renderStats();
    }
  },

  /* ================= الإعدادات ================= */
  fillSettings() {
    const f = Utils.$("#settingsForm").elements;
    const s = this.settings;
    ["name", "announcement", "heroLine1", "heroHighlight", "heroLine2", "tagline",
      "whatsapp", "currency", "orderGreeting", "maintenanceMessage"].forEach(k => (f[k].value = s[k] || ""));
    f.categories.value = (s.categories || []).join("\n");
    ["tiktok", "instagram", "youtube", "x"].forEach(k => (f[`social_${k}`].value = s.socials?.[k] || ""));
    f.floatingWhatsapp.checked = s.floatingWhatsapp !== false;
    f.paypalClientId.value = s.paypalClientId || "";
    f.paypalCurrency.value = s.paypalCurrency || "USD";
    f.paypalRate.value = s.paypalRate || 0.2667;
    f.whatsappOrders.checked = !!s.whatsappOrders;
    f.maintenance.checked = !!s.maintenance;
    f.ownerPin.value = "";
    this.renderHeroPreview();
  },

  renderHeroPreview() {
    const f = Utils.$("#settingsForm").elements;
    const e = v => Utils.escape(v);
    Utils.$("#heroPreview").innerHTML =
      `${e(f.heroLine1.value)} <span class="gold">${e(f.heroHighlight.value)}</span><br>${e(f.heroLine2.value)}` +
      `<small>${e(f.tagline.value)}</small>`;
  },

  async persistSettings(message) {
    try {
      await DB.saveSettings(this.settings);
      Object.assign(CONFIG, this.settings);
      Utils.toast(message);
      return true;
    } catch (e) {
      console.error(e);
      Utils.toast(e.message || "تعذر الحفظ");
      return false;
    }
  },

  async saveSettings() {
    const f = Utils.$("#settingsForm").elements;
    const whatsapp = f.whatsapp.value.replace(/\D/g, "");
    if (whatsapp.length < 8) return Utils.toast("رقم واتساب غير صحيح");

    const next = {
      ...this.settings,
      name: f.name.value.trim() || "متجري",
      announcement: f.announcement.value.trim(),
      heroLine1: f.heroLine1.value.trim(),
      heroHighlight: f.heroHighlight.value.trim(),
      heroLine2: f.heroLine2.value.trim(),
      tagline: f.tagline.value.trim(),
      whatsapp,
      currency: f.currency.value.trim() || "ر.س",
      orderGreeting: f.orderGreeting.value.trim(),
      floatingWhatsapp: f.floatingWhatsapp.checked,
      categories: [...new Set(f.categories.value.split("\n").map(s => s.trim()).filter(Boolean))],
      socials: {
        tiktok: f.social_tiktok.value.trim(),
        instagram: f.social_instagram.value.trim(),
        youtube: f.social_youtube.value.trim(),
        x: f.social_x.value.trim()
      },
      paypalClientId: f.paypalClientId.value.trim(),
      paypalCurrency: f.paypalCurrency.value,
      paypalRate: Number(f.paypalRate.value) || 1,
      whatsappOrders: f.whatsappOrders.checked,
      maintenance: f.maintenance.checked,
      maintenanceMessage: f.maintenanceMessage.value.trim() || DEFAULT_SETTINGS.maintenanceMessage
    };
    const newPin = f.ownerPin.value.trim();
    if (newPin) {
      if (newPin.length < 6) return Utils.toast("كلمة المرور 6 أحرف على الأقل");
      next.ownerPin = newPin;
    }

    this.settings = next;
    if (await this.persistSettings("✓ تم حفظ الإعدادات")) this.renderAll();
  },

  exportData() {
    const data = { settings: { ...this.settings }, products: this.products, exportedAt: new Date().toISOString() };
    delete data.settings.ownerPin;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `atqen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    Utils.toast("✓ تم تصدير النسخة الاحتياطية");
  },

  async importData(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.settings && !data.products) throw new Error();
      if (!confirm("سيتم استبدال كل بيانات المتجر الحالية بهذه النسخة. متابعة؟")) return;
      if (data.settings) data.settings.ownerPin = this.settings.ownerPin;
      await DB.importAll(data);
      Utils.toast("✓ تم الاسترجاع");
      await this.reload();
    } catch (e) {
      Utils.toast("الملف غير صالح");
    } finally {
      Utils.$("#importInput").value = "";
    }
  },

  /* ================= المظهر ================= */
  renderAppearance() {
    const t = this.draftTheme;
    Utils.$$("[data-bgopt]").forEach(b => b.classList.toggle("active", b.dataset.bgopt === t.background));
    let matched = false;
    Utils.$$("[data-color]").forEach(s => {
      const on = s.dataset.color.toLowerCase() === (t.accent || "").toLowerCase();
      s.classList.toggle("active", on);
      if (on) matched = true;
    });
    const custom = Utils.$(".swatch.custom");
    custom.classList.toggle("active", !matched);
    custom.style.setProperty("--c", t.accent);
    Utils.$("#customColor").value = t.accent;
  },

  previewTheme() {
    Utils.applyTheme(this.draftTheme);
    this.renderAppearance();
  },

  async saveTheme() {
    this.settings.theme = { ...this.draftTheme };
    await this.persistSettings("✓ تم حفظ المظهر");
  },

  /* ================= الأسئلة ================= */
  syncFaqDraft() {
    this.faqDraft = Utils.$$("#faqEditor .faq-row").map(row => ({
      q: Utils.$("input", row).value.trim(),
      a: Utils.$("textarea", row).value.trim()
    }));
  },

  renderFaq() {
    const box = Utils.$("#faqEditor");
    if (!this.faqDraft.length) {
      box.innerHTML = `<div class="empty-small">لا توجد أسئلة — قسم الأسئلة مخفي من المتجر</div>`;
      return;
    }
    box.innerHTML = this.faqDraft.map((item, i) => `
      <div class="faq-row">
        <div class="faq-row-head">
          <span>سؤال ${i + 1}</span>
          <button class="icon-btn" data-faq-del="${i}" title="حذف">🗑</button>
        </div>
        <input placeholder="السؤال" value="${Utils.escape(item.q)}">
        <textarea rows="2" placeholder="الجواب">${Utils.escape(item.a)}</textarea>
      </div>`).join("");
  },

  async saveFaq() {
    this.syncFaqDraft();
    this.settings.faq = this.faqDraft.filter(x => x.q && x.a);
    if (await this.persistSettings("✓ تم حفظ الأسئلة")) {
      this.faqDraft = Utils.clone(this.settings.faq);
      this.renderFaq();
    }
  }
};

document.addEventListener("DOMContentLoaded", () => Admin.start());
