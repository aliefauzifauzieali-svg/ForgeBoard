import { beforeEach, describe, expect, it } from 'vitest';
import { parseCsv, parseCsvTasks } from '../services/csv';
import { useBoardStore } from '../stores/useBoardStore';

describe('parseCsv', () => {
  it('campos simples, aspas, vírgulas e quebras citadas', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    expect(parseCsv('"a,b","c""d""",e')).toEqual([['a,b', 'c"d"', 'e']]);
    expect(parseCsv('a,"x\ny",b')).toEqual([['a', 'x\ny', 'b']]);
    expect(parseCsv(`${String.fromCharCode(0xfeff)}a,b`)).toEqual([['a', 'b']]);
    expect(parseCsv('a,b\n\n')).toEqual([['a', 'b']]);
  });
});

describe('parseCsvTasks', () => {
  const CSV = [
    'titulo,descricao,status,prioridade,prazo,tags,projeto',
    '"Fazer deploy","passo 1, passo 2",fazendo,alta,10/09/2026,devops; urgente,Site',
    'Escrever post,,,baixa,,blog,',
    ',sem titulo,backlog,low,,x,',
    'Data ruim,,,ruim,99/99/9999,,',
  ].join('\n');

  it('mapeia aliases pt, datas br e erros por linha', () => {
    const { rows, errors } = parseCsvTasks(CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      title: 'Fazer deploy',
      description: 'passo 1, passo 2',
      status: 'in-progress',
      priority: 'high',
      dueDate: '2026-09-10',
      tags: ['devops', 'urgente'],
      projectName: 'Site',
    });
    expect(rows[1]).toMatchObject({ title: 'Escrever post', status: 'backlog', priority: 'low', dueDate: null });
    expect(errors).toHaveLength(2);
    expect(errors.join('|')).toMatch(/Linha 4.*título/);
    expect(errors.join('|')).toMatch(/Linha 5.*prazo/);
  });

  it('exige a coluna de título e aceita cabeçalho em inglês', () => {
    expect(parseCsvTasks('description\nx').errors.join()).toMatch(/titulo/);
    const en = parseCsvTasks('title,priority\nT,critical');
    expect(en.rows[0]).toMatchObject({ title: 'T', priority: 'critical' });
    expect(parseCsvTasks('')).toEqual({ rows: [], errors: ['Arquivo vazio ou sem linhas válidas'] });
  });
});

describe('store: importTasks', () => {
  beforeEach(() => {
    useBoardStore.setState({
      projects: [
        { id: 'p1', name: 'Site', description: '', color: '#fff', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
        { id: 'p2', name: 'Outro', description: '', color: '#fff', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
      ],
      tasks: [],
      tags: [],
      undoStack: [],
      redoStack: [],
    });
  });

  it('cria tarefas no alvo, resolve projeto por nome e cria etiquetas', () => {
    const { rows } = parseCsvTasks('titulo,tags,projeto\nA,devops,Outro\nB,,');
    const n = useBoardStore.getState().importTasks('p1', rows);
    expect(n).toBe(2);
    const tasks = useBoardStore.getState().tasks;
    expect(tasks.find((t) => t.title === 'A')!.projectId).toBe('p2');
    expect(tasks.find((t) => t.title === 'B')!.projectId).toBe('p1');
    expect(useBoardStore.getState().tags.map((t) => t.name)).toEqual(['devops']);
    expect(tasks.find((t) => t.title === 'A')!.tagIds).toHaveLength(1);
    // Desfazer remove o lote inteiro.
    useBoardStore.getState().undo();
    expect(useBoardStore.getState().tasks).toHaveLength(0);
  });

  it('rejeita alvo inexistente e lote vazio', () => {
    expect(() => useBoardStore.getState().importTasks('ghost', [])).toThrow(/não encontrado/);
    expect(useBoardStore.getState().importTasks('p1', [])).toBe(0);
  });
});
