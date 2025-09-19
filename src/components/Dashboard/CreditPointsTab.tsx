import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Award, TrendingUp, Calendar } from 'lucide-react';
import { Task } from '@/types';
import { motion } from 'framer-motion';

interface CreditPointsTabProps {
  tasks: Task[];
}

const CreditPointsTab: React.FC<CreditPointsTabProps> = ({ tasks }) => {
  // Calculate credit points from completed tasks
  const completedTasks = tasks.filter(task => task.status === 'completed' && task.credit_points > 0);
  const totalCreditPoints = completedTasks.reduce((sum, task) => sum + (task.credit_points || 0), 0);
  
  // Get tasks with highest credit points
  const topTasks = completedTasks
    .sort((a, b) => (b.credit_points || 0) - (a.credit_points || 0))
    .slice(0, 5);

  // Calculate this month's credit points
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthTasks = completedTasks.filter(task => {
    const completedDate = new Date(task.completed_at || task.updated_at);
    return completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear;
  });
  const thisMonthPoints = thisMonthTasks.reduce((sum, task) => sum + (task.credit_points || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-rose-gold/10 to-rose-gold/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Credit Points</p>
                  <p className="text-3xl font-bold text-rose-gold">{totalCreditPoints}</p>
                </div>
                <Award className="h-8 w-8 text-rose-gold" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-completed-green/10 to-completed-green/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Month</p>
                  <p className="text-3xl font-bold text-completed-green">{thisMonthPoints}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-completed-green" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-progress-blue/10 to-progress-blue/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Tasks</p>
                  <p className="text-3xl font-bold text-progress-blue">{completedTasks.length}</p>
                </div>
                <Star className="h-8 w-8 text-progress-blue" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-rose-gold" />
            Top Earning Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No credit points earned yet</p>
              <p className="text-sm mt-2">Complete tasks to start earning credit points</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {task.priority.toUpperCase()}
                      </Badge>
                      {task.completed_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.completed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-gold text-white">
                      <Star className="h-3 w-3 mr-1" />
                      {task.credit_points} pts
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditPointsTab;