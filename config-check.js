const fs = require('fs');

if (!fs.existsSync('./config.json')) {
    console.error(`No config.json found! Use the config.example.json from Vidalee/Neeko-Server and rename it.`);
    process.exit(1);
}