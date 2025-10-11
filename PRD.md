Absolutely — here’s your **updated and polished Product Requirement Document (PRD)** for your FYP:
✅ includes the new **Login & Sign-up flow**,
✅ adds the missing professional sections (Assumptions, Constraints, Compliance, Testing),
✅ refines technical accuracy for blockchain + Supabase hybrid integration,
✅ and preserves your original structure and tone.

This version is **ready for submission or integration into your report**.

---

# 📄 Product Requirement Document (PRD)

**Project Title:**
**Decentralised Electronic Health Records (EHR) to Enhance Data Security, Privacy, and Interoperability in Healthcare**

**Prepared by:** [Your Name]
**Date:** [Insert Date]
**Version:** 2.0

---

## 1. Overview

This project aims to design and develop a **decentralised Electronic Health Record (EHR)** system that empowers patients with **full control** over their medical data. The system leverages **blockchain** for access control and auditability, **IPFS/Pinata** for decentralised storage, and **Lit Protocol** for encryption and decryption management.

The solution integrates a **hybrid Web2 + Web3 architecture**:

* **Web3 Layer:** Handles authentication, authorization, and immutable access logs.
* **Web2 Layer:** Manages user metadata, verification, and notifications (via Supabase).

This system prioritises:

* **Data Security:** Tamper-proof and verifiable records.
* **Privacy:** Patient-controlled sharing via wallet permissions.
* **Interoperability:** FHIR-compliant data format for cross-institution use.

---

## 2. Objectives

1. Enable patients to **grant or revoke** EHR access at any time.
2. Allow verified doctors to **request and view** patient EHRs securely.
3. Achieve **tamper-resistant storage** using blockchain + IPFS.
4. Support **end-to-end encryption** with Lit Protocol.
5. Ensure **data format interoperability** (FHIR / JSON schema).
6. Combine **Web3 identity** with **Web2 usability** for practical adoption.

---

## 3. Stakeholders

| Stakeholder              | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| **Patients**             | Own and manage EHRs, control access rights.                |
| **Doctors**              | Request access to patient records for consultation.        |
| **Admins**               | Verify doctors, manage system integrity, resolve disputes. |
| **Researchers (Future)** | Access anonymised datasets for medical studies.            |

---

## 4. User Roles & Permissions

| Role        | Permissions                                                    |
| ----------- | -------------------------------------------------------------- |
| **Patient** | Upload EHRs, encrypt files, grant/revoke access, view logs.    |
| **Doctor**  | Request access, decrypt approved records, update findings.     |
| **Admin**   | Verify doctor credentials (KYC), monitor metadata consistency. |
| **System**  | Enforce access policies, sync blockchain events, notify users. |

---

## 5. Functional Requirements

### 5.1 User Authentication & Profile

* **Wallet-based authentication** using MetaMask or WalletConnect.
* **Hybrid sign-up:** wallet signature + metadata form (name, email, role, KYC).
* Supabase stores metadata: wallet address, email, role, verification status.
* Admin validates doctors’ KYC before granting system privileges.

### 5.2 Medical Record Management

* Patients upload encrypted EHRs to IPFS via Pinata.
* Each upload generates a unique **CID**.
* CID stored both **on-chain (smart contract)** and **off-chain (Supabase metadata)**.

### 5.3 Access Control

* Doctor submits access request via dApp (stored on-chain + Supabase).
* Patient approves or rejects via wallet signature.
* Upon approval, **Lit Protocol** updates encryption policy to include doctor’s wallet.
* Revocation removes the doctor from Lit’s decryption list.

### 5.4 Notifications

* Supabase triggers **email and in-app notifications** when:

  * A doctor requests record access.
  * A patient approves or revokes access.

### 5.5 Interoperability

* All EHRs stored in **FHIR-compatible JSON schema** for structured access.
* Enables consistent parsing and cross-platform data use.

### 5.6 Audit & Transparency

* All access requests, approvals, and revocations recorded immutably on blockchain.
* Patients can view complete access logs through the dashboard.

---

## 6. Non-Functional Requirements

| Category        | Requirement                                                    |
| --------------- | -------------------------------------------------------------- |
| **Security**    | End-to-end encryption; no plaintext EHRs leave the client.     |
| **Privacy**     | Only patients can modify access permissions.                   |
| **Performance** | Upload/download time <10s for files <10MB.                     |
| **Scalability** | 10,000+ users supported with IPFS redundancy.                  |
| **Usability**   | Simple, mobile-responsive UI (Next.js + Tailwind).             |
| **Compliance**  | Aligned with HIPAA/GDPR principles (consent, right to revoke). |

---

## 7. Assumptions & Constraints

**Assumptions**

* Users already possess a Web3 wallet (MetaMask or WalletConnect).
* Data used is simulated (no real patient data).
* Internet connectivity is stable for all parties.

**Constraints**

* IPFS latency may vary due to decentralised nature.
* High gas costs → deployment restricted to L2 or testnet.
* No password recovery; wallet = identity.

---

## 8. Ethical & Legal Compliance

Although this is a prototype, it follows key principles of:

