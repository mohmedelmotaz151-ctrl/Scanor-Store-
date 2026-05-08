import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const translations: Translations = {
  // Common
  'store': { ar: 'سكانور STORE.', en: 'Scanor STORE.' },
  'logout': { ar: 'تسجيل خروج', en: 'Logout' },
  'track_order': { ar: 'تتبع طلبك', en: 'Track Order' },
  'download': { ar: 'تحميل التطبيق', en: 'Download App' },
  'login': { ar: 'تسجيل دخول', en: 'Login' },
  'home': { ar: 'الرئيسية', en: 'Home' },
  
  // Hero
  'hero_badge': { ar: 'شحن فوري وتلقائي', en: 'Instant & Automatic Top-up' },
  'hero_desc': { ar: 'المتجر الأسرع لشحن شدات ببجي موبايل. أسعارنا تعتمد على السعر الرسمي مضافاً إليه 2% فقط كأرباح شخصية لضمان أقل سعر في السوق.', en: 'The fastest store for PUBG Mobile UC. Our prices are based on official rates plus only 2% profit, ensuring the lowest market price.' },
  'charge_now': { ar: 'اشحن الآن', en: 'Charge Now' },
  
  // Features
  'feat_auto_title': { ar: 'شحن تلقائي', en: 'Automatic Top-up' },
  'feat_auto_desc': { ar: 'يتم شحن حسابك مباشرة بعد الدفع الناجح دون انتظار.', en: 'Your account is topped up immediately after successful payment.' },
  'feat_safe_title': { ar: 'دفع آمن', en: 'Secure Payment' },
  'feat_safe_desc': { ar: 'دعم كامل لمدى، أبل باي، وبطاقات الفيزا والماستر كارد.', en: 'Full support for Mada, Apple Pay, Visa, and Mastercard.' },
  'feat_price_title': { ar: 'أفضل سعر', en: 'Best Price' },
  'feat_price_desc': { ar: 'أقل عمولة في السوق (2% فقط) مقارنة بالمتجر الرسمي.', en: 'Lowest commission in the market (2% only) compared to the official store.' },
  
  // Packages
  'packages_title': { ar: 'باقات الشدات المتاحة', en: 'Available UC Packages' },
  'packages_subtitle': { ar: 'أفضل العروض والأسعار المحدثة دورياً', en: 'Best offers and periodically updated prices' },
  'select_currency': { ar: 'اختيار عملة الدفع', en: 'Select Payment Currency' },
  'sar': { ar: 'ريال سعودي', en: 'Saudi Riyal' },
  'sdg': { ar: 'جنيه سوداني', en: 'Sudanese Pound' },
  'uc_unit': { ar: 'شدة', en: 'UC' },
  
  // Checkout
  'checkout_details': { ar: 'بيانات الشحن', en: 'Shipping Details' },
  'checkout_transfer': { ar: 'إتمام التحويل', en: 'Complete Transfer' },
  'player_id': { ar: 'معرف اللاعب (Player ID)', en: 'Player ID' },
  'player_id_placeholder': { ar: 'مثال: 512345678', en: 'Example: 512345678' },
  'phone': { ar: 'رقم الجوال', en: 'Phone Number' },
  'email_opt': { ar: 'البريد الإلكتروني (اختياري)', en: 'Email (Optional)' },
  'continue_transfer': { ar: 'استمرار لإتمام التحويل', en: 'Continue to Transfer' },
  
  // Transfer
  'transfer_msg': { ar: 'يرجي تحويل قيمة اليوسي الي رقم الحساب بالاسفل', en: 'Please transfer the UC value to the account number below' },
  'transfer_verify': { ar: 'يرجى التأكد من تحويل المبلغ المطلوب بدقة', en: 'Please ensure you transfer the exact amount requested' },
  'total_amount': { ar: 'إجمالي المبلغ', en: 'Total Amount' },
  'payment_method': { ar: 'وسيلة الدفع المتوفرة', en: 'Available Payment Method' },
  'bok': { ar: 'بنك الخرطوم', en: 'Bank of Khartoum' },
  'rajhi': { ar: 'مصرف الراجحي', en: 'Al Rajhi Bank' },
  'acc_num': { ar: 'رقم الحساب', en: 'Account Number' },
  'beneficiary': { ar: 'اسم المستفيد', en: 'Beneficiary Name' },
  'attach_receipt': { ar: 'إرفاق إشعار التحويل', en: 'Attach Transfer Receipt' },
  'receipt_selected': { ar: 'تم اختيار الإيصال ✓', en: 'Receipt Selected ✓' },
  'click_attach': { ar: 'اضغط هنا لإرفاق الإشعار', en: 'Click here to attach receipt' },
  'send_receipt': { ar: 'إرسال الإشعار وتأكيد الطلب', en: 'Send Receipt & Confirm Order' },
  'sending': { ar: 'جاري الإرسال...', en: 'Sending...' },
  'edit_prev': { ar: 'تعديل البيانات السابقة', en: 'Edit Previous Data' },
  
  // Success
  'order_success_title': { ar: 'تم الطلب بنجاح!', en: 'Order Successful!' },
  'order_success_msg': { ar: 'تم استلام طلبك بنجاح. سيتم شحن الـ UC إلى المعرف خلال دقائق.', en: 'Your order has been received successfully. UC will be topped up to the ID within minutes.' },
  'track_order_btn': { ar: 'تتبع حالة الطلب الآن', en: 'Track Order Status Now' },
  'back_to_store': { ar: 'العودة للمتجر', en: 'Back to Store' },

  // Track Order Page
  'track_order_title': { ar: 'تتبع طلبك', en: 'Track Your Order' },
  'track_order_desc': { ar: 'أدخل رقم الطلب الخاص بك لمتابعة حالة الشحن في الوقت الفعلي. ستجد رقم الطلب في فاتورتك أو بريدك الإلكتروني.', en: 'Enter your order number to follow the shipping status in real-time. You will find the order number in your receipt or email.' },
  'order_id_label': { ar: 'رقم الطلب', en: 'Order ID' },
  'order_id_placeholder': { ar: 'مثال: ORD-123-XYZ', en: 'e.g., ORD-123-XYZ' },
  'track_now_btn': { ar: 'تتبع الآن', en: 'Track Now' },
  'order_not_found': { ar: 'لم يتم العثور على الطلب. يرجى التأكد من رقم الطلب.', en: 'Order not found. Please check the order number.' },
  'order_fetch_error': { ar: 'حدث خطأ أثناء جلب بيانات الطلب. يرجى المحاولة لاحقاً.', en: 'An error occurred while fetching order data. Please try again later.' },
  'current_status': { ar: 'الحالة الحالية', en: 'Current Status' },
  'order_date': { ar: 'تاريخ الطلب', en: 'Order Date' },
  'payment_method_label': { ar: 'وسيلة الدفع', en: 'Payment Method' },
  'total_label': { ar: 'الإجمالي', en: 'Total' },
  'status_pending_payment': { ar: 'بانتظار الدفع', en: 'Pending Payment' },
  'status_pending_verification': { ar: 'بانتظار التأكيد', en: 'Pending Verification' },
  'status_processing': { ar: 'جاري الشحن', en: 'Processing' },
  'status_completed': { ar: 'مكتمل', en: 'Completed' },
  'status_failed': { ar: 'فشل', en: 'Failed' },
  'step_paid': { ar: 'تم الدفع', en: 'Paid' },
  'step_processing': { ar: 'جاري المعالجة', en: 'Processing' },
  'step_delivered': { ar: 'تم التسليم', en: 'Delivered' },

  // Auth Page
  'login_title': { ar: 'تسجيل الدخول', en: 'Login' },
  'signup_title': { ar: 'إنشاء حساب', en: 'Sign Up' },
  'reset_title': { ar: 'استعادة كلمة المرور', en: 'Reset Password' },
  'login_subtitle': { ar: 'مرحباً بك في سكانور ستور', en: 'Welcome to Scanor Store' },
  'signup_subtitle': { ar: 'انضم إلى مجتمع اللاعبين المتميزين', en: 'Join the distinguished gamers community' },
  'email_method': { ar: 'البريد الإلكتروني', en: 'Email' },
  'phone_method': { ar: 'رقم الهاتف', en: 'Phone Number' },
  'email_label': { ar: 'البريد الإلكتروني', en: 'Email' },
  'password_label': { ar: 'كلمة المرور', en: 'Password' },
  'forgot_password': { ar: 'نسيت كلمة المرور؟', en: 'Forgot Password?' },
  'login_btn': { ar: 'دخول', en: 'Login' },
  'signup_btn': { ar: 'إنشاء حساب', en: 'Sign Up' },
  'reset_btn': { ar: 'إرسال رابط الاستعادة', en: 'Send Reset Link' },
  'otp_label': { ar: 'رمز التحقق (OTP)', en: 'Verification Code (OTP)' },
  'send_code_btn': { ar: 'إرسال الرمز', en: 'Send Code' },
  'verify_btn': { ar: 'تحقق وتأكيد', en: 'Verify & Confirm' },
  'social_login': { ar: 'أو عبر المنصات الاجتماعية', en: 'Or via social platforms' },
  'no_account': { ar: 'ليس لديك حساب؟', en: "Don't have an account?" },
  'create_account': { ar: 'إنشاء حساب جديد', en: 'Create new account' },
  'have_account': { ar: 'لديك حساب بالفعل؟', en: 'Already have an account?' },
  'login_link': { ar: 'تسجيل الدخول', en: 'Login' },
  'welcome_to': { ar: 'مرحباً بك في', en: 'Welcome to' },
  'login_intro': { ar: 'أفضل متجر لشحن الألعاب والخدمات الرقمية', en: 'The best store for game top-ups and digital services' },
  'full_name_label': { ar: 'الاسم الكامل', en: 'Full Name' },
  'username_label': { ar: 'اسم المستخدم', en: 'Username' },
  'phone_placeholder': { ar: '0000 000 50 966+', en: '+966 50 000 0000' },
  'logging_in': { ar: 'جاري تسجيل الدخول...', en: 'Logging in...' },
  'signing_up': { ar: 'جاري إنشاء الحساب...', en: 'Signing up...' },
  'edit_profile': { ar: 'تعديل الملف الشخصي', en: 'Edit Profile' },
  'update_profile': { ar: 'تحديث البيانات', en: 'Update Profile' },
  'welcome_title': { ar: 'مرحباً بك في عالم الشحن', en: 'Welcome to the Top-up World' },
  'welcome_subtitle': { ar: 'أسرع وآمن متجر لشحن الألعاب والخدمات الرقمية في الشرق الأوسط', en: 'The fastest and most secure store for games and digital services in the Middle East' },
  'get_started_btn': { ar: 'ابدأ الآن', en: 'Get Started' },
  'continue_guest': { ar: 'المتابعة كزائر', en: 'Continue as Guest' },
  'notifications': { ar: 'الإشعارات', en: 'Notifications' },
  'username_updated': { ar: 'تم تحديث اسم المستخدم بنجاح!', en: 'Username updated successfully!' },
  'profile_subtitle': { ar: 'تحكم في بيانات حسابك', en: 'Manage your account data' },
  'splash_tagline': { ar: 'البوابة الأسرع لشحن ألعابك', en: 'The fastest gateway to top-up your games' },
  'remember_me': { ar: 'تذكرني', en: 'Remember me' },
  'admin_panel': { ar: 'لوحة الإدارة', en: 'Admin Panel' },
  'auth_success_msg': { ar: 'تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني.', en: 'Account created successfully! Please check your email.' },
  'reset_success_msg': { ar: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.', en: 'Password reset link sent to your email.' },
  'otp_success_msg': { ar: 'تم إرسال رمز التحقق.', en: 'Verification code sent.' },
  'auth_error_user_not_found': { ar: 'الحساب غير موجود.', en: 'Account not found.' },
  'auth_error_wrong_password': { ar: 'كلمة المرور غير صحيحة.', en: 'Incorrect password.' },
  'auth_error_email_in_use': { ar: 'البريد الإلكتروني مستخدم بالفعل.', en: 'Email already in use.' },
  'auth_error_weak_password': { ar: 'كلمة المرور ضعيفة جداً.', en: 'Weak password.' },
  'auth_error_invalid_email': { ar: 'بريد إلكتروني غير صالح.', en: 'Invalid email.' },
  'auth_error_invalid_phone': { ar: 'رقم هاتف غير صالح.', en: 'Invalid phone number.' },
  'auth_error_too_many_requests': { ar: 'محاولات كثيرة جداً. يرجى المحاولة لاحقاً.', en: 'Too many requests. Please try again later.' },
  'auth_error_code_expired': { ar: 'انتهت صلاحية الرمز.', en: 'Code expired.' },
  'auth_error_default': { ar: 'حدث خطأ ما. يرجى المحاولة لاحقاً.', en: 'An error occurred. Please try again later.' },

  // User Drawer & Wallet
  'wallet': { ar: 'المحفظة', en: 'Wallet' },
  'transactions': { ar: 'العمليات', en: 'Transactions' },
  'cart': { ar: 'السلة', en: 'Cart' },
  'current_orders': { ar: 'الطلبات الحالية', en: 'Current Orders' },
  'previous_orders': { ar: 'الطلبات السابقة', en: 'Previous Orders' },
  'charge_wallet': { ar: 'شحن المحفظة', en: 'Charge Wallet' },
  'balance_label': { ar: 'رصيد المحفظة', en: 'Wallet Balance' },
  'bok_account': { ar: 'بنك الخرطوم', en: 'Bank of Khartoum' },
  'rajhi_account': { ar: 'مصرف الراجحي', en: 'Al Rajhi Bank' },
  'account_name': { ar: 'اسم الحساب', en: 'Account Name' },
  'account_number': { ar: 'رقم الحساب', en: 'Account Number' },
  'iban': { ar: 'رقم الآيبان', en: 'IBAN' },
  'amount_to_charge': { ar: 'المبلغ المراد شحنه', en: 'Amount to Charge' },
  'receipt_image': { ar: 'صورة الإيصال', en: 'Receipt Image' },
  'send_request': { ar: 'إرسال الطلب', en: 'Send Request' },
  'charge_success': { ar: 'تم إرسال طلب الشحن بنجاح!', en: 'Charge request sent successfully!' },
  'charge_error': { ar: 'حدث خطأ أثناء إرسال الطلب.', en: 'Error sending request.' },
  'status_pending': { ar: 'قيد المراجعة', en: 'Pending' },
  'status_approved': { ar: 'مكتمل', en: 'Approved' },
  'status_rejected': { ar: 'مرفوض', en: 'Rejected' },
  'no_activities': { ar: 'لا توجد عمليات سابقة', en: 'No previous activities' },
  'no_orders': { ar: 'لا توجد طلبات حالياً', en: 'No current orders' },

  // WhatsApp Message
  'biometric_login': { ar: 'الدخول بالبصمة / الوجه', en: 'Biometric / Face ID Login' },
  'biometric_not_supported': { ar: 'البصمة غير مدعومة في هذا المتصفح', en: 'Biometric login not supported in this browser' },
  'wa_msg_title': { ar: 'طلب شحن جديد (دفع يدوي)', en: 'New Recharge Request (Manual Payment)' },
  'wa_msg_order_id': { ar: 'رقم الطلب', en: 'Order ID' },
  'wa_msg_player': { ar: 'اللاعب', en: 'Player' },
  'wa_msg_package': { ar: 'الباقة', en: 'Package' },
  'wa_msg_amount': { ar: 'المبلغ', en: 'Amount' },
  'wa_msg_method': { ar: 'الوسيلة', en: 'Method' },
  'wa_msg_receipt': { ar: 'إشعار التحويل', en: 'Transfer Receipt' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
