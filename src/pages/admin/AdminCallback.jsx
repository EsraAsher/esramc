import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminVerify } from '../../api';

const AdminCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate('/adminishere', { replace: true });
      return;
    }

    if (!token) {
      navigate('/adminishere', { replace: true });
      return;
    }

    (async () => {
      try {
        localStorage.setItem('admin_token', token);
        const data = await adminVerify();
        login(token, data.admin);
        navigate('/adminishere', { replace: true });
      } catch {
        localStorage.removeItem('admin_token');
        navigate('/adminishere', { replace: true });
      }
    })();
  }, [searchParams, navigate, login]);

  return (
    <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-400 text-sm">Authenticating admin…</p>
      </div>
    </main>
  );
};

export default AdminCallback;
