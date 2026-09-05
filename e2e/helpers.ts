import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { STORAGE_KEY } from '../src/utils/constants';

/** Limpa o board (localStorage + IndexedDB) e volta ao estado inicial. */
export async function resetBoard(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(async () => {
    window.localStorage.clear();
    // Fecha conexões via reload posterior: o delete pendente conclui e o
    // próximo openDB (pós-reload) já encontra o banco vazio.
    const req = window.indexedDB.deleteDatabase('forgeboard');
    await new Promise<void>((resolve) => {
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
      window.setTimeout(() => resolve(), 1000);
    });
  });
  await page.reload();
  await page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' }).waitFor({ timeout: 10_000 });
}

export async function createProject(page: Page, name: string, description = 'Projeto de teste E2E'): Promise<void> {
  await page.getByRole('button', { name: 'Novo projeto (P)' }).click();
  await page.getByLabel('Nome *', { exact: true }).fill(name);
  await page.getByLabel('Descrição', { exact: true }).fill(description);
  await page
    .getByRole('dialog', { name: 'Novo projeto' })
    .getByRole('button', { name: 'Criar projeto' })
    .click();
  await page.getByText(name).first().waitFor({ timeout: 5_000 });
}

/** Abre o projeto pelo card do dashboard (desktop; no mobile use o item da sidebar). */
export async function openProject(page: Page, name: string): Promise<void> {
  // Fecha menu mobile/modais eventuais para não obstruir o botão.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: `Abrir projeto ${name}` }).click();
  await page.getByRole('heading', { name: 'Quadro Kanban' }).waitFor({ timeout: 5_000 });
}

/** Cria tarefa via atalho N (também valida o shortcut). */
export async function createTask(page: Page, title: string): Promise<void> {
  await page.keyboard.press('n');
  await page.getByLabel('Título *', { exact: true }).fill(title);
  await page
    .getByRole('dialog', { name: 'Nova tarefa' })
    .getByRole('button', { name: 'Criar tarefa' })
    .click();
  await page.getByText(title).first().waitFor({ timeout: 5_000 });
}

/** Preenche o storage com um board válido e recarrega (cenários determinísticos). */
export async function seedBoard(page: Page, data: unknown): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    async ([key, raw]: [string, string]) => {
      window.localStorage.clear();
      // Limpa o IndexedDB para o seed legado ser migrado no boot.
      await new Promise<void>((resolve) => {
        const req = window.indexedDB.deleteDatabase('forgeboard');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
        window.setTimeout(() => resolve(), 1000);
      });
      window.localStorage.setItem(key, raw);
    },
    [STORAGE_KEY, JSON.stringify(data)] as [string, string],
  );
  await page.reload();
  // Boot é assíncrono (IndexedDB): só prossegue com a UI renderizada.
  await page.waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0);
}

/** Aguarda a tarefa existir no snapshot persistido (antes de recarregar). */
export async function waitForTaskPersisted(page: Page, title: string): Promise<void> {
  await page.waitForFunction(
    async (t: string) => {
      let db: IDBDatabase | null = null;
      try {
        db = await new Promise<IDBDatabase>((res, rej) => {
          const r = indexedDB.open('forgeboard');
          r.onsuccess = () => res(r.result as IDBDatabase);
          r.onerror = () => rej(r.error);
        });
        const val: unknown = await new Promise((res, rej) => {
          const q = db!.transaction('kv', 'readonly').objectStore('kv').get('board');
          q.onsuccess = () => res(q.result);
          q.onerror = () => rej(q.error);
        });
        const tasks = (val as { tasks?: Array<{ title?: string }> } | null)?.tasks ?? [];
        return tasks.some((x) => x.title === t);
      } catch {
        return false;
      } finally {
        try {
          db?.close();
        } catch {
          /* ignore */
        }
      }
    },
    title,
    { timeout: 10000 },
  );
}

/** Aguarda um valor nas preferências persistidas (antes de recarregar). */
export async function waitForPrefsValue(page: Page, check: string): Promise<void> {
  await page.waitForFunction(
    async (expected: string) => {
      let db: IDBDatabase | null = null;
      try {
        db = await new Promise<IDBDatabase>((res, rej) => {
          const r = indexedDB.open('forgeboard');
          r.onsuccess = () => res(r.result as IDBDatabase);
          r.onerror = () => rej(r.error);
        });
        const val: unknown = await new Promise((res, rej) => {
          const q = db!.transaction('kv', 'readonly').objectStore('kv').get('preferences');
          q.onsuccess = () => res(q.result);
          q.onerror = () => rej(q.error);
        });
        return (val as { theme?: string } | null)?.theme === expected;
      } catch {
        return false;
      } finally {
        try {
          db?.close();
        } catch {
          /* ignore */
        }
      }
    },
    check,
    { timeout: 10000 },
  );
}

/** Falha se houver violações axe de impacto crítico ou sério. */
export async function expectNoSeriousViolations(page: Page): Promise<void> {
  // Espera animações de entrada terminarem (opacidade 1): sem isso o axe
  // mede contraste no meio do fade e gera falsos positivos.
  await page.waitForFunction(() => {
    const animated = Array.from(document.querySelectorAll('.animate-fade-up, .animate-fade-in'));
    return animated.every((el) => getComputedStyle(el).opacity === '1');
  });
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => `${n.target.join(' ')} :: ${String(n.html).slice(0, 140)}`),
    }));
  if (bad.length > 0) console.log(JSON.stringify(bad, null, 2));
  expect(bad).toEqual([]);
}

/** Arrasta um chip do calendário para um dia via eventos DnD sintéticos. */
export async function dragChipToDay(page: Page, chipTestId: string, dayISO: string): Promise<void> {
  await page.evaluate(
    ([chipId, day]: [string, string]) => {
      const chip = document.querySelector(`[data-testid="${chipId}"]`);
      const cell = document.querySelector(`[data-testid="cal-day-${day}"]`);
      if (!chip || !cell) throw new Error('chip ou dia não encontrado');
      const taskId = (chip as HTMLElement).dataset.taskId ?? '';
      const dataTransfer = {
        getData: () => taskId,
        setData: () => {},
        effectAllowed: 'move',
        dropEffect: 'move',
      };
      const start = new Event('dragstart', { bubbles: true, cancelable: true });
      Object.defineProperty(start, 'dataTransfer', { value: { setData: () => {} } });
      chip.dispatchEvent(start);
      const over = new Event('dragover', { bubbles: true, cancelable: true });
      Object.defineProperty(over, 'dataTransfer', { value: dataTransfer });
      cell.dispatchEvent(over);
      const drop = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      cell.dispatchEvent(drop);
      chip.dispatchEvent(new Event('dragend', { bubbles: true, cancelable: true }));
    },
    [chipTestId, dayISO] as [string, string],
  );
}
