
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileText, MoreVertical, Edit, Trash2, CheckCircle, AlertTriangle, Hourglass, Star, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: any) => void;
  onDelete?: (taskId: string) => void;
  showActions?: boolean;
  showAdminFeatures?: boolean;
  onSetRating?: (taskId: string, rating: number, comment: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onEdit, 
  onDelete, 
  showActions = true, 
  showAdminFeatures = false,
  onSetRating 
}) => {
  const { userRole } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const { data: assigneeProfile } = useUserProfile(task.assigned_to);

  const isAdmin = userRole?.role === 'admin';
  const canEdit = showActions && (isAdmin || task.assigned_to === userRole?.user_id);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-priority-critical/15 text-priority-critical border-priority-critical/30';
      case 'high': return 'bg-priority-high/15 text-priority-high border-priority-high/30'; 
      case 'medium': return 'bg-priority-medium/15 text-priority-medium border-priority-medium/30';
      case 'low': return 'bg-priority-low/15 text-priority-low border-priority-low/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
        return 'text-white';
      case 'in-progress': 
        return 'text-white';
      case 'overdue': 
        return 'text-white';
      case 'blocked':
        return 'text-white';
      case 'pending':
        return 'text-foreground'; // Better contrast on yellow background
      default: 
        return 'text-foreground'; // Better contrast on beige background
    }
  };

  const getStatusBackground = (status: string) => {
    switch (status) {
      case 'completed': 
        return 'bg-completed-green';
      case 'in-progress': 
        return 'bg-progress-blue';
      case 'overdue': 
        return 'bg-overdue-red';
      case 'blocked': 
        return 'bg-overdue-red';
      case 'pending':
        return 'bg-pending-yellow';
      default: 
        return 'bg-not-started-beige';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'in-progress':
        return <Hourglass className="h-3 w-3 mr-1 animate-pulse" />;
      case 'overdue':
        return <AlertTriangle className="h-3 w-3 mr-1" />;
      case 'pending':
      default:
        return <Clock className="h-3 w-3 mr-1" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Card className="hover:shadow-lg hover:shadow-rose-gold/20 transition-all duration-300 border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-rose-gold-contrast line-clamp-2 mb-2">
              {task.title}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="outline" 
                className={`text-xs font-medium px-2 py-1 ${getPriorityColor(task.priority)}`}
              >
                {task.priority.toUpperCase()}
              </Badge>
              <Badge
                className={`text-xs font-medium px-2 py-1 ${getStatusBackground(task.status)} ${getStatusColor(task.status)}`}
              >
                {getStatusIcon(task.status)}
                {task.status.replace('-', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit?.(task)} className="cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Task
                </DropdownMenuItem>
                {showAdminFeatures && onSetRating && (
                  <DropdownMenuItem onClick={() => onSetRating(task.id, 0, '')} className="cursor-pointer">
                    <Star className="mr-2 h-4 w-4" />
                    Rate Task
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete?.(task.id)} 
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="space-y-3">
          {task.assigned_to && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4 text-rose-gold" />
              <span>
                Assigned to: {assigneeProfile?.full_name || assigneeProfile?.email || 'Loading...'}
              </span>
            </div>
          )}

          {task.due_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-rose-gold" />
              <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                Due: {formatDate(task.due_date)}
                {isOverdue && ' (Overdue)'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-rose-gold" />
            <span>Created: {formatDate(task.created_at)}</span>
          </div>

          {task.admin_rating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-rose-gold" />
              <span>Rating: {task.admin_rating}/5</span>
            </div>
          )}

          {task.notes && (
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-rose-gold hover:text-rose-gold-dark p-0 h-auto font-normal"
              >
                <FileText className="mr-1 h-3 w-3" />
                {showDetails ? 'Hide' : 'Show'} Notes
              </Button>
              {showDetails && (
                <p className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-md">
                  {task.notes}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
