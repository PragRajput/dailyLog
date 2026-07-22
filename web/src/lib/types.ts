export interface User {
  id:      string;
  name:    string;
  email:   string;
  avatar?: string;
}

export interface Project {
  _id:         string;
  name:        string;
  color:       string;
  archived:    boolean;
  completed?:  boolean;
  completedAt?: string;
  createdAt:   string;
}

export interface Entry {
  _id:         string;
  projectId:   Project;
  taskId?:     string;
  date:        string;
  description: string;
  hours?:      number | null;
  createdAt:   string;
}

export type CalendarData = Record<string, Entry[]>;

export interface Task {
  _id:          string;
  projectId?:   Pick<Project, '_id' | 'name' | 'color'> | null;
  title:        string;
  description?: string;
  dueDate?:     string;
  priority:     'low' | 'medium' | 'high';
  completed:    boolean;
  completedAt?: string;
  createdAt:    string;
}
