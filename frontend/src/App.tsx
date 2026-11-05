import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';

const Home = lazy(() => import('./pages/Home'));
const Covenants = lazy(() => import('./pages/Covenants'));
const CovenantDetail = lazy(() => import('./pages/CovenantDetail'));
const Create = lazy(() => import('./pages/Create'));
const Inspect = lazy(() => import('./pages/Inspect'));
const Ledger = lazy(() => import('./pages/Ledger'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tools = lazy(() => import('./pages/Tools'));
const About = lazy(() => import('./pages/About'));
const Docs = lazy(() => import('./pages/docs/Docs'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
