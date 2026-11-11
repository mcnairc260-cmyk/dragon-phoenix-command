'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/client';

export default function CancelRecovery() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | string>('idle');
  return (
    <AuthShell title="Cancel the VaultLock release" lead="If you did not ask to release VaultLock, cancel the request. Your sealed settings stay as they are.">
      {state === 'done' ? <Notice tone="ok">The request was cancelled. Your settings are still sealed. Consider changing your password.</Notice> : (
        <>
          {state !== 'idle' && state !== 'busy' && <Notice tone="danger">{state}</Notice>}
          <Button busy={state === 'busy'} className="w-full" onClick={async () => {
            setState('busy');
            try { const r = await api('POST', '/vaultlock/recovery/cancel-token', { token }); setState(r.cancelled ? 'done' : 'There is no waiting request to cancel.'); } catch (e: any) { setState(e.message); }
          }}>Cancel the release request</Button>
        </>
      )}
    </AuthShell>
  );
}
