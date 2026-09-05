import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrateToCurrent, migrateV1ToV2, MigrationError } from '../storage/migrations';
import { validateBoardData } from '../services/validation';

function loadFixture(): unknown {
  // cwd do Vitest é a raiz do projeto.
  const raw = readFileSync('src/tests/fixtures/board-v1.json', 'utf8');
  return JSON.parse(raw);
}

describe('migrateV1ToV2 (fixture real v1)', () => {
  it('migra o fixture preservando projetos e tarefas', () => {
    const parsed = loadFixture();
    const checked = validateBoardData(parsed);
    expect(checked.ok).toBe(true);
    const migrated = migrateV1ToV2(checked.data!);

    expect(migrated.version).toBe(2);
    expect(migrated.projects).toHaveLength(2);
    expect(migrated.tasks).toHaveLength(3);
    // "Lançamento" (×3, com caixa/espaços variados) vira UMA tag normalizada.
    expect(migrated.tags.map((t) => t.name).sort()).toEqual(['lançamento', 'urgente']);
    const t1 = migrated.tasks.find((t) => t.id === 't1')!;
    expect(t1.tagIds).toHaveLength(2);
    // Concluída sem completedAt herda updatedAt (histórico preservado).
    expect(t1.completedAt).toBe('2026-01-04T00:00:00.000Z');
    expect(migrated.tasks.find((t) => t.id === 't2')?.tagIds).toEqual([]);
  });

  it('é idempotente sobre o próprio resultado (v2 passa direto)', () => {
    const once = migrateToCurrent(loadFixture());
    const twice = migrateToCurrent(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
  });
});

describe('migrateToCurrent', () => {
  it('aceita v2 válido e rejeita versão futura', () => {
    const v2 = migrateToCurrent(loadFixture());
    expect(migrateToCurrent(v2)).toEqual(v2);
    expect(() => migrateToCurrent({ ...v2, version: 99 })).toThrow(MigrationError);
  });

  it('rejeita payload irreconhecível e v1 inválido', () => {
    expect(() => migrateToCurrent(null)).toThrow(MigrationError);
    expect(() => migrateToCurrent({ version: 1, projects: [], tasks: [{ id: 'x' }] })).toThrow(
      MigrationError,
    );
  });

  it('migra legado sem campo version', () => {
    const rest = JSON.parse(JSON.stringify(loadFixture())) as Record<string, unknown>;
    delete rest.version;
    const out = migrateToCurrent(rest);
    expect(out.version).toBe(2);
    expect(out.tasks).toHaveLength(3);
  });
});
