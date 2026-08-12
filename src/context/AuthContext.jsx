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

  useEffect(() => {
    if (user) {
      import("../utils/fcmPush").then(({ initFCM }) => {
        import("../api/axios").then(({ default: api }) => {
          initFCM(api).catch((err) => {
            console.warn("FCM registration on session restore failed", err);
          });
        });
      });
    }
  }, [user]);

  // LOGIN
  const login = (
    userData,
    token
  ) => {

    clearAuthSession({ notify: false });
    const saved = saveAuthSession(userData, token);
    setUser(saved ? userData : null);
    return saved;

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
