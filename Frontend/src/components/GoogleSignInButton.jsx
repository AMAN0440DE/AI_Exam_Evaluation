import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export default function GoogleSignInButton({ role, onError, onSuccess }) {
  const { googleLogin } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSuccess = async ({ credential }) => {
    if (!credential) {
      onError?.('Google did not return a sign-in credential. Please try again.');
      return;
    }

    const result = await googleLogin(credential, role);
    if (result.success) {
      onSuccess?.();
    } else {
      onError?.(result.message);
    }
  };

  if (!clientId) {
    return (
      <p className="text-center text-sm text-gray-500">
        To enable Google sign-in, set <code>VITE_GOOGLE_CLIENT_ID</code> in Frontend/.env.
      </p>
    );
  }

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => onError?.('Google sign-in was cancelled or failed. Please try again.')}
        text="continue_with"
        shape="rectangular"
        width="320"
      />
    </div>
  );
}
