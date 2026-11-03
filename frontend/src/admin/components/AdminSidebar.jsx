import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import PermissionGate from './PermissionGate';
import { useAuth } from '../../context/AuthContext';
import { IconBook, IconDashboard, IconUsers, IconArrowLeft, IconArrowRight, IconMessage } from '../../components/Icons';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: IconDashboard, label: 'Dashboard',  perm: 'view_dashboard' },
  { to: '/admin/chapters',  icon: IconBook,      label: 'Chapters',   perm: 'manage_chapters' },
  { to: '/admin/users',     icon: IconUsers,     label: 'Users',      perm: 'manage_users' },
  { to: '/admin/feedbacks', icon: IconMessage,   label: 'Feedbacks',  perm: 'view_dashboard' },
];

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { admin } = useAuth();

  return (
    <aside className={`admin-sidebar${collapsed ? ' collapsed' : ''}`} aria-label="Admin navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <span className="sidebar-logo__icon">
          <IconBook size={24} color="var(--accent)" />
        </span>
        <span className="sidebar-logo__text">ReadVerse</span>
      </div>

      {/* Collapse toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? <IconArrowRight size={14} /> : <IconArrowLeft size={14} />}
      </button>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return admin?.is_super_admin ? (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-nav__item${isActive ? ' active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-nav__icon"><Icon size={18} /></span>
              <span className="sidebar-nav__label">{item.label}</span>
            </NavLink>
          ) : (
            <PermissionGate key={item.to} perm={item.perm}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-nav__item${isActive ? ' active' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar-nav__icon"><Icon size={18} /></span>
                <span className="sidebar-nav__label">{item.label}</span>
              </NavLink>
            </PermissionGate>
          );
        })}
      </nav>

      {/* Footer — admin name */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>
              {admin?.name}
            </div>
            {admin?.is_super_admin && (
              <span className="topbar-admin-badge">Super Admin</span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
