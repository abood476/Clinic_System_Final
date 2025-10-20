const API_URL = "http://localhost:4000/api";

// ==================== GLOBAL USER HANDLER ====================
window.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname.split("/").pop();
  const user = JSON.parse(localStorage.getItem("cas_current_user") || "null");
  const userBox = document.querySelector("#userBox");

  // ---------- Navbar ----------
  if (userBox) {
    if (user) {
      userBox.innerHTML = `
        <span class="badge">Signed in as ${user.name} (${user.role})</span>
        <a class="btn" href="#" id="logoutBtn">Logout</a>`;
      document.querySelector("#logoutBtn").addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("cas_current_user");
        location.href = "index.html";
      });
    } else {
      userBox.innerHTML = `
        <a class="btn" href="login.html">Login</a>
        <a class="btn btn-primary" href="register.html">Sign Up</a>`;
    }
  }

  // ---------- LOGIN ----------
  if (path === "login.html") {
    const form = document.querySelector("#loginForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const password = form.password.value.trim();

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error || "Invalid credentials");

        const currentUser = {
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
        };
        localStorage.setItem("cas_current_user", JSON.stringify(currentUser));

        alert("✅ Login successful!");
        if (data.user.role === "admin") location.href = "admin-dashboard.html";
        else if (data.user.role === "doctor") location.href = "doctor-dashboard.html";
        else location.href = "patient-dashboard.html";
      } catch (err) {
        console.error("⚠ Login error:", err);
        alert("⚠ Cannot connect to server.");
      }
    });
  }

  // ---------- REGISTER ----------
  if (path === "register.html") {
    const form = document.querySelector("#registerForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value.trim();

      try {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();

        if (!res.ok) return alert(data.error || "Registration failed");
        alert("✅ Account created successfully!");
        location.href = "login.html";
      } catch (err) {
        console.error("⚠ Register error:", err);
        alert("⚠ Cannot connect to server.");
      }
    });
  }

  // ---------- BOOK APPOINTMENT ----------
  if (path === "book.html") {
    const u = JSON.parse(localStorage.getItem("cas_current_user") || "null");
    if (!u) return (location.href = "login.html");

    const doctorSelect = document.querySelector("#doctor");
    const dateInput = document.querySelector("#date");
    const timeSelect = document.querySelector("#time");

    const doctors = [
      { name: "Dr. Ahmed", specialty: "Dentist", slots: ["09:00", "10:00", "11:00", "13:00", "15:00"] },
      { name: "Dr. Sarah", specialty: "Cardiologist", slots: ["10:00", "11:30", "14:00", "15:30"] },
    ];

    doctors.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.name;
      opt.textContent = `${d.name} (${d.specialty})`;
      doctorSelect.appendChild(opt);
    });

    doctorSelect.addEventListener("change", () => {
      const d = doctors.find((x) => x.name === doctorSelect.value);
      timeSelect.innerHTML = '<option value="" hidden>Select time</option>';
      (d?.slots || []).forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t;
        timeSelect.appendChild(o);
      });
    });

    document.querySelector("#bookForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const doctorName = doctorSelect.value;
      const date = dateInput.value;
      const time = timeSelect.value;
      if (!doctorName || !date || !time) return alert("Please select doctor, date, and time.");

      try {
        const res = await fetch(`${API_URL}/appointments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientName: u.name, doctorName, date: `${date} ${time}` }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error creating appointment");
        alert("✅ Appointment created successfully on blockchain!");
        location.href = "patient-dashboard.html";
      } catch (err) {
        console.error(err);
        alert("❌ Failed to create appointment.");
      }
    });
  }

  // ---------- PATIENT DASHBOARD ----------
  if (path === "patient-dashboard.html") {
    (async () => {
      const u = JSON.parse(localStorage.getItem("cas_current_user") || "null");
      if (!u) return (location.href = "login.html");

      const tbody = document.querySelector("#aptRows");
      tbody.innerHTML = "<tr><td colspan='4'>Loading your appointments...</td></tr>";

      try {
        const res = await fetch(`${API_URL}/appointments`);
        const appts = await res.json();

        const myAppointments = appts.filter(
          (a) => a.patientName.toLowerCase().trim() === u.name.toLowerCase().trim()
        );

        if (!myAppointments.length) {
          tbody.innerHTML = "<tr><td colspan='4'>No appointments yet.</td></tr>";
          return;
        }

        tbody.innerHTML = myAppointments
          .map(
            (a) => `
            <tr>
              <td>${a.date}</td>
              <td>${a.doctorName}</td>
              <td><span class="badge ${a.confirmed ? "success" : "pending"}">${a.confirmed ? "✅ Confirmed" : "⏳ Pending"}</span></td>
              <td>-</td>
            </tr>`
          )
          .join("");
      } catch (err) {
        console.error("Error loading appointments:", err);
        tbody.innerHTML = "<tr><td colspan='4'>Failed to load appointments.</td></tr>";
      }
    })();
  }

  // ---------- DOCTOR DASHBOARD ----------
  if (path === "doctor-dashboard.html") {
    (async () => {
      const u = JSON.parse(localStorage.getItem("cas_current_user") || "null");
      if (!u) return (location.href = "login.html");

      const tbody = document.querySelector("#docRows");
      tbody.innerHTML = "<tr><td colspan='4'>Loading appointments...</td></tr>";

      try {
        const res = await fetch(`${API_URL}/appointments`);
        const appts = await res.json();

        // ✅ Smart matching (ignores "Dr.", case, and spaces)
        const myAppointments = appts.filter((a) => {
          const docInDB = a.doctorName.toLowerCase().replace("dr.", "").trim();
          const docUser = u.name.toLowerCase().replace("dr.", "").trim();
          return docInDB === docUser;
        });

        if (!myAppointments.length) {
          tbody.innerHTML = "<tr><td colspan='4'>No appointments found for you.</td></tr>";
          return;
        }

        tbody.innerHTML = myAppointments
          .map(
            (a) => `
            <tr>
              <td>${a.date}</td>
              <td>${a.patientName}</td>
              <td><span class="badge ${a.confirmed ? "success" : "pending"}">
                ${a.confirmed ? "✅ Confirmed" : "⏳ Pending"}
              </span></td>
              <td>
                ${
                  a.confirmed
                    ? "-"
                    : <button class='btn btn-primary btn-sm' onclick='confirmAppt(${a.id})'>Confirm</button>
                }
              </td>
            </tr>`
          )
          .join("");
      } catch (err) {
        console.error("Error loading doctor appointments:", err);
        tbody.innerHTML = "<tr><td colspan='4'>Failed to load appointments.</td></tr>";
      }
    })();
  }
});

// ---------- Confirm Appointment ----------
async function confirmAppt(id) {
  if (!confirm("Confirm this appointment?")) return;
  try {
    const res = await fetch(`${API_URL}/appointments/confirm/${id}`, { method: "POST" });
    const data = await res.json();
    alert(data.message || "✅ Appointment confirmed!");
    location.reload();
  } catch (err) {
    console.error("Error confirming appointment:", err);
    alert("Failed to confirm appointment.");
  }
}
