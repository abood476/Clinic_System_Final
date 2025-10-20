// ==================== IMPORTS ====================
const express = require("express");
const cors = require("cors");
const { Web3 } = require("web3");

// ==================== APP SETUP ====================
const app = express();
app.use(express.json());
app.use(cors());

// ==================== BLOCKCHAIN CONNECTION ====================
const web3 = new Web3("http://127.0.0.1:7545");

// ✅ ضع هنا عنوان العقد من Ganache بعد الـ Deploy
const contractAddress = "0x726da6D6BE79332884E299dC8e0346C6a042BD87";

// ✅ ABI الخاص بالعقد
const contractABI = [
 
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			}
		],
		"name": "AppointmentConfirmed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "patientName",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "doctorName",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "date",
				"type": "string"
			}
		],
		"name": "AppointmentCreated",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_id",
				"type": "uint256"
			}
		],
		"name": "confirmAppointment",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_patientName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "_doctorName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "_date",
				"type": "string"
			}
		],
		"name": "createAppointment",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "appointmentCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "appointments",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "patientName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "doctorName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "date",
				"type": "string"
			},
			{
				"internalType": "bool",
				"name": "confirmed",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getAllAppointments",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "id",
						"type": "uint256"
					},
					{
						"internalType": "string",
						"name": "patientName",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "doctorName",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "date",
						"type": "string"
					},
					{
						"internalType": "bool",
						"name": "confirmed",
						"type": "bool"
					}
				],
				"internalType": "struct ClinicAppointment.Appointment[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_id",
				"type": "uint256"
			}
		],
		"name": "getAppointment",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			},
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
  
];

// ==================== CONTRACT INSTANCE ====================
const contract = new web3.eth.Contract(contractABI, contractAddress);

// ==================== MOCK DATABASE ====================
let users = [
  { name: "Admin", email: "admin@clinic.com", password: "admin123", role: "admin" },
  { name: "Dr. Sarah", email: "sarah@clinic.com", password: "doctor123", role: "doctor" },
  { name: "Dr. Ahmed", email: "ahmed@clinic.com", password: "doctor123", role: "doctor" },
  { name: "Abdullah", email: "Abdullah@example.com", password: "patient123", role: "patient" },
];

// ==================== ROUTES ====================

// ✅ Create Appointment
app.post("/api/appointments", async (req, res) => {
  try {
    const { patientName, doctorName, date } = req.body;
    const accounts = await web3.eth.getAccounts();

    await contract.methods
      .createAppointment(patientName, doctorName, date)
      .send({ from: accounts[0], gas: 3000000 });

    console.log(`🩺 Appointment created: ${patientName} → ${doctorName} (${date})`);
    res.json({ message: "✅ Appointment created successfully" });
  } catch (error) {
    console.error("❌ Error creating appointment:", error);
    res.status(500).json({ error: "Error creating appointment" });
  }
});

// ✅ Get ALL Appointments
app.get("/api/appointments", async (req, res) => {
  try {
    const count = await contract.methods.appointmentCount().call();
    if (count == 0) {
      console.log("ℹ No appointments found on blockchain");
      return res.json([]);
    }

    let appointments = [];
    for (let i = 1; i <= count; i++) {
      const a = await contract.methods.getAppointment(i).call();
      appointments.push({
        id: a[0].toString(),
        patientName: a[1],
        doctorName: a[2],
        date: a[3],
        confirmed: a[4],
      });
    }

    console.log(`📋 Returned ${appointments.length} appointments`);
    res.json(appointments);
  } catch (error) {
    console.error("❌ Error fetching all appointments:", error);
    res.status(500).json({ error: "Error fetching appointments" });
  }
});

// ✅ Confirm Appointment
app.post("/api/appointments/confirm/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const accounts = await web3.eth.getAccounts();

    await contract.methods.confirmAppointment(id).send({ from: accounts[0], gas: 3000000 });
    console.log(`✅ Appointment ${id} confirmed`);
    res.json({ message: `Appointment ${id} confirmed successfully` });
  } catch (error) {
    console.error("❌ Error confirming appointment:", error);
    res.status(500).json({ error: "Error confirming appointment" });
  }
});

// ✅ Register New User
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const newUser = { name, email, password, role: "patient" };
  users.push(newUser);
  console.log("🆕 New user registered:", newUser);
  res.json({ message: "✅ Account created successfully", user: newUser });
});

// ✅ Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    console.log("❌ Invalid login attempt:", email);
    return res.status(401).json({ error: "Invalid email or password" });
  }

  console.log(`🔐 Login successful → ${user.role.toUpperCase()} (${user.email})`);
  res.json({
    message: "Login successful",
    user,
    role: user.role,
    token: "mock-token-" + user.role,
  });
});

// ==================== SERVER START ====================
const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));