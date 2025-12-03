import { supabase } from "@/integrations/supabase/client";

export type TelegramNotificationType = 
  | "task_created" 
  | "task_updated" 
  | "task_completed" 
  | "task_overdue"
  | "reminder";

export async function sendTelegramTaskNotification(
  type: TelegramNotificationType,
  taskId: string,
  userId?: string
): Promise<void> {
  try {
    console.log(`[Telegram] Sending ${type} notification for task ${taskId}`);
    
    const { data, error } = await supabase.functions.invoke("telegram-notifications", {
      body: { type, taskId, userId },
    });
    
    if (error) {
      console.error("[Telegram] Function invoke error:", error);
      return;
    }
    
    console.log("[Telegram] Notification sent successfully:", data);
  } catch (error) {
    console.error("[Telegram] Failed to send notification:", error);
  }
}

// Helper to trigger reminders check (can be called manually or via cron)
export async function triggerTaskReminders(): Promise<void> {
  try {
    console.log("[Telegram] Triggering task reminders check");
    
    const { data, error } = await supabase.functions.invoke("task-reminders", {
      body: {},
    });
    
    if (error) {
      console.error("[Telegram] Reminders function error:", error);
      return;
    }
    
    console.log("[Telegram] Reminders check completed:", data);
  } catch (error) {
    console.error("[Telegram] Failed to trigger reminders:", error);
  }
}
