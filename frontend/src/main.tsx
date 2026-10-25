import './index.css'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { loadPortfolio } from '@/lib/api'

// Both pages need the portfolio: fetch it in parallel with the page chunk instead of after it.
loadPortfolio().catch(() => {})

// shortcut: pathname/hostname switch instead of a router, fine for 2 pages; add react-router if pages grow.
const isAdmin = location.pathname.startsWith('/admin') || location.hostname.startsWith('admin.')
const Page = lazy(() => (isAdmin ? import('./pages/admin/Admin') : import('./pages/Landing')))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense>
      <Page />
    </Suspense>
  </StrictMode>,
)
