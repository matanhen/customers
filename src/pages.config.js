import Home from './pages/Home';
import AdvisorDashboard from './pages/AdvisorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import FinancialManagement from './pages/FinancialManagement';
import Investments from './pages/Investments';
import FinancialFreedom from './pages/FinancialFreedom';


export const PAGES = {
    "Home": Home,
    "AdvisorDashboard": AdvisorDashboard,
    "AdminDashboard": AdminDashboard,
    "FinancialManagement": FinancialManagement,
    "Investments": Investments,
    "FinancialFreedom": FinancialFreedom,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};