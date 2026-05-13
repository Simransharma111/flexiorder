import {
  useEffect,
  useState,
} from "react";

import api from "../api/axios";

export default function StaffManager() {

  // =========================
  // STATES
  // =========================

  const [staff, setStaff] =
    useState([]);

    const [editingId, setEditingId] =
  useState(null);

  const [loading, setLoading] =
    useState(false);

  const [formData, setFormData] =
    useState({
      name: "",
      email: "",
      password: "",
      position: "Kitchen Staff",
    });

  // =========================
  // FETCH STAFF
  // =========================

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {

    try {

      const token =
        localStorage.getItem("token");

      const res = await api.get(
        "/staff",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setStaff(res.data);

    } catch (err) {

      console.log(err);

    }
  };

  // =========================
  // HANDLE CHANGE
  // =========================

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });

  };

  // =========================
  // CREATE STAFF
  // =========================

  const handleSubmit = async (
  e
) => {

  e.preventDefault();

  try {

    setLoading(true);

    const token =
      localStorage.getItem("token");

    const config = {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    };

    // UPDATE

    if (editingId) {

      const res =
        await api.put(
          `/staff/${editingId}`,
          formData,
          config
        );

      setStaff((prev) =>
        prev.map((item) =>
          item._id === editingId
            ? res.data
            : item
        )
      );

      setEditingId(null);

    }

    // CREATE

    else {

      const res =
        await api.post(
          "/staff/create",
          formData,
          config
        );

      setStaff((prev) => [
        res.data,
        ...prev,
      ]);
    }

    // RESET

    setFormData({
      name: "",
      email: "",
      password: "",
      position:
        "Kitchen Staff",
    });

  } catch (err) {

    console.log(err);

  } finally {

    setLoading(false);

  }
};
  // =========================
  // DELETE STAFF
  // =========================

  const deleteStaff = async (
    id
  ) => {

    const confirmDelete =
      window.confirm(
        "Remove this staff member?"
      );

    if (!confirmDelete) return;

    try {

      const token =
        localStorage.getItem("token");

      await api.delete(
        `/staff/${id}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setStaff((prev) =>
        prev.filter(
          (user) =>
            user._id !== id
        )
      );

    } catch (err) {

      console.log(err);

      alert(
        "Failed to remove staff"
      );

    }
  };

  return (

    <div>

      {/* HEADER */}

      <div className="mb-8">

        <h2 className="text-3xl font-bold">
          Staff Manager
        </h2>

        <p className="text-gray-400 mt-2">
          Create and manage hotel staff
        </p>

      </div>

      {/* FORM */}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 border border-white/10 rounded-3xl p-6"
      >

        {/* NAME */}

        <input
          type="text"
          name="name"
          placeholder="Staff Name"
          value={formData.name}
          onChange={handleChange}
          required
          className="bg-white/10 rounded-2xl px-4 py-3 outline-none"
        />

        {/* EMAIL */}

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="bg-white/10 rounded-2xl px-4 py-3 outline-none"
        />

        {/* PASSWORD */}

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="bg-white/10 rounded-2xl px-4 py-3 outline-none"
        />

        {/* POSITION */}

        <select
  name="position"
  value={formData.position}
  onChange={handleChange}
  className="bg-white/10 text-white rounded-2xl px-4 py-3 outline-none"
>
  <option className="text-black">
    Kitchen Staff
  </option>

  <option className="text-black">
    Waiter
  </option>

  <option className="text-black">
    Cashier
  </option>

  <option className="text-black">
    Manager
  </option>
</select>

        {/* BUTTON */}

        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 transition rounded-2xl py-3 font-bold md:col-span-2"
        >
          {
            loading
              ? "Creating..."
              : "Add Staff"
          }
        </button>

      </form>

      {/* STAFF LIST */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-10">

        {
          staff.length === 0 ? (

            <div className="text-gray-400">
              No staff members found
            </div>

          ) : (

            staff.map((user) => (

              <div
                key={user._id}
                className="bg-white/5 border border-white/10 rounded-3xl p-6"
              >

                {/* NAME */}

                <h3 className="text-2xl font-bold">
                  {user.name}
                </h3>

                {/* EMAIL */}

                <p className="text-gray-400 mt-2">
                  {user.email}
                </p>

                {/* POSITION */}

                <div className="mt-4 flex gap-3">

                  <span className="bg-orange-500/20 text-orange-400 px-4 py-1 rounded-full text-sm">
                    {user.position}
                  </span>

                  <span className="bg-blue-500/20 text-blue-400 px-4 py-1 rounded-full text-sm">
                    {user.role}
                  </span>

                </div>

                {/* DELETE */}

                <div className="flex gap-3 mt-6">

  <button
    onClick={() => {

      setEditingId(user._id);

      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        position:
          user.position,
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    }}
    className="flex-1 bg-blue-500 hover:bg-blue-600 transition py-3 rounded-2xl"
  >
    Edit
  </button>

  <button
    onClick={() =>
      deleteStaff(
        user._id
      )
    }
    className="flex-1 bg-red-500 hover:bg-red-600 transition py-3 rounded-2xl"
  >
    Remove
  </button>

</div>

              </div>

            ))
          )
        }

      </div>

    </div>
  );
}