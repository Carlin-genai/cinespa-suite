
import React from 'react';
import TaskCalendar from '@/components/Calendar/TaskCalendar';

const Calendar = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Task Calendar</h1>
      <TaskCalendar />
    </div>
  );
};

export default Calendar;
