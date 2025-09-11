import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, Award } from 'lucide-react';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface CreditPointsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, creditPoints: number, comment: string) => void;
}

const CreditPointsDialog: React.FC<CreditPointsDialogProps> = ({
  task,
  open,
  onOpenChange,
  onSave
}) => {
  const [creditPoints, setCreditPoints] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (task) {
      setCreditPoints(task.credit_points || 0);
      setComment(task.admin_comment || '');
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;

    if (creditPoints < 0 || creditPoints > 100) {
      toast({
        title: "Invalid Points",
        description: "Credit points must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await onSave(task.id, creditPoints, comment);
      toast({
        title: "Credit Points Awarded",
        description: `Awarded ${creditPoints} credit points for task completion`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to award credit points",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-rose-gold" />
            Award Credit Points
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium text-foreground mb-1">{task.title}</h4>
            <p className="text-sm text-muted-foreground">
              Status: {task.status.toUpperCase()} | Priority: {task.priority.toUpperCase()}
            </p>
            {task.completed_at && (
              <p className="text-sm text-muted-foreground mt-1">
                Completed: {new Date(task.completed_at).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="creditPoints">Credit Points (0-100)</Label>
            <div className="relative">
              <Input
                id="creditPoints"
                type="number"
                min="0"
                max="100"
                value={creditPoints}
                onChange={(e) => setCreditPoints(parseInt(e.target.value) || 0)}
                className="pr-10"
              />
              <Star className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-rose-gold" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Award credit points based on task quality and completion time
            </p>
          </div>

          <div>
            <Label htmlFor="comment">Admin Comment (Optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add feedback about the task completion..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loading}
              className="bg-rose-gold hover:bg-rose-gold-dark text-white"
            >
              {loading ? 'Awarding...' : 'Award Points'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditPointsDialog;