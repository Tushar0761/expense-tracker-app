import {
  Activity,
  CircleDollarSign,
  Copy,
  FolderTree,
  Handshake,
  LayoutDashboard,
  Menu,
  Moon,
  Stethoscope,
  Sun,
  Tags,
  Wallet,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const PRIMARY_NAV = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expenses', label: 'Expenses',  icon: CircleDollarSign },
  { to: '/loans',    label: 'Loans',     icon: Handshake },
  { to: '/accounts', label: 'Accounts',  icon: Wallet },
];

const ALL_NAV = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/expenses',   label: 'Expenses',   icon: CircleDollarSign },
  { to: '/duplicates', label: 'Duplicates', icon: Copy },
  { to: '/refine',     label: 'Refine',     icon: Tags },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/loans',      label: 'Loans',      icon: Handshake },
  { to: '/accounts',   label: 'Accounts',   icon: Wallet },
  { to: '/clinic',     label: 'Clinic',     icon: Stethoscope },
];

const Navbar = () => {
  const location = useLocation();
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(document.documentElement.classList.contains('dark'));
  };

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      {/* ── Desktop top navbar ── */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/95 backdrop-blur-md hidden md:block">
        <div className="w-full px-6 flex items-center justify-between h-14 gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 select-none group">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-150">
              <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base tracking-tight gradient-text">
              ExpenseTracker
            </span>
          </Link>

          <div className="flex items-center flex-1 justify-center gap-0.5">
            {ALL_NAV.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link key={to} to={to} className={`nav-link ${active ? 'active' : ''}`}>
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[13.5px]">{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleDark}
              aria-label="Toggle dark mode"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-150"
            >
              {isDark ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/95 backdrop-blur-md flex md:hidden items-center justify-between h-12 px-4">
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm tracking-tight gradient-text">ExpenseTracker</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* ── Mobile slide-out drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative ml-auto w-64 h-full bg-card border-l border-border/60 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 h-12 border-b border-border/40 shrink-0">
              <span className="font-semibold text-sm">Menu</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <nav className="flex-1 py-2 overflow-y-auto">
              {ALL_NAV.map(({ to, label, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? 'text-primary bg-primary/8'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/60 flex md:hidden safe-bottom">
        {PRIMARY_NAV.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`}
                strokeWidth={active ? 2.5 : 2}
              />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
          More
        </button>
      </nav>
    </>
  );
};

export default Navbar;
