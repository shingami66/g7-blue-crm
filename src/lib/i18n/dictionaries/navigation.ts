export interface NavigationDictionary {
  account: {
    profile: string;
    signOut: string;
  };
  app: {
    name: string;
  };
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
    profile: "Profile",
    signOut: "Sign out",
  },
  app: {
    name: "G7 BLUE CRM",
  },
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
