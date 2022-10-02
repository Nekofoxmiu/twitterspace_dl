'use strict';

import axios from "axios";
import child_process from "child_process";
import GetQueryId from "./GetQueryId.js"
import fs from "fs"

let guestToken = "";
let UserByScreenNameQraphl = {};
let UserByRestIdQraphl = {};
let AudioSpaceByIdQraphl = {};

axios.defaults.retry = 10;
axios.defaults.retryDelay = 1000;
axios.defaults.timeout = 10000;
axios.defaults.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36";

axios.interceptors.response.use(undefined, async (err) => {
    try {


        let config = err.config;
        // If config does not exist or the retry option is not set, reject
        if (!config || !config.retry) return Promise.reject(err);

        // Create new promise to handle exponential backoff. formula (2^c - 1 / 2) * 1000(for mS to seconds)
        const backOffDelay = config.retryDelay ? (((1 / 2) * (Math.pow(2, config.__retryCount) - 1)) * 1000) : 1;


        // Set the variable for keeping track of the retry count
        config.__retryCount = config.__retryCount || 0;

        // Check if we've maxed out the total number of retries
        if (config.__retryCount >= config.retry) {
            // Reject with the error
            return Promise.reject(err);
        }

        // Increase the retry count
        config.__retryCount += 1;

        // Create new promise to handle exponential backoff
        let backoff = new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, backOffDelay);
        });

        if (err.response) {
            if (err.response.status === 403) {
                if (config.headers) {
                    if (config.headers["x-guest-token"]) {
                        const response = await GetGuestToken(true);
                        config.headers["x-guest-token"] = response;
                        guestToken = response;
                    }
                }
            }

            if (err.response.status === 404) {
                if (config.url) {
                    if ((config.url).match(/UserByScreenName/) || (config.url).match(/AudioSpaceById/) || (config.url).match(/UserByRestId/)) {

                        let spaceDataFeatures;

                        await GetQueryId(['UserByScreenName', 'UserByRestId', 'AudioSpaceById'], false, true)
                            .then((response) => {
                                console.log(`Updated Qraphl List`);
                                UserByScreenNameQraphl = response[0];
                                UserByRestIdQraphl = response[1];
                                AudioSpaceByIdQraphl = response[2];

                                console.log(`Updated UserByScreenNameQraphl: [ ${UserByScreenNameQraphl.queryId} ]`);
                                console.log(`Updated UserByRestIdQraphl: [ ${UserByRestIdQraphl.queryId} ]`);
                                console.log(`Updated AudioSpaceByIdQraphl: [ ${AudioSpaceByIdQraphl.queryId} ]`);
                            })
                            .catch((err) => {
                                console.log('Updated Qraphl List fail.');
                                return Promise.reject(new Error(err))
                            });


                        if ((config.url).match(/UserByScreenName/)) { config.url = (config.url).replace(/(?<=api\/graphql\/).+(?=\/UserByScreenName)/, UserByScreenNameQraphl.queryId) }
                        if ((config.url).match(/UserByRestId/)) { config.url = (config.url).replace(/(?<=api\/graphql\/).+(?=\/UserByRestId)/, UserByScreenNameQraphl.queryId) }
                        if ((config.url).match(/AudioSpaceById/)) {
                            for (let i = 0; (AudioSpaceByIdQraphl.queryToken).length > i; i++) {
                                spaceDataFeatures[(AudioSpaceByIdQraphl.queryToken)[i]] = false;
                            }
                            config.url = (config.url)
                                .replace(/(?<=api\/graphql\/).+(?=\/AudioSpaceById)/, UserByScreenNameQraphl.queryId)
                                .replace(/(?<=\&features\=).+/, encodeURIComponent(JSON.stringify(spaceDataFeatures)));
                        }
                    }
                }
            }
        }

        // Return the promise in which recalls axios to retry the request
        await backoff;
        return await axios(config);
    } catch (err) {
        console.log(err);
    }
});

