import { Link } from 'react-router-dom';
import { MochiFull } from '../components/Mochi';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center">
      <div className="w-40">
        <MochiFull />
      </div>
      <p className="eyebrow mt-6">Error 404</p>
      <h1 className="mt-2 text-4xl font-semibold">This wall is not straight</h1>
      <p className="mt-3 max-w-md text-muted">There is nothing at this address. Mochi looked everywhere.</p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-primary">
          Back home
        </Link>
        <Link to="/covenants" className="btn">
          Browse covenants
        </Link>
      </div>
    </div>
  );
}
