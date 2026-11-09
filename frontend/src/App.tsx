import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { lazyRetry } from './lib/lazyRetry';

const Home = lazyRetry(() => import('./pages/Home'));
const Covenants = lazyRetry(() => import('./pages/Covenants'));
const CovenantDetail = lazyRetry(() => import('./pages/CovenantDetail'));
const Create = lazyRetry(() => import('./pages/Create'));
const Inspect = lazyRetry(() => import('./pages/Inspect'));
const Ledger = lazyRetry(() => import('./pages/Ledger'));
const Dashboard = lazyRetry(() => import('./pages/Dashboard'));
const Tools = lazyRetry(() => import('./pages/Tools'));
const About = lazyRetry(() => import('./pages/About'));
const Docs = lazyRetry(() => import('./pages/docs/Docs'));
const NotFound = lazyRetry(() => import('./pages/NotFound'));

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="covenants" element={<Covenants />} />
        <Route path="covenants/:id" element={<CovenantDetail />} />
        <Route path="create" element={<Create />} />
        <Route path="inspect" element={<Inspect />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tools" element={<Tools />} />
        <Route path="about" element={<About />} />
        <Route path="docs" element={<Docs />} />
        <Route path="docs/:slug" element={<Docs />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