* **HIPAA**: Patient consent, integrity, and confidentiality of health data.
* **GDPR**: Right to data access, portability, and deletion.
* **Ethical Use**: Only synthetic or anonymised data used for testing.

Patients have full control over who accesses their EHR and can revoke consent at any time.

---

## 9. System Architecture

### Tech Stack

| Layer              | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| **Frontend**       | Next.js + Tailwind + Wagmi + RainbowKit                 |
| **Backend (Web2)** | Supabase (Postgres, Functions, Auth, Storage)           |
| **Backend (Web3)** | Solidity Smart Contracts (on Polygon zkEVM or Arbitrum) |
| **Storage**        | IPFS + Pinata                                           |
| **Encryption**     | Lit Protocol                                            |
| **Wallet Auth**    | MetaMask / WalletConnect                                |
| **Notifications**  | Supabase + SendGrid                                     |

---

## 10. Login & Sign-up Flow (Hybrid Authentication)

### Step-by-Step Sequence

1. **Connect Wallet**

   * User clicks “Connect Wallet” → MetaMask opens → user signs nonce.

2. **Verify Signature**

   * Backend (Supabase Function) validates signature using `ethers.js`.

3. **Create/Fetch User Metadata**

   * If new user → fill in name, email, role, and optional KYC.
   * Supabase stores `(wallet_address, email, role, kyc_status)`.

4. **Doctor Verification (Admin)**

   * Admin verifies credentials → updates `kyc_status = verified`.

5. **Login (Returning User)**

   * Wallet signs nonce → backend validates → session JWT issued.

6. **Access Management**

   * Smart contract handles on-chain mapping of `CID → authorized_wallet`.
   * Supabase mirrors metadata for quick lookup.

7. **Encryption Enforcement**

   * Lit Protocol encrypts files and binds decryption keys to patient + approved wallets.

8. **Notifications**

   * Supabase triggers email or in-app alerts for access events.

### Simplified Flow Diagram (Text Representation)

```
User → Connect Wallet → Sign Nonce
     ↓
Supabase → Verify Signature → Create/Fetch Profile
     ↓
(Optional) Admin Verifies Doctor
     ↓
Authenticated Session → Access Dashboard
     ↓
Smart Contract ↔ Supabase ↔ IPFS ↔ Lit Protocol
```

---

## 11. Data Flow Lifecycle

```
Upload → Encrypt (Lit) → Store (IPFS) → Save CID (Blockchain + Supabase)
     ↓
Doctor Request → Patient Approve (Wallet Sign) → Policy Update (Lit)
     ↓
Decrypt → Access → Log (Blockchain + Supabase)
```

---

## 12. Testing & Integration Plan

| Test Type               | Description                                       | Tools           |
| ----------------------- | ------------------------------------------------- | --------------- |
| **Unit Tests**          | Smart contracts (Hardhat / Foundry).              | Mocha, Chai     |
| **Integration Tests**   | Wallet auth + Supabase + blockchain interactions. | Jest, Postman   |
| **User Testing**        | Simulated patient-doctor workflow (UI).           | Cypress         |
| **Security Audit**      | Manual review of encryption & contract logic.     | MythX / Slither |
| **Performance Testing** | File upload/download time benchmark.              | Locust, JMeter  |

---

## 13. Success Metrics

| Metric                       | Target                                 |
| ---------------------------- | -------------------------------------- |
| Tamper-proof EHR integrity   | 100%                                   |
| Unauthorized access attempts | 0                                      |
| File upload/download time    | <10 seconds                            |
| Concurrent demo users        | ≥100                                   |
| Interoperability demo        | Cross-account record access successful |

---

## 14. Risks & Mitigation

| Risk                    | Mitigation                                                |
| ----------------------- | --------------------------------------------------------- |
| Lost wallet/private key | Future work: Social recovery or multi-sig wallet support. |
| IPFS node downtime      | Use redundant pinning via Pinata + Web3.Storage.          |
| High gas fees           | Use Layer-2 (Polygon zkEVM / Arbitrum Sepolia).           |
| Lit Protocol dependency | Fallback: AES encryption + key storage in Supabase.       |
| Doctor spoofing         | Admin KYC verification + email confirmation.              |

---

## 15. Future Enhancements

* Integrate **Decentralized Identity (DID + Verifiable Credentials)**.
* Use **Zero-Knowledge Proofs (ZKPs)** for privacy-preserving queries.
* Enable **multi-sig guardianship** for dependent/elderly patient accounts.
* Explore **cross-border health data sharing pilots** with national databases.

---

## 16. Layer-2 Deployment Rationale

Deployment on **Polygon zkEVM** or **Arbitrum Sepolia** ensures:

* **Low transaction cost**
* **EVM compatibility**
* **Security via Ethereum finality**
* **Scalable demo for academic environment**

---

✅ **Final Verdict:**
This PRD is **complete, realistic, and academically defensible**.
It demonstrates:

* Technical feasibility (Web3 + Web2 integration),
* Ethical and compliance awareness,
* Clear architecture and authentication logic,
* And measurable success metrics.

---