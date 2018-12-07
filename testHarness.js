const fs = require('fs');
var BigNum = require('bignumber.js');
var range = require('lodash.range');
var omitBy = require('lodash.omitby');
var mapValues = require('lodash.mapvalues');
const Web3 = require('web3');
const cTable = require('console.table');
const chalk = require('chalk');

const BLOCK_SPEC = require('./contracts/BlockVotingDeployable.json');

const forceToString = (record) => { 
    return mapValues(omitBy(record, function(val, key){
        return !!parseInt(key) || key === '0'
    }), function(val){
        return val.toString()
    });
}

const truncEth = (val) =>  new BigNum(val).shiftedBy(-18).dp(2).toNumber();

const truncAddr = (addr) => addr.length == 42 ? `${addr.slice(0,6)}...${addr.slice(38,42)}` : addr;

const bigLine = () => { console.log(chalk.green('\n---------------------------------------------\n')) }

const getABI = abiObj => Array.isArray(abiObj) ? abiObj : abiObj.abi;

class WeylTester {

    constructor(program){
        const config = program.config ? JSON.parse(fs.readFileSync(program.config)) : {};
        this.web3Url = config.PROVIDER_URL || 'http://localhost:8545';
        this.web3 = new Web3(new Web3.providers.HttpProvider(this.web3Url));
        this.GAS_PRICE = config.GAS_PRICE || '2000000';
        this.GAS_LIMIT = config.GAS_LIMIT || '10000000';
        
        this.MOBILE_ACCT = config.MOBILE_ACCT || '0x53fd44c705473ee2d780fe8f5278076f2171ca65';
        this.WEYL_ADDR = config.WEYL_ADDR || '0x9d60084dd3fa8a5f0f352f27f0062cfd8f11f6e2';
        this.BLOCKVOTE_ADDR = config.BLOCKVOTE_ADDR || '0xf9459c4a0385a28163b65a3739f4651b7b8ccc9a';
        
        this.WEYL_FILE = `./contracts/WeylGovV2${program.prod ? 'Deployable' : ''}.json`;
        if (program.abi) {
            if (program.prod){
                console.log(chalk.orange(`\nUsed --production to select WeylGovV2Deployable, but also provided an ABI using --abi.  Overriding former, using latter.`));
            }
            this.WEYL_FILE = program.abi;
        }
        const WEYL_SPEC = require(this.WEYL_FILE);
        this.governance = new this.web3.eth.Contract(getABI(WEYL_SPEC), this.WEYL_ADDR);
        this.blockVote = new this.web3.eth.Contract(getABI(BLOCK_SPEC), this.BLOCKVOTE_ADDR);
        this.debug = program.debug;
    }

    defaultSend() { return {
        from : this.LOCAL_ACCT,
        gasPrice: this.GAS_PRICE,
        gas: this.GAS_LIMIT
    } };

    async precallSetup(){
        await this.ensureLocalAcct();
        if (this.debug){
            bigLine();
            console.table(['Config Variable', 'Value'],[
                ['PROVIDER_URL',this.web3Url],
                ['WEYL_FILE', this.WEYL_FILE],
                ['WEYL_ADDR', this.WEYL_ADDR],
                ['BLOCKVOTE_ADDR', this.BLOCKVOTE_ADDR],
                ['MOBILE_ACCT',this.MOBILE_ACCT],
                ['LOCAL_ACCT',this.LOCAL_ACCT]
                ['GAS_PRICE',this.GAS_PRICE],
                ['GAS_LIMIT',this.GAS_LIMIT]
            ]);
            bigLine();
        }
    }

    async ensureLocalAcct(){
        if (!this.LOCAL_ACCT){
            let localAccts = await this.web3.eth.getAccounts();
            this.LOCAL_ACCT = localAccts[0];
        }
    }

    resolveToName(addr) {
        let lowAddr = addr.toLowerCase();
        if (lowAddr == this.MOBILE_ACCT.toLowerCase()){
            return 'MOBILE_ACCT';
        } else if (lowAddr == this.LOCAL_ACCT.toLowerCase()){
            return 'LOCAL_ACCT';
        } else { return truncAddr(addr) }
    }

    checkReceipt(receipt){
        if (receipt.gasUsed == this.defaultSend().gas){
            console.log(chalk.orange('\n  => WARNING: The transaction used all the gas it was given.  This is often a sign that while the transaction was successfully mined, the function failed to execute.  Verify on the contract that the proper state changes were made.\n'));
        }
    }

