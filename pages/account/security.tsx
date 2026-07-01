import { FormEvent, useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { apiClient } from '@/lib/api-client';

type MfaStatus = {
  enabled: boolean;
  backupCodesRemaining: number;
};

export default function AccountSecurityPage() {
  const [status, setStatus] = useState<MfaStatus>({ enabled: false, backupCodesRemaining: 0 });
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    try {
      const response = await apiClient.get('/mfa/status');
      setStatus(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load MFA status');
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const setupMfa = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await apiClient.post('/mfa/setup');
      setSecret(response.data.secret || '');
      setOtpauthUrl(response.data.otpauthUrl || '');
      setMessage('Setup created. Use your authenticator app, then enter the 6-digit code below.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const enableMfa = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await apiClient.post('/mfa/enable', { code });
      setBackupCodes(response.data.backupCodes || []);
      setCode('');
      setSecret('');
      setOtpauthUrl('');
      setMessage('MFA enabled successfully. Save your backup codes now.');
      await loadStatus();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to enable MFA');
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    if (!code.trim()) {
      setError('Enter your current MFA code (or backup code) to disable.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await apiClient.post('/mfa/disable', { code });
      setCode('');
      setBackupCodes([]);
      setMessage('MFA disabled.');
      await loadStatus();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Security</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-900 font-semibold mb-2">Multi-Factor Authentication (MFA)</p>
          <p className="text-sm text-gray-700 mb-4">
            Status: <span className="font-bold">{status.enabled ? 'Enabled' : 'Disabled'}</span>
            {status.enabled && ` • Backup codes left: ${status.backupCodesRemaining}`}
          </p>

          {message && <div className="mb-3 p-3 rounded bg-green-50 border border-green-200 text-green-800">{message}</div>}
          {error && <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-800">{error}</div>}

          {!status.enabled && (
            <button
              onClick={setupMfa}
              disabled={loading}
              className="px-4 py-2 rounded bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:bg-gray-400"
            >
              {loading ? 'Preparing...' : 'Setup MFA'}
            </button>
          )}

          {(secret || otpauthUrl || status.enabled) && (
            <form onSubmit={enableMfa} className="mt-6 space-y-3">
              {secret && (
                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <p className="text-sm text-gray-800 font-semibold">Manual key</p>
                  <p className="font-mono text-gray-900 break-all">{secret}</p>
                  {otpauthUrl && <p className="text-xs text-gray-600 mt-2 break-all">{otpauthUrl}</p>}
                </div>
              )}

              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter MFA code or backup code"
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              />

              {!status.enabled ? (
                <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:bg-gray-400">
                  Enable MFA
                </button>
              ) : (
                <button type="button" onClick={disableMfa} disabled={loading} className="px-4 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700 disabled:bg-gray-400">
                  Disable MFA
                </button>
              )}
            </form>
          )}

          {backupCodes.length > 0 && (
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded p-4">
              <p className="font-bold text-amber-900 mb-2">Backup Codes (save once)</p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((entry) => (
                  <code key={entry} className="bg-white border border-amber-200 rounded px-2 py-1 text-sm">
                    {entry}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

