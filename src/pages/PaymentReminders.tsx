import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentReminderCard } from "@/components/PaymentReminders/PaymentReminderCard";
import { PaymentReminderDialog } from "@/components/PaymentReminders/PaymentReminderDialog";
import { usePaymentReminders } from "@/hooks/usePaymentReminders";
import { usePaymentReminderRealtime } from "@/hooks/usePaymentReminderRealtime";
import { PaymentReminder } from "@/types/paymentReminder";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CreditCard } from "lucide-react";

export default function PaymentReminders() {
  const { data: reminders = [], isLoading } = usePaymentReminders();
  const [editingReminder, setEditingReminder] = useState<PaymentReminder | null>(null);
  
  // Enable real-time updates
  usePaymentReminderRealtime();

  const upcomingReminders = reminders.filter(r => r.status === 'pending');
  const completedReminders = reminders.filter(r => r.status === 'completed');

  const handleEdit = (reminder: PaymentReminder) => {
    setEditingReminder(reminder);
  };

  const handleCloseEdit = () => {
    setEditingReminder(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Payment Reminders</h1>
        </div>
        <PaymentReminderDialog />
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-96">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Upcoming ({upcomingReminders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedReminders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingReminders.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No upcoming payment reminders
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first payment reminder to get started
              </p>
              <PaymentReminderDialog />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingReminders.map((reminder) => (
                <PaymentReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedReminders.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                No completed payment reminders
              </h3>
              <p className="text-sm text-muted-foreground">
                Completed payment reminders will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedReminders.map((reminder) => (
                <PaymentReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editingReminder && (
        <PaymentReminderDialog
          reminder={editingReminder}
          onClose={handleCloseEdit}
        />
      )}
    </div>
  );
}