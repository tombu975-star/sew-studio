// Hand-written to match the schema in db/migrations/*.sql. Keep this in sync
// with the migration chain so query results remain correctly typed.
//
// Every table also carries `Relationships: []` and the schema carries empty
// `Views`/`Functions` maps — required by the GenericTable/GenericSchema
// shape used by the app's typed query layer.

type Nullable<T> = T | null;

export interface Database {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      shops: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: string;
          trial_started_at: string;
          trial_ends_at: string;
          currency: string;
          suspended_at: Nullable<string>;
          suspended_reason: Nullable<string>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["shops"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["shops"]["Row"]>;
        Relationships: [];
      };
      shop_plan_requests: {
        Row: {
          id: string;
          shop_id: string;
          requested_by: string;
          requested_plan: "pro" | "enterprise";
          status: "pending" | "approved" | "declined";
          message: string;
          reviewed_by: Nullable<string>;
          reviewed_at: Nullable<string>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["shop_plan_requests"]["Row"]> & {
          shop_id: string;
          requested_by: string;
          requested_plan: "pro" | "enterprise";
        };
        Update: Partial<Database["public"]["Tables"]["shop_plan_requests"]["Row"]>;
        Relationships: [];
      };
      system_admins: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["system_admins"]["Row"]> & {
          id: string;
          email: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["system_admins"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "madam" | "staff" | "trainer" | "trainee";
          gender: Nullable<string>;
          phone: Nullable<string>;
          shop_id: string;
          mentor_id: Nullable<string>;
          training_duration_weeks: Nullable<number>;
          training_started_at: Nullable<string>;
          program_id: Nullable<string>;
          can_access_orders: boolean;
          can_access_board: boolean;
          can_manage_freelancers: boolean;
          is_active: boolean;
          removed_at: Nullable<string>;
          avatar_url: Nullable<string>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
          full_name: string;
          shop_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_mentor_id_fkey";
            columns: ["mentor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "training_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      freelancer_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: Nullable<string>;
          specialty: Nullable<string>;
          skills: Nullable<string>;
          avatar_url: Nullable<string>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["freelancer_profiles"]["Row"]> & {
          id: string;
          email: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["freelancer_profiles"]["Row"]>;
        Relationships: [];
      };
      freelancer_shop_links: {
        Row: {
          id: string;
          shop_id: string;
          freelancer_id: string;
          rate_notes: Nullable<string>;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["freelancer_shop_links"]["Row"]> & {
          shop_id: string;
          freelancer_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["freelancer_shop_links"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "freelancer_shop_links_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "freelancer_shop_links_freelancer_id_fkey";
            columns: ["freelancer_id"];
            isOneToOne: false;
            referencedRelation: "freelancer_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      freelance_jobs: {
        Row: {
          id: string;
          shop_id: string;
          freelancer_id: string;
          order_id: Nullable<string>;
          task_description: string;
          cost: Nullable<number>;
          due_date: Nullable<string>;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["freelance_jobs"]["Row"]> & {
          shop_id: string;
          freelancer_id: string;
          task_description: string;
        };
        Update: Partial<Database["public"]["Tables"]["freelance_jobs"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "freelance_jobs_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "freelance_jobs_freelancer_id_fkey";
            columns: ["freelancer_id"];
            isOneToOne: false;
            referencedRelation: "freelancer_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          phone: Nullable<string>;
          email: Nullable<string>;
          whatsapp: Nullable<string>;
          gender: Nullable<string>;
          occupation: Nullable<string>;
          city: Nullable<string>;
          country: Nullable<string>;
          entry_source: Nullable<string>;
          referred_by: Nullable<string>;
          customer_type: Nullable<string>;
          preferred_styles: Nullable<string>;
          favourite_colours: Nullable<string>;
          colours_to_avoid: Nullable<string>;
          favourite_fabrics: Nullable<string>;
          preferred_fit: Nullable<string>;
          design_preferences: Nullable<string>;
          style_notes: Nullable<string>;
          skin_tone: Nullable<string>;
          height: Nullable<number>;
          weight: Nullable<number>;
          loyalty_points: number;
          notes: Nullable<string>;
          status: string;
          portal_token: Nullable<string>;
          portal_phone: Nullable<string>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customers"]["Row"]> & {
          shop_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      measurement_sets: {
        Row: {
          id: string;
          shop_id: string;
          customer_id: string;
          staff_id: Nullable<string>;
          unit: string;
          date_taken: string;
          bust: Nullable<number>;
          waist: Nullable<number>;
          hip: Nullable<number>;
          shoulder: Nullable<number>;
          length: Nullable<number>;
          sleeve: Nullable<number>;
          inseam: Nullable<number>;
          neck: Nullable<number>;
          height: Nullable<number>;
          weight: Nullable<number>;
          across_back: Nullable<number>;
          bust_point: Nullable<number>;
          shoulder_to_bust: Nullable<number>;
          underbust: Nullable<number>;
          back_length: Nullable<number>;
          front_length: Nullable<number>;
          upper_arm: Nullable<number>;
          wrist: Nullable<number>;
          waist_to_hip: Nullable<number>;
          crotch_depth: Nullable<number>;
          thigh: Nullable<number>;
          knee: Nullable<number>;
          ankle: Nullable<number>;
          outseam: Nullable<number>;
          posture: Nullable<string>;
          notes: Nullable<string>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["measurement_sets"]["Row"]> & {
          shop_id: string;
          customer_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["measurement_sets"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "measurement_sets_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "measurement_sets_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "measurement_sets_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_feedback: {
        Row: {
          id: string;
          shop_id: string;
          customer_id: string;
          rating: number;
          type: string;
          feedback: Nullable<string>;
          date: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customer_feedback"]["Row"]> & {
          shop_id: string;
          customer_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_feedback"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "customer_feedback_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_feedback_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          shop_id: string;
          customer_id: string;
          garment_design: string;
          design_image: Nullable<string>;
          order_date: string;
          delivery_date: Nullable<string>;
          status: string;
          assigned_staff_id: Nullable<string>;
          selling_price: number;
          fabric_cost: number;
          labour_cost: number;
          notes: Nullable<string>;
          priority: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & {
          shop_id: string;
          customer_id: string;
          garment_design: string;
          order_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "orders_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_assigned_staff_id_fkey";
            columns: ["assigned_staff_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          amount: number;
          method: Nullable<string>;
          date: string;
          note: Nullable<string>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & {
          order_id: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      fittings: {
        Row: {
          id: string;
          order_id: string;
          date: string;
          status: string;
          notes: Nullable<string>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["fittings"]["Row"]> & {
          order_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["fittings"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "fittings_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          shop_id: string;
          title: string;
          order_id: Nullable<string>;
          staff_id: Nullable<string>;
          status: string;
          priority: string;
          due_date: Nullable<string>;
          notes: Nullable<string>;
          max_score: Nullable<number>;
          score: Nullable<number>;
          graded_by_id: Nullable<string>;
          graded_at: Nullable<string>;
          feedback: Nullable<string>;
          competency_unit_id: Nullable<string>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          shop_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "tasks_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_graded_by_id_fkey";
            columns: ["graded_by_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_competency_unit_id_fkey";
            columns: ["competency_unit_id"];
            isOneToOne: false;
            referencedRelation: "competency_units";
            referencedColumns: ["id"];
          },
        ];
      };
      training_programs: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          level: string;
          duration_weeks: number;
          description: Nullable<string>;
          created_by_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["training_programs"]["Row"]> & {
          shop_id: string;
          name: string;
          level: string;
          duration_weeks: number;
          created_by_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["training_programs"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "training_programs_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_programs_created_by_id_fkey";
            columns: ["created_by_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      competency_units: {
        Row: {
          id: string;
          shop_id: string;
          program_id: string;
          code: Nullable<string>;
          title: string;
          learning_outcomes: string;
          assessment_criteria: string;
          nominal_hours: Nullable<number>;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["competency_units"]["Row"]> & {
          shop_id: string;
          program_id: string;
          title: string;
          learning_outcomes: string;
          assessment_criteria: string;
        };
        Update: Partial<Database["public"]["Tables"]["competency_units"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "competency_units_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competency_units_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "training_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      style_concepts: {
        Row: {
          id: string;
          shop_id: string;
          customer_id: string;
          garment_type: string;
          occasion: Nullable<string>;
          desired_look: Nullable<string>;
          season: Nullable<string>;
          budget: Nullable<number>;
          colour_preference: Nullable<string>;
          concept_name: string;
          silhouette: Nullable<string>;
          neckline: Nullable<string>;
          sleeve_style: Nullable<string>;
          length: Nullable<string>;
          fabric: Nullable<string>;
          colour: Nullable<string>;
          detailing: Nullable<string>;
          embellishment: Nullable<string>;
          why_this_may_work: Nullable<string>;
          fit_considerations: Nullable<string>;
          match_percent: Nullable<number>;
          design_direction: Nullable<string>;
          image_url: Nullable<string>;
          status: string;
          rejection_reason: Nullable<string>;
          data_confidence: Nullable<string>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["style_concepts"]["Row"]> & {
          shop_id: string;
          customer_id: string;
          garment_type: string;
          concept_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["style_concepts"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "style_concepts_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "style_concepts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          id: string;
          shop_id: string;
          owner_gender: string;
          studio_name: string;
          overhead_amount: number;
          self_payout: number;
          currency: string;
          deposit_percent: number;
          rush_fee_percent: number;
          quote_valid_days: number;
          full_balance_before_pickup: boolean;
          fittings_included: number;
          alterations_window_days: number;
          deposit_policy_text: string;
          alterations_policy_text: string;
          cancellation_policy_text: string;
          overhead_items: { id: string; name: string; amount: number }[];
          outstanding_balance_alert_threshold: number;
          typical_active_orders_per_staff: number;
          contact_phone: string;
          contact_email: string;
          address: string;
          tax_id: string;
          invoice_prefix: string;
          overhead_recovery_basis: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]> & {
          shop_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "settings_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: true;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      community_posts: {
        Row: {
          id: string;
          shop_id: string;
          author_id: Nullable<string>;
          author_name: string;
          author_role: Nullable<string>;
          type: string;
          title: Nullable<string>;
          body: string;
          image_url: Nullable<string>;
          pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["community_posts"]["Row"]> & {
          shop_id: string;
          author_name: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["community_posts"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "community_posts_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      community_comments: {
        Row: {
          id: string;
          post_id: string;
          author_name: string;
          author_id: Nullable<string>;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["community_comments"]["Row"]> & {
          post_id: string;
          author_name: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["community_comments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      community_likes: {
        Row: {
          id: string;
          post_id: string;
          author_id: Nullable<string>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["community_likes"]["Row"]> & {
          post_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["community_likes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_likes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      training_logs: {
        Row: {
          id: string;
          shop_id: string;
          trainee_id: string;
          mentor_id: Nullable<string>;
          skill: Nullable<string>;
          title: string;
          note: Nullable<string>;
          status: string;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["training_logs"]["Row"]> & {
          shop_id: string;
          trainee_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["training_logs"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "training_logs_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_logs_trainee_id_fkey";
            columns: ["trainee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_logs_mentor_id_fkey";
            columns: ["mentor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      certificates: {
        Row: {
          id: string;
          shop_id: string;
          trainee_id: string;
          issued_by_id: string;
          program_name: string;
          duration_weeks: number;
          skills_achieved: string;
          honors: Nullable<string>;
          certificate_no: string;
          issued_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["certificates"]["Row"]> & {
          shop_id: string;
          trainee_id: string;
          issued_by_id: string;
          skills_achieved: string;
          certificate_no: string;
        };
        Update: Partial<Database["public"]["Tables"]["certificates"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "certificates_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_trainee_id_fkey";
            columns: ["trainee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_issued_by_id_fkey";
            columns: ["issued_by_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_notifications: {
        Row: {
          id: string;
          shop_id: string;
          customer_id: string;
          order_id: Nullable<string>;
          type: string;
          title: string;
          body: string;
          status_from: Nullable<string>;
          status_to: Nullable<string>;
          read_at: Nullable<string>;
          direction: string;
          channel: string;
          recipient: Nullable<string>;
          delivery_status: string;
          sent_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customer_notifications"]["Row"]> & {
          shop_id: string;
          customer_id: string;
          type: string;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_notifications"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "customer_notifications_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_notifications_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_notifications_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
