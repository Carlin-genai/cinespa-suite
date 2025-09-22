import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { PaymentReminder, CreatePaymentReminderRequest } from "@/types/paymentReminder";
import { useCreatePaymentReminder, useUpdatePaymentReminder } from "@/hooks/usePaymentReminders";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  name: z.string().min(1, "Payment name is required"),
  due_date: z.string().min(1, "Due date is required"),
  amount: z.string().optional(),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
  collaborators: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PaymentReminderDialogProps {
  reminder?: PaymentReminder;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export const PaymentReminderDialog = ({ reminder, onClose, trigger }: PaymentReminderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  
  const createReminder = useCreatePaymentReminder();
  const updateReminder = useUpdatePaymentReminder();
  
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-collaboration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .neq('id', (await supabase.auth.getUser()).data.user?.id);
      
      if (error) throw error;
      return data || [];
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      due_date: "",
      amount: "",
      currency: "USD",
      notes: "",
      collaborators: [],
    },
  });

  useEffect(() => {
    if (reminder) {
      form.reset({
        name: reminder.name,
        due_date: reminder.due_date,
        amount: reminder.amount?.toString() || "",
        currency: reminder.currency || "USD",
        notes: reminder.notes || "",
        collaborators: reminder.collaborators || [],
      });
      setSelectedCollaborators(reminder.collaborators || []);
      setOpen(true); // Open dialog when editing
    } else {
      form.reset({
        name: "",
        due_date: "",
        amount: "",
        currency: "USD",
        notes: "",
        collaborators: [],
      });
      setSelectedCollaborators([]);
    }
  }, [reminder, form]);

  const onSubmit = (data: FormData) => {
    const reminderData: CreatePaymentReminderRequest = {
      name: data.name,
      due_date: data.due_date,
      amount: data.amount ? parseFloat(data.amount) : undefined,
      currency: data.currency,
      notes: data.notes || undefined,
      collaborators: selectedCollaborators,
    };

    if (reminder) {
      updateReminder.mutate({
        id: reminder.id,
        updates: reminderData,
      }, {
        onSuccess: () => {
          setOpen(false);
          onClose?.();
        },
      });
    } else {
      createReminder.mutate(reminderData, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          setSelectedCollaborators([]);
        },
      });
    }
  };

  const handleCollaboratorChange = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedCollaborators(prev => [...prev, userId]);
    } else {
      setSelectedCollaborators(prev => prev.filter(id => id !== userId));
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      New Payment Reminder
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {reminder ? "Edit Payment Reminder" : "Create Payment Reminder"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Annual Insurance Premium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {users.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Collaborators</FormLabel>
                <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={user.id}
                        checked={selectedCollaborators.includes(user.id)}
                        onCheckedChange={(checked) => handleCollaboratorChange(user.id, !!checked)}
                      />
                      <label htmlFor={user.id} className="text-sm cursor-pointer">
                        {user.full_name || user.email}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createReminder.isPending || updateReminder.isPending}
              >
                {reminder ? "Update Reminder" : "Create Reminder"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};