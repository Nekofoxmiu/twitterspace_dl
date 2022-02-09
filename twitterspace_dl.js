'use strict';

import axios from "axios";
import child_process from "child_process";
import GetQueryId from "./GetQueryId.js"



const TwitterSpace = async (whoseSpace, recordOrNot, outputPath) => {
    try {

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
        }

        let currentDateTime =
            today.getFullYear() + '' +
            month + '' +
            AddZero(today.getDate()) + '_' +
            AddZero(today.getHours()) + '_' +
            AddZero(today.getMinutes());

        const ToStrKillQuote = (jsonData) => JSON.stringify(jsonData).replace(/\"/g, "");

        axios.defaults.timeout = 10000;

        let UserByScreenNameQraphl = await GetQueryId('UserByScreenName')
            .then((response) => { console.log(`Get UserByScreenNameQraphl: [ ${response} ]`); return response; })
            .catch(() => { console.log('get UserByScreenNameQraphl fail.'); return -1; });

        if (UserByScreenNameQraphl === -1) { return -1; }


        let AudioSpaceByIdQraphl = await GetQueryId('AudioSpaceById')
            .then((response) => { console.log(`Get AudioSpaceByIdQraphl: [ ${response} ]`); return response; })
            .catch(() => { console.log('get AudioSpaceByIdQraphl fail.'); return -1; });

        if (AudioSpaceByIdQraphl === -1) { return -1; }


        //Get x-guestToken for headers
        let guestToken = await axios("https://api.twitter.com/1.1/guest/activate.json", {
            "headers": {
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
            },
            "method": "POST"
        })
            .then((response) => { console.log(`Get x-guestToken: [ ${response.data.guest_token} ]`); return response.data.guest_token; })
            .catch(() => { console.log('get x-guestToken fail.'); return -1; });

        if (guestToken === -1) { return -1; }


        //Get UserId from screenname
        let userId = await axios(`https://twitter.com/i/api/graphql/${UserByScreenNameQraphl}/UserByScreenName?variables=` + encodeURIComponent(JSON.stringify({

            "screen_name": `${whoseSpace}`,
            "withSafetyModeUserFields": true,
            "withSuperFollowsUserFields": true

        })), {
            "headers": {
                "x-guest-token": guestToken,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
            },
            "method": "GET"
        })
            .then((response) => { console.log(`Get userId: [ ${response.data.data.user.result.rest_id} ]`); return response.data.data.user.result.rest_id })
            .catch(() => { console.log('get userId from screenName fail.'); return -1; });

        if (userId === -1) { return -1; }


        let spaceId = await axios("https://twitter.com/i/api/fleets/v1/avatar_content?user_ids=" + userId + "&only_spaces=true", {

            "headers": {
                "cookie": `auth_token=4314e8c91f4f150b6c825ec9a26c9bae32bb8c56`,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36",
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
                "__fs_interactive_text": false,
                "__fs_responsive_web_uc_gql_enabled": false,
                "__fs_dont_mention_me_view_api_enabled": false,

            })), {

            "headers": {
                "x-guest-token": guestToken,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36",
            },
            "method": "GET"
        })

            .then((response) => { return response; })
            .catch((err) => { console.log('error:', err); });

        if (broadcastIdPass === -1) { return -1; }

        let broadcastId = ToStrKillQuote(broadcastIdPass.data.data.audioSpace.metadata.media_key);
        let broadcastTitle = ToStrKillQuote(broadcastIdPass.data.data.audioSpace.metadata.title)

        console.log(`Get broadcastId: [${broadcastId}]`);



        let Spacem3u8 = await axios("https://twitter.com/i/api/1.1/live_video_stream/status/" + broadcastId + "?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com", {

            "headers": {
                "x-guest-token": guestToken,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36",
            },
            "method": "GET"
        }

        )

            .then((response) => { console.log(`Get m3u8 finish`); return response; })
            .catch((err) => { console.log('error:', err); });

        if (Spacem3u8 === -1) { return -1; }

        Spacem3u8 = ToStrKillQuote(Spacem3u8.data.source.location);

        let output = `${outputPath}\\${whoseSpace}_${currentDateTime}.m4a`;

        if (recordOrNot != undefined) {
            if (recordOrNot === true || recordOrNot === "true") {

                try { child_process.exec(`ffmpeg.exe -i ${Spacem3u8} -vn -c:a copy ${output} `, { env: "./" }) }
                catch {
                    console.log("ffmpeg error")
                    return -1;
                }
                child_process.exec(`ffmpeg.exe -i ${Spacem3u8} -vn -c:a copy ${output} `, { env: "./" })
                console.log(`${whoseSpace}'s space start recording.`);
                return { "title": broadcastTitle, "m3u8": Spacem3u8 };
            }
            else if (recordOrNot === false || recordOrNot === "false") { return { "title": broadcastTitle, "m3u8": Spacem3u8 }; }
        }
        else {
            try {
                child_process.exec(`ffmpeg.exe -i ${Spacem3u8} -vn -c:a copy ${output} `, { env: "./" })
 }
            catch {
                console.log("ffmpeg error")
                return -1;
            }
            console.log(`${whoseSpace}'s space start recording.`);
            return { "title": broadcastTitle, "m3u8": Spacem3u8 };
        }
    }
    catch (err) {
        console.log('error:', err);
    }


}


export default TwitterSpace;


