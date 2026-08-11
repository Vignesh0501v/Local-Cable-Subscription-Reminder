import { Route, Routes } from 'react-router-dom'
import PaymentPage from './pages/PaymentPage'
import NotFound from './pages/NotFound'
import Home from './pages/Home'
import Login from './pages/Login'
import RequireRole from './auth/RequireRole'
import CollectorLayout from './pages/collector/Layout'
import CollectorDashboard from './pages/collector/Dashboard'
import PendingPayments from './pages/collector/PendingPayments'
import CashCollection from './pages/collector/CashCollection'
import OperatorLayout from './pages/operator/Layout'
import OperatorDashboard from './pages/operator/Dashboard'
import OperatorQueue from './pages/operator/Queue'
import AdminLayout from './pages/admin/Layout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminCustomers from './pages/admin/Customers'
import AdminPlans from './pages/admin/Plans'
import AdminSettings from './pages/admin/Settings'
import StaffManagement from './pages/admin/StaffManagement'
import AdminNotifications from './pages/admin/Notifications'
import AdminReports from './pages/admin/Reports'
import AdminAuditLog from './pages/admin/AuditLog'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pay/:token" element={<PaymentPage />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/collector"
        element={
          <RequireRole role="collector">
            <CollectorLayout />
          </RequireRole>
        }
      >
        <Route index element={<CollectorDashboard />} />
        <Route path="pending" element={<PendingPayments />} />
        <Route path="cash" element={<CashCollection />} />
      </Route>

      <Route
        path="/operator"
        element={
          <RequireRole role="operator">
            <OperatorLayout />
          </RequireRole>
        }
      >
        <Route index element={<OperatorDashboard />} />
        <Route path="queue" element={<OperatorQueue />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="collectors" element={<StaffManagement role="collector" />} />
        <Route path="operators" element={<StaffManagement role="operator" />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="audit-log" element={<AdminAuditLog />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
