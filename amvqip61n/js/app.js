/* =====================================================
   🚀 تشغيل المتجر وربط الأزرار
   ===================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  UI.showLoading();

  // تحميل الإعدادات والمنتجات (من الجوال أو من السحابة)
  try {
    await DB.init();
    const data = await DB.load();
    Object.assign(CONFIG, data.settings);
    PRODUCTS.splice(0, PRODUCTS.length, ...data.products.filter(p => p.visible !== false));
  } catch (e) {
    console.error(e);
    Utils.toast("تعذر تحميل بيانات المتجر");
  }

  Utils.applyTheme(CONFIG.theme);
  UI.applyConfig();
  Favorites.init();
  Cart.init();
  UI.renderCategories();
  UI.renderProducts();
  UI.renderFAQ();
  UI.renderSocials();
  UI.applyMaintenance();

  // فتح منتج من رابط مشترك (#p=...)
  openFromLink();
  window.addEventListener("hashchange", openFromLink);
});

function openFromLink() {
  const m = location.hash.match(/^#p=(.+)$/);
  if (m && Utils.getProduct(decodeURIComponent(m[1]))) {
    UI.openProduct(decodeURIComponent(m[1]));
  }
}

function refreshProducts() {
  UI.renderCategories();
  UI.renderProducts();
}

function bindEvents() {
  /* البحث */
  Utils.$("#searchInput").addEventListener("input", e => {
    UI.state.search = e.target.value;
    UI.renderProducts();
  });

  /* الترتيب */
  Utils.$("#sortSelect").addEventListener("change", e => {
    UI.state.sort = e.target.value;
    UI.renderProducts();
  });

  /* السلة */
  Utils.$("#cartBtn").addEventListener("click", () => UI.openCart());

  /* قائمة الجوال */
  const nav = Utils.$("#nav");
  Utils.$("#menuBtn").addEventListener("click", () => nav.classList.toggle("open"));
  Utils.$$("#nav a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));

  /* التمرير: ظل الشريط وزر الصعود */
  const fabTop = Utils.$("#fabTop");
  window.addEventListener("scroll", () => {
    Utils.$("#header").classList.toggle("scrolled", window.scrollY > 10);
    fabTop.classList.toggle("show", window.scrollY > 600);
  }, { passive: true });
  fabTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* الكوبون */
  document.addEventListener("submit", e => {
    if (e.target.id !== "couponForm") return;
    e.preventDefault();
    if (Cart.applyCoupon(Utils.$("#couponInput").value)) UI.renderCart();
  });

  /* كل النقرات في مكان واحد */
  document.addEventListener("click", e => {
    const t = e.target;

    const chip = t.closest("[data-cat]");
    if (chip) {
      UI.state.category = chip.dataset.cat;
      refreshProducts();
      return;
    }

    const favBtn = t.closest("[data-fav]");
    if (favBtn) {
      e.stopPropagation();
      Favorites.toggle(favBtn.dataset.fav);
      refreshProducts();
      if (favBtn.closest("#productPanel")) UI.openProduct(favBtn.dataset.fav);
      return;
    }

    if (t.closest("[data-purchases]")) {
      e.preventDefault();
      Checkout.openPurchases();
      return;
    }

    if (t.closest("[data-free-get]")) {
      Checkout.getFree();
      return;
    }

    if (t.closest("[data-wa-order]")) {
      Checkout.orderWhatsApp();
      return;
    }

    const shareBtn = t.closest("[data-share]");
    if (shareBtn) {
      UI.shareProduct(shareBtn.dataset.share);
      return;
    }

    const addBtn = t.closest("[data-add]");
    if (addBtn) {
      e.stopPropagation();
      Cart.add(addBtn.dataset.add);
      UI.renderProducts();
      if (addBtn.hasAttribute("data-close-after")) UI.closeAll();
      return;
    }

    const buyBtn = t.closest("[data-buy]");
    if (buyBtn) {
      Cart.buyNow(buyBtn.dataset.buy);
      return;
    }

    const removeBtn = t.closest("[data-remove]");
    if (removeBtn) {
      Cart.remove(removeBtn.dataset.remove);
      UI.renderCart();
      UI.renderProducts();
      return;
    }

    if (t.closest("[data-coupon-remove]")) {
      Cart.removeCoupon();
      UI.renderCart();
      return;
    }

    if (t.closest("[data-checkout]")) {
      Cart.checkout();
      return;
    }

    if (t.closest("[data-close]")) {
      UI.closeAll();
      return;
    }

    const card = t.closest("[data-open]");
    if (card) {
      UI.openProduct(card.dataset.open);
      return;
    }

    const faq = t.closest(".faq-q");
    if (faq) UI.toggleFAQ(faq);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") UI.closeAll();
  });
}