function ToStrKillQuote(jsonData) {
    return JSON.stringify(jsonData).replace(/\"/g, "");
}

function GetTime() {
    const today = new Date();

    let month = '';
    if ((today.getMonth() + 1) < 10) {
        month = '0' + (today.getMonth() + 1);
    }
    else {
        month = (today.getMonth() + 1);
    }

    const AddZero = (time) => {
        if (time < 10) {
            time = '0' + time;
            return time;
        }
        else {
            return time;
        }
    };

    let currentDateTime = today.getFullYear() + '' +
        month + '' +
        AddZero(today.getDate()) + '_' +
        AddZero(today.getHours()) + '_' +
        AddZero(today.getMinutes());

    return currentDateTime;
}

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function createFfmpeg(whoseSpace, Spacem3u8, output, checktime, waitms) {
    let checkStart = false;
    try {
        console.log(output);
        for (let checkspawn = 0, checkclose = 0, i = 0; i < checktime; i++) {
            const ffmpeg = child_process.exec(`ffmpeg.exe -i ${Spacem3u8} -y -vn -c:a copy ${output} `, { cwd: "./" }, (error) => {
                if (error) {
                    //console.error(error);
                }
            });

            ffmpeg.on('spawn', () => { checkspawn++; });
            ffmpeg.on('close', (code) => {
                if (code === 1 && code !== 0) {
                    console.log(`Success get m3u8 but it still empty. Retry...(${i + 1}/15)`);
                    checkclose++;
                }

            });
            await wait(waitms);
            if (checkspawn !== checkclose) {
                checkStart = true;
                break;
            }
        }
    }
    catch (err) {
        throw new Error(err);
    }
    if (checkStart) {
        console.log(`${whoseSpace}'s space start recording.`);
        return 0;
    }
    else {
        throw new Error("Download fail.");
    }
}

//Get x-guestToken for headers
async function GetGuestToken(outdataOrNot) {

    outdataOrNot = outdataOrNot || false;
    try { guestToken = JSON.parse(fs.readFileSync(`./Token.json`)); }
    catch (err) {
        try {
            console.log('Failed to load Token.json now clear old file and rebuild one.');

            guestToken = await axios("https://api.twitter.com/1.1/guest/activate.json", {
                "headers": {
                    "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
                },
                "method": "POST"
            })
                .then((response) => { return response.data.guest_token; })
                .catch((err) => { console.log('get x-guestToken fail.'); return Promise.reject(new Error(err)); });

            fs.writeFileSync(`./Token.json`, JSON.stringify({ "guestToken": guestToken }));

            return guestToken;
        } catch (err) {
            throw new Error(err);
        }
    }
    if (outdataOrNot) {
        try {
            guestToken = await axios("https://api.twitter.com/1.1/guest/activate.json", {
                "headers": {
                    "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
                },
                "method": "POST"
            })
                .then((response) => { return response.data.guest_token; })
                .catch((err) => { console.log('get x-guestToken fail.'); return Promise.reject(new Error(err)); });

            fs.writeFileSync(`./Token.json`, JSON.stringify({ "guestToken": guestToken }));

            return guestToken;
        } catch (err) {
            throw new Error(err);
        }
    }
    else { return guestToken.guestToken; }
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}
//https://stackoverflow.com/questions/9907419/how-to-get-a-key-in-a-javascript-object-by-its-value

async function TwitterSpace(whoseSpace, configObj) {
    try {
        //初始化開始
        let userData;
        let userId = "";
        let currentDateTime = GetTime();
        let guestToken = "";
        let record = "";
        let outputPath = ""
        let searchByName = "";
        let saveIds = "";
        let spaceDataFeatures = {};
        let idListData = {};

        if (!configObj) {
            configObj = {
                "record": true,
                "outputPath": "./",
                "searchByName": true,
                "saveIds": false
            };

            guestToken = await GetGuestToken()
                .then((response) => { console.log(`Get guestToken: [ ${response} ]`); return response; })
                .catch((err) => { console.log('get guestToken fail.'); return Promise.reject(new Error(err)); });

        }
        else {
            if (typeof (configObj) !== "object") {
                throw new Error("Input type or format error.");
            }
        }

        if (typeof whoseSpace !== "string" && typeof whoseSpace !== "number") {
            console.log("whoseSpace type error");
            throw new Error("whoseSpace only accept string or nimber");
        }

        switch (configObj.record) {
            case undefined:
                record = true;
                break;

            case "true":
                record = true;
                break;

            case true:
                record = true;
                break;

            case "false":
                record = false;
                break;

            case false:
                record = false;
                break;

            default:
                throw new Error("record only accept boolean or string");
        }

        if (!configObj.outputPath) { outputPath = "./"; }
        else { outputPath = configObj.outputPath; }
        if (typeof outputPath !== "string") { throw new Error("outputPath type error"); };

        switch (configObj.searchByName) {
            case undefined:
                searchByName = true;
                break;

            case "true":
                searchByName = true;
                break;

            case true:
                searchByName = true;
                break;

            case "false":
                searchByName = false;
                break;

            case false:
                searchByName = false;
                break;

            default:
                throw new Error("searchByName only accept boolean or string");
        }

        switch (configObj.saveIds) {
            case undefined:
                saveIds = false;
                break;

            case "true":
                saveIds = true;
                break;

            case true:
                saveIds = true;
                break;

            case "false":
                saveIds = false;
                break;

            case false:
                saveIds = false;
                break;

            default:
                throw new Error("saveIds only accept boolean or string");
        }

        if (!configObj.guestToken) {
            guestToken = await GetGuestToken(false)
                .then((response) => { console.log(`Get guestToken: [ ${response} ]`); return response; })
                .catch((err) => { console.log('get guestToken fail.'); return Promise.reject(new Error(err)); });

        }
        else { if (typeof guestToken !== "string") { throw new Error("guestToken type error"); }; }


        await GetQueryId(['UserByScreenName', 'UserByRestId', 'AudioSpaceById'], true, false)
            .then((response) => {
                UserByScreenNameQraphl = response[0];
                UserByRestIdQraphl = response[1];
                AudioSpaceByIdQraphl = response[2];

                console.log(`Get UserByScreenNameQraphl: [ ${UserByScreenNameQraphl.queryId} ]`);
                console.log(`Get UserByRestIdQraphl: [ ${UserByRestIdQraphl.queryId} ]`);
                console.log(`Get AudioSpaceByIdQraphl: [ ${AudioSpaceByIdQraphl.queryId} ]`);
            })
            .catch((err) => {
                console.log('Get Qraphl List fail.');
                return Promise.reject(new Error(err))
            });

        if (saveIds) {
            try { idListData = JSON.parse(fs.readFileSync(`./ID_List.json`)); }
            catch (err) {
                console.log('Failed to load ID_List.json now clear old file and rebuild one.');
                fs.writeFileSync(`ID_List.json`, JSON.stringify({}));
            }
            if (!searchByName) {

                userId = whoseSpace;
                whoseSpace = getKeyByValue(idListData, whoseSpace);
            }

            if (idListData[whoseSpace] && whoseSpace) {
                userId = idListData[whoseSpace];
                userData = {
                    name: whoseSpace,
                    id: userId
                }
                console.log(`Get userName: [ ${whoseSpace} ]`);
                console.log(`Get userId: [ ${idListData[whoseSpace]} ]`);
            }
            else {
                if (searchByName) {
                    userId = await axios(`https://twitter.com/i/api/graphql/${UserByScreenNameQraphl.queryId}/UserByScreenName?variables=` + encodeURIComponent(JSON.stringify({
                        "screen_name": `${whoseSpace}`,
                        "withSafetyModeUserFields": true,
                        "withSuperFollowsUserFields": true
                    })), {
                        "headers": {
                            "x-guest-token": guestToken,
                            "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
                        },
                        "method": "GET"
                    })
                        .then((response) => { console.log(`Get userId: [ ${response.data.data.user.result.rest_id} ]`); return response.data.data.user.result.rest_id; })
                        .catch((err) => { console.log('get userId from screenName fail.'); return Promise.reject(new Error(err)); })
                }
                else {
                    whoseSpace = await axios(`https://twitter.com/i/api/graphql/${UserByRestIdQraphl.queryId}/UserByRestId?variables=` + encodeURIComponent(JSON.stringify({
                        "userId": `${userId}`,
                        "withSafetyModeUserFields": true,
                        "withSuperFollowsUserFields": true
                    })), {
                        "headers": {
                            "x-guest-token": guestToken,
                            "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
                        },
                        "method": "GET"
                    })
                        .then((response) => { console.log(`Get whoseSpace: [ ${response.data.data.user.result.legacy.screen_name} ]`); return response.data.data.user.result.legacy.screen_name; })
                        .catch(async (err) => { console.log('get ScreenName from userId fail.'); return Promise.reject(new Error(err)); });
                }
                userData = {
                    name: whoseSpace,
                    id: userId
                }

                idListData[whoseSpace] = userId;
                fs.writeFileSync(`ID_List.json`, JSON.stringify(idListData, null, '    '));

            }

        }
        else {
            if (searchByName) {
                //Get UserId from screenname or Get screenname from id

                userData = await axios(`https://twitter.com/i/api/graphql/${UserByScreenNameQraphl.queryId}/UserByScreenName?variables=` + encodeURIComponent(JSON.stringify({
                    "screen_name": `${whoseSpace}`,
                    "withSafetyModeUserFields": true,
                    "withSuperFollowsUserFields": true
                })), {
                    "headers": {
                        "x-guest-token": guestToken,
                        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
                    },
                    "method": "GET"
                })
                    .then((response) => {
                        console.log(`Get userId: [ ${response.data.data.user.result.rest_id} ]`);
                        userId = response.data.data.user.result.rest_id;
                        return response.data.data.user.result;
                    })

                    .catch((err) => { console.log('get userId from screenName fail.'); return Promise.reject(new Error(err)); })

            }
            else {
                userId = whoseSpace;

                userData = await axios(`https://twitter.com/i/api/graphql/${UserByRestIdQraphl.queryId}/UserByRestId?variables=` + encodeURIComponent(JSON.stringify({
                    "userId": `${userId}`,
                    "withSafetyModeUserFields": true,
                    "withSuperFollowsUserFields": true
                })), {
                    "headers": {
                        "x-guest-token": guestToken,
                        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
                    },
                    "method": "GET"
                })
                    .then((response) => { console.log(`Get whoseSpace: [ ${response.data.data.user.result.legacy.screen_name} ]`); return response.data.data.user.result; })
                    .catch(async (err) => { console.log('get ScreenName from userId fail.'); return Promise.reject(new Error(err)); });


                try { whoseSpace = userData.legacy.screen_name; } catch (err) { console.log(err); };

            }
        }
        let spaceId = await axios("https://twitter.com/i/api/fleets/v1/avatar_content?user_ids=" + userId + "&only_spaces=true", {
            "headers": {
                "cookie": `auth_token=4314e8c91f4f150b6c825ec9a26c9bae32bb8c56`,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "GET"
        }

        )
            .then((response) => { return response; })
            .catch((err) => { console.log('get spaceId fail.'); return Promise.reject(new Error(err)); });

        if (ToStrKillQuote(spaceId.data.users) === "{}") { console.log("Twitter space is not open."); return 2; }
        else {
            try { spaceId = ToStrKillQuote(spaceId.data.users[`${userId}`].spaces.live_content.audiospace.broadcast_id); }
            catch (err) { throw new Error(err); }
            console.log(`Get spaceId: [ ${spaceId} ]`);
        }

        for (let i = 0; (AudioSpaceByIdQraphl.queryToken).length > i; i++) {
            spaceDataFeatures[(AudioSpaceByIdQraphl.queryToken)[i]] = false;
        }

        let spaceData = await axios(
            `https://twitter.com/i/api/graphql/${AudioSpaceByIdQraphl.queryId}/AudioSpaceById?variables=` + encodeURIComponent(JSON.stringify({
                "id": spaceId,
                "isMetatagsQuery": false,
                "withSuperFollowsUserFields": true,
                "withDownvotePerspective": false,
                "withReactionsMetadata": false,
                "withReactionsPerspective": false,
                "withSuperFollowsTweetFields": true,
                "withReplays": true,
            })) + "&features=" + encodeURIComponent(JSON.stringify(spaceDataFeatures)), {
            "headers": {
                "x-guest-token": guestToken,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "GET"
        })
            .then((response) => { return response.data.data.audioSpace; })
            .catch((err) => { `Get spaceId spaceData fail`; return Promise.reject(new Error(err)); });

        let broadcastId = ToStrKillQuote(spaceData.metadata.media_key);
        let broadcastTitle = ToStrKillQuote(spaceData.metadata.title);

        console.log(`Get broadcastId: [ ${broadcastId} ]`);

        let Spacem3u8 = await axios(
            "https://twitter.com/i/api/1.1/live_video_stream/status/" + broadcastId + "?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com", {
            "headers": {
                "x-guest-token": guestToken,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "GET"
        })
            .then((response) => { console.log(`Get m3u8 finish`); return ToStrKillQuote(response.data.source.location); })
            .catch((err) => { console.log(`Get m3u8 error`); return Promise.reject(new Error(err)); });


        let outputBroadcastTitle = broadcastTitle.replace(/[<>:;,?"*|/\\]/g, "").replace(/\s/g, "_");
        let output = `${outputPath}\\${whoseSpace}_${currentDateTime}_${outputBroadcastTitle}.m4a`;


        if (record) {
            await createFfmpeg(whoseSpace, Spacem3u8, output, 15, 1000)
            return {
                "title": broadcastTitle,
                "m3u8": Spacem3u8,
                "nameOrId": userId,
                "spaceId": spaceId,
                "broadcastId": broadcastId,
                "spaceData": spaceData,
                "userData": userData
            };
        }
        else {
            return {
                "title": broadcastTitle,
                "m3u8": Spacem3u8,
                "nameOrId": userId,
                "spaceId": spaceId,
                "broadcastId": broadcastId,
                "spaceData": spaceData,
                "userData": userData
            };
        }

    }
    catch (err) {
        console.log(err);
        return -1;
    }


}

TwitterSpace.getM3u8_FromBroadcastId = async (broadcastId) => {
    if (typeof (broadcastId) !== "string") {
        throw new Error("Input type or format error.");
    }
    let Spacem3u8 = await axios("https://twitter.com/i/api/1.1/live_video_stream/status/" + broadcastId + "?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com", {
        "headers": {
            "x-guest-token": GetGuestToken(),
            "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
        },
        "method": "GET"
    })
        .then((response) => { console.log(`Get m3u8 finish`); return ToStrKillQuote(response.data.source.location); })
        .catch((err) => { console.log(`Get m3u8 error`); return Promise.reject(new Error(err)); });

    return Spacem3u8;
}
TwitterSpace.getSpaceData_FromSpaceId = async (spaceId) => {
    let spaceDataFeatures = {};
    await GetQueryId(['UserByScreenName', 'UserByRestId', 'AudioSpaceById'], true, false)
        .then((response) => {
            UserByScreenNameQraphl = response[0];
            UserByRestIdQraphl = response[1];
            AudioSpaceByIdQraphl = response[2];

            console.log(`Get UserByScreenNameQraphl: [ ${UserByScreenNameQraphl.queryId} ]`);
            console.log(`Get UserByRestIdQraphl: [ ${UserByRestIdQraphl.queryId} ]`);
            console.log(`Get AudioSpaceByIdQraphl: [ ${AudioSpaceByIdQraphl.queryId} ]`);
        })
        .catch((err) => {
            console.log('Get Qraphl List fail.');
            return Promise.reject(new Error(err))
        });



    for (let i = 0; (AudioSpaceByIdQraphl.queryToken).length > i; i++) {
        spaceDataFeatures[(AudioSpaceByIdQraphl.queryToken)[i]] = false;
    }

    let spaceData = await axios(
        `https://twitter.com/i/api/graphql/${AudioSpaceByIdQraphl.queryId}/AudioSpaceById?variables=` + encodeURIComponent(JSON.stringify({
            "id": spaceId,
            "isMetatagsQuery": false,
            "withSuperFollowsUserFields": true,
            "withDownvotePerspective": false,
            "withReactionsMetadata": false,
            "withReactionsPerspective": false,
            "withSuperFollowsTweetFields": true,
            "withReplays": true,
        })) + "&features=" + encodeURIComponent(JSON.stringify(spaceDataFeatures)), {
        "headers": {
            "x-guest-token": GetGuestToken(),
            "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
        },
        "method": "GET"
    })
        .then((response) => { return response.data.data.audioSpace; })
        .catch((err) => { `Get spaceId spaceData fail`; return Promise.reject(new Error(err)); });

    let broadcastId = ToStrKillQuote(spaceData.metadata.media_key);
    let broadcastTitle = ToStrKillQuote(spaceData.metadata.title);

    console.log(`Get broadcastId: [ ${broadcastId} ]`);

    let Spacem3u8 = await axios("https://twitter.com/i/api/1.1/live_video_stream/status/" + broadcastId + "?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com", {
        "headers": {
            "x-guest-token": GetGuestToken(),
            "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
        },
        "method": "GET"
    })
        .then((response) => { console.log(`Get m3u8 finish`); return ToStrKillQuote(response.data.source.location); })
        .catch((err) => { console.log(`Get m3u8 error`); return Promise.reject(new Error(err)); });

    return {
        "title": broadcastTitle,
        "m3u8": Spacem3u8,
        "spaceId": spaceId,
        "broadcastId": broadcastId,
        "spaceData": spaceData
    };
}
TwitterSpace.getM3u8_FromSpaceId = async (spaceId) => {
    return (await TwitterSpace.getSpaceData_FromSpaceId(spaceId)).m3u8;
}
TwitterSpace.getTitle = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.title; }) };
TwitterSpace.getM3u8 = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.m3u8; }) };
TwitterSpace.getNameOrId = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.nameOrId; }) };
TwitterSpace.getSpaceId = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.spaceId; }) };
TwitterSpace.getBroadcastId = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.broadcastId; }) };
TwitterSpace.getSpaceData = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.spaceData; }) };
TwitterSpace.getUserData = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.userData; }) };

export default TwitterSpace;