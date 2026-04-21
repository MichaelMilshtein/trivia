import { NavLink } from 'react-router-dom'
import { navItems } from '../lib/navigation'

function NavBar() {
  return (
    <header className="site-header">
      <h1>Trivia Sandbox</h1>
      <nav>
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
    </header>
  )
}

export default NavBar
