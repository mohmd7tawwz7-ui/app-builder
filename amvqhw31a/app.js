/* ===== منطق متجر أتقن ===== */

const $ = (s) => document.querySelector(s);
let cart = [];
let activeCategory = "الكل";

/* حفظ واسترجاع السلة */
function loadCart() {
  try {
    const saved = localStorage.getItem("atqen_cart");
    cart = saved ? JSON.parse(saved) : [];
  } catch (e) { cart = []; }
}
function saveCart() {
  try { localStorage.setItem("atqen_cart", JSON.stringify(cart)); } catch (e) {}
}

function money(n) { return n + " " + STORE.currency; }
function findProduct(id) { return PRODUCTS.find(p => p.id === id); }

/* رسالة صغيرة */
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2000);
}

/* صورة المنتج */
function productVisual(p) {
  if (p.image) return `<img src="${p.image}" alt="${p.name}">`;
  return `<span class="p-icon">${p.icon}</span>`;
}

/* أزرار التصنيفات */
function renderFilters() {
  const cats = ["الكل", ...new Set(PRODUCTS.map(p => p.category))];
  $("#filters").innerHTML = cats.map(c =>
    `<button class="chip ${c === activeCategory ? "active" : ""}" data-cat="${c}">${c}</button>`
  ).join("");
}

/* عرض المنتجات */
function renderProducts() {
  const q = $("#searchInput").value.trim().toLowerCase();
  const list = PRODUCTS.filter(p =>
    (activeCategory === "الكل" || p.category === activeCategory) &&
    (p.name.toLowerCase().includes(q) || p.short.toLowerCase().includes(q))
  );

  $("#emptyMsg").hidden = list.length > 0;
  $("#productsGrid").innerHTML = list.map(p => `
    <article class="card ${p.available ? "" : "soon"}">
      ${p.badge ? `<span class="card-badge">${p.badge}</span>` : ""}
      <div class="card-visual" data-view="${p.id}">${productVisual(p)}</div>
      <div class="card-body">
        <span class="card-cat">${p.category}</span>
        <h3 data-view="${p.id}">${p.name}</h3>
        <p>${p.short}</p>
        <div class="card-foot">
          <div class="price">
            ${p.available ? `<strong>${money(p.price)}</strong>` : `<strong>قريباً</strong>`}
            ${p.available && p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}
          </div>
          ${p.available
            ? `<button class="btn btn-primary sm" data-add="${p.id}">أضف للسلة</button>`
            : `<button class="btn sm" disabled>غير متاح</button>`}
        </div>
      </div>
    </article>
  `).join("");
}

/* نافذة التفاصيل */
function openModal(id) {
  const p = findProduct(id);
  if (!p) return;
  $("#modalContent").innerHTML = `
    <div class="modal-visual">${productVisual(p)}</div>
    <span class="card-cat">${p.category}</span>
    <h2>${p.name}</h2>
    <p>${p.short}</p>
    ${p.features.length ? `<ul class="features">${p.features.map(f => `<li>✔️ ${f}</li>`).join("")}</ul>` : ""}
    <div class="modal-foot">
      <div class="price">
        ${p.available ? `<strong>${money(p.price)}</strong>` : `<strong>قريباً</strong>`}
        ${p.available && p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}
      </div>
      ${p.available ? `<button class="btn btn-primary" data-add="${p.id}" data-close>أضف للسلة</button>` : ""}
    </div>
  `;
  $("#productModal").hidden = false;
}
function closeModal() { $("#productModal").hidden = true; }

/* السلة */
function addToCart(id) {
  const p = findProduct(id);
  if (!p || !p.available) return;
  const item = cart.find(i => i.id === id);
  if (item) item.qty++;
  else cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  toast("تمت الإضافة إلى السلة ✅");
}
function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}
function cartTotal() {
  return cart.reduce((sum, i) => {
    const p = findProduct(i.id);
    return p ? sum + p.price * i.qty : sum;
  }, 0);
}
function renderCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  $("#cartCount").textContent = count;

  if (!cart.length) {
    $("#cartItems").innerHTML = `<p class="empty">السلة فارغة</p>`;
  } else {
    $("#cartItems").innerHTML = cart.map(i => {
      const p = findProduct(i.id);
      if (!p) return "";
      return `
        <div class="cart-item">
          <div class="ci-visual">${productVisual(p)}</div>
          <div class="ci-info">
            <h4>${p.name}</h4>
            <span>${money(p.price)}</span>
          </div>
          <div class="qty">
            <button data-qty="${p.id}" data-d="1">+</button>
            <span>${i.qty}</span>
            <button data-qty="${p.id}" data-d="-1">−</button>
          </div>
        </div>`;
    }).join("");
  }
  $("#cartTotal").textContent = money(cartTotal());
}
function openCart() {
  $("#cart").classList.add("open");
  $("#cart").setAttribute("aria-hidden", "false");
  $("#overlay").hidden = false;
}
function closeCart() {
  $("#cart").classList.remove("open");
  $("#cart").setAttribute("aria-hidden", "true");
  $("#overlay").hidden = true;
}

/* إرسال الطلب على واتساب */
function checkout() {
  if (!cart.length) { toast("السلة فارغة"); return; }
  const name = $("#customerName").value.trim();
  let msg = `مرحباً ${STORE.name} 👋\nأريد طلب:\n\n`;
  cart.forEach(i => {
    const p = findProduct(i.id);
    if (p) msg += `• ${p.name} × ${i.qty} = ${money(p.price * i.qty)}\n`;
  });
  msg += `\nالإجمالي: ${money(cartTotal())}`;
  if (name) msg += `\nالاسم: ${name}`;
  msg += `\n\nطريقة الدفع المفضلة: `;
  const url = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

/* طرق الدفع والأسئلة والتواصل */
function renderStatic() {
  $("#payMethods").innerHTML = STORE.payments.map(m => `
    <div class="pay"><span>${m.icon}</span><div><strong>${m.name}</strong><small>${m.details}</small></div></div>
  `).join("");

  $("#faqList").innerHTML = FAQ.map(f => `
    <details><summary>${f.q}</summary><p>${f.a}</p></details>
  `).join("");

  $("#contactWhatsapp").href = `https://wa.me/${STORE.whatsapp}`;

  $("#socials").innerHTML = STORE.socials
    .filter(s => s.url)
    .map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`)
    .join("");

  $("#year").textContent = new Date().getFullYear();
}

/* الأحداث */
document.addEventListener("click", (e) => {
  const t = e.target;
  const add = t.closest("[data-add]");
  if (add) addToCart(Number(add.dataset.add));

  const view = t.closest("[data-view]");
  if (view) openModal(Number(view.dataset.view));

  const qty = t.closest("[data-qty]");
  if (qty) changeQty(Number(qty.dataset.qty), Number(qty.dataset.d));

  const chip = t.closest("[data-cat]");
  if (chip) { activeCategory = chip.dataset.cat; renderFilters(); renderProducts(); }

  if (t.closest("[data-close]") || t.id === "productModal") closeModal();

  if (t.closest(".nav a")) $("#nav").classList.remove("open");
});

$("#cartBtn").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
$("#overlay").addEventListener("click", closeCart);
$("#checkoutBtn").addEventListener("click", checkout);
$("#clearCart").addEventListener("click", () => { cart = []; saveCart(); renderCart(); });
$("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));
$("#searchInput").addEventListener("input", renderProducts);

/* التشغيل */
loadCart();
renderFilters();
renderProducts();
renderCart();
renderStatic();
