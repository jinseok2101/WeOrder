import React from 'react';
import ReactDOM from 'react-dom/client';
import * as ReactDOMServer from 'react-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// React 18.2 이하 버전에서 react-naver-maps 0.2.0(최신)을 돌릴 때 발생하는 preconnect 누락 버그(에러) 방어막
// @ts-ignore
if (!ReactDOM.preconnect) ReactDOM.preconnect = () => {};
// @ts-ignore
if (!ReactDOMServer.preconnect) ReactDOMServer.preconnect = () => {};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
