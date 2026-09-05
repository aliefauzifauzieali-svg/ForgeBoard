import type {
  BoardData,
  LegacyBoardData,
  Project,
  Tag,
  Task,
  TaskPriority,
  TaskStatus,
} from '../types';
import { FORMAT_VERSION, TASK_PRIORITIES, TASK_STATUSES } from '../types';

export interface ValidationResult<T = BoardData> {
  ok: boolean;
  errors: string[];
  data: T | null;
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

type LegacyTask = LegacyBoardData['tasks'][number];

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

function checkBaseTask(
  t: Record<string, unknown>,
  index: number,
  errors: string[],
): boolean {
  const { id, projectId, title, description, priority, status, createdAt, updatedAt, dueDate } = t;
  let valid = true;
  const fail = (msg: string): void => {
    errors.push(msg);
    valid = false;
  };
  if (typeof id !== 'string' || id.length === 0) fail(`tasks[${index}].id inválido`);
  if (typeof projectId !== 'string' || projectId.length === 0)
    fail(`tasks[${index}].projectId inválido`);
  if (typeof title !== 'string' || title.trim().length === 0)
    fail(`tasks[${index}].title é obrigatório`);
  if (typeof title === 'string' && title.trim().length > 140)
    fail(`tasks[${index}].title excede 140 caracteres`);
  if (description !== undefined && typeof description !== 'string')
    fail(`tasks[${index}].description inválida`);
  if (!TASK_PRIORITIES.includes(priority as TaskPriority))
    fail(`tasks[${index}].priority inválida`);
  if (!TASK_STATUSES.includes(status as TaskStatus)) fail(`tasks[${index}].status inválido`);
  if (!isIsoDate(createdAt)) fail(`tasks[${index}].createdAt inválido`);
  if (!isIsoDate(updatedAt)) fail(`tasks[${index}].updatedAt inválido`);
  if (dueDate !== null && dueDate !== undefined && !isDateOnly(dueDate))
    fail(`tasks[${index}].dueDate inválida (use yyyy-mm-dd ou null)`);
  return valid;
}

/** Valida o formato legado v1 (tarefas com `tags: string[]`). */
export function validateBoardData(input: unknown): ValidationResult<LegacyBoardData> {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['Arquivo inválido: objeto raiz esperado'], data: null };
  const { projects, tasks, version } = input;
  if (version !== undefined && version !== 1 && version !== FORMAT_VERSION)
    errors.push('version não suportada (esperado 1)');
  if (!Array.isArray(projects)) errors.push('projects deve ser um array');
  if (!Array.isArray(tasks)) errors.push('tasks deve ser um array');
  if (errors.length > 0) return { ok: false, errors, data: null };

  const validProjects: Project[] = [];
  const projectIds = new Set<string>();
  for (let i = 0; i < (projects as unknown[]).length; i++) {
    const before = errors.length;
    const p = validateProject((projects as unknown[])[i], i, errors);
    if (!p || errors.length !== before) continue;
    if (projectIds.has(p.id)) {
      errors.push(`projects[${i}].id duplicado`);
      continue;
    }
    projectIds.add(p.id);
    validProjects.push(p);
  }

  const validTasks: LegacyTask[] = [];
  const taskIds = new Set<string>();
  for (let i = 0; i < (tasks as unknown[]).length; i++) {
    const raw = (tasks as unknown[])[i];
    if (!isRecord(raw)) {
      errors.push(`tasks[${i}]: objeto inválido`);
      continue;
    }
    const before = errors.length;
    checkBaseTask(raw, i, errors);
    const { tags, previousStatus, completedAt } = raw;
    if (!Array.isArray(tags) || tags.some((x) => typeof x !== 'string'))
      errors.push(`tasks[${i}].tags inválidas`);
    if (previousStatus !== undefined && !TASK_STATUSES.includes(previousStatus as TaskStatus))
      errors.push(`tasks[${i}].previousStatus inválido`);
    if (completedAt !== null && completedAt !== undefined && !isIsoDate(completedAt))
      errors.push(`tasks[${i}].completedAt inválido`);
    if (typeof raw.projectId !== 'string' || !projectIds.has(raw.projectId)) {
      errors.push(`tasks[${i}].projectId referencia projeto inexistente`);
    }
    if (errors.length !== before) continue;
    if (taskIds.has(raw.id as string)) {
      errors.push(`tasks[${i}].id duplicado`);
      continue;
    }
    taskIds.add(raw.id as string);
    validTasks.push({
      id: raw.id as string,
      projectId: raw.projectId as string,
      title: (raw.title as string).trim(),
      description: typeof raw.description === 'string' ? (raw.description as string).slice(0, 2000) : '',
      priority: raw.priority as TaskPriority,
      status: raw.status as TaskStatus,
      ...(previousStatus !== undefined ? { previousStatus: previousStatus as TaskStatus } : {}),
      tags: (tags as string[]).slice(0, 12),
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
      completedAt: (completedAt as string | null) ?? null,
      dueDate: (raw.dueDate as string | null) ?? null,
    });
  }

  if (errors.length > 0) return { ok: false, errors, data: null };
  return { ok: true, errors: [], data: { version: 1, projects: validProjects, tasks: validTasks } };
}

