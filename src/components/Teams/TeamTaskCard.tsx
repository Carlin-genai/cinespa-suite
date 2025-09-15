import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, User, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TeamTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string | null;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  role: 'head' | 'member';
  taskCount: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
}

interface TeamTaskCardProps {
  teamId: string;
  teamName: string;
  members: TeamMember[];
  tasks: TeamTask[];
  onClick: () => void;
}

const TeamTaskCard: React.FC<TeamTaskCardProps> = ({
  teamName,
  members,
  tasks,
  onClick
}) => {
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

  const teamHead = members.find(member => member.role === 'head');
  const activeTasks = tasks.filter(task => task.status !== 'completed');
  const completedTasks = tasks.filter(task => task.status === 'completed');
  const overdueTasks = tasks.filter(task => 
    task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
  );

  const highPriorityTasks = tasks.filter(task => task.priority === 'high').length;

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Team Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
              </div>
              <div>
                <h3 className="font-semibold font-montserrat text-lg group-hover:text-primary transition-colors">
                  {teamName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {members.length} Members
                  </Badge>
                  {highPriorityTasks > 0 && (
                    <Badge className={getPriorityColor('high')}>
                      {highPriorityTasks} High Priority
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Team Head */}
          {teamHead && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getInitials(teamHead.full_name || teamHead.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium font-opensans flex items-center gap-2">
                  <Crown className="h-3 w-3 text-yellow-600" />
                  {teamHead.full_name || teamHead.email}
                </p>
                <p className="text-xs text-muted-foreground">Team Head</p>
              </div>
            </div>
          )}

          {/* Task Statistics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-muted rounded">
              <p className="text-lg font-semibold text-primary">{activeTasks.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <p className="text-lg font-semibold text-green-600">{completedTasks.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <p className="text-lg font-semibold text-red-600">{overdueTasks.length}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </div>

          {/* Status Overview */}
          <div className="flex gap-2 flex-wrap">
            {activeTasks.length > 0 && (
              <Badge className={getStatusColor('pending')}>
                {activeTasks.length} Active
              </Badge>
            )}
            {completedTasks.length > 0 && (
              <Badge className={getStatusColor('completed')}>
                {completedTasks.length} Completed
              </Badge>
            )}
            {overdueTasks.length > 0 && (
              <Badge className={getStatusColor('overdue')}>
                {overdueTasks.length} Overdue
              </Badge>
            )}
          </div>

          {/* Recent Task Preview */}
          {tasks.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Latest Task:</p>
              <p className="text-sm font-medium truncate">
                {tasks[0]?.title || 'No tasks'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamTaskCard;