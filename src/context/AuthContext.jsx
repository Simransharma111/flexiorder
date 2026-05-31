import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext();

export const AuthProvider = ({
  children,
}) => {

  const [user, setUser] = useState(null);

  const [loading, setLoading] =
    useState(true);

  // LOAD USER FROM STORAGE
  useEffect(() => {

    const storedUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    if (storedUser) {

      setUser(
        JSON.parse(storedUser)
      );

    }

    setLoading(false);

  }, []);

  // LOGIN
  const login = (
    userData,
    token,
    rememberMe = false
  ) => {

    const storage =
      rememberMe
        ? localStorage
        : sessionStorage;

    // REMOVE OLD LOGIN
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    // SAVE NEW LOGIN
    storage.setItem(
      "token",
      token
    );

    storage.setItem(
      "user",
      JSON.stringify(userData)
    );

    setUser(userData);

  };

  // LOGOUT
  const logout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

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