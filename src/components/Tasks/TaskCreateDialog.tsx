import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Save, X, Clock, User, Users, Plus, Trash2, Building } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TaskImageUpload from './TaskImageUpload';
import TeamCreateDialog from '../Teams/TeamCreateDialog';
import { supabaseApi } from '@/lib/supabaseApi';

import { Task } from '@/types';

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Partial<Task> & { assignedEmployees?: string[]; attachments?: File[] }) => void;
  isPersonalTask?: boolean;
  showEmployeeSelection?: boolean;
}

const TaskCreateDialog: React.FC<TaskCreateDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  isPersonalTask = false,
  showEmployeeSelection = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Team Creation Dialog State
  const [showTeamCreateDialog, setShowTeamCreateDialog] = useState(false);
  const [pendingTeamSelection, setPendingTeamSelection] = useState<string>('');

  // Task type tabs: individual vs team
  const [taskType, setTaskType] = useState<'individual' | 'team'>('individual');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [teamHead, setTeamHead] = useState('');
  const [additionalMembers, setAdditionalMembers] = useState<string[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [creditPoints, setCreditPoints] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  // Real-time sync for teams - Set up subscription
  useEffect(() => {
    if (!open) return;

    console.log('[TaskCreateDialog] Setting up teams real-time subscription');
    
    const channel = supabase
      .channel('teams-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'teams' 
      }, (payload) => {
        console.log('[TaskCreateDialog] Teams real-time update:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['teams'] });
        
        // Auto-select newly created team if we're waiting for it
        if (payload.eventType === 'INSERT' && payload.new && pendingTeamSelection) {
          console.log('[TaskCreateDialog] Auto-selecting newly created team:', payload.new.id);
          setSelectedTeam(payload.new.id);
          setPendingTeamSelection('');
        }
      })
      .subscribe();

    return () => {
      console.log('[TaskCreateDialog] Cleaning up teams real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [open, queryClient, pendingTeamSelection]);

  // Fetch employees from Supabase profiles
  const { data: employees = [], isLoading: loadingEmployees, error: employeeError } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, team_id, is_team_head')
          .order('full_name', { ascending: true });
        
        if (error) {
          console.error('Failed to fetch employees:', error);
          throw error;
        }
        
        return (data || []).map((e: any) => ({
          id: e.id,
          email: e.email,
          name: e.full_name || e.email,
          teamId: e.team_id,
          isTeamHead: e.is_team_head
        }));
      } catch (error) {
        console.error('Employee fetch error:', error);
        throw error;
      }
    },
    enabled: open,
    retry: 1,
  });

  // Fetch current user role
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return 'employee';
      }
      
      return data?.role || 'employee';
    },
    enabled: !!user?.id && open,
  });

  // Fetch teams - enabled whenever dialog is open for better UX
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('id, name, description, org_id')
          .order('name');
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('[TaskCreateDialog] Teams fetch error:', error);
        return [];
      }
    },
    enabled: open, // Fetch teams when dialog opens, regardless of tab
    staleTime: 0, // Always refetch to get latest teams
  });

  // Update team members when team is selected
  React.useEffect(() => {
    const loadTeamMembers = async () => {
      if (!selectedTeam) {
        setTeamMembers([]);
        setTeamHead('');
        setAdditionalMembers([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('user_id, role')
          .eq('team_id', selectedTeam);
        if (error) throw error;
        const members = (data || []).map((tm: any) => tm.user_id);
        const head = (data || []).find((tm: any) => tm.role === 'head')?.user_id || '';
        setTeamMembers(members);
        setTeamHead(head);
        setSelectedEmployees(members);
        setAdditionalMembers([]);
      } catch (err) {
        console.error('[TaskCreateDialog] Error loading team members:', err);
        setTeamMembers([]);
        setTeamHead('');
      }
    };
    loadTeamMembers();
  }, [selectedTeam]);

  // Update current user role when userRole data changes
  React.useEffect(() => {
    if (userRole) {
      setCurrentUserRole(userRole);
    }
  }, [userRole]);

  // Show loading or error state for employees
  React.useEffect(() => {
    if (employeeError && open && (!isPersonalTask || showEmployeeSelection)) {
      toast({
        title: "Error loading employees",
        description: "Failed to load employee list. Please try again.",
        variant: "destructive"
      });
    }
  }, [employeeError, open, isPersonalTask, showEmployeeSelection, toast]);

  const handleSave = async () => {
    // Validation with user feedback
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a task title.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create tasks.",
        variant: "destructive"
      });
      return;
    }

    if (taskType === 'individual') {
      if (!assignedTo) {
        toast({
          title: "Assignee Required",
          description: "Please select an employee to assign this task.",
          variant: "destructive"
        });
        return;
      }
    } else if (taskType === 'team') {
      if (!selectedTeam) {
        toast({
          title: "Team Required",
          description: "Please select a team for the team task.",
          variant: "destructive"
        });
        return;
      }
    }

    // Team selection optional for admins; if none selected, will self-assign
    if (showEmployeeSelection && selectedEmployees.length === 0 && taskType === 'individual') {
      console.warn('[TaskCreate] No employees selected; will self-assign to current user.');
    }

    // Note: Additional members are temporary task-specific assignments
    // They are not permanently added to the team
    
    // Default due date if not selected: tomorrow at 5PM
    let dueDateTime = selectedDate;
    if (!dueDateTime) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
      dueDateTime = d;
    }
    
    // Combine date and time if time is provided
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(':');
      dueDateTime = new Date(selectedDate || new Date());
      dueDateTime.setHours(parseInt(hours), parseInt(minutes));
    }

    let taskData: any = {
      title: title.trim(),
      description: description.trim() || '',
      status: 'pending' as const,
      priority: priority || 'medium',
      assigned_by: user.id,
      due_date: dueDateTime?.toISOString() || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      time_limit: timeLimit ? parseInt(timeLimit) : null,
      credit_points: (taskType === 'individual' && assignedTo === user.id) ? 0 : (creditPoints ? parseInt(creditPoints) : 0), // No credit points for self-tasks
      attachment_url: attachmentUrl?.trim() || null,
      notes: notes.trim() || null,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // Assignment based on tab
    if (taskType === 'team') {
      const allTeamMembers = [...teamMembers, ...additionalMembers];
      taskData.assignedEmployees = allTeamMembers;
      taskData.assigned_to = teamHead || teamMembers[0]; // Team head or first member as primary assignee
      taskData.team_id = selectedTeam;
      taskData.task_type = 'team';
    } else {
      taskData.assigned_to = assignedTo || user.id;
      // Set task_type for self-tasks
      if (assignedTo === user.id) {
        taskData.task_type = 'self';
      }
    }

    try {
      console.log('[TaskCreate] Creating task with data:', taskData);
      console.log('[TaskCreate] User ID:', user?.id);
      console.log('[TaskCreate] User authenticated:', !!user);
      
      // Call the onSave function passed from parent
      await onSave(taskData);
      
      toast({
        title: "Task Created Successfully",
        description: `${taskType === 'team' ? 'Team' : 'Individual'} task "${taskData.title}" has been created and will appear in the dashboard momentarily.`,
        variant: "default",
      });
      
      handleClose();
    } catch (error) {
      console.error('[TaskCreate] Error creating task:', error);
      toast({
        title: "Error Creating Task",
        description: error instanceof Error ? error.message : "There was an error creating the task. Please try again.",
        variant: "destructive"
      });
    }
  };


  // Handle team creation
  const handleTeamCreate = async (teamData: { name: string; description?: string; memberIds: string[]; teamHeadId?: string }) => {
    try {
      console.log('[TaskCreateDialog] Creating team:', teamData);
      // Show creating state
      setPendingTeamSelection('pending');

      // Create the team using supabaseApi
      const result = await supabaseApi.createTeam(teamData);
      console.log('[TaskCreateDialog] Team created successfully:', result);

      // Optimistically update teams cache and select it
      queryClient.setQueryData<any[]>(['teams'], (old) => {
        const prev = Array.isArray(old) ? old : [];
        // Avoid duplicates
        if (prev.some(t => t.id === result.id)) return prev;
        return [result, ...prev];
      });
      setSelectedTeam(result.id);
      setPendingTeamSelection('');

      // Also trigger a refetch for safety
      queryClient.invalidateQueries({ queryKey: ['teams'] });

      toast({
        title: 'Team Created Successfully',
        description: `Team "${teamData.name}" has been created and auto-selected.`,
        variant: 'default',
      });

      // Close team create dialog
      setShowTeamCreateDialog(false);
    } catch (error) {
      console.error('[TaskCreateDialog] Error creating team:', error);
      setPendingTeamSelection('');
      toast({
        title: 'Error Creating Team',
        description: error instanceof Error ? error.message : 'Failed to create team. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Add member to additional members list
  const addAdditionalMember = (memberId: string) => {
    if (!additionalMembers.includes(memberId) && !teamMembers.includes(memberId)) {
      setAdditionalMembers(prev => [...prev, memberId]);
    }
  };

  // Remove member from additional members list
  const removeAdditionalMember = (memberId: string) => {
    setAdditionalMembers(prev => prev.filter(id => id !== memberId));
  };

  // Check if current user can add members (admin or team head)
  const canAddMembers = () => {
    return currentUserRole === 'admin' || 
           (selectedTeam && teamHead === user?.id);
  };

  const handleClose = () => {
    // Reset form
    setTaskType('individual');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setAssignedTo('');
    setSelectedEmployees([]);
    setSelectedTeam('');
    setTeamMembers([]);
    setTeamHead('');
    setAdditionalMembers([]);
    setSelectedDate(undefined);
    setSelectedTime('');
    setTimeLimit('');
    setCreditPoints('');
    setAttachmentUrl('');
    setNotes('');
    setAttachments([]);
    onOpenChange(false);
  };

  const priorityColors = {
    'low': 'text-priority-low',
    'medium': 'text-priority-medium',
    'high': 'text-priority-high', 
    'critical': 'text-priority-critical'
  };

  // Check if form is valid
  const isFormValid = Boolean(
    title.trim() && (
      (taskType === 'individual' && assignedTo) ||
      (taskType === 'team' && selectedTeam)
    )
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create New Task
          </DialogTitle>
          <DialogDescription>
            Choose between Individual or Team task and assign employees.
          </DialogDescription>
        </DialogHeader>
        
        {/* Task Type Tabs */}
        <Tabs value={taskType} onValueChange={(v) => setTaskType(v as 'individual' | 'team')} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Individual Task
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Task
            </TabsTrigger>
          </TabsList>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-1 space-y-4">
            {/* Common Fields */}
            <div>
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a clear, actionable task title"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the task requirements and expected deliverables"
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority Level</Label>
                <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setPriority(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    <SelectItem value="low">
                      <span className={priorityColors.low}>Low Priority</span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className={priorityColors.medium}>Medium Priority</span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className={priorityColors.high}>High Priority</span>
                    </SelectItem>
                    <SelectItem value="critical">
                      <span className={priorityColors.critical}>Critical Priority</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Hide credit points for self-tasks */}
              {!(taskType === 'individual' && assignedTo === user?.id) && (
                <div>
                  <Label htmlFor="creditPoints">Credit Points</Label>
                  <Input
                    id="creditPoints"
                    type="number"
                    min="0"
                    value={creditPoints}
                    onChange={(e) => setCreditPoints(e.target.value)}
                    placeholder="Points for completion"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                min="1"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="Expected completion time"
                className="mt-1"
              />
            </div>

            {/* Individual Task content: single-select employee */}
            <TabsContent value="individual" className="space-y-4 mt-0">
              <div>
                <Label htmlFor="assignee">Assign To *</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo} disabled={loadingEmployees}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={loadingEmployees ? 'Loading employees...' : 'Select an employee'} />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background border shadow-md">
                    {loadingEmployees ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : employees.length === 0 ? (
                      <SelectItem value="none" disabled>No employees found</SelectItem>
                    ) : (
                      employees.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Team Task content: team selection */}
            <TabsContent value="team" className="space-y-4 mt-0">
              <div>
                <Label htmlFor="team-select">Select Team *</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger>
                        <SelectValue placeholder={pendingTeamSelection ? "Creating team..." : "Select a team"} />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background border shadow-md">
                        {teams.length === 0 ? (
                          <SelectItem value="no-teams" disabled>
                            No teams available
                          </SelectItem>
                        ) : (
                          teams.map((team: any) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{team.name}</span>
                                {team.description && (
                                  <span className="text-xs text-muted-foreground">{team.description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTeamCreateDialog(true)}
                    className="shrink-0 px-3"
                  >
                    <Building className="h-4 w-4 mr-1" />
                    Create Team
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a new team or select an existing one. New teams will be auto-selected.
                </p>
              </div>
              
              {selectedTeam && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div>
                    <Label className="text-sm font-medium">Team Head</Label>
                    <div className="mt-1 p-2 bg-background rounded border">
                      {teamHead ? (
                        <div className="font-medium">
                          {employees.find(emp => emp.id === teamHead)?.name || 'Unknown'}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No team head assigned</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">
                      Team Members ({teamMembers.length + additionalMembers.length})
                    </Label>
                    <div className="mt-1 p-2 bg-background rounded border max-h-32 overflow-y-auto">
                      {teamMembers.length > 0 || additionalMembers.length > 0 ? (
                        <div className="space-y-1">
                          {/* Existing team members */}
                          {teamMembers.map((memberId) => {
                            const member = employees.find(emp => emp.id === memberId);
                            return (
                              <div key={memberId} className="text-sm flex items-center justify-between">
                                <div>
                                  <span className="font-medium">{member?.name || 'Unknown'}</span>
                                  <span className="text-muted-foreground ml-2">({member?.email})</span>
                                </div>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Existing
                                </span>
                              </div>
                            );
                          })}
                          
                          {/* Additional members */}
                          {additionalMembers.map((memberId) => {
                            const member = employees.find(emp => emp.id === memberId);
                            return (
                              <div key={memberId} className="text-sm flex items-center justify-between">
                                <div>
                                  <span className="font-medium">{member?.name || 'Unknown'}</span>
                                  <span className="text-muted-foreground ml-2">({member?.email})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                   <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                     Temporary
                                   </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAdditionalMember(memberId)}
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No team members found</span>
                      )}
                    </div>
                  </div>

                  {/* Add new members section - only for admins and team heads */}
                  {canAddMembers() && (
                    <div>
                      <Label className="text-sm font-medium">Add Temporary Members</Label>
                      <div className="mt-2">
                         <Select 
                          value="" 
                          onValueChange={(value) => {
                            if (value) addAdditionalMember(value);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Add employee for this task only..." />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-background border shadow-md">
                            {employees
                              .filter(emp => 
                                !teamMembers.includes(emp.id) && 
                                !additionalMembers.includes(emp.id)
                              )
                              .map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  <div className="flex items-center gap-2">
                                    <Plus className="h-3 w-3" />
                                    <div>
                                      <span className="font-medium">{emp.name}</span>
                                      <span className="text-muted-foreground ml-2 text-xs">
                                        {emp.email}
                                      </span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {currentUserRole === 'admin' 
                            ? "As an admin, you can add any employee to this task (temporary assignment)." 
                            : "As team head, you can add temporary members to this specific task."
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <div>
              <Label>Due Date & Time</Label>
              <div className="flex gap-2 mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date (optional)</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                If no date is selected, task will be due tomorrow at 5 PM
              </p>
            </div>

            <div>
              <TaskImageUpload
                onImagesChange={setAttachments}
                maxImages={5}
              />
            </div>

            <div>
              <Label htmlFor="attachmentUrl">Additional Attachment URL</Label>
              <Input
                id="attachmentUrl"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="Link to relevant documents or resources (optional)"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional instructions or context for the task"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </Tabs>
        
        {/* Footer with buttons */}
        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isFormValid}
            className="bg-rose-gold hover:bg-rose-gold-dark text-rose-gold-foreground"
          >
            <Save className="mr-2 h-4 w-4" />
            {taskType === 'team' ? 'Create Team Task' : 'Create Individual Task'}
          </Button>
        </div>
      </DialogContent>
      
      {/* Team Creation Dialog */}
      <TeamCreateDialog
        open={showTeamCreateDialog}
        onOpenChange={setShowTeamCreateDialog}
        onSave={handleTeamCreate}
      />
    </Dialog>
  );
};

export default TaskCreateDialog;