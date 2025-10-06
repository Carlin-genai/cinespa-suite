import { format } from "date-fns";
import { Calendar, DollarSign, Users, Check, Edit, Trash2, Shield, Upload, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentReminder } from "@/types/paymentReminder";
import { useUpdatePaymentReminder, useDeletePaymentReminder } from "@/hooks/usePaymentReminders";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

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
  const [uploadingProof, setUploadingProof] = useState(false);

  const handleMarkDone = () => {
    updateReminder.mutate({
      id: reminder.id,
      updates: { 
        status: 'completed',
        reminder_status: 'completed'
      }
    });
  };

  const handleAuthorize = () => {
    updateReminder.mutate({
      id: reminder.id,
      updates: { 
        reminder_status: 'pending_payment',
        authorized_by: user?.id,
        authorized_at: new Date().toISOString()
      }
    });
  };

  const handleProofUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadingProof(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${reminder.id}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      updateReminder.mutate({
        id: reminder.id,
        updates: { 
          payment_proof_url: publicUrl,
          reminder_status: reminder.authorization_required ? 'pending_authorization' : 'completed'
        }
      });
    } catch (error) {
      console.error('Error uploading proof:', error);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this payment reminder?')) {
      deleteReminder.mutate(reminder.id);
    }
  };

  const getStatusBadge = () => {
    switch (reminder.reminder_status) {
      case 'open':
        return <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
          {isOverdue ? 'Overdue' : `${daysUntilDue} days left`}
        </Badge>;
      case 'pending_authorization':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">
          Awaiting Authorization
        </Badge>;
      case 'pending_payment':
        return <Badge variant="outline" className="border-blue-500 text-blue-700">
          Pending Payment
        </Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="secondary">{reminder.status}</Badge>;
    }
  };

  const canAuthorize = user?.id && reminder.authorization_required && 
    reminder.reminder_status === 'pending_authorization' &&
    (user.id === reminder.created_by || reminder.collaborators.includes(user.id));
  
  const isOverdue = new Date(reminder.due_date) < new Date() && reminder.reminder_status !== 'completed';
  const daysUntilDue = Math.ceil((new Date(reminder.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <Card className={`transition-all hover:shadow-md ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{reminder.name}</h3>
            {getStatusBadge()}
            {reminder.authorization_required && (
              <Badge variant="outline" className="ml-2">
                <Shield className="h-3 w-3 mr-1" />
                Auth Required
              </Badge>
            )}
            {reminder.reminder_type === 'annually' && (
              <Badge variant="outline" className="ml-2">
                Annual
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {canAuthorize && (
              <Button
                variant="ghost" 
                size="sm"
                onClick={handleAuthorize}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Shield className="h-4 w-4" />
              </Button>
            )}
            {reminder.reminder_status !== 'completed' && !reminder.payment_proof_url && (
              <div className="relative">
                <Button
                  variant="ghost" 
                  size="sm"
                  disabled={uploadingProof}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleProofUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploadingProof}
                />
              </div>
            )}
            {reminder.payment_proof_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(reminder.payment_proof_url, '_blank')}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
            {reminder.reminder_status !== 'completed' && (
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