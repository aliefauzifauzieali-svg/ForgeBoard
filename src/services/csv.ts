/**
 * Parser CSV mínimo (RFC 4180): aspas, aspas escapadas (`""`), vírgulas e
 * quebras de linha dentro de campos citados, `\r\n` ou `\n`.
 * Sem dependências; retorna as linhas como arrays de campos.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  // BOM inicial não faz parte do conteúdo.
  if (text.charCodeAt(0) === 0xfeff) text = text.substring(1);

  const pushField = (): void => {
    row.push(field);
    field = '';
  };
  const pushRow = (): void => {
    pushField();
    // Ignora linhas totalmente vazias.
    if (!(row.length === 1 && row[0]!.trim() === '')) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          quoted = false;
          i += 1;
        }
      } else {
        field += c;
        i += 1;
      }
      continue;
    }
    if (c === '"') {
      quoted = true;
      i += 1;
    } else if (c === ',') {
      pushField();
      i += 1;
    } else if (c === '\r' && text[i + 1] === '\n') {
      pushRow();
      i += 2;
    } else if (c === '\n') {
      pushRow();
      i += 1;
    } else {
      field += c;
      i += 1;
    }
  }
  if (quoted || field !== '' || row.length > 0) pushRow();
  return rows;
}

// Faixa de diacríticos combinantes (construída por escape para não espalhar
// caracteres invisíveis no fonte).
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

export function stripAccents(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');
}

function headerIndex(header: string[], aliases: string[]): number {
  const normed = header.map(stripAccents);
  for (const a of aliases) {
    const i = normed.indexOf(a);
    if (i !== -1) return i;
  }
  return -1;
}

export interface CsvTaskRow {
  line: number;
  title: string;
  description: string;
  status: 'backlog' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string | null;
  tags: string[];
  /** Nome do projeto (coluna opcional `projeto`); vazio = projeto alvo. */
  projectName: string;
}

export interface CsvParseResult {
  rows: CsvTaskRow[];
  errors: string[];
}

const STATUS_MAP: Record<string, CsvTaskRow['status']> = {
  backlog: 'backlog',
  pendente: 'backlog',
  afazer: 'backlog',
  'a fazer': 'backlog',
  todo: 'backlog',
  'in-progress': 'in-progress',
  emandamento: 'in-progress',
  'em andamento': 'in-progress',
  fazendo: 'in-progress',
  doing: 'in-progress',
  done: 'done',
  concluida: 'done',
  feito: 'done',
};

const PRIORITY_MAP: Record<string, CsvTaskRow['priority']> = {
  low: 'low',
  baixa: 'low',
  medium: 'medium',
  media: 'medium',
  high: 'high',
  alta: 'high',
  critical: 'critical',
  critica: 'critical',
};

function mapStatus(raw: string): CsvTaskRow['status'] {
  return STATUS_MAP[stripAccents(raw.trim())] ?? 'backlog';
}

function mapPriority(raw: string): CsvTaskRow['priority'] {
  return PRIORITY_MAP[stripAccents(raw.trim())] ?? 'medium';
}

function mapDueDate(raw: string): { value: string | null; error: boolean } {
  const v = raw.trim();
  if (!v) return { value: null, error: false };
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return Number.isNaN(Date.parse(`${v}T12:00:00`)) ? { value: null, error: true } : { value: v, error: false };
  }
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (br) {
    const iso = `${br[3]}-${br[2]}-${br[1]}`;
    return Number.isNaN(Date.parse(`${iso}T12:00:00`)) ? { value: null, error: true } : { value: iso, error: false };
  }
  return { value: null, error: true };
}

function splitTags(raw: string): string[] {
  const parts = raw.includes(';') ? raw.split(';') : raw.split(',');
  return parts.map((p) => p.trim().toLowerCase().slice(0, 40)).filter(Boolean);
}

/**
 * Converte CSV em linhas de tarefa. Colunas (pt ou en, qualquer ordem):
 * título*, descrição, status, prioridade, prazo, tags, projeto (opcional).
 * Retorna linhas válidas + erros por linha (1-based, inclui cabeçalho).
 */
export function parseCsvTasks(text: string): CsvParseResult {
  const rows: CsvTaskRow[] = [];
  const errors: string[] = [];
  const table = parseCsv(text);
  if (table.length === 0) return { rows, errors: ['Arquivo vazio ou sem linhas válidas'] };

  const header = table[0]!.map((h) => h.trim());
  const ci = {
    title: headerIndex(header, ['titulo', 'title', 'tarefa', 'nome']),
    description: headerIndex(header, ['descricao', 'description']),
    status: headerIndex(header, ['status', 'situacao', 'estado']),
    priority: headerIndex(header, ['prioridade', 'priority']),
    dueDate: headerIndex(header, ['prazo', 'duedate', 'due', 'data', 'vencimento']),
    tags: headerIndex(header, ['tags', 'etiquetas', 'labels']),
    project: headerIndex(header, ['projeto', 'project']),
  };
  if (ci.title === -1) {
    return { rows, errors: ["Coluna obrigatória ausente: 'titulo' (ou 'title')"] };
  }
  const cell = (r: string[], i: number): string => (i === -1 ? '' : (r[i] ?? '').trim());

  for (let n = 1; n < table.length; n++) {
    const r = table[n]!;
    const line = n + 1;
    const title = cell(r, ci.title).slice(0, 140);
    if (!title) {
      errors.push(`Linha ${line}: título obrigatório`);
      continue;
    }
    const due = mapDueDate(cell(r, ci.dueDate));
    if (due.error) {
      errors.push(`Linha ${line}: prazo inválido (use aaaa-mm-dd ou dd/mm/aaaa)`);
      continue;
    }
    rows.push({
      line,
      title,
      description: cell(r, ci.description).slice(0, 2000),
      status: mapStatus(cell(r, ci.status)),
      priority: mapPriority(cell(r, ci.priority)),
      dueDate: due.value,
      tags: splitTags(cell(r, ci.tags)).slice(0, 12),
      projectName: cell(r, ci.project),
    });
  }
  if (rows.length === 0 && errors.length === 0) errors.push('Nenhuma linha de dados além do cabeçalho');
  return { rows, errors };
}
