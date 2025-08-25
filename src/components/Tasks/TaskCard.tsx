
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, User, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'blocked' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  dueDate: string;
  progress: number;
  comments: number;
}

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
}

const statusColors = {
  'not-started': 'bg-not-started-beige text-charcoal-black',
  'in-progress': 'bg-progress-blue text-white',
  'blocked': 'bg-blocked-red text-white',
  'completed': 'bg-completed-green text-white'
};

const priorityColors = {
  'low': 'bg-gray-500 text-white',
  'medium': 'bg-bronze-gold text-charcoal-black',
  'high': 'bg-luxury-gold text-charcoal-black',
  'critical': 'bg-high-priority text-white'
};

const TaskCard = ({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) => {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg hover:shadow-luxury-gold/20 animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-montserrat text-foreground line-clamp-2">
            {task.title}
          </CardTitle>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(task)}
                className="h-8 w-8 p-0 hover:bg-luxury-gold hover:text-charcoal-black"
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
        
        {task.progress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-luxury-gold">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{task.assignee}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
            
            {task.comments > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{task.comments}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-luxury-gold">
            <Clock className="h-4 w-4" />
            <span>
              {Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
