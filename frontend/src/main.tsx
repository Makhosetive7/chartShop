import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth';
import { ThemeModeProvider } from '@/theme';
import { GlobalStyles } from '@/styles/GlobalStyles';
import { AppToaster } from '@/components/ui/AppToaster';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeModeProvider>
          <GlobalStyles />
          <App />
          <AppToaster />
        </ThemeModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
