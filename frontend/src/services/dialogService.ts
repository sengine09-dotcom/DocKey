export type DialogTone = 'info' | 'success' | 'warning' | 'danger';

export type AlertDialogOptions = {
  title?: string;
  message: string;
  buttonText?: string;
  tone?: DialogTone;
};

export type ConfirmDialogOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
};

type DialogHandlers = {
  alert: (options: AlertDialogOptions) => Promise<void>;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
};

let dialogHandlers: DialogHandlers | null = null;

const normalizeAlertOptions = (input: string | AlertDialogOptions): AlertDialogOptions => {
  if (typeof input === 'string') {
    return { message: input };
  }

  return input;
};

const normalizeConfirmOptions = (input: string | ConfirmDialogOptions): ConfirmDialogOptions => {
  if (typeof input === 'string') {
    return { message: input };
  }

  return input;
};

export const registerDialogHandlers = (handlers: DialogHandlers) => {
  dialogHandlers = handlers;

  return () => {
    if (dialogHandlers === handlers) {
      dialogHandlers = null;
    }
  };
};

export const showAppAlert = async (input: string | AlertDialogOptions) => {
  const options = normalizeAlertOptions(input);

  if (dialogHandlers) {
    await dialogHandlers.alert(options);
    return;
  }

  console.warn('Dialog handlers are not registered yet:', options.message);
};

export const showAppConfirm = async (input: string | ConfirmDialogOptions) => {
  const options = normalizeConfirmOptions(input);

  if (dialogHandlers) {
    return dialogHandlers.confirm(options);
  }

  console.warn('Dialog handlers are not registered yet:', options.message);
  return false;
};