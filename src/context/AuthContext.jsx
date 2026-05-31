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

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  // LOAD USER
  useEffect(() => {

    try {

      const token =
        localStorage.getItem("token");

      const storedUser =
        localStorage.getItem("user");

      if (token && storedUser) {

        setUser(
          JSON.parse(storedUser)
        );

      } else {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

      }

    } catch (err) {

      console.log(err);

      localStorage.removeItem("token");
      localStorage.removeItem("user");

    } finally {

      setLoading(false);

    }

  }, []);

  // LOGIN
  const login = (
    userData,
    token
  ) => {

    // REMOVE OLD USER
    localStorage.clear();

    // SAVE NEW USER
    localStorage.setItem(
      "token",
      token
    );

    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    setUser(userData);

  };

  // LOGOUT
  const logout = () => {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    setUser(null);

    window.location.href = "/login";

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