    async init(){
        await this.precallSetup();
        const ensureGovern = async (name, addr) => {
            const canGovern = await this.governance.methods.canGovern(addr).call();
            if (canGovern){
                console.log(chalk.green(`\n  => ${name} (${truncAddr(addr)}) already has governing privileges, doing nothing`));
            } else {
                const receipt = await this.governance.methods.registerGoverning(addr).send(this.defaultSend());
                console.log(chalk.green(`\n  => ${name} (${truncAddr(addr)}) now has governing privileges, receipt follows:\n`));
                console.log(receipt);
                this.checkReceipt(receipt);
            }
        }
        await ensureGovern('LOCAL_ACCT', this.LOCAL_ACCT);
        await ensureGovern('MOBILE_ACCT', this.MOBILE_ACCT);
    }

    async addresses(){
        await this.precallSetup();
        bigLine();
        console.table(['Account', 'Address'],[
            ['Weyl Contract', this.WEYL_ADDR],
            ['LOCAL_ACCT', this.LOCAL_ACCT],
            ['MOBILE_ACCT', this.MOBILE_ACCT]
        ]);
        bigLine();
    }
    
    async balances(){
        await this.precallSetup();
        const contractBal = await this.web3.eth.getBalance(this.WEYL_ADDR);
        const localBal = await this.web3.eth.getBalance(this.LOCAL_ACCT);
        const mobileBal = await this.web3.eth.getBalance(this.MOBILE_ACCT);
        bigLine();
        console.table(['Account', 'Address', 'Balance'], [
            ['Weyl Contract', truncAddr(this.WEYL_ADDR), truncEth(contractBal)],
            ['LOCAL_ACCT', truncAddr(this.LOCAL_ACCT), truncEth(localBal)],
            ['MOBILE_ACCT', truncAddr(this.MOBILE_ACCT), truncEth(mobileBal)]
        ]);
        bigLine();
    }
    
    async inspect(){
        await this.precallSetup();
        const currentCycleId = await this.governance.methods.currentGovernanceCycle().call();
        const currentCycleRecord = await this.governance.methods.governanceCycleRecords(currentCycleId).call();
        const strungCycleRecord = forceToString(currentCycleRecord);
        const cycleStatuses = {
            0 : 'NoRecord',
            1: 'Started',
            2: 'Completed'
        };
        strungCycleRecord.status = cycleStatuses[strungCycleRecord.status];
        strungCycleRecord.elected = this.resolveToName(strungCycleRecord.elected);
        strungCycleRecord.evicted = this.resolveToName(strungCycleRecord.evicted);
        strungCycleRecord.totalPayments = truncEth(strungCycleRecord.totalPayments);
        const mobileBal = await this.web3.eth.getBalance(this.MOBILE_ACCT);
        bigLine();
        console.log(chalk.green(`\n  ==> Cycle ${currentCycleId}, MOBILE_ACCT EXC balance : ${truncEth(mobileBal)}\n`));
        console.table([strungCycleRecord]);
    
        const allNomineeBallots = [];
        const getAllBallots = false;
        if (getAllBallots){
            let nomKey = 0;
            let haveMoreNomineeBallots = true;
            // Use a while+try loop because we don't know how many
            // nominee ballots there are in the array, and querying
            // one too far leads to an error.
            while (haveMoreNomineeBallots){
                try {
                    let nomAddress = await this.governance.methods.nomineeBallotKeys(nomKey).call();
                    let nomBallot = await this.governance.methods.nomineeBallots(nomAddress).call();
                    nomBallot['Nominee'] = this.resolveToName(nomAddress);
                    nomBallot = forceToString(nomBallot);
                    allNomineeBallots.push(nomBallot);
                    nomKey ++;
                } catch (e) {
                    haveMoreNomineeBallots = false;
                }
            }
        } else {
            const numNominees = await this.governance.methods.nomineesInCycle().call();
            for (var i of range(numNominees)){
                let nomAddress = await this.governance.methods.nomineeBallotKeys(i).call();
                let nomBallot = await this.governance.methods.nomineeBallots(nomAddress).call();
                nomBallot['Nominee'] = this.resolveToName(nomAddress);
                nomBallot = forceToString(nomBallot);
                allNomineeBallots.push(nomBallot);
            }
        }

        if (allNomineeBallots.length > 0){
            console.log(chalk.green('\n  ==> NOMINEE BALLOTS\n'));
            console.table(allNomineeBallots);
        } else {
            console.log(chalk.green('\n  ==> No nominee ballots made yet'));
        }
    
        const currentBallotId = await this.governance.methods.ballotIndex().call();
        const allBallots = [];
        for (var i of range(currentBallotId)){
            let ballot = await this.governance.methods.ballotRecords(i+1).call();
            ballot['Ballot ID'] = i+1;
            ballot['voter'] = this.resolveToName(ballot['voter']);
            ballot['voted_for'] = this.resolveToName(ballot['voted_for']);
            ballot['amount'] = truncEth(ballot['amount']);
            allBallots.push(forceToString(ballot));
        }
        if (allBallots.length > 0){
            console.log(chalk.green('\n  ==> VOTE BALLOTS\n'));
            console.table(allBallots);
        } else {
            console.log(chalk.green('\n  ==> No vote ballots made yet'));
        }
    
        const allWithdrawalRecords = [];
        const numWithdrawals = await this.governance.methods.withdrawRecordsIndex().call();
        for (var i of range(numWithdrawals)){
            let record = await this.governance.methods.withdrawRecords(i+1).call();
            record.withdrawalId = i+1;
            record.status = cycleStatuses[record.status];
            record.beneficiary = this.resolveToName(record.beneficiary);
            record.amount = truncEth(record.amount);
            allWithdrawalRecords.push(forceToString(record))
        }
        if (allWithdrawalRecords.length > 0){
            console.log(chalk.green('\n  ==> All past withdrawals\n'));
            console.table(allWithdrawalRecords);
        } else { 
            console.log(chalk.green('\n  ==> No withdrawals made yet'));
        };
        bigLine();
    }
    
