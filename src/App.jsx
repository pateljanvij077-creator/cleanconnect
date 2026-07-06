import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAppStore } from './store/appStore'
import { AnimatePresence } from 'framer-motion'

// Splash & Auth
import SplashScreen from './pages/splash/SplashScreen'
import AuthPage from './pages/auth/AuthPage'
import RoleSelection from './pages/auth/RoleSelection'
import HomeOwnerSignup from './pages/auth/HomeOwnerSignup'
import WorkerSignup from './pages/auth/WorkerSignup'
import DocumentUpload from './pages/auth/DocumentUpload'

// Route guards
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'
import WorkerRoute from './routes/WorkerRoute'
import HomeOwnerRoute from './routes/HomeOwnerRoute'

// HomeOwner pages
import HODashboard from './pages/homeowner/Dashboard'
import WorkerDetail from './pages/homeowner/WorkerDetail'
import BookingScreen from './pages/homeowner/BookingScreen'
import BookingHistory from './pages/homeowner/BookingHistory'
import Favourites from './pages/homeowner/Favourites'
import HOProfile from './pages/homeowner/Profile'

// Worker pages
import WorkerDashboard from './pages/worker/Dashboard'
import BookingRequests from './pages/worker/BookingRequests'
import UpcomingJobs from './pages/worker/UpcomingJobs'
import WorkerProfile from './pages/worker/Profile'
import EditProfile from './pages/worker/EditProfile'
import Subscription from './pages/worker/Subscription'
import Payment from './pages/worker/Payment'

// Shared pages
import Notifications from './pages/shared/Notifications'
import Settings from './pages/shared/Settings'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import UserManagement from './pages/admin/UserManagement'
import WorkerManagement from './pages/admin/WorkerManagement'
import HomeOwnerManagement from './pages/admin/HomeOwnerManagement'
import SubscriptionManagement from './pages/admin/SubscriptionManagement'
import PaymentManagement from './pages/admin/PaymentManagement'
import LocationManagement from './pages/admin/LocationManagement'
import ComplaintManagement from './pages/admin/ComplaintManagement'
import NotificationManagement from './pages/admin/NotificationManagement'
import SystemSettings from './pages/admin/SystemSettings'
import BookingManagement from './pages/admin/BookingManagement'
import ServiceCategoryManagement from './pages/admin/ServiceCategoryManagement'
import ReviewManagement from './pages/admin/ReviewManagement'
import RolesPermissionsManagement from './pages/admin/RolesPermissionsManagement'
import BackupRetentionManagement from './pages/admin/BackupRetentionManagement'

// Error pages
import NotFound from './pages/errors/NotFound'

import './styles/globals.css'

function App() {
  const { theme } = useAppStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#f1f5f9',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<SplashScreen />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/select-role" element={<RoleSelection />} />
        <Route path="/auth/homeowner-signup" element={<HomeOwnerSignup />} />
        <Route path="/auth/worker-signup" element={<WorkerSignup />} />
        <Route path="/auth/documents" element={<DocumentUpload />} />

        {/* Home Owner Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<HomeOwnerRoute />}>
            <Route path="/homeowner/dashboard" element={<HODashboard />} />
            <Route path="/homeowner/worker/:workerId" element={<WorkerDetail />} />
            <Route path="/homeowner/book/:workerId" element={<BookingScreen />} />
            <Route path="/homeowner/bookings" element={<BookingHistory />} />
            <Route path="/homeowner/favourites" element={<Favourites />} />
            <Route path="/homeowner/profile" element={<HOProfile />} />
            <Route path="/homeowner/notifications" element={<Notifications />} />
            <Route path="/homeowner/settings" element={<Settings />} />
          </Route>

          {/* Worker Routes */}
          <Route element={<WorkerRoute />}>
            <Route path="/worker/dashboard" element={<WorkerDashboard />} />
            <Route path="/worker/requests" element={<BookingRequests />} />
            <Route path="/worker/upcoming" element={<UpcomingJobs />} />
            <Route path="/worker/profile" element={<WorkerProfile />} />
            <Route path="/worker/edit-profile" element={<EditProfile />} />
            <Route path="/worker/subscription" element={<Subscription />} />
            <Route path="/worker/payment" element={<Payment />} />
            <Route path="/worker/notifications" element={<Notifications />} />
            <Route path="/worker/settings" element={<Settings />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/workers" element={<WorkerManagement />} />
            <Route path="/admin/homeowners" element={<HomeOwnerManagement />} />
            <Route path="/admin/bookings" element={<BookingManagement />} />
            <Route path="/admin/subscriptions" element={<SubscriptionManagement />} />
            <Route path="/admin/payments" element={<PaymentManagement />} />
            <Route path="/admin/locations" element={<LocationManagement />} />
            <Route path="/admin/services" element={<ServiceCategoryManagement />} />
            <Route path="/admin/reviews" element={<ReviewManagement />} />
            <Route path="/admin/complaints" element={<ComplaintManagement />} />
            <Route path="/admin/notifications" element={<NotificationManagement />} />
            <Route path="/admin/roles-permissions" element={<RolesPermissionsManagement />} />
            <Route path="/admin/backup-retention" element={<BackupRetentionManagement />} />
            <Route path="/admin/settings" element={<SystemSettings />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
