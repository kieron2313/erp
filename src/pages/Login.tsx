import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../components/AuthProvider.tsx';

export default function Login() {
  const { login, user, loading, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const activeError = authError || error;

  const handleLogin = async () => {
    setError(null);
    clearAuthError();
    setIsLoggingIn(true);
    try {
      await login();
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 px-4 font-sans text-slate-900">
      <div className="max-w-md w-full text-center space-y-8 bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-200/60">
        <div>
          <div className="w-16 h-16 mx-auto bg-indigo-600 shadow-lg shadow-indigo-600/20 rounded-2xl flex items-center justify-center font-bold text-3xl text-white mb-6">E</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Equinox ERP</h1>
          <p className="mt-3 text-slate-500 text-sm">Sign in to manage your business operations.</p>
        </div>
        
        {activeError && (
          <div className="p-4 bg-rose-50 border border-rose-200/80 text-rose-700 rounded-2xl text-sm text-left">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-800">
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Access Restricted
            </div>
            <p className="text-xs text-rose-600 leading-relaxed">{activeError}</p>
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center py-3.5 px-4 rounded-2xl border border-slate-200/80 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-sm"
        >
          <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" alt="Google" className="w-5 h-5 mr-3"/>
          {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}
