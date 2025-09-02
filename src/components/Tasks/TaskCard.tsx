
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, User, MessageSquare, Edit, Trash2, Star, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string;
  due_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  admin_rating?: number;
  admin_comment?: string;
}

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
  showAdminFeatures?: boolean;
  onSetRating?: (taskId: string, rating: number, comment: string) => void;
}

const statusColors = {
  'pending': 'bg-not-started-beige text-charcoal-black',
  'in-progress': 'bg-progress-blue text-white',
  'overdue': 'bg-blocked-red text-white',
  'completed': 'bg-completed-green text-white'
};

const priorityColors = {
  'low': 'bg-muted-foreground text-white',
  'medium': 'bg-rose-gold text-white',
  'high': 'bg-rose-gold-contrast text-white',
  'critical': 'bg-destructive text-white'
};

const TaskCard = ({ task, onEdit, onDelete, onStatusChange, showAdminFeatures, onSetRating }: TaskCardProps) => {
  const daysLeft = Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <Card className="transition-all duration-300 hover:shadow-lg hover:shadow-rose-gold/20 animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-montserrat text-rose-gold-contrast line-clamp-2">
            {task.title}
          </CardTitle>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(task)}
                className="h-8 w-8 p-0 hover:bg-rose-gold hover:text-white"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(task.id)}
                className="h-8 w-8 p-0 hover:bg-blocked-red hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-2">
          <Badge className={cn("text-xs", statusColors[task.status])}>
            {task.status.replace('-', ' ').toUpperCase()}
          </Badge>
          <Badge className={cn("text-xs", priorityColors[task.priority])}>
            {task.priority.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground font-opensans line-clamp-3">
          {task.description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{task.assigned_to}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-rose-gold">
            <Clock className="h-4 w-4" />
            <span>{daysLeft} days</span>
          </div>
        </div>

        {/* Admin Rating and Comment (visible to assigned user) */}
        {(task.admin_rating || task.admin_comment) && (
          <div className="bg-muted/50 p-3 rounded-lg border-l-4 border-rose-gold">
            {task.admin_rating && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-rose-gold-contrast">Admin Rating:</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-4 w-4",
                        star <= task.admin_rating! 
                          ? "text-rose-gold fill-rose-gold" 
                          : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
            {task.admin_comment && (
              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 text-rose-gold mt-0.5" />
                <p className="text-sm text-foreground">{task.admin_comment}</p>
              </div>
            )}
          </div>
        )}

        {/* Admin Features (visible to admins) */}
        {showAdminFeatures && onSetRating && (
          <div className="border-t pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSetRating(task.id, task.admin_rating || 0, task.admin_comment || '')}
              className="w-full border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white"
            >
              <Star className="mr-2 h-4 w-4" />
              Rate & Comment
            </Button>
          </div>
        )}
        
        {task.notes && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <strong className="text-rose-gold-contrast">Notes:</strong> {task.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard;
