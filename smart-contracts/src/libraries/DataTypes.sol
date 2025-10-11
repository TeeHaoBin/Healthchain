// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DataTypes
 * @dev Library containing data structures used across the EHR system
 */
library DataTypes {
    
    enum RecordType {
        GENERAL,
        LAB_RESULT,
        IMAGING,
        PRESCRIPTION,
        VACCINATION,
        SURGERY,
        EMERGENCY
    }
    
    enum AccessLevel {
        NONE,
        READ_ONLY,
        READ_WRITE,
        EMERGENCY
    }
    
    struct Patient {
        address patientAddress;
        string encryptionPublicKey;
        address emergencyContact;
        uint256 registrationTimestamp;
        bool isActive;
    }
    
    struct Provider {
        address providerAddress;
        string licenseNumber;
        string specialty;
        string institutionName;
        string encryptionPublicKey;
        bool isVerified;
        uint256 registrationTimestamp;
        uint256 verificationTimestamp;
    }
    
    struct HealthRecord {
        uint256 recordId;
        address patient;
        address provider;
        string ipfsHash;
        string encryptedSymmetricKey;
        RecordType recordType;
        uint256 timestamp;
        bool isActive;
    }
    
    struct AccessPermission {
        address patient;
        address provider;
        AccessLevel level;
        uint256 grantedTimestamp;
        uint256 expiryTimestamp;
        bool isActive;
    }
    
    struct EmergencyAccess {
        address patient;
        address emergencyProvider;
        uint256 startTimestamp;
        uint256 expiryTimestamp;
        string justification;
        bool isActive;
    }
    
    struct AuditEntry {
        uint256 entryId;
        address actor;
        address patient;
        string action;
        uint256 timestamp;
        string ipfsHash;
    }
    
    enum RequestStatus {
        PENDING,
        APPROVED,
        REJECTED,
        EXPIRED
    }
    
    struct AccessRequest {
        address patient;
        address provider;
        string justification;
        AccessLevel requestedLevel;
        uint256 requestedDuration;
        uint256 requestTimestamp;
        RequestStatus status;
    }
    
    struct FHIRMetadata {
        string resourceType;    // "Patient", "Observation", "DiagnosticReport", etc.
        string version;         // FHIR version (R4, R5)
        string[] categories;    // FHIR categories
        bool isCompliant;
        string profile;         // FHIR profile URL
    }
    
    struct NotificationData {
        address recipient;
        string notificationType;
        string message;
        uint256 timestamp;
        bool isRead;
        string metadata;
    }
}