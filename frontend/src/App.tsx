import { Route, Routes } from "react-router-dom";
import "./App.css";
import Navbar from "./components/layout/Navbar";
import NotFound from "./pages/NotFound";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { Expenses } from "./pages/expenses/Expenses";
import { LoansPage } from "./pages/loans/LoansPage";

function App() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
            <Navbar />
            <main className="flex-1 p-4">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/loans" element={<LoansPage />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;
