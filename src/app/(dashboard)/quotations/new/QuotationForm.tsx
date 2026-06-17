"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { createQuotation, updateQuotation } from "@/lib/quotations/actions";
import type { QuotationDetail } from "@/lib/quotations/types";

interface QuotationFormService {
  id: string;
  serviceNumber: string;
  serviceTitle: string;
  status: string;
  eventName: string | null;
  customer?: { company: string; contact: string };
}

interface QuotationFormProps {
  service: QuotationFormService;
  initialData?: QuotationDetail;
}

export default function QuotationForm({ service, initialData }: QuotationFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize fields with initialData if present
  const [event, setEvent] = useState(initialData?.event || service.eventName || service.serviceTitle);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(initialData?.validUntil || "");
  const [discount, setDiscount] = useState((initialData?.discount || 0).toString());
  
  const [items, setItems] = useState(
    initialData?.items && initialData.items.length > 0 
      ? initialData.items.map(i => ({
          description: i.description,
          details: i.details || "",
          category: i.category || "",
          qty: Number(i.qty),
          unitPrice: Number(i.unitPrice)
        }))
      : [{ description: "", details: "", category: "", qty: 1, unitPrice: 0 }]
  );

  const addItem = () => {
    setItems([...items, { description: "", details: "", category: "", qty: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // CLIENT-SIDE PREVIEW ONLY — PostgreSQL RPC is the source of truth
  const parsedDiscount = parseFloat(discount) || 0;
  const subtotal = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);
  const afterDiscount = Math.max(0, subtotal - parsedDiscount);
  const grandTotal = afterDiscount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validUntil) {
      setError("Please select a valid until date.");
      return;
    }

    if (new Date(validUntil) < new Date(date)) {
      setError("Valid until date must be on or after the quotation date.");
      return;
    }

    const hasInvalidItems = items.some(i => !i.description || i.qty <= 0 || i.unitPrice < 0);
    if (hasInvalidItems) {
      setError("All items must have a description, positive quantity, and non-negative unit price.");
      return;
    }

    setIsSubmitting(true);

    const quotationPayload = {
      event,
      date,
      valid_until: validUntil,
      discount: parsedDiscount,
      items: items.map(i => ({
        description: i.description,
        details: i.details || undefined,
        category: i.category || undefined,
        qty: Number(i.qty),
        unit_price: Number(i.unitPrice)
      }))
    };

    const result = isEdit && initialData
      ? await updateQuotation(initialData.id, quotationPayload)
      : await createQuotation({ service_id: service.id, ...quotationPayload });

    if (result.success) {
      router.push("/quotations");
      router.refresh();
    } else {
      setError(result.error || `Failed to ${isEdit ? "update" : "create"} quotation.`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 py-4">
        <button
          onClick={() => router.back()}
          className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-[28px] leading-[36px] font-semibold text-primary tracking-tight">
            {isEdit ? `Edit Quotation ${initialData?.quotationNumber}` : "New Quotation"}
          </h2>
          <p className="text-on-surface-variant text-[14px]">
            {isEdit ? "Modify draft quotation details." : "Create a new service-scoped quotation."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-error-container text-on-error-container rounded-lg text-[14px]">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">Basic Details</h3>
            
            <div className="grid grid-cols-1 gap-3 text-[14px]">
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider">
                  Service
                </div>
                <div className="font-mono font-semibold text-primary">{service.serviceNumber}</div>
              </div>
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider">
                  Service Title
                </div>
                <div className="font-medium text-on-surface">{service.serviceTitle}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider">
                    Status
                  </div>
                  <div className="font-medium text-on-surface">{service.status}</div>
                </div>
                <div>
                  <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider">
                    Customer
                  </div>
                  <div className="font-medium text-on-surface">
                    {service.customer?.company || "Unknown Customer"}
                    {service.customer?.contact ? ` (${service.customer.contact})` : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Quotation / Event Label</label>
              <input
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="e.g. Annual Tech Conference 2026"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">Dates & Rates</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">Issue Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">Discount (SAR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">Tax/VAT</label>
                <input
                  type="text"
                  value="Not applied"
                  readOnly
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface-variant focus:outline-none cursor-not-allowed"
                  title="G7 BLUE is not VAT registered. Final totals are calculated on the server."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-surface-variant pb-2">
            <h3 className="font-semibold text-primary">Line Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-[14px] text-primary hover:text-primary-container font-semibold transition-colors"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-start p-4 bg-surface-bright border border-surface-variant rounded-lg">
                <div className="flex-1 flex flex-col gap-3">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-6 flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="Service or product name"
                        className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div className="col-span-3 flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Qty</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.qty}
                        onChange={(e) => updateItem(index, "qty", parseFloat(e.target.value) || 0)}
                        className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div className="col-span-3 flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Unit Price (SAR)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-on-surface-variant">Details / Category (Optional)</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={item.details}
                        onChange={(e) => updateItem(index, "details", e.target.value)}
                        placeholder="Additional details..."
                        className="flex-1 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => updateItem(index, "category", e.target.value)}
                        placeholder="Category"
                        className="w-48 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors mt-6 disabled:opacity-50 disabled:hover:text-on-surface-variant disabled:hover:bg-transparent"
                  title={items.length === 1 ? "At least one item is required" : "Remove item"}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[12px] font-mono text-on-surface-variant bg-surface-container-low p-2 rounded border border-outline-variant/50">
            <AlertCircle size={14} className="text-primary" />
            Preview only. Final totals are calculated securely on the server.
          </div>
          
          <div className="flex flex-col items-end gap-2 text-[14px] text-on-surface">
            <div className="flex justify-between w-64">
              <span className="text-on-surface-variant">Subtotal:</span>
              <span>{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</span>
            </div>
            <div className="flex justify-between w-64 text-error">
              <span className="text-on-surface-variant">Discount:</span>
              <span>- {parsedDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</span>
            </div>
            <div className="flex justify-between w-64">
              <span className="text-on-surface-variant">Tax/VAT:</span>
              <span>Not applied</span>
            </div>
            <div className="flex justify-between w-64 pt-2 border-t border-outline-variant font-semibold text-[16px] text-primary">
              <span>Grand Total:</span>
              <span>{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</span>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Quotation"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
