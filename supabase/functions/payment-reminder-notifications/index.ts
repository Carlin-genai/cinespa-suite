import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentReminder {
  id: string;
  name: string;
  due_date: string;
  amount?: number;
  collaborators: string[];
  created_by: string;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting payment reminder notifications check...');

    // Get current date
    const today = new Date().toISOString().split('T')[0];
    
    // Find reminders that need notifications
    // (status = pending, reminder_start_date <= today, due_date >= today)
    const { data: reminders, error: fetchError } = await supabase
      .from('payment_reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('reminder_start_date', today)
      .gte('due_date', today);

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${reminders?.length || 0} reminders needing notifications`);

    let notificationsCreated = 0;

    for (const reminder of reminders || []) {
      console.log(`Processing reminder: ${reminder.name} (ID: ${reminder.id})`);
      
      // Get all users who should be notified (creator + collaborators)
      const allNotificationUsers = [reminder.created_by, ...reminder.collaborators];
      const uniqueUsers = [...new Set(allNotificationUsers)];

      console.log(`Notifying ${uniqueUsers.length} users for reminder: ${reminder.name}`);

      // Create notifications for each user
      for (const userId of uniqueUsers) {
        // Check if we already sent a notification today for this reminder/user combo
        const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
        const todayEnd = new Date().toISOString().split('T')[0] + 'T23:59:59.999Z';

        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'payment_reminder')
          .eq('title', `Payment Reminder: ${reminder.name}`)
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd)
          .single();

        if (existingNotification) {
          console.log(`Notification already sent today for user ${userId} and reminder ${reminder.id}`);
          continue;
        }

        const daysUntilDue = Math.ceil((new Date(reminder.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const dueText = daysUntilDue === 0 ? 'today' : 
                       daysUntilDue === 1 ? 'tomorrow' : 
                       `in ${daysUntilDue} days`;

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([{
            user_id: userId,
            title: `Payment Reminder: ${reminder.name}`,
            message: `Payment "${reminder.name}" is due ${dueText}${reminder.amount ? ` (Amount: $${reminder.amount})` : ''}`,
            type: 'payment_reminder',
            status: 'queued',
            channel: 'in_app'
          }]);

        if (notificationError) {
          console.error(`Error creating notification for user ${userId}:`, notificationError);
        } else {
          notificationsCreated++;
          console.log(`Created notification for user ${userId} about reminder ${reminder.name}`);
        }
      }
    }

    console.log(`Payment reminder notifications job completed. Created ${notificationsCreated} notifications.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersProcessed: reminders?.length || 0,
        notificationsCreated
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in payment-reminder-notifications function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);