import type { TaskPriority } from '../types';
import { toDateOnlyString } from './calendar';

export interface TemplateTask {
  title: string;
  description?: string;
  priority?: TaskPriority;
  /** Prazo em dias a partir de hoje (omitido = sem prazo). */
  dueInDays?: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  tasks: TemplateTask[];
}

/** Modelos de projeto: só preenchem o formulário + tarefas iniciais (sem mudar o modelo de dados). */
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  { id: 'blank', name: 'Em branco', description: '', color: '#6366f1', tasks: [] },
  {
    id: 'work',
    name: 'Trabalho',
    description: 'Entregas e rituais da semana.',
    color: '#0ea5e9',
    tasks: [
      { title: 'Planejar a semana', priority: 'high', dueInDays: 1 },
      { title: 'Revisar pendências', priority: 'medium', dueInDays: 3 },
      { title: 'Enviar status', priority: 'low', dueInDays: 5 },
    ],
  },
  {
    id: 'study',
    name: 'Estudos',
    description: 'Trilha de aprendizado com revisões.',
    color: '#8b5cf6',
    tasks: [
      { title: 'Definir tópicos da semana', priority: 'high', dueInDays: 1 },
      { title: 'Praticar exercícios', priority: 'medium', dueInDays: 4 },
      { title: 'Revisar anotações', priority: 'low', dueInDays: 7 },
    ],
  },
  {
    id: 'personal',
    name: 'Pessoal',
    description: 'Vida, casa e bem-estar.',
    color: '#10b981',
    tasks: [
      { title: 'Organizar a semana', priority: 'medium', dueInDays: 2 },
      { title: 'Resolver uma pendência doméstica', priority: 'low', dueInDays: 6 },
    ],
  },
];

/** Converte `dueInDays` em `yyyy-mm-dd` (ou null). Pura e testável. */
export function templateDueDate(dueInDays: number | undefined, now = new Date()): string | null {
  if (dueInDays === undefined) return null;
  const d = new Date(now);
  d.setDate(d.getDate() + Math.max(0, dueInDays));
  return toDateOnlyString(d);
}
