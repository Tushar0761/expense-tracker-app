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
        <nav className="flex items-center justify-between py-2 px-6 sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div
                className="text-lg font-bold tracking-tight text-primary cursor-pointer"
                onClick={() => navigate("/")}
            >
                ExpenseTracker
            </div>
            <div className="flex gap-1 items-center">
                <Link to="/">
                    <Button variant="ghost" size="sm" className="h-8 text-xs">Dashboard</Button>
                </Link>
                <Link to="/expenses">
                    <Button variant="ghost" size="sm" className="h-8 text-xs">Expenses</Button>
                </Link>
                <Link to="/categories">
                    <Button variant="ghost" size="sm" className="h-8 text-xs">Categories</Button>
                </Link>
                <Link to="/loans">
                    <Button variant="ghost" size="sm" className="h-8 text-xs">Loans</Button>
                </Link>
                <Link to="/accounts">
                    <Button variant="ghost" size="sm" className="h-8 text-xs">Accounts</Button>
                </Link>
                <div className="w-px h-4 bg-border mx-2" />
                <Link to="/login">
                    <Button size="sm" className="h-8 text-xs px-4">Login</Button>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDark}
                    aria-label="Toggle dark mode"
                    className="h-8 w-8 ml-1"
                >
                    {isDark ? <Sun size={14} /> : <Moon size={14} />}
                </Button>
            </div>
        </nav>
    );
};

export default Navbar;
