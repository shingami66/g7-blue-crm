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
          source_grand_total: number
          source_discount_allocated: number
          source_is_selected: boolean
          source_parent_authority_line_id: string | null
          source_qty: number
          source_quotation_id: string
          source_quotation_item_id: string
          source_subtotal: number
          source_unit_price: number
          source_vat_amount: number
          source_unit: string
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
          source_grand_total?: number
          source_discount_allocated?: number
          source_is_selected?: boolean
          source_parent_authority_line_id?: string | null
          source_qty?: number
          source_quotation_id: string
          source_quotation_item_id: string
          source_subtotal?: number
          source_unit_price?: number
          source_vat_amount?: number
          source_unit?: string
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
          source_grand_total?: number
          source_discount_allocated?: number
          source_is_selected?: boolean
          source_parent_authority_line_id?: string | null
          source_qty?: number
          source_quotation_id?: string
          source_quotation_item_id?: string
          source_subtotal?: number
          source_unit_price?: number
          source_vat_amount?: number
          source_unit?: string
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
          invoice_id: string
          invoice_status_after: string | null
          is_deleted: boolean | null
          method: string
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
          invoice_id: string
          invoice_status_after?: string | null
          is_deleted?: boolean | null
          method: string
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
          invoice_id?: string
          invoice_status_after?: string | null
          is_deleted?: boolean | null
          method?: string
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
            referencedRelation: "invoices"
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
          id: string
          is_selected: boolean
          qty: number
          quotation_id: string
          parent_authority_line_id: string | null
          total: number
          discount_allocated: number
          unit_price: number
          unit: string
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
          id?: string
          is_selected?: boolean
          qty?: number
          quotation_id: string
          parent_authority_line_id?: string | null
          total?: number
          discount_allocated?: number
          unit_price?: number
          unit?: string
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
          id?: string
          is_selected?: boolean
          qty?: number
          quotation_id?: string
          parent_authority_line_id?: string | null
          total?: number
          discount_allocated?: number
          unit_price?: number
          unit?: string
          updated_at?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_parent_authority_line_fkey"
            columns: ["parent_authority_line_id", "quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_items"
            referencedColumns: ["id", "quotation_id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          date: string
          deleted_at: string | null
          discount: number | null
          event: string
          grand_total: number | null
          id: string
          is_deleted: boolean | null
          mutation_key: string | null
          mutation_payload: Json | null
          quotation_number: string
          quotation_family_id: string
          revision_of_quotation_id: string | null
          revision_number: number
          revision_reason: string | null
          service_id: string
          snapshot_buyer: Json
          snapshot_seller: Json
          status: string
          subtotal: number | null
          updated_at: string | null
          updated_by: string | null
          valid_until: string
          vat_amount: number | null
          vat_rate: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          date: string
          deleted_at?: string | null
          discount?: number | null
          event: string
          grand_total?: number | null
          id?: string
          is_deleted?: boolean | null
          mutation_key?: string | null
          mutation_payload?: Json | null
          quotation_number: string
          quotation_family_id?: string
          revision_of_quotation_id?: string | null
          revision_number?: number
          revision_reason?: string | null
          service_id: string
          snapshot_buyer: Json
          snapshot_seller: Json
          status: string
          subtotal?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valid_until: string
          vat_amount?: number | null
          vat_rate?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          date?: string
          deleted_at?: string | null
          discount?: number | null
          event?: string
          grand_total?: number | null
          id?: string
          is_deleted?: boolean | null
          mutation_key?: string | null
          mutation_payload?: Json | null
          quotation_number?: string
          quotation_family_id?: string
          revision_of_quotation_id?: string | null
          revision_number?: number
          revision_reason?: string | null
          service_id?: string
          snapshot_buyer?: Json
          snapshot_seller?: Json
          status?: string
          subtotal?: number | null
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
      complete_service: {
        Args: { p_actor_id: string; p_actor_role: string; p_service_id: string }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          service_id: string
          service_status: string
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
      generate_document_number: { Args: { doc_type: string }; Returns: string }
      issue_invoice_atomic: {
        Args: { p_actor_clerk_user_id: string; p_invoice_id: string }
        Returns: {
          error_code: string
          invoice_id: string
          invoice_number: string
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
      set_quotation_commercial_structure: {
        Args: {
          p_lines: Json
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
          vat_amount: number
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
          error_code: string | null
          is_replayed: boolean
          quotation_family_id: string | null
          quotation_id: string | null
          quotation_number: string | null
          revision_number: number | null
          service_id: string | null
          source_quotation_id: string | null
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
      start_service_execution: {
        Args: { p_actor_id: string; p_actor_role: string; p_service_id: string }
        Returns: {
          error_code: string
          idempotent_replay: boolean
          service_id: string
          service_status: string
        }[]
      }
      transition_service_lifecycle: {
        Args: {
          p_action: string
          p_actor_id: string
          p_actor_role: string
          p_gate_basis: string | null
          p_reason: string
          p_request_id: string | null
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
          start_gate_basis: string | null
          state_version: number
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
