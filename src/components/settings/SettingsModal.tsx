import { useEffect, useState } from 'react';
import { Download, Pencil, Plus, RefreshCw, Settings2, Trash2, Upload } from 'lucide-react';
import { PROJECT_COLORS } from '../../utils/constants';
import { toDateTime } from '../../utils/date';
import { cn } from '../../utils/core';
import { getNotificationPermission, requestNotificationPermission, type NotifyPermission } from '../../services/notifications';
import { checkBinaryUpdate, installBinaryUpdate } from '../../services/desktopUpdater';
import { checkAndroidUpdate, installAndroidUpdate, isNativeAndroid } from '../../services/androidUpdater';
import { RELEASES_URL, getAppVersion } from '../../services/appInfo';
import { isTauri } from '../../utils/platform';
import { useBoardStore } from '../../stores/useBoardStore';
import { usePrefsStore } from '../../stores/usePrefsStore';
import { ACCENT_OPTIONS, useAccentStore } from '../../stores/useAccentStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useUIStore } from '../../stores/useUIStore';
import type { ThemePreference } from '../../types';
import { Modal } from '../ui/Modal';
import { Switch } from '../ui/Switch';

const THEMES: Array<{ id: ThemePreference; label: string }> = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
  { id: 'system', label: 'Sistema' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section aria-label={title} className="border-t border-zinc-200 pt-4 first:border-t-0 first:pt-0 dark:border-zinc-800">
      <h3 className="heading-section mb-3">{title}</h3>
      {children}
    </section>
  );
}

