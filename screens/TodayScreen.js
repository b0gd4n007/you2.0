// screens/TodayScreen.js
import React from 'react';
import TaskApp from './TaskApp';

export default function TodayScreen(props) {
  return <TaskApp {...props} filterToToday />;
}
