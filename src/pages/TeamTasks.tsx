import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users, SortAsc, Filter } from 'lucide-react';
import TaskCreateDialog from '@/components/Tasks/TaskCreateDialog';
import TeamCreateDialog from '@/components/Teams/TeamCreateDialog';
import StatusFilter, { StatusFilterType } from '@/components/Tasks/StatusFilter';
import TeamTaskCard from '@/components/Teams/TeamTaskCard';
import TeamTaskDetailSidebar from '@/components/Teams/TeamTaskDetailSidebar';
import { apiService } from '@/lib/api';
import { supabaseApi } from '@/lib/supabaseApi';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useTeamTasks, type Team } from '@/hooks/useTeamTasks';

const TeamTasks = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [teamCreateDialogOpen, setTeamCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'due_date' | 'priority'>('name');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [detailSidebarOpen, setDetailSidebarOpen] = useState(false);

  // Use optimized team tasks hook
  const { data: teams = [], isLoading, error } = useTeamTasks();

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<Task> & { assignedEmployees?: string[]; attachments?: File[] }) => {
      const { assignedEmployees, attachments, ...task } = taskData;
      const defaultDue = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      if (assignedEmployees && assignedEmployees.length > 0) {
        // Create individual tasks for each assigned employee
        const taskPromises = assignedEmployees.map(employeeId => 
          apiService.createTask({
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            due_date: task.due_date || defaultDue,
            ...task,
            assigned_to: employeeId,
            assigned_by: user?.id,
            attachments,
          })
        );
        
        return Promise.all(taskPromises);
      } else {
        // Regular task creation
        return apiService.createTask({
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          due_date: task.due_date || defaultDue,
          ...task,
          assigned_by: user?.id,
          attachments,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks-optimized'] });
      toast({
        title: "Success",
        description: "Team task created successfully",
      });
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create team task",
        variant: "destructive",
      });
      console.error('Create task error:', error);
    },
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: { name: string; description?: string; memberIds: string[] }) => {
      const team = await supabaseApi.createTeam({
        name: teamData.name,
        description: teamData.description,
      });
      
      // Add members to the team
      for (const memberId of teamData.memberIds) {
        await supabaseApi.addTeamMember(team.id, memberId);
      }
      
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks-optimized'] });
      toast({
        title: "Success",
        description: "Team created successfully",
      });
      setTeamCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      });
      console.error('Create team error:', error);
    },
  });

  // Event handlers
  const handleCreateTask = (taskData: Partial<Task> & { assignedEmployees?: string[] }) => {
    createTaskMutation.mutate(taskData);
  };

  const handleCreateTeam = (teamData: { name: string; description?: string; memberIds: string[] }) => {
    createTeamMutation.mutate(teamData);
  };

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
    setDetailSidebarOpen(true);
  };

  // Data processing and filtering
  const processedTeams = useMemo(() => {
    let filteredTeams = teams;

    // Apply search filter
    if (searchQuery.trim()) {
      filteredTeams = filteredTeams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.members.some(member => 
          member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply status filter to tasks within teams
    if (statusFilter !== 'all') {
      filteredTeams = filteredTeams.map(team => ({
        ...team,
        tasks: team.tasks.filter(task => task.status === statusFilter)
      })).filter(team => team.tasks.length > 0);
    }

    // Apply sorting
    filteredTeams.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'due_date':
          const aDueDate = a.tasks.length > 0 ? Math.min(...a.tasks.map(task => 
            new Date(task.due_date || '').getTime()
          )) : Infinity;
          const bDueDate = b.tasks.length > 0 ? Math.min(...b.tasks.map(task => 
            new Date(task.due_date || '').getTime()
          )) : Infinity;
          return aDueDate - bDueDate;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aHighestPriority = Math.max(...a.tasks.map(task => 
            priorityOrder[task.priority as keyof typeof priorityOrder] || 1
          ));
          const bHighestPriority = Math.max(...b.tasks.map(task => 
            priorityOrder[task.priority as keyof typeof priorityOrder] || 1
          ));
          return bHighestPriority - aHighestPriority;
        default:
          return 0;
      }
    });

    return filteredTeams;
  }, [teams, searchQuery, statusFilter, sortBy]);

  // Calculate status counts for filters
  const statusCounts = useMemo(() => {
    const allTasks = teams.flatMap(team => team.tasks);
    return {
      pending: allTasks.filter(task => task.status === 'pending').length,
      'in-progress': allTasks.filter(task => task.status === 'in-progress').length,
      completed: allTasks.filter(task => task.status === 'completed').length,
      overdue: allTasks.filter(task => 
        task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
      ).length,
    };
  }, [teams]);

  // Authorization checks
  const canCreateTasks = userRole?.role === 'admin';
  const canManageTeams = ['admin', 'manager'].includes(userRole?.role || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-destructive mb-4">Failed to load team tasks</p>
        <p className="text-muted-foreground mb-4 text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">Team Tasks Dashboard</h1>
          <p className="text-muted-foreground font-opensans">
            View and manage team-level task assignments and progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateTasks && (
            <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          )}
          {canManageTeams && (
            <Button 
              onClick={() => setTeamCreateDialogOpen(true)} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Create Team
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-muted/30 p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
          {/* Search */}
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search teams or members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(value: 'name' | 'due_date' | 'priority') => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Team Name</SelectItem>
              <SelectItem value="due_date">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <StatusFilter
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            counts={statusCounts}
          />
        </div>
      </div>

      {/* Team Cards Grid */}
      {processedTeams.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Users className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold font-montserrat mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No teams match your filters' : 'No teams found'}
          </h3>
          <p className="text-muted-foreground font-opensans max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters to see more teams.'
              : 'Create your first team to get started with team task management.'
            }
          </p>
          {!searchQuery && statusFilter === 'all' && canManageTeams && (
            <Button 
              onClick={() => setTeamCreateDialogOpen(true)}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Team
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {processedTeams.length} team{processedTeams.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
              {statusFilter !== 'all' && ` with ${statusFilter.replace('-', ' ')} tasks`}
            </p>
            <Badge variant="outline">
              {processedTeams.reduce((total, team) => total + team.tasks.length, 0)} Total Tasks
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {processedTeams.map((team) => {
              // Transform team data to match TeamTaskCard props
              const teamMembers = team.members.map(member => ({
                ...member,
                taskCount: team.tasks.filter(task => task.assigned_to === member.id).length,
                completedTasks: team.tasks.filter(task => task.assigned_to === member.id && task.status === 'completed').length,
                pendingTasks: team.tasks.filter(task => task.assigned_to === member.id && task.status === 'pending').length,
                overdueTasks: team.tasks.filter(task => 
                  task.assigned_to === member.id && 
                  task.due_date && 
                  new Date(task.due_date) < new Date() && 
                  task.status !== 'completed'
                ).length,
              }));

              return (
                <TeamTaskCard
                  key={team.id}
                  teamId={team.id}
                  teamName={team.name}
                  members={teamMembers}
                  tasks={team.tasks}
                  onClick={() => handleTeamClick(team)}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Dialogs and Sidebars */}
      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateTask}
      />

      <TeamCreateDialog
        open={teamCreateDialogOpen}
        onOpenChange={setTeamCreateDialogOpen}
        onSave={handleCreateTeam}
      />

      {selectedTeam && (
        <TeamTaskDetailSidebar
          open={detailSidebarOpen}
          onOpenChange={setDetailSidebarOpen}
          teamName={selectedTeam.name}
          members={selectedTeam.members}
          tasks={selectedTeam.tasks}
        />
      )}
    </div>
  );
};

export default TeamTasks;