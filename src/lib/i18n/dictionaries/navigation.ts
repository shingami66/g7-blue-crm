export interface NavigationDictionary {
  account: {
    notifications: string;
    openMenu: string;
    profile: string;
    signOut: string;
    signIn: string;
    signingOut: string;
    title: string;
  };
  app: {
    name: string;
    subtitle: string;
  };
  admin: string;
  menu: {
    open: string;
    close: string;
    mainNavigation: string;
  };
  modules: {
    customers: string;
    dashboard: string;
    invoices: string;
    payments: string;
    quotations: string;
    reports: string;
    services: string;
    settings: string;
    suppliers: string;
    users: string;
  };
}

export const navigationDictionaryEn: NavigationDictionary = {
  account: {
    notifications: "Notifications",
    openMenu: "Open account menu",
    profile: "Profile",
    signOut: "Sign out",
    signIn: "Sign in",
    signingOut: "Signing out...",
    title: "Account",
  },
  app: {
    name: "G7 BLUE CRM",
    subtitle: "Enterprise CRM",
  },
  admin: "Admin",
  menu: {
    open: "Open navigation menu",
    close: "Close navigation menu",
    mainNavigation: "Main navigation",
  },
  modules: {
    customers: "Customers",
    dashboard: "Dashboard",
    invoices: "Invoices",
    payments: "Payments",
    quotations: "Quotations",
    reports: "Reports",
    services: "Services",
    settings: "Settings",
    suppliers: "Suppliers",
    users: "Users",
  },
};

export const navigationDictionaryAr: NavigationDictionary = {
  account: {
    notifications: "الإشعارات",
    openMenu: "فتح قائمة الحساب",
    profile: "الملف الشخصي",
    signOut: "تسجيل الخروج",
    signIn: "تسجيل الدخول",
    signingOut: "جارٍ تسجيل الخروج...",
    title: "الحساب",
  },
  app: {
    name: "G7 BLUE CRM",
    subtitle: "نظام إدارة علاقات المؤسسات",
  },
  admin: "الإدارة",
  menu: {
    open: "فتح قائمة التنقل",
    close: "إغلاق قائمة التنقل",
    mainNavigation: "التنقل الرئيسي",
  },
  modules: {
    customers: "العملاء",
    dashboard: "لوحة التحكم",
    invoices: "الفواتير",
    payments: "المدفوعات",
    quotations: "عروض الأسعار",
    reports: "التقارير",
    services: "الخدمات",
    settings: "الإعدادات",
    suppliers: "الموردون",
    users: "المستخدمون",
  },
};
