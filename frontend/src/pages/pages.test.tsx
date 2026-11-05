import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test/utils';
import { setDemo } from '../chain/client';
import { Layout } from '../components/Layout';
import Home from './Home';
import Covenants from './Covenants';
import CovenantDetail from './CovenantDetail';
import Create from './Create';
import Inspect from './Inspect';
import Ledger from './Ledger';
import Tools from './Tools';
import About from './About';
import Docs from './docs/Docs';
import NotFound from './NotFound';
import { DOCS } from './docs/registry';

function Shell() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="covenants" element={<Covenants />} />
        <Route path="covenants/:id" element={<CovenantDetail />} />
        <Route path="create" element={<Create />} />
        <Route path="inspect" element={<Inspect />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="tools" element={<Tools />} />
        <Route path="about" element={<About />} />
        <Route path="docs/:slug" element={<Docs />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

beforeEach(() => setDemo(true));
afterEach(() => setDemo(false));

describe('pages render with demo data', () => {
  it('home shows the hero, the demo banner and live totals', async () => {
    renderApp(<Shell />, '/');
    expect(await screen.findByRole('heading', { level: 1, name: /bond behind/i })).toBeInTheDocument();
    expect(screen.getByTestId('demo-banner')).toBeInTheDocument();
    expect(await screen.findByText('Bonds locked')).toBeInTheDocument();
  });

  it('registry lists the sample covenants and filters by state', async () => {
    const user = userEvent.setup();
    renderApp(<Shell />, '/covenants');
    expect(await screen.findAllByTestId('covenant-card')).toHaveLength(8);
    await user.click(screen.getByRole('tab', { name: /warned/i }));
    await waitFor(() => expect(screen.getAllByTestId('covenant-card')).toHaveLength(2));
    await user.type(screen.getByLabelText('Search covenants'), 'canary');
    await waitFor(() => expect(screen.getAllByTestId('covenant-card')).toHaveLength(1));
  });

  it('detail page shows tenets, readings and state-appropriate actions', async () => {
    renderApp(<Shell />, '/covenants/2');
    expect(await screen.findByRole('heading', { level: 1, name: /Security contact/i })).toBeInTheDocument();
    expect(await screen.findByText('A warning is open')).toBeInTheDocument();
    expect(screen.getByText(/anchor:1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inspect the page now/i })).toBeInTheDocument();
    expect(screen.getByText(/Connect a wallet to act/i)).toBeInTheDocument();
  });

  it('detail page rejects a bad id politely', async () => {
    renderApp(<Shell />, '/covenants/abc');
    expect(await screen.findByText(/not a covenant number/i)).toBeInTheDocument();
  });

  it('inspector desk puts a warning that can be confirmed first', async () => {
    renderApp(<Shell />, '/inspect');
    const rows = await screen.findAllByTestId('inspect-row');
    expect(rows[0]).toHaveTextContent(/confirm the warning/i);
  });

  it('ledger says the books are balanced', async () => {
    renderApp(<Shell />, '/ledger');
    expect(await screen.findByText('Balanced')).toBeInTheDocument();
  });

  it('tools run the contract rules in the browser', async () => {
    renderApp(<Shell />, '/tools');
    expect(await screen.findByText(/Same page: you could not hold/i)).toBeInTheDocument();
    expect(screen.getByText(/Matches the tripwire/i)).toBeInTheDocument();
  });

  it('about and 404 render', async () => {
    renderApp(<Shell />, '/about');
    expect(await screen.findByRole('heading', { level: 1, name: 'Plumbline' })).toBeInTheDocument();
    renderApp(<Shell />, '/nothing-here');
    expect(await screen.findByText(/not straight/i)).toBeInTheDocument();
  });
});

describe('create wizard', () => {
  it('walks through the steps and blocks bad input', async () => {
    const user = userEvent.setup();
    renderApp(<Shell />, '/create');
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findByText(/title needs 3 to 60/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('We never sell personal data'), 'Never sell data');
    await user.type(screen.getByPlaceholderText('https://example.org/promise'), 'http://localhost/x');
    await user.type(screen.getByPlaceholderText('0x…'), '0x' + '2'.repeat(40));
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findByText(/public http\(s\) link/i)).toBeInTheDocument();
  });
});

describe('every documentation page renders', () => {
  it.each(DOCS.map((d) => d.slug))('%s', async (slug) => {
    renderApp(<Shell />, `/docs/${slug}`);
    const doc = DOCS.find((d) => d.slug === slug);
    expect(await screen.findByRole('heading', { level: 1, name: doc?.title })).toBeInTheDocument();
    expect(screen.getByTestId('doc-body').textContent?.length).toBeGreaterThan(200);
  });
});
