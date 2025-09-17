
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Trash2, Star } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { GroupedTeamTask } from '@/lib/teamTaskUtils';
import TaskDetailsModal from './TaskDetailsModal';

interface TaskCardProps {
  task: Task | GroupedTeamTask;
  onEdit?: (task: any) => void;
  onDelete?: (taskId: string) => void;
  showActions?: boolean;
  showAdminFeatures?: boolean;
  onSetRating?: (taskId: string, rating: number, comment: string) => void;
  isTeamTask?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onEdit, 
  onDelete, 
  showActions = true, 
  showAdminFeatures = false,
  onSetRating,
  isTeamTask = false 
}) => {
  const { userRole } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isAdmin = userRole?.role === 'admin';
  const canEdit = showActions && (isAdmin || (!isTeamTask && (task as Task).assigned_to === userRole?.user_id));

  return (
    <>
      <Card className="hover:shadow-lg hover:shadow-rose-gold/20 transition-all duration-300 border border-border">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle 
                className="text-lg font-normal text-rose-gold-contrast line-clamp-2 cursor-pointer hover:text-rose-gold transition-colors"
                onClick={() => setIsModalOpen(true)}
              >
                {task.title}
              </CardTitle>
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
      </Card>

      <TaskDetailsModal
        task={task}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isTeamTask={isTeamTask}
      />
    </>
  );
};

export default TaskCard;
