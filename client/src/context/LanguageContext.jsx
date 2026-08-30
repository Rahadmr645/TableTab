import React, { createContext, useContext, useState, useEffect } from "react";

const LANGUAGE_KEY = "tabletab_client_lang";

const translations = {
  en: {
    // Navbar
    nav_menu: "Menu",
    nav_about: "About",
    nav_cart: "Cart",
    nav_orders: "My Orders",
    nav_signin: "Sign in",
    nav_profile: "Profile",
    nav_switch_lang: "العربية",
    cart_empty_alert: "Your cart is empty. Add something delicious from the menu.",

    // Menu
    menu_hero_title: "Explore Our Menu",
    menu_hero_tagline: "Freshly prepared food and crafted drinks for your table.",
    menu_search_placeholder: "Search dishes or drinks…",
    menu_category_all: "All",
    menu_add: "Add",
    menu_added: "Added",
    menu_out_of_stock: "Out of stock",
    menu_no_items: "No items found matching your search.",

    // Checkout
    checkout_title: "Your Cart",
    checkout_hero_tagline: "Review items, enter table details, and confirm your order.",
    col_image: "Image",
    col_name: "Name",
    col_qty: "Qty",
    col_price: "Price",
    col_total: "Total",
    checkout_empty: "Your cart is empty. Add something delicious from the menu.",
    subtotal: "Subtotal:",
    place_order_btn: "Place order",
    confirm_dialog_title: "Confirm Your Order",
    confirm_dialog_sub: "Enter your name and table number to place the order directly to the kitchen.",
    summary_items: "Items",
    summary_item_single: "item",
    summary_item_plural: "items",
    summary_total_amt: "Total Amount",
    field_name: "Your Name *",
    field_table: "Table Number (e.g. 5, T-12) *",
    confirm_order_btn: "Confirm Order",
    cancel_btn: "Cancel",
    close_btn: "Close",
    order_placing: "Placing your order…",
    order_placed_success: "Order placed successfully!",
    order_placed_error: "Failed to place order. Please try again.",

    // My Orders
    orders_hero_title: "My Orders",
    orders_hero_tagline: "Track your live orders and view digital receipt slips.",
    todays_order_title: "TODAY'S RESTAURANT ORDER",
    window_prep_label: "WINDOW",
    window_prep_sub: "Time left in the usual prep window (restaurant clock).",
    preview_slip_btn: "Preview slip",
    slip_pdf_badge: "PDF",
    slip_modal_title: "Order Slip Preview",
    slip_generating: "Generating Slip Preview…",
    slip_print_btn: "🖨️ Print Slip",
    slip_print_busy: "Printing…",
    slip_download_btn: "📥 Download PDF Slip",
    slip_download_busy: "Downloading PDF…",
    cancel_order_btn: "Cancel Order / Items",
    cancel_modal_title: "Cancel Order / Items",
    cancel_modal_subtitle: "Choose how many of each item you want to cancel.",
    items_in_order: "Items in your order",
    select_all: "Select All",
    reset: "Reset",
    ordered_label: "Ordered:",
    unit_pc: "pc",
    unit_pcs: "pcs",
    cancelling_label: "Cancelling",
    cancelling_no_items: "No items selected to cancel",
    cancel_reason_label: "Reason for cancellation (optional):",
    cancel_reason_placeholder: "e.g., Decided to change my order, ordered wrong item...",
    keep_order_btn: "Keep My Order",
    confirm_cancel_btn: "Confirm Cancellation",
    cancel_success: "Order cancelled successfully!",
    status_pending: "PENDING",
    status_cooking: "COOKING",
    status_ready: "READY",
    status_finished: "FINISHED",
    status_cancelled: "CANCELLED",
    no_orders_yet: "No orders found yet.",
    no_orders_hint: "Place an order to see it here. Your session is saved after checkout.",

    // Menu stats & comments
    menu_order_review: "Order review",
    menu_no_comments: "No comments yet.",
    menu_no_items_cat: "No items in this category.",
    menu_no_items_yet: "No menu items yet.",
    menu_sold_tooltip: "Times sold after orders are completed",
    menu_likes_tooltip: "Likes from buyers",
    menu_dislikes_tooltip: "Unlikes from buyers",
    menu_rating_tooltip: "Star ratings from completed orders",
    menu_comments_tooltip: "Customer comments & reviews",

    // About
    about_title: "About Us",
    about_tagline: "Crafting exceptional coffee & culinary experiences.",

    // Currency
    currency_sar: "SAR",
  },
  ar: {
    // Navbar
    nav_menu: "القائمة",
    nav_about: "من نحن",
    nav_cart: "السلة",
    nav_orders: "طلباتي",
    nav_signin: "تسجيل الدخول",
    nav_profile: "حسابي",
    nav_switch_lang: "English",
    cart_empty_alert: "سلة مشترياتك فارغة. أضف أطباقاً ومشروبات من القائمة.",

    // Menu
    menu_hero_title: "استكشف قائمتنا",
    menu_hero_tagline: "أطعمة طازجة ومشروبات مميزة محضرة خصيصاً لطاولتك.",
    menu_search_placeholder: "ابحث في الأصناف والمشروبات…",
    menu_category_all: "الكل",
    menu_add: "إضافة",
    menu_added: "تمت الإضافة",
    menu_out_of_stock: "غير متوفر",
    menu_no_items: "لم يتم العثور على أصناف مطابقة لبحثك.",
    menu_order_review: "تقييم الطلب",
    menu_no_comments: "لا توجد تعليقات حتى الآن.",
    menu_no_items_cat: "لا توجد أصناف في هذا القسم.",
    menu_no_items_yet: "لا توجد أصناف في القائمة حالياً.",
    menu_sold_tooltip: "مرات الطلب بعد اكتمال التحضير",
    menu_likes_tooltip: "إعجابات المشترين",
    menu_dislikes_tooltip: "عدم الإعجاب",
    menu_rating_tooltip: "تقييمات النجوم من المشترين",
    menu_comments_tooltip: "التعليقات والتقييمات",

    // Checkout
    checkout_title: "سلة مشترياتك",
    checkout_hero_tagline: "راجع أصنافك، أدخل تفاصيل الطاولة، وأكد طلبك مباشرة.",
    col_image: "الصورة",
    col_name: "الاسم",
    col_qty: "الكمية",
    col_price: "السعر",
    col_total: "الإجمالي",
    checkout_empty: "سلتك فارغة حالياً. أضف أصنافاً لذيذة من القائمة.",
    subtotal: "المجموع الفرعي:",
    place_order_btn: "إتمام الطلب",
    confirm_dialog_title: "تأكيد الطلب",
    confirm_dialog_sub: "أدخل اسمك ورقم الطاولة لإرسال الطلب مباشرة إلى المطبخ.",
    summary_items: "الأصناف",
    summary_item_single: "صنف",
    summary_item_plural: "أصناف",
    summary_total_amt: "المبلغ الإجمالي",
    field_name: "اسمك الكريم *",
    field_table: "رقم الطاولة (مثال: 5، T-12) *",
    confirm_order_btn: "تأكيد الطلب",
    cancel_btn: "إلغاء",
    close_btn: "إغلاق",
    order_placing: "جاري إرسال طلبك…",
    order_placed_success: "تم إرسال طلبك بنجاح!",
    order_placed_error: "تعذر إرسال الطلب. يرجى المحاولة مرة أخرى.",

    // My Orders
    orders_hero_title: "طلباتي",
    orders_hero_tagline: "تابع حالة طلباتك المباشرة واعرض فواتيرك الرقمية.",
    todays_order_title: "رقم الطلب لليوم",
    window_prep_label: "وقت التحضير",
    window_prep_sub: "الوقت المتبقي في نافذة التحضير المعتادة للمطبخ.",
    preview_slip_btn: "معاينة الفاتورة",
    slip_pdf_badge: "PDF",
    slip_modal_title: "معاينة الفاتورة",
    slip_generating: "جاري إنشاء معاينة الفاتورة…",
    slip_print_btn: "🖨️ طباعة الفاتورة",
    slip_print_busy: "جاري الطباعة…",
    slip_download_btn: "📥 تحميل الفاتورة PDF",
    slip_download_busy: "جاري التحميل…",
    cancel_order_btn: "إلغاء الطلب / الأصناف",
    cancel_modal_title: "إلغاء الطلب / الأصناف",
    cancel_modal_subtitle: "اختر الكمية التي ترغب بإلغائها من كل صنف.",
    items_in_order: "الأصناف في طلبك",
    select_all: "تحديد الكل",
    reset: "إعادة ضبط",
    ordered_label: "تم طلب:",
    unit_pc: "قطعة",
    unit_pcs: "قطع",
    cancelling_label: "جاري إلغاء",
    cancelling_no_items: "لم يتم تحديد أي صنف للإلغاء",
    cancel_reason_label: "سبب الإلغاء (اختياري):",
    cancel_reason_placeholder: "مثال: تغيير الطلب، اختيار صنف خاطئ...",
    keep_order_btn: "الاحتفاظ بالطلب",
    confirm_cancel_btn: "تأكيد الإلغاء",
    cancel_success: "تم إلغاء الطلب بنجاح!",
    status_pending: "قيد الانتظار",
    status_cooking: "قيد التحضير",
    status_ready: "جاهز للاستلام",
    status_finished: "مكتمل",
    status_cancelled: "ملغي",
    no_orders_yet: "لا توجد طلبات سابقة على هذا الجهاز.",
    no_orders_hint: "قم بإنشاء طلب لتتمكن من متابعته هنا.",

    // About
    about_title: "من نحن",
    about_tagline: "نقدم لكم أجود أنواع القهوة والمأكولات بتجربة استثنائية.",

    // Currency
    currency_sar: "ر.س",
  },
};

