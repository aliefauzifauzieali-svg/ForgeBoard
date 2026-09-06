import type { BoardData } from '../types';

/** Escapa um campo segundo RFC 4180 (aspas duplicadas + envolve quando preciso). */
export function csvCell(value: string): string {
  const v = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const HEADER = ['projeto', 'titulo', 'descricao', 'status', 'prioridade', 'prazo', 'etiquetas', 'criada_em', 'concluida_em'] as const;

const STATUS_LABEL: Record<string, string> = {
  backlog: 'backlog',
  'in-progress': 'in-progress',
  done: 'done',
};

/**
 * Exporta projetos e tarefas em CSV (UTF-8 com BOM para abrir bem no Excel).
 * Colunas: projeto,titulo,descricao,status,prioridade,prazo,etiquetas,criada_em,concluida_em.
 * Etiquetas separadas por `;`.
 */
export function tasksToCsv(board: BoardData): string {
  const tagById = new Map(board.tags.map((t) => [t.id, t.name] as const));
  const projectById = new Map(board.projects.map((p) => [p.id, p.name] as const));
  const lines = [HEADER.join(',')];
  for (const t of board.tasks) {
    lines.push(
      [
        projectById.get(t.projectId) ?? '',
        t.title,
        t.description,
        STATUS_LABEL[t.status] ?? t.status,
        t.priority,
        t.dueDate ?? '',
        t.tagIds.map((id) => tagById.get(id) ?? '').filter(Boolean).join(';'),
        t.createdAt,
        t.completedAt ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  // BOM (U+FEFF) para o Excel reconhecer o UTF-8.
  return `${String.fromCharCode(0xfeff)}${lines.join('\n')}\n`;
}

function mdInline(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Exporta o board em Markdown: um bloco por projeto com checklist de tarefas
 * (`- [x]` concluídas), prioridade, prazo e etiquetas.
 */
export function boardToMarkdown(board: BoardData): string {
  const tagById = new Map(board.tags.map((t) => [t.id, t.name] as const));
  const out = ['# ForgeBoard', ''];
  for (const p of board.projects) {
    out.push(`## ${mdInline(p.name)}`, '');
    if (p.description.trim()) {
      out.push(`> ${mdInline(p.description)}`, '');
    }
    const tasks = board.tasks.filter((t) => t.projectId === p.id);
    if (tasks.length === 0) {
      out.push('_Sem tarefas._', '');
      continue;
    }
    for (const t of tasks) {
      const meta = [
        t.priority,
        t.status,
        t.dueDate ? `prazo ${t.dueDate}` : 'sem prazo',
        ...t.tagIds.map((id) => tagById.get(id)).filter(Boolean).map((n) => `#${n}`),
        t.recurrence ? `repete ${t.recurrence.kind}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      out.push(`- [${t.status === 'done' ? 'x' : ' '}] ${mdInline(t.title)} (${meta})`);
      if (t.description.trim()) {
        out.push(`  > ${mdInline(t.description).slice(0, 300)}`);
      }
      for (const s of t.subtasks) {
        out.push(`  - [${s.done ? 'x' : ' '}] ${mdInline(s.title)}`);
      }
    }
    out.push('');
  }
  const orphan = board.tasks.filter((t) => !board.projects.some((p) => p.id === t.projectId));
  if (orphan.length > 0) {
    out.push('## Sem projeto', '');
    for (const t of orphan) {
      out.push(`- [${t.status === 'done' ? 'x' : ' '}] ${mdInline(t.title)}`);
    }
    out.push('');
  }
  return `${out.join('\n').trimEnd()}\n`;
}
