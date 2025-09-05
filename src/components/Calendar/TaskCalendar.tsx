import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isSameDay } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { Task } from '@/types';

interface CalendarTask {
  id: string;
  title: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
}

const TaskCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [tasksForSelectedDate, setTasksForSelectedDate] = useState<CalendarTask[]>([]);
  const { user } = useAuth();

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': 
      case 'critical':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'medium': 
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority, status')
        .eq('assigned_to', user.id)
        .not('due_date', 'is', null)
        .order('due_date');

      if (error) throw error;
      // Cast the data to proper types since database returns strings
      const typedData = (data || []).map(task => ({
        ...task,
        priority: task.priority as 'low' | 'medium' | 'high' | 'critical',
        status: task.status as 'pending' | 'in-progress' | 'completed' | 'overdue'
      }));
      setTasks(typedData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  useEffect(() => {
    if (selectedDate) {
      const tasksForDate = tasks.filter(task => 
        task.due_date && isSameDay(new Date(task.due_date), selectedDate)
      );
      setTasksForSelectedDate(tasksForDate);
    }
  }, [selectedDate, tasks]);

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      task.due_date && isSameDay(new Date(task.due_date), date)
    );
  };

  const renderDay = (date: Date) => {
    const tasksForDate = getTasksForDate(date);
    const hasHighPriority = tasksForDate.some(task => task.priority === 'high' || task.priority === 'critical');
    const hasMediumPriority = tasksForDate.some(task => task.priority === 'medium');
    const hasLowPriority = tasksForDate.some(task => task.priority === 'low');

    let indicatorClass = '';
    if (hasHighPriority) {
      indicatorClass = 'bg-purple-500';
    } else if (hasMediumPriority) {
      indicatorClass = 'bg-blue-500';
    } else if (hasLowPriority) {
      indicatorClass = 'bg-yellow-500';
    }

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {format(date, 'd')}
        {indicatorClass && (
          <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${indicatorClass}`} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Task Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex-1">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                components={{
                  Day: ({ date }) => renderDay(date)
                }}
              />
            </div>
            
            <div className="w-80 space-y-4">
              <h3 className="text-lg font-semibold">
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </h3>
              
              {tasksForSelectedDate.length === 0 ? (
                <p className="text-muted-foreground">No tasks for this date</p>
              ) : (
                <div className="space-y-3">
                  {tasksForSelectedDate.map(task => (
                    <Card key={task.id} className="p-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">{task.title}</h4>
                        <div className="flex gap-2">
                          <Badge variant="outline" className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </div>
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Due: {format(new Date(task.due_date), 'h:mm a')}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Priority Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded-full" />
              <span className="text-sm">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full" />
              <span className="text-sm">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full" />
              <span className="text-sm">Low Priority</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskCalendar;