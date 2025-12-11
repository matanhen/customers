import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import AdvisorDashboard from './pages/AdvisorDashboard';
import FinancialFreedom from './pages/FinancialFreedom';
import FinancialManagement from './pages/FinancialManagement';
import Investments from './pages/Investments';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "AdminDashboard": AdminDashboard,
    "AdvisorDashboard": AdvisorDashboard,
    "FinancialFreedom": FinancialFreedom,
    "FinancialManagement": FinancialManagement,
    "Investments": Investments,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};