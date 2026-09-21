import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RoleProvider } from '@/lib/roles';
import AppLayout from '@/components/AppLayout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ClientPortal from './pages/ClientPortal';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import StyleAssist from './pages/StyleAssist';
import Orders from './pages/Orders';
import QuickQuote from './pages/QuickQuote';
import ProductionBoard from './pages/ProductionBoard';
import Fittings from './pages/Fittings';
import NewOrder from './pages/NewOrder';
import OrderDetail from './pages/OrderDetail';
import MyTasks from './pages/MyTasks';
import AccraRuns from './pages/AccraRuns';
import AccraRunDetail from './pages/AccraRunDetail';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import Freelancers from './pages/Freelancers';
import Portfolio from './pages/Portfolio';
import BusinessHistory from './pages/BusinessHistory';
import TrainingLog from './pages/TrainingLog';
import MyTrainees from './pages/MyTrainees';
import MyProgress from './pages/MyProgress';
import Settings from './pages/Settings';
import AboutSewsiness from './pages/AboutSewsiness';
import DataHandoff from './pages/DataHandoff';
import Policies from './pages/Policies';
import StockLedger from './pages/StockLedger';
import Contacts from './pages/Contacts';
import AssistedCalls from './pages/AssistedCalls';
import Team from './pages/Team';
import SOPs from './pages/SOPs';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/portal/:token" element={<ClientPortal />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerProfile />} />
          <Route path="/customers/:id/style-assist" element={<StyleAssist />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/new" element={<NewOrder />} />
          <Route path="/quick-quote" element={<QuickQuote />} />
          <Route path="/board" element={<ProductionBoard />} />
          <Route path="/fittings" element={<Fittings />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/tasks" element={<MyTasks />} />
          <Route path="/accra-runs" element={<AccraRuns />} />
          <Route path="/accra-runs/:id" element={<AccraRunDetail />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
          <Route path="/freelancers" element={<Freelancers />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/history" element={<BusinessHistory />} />
          <Route path="/training-log" element={<TrainingLog />} />
          <Route path="/trainees" element={<MyTrainees />} />
          <Route path="/my-progress" element={<MyProgress />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/assisted-calls" element={<AssistedCalls />} />
          <Route path="/team" element={<Team />} />
          <Route path="/sops" element={<SOPs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<AboutSewsiness />} />
          <Route path="/data" element={<DataHandoff />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/stock" element={<StockLedger />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <RoleProvider>
            <ScrollToTop />
            <AuthenticatedApp />
          </RoleProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App