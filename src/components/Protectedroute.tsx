// import React from 'react';
import { Navigate } from 'react-router-dom';


function ProtectedRoute({ children, allowedRole }: any) {
  const role = allowedRole.toLowerCase();
  const tokenKey = `${role}_token`;
  const userKey  = role === "user" ? "user_user" : `${role}_user`;
  const token = localStorage.getItem(tokenKey);
  const user = JSON.parse(localStorage.getItem(userKey) || "null");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role.toLowerCase() !== allowedRole.toLowerCase()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;