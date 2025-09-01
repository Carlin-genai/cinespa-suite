
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users, CheckSquare, Clock, AlertTriangle, Calendar, Target, Timer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { format, subDays, isAfter, isBefore, parseISO, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const Analytics = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<string>('30'); // days
  const [viewType, setViewType] = useState<'personal' | 'team'>('personal');

  // Check if we're in local mode
  const isLocalMode = import.meta.env.VITE_DATA_MODE === 'local' || 
                     import.meta.env.VITE_DATA_MODE === undefined;

  // Get current user ID (handle both Supabase and local mode)
  const currentUserId = isLocalMode ? 'current-user' : user?.id;

  // Fetch tasks from backend
  const { data: allTasks = [], isLoading, error } = useQuery({
    queryKey: ['analytics-tasks'],
    queryFn: () => apiService.getTasks(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-blocked-red mb-4">Failed to load analytics data.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Filter tasks based on view type and date range
  const filteredTasks = allTasks.filter((task: Task) => {
    const taskDate = new Date(task.created_at);
    const rangeStart = subDays(new Date(), parseInt(dateRange));
    const isInRange = isAfter(taskDate, rangeStart);
    
    if (viewType === 'personal') {
      return task.assigned_to === currentUserId && isInRange;
    }
    return isInRange; // Team view shows all tasks
  });

  // Calculate metrics
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress');
  const overdueTasks = filteredTasks.filter(t => t.status === 'overdue');

  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const onTimeRate = completedTasks.filter(task => {
    if (!task.due_date) return true;
    return isBefore(parseISO(task.updated_at), parseISO(task.due_date));
  }).length;
  const onTimePercentage = completedTasks.length > 0 ? Math.round((onTimeRate / completedTasks.length) * 100) : 0;

  // Task status distribution
  const taskStatusData = [
    { name: 'Completed', value: completedTasks.length, color: '#10B981' },
    { name: 'In Progress', value: inProgressTasks.length, color: '#3B82F6' },
    { name: 'Pending', value: pendingTasks.length, color: '#F59E0B' },
    { name: 'Overdue', value: overdueTasks.length, color: '#EF4444' }
  ].filter(item => item.value > 0);

  // Priority distribution
  const priorityData = [
    { name: 'Critical', value: filteredTasks.filter(t => t.priority === 'critical').length, color: '#DC2626' },
    { name: 'High', value: filteredTasks.filter(t => t.priority === 'high').length, color: '#D97706' },
    { name: 'Medium', value: filteredTasks.filter(t => t.priority === 'medium').length, color: '#059669' },
    { name: 'Low', value: filteredTasks.filter(t => t.priority === 'low').length, color: '#6B7280' }
  ].filter(item => item.value > 0);

  // Weekly completion trends (last 4 weeks)
  const weeklyTrends = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(new Date(), i * 7));
    const weekEnd = endOfWeek(weekStart);
    const weekTasks = allTasks.filter(task => {
      const completedDate = task.status === 'completed' ? parseISO(task.updated_at) : null;
      return completedDate && isAfter(completedDate, weekStart) && isBefore(completedDate, weekEnd);
    });
    const weekCreated = allTasks.filter(task => {
      const createdDate = parseISO(task.created_at);
      return isAfter(createdDate, weekStart) && isBefore(createdDate, weekEnd);
    });

    weeklyTrends.push({
      week: format(weekStart, 'MMM dd'),
      completed: viewType === 'personal' 
        ? weekTasks.filter(t => t.assigned_to === currentUserId).length
        : weekTasks.length,
      created: viewType === 'personal'
        ? weekCreated.filter(t => t.assigned_to === currentUserId).length
        : weekCreated.length
    });
  }

  // Daily productivity (last 7 days)
  const dailyProductivity = [];
  for (let i = 6; i >= 0; i--) {
    const day = subDays(new Date(), i);
    const dayTasks = filteredTasks.filter(task => {
      const completedDate = task.status === 'completed' ? parseISO(task.updated_at) : null;
      return completedDate && format(completedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    });

    dailyProductivity.push({
      day: format(day, 'EEE'),
      completed: dayTasks.length,
      date: format(day, 'MMM dd')
    });
  }

  // User productivity (for team view)
  const userProductivity = viewType === 'team' ? (() => {
    const userStats = new Map();
    filteredTasks.forEach(task => {
      const userId = task.assigned_to;
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          user: userId,
          completed: 0,
          pending: 0,
          inProgress: 0,
          overdue: 0,
          total: 0
        });
      }
      const stats = userStats.get(userId);
      stats.total++;
      if (task.status === 'completed') stats.completed++;
      else if (task.status === 'pending') stats.pending++;
      else if (task.status === 'in-progress') stats.inProgress++;
      else if (task.status === 'overdue') stats.overdue++;
    });
    return Array.from(userStats.values()).slice(0, 10); // Top 10 users
  })() : [];

  // Average completion time calculation
  const avgCompletionTime = completedTasks.length > 0 ? (() => {
    const times = completedTasks
      .filter(task => task.due_date)
      .map(task => differenceInDays(parseISO(task.updated_at), parseISO(task.created_at)))
      .filter(days => days >= 0);
    return times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  })() : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">Analytics</h1>
          <p className="text-muted-foreground font-opensans">
            {viewType === 'personal' ? 'Track your performance metrics and productivity insights' : 'Monitor team performance and productivity trends'}
            {isLocalMode && (
              <Badge variant="outline" className="ml-2 border-luxury-gold text-luxury-gold">
                Local Mode
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={viewType} onValueChange={(value: 'personal' | 'team') => setViewType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="team">Team</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-luxury-gold/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-luxury-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {viewType === 'personal' ? 'Your tasks' : 'Team tasks'} in last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card className="border-completed-green/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-completed-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-completed-green">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks.length} of {totalTasks} tasks completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-progress-blue/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Target className="h-4 w-4 text-progress-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-progress-blue">{onTimePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {onTimeRate} of {completedTasks.length} completed on time
            </p>
          </CardContent>
        </Card>

        <Card className="border-blocked-red/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
            <Timer className="h-4 w-4 text-luxury-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCompletionTime}</div>
            <p className="text-xs text-muted-foreground">
              Days average to complete tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="font-montserrat">Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No task data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="font-montserrat">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#D4A574" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No priority data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="font-montserrat">Weekly Task Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="completed" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.7} />
              <Area type="monotone" dataKey="created" stackId="2" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.7} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Productivity */}
      <Card>
        <CardHeader>
          <CardTitle className="font-montserrat">Daily Productivity (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyProductivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip labelFormatter={(label, payload) => {
                const data = payload?.[0]?.payload;
                return data ? `${label} (${data.date})` : label;
              }} />
              <Bar dataKey="completed" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* User Productivity (Team View Only) */}
      {viewType === 'team' && userProductivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-montserrat">Team Member Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={userProductivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="user" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#10B981" name="Completed" />
                <Bar dataKey="inProgress" fill="#3B82F6" name="In Progress" />
                <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
                <Bar dataKey="overdue" fill="#EF4444" name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="font-montserrat">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-completed-green/10 rounded-lg">
              <h4 className="font-semibold text-completed-green mb-2">Strengths</h4>
              <ul className="text-sm space-y-1">
                {completionRate >= 80 && <li>• High completion rate ({completionRate}%)</li>}
                {onTimePercentage >= 80 && <li>• Excellent on-time delivery ({onTimePercentage}%)</li>}
                {avgCompletionTime <= 3 && <li>• Fast task completion ({avgCompletionTime} days avg)</li>}
                {overdueTasks.length === 0 && <li>• No overdue tasks</li>}
              </ul>
            </div>
            
            <div className="p-4 bg-luxury-gold/10 rounded-lg">
              <h4 className="font-semibold text-luxury-gold mb-2">Opportunities</h4>
              <ul className="text-sm space-y-1">
                {completionRate < 60 && <li>• Focus on completing more tasks</li>}
                {onTimePercentage < 70 && <li>• Improve deadline management</li>}
                {avgCompletionTime > 7 && <li>• Consider breaking down large tasks</li>}
                {overdueTasks.length > 0 && <li>• Address {overdueTasks.length} overdue tasks</li>}
              </ul>
            </div>
            
            <div className="p-4 bg-progress-blue/10 rounded-lg">
              <h4 className="font-semibold text-progress-blue mb-2">Recommendations</h4>
              <ul className="text-sm space-y-1">
                <li>• Set realistic deadlines for better planning</li>
                <li>• Use priority levels to focus on important tasks</li>
                <li>• Review completed tasks to identify patterns</li>
                <li>• Regular check-ins for in-progress tasks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
