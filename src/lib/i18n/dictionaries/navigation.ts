export interface NavigationDictionary {
  account: {
    notifications: string;
    openMenu: string;
    profile: string;
    search: string;
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
  modules: {
    customers: string;
    dashboard: string;
    invoices: string;
    payments: string;
    quotations: string;
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
    search: "Search...",
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
  modules: {
    customers: "Customers",
    dashboard: "Dashboard",
    invoices: "Invoices",
    payments: "Payments",
    quotations: "Quotations",
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
    search: "بحث...",
    signOut: "تسجيل الخروج",
    signIn: "تسجيل الدخول",
    signingOut: "جارٍ تسجيل الخروج...",
    title: "الحساب",
  },
  app: {
    name: "جي 7 بلو CRM",
    subtitle: "نظام إدارة علاقات المؤسسات",
  },
  admin: "الإدارة",
  modules: {
    customers: "العملاء",
    dashboard: "لوحة التحكم",
    invoices: "الفواتير",
    payments: "المدفوعات",
    quotations: "عروض الأسعار",
    services: "الخدمات",
    settings: "الإعدادات",
    suppliers: "الموردون",
    users: "المستخدمون",
  },
};
