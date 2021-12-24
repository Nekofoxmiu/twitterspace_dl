'use strict';

import axios from "axios";
import fs from "fs";
import child_process from "child_process";


const TwitterSpace = async (whoseSpace) => {
    try {

        const ToStrKillQuote = (jsonData) => JSON.stringify(jsonData).replace(/\"/g, "");


        const jsonData = await fs.promises.readFile('./setting.json')

            .then((response) => {

                let jsonData = JSON.parse(response);

                return jsonData;
            })

            .catch((err) => { console.log('error:', err); });


        //console.log(jsonData);




        //const xcsrf = ToStrKillQuote(jsonData["headers"]["cookie"]).match(/(?<=ct0=).+?(?=;)/)[0];

        //for headers type cookie (?<=ct0=).+?(?=;)
        //for netscape (?<=ct0\s).+?(?=\n\.)

        //console.log(xcsrf);

        let guestToken = "";

        do {
            guestToken = await axios("https://twitter.com", {

                "headers": {
                    "upgrade-insecure-requests": "0",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
                },
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "GET"
            })
                .then((response) => { return response["data"].match(/(?<=gt=)\d{19}/) })
                .catch((err) => { console.log('get web fail.'); return -1; });
            if (guestToken === null) {
                console.log("get token fail. Retry...");
            }

        } while (guestToken === null);


        console.log(guestToken[0]);

        const spaceID = jsonData['spaceaccount'][`${whoseSpace}`];




        const today = new Date();

        let currentDateTime =

            today.getFullYear() + '' +

            (today.getMonth() + 1) + '' +

            today.getDate() + '_' +

            today.getHours() + '_' +

            today.getMinutes();



        //  console.log(currentDateTime);


        let passUserId = await axios("https://twitter.com/i/api/fleets/v1/avatar_content?user_ids=" + spaceID + "&only_spaces=true", {

            "headers": {
                "cookie": `auth_token=4314e8c91f4f150b6c825ec9a26c9bae32bb8c56`,
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36",
            },
            "method": "GET"
        }

        )
            .then((response) => { return response; })
            .catch((err) => { console.log('error:', err); });


        if (ToStrKillQuote(passUserId["data"]["users"]) === "{}") {

            console.log("Twitter space is not open.");
            return;

        }
        else {

            passUserId = ToStrKillQuote(passUserId["data"]["users"][`${spaceID}`]["spaces"]["live_content"]["audiospace"]["broadcast_id"]);

        }



        let passSpaceId = await axios(

            "https://twitter.com/i/api/graphql/Uv5R_-Chxbn1FEkyUkSW2w/AudioSpaceById?variables=" + encodeURIComponent(JSON.stringify({

                "id": passUserId,
                "isMetatagsQuery": true,
                "withSuperFollowsUserFields": true,
                "withBirdwatchPivots": false,
                "withDownvotePerspective": false,
                "withReactionsMetadata": false,
                "withReactionsPerspective": false,
                "withSuperFollowsTweetFields": true,
                "withReplays": true,
                "withScheduledSpaces": true

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

        passSpaceId = ToStrKillQuote(passSpaceId["data"]["data"]["audioSpace"]["metadata"]["media_key"]);



        let passSpacem3u8 = await axios("https://twitter.com/i/api/1.1/live_video_stream/status/" + passSpaceId + "?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com", {

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


        passSpacem3u8 = ToStrKillQuote(passSpacem3u8["data"]["source"]["location"]);

        console.log(passSpacem3u8);
        //  correct m3u8


        console.log(`./${whoseSpace}_${currentDateTime}.m4a`);
        //  ./neko_20211210_14_36.m4a

        let outPutplace = `./${whoseSpace}_${currentDateTime}.m4a`;


        child_process.exec(`start cmd.exe /C ffmpeg.exe -i ${passSpacem3u8} -vn -c:a copy ${outPutplace} `, {
            env: "./ffmpeg\bin"
        })

    }
    catch (err) {
        console.log('error:', err);
    }


}


await TwitterSpace("spaceId");
