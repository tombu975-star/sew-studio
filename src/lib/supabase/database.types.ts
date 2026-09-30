// Hand-written to match the full migration chain in supabase/*.sql
// (0001 through 0010 — this file had drifted and was missing profiles/
// freelancer_profiles.avatar_url and settings.overhead_recovery_basis from
// 0008, which made every `.select()` touching those columns fail to
// type-check). Once the Supabase project is live, prefer regenerating with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
// which will be exactly correct; this file is a faithful-effort stand-in so
// the app has type safety in the meantime.
//
// Every table also carries `Relationships: []` and the schema carries empty
// `Views`/`Functions` maps — required by the GenericTable/GenericSchema
// shape in newer @supabase/postgrest-js versions; without them every query
// silently typed as `never`, masking real errors under hundreds of false
// "Property does not exist on type 'never'" ones.

type Nullable<T> = T | null;

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: string;
          currency: string;
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
