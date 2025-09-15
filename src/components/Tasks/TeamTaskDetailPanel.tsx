import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Users, User } from 'lucide-react';
import { Task } from '@/types';
import { useUserProfile } from '@/hooks/useUserProfile';
import { format } from 'date-fns';

interface TeamTaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TeamTaskDetailPanel: React.FC<TeamTaskDetailPanelProps> = ({ task, open, onOpenChange }) => {
  const { data: assigneeProfile } = useUserProfile(task?.assigned_to);

  if (!task) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-left font-montserrat">
            Task Details
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Team Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 px-3 py-1 rounded-full">
              <Users className="h-4 w-4" />
              <span className="font-medium text-sm">Team Task</span>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <h3 className="text-xl font-semibold font-montserrat mb-2">{task.title}</h3>
            {task.description && (
              <p className="text-muted-foreground font-opensans">{task.description}</p>
            )}
          </div>

          <Separator />

          {/* Status and Priority */}
          <div className="flex gap-3">
            <Badge className={getStatusColor(task.status || 'pending')}>
              {task.status?.replace('-', ' ') || 'Pending'}
            </Badge>
            <Badge className={getPriorityColor(task.priority || 'medium')}>
              {task.priority || 'Medium'} Priority
            </Badge>
            {isOverdue && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                Overdue
              </Badge>
            )}
          </div>

          <Separator />

          {/* Assigned Member */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Assigned Member
            </h4>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {getInitials(assigneeProfile?.full_name || assigneeProfile?.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium font-opensans">
                  {assigneeProfile?.full_name || assigneeProfile?.email || 'Unknown User'}
                </p>
                {assigneeProfile?.full_name && assigneeProfile?.email && (
                  <p className="text-sm text-muted-foreground">{assigneeProfile.email}</p>
                )}
              </div>
              <Badge variant="outline" className={getStatusColor(task.status || 'pending')}>
                {task.status?.replace('-', ' ') || 'Pending'}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created:</span>
                <span className="text-sm font-medium">{formatDate(task.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Due Date:</span>
                <span className={`text-sm font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {formatDate(task.due_date)}
                </span>
              </div>
              {task.completed_at && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completed:</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {formatDate(task.completed_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          {(task.credit_points || task.time_limit || task.estimated_hours) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Additional Info
                </h4>
                <div className="space-y-2">
                  {task.credit_points && task.credit_points > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Credit Points:</span>
                      <span className="text-sm font-medium">{task.credit_points}</span>
                    </div>
                  )}
                  {task.time_limit && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Time Limit:</span>
                      <span className="text-sm font-medium">{task.time_limit} hours</span>
                    </div>
                  )}
                  {task.estimated_hours && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Estimated Hours:</span>
                      <span className="text-sm font-medium">{task.estimated_hours} hours</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {task.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Notes</h4>
                <p className="text-sm font-opensans p-3 bg-muted rounded-lg">{task.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TeamTaskDetailPanel;