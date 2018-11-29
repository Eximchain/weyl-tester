const readline = require('readline');
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

module.exports = {
    emptyConfig, addValToConfig
}