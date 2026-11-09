import { createContext, useEffect, useCallback, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setToken, getToken, removeToken, isTokenExpired } from "../utils/handleToken.js";
import { login as apiLogin, loginWithGoogle as apiGoogleLogin, registerStudent, registerTeacher, getMe } from "../services/apiServices.js"; // ✅ Import getMe
import React from 'react';

const getAuthErrorMessage = (error, fallback) => {
  const status = error.response?.status;
  if (!error.response) {
    return "Cannot reach the authentication server. Please try again later.";
  }
  if ([502, 503, 504].includes(status)) {
    return "The authentication server is temporarily unavailable. Please try again later.";
  }

  const response = error.response?.data;
  const validationErrors = response?.errors || response?.details;
  const messages = Array.isArray(validationErrors)
    ? validationErrors
        .map((item) => (typeof item === "string" ? item : item?.message || item?.msg))
        .filter(Boolean)
    : [];

  if (messages.length > 0) {
    return messages.join("; ");
  }

  return response?.message || fallback;
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ✅ MODIFIED: This effect now fetches the full user profile on load
  useEffect(() => {
    const fetchUser = async () => {
      const { accessToken } = getToken();
      if (accessToken && !isTokenExpired(accessToken)) {
        try {
          // Instead of just decoding, we fetch the full user object
          const response = await getMe();
          setUser(response.data.user); // The backend wraps the user in response.data.user
        } catch (error) {
          console.error("Failed to fetch user profile, logging out.", error);
          removeToken();
          setUser(null);
        }
      }
      setAuthLoading(false);
    };

    fetchUser();
  }, []);

  // Universal login function
  const login = useCallback(async (credentials) => {
    setAuthLoading(true);
    try {
      const response = await apiLogin(credentials);
      // The user object is at response.data.user
      const loggedInUser = response.data.user; 
      setUser(loggedInUser);
      if (loggedInUser.role === 'student') {
        navigate('/student-dashboard');
      } else if (loggedInUser.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/');
      }
      return { success: true };
    } catch (error) {
      const message = getAuthErrorMessage(error, "Invalid credentials");
      console.error("Login failed:", message);
      removeToken();
      setUser(null);
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [navigate]);

  const googleLogin = useCallback(async (credential, role) => {
    setAuthLoading(true);
    try {
      const response = await apiGoogleLogin(credential, role);
      const loggedInUser = response.data.user;
      setUser(loggedInUser);
      if (loggedInUser.role === 'student') {
        navigate('/student-dashboard');
      } else if (loggedInUser.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/');
      }
      return { success: true };
    } catch (error) {
      const message = getAuthErrorMessage(error, "Google sign-in failed");
      console.error("Google sign-in failed:", message);
      removeToken();
      setUser(null);
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [navigate]);

  // Universal signup function
  const signup = useCallback(async (userData, role) => {
    setAuthLoading(true);
    try {
      let response;
      if (role === 'student') {
        response = await registerStudent(userData);
      } else {
        response = await registerTeacher(userData);
      }
      const signedUpUser = response.data.user;
      setUser(signedUpUser);
      if (role === 'student') {
        navigate('/student-dashboard');
      } else {
        navigate('/teacher-dashboard');
      }
      return { success: true };
    } catch (error) {
      const message = getAuthErrorMessage(error, "Registration failed. Please check your data.");
      console.error("Signup failed:", message);
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [navigate]);

  // Logout function
  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    navigate('/');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      authLoading,
      login,
      googleLogin,
      signup,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
