export type SupplierStatus = "active" | "inactive" | "blacklisted";

export interface Supplier {
  id: string;
  name: string;
  service: string;
  contact: string;
  phone: string;
  rating: number;
  status: SupplierStatus;
  recentProject: string;
}
