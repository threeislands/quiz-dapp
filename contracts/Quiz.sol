// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

contract Quiz {
    struct Question {
        address payable questioner;
        string sentence;
        bytes32 answer;
        uint reward;
        uint expiration;
        address payable recipient;
    }

    Question[] public questions;

    uint constant DURATION = 1 weeks;

    event Created(uint questionId, address questioner);
    event Solved(uint questionId, address recipient);

    function create(string calldata sentence, string calldata answer) external payable {
        require(bytes(sentence).length > 0, "Sentence is required.");
        require(bytes(answer).length > 0, "Answer is required.");
        require(msg.value > 0, "Reward is required.");

        Question memory question = Question(
            payable(msg.sender), sentence, keccak256(abi.encodePacked(answer)), msg.value, block.timestamp + DURATION, payable(0)
        );
        questions.push(question);

        emit Created(questions.length - 1, msg.sender);
    }

    function solve(uint questionId, string calldata answer) external {
        require(questionId < questions.length, "Question doesn't exist.");

        Question storage question = questions[questionId];

        require(question.questioner != msg.sender, "Questioner is not allowed to answer their question.");
        require(question.recipient == address(0), "Question has already been solved.");
        require(question.expiration >= block.timestamp, "Question has already been closed.");
        require(question.answer == keccak256(abi.encodePacked(answer)), "Answer is not correct.");

        (bool sent,) = payable(msg.sender).call{value : question.reward}("");
        require(sent, "Failed to send Ether");

        question.recipient = payable(msg.sender);

        emit Solved(questionId, msg.sender);
    }

    function withdraw(uint questionId) external {
        require(questionId < questions.length, "Question doesn't exist.");

        Question storage question = questions[questionId];

        require(question.questioner == msg.sender, "Questioner is only allowed to withdraw.");
        require(question.recipient == address(0), "Question has already been solved.");
        require(question.expiration < block.timestamp, "Question is open.");

        (bool sent,) = payable(msg.sender).call{value : question.reward}("");
        require(sent, "Failed to send Ether");

        question.recipient = payable(msg.sender);
    }
}
