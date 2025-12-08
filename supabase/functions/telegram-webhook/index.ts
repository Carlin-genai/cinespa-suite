import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get environment variables
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

console.log("=== Telegram Webhook Starting ===");
console.log("TELEGRAM_BOT_TOKEN exists:", !!TELEGRAM_BOT_TOKEN);
console.log("SUPABASE_URL exists:", !!SUPABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!SUPABASE_SERVICE_ROLE_KEY);

// Validate environment variables
if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables!");
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_ROLE_KEY || "");

// Telegram Types
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  date: number;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
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

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send Telegram message helper
async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any): Promise<any> {
  console.log(`Sending message to chat ${chatId}:`, text.substring(0, 100));
  
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not set!");
    return { ok: false, error: "Bot token not configured" };
  }
  
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };
    
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    console.log("Telegram API response:", JSON.stringify(result));
    return result;
  } catch (error) {
    console.error("Error sending message:", error);
    return { ok: false, error: String(error) };
  }
}

// Edit Telegram message
async function editTelegramMessage(chatId: number, messageId: number, text: string, replyMarkup?: any): Promise<any> {
  if (!TELEGRAM_BOT_TOKEN) return { ok: false };
  
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    const body: any = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    };
    
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error editing message:", error);
    return { ok: false };
  }
}

// Answer callback query
async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;
  
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (error) {
    console.error("Error answering callback:", error);
  }
}

// Handle /start command
async function handleStart(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  console.log("Handling /start for chat:", chatId);
  
  await sendTelegramMessage(
    chatId,
    `👋 <b>Welcome to Task Manager Bot!</b>\n\n` +
    `Your Telegram bot is now active.\n\n` +
    `<b>Available Commands:</b>\n` +
    `• /connect - Link your account\n` +
    `• /mytasks - View your tasks\n` +
    `• /assign - Assign a task (admin only)\n\n` +
    `Use /connect to link your account.`
  );
}

// Handle /connect command
async function handleConnect(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const telegramUserId = message.from?.id?.toString() || "";
  const telegramUsername = message.from?.username || "";
  
  console.log("Handling /connect for chat:", chatId, "user:", telegramUserId);
  
  if (!telegramUserId) {
    await sendTelegramMessage(chatId, "❌ Could not identify your Telegram account.");
    return;
  }
  
  // Check if already connected
  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id, full_name, telegram_user_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  
  if (existingError) {
    console.error("Error checking existing profile:", existingError);
  }
  
  if (existing) {
    await sendTelegramMessage(
      chatId,
      `✅ You're already connected as <b>${existing.full_name || 'User'}</b>!\n\n` +
      `Use /mytasks to see your tasks.`
    );
    return;
  }
  
  // Generate 6-digit OTP
  const otp = generateOTP();
  console.log("Generated OTP:", otp, "for user:", telegramUserId);
  
  // Store the connection code in telegram_commands
  const { error: insertError } = await supabase.from("telegram_commands").insert({
    telegram_user_id: telegramUserId,
    telegram_chat_id: chatId.toString(),
    command: "connect",
    raw_message: JSON.stringify({ 
      code: otp, 
      username: telegramUsername,
      created_at: new Date().toISOString()
    }),
    processed: false,
  });
  
  if (insertError) {
    console.error("Error storing connection code:", insertError);
    await sendTelegramMessage(chatId, "❌ Failed to generate connection code. Please try again.");
    return;
  }
  
  await sendTelegramMessage(
    chatId,
    `🔗 <b>Connect Your Account</b>\n\n` +
    `Your verification code is:\n\n` +
    `<code>${otp}</code>\n\n` +
    `Enter this code inside the app to complete linking.\n\n` +
    `Go to Settings → Telegram to enter this code.`
  );
}

// Handle /mytasks command
async function handleMyTasks(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const telegramUserId = message.from?.id?.toString() || "";
  
  console.log("Handling /mytasks for chat:", chatId);
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  
  if (profileError) {
    console.error("Error fetching profile:", profileError);
  }
  
  if (!profile) {
    await sendTelegramMessage(chatId, "❌ Please connect your account first using /connect");
    return;
  }
  
  // Get user's tasks
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", profile.id)
    .in("status", ["pending", "in-progress"])
    .order("due_date", { ascending: true })
    .limit(10);
  
  if (tasksError) {
    console.error("Error fetching tasks:", tasksError);
    await sendTelegramMessage(chatId, "❌ Failed to fetch tasks. Please try again.");
    return;
  }
  
  if (!tasks || tasks.length === 0) {
    await sendTelegramMessage(chatId, "✅ You have no active tasks! Great job! 🎉");
    return;
  }
  
  await sendTelegramMessage(chatId, `📋 <b>Your Active Tasks (${tasks.length})</b>\n`);
  
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
        { text: "✅ Done", callback_data: `done_${task.id}` },
        { text: "⏳ Delay", callback_data: `delay_${task.id}` },
      ], [
        { text: "💬 Comment", callback_data: `comment_${task.id}` },
      ]],
    };
    
    await sendTelegramMessage(chatId, text, keyboard);
  }
}

// Parse natural date strings
function parseNaturalDate(dateStr: string): Date {
  const now = new Date();
  const lower = dateStr.toLowerCase().trim();
  
  if (lower === 'today') {
    now.setHours(17, 0, 0, 0);
    return now;
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
  
  // Try parsing as date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Default: tomorrow at 5 PM
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(17, 0, 0, 0);
  return tomorrow;
}

// Parse task assignment command
function parseTaskAssignment(text: string): {
  assignee?: string;
  title?: string;
  dueDate?: string;
  priority?: string;
} | null {
  // Pattern: /assign @username Task title due: date priority: high
  const match = text.match(/\/assign\s+@(\w+)\s+(.+?)(?:\s+due:\s*([^\s]+(?:\s+\d+)?)?)?(?:\s+priority:\s*(low|medium|high))?$/i);
  
  if (match) {
    return {
      assignee: match[1],
      title: match[2]?.trim(),
      dueDate: match[3]?.trim(),
      priority: match[4]?.toLowerCase() || 'medium',
    };
  }
  
  return null;
}

// Handle /assign command
async function handleAssign(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const telegramUserId = message.from?.id?.toString() || "";
  const text = message.text || "";
  
  console.log("Handling /assign for chat:", chatId);
  
  // Get assigner profile
  const { data: assigner } = await supabase
    .from("profiles")
    .select("id, role, org_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  
  if (!assigner) {
    await sendTelegramMessage(chatId, "❌ Please connect your account first using /connect");
    return;
  }
  
  if (assigner.role !== "admin") {
    await sendTelegramMessage(chatId, "❌ Only admins can assign tasks");
    return;
  }
  
  // Parse task assignment
  const parsed = parseTaskAssignment(text);
  
  if (!parsed || !parsed.assignee || !parsed.title) {
    await sendTelegramMessage(
      chatId,
      "❌ <b>Invalid format</b>\n\n" +
      "Use:\n<code>/assign @username Task title due: tomorrow priority: high</code>\n\n" +
      "<b>Examples:</b>\n" +
      "• <code>/assign @john Review document</code>\n" +
      "• <code>/assign @jane Report due: today priority: high</code>"
    );
    return;
  }
  
  // Find assignee by telegram username
  const { data: assignee } = await supabase
    .from("profiles")
    .select("id, telegram_chat_id, full_name")
    .eq("telegram_username", parsed.assignee)
    .maybeSingle();
  
  if (!assignee) {
    await sendTelegramMessage(chatId, `❌ User @${parsed.assignee} not found or not connected to Telegram`);
    return;
  }
  
  // Create task
  const dueDate = parsed.dueDate ? parseNaturalDate(parsed.dueDate) : parseNaturalDate('tomorrow');
  
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title: parsed.title,
      assigned_to: assignee.id,
      assigned_by: assigner.id,
      created_by: assigner.id,
      org_id: assigner.org_id,
      due_date: dueDate.toISOString(),
      priority: parsed.priority || "medium",
      status: "pending",
      task_type: "team",
      credit_points: 10,
    })
    .select()
    .single();
  
  if (taskError) {
    console.error("Task creation error:", taskError);
    await sendTelegramMessage(chatId, "❌ Failed to create task. Please try again.");
    return;
  }
  
  // Notify assigner
  await sendTelegramMessage(
    chatId,
    `✅ <b>Task Created!</b>\n\n` +
    `📝 ${task.title}\n` +
    `👤 Assigned to: ${assignee.full_name}\n` +
    `📅 Due: ${dueDate.toLocaleDateString()}`
  );
  
  // Notify assignee if they have telegram chat ID
  if (assignee.telegram_chat_id) {
    const keyboard = {
      inline_keyboard: [[
        { text: "✅ Done", callback_data: `done_${task.id}` },
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
    
    // Store message ID for future edits
    if (result.ok && result.result) {
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
async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
  const data = callbackQuery.data || "";
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  const telegramUserId = callbackQuery.from.id.toString();
  
  console.log("Handling callback:", data, "from:", telegramUserId);
  
  if (!chatId || !messageId) {
    await answerCallbackQuery(callbackQuery.id, "Error: Missing message info");
    return;
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  
  if (!profile) {
    await answerCallbackQuery(callbackQuery.id, "Please connect your account first using /connect");
    return;
  }
  
  const parts = data.split("_");
  const action = parts[0];
  const taskId = parts.slice(1).join("_");
  
  // Get task
  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  
  if (!task) {
    await answerCallbackQuery(callbackQuery.id, "Task not found");
    return;
  }
  
  if (action === "done") {
    await supabase
      .from("tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId);
    
    await answerCallbackQuery(callbackQuery.id, "✅ Task completed!");
    
    await editTelegramMessage(
      chatId,
      messageId,
      `✅ <s>${task.title}</s>\n\n<i>Completed!</i>\n💎 Credits earned: ${task.credit_points || 0}`,
      { inline_keyboard: [] }
    );
    
  } else if (action === "delay") {
    const newDueDate = new Date(task.due_date);
    newDueDate.setDate(newDueDate.getDate() + 1);
    
    await supabase
      .from("tasks")
      .update({ due_date: newDueDate.toISOString() })
      .eq("id", taskId);
    
    await answerCallbackQuery(callbackQuery.id, "⏳ Delayed by 1 day");
    
    const keyboard = {
      inline_keyboard: [[
        { text: "✅ Done", callback_data: `done_${task.id}` },
        { text: "⏳ Delay", callback_data: `delay_${task.id}` },
      ], [
        { text: "💬 Comment", callback_data: `comment_${task.id}` },
      ]],
    };
    
    await editTelegramMessage(
      chatId,
      messageId,
      `⏳ <b>${task.title}</b>\n\n` +
      `📅 New due: ${newDueDate.toLocaleDateString()}\n` +
      `💎 Credits: ${task.credit_points || 0}`,
      keyboard
    );
    
  } else if (action === "comment") {
    await answerCallbackQuery(callbackQuery.id, "Reply to this message with your comment");
    
    await supabase.from("telegram_commands").insert({
      telegram_user_id: telegramUserId,
      telegram_chat_id: chatId.toString(),
      command: "pending_comment",
      task_id: taskId,
      raw_message: JSON.stringify({ message_id: messageId }),
      processed: false,
    });
  }
}

// Handle regular text messages
async function handleTextMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const telegramUserId = message.from?.id?.toString() || "";
  const text = message.text || "";
  
  console.log("Handling text message:", text.substring(0, 50));
  
  // Check for pending comment
  const { data: pendingComment } = await supabase
    .from("telegram_commands")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .eq("command", "pending_comment")
    .eq("processed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (pendingComment && pendingComment.task_id) {
    // Add comment to task
    const { data: task } = await supabase
      .from("tasks")
      .select("notes")
      .eq("id", pendingComment.task_id)
      .maybeSingle();
    
    const timestamp = new Date().toLocaleString();
    const newNotes = task?.notes
      ? `${task.notes}\n\n[Telegram ${timestamp}] ${text}`
      : `[Telegram ${timestamp}] ${text}`;
    
    await supabase
      .from("tasks")
      .update({ notes: newNotes })
      .eq("id", pendingComment.task_id);
    
    // Mark command as processed
    await supabase
      .from("telegram_commands")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", pendingComment.id);
    
    await sendTelegramMessage(chatId, "💬 Comment added to task!");
    return;
  }
  
  // Default response for unrecognized messages
  await sendTelegramMessage(
    chatId,
    "I didn't understand that. Try:\n\n" +
    "• /start - Welcome message\n" +
    "• /connect - Link your account\n" +
    "• /mytasks - View your tasks"
  );
}

// Main handler
serve(async (req) => {
  console.log("=== Incoming Request ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse the request body
    const bodyText = await req.text();
    console.log("Raw body:", bodyText.substring(0, 500));
    
    if (!bodyText) {
      console.log("Empty body received");
      return new Response(JSON.stringify({ ok: true, message: "No body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    let update: TelegramUpdate;
    try {
      update = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("Parsed update:", JSON.stringify(update));
    
    // Handle callback queries (button clicks)
    if (update.callback_query) {
      console.log("Processing callback query");
      await handleCallbackQuery(update.callback_query);
    }
    // Handle messages
    else if (update.message) {
      const message = update.message;
      const text = message.text || "";
      
      console.log("Processing message:", text);
      console.log("Chat ID:", message.chat.id);
      console.log("From:", message.from?.id, message.from?.username);
      
      if (text.startsWith("/start")) {
        await handleStart(message);
      } else if (text.startsWith("/connect")) {
        await handleConnect(message);
      } else if (text.startsWith("/mytasks")) {
        await handleMyTasks(message);
      } else if (text.startsWith("/assign")) {
        await handleAssign(message);
      } else {
        await handleTextMessage(message);
      }
    } else {
      console.log("Unknown update type");
    }
    
    // Always return success to Telegram
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("=== WEBHOOK ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    
    // Return 200 even on error to prevent Telegram from retrying
    return new Response(JSON.stringify({ ok: true, error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
