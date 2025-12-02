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

async function editTelegramMessage(chatId: string, messageId: string, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
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
    const { type, taskId, userId } = await req.json();
    
    // Get task details
    const { data: task } = await supabase
      .from("tasks")
      .select(`
        *,
        assigned_to_profile:profiles!tasks_assigned_to_fkey(
          id, full_name, telegram_chat_id, telegram_user_id
        ),
        assigned_by_profile:profiles!tasks_assigned_by_fkey(
          id, full_name, telegram_chat_id
        )
      `)
      .eq("id", taskId)
      .single();
    
    if (!task) {
      throw new Error("Task not found");
    }
    
    const assignee = task.assigned_to_profile;
    const assigner = task.assigned_by_profile;
    
    if (type === "task_created" && assignee?.telegram_chat_id) {
      // Send notification to assignee
      const keyboard = {
        inline_keyboard: [[
          { text: "✅ Mark Done", callback_data: `done_${task.id}` },
          { text: "⏳ Delay", callback_data: `delay_${task.id}` },
        ], [
          { text: "💬 Comment", callback_data: `comment_${task.id}` },
        ]],
      };
      
      const dueDate = new Date(task.due_date);
      const result = await sendTelegramMessage(
        assignee.telegram_chat_id,
        `🆕 <b>New Task Assigned</b>\n\n` +
        `📝 ${task.title}\n` +
        `📅 Due: ${dueDate.toLocaleDateString()}\n` +
        `💎 Credits: ${task.credit_points || 0}`,
        keyboard
      );
      
      // Store message ID
      if (result.ok) {
        await supabase
          .from("tasks")
          .update({
            telegram_message_id: result.result.message_id.toString(),
            telegram_chat_id: assignee.telegram_chat_id,
          })
          .eq("id", task.id);
      }
    } else if (type === "task_updated" && task.telegram_message_id && task.telegram_chat_id) {
      // Update existing message
      let text = "";
      let keyboard: any = null;
      
      if (task.status === "completed") {
        text = `✅ <b>${task.title}</b>\n\n<i>Completed</i>\n💎 Credits earned: ${task.credit_points || 0}`;
      } else if (task.status === "overdue") {
        text = `⚠️ <b>${task.title}</b>\n\n<i>Overdue!</i>\n📅 Was due: ${new Date(task.due_date).toLocaleDateString()}`;
        keyboard = {
          inline_keyboard: [[
            { text: "✅ Mark Done", callback_data: `done_${task.id}` },
          ]],
        };
      } else {
        const dueDate = new Date(task.due_date);
        text = `📝 <b>${task.title}</b>\n\n` +
          `Status: ${task.status}\n` +
          `📅 Due: ${dueDate.toLocaleDateString()}\n` +
          `💎 Credits: ${task.credit_points || 0}`;
        
        keyboard = {
          inline_keyboard: [[
            { text: "✅ Mark Done", callback_data: `done_${task.id}` },
            { text: "⏳ Delay", callback_data: `delay_${task.id}` },
          ], [
            { text: "💬 Comment", callback_data: `comment_${task.id}` },
          ]],
        };
      }
      
      await editTelegramMessage(
        task.telegram_chat_id,
        task.telegram_message_id,
        text,
        keyboard
      );
    } else if (type === "task_completed" && assigner?.telegram_chat_id) {
      // Notify assigner about completion
      await sendTelegramMessage(
        assigner.telegram_chat_id,
        `✅ <b>Task Completed</b>\n\n` +
        `📝 ${task.title}\n` +
        `👤 By: ${assignee?.full_name || "Unknown"}\n` +
        `💎 Credits awarded: ${task.credit_points || 0}`
      );
    } else if (type === "reminder" && assignee?.telegram_chat_id) {
      // Send reminder
      const dueDate = new Date(task.due_date);
      const hoursLeft = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60));
      
      await sendTelegramMessage(
        assignee.telegram_chat_id,
        `⏰ <b>Task Reminder</b>\n\n` +
        `📝 ${task.title}\n` +
        `📅 Due in ${hoursLeft} hours!\n` +
        `💎 Credits: ${task.credit_points || 0}`
      );
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
