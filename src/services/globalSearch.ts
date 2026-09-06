import type { Project, Task, TaskPriority } from '../types';

export interface GlobalSearchResults {
  projects: Project[];
  tasks: Task[];
}

/** Peso para desempate por prioridade (crítica primeiro). */
const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokensOf(query: string): string[] {
  return norm(query)
    .split(/\s+/)
    .filter(Boolean);
}

/** Separa `#etiqueta` (busca só em tags) dos tokens de texto livre. */
export function splitQuery(query: string): { tags: string[]; text: string[] } {
  const tags: string[] = [];
  const text: string[] = [];
  for (const tok of tokensOf(query)) {
    if (tok.startsWith('#') && tok.length > 1) tags.push(tok.slice(1));
    else text.push(tok);
  }
  return { tags, text };
}

interface Field {
  text: string;
  weight: number;
}

/**
 * Todos os tokens precisam aparecer em ao menos um campo (AND);
 * a pontuação favorece título/nome, prefixo e tags.
 */
function scoreFields(fields: Field[], toks: string[]): number | null {
  let score = 0;
  for (const tok of toks) {
    let best = 0;
    for (const f of fields) {
      const t = norm(f.text);
      const i = t.indexOf(tok);
      if (i === -1) continue;
      best = Math.max(best, f.weight + (i === 0 ? 1 : 0));
    }
    if (best === 0) return null;
    score += best;
  }
  return score;
}

/**
 * Busca global em projetos e tarefas (título/nome, descrição, tags e
 * nome do projeto), insensível a maiúsculas e acentos. Query vazia → vazio.
 * Tokens `#nome` filtram por etiqueta (prefixo, AND com o texto).
 * Desempate de tarefas: pontuação, prioridade, prazo (nulos por último),
 * criação recente.
 */
export function searchBoard(
  projects: Project[],
  tasks: Task[],
  query: string,
  limit = 8,
  tagById: Map<string, string> = new Map(),
): GlobalSearchResults {
  const { tags: tagToks, text: toks } = splitQuery(query);
  if (toks.length === 0 && tagToks.length === 0) return { projects: [], tasks: [] };
  const projectNameOf = new Map(projects.map((p) => [p.id, p.name] as const));
  const tagNamesOf = (t: Task): string =>
    t.tagIds.map((id) => tagById.get(id) ?? '').filter(Boolean).join(' ');
  // Etiqueta casa por prefixo do nome normalizado.
  const matchesTags = (t: Task): boolean =>
    tagToks.every((tok) =>
      t.tagIds.some((id) => norm(tagById.get(id) ?? '').startsWith(tok)),
    );

  const rankedProjects =
    toks.length === 0
      ? []
      : projects
          .map((p) => ({
            p,
            score: scoreFields(
              [
                { text: p.name, weight: 3 },
                { text: p.description, weight: 1 },
              ],
              toks,
            ),
          }))
          .filter((r): r is { p: Project; score: number } => r.score !== null)
          .sort((a, b) => b.score - a.score || b.p.createdAt.localeCompare(a.p.createdAt))
          .slice(0, limit)
          .map((r) => r.p);

  const rankedTasks = tasks
    .filter(matchesTags)
    .map((t) => ({
      t,
      score:
        toks.length === 0
          ? 1
          : scoreFields(
              [
                { text: t.title, weight: 3 },
                { text: tagNamesOf(t), weight: 2 },
                { text: t.description, weight: 1 },
                { text: projectNameOf.get(t.projectId) ?? '', weight: 1 },
              ],
              toks,
            ),
    }))
    .filter((r): r is { t: Task; score: number } => r.score !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const pri = PRIORITY_RANK[a.t.priority] - PRIORITY_RANK[b.t.priority];
      if (pri !== 0) return pri;
      // Prazo mais próximo primeiro; sem prazo por último.
      if (a.t.dueDate !== b.t.dueDate) {
        if (a.t.dueDate === null) return 1;
        if (b.t.dueDate === null) return -1;
        const byDue = a.t.dueDate.localeCompare(b.t.dueDate);
        if (byDue !== 0) return byDue;
      }
      return b.t.createdAt.localeCompare(a.t.createdAt);
    })
    .slice(0, limit)
    .map((r) => r.t);

  return { projects: rankedProjects, tasks: rankedTasks };
}
