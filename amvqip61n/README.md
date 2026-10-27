# متجر أتقن — Atqen Store

متجر منتجات رقمية بالعربي، مع **لوحة مالك** تتحكم منها بكل شيء بدون كود.

## هيكل المشروع

```
atqen/
├── index.html            ← المتجر (للزوار)
├── admin.html            ← 🔒 لوحة المالك
├── manifest.json         ← لتثبيت المتجر كتطبيق على الجوال
├── css/
│   ├── style.css         ← تصميم المتجر والخلفيات
│   └── admin.css         ← تصميم لوحة المالك
├── js/
│   ├── config.js         ← الإعدادات الافتراضية (أول مرة فقط)
│   ├── firebase-config.js← ☁️ ربط السحابة
│   ├── utils.js          ← أدوات مساعدة + الألوان + ضغط الصور
│   ├── db.js             ← قاعدة البيانات (محلي / سحابة)
│   ├── favorites.js      ← المفضلة
│   ├── cart.js           ← السلة والكوبونات
│   ├── checkout.js       ← 💳 الدفع عبر PayPal والتسليم التلقائي
│   ├── ui.js             ← رسم واجهة المتجر
│   ├── app.js            ← تشغيل المتجر
│   └── admin.js          ← تشغيل لوحة المالك
└── assets/
    ├── logo-mark.jpg     ← شعار الزاوية
    ├── icon-192.png / icon-512.png ← أيقونة التطبيق
    └── images/
```

## لوحة المالك
- ادخلها من زر **⚙️** أعلى زاوية المتجر، أو افتح `admin.html`.
- كلمة المرور (الوضع المحلي): **112233123** — تقدر تغيّرها من الإعدادات.

من اللوحة تقدر:
- تضيف / تعدّل / تحذف / تخفي المنتجات مع الصور
- تغيّر اسم المتجر، الوصف، رقم واتساب، العملة، الأقسام، حساباتك
- تضيف شريط إعلان أعلى المتجر
- تختار الخلفية (متوهج، نجوم، شبكة، هادئ) ولون المتجر
- تعدّل الأسئلة الشائعة
- تنشئ كوبونات خصم للزبائن
- تميّز منتجات ⭐ وترتّبها، وتنسخ رابط أي منتج لتشاركه
- تغلق المتجر مؤقتاً (وضع الصيانة) بضغطة زر
- تصدّر وتسترجع نسخة احتياطية

---

## ☁️ ربط المتجر بالسحابة (حتى يرى الزوار تعديلاتك)

بدون هذه الخطوة، التعديلات تبقى على جوالك فقط.
Firebase مجاني لمتجر بهذا الحجم.

1. ادخل **console.firebase.google.com** وسجّل بحساب Google
2. **Add project** ← اكتب اسم (مثل atqen) ← أكمل
3. من القائمة: **Build ← Firestore Database ← Create database** ← اختر أقرب موقع ← **Production mode**
4. من **Rules** في Firestore الصق هذا (ضع بريدك مكان YOUR_EMAIL) ثم **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner() {
      return request.auth != null && request.auth.token.email == "YOUR_EMAIL";
    }
    match /store/{doc}    { allow read: if true; allow write: if isOwner(); }
    match /products/{doc} { allow read: if true; allow write: if isOwner(); }
    match /orders/{doc}   { allow create: if true; allow read, update, delete: if isOwner(); }
  }
}
```

5. من **Build ← Authentication ← Get started ← Email/Password ← Enable**
6. في تبويب **Users ← Add user**: اكتب بريدك وكلمة مرور قوية
7. من ⚙️ **Project settings ← Your apps ←** أيقونة الويب `</>` ← سجّل التطبيق
8. انسخ القيم الظاهرة (apiKey, authDomain, ...) والصقها في `js/firebase-config.js`، واكتب بريدك في `OWNER_EMAIL`
9. في **Authentication ← Settings ← Authorized domains** أضف دومين موقعك (مثل `mohmd7tawwz7-ui.github.io`)

✅ بعدها لوحة المالك تطلب البريد وكلمة المرور، وكل تعديل يظهر للزوار مباشرة.

💡 نصيحة: قبل الربط، صدّر نسخة احتياطية من اللوحة، وبعد الربط استوردها لنقل كل شيء للسحابة.


---

## 💳 الدفع التلقائي عبر PayPal

1. ادخل **developer.paypal.com** وسجّل بحساب PayPal حقك
2. **Apps & Credentials ← Live ← Create App**
3. انسخ **Client ID** فقط (لا تنسخ Secret أبداً)
4. لوحة المالك ← الإعدادات ← 💳 الدفع ← الصق Client ID واحفظ
5. لكل منتج: أضف **رابط تحميل المنتج** (Google Drive مثلاً، مع خيار "أي شخص لديه الرابط")

بعدها: الزبون يدفع ← الفلوس في PayPal حقك ← رابط التحميل يظهر له فوراً، والطلب يظهر لك في لوحة المالك.

💡 للتجربة بدون فلوس حقيقية: استخدم **Sandbox** بدل Live.

⚠️ PayPal لا يدعم الريال، فالسعر يتحول للدولار حسب "سعر التحويل" في الإعدادات.

🔐 **حماية الملفات:** رابط التحميل محفوظ داخل بيانات المتجر، والشخص الخبير يقدر يوصله بدون دفع.
للحماية الكاملة استخدم **Payhip** (يقبل PayPal ويرسل الملف تلقائياً ويخفيه) وضع رابط منتجك في "رابط صفحة دفع خارجية".
