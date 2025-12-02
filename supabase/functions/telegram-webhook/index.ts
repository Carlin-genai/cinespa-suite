import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  text?: string;
  date: number;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message: TelegramMessage;
  data: string;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Parse task assignment with regex (hybrid approach)
function parseTaskAssignment(text: string): {
  assignee?: string;
  title?: string;
  dueDate?: string;
  priority?: string;
} | null {
  // Pattern: /assign @username Task title due: date [priority: high]
  const assignPattern = /\/assign\s+@(\w+)\s+(.+?)(?:\s+due:\s+(.+?))?(?:\s+priority:\s+(low|medium|high))?$/i;
  const match = text.match(assignPattern);
  
  if (match) {
    return {
      assignee: match[1],
      title: match[2]?.trim(),
      dueDate: match[3]?.trim(),
      priority: match[4]?.toLowerCase() as any || 'medium',
    };
  }
  
  return null;
}

// Parse natural date strings
function parseNaturalDate(dateStr: string): Date {
  const now = new Date();
  const lower = dateStr.toLowerCase();
  
  if (lower === 'today') {
    return new Date(now.setHours(17, 0, 0, 0));
  } else if (lower === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    return tomorrow;
  } else if (lower.includes('day')) {
    const days = parseInt(lower.match(/\d+/)?.[0] || '1');
    const future = new Date(now);
    future.setDate(future.getDate() + days);
    future.setHours(17, 0, 0, 0);
    return future;
  }
  
  // Try parsing as ISO date
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date(now.setHours(17, 0, 0, 0)) : parsed;
}

// Send Telegram message
async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
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

// Edit Telegram message
async function editTelegramMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
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

// Answer callback query
async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

// Handle /connect command
async function handleConnect(message: TelegramMessage) {
  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id;
  
  // Check if already connected
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, telegram_user_id")
    .eq("telegram_user_id", telegramUserId)
    .single();
  
  if (existing) {
    await sendTelegramMessage(
      chatId,
      `✅ You're already connected as <b>${existing.full_name}</b>!\n\nUse /mytasks to see your tasks.`
    );
    return;
  }
  
  // Generate connection code
  const connectionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Store pending connection
  await supabase.from("telegram_commands").insert({
    telegram_user_id: telegramUserId,
    telegram_chat_id: chatId.toString(),
    command: "connect",
    raw_message: JSON.stringify({ code: connectionCode, username: message.from.username }),
  });
  
  await sendTelegramMessage(
    chatId,
    `🔗 <b>Connect Your Account</b>\n\n` +
    `Your connection code: <code>${connectionCode}</code>\n\n` +
    `Go to your dashboard and enter this code in Settings → Telegram Connection.`
  );
}

// Handle /mytasks command
async function handleMyTasks(message: TelegramMessage) {
  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id;
  
  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("telegram_user_id", telegramUserId)
    .single();
  
  if (!profile) {
    await sendTelegramMessage(chatId, "❌ Please connect your account first using /connect");
    return;
  }
  
  // Get user's tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", profile.id)
    .in("status", ["pending", "in-progress"])
    .order("due_date", { ascending: true })
    .limit(10);
  
  if (!tasks || tasks.length === 0) {
    await sendTelegramMessage(chatId, "✅ You have no active tasks!");
    return;
  }
  
  for (const task of tasks) {
    const dueDate = new Date(task.due_date);
    const statusEmoji = task.status === "pending" ? "⏳" : "🔄";
    const priorityEmoji = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "🟢";
    
    const text = 
      `${statusEmoji} <b>${task.title}</b>\n\n` +
      `${priorityEmoji} Priority: ${task.priority}\n` +
      `📅 Due: ${dueDate.toLocaleDateString()}\n` +
      `💎 Credits: ${task.credit_points || 0}`;
    
    const keyboard = {
      inline_keyboard: [[
        { text: "✅ Mark Done", callback_data: `done_${task.id}` },
        { text: "⏳ Delay", callback_data: `delay_${task.id}` },
      ], [
        { text: "💬 Comment", callback_data: `comment_${task.id}` },
      ]],
    };
    
    await sendTelegramMessage(chatId, text, keyboard);
  }
}

// Handle /assign command
async function handleAssign(message: TelegramMessage) {
  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id;
  
  // Get assigner profile
  const { data: assigner } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("telegram_user_id", telegramUserId)
    .single();
  
  if (!assigner) {
    await sendTelegramMessage(chatId, "❌ Please connect your account first using /connect");
    return;
  }
  
  if (assigner.role !== "admin") {
    await sendTelegramMessage(chatId, "❌ Only admins can assign tasks");
    return;
  }
  
  // Parse task assignment
  const parsed = parseTaskAssignment(message.text!);
  
  if (!parsed || !parsed.assignee || !parsed.title) {
    await sendTelegramMessage(
      chatId,
      "❌ <b>Invalid format</b>\n\n" +
      "Use: <code>/assign @username Task title due: tomorrow priority: high</code>\n\n" +
      "Due date options: today, tomorrow, 3 days, or specific date\n" +
      "Priority: low, medium, high (optional)"
    );
    return;
  }
  
  // Find assignee by username
  const { data: assignee } = await supabase
    .from("profiles")
    .select("id, telegram_chat_id, full_name")
    .eq("telegram_username", parsed.assignee)
    .single();
  
  if (!assignee) {
    await sendTelegramMessage(chatId, `❌ User @${parsed.assignee} not found or not connected`);
    return;
  }
  
  // Create task
  const dueDate = parsed.dueDate ? parseNaturalDate(parsed.dueDate) : new Date();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: parsed.title,
      assigned_to: assignee.id,
      assigned_by: assigner.id,
      due_date: dueDate.toISOString(),
      priority: parsed.priority || "medium",
      status: "pending",
      task_type: "team",
      credit_points: 10, // Default credit
    })
    .select()
    .single();
  
  if (error) {
    console.error("Task creation error:", error);
    await sendTelegramMessage(chatId, "❌ Failed to create task");
    return;
  }
  
  // Notify assigner
  await sendTelegramMessage(
    chatId,
    `✅ Task assigned to <b>${assignee.full_name}</b>\n\n` +
    `📝 ${task.title}\n` +
    `📅 Due: ${dueDate.toLocaleDateString()}`
  );
  
  // Notify assignee
  if (assignee.telegram_chat_id) {
    const keyboard = {
      inline_keyboard: [[
        { text: "✅ Mark Done", callback_data: `done_${task.id}` },
        { text: "⏳ Delay", callback_data: `delay_${task.id}` },
      ], [
        { text: "💬 Comment", callback_data: `comment_${task.id}` },
      ]],
    };
    
    const result = await sendTelegramMessage(
      parseInt(assignee.telegram_chat_id),
      `🆕 <b>New Task Assigned</b>\n\n` +
      `📝 ${task.title}\n` +
      `📅 Due: ${dueDate.toLocaleDateString()}\n` +
      `💎 Credits: ${task.credit_points}`,
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
  }
}

