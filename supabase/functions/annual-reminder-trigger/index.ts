import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PaymentReminder {
  id: string;
  name: string;
  due_date: string;
  created_by: string;
  collaborators: string[];
  reminder_type: string;
  reminder_status: string;
  authorization_required: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[annual-reminder-trigger] Starting execution");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get today's date and calculate the trigger date (30 days from now)
    const today = new Date();
    const triggerDate = new Date();
    triggerDate.setDate(today.getDate() + 30);
    
    console.log(`[annual-reminder-trigger] Checking for reminders due on: ${triggerDate.toISOString().split('T')[0]}`);

    // Find annual reminders that are due in 30 days and haven't been completed
    const { data: reminders, error: reminderError } = await supabase
      .from("payment_reminders")
      .select("*")
      .eq("reminder_type", "annually")
      .eq("due_date", triggerDate.toISOString().split('T')[0])
      .in("reminder_status", ["open", "pending_authorization", "pending_payment"]);

    if (reminderError) {
      console.error("[annual-reminder-trigger] Error fetching reminders:", reminderError);
      throw reminderError;
    }

    console.log(`[annual-reminder-trigger] Found ${reminders?.length || 0} annual reminders to process`);

    let notificationsCreated = 0;

    for (const reminder of reminders || []) {
      console.log(`[annual-reminder-trigger] Processing reminder: ${reminder.name} (ID: ${reminder.id})`);
      
      // Users to notify: creator + collaborators
      const usersToNotify = [reminder.created_by, ...reminder.collaborators].filter(Boolean);
      
      for (const userId of usersToNotify) {
        // Check if we've already sent a notification today for this reminder and user
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const { data: existingNotifications } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "payment_reminder")
          .eq("title", `Annual Payment Due: ${reminder.name}`)
          .gte("created_at", todayStart.toISOString());

        if (existingNotifications && existingNotifications.length > 0) {
          console.log(`[annual-reminder-trigger] Notification already sent today for user ${userId} and reminder ${reminder.id}`);
          continue;
        }

        // Create notification
        const notificationData = {
          user_id: userId,
          title: `Annual Payment Due: ${reminder.name}`,
          message: `Your annual payment "${reminder.name}" is due in 30 days (${new Date(reminder.due_date).toLocaleDateString()}). ${reminder.authorization_required ? 'Authorization will be required before completion.' : ''}`,
          type: "payment_reminder",
          channel: "in_app",
          status: "queued"
        };

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert([notificationData]);

        if (notificationError) {
          console.error(`[annual-reminder-trigger] Error creating notification for user ${userId}:`, notificationError);
        } else {
          console.log(`[annual-reminder-trigger] Created notification for user ${userId}`);
          notificationsCreated++;
        }
      }
    }

    const result = {
      success: true,
      remindersProcessed: reminders?.length || 0,
      notificationsCreated,
      timestamp: new Date().toISOString()
    };

    console.log("[annual-reminder-trigger] Execution completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[annual-reminder-trigger] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);