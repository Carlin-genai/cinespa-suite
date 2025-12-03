import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("Telegram bot token not configured, skipping notification");
    return null;
  }
  
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });
  
  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const now = new Date();
    
    // Define reminder windows: 24 hours and 6 hours before due
    const windows = [
      { hours: 24, label: "24 hours" },
      { hours: 6, label: "6 hours" },
    ];
    
    let totalSent = 0;
    
    for (const window of windows) {
      // Calculate the time window for tasks due in approximately `window.hours` hours
      // We use a 30-minute buffer on each side to account for cron timing
      const targetTime = new Date(now.getTime() + window.hours * 60 * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
      const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);
      
      console.log(`Checking for tasks due between ${windowStart.toISOString()} and ${windowEnd.toISOString()} (${window.label} reminder)`);
      
      // Get pending/in-progress tasks due in this window with connected Telegram users
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          due_date,
          credit_points,
          status,
          org_id,
          assigned_to,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(
            id, full_name, telegram_chat_id, is_telegram_connected
          )
        `)
        .in("status", ["pending", "in-progress"])
        .gte("due_date", windowStart.toISOString())
        .lte("due_date", windowEnd.toISOString());
      
      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
        continue;
      }
      
      console.log(`Found ${tasks?.length || 0} tasks for ${window.label} reminder`);
      
      for (const task of tasks || []) {
        const assignee = task.assigned_to_profile;
        
        // Skip if user doesn't have Telegram connected
        if (!assignee?.telegram_chat_id || !assignee?.is_telegram_connected) {
          console.log(`Skipping task ${task.id} - assignee has no Telegram connected`);
          continue;
        }
        
        // Check if we already sent this specific reminder
        const reminderKey = `telegram_reminder_${window.hours}h_${task.id}`;
        const { data: existingReminder } = await supabase
          .from("reminders")
          .select("id")
          .eq("task_id", task.id)
          .eq("message", reminderKey)
          .eq("is_sent", true)
          .maybeSingle();
        
        if (existingReminder) {
          console.log(`Skipping task ${task.id} - ${window.label} reminder already sent`);
          continue;
        }
        
        const dueDate = new Date(task.due_date);
        const hoursLeft = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        const keyboard = {
          inline_keyboard: [[
            { text: "✅ Mark Done", callback_data: `done_${task.id}` },
            { text: "⏳ Request Extension", callback_data: `delay_${task.id}` },
          ]],
        };
        
        const message = 
          `⏰ <b>Task Reminder - ${window.label} left!</b>\n\n` +
          `📝 <b>${task.title}</b>\n` +
          (task.description ? `📄 ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}\n` : '') +
          `📅 Due: ${dueDate.toLocaleString()}\n` +
          `⏱ Time remaining: ~${hoursLeft} hours\n` +
          `💎 Credits: ${task.credit_points || 0}`;
        
        const result = await sendTelegramMessage(
          assignee.telegram_chat_id,
          message,
          keyboard
        );
        
        if (result?.ok) {
          // Record that we sent this reminder
          await supabase
            .from("reminders")
            .insert({
              task_id: task.id,
              user_id: assignee.id,
              org_id: task.org_id,
              message: reminderKey,
              reminder_time: now.toISOString(),
              is_sent: true,
            });
          
          totalSent++;
          console.log(`Sent ${window.label} reminder for task ${task.id} to ${assignee.full_name}`);
        } else {
          console.error(`Failed to send reminder for task ${task.id}:`, result);
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${totalSent} reminder notifications`,
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Task reminders error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
