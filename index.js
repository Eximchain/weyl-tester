#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const program = require('commander');

const package = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json')));
const WeylTester = require('./testHarness');
const { buildConfig } = require('./utils');

program
    .version(package.version)
    .name('weylTest')
    .description(package.description)
    .option('-c, --config <path>', 'Provide a path to a config.json whose parameters will override the defaults.')
    .option('-p, --prod', 'Use the production network version of the WeylGov contract.')
    .option('-d, --debug', 'Print additional info to verify the final config being given to web3.')
    .usage('<command> [options]');

program.on('--help', () => {
    console.log('');
    console.log('  This library tests the WeylGovV2 contract, located at the URL below.  It ');
    console.log('  expects a local copy of Ganache running at port 8545, with the WeylGovV2');
    console.log('  and BlockVoting contracts already deployed using truffle.  This ensures');
    console.log('  that the first account provided by Web3 is pre-set as a governance owner.');
    console.log('  ');
    console.log('  https://github.com/Eximchain/eximchain-governance-mechanism');
    console.log('  ');
    console.log('  Each command lets you call one of the functions of the WeylGovV2 contract');
    console.log('  from the first account provided by web3 (aka LOCAL_ACCT) on the configured');
    console.log('  MOBILE_ACCT.  For instance, calling fund will transfer ETH from LOCAL_ACCT');
    console.log('  to MOBILE_ACCT.');
    console.log('  ');
    console.log('  The MOBILE_ACCT has a default value from our own testing.  You can regenerate');
    console.log('  the account using the seed and password provided under the "defaultDetails"');
    console.log('  command with our React-Native application.');
    console.log('  ');
    console.log('  If you would like to use different values for any of the config constants,');
    console.log('  provide a path to your config.json file and they will be loaded in.');
    console.log('');
});    

program
    .command('defaults')
    .description('Print the default config and MOBILE_ACCT regeneration details.')
    .action(()=>{
        console.log("");
        console.log("  > Default config:")
        console.log(`
        {
            "PROVIDER_URL" : "http://localhost:8545",
            "GAS_PRICE" : "2000000",
            "GAS_LIMIT" : "10000000",
            "WEYL_ADDR" : "0x9d60084dd3fa8a5f0f352f27f0062cfd8f11f6e2",
            "BLOCKVOTE_ADDR": "0xf9459c4a0385a28163b65a3739f4651b7b8ccc9a",
            "MOBILE_ACCT" : "0x53fd44c705473ee2d780fe8f5278076f2171ca65"
        }
        `)
        console.log("  > Default MOBILE_ACCT:")
        console.log("")
        console.log(`    > MOBILE_ACCT seed: "dial worth chase zebra hip art copper upgrade right asset earn caution"`);
        console.log(`    > MOBILE_ACCT password: "password"`);
        console.log(`    > MOBILE_ACCT HD_PATH: "m/0'/0'/0'"`)
        console.log("")
    })

program
    .command('initConfig')
    .description('Create a config file named conf.json in the current directory.')
    .action(buildConfig)

program
    .command('inspect')
    .description('Print a summary of the current state of the governance contract.')
    .action(async ()=>{
        let harness = new WeylTester(program);
        await harness.inspect();
    });

program
    .command('addresses')
    .description('Prints full 42-character addresses, as they are truncated elsewhere.')
    .action(async () => {
        let harness = new WeylTester(program);
        await harness.addresses();
    })

program
    .command('balances')
    .description('Check the balance stored at both ACCTs and the WeylGovernance contract.')
    .action(async ()=>{
        let harness = new WeylTester(program);
        await harness.balances();
    });

program
    .command('fund')
    .description('Send 10K ETH from LOCAL_ACCT to MOBILE_ACCT.')
    .action(async ()=>{
        let harness = new WeylTester(program);
        await harness.fund();
    });

program
    .command('init')
    .description('Ensures both LOCAL_ACCT & MOBILE_ACCT are allowed to govern.  Call after fresh contract deploy.')
    .action(async ()=>{
        let harness = new WeylTester(program);
        await harness.init();
    });

program
    .command('open')
    .description('Open a new governance cycle.')
    .action(async ()=>{
        let harness = new WeylTester(program);
        await harness.open();
    });

program
    .command('close')
    .description('Close the current governance cycle.')
    .action(async ()=>{
        let harness = new WeylTester(program);
        await harness.close();
    });

program
    .command('nominate')
    .description('Nominates MOBILE_ACCT for promotion or demotion, depending on whether they are a blockmaker.')
    .action(async ()=>{
        let harness = new WeylTester(program);
        await harness.nominate();
    });

program
    .command('beginWithdraw <cycleId> <ballotId>')
    .description('Begin a withdrawal on a given ballot.')
    .action(async (cycleId, ballotId)=>{
        let harness = new WeylTester(program);
        await harness.withdrawStart(cycleId, ballotId);
    });

program
    .command('finishWithdraw <withdrawId>')
    .description('Finalize a given withdrawal.')
    .action(async (withdrawalId)=>{
        let harness = new WeylTester(program);
        await harness.withdrawFinish(withdrawalId);
    });

program
    .command('*')
    .description('Print help info if no command matches.')
    .action(()=>{
        program.help();
    })

if (process.argv.length === 2) program.help();
program.parse(process.argv);