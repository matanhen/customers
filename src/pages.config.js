import AdminDashboard from './pages/AdminDashboard';
import AdvisorDashboard from './pages/AdvisorDashboard';
import FinancialFreedom from './pages/FinancialFreedom';
import FinancialManagement from './pages/FinancialManagement';
import Home from './pages/Home';
import Investments from './pages/Investments';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AdvisorDashboard": AdvisorDashboard,
    "FinancialFreedom": FinancialFreedom,
    "FinancialManagement": FinancialManagement,
    "Home": Home,
    "Investments": Investments,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};