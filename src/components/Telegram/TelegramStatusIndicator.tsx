import { Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TelegramStatusIndicatorProps {
  isConnected: boolean;
  className?: string;
  showLabel?: boolean;
}

export function TelegramStatusIndicator({
  isConnected,
  className,
  showLabel = false,
}: TelegramStatusIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              isConnected
                ? "bg-telegram-blue/10 text-telegram-blue border border-telegram-blue/20"
                : "bg-muted text-muted-foreground border border-border",
              className
            )}
          >
            {isConnected ? (
              <>
                <Send className="w-3 h-3" />
                {showLabel && "Connected"}
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                {showLabel && "Not Connected"}
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isConnected ? "Telegram connected" : "Connect Telegram for real-time updates"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TelegramSyncStatus({
  status,
  className,
}: {
  status: "synced" | "pending" | "error";
  className?: string;
}) {
  const statusConfig = {
    synced: {
      icon: CheckCircle2,
      text: "Synced",
      color: "text-green-600 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    },
    pending: {
      icon: Clock,
      text: "Syncing...",
      color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
    },
    error: {
      icon: XCircle,
      text: "Error",
      color: "text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.color,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.text}
    </div>
  );
}
