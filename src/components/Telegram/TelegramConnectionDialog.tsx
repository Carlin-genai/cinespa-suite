import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface TelegramConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  isConnected: boolean;
  onConnectionUpdate: () => void;
}

export function TelegramConnectionDialog({
  open,
  onOpenChange,
  userId,
  isConnected,
  onConnectionUpdate,
}: TelegramConnectionDialogProps) {
  const [connectionCode, setConnectionCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!connectionCode.trim()) {
      toast.error("Please enter a connection code");
      return;
    }

    setIsConnecting(true);

    try {
      // Check if code exists in telegram_commands
      const { data: command } = await supabase
        .from("telegram_commands")
        .select("*")
        .eq("command", "connect")
        .contains("raw_message", JSON.stringify({ code: connectionCode.toUpperCase() }))
        .single();

      if (!command) {
        toast.error("Invalid connection code");
        setIsConnecting(false);
        return;
      }

      // Update user profile with Telegram info
      const { error } = await supabase
        .from("profiles")
        .update({
          telegram_user_id: command.telegram_user_id,
          telegram_chat_id: command.telegram_chat_id,
          telegram_username: JSON.parse(command.raw_message).username,
          is_telegram_connected: true,
          telegram_connected_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      // Mark command as processed
      await supabase
        .from("telegram_commands")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", command.id);

      toast.success("✅ Telegram connected successfully!");
      onConnectionUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect Telegram");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          telegram_user_id: null,
          telegram_chat_id: null,
          telegram_username: null,
          is_telegram_connected: false,
          telegram_connected_at: null,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Telegram disconnected");
      onConnectionUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Disconnection error:", error);
      toast.error("Failed to disconnect Telegram");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card rounded-2xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Send className="w-6 h-6 text-telegram-blue" />
            Telegram Integration
          </DialogTitle>
          <DialogDescription>
            {isConnected
              ? "Your account is connected to Telegram"
              : "Connect your Telegram account to receive real-time task updates"}
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-telegram-light rounded-xl border border-telegram-blue/20">
              <h4 className="font-semibold mb-2 text-sm">How to connect:</h4>
              <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                <li>Open Telegram and search for your task manager bot</li>
                <li>Send the command: <code className="bg-muted px-2 py-0.5 rounded">/connect</code></li>
                <li>Copy the 6-digit code you receive</li>
                <li>Paste it below and click Connect</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Connection Code</Label>
              <Input
                id="code"
                placeholder="Enter 6-digit code"
                value={connectionCode}
                onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-2xl font-bold tracking-widest"
              />
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting || connectionCode.length !== 6}
              className="w-full bg-telegram-blue hover:bg-telegram-blue/90"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Connect Telegram
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div className="flex-1">
                <p className="font-semibold text-green-900 dark:text-green-100">Connected</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You'll receive task updates via Telegram
                </p>
              </div>
            </div>

            <Button
              onClick={handleDisconnect}
              disabled={isConnecting}
              variant="destructive"
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Disconnect Telegram
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
