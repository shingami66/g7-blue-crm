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
    accounting: string;
    expenses: string;
    advances: string;
    pettyCash: string;
    supplierBills: string;
    supplierPayments: string;
    supplierAdvances: string;
    journalOperations: string;
    bankReconciliation: string;
    periodClose: string;
  };
  sections: {
    customersAndSales: string;
    operations: string;
    suppliersAndProcurement: string;
    billingAndPayments: string;
    expensesAndCosting: string;
    accountsPayable: string;
    accountingOperations: string;
    administration: string;
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
    services: "Events",
    settings: "Settings",
    suppliers: "Suppliers",
    users: "Users",
    expenses: "Expenses",
    advances: "Cash Advances",
    pettyCash: "Petty Cash",
    supplierBills: "Supplier Bills",
    supplierPayments: "Supplier Payments",
    supplierAdvances: "Supplier Advances",
    accounting: "Accounting",
    journalOperations: "Journal Operations",
    bankReconciliation: "Bank Reconciliation",
    periodClose: "Period Close / Lock / Reopen",
  },
  sections: {
    customersAndSales: "Customers & Sales",
    operations: "Operations",
    suppliersAndProcurement: "Suppliers & Procurement",
    billingAndPayments: "Billing & Payments",
    expensesAndCosting: "Expenses & Costing",
    accountsPayable: "Accounts Payable",
    accountingOperations: "Accounting",
    administration: "Administration",
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
    services: "الفعاليات",
    settings: "الإعدادات",
    suppliers: "الموردون",
    users: "المستخدمون",
    expenses: "المصروفات",
    advances: "العهد النقدية",
    pettyCash: "المصروفات النثرية",
    supplierBills: "فواتير الموردين",
    supplierPayments: "مدفوعات الموردين",
    supplierAdvances: "الدفعات المقدمة للموردين",
    accounting: "المحاسبة",
    journalOperations: "عمليات القيود",
    bankReconciliation: "تسوية البنك",
    periodClose: "إقفال / قفل / إعادة فتح الفترة",
  },
  sections: {
    customersAndSales: "العملاء والمبيعات",
    operations: "العمليات",
    suppliersAndProcurement: "الموردون والمشتريات",
    billingAndPayments: "الفواتير والمدفوعات",
    expensesAndCosting: "المصروفات والتكاليف",
    accountsPayable: "حسابات الموردين",
    accountingOperations: "المحاسبة",
    administration: "الإدارة",
  },
};
