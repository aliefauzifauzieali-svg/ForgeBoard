import type { Project, Task } from '../types';

export interface GlobalSearchResults {
  projects: Project[];
  tasks: Task[];
}

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
 */
export function searchBoard(
  projects: Project[],
  tasks: Task[],
  query: string,
  limit = 8,
): GlobalSearchResults {
  const toks = tokensOf(query);
  if (toks.length === 0) return { projects: [], tasks: [] };
  const projectNameOf = new Map(projects.map((p) => [p.id, p.name] as const));

  const rankedProjects = projects
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
    .map((t) => ({
      t,
      score: scoreFields(
        [
          { text: t.title, weight: 3 },
          { text: t.tags.join(' '), weight: 2 },
          { text: t.description, weight: 1 },
          { text: projectNameOf.get(t.projectId) ?? '', weight: 1 },
        ],
        toks,
      ),
    }))
    .filter((r): r is { t: Task; score: number } => r.score !== null)
    .sort((a, b) => b.score - a.score || b.t.createdAt.localeCompare(a.t.createdAt))
    .slice(0, limit)
    .map((r) => r.t);

  return { projects: rankedProjects, tasks: rankedTasks };
}
