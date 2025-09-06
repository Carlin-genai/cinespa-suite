-- Create a trigger to auto-delete notifications when tasks are completed
CREATE OR REPLACE FUNCTION public.delete_completed_task_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Delete notifications related to completed tasks
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        DELETE FROM public.notifications 
        WHERE task_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger to delete notifications when task is completed
CREATE TRIGGER delete_notifications_on_task_completion
    AFTER UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.delete_completed_task_notifications();