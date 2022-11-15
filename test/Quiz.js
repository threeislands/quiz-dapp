const {expect} = require("chai");

const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");

describe("Quiz contract", function () {
  // We define a fixture to reuse the same setup in every test. We use
  // loadFixture to run this setup once, snapshot that state, and reset Hardhat
  // Network to that snapshot in every test.
  async function deployQuizFixture() {
    // Get the ContractFactory and Signers here.
    const Quiz = await ethers.getContractFactory("Quiz");
    const [owner, addr1] = await ethers.getSigners();

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    const hardhatQuiz = await Quiz.deploy();

    await hardhatQuiz.deployed();

    // Fixtures can return anything you consider useful for your tests
    return {Quiz, hardhatQuiz, owner, addr1};
  }

  describe("Create", function () {
    it("Should create question", async function () {
      const {hardhatQuiz, owner} = await loadFixture(deployQuizFixture);

      await hardhatQuiz.create("4 + 4", "8", {value: 100});

      const question = await hardhatQuiz.questions(0);
      expect(question.questioner).to.equal(owner.address);
      expect(question.sentence).to.equal("4 + 4");
      expect(question.answer).to.equal(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("8")));
      expect(question.reward).to.equal("100");
      expect(question.recipient).to.equal(ethers.constants.AddressZero);
    });

    it("Should emit `Created`", async function () {
      const {hardhatQuiz, owner} = await loadFixture(deployQuizFixture);

      await expect(hardhatQuiz.create("4 + 4", "8", {value: 100}))
          .to.emit(hardhatQuiz, "Created").withArgs(0, owner.address);
    });

    it("Should fail if sentence is empty", async function () {
      const {hardhatQuiz} = await loadFixture(deployQuizFixture);

      await expect(hardhatQuiz.create("", "8", {value: 100}))
          .to.be.revertedWith("Sentence is required.");
    });

    it("Should fail if answer is empty", async function () {
      const {hardhatQuiz} = await loadFixture(deployQuizFixture);

      await expect(hardhatQuiz.create("4 + 4", "", {value: 100}))
          .to.be.revertedWith("Answer is required.");
    });

    it("Should fail if value is 0", async function () {
      const {hardhatQuiz} = await loadFixture(deployQuizFixture);

      await expect(hardhatQuiz.create("4 + 4", "8"))
          .to.be.revertedWith("Reward is required.");
    });
  });

  describe("Solve", function () {
    it("Should create question", async function () {
      const {hardhatQuiz, addr1} = await loadFixture(deployQuizFixture);

      await hardhatQuiz.create("4 + 4", "8", {value: 100});

      await expect(hardhatQuiz.connect(addr1).solve(0, "8"))
          .to.changeEtherBalances(
              [hardhatQuiz, addr1],
              [-100, 100],
          )

      const question = await hardhatQuiz.questions(0);
      expect(question.recipient).to.equal(addr1.address);
    });

    it("Should emit `Solved`", async function () {
      const {hardhatQuiz, addr1} = await loadFixture(deployQuizFixture);

      await hardhatQuiz.create("4 + 4", "8", {value: 100});

      await expect(hardhatQuiz.connect(addr1).solve(0, "8"))
          .to.emit(hardhatQuiz, "Solved").withArgs(0, addr1.address)
    });
  });

  describe("Withdraw", function () {
    it("Should withdraw ETH", async function () {
      const {hardhatQuiz, owner} = await loadFixture(deployQuizFixture);

      await hardhatQuiz.create("4 + 4", "8", {value: 100});

      await network.provider.send("evm_increaseTime", [60 * 60 * 24 * 7])
      await network.provider.send("evm_mine")

      await expect(hardhatQuiz.withdraw(0))
          .to.changeEtherBalances(
              [hardhatQuiz, owner],
              [-100, 100],
          )

      const question = await hardhatQuiz.questions(0);
      expect(question.recipient).to.equal(owner.address);
    });
  });
});
