import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";

const Navbar = () => {
    const navigate = useNavigate();
    const [isDark, setIsDark] = useState(() =>
        document.documentElement.classList.contains("dark")
    );

    const toggleDark = () => {
        document.documentElement.classList.toggle("dark");
        setIsDark(document.documentElement.classList.contains("dark"));
    };

    return (
        <nav className="flex items-center justify-between py-4 px-8 shadow-md bg-white dark:bg-gray-900">
            <div
                className="text-2xl font-bold text-primary"
                onClick={() => navigate("/")}
            >
                Expense Tracker
            </div>
            <div className="flex gap-4 items-center">
                <Link to="/">
                    <Button variant="ghost">Dashboard</Button>
                </Link>
                <Link to="/expenses">
                    <Button variant="ghost">Expenses</Button>
                </Link>{" "}
                <Link to="/loans">
                    <Button variant="ghost">Loans</Button>
                </Link>
                <Link to="/login">
                    <Button>Login</Button>
                </Link>
                <Button
                    variant="outline"
                    onClick={toggleDark}
                    aria-label="Toggle dark mode"
                    className="ml-2"
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </Button>
            </div>
        </nav>
    );
};

export default Navbar;
