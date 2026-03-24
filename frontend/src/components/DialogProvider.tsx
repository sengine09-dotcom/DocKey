import React, { useEffect, useState } from 'react';
import { AlertDialogOptions, ConfirmDialogOptions, DialogTone, registerDialogHandlers } from '../services/dialogService';

type AlertDialogRequest = {
  kind: 'alert';
  options: AlertDialogOptions;
  resolve: () => void;
};

type ConfirmDialogRequest = {
  kind: 'confirm';
  options: ConfirmDialogOptions;
  resolve: (value: boolean) => void;
};

type DialogRequest = AlertDialogRequest | ConfirmDialogRequest;

const getThemeIsDark = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  const savedValue = window.localStorage.getItem('doc-key-theme-dark-mode');
  return savedValue == null ? true : savedValue === 'true';
};

const getToneButtonClass = (tone: DialogTone) => {
  if (tone === 'danger') {
    return 'bg-red-600 text-white hover:bg-red-700';
  }

  if (tone === 'warning') {
    return 'bg-amber-500 text-white hover:bg-amber-600';
  }

  if (tone === 'success') {
    return 'bg-green-600 text-white hover:bg-green-700';
  }

  return 'bg-blue-600 text-white hover:bg-blue-700';
};

export default function DialogProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<DialogRequest[]>([]);

  useEffect(() => {
    return registerDialogHandlers({
      alert: (options) => new Promise<void>((resolve) => {
        setQueue((prev) => [...prev, { kind: 'alert', options, resolve }]);
      }),
      confirm: (options) => new Promise<boolean>((resolve) => {
        setQueue((prev) => [...prev, { kind: 'confirm', options, resolve }]);
      }),
    });
  }, []);

  const activeDialog = queue[0] || null;
  const darkMode = getThemeIsDark();

  const closeAlert = () => {
    if (!activeDialog || activeDialog.kind !== 'alert') {
      return;
    }

    activeDialog.resolve();
    setQueue((prev) => prev.slice(1));
  };

  const closeConfirm = (confirmed: boolean) => {
    if (!activeDialog || activeDialog.kind !== 'confirm') {
      return;
    }

    activeDialog.resolve(confirmed);
    setQueue((prev) => prev.slice(1));
  };

  const title = activeDialog?.options.title || (activeDialog?.kind === 'confirm' ? 'Please Confirm' : 'Notice');
  const message = activeDialog?.options.message || '';
  const tone = activeDialog?.options.tone || 'info';

  return (
    <>
      {children}
      {activeDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className={`w-full max-w-md rounded-xl border shadow-2xl ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className={`border-b px-6 py-4 rounded-t-xl ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
            </div>
            
            <div className="px-6 py-5">
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{message}</p>
            </div>

            <div className={`flex justify-end rounded-b-xl gap-3 border-t px-6 py-4 ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
              {activeDialog.kind === 'confirm' && (
                <button
                  type="button"
                  onClick={() => closeConfirm(false)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${darkMode ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                >
                  {activeDialog.options.cancelText || 'Cancel'}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (activeDialog.kind === 'confirm') {
                    closeConfirm(true);
                    return;
                  }

                  closeAlert();
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${getToneButtonClass(tone)}`}
              >
                {activeDialog.kind === 'confirm'
                  ? activeDialog.options.confirmText || 'Confirm'
                  : activeDialog.options.buttonText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}