const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const emptyConfig = `
{
    "PROVIDER_URL" : "[PROVIDER_URL]",
    "GAS_PRICE" : "[GAS_PRICE]",
    "GAS_LIMIT" : "[GAS_LIMIT]",
    "WEYL_ADDR" : "[WEYL_ADDR]",
    "BLOCKVOTE_ADDR": "0x0000000000000000000000000000000000000020",
    "MOBILE_ACCT" : "0x53fd44c705473ee2d780fe8f5278076f2171ca65"
}
`

const promptForVal = (prompt, defaultVal) => {
    return new Promise(function(resolve, reject){
        rl.question(prompt, (answer) => { resolve(answer !== "" ? answer : defaultVal) })
    })
}

const addValToConfig = async (configStr, valPrettyName, valKeyName, defaultVal) => {
    let val = await promptForVal(`${valPrettyName} (${defaultVal}): `, defaultVal);
    return configStr.replace(`[${valKeyName}]`, val);
}

const buildConfig = async () => {
    let config = await addValToConfig(emptyConfig, 'Full Provider URL', 'PROVIDER_URL', 'http://localhost:8545');
    config = await addValToConfig(config, 'Gas Price', 'GAS_PRICE', "20000000000");
    config = await addValToConfig(config, 'Gas Limit', 'GAS_LIMIT', "2000000");
    config = await addValToConfig(config, 'WeylGovernance Address', 'WEYL_ADDR', "0x000000000000000000000000000000000000002A");
    config = await addValToConfig(config, 'BlockVoting Address', 'BLOCKVOTE_ADDR', "0x0000000000000000000000000000000000000020");
    config = await addValToConfig(config, 'Mobile Account Address', 'MOBILE_ADDR', "0x53fd44c705473ee2d780fe8f5278076f2171ca65");
    fs.writeFileSync('conf.json', config);
    console.log(chalk.green('Successfully created default config file at conf.json'));
    process.exit();
}
module.exports = {
    emptyConfig, addValToConfig, buildConfig
}