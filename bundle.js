'use strict';

var _tinderModern = require('tinder-modern');

var _tinderModern2 = _interopRequireDefault(_tinderModern);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _progress = require('progress');

var _progress2 = _interopRequireDefault(_progress);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const GPS_COORDINATES = {
    lat: 47.3686498,
    lon: 8.5391825
}; // Berlin

// Likes options
const LIKE_MIN_INTERVAL = 2000;
const LIKE_MAX_INTERVAL = 10000;
const LIKE_BATCH = 10;
const LIKE_LIMIT = 10;

// Tinder preferences
const DISCOVERY = true;
const MIN_AGE = 20;
const MAX_AGE = 50;
const GENDER = 0; // 0 = male, 1 = female, -1 = both
const DISTANCE = 13; // distance in miles

async function processAccount(account) {
    const client = new _tinderModern2.default();

    await client.authorize({
        fbToken: account.token,
        fbId: account.id
    });

    if (_commander2.default.updatePosition) {
        try {
            await client.updatePosition(GPS_COORDINATES);
        } catch (err) {
            if (err.message !== 'position change not significant') {
                throw err;
            }
        }
    }

    if (_commander2.default.updatePreferences) {
        await client.updatePreferences({
            discovery: DISCOVERY,
            ageMin: MIN_AGE,
            ageMax: MAX_AGE,
            gender: GENDER,
            distance: DISTANCE
        });
    }

    const logger = new _progress2.default(`${account.email}: [:bar] :current/:total (:percent)`, {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: LIKE_LIMIT
    });

    if (!_commander2.default.history) {
        let likes = 0;
        while (likes <= LIKE_LIMIT) {
            const { results } = await client.getRecommendations({
                limit: LIKE_BATCH
            });

            if (results.length === 0) {
                throw new Error('Received 0-length results');
                break;
            }

            await _bluebird2.default.each(results, async user => {
                const delay = Math.floor(Math.random() * (LIKE_MAX_INTERVAL - LIKE_MIN_INTERVAL + 1)) + LIKE_MIN_INTERVAL;
                await _bluebird2.default.delay(delay);
                await client.like({ userId: user._id });
                logger.tick();
                likes += 1;
            });
        }
        console.log('\n');
    } else {
        const history = await client.getHistory();
        return {
            history,
            email: account.email
        };
    }
}

async function main() {
    _commander2.default.option('--update-position', 'Update position').option('--update-preferences', 'Update preferences').option('--history', 'Just fetch history and write it to a JSON').parse(process.argv);

    const authFile = await _bluebird2.default.fromCallback(callback => _fs2.default.readFile('auth.json', callback));
    const auth = JSON.parse(authFile);

    const rawData = await _bluebird2.default.mapSeries(auth.data, processAccount);

    if (_commander2.default.history) {
        const dataObject = {
            data: rawData
        };
        const dataFile = JSON.stringify(dataObject, null, 2);
        await _bluebird2.default.fromCallback(callback => _fs2.default.writeFile('data.json', dataFile, callback));
    }
}

main();
