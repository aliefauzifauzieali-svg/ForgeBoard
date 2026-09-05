import { FORMAT_VERSION, type BoardData, type LegacyBoardData, type Tag } from '../types';
import { PROJECT_COLORS } from '../utils/constants';
import { generateId, nowIso } from '../utils/core';
import { validateBoardData, validateBoardV2 } from '../services/validation';

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * v1 (tarefas com `tags: string[]`) → v2 (registro de tags + `tagIds`).
 * Pura, determinística e idempotente sobre o mesmo input. Tarefas concluídas
 * sem `completedAt` herdam `updatedAt` para não perder o histórico.
 */
export function migrateV1ToV2(legacy: LegacyBoardData): BoardData {
  const tags: Tag[] = [];
  const byName = new Map<string, Tag>();
  const createdAt = nowIso();

  const ensureTag = (raw: string): string | null => {
    const name = raw.trim().toLowerCase().slice(0, 40);
    if (!name) return null;
    const existing = byName.get(name);
    if (existing) return existing.id;
    const tag: Tag = {
      id: generateId(),
      name,
      color: PROJECT_COLORS[tags.length % PROJECT_COLORS.length]!,
      createdAt,
    };
    tags.push(tag);
    byName.set(name, tag);
    return tag.id;
  };

  return {
    version: FORMAT_VERSION,
    projects: legacy.projects,
    tags,
    tasks: legacy.tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description ?? '',
      priority: t.priority,
      status: t.status,
      ...(t.previousStatus ? { previousStatus: t.previousStatus } : {}),
      tagIds: dedupe(
        (t.tags ?? []).map(ensureTag).filter((id): id is string => id !== null),
      ),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      completedAt: t.status === 'done' ? (t.completedAt ?? t.updatedAt) : null,
      dueDate: t.dueDate ?? null,
    })),
  };
}

function dedupe(ids: string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) === i);
}

/**
 * Eleva qualquer payload conhecido ao formato atual. Lança `MigrationError`
 * em payload irreconhecível ou versão futura (chamador decide: quarentena).
 */
export function migrateToCurrent(input: unknown): BoardData {
  if (!isRecord(input)) throw new MigrationError('Payload inválido: objeto esperado');
  const version = (input as { version?: unknown }).version;

  if (version === FORMAT_VERSION) {
    const result = validateBoardV2(input);
    if (!result.ok || !result.data) {
      throw new MigrationError(`Dados v2 inválidos: ${result.errors.slice(0, 3).join(' · ')}`);
    }
    return result.data;
  }

  if (version === 1 || version === undefined) {
    const result = validateBoardData(input);
    if (!result.ok || !result.data) {
      throw new MigrationError(`Dados v1 inválidos: ${result.errors.slice(0, 3).join(' · ')}`);
    }
    return migrateV1ToV2({ version: 1, projects: result.data.projects, tasks: result.data.tasks });
  }

  throw new MigrationError(`Versão não suportada: ${String(version)} (atual: ${FORMAT_VERSION})`);
}
