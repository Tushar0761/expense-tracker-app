import {
  Activity,
  CircleDollarSign,
  Copy,
  FolderTree,
  Handshake,
  LayoutDashboard,
  Moon,
  Stethoscope,
  Sun,
  Tags,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/expenses',   label: 'Expenses',    icon: CircleDollarSign },
  { to: '/duplicates', label: 'Duplicates',  icon: Copy },
  { to: '/refine',     label: 'Refine',      icon: Tags },
  { to: '/categories', label: 'Categories',  icon: FolderTree },
  { to: '/loans',      label: 'Loans',       icon: Handshake },
  { to: '/accounts',   label: 'Accounts',    icon: Wallet },
  { to: '/clinic',     label: 'Clinic',      icon: Stethoscope },
];

const Navbar = () => {
  const location = useLocation();
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(document.documentElement.classList.contains('dark'));
  };

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/95 backdrop-blur-md">
      <div className="w-full px-6 flex items-center justify-between h-14 gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 select-none group">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-150">
            <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base tracking-tight gradient-text">
            ExpenseTracker
          </span>
        </Link>

        {/* Nav links — stretched evenly across remaining space */}
        <div className="flex items-center flex-1 justify-center gap-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`nav-link ${active ? 'active' : ''}`}
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className="text-[13.5px]">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-150"
          >
            {isDark
              ? <Sun size={16} strokeWidth={2} />
              : <Moon size={16} strokeWidth={2} />
            }
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
