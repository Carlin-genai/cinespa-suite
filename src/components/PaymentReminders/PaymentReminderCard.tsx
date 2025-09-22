import { format } from "date-fns";
import { Calendar, DollarSign, Users, Check, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentReminder } from "@/types/paymentReminder";
import { useUpdatePaymentReminder, useDeletePaymentReminder } from "@/hooks/usePaymentReminders";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const getCurrencySymbol = (currency: string) => {
  const symbols: Record<string, string> = {
    USD: "$",
    INR: "₹",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
  };
  return symbols[currency] || currency;
};

interface PaymentReminderCardProps {
  reminder: PaymentReminder;
  onEdit: (reminder: PaymentReminder) => void;
}

export const PaymentReminderCard = ({ reminder, onEdit }: PaymentReminderCardProps) => {
  const { user } = useAuth();
  const updateReminder = useUpdatePaymentReminder();
  const deleteReminder = useDeletePaymentReminder();

  const handleMarkDone = () => {
    updateReminder.mutate({
      id: reminder.id,
      updates: { status: 'completed' }
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this payment reminder?')) {
      deleteReminder.mutate(reminder.id);
    }
  };

  const isOverdue = new Date(reminder.due_date) < new Date() && reminder.status === 'pending';
  const daysUntilDue = Math.ceil((new Date(reminder.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <Card className={`transition-all hover:shadow-md ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{reminder.name}</h3>
            <Badge 
              variant={reminder.status === 'completed' ? 'default' : isOverdue ? 'destructive' : 'secondary'}
              className="ml-2"
            >
              {reminder.status === 'completed' ? 'Completed' : isOverdue ? 'Overdue' : `${daysUntilDue} days left`}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {reminder.status === 'pending' && (
              <Button
                variant="ghost" 
                size="sm"
                onClick={handleMarkDone}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(reminder)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Due: {format(new Date(reminder.due_date), "MMM dd, yyyy")}</span>
        </div>
        
        {reminder.amount && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>{getCurrencySymbol(reminder.currency)}{reminder.amount.toLocaleString()}</span>
          </div>
        )}
        
        {reminder.collaborators.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <div className="flex items-center gap-1">
              <span>{reminder.collaborators.length} collaborator{reminder.collaborators.length > 1 ? 's' : ''}</span>
              <div className="flex -space-x-1 ml-2">
                {reminder.collaborators.slice(0, 3).map((collaboratorId, index) => (
                  <Avatar key={collaboratorId} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {String.fromCharCode(65 + index)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {reminder.collaborators.length > 3 && (
                  <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      +{reminder.collaborators.length - 3}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </div>
        )}
        
        {reminder.notes && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-sm">
            {reminder.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
};