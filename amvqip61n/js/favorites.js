/* =====================================================
   ❤️ المفضلة — يحفظ الزائر المنتجات التي أعجبته
   ===================================================== */
const Favorites = {
  key: "atqen_favorites",
  items: [],

  init() {
    this.items = Utils.load(this.key, [])
      .map(String)
      .filter(id => Utils.getProduct(id));
    this.save();
  },

  save() {
    Utils.save(this.key, this.items);
  },

  has(id) {
    return this.items.includes(String(id));
  },

  toggle(id) {
    id = String(id);
    if (this.has(id)) {
      this.items = this.items.filter(x => x !== id);
      Utils.toast("أُزيل من المفضلة");
    } else {
      this.items.push(id);
      Utils.toast("❤️ أُضيف للمفضلة");
    }
    this.save();
  },

  count() {
    return this.items.length;
  }
};
