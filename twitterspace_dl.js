'use strict';

import axios from "axios";
import child_process from "child_process";
import GetQueryId from "./GetQueryId.js"
import fs from "fs"

let guestToken = "";

axios.defaults.retry = 4;
axios.defaults.retryDelay = 1000;
axios.defaults.timeout = 10000;
axios.defaults.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36";

axios.interceptors.response.use(undefined, async (err) => {
    let config = err.config;
    // If config does not exist or the retry option is not set, reject
    if (!config || !config.retry) return Promise.reject(err);

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
        }, config.retryDelay || 1);
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
    }
    // Return the promise in which recalls axios to retry the request
    await backoff;
    return await axios(config);
});

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function createFfmpeg(whoseSpace, Spacem3u8, output, checktime, waitms) {
    let checkStart = false;
    try {
        console.log(output);
        for (let checkspawn = 0, checkclose = 0, i = 0; i < checktime; i++) {
            const ffmpeg = child_process.exec(`ffmpeg.exe -i ${Spacem3u8} -y -vn -c:a copy ${output} `, { env: "./" }, (error) => {
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
    catch {
        console.log("create child_process error");
        return -1;
    }
    if (checkStart) {
        console.log(`${whoseSpace}'s space start recording.`);
        return 0;
    }
    else {
        console.log("Download fail.");
        return -1;
    }
}


//Get x-guestToken for headers
async function GetGuestToken(outdataOrNot) {

    outdataOrNot = outdataOrNot || false;
    try { guestToken = JSON.parse(fs.readFileSync(`./Token.json`)); }
    catch (err) {
        console.log('Failed to load Token.json now clear old file and rebuild one.');

        guestToken = await axios("https://api.twitter.com/1.1/guest/activate.json", {
            "headers": {
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "POST"
        })
            .then((response) => { console.log(`Get x-guestToken: [ ${response.data.guest_token} ]`); return response.data.guest_token; })
            .catch(() => { console.log('get x-guestToken fail.'); return -1; });

        if (guestToken === -1) { return -1; }

        fs.writeFileSync(`./Token.json`, JSON.stringify({ "guestToken": guestToken }));

        return guestToken;
    }
    if (outdataOrNot) {
        guestToken = await axios("https://api.twitter.com/1.1/guest/activate.json", {
            "headers": {
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "POST"
        })
            .then((response) => { console.log(`Get x-guestToken: [ ${response.data.guest_token} ]`); return response.data.guest_token; })
            .catch(() => { console.log('get x-guestToken fail.'); return -1; });

        fs.writeFileSync(`./Token.json`, JSON.stringify({ "guestToken": guestToken }));

        return guestToken;
    }
    else { return guestToken.guestToken; }
}



async function TwitterSpace(whoseSpace, configObj) {

    if (typeof (configObj) !== "object") {
        console.log("Input type or format error. Please input obj contain record, outputPath, searchByName, saveIds.");
        return -1;
    }

    try {

        if (typeof whoseSpace !== "string" && typeof whoseSpace !== "number") {
            console.log("whoseSpace type error");
            return -1;
        }

        let record, outputPath, searchByName, saveIds;

        if (!configObj) {
            configObj = {
                "record": true,
                "outputPath": "./",
                "searchByName": true,
                "saveIds": false
            };
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
                console.log("record type error");
                return -1;
        }

        if (!configObj.outputPath) { outputPath = "./"; }
        else { outputPath = configObj.outputPath; }
        if (typeof outputPath !== "string") { console.log("outputPath type error"); return -1; };

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
                console.log("searchByName type error");
                return -1;
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
                console.log("searchByName type error");
                return -1;
        }



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

        const ToStrKillQuote = (jsonData) => JSON.stringify(jsonData).replace(/\"/g, "");


        let guestToken = await GetGuestToken()
            .then((response) => { console.log(`Get guestToken: [ ${response} ]`); return response; })
            .catch((err) => { console.log('get guestToken fail.', err); return -1; });

        if (guestToken === -1) { return -1; }


        let UserByScreenNameQraphl = "";
        let UserByRestIdQraphl = "";

        if (searchByName) {

            UserByScreenNameQraphl = await GetQueryId('UserByScreenName')
                .then((response) => { console.log(`Get UserByScreenNameQraphl: [ ${response} ]`); return response; })
                .catch(() => { console.log('get UserByScreenNameQraphl fail.'); return -1; });

            if (UserByScreenNameQraphl === -1) { return -1; }
        }
        else {
            UserByRestIdQraphl = await GetQueryId('UserByRestId')
                .then((response) => { console.log(`Get UserByRestIdQraphl: [ ${response} ]`); return response; })
                .catch(() => { console.log('get UserByRestIdQraphl fail.'); return -1; });

            if (UserByRestIdQraphl === -1) { return -1; }
        }

        let AudioSpaceByIdQraphl = await GetQueryId('AudioSpaceById')
            .then((response) => { console.log(`Get AudioSpaceByIdQraphl: [ ${response} ]`); return response; })
            .catch(() => { console.log('get AudioSpaceByIdQraphl fail.'); return -1; });

        if (AudioSpaceByIdQraphl === -1) { return -1; }




        let userId = "";
        if (searchByName) {
            //Get UserId from screenname or Get screenname from id
            userId = await axios(`https://twitter.com/i/api/graphql/${UserByScreenNameQraphl}/UserByScreenName?variables=` + encodeURIComponent(JSON.stringify({
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
                .catch(() => { console.log('get userId from screenName fail.'); return -1; });

            if (userId === -1) { return -1; }
        }
        else {
            userId = whoseSpace;
            whoseSpace = await axios(`https://twitter.com/i/api/graphql/${UserByRestIdQraphl}/UserByRestId?variables=` + encodeURIComponent(JSON.stringify({
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
                .catch((err) => { console.log('get ScreenName from userId fail.', err); return -1; });

            if (whoseSpace === -1) { return -1; }
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
            .catch((err) => { console.log('get spaceId fail.'); return -1; });

        if (spaceId === -1) { return -1; }


        if (ToStrKillQuote(spaceId.data.users) === "{}") { console.log("Twitter space is not open."); return 2; }
        else {
            spaceId = ToStrKillQuote(spaceId.data.users[`${userId}`].spaces.live_content.audiospace.broadcast_id);
            console.log(`Get spaceId: [${spaceId}]`);
        }



        let broadcastIdPass = await axios(

            `https://twitter.com/i/api/graphql/${AudioSpaceByIdQraphl}/AudioSpaceById?variables=` + encodeURIComponent(JSON.stringify({
                "id": spaceId,
                "isMetatagsQuery": false,
                "withSuperFollowsUserFields": true,
                "withDownvotePerspective": false,
                "withReactionsMetadata": false,
                "withReactionsPerspective": false,
                "withSuperFollowsTweetFields": true,
                "withReplays": true,
            })) + "&features=" + encodeURIComponent(JSON.stringify({
                "dont_mention_me_view_api_enabled": true,
                "interactive_text_enabled": true,
                "responsive_web_uc_gql_enabled": false,
                "vibe_tweet_context_enabled": false,
                "responsive_web_edit_tweet_api_enabled": false
            })), {
            "headers": {
                "x-guest-token": guestToken,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "GET"
        })
            .then((response) => { return response; })
            .catch((err) => { `Get spaceId: [${broadcastIdPass}] fail`; return -1; });

        if (broadcastIdPass === -1) { return -1; }

        let broadcastId = ToStrKillQuote(broadcastIdPass.data.data.audioSpace.metadata.media_key);
        let broadcastTitle = ToStrKillQuote(broadcastIdPass.data.data.audioSpace.metadata.title);

        console.log(`Get broadcastId: [${broadcastId}]`);

        let Spacem3u8 = await axios("https://twitter.com/i/api/1.1/live_video_stream/status/" + broadcastId + "?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com", {
            "headers": {
                "x-guest-token": guestToken,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
            },
            "method": "GET"
        }

        )

            .then((response) => { console.log(`Get m3u8 finish`); return response; })
            .catch((err) => { console.log('error:', err); return -1; });

        if (Spacem3u8 === -1) { return -1; }

        try { Spacem3u8 = ToStrKillQuote(Spacem3u8.data.source.location); }
        catch { return -1; }


        let outputBroadcastTitle = broadcastTitle.replace(/[<>:;,?"*|/\\]/g, "").replace(/\s/g, "_");
        let output = `${outputPath}\\${whoseSpace}_${currentDateTime}_${outputBroadcastTitle}.m4a`;


        if (record) {
            let checkStart = await createFfmpeg(whoseSpace, Spacem3u8, output, 15, 1000).then((response) => { return response; });
            if (checkStart === 0) {
                console.log("record continue"); return {
                    "title": broadcastTitle,
                    "m3u8": Spacem3u8,
                    "nameOrId": userId,
                    "spaceId": spaceId,
                    "broadcastId": broadcastId
                };
            }
            if (checkStart === -1) { console.log("record fail"); return -1; }
        }
        else {
            return {
                "title": broadcastTitle,
                "m3u8": Spacem3u8,
                "nameOrId": userId,
                "spaceId": spaceId,
                "broadcastId": broadcastId
            };
        }


    }
    catch (err) {
        console.log('error:', err);
    }


}

TwitterSpace.getTitle = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.title; }) };
TwitterSpace.getM3u8 = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.m3u8; }) };
TwitterSpace.getNameOrId = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.nameOrId; }) };
TwitterSpace.getSpaceId = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.spaceId; }) };
TwitterSpace.getBroadcastId = async (whoseSpace) => { return TwitterSpace(whoseSpace, { "record": false }).then((res) => { return res.broadcastId; }) };

export default TwitterSpace;


