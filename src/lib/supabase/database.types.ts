export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounting_account_versions: {
        Row: {
          account_code: string
          account_id: string
          account_kind: string
          account_type: string
          category: string
          control_classification: string
          created_at: string
          created_by: string
          effective_from: string
          evidence_ref: string | null
          foundation_event_id: string
          is_active: boolean
          is_protected: boolean
          name_ar: string
          name_en: string
          normal_balance: string
          parent_account_id: string | null
          previous_version: number | null
          profile_id: string
          reason: string
          version: number
        }
        Insert: {
          account_code: string
          account_id: string
          account_kind: string
          account_type: string
          category: string
          control_classification?: string
          created_at?: string
          created_by: string
          effective_from: string
          evidence_ref?: string | null
          foundation_event_id: string
          is_active: boolean
          is_protected?: boolean
          name_ar: string
          name_en: string
          normal_balance: string
          parent_account_id?: string | null
          previous_version?: number | null
          profile_id: string
          reason: string
          version: number
        }
        Update: {
          account_code?: string
          account_id?: string
          account_kind?: string
          account_type?: string
          category?: string
          control_classification?: string
          created_at?: string
          created_by?: string
          effective_from?: string
          evidence_ref?: string | null
          foundation_event_id?: string
          is_active?: boolean
          is_protected?: boolean
          name_ar?: string
          name_en?: string
          normal_balance?: string
          parent_account_id?: string | null
          previous_version?: number | null
          profile_id?: string
          reason?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_account_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_account_versions_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_account_versions_identity_fkey"
            columns: ["profile_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_account_versions_parent_fkey"
            columns: ["profile_id", "parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_account_versions_previous_fkey"
            columns: ["profile_id", "account_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
        ]
      }
      accounting_accounts: {
        Row: {
          created_at: string
          current_version: number
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_accounts_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_ap_bridge_event_versions: {
        Row: {
          accounting_date: string | null
          advance_id: string | null
          amount_halalah: number
          bill_id: string | null
          cash_account_id: string | null
          cash_account_version: number | null
          cash_binding_evidence_ref: string | null
          cash_binding_evidence_sha256: string | null
          classification: string
          created_at: string
          created_by: string
          direct_classification: string | null
          event_id: string
          evidence_ref: string | null
          evidence_sha256: string | null
          foundation_event_id: string
          held_code: string | null
          matched_receipt_halalah: number
          payload_fingerprint: string
          previous_version: number | null
          profile_id: string
          reason: string
          receipt_id: string | null
          service_id: string | null
          source_business_date: string | null
          source_occurred_at: string | null
          source_recorded_at: string
          source_snapshot: Json
          source_snapshot_sha256: string
          status: string
          supplier_id: string
          version: number
        }
        Insert: {
          accounting_date?: string | null
          advance_id?: string | null
          amount_halalah: number
          bill_id?: string | null
          cash_account_id?: string | null
          cash_account_version?: number | null
          cash_binding_evidence_ref?: string | null
          cash_binding_evidence_sha256?: string | null
          classification: string
          created_at?: string
          created_by: string
          direct_classification?: string | null
          event_id: string
          evidence_ref?: string | null
          evidence_sha256?: string | null
          foundation_event_id: string
          held_code?: string | null
          matched_receipt_halalah?: number
          payload_fingerprint: string
          previous_version?: number | null
          profile_id: string
          reason: string
          receipt_id?: string | null
          service_id?: string | null
          source_business_date?: string | null
          source_occurred_at?: string | null
          source_recorded_at: string
          source_snapshot: Json
          source_snapshot_sha256: string
          status: string
          supplier_id: string
          version: number
        }
        Update: {
          accounting_date?: string | null
          advance_id?: string | null
          amount_halalah?: number
          bill_id?: string | null
          cash_account_id?: string | null
          cash_account_version?: number | null
          cash_binding_evidence_ref?: string | null
          cash_binding_evidence_sha256?: string | null
          classification?: string
          created_at?: string
          created_by?: string
          direct_classification?: string | null
          event_id?: string
          evidence_ref?: string | null
          evidence_sha256?: string | null
          foundation_event_id?: string
          held_code?: string | null
          matched_receipt_halalah?: number
          payload_fingerprint?: string
          previous_version?: number | null
          profile_id?: string
          reason?: string
          receipt_id?: string | null
          service_id?: string | null
          source_business_date?: string | null
          source_occurred_at?: string | null
          source_recorded_at?: string
          source_snapshot?: Json
          source_snapshot_sha256?: string
          status?: string
          supplier_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ap_bridge_event_ve_profile_id_cash_account_id_c_fkey"
            columns: ["profile_id", "cash_account_id", "cash_account_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_ve_profile_id_event_id_previous_fkey"
            columns: ["profile_id", "event_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_ap_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_versions_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_balances"
            referencedColumns: ["supplier_advance_id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_versions_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_versions_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bill_payment_balances"
            referencedColumns: ["supplier_bill_id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_versions_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_versions_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_versions_profile_id_event_id_fkey"
            columns: ["profile_id", "event_id"]
            isOneToOne: false
            referencedRelation: "accounting_ap_bridge_events"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_versions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "service_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_versions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_event_versions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_ap_bridge_events: {
        Row: {
          created_at: string
          current_version: number
          economic_event_key: string
          id: string
          profile_id: string
          source_record_id: string
          source_record_key: string
          source_type: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          economic_event_key: string
          id?: string
          profile_id: string
          source_record_id: string
          source_record_key: string
          source_type: string
        }
        Update: {
          created_at?: string
          current_version?: number
          economic_event_key?: string
          id?: string
          profile_id?: string
          source_record_id?: string
          source_record_key?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ap_bridge_events_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_ap_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_ap_bridge_journal_lines: {
        Row: {
          account_id: string
          account_version: number
          advance_id: string | null
          amount_halalah: number
          bill_id: string | null
          created_at: string
          event_id: string
          event_version: number
          journal_id: string
          journal_version: number
          line_number: number
          party_role: string
          profile_id: string
          receipt_id: string | null
          service_id: string | null
          side: string
          source_record_id: string
          source_type: string
          supplier_id: string
        }
        Insert: {
          account_id: string
          account_version: number
          advance_id?: string | null
          amount_halalah: number
          bill_id?: string | null
          created_at?: string
          event_id: string
          event_version: number
          journal_id: string
          journal_version: number
          line_number: number
          party_role: string
          profile_id: string
          receipt_id?: string | null
          service_id?: string | null
          side: string
          source_record_id: string
          source_type: string
          supplier_id: string
        }
        Update: {
          account_id?: string
          account_version?: number
          advance_id?: string | null
          amount_halalah?: number
          bill_id?: string | null
          created_at?: string
          event_id?: string
          event_version?: number
          journal_id?: string
          journal_version?: number
          line_number?: number
          party_role?: string
          profile_id?: string
          receipt_id?: string | null
          service_id?: string | null
          side?: string
          source_record_id?: string
          source_type?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ap_bridge_journal__profile_id_account_id_accoun_fkey"
            columns: ["profile_id", "account_id", "account_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal__profile_id_journal_id_journa_fkey"
            columns: [
              "profile_id",
              "journal_id",
              "journal_version",
              "line_number",
            ]
            isOneToOne: false
            referencedRelation: "accounting_journal_line_versions"
            referencedColumns: [
              "profile_id",
              "journal_id",
              "journal_version",
              "line_number",
            ]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_lines_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_balances"
            referencedColumns: ["supplier_advance_id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_lines_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bill_payment_balances"
            referencedColumns: ["supplier_bill_id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "service_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_lines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_profile_id_event_id_event_ve_fkey1"
            columns: ["profile_id", "event_id", "event_version"]
            isOneToOne: false
            referencedRelation: "accounting_ap_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
        ]
      }
      accounting_ap_bridge_journal_links: {
        Row: {
          advance_id: string | null
          bill_id: string | null
          created_at: string
          event_id: string
          event_version: number
          journal_id: string
          prepared_version: number
          profile_id: string
          receipt_id: string | null
          service_id: string | null
          source_effect_id: string
          source_record_id: string
          source_type: string
          supplier_id: string
        }
        Insert: {
          advance_id?: string | null
          bill_id?: string | null
          created_at?: string
          event_id: string
          event_version: number
          journal_id: string
          prepared_version: number
          profile_id: string
          receipt_id?: string | null
          service_id?: string | null
          source_effect_id: string
          source_record_id: string
          source_type: string
          supplier_id: string
        }
        Update: {
          advance_id?: string | null
          bill_id?: string | null
          created_at?: string
          event_id?: string
          event_version?: number
          journal_id?: string
          prepared_version?: number
          profile_id?: string
          receipt_id?: string | null
          service_id?: string | null
          source_effect_id?: string
          source_record_id?: string
          source_type?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ap_bridge_journal__profile_id_event_id_event_ve_fkey"
            columns: ["profile_id", "event_id", "event_version"]
            isOneToOne: true
            referencedRelation: "accounting_ap_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal__profile_id_journal_id_prepar_fkey"
            columns: ["profile_id", "journal_id", "prepared_version"]
            isOneToOne: true
            referencedRelation: "accounting_journal_versions"
            referencedColumns: ["profile_id", "journal_id", "version"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_links_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_balances"
            referencedColumns: ["supplier_advance_id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_links_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_links_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bill_payment_balances"
            referencedColumns: ["supplier_bill_id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_links_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_links_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "service_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_links_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_links_source_effect_id_fkey"
            columns: ["source_effect_id"]
            isOneToOne: false
            referencedRelation: "accounting_source_effects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bridge_journal_links_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_ar_bridge_event_versions: {
        Row: {
          accounting_date: string | null
          amount_halalah: number
          classification: string
          created_at: string
          created_by: string
          customer_id: string
          event_id: string
          evidence_ref: string | null
          evidence_sha256: string | null
          foundation_event_id: string
          held_code: string | null
          invoice_id: string | null
          payload_fingerprint: string
          previous_version: number | null
          profile_id: string
          reason: string
          service_id: string | null
          source_business_date: string | null
          source_occurred_at: string | null
          source_recorded_at: string
          source_snapshot: Json
          source_snapshot_sha256: string
          status: string
          version: number
        }
        Insert: {
          accounting_date?: string | null
          amount_halalah: number
          classification: string
          created_at?: string
          created_by: string
          customer_id: string
          event_id: string
          evidence_ref?: string | null
          evidence_sha256?: string | null
          foundation_event_id: string
          held_code?: string | null
          invoice_id?: string | null
          payload_fingerprint: string
          previous_version?: number | null
          profile_id: string
          reason: string
          service_id?: string | null
          source_business_date?: string | null
          source_occurred_at?: string | null
          source_recorded_at: string
          source_snapshot: Json
          source_snapshot_sha256: string
          status: string
          version: number
        }
        Update: {
          accounting_date?: string | null
          amount_halalah?: number
          classification?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          event_id?: string
          evidence_ref?: string | null
          evidence_sha256?: string | null
          foundation_event_id?: string
          held_code?: string | null
          invoice_id?: string | null
          payload_fingerprint?: string
          previous_version?: number | null
          profile_id?: string
          reason?: string
          service_id?: string | null
          source_business_date?: string | null
          source_occurred_at?: string | null
          source_recorded_at?: string
          source_snapshot?: Json
          source_snapshot_sha256?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ar_bridge_event_ve_profile_id_event_id_previous_fkey"
            columns: ["profile_id", "event_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_ar_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_event_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_event_versions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_event_versions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_event_versions_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_event_versions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_receivable_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_event_versions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_settlement_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_event_versions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_event_versions_profile_id_event_id_fkey"
            columns: ["profile_id", "event_id"]
            isOneToOne: false
            referencedRelation: "accounting_ar_bridge_events"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_event_versions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_ar_bridge_events: {
        Row: {
          created_at: string
          current_version: number
          economic_event_key: string
          id: string
          profile_id: string
          source_record_id: string
          source_record_key: string
          source_type: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          economic_event_key: string
          id?: string
          profile_id: string
          source_record_id: string
          source_record_key: string
          source_type: string
        }
        Update: {
          created_at?: string
          current_version?: number
          economic_event_key?: string
          id?: string
          profile_id?: string
          source_record_id?: string
          source_record_key?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ar_bridge_events_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_ar_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_ar_bridge_journal_lines: {
        Row: {
          account_id: string
          account_version: number
          amount_halalah: number
          created_at: string
          customer_id: string
          event_id: string
          event_version: number
          invoice_id: string | null
          journal_id: string
          journal_version: number
          line_number: number
          party_role: string
          profile_id: string
          service_id: string | null
          side: string
          source_record_id: string
          source_type: string
        }
        Insert: {
          account_id: string
          account_version: number
          amount_halalah: number
          created_at?: string
          customer_id: string
          event_id: string
          event_version: number
          invoice_id?: string | null
          journal_id: string
          journal_version: number
          line_number: number
          party_role: string
          profile_id: string
          service_id?: string | null
          side: string
          source_record_id: string
          source_type: string
        }
        Update: {
          account_id?: string
          account_version?: number
          amount_halalah?: number
          created_at?: string
          customer_id?: string
          event_id?: string
          event_version?: number
          invoice_id?: string | null
          journal_id?: string
          journal_version?: number
          line_number?: number
          party_role?: string
          profile_id?: string
          service_id?: string | null
          side?: string
          source_record_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ar_bridge_journal__profile_id_account_id_accoun_fkey"
            columns: ["profile_id", "account_id", "account_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal__profile_id_journal_id_journa_fkey"
            columns: [
              "profile_id",
              "journal_id",
              "journal_version",
              "line_number",
            ]
            isOneToOne: false
            referencedRelation: "accounting_journal_line_versions"
            referencedColumns: [
              "profile_id",
              "journal_id",
              "journal_version",
              "line_number",
            ]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_lines_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_lines_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_receivable_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_settlement_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_profile_id_event_id_event_ve_fkey1"
            columns: ["profile_id", "event_id", "event_version"]
            isOneToOne: false
            referencedRelation: "accounting_ar_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
        ]
      }
      accounting_ar_bridge_journal_links: {
        Row: {
          created_at: string
          customer_id: string
          event_id: string
          event_version: number
          invoice_id: string | null
          journal_id: string
          prepared_version: number
          profile_id: string
          service_id: string | null
          source_effect_id: string
          source_record_id: string
          source_type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          event_id: string
          event_version: number
          invoice_id?: string | null
          journal_id: string
          prepared_version: number
          profile_id: string
          service_id?: string | null
          source_effect_id: string
          source_record_id: string
          source_type: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          event_id?: string
          event_version?: number
          invoice_id?: string | null
          journal_id?: string
          prepared_version?: number
          profile_id?: string
          service_id?: string | null
          source_effect_id?: string
          source_record_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ar_bridge_journal__profile_id_event_id_event_ve_fkey"
            columns: ["profile_id", "event_id", "event_version"]
            isOneToOne: true
            referencedRelation: "accounting_ar_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal__profile_id_journal_id_prepar_fkey"
            columns: ["profile_id", "journal_id", "prepared_version"]
            isOneToOne: true
            referencedRelation: "accounting_journal_versions"
            referencedColumns: ["profile_id", "journal_id", "version"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_receivable_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_settlement_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_links_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_bridge_journal_links_source_effect_id_fkey"
            columns: ["source_effect_id"]
            isOneToOne: false
            referencedRelation: "accounting_source_effects"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_binding_reviews: {
        Row: {
          binding_id: string
          binding_version: number
          decision: string
          foundation_event_id: string
          id: string
          payload_fingerprint: string
          profile_id: string
          reason: string
          recorded_at: string
          request_id: string
          reviewer_user_id: string
        }
        Insert: {
          binding_id: string
          binding_version: number
          decision: string
          foundation_event_id: string
          id?: string
          payload_fingerprint: string
          profile_id: string
          reason: string
          recorded_at?: string
          request_id: string
          reviewer_user_id: string
        }
        Update: {
          binding_id?: string
          binding_version?: number
          decision?: string
          foundation_event_id?: string
          id?: string
          payload_fingerprint?: string
          profile_id?: string
          reason?: string
          recorded_at?: string
          request_id?: string
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_binding_revie_profile_id_binding_id_bindin_fkey"
            columns: ["profile_id", "binding_id", "binding_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_binding_versions"
            referencedColumns: ["profile_id", "binding_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_binding_reviews_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bank_binding_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_binding_versions: {
        Row: {
          account_id: string
          account_version: number
          bank_identity_ref: string
          bank_identity_sha256: string
          binding_id: string
          created_at: string
          currency: string
          effective_from: string
          effective_through: string | null
          evidence_ref: string
          evidence_sha256: string
          foundation_event_id: string
          masked_display_identity: string
          payload_fingerprint: string
          prepared_at: string
          prepared_by: string
          previous_version: number | null
          profile_id: string
          reason: string
          request_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          version: number
        }
        Insert: {
          account_id: string
          account_version: number
          bank_identity_ref: string
          bank_identity_sha256: string
          binding_id: string
          created_at?: string
          currency?: string
          effective_from: string
          effective_through?: string | null
          evidence_ref: string
          evidence_sha256: string
          foundation_event_id: string
          masked_display_identity: string
          payload_fingerprint: string
          prepared_at?: string
          prepared_by: string
          previous_version?: number | null
          profile_id: string
          reason: string
          request_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status: string
          version: number
        }
        Update: {
          account_id?: string
          account_version?: number
          bank_identity_ref?: string
          bank_identity_sha256?: string
          binding_id?: string
          created_at?: string
          currency?: string
          effective_from?: string
          effective_through?: string | null
          evidence_ref?: string
          evidence_sha256?: string
          foundation_event_id?: string
          masked_display_identity?: string
          payload_fingerprint?: string
          prepared_at?: string
          prepared_by?: string
          previous_version?: number | null
          profile_id?: string
          reason?: string
          request_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_binding_versi_profile_id_account_id_accoun_fkey"
            columns: ["profile_id", "account_id", "account_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_binding_versi_profile_id_binding_id_previo_fkey"
            columns: ["profile_id", "binding_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_binding_versions"
            referencedColumns: ["profile_id", "binding_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_binding_versions_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bank_binding_versions_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bank_binding_versions_profile_id_binding_id_fkey"
            columns: ["profile_id", "binding_id"]
            isOneToOne: false
            referencedRelation: "accounting_bank_bindings"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_bank_binding_versions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_bindings: {
        Row: {
          created_at: string
          current_version: number
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_bindings_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_binding_versions"
            referencedColumns: ["profile_id", "binding_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_bindings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_reconciliation_allocations: {
        Row: {
          allocation_number: number
          created_at: string
          group_id: string
          group_version: number
          ledger_allocated_halalah: number
          ledger_journal_id: string
          ledger_journal_version: number
          ledger_line_number: number
          profile_id: string
          rationale: string
          statement_allocated_halalah: number
          statement_line_id: string
          statement_line_version: number
        }
        Insert: {
          allocation_number: number
          created_at?: string
          group_id: string
          group_version: number
          ledger_allocated_halalah: number
          ledger_journal_id: string
          ledger_journal_version: number
          ledger_line_number: number
          profile_id: string
          rationale: string
          statement_allocated_halalah: number
          statement_line_id: string
          statement_line_version: number
        }
        Update: {
          allocation_number?: number
          created_at?: string
          group_id?: string
          group_version?: number
          ledger_allocated_halalah?: number
          ledger_journal_id?: string
          ledger_journal_version?: number
          ledger_line_number?: number
          profile_id?: string
          rationale?: string
          statement_allocated_halalah?: number
          statement_line_id?: string
          statement_line_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_reconciliatio_profile_id_group_id_group_ve_fkey"
            columns: ["profile_id", "group_id", "group_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_reconciliation_group_versions"
            referencedColumns: ["profile_id", "group_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_reconciliatio_profile_id_ledger_journal_id_fkey"
            columns: [
              "profile_id",
              "ledger_journal_id",
              "ledger_journal_version",
              "ledger_line_number",
            ]
            isOneToOne: false
            referencedRelation: "accounting_journal_line_versions"
            referencedColumns: [
              "profile_id",
              "journal_id",
              "journal_version",
              "line_number",
            ]
          },
          {
            foreignKeyName: "accounting_bank_reconciliatio_profile_id_statement_line_id_fkey"
            columns: [
              "profile_id",
              "statement_line_id",
              "statement_line_version",
            ]
            isOneToOne: false
            referencedRelation: "accounting_bank_statement_line_versions"
            referencedColumns: ["profile_id", "line_id", "version"]
          },
        ]
      }
      accounting_bank_reconciliation_group_versions: {
        Row: {
          as_of_date: string
          binding_id: string
          binding_version: number
          created_at: string
          evidence_ref: string | null
          foundation_event_id: string
          group_id: string
          payload_fingerprint: string
          prepared_at: string
          prepared_by: string
          previous_version: number | null
          profile_id: string
          rationale: string
          recorded_at_cutoff: string
          request_id: string
          status: string
          version: number
        }
        Insert: {
          as_of_date: string
          binding_id: string
          binding_version: number
          created_at?: string
          evidence_ref?: string | null
          foundation_event_id: string
          group_id: string
          payload_fingerprint: string
          prepared_at?: string
          prepared_by: string
          previous_version?: number | null
          profile_id: string
          rationale: string
          recorded_at_cutoff: string
          request_id: string
          status: string
          version: number
        }
        Update: {
          as_of_date?: string
          binding_id?: string
          binding_version?: number
          created_at?: string
          evidence_ref?: string | null
          foundation_event_id?: string
          group_id?: string
          payload_fingerprint?: string
          prepared_at?: string
          prepared_by?: string
          previous_version?: number | null
          profile_id?: string
          rationale?: string
          recorded_at_cutoff?: string
          request_id?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_reconciliatio_profile_id_binding_id_bindin_fkey"
            columns: ["profile_id", "binding_id", "binding_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_binding_versions"
            referencedColumns: ["profile_id", "binding_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_reconciliatio_profile_id_group_id_previous_fkey"
            columns: ["profile_id", "group_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_reconciliation_group_versions"
            referencedColumns: ["profile_id", "group_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_reconciliation_group_v_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bank_reconciliation_group_v_profile_id_group_id_fkey"
            columns: ["profile_id", "group_id"]
            isOneToOne: false
            referencedRelation: "accounting_bank_reconciliation_groups"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_bank_reconciliation_group_versions_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_reconciliation_groups: {
        Row: {
          created_at: string
          current_version: number
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_reconciliation_groups_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_reconciliation_reviews: {
        Row: {
          decision: string
          foundation_event_id: string
          group_id: string
          group_version: number
          id: string
          payload_fingerprint: string
          profile_id: string
          reason: string
          recorded_at: string
          request_id: string
          reviewer_user_id: string
        }
        Insert: {
          decision: string
          foundation_event_id: string
          group_id: string
          group_version: number
          id?: string
          payload_fingerprint: string
          profile_id: string
          reason: string
          recorded_at?: string
          request_id: string
          reviewer_user_id: string
        }
        Update: {
          decision?: string
          foundation_event_id?: string
          group_id?: string
          group_version?: number
          id?: string
          payload_fingerprint?: string
          profile_id?: string
          reason?: string
          recorded_at?: string
          request_id?: string
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_reconciliati_profile_id_group_id_group_ve_fkey1"
            columns: ["profile_id", "group_id", "group_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_reconciliation_group_versions"
            referencedColumns: ["profile_id", "group_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_reconciliation_reviews_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bank_reconciliation_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_statement_batch_versions: {
        Row: {
          batch_id: string
          binding_id: string
          binding_version: number
          closing_balance_halalah: number
          coverage_end: string
          coverage_start: string
          created_at: string
          currency: string
          evidence_identity: string
          evidence_sha256: string
          foundation_event_id: string
          opening_balance_halalah: number
          payload_fingerprint: string
          previous_version: number | null
          profile_id: string
          reason: string
          recorded_at: string
          recorded_by: string
          request_id: string
          source_document_ref: string
          status: string
          version: number
        }
        Insert: {
          batch_id: string
          binding_id: string
          binding_version: number
          closing_balance_halalah: number
          coverage_end: string
          coverage_start: string
          created_at?: string
          currency?: string
          evidence_identity: string
          evidence_sha256: string
          foundation_event_id: string
          opening_balance_halalah: number
          payload_fingerprint: string
          previous_version?: number | null
          profile_id: string
          reason: string
          recorded_at?: string
          recorded_by: string
          request_id: string
          source_document_ref: string
          status: string
          version: number
        }
        Update: {
          batch_id?: string
          binding_id?: string
          binding_version?: number
          closing_balance_halalah?: number
          coverage_end?: string
          coverage_start?: string
          created_at?: string
          currency?: string
          evidence_identity?: string
          evidence_sha256?: string
          foundation_event_id?: string
          opening_balance_halalah?: number
          payload_fingerprint?: string
          previous_version?: number | null
          profile_id?: string
          reason?: string
          recorded_at?: string
          recorded_by?: string
          request_id?: string
          source_document_ref?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_statement_bat_profile_id_batch_id_previous_fkey"
            columns: ["profile_id", "batch_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_statement_batch_versions"
            referencedColumns: ["profile_id", "batch_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_statement_bat_profile_id_binding_id_bindin_fkey"
            columns: ["profile_id", "binding_id", "binding_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_binding_versions"
            referencedColumns: ["profile_id", "binding_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_statement_batch_versio_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bank_statement_batch_versio_profile_id_batch_id_fkey"
            columns: ["profile_id", "batch_id"]
            isOneToOne: false
            referencedRelation: "accounting_bank_statement_batches"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_bank_statement_batch_versions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_statement_batches: {
        Row: {
          created_at: string
          current_version: number
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_statement_batches_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_statement_batch_versions"
            referencedColumns: ["profile_id", "batch_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_statement_batches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_statement_line_versions: {
        Row: {
          batch_id: string
          batch_version: number
          created_at: string
          description: string | null
          direction: string
          duplicate_candidate: boolean
          duplicate_fingerprint: string
          foundation_event_id: string
          line_id: string
          payload_fingerprint: string
          previous_version: number | null
          profile_id: string
          recorded_at: string
          recorded_by: string
          reference: string | null
          request_id: string
          signed_amount_halalah: number
          source_row_identity: string
          stable_line_identity: string
          transaction_date: string
          value_date: string | null
          version: number
        }
        Insert: {
          batch_id: string
          batch_version: number
          created_at?: string
          description?: string | null
          direction: string
          duplicate_candidate?: boolean
          duplicate_fingerprint: string
          foundation_event_id: string
          line_id: string
          payload_fingerprint: string
          previous_version?: number | null
          profile_id: string
          recorded_at?: string
          recorded_by: string
          reference?: string | null
          request_id: string
          signed_amount_halalah: number
          source_row_identity: string
          stable_line_identity: string
          transaction_date: string
          value_date?: string | null
          version: number
        }
        Update: {
          batch_id?: string
          batch_version?: number
          created_at?: string
          description?: string | null
          direction?: string
          duplicate_candidate?: boolean
          duplicate_fingerprint?: string
          foundation_event_id?: string
          line_id?: string
          payload_fingerprint?: string
          previous_version?: number | null
          profile_id?: string
          recorded_at?: string
          recorded_by?: string
          reference?: string | null
          request_id?: string
          signed_amount_halalah?: number
          source_row_identity?: string
          stable_line_identity?: string
          transaction_date?: string
          value_date?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_statement_lin_profile_id_batch_id_batch_ve_fkey"
            columns: ["profile_id", "batch_id", "batch_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_statement_batch_versions"
            referencedColumns: ["profile_id", "batch_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_statement_lin_profile_id_line_id_previous__fkey"
            columns: ["profile_id", "line_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_statement_line_versions"
            referencedColumns: ["profile_id", "line_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_statement_line_version_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bank_statement_line_versions_profile_id_line_id_fkey"
            columns: ["profile_id", "line_id"]
            isOneToOne: false
            referencedRelation: "accounting_bank_statement_lines"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_bank_statement_line_versions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_statement_lines: {
        Row: {
          batch_id: string
          created_at: string
          current_version: number
          id: string
          profile_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_statement_lines_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_bank_statement_line_versions"
            referencedColumns: ["profile_id", "line_id", "version"]
          },
          {
            foreignKeyName: "accounting_bank_statement_lines_profile_id_batch_id_fkey"
            columns: ["profile_id", "batch_id"]
            isOneToOne: false
            referencedRelation: "accounting_bank_statement_batches"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_bank_statement_lines_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_capability_catalog: {
        Row: {
          capability: string
          enabled: boolean
          owner_slice: string
          runtime_allow_grantable: boolean
        }
        Insert: {
          capability: string
          enabled: boolean
          owner_slice: string
          runtime_allow_grantable: boolean
        }
        Update: {
          capability?: string
          enabled?: boolean
          owner_slice?: string
          runtime_allow_grantable?: boolean
        }
        Relationships: []
      }
      accounting_capability_events: {
        Row: {
          actor_user_id: string
          capability: string
          created_at: string
          effect: string
          evidence_ref: string | null
          expires_at: string | null
          foundation_event_id: string
          id: string
          payload_fingerprint: string
          profile_id: string
          reason: string
          request_id: string
          revision: number
          target_user_id: string
        }
        Insert: {
          actor_user_id: string
          capability: string
          created_at?: string
          effect: string
          evidence_ref?: string | null
          expires_at?: string | null
          foundation_event_id: string
          id?: string
          payload_fingerprint: string
          profile_id: string
          reason: string
          request_id: string
          revision: number
          target_user_id: string
        }
        Update: {
          actor_user_id?: string
          capability?: string
          created_at?: string
          effect?: string
          evidence_ref?: string | null
          expires_at?: string | null
          foundation_event_id?: string
          id?: string
          payload_fingerprint?: string
          profile_id?: string
          reason?: string
          request_id?: string
          revision?: number
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_capability_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_capability_events_capability_fkey"
            columns: ["capability"]
            isOneToOne: false
            referencedRelation: "accounting_capability_catalog"
            referencedColumns: ["capability"]
          },
          {
            foreignKeyName: "accounting_capability_events_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_capability_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_capability_events_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_expense_bridge_event_versions: {
        Row: {
          accounting_date: string | null
          advance_account_id: string | null
          advance_account_version: number | null
          advance_id: string | null
          advance_provenance_evidence_ref: string | null
          advance_provenance_evidence_sha256: string | null
          amount_halalah: number
          cash_account_id: string | null
          cash_account_version: number | null
          cash_binding_evidence_ref: string | null
          cash_binding_evidence_sha256: string | null
          classification: string
          control_account_id: string | null
          control_account_version: number | null
          created_at: string
          created_by: string
          direct_classification: string | null
          employee_id: string | null
          event_id: string
          evidence_ref: string | null
          evidence_sha256: string | null
          expense_account_id: string | null
          expense_account_version: number | null
          expense_id: string | null
          foundation_event_id: string
          fund_id: string | null
          held_code: string | null
          payload_fingerprint: string
          previous_version: number | null
          profile_id: string
          reason: string
          related_advance_id: string | null
          return_direction: string | null
          service_attribution: string
          service_id: string | null
          source_business_date: string | null
          source_occurred_at: string | null
          source_recorded_at: string
          source_snapshot: Json
          source_snapshot_sha256: string
          status: string
          version: number
        }
        Insert: {
          accounting_date?: string | null
          advance_account_id?: string | null
          advance_account_version?: number | null
          advance_id?: string | null
          advance_provenance_evidence_ref?: string | null
          advance_provenance_evidence_sha256?: string | null
          amount_halalah: number
          cash_account_id?: string | null
          cash_account_version?: number | null
          cash_binding_evidence_ref?: string | null
          cash_binding_evidence_sha256?: string | null
          classification: string
          control_account_id?: string | null
          control_account_version?: number | null
          created_at?: string
          created_by: string
          direct_classification?: string | null
          employee_id?: string | null
          event_id: string
          evidence_ref?: string | null
          evidence_sha256?: string | null
          expense_account_id?: string | null
          expense_account_version?: number | null
          expense_id?: string | null
          foundation_event_id: string
          fund_id?: string | null
          held_code?: string | null
          payload_fingerprint: string
          previous_version?: number | null
          profile_id: string
          reason: string
          related_advance_id?: string | null
          return_direction?: string | null
          service_attribution: string
          service_id?: string | null
          source_business_date?: string | null
          source_occurred_at?: string | null
          source_recorded_at: string
          source_snapshot: Json
          source_snapshot_sha256: string
          status: string
          version: number
        }
        Update: {
          accounting_date?: string | null
          advance_account_id?: string | null
          advance_account_version?: number | null
          advance_id?: string | null
          advance_provenance_evidence_ref?: string | null
          advance_provenance_evidence_sha256?: string | null
          amount_halalah?: number
          cash_account_id?: string | null
          cash_account_version?: number | null
          cash_binding_evidence_ref?: string | null
          cash_binding_evidence_sha256?: string | null
          classification?: string
          control_account_id?: string | null
          control_account_version?: number | null
          created_at?: string
          created_by?: string
          direct_classification?: string | null
          employee_id?: string | null
          event_id?: string
          evidence_ref?: string | null
          evidence_sha256?: string | null
          expense_account_id?: string | null
          expense_account_version?: number | null
          expense_id?: string | null
          foundation_event_id?: string
          fund_id?: string | null
          held_code?: string | null
          payload_fingerprint?: string
          previous_version?: number | null
          profile_id?: string
          reason?: string
          related_advance_id?: string | null
          return_direction?: string | null
          service_attribution?: string
          service_id?: string | null
          source_business_date?: string | null
          source_occurred_at?: string | null
          source_recorded_at?: string
          source_snapshot?: Json
          source_snapshot_sha256?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_expense_bridge_eve_profile_id_advance_account_i_fkey"
            columns: [
              "profile_id",
              "advance_account_id",
              "advance_account_version",
            ]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_eve_profile_id_cash_account_id_c_fkey"
            columns: ["profile_id", "cash_account_id", "cash_account_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_eve_profile_id_control_account_i_fkey"
            columns: [
              "profile_id",
              "control_account_id",
              "control_account_version",
            ]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_eve_profile_id_event_id_previous_fkey"
            columns: ["profile_id", "event_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_expense_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_eve_profile_id_expense_account_i_fkey"
            columns: [
              "profile_id",
              "expense_account_id",
              "expense_account_version",
            ]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_event_versio_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_event_versio_profile_id_event_id_fkey"
            columns: ["profile_id", "event_id"]
            isOneToOne: false
            referencedRelation: "accounting_expense_bridge_events"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_event_version_related_advance_id_fkey"
            columns: ["related_advance_id"]
            isOneToOne: false
            referencedRelation: "employee_cash_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_event_versions_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "employee_cash_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_event_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_event_versions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_event_versions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_accountability_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_event_versions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_event_versions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_event_versions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_expense_bridge_events: {
        Row: {
          created_at: string
          current_version: number
          economic_event_key: string
          id: string
          profile_id: string
          source_record_id: string
          source_record_key: string
          source_type: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          economic_event_key: string
          id?: string
          profile_id: string
          source_record_id: string
          source_record_key: string
          source_type: string
        }
        Update: {
          created_at?: string
          current_version?: number
          economic_event_key?: string
          id?: string
          profile_id?: string
          source_record_id?: string
          source_record_key?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_expense_bridge_events_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_expense_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_expense_bridge_journal_lines: {
        Row: {
          account_id: string
          account_version: number
          advance_id: string | null
          amount_halalah: number
          employee_id: string | null
          event_id: string
          event_version: number
          expense_id: string | null
          fund_id: string | null
          journal_id: string
          journal_version: number
          line_number: number
          party_role: string
          profile_id: string
          service_id: string | null
          side: string
          source_record_id: string
          source_type: string
        }
        Insert: {
          account_id: string
          account_version: number
          advance_id?: string | null
          amount_halalah: number
          employee_id?: string | null
          event_id: string
          event_version: number
          expense_id?: string | null
          fund_id?: string | null
          journal_id: string
          journal_version: number
          line_number: number
          party_role: string
          profile_id: string
          service_id?: string | null
          side: string
          source_record_id: string
          source_type: string
        }
        Update: {
          account_id?: string
          account_version?: number
          advance_id?: string | null
          amount_halalah?: number
          employee_id?: string | null
          event_id?: string
          event_version?: number
          expense_id?: string | null
          fund_id?: string | null
          journal_id?: string
          journal_version?: number
          line_number?: number
          party_role?: string
          profile_id?: string
          service_id?: string | null
          side?: string
          source_record_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_expense_bridge_jo_profile_id_event_id_event_ve_fkey1"
            columns: ["profile_id", "event_id", "event_version"]
            isOneToOne: false
            referencedRelation: "accounting_expense_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_jou_profile_id_account_id_accoun_fkey"
            columns: ["profile_id", "account_id", "account_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_jou_profile_id_journal_id_journa_fkey"
            columns: [
              "profile_id",
              "journal_id",
              "journal_version",
              "line_number",
            ]
            isOneToOne: false
            referencedRelation: "accounting_journal_line_versions"
            referencedColumns: [
              "profile_id",
              "journal_id",
              "journal_version",
              "line_number",
            ]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_lines_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "employee_cash_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_lines_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_accountability_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_lines_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_lines_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_expense_bridge_journal_links: {
        Row: {
          advance_id: string | null
          created_at: string
          employee_id: string | null
          event_id: string
          event_version: number
          expense_id: string | null
          fund_id: string | null
          journal_id: string
          prepared_version: number
          profile_id: string
          service_id: string | null
          source_effect_id: string
          source_record_id: string
          source_type: string
        }
        Insert: {
          advance_id?: string | null
          created_at?: string
          employee_id?: string | null
          event_id: string
          event_version: number
          expense_id?: string | null
          fund_id?: string | null
          journal_id: string
          prepared_version: number
          profile_id: string
          service_id?: string | null
          source_effect_id: string
          source_record_id: string
          source_type: string
        }
        Update: {
          advance_id?: string | null
          created_at?: string
          employee_id?: string | null
          event_id?: string
          event_version?: number
          expense_id?: string | null
          fund_id?: string | null
          journal_id?: string
          prepared_version?: number
          profile_id?: string
          service_id?: string | null
          source_effect_id?: string
          source_record_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_expense_bridge_jou_profile_id_event_id_event_ve_fkey"
            columns: ["profile_id", "event_id", "event_version"]
            isOneToOne: true
            referencedRelation: "accounting_expense_bridge_event_versions"
            referencedColumns: ["profile_id", "event_id", "version"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_jou_profile_id_journal_id_prepar_fkey"
            columns: ["profile_id", "journal_id", "prepared_version"]
            isOneToOne: false
            referencedRelation: "accounting_journal_versions"
            referencedColumns: ["profile_id", "journal_id", "version"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_links_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "employee_cash_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_links_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_links_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_accountability_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_links_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_links_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_links_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_expense_bridge_journal_links_source_effect_id_fkey"
            columns: ["source_effect_id"]
            isOneToOne: true
            referencedRelation: "accounting_source_effects"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_foundation_events: {
        Row: {
          actor_user_id: string
          entity_id: string
          entity_type: string
          entity_version: number
          event_type: string
          evidence_ref: string | null
          id: string
          occurred_at: string
          payload_fingerprint: string
          profile_id: string
          reason: string
          request_id: string
          result_reference: string
        }
        Insert: {
          actor_user_id: string
          entity_id: string
          entity_type: string
          entity_version: number
          event_type: string
          evidence_ref?: string | null
          id?: string
          occurred_at?: string
          payload_fingerprint: string
          profile_id: string
          reason: string
          request_id: string
          result_reference: string
        }
        Update: {
          actor_user_id?: string
          entity_id?: string
          entity_type?: string
          entity_version?: number
          event_type?: string
          evidence_ref?: string | null
          id?: string
          occurred_at?: string
          payload_fingerprint?: string
          profile_id?: string
          reason?: string
          request_id?: string
          result_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_foundation_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_foundation_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_inception_acceptances: {
        Row: {
          accepted_at: string
          accepted_by: string
          as_of_date: string
          foundation_event_id: string
          id: string
          package_id: string
          package_version: number
          payload_fingerprint: string
          profile_id: string
          recorded_at_cutoff: string
          trial_balance: Json
        }
        Insert: {
          accepted_at?: string
          accepted_by: string
          as_of_date: string
          foundation_event_id: string
          id?: string
          package_id: string
          package_version: number
          payload_fingerprint: string
          profile_id: string
          recorded_at_cutoff: string
          trial_balance: Json
        }
        Update: {
          accepted_at?: string
          accepted_by?: string
          as_of_date?: string
          foundation_event_id?: string
          id?: string
          package_id?: string
          package_version?: number
          payload_fingerprint?: string
          profile_id?: string
          recorded_at_cutoff?: string
          trial_balance?: Json
        }
        Relationships: [
          {
            foreignKeyName: "accounting_inception_acceptan_profile_id_package_id_packag_fkey"
            columns: ["profile_id", "package_id", "package_version"]
            isOneToOne: true
            referencedRelation: "accounting_inception_package_versions"
            referencedColumns: ["profile_id", "package_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_acceptances_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_inception_acceptances_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_inception_coverage: {
        Row: {
          created_at: string
          current_version: number
          economic_event_key: string
          id: string
          profile_id: string
          source_domain: string
          source_record_key: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          economic_event_key: string
          id?: string
          profile_id: string
          source_domain: string
          source_record_key: string
        }
        Update: {
          created_at?: string
          current_version?: number
          economic_event_key?: string
          id?: string
          profile_id?: string
          source_domain?: string
          source_record_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_inception_coverage_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_inception_coverage_versions"
            referencedColumns: ["profile_id", "coverage_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_coverage_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_inception_coverage_versions: {
        Row: {
          classification: string
          coverage_id: string
          created_at: string
          created_by: string
          evidence_count: number
          foundation_event_id: string
          is_material: boolean
          item_id: string
          package_id: string
          package_version: number
          party_reference: string | null
          party_type: string
          payload_fingerprint: string
          previous_version: number | null
          profile_id: string
          reconciliation_category: string
          reconciliation_reference: string | null
          resolution_state: string
          version: number
        }
        Insert: {
          classification: string
          coverage_id: string
          created_at?: string
          created_by: string
          evidence_count: number
          foundation_event_id: string
          is_material: boolean
          item_id: string
          package_id: string
          package_version: number
          party_reference?: string | null
          party_type: string
          payload_fingerprint: string
          previous_version?: number | null
          profile_id: string
          reconciliation_category: string
          reconciliation_reference?: string | null
          resolution_state: string
          version: number
        }
        Update: {
          classification?: string
          coverage_id?: string
          created_at?: string
          created_by?: string
          evidence_count?: number
          foundation_event_id?: string
          is_material?: boolean
          item_id?: string
          package_id?: string
          package_version?: number
          party_reference?: string | null
          party_type?: string
          payload_fingerprint?: string
          previous_version?: number | null
          profile_id?: string
          reconciliation_category?: string
          reconciliation_reference?: string | null
          resolution_state?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_inception_coverage_profile_id_coverage_id_previ_fkey"
            columns: ["profile_id", "coverage_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_inception_coverage_versions"
            referencedColumns: ["profile_id", "coverage_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_coverage_profile_id_package_id_packag_fkey"
            columns: ["profile_id", "package_id", "package_version"]
            isOneToOne: false
            referencedRelation: "accounting_inception_package_versions"
            referencedColumns: ["profile_id", "package_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_coverage_versi_profile_id_coverage_id_fkey"
            columns: ["profile_id", "coverage_id"]
            isOneToOne: false
            referencedRelation: "accounting_inception_coverage"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_inception_coverage_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_inception_coverage_versions_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: false
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_inception_journal_links: {
        Row: {
          created_at: string
          item_id: string
          journal_id: string
          package_id: string
          package_version: number
          payload_fingerprint: string
          prepared_by: string
          prepared_version: number
          profile_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          journal_id: string
          package_id: string
          package_version: number
          payload_fingerprint: string
          prepared_by: string
          prepared_version: number
          profile_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          journal_id?: string
          package_id?: string
          package_version?: number
          payload_fingerprint?: string
          prepared_by?: string
          prepared_version?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_inception_journal__profile_id_journal_id_prepar_fkey"
            columns: ["profile_id", "journal_id", "prepared_version"]
            isOneToOne: false
            referencedRelation: "accounting_journal_versions"
            referencedColumns: ["profile_id", "journal_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_journal__profile_id_package_id_packag_fkey"
            columns: ["profile_id", "package_id", "package_version"]
            isOneToOne: false
            referencedRelation: "accounting_inception_package_versions"
            referencedColumns: ["profile_id", "package_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_journal_links_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_inception_mapping_authorizations: {
        Row: {
          account_id: string
          account_version: number
          created_at: string
          item_id: string
          mapping_key: string
          package_id: string
          package_version: number
          payload_fingerprint: string
          preparer_user_id: string
          profile_id: string
          reviewer_user_id: string
          rule_id: string
          rule_version: number
          side: string
        }
        Insert: {
          account_id: string
          account_version: number
          created_at?: string
          item_id: string
          mapping_key: string
          package_id: string
          package_version: number
          payload_fingerprint: string
          preparer_user_id: string
          profile_id: string
          reviewer_user_id: string
          rule_id: string
          rule_version: number
          side: string
        }
        Update: {
          account_id?: string
          account_version?: number
          created_at?: string
          item_id?: string
          mapping_key?: string
          package_id?: string
          package_version?: number
          payload_fingerprint?: string
          preparer_user_id?: string
          profile_id?: string
          reviewer_user_id?: string
          rule_id?: string
          rule_version?: number
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_inception_mapping__profile_id_account_id_accoun_fkey"
            columns: ["profile_id", "account_id", "account_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_mapping__profile_id_package_id_packag_fkey"
            columns: ["profile_id", "package_id", "package_version"]
            isOneToOne: false
            referencedRelation: "accounting_inception_package_versions"
            referencedColumns: ["profile_id", "package_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_mapping_authorizatio_preparer_user_id_fkey"
            columns: ["preparer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_inception_mapping_authorizatio_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_inception_package_versions: {
        Row: {
          accounting_start_date: string
          created_at: string
          created_by: string
          cutover_boundary_date: string
          foundation_event_id: string
          package_id: string
          payload: Json
          payload_fingerprint: string
          previous_version: number | null
          profile_id: string
          version: number
        }
        Insert: {
          accounting_start_date: string
          created_at?: string
          created_by: string
          cutover_boundary_date: string
          foundation_event_id: string
          package_id: string
          payload: Json
          payload_fingerprint: string
          previous_version?: number | null
          profile_id: string
          version: number
        }
        Update: {
          accounting_start_date?: string
          created_at?: string
          created_by?: string
          cutover_boundary_date?: string
          foundation_event_id?: string
          package_id?: string
          payload?: Json
          payload_fingerprint?: string
          previous_version?: number | null
          profile_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_inception_package__profile_id_package_id_previo_fkey"
            columns: ["profile_id", "package_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_inception_package_versions"
            referencedColumns: ["profile_id", "package_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_package_version_profile_id_package_id_fkey"
            columns: ["profile_id", "package_id"]
            isOneToOne: false
            referencedRelation: "accounting_inception_packages"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_inception_package_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_inception_package_versions_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_inception_packages: {
        Row: {
          created_at: string
          current_version: number
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_inception_packages_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_inception_package_versions"
            referencedColumns: ["profile_id", "package_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_packages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_inception_reviews: {
        Row: {
          decision: string
          foundation_event_id: string
          id: string
          package_id: string
          package_version: number
          payload_fingerprint: string
          profile_id: string
          reason: string
          reviewed_at: string
          reviewer_user_id: string
        }
        Insert: {
          decision: string
          foundation_event_id: string
          id?: string
          package_id: string
          package_version: number
          payload_fingerprint: string
          profile_id: string
          reason: string
          reviewed_at?: string
          reviewer_user_id: string
        }
        Update: {
          decision?: string
          foundation_event_id?: string
          id?: string
          package_id?: string
          package_version?: number
          payload_fingerprint?: string
          profile_id?: string
          reason?: string
          reviewed_at?: string
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_inception_reviews_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_inception_reviews_profile_id_package_id_package_fkey"
            columns: ["profile_id", "package_id", "package_version"]
            isOneToOne: true
            referencedRelation: "accounting_inception_package_versions"
            referencedColumns: ["profile_id", "package_id", "version"]
          },
          {
            foreignKeyName: "accounting_inception_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_journal_events: {
        Row: {
          actor_user_id: string
          created_at: string
          entity_version: number
          event_type: string
          id: string
          idempotent_replay: boolean
          journal_id: string | null
          operation: string
          payload_fingerprint: string
          posting_rule_id: string | null
          profile_id: string
          request_id: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          entity_version: number
          event_type: string
          id?: string
          idempotent_replay?: boolean
          journal_id?: string | null
          operation: string
          payload_fingerprint: string
          posting_rule_id?: string | null
          profile_id: string
          request_id: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          entity_version?: number
          event_type?: string
          id?: string
          idempotent_replay?: boolean
          journal_id?: string | null
          operation?: string
          payload_fingerprint?: string
          posting_rule_id?: string | null
          profile_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journal_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journal_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journal_events_profile_id_journal_id_entity_ver_fkey"
            columns: ["profile_id", "journal_id", "entity_version"]
            isOneToOne: false
            referencedRelation: "accounting_journal_versions"
            referencedColumns: ["profile_id", "journal_id", "version"]
          },
          {
            foreignKeyName: "accounting_journal_events_profile_id_journal_id_fkey"
            columns: ["profile_id", "journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_journal_events_profile_id_posting_rule_id_entit_fkey"
            columns: ["profile_id", "posting_rule_id", "entity_version"]
            isOneToOne: false
            referencedRelation: "accounting_posting_rule_versions"
            referencedColumns: ["profile_id", "posting_rule_id", "version"]
          },
          {
            foreignKeyName: "accounting_journal_events_profile_id_posting_rule_id_fkey"
            columns: ["profile_id", "posting_rule_id"]
            isOneToOne: false
            referencedRelation: "accounting_posting_rules"
            referencedColumns: ["profile_id", "id"]
          },
        ]
      }
      accounting_journal_line_versions: {
        Row: {
          account_code_snapshot: string
          account_id: string
          account_name_ar_snapshot: string
          account_name_en_snapshot: string
          account_type_snapshot: string
          account_version: number
          amount_halalah: number
          description_ar: string
          description_en: string
          event_end_date_snapshot: string | null
          event_name_snapshot: string | null
          event_start_date_snapshot: string | null
          event_type_snapshot: string | null
          journal_id: string
          journal_version: number
          line_number: number
          mapping_key: string
          normal_balance_snapshot: string
          posting_rule_id: string
          profile_id: string
          rule_version: number
          service_id: string | null
          service_number_snapshot: string | null
          side: string
        }
        Insert: {
          account_code_snapshot: string
          account_id: string
          account_name_ar_snapshot: string
          account_name_en_snapshot: string
          account_type_snapshot: string
          account_version: number
          amount_halalah: number
          description_ar: string
          description_en: string
          event_end_date_snapshot?: string | null
          event_name_snapshot?: string | null
          event_start_date_snapshot?: string | null
          event_type_snapshot?: string | null
          journal_id: string
          journal_version: number
          line_number: number
          mapping_key: string
          normal_balance_snapshot: string
          posting_rule_id: string
          profile_id: string
          rule_version: number
          service_id?: string | null
          service_number_snapshot?: string | null
          side: string
        }
        Update: {
          account_code_snapshot?: string
          account_id?: string
          account_name_ar_snapshot?: string
          account_name_en_snapshot?: string
          account_type_snapshot?: string
          account_version?: number
          amount_halalah?: number
          description_ar?: string
          description_en?: string
          event_end_date_snapshot?: string | null
          event_name_snapshot?: string | null
          event_start_date_snapshot?: string | null
          event_type_snapshot?: string | null
          journal_id?: string
          journal_version?: number
          line_number?: number
          mapping_key?: string
          normal_balance_snapshot?: string
          posting_rule_id?: string
          profile_id?: string
          rule_version?: number
          service_id?: string | null
          service_number_snapshot?: string | null
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journal_line_versi_profile_id_account_id_accoun_fkey"
            columns: ["profile_id", "account_id", "account_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_journal_line_versi_profile_id_journal_id_journa_fkey"
            columns: ["profile_id", "journal_id", "journal_version"]
            isOneToOne: false
            referencedRelation: "accounting_journal_versions"
            referencedColumns: ["profile_id", "journal_id", "version"]
          },
          {
            foreignKeyName: "accounting_journal_line_versi_profile_id_posting_rule_id_r_fkey"
            columns: [
              "profile_id",
              "posting_rule_id",
              "rule_version",
              "mapping_key",
            ]
            isOneToOne: false
            referencedRelation: "accounting_posting_rule_mappings"
            referencedColumns: [
              "profile_id",
              "posting_rule_id",
              "rule_version",
              "mapping_key",
            ]
          },
          {
            foreignKeyName: "accounting_journal_line_versions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_journal_versions: {
        Row: {
          accounting_date: string
          created_at: string
          currency: string
          description_ar: string
          description_en: string
          economic_event_key: string
          evidence_ref: string | null
          foundation_event_id: string
          journal_id: string
          payload_fingerprint: string
          period_id: string
          period_version: number
          posted_at: string | null
          posted_by: string | null
          posting_purpose: string
          posting_rule_id: string
          prepared_at: string
          prepared_by: string
          previous_version: number | null
          profile_id: string
          profile_version: number
          reason: string
          reversal_of_journal_id: string | null
          rule_version: number
          source_domain: string
          source_record_key: string
          status: string
          version: number
        }
        Insert: {
          accounting_date: string
          created_at?: string
          currency?: string
          description_ar: string
          description_en: string
          economic_event_key: string
          evidence_ref?: string | null
          foundation_event_id: string
          journal_id: string
          payload_fingerprint: string
          period_id: string
          period_version: number
          posted_at?: string | null
          posted_by?: string | null
          posting_purpose: string
          posting_rule_id: string
          prepared_at: string
          prepared_by: string
          previous_version?: number | null
          profile_id: string
          profile_version: number
          reason: string
          reversal_of_journal_id?: string | null
          rule_version: number
          source_domain?: string
          source_record_key: string
          status: string
          version: number
        }
        Update: {
          accounting_date?: string
          created_at?: string
          currency?: string
          description_ar?: string
          description_en?: string
          economic_event_key?: string
          evidence_ref?: string | null
          foundation_event_id?: string
          journal_id?: string
          payload_fingerprint?: string
          period_id?: string
          period_version?: number
          posted_at?: string | null
          posted_by?: string | null
          posting_purpose?: string
          posting_rule_id?: string
          prepared_at?: string
          prepared_by?: string
          previous_version?: number | null
          profile_id?: string
          profile_version?: number
          reason?: string
          reversal_of_journal_id?: string | null
          rule_version?: number
          source_domain?: string
          source_record_key?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journal_versions_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journal_versions_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journal_versions_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journal_versions_profile_id_journal_id_fkey"
            columns: ["profile_id", "journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_journal_versions_profile_id_journal_id_previous_fkey"
            columns: ["profile_id", "journal_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_journal_versions"
            referencedColumns: ["profile_id", "journal_id", "version"]
          },
          {
            foreignKeyName: "accounting_journal_versions_profile_id_period_id_period_ve_fkey"
            columns: ["profile_id", "period_id", "period_version"]
            isOneToOne: false
            referencedRelation: "accounting_period_versions"
            referencedColumns: ["profile_id", "period_id", "version"]
          },
          {
            foreignKeyName: "accounting_journal_versions_profile_id_posting_rule_id_rul_fkey"
            columns: ["profile_id", "posting_rule_id", "rule_version"]
            isOneToOne: false
            referencedRelation: "accounting_posting_rule_versions"
            referencedColumns: ["profile_id", "posting_rule_id", "version"]
          },
          {
            foreignKeyName: "accounting_journal_versions_profile_id_reversal_of_journal_fkey"
            columns: ["profile_id", "reversal_of_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["profile_id", "id"]
          },
        ]
      }
      accounting_journals: {
        Row: {
          correction_group_id: string
          created_at: string
          current_version: number
          id: string
          profile_id: string
          reversal_of_journal_id: string | null
        }
        Insert: {
          correction_group_id: string
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
          reversal_of_journal_id?: string | null
        }
        Update: {
          correction_group_id?: string
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
          reversal_of_journal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journals_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_journal_versions"
            referencedColumns: ["profile_id", "journal_id", "version"]
          },
          {
            foreignKeyName: "accounting_journals_profile_id_correction_group_id_fkey"
            columns: ["profile_id", "correction_group_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_journals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_profile_id_reversal_of_journal_id_fkey"
            columns: ["profile_id", "reversal_of_journal_id"]
            isOneToOne: true
            referencedRelation: "accounting_journals"
            referencedColumns: ["profile_id", "id"]
          },
        ]
      }
      accounting_period_close_packages: {
        Row: {
          accounting_cutoff: string
          evidence_fingerprint: string
          evidence_ref: string
          evidence_snapshot: Json
          exception_codes: string[]
          id: string
          ledger_fingerprint: string
          package_kind: string
          package_state: string
          package_version: number
          period_end_date: string
          period_id: string
          period_start_date: string
          prepared_at: string
          preparer_user_id: string
          previous_package_id: string | null
          previous_package_version: number | null
          profile_id: string
          reason: string
          recorded_at_cutoff: string
          request_fingerprint: string
          request_id: string
          starting_period_version: number
        }
        Insert: {
          accounting_cutoff: string
          evidence_fingerprint: string
          evidence_ref: string
          evidence_snapshot: Json
          exception_codes?: string[]
          id?: string
          ledger_fingerprint: string
          package_kind: string
          package_state?: string
          package_version: number
          period_end_date: string
          period_id: string
          period_start_date: string
          prepared_at?: string
          preparer_user_id: string
          previous_package_id?: string | null
          previous_package_version?: number | null
          profile_id: string
          reason: string
          recorded_at_cutoff: string
          request_fingerprint: string
          request_id: string
          starting_period_version: number
        }
        Update: {
          accounting_cutoff?: string
          evidence_fingerprint?: string
          evidence_ref?: string
          evidence_snapshot?: Json
          exception_codes?: string[]
          id?: string
          ledger_fingerprint?: string
          package_kind?: string
          package_state?: string
          package_version?: number
          period_end_date?: string
          period_id?: string
          period_start_date?: string
          prepared_at?: string
          preparer_user_id?: string
          previous_package_id?: string | null
          previous_package_version?: number | null
          profile_id?: string
          reason?: string
          recorded_at_cutoff?: string
          request_fingerprint?: string
          request_id?: string
          starting_period_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_period_close_packages_identity_fkey"
            columns: ["profile_id", "period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_period_close_packages_preparer_user_id_fkey"
            columns: ["preparer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_close_packages_previous_fkey"
            columns: [
              "profile_id",
              "period_id",
              "previous_package_id",
              "previous_package_version",
            ]
            isOneToOne: false
            referencedRelation: "accounting_period_close_packages"
            referencedColumns: [
              "profile_id",
              "period_id",
              "id",
              "package_version",
            ]
          },
          {
            foreignKeyName: "accounting_period_close_packages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_period_close_reviews: {
        Row: {
          decision: string
          id: string
          package_id: string
          package_version: number
          period_id: string
          profile_id: string
          reason: string
          recomputed_evidence_fingerprint: string | null
          recomputed_ledger_fingerprint: string | null
          recorded_at: string
          request_fingerprint: string
          request_id: string
          resulting_period_version: number | null
          reviewer_user_id: string
        }
        Insert: {
          decision: string
          id?: string
          package_id: string
          package_version: number
          period_id: string
          profile_id: string
          reason: string
          recomputed_evidence_fingerprint?: string | null
          recomputed_ledger_fingerprint?: string | null
          recorded_at?: string
          request_fingerprint: string
          request_id: string
          resulting_period_version?: number | null
          reviewer_user_id: string
        }
        Update: {
          decision?: string
          id?: string
          package_id?: string
          package_version?: number
          period_id?: string
          profile_id?: string
          reason?: string
          recomputed_evidence_fingerprint?: string | null
          recomputed_ledger_fingerprint?: string | null
          recorded_at?: string
          request_fingerprint?: string
          request_id?: string
          resulting_period_version?: number | null
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_period_close_reviews_package_fkey"
            columns: [
              "profile_id",
              "period_id",
              "package_id",
              "package_version",
            ]
            isOneToOne: false
            referencedRelation: "accounting_period_close_packages"
            referencedColumns: [
              "profile_id",
              "period_id",
              "id",
              "package_version",
            ]
          },
          {
            foreignKeyName: "accounting_period_close_reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_close_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_period_versions: {
        Row: {
          created_at: string
          created_by: string
          effective_from: string
          end_date: string
          evidence_ref: string | null
          foundation_event_id: string
          period_id: string
          previous_version: number | null
          profile_id: string
          reason: string
          start_date: string
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          effective_from: string
          end_date: string
          evidence_ref?: string | null
          foundation_event_id: string
          period_id: string
          previous_version?: number | null
          profile_id: string
          reason: string
          start_date: string
          status?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          effective_from?: string
          end_date?: string
          evidence_ref?: string | null
          foundation_event_id?: string
          period_id?: string
          previous_version?: number | null
          profile_id?: string
          reason?: string
          start_date?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_period_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_versions_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_versions_identity_fkey"
            columns: ["profile_id", "period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_period_versions_previous_fkey"
            columns: ["profile_id", "period_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_period_versions"
            referencedColumns: ["profile_id", "period_id", "version"]
          },
        ]
      }
      accounting_periods: {
        Row: {
          created_at: string
          current_version: number
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_period_versions"
            referencedColumns: ["profile_id", "period_id", "version"]
          },
          {
            foreignKeyName: "accounting_periods_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_posting_rule_mappings: {
        Row: {
          account_id: string
          account_version: number
          allowed_side: string
          mapping_key: string
          posting_rule_id: string
          profile_id: string
          rule_version: number
          service_requirement: string
        }
        Insert: {
          account_id: string
          account_version: number
          allowed_side: string
          mapping_key: string
          posting_rule_id: string
          profile_id: string
          rule_version: number
          service_requirement: string
        }
        Update: {
          account_id?: string
          account_version?: number
          allowed_side?: string
          mapping_key?: string
          posting_rule_id?: string
          profile_id?: string
          rule_version?: number
          service_requirement?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_posting_rule_mappi_profile_id_account_id_accoun_fkey"
            columns: ["profile_id", "account_id", "account_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_posting_rule_mappi_profile_id_posting_rule_id_r_fkey"
            columns: ["profile_id", "posting_rule_id", "rule_version"]
            isOneToOne: false
            referencedRelation: "accounting_posting_rule_versions"
            referencedColumns: ["profile_id", "posting_rule_id", "version"]
          },
        ]
      }
      accounting_posting_rule_versions: {
        Row: {
          created_at: string
          created_by: string
          effective_from: string
          evidence_ref: string | null
          foundation_event_id: string
          is_active: boolean
          name_ar: string
          name_en: string
          posting_rule_id: string
          previous_version: number | null
          profile_id: string
          reason: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          effective_from: string
          evidence_ref?: string | null
          foundation_event_id: string
          is_active: boolean
          name_ar: string
          name_en: string
          posting_rule_id: string
          previous_version?: number | null
          profile_id: string
          reason: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          effective_from?: string
          evidence_ref?: string | null
          foundation_event_id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          posting_rule_id?: string
          previous_version?: number | null
          profile_id?: string
          reason?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_posting_rule_versi_profile_id_posting_rule_id_p_fkey"
            columns: ["profile_id", "posting_rule_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_posting_rule_versions"
            referencedColumns: ["profile_id", "posting_rule_id", "version"]
          },
          {
            foreignKeyName: "accounting_posting_rule_version_profile_id_posting_rule_id_fkey"
            columns: ["profile_id", "posting_rule_id"]
            isOneToOne: false
            referencedRelation: "accounting_posting_rules"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_posting_rule_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_posting_rule_versions_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_posting_rules: {
        Row: {
          created_at: string
          current_version: number
          id: string
          profile_id: string
          rule_code: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
          rule_code: string
        }
        Update: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
          rule_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_posting_rules_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_posting_rule_versions"
            referencedColumns: ["profile_id", "posting_rule_id", "version"]
          },
          {
            foreignKeyName: "accounting_posting_rules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_profile_versions: {
        Row: {
          accounting_start_date: string | null
          activation_state: string
          created_at: string
          created_by: string
          cutover_boundary_date: string | null
          effective_from: string
          endorsement_context: string
          evidence_ref: string | null
          fatoora_state: string
          fiscal_end_day: number
          fiscal_end_month: number
          fiscal_start_day: number
          fiscal_start_month: number
          fiscal_timezone: string
          foundation_event_id: string
          framework_edition: number
          framework_key: string
          functional_currency: string
          legal_fiscal_evidence_pending: boolean
          legal_fiscal_evidence_ref: string | null
          policy_version: string
          previous_version: number | null
          professional_validation_evidence_ref: string | null
          professional_validation_state: string
          profile_id: string
          reason: string
          vat_mode: string
          version: number
          zatca_state: string
        }
        Insert: {
          accounting_start_date?: string | null
          activation_state?: string
          created_at?: string
          created_by: string
          cutover_boundary_date?: string | null
          effective_from: string
          endorsement_context: string
          evidence_ref?: string | null
          fatoora_state?: string
          fiscal_end_day: number
          fiscal_end_month: number
          fiscal_start_day: number
          fiscal_start_month: number
          fiscal_timezone: string
          foundation_event_id: string
          framework_edition: number
          framework_key: string
          functional_currency: string
          legal_fiscal_evidence_pending?: boolean
          legal_fiscal_evidence_ref?: string | null
          policy_version: string
          previous_version?: number | null
          professional_validation_evidence_ref?: string | null
          professional_validation_state?: string
          profile_id: string
          reason: string
          vat_mode?: string
          version: number
          zatca_state?: string
        }
        Update: {
          accounting_start_date?: string | null
          activation_state?: string
          created_at?: string
          created_by?: string
          cutover_boundary_date?: string | null
          effective_from?: string
          endorsement_context?: string
          evidence_ref?: string | null
          fatoora_state?: string
          fiscal_end_day?: number
          fiscal_end_month?: number
          fiscal_start_day?: number
          fiscal_start_month?: number
          fiscal_timezone?: string
          foundation_event_id?: string
          framework_edition?: number
          framework_key?: string
          functional_currency?: string
          legal_fiscal_evidence_pending?: boolean
          legal_fiscal_evidence_ref?: string | null
          policy_version?: string
          previous_version?: number | null
          professional_validation_evidence_ref?: string | null
          professional_validation_state?: string
          profile_id?: string
          reason?: string
          vat_mode?: string
          version?: number
          zatca_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_profile_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_profile_versions_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_profile_versions_previous_fkey"
            columns: ["profile_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_profile_versions"
            referencedColumns: ["profile_id", "version"]
          },
          {
            foreignKeyName: "accounting_profile_versions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_profiles: {
        Row: {
          company_settings_id: string
          created_at: string
          current_version: number
          id: string
          singleton_key: string
        }
        Insert: {
          company_settings_id: string
          created_at?: string
          current_version?: number
          id?: string
          singleton_key?: string
        }
        Update: {
          company_settings_id?: string
          created_at?: string
          current_version?: number
          id?: string
          singleton_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_profiles_company_settings_fkey"
            columns: ["company_settings_id"]
            isOneToOne: true
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_profiles_current_version_fkey"
            columns: ["id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_profile_versions"
            referencedColumns: ["profile_id", "version"]
          },
        ]
      }
      accounting_revenue_arrangement_reviews: {
        Row: {
          arrangement_id: string
          arrangement_version: number
          decision: string
          foundation_event_id: string
          id: string
          profile_id: string
          reason: string
          recorded_at: string
          reviewer_user_id: string
        }
        Insert: {
          arrangement_id: string
          arrangement_version: number
          decision: string
          foundation_event_id: string
          id?: string
          profile_id: string
          reason: string
          recorded_at?: string
          reviewer_user_id: string
        }
        Update: {
          arrangement_id?: string
          arrangement_version?: number
          decision?: string
          foundation_event_id?: string
          id?: string
          profile_id?: string
          reason?: string
          recorded_at?: string
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_arrangemen_profile_id_arrangement_id_ar_fkey"
            columns: ["profile_id", "arrangement_id", "arrangement_version"]
            isOneToOne: true
            referencedRelation: "accounting_revenue_arrangement_versions"
            referencedColumns: ["profile_id", "arrangement_id", "version"]
          },
          {
            foreignKeyName: "accounting_revenue_arrangement_reviews_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: false
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_arrangement_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_revenue_arrangement_versions: {
        Row: {
          arrangement_id: string
          consideration_halalah: number
          created_at: string
          created_by: string
          currency: string
          foundation_event_id: string
          held_code: string | null
          modification_evidence_ref: string | null
          modification_evidence_sha256: string | null
          policy_version: string
          previous_version: number | null
          principal_agent_basis: string
          profile_id: string
          reason: string
          source_approved_at: string
          source_snapshot: Json
          source_snapshot_sha256: string
          status: string
          supersedes_arrangement_id: string | null
          units_snapshot: Json
          version: number
        }
        Insert: {
          arrangement_id: string
          consideration_halalah: number
          created_at?: string
          created_by: string
          currency: string
          foundation_event_id: string
          held_code?: string | null
          modification_evidence_ref?: string | null
          modification_evidence_sha256?: string | null
          policy_version: string
          previous_version?: number | null
          principal_agent_basis: string
          profile_id: string
          reason: string
          source_approved_at: string
          source_snapshot: Json
          source_snapshot_sha256: string
          status: string
          supersedes_arrangement_id?: string | null
          units_snapshot: Json
          version: number
        }
        Update: {
          arrangement_id?: string
          consideration_halalah?: number
          created_at?: string
          created_by?: string
          currency?: string
          foundation_event_id?: string
          held_code?: string | null
          modification_evidence_ref?: string | null
          modification_evidence_sha256?: string | null
          policy_version?: string
          previous_version?: number | null
          principal_agent_basis?: string
          profile_id?: string
          reason?: string
          source_approved_at?: string
          source_snapshot?: Json
          source_snapshot_sha256?: string
          status?: string
          supersedes_arrangement_id?: string | null
          units_snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_arrangemen_profile_id_arrangement_id_pr_fkey"
            columns: ["profile_id", "arrangement_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_arrangement_versions"
            referencedColumns: ["profile_id", "arrangement_id", "version"]
          },
          {
            foreignKeyName: "accounting_revenue_arrangemen_profile_id_supersedes_arrang_fkey"
            columns: ["profile_id", "supersedes_arrangement_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_arrangements"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_arrangement_v_profile_id_arrangement_id_fkey"
            columns: ["profile_id", "arrangement_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_arrangements"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_arrangement_version_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: false
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_arrangement_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_revenue_arrangements: {
        Row: {
          approved_billing_scope_id: string
          created_at: string
          current_version: number
          customer_id: string
          id: string
          profile_id: string
          service_id: string
        }
        Insert: {
          approved_billing_scope_id: string
          created_at?: string
          current_version?: number
          customer_id: string
          id?: string
          profile_id: string
          service_id: string
        }
        Update: {
          approved_billing_scope_id?: string
          created_at?: string
          current_version?: number
          customer_id?: string
          id?: string
          profile_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_arrangements_approved_billing_scope_id_fkey"
            columns: ["approved_billing_scope_id"]
            isOneToOne: false
            referencedRelation: "approved_billing_scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_arrangements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "accounting_revenue_arrangements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_arrangements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_arrangements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_revenue_performance_evidence: {
        Row: {
          arrangement_id: string
          created_at: string
          current_version: number
          evidence_key: string
          id: string
          profile_id: string
          unit_id: string
        }
        Insert: {
          arrangement_id: string
          created_at?: string
          current_version?: number
          evidence_key: string
          id?: string
          profile_id: string
          unit_id: string
        }
        Update: {
          arrangement_id?: string
          created_at?: string
          current_version?: number
          evidence_key?: string
          id?: string
          profile_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_performance_e_profile_id_arrangement_id_fkey"
            columns: ["profile_id", "arrangement_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_arrangements"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_performance_evidence_profile_id_unit_id_fkey"
            columns: ["profile_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_performance_units"
            referencedColumns: ["profile_id", "id"]
          },
        ]
      }
      accounting_revenue_performance_evidence_reviews: {
        Row: {
          decision: string
          evidence_id: string
          evidence_version: number
          foundation_event_id: string
          id: string
          profile_id: string
          reason: string
          recorded_at: string
          reviewer_user_id: string
        }
        Insert: {
          decision: string
          evidence_id: string
          evidence_version: number
          foundation_event_id: string
          id?: string
          profile_id: string
          reason: string
          recorded_at?: string
          reviewer_user_id: string
        }
        Update: {
          decision?: string
          evidence_id?: string
          evidence_version?: number
          foundation_event_id?: string
          id?: string
          profile_id?: string
          reason?: string
          recorded_at?: string
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_performanc_profile_id_evidence_id_evide_fkey"
            columns: ["profile_id", "evidence_id", "evidence_version"]
            isOneToOne: true
            referencedRelation: "accounting_revenue_performance_evidence_versions"
            referencedColumns: ["profile_id", "evidence_id", "version"]
          },
          {
            foreignKeyName: "accounting_revenue_performance_eviden_foundation_event_id_fkey1"
            columns: ["foundation_event_id"]
            isOneToOne: false
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_performance_evidence_r_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_revenue_performance_evidence_versions: {
        Row: {
          arrangement_id: string
          arrangement_version: number
          correction_amount_halalah: number | null
          correction_of_recognition_event_id: string | null
          created_at: string
          created_by: string
          evidence_basis: string
          evidence_id: string
          evidence_ref: string
          evidence_sha256: string
          foundation_event_id: string
          held_code: string | null
          performance_from: string
          performance_through: string
          previous_version: number | null
          profile_id: string
          rationale: string
          recognized_to_date_halalah: number | null
          status: string
          unit_id: string
          version: number
        }
        Insert: {
          arrangement_id: string
          arrangement_version: number
          correction_amount_halalah?: number | null
          correction_of_recognition_event_id?: string | null
          created_at?: string
          created_by: string
          evidence_basis: string
          evidence_id: string
          evidence_ref: string
          evidence_sha256: string
          foundation_event_id: string
          held_code?: string | null
          performance_from: string
          performance_through: string
          previous_version?: number | null
          profile_id: string
          rationale: string
          recognized_to_date_halalah?: number | null
          status: string
          unit_id: string
          version: number
        }
        Update: {
          arrangement_id?: string
          arrangement_version?: number
          correction_amount_halalah?: number | null
          correction_of_recognition_event_id?: string | null
          created_at?: string
          created_by?: string
          evidence_basis?: string
          evidence_id?: string
          evidence_ref?: string
          evidence_sha256?: string
          foundation_event_id?: string
          held_code?: string | null
          performance_from?: string
          performance_through?: string
          previous_version?: number | null
          profile_id?: string
          rationale?: string
          recognized_to_date_halalah?: number | null
          status?: string
          unit_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_performan_profile_id_arrangement_id_ar_fkey1"
            columns: ["profile_id", "arrangement_id", "arrangement_version"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_arrangement_versions"
            referencedColumns: ["profile_id", "arrangement_id", "version"]
          },
          {
            foreignKeyName: "accounting_revenue_performanc_profile_id_evidence_id_previ_fkey"
            columns: ["profile_id", "evidence_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_performance_evidence_versions"
            referencedColumns: ["profile_id", "evidence_id", "version"]
          },
          {
            foreignKeyName: "accounting_revenue_performance_evid_profile_id_evidence_id_fkey"
            columns: ["profile_id", "evidence_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_performance_evidence"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_performance_evidenc_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: false
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_performance_evidenc_profile_id_unit_id_fkey1"
            columns: ["profile_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_performance_units"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_performance_evidence_version_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_revenue_performance_unit_versions: {
        Row: {
          allocated_halalah: number
          arrangement_id: string
          arrangement_version: number
          created_at: string
          created_by: string
          foundation_event_id: string
          profile_id: string
          promised_output: string
          required_evidence_basis: string
          satisfaction_method: string
          source_allocations: Json
          unit_id: string
          version: number
        }
        Insert: {
          allocated_halalah: number
          arrangement_id: string
          arrangement_version: number
          created_at?: string
          created_by: string
          foundation_event_id: string
          profile_id: string
          promised_output: string
          required_evidence_basis: string
          satisfaction_method: string
          source_allocations: Json
          unit_id: string
          version: number
        }
        Update: {
          allocated_halalah?: number
          arrangement_id?: string
          arrangement_version?: number
          created_at?: string
          created_by?: string
          foundation_event_id?: string
          profile_id?: string
          promised_output?: string
          required_evidence_basis?: string
          satisfaction_method?: string
          source_allocations?: Json
          unit_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_performanc_profile_id_arrangement_id_ar_fkey"
            columns: ["profile_id", "arrangement_id", "arrangement_version"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_arrangement_versions"
            referencedColumns: ["profile_id", "arrangement_id", "version"]
          },
          {
            foreignKeyName: "accounting_revenue_performance_unit_ve_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: false
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_performance_unit_ver_profile_id_unit_id_fkey"
            columns: ["profile_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_performance_units"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_performance_unit_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_revenue_performance_units: {
        Row: {
          arrangement_id: string
          created_at: string
          current_version: number
          id: string
          profile_id: string
          unit_key: string
        }
        Insert: {
          arrangement_id: string
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
          unit_key: string
        }
        Update: {
          arrangement_id?: string
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
          unit_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_performance_u_profile_id_arrangement_id_fkey"
            columns: ["profile_id", "arrangement_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_arrangements"
            referencedColumns: ["profile_id", "id"]
          },
        ]
      }
      accounting_revenue_recognition_events: {
        Row: {
          accounting_date: string
          arrangement_id: string
          arrangement_version: number
          correction_of_recognition_event_id: string | null
          created_at: string
          customer_id: string
          economic_event_key: string
          evidence_id: string
          evidence_version: number
          expected_lines: Json
          foundation_event_id: string
          id: string
          performance_from: string
          performance_through: string
          prepared_by: string
          profile_id: string
          reason: string
          service_id: string
          signed_delta_halalah: number
          source_record_key: string
          source_snapshot: Json
          source_snapshot_sha256: string
          unit_id: string
        }
        Insert: {
          accounting_date: string
          arrangement_id: string
          arrangement_version: number
          correction_of_recognition_event_id?: string | null
          created_at?: string
          customer_id: string
          economic_event_key: string
          evidence_id: string
          evidence_version: number
          expected_lines: Json
          foundation_event_id: string
          id?: string
          performance_from: string
          performance_through: string
          prepared_by: string
          profile_id: string
          reason: string
          service_id: string
          signed_delta_halalah: number
          source_record_key: string
          source_snapshot: Json
          source_snapshot_sha256: string
          unit_id: string
        }
        Update: {
          accounting_date?: string
          arrangement_id?: string
          arrangement_version?: number
          correction_of_recognition_event_id?: string | null
          created_at?: string
          customer_id?: string
          economic_event_key?: string
          evidence_id?: string
          evidence_version?: number
          expected_lines?: Json
          foundation_event_id?: string
          id?: string
          performance_from?: string
          performance_through?: string
          prepared_by?: string
          profile_id?: string
          reason?: string
          service_id?: string
          signed_delta_halalah?: number
          source_record_key?: string
          source_snapshot?: Json
          source_snapshot_sha256?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_recognitio_profile_id_arrangement_id_ar_fkey"
            columns: ["profile_id", "arrangement_id", "arrangement_version"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_arrangement_versions"
            referencedColumns: ["profile_id", "arrangement_id", "version"]
          },
          {
            foreignKeyName: "accounting_revenue_recognitio_profile_id_correction_of_rec_fkey"
            columns: ["profile_id", "correction_of_recognition_event_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_recognition_events"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_recognitio_profile_id_evidence_id_evide_fkey"
            columns: ["profile_id", "evidence_id", "evidence_version"]
            isOneToOne: true
            referencedRelation: "accounting_revenue_performance_evidence_versions"
            referencedColumns: ["profile_id", "evidence_id", "version"]
          },
          {
            foreignKeyName: "accounting_revenue_recognition_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "accounting_revenue_recognition_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_recognition_events_foundation_event_id_fkey"
            columns: ["foundation_event_id"]
            isOneToOne: false
            referencedRelation: "accounting_foundation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_recognition_events_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_revenue_recognition_events_profile_id_unit_id_fkey"
            columns: ["profile_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_performance_units"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_recognition_events_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_revenue_recognition_journal_lines: {
        Row: {
          account_id: string
          account_version: number
          amount_halalah: number
          created_at: string
          customer_id: string
          journal_id: string
          journal_version: number
          line_number: number
          mapping_key: string
          party_role: string
          profile_id: string
          recognition_event_id: string
          service_id: string
          side: string
        }
        Insert: {
          account_id: string
          account_version: number
          amount_halalah: number
          created_at?: string
          customer_id: string
          journal_id: string
          journal_version: number
          line_number: number
          mapping_key: string
          party_role: string
          profile_id: string
          recognition_event_id: string
          service_id: string
          side: string
        }
        Update: {
          account_id?: string
          account_version?: number
          amount_halalah?: number
          created_at?: string
          customer_id?: string
          journal_id?: string
          journal_version?: number
          line_number?: number
          mapping_key?: string
          party_role?: string
          profile_id?: string
          recognition_event_id?: string
          service_id?: string
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_recogniti_profile_id_recognition_event_fkey1"
            columns: ["profile_id", "recognition_event_id"]
            isOneToOne: false
            referencedRelation: "accounting_revenue_recognition_events"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_recognition_jour_profile_id_journal_id_fkey1"
            columns: ["profile_id", "journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["profile_id", "id"]
          },
        ]
      }
      accounting_revenue_recognition_journal_links: {
        Row: {
          created_at: string
          journal_id: string
          prepared_version: number
          profile_id: string
          recognition_event_id: string
          source_effect_id: string
        }
        Insert: {
          created_at?: string
          journal_id: string
          prepared_version: number
          profile_id: string
          recognition_event_id: string
          source_effect_id: string
        }
        Update: {
          created_at?: string
          journal_id?: string
          prepared_version?: number
          profile_id?: string
          recognition_event_id?: string
          source_effect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_revenue_recognitio_profile_id_recognition_event_fkey"
            columns: ["profile_id", "recognition_event_id"]
            isOneToOne: true
            referencedRelation: "accounting_revenue_recognition_events"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_recognition_journ_profile_id_journal_id_fkey"
            columns: ["profile_id", "journal_id"]
            isOneToOne: true
            referencedRelation: "accounting_journals"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_revenue_recognition_journal_li_source_effect_id_fkey"
            columns: ["source_effect_id"]
            isOneToOne: true
            referencedRelation: "accounting_source_effects"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_source_effects: {
        Row: {
          created_at: string
          economic_event_key: string
          id: string
          journal_id: string
          journal_version: number
          payload_fingerprint: string
          posting_purpose: string
          profile_id: string
          source_domain: string
          source_record_key: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          economic_event_key: string
          id?: string
          journal_id: string
          journal_version: number
          payload_fingerprint: string
          posting_purpose: string
          profile_id: string
          source_domain: string
          source_record_key: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          economic_event_key?: string
          id?: string
          journal_id?: string
          journal_version?: number
          payload_fingerprint?: string
          posting_purpose?: string
          profile_id?: string
          source_domain?: string
          source_record_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_source_effects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_source_effects_profile_id_journal_id_journal_ve_fkey"
            columns: ["profile_id", "journal_id", "journal_version"]
            isOneToOne: false
            referencedRelation: "accounting_journal_versions"
            referencedColumns: ["profile_id", "journal_id", "version"]
          },
        ]
      }
      accounting_statement_mapping_entries: {
        Row: {
          account_id: string
          account_version: number
          display_order: number
          label_ar: string
          label_en: string
          line_key: string
          mapping_set_id: string
          mapping_version: number
          profile_id: string
          section_key: string
          statement_type: string
        }
        Insert: {
          account_id: string
          account_version: number
          display_order: number
          label_ar: string
          label_en: string
          line_key: string
          mapping_set_id: string
          mapping_version: number
          profile_id: string
          section_key: string
          statement_type: string
        }
        Update: {
          account_id?: string
          account_version?: number
          display_order?: number
          label_ar?: string
          label_en?: string
          line_key?: string
          mapping_set_id?: string
          mapping_version?: number
          profile_id?: string
          section_key?: string
          statement_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_statement_mapping__profile_id_account_id_accoun_fkey"
            columns: ["profile_id", "account_id", "account_version"]
            isOneToOne: false
            referencedRelation: "accounting_account_versions"
            referencedColumns: ["profile_id", "account_id", "version"]
          },
          {
            foreignKeyName: "accounting_statement_mapping__profile_id_mapping_set_id_ma_fkey"
            columns: ["profile_id", "mapping_set_id", "mapping_version"]
            isOneToOne: false
            referencedRelation: "accounting_statement_mapping_versions"
            referencedColumns: ["profile_id", "mapping_set_id", "version"]
          },
        ]
      }
      accounting_statement_mapping_sets: {
        Row: {
          created_at: string
          current_version: number
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          current_version?: number
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_statement_mapping_sets_current_version_fkey"
            columns: ["profile_id", "id", "current_version"]
            isOneToOne: false
            referencedRelation: "accounting_statement_mapping_versions"
            referencedColumns: ["profile_id", "mapping_set_id", "version"]
          },
          {
            foreignKeyName: "accounting_statement_mapping_sets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "accounting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_statement_mapping_versions: {
        Row: {
          created_at: string
          created_by: string
          effective_from: string
          evidence_ref: string
          mapping_set_id: string
          payload_fingerprint: string
          previous_version: number | null
          profile_id: string
          reason: string
          request_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          effective_from: string
          evidence_ref: string
          mapping_set_id: string
          payload_fingerprint: string
          previous_version?: number | null
          profile_id: string
          reason: string
          request_id: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          effective_from?: string
          evidence_ref?: string
          mapping_set_id?: string
          payload_fingerprint?: string
          previous_version?: number | null
          profile_id?: string
          reason?: string
          request_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_statement_mapping__profile_id_mapping_set_id_pr_fkey"
            columns: ["profile_id", "mapping_set_id", "previous_version"]
            isOneToOne: false
            referencedRelation: "accounting_statement_mapping_versions"
            referencedColumns: ["profile_id", "mapping_set_id", "version"]
          },
          {
            foreignKeyName: "accounting_statement_mapping_ver_profile_id_mapping_set_id_fkey"
            columns: ["profile_id", "mapping_set_id"]
            isOneToOne: false
            referencedRelation: "accounting_statement_mapping_sets"
            referencedColumns: ["profile_id", "id"]
          },
          {
            foreignKeyName: "accounting_statement_mapping_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_permission_overrides: {
        Row: {
          created_at: string
          created_by: string
          effect: string
          id: string
          permission: string
          updated_at: string
          updated_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          effect: string
          id?: string
          permission: string
          updated_at?: string
          updated_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          effect?: string
          id?: string
          permission?: string
          updated_at?: string
          updated_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_user_permission_overrides_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          clerk_user_id: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          locale: string
          name: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          clerk_user_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          locale?: string
          name?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          clerk_user_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          locale?: string
          name?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      approved_billing_scope_items: {
        Row: {
          accepted_grand_total: number
          accepted_qty: number
          accepted_subtotal: number
          accepted_unit_price: number
          accepted_vat_amount: number
          approved_billing_scope_id: string
          created_at: string
          decision: string
          display_order: number
          id: string
          reason_code: string | null
          reason_note: string | null
          source_category: string | null
          source_commercial_role: string
          source_description: string
          source_description_ar: string | null
          source_details: string | null
          source_discount_allocated: number
          source_grand_total: number
          source_is_selected: boolean
          source_parent_authority_line_id: string | null
          source_qty: number
          source_quotation_id: string
          source_quotation_item_id: string
          source_subtotal: number
          source_unit: string
          source_unit_price: number
          source_vat_amount: number
          updated_at: string
        }
        Insert: {
          accepted_grand_total?: number
          accepted_qty?: number
          accepted_subtotal?: number
          accepted_unit_price?: number
          accepted_vat_amount?: number
          approved_billing_scope_id: string
          created_at?: string
          decision: string
          display_order?: number
          id?: string
          reason_code?: string | null
          reason_note?: string | null
          source_category?: string | null
          source_commercial_role?: string
          source_description: string
          source_description_ar?: string | null
          source_details?: string | null
          source_discount_allocated?: number
          source_grand_total?: number
          source_is_selected?: boolean
          source_parent_authority_line_id?: string | null
          source_qty?: number
          source_quotation_id: string
          source_quotation_item_id: string
          source_subtotal?: number
          source_unit?: string
          source_unit_price?: number
          source_vat_amount?: number
          updated_at?: string
        }
        Update: {
          accepted_grand_total?: number
          accepted_qty?: number
          accepted_subtotal?: number
          accepted_unit_price?: number
          accepted_vat_amount?: number
          approved_billing_scope_id?: string
          created_at?: string
          decision?: string
          display_order?: number
          id?: string
          reason_code?: string | null
          reason_note?: string | null
          source_category?: string | null
          source_commercial_role?: string
          source_description?: string
          source_description_ar?: string | null
          source_details?: string | null
          source_discount_allocated?: number
          source_grand_total?: number
          source_is_selected?: boolean
          source_parent_authority_line_id?: string | null
          source_qty?: number
          source_quotation_id?: string
          source_quotation_item_id?: string
          source_subtotal?: number
          source_unit?: string
          source_unit_price?: number
          source_vat_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_billing_scope_items_approved_billing_scope_id_fkey"
            columns: ["approved_billing_scope_id"]
            isOneToOne: false
            referencedRelation: "approved_billing_scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_billing_scope_items_parent_source_fkey"
            columns: ["approved_billing_scope_id", "source_quotation_id"]
            isOneToOne: false
            referencedRelation: "approved_billing_scopes"
            referencedColumns: ["id", "source_quotation_id"]
          },
          {
            foreignKeyName: "approved_billing_scope_items_source_item_fkey"
            columns: ["source_quotation_item_id", "source_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_items"
            referencedColumns: ["id", "quotation_id"]
          },
        ]
      }
      approved_billing_scopes: {
        Row: {
          accepted_grand_total: number
          accepted_subtotal: number
          accepted_vat_amount: number
          approved_at: string | null
          approved_by: string | null
          change_summary_reason: string | null
          created_at: string
          created_by: string | null
          id: string
          line_safety_note: string | null
          line_safety_reason_code: string | null
          line_safety_reviewed_at: string | null
          line_safety_reviewed_by: string | null
          line_safety_status: string
          scope_version: number
          service_id: string
          source_currency: string
          source_discount: number
          source_pricing_context: Json
          source_quotation_grand_total: number
          source_quotation_id: string
          source_quotation_subtotal: number
          source_quotation_vat_amount: number
          source_vat_rate: number
          status: string
          superseded_at: string | null
          superseded_by_scope_id: string | null
          supersedes_scope_id: string | null
          updated_at: string
          updated_by: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          accepted_grand_total?: number
          accepted_subtotal?: number
          accepted_vat_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          change_summary_reason?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          line_safety_note?: string | null
          line_safety_reason_code?: string | null
          line_safety_reviewed_at?: string | null
          line_safety_reviewed_by?: string | null
          line_safety_status?: string
          scope_version: number
          service_id: string
          source_currency?: string
          source_discount?: number
          source_pricing_context?: Json
          source_quotation_grand_total?: number
          source_quotation_id: string
          source_quotation_subtotal?: number
          source_quotation_vat_amount?: number
          source_vat_rate?: number
          status: string
          superseded_at?: string | null
          superseded_by_scope_id?: string | null
          supersedes_scope_id?: string | null
          updated_at?: string
          updated_by?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          accepted_grand_total?: number
          accepted_subtotal?: number
          accepted_vat_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          change_summary_reason?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          line_safety_note?: string | null
          line_safety_reason_code?: string | null
          line_safety_reviewed_at?: string | null
          line_safety_reviewed_by?: string | null
          line_safety_status?: string
          scope_version?: number
          service_id?: string
          source_currency?: string
          source_discount?: number
          source_pricing_context?: Json
          source_quotation_grand_total?: number
          source_quotation_id?: string
          source_quotation_subtotal?: number
          source_quotation_vat_amount?: number
          source_vat_rate?: number
          status?: string
          superseded_at?: string | null
          superseded_by_scope_id?: string | null
          supersedes_scope_id?: string | null
          updated_at?: string
          updated_by?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_billing_scopes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_billing_scopes_source_quotation_service_fkey"
            columns: ["source_quotation_id", "service_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id", "service_id"]
          },
          {
            foreignKeyName: "approved_billing_scopes_superseded_by_scope_service_fkey"
            columns: ["superseded_by_scope_id", "service_id"]
            isOneToOne: false
            referencedRelation: "approved_billing_scopes"
            referencedColumns: ["id", "service_id"]
          },
          {
            foreignKeyName: "approved_billing_scopes_supersedes_scope_service_fkey"
            columns: ["supersedes_scope_id", "service_id"]
            isOneToOne: false
            referencedRelation: "approved_billing_scopes"
            referencedColumns: ["id", "service_id"]
          },
        ]
      }
      approved_commitment_amendments: {
        Row: {
          amendment_number: number
          amendment_type: string
          amount_delta: number
          approved_amount_after: number
          approved_at: string
          approved_by: string
          commitment_id: string
          created_at: string
          created_by: string
          evidence_ref: string
          id: string
          reason: string
        }
        Insert: {
          amendment_number: number
          amendment_type: string
          amount_delta: number
          approved_amount_after: number
          approved_at: string
          approved_by: string
          commitment_id: string
          created_at?: string
          created_by: string
          evidence_ref: string
          id?: string
          reason: string
        }
        Update: {
          amendment_number?: number
          amendment_type?: string
          amount_delta?: number
          approved_amount_after?: number
          approved_at?: string
          approved_by?: string
          commitment_id?: string
          created_at?: string
          created_by?: string
          evidence_ref?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_commitment_amendments_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "approved_commitment_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_commitment_amendments_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "approved_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_commitment_amendments_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_commitment_balances"
            referencedColumns: ["commitment_id"]
          },
        ]
      }
      approved_commitment_documents: {
        Row: {
          attached_at: string
          attached_by: string
          commitment_id: string
          document_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          commitment_id: string
          document_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          commitment_id?: string
          document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_commitment_documents_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "approved_commitment_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_commitment_documents_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "approved_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_commitment_documents_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_commitment_balances"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "approved_commitment_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_commitments: {
        Row: {
          approved_at: string
          approved_by: string
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          closed_at: string | null
          closed_by: string | null
          closed_reason: string | null
          commitment_source: string
          created_at: string
          created_by: string
          currency: string
          id: string
          original_approved_amount: number
          service_id: string
          source_reference: string | null
          status: string
          supplier_id: string
          supplier_quotation_id: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          approved_at: string
          approved_by: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          commitment_source: string
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          original_approved_amount: number
          service_id: string
          source_reference?: string | null
          status?: string
          supplier_id: string
          supplier_quotation_id?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          commitment_source?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          original_approved_amount?: number
          service_id?: string
          source_reference?: string | null
          status?: string
          supplier_id?: string
          supplier_quotation_id?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_commitments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_commitments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_commitments_supplier_quotation_fkey"
            columns: ["supplier_quotation_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_document_links: {
        Row: {
          created_at: string
          document_id: string
          link_purpose: string
          linked_by: string
          service_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          link_purpose: string
          linked_by: string
          service_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          link_purpose?: string
          linked_by?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_document_links_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_documents: {
        Row: {
          bucket_id: string
          created_at: string
          document_type: string
          file_size: number
          id: string
          mime_type: string
          object_path: string
          original_filename: string
          purpose: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          document_type: string
          file_size: number
          id?: string
          mime_type: string
          object_path: string
          original_filename: string
          purpose: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          document_type?: string
          file_size?: number
          id?: string
          mime_type?: string
          object_path?: string
          original_filename?: string
          purpose?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      cash_advance_expense_settlements: {
        Row: {
          amount: number
          cash_advance_id: string
          expense_id: string
          id: string
          notes: string | null
          request_id: string
          settled_at: string
          settled_by: string
        }
        Insert: {
          amount: number
          cash_advance_id: string
          expense_id: string
          id?: string
          notes?: string | null
          request_id: string
          settled_at?: string
          settled_by: string
        }
        Update: {
          amount?: number
          cash_advance_id?: string
          expense_id?: string
          id?: string
          notes?: string | null
          request_id?: string
          settled_at?: string
          settled_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_advance_expense_settlements_cash_advance_id_fkey"
            columns: ["cash_advance_id"]
            isOneToOne: false
            referencedRelation: "employee_cash_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_advance_expense_settlements_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_accountability_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_advance_expense_settlements_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_advance_expense_settlements_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_advance_returns: {
        Row: {
          amount: number
          cash_advance_id: string
          id: string
          notes: string | null
          receipt_reference: string | null
          request_id: string
          returned_at: string
          returned_by: string
        }
        Insert: {
          amount: number
          cash_advance_id: string
          id?: string
          notes?: string | null
          receipt_reference?: string | null
          request_id: string
          returned_at?: string
          returned_by: string
        }
        Update: {
          amount?: number
          cash_advance_id?: string
          id?: string
          notes?: string | null
          receipt_reference?: string | null
          request_id?: string
          returned_at?: string
          returned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_advance_returns_cash_advance_id_fkey"
            columns: ["cash_advance_id"]
            isOneToOne: false
            referencedRelation: "employee_cash_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_advance_returns_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          bank_account_holder: string
          bank_iban: string
          bank_name: string
          cr_number: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          default_terms: string | null
          default_vat_percent: number
          id: string
          legal_name_ar: string
          legal_name_en: string
          national_address: string
          official_email: string
          official_phone: string
          setting_key: string
          tin_number: string | null
          updated_at: string | null
          updated_by: string | null
          vat_effective_date: string | null
          vat_mode: string
          vat_number: string | null
        }
        Insert: {
          bank_account_holder: string
          bank_iban: string
          bank_name: string
          cr_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          default_terms?: string | null
          default_vat_percent?: number
          id?: string
          legal_name_ar: string
          legal_name_en: string
          national_address: string
          official_email: string
          official_phone: string
          setting_key?: string
          tin_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vat_effective_date?: string | null
          vat_mode?: string
          vat_number?: string | null
        }
        Update: {
          bank_account_holder?: string
          bank_iban?: string
          bank_name?: string
          cr_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          default_terms?: string | null
          default_vat_percent?: number
          id?: string
          legal_name_ar?: string
          legal_name_en?: string
          national_address?: string
          official_email?: string
          official_phone?: string
          setting_key?: string
          tin_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vat_effective_date?: string | null
          vat_mode?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      customer_credit_application_reversals: {
        Row: {
          amount: number
          business_date: string
          created_at: string
          created_by: string
          customer_id: string
          id: string
          reason: string
          request_id: string
          source_application_id: string
        }
        Insert: {
          amount: number
          business_date: string
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          reason: string
          request_id: string
          source_application_id: string
        }
        Update: {
          amount?: number
          business_date?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          reason?: string
          request_id?: string
          source_application_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_credit_application_reversal_source_application_id_fkey"
            columns: ["source_application_id"]
            isOneToOne: false
            referencedRelation: "customer_credit_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_application_reversals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_credit_application_reversals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credit_applications: {
        Row: {
          amount: number
          business_date: string
          created_at: string
          created_by: string
          customer_credit_balance_after: number
          customer_id: string
          id: string
          reason: string
          remaining_source_credit_after: number
          request_id: string
          source_credit_adjustment_id: string
          target_invoice_id: string
          target_outstanding_after: number
        }
        Insert: {
          amount: number
          business_date: string
          created_at?: string
          created_by: string
          customer_credit_balance_after: number
          customer_id: string
          id?: string
          reason: string
          remaining_source_credit_after: number
          request_id: string
          source_credit_adjustment_id: string
          target_invoice_id: string
          target_outstanding_after: number
        }
        Update: {
          amount?: number
          business_date?: string
          created_at?: string
          created_by?: string
          customer_credit_balance_after?: number
          customer_id?: string
          id?: string
          reason?: string
          remaining_source_credit_after?: number
          request_id?: string
          source_credit_adjustment_id?: string
          target_invoice_id?: string
          target_outstanding_after?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_credit_applications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_credit_applications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_applications_source_credit_adjustment_id_fkey"
            columns: ["source_credit_adjustment_id"]
            isOneToOne: false
            referencedRelation: "customer_credit_adjustment_balances"
            referencedColumns: ["credit_adjustment_id"]
          },
          {
            foreignKeyName: "customer_credit_applications_source_credit_adjustment_id_fkey"
            columns: ["source_credit_adjustment_id"]
            isOneToOne: false
            referencedRelation: "customer_internal_credit_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_applications_target_invoice_id_fkey"
            columns: ["target_invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_receivable_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "customer_credit_applications_target_invoice_id_fkey"
            columns: ["target_invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_settlement_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "customer_credit_applications_target_invoice_id_fkey"
            columns: ["target_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_internal_credit_adjustment_reversals: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          customer_id: string
          effective_date: string
          id: string
          reason: string
          request_id: string
          source_credit_adjustment_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          customer_id: string
          effective_date: string
          id?: string
          reason: string
          request_id: string
          source_credit_adjustment_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          customer_id?: string
          effective_date?: string
          id?: string
          reason?: string
          request_id?: string
          source_credit_adjustment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_internal_credit_adjus_source_credit_adjustment_id_fkey"
            columns: ["source_credit_adjustment_id"]
            isOneToOne: false
            referencedRelation: "customer_credit_adjustment_balances"
            referencedColumns: ["credit_adjustment_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjus_source_credit_adjustment_id_fkey"
            columns: ["source_credit_adjustment_id"]
            isOneToOne: false
            referencedRelation: "customer_internal_credit_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustment_reversals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustment_reversals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_internal_credit_adjustments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          customer_credit_balance_after: number
          customer_id: string
          effective_date: string
          id: string
          invoice_id: string
          net_receivable_after: number
          reason: string
          reason_code: string
          request_id: string
          service_id: string
          source_approved_billing_scope_id: string | null
          successor_approved_billing_scope_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          customer_credit_balance_after: number
          customer_id: string
          effective_date: string
          id?: string
          invoice_id: string
          net_receivable_after: number
          reason: string
          reason_code: string
          request_id: string
          service_id: string
          source_approved_billing_scope_id?: string | null
          successor_approved_billing_scope_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          customer_credit_balance_after?: number
          customer_id?: string
          effective_date?: string
          id?: string
          invoice_id?: string
          net_receivable_after?: number
          reason?: string
          reason_code?: string
          request_id?: string
          service_id?: string
          source_approved_billing_scope_id?: string | null
          successor_approved_billing_scope_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_internal_credit_adjustments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_receivable_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_settlement_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_source_scope_service_fkey"
            columns: ["source_approved_billing_scope_id", "service_id"]
            isOneToOne: false
            referencedRelation: "approved_billing_scopes"
            referencedColumns: ["id", "service_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_successor_scope_service_fk"
            columns: ["successor_approved_billing_scope_id", "service_id"]
            isOneToOne: false
            referencedRelation: "approved_billing_scopes"
            referencedColumns: ["id", "service_id"]
          },
        ]
      }
      customer_receipt_allocation_reversals: {
        Row: {
          allocation_id: string
          created_at: string
          id: string
          reason: string
          request_id: string
          reversed_at: string
          reversed_by: string
        }
        Insert: {
          allocation_id: string
          created_at?: string
          id?: string
          reason: string
          request_id: string
          reversed_at?: string
          reversed_by: string
        }
        Update: {
          allocation_id?: string
          created_at?: string
          id?: string
          reason?: string
          request_id?: string
          reversed_at?: string
          reversed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_receipt_allocation_reversals_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: true
            referencedRelation: "customer_receipt_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_receipt_allocations: {
        Row: {
          allocated_at: string
          allocated_by: string
          amount: number
          created_at: string
          customer_id: string
          id: string
          invoice_id: string
          payment_id: string
          request_id: string
        }
        Insert: {
          allocated_at?: string
          allocated_by: string
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          invoice_id: string
          payment_id: string
          request_id: string
        }
        Update: {
          allocated_at?: string
          allocated_by?: string
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          invoice_id?: string
          payment_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_receipt_allocations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_receivable_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_settlement_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "customer_receipt_balances"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_receipt_reversals: {
        Row: {
          created_at: string
          id: string
          payment_id: string
          reason: string
          request_id: string
          reversed_at: string
          reversed_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id: string
          reason: string
          request_id: string
          reversed_at?: string
          reversed_by: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string
          reason?: string
          request_id?: string
          reversed_at?: string
          reversed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_receipt_reversals_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "customer_receipt_balances"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "customer_receipt_reversals_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_refund_reversals: {
        Row: {
          amount: number
          business_date: string
          created_at: string
          created_by: string
          customer_id: string
          id: string
          reason: string
          request_id: string
          source_refund_id: string
        }
        Insert: {
          amount: number
          business_date: string
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          reason: string
          request_id: string
          source_refund_id: string
        }
        Update: {
          amount?: number
          business_date?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          reason?: string
          request_id?: string
          source_refund_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_refund_reversals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_refund_reversals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_refund_reversals_source_refund_id_fkey"
            columns: ["source_refund_id"]
            isOneToOne: false
            referencedRelation: "customer_refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_refunds: {
        Row: {
          amount: number
          business_date: string
          created_at: string
          created_by: string
          customer_credit_balance_after: number
          customer_id: string
          id: string
          reason: string
          reference: string | null
          refund_method: string
          remaining_source_credit_after: number
          request_id: string
          service_id: string
          source_credit_adjustment_id: string
        }
        Insert: {
          amount: number
          business_date: string
          created_at?: string
          created_by: string
          customer_credit_balance_after: number
          customer_id: string
          id?: string
          reason: string
          reference?: string | null
          refund_method: string
          remaining_source_credit_after: number
          request_id: string
          service_id: string
          source_credit_adjustment_id: string
        }
        Update: {
          amount?: number
          business_date?: string
          created_at?: string
          created_by?: string
          customer_credit_balance_after?: number
          customer_id?: string
          id?: string
          reason?: string
          reference?: string | null
          refund_method?: string
          remaining_source_credit_after?: number
          request_id?: string
          service_id?: string
          source_credit_adjustment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_refunds_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_refunds_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_refunds_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_refunds_source_credit_adjustment_id_fkey"
            columns: ["source_credit_adjustment_id"]
            isOneToOne: false
            referencedRelation: "customer_credit_adjustment_balances"
            referencedColumns: ["credit_adjustment_id"]
          },
          {
            foreignKeyName: "customer_refunds_source_credit_adjustment_id_fkey"
            columns: ["source_credit_adjustment_id"]
            isOneToOne: false
            referencedRelation: "customer_internal_credit_adjustments"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_email: string | null
          city: string
          commercial_registration_number: string | null
          company: string
          contact: string
          created_at: string | null
          created_by: string | null
          customer_number: string
          customer_type: string | null
          deleted_at: string | null
          email: string
          finance_contact_name: string | null
          finance_contact_phone: string | null
          id: string
          is_deleted: boolean | null
          legal_name: string | null
          mutation_key: string | null
          national_address_additional_number: string | null
          national_address_building_number: string | null
          national_address_city: string | null
          national_address_country: string | null
          national_address_district: string | null
          national_address_postal_code: string | null
          national_address_street: string | null
          payment_terms: string | null
          phone: string
          po_required: boolean
          projects_count: number | null
          revenue: number | null
          status: string
          updated_at: string | null
          updated_by: string | null
          vat_number: string | null
        }
        Insert: {
          billing_email?: string | null
          city: string
          commercial_registration_number?: string | null
          company: string
          contact: string
          created_at?: string | null
          created_by?: string | null
          customer_number: string
          customer_type?: string | null
          deleted_at?: string | null
          email: string
          finance_contact_name?: string | null
          finance_contact_phone?: string | null
          id?: string
          is_deleted?: boolean | null
          legal_name?: string | null
          mutation_key?: string | null
          national_address_additional_number?: string | null
          national_address_building_number?: string | null
          national_address_city?: string | null
          national_address_country?: string | null
          national_address_district?: string | null
          national_address_postal_code?: string | null
          national_address_street?: string | null
          payment_terms?: string | null
          phone: string
          po_required?: boolean
          projects_count?: number | null
          revenue?: number | null
          status: string
          updated_at?: string | null
          updated_by?: string | null
          vat_number?: string | null
        }
        Update: {
          billing_email?: string | null
          city?: string
          commercial_registration_number?: string | null
          company?: string
          contact?: string
          created_at?: string | null
          created_by?: string | null
          customer_number?: string
          customer_type?: string | null
          deleted_at?: string | null
          email?: string
          finance_contact_name?: string | null
          finance_contact_phone?: string | null
          id?: string
          is_deleted?: boolean | null
          legal_name?: string | null
          mutation_key?: string | null
          national_address_additional_number?: string | null
          national_address_building_number?: string | null
          national_address_city?: string | null
          national_address_country?: string | null
          national_address_district?: string | null
          national_address_postal_code?: string | null
          national_address_street?: string | null
          payment_terms?: string | null
          phone?: string
          po_required?: boolean
          projects_count?: number | null
          revenue?: number | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      employee_cash_advances: {
        Row: {
          advance_number: string
          amount_issued: number
          amount_returned: number
          amount_spent_settled: number
          approved_at: string | null
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          context_type: string
          created_at: string
          id: string
          issued_at: string | null
          issued_by: string | null
          payment_reference: string | null
          purpose: string
          recipient_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          remaining_balance: number | null
          requested_at: string
          requested_by: string
          service_id: string | null
          settled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advance_number: string
          amount_issued: number
          amount_returned?: number
          amount_spent_settled?: number
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          context_type: string
          created_at?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          payment_reference?: string | null
          purpose: string
          recipient_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remaining_balance?: number | null
          requested_at?: string
          requested_by: string
          service_id?: string | null
          settled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advance_number?: string
          amount_issued?: number
          amount_returned?: number
          amount_spent_settled?: number
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          context_type?: string
          created_at?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          payment_reference?: string | null
          purpose?: string
          recipient_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remaining_balance?: number | null
          requested_at?: string
          requested_by?: string
          service_id?: string | null
          settled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_cash_advances_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_cash_advances_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_cash_advances_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_cash_advances_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_cash_advances_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_cash_advances_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_cash_advances_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      event_cost_budgets: {
        Row: {
          approved_at: string
          approved_budget_cost: number | null
          approved_by: string
          base_budget_amount: number
          budget_version: number
          contingency_amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          reason: string
          request_id: string
          service_id: string
          source_reference: string | null
          superseded_at: string | null
          superseded_by: string | null
        }
        Insert: {
          approved_at?: string
          approved_budget_cost?: number | null
          approved_by: string
          base_budget_amount: number
          budget_version: number
          contingency_amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          reason: string
          request_id: string
          service_id: string
          source_reference?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
        }
        Update: {
          approved_at?: string
          approved_budget_cost?: number | null
          approved_by?: string
          base_budget_amount?: number
          budget_version?: number
          contingency_amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          reason?: string
          request_id?: string
          service_id?: string
          source_reference?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_cost_budgets_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      event_cost_close_reopenings: {
        Row: {
          event_cost_close_version_id: string
          id: string
          reason: string
          reopen_request_id: string
          reopened_at: string
          reopened_by: string
        }
        Insert: {
          event_cost_close_version_id: string
          id?: string
          reason: string
          reopen_request_id: string
          reopened_at?: string
          reopened_by: string
        }
        Update: {
          event_cost_close_version_id?: string
          id?: string
          reason?: string
          reopen_request_id?: string
          reopened_at?: string
          reopened_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_cost_close_reopenings_event_cost_close_version_id_fkey"
            columns: ["event_cost_close_version_id"]
            isOneToOne: true
            referencedRelation: "event_cost_close_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cost_close_reopenings_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_cost_close_versions: {
        Row: {
          accepted_commitment: number
          actual_cost: number
          approved_budget_cost: number | null
          approved_commitment: number
          base_budget: number | null
          budget_version: number | null
          close_request_id: string
          close_version: number
          closed_at: string
          closed_by: string
          commercial_source_id: string | null
          commercial_source_type: string | null
          commercial_source_version: string | null
          completeness_status: string
          contingency: number | null
          costing_snapshot: Json
          eac: number
          effective_date: string
          etc: number
          etc_version: number | null
          final_managerial_event_margin: number
          id: string
          net_approved_commercial_value: number
          open_commitment: number
          outstanding_cost: number
          paid_cost: number
          pending_commitment: number
          readiness_evidence: Json
          reason: string
          service_id: string
          source_counts: Json
        }
        Insert: {
          accepted_commitment: number
          actual_cost: number
          approved_budget_cost?: number | null
          approved_commitment: number
          base_budget?: number | null
          budget_version?: number | null
          close_request_id: string
          close_version: number
          closed_at?: string
          closed_by: string
          commercial_source_id?: string | null
          commercial_source_type?: string | null
          commercial_source_version?: string | null
          completeness_status: string
          contingency?: number | null
          costing_snapshot: Json
          eac: number
          effective_date: string
          etc: number
          etc_version?: number | null
          final_managerial_event_margin: number
          id?: string
          net_approved_commercial_value: number
          open_commitment: number
          outstanding_cost: number
          paid_cost: number
          pending_commitment: number
          readiness_evidence: Json
          reason: string
          service_id: string
          source_counts: Json
        }
        Update: {
          accepted_commitment?: number
          actual_cost?: number
          approved_budget_cost?: number | null
          approved_commitment?: number
          base_budget?: number | null
          budget_version?: number | null
          close_request_id?: string
          close_version?: number
          closed_at?: string
          closed_by?: string
          commercial_source_id?: string | null
          commercial_source_type?: string | null
          commercial_source_version?: string | null
          completeness_status?: string
          contingency?: number | null
          costing_snapshot?: Json
          eac?: number
          effective_date?: string
          etc?: number
          etc_version?: number | null
          final_managerial_event_margin?: number
          id?: string
          net_approved_commercial_value?: number
          open_commitment?: number
          outstanding_cost?: number
          paid_cost?: number
          pending_commitment?: number
          readiness_evidence?: Json
          reason?: string
          service_id?: string
          source_counts?: Json
        }
        Relationships: [
          {
            foreignKeyName: "event_cost_close_versions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cost_close_versions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      event_cost_etc_forecasts: {
        Row: {
          created_at: string
          etc_amount: number
          forecast_date: string
          forecast_version: number
          id: string
          notes: string | null
          reason: string
          recorded_at: string
          recorded_by: string
          request_id: string
          service_id: string
          superseded_at: string | null
          superseded_by: string | null
        }
        Insert: {
          created_at?: string
          etc_amount: number
          forecast_date: string
          forecast_version: number
          id?: string
          notes?: string | null
          reason: string
          recorded_at?: string
          recorded_by: string
          request_id: string
          service_id: string
          superseded_at?: string | null
          superseded_by?: string | null
        }
        Update: {
          created_at?: string
          etc_amount?: number
          forecast_date?: string
          forecast_version?: number
          id?: string
          notes?: string | null
          reason?: string
          recorded_at?: string
          recorded_by?: string
          request_id?: string
          service_id?: string
          superseded_at?: string | null
          superseded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_cost_etc_forecasts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_documents: {
        Row: {
          attached_at: string
          attached_by: string
          document_id: string
          expense_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          document_id: string
          expense_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          document_id?: string
          expense_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_documents_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_accountability_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_documents_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_evidence_exceptions: {
        Row: {
          accountable_owner_id: string
          created_at: string
          created_by: string
          disposed_at: string | null
          disposed_by: string | null
          disposition: string
          disposition_notes: string | null
          expense_id: string
          id: string
          reason: string
          review_before: string
          updated_at: string
        }
        Insert: {
          accountable_owner_id: string
          created_at?: string
          created_by: string
          disposed_at?: string | null
          disposed_by?: string | null
          disposition?: string
          disposition_notes?: string | null
          expense_id: string
          id?: string
          reason: string
          review_before: string
          updated_at?: string
        }
        Update: {
          accountable_owner_id?: string
          created_at?: string
          created_by?: string
          disposed_at?: string | null
          disposed_by?: string | null
          disposition?: string
          disposition_notes?: string | null
          expense_id?: string
          id?: string
          reason?: string
          review_before?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_evidence_exceptions_accountable_owner_id_fkey"
            columns: ["accountable_owner_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_evidence_exceptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_evidence_exceptions_disposed_by_fkey"
            columns: ["disposed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_evidence_exceptions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_accountability_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_evidence_exceptions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_reimbursement_settlements: {
        Row: {
          amount: number
          expense_id: string
          id: string
          notes: string | null
          payment_reference: string | null
          request_id: string
          settled_at: string
          settled_by: string
          settlement_method: string
          settlement_number: string
        }
        Insert: {
          amount: number
          expense_id: string
          id?: string
          notes?: string | null
          payment_reference?: string | null
          request_id: string
          settled_at?: string
          settled_by: string
          settlement_method: string
          settlement_number: string
        }
        Update: {
          amount?: number
          expense_id?: string
          id?: string
          notes?: string | null
          payment_reference?: string | null
          request_id?: string
          settled_at?: string
          settled_by?: string
          settlement_method?: string
          settlement_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_reimbursement_settlements_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_accountability_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reimbursement_settlements_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reimbursement_settlements_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_advance_id: string | null
          claimant_id: string | null
          context_type: string
          created_at: string
          currency: string
          description: string
          expense_category: string
          expense_date: string
          expense_number: string
          finance_reviewed_at: string | null
          finance_reviewed_by: string | null
          id: string
          origin_type: string
          payment_method: string
          petty_cash_fund_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          service_id: string | null
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_advance_id?: string | null
          claimant_id?: string | null
          context_type: string
          created_at?: string
          currency?: string
          description: string
          expense_category: string
          expense_date: string
          expense_number: string
          finance_reviewed_at?: string | null
          finance_reviewed_by?: string | null
          id?: string
          origin_type: string
          payment_method: string
          petty_cash_fund_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          service_id?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_advance_id?: string | null
          claimant_id?: string | null
          context_type?: string
          created_at?: string
          currency?: string
          description?: string
          expense_category?: string
          expense_date?: string
          expense_number?: string
          finance_reviewed_at?: string | null
          finance_reviewed_by?: string | null
          id?: string
          origin_type?: string
          payment_method?: string
          petty_cash_fund_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          service_id?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cash_advance_id_fkey"
            columns: ["cash_advance_id"]
            isOneToOne: false
            referencedRelation: "employee_cash_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_finance_reviewed_by_fkey"
            columns: ["finance_reviewed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_petty_cash_fund_id_fkey"
            columns: ["petty_cash_fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_draft_update_mutations: {
        Row: {
          created_at: string
          created_by: string
          due_date: string
          id: string
          invoice_id: string
          invoice_number: string
          mutation_key: string
          requested_amount: number
        }
        Insert: {
          created_at?: string
          created_by: string
          due_date: string
          id?: string
          invoice_id: string
          invoice_number: string
          mutation_key: string
          requested_amount: number
        }
        Update: {
          created_at?: string
          created_by?: string
          due_date?: string
          id?: string
          invoice_id?: string
          invoice_number?: string
          mutation_key?: string
          requested_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_draft_update_mutations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_receivable_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_draft_update_mutations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_settlement_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_draft_update_mutations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          details: string | null
          id: string
          invoice_id: string
          qty: number
          total: number
          unit_price: number
          updated_at: string | null
          vat: number
        }
        Insert: {
          created_at?: string | null
          description: string
          details?: string | null
          id?: string
          invoice_id: string
          qty?: number
          total?: number
          unit_price?: number
          updated_at?: string | null
          vat?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          details?: string | null
          id?: string
          invoice_id?: string
          qty?: number
          total?: number
          unit_price?: number
          updated_at?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_receivable_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_settlement_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          approved_billing_scope_id: string | null
          approved_quotation_id: string | null
          balance_due: number | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          date: string
          deleted_at: string | null
          document_label: string | null
          due_date: string
          grand_total: number | null
          id: string
          invoice_number: string
          invoice_type: string
          is_deleted: boolean | null
          issued_at: string | null
          mutation_key: string | null
          mutation_payload: Json | null
          service_id: string | null
          snapshot_bank_details: Json | null
          snapshot_buyer: Json | null
          snapshot_document_rules: Json | null
          snapshot_quotation: Json | null
          snapshot_seller: Json | null
          status: string
          subtotal: number | null
          updated_at: string | null
          updated_by: string | null
          vat_amount: number | null
          vat_mode: string | null
          vat_rate: number | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          approved_billing_scope_id?: string | null
          approved_quotation_id?: string | null
          balance_due?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          date: string
          deleted_at?: string | null
          document_label?: string | null
          due_date: string
          grand_total?: number | null
          id?: string
          invoice_number: string
          invoice_type: string
          is_deleted?: boolean | null
          issued_at?: string | null
          mutation_key?: string | null
          mutation_payload?: Json | null
          service_id?: string | null
          snapshot_bank_details?: Json | null
          snapshot_buyer?: Json | null
          snapshot_document_rules?: Json | null
          snapshot_quotation?: Json | null
          snapshot_seller?: Json | null
          status: string
          subtotal?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vat_amount?: number | null
          vat_mode?: string | null
          vat_rate?: number | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          approved_billing_scope_id?: string | null
          approved_quotation_id?: string | null
          balance_due?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          date?: string
          deleted_at?: string | null
          document_label?: string | null
          due_date?: string
          grand_total?: number | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          is_deleted?: boolean | null
          issued_at?: string | null
          mutation_key?: string | null
          mutation_payload?: Json | null
          service_id?: string | null
          snapshot_bank_details?: Json | null
          snapshot_buyer?: Json | null
          snapshot_document_rules?: Json | null
          snapshot_quotation?: Json | null
          snapshot_seller?: Json | null
          status?: string
          subtotal?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vat_amount?: number | null
          vat_mode?: string | null
          vat_rate?: number | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_approved_billing_scope_id_service_id_fkey"
            columns: ["approved_billing_scope_id", "service_id"]
            isOneToOne: false
            referencedRelation: "approved_billing_scopes"
            referencedColumns: ["id", "service_id"]
          },
          {
            foreignKeyName: "invoices_approved_quotation_id_service_id_fkey"
            columns: ["approved_quotation_id", "service_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id", "service_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["approved_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      number_sequences: {
        Row: {
          created_at: string | null
          example_format: string
          id: string
          prefix: string
          sequence: number
          type: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          example_format: string
          id?: string
          prefix: string
          sequence?: number
          type: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          example_format?: string
          id?: string
          prefix?: string
          sequence?: number
          type?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          customer_id: string
          date: string
          deleted_at: string | null
          id: string
          invoice_amount_paid_after: number | null
          invoice_balance_due_after: number | null
          invoice_id: string | null
          invoice_status_after: string | null
          is_deleted: boolean | null
          method: string
          notes: string | null
          payment_number: string
          reference: string | null
          request_id: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          date: string
          deleted_at?: string | null
          id?: string
          invoice_amount_paid_after?: number | null
          invoice_balance_due_after?: number | null
          invoice_id?: string | null
          invoice_status_after?: string | null
          is_deleted?: boolean | null
          method: string
          notes?: string | null
          payment_number: string
          reference?: string | null
          request_id?: string | null
          status: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          date?: string
          deleted_at?: string | null
          id?: string
          invoice_amount_paid_after?: number | null
          invoice_balance_due_after?: number | null
          invoice_id?: string | null
          invoice_status_after?: string | null
          is_deleted?: boolean | null
          method?: string
          notes?: string | null
          payment_number?: string
          reference?: string | null
          request_id?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_receivable_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_settlement_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_funds: {
        Row: {
          created_at: string
          current_balance: number
          custodian_id: string
          float_limit: number
          fund_name: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          custodian_id: string
          float_limit: number
          fund_name: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          custodian_id?: string
          float_limit?: number
          fund_name?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_funds_custodian_id_fkey"
            columns: ["custodian_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          expense_id: string | null
          fund_id: string
          id: string
          notes: string | null
          recorded_at: string
          recorded_by: string
          reference: string | null
          request_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          expense_id?: string | null
          fund_id: string
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by: string
          reference?: string | null
          request_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          expense_id?: string | null
          fund_id?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string
          reference?: string | null
          request_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_transactions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_accountability_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          status: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          end_date: string
          id: string
          is_deleted: boolean | null
          manager: string | null
          name: string
          project_number: string
          quotation_id: string | null
          start_date: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          end_date: string
          id?: string
          is_deleted?: boolean | null
          manager?: string | null
          name: string
          project_number: string
          quotation_id?: string | null
          start_date: string
          status: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          end_date?: string
          id?: string
          is_deleted?: boolean | null
          manager?: string | null
          name?: string
          project_number?: string
          quotation_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          category: string
          commercial_role: string
          created_at: string | null
          description: string
          description_ar: string | null
          details: string | null
          discount_allocated: number
          id: string
          is_selected: boolean
          parent_authority_line_id: string | null
          qty: number
          quotation_id: string
          total: number
          unit: string
          unit_price: number
          updated_at: string | null
          vat: number
        }
        Insert: {
          category: string
          commercial_role?: string
          created_at?: string | null
          description: string
          description_ar?: string | null
          details?: string | null
          discount_allocated?: number
          id?: string
          is_selected?: boolean
          parent_authority_line_id?: string | null
          qty?: number
          quotation_id: string
          total?: number
          unit?: string
          unit_price?: number
          updated_at?: string | null
          vat?: number
        }
        Update: {
          category?: string
          commercial_role?: string
          created_at?: string | null
          description?: string
          description_ar?: string | null
          details?: string | null
          discount_allocated?: number
          id?: string
          is_selected?: boolean
          parent_authority_line_id?: string | null
          qty?: number
          quotation_id?: string
          total?: number
          unit?: string
          unit_price?: number
          updated_at?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_parent_authority_line_fkey"
            columns: ["parent_authority_line_id", "quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_items"
            referencedColumns: ["id", "quotation_id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          amendment_approval_key: string | null
          amendment_approval_payload: Json | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          date: string
          deleted_at: string | null
          discount: number | null
          event: string
          event_snapshot: Json | null
          grand_total: number | null
          id: string
          is_deleted: boolean | null
          mutation_key: string | null
          mutation_payload: Json | null
          quotation_family_id: string
          quotation_number: string
          revision_number: number
          revision_of_quotation_id: string | null
          revision_reason: string | null
          service_id: string
          snapshot_buyer: Json
          snapshot_seller: Json
          status: string
          subtotal: number | null
          superseded_at: string | null
          superseded_by_quotation_id: string | null
          updated_at: string | null
          updated_by: string | null
          valid_until: string
          vat_amount: number | null
          vat_rate: number
        }
        Insert: {
          amendment_approval_key?: string | null
          amendment_approval_payload?: Json | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          date: string
          deleted_at?: string | null
          discount?: number | null
          event: string
          event_snapshot?: Json | null
          grand_total?: number | null
          id?: string
          is_deleted?: boolean | null
          mutation_key?: string | null
          mutation_payload?: Json | null
          quotation_family_id?: string
          quotation_number: string
          revision_number?: number
          revision_of_quotation_id?: string | null
          revision_reason?: string | null
          service_id: string
          snapshot_buyer: Json
          snapshot_seller: Json
          status: string
          subtotal?: number | null
          superseded_at?: string | null
          superseded_by_quotation_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valid_until: string
          vat_amount?: number | null
          vat_rate?: number
        }
        Update: {
          amendment_approval_key?: string | null
          amendment_approval_payload?: Json | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          date?: string
          deleted_at?: string | null
          discount?: number | null
          event?: string
          event_snapshot?: Json | null
          grand_total?: number | null
          id?: string
          is_deleted?: boolean | null
          mutation_key?: string | null
          mutation_payload?: Json | null
          quotation_family_id?: string
          quotation_number?: string
          revision_number?: number
          revision_of_quotation_id?: string | null
          revision_reason?: string | null
          service_id?: string
          snapshot_buyer?: Json
          snapshot_seller?: Json
          status?: string
          subtotal?: number | null
          superseded_at?: string | null
          superseded_by_quotation_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valid_until?: string
          vat_amount?: number | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_quotations_service_id"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_revision_source_family_fkey"
            columns: ["revision_of_quotation_id", "quotation_family_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id", "quotation_family_id"]
          },
          {
            foreignKeyName: "quotations_superseded_by_service_fkey"
            columns: ["superseded_by_quotation_id", "service_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id", "service_id"]
          },
        ]
      }
      service_lifecycle_states: {
        Row: {
          close_state: string
          commercial_state: string
          completion_state: string
          created_at: string
          execution_state: string
          legacy_status: string
          mapping_version: string
          payment_state: string
          readiness_state: string
          service_id: string
          start_gate_basis: string | null
          state_version: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          close_state: string
          commercial_state: string
          completion_state: string
          created_at?: string
          execution_state: string
          legacy_status: string
          mapping_version?: string
          payment_state: string
          readiness_state: string
          service_id: string
          start_gate_basis?: string | null
          state_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          close_state?: string
          commercial_state?: string
          completion_state?: string
          created_at?: string
          execution_state?: string
          legacy_status?: string
          mapping_version?: string
          payment_state?: string
          readiness_state?: string
          service_id?: string
          start_gate_basis?: string | null
          state_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_lifecycle_states_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_procurement_candidate_documents: {
        Row: {
          attached_at: string
          attached_by: string
          document_id: string
          requirement_id: string
          supplier_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          document_id: string
          requirement_id: string
          supplier_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          document_id?: string
          requirement_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_procurement_candidate_documents_candidate_fkey"
            columns: ["requirement_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "service_procurement_candidates"
            referencedColumns: ["requirement_id", "supplier_id"]
          },
          {
            foreignKeyName: "service_procurement_candidate_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      service_procurement_candidates: {
        Row: {
          comparison_notes: string | null
          created_at: string
          created_by: string
          currency: string
          evidence_ref: string
          offer_summary: string
          quoted_amount: number | null
          requirement_id: string
          supplier_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          comparison_notes?: string | null
          created_at?: string
          created_by: string
          currency?: string
          evidence_ref: string
          offer_summary: string
          quoted_amount?: number | null
          requirement_id: string
          supplier_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          comparison_notes?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          evidence_ref?: string
          offer_summary?: string
          quoted_amount?: number | null
          requirement_id?: string
          supplier_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_procurement_candidates_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "service_procurement_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_procurement_candidates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_procurement_package_requirements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          legacy_requirement_id: string | null
          package_id: string
          requirement_key: string | null
          retired_at: string | null
          retired_by: string | null
          service_id: string
          sort_order: number
          specifications: string | null
          title: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          legacy_requirement_id?: string | null
          package_id: string
          requirement_key?: string | null
          retired_at?: string | null
          retired_by?: string | null
          service_id: string
          sort_order?: number
          specifications?: string | null
          title: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          legacy_requirement_id?: string | null
          package_id?: string
          requirement_key?: string | null
          retired_at?: string | null
          retired_by?: string | null
          service_id?: string
          sort_order?: number
          specifications?: string | null
          title?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_procurement_package_requirem_legacy_requirement_id_fkey"
            columns: ["legacy_requirement_id"]
            isOneToOne: false
            referencedRelation: "service_procurement_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_procurement_package_requirements_package_fkey"
            columns: ["package_id", "service_id"]
            isOneToOne: false
            referencedRelation: "service_procurement_packages"
            referencedColumns: ["id", "service_id"]
          },
          {
            foreignKeyName: "service_procurement_package_requirements_service_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_procurement_packages: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          procurement_method: string | null
          selected_at: string | null
          selected_by: string | null
          selected_supplier_id: string | null
          selected_supplier_quotation_id: string | null
          selection_evidence: string | null
          selection_reason: string | null
          service_id: string
          status: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          procurement_method?: string | null
          selected_at?: string | null
          selected_by?: string | null
          selected_supplier_id?: string | null
          selected_supplier_quotation_id?: string | null
          selection_evidence?: string | null
          selection_reason?: string | null
          service_id: string
          status?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          procurement_method?: string | null
          selected_at?: string | null
          selected_by?: string | null
          selected_supplier_id?: string | null
          selected_supplier_quotation_id?: string | null
          selection_evidence?: string | null
          selection_reason?: string | null
          service_id?: string
          status?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_procurement_packages_quotation_fkey"
            columns: [
              "selected_supplier_quotation_id",
              "service_id",
              "selected_supplier_id",
            ]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
          {
            foreignKeyName: "service_procurement_packages_selected_supplier_id_fkey"
            columns: ["selected_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_procurement_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_procurement_requirements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          requirement: string
          selected_at: string | null
          selected_by: string | null
          selected_supplier_id: string | null
          selection_evidence: string | null
          selection_reason: string | null
          selection_status: string
          service_id: string
          sourcing_evidence: string
          sourcing_path: string
          sourcing_reason: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          requirement: string
          selected_at?: string | null
          selected_by?: string | null
          selected_supplier_id?: string | null
          selection_evidence?: string | null
          selection_reason?: string | null
          selection_status?: string
          service_id: string
          sourcing_evidence: string
          sourcing_path: string
          sourcing_reason: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          requirement?: string
          selected_at?: string | null
          selected_by?: string | null
          selected_supplier_id?: string | null
          selection_evidence?: string | null
          selection_reason?: string | null
          selection_status?: string
          service_id?: string
          sourcing_evidence?: string
          sourcing_path?: string
          sourcing_reason?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_procurement_requirements_selected_supplier_id_fkey"
            columns: ["selected_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_procurement_requirements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_receipt_corrections: {
        Row: {
          corrected_acceptance_status: string
          corrected_at: string
          corrected_by: string
          corrected_conditions_notes: string | null
          corrected_received_amount: number | null
          correction_number: number
          correction_reason: string
          created_at: string
          created_by: string
          id: string
          prior_acceptance_status: string
          prior_conditions_notes: string | null
          prior_decision_at: string
          prior_decision_by: string
          prior_received_amount: number | null
          receipt_id: string
          request_id: string
        }
        Insert: {
          corrected_acceptance_status: string
          corrected_at: string
          corrected_by: string
          corrected_conditions_notes?: string | null
          corrected_received_amount?: number | null
          correction_number: number
          correction_reason: string
          created_at?: string
          created_by: string
          id?: string
          prior_acceptance_status: string
          prior_conditions_notes?: string | null
          prior_decision_at: string
          prior_decision_by: string
          prior_received_amount?: number | null
          receipt_id: string
          request_id: string
        }
        Update: {
          corrected_acceptance_status?: string
          corrected_at?: string
          corrected_by?: string
          corrected_conditions_notes?: string | null
          corrected_received_amount?: number | null
          correction_number?: number
          correction_reason?: string
          created_at?: string
          created_by?: string
          id?: string
          prior_acceptance_status?: string
          prior_conditions_notes?: string | null
          prior_decision_at?: string
          prior_decision_by?: string
          prior_received_amount?: number | null
          receipt_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_receipt_corrections_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "service_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_receipt_documents: {
        Row: {
          attached_at: string
          attached_by: string
          document_id: string
          receipt_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          document_id: string
          receipt_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          document_id?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_receipt_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_receipt_documents_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "service_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_receipts: {
        Row: {
          acceptance_status: string
          actual_hours: number | null
          actual_quantity: number | null
          commitment_id: string
          conditions_notes: string | null
          created_at: string
          created_by: string
          defects_incidents: string | null
          delivered_scope: string
          extra_scope: string | null
          id: string
          missing_scope: string | null
          performance_date: string
          quantity_unit: string | null
          received_amount: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_id: string
          submitted_at: string
          submitted_by: string
          supplier_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          acceptance_status?: string
          actual_hours?: number | null
          actual_quantity?: number | null
          commitment_id: string
          conditions_notes?: string | null
          created_at?: string
          created_by: string
          defects_incidents?: string | null
          delivered_scope: string
          extra_scope?: string | null
          id?: string
          missing_scope?: string | null
          performance_date: string
          quantity_unit?: string | null
          received_amount?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id: string
          submitted_at?: string
          submitted_by: string
          supplier_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          acceptance_status?: string
          actual_hours?: number | null
          actual_quantity?: number | null
          commitment_id?: string
          conditions_notes?: string | null
          created_at?: string
          created_by?: string
          defects_incidents?: string | null
          delivered_scope?: string
          extra_scope?: string | null
          id?: string
          missing_scope?: string | null
          performance_date?: string
          quantity_unit?: string | null
          received_amount?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string
          submitted_at?: string
          submitted_by?: string
          supplier_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_receipts_commitment_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "approved_commitment_balances"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
          {
            foreignKeyName: "service_receipts_commitment_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "approved_commitments"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
          {
            foreignKeyName: "service_receipts_commitment_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_commitment_balances"
            referencedColumns: ["commitment_id", "service_id", "supplier_id"]
          },
        ]
      }
      service_supplier_allocations: {
        Row: {
          approved_quotation_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          category: string
          cost_source: string
          created_at: string
          created_by: string | null
          currency: string
          estimated_total_cost: number | null
          estimated_unit_cost: number
          id: string
          internal_notes: string | null
          is_deleted: boolean
          item_name: string
          quantity: number
          rate_card_snapshot: Json | null
          scope_of_work: string | null
          service_id: string
          status: string
          supplier_id: string
          supplier_rate_card_id: string | null
          unit: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_quotation_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          category: string
          cost_source: string
          created_at?: string
          created_by?: string | null
          currency?: string
          estimated_total_cost?: number | null
          estimated_unit_cost: number
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          item_name: string
          quantity: number
          rate_card_snapshot?: Json | null
          scope_of_work?: string | null
          service_id: string
          status?: string
          supplier_id: string
          supplier_rate_card_id?: string | null
          unit: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_quotation_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          category?: string
          cost_source?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          estimated_total_cost?: number | null
          estimated_unit_cost?: number
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          item_name?: string
          quantity?: number
          rate_card_snapshot?: Json | null
          scope_of_work?: string | null
          service_id?: string
          status?: string
          supplier_id?: string
          supplier_rate_card_id?: string | null
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_supplier_allocations_approved_quotation_id_fkey"
            columns: ["approved_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_supplier_allocations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_supplier_allocations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_supplier_allocations_supplier_rate_card_id_fkey"
            columns: ["supplier_rate_card_id"]
            isOneToOne: false
            referencedRelation: "supplier_rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          description: string | null
          estimated_budget: number | null
          event_end_date: string | null
          event_location: string | null
          event_name: string | null
          event_start_date: string | null
          event_type: string | null
          id: string
          mutation_key: string | null
          sales_owner_id: string | null
          service_number: string
          service_title: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          description?: string | null
          estimated_budget?: number | null
          event_end_date?: string | null
          event_location?: string | null
          event_name?: string | null
          event_start_date?: string | null
          event_type?: string | null
          id?: string
          mutation_key?: string | null
          sales_owner_id?: string | null
          service_number: string
          service_title: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          description?: string | null
          estimated_budget?: number | null
          event_end_date?: string | null
          event_location?: string | null
          event_name?: string | null
          event_start_date?: string | null
          event_type?: string | null
          id?: string
          mutation_key?: string | null
          sales_owner_id?: string | null
          service_number?: string
          service_title?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "services_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advance_allocation_reversals: {
        Row: {
          corrected_at: string
          corrected_by: string
          correction_request_id: string
          id: string
          reason: string
          supplier_advance_allocation_id: string
        }
        Insert: {
          corrected_at?: string
          corrected_by: string
          correction_request_id: string
          id?: string
          reason: string
          supplier_advance_allocation_id: string
        }
        Update: {
          corrected_at?: string
          corrected_by?: string
          correction_request_id?: string
          id?: string
          reason?: string
          supplier_advance_allocation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advance_allocation_r_supplier_advance_allocation__fkey"
            columns: ["supplier_advance_allocation_id"]
            isOneToOne: true
            referencedRelation: "supplier_advance_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_allocation_reversals_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advance_allocations: {
        Row: {
          allocated_at: string
          allocated_by: string
          allocation_number: string
          allocation_request_id: string
          amount: number
          id: string
          supplier_advance_id: string
          supplier_bill_id: string
        }
        Insert: {
          allocated_at?: string
          allocated_by: string
          allocation_number: string
          allocation_request_id: string
          amount: number
          id?: string
          supplier_advance_id: string
          supplier_bill_id: string
        }
        Update: {
          allocated_at?: string
          allocated_by?: string
          allocation_number?: string
          allocation_request_id?: string
          amount?: number
          id?: string
          supplier_advance_id?: string
          supplier_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advance_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_allocations_supplier_advance_id_fkey"
            columns: ["supplier_advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_balances"
            referencedColumns: ["supplier_advance_id"]
          },
          {
            foreignKeyName: "supplier_advance_allocations_supplier_advance_id_fkey"
            columns: ["supplier_advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_allocations_supplier_bill_id_fkey"
            columns: ["supplier_bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bill_payment_balances"
            referencedColumns: ["supplier_bill_id"]
          },
          {
            foreignKeyName: "supplier_advance_allocations_supplier_bill_id_fkey"
            columns: ["supplier_bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advance_authorization_documents: {
        Row: {
          attached_at: string
          attached_by: string
          content_sha256: string
          document_id: string
          supplier_advance_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          content_sha256: string
          document_id: string
          supplier_advance_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          content_sha256?: string
          document_id?: string
          supplier_advance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advance_authorization_documen_supplier_advance_id_fkey"
            columns: ["supplier_advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_balances"
            referencedColumns: ["supplier_advance_id"]
          },
          {
            foreignKeyName: "supplier_advance_authorization_documen_supplier_advance_id_fkey"
            columns: ["supplier_advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_authorization_documents_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_authorization_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advance_authorization_releases: {
        Row: {
          id: string
          reason: string
          release_request_id: string
          released_at: string
          released_by: string
          supplier_advance_id: string
        }
        Insert: {
          id?: string
          reason: string
          release_request_id: string
          released_at?: string
          released_by: string
          supplier_advance_id: string
        }
        Update: {
          id?: string
          reason?: string
          release_request_id?: string
          released_at?: string
          released_by?: string
          supplier_advance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advance_authorization_release_supplier_advance_id_fkey"
            columns: ["supplier_advance_id"]
            isOneToOne: true
            referencedRelation: "supplier_advance_balances"
            referencedColumns: ["supplier_advance_id"]
          },
          {
            foreignKeyName: "supplier_advance_authorization_release_supplier_advance_id_fkey"
            columns: ["supplier_advance_id"]
            isOneToOne: true
            referencedRelation: "supplier_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_authorization_releases_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advance_payment_documents: {
        Row: {
          attached_at: string
          attached_by: string
          content_sha256: string
          document_id: string
          supplier_advance_payment_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          content_sha256: string
          document_id: string
          supplier_advance_payment_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          content_sha256?: string
          document_id?: string
          supplier_advance_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advance_payment_docum_supplier_advance_payment_id_fkey"
            columns: ["supplier_advance_payment_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_payment_documents_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_payment_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advance_payment_reversals: {
        Row: {
          id: string
          reason: string
          reversal_request_id: string
          reversed_at: string
          reversed_by: string
          supplier_advance_payment_id: string
        }
        Insert: {
          id?: string
          reason: string
          reversal_request_id: string
          reversed_at?: string
          reversed_by: string
          supplier_advance_payment_id: string
        }
        Update: {
          id?: string
          reason?: string
          reversal_request_id?: string
          reversed_at?: string
          reversed_by?: string
          supplier_advance_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advance_payment_rever_supplier_advance_payment_id_fkey"
            columns: ["supplier_advance_payment_id"]
            isOneToOne: true
            referencedRelation: "supplier_advance_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_payment_reversals_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advance_payments: {
        Row: {
          amount: number
          bank_account_name_snapshot: string | null
          bank_name_snapshot: string | null
          iban_snapshot: string | null
          id: string
          method: string
          notes: string | null
          payment_date: string
          payment_number: string
          record_request_id: string
          recorded_at: string
          recorded_by: string
          reference: string | null
          service_id: string
          supplier_advance_id: string
          supplier_id: string
        }
        Insert: {
          amount: number
          bank_account_name_snapshot?: string | null
          bank_name_snapshot?: string | null
          iban_snapshot?: string | null
          id?: string
          method: string
          notes?: string | null
          payment_date: string
          payment_number: string
          record_request_id: string
          recorded_at?: string
          recorded_by: string
          reference?: string | null
          service_id: string
          supplier_advance_id: string
          supplier_id: string
        }
        Update: {
          amount?: number
          bank_account_name_snapshot?: string | null
          bank_name_snapshot?: string | null
          iban_snapshot?: string | null
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          payment_number?: string
          record_request_id?: string
          recorded_at?: string
          recorded_by?: string
          reference?: string | null
          service_id?: string
          supplier_advance_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advance_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_payments_supplier_advance_id_fkey"
            columns: ["supplier_advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_balances"
            referencedColumns: ["supplier_advance_id"]
          },
          {
            foreignKeyName: "supplier_advance_payments_supplier_advance_id_fkey"
            columns: ["supplier_advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advance_refund_documents: {
        Row: {
          attached_at: string
          attached_by: string
          content_sha256: string
          document_id: string
          supplier_advance_refund_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          content_sha256: string
          document_id: string
          supplier_advance_refund_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          content_sha256?: string
          document_id?: string
          supplier_advance_refund_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advance_refund_documen_supplier_advance_refund_id_fkey"
            columns: ["supplier_advance_refund_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_refunds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_refund_documents_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_refund_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advance_refunds: {
        Row: {
          amount: number
          business_date: string
          evidence_sha256: string
          id: string
          reason: string
          record_request_id: string
          recorded_at: string
          recorded_by: string
          reference: string | null
          refund_number: string
          supplier_advance_id: string
        }
        Insert: {
          amount: number
          business_date: string
          evidence_sha256: string
          id?: string
          reason: string
          record_request_id: string
          recorded_at?: string
          recorded_by: string
          reference?: string | null
          refund_number: string
          supplier_advance_id: string
        }
        Update: {
          amount?: number
          business_date?: string
          evidence_sha256?: string
          id?: string
          reason?: string
          record_request_id?: string
          recorded_at?: string
          recorded_by?: string
          reference?: string | null
          refund_number?: string
          supplier_advance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advance_refunds_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advance_refunds_supplier_advance_id_fkey"
            columns: ["supplier_advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_balances"
            referencedColumns: ["supplier_advance_id"]
          },
          {
            foreignKeyName: "supplier_advance_refunds_supplier_advance_id_fkey"
            columns: ["supplier_advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advances"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advances: {
        Row: {
          advance_number: string
          authorization_request_id: string
          authorized_amount: number
          authorized_at: string
          authorized_by: string
          commitment_id: string
          created_at: string
          currency: string
          evidence_sha256: string
          id: string
          reason: string
          service_id: string
          supplier_id: string
        }
        Insert: {
          advance_number: string
          authorization_request_id: string
          authorized_amount: number
          authorized_at?: string
          authorized_by: string
          commitment_id: string
          created_at?: string
          currency: string
          evidence_sha256: string
          id?: string
          reason: string
          service_id: string
          supplier_id: string
        }
        Update: {
          advance_number?: string
          authorization_request_id?: string
          authorized_amount?: number
          authorized_at?: string
          authorized_by?: string
          commitment_id?: string
          created_at?: string
          currency?: string
          evidence_sha256?: string
          id?: string
          reason?: string
          service_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advances_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "approved_commitment_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "approved_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_commitment_balances"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_lineage_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "approved_commitment_balances"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_lineage_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "approved_commitments"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_lineage_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_commitment_balances"
            referencedColumns: ["commitment_id", "service_id", "supplier_id"]
          },
        ]
      }
      supplier_bill_documents: {
        Row: {
          attached_at: string
          attached_by: string
          document_id: string
          supplier_bill_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          document_id: string
          supplier_bill_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          document_id?: string
          supplier_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_bill_documents_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bill_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bill_documents_supplier_bill_id_fkey"
            columns: ["supplier_bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bill_payment_balances"
            referencedColumns: ["supplier_bill_id"]
          },
          {
            foreignKeyName: "supplier_bill_documents_supplier_bill_id_fkey"
            columns: ["supplier_bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_bills: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bill_number: string
          commitment_id: string
          currency: string
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          record_request_id: string
          recorded_at: string
          recorded_by: string
          service_id: string
          service_receipt_id: string
          status: string
          subtotal: number
          supplier_cr_number_snapshot: string | null
          supplier_id: string
          supplier_legal_name_snapshot: string
          supplier_name_snapshot: string
          supplier_vat_number_snapshot: string | null
          supplier_vat_registration_status_snapshot: string | null
          total_amount: number
          updated_at: string
          updated_by: string
          vat_amount: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bill_number: string
          commitment_id: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          record_request_id: string
          recorded_at?: string
          recorded_by: string
          service_id: string
          service_receipt_id: string
          status?: string
          subtotal: number
          supplier_cr_number_snapshot?: string | null
          supplier_id: string
          supplier_legal_name_snapshot: string
          supplier_name_snapshot: string
          supplier_vat_number_snapshot?: string | null
          supplier_vat_registration_status_snapshot?: string | null
          total_amount: number
          updated_at?: string
          updated_by: string
          vat_amount?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bill_number?: string
          commitment_id?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          record_request_id?: string
          recorded_at?: string
          recorded_by?: string
          service_id?: string
          service_receipt_id?: string
          status?: string
          subtotal?: number
          supplier_cr_number_snapshot?: string | null
          supplier_id?: string
          supplier_legal_name_snapshot?: string
          supplier_name_snapshot?: string
          supplier_vat_number_snapshot?: string | null
          supplier_vat_registration_status_snapshot?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_bills_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bills_commitment_scope_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "approved_commitment_balances"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
          {
            foreignKeyName: "supplier_bills_commitment_scope_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "approved_commitments"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
          {
            foreignKeyName: "supplier_bills_commitment_scope_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_commitment_balances"
            referencedColumns: ["commitment_id", "service_id", "supplier_id"]
          },
          {
            foreignKeyName: "supplier_bills_receipt_scope_fkey"
            columns: [
              "service_receipt_id",
              "service_id",
              "supplier_id",
              "commitment_id",
            ]
            isOneToOne: false
            referencedRelation: "service_receipts"
            referencedColumns: [
              "id",
              "service_id",
              "supplier_id",
              "commitment_id",
            ]
          },
          {
            foreignKeyName: "supplier_bills_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bills_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bills_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_bookings: {
        Row: {
          allocation_snapshot: Json
          booking_number: string
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          category: string
          created_at: string
          created_by: string | null
          currency: string
          estimated_total_cost: number | null
          estimated_unit_cost: number
          id: string
          internal_notes: string | null
          is_deleted: boolean
          item_name: string
          quantity: number
          scope_of_work: string | null
          service_id: string
          source_allocation_id: string
          status: string
          supplier_id: string
          unit: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allocation_snapshot: Json
          booking_number?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          currency?: string
          estimated_total_cost?: number | null
          estimated_unit_cost: number
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          item_name: string
          quantity: number
          scope_of_work?: string | null
          service_id: string
          source_allocation_id: string
          status?: string
          supplier_id: string
          unit: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allocation_snapshot?: Json
          booking_number?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          estimated_total_cost?: number | null
          estimated_unit_cost?: number
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          item_name?: string
          quantity?: number
          scope_of_work?: string | null
          service_id?: string
          source_allocation_id?: string
          status?: string
          supplier_id?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bookings_source_allocation_id_fkey"
            columns: ["source_allocation_id"]
            isOneToOne: false
            referencedRelation: "service_supplier_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payment_documents: {
        Row: {
          attached_at: string
          attached_by: string
          document_id: string
          supplier_payment_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          document_id: string
          supplier_payment_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          document_id?: string
          supplier_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payment_documents_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_documents_supplier_payment_id_fkey"
            columns: ["supplier_payment_id"]
            isOneToOne: false
            referencedRelation: "supplier_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payment_reversals: {
        Row: {
          id: string
          reason: string
          reversal_request_id: string
          reversed_at: string
          reversed_by: string
          supplier_payment_id: string
        }
        Insert: {
          id?: string
          reason: string
          reversal_request_id: string
          reversed_at?: string
          reversed_by: string
          supplier_payment_id: string
        }
        Update: {
          id?: string
          reason?: string
          reversal_request_id?: string
          reversed_at?: string
          reversed_by?: string
          supplier_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payment_reversals_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_reversals_supplier_payment_id_fkey"
            columns: ["supplier_payment_id"]
            isOneToOne: true
            referencedRelation: "supplier_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          bank_account_name_snapshot: string | null
          bank_name_snapshot: string | null
          iban_snapshot: string | null
          id: string
          method: string
          notes: string | null
          payment_date: string
          payment_number: string
          record_request_id: string
          recorded_at: string
          recorded_by: string
          reference: string | null
          service_id: string
          supplier_bill_id: string
          supplier_id: string
        }
        Insert: {
          amount: number
          bank_account_name_snapshot?: string | null
          bank_name_snapshot?: string | null
          iban_snapshot?: string | null
          id?: string
          method: string
          notes?: string | null
          payment_date: string
          payment_number: string
          record_request_id: string
          recorded_at?: string
          recorded_by: string
          reference?: string | null
          service_id: string
          supplier_bill_id: string
          supplier_id: string
        }
        Update: {
          amount?: number
          bank_account_name_snapshot?: string | null
          bank_name_snapshot?: string | null
          iban_snapshot?: string | null
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          payment_number?: string
          record_request_id?: string
          recorded_at?: string
          recorded_by?: string
          reference?: string | null
          service_id?: string
          supplier_bill_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_bill_id_fkey"
            columns: ["supplier_bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bill_payment_balances"
            referencedColumns: ["supplier_bill_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_bill_id_fkey"
            columns: ["supplier_bill_id"]
            isOneToOne: false
            referencedRelation: "supplier_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotation_documents: {
        Row: {
          attached_at: string
          attached_by: string
          document_id: string
          quotation_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          document_id: string
          quotation_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          document_id?: string
          quotation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotation_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotation_documents_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotation_lines: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          line_total: number
          package_requirement_id: string | null
          quantity: number | null
          quotation_id: string
          service_id: string
          sort_order: number
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          line_total: number
          package_requirement_id?: string | null
          quantity?: number | null
          quotation_id: string
          service_id: string
          sort_order?: number
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          line_total?: number
          package_requirement_id?: string | null
          quantity?: number | null
          quotation_id?: string
          service_id?: string
          sort_order?: number
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotation_lines_pkg_req_fkey"
            columns: ["package_requirement_id", "service_id"]
            isOneToOne: false
            referencedRelation: "service_procurement_package_requirements"
            referencedColumns: ["id", "service_id"]
          },
          {
            foreignKeyName: "supplier_quotation_lines_quotation_fkey"
            columns: ["quotation_id", "service_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id", "service_id"]
          },
        ]
      }
      supplier_quotation_requirements: {
        Row: {
          created_at: string
          created_by: string
          line_amount: number | null
          line_evidence_ref: string | null
          line_summary: string
          quotation_id: string
          requirement_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          line_amount?: number | null
          line_evidence_ref?: string | null
          line_summary: string
          quotation_id: string
          requirement_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          line_amount?: number | null
          line_evidence_ref?: string | null
          line_summary?: string
          quotation_id?: string
          requirement_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotation_requirements_quotation_fkey"
            columns: ["quotation_id", "service_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id", "service_id"]
          },
          {
            foreignKeyName: "supplier_quotation_requirements_requirement_fkey"
            columns: ["requirement_id", "service_id"]
            isOneToOne: false
            referencedRelation: "service_procurement_requirements"
            referencedColumns: ["id", "service_id"]
          },
        ]
      }
      supplier_quotations: {
        Row: {
          currency: string
          id: string
          package_total: number | null
          quotation_date: string | null
          recorded_at: string
          recorded_by: string
          service_id: string
          source_candidate_requirement_id: string | null
          source_candidate_supplier_id: string | null
          supplier_id: string
          supplier_reference: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          currency?: string
          id?: string
          package_total?: number | null
          quotation_date?: string | null
          recorded_at?: string
          recorded_by: string
          service_id: string
          source_candidate_requirement_id?: string | null
          source_candidate_supplier_id?: string | null
          supplier_id: string
          supplier_reference?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          currency?: string
          id?: string
          package_total?: number | null
          quotation_date?: string | null
          recorded_at?: string
          recorded_by?: string
          service_id?: string
          source_candidate_requirement_id?: string | null
          source_candidate_supplier_id?: string | null
          supplier_id?: string
          supplier_reference?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotations_source_candidate_fkey"
            columns: [
              "source_candidate_requirement_id",
              "source_candidate_supplier_id",
            ]
            isOneToOne: true
            referencedRelation: "service_procurement_candidates"
            referencedColumns: ["requirement_id", "supplier_id"]
          },
          {
            foreignKeyName: "supplier_quotations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_rate_cards: {
        Row: {
          base_cost: number
          category: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          item_name: string
          notes: string | null
          pricing_basis: string | null
          status: string
          supplier_id: string
          unit: string
          updated_at: string
          updated_by: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          base_cost: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          item_name: string
          notes?: string | null
          pricing_basis?: string | null
          status?: string
          supplier_id: string
          unit: string
          updated_at?: string
          updated_by?: string | null
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          base_cost?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          item_name?: string
          notes?: string | null
          pricing_basis?: string | null
          status?: string
          supplier_id?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_rate_cards_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          bank_account_name: string | null
          bank_name: string | null
          blacklisted_at: string | null
          blacklisted_by: string | null
          blacklisted_reason: string | null
          category: string | null
          city: string | null
          contact: string
          contact_name: string | null
          country: string | null
          coverage_area: string | null
          cr_number: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          display_name: string | null
          email: string | null
          iban: string | null
          id: string
          is_deleted: boolean | null
          is_preferred: boolean
          legal_name: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string
          rating: number | null
          recent_project: string | null
          service: string
          status: string
          supplier_number: string | null
          supplier_type: string | null
          updated_at: string | null
          updated_by: string | null
          vat_number: string | null
          vat_registration_status: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_name?: string | null
          blacklisted_at?: string | null
          blacklisted_by?: string | null
          blacklisted_reason?: string | null
          category?: string | null
          city?: string | null
          contact: string
          contact_name?: string | null
          country?: string | null
          coverage_area?: string | null
          cr_number?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          is_deleted?: boolean | null
          is_preferred?: boolean
          legal_name?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone: string
          rating?: number | null
          recent_project?: string | null
          service: string
          status: string
          supplier_number?: string | null
          supplier_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vat_number?: string | null
          vat_registration_status?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_name?: string | null
          blacklisted_at?: string | null
          blacklisted_by?: string | null
          blacklisted_reason?: string | null
          category?: string | null
          city?: string | null
          contact?: string
          contact_name?: string | null
          country?: string | null
          coverage_area?: string | null
          cr_number?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          is_deleted?: boolean | null
          is_preferred?: boolean
          legal_name?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string
          rating?: number | null
          recent_project?: string | null
          service?: string
          status?: string
          supplier_number?: string | null
          supplier_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vat_number?: string | null
          vat_registration_status?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      approved_commitment_balances: {
        Row: {
          accepted_amount: number | null
          amendment_count: number | null
          approved_at: string | null
          approved_by: string | null
          authorized_amount: number | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          closed_at: string | null
          closed_by: string | null
          closed_reason: string | null
          commitment_source: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string | null
          open_commitment_amount: number | null
          original_approved_amount: number | null
          pending_amount: number | null
          receipt_count: number | null
          service_id: string | null
          source_reference: string | null
          status: string | null
          supplier_id: string | null
          supplier_quotation_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_commitments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_commitments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_commitments_supplier_quotation_fkey"
            columns: ["supplier_quotation_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
        ]
      }
      customer_credit_adjustment_balances: {
        Row: {
          applied_amount: number | null
          available_amount: number | null
          created_at: string | null
          created_by: string | null
          credit_adjustment_id: string | null
          credited_amount: number | null
          customer_id: string | null
          effective_date: string | null
          eligible_credit_amount: number | null
          invoice_id: string | null
          reason: string | null
          reason_code: string | null
          refunded_amount: number | null
          request_id: string | null
          service_id: string | null
          source_approved_billing_scope_id: string | null
          successor_approved_billing_scope_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_internal_credit_adjustments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_receivable_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoice_settlement_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_source_scope_service_fkey"
            columns: ["source_approved_billing_scope_id", "service_id"]
            isOneToOne: false
            referencedRelation: "approved_billing_scopes"
            referencedColumns: ["id", "service_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_successor_scope_service_fk"
            columns: ["successor_approved_billing_scope_id", "service_id"]
            isOneToOne: false
            referencedRelation: "approved_billing_scopes"
            referencedColumns: ["id", "service_id"]
          },
        ]
      }
      customer_credit_balances: {
        Row: {
          applied_amount: number | null
          available_credit_amount: number | null
          credit_adjustment_count: number | null
          credited_amount: number | null
          customer_id: string | null
          refunded_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_internal_credit_adjustments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_internal_credit_adjustments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoice_receivable_balances: {
        Row: {
          credit_adjustment_amount: number | null
          credit_application_amount: number | null
          customer_credit_amount: number | null
          customer_id: string | null
          gross_issued_amount: number | null
          invoice_amount_paid: number | null
          invoice_balance_due: number | null
          invoice_id: string | null
          invoice_number: string | null
          invoice_status: string | null
          net_receivable_amount: number | null
          outstanding_amount: number | null
          service_id: string | null
          settled_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoice_settlement_balances: {
        Row: {
          allocated_amount: number | null
          customer_id: string | null
          grand_total: number | null
          invoice_amount_paid: number | null
          invoice_balance_due: number | null
          invoice_id: string | null
          invoice_number: string | null
          invoice_status: string | null
          outstanding_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_receipt_balances: {
        Row: {
          allocated_amount: number | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          date: string | null
          method: string | null
          notes: string | null
          payment_id: string | null
          payment_number: string | null
          payment_status: string | null
          receipt_amount: number | null
          receipt_status: string | null
          reference: string | null
          unapplied_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_report_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_report_metrics: {
        Row: {
          approved_quotations_count: number | null
          customer_id: string | null
          draft_quotations_count: number | null
          quotations_count: number | null
          services_count: number | null
          total_quoted_amount: number | null
        }
        Relationships: []
      }
      expense_accountability_summaries: {
        Row: {
          advance_allocated_amount: number | null
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_advance_id: string | null
          claimant_id: string | null
          context_type: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          document_count: number | null
          evidence_status: string | null
          exception_accountable_owner_id: string | null
          exception_disposition: string | null
          exception_id: string | null
          exception_review_before: string | null
          expense_category: string | null
          expense_date: string | null
          expense_number: string | null
          finance_reviewed_at: string | null
          finance_reviewed_by: string | null
          id: string | null
          origin_type: string | null
          payment_method: string | null
          petty_cash_allocated_amount: number | null
          petty_cash_fund_id: string | null
          reimbursed_amount: number | null
          reimbursement_status: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          remaining_unsettled_amount: number | null
          service_id: string | null
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_settled_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_evidence_exceptions_accountable_owner_id_fkey"
            columns: ["exception_accountable_owner_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cash_advance_id_fkey"
            columns: ["cash_advance_id"]
            isOneToOne: false
            referencedRelation: "employee_cash_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_finance_reviewed_by_fkey"
            columns: ["finance_reviewed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_petty_cash_fund_id_fkey"
            columns: ["petty_cash_fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_advance_balances: {
        Row: {
          advance_number: string | null
          allocated_amount: number | null
          authorization_released: boolean | null
          authorized_amount: number | null
          authorized_at: string | null
          authorized_by: string | null
          commitment_id: string | null
          currency: string | null
          paid_amount: number | null
          refunded_amount: number | null
          released_at: string | null
          remaining_unallocated_amount: number | null
          reversed_amount: number | null
          service_id: string | null
          status: string | null
          supplier_advance_id: string | null
          supplier_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advances_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "approved_commitment_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "approved_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_commitment_balances"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_lineage_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "approved_commitment_balances"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_lineage_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "approved_commitments"
            referencedColumns: ["id", "service_id", "supplier_id"]
          },
          {
            foreignKeyName: "supplier_advances_commitment_lineage_fkey"
            columns: ["commitment_id", "service_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_advance_commitment_balances"
            referencedColumns: ["commitment_id", "service_id", "supplier_id"]
          },
        ]
      }
      supplier_advance_commitment_balances: {
        Row: {
          authorized_amount: number | null
          available_authorization_amount: number | null
          commitment_approved_at: string | null
          commitment_id: string | null
          commitment_source: string | null
          commitment_status: string | null
          currency: string | null
          existing_advance_reserve: number | null
          open_commitment_amount: number | null
          service_id: string | null
          source_reference: string | null
          supplier_id: string | null
          supplier_quotation_reference: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_commitments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_commitments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_bill_payment_balances: {
        Row: {
          advance_allocated_amount: number | null
          bill_number: string | null
          currency: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          payable_amount: number | null
          payment_status: string | null
          service_id: string | null
          supplier_bill_id: string | null
          supplier_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_bills_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _abs_get_service_invoice_exposure: {
        Args: { p_service_id: string }
        Returns: {
          applicable_invoice_count: number
          lifetime_invoice_total: number
        }[]
      }
      _abs_get_service_payment_history_count: {
        Args: { p_service_id: string }
        Returns: number
      }
      _abs_service_has_historical_authority: {
        Args: { p_service_id: string }
        Returns: boolean
      }
      _abs_validate_scope_items: {
        Args: { p_scope_id: string }
        Returns: {
          billable_item_count: number
          item_accepted_grand_total: number
          item_accepted_subtotal: number
          item_accepted_vat_amount: number
          item_count: number
          validation_error: string
        }[]
      }
      _canonical_invoice_create_mutation: {
        Args: {
          p_invoice_type: string
          p_quotation_id: string
          p_requested_amount: number
          p_service_id: string
        }
        Returns: Json
      }
      _p6_get_service_billing_authority: {
        Args: { p_service_id: string }
        Returns: {
          authority_status: string
          billing_ceiling: number
        }[]
      }
      _p6_get_service_billing_exposure: {
        Args: { p_service_id: string }
        Returns: {
          applicable_invoice_count: number
          exposure_status: string
          lifetime_invoice_total: number
        }[]
      }
      _record_invoice_payment_before_service_audit: {
        Args: {
          p_amount: number
          p_date: string
          p_invoice_id: string
          p_method: string
          p_reference: string
          p_request_id: string
          p_user_id: string
        }
        Returns: {
          amount_paid: number
          balance_due: number
          error_code: string
          invoice_status: string
          payment_id: string
          payment_number: string
        }[]
      }
      _w7c_get_credit_available: {
        Args: { p_credit_adjustment_id: string }
        Returns: number
      }
      _w7c_get_invoice_credit_total: {
        Args: { p_invoice_id: string }
        Returns: number
      }
      accept_accounting_inception_package: {
        Args: {
          p_actor_user_id: string
          p_package_id: string
          p_package_version: number
          p_reason: string
          p_request_id: string
        }
        Returns: {
          acceptance_id: string
          error_code: string
          idempotent_replay: boolean
          trial_balance: Json
        }[]
      }
      accounting_ap_bridge_account_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_mapping_key: string
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_ap_bridge_expected_lines: {
        Args: {
          p_amount: number
          p_classification: string
          p_direct_classification: string
          p_matched: number
          p_source_type: string
        }
        Returns: Json
      }
      accounting_ap_bridge_journal_account_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_journal_id: string
          p_journal_version: number
          p_line_number: number
          p_prepared_by: string
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_ap_bridge_journal_link_authorized: {
        Args: {
          p_journal_id: string
          p_journal_version: number
          p_prepared_by: string
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_ap_bridge_line_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_actor_user_id: string
          p_journal: Json
          p_line_number: number
          p_mapping_key: string
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_ap_bridge_source_inventory: {
        Args: {
          p_as_of_date: string
          p_limit: number
          p_recorded_at_cutoff: string
        }
        Returns: Json[]
      }
      accounting_ap_bridge_source_snapshot: {
        Args: {
          p_recorded_at_cutoff?: string
          p_source_record_id: string
          p_source_type: string
        }
        Returns: Json
      }
      accounting_ar_bridge_account_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_mapping_key: string
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_ar_bridge_journal_account_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_journal_id: string
          p_journal_version: number
          p_line_number: number
          p_prepared_by: string
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_ar_bridge_journal_link_authorized: {
        Args: {
          p_journal_id: string
          p_prepared_by: string
          p_prepared_version: number
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_ar_bridge_line_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_actor_user_id: string
          p_journal: Json
          p_line_number: number
          p_mapping_key: string
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_ar_bridge_mapping_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_mapping_key: string
          p_posting_rule_id: string
          p_profile_id: string
          p_rule_version: number
        }
        Returns: boolean
      }
      accounting_ar_bridge_posting_spec: {
        Args: {
          p_classification: string
          p_source_snapshot: Json
          p_source_type: string
        }
        Returns: Json
      }
      accounting_ar_bridge_source_inventory: {
        Args: {
          p_as_of_date: string
          p_limit: number
          p_recorded_at_cutoff: string
        }
        Returns: Json[]
      }
      accounting_ar_bridge_source_snapshot: {
        Args: { p_source_record_id: string; p_source_type: string }
        Returns: Json
      }
      accounting_expense_bridge_account_authorized: {
        Args: { a: string; k: string; p: string; v: number }
        Returns: boolean
      }
      accounting_expense_bridge_expected_lines: {
        Args: {
          a: number
          c: string
          d: string
          m: string
          r: string
          t: string
        }
        Returns: Json
      }
      accounting_expense_bridge_journal_account_authorized: {
        Args: {
          p_account: string
          p_account_version: number
          p_actor: string
          p_journal: string
          p_line: number
          p_profile: string
          p_version: number
        }
        Returns: boolean
      }
      accounting_expense_bridge_journal_link_authorized: {
        Args: {
          p_actor: string
          p_journal: string
          p_profile: string
          p_version: number
        }
        Returns: boolean
      }
      accounting_expense_bridge_line_authorized: {
        Args: {
          p_account: string
          p_account_version: number
          p_actor: string
          p_journal: Json
          p_key: string
          p_line: number
          p_profile: string
        }
        Returns: boolean
      }
      accounting_expense_bridge_source_inventory: {
        Args: { c: string; d: string; n: number }
        Returns: Json[]
      }
      accounting_expense_bridge_source_snapshot: {
        Args: {
          p_cutoff?: string
          p_source_record_id: string
          p_source_type: string
        }
        Returns: Json
      }
      accounting_inception_journal_line_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_actor_user_id: string
          p_line_number: number
          p_mapping_key: string
          p_payload: Json
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_inception_journal_link_authorized: {
        Args: {
          p_journal_id: string
          p_prepared_by: string
          p_profile_id: string
          p_version: number
        }
        Returns: boolean
      }
      accounting_inception_mapping_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_mapping_key: string
          p_profile_id: string
          p_rule_id: string
          p_rule_version: number
        }
        Returns: boolean
      }
      accounting_period_close_capture: {
        Args: {
          p_actor_user_id: string
          p_period_id: string
          p_recorded_at_cutoff: string
        }
        Returns: Json
      }
      accounting_period_close_live_fingerprint: {
        Args: { p_profile_id: string }
        Returns: string
      }
      accounting_period_close_lock_evidence_tables: {
        Args: never
        Returns: undefined
      }
      accounting_revenue_recognition_account_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_mapping_key: string
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_revenue_recognition_journal_account_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_actor_user_id: string
          p_journal_id: string
          p_journal_version: number
          p_line_number: number
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_revenue_recognition_journal_link_authorized: {
        Args: {
          p_actor_user_id: string
          p_journal_id: string
          p_prepared_version: number
          p_profile_id: string
        }
        Returns: boolean
      }
      accounting_revenue_recognition_line_authorized: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_actor_user_id: string
          p_journal: Json
          p_line_number: number
          p_mapping_key: string
          p_profile_id: string
        }
        Returns: boolean
      }
      add_approved_commitment_amendment: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_amendment_type: string
          p_amount: number
          p_commitment_id: string
          p_evidence_ref: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          amendment_id: string
          amendment_number: number
          authorized_amount: number
          commitment_id: string
          error_code: string
          idempotent_replay: boolean
          open_commitment_amount: number
          service_id: string
        }[]
      }
      allocate_customer_receipt: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_payment_id: string
          p_request_id: string
          p_user_id: string
        }
        Returns: {
          allocated_amount: number
          allocation_id: string
          error_code: string
          idempotent_replay: boolean
          invoice_balance_due: number
          invoice_id: string
          payment_id: string
          receipt_unapplied_amount: number
        }[]
      }
      allocate_supplier_advance: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_id: string
          p_amount: number
          p_request_id: string
          p_supplier_bill_id: string
        }
        Returns: {
          advance_id: string
          advance_unallocated_amount: number
          allocated_amount: number
          allocation_id: string
          allocation_number: string
          bill_id: string
          bill_outstanding_amount: number
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      apply_customer_credit: {
        Args: {
          p_actor_id: string
          p_amount: number
          p_business_date: string
          p_customer_id: string
          p_reason: string
          p_request_id: string
          p_source_credit_adjustment_id: string
          p_target_invoice_id: string
        }
        Returns: {
          amount: number
          application_id: string
          customer_credit_balance: number
          customer_id: string
          error_code: string
          idempotent_replay: boolean
          remaining_credit_amount: number
          source_credit_adjustment_id: string
          target_invoice_id: string
          target_outstanding_amount: number
        }[]
      }
      approve_and_disburse_petty_cash_expense: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_expense_id: string
          p_fund_id: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          expense_id: string
          idempotent_replay: boolean
          transaction_id: string
        }[]
      }
      approve_and_supersede_approved_billing_scope: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_reason_code: string
          p_reason_note: string
          p_source_scope_id: string
          p_successor_scope_id: string
        }
        Returns: {
          activated: boolean
          activated_at: string
          applicable_invoice_count: number
          error_code: string
          idempotent_replay: boolean
          lifetime_invoice_total: number
          previous_ceiling: number
          remaining_billable: number
          service_id: string
          source_scope_id: string
          source_scope_version: number
          successor_ceiling: number
          successor_scope_id: string
          successor_scope_version: number
        }[]
      }
      approve_approved_billing_scope: {
        Args: { p_actor_id: string; p_actor_role: string; p_scope_id: string }
        Returns: {
          approved: boolean
          approved_at: string
          error_code: string
          scope_id: string
          scope_version: number
          service_id: string
        }[]
      }
      approve_approved_commercial_amendment: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_mutation_key: string
          p_source_quotation_id: string
          p_successor_quotation_id: string
        }
        Returns: {
          abs_activated: boolean
          abs_status: string
          approved_at: string
          error_code: string
          idempotent_replay: boolean
          lifetime_invoice_total: number
          previous_ceiling: number
          quotation_approved: boolean
          quotation_status: string
          service_id: string
          source_quotation_id: string
          source_scope_id: string
          source_scope_version: number
          successor_ceiling: number
          successor_quotation_id: string
          successor_scope_id: string
          successor_scope_version: number
        }[]
      }
      approve_cash_advance: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_id: string
          p_request_id: string
        }
        Returns: {
          advance_id: string
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      approve_event_cost_budget: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_base_budget_amount: number
          p_contingency_amount: number
          p_notes: string
          p_reason: string
          p_request_id: string
          p_service_id: string
          p_source_reference: string
        }
        Returns: {
          approved_budget_cost: number
          budget_id: string
          budget_version: number
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      approve_expense: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_expense_id: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          expense_id: string
          idempotent_replay: boolean
        }[]
      }
      approve_quotation_and_activate_internal_abs: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_quotation_id: string
        }
        Returns: {
          abs_activated: boolean
          abs_activated_at: string
          abs_status: string
          accepted_grand_total: number
          accepted_subtotal: number
          accepted_vat_amount: number
          approved_at: string
          approved_billing_scope_id: string
          error_code: string
          idempotent_replay: boolean
          quotation_approved: boolean
          quotation_id: string
          quotation_number: string
          quotation_status: string
          scope_version: number
          service_id: string
        }[]
      }
      approve_quotation_and_activate_internal_abs_legacy: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_quotation_id: string
        }
        Returns: {
          abs_activated: boolean
          abs_activated_at: string
          abs_status: string
          accepted_grand_total: number
          accepted_subtotal: number
          accepted_vat_amount: number
          approved_at: string
          approved_billing_scope_id: string
          error_code: string
          idempotent_replay: boolean
          quotation_approved: boolean
          quotation_id: string
          quotation_number: string
          quotation_status: string
          scope_version: number
          service_id: string
        }[]
      }
      approve_supplier_bill: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_bill_id: string
          p_request_id: string
        }
        Returns: {
          bill_id: string
          bill_number: string
          error_code: string
          idempotent_replay: boolean
          status: string
        }[]
      }
      assert_event_cost_authority_open: {
        Args: { p_service_id: string }
        Returns: undefined
      }
      attach_approved_commitment_documents: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_commitment_id: string
          p_document_ids: string[]
          p_request_id: string
        }
        Returns: {
          commitment_id: string
          document_count: number
          error_code: string
          idempotent_replay: boolean
          service_id: string
        }[]
      }
      attach_expense_document: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_document_id: string
          p_expense_id: string
          p_request_id: string
        }
        Returns: {
          document_id: string
          error_code: string
          expense_id: string
          idempotent_replay: boolean
        }[]
      }
      attach_service_procurement_candidate_document: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_document_id: string
          p_request_id: string
          p_requirement_id: string
          p_supplier_id: string
        }
        Returns: {
          document_id: string
          error_code: string
          idempotent_replay: boolean
          requirement_id: string
          service_id: string
          supplier_id: string
        }[]
      }
      attach_service_receipt_documents: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_document_ids: string[]
          p_receipt_id: string
          p_request_id: string
        }
        Returns: {
          document_count: number
          error_code: string
          idempotent_replay: boolean
          receipt_id: string
          service_id: string
        }[]
      }
      attach_supplier_bill_documents: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_bill_id: string
          p_document_ids: string[]
          p_request_id: string
        }
        Returns: {
          bill_id: string
          document_count: number
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      attach_supplier_quotation_documents: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_document_ids: string[]
          p_quotation_id: string
          p_request_id: string
        }
        Returns: {
          document_count: number
          error_code: string
          idempotent_replay: boolean
          quotation_id: string
          service_id: string
        }[]
      }
      authorize_supplier_advance: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_amount: number
          p_commitment_id: string
          p_document_id: string
          p_evidence_sha256: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          advance_id: string
          advance_number: string
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      build_active_abs_invoice_snapshot: {
        Args: {
          p_invoice_amount: number
          p_invoice_type: string
          p_quotation_id: string
          p_scope_id: string
          p_service_id: string
        }
        Returns: Json
      }
      cancel_cash_advance: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_id: string
          p_cancellation_reason: string
          p_request_id: string
        }
        Returns: {
          advance_id: string
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      cancel_expense: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_cancellation_reason: string
          p_expense_id: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          expense_id: string
          idempotent_replay: boolean
        }[]
      }
      cancel_service: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_reason: string
          p_service_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          service_id: string
          service_status: string
        }[]
      }
      clear_procurement_package_supplier: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_package_id: string
          p_request_id: string
          p_service_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          package_id: string
        }[]
      }
      close_event_cost: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_reason: string
          p_request_id: string
          p_service_id: string
        }
        Returns: {
          close_id: string
          close_version: number
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      complete_service: {
        Args: { p_actor_id: string; p_actor_role: string; p_service_id: string }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          service_id: string
          service_status: string
        }[]
      }
      correct_service_receipt: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_corrected_acceptance_status: string
          p_corrected_conditions_notes: string
          p_corrected_received_amount: number
          p_correction_reason: string
          p_receipt_id: string
          p_request_id: string
        }
        Returns: {
          acceptance_status: string
          commitment_id: string
          error_code: string
          idempotent_replay: boolean
          receipt_id: string
          received_amount: number
          service_id: string
          supplier_id: string
        }[]
      }
      create_approved_billing_scope_successor: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_reason_code: string
          p_reason_note: string
          p_source_scope_id: string
        }
        Returns: {
          accepted_grand_total: number
          created: boolean
          error_code: string
          idempotent_replay: boolean
          service_id: string
          source_scope_id: string
          source_scope_version: number
          successor_scope_id: string
          successor_scope_version: number
        }[]
      }
      create_approved_commercial_amendment: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_amendment_reason: string
          p_mutation_key: string
          p_source_quotation_id: string
        }
        Returns: {
          created: boolean
          error_code: string
          idempotent_replay: boolean
          quotation_family_id: string
          quotation_number: string
          revision_number: number
          service_id: string
          source_quotation_id: string
          successor_quotation_id: string
        }[]
      }
      create_approved_commitment: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_approved_at: string
          p_commitment_source: string
          p_original_approved_amount: number
          p_request_id: string
          p_service_id: string
          p_source_reference: string
          p_supplier_id: string
          p_supplier_quotation_id: string
        }
        Returns: {
          authorized_amount: number
          commitment_id: string
          error_code: string
          idempotent_replay: boolean
          open_commitment_amount: number
          service_id: string
          supplier_id: string
        }[]
      }
      create_customer_atomic: {
        Args: {
          p_billing_email?: string
          p_city: string
          p_commercial_registration_number?: string
          p_company: string
          p_contact: string
          p_created_by?: string
          p_customer_type?: string
          p_email: string
          p_finance_contact_name?: string
          p_finance_contact_phone?: string
          p_legal_name?: string
          p_mutation_key?: string
          p_national_address_additional_number?: string
          p_national_address_building_number?: string
          p_national_address_city?: string
          p_national_address_country?: string
          p_national_address_district?: string
          p_national_address_postal_code?: string
          p_national_address_street?: string
          p_payment_terms?: string
          p_phone: string
          p_po_required?: boolean
          p_status?: string
          p_vat_number?: string
        }
        Returns: {
          customer_id: string
          customer_number: string
          error_code: string
          is_replayed: boolean
        }[]
      }
      create_flexible_invoice_atomic: {
        Args: {
          p_actor_clerk_user_id: string
          p_document_label: string
          p_due_date?: string
          p_invoice_date?: string
          p_mutation_key: string
          p_quotation_id: string
          p_requested_amount: number
          p_service_id: string
          p_snapshot_bank_details: Json
          p_snapshot_buyer: Json
          p_snapshot_document_rules: Json
          p_snapshot_quotation: Json
          p_snapshot_seller: Json
          p_vat_mode: string
        }
        Returns: {
          error_code: string
          invoice_id: string
          invoice_number: string
          is_replayed: boolean
        }[]
      }
      create_flexible_quotation_with_items: {
        Args: { p_items: Json; p_quotation: Json; p_user_id: string }
        Returns: {
          discount: number
          error_code: string
          grand_total: number
          is_replayed: boolean
          quotation_id: string
          quotation_number: string
          subtotal: number
          vat_amount: number
        }[]
      }
      create_invoice_atomic: {
        Args: {
          p_actor_clerk_user_id: string
          p_document_label: string
          p_due_date?: string
          p_invoice_date?: string
          p_invoice_type: string
          p_mutation_key: string
          p_quotation_id: string
          p_requested_amount: number
          p_service_id: string
          p_snapshot_bank_details: Json
          p_snapshot_buyer: Json
          p_snapshot_document_rules: Json
          p_snapshot_quotation: Json
          p_snapshot_seller: Json
          p_vat_mode: string
        }
        Returns: {
          error_code: string
          invoice_id: string
          invoice_number: string
          is_replayed: boolean
        }[]
      }
      create_invoice_atomic_legacy: {
        Args: {
          p_actor_clerk_user_id: string
          p_document_label: string
          p_due_date?: string
          p_invoice_date?: string
          p_invoice_type: string
          p_mutation_key: string
          p_mutation_payload: Json
          p_quotation_id: string
          p_requested_amount: number
          p_service_id: string
          p_snapshot_bank_details: Json
          p_snapshot_buyer: Json
          p_snapshot_document_rules: Json
          p_snapshot_quotation: Json
          p_snapshot_seller: Json
          p_vat_mode: string
        }
        Returns: {
          error_code: string
          invoice_id: string
          invoice_number: string
        }[]
      }
      create_petty_cash_fund: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_custodian_id: string
          p_float_limit: number
          p_fund_name: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          fund_id: string
          idempotent_replay: boolean
        }[]
      }
      create_quotation_revision: {
        Args: {
          p_mutation_key: string
          p_revision_reason: string
          p_source_quotation_id: string
          p_user_id: string
        }
        Returns: {
          error_code: string
          is_replayed: boolean
          quotation_family_id: string
          quotation_id: string
          quotation_number: string
          revision_number: number
          service_id: string
          source_quotation_id: string
        }[]
      }
      create_quotation_with_items: {
        Args: { p_items: Json; p_quotation: Json; p_user_id: string }
        Returns: {
          discount: number
          error_code: string
          grand_total: number
          is_replayed: boolean
          quotation_id: string
          quotation_number: string
          subtotal: number
          vat_amount: number
        }[]
      }
      create_service_atomic: {
        Args: {
          p_cancellation_reason?: string
          p_created_by?: string
          p_customer_id: string
          p_description?: string
          p_estimated_budget?: number
          p_event_end_date?: string
          p_event_location?: string
          p_event_name?: string
          p_event_start_date?: string
          p_event_type?: string
          p_mutation_key?: string
          p_service_title: string
        }
        Returns: {
          error_code: string
          is_replayed: boolean
          service_id: string
          service_number: string
        }[]
      }
      create_service_receipt: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_actual_hours: number
          p_actual_quantity: number
          p_commitment_id: string
          p_conditions_notes: string
          p_defects_incidents: string
          p_delivered_scope: string
          p_extra_scope: string
          p_missing_scope: string
          p_performance_date: string
          p_quantity_unit: string
          p_received_amount: number
          p_request_id: string
          p_service_id: string
        }
        Returns: {
          acceptance_status: string
          commitment_id: string
          error_code: string
          idempotent_replay: boolean
          receipt_id: string
          service_id: string
          supplier_id: string
        }[]
      }
      create_supplier_bill: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_commitment_id: string
          p_currency: string
          p_due_date: string
          p_invoice_date: string
          p_invoice_number: string
          p_request_id: string
          p_service_id: string
          p_service_receipt_id: string
          p_subtotal: number
          p_supplier_id: string
          p_total_amount: number
          p_vat_amount: number
        }
        Returns: {
          bill_id: string
          bill_number: string
          error_code: string
          idempotent_replay: boolean
          status: string
        }[]
      }
      create_supplier_bill_w6a_original: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_commitment_id: string
          p_currency: string
          p_due_date: string
          p_invoice_date: string
          p_invoice_number: string
          p_request_id: string
          p_service_id: string
          p_service_receipt_id: string
          p_subtotal: number
          p_supplier_id: string
          p_total_amount: number
          p_vat_amount: number
        }
        Returns: {
          bill_id: string
          bill_number: string
          error_code: string
          idempotent_replay: boolean
          status: string
        }[]
      }
      create_supplier_quotation:
        | {
            Args: {
              p_actor_id: string
              p_actor_role: string
              p_lines: Json
              p_package_total: number
              p_quotation_date: string
              p_request_id: string
              p_requirements: Json
              p_service_id: string
              p_supplier_id: string
              p_supplier_reference: string
            }
            Returns: {
              error_code: string
              idempotent_replay: boolean
              line_count: number
              quotation_id: string
              service_id: string
              supplier_id: string
            }[]
          }
        | {
            Args: {
              p_actor_id: string
              p_actor_role: string
              p_package_total: number
              p_quotation_date: string
              p_request_id: string
              p_requirements: Json
              p_service_id: string
              p_supplier_id: string
              p_supplier_reference: string
            }
            Returns: {
              error_code: string
              idempotent_replay: boolean
              line_count: number
              quotation_id: string
              service_id: string
              supplier_id: string
            }[]
          }
      discard_approved_billing_scope_draft: {
        Args: { p_scope_id: string }
        Returns: {
          discarded: boolean
          error_code: string
          scope_id: string
          service_id: string
          source_quotation_id: string
        }[]
      }
      dispose_expense_evidence_exception: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_disposition: string
          p_disposition_notes: string
          p_exception_id: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          exception_id: string
          idempotent_replay: boolean
        }[]
      }
      edit_approved_billing_scope_item: {
        Args: {
          p_accepted_qty: number
          p_accepted_unit_price: number
          p_decision: string
          p_display_order: number
          p_item_id: string
          p_reason_code: string
          p_reason_note: string
          p_scope_id: string
        }
        Returns: {
          accepted_grand_total: number
          accepted_subtotal: number
          accepted_vat_amount: number
          error_code: string
          item_id: string
          line_safety_status: string
          scope_id: string
          updated: boolean
        }[]
      }
      event_cost_close_is_active: {
        Args: { p_service_id: string }
        Returns: boolean
      }
      generate_document_number: { Args: { doc_type: string }; Returns: string }
      get_accounting_ap_bridge_reconciliation: {
        Args: {
          p_actor_user_id: string
          p_as_of_date: string
          p_limit?: number
          p_recorded_at_cutoff: string
        }
        Returns: Json
      }
      get_accounting_ar_bridge_reconciliation: {
        Args: {
          p_actor_user_id: string
          p_as_of_date: string
          p_limit?: number
          p_recorded_at_cutoff: string
        }
        Returns: Json
      }
      get_accounting_bank_reconciliation: {
        Args: {
          p_actor_user_id: string
          p_as_of_date: string
          p_binding_id: string
          p_limit?: number
          p_recorded_at_cutoff: string
        }
        Returns: Json
      }
      get_accounting_capability: {
        Args: { p_actor_user_id: string; p_capability: string }
        Returns: boolean
      }
      get_accounting_expense_bridge_reconciliation: {
        Args: {
          p_actor: string
          p_as_of: string
          p_cutoff: string
          p_limit?: number
        }
        Returns: Json
      }
      get_accounting_general_ledger: {
        Args: {
          p_account_id: string
          p_actor_user_id: string
          p_from_date: string
          p_limit: number
          p_offset: number
          p_recorded_at_cutoff: string
          p_service_id: string
          p_through_date: string
        }
        Returns: {
          generated_at: string
          is_complete: boolean
          report: Json
        }[]
      }
      get_accounting_inception_package: {
        Args: { p_actor_user_id: string; p_package_id: string }
        Returns: Json
      }
      get_accounting_journal: {
        Args: { p_actor_user_id: string; p_journal_id: string }
        Returns: Json
      }
      get_accounting_period_close_evidence: {
        Args: {
          p_actor_user_id: string
          p_period_id: string
          p_recorded_at_cutoff: string
        }
        Returns: Json
      }
      get_accounting_profile: {
        Args: { p_actor_user_id: string }
        Returns: Json
      }
      get_accounting_revenue_recognition_reconciliation: {
        Args: {
          p_actor: string
          p_as_of: string
          p_cutoff: string
          p_limit?: number
        }
        Returns: Json
      }
      get_accounting_trial_balance: {
        Args: {
          p_actor_user_id: string
          p_as_of_date: string
          p_limit: number
          p_offset: number
          p_recorded_at_cutoff: string
          p_service_id: string
        }
        Returns: {
          generated_at: string
          is_complete: boolean
          report: Json
        }[]
      }
      get_accounts_payable_report: {
        Args: {
          p_due_from?: string
          p_due_to?: string
          p_page_offset?: number
          p_page_size?: number
          p_service_id?: string
          p_service_search?: string
          p_status?: string
          p_supplier_id?: string
          p_supplier_search?: string
        }
        Returns: Json
      }
      get_accounts_receivable_report: {
        Args: {
          p_as_of_date: string
          p_from_date: string
          p_page_offset: number
          p_page_size: number
          p_to_date: string
        }
        Returns: {
          ageing_1_30_amount: number
          ageing_31_60_amount: number
          ageing_61_90_amount: number
          ageing_91_plus_amount: number
          as_of_date: string
          billed_amount: number
          collected_cash_amount: number
          detail_rows: Json
          detail_total_count: number
          not_due_amount: number
          outstanding_customer_count: number
          outstanding_customer_rows: Json
          period_from: string
          period_to: string
          total_outstanding: number
          total_overdue: number
        }[]
      }
      get_cash_advance_balance_summary: {
        Args: { p_advance_id: string }
        Returns: {
          advance_id: string
          advance_number: string
          amount_issued: number
          amount_returned: number
          amount_spent_settled: number
          available_uncommitted_balance: number
          context_type: string
          recipient_id: string
          remaining_balance: number
          reserved_unsettled_spend: number
          service_id: string
          status: string
        }[]
      }
      get_event_cost_close_readiness: {
        Args: { p_as_of_date?: string; p_service_id: string }
        Returns: Json
      }
      get_event_cost_close_status: {
        Args: { p_as_of_date?: string; p_service_id: string }
        Returns: Json
      }
      get_event_costing: {
        Args: { p_as_of_date?: string; p_service_id: string }
        Returns: Json
      }
      get_event_economics_report: {
        Args: {
          p_as_of_date: string
          p_close_state?: string
          p_completeness?: string
          p_page_offset?: number
          p_page_size?: number
          p_search?: string
        }
        Returns: Json
      }
      get_linked_cash_advance_expenses: {
        Args: { p_advance_id: string }
        Returns: {
          amount: number
          approved_at: string
          cash_advance_id: string
          description: string
          expense_category: string
          expense_date: string
          expense_id: string
          expense_number: string
          finance_reviewed_at: string
          rejected_at: string
          settled_amount: number
          status: string
          unsettled_amount: number
        }[]
      }
      get_w10h_accounting_report: {
        Args: {
          p_account_id: string
          p_actor_user_id: string
          p_from_date: string
          p_limit: number
          p_offset: number
          p_recorded_at_cutoff: string
          p_report_type: string
          p_service_id: string
          p_through_date: string
        }
        Returns: Json
      }
      issue_cash_advance: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_id: string
          p_payment_reference: string
          p_request_id: string
        }
        Returns: {
          advance_id: string
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      issue_invoice_atomic: {
        Args: { p_actor_clerk_user_id: string; p_invoice_id: string }
        Returns: {
          error_code: string
          invoice_id: string
          invoice_number: string
        }[]
      }
      list_accounting_accounts: {
        Args: { p_actor_user_id: string }
        Returns: {
          account_code: string
          account_id: string
          account_kind: string
          account_type: string
          category: string
          control_classification: string
          created_at: string
          created_by: string
          effective_from: string
          evidence_ref: string
          is_active: boolean
          is_current: boolean
          is_protected: boolean
          name_ar: string
          name_en: string
          normal_balance: string
          parent_account_id: string
          previous_version: number
          profile_id: string
          reason: string
          version: number
        }[]
      }
      list_accounting_capability_assignments: {
        Args: { p_actor_user_id: string; p_target_user_id: string }
        Returns: {
          actor_user_id: string
          capability: string
          created_at: string
          effect: string
          expires_at: string
          revision: number
        }[]
      }
      list_accounting_inception_packages: {
        Args: { p_actor_user_id: string }
        Returns: {
          accepted: boolean
          accounting_start_date: string
          created_at: string
          current_version: number
          cutover_boundary_date: string
          package_id: string
        }[]
      }
      list_accounting_periods: {
        Args: { p_actor_user_id: string }
        Returns: {
          created_at: string
          created_by: string
          effective_from: string
          end_date: string
          evidence_ref: string
          is_current: boolean
          period_id: string
          previous_version: number
          profile_id: string
          reason: string
          start_date: string
          status: string
          version: number
        }[]
      }
      list_accounting_posting_rules: {
        Args: { p_actor_user_id: string }
        Returns: {
          created_at: string
          created_by: string
          effective_from: string
          evidence_ref: string
          is_active: boolean
          is_current: boolean
          mappings: Json
          name_ar: string
          name_en: string
          posting_rule_id: string
          previous_version: number
          profile_id: string
          reason: string
          rule_code: string
          version: number
        }[]
      }
      post_accounting_ap_bridge_journal: {
        Args: {
          p_actor_user_id: string
          p_expected_version: number
          p_journal_id: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      post_accounting_ar_bridge_journal: {
        Args: {
          p_actor_user_id: string
          p_expected_version: number
          p_journal_id: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      post_accounting_expense_bridge_journal: {
        Args: {
          p_actor: string
          p_expected: number
          p_journal: string
          p_request: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      post_accounting_inception_journal: {
        Args: {
          p_actor_user_id: string
          p_expected_version: number
          p_journal_id: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      post_accounting_journal: {
        Args: {
          p_actor_user_id: string
          p_expected_version: number
          p_journal_id: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      post_accounting_revenue_recognition_journal: {
        Args: {
          p_actor: string
          p_expected_version: number
          p_journal_id: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      prepare_accounting_ap_bridge_event: {
        Args: {
          p_actor_user_id: string
          p_event_id: string
          p_event_version: number
          p_period_id: string
          p_period_version: number
          p_posting_rule_id: string
          p_reason: string
          p_request_id: string
          p_rule_version: number
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      prepare_accounting_ar_bridge_event: {
        Args: {
          p_actor_user_id: string
          p_event_id: string
          p_event_version: number
          p_period_id: string
          p_period_version: number
          p_posting_rule_id: string
          p_reason: string
          p_request_id: string
          p_rule_version: number
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      prepare_accounting_bank_reconciliation: {
        Args: {
          p_actor_user_id: string
          p_allocations: Json
          p_as_of_date: string
          p_binding_id: string
          p_binding_version: number
          p_evidence_ref: string
          p_expected_version: number
          p_group_id: string
          p_rationale: string
          p_recorded_at_cutoff: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          group_id: string
          idempotent_replay: boolean
          status: string
          version: number
        }[]
      }
      prepare_accounting_expense_bridge_event: {
        Args: {
          p_actor: string
          p_event_id: string
          p_event_version: number
          p_period: string
          p_period_version: number
          p_reason: string
          p_request: string
          p_rule: string
          p_rule_version: number
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      prepare_accounting_inception_journal: {
        Args: {
          p_actor_user_id: string
          p_item_id: string
          p_package_id: string
          p_package_version: number
          p_reason: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      prepare_accounting_journal: {
        Args: {
          p_actor_user_id: string
          p_evidence_ref: string
          p_expected_version: number
          p_journal: Json
          p_journal_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      prepare_accounting_period_close: {
        Args: {
          p_actor_user_id: string
          p_evidence_ref: string
          p_expected_period_version: number
          p_package_kind: string
          p_period_id: string
          p_reason: string
          p_recorded_at_cutoff: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          evidence_snapshot: Json
          idempotent_replay: boolean
          package_id: string
          package_state: string
          package_version: number
        }[]
      }
      prepare_accounting_revenue_recognition: {
        Args: {
          p_accounting_date: string
          p_actor: string
          p_evidence_id: string
          p_evidence_version: number
          p_period_id: string
          p_period_version: number
          p_posting_rule_id: string
          p_reason: string
          p_request_id: string
          p_rule_version: number
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          status: string
          version: number
        }[]
      }
      reconcile_invoice_create_mutation: {
        Args: {
          p_invoice_type: string
          p_mutation_key: string
          p_quotation_id: string
          p_requested_amount: number
          p_service_id: string
        }
        Returns: {
          invoice_id: string
          invoice_number: string
          reconciliation_status: string
        }[]
      }
      reconcile_quotation_discount_allocations: {
        Args: { p_quotation_id: string }
        Returns: undefined
      }
      record_cash_advance_return: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_id: string
          p_amount: number
          p_notes: string
          p_receipt_reference: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          return_id: string
        }[]
      }
      record_customer_internal_credit_adjustment: {
        Args: {
          p_actor_id: string
          p_amount: number
          p_customer_id: string
          p_effective_date: string
          p_invoice_id: string
          p_reason: string
          p_reason_code: string
          p_request_id: string
          p_service_id: string
          p_source_approved_billing_scope_id: string
          p_successor_approved_billing_scope_id: string
        }
        Returns: {
          amount: number
          credit_adjustment_id: string
          customer_credit_balance: number
          customer_id: string
          error_code: string
          idempotent_replay: boolean
          invoice_id: string
          net_receivable_amount: number
          service_id: string
        }[]
      }
      record_customer_receipt: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_date: string
          p_method: string
          p_notes: string
          p_reference: string
          p_request_id: string
          p_user_id: string
        }
        Returns: {
          allocated_amount: number
          customer_id: string
          error_code: string
          idempotent_replay: boolean
          payment_id: string
          payment_number: string
          receipt_amount: number
          receipt_status: string
          unapplied_amount: number
        }[]
      }
      record_event_cost_etc: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_etc_amount: number
          p_forecast_date: string
          p_notes: string
          p_reason: string
          p_request_id: string
          p_service_id: string
        }
        Returns: {
          error_code: string
          etc_amount: number
          forecast_id: string
          forecast_version: number
          idempotent_replay: boolean
        }[]
      }
      record_expense_evidence_exception: {
        Args: {
          p_accountable_owner_id: string
          p_actor_id: string
          p_actor_role: string
          p_expense_id: string
          p_reason: string
          p_request_id: string
          p_review_before: string
        }
        Returns: {
          error_code: string
          exception_id: string
          idempotent_replay: boolean
        }[]
      }
      record_invoice_payment:
        | {
            Args: {
              p_amount: number
              p_date: string
              p_invoice_id: string
              p_method: string
              p_reference: string
              p_user_id: string
            }
            Returns: {
              amount_paid: number
              balance_due: number
              payment_id: string
              payment_number: string
              status: string
            }[]
          }
        | {
            Args: {
              p_amount: number
              p_date: string
              p_invoice_id: string
              p_method: string
              p_reference: string
              p_request_id: string
              p_user_id: string
            }
            Returns: {
              amount_paid: number
              balance_due: number
              error_code: string
              invoice_status: string
              payment_id: string
              payment_number: string
            }[]
          }
      record_petty_cash_transaction: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_amount: number
          p_expense_id: string
          p_fund_id: string
          p_notes: string
          p_reference: string
          p_request_id: string
          p_transaction_type: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          transaction_id: string
        }[]
      }
      record_supplier_advance_payment: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_id: string
          p_amount: number
          p_document_id: string
          p_evidence_sha256: string
          p_method: string
          p_notes: string
          p_payment_date: string
          p_reference: string
          p_request_id: string
        }
        Returns: {
          advance_id: string
          error_code: string
          idempotent_replay: boolean
          paid_amount: number
          payment_id: string
          payment_number: string
          remaining_unallocated_amount: number
        }[]
      }
      record_supplier_payment: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_amount: number
          p_document_id: string
          p_method: string
          p_notes: string
          p_payment_date: string
          p_reference: string
          p_request_id: string
          p_supplier_bill_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          outstanding_amount: number
          paid_amount: number
          payment_id: string
          payment_number: string
          payment_status: string
          supplier_bill_id: string
        }[]
      }
      refund_customer_credit: {
        Args: {
          p_actor_id: string
          p_amount: number
          p_business_date: string
          p_customer_id: string
          p_reason: string
          p_reference: string
          p_refund_method: string
          p_request_id: string
          p_source_credit_adjustment_id: string
        }
        Returns: {
          amount: number
          customer_credit_balance: number
          customer_id: string
          error_code: string
          idempotent_replay: boolean
          refund_id: string
          remaining_credit_amount: number
          source_credit_adjustment_id: string
        }[]
      }
      refund_supplier_advance: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_id: string
          p_amount: number
          p_business_date: string
          p_document_id: string
          p_evidence_sha256: string
          p_reason: string
          p_reference: string
          p_request_id: string
        }
        Returns: {
          advance_id: string
          error_code: string
          idempotent_replay: boolean
          refund_id: string
          refund_number: string
          refunded_amount: number
          remaining_unallocated_amount: number
        }[]
      }
      reject_cash_advance: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_id: string
          p_rejection_reason: string
          p_request_id: string
        }
        Returns: {
          advance_id: string
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      reject_expense: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_expense_id: string
          p_rejection_reason: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          expense_id: string
          idempotent_replay: boolean
        }[]
      }
      release_supplier_advance_authorization: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          advance_id: string
          error_code: string
          idempotent_replay: boolean
          release_id: string
        }[]
      }
      reopen_event_cost: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_reason: string
          p_request_id: string
          p_service_id: string
        }
        Returns: {
          close_id: string
          close_version: number
          error_code: string
          idempotent_replay: boolean
          reopen_id: string
        }[]
      }
      request_cash_advance: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_number: string
          p_amount_issued: number
          p_context_type: string
          p_purpose: string
          p_recipient_id: string
          p_request_id: string
          p_service_id: string
        }
        Returns: {
          advance_id: string
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      reverse_accounting_journal: {
        Args: {
          p_accounting_date: string
          p_actor_user_id: string
          p_evidence_ref: string
          p_original_journal_id: string
          p_period_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          journal_id: string
          original_journal_id: string
          version: number
        }[]
      }
      reverse_customer_credit_application: {
        Args: {
          p_actor_id: string
          p_amount: number
          p_business_date: string
          p_customer_id: string
          p_reason: string
          p_request_id: string
          p_source_application_id: string
        }
        Returns: {
          amount: number
          customer_credit_balance: number
          customer_id: string
          error_code: string
          idempotent_replay: boolean
          remaining_credit_amount: number
          reversal_id: string
          source_application_id: string
          target_outstanding_amount: number
        }[]
      }
      reverse_customer_internal_credit_adjustment: {
        Args: {
          p_actor_id: string
          p_amount: number
          p_customer_id: string
          p_effective_date: string
          p_reason: string
          p_request_id: string
          p_source_credit_adjustment_id: string
        }
        Returns: {
          amount: number
          customer_id: string
          error_code: string
          idempotent_replay: boolean
          reversal_id: string
          source_credit_adjustment_id: string
        }[]
      }
      reverse_customer_receipt: {
        Args: {
          p_payment_id: string
          p_reason: string
          p_request_id: string
          p_user_id: string
        }
        Returns: {
          allocated_amount: number
          error_code: string
          idempotent_replay: boolean
          payment_id: string
          payment_number: string
          receipt_amount: number
          receipt_status: string
          unapplied_amount: number
        }[]
      }
      reverse_customer_receipt_allocation: {
        Args: {
          p_allocation_id: string
          p_reason: string
          p_request_id: string
          p_user_id: string
        }
        Returns: {
          allocation_id: string
          error_code: string
          idempotent_replay: boolean
          invoice_id: string
          payment_id: string
          restored_invoice_balance_due: number
          restored_receipt_unapplied_amount: number
        }[]
      }
      reverse_customer_refund: {
        Args: {
          p_actor_id: string
          p_amount: number
          p_business_date: string
          p_customer_id: string
          p_reason: string
          p_request_id: string
          p_source_refund_id: string
        }
        Returns: {
          amount: number
          customer_credit_balance: number
          customer_id: string
          error_code: string
          idempotent_replay: boolean
          remaining_credit_amount: number
          reversal_id: string
          source_refund_id: string
        }[]
      }
      reverse_supplier_advance_allocation: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_allocation_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          advance_id: string
          allocation_id: string
          bill_id: string
          bill_outstanding_amount: number
          error_code: string
          idempotent_replay: boolean
          remaining_unallocated_amount: number
        }[]
      }
      reverse_supplier_advance_payment: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_payment_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          advance_id: string
          error_code: string
          idempotent_replay: boolean
          paid_amount: number
          payment_id: string
          remaining_unallocated_amount: number
        }[]
      }
      reverse_supplier_payment: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_payment_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          outstanding_amount: number
          paid_amount: number
          payment_id: string
          payment_status: string
          supplier_bill_id: string
        }[]
      }
      review_accounting_bank_binding: {
        Args: {
          p_actor_user_id: string
          p_approve: boolean
          p_binding_id: string
          p_binding_version: number
          p_reason: string
          p_request_id: string
        }
        Returns: {
          binding_id: string
          error_code: string
          idempotent_replay: boolean
          status: string
          version: number
        }[]
      }
      review_accounting_bank_reconciliation: {
        Args: {
          p_actor_user_id: string
          p_approve: boolean
          p_group_id: string
          p_group_version: number
          p_reason: string
          p_request_id: string
        }
        Returns: {
          decision: string
          error_code: string
          group_id: string
          group_version: number
          idempotent_replay: boolean
        }[]
      }
      review_accounting_inception_package: {
        Args: {
          p_actor_user_id: string
          p_approve: boolean
          p_package_id: string
          p_package_version: number
          p_reason: string
          p_request_id: string
        }
        Returns: {
          decision: string
          error_code: string
          idempotent_replay: boolean
          review_id: string
        }[]
      }
      review_accounting_period_close: {
        Args: {
          p_actor_user_id: string
          p_approve: boolean
          p_package_id: string
          p_package_version: number
          p_reason: string
          p_request_id: string
        }
        Returns: {
          decision: string
          error_code: string
          idempotent_replay: boolean
          package_id: string
          package_version: number
          resulting_period_version: number
        }[]
      }
      review_accounting_revenue_arrangement: {
        Args: {
          p_actor: string
          p_approve: boolean
          p_arrangement_id: string
          p_arrangement_version: number
          p_reason: string
          p_request_id: string
        }
        Returns: {
          decision: string
          error_code: string
          idempotent_replay: boolean
          review_id: string
        }[]
      }
      review_accounting_revenue_performance_evidence: {
        Args: {
          p_actor: string
          p_approve: boolean
          p_evidence_id: string
          p_evidence_version: number
          p_reason: string
          p_request_id: string
        }
        Returns: {
          decision: string
          error_code: string
          idempotent_replay: boolean
          review_id: string
        }[]
      }
      review_approved_billing_scope_line_safety: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_line_safety_status: string
          p_reason_code: string
          p_reviewer_note: string
          p_scope_id: string
        }
        Returns: {
          error_code: string
          line_safety_reviewed_at: string
          line_safety_status: string
          reviewed: boolean
          scope_id: string
          service_id: string
        }[]
      }
      review_expense_finance: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_expense_id: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          expense_id: string
          idempotent_replay: boolean
        }[]
      }
      review_service_receipt: {
        Args: {
          p_acceptance_status: string
          p_actor_id: string
          p_actor_role: string
          p_conditions_notes: string
          p_receipt_id: string
          p_request_id: string
        }
        Returns: {
          acceptance_status: string
          commitment_id: string
          error_code: string
          idempotent_replay: boolean
          receipt_id: string
          service_id: string
          supplier_id: string
        }[]
      }
      save_accounting_account: {
        Args: {
          p_account: Json
          p_account_id: string
          p_actor_user_id: string
          p_evidence_ref: string
          p_expected_version: number
          p_reason: string
          p_request_id: string
        }
        Returns: {
          account_id: string
          error_code: string
          idempotent_replay: boolean
          version: number
        }[]
      }
      save_accounting_ap_bridge_event: {
        Args: {
          p_accounting_date: string
          p_actor_user_id: string
          p_amount_halalah: number
          p_cash_account_id: string
          p_cash_account_version: number
          p_cash_binding_evidence_ref: string
          p_cash_binding_evidence_sha256: string
          p_classification: string
          p_direct_classification: string
          p_evidence_ref: string
          p_evidence_sha256: string
          p_expected_version: number
          p_matched_receipt_halalah: number
          p_reason: string
          p_request_id: string
          p_source_record_id: string
          p_source_type: string
        }
        Returns: {
          error_code: string
          event_id: string
          idempotent_replay: boolean
          status: string
          version: number
        }[]
      }
      save_accounting_ar_bridge_event: {
        Args: {
          p_accounting_date: string
          p_actor_user_id: string
          p_classification: string
          p_evidence_ref: string
          p_evidence_sha256: string
          p_expected_version: number
          p_reason: string
          p_request_id: string
          p_source_record_id: string
          p_source_type: string
        }
        Returns: {
          error_code: string
          event_id: string
          idempotent_replay: boolean
          status: string
          version: number
        }[]
      }
      save_accounting_bank_binding: {
        Args: {
          p_account_id: string
          p_account_version: number
          p_actor_user_id: string
          p_bank_identity_ref: string
          p_bank_identity_sha256: string
          p_binding_id: string
          p_effective_from: string
          p_effective_through: string
          p_evidence_ref: string
          p_evidence_sha256: string
          p_expected_version: number
          p_masked_display_identity: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          binding_id: string
          error_code: string
          idempotent_replay: boolean
          status: string
          version: number
        }[]
      }
      save_accounting_bank_statement_batch: {
        Args: {
          p_actor_user_id: string
          p_batch_id: string
          p_binding_id: string
          p_binding_version: number
          p_closing_balance_halalah: number
          p_coverage_end: string
          p_coverage_start: string
          p_evidence_identity: string
          p_evidence_sha256: string
          p_expected_version: number
          p_opening_balance_halalah: number
          p_reason: string
          p_request_id: string
          p_source_document_ref: string
        }
        Returns: {
          batch_id: string
          error_code: string
          idempotent_replay: boolean
          status: string
          version: number
        }[]
      }
      save_accounting_bank_statement_line: {
        Args: {
          p_actor_user_id: string
          p_batch_id: string
          p_batch_version: number
          p_description: string
          p_duplicate_fingerprint: string
          p_expected_version: number
          p_line_id: string
          p_reason: string
          p_reference: string
          p_request_id: string
          p_signed_amount_halalah: number
          p_source_row_identity: string
          p_stable_line_identity: string
          p_transaction_date: string
          p_value_date: string
        }
        Returns: {
          duplicate_candidate: boolean
          error_code: string
          idempotent_replay: boolean
          line_id: string
          status: string
          version: number
        }[]
      }
      save_accounting_expense_bridge_event: {
        Args: {
          p_actor: string
          p_contract: Json
          p_expected: number
          p_reason: string
          p_request: string
          p_source_id: string
          p_type: string
        }
        Returns: {
          error_code: string
          event_id: string
          idempotent_replay: boolean
          status: string
          version: number
        }[]
      }
      save_accounting_inception_package: {
        Args: {
          p_actor_user_id: string
          p_expected_version: number
          p_package: Json
          p_package_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          package_id: string
          version: number
        }[]
      }
      save_accounting_period: {
        Args: {
          p_actor_user_id: string
          p_evidence_ref: string
          p_expected_version: number
          p_period: Json
          p_period_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          period_id: string
          version: number
        }[]
      }
      save_accounting_posting_rule: {
        Args: {
          p_actor_user_id: string
          p_evidence_ref: string
          p_expected_version: number
          p_posting_rule_id: string
          p_reason: string
          p_request_id: string
          p_rule: Json
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          posting_rule_id: string
          version: number
        }[]
      }
      save_accounting_revenue_arrangement: {
        Args: {
          p_abs_id: string
          p_actor: string
          p_expected_version: number
          p_modification_evidence_ref: string
          p_modification_evidence_sha256: string
          p_policy_version: string
          p_principal_agent_basis: string
          p_reason: string
          p_request_id: string
          p_service_id: string
          p_units: Json
        }
        Returns: {
          arrangement_id: string
          consideration_halalah: string
          error_code: string
          held_code: string
          idempotent_replay: boolean
          status: string
          version: number
        }[]
      }
      save_accounting_revenue_performance_evidence: {
        Args: {
          p_actor: string
          p_correction_amount_halalah: string
          p_correction_of_recognition_event_id: string
          p_evidence_basis: string
          p_evidence_key: string
          p_evidence_ref: string
          p_evidence_sha256: string
          p_expected_version: number
          p_performance_from: string
          p_performance_through: string
          p_rationale: string
          p_recognized_to_date_halalah: string
          p_request_id: string
          p_unit_id: string
        }
        Returns: {
          error_code: string
          evidence_id: string
          held_code: string
          idempotent_replay: boolean
          status: string
          version: number
        }[]
      }
      save_accounting_statement_mapping: {
        Args: {
          p_actor_user_id: string
          p_effective_from: string
          p_entries: Json
          p_evidence_ref: string
          p_expected_version: number
          p_mapping_set_id: string
          p_profile_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: Json
      }
      select_procurement_package_supplier: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_package_id: string
          p_request_id: string
          p_selection_evidence: string
          p_selection_reason: string
          p_service_id: string
          p_supplier_id: string
          p_supplier_quotation_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          package_id: string
          quotation_id: string
          supplier_id: string
        }[]
      }
      select_service_procurement_supplier: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_request_id: string
          p_requirement_id: string
          p_selection_evidence: string
          p_selection_reason: string
          p_supplier_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          requirement_id: string
          selected_supplier_id: string
          selection_status: string
          service_id: string
        }[]
      }
      service_lifecycle_payment_state: {
        Args: { p_service_id: string }
        Returns: string
      }
      set_accounting_capability: {
        Args: {
          p_actor_user_id: string
          p_capability: string
          p_effect: string
          p_evidence_ref: string
          p_expected_revision: number
          p_expires_at: string
          p_reason: string
          p_request_id: string
          p_target_user_id: string
        }
        Returns: {
          capability_event_id: string
          error_code: string
          idempotent_replay: boolean
          revision: number
        }[]
      }
      set_app_user_active: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_is_active: boolean
          p_user_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          is_active: boolean
          role: string
          user_id: string
        }[]
      }
      set_app_user_permission_override: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_effect: string
          p_permission: string
          p_user_id: string
        }
        Returns: {
          effect: string
          error_code: string
          idempotent_replay: boolean
          permission: string
          user_id: string
        }[]
      }
      set_petty_cash_fund_status: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_fund_id: string
          p_new_status: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          fund_id: string
          idempotent_replay: boolean
        }[]
      }
      set_procurement_package_requirements: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_package_id: string
          p_request_id: string
          p_requirements: Json
          p_service_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          package_id: string
          requirement_count: number
        }[]
      }
      set_quotation_commercial_structure: {
        Args: { p_lines: Json; p_quotation_id: string; p_user_id: string }
        Returns: {
          discount: number
          error_code: string
          grand_total: number
          line_count: number
          quotation_id: string
          subtotal: number
          vat_amount: number
        }[]
      }
      settle_cash_advance_spend: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_advance_id: string
          p_amount: number
          p_expense_id: string
          p_notes: string
          p_request_id: string
        }
        Returns: {
          allocation_id: string
          error_code: string
          idempotent_replay: boolean
        }[]
      }
      settle_expense_reimbursement: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_amount: number
          p_expense_id: string
          p_notes: string
          p_payment_reference: string
          p_request_id: string
          p_settlement_method: string
          p_settlement_number: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          settlement_id: string
        }[]
      }
      start_service_execution: {
        Args: { p_actor_id: string; p_actor_role: string; p_service_id: string }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          service_id: string
          service_status: string
        }[]
      }
      submit_expense: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_amount: number
          p_cash_advance_id: string
          p_claimant_id: string
          p_context_type: string
          p_description: string
          p_expense_category: string
          p_expense_date: string
          p_expense_number: string
          p_origin_type: string
          p_payment_method: string
          p_petty_cash_fund_id: string
          p_request_id: string
          p_service_id: string
        }
        Returns: {
          error_code: string
          expense_id: string
          idempotent_replay: boolean
        }[]
      }
      transition_approved_commitment: {
        Args: {
          p_action: string
          p_actor_id: string
          p_actor_role: string
          p_commitment_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: {
          authorized_amount: number
          commitment_id: string
          commitment_status: string
          error_code: string
          idempotent_replay: boolean
          open_commitment_amount: number
          service_id: string
        }[]
      }
      transition_service_lifecycle: {
        Args: {
          p_action: string
          p_actor_id: string
          p_actor_role: string
          p_gate_basis: string
          p_reason: string
          p_request_id: string
          p_service_id: string
        }
        Returns: {
          close_state: string
          commercial_state: string
          completion_state: string
          error_code: string
          execution_state: string
          idempotent_replay: boolean
          legacy_status: string
          payment_state: string
          readiness_state: string
          service_id: string
          start_gate_basis: string
          state_version: number
        }[]
      }
      unmatch_accounting_bank_reconciliation: {
        Args: {
          p_actor_user_id: string
          p_group_id: string
          p_group_version: number
          p_reason: string
          p_request_id: string
        }
        Returns: {
          decision: string
          error_code: string
          group_id: string
          group_version: number
          idempotent_replay: boolean
        }[]
      }
      update_accounting_profile: {
        Args: {
          p_actor_user_id: string
          p_evidence_ref: string
          p_expected_version: number
          p_profile: Json
          p_reason: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          profile_id: string
          version: number
        }[]
      }
      update_app_user_role: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_role: string
          p_user_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          is_active: boolean
          role: string
          user_id: string
        }[]
      }
      update_approved_commercial_amendment_draft: {
        Args: {
          p_expected_updated_at: string
          p_lines: Json
          p_quotation: Json
          p_quotation_id: string
          p_user_id: string
        }
        Returns: {
          discount: number
          error_code: string
          grand_total: number
          line_count: number
          quotation_id: string
          subtotal: number
          updated_at: string
          vat_amount: number
        }[]
      }
      update_draft_flexible_invoice_atomic: {
        Args: {
          p_actor_clerk_user_id: string
          p_due_date: string
          p_invoice_id: string
          p_mutation_key: string
          p_requested_amount: number
        }
        Returns: {
          error_code: string
          invoice_id: string
          invoice_number: string
        }[]
      }
      update_flexible_quotation_draft: {
        Args: {
          p_expected_updated_at: string
          p_lines: Json
          p_quotation: Json
          p_quotation_id: string
          p_user_id: string
        }
        Returns: {
          discount: number
          error_code: string
          grand_total: number
          line_count: number
          quotation_id: string
          subtotal: number
          updated_at: string
          vat_amount: number
        }[]
      }
      update_petty_cash_fund: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_custodian_id: string
          p_float_limit: number
          p_fund_id: string
          p_fund_name: string
          p_request_id: string
        }
        Returns: {
          error_code: string
          fund_id: string
          idempotent_replay: boolean
        }[]
      }
      update_quotation_with_items: {
        Args: {
          p_items: Json
          p_quotation: Json
          p_quotation_id: string
          p_user_id: string
        }
        Returns: {
          discount: number
          grand_total: number
          quotation_id: string
          quotation_number: string
          subtotal: number
          vat_amount: number
        }[]
      }
      update_supplier_bill: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_bill_id: string
          p_commitment_id: string
          p_currency: string
          p_due_date: string
          p_invoice_date: string
          p_invoice_number: string
          p_request_id: string
          p_service_id: string
          p_service_receipt_id: string
          p_subtotal: number
          p_supplier_id: string
          p_total_amount: number
          p_vat_amount: number
        }
        Returns: {
          bill_id: string
          bill_number: string
          error_code: string
          idempotent_replay: boolean
          status: string
        }[]
      }
      update_supplier_bill_w6a_original: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_bill_id: string
          p_commitment_id: string
          p_currency: string
          p_due_date: string
          p_invoice_date: string
          p_invoice_number: string
          p_request_id: string
          p_service_id: string
          p_service_receipt_id: string
          p_subtotal: number
          p_supplier_id: string
          p_total_amount: number
          p_vat_amount: number
        }
        Returns: {
          bill_id: string
          bill_number: string
          error_code: string
          idempotent_replay: boolean
          status: string
        }[]
      }
      upsert_procurement_package: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_description: string
          p_name: string
          p_package_id: string
          p_procurement_method: string
          p_request_id: string
          p_service_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          package_id: string
          service_id: string
          status: string
        }[]
      }
      upsert_service_procurement_candidate: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_comparison_notes: string
          p_evidence_ref: string
          p_offer_summary: string
          p_quoted_amount: number
          p_request_id: string
          p_requirement_id: string
          p_supplier_id: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          requirement_id: string
          service_id: string
          supplier_id: string
        }[]
      }
      upsert_service_procurement_requirement: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_request_id: string
          p_requirement: string
          p_requirement_id: string
          p_service_id: string
          p_sourcing_evidence: string
          p_sourcing_path: string
          p_sourcing_reason: string
        }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          requirement_id: string
          selected_supplier_id: string
          selection_status: string
          service_id: string
        }[]
      }
      validate_accounting_inception_payload: {
        Args: { p_payload: Json; p_profile_id: string }
        Returns: string
      }
      void_approved_billing_scope: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_reason_code: string
          p_reason_note: string
          p_scope_id: string
        }
        Returns: {
          applicable_invoice_count: number
          error_code: string
          lifetime_invoice_total: number
          payment_history_count: number
          scope_id: string
          scope_version: number
          service_id: string
          voided: boolean
          voided_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
