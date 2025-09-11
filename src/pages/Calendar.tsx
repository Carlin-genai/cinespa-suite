
import React from 'react';
import TaskCalendar from '@/components/Calendar/TaskCalendar';
import CalendarScheduler from '@/components/Calendar/CalendarScheduler';

const Calendar = () => {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      
      {/* Personal Calendar Scheduler */}
      <CalendarScheduler />
      
      {/* Task Calendar */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Task Calendar</h2>
        <TaskCalendar />
      </div>
    </div>
  );
};

export default Calendar;
