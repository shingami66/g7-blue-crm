export interface CommonDictionary {
  actions: {
    back: string;
    cancel: string;
    close: string;
    create: string;
    edit: string;
    save: string;
  };
  labels: {
    notes: string;
    search: string;
    status: string;
    total: string;
  };
  states: {
    empty: string;
    loading: string;
    unavailable: string;
  };
}

export const commonDictionaryEn: CommonDictionary = {
  actions: {
    back: "Back",
    cancel: "Cancel",
    close: "Close",
    create: "Create",
    edit: "Edit",
    save: "Save",
  },
  labels: {
    notes: "Notes",
    search: "Search",
    status: "Status",
    total: "Total",
  },
  states: {
    empty: "No results",
    loading: "Loading",
    unavailable: "Unavailable",
  },
};