function TagsManager(): React.JSX.Element {
  const tags = useBoardStore((s) => s.tags);
  const tasks = useBoardStore((s) => s.tasks);
  const createTag = useBoardStore((s) => s.createTag);
  const updateTag = useBoardStore((s) => s.updateTag);
  const deleteTag = useBoardStore((s) => s.deleteTag);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  const usage = (id: string): number => tasks.filter((t) => t.tagIds.includes(id)).length;

  const submitNew = (e: React.FormEvent): void => {
    e.preventDefault();
    try {
      createTag(name);
      setName('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar.');
    }
  };

  return (
    <div>
      <form onSubmit={submitNew} className="flex gap-2">
        <label htmlFor="new-tag-name" className="sr-only">
          Nome da nova etiqueta
        </label>
        <input
          id="new-tag-name"
          className="input"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova etiqueta…"
        />
        <button type="submit" className="btn-primary shrink-0" aria-label="Criar etiqueta">
          <Plus size={16} aria-hidden />
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {tags.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          Nenhuma etiqueta. Crie acima ou digitando no campo de etiquetas da tarefa.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 px-2.5 py-1.5 dark:border-zinc-800"
            >
              <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
              {editingId === tag.id ? (
                <form
                  className="flex min-w-0 flex-1 gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    try {
                      updateTag(tag.id, { name: editName });
                      setEditingId(null);
                      setError('');
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
                    }
                  }}
                >
                  <label htmlFor={`edit-tag-${tag.id}`} className="sr-only">
                    Renomear etiqueta {tag.name}
                  </label>
                  <input
                    id={`edit-tag-${tag.id}`}
                    className="input !py-1 text-sm"
                    value={editName}
                    maxLength={40}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn-primary shrink-0 !px-3 !py-1 text-xs">
                    Salvar
                  </button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{tag.name}</span>
                  <span className="text-[11px] tabular-nums text-zinc-500">
                    {usage(tag.id)} {usage(tag.id) === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                  <div className="flex shrink-0" role="group" aria-label={`Cor da etiqueta ${tag.name}`}>
                    {PROJECT_COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Cor ${c} para ${tag.name}`}
                        aria-pressed={tag.color === c}
                        onClick={() => updateTag(tag.id, { color: c })}
                        className={cn(
                          'h-5 w-5 rounded-full border-2 border-white dark:border-zinc-900',
                          tag.color === c && 'ring-2 ring-[var(--accent)]',
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="icon-btn !h-7 !w-7"
                    aria-label={`Renomear etiqueta ${tag.name}`}
                    onClick={() => {
                      setEditingId(tag.id);
                      setEditName(tag.name);
                      setError('');
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn !h-7 !w-7 hover:!text-red-600"
                    aria-label={`Excluir etiqueta ${tag.name}`}
                    onClick={() =>
                      askConfirm({
                        title: 'Excluir etiqueta',
                        description: `“${tag.name}” será removida de ${usage(tag.id)} tarefas.`,
                        confirmLabel: 'Excluir',
                        action: () => deleteTag(tag.id),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BackupSection(): React.JSX.Element {
  const backups = useBoardStore((s) => s.backups);
  const createManualBackup = useBoardStore((s) => s.createManualBackup);
  const restoreBackup = useBoardStore((s) => s.restoreBackup);
  const askConfirm = useUIStore((s) => s.askConfirm);

  return (
    <div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Cópias automáticas a cada 10 alterações e uma vez ao dia (últimas 5 guardadas).
      </p>
      <button type="button" className="btn-ghost mt-2 text-xs" onClick={createManualBackup}>
        <Download size={14} aria-hidden /> Fazer backup agora
      </button>
      {backups.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">Nenhum backup ainda.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {backups.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-800"
            >
              <span className="min-w-0 flex-1">
                <strong>{b.reason === 'manual' ? 'Manual' : 'Automático'}</strong>
                {' · '}
                <span className="tabular-nums">{toDateTime(b.createdAt)}</span>
                {' · '}
                {b.projects} proj. / {b.tasks} tarefas
              </span>
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 font-bold text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:text-[var(--accent-bright)]"
                onClick={() =>
                  askConfirm({
                    title: 'Restaurar backup',
                    description: `Os dados atuais serão substituídos pelo backup de ${toDateTime(b.createdAt)}.`,
                    confirmLabel: 'Restaurar',
                    action: () => restoreBackup(b.id),
                  })
                }
              >
                <Upload size={13} aria-hidden className="mr-1 inline" />
                Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationsSection(): React.JSX.Element {
  const enabled = usePrefsStore((s) => s.notificationsEnabled);
  const setEnabled = usePrefsStore((s) => s.setNotificationsEnabled);
  const days = usePrefsStore((s) => s.notifyDaysBefore);
  const setDays = usePrefsStore((s) => s.setNotifyDaysBefore);
  const [permission, setPermission] = useState<NotifyPermission>(() => getNotificationPermission());
  const [note, setNote] = useState('');

  const toggle = async (v: boolean): Promise<void> => {
    if (!v) {
      setEnabled(false);
      setNote('');
      return;
    }
    const p = await requestNotificationPermission();
    setPermission(p);
    if (p === 'granted') {
      setEnabled(true);
      setNote('');
    } else if (p === 'denied') {
      setEnabled(false);
      setNote('Permissão negada no navegador. Libere nas configurações do site para ativar.');
    } else {
      setEnabled(true);
      setNote('API indisponível neste navegador: avisos aparecem como toast no app.');
    }
  };

  return (
    <div>
      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
        <span>
          Avisar sobre prazos próximos
          <span className="block text-xs font-normal text-zinc-500">
            Toast no app + notificação do sistema (se permitido).
          </span>
        </span>
        <Switch checked={enabled} onChange={(v) => void toggle(v)} label="Avisar sobre prazos próximos" />
      </label>
      {enabled ? (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <label htmlFor="notify-days">Avisar com</label>
          <select
            id="notify-days"
            className="input !w-auto !py-1.5 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[1, 2, 3, 7].map((d) => (
              <option key={d} value={d}>
                {d} {d === 1 ? 'dia' : 'dias'}
              </option>
            ))}
          </select>
          <span className="text-zinc-600 dark:text-zinc-400">de antecedência</span>
        </div>
      ) : null}
      {permission === 'denied' || note ? (
        <p role={permission === 'denied' ? 'alert' : 'status'} className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          {note || 'Notificações do sistema bloqueadas neste navegador.'}
        </p>
      ) : null}
    </div>
  );
}

/** Atualizações do app desktop (só renderizado no Tauri). */
function UpdatesSection(): React.JSX.Element {
  const pushToast = useUIStore((s) => s.pushToast);
  const [state, setState] = useState<'idle' | 'checking' | 'available' | 'ready' | 'installing' | 'error'>('idle');
  const [version, setVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  // Verificação automática silenciosa ao abrir o app (uma vez por sessão).
  useEffect(() => {
    if (autoChecked) return;
    autoChecked = true;
    void checkBinaryUpdate().then(
      (info) => {
        if (info.available) {
          setState('available');
          setVersion(info.version);
          pushToast({
            kind: 'info',
            message: `Nova versão ${info.version ?? ''} disponível — veja em Configurações > Atualizações`.trim(),
          });
        }
      },
      () => {},
    );
  }, [pushToast]);

  const check = async (): Promise<void> => {
    setState('checking');
    setError('');
    try {
      const info = await checkBinaryUpdate();
      if (info.available) {
        setState('available');
        setVersion(info.version);
      } else {
        setState('ready');
        setVersion(null);
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Falha ao verificar.');
    }
  };

  const install = async (): Promise<void> => {
    setState('installing');
    setError('');
    setProgress(0);
    try {
      await installBinaryUpdate((pct) => setProgress(pct));
      pushToast({ kind: 'success', message: 'Aplicativo atualizado — o instalador vai reiniciar o app.' });
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Falha ao instalar.');
    }
  };

  return (
    <div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {state === 'available' && version
          ? `Versão ${version} disponível (baixa o instalador e reinicia o app).`
          : state === 'ready'
            ? 'Você está na versão mais recente.'
            : 'Busca novas versões no GitHub Releases.'}
      </p>
      {state === 'installing' ? (
        <div className="mt-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Baixando nova versão do aplicativo">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full bg-[var(--accent)] transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">{progress}%</p>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="btn-ghost text-xs"
          disabled={state === 'checking' || state === 'installing'}
          onClick={() => void check()}
        >
          <RefreshCw size={14} aria-hidden />
          {state === 'checking' ? 'Verificando…' : 'Verificar atualização'}
        </button>
        {state === 'available' ? (
          <button type="button" className="btn-primary text-xs" onClick={() => void install()}>
            <Download size={14} aria-hidden /> Baixar e instalar o app
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Guarda de sessão: a verificação automática roda uma vez.
let autoChecked = false;

/** Atualizações OTA do app Android (só renderizado no nativo). */
function AndroidUpdatesSection(): React.JSX.Element | null {
  const pushToast = useUIStore((s) => s.pushToast);
  const [native, setNative] = useState<boolean | null>(null);
  const [state, setState] = useState<'idle' | 'checking' | 'available' | 'ready' | 'installing' | 'error' | 'unconfigured' | 'unreachable'>('idle');
  const [version, setVersion] = useState<string | null>(null);
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void isNativeAndroid().then(setNative);
  }, []);

  if (native !== true) return null;

  const installing = state === 'installing';

  const check = async (): Promise<void> => {
    setState('checking');
    setError('');
    try {
      const info = await checkAndroidUpdate();
      if (info.available) {
        setState('available');
        setVersion(info.version);
        setApkUrl(info.apkUrl);
      } else if (!info.available && info.reason === 'unconfigured') {
        setState('unconfigured');
      } else if (!info.available && info.reason === 'unreachable') {
        setState('error');
        setError('Sem conexão com o servidor de atualização.');
      } else if (!info.available && info.reason === 'not-found') {
        setState('error');
        setError('Release não encontrada (HTTP 404): repositório privado ou sem release publicada.');
      } else {
        setState('ready');
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Falha ao verificar.');
    }
  };

  const install = async (): Promise<void> => {
    if (state !== 'available' || !version) return;
    const info = await checkAndroidUpdate();
    if (!info.available) {
      setState('ready');
      return;
    }
    setState('installing');
    setError('');
    try {
      await installAndroidUpdate(info.version, info.bundleUrl);
      pushToast({ kind: 'success', message: 'Atualização baixada — reinicie o app para aplicar.' });
      setState('ready');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Falha ao instalar.');
    }
  };

  return (
    <div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {state === 'available' && version
          ? `Versão ${version} disponível.`
          : state === 'ready'
            ? 'Você está na versão mais recente.'
            : state === 'unconfigured'
              ? 'Atualização via releases do GitHub (ver README).'
              : 'Busca atualizações do app Android.'}
      </p>
      {state === 'available' && apkUrl ? (
        <p className="mt-1 text-xs">
          <a
            href={apkUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--accent)] hover:underline dark:text-[var(--accent-bright)]"
          >
            Ou baixe o APK completo
          </a>
          <span className="text-zinc-600 dark:text-zinc-400"> (instalação manual, pede confirmação).</span>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="btn-ghost text-xs"
          disabled={state === 'checking' || state === 'installing'}
          onClick={() => void check()}
        >
          <RefreshCw size={14} aria-hidden />
          {state === 'checking' ? 'Verificando…' : 'Verificar atualização'}
        </button>
        {state === 'available' || installing ? (
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={installing}
            onClick={() => void install()}
          >
            <Download size={14} aria-hidden />
            {installing ? 'Baixando…' : 'Baixar e aplicar'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Sobre: nome, versão instalada, releases e atualização. */
function AboutSection(): React.JSX.Element {
  const pushToast = useUIStore((s) => s.pushToast);
  const [version, setVersion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void getAppVersion().then(setVersion);
  }, []);

  // No desktop o WebView não abre links externos: copia em vez disso.
  const onReleasesClick = (e: React.MouseEvent): void => {
    if (!isTauri()) return;
    e.preventDefault();
    const done = (): void => {
      setCopied(true);
      pushToast({ kind: 'info', message: 'Link das releases copiado.' });
      window.setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(RELEASES_URL).then(done, () => {
        pushToast({ kind: 'error', message: 'Não foi possível copiar o link.' });
      });
    } else {
      pushToast({ kind: 'error', message: 'Não foi possível copiar o link.' });
    }
  };

  return (
    <div>
      <p className="text-sm font-bold">ForgeBoard</p>
      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
        Versão instalada:{' '}
        {version ? <strong className="tabular-nums">{version}</strong> : '…'}
      </p>
      <p className="mt-1 text-xs">
        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noreferrer"
          onClick={onReleasesClick}
            className="font-semibold text-[var(--accent)] hover:underline dark:text-[var(--accent-bright)]"
        >
          Ver releases no GitHub
        </a>
        {copied ? <span className="ml-1.5 text-zinc-600 dark:text-zinc-400">(copiado!)</span> : null}
      </p>
      {isTauri() ? (
        <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <UpdatesSection />
        </div>
      ) : null}
      <AndroidUpdatesSection />
    </div>
  );
}

/** Manutenção: reinstalar o app (desktop) e reset de fábrica (todos). */
function MaintenanceSection(): React.JSX.Element {
  const askConfirm = useUIStore((s) => s.askConfirm);
  const pushToast = useUIStore((s) => s.pushToast);
  const [reinstalling, setReinstalling] = useState(false);
  const [reinstallProgress, setReinstallProgress] = useState(0);
  const [reinstallError, setReinstallError] = useState('');

  const reinstall = async (): Promise<void> => {
    setReinstalling(true);
    setReinstallError('');
    setReinstallProgress(0);
    try {
      await installBinaryUpdate((pct) => setReinstallProgress(pct), { reinstall: true });
      pushToast({ kind: 'success', message: 'Aplicativo reinstalado — o instalador vai reiniciar o app.' });
    } catch (err) {
      setReinstalling(false);
      setReinstallError(err instanceof Error ? err.message : 'Falha ao reinstalar.');
    }
  };

  const factoryReset = async (): Promise<void> => {
    const { clearLocalData } = await import('../../storage/idb');
    await clearLocalData();
    window.location.reload();
  };

  return (
    <div className="space-y-3">
      {isTauri() ? (
        <div>
          <p className="text-sm font-semibold">Reinstalar o app</p>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            Baixa o instalador mais recente e reinstala (resolve problemas sem desinstalar manualmente).
          </p>
          {reinstalling ? (
            <div className="mt-2" role="progressbar" aria-valuenow={reinstallProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Reinstalando o aplicativo">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div className="h-full bg-[var(--accent)] transition-[width]" style={{ width: `${reinstallProgress}%` }} />
              </div>
              <p className="mt-1 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">{reinstallProgress}%</p>
            </div>
          ) : null}
          {reinstallError ? (
            <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              {reinstallError}
            </p>
          ) : null}
          <button
            type="button"
            className="btn-ghost mt-2 text-xs"
            disabled={reinstalling}
            onClick={() =>
              askConfirm({
                title: 'Reinstalar o app',
                description: 'Baixa o instalador mais recente e reinstala o aplicativo. Seus dados são mantidos.',
                confirmLabel: 'Reinstalar',
                action: () => void reinstall(),
              })
            }
          >
            <RefreshCw size={14} aria-hidden />
            {reinstalling ? 'Reinstalando…' : 'Reinstalar o app'}
          </button>
        </div>
      ) : null}
      <div>
        <p className="text-sm font-semibold">Restaurar padrão</p>
        <p className="mt-0.5 text-xs font-medium text-red-600 dark:text-red-400">
          Apaga TODOS os dados deste dispositivo (projetos, tarefas, etiquetas, backups e preferências). Exporte um
          backup antes, se quiser guardar.
        </p>
        <button
          type="button"
          className="btn-ghost mt-2 text-xs hover:!text-red-600"
          onClick={() =>
            askConfirm({
              title: 'Restaurar padrão',
              description: 'Todos os dados serão apagados permanentemente e o app vai recomeçar vazio. Deseja continuar?',
              confirmLabel: 'Apagar tudo',
              action: () => void factoryReset(),
            })
          }
        >
          <Trash2 size={14} aria-hidden />
          Restaurar padrão
        </button>
      </div>
    </div>
  );
}

/** Configurações: aparência, atalhos, notificações, etiquetas e backups. */
export function SettingsModal(): React.JSX.Element {
  const open = useUIStore((s) => s.settingsOpen);
  const setOpen = useUIStore((s) => s.setSettingsOpen);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const shortcutsEnabled = usePrefsStore((s) => s.shortcutsEnabled);
  const setShortcutsEnabled = usePrefsStore((s) => s.setShortcutsEnabled);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);
  const accentId = useAccentStore((s) => s.accentId);
  const setAccent = useAccentStore((s) => s.setAccent);

  return (
    <Modal open={open} title="Configurações" description="Preferências salvas neste dispositivo." onClose={() => setOpen(false)} wide>
      <div className="space-y-5">
        <Section title="Aparência">
          <div role="radiogroup" aria-label="Tema" className="flex gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={preference === t.id}
                onClick={() => setPreference(t.id)}
                className={cn(
                  'rounded-xl border px-4 py-2 text-sm font-semibold transition-[transform,border-color,background-color,color] duration-200 active:scale-[0.98]',
                  preference === t.id
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-glow'
                    : 'border-zinc-300 hover:-translate-y-px hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Cor de destaque" className="mt-3 flex flex-wrap gap-1.5">
            {ACCENT_OPTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={accentId === a.id}
                aria-label={`Cor de destaque ${a.label}`}
                title={a.label}
                onClick={() => setAccent(a.id)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 ease-spring hover:scale-110 active:scale-95',
                  accentId === a.id && 'ring-2 ring-[var(--accent)] ring-offset-2 dark:ring-offset-zinc-900',
                )}
                style={{ backgroundColor: a.base }}
              >
                {accentId === a.id ? (
                  <span aria-hidden className="text-sm font-black text-white">
                    ✓
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Atalhos de teclado">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              Atalhos de letra (N, P, T, /, ?)
              <span className="block text-xs font-normal text-zinc-500">
                Ctrl+K e Esc funcionam sempre.
              </span>
            </span>
            <Switch
              checked={shortcutsEnabled}
              onChange={setShortcutsEnabled}
              label="Atalhos de letra (N, P, T, /, ?)"
            />
          </label>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[var(--accent)] hover:underline dark:text-[var(--accent-bright)]"
            onClick={() => {
              setOpen(false);
              setShortcutsOpen(true);
            }}
          >
            Ver todos os atalhos
          </button>
        </Section>

        <Section title="Notificações">
          <NotificationsSection />
        </Section>

        <Section title="Sobre">
          <AboutSection />
        </Section>
        <Section title="Etiquetas">
          <TagsManager />
        </Section>

        <Section title="Backup e restauração">
          <BackupSection />
        </Section>

        <Section title="Manutenção">
          <MaintenanceSection />
        </Section>

        <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Settings2 size={12} aria-hidden />
          Dados e backups ficam neste navegador (IndexedDB). Exporte JSON para cópia externa.
        </p>
      </div>
    </Modal>
  );
}