function validateTag(t: unknown, index: number, errors: string[]): Tag | null {
  if (!isRecord(t)) {
    errors.push(`tags[${index}]: objeto inválido`);
    return null;
  }
  const { id, name, color, createdAt } = t;
  if (typeof id !== 'string' || id.length === 0) errors.push(`tags[${index}].id inválido`);
  if (typeof name !== 'string' || name.trim().length === 0) errors.push(`tags[${index}].name é obrigatório`);
  if (typeof name === 'string' && name.trim().length > 40) errors.push(`tags[${index}].name excede 40 caracteres`);
  if (typeof color !== 'string' || color.length === 0) errors.push(`tags[${index}].color inválida`);
  if (!isIsoDate(createdAt)) errors.push(`tags[${index}].createdAt inválido`);
  const hasError = errors.some((e) => e.startsWith(`tags[${index}]`));
  if (hasError) return null;
  return {
    id: id as string,
    name: (name as string).trim().toLowerCase(),
    color: color as string,
    createdAt: createdAt as string,
  };
}

/** Valida o formato atual v2 (registro de tags + `tagIds`). */
export function validateBoardV2(input: unknown): ValidationResult<BoardData> {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['Arquivo inválido: objeto raiz esperado'], data: null };
  const { projects, tasks, tags, version } = input;
  if (version !== FORMAT_VERSION) errors.push(`version não suportada (esperado ${FORMAT_VERSION})`);
  if (!Array.isArray(projects)) errors.push('projects deve ser um array');
  if (!Array.isArray(tasks)) errors.push('tasks deve ser um array');
  if (tags !== undefined && !Array.isArray(tags)) errors.push('tags deve ser um array');
  if (errors.length > 0) return { ok: false, errors, data: null };

  const validProjects: Project[] = [];
  const projectIds = new Set<string>();
  for (let i = 0; i < (projects as unknown[]).length; i++) {
    const before = errors.length;
    const p = validateProject((projects as unknown[])[i], i, errors);
    if (!p || errors.length !== before) continue;
    if (projectIds.has(p.id)) {
      errors.push(`projects[${i}].id duplicado`);
      continue;
    }
    projectIds.add(p.id);
    validProjects.push(p);
  }

  const validTags: Tag[] = [];
  const tagIds = new Set<string>();
  const tagNames = new Set<string>();
  for (let i = 0; i < ((tags as unknown[] | undefined) ?? []).length; i++) {
    const before = errors.length;
    const t = validateTag(((tags as unknown[]) ?? [])[i], i, errors);
    if (!t || errors.length !== before) continue;
    if (tagIds.has(t.id)) {
      errors.push(`tags[${i}].id duplicado`);
      continue;
    }
    if (tagNames.has(t.name)) {
      errors.push(`tags[${i}].name duplicado`);
      continue;
    }
    tagIds.add(t.id);
    tagNames.add(t.name);
    validTags.push(t);
  }

  const validTasks: Task[] = [];
  const seenTaskIds = new Set<string>();
  for (let i = 0; i < (tasks as unknown[]).length; i++) {
    const raw = (tasks as unknown[])[i];
    if (!isRecord(raw)) {
      errors.push(`tasks[${i}]: objeto inválido`);
      continue;
    }
    const before = errors.length;
    checkBaseTask(raw, i, errors);
    const { tagIds: taskTagIds, previousStatus, completedAt } = raw;
    if (!Array.isArray(taskTagIds) || taskTagIds.some((x) => typeof x !== 'string'))
      errors.push(`tasks[${i}].tagIds inválidas`);
    else if ((taskTagIds as string[]).some((id) => !tagIds.has(id)))
      errors.push(`tasks[${i}].tagIds referencia tag inexistente`);
    if (previousStatus !== undefined && !TASK_STATUSES.includes(previousStatus as TaskStatus))
      errors.push(`tasks[${i}].previousStatus inválido`);
    if (completedAt !== null && completedAt !== undefined && !isIsoDate(completedAt))
      errors.push(`tasks[${i}].completedAt inválido`);
    if (typeof raw.projectId !== 'string' || !projectIds.has(raw.projectId)) {
      errors.push(`tasks[${i}].projectId referencia projeto inexistente`);
    }
    if (errors.length !== before) continue;
    if (seenTaskIds.has(raw.id as string)) {
      errors.push(`tasks[${i}].id duplicado`);
      continue;
    }
    seenTaskIds.add(raw.id as string);
    validTasks.push({
      id: raw.id as string,
      projectId: raw.projectId as string,
      title: (raw.title as string).trim(),
      description: typeof raw.description === 'string' ? (raw.description as string).slice(0, 2000) : '',
      priority: raw.priority as TaskPriority,
      status: raw.status as TaskStatus,
      ...(previousStatus !== undefined ? { previousStatus: previousStatus as TaskStatus } : {}),
      tagIds: (taskTagIds as string[]).slice(0, 12),
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
      completedAt: (completedAt as string | null) ?? null,
      dueDate: (raw.dueDate as string | null) ?? null,
    });
  }

  if (errors.length > 0) return { ok: false, errors, data: null };
  return { ok: true, errors: [], data: { version: FORMAT_VERSION, projects: validProjects, tasks: validTasks, tags: validTags } };
}

export interface ExportEnvelope extends BoardData {
  app: 'forgeboard';
  exportedAt: string;
}

/** Serializa o board atual (sempre no formato vigente) com metadados. */
export function serializeBoard(data: BoardData): string {
  const envelope: ExportEnvelope = {
    app: 'forgeboard',
    exportedAt: new Date().toISOString(),
    ...data,
  };
  return JSON.stringify(envelope, null, 2);
}
