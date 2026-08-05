import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { DemoUpgradeProvider } from '@/components/demo/DemoUpgradeProvider';
import { DemoTourProvider } from '@/components/demo/DemoTour';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { RecoverPage } from '@/pages/RecoverPage';
import { ChatPage } from '@/pages/ChatPage';
import { ActivityPage } from '@/pages/ActivityPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { SalesPage } from '@/pages/SalesPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <DemoUpgradeProvider>
        <DemoTourProvider>
          <Routes>
            <Route element={<MarketingLayout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="recover" element={<RecoverPage />} />
            </Route>

            <Route path="app" element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<ChatPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DemoTourProvider>
      </DemoUpgradeProvider>
    </BrowserRouter>
  );
}

export default App;
