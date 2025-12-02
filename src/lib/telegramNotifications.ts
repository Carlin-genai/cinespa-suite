import { supabase } from "@/integrations/supabase/client";

export async function sendTelegramTaskNotification(
  type: "task_created" | "task_updated" | "task_completed" | "reminder",
  taskId: string,
  userId?: string
) {
  try {
    await supabase.functions.invoke("telegram-notifications", {
      body: { type, taskId, userId },
    });
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }
}
