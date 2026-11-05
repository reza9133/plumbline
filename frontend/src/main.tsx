import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/Toast';
import { WalletProvider } from './wallet/WalletProvider';
import { TxProvider } from './tx/TxProvider';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 8_000, retry: 1, refetchOnWindowFocus: true } },
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
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
  </StrictMode>,
);
