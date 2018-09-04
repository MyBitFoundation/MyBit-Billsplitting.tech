var BigNumber = require('bignumber.js');

const Billsplitting = artifacts.require("./Billsplitting.sol");
const Token = artifacts.require('./ERC20.sol');
const MyBitBurner = artifacts.require('./MyBitBurner.sol');
const Database = artifacts.require('./Database.sol');
const ContractManager = artifacts.require('./ContractManager.sol');

const WEI = 1000000000000000000;

const tokenSupply = 100000;
const tokenPerAccount = 1000;

let burnFee = 250;

contract('Billsplitting', async(accounts) => {
  const payer1 = web3.eth.accounts[0];
  const payer2 = web3.eth.accounts[1];
  const payer3 = web3.eth.accounts[2];
  const payers = [payer1, payer2, payer3];
  const receiver = web3.eth.accounts[9];
  const total = 10*WEI;

  let database;
  let contractManager;
  let token;
  let burner;
  let billsplitting;
  let billID;

  // Deploy token contract
  it ('Deploy MyBit Token contract', async() => {
    token = await Token.new(tokenSupply, "MyBit Token", 8, "MyB");
    tokenAddress = await token.address;
    console.log(tokenAddress);

    assert.equal(await token.totalSupply(), tokenSupply);
    assert.equal(await token.balanceOf(payer1), tokenSupply);
  });

  // Give every user tokenPerAccount amount of tokens
  it("Spread tokens to users", async () => {
    for (var i = 1; i < web3.eth.accounts.length; i++) {
      //console.log(web3.eth.accounts[i]);
      await token.transfer(web3.eth.accounts[i], tokenPerAccount);
      let userBalance = await token.balanceOf(web3.eth.accounts[i]);
      assert.equal(userBalance, tokenPerAccount);
    }
    // Check token ledger is correct
    const totalTokensCirculating = (web3.eth.accounts.length - 1) * (tokenPerAccount);
    const remainingTokens = tokenSupply - totalTokensCirculating;
    assert.equal(await token.balanceOf(payer1), remainingTokens);
  });

  it('Deploy Database', async() => {
    database = await Database.new(payer1);
    contractManager = await ContractManager.new(database.address);
    await database.setContractManager(contractManager.address);
  });

  it ('Deploy MyBitBurner contract', async() => {
    burner = await MyBitBurner.new(tokenAddress);
  });

  it('Deploy Billsplitting contract', async() => {
    billsplitting = await Billsplitting.new(database.address, burner.address);
    await contractManager.addContract('Billsplitting', billsplitting.address);
    await burner.authorizeBurner(billsplitting.address);
    let authTrue = await burner.authorizedBurner(billsplitting.address);
    assert.equal(true, authTrue);
  });

  it('Fail create bill', async() => {
    try{
      await token.approve(burner.address, 100);
      await billsplitting.createBillEqual(receiver, total, payers);
    } catch(e){
      console.log('Not enough tokens approved for burn');
    }
  });

  it('Create new bill', async() => {
    await token.approve(burner.address, burnFee);
    tx = await billsplitting.createBillEqual(receiver, total, payers);
    billID = tx.logs[0].args._billID;
  });

  it('Get total owing', async() => {
    let totalOwing = await billsplitting.getTotalOwing(billID);
    assert.equal(totalOwing, total);
  });

  it('Get user owing', async() => {
    let sumOwing = BigNumber(0);
    for(var i=0; i<payers.length; i++){
      let payerOwing = await billsplitting.getUserOwing(billID,{from: payers[i]});
      console.log('Payer ' + i + ': ' + payerOwing);
      sumOwing = sumOwing.plus(payerOwing);
    }
    assert.equal(sumOwing.isEqualTo(total), true);
  });

  it('Fail pay payer1 share', async() => {
    try{
      await billsplitting.payShare(billID, {from: payer1});
    } catch(e){
      console.log('No ether sent to contract!');
    }
  });

  it('Pay payer1 share', async() => {
    let payerOwingBefore = await billsplitting.getUserOwing(billID,{from: payer1});
    await billsplitting.payShare(billID, {from: payer1, value: payerOwingBefore});
    let payerOwingAfter = await billsplitting.getUserOwing(billID,{from: payer1});
    console.log('Owing Before: ' + payerOwingBefore);
    console.log('Owing After: ' + payerOwingAfter);
    assert.equal(payerOwingAfter, 0);
  });

  it('Fail re-pay payer1 share', async() => {
    try{
      await billsplitting.payShare(billID, {from: payer1, value: 100});
    } catch(e){
      console.log('Cannot send money when no money owing');
    }
  });

  it('Fail to release funds', async() => {
    try{
      await billsplitting.releaseFunds(billID);
    } catch(e){
      console.log('Failed to release funds');
    }
  });

  it('Overpay payer2 share', async() => {
    let payerBalanceBefore = BigNumber(await web3.eth.getBalance(payer2));
    let payerOwingBefore = await billsplitting.getUserOwing(billID,{from: payer2});
    await billsplitting.payShare(billID, {from: payer2, value: 5*WEI});
    let payerBalanceAfter = BigNumber(await web3.eth.getBalance(payer2));
    let payerOwingAfter = await billsplitting.getUserOwing(billID,{from: payer2});
    let balanceDiff = payerBalanceBefore.minus(payerBalanceAfter);
    assert.equal(balanceDiff.isLessThan(5*WEI), true);
    assert.equal(payerOwingAfter, 0);

  });

  it('Get total owing', async() => {
    let totalOwing = await billsplitting.getTotalOwing(billID);
    console.log(Number(totalOwing));
  });

  //Right now there is an issue with small numbers being sent to payShare or returned by getUserOwing
  //As long as the difference between amount paid and amount owed is greater than 3 digits there's no problem
  //Any number past 16 digits just seems to get rounded up or down
  it('Underpay payer3 share', async() => {
    //Amount owing: 3333333333333333334
    await billsplitting.payShare(billID, {from: payer3, value: 3333333333333333000});
    let payerOwingAfter = BigNumber(await billsplitting.getUserOwing(billID,{from: payer3}));
    console.log(payerOwingAfter);
    assert.equal(payerOwingAfter.isEqualTo(0), false);
  });

  it('Fail to release funds', async() => {
    try{
      await billsplitting.releaseFunds(billID);
    } catch(e){
      console.log('Failed to release funds');
    }
  });

  it('Correct payer3 share', async() => {
    let payerOwingBefore = BigNumber(await billsplitting.getUserOwing(billID,{from: payer3}));
    console.log(payerOwingBefore);
    console.log(Number(payerOwingBefore));
    await billsplitting.payShare(billID, {from: payer3, value: Number(payerOwingBefore)});
    let payerOwingAfter = BigNumber(await billsplitting.getUserOwing(billID,{from: payer3}));
    assert.equal(payerOwingAfter.isEqualTo(0), true);
  });

  it('Release funds', async() => {
    let receiverBalanceBefore = BigNumber(await web3.eth.getBalance(receiver));
    await billsplitting.releaseFunds(billID);
    let receiverBalanceAfter = BigNumber(await web3.eth.getBalance(receiver));
    balanceDiff = receiverBalanceAfter.minus(receiverBalanceBefore);
    assert.equal(balanceDiff.isEqualTo(total), true);
  });
});
