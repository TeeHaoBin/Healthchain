# MyHealth Decentralized EHR - System Flow Analysis

## 🔄 Core System Flows

### 1. **Patient Registration Flow**
```
Patient → Connect Wallet → Register Profile → Generate Encryption Keys → Ready
```

### 2. **Provider Registration Flow**
```
Provider → Connect Wallet → Submit Credentials → Admin Verification → Approved Provider
```

### 3. **Health Record Upload Flow**
```
Patient/Provider → Upload File → Client Encryption → IPFS Storage → Store Hash on Blockchain
```

### 4. **Access Request Flow**
```
Provider → Request Access → Patient Notification → Patient Approval → Generate Access Keys → Provider Access
```

### 5. **Emergency Access Flow**
```
Emergency → Verify Emergency Status → Time-Limited Access → Auto-Expire → Audit Log
```

### 6. **Audit & Compliance Flow**
```
All Actions → Immutable Logging → Compliance Reports → Regulatory Access
```

## 🏗️ Smart Contract Architecture

### Core Contracts:
1. **PatientRegistry** - Patient identity and profile management
2. **ProviderRegistry** - Healthcare provider verification and management
3. **EHRStorage** - Health record metadata and IPFS hash storage
4. **AccessControl** - Permission management and access rights
5. **AuditLog** - Immutable audit trail for all actions
6. **EmergencyAccess** - Emergency access protocols

### Supporting Contracts:
7. **EncryptionManager** - Encryption key management
8. **ComplianceReporter** - HIPAA/GDPR compliance reporting