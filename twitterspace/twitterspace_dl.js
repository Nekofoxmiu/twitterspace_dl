'use strict';

import axios from "axios";
import child_process from "child_process";

//Twitter user name.
const TwitterSpace = async (whoseSpace) => {
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

        //Get x-guestToken for headers
        let guestToken = await axios("https://api.twitter.com/1.1/guest/activate.json", {
            "headers": {
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
            },
            "method": "POST"
        })
            .then((response) => { return response.data.guest_token })
            .catch(() => { console.log('get x-guestToken fail.'); return -1; });

        //Get mainJsId for request Url
        let mainJsId = await axios("https://twitter.com", {
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
            },
            "method": "GET"
        })
            .then((response) => { return response.data.match(/(?<=web\/main\.).*?(?=\.js)/)[0] })
            .catch(() => { console.log('get mainJsId fail.'); return -1; });

        //Prase main.xxxxxxxx.js file to get queryId 
        let mainJsUrl = 'https://abs.twimg.com/responsive-web/client-web/main.' + mainJsId + '.js';
        let mainJsData = await axios(mainJsUrl, {
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
            },
            "method": "GET"
        })
            .then((response) => { return response.data.match(/queryId:"([^"]+)",operationName:"([^"]+)",operationType:"query"/g); })
            .catch(() => { console.log('get mainJsData fail.'); return -1; });

        //Pick needed Id from list
        let UserByScreenNameQraphl = '';
        let AudioSpaceById = '';
        for (let i = 0, testA = -1, testB = -1; i < mainJsData.length; i++) {

            if (testA === -1) {
                testA = mainJsData[i].search(/UserByScreenName/);
                if (testA != -1) {
                    UserByScreenNameQraphl = mainJsData[i];
                    UserByScreenNameQraphl = UserByScreenNameQraphl.match(/(?<=queryId:").*?(?=")/)[0];
                }
            }
            if (testB === -1) {
                testB = mainJsData[i].search(/AudioSpaceById/);
                if (testB != -1) {
                    AudioSpaceById = mainJsData[i];
                    AudioSpaceById = AudioSpaceById.match(/(?<=queryId:").*?(?=")/)[0];
                }

            }
        }



        let userId = await axios(`https://twitter.com/i/api/graphql/${UserByScreenNameQraphl}/UserByScreenName?variables=` + encodeURIComponent(JSON.stringify({

            "screen_name": whoseSpace,
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
            .then((response) => { return response.data.data.user.result.rest_id })
            .catch(() => { console.log('get userId from screenName fail.'); return -1; });

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


        if (ToStrKillQuote(spaceId.data.users) === "{}") { console.log("Twitter space is not open."); return 2; }
        else {
            spaceId = ToStrKillQuote(spaceId.data.users[`${userId}`].spaces.live_content.audiospace.broadcast_id);
            console.log(spaceId);
        }



        let passBroadcastId = await axios(

            `https://twitter.com/i/api/graphql/${AudioSpaceById}/AudioSpaceById?variables=` + encodeURIComponent(JSON.stringify({

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

        passBroadcastId = ToStrKillQuote(passBroadcastId.data.data.audioSpace.metadata.media_key);



        let Spacem3u8 = await axios("https://twitter.com/i/api/1.1/live_video_stream/status/" + passBroadcastId + "?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com", {

            "headers": {
                "x-guest-token": guestToken,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36",
            },
            "method": "GET"
        }

        )

            .then((response) => { return response; })
            .catch((err) => { console.log('error:', err); });


        Spacem3u8 = ToStrKillQuote(Spacem3u8.data.source.location);

        let output = `./\\${whoseSpace}_${currentDateTime}.m4a`;

        console.log(`./${whoseSpace}_${currentDateTime}.m4a start recording.`);

        child_process.exec(`start cmd.exe /C ffmpeg.exe -i ${Spacem3u8} -vn -c:a copy ${output} `, { env: "./ffmpeg\\bin" }) 

        return 1;
    }
    catch (err) {
        console.log('error:', err);
    }


}

//export { TwitterSpace };

TwitterSpace('Nekofoxball')