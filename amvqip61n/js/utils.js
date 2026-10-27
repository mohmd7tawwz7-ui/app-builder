/* =====================================================
   🧰 أدوات مساعدة تُستخدم في المتجر ولوحة المالك
   ===================================================== */
const Utils = {
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  },

  // حماية النصوص من أكواد HTML
  escape(text = "") {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  formatPrice(price) {
    if (!Number(price)) return "مجاني";
    return `${Number(price).toLocaleString("ar-SA")} ${CONFIG.currency}`;
  },

  getProduct(id) {
    return PRODUCTS.find(p => String(p.id) === String(id));
  },

  save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },

  load(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch (e) {
      return fallback;
    }
  },

  openWhatsApp(message = "") {
    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  },

  toast(message) {
    const el = Utils.$("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 2000);
  },

  /* ---------- الألوان والخلفية ---------- */
  hexToRgb(hex = "#f2b544") {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const n = parseInt(hex, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },

  applyTheme(theme = {}) {
    const background = theme.background || "royal";
    const rgb = Utils.hexToRgb(theme.accent || "#e2b85c");
    const mix = (target, amount) => rgb.map(c => Math.round(c + (target - c) * amount)).join(",");
    const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;

    const vars = {
      "--gold": `rgb(${rgb.join(",")})`,
      "--gold-2": `rgb(${mix(255, 0.4)})`,
      "--gold-dark": `rgb(${mix(0, 0.22)})`,
      "--gold-rgb": rgb.join(","),
      "--on-gold": lum > 0.55 ? "#1a1203" : "#ffffff"
    };

    const root = document.documentElement;
    root.dataset.bg = background;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

    // نحفظها لتظهر فوراً في الزيارة القادمة بدون وميض
    Utils.save("atqen_theme", { background, vars });
  },

  /* ---------- ضغط الصور قبل الحفظ ---------- */
  compressImage(file, maxSize = 900, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#151a22";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
};
