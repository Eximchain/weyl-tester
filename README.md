# Weyl Tester
Command-line interface for performing the core WeylGovernance actions (opening/closing cycles, voting, withdrawing) in a testing environment.

This library was designed to act as the "other user" in an election while testing the new mobile client.  It uses the first web3 account (`LOCAL_ACCT`) to perform actions on a default or configured client address (`MOBILE_ACCT`).  The `WeylGovV2` contract from eximchain-governance-mechanism` needs to already be deployed on Ganache for this tester to behave.

## Installation
This is a private package for Eximchain employees, so you must be given access to Eximchain's NPM organization before you can install.  Once you have access, installation is as easy as:

```
npm install -g @eximchain/weyl-tester
```
## Usage
To get a full help print-out, simply call the root command from any terminal:

```
$ weylTest

Usage: weylTest <command> [options]

CLI for calling key WeylGovernance contract fxns with first acct provided by web3.

Options:
  -V, --version                       output the version number
  -c, --config <path>                 Provide a path to a config.json whose parameters will override the defaults.
  -h, --help                          output usage information

Commands:
  defaults                            Print the default config and MOBILE_ACCT regeneration details.
  inspect                             Print a summary of the current state of the governance contract.
  balances                            Check the balance stored at both ACCTs and the WeylGovernance contract.
  fund                                Send 10K ETH from LOCAL_ACCT to MOBILE_ACCT.
  init                                Ensures both LOCAL_ACCT & MOBILE_ACCT are allowed to govern.  Call after fresh contract deploy.
  open                                Open a new governance cycle.
  close                               Close the current governance cycle.
  nominate                            Nominates MOBILE_ACCT for promotion or demotion, depending on whether they are a blockmaker.
  beginWithdraw <cycleId> <ballotId>  Begin a withdrawal on a given ballot.
  finishWithdraw <withdrawId>         Finalize a given withdrawal.
  *                                   Print help info if no command matches.

  This library tests the WeylGovV2 contract, located at the URL below.  It
  expects a local copy of Ganache running at port 8545, with the WeylGovV2
  and BlockVoting contracts already deployed using truffle.  This ensures
  that the first account provided by Web3 is pre-set as a governance owner.

  https://github.com/Eximchain/eximchain-governance-mechanism

  Each command lets you call one of the functions of the WeylGovV2 contract
  from the first account provided by web3 (aka LOCAL_ACCT) on the configured
  MOBILE_ACCT.  For instance, calling fund will transfer ETH from LOCAL_ACCT
  to MOBILE_ACCT.

  The MOBILE_ACCT has a default value from our own testing.  You can regenerate
  the account using the seed and password provided under the "defaultDetails"
  command with our React-Native application.

  If you would like to use different values for any of the config constants,
  provide a path to your config.json file and they will be loaded in.
```

## Default Values
```
{
    PROVIDER_URL : 'http://localhost:8545',
    GAS_PRICE : '2000000',
    GAS_LIMIT : '10000000',
    WEYL_ADDR : '0x9d60084dd3fa8a5f0f352f27f0062cfd8f11f6e2',
    BLOCKVOTE_ADDR: '0xf9459c4a0385a28163b65a3739f4651b7b8ccc9a',
    MOBILE_ACCT : '0x53fd44c705473ee2d780fe8f5278076f2171ca65'
}
```

## Ongoing Development
The CLI is implemented using `Commander.js`, which makes it easy to add new sub-commands.  If somebody was going to expand this to be more useful, it would be helpful to add the option to provide a `MOBILE_ACCT` directly from the command line, rather than as part of `config.json`.