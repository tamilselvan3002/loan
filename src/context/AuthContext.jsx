import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('loan_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminCredentials, setAdminCredentials] = useState(() => {
    const savedCreds = localStorage.getItem('loan_admin_creds');
    return savedCreds ? JSON.parse(savedCreds) : { username: 'admin', password: 'Admin@12345' };
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('loan_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('loan_auth_user');
    }
  }, [user]);

  const login = (username, password) => {
    if (username === adminCredentials.username && password === adminCredentials.password) {
      const authUser = {
        username: adminCredentials.username,
        role: 'SUPER_ADMIN',
        loginTime: new Date().toISOString()
      };
      setUser(authUser);
      return { success: true };
    }
    return { success: false, error: 'Invalid administrator username or password' };
  };

  const logout = () => {
    setUser(null);
  };

  const changePassword = (currentPassword, newPassword) => {
    if (currentPassword !== adminCredentials.password) {
      return { success: false, error: 'Current password does not match' };
    }
    const updated = { ...adminCredentials, password: newPassword };
    setAdminCredentials(updated);
    localStorage.setItem('loan_admin_creds', JSON.stringify(updated));
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, adminCredentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
