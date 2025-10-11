// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./libraries/DataTypes.sol";
import "./PatientRegistry.sol";
import "./ProviderRegistry.sol";

/**
 * @title NotificationManager
 * @dev Contract for managing notifications and alerts in the EHR system
 */
contract NotificationManager {
    using DataTypes for DataTypes.NotificationData;
    
    PatientRegistry public patientRegistry;
    ProviderRegistry public providerRegistry;
    
    uint256 private notificationCounter;
    mapping(uint256 => DataTypes.NotificationData) public notifications;
    mapping(address => uint256[]) public userNotifications;
    mapping(address => uint256) public unreadCount;
    
    // Authorized contracts that can send notifications
    mapping(address => bool) public authorizedSenders;
    address public admin;
    
    event NotificationCreated(
        uint256 indexed notificationId,
        address indexed recipient,
        string notificationType,
        string message,
        uint256 timestamp
    );
    event NotificationRead(uint256 indexed notificationId, address indexed reader);
    event NotificationBatchRead(address indexed user, uint256[] notificationIds);
    event SenderAuthorized(address indexed sender, bool authorized);
    
    modifier onlyAuthorizedSender() {
        require(authorizedSenders[msg.sender] || msg.sender == admin, "Not authorized to send notifications");
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier onlyRecipient(uint256 _notificationId) {
        require(notifications[_notificationId].recipient == msg.sender, "Not the recipient");
        _;
    }
    
    constructor(address _patientRegistry, address _providerRegistry) {
        patientRegistry = PatientRegistry(_patientRegistry);
        providerRegistry = ProviderRegistry(_providerRegistry);
        admin = msg.sender;
        notificationCounter = 1;
        
        // Authorize admin to send notifications
        authorizedSenders[msg.sender] = true;
    }
    
    /**
     * @dev Create a new notification
     * @param _recipient Recipient address
     * @param _notificationType Type of notification
     * @param _message Notification message
     * @param _metadata Additional metadata (JSON string)
     * @return notificationId The ID of the created notification
     */
    function createNotification(
        address _recipient,
        string memory _notificationType,
        string memory _message,
        string memory _metadata
    ) external onlyAuthorizedSender returns (uint256) {
        require(_recipient != address(0), "Invalid recipient");
        require(bytes(_notificationType).length > 0, "Notification type required");
        require(bytes(_message).length > 0, "Message required");
        
        uint256 notificationId = notificationCounter++;
        
        notifications[notificationId] = DataTypes.NotificationData({
            recipient: _recipient,
            notificationType: _notificationType,
            message: _message,
            timestamp: block.timestamp,
            isRead: false,
            metadata: _metadata
        });
        
        userNotifications[_recipient].push(notificationId);
        unreadCount[_recipient]++;
        
        emit NotificationCreated(notificationId, _recipient, _notificationType, _message, block.timestamp);
        return notificationId;
    }
    
    /**
     * @dev Create access request notification
     * @param _patient Patient address
     * @param _provider Provider address
     * @param _justification Access request justification
     */
    function createAccessRequestNotification(
        address _patient,
        address _provider,
        string memory _justification
    ) external onlyAuthorizedSender {
        DataTypes.Provider memory provider = providerRegistry.getProvider(_provider);
        
        string memory message = string(abi.encodePacked(
            "Dr. ", provider.specialty, " has requested access to your medical records. Reason: ", _justification
        ));
        
        string memory metadata = string(abi.encodePacked(
            '{"providerAddress":"', addressToString(_provider), '","specialty":"', provider.specialty, '"}'
        ));
        
        this.createNotification(_patient, "ACCESS_REQUEST", message, metadata);
    }
    
    /**
     * @dev Create access granted notification
     * @param _provider Provider address
     * @param _patient Patient address
     * @param _accessLevel Access level granted
     */
    function createAccessGrantedNotification(
        address _provider,
        address _patient,
        DataTypes.AccessLevel _accessLevel
    ) external onlyAuthorizedSender {
        string memory accessLevelStr = getAccessLevelString(_accessLevel);
        string memory message = string(abi.encodePacked(
            "Patient has granted you ", accessLevelStr, " access to their medical records."
        ));
        
        string memory metadata = string(abi.encodePacked(
            '{"patientAddress":"', addressToString(_patient), '","accessLevel":"', accessLevelStr, '"}'
        ));
        
        this.createNotification(_provider, "ACCESS_GRANTED", message, metadata);
    }
    
    /**
     * @dev Create emergency access notification
     * @param _patient Patient address
     * @param _provider Emergency provider address
     * @param _justification Emergency justification
     */
    function createEmergencyAccessNotification(
        address _patient,
        address _provider,
        string memory _justification
    ) external onlyAuthorizedSender {
        string memory message = string(abi.encodePacked(
            "Emergency access granted to healthcare provider. Reason: ", _justification
        ));
        
        string memory metadata = string(abi.encodePacked(
            '{"providerAddress":"', addressToString(_provider), '","type":"emergency"}'
        ));
        
        this.createNotification(_patient, "EMERGENCY_ACCESS", message, metadata);
        
        // Also notify emergency contact if exists
        DataTypes.Patient memory patient = patientRegistry.getPatient(_patient);
        if (patient.emergencyContact != address(0)) {
            string memory emergencyMessage = string(abi.encodePacked(
                "Emergency access granted for patient under your emergency contact. Reason: ", _justification
            ));
            this.createNotification(patient.emergencyContact, "EMERGENCY_ACCESS_CONTACT", emergencyMessage, metadata);
        }
    }
    
    /**
     * @dev Create new record notification
     * @param _patient Patient address
     * @param _provider Provider address
     * @param _recordType Type of record added
     */
    function createNewRecordNotification(
        address _patient,
        address _provider,
        DataTypes.RecordType _recordType
    ) external onlyAuthorizedSender {
        string memory recordTypeStr = getRecordTypeString(_recordType);
        string memory message = string(abi.encodePacked(
            "New ", recordTypeStr, " record added to your medical file."
        ));
        
        string memory metadata = string(abi.encodePacked(
            '{"providerAddress":"', addressToString(_provider), '","recordType":"', recordTypeStr, '"}'
        ));
        
        this.createNotification(_patient, "NEW_RECORD", message, metadata);
    }
    
    /**
     * @dev Mark notification as read
     * @param _notificationId Notification ID
     */
    function markAsRead(uint256 _notificationId) external onlyRecipient(_notificationId) {
        DataTypes.NotificationData storage notification = notifications[_notificationId];
        require(!notification.isRead, "Already marked as read");
        
        notification.isRead = true;
        unreadCount[msg.sender]--;
        
        emit NotificationRead(_notificationId, msg.sender);
    }
    
    /**
     * @dev Mark multiple notifications as read
     * @param _notificationIds Array of notification IDs
     */
    function markBatchAsRead(uint256[] memory _notificationIds) external {
        for (uint256 i = 0; i < _notificationIds.length; i++) {
            uint256 notificationId = _notificationIds[i];
            DataTypes.NotificationData storage notification = notifications[notificationId];
            
            if (notification.recipient == msg.sender && !notification.isRead) {
                notification.isRead = true;
                unreadCount[msg.sender]--;
            }
        }
        
        emit NotificationBatchRead(msg.sender, _notificationIds);
    }
    
    /**
     * @dev Get user's notifications
     * @param _user User address
     * @param _limit Maximum number of notifications to return
     * @param _offset Offset for pagination
     * @return Array of notification IDs
     */
    function getUserNotifications(
        address _user,
        uint256 _limit,
        uint256 _offset
    ) external view returns (uint256[] memory) {
        uint256[] memory allNotifications = userNotifications[_user];
        require(_offset < allNotifications.length, "Offset out of bounds");
        
        uint256 end = _offset + _limit;
        if (end > allNotifications.length) {
            end = allNotifications.length;
        }
        
        uint256[] memory result = new uint256[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = allNotifications[allNotifications.length - 1 - i]; // Reverse order (newest first)
        }
        
        return result;
    }
    
    /**
     * @dev Get unread notifications count
     * @param _user User address
     * @return Number of unread notifications
     */
    function getUnreadCount(address _user) external view returns (uint256) {
        return unreadCount[_user];
    }
    
    /**
     * @dev Get notification details
     * @param _notificationId Notification ID
     * @return NotificationData struct
     */
    function getNotification(uint256 _notificationId) external view returns (DataTypes.NotificationData memory) {
        return notifications[_notificationId];
    }
    
    /**
     * @dev Authorize a contract to send notifications
     * @param _sender Contract address
     * @param _authorized Whether to authorize
     */
    function authorizeSender(address _sender, bool _authorized) external onlyAdmin {
        authorizedSenders[_sender] = _authorized;
        emit SenderAuthorized(_sender, _authorized);
    }
    
    /**
     * @dev Convert address to string
     */
    function addressToString(address _address) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_address)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    /**
     * @dev Convert access level enum to string
     */
    function getAccessLevelString(DataTypes.AccessLevel _level) internal pure returns (string memory) {
        if (_level == DataTypes.AccessLevel.READ_ONLY) return "read-only";
        if (_level == DataTypes.AccessLevel.READ_WRITE) return "read-write";
        if (_level == DataTypes.AccessLevel.EMERGENCY) return "emergency";
        return "none";
    }
    
    /**
     * @dev Convert record type enum to string
     */
    function getRecordTypeString(DataTypes.RecordType _type) internal pure returns (string memory) {
        if (_type == DataTypes.RecordType.LAB_RESULT) return "lab result";
        if (_type == DataTypes.RecordType.IMAGING) return "imaging";
        if (_type == DataTypes.RecordType.PRESCRIPTION) return "prescription";
        if (_type == DataTypes.RecordType.VACCINATION) return "vaccination";
        if (_type == DataTypes.RecordType.SURGERY) return "surgery";
        if (_type == DataTypes.RecordType.EMERGENCY) return "emergency";
        return "general";
    }
}