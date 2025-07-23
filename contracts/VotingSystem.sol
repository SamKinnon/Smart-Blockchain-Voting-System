// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VotingSystem {
    struct Candidate {
        string name;
        string info;
        uint256 voteCount;
    }

    struct Election {
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool exists;
    }

    address public owner;
    uint256 public electionCount;

    mapping(uint256 => Election) public elections;
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;
    mapping(uint256 => uint256) public candidateCounts;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => bool) public resultsPublished;

    event ElectionCreated(uint256 electionId, string name, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 electionId, uint256 candidateId, string name);
    event VoteCast(uint256 electionId, address voter);
    event ResultsPublished(uint256 electionId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(elections[_electionId].exists, "Election does not exist");
        _;
    }

    modifier electionActive(uint256 _electionId) {
        require(
            block.timestamp >= elections[_electionId].startTime &&
            block.timestamp <= elections[_electionId].endTime,
            "Election is not active"
        );
        _;
    }

    modifier electionEnded(uint256 _electionId) {
        require(
            block.timestamp > elections[_electionId].endTime,
            "Election has not ended yet"
        );
        _;
    }

    modifier hasNotVoted(uint256 _electionId) {
        require(!hasVoted[_electionId][msg.sender], "You have already voted in this election");
        _;
    }

    constructor() {
        owner = msg.sender;
        electionCount = 0;
    }

    function createElection(
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) public onlyOwner {
        require(_startTime < _endTime, "End time must be after start time");
        require(_startTime > block.timestamp, "Start time must be in the future");

        elections[electionCount] = Election({
            name: _name,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            exists: true
        });

        emit ElectionCreated(electionCount, _name, _startTime, _endTime);
        electionCount++;
    }

    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _info
    ) public onlyOwner electionExists(_electionId) {
        require(block.timestamp < elections[_electionId].startTime, "Cannot add candidates after election has started");

        uint256 candidateId = candidateCounts[_electionId];
        candidates[_electionId][candidateId] = Candidate({
            name: _name,
            info: _info,
            voteCount: 0
        });

        emit CandidateAdded(_electionId, candidateId, _name);
        candidateCounts[_electionId]++;
    }

    function vote(
        uint256 _electionId,
        uint256 _candidateId
    ) public electionExists(_electionId) electionActive(_electionId) hasNotVoted(_electionId) {
        require(_candidateId < candidateCounts[_electionId], "Invalid candidate");

        // Record the vote
        candidates[_electionId][_candidateId].voteCount++;
        hasVoted[_electionId][msg.sender] = true;

        emit VoteCast(_electionId, msg.sender);
    }

    function publishResults(uint256 _electionId) public onlyOwner electionExists(_electionId) electionEnded(_electionId) {
        resultsPublished[_electionId] = true;
        emit ResultsPublished(_electionId);
    }

    // View functions
    function getElectionCount() public view returns (uint256) {
        return electionCount;
    }

    function getCandidateCount(uint256 _electionId) public view electionExists(_electionId) returns (uint256) {
        return candidateCounts[_electionId];
    }

    function getCandidate(uint256 _electionId, uint256 _candidateId) public view returns (string memory name, string memory info) {
        require(_electionId < electionCount, "Election does not exist");
        require(_candidateId < candidateCounts[_electionId], "Candidate does not exist");
        
        Candidate memory candidate = candidates[_electionId][_candidateId];
        return (candidate.name, candidate.info);
    }

    function getVoteCount(uint256 _electionId, uint256 _candidateId) public view returns (uint256) {
        require(_electionId < electionCount, "Election does not exist");
        require(_candidateId < candidateCounts[_electionId], "Candidate does not exist");
        require(resultsPublished[_electionId], "Results have not been published yet");
        
        return candidates[_electionId][_candidateId].voteCount;
    }
}
