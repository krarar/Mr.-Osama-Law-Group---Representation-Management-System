/**
 * إعدادات Firebase المشتركة
 * يتم استخدامها في كل من التطبيق الرئيسي وتطبيق المحامين
 */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDrZmZwSOVhonbLWGrHnctkV4tUcT7UNZM",
  authDomain: "legal-department-dbd28.firebaseapp.com",
  databaseURL: "https://legal-department-dbd28-default-rtdb.firebaseio.com",
  projectId: "legal-department-dbd28",
  storageBucket: "legal-department-dbd28.firebasestorage.app",
  messagingSenderId: "452600951683",
  appId: "1:452600951683:web:2929d22d53a309d947fcb6"
};
// مسارات قاعدة البيانات
const DB_PATHS = {
    CASES: 'cases',
    DEFENDANTS: 'defendants',
    LAWYERS: 'lawyers',
    DEDUCTIONS: 'deductions',
    NOTIFICATIONS: 'notifications',
    CHAT: 'lawyerMessages',  // مسار الدردشة المشترك مع تطبيق المحامين
    UPDATES: 'updates',
    SYSTEM: 'system'
};

// حالات الدعوى
const CASE_STATUSES = {
    DRAFT: 'مسودة',
    FILED: 'مرفوع',
    IN_COURT: 'في المحكمة',
    JUDGMENT: 'صدور حكم',
    EXECUTION: 'تنفيذ',
    CLOSED: 'مغلق'
};

// مستويات الأولوية
const PRIORITIES = {
    NORMAL: 'عادية',
    IMPORTANT: 'مهمة',
    URGENT: 'عاجلة',
    EMERGENCY: 'طارئة'
};

// تصدير الإعدادات
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, DB_PATHS, CASE_STATUSES, PRIORITIES };
}
