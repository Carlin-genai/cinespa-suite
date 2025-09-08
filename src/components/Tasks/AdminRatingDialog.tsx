
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/types';

interface AdminRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rating: number, comment: string) => void;
  task: Task | null;
}

const AdminRatingDialog: React.FC<AdminRatingDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  task,
}) => {
  const [rating, setRating] = useState(task?.admin_rating || 0);
  const [comment, setComment] = useState(task?.admin_comment || '');
  const [hoveredStar, setHoveredStar] = useState(0);

  React.useEffect(() => {
    if (open && task) {
      setRating(task.admin_rating || 0);
      setComment(task.admin_comment || '');
    }
  }, [open, task]);

  const handleSave = () => {
    onSave(rating, comment);
    onOpenChange(false);
  };

  const handleStarClick = (starValue: number) => {
    setRating(starValue);
  };

  const handleStarHover = (starValue: number) => {
    setHoveredStar(starValue);
  };

  const handleStarLeave = () => {
    setHoveredStar(0);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-montserrat">Rate & Comment Task</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Task</Label>
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{task.title}</p>
          </div>
          
          <div>
            <Label>Rating</Label>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-6 w-6 cursor-pointer transition-colors",
                    (hoveredStar >= star || (!hoveredStar && rating >= star))
                      ? "text-rose-gold fill-rose-gold" 
                      : "text-gray-300 hover:text-rose-gold"
                  )}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => handleStarHover(star)}
                  onMouseLeave={handleStarLeave}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 ? `${rating}/5` : 'No rating'}
              </span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add feedback for the employee..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-rose-gold hover:bg-rose-gold-dark text-white">
              <Save className="mr-2 h-4 w-4" />
              Save Rating
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminRatingDialog;
