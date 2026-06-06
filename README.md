# MATGER Web V4

نسخة ويب مبنية بـ Next.js + React + TypeScript + Firebase.

## التشغيل داخل Cursor

1. فك ضغط الملف في Desktop.
2. افتح Cursor.
3. اختر File > Open Folder.
4. اختر مجلد `matger-web-v4` أو اسم المجلد الناتج من فك الضغط.
5. افتح Terminal داخل Cursor.
6. نفذ الأوامر:

```powershell
npm.cmd install
npm.cmd run dev
```

إذا كنت تستخدم Terminal عادي وليس PowerShell:

```bash
npm install
npm run dev
```

رابط المتجر المحلي:

```txt
http://localhost:3000
```

رابط لوحة المدير:

```txt
http://localhost:3000/admin/login
```

## ملف Firebase المطلوب

أنشئ ملفاً باسم `.env.local` بجانب `package.json` وضع داخله بيانات Firebase Web Config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## أهم تعديلات V4

- إصلاح حركة البنرات في RTL باستخدام تمرير مباشر للبنر بدل الحسابات الأفقية.
- زر + في القسم المخصص يفتح نفس القسم فقط عبر `/admin/home?section=...`.
- صفحة إدارة الرئيسية لا تختار أول قسم تلقائياً، بل تنتظر اختيار القسم المطلوب.
- اختيار منتجات الأقسام يحفظ مباشرة.
- تعديل منتجات موجودة يحفظ تلقائياً بعد التوقف عن الكتابة.
- مفاتيح الميزات تحفظ تلقائياً وتكتب أسماء حقول متوافقة مع Android مثل `bannersAutoScrollEnabled` و `bannerSpeedMode` و `productRatings` و `internalChatEnabled`.
- إيقاف الدردشة الداخلية يخفي زر المراسلة في الويب، ويُزامن الحقل الذي يقرأه تطبيق Android.
- دفتر الملاحظات أصبح متعدد الملاحظات مع حفظ تلقائي ونسخة محلية احتياطية.
- الحاسبة أصبحت أكثر تقدماً: أقواس، جذر، قوة، نسبة، سجل محفوظ، وأزرار نسب سريعة.
- الوضع الداكن صار أوضح وأقل سواداً مع إصلاح ألوان الحقول والنصوص.
- إضافة أيقونات PWA في `public/icon-192.png` و `public/icon-512.png` و `manifest.json`.
- إضافة عرض تقييمات المنتج، حفظ التقييمات، وتحديث متوسط التقييم في المنتج.

## ملاحظة مهمة

إذا ظهرت أخطاء `PERMISSION_DENIED` فالمشكلة من Firestore Rules وليست من كود الواجهة غالباً. المسارات المستخدمة هنا متوافقة مع بنية تطبيق Android قدر الإمكان.

## تشغيل محلي على Windows

تم ضبط أوامر التشغيل لاستخدام Webpack بدل Turbopack لأن بعض بيئات Windows تظهر فيها مشكلة native binding مع Turbopack.

```bash
npm install
npm run dev
```

الرابط المحلي:

```text
http://localhost:3000
```

