// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ChainProof document integrity registry
/// @notice Stores SHA-256 digests and public registration state; never stores documents or personal data.
contract DocumentNotarization {
    address public immutable administrator;
    struct Issuer { bool authorized; bool suspended; }
    struct Document { bytes32 documentHash; address issuer; uint64 timestamp; bool exists; bool revoked; }
    mapping(address => Issuer) private issuers;
    mapping(bytes32 => Document) private documents;

    error AdminOnly(); error IssuerOnly(); error InvalidAddress(); error EmptyId();
    error InvalidHash(); error DuplicateId(); error MissingDocument(); error InvalidState(); error NotPermitted();
    event IssuerAuthorizationChanged(address indexed issuer, bool authorized, bool suspended);
    event DocumentRegistered(bytes32 indexed idHash, string documentId, bytes32 documentHash, address indexed issuer, uint64 timestamp);
    event DocumentRevoked(bytes32 indexed idHash, string documentId, address indexed actor, uint64 timestamp);

    constructor() { administrator = msg.sender; }
    modifier onlyAdmin() { if (msg.sender != administrator) revert AdminOnly(); _; }

    /// @notice Grants an issuer permission to register documents.
    function authorizeIssuer(address issuer) external onlyAdmin {
        if (issuer == address(0)) revert InvalidAddress();
        issuers[issuer] = Issuer(true, false);
        emit IssuerAuthorizationChanged(issuer, true, false);
    }
    /// @notice Suspends an issuer from future registrations without changing existing records.
    function suspendIssuer(address issuer) external onlyAdmin {
        if (!issuers[issuer].authorized || issuers[issuer].suspended) revert InvalidState();
        issuers[issuer].suspended = true;
        emit IssuerAuthorizationChanged(issuer, true, true);
    }
    /// @notice Reactivates a previously suspended issuer.
    function reactivateIssuer(address issuer) external onlyAdmin {
        if (!issuers[issuer].authorized || !issuers[issuer].suspended) revert InvalidState();
        issuers[issuer].suspended = false;
        emit IssuerAuthorizationChanged(issuer, true, false);
    }
    /// @notice Returns whether an issuer can currently register documents.
    function isAuthorizedIssuer(address issuer) external view returns (bool) { return issuers[issuer].authorized && !issuers[issuer].suspended; }
    /// @notice Registers a document digest under a unique human-readable ID.
    function registerDocument(bytes32 documentHash, string calldata documentId) external {
        if (!issuers[msg.sender].authorized || issuers[msg.sender].suspended) revert IssuerOnly();
        if (bytes(documentId).length == 0) revert EmptyId();
        if (documentHash == bytes32(0)) revert InvalidHash();
        bytes32 key = keccak256(bytes(documentId));
        if (documents[key].exists) revert DuplicateId();
        uint64 nowTs = uint64(block.timestamp);
        documents[key] = Document(documentHash, msg.sender, nowTs, true, false);
        emit DocumentRegistered(key, documentId, documentHash, msg.sender, nowTs);
    }
    /// @notice Permanently revokes a document by its issuer or administrator.
    function revokeDocument(string calldata documentId) external {
        if (bytes(documentId).length == 0) revert EmptyId();
        bytes32 key = keccak256(bytes(documentId));
        Document storage doc = documents[key];
        if (!doc.exists) revert MissingDocument();
        if (doc.revoked) revert InvalidState();
        if (msg.sender != administrator && msg.sender != doc.issuer) revert NotPermitted();
        doc.revoked = true;
        emit DocumentRevoked(key, documentId, msg.sender, uint64(block.timestamp));
    }
    /// @notice Returns public registration details for a document ID.
    function getDocument(string calldata documentId) external view returns (bytes32 documentHash, address issuer, uint64 timestamp, bool exists, bool revoked) {
        Document memory doc = documents[keccak256(bytes(documentId))];
        return (doc.documentHash, doc.issuer, doc.timestamp, doc.exists, doc.revoked);
    }
    /// @notice Checks existence, revocation, and digest equality for an uploaded document.
    function verifyDocument(string calldata documentId, bytes32 documentHash) external view returns (bool exists, bool hashMatches, bool revoked) {
        Document memory doc = documents[keccak256(bytes(documentId))];
        return (doc.exists, doc.exists && doc.documentHash == documentHash, doc.revoked);
    }
}
