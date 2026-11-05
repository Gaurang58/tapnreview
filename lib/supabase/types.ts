/**
 * Database types for supabase-js. Hand-written to match supabase/migrations.
 * After changing a migration you can regenerate with:
 *   npx supabase gen types typescript --linked > lib/supabase/types.ts
 * (then keep the exported helper aliases at the bottom of this file).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "admin" | "area_manager" | "bureau_manager" | "staff";
export type TapMethod = "nfc" | "qr";

type AnalyticsArgs = {
  p_from: string;
  p_to: string;
  p_area_id?: string | null;
  p_city_id?: string | null;
  p_store_id?: string | null;
  p_method?: TapMethod | null;
  p_include_demo?: boolean;
  p_include_flagged?: boolean;
};

export type Database = {
  public: {
    Tables: {
      organisations: {
        Row: { id: string; name: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      areas: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cities: {
        Row: { id: string; area_id: string; name: string; created_at: string; updated_at: string };
        Insert: { id?: string; area_id: string; name: string; created_at?: string; updated_at?: string };
        Update: { id?: string; area_id?: string; name?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          city_id: string;
          name: string;
          google_place_id: string | null;
          google_review_url: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          city_id: string;
          name: string;
          google_place_id?: string | null;
          google_review_url: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          city_id?: string;
          name?: string;
          google_place_id?: string | null;
          google_review_url?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          store_id: string;
          label: string;
          public_code: string;
          is_active: boolean;
          retired_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          label: string;
          public_code: string;
          is_active?: boolean;
          retired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          label?: string;
          public_code?: string;
          is_active?: boolean;
          retired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      tap_events: {
        Row: {
          id: number;
          tag_id: string;
          store_id: string;
          method: TapMethod;
          occurred_at: string;
          visitor_hash: string | null;
          is_duplicate: boolean;
          is_bot: boolean;
          is_demo: boolean;
        };
        Insert: {
          id?: never;
          tag_id: string;
          store_id: string;
          method: TapMethod;
          occurred_at?: string;
          visitor_hash?: string | null;
          is_duplicate?: boolean;
          is_bot?: boolean;
          is_demo?: boolean;
        };
        Update: {
          id?: never;
          tag_id?: string;
          store_id?: string;
          method?: TapMethod;
          occurred_at?: string;
          visitor_hash?: string | null;
          is_duplicate?: boolean;
          is_bot?: boolean;
          is_demo?: boolean;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          full_name: string;
          email: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name: string;
          email: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string;
          email?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          organisation_id: string | null;
          area_id: string | null;
          store_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: AppRole;
          organisation_id?: string | null;
          area_id?: string | null;
          store_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: AppRole;
          organisation_id?: string | null;
          area_id?: string | null;
          store_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          details: Json;
          occurred_at: string;
        };
        Insert: {
          id?: never;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          details?: Json;
          occurred_at?: string;
        };
        Update: {
          id?: never;
          actor_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          details?: Json;
          occurred_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      my_role_rank: { Args: Record<string, never>; Returns: number };
      my_memberships: {
        Args: Record<string, never>;
        Returns: { role: AppRole; organisation_id: string | null; area_id: string | null; store_id: string | null }[];
      };
      visible_store_ids: { Args: Record<string, never>; Returns: string[] };
      can_view_store: { Args: { p_store_id: string }; Returns: boolean };
      can_manage_store: { Args: { p_store_id: string }; Returns: boolean };
      can_manage_area: { Args: { p_area_id: string }; Returns: boolean };
      can_manage_city: { Args: { p_city_id: string }; Returns: boolean };
      analytics_totals: {
        Args: AnalyticsArgs;
        Returns: {
          interactions: number;
          nfc: number;
          qr: number;
          demo_events: number;
          active_tags: number;
          live_stores: number;
        }[];
      };
      analytics_daily: {
        Args: AnalyticsArgs;
        Returns: { day: string; nfc: number; qr: number; total: number }[];
      };
      analytics_by_store: {
        Args: AnalyticsArgs;
        Returns: {
          store_id: string;
          store_name: string;
          store_is_active: boolean;
          city_id: string;
          city_name: string;
          area_id: string;
          area_name: string;
          nfc: number;
          qr: number;
          total: number;
          active_tags: number;
          last_tap_at: string | null;
        }[];
      };
      analytics_hourly: {
        Args: AnalyticsArgs;
        Returns: { dow: number; hour: number; nfc: number; qr: number; total: number }[];
      };
      analytics_by_tag: {
        Args: {
          p_from: string;
          p_to: string;
          p_store_id?: string | null;
          p_include_demo?: boolean;
          p_include_flagged?: boolean;
        };
        Returns: {
          tag_id: string;
          label: string;
          public_code: string;
          store_id: string;
          store_name: string;
          is_active: boolean;
          retired_at: string | null;
          nfc: number;
          qr: number;
          total: number;
          last_tap_at: string | null;
        }[];
      };
      analytics_recent: {
        Args: {
          p_limit?: number;
          p_area_id?: string | null;
          p_city_id?: string | null;
          p_store_id?: string | null;
          p_method?: TapMethod | null;
          p_include_demo?: boolean;
        };
        Returns: {
          id: number;
          occurred_at: string;
          method: TapMethod;
          store_id: string;
          store_name: string;
          tag_id: string;
          tag_label: string;
          is_demo: boolean;
        }[];
      };
      analytics_today: {
        Args: {
          p_area_id?: string | null;
          p_city_id?: string | null;
          p_store_id?: string | null;
          p_method?: TapMethod | null;
          p_include_demo?: boolean;
        };
        Returns: number;
      };
    };
    Enums: { app_role: AppRole; tap_method: TapMethod };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Organisation = Tables<"organisations">;
export type Area = Tables<"areas">;
export type City = Tables<"cities">;
export type Store = Tables<"stores">;
export type Tag = Tables<"tags">;
export type TapEvent = Tables<"tap_events">;
export type Profile = Tables<"profiles">;
export type Membership = Tables<"memberships">;
export type AuditEntry = Tables<"audit_log">;

export type StoreBreakdown = Database["public"]["Functions"]["analytics_by_store"]["Returns"][number];
export type DailyPoint = Database["public"]["Functions"]["analytics_daily"]["Returns"][number];
export type HourlyCell = Database["public"]["Functions"]["analytics_hourly"]["Returns"][number];
export type TagBreakdown = Database["public"]["Functions"]["analytics_by_tag"]["Returns"][number];
export type RecentEvent = Database["public"]["Functions"]["analytics_recent"]["Returns"][number];
export type Totals = Database["public"]["Functions"]["analytics_totals"]["Returns"][number];