// Handle callback queries (inline button clicks)
async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramUserId = callbackQuery.from.id.toString();
  
  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_user_id", telegramUserId)
    .single();
  
  if (!profile) {
    await answerCallbackQuery(callbackQuery.id, "Please connect your account first");
    return;
  }
  
  const [action, taskId] = data.split("_");
  
  // Get task
  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();
  
  if (!task) {
    await answerCallbackQuery(callbackQuery.id, "Task not found");
    return;
  }
  
  if (action === "done") {
    // Mark task as completed
    await supabase
      .from("tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId);
    
    await answerCallbackQuery(callbackQuery.id, "✅ Task marked as complete!");
    
    // Update message
    await editTelegramMessage(
      chatId,
      messageId,
      `✅ <b>${task.title}</b>\n\n<i>Completed</i>\n💎 Credits earned: ${task.credit_points || 0}`,
      { inline_keyboard: [] }
    );
  } else if (action === "delay") {
    // Add 1 day to due date
    const newDueDate = new Date(task.due_date);
    newDueDate.setDate(newDueDate.getDate() + 1);
    
    await supabase
      .from("tasks")
      .update({
        due_date: newDueDate.toISOString(),
      })
      .eq("id", taskId);
    
    await answerCallbackQuery(callbackQuery.id, "⏳ Task delayed by 1 day");
    
    // Update message
    const keyboard = {
      inline_keyboard: [[
        { text: "✅ Mark Done", callback_data: `done_${task.id}` },
        { text: "⏳ Delay", callback_data: `delay_${task.id}` },
      ], [
        { text: "💬 Comment", callback_data: `comment_${task.id}` },
      ]],
    };
    
    await editTelegramMessage(
      chatId,
      messageId,
      `⏳ <b>${task.title}</b>\n\n` +
      `📅 New due date: ${newDueDate.toLocaleDateString()}\n` +
      `💎 Credits: ${task.credit_points || 0}`,
      keyboard
    );
  } else if (action === "comment") {
    await answerCallbackQuery(callbackQuery.id, "Reply to this message with your comment");
    
    // Store pending comment action
    await supabase.from("telegram_commands").insert({
      telegram_user_id: telegramUserId,
      telegram_chat_id: chatId.toString(),
      command: "pending_comment",
      task_id: taskId,
      raw_message: JSON.stringify({ message_id: messageId }),
    });
  }
}

// Handle text message (status updates)
async function handleTextMessage(message: TelegramMessage) {
  const text = message.text?.toLowerCase() || "";
  const telegramUserId = message.from.id.toString();
  const chatId = message.chat.id;
  
  // Check for pending comment
  const { data: pendingComment } = await supabase
    .from("telegram_commands")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .eq("command", "pending_comment")
    .is("processed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  if (pendingComment && pendingComment.task_id) {
    // Add comment to task
    const { data: task } = await supabase
      .from("tasks")
      .select("notes")
      .eq("id", pendingComment.task_id)
      .single();
    
    const newNotes = task?.notes
      ? `${task.notes}\n\n[Telegram] ${message.text}`
      : `[Telegram] ${message.text}`;
    
    await supabase
      .from("tasks")
      .update({ notes: newNotes })
      .eq("id", pendingComment.task_id);
    
    // Mark command as processed
    await supabase
      .from("telegram_commands")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", pendingComment.id);
    
    await sendTelegramMessage(chatId, "💬 Comment added to task");
    return;
  }
  
  // Handle quick status updates
  if (text.includes("done") || text.includes("✅")) {
    await sendTelegramMessage(chatId, "Please use /mytasks to see your tasks and mark them as done");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const update: TelegramUpdate = await req.json();
    console.log("Telegram update:", JSON.stringify(update));
    
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      const message = update.message;
      const text = message.text || "";
      
      if (text.startsWith("/connect")) {
        await handleConnect(message);
      } else if (text.startsWith("/mytasks")) {
        await handleMyTasks(message);
      } else if (text.startsWith("/assign")) {
        await handleAssign(message);
      } else if (text.startsWith("/start")) {
        await sendTelegramMessage(
          message.chat.id,
          `👋 <b>Welcome to We Dot Task Manager!</b>\n\n` +
          `Commands:\n` +
          `/connect - Link your account\n` +
          `/mytasks - View your tasks\n` +
          `/assign - Assign a task (admin only)\n\n` +
          `Start by connecting your account with /connect`
        );
      } else {
        await handleTextMessage(message);
      }
    }
    
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
