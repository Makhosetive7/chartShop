import { ToastContainer } from 'react-toastify';
import { createGlobalStyle } from 'styled-components';
import 'react-toastify/dist/ReactToastify.css';

const ToastStyles = createGlobalStyle`
  .Toastify__toast-container--top-center {
    top: 16px;
    width: min(420px, calc(100vw - 24px));
    padding: 0;
  }

  .Toastify__toast {
    border-radius: 0;
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: 0.92rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    box-shadow: ${({ theme }) => theme.shadows.float};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-left-width: 4px;
    min-height: 0;
    padding: 14px 16px;
    background: ${({ theme }) => theme.colors.cream};
    color: ${({ theme }) => theme.colors.maroon};
  }

  .Toastify__toast-body {
    margin: 0;
    padding: 0;
    line-height: 1.45;
    color: inherit;
  }

  /* Positive feedback — brand maroon on cream */
  .Toastify__toast--success {
    background: ${({ theme }) => theme.colors.cream};
    border-color: ${({ theme }) => theme.colors.border};
    border-left-color: ${({ theme }) => theme.colors.maroon};
    color: ${({ theme }) => theme.colors.maroon};
  }

  /* Errors — coral accent, still on cream */
  .Toastify__toast--error {
    background: ${({ theme }) => theme.colors.peachSoft};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    border-left-color: ${({ theme }) => theme.colors.coral};
    color: ${({ theme }) => theme.colors.maroonDeep};
  }

  /* Neutral / info — soft peach, maroon text */
  .Toastify__toast--info {
    background: ${({ theme }) => theme.colors.peachSoft};
    border-color: ${({ theme }) => theme.colors.border};
    border-left-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.maroon};
  }

  .Toastify__toast-icon {
    display: none;
  }
`;

export function AppToaster() {
  return (
    <>
      <ToastStyles />
      <ToastContainer
        position="top-center"
        autoClose={2500}
        limit={1}
        newestOnTop
        closeOnClick
        hideProgressBar
        pauseOnHover={false}
        draggable={false}
        closeButton={false}
        theme="light"
      />
    </>
  );
}
