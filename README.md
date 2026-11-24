# كلمة في سرك

موقع رسائل مجهولة. كل مستخدم يدخل بحساب جوجل، ويعمل لينك أو أكتر (لكل جهة لينك)، وكل لينك له صندوق رسائل خاص. الزائر يكتب رسالة من غير حساب. الموقع بيتثبّت على الموبايل كتطبيق (PWA).

## الملفات
- `index.html`: الموقع كله (الإرسال، الدخول، لوحة الإدارة).
- `config.js`: بيانات مشروع Supabase (الـ URL والـ anon key).
- `supabase/schema.sql`: الجداول وقواعد الأمان، يتشغل مرة واحدة في SQL Editor.
- `manifest.webmanifest` و`sw.js` والأيقونات: تثبيت التطبيق.

## الإعداد
1. أنشئ مشروع في [Supabase](https://supabase.com) وشغّل `supabase/schema.sql` من **SQL Editor**.
2. فعّل **Google** من Authentication ← Providers (بعد إنشاء OAuth client من Google Cloud).
3. في Authentication ← URL Configuration حط رابط الموقع في Site URL وRedirect URLs.
4. حط الـ URL والـ anon key في `config.js`.

مفتاح `service_role` أو الـ secret بتاع جوجل ما يتحطوش في أي ملف هنا أبدًا.

## الأمان
- الزائر ما يقدرش يقرأ أي رسالة: الكتابة بتتم بدالة `send_message` بس، والقراءة لصاحب اللينك فقط (Row Level Security).
- حد أقصى 30 رسالة في الساعة لكل لينك.

© 2026 كلمة في سرك
