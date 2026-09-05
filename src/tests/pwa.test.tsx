import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { InstallButton } from '../components/ui/InstallButton';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { useUIStore } from '../stores/useUIStore';

function reset(): void {
  useUIStore.setState({ online: true, installAvailable: false, installDismissed: false });
}

describe('PWA — banner offline e instalação', () => {
  beforeEach(reset);

  it('banner offline aparece só quando offline', () => {
    const { rerender } = render(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();
    useUIStore.setState({ online: false });
    rerender(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toBeVisible();
  });

  it('botão instalar aparece, falha silenciosa sem prompt e dispensa', async () => {
    const user = userEvent.setup();
    render(<InstallButton />);
    expect(screen.queryByTestId('install-button')).toBeNull();

    useUIStore.setState({ installAvailable: true });
    expect(await screen.findByTestId('install-button')).toBeVisible();
    // Sem evento beforeinstallprompt capturado: sem crash, sem mudança.
    await user.click(screen.getByRole('button', { name: 'Instalar' }));
    expect(screen.getByTestId('install-button')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Dispensar instalação' }));
    expect(screen.queryByTestId('install-button')).toBeNull();
    expect(useUIStore.getState().installDismissed).toBe(true);
  });

  it('flags de rede e instalação no store', () => {
    useUIStore.getState().setOnline(false);
    expect(useUIStore.getState().online).toBe(false);
    useUIStore.getState().setOnline(true);
    useUIStore.getState().setInstallAvailable(true);
    expect(useUIStore.getState().installAvailable).toBe(true);
  });
});
