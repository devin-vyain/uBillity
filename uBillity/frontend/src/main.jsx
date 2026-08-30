import React from 'react';
import ReactDOM from 'react-dom/client';
import BillApp from './uBillity';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BillApp />
    </AuthProvider>
  </React.StrictMode>
);