    async nominate(){
        await this.precallSetup();
        const currentCycleId = await this.governance.methods.currentGovernanceCycle.call();
        const mobileBallot = await this.governance.methods.nomineeBallots(this.MOBILE_ACCT).call();
        if (mobileBallot.governanceCycleId !== currentCycleId){
            console.log(chalk.green("\n  => Detected no current ballot for MOBILE_ACCT, first address is voting for them.  Here's the receipt: \n"));
            const sendArg = this.defaultSend();
            sendArg.value = new BigNum(42).multipliedBy(42).shiftedBy(18);
            const alreadyBlockMaker = await this.blockVote.methods.isBlockMaker(this.MOBILE_ACCT).call();
            const voteReceipt = await this.governance.methods.vote(this.MOBILE_ACCT, !alreadyBlockMaker, true, 42).send(sendArg);
            console.log(voteReceipt);
            this.checkReceipt(voteReceipt);
            await this.inspect();
        } else {
            console.log(chalk.green("\n  ==> Detected an existing ballot for the mobile candidate in this cycle, doing nothing."));
        }
    }
    
    async fund(){
        await this.precallSetup();
        const mobileBal = await this.web3.eth.getBalance(this.MOBILE_ACCT);
        const adjustedBal = truncEth(mobileBal);
        if (adjustedBal < 10000){
            let tenKEXC = new BigNum(10000).shiftedBy(18);
            const allowanceReceipt = await this.web3.eth.sendTransaction({
                to : this.MOBILE_ACCT,
                value : tenKEXC,
                from : this.LOCAL_ACCT
            })
            console.log(chalk.green("\n  ==> Successfully sent MOBILE_ACCT 10K EXC, here's receipt: \n",allowanceReceipt));
            this.checkReceipt(allowanceReceipt);
        } else {
            console.log(chalk.green(`\n  ==> MOBILE_ACCT already has ${adjustedBal} EXC, they do not need more than 10,000 at a time.`));
        }
    }
    
    async open(){
        await this.precallSetup();
        const openReceipt = await this.governance.methods.newGovernanceCycle().send(this.defaultSend())
        console.log(chalk.green('\n  ==> Successfully opened a governance cycle, receipt follows: \n'));
        console.log(openReceipt);
        this.checkReceipt(openReceipt);
        await this.inspect();
    }
    
    async close(){
        await this.precallSetup();
        const closeReceipt = await this.governance.methods.finalizeGovernanceCycle().send(this.defaultSend());
        console.log(chalk.green('\n  ==> Successfully closed a governance cycle, receipt follows: \n'));
        console.log(closeReceipt);
        this.checkReceipt(closeReceipt);
        await this.inspect();
    }
    
    async withdrawStart(cycleId, ballotId){
        await this.precallSetup();
        const startWithdrawReceipt = await this.governance.methods.startWithdraw(parseInt(cycleId), parseInt(ballotId)).send(this.defaultSend());
        console.log(chalk.green(`\n  ==> Successfully started a withdrawal, cycle ${cycleId} & ballot ${ballotId}, receipt follows: \n`));
        console.log(startWithdrawReceipt);
        this.checkReceipt(startWithdrawReceipt);
    }

    async withdrawFinish(withdrawId){
        await this.precallSetup();
        const finalizeWithdrawReceipt = await this.governance.methods.finalizeWithdraw(parseInt(withdrawId)).send(this.defaultSend());
        console.log(chalk.green(`\n  ==> Successfully finalized withdrawal ID ${withdrawId}, receipt follows: \n`));
        console.log(finalizeWithdrawReceipt);
        this.checkReceipt(finalizeWithdrawReceipt);
        await this.inspect();
    }
}

module.exports = WeylTester;