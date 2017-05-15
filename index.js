import TinderClient from 'tinder-modern'
import Bluebird from 'bluebird'
import fs from 'fs'
import program from 'commander'
import ProgressBar from 'progress'


const GPS_COORDINATES = {
    lat: 47.3686498,
    lon: 8.5391825
} // Zurich

// Likes options
const LIKE_MIN_INTERVAL = 2000;
const LIKE_MAX_INTERVAL = 4000;
const LIKE_BATCH = 10;
const LIKE_LIMIT = 100;

// Account switch intervals
const SWITCH_MIN_INTERVAL = 15000;
const SWITCH_MAX_INTERVAL = 30000;

// Tinder preferences
const DISCOVERY = true;
const MIN_AGE = 20;
const MAX_AGE = 50;
const GENDER = 0; // 0 = male, 1 = female, -1 = both
const DISTANCE = 13; // distance in miles

function generateDelay({min, max}) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return Bluebird.delay(delay);
}

async function processAccount(account, index) {
    if (index !== 0) {
        await generateDelay({min: SWITCH_MIN_INTERVAL, max: SWITCH_MAX_INTERVAL})
    }

    const client = new TinderClient();

    await client.authorize({
        fbToken: account.token,
        fbId: account.id
    });

    if (program.updatePosition) {
        try {
            await client.updatePosition(GPS_COORDINATES);
        } catch (err) {
            if (err.message !== 'position change not significant') {
                throw err
            }
        }
    }

    if (program.updatePreferences) {
        await client.updatePreferences({
            discovery: DISCOVERY,
            ageMin: MIN_AGE,
            ageMax: MAX_AGE,
            gender: GENDER,
            distance: DISTANCE
        })
    }

    const logger = new ProgressBar(`${account.email}: [:bar] :current/:total (:percent)`, {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: LIKE_LIMIT
    });

    if (!program.history) {
        let likes = 0;
        while (likes < LIKE_LIMIT) {
            const {results} = await client.getRecommendations({
                limit: LIKE_BATCH
            });

            if (results.length === 0) {
                throw new Error('Received 0-length results');
                break;
            }

            await Bluebird.each(results, async user => {
                if (likes < LIKE_LIMIT) {
                    await generateDelay({min: LIKE_MIN_INTERVAL, max: LIKE_MAX_INTERVAL});
                    await client.like({userId: user._id});
                    logger.tick();
                    likes += 1;
                }
            });
        }
        console.log('\n');
    } else {
        const history = await client.getHistory();
        return {
            history,
            email: account.email
        }
    }
}

async function main() {
    program
        .option('--update-position', 'Update position')
        .option('--update-preferences', 'Update preferences')
        .option('--history', 'Just fetch history and write it to a JSON')
        .parse(process.argv)

    const authFile = await Bluebird.fromCallback(callback => fs.readFile('auth.json', callback));
    const auth = JSON.parse(authFile);
    
    const rawData = await Bluebird.mapSeries(auth.data, processAccount);

    if (program.history) {
        const dataObject = {
            data: rawData
        };
        const dataFile = JSON.stringify(dataObject, null, 2);
        await Bluebird.fromCallback(callback => fs.writeFile('data.json', dataFile, callback));
    }
}

main();