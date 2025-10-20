# Clinic System (Web3‑Enabled)

_Final Course Project — Web3 Medical Certificates & Clinic Management_

A production‑lean clinic management system with **on‑chain medical certificate issuance and verification**. The app is split into a vanilla **Frontend** (HTML/CSS/JS), a **Backend** service that canonicalizes payloads and computes content hashes, and a **Solidity smart contract** (developed via Remix) used to persist/verifiably retrieve certificate hashes.

> **TL;DR**  
> Admin/doctor issues a certificate → backend produces a deterministic `hash` → frontend submits the hash on‑chain via wallet → later anyone can re‑compute the hash client‑side and verify authenticity + issuer on the contract.

---

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Setup & Run](#setup--run)
- [Smart Contract](#smart-contract)
- [Backend API (Reference)](#backend-api-reference)
- [Frontend (Wallet Integration)](#frontend-wallet-integration)
- [Verification Flow](#verification-flow)
- [Production Notes](#production-notes)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Credits](#credits)

---

## Features
- **Clinic UI** — manage patients, visits/appointments, and certificate actions via a clean HTML/CSS/JS interface.
- **Web3 Certificates** — on‑chain persistence of certificate **content hashes**; verification is trustless.
- **Clear separation of concerns** — frontend, backend, and contract live in distinct modules.
- **Extensible by design** — add RBAC, notifications, QR passes, analytics without breaking core flows.


## Architecture
```
[Clinic Frontend]  --(issue request)-->  [Certificate Backend]  --(hash)-->  [Wallet]
      |                                                              |
      |                                                              v
      \--------------------------(verify: read)----------------- [Solidity Contract]
```
- **Frontend**: collects inputs, previews payload, requests accounts/signature from MetaMask (or any EVM wallet), and reads contract state for verification.
- **Backend**: validates payload, canonicalizes fields (stable key order, normalized casing/whitespace), computes `keccak256` hash, and responds to the UI. _Optionally_ prepares transaction params.
- **Contract**: stores `hash => issuer, timestamp` (and/or minimal metadata) to prove existence & issuer at issuance time.


## Repository Structure
```
Clinic_System_Final/
├─ certificate_backend/      # Backend service for hashing/issuance
├─ clinic_frontend/          # Frontend (HTML/CSS/JS) + wallet interactions
├─ remix/                    # Solidity contract(s) for Remix (compile/deploy)
└─ README.md                 # You are here
```


## Prerequisites
- **Node.js 18+** (for the backend and local tooling)
- **MetaMask** (or any EVM wallet) in the browser
- **Remix** (https://remix.ethereum.org) or your Solidity toolchain of choice


## Setup & Run

### 1) Clone
```bash
git clone https://github.com/abood476/Clinic_System_Final.git
cd Clinic_System_Final
```

### 2) Deploy the Smart Contract (Remix)
1. Open **Remix** and import `remix/` (or copy the Solidity contract into a new file).
2. Compile with the version specified in the contract pragma.
3. Select a network:
   - **Local**: Remix VM for super‑fast testing.
   - **Public testnet** (e.g., Sepolia): in Remix, choose **Injected Provider** (MetaMask) and pick the network.
4. **Deploy** and copy the **contract address** and **ABI**.

> **Tip**: Keep V1 minimal: `issue(bytes32 hash)` for writes and a view getter for reads.

### 3) Configure the Frontend
Create a tiny config the UI can import, e.g. `clinic_frontend/js/config.js`:
```js
window.CLINIC_WEB3_CONFIG = {
  contractAddress: "0xYourDeployedContractAddress",
  contractAbi: [ /* ABI from Remix */ ],
  chainId: "0xaa36a7", // Example: Sepolia (update to your network)
};
```

### 4) Run the Backend (Certificate Issuance)
```bash
cd certificate_backend
# if a package.json exists
npm install
npm start   # or: node server.js / node index.js
```
Provide environment variables as needed (create `.env`):
```
PORT=8080
# add DB vars or secrets if your backend uses them
```

### 5) Serve the Frontend
```bash
cd ../clinic_frontend
# Option A: static server
npx serve -p 5173 .
# Option B: Python
python -m http.server 5173
```
Open: `http://localhost:5173`


## Smart Contract
A minimal interface works well for the course project and production‑lean V1:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalCertificates {
    event Issued(bytes32 indexed hash, address indexed issuer, uint256 timestamp);

    mapping(bytes32 => address) public issuerOf;      // who issued a given hash
    mapping(bytes32 => uint256) public issuedAt;      // when it was issued

    function issue(bytes32 hash) external returns (bool) {
        require(hash != bytes32(0), "empty hash");
        require(issuerOf[hash] == address(0), "already issued");
        issuerOf[hash] = msg.sender;
        issuedAt[hash] = block.timestamp;
        emit Issued(hash, msg.sender, block.timestamp);
        return true;
    }

    function exists(bytes32 hash) external view returns (bool) {
        return issuerOf[hash] != address(0);
    }
}
```
> Replace with your actual contract if different. For RBAC, restrict `issue` to approved issuer roles or an owner list.


## Backend API (Reference)
> Endpoints may differ in your codebase — align names and payloads with your actual handlers.

**POST** `/api/certificates/issue`
- **Body**: canonical certificate payload (e.g., `{ patientId, patientName, diagnosis, visitDate, doctorId, version }`)
- **Response**: `{ hash: "0x…" }`

**GET** `/api/certificates/verify?…`
- **Query**: same fields used to compute the hash
- **Response**: `{ hash, onChain: { exists, issuer, timestamp } }`

### Deterministic Hashing (Client/Server)
```js
import { keccak256 } from "js-sha3";

function canonicalize(obj) {
  // 1) stable key order, 2) trimmed strings, 3) normalized date format (e.g., ISO), 4) fixed version field
  const ordered = Object.keys(obj).sort().reduce((acc, k) => {
    const v = obj[k];
    acc[k] = typeof v === 'string' ? v.trim() : v;
    return acc;
  }, {});
  return JSON.stringify(ordered);
}

export function computeHash(payload) {
  const json = canonicalize({ ...payload, __schema: 'v1' });
  // Hex string 0x… for Solidity bytes32
  return '0x' + keccak256(json);
}
```


## Frontend (Wallet Integration)
- Detect `window.ethereum`, request accounts, and instantiate a contract with `contractAddress` & `ABI`.
- On **Issue**: call `contract.issue(hash)` and display tx hash + block no.
- On **Verify**: recompute hash locally, then `contract.issuerOf(hash)` / `contract.issuedAt(hash)`.


## Verification Flow
1. User (or verifier) inputs certificate fields (or scans a QR containing them).
2. Frontend recomputes **exact** deterministic hash.
3. Read on‑chain state for that hash:
   - If found → show **issuer address** & **timestamp**, mark as **valid**.
   - If not found → mark as **not issued / tampered**.


## Production Notes
- **Deterministic hashing**: lock a schema version; every field transformation must be identical across backend and frontend.
- **PII/PHI**: if handling personal health data, ensure local regulations (GDPR, HIPAA‑like) are respected.
- **Issuer controls**: restrict write operations (allow‑list issuers / owner)
- **Gas & costs**: keep on‑chain data minimal; prefer storing only the hash + issuer + timestamp.
- **Migrations**: if you change the schema, bump `__schema` and handle legacy verification paths.


## Roadmap
- RBAC for issuers (owner/roles)
- QR codes with compact payloads
- Public testnet deployment script (Hardhat) + CI
- IPFS pointers for optional PDF artifacts
- Unit tests (Hardhat/Foundry)


## Contributing
PRs and issues are welcome. Keep changes small, focused, and tested.


## License
MIT (or your chosen license). Add a `LICENSE` file.


## Credits
- Core development: **abood476**  
- Web3 architecture & review: project contributors

