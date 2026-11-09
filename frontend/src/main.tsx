import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/Toast';
import { WalletProvider } from './wallet/WalletProvider';
import { TxProvider } from './tx/TxProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { reloadOnce } from './lib/lazyRetry';
import './index.css';

// Vite fires this when a preloaded chunk 404s (typically after a redeploy): fetch the new index.html once.
window.addEventListener('vite:preloadError', (e) => {
  if (reloadOnce()) e.preventDefault();
});

const queryClient = new QueryClient({
  defaultOptions: { queries: {
      staleTime: 8_000,
      // The RPC is a different host from the site and can be slow to answer; try a few times before showing an error.
      retry: 3,
      retryDelay: (attempt: number) => Math.min(1_000 * 2 ** attempt, 6_000),
      refetchOnWindowFocus: true,
    } },
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <WalletProvider>
                <TxProvider>
                  <App />
                </TxProvider>
              </WalletProvider>
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
