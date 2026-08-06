import { toast, type ToastOptions } from 'react-toastify';

const defaults: ToastOptions = {
  position: 'top-center',
  autoClose: 2500,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: false,
  draggable: false,
  closeButton: false,
};

function notify(
  type: 'success' | 'error' | 'info',
  message: string,
  options?: ToastOptions,
) {
  const text = String(message || '').trim();
  if (!text) return;

  toast.dismiss();
  toast[type](text, { ...defaults, ...options });
}

export function toastSuccess(message: string, options?: ToastOptions) {
  notify('success', message, options);
}

export function toastError(message: string, options?: ToastOptions) {
  notify('error', message, options);
}

export function toastInfo(message: string, options?: ToastOptions) {
  notify('info', message, options);
}
