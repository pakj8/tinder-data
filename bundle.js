'use strict';

let processAccount = (() => {
    var _ref = _asyncToGenerator(function* (account, index) {
        if (index !== 0) {
            yield generateDelay({ min: SWITCH_MIN_INTERVAL, max: SWITCH_MAX_INTERVAL });
        }

        const client = new _tinderModern2.default();

        yield client.authorize({
            fbToken: account.token,
            fbId: account.id
        });

        if (_commander2.default.updatePosition) {
            try {
                yield client.updatePosition(GPS_COORDINATES);
            } catch (err) {
                if (err.message !== 'position change not significant') {
                    throw err;
                }
            }
        }

        if (_commander2.default.updatePreferences) {
            yield client.updatePreferences({
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
            while (likes < LIKE_LIMIT) {
                const { results } = yield client.getRecommendations({
                    limit: LIKE_BATCH
                });

                if (results.length === 0) {
                    throw new Error('Received 0-length results');
                    break;
                }

                yield _bluebird2.default.each(results, (() => {
                    var _ref2 = _asyncToGenerator(function* (user) {
                        if (likes < LIKE_LIMIT) {
                            yield generateDelay({ min: LIKE_MIN_INTERVAL, max: LIKE_MAX_INTERVAL });
                            yield client.like({ userId: user._id });
                            logger.tick();
                            likes += 1;
                        }
                    });

                    return function (_x3) {
                        return _ref2.apply(this, arguments);
                    };
                })());
            }
            console.log('\n');
        } else {
            const history = yield client.getHistory();
            return {
                history,
                email: account.email
            };
        }
    });

    return function processAccount(_x, _x2) {
        return _ref.apply(this, arguments);
    };
})();

let main = (() => {
    var _ref3 = _asyncToGenerator(function* () {
        _commander2.default.option('--update-position', 'Update position').option('--update-preferences', 'Update preferences').option('--history', 'Just fetch history and write it to a JSON').parse(process.argv);

        const authFile = yield _bluebird2.default.fromCallback(function (callback) {
            return _fs2.default.readFile('auth.json', callback);
        });
        const auth = JSON.parse(authFile);

        const rawData = yield _bluebird2.default.mapSeries(auth.data, processAccount);

        if (_commander2.default.history) {
            const dataObject = {
                data: rawData
            };
            const dataFile = JSON.stringify(dataObject, null, 2);
            yield _bluebird2.default.fromCallback(function (callback) {
                return _fs2.default.writeFile('data.json', dataFile, callback);
            });
        }
    });

    return function main() {
        return _ref3.apply(this, arguments);
    };
})();

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

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const GPS_COORDINATES = {
    lat: 47.3686498,
    lon: 8.5391825
}; // Zurich

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

function generateDelay({ min, max }) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return _bluebird2.default.delay(delay);
}

main();
