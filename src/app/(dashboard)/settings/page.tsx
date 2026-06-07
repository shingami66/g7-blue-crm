"use client";

import PageHeader from "@/components/ui/PageHeader";
import { Upload, Building2, Gavel, Landmark, Settings2, Edit, Plus } from "lucide-react";
import { settingsData } from "@/lib/data/settings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Company Settings"
        subtitle="Manage your organization's core details and preferences."
      >
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors">
          <Upload size={18} />
          Save Changes
        </button>
      </PageHeader>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Company Profile Card */}
          <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
              <Building2 size={20} className="text-surface-tint" />
              <h3 className="text-[20px] font-semibold text-primary">Company Profile</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-8 items-start">
                {/* Logo Upload */}
                <div className="flex-shrink-0 flex flex-col items-center gap-3">
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary-fixed/20 transition-colors relative group overflow-hidden">
                    <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col items-center justify-center text-white">
                      <Upload size={24} className="mb-1" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Change</span>
                    </div>
                    <div className="text-[32px] font-bold text-primary">G7</div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant text-center">
                    PNG, JPG up to 2MB<br />Min 256x256px
                  </p>
                </div>

                {/* Form Fields */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-semibold tracking-wider text-on-surface uppercase mb-1">Company Name</label>
                    <input type="text" defaultValue={settingsData.company.name} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-[14px] focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold tracking-wider text-on-surface uppercase mb-1">Primary Email</label>
                    <input type="email" defaultValue={settingsData.company.email} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-[14px] focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold tracking-wider text-on-surface uppercase mb-1">Phone Number</label>
                    <input type="tel" defaultValue={settingsData.company.phone} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-[14px] focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-semibold tracking-wider text-on-surface uppercase mb-1">Address</label>
                    <textarea defaultValue={settingsData.company.address} rows={2} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-[14px] focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Legal Info */}
            <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
                <Gavel size={20} className="text-surface-tint" />
                <h3 className="text-[20px] font-semibold text-primary">Legal Information</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold tracking-wider text-on-surface uppercase mb-1">Commercial Registration (CR)</label>
                  <input type="text" defaultValue={settingsData.legal.cr} className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-mono text-[14px] outline-none" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold tracking-wider text-on-surface uppercase mb-1">VAT Number</label>
                  <input type="text" defaultValue={settingsData.legal.vat} className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-mono text-[14px] outline-none" readOnly />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark size={20} className="text-surface-tint" />
                  <h3 className="text-[20px] font-semibold text-primary">Bank Details</h3>
                </div>
                <button className="text-primary hover:text-primary-container"><Plus size={20} /></button>
              </div>
              <div className="p-6">
                <div className="p-4 border border-outline-variant rounded-lg bg-surface flex flex-col gap-1 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-surface-tint"></div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[12px] font-semibold text-on-surface-variant uppercase">{settingsData.bank.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-fixed text-primary-container uppercase tracking-wider">Primary</span>
                  </div>
                  <p className="text-[14px] text-on-surface font-mono tracking-tight">{settingsData.bank.iban}</p>
                  <p className="text-[12px] text-on-surface-variant">{settingsData.bank.accountName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Finance Settings */}
          <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
              <Settings2 size={20} className="text-surface-tint" />
              <h3 className="text-[20px] font-semibold text-primary">Finance Settings</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold tracking-wider text-on-surface uppercase mb-1">Currency</label>
                  <select className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-[14px] outline-none">
                    <option value="SAR" selected>SAR - Saudi Riyal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold tracking-wider text-on-surface uppercase mb-1">Standard VAT %</label>
                  <input type="number" defaultValue={settingsData.finance.vatPercent} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-[14px] outline-none" />
                </div>
              </div>
              <hr className="border-surface-variant" />
              <div>
                <label className="block text-[12px] font-semibold tracking-wider text-on-surface uppercase mb-1">Default Terms & Conditions</label>
                <textarea rows={4} defaultValue={settingsData.finance.terms} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-[12px] leading-relaxed outline-none focus:border-primary resize-none"></textarea>
              </div>
            </div>
          </div>

          {/* Document Templates */}
          <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden flex-1">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
              <Edit size={20} className="text-surface-tint" />
              <h3 className="text-[20px] font-semibold text-primary">Document Templates</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
               {/* Quotation Preview */}
               <div className="flex flex-col gap-2 group cursor-pointer">
                <div className="aspect-[1/1.4] bg-surface border border-outline-variant rounded overflow-hidden relative shadow-sm group-hover:border-primary transition-all">
                  <div className="absolute top-2 left-2 right-2 h-3 bg-outline-variant/30 rounded-sm"></div>
                  <div className="absolute top-6 left-2 w-1/3 h-6 bg-primary/10 rounded-sm"></div>
                  <div className="absolute top-14 left-2 right-2 h-1 bg-outline-variant/20 rounded-sm"></div>
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 flex items-center justify-center transition-colors"></div>
                </div>
                <span className="text-[12px] font-semibold text-center text-on-surface-variant group-hover:text-primary transition-colors">Quotation Standard</span>
              </div>
              {/* Invoice Preview */}
              <div className="flex flex-col gap-2 group cursor-pointer">
                <div className="aspect-[1/1.4] bg-surface border border-outline-variant rounded overflow-hidden relative shadow-sm group-hover:border-primary transition-all">
                  <div className="absolute top-2 left-2 right-2 h-3 bg-surface-tint/20 rounded-sm"></div>
                  <div className="absolute top-6 right-2 w-1/3 h-6 bg-surface-tint/10 rounded-sm"></div>
                  <div className="absolute top-14 left-2 right-2 h-1 bg-outline-variant/20 rounded-sm"></div>
                  <div className="absolute bottom-2 right-2 w-1/2 h-6 bg-primary/10 rounded-sm"></div>
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 flex items-center justify-center transition-colors"></div>
                </div>
                <span className="text-[12px] font-semibold text-center text-on-surface-variant group-hover:text-primary transition-colors">Tax Invoice (ZATCA)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
