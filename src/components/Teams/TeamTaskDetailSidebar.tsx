import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Users, User, Crown, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface TeamTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string | null;
  assigned_to: string;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  role: 'head' | 'member';
  team_id: string;
}

interface TeamTaskDetailSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string;
  members: TeamMember[];
  tasks: TeamTask[];
}

const TeamTaskDetailSidebar: React.FC<TeamTaskDetailSidebarProps> = ({
  open,
  onOpenChange,
  teamName,
  members,
  tasks
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getMemberStats = (member: TeamMember) => {
    const memberTasks = tasks.filter(task => task.assigned_to === member.id);
    const completed = memberTasks.filter(task => task.status === 'completed').length;
    const pending = memberTasks.filter(task => task.status === 'pending').length;
    const inProgress = memberTasks.filter(task => task.status === 'in-progress').length;
    const overdue = memberTasks.filter(task => 
      task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
    ).length;
    
    const total = memberTasks.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, pending, inProgress, overdue, completionRate };
  };

  const teamStats = {
    totalTasks: tasks.length,
    completed: tasks.filter(task => task.status === 'completed').length,
    pending: tasks.filter(task => task.status === 'pending').length,
    inProgress: tasks.filter(task => task.status === 'in-progress').length,
    overdue: tasks.filter(task => 
      task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
    ).length
  };

  const overallCompletion = teamStats.totalTasks > 0 ? (teamStats.completed / teamStats.totalTasks) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left font-montserrat flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-yellow-600 dark:text-yellow-300" />
            </div>
            {teamName} - Task Overview
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Team Statistics */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Team Progress
            </h4>
            
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-sm font-bold">{Math.round(overallCompletion)}%</span>
              </div>
              <Progress value={overallCompletion} className="h-2" />
              
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-primary">{teamStats.totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600">{teamStats.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-600">{teamStats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-red-600">{teamStats.overdue}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Team Members Breakdown */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Member Progress ({members.length} members)
            </h4>

            <div className="space-y-4">
              {members.map((member) => {
                const stats = getMemberStats(member);
                const memberTasks = tasks.filter(task => task.assigned_to === member.id);
                
                return (
                  <div key={member.id} className="p-4 border rounded-lg space-y-3">
                    {/* Member Header */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(member.full_name || member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium font-opensans">
                            {member.full_name || member.email}
                          </p>
                          {member.role === 'head' && (
                            <Badge variant="outline" className="text-xs">
                              <Crown className="h-3 w-3 mr-1 text-yellow-600" />
                              Team Head
                            </Badge>
                          )}
                        </div>
                        {member.full_name && member.email && (
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{Math.round(stats.completionRate)}%</p>
                        <p className="text-xs text-muted-foreground">Complete</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <Progress value={stats.completionRate} className="h-2" />

                    {/* Task Breakdown */}
                    <div className="flex gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{stats.completed} Completed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>{stats.inProgress} In Progress</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span>{stats.pending} Pending</span>
                      </div>
                      {stats.overdue > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>{stats.overdue} Overdue</span>
                        </div>
                      )}
                    </div>

                    {/* Recent Tasks */}
                    {memberTasks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Recent Tasks:</p>
                        <div className="space-y-1">
                          {memberTasks.slice(0, 3).map((task) => (
                            <div key={task.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                              <span className="truncate flex-1 mr-2">{task.title}</span>
                              <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(task.status)}>
                                {task.status?.replace('-', ' ')}
                              </Badge>
                              {task.priority === 'high' && (
                                <Badge className={getPriorityColor(task.priority)}>
                                  High
                                </Badge>
                              )}
                              </div>
                            </div>
                          ))}
                          {memberTasks.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center py-1">
                              +{memberTasks.length - 3} more tasks
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task List */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              All Team Tasks ({tasks.length})
            </h4>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tasks.map((task) => {
                const assignedMember = members.find(member => member.id === task.assigned_to);
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                
                return (
                  <div key={task.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{task.title}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {getInitials(assignedMember?.full_name || assignedMember?.email || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {assignedMember?.full_name || assignedMember?.email || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={getStatusColor(task.status)}>
                          {task.status?.replace('-', ' ')}
                        </Badge>
                        {isOverdue && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {formatDate(task.due_date)}
                      </span>
                      <Badge className={getPriorityColor(task.priority)} variant="outline">
                        {task.priority} priority
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TeamTaskDetailSidebar;