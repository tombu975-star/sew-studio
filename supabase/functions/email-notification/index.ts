import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const SUPABASE_SECRET_KEY =
  JSON.parse(
    Deno.env.get("SUPABASE_SECRET_KEYS")!
  )["default"];

const NOTIFICATION_SECRET =
  Deno.env.get("NOTIFICATION_SECRET")!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY
);

function unauthorized() {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Unauthorized"
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}

Deno.serve(async (req) => {

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "POST required"
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  const secret =
    req.headers.get("x-notification-secret");

  if (!secret || secret !== NOTIFICATION_SECRET) {
    return unauthorized();
  }

  try {

    const body = await req.json();

    const action = body.action;

    /*
     * GET PENDING NOTIFICATIONS
     */
    if (action === "get_pending") {

      const limit = Math.min(
        Number(body.limit || 20),
        50
      );

      const { data, error } = await supabase
        .from("notification_jobs")
        .select("*")
        .eq("status", "PENDING")
        .lte("scheduled_for", new Date().toISOString())
        .order("scheduled_for", {
          ascending: true
        })
        .limit(limit);

      if (error) {
        throw error;
      }

      return Response.json({
        success: true,
        jobs: data || []
      });
    }


    /*
     * MARK AS SENT
     */
    if (action === "mark_sent") {

      const jobId = body.job_id;

      if (!jobId) {
        return Response.json(
          {
            success: false,
            error: "job_id required"
          },
          { status: 400 }
        );
      }

      const now =
        new Date().toISOString();

      const { data: job, error } =
        await supabase
          .from("notification_jobs")
          .update({
            status: "SENT",
            sent_at: now,
            updated_at: now
          })
          .eq("id", jobId)
          .select()
          .single();

      if (error) {
        throw error;
      }

      await supabase
        .from("notification_logs")
        .insert({
          notification_job_id: jobId,
          provider: "google_apps_script",
          recipient_email: job.recipient_email,
          subject: job.subject,
          status: "SENT",
          sent_at: now
        });

      return Response.json({
        success: true
      });
    }


    /*
     * MARK AS FAILED
     */
    if (action === "mark_failed") {

      const jobId = body.job_id;
      const errorMessage =
        body.error || "Unknown email error";

      if (!jobId) {
        return Response.json(
          {
            success: false,
            error: "job_id required"
          },
          { status: 400 }
        );
      }

      const { data: currentJob } =
        await supabase
          .from("notification_jobs")
          .select("attempts")
          .eq("id", jobId)
          .single();

      const attempts =
        Number(currentJob?.attempts || 0) + 1;

      const status =
        attempts >= 3
          ? "FAILED"
          : "PENDING";

      await supabase
        .from("notification_jobs")
        .update({
          status,
          attempts,
          error_message: errorMessage,
          updated_at:
            new Date().toISOString()
        })
        .eq("id", jobId);

      await supabase
        .from("notification_logs")
        .insert({
          notification_job_id: jobId,
          provider: "google_apps_script",
          status: "FAILED",
          error_message: errorMessage
        });

      return Response.json({
        success: true
      });
    }


    /*
     * CREATE NOTIFICATION
     */
    if (action === "create") {

      const notification = body.notification;

      if (!notification?.recipient_email) {
        return Response.json(
          {
            success: false,
            error: "recipient_email required"
          },
          { status: 400 }
        );
      }

      const { data, error } =
        await supabase
          .from("notification_jobs")
          .insert({
            shop_id:
              notification.shop_id || null,

            notification_type:
              notification.notification_type,

            recipient_email:
              notification.recipient_email,

            recipient_name:
              notification.recipient_name || null,

            subject:
              notification.subject,

            message:
              notification.message,

            reference_type:
              notification.reference_type || null,

            reference_id:
              notification.reference_id || null,

            scheduled_for:
              notification.scheduled_for ||
              new Date().toISOString(),

            status: "PENDING"
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      return Response.json({
        success: true,
        job: data
      });
    }


    return Response.json(
      {
        success: false,
        error: "Unknown action"
      },
      { status: 400 }
    );

  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Server error"
      },
      { status: 500 }
    );
  }
});