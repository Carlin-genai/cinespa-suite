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

async function sendTelegramMessage(chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
  
  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get all admins with Telegram
    const { data: admins } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "admin")
      .eq("is_telegram_connected", true)
      .not("telegram_chat_id", "is", null);
    
    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ message: "No admins with Telegram" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayTasks } = await supabase
      .from("tasks")
      .select("*")
      .gte("created_at", today.toISOString());
    
    const { data: completedTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "completed")
      .gte("completed_at", today.toISOString());
    
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "overdue");
    
    const { data: pendingTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("status", ["pending", "in-progress"]);
    
    // Send summary to each admin
    for (const admin of admins) {
      const summary = 
        `📊 <b>Daily Team Summary</b>\n` +
        `${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n\n` +
        `🆕 New tasks today: ${todayTasks?.length || 0}\n` +
        `✅ Completed today: ${completedTasks?.length || 0}\n` +
        `⚠️ Overdue: ${overdueTasks?.length || 0}\n` +
        `📋 Active tasks: ${pendingTasks?.length || 0}\n\n` +
        `Use /mytasks to manage your tasks`;
      
      await sendTelegramMessage(admin.telegram_chat_id!, summary);
    }
    
    return new Response(JSON.stringify({ success: true, sent: admins.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Daily summary error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
