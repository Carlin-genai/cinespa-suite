import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TelegramConnectionDialog } from "@/components/Telegram/TelegramConnectionDialog";
import { TelegramStatusIndicator } from "@/components/Telegram/TelegramStatusIndicator";
import { useTelegramConnection } from "@/hooks/useTelegramConnection";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Bell, MessageSquare, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function TelegramSettings() {
  const { user } = useAuth();
  const { isConnected, telegramUsername, connectedAt, refetch } = useTelegramConnection();
  const [dialogOpen, setDialogOpen] = useState(false);

  const features = [
    {
      icon: Bell,
      title: "Real-time Notifications",
      description: "Get instant updates when tasks are assigned or updated",
    },
    {
      icon: MessageSquare,
      title: "Quick Task Updates",
      description: "Mark tasks as done or add comments directly from Telegram",
    },
    {
      icon: Send,
      title: "Command Control",
      description: "Use commands like /mytasks to view and manage your work",
    },
    {
      icon: CheckCircle,
      title: "Status Sync",
      description: "All changes sync instantly between Telegram and the web dashboard",
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Telegram Integration
              </h1>
              <p className="text-muted-foreground mt-2">
                Connect your Telegram account for seamless task management
              </p>
            </div>
            <TelegramStatusIndicator isConnected={isConnected} showLabel />
          </div>

          <Card className="mb-8 shadow-lg border-primary/10 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
              <CardTitle className="flex items-center gap-3">
                <Send className="w-6 h-6 text-telegram-blue" />
                Connection Status
              </CardTitle>
              <CardDescription>
                {isConnected
                  ? "Your Telegram account is connected and syncing"
                  : "Connect your Telegram account to enable real-time features"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">
                        Connected as @{telegramUsername || "Unknown"}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Since {connectedAt ? new Date(connectedAt).toLocaleDateString() : "Unknown"}
                      </p>
                    </div>
                    <Button
                      onClick={() => setDialogOpen(true)}
                      variant="outline"
                      size="sm"
                      className="border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                    >
                      Manage Connection
                    </Button>
                  </div>

                  <div className="p-4 bg-telegram-light rounded-xl border border-telegram-blue/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Available Commands
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">/mytasks</code>
                        <span className="text-muted-foreground">View all your active tasks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">/assign</code>
                        <span className="text-muted-foreground">Assign tasks (admin only)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Inline Buttons</span>
                        <span className="text-muted-foreground">
                          Use ✅ Done, ⏳ Delay, 💬 Comment buttons on task messages
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-telegram-light rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-telegram-blue" />
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Connect your Telegram account to unlock real-time task management
                  </p>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-telegram-blue hover:bg-telegram-blue/90"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Connect Telegram
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full shadow-md hover:shadow-lg transition-shadow rounded-2xl">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center mb-3">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

      {user && (
        <TelegramConnectionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={user.id}
          isConnected={isConnected}
          onConnectionUpdate={refetch}
        />
      )}
    </div>
  );
}
