import { useState } from 'react';
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { getApiErrorMessage, heritageApi, isCuratorAuthenticated } from '../services/api';


const CuratorLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isCuratorAuthenticated()) {
    return <Navigate to={location.state?.from || '/digitize'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await heritageApi.loginCurator(password);
      navigate(location.state?.from || '/digitize', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Curator sign-in failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-parchment px-4 py-16">
      <div className="mx-auto max-w-md rounded-3xl border border-gold/25 bg-white p-8 shadow-soft">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-maroon text-white">
          <ShieldCheck size={24} />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-maroon">Protected workspace</p>
        <h1 className="mb-3 font-serif text-3xl font-bold text-charcoal">Curator sign in</h1>
        <p className="mb-7 text-sm leading-relaxed text-charcoal/65">
          Browsing remains public. A curator session is required to upload, review, edit, or delete archive records.
        </p>
        {error && <div className="mb-4 rounded-xl border border-vermillion/25 bg-vermillion/10 p-3 text-sm text-vermillion-dark">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-semibold text-charcoal">
            Curator password
            <span className="relative mt-2 block">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" size={17} />
              <input
                type="password" autoComplete="current-password" required value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-parchment-dark/50 bg-parchment/25 py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-maroon"
              />
            </span>
          </label>
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-maroon px-5 py-3 text-sm font-semibold text-white hover:bg-maroon-dark disabled:opacity-60">
            <LogIn size={17} /> {submitting ? 'Signing in…' : 'Enter curator workspace'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CuratorLoginPage;
