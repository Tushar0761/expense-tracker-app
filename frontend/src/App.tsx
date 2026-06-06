import { Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import Navbar from './components/layout/Navbar';
import NotFound from './pages/NotFound';
import { Categories } from './pages/categories/Categories';
import { DataClinic } from './pages/clinic/DataClinic';
import { Dashboard } from './pages/dashboard/Dashboard';
import { DuplicateExpenses } from './pages/expenses/DuplicateExpenses';
import { Expenses } from './pages/expenses/Expenses';
import { RefineExpenses } from './pages/expenses/RefineExpenses';
import { LoansPage } from './pages/loans/LoansPage';
import Accounts from './pages/Accounts';
import { Toaster } from 'sonner';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 px-3 py-4 md:px-6 md:py-6 w-full page-enter pb-20 md:pb-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/duplicates" element={<DuplicateExpenses />} />
          <Route path="/refine" element={<RefineExpenses />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/clinic" element={<DataClinic />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default App;
