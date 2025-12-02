import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TelegramConnectionStatus {
  isConnected: boolean;
  telegramUserId: string | null;
  telegramUsername: string | null;
  connectedAt: string | null;
  loading: boolean;
}

export function useTelegramConnection() {
  const { user } = useAuth();
  const [status, setStatus] = useState<TelegramConnectionStatus>({
    isConnected: false,
    telegramUserId: null,
    telegramUsername: null,
    connectedAt: null,
    loading: true,
  });

  const fetchConnectionStatus = async () => {
    if (!user) {
      setStatus({
        isConnected: false,
        telegramUserId: null,
        telegramUsername: null,
        connectedAt: null,
        loading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("telegram_user_id, telegram_username, telegram_connected_at, is_telegram_connected")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setStatus({
        isConnected: data?.is_telegram_connected || false,
        telegramUserId: data?.telegram_user_id || null,
        telegramUsername: data?.telegram_username || null,
        connectedAt: data?.telegram_connected_at || null,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching Telegram connection status:", error);
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchConnectionStatus();

    // Set up real-time subscription
    if (user) {
      const channel = supabase
        .channel(`telegram-status-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          () => {
            fetchConnectionStatus();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return { ...status, refetch: fetchConnectionStatus };
}
