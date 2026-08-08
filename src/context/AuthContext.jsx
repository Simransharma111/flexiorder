import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AUTH_CLEARED_EVENT,
  clearAuthSession,
  readStoredSession,
  saveAuthSession,
} from "../utils/session";

const AuthContext = createContext();

export const AuthProvider = ({
  children,
}) => {

  const [user, setUser] = useState(() => readStoredSession().user);
  const loading = false;

  useEffect(() => {
    const handleAuthCleared = () => setUser(null);
    const handleStorage = (event) => {
      if (event.key === "token" || event.key === "user") {
        setUser(readStoredSession().user);
      }
    };

    window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // LOGIN
  const login = (
    userData,
    token
  ) => {

    clearAuthSession({ notify: false });
    saveAuthSession(userData, token);
    setUser(userData);

  };

  // LOGOUT
  const logout = () => {

    clearAuthSession({ notify: false });
    setUser(null);

  };

  return (

    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
      }}
    >

      {children}

    </AuthContext.Provider>

  );

};

export const useAuth = () =>
  useContext(AuthContext);
