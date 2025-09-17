import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileText, CheckCircle, AlertTriangle, Hourglass, Star, User, Users, X } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Task } from '@/types';
import { GroupedTeamTask } from '@/lib/teamTaskUtils';
import TeamTaskTooltip from './TeamTaskTooltip';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskDetailsModalProps {
  task: Task | GroupedTeamTask;
  isOpen: boolean;
  onClose: () => void;
  isTeamTask?: boolean;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ 
  task, 
  isOpen, 
  onClose, 
  isTeamTask = false 
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const { data: assigneeProfile } = useUserProfile(isTeamTask ? null : (task as Task).assigned_to);

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
        return 'text-foreground';
      default: 
        return 'text-foreground';
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
        return <CheckCircle className="h-4 w-4 mr-2" />;
      case 'in-progress':
        return <Hourglass className="h-4 w-4 mr-2 animate-pulse" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 mr-2" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 mr-2" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-xl font-semibold text-rose-gold-contrast pr-8">
                {task.title}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-muted absolute right-4 top-4"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Priority and Status */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge 
                variant="outline" 
                className={`text-sm font-medium px-3 py-1 ${getPriorityColor(task.priority)}`}
              >
                {task.priority.toUpperCase()}
              </Badge>
              <Badge
                className={`text-sm font-medium px-3 py-1 ${getStatusBackground(task.status)} ${getStatusColor(task.status)}`}
              >
                {getStatusIcon(task.status)}
                {task.status.replace('-', ' ').toUpperCase()}
              </Badge>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="font-medium text-foreground mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {task.description}
                </p>
              </div>
            )}

            {/* Assigned To */}
            <div>
              <h3 className="font-medium text-foreground mb-2">Assigned To</h3>
              {isTeamTask ? (
                <TeamTaskTooltip teamTask={task as GroupedTeamTask}>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-rose-gold rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">T</span>
                      </div>
                      <Users className="h-4 w-4 text-rose-gold" />
                    </div>
                    <span>
                      {(task as GroupedTeamTask).teamName} ({(task as GroupedTeamTask).memberCount} members)
                    </span>
                  </div>
                </TeamTaskTooltip>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4 text-rose-gold" />
                  <span>
                    {assigneeProfile?.full_name || assigneeProfile?.email || 'Loading...'}
                  </span>
                </div>
              )}
            </div>

            {/* Due Date */}
            {task.due_date && (
              <div>
                <h3 className="font-medium text-foreground mb-2">Due Date</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-rose-gold" />
                  <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                    {formatDate(task.due_date)}
                    {isOverdue && ' (Overdue)'}
                  </span>
                </div>
              </div>
            )}

            {/* Created Date */}
            <div>
              <h3 className="font-medium text-foreground mb-2">Created Date</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-rose-gold" />
                <span>{formatDate(task.created_at)}</span>
              </div>
            </div>

            {/* Admin Rating */}
            {task.admin_rating && (
              <div>
                <h3 className="font-medium text-foreground mb-2">Admin Rating</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 text-rose-gold" />
                  <span>{task.admin_rating}/5</span>
                </div>
              </div>
            )}

            {/* Notes */}
            {task.notes && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-foreground">Notes</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotes(!showNotes)}
                    className="text-rose-gold hover:text-rose-gold-dark h-8 px-2"
                  >
                    <FileText className="mr-1 h-3 w-3" />
                    {showNotes ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <AnimatePresence>
                  {showNotes && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md leading-relaxed">
                        {task.notes}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;