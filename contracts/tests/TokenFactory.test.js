// test/TokenFactory.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenFactory", function () {
  let TokenFactory, tokenFactory;
  let owner, treasury, platform, influencer, user;
  const creationFee = ethers.parseEther("0.01");

  beforeEach(async function () {
    [owner, treasury, platform, influencer, user] = await ethers.getSigners();

    TokenFactory = await ethers.getContractFactory("TokenFactory");
    tokenFactory = await TokenFactory.deploy(
      treasury.address,
      platform.address,
      creationFee
    );
    await tokenFactory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct initial values", async function () {
      const factoryInfo = await tokenFactory.getFactoryInfo();
      expect(factoryInfo[0]).to.equal(treasury.address);
      expect(factoryInfo[1]).to.equal(platform.address);
      expect(factoryInfo[2]).to.equal(creationFee);
      expect(factoryInfo[3]).to.equal(0);
    });

    it("Should set the deployer as owner", async function () {
      expect(await tokenFactory.owner()).to.equal(owner.address);
    });
  });

  describe("Token Creation", function () {
    it("Should create a new token successfully", async function () {
      const tokenData = {
        name: "Test Influencer Coin",
        symbol: "TIC",
        influencerName: "Test Influencer",
        influencerWallet: influencer.address,
        totalSupply: ethers.parseEther("1000000")
      };

      const tx = await tokenFactory.connect(user).createCoin(
        tokenData.name,
        tokenData.symbol,
        tokenData.influencerName,
        tokenData.influencerWallet,
        tokenData.totalSupply,
        { value: creationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return tokenFactory.interface.parseLog(log).name === "TokenCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      // Check that token was added to array
      const allTokens = await tokenFactory.getAllCoins();
      expect(allTokens.length).to.equal(1);

      // Check factory info updated
      const factoryInfo = await tokenFactory.getFactoryInfo();
      expect(factoryInfo[3]).to.equal(1);
    });

    it("Should fail with insufficient fee", async function () {
      await expect(
        tokenFactory.connect(user).createCoin(
          "Test Coin",
          "TC",
          "Test Influencer",
          influencer.address,
          ethers.parseEther("1000000"),
          { value: ethers.parseEther("0.005") }
        )
      ).to.be.revertedWith("Insufficient creation fee");
    });

    it("Should fail with invalid influencer address", async function () {
      await expect(
        tokenFactory.connect(user).createCoin(
          "Test Coin",
          "TC",
          "Test Influencer",
          ethers.ZeroAddress,
          ethers.parseEther("1000000"),
          { value: creationFee }
        )
      ).to.be.revertedWith("Invalid influencer wallet");
    });

    it("Should fail with empty name", async function () {
      await expect(
        tokenFactory.connect(user).createCoin(
          "",
          "TC",
          "Test Influencer",
          influencer.address,
          ethers.parseEther("1000000"),
          { value: creationFee }
        )
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should transfer creation fee to treasury", async function () {
      const initialBalance = await ethers.provider.getBalance(treasury.address);

      await tokenFactory.connect(user).createCoin(
        "Test Coin",
        "TC",
        "Test Influencer",
        influencer.address,
        ethers.parseEther("1000000"),
        { value: creationFee }
      );

      const finalBalance = await ethers.provider.getBalance(treasury.address);
      expect(finalBalance - initialBalance).to.equal(creationFee);
    });
  });

  describe("Token Allocation", function () {
    let tokenAddress;

    beforeEach(async function () {
      const tx = await tokenFactory.connect(user).createCoin(
        "Test Coin",
        "TC",
        "Test Influencer",
        influencer.address,
        ethers.parseEther("1000000"),
        { value: creationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return tokenFactory.interface.parseLog(log).name === "TokenCreated";
        } catch {
          return false;
        }
      });

      tokenAddress = event.args[0];
    });

    it("Should allocate tokens correctly", async function () {
      const InfluencerToken = await ethers.getContractFactory("InfluencerToken");
      const token = InfluencerToken.attach(tokenAddress);

      const totalSupply = await token.totalSupply();
      const influencerBalance = await token.balanceOf(influencer.address);
      const treasuryBalance = await token.balanceOf(treasury.address);
      const platformBalance = await token.balanceOf(platform.address);

      // Check allocations (30% influencer, 65% treasury, 5% platform)
      expect(influencerBalance).to.equal(totalSupply * BigInt(30) / BigInt(100));
      expect(treasuryBalance).to.equal(totalSupply * BigInt(65) / BigInt(100));
      expect(platformBalance).to.equal(totalSupply * BigInt(5) / BigInt(100));
    });
  });

  describe("Factory Management", function () {
    it("Should allow owner to update factory config", async function () {
      const newTreasury = user.address;
      const newPlatform = influencer.address;
      const newFee = ethers.parseEther("0.02");

      await tokenFactory.updateFactoryConfig(newTreasury, newPlatform, newFee);

      const factoryInfo = await tokenFactory.getFactoryInfo();
      expect(factoryInfo[0]).to.equal(newTreasury);
      expect(factoryInfo[1]).to.equal(newPlatform);
      expect(factoryInfo[2]).to.equal(newFee);
    });

    it("Should prevent non-owner from updating config", async function () {
      await expect(
        tokenFactory.connect(user).updateFactoryConfig(
          user.address,
          influencer.address,
          ethers.parseEther("0.02")
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Create a few tokens
      for (let i = 0; i < 3; i++) {
        await tokenFactory.connect(user).createCoin(
          `Test Coin ${i}`,
          `TC${i}`,
          `Test Influencer ${i}`,
          influencer.address,
          ethers.parseEther("1000000"),
          { value: creationFee }
        );
      }
    });

    it("Should return correct token count", async function () {
      expect(await tokenFactory.getTokenCount()).to.equal(3);
    });

    it("Should return token by index", async function () {
      const tokenAddress = await tokenFactory.getTokenByIndex(0);
      expect(tokenAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should verify factory tokens", async function () {
      const tokenAddress = await tokenFactory.getTokenByIndex(0);
      expect(await tokenFactory.isFactoryToken(tokenAddress)).to.be.true;
      expect(await tokenFactory.isFactoryToken(user.address)).to.be.false;
    });
  });
});