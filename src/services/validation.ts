import type { BoardData, Project, Task, TaskPriority, TaskStatus } from '../types';
import { TASK_PRIORITIES, TASK_STATUSES } from '../types';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  data: BoardData | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isIsoDate(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const t = Date.parse(v);
  return !Number.isNaN(t);
}

function isDateOnly(v: unknown): boolean {
  if (v === null) return true;
  if (typeof v !== 'string') return false;
  if (v === '') return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00`));
}

function validateProject(p: unknown, index: number, errors: string[]): Project | null {
  if (!isRecord(p)) {
    errors.push(`projects[${index}]: objeto inválido`);
    return null;
  }
  const { id, name, description, color, createdAt, updatedAt } = p;
  if (typeof id !== 'string' || id.length === 0) errors.push(`projects[${index}].id inválido`);
  if (typeof name !== 'string' || name.trim().length === 0) errors.push(`projects[${index}].name é obrigatório`);
  if (typeof name === 'string' && name.trim().length > 80) errors.push(`projects[${index}].name excede 80 caracteres`);
  if (description !== undefined && typeof description !== 'string')
    errors.push(`projects[${index}].description inválida`);
  if (typeof color !== 'string' || color.length === 0) errors.push(`projects[${index}].color inválida`);
  if (!isIsoDate(createdAt)) errors.push(`projects[${index}].createdAt inválido`);
  if (!isIsoDate(updatedAt)) errors.push(`projects[${index}].updatedAt inválido`);
  return {
    id: typeof id === 'string' ? id : `invalid-${index}`,
    name: typeof name === 'string' ? name.trim().slice(0, 80) : '',
    description: typeof description === 'string' ? description.slice(0, 500) : '',
    color: typeof color === 'string' ? color : '#6366f1',
    createdAt: isIsoDate(createdAt) ? (createdAt as string) : new Date().toISOString(),
    updatedAt: isIsoDate(updatedAt) ? (updatedAt as string) : new Date().toISOString(),
  };
}

function validateTask(t: unknown, index: number, projectIds: Set<string>, errors: string[]): Task | null {
  if (!isRecord(t)) {
    errors.push(`tasks[${index}]: objeto inválido`);
    return null;
  }
  const { id, projectId, title, description, priority, status, previousStatus, createdAt, updatedAt, dueDate, tags } =
    t;
  if (typeof id !== 'string' || id.length === 0) errors.push(`tasks[${index}].id inválido`);
  if (typeof projectId !== 'string' || !projectIds.has(projectId))
    errors.push(`tasks[${index}].projectId referencia projeto inexistente`);
  if (typeof title !== 'string' || title.trim().length === 0)
    errors.push(`tasks[${index}].title é obrigatório`);
  if (typeof title === 'string' && title.trim().length > 140)
    errors.push(`tasks[${index}].title excede 140 caracteres`);
  if (description !== undefined && typeof description !== 'string')
    errors.push(`tasks[${index}].description inválida`);
  if (!TASK_PRIORITIES.includes(priority as TaskPriority))
    errors.push(`tasks[${index}].priority inválida`);
  if (!TASK_STATUSES.includes(status as TaskStatus)) errors.push(`tasks[${index}].status inválido`);
  if (previousStatus !== undefined && !TASK_STATUSES.includes(previousStatus as TaskStatus))
    errors.push(`tasks[${index}].previousStatus inválido`);
  if (!isIsoDate(createdAt)) errors.push(`tasks[${index}].createdAt inválido`);
  if (!isIsoDate(updatedAt)) errors.push(`tasks[${index}].updatedAt inválido`);
  if (dueDate !== null && dueDate !== undefined && !isDateOnly(dueDate))
    errors.push(`tasks[${index}].dueDate inválida (use yyyy-mm-dd ou null)`);
  if (!Array.isArray(tags) || tags.some((x) => typeof x !== 'string'))
    errors.push(`tasks[${index}].tags inválidas`);

  const hasError = errors.some((e) => e.startsWith(`tasks[${index}]`));
  if (hasError) return null;
  return {
    id: id as string,
    projectId: projectId as string,
    title: (title as string).trim(),
    description: typeof description === 'string' ? description.slice(0, 2000) : '',
    priority: priority as TaskPriority,
    status: status as TaskStatus,
    ...(previousStatus !== undefined ? { previousStatus: previousStatus as TaskStatus } : {}),
    createdAt: createdAt as string,
    updatedAt: updatedAt as string,
    dueDate: (dueDate as string | null) ?? null,
    tags: (tags as string[]).slice(0, 12),
  };
}

/**
 * Valida um payload arbitrário (arquivo importado ou dados do storage)
 * antes de ser aceito. Nunca lança: retorna { ok, errors, data }.
 * Itens com qualquer erro são descartados; se houver ao menos um erro,
 * o resultado é inválido como um todo.
 */
export function validateBoardData(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['Arquivo inválido: objeto raiz esperado'], data: null };
  const { projects, tasks, version } = input;
  if (version !== undefined && version !== 1) errors.push('version não suportada (esperado 1)');
  if (!Array.isArray(projects)) errors.push('projects deve ser um array');
  if (!Array.isArray(tasks)) errors.push('tasks deve ser um array');
  if (errors.length > 0) return { ok: false, errors, data: null };

  const validProjects: Project[] = [];
  const projectIds = new Set<string>();
  for (let i = 0; i < (projects as unknown[]).length; i++) {
    const before = errors.length;
    const p = validateProject((projects as unknown[])[i], i, errors);
    if (!p || errors.length !== before) continue; // item com erro é descartado
    if (projectIds.has(p.id)) {
      errors.push(`projects[${i}].id duplicado`);
      continue;
    }
    projectIds.add(p.id);
    validProjects.push(p);
  }

  const validTasks: Task[] = [];
  const taskIds = new Set<string>();
  for (let i = 0; i < (tasks as unknown[]).length; i++) {
    const before = errors.length;
    const t = validateTask((tasks as unknown[])[i], i, projectIds, errors);
    if (!t || errors.length !== before) continue; // item com erro é descartado
    if (taskIds.has(t.id)) {
      errors.push(`tasks[${i}].id duplicado`);
      continue;
    }
    taskIds.add(t.id);
    validTasks.push(t);
  }

  if (errors.length > 0) return { ok: false, errors, data: null };
  return { ok: true, errors: [], data: { version: 1, projects: validProjects, tasks: validTasks } };
}

export function serializeBoard(data: BoardData): string {
  return JSON.stringify({ version: 1, projects: data.projects, tasks: data.tasks }, null, 2);
}

export function parseImport(raw: string): ValidationResult {
  try {
    const parsed: unknown = JSON.parse(raw);
    return validateBoardData(parsed);
  } catch {
    return { ok: false, errors: ['Arquivo inválido: JSON malformado'], data: null };
  }
}
