
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { apiService } from '@/lib/api';
import { Task } from '@/types';
import { cn } from '@/lib/utils';

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch tasks from backend for calendar view
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['calendar-tasks'],
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
        <p className="text-blocked-red mb-4">Failed to load calendar data.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Get tasks for selected date
  const selectedDateTasks = selectedDate ? tasks.filter((task: Task) => 
    isSameDay(parseISO(task.due_date), selectedDate)
  ) : [];

  // Get tasks for calendar display (with due dates)
  const tasksWithDates = tasks.filter((task: Task) => task.due_date);

  // Function to check if date has tasks
  const hasTasksOnDate = (date: Date) => {
    return tasksWithDates.some((task: Task) => 
      isSameDay(parseISO(task.due_date), date)
    );
  };

  const statusColors = {
    'pending': 'bg-not-started-beige text-charcoal-black',
    'in-progress': 'bg-progress-blue text-white',
    'overdue': 'bg-blocked-red text-white',
    'completed': 'bg-completed-green text-white'
  };

  const priorityColors = {
    'low': 'border-gray-500',
    'medium': 'border-bronze-gold',
    'high': 'border-luxury-gold',
    'critical': 'border-high-priority'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">Calendar</h1>
          <p className="text-muted-foreground font-opensans">
            View tasks and deadlines in calendar format
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{format(currentMonth, 'MMMM yyyy')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Component */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-montserrat flex items-center justify-between">
              <span>Task Calendar</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border"
              modifiers={{
                hasTasks: (date) => hasTasksOnDate(date)
              }}
              modifiersStyles={{
                hasTasks: {
                  backgroundColor: 'hsl(var(--luxury-gold))',
                  color: 'hsl(var(--charcoal-black))',
                  fontWeight: 'bold'
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Tasks for Selected Date */}
        <Card>
          <CardHeader>
            <CardTitle className="font-montserrat flex items-center gap-2">
              <Clock className="h-5 w-5 text-luxury-gold" />
              {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No tasks scheduled for this date
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateTasks.map((task: Task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-lg border-l-4 bg-muted/50",
                      priorityColors[task.priority]
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">{task.title}</h4>
                      <Badge className={cn("text-xs", statusColors[task.status])}>
                        {task.status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{task.assigned_to}</span>
                      <span className="text-luxury-gold font-medium">
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="font-montserrat">Upcoming Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks
              .filter((task: Task) => 
                task.due_date && 
                new Date(task.due_date) >= new Date() && 
                task.status !== 'completed'
              )
              .sort((a: Task, b: Task) => 
                new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
              )
              .slice(0, 6)
              .map((task: Task) => (
                <div
                  key={task.id}
                  className={cn(
                    "p-4 rounded-lg border-l-4 bg-card hover:bg-muted/50 transition-colors",
                    priorityColors[task.priority]
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm line-clamp-1">{task.title}</h4>
                    <Badge className={cn("text-xs", statusColors[task.status])}>
                      {task.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{task.assigned_to}</span>
                    </div>
                    <div className="flex items-center gap-1 text-luxury-gold">
                      <Clock className="h-3 w-3" />
                      <span>{format(parseISO(task.due_date), 'MMM dd')}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendar;
