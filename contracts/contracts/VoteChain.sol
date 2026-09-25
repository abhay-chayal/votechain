// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title VoteChain
/// @notice Records elections and single-choice votes. Voters are identified only by an
///         opaque voter token (a hash derived off-chain); eligibility is proven against a
///         Merkle root of those tokens committed when the election is created.
/// @dev    The VoteChain backend holds RELAYER_ROLE and submits transactions on behalf of
///         organizations and voters, so voters never need a wallet or gas.
contract VoteChain is AccessControl {
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    uint8 public constant MAX_CANDIDATES = 50;

    struct Election {
        bytes32 orgId;
        bytes32 voterRoot;
        bytes32 detailsHash;
        uint64 startTime;
        uint64 endTime;
        uint32 voteCount;
        uint8 candidateCount;
        bool closed;
        bool exists;
    }

    mapping(uint256 => Election) private _elections;
    mapping(uint256 => mapping(uint8 => uint32)) private _tally;
    mapping(uint256 => mapping(bytes32 => bool)) private _voted;

    event ElectionCreated(uint256 indexed electionId, bytes32 indexed orgId, uint64 startTime, uint64 endTime, uint8 candidateCount, bytes32 voterRoot, bytes32 detailsHash);
    event ElectionUpdated(uint256 indexed electionId, uint64 startTime, uint64 endTime, uint8 candidateCount, bytes32 voterRoot, bytes32 detailsHash);
    /// @dev The chosen candidate is deliberately not part of the event.
    event VoteCast(uint256 indexed electionId, bytes32 indexed voterToken, uint32 voteNumber);
    event ElectionClosed(uint256 indexed electionId, uint32 totalVotes, address closedBy);

    error ElectionExists(uint256 electionId);
    error ElectionNotFound(uint256 electionId);
    error InvalidWindow();
    error InvalidCandidateCount();
    error InvalidVoterRoot();
    error AlreadyStarted(uint256 electionId);
    error ElectionNotActive(uint256 electionId);
    error ElectionAlreadyClosed(uint256 electionId);
    error ElectionStillRunning(uint256 electionId);
    error InvalidCandidate(uint8 candidate);
    error AlreadyVoted(bytes32 voterToken);
    error InvalidMerkleProof();

    constructor(address admin, address relayer) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RELAYER_ROLE, relayer);
    }

    // ----------------------------------------------------------------- admin

    function createElection(
        uint256 electionId,
        bytes32 orgId,
        uint64 startTime,
        uint64 endTime,
        uint8 candidateCount,
        bytes32 voterRoot,
        bytes32 detailsHash
    ) external onlyRole(RELAYER_ROLE) {
        if (_elections[electionId].exists) revert ElectionExists(electionId);
        _checkParams(startTime, endTime, candidateCount, voterRoot);
        _elections[electionId] = Election({
            orgId: orgId,
            voterRoot: voterRoot,
            detailsHash: detailsHash,
            startTime: startTime,
            endTime: endTime,
            voteCount: 0,
            candidateCount: candidateCount,
            closed: false,
            exists: true
        });
        emit ElectionCreated(electionId, orgId, startTime, endTime, candidateCount, voterRoot, detailsHash);
    }

    /// @notice Change an election's settings. Only possible before voting opens.
    function updateElection(
        uint256 electionId,
        uint64 startTime,
        uint64 endTime,
        uint8 candidateCount,
        bytes32 voterRoot,
        bytes32 detailsHash
    ) external onlyRole(RELAYER_ROLE) {
        Election storage e = _get(electionId);
        if (e.closed) revert ElectionAlreadyClosed(electionId);
        if (block.timestamp >= e.startTime) revert AlreadyStarted(electionId);
        _checkParams(startTime, endTime, candidateCount, voterRoot);
        e.startTime = startTime;
        e.endTime = endTime;
        e.candidateCount = candidateCount;
        e.voterRoot = voterRoot;
        e.detailsHash = detailsHash;
        emit ElectionUpdated(electionId, startTime, endTime, candidateCount, voterRoot, detailsHash);
    }

    /// @notice Close voting. The relayer may close early; anyone may close once the end time has passed.
    function closeElection(uint256 electionId) external {
        Election storage e = _get(electionId);
        if (e.closed) revert ElectionAlreadyClosed(electionId);
        if (!hasRole(RELAYER_ROLE, msg.sender) && block.timestamp < e.endTime) revert ElectionStillRunning(electionId);
        e.closed = true;
        emit ElectionClosed(electionId, e.voteCount, msg.sender);
    }

    // ----------------------------------------------------------------- voting

    function castVote(uint256 electionId, bytes32 voterToken, uint8 candidate, bytes32[] calldata proof)
        external
        onlyRole(RELAYER_ROLE)
    {
        Election storage e = _get(electionId);
        if (e.closed || block.timestamp < e.startTime || block.timestamp >= e.endTime) revert ElectionNotActive(electionId);
        if (candidate >= e.candidateCount) revert InvalidCandidate(candidate);
        if (_voted[electionId][voterToken]) revert AlreadyVoted(voterToken);
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(voterToken))));
        if (!MerkleProof.verifyCalldata(proof, e.voterRoot, leaf)) revert InvalidMerkleProof();

        _voted[electionId][voterToken] = true;
        _tally[electionId][candidate] += 1;
        e.voteCount += 1;
        emit VoteCast(electionId, voterToken, e.voteCount);
    }

    // ----------------------------------------------------------------- views

    function getElection(uint256 electionId) external view returns (Election memory) {
        return _get(electionId);
    }

    function hasVoted(uint256 electionId, bytes32 voterToken) external view returns (bool) {
        return _voted[electionId][voterToken];
    }

    /// @notice True once no more votes can be accepted.
    function isFinal(uint256 electionId) public view returns (bool) {
        Election storage e = _get(electionId);
        return e.closed || block.timestamp >= e.endTime;
    }

    /// @notice Per-candidate totals. Sealed until the election is final.
    function getResults(uint256 electionId) external view returns (uint32[] memory totals) {
        if (!isFinal(electionId)) revert ElectionStillRunning(electionId);
        uint8 n = _elections[electionId].candidateCount;
        totals = new uint32[](n);
        for (uint8 i = 0; i < n; i++) totals[i] = _tally[electionId][i];
    }

    // ----------------------------------------------------------------- internal

    function _get(uint256 electionId) private view returns (Election storage e) {
        e = _elections[electionId];
        if (!e.exists) revert ElectionNotFound(electionId);
    }

    function _checkParams(uint64 startTime, uint64 endTime, uint8 candidateCount, bytes32 voterRoot) private view {
        if (endTime <= startTime || endTime <= block.timestamp) revert InvalidWindow();
        if (candidateCount < 2 || candidateCount > MAX_CANDIDATES) revert InvalidCandidateCount();
        if (voterRoot == bytes32(0)) revert InvalidVoterRoot();
    }
}