export const CATEGORY_TRANSLATIONS = {
  "All": { en: "All", ar: "الكل" },
  "Hot Drinks": { en: "Hot Drinks", ar: "مشروبات ساخنة" },
  "Cold Drinks": { en: "Cold Drinks", ar: "مشروبات باردة" },
  "Cold Dirinks": { en: "Cold Drinks", ar: "مشروبات باردة" },
  "Tea": { en: "Tea", ar: "شاي" },
  "Arabic Coffee": { en: "Arabic Coffee", ar: "قهوة عربية" },
  "Desserts": { en: "Desserts", ar: "حلويات" },
  "Snacks": { en: "Snacks", ar: "وجبات خفيفة" },
  "Cakes": { en: "Cakes", ar: "كيك" },
  "Others": { en: "Others", ar: "أخرى" },
  "Othres": { en: "Others", ar: "أخرى" },
};

export function translateCategory(category, language) {
  if (!category) return "";
  const canon = String(category).trim();
  const found = CATEGORY_TRANSLATIONS[canon];
  if (found) {
    return language === "ar" ? found.ar : found.en;
  }
  return canon;
}

export const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved === "ar" ? "ar" : "en";
  });

  const isRtl = language === "ar";

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    if (isRtl) {
      document.body.classList.add("rtl");
    } else {
      document.body.classList.remove("rtl");
    }
  }, [language, isRtl]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "ar" : "en"));
  };

  const t = (key, fallback = "") => {
    const dict = translations[language] || translations.en;
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    return translations.en[key] || fallback || key;
  };

  const translateCat = (cat) => translateCategory(cat, language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        isRtl,
        t,
        translateCat,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
