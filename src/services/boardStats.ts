import type { Project, Task } from '../types';
import { isOverdue } from '../utils/date';

export interface ProjectProgress {
  projectId: string;
  total: number;
  done: number;
  percent: number;
}

export function tasksForProject(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((t) => t.projectId === projectId);
}

export function countByStatus(tasks: Task[]): Record<string, number> {
  return {
    backlog: tasks.filter((t) => t.status === 'backlog').length,
    'in-progress': tasks.filter((t) => t.status === 'in-progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };
}

export function projectProgress(projectId: string, tasks: Task[]): ProjectProgress {
  const list = tasksForProject(tasks, projectId);
  const done = list.filter((t) => t.status === 'done').length;
  const total = list.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { projectId, total, done, percent };
}

export function allProgress(projects: Project[], tasks: Task[]): ProjectProgress[] {
  return projects.map((p) => projectProgress(p.id, tasks));
}

export interface BoardStats {
  totalProjects: number;
  totalTasks: number;
  doneTasks: number;
  openTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export function boardStats(projects: Project[], tasks: Task[]): BoardStats {
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const overdueTasks = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
  return {
    totalProjects: projects.length,
    totalTasks,
    doneTasks,
    openTasks: totalTasks - doneTasks,
    overdueTasks,
    completionRate: totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100),
  };
}

export function overdueTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => isOverdue(t.dueDate, t.status))
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
}

export function recentTasks(tasks: Task[], limit = 6): Task[] {
  return [...tasks]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
