"""One-shot: add P2/PR4 i18n keys to all 12 locale files.

Run: py scripts/add_i18n_keys_pr4.py
"""
import json
from pathlib import Path

I18N_DIR = Path(__file__).parent.parent / "src" / "assets" / "i18n"

# (section, key) -> {lang: translation}
ADDITIONS = {
    ("app", "closeMenu"): {
        "en": "Close menu",
        "ar": "إغلاق القائمة",
        "fa": "بستن منو",
        "ur": "مینو بند کریں",
        "tr": "Menüyü kapat",
        "id": "Tutup menu",
        "bn": "মেনু বন্ধ করুন",
        "es": "Cerrar menú",
        "de": "Menü schließen",
        "ru": "Закрыть меню",
        "fr": "Fermer le menu",
        "zh": "关闭菜单",
    },
    ("app", "breadcrumbAria"): {
        "en": "Breadcrumb",
        "ar": "مسار التنقل",
        "fa": "مسیر ناوبری",
        "ur": "بریڈکرمب",
        "tr": "İçerik haritası",
        "id": "Tautan navigasi",
        "bn": "ব্রেডক্রাম্ব",
        "es": "Ruta de navegación",
        "de": "Brotkrümelnavigation",
        "ru": "Навигационная цепочка",
        "fr": "Fil d'Ariane",
        "zh": "面包屑导航",
    },
    ("app", "mainNavAria"): {
        "en": "Main navigation",
        "ar": "التنقل الرئيسي",
        "fa": "ناوبری اصلی",
        "ur": "مرکزی نیویگیشن",
        "tr": "Ana navigasyon",
        "id": "Navigasi utama",
        "bn": "প্রধান নেভিগেশন",
        "es": "Navegación principal",
        "de": "Hauptnavigation",
        "ru": "Главная навигация",
        "fr": "Navigation principale",
        "zh": "主导航",
    },
    ("book", "toggleDiacritics"): {
        "en": "Toggle diacritics (tashkeel)",
        "ar": "تبديل التشكيل",
        "fa": "تغییر اِعراب",
        "ur": "اعراب چالو/بند کریں",
        "tr": "Hareke göster/gizle",
        "id": "Beralih harakat",
        "bn": "ডায়াক্রিটিক্স টগল",
        "es": "Mostrar/ocultar tashkīl",
        "de": "Tashkīl umschalten",
        "ru": "Переключить огласовки",
        "fr": "Afficher/masquer le tachkîl",
        "zh": "切换符号",
    },
    ("book", "wordByWordAnalysis"): {
        "en": "Word-by-word analysis",
        "ar": "تحليل كلمة بكلمة",
        "fa": "تحلیل کلمه به کلمه",
        "ur": "لفظ بہ لفظ تجزیہ",
        "tr": "Kelime kelime analiz",
        "id": "Analisis kata demi kata",
        "bn": "শব্দ-দ্বারা-শব্দ বিশ্লেষণ",
        "es": "Análisis palabra por palabra",
        "de": "Wort-für-Wort-Analyse",
        "ru": "Пословный анализ",
        "fr": "Analyse mot à mot",
        "zh": "逐字分析",
    },
    ("book", "wordDetails"): {
        "en": "Word details",
        "ar": "تفاصيل الكلمة",
        "fa": "جزئیات کلمه",
        "ur": "لفظ کی تفصیلات",
        "tr": "Kelime ayrıntıları",
        "id": "Detail kata",
        "bn": "শব্দের বিবরণ",
        "es": "Detalles de la palabra",
        "de": "Wort-Details",
        "ru": "Детали слова",
        "fr": "Détails du mot",
        "zh": "单词详情",
    },
    ("book", "wordTranslationLanguage"): {
        "en": "Word translation language",
        "ar": "لغة ترجمة الكلمة",
        "fa": "زبان ترجمه کلمه",
        "ur": "لفظ کی ترجمے کی زبان",
        "tr": "Kelime çeviri dili",
        "id": "Bahasa terjemahan kata",
        "bn": "শব্দ অনুবাদের ভাষা",
        "es": "Idioma de traducción de palabra",
        "de": "Wortübersetzungssprache",
        "ru": "Язык перевода слов",
        "fr": "Langue de traduction du mot",
        "zh": "单词翻译语言",
    },
    ("book", "shuffleQuran"): {
        "en": "Show another verse",
        "ar": "أظهر آية أخرى",
        "fa": "آیه دیگری نشان بده",
        "ur": "دوسری آیت دکھائیں",
        "tr": "Başka bir ayet göster",
        "id": "Tampilkan ayat lain",
        "bn": "অন্য আয়াত দেখান",
        "es": "Mostrar otro versículo",
        "de": "Anderen Vers zeigen",
        "ru": "Показать другой аят",
        "fr": "Afficher un autre verset",
        "zh": "显示另一节",
    },
    ("book", "shuffleHadith"): {
        "en": "Show another hadith",
        "ar": "أظهر حديثاً آخر",
        "fa": "حدیث دیگری نشان بده",
        "ur": "دوسری حدیث دکھائیں",
        "tr": "Başka bir hadis göster",
        "id": "Tampilkan hadis lain",
        "bn": "অন্য হাদিস দেখান",
        "es": "Mostrar otro hadiz",
        "de": "Anderen Hadith zeigen",
        "ru": "Показать другой хадис",
        "fr": "Afficher un autre hadith",
        "zh": "显示另一条圣训",
    },
    ("book", "viewOnThaqalayn"): {
        "en": "View on Thaqalayn",
        "ar": "عرض في ثقلين",
        "fa": "مشاهده در ثقلین",
        "ur": "ثقلین پر دیکھیں",
        "tr": "Thaqalayn'da görüntüle",
        "id": "Lihat di Thaqalayn",
        "bn": "ছাকালাইনে দেখুন",
        "es": "Ver en Thaqalayn",
        "de": "Auf Thaqalayn ansehen",
        "ru": "Открыть на Thaqalayn",
        "fr": "Voir sur Thaqalayn",
        "zh": "在 Thaqalayn 上查看",
    },
    ("book", "surahLabel"): {
        "en": "Surah",
        "ar": "سورة",
        "fa": "سوره",
        "ur": "سورہ",
        "tr": "Sure",
        "id": "Surat",
        "bn": "সূরা",
        "es": "Sura",
        "de": "Sure",
        "ru": "Сура",
        "fr": "Sourate",
        "zh": "章",
    },
    ("book", "ayahLabel"): {
        "en": "Ayah",
        "ar": "آية",
        "fa": "آیه",
        "ur": "آیت",
        "tr": "Ayet",
        "id": "Ayat",
        "bn": "আয়াত",
        "es": "Aleya",
        "de": "Aya",
        "ru": "Аят",
        "fr": "Verset",
        "zh": "节",
    },
    ("annotation", "personalNote"): {
        "en": "Personal note",
        "ar": "ملاحظة شخصية",
        "fa": "یادداشت شخصی",
        "ur": "ذاتی نوٹ",
        "tr": "Kişisel not",
        "id": "Catatan pribadi",
        "bn": "ব্যক্তিগত নোট",
        "es": "Nota personal",
        "de": "Persönliche Notiz",
        "ru": "Личная заметка",
        "fr": "Note personnelle",
        "zh": "个人笔记",
    },
    ("annotation", "writeComment"): {
        "en": "Write a comment",
        "ar": "اكتب تعليقاً",
        "fa": "نوشتن نظر",
        "ur": "تبصرہ لکھیں",
        "tr": "Yorum yaz",
        "id": "Tulis komentar",
        "bn": "একটি মন্তব্য লিখুন",
        "es": "Escribir un comentario",
        "de": "Kommentar schreiben",
        "ru": "Написать комментарий",
        "fr": "Écrire un commentaire",
        "zh": "写评论",
    },
    ("discussion", "scholarVerified"): {
        "en": "Scholar verified",
        "ar": "تم التحقق من قبل عالم",
        "fa": "توسط دانشمند تأیید شده",
        "ur": "عالم کی تصدیق",
        "tr": "Âlim onaylı",
        "id": "Diverifikasi ulama",
        "bn": "পণ্ডিত যাচাইকৃত",
        "es": "Verificado por erudito",
        "de": "Von Gelehrtem verifiziert",
        "ru": "Подтверждено учёным",
        "fr": "Vérifié par un savant",
        "zh": "学者已验证",
    },
    ("common", "close"): {
        "en": "Close",
        "ar": "إغلاق",
        "fa": "بستن",
        "ur": "بند کریں",
        "tr": "Kapat",
        "id": "Tutup",
        "bn": "বন্ধ করুন",
        "es": "Cerrar",
        "de": "Schließen",
        "ru": "Закрыть",
        "fr": "Fermer",
        "zh": "关闭",
    },
}


def main() -> None:
    locales = sorted(p.stem for p in I18N_DIR.glob("*.json"))
    print(f"Found {len(locales)} locales: {locales}")

    for lang in locales:
        path = I18N_DIR / f"{lang}.json"
        with path.open(encoding="utf-8") as f:
            data = json.load(f)

        added = 0
        for (section, key), translations in ADDITIONS.items():
            if section not in data:
                data[section] = {}
            if key in data[section]:
                continue  # don't overwrite existing
            value = translations.get(lang) or translations["en"]
            data[section][key] = value
            added += 1

        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"{lang}.json: +{added} keys")


if __name__ == "__main__":
    main()
