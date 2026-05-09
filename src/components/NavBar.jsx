import { NavLink, useLocation } from 'react-router-dom'
import { navItems } from '../lib/navigation'

function NavBar() {
  const location = useLocation()
  const isAdminPage = location.pathname === '/admin'
  const isGamePage = location.pathname === '/game'

  return (
    <header className={isAdminPage ? 'site-header' : isGamePage ? 'site-header site-header-game' : 'site-header site-header-public'}>
      <div className="site-brand">
        {!isAdminPage ? (
          <img
            className="site-brand-mascot"
            src="/images/brand/lenny-lenski-peek.png"
            alt="Lenny Lenski"
          />
        ) : null}
        <h1>{isAdminPage ? 'Trivia Sandbox' : 'Nostalgic Decades Trivia'}</h1>
      </div>
      {navItems.length ? (
        <nav aria-label="Primary navigation">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    isActive ? 'nav-link nav-link-active' : 'nav-link'
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  )
}

export default NavBar
