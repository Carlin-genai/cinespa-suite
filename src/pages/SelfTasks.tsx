import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import TaskCard from '@/components/Tasks/TaskCard';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient'; // Ensure you have Supabase client setup

const SelfTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [taskContext, setTaskContext] = useState('');

  // Fetch signed-in employees from Supabase
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('is_signed_in', true); // Only show signed-in employees

      if (error) {
        console.error('Error fetching employees:', error);
      } else {
        setEmployees(data || []);
      }
    };

    fetchEmployees();
  }, []);

  // Handle task creation
  const handleCreateTask = async () => {
    if (!selectedEmployee || !taskContext) {
      toast({
        title: 'Error',
        description: 'Please select an employee and enter task details.',
        variant: 'destructive'
      });
      return;
    }

    const payload = {
      assigned_to: selectedEmployee,
      context: taskContext,
      created_by: user?.id || 'system'
    };

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Task created successfully!'
        });
        setTaskContext('');
        setSelectedEmployee('');
        queryClient.invalidateQueries(['tasks']);
      } else {
        throw new Error('Failed to create task');
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Task</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select
            value={selectedEmployee}
            onValueChange={(value) => setSelectedEmployee(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select employee to assign" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} ({emp.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            id="taskContext"
            placeholder="Enter task details"
            value={taskContext}
            onChange={(e) => setTaskContext(e.target.value)}
          />

          <Button onClick={handleCreateTask}>Create Task</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SelfTasks